---
last_updated: 2026-08-25T04:28:05Z
status: active
---

# Project Context

## Project Overview

AI Revenue Recovery Agent — a fintech operations dashboard that detects failed payments, decides bounded
recovery interventions, executes a simulated Hinglish voice recovery flow, tracks promises to pay, and
reports honest batch-level recovery metrics with a full audit trail. Delivered as a React + Vite + TS web
app whose backend is an in-app typed service layer over deterministic synthetic data (72 seeded cases).

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-08-26 | Backend implemented as an in-app TypeScript service layer, not an Express process | Alex | Platform supports only the React + Vite template; the layer mirrors the REST surface, rules, bounds and reasoning strings exactly |
| 2026-08-26 | 72 deterministic cases seeded via fixed-seed PRNG with a replayed lifecycle history | Alex | App is immediately useful and metrics are reproducible across reloads |
| 2026-08-26 | Hidden ground-truth outcome stripped from every view object | Alex | Enables honest false-positive / unnecessary-escalation scoring without leaking answers to the operator |
| 2026-08-26 | Motion via CSS keyframes + rAF count-up instead of Framer Motion | Alex | Framer Motion is not in the template; CSS meets the 200–400ms ease-out, no-bounce fintech brief |

## Constraints

- Register: **Product** (fintech operations tool) — serious, data-dense, trustworthy. No playful or
  consumer aesthetics, no glassmorphism, no gradient text, no bounce/elastic easing.
- Color scheme: deep navy sidebar (`--sidebar-background` hsl 217 33% 17%, the #1E293B family) on dark;
  light neutral content background tinted toward hue 214; status colors — emerald for Recovered, amber
  for Pending/Retrying, red for Disputed/Escalated, slate for Unresolved.
- Typography: Inter (400/500/600/700), `font-variant-numeric: tabular-nums` on every numeric column.
- Components: rounded cards (`--radius: 0.625rem`) with `shadow-sm` only. Outline buttons must use
  `!bg-transparent hover:!bg-accent` so text never matches its background.
- Animation budget: summary cards fade-up staggered 50ms; timeline steps slide in from left; buttons
  scale down on press with a brief success pulse; metric cards count up over ~800ms. All 200–400ms
  ease-out, `prefers-reduced-motion` respected.
- Hard product bounds that must never be bypassed in the UI: max retry attempts, cooldown window
  between attempts, disputed accounts blocked from automated action, unverified extractions never
  entering the promise tracker.


