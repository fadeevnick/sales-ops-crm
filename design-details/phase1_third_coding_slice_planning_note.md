# Phase 1 Third Coding Slice Planning Note

Этот документ фиксирует третий узкий coding slice внутри `Phase 1`.

Он нужен, чтобы переход во frontend происходил
не как расплывчатое "теперь немного UI cleanup",
а как отдельный и контролируемый implementation step.

## 1. Decision

Третий coding slice внутри `Phase 1`:

```text
frontend shell/session refinement
```

Этот slice идёт **после**:

- `backend session/current-user hardening`;
- `schema and seed hardening`;
- появления `V2__phase1_identity_hardening.sql`.

## 2. Why This Slice Is Third

Этот slice выбран третьим, потому что:

- backend shell/auth boundary уже отделена от controller/service drift;
- `V2` уже убрала главный identity/seed ambiguity before more frontend reliance;
- текущий frontend shell всё ещё остаётся слишком монолитным inside `App.tsx`;
- session storage, fetch logic и shell state transitions пока ещё слишком сцеплены;
- теперь frontend уже может безопаснее опираться на `GET /api/me` как на stable source of truth.

Если сейчас перескочить сразу в runtime verification или в Phase 2 APIs, то:

- logged-out / loading / invalid-session semantics останутся неявными;
- stale stored session path останется ad hoc;
- frontend продолжит смешивать transport, storage и rendering в одном файле;
- approver roles будут существовать в seed baseline, но shell refinement для них останется недоделанным.

## 3. Exact Scope

В этот третий slice входят:

1. Декомпозировать текущий `App.tsx` до composition-root роли.
2. Вынести frontend session transport в отдельный `api/session.ts`.
3. Вынести session/current-user contracts в `types/session.ts`.
4. Вынести local dev session persistence в `lib/sessionStorage.ts`.
5. Выделить shell-focused components:
   - `LoginScreen.tsx`
   - `WorkspaceShell.tsx`
   - `ModuleGrid.tsx`
   - `SessionBanner.tsx`
6. Сделать явными shell states:
   - logged-out
   - loading
   - authenticated
   - invalid or expired local session
7. Оставить backend source of truth для visible modules и current identity context.
8. Подготовить frontend shell к later runtime verification, но не запускать runtime в этом slice.

## 4. Explicitly In Scope

### Frontend structure scope

Должны появиться или быть переработаны:

- `codebase/frontend/src/App.tsx`
- `codebase/frontend/src/styles.css`
- `codebase/frontend/src/api/session.ts`
- `codebase/frontend/src/types/session.ts`
- `codebase/frontend/src/lib/sessionStorage.ts`
- `codebase/frontend/src/features/shell/LoginScreen.tsx`
- `codebase/frontend/src/features/shell/WorkspaceShell.tsx`
- `codebase/frontend/src/features/shell/ModuleGrid.tsx`
- `codebase/frontend/src/features/shell/SessionBanner.tsx`

### Frontend behavior scope

Frontend должен после этого slice:

- получать seeded users через dedicated API helper;
- делать demo login через dedicated API helper;
- восстанавливать session marker on refresh;
- очищать stale session marker, если `/api/me` больше не может разрешить пользователя;
- не показывать authenticated shell при `401 unauthorized`;
- рендерить module shell только из backend-returned `modules`;
- показывать tenant/user/role summary без frontend-owned permission logic.

### Minimal backend alignment only if strictly needed

Допустимы только минимальные backend updates,
если во время frontend refinement обнаружится,
что уже согласованный shell contract всё ещё не выражен достаточно явно.

Практически допустимы только small changes в:

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/service/SessionService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ApiExceptionHandler.kt`

И только если это нужно для:

- stable invalid-session handling;
- already-agreed `401/403` semantics;
- explicit denial for disabled users in shell path.

## 5. Explicitly Out Of Scope

В этот третий slice не входят:

- runtime verification;
- `docker compose up`;
- compile/test execution as proof;
- new CRM entities or Phase 2 APIs;
- approval workflow UI;
- metadata configuration UI;
- routing expansion across future modules;
- global state framework adoption "на будущее";
- auth provider integration;
- broad backend auth redesign;
- replacing demo auth transport.

Особенно важно:

- не превращать slice в общий frontend rewrite;
- не смешивать его с Phase 2 navigation or record screens;
- не использовать shell refinement как предлог для новой backend architecture wave.

## 6. Primary Files To Touch

### Required

- `codebase/frontend/src/App.tsx`
- `codebase/frontend/src/styles.css`
- `codebase/frontend/src/api/session.ts`
- `codebase/frontend/src/types/session.ts`
- `codebase/frontend/src/lib/sessionStorage.ts`
- `codebase/frontend/src/features/shell/LoginScreen.tsx`
- `codebase/frontend/src/features/shell/WorkspaceShell.tsx`
- `codebase/frontend/src/features/shell/ModuleGrid.tsx`
- `codebase/frontend/src/features/shell/SessionBanner.tsx`
- `implementation_status.md`

### Likely

- `CURRENT.md`

### Optional only if needed

- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/service/SessionService.kt`
- `codebase/backend/src/main/kotlin/com/salesops/bootstrap/api/ApiExceptionHandler.kt`

Только если frontend slice упрётся в already-agreed shell contract gap.

## 7. Recommended Change Order

1. Create `types/session.ts` from current backend contracts.
2. Extract transport into `api/session.ts`.
3. Extract session persistence into `lib/sessionStorage.ts`.
4. Add `LoginScreen.tsx`, `SessionBanner.tsx`, `ModuleGrid.tsx`, `WorkspaceShell.tsx`.
5. Slim down `App.tsx` to state orchestration only.
6. Make stale-session clearing and error-state transitions explicit.
7. Extend `styles.css` only as much as needed for the decomposed shell.
8. Apply minimal backend alignment only if the frontend reveals a real shell-contract gap.
9. Update `implementation_status.md` with the fact of the slice implementation, but not with fake verification claims.

## 8. Exit Criteria For This Slice

Третий slice можно считать завершённым на implementation boundary, когда:

- `App.tsx` больше не содержит почти весь shell transport and rendering logic;
- frontend session calls вынесены из UI components;
- local session persistence живёт в отдельной boundary;
- stale stored session no longer leaves the app in ambiguous state;
- logged-out / loading / authenticated states выражены явно;
- visible modules по-прежнему приходят только с backend;
- approver-role users могут войти в consistent shell without frontend role invention;
- slice всё ещё не расширился в Phase 2 UI or runtime verification.

## 9. What Becomes Easier After This Slice

После этого slice проще и чище делать:

- first real Phase 1 frontend/runtime verification;
- focused shell tests for login, refresh, logout and invalid session;
- later Phase 2 module entry placeholders without re-growing `App.tsx`;
- stricter shell behavior around disabled or invalid sessions.

## 10. Deferred After This Slice

Сознательно откладывается:

```text
runtime verification of the full shell
```

Это должен быть отдельный следующий шаг,
а не "хвост" третьего coding slice.

## 11. Next Step After This Note

После этого planning note следующий шаг уже не новый planning artifact.

Следующий шаг:

```text
implement the third Phase 1 coding slice:
frontend shell/session refinement
```
