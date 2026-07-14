from __future__ import annotations

import hashlib
import io
import json
import tempfile
import unittest
import urllib.error
import zipfile
from datetime import date
from pathlib import Path

from sgx_downloader.client import DownloadResult, RemoteNotFound, SGXClient
from sgx_downloader.config import Settings
from sgx_downloader.manifest import Manifest
from sgx_downloader.models import Dataset, RemoteFile
from sgx_downloader.service import DownloadService


LIST_URL = (
    "https://api3.sgx.com/infofeed/Apps?"
    "A=COW_Tickdownload_Content&B=TimeSalesData&C_T=20"
)
BASE_URL = "https://links.sgx.com/1.0.0/derivatives-historical"


def make_settings(root: Path, max_attempts: int = 3) -> Settings:
    return Settings(
        config_path=root / "config.ini",
        list_url=LIST_URL,
        download_base_url=BASE_URL,
        timeout_seconds=5,
        max_attempts=max_attempts,
        backoff_initial_seconds=0,
        user_agent="test-agent",
        output_dir=root / "data",
        manifest_path=root / "state" / "manifest.json",
        logging_config_path=root / "logging.ini",
        log_file=root / "logs" / "test.log",
        chunk_size=7,
        verify_zip=True,
    )


def zip_bytes() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("ticks.txt", "tick-data")
    return output.getvalue()


class FakeResponse:
    def __init__(self, body: bytes, url: str):
        self._stream = io.BytesIO(body)
        self._url = url

    def read(self, size: int = -1) -> bytes:
        return self._stream.read(size)

    def geturl(self) -> str:
        return self._url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class FakeOpener:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    def open(self, _request, timeout=None):
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


class ModelsAndClientTests(unittest.TestCase):
    def test_listing_item_maps_to_all_requested_files(self):
        dataset = Dataset.from_listing_item(
            {
                "key": "6243",
                "Date": "10 Jul 2026",
                "Data File": "WEBPXTICK_DT-20260710.zip",
                "TC Data File": "TC_20260710.txt",
            }
        )
        self.assertEqual(dataset.trade_date, date(2026, 7, 10))
        self.assertEqual(
            [item.filename for item in dataset.files()],
            [
                "WEBPXTICK_DT-20260710.zip",
                "TickData_structure.dat",
                "TC_20260710.txt",
                "TC_structure.dat",
            ],
        )
        self.assertTrue(dataset.files()[2].optional)

    def test_fetch_listing_ignores_empty_trailing_item(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = make_settings(Path(folder))
            payload = {
                "items": [
                    {
                        "key": "6243",
                        "Date": "10 Jul 2026",
                        "Data File": "WEBPXTICK_DT-20260710.zip",
                        "TC Data File": "TC_20260710.txt",
                    },
                    {},
                ]
            }
            opener = FakeOpener(
                [FakeResponse(json.dumps(payload).encode(), "https://api3.sgx.com/infofeed/Apps")]
            )
            datasets = SGXClient(settings, opener=opener, sleep=lambda _n: None).fetch_listing()
            self.assertEqual(len(datasets), 1)
            self.assertEqual(datasets[0].resource_key, "6243")

    def test_download_retries_network_error_and_atomically_writes_valid_zip(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            settings = make_settings(root, max_attempts=2)
            final_url = f"{BASE_URL}/6243/WEBPXTICK_DT.zip"
            opener = FakeOpener(
                [
                    urllib.error.URLError("temporary"),
                    FakeResponse(zip_bytes(), final_url),
                ]
            )
            sleeps = []
            client = SGXClient(settings, opener=opener, sleep=sleeps.append)
            dataset = Dataset.from_key(date(2026, 7, 10), "6243")
            target = root / "out" / dataset.tick_filename
            result = client.download(dataset, dataset.files()[0], target)
            self.assertEqual(opener.calls, 2)
            self.assertEqual(result.attempts, 2)
            self.assertEqual(target.read_bytes(), zip_bytes())
            self.assertFalse(target.with_name(target.name + ".part").exists())
            self.assertEqual(result.sha256, hashlib.sha256(target.read_bytes()).hexdigest())
            self.assertEqual(len(sleeps), 1)


class ManifestAndRecoveryTests(unittest.TestCase):
    def test_manifest_retains_key_for_retry_after_listing_window(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            dataset = Dataset.from_key(date(2026, 7, 10), "6243")
            manifest = Manifest(root / "state" / "manifest.json")
            manifest.register([dataset], BASE_URL)
            identifier = manifest.file_id(dataset.trade_date, dataset.tick_filename)
            manifest.update_file(identifier, status="failed", last_error="timeout")

            reloaded = Manifest(manifest.path)
            recovered = reloaded.dataset_for_date(date(2026, 7, 10))
            self.assertIsNotNone(recovered)
            self.assertEqual(recovered.resource_key, "6243")
            self.assertIn(date(2026, 7, 10), reloaded.pending_dates())

    def test_optional_tc_404_is_not_a_failed_run(self):
        class FakeClient:
            def download(self, dataset, remote_file, destination):
                if remote_file.optional:
                    raise RemoteNotFound("not published")
                destination.parent.mkdir(parents=True, exist_ok=True)
                body = zip_bytes() if remote_file.is_zip else b"structure"
                destination.write_bytes(body)
                return DownloadResult(
                    len(body),
                    hashlib.sha256(body).hexdigest(),
                    f"{BASE_URL}/{dataset.resource_key}/{remote_file.remote_name}",
                    1,
                )

            def verify_zip(self, path):
                SGXClient.verify_zip(path)

        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            settings = make_settings(root)
            manifest = Manifest(settings.manifest_path)
            service = DownloadService(settings, FakeClient(), manifest)
            dataset = Dataset.from_key(date(2026, 7, 10), "6243")
            summary = service.download_datasets([dataset])
            self.assertTrue(summary.ok)
            self.assertEqual(summary.downloaded, 3)
            self.assertEqual(summary.unavailable, 1)
            tc_id = manifest.file_id(dataset.trade_date, dataset.tc_filename)
            self.assertEqual(manifest.data["files"][tc_id]["status"], "not_available")

    def test_dry_run_registers_manifest_without_writing_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            settings = make_settings(root)
            manifest = Manifest(settings.manifest_path)

            class NeverDownload:
                def download(self, *_args):
                    raise AssertionError("dry run must not download")

            service = DownloadService(settings, NeverDownload(), manifest)
            dataset = Dataset.from_key(date(2026, 7, 10), "6243")
            summary = service.download_datasets([dataset], dry_run=True)
            self.assertEqual(summary.planned, 4)
            self.assertFalse(settings.output_dir.exists())
            self.assertTrue(settings.manifest_path.exists())


if __name__ == "__main__":
    unittest.main()
