# Design and Recovery Notes

## Source discovery

The SGX derivatives page currently calls this public first-party listing service:

```text
https://api3.sgx.com/infofeed/Apps?A=COW_Tickdownload_Content&B=TimeSalesData&C_T=20
```

Each response item supplies a market date and a resource `key`. The page then
downloads files below:

```text
https://links.sgx.com/1.0.0/derivatives-historical/{key}/
```

The job follows that contract. The endpoints remain configurable because a
publisher can change an undocumented public implementation detail.

## Normal flow

1. Fetch and validate SGX's JSON listing over HTTPS.
2. Persist every visible date/key and all planned files to `manifest.json` before
   transferring any content.
3. Download to `filename.part`, flush and `fsync`, validate, then atomically rename.
4. Validate that the tick ZIP opens, has entries, and passes CRC checks.
5. Record size, SHA-256, final URL, attempts, and status in an atomically written
   manifest.
6. Treat an HTTP 404 for `TC_*.txt` as `not_available`, because SGX documents TC
   as conditional. A missing tick ZIP or structure file remains a failure.

Final files are never partially overwritten. Repeated runs are idempotent.

## Automatic recovery

The recommended daily command is `sync`. It processes every date currently visible,
not only today's date. Therefore:

- a network/server failure is retried up to four times with exponential backoff and
  jitter during the run;
- a failed recent date is naturally tried again by the next scheduled `sync`;
- `retry` resumes `planned`, `downloading`, or `failed` records from the manifest;
- recovery does not need the live listing once the date/key was captured;
- a killed process leaves no corrupt final file: only a removable `.part` file and a
  recoverable `downloading` manifest status remain.

Operators should alert on any nonzero exit code and can use `retry` after SGX or the
network recovers. The rotating DEBUG log plus manifest `last_error` fields provide
context to distinguish HTTP, timeout, parsing, and integrity failures.

## Older-file limitation

SGX states that the public page lists only the past five market days. An arbitrary
old date cannot be mapped to a resource key from that page after it leaves the
window. The downloader therefore does not guess sequential identifiers or claim
that all historical data is publicly discoverable.

There are three supported cases:

1. **Date still listed:** `sync`, `--date`, or `--from/--to` works directly.
2. **Date previously observed:** the saved manifest key allows later redownload with
   `download --date ...` or `retry`, even after the page stops listing it.
3. **Date never observed:** use `--resource-key` only when an authoritative key is
   already known. Otherwise obtain the older dataset through SGX's historical-data
   service/order process referenced on the derivatives page.

For production retention, back up `runtime/state/manifest.json` together with the
downloaded files. Losing both the file and its saved key after the public window has
expired can require external SGX data retrieval.

## Operational concerns

- Schedule after publication and use Singapore time. Market holidays and weekends
  are expected; range selection ignores calendar dates without known resources.
- Keep one scheduler instance per output directory. Atomic writes protect against
  interruption, but the manifest is not designed for concurrent writers.
- Monitor disk space: tick ZIPs are substantially larger than the text files.
- Keep HTTPS certificate verification enabled (Python's default).
- SGX usage terms apply. The page labels this historical data for personal and
  non-commercial use; the operator must ensure their use is permitted.
- Configuration contains no secrets. If a proxy or credentials are later added,
  do not log them and use environment/secret management rather than this INI file.
