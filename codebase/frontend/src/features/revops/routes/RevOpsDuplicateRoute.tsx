import { DuplicateReviewPanel } from "../../crm/DuplicateReviewPanel";
import type { CurrentUser } from "../../../types/session";

type RevOpsDuplicateRouteProps = {
  currentUser: CurrentUser;
};

export function RevOpsDuplicateRoute({ currentUser }: RevOpsDuplicateRouteProps) {
  return <DuplicateReviewPanel currentUser={currentUser} />;
}
