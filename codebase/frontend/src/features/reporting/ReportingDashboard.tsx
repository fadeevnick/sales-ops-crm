import type { CurrentUser } from "../../types/session";
import {
  ReportingExecutiveView,
  ReportingMetricsView,
  ReportingPipelineView,
} from "./ReportingDashboardViews";
import { useReportingDashboardController } from "./useReportingDashboardController";

type ReportingDashboardProps = {
  currentUser: CurrentUser;
  onNavigateToApprovals?: () => void;
};

export function ReportingDashboard({ currentUser, onNavigateToApprovals }: ReportingDashboardProps) {
  const {
    activeTab,
    canRefresh,
    metricsViewLoading,
    pipelineError,
    pipelineLoading,
    pipelineRows,
    pipelineTotal,
    isLoadingMorePipeline,
    loadMorePipeline,
    teamMembers,
    projection,
    stageBreakdown,
    stageLabels,
    forecastByMonth,
    isRefreshing,
    isDrillDownLoading,
    drillDown,
    drillDownSelection,
    errorMessage,
    drillDownErrorMessage,
    message,
    execStages,
    execDrillOpps,
    execApprovalQueues,
    execExceptionTypes,
    execClosedQtd,
    execProjectionHealth,
    handleRefresh,
    handleExecRefresh,
    openDrillDown,
    closeDrillDown,
  } = useReportingDashboardController(currentUser);

  const tabTitle =
    activeTab === "pipeline"
      ? "Team Pipeline"
      : activeTab === "executive"
        ? "Executive Dashboard"
        : "Aggregate Metrics";

  return (
    <section className="reporting-workspace">
      <div className="workspace-header reporting-workspace-header">
        <div>
          <span>Reporting</span>
          <h2>{tabTitle}</h2>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        <ReportingPipelineView
          currentUser={currentUser}
          pipelineError={pipelineError}
          pipelineLoading={pipelineLoading}
          pipelineRows={pipelineRows}
          pipelineTotal={pipelineTotal}
          isLoadingMorePipeline={isLoadingMorePipeline}
          onLoadMorePipeline={loadMorePipeline}
          teamMembers={teamMembers}
        />
      ) : null}

      {activeTab === "executive" ? (
        <ReportingExecutiveView
          currentUser={currentUser}
          errorMessage={errorMessage}
          execApprovalQueues={execApprovalQueues}
          execExceptionTypes={execExceptionTypes}
          execClosedQtd={execClosedQtd}
          execDrillOpps={execDrillOpps}
          execProjectionHealth={execProjectionHealth}
          execStages={execStages}
          isLoading={metricsViewLoading}
          onNavigateToApprovals={onNavigateToApprovals}
          onRefresh={handleExecRefresh}
          pipelineLoading={pipelineLoading}
        />
      ) : null}

      {activeTab === "metrics" ? (
        <ReportingMetricsView
          canRefresh={canRefresh}
          drillDown={drillDown}
          drillDownErrorMessage={drillDownErrorMessage}
          drillDownSelection={drillDownSelection}
          errorMessage={errorMessage}
          forecastByMonth={forecastByMonth}
          isDrillDownLoading={isDrillDownLoading}
          isLoading={metricsViewLoading}
          isRefreshing={isRefreshing}
          message={message}
          onCloseDrillDown={closeDrillDown}
          onOpenDrillDown={(selection) => void openDrillDown(selection)}
          onRefresh={() => void handleRefresh()}
          projection={projection}
          stageBreakdown={stageBreakdown}
          stageLabels={stageLabels}
        />
      ) : null}
    </section>
  );
}
