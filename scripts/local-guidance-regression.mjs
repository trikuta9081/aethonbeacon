import { spawn } from "node:child_process";

const port = 18787 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, ["scripts/verification-server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    GUIDANCE_SERVICE_KEY: "",
    GEMINI_API_KEY: "",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GUIDANCE_MAX_REQUESTS_PER_WINDOW: "100",
    VERIFICATION_CORS_ORIGIN: "*"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

const scenarios = [
  ["urgent danger", "I am unsafe and someone is threatening me", "urgent", ["112", "Help"]],
  ["self harm", "I may hurt myself tonight", "urgent", ["SOS", "112"]],
  ["cyber fraud", "My UPI account was used in an online fraud", "redress", ["1930", "cybercrime.gov.in"]],
  ["cyber stalking", "Someone is stalking and blackmailing me online", "redress", ["cybercrime.gov.in", "evidence"]],
  ["bank dispute", "The bank rejected my complaint about a payment", "redress", ["transaction", "Help"]],
  ["consumer refund", "A product seller refuses my refund", "redress", ["contract", "Help"]],
  ["institution complaint", "My college ignored my written complaint", "redress", ["evidence", "first office"]],
  ["police complaint", "I need to register an FIR for theft", "redress", ["facts", "Help"]],
  ["ragging", "There is ragging and intimidation in my hostel", "redress", ["complaint", "Help"]],
  ["workplace", "My employer is retaliating against me at work", "redress", ["timeline", "HR"]],
  ["factory safety", "My factory has an unsafe working condition", "redress", ["112", "Help"]],
  ["health", "I have persistent symptoms and need a doctor", "professional", ["symptom", "Path"]],
  ["panic", "My panic is affecting sleep and daily function", "professional", ["professional", "Path"]],
  ["academic", "I am overwhelmed by exams and cannot choose a task", "guide", ["25-minute", "Path"]],
  ["career", "I do not know what career step to take", "guide", ["question", "Path"]],
  ["relationship", "My partner ignores my boundary and I feel afraid", "guide", ["boundary", "Help"]],
  ["grief", "I feel lonely after a loss", "general", ["connection", "Path"]],
  ["housing", "My landlord raised rent unlawfully and the water is cut", "redress", ["address", "Help"]],
  ["recovery", "I am worried about alcohol withdrawal and relapse", "professional", ["professional", "Path"]],
  ["anger", "I am angry and might react badly", "guide", ["step", "Path"]],
  ["general", "I do not know how to start solving this issue", "general", ["fact", "Path"]],
  ["mixed", "My workplace problem is also affecting my health", "professional", ["payslips", "HR"]]
];

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local guidance server did not start. ${output}`);
}

try {
  await waitForServer();
  const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.providers?.guidanceServiceLive !== false || health.providers?.guidanceServiceMode !== "local-independent") {
    throw new Error("health did not identify the independent local guidance engine");
  }
  for (const [name, text, route, expected] of scenarios) {
    const response = await fetch(`http://127.0.0.1:${port}/guidance/help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, route, emergencyNumber: "112" })
    });
    const payload = await response.json();
    const body = String(payload.text ?? "");
    if (!response.ok || payload.source !== "fallback" || !/^What this means:/m.test(body)) {
      throw new Error(`${name}: expected a structured local fallback response`);
    }
    for (const term of expected) {
      if (!body.toLowerCase().includes(term.toLowerCase())) {
        throw new Error(`${name}: missing actionable term ${term}; response was ${body.replace(/\n/g, " | ")}`);
      }
    }
  }
  const endpointScenarios = [
    ["brief", "/guidance/brief", { name: "Test", issueLabel: "stress", hour: 9 }, "stress"],
    ["birth chart", "/guidance/birth-chart", { dob: "1977-08-10", birthTime: "10:45", birthPlace: "Jammu", moonRashiName: "Mithuna", nakshatraName: "Mrigashira" }, "Moon chart"],
    ["journal", "/guidance/journal", { note: "I feel anxious and exhausted", score: 50 }, "anxiety"],
    ["insights", "/guidance/insights", { weekAvg: 50, monthAvg: 65, streakDays: 2, topTone: "anxious" }, "50.0/100"]
  ];
  for (const [name, path, body, expected] of endpointScenarios) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    const text = String(payload.text ?? "");
    if (!response.ok || payload.source !== "fallback" || text.length < 40 || !text.toLowerCase().includes(expected.toLowerCase())) {
      throw new Error(`${name}: expected an actionable local response; response was ${text.replace(/\n/g, " | ")}`);
    }
  }
  console.log(`Local guidance regression passed: ${scenarios.length}/${scenarios.length} offline scenarios.`);
} finally {
  server.kill("SIGTERM");
}
