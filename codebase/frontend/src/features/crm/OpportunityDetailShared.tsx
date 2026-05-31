export {
  REQUEST_TYPE_CATALOG,
  compactId,
  daysUntil,
  describeApprovalSla,
  formatCurrency,
  formatCustomFieldsForForm,
  isActivityCompleted,
  isActivityOverdue,
  isEmpty,
  normalizeApprovalState,
  parseCustomFields,
  parseTimeline,
} from "./OpportunityDetailHelpers";

export type {
  AuditEvent,
  RequestTypeKey,
  SubmitPhase,
  Urgency,
  ValidatedState,
} from "./OpportunityDetailHelpers";

export {
  OpportunityHeader,
  StagePath,
} from "./OpportunityDetailHeaderSections";
