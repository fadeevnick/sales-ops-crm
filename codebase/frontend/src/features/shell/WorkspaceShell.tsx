import { useMemo, useState } from "react";
import type { CurrentUser } from "../../types/session";
import { ApproverInbox } from "../approvals/ApproverInbox";
import { CrmReadWorkspace } from "../crm/CrmReadWorkspace";
import { MetadataAdminWorkspace } from "../metadata/MetadataAdminWorkspace";
import { ReportingDashboard } from "../reporting/ReportingDashboard";

type WorkspaceShellProps = {
  currentUser: CurrentUser;
  onLogout: () => void;
};

type WorkspaceKey = "crm" | "approvals" | "reporting" | "metadata";

type WorkspaceNavItem = {
  key: WorkspaceKey;
  label: string;
  shortLabel: string;
  section: "Workspace" | "Operations" | "Administration";
  description: string;
};

const workspaceCatalog: WorkspaceNavItem[] = [
  {
    key: "crm",
    label: "CRM Workspace",
    shortLabel: "CRM",
    section: "Workspace",
    description: "Accounts, contacts, opportunities, activities",
  },
  {
    key: "approvals",
    label: "Approval Inbox",
    shortLabel: "APR",
    section: "Operations",
    description: "Finance and legal approval decisions",
  },
  {
    key: "reporting",
    label: "Reporting",
    shortLabel: "RPT",
    section: "Operations",
    description: "Pipeline health and projection metrics",
  },
  {
    key: "metadata",
    label: "Metadata Admin",
    shortLabel: "ADM",
    section: "Administration",
    description: "Stages, custom fields, required rules",
  },
];

const roleDefaultWorkspace: Record<string, WorkspaceKey> = {
  finance_approver: "approvals",
  legal_approver: "approvals",
  revops_admin: "metadata",
  sales_manager: "reporting",
  sales_rep: "crm",
};

export function WorkspaceShell({ currentUser, onLogout }: WorkspaceShellProps) {
  const canUseCrm = ["sales_rep", "sales_manager", "revops_admin"].includes(currentUser.roleKey);
  const canUseApproverInbox = ["finance_approver", "legal_approver", "revops_admin"].includes(
    currentUser.roleKey,
  );
  const canUseMetadataAdmin = currentUser.roleKey === "revops_admin";
  const canUseReporting = ["sales_manager", "revops_admin"].includes(currentUser.roleKey);
  const availableWorkspaces = useMemo(
    () =>
      workspaceCatalog.filter((item) => {
        if (item.key === "crm") {
          return canUseCrm;
        }

        if (item.key === "approvals") {
          return canUseApproverInbox;
        }

        if (item.key === "reporting") {
          return canUseReporting;
        }

        return canUseMetadataAdmin;
      }),
    [canUseApproverInbox, canUseCrm, canUseMetadataAdmin, canUseReporting],
  );
  const defaultWorkspace =
    availableWorkspaces.find((item) => item.key === roleDefaultWorkspace[currentUser.roleKey])?.key ??
    availableWorkspaces[0]?.key ??
    "crm";
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>(defaultWorkspace);
  const activeItem = availableWorkspaces.find((item) => item.key === activeWorkspace) ?? availableWorkspaces[0];
  const userInitials = getInitials(currentUser.displayName);
  const groupedNavItems = groupBySection(availableWorkspaces);

  return (
    <div className="workspace-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div className="brand-name">
            Sales Ops CRM <span>LOCAL PILOT</span>
          </div>
        </div>

        <div className="tenant">
          <div className="tenant-label">Tenant</div>
          <div className="tenant-row">
            <strong className="tenant-name">{currentUser.tenantName}</strong>
            <span className="tenant-env">LOCAL</span>
          </div>
          <div className="tenant-meta">
            <span>{currentUser.modules.length} modules</span>
            <span className="dot">/</span>
            <span>{currentUser.roleName}</span>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary workspace">
          {groupedNavItems.map((group) => (
            <div className="nav-section" key={group.section}>
              <div className="nav-title">
                <span>{group.section}</span>
                <em>{group.items.length}</em>
              </div>
              {group.items.map((item) => (
                <button
                  className={item.key === activeWorkspace ? "nav-item active" : "nav-item"}
                  key={item.key}
                  onClick={() => setActiveWorkspace(item.key)}
                  type="button"
                >
                  <span className="nav-mark">{item.shortLabel}</span>
                  <span className="nav-copy">
                    <span>{item.label}</span>
                    <small>{item.description}</small>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="user-block">
          <div className="avatar">{userInitials}</div>
          <div className="user-meta">
            <span className="user-name">{currentUser.displayName}</span>
            <span className="user-role">{currentUser.roleName}</span>
          </div>
          <button className="switch-btn" onClick={onLogout} type="button">
            Switch
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="crumb">
            <span>Sales Ops CRM</span>
            <span className="sep">/</span>
            <strong>{activeItem?.label ?? "Workspace"}</strong>
            <span className="pulse">
              <span className="pulse-dot" />
              Local Pilot
            </span>
          </div>

          <div className="global-search" role="search">
            <span aria-hidden="true">Search</span>
            <input aria-label="Search Sales Ops CRM" placeholder="Accounts, opportunities, approvals" />
            <kbd>/</kbd>
          </div>

          <div className="topbar-actions">
            <span className="chip">{currentUser.roleName}</span>
            <span className="chip">{currentUser.email}</span>
          </div>
        </header>

        <main className="app-content">
          {activeWorkspace === "crm" && canUseCrm ? <CrmReadWorkspace currentUser={currentUser} /> : null}
          {activeWorkspace === "approvals" && canUseApproverInbox ? (
            <ApproverInbox currentUser={currentUser} />
          ) : null}
          {activeWorkspace === "reporting" && canUseReporting ? (
            <ReportingDashboard
              currentUser={currentUser}
              onNavigateToApprovals={
                canUseApproverInbox ? () => setActiveWorkspace("approvals") : undefined
              }
            />
          ) : null}
          {activeWorkspace === "metadata" && canUseMetadataAdmin ? (
            <MetadataAdminWorkspace currentUser={currentUser} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function groupBySection(items: WorkspaceNavItem[]) {
  const sections: WorkspaceNavItem["section"][] = ["Workspace", "Operations", "Administration"];

  return sections
    .map((section) => ({
      section,
      items: items.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
