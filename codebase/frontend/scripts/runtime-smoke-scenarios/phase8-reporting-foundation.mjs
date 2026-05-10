export default async function phase8ReportingFoundationSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const manager = "user_michael";
  const rep = "user_anna";
  const stamp = Date.now();
  const accountName = `Phase 8 Reporting Account ${stamp}`;
  const opportunityTitle = `Phase 8 Reporting Opportunity ${stamp}`;
  const expectedAmount = 98765.43;
  const closeDate = "2026-12-18";
  const closeMonth = "2026-12";

  const repReadBeforeRefresh = await requestJson("/api/reporting/dashboard", { userId: rep });
  assert(repReadBeforeRefresh.status === 403, "Sales Rep dashboard read should be forbidden", repReadBeforeRefresh);
  const repRefresh = await requestJson("/api/reporting/dashboard/refresh", { method: "POST", userId: rep });
  assert(repRefresh.status === 403, "Sales Rep dashboard refresh should be forbidden", repRefresh);
  const managerRefresh = await requestJson("/api/reporting/dashboard/refresh", { method: "POST", userId: manager });
  assert(managerRefresh.status === 403, "Sales Manager dashboard refresh should be forbidden", managerRefresh);

  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: accountName,
      website: "https://phase8-reporting.example",
    },
  });
  assert(account.status === 201, "Reporting fixture account creation failed", account);

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      title: opportunityTitle,
      stageKey: "qualification",
      expectedAmount,
      closeDate,
    },
  });
  assert(opportunity.status === 201, "Reporting fixture opportunity creation failed", opportunity);

  const refresh = await requestJson("/api/reporting/dashboard/refresh", {
    method: "POST",
    userId: revops,
  });
  assert(refresh.status === 200, "RevOps reporting refresh failed", refresh);
  assert(refresh.json.projection.refreshedByUserId === revops, "Projection refresher mismatch", refresh.json);
  assert(
    refresh.json.projection.sourceCounters.opportunityCount >= 1,
    "Projection opportunity source counter missing",
    refresh.json.projection.sourceCounters,
  );
  assert(
    refresh.json.projection.metrics.openPipelineCount >= 1,
    "Projection open pipeline count missing",
    refresh.json.projection.metrics,
  );
  assert(
    Number(refresh.json.projection.metrics.openPipelineAmount) >= expectedAmount,
    "Projection open pipeline amount missing fixture amount",
    refresh.json.projection.metrics,
  );

  const qualificationStage = refresh.json.projection.metrics.stageBreakdown.find((stage) => stage.stageKey === "qualification");
  assert(qualificationStage, "Qualification stage metric missing", refresh.json.projection.metrics.stageBreakdown);
  assert(qualificationStage.opportunityCount >= 1, "Qualification stage count missing", qualificationStage);
  assert(Number(qualificationStage.expectedAmount) >= expectedAmount, "Qualification stage amount missing fixture amount", qualificationStage);

  const forecastMonth = refresh.json.projection.metrics.forecastByMonth.find((item) => item.closeMonth === closeMonth);
  assert(forecastMonth, "Forecast month metric missing", refresh.json.projection.metrics.forecastByMonth);
  assert(forecastMonth.opportunityCount >= 1, "Forecast month count missing", forecastMonth);
  assert(Number(forecastMonth.expectedAmount) >= expectedAmount, "Forecast month amount missing fixture amount", forecastMonth);

  assert(
    typeof refresh.json.projection.metrics.approvalBacklog.pendingRequests === "number",
    "Approval backlog pendingRequests missing",
    refresh.json.projection.metrics.approvalBacklog,
  );
  assert(
    typeof refresh.json.projection.metrics.approvalBacklog.activeSteps === "number",
    "Approval backlog activeSteps missing",
    refresh.json.projection.metrics.approvalBacklog,
  );

  const revopsRead = await requestJson("/api/reporting/dashboard", { userId: revops });
  assert(revopsRead.status === 200, "RevOps dashboard read failed", revopsRead);
  assert(revopsRead.json.refreshedAt === refresh.json.projection.refreshedAt, "RevOps read did not use stored projection", {
    refresh: refresh.json.projection.refreshedAt,
    read: revopsRead.json.refreshedAt,
  });

  const managerRead = await requestJson("/api/reporting/dashboard", { userId: manager });
  assert(managerRead.status === 200, "Sales Manager dashboard read failed", managerRead);
  assert(managerRead.json.refreshedAt === refresh.json.projection.refreshedAt, "Manager read did not use stored projection", {
    refresh: refresh.json.projection.refreshedAt,
    read: managerRead.json.refreshedAt,
  });

  return {
    stamp,
    accountId: account.json.id,
    opportunityId: opportunity.json.id,
    refreshedAt: refresh.json.projection.refreshedAt,
    openPipelineCount: refresh.json.projection.metrics.openPipelineCount,
    openPipelineAmount: refresh.json.projection.metrics.openPipelineAmount,
    qualificationStage,
    forecastMonth,
    approvalBacklog: refresh.json.projection.metrics.approvalBacklog,
    forbidden: {
      salesRepRead: 403,
      salesRepRefresh: 403,
      salesManagerRefresh: 403,
    },
  };
}
