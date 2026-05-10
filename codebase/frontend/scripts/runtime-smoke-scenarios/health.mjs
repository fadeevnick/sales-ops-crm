export default async function healthSmoke({ apiBaseUrl, frontendBaseUrl, assert, requestJson }) {
  const ready = await requestJson("/readyz", { baseUrl: apiBaseUrl });
  assert(ready.status === 200, "Backend readiness check failed", ready);
  assert(ready.json?.status === "ready", "Backend readiness status mismatch", ready.json);

  const frontend = await fetch(frontendBaseUrl);
  const html = await frontend.text();
  assert(frontend.ok, "Frontend health check failed", { status: frontend.status });
  assert(html.includes('<div id="root"></div>'), "Frontend HTML root marker missing");

  return {
    backend: {
      baseUrl: apiBaseUrl,
      status: ready.json.status,
    },
    frontend: {
      baseUrl: frontendBaseUrl,
      status: frontend.status,
    },
  };
}
