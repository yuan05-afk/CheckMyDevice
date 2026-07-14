from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Callable, TypeVar

from .config import Settings
from .models import Dataset, RemoteFile


LOG = logging.getLogger(__name__)
T = TypeVar("T")
RETRYABLE_HTTP = {408, 425, 429, 500, 502, 503, 504}
ALLOWED_HOST_SUFFIX = ".sgx.com"


class ClientError(RuntimeError):
    pass


class RemoteNotFound(ClientError):
    pass


class IntegrityError(ClientError):
    pass


@dataclass(frozen=True)
class DownloadResult:
    size: int
    sha256: str
    final_url: str
    attempts: int


class SGXClient:
    def __init__(
        self,
        settings: Settings,
        *,
        opener: urllib.request.OpenerDirector | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.settings = settings
        self._opener = opener or urllib.request.build_opener()
        self._sleep = sleep

    def _request(self, url: str) -> urllib.request.Request:
        return urllib.request.Request(
            url,
            headers={
                "Accept": "application/json, application/octet-stream;q=0.9, */*;q=0.8",
                "User-Agent": self.settings.user_agent,
                "Referer": "https://www.sgx.com/research-education/derivatives",
            },
        )

    def _validate_sgx_url(self, url: str) -> None:
        parsed = urllib.parse.urlparse(url)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not (host == "sgx.com" or host.endswith(ALLOWED_HOST_SUFFIX)):
            raise ClientError(f"refusing unexpected non-SGX URL: {url}")

    def _with_no_cache(self, url: str) -> str:
        parts = urllib.parse.urlsplit(url)
        query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        query.append(("noCache", str(int(time.time() * 1000))))
        return urllib.parse.urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment)
        )

    def _run_with_retries(self, operation: Callable[[int], T], description: str) -> T:
        last_error: BaseException | None = None
        for attempt in range(1, self.settings.max_attempts + 1):
            try:
                return operation(attempt)
            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    raise RemoteNotFound(f"{description}: HTTP 404") from exc
                last_error = exc
                retryable = exc.code in RETRYABLE_HTTP
            except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
                last_error = exc
                retryable = True

            if not retryable or attempt == self.settings.max_attempts:
                break
            delay = self.settings.backoff_initial_seconds * (2 ** (attempt - 1))
            delay += random.uniform(0, max(0.05, delay * 0.2))
            LOG.warning(
                "%s failed on attempt %d/%d; retrying in %.1fs: %s",
                description,
                attempt,
                self.settings.max_attempts,
                delay,
                last_error,
            )
            self._sleep(delay)
        raise ClientError(f"{description} failed after {self.settings.max_attempts} attempts: {last_error}")

    def fetch_listing(self) -> list[Dataset]:
        url = self._with_no_cache(self.settings.list_url)
        self._validate_sgx_url(url)
        LOG.debug("Fetching SGX listing from %s", url)

        def load(_attempt: int) -> bytes:
            with self._opener.open(
                self._request(url), timeout=self.settings.timeout_seconds
            ) as response:
                self._validate_sgx_url(response.geturl())
                return response.read()

        raw = self._run_with_retries(load, "SGX listing request")
        try:
            payload = json.loads(raw.decode("utf-8-sig"))
            items = payload["items"]
            datasets = [Dataset.from_listing_item(item) for item in items if item]
        except (UnicodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise ClientError(f"invalid SGX listing response: {exc}") from exc
        if not datasets:
            raise ClientError("SGX listing returned no usable datasets")
        LOG.debug("Discovered %d SGX trading dates", len(datasets))
        return sorted(datasets, key=lambda item: item.trade_date, reverse=True)

    def file_url(self, dataset: Dataset, remote_file: RemoteFile) -> str:
        key = urllib.parse.quote(dataset.resource_key, safe="")
        name = urllib.parse.quote(remote_file.remote_name, safe="")
        url = f"{self.settings.download_base_url}/{key}/{name}"
        self._validate_sgx_url(url)
        return url

    def download(
        self, dataset: Dataset, remote_file: RemoteFile, destination: Path
    ) -> DownloadResult:
        url = self.file_url(dataset, remote_file)
        destination.parent.mkdir(parents=True, exist_ok=True)
        partial = destination.with_name(destination.name + ".part")

        def transfer(attempt: int) -> DownloadResult:
            partial.unlink(missing_ok=True)
            digest = hashlib.sha256()
            size = 0
            try:
                with self._opener.open(
                    self._request(url), timeout=self.settings.timeout_seconds
                ) as response, partial.open("wb") as output:
                    final_url = response.geturl()
                    self._validate_sgx_url(final_url)
                    while True:
                        block = response.read(self.settings.chunk_size)
                        if not block:
                            break
                        output.write(block)
                        digest.update(block)
                        size += len(block)
                    output.flush()
                    os.fsync(output.fileno())
                if size == 0:
                    raise IntegrityError(f"downloaded file is empty: {remote_file.filename}")
                if remote_file.is_zip and self.settings.verify_zip:
                    self.verify_zip(partial)
                os.replace(partial, destination)
                return DownloadResult(size, digest.hexdigest(), final_url, attempt)
            except BaseException:
                partial.unlink(missing_ok=True)
                raise

        LOG.debug("Downloading %s from %s", remote_file.filename, url)
        return self._run_with_retries(transfer, f"download {remote_file.filename}")

    @staticmethod
    def verify_zip(path: Path) -> None:
        try:
            with zipfile.ZipFile(path) as archive:
                if not archive.namelist():
                    raise IntegrityError(f"ZIP archive has no entries: {path.name}")
                bad_member = archive.testzip()
                if bad_member:
                    raise IntegrityError(
                        f"ZIP CRC verification failed for {path.name}: {bad_member}"
                    )
        except zipfile.BadZipFile as exc:
            raise IntegrityError(f"invalid ZIP archive: {path.name}") from exc


def hash_file(path: Path, chunk_size: int = 1024 * 1024) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        while True:
            block = handle.read(chunk_size)
            if not block:
                break
            digest.update(block)
            size += len(block)
    return size, digest.hexdigest()

