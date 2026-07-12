# CheckMyDevice agent guide

CheckMyDevice is a browser-only hardware diagnostics app for checking a computer's keyboard, mouse or trackpad, camera, microphone, speakers, display, battery, network connection, and motion/orientation sensors. The shipped product is the Vite/React frontend in `artifacts/check-my-device`; it uses native browser APIs and stores test results in `localStorage`, so it does not require the repository's API, database, or generated-client scaffolding.

## Repository map

- `artifacts/check-my-device/` — the real product: Vite, React, and TypeScript.
- `artifacts/check-my-device/src/pages/tests/` — one page per hardware test.
- `artifacts/check-my-device/src/context/TestContext.tsx` — test IDs, statuses, defaults, and `localStorage` persistence (`checkmydevice-results`).
- `artifacts/check-my-device/src/pages/Dashboard.tsx` — dashboard metadata for T-01 through T-09.
- `artifacts/check-my-device/src/App.tsx` — route registration and providers.
- `artifacts/check-my-device/src/pages/ResultsSummary.tsx` — aggregate report.
- `artifacts/api-server/` — unused Express 5 health-route scaffold; the frontend does not call it.
- `lib/db/` — unused PostgreSQL/Drizzle scaffold.
- `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` — unused OpenAPI, generated Zod, and React Query client scaffolding. The frontend has a workspace dependency on the client but makes no API requests.
- `artifacts/mockup-sandbox/` — Replit design-preview tooling, not the shipped product.
- `scripts/` — workspace utility scripts.
- `replit.md` — legacy Replit template; this file and `README.md` supersede it.

Do not modify the API server, database, API libraries, or mockup sandbox unless a task explicitly brings them into scope.

## Setup and product commands

Use pnpm only. The root `preinstall` rejects npm and Yarn and removes their lockfiles.

```sh
pnpm install --frozen-lockfile
```

`artifacts/check-my-device/vite.config.ts` throws unless both `PORT` and `BASE_PATH` are set. They are required by `dev`, `build`, and `serve`. POSIX shells:

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/check-my-device run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/check-my-device run build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/check-my-device run serve
```

PowerShell:

```powershell
$env:PORT='5173'; $env:BASE_PATH='/'; pnpm --filter @workspace/check-my-device run dev
$env:PORT='5173'; $env:BASE_PATH='/'; pnpm --filter @workspace/check-my-device run build
$env:PORT='5173'; $env:BASE_PATH='/'; pnpm --filter @workspace/check-my-device run serve
```

Production output is `artifacts/check-my-device/dist/public/`.

## Checks and workspace package commands

```sh
pnpm run typecheck
PORT=5173 BASE_PATH=/ pnpm run build
pnpm run typecheck:libs
```

| Package | Scripts |
| --- | --- |
| `@workspace/check-my-device` | `dev`, `build`, `serve`, `typecheck` (first three require `PORT` and `BASE_PATH`) |
| `@workspace/api-server` | `dev`, `build`, `start`, `typecheck` (scaffold; `dev` uses POSIX `export`) |
| `@workspace/mockup-sandbox` | `dev`, `build`, `preview`, `typecheck` (scaffold) |
| `@workspace/api-spec` | `codegen` |
| `@workspace/db` | `push`, `push-force` (requires `DATABASE_URL`) |
| `@workspace/scripts` | `hello`, `typecheck` |
| `@workspace/api-zod` | no scripts; checked by the root TypeScript build |
| `@workspace/api-client-react` | no scripts; checked by the root TypeScript build |

Run package scripts as `pnpm --filter <package-name> run <script>`. Root `pnpm run build` typechecks and builds every workspace package defining `build`, including scaffolds; prefer the filtered frontend build for product-only work.

## Conventions and gotchas

- Keep the app client-side unless backend work is explicitly requested. Hardware APIs and permissions vary by browser, OS, device, and secure-context rules.
- Statuses are `untested`, `working`, `issue`, and `unsupported`; they persist locally and are not synced.
- `src/components/ui/*` is the generated shadcn/Radix layer. Regenerate components through the shadcn workflow instead of hand-editing generated files; place product composition outside it.
- Adding a hardware test touches dashboard metadata in `src/pages/Dashboard.tsx`, `TestId` and `defaultResults` in `src/context/TestContext.tsx`, a page in `src/pages/tests/`, and a route in `src/App.tsx`. Also update `ResultsSummary.tsx` metadata so the result renders meaningfully.
- TanStack Query is configured but makes no real API calls.
- Preserve `minimumReleaseAge: 1440` in `pnpm-workspace.yaml`; it is an intentional supply-chain control.
- There is no automated test script. Use the full typecheck, a product build, and browser smoke testing appropriate to the hardware APIs changed.
