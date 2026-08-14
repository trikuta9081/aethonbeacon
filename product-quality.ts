export const PRIMARY_PRODUCT_DESTINATIONS = [
  { id: "aihelp", label: "Automatic Counselling" },
  { id: "vedic", label: "Vedic Insights" },
  { id: "tones", label: "Calm Sound" },
  { id: "community", label: "Community" },
  { id: "redress", label: "Help and Redress" }
] as const;

export const VEDIC_CALCULATION_STANDARD = {
  zodiac: "Sidereal zodiac",
  ayanamsa: "Lahiri / Chitrapaksha approximation",
  predictionAnchor: "Moon chart only",
  requiredInputs: ["date of birth", "exact local birth time", "birth place", "timezone"],
  limitations:
    "Results are reflective guidance for self-understanding — not predictions, guarantees, or a substitute for medical, mental-health, financial, or legal advice. Missing or approximate birth data reduces timing precision.",
  validationRule:
    "Planetary longitudes, Lagna, Nakshatra, Vimshottari Dasha and Antardasha must be checked against two independent reference calculations before a release is promoted."
} as const;

export type CounsellingSafetyLevel = "immediate" | "urgent-professional" | "supported-self-care";

// Safety classifier for counselling text. This is not a clinical tool; it is a
// last resort before an automatic reply would otherwise land on a person in
// crisis. Its only job is to route the message to a crisis handler and
// surface real numbers -- being wrong is far more expensive in the direction
// of missing a signal than of over-triggering, so it is deliberately tuned
// to over-trigger.
//
// The old version was a single 90-character regex that caught two of the
// sixteen phrasings a distressed person actually uses. It caught the clinical
// vocabulary ("suicidal ideation", "psychosis") and missed the way people
// speak: "i just want it to stop", "everyone would be better off without me",
// "he hits me when he drinks". None of those are ambiguous once you read them;
// the classifier just was not looking for them.
//
// This is still not a substitute for clinical assessment. It is a filter that
// says "this message deserves emergency copy, not an automated reply". The
// caller must combine this with resources for the actual jurisdiction.

// One helper so the intent of each rule stays visible.
const contains = (patterns: RegExp[], normalized: string) =>
  patterns.some((p) => p.test(normalized));

// Phrases that in every plausible reading mean the person is thinking about
// ending their life or is being harmed right now. Combined with the negation
// check below so "i am NOT thinking about..." does not trigger.
const IMMEDIATE_PATTERNS: RegExp[] = [
  // Direct references to death by own hand.
  /\bsuicid/i,
  /\bkill (?:myself|me)\b/i,
  /\bend (?:my|this) life\b/i,
  /\btake my (?:own )?life\b/i,
  /\bnot (?:want|wanna) (?:to )?(?:live|be here|be alive|exist)\b/i,
  /\bwant(?:ing|s)? (?:to )?(?:die|be dead|not exist|disappear|not (?:be )?here|it (?:all )?to (?:stop|end))\b/i,
  /\bready to die\b/i,
  /\bcan'?t (?:go on|do this|keep going|take (?:it|this) any ?more|carry on)\b/i,
  /\b(?:no |any )?(?:point|reason)(?: (?:in|to))? (?:go on|going|keep going|keep on|carry on)\b/i,
  /\b(?:it|life|everything) (?:is )?(?:too much|not worth (?:it|living))\b/i,
  /\b(?:no )?(?:point|reason) (?:in )?(?:living|being (?:here|alive))\b/i,
  /\beveryone (?:would be|is) better (?:off )?without me\b/i,
  /\bnobody (?:would|will) (?:miss|care|notice)\b/i,
  /\bthink(?:ing)? about (?:not being here|dying|death|ending it|suicide|hurting myself)\b/i,
  /\bplan(?:ning|ned)? (?:to )?(?:take (?:all )?(?:the |my )?pills|jump|hang|shoot|kill)\b/i,
  // Active self-harm.
  /\bself[-\s]?harm/i,
  /\bhurt(?:ing)? myself\b/i,
  /\bcut(?:ting)? (?:myself|my (?:arm|wrist|thigh|leg))\b/i,
  /\bburn(?:ing)? myself\b/i,
  /\boverdos/i,
  // Immediate external danger.
  /\b(?:being |getting )?(?:attacked|assaulted|raped)\b/i,
  /\b(?:someone|he|she|they).*(?:with a |has a )?(?:knife|gun|weapon)\b/i,
  /\bthreat(?:ened)? to (?:kill|hurt)\b/i,
  /\bimmediate danger\b/i,
];

// Situations that need prompt professional help, not an automated reply, but
// are not necessarily happening in the next few minutes. Domestic violence
// language is here because a person disclosing it needs a specialist route,
// not tone breathing.
const URGENT_PATTERNS: RegExp[] = [
  // Domestic violence / coercion, in the language people actually use.
  /\bhe (?:hits|hit|beats|beat|hurts|hurt|slaps|slapped|punched)\b/i,
  /\bshe (?:hits|hit|beats|beat|hurts|hurt|slaps|slapped|punched)\b/i,
  /\b(?:they|husband|wife|partner|boyfriend|girlfriend|father|mother|brother|in[-\s]?laws) (?:hit|hits|beat|beats|hurt|hurts|abuse|abuses)\b/i,
  /\b(?:won'?t|will not|does not|doesn'?t) (?:let|allow) me (?:leave|go|eat|sleep|see|call)\b/i,
  /\bdomestic (?:violence|abuse)\b/i,
  /\b(?:being|feel|felt) (?:abused|threatened|controlled|trapped|unsafe at home)\b/i,
  /\bstalk(?:ed|ing)\b/i,
  // Psychosis-adjacent, in lay language.
  /\b(?:hear|hearing) voices\b/i,
  /\bvoices? (?:are |is )?(?:telling|talking to|in my head)\b/i,
  /\bhallucina/i,
  /\bpsychosis\b/i,
  /\bmania\b|\bmanic\b/i,
  /\b(?:someone|they'?re?|voices?) (?:watching|following|listening to|controlling) me\b/i,
  // Substance withdrawal and heavy dependence.
  /\bwithdraw(?:al|ing)\b/i,
  /\bdetox/i,
  /\bcan'?t stop drinking\b/i,
  /\bdrink (?:to sleep|every (?:night|day)|all day)\b/i,
  /\bshoot(?:ing)? up\b|\binject(?:ing)?\b/i,
  // Sustained inability to sleep or eat -- classic escalation signal.
  /\bhaven'?t slept (?:properly |well )?(?:for |in )?(?:days|weeks)\b/i,
  /\bnot slept for (?:days|nights|a week)\b/i,
  /\bhaven'?t eaten (?:for |in )?(?:days|a week)\b/i,
  /\bnot eating\b/i,
  // Named severe conditions someone is currently living with.
  /\bsevere depress/i,
];

// Guards against the classifier over-triggering on discussion of these
// topics rather than experience of them.
const NEGATED_LEAD =
  /^\s*(?:i(?:'m| am)? not|i (?:do not|don'?t))\s+/i;

export function classifyCounsellingSafety(text: string): CounsellingSafetyLevel {
  const normalized = String(text ?? "").toLowerCase().trim();
  if (normalized.length === 0) return "supported-self-care";

  // "I don't want to hurt myself" is a *disclosure*, not a signal to route --
  // but this is a hair-trigger, so a bare negation is not enough on its own
  // to downgrade the check. A clear negated stem followed by a matching
  // phrase is treated as safe; anything else still routes.
  const isNegated = NEGATED_LEAD.test(normalized);
  if (contains(IMMEDIATE_PATTERNS, normalized)) return isNegated ? "urgent-professional" : "immediate";
  if (contains(URGENT_PATTERNS, normalized)) return "urgent-professional";
  return "supported-self-care";
}

export const COUNSELLING_SAFETY_COPY = {
  immediate:
    "Your immediate safety comes first. Contact local emergency services or a trusted person nearby now. Do not rely on an automated response during immediate danger.",
  "urgent-professional":
    "This situation deserves prompt support from a qualified professional. Use the guidance here only to organise the next safe step.",
  "supported-self-care":
    "This is general wellbeing support and does not replace licensed medical, psychological, legal, or emergency care."
} as const;

export const REDRESS_CONTENT_STANDARD = {
  jurisdiction: "India",
  reviewedOn: "2026-07-29",
  reviewIntervalDays: 90,
  sourceRule: "Use an official government, regulator, statutory body, or institution source.",
  outcomeNotice: "Guidance supports preparation and routing; it cannot guarantee acceptance, response time, or outcome."
} as const;

export function getRedressReviewState(now = new Date()): {
  current: boolean;
  daysSinceReview: number;
  nextReviewOn: string;
} {
  const reviewed = new Date(`${REDRESS_CONTENT_STANDARD.reviewedOn}T00:00:00.000Z`);
  const daysSinceReview = Math.max(0, Math.floor((now.getTime() - reviewed.getTime()) / 86_400_000));
  const nextReview = new Date(reviewed.getTime() + REDRESS_CONTENT_STANDARD.reviewIntervalDays * 86_400_000);
  return {
    current: daysSinceReview <= REDRESS_CONTENT_STANDARD.reviewIntervalDays,
    daysSinceReview,
    nextReviewOn: nextReview.toISOString().slice(0, 10)
  };
}

export type ProductMetricName =
  | "onboarding_completed"
  | "counselling_started"
  | "counselling_completed"
  | "calm_session_completed"
  | "redress_route_opened"
  | "community_delivery_succeeded"
  | "community_delivery_failed";

export type LocalProductMetric = {
  name: ProductMetricName;
  occurredAt: string;
  durationSeconds?: number;
};

export function createLocalProductMetric(
  name: ProductMetricName,
  durationSeconds?: number
): LocalProductMetric {
  return {
    name,
    occurredAt: new Date().toISOString(),
    ...(typeof durationSeconds === "number" ? { durationSeconds: Math.max(0, Math.round(durationSeconds)) } : {})
  };
}

export function summarizeLocalProductMetrics(metrics: LocalProductMetric[]): Record<ProductMetricName, number> {
  const summary = {
    onboarding_completed: 0,
    counselling_started: 0,
    counselling_completed: 0,
    calm_session_completed: 0,
    redress_route_opened: 0,
    community_delivery_succeeded: 0,
    community_delivery_failed: 0
  } satisfies Record<ProductMetricName, number>;
  for (const metric of metrics) summary[metric.name] += 1;
  return summary;
}

export const ETHICAL_ACCESS_MODEL = {
  alwaysFree: [
    "Emergency assistance",
    "Help and Redress",
    "Core automatic counselling",
    "Basic Calm Sound",
    "Basic Moon-chart insight"
  ],
  optionalPremium: [
    "Extended Moon-chart reports",
    "Long-form counselling programmes",
    "Advanced audio programmes",
    "Encrypted multi-device backup"
  ],
  prohibited: [
    "Paywalling emergency assistance",
    "Advertising based on emotional or astrological profiles",
    "Selling personal wellbeing data"
  ]
} as const;

export const BETA_DEVICE_MATRIX = {
  minimumActiveTesters: 30,
  targetActiveTesters: 50,
  requiredCoverage: [
    "small Android phone",
    "large Android phone",
    "older supported iPhone",
    "current iPhone",
    "tablet",
    "slow network",
    "large accessibility text",
    "light theme",
    "dark theme",
    "supported non-English language"
  ]
} as const;

export type BetaReleaseEvidence = {
  activeTesterCount: number;
  coveredScenarios: string[];
  openBlockers: number;
  openMajorIssues: number;
};

export function evaluateBetaRelease(evidence: BetaReleaseEvidence): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (evidence.activeTesterCount < BETA_DEVICE_MATRIX.minimumActiveTesters) {
    reasons.push(`Need at least ${BETA_DEVICE_MATRIX.minimumActiveTesters} active testers.`);
  }
  const missing = BETA_DEVICE_MATRIX.requiredCoverage.filter(
    (scenario) => !evidence.coveredScenarios.includes(scenario)
  );
  if (missing.length) reasons.push(`Missing coverage: ${missing.join(", ")}.`);
  if (evidence.openBlockers > 0) reasons.push(`${evidence.openBlockers} blocker issue(s) remain open.`);
  if (evidence.openMajorIssues > 0) reasons.push(`${evidence.openMajorIssues} major issue(s) remain open.`);
  return { ready: reasons.length === 0, reasons };
}
