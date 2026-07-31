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

const IMMEDIATE_RISK =
  /(suicid|self[-\s]?harm|kill myself|end my life|don'?t want to live|overdose|immediate danger|being attacked|weapon|rape|assaulted|threat to my life)/i;
const URGENT_PROFESSIONAL =
  /(hallucina|hearing voices|psychosis|mania|withdrawal|detox|severe depression|haven'?t slept in days|not eaten for days|domestic violence|being abused)/i;

export function classifyCounsellingSafety(text: string): CounsellingSafetyLevel {
  if (IMMEDIATE_RISK.test(text)) return "immediate";
  if (URGENT_PROFESSIONAL.test(text)) return "urgent-professional";
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
