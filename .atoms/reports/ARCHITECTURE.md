---
last_updated: 2026-08-25T04:28:05Z
---

# Architecture Design

## System Overview

AI Revenue Recovery Agent — a fintech operations dashboard for failed-payment recovery. Because this
platform is a React + Vite web app and does not support a separate Express server process, the whole
"backend" runs as a typed TypeScript service layer inside the app. It exposes the exact API surface a
REST backend would (`getCases`, `getCase`, `postAction`, `getBatchReport`, `runBatch`, `getSettings`,
`postSettings`) over deterministic in-memory synthetic data, with the same rules, hard bounds and
structured reasoning strings.

Data flows one way: a seeded PRNG generates 72 cases on module load, a lifecycle replay applies bounded
automated steps so the app is useful on first paint, and every mutation appends an audit event. The UI
only reads `CaseView` objects, which strip the hidden ground-truth outcome before it leaves the service
layer — ground truth is used exclusively by batch scoring.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, react-router-dom v6, Zod (request/settings
validation), Recharts (donut chart), sonner (toasts), lucide-react (icons). Animation is CSS keyframes
in `src/index.css` (Framer Motion not required — all motion is 200–400ms ease-out with no overshoot).

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Service layer ("backend") | Synthetic generator, classification, urgency scoring, bounded decision engine, Hinglish voice simulation, verification guard, promise tracker, audit trail, batch metrics, live settings | `src/services/recoveryEngine.ts` |
| App shell | Deep-navy sidebar nav, sticky header, mobile nav fallback | `src/components/recovery/AppShell.tsx` |
| Shared UI atoms | Status/classification/promise badges, urgency meter, count-up animation | `src/components/recovery/shared.tsx` |
| Case table | Sortable + filterable dense table, row → detail navigation, paging | `src/components/recovery/CaseTable.tsx` |
| Dashboard | 4 summary cards (staggered fade-up + count-up) plus the recovery queue | `src/pages/Index.tsx` |
| Cases | Full queue view reusing the table at a larger page size | `src/pages/Cases.tsx` |
| Case detail | Header facts, bounded action buttons with tooltips, audit timeline, promise card, collapsible Hinglish transcript | `src/pages/CaseDetail.tsx` |
| Batch report | Headline + 3 explained diagnostic metric cards, donut chart, results table, exceptions table, CSV/JSON export, Run Batch | `src/pages/BatchReports.tsx` |
| Settings | Editable retry limit / cooldown / escalation threshold wired into the live engine | `src/pages/SettingsPage.tsx` |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend process | In-app TypeScript service layer instead of Express | Platform supports only the React + Vite template; the service layer mirrors the REST surface 1:1 so rules and reasoning strings stay identical |
| Determinism | `mulberry32` PRNG with a fixed seed | Same 72 cases and same lifecycle history on every reload, so metrics are reproducible |
| Ground truth | Stored on the case, stripped in `toView` | Lets batch metrics score honestly (false positives, unnecessary escalations) without leaking the answer to the operator UI |
| Decision engine | Single `decide()` reading live `Settings` on every call | Guarantees the Settings page actually changes behaviour rather than just displaying values |
| Verification guard | Compare extracted amount to invoice; only exact matches enter the tracker | Prevents silently accepting hallucinated or ambiguous commitments |
| Animation | CSS keyframes + rAF count-up | Framer Motion is not in the template; CSS meets the 200–400ms ease-out, no-bounce fintech brief with zero extra bundle weight |
| Chart | Recharts donut (pre-installed) | Avoids adding a dependency for one outcome-mix visual |

## File Tree Plan

```
app/frontend/src
├── App.tsx                                  # routes: / /cases /cases/:id /batch-reports /settings
├── index.css                                # navy/neutral fintech tokens, Inter, motion keyframes
├── services/recoveryEngine.ts               # the entire backend service layer
├── components/recovery/AppShell.tsx
├── components/recovery/shared.tsx
├── components/recovery/CaseTable.tsx
└── pages/{Index,Cases,CaseDetail,BatchReports,SettingsPage}.tsx
```

## Implementation Guide

- Reasoning string format is fixed everywhere:
  `[failure] ([classification]) — attempt [N] of [max] — [cooldown status] — [action] — rule: [rule]`,
  produced only by `buildReasoning()`. Never hand-write one.
- Hard bounds live in `decide()` and are re-checked in `getActionAvailability()`; `postAction` refuses
  any action whose availability entry is disabled, so the UI and engine cannot disagree.
- Every mutation must call `pushAudit()`. Broken promises are detected by `sweepPromises()`, which runs
  on each read and immediately applies the next bounded step.
- Batch metrics deliberately report the agent's own mistakes: `falsePositiveCost` counts spend on
  genuine non-payment / disputed cases, `unnecessaryEscalations` counts voice calls on cases that then
  settled on attempt 1.
- Outline buttons use `!bg-transparent hover:!bg-accent` to keep contrast correct.

