import type {
  MetadataFieldDefinitionItem,
  MetadataValidationResponse,
  PublishedMetadataResponse,
} from "../../types/metadata";

export function MetadataRulesPanel({
  activeConfig,
  createRequiredRule,
  draft,
  draftOpportunityFields,
  isSubmitting,
  removeRequiredRule,
  requiredFieldKey,
  requiredStageKey,
  setRequiredFieldKey,
  setRequiredStageKey,
}: {
  activeConfig: PublishedMetadataResponse | null;
  createRequiredRule: () => void | Promise<void>;
  draft: PublishedMetadataResponse | null;
  draftOpportunityFields: MetadataFieldDefinitionItem[];
  isSubmitting: boolean;
  removeRequiredRule: (requiredFieldId: string) => void | Promise<void>;
  requiredFieldKey: string;
  requiredStageKey: string;
  setRequiredFieldKey: (value: string) => void;
  setRequiredStageKey: (value: string) => void;
}) {
  const resolvedRequiredStageKey = requiredStageKey || draft?.stages[0]?.stageKey || "";
  const resolvedRequiredFieldKey = requiredFieldKey || draftOpportunityFields[0]?.fieldKey || "title";
  return (
    <section className="crm-section metadata-required-section">
      <div className="section-heading">
        <h3>Required Rules</h3>
        <span>{activeConfig?.requiredFields.length ?? 0}</span>
      </div>
      {draft ? (
        <div className="metadata-editor">
          <h4>New Required Rule</h4>
          <label>
            <span>Stage</span>
            <select value={resolvedRequiredStageKey} onChange={(event) => setRequiredStageKey(event.target.value)}>
              {draft.stages.map((stage) => (
                <option key={stage.id} value={stage.stageKey}>
                  {stage.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Opportunity Field</span>
            <select value={resolvedRequiredFieldKey} onChange={(event) => setRequiredFieldKey(event.target.value)}>
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
          <button className="primary-button compact-button" disabled={isSubmitting || draft.stages.length === 0} onClick={() => void createRequiredRule()} type="button">
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
                <button className="secondary-button compact-button" disabled={isSubmitting} onClick={() => void removeRequiredRule(rule.id)} type="button">
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {(activeConfig?.requiredFields.length ?? 0) === 0 ? <div className="empty-row">No required rules configured</div> : null}
      </div>
    </section>
  );
}

export function MetadataValidationPanel({
  validation,
}: {
  validation: MetadataValidationResponse | null;
}) {
  return (
    <section className="crm-section metadata-validation-section">
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
    </section>
  );
}
