from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


DATE_FORMAT = "%d %b %Y"


@dataclass(frozen=True)
class RemoteFile:
    kind: str
    filename: str
    remote_name: str
    optional: bool = False
    is_zip: bool = False


@dataclass(frozen=True)
class Dataset:
    trade_date: date
    resource_key: str
    tick_filename: str
    tc_filename: str

    @classmethod
    def from_listing_item(cls, item: dict[str, Any]) -> "Dataset":
        if not item or not item.get("key") or not item.get("Date"):
            raise ValueError("listing item is missing key or Date")
        trade_date = datetime.strptime(str(item["Date"]), DATE_FORMAT).date()
        stamp = trade_date.strftime("%Y%m%d")
        return cls(
            trade_date=trade_date,
            resource_key=str(item["key"]),
            tick_filename=str(item.get("Data File") or f"WEBPXTICK_DT-{stamp}.zip"),
            tc_filename=str(item.get("TC Data File") or f"TC_{stamp}.txt"),
        )

    @classmethod
    def from_key(cls, trade_date: date, resource_key: str) -> "Dataset":
        stamp = trade_date.strftime("%Y%m%d")
        return cls(
            trade_date=trade_date,
            resource_key=str(resource_key),
            tick_filename=f"WEBPXTICK_DT-{stamp}.zip",
            tc_filename=f"TC_{stamp}.txt",
        )

    def files(self) -> tuple[RemoteFile, ...]:
        # SGX's live page uses these stable remote aliases. The response supplies
        # the dated Content-Disposition names; local names come from the listing.
        return (
            RemoteFile("tick", self.tick_filename, "WEBPXTICK_DT.zip", is_zip=True),
            RemoteFile("tick_structure", "TickData_structure.dat", "TickData_structure.dat"),
            RemoteFile("trade_cancellation", self.tc_filename, "TC.txt", optional=True),
            RemoteFile("tc_structure", "TC_structure.dat", "TC_structure.dat"),
        )

