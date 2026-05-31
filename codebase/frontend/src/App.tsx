import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  describeRequestError,
  fetchCurrentUser,
  fetchDemoUsers,
  isUnauthorizedError,
  loginDemoUser,
} from "./api/session";
import { ApproverInbox } from "./features/approvals/ApproverInbox";
import { AccountDetailRoute } from "./features/crm/routes/AccountDetailRoute";
import { CrmWorkspaceRoute } from "./features/crm/routes/CrmWorkspaceRoute";
import { OpportunityDetailRoute } from "./features/crm/routes/OpportunityDetailRoute";
import { MetadataAdminWorkspace } from "./features/metadata/MetadataAdminWorkspace";
import { ReportingDashboard } from "./features/reporting/ReportingDashboard";
import { RevOpsWorkspace } from "./features/revops/RevOpsWorkspace";
import { RevOpsBulkRoute } from "./features/revops/routes/RevOpsBulkRoute";
import { RevOpsDuplicateRoute } from "./features/revops/routes/RevOpsDuplicateRoute";
import { LoginScreen } from "./features/shell/LoginScreen";
import { WorkspaceShell } from "./features/shell/WorkspaceShell";
import {
  canUseWorkspace,
  getDefaultWorkspacePath,
} from "./features/shell/workspaceConfig";
import {
  clearStoredSessionUserId,
  readStoredSessionUserId,
  writeStoredSessionUserId,
} from "./lib/sessionStorage";
import type { CurrentUser, DemoUser } from "./types/session";

type ScreenState = "loading" | "logged-out" | "authenticated" | "invalid-session";

export default function App() {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setScreenState("loading");
      setErrorMessage(null);

      try {
        const users = await fetchDemoUsers();

        if (cancelled) {
          return;
        }

        setDemoUsers(users);
        setSelectedEmail((current) => current || users[0]?.email || "");

        const storedUserId = readStoredSessionUserId();
        if (!storedUserId) {
          setCurrentUser(null);
          setScreenState("logged-out");
          return;
        }

        try {
          const me = await fetchCurrentUser(storedUserId);

          if (cancelled) {
            return;
          }

          setCurrentUser(me);
          setScreenState("authenticated");
        } catch (error) {
          if (cancelled) {
            return;
          }

          clearStoredSessionUserId();
          setCurrentUser(null);

          if (isUnauthorizedError(error)) {
            setScreenState("invalid-session");
            return;
          }

          setErrorMessage(describeRequestError(error));
          setScreenState("logged-out");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDemoUsers([]);
        setCurrentUser(null);
        setErrorMessage(describeRequestError(error));
        setScreenState("logged-out");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async () => {
    if (!selectedEmail) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const session = await loginDemoUser(selectedEmail);
      writeStoredSessionUserId(session.userId);

      const me = await fetchCurrentUser(session.userId);
      setCurrentUser(me);
      setScreenState("authenticated");
    } catch (error) {
      clearStoredSessionUserId();
      setCurrentUser(null);
      setErrorMessage(describeRequestError(error));
      setScreenState("logged-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    clearStoredSessionUserId();
    setCurrentUser(null);
    setErrorMessage(null);
    setScreenState("logged-out");
  };

  if (screenState === "loading") {
    return <div className="state-screen">Loading shell...</div>;
  }

  const authenticatedUser = currentUser;

  if (authenticatedUser) {
    const defaultWorkspacePath = getDefaultWorkspacePath(authenticatedUser);
    const canUseCrm = canUseWorkspace(authenticatedUser, "opportunities");
    const canUseApprovals = canUseWorkspace(authenticatedUser, "approvals");
    const canUseReporting = canUseWorkspace(authenticatedUser, "reporting");
    const canUseMetadata = canUseWorkspace(authenticatedUser, "metadata");
    const canUseRevOps = canUseWorkspace(authenticatedUser, "revops");

    return (
      <div className="app app-auth">
        <Routes>
          <Route
            element={<WorkspaceShell currentUser={authenticatedUser} onLogout={logout} />}
          >
            <Route index element={<Navigate replace to={defaultWorkspacePath} />} />
            {canUseCrm ? (
              <>
                <Route path="opportunities" element={<CrmWorkspaceRoute currentUser={authenticatedUser} />} />
                <Route
                  path="accounts"
                  element={<CrmWorkspaceRoute currentUser={authenticatedUser} workspaceTab="accounts" />}
                />
                <Route
                  path="opportunities/:opportunityId"
                  element={<OpportunityDetailRoute currentUser={authenticatedUser} />}
                />
                <Route
                  path="accounts/:accountId"
                  element={<AccountDetailRoute currentUser={authenticatedUser} />}
                />
                {/* Legacy /crm/* deep links continue to resolve. */}
                <Route path="crm" element={<Navigate replace to="/opportunities" />} />
                <Route path="crm/accounts" element={<Navigate replace to="/accounts" />} />
                <Route path="crm/opportunities/:opportunityId" element={<LegacyOpportunityRedirect />} />
                <Route path="crm/opportunity/:opportunityId" element={<LegacyOpportunityRedirect />} />
                <Route path="crm/accounts/:accountId" element={<LegacyAccountRedirect />} />
                <Route path="crm/account/:accountId" element={<LegacyAccountRedirect />} />
              </>
            ) : null}
            {canUseApprovals ? (
              <Route path="approvals/*" element={<ApproverInbox currentUser={authenticatedUser} />} />
            ) : null}
            {canUseReporting ? (
              <Route
                path="reporting/*"
                element={
                  <ReportingDashboardRoute
                    currentUser={authenticatedUser}
                    canUseApprovals={canUseApprovals}
                  />
                }
              />
            ) : null}
            {canUseMetadata ? (
              <Route
                path="metadata/*"
                element={<MetadataAdminWorkspace currentUser={authenticatedUser} />}
              />
            ) : null}
            {canUseRevOps ? (
              <Route path="revops" element={<RevOpsWorkspace />}>
                <Route index element={<Navigate replace to="import-export" />} />
                <Route
                  path="import-export"
                  element={<RevOpsBulkRoute currentUser={authenticatedUser} />}
                />
                <Route path="bulk" element={<Navigate replace to="/revops/import-export" />} />
                <Route
                  path="duplicates"
                  element={<RevOpsDuplicateRoute currentUser={authenticatedUser} />}
                />
                <Route path="*" element={<Navigate replace to="/revops/import-export" />} />
              </Route>
            ) : null}
            <Route path="*" element={<Navigate replace to={defaultWorkspacePath} />} />
          </Route>
        </Routes>
      </div>
    );
  }

  return (
    <div className="app app-public">
      <header className="public-topbar">
        <div>
          <div className="eyebrow">Local Pilot</div>
          <h1>Sales Ops CRM</h1>
        </div>
        <div className="topbar-actions">
          <span className="chip">Shell session unresolved</span>
        </div>
      </header>

      <main className="layout">
            <section className="panel hero-panel">
              <div className="eyebrow">Pilot Workspace</div>
              <h2>What exists now</h2>
              <p>
                This local pilot contains demo authentication, role-aware workspaces, CRM records,
                approval workflows, metadata administration, import operations, duplicate review, and reporting.
              </p>
              <ul className="bullet-list">
                <li>tenant / user / role seed data</li>
                <li>temporary demo login path</li>
                <li>health and readiness endpoints</li>
                <li>role-aware workspace shell</li>
                <li>containerized local runtime</li>
              </ul>
            </section>

            <section className="panel login-panel">
            <LoginScreen
              demoUsers={demoUsers}
              selectedEmail={selectedEmail}
              onSelectEmail={setSelectedEmail}
              onLogin={login}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              showInvalidSessionState={screenState === "invalid-session"}
            />
            </section>

            <section className="panel notes-panel">
              <div className="eyebrow">Role Coverage</div>
              <h2>Demo workspaces</h2>
              <ol className="ordered-list">
                <li>Sales rep CRM workspace</li>
                <li>Finance and legal approval queues</li>
                <li>RevOps metadata, import, and duplicate operations</li>
                <li>Manager and RevOps reporting</li>
              </ol>
              <p className="muted-copy notes-copy">
                Select a demo user to enter the role-specific local pilot environment.
              </p>
            </section>
      </main>
    </div>
  );
}

function LegacyOpportunityRedirect() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  return <Navigate replace to={opportunityId ? `/opportunities/${opportunityId}` : "/opportunities"} />;
}

function LegacyAccountRedirect() {
  const { accountId } = useParams<{ accountId: string }>();
  return <Navigate replace to={accountId ? `/accounts/${accountId}` : "/accounts"} />;
}

function ReportingDashboardRoute({
  currentUser,
  canUseApprovals,
}: {
  currentUser: CurrentUser;
  canUseApprovals: boolean;
}) {
  const navigate = useNavigate();

  return (
    <ReportingDashboard
      currentUser={currentUser}
      onNavigateToApprovals={canUseApprovals ? () => navigate("/approvals") : undefined}
    />
  );
}
