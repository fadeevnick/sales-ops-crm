import type { CurrentUser } from "../../types/session";

type SessionBannerProps = {
  currentUser: CurrentUser;
};

export function SessionBanner({ currentUser }: SessionBannerProps) {
  return (
    <div className="session-banner">
      <div className="eyebrow">Resolved Identity</div>
      <div className="identity-card">
        <strong>{currentUser.displayName}</strong>
        <span>{currentUser.email}</span>
        <div className="banner-grid">
          <span>{currentUser.roleName}</span>
          <span>{currentUser.tenantName}</span>
        </div>
      </div>
    </div>
  );
}
