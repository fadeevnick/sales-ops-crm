import type { CurrentUser } from "../../types/session";

export type WorkspaceKey =
  | "opportunities"
  | "accounts"
  | "approvals"
  | "reporting"
  | "metadata"
  | "revops";

export type WorkspaceSubNavItem = {
  key: string;
  label: string;
  path: string;
  description: string;
  isActive: (pathname: string) => boolean;
};

export type WorkspaceNavItem = {
  key: WorkspaceKey;
  label: string;
  shortLabel: string;
  section: "Workspace" | "Operations" | "Administration";
  description: string;
  subNav?: WorkspaceSubNavItem[];
};

export const workspaceCatalog: WorkspaceNavItem[] = [
  {
    key: "opportunities",
    label: "Opportunities",
    shortLabel: "OPP",
    section: "Workspace",
    description: "Pipeline & deals",
  },
  {
    key: "accounts",
    label: "Accounts",
    shortLabel: "ACC",
    section: "Workspace",
    description: "Companies & contacts",
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
    subNav: [
      {
        key: "pipeline",
        label: "Team Pipeline",
        path: "/reporting/pipeline",
        description: "Per-rep coverage",
        isActive: (pathname) => pathname === "/reporting" || pathname.startsWith("/reporting/pipeline"),
      },
      {
        key: "executive",
        label: "Executive",
        path: "/reporting/executive",
        description: "Roll-up & health",
        isActive: (pathname) => pathname.startsWith("/reporting/executive"),
      },
      {
        key: "metrics",
        label: "Metrics",
        path: "/reporting/metrics",
        description: "Aggregate & drill-down",
        isActive: (pathname) => pathname.startsWith("/reporting/metrics"),
      },
    ],
  },
  {
    key: "metadata",
    label: "Metadata Admin",
    shortLabel: "ADM",
    section: "Administration",
    description: "Stages, custom fields, required rules",
    subNav: [
      {
        key: "stages",
        label: "Stages",
        path: "/metadata/stages",
        description: "Pipeline stages",
        isActive: (pathname) => pathname === "/metadata" || pathname.startsWith("/metadata/stages"),
      },
      {
        key: "fields",
        label: "Fields",
        path: "/metadata/fields",
        description: "Custom fields",
        isActive: (pathname) => pathname.startsWith("/metadata/fields"),
      },
      {
        key: "rules",
        label: "Required Rules",
        path: "/metadata/rules",
        description: "Stage-gated fields",
        isActive: (pathname) => pathname.startsWith("/metadata/rules"),
      },
      {
        key: "history",
        label: "History",
        path: "/metadata/history",
        description: "Versions & rollback",
        isActive: (pathname) => pathname.startsWith("/metadata/history"),
      },
      {
        key: "validation",
        label: "Validation",
        path: "/metadata/validation",
        description: "Pre-publish checks",
        isActive: (pathname) => pathname.startsWith("/metadata/validation"),
      },
    ],
  },
  {
    key: "revops",
    label: "RevOps Tools",
    shortLabel: "RVP",
    section: "Administration",
    description: "Bulk import/export and duplicate review",
    subNav: [
      {
        key: "import-export",
        label: "Data & Quality",
        path: "/revops/import-export",
        description: "Import / export",
        isActive: (pathname) =>
          pathname === "/revops" ||
          pathname.startsWith("/revops/import-export") ||
          pathname.startsWith("/revops/bulk"),
      },
      {
        key: "duplicates",
        label: "Duplicate Review",
        path: "/revops/duplicates",
        description: "Merge candidates",
        isActive: (pathname) => pathname.startsWith("/revops/duplicates"),
      },
    ],
  },
];

export const roleDefaultWorkspace: Record<string, WorkspaceKey> = {
  finance_approver: "approvals",
  legal_approver: "approvals",
  revops_admin: "metadata",
  sales_manager: "reporting",
  sales_rep: "opportunities",
};

export const workspaceBasePath: Record<WorkspaceKey, string> = {
  opportunities: "/opportunities",
  accounts: "/accounts",
  approvals: "/approvals",
  reporting: "/reporting",
  metadata: "/metadata",
  revops: "/revops/bulk",
};

export function activeWorkspaceFromPath(pathname: string, fallback: WorkspaceKey): WorkspaceKey {
  if (pathname.startsWith("/approvals")) return "approvals";
  if (pathname.startsWith("/reporting")) return "reporting";
  if (pathname.startsWith("/metadata")) return "metadata";
  if (pathname.startsWith("/revops")) return "revops";
  if (pathname.startsWith("/opportunities")) return "opportunities";
  if (pathname.startsWith("/accounts")) return "accounts";
  return fallback;
}

export function canUseWorkspace(currentUser: CurrentUser, key: WorkspaceKey): boolean {
  switch (key) {
    case "opportunities":
    case "accounts":
      return ["sales_rep", "sales_manager", "revops_admin"].includes(currentUser.roleKey);
    case "approvals":
      return ["finance_approver", "legal_approver", "revops_admin"].includes(currentUser.roleKey);
    case "reporting":
      return ["sales_manager", "revops_admin"].includes(currentUser.roleKey);
    case "metadata":
      return currentUser.roleKey === "revops_admin";
    case "revops":
      return currentUser.roleKey === "revops_admin";
    default:
      return false;
  }
}

export function getAvailableWorkspaces(currentUser: CurrentUser): WorkspaceNavItem[] {
  return workspaceCatalog.filter((item) => canUseWorkspace(currentUser, item.key));
}

export function getDefaultWorkspace(currentUser: CurrentUser): WorkspaceKey {
  const available = getAvailableWorkspaces(currentUser);
  return (
    available.find((item) => item.key === roleDefaultWorkspace[currentUser.roleKey])?.key ??
    available[0]?.key ??
    "opportunities"
  );
}

export function getDefaultWorkspacePath(currentUser: CurrentUser): string {
  return workspaceBasePath[getDefaultWorkspace(currentUser)];
}
