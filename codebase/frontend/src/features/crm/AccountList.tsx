import type { AccountListItem } from "../../types/crm";

type AccountListProps = {
  accounts: AccountListItem[];
  emptyLabel: string;
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
};

export function AccountList({
  accounts,
  emptyLabel,
  selectedAccountId,
  onSelectAccount,
}: AccountListProps) {
  return (
    <section className="crm-section">
      <div className="section-heading">
        <h3>Accounts</h3>
        <span>{accounts.length}</span>
      </div>
      <div className="record-list">
        {accounts.map((account) => (
          <button
            className={account.id === selectedAccountId ? "record-row selected" : "record-row"}
            key={account.id}
            onClick={() => onSelectAccount(account.id)}
            type="button"
          >
            <div>
              <strong>{account.name}</strong>
              <span>{account.ownerName}</span>
            </div>
            <span>{account.openOpportunityCount}</span>
          </button>
        ))}
        {accounts.length === 0 ? <div className="empty-row">{emptyLabel}</div> : null}
      </div>
    </section>
  );
}
