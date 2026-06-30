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
const geminiConfigured = hasValue("GEMINI_API_KEY");
const phoneDeliveryConfigured = smsWebhookConfigured || twilioConfigured;
const emailDeliveryConfigured = emailWebhookConfigured || sendgridConfigured;

const errors = [];
const warnings = [];

if (debugPreview) {
  warnings.push("LOCAL_VERIFICATION_DEBUG=1 exposes preview OTPs and must not be used for public launch.");
}

if (hasValue("VERIFICATION_SMS_WEBHOOK_URL") && !smsWebhookConfigured) {
  warnings.push("VERIFICATION_SMS_WEBHOOK_URL is set but is not a valid http/https URL, so it will be ignored.");
}

if (hasValue("VERIFICATION_EMAIL_WEBHOOK_URL") && !emailWebhookConfigured) {
  warnings.push("VERIFICATION_EMAIL_WEBHOOK_URL is set but is not a valid http/https URL, so it will be ignored.");
}

if (!debugPreview && !phoneDeliveryConfigured && !emailDeliveryConfigured) {
  errors.push(
    "At least one OTP delivery channel is not configured. Add Twilio settings or VERIFICATION_SMS_WEBHOOK_URL for phone, or SendGrid settings or VERIFICATION_EMAIL_WEBHOOK_URL for email."
  );
}

if (!debugPreview && !phoneDeliveryConfigured) {
  warnings.push(
    "Phone OTP delivery is not configured, so phone verification will stay unavailable until Twilio settings or VERIFICATION_SMS_WEBHOOK_URL are added."
  );
}

if (!debugPreview && !emailDeliveryConfigured) {
  warnings.push(
    "Email OTP delivery is not configured, so email verification will stay unavailable until SendGrid settings or VERIFICATION_EMAIL_WEBHOOK_URL are added."
  );
}

if (readEnv("VERIFICATION_HOST") !== "0.0.0.0") {
  warnings.push("For public Docker hosting, VERIFICATION_HOST should usually be 0.0.0.0.");
}

if (readEnv("VERIFICATION_CORS_ORIGIN") === "*") {
  warnings.push("For public web launch, set VERIFICATION_CORS_ORIGIN to the production web origin.");
}

if (!hasValue("EXPO_PUBLIC_VERIFICATION_API_BASE_URL")) {
  warnings.push("Set EXPO_PUBLIC_VERIFICATION_API_BASE_URL before building public app binaries.");
}

if (!geminiConfigured) {
  warnings.push("GEMINI_API_KEY is not set, so AI Help will use the local fallback instead of Gemini.");
}

const result = {
  ok: errors.length === 0,
  debugPreview,
  delivery: {
    phone: smsWebhookConfigured ? "webhook" : twilioConfigured ? "twilio" : "missing",
    email: emailWebhookConfigured ? "webhook" : sendgridConfigured ? "sendgrid" : "missing",
    gemini: geminiConfigured ? "gemini" : "fallback"
  },
  warnings,
  errors
};

console.log(JSON.stringify(result, null, 2));

if (errors.length > 0) {
  process.exit(1);
}
