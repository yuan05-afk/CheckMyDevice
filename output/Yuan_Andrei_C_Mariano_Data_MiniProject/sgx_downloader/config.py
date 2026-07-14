from __future__ import annotations

import configparser
from dataclasses import dataclass
from pathlib import Path


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Settings:
    config_path: Path
    list_url: str
    download_base_url: str
    timeout_seconds: float
    max_attempts: int
    backoff_initial_seconds: float
    user_agent: str
    output_dir: Path
    manifest_path: Path
    logging_config_path: Path
    log_file: Path
    chunk_size: int
    verify_zip: bool


def _resolve(base: Path, raw: str) -> Path:
    path = Path(raw).expanduser()
    return path if path.is_absolute() else (base / path).resolve()


def load_settings(config_path: str | Path) -> Settings:
    path = Path(config_path).expanduser().resolve()
    if not path.is_file():
        raise ConfigError(f"configuration file not found: {path}")

    parser = configparser.ConfigParser()
    try:
        with path.open("r", encoding="utf-8") as handle:
            parser.read_file(handle)
        base = path.parent
        settings = Settings(
            config_path=path,
            list_url=parser.get("sgx", "list_url"),
            download_base_url=parser.get("sgx", "download_base_url").rstrip("/"),
            timeout_seconds=parser.getfloat("sgx", "timeout_seconds", fallback=60.0),
            max_attempts=parser.getint("sgx", "max_attempts", fallback=4),
            backoff_initial_seconds=parser.getfloat(
                "sgx", "backoff_initial_seconds", fallback=1.0
            ),
            user_agent=parser.get(
                "sgx", "user_agent", fallback="sgx-data-downloader/1.0"
            ),
            output_dir=_resolve(base, parser.get("paths", "output_dir")),
            manifest_path=_resolve(base, parser.get("paths", "manifest_path")),
            logging_config_path=_resolve(base, parser.get("paths", "logging_config")),
            log_file=_resolve(base, parser.get("paths", "log_file")),
            chunk_size=parser.getint("download", "chunk_size", fallback=1024 * 1024),
            verify_zip=parser.getboolean("download", "verify_zip", fallback=True),
        )
    except (configparser.Error, KeyError, ValueError) as exc:
        raise ConfigError(f"invalid configuration in {path}: {exc}") from exc

    if not settings.list_url.startswith("https://"):
        raise ConfigError("sgx.list_url must use HTTPS")
    if not settings.download_base_url.startswith("https://"):
        raise ConfigError("sgx.download_base_url must use HTTPS")
    if settings.max_attempts < 1:
        raise ConfigError("sgx.max_attempts must be at least 1")
    if settings.timeout_seconds <= 0 or settings.chunk_size <= 0:
        raise ConfigError("timeout_seconds and chunk_size must be positive")
    return settings

