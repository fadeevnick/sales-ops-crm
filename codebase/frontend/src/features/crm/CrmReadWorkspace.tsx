import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CurrentUser } from "../../types/session";
import { AccountList } from "./AccountList";
import { WorkspaceHeader } from "./CrmWorkspaceChrome";
import {
  CrmCreateDrawer,
  SubmitForApprovalModal,
} from "./CrmWorkspaceModals";
import {
  FiltersRow,
  Kpis,
  OpportunityPreview,
  SavedViewsRow,
  WorkspaceOpportunityList,
} from "./CrmWorkspacePanels";
import {
  CrmAccountDetailScreen,
  CrmOpportunityDetailScreen,
} from "./CrmWorkspaceRoutesView";
import { buildAccountPath, buildOpportunityPath } from "./routes/paths";
import { useCrmWorkspaceController } from "./useCrmWorkspaceController";

type CrmReadWorkspaceProps = {
  currentUser: CurrentUser;
  routeMode?: "workspace" | "opportunity" | "account";
  routeOpportunityId?: string | null;
  routeAccountId?: string | null;
  workspaceTab?: "opportunities" | "accounts";
};

export function CrmReadWorkspace({
  currentUser,
  routeMode = "workspace",
  routeOpportunityId = null,
  routeAccountId = null,
  workspaceTab = "opportunities",
}: CrmReadWorkspaceProps) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showDetailFull = routeMode === "opportunity";
  const accountDetailId = routeMode === "account" ? routeAccountId : null;
  const {
    accountActivities,
    accounts,
    activities,
    activeFilters,
    activeSavedViewId,
    activityTitle,
    approvalFilter,
    canCreateSharedViews,
    closeWindow,
    contacts,
    crmTab,
    drawer,
    errorMessage,
    setErrorMessage,
    handleAccountCreated,
    handleApplySavedView,
    handleContactCreated,
    handleCreateActivity,
    handleCreateSavedView,
    handleDeleteSavedView,
    handleMoveStage,
    handleOpportunityCreated,
    handleReassignOwner,
    handleSubmitApproval,
    handleSubmitApprovalFromDetail,
    handleUpdateOpportunity,
    handleUpdateSavedView,
    hasActiveFilters,
    isActionSubmitting,
    isActivitySubmitting,
    isApprovalSubmitting,
    isLoadingDetail,
    isLoadingLists,
    isLoadingMoreAccounts,
    isLoadingMoreOpportunities,
    isSavedViewSubmitting,
    kpis,
    loadMoreAccounts,
    loadMoreOpportunities,
    opportunities,
    opportunityCustomFields,
    opportunityEmptyLabel,
    accountTotal,
    assignableOwners,
    opportunityTotal,
    recentlyCreatedIds,
    refreshLists,
    routeAccount,
    isLoadingRouteAccount,
    resetFilters,
    savedViewFormOpen,
    savedViewName,
    savedViewVisibilityScope,
    savedViews,
    scopeLabel,
    scopeLockLabel,
    selectedAccountId,
    selectedContactId,
    selectedListItem,
    selectedOpportunity,
    selectedOpportunityId,
    setActivityTitle,
    setActiveFilters,
    setActiveSavedViewId,
    setApprovalFilter,
    setCloseWindow,
    setCrmTab,
    setDrawer,
    setSavedViewFormOpen,
    setSavedViewName,
    setSavedViewVisibilityScope,
    setSelectedAccountId,
    setSelectedContactId,
    setSelectedOpportunityId,
    setSubmitJustification,
    setSubmitModalOpp,
    stageLabels,
    stageRequiredFields,
    stages,
    submitInlineActivity,
    submitJustification,
    submitModalOpp,
    toast,
    visibleOpportunities,
  } = useCrmWorkspaceController({
    currentUser,
    routeAccountId: accountDetailId,
    routeOpportunityId,
  });

  // Opportunities and Accounts are now separate top-level routes (/opportunities,
  // /accounts); the workspace tab is driven by the route's workspaceTab prop. Switching
  // also clears any stale workspace error (an opportunity-scope error must not leak onto
  // Accounts).
  useEffect(() => {
    if (routeMode === "workspace") {
      setCrmTab(workspaceTab);
      setErrorMessage(null);
    }
  }, [routeMode, workspaceTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (accountDetailId) {
    // The account is fetched directly by id (routeAccount), independent of the
    // paginated accounts list; fall back to the list if it happens to be there.
    const accountRecord =
      routeAccount?.id === accountDetailId
        ? routeAccount
        : accounts.find((account) => account.id === accountDetailId) ?? null;

    if (!accountRecord && isLoadingRouteAccount) {
      return (
        <div className="rep-workspace">
          <button className="rep-btn" onClick={() => navigate(-1)} type="button">← Back</button>
          <div className="rep-empty">Loading account…</div>
        </div>
      );
    }

    if (!accountRecord) {
      return (
        <div className="rep-workspace">
          <button className="rep-btn" onClick={() => navigate("/accounts")} type="button">← Back to accounts</button>
          <div className="rep-empty">
            Account <span className="mono">{accountDetailId}</span> could not be opened — it may be
            outside your visible scope or temporarily unavailable.
          </div>
        </div>
      );
    }

    return (
      <>
        <CrmAccountDetailScreen
          accountActivities={accountActivities}
          accountDetailId={accountDetailId}
          accounts={[accountRecord]}
          currentUser={currentUser}
          opportunities={opportunities}
          stages={stages}
          onBack={() => navigate(-1)}
          onNewOpportunity={() => {
            // Open the create-opportunity drawer in place, pre-filled with this
            // account — no navigation away to the opportunities list.
            setSelectedAccountId(accountDetailId);
            setDrawer({ kind: "create", mode: "opportunity" });
          }}
          onOpenOpportunity={(id) => {
            setSelectedOpportunityId(id);
            setCrmTab("opportunities");
            navigate(buildOpportunityPath(id));
          }}
        />

        {drawer && drawer.kind === "create" ? (
          <CrmCreateDrawer
            mode={drawer.mode}
            accounts={[accountRecord, ...accounts.filter((a) => a.id !== accountRecord.id)]}
            contacts={contacts}
            currentUser={currentUser}
            fields={opportunityCustomFields}
            selectedAccountId={selectedAccountId}
            selectedContactId={selectedContactId}
            stages={stages}
            onClose={() => setDrawer(null)}
            onAccountCreated={handleAccountCreated}
            onContactCreated={handleContactCreated}
            onOpportunityCreated={handleOpportunityCreated}
            onSelectAccount={(id) => {
              setSelectedAccountId(id);
              setSelectedContactId(null);
            }}
            onSelectContact={setSelectedContactId}
          />
        ) : null}
      </>
    );
  }

  if (showDetailFull) {
    // The opportunity detail is its own standalone page — it must NOT render the
    // whole list-workspace (header, tabs, KPIs, saved views, filters) above it.
    // The detail is fetched by id, so a stale list page can't swap it out.
    if (!selectedOpportunity && isLoadingDetail) {
      return (
        <div className="rep-workspace">
          <button className="rep-btn" onClick={() => navigate("/opportunities")} type="button">← Back to opportunities</button>
          <div className="rep-empty">Loading opportunity…</div>
        </div>
      );
    }

    if (!selectedOpportunity) {
      return (
        <div className="rep-workspace">
          <button className="rep-btn" onClick={() => navigate("/opportunities")} type="button">← Back to opportunities</button>
          <div className="rep-empty">
            Opportunity <span className="mono">{routeOpportunityId}</span> could not be opened — it may be
            outside your visible scope or temporarily unavailable.
          </div>
        </div>
      );
    }

    return (
      <div className="rep-workspace">
        <CrmOpportunityDetailScreen
          activities={activities}
          currentUser={currentUser}
          fields={opportunityCustomFields}
          isActionSubmitting={isActionSubmitting}
          isActivitySubmitting={isActivitySubmitting}
          isApprovalSubmitting={isApprovalSubmitting}
          isLoading={isLoadingDetail}
          opportunity={selectedOpportunity}
          reassignOwners={assignableOwners}
          stages={stages}
          stageRequiredFields={stageRequiredFields}
          onBack={() => navigate("/opportunities")}
          onCreateActivity={handleCreateActivity}
          onMoveStage={handleMoveStage}
          onReassignOwner={handleReassignOwner}
          onSubmitApproval={handleSubmitApprovalFromDetail}
          onUpdateOpportunity={handleUpdateOpportunity}
        />

        {toast ? (
          <div className="rep-toast">
            <span className="ok">✓</span>
            {toast}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rep-workspace crm-ws" data-screen-label="Sales Rep Workspace">
      <WorkspaceHeader
        currentUser={currentUser}
        crmTab={crmTab}
        scopeLabel={scopeLabel}
        todayLabel={todayLabel}
        onNewAccount={() => setDrawer({ kind: "create", mode: "account" })}
        onNewOpportunity={() => setDrawer({ kind: "create", mode: "opportunity" })}
      />

      {errorMessage ? (
        <div className="rep-form-error">
          <span>{errorMessage}</span>
          <button className="rep-btn rep-btn-ghost" disabled={isLoadingLists} onClick={() => void refreshLists()} type="button">
            Retry
          </button>
        </div>
      ) : null}
      {isLoadingLists ? <div className="rep-empty">Loading workspace…</div> : null}

      {crmTab === "accounts" ? (
        <div className="rep-accounts-view">
          <AccountList
            accounts={accounts}
            total={accountTotal}
            emptyLabel="No accounts in your scope"
            selectedAccountId={selectedAccountId}
            showOwner={currentUser.roleKey !== "sales_rep"}
            canLoadMore={accounts.length < accountTotal}
            isLoadingMore={isLoadingMoreAccounts}
            onLoadMore={() => void loadMoreAccounts()}
            onSelectAccount={(id) => {
              setSelectedAccountId(id);
              navigate(buildAccountPath(id));
            }}
          />
        </div>
      ) : (
        <div className="crm-ws-body">
          {/* Lead column — the hero: list with its own toolbar (saved views + filters). */}
          <div className="crm-ws-lead">
            <SavedViewsRow
              activeSavedViewId={activeSavedViewId}
              canCreateSharedViews={canCreateSharedViews}
              hasActiveFilters={hasActiveFilters}
              isSavedViewSubmitting={isSavedViewSubmitting}
              savedViewFormOpen={savedViewFormOpen}
              savedViewName={savedViewName}
              savedViewVisibilityScope={savedViewVisibilityScope}
              savedViews={savedViews}
              onApplySavedView={handleApplySavedView}
              onCreateSavedView={handleCreateSavedView}
              onDeleteSavedView={handleDeleteSavedView}
              onResetView={() => {
                setActiveSavedViewId(null);
                resetFilters();
              }}
              onSavedViewNameChange={setSavedViewName}
              onSavedViewVisibilityScopeChange={setSavedViewVisibilityScope}
              onToggleSavedViewForm={() => setSavedViewFormOpen((value) => !value)}
              onUpdateSavedView={handleUpdateSavedView}
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
              {hasActiveFilters && !filtersOpen ? (
                <span className="rep-filter-toggle-active">
                  <span>Filters active</span>
                  <button className="rep-btn rep-btn-ghost" onClick={resetFilters} type="button">
                    Clear all
                  </button>
                </span>
              ) : null}
            </div>

            {filtersOpen ? (
              <FiltersRow
                accounts={accounts}
                approvalFilter={approvalFilter}
                closeWindow={closeWindow}
                filters={activeFilters}
                hasActiveFilters={hasActiveFilters}
                stages={stages}
                scopeLockLabel={currentUser.roleKey === "sales_rep" ? "" : scopeLockLabel}
                onApprovalFilterChange={setApprovalFilter}
                onCloseWindowChange={setCloseWindow}
                onFiltersChange={(next) => {
                  setActiveFilters(next);
                  setActiveSavedViewId(null);
                }}
                onResetFilters={resetFilters}
              />
            ) : null}

            <WorkspaceOpportunityList
              emptyLabel={opportunityEmptyLabel}
              hasActiveFilters={hasActiveFilters}
              opportunities={visibleOpportunities}
              recentlyCreatedIds={recentlyCreatedIds}
              selectedOpportunityId={selectedOpportunityId}
              stageLabels={stageLabels}
              stages={stages}
              totalRows={opportunityTotal}
              canLoadMore={opportunities.length < opportunityTotal}
              isLoadingMore={isLoadingMoreOpportunities}
              onClearFilters={resetFilters}
              onLoadMore={() => void loadMoreOpportunities()}
              onSelectOpportunity={(id) => {
                setSelectedOpportunityId(id);
                const opp = opportunities.find((o) => o.id === id);
                if (opp) setSelectedAccountId(opp.accountId);
              }}
            />
          </div>

          {/* Rail — secondary: summary KPIs above the contextual preview. */}
          <aside className="crm-ws-rail">
            <Kpis
              kpiOpen={kpis.open}
              kpiPipeline={kpis.pipeline}
              kpiPending={kpis.pendingApprovals}
              kpiClosing={kpis.closingThisMonth}
            />
            <OpportunityPreview
              activities={activities}
              activityTitle={activityTitle}
              customFields={opportunityCustomFields}
              isActivitySubmitting={isActivitySubmitting}
              isLoadingDetail={isLoadingDetail}
              listItem={selectedListItem}
              opportunity={selectedOpportunity}
              stageLabels={stageLabels}
              stages={stages}
              onActivityTitleChange={setActivityTitle}
              onOpenAccount={(id) => navigate(buildAccountPath(id))}
              onOpenDetail={() => selectedOpportunityId && navigate(buildOpportunityPath(selectedOpportunityId))}
              onSubmitActivity={submitInlineActivity}
              onSubmitApproval={() => {
                if (selectedListItem) setSubmitModalOpp(selectedListItem);
              }}
              showOwner={currentUser.roleKey !== "sales_rep"}
            />
          </aside>
        </div>
      )}

      {drawer && drawer.kind === "create" ? (
        <CrmCreateDrawer
          mode={drawer.mode}
          accounts={accounts}
          contacts={contacts}
          currentUser={currentUser}
          fields={opportunityCustomFields}
          selectedAccountId={selectedAccountId}
          selectedContactId={selectedContactId}
          stages={stages}
          onClose={() => setDrawer(null)}
          onAccountCreated={handleAccountCreated}
          onContactCreated={handleContactCreated}
          onOpportunityCreated={handleOpportunityCreated}
          onSelectAccount={(id) => {
            setSelectedAccountId(id);
            setSelectedContactId(null);
          }}
          onSelectContact={setSelectedContactId}
        />
      ) : null}

      {submitModalOpp ? (
        <SubmitForApprovalModal
          opp={submitModalOpp}
          justification={submitJustification}
          isApprovalSubmitting={isApprovalSubmitting}
          stageLabels={stageLabels}
          onClose={() => {
            setSubmitModalOpp(null);
            setSubmitJustification("");
          }}
          onJustificationChange={setSubmitJustification}
          onSubmit={() => void handleSubmitApproval()}
        />
      ) : null}

      {toast ? (
        <div className="rep-toast">
          <span className="ok">✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
