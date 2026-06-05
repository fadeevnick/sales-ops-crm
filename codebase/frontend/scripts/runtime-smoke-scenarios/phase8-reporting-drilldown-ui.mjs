export default async function phase8ReportingDrillDownUiSmoke({ frontendBaseUrl, assert, requestJson }) {
  const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
  const revops = "user_irina";
  const manager = "user_michael";
  const rep = "user_anna";
  const stamp = Date.now();
  const visibleTitle = `Phase 8 Drilldown UI Visible ${stamp}`;
  const hiddenTitle = `Phase 8 Drilldown UI Hidden ${stamp}`;

  await createOpportunityFixture({
    requestJson,
    revops,
    stamp: `${stamp}-visible`,
    ownerId: rep,
    title: visibleTitle,
  });
  await createOpportunityFixture({
    requestJson,
    revops,
    stamp: `${stamp}-hidden`,
    ownerId: revops,
    title: hiddenTitle,
  });

  const refresh = await requestJson("/api/reporting/dashboard/refresh", {
    method: "POST",
    userId: revops,
  });
  assert(refresh.status === 200, "RevOps reporting refresh failed before drill-down UI smoke", refresh);

  const revopsCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(revopsCdp, frontendBaseUrl, revops);
    await revopsCdp.waitFor(
      'document.body.innerText.includes("Reporting Dashboard") && document.body.innerText.includes("Stage Breakdown")',
      "RevOps reporting dashboard",
    );
    await clickStageDrillDown(revopsCdp, "qualification");
    await revopsCdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(visibleTitle)}) && document.body.innerText.includes(${JSON.stringify(hiddenTitle)})`,
      "RevOps stage drill-down rows",
    );
  } finally {
    revopsCdp.close();
  }

  const managerCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(managerCdp, frontendBaseUrl, manager);
    await managerCdp.waitFor(
      'document.body.innerText.includes("Reporting Dashboard") && document.body.innerText.includes("Stage Breakdown")',
      "Sales Manager reporting dashboard",
    );
    await clickStageDrillDown(managerCdp, "qualification");
    await managerCdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(visibleTitle)})`,
      "Sales Manager team-visible drill-down row",
    );
    const managerSeesHidden = await managerCdp.evalExpr(
      `document.body.innerText.includes(${JSON.stringify(hiddenTitle)})`,
    );
    assert(!managerSeesHidden, "Sales Manager drill-down should not show non-team fixture");
  } finally {
    managerCdp.close();
  }

  const repCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(repCdp, frontendBaseUrl, rep);
    await repCdp.waitFor('document.body.innerText.includes("CRM Workspace")', "Sales Rep workspace");
    const repHasDashboard = await repCdp.evalExpr('document.body.innerText.includes("Reporting Dashboard")');
    assert(!repHasDashboard, "Sales Rep should not see reporting dashboard");
  } finally {
    repCdp.close();
  }

  return {
    stamp,
    visibleTitle,
    hiddenTitle,
    revopsDrillDownChecked: true,
    managerScopeChecked: true,
    repVisibilityChecked: true,
  };
}

async function createOpportunityFixture({ requestJson, revops, stamp, ownerId, title }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: `Phase 8 Drilldown UI Account ${stamp}`,
      ownerId,
      website: "https://phase8-drilldown-ui.example",
    },
  });
  if (account.status !== 201) {
    throw new Error(`Drill-down UI fixture account failed: ${JSON.stringify(account, null, 2)}`);
  }

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      ownerId,
      title,
      stageKey: "qualification",
      expectedAmount: 54321.09,
      closeDate: "2026-01-05",
    },
  });
  if (opportunity.status !== 201) {
    throw new Error(`Drill-down UI fixture opportunity failed: ${JSON.stringify(opportunity, null, 2)}`);
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

async function clickStageDrillDown(cdp, stageKey) {
  await cdp.evalExpr(`(() => {
    const section = Array.from(document.querySelectorAll('.reporting-section'))
      .find((candidate) => candidate.textContent.includes('Stage Breakdown'));
    const row = Array.from(section.querySelectorAll('.reporting-row'))
      .find((candidate) => candidate.textContent.includes(${JSON.stringify(stageKey)}));
    const button = Array.from(row.querySelectorAll('button'))
      .find((candidate) => candidate.textContent.trim() === 'View');
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
