import type { CurrentUser } from "../../types/session";
import type { CrmTab } from "./useCrmWorkspaceController";

export function WorkspaceHeader({
  currentUser,
  crmTab,
  scopeLabel,
  todayLabel,
  onNewAccount,
  onNewOpportunity,
}: {
  currentUser: CurrentUser;
  crmTab: CrmTab;
  scopeLabel: string;
  todayLabel: string;
  onNewAccount: () => void;
  onNewOpportunity: () => void;
}) {
  return (
    <header className="rep-page-head">
      <div>
        <h1 className="rep-page-title">
          {crmTab === "accounts" ? "Accounts" : "Opportunities"} <em>· {todayLabel}</em>
        </h1>
      </div>
      <div className="rep-page-actions">
        {/* Context-specific create action: matches the active tab so the label
            reflects exactly what will be created. */}
        {crmTab === "accounts" ? (
          <button className="rep-btn rep-btn-primary" onClick={onNewAccount} type="button">
            New account
          </button>
        ) : (
          <button className="rep-btn rep-btn-primary" onClick={onNewOpportunity} type="button">
            New opportunity
          </button>
        )}
      </div>
    </header>
  );
}


