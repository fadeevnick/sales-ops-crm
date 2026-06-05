export default async function phase9ApprovalNegativeSmoke({ assert, requestJson }) {
  const users = {
    rep: "user_anna",
    finance: "user_daria",
    legal: "user_oleg",
  };
  const stamp = Date.now();

  const sentBack = await executeSendBackPath({ assert, requestJson, users, stamp });
  const rejected = await executeRejectPath({ assert, requestJson, users, stamp });

  return {
    stamp,
    sentBackRequestId: sentBack.approvalRequestId,
    sentBackOpportunityId: sentBack.opportunityId,
    sentBackStatus: sentBack.status,
    rejectedRequestId: rejected.approvalRequestId,
    rejectedOpportunityId: rejected.opportunityId,
    rejectedStatus: rejected.status,
  };
}

async function executeSendBackPath({ assert, requestJson, users, stamp }) {
  const fixture = await createApprovalFixture({
    assert,
    requestJson,
    users,
    stamp: `${stamp}-sendback`,
    title: `Phase 9 Send Back Opportunity ${stamp}`,
    amount: 70000,
  });

  const legalEarlyDecision = await requestJson(`/api/approvals/${fixture.approvalRequestId}/send-back`, {
    method: "POST",
    userId: users.legal,
    body: { comment: "Legal should not send back before active step" },
  });
  assert(legalEarlyDecision.status === 403, "Legal early send-back should be forbidden", legalEarlyDecision);

  const sendBack = await requestJson(`/api/approvals/${fixture.approvalRequestId}/send-back`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Finance send-back ${stamp}` },
  });
  assert(sendBack.status === 200, "Finance send-back failed", sendBack);
  assert(sendBack.json.status === "sent_back", "Send-back status mismatch", sendBack.json);

  const secondDecision = await requestJson(`/api/approvals/${fixture.approvalRequestId}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: "Resolved request should not approve" },
  });
  assert(secondDecision.status === 422, "Resolved sent-back request should not be approved", secondDecision);

  const detail = await requestJson(`/api/approvals/${fixture.approvalRequestId}`, { userId: users.rep });
  assert(detail.status === 200, "Sales Rep sent-back detail read failed", detail);
  assert(detail.json.status === "sent_back", "Sent-back detail status mismatch", detail.json);

  const opportunity = await requestJson(`/api/opportunities/${fixture.opportunityId}`, { userId: users.rep });
  assert(opportunity.status === 200, "Sales Rep sent-back opportunity read failed", opportunity);
  assert(opportunity.json.approvalState === "none", "Sent-back opportunity approval state mismatch", opportunity.json);

  return {
    approvalRequestId: fixture.approvalRequestId,
    opportunityId: fixture.opportunityId,
    status: sendBack.json.status,
  };
}

async function executeRejectPath({ assert, requestJson, users, stamp }) {
  const fixture = await createApprovalFixture({
    assert,
    requestJson,
    users,
    stamp: `${stamp}-reject`,
    title: `Phase 9 Reject Opportunity ${stamp}`,
    amount: 72000,
  });

  const repReject = await requestJson(`/api/approvals/${fixture.approvalRequestId}/reject`, {
    method: "POST",
    userId: users.rep,
    body: { comment: "Sales Rep should not reject own request" },
  });
  assert(repReject.status === 403, "Sales Rep reject should be forbidden", repReject);

  const reject = await requestJson(`/api/approvals/${fixture.approvalRequestId}/reject`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Finance rejection ${stamp}` },
  });
  assert(reject.status === 200, "Finance rejection failed", reject);
  assert(reject.json.status === "rejected", "Reject status mismatch", reject.json);

  const secondDecision = await requestJson(`/api/approvals/${fixture.approvalRequestId}/send-back`, {
    method: "POST",
    userId: users.finance,
    body: { comment: "Rejected request should not send back" },
  });
  assert(secondDecision.status === 422, "Resolved rejected request should not be sent back", secondDecision);

  const detail = await requestJson(`/api/approvals/${fixture.approvalRequestId}`, { userId: users.rep });
  assert(detail.status === 200, "Sales Rep rejected detail read failed", detail);
  assert(detail.json.status === "rejected", "Rejected detail status mismatch", detail.json);

  const opportunity = await requestJson(`/api/opportunities/${fixture.opportunityId}`, { userId: users.rep });
  assert(opportunity.status === 200, "Sales Rep rejected opportunity read failed", opportunity);
  assert(opportunity.json.approvalState === "rejected", "Rejected opportunity approval state mismatch", opportunity.json);

  return {
    approvalRequestId: fixture.approvalRequestId,
    opportunityId: fixture.opportunityId,
    status: reject.json.status,
  };
}

async function createApprovalFixture({ assert, requestJson, users, stamp, title, amount }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 9 Approval Negative Account ${stamp}`,
      website: "https://phase9-approval-negative.example",
    },
  });
  assert(account.status === 201, "Approval negative account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      title,
      stageKey: "qualification",
      expectedAmount: amount,
      closeDate: "2027-03-15",
    },
  });
  assert(opportunity.status === 201, "Approval negative opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 9 approval negative ${stamp}`,
    },
  });
  assert(submit.status === 200, "Approval negative submission failed", submit);
  assert(submit.json.status === "pending_step", "Approval negative submission status mismatch", submit.json);

  return {
    accountId: account.json.id,
    opportunityId: opportunity.json.id,
    approvalRequestId: submit.json.id,
  };
}
