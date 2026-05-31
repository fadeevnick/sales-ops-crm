import type { AccountListItem } from "../../types/crm";

type AccountListProps = {
  accounts: AccountListItem[];
  total: number;
  emptyLabel: string;
  selectedAccountId: string | null;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  showOwner: boolean;
  onSelectAccount: (accountId: string) => void;
  onLoadMore: () => void;
};

export function AccountList({
  accounts,
  total,
  emptyLabel,
  selectedAccountId,
  canLoadMore,
  isLoadingMore,
  showOwner,
  onSelectAccount,
  onLoadMore,
}: AccountListProps) {
  return (
    <section className="crm-section">
      <div className="section-heading">
        <h3>Accounts</h3>
        <span>{total > accounts.length ? `${accounts.length} of ${total}` : accounts.length}</span>
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
              {showOwner ? <span>{account.ownerName}</span> : null}
            </div>
            <span>{account.openOpportunityCount}</span>
          </button>
        ))}
        {accounts.length === 0 ? <div className="empty-row">{emptyLabel}</div> : null}
      </div>
      {canLoadMore ? (
        <div className="rep-load-more">
          <button className="rep-btn" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading…" : `Load more — showing ${accounts.length} of ${total}`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
