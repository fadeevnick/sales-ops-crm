import type { ActivityListItem, OpportunityDetail as OpportunityDetailType } from "../../types/crm";
import { isActivityCompleted, isActivityOverdue } from "./OpportunityDetailShared";

export function ActivitiesPanel({
  activities,
  composerDueDate,
  composerKind,
  composerOpen,
  composerTitle,
  completedActivities,
  isActivitySubmitting,
  opportunity,
  overdueActivities,
  upcomingActivities,
  onChangeComposerDueDate,
  onChangeComposerKind,
  onChangeComposerTitle,
  onCloseComposer,
  onSubmitActivity,
}: {
  activities: ActivityListItem[];
  composerDueDate: string;
  composerKind: string;
  composerOpen: boolean;
  composerTitle: string;
  completedActivities: ActivityListItem[];
  isActivitySubmitting: boolean;
  opportunity: OpportunityDetailType;
  overdueActivities: ActivityListItem[];
  upcomingActivities: ActivityListItem[];
  onChangeComposerDueDate: (value: string) => void;
  onChangeComposerKind: (value: string) => void;
  onChangeComposerTitle: (value: string) => void;
  onCloseComposer: () => void;
  onSubmitActivity: () => void;
}) {
  return (
    <>
      {composerOpen ? (
        <div className="opp-composer">
          <div className="opp-composer-row">
            <select className="ctl" onChange={(event) => onChangeComposerKind(event.target.value)} value={composerKind}>
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
              <option value="meeting">Meeting</option>
            </select>
            <input
              className="ctl"
              onChange={(event) => onChangeComposerDueDate(event.target.value)}
              placeholder="YYYY-MM-DD"
              type="date"
              value={composerDueDate}
            />
            <input
              autoFocus
              className="ctl"
              onChange={(event) => onChangeComposerTitle(event.target.value)}
              placeholder="e.g. Send revised pricing sheet"
              value={composerTitle}
            />
          </div>
          <div className="opp-composer-foot">
            <span className="opp-composer-link">
              Linked to {opportunity.account.name}
              {opportunity.primaryContact ? ` · ${opportunity.primaryContact.fullName}` : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="rep-btn" onClick={onCloseComposer} type="button">
                Cancel
              </button>
              <button
                className={composerTitle.trim() ? "rep-btn rep-btn-primary" : "rep-btn rep-btn-disabled"}
                disabled={isActivitySubmitting || !composerTitle.trim()}
                onClick={onSubmitActivity}
                type="button"
              >
                Save activity
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {overdueActivities.length > 0 ? (
        <>
          <div className="opp-section-sub">
            Overdue <span>{overdueActivities.length}</span>
          </div>
          <div className="opp-acts">
            {overdueActivities.map((activity) => (
              <ActivityRow activity={activity} key={activity.id} state="over" />
            ))}
          </div>
        </>
      ) : null}

      <div className="opp-section-sub">
        Upcoming &amp; today <span>{upcomingActivities.length}</span>
      </div>
      <div className="opp-acts">
        {upcomingActivities.length === 0 ? (
          <div className="rep-empty" style={{ padding: "20px 14px" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              No upcoming activities. Use “+ Add activity” to log next steps.
            </div>
          </div>
        ) : (
          upcomingActivities.map((activity) => <ActivityRow activity={activity} key={activity.id} state="upcoming" />)
        )}
      </div>

      {completedActivities.length > 0 ? (
        <>
          <div className="opp-section-sub">
            Completed <span>{completedActivities.length}</span>
          </div>
          <div className="opp-acts">
            {completedActivities.map((activity) => (
              <ActivityRow activity={activity} key={activity.id} state="done" />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function ActivityRow({
  activity,
  state,
}: {
  activity: ActivityListItem;
  state: "over" | "upcoming" | "done";
}) {
  const today = isToday(activity.dueDate);
  const timeClass = state === "over" ? "over" : today ? "today" : "";
  return (
    <div className="opp-act">
      <div className={`opp-act-time ${timeClass}`}>
        {state === "over" ? (
          <>
            OVERDUE
            <br />
          </>
        ) : null}
        {activity.dueDate ?? "no date"}
      </div>
      <div>
        <div className="opp-act-title">
          <span className="opp-act-kind">{activity.type}</span>
          {activity.title}
          {state === "over" ? (
            <span className="rep-pill p-overdue">
              <span className="dot" />
              overdue
            </span>
          ) : null}
          {today && state === "upcoming" ? (
            <span className="rep-pill p-pending">
              <span className="dot" />
              today
            </span>
          ) : null}
        </div>
        <div className="opp-act-meta">
          {activity.type} · {activity.status}
        </div>
      </div>
      <div className="opp-act-actions">
        {state === "done" ? (
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--pos)", fontSize: "0.7rem" }}>
            ✓ DONE
          </span>
        ) : (
          <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--muted)", fontSize: "0.7rem" }}>
            {activity.status}
          </span>
        )}
      </div>
    </div>
  );
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  const dueMs = Date.parse(value);
  if (Number.isNaN(dueMs)) return false;
  const today = new Date();
  const due = new Date(dueMs);
  return (
    today.getFullYear() === due.getFullYear() &&
    today.getMonth() === due.getMonth() &&
    today.getDate() === due.getDate()
  );
}

export { isActivityCompleted, isActivityOverdue };
