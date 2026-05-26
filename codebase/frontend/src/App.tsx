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

  if (authenticatedUser) {
    return (
      <div className="app app-auth">
        <WorkspaceShell currentUser={authenticatedUser} onLogout={logout} />
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
