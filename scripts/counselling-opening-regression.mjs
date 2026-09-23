import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../App.tsx", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  source.includes("function buildCounsellingIssueAnchor(initialIssue: string, languageId: LanguageId)"),
  "Counselling opening must have an explicit issue anchor helper"
);
assert(
  source.includes("const issueAnchor = buildCounsellingIssueAnchor(initialIssue, languageId);"),
  "Counselling opening must build the anchor from the submitted issue"
);
assert(
  source.includes("${welcome}\\n\\n${issueAnchor}\\n\\n${openingHeard}"),
  "Submitted issue must appear before generic or persisted profile context"
);
assert(
  source.includes("setOnboardingCompleted(true);\n          setOnboardingCompletedAt(new Date().toISOString());\n          setHasSeenWelcomeCard(true);"),
  "Closing the optional profile prompt must persist a skip state"
);

console.log("Counselling opening regression checks passed (4/4)");
