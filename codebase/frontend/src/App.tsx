import { useEffect, useState } from "react";
import {
  describeRequestError,
  fetchCurrentUser,
  fetchDemoUsers,
  isUnauthorizedError,
  loginDemoUser,
} from "./api/session";
import { LoginScreen } from "./features/shell/LoginScreen";
import { WorkspaceShell } from "./features/shell/WorkspaceShell";
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

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">Phase 0 Bootstrap</div>
          <h1>Sales Ops CRM Shell</h1>
        </div>
        {authenticatedUser ? (
          <div className="topbar-actions">
            <span className="chip">{authenticatedUser.tenantName}</span>
            <span className="chip">{authenticatedUser.roleName}</span>
            <button className="ghost-button" onClick={logout}>
              Switch User
            </button>
          </div>
        ) : (
          <div className="topbar-actions">
            <span className="chip">Shell session unresolved</span>
          </div>
        )}
      </header>

      <main className={authenticatedUser ? "workspace-layout" : "layout"}>
        {authenticatedUser ? (
          <section className="panel workspace-panel">
            <WorkspaceShell currentUser={authenticatedUser} />
          </section>
        ) : (
          <>
            <section className="panel hero-panel">
              <div className="eyebrow">Intentional Bootstrap Boundary</div>
              <h2>What exists now</h2>
              <p>
                This shell proves the runtime, tenant baseline, temporary demo auth, and role-aware
                workspace framing before any Phase 2 CRM records or Phase 3 approval objects appear.
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
              <div className="eyebrow">Phase Handoff</div>
              <h2>What comes next</h2>
              <ol className="ordered-list">
                <li>Phase 1: tenant auth hardening and workspace shell</li>
                <li>Phase 2: core CRM records and pipeline</li>
                <li>Phase 3: approval workflow core</li>
                <li>Phase 4+: metadata, sharing, import, reporting</li>
              </ol>
              <p className="muted-copy notes-copy">
                This slice keeps runtime proof separate. The current goal is a cleaner shell
                boundary, not a broader product surface.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
