---
last_updated: 2026-08-25T04:28:05Z
---

# Requirements & Progress

## Requirements Overview

Build an AI Revenue Recovery Agent: detect failed payments, classify them, apply a bounded rule-based
decision engine, simulate Hinglish voice recovery with a verification guard, track promises to pay,
expose a full audit trail, report honest batch metrics, and let live settings drive the engine — all
behind a fintech dashboard (Dashboard / Cases / Batch Reports / Settings).

## User Stories

- As a recovery operator I see amount at risk, amount recovered, recovery rate and active case count at
  a glance, then drill into any case from a sortable, filterable queue.
- As an operator I open a case and read a chronological audit trail where every step shows the exact
  rule that triggered it.
- As an operator I only trust a promise to pay when the extracted amount verified against the invoice;
  unverified extractions are visibly flagged and never recorded.
- As an operator I cannot retry past the bound, retry during cooldown, or act on a disputed account, and
  a tooltip tells me precisely why the button is disabled.
- As a revenue lead I read batch metrics that include the agent's own mistakes (false-positive cost,
  unnecessary escalations) and export the report as CSV or JSON.
- As an admin I change the retry limit, cooldown window and escalation threshold and see the engine's
  decisions change immediately.

## Task Breakdown
| ID | Task | Assignee | Status | Deps |
|----|------|----------|--------|------|

- [x] Deterministic synthetic generator — 72 cases, Indian names, INR amounts, hidden ground truth
- [x] Detection, classification (retryable / genuine non-payment / disputed) and urgency scoring
- [x] Bounded decision engine with retry limit, cooldown and disputed block, emitting structured reasoning strings
- [x] Simulated Hinglish voice recovery with amount / promised date / delay-reason extraction
- [x] Verification hallucination guard against the invoice amount on record
- [x] Promise-to-pay tracker with auto escalation on broken promises
- [x] Append-only per-case audit trail exposed chronologically
- [x] Batch metrics incl. false-positive cost and unnecessary escalations
- [x] Live settings read by the engine on every decision
- [x] Fintech design foundation — navy sidebar, neutral content, Inter, status colors, motion keyframes
- [x] Dashboard with 4 animated summary cards and the sortable/filterable case table
- [x] Case detail — header facts, audit timeline, promise card, collapsible transcript, bounded actions with tooltips
- [x] Batch report page — donut chart, results table, 3 explained metric cards, CSV/JSON export, Run Batch
- [x] Settings page wired to the live engine
- [x] Lint + production build pass

## Progress Log

- 2026-08-26 Alex: Initialized React + Vite + shadcn/ui template (no separate Express process available).
- 2026-08-26 Alex: Implemented the full recovery service layer in `src/services/recoveryEngine.ts`.
- 2026-08-26 Alex: Applied the fintech theme (navy sidebar, Inter, tabular numerals, ease-out motion).
- 2026-08-26 Alex: Built Dashboard, Cases, Case detail, Batch Reports and Settings pages with routing.
- 2026-08-26 Alex: `pnpm run lint` and `pnpm run build` both pass (2755 modules, prerender OK).

