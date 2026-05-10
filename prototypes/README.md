# Prototypes

Core flow prototypes для продукта:

```text
B2B Sales Operations CRM with approvals
```

Назначение этого каталога:

- зафиксировать критичные UX flows до codebase bootstrap;
- проверить, что product design chain дошёл до уровня экранов и пользовательских переходов;
- удержать связь между UX, domain model, workflow state и access rules.

## Why these prototypes

Ниже выбраны экраны, которые сильнее всего формируют будущую реализацию:

1. `01_opportunity_workspace.html`
2. `02_submit_approval.html`
3. `03_approver_inbox.html`
4. `04_admin_process_config.html`
5. `05_import_review.html`

Они закрывают:

- core sales loop;
- approval governance;
- metadata-driven configuration;
- data onboarding and quality control.

## Prototype rules

- Это не финальный visual design.
- Это не production frontend.
- Это UX and domain-shape artifacts before codebase bootstrap.

Главная ценность:

- увидеть, какие данные и действия реально должны быть first-class;
- заранее заметить конфликты между metadata, approvals, sharing, import and audit;
- облегчить Phase 0 and Phase 1 bootstrap.

## Suggested reading order

1. Opportunity workspace
2. Submit approval
3. Approver inbox
4. Admin process config
5. Import review

## Expected next step

После этих prototypes:

- сделать codebase bootstrap;
- реализовывать `06_implementation_guide.md` phase-by-phase;
- сверять runtime behavior с flows, зафиксированными здесь.
