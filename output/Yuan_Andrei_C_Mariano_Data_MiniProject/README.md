# SGX Derivatives Data Downloader

**Author:** Yuan Andrei C. Mariano  
**Submission:** Data MiniProject

This project is a dependency-free Python command-line job for SGX Time and Sales
historical data. It downloads the four requested file types:

- `WEBPXTICK_DT-*.zip`
- `TickData_structure.dat`
- `TC_*.txt` when SGX publishes a Trade Cancellation file
- `TC_structure.dat`

The implementation uses the same first-party SGX listing and download services as
the current [SGX derivatives page](https://www.sgx.com/research-education/derivatives).
It does not scrape presentation HTML or guess resource identifiers.

## Quick start

Python 3.10 or later is required. Runtime dependencies are limited to the Python
standard library.

```bash
cd Yuan_Andrei_C_Mariano_Data_MiniProject
python3 -m sgx_downloader list
python3 -m sgx_downloader sync
```

Optional installation creates a normal Linux command:

```bash
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install .
sgx-download --help
sgx-download sync
```

All paths in `config.ini` are resolved relative to the configuration file. The
default output is:

```text
runtime/
|-- data/YYYY-MM-DD/
|   |-- WEBPXTICK_DT-YYYYMMDD.zip
|   |-- TickData_structure.dat
|   |-- TC_YYYYMMDD.txt              # only when SGX has one
|   `-- TC_structure.dat
|-- logs/sgx_downloader.log
`-- state/manifest.json
```

## Commands

```bash
# Recommended daily job: sync every date in SGX's recent window.
python3 -m sgx_downloader sync

# Today's Singapore calendar date. This can be unavailable on a non-market day
# or before SGX publishes the file.
python3 -m sgx_downloader download --today

# One historical date currently listed, or a date already saved in the manifest.
python3 -m sgx_downloader download --date 2026-07-10

# All known trading dates inside an inclusive range; weekends/holidays are ignored.
python3 -m sgx_downloader download --from 2026-07-06 --to 2026-07-10

# Retry failed or interrupted work without needing the current SGX listing.
python3 -m sgx_downloader retry

# Check every completed file against its stored size and SHA-256 hash.
python3 -m sgx_downloader verify

# Preview actions or explicitly replace completed files.
python3 -m sgx_downloader sync --dry-run
python3 -m sgx_downloader download --date 2026-07-10 --force

# If an old public key is known but was never observed by this installation:
python3 -m sgx_downloader download --date 2026-01-02 --resource-key 5999
```

Use another configuration with the global option before the command:

```bash
python3 -m sgx_downloader --config /etc/sgx-downloader/config.ini sync
```

## Scheduling

Run `sync`, not `download --today`, for unattended operation. `sync` revisits
the entire recent SGX window, so a temporary outage is automatically caught up on
the next run.

Example cron entry (weekdays at 16:30 Singapore time when the host also uses SGT):

```cron
30 16 * * 1-5 cd /opt/sgx-data-downloader && /opt/sgx-data-downloader/.venv/bin/sgx-download sync
```

If the server uses another timezone, set `CRON_TZ=Asia/Singapore` where supported,
or convert the schedule explicitly. A second run later in the evening is harmless
because completed files are idempotently skipped.

## Logging

`logging.ini` uses Python's `logging` module and is split by audience:

- `INFO` and above go to stdout for cron/systemd visibility.
- `DEBUG` and above go to a rotating file for diagnosis.
- The file log includes timestamps, logger names, process IDs, resource keys,
  retry warnings, final sizes, and SHA-256 values.

The file rotates at 5 MiB and keeps five backups. Both the logging configuration
and log destination are configurable. No credentials or cookies are used or logged.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Requested work completed; an optional TC file may legitimately be absent |
| 2 | Invalid CLI/configuration/manifest state |
| 3 | SGX listing could not be retrieved or parsed |
| 4 | Requested date is not discoverable and has no saved/supplied key |
| 5 | One or more required downloads failed |
| 6 | Integrity verification failed |
| 130 | Interrupted by the operator |

See [DESIGN.md](DESIGN.md) for recovery details, limitations, and decisions.

## Tests

Tests use only `unittest` and do not contact SGX:

```bash
python3 -m unittest discover -s tests -v
```

For a safe live check that does not download the large tick ZIP:

```bash
python3 -m sgx_downloader list
python3 -m sgx_downloader sync --dry-run
```
