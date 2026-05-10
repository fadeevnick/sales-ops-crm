export default async function phase7MergeUiSmoke({ apiBaseUrl, frontendBaseUrl, assert, delay, requestJson }) {
  const chromeDebugBaseUrl = process.env.RUNTIME_SMOKE_CHROME_DEBUG_URL ?? "http://127.0.0.1:9223";
  const revops = "user_irina";
  const stamp = Date.now();

  const accountMerge = await createAccountMergeFixture({ requestJson, revops, stamp });
  const contactMerge = await createContactMergeFixture({ requestJson, revops, stamp });

  const cdp = await connectToChrome(chromeDebugBaseUrl);
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: frontendBaseUrl });
    await cdp.waitFor('document.readyState === "complete"', "initial frontend load");
    await cdp.evalExpr('localStorage.setItem("salesops-demo-user-id", "user_irina")');
    await cdp.send("Page.navigate", { url: frontendBaseUrl });
    await cdp.waitFor(
      'document.readyState === "complete" && document.body.innerText.includes("Duplicate Review")',
      "RevOps duplicate review panel",
    );

    await generateAndMergeUiCandidate({
      cdp,
      entityType: "account",
      uniqueLabel: accountMerge.accountName,
      masterRecordId: accountMerge.masterAccountId,
      mergeReason: accountMerge.mergeReason,
      expectedMessage: "contacts",
    });

    await generateAndMergeUiCandidate({
      cdp,
      entityType: "contact",
      uniqueLabel: contactMerge.masterContactName,
      masterRecordId: contactMerge.masterContactId,
      mergeReason: contactMerge.mergeReason,
      expectedMessage: "primary-contact",
    });
  } finally {
    cdp.close();
  }

  const accountMerged = await requestJson("/api/duplicate-candidates?entityType=account&status=merged&limit=300", {
    userId: revops,
  });
  const accountCandidate = accountMerged.json.candidates.find((candidate) =>
    candidate.mergeMasterRecordId === accountMerge.masterAccountId &&
    candidate.mergeDuplicateRecordId === accountMerge.duplicateAccountId &&
    candidate.mergeReason === accountMerge.mergeReason
  );
  assert(accountCandidate, "UI account merge metadata missing from backend merged queue", accountMerged.json);

  const contactMerged = await requestJson("/api/duplicate-candidates?entityType=contact&status=merged&limit=300", {
    userId: revops,
  });
  const contactCandidate = contactMerged.json.candidates.find((candidate) =>
    candidate.mergeMasterRecordId === contactMerge.masterContactId &&
    candidate.mergeDuplicateRecordId === contactMerge.duplicateContactId &&
    candidate.mergeReason === contactMerge.mergeReason
  );
  assert(contactCandidate, "UI contact merge metadata missing from backend merged queue", contactMerged.json);

  const rejectedFixture = await createAccountMergeFixture({ requestJson, revops, stamp: `${stamp}-reject` });
  const cdpReject = await connectToChrome(chromeDebugBaseUrl);
  try {
    await cdpReject.send("Page.enable");
    await cdpReject.send("Runtime.enable");
    await cdpReject.send("Page.navigate", { url: frontendBaseUrl });
    await cdpReject.waitFor('document.readyState === "complete"', "reject frontend load");
    await cdpReject.evalExpr('localStorage.setItem("salesops-demo-user-id", "user_irina")');
    await cdpReject.send("Page.navigate", { url: frontendBaseUrl });
    await cdpReject.waitFor(
      'document.readyState === "complete" && document.body.innerText.includes("Duplicate Review")',
      "RevOps duplicate review panel for reject",
    );
    await generateAndRejectUiCandidate({
      cdp: cdpReject,
      entityType: "account",
      uniqueLabel: rejectedFixture.accountName,
      reviewReason: rejectedFixture.reviewReason,
    });
  } finally {
    cdpReject.close();
  }

  for (const [userId, label] of [["user_anna", "Sales Rep"], ["user_michael", "Sales Manager"]]) {
    const cdpRole = await connectToChrome(chromeDebugBaseUrl);
    try {
      await cdpRole.send("Page.enable");
      await cdpRole.send("Runtime.enable");
      await cdpRole.send("Page.navigate", { url: frontendBaseUrl });
      await cdpRole.waitFor('document.readyState === "complete"', `${label} frontend load`);
      await cdpRole.evalExpr(`localStorage.setItem('salesops-demo-user-id', ${JSON.stringify(userId)})`);
      await cdpRole.send("Page.navigate", { url: frontendBaseUrl });
      await cdpRole.waitFor(
        'document.readyState === "complete" && document.body.innerText.includes("CRM Workspace")',
        `${label} workspace`,
      );
      const hasDuplicateReview = await cdpRole.evalExpr('document.body.innerText.includes("Duplicate Review")');
      assert(!hasDuplicateReview, `${label} should not see Duplicate Review`);
    } finally {
      cdpRole.close();
    }
  }

  return {
    stamp,
    accountCandidateId: accountCandidate.id,
    contactCandidateId: contactCandidate.id,
    accountMasterId: accountMerge.masterAccountId,
    contactMasterId: contactMerge.masterContactId,
    rejectFlowChecked: true,
    roleVisibilityChecked: true,
  };
}

async function createAccountMergeFixture({ requestJson, revops, stamp }) {
  const accountName = `Phase 7 UI Merge Account ${stamp}`;
  const mergeReason = `UI account merge ${stamp}`;
  const reviewReason = `UI reject still works ${stamp}`;

  const masterAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase7-ui-merge-master.example",
    },
  });
  const duplicateAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName.toUpperCase(),
      website: "https://phase7-ui-merge-duplicate.example",
    },
  });

  return {
    accountName,
    masterAccountId: masterAccount.json.id,
    duplicateAccountId: duplicateAccount.json.id,
    mergeReason,
    reviewReason,
  };
}

async function createContactMergeFixture({ requestJson, revops, stamp }) {
  const accountName = `Phase 7 UI Contact Merge Account ${stamp}`;
  const masterContactName = `Phase 7 UI Contact Merge Master ${stamp}`;
  const duplicateContactName = `Phase 7 UI Contact Merge Duplicate ${stamp}`;
  const duplicateEmail = `phase7.ui.contact.merge.${stamp}@example.com`;
  const mergeReason = `UI contact merge ${stamp}`;

  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase7-ui-contact-merge.example",
    },
  });
  const masterContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: masterContactName,
      email: duplicateEmail,
      phone: "+15550601",
    },
  });
  const duplicateContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: duplicateContactName,
      email: duplicateEmail.toUpperCase(),
      phone: "+15550602",
    },
  });
  await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      primaryContactId: duplicateContact.json.id,
      title: `Phase 7 UI Contact Merge Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 53000,
      closeDate: "2026-12-12",
    },
  });

  return {
    masterContactName,
    masterContactId: masterContact.json.id,
    duplicateContactId: duplicateContact.json.id,
    mergeReason,
  };
}

async function generateAndMergeUiCandidate({ cdp, entityType, uniqueLabel, masterRecordId, mergeReason, expectedMessage }) {
  await selectDuplicateEntity(cdp, entityType);
  await clickDuplicatePanelButton(cdp, "Generate");
  await cdp.waitFor(
    `document.body.innerText.includes(${JSON.stringify(uniqueLabel)})`,
    `${entityType} candidate generated`,
  );
  await cdp.evalExpr(`(() => {
    const row = findDuplicateRow(${JSON.stringify(uniqueLabel)});
    const masterSelect = row.querySelector('label:nth-of-type(1) select');
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    selectSetter.call(masterSelect, ${JSON.stringify(masterRecordId)});
    masterSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const mergeReasonInput = row.querySelector('label:nth-of-type(2) input');
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    inputSetter.call(mergeReasonInput, ${JSON.stringify(mergeReason)});
    mergeReasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    Array.from(row.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Merge').click();
    return true;
  })()`);
  await cdp.waitFor(
    `document.body.innerText.includes('Merged:') && document.body.innerText.includes(${JSON.stringify(expectedMessage)}) && !document.body.innerText.includes(${JSON.stringify(uniqueLabel)})`,
    `${entityType} candidate merged`,
  );
}

async function generateAndRejectUiCandidate({ cdp, entityType, uniqueLabel, reviewReason }) {
  await selectDuplicateEntity(cdp, entityType);
  await clickDuplicatePanelButton(cdp, "Generate");
  await cdp.waitFor(
    `document.body.innerText.includes(${JSON.stringify(uniqueLabel)})`,
    `${entityType} candidate generated for reject`,
  );
  await cdp.evalExpr(`(() => {
    const row = findDuplicateRow(${JSON.stringify(uniqueLabel)});
    const rejectReasonInput = row.querySelector('label:nth-of-type(3) input');
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    inputSetter.call(rejectReasonInput, ${JSON.stringify(reviewReason)});
    rejectReasonInput.dispatchEvent(new Event('input', { bubbles: true }));
    Array.from(row.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Reject').click();
    return true;
  })()`);
  await cdp.waitFor(
    `document.body.innerText.includes('Duplicate candidate rejected') && !document.body.innerText.includes(${JSON.stringify(uniqueLabel)})`,
    `${entityType} candidate rejected`,
  );
}

async function selectDuplicateEntity(cdp, entityType) {
  await cdp.evalExpr(`(() => {
    window.findDuplicateRow = (label) => Array.from(document.querySelectorAll('.duplicate-candidate-row'))
      .find((row) => row.textContent.includes(label));
    const panel = document.querySelector('.duplicate-review-section');
    const select = panel.querySelector('.action-group > label select');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, ${JSON.stringify(entityType)});
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

async function clickDuplicatePanelButton(cdp, label) {
  await cdp.evalExpr(`(() => {
    const panel = document.querySelector('.duplicate-review-section');
    Array.from(panel.querySelectorAll('button')).find((button) => button.textContent.trim() === ${JSON.stringify(label)}).click();
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
