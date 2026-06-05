export default async function phase11OpportunityActiveApprovalSummarySmoke({ assert, requestJson }) {
  const users = {
    rep: "user_anna",
    finance: "user_daria",
    legal: "user_oleg",
  };
  const stamp = Date.now();
  const fixture = await createApprovalFixture({ assert, requestJson, users, stamp });

  const pendingDetail = await requestJson(`/api/opportunities/${fixture.opportunityId}`, { userId: users.rep });
  assert(pendingDetail.status === 200, "Pending opportunity detail read failed", pendingDetail);
  assert(pendingDetail.json.approvalState === "pending", "Pending approvalState mismatch", pendingDetail.json);
  assert(pendingDetail.json.activeApproval, "Pending opportunity missing activeApproval summary", pendingDetail.json);
  assert(pendingDetail.json.activeApproval.id === fixture.approvalRequestId, "Active approval id mismatch", pendingDetail.json);
  assert(
    pendingDetail.json.activeApproval.approverRoleKey === "finance_approver",
    "First active approver should be finance",
    pendingDetail.json.activeApproval,
  );
  assertHoursBetween({
    assert,
    from: pendingDetail.json.activeApproval.submittedAt,
    to: pendingDetail.json.activeApproval.activeStepDueAt,
    minHours: 23,
    maxHours: 25,
    label: "Finance active approval SLA should be about 24h",
  });

  const approve = await requestJson(`/api/approvals/${fixture.approvalRequestId}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Phase 11 active approval finance approval ${stamp}` },
  });
  assert(approve.status === 200, "Finance approval failed", approve);
  assert(approve.json.status === "pending_step", "Large deal should progress to legal", approve.json);

  const legalDetail = await requestJson(`/api/opportunities/${fixture.opportunityId}`, { userId: users.rep });
  assert(legalDetail.status === 200, "Legal-step opportunity detail read failed", legalDetail);
  assert(legalDetail.json.activeApproval, "Legal-step opportunity missing activeApproval summary", legalDetail.json);
  assert(
    legalDetail.json.activeApproval.approverRoleKey === "legal_approver",
    "Second active approver should be legal",
    legalDetail.json.activeApproval,
  );
  assertHoursBetween({
    assert,
    from: legalDetail.json.activeApproval.submittedAt,
    to: legalDetail.json.activeApproval.activeStepDueAt,
    minHours: 47,
    maxHours: 73,
    label: "Legal active approval SLA should be at least 48h from request lifecycle",
  });

  return {
    stamp,
    opportunityId: fixture.opportunityId,
    approvalRequestId: fixture.approvalRequestId,
    financeApproverRole: pendingDetail.json.activeApproval.approverRoleKey,
    legalApproverRole: legalDetail.json.activeApproval.approverRoleKey,
  };
}

async function createApprovalFixture({ assert, requestJson, users, stamp }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 11 Active Approval Account ${stamp}`,
      website: "https://phase11-active-approval.example",
    },
  });
  assert(account.status === 201, "Active approval account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      title: `Phase 11 Active Approval Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 83000,
      closeDate: "2027-06-30",
    },
  });
  assert(opportunity.status === 201, "Active approval opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 11 active approval summary smoke ${stamp}`,
    },
  });
  assert(submit.status === 200, "Active approval submission failed", submit);

  return {
    opportunityId: opportunity.json.id,
    approvalRequestId: submit.json.id,
  };
}

function assertHoursBetween({ assert, from, to, minHours, maxHours, label }) {
  assert(from, `${label}: missing from timestamp`);
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
