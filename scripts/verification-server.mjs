import { createServer } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseWebhookUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed.length === 0) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function timeoutSignal(ms) {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

const port = parsePositiveInt(process.env.PORT ?? process.env.VERIFICATION_SERVER_PORT, 8787);
const host = (process.env.VERIFICATION_HOST ?? "127.0.0.1").trim() || "127.0.0.1";
const corsOrigin = (process.env.VERIFICATION_CORS_ORIGIN ?? "*").trim() || "*";
const corsOrigins = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const requestContext = new AsyncLocalStorage();
const brandName = (process.env.VERIFICATION_BRAND_NAME ?? "Aethon Beacon").trim() || "Aethon Beacon";
const debugPreview = process.env.LOCAL_VERIFICATION_DEBUG === "1";
const smsWebhookUrl = parseWebhookUrl(process.env.VERIFICATION_SMS_WEBHOOK_URL);
const emailWebhookUrl = parseWebhookUrl(process.env.VERIFICATION_EMAIL_WEBHOOK_URL);
const twilioAccountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
const twilioAuthToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
const twilioFromNumber = (process.env.TWILIO_FROM_NUMBER ?? "").trim();
const twilioMessagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID ?? "").trim();
const sendgridApiKey = (process.env.SENDGRID_API_KEY ?? "").trim();
const sendgridFromEmail = (process.env.SENDGRID_FROM_EMAIL ?? "").trim();
const sendgridFromName = (process.env.SENDGRID_FROM_NAME ?? brandName).trim() || brandName;
const geminiApiKey = (process.env.GEMINI_API_KEY ?? "").trim();
const geminiModel = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim() || "gemini-2.5-flash";
const adminLoginIdentity = (process.env.ADMIN_LOGIN_ID ?? "").trim().toLowerCase();
const adminLoginCode = (process.env.ADMIN_LOGIN_CODE ?? "").trim();
const geminiFallbackModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const geminiModelCandidates = [
  geminiModel,
  ...geminiFallbackModels.filter((model) => model !== geminiModel)
];
const codeTtlMs = parsePositiveInt(process.env.VERIFICATION_CODE_TTL_MS, 10 * 60 * 1000);
const requestWindowMs = parsePositiveInt(process.env.VERIFICATION_REQUEST_WINDOW_MS, 15 * 60 * 1000);
const maxRequestsPerWindow = parsePositiveInt(process.env.VERIFICATION_MAX_REQUESTS_PER_WINDOW, 5);
const maxConfirmAttempts = parsePositiveInt(process.env.VERIFICATION_MAX_CONFIRM_ATTEMPTS, 5);
const providerTimeoutMs = parsePositiveInt(process.env.VERIFICATION_PROVIDER_TIMEOUT_MS, 12_000);
const geminiTimeoutMs = parsePositiveInt(process.env.GEMINI_REQUEST_TIMEOUT_MS, 18_000);
const smsDeliveryConfigured =
  smsWebhookUrl.length > 0 ||
  (twilioAccountSid.length > 0 &&
    twilioAuthToken.length > 0 &&
    (twilioFromNumber.length > 0 || twilioMessagingServiceSid.length > 0));
const emailDeliveryConfigured =
  emailWebhookUrl.length > 0 || (sendgridApiKey.length > 0 && sendgridFromEmail.length > 0);
const geminiConfigured = geminiApiKey.length > 0;
const adminAuthConfigured = adminLoginIdentity.length > 0 && adminLoginCode.length > 0;
const adminSessionTtlMs = parsePositiveInt(process.env.ADMIN_SESSION_TTL_MS, 8 * 60 * 60 * 1000);
const adminLockoutTtlMs = parsePositiveInt(process.env.ADMIN_LOCKOUT_TTL_MS, 5 * 60 * 1000);
const adminMaxFailedAttempts = parsePositiveInt(process.env.ADMIN_MAX_FAILED_ATTEMPTS, 5);

/** @type {Map<string, { code: string; expiresAt: number; deliveryId: string; destination: string; channel: "phone" | "email"; attempts: number }>} */
const pendingVerifications = new Map();
/** @type {Map<string, number[]>} */
const requestHistory = new Map();
/** @type {Map<string, { sessionId: string; platform: string; role: string; firstSeenAt: number; lastSeenAt: number }>} */
const presenceSessions = new Map();
/** @type {Map<string, { token: string; issuedAt: number; expiresAt: number; loginId: string }>} */
const adminSessions = new Map();
/** @type {Map<string, { attempts: number; lockedUntilAt: number }>} */
const adminLoginAttempts = new Map();

function resolveCorsOrigin(req) {
  if (corsOrigins.length === 0 || corsOrigins.includes("*")) return "*";
  const requestOrigin = String(req?.headers?.origin ?? "").trim();
  if (requestOrigin.length > 0 && corsOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return corsOrigins[0];
}

function currentCorsOrigin() {
  return requestContext.getStore()?.corsOrigin ?? resolveCorsOrigin();
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": currentCorsOrigin(),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function bodyObjectFromEntries(entries) {
  return Object.fromEntries(
    entries.map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (raw.length === 0) {
        resolve({});
        return;
      }

      const contentType = String(req.headers["content-type"] ?? "").toLowerCase();

      if (contentType.includes("application/x-www-form-urlencoded")) {
        resolve(bodyObjectFromEntries([...new URLSearchParams(raw).entries()]));
        return;
      }

      if (contentType.startsWith("text/plain")) {
        try {
          resolve(JSON.parse(raw));
          return;
        } catch {
          resolve({ raw });
          return;
        }
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function makeDeliveryId() {
  return `del_${Math.floor(100000 + Math.random() * 900000)}`;
}

function keyFor(channel, phone, email) {
  return channel === "phone" ? `phone:${phone}` : `email:${email}`;
}

function withinWindow(timestamps, windowMs) {
  const threshold = Date.now() - windowMs;
  return timestamps.filter((timestamp) => timestamp >= threshold);
}

function prunePresenceSessions() {
  const now = Date.now();
  const activeThreshold = now - 90_000;
  for (const [sessionId, session] of presenceSessions.entries()) {
    if (session.lastSeenAt < activeThreshold) {
      presenceSessions.delete(sessionId);
    }
  }
}

function pruneAdminSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) {
      adminSessions.delete(token);
    }
  }
}

function sanitizeAdminLoginId(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getAdminSessionFromRequest(req) {
  const header = String(req.headers.authorization ?? "");
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) return null;
  pruneAdminSessions();
  return adminSessions.get(token) ?? null;
}

function getAdminAuthSummary() {
  pruneAdminSessions();
  return {
    configured: adminAuthConfigured,
    activeSessions: adminSessions.size
  };
}

function getPresenceSummary() {
  prunePresenceSessions();
  const sessions = [...presenceSessions.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  const platformCounts = sessions.reduce((acc, session) => {
    const platform = session.platform || "unknown";
    acc[platform] = (acc[platform] ?? 0) + 1;
    return acc;
  }, {});
  const roleCounts = sessions.reduce((acc, session) => {
    const role = session.role || "guest";
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});

  return {
    activeUsers: sessions.length,
    sessions: sessions.slice(0, 10).map((session) => ({
      sessionId: session.sessionId,
      platform: session.platform,
      role: session.role,
      firstSeenAt: new Date(session.firstSeenAt).toISOString(),
      lastSeenAt: new Date(session.lastSeenAt).toISOString()
    })),
    platformCounts,
    roleCounts
  };
}

async function sendWebhook(url, payload) {
  if (url.length === 0) return;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: timeoutSignal(providerTimeoutMs)
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook responded with ${response.status}${body ? `: ${body}` : ""}`);
  }
}

async function trySendWebhook(url, payload) {
  if (url.length === 0) return false;
  try {
    await sendWebhook(url, payload);
    return true;
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Webhook delivery failed.");
    return false;
  }
}

function otpMessage(code) {
  return `${brandName} verification code: ${code}. It expires in ${Math.round(codeTtlMs / 60000)} minutes.`;
}

async function sendTwilioSms({ destination, code }) {
  if (!smsDeliveryConfigured || twilioAccountSid.length === 0) return false;

  const body = new URLSearchParams({
    To: destination,
    Body: otpMessage(code)
  });

  if (twilioMessagingServiceSid.length > 0) {
    body.set("MessagingServiceSid", twilioMessagingServiceSid);
  } else {
    body.set("From", twilioFromNumber);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioAccountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      signal: timeoutSignal(providerTimeoutMs)
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 400 && errorBody.includes('"code":21608')) {
      throw new Error(
        "Twilio trial accounts can only send SMS to verified recipient numbers. Verify the destination number in Twilio or upgrade the account to send to this phone."
      );
    }
    throw new Error(`Twilio SMS delivery failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`);
  }

  return true;
}

async function sendSendGridEmail({ destination, code }) {
  if (!emailDeliveryConfigured || sendgridApiKey.length === 0) return false;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: destination }] }],
      from: { email: sendgridFromEmail, name: sendgridFromName },
      subject: `${brandName} verification code`,
      content: [
        {
          type: "text/plain",
          value: `${otpMessage(code)}\n\nIf you did not request this code, you can ignore this message.`
        }
      ]
    }),
    signal: timeoutSignal(providerTimeoutMs)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`SendGrid email delivery failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`);
  }

  return true;
}

async function deliverCode({ channel, code, destination, deliveryId, body }) {
  const payload = {
    channel,
    code,
    destination,
    deliveryId,
    name: typeof body?.name === "string" ? body.name : "",
    profileRoleId: typeof body?.profileRoleId === "string" ? body.profileRoleId : "",
    profileGender: typeof body?.profileGender === "string" ? body.profileGender : ""
  };

  if (channel === "phone") {
    if (await trySendWebhook(smsWebhookUrl, payload)) return;
    if (await sendTwilioSms(payload)) return;
    if (!debugPreview) {
      throw new Error("Phone verification delivery is not configured.");
    }
    return;
  }

  if (await trySendWebhook(emailWebhookUrl, payload)) return;
  if (await sendSendGridEmail(payload)) return;
  if (!debugPreview) {
    throw new Error("Email verification delivery is not configured.");
  }
}

function buildGeminiPrompt(body) {
  const route = typeof body?.route === "string" ? body.route : "general";
  const identityLabel = typeof body?.identityLabel === "string" ? body.identityLabel : "User";
  const issueGuideLabel = typeof body?.issueGuideLabel === "string" ? body.issueGuideLabel : "Current issue";
  const emergencyNumber = typeof body?.emergencyNumber === "string" ? body.emergencyNumber : "112";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const appPrompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (appPrompt.length > 0) {
    return [
      appPrompt,
      "",
      "Hard requirement: return exactly 4 labelled lines and no extra paragraph.",
      "Hard requirement: the second line must contain one concrete next action, not general reassurance."
    ].join("\n");
  }

  return [
    "You are Beacon Guide.",
    "Reply with operational triage, not generic counselling.",
    "Classify the issue, choose the route, give one concrete next action, and say when to escalate.",
    "Keep the answer short and easy to scan. Do not be verbose or generic.",
    "If the user needs urgent help, say to use SOS or call the emergency number immediately.",
    "If the issue needs a complaint, office, police, school, workplace, cyber, women/child, or authority route, choose Help.",
    "If the issue mainly needs planning, choose Path. If emotionally flooded but not unsafe, choose Reset first, then Path.",
    `User role: ${identityLabel}.`,
    `Detected route: ${route}.`,
    `Current issue guide: ${issueGuideLabel}.`,
    `Emergency number: ${emergencyNumber}.`,
    `User message: ${text}`,
    "Return plain text only. Use exactly 4 labelled lines:",
    "1. What this means:",
    "2. Safest next step:",
    "3. Open tab:",
    `4. Escalate when:`
  ].join("\n");
}

function getAIHelpTabLabel(route) {
  if (route === "urgent" || route === "redress") return "Help";
  return "Path";
}

function buildFallbackAIReply(body) {
  const route = typeof body?.route === "string" ? body.route : "general";
  const text = typeof body?.text === "string" ? body.text.toLowerCase() : "";
  const emergencyNumber = typeof body?.emergencyNumber === "string" && body.emergencyNumber.trim().length > 0
    ? body.emergencyNumber.trim()
    : "112";
  const openTab = getAIHelpTabLabel(route);
  if (route === "urgent" || /(danger|suicide|self[-\s]?harm|assault|violence|threat)/.test(text)) {
    return [
      "What this means: This may be an urgent safety issue and protection should come before any longer guidance.",
      `Safest next step: Use SOS or call ${emergencyNumber} now, then alert a nearby trusted person and keep your location ready.`,
      `Open tab: ${openTab}`,
      `Escalate when: Call ${emergencyNumber} or use SOS immediately if there is assault, violence, self-harm risk, or you do not feel safe.`
    ].join("\n");
  }
  if (route === "redress" || /(complaint|redress|ragging|harass|police|authority|work|office|school|college)/.test(text)) {
    return [
      "What this means: This is a complaint or authority issue that should move through Help with a clear paper trail.",
      "Safest next step: Write the facts, dates, names, evidence, and the exact result you want before approaching the first office.",
      `Open tab: ${openTab}`,
      "Escalate when: Move to a higher office or formal complaint route if the first office ignores you, delays without reason, or the situation worsens."
    ].join("\n");
  }
  if (route === "professional" || /(doctor|psychologist|counsel|sleep|panic|depression)/.test(text)) {
    return [
      "What this means: This looks like a stress or health issue that may need verified professional support.",
      "Safest next step: Note the main symptom, how long it has been happening, and one body sign before opening Path for the next referral step.",
      `Open tab: ${openTab}`,
      "Escalate when: Seek professional or urgent help if panic, sleep loss, hopelessness, or body symptoms are becoming severe or unsafe."
    ].join("\n");
  }
  if (route === "guide" || /(anger|anxiety|fear|stigma|burnout|lonely|stress|coward)/.test(text)) {
    return [
      "What this means: This is a guidance issue that should be slowed down and turned into one practical next step.",
      "Safest next step: Name the feeling plainly, slow the body once, and then open Path for the most useful next action.",
      `Open tab: ${openTab}`,
      "Escalate when: Move to Help or professional support if the feeling stays intense, keeps repeating, or starts affecting safety, sleep, or function."
    ].join("\n");
  }
  return [
    "What this means: This is a general guidance moment that needs one clear route instead of a vague spiral.",
    "Safest next step: Write one fact, one feeling, and one next action, then open Path and keep the next move small.",
    `Open tab: ${openTab}`,
    "Escalate when: Move to Help, SOS, or professional support if the issue becomes unsafe, official, or too heavy for one step."
  ].join("\n");
}

function trimAIHelpLabel(text) {
  return String(text ?? "")
    .replace(/^\s*(?:\d+\.\s*)?(what this means|safest next step|open tab|escalate when)\s*:\s*/i, "")
    .trim();
}

function isStructuredAIHelpReply(text) {
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 4) return false;

  const patterns = [
    /^\s*(?:\d+\.\s*)?what this means\s*:/i,
    /^\s*(?:\d+\.\s*)?safest next step\s*:/i,
    /^\s*(?:\d+\.\s*)?open tab\s*:/i,
    /^\s*(?:\d+\.\s*)?escalate when\s*:/i
  ];

  return patterns.every((pattern, index) => pattern.test(lines[index] ?? "") && trimAIHelpLabel(lines[index]).length >= 12);
}

function sentenceFragments(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((line) => trimAIHelpLabel(line.trim()))
    .filter((line) => line.length >= 20)
    .slice(0, 4);
}

function normalizeAIHelpReply(text, body) {
  const raw = String(text ?? "").trim();
  if (isStructuredAIHelpReply(raw)) return raw;

  const fallbackLines = buildFallbackAIReply(body).split("\n").map(trimAIHelpLabel);
  const fragments = sentenceFragments(raw);
  if (fragments.length === 0) {
    return buildFallbackAIReply(body);
  }

  return [
    `What this means: ${fragments[0] ?? fallbackLines[0]}`,
    `Safest next step: ${fragments[1] ?? fallbackLines[1]}`,
    `Open tab: ${getAIHelpTabLabel(typeof body?.route === "string" ? body.route : "general")}`,
    `Escalate when: ${fragments[2] ?? fallbackLines[3]}`
  ].join("\n");
}

async function callGeminiModel(model, body) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildGeminiPrompt(body)
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.3
        }
      }),
      signal: timeoutSignal(geminiTimeoutMs)
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Gemini API model ${model} failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`);
  }

  const data = await response.json();
  const text = Array.isArray(data?.candidates)
    ? data.candidates
        .flatMap((candidate) => candidate?.content?.parts ?? [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("\n")
        .trim()
    : "";

  if (text.length === 0) {
    throw new Error(`Gemini API model ${model} returned an empty response.`);
  }

  return { source: "gemini", model, text };
}

async function generateGeminiAIHelp(body) {
  if (!geminiConfigured) {
    return { source: "fallback", model: "fallback", text: buildFallbackAIReply(body) };
  }

  const errors = [];
  for (const model of geminiModelCandidates) {
    try {
      const result = await callGeminiModel(model, body);
      return { ...result, text: normalizeAIHelpReply(result.text, body) };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Gemini model ${model} failed.`);
    }
  }

  console.warn(errors.join(" | "));
  return { source: "fallback", model: "fallback", text: buildFallbackAIReply(body) };
}

// ── /ai/brief — personalised Smart Daily Brief ─────────────────────────────

function buildBriefPrompt(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "there";
  const hour = typeof body?.hour === "number" ? body.hour : new Date().getHours();
  const issueLabel = typeof body?.issueLabel === "string" ? body.issueLabel : "general wellbeing";
  const streakDays = typeof body?.streakDays === "number" ? body.streakDays : 0;
  const avgScore = typeof body?.avgScore === "number" ? body.avgScore : null;
  const lastScore = typeof body?.lastScore === "number" ? body.lastScore : null;
  const lastNote = typeof body?.lastNote === "string" ? body.lastNote.slice(0, 200) : "";
  const rashiName = typeof body?.rashiName === "string" ? body.rashiName : "";
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return [
    "You are Beacon Guide writing a short, warm, personal daily brief for a wellness app.",
    "Write in second person. Be direct. Sound human, not robotic. No bullet points.",
    "Two sentences maximum. First: acknowledge their current state using the data. Second: one clear action for today.",
    "Do not mention AI, Gemini, or that this is generated.",
    `User name: ${name}.`,
    `Time of day: ${timeOfDay}.`,
    `Current focus: ${issueLabel}.`,
    streakDays > 0 ? `Check-in streak: ${streakDays} days.` : "No active streak yet.",
    lastScore !== null ? `Last mood score: ${lastScore}/10.` : "No recent check-in.",
    avgScore !== null ? `7-day average score: ${avgScore.toFixed(1)}/10.` : "",
    lastNote.length > 0 ? `Last note snippet: "${lastNote}"` : "",
    rashiName.length > 0 ? `Vedic sign today: ${rashiName}.` : "",
    "Write exactly 2 sentences. Warm tone. No greetings like 'Good morning'. Start directly."
  ].filter(Boolean).join("\n");
}

function buildBriefFallback(body) {
  const hour = typeof body?.hour === "number" ? body.hour : new Date().getHours();
  const lastScore = typeof body?.lastScore === "number" ? body.lastScore : null;
  const streakDays = typeof body?.streakDays === "number" ? body.streakDays : 0;
  if (lastScore !== null && lastScore <= 3) return "You've been running low — that's worth paying attention to. A few minutes of calm or a quick check-in can reset the baseline today.";
  if (streakDays >= 7) return `${streakDays} days in a row — that consistency is doing real work. Use it to push one step further on your focus today.`;
  if (hour < 10) return "Starting the day with a quick check-in gives the app the signal it needs to route you well. Takes 30 seconds.";
  if (hour >= 18) return "End-of-day check-ins capture the full picture of how you moved through stress today. Worth two minutes before you switch off.";
  return "Your wellness picture builds from each honest check-in. Log one line now and let the app find your best next step.";
}

async function generateGeminiBrief(body) {
  if (!geminiConfigured) {
    return { source: "fallback", text: buildBriefFallback(body) };
  }
  const errors = [];
  for (const model of geminiModelCandidates) {
    try {
      const promptBody = { ...body, _promptOverride: buildBriefPrompt(body) };
      const result = await callGeminiModelWithPrompt(model, buildBriefPrompt(body), 60);
      return { source: "gemini", model: result.model, text: result.text };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `model ${model} failed`);
    }
  }
  console.warn("[brief]", errors.join(" | "));
  return { source: "fallback", text: buildBriefFallback(body) };
}

// ── /ai/birth-chart — Moon-chart horoscope based on exact birth details ─────

function buildBirthChartPrompt(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "the user";
  const dob = typeof body?.dob === "string" ? body.dob.trim() : "";
  const birthTime = typeof body?.birthTime === "string" ? body.birthTime.trim() : "";
  const birthPlace = typeof body?.birthPlace === "string" ? body.birthPlace.trim() : "";
  const moonRashiName = typeof body?.moonRashiName === "string"
    ? body.moonRashiName.trim()
    : typeof body?.rashiName === "string" ? body.rashiName.trim() : "";
  const nakshatraName = typeof body?.nakshatraName === "string" ? body.nakshatraName.trim() : "";
  const tithiName = typeof body?.tithiName === "string" ? body.tithiName.trim() : "";
  const varaName = typeof body?.varaName === "string" ? body.varaName.trim() : "";
  const predictionLines = Array.isArray(body?.predictionLines)
    ? body.predictionLines.slice(0, 4).map((line) => String(line).trim()).filter(Boolean).join(" | ")
    : "";

  return [
    "You are Beacon Guide writing a compact Vedic Moon-chart horoscope for a wellness app birth chart page.",
    "Use Vedic-style language, but stay calm, practical, and respectful.",
    "Base every prediction only on the Moon chart: Janma Rashi, lunar Nakshatra, Tithi, and Moon-derived Vimshottari periods.",
    "Do not calculate, mention, infer, or use a Sun sign, Surya Rashi, solar chart, or Sun-chart prediction.",
    "Treat date of birth, exact 24-hour birth time, and full birth place as mandatory precision fields.",
    "Do not pretend the reading is mathematically exact if coordinates, timezone, ayanamsa, or certified ephemeris details are not supplied.",
    "Write 4 short sentences. Sentence 1: state the reading is anchored to the supplied date, time, and place. Sentence 2: summarize the cosmic reading. Sentence 3: give one likely emotional or behavioral theme. Sentence 4: give one grounded action or caution for today.",
    "Do not mention AI, Gemini, or that this is generated.",
    "Do not make medical, financial, or certainty-heavy claims.",
    `User name: ${name}.`,
    `Date of birth: ${dob}.`,
    `Time of birth: ${birthTime}.`,
    `Place of birth: ${birthPlace}.`,
    moonRashiName.length > 0 ? `Janma Rashi (Moon sign): ${moonRashiName}.` : "",
    nakshatraName.length > 0 ? `Nakshatra: ${nakshatraName}.` : "",
    tithiName.length > 0 ? `Tithi: ${tithiName}.` : "",
    varaName.length > 0 ? `Vara: ${varaName}.` : "",
    predictionLines.length > 0 ? `Local Moon-chart hints: ${predictionLines}.` : "",
    "Keep the tone steady, useful, and precise."
  ].filter(Boolean).join("\n");
}

function buildBirthChartFallback(body) {
  const moonRashiName = typeof body?.moonRashiName === "string"
    ? body.moonRashiName.trim()
    : typeof body?.rashiName === "string" ? body.rashiName.trim() : "";
  const nakshatraName = typeof body?.nakshatraName === "string" ? body.nakshatraName.trim() : "";
  const birthTime = typeof body?.birthTime === "string" ? body.birthTime.trim() : "";
  const place = typeof body?.birthPlace === "string" ? body.birthPlace.trim() : "";
  const base = place.length > 0 && birthTime.length > 0
    ? `Your reading is anchored to the saved birth time and place: ${birthTime}, ${place}.`
    : "Complete exact birth time and place before treating this as a birth-chart reading.";
  const rashiLine = moonRashiName.length > 0 ? `The Moon chart is anchored in ${moonRashiName} Janma Rashi.` : "Use the Moon-chart reading as a guide, not a fixed label.";
  const second = nakshatraName.length > 0
    ? `Your ${nakshatraName} detail suggests a pattern worth noticing in how you respond to stress and choice.`
    : "Use the reading as a guide, not a fixed label.";
  const third = "For exact Lagna and divisional-chart judgement, verify coordinates and timezone with a certified Jyotishi.";
  return `${base} ${rashiLine} ${second} ${third}`;
}

async function generateGeminiBirthChart(body) {
  if (!geminiConfigured) {
    return { source: "fallback", text: buildBirthChartFallback(body) };
  }
  const errors = [];
  for (const model of geminiModelCandidates) {
    try {
      const result = await callGeminiModelWithPrompt(model, buildBirthChartPrompt(body), 120);
      return { source: "gemini", model: result.model, text: result.text };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `model ${model} failed`);
    }
  }
  console.warn("[birth-chart]", errors.join(" | "));
  return { source: "fallback", text: buildBirthChartFallback(body) };
}

// ── /ai/journal — journal entry emotion analysis ───────────────────────────

function buildJournalPrompt(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "the user";
  const note = typeof body?.note === "string" ? body.note.slice(0, 600) : "";
  const issueLabel = typeof body?.issueLabel === "string" ? body.issueLabel : "general wellbeing";
  const score = typeof body?.score === "number" ? body.score : null;

  return [
    "You are Beacon Guide analysing a private journal entry in a wellness app.",
    "Your role: name the emotion, validate it briefly, then give one concrete next action.",
    "Be warm, non-clinical, and direct. Write in second person.",
    "Maximum 3 sentences. No bullet points. No diagnosis. No greetings.",
    "Do not mention AI, Gemini, or that this is generated.",
    `User name: ${name}.`,
    `Current focus: ${issueLabel}.`,
    score !== null ? `Clarity score this session: ${score}/100.` : "",
    `Journal entry: "${note}"`,
    "Respond with exactly 3 sentences:",
    "1. Name the core feeling in the entry (start with 'You're feeling...' or 'This sounds like...').",
    "2. Validate it without being preachy.",
    "3. One specific next action they can take in the next hour."
  ].filter(Boolean).join("\n");
}

function buildJournalFallback(body) {
  const score = typeof body?.score === "number" ? body.score : null;
  if (score !== null && score <= 30) return "This sounds like a heavy moment — and that's real. Give yourself permission to step back for 5 minutes before deciding anything. Open the Calm tab for a grounding practice.";
  if (score !== null && score >= 70) return "You're in a clear headspace right now. Use that clarity to act on one thing you've been putting off. Open Path to find the right next step.";
  return "Writing this out is already the first step. Name the feeling, accept it, then choose one small action. Open Guide for a structured path forward.";
}

async function generateGeminiJournalInsight(body) {
  if (!geminiConfigured) {
    return { source: "fallback", text: buildJournalFallback(body) };
  }
  const errors = [];
  for (const model of geminiModelCandidates) {
    try {
      const result = await callGeminiModelWithPrompt(model, buildJournalPrompt(body), 100);
      return { source: "gemini", model: result.model, text: result.text };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `model ${model} failed`);
    }
  }
  console.warn("[journal]", errors.join(" | "));
  return { source: "fallback", text: buildJournalFallback(body) };
}

// ── /ai/insights — weekly pattern summary ─────────────────────────────────

function buildInsightsPrompt(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "the user";
  const issueLabel = typeof body?.issueLabel === "string" ? body.issueLabel : "general wellbeing";
  const weekAvg = typeof body?.weekAvg === "number" ? body.weekAvg : null;
  const monthAvg = typeof body?.monthAvg === "number" ? body.monthAvg : null;
  const streakDays = typeof body?.streakDays === "number" ? body.streakDays : 0;
  const entryCount = typeof body?.entryCount === "number" ? body.entryCount : 0;
  const topTone = typeof body?.topTone === "string" ? body.topTone : "";
  const recentNotes = Array.isArray(body?.recentNotes) ? body.recentNotes.slice(0, 5).join(" | ") : "";

  return [
    "You are Beacon Guide writing a weekly pattern insight for a wellness app user.",
    "Analyse the data below and write 3 short paragraphs.",
    "Paragraph 1: What the numbers reveal about their emotional pattern this week.",
    "Paragraph 2: One specific strength you see in their data (streak, improvement, consistency).",
    "Paragraph 3: One honest challenge and the single most effective action to address it.",
    "Be direct, warm, evidence-based. Use the actual numbers. No generic advice.",
    "Do not mention AI, Gemini, or that this is generated. Write in second person.",
    `User name: ${name}.`,
    `Focus area: ${issueLabel}.`,
    `Check-in streak: ${streakDays} days.`,
    `Total check-ins analysed: ${entryCount}.`,
    weekAvg !== null ? `This week's average clarity score: ${weekAvg.toFixed(1)}/100.` : "No week average available.",
    monthAvg !== null ? `This month's average clarity score: ${monthAvg.toFixed(1)}/100.` : "No month average available.",
    topTone.length > 0 ? `Most common emotional tone: ${topTone}.` : "",
    recentNotes.length > 0 ? `Recent journal snippets: ${recentNotes}` : ""
  ].filter(Boolean).join("\n");
}

function buildInsightsFallback(body) {
  const weekAvg = typeof body?.weekAvg === "number" ? body.weekAvg : null;
  const streakDays = typeof body?.streakDays === "number" ? body.streakDays : 0;
  if (weekAvg !== null && weekAvg >= 65) return "Your clarity scores this week are solid — you're managing your emotional baseline well. The consistency of your check-ins is building a real picture over time. Keep the streak alive and push one guide step further this week.";
  if (weekAvg !== null && weekAvg < 40) return "Your scores this week point to a sustained heavy load — that pattern matters. The good news: you're tracking it, which means you're not ignoring it. Focus on reducing one stressor and opening the Calm tab daily this week.";
  if (streakDays >= 7) return `${streakDays} days of consistent check-ins is giving the app real signal to work with. Your emotional patterns are starting to emerge clearly. Use the Patterns tab this week to spot the peak and low days and plan around them.`;
  return "Your data is starting to build a picture of your emotional rhythms. A few more check-ins will reveal your peak performance windows and low-energy patterns. Focus on consistency over perfection this week.";
}

async function generateGeminiInsights(body) {
  if (!geminiConfigured) {
    return { source: "fallback", text: buildInsightsFallback(body) };
  }
  const errors = [];
  for (const model of geminiModelCandidates) {
    try {
      const result = await callGeminiModelWithPrompt(model, buildInsightsPrompt(body), 150);
      return { source: "gemini", model: result.model, text: result.text };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `model ${model} failed`);
    }
  }
  console.warn("[insights]", errors.join(" | "));
  return { source: "fallback", text: buildInsightsFallback(body) };
}

// ── Shared low-level Gemini caller with explicit prompt ────────────────────

async function callGeminiModelWithPrompt(model, prompt, minChars = 40) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.4 }
      }),
      signal: timeoutSignal(geminiTimeoutMs)
    }
  );
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Gemini ${model} returned ${response.status}${errBody ? `: ${errBody}` : ""}`);
  }
  const data = await response.json();
  const text = Array.isArray(data?.candidates)
    ? data.candidates.flatMap((c) => c?.content?.parts ?? []).map((p) => p?.text ?? "").join("\n").trim()
    : "";
  if (text.length < minChars) throw new Error(`Gemini ${model} returned a too-short response`);
  return { source: "gemini", model, text };
}

async function handleRequest(req, res) {
  if (!req.url) {
    json(res, 400, { message: "Missing URL." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": currentCorsOrigin(),
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/health") {
    const healthPayload = {
      ok: true,
      mode: debugPreview ? "local-debug" : "provider",
      port,
      host,
      webhooks: {
        phone: smsWebhookUrl.length > 0,
        email: emailWebhookUrl.length > 0
      },
      providers: {
        twilioSms: smsDeliveryConfigured && twilioAccountSid.length > 0,
        sendgridEmail: emailDeliveryConfigured && sendgridApiKey.length > 0,
        geminiAi: geminiConfigured
      },
      adminAuth: getAdminAuthSummary(),
      ai: {
        defaultModel: geminiModel,
        modelCandidates: geminiModelCandidates
      },
      limits: {
        codeTtlMs,
        requestWindowMs,
        maxRequestsPerWindow,
        maxConfirmAttempts,
        providerTimeoutMs,
        geminiTimeoutMs
      },
      pending: pendingVerifications.size,
      debugPreview
    };

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": currentCorsOrigin(),
        "Vary": "Origin",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      });
      res.end();
      return;
    }

    json(res, 200, healthPayload);
    return;
  }

  if ((req.method === "GET" || req.method === "POST") && url.pathname === "/presence") {
    try {
      if (req.method === "POST") {
        const body = await readBody(req);
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
        if (sessionId.length === 0) {
          json(res, 400, { message: "sessionId is required." });
          return;
        }

        const now = Date.now();
        const current = presenceSessions.get(sessionId) ?? {
          sessionId,
          platform: "unknown",
          role: "guest",
          firstSeenAt: now,
          lastSeenAt: now
        };

        presenceSessions.set(sessionId, {
          sessionId,
          platform: typeof body?.platform === "string" && body.platform.trim().length > 0 ? body.platform.trim() : current.platform,
          role: typeof body?.role === "string" && body.role.trim().length > 0 ? body.role.trim() : current.role,
          firstSeenAt: current.firstSeenAt,
          lastSeenAt: now
        });
      }

      json(res, 200, getPresenceSummary());
    } catch (error) {
      json(res, 400, {
        message: error instanceof Error ? error.message : "Could not read presence data."
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/admin/session") {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      json(res, 401, { active: false, message: "Admin session not found or expired." });
      return;
    }
    json(res, 200, {
      active: true,
      loginId: session.loginId,
      issuedAt: new Date(session.issuedAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString()
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/admin/login") {
    try {
      const body = await readBody(req);
      const loginId = sanitizeAdminLoginId(body?.loginId);
      const code = String(body?.code ?? "").trim();
      if (loginId.length === 0 || code.length === 0) {
        json(res, 400, { message: "loginId and code are required." });
        return;
      }
      if (!adminAuthConfigured) {
        json(res, 503, {
          message: "Admin auth is not configured on the backend yet."
        });
        return;
      }

      const now = Date.now();
      const attempt = adminLoginAttempts.get(loginId) ?? { attempts: 0, lockedUntilAt: 0 };
      if (attempt.lockedUntilAt > now) {
        json(res, 429, {
          message: "Admin login is temporarily locked. Please try again later.",
          lockedUntilAt: new Date(attempt.lockedUntilAt).toISOString()
        });
        return;
      }

      if (loginId !== adminLoginIdentity || code !== adminLoginCode) {
        const attempts = attempt.attempts + 1;
        const lockedUntilAt =
          attempts >= adminMaxFailedAttempts ? now + adminLockoutTtlMs : attempt.lockedUntilAt;
        adminLoginAttempts.set(loginId, {
          attempts: lockedUntilAt > now ? 0 : attempts,
          lockedUntilAt
        });
        json(res, 401, {
          message: "Admin credentials did not match."
        });
        return;
      }

      adminLoginAttempts.delete(loginId);
      const token = `adm_${randomUUID()}`;
      const issuedAt = now;
      const expiresAt = now + adminSessionTtlMs;
      adminSessions.set(token, { token, loginId, issuedAt, expiresAt });
      json(res, 200, {
        active: true,
        token,
        loginId,
        issuedAt: new Date(issuedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString()
      });
    } catch (error) {
      json(res, 400, {
        message: error instanceof Error ? error.message : "Could not process admin login."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/admin/logout") {
    const session = getAdminSessionFromRequest(req);
    if (session) {
      for (const [token, current] of adminSessions.entries()) {
        if (current.token === session.token) {
          adminSessions.delete(token);
          break;
        }
      }
    }
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai/help") {
    try {
      const body = await readBody(req);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (text.length === 0) {
        json(res, 400, { message: "text is required." });
        return;
      }

      const result = await generateGeminiAIHelp(body);
      json(res, 200, {
        source: result.source,
        model: result.model,
        text: result.text
      });
    } catch (error) {
      json(res, 503, {
        source: "fallback",
        model: "fallback",
        text: buildFallbackAIReply({ text: "", route: "general" }),
        message: error instanceof Error ? error.message : "Could not generate AI help."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai/brief") {
    try {
      const body = await readBody(req);
      const result = await generateGeminiBrief(body);
      json(res, 200, { source: result.source, model: result.model ?? "fallback", text: result.text });
    } catch (error) {
      json(res, 503, {
        source: "fallback",
        model: "fallback",
        text: buildBriefFallback({}),
        message: error instanceof Error ? error.message : "Could not generate brief."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai/birth-chart") {
    try {
      const body = await readBody(req);
      const dob = typeof body?.dob === "string" ? body.dob.trim() : "";
      const birthTime = typeof body?.birthTime === "string" ? body.birthTime.trim() : "";
      const birthPlace = typeof body?.birthPlace === "string" ? body.birthPlace.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{2}:\d{2}$/.test(birthTime) || birthPlace.length < 3) {
        json(res, 400, {
          source: "fallback",
          model: "fallback",
          text: "Enter exact date of birth, 24-hour birth time, and full birth place before generating a birth-chart reading."
        });
        return;
      }
      const result = await generateGeminiBirthChart(body);
      json(res, 200, { source: result.source, model: result.model ?? "fallback", text: result.text });
    } catch (error) {
      json(res, 503, {
        source: "fallback",
        model: "fallback",
        text: buildBirthChartFallback({}),
        message: error instanceof Error ? error.message : "Could not generate birth chart horoscope."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai/journal") {
    try {
      const body = await readBody(req);
      const note = typeof body?.note === "string" ? body.note.trim() : "";
      if (note.length < 10) {
        json(res, 400, { message: "note is required (min 10 chars)." });
        return;
      }
      const result = await generateGeminiJournalInsight(body);
      json(res, 200, { source: result.source, model: result.model ?? "fallback", text: result.text });
    } catch (error) {
      json(res, 503, {
        source: "fallback",
        model: "fallback",
        text: buildJournalFallback({}),
        message: error instanceof Error ? error.message : "Could not analyse journal entry."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/ai/insights") {
    try {
      const body = await readBody(req);
      const result = await generateGeminiInsights(body);
      json(res, 200, { source: result.source, model: result.model ?? "fallback", text: result.text });
    } catch (error) {
      json(res, 503, {
        source: "fallback",
        model: "fallback",
        text: buildInsightsFallback({}),
        message: error instanceof Error ? error.message : "Could not generate insights."
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/verification/request") {
    try {
      const body = await readBody(req);
      const channel = body?.channel === "email" ? "email" : body?.channel === "phone" ? "phone" : null;
      const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
      const email = typeof body?.email === "string" ? body.email.trim() : "";

      if (!channel) {
        json(res, 400, { message: "channel must be phone or email." });
        return;
      }
      if (channel === "phone" && phone.length === 0) {
        json(res, 400, { message: "phone is required for phone verification." });
        return;
      }
      if (channel === "email" && email.length === 0) {
        json(res, 400, { message: "email is required for email verification." });
        return;
      }

      const key = keyFor(channel, phone, email);
      const requestTimestamps = withinWindow(requestHistory.get(key) ?? [], requestWindowMs);
      if (requestTimestamps.length >= maxRequestsPerWindow) {
        requestHistory.set(key, requestTimestamps);
        json(res, 429, {
          message: "Too many verification requests. Please wait before trying again."
        });
        return;
      }
      requestTimestamps.push(Date.now());
      requestHistory.set(key, requestTimestamps);

      const code = makeCode();
      const deliveryId = makeDeliveryId();
      const destination = channel === "phone" ? phone : email;
      const expiresAt = Date.now() + codeTtlMs;

      await deliverCode({ channel, code, destination, deliveryId, body });

      pendingVerifications.set(key, {
        code,
        expiresAt,
        deliveryId,
        destination,
        channel,
        attempts: 0
      });

      json(res, 200, {
        destination,
        deliveryId,
        message: `Verification code queued for ${channel}.`,
        ...(debugPreview ? { previewCode: code } : {})
      });
    } catch (error) {
      json(res, 400, { message: error instanceof Error ? error.message : "Could not create verification code." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/verification/confirm") {
    try {
      const body = await readBody(req);
      const channel = body?.channel === "email" ? "email" : body?.channel === "phone" ? "phone" : null;
      const code = typeof body?.code === "string" ? body.code.trim() : "";
      const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
      const email = typeof body?.email === "string" ? body.email.trim() : "";

      if (!channel) {
        json(res, 400, { verified: false, message: "channel must be phone or email." });
        return;
      }
      if (code.length === 0) {
        json(res, 400, { verified: false, message: "code is required." });
        return;
      }

      const key = keyFor(channel, phone, email);
      const entry = pendingVerifications.get(key);
      if (!entry) {
        json(res, 404, { verified: false, message: "No pending verification found." });
        return;
      }
      if (Date.now() > entry.expiresAt) {
        pendingVerifications.delete(key);
        json(res, 410, { verified: false, message: "Verification code expired." });
        return;
      }
      if (entry.code !== code) {
        entry.attempts += 1;
        if (entry.attempts >= maxConfirmAttempts) {
          pendingVerifications.delete(key);
          json(res, 429, {
            verified: false,
            message: "Too many incorrect attempts. Request a new verification code."
          });
          return;
        }
        json(res, 401, { verified: false, message: "Verification code did not match." });
        return;
      }

      pendingVerifications.delete(key);
      json(res, 200, {
        verified: true,
        message: `Verification complete for ${channel}.`
      });
    } catch (error) {
      json(res, 400, { verified: false, message: error instanceof Error ? error.message : "Could not confirm verification." });
    }
    return;
  }

  json(res, 404, { message: "Not found." });
}

const server = createServer((req, res) => {
  void requestContext.run({ corsOrigin: resolveCorsOrigin(req) }, () => handleRequest(req, res));
});

server.listen(port, host, () => {
  console.log(`Aethon Beacon verification server listening on http://${host}:${port}`);
  console.log(`Debug preview ${debugPreview ? "enabled" : "disabled"}.`);
});
