import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scenariosDir = join(scriptDir, "runtime-smoke-scenarios");
const scenarioName = process.argv[2] ?? "list";

const apiBaseUrl = process.env.RUNTIME_SMOKE_API_BASE_URL ?? "http://127.0.0.1:8081";
const frontendBaseUrl = process.env.RUNTIME_SMOKE_FRONTEND_BASE_URL ?? "http://localhost:5173";

if (scenarioName === "list" || scenarioName === "--help" || scenarioName === "-h") {
  await printScenarioList();
  process.exit(0);
}

if (!/^[a-z0-9][a-z0-9_-]*$/.test(scenarioName)) {
  throw new Error(`Invalid runtime smoke scenario name: ${scenarioName}`);
}

const scenarioPath = join(scenariosDir, `${scenarioName}.mjs`);
const scenarioModule = await import(pathToFileURL(scenarioPath).href);

if (typeof scenarioModule.default !== "function") {
  throw new Error(`Runtime smoke scenario "${scenarioName}" must export a default async function`);
}

const startedAt = Date.now();
const result = await scenarioModule.default({
  apiBaseUrl,
  frontendBaseUrl,
  scenarioName,
  assert,
  delay,
  requestJson,
});

console.log(JSON.stringify({
  scenario: scenarioName,
  ok: true,
  durationMs: Date.now() - startedAt,
  result: result ?? null,
}, null, 2));

async function printScenarioList() {
  const entries = await readdir(scenariosDir, { withFileTypes: true }).catch(() => []);
  const scenarios = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => entry.name.replace(/\.mjs$/, ""))
    .sort();

  console.log("Usage: npm run runtime:smoke -- <scenario>");
  console.log("");
  console.log("Environment:");
  console.log(`  RUNTIME_SMOKE_API_BASE_URL      default ${apiBaseUrl}`);
  console.log(`  RUNTIME_SMOKE_FRONTEND_BASE_URL default ${frontendBaseUrl}`);
  console.log("");
  console.log("Scenarios:");
  for (const scenario of scenarios) {
    console.log(`  ${scenario}`);
  }
}

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, options = {}) {
  const baseUrl = options.baseUrl ?? apiBaseUrl;
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.userId ? { "X-Demo-User-Id": options.userId } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}
