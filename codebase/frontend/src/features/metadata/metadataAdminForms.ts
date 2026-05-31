import type {
  MetadataSelectOptionItem,
  SaveMetadataFieldDefinitionRequest,
  SaveMetadataStageDefinitionRequest,
} from "../../types/metadata";

export type FieldFormState = {
  entityType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequiredDefault: boolean;
  selectOptionsText: string;
  sortOrder: string;
  isActive: boolean;
};

export type StageFormState = {
  stageKey: string;
  displayName: string;
  sortOrder: string;
  isClosed: boolean;
};

export type MetadataAdminTab = "fields" | "stages" | "rules" | "history" | "validation";

export const emptyFieldForm: FieldFormState = {
  entityType: "opportunity",
  fieldKey: "",
  label: "",
  fieldType: "text",
  isRequiredDefault: false,
  selectOptionsText: "",
  sortOrder: "100",
  isActive: true,
};

export const emptyStageForm: StageFormState = {
  stageKey: "",
  displayName: "",
  sortOrder: "100",
  isClosed: false,
};

export function buildFieldRequest(form: FieldFormState): SaveMetadataFieldDefinitionRequest | null {
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

export function buildStageRequest(form: StageFormState): SaveMetadataStageDefinitionRequest | null {
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

export function parseSelectOptions(text: string): MetadataSelectOptionItem[] {
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
