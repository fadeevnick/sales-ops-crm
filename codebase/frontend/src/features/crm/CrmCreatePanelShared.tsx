import type { CustomFieldValue } from "../../types/crm";
import type { MetadataFieldDefinitionItem } from "../../types/metadata";

export function CustomFieldInput({
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
      <div className="rep-form-field full">
        <label>{field.label}</label>
        <textarea onChange={(event) => onChange(event.target.value)} rows={3} value={value} />
      </div>
    );
  }

  if (field.fieldType === "single_select") {
    return (
      <div className="rep-form-field">
        <label>{field.label}</label>
        <select onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">None</option>
          {field.selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <div className="rep-form-field">
        <label>{field.label}</label>
        <select onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">None</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    );
  }

  const inputType = field.fieldType === "date" ? "date" : "text";
  const inputMode = field.fieldType === "number" || field.fieldType === "currency" ? "decimal" : undefined;

  return (
    <div className="rep-form-field">
      <label>{field.label}</label>
      <input inputMode={inputMode} onChange={(event) => onChange(event.target.value)} type={inputType} value={value} />
    </div>
  );
}

export function parseCustomFields(
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
