import { Navigate, useParams } from "react-router-dom";
import type { CurrentUser } from "../../../types/session";
import { CrmReadWorkspace } from "../CrmReadWorkspace";

type OpportunityDetailRouteProps = {
  currentUser: CurrentUser;
};

export function OpportunityDetailRoute({ currentUser }: OpportunityDetailRouteProps) {
  const { opportunityId } = useParams<{ opportunityId: string }>();

  if (!opportunityId) {
    return <Navigate replace to="/opportunities" />;
  }

  return (
    <CrmReadWorkspace
      currentUser={currentUser}
      routeMode="opportunity"
      routeOpportunityId={opportunityId}
    />
  );
}
