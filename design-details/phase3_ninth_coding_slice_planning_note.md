# Phase 3 Ninth Coding Slice Planning Note

## Slice

```text
frontend approval detail and decision action UI
```

## Goal

Let an approver open an active inbox request, inspect the approval detail, and submit one of the existing decision commands without adding a full workflow timeline page.

## Files

- update `codebase/frontend/src/features/approvals/ApproverInbox.tsx`
- update `codebase/frontend/src/styles.css`
- update project status docs after verification

## In Scope

- select an approval inbox row
- load and render approval request detail
- render request status, justification, steps and recent history
- submit approve, reject or send-back with a comment
- refresh detail and inbox after a decision

## Out of Scope

- dedicated route/page for approvals
- notification delivery
- metadata-driven workflow builder
- full multi-role browser walkthrough beyond one focused decision smoke

## Acceptance

- frontend `npm run build` passes in the container
- browser smoke can log in as a finance approver, open a request and approve the active step
- after approval, the UI shows the request still pending for the next step and the finance inbox count drops
