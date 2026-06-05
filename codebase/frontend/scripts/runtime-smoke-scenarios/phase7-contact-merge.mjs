export default async function phase7ContactMergeSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const rep = "user_anna";
  const manager = "user_michael";
  const stamp = Date.now();
  const accountName = `Phase 7 Contact Merge Account ${stamp}`;
  const masterContactName = `Phase 7 Contact Merge Master ${stamp}`;
  const duplicateContactName = `Phase 7 Contact Merge Duplicate ${stamp}`;
  const duplicateEmail = `phase7.contact.merge.${stamp}@example.com`;
  const opportunityTitle = `Phase 7 Contact Merge Opportunity ${stamp}`;
  const mergeReason = `Runtime contact merge ${stamp}`;

  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase7-contact-merge.example",
    },
  });
  assert(account.status === 201, "Account creation failed", account);

  const masterContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: masterContactName,
      email: duplicateEmail,
      phone: "+15550501",
    },
  });
  assert(masterContact.status === 201, "Master contact creation failed", masterContact);

  const duplicateContact = await requestJson("/api/contacts", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      fullName: duplicateContactName,
      email: duplicateEmail.toUpperCase(),
      phone: "+15550502",
    },
  });
  assert(duplicateContact.status === 201, "Duplicate contact creation failed", duplicateContact);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      primaryContactId: duplicateContact.json.id,
      title: opportunityTitle,
      stageKey: "qualification",
      expectedAmount: 52000,
      closeDate: "2026-12-02",
    },
  });
  assert(opportunity.status === 201, "Opportunity creation failed", opportunity);

  const generation = await requestJson("/api/duplicate-candidates/generate", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "contact",
      limit: 100,
    },
  });
  assert(generation.status === 201, "Duplicate candidate generation failed", generation);

  const candidate = generation.json.candidates.find((item) =>
    item.entityType === "contact" &&
    [item.leftRecordId, item.rightRecordId].includes(masterContact.json.id) &&
    [item.leftRecordId, item.rightRecordId].includes(duplicateContact.json.id)
  );
  assert(candidate, "Generated contact merge candidate not found", generation.json);

  for (const [userId, label] of [[rep, "Sales Rep"], [manager, "Sales Manager"]]) {
    const forbidden = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-contact`, {
      method: "POST",
      userId,
      body: {
        masterRecordId: masterContact.json.id,
        mergeReason: `${label} should not merge`,
      },
    });
    assert(forbidden.status === 403, `${label} merge should be forbidden`, forbidden);
  }

  const invalidMaster = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-contact`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: "con_not_in_candidate",
      mergeReason: "invalid master",
    },
  });
  assert(invalidMaster.status === 422, "Invalid merge master should fail", invalidMaster);

  const merge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-contact`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterContact.json.id,
      mergeReason,
    },
  });
  assert(merge.status === 200, "RevOps contact merge failed", merge);
  assert(merge.json.candidate.status === "merged", "Merged candidate status mismatch", merge.json);
  assert(merge.json.masterRecordId === masterContact.json.id, "Merge master id mismatch", merge.json);
  assert(merge.json.duplicateRecordId === duplicateContact.json.id, "Merge duplicate id mismatch", merge.json);
  assert(merge.json.reassignedPrimaryContactOpportunities === 1, "Reassigned primary contact count mismatch", merge.json);

  const secondMerge = await requestJson(`/api/duplicate-candidates/${candidate.id}/merge-contact`, {
    method: "POST",
    userId: revops,
    body: {
      masterRecordId: masterContact.json.id,
      mergeReason: "second merge should fail",
    },
  });
  assert(secondMerge.status === 422, "Second merge should fail", secondMerge);

  const opportunityDetail = await requestJson(`/api/opportunities/${opportunity.json.id}`, {
    userId: revops,
  });
  assert(opportunityDetail.status === 200, "Opportunity detail lookup failed", opportunityDetail);
  assert(
    opportunityDetail.json.primaryContact?.id === masterContact.json.id,
    "Opportunity primary contact was not reassigned to master contact",
    opportunityDetail.json,
  );

  const openCandidates = await requestJson("/api/duplicate-candidates?entityType=contact&status=open&limit=200", {
    userId: revops,
  });
  assert(openCandidates.status === 200, "Open candidate list failed", openCandidates);
  assert(
    !openCandidates.json.candidates.some((item) => item.id === candidate.id),
    "Merged candidate should not remain in open queue",
    openCandidates.json,
  );

  const mergedCandidates = await requestJson("/api/duplicate-candidates?entityType=contact&status=merged&limit=200", {
    userId: revops,
  });
  assert(mergedCandidates.status === 200, "Merged candidate list failed", mergedCandidates);
  const listedMerged = mergedCandidates.json.candidates.find((item) => item.id === candidate.id);
  assert(listedMerged, "Merged candidate missing from merged queue", mergedCandidates.json);
  assert(listedMerged.mergeMasterRecordId === masterContact.json.id, "Merged queue master id mismatch", listedMerged);
  assert(listedMerged.mergeDuplicateRecordId === duplicateContact.json.id, "Merged queue duplicate id mismatch", listedMerged);
  assert(listedMerged.mergeReason === mergeReason, "Merged queue reason mismatch", listedMerged);

  return {
    stamp,
    candidateId: candidate.id,
    accountId: account.json.id,
    masterContactId: masterContact.json.id,
    duplicateContactId: duplicateContact.json.id,
    opportunityId: opportunity.json.id,
    reassignedPrimaryContactOpportunities: merge.json.reassignedPrimaryContactOpportunities,
    invalidMasterStatus: invalidMaster.status,
    secondMergeStatus: secondMerge.status,
    forbidden: {
      salesRep: 403,
      salesManager: 403,
    },
  };
}
