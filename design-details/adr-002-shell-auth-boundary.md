# ADR-002 Shell/Auth Boundary

Статус:

```text
drafted
```

Дата:

```text
2026-05-07
```

## 1. Context

Для проекта уже существует `Phase 0` bootstrap shell:

- temporary demo login flow;
- `GET /api/me`;
- seeded users/roles/tenants;
- frontend workspace shell.

Но этот baseline пока ещё не отделяет:

- временную local-dev auth механику;
- стабильный session/identity contract;
- tenant resolution boundary;
- role-to-module visibility policy.

Если не зафиксировать boundary сейчас, дальше почти неизбежно появятся:

- ad hoc session handling в контроллерах;
- дублирование role logic между backend и frontend;
- implicit tenant context, завязанный на client-side assumptions;
- путаница между `demo auth` и `real application contract`.

Для `Phase 1` нам не нужен production IAM, но нужен честный и долгоживущий shell/auth contract, на который смогут опираться `Phase 2+`.

## 2. Decision

Для MVP shell/auth строится как `stable application contract` с временной `demo auth transport`.

Это значит:

1. `GET /api/me` является главным source of truth для текущего user/tenant/role/shell context.
2. tenant context всегда определяется server-side, а не передаётся клиентом как business input.
3. role-to-module visibility вычисляется на backend как policy, а не собирается независимо на frontend.
4. временный demo login endpoint допустим, но он считается только bootstrap mechanism, а не архитектурным центром auth model.
5. frontend хранит только session marker, но не владеет authority over tenant/role/module scope.

Иными словами:

```text
demo auth may remain temporary,
but shell/session contract must already be stable
```

## 3. Stable Contract for Phase 1+

### 3.1 Stable backend responsibilities

Backend обязан стабильно отвечать за:

- session resolution;
- current user resolution;
- tenant resolution;
- current primary role resolution in MVP scope;
- shell module visibility;
- `401/403` semantics.

### 3.2 Stable frontend responsibilities

Frontend обязан:

- инициировать login flow в local-dev form;
- хранить session marker;
- восстанавливать session on refresh;
- показывать logged-out / loading / authenticated / unauthorized states;
- рендерить shell из backend response.

Frontend не должен:

- вычислять tenant scope самостоятельно;
- доверять user-entered `tenantId`;
- быть source of truth для role/module permissions.

### 3.3 Stable API contract

Следующие API считаются стабильной shell boundary:

- `GET /healthz`
- `GET /readyz`
- `GET /api/me`

Следующие API считаются временным bootstrap path:

- `GET /api/session/demo-users`
- `POST /api/session/demo-login`

Эти demo endpoints могут позже исчезнуть или быть заменены, но `GET /api/me` и semantics around it должны остаться стабильными.

## 4. Identity and Session Boundary

### 4.1 Current principle

Session marker может быть временным и простым, но resolved identity context должен быть полным и серверным.

### 4.2 Boundary rules

1. Клиент не передаёт `tenantId` в write APIs как authority signal.
2. Клиент не передаёт `roleKey` как authority signal.
3. Session marker сам по себе не считается user context, пока backend его не разрешил.
4. `GET /api/me` возвращает уже разрешённый контекст:
   - user
   - tenant
   - primary role
   - visible shell modules
5. Unauthorized и forbidden flows должны различаться уже на shell-level.

### 4.3 MVP simplification

В MVP допускается:

- одна primary role на shell context;
- простой local-dev session marker;
- отсутствие real SSO/OIDC integration;
- seeded users instead of full identity lifecycle.

Но не допускается:

- смешивать transport detail с domain auth contract;
- hardcode role logic в нескольких местах сразу;
- строить Phase 2+ поверх client-trusted tenant assumptions.

## 5. Shell Module Visibility Boundary

### 5.1 Decision

Shell module visibility определяется backend policy layer.

### 5.2 Why

- одни и те же роли потом будут влиять не только на navigation, но и на query scope;
- если frontend сам вычисляет modules, появится drift между shell and API enforcement;
- approver/admin/manager distinctions должны оставаться централизованными.

### 5.3 Consequence

Frontend может использовать modules list для rendering, но не как substitute for API authorization.

## 6. Error Contract Boundary

Для shell/auth flow уже на `Phase 1` требуется единая error semantics.

### 6.1 `401 unauthorized`

Используется когда:

- session marker отсутствует;
- session marker невалиден;
- user не найден;
- user disabled;
- current session cannot be resolved.

### 6.2 `403 forbidden`

Используется когда:

- session валидна;
- user resolved;
- но операция или module entrypoint недоступны для resolved role/scope.

### 6.3 Consequence

`GET /api/me`, future module entrypoints и frontend shell states должны опираться на эту разницу, а не сводить всё к generic “error”.

## 7. What Remains Temporary

Следующие вещи временные и могут быть заменены позже без смены архитектурного контракта:

- `X-Demo-User-Id`-style session marker;
- `demo-users` listing endpoint;
- `demo-login` endpoint;
- seeded local users as login source;
- permissive dev security shell.

Важно:

временность этих механизмов не должна протекать в business-facing API contract.

## 8. Rejected Alternatives

### 8.1 Keep demo auth as de facto architecture

Отклонено потому что:

- temporary bootstrap начинает диктовать long-lived design;
- Phase 2 and Phase 3 наследуют слабую identity boundary.

### 8.2 Let frontend derive role/module model itself

Отклонено потому что:

- создаёт policy drift;
- ломает single source of truth;
- усложняет future access enforcement.

### 8.3 Accept tenant from client requests

Отклонено потому что:

- открывает tenant leakage path;
- противоречит всей tenant-aware architecture.

### 8.4 Build full IAM/SSO now

Отклонено потому что:

- это premature infrastructure expansion;
- не нужно для текущего MVP proof;
- отвлекает от product architecture.

## 9. Consequences

### Positive consequences

- `Phase 1` получает стабильный identity/session baseline;
- frontend shell и backend auth boundary перестают зависеть от demo specifics;
- future CRM/approval APIs могут опираться на один resolved context model;
- tenant isolation discipline вводится рано и централизованно.

### Negative consequences

- придётся явно держать distinction between stable contract and temporary transport;
- нужен дополнительный policy/resolver слой даже до полноценной auth integration;
- demo flow перестаёт быть “быстрой магией” и становится более дисциплинированным.

Это правильная цена за устойчивость следующих фаз.

## 10. Guardrails for Future Phases

### 10.1 For Phase 1 coding

Разрешено:

- выделить `CurrentUserContext`;
- выделить `TenantContext`;
- выделить `SessionResolver`;
- выделить `ShellModuleVisibilityPolicy`;
- унифицировать `401/403` contract;
- сохранить demo login как local-dev bootstrap path.

Нельзя:

- оставлять role-to-module mapping inline в service/controller;
- тащить tenant authority из frontend payload;
- смешивать domain APIs с demo auth branching.

### 10.2 For Phase 2 and Phase 3

Все CRM и approval APIs должны считать resolved user/tenant context уже готовым входом application layer, а не заново решать auth semantics внутри каждого controller.

### 10.3 For future auth hardening

При переходе на более real auth provider должны измениться transport/resolution mechanics, но не:

- semantics of `GET /api/me`;
- server-side tenant resolution rule;
- backend-owned module visibility rule;
- distinction between `401` and `403`.

## 11. Result

Для MVP принято решение:

```text
shell/auth must have a stable server-owned identity contract,
even while the login transport remains demo-oriented
```

Это boundary, который должен удерживать `Phase 1` от ad hoc auth growth.
