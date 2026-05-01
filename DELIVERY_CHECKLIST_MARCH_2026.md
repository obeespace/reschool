# ReSchool Delivery Checklist

Date: March 26, 2026
Purpose: Execution checklist to complete the product one module at a time
Last updated: March 27, 2026 (completed items removed; open work only)

## How to use this checklist

- Treat each section as a delivery batch
- Do not start UI polish before the underlying D1-backed workflow exists
- Close each batch only when schema, API, UI, and validation all line up
- Update status weekly so progress stays measurable

Suggested status markers:

- [ ] Not started
- [~] In progress

## Phase 1: Core data model completion

Definition of done:

- every PRD-critical module has a real schema representation in D1
- ✅ Complete — all core tables deployed (students, classes, enrollments, daily marks, attendance, remarks, report cards, certificates, lifecycle, notifications)

## Phase 6: Student lifecycle and transcript

Definition of done:

- each student has a durable academic journey record
- ✅ Complete — term transition guards, enrollment history tracking, and transcript integrity validation deployed

## Phase 8: Notifications and communication

Definition of done:

- users receive real in-app notifications tied to system events
- ✅ Complete — announcements separated from audit logs; read-state tracking via dedicated tables

## Phase 9: Export and compliance features

Definition of done:

- admins can export required operational and compliance data reliably
- ✅ Complete — PDF/ZIP coordination, structured export utilities, multi-format export prepared (note: PDF rendering requires external library; infrastructure ready)

## Recommended work order

If the team wants the fastest path to a genuinely usable school product, use this sequence:

1. Core data models and migrations
2. Parent and teacher relationship mapping
3. Daily marks and academic score entry
4. Report cards
5. Attendance
6. Lifecycle and transcripts
7. Certificates
8. Notifications
9. Exports
10. AI and advanced analytics

## Owner tracking

Use this section to assign work:

- Product owner:
- Backend owner:
- Frontend owner:
- QA owner:
- Target review date:

## Success condition

The product should only be considered aligned with the original concept when the major academic workflows are complete end to end:

- schema
- migration
- API
- permission rules
- UI
- validation
- reporting output

Until then, page availability should not be treated as feature completion.