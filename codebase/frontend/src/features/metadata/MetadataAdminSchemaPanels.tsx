import type { ReactNode } from "react";
import { useModalChrome } from "../../hooks/useModalChrome";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
  PublishedMetadataResponse,
} from "../../types/metadata";
import type {
  FieldFormState,
  StageFormState,
} from "./useMetadataAdminController";

/** Shared right-side drawer for the schema editors. Opening the editor in an
 *  overlay keeps the form in view at the click — no page scroll, which would
 *  itself signal the result is rendered in the wrong place. */
function MetadataEditorDrawer({
  title,
  disabled,
  onClose,
  children,
}: {
  title: string;
  disabled: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useModalChrome(onClose, { disabled });
  return (
    <>
      <div className="rep-scrim" onClick={disabled ? undefined : onClose} />
      <aside className="rep-drawer metadata-editor-drawer" role="dialog" aria-label={title}>
        <div className="rep-drawer-head">
          <div>
            <div className="rep-drawer-title">{title}</div>
          </div>
          <button aria-label="Close" className="rep-drawer-close" disabled={disabled} onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="rep-drawer-body">
          <div className="metadata-editor metadata-editor--drawer">{children}</div>
        </div>
      </aside>
    </>
  );
}

export function MetadataStagesPanel({
  draft,
  editingStageId,
  isSubmitting,
  orderedStages,
  removeStage,
  saveStage,
  setStageForm,
  stageForm,
  editStage,
  stageEditorOpen,
  openNewStage,
  closeStageEditor,
}: {
  draft: PublishedMetadataResponse | null;
  editingStageId: string | null;
  isSubmitting: boolean;
  orderedStages: MetadataStageDefinitionItem[];
  removeStage: (stageId: string) => void | Promise<void>;
  saveStage: () => void | Promise<void>;
  setStageForm: (value: StageFormState | ((current: StageFormState) => StageFormState)) => void;
  stageForm: StageFormState;
  editStage: (stage: MetadataStageDefinitionItem) => void;
  stageEditorOpen: boolean;
  openNewStage: () => void;
  closeStageEditor: () => void;
}) {
  return (
    <section className="crm-section metadata-stages-section">
      <div className="section-heading">
        <h3>Stages</h3>
        <div className="metadata-heading-actions">
          <span>{orderedStages.length}</span>
          {draft ? (
            <button className="primary-button compact-button" onClick={openNewStage} type="button">
              New stage
            </button>
          ) : null}
        </div>
      </div>
      <div className="record-list">
        {orderedStages.map((stage) => (
          <div className={editingStageId === stage.id ? "record-row record-row--editing" : "record-row"} key={stage.id}>
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
                <button className="secondary-button compact-button" disabled={isSubmitting} onClick={() => void removeStage(stage.id)} type="button">
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {orderedStages.length === 0 ? <div className="empty-row">No stages configured</div> : null}
      </div>

      {draft && stageEditorOpen ? (
        <MetadataEditorDrawer
          title={editingStageId ? "Edit stage" : "New stage"}
          disabled={isSubmitting}
          onClose={closeStageEditor}
        >
          <label>
            <span>Stage Key</span>
            <input value={stageForm.stageKey} onChange={(event) => setStageForm((current) => ({ ...current, stageKey: event.target.value }))} />
          </label>
          <label>
            <span>Display Name</span>
            <input value={stageForm.displayName} onChange={(event) => setStageForm((current) => ({ ...current, displayName: event.target.value }))} />
          </label>
          <label>
            <span>Sort Order</span>
            <input inputMode="numeric" value={stageForm.sortOrder} onChange={(event) => setStageForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </label>
          <label className="inline-check">
            <input checked={stageForm.isClosed} type="checkbox" onChange={(event) => setStageForm((current) => ({ ...current, isClosed: event.target.checked }))} />
            <span>Closed stage</span>
          </label>
          <div className="button-row">
            <button className="primary-button compact-button" disabled={isSubmitting} onClick={() => void saveStage()} type="button">
              {editingStageId ? "Save Stage" : "Add Stage"}
            </button>
            <button className="secondary-button compact-button" disabled={isSubmitting} onClick={closeStageEditor} type="button">
              Cancel
            </button>
          </div>
        </MetadataEditorDrawer>
      ) : null}
    </section>
  );
}

export function MetadataFieldsPanel({
  draft,
  editingFieldId,
  fieldForm,
  isSubmitting,
  orderedFields,
  removeField,
  saveField,
  setFieldForm,
  editField,
  fieldEditorOpen,
  openNewField,
  closeFieldEditor,
}: {
  draft: PublishedMetadataResponse | null;
  editingFieldId: string | null;
  fieldForm: FieldFormState;
  isSubmitting: boolean;
  orderedFields: MetadataFieldDefinitionItem[];
  removeField: (fieldId: string) => void | Promise<void>;
  saveField: () => void | Promise<void>;
  setFieldForm: (value: FieldFormState | ((current: FieldFormState) => FieldFormState)) => void;
  editField: (field: MetadataFieldDefinitionItem) => void;
  fieldEditorOpen: boolean;
  openNewField: () => void;
  closeFieldEditor: () => void;
}) {
  return (
    <section className="crm-section metadata-fields-section">
      <div className="section-heading">
        <h3>Fields</h3>
        <div className="metadata-heading-actions">
          <span>{orderedFields.length}</span>
          {draft ? (
            <button className="primary-button compact-button" onClick={openNewField} type="button">
              New field
            </button>
          ) : null}
        </div>
      </div>
      <div className="record-list">
        {orderedFields.map((field) => (
          <div className={editingFieldId === field.id ? "record-row record-row--editing" : "record-row"} key={field.id}>
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
                <button className="secondary-button compact-button" disabled={isSubmitting} onClick={() => void removeField(field.id)} type="button">
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {orderedFields.length === 0 ? <div className="empty-row">No fields configured</div> : null}
      </div>

      {draft && fieldEditorOpen ? (
        <MetadataEditorDrawer
          title={editingFieldId ? "Edit field" : "New field"}
          disabled={isSubmitting}
          onClose={closeFieldEditor}
        >
          <label>
            <span>Entity</span>
            <select value={fieldForm.entityType} onChange={(event) => setFieldForm((current) => ({ ...current, entityType: event.target.value }))}>
              <option value="account">account</option>
              <option value="contact">contact</option>
              <option value="opportunity">opportunity</option>
            </select>
          </label>
          <label>
            <span>Field Key</span>
            <input value={fieldForm.fieldKey} onChange={(event) => setFieldForm((current) => ({ ...current, fieldKey: event.target.value }))} />
          </label>
          <label>
            <span>Label</span>
            <input value={fieldForm.label} onChange={(event) => setFieldForm((current) => ({ ...current, label: event.target.value }))} />
          </label>
          <label>
            <span>Type</span>
            <select value={fieldForm.fieldType} onChange={(event) => setFieldForm((current) => ({ ...current, fieldType: event.target.value }))}>
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
            <input inputMode="numeric" value={fieldForm.sortOrder} onChange={(event) => setFieldForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </label>
          <label>
            <span>Select Options</span>
            <textarea
              disabled={fieldForm.fieldType !== "single_select"}
              placeholder="value|Label"
              value={fieldForm.selectOptionsText}
              onChange={(event) => setFieldForm((current) => ({ ...current, selectOptionsText: event.target.value }))}
            />
          </label>
          <label className="inline-check">
            <input checked={fieldForm.isRequiredDefault} type="checkbox" onChange={(event) => setFieldForm((current) => ({ ...current, isRequiredDefault: event.target.checked }))} />
            <span>Required by default</span>
          </label>
          <label className="inline-check">
            <input checked={fieldForm.isActive} type="checkbox" onChange={(event) => setFieldForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span>Active</span>
          </label>
          <div className="button-row">
            <button className="primary-button compact-button" disabled={isSubmitting} onClick={() => void saveField()} type="button">
              {editingFieldId ? "Save Field" : "Add Field"}
            </button>
            <button className="secondary-button compact-button" disabled={isSubmitting} onClick={closeFieldEditor} type="button">
              Cancel
            </button>
          </div>
        </MetadataEditorDrawer>
      ) : null}
    </section>
  );
}
