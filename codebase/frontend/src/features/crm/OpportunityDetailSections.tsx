export {
  OpportunityHeader,
  StagePath,
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
} from "./OpportunityDetailShared";
export type {
  AuditEvent,
  RequestTypeKey,
  SubmitPhase,
  Urgency,
  ValidatedState,
} from "./OpportunityDetailShared";

export { DealFields } from "./OpportunityDetailFields";
export { ActivitiesPanel } from "./OpportunityDetailActivities";
export { ApprovalPanel, SubmitApprovalDrawer } from "./OpportunityDetailApproval";
export { AuditTimeline, ManagerPanel } from "./OpportunityDetailSidebar";
