import type {
  OpportunityListItem,
  OpportunitySavedViewFilters,
  SavedOpportunityViewItem,
} from "../../types/crm";
import type { MetadataFieldDefinitionItem, MetadataStageDefinitionItem } from "../../types/metadata";

type OpportunityListProps = {
  filters: OpportunitySavedViewFilters;
  canCreateSharedViews: boolean;
  customFields: MetadataFieldDefinitionItem[];
  emptyLabel: string;
  isSavedViewSubmitting: boolean;
  opportunities: OpportunityListItem[];
  savedViewsEmptyLabel: string;
  savedViewName: string;
  savedViewVisibilityScope: "private" | "shared";
  savedViews: SavedOpportunityViewItem[];
  stageLabels: Map<string, string>;
  stages: MetadataStageDefinitionItem[];
  selectedOpportunityId: string | null;
  onApplySavedView: (view: SavedOpportunityViewItem) => void;
  onClearFilters: () => void;
  onCreateSavedView: () => void;
  onDeleteSavedView: (view: SavedOpportunityViewItem) => void;
  onFiltersChange: (filters: OpportunitySavedViewFilters) => void;
  onSavedViewVisibilityScopeChange: (visibilityScope: "private" | "shared") => void;
  onSavedViewNameChange: (name: string) => void;
  onSelectOpportunity: (opportunityId: string) => void;
  onUpdateSavedView: (view: SavedOpportunityViewItem) => void;
};

export function OpportunityList({
  filters,
  canCreateSharedViews,
  customFields,
  emptyLabel,
  isSavedViewSubmitting,
  opportunities,
  savedViewsEmptyLabel,
  savedViewName,
  savedViewVisibilityScope,
  savedViews,
  stageLabels,
  stages,
  selectedOpportunityId,
  onApplySavedView,
  onClearFilters,
  onCreateSavedView,
  onDeleteSavedView,
  onFiltersChange,
  onSavedViewVisibilityScopeChange,
  onSavedViewNameChange,
  onSelectOpportunity,
  onUpdateSavedView,
}: OpportunityListProps) {
  const selectedCustomFieldKey = Object.keys(filters.customFields ?? {})[0] ?? "";
  const selectedCustomField = customFields.find((field) => field.fieldKey === selectedCustomFieldKey);
  const selectedCustomFieldValue = selectedCustomFieldKey
    ? String(filters.customFields?.[selectedCustomFieldKey] ?? "")
    : "";

  return (
    <section className="crm-section opportunity-list-section">
      <div className="section-heading">
        <h3>Opportunities</h3>
        <span>{opportunities.length}</span>
      </div>
      <div className="saved-view-panel">
        <div className="filter-row">
          <label>
            <span>Stage</span>
            <select
              value={filters.stageKey ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  stageKey: event.target.value || undefined,
                })
              }
            >
              <option value="">Any stage</option>
              {stages.map((stage) => (
                <option key={stage.stageKey} value={stage.stageKey}>
                  {stage.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input
              value={filters.query ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  query: event.target.value || undefined,
                })
              }
              placeholder="Title or account"
            />
          </label>
          <button
            className="secondary-button compact-button"
            onClick={onClearFilters}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className="filter-row">
          <label>
            <span>Custom field</span>
            <select
              value={selectedCustomFieldKey}
              onChange={(event) => {
                const fieldKey = event.target.value;
                onFiltersChange({
                  ...filters,
                  customFields: fieldKey ? { [fieldKey]: "" } : undefined,
                });
              }}
            >
              <option value="">No custom filter</option>
              {customFields.map((field) => (
                <option key={field.fieldKey} value={field.fieldKey}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>
          {selectedCustomField ? (
            <CustomFieldFilterInput
              field={selectedCustomField}
              value={selectedCustomFieldValue}
              onChange={(value) =>
                onFiltersChange({
                  ...filters,
                  customFields: {
                    [selectedCustomField.fieldKey]: value,
                  },
                })
              }
            />
          ) : (
            <label>
              <span>Value</span>
              <input disabled value="" placeholder="Select a field" />
            </label>
          )}
        </div>
        <div className="filter-row">
          <label>
            <span>View name</span>
            <input
              value={savedViewName}
              onChange={(event) => onSavedViewNameChange(event.target.value)}
              placeholder="My pipeline view"
            />
          </label>
          <label>
            <span>Visibility</span>
            <select
              disabled={!canCreateSharedViews}
              value={savedViewVisibilityScope}
              onChange={(event) =>
                onSavedViewVisibilityScopeChange(
                  event.target.value === "shared" ? "shared" : "private",
                )
              }
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          <button
            className="primary-button compact-button"
            disabled={isSavedViewSubmitting}
            onClick={onCreateSavedView}
            type="button"
          >
            Save
          </button>
        </div>
        <div className="saved-view-list">
          {savedViews.map((view) => (
            <div
              className={view.valid ? "saved-view-row" : "saved-view-row invalid"}
              key={view.id}
              title={view.invalidReasons.join("; ")}
            >
              <button
                className="saved-view-apply"
                disabled={!view.valid}
                onClick={() => onApplySavedView(view)}
                type="button"
              >
                <strong>{view.name}</strong>
                <span>
                  {view.valid ? summarizeFilters(view.filters, stageLabels) : "Invalid view"}
                </span>
                <small>
                  {view.visibilityScope === "shared" ? "Shared" : "Private"} / {view.ownerName}
                </small>
              </button>
              {view.canManage ? (
                <div className="saved-view-actions">
                  <button
                    className="secondary-button compact-button"
                    disabled={isSavedViewSubmitting}
                    onClick={() => onUpdateSavedView(view)}
                    type="button"
                  >
                    Update
                  </button>
                  <button
                    className="danger-button compact-button"
                    disabled={isSavedViewSubmitting}
                    onClick={() => onDeleteSavedView(view)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {savedViews.length === 0 ? <div className="empty-row">{savedViewsEmptyLabel}</div> : null}
        </div>
      </div>
      <div className="record-list">
        {opportunities.map((opportunity) => (
          <button
            className={
              opportunity.id === selectedOpportunityId ? "record-row selected" : "record-row"
            }
            key={opportunity.id}
            onClick={() => onSelectOpportunity(opportunity.id)}
            type="button"
          >
            <div>
              <strong>{opportunity.title}</strong>
              <span>{opportunity.accountName}</span>
            </div>
            <div className="record-meta">
              <span>{stageLabels.get(opportunity.stageKey) ?? opportunity.stageKey}</span>
              <span>{formatCurrency(opportunity.expectedAmount)}</span>
            </div>
          </button>
        ))}
        {opportunities.length === 0 ? <div className="empty-row">{emptyLabel}</div> : null}
      </div>
    </section>
  );
}

function summarizeFilters(
  filters: OpportunitySavedViewFilters,
  stageLabels: Map<string, string>,
): string {
  const customFieldSummary = Object.entries(filters.customFields ?? {})
    .map(([fieldKey, value]) => `${fieldKey}: ${String(value)}`)
    .join(", ");
  const parts = [
    filters.stageKey ? stageLabels.get(filters.stageKey) ?? filters.stageKey : null,
    filters.query ? `Search: ${filters.query}` : null,
    customFieldSummary || null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" / ") : "All opportunities";
}

function CustomFieldFilterInput({
  field,
  value,
  onChange,
}: {
  field: MetadataFieldDefinitionItem;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.fieldType === "single_select") {
    return (
      <label>
        <span>Value</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Any value</option>
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
        <span>Value</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Any value</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </label>
    );
  }

  return (
    <label>
      <span>Value</span>
      <input
        type={field.fieldType === "date" ? "date" : field.fieldType === "number" || field.fieldType === "currency" ? "number" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.fieldType === "date" ? "YYYY-MM-DD" : "Filter value"}
      />
    </label>
  );
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
