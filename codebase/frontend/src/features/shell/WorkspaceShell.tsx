import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { CurrentUser } from "../../types/session";
import {
  activeWorkspaceFromPath,
  getAvailableWorkspaces,
  getDefaultWorkspace,
  workspaceBasePath,
  type WorkspaceNavItem,
} from "./workspaceConfig";

type WorkspaceShellProps = {
  currentUser: CurrentUser;
  onLogout: () => void;
};

export function WorkspaceShell({ currentUser, onLogout }: WorkspaceShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const availableWorkspaces = getAvailableWorkspaces(currentUser);
  const defaultWorkspace = getDefaultWorkspace(currentUser);
  const activeWorkspace = activeWorkspaceFromPath(location.pathname, defaultWorkspace);
  const activeItem = availableWorkspaces.find((item) => item.key === activeWorkspace) ?? availableWorkspaces[0];

  const userInitials = getInitials(currentUser.displayName);
  const groupedNavItems = groupBySection(availableWorkspaces);

  // Single canonical account control (top-right): avatar + name + dropdown.
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

  // Close the menu on route change so it never lingers across navigations.
  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);

  const navigateTo = (item: WorkspaceNavItem) => {
    navigate(workspaceBasePath[item.key]);
  };

  return (
    <div className="workspace-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div className="brand-name">
            Sales Ops CRM
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary workspace">
          {groupedNavItems.map((group) => (
            <div className="nav-section" key={group.section}>
              <div className="nav-title">
                <span>{group.section}</span>
                <em>{group.items.length}</em>
              </div>
              {group.items.map((item) => {
                const isActive = item.key === activeWorkspace;
                return (
                  <div key={item.key}>
                    <button
                      className={isActive ? "nav-item active" : "nav-item"}
                      onClick={() => navigateTo(item)}
                      type="button"
                    >
                      <span className="nav-mark">{item.shortLabel}</span>
                      <span className="nav-copy">
                        <span>{item.label}</span>
                        <small>{item.description}</small>
                      </span>
                    </button>
                    {isActive && item.subNav ? (
                      <div className="nav-subnav" role="group" aria-label={`${item.label} sections`}>
                        {item.subNav.map((sub) => (
                          <button
                            className={sub.isActive(location.pathname) ? "nav-subitem active" : "nav-subitem"}
                            key={sub.key}
                            onClick={() => navigate(sub.path)}
                            type="button"
                          >
                            <span className="nav-subitem-label">{sub.label}</span>
                            <small>{sub.description}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="crumb">
            <span>Sales Ops CRM</span>
            <span className="sep">/</span>
            <strong>{activeItem?.label ?? "Workspace"}</strong>
          </div>

          <div className="topbar-actions">
            <div className="account-menu" ref={accountRef}>
              <button
                className="account-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span className="account-avatar">{userInitials}</span>
                <span className="account-id">
                  <span className="account-name">{currentUser.displayName}</span>
                  <span className="account-role">{currentUser.roleName}</span>
                </span>
                <span className="account-caret" aria-hidden="true">▾</span>
              </button>
              {accountMenuOpen ? (
                <div className="account-pop" role="menu">
                  <div className="account-pop-head">
                    <span className="account-pop-name">{currentUser.displayName}</span>
                    <span className="account-pop-email">{currentUser.email}</span>
                    <span className="account-pop-meta">{currentUser.tenantName}</span>
                  </div>
                  <button className="account-pop-item" type="button" role="menuitem" onClick={onLogout}>
                    Switch user
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
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
