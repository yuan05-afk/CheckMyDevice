# CheckMyDevice Design System — put this at `.agents/skills/design-system/references/design.md`

This is the source of truth for CheckMyDevice's visual language ("Instrument Panel"). It's extracted directly from `artifacts/check-my-device/src/index.css` — the tokens below already exist in the codebase. Most current drift across the 9 test pages comes from components bypassing these tokens with raw Tailwind colors, not from the tokens being wrong or missing.

## Color tokens
All defined in `index.css` under `@theme inline`, with light/dark values in `:root` / `.dark`.

| Purpose | Token (CSS var) | Light | Dark |
|---|---|---|---|
| Background | `--background` | `#F7F8FA` | `#0F1118` |
| Ink/text | `--foreground` | `#14171C` | `#E7EBF0` |
| Card surface | `--card` | `#FFFFFF` | `#181C24` |
| Hairline/border | `--border`, `--color-hairline` | `#E4E7EB` | `#252A35` |
| Primary / signal accent | `--primary` | `#0F8B8D` | `#16A9AB` |
| **Status — pass** | `--color-status-pass` | `#2FA84F` | same |
| **Status — warn** | `--color-status-warn` | `#E8A33D` | same |
| **Status — fail** | `--color-status-fail` | `#D5473C` | same |
| **Status — idle** | `--color-status-idle` | `#9CA3AF` | same |

Because these live under `@theme inline` in Tailwind v4, they should already be usable as real utility classes: `bg-status-pass`, `text-status-pass`, `border-status-pass`, `bg-status-warn`, `text-status-warn`, `bg-status-fail`, `text-status-fail`, `bg-status-idle`, `text-status-idle` (plus opacity modifiers like `bg-status-pass/10`). **Verify this compiles** — if for any reason Tailwind doesn't pick them up, expose them explicitly with `@utility` in `index.css` rather than falling back to raw colors.

**Rule: never use raw Tailwind palette colors (`amber-600`, `emerald-600`, `emerald-500`, `red-500`, etc.) for pass/warn/fail/idle meaning, anywhere in the app.** Currently every one of the 9 test pages does this for the "Mark Issue" / "Mark Working" buttons, and `NetworkTest.tsx` additionally hardcodes `emerald-500`/`amber-500` for its online/offline icon. These should all resolve to the four status tokens above so a single palette change updates the whole app.

## Typography
- **Display** (`--font-display`: Space Grotesk) — page titles, hero headline. Not for body copy.
- **Sans** (`--font-sans`: Inter) — body text, descriptions, UI labels.
- **Mono** (`--font-mono`: IBM Plex Mono) — every piece of *data*: key codes, dB/percentage readouts, test IDs (`T-01`), status values, panel eyebrow labels (`LIVE OUTPUT`, `DIAGNOSTICS`, etc.). This is the single biggest signal that separates this product from a generic template — apply it consistently. `.spec-item` in `index.css` already encodes the correct style (mono, 0.65rem, 0.15em tracking, uppercase, muted color) for these labels — reuse that class instead of re-styling labels ad hoc per page.

## Shape, elevation, motion
- Radius scale: `--radius-sm/md/lg/xl`, base `--radius: 0.625rem`. Don't introduce one-off radii (e.g. `rounded-full` hero icons should be an intentional exception, not a default).
- Shadows: `--shadow-sm/md/lg` in light mode; dark mode intentionally drops shadows to `none` and relies on borders instead — preserve that split.
- Motion keyframes already defined: `trace-draw` (signal line drawing in), `trace-pulse`, `trace-scroll`, `led-pulse` (status LED pulse). Reuse these rather than inventing new easing/animation per page. `prefers-reduced-motion` is already globally handled — don't bypass it in new components.

## Component conventions (read before touching any test page)

**1. Shared header/action bar.** Every test page hand-duplicates the same block: back arrow → title → description → "Mark Issue"/"Mark Working" buttons. This should be one shared component (e.g. `TestPageHeader`) taking `testId`/`title`/`description` as props. Duplicating it 9 times is exactly why the status-color drift above happened — one file added extra hardcoded styling nobody else picked up.

**2. Hero state icon.** When a test is idle or awaiting permission, it shows a large icon inside a circle. Right now there are three different treatments in the codebase:
   - Camera / Microphone: `w-16 h-16 bg-primary/20 rounded-full` (64px, primary token) — **this is the correct pattern, standardize on it.**
   - Speaker: `w-28 h-28 bg-primary/10 rounded-full` (112px, different size and opacity)
   - Network: `w-28 h-28 rounded-full` with hardcoded `emerald-500`/`amber-500` (112px, bypasses tokens entirely)
   - Battery: `w-16 h-16 bg-secondary rounded-full` (64px, but muted instead of primary)

   Pick one size (recommend 64px, matching Camera/Microphone) and one color rule (primary for neutral/idle, status tokens for a definite pass/fail state) and apply it everywhere this pattern appears.

**3. Panel labels.** Content panels get a small mono uppercase eyebrow label (`INTERACTIVE LAYOUT`, `LIVE OUTPUT`, `DIAGNOSTICS`, `DETECTED ACTIONS`, etc.) using `.spec-item`. Camera and Microphone's main preview panel is missing this label — every other panel on every other page has one.

**4. Page-title naming.** Current titles mix conventions: "Keyboard Tester", "Camera", "Mouse & Trackpad", "Display & Color", "Sensors & Touch", "Speaker", "Battery", "Network", "Microphone". Pick one pattern (either all get a consistent suffix, or none do) and apply it across all 9 + the Dashboard card labels so they match.

**5. Vertical density.** Pages with little content (Battery, Network, Speaker currently) leave a large empty gap below a short card instead of using the available height. Either vertically center the content block in `<main>`, or add genuinely useful content (e.g. a small reading history) rather than stretching artificially.
