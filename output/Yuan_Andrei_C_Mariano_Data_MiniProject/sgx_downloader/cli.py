from __future__ import annotations

import argparse
import json
import logging
import logging.config
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .client import ClientError, SGXClient
from .config import ConfigError, Settings, load_settings
from .manifest import Manifest
from .service import DownloadService, RunSummary


LOG = logging.getLogger(__name__)
EXIT_OK = 0
EXIT_USAGE = 2
EXIT_DISCOVERY = 3
EXIT_UNAVAILABLE = 4
EXIT_DOWNLOAD_FAILED = 5
EXIT_VERIFY_FAILED = 6


def singapore_today() -> date:
    try:
        tz = ZoneInfo("Asia/Singapore")
    except ZoneInfoNotFoundError:
        tz = timezone(timedelta(hours=8))
    return datetime.now(tz).date()


def parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"invalid date {value!r}; expected YYYY-MM-DD"
        ) from exc


def build_parser(default_config: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sgx-download",
        description="Download and recover SGX derivatives tick/TC files.",
    )
    parser.add_argument(
        "--config",
        default=default_config,
        help="INI configuration file (default: %(default)s)",
    )
    parser.add_argument(
        "--logging-config",
        help="override the logging configuration file from config.ini",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    sync = subparsers.add_parser(
        "sync", help="download every date currently listed by SGX (recommended for cron)"
    )
    sync.add_argument("--force", action="store_true", help="redownload complete files")
    sync.add_argument("--dry-run", action="store_true", help="show work without downloading")

    download = subparsers.add_parser("download", help="download a selected date or range")
    selection = download.add_mutually_exclusive_group(required=True)
    selection.add_argument("--today", action="store_true", help="use today's Singapore date")
    selection.add_argument("--date", type=parse_date, help="single date in YYYY-MM-DD")
    selection.add_argument("--from", dest="date_from", type=parse_date, help="range start")
    download.add_argument("--to", dest="date_to", type=parse_date, help="range end (inclusive)")
    download.add_argument(
        "--resource-key",
        help="SGX key for one date no longer in the public listing (requires --date)",
    )
    download.add_argument("--force", action="store_true", help="redownload complete files")
    download.add_argument("--dry-run", action="store_true", help="show work without downloading")

    retry = subparsers.add_parser(
        "retry", help="retry failed/interrupted files using keys saved in the manifest"
    )
    retry.add_argument("--dry-run", action="store_true", help="show work without downloading")

    listing = subparsers.add_parser("list", help="show dates currently discoverable from SGX")
    listing.add_argument("--json", action="store_true", help="emit machine-readable JSON")

    subparsers.add_parser("verify", help="verify completed files against manifest hashes")
    return parser


def configure_logging(settings: Settings, override: str | None) -> None:
    config_path = (
        Path(override).expanduser().resolve() if override else settings.logging_config_path
    )
    if not config_path.is_file():
        raise ConfigError(f"logging configuration file not found: {config_path}")
    settings.log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.config.fileConfig(
        config_path,
        defaults={"log_file": settings.log_file.as_posix()},
        disable_existing_loggers=False,
        encoding="utf-8",
    )


def _print_summary(summary: RunSummary) -> None:
    LOG.info(
        "Run summary: downloaded=%d skipped=%d optional_unavailable=%d failed=%d planned=%d",
        summary.downloaded,
        summary.skipped,
        summary.unavailable,
        summary.failed,
        summary.planned,
    )


def _range(start: date, end: date) -> set[date]:
    if end < start:
        raise ValueError("--to cannot be earlier than --from")
    return {start + timedelta(days=offset) for offset in range((end - start).days + 1)}


def run(args: argparse.Namespace, settings: Settings) -> int:
    manifest = Manifest(settings.manifest_path)
    client = SGXClient(settings)
    service = DownloadService(settings, client, manifest)

    if args.command == "retry":
        summary = service.retry_pending(dry_run=args.dry_run)
        _print_summary(summary)
        return EXIT_OK if summary.ok else EXIT_DOWNLOAD_FAILED

    if args.command == "verify":
        summary = service.verify()
        _print_summary(summary)
        return EXIT_OK if summary.ok else EXIT_VERIFY_FAILED

    if args.command == "download" and args.resource_key:
        listing = []
        LOG.debug("Using caller-supplied resource key; SGX listing lookup is not required")
    else:
        try:
            listing = service.discover()
        except ClientError as exc:
            LOG.error("Could not retrieve the SGX listing: %s", exc)
            return EXIT_DISCOVERY

    if args.command == "list":
        rows = [
            {"date": item.trade_date.isoformat(), "resource_key": item.resource_key}
            for item in listing
        ]
        if args.json:
            print(json.dumps(rows, indent=2))
        else:
            print("DATE        RESOURCE_KEY")
            for row in rows:
                print(f"{row['date']}  {row['resource_key']}")
        return EXIT_OK

    if args.command == "sync":
        summary = service.download_datasets(
            listing, force=args.force, dry_run=args.dry_run
        )
        _print_summary(summary)
        return EXIT_OK if summary.ok else EXIT_DOWNLOAD_FAILED

    if args.resource_key and not args.date:
        LOG.error("--resource-key requires --date")
        return EXIT_USAGE
    if args.date_from and args.date_to is None:
        LOG.error("--from requires --to")
        return EXIT_USAGE
    if args.date_to and args.date_from is None:
        LOG.error("--to requires --from")
        return EXIT_USAGE

    if args.date_from:
        if args.date_to < args.date_from:
            LOG.error("--to cannot be earlier than --from")
            return EXIT_USAGE
        available_by_date = {item.trade_date: item for item in listing}
        for day_text in manifest.data["resources"]:
            day = date.fromisoformat(day_text)
            if day not in available_by_date:
                known = manifest.dataset_for_date(day)
                if known:
                    available_by_date[day] = known
        resolved = [
            item
            for day, item in sorted(available_by_date.items())
            if args.date_from <= day <= args.date_to
        ]
        if not resolved:
            LOG.error(
                "No known SGX trading dates fall within %s to %s. Dates outside the "
                "recent public window require a previously saved resource key.",
                args.date_from,
                args.date_to,
            )
            return EXIT_UNAVAILABLE
    else:
        requested = singapore_today() if args.today else args.date
        dataset = service.resolve_date(requested, listing, args.resource_key)
        if not dataset:
            LOG.error(
                "No public SGX resource key is known for %s. The website exposes only "
                "recent market days; use a key previously saved in the manifest or "
                "--resource-key.",
                requested,
            )
            return EXIT_UNAVAILABLE
        resolved = [dataset]

    summary = service.download_datasets(
        resolved, force=args.force, dry_run=args.dry_run
    )
    _print_summary(summary)
    return EXIT_OK if summary.ok else EXIT_DOWNLOAD_FAILED


def main(argv: list[str] | None = None) -> int:
    default_config = os.environ.get("SGX_DOWNLOADER_CONFIG", "config.ini")
    parser = build_parser(default_config)
    args = parser.parse_args(argv)
    try:
        settings = load_settings(args.config)
        configure_logging(settings, args.logging_config)
        return run(args, settings)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return EXIT_USAGE
    except (KeyboardInterrupt, BrokenPipeError):
        if logging.getLogger().handlers:
            LOG.warning("Run interrupted; use 'retry' to resume manifest work")
        return 130
    except ValueError as exc:
        if logging.getLogger().handlers:
            LOG.error("State error: %s", exc)
        else:
            print(f"State error: {exc}", file=sys.stderr)
        return EXIT_USAGE

