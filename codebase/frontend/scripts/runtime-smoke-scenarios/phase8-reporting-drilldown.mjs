export default async function phase8ReportingDrillDownSmoke({ assert, requestJson }) {
  const revops = "user_irina";
  const manager = "user_michael";
  const rep = "user_anna";
  const stamp = Date.now();
  const visibleTitle = `Phase 8 Drilldown Visible ${stamp}`;
  const hiddenTitle = `Phase 8 Drilldown Hidden ${stamp}`;
  const closeDate = "2027-01-15";
  const closeMonth = "2027-01";

  const visible = await createOpportunityFixture({
    requestJson,
    revops,
    stamp: `${stamp}-visible`,
    ownerId: rep,
    title: visibleTitle,
    closeDate,
  });
  const hidden = await createOpportunityFixture({
    requestJson,
    revops,
    stamp: `${stamp}-hidden`,
    ownerId: revops,
    title: hiddenTitle,
    closeDate,
  });

  const revopsStage = await requestJson("/api/reporting/dashboard/drill-down?dimension=stage&value=qualification&limit=100", {
    userId: revops,
  });
  assert(revopsStage.status === 200, "RevOps stage drill-down failed", revopsStage);
  assert(
    revopsStage.json.items.some((item) => item.id === visible.opportunityId),
    "RevOps stage drill-down missing visible fixture",
    revopsStage.json,
  );
  assert(
    revopsStage.json.items.some((item) => item.id === hidden.opportunityId),
    "RevOps stage drill-down missing hidden fixture",
    revopsStage.json,
  );

  const revopsForecast = await requestJson(`/api/reporting/dashboard/drill-down?dimension=forecastMonth&value=${closeMonth}&limit=100`, {
    userId: revops,
  });
  assert(revopsForecast.status === 200, "RevOps forecast-month drill-down failed", revopsForecast);
  assert(
    revopsForecast.json.items.some((item) => item.id === visible.opportunityId),
    "RevOps forecast drill-down missing visible fixture",
    revopsForecast.json,
  );

  const managerStage = await requestJson("/api/reporting/dashboard/drill-down?dimension=stage&value=qualification&limit=100", {
    userId: manager,
  });
  assert(managerStage.status === 200, "Sales Manager stage drill-down failed", managerStage);
  assert(
    managerStage.json.items.some((item) => item.id === visible.opportunityId),
    "Sales Manager stage drill-down missing team-visible fixture",
    managerStage.json,
  );
  assert(
    !managerStage.json.items.some((item) => item.id === hidden.opportunityId),
    "Sales Manager stage drill-down leaked non-team fixture",
    managerStage.json,
  );

  const repStage = await requestJson("/api/reporting/dashboard/drill-down?dimension=stage&value=qualification", {
    userId: rep,
  });
  assert(repStage.status === 403, "Sales Rep drill-down should be forbidden", repStage);

  const invalid = await requestJson("/api/reporting/dashboard/drill-down?dimension=owner&value=user_anna", {
    userId: revops,
  });
  assert(invalid.status === 422, "Invalid drill-down dimension should return validation failure", invalid);

  return {
    stamp,
    visibleOpportunityId: visible.opportunityId,
    hiddenOpportunityId: hidden.opportunityId,
    revopsStageCount: revopsStage.json.items.length,
    revopsForecastCount: revopsForecast.json.items.length,
    managerStageCount: managerStage.json.items.length,
    forbidden: {
      salesRepDrillDown: repStage.status,
    },
  };
}

async function createOpportunityFixture({ requestJson, revops, stamp, ownerId, title, closeDate }) {
  const account = await requestJson("/api/accounts", {
    method: "POST",
    userId: revops,
    body: {
      name: `Phase 8 Drilldown Account ${stamp}`,
      ownerId,
      website: "https://phase8-drilldown.example",
    },
  });
  if (account.status !== 201) {
    throw new Error(`Drill-down fixture account failed: ${JSON.stringify(account, null, 2)}`);
  }

  const opportunity = await requestJson("/api/opportunities", {
    method: "POST",
    userId: revops,
    body: {
      accountId: account.json.id,
      ownerId,
      title,
      stageKey: "qualification",
      expectedAmount: 64567.89,
      closeDate,
    },
  });
  if (opportunity.status !== 201) {
    throw new Error(`Drill-down fixture opportunity failed: ${JSON.stringify(opportunity, null, 2)}`);
  }

  return {
    accountId: account.json.id,
    opportunityId: opportunity.json.id,
  };
}
