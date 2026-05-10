# 02 User Journeys

Документ фиксирует core user journeys для первого продукта:

```text
B2B Sales Operations CRM with approvals
```

Формат каждого journey:

- Trigger
- Actor
- Happy path
- Alternative paths
- Result
- Architectural points

Ниже описаны только те флоу, которые реально влияют на будущую архитектуру продукта.

## Journey 1. Tenant admin настраивает sales process

### Trigger

Новый tenant запускает систему или существующий tenant меняет свой sales process.

### Actor

RevOps / CRM Administrator

### Happy path

1. Admin создаёт или редактирует набор полей для `Account`, `Contact`, `Opportunity`.
2. Admin добавляет tenant-specific fields, например `industry_segment`, `deal_region`, `payment_risk_level`.
3. Admin настраивает стадии opportunity pipeline.
4. Admin задаёт обязательность некоторых полей на определённых стадиях.
5. Admin создаёт saved views для sales reps и managers.
6. Admin публикует изменения.
7. Sales users начинают работать по обновлённой конфигурации без vendor-side code changes.

### Alternative paths

1. Admin пытается удалить поле, которое уже участвует в views, reports или approvals.
2. Admin меняет stage model так, что существующие сделки оказываются в несовместимом состоянии.
3. Admin создаёт поле с неподдерживаемым типом или некорректной валидацией.
4. Изменение конфигурации публикуется частично и требует rollback.

### Result

Tenant получает собственную конфигурацию sales process без форка продукта и без ручных изменений в коде.

### Architectural points

- Нужна metadata-driven model, а не жёстко зашитая схема только под один pipeline.
- Нужен слой tenant configuration с versioning и audit.
- Нужен механизм валидации конфигурации до публикации.
- Нужны ограничения на destructive changes для полей и стадий.
- Нужна совместимость между metadata, operational data, views, approvals и reporting.

## Journey 2. Tenant импортирует стартовые данные из legacy source

### Trigger

Новый tenant переходит со spreadsheets или legacy CRM и хочет загрузить accounts, contacts и open opportunities.

### Actor

RevOps / CRM Administrator

### Happy path

1. Admin загружает CSV-файл.
2. Система предлагает mapping колонок на стандартные и custom fields.
3. Admin выбирает режим импорта: create only или upsert.
4. Система валидирует строки до запуска.
5. Admin подтверждает импорт.
6. Импорт выполняется асинхронно.
7. Admin получает итог: сколько записей создано, обновлено, пропущено, отклонено.
8. Ошибочные строки доступны для исправления и повторного импорта.

### Alternative paths

1. CSV содержит обязательные поля не для всех строк.
2. Значения не проходят типовую или business validation.
3. Обнаруживаются потенциальные дубликаты accounts или contacts.
4. Импорт слишком большой и должен выполняться частями.
5. Во время импорта tenant меняет metadata и часть маппинга устаревает.

### Result

Tenant может быстро онбордить данные в систему без ручного переноса записей по одной.

### Architectural points

- Нужен import pipeline с preview, validation и async execution.
- Нужен job model для long-running bulk operations.
- Нужна частичная обработка ошибок, а не all-or-nothing для всего файла.
- Нужна совместимость импорта со standard и custom fields.
- Нужен audit и traceability по каждой bulk operation.

## Journey 3. Sales rep создаёт opportunity и ведёт её по pipeline

### Trigger

Появился новый lead или account-level sales chance, которую нужно завести в систему.

### Actor

Sales Representative

### Happy path

1. Sales rep находит существующий account или создаёт новый.
2. Sales rep привязывает contact.
3. Sales rep создаёт opportunity.
4. Заполняет обязательные standard и custom fields.
5. Назначает ожидаемую сумму, close date, stage и owner.
6. Добавляет activity или next step.
7. По мере движения сделки переводит её по стадиям.
8. Manager видит обновление в командном pipeline view.

### Alternative paths

1. Sales rep пытается создать duplicate account/contact/opportunity.
2. На новой стадии не хватает обязательных полей.
3. Пользователь пытается изменить сделку, к которой у него нет доступа.
4. Сделка переводится в stage, который требует approval, но request ещё не создан.

### Result

Сделка становится частью управляемого pipeline и доступна в operational reporting.

### Architectural points

- Нужны core domain entities: account, contact, opportunity, activity.
- Нужны stage transitions с правилами валидации.
- Нужны ownership and sharing rules.
- Нужен audit history для stage changes и важных полей.
- Нужна data quality boundary для duplicate detection.

## Journey 4. Sales rep отправляет скидку или коммерческое исключение на согласование

### Trigger

Для закрытия сделки sales rep хочет предложить скидку, нестандартные payment terms или другое коммерческое исключение.

### Actor

Sales Representative

### Happy path

1. Sales rep открывает opportunity.
2. Выбирает действие `Submit for approval`.
3. Заполняет тип запроса: discount, terms exception, legal exception или иной policy-driven request.
4. Указывает proposed values и business justification.
5. Система определяет approval policy на основе tenant rules, deal attributes и requested exception.
6. Система создаёт approval request.
7. Approvers получают задачу на review.
8. Opportunity переходит в состояние `pending approval`.

### Alternative paths

1. Запрос не проходит pre-validation из-за отсутствующих обязательных данных.
2. Для данного типа исключения policy не настроена.
3. Запрос не требует approval по действующим правилам и может быть auto-approved.
4. У сделки уже есть активный approval request, и повторная отправка запрещена.

### Result

Коммерческое исключение формализуется в системе и перестаёт зависеть от email/chat как primary control plane.

### Architectural points

- Нужен workflow / approval engine, а не только статусы в одной таблице.
- Нужен policy evaluation layer.
- Нужна связь approval request с snapshot важных данных сделки на момент отправки.
- Нужны state machine и concurrency rules для active approvals.
- Нужны notifications и task assignment, но их жизненный цикл должен быть отделён от core decision record.

## Journey 5. Approver рассматривает и решает approval request

### Trigger

Approver получает назначенный approval request.

### Actor

Finance Approver или Commercial / Legal Approver

### Happy path

1. Approver открывает очередь своих approval tasks.
2. Видит контекст: account, opportunity, requested exception, proposed values, justification, related history.
3. Проверяет request against policy.
4. Выбирает решение: approve, reject или send back.
5. Добавляет комментарий.
6. Система фиксирует решение и время.
7. Если это был последний required approval step, opportunity разблокируется для дальнейшего движения.

### Alternative paths

1. Approver не имеет доступа к полной сделке, но должен видеть только минимально нужный контекст.
2. Approval policy требует несколько последовательных шагов.
3. Один из approvers долго не отвечает, и request escalates.
4. Sales rep меняет базовые параметры сделки после отправки, и approval должен быть invalidated или пересоздан.

### Result

Решение по исключению принимается прозрачно, с полным audit trail и контролируемым влиянием на сделку.

### Architectural points

- Нужен approval state machine с поддержкой sequential steps.
- Нужна модель видимости для approver-specific access.
- Нужна immutable history of decisions.
- Нужны SLA-like timers, escalation hooks и re-evaluation rules.
- Нужна защита от race conditions между edit сделки и approval lifecycle.

## Journey 6. Sales manager контролирует pipeline и переназначает ownership

### Trigger

Manager проводит pipeline review или видит, что сделка застряла/ушла не тому owner.

### Actor

Sales Manager

### Happy path

1. Manager открывает team pipeline view.
2. Фильтрует сделки по stage, owner, region, close date или approval status.
3. Открывает проблемную opportunity.
4. Смотрит историю изменений, activities и pending approvals.
5. При необходимости меняет owner или вносит manager comment.
6. Sales rep продолжает работу уже в обновлённом ownership context.

### Alternative paths

1. Manager видит только свою команду, а не все tenant records.
2. У сделки есть confidential fields, недоступные менеджеру.
3. Переназначение ownership должно триггерить изменение sharing visibility и task reassignment.

### Result

Управление командным pipeline происходит внутри системы, а visibility соответствует бизнес-иерархии.

### Architectural points

- Нужна RBAC + ownership + manager visibility model.
- Нужны query patterns для team views и фильтров.
- Нужна автоматическая переоценка sharing access при смене owner.
- Нужен audit trail для reassignment.

## Journey 7. RevOps обрабатывает дубликаты и объединяет записи

### Trigger

После импорта или повседневной работы система выявляет потенциальные дубликаты accounts или contacts.

### Actor

RevOps / CRM Administrator

### Happy path

1. Admin открывает очередь duplicate candidates.
2. Система показывает записи-пары и причины совпадения.
3. Admin сравнивает поля, связанные сделки, activities и ownership.
4. Выбирает master record.
5. Выполняет merge.
6. Система переносит связи на master record и сохраняет историю merge.

### Alternative paths

1. Совпадение ложноположительное, и admin отклоняет merge.
2. Records содержат конфликтующие значения в важных полях.
3. У merged records разные owners и разные sharing implications.
4. Merge затрагивает связанные approvals, reports или imported references.

### Result

Tenant поддерживает качественные master data без ручной чистки в обход системы.

### Architectural points

- Нужен dedup layer, а не только поиск по exact match.
- Нужен controlled merge workflow с reversible reasoning хотя бы на audit level.
- Нужна корректная переразвязка relations после merge.
- Нужен пересчёт search indexes, reports и derived views после merge.

## Journey 8. Executive смотрит forecast и approval bottlenecks

### Trigger

Руководитель хочет понять состояние pipeline и влияние approval process на revenue flow.

### Actor

VP Sales / Executive

### Happy path

1. Executive открывает dashboard.
2. Видит pipeline by stage, forecast by period, deals pending approval, approval turnaround time, exception volume.
3. Drill-down'ится из summary в список проблемных opportunities.
4. Сравнивает команды, owners или регионы.
5. Находит bottleneck и ставит управленческое действие.

### Alternative paths

1. Executive не должен видеть все record details, но должен видеть агрегаты.
2. Tenant использует custom fields, которые хочет включать в reporting slices.
3. Dashboard должен обновляться после bulk imports и dedupe операций.

### Result

Руководство получает операционно полезную картину продаж и approval bottlenecks, а не только набор сырых записей.

### Architectural points

- Нужен reporting model, совместимый с tenant customization.
- Нужны aggregate queries, которые не разрушают primary write path.
- Нужна стратегия обновления dashboard data после bulk/data-quality operations.
- Нужны access rules для aggregated vs record-level visibility.

## Journey 9. Sales rep работает с saved views и daily task queue

### Trigger

Sales rep начинает рабочий день и хочет быстро понять, какие сделки требуют действий.

### Actor

Sales Representative

### Happy path

1. Sales rep открывает `My Open Opportunities` view.
2. Применяет фильтры по stage, next step due date и approval status.
3. Открывает список задач и просроченных activities.
4. Переходит в конкретную opportunity.
5. Обновляет next step, комментарий или stage.

### Alternative paths

1. Tenant admin изменил доступность полей, и старый view больше невалиден.
2. Sales rep пытается использовать filter по полю, которое скрыто политикой доступа.
3. View должен переживать metadata changes без полного разрушения пользовательского опыта.

### Result

Пользователь работает не с "сырым CRUD", а с role-relevant operational workspace.

### Architectural points

- Нужна модель saved views/filters поверх standard и custom fields.
- Нужен безопасный query builder с awareness о field permissions.
- Нужна устойчивость views к эволюции metadata.

## Key Cross-Journey Implications

Из всех journeys уже следуют критичные будущие архитектурные требования:

- metadata-driven model, а не фиксированная CRUD-схема;
- approval/workflow engine со state machine и policy evaluation;
- RBAC + ownership + manager visibility + selective approver access;
- import/export и bulk job framework;
- deduplication and merge model;
- reporting layer, совместимый с tenant customization;
- audit trail для business changes, а не только технических событий;
- careful coupling между metadata, operational records, workflows и reporting.
