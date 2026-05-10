# 03 Functional Requirements

Документ фиксирует функциональные требования в формате, пригодном для трассировки от user journeys к будущей архитектуре.

Формат:

```text
FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys
```

## 1. Core tenant and configuration model

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-001 | поддерживать tenant isolation для всех бизнес-данных и конфигурации | при работе любого пользователя | данные и metadata одного tenant не должны быть видимы другому tenant | J1-J9 |
| FR-002 | позволять tenant admin создавать и изменять custom fields для core entities | при настройке sales process | изменения должны применяться без vendor-side code changes для типовых кейсов | J1 |
| FR-003 | поддерживать tenant-specific pipeline stages для opportunities | при конфигурации процесса | stage model должна быть настраиваемой на уровне tenant | J1, J3 |
| FR-004 | позволять помечать поля как required в зависимости от стадии или типа процесса | при валидации записи | stage-specific validation должна быть применена до сохранения или перехода stage | J1, J3 |
| FR-005 | валидировать tenant configuration до публикации | при создании или изменении metadata | нельзя публиковать конфигурацию, которая ломает зависимости views, approvals или reports | J1, J9 |
| FR-006 | хранить audit history для публикации и изменения tenant configuration | при каждом config change | должны сохраняться автор, время, тип изменения и затронутые объекты | J1 |
| FR-007 | ограничивать destructive metadata changes | при удалении или радикальном изменении поля/стадии | система должна предотвращать или явно эскалировать изменения, затрагивающие operational data, approvals или reports | J1 |

## 2. Core CRM records and lifecycle

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-008 | поддерживать core entities `Account`, `Contact`, `Opportunity`, `Activity` | в MVP scope | эти сущности являются first-class records, а не произвольными заметками | J3, J6, J8, J9 |
| FR-009 | позволять создавать opportunity с заполнением standard и custom fields | при работе sales rep | обязательные поля должны проверяться до сохранения | J3 |
| FR-010 | поддерживать stage transitions для opportunity | при движении сделки по pipeline | переход должен проходить через business validation rules | J3 |
| FR-011 | блокировать переход opportunity в стадии, требующие approval, если обязательный approval request отсутствует | при stage change | нельзя обойти approval policy простым изменением stage | J3, J4 |
| FR-012 | поддерживать историю значимых изменений opportunity | при изменении stage, owner, amount, close date, approval-related fields | история должна быть доступна для review и audit | J3, J5, J6 |
| FR-013 | позволять создавать и отслеживать activities / next steps, связанные со сделкой | при ежедневной работе sales rep или manager | activity должна быть привязана к конкретному business context | J3, J6, J9 |

## 3. Access model and sharing

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-014 | поддерживать role-based access control для основных пользовательских ролей | при доступе к данным и действиям | права должны отличаться для sales rep, manager, admin, approver, executive | J3-J9 |
| FR-015 | поддерживать ownership-based visibility для operational records | при чтении и изменении record-level data | по умолчанию запись доступна owner и разрешённым политикам видимости | J3, J6, J9 |
| FR-016 | поддерживать manager visibility для командного pipeline | при просмотре manager views | manager должен видеть только подчинённый scope, а не автоматически весь tenant | J6 |
| FR-017 | поддерживать selective approver access к approval context | при review approval request | approver должен видеть минимум данных, необходимых для решения | J5 |
| FR-018 | поддерживать ограничения на field-level visibility для чувствительных полей | при открытии record details, views и reports | скрытые поля не должны раскрываться через filters, exports или dashboards | J6, J8, J9 |
| FR-019 | автоматически пересчитывать visibility при смене owner или релевантного access attribute | при reassignment | sharing model должна обновляться консистентно | J6 |
| FR-020 | хранить audit trail для access-sensitive действий | при reassignment, approval decision, merge и config changes | критичные действия должны быть объяснимы постфактум | J1, J5, J6, J7 |

## 4. Approval workflows and policy governance

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-021 | позволять sales rep создавать approval request из opportunity | при запросе скидки, terms exception или другого policy-bound исключения | request должен быть связан с конкретной сделкой и типом исключения | J4 |
| FR-022 | определять applicable approval policy на основе параметров сделки и tenant rules | при отправке request | policy selection должна происходить детерминированно и быть объяснимой | J4 |
| FR-023 | поддерживать состояния approval request | при lifecycle request | минимум нужны состояния draft, submitted, pending, approved, rejected, sent back, cancelled | J4, J5 |
| FR-024 | поддерживать многошаговые approval chains | когда policy требует последовательного review | следующий approver не должен активироваться до завершения предыдущего required step | J5 |
| FR-025 | сохранять snapshot критичных параметров сделки на момент отправки approval request | при submit | решение approver должно ссылаться на конкретную версию business context | J4, J5 |
| FR-026 | предотвращать наличие нескольких конфликтующих активных approval requests для одной и той же policy scope | при повторной отправке | система должна запрещать или явно разрешать concurrency по правилам | J4 |
| FR-027 | позволять approver принять решение approve, reject или send back с комментарием | при review task | решение без audit comment может быть запрещено tenant policy | J5 |
| FR-028 | инвалидировать или пересматривать approval request при изменении approval-relevant полей сделки | после submit | approval не должен оставаться валидным при существенном изменении business context | J5 |
| FR-029 | поддерживать escalation или overdue detection для approval requests | при превышении tenant-defined сроков | эскалация не должна уничтожать history предыдущих шагов | J5 |
| FR-030 | менять business state opportunity после финального approval outcome | при завершении request | результат approval должен консистентно отражаться в lifecycle сделки | J4, J5 |

## 5. Views, filters and daily workspace

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-031 | позволять пользователям работать через saved views и filters | при ежедневной работе с pipeline | views должны поддерживать standard и custom fields | J1, J6, J9 |
| FR-032 | поддерживать фильтрацию по stage, owner, approval status, due date и tenant-specific fields | при поиске и triage records | фильтры должны учитывать access rules | J6, J9 |
| FR-033 | сохранять пользовательские и shared views | при настройке workspace | shared views могут иметь tenant-admin или manager ownership | J1, J9 |
| FR-034 | проверять валидность views после metadata changes | при открытии или исполнении saved view | сломанные views должны быть помечены, а не молча давать неверный результат | J1, J9 |

## 6. Import, export and bulk operations

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-035 | поддерживать CSV import для core records | при онбординге или массовом обновлении данных | import должен учитывать standard и custom fields | J2 |
| FR-036 | поддерживать column mapping preview до запуска импорта | при загрузке файла | пользователь должен видеть, как source columns мапятся в target fields | J2 |
| FR-037 | валидировать импортируемые строки до и во время обработки | при bulk import | ошибки должны быть доступны построчно, а не только общим сообщением | J2 |
| FR-038 | поддерживать async execution для больших imports и bulk operations | при long-running tasks | пользователь должен видеть статус job и итоговый результат | J2 |
| FR-039 | поддерживать частичный успех bulk operation | при наличии смешанных валидных и невалидных строк | нельзя отклонять весь job только из-за части плохих строк без tenant policy на это | J2 |
| FR-040 | поддерживать controlled export records по views или filters | при выгрузке данных | экспорт должен уважать access rules и field visibility | J8, J9 |
| FR-041 | хранить audit record по каждому import/export/bulk job | при завершении операции | должны сохраняться инициатор, время, scope и outcome | J2, J7 |

## 7. Deduplication and merge

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-042 | выявлять потенциальные дубликаты accounts и contacts | после импорта или при создании новых записей | matching может быть heuristic-based, а не только exact match | J2, J7 |
| FR-043 | предоставлять очередь duplicate candidates для review | при наличии suspicious matches | система должна объяснять reason for match | J7 |
| FR-044 | позволять admin отклонять ложноположительные совпадения | при review duplicates | отклонение должно быть зафиксировано для будущего анализа | J7 |
| FR-045 | позволять merge двух или более записей через выбор master record | при подтверждённом duplicate case | merge должен сохранять history и корректно переносить связи | J7 |
| FR-046 | консистентно перепривязывать связанные opportunities, activities и другие relations после merge | при выполнении merge | нельзя оставлять dangling relations | J7 |
| FR-047 | сохранять audit trail причин и результата merge | при завершении merge | должно быть понятно, кто и почему выполнил merge | J7 |

## 8. Reporting and executive visibility

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-048 | предоставлять базовые dashboards по pipeline, forecast и approvals | в рамках MVP reporting | агрегаты должны строиться на operationally meaningful метриках | J8 |
| FR-049 | поддерживать drill-down из dashboard в underlying record set | при анализе bottleneck | drill-down должен уважать access rules | J8 |
| FR-050 | позволять использовать tenant-specific fields в reporting slices там, где это поддерживается MVP | при настройке views/reports | reporting model не должен ломаться при наличии custom fields | J1, J8 |
| FR-051 | отражать approval metrics, включая pending volume и turnaround time | при executive review | метрики должны строиться на decision history, а не на неполных эвристиках | J8 |
| FR-052 | обновлять reporting results после imports, merges и критичных lifecycle changes | при изменении исходных данных | данные не должны оставаться бесконечно stale без видимого статуса обновления | J2, J7, J8 |

## 9. Audit and traceability

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-053 | вести audit history для значимых business changes | при изменении records, approvals, ownership, merges и metadata | audit должен быть business-readable, а не только техническим log event | J1-J8 |
| FR-054 | показывать пользователю историю изменения записи в понятной форме | при review account/contact/opportunity | должны быть видны кто, что и когда изменил | J5, J6 |
| FR-055 | хранить решение approver и связанный комментарий как неизменяемую decision record | при завершении approval step | decision history не должна silently редактироваться задним числом | J5 |
| FR-056 | обеспечивать traceability между business record, approval request, import job и merge actions | при расследовании изменений | пользователь или auditor должен уметь восстановить цепочку влияния | J2, J5, J7 |

## 10. MVP boundary requirements

| FR-ID | Система должна... | Условие | Ограничение / инвариант | Связанные journeys |
|---|---|---|---|---|
| FR-057 | оставаться сфокусированной на sales operations и approval governance в первой версии | при планировании scope | billing, invoicing, ledger, inventory и CLM не входят в MVP | J1-J9 |
| FR-058 | позволять tenant запустить core sales workflow без внешних обязательных модулей ERP-класса | в MVP | core loop должен работать на accounts, contacts, opportunities, activities и approvals | J3-J5, J9 |
| FR-059 | поддерживать first-class data migration path для новых tenants | при продуктовой адаптации | импорт и cleanup являются обязательной частью MVP, а не post-MVP утилитой | J2, J7 |

## 11. Requirement themes that must explicitly shape architecture later

Из этих требований позже обязательно должны быть выведены архитектурные решения по следующим темам:

- metadata-driven schema and configuration model;
- access control and sharing architecture;
- approval workflow engine and state transitions;
- async bulk job execution;
- reporting model under customization pressure;
- deduplication and merge consistency;
- business-readable audit model.
