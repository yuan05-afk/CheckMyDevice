from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from .client import ClientError, RemoteNotFound, SGXClient, hash_file
from .config import Settings
from .manifest import Manifest
from .models import Dataset, RemoteFile


LOG = logging.getLogger(__name__)


@dataclass
class RunSummary:
    downloaded: int = 0
    skipped: int = 0
    unavailable: int = 0
    failed: int = 0
    planned: int = 0

    @property
    def ok(self) -> bool:
        return self.failed == 0


class DownloadService:
    def __init__(self, settings: Settings, client: SGXClient, manifest: Manifest) -> None:
        self.settings = settings
        self.client = client
        self.manifest = manifest

    def discover(self) -> list[Dataset]:
        datasets = self.client.fetch_listing()
        # Persist every visible key before starting transfers. This is the core
        # recovery safeguard when a date later falls out of SGX's five-day list.
        self.manifest.register(datasets, self.settings.download_base_url)
        return datasets

    def resolve_date(
        self,
        requested: date,
        listing: list[Dataset],
        resource_key: str | None = None,
    ) -> Dataset | None:
        by_date = {dataset.trade_date: dataset for dataset in listing}
        if requested in by_date:
            return by_date[requested]
        known = self.manifest.dataset_for_date(requested)
        if known:
            return known
        if resource_key:
            dataset = Dataset.from_key(requested, resource_key)
            self.manifest.register([dataset], self.settings.download_base_url)
            return dataset
        return None

    def download_datasets(
        self,
        datasets: list[Dataset],
        *,
        force: bool = False,
        dry_run: bool = False,
    ) -> RunSummary:
        summary = RunSummary()
        for dataset in sorted(datasets, key=lambda item: item.trade_date):
            self.manifest.register([dataset], self.settings.download_base_url)
            LOG.info(
                "Processing SGX trade date %s (resource key %s)",
                dataset.trade_date,
                dataset.resource_key,
            )
            for remote_file in dataset.files():
                self._download_one(dataset, remote_file, summary, force, dry_run)
        return summary

    def _download_one(
        self,
        dataset: Dataset,
        remote_file: RemoteFile,
        summary: RunSummary,
        force: bool,
        dry_run: bool,
    ) -> None:
        day = dataset.trade_date.isoformat()
        destination = self.settings.output_dir / day / remote_file.filename
        identifier = self.manifest.file_id(day, remote_file.filename)
        record = self.manifest.data["files"][identifier]

        if dry_run:
            summary.planned += 1
            LOG.info("Would download %s", destination)
            return

        if not force and record.get("status") == "not_available":
            summary.unavailable += 1
            LOG.info("Previously confirmed unavailable; skipping %s", remote_file.filename)
            return

        if not force and record.get("status") == "complete" and destination.is_file():
            expected_size = record.get("size")
            if expected_size is None or destination.stat().st_size == expected_size:
                summary.skipped += 1
                LOG.info("Already complete; skipping %s", destination)
                return

        if not force and destination.is_file():
            if remote_file.is_zip and self.settings.verify_zip:
                try:
                    self.client.verify_zip(destination)
                except ClientError as exc:
                    LOG.warning(
                        "Existing file failed ZIP verification and will be replaced: %s", exc
                    )
                    destination.unlink(missing_ok=True)
                else:
                    size, sha256 = hash_file(destination, self.settings.chunk_size)
                    self.manifest.update_file(
                        identifier,
                        status="complete",
                        size=size,
                        sha256=sha256,
                        local_path=str(destination),
                        last_error=None,
                    )
                    summary.skipped += 1
                    LOG.info("Existing file adopted into manifest: %s", destination)
                    return
            else:
                size, sha256 = hash_file(destination, self.settings.chunk_size)
                self.manifest.update_file(
                    identifier,
                    status="complete",
                    size=size,
                    sha256=sha256,
                    local_path=str(destination),
                    last_error=None,
                )
                summary.skipped += 1
                LOG.info("Existing file adopted into manifest: %s", destination)
                return

        self.manifest.update_file(
            identifier,
            status="downloading",
            attempts=int(record.get("attempts", 0)) + 1,
            last_error=None,
        )
        try:
            result = self.client.download(dataset, remote_file, destination)
        except RemoteNotFound as exc:
            if remote_file.optional:
                self.manifest.update_file(
                    identifier, status="not_available", last_error=str(exc)
                )
                summary.unavailable += 1
                LOG.warning("Optional SGX file is not available: %s", remote_file.filename)
                return
            self._mark_failed(identifier, remote_file, exc, summary)
            return
        except (ClientError, OSError) as exc:
            self._mark_failed(identifier, remote_file, exc, summary)
            return

        self.manifest.update_file(
            identifier,
            status="complete",
            size=result.size,
            sha256=result.sha256,
            local_path=str(destination),
            final_url=result.final_url,
            transfer_attempts=result.attempts,
            last_error=None,
        )
        summary.downloaded += 1
        LOG.info(
            "Downloaded %s (%d bytes, sha256=%s)",
            destination,
            result.size,
            result.sha256,
        )

    def _mark_failed(
        self,
        identifier: str,
        remote_file: RemoteFile,
        exc: BaseException,
        summary: RunSummary,
    ) -> None:
        self.manifest.update_file(identifier, status="failed", last_error=str(exc))
        summary.failed += 1
        LOG.error("Failed to download %s: %s", remote_file.filename, exc)

    def retry_pending(self, *, dry_run: bool = False) -> RunSummary:
        datasets = [
            dataset
            for trade_date in self.manifest.pending_dates()
            if (dataset := self.manifest.dataset_for_date(trade_date)) is not None
        ]
        if not datasets:
            LOG.info("No failed or interrupted files require recovery")
            return RunSummary()
        LOG.info("Recovering %d trade date(s) from the manifest", len(datasets))
        return self.download_datasets(datasets, dry_run=dry_run)

    def verify(self) -> RunSummary:
        summary = RunSummary()
        for identifier, record in sorted(self.manifest.data["files"].items()):
            if record.get("status") != "complete":
                continue
            path = Path(record["local_path"])
            if not path.is_file():
                summary.failed += 1
                LOG.error("Manifest file is missing: %s", path)
                continue
            size, digest = hash_file(path, self.settings.chunk_size)
            if size != record.get("size") or digest != record.get("sha256"):
                summary.failed += 1
                LOG.error("Integrity mismatch for %s", path)
                continue
            summary.skipped += 1
            LOG.info("Verified %s", path)
        return summary

