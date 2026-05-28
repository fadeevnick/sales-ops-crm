export default async function phase11OpportunityActiveApprovalSummaryUiSmoke({ frontendBaseUrl, assert, requestJson }) {
  const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
  const users = {
    rep: "user_anna",
    finance: "user_daria",
  };
  const stamp = Date.now();
  const fixture = await createApprovalFixture({ assert, requestJson, users, stamp });

  const cdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await openAsUser(cdp, frontendBaseUrl, users.rep);
    await filterWorkspace(cdp, fixture.title);
    await cdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(fixture.title)})`,
      "Sales Rep workspace row for approval summary fixture",
    );
    await cdp.evalExpr(`(() => {
      const row = Array.from(document.querySelectorAll('.rep-table tbody tr'))
        .find((candidate) => candidate.textContent.includes(${JSON.stringify(fixture.title)}));
      row.click();
      return true;
    })()`);
    await cdp.evalExpr(`(() => {
      const button = Array.from(document.querySelectorAll('.rep-preview-actions button'))
        .find((candidate) => candidate.textContent.includes('Open detail'));
      button.click();
      return true;
    })()`);
    await cdp.waitFor(
      'document.querySelector("[data-screen-label=\\"Opportunity Detail\\"]") !== null',
      "Opportunity detail full screen",
    );
    await cdp.waitFor(
      `document.body.innerText.includes(${JSON.stringify(fixture.approvalRequestId)}) && document.body.innerText.includes("Current approver") && document.body.innerText.includes("SLA")`,
      "Opportunity detail active approval summary",
    );

    const detailState = await cdp.evalExpr(`(() => {
      const text = document.body.innerText;
      return {
        hasRequestId: text.includes(${JSON.stringify(fixture.approvalRequestId)}),
        hasCurrentApprover: text.includes('Current approver'),
        hasFinanceApprover: text.toLowerCase().includes('finance approver'),
        hasSla: text.includes('SLA'),
        bodyText: text,
      };
    })()`);
    assert(detailState.hasRequestId, "UI missing active approval request id", detailState);
    assert(detailState.hasCurrentApprover, "UI missing current approver label", detailState);
    assert(detailState.hasFinanceApprover, "UI missing finance approver summary", detailState);
    assert(detailState.hasSla, "UI missing SLA label", detailState);
  } finally {
    cdp.close();
  }

  const approve = await requestJson(`/api/approvals/${fixture.approvalRequestId}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Phase 11 UI finance approval ${stamp}` },
  });
  assert(approve.status === 200, "Finance approval failed after UI verification", approve);

  return {
    stamp,
    opportunityId: fixture.opportunityId,
    approvalRequestId: fixture.approvalRequestId,
    uiChecked: true,
  };
}

async function createApprovalFixture({ assert, requestJson, users, stamp }) {
  const title = `Phase 11 Active Approval UI Opportunity ${stamp}`;
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 11 Active Approval UI Account ${stamp}`,
      website: "https://phase11-active-approval-ui.example",
    },
  });
  assert(account.status === 201, "Active approval UI account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      title,
      stageKey: "qualification",
      expectedAmount: 84000,
      closeDate: "2027-06-30",
    },
  });
  assert(opportunity.status === 201, "Active approval UI opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 11 active approval summary UI smoke ${stamp}`,
    },
  });
  assert(submit.status === 200, "Active approval UI submission failed", submit);

  return {
    title,
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
    'document.readyState === "complete" && document.body.innerText.includes("CRM Workspace")',
    `${userId} crm workspace`,
  );
}

async function filterWorkspace(cdp, title) {
  await cdp.evalExpr(`(() => {
    const input = document.querySelector('.rep-filters input[placeholder*="Filter by title or account"]');
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
