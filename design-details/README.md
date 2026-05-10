# Design Details

Supporting design artifacts для проекта:

```text
B2B Sales Operations CRM with approvals
```

Этот каталог нужен для перехода от high-level design chain к implementation-ready level без раннего runtime.

Здесь лежат документы, которые не заменяют:

- `01_business_requirements.md`
- `02_user_journeys.md`
- `03_functional_requirements.md`
- `04_architecture.md`
- `05_tech_stack.md`
- `06_implementation_guide.md`

Они их уточняют перед следующими implementation phases.

## Contents

1. `access_matrix.md`
2. `api_contracts_phase1_phase2.md`
3. `state_machines.md`
4. `metadata_mvp_scope.md`
5. `audit_model.md`
6. `phase1_backlog.md`
7. `phase1_file_level_plan.md`
8. `schema_draft_phase1_phase2.md`
9. `test_matrix_phase0_phase1_phase2.md`
10. `runtime_checklists.md`
11. `phase2_file_level_plan.md`
12. `phase3_file_level_plan.md`
13. `mvp_cut_register.md`
14. `adr-001-metadata-storage-boundary.md`
15. `adr-002-shell-auth-boundary.md`
16. `adr-003-opportunity-stage-transition-model.md`
17. `adr-004-approval-request-vs-opportunity-separation.md`
18. `adr-005-access-enforcement-layer.md`
19. `phase1_coding_slice_planning_note.md`
20. `phase1_coding_slice_review_note.md`
21. `phase1_second_coding_slice_planning_note.md`
22. `v2_phase1_identity_hardening_spec.md`
23. `v2_phase1_identity_hardening_acceptance_checklist.md`
24. `phase1_third_coding_slice_planning_note.md`
25. `phase2_first_coding_slice_planning_note.md`
26. `v3_phase2_crm_core_spec.md`
27. `v3_phase2_crm_core_acceptance_checklist.md`
28. `phase2_second_coding_slice_planning_note.md`
29. `phase2_third_coding_slice_planning_note.md`
30. `phase2_fourth_coding_slice_planning_note.md`
31. `phase2_fifth_coding_slice_planning_note.md`
32. `phase2_sixth_coding_slice_planning_note.md`
33. `phase2_seventh_coding_slice_planning_note.md`
34. `phase2_eighth_coding_slice_planning_note.md`
35. `phase2_ninth_coding_slice_planning_note.md`
36. `phase2_tenth_coding_slice_planning_note.md`
37. `phase2_eleventh_coding_slice_planning_note.md`
38. `phase2_twelfth_coding_slice_planning_note.md`
39. `phase3_first_coding_slice_planning_note.md`
40. `phase3_second_coding_slice_planning_note.md`
41. `phase3_third_coding_slice_planning_note.md`
42. `phase3_fourth_coding_slice_planning_note.md`
43. `phase3_fifth_coding_slice_planning_note.md`
44. `phase3_sixth_coding_slice_planning_note.md`
45. `phase3_seventh_coding_slice_planning_note.md`
46. `phase3_eighth_coding_slice_planning_note.md`
47. `phase3_ninth_coding_slice_planning_note.md`
48. `phase3_tenth_verification_slice_planning_note.md`
49. `phase4_file_level_plan.md`
50. `phase4_first_coding_slice_planning_note.md`

## Why this layer exists

Эти артефакты нужны, чтобы:

- уменьшить архитектурную неоднозначность перед кодом;
- не принимать access/workflow/metadata решения ad hoc в ходе реализации;
- подготовить Phase 1 and Phase 2 without premature runtime pressure;
- сделать Phase 0 bootstrap более осмысленным с точки зрения следующих шагов.
