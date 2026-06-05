import type { CurrentUser } from "../../../types/session";
import { CrmReadWorkspace } from "../CrmReadWorkspace";

type CrmWorkspaceRouteProps = {
  currentUser: CurrentUser;
  workspaceTab?: "opportunities" | "accounts";
};

export function CrmWorkspaceRoute({ currentUser, workspaceTab = "opportunities" }: CrmWorkspaceRouteProps) {
  return <CrmReadWorkspace currentUser={currentUser} routeMode="workspace" workspaceTab={workspaceTab} />;
}
