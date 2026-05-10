export default async function phase9MetadataRollbackSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const manager = "user_michael";
  const stamp = Date.now();
  const fieldKey = `phase9_rollback_${stamp}`;

  const currentDraft = await requestJson("/api/metadata/drafts/current", { userId: revops });
  assert(
    currentDraft.status === 422,
    "Metadata rollback smoke requires no existing draft so it does not mutate user work",
    currentDraft,
  );

  const publishedBefore = await requestJson("/api/metadata/published", { userId: revops });
  assert(publishedBefore.status === 200, "Published metadata read before rollback smoke failed", publishedBefore);

  const managerRollback = await requestJson(`/api/metadata/config-versions/${publishedBefore.json.configVersion.id}/rollback`, {
    method: "POST",
    userId: manager,
  });
  assert(managerRollback.status === 403, "Sales Manager metadata rollback should be forbidden", managerRollback);

  let draftId = null;
  let publishedTemporaryVersion = false;
  let rolledBack = false;

  try {
    const draft = await requestJson("/api/metadata/drafts", {
      method: "POST",
      userId: revops,
      body: {
        notes: `Phase 9 metadata rollback smoke ${stamp}`,
      },
    });
    assert(draft.status === 201, "Metadata rollback draft creation failed", draft);
    draftId = draft.json.configVersion.id;

    const maxAccountSortOrder = Math.max(
      0,
      ...draft.json.fields
        .filter((field) => field.entityType === "account")
        .map((field) => field.sortOrder),
    );
    const createdField = await requestJson(`/api/metadata/drafts/${draftId}/fields`, {
      method: "POST",
      userId: revops,
      body: {
        entityType: "account",
        fieldKey,
        label: `Phase 9 Rollback ${stamp}`,
        fieldType: "text",
        isRequiredDefault: false,
        selectOptions: [],
        sortOrder: maxAccountSortOrder + 1000,
        isActive: true,
      },
    });
    assert(createdField.status === 201, "Metadata rollback field creation failed", createdField);
    assert(
      createdField.json.fields.some((field) => field.fieldKey === fieldKey),
      "Rollback smoke field missing from draft",
      createdField.json,
    );

    const validation = await requestJson(`/api/metadata/drafts/${draftId}/validate`, {
      method: "POST",
      userId: revops,
    });
    assert(validation.status === 200, "Metadata rollback draft validation failed", validation);
    assert(validation.json.valid === true, "Metadata rollback draft should validate", validation.json);

    const publish = await requestJson(`/api/metadata/drafts/${draftId}/publish`, {
      method: "POST",
      userId: revops,
    });
    assert(publish.status === 200, "Metadata rollback draft publish failed", publish);
    publishedTemporaryVersion = true;
    assert(
      publish.json.configVersion.versionNumber > publishedBefore.json.configVersion.versionNumber,
      "Temporary metadata version should be newer than original",
      publish.json,
    );

    const publishedTemporary = await requestJson("/api/metadata/published", { userId: revops });
    assert(publishedTemporary.status === 200, "Temporary published metadata read failed", publishedTemporary);
    assert(
      publishedTemporary.json.fields.some((field) => field.fieldKey === fieldKey),
      "Temporary field missing from published metadata after publish",
      publishedTemporary.json,
    );

    const rollback = await requestJson(`/api/metadata/config-versions/${publishedBefore.json.configVersion.id}/rollback`, {
      method: "POST",
      userId: revops,
    });
    assert(rollback.status === 200, "Metadata rollback failed", rollback);
    rolledBack = true;
    assert(
      rollback.json.configVersion.id === publishedBefore.json.configVersion.id,
      "Rollback did not restore original published config id",
      {
        before: publishedBefore.json.configVersion,
        rollback: rollback.json.configVersion,
      },
    );
    assert(
      !rollback.json.fields.some((field) => field.fieldKey === fieldKey),
      "Temporary field remained after rollback",
      rollback.json,
    );

    const versions = await requestJson("/api/metadata/config-versions", { userId: revops });
    assert(versions.status === 200, "Metadata config version list failed after rollback", versions);
    const temporaryVersion = versions.json.configVersions.find((version) => version.id === publish.json.configVersion.id);
    assert(temporaryVersion?.status === "archived", "Temporary metadata version should be archived after rollback", versions.json);

    return {
      stamp,
      fieldKey,
      originalVersionId: publishedBefore.json.configVersion.id,
      originalVersionNumber: publishedBefore.json.configVersion.versionNumber,
      temporaryVersionId: publish.json.configVersion.id,
      temporaryVersionNumber: publish.json.configVersion.versionNumber,
      rolledBackVersionId: rollback.json.configVersion.id,
      managerRollbackStatus: managerRollback.status,
    };
  } finally {
    if (publishedTemporaryVersion && !rolledBack) {
      await requestJson(`/api/metadata/config-versions/${publishedBefore.json.configVersion.id}/rollback`, {
        method: "POST",
        userId: revops,
      });
    } else if (draftId && !publishedTemporaryVersion) {
      await requestJson(`/api/metadata/drafts/${draftId}`, {
        method: "DELETE",
        userId: revops,
      });
    }
  }
}
