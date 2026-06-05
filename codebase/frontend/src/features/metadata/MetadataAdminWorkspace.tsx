import type { CurrentUser } from "../../types/session";
import { MetadataHistoryPanel } from "./MetadataAdminConfigPanels";
import {
  MetadataRulesPanel,
  MetadataValidationPanel,
} from "./MetadataAdminRulePanels";
import {
  MetadataFieldsPanel,
  MetadataStagesPanel,
} from "./MetadataAdminSchemaPanels";
import { useMetadataAdminController } from "./useMetadataAdminController";

type MetadataAdminWorkspaceProps = {
  currentUser: CurrentUser;
};

export function MetadataAdminWorkspace({ currentUser }: MetadataAdminWorkspaceProps) {
  const {
    activeConfig,
    activeTab,
    configVersions,
    createDraft,
    createRequiredRule,
    discardDraft,
    draft,
    draftNotes,
    draftOpportunityFields,
    editingFieldId,
    editingStageId,
    errorMessage,
    fieldEditorOpen,
    stageEditorOpen,
    openNewField,
    openNewStage,
    closeFieldEditor,
    closeStageEditor,
    fieldForm,
    isLoading,
    isSubmitting,
    loadMetadata,
    message,
    orderedFields,
    orderedStages,
    published,
    publishDraft,
    removeField,
    removeRequiredRule,
    removeStage,
    requiredFieldKey,
    requiredStageKey,
    rollbackConfigVersion,
    saveField,
    saveStage,
    setDraftNotes,
    setFieldForm,
    setRequiredFieldKey,
    setRequiredStageKey,
    setStageForm,
    stageForm,
    validation,
    validationIssueCount,
    validateDraft,
    editField,
    editStage,
  } = useMetadataAdminController(currentUser);

  return (
    <section className="metadata-workspace ma-workspace">
      <div className="workspace-header metadata-header">
        <div>
          <h2>Metadata Admin</h2>
          <span>Stages, fields, required rules &amp; versioning</span>
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
            <>
              <input
                className="ma-version-notes"
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                placeholder="Draft notes (optional)"
              />
              <button
                className="primary-button compact-button"
                disabled={isSubmitting || !published}
                onClick={() => void createDraft()}
                type="button"
              >
                Create Draft
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="error-box">
          <span>{errorMessage}</span>
          <button
            className="secondary-button compact-button"
            disabled={isLoading}
            onClick={() => void loadMetadata()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}
      {message ? <div className="success-box">{message}</div> : null}
      {isLoading ? <div className="empty-row">Loading metadata configuration</div> : null}

      <div className="metadata-grid">
        {activeTab === "history" ? (
          <MetadataHistoryPanel
            configVersions={configVersions}
            discardDraft={discardDraft}
            draft={draft}
            isSubmitting={isSubmitting}
            rollbackConfigVersion={rollbackConfigVersion}
          />
        ) : null}

        {activeTab === "stages" ? (
          <MetadataStagesPanel
            draft={draft}
            editingStageId={editingStageId}
            editStage={editStage}
            isSubmitting={isSubmitting}
            orderedStages={orderedStages}
            removeStage={removeStage}
            saveStage={saveStage}
            setStageForm={setStageForm}
            stageForm={stageForm}
            stageEditorOpen={stageEditorOpen}
            openNewStage={openNewStage}
            closeStageEditor={closeStageEditor}
          />
        ) : null}

        {activeTab === "fields" ? (
          <MetadataFieldsPanel
            draft={draft}
            editingFieldId={editingFieldId}
            editField={editField}
            fieldForm={fieldForm}
            isSubmitting={isSubmitting}
            orderedFields={orderedFields}
            removeField={removeField}
            saveField={saveField}
            setFieldForm={setFieldForm}
            fieldEditorOpen={fieldEditorOpen}
            openNewField={openNewField}
            closeFieldEditor={closeFieldEditor}
          />
        ) : null}

        {activeTab === "rules" ? (
          <MetadataRulesPanel
            activeConfig={activeConfig}
            createRequiredRule={createRequiredRule}
            draft={draft}
            draftOpportunityFields={draftOpportunityFields}
            isSubmitting={isSubmitting}
            removeRequiredRule={removeRequiredRule}
            requiredFieldKey={requiredFieldKey}
            requiredStageKey={requiredStageKey}
            setRequiredFieldKey={setRequiredFieldKey}
            setRequiredStageKey={setRequiredStageKey}
          />
        ) : null}

        {activeTab === "validation" ? <MetadataValidationPanel validation={validation} /> : null}
      </div>
    </section>
  );
}
