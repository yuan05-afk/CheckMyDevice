from __future__ import annotations

import json
import os
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Iterable

from .models import Dataset


def _now() -> str:
    return datetime.now(UTC).isoformat()


class Manifest:
    VERSION = 1

    def __init__(self, path: Path) -> None:
        self.path = path
        self.data: dict[str, Any] = {
            "version": self.VERSION,
            "updated_at": None,
            "resources": {},
            "files": {},
        }
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            return
        try:
            loaded = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(f"cannot read manifest {self.path}: {exc}") from exc
        if loaded.get("version") != self.VERSION:
            raise ValueError(
                f"unsupported manifest version {loaded.get('version')!r} in {self.path}"
            )
        self.data = loaded
        self.data.setdefault("resources", {})
        self.data.setdefault("files", {})

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data["updated_at"] = _now()
        temporary = self.path.with_name(self.path.name + ".tmp")
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(self.data, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, self.path)

    @staticmethod
    def file_id(trade_date: date | str, filename: str) -> str:
        return f"{trade_date}/{filename}"

    def register(self, datasets: Iterable[Dataset], base_url: str) -> None:
        changed = False
        for dataset in datasets:
            day = dataset.trade_date.isoformat()
            resource = self.data["resources"].get(day, {})
            new_resource = {
                "resource_key": dataset.resource_key,
                "tick_filename": dataset.tick_filename,
                "tc_filename": dataset.tc_filename,
                "discovered_at": resource.get("discovered_at", _now()),
                "last_seen_at": _now(),
            }
            if resource != new_resource:
                self.data["resources"][day] = new_resource
                changed = True

            for remote_file in dataset.files():
                identifier = self.file_id(day, remote_file.filename)
                existing = self.data["files"].get(identifier, {})
                if not existing:
                    self.data["files"][identifier] = {
                        "trade_date": day,
                        "resource_key": dataset.resource_key,
                        "kind": remote_file.kind,
                        "filename": remote_file.filename,
                        "remote_name": remote_file.remote_name,
                        "url": f"{base_url}/{dataset.resource_key}/{remote_file.remote_name}",
                        "optional": remote_file.optional,
                        "is_zip": remote_file.is_zip,
                        "status": "planned",
                        "attempts": 0,
                        "discovered_at": _now(),
                        "updated_at": _now(),
                        "last_error": None,
                    }
                    changed = True
                else:
                    existing["resource_key"] = dataset.resource_key
                    existing["url"] = f"{base_url}/{dataset.resource_key}/{remote_file.remote_name}"
        if changed:
            self.save()

    def update_file(self, identifier: str, **values: Any) -> None:
        record = self.data["files"][identifier]
        record.update(values)
        record["updated_at"] = _now()
        self.save()

    def dataset_for_date(self, trade_date: date) -> Dataset | None:
        record = self.data["resources"].get(trade_date.isoformat())
        if not record:
            return None
        return Dataset(
            trade_date=trade_date,
            resource_key=str(record["resource_key"]),
            tick_filename=str(record["tick_filename"]),
            tc_filename=str(record["tc_filename"]),
        )

    def pending_dates(self) -> list[date]:
        pending = {"planned", "downloading", "failed"}
        dates = {
            date.fromisoformat(record["trade_date"])
            for record in self.data["files"].values()
            if record.get("status") in pending
        }
        return sorted(dates)

