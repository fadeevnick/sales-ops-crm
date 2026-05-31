import { useState } from "react";
import {
  createMetadataFieldDefinition,
  createMetadataRequiredField,
  createMetadataStageDefinition,
  deleteMetadataFieldDefinition,
  deleteMetadataRequiredField,
  deleteMetadataStageDefinition,
  updateMetadataFieldDefinition,
  updateMetadataStageDefinition,
} from "../../api/metadata";
import type {
  MetadataFieldDefinitionItem,
  MetadataStageDefinitionItem,
  PublishedMetadataResponse,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import {
  buildFieldRequest,
  buildStageRequest,
  emptyFieldForm,
  emptyStageForm,
  type FieldFormState,
  type StageFormState,
} from "./metadataAdminForms";

type UseMetadataSchemaEditingArgs = {
  currentUser: CurrentUser;
  draft: PublishedMetadataResponse | null;
  draftOpportunityFields: MetadataFieldDefinitionItem[];
  runDraftMutation: (
    mutation: () => Promise<PublishedMetadataResponse>,
    successMessage: string,
  ) => Promise<boolean>;
  setErrorMessage: (message: string | null) => void;
};

export function useMetadataSchemaEditing({
  currentUser,
  draft,
  draftOpportunityFields,
  runDraftMutation,
  setErrorMessage,
}: UseMetadataSchemaEditingArgs) {
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [stageForm, setStageForm] = useState<StageFormState>(emptyStageForm);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageEditorOpen, setStageEditorOpen] = useState(false);
  const [requiredStageKey, setRequiredStageKey] = useState("");
  const [requiredFieldKey, setRequiredFieldKey] = useState("");

  const resetSchemaForms = () => {
    setFieldForm(emptyFieldForm);
    setEditingFieldId(null);
    setFieldEditorOpen(false);
    setStageForm(emptyStageForm);
    setEditingStageId(null);
    setStageEditorOpen(false);
  };

  const openNewStage = () => {
    setStageForm(emptyStageForm);
    setEditingStageId(null);
    setStageEditorOpen(true);
  };

  const closeStageEditor = () => {
    setStageEditorOpen(false);
    setEditingStageId(null);
    setStageForm(emptyStageForm);
  };

  const openNewField = () => {
    setFieldForm(emptyFieldForm);
    setEditingFieldId(null);
    setFieldEditorOpen(true);
  };

  const closeFieldEditor = () => {
    setFieldEditorOpen(false);
    setEditingFieldId(null);
    setFieldForm(emptyFieldForm);
  };

  const saveField = async () => {
    if (!draft) return;
    const request = buildFieldRequest(fieldForm);
    if (!request) {
      setErrorMessage("Field key, label and numeric sort order are required");
      return;
    }
    const ok = await runDraftMutation(
      () =>
        editingFieldId
          ? updateMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, editingFieldId, request)
          : createMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, request),
      editingFieldId ? "Field updated" : "Field created",
    );
    if (ok) closeFieldEditor();
  };

  const editField = (field: MetadataFieldDefinitionItem) => {
    setEditingFieldId(field.id);
    setFieldEditorOpen(true);
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
    if (!draft) return;
    await runDraftMutation(
      () => deleteMetadataFieldDefinition(currentUser.userId, draft.configVersion.id, fieldId),
      "Field deleted",
    );
    if (editingFieldId === fieldId) closeFieldEditor();
  };

  const saveStage = async () => {
    if (!draft) return;
    const request = buildStageRequest(stageForm);
    if (!request) {
      setErrorMessage("Stage key, display name and numeric sort order are required");
      return;
    }
    const ok = await runDraftMutation(
      () =>
        editingStageId
          ? updateMetadataStageDefinition(currentUser.userId, draft.configVersion.id, editingStageId, request)
          : createMetadataStageDefinition(currentUser.userId, draft.configVersion.id, request),
      editingStageId ? "Stage updated" : "Stage created",
    );
    if (ok) closeStageEditor();
  };

  const editStage = (stage: MetadataStageDefinitionItem) => {
    setEditingStageId(stage.id);
    setStageEditorOpen(true);
    setStageForm({
      stageKey: stage.stageKey,
      displayName: stage.displayName,
      sortOrder: stage.sortOrder.toString(),
      isClosed: stage.isClosed,
    });
  };

  const removeStage = async (stageId: string) => {
    if (!draft) return;
    await runDraftMutation(
      () => deleteMetadataStageDefinition(currentUser.userId, draft.configVersion.id, stageId),
      "Stage deleted",
    );
    if (editingStageId === stageId) closeStageEditor();
  };

  const createRequiredRule = async () => {
    const stageKey = requiredStageKey || draft?.stages[0]?.stageKey || "";
    const fieldKey = requiredFieldKey || draftOpportunityFields[0]?.fieldKey || "title";
    if (!draft || !stageKey || !fieldKey) return;
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
    if (!draft) return;
    await runDraftMutation(
      () => deleteMetadataRequiredField(currentUser.userId, draft.configVersion.id, requiredFieldId),
      "Required rule deleted",
    );
  };

  return {
    fieldForm,
    setFieldForm,
    editingFieldId,
    setEditingFieldId,
    fieldEditorOpen,
    openNewField,
    closeFieldEditor,
    stageForm,
    setStageForm,
    editingStageId,
    setEditingStageId,
    stageEditorOpen,
    openNewStage,
    closeStageEditor,
    requiredStageKey,
    setRequiredStageKey,
    requiredFieldKey,
    setRequiredFieldKey,
    resetSchemaForms,
    saveField,
    editField,
    removeField,
    saveStage,
    editStage,
    removeStage,
    createRequiredRule,
    removeRequiredRule,
  };
}
