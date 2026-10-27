# Section design experiments

The baseline A is the complete approved experience at the 2026-10-27 cutover. It is separate from the legacy global `useUxExperiment` A/B/C labels. The welcome screen is always part of the approved baseline. Historical experiment data is retained; it is not relabelled or mixed into new test evidence.

## Rendering contract

`SectionExperienceProvider` fetches `/ux-lab/assignment` once through an account-scoped React Query key. Each section has its own design version and immutable context. `useSectionDesign(section)` chooses an actual implementation. Currently group progress has A (existing table) and B (responsive cards). Both reuse `MemberProgressRow`, the same API, permission policies, professional profile, details and guide selectors. All other sections expose A only until a B implementation exists.

`SectionExposure` records a page exposure after its assignment is ready. Group progress explicitly waits for unlocked, successfully loaded content. It never treats a locked/loading screen as an experimental design exposure. URL preview is checked against the authenticated ADMIN role, is limited to the current URL/tab, and is excluded from research. Old browser preview flags cannot select a user design.

A section release changes rendering only. Do not change any guide flow key, task rule, application record, CV version or journey timestamp when selecting a design.

## Adding a future design

1. Implement a distinct renderer with the same functional contracts and accessible controls. Use a typed section/version component registry when there are multiple renderers; keep business state outside the renderer.
2. Test its normal, empty, loading, error, mobile, RTL, keyboard and required-guide states.
3. Add B to that section in backend `src/ux-lab/registry.ts` only after the frontend renderer ships. Register a primary metric that is emitted after its real successful outcome. No experiment may select an unimplemented B.
4. Save a draft with one section, hypothesis, outcome, audience, stable account allocation and planned sample per arm. Starting the experiment is explicit. No automatic treatment rollout is created by deployment.
5. Review exposed users, successes, errors and median time. Sample sufficiency is a planning threshold, not statistical significance. The lab never declares an automatic winner.
6. End the test, then publish only that section. Publishing uses optimistic release revision checks; running/paused tests block same-section publishing. Other sections remain on their own releases. A is the immediate section rollback.

## Assignment and lifecycle

Server-side SHA-256 allocation is persisted per experiment/account. Group or individual targeting is checked before enrollment. An enrolled account keeps its arm when membership changes, across tabs, restarts and devices. Only one active/paused experiment is allowed for a section. A database partial unique index additionally prevents concurrent RUNNING tests. Pause serves the published design and preserves allocations for resume. Completed experiments cannot restart.

Releases are append-only revisions. Events reference the actual release or experiment context instead of whatever the current label happens to be later. New releases do not rewrite previous evidence. Legacy config remains available for the intro video and compatibility; it does not control section rendering.

## Measurement definitions

- **Exposure**: a successful rendered section view, not assignment. Denominator is distinct accounts exposed in the selected experiment/window/cohort.
- **Primary conversion**: an exposed account with the chosen successful action after exposure in the same experiment/version context. Repeated events do not inflate unique converters. No denominator produces `null`, displayed as `—`.
- **Time to outcome**: median elapsed server-recorded time from exposure to first outcome. It is descriptive wall-clock time, separate from active engagement.
- **Engagement**: visible-page activity sampled in 15-second chunks, paused when hidden or after 60 seconds without pointer, keyboard or scroll interaction. Input contents and keys are never captured. It is an estimate, not a productivity score.
- **Errors**: instrumented validation/request failures during the section. Not a claim to cover every possible frontend issue.
- **Activation**: all-time durable milestone snapshots. Future timed weeks are not labelled abandonment. Historical account state may not produce a sequential funnel.
- **Guide health**: current all-time completed/skipped/in-progress account records, not period events. Completing a step in a legacy tutorial does not prove a new experiment exposure.
- **Group scope**: event measurements use group membership recorded at event time. Activation/guide snapshots use current membership. This distinction is shown in the lab; moving a member must not silently rewrite the event cohort.

New events are stored in PostgreSQL, not the legacy in-memory 2,000-event buffer. Retried UUIDs are idempotent. Every batch carries the originating account ID, which must match the authenticated account; delayed requests cannot move to a later login. Actions without a prior view in the same account/session/context are ignored. Server validation rejects forged versions, inactive experiments, mismatched section actions and arbitrary metadata. Admins and the dedicated synthetic production QA account are excluded. Telemetry never contains CV contents, company names, emails, URLs, form values, keyboard contents or replay recordings. Pending telemetry is memory-only, bounded and discarded on account change; outage behavior does not block the product.

The reporting window is the current UTC calendar day plus the preceding 6/29/89 UTC days; chart dates and aggregate windows match. Experiment outcomes count only viewers in that window. Account guide and activation snapshots remain all-time and ignore the experiment filter. A paused/resumed test may have a discontinuous observation period; review its dates and context before causal interpretation.

## Verification and operations

Backend migration is additive: four `ux_lab_*` tables, constraints and indexes. No user/journey/application reset or experiment starts during deployment. Rollback binaries can ignore the new tables; retain collected evidence. Run registry/service tests plus live API lifecycle, assignment, idempotence, scope and hybrid publishing tests in an isolated database. Exercise both member renderers and all admin tabs through Playwright. Never copy production user datasets into the research fixture database.
