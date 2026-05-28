export default async function phase10ApprovalSlaUiSmoke({ frontendBaseUrl, assert, requestJson }) {
  const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
  const users = {
    rep: "user_anna",
    finance: "user_daria",
    legal: "user_oleg",
  };
  const stamp = Date.now();
  const fixture = await createLargeDealApprovalFixture({ assert, requestJson, users, stamp });

  const financeCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(financeCdp, frontendBaseUrl, users.finance);
    await filterApprovalQueue(financeCdp, fixture.title);
    await financeCdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(fixture.title)})`,
      "Finance approval fixture row",
    );
    await financeCdp.waitFor(
      `(() => hasSlaPill(${JSON.stringify(fixture.title)}, "Due in"))()`,
      "Finance SLA pill in inbox row",
    );
    await financeCdp.waitFor(
      `document.body.innerText.toLowerCase().includes("sla deadline") && document.body.innerText.includes("Due in")`,
      "Finance SLA deadline in approval detail",
    );
    const financeUi = await financeCdp.evalExpr(`(() => collectSlaUi(${JSON.stringify(fixture.title)}))()`);
    assert(financeUi.hasQueueSla, "Finance UI missing queue SLA pill", financeUi);
    assert(financeUi.hasDetailSla, "Finance UI missing detail SLA pill", financeUi);
  } finally {
    financeCdp.close();
  }

  const approve = await requestJson(`/api/approvals/${fixture.approvalRequestId}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Phase 10 SLA UI finance approval ${stamp}` },
  });
  assert(approve.status === 200, "Finance approval failed before legal UI check", approve);
  assert(approve.json.status === "pending_step", "Large deal should advance to legal for UI smoke", approve.json);

  const legalCdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(legalCdp, frontendBaseUrl, users.legal);
    await filterApprovalQueue(legalCdp, fixture.title);
    await legalCdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(fixture.title)})`,
      "Legal approval fixture row",
    );
    await legalCdp.waitFor(
      `(() => hasSlaPill(${JSON.stringify(fixture.title)}, "Due in"))()`,
      "Legal SLA pill in inbox row",
    );
    await legalCdp.waitFor(
      `document.body.innerText.toLowerCase().includes("sla deadline") && document.body.innerText.includes("Due in 2d")`,
      "Legal SLA deadline in approval detail",
    );
    const legalUi = await legalCdp.evalExpr(`(() => collectSlaUi(${JSON.stringify(fixture.title)}))()`);
    assert(legalUi.hasQueueSla, "Legal UI missing queue SLA pill", legalUi);
    assert(legalUi.hasDetailSla, "Legal UI missing detail SLA pill", legalUi);
  } finally {
    legalCdp.close();
  }

  return {
    stamp,
    opportunityId: fixture.opportunityId,
    approvalRequestId: fixture.approvalRequestId,
    financeUiChecked: true,
    legalUiChecked: true,
  };
}

async function createLargeDealApprovalFixture({ assert, requestJson, users, stamp }) {
  const title = `Phase 10 SLA UI Opportunity ${stamp}`;
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 10 SLA UI Account ${stamp}`,
      website: "https://phase10-approval-sla-ui.example",
    },
  });
  assert(account.status === 201, "SLA UI account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      title,
      stageKey: "qualification",
      expectedAmount: 84000,
      closeDate: "2027-05-15",
    },
  });
  assert(opportunity.status === 201, "SLA UI opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 10 approval SLA UI smoke ${stamp}`,
    },
  });
  assert(submit.status === 200, "SLA UI approval submission failed", submit);

  return {
    title,
    accountId: account.json.id,
    opportunityId: opportunity.json.id,
    approvalRequestId: submit.json.id,
  };
}

async function openAsUser(cdp, frontendBaseUrl, userId) {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: frontendBaseUrl });
  await cdp.waitFor('document.readyState === "complete"', "initial frontend load");
  await cdp.evalExpr(`localStorage.setItem('salesops-demo-user-id', ${JSON.stringify(userId)})`);
  await cdp.send("Page.navigate", { url: frontendBaseUrl });
  await cdp.waitFor(
    'document.readyState === "complete" && document.body.innerText.includes("Approval inbox")',
    `${userId} approval inbox`,
  );
}

async function filterApprovalQueue(cdp, title) {
  await cdp.evalExpr(`(() => {
    window.hasSlaPill = (needle, label) => {
      const row = Array.from(document.querySelectorAll('.appr-queue-table tbody tr'))
        .find((candidate) => candidate.textContent.includes(needle));
      return !!row && Array.from(row.querySelectorAll('.appr-sla-pill'))
        .some((pill) => pill.textContent.includes(label));
    };
    window.collectSlaUi = (needle) => {
      const row = Array.from(document.querySelectorAll('.appr-queue-table tbody tr'))
        .find((candidate) => candidate.textContent.includes(needle));
      const queuePills = row ? Array.from(row.querySelectorAll('.appr-sla-pill')).map((pill) => pill.textContent.trim()) : [];
      const allPills = Array.from(document.querySelectorAll('.appr-sla-pill')).map((pill) => pill.textContent.trim());
      return {
        bodyText: document.body.innerText,
        queuePills,
        allPills,
        hasQueueSla: queuePills.some((text) => text.includes('Due in')),
        hasDetailSla: document.body.innerText.toLowerCase().includes('sla deadline') && allPills.some((text) => text.includes('Due in')),
      };
    };
    const input = document.querySelector('.appr-filters input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(title)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
