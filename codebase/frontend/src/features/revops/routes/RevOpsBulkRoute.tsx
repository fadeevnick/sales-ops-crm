import { BulkOperationsPanel } from "../../crm/BulkOperationsPanel";
import type { CurrentUser } from "../../../types/session";

type RevOpsBulkRouteProps = {
  currentUser: CurrentUser;
};

export function RevOpsBulkRoute({ currentUser }: RevOpsBulkRouteProps) {
  return <BulkOperationsPanel currentUser={currentUser} onAccountsChanged={async () => {}} />;
}
