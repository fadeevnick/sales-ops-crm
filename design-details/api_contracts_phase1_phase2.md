# API Contracts — Phase 1 and Phase 2

Документ фиксирует initial API boundary для ближайших implementation phases.

Цель:

- не писать backend and frontend "вслепую";
- заранее определить minimal request/response shapes;
- удержать separation between shell bootstrap and later CRM domain growth.

Это не полный API reference. Это implementation-ready baseline для:

- Phase 1 — tenant, auth, roles, workspace shell
- Phase 2 — core CRM records and pipeline

## 1. Phase 1 — Shell and Identity APIs

### `GET /healthz`

Purpose:

- process health check

Response `200`

```json
{
  "status": "ok"
}
```

### `GET /readyz`

Purpose:

- runtime readiness including DB connectivity

Response `200`

```json
{
  "status": "ready",
  "dependencies": {
    "postgres": "ok"
  }
}
```

Response `503`

```json
{
  "status": "not_ready",
  "dependencies": {
    "postgres": "down"
  },
  "error": "database check failed"
}
```

### `GET /api/session/demo-users`

Purpose:

- temporary Phase 0 bootstrap list of seeded identities

Response `200`

```json
[
  {
    "userId": "user_anna",
    "email": "anna@orion.local",
    "displayName": "Anna Petrova",
    "roleKey": "sales_rep",
    "roleName": "Sales Representative",
    "tenantId": "tenant_orion",
    "tenantName": "Orion Industrial"
  }
]
```

### `POST /api/session/demo-login`

Purpose:

- temporary Phase 0 / early Phase 1 demo login path

Request

```json
{
  "email": "anna@orion.local"
}
```

Response `200`

```json
{
  "userId": "user_anna",
  "email": "anna@orion.local",
  "displayName": "Anna Petrova",
  "roleKey": "sales_rep",
  "roleName": "Sales Representative",
  "tenantId": "tenant_orion",
  "tenantName": "Orion Industrial",
  "tokenHint": "user_anna"
}
```

Response `401`

```json
{
  "error": "unauthorized",
  "message": "Unknown demo user"
}
```

### `GET /api/me`

Purpose:

- return current tenant/user/role context and visible shell modules

Temporary auth input:

- `X-Demo-User-Id` header

Response `200`

```json
{
  "userId": "user_anna",
  "email": "anna@orion.local",
  "displayName": "Anna Petrova",
  "roleKey": "sales_rep",
  "roleName": "Sales Representative",
  "tenantId": "tenant_orion",
  "tenantName": "Orion Industrial",
  "modules": ["Opportunities", "Accounts", "Contacts", "Activities", "Approvals"]
}
```

## 2. Phase 2 — Core CRM Domain APIs

Rule:

- all Phase 2 endpoints are tenant-scoped by current authenticated user context;
- no explicit `tenantId` accepted from client in write requests;
- role/scope enforcement happens server-side.

## 2.1 Accounts

### `GET /api/accounts`

Purpose:

- list accounts in current visible scope

Query params:

- `q`
- `ownerId`
- `page`
- `pageSize`

Response `200`

```json
{
  "items": [
    {
      "id": "acc_001",
      "name": "Titan Plastics",
      "ownerId": "user_anna",
      "ownerName": "Anna Petrova",
      "openOpportunityCount": 2
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### `POST /api/accounts`

Request

```json
{
  "name": "Titan Plastics",
  "website": "titan.example",
  "ownerId": "user_anna"
}
```

Response `201`

```json
{
  "id": "acc_001"
}
```

## 2.2 Contacts

### `GET /api/contacts`

Query params:

- `accountId`
- `ownerId`
- `q`

Response `200`

```json
{
  "items": [
    {
      "id": "con_001",
      "accountId": "acc_001",
      "accountName": "Titan Plastics",
      "fullName": "Elena Sidorova",
      "email": "elena@titan.example"
    }
  ]
}
```

### `POST /api/contacts`

Request

```json
{
  "accountId": "acc_001",
  "fullName": "Elena Sidorova",
  "email": "elena@titan.example",
  "phone": "+1-555-1000"
}
```

Response `201`

```json
{
  "id": "con_001"
}
```

## 2.3 Opportunities

### `GET /api/opportunities`

Purpose:

- list opportunities in owner/team scope

Query params:

- `stage`
- `ownerId`
- `accountId`
- `q`
- `page`
- `pageSize`

Response `200`

```json
{
  "items": [
    {
      "id": "opp_001",
      "title": "Titan Plastics Expansion",
      "accountId": "acc_001",
      "accountName": "Titan Plastics",
      "ownerId": "user_anna",
      "ownerName": "Anna Petrova",
      "stageKey": "negotiation",
      "expectedAmount": 148000,
      "closeDate": "2026-06-27",
      "approvalState": "none"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### `POST /api/opportunities`

Request

```json
{
  "title": "Titan Plastics Expansion",
  "accountId": "acc_001",
  "primaryContactId": "con_001",
  "ownerId": "user_anna",
  "stageKey": "qualification",
  "expectedAmount": 148000,
  "closeDate": "2026-06-27"
}
```

Response `201`

```json
{
  "id": "opp_001"
}
```

### `GET /api/opportunities/{opportunityId}`

Purpose:

- detail view for opportunity workspace

Response `200`

```json
{
  "id": "opp_001",
  "title": "Titan Plastics Expansion",
  "account": {
    "id": "acc_001",
    "name": "Titan Plastics"
  },
  "primaryContact": {
    "id": "con_001",
    "fullName": "Elena Sidorova"
  },
  "owner": {
    "id": "user_anna",
    "displayName": "Anna Petrova"
  },
  "stageKey": "negotiation",
  "expectedAmount": 148000,
  "closeDate": "2026-06-27",
  "approvalState": "none",
  "timeline": []
}
```

### `PATCH /api/opportunities/{opportunityId}`

Purpose:

- edit allowed mutable fields

Request

```json
{
  "title": "Titan Plastics Expansion",
  "expectedAmount": 152000,
  "closeDate": "2026-06-29"
}
```

Response `200`

```json
{
  "id": "opp_001",
  "updated": true
}
```

### `POST /api/opportunities/{opportunityId}/move-stage`

Purpose:

- stage transition via explicit command, not generic field patch

Request

```json
{
  "targetStageKey": "negotiation"
}
```

Response `200`

```json
{
  "id": "opp_001",
  "stageKey": "negotiation",
  "updated": true
}
```

Validation failure `422`

```json
{
  "error": "validation_failed",
  "message": "Missing required fields for target stage",
  "details": [
    {
      "field": "paymentRiskLevel",
      "reason": "required_for_stage"
    }
  ]
}
```

### `POST /api/opportunities/{opportunityId}/reassign-owner`

Purpose:

- explicit reassignment command

Request

```json
{
  "newOwnerId": "user_michael"
}
```

Response `200`

```json
{
  "id": "opp_001",
  "ownerId": "user_michael",
  "updated": true
}
```

## 2.4 Activities

### `GET /api/opportunities/{opportunityId}/activities`

Response `200`

```json
{
  "items": [
    {
      "id": "act_001",
      "type": "task",
      "title": "Call procurement lead",
      "dueDate": "2026-05-10",
      "status": "open"
    }
  ]
}
```

### `POST /api/opportunities/{opportunityId}/activities`

Request

```json
{
  "type": "task",
  "title": "Call procurement lead",
  "dueDate": "2026-05-10"
}
```

Response `201`

```json
{
  "id": "act_001"
}
```

## 3. Common Error Shape

Recommended baseline error contract:

```json
{
  "error": "validation_failed",
  "message": "Human-readable summary",
  "details": []
}
```

Common `error` values:

- `unauthorized`
- `forbidden`
- `not_found`
- `validation_failed`
- `conflict`

## 4. Implementation Notes

- Explicit command endpoints are preferred for business actions like `move-stage` and `reassign-owner`.
- Generic CRUD patching should not become the only mechanism for business state changes.
- Opportunity detail response is intentionally small at Phase 2 and should expand later with approvals, metadata and richer audit.
