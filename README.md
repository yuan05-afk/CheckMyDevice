# CheckMyDevice

CheckMyDevice is a private, browser-based checklist for testing a new PC or laptop's input and output hardware. It runs entirely with native web APIs, requires no account or backend, and keeps diagnostic results only in the browser's `localStorage`.

<!-- Screenshot placeholder: replace with an image of the diagnostics dashboard. -->

> **Screenshot:** CheckMyDevice dashboard (coming soon)

## Hardware tests

The dashboard provides nine guided checks:

1. **Keyboard (T-01)** — verify key input.
2. **Mouse & Trackpad (T-02)** — check pointer movement, clicks, and scrolling.
3. **Camera (T-03)** — preview available cameras through MediaDevices.
4. **Microphone (T-04)** — request access and visualize audio input.
5. **Speaker (T-05)** — play test audio and confirm output.
6. **Display (T-06)** — inspect the screen with visual test patterns.
7. **Battery (T-07)** — report battery and charging information when exposed by the browser.
8. **Network (T-08)** — inspect online state and available connection information.
9. **Sensors (T-09)** — observe device orientation and motion events when supported.

Each result is untested, working, issue, or unsupported. Results Summary combines all nine checks into a local report. Support and permission behavior vary by browser, operating system, and hardware; unsupported is valid when an API is unavailable.

## Local setup

Prerequisites:

- A current Node.js release compatible with the lockfile
- pnpm (npm and Yarn are intentionally rejected)

From the repository root:

```sh
pnpm install --frozen-lockfile
```

The frontend requires `PORT` and `BASE_PATH`. On macOS, Linux, or another POSIX shell:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/check-my-device run dev
```

On PowerShell:

```powershell
$env:PORT='5173'
$env:BASE_PATH='/'
pnpm --filter @workspace/check-my-device run dev
```

Open `http://localhost:5173`. Use localhost or HTTPS so permission-gated APIs have a secure context.

## Production build

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/check-my-device run build
```

PowerShell:

```powershell
$env:PORT='5173'; $env:BASE_PATH='/'; pnpm --filter @workspace/check-my-device run build
```

Static output is written to `artifacts/check-my-device/dist/public/`. Set `BASE_PATH` to its deployment URL prefix, such as `/` for a domain root.

Useful validation commands:

```sh
pnpm run typecheck
PORT=5173 BASE_PATH=/ pnpm run build
```

The root build includes scaffold packages. For product work, the filtered frontend build is faster and more representative.

## Tech stack

- Vite, React 19, and TypeScript
- Tailwind CSS with shadcn/ui and Radix primitives
- Wouter routing
- Framer Motion animation
- next-themes light/dark mode
- TanStack Query (configured, not connected to a real API)
- MediaDevices, Web Audio, Battery Status, Network Information, and device motion/orientation APIs

## Repository layout

The production app lives in `artifacts/check-my-device/`. The API server, database libraries, API schema/generated clients, and mockup sandbox are retained scaffolding and are not part of the current runtime. See `AGENTS.md` for the detailed workspace map and commands.

## Privacy

Hardware checks execute locally. CheckMyDevice does not upload recordings, camera images, or results, and the current frontend does not call a backend. Clearing site storage removes saved results.
