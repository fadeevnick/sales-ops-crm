# Sales Ops CRM

Standalone project:

```text
B2B Sales Operations CRM with approvals
```

Этот проект intentionally self-contained.

Для продолжения работы по проекту не нужно начинать с root-level method docs.
Главный local entrypoint находится внутри этой папки.
Внешние substrate/domain inputs уже локализованы в `00_substrate_reference.md` и `00_domain_reference.md`.

## Read First

Если в проекте есть активный `CURRENT.md`, для новой AI-сессии читать в таком порядке:

1. [README.md](README.md)
2. [CURRENT.md](CURRENT.md)
3. [design_status.md](design_status.md)
4. [implementation_status.md](implementation_status.md)
5. [00_substrate_reference.md](00_substrate_reference.md)
6. [00_domain_reference.md](00_domain_reference.md)
7. [06_implementation_guide.md](06_implementation_guide.md)
8. [design-details/README.md](design-details/README.md)

Если нужен deeper context:

9. [04_architecture.md](04_architecture.md)
10. [03_functional_requirements.md](03_functional_requirements.md)
11. [02_user_journeys.md](02_user_journeys.md)

Если `CURRENT.md` уже удалён, значит предыдущий workstream завершён.

В таком случае начинать нужно с:

1. [README.md](README.md)
2. [design_status.md](design_status.md)
3. [implementation_status.md](implementation_status.md)
4. [00_substrate_reference.md](00_substrate_reference.md)
5. [00_domain_reference.md](00_domain_reference.md)

## Local File Roles

- `mvp_roadmap.md` = что входит в MVP и в каком продуктовом порядке
- `00_substrate_reference.md` = local snapshot инженерной основы проекта
- `00_domain_reference.md` = local snapshot domain framing проекта
- `06_implementation_guide.md` = phased implementation roadmap/checklist
- `implementation_status.md` = фактический implementation/runtime progress
- `design_status.md` = статус design chain и planning pack
- `CURRENT.md` = temporary handoff/resume state для clean AI sessions while work is unfinished

## Current Mode

Сейчас проект находится в режиме:

```text
transition-to-code
```

Это значит:

- product design chain уже собран;
- implementation-near planning pack уже собран;
- runtime verification сознательно отложена;
- codebase bootstrap уже создан;
- следующий шаг уже не новый planning artifact, а первый узкий coding slice.

## Current Next Step

Если [CURRENT.md](CURRENT.md) существует, точный следующий шаг смотреть там.

Если он удалён, значит предыдущий handoff уже закрыт и следующий workstream нужно определять из `design_status.md` и `implementation_status.md`.
