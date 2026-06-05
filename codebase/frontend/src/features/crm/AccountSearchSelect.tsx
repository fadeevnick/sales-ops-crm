import { useEffect, useRef, useState } from "react";
import { fetchAccounts } from "../../api/accounts";
import type { AccountListItem } from "../../types/crm";

/**
 * Searchable account picker backed by the server-side accounts search (`?q=`),
 * so any account in scope is selectable — not just the first loaded page.
 * Falls back to the initial `accounts` list for resolving the selected name.
 */
export function AccountSearchSelect({
  userId,
  accounts,
  selectedAccountId,
  onSelectAccount,
}: {
  userId: string;
  accounts: AccountListItem[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountListItem[]>(accounts);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const selected =
    results.find((account) => account.id === selectedAccountId) ??
    accounts.find((account) => account.id === selectedAccountId) ??
    null;

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetchAccounts(userId, trimmed ? { q: trimmed, pageSize: 25 } : { pageSize: 25 });
        if (!cancelled) setResults(response.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, open, userId]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="acct-search-select" ref={boxRef}>
      <input
        className="acct-search-input"
        value={open ? query : selected?.name ?? ""}
        placeholder={selected ? selected.name : "Search account…"}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => setQuery(event.target.value)}
      />
      {open ? (
        <div className="acct-search-pop">
          {loading ? <div className="acct-search-empty">Searching…</div> : null}
          {!loading && results.length === 0 ? <div className="acct-search-empty">No accounts found</div> : null}
          {results.map((account) => (
            <button
              key={account.id}
              type="button"
              className={`acct-search-opt${account.id === selectedAccountId ? " active" : ""}`}
              onClick={() => {
                onSelectAccount(account.id);
                setOpen(false);
              }}
            >
              <span>{account.name}</span>
              <span className="mono">{account.id}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
