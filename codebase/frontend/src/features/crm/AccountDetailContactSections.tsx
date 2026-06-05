import { useState } from "react";
import { createActivity } from "../../api/activities";
import { useModalChrome } from "../../hooks/useModalChrome";
import {
  type AccountActivity,
  type AccountContact,
  type AccountOpportunity,
  type ContactFormData,
  fmtDate,
  fmtMoney,
  influenceClass,
} from "./AccountDetailShared";

export function ContactsBlock({
  contacts,
  isLoading,
  error,
  selectedContactId,
  opportunities,
  onSelect,
  onAddContact,
  onAction,
}: {
  contacts: AccountContact[];
  isLoading: boolean;
  error: string | null;
  selectedContactId: string | null;
  opportunities: AccountOpportunity[];
  onSelect: (id: string) => void;
  onAddContact: () => void;
  onAction: (msg: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="rep-panel acct-section">
        <div className="rep-panel-head"><div className="rep-panel-title">Contacts</div></div>
        <div className="rep-empty" style={{ padding: "24px" }}>Loading contacts…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rep-panel acct-section">
        <div className="rep-panel-head"><div className="rep-panel-title">Contacts</div></div>
        <div style={{ padding: "12px 14px", color: "var(--neg)", fontSize: "0.78rem" }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="rep-panel acct-section">
      <div className="rep-panel-head">
        <div className="rep-panel-title">Contacts<em>{contacts.length}</em></div>
        <div className="rep-panel-actions">
          <button className="rep-btn" style={{ fontSize: 11.5, padding: "4px 9px" }} type="button" onClick={onAddContact}>+ Add contact</button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="rep-empty" style={{ padding: "40px 20px" }}>
          <div className="icon">CO</div>
          <div className="ttl">No contacts yet</div>
          <div style={{ maxWidth: 340, lineHeight: 1.6, textAlign: "center" }}>
            Contacts are people inside this account. Add at least one to track who you're speaking with and which deals they're connected to.
          </div>
          <button className="rep-btn rep-btn-primary reset" type="button" onClick={onAddContact} style={{ marginTop: 8 }}>+ Add first contact</button>
        </div>
      ) : (
        <div className="rep-table-scroll">
          <table className="rep-table">
            <colgroup>
              <col style={{ width: "22%" }} /><col style={{ width: "16%" }} /><col /><col style={{ width: "16%" }} /><col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr><th>Name · title</th><th>Influence</th><th>Last interaction</th><th>Linked opps</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const isSelected = selectedContactId === c.id;
                return [
                  <tr key={c.id} className={isSelected ? "selected" : ""} style={{ cursor: "pointer" }} onClick={() => onSelect(c.id)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", color: "var(--paper)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                          {(c.fullName ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                            {c.fullName}
                            {c.isPrimary ? <span className="mono" style={{ fontSize: 9, color: "var(--accent-2)", background: "var(--accent-soft)", border: "1px solid #D9BFA0", padding: "0 4px", borderRadius: 2, letterSpacing: "0.06em" }}>PRIMARY</span> : null}
                          </div>
                          <span className="rep-cell-sub">{c.title ?? "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{c.influence ? <span className={influenceClass(c.influence)}>{c.influence}</span> : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}</td>
                    <td>
                      <div className="rep-cell-truncate">{c.lastInteractionDesc ?? "—"}</div>
                      {c.lastInteractionDate ? <span className="rep-cell-sub mono">{fmtDate(c.lastInteractionDate)}</span> : null}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(c.linkedOpportunityIds ?? []).map((oid) => (
                          <span key={oid} style={{ fontSize: 11.5, color: "var(--ink-2)", background: "var(--paper-2)", border: "1px solid var(--hairline)", padding: "1px 6px", borderRadius: 2 }}>
                            {opportunities.find((o) => o.id === oid)?.title ?? oid}
                          </span>
                        ))}
                        {(c.linkedOpportunityIds ?? []).length === 0 && <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {c.email ? <a className="rep-btn rep-btn-ghost" style={{ fontSize: 11, padding: "3px 7px" }} href={`mailto:${c.email}`} onClick={(e) => { e.stopPropagation(); onAction(`Email · ${c.email}`); }}>Email</a> : null}
                        {c.phone ? <a className="rep-btn rep-btn-ghost" style={{ fontSize: 11, padding: "3px 7px" }} href={`tel:${c.phone}`} onClick={(e) => { e.stopPropagation(); onAction(`Call · ${c.phone}`); }}>Call</a> : null}
                        {!c.email && !c.phone ? <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span> : null}
                      </div>
                    </td>
                  </tr>,
                  isSelected ? (
                    <tr key={`${c.id}-expand`}>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <ContactDetailExpanded contact={c} linkedOpportunities={opportunities.filter((o) => (c.linkedOpportunityIds ?? []).includes(o.id))} onAction={onAction} />
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ContactDetailExpanded({
  contact,
  linkedOpportunities,
  onAction,
}: {
  contact: AccountContact;
  linkedOpportunities: AccountOpportunity[];
  onAction: (msg: string) => void;
}) {
  return (
    <div className="acct-contact-expand">
      <div className="acct-contact-expand-grid">
        <div className="acct-contact-expand-cell"><div className="acct-contact-expand-l">Email</div><div className="acct-contact-expand-v" style={{ color: "var(--info)" }}>{contact.email ?? "—"}</div></div>
        <div className="acct-contact-expand-cell"><div className="acct-contact-expand-l">Phone</div><div className="acct-contact-expand-v">{contact.phone ?? "—"}</div></div>
        <div className="acct-contact-expand-cell"><div className="acct-contact-expand-l">Buying role</div><div className="acct-contact-expand-v">{contact.buyingRole ?? "—"}</div></div>
        <div className="acct-contact-expand-cell"><div className="acct-contact-expand-l">Last interaction</div><div className="acct-contact-expand-v mono">{fmtDate(contact.lastInteractionDate) ?? "—"}</div></div>
      </div>

      {linkedOpportunities.length > 0 ? (
        <div style={{ borderBottom: "1px solid var(--hairline)", marginBottom: 8 }}>
          <div style={{ padding: "6px 0 4px", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>Linked opportunities</div>
          {linkedOpportunities.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--hairline)" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{o.title}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.stageLabel ?? o.stageKey} · {fmtDate(o.closeDate)}</div>
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtMoney(o.expectedAmount)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {contact.notes ? <div className="acct-contact-notes">{contact.notes}</div> : null}

      {contact.email || contact.phone ? (
        <div className="acct-contact-expand-actions">
          {contact.email ? <a className="rep-btn" href={`mailto:${contact.email}`}>Email</a> : null}
          {contact.phone ? <a className="rep-btn" href={`tel:${contact.phone}`}>Call</a> : null}
        </div>
      ) : null}
    </div>
  );
}

export function AddContactModal({
  accountName,
  onClose,
  onSave,
}: {
  accountName: string;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const nameErr = touched && name.trim().length < 2;

  useModalChrome(onClose);

  function save() {
    setTouched(true);
    if (name.trim().length < 2) return;
    onSave({ name: name.trim(), email });
  }

  return (
    <>
      <div className="rep-scrim" onClick={onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add contact">
        <div className="rep-modal-card" style={{ width: 520 }}>
          <div className="head"><h3>Add contact</h3><p>Adding contact to {accountName}</p></div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([
              { label: "Full name", val: name, set: setName, placeholder: "e.g. Jordan Smith", req: true, err: nameErr, errMsg: "Name is required (min 2 characters)" },
              { label: "Work email", val: email, set: setEmail, placeholder: "e.g. jsmith@example.com", req: false, err: false, errMsg: "" },
            ] as const).map((f, i) => (
              <div key={i} className="acct-modal-field">
                <div className="acct-modal-field-lbl">{f.label}{f.req ? <span className="acct-modal-required">*</span> : null}</div>
                <div className={`acct-modal-input${f.err ? " err" : ""}`}>
                  <input placeholder={f.placeholder} value={f.val} onChange={(e) => (f.set as (v: string) => void)(e.target.value)} />
                </div>
                {f.err ? <div className="acct-modal-field-err">{f.errMsg}</div> : null}
              </div>
            ))}
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="rep-btn rep-btn-primary" type="button" onClick={save}>Add contact</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function AddActivityModal({
  accountName,
  currentUserId,
  currentUserName,
  opportunities,
  onClose,
  onSave,
}: {
  accountName: string;
  currentUserId: string;
  currentUserName?: string;
  opportunities: AccountOpportunity[];
  onClose: () => void;
  onSave: (msg: string, created?: AccountActivity) => void;
}) {
  const [type, setType] = useState("followup");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [linkedOppId, setLinkedOppId] = useState(opportunities[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useModalChrome(onClose, { disabled: isSubmitting });

  async function save() {
    if (!linkedOppId) return;
    const title = note.trim() || `${type} logged`;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const response = await createActivity(currentUserId, linkedOppId, { title, type, dueDate: date });
      const newActivity: AccountActivity = {
        id: response.id,
        timestamp: `${date}T00:00:00`,
        type,
        title,
        description: note.trim() || undefined,
        actor: currentUserName,
        status: "planned",
        linkedOpportunityId: linkedOppId,
      };
      onSave(`✓ Activity logged to ${accountName}`, newActivity);
    } catch {
      setErrorMsg("Failed to save activity. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="rep-scrim" onClick={isSubmitting ? undefined : onClose} />
      <div className="rep-modal" role="dialog" aria-label="Add activity">
        <div className="rep-modal-card" style={{ width: 460 }}>
          <div className="head"><h3>Add activity</h3><p>Logged to {accountName}</p></div>
          <div className="body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="acct-modal-field">
              <div className="acct-modal-field-lbl">Activity type</div>
              <div className="acct-modal-type-row">
                {([
                  ["followup", "Follow-up"],
                  ["meeting", "Meeting"],
                  ["email", "Email"],
                  ["note", "Note"],
                ] as const).map(([k, l]) => (
                  <button key={k} className={`rep-btn${type === k ? " rep-btn-primary" : ""}`} style={{ fontSize: 12 }} type="button" onClick={() => setType(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="acct-modal-field">
              <div className="acct-modal-field-lbl">Notes / description</div>
              <div className="acct-modal-input">
                <textarea placeholder="Describe the interaction or next step…" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="acct-modal-field">
                <div className="acct-modal-field-lbl">Date</div>
                <div className="acct-modal-input">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="acct-modal-field">
                <div className="acct-modal-field-lbl">Linked opportunity<span className="acct-modal-required">*</span></div>
                <div className="acct-modal-input">
                  <select value={linkedOppId} onChange={(e) => setLinkedOppId(e.target.value)}>
                    {opportunities.length === 0 ? <option value="">No opportunities</option> : opportunities.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.title}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {opportunities.length === 0 ? (
              <div style={{ fontSize: 11.5, color: "var(--neg)", padding: "6px 8px", background: "#F0DAD3", border: "1px solid #D6B0A8" }}>
                Activity logging requires at least one linked opportunity. Create an opportunity first.
              </div>
            ) : null}
            {errorMsg ? (
              <div style={{ fontSize: 11.5, color: "var(--neg)", padding: "6px 8px", background: "#F0DAD3", border: "1px solid #D6B0A8" }}>
                {errorMsg}
              </div>
            ) : null}
          </div>
          <div className="foot">
            <button className="rep-btn rep-btn-ghost" type="button" disabled={isSubmitting} onClick={onClose}>Cancel</button>
            <button className="rep-btn rep-btn-primary" type="button" disabled={isSubmitting || opportunities.length === 0} onClick={save}>
              {isSubmitting ? "Logging…" : "Log activity"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
