---
name: design-system
description: Use whenever creating or editing any UI in CheckMyDevice â€” new pages, test modules, components, or visual changes. Covers the color tokens, typography, and component conventions the app must stay consistent with. Load references/design.md for the full token tables before writing or restyling any component.
---

# CheckMyDevice design system

Put this file at `.agents/skills/design-system/SKILL.md` (Codex's skills directory convention â€” double-check this path against your Codex version's current docs, it has moved before). Put the companion reference at `.agents/skills/design-system/references/design.md`.

CheckMyDevice's visual identity is "Instrument Panel" â€” a diagnostics tool that looks like real test equipment (signal-trace motif, monospace data readouts, a functional status-color system), not a generic SaaS template. The tokens for all of this already exist in `artifacts/check-my-device/src/index.css`.

## Non-negotiable rules
1. **Never use raw Tailwind palette colors** (`amber-600`, `emerald-500`, `red-500`, etc.) to mean pass/warn/fail/idle. Always use the semantic tokens: `status-pass`, `status-warn`, `status-fail`, `status-idle`. See `references/design.md` for exact values and current violations to fix.
2. **Monospace is reserved for data** â€” test IDs, key codes, percentages, readouts, panel eyebrow labels. Headlines use the display font; body copy uses the sans font. Don't mix these up.
3. **Reuse existing shared components before writing new markup.** If you're about to copy a header, action-bar, or hero-icon block from another test page, stop â€” extract or reuse a shared component instead. Duplicated markup is exactly how this app's styling has drifted so far.
4. **Match, don't reinvent.** Before styling something new, check how the same kind of element (panel label, hero icon, status badge) is already done elsewhere in the app and copy that pattern rather than inventing a new one.

Read `references/design.md` in full before making any visual change â€” it has the complete color/type/motion token tables and a list of currently known inconsistencies across the 9 test pages.

