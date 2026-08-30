/**
 * AI Revenue Recovery Agent — in-app backend service layer.
 *
 * This module replaces a separate Express process. It owns:
 *  - deterministic synthetic data generation (seeded on module load)
 *  - failure detection + classification + urgency scoring
 *  - a bounded, rule-based decision engine with hard bounds
 *  - simulated Hinglish voice recovery + extraction
 *  - a verification (hallucination) guard
 *  - promise-to-pay tracking with auto escalation on broken promises
 *  - an append-only audit trail per case
 *  - batch-level honest metrics
 *  - live settings that the decision engine actually reads
 *
 * The exported `recoveryApi` mirrors the REST surface 1:1:
 *   GET  /api/cases          -> recoveryApi.getCases(filters)
 *   GET  /api/cases/:id      -> recoveryApi.getCase(id)
 *   POST /api/cases/:id/action -> recoveryApi.postAction(id, body)
 *   GET  /api/batch-report   -> recoveryApi.getBatchReport()
 *   POST /api/batch-report/run -> recoveryApi.runBatch()
 *   GET  /api/settings       -> recoveryApi.getSettings()
 *   POST /api/settings       -> recoveryApi.postSettings(body)
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export const FAILURE_REASONS = [
  'Insufficient funds',
  'Card expired',
  'Bank declined',
  'Mandate not confirmed',
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export const CASE_STATUSES = [
  'Pending',
  'Retrying',
  'Escalated',
  'Recovered',
  'Disputed',
  'Unresolved',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export type Classification = 'retryable' | 'genuine non-payment' | 'disputed';

export type PaymentMethod = 'UPI Autopay' | 'Card' | 'NACH Mandate' | 'Net Banking';

/** Engine-decidable actions (bounded set). */
export type EngineAction = 'retry' | 'reminder' | 'escalate' | 'stop';
/** Operator-triggerable actions from the UI. */
export type OperatorAction = 'retry' | 'escalate' | 'resolve' | 'stop';

export type AuditEventType =
  | 'detection'
  | 'retry'
  | 'reminder'
  | 'escalation'
  | 'verification'
  | 'promise_made'
  | 'promise_broken'
  | 'promise_kept'
  | 'recovered'
  | 'blocked'
  | 'stop';

export interface AuditEvent {
  id: string;
  at: string;
  type: AuditEventType;
  action: string;
  reasoning: string;
}

export interface TranscriptLine {
  speaker: 'Agent' | 'Customer';
  text: string;
}

export interface ExtractedFields {
  amountConfirmed: number | null;
  amountPhrase: string;
  promisedDate: string | null;
  promisedDatePhrase: string;
  reasonForDelay: string;
}

export interface Verification {
  status: 'Verified' | 'Unverified — needs review';
  note: string;
  invoiceAmount: number;
}

export interface CallTranscript {
  id: string;
  at: string;
  durationSeconds: number;
  lines: TranscriptLine[];
  extracted: ExtractedFields;
  verification: Verification;
}

export type PromiseStatus = 'Pending' | 'Kept' | 'Broken';

export interface PromiseToPay {
  id: string;
  amount: number;
  promisedDate: string;
  createdAt: string;
  status: PromiseStatus;
  verified: boolean;
  verificationNote: string;
}

export interface GroundTruth {
  /** Hidden outcome used only for honest scoring, never shown as a prediction. */
  outcome: 'will_pay' | 'will_not_pay' | 'disputed';
  /** For `will_pay`, the attempt number on which the payment actually clears. */
  paysOnAttempt: number;
}

export interface RecoveryCase {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string;
  paymentMethod: PaymentMethod;
  failureReason: FailureReason;
  classification: Classification;
  urgencyScore: number;
  status: CaseStatus;
  attempts: number;
  lastAttemptAt: string | null;
  escalatedToVoice: boolean;
  resolvedOnAttempt: number | null;
  unresolvedReason: string | null;
  /** Hidden from the operator UI; used by batch scoring only. */
  groundTruth: GroundTruth;
  audit: AuditEvent[];
  transcript: CallTranscript | null;
  promise: PromiseToPay | null;
}

export interface Settings {
  retryLimit: number;
  cooldownHours: number;
  escalationThreshold: number;
}

export interface Decision {
  action: EngineAction;
  classification: Classification;
  attemptLabel: string;
  cooldownStatus: string;
  actionTaken: string;
  rule: string;
  reasoning: string;
}

export interface ActionAvailability {
  action: OperatorAction;
  label: string;
  enabled: boolean;
  reason: string;
}

export interface BatchReport {
  generatedAt: string;
  totalCases: number;
  totalAtRisk: number;
  amountRecovered: number;
  recoveryRatePct: number;
  recoveredCount: number;
  avgAttemptsPerRecovery: number;
  falsePositiveCost: number;
  falsePositiveCount: number;
  unnecessaryEscalations: number;
  unnecessaryEscalationAmount: number;
  outcomeMix: { status: CaseStatus; count: number; amount: number }[];
  exceptions: { id: string; customerName: string; amount: number; status: CaseStatus; reason: string }[];
  settingsUsed: Settings;
}

/* ------------------------------------------------------------------ */
/* Validation schemas (mirrors what an Express layer would validate)   */
/* ------------------------------------------------------------------ */

export const actionSchema = z.object({
  action: z.enum(['retry', 'escalate', 'resolve', 'stop']),
});

export const settingsSchema = z.object({
  retryLimit: z.number().int().min(1).max(6),
  cooldownHours: z.number().int().min(1).max(72),
  escalationThreshold: z.number().int().min(10).max(95),
});

export const caseFilterSchema = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  minUrgency: z.number().min(0).max(100).optional(),
  search: z.string().optional(),
});
export type CaseFilters = z.infer<typeof caseFilterSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Deterministic PRNG so every reload produces the identical dataset. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatCompactINR(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return formatINR(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hinglishDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

export function daysOverdue(c: { dueDate: string }, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(c.dueDate).getTime()) / DAY));
}

function hoursSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  return (now - new Date(iso).getTime()) / HOUR;
}

function humanHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

const TERMINAL: CaseStatus[] = ['Recovered', 'Unresolved', 'Disputed'];
function isTerminal(c: Pick<RecoveryCase, 'status'>): boolean {
  return TERMINAL.includes(c.status);
}

/* ------------------------------------------------------------------ */
/* Detection & classification                                         */
/* ------------------------------------------------------------------ */

function classify(reason: FailureReason, disputeRaised: boolean): Classification {
  if (disputeRaised) return 'disputed';
  // Bank-side, transient balance problems are worth retrying.
  if (reason === 'Insufficient funds' || reason === 'Bank declined') return 'retryable';
  // Expired card / unconfirmed mandate need customer action — retrying cannot fix them.
  return 'genuine non-payment';
}

/** Urgency = 60% amount exposure + 40% ageing, clamped to 0..100. */
function scoreUrgency(amount: number, overdueDays: number): number {
  const amountComponent = Math.min(60, (amount / 60_000) * 60);
  const ageComponent = Math.min(40, (overdueDays / 45) * 40);
  return Math.round(Math.min(100, amountComponent + ageComponent));
}

function methodForReason(reason: FailureReason, r: number): PaymentMethod {
  if (reason === 'Card expired') return 'Card';
  if (reason === 'Mandate not confirmed') return r < 0.5 ? 'NACH Mandate' : 'UPI Autopay';
  if (reason === 'Bank declined') return r < 0.5 ? 'Net Banking' : 'Card';
  return r < 0.6 ? 'UPI Autopay' : 'NACH Mandate';
}

/* ------------------------------------------------------------------ */
/* Bounded decision engine                                            */
/* ------------------------------------------------------------------ */

function cooldownState(c: Pick<RecoveryCase, 'lastAttemptAt'>, s: Settings, now: number) {
  const elapsed = hoursSince(c.lastAttemptAt, now);
  if (elapsed === null) {
    return { satisfied: true, label: 'no prior attempt', remaining: 0 };
  }
  if (elapsed >= s.cooldownHours) {
    return {
      satisfied: true,
      label: `cooldown satisfied (last attempt ${humanHours(elapsed)} ago)`,
      remaining: 0,
    };
  }
  return {
    satisfied: false,
    label: `cooldown active (${humanHours(elapsed)} of ${s.cooldownHours}h elapsed)`,
    remaining: s.cooldownHours - elapsed,
  };
}

function buildReasoning(
  classification: Classification,
  failureReason: FailureReason,
  attemptLabel: string,
  cooldownStatus: string,
  actionTaken: string,
  rule: string,
): string {
  return `${failureReason} (${classification}) — ${attemptLabel} — ${cooldownStatus} — ${actionTaken} — rule: ${rule}`;
}

/**
 * The single source of truth for automated behaviour. Reads live settings on
 * every call so the Settings page genuinely changes engine behaviour.
 */
type DecidableCase = Pick<
  RecoveryCase,
  'attempts' | 'lastAttemptAt' | 'classification' | 'failureReason' | 'urgencyScore' | 'escalatedToVoice' | 'status'
>;

export function decide(c: DecidableCase, s: Settings, now = Date.now()): Decision {
  const cd = cooldownState(c, s, now);
  const nextAttempt = Math.min(c.attempts + 1, s.retryLimit);
  const cls = c.classification;

  const make = (
    action: EngineAction,
    attemptLabel: string,
    actionTaken: string,
    rule: string,
  ): Decision => ({
    action,
    classification: cls,
    attemptLabel,
    cooldownStatus: cd.label,
    actionTaken,
    rule,
    reasoning: buildReasoning(cls, c.failureReason, attemptLabel, cd.label, actionTaken, rule),
  });

  const currentLabel = `attempt ${c.attempts} of ${s.retryLimit}`;
  const nextLabel = `attempt ${nextAttempt} of ${s.retryLimit}`;

  // Hard bound 1 — disputed accounts are frozen for automation.
  if (cls === 'disputed') {
    return make(
      'stop',
      currentLabel,
      'automated action blocked',
      'disputed accounts are blocked from all automated action until the chargeback is settled',
    );
  }

  // Hard bound 2 — retry budget exhausted.
  if (c.attempts >= s.retryLimit) {
    if (c.urgencyScore >= s.escalationThreshold && !c.escalatedToVoice) {
      return make(
        'escalate',
        currentLabel,
        'escalated to voice recovery',
        `retry budget of ${s.retryLimit} exhausted and urgency ${c.urgencyScore} ≥ escalation threshold ${s.escalationThreshold}`,
      );
    }
    return make(
      'stop',
      currentLabel,
      'automation stopped, routed to manual review',
      `max retry attempts reached ${c.attempts}/${s.retryLimit}, no further automated action permitted`,
    );
  }

  if (cls === 'genuine non-payment') {
    if (c.attempts === 0) {
      return make(
        'retry',
        nextLabel,
        'single confirmation retry triggered',
        'genuine non-payment gets exactly one confirmation retry before switching to reminders',
      );
    }
    if (c.urgencyScore >= s.escalationThreshold && !c.escalatedToVoice) {
      return make(
        'escalate',
        currentLabel,
        'escalated to voice recovery',
        `genuine non-payment with urgency ${c.urgencyScore} ≥ threshold ${s.escalationThreshold} needs a human commitment, not more retries`,
      );
    }
    return make(
      'reminder',
      currentLabel,
      'reminder queued, retries suppressed',
      'genuine non-payment below escalation threshold receives reminders only — retrying cannot fix an expired instrument',
    );
  }

  // retryable
  if (c.urgencyScore >= s.escalationThreshold + 15 && c.attempts === 0 && !c.escalatedToVoice) {
    return make(
      'escalate',
      currentLabel,
      'escalated to voice recovery ahead of first retry',
      `urgency ${c.urgencyScore} exceeds threshold ${s.escalationThreshold} by more than 15 points, high-exposure cases go to voice first`,
    );
  }
  if (c.urgencyScore >= s.escalationThreshold && c.attempts >= 1 && !c.escalatedToVoice) {
    return make(
      'escalate',
      currentLabel,
      'escalated to voice recovery',
      `retryable failure still open after ${c.attempts} attempt(s) with urgency ${c.urgencyScore} ≥ threshold ${s.escalationThreshold}`,
    );
  }
  if (!cd.satisfied) {
    return make(
      'reminder',
      currentLabel,
      'retry suppressed by cooldown, reminder queued',
      `retryable failures wait ${s.cooldownHours}h between attempts, ${humanHours(cd.remaining)} remaining`,
    );
  }
  return make(
    'retry',
    nextLabel,
    'retry triggered',
    `retryable failures get up to ${s.retryLimit} attempts with ${s.cooldownHours}h cooldown`,
  );
}

/** What the operator is allowed to click, and exactly why not. */
export function getActionAvailability(
  c: DecidableCase,
  s: Settings,
  now = Date.now(),
): ActionAvailability[] {
  const cd = cooldownState(c, s, now);
  const out: ActionAvailability[] = [];

  const terminalReason =
    c.status === 'Recovered'
      ? 'Case already recovered — no further action needed'
      : c.status === 'Unresolved'
        ? 'Case exited automation — requires manual review'
        : c.status === 'Disputed'
          ? `Disputed account — automated action blocked (${c.failureReason})`
          : '';

  // Retry
  if (terminalReason) {
    out.push({ action: 'retry', label: 'Retry', enabled: false, reason: terminalReason });
  } else if (c.classification === 'disputed') {
    out.push({
      action: 'retry',
      label: 'Retry',
      enabled: false,
      reason: 'Disputed classification — retries blocked by bound',
    });
  } else if (c.attempts >= s.retryLimit) {
    out.push({
      action: 'retry',
      label: 'Retry',
      enabled: false,
      reason: `Max retries reached ${c.attempts}/${s.retryLimit} — requires manual review`,
    });
  } else if (!cd.satisfied) {
    out.push({
      action: 'retry',
      label: 'Retry',
      enabled: false,
      reason: `Cooldown active — next retry allowed in ${humanHours(cd.remaining)} (window ${s.cooldownHours}h)`,
    });
  } else {
    out.push({
      action: 'retry',
      label: 'Retry',
      enabled: true,
      reason: `Attempt ${c.attempts + 1} of ${s.retryLimit} — ${cd.label}`,
    });
  }

  // Escalate
  if (terminalReason) {
    out.push({ action: 'escalate', label: 'Escalate to voice', enabled: false, reason: terminalReason });
  } else if (c.escalatedToVoice) {
    out.push({
      action: 'escalate',
      label: 'Escalate to voice',
      enabled: false,
      reason: 'Voice recovery already executed — transcript on record',
    });
  } else if (c.urgencyScore < s.escalationThreshold) {
    out.push({
      action: 'escalate',
      label: 'Escalate to voice',
      enabled: false,
      reason: `Urgency ${c.urgencyScore} below escalation threshold ${s.escalationThreshold}`,
    });
  } else {
    out.push({
      action: 'escalate',
      label: 'Escalate to voice',
      enabled: true,
      reason: `Urgency ${c.urgencyScore} ≥ threshold ${s.escalationThreshold}`,
    });
  }

  // Resolve
  out.push({
    action: 'resolve',
    label: 'Mark recovered',
    enabled: c.status !== 'Recovered',
    reason:
      c.status === 'Recovered'
        ? 'Already recovered'
        : 'Confirms funds landed and closes the case as recovered',
  });

  // Stop
  out.push({
    action: 'stop',
    label: 'Stop automation',
    enabled: !isTerminal(c),
    reason: isTerminal(c)
      ? `Case is already ${c.status.toLowerCase()} — automation is stopped`
      : 'Removes the case from automated recovery and flags it for manual review',
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Simulated Hinglish voice recovery + verification guard             */
/* ------------------------------------------------------------------ */

interface DelayReason {
  key: string;
  hinglish: string;
  english: string;
}

const DELAY_REASONS: DelayReason[] = [
  { key: 'salary', hinglish: 'salary credit late ho gayi is month', english: 'Salary credited late this month' },
  { key: 'medical', hinglish: 'ghar mein medical emergency aa gayi thi', english: 'Family medical emergency' },
  { key: 'card', hinglish: 'card expire ho gaya hai, naya card abhi aaya nahi', english: 'Card expired, replacement not received' },
  { key: 'mandate', hinglish: 'bank ne mandate confirm hi nahi kiya', english: 'Bank never confirmed the mandate' },
  { key: 'travel', hinglish: 'main out of station tha, notification miss kar diya', english: 'Customer was travelling and missed notifications' },
  { key: 'business', hinglish: 'client ka payment atka hua hai, cashflow tight hai', english: 'Downstream client payment delayed, cashflow tight' },
];

function buildTranscript(
  c: RecoveryCase,
  now: number,
  rand: () => number,
): CallTranscript {
  const reason =
    c.failureReason === 'Card expired'
      ? DELAY_REASONS[2]
      : c.failureReason === 'Mandate not confirmed'
        ? DELAY_REASONS[3]
        : DELAY_REASONS[Math.floor(rand() * DELAY_REASONS.length)];

  const promisedDays = 2 + Math.floor(rand() * 6);
  const promisedIso = new Date(now + promisedDays * DAY).toISOString();
  const firstName = c.customerName.split(' ')[0];

  // Deterministically choose one of three extraction fidelities so the
  // verification guard has real work to do.
  const roll = rand();
  let amountConfirmed: number | null = c.amount;
  let amountPhrase = `pura ${formatINR(c.amount)}`;
  if (roll < 0.16) {
    // Customer quotes a rounded / wrong figure.
    amountConfirmed = Math.round((c.amount * 0.82) / 100) * 100;
    amountPhrase = `around ${formatINR(amountConfirmed)}`;
  } else if (roll < 0.27) {
    // Ambiguous — no number at all.
    amountConfirmed = null;
    amountPhrase = 'jitna bhi outstanding hai woh clear kar dunga';
  }

  const lines: TranscriptLine[] = [
    {
      speaker: 'Agent',
      text: `Namaste ${firstName} ji, main Recovery Desk se baat kar raha hoon. Aapka ${c.paymentMethod} payment of ${formatINR(
        c.amount,
      )} ${hinglishDate(c.dueDate)} ko fail ho gaya tha — reason tha "${c.failureReason}". Ek minute baat kar sakte hain?`,
    },
    {
      speaker: 'Customer',
      text: `Haan ji boliye. Mujhe SMS mila tha but main check nahi kar paya. Actually ${reason.hinglish}.`,
    },
    {
      speaker: 'Agent',
      text: `Bilkul samajh sakta hoon sir. Koi late fee abhi tak nahi lagi hai. Aap bata dijiye, realistically kab tak payment ho jayega?`,
    },
    {
      speaker: 'Customer',
      text: `Dekhiye, ${hinglishDate(promisedIso)} tak main ${amountPhrase} kar dunga. Uske pehle possible nahi hai.`,
    },
    {
      speaker: 'Agent',
      text: `Theek hai ${firstName} ji, main ${hinglishDate(
        promisedIso,
      )} ki promise-to-pay note kar raha hoon. Amount main apne records se cross-check kar lunga, aur aapko payment link WhatsApp par bhej deta hoon.`,
    },
    {
      speaker: 'Customer',
      text: `Haan link bhej dijiye, main us din hi kar dunga. Dhanyavaad.`,
    },
  ];

  const matches = amountConfirmed !== null && Math.abs(amountConfirmed - c.amount) < 1;
  const verification: Verification = matches
    ? {
        status: 'Verified',
        note: `Extracted commitment ${formatINR(amountConfirmed as number)} matches invoice ${formatINR(
          c.amount,
        )} on record.`,
        invoiceAmount: c.amount,
      }
    : {
        status: 'Unverified — needs review',
        note:
          amountConfirmed === null
            ? `Customer never stated a figure ("${amountPhrase}"). Nothing was accepted into the promise tracker.`
            : `Extracted ${formatINR(amountConfirmed)} does not match invoice ${formatINR(
                c.amount,
              )} (delta ${formatINR(Math.abs(c.amount - amountConfirmed))}). Commitment held back for human review.`,
        invoiceAmount: c.amount,
      };

  return {
    id: `tr_${c.id}`,
    at: new Date(now).toISOString(),
    durationSeconds: 95 + Math.floor(rand() * 130),
    lines,
    extracted: {
      amountConfirmed,
      amountPhrase,
      promisedDate: promisedIso,
      promisedDatePhrase: hinglishDate(promisedIso),
      reasonForDelay: reason.english,
    },
    verification,
  };
}

/* ------------------------------------------------------------------ */
/* Mutation primitives (each one writes the audit trail)              */
/* ------------------------------------------------------------------ */

let auditSeq = 0;
function pushAudit(
  c: RecoveryCase,
  type: AuditEventType,
  action: string,
  reasoning: string,
  now: number,
): void {
  auditSeq += 1;
  c.audit.push({
    id: `ev_${auditSeq}`,
    at: new Date(now).toISOString(),
    type,
    action,
    reasoning,
  });
}

function markRecovered(c: RecoveryCase, s: Settings, now: number, note: string): void {
  c.status = 'Recovered';
  c.resolvedOnAttempt = Math.max(1, c.attempts);
  c.unresolvedReason = null;
  if (c.promise && c.promise.status === 'Pending') {
    c.promise.status = 'Kept';
    pushAudit(
      c,
      'promise_kept',
      'Promise-to-pay kept',
      buildReasoning(
        c.classification,
        c.failureReason,
        `attempt ${c.attempts} of ${s.retryLimit}`,
        'promise window honoured',
        `customer paid ${formatINR(c.promise.amount)} as committed`,
        'a kept promise closes the tracker entry and stops all further escalation',
      ),
      now,
    );
  }
  pushAudit(
    c,
    'recovered',
    `Recovered ${formatINR(c.amount)}`,
    buildReasoning(
      c.classification,
      c.failureReason,
      `attempt ${c.resolvedOnAttempt} of ${s.retryLimit}`,
      'no cooldown needed',
      note,
      'settlement confirmed against the invoice, case closed as recovered',
    ),
    now,
  );
}

function markUnresolved(c: RecoveryCase, s: Settings, now: number, reason: string, decision?: Decision): void {
  c.status = 'Unresolved';
  c.unresolvedReason = reason;
  pushAudit(
    c,
    'stop',
    'Automation stopped',
    decision?.reasoning ??
      buildReasoning(
        c.classification,
        c.failureReason,
        `attempt ${c.attempts} of ${s.retryLimit}`,
        'bound reached',
        'automation stopped',
        reason,
      ),
    now,
  );
}

function executeRetry(c: RecoveryCase, s: Settings, now: number, decision: Decision): void {
  c.attempts += 1;
  c.lastAttemptAt = new Date(now).toISOString();
  c.status = 'Retrying';
  pushAudit(c, 'retry', `Retry attempt ${c.attempts} on ${c.paymentMethod}`, decision.reasoning, now);

  const gt = c.groundTruth;
  if (gt.outcome === 'will_pay' && c.attempts >= gt.paysOnAttempt) {
    markRecovered(c, s, now, `retry attempt ${c.attempts} cleared successfully`);
    return;
  }
  if (c.attempts >= s.retryLimit) {
    const nextByRule = decide(c, s, now);
    if (nextByRule.action === 'escalate') return; // leave open for escalation on next pass
    markUnresolved(
      c,
      s,
      now,
      `Retry budget ${c.attempts}/${s.retryLimit} exhausted without settlement`,
      nextByRule,
    );
  }
}

function executeReminder(c: RecoveryCase, now: number, decision: Decision): void {
  if (c.status === 'Pending' || c.status === 'Retrying') {
    c.status = c.attempts > 0 ? 'Retrying' : 'Pending';
  }
  pushAudit(c, 'reminder', 'Reminder queued (SMS + WhatsApp)', decision.reasoning, now);
}

function executeEscalation(
  c: RecoveryCase,
  s: Settings,
  now: number,
  decision: Decision,
  rand: () => number,
): void {
  c.escalatedToVoice = true;
  c.status = 'Escalated';
  pushAudit(c, 'escalation', 'Escalated to Hinglish voice recovery', decision.reasoning, now);

  const transcript = buildTranscript(c, now, rand);
  c.transcript = transcript;

  const verified = transcript.verification.status === 'Verified';
  pushAudit(
    c,
    'verification',
    `Extraction ${transcript.verification.status}`,
    buildReasoning(
      c.classification,
      c.failureReason,
      `attempt ${c.attempts} of ${s.retryLimit}`,
      'verification guard executed',
      verified
        ? `promised ${formatINR(transcript.extracted.amountConfirmed as number)} verified against invoice`
        : 'commitment withheld from tracker',
      `hallucination guard: extracted amount must equal the invoice on record — ${transcript.verification.note}`,
    ),
    now,
  );

  if (verified && transcript.extracted.promisedDate) {
    c.promise = {
      id: `pr_${c.id}`,
      amount: transcript.extracted.amountConfirmed as number,
      promisedDate: transcript.extracted.promisedDate,
      createdAt: new Date(now).toISOString(),
      status: 'Pending',
      verified: true,
      verificationNote: transcript.verification.note,
    };
    pushAudit(
      c,
      'promise_made',
      `Promise-to-pay recorded: ${formatINR(c.promise.amount)} by ${formatDate(c.promise.promisedDate)}`,
      buildReasoning(
        c.classification,
        c.failureReason,
        `attempt ${c.attempts} of ${s.retryLimit}`,
        'promise window open',
        `commitment stored with due date ${formatDate(c.promise.promisedDate)}`,
        'only verified commitments enter the promise-to-pay tracker',
      ),
      now,
    );
  }
}

/** One bounded automated step, driven purely by `decide`. */
function applyAutomatedStep(
  c: RecoveryCase,
  s: Settings,
  now: number,
  rand: () => number,
): Decision | null {
  if (isTerminal(c)) return null;
  const decision = decide(c, s, now);
  switch (decision.action) {
    case 'retry':
      executeRetry(c, s, now, decision);
      break;
    case 'reminder':
      executeReminder(c, now, decision);
      break;
    case 'escalate':
      executeEscalation(c, s, now, decision, rand);
      break;
    case 'stop':
      markUnresolved(c, s, now, decision.rule, decision);
      break;
  }
  return decision;
}

/* ------------------------------------------------------------------ */
/* Promise sweep — broken promises trigger the next bounded step       */
/* ------------------------------------------------------------------ */

function sweepPromises(state: EngineState, now: number): number {
  let broken = 0;
  for (const c of state.cases) {
    const p = c.promise;
    if (!p || p.status !== 'Pending') continue;
    if (new Date(p.promisedDate).getTime() >= now) continue;
    if (c.status === 'Recovered') {
      p.status = 'Kept';
      continue;
    }
    p.status = 'Broken';
    broken += 1;
    pushAudit(
      c,
      'promise_broken',
      `Promise broken: ${formatINR(p.amount)} not received by ${formatDate(p.promisedDate)}`,
      buildReasoning(
        c.classification,
        c.failureReason,
        `attempt ${c.attempts} of ${state.settings.retryLimit}`,
        'promise window expired',
        'next bounded escalation step triggered automatically',
        'a broken promise-to-pay immediately advances the case to the next bounded action',
      ),
      now,
    );
    applyAutomatedStep(c, state.settings, now, state.rand);
  }
  return broken;
}

/* ------------------------------------------------------------------ */
/* Deterministic synthetic data generator                             */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Aarav', 'Rohan', 'Priya', 'Neha', 'Vikram', 'Ananya', 'Karthik', 'Sneha',
  'Rahul', 'Meera', 'Arjun', 'Divya', 'Siddharth', 'Pooja', 'Nikhil', 'Kavya',
  'Manish', 'Ritika', 'Suresh', 'Lakshmi', 'Imran', 'Fatima', 'Gaurav', 'Shruti',
  'Deepak', 'Aisha', 'Harish', 'Tanvi', 'Sanjay', 'Isha', 'Praveen', 'Nandini',
  'Yash', 'Bhavna', 'Rakesh', 'Swati',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Desai', 'Bose',
  'Chatterjee', 'Gupta', 'Mehta', 'Kulkarni', 'Menon', 'Rao', 'Joshi', 'Singh',
  'Khan', 'Pillai', 'Agarwal', 'Bhatt', 'Naidu', 'Trivedi', 'Chauhan', 'Saxena',
];

interface EngineState {
  cases: RecoveryCase[];
  settings: Settings;
  rand: () => number;
  lastBatchAt: string;
}

const DEFAULT_SETTINGS: Settings = {
  retryLimit: 3,
  cooldownHours: 4,
  escalationThreshold: 65,
};

const CASE_COUNT = 72;

function generateCases(rand: () => number, settings: Settings, seedNow: number): RecoveryCase[] {
  const cases: RecoveryCase[] = [];

  for (let i = 0; i < CASE_COUNT; i += 1) {
    const customerName = `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${
      LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
    }`;

    // Long-tail INR distribution: many small subscriptions, a few large invoices.
    const magnitude = rand();
    const amount =
      magnitude < 0.55
        ? Math.round((899 + rand() * 6_500) / 10) * 10
        : magnitude < 0.88
          ? Math.round((7_000 + rand() * 28_000) / 50) * 50
          : Math.round((40_000 + rand() * 85_000) / 100) * 100;

    const overdue = 2 + Math.floor(rand() * 44);
    const dueDate = new Date(seedNow - overdue * DAY).toISOString();
    const failureReason = FAILURE_REASONS[Math.floor(rand() * FAILURE_REASONS.length)];
    const disputeRaised = rand() < 0.1;
    const classification = classify(failureReason, disputeRaised);
    const urgencyScore = scoreUrgency(amount, overdue);

    const outcomeRoll = rand();
    const groundTruth: GroundTruth = disputeRaised
      ? { outcome: 'disputed', paysOnAttempt: 0 }
      : outcomeRoll < 0.52
        ? { outcome: 'will_pay', paysOnAttempt: 1 + Math.floor(rand() * 3) }
        : { outcome: 'will_not_pay', paysOnAttempt: 0 };

    const c: RecoveryCase = {
      id: `RC-${(1000 + i).toString()}`,
      customerName,
      amount,
      dueDate,
      paymentMethod: methodForReason(failureReason, rand()),
      failureReason,
      classification,
      urgencyScore,
      status: disputeRaised ? 'Disputed' : 'Pending',
      attempts: 0,
      lastAttemptAt: null,
      escalatedToVoice: false,
      resolvedOnAttempt: null,
      unresolvedReason: disputeRaised
        ? 'Customer raised a dispute — automation frozen pending chargeback outcome'
        : null,
      groundTruth,
      audit: [],
      transcript: null,
      promise: null,
    };

    const detectedAt = new Date(dueDate).getTime() + 6 * HOUR;
    pushAudit(
      c,
      'detection',
      `Payment failure detected on ${c.paymentMethod}`,
      buildReasoning(
        classification,
        failureReason,
        `attempt 0 of ${settings.retryLimit}`,
        'no prior attempt',
        `classified as ${classification}, urgency scored ${urgencyScore}/100`,
        `failure reason maps to ${classification}; urgency = 60% amount exposure (${formatINR(
          amount,
        )}) + 40% ageing (${overdue}d overdue)`,
      ),
      detectedAt,
    );

    if (disputeRaised) {
      pushAudit(
        c,
        'blocked',
        'Automation blocked — dispute on file',
        buildReasoning(
          classification,
          failureReason,
          `attempt 0 of ${settings.retryLimit}`,
          'no prior attempt',
          'all automated retries and voice calls blocked',
          'disputed accounts are blocked from all automated action until the chargeback is settled',
        ),
        detectedAt + HOUR,
      );
    }

    cases.push(c);
  }

  return cases;
}

/** Replay a plausible bounded history so the app is useful on first load. */
function seedLifecycles(state: EngineState, seedNow: number): void {
  for (const c of state.cases) {
    if (c.classification === 'disputed') continue;

    const roll = state.rand();
    const plannedSteps = roll < 0.16 ? 0 : roll < 0.5 ? 1 + Math.floor(state.rand() * 2) : roll < 0.8 ? 3 : 5;

    let vt = new Date(c.dueDate).getTime() + 8 * HOUR;
    for (let step = 0; step < plannedSteps; step += 1) {
      if (isTerminal(c)) break;
      vt += (state.settings.cooldownHours + 1 + state.rand() * 20) * HOUR;
      if (vt > seedNow) break;
      applyAutomatedStep(c, state.settings, vt, state.rand);
    }
  }
  sweepPromises(state, seedNow);
}

function createState(): EngineState {
  const rand = mulberry32(20260825);
  const settings = { ...DEFAULT_SETTINGS };
  const seedNow = Date.now();
  const state: EngineState = {
    cases: generateCases(rand, settings, seedNow),
    settings,
    rand,
    lastBatchAt: new Date(seedNow).toISOString(),
  };
  seedLifecycles(state, seedNow);
  return state;
}

const state: EngineState = createState();

/* ------------------------------------------------------------------ */
/* Batch metrics — honest, including our own mistakes                  */
/* ------------------------------------------------------------------ */

function computeReport(now = Date.now()): BatchReport {
  const cases = state.cases;
  const s = state.settings;

  const recovered = cases.filter((c) => c.status === 'Recovered');
  const totalAtRisk = cases.reduce((sum, c) => sum + c.amount, 0);
  const amountRecovered = recovered.reduce((sum, c) => sum + c.amount, 0);

  const attemptsForRecovery = recovered.reduce((sum, c) => sum + Math.max(1, c.resolvedOnAttempt ?? c.attempts), 0);

  // False positives: an automated retry/escalation was spent on a case whose
  // classification says automation could never have fixed it.
  const falsePositives = cases.filter(
    (c) =>
      (c.classification === 'genuine non-payment' || c.classification === 'disputed') &&
      (c.attempts > 0 || c.escalatedToVoice) &&
      c.status !== 'Recovered',
  );

  // Unnecessary escalations: we paid for a voice call, then the case settled on
  // attempt 1 — the call was not what recovered it.
  const unnecessary = cases.filter(
    (c) => c.escalatedToVoice && c.status === 'Recovered' && (c.resolvedOnAttempt ?? 99) <= 1,
  );

  const outcomeMix = CASE_STATUSES.map((status) => {
    const bucket = cases.filter((c) => c.status === status);
    return {
      status,
      count: bucket.length,
      amount: bucket.reduce((sum, c) => sum + c.amount, 0),
    };
  });

  const exceptions = cases
    .filter((c) => c.status === 'Unresolved' || c.status === 'Disputed')
    .map((c) => ({
      id: c.id,
      customerName: c.customerName,
      amount: c.amount,
      status: c.status,
      reason:
        c.unresolvedReason ??
        (c.promise?.status === 'Broken'
          ? `Promise of ${formatINR(c.promise.amount)} broken on ${formatDate(c.promise.promisedDate)}`
          : `${c.failureReason} (${c.classification}) — ${c.attempts}/${s.retryLimit} attempts spent, no settlement`),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    generatedAt: new Date(now).toISOString(),
    totalCases: cases.length,
    totalAtRisk,
    amountRecovered,
    recoveryRatePct: totalAtRisk === 0 ? 0 : (amountRecovered / totalAtRisk) * 100,
    recoveredCount: recovered.length,
    avgAttemptsPerRecovery: recovered.length === 0 ? 0 : attemptsForRecovery / recovered.length,
    falsePositiveCost: falsePositives.reduce((sum, c) => sum + c.amount, 0),
    falsePositiveCount: falsePositives.length,
    unnecessaryEscalations: unnecessary.length,
    unnecessaryEscalationAmount: unnecessary.reduce((sum, c) => sum + c.amount, 0),
    outcomeMix,
    exceptions,
    settingsUsed: { ...s },
  };
}

/* ------------------------------------------------------------------ */
/* Public API surface (mirrors the REST routes)                        */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Strip the hidden ground truth before anything leaves the service layer. */
export type CaseView = Omit<RecoveryCase, 'groundTruth'>;

function toView(c: RecoveryCase): CaseView {
  const { groundTruth: _hidden, ...rest } = c;
  return {
    ...rest,
    audit: [...rest.audit].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  };
}

export const recoveryApi = {
  /** GET /api/cases?status=&minUrgency=&search= */
  async getCases(filters: CaseFilters = {}): Promise<CaseView[]> {
    const parsed = caseFilterSchema.parse(filters);
    await sleep(60);
    sweepPromises(state, Date.now());
    return state.cases
      .filter((c) => (parsed.status ? c.status === parsed.status : true))
      .filter((c) => (parsed.minUrgency !== undefined ? c.urgencyScore >= parsed.minUrgency : true))
      .filter((c) =>
        parsed.search
          ? `${c.customerName} ${c.id} ${c.failureReason}`.toLowerCase().includes(parsed.search.toLowerCase())
          : true,
      )
      .map(toView);
  },

  /** GET /api/cases/:id */
  async getCase(id: string): Promise<CaseView | null> {
    await sleep(50);
    sweepPromises(state, Date.now());
    const found = state.cases.find((c) => c.id === id);
    return found ? toView(found) : null;
  },

  /** POST /api/cases/:id/action */
  async postAction(
    id: string,
    body: { action: OperatorAction },
  ): Promise<{ case: CaseView; decision: Decision; message: string }> {
    const { action } = actionSchema.parse(body);
    await sleep(80);
    const c = state.cases.find((item) => item.id === id);
    if (!c) throw new Error(`Case ${id} not found`);

    const now = Date.now();
    const s = state.settings;
    const availability = getActionAvailability(c, s, now).find((a) => a.action === action);
    if (!availability?.enabled) {
      throw new Error(availability?.reason ?? 'Action blocked by bound');
    }

    const decision = decide(c, s, now);
    let message = '';

    switch (action) {
      case 'retry': {
        const retryDecision: Decision = {
          ...decision,
          action: 'retry',
          attemptLabel: `attempt ${c.attempts + 1} of ${s.retryLimit}`,
          actionTaken: 'manual retry triggered by operator',
          reasoning: buildReasoning(
            c.classification,
            c.failureReason,
            `attempt ${c.attempts + 1} of ${s.retryLimit}`,
            cooldownState(c, s, now).label,
            'manual retry triggered by operator',
            `operator override inside bounds — ${s.retryLimit} attempt limit with ${s.cooldownHours}h cooldown still enforced`,
          ),
        };
        executeRetry(c, s, now, retryDecision);
        message =
          c.status === 'Recovered'
            ? `Retry cleared — ${formatINR(c.amount)} recovered`
            : `Retry attempt ${c.attempts} of ${s.retryLimit} logged`;
        break;
      }
      case 'escalate': {
        const escDecision: Decision = {
          ...decision,
          action: 'escalate',
          actionTaken: 'voice recovery escalated by operator',
          reasoning: buildReasoning(
            c.classification,
            c.failureReason,
            `attempt ${c.attempts} of ${s.retryLimit}`,
            cooldownState(c, s, now).label,
            'voice recovery escalated by operator',
            `urgency ${c.urgencyScore} ≥ escalation threshold ${s.escalationThreshold}`,
          ),
        };
        executeEscalation(c, s, now, escDecision, state.rand);
        message =
          c.transcript?.verification.status === 'Verified'
            ? 'Voice call simulated — promise verified against invoice'
            : 'Voice call simulated — extraction flagged Unverified, held for review';
        break;
      }
      case 'resolve': {
        markRecovered(c, s, now, 'operator confirmed settlement');
        message = `${formatINR(c.amount)} marked recovered`;
        break;
      }
      case 'stop': {
        markUnresolved(
          c,
          s,
          now,
          'Operator stopped automation — routed to manual collections',
          {
            ...decision,
            action: 'stop',
            actionTaken: 'automation stopped by operator',
            reasoning: buildReasoning(
              c.classification,
              c.failureReason,
              `attempt ${c.attempts} of ${s.retryLimit}`,
              cooldownState(c, s, now).label,
              'automation stopped by operator',
              'operator removed the case from automated recovery and flagged it for manual collections',
            ),
          },
        );
        message = 'Automation stopped — case flagged for manual review';
        break;
      }
    }

    return { case: toView(c), decision, message };
  },

  /** GET /api/batch-report */
  async getBatchReport(): Promise<BatchReport> {
    await sleep(60);
    sweepPromises(state, Date.now());
    return computeReport();
  },

  /** POST /api/batch-report/run — re-runs one bounded pass over every case. */
  async runBatch(): Promise<{ report: BatchReport; stepsApplied: number; promisesBroken: number }> {
    await sleep(220);
    const now = Date.now();
    const promisesBroken = sweepPromises(state, now);
    let stepsApplied = 0;
    for (const c of state.cases) {
      if (isTerminal(c)) continue;
      const applied = applyAutomatedStep(c, state.settings, now, state.rand);
      if (applied) stepsApplied += 1;
    }
    sweepPromises(state, now);
    state.lastBatchAt = new Date(now).toISOString();
    return { report: computeReport(now), stepsApplied, promisesBroken };
  },

  /** GET /api/settings */
  async getSettings(): Promise<Settings> {
    await sleep(30);
    return { ...state.settings };
  },

  /** POST /api/settings */
  async postSettings(body: Partial<Settings>): Promise<Settings> {
    const parsed = settingsSchema.partial().parse(body);
    await sleep(60);
    state.settings = settingsSchema.parse({ ...state.settings, ...parsed });
    return { ...state.settings };
  },
};

export function getLastBatchAt(): string {
  return state.lastBatchAt;
}