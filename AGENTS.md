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

Do not modify the API server, database, API libraries, or mockup sandbox unless a task explicitly brings them into scope.

## Setup and product commands

Use pnpm only. The root `preinstall` rejects npm and Yarn and removes their lockfiles.

```sh
pnpm install --frozen-lockfile
```

`artifacts/check-my-device/vite.config.ts` defaults to port `5173` and base path `/`. Set `PORT` or `BASE_PATH` only when you need to override those defaults. POSIX shells:

```sh
pnpm --filter @workspace/check-my-device run dev
pnpm --filter @workspace/check-my-device run build
pnpm --filter @workspace/check-my-device run serve
```

PowerShell:

```powershell
pnpm --filter @workspace/check-my-device run dev
pnpm --filter @workspace/check-my-device run build
pnpm --filter @workspace/check-my-device run serve
```

Production output is `artifacts/check-my-device/dist/public/`.

## Checks and workspace package commands

```sh
pnpm run typecheck
pnpm run build
pnpm run typecheck:libs
```

| Package | Scripts |
| --- | --- |
| `@workspace/check-my-device` | `dev`, `build`, `serve`, `typecheck` (the first three default to port `5173` and base path `/`) |
| `@workspace/api-server` | `dev`, `build`, `start`, `typecheck` (scaffold; `dev` uses POSIX `export`) |
| `@workspace/mockup-sandbox` | `dev`, `build`, `preview`, `typecheck` (scaffold) |
| `@workspace/api-spec` | `codegen` |
| `@workspace/db` | `push`, `push-force` (requires `DATABASE_URL`) |
| `@workspace/scripts` | `hello`, `typecheck` |
| `@workspace/api-zod` | no scripts; checked by the root TypeScript build |
| `@workspace/api-client-react` | no scripts; checked by the root TypeScript build |

Run package scripts as `pnpm --filter <package-name> run <script>`. Root `pnpm run build` typechecks and builds every workspace package defining `build`, including scaffolds; prefer the filtered frontend build for product-only work.

## Conventions and gotchas

### Canonical diagnostic page design

Use `artifacts/check-my-device/src/pages/tests/KeyboardTest.tsx` as the visual and structural reference for every hardware test page. New and updated tests should follow this composition unless the hardware API requires a clearly justified exception:

- Use `TestPageHeader` for the shared test ID, title, description, and result actions.
- Test routes use the wide diagnostic workspace supplied by `Layout`; page roots should use `test-page mx-auto flex w-full max-w-[90rem] flex-col`.
- Place compact, genuinely useful live summaries directly below the header in `grid items-start gap-4 md:grid-cols-3`. Cards keep their natural height; never stretch neighboring cards to fill decorative space.
- Put the primary interaction in one full-width `instrument-panel` below the summaries. Avoid narrow sidebars when they reduce the usable test surface.
- Do not duplicate information. If a recent-input, metric, or result card already communicates a value, do not add a second "Live Output" panel for the same data.
- Live summaries must react to the hardware being tested; avoid static guide cards that do not help users verify behavior.
- Use `panel-label`, `live-readout`, `metric-tile`, `readout-value`, and semantic status tokens to preserve the Instrument Panel visual language.
- Never introduce horizontal scrolling for a diagnostic control. Complex layouts must scale fluidly and remain usable at supported viewport widths.
- Never enter fullscreen, request Keyboard Lock, or trigger intrusive permission flows automatically. Permission and immersive-mode actions require an explicit user click and must be necessary for the test.
- Represent browser and OS limitations honestly. Do not count hardware-only controls such as laptop Fn as verified unless the browser actually emits a reliable event.
- Keep the app client-side unless backend work is explicitly requested. Hardware APIs and permissions vary by browser, OS, device, and secure-context rules.
- Statuses are `untested`, `working`, `issue`, and `unsupported`; they persist locally and are not synced.
- `src/components/ui/*` is the generated shadcn/Radix layer. Regenerate components through the shadcn workflow instead of hand-editing generated files; place product composition outside it.
- Adding a hardware test touches dashboard metadata in `src/pages/Dashboard.tsx`, `TestId` and `defaultResults` in `src/context/TestContext.tsx`, a page in `src/pages/tests/`, and a route in `src/App.tsx`. Also update `ResultsSummary.tsx` metadata so the result renders meaningfully.
- TanStack Query is configured but makes no real API calls.
- Preserve `minimumReleaseAge: 1440` in `pnpm-workspace.yaml`; it is an intentional supply-chain control.
- There is no automated test script. Use the full typecheck, a product build, and browser smoke testing appropriate to the hardware APIs changed.
