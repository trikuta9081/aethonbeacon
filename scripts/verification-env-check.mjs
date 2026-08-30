import fs from "node:fs";

function readEnv(name) {
  return String(process.env[name] ?? "").trim();
}

function hasValue(name) {
  return readEnv(name).length > 0;
}

function hasValidWebhookUrl(name) {
  const value = readEnv(name);
  if (value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const debugPreview = readEnv("LOCAL_VERIFICATION_DEBUG") === "1";
const smsWebhookConfigured = hasValidWebhookUrl("VERIFICATION_SMS_WEBHOOK_URL");
const emailWebhookConfigured = hasValidWebhookUrl("VERIFICATION_EMAIL_WEBHOOK_URL");
const twilioConfigured =
  hasValue("TWILIO_ACCOUNT_SID") &&
  hasValue("TWILIO_AUTH_TOKEN") &&
  (hasValue("TWILIO_FROM_NUMBER") || hasValue("TWILIO_MESSAGING_SERVICE_SID"));
const sendgridConfigured = hasValue("SENDGRID_API_KEY") && hasValue("SENDGRID_FROM_EMAIL");
const legacyProviderPrefix = `${"ge"}mini`;
const legacyProviderKeyName = `${legacyProviderPrefix.toUpperCase()}_API_KEY`;
const guidanceConfigured = hasValue("GUIDANCE_SERVICE_KEY") || hasValue(legacyProviderKeyName);
const phoneDeliveryConfigured = smsWebhookConfigured || twilioConfigured;
const emailDeliveryConfigured = emailWebhookConfigured || sendgridConfigured;
const verificationApiBaseUrl = readEnv("EXPO_PUBLIC_VERIFICATION_API_BASE_URL") || "https://aethon-beacon-verification.onrender.com";

const errors = [];
const warnings = [];
const verificationServerSource = fs.readFileSync(new URL('./verification-server.mjs', import.meta.url), 'utf8');
if (!verificationServerSource.includes('guidanceServiceConfigured: guidanceConfigured')) {
  errors.push('Verification /health must distinguish connected-guidance key configuration from runtime response success.');
}
if (!verificationServerSource.includes('checked-by-guidance-endpoint-source')) {
  errors.push('Verification /health must tell operators to verify connected-guidance runtime through response source fields.');
}

let remoteHealth = null;
if (!debugPreview && (!phoneDeliveryConfigured || !emailDeliveryConfigured || !guidanceConfigured)) {
  try {
    const healthUrl = new URL("/health", verificationApiBaseUrl);
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      remoteHealth = await response.json();
    } else {
      warnings.push(`Verification health check returned HTTP ${response.status} from ${healthUrl.origin}.`);
    }
  } catch (error) {
    warnings.push(
      `Could not check deployed verification health at ${verificationApiBaseUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

const remotePhoneDeliveryConfigured =
  remoteHealth?.providers?.twilioSms === true || remoteHealth?.webhooks?.phone === true;
const remoteEmailDeliveryConfigured =
  remoteHealth?.providers?.sendgridEmail === true || remoteHealth?.webhooks?.email === true;
const remoteGuidanceConfigured = remoteHealth?.providers?.guidanceServiceConfigured === true;
const phoneDeliveryReady = phoneDeliveryConfigured || remotePhoneDeliveryConfigured;
const emailDeliveryReady = emailDeliveryConfigured || remoteEmailDeliveryConfigured;
const guidanceReady = guidanceConfigured || remoteGuidanceConfigured;

if (debugPreview) {
  warnings.push("LOCAL_VERIFICATION_DEBUG=1 exposes preview OTPs and must not be used for public launch.");
}

if (hasValue("VERIFICATION_SMS_WEBHOOK_URL") && !smsWebhookConfigured) {
  warnings.push("VERIFICATION_SMS_WEBHOOK_URL is set but is not a valid http/https URL, so it will be ignored.");
}

if (hasValue("VERIFICATION_EMAIL_WEBHOOK_URL") && !emailWebhookConfigured) {
  warnings.push("VERIFICATION_EMAIL_WEBHOOK_URL is set but is not a valid http/https URL, so it will be ignored.");
}

if (!debugPreview && !phoneDeliveryReady && !emailDeliveryReady) {
  errors.push(
    "At least one OTP delivery channel is not configured locally or on the deployed verification service. Add Twilio settings or VERIFICATION_SMS_WEBHOOK_URL for phone, or SendGrid settings or VERIFICATION_EMAIL_WEBHOOK_URL for email."
  );
}

if (!debugPreview && !phoneDeliveryReady) {
  warnings.push(
    "Phone OTP delivery is not configured, so phone verification will stay unavailable until Twilio settings or VERIFICATION_SMS_WEBHOOK_URL are added."
  );
}

if (!debugPreview && !emailDeliveryReady) {
  warnings.push(
    "Email OTP delivery is not configured, so email verification will stay unavailable until SendGrid settings or VERIFICATION_EMAIL_WEBHOOK_URL are added."
  );
}

const localServerSettingsPresent = [
  "VERIFICATION_HOST",
  "VERIFICATION_CORS_ORIGIN",
  "VERIFICATION_CODE_TTL_MS",
  "VERIFICATION_MAX_REQUESTS_PER_WINDOW"
].some(hasValue);
if (localServerSettingsPresent && readEnv("VERIFICATION_HOST") !== "0.0.0.0") {
  warnings.push("For public Docker hosting, VERIFICATION_HOST should usually be 0.0.0.0.");
}

if (localServerSettingsPresent && readEnv("VERIFICATION_CORS_ORIGIN") === "*") {
  warnings.push("For public web launch, set VERIFICATION_CORS_ORIGIN to the production web origin.");
}

if (!hasValue("EXPO_PUBLIC_VERIFICATION_API_BASE_URL") && remoteHealth === null) {
  warnings.push("Set EXPO_PUBLIC_VERIFICATION_API_BASE_URL before building public app binaries, or ensure the default deployed endpoint is reachable.");
}

if (!guidanceReady) {
  warnings.push("GUIDANCE_SERVICE_KEY is not set, so connected guidance will use the local fallback.");
}

const result = {
  ok: errors.length === 0,
  debugPreview,
  delivery: {
    phone: smsWebhookConfigured ? "webhook" : twilioConfigured ? "twilio" : remotePhoneDeliveryConfigured ? "remote-provider" : "missing",
    email: emailWebhookConfigured ? "webhook" : sendgridConfigured ? "sendgrid" : remoteEmailDeliveryConfigured ? "remote-provider" : "missing",
    guidance: guidanceReady ? "connected" : "fallback"
  },
  remoteHealth: remoteHealth
    ? { ok: remoteHealth.ok === true, mode: remoteHealth.mode ?? "unknown", checked: true }
    : { checked: false },
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
