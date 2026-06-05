export default async function phase7MergeAuditSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const rep = "user_anna";
  const manager = "user_michael";
  const stamp = Date.now();

  const accountMerge = await executeAccountMerge({ assert, requestJson, revops, stamp });
  const contactMerge = await executeContactMerge({ assert, requestJson, revops, stamp });

  for (const [userId, label] of [[rep, "Sales Rep"], [manager, "Sales Manager"]]) {
    const forbidden = await requestJson("/api/business-audit-events?limit=20", { userId });
    assert(forbidden.status === 403, `${label} audit event read should be forbidden`, forbidden);
  }

  const auditEvents = await requestJson("/api/business-audit-events?limit=50", { userId: revops });
  assert(auditEvents.status === 200, "RevOps audit event list failed", auditEvents);

  const accountEvent = auditEvents.json.events.find((event) =>
    event.eventType === "account_duplicate_merged" &&
    event.entityId === accountMerge.candidateId
  );
  assert(accountEvent, "Account merge audit event missing", auditEvents.json);
  assert(accountEvent.summary.includes(accountMerge.candidateId), "Account audit summary mismatch", accountEvent);
  assert(accountEvent.actorUserId === revops, "Account audit actor mismatch", accountEvent);
  assert(accountEvent.details.masterRecordId === accountMerge.masterAccountId, "Account audit master mismatch", accountEvent);
  assert(accountEvent.details.duplicateRecordId === accountMerge.duplicateAccountId, "Account audit duplicate mismatch", accountEvent);
  assert(accountEvent.details.reassignedContacts === 1, "Account audit reassigned contacts mismatch", accountEvent);
  assert(accountEvent.details.reassignedOpportunities === 1, "Account audit reassigned opportunities mismatch", accountEvent);

  const contactEvent = auditEvents.json.events.find((event) =>
    event.eventType === "contact_duplicate_merged" &&
    event.entityId === contactMerge.candidateId
  );
  assert(contactEvent, "Contact merge audit event missing", auditEvents.json);
  assert(contactEvent.summary.includes(contactMerge.candidateId), "Contact audit summary mismatch", contactEvent);
  assert(contactEvent.actorUserId === revops, "Contact audit actor mismatch", contactEvent);
  assert(contactEvent.details.masterRecordId === contactMerge.masterContactId, "Contact audit master mismatch", contactEvent);
  assert(contactEvent.details.duplicateRecordId === contactMerge.duplicateContactId, "Contact audit duplicate mismatch", contactEvent);
  assert(
    contactEvent.details.reassignedPrimaryContactOpportunities === 1,
    "Contact audit reassigned primary-contact opportunities mismatch",
    contactEvent,
  );

  return {
    stamp,
    accountCandidateId: accountMerge.candidateId,
    accountAuditEventId: accountEvent.id,
    contactCandidateId: contactMerge.candidateId,
    contactAuditEventId: contactEvent.id,
    forbidden: {
      salesRep: 403,
      salesManager: 403,
    },
  };
}

async function executeAccountMerge({ assert, requestJson, revops, stamp }) {
  const accountName = `Phase 7 Audit Account ${stamp}`;
  const masterAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase7-audit-master.example",
    },
  });
  const duplicateAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName.toUpperCase(),
      website: "https://phase7-audit-duplicate.example",
    },
  });
  const contact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: duplicateAccount.json.id,
      fullName: `Phase 7 Audit Account Contact ${stamp}`,
      email: `phase7.audit.account.${stamp}@example.com`,
    },
  });
  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: duplicateAccount.json.id,
      title: `Phase 7 Audit Account Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 61000,
      closeDate: "2026-12-20",
    },
  });
  assert(contact.status === 201 && opportunity.status === 201, "Account merge fixture relation creation failed", {
    contact,
    opportunity,
  });

  const generation = await requestJson("/api/duplicate-candidates/generate", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "account",
      limit: 100,
    },
  });
  const candidate = generation.json.candidates.find((item) =>
    item.entityType === "account" &&
    [item.leftRecordId, item.rightRecordId].includes(masterAccount.json.id) &&
    [item.leftRecordId, item.rightRecordId].includes(duplicateAccount.json.id)
  );
  assert(candidate, "Account candidate missing for audit smoke", generation.json);

  const merge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterAccount.json.id,
      mergeReason: `Audit account merge ${stamp}`,
    },
  });
  assert(merge.status === 200, "Account merge failed for audit smoke", merge);

  return {
    candidateId: candidate.id,
    masterAccountId: masterAccount.json.id,
    duplicateAccountId: duplicateAccount.json.id,
  };
}

async function executeContactMerge({ assert, requestJson, revops, stamp }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: `Phase 7 Audit Contact Account ${stamp}`,
      website: "https://phase7-audit-contact.example",
    },
  });
  const email = `phase7.audit.contact.${stamp}@example.com`;
  const masterContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: `Phase 7 Audit Contact Master ${stamp}`,
      email,
    },
  });
  const duplicateContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: `Phase 7 Audit Contact Duplicate ${stamp}`,
      email: email.toUpperCase(),
    },
  });
  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      primaryContactId: duplicateContact.json.id,
      title: `Phase 7 Audit Contact Opportunity ${stamp}`,
      stageKey: "qualification",
      expectedAmount: 63000,
      closeDate: "2026-12-22",
    },
  });
  assert(opportunity.status === 201, "Contact merge fixture opportunity creation failed", opportunity);

  const generation = await requestJson("/api/duplicate-candidates/generate", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "contact",
      limit: 100,
    },
  });
  const candidate = generation.json.candidates.find((item) =>
    item.entityType === "contact" &&
    [item.leftRecordId, item.rightRecordId].includes(masterContact.json.id) &&
    [item.leftRecordId, item.rightRecordId].includes(duplicateContact.json.id)
  );
  assert(candidate, "Contact candidate missing for audit smoke", generation.json);

  const merge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-contact`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterContact.json.id,
      mergeReason: `Audit contact merge ${stamp}`,
    },
  });
  assert(merge.status === 200, "Contact merge failed for audit smoke", merge);

  return {
    candidateId: candidate.id,
    masterContactId: masterContact.json.id,
    duplicateContactId: duplicateContact.json.id,
  };
}
