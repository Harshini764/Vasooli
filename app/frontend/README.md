**Vasooli**

**Bounded, verified, auditable revenue recovery — in the language your customers actually speak.**

Built for the Razorpay AI Buildathon — Track 3: AI Revenue Recovery.

Vasooli is a fintech operations dashboard that detects failed payments, decides the right recovery action under hard bounds, recovers money through a simulated Hinglish voice-call flow, verifies every customer commitment against the invoice on record, and reports honest batch-level metrics — including the cost of its own mistakes.

## What it does

1. **Detect** — every failed payment (insufficient funds, expired card, bank decline, unconfirmed mandate) is classified as retryable, genuine non-payment, or disputed, and scored for urgency from amount exposure + days overdue.
2. **Decide, under hard bounds** — a rule-based engine picks one action: retry, reminder, escalate to voice, or stop. Every case has a capped retry limit, a cooldown window between attempts, and disputed accounts are frozen from all automated action. No action runs unbounded.
3. **Recover, in Hinglish** — escalated cases get a simulated Hinglish voice-call transcript. Key facts — confirmed amount, promised date, reason for delay — are extracted from the conversation.
4. **Verify before trusting** — every extracted commitment is checked against the actual invoice amount before being accepted. A mismatch or an ambiguous figure is flagged **Unverified — needs review** and held back from the tracker rather than silently accepted. This is the same hallucination-guard pattern used in [MedScribeAI], applied to financial commitments instead of clinical ones.
5. **Track promises** — verified commitments are logged with a due date. If a promise is broken, the system automatically triggers the next bounded escalation step.
6. **Report honestly** — batch metrics include not just recovery rate and amount recovered, but **false-positive cost** (money spent on cases automation should never have acted on) and **unnecessary escalations** (voice calls that weren't actually what resolved the case). Every unresolved case ships with a one-line reason, not just a status badge.

Every single action — detection, retry, escalation, verification, a broken promise — is logged to an append-only audit trail with a structured reasoning string:

```
Insufficient funds (retryable) — attempt 2 of 3 — cooldown satisfied (last attempt 6h ago) — retry triggered — rule: retryable failures get up to 3 attempts with 4h cooldown
```

Nothing the system does is a black box — every decision states which rule fired and why.

## Architecture

Vasooli runs as a single-page React app. The recovery engine — decision logic, bounds, verification guard, promise tracker, audit trail, and batch metrics — lives in `src/services/recoveryEngine.ts` as an in-app service layer with a REST-shaped API surface (`getCases`, `getCase`, `postAction`, `getBatchReport`, `runBatch`, `getSettings`, `postSettings`), backed by a deterministic in-memory dataset seeded on load.

**This is a deliberate demo-scope choice, not an oversight:** for the buildathon, the engine runs client-side so the app requires zero setup and works immediately. In a production deployment, this same logic would move behind a real server so the bounds (retry limits, cooldowns, dispute freezes) are enforced outside the browser and can't be bypassed by whoever's holding the UI.

Ground-truth outcomes used for scoring are generated alongside each synthetic case but stripped from every response before it reaches the UI (`toView`), so the batch metrics are scored honestly against outcomes the UI never sees or could game.

## Tech stack

- React + TypeScript, built with Vite
- shadcn/ui + Radix primitives, Tailwind CSS
- TanStack Query for data fetching against the in-app service layer
- Zod for request/response validation (mirrors what a real REST layer would enforce)
- Recharts for the batch report outcome-mix chart

## Where things live

- `src/services/recoveryEngine.ts` — the entire recovery engine: case generation, classification, the bounded decision engine, simulated Hinglish voice recovery, the verification guard, promise tracking, audit trail, and batch metrics
- `src/pages/` — Dashboard, Cases, CaseDetail, BatchReports, Settings
- `src/components/recovery/` — case table, timeline, and recovery-area UI
- `src/components/ui/` — shared shadcn/ui primitives

## Running it

```bash
npm install
npm run dev
```

No database, API keys, or backend process required — the app seeds its own synthetic batch of failed-payment cases on load and is fully interactive immediately.

```bash
npm run build     # production build
npm run lint       # eslint
```

## Known limitations (by design, for this demo)

- The decision engine and audit trail run client-side; a production version would enforce bounds server-side.
- Hinglish call transcripts are generated from a fixed set of delay-reason templates with randomized extraction fidelity (exact match / rounded figure / ambiguous) so the verification guard has real work to do on every run — not yet backed by a live LLM call per case.
- State resets to the same deterministic seed on a full page reload.
