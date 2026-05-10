# Runtime Checklists

Runtime verification checklists for:

```text
Phase 0
Phase 1
Phase 2
```

Цель:

- заранее зафиксировать exact runtime proof expectations;
- сделать будущую verification disciplined and repeatable;
- не смешивать runtime proof с implementation guesswork.

## 1. Phase 0 Runtime Checklist

### Startup

```bash
cd codebase
docker compose up --build
```

### Checks

```bash
curl -f http://localhost:8080/healthz
curl -f http://localhost:8080/readyz
curl -s http://localhost:8080/api/session/demo-users
```

### Browser checks

- open `http://localhost:5173`
- confirm demo users load
- login as seeded user
- confirm workspace shell appears

### Expected results

- db/backend/frontend all start
- migrations apply
- health/readiness succeed
- demo login works

## 2. Phase 1 Runtime Checklist

### Shell checks

- login as `sales_rep`
- login as `sales_manager`
- login as `revops_admin`
- verify module shell differs by role

### Session checks

- refresh page after login
- confirm session restore
- logout
- confirm session cleared

### Error checks

- simulate invalid stored session
- confirm app does not remain in authenticated shell

### Expected results

- role-aware shell proven in runtime
- invalid session handling explicit
- tenant/user identity visible and correct

## 3. Phase 2 Runtime Checklist

### CRM flow checks

- create account
- create contact
- create opportunity
- open opportunity detail
- add activity
- move stage

### Access checks

- manager sees team pipeline
- rep cannot perform forbidden reassignment action

### Validation checks

- attempt stage move with missing required data
- confirm validation failure path

### Expected results

- core CRM loop works end-to-end
- access baseline holds in runtime
- stage transition rules are real, not only coded assumptions
