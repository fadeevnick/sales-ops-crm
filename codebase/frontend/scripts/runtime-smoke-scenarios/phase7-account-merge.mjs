export default async function phase7AccountMergeSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const rep = "user_anna";
  const manager = "user_michael";
  const stamp = Date.now();
  const accountName = `Phase 7 Merge Account ${stamp}`;
  const losingContactName = `Phase 7 Merge Contact ${stamp}`;
  const opportunityTitle = `Phase 7 Merge Opportunity ${stamp}`;
  const mergeReason = `Runtime account merge ${stamp}`;

  const masterAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase7-merge-master.example",
    },
  });
  assert(masterAccount.status === 201, "Master account creation failed", masterAccount);

  const duplicateAccount = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName.toUpperCase(),
      website: "https://phase7-merge-duplicate.example",
    },
  });
  assert(duplicateAccount.status === 201, "Duplicate account creation failed", duplicateAccount);

  const losingContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: duplicateAccount.json.id,
      fullName: losingContactName,
      email: `phase7.merge.${stamp}@example.com`,
      phone: "+15550401",
    },
  });
  assert(losingContact.status === 201, "Losing contact creation failed", losingContact);

  const losingOpportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: duplicateAccount.json.id,
      title: opportunityTitle,
      stageKey: "qualification",
      expectedAmount: 64000,
      closeDate: "2026-11-15",
    },
  });
  assert(losingOpportunity.status === 201, "Losing opportunity creation failed", losingOpportunity);

  const generation = await requestJson("/api/duplicate-candidates/generate", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "account",
      limit: 100,
    },
  });
  assert(generation.status === 201, "Duplicate candidate generation failed", generation);

  const candidate = generation.json.candidates.find((item) =>
    item.entityType === "account" &&
    [item.leftRecordId, item.rightRecordId].includes(masterAccount.json.id) &&
    [item.leftRecordId, item.rightRecordId].includes(duplicateAccount.json.id)
  );
  assert(candidate, "Generated account merge candidate not found", generation.json);

  for (const [userId, label] of [[rep, "Sales Rep"], [manager, "Sales Manager"]]) {
    const forbidden = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
      method: "POST",
      userId,
      body: {
        masterRecordId: masterAccount.json.id,
        mergeReason: `${label} should not merge`,
      },
    });
    assert(forbidden.status === 403, `${label} merge should be forbidden`, forbidden);
  }

  const invalidMaster = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: "acc_not_in_candidate",
      mergeReason: "invalid master",
    },
  });
  assert(invalidMaster.status === 422, "Invalid merge master should fail", invalidMaster);

  const merge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterAccount.json.id,
      mergeReason,
    },
  });
  assert(merge.status === 200, "RevOps account merge failed", merge);
  assert(merge.json.candidate.status === "merged", "Merged candidate status mismatch", merge.json);
  assert(merge.json.masterRecordId === masterAccount.json.id, "Merge master id mismatch", merge.json);
  assert(merge.json.duplicateRecordId === duplicateAccount.json.id, "Merge duplicate id mismatch", merge.json);
  assert(merge.json.reassignedContacts === 1, "Reassigned contact count mismatch", merge.json);
  assert(merge.json.reassignedOpportunities === 1, "Reassigned opportunity count mismatch", merge.json);

  const secondMerge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-account`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterAccount.json.id,
      mergeReason: "second merge should fail",
    },
  });
  assert(secondMerge.status === 422, "Second merge should fail", secondMerge);

  const masterContacts = await requestJson(`/api/contacts?accountId=${encodeURIComponent(masterAccount.json.id)}&q=${encodeURIComponent(losingContactName)}`, {
    userId: revops,
  });
  assert(masterContacts.status === 200, "Master contact lookup failed", masterContacts);
  assert(
    masterContacts.json.items.some((item) => item.id === losingContact.json.id && item.accountId === masterAccount.json.id),
    "Losing contact was not reassigned to master account",
    masterContacts.json,
  );

  const duplicateContacts = await requestJson(`/api/contacts?accountId=${encodeURIComponent(duplicateAccount.json.id)}&q=${encodeURIComponent(losingContactName)}`, {
    userId: revops,
  });
  assert(duplicateContacts.status === 200, "Duplicate contact lookup failed", duplicateContacts);
  assert(
    !duplicateContacts.json.items.some((item) => item.id === losingContact.json.id),
    "Losing contact is still attached to duplicate account",
    duplicateContacts.json,
  );

  const masterOpportunities = await requestJson(`/api/opportunities?accountId=${encodeURIComponent(masterAccount.json.id)}&q=${encodeURIComponent(opportunityTitle)}`, {
    userId: revops,
  });
  assert(masterOpportunities.status === 200, "Master opportunity lookup failed", masterOpportunities);
  assert(
    masterOpportunities.json.items.some((item) => item.id === losingOpportunity.json.id && item.accountId === masterAccount.json.id),
    "Losing opportunity was not reassigned to master account",
    masterOpportunities.json,
  );

  const duplicateOpportunities = await requestJson(`/api/opportunities?accountId=${encodeURIComponent(duplicateAccount.json.id)}&q=${encodeURIComponent(opportunityTitle)}`, {
    userId: revops,
  });
  assert(duplicateOpportunities.status === 200, "Duplicate opportunity lookup failed", duplicateOpportunities);
  assert(
    !duplicateOpportunities.json.items.some((item) => item.id === losingOpportunity.json.id),
    "Losing opportunity is still attached to duplicate account",
    duplicateOpportunities.json,
  );

  const openCandidates = await requestJson("/api/duplicate-candidates?entityType=account&status=open&limit=200", {
    userId: revops,
  });
  assert(openCandidates.status === 200, "Open candidate list failed", openCandidates);
  assert(
    !openCandidates.json.candidates.some((item) => item.id === candidate.id),
    "Merged candidate should not remain in open queue",
    openCandidates.json,
  );

  const mergedCandidates = await requestJson("/api/duplicate-candidates?entityType=account&status=merged&limit=200", {
    userId: revops,
  });
  assert(mergedCandidates.status === 200, "Merged candidate list failed", mergedCandidates);
  const listedMerged = mergedCandidates.json.candidates.find((item) => item.id === candidate.id);
  assert(listedMerged, "Merged candidate missing from merged queue", mergedCandidates.json);
  assert(listedMerged.mergeMasterRecordId === masterAccount.json.id, "Merged queue master id mismatch", listedMerged);
  assert(listedMerged.mergeDuplicateRecordId === duplicateAccount.json.id, "Merged queue duplicate id mismatch", listedMerged);
  assert(listedMerged.mergeReason === mergeReason, "Merged queue reason mismatch", listedMerged);

  return {
    stamp,
    candidateId: candidate.id,
    masterAccountId: masterAccount.json.id,
    duplicateAccountId: duplicateAccount.json.id,
    contactId: losingContact.json.id,
    opportunityId: losingOpportunity.json.id,
    reassignedContacts: merge.json.reassignedContacts,
    reassignedOpportunities: merge.json.reassignedOpportunities,
    invalidMasterStatus: invalidMaster.status,
    secondMergeStatus: secondMerge.status,
    forbidden: {
      salesRep: 403,
      salesManager: 403,
    },
  };
}
