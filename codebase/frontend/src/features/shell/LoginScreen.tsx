type LoginScreenProps = {
  email: string;
  onEmailChange: (email: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  onLogin: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  showInvalidSessionState: boolean;
};

export function LoginScreen({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onLogin,
  isSubmitting,
  errorMessage,
  showInvalidSessionState,
}: LoginScreenProps) {
  const canLogin = email.length > 0 && password.length > 0 && !isSubmitting;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canLogin) onLogin();
  };

  return (
    <div className="shell-stack">
      <div className="eyebrow">Sign In</div>
      <h2>Access Workspace</h2>

      {showInvalidSessionState ? (
        <div className="warning-box">
          Session expired. Please sign in again.
        </div>
      ) : null}

      {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

      <label className="field-label" htmlFor="login-email">
        Email
      </label>
      <input
        id="login-email"
        type="email"
        className="text-input"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <label className="field-label" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        type="password"
        className="text-input"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
        autoComplete="current-password"
      />

      <button className="primary-button" onClick={onLogin} disabled={!canLogin}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </div>
  );
}
