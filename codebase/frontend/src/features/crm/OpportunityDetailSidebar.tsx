import type { AuditEvent } from "./OpportunityDetailShared";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <>
      {events.length === 0 ? (
        <div className="rep-empty" style={{ padding: "20px 14px" }}>
          <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
            No audit events available for this opportunity in the current API response.
          </div>
        </div>
      ) : (
        <div className="opp-timeline">
          {events.map((event, index) => (
            <div className="opp-tl-item" key={`${event.at}-${index}`}>
              <div className="opp-tl-time">
                {event.at.slice(11, 16) || event.at}
                {event.at.length >= 10 ? <small>{event.at.slice(0, 10)}</small> : null}
              </div>
              <div className={`opp-tl-node ${event.type}`} />
              <div>
                <div className="opp-tl-title">
                  {event.title}
                  <span className="opp-tl-code">{event.code}</span>
                </div>
                <div className="opp-tl-desc">{event.description}</div>
              </div>
              <div className="opp-tl-by">{event.actor}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ManagerPanel({
  isActionSubmitting,
  newOwnerId,
  owners,
  onChangeNewOwnerId,
  onReassign,
}: {
  isActionSubmitting: boolean;
  newOwnerId: string;
  owners: { id: string; name: string }[];
  onChangeNewOwnerId: (value: string) => void;
  onReassign: () => void;
}) {
  // Only rendered for roles that can actually reassign (Sales Manager / RevOps
  // Admin) — no locked/disabled noise for reps.
  return (
    <section className="opp-mgr-block">
      <div className="opp-mgr-head">
        <div className="opp-panel-title">
          Manager actions <em>owner reassignment</em>
        </div>
      </div>

      <div className="opp-mgr-actions">
        <div className="opp-mgr-action">
          <div className="mark">RO</div>
          <div>
            <div className="nm">Reassign owner</div>
            <div className="ds">
              Move this opportunity to a different rep. Updates ownership-based visibility and writes an audit event.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {owners.length > 0 ? (
                <select onChange={(event) => onChangeNewOwnerId(event.target.value)} value={newOwnerId}>
                  <option value="">Select new owner…</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  onChange={(event) => onChangeNewOwnerId(event.target.value)}
                  placeholder="user id of new owner"
                  value={newOwnerId}
                />
              )}
              <button
                className={newOwnerId.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
                disabled={isActionSubmitting || !newOwnerId.trim()}
                onClick={onReassign}
                type="button"
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
