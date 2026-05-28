import { useEffect, useMemo, useState } from "react";
import {
  createMetadataDraft,
  createMetadataFieldDefinition,
  createMetadataRequiredField,
  createMetadataStageDefinition,
  discardMetadataDraft,
  deleteMetadataFieldDefinition,
  deleteMetadataRequiredField,
  deleteMetadataStageDefinition,
  fetchMetadataConfigVersions,
  fetchCurrentMetadataDraft,
  fetchPublishedMetadata,
  publishMetadataDraft,
  rollbackMetadataConfigVersion,
  updateMetadataFieldDefinition,
  updateMetadataStageDefinition,
  validateMetadataDraft,
} from "../../api/metadata";
import { ApiRequestError, describeRequestError } from "../../api/session";
import type {
  MetadataFieldDefinitionItem,
  MetadataConfigVersionItem,
  MetadataSelectOptionItem,
  MetadataStageDefinitionItem,
  MetadataValidationResponse,
  PublishedMetadataResponse,
  SaveMetadataFieldDefinitionRequest,
  SaveMetadataStageDefinitionRequest,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";

type MetadataAdminWorkspaceProps = {
  currentUser: CurrentUser;
};

type FieldFormState = {
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequiredDefault: boolean;
  selectOptionsText: string;
  sortOrder: string;
  isActive: boolean;
};

type StageFormState = {
  stageKey: string;
  displayName: string;
  sortOrder: string;
  isClosed: boolean;
};

const emptyFieldForm: FieldFormState = {
  entityType: "opportunity",
  fieldKey: "",
  label: "",
  fieldType: "text",
  isRequiredDefault: false,
  selectOptionsText: "",
  sortOrder: "100",
  isActive: true,
};

const emptyStageForm: StageFormState = {
  stageKey: "",
  displayName: "",
  sortOrder: "100",
  isClosed: false,
};

type MetadataAdminTab = "overview" | "fields" | "stages" | "rules" | "history" | "validation";

const METADATA_ADMIN_TABS: { key: MetadataAdminTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "fields", label: "Fields" },
  { key: "stages", label: "Stages" },
  { key: "rules", label: "Required Rules" },
  { key: "history", label: "History" },
  { key: "validation", label: "Validation" },
];

export function MetadataAdminWorkspace({ currentUser }: MetadataAdminWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<MetadataAdminTab>("overview");
  const [published, setPublished] = useState<PublishedMetadataResponse | null>(null);
  const [draft, setDraft] = useState<PublishedMetadataResponse | null>(null);
  const [configVersions, setConfigVersions] = useState<MetadataConfigVersionItem[]>([]);
  const [validation, setValidation] = useState<MetadataValidationResponse | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState<StageFormState>(emptyStageForm);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [requiredStageKey, setRequiredStageKey] = useState("");
  const [requiredFieldKey, setRequiredFieldKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMetadata = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const publishedResponse = await fetchPublishedMetadata(currentUser.userId);
      setPublished(publishedResponse);
      const versionsResponse = await fetchMetadataConfigVersions(currentUser.userId);
      setConfigVersions(versionsResponse.configVersions);

      try {
        const draftResponse = await fetchCurrentMetadataDraft(currentUser.userId);
        setDraft(draftResponse);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 422) {
          setDraft(null);
        } else {
          throw error;
        }
      }
    } catch (error) {
      setErrorMessage(describeRequestError(error));
      setPublished(null);
      setDraft(null);
      setConfigVersions([]);
      setValidation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConfigVersions = async () => {
    const versionsResponse = await fetchMetadataConfigVersions(currentUser.userId);
    setConfigVersions(versionsResponse.configVersions);
  };

  useEffect(() => {
    void loadMetadata();
  }, [currentUser.userId]);

  const activeConfig = draft ?? published;
  const stageCount = activeConfig?.stages.length ?? 0;
  const fieldCount = activeConfig?.fields.length ?? 0;
  const requiredRuleCount = activeConfig?.requiredFields.length ?? 0;
  const validationIssueCount = (validation?.errors.length ?? 0) + (validation?.warnings.length ?? 0);

  const orderedStages = useMemo(
    () => [...(activeConfig?.stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [activeConfig],
  );
  const orderedFields = useMemo(
    () =>
      [...(activeConfig?.fields ?? [])].sort(
        (a, b) =>
          a.entityType.localeCompare(b.entityType) ||
          a.sortOrder - b.sortOrder ||
          a.fieldKey.localeCompare(b.fieldKey),
      ),
    [activeConfig],
  );
  const draftOpportunityFields = useMemo(
    () =>
      [...(draft?.fields ?? [])]
        .filter((field) => field.entityType === "opportunity" && field.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.fieldKey.localeCompare(b.fieldKey)),
    [draft],
  );

  const applyDraftUpdate = (nextDraft: PublishedMetadataResponse, successMessage: string) => {
    setDraft(nextDraft);
    setValidation(null);
    setMessage(successMessage);
  };

  const createDraft = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const draftResponse = await createMetadataDraft(currentUser.userId, {
        notes: draftNotes.trim() || undefined,
      });

      setDraft(draftResponse);
      setFieldForm(emptyFieldForm);
      setStageForm(emptyStageForm);
      setRequiredStageKey(draftResponse.stages[0]?.stageKey ?? "");
      setRequiredFieldKey(draftResponse.fields.find((field) => field.entityType === "opportunity")?.fieldKey ?? "");
      setValidation(null);
      setDraftNotes("");
      setMessage("Metadata draft created");
      await refreshConfigVersions();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateDraft = async () => {
    if (!draft) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const validationResponse = await validateMetadataDraft(
        currentUser.userId,
        draft.configVersion.id,
      );

      setValidation(validationResponse);
      setMessage(validationResponse.valid ? "Metadata draft is valid" : "Metadata draft needs changes");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishDraft = async () => {
    if (!draft) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const publishResponse = await publishMetadataDraft(currentUser.userId, draft.configVersion.id);
      setPublished({
        configVersion: publishResponse.configVersion,
        fields: draft.fields,
        stages: draft.stages,
        requiredFields: draft.requiredFields,
      });
      setDraft(null);
      setEditingFieldId(null);
      setEditingStageId(null);
      setValidation(publishResponse.validation);
      setMessage("Metadata draft published");
      await refreshConfigVersions();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardDraft = async () => {
    if (!draft) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const versionsResponse = await discardMetadataDraft(currentUser.userId, draft.configVersion.id);
      setConfigVersions(versionsResponse.configVersions);
      setDraft(null);
      setEditingFieldId(null);
      setEditingStageId(null);
      setFieldForm(emptyFieldForm);
      setStageForm(emptyStageForm);
      setValidation(null);
      setMessage("Metadata draft discarded");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const rollbackConfigVersion = async (configVersionId: string) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const rollbackResponse = await rollbackMetadataConfigVersion(currentUser.userId, configVersionId);
      setPublished(rollbackResponse);
      setDraft(null);
      setEditingFieldId(null);
      setEditingStageId(null);
      setValidation(null);
      setMessage(`Metadata rolled back to version ${rollbackResponse.configVersion.versionNumber}`);
      await refreshConfigVersions();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const runDraftMutation = async (mutation: () => Promise<PublishedMetadataResponse>, successMessage: string) => {
    if (!draft) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const nextDraft = await mutation();
      applyDraftUpdate(nextDraft, successMessage);
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveField = async () => {
    if (!draft) {
      return;
    }

    const request = buildFieldRequest(fieldForm);
    if (!request) {
      setErrorMessage("Field key, label and numeric sort order are required");
      return;
    }

    await runDraftMutation(
      () =>
        editingFieldId
          ? updateMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, editingFieldId, request)
          : createMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, request),
      editingFieldId ? "Field updated" : "Field created",
    );

    setFieldForm(emptyFieldForm);
    setEditingFieldId(null);
  };

  const editField = (field: MetadataFieldDefinitionItem) => {
    setEditingFieldId(field.id);
    setFieldForm({
      entityType: field.entityType,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      isRequiredDefault: field.isRequiredDefault,
      selectOptionsText: field.selectOptions.map((option) => `${option.value}|${option.label}`).join("\n"),
      sortOrder: field.sortOrder.toString(),
      isActive: field.isActive,
    });
  };

  const removeField = async (fieldId: string) => {
    if (!draft) {
      return;
    }

    await runDraftMutation(
      () => deleteMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, fieldId),
      "Field deleted",
    );
    if (editingFieldId === fieldId) {
      setEditingFieldId(null);
      setFieldForm(emptyFieldForm);
    }
  };

  const saveStage = async () => {
    if (!draft) {
      return;
    }

    const request = buildStageRequest(stageForm);
    if (!request) {
      setErrorMessage("Stage key, display name and numeric sort order are required");
      return;
    }

    await runDraftMutation(
      () =>
        editingStageId
          ? updateMetadataStageDefinition(currentUser.userId, draft.configVersion.id, editingStageId, request)
          : createMetadataStageDefinition(currentUser.userId, draft.configVersion.id, request),
      editingStageId ? "Stage updated" : "Stage created",
    );

    setStageForm(emptyStageForm);
    setEditingStageId(null);
  };

  const editStage = (stage: MetadataStageDefinitionItem) => {
    setEditingStageId(stage.id);
    setStageForm({
      stageKey: stage.stageKey,
      displayName: stage.displayName,
      sortOrder: stage.sortOrder.toString(),
      isClosed: stage.isClosed,
    });
  };

  const removeStage = async (stageId: string) => {
    if (!draft) {
      return;
    }

    await runDraftMutation(
      () => deleteMetadataStageDefinition(currentUser.userId, draft.configVersion.id, stageId),
      "Stage deleted",
    );
    if (editingStageId === stageId) {
      setEditingStageId(null);
      setStageForm(emptyStageForm);
    }
  };

  const createRequiredRule = async () => {
    const stageKey = requiredStageKey || draft?.stages[0]?.stageKey || "";
    const fieldKey = requiredFieldKey || draftOpportunityFields[0]?.fieldKey || "title";
    if (!draft || !stageKey || !fieldKey) {
      return;
    }

    await runDraftMutation(
      () =>
        createMetadataRequiredField(currentUser.userId, draft.configVersion.id, {
          entityType: "opportunity",
          fieldKey,
          stageKey,
        }),
      "Required rule created",
    );
  };

  const removeRequiredRule = async (requiredFieldId: string) => {
    if (!draft) {
      return;
    }

    await runDraftMutation(
      () => deleteMetadataRequiredField(currentUser.userId, draft.configVersion.id, requiredFieldId),
      "Required rule deleted",
    );
  };

  const resolvedRequiredStageKey = requiredStageKey || draft?.stages[0]?.stageKey || "";
  const resolvedRequiredFieldKey = requiredFieldKey || draftOpportunityFields[0]?.fieldKey || "title";

  return (
    <section className="metadata-workspace ma-workspace">
      <div className="workspace-header metadata-header">
        <div>
          <span>{currentUser.displayName}</span>
          <h2>Metadata Admin</h2>
        </div>
        <div className="workspace-metrics">
          <strong>{published?.configVersion.versionNumber ?? "-"}</strong>
          <span>{draft ? `draft ${draft.configVersion.versionNumber}` : "published only"}</span>
        </div>
      </div>

      <div className="ma-version-band">
        <div className="ma-version-cell">
          <div className="ma-version-l">Published</div>
          <div className="ma-version-v mono">v{published?.configVersion.versionNumber ?? "—"}</div>
          <div className="ma-version-foot">
            {published?.configVersion.publishedAt
              ? new Date(published.configVersion.publishedAt).toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div className="ma-version-cell">
          <div className="ma-version-l">Draft</div>
          <div className="ma-version-v mono">{draft ? `v${draft.configVersion.versionNumber}` : "—"}</div>
          <div className="ma-version-foot">{draft ? draft.configVersion.status : "no draft"}</div>
        </div>
        <div className="ma-version-cell">
          <div className="ma-version-l">Validation</div>
          <div className={`ma-version-v mono${validation && !validation.valid ? " alert" : ""}`}>
            {validation ? `${validationIssueCount} issues` : "Not run"}
          </div>
          <div className="ma-version-foot">
            {validation
              ? `${validation.errors.length} errors · ${validation.warnings.length} warnings`
              : "Run validate before publishing"}
          </div>
        </div>
        <div className="ma-version-actions">
          {draft ? (
            <>
              <button
                className="primary-button compact-button"
                disabled={isSubmitting}
                onClick={() => void validateDraft()}
                type="button"
              >
                Validate
              </button>
              <button
                className="secondary-button compact-button"
                disabled={isSubmitting}
                onClick={() => void publishDraft()}
                type="button"
              >
                Publish
              </button>
              <button
                className="secondary-button danger-button compact-button"
                disabled={isSubmitting}
                onClick={() => void discardDraft()}
                type="button"
              >
                Discard
              </button>
            </>
          ) : (
            <button
              className="primary-button compact-button"
              disabled={isSubmitting || !published}
              onClick={() => void createDraft()}
              type="button"
            >
              Create Draft
            </button>
          )}
        </div>
      </div>

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}
      {isLoading ? <div className="empty-row">Loading metadata configuration</div> : null}

      <div className="ma-tab-strip" role="tablist">
        {METADATA_ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`ma-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "validation" && validationIssueCount > 0 ? (
              <span className="ct">{validationIssueCount}</span>
            ) : null}
            {tab.key === "fields" ? <span className="ct">{orderedFields.length}</span> : null}
            {tab.key === "stages" ? <span className="ct">{orderedStages.length}</span> : null}
            {tab.key === "rules" ? <span className="ct">{requiredRuleCount}</span> : null}
            {tab.key === "history" ? <span className="ct">{configVersions.length}</span> : null}
          </button>
        ))}
      </div>

      <div className="metadata-grid">
        {activeTab === "overview" ? <section className="crm-section metadata-summary-section">
          <div className="section-heading">
            <h3>Configuration</h3>
            <span>{activeConfig?.configVersion.status ?? "unknown"}</span>
          </div>

          {activeConfig ? (
            <dl className="detail-grid metadata-detail-grid">
              <div>
                <dt>Active version</dt>
                <dd>{activeConfig.configVersion.id}</dd>
              </div>
              <div>
                <dt>Version number</dt>
                <dd>{activeConfig.configVersion.versionNumber}</dd>
              </div>
              <div>
                <dt>Stages</dt>
                <dd>{stageCount}</dd>
              </div>
              <div>
                <dt>Fields</dt>
                <dd>{fieldCount}</dd>
              </div>
              <div>
                <dt>Required rules</dt>
                <dd>{requiredRuleCount}</dd>
              </div>
              <div>
                <dt>Validation</dt>
                <dd>{validation ? `${validationIssueCount} issues` : "Not run"}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-row">No metadata config available</div>
          )}
        </section> : null}

        {activeTab === "overview" ? <section className="crm-section metadata-action-section">
          <div className="section-heading">
            <h3>Draft</h3>
            <span>{draft ? draft.configVersion.id : "none"}</span>
          </div>

          {draft ? (
            <div className="metadata-action-stack">
              <div className="empty-row">
                Version {draft.configVersion.versionNumber} is open for validation and publish.
              </div>
              <div className="button-row">
                <button
                  className="primary-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void validateDraft()}
                >
                  Validate
                </button>
                <button
                  className="secondary-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void publishDraft()}
                >
                  Publish
                </button>
                <button
                  className="secondary-button danger-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void discardDraft()}
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="metadata-action-stack">
              <label>
                <span>Draft notes</span>
                <textarea
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  placeholder="Optional"
                />
              </label>
              <button
                className="primary-button compact-button"
                disabled={isSubmitting || !published}
                onClick={() => void createDraft()}
              >
                Create Draft
              </button>
            </div>
          )}
        </section> : null}

        {activeTab === "history" ? <section className="crm-section metadata-versions-section">
          <div className="section-heading">
            <h3>Versions</h3>
            <span>{configVersions.length}</span>
          </div>
          <div className="record-list">
            {configVersions.map((version) => (
              <div className="record-row" key={version.id}>
                <div>
                  <strong>Version {version.versionNumber}</strong>
                  <span>{version.id}</span>
                  {version.notes ? <span>{version.notes}</span> : null}
                </div>
                <div className="record-meta">
                  <span>{version.status}</span>
                  <span>{version.publishedAt ? new Date(version.publishedAt).toLocaleDateString() : "unpublished"}</span>
                </div>
                <div className="metadata-row-actions">
                  {version.status === "archived" ? (
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting || !!draft}
                      onClick={() => void rollbackConfigVersion(version.id)}
                      type="button"
                    >
                      Roll Back
                    </button>
                  ) : null}
                  {draft && version.id === draft.configVersion.id ? (
                    <button
                      className="secondary-button danger-button compact-button"
                      disabled={isSubmitting}
                      onClick={() => void discardDraft()}
                      type="button"
                    >
                      Discard
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {configVersions.length === 0 ? <div className="empty-row">No metadata versions available</div> : null}
            {draft ? <div className="empty-row">Rollback is locked while a draft is open.</div> : null}
          </div>
        </section> : null}

        {activeTab === "stages" ? <section className="crm-section metadata-stages-section">
          <div className="section-heading">
            <h3>Stages</h3>
            <span>{orderedStages.length}</span>
          </div>
          {draft ? (
            <div className="metadata-editor">
              <h4>{editingStageId ? "Edit Stage" : "New Stage"}</h4>
              <label>
                <span>Stage Key</span>
                <input
                  value={stageForm.stageKey}
                  onChange={(event) =>
                    setStageForm((current) => ({ ...current, stageKey: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Display Name</span>
                <input
                  value={stageForm.displayName}
                  onChange={(event) =>
                    setStageForm((current) => ({ ...current, displayName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Sort Order</span>
                <input
                  inputMode="numeric"
                  value={stageForm.sortOrder}
                  onChange={(event) =>
                    setStageForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </label>
              <label className="inline-check">
                <input
                  checked={stageForm.isClosed}
                  type="checkbox"
                  onChange={(event) =>
                    setStageForm((current) => ({ ...current, isClosed: event.target.checked }))
                  }
                />
                <span>Closed stage</span>
              </label>
              <div className="button-row">
                <button
                  className="primary-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void saveStage()}
                  type="button"
                >
                  {editingStageId ? "Save Stage" : "Add Stage"}
                </button>
                {editingStageId ? (
                  <button
                    className="secondary-button compact-button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEditingStageId(null);
                      setStageForm(emptyStageForm);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="record-list">
            {orderedStages.map((stage) => (
              <div className="record-row" key={stage.id}>
                <div>
                  <strong>{stage.displayName}</strong>
                  <span>{stage.stageKey}</span>
                </div>
                <div className="record-meta">
                  <span>{stage.sortOrder}</span>
                  <span>{stage.isClosed ? "closed" : "open"}</span>
                </div>
                {draft ? (
                  <div className="metadata-row-actions">
                    <button className="secondary-button compact-button" onClick={() => editStage(stage)} type="button">
                      Edit
                    </button>
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting}
                      onClick={() => void removeStage(stage.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {orderedStages.length === 0 ? <div className="empty-row">No stages configured</div> : null}
          </div>
        </section> : null}

        {activeTab === "fields" ? <section className="crm-section metadata-fields-section">
          <div className="section-heading">
            <h3>Fields</h3>
            <span>{orderedFields.length}</span>
          </div>
          {draft ? (
            <div className="metadata-editor">
              <h4>{editingFieldId ? "Edit Field" : "New Field"}</h4>
              <label>
                <span>Entity</span>
                <select
                  value={fieldForm.entityType}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, entityType: event.target.value }))
                  }
                >
                  <option value="account">account</option>
                  <option value="contact">contact</option>
                  <option value="opportunity">opportunity</option>
                </select>
              </label>
              <label>
                <span>Field Key</span>
                <input
                  value={fieldForm.fieldKey}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, fieldKey: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Label</span>
                <input
                  value={fieldForm.label}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, label: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  value={fieldForm.fieldType}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, fieldType: event.target.value }))
                  }
                >
                  <option value="text">text</option>
                  <option value="long_text">long_text</option>
                  <option value="number">number</option>
                  <option value="currency">currency</option>
                  <option value="date">date</option>
                  <option value="boolean">boolean</option>
                  <option value="single_select">single_select</option>
                </select>
              </label>
              <label>
                <span>Sort Order</span>
                <input
                  inputMode="numeric"
                  value={fieldForm.sortOrder}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Select Options</span>
                <textarea
                  disabled={fieldForm.fieldType !== "single_select"}
                  placeholder="value|Label"
                  value={fieldForm.selectOptionsText}
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, selectOptionsText: event.target.value }))
                  }
                />
              </label>
              <label className="inline-check">
                <input
                  checked={fieldForm.isRequiredDefault}
                  type="checkbox"
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, isRequiredDefault: event.target.checked }))
                  }
                />
                <span>Required by default</span>
              </label>
              <label className="inline-check">
                <input
                  checked={fieldForm.isActive}
                  type="checkbox"
                  onChange={(event) =>
                    setFieldForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <span>Active</span>
              </label>
              <div className="button-row">
                <button
                  className="primary-button compact-button"
                  disabled={isSubmitting}
                  onClick={() => void saveField()}
                  type="button"
                >
                  {editingFieldId ? "Save Field" : "Add Field"}
                </button>
                {editingFieldId ? (
                  <button
                    className="secondary-button compact-button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEditingFieldId(null);
                      setFieldForm(emptyFieldForm);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="record-list">
            {orderedFields.map((field) => (
              <div className="record-row" key={field.id}>
                <div>
                  <strong>{field.label}</strong>
                  <span>{field.entityType}.{field.fieldKey}</span>
                </div>
                <div className="record-meta">
                  <span>{field.fieldType}</span>
                  <span>{field.isActive ? "active" : "inactive"}</span>
                </div>
                {draft ? (
                  <div className="metadata-row-actions">
                    <button className="secondary-button compact-button" onClick={() => editField(field)} type="button">
                      Edit
                    </button>
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting}
                      onClick={() => void removeField(field.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {orderedFields.length === 0 ? <div className="empty-row">No fields configured</div> : null}
          </div>
        </section> : null}

        {activeTab === "rules" ? <section className="crm-section metadata-required-section">
          <div className="section-heading">
            <h3>Required Rules</h3>
            <span>{activeConfig?.requiredFields.length ?? 0}</span>
          </div>
          {draft ? (
            <div className="metadata-editor">
              <h4>New Required Rule</h4>
              <label>
                <span>Stage</span>
                <select
                  value={resolvedRequiredStageKey}
                  onChange={(event) => setRequiredStageKey(event.target.value)}
                >
                  {draft.stages.map((stage) => (
                    <option key={stage.id} value={stage.stageKey}>
                      {stage.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Opportunity Field</span>
                <select
                  value={resolvedRequiredFieldKey}
                  onChange={(event) => setRequiredFieldKey(event.target.value)}
                >
                  <option value="title">title</option>
                  <option value="account_id">account_id</option>
                  <option value="primary_contact_id">primary_contact_id</option>
                  <option value="owner_user_id">owner_user_id</option>
                  <option value="expected_amount">expected_amount</option>
                  <option value="close_date">close_date</option>
                  {draftOpportunityFields.map((field) => (
                    <option key={field.id} value={field.fieldKey}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary-button compact-button"
                disabled={isSubmitting || draft.stages.length === 0}
                onClick={() => void createRequiredRule()}
                type="button"
              >
                Add Rule
              </button>
            </div>
          ) : null}
          <div className="record-list">
            {(activeConfig?.requiredFields ?? []).map((rule) => (
              <div className="record-row" key={rule.id}>
                <div>
                  <strong>{rule.stageKey}</strong>
                  <span>{rule.fieldKey}</span>
                </div>
                <div className="record-meta">
                  <span>{rule.entityType}</span>
                </div>
                {draft ? (
                  <div className="metadata-row-actions">
                    <button
                      className="secondary-button compact-button"
                      disabled={isSubmitting}
                      onClick={() => void removeRequiredRule(rule.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {(activeConfig?.requiredFields.length ?? 0) === 0 ? (
              <div className="empty-row">No required rules configured</div>
            ) : null}
          </div>
        </section> : null}

        {activeTab === "validation" ? <section className="crm-section metadata-validation-section">
          <div className="section-heading">
            <h3>Validation</h3>
            <span>{validation?.valid ? "valid" : "pending"}</span>
          </div>
          <div className="record-list">
            {validation?.errors.map((issue) => (
              <div className="metadata-issue error-issue" key={`error-${issue.code}-${issue.path}`}>
                <strong>{issue.code}</strong>
                <span>{issue.path}</span>
                <p>{issue.message}</p>
              </div>
            ))}
            {validation?.warnings.map((issue) => (
              <div className="metadata-issue warning-issue" key={`warning-${issue.code}-${issue.path}`}>
                <strong>{issue.code}</strong>
                <span>{issue.path}</span>
                <p>{issue.message}</p>
              </div>
            ))}
            {!validation ? <div className="empty-row">Validation has not run</div> : null}
            {validation && validation.errors.length === 0 && validation.warnings.length === 0 ? (
              <div className="success-box">No validation issues</div>
            ) : null}
          </div>
        </section> : null}
      </div>
    </section>
  );
}

function buildFieldRequest(form: FieldFormState): SaveMetadataFieldDefinitionRequest | null {
  const sortOrder = Number(form.sortOrder);
  if (!form.fieldKey.trim() || !form.label.trim() || !Number.isFinite(sortOrder)) {
    return null;
  }

  return {
    entityType: form.entityType,
    fieldKey: form.fieldKey.trim(),
    fieldType: form.fieldType,
    isActive: form.isActive,
    isRequiredDefault: form.isRequiredDefault,
    label: form.label.trim(),
    selectOptions: form.fieldType === "single_select" ? parseSelectOptions(form.selectOptionsText) : [],
    sortOrder,
  };
}

function buildStageRequest(form: StageFormState): SaveMetadataStageDefinitionRequest | null {
  const sortOrder = Number(form.sortOrder);
  if (!form.stageKey.trim() || !form.displayName.trim() || !Number.isFinite(sortOrder)) {
    return null;
  }

  return {
    displayName: form.displayName.trim(),
    isClosed: form.isClosed,
    sortOrder,
    stageKey: form.stageKey.trim(),
  };
}

function parseSelectOptions(text: string): MetadataSelectOptionItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split("|");
      const normalizedValue = value.trim();
      const normalizedLabel = labelParts.join("|").trim() || normalizedValue;

      return {
        value: normalizedValue,
        label: normalizedLabel,
      };
    });
}
