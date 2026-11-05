// Reproducible local acceptance. Live checks are opt-in and read-only.
import { spawn, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (!["--live-readonly", "--skip-browser"].includes(arg))
    throw new Error("Unknown verification option: " + arg);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run through npm run verify:sprint3.");
function sourceFingerprint() {
  const files = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      "src",
      "supabase",
      "scripts",
      "tests",
      ".github",
      "package.json",
      "package-lock.json",
      "playwright*.ts",
      "tsconfig*.json",
      "vite.config.ts",
      "docs/previews/sprint3-live-gemini.json",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file + "\0");
    try {
      hash.update(readFileSync(join(root, file)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("<deleted>");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}
const report = {
  startedAt: new Date().toISOString(),
  node: process.version,
  repositoryHead: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  sourceFingerprint: sourceFingerprint(),
  scope:
    "Local PostgreSQL, synthetic provider fixtures and browser regressions",
  checks: [],
  limitations: [
    "Mocked provider checks do not establish real AI generation or venue prices.",
    "No deployment, commit, push, signup email or Product Owner acceptance is performed.",
  ],
};
const checks = [
  ["Unit, integration and database security", [npm, "test"]],
  ["Lint", [npm, "run", "lint"]],
  ["Edge Function types", [npm, "run", "check:functions"]],
  ["Packaged migration bootstrap", [npm, "run", "verify:edge"]],
  ["Frontend types and production build", [npm, "run", "build"]],
  [
    "Brief, proposal, budget and venue browsers",
    [npm, "run", "test:e2e"],
    true,
  ],
  ["Signup approval browsers", [npm, "run", "test:e2e:onboarding"], true],
  ["Fresh clone shared-backend routing", [npm, "run", "test:e2e:shared"], true],
];
if (args.has("--live-readonly")) {
  checks.push(
    [
      "Live Auth configuration",
      ["--env-file-if-exists=.env.local", "scripts/check-auth.mjs"],
    ],
    [
      "Live anonymous access denial",
      ["--env-file-if-exists=.env.local", "tests/live-anonymous.mjs"],
    ],
  );
}
const output = join(root, "test-results", "sprint3-verification.json");
const save = async () => {
  await mkdir(join(root, "test-results"), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
};
for (const [name, command, browser] of checks) {
  const check = {
    name,
    status: "running",
    startedAt: new Date().toISOString(),
  };
  report.checks.push(check);
  if (browser && args.has("--skip-browser")) {
    check.status = "skipped";
    continue;
  }
  console.log("\nChecking: " + name);
  const started = performance.now();
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, command, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      timeout: 300000,
    });
    child.once("error", () =>
      resolve({ exitCode: null, signal: "process-error" }),
    );
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  Object.assign(check, result, {
    status: result.exitCode === 0 ? "passed" : "failed",
    durationMs: Math.round(performance.now() - started),
  });
  await save();
}
report.completedAt = new Date().toISOString();
report.sourceChangedDuringVerification =
  report.sourceFingerprint !== sourceFingerprint();
report.passed =
  !report.sourceChangedDuringVerification &&
  report.checks.every((check) => check.status === "passed");
if (report.sourceChangedDuringVerification)
  console.error(
    "Source files changed during verification. Rerun against the final working tree.",
  );
await save();
console.table(
  report.checks.map(({ name, status }) => ({ check: name, status })),
);
console.log("Verification evidence: " + output);
// A skipped required check must not report full verification success.
process.exitCode = report.passed ? 0 : 1;
