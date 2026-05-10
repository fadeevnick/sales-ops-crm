import type { DemoUser } from "../../types/session";

type LoginScreenProps = {
  demoUsers: DemoUser[];
  selectedEmail: string;
  onSelectEmail: (email: string) => void;
  onLogin: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  showInvalidSessionState: boolean;
};

export function LoginScreen({
  demoUsers,
  selectedEmail,
  onSelectEmail,
  onLogin,
  isSubmitting,
  errorMessage,
  showInvalidSessionState,
}: LoginScreenProps) {
  const canLogin = selectedEmail.length > 0 && !isSubmitting;

  return (
    <div className="shell-stack">
      <div className="eyebrow">Demo Entry</div>
      <h2>Seeded Users</h2>
      <p className="muted-copy">
        The shell still uses demo transport, but login and workspace state already follow the
        stable `GET /api/me` contract.
      </p>

      {showInvalidSessionState ? (
        <div className="warning-box">
          Stored session is no longer valid. Choose a seeded user and enter again.
        </div>
      ) : null}

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

      <label className="field-label" htmlFor="demo-user">
        Choose a temporary identity
      </label>

      <select
        id="demo-user"
        className="select-input"
        value={selectedEmail}
        onChange={(event) => onSelectEmail(event.target.value)}
        disabled={demoUsers.length === 0 || isSubmitting}
      >
        {demoUsers.length === 0 ? (
          <option value="">No seeded users available</option>
        ) : null}
        {demoUsers.map((user) => (
          <option key={user.userId} value={user.email}>
            {user.displayName} — {user.roleName}
          </option>
        ))}
      </select>

      <button className="primary-button" onClick={onLogin} disabled={!canLogin}>
        {isSubmitting ? "Entering workspace..." : "Enter workspace"}
      </button>
    </div>
  );
}
