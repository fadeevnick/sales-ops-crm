export default async function phase9PilotE2eSmoke({ assert, delay, requestJson }) {
  const users = {
    rep: "user_anna",
    manager: "user_michael",
    revops: "user_irina",
    finance: "user_daria",
    legal: "user_oleg",
  };
  const stamp = Date.now();

  await verifyDemoPersonas({ assert, requestJson, users });
  await verifyAccessBoundaries({ assert, requestJson, users });

  const approval = await executeApprovalChain({ assert, requestJson, users, stamp });
  const importJob = await executeAccountImport({ assert, delay, requestJson, users, stamp });
  const merge = await executeAccountMergeAudit({ assert, requestJson, users, stamp });
  const reporting = await verifyReportingProjectionAndScope({
    assert,
    requestJson,
    users,
    repOpportunityId: approval.opportunityId,
    hiddenOpportunityId: merge.reassignedOpportunityId,
  });

  return {
    stamp,
    approvalRequestId: approval.approvalRequestId,
    approvedOpportunityId: approval.opportunityId,
    importJobId: importJob.importJobId,
    importedAccountId: importJob.importedAccountId,
    mergeCandidateId: merge.candidateId,
    mergeAuditEventId: merge.auditEventId,
    reportingRefreshedAt: reporting.refreshedAt,
    managerDrillDownCount: reporting.managerDrillDownCount,
  };
}

async function verifyDemoPersonas({ assert, requestJson, users }) {
  const demoUsers = await requestJson("/api/session/demo-users");
  assert(demoUsers.status === 200, "Demo user list failed", demoUsers);
  for (const [label, userId] of Object.entries(users)) {
    assert(
      demoUsers.json.some((item) => item.userId === userId),
      `Demo user missing for ${label}`,
      demoUsers.json,
    );
    const me = await requestJson("/api/me", { userId });
    assert(me.status === 200, `Current user lookup failed for ${label}`, me);
    assert(me.json.userId === userId, `Current user mismatch for ${label}`, me.json);
  }
}

async function verifyAccessBoundaries({ assert, requestJson, users }) {
  const repReporting = await requestJson("/api/reporting/dashboard", { userId: users.rep });
  assert(repReporting.status === 403, "Sales Rep reporting read should be forbidden", repReporting);

  const managerAudit = await requestJson("/api/business-audit-events?limit=5", { userId: users.manager });
  assert(managerAudit.status === 403, "Sales Manager audit read should be forbidden", managerAudit);

  const repImport = await requestJson("/api/import-jobs/preview", {
    method: "POST",
    userId: users.rep,
    body: {
      entityType: "account",
      fileName: "rep-forbidden.csv",
      csvContent: "Name\nForbidden Import\n",
      mapping: { Name: "name" },
    },
  });
  assert(repImport.status === 403, "Sales Rep import preview should be forbidden", repImport);

  const managerExport = await requestJson("/api/export-jobs", {
    method: "POST",
    userId: users.manager,
    body: {
      entityType: "opportunity",
      limit: 1,
    },
  });
  assert(managerExport.status === 403, "Sales Manager export should be forbidden", managerExport);
}

async function executeApprovalChain({ assert, requestJson, users, stamp }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.rep,
    body: {
      name: `Phase 9 Pilot Account ${stamp}`,
      website: "https://phase9-pilot.example",
    },
  });
  assert(account.status === 201, "Sales Rep account creation failed", account);

  const contact = await requestJson("/api/contacts", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      fullName: `Phase 9 Pilot Contact ${stamp}`,
      email: `phase9.pilot.${stamp}@example.com`,
    },
  });
  assert(contact.status === 201, "Sales Rep contact creation failed", contact);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.rep,
    body: {
      accountId: account.json.id,
      primaryContactId: contact.json.id,
      title: `Phase 9 Pilot Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 125000,
      closeDate: "2027-02-20",
    },
  });
  assert(opportunity.status === 201, "Sales Rep opportunity creation failed", opportunity);

  const submit = await requestJson(`/api/opportunities/${opportunity.json.id}/submit-approval`, {
    method: "POST",
    userId: users.rep,
    body: {
      requestType: "stage_progression",
      businessJustification: `Phase 9 pilot approval ${stamp}`,
    },
  });
  assert(submit.status === 200, "Sales Rep approval submission failed", submit);
  assert(submit.json.status === "pending_step", "Submitted approval status mismatch", submit.json);

  const repDecision = await requestJson(`/api/approvals/${submit.json.id}/approve`, {
    method: "POST",
    userId: users.rep,
    body: { comment: "Sales Rep should not approve own request" },
  });
  assert(repDecision.status === 403, "Sales Rep approval decision should be forbidden", repDecision);

  const legalEarlyDecision = await requestJson(`/api/approvals/${submit.json.id}/approve`, {
    method: "POST",
    userId: users.legal,
    body: { comment: "Legal should not approve before finance step" },
  });
  assert(legalEarlyDecision.status === 403, "Legal early approval should be forbidden", legalEarlyDecision);

  const financeInbox = await requestJson("/api/approvals/inbox", { userId: users.finance });
  assert(financeInbox.status === 200, "Finance inbox failed", financeInbox);
  assert(
    financeInbox.json.items.some((item) => item.id === submit.json.id && item.approverRoleKey === "finance_approver"),
    "Finance inbox missing submitted request",
    financeInbox.json,
  );

  const financeApprove = await requestJson(`/api/approvals/${submit.json.id}/approve`, {
    method: "POST",
    userId: users.finance,
    body: { comment: `Finance approval ${stamp}` },
  });
  assert(financeApprove.status === 200, "Finance approval failed", financeApprove);
  assert(financeApprove.json.status === "pending_step", "Finance approval should activate next step", financeApprove.json);

  const legalInbox = await requestJson("/api/approvals/inbox", { userId: users.legal });
  assert(legalInbox.status === 200, "Legal inbox failed", legalInbox);
  assert(
    legalInbox.json.items.some((item) => item.id === submit.json.id && item.approverRoleKey === "legal_approver"),
    "Legal inbox missing active request",
    legalInbox.json,
  );

  const legalApprove = await requestJson(`/api/approvals/${submit.json.id}/approve`, {
    method: "POST",
    userId: users.legal,
    body: { comment: `Legal approval ${stamp}` },
  });
  assert(legalApprove.status === 200, "Legal approval failed", legalApprove);
  assert(legalApprove.json.status === "approved", "Legal approval should resolve request", legalApprove.json);

  const detail = await requestJson(`/api/approvals/${submit.json.id}`, { userId: users.rep });
  assert(detail.status === 200, "Sales Rep approval detail read failed", detail);
  assert(detail.json.status === "approved", "Approval detail should be approved", detail.json);

  const approvedOpportunity = await requestJson(`/api/opportunities/${opportunity.json.id}`, { userId: users.rep });
  assert(approvedOpportunity.status === 200, "Sales Rep approved opportunity read failed", approvedOpportunity);
  assert(approvedOpportunity.json.approvalState === "approved", "Opportunity approval state mismatch", approvedOpportunity.json);

  return {
    accountId: account.json.id,
    contactId: contact.json.id,
    opportunityId: opportunity.json.id,
    approvalRequestId: submit.json.id,
  };
}

async function executeAccountImport({ assert, delay, requestJson, users, stamp }) {
  const importedAccountName = `Phase 9 Imported Account ${stamp}`;
  const preview = await requestJson("/api/import-jobs/preview", {
    method: "POST",
    userId: users.revops,
    body: {
      entityType: "account",
      fileName: `phase9-pilot-${stamp}.csv`,
      csvContent: `Name,Website\n${importedAccountName},https://phase9-import.example\n,https://phase9-invalid.example\n`,
      mapping: {
        Name: "name",
        Website: "website",
      },
    },
  });
  assert(preview.status === 201, "RevOps account import preview failed", preview);
  assert(preview.json.job.validRows === 1, "Import preview valid row count mismatch", preview.json.job);
  assert(preview.json.job.invalidRows === 1, "Import preview invalid row count mismatch", preview.json.job);

  const execute = await requestJson(`/api/import-jobs/${preview.json.job.id}/execute`, {
    method: "POST",
    userId: users.revops,
  });
  assert(execute.status === 200, "RevOps account import execute failed", execute);

  const detail = await waitForImportExecution({
    assert,
    delay,
    requestJson,
    userId: users.revops,
    importJobId: preview.json.job.id,
  });
  assert(detail.json.job.executedRows === 1, "Import executed row count mismatch", detail.json.job);
  assert(detail.json.job.skippedRows === 1, "Import skipped row count mismatch", detail.json.job);
  const createdRow = detail.json.rows.find((row) => row.executionStatus === "created");
  assert(createdRow?.createdRecordId, "Import created row id missing", detail.json.rows);

  return {
    importJobId: preview.json.job.id,
    importedAccountId: createdRow.createdRecordId,
  };
}

async function waitForImportExecution({ assert, delay, requestJson, userId, importJobId }) {
  let last = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    last = await requestJson(`/api/import-jobs/${importJobId}`, { userId });
    assert(last.status === 200, "Import job detail fetch failed", last);
    if (last.json.job.status === "executed") {
      return last;
    }
    if (last.json.job.status === "failed") {
      throw new Error(`Import job failed:\n${JSON.stringify(last.json, null, 2)}`);
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for import execution:\n${JSON.stringify(last?.json, null, 2)}`);
}

async function executeAccountMergeAudit({ assert, requestJson, users, stamp }) {
  const accountName = `Phase 9 Merge Account ${stamp}`;
  const masterAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.revops,
    body: {
      name: accountName,
      website: "https://phase9-merge-master.example",
    },
  });
  assert(masterAccount.status === 201, "Merge master account creation failed", masterAccount);

  const duplicateAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: users.revops,
    body: {
      name: accountName.toUpperCase(),
      website: "https://phase9-merge-duplicate.example",
    },
  });
  assert(duplicateAccount.status === 201, "Merge duplicate account creation failed", duplicateAccount);

  const losingContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: users.revops,
    body: {
      accountId: duplicateAccount.json.id,
      fullName: `Phase 9 Merge Contact ${stamp}`,
      email: `phase9.merge.${stamp}@example.com`,
    },
  });
  assert(losingContact.status === 201, "Merge contact fixture creation failed", losingContact);

  const losingOpportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: users.revops,
    body: {
      accountId: duplicateAccount.json.id,
      title: `Phase 9 Hidden RevOps Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 75000,
      closeDate: "2027-02-21",
    },
  });
  assert(losingOpportunity.status === 201, "Merge opportunity fixture creation failed", losingOpportunity);

  const generation = await requestJson("/api/duplicate-candidates/generate", {
    method: "POST",
    userId: users.revops,
    body: {
      entityType: "account",
      limit: 200,
    },
  });
  assert(generation.status === 201, "Duplicate generation failed", generation);
  const candidate = generation.json.candidates.find((item) =>
    item.entityType === "account" &&
    [item.leftRecordId, item.rightRecordId].includes(masterAccount.json.id) &&
    [item.leftRecordId, item.rightRecordId].includes(duplicateAccount.json.id)
  );
  assert(candidate, "Duplicate candidate missing for pilot merge", generation.json);

  const merge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
    method: "POST",
    userId: users.revops,
    body: {
      masterRecordId: masterAccount.json.id,
      mergeReason: `Phase 9 pilot merge ${stamp}`,
    },
  });
  assert(merge.status === 200, "RevOps duplicate merge failed", merge);
  assert(merge.json.reassignedContacts === 1, "Merge reassigned contact count mismatch", merge.json);
  assert(merge.json.reassignedOpportunities === 1, "Merge reassigned opportunity count mismatch", merge.json);

  const auditEvents = await requestJson("/api/business-audit-events?limit=80", { userId: users.revops });
  assert(auditEvents.status === 200, "RevOps audit event list failed", auditEvents);
  const auditEvent = auditEvents.json.events.find((event) =>
    event.eventType === "account_duplicate_merged" &&
    event.entityId === candidate.id &&
    event.details.masterRecordId === masterAccount.json.id
  );
  assert(auditEvent, "Merge audit event missing", auditEvents.json);

  const managerAudit = await requestJson("/api/business-audit-events?limit=5", { userId: users.manager });
  assert(managerAudit.status === 403, "Sales Manager audit read should remain forbidden", managerAudit);

  return {
    candidateId: candidate.id,
    auditEventId: auditEvent.id,
    masterAccountId: masterAccount.json.id,
    duplicateAccountId: duplicateAccount.json.id,
    reassignedOpportunityId: losingOpportunity.json.id,
  };
}

async function verifyReportingProjectionAndScope({ assert, requestJson, users, repOpportunityId, hiddenOpportunityId }) {
  const refresh = await requestJson("/api/reporting/dashboard/refresh", {
    method: "POST",
    userId: users.revops,
  });
  assert(refresh.status === 200, "RevOps reporting refresh failed", refresh);

  const managerDashboard = await requestJson("/api/reporting/dashboard", { userId: users.manager });
  assert(managerDashboard.status === 200, "Sales Manager reporting read failed", managerDashboard);
  assert(
    managerDashboard.json.metrics.openPipelineCount >= 1,
    "Manager dashboard open pipeline count missing",
    managerDashboard.json,
  );

  const repDashboard = await requestJson("/api/reporting/dashboard", { userId: users.rep });
  assert(repDashboard.status === 403, "Sales Rep reporting read should remain forbidden", repDashboard);

  const managerDrillDown = await requestJson("/api/reporting/dashboard/drill-down?dimension=stage&value=qualification&limit=100", {
    userId: users.manager,
  });
  assert(managerDrillDown.status === 200, "Sales Manager reporting drill-down failed", managerDrillDown);
  assert(
    managerDrillDown.json.items.some((item) => item.id === repOpportunityId),
    "Manager drill-down missing team-visible Sales Rep opportunity",
    managerDrillDown.json,
  );
  assert(
    !managerDrillDown.json.items.some((item) => item.id === hiddenOpportunityId),
    "Manager drill-down leaked RevOps-owned opportunity",
    managerDrillDown.json,
  );

  const revopsDrillDown = await requestJson("/api/reporting/dashboard/drill-down?dimension=stage&value=qualification&limit=150", {
    userId: users.revops,
  });
  assert(revopsDrillDown.status === 200, "RevOps reporting drill-down failed", revopsDrillDown);
  assert(
    revopsDrillDown.json.items.some((item) => item.id === repOpportunityId) &&
      revopsDrillDown.json.items.some((item) => item.id === hiddenOpportunityId),
    "RevOps drill-down missing expected tenant opportunities",
    revopsDrillDown.json,
  );

  return {
    refreshedAt: refresh.json.projection.refreshedAt,
    managerDrillDownCount: managerDrillDown.json.items.length,
  };
}
