export default async function phase9MetadataSafetySmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const manager = "user_michael";
  const stamp = Date.now();

  const publishedBefore = await requestJson("/api/metadata/published", { userId: revops });
  assert(publishedBefore.status === 200, "Published metadata read failed", publishedBefore);

  const managerDraft = await requestJson("/api/metadata/drafts", {
    method: "POST",
    userId: manager,
    body: { notes: "Manager should not create metadata drafts" },
  });
  assert(managerDraft.status === 403, "Sales Manager metadata draft creation should be forbidden", managerDraft);

  const draftState = await loadOrCreateDraft({ assert, requestJson, revops, stamp });
  let createdRequiredFieldId = null;
  try {
    const invalidRule = await requestJson(`/api/metadata/drafts/${draftState.draftId}/required-fields`, {
      method: "POST",
      userId: revops,
      body: {
        stageKey: "qualification",
        entityType: "opportunity",
        fieldKey: `phase9_missing_field_${stamp}`,
      },
    });
    assert(invalidRule.status === 201, "Invalid metadata required-field rule creation failed", invalidRule);
    const createdRule = invalidRule.json.requiredFields.find((item) =>
      item.stageKey === "qualification" &&
      item.fieldKey === `phase9_missing_field_${stamp}`
    );
    assert(createdRule, "Created invalid required-field rule missing from draft response", invalidRule.json);
    createdRequiredFieldId = createdRule.id;

    const validation = await requestJson(`/api/metadata/drafts/${draftState.draftId}/validate`, {
      method: "POST",
      userId: revops,
    });
    assert(validation.status === 200, "Metadata validation request failed", validation);
    assert(validation.json.valid === false, "Invalid metadata draft should not validate", validation.json);
    const unknownFieldError = validation.json.errors.find((item) => item.code === "unknown_required_field_key");
    assert(unknownFieldError, "Expected unknown_required_field_key validation error missing", validation.json);

    const publish = await requestJson(`/api/metadata/drafts/${draftState.draftId}/publish`, {
      method: "POST",
      userId: revops,
    });
    assert(publish.status === 422, "Invalid metadata draft publish should fail", publish);

    const publishedAfterFailedPublish = await requestJson("/api/metadata/published", { userId: revops });
    assert(publishedAfterFailedPublish.status === 200, "Published metadata read after failed publish failed", publishedAfterFailedPublish);
    assert(
      publishedAfterFailedPublish.json.configVersion.id === publishedBefore.json.configVersion.id,
      "Published metadata version changed after failed publish",
      {
        before: publishedBefore.json.configVersion,
        after: publishedAfterFailedPublish.json.configVersion,
      },
    );

    return {
      stamp,
      draftId: draftState.draftId,
      draftCreatedBySmoke: draftState.createdBySmoke,
      publishedVersionBefore: publishedBefore.json.configVersion.versionNumber,
      publishedVersionAfter: publishedAfterFailedPublish.json.configVersion.versionNumber,
      validationErrorCode: unknownFieldError.code,
      managerDraftStatus: managerDraft.status,
      invalidPublishStatus: publish.status,
    };
  } finally {
    await cleanupDraftMutation({
      requestJson,
      revops,
      draftId: draftState.draftId,
      requiredFieldId: createdRequiredFieldId,
      discardDraft: draftState.createdBySmoke,
    });
  }
}

async function loadOrCreateDraft({ assert, requestJson, revops, stamp }) {
  const currentDraft = await requestJson("/api/metadata/drafts/current", { userId: revops });
  if (currentDraft.status === 200) {
    return {
      draftId: currentDraft.json.configVersion.id,
      createdBySmoke: false,
    };
  }
  assert(currentDraft.status === 422, "Unexpected current draft lookup response", currentDraft);

  const created = await requestJson("/api/metadata/drafts", {
    method: "POST",
    userId: revops,
    body: {
      notes: `Phase 9 metadata safety smoke ${stamp}`,
    },
  });
  assert(created.status === 201, "Metadata draft creation failed", created);

  return {
    draftId: created.json.configVersion.id,
    createdBySmoke: true,
  };
}

async function cleanupDraftMutation({ requestJson, revops, draftId, requiredFieldId, discardDraft }) {
  if (requiredFieldId) {
    await requestJson(`/api/metadata/drafts/${draftId}/required-fields/${requiredFieldId}`, {
      method: "DELETE",
      userId: revops,
    });
  }

  if (discardDraft) {
    await requestJson(`/api/metadata/drafts/${draftId}`, {
      method: "DELETE",
      userId: revops,
    });
  }
}
