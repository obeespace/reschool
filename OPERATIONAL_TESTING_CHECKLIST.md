# Operational Testing Checklist

Date: March 27, 2026
Purpose: Minimum repeatable checks before marking any module as released

## Usage

- Run this checklist after implementing a module and before release tagging.
- Evidence should include request/response snapshots or screenshots.
- A module is not considered done if any critical check fails.

## Module Metadata

- Module name:
- Owner:
- Build commit:
- Test date:
- Environment: local / staging / production-like

## API Layer Checks

- [ ] Positive path request succeeds with expected status code.
- [ ] Invalid payload returns validation error with clear message.
- [ ] Unauthorized request is rejected.
- [ ] Role-restricted access is enforced correctly.
- [ ] Tenant scoping prevents cross-school access.
- [ ] Pagination/filters/sorting (if applicable) behave correctly.
- [ ] Mutations are idempotent where required.
- [ ] Audit trail or event record is created where required.

## Data Integrity Checks

- [ ] Insert/update writes expected data fields only.
- [ ] Related records are created or updated consistently.
- [ ] Soft-delete/hard-delete behavior matches spec.
- [ ] Referential constraints are preserved.
- [ ] Existing records are not unintentionally overwritten.
- [ ] Migration impact validated against existing sample data.

## UI Workflow Checks

- [ ] Happy-path flow works end-to-end from UI to database.
- [ ] Loading, empty, and error states are user-friendly.
- [ ] Form validation prevents invalid submissions.
- [ ] Permission-based UI visibility matches backend rules.
- [ ] Main actions are accessible on desktop and mobile viewport widths.

## Reporting/Export Checks

- [ ] Data shown in UI matches exported output for sampled records.
- [ ] CSV export opens without malformed headers or rows.
- [ ] Export respects role and school scoping.
- [ ] Export includes key mandatory fields for the module.

## Caching and Freshness Checks

- [ ] Read endpoints return fresh data after relevant mutation.
- [ ] Cache-bypass headers behave as expected.
- [ ] No stale data remains after setup/term/report/score operations.

## Performance and Reliability Checks

- [ ] Endpoint response time is acceptable for expected payload size.
- [ ] Bulk operations handle representative load without timeout.
- [ ] Repeated requests do not produce inconsistent state.

## Release Gate

- [ ] All critical checks passed.
- [ ] Known non-critical issues documented with owner and due date.
- [ ] Module approved for release.

## Sign-off

- QA reviewer:
- Backend reviewer:
- Product reviewer:
- Sign-off date:
