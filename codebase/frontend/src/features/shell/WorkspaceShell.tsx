import type { CurrentUser } from "../../types/session";
import { ApproverInbox } from "../approvals/ApproverInbox";
import { CrmReadWorkspace } from "../crm/CrmReadWorkspace";
import { MetadataAdminWorkspace } from "../metadata/MetadataAdminWorkspace";
import { ReportingDashboard } from "../reporting/ReportingDashboard";
import { ModuleGrid } from "./ModuleGrid";
import { SessionBanner } from "./SessionBanner";

type WorkspaceShellProps = {
  currentUser: CurrentUser;
};

export function WorkspaceShell({ currentUser }: WorkspaceShellProps) {
  const canUseCrm = ["sales_rep", "sales_manager", "revops_admin"].includes(currentUser.roleKey);
  const canUseApproverInbox = ["finance_approver", "legal_approver", "revops_admin"].includes(
    currentUser.roleKey,
  );
  const canUseMetadataAdmin = currentUser.roleKey === "revops_admin";
  const canUseReporting = ["sales_manager", "revops_admin"].includes(currentUser.roleKey);

  return (
    <div className="shell-stack">
      <SessionBanner currentUser={currentUser} />
      <ModuleGrid modules={currentUser.modules} />
      {canUseReporting ? <ReportingDashboard currentUser={currentUser} /> : null}
      {canUseMetadataAdmin ? <MetadataAdminWorkspace currentUser={currentUser} /> : null}
      {canUseApproverInbox ? <ApproverInbox currentUser={currentUser} /> : null}
      {canUseCrm ? <CrmReadWorkspace currentUser={currentUser} /> : null}
    </div>
  );
}
