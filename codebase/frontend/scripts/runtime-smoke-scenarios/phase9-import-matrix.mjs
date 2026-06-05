export default async function phase9ImportMatrixSmoke({ assert, delay, requestJson }) {
  const revops = "user_irina";
  const stamp = Date.now();

  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: `Phase 9 Import Matrix Account ${stamp}`,
      website: "https://phase9-import-matrix.example",
    },
  });
  assert(account.status === 201, "Import matrix account fixture creation failed", account);

  const contactImport = await executeContactImport({
    assert,
    delay,
    requestJson,
    revops,
    stamp,
    accountName: `Phase 9 Import Matrix Account ${stamp}`,
    accountId: account.json.id,
  });
  const opportunityImport = await executeOpportunityImport({
    assert,
    delay,
    requestJson,
    revops,
    stamp,
    accountName: `Phase 9 Import Matrix Account ${stamp}`,
    accountId: account.json.id,
  });

  return {
    stamp,
    accountId: account.json.id,
    contactImportJobId: contactImport.importJobId,
    importedContactId: contactImport.createdRecordId,
    opportunityImportJobId: opportunityImport.importJobId,
    importedOpportunityId: opportunityImport.createdRecordId,
  };
}

async function executeContactImport({ assert, delay, requestJson, revops, stamp, accountName, accountId }) {
  const importedContactName = `Phase 9 Imported Contact ${stamp}`;
  const preview = await requestJson("/api/import-jobs/preview", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "contact",
      fileName: `phase9-contact-import-${stamp}.csv`,
      csvContent: [
        "Full Name,Email,Account Name",
        `${importedContactName},phase9.import.contact.${stamp}@example.com,${accountName}`,
        `,phase9.import.contact.invalid.${stamp}@example.com,${accountName}`,
      ].join("\n") + "\n",
      mapping: {
        "Full Name": "fullName",
        Email: "email",
        "Account Name": "accountName",
      },
    },
  });
  assert(preview.status === 201, "Contact import preview failed", preview);
  assert(preview.json.job.validRows === 1, "Contact import valid row count mismatch", preview.json.job);
  assert(preview.json.job.invalidRows === 1, "Contact import invalid row count mismatch", preview.json.job);

  const execute = await requestJson(`/api/import-jobs/${preview.json.job.id}/execute`, {
    method: "POST",
    userId: revops,
  });
  assert(execute.status === 200, "Contact import execute failed", execute);

  const detail = await waitForImportExecution({
    assert,
    delay,
    requestJson,
    userId: revops,
    importJobId: preview.json.job.id,
  });
  assert(detail.json.job.executedRows === 1, "Contact import executed row count mismatch", detail.json.job);
  assert(detail.json.job.skippedRows === 1, "Contact import skipped row count mismatch", detail.json.job);
  const createdRow = detail.json.rows.find((row) => row.executionStatus === "created");
  assert(createdRow?.createdRecordId, "Contact import created row id missing", detail.json.rows);

  const contacts = await requestJson(
    `/api/contacts?accountId=${encodeURIComponent(accountId)}&q=${encodeURIComponent(importedContactName)}`,
    { userId: revops },
  );
  assert(contacts.status === 200, "Imported contact lookup failed", contacts);
  assert(
    contacts.json.items.some((item) => item.id === createdRow.createdRecordId && item.fullName === importedContactName),
    "Imported contact not visible in contact list",
    contacts.json,
  );

  return {
    importJobId: preview.json.job.id,
    createdRecordId: createdRow.createdRecordId,
  };
}

async function executeOpportunityImport({ assert, delay, requestJson, revops, stamp, accountName, accountId }) {
  const importedOpportunityTitle = `Phase 9 Imported Opportunity ${stamp}`;
  const preview = await requestJson("/api/import-jobs/preview", {
    method: "POST",
    userId: revops,
    body: {
      entityType: "opportunity",
      fileName: `phase9-opportunity-import-${stamp}.csv`,
      csvContent: [
        "Title,Account Name,Stage,Expected Amount,Close Date",
        `${importedOpportunityTitle},${accountName},qualification,43210.50,2027-04-10`,
        `Phase 9 Bad Stage ${stamp},${accountName},missing_stage,not-a-number,not-a-date`,
      ].join("\n") + "\n",
      mapping: {
        Title: "title",
        "Account Name": "accountName",
        Stage: "stageKey",
        "Expected Amount": "expectedAmount",
        "Close Date": "closeDate",
      },
    },
  });
  assert(preview.status === 201, "Opportunity import preview failed", preview);
  assert(preview.json.job.validRows === 1, "Opportunity import valid row count mismatch", preview.json.job);
  assert(preview.json.job.invalidRows === 1, "Opportunity import invalid row count mismatch", preview.json.job);

  const execute = await requestJson(`/api/import-jobs/${preview.json.job.id}/execute`, {
    method: "POST",
    userId: revops,
  });
  assert(execute.status === 200, "Opportunity import execute failed", execute);

  const detail = await waitForImportExecution({
    assert,
    delay,
    requestJson,
    userId: revops,
    importJobId: preview.json.job.id,
  });
  assert(detail.json.job.executedRows === 1, "Opportunity import executed row count mismatch", detail.json.job);
  assert(detail.json.job.skippedRows === 1, "Opportunity import skipped row count mismatch", detail.json.job);
  const createdRow = detail.json.rows.find((row) => row.executionStatus === "created");
  assert(createdRow?.createdRecordId, "Opportunity import created row id missing", detail.json.rows);

  const opportunities = await requestJson(
    `/api/opportunities?accountId=${encodeURIComponent(accountId)}&q=${encodeURIComponent(importedOpportunityTitle)}`,
    { userId: revops },
  );
  assert(opportunities.status === 200, "Imported opportunity lookup failed", opportunities);
  assert(
    opportunities.json.items.some((item) =>
      item.id === createdRow.createdRecordId &&
      item.title === importedOpportunityTitle &&
      item.stageKey === "qualification"
    ),
    "Imported opportunity not visible in opportunity list",
    opportunities.json,
  );

  return {
    importJobId: preview.json.job.id,
    createdRecordId: createdRow.createdRecordId,
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
