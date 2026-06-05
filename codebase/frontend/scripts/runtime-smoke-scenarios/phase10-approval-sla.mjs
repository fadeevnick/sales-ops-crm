export default async function phase10ApprovalSlaSmoke({ assert, requestJson }) {
  const users = {
    rep: "user_anna",
    finance: "user_daria",
    legal: "user_oleg",
  };
  const stamp = Date.now();

  const fixture = await createLargeDealApprovalFixture({ assert, requestJson, users, stamp });

  const financeInbox = await requestJson("/api/approvals/inbox", { userId: users.finance });
  assert(financeInbox.status === 200, "Finance inbox read failed", financeInbox);
  const financeInboxItem = financeInbox.json.items.find((item) => item.id === fixture.approvalRequestId);
  assert(financeInboxItem, "Finance inbox missing SLA fixture", financeInbox.json);
  assert(financeInboxItem.activeStepDueAt, "Finance inbox item missing activeStepDueAt", financeInboxItem);

  const financeDetail = await requestJson(`/api/approvals/${fixture.approvalRequestId}`, {
    userId: users.finance,
  });
  assert(financeDetail.status === 200, "Finance detail read failed", financeDetail);
  const financeStep = financeDetail.json.steps.find((step) => step.status === "active");
  assert(financeStep, "Finance detail has no active step", financeDetail.json);
  assert(financeStep.approverRoleKey === "finance_approver", "First active step should be finance", financeStep);
  assert(financeStep.dueAt, "Finance active step missing dueAt", financeStep);
  assertSameInstant(financeInboxItem.activeStepDueAt, financeStep.dueAt, "Inbox and detail dueAt mismatch");
  assertHoursBetween({
    assert,
    from: financeStep.activatedAt,
    to: financeStep.dueAt,
    minHours: 23,
    maxHours: 25,
    label: "Finance SLA should be about 24h",
  });

  const approve = await requestJson(`/api/approvals/${fixture.approvalRequestId}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Phase 10 SLA finance approval ${stamp}` },
  });
  assert(approve.status === 200, "Finance approval failed", approve);
  assert(approve.json.status === "pending_step", "Large deal should advance to legal step", approve.json);

  const legalInbox = await requestJson("/api/approvals/inbox", { userId: users.legal });
  assert(legalInbox.status === 200, "Legal inbox read failed", legalInbox);
  const legalInboxItem = legalInbox.json.items.find((item) => item.id === fixture.approvalRequestId);
  assert(legalInboxItem, "Legal inbox missing advanced SLA fixture", legalInbox.json);
  assert(legalInboxItem.activeStepDueAt, "Legal inbox item missing activeStepDueAt", legalInboxItem);

  const legalDetail = await requestJson(`/api/approvals/${fixture.approvalRequestId}`, {
    userId: users.legal,
  });
  assert(legalDetail.status === 200, "Legal detail read failed", legalDetail);
  const legalStep = legalDetail.json.steps.find((step) => step.status === "active");
  assert(legalStep, "Legal detail has no active step", legalDetail.json);
  assert(legalStep.approverRoleKey === "legal_approver", "Second active step should be legal", legalStep);
  assert(legalStep.dueAt, "Legal active step missing dueAt", legalStep);
  assertSameInstant(legalInboxItem.activeStepDueAt, legalStep.dueAt, "Legal inbox and detail dueAt mismatch");
  assertHoursBetween({
    assert,
    from: legalStep.activatedAt,
    to: legalStep.dueAt,
    minHours: 47,
    maxHours: 49,
    label: "Legal SLA should be about 48h",
  });

  return {
    stamp,
    opportunityId: fixture.opportunityId,
    approvalRequestId: fixture.approvalRequestId,
    financeDueAt: financeStep.dueAt,
    legalDueAt: legalStep.dueAt,
    status: legalDetail.json.status,
  };
}

async function createLargeDealApprovalFixture({ assert, requestJson, users, stamp }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 10 SLA Account ${stamp}`,
      website: "https://phase10-approval-sla.example",
    },
  });
  assert(account.status === 201, "SLA account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      title: `Phase 10 SLA Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 82500,
      closeDate: "2027-04-30",
    },
  });
  assert(opportunity.status === 201, "SLA opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 10 approval SLA smoke ${stamp}`,
    },
  });
  assert(submit.status === 200, "SLA approval submission failed", submit);
  assert(submit.json.status === "pending_step", "SLA approval submission status mismatch", submit.json);

  return {
    accountId: account.json.id,
    opportunityId: opportunity.json.id,
    approvalRequestId: submit.json.id,
  };
}

function assertSameInstant(left, right, message) {
  if (Date.parse(left) !== Date.parse(right)) {
    throw new Error(`${message}\n${JSON.stringify({ left, right }, null, 2)}`);
  }
}

function assertHoursBetween({ assert, from, to, minHours, maxHours, label }) {
  assert(from, `${label}: missing start timestamp`);
  assert(to, `${label}: missing due timestamp`);
  const diffHours = (Date.parse(to) - Date.parse(from)) / 3_600_000;
  assert(diffHours >= minHours && diffHours <= maxHours, label, {
    from,
    to,
    diffHours,
    minHours,
    maxHours,
  });
}
