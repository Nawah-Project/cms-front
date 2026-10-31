# Focused performance analytics — 2026-10-26

This release focuses on continuous analytics. Existing weekly and final report implementations are retained for a separate design pass.

## Member experience

- Only currently unlocked KPI categories are displayed. Future publishing and outreach features are not teased in locked panels or a month roadmap.
- The cumulative chart shows applications and their current positive-progression status, grouped by application recording date. It does not mislabel the curve as actual reply dates. CV uploads and saved updates are marked, including days with no applications.
- Two adjacent change cohorts can be compared. Each starts inclusively at a saved CV upload or professional update and ends exclusively at the following checkpoint. Bars use a shared proportional scale; zero applications have no filled bar.
- Before Week 3, the next CV review checkpoint is shown without disclosing future activity categories.
- From Week 3, Add an update appears in the comparison header. Each member may save one professional update per 72 hours. The next eligibility timestamp is shown in Cairo time. CV uploads remain separate and do not consume this manual-update slot.
- Clicking an application-count column opens its actual application list. A link opens the main applications section with the same createdFrom/createdBefore boundaries. Server filtering retains ownership, and the list supports pagination and clearing the cohort filter.
- Admin analytics includes all metric categories read-only, preserving existing redaction of private CV names, reflections and contact information.

## Reliability

The 72-hour limit uses a per-member PostgreSQL transaction advisory lock. The latest update is checked after the lock, and replayed requests reuse the existing submission. Changes are persisted as USER_CHANGE records rather than browser storage or weekly reflections. No schema migration is introduced.

Validation: frontend typecheck, production build and 16 stabilization tests; backend build and 41 tests across reporting, professional-change, admin-preview, applications and journey-engine suites. A disposable PostgreSQL database also verified concurrent requests, request replay, the 72-hour unlock and inclusive/exclusive application filter boundaries. Browser review covers future-feature concealment, chart, cohort modal and links, cooldown, update dialog and mobile layout.

Deployment uses versioned frontend/API images and the existing production Compose environment. Previous image tags and the prior Compose chain are retained for rollback.
