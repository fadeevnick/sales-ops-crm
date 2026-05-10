import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const runtimeSmokePath = join(scriptDir, "runtime-smoke.mjs");
const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
const chromeCommand = process.env.RUNTIME_SMOKE_CHROME_BIN ?? "google-chrome";

const gates = [
  { scenario: "health" },
  { scenario: "phase9-pilot-e2e" },
  { scenario: "phase9-import-matrix" },
  { scenario: "phase9-metadata-safety" },
  { scenario: "phase9-metadata-rollback" },
  { scenario: "phase9-approval-negative" },
  { scenario: "phase8-reporting-foundation" },
  { scenario: "phase8-reporting-drilldown" },
  { scenario: "phase8-reporting-ui", requiresChrome: true },
  { scenario: "phase8-reporting-drilldown-ui", requiresChrome: true },
];

const startedAt = Date.now();
let chrome = null;
let startedChrome = false;
const results = [];

try {
  if (gates.some((gate) => gate.requiresChrome)) {
    startedChrome = !(await isChromeDebugReady());
    if (startedChrome) {
      chrome = startChrome();
      await waitForChromeDebug();
    }
  }

  for (const gate of gates) {
    const result = await runGate(gate.scenario);
    results.push(result);
  }

  console.log(JSON.stringify({
    suite: "pilot-smoke",
    ok: true,
    durationMs: Date.now() - startedAt,
    gates: results,
    chromeStartedBySuite: startedChrome,
  }, null, 2));
} finally {
  if (startedChrome) {
    await closeChromeDebug().catch(() => {});
    if (chrome && !chrome.killed) {
      chrome.kill("SIGTERM");
    }
  }
}

async function runGate(scenario) {
  const started = Date.now();
  console.log(`[pilot-smoke] running ${scenario}`);

  await runCommand(process.execPath, [runtimeSmokePath, scenario]);

  return {
    scenario,
    ok: true,
    durationMs: Date.now() - started,
  };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

function startChrome() {
  const child = spawn(chromeCommand, [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=9223",
    "--disable-gpu",
    "--no-sandbox",
    "about:blank",
  ], {
    stdio: "ignore",
  });

  child.on("error", (error) => {
    throw error;
  });

  return child;
}

async function waitForChromeDebug() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await isChromeDebugReady()) {
      return;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for Chrome DevTools at ${chromeDebugBaseUrl}`);
}

async function isChromeDebugReady() {
  try {
    const response = await fetch(`${chromeDebugBaseUrl}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

async function closeChromeDebug() {
  const info = await (await fetch(`${chromeDebugBaseUrl}/json/version`)).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
  await delay(500);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
