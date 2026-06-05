export default async function phase8ReportingUiSmoke({ frontendBaseUrl, assert, requestJson }) {
  const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
  const revops = "user_irina";
  const manager = "user_michael";
  const rep = "user_anna";
  const stamp = Date.now();

  await createReportingFixture({ requestJson, revops, stamp });

  const refresh = await requestJson("/api/reporting/dashboard/refresh", {
    method: "POST",
    userId: revops,
  });
  assert(refresh.status === 200, "RevOps reporting refresh failed before UI smoke", refresh);

  const revopsCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(revopsCdp, frontendBaseUrl, revops);
    await revopsCdp.waitFor(
      'document.body.innerText.includes("Reporting Dashboard") && document.body.innerText.includes("Stage Breakdown")',
      "RevOps reporting dashboard",
    );
    await revopsCdp.waitFor(
      'document.body.innerText.includes("Forecast By Month") && document.body.innerText.includes("qualification")',
      "RevOps reporting metrics",
    );
    await clickReportingRefresh(revopsCdp);
    await revopsCdp.waitFor(
      'document.body.innerText.includes("Projection refreshed")',
      "RevOps reporting refresh success",
    );
  } finally {
    revopsCdp.close();
  }

  const managerCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(managerCdp, frontendBaseUrl, manager);
    await managerCdp.waitFor(
      'document.body.innerText.includes("Reporting Dashboard") && document.body.innerText.includes("Open opportunities")',
      "Sales Manager reporting dashboard",
    );
    const managerHasRefresh = await managerCdp.evalExpr(`(() => {
      const dashboard = document.querySelector('.reporting-workspace');
      return !!dashboard && Array.from(dashboard.querySelectorAll('button'))
        .some((button) => button.textContent.trim() === 'Refresh');
    })()`);
    assert(!managerHasRefresh, "Sales Manager should not see reporting refresh control");
  } finally {
    managerCdp.close();
  }

  const repCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(repCdp, frontendBaseUrl, rep);
    await repCdp.waitFor(
      'document.body.innerText.includes("CRM Workspace")',
      "Sales Rep workspace",
    );
    const repHasDashboard = await repCdp.evalExpr('document.body.innerText.includes("Reporting Dashboard")');
    assert(!repHasDashboard, "Sales Rep should not see reporting dashboard");
  } finally {
    repCdp.close();
  }

  return {
    stamp,
    refreshedAt: refresh.json.projection.refreshedAt,
    revopsDashboardChecked: true,
    managerDashboardChecked: true,
    repVisibilityChecked: true,
  };
}

async function createReportingFixture({ requestJson, revops, stamp }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: `Phase 8 UI Reporting Account ${stamp}`,
      website: "https://phase8-reporting-ui.example",
    },
  });
  if (account.status !== 201) {
    throw new Error(`Reporting UI fixture account failed: ${JSON.stringify(account, null, 2)}`);
  }

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      title: `Phase 8 UI Reporting Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 76543.21,
      closeDate: "2026-12-20",
    },
  });
  if (opportunity.status !== 201) {
    throw new Error(`Reporting UI fixture opportunity failed: ${JSON.stringify(opportunity, null, 2)}`);
  }
}

async function openAsUser(cdp, frontendBaseUrl, userId) {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: frontendBaseUrl });
  await cdp.waitFor('document.readyState === "complete"', "initial frontend load");
  await cdp.evalExpr(`localStorage.setItem('salesops-demo-user-id', ${JSON.stringify(userId)})`);
  await cdp.send("Page.navigate", { url: frontendBaseUrl });
  await cdp.waitFor('document.readyState === "complete"', `${userId} frontend load`);
}

async function clickReportingRefresh(cdp) {
  await cdp.evalExpr(`(() => {
    const dashboard = document.querySelector('.reporting-workspace');
    const button = Array.from(dashboard.querySelectorAll('button'))
      .find((candidate) => candidate.textContent.trim() === 'Refresh');
    button.click();
    return true;
  })()`);
}

async function connectToChrome(chromeDebugBaseUrl) {
  const target = await (await fetch(`${chromeDebugBaseUrl}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, (msg) => msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result));
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
  const evalExpr = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
  };
  const waitFor = async (expression, label, timeoutMs = 25000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evalExpr(expression)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const text = await evalExpr("document.body.innerText");
    throw new Error(`Timed out waiting for ${label}\n${text}`);
  };

  return {
    send,
    evalExpr,
    waitFor,
    close: () => ws.close(),
  };
}
