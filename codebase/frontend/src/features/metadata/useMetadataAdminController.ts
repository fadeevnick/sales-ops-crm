import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createMetadataDraft,
  discardMetadataDraft,
  fetchMetadataConfigVersions,
  fetchCurrentMetadataDraft,
  fetchPublishedMetadata,
  publishMetadataDraft,
  rollbackMetadataConfigVersion,
  validateMetadataDraft,
} from "../../api/metadata";
import { ApiRequestError, describeRequestError } from "../../api/session";
import type {
  MetadataConfigVersionItem,
  MetadataValidationResponse,
  PublishedMetadataResponse,
} from "../../types/metadata";
import type { CurrentUser } from "../../types/session";
import { emptyFieldForm, emptyStageForm } from "./metadataAdminForms";
import { useMetadataSchemaEditing } from "./useMetadataSchemaEditing";

export type {
  FieldFormState,
  MetadataAdminTab,
  StageFormState,
} from "./metadataAdminForms";
export { emptyFieldForm, emptyStageForm } from "./metadataAdminForms";

import type { MetadataAdminTab } from "./metadataAdminForms";

export function useMetadataAdminController(currentUser: CurrentUser) {
  const location = useLocation();
  const navigate = useNavigate();

  // Tabs are URL-driven (deep-link + browser-back + sidebar sub-nav).
  const activeTab: MetadataAdminTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/metadata/fields")) return "fields";
    if (path.startsWith("/metadata/rules")) return "rules";
    if (path.startsWith("/metadata/history")) return "history";
    if (path.startsWith("/metadata/validation")) return "validation";
    return "stages";
  }, [location.pathname]);
  const setActiveTab = (tab: MetadataAdminTab) => navigate(`/metadata/${tab}`);

  useEffect(() => {
    if (location.pathname === "/metadata" || location.pathname === "/metadata/") {
      navigate("/metadata/stages", { replace: true });
    }
  }, [location.pathname, navigate]);

  const [published, setPublished] = useState<PublishedMetadataResponse | null>(null);
  const [draft, setDraft] = useState<PublishedMetadataResponse | null>(null);
  const [configVersions, setConfigVersions] = useState<MetadataConfigVersionItem[]>([]);
  const [validation, setValidation] = useState<MetadataValidationResponse | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
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

  const runDraftMutation = async (
    mutation: () => Promise<PublishedMetadataResponse>,
    successMessage: string,
  ): Promise<boolean> => {
    if (!draft) return false;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const nextDraft = await mutation();
      applyDraftUpdate(nextDraft, successMessage);
      return true;
    } catch (error) {
      setErrorMessage(describeRequestError(error));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const schemaEditing = useMetadataSchemaEditing({
    currentUser,
    draft,
    draftOpportunityFields,
    runDraftMutation,
    setErrorMessage,
  });

  const createDraft = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const draftResponse = await createMetadataDraft(currentUser.userId, {
        notes: draftNotes.trim() || undefined,
      });

      setDraft(draftResponse);
      schemaEditing.setFieldForm(emptyFieldForm);
      schemaEditing.setStageForm(emptyStageForm);
      schemaEditing.setRequiredStageKey(draftResponse.stages[0]?.stageKey ?? "");
      schemaEditing.setRequiredFieldKey(
        draftResponse.fields.find((field) => field.entityType === "opportunity")?.fieldKey ?? "",
      );
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
    if (!draft) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const validationResponse = await validateMetadataDraft(currentUser.userId, draft.configVersion.id);
      setValidation(validationResponse);
      setMessage(validationResponse.valid ? "Metadata draft is valid" : "Metadata draft needs changes");
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishDraft = async () => {
    if (!draft) return;
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
      schemaEditing.setEditingFieldId(null);
      schemaEditing.setEditingStageId(null);
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
    if (!draft) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setMessage(null);

      const versionsResponse = await discardMetadataDraft(currentUser.userId, draft.configVersion.id);
      setConfigVersions(versionsResponse.configVersions);
      setDraft(null);
      schemaEditing.setEditingFieldId(null);
      schemaEditing.setEditingStageId(null);
      schemaEditing.setFieldForm(emptyFieldForm);
      schemaEditing.setStageForm(emptyStageForm);
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
      schemaEditing.setEditingFieldId(null);
      schemaEditing.setEditingStageId(null);
      setValidation(null);
      setMessage(`Metadata rolled back to version ${rollbackResponse.configVersion.versionNumber}`);
      await refreshConfigVersions();
    } catch (error) {
      setErrorMessage(describeRequestError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeConfig,
    activeTab,
    configVersions,
    draft,
    draftNotes,
    draftOpportunityFields,
    editingFieldId: schemaEditing.editingFieldId,
    editingStageId: schemaEditing.editingStageId,
    fieldEditorOpen: schemaEditing.fieldEditorOpen,
    stageEditorOpen: schemaEditing.stageEditorOpen,
    openNewField: schemaEditing.openNewField,
    closeFieldEditor: schemaEditing.closeFieldEditor,
    openNewStage: schemaEditing.openNewStage,
    closeStageEditor: schemaEditing.closeStageEditor,
    errorMessage,
    fieldCount,
    fieldForm: schemaEditing.fieldForm,
    isLoading,
    isSubmitting,
    message,
    orderedFields,
    orderedStages,
    published,
    requiredFieldKey: schemaEditing.requiredFieldKey,
    requiredRuleCount,
    requiredStageKey: schemaEditing.requiredStageKey,
    setActiveTab,
    setDraftNotes,
    setFieldForm: schemaEditing.setFieldForm,
    setRequiredFieldKey: schemaEditing.setRequiredFieldKey,
    setRequiredStageKey: schemaEditing.setRequiredStageKey,
    setStageForm: schemaEditing.setStageForm,
    stageCount,
    stageForm: schemaEditing.stageForm,
    validation,
    validationIssueCount,
    createDraft,
    createRequiredRule: schemaEditing.createRequiredRule,
    discardDraft,
    editField: schemaEditing.editField,
    editStage: schemaEditing.editStage,
    loadMetadata,
    publishDraft,
    removeField: schemaEditing.removeField,
    removeRequiredRule: schemaEditing.removeRequiredRule,
    removeStage: schemaEditing.removeStage,
    rollbackConfigVersion,
    saveField: schemaEditing.saveField,
    saveStage: schemaEditing.saveStage,
    setEditingFieldId: schemaEditing.setEditingFieldId,
    setEditingStageId: schemaEditing.setEditingStageId,
    validateDraft,
  };
}
