import type { ReactNode } from "react";
import type { CustomFieldValue, OpportunityDetail as OpportunityDetailType } from "../../types/crm";
import type { MetadataFieldDefinitionItem } from "../../types/metadata";
import { daysUntil, formatCurrency, isEmpty } from "./OpportunityDetailShared";

export function DealFields({
  customFields,
  draftAmount,
  draftClose,
  draftCustom,
  draftTitle,
  editError,
  editMode,
  isActionSubmitting,
  opportunity,
  onCancel,
  onChangeAmount,
  onChangeClose,
  onChangeCustom,
  onChangeTitle,
  onEdit,
  onSave,
}: {
  customFields: MetadataFieldDefinitionItem[];
  draftAmount: string;
  draftClose: string;
  draftCustom: Record<string, string>;
  draftTitle: string;
  editError: string | null;
  editMode: boolean;
  isActionSubmitting: boolean;
  opportunity: OpportunityDetailType;
  onCancel: () => void;
  onChangeAmount: (value: string) => void;
  onChangeClose: (value: string) => void;
  onChangeCustom: (fieldKey: string, value: string) => void;
  onChangeTitle: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <section className="opp-panel">
      <div className="opp-panel-head">
        <div className="opp-panel-title">Deal fields</div>
        <div className="opp-panel-actions">
          {editMode ? (
            <>
              <button className="rep-btn" onClick={onCancel} type="button">
                Cancel
              </button>
              <button
                className="rep-btn rep-btn-primary"
                disabled={isActionSubmitting}
                onClick={onSave}
                type="button"
              >
                Save changes
              </button>
            </>
          ) : (
            <button className="rep-btn" onClick={onEdit} type="button">
              Edit fields ›
            </button>
          )}
        </div>
      </div>

      <div className="opp-fields">
        <FieldRow editing={editMode} label="Title">
          {editMode ? (
            <input className="opp-field-input" onChange={(event) => onChangeTitle(event.target.value)} value={draftTitle} />
          ) : (
            <span style={{ fontFamily: "inherit" }}>{opportunity.title}</span>
          )}
        </FieldRow>
        <FieldRow editing={editMode} label="Expected amount">
          {editMode ? (
            <input
              className="opp-field-input"
              inputMode="decimal"
              onChange={(event) => onChangeAmount(event.target.value)}
              value={draftAmount}
            />
          ) : (
            <>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.92rem" }}>
                {formatCurrency(opportunity.expectedAmount)}
              </span>
              <small>USD</small>
            </>
          )}
        </FieldRow>
        <FieldRow editing={editMode} label="Close date">
          {editMode ? (
            <input
              className="opp-field-input"
              onChange={(event) => onChangeClose(event.target.value)}
              placeholder="YYYY-MM-DD"
              type="date"
              value={draftClose}
            />
          ) : (
            <>
              <span style={{ fontFamily: "ui-monospace, monospace" }}>{opportunity.closeDate ?? "—"}</span>
              {opportunity.closeDate ? <small>· {daysUntil(opportunity.closeDate)}</small> : null}
            </>
          )}
        </FieldRow>
      </div>

      {customFields.length > 0 ? (
        <>
          <div className="opp-section-sub">Custom fields</div>
          <div className="opp-fields">
            {customFields.map((field) => {
              const value = opportunity.customFields[field.fieldKey];
              const missing = field.isRequiredDefault && isEmpty(value);
              return (
                <FieldRow
                  editing={editMode}
                  hint={missing ? "Required by tenant policy — populate before later-stage promotion." : undefined}
                  key={field.id}
                  label={field.label}
                  missing={missing}
                  tag={field.isRequiredDefault ? "required" : "custom"}
                >
                  {editMode ? (
                    <CustomFieldEditor
                      field={field}
                      onChange={(nextValue) => onChangeCustom(field.fieldKey, nextValue)}
                      value={draftCustom[field.fieldKey] ?? ""}
                    />
                  ) : (
                    <FieldValue field={field} value={value} />
                  )}
                </FieldRow>
              );
            })}
          </div>
        </>
      ) : null}

      {editError ? <div className="rep-form-error" style={{ margin: "10px 14px" }}>{editError}</div> : null}

      {customFields.length > 0 ? (
        <div className="opp-fields-foot">
          <div>
            <span className="legend">
              <span className="opp-field-tag cust">CUSTOM</span> tenant-defined
            </span>
            <span className="legend">
              <span className="opp-field-tag req">REQUIRED</span> fill before promote
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FieldRow({
  children,
  editing,
  hint,
  label,
  missing,
  tag,
}: {
  children: ReactNode;
  editing?: boolean;
  hint?: string;
  label: string;
  missing?: boolean;
  tag?: "custom" | "required";
}) {
  return (
    <div className={`opp-field ${editing ? "editing" : ""} ${missing ? "missing" : ""}`}>
      <div className="opp-field-l">
        {label}
        {tag === "custom" ? <span className="opp-field-tag cust">CUSTOM</span> : null}
        {tag === "required" ? <span className="opp-field-tag req">REQUIRED</span> : null}
      </div>
      <div className="opp-field-v">{children}</div>
      {hint ? <div className="opp-field-hint">{hint}</div> : null}
    </div>
  );
}

function CustomFieldEditor({
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
      <textarea
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        style={{ fontFamily: "inherit" }}
        value={value}
      />
    );
  }
  if (field.fieldType === "single_select") {
    return (
      <select
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        style={{ fontFamily: "inherit" }}
        value={value}
      >
        <option value="">None</option>
        {field.selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.fieldType === "boolean") {
    return (
      <select
        className="opp-field-input"
        onChange={(event) => onChange(event.target.value)}
        style={{ fontFamily: "inherit" }}
        value={value}
      >
        <option value="">None</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  const type = field.fieldType === "date" ? "date" : "text";
  return (
    <input
      className="opp-field-input"
      inputMode={field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      value={value}
    />
  );
}

function FieldValue({
  field,
  value,
}: {
  field: MetadataFieldDefinitionItem;
  value: CustomFieldValue | undefined;
}) {
  if (value === null || value === undefined || value === "") {
    return <small>— empty</small>;
  }
  if (field.fieldType === "boolean") {
    return <>{value === true ? "Yes" : "No"}</>;
  }
  if (field.fieldType === "currency" && typeof value === "number") {
    return <span style={{ fontFamily: "ui-monospace, monospace" }}>{formatCurrency(value)}</span>;
  }
  if (field.fieldType === "single_select") {
    const match = field.selectOptions.find((option) => option.value === value);
    return <>{match ? match.label : String(value)}</>;
  }
  return <>{String(value)}</>;
}
