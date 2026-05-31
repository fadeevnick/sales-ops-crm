import { useState } from "react";
import type { CurrentUser } from "../../types/session";
import {
  InboxFilters,
  InboxHeader,
  InboxQueuePanel,
  InboxSavedViews,
} from "./ApproverInboxLayoutSections";
import { DecisionModal, DetailPreview } from "./ApproverInboxSections";
import { useApproverInboxController } from "./useApproverInboxController";

type ApproverInboxProps = {
  currentUser: CurrentUser;
};

export function ApproverInbox({ currentUser }: ApproverInboxProps) {
  const {
    items,
    selectedRequestId,
    setSelectedRequestId,
    detail,
    isLoading,
    isDetailLoading,
    isDeciding,
    errorMessage,
    detailErrorMessage,
    toast,
    view,
    setView,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    decisionKind,
    decisionComment,
    setDecisionComment,
    decisionTouched,
    setDecisionTouched,
    loadInbox,
    viewCounts,
    requestTypes,
    filteredItems,
    activeStep,
    isMineActive,
    isLockedForMe,
    isDecided,
    openDecision,
    closeDecision,
    submitDecision,
    selectedItem,
    snapshot,
    resetFilters,
    filtersActive,
  } = useApproverInboxController(currentUser);

  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section className="rep-workspace appr-workspace">
      <InboxHeader
        isLoading={isLoading}
        onRefresh={() => void loadInbox(selectedRequestId)}
      />

      {errorMessage ? <div className="appr-error">{errorMessage}</div> : null}

      <InboxSavedViews
        view={view}
        setView={setView}
        viewCounts={viewCounts}
        filtersActive={filtersActive}
        resetFilters={resetFilters}
      />

      <div className="rep-filter-toggle">
        <button
          className="rep-btn rep-btn-ghost"
          onClick={() => setFiltersOpen((value) => !value)}
          aria-expanded={filtersOpen}
          type="button"
        >
          {filtersOpen ? "Hide filters" : "Show filters"}
        </button>
        {filtersActive && !filtersOpen ? (
          <span className="rep-filter-toggle-active">
            <span>Filters active</span>
            <button className="rep-btn rep-btn-ghost" onClick={resetFilters} type="button">
              Clear all
            </button>
          </span>
        ) : null}
      </div>

      {filtersOpen ? (
        <InboxFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          requestTypes={requestTypes}
          currentUser={currentUser}
        />
      ) : null}

      <div className="rep-grid appr-grid">
        <InboxQueuePanel
          items={items}
          filteredItems={filteredItems}
          selectedRequestId={selectedRequestId}
          setSelectedRequestId={setSelectedRequestId}
          currentUser={currentUser}
          isLoading={isLoading}
          filtersActive={filtersActive}
          resetFilters={resetFilters}
        />

        <div className="rep-panel rep-preview appr-preview">
          {!selectedItem && !isDetailLoading ? (
            <div className="rep-empty">
              <div className="icon">AP</div>
              <div className="ttl">Pick a request from the queue</div>
              <div>The preview shows snapshot, justification, chain and history.</div>
            </div>
          ) : null}

          {isDetailLoading ? <div className="rep-empty">Loading approval detail…</div> : null}

          {detailErrorMessage ? <div className="appr-error appr-error-inline">{detailErrorMessage}</div> : null}

          {detail && !isDetailLoading ? (
            <DetailPreview
              detail={detail}
              snapshot={snapshot}
              activeStep={activeStep}
              isMineActive={isMineActive}
              isLockedForMe={isLockedForMe}
              isDecided={isDecided}
              isDeciding={isDeciding}
              currentUser={currentUser}
              onDecide={openDecision}
            />
          ) : null}
        </div>
      </div>

      {decisionKind && detail ? (
        <DecisionModal
          kind={decisionKind}
          detail={detail}
          snapshot={snapshot}
          comment={decisionComment}
          touched={decisionTouched}
          isSubmitting={isDeciding}
          onCommentChange={(value) => setDecisionComment(value)}
          onTouch={() => setDecisionTouched(true)}
          onClose={closeDecision}
          onConfirm={submitDecision}
        />
      ) : null}

      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </section>
  );
}
