import { useEffect, useState } from "react";
import type {
  ActivityListItem,
  CustomFieldValue,
  OpportunityDetail as OpportunityDetailType,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";

type OpportunityDetailProps = {
  activities: ActivityListItem[];
  fields: MetadataFieldDefinitionItem[];
  opportunity: OpportunityDetailType | null;
  stages: MetadataStageDefinitionItem[];
  isLoading: boolean;
  isActionSubmitting: boolean;
  isApprovalSubmitting: boolean;
  isActivitySubmitting: boolean;
  onCreateActivity: (request: { dueDate?: string; title: string; type: string }) => void;
  onMoveStage: (targetStageKey: string) => void;
  onReassignOwner: (newOwnerId: string) => void;
  onSubmitApproval: (request: { businessJustification?: string }) => void;
  onUpdateOpportunity: (request: {
    closeDate?: string;
    customFields?: Record<string, CustomFieldValue>;
    expectedAmount?: number;
    title?: string;
  }) => void;
};

export function OpportunityDetail({
  activities,
  fields,
  opportunity,
  stages,
  isActionSubmitting,
  isApprovalSubmitting,
  isActivitySubmitting,
  isLoading,
  onCreateActivity,
  onMoveStage,
  onReassignOwner,
  onSubmitApproval,
  onUpdateOpportunity,
}: OpportunityDetailProps) {
  const [title, setTitle] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newOwnerId, setNewOwnerId] = useState("");
  const [targetStageKey, setTargetStageKey] = useState("");
  const [approvalJustification, setApprovalJustification] = useState("");
  const [activityType, setActivityType] = useState("task");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");

  useEffect(() => {
    setTitle(opportunity?.title ?? "");
    setExpectedAmount(opportunity?.expectedAmount?.toString() ?? "");
    setCloseDate(opportunity?.closeDate ?? "");
    setCustomFields(formatCustomFieldsForForm(fields, opportunity?.customFields ?? {}));
    setNewOwnerId("");
    setTargetStageKey("");
    setApprovalJustification("");
  }, [fields, opportunity?.id, opportunity?.title, opportunity?.expectedAmount, opportunity?.closeDate, opportunity?.customFields]);

  if (isLoading) {
    return (
      <section className="crm-section detail-section">
        <div className="empty-row">Loading opportunity</div>
      </section>
    );
  }

  if (!opportunity) {
    return (
      <section className="crm-section detail-section">
        <div className="empty-row">No opportunity selected</div>
      </section>
    );
  }

  const submitUpdate = () => {
    const parsedAmount = expectedAmount.trim() ? Number(expectedAmount) : undefined;
    onUpdateOpportunity({
      closeDate: closeDate || undefined,
      customFields: parseCustomFields(fields, customFields),
      expectedAmount: parsedAmount,
      title: title.trim(),
    });
  };

  const stageLabel = stages.find((stage) => stage.stageKey === opportunity.stageKey)?.displayName ?? opportunity.stageKey;
  const availableTargetStages = stages.filter((stage) => stage.stageKey !== opportunity.stageKey);
  const resolvedTargetStageKey = targetStageKey || availableTargetStages[0]?.stageKey || "";
  const resolvedTargetStageLabel =
    availableTargetStages.find((stage) => stage.stageKey === resolvedTargetStageKey)?.displayName ??
    resolvedTargetStageKey;
  const canSubmitApproval = opportunity.approvalState === "none";

  const submitActivity = () => {
    if (!activityTitle.trim()) {
      return;
    }

    onCreateActivity({
      dueDate: activityDueDate || undefined,
      title: activityTitle.trim(),
      type: activityType,
    });
    setActivityTitle("");
    setActivityDueDate("");
  };

  const submitApprovalRequest = () => {
    onSubmitApproval({
      businessJustification: approvalJustification.trim() || undefined,
    });
  };

  return (
    <section className="crm-section detail-section">
      <div className="detail-header">
        <div>
          <h3>{opportunity.title}</h3>
          <span>{opportunity.account.name}</span>
        </div>
        <div className="detail-badges">
          <strong>{stageLabel}</strong>
          <strong>{opportunity.approvalState}</strong>
        </div>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Owner</dt>
          <dd>{opportunity.owner.displayName}</dd>
        </div>
        <div>
          <dt>Primary Contact</dt>
          <dd>{opportunity.primaryContact?.fullName ?? "None"}</dd>
        </div>
        <div>
          <dt>Expected Amount</dt>
          <dd>{formatCurrency(opportunity.expectedAmount)}</dd>
        </div>
        <div>
          <dt>Close Date</dt>
          <dd>{opportunity.closeDate ?? "None"}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>{opportunity.approvalState}</dd>
        </div>
        <div>
          <dt>Stage Key</dt>
          <dd>{opportunity.stageKey}</dd>
        </div>
        {fields.map((field) => (
          <div key={field.id}>
            <dt>{field.label}</dt>
            <dd>{formatCustomFieldValue(field, opportunity.customFields[field.fieldKey])}</dd>
          </div>
        ))}
      </dl>

      <div className="action-panel">
        <div className="action-group">
          <h4>Edit Fields</h4>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Expected Amount</span>
            <input
              inputMode="decimal"
              value={expectedAmount}
              onChange={(event) => setExpectedAmount(event.target.value)}
            />
          </label>
          <label>
            <span>Close Date</span>
            <input
              type="date"
              value={closeDate}
              onChange={(event) => setCloseDate(event.target.value)}
            />
          </label>
          {fields.map((field) => (
            <CustomFieldInput
              field={field}
              key={field.id}
              value={customFields[field.fieldKey] ?? ""}
              onChange={(value) =>
                setCustomFields((current) => ({
                  ...current,
                  [field.fieldKey]: value,
                }))
              }
            />
          ))}
          <button
            className="primary-button compact-button"
            disabled={isActionSubmitting}
            onClick={submitUpdate}
            type="button"
          >
            Save Fields
          </button>
        </div>

        <div className="action-group">
          <h4>Stage</h4>
          <label>
            <span>Target Stage</span>
            <select
              value={resolvedTargetStageKey}
              onChange={(event) => setTargetStageKey(event.target.value)}
            >
              {availableTargetStages.map((stage) => (
                <option key={stage.id} value={stage.stageKey}>
                  {stage.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button compact-button"
            disabled={isActionSubmitting || !resolvedTargetStageKey}
            onClick={() => onMoveStage(resolvedTargetStageKey)}
            type="button"
          >
            Move to {resolvedTargetStageLabel}
          </button>
        </div>

        <div className="action-group approval-submit-group">
          <h4>Approval</h4>
          <label>
            <span>Business Justification</span>
            <textarea
              value={approvalJustification}
              onChange={(event) => setApprovalJustification(event.target.value)}
              rows={3}
            />
          </label>
          <button
            className="primary-button compact-button"
            disabled={isApprovalSubmitting || !canSubmitApproval}
            onClick={submitApprovalRequest}
            type="button"
          >
            Submit Approval
          </button>
        </div>

        <div className="action-group">
          <h4>Owner</h4>
          <label>
            <span>New Owner Id</span>
            <input value={newOwnerId} onChange={(event) => setNewOwnerId(event.target.value)} />
          </label>
          <button
            className="primary-button compact-button"
            disabled={isActionSubmitting || !newOwnerId.trim()}
            onClick={() => onReassignOwner(newOwnerId.trim())}
            type="button"
          >
            Reassign Owner
          </button>
        </div>
      </div>

      <div className="activity-panel">
        <div className="section-heading">
          <h4>Activities</h4>
          <span>{activities.length}</span>
        </div>
        <div className="activity-list">
          {activities.map((activity) => (
            <article className="activity-row" key={activity.id}>
              <div>
                <strong>{activity.title}</strong>
                <span>{activity.type}</span>
              </div>
              <div className="record-meta">
                <span>{activity.status}</span>
                <span>{activity.dueDate ?? "No due date"}</span>
              </div>
            </article>
          ))}
          {activities.length === 0 ? <div className="empty-row">No activities</div> : null}
        </div>

        <div className="action-group">
          <h4>Create Activity</h4>
          <label>
            <span>Type</span>
            <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
              <option value="task">task</option>
              <option value="call">call</option>
              <option value="meeting">meeting</option>
              <option value="note">note</option>
            </select>
          </label>
          <label>
            <span>Title</span>
            <input
              value={activityTitle}
              onChange={(event) => setActivityTitle(event.target.value)}
            />
          </label>
          <label>
            <span>Due Date</span>
            <input
              type="date"
              value={activityDueDate}
              onChange={(event) => setActivityDueDate(event.target.value)}
            />
          </label>
          <button
            className="primary-button compact-button"
            disabled={isActivitySubmitting || !activityTitle.trim()}
            onClick={submitActivity}
            type="button"
          >
            Create Activity
          </button>
        </div>
      </div>
    </section>
  );
}

function CustomFieldInput({
  field,
  onChange,
  value,
}: {
  field: MetadataFieldDefinitionItem;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.fieldType === "long_text") {
    return (
      <label>
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
      </label>
    );
  }

  if (field.fieldType === "single_select") {
    return (
      <label>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">None</option>
          {field.selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <label>
        <span>{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">None</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }

  const inputType = field.fieldType === "date" ? "date" : "text";
  const inputMode = field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined;

  return (
    <label>
      <span>{field.label}</span>
      <input
        inputMode={inputMode}
        type={inputType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatCustomFieldsForForm(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, CustomFieldValue>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((result, field) => {
    const value = values[field.fieldKey];
    result[field.fieldKey] = value === null || value === undefined ? "" : String(value);
    return result;
  }, {});
}

function parseCustomFields(
  fields: MetadataFieldDefinitionItem[],
  values: Record<string, string>,
): Record<string, CustomFieldValue> {
  return fields.reduce<Record<string, CustomFieldValue>>((result, field) => {
    const rawValue = values[field.fieldKey];
    if (rawValue === undefined || rawValue === "") {
      return result;
    }

    if (field.fieldType === "number" || field.fieldType === "currency") {
      result[field.fieldKey] = Number(rawValue);
      return result;
    }

    if (field.fieldType === "boolean") {
      result[field.fieldKey] = rawValue === "true";
      return result;
    }

    result[field.fieldKey] = rawValue;
    return result;
  }, {});
}

function formatCustomFieldValue(
  field: MetadataFieldDefinitionItem,
  value: CustomFieldValue | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "None";
  }

  if (field.fieldType === "boolean") {
    return value === true ? "Yes" : "No";
  }

  if (field.fieldType === "currency" && typeof value === "number") {
    return formatCurrency(value);
  }

  if (field.fieldType === "single_select") {
    return field.selectOptions.find((option) => option.value === value)?.label ?? String(value);
  }

  return String(value);
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "No amount";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
