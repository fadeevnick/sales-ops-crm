import { Navigate, useParams } from "react-router-dom";
import type { CurrentUser } from "../../../types/session";
import { CrmReadWorkspace } from "../CrmReadWorkspace";

type AccountDetailRouteProps = {
  currentUser: CurrentUser;
};

export function AccountDetailRoute({ currentUser }: AccountDetailRouteProps) {
  const { accountId } = useParams<{ accountId: string }>();

  if (!accountId) {
    return <Navigate replace to="/accounts" />;
  }

  return <CrmReadWorkspace currentUser={currentUser} routeMode="account" routeAccountId={accountId} />;
}
