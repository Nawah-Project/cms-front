# Journey observatory

The journey-map tab is a research workspace for understanding current progress, inspecting prerequisites and tracking follow-up. It reads saved progress without evaluating or advancing the member journey. Other analytics tabs and the ordinary member flow retain their existing behavior.

## Questions the workspace answers

| Research question | Evidence and interaction |
| --- | --- |
| Where is everyone, a cohort, or one member? | Current-state overlays, cohort/member lens, weekly phase totals, individual trace and dated timeline. |
| What does each stage actually require? | Task zero followed by four weekly swimlanes, five quests and review/final report. Tailored applications, posts and outreach have separate lanes. Guidance branches follow configured unlock nodes; conditional interview guidance stays separate. |
| Where should we investigate first? | A sortable station table and searchable investigation queue separate incomplete work, required guides, CV prerequisites, scheduled waits and unknown states. The inactivity threshold is configurable. |
| Is guidance reaching members and followed by work? | Unlocked/read denominators and dated subsequent CV, post or outreach actions where measurable. Unmeasured action rates remain absent rather than being presented as zero. |
| Is the journey moving? | Calendar-day transition counts, distinct transition users, saved station completions and median dwell with paired timestamp sample counts. |
| What will we do with a finding? | Persist a station-linked research question, possible friction or opportunity; assign an admin owner, record the validation action, and move through Open / Validating / Resolved. Each note preserves a server-generated metric snapshot. |

## Measurement boundaries

Current positions and saved completions use all available saved state; changing the 7/30/90-day history lens does not hide members. Historical transition and duration charts use real `journey.node_completed` events within the selected UTC calendar dates. A duration requires adjacent matching entry/exit events. No completion dates are reconstructed for old accounts. Dwell includes calendar waiting and is not a measure of active effort.

Scheduled waits are separated from investigation priority. Inactivity means no recorded work for the chosen threshold; it is not evidence of abandonment or its cause. Latest application updates are not treated as work because background jobs may update them. Missing/unknown states are explicitly visible and cannot silently receive findings attached to a different station.

Reading guidance followed by later work is a temporal association, not proof that the guidance caused it. Read counts can include legacy saved reading states, while action-after-read requires an actual dated read. Individual CV history exposes the latest two version timestamps only; the map never includes CV file contents. It does not infer emotions or motivations from usage counts.

## Interaction

Hold the right mouse button and move the wheel to zoom. Plain wheel scrolling remains page scrolling. Drag empty canvas to pan; use the minimap, keyboard arrows, +/- and 0 as alternatives. Zoom is bounded to 50–165%. Readable View fits width rather than shrinking the entire vertical map into unreadable tiles. Week Overview is a separate semantic view and the initial mobile view. Selecting a week expands that phase; selecting a station opens its evidence inspector.

Notes are private admin research records. Saving one does not send a message or notification and does not change applications, CVs, guide progress or journey state. Status updates use optimistic concurrency; a stale update is rejected for refresh instead of silently overwriting a colleague's work.

## Architecture

`JourneyObservatory` owns research scope and queries. `JourneyBlueprint` owns camera interactions and renders a pure `buildBlueprint` layout. `JourneyTopologyCanvas` is the compatibility entry point for the admin tab. The independent `/admin/ux-lab/v2/journey-map` API aggregates read-only saved state; `/journey-observations` persists research records in an additive table. JWT authentication and the existing admin guard protect all routes.

Checks: pure layout invariants, classifier tests, live isolated API cases (including old applications and saved guide steps), data fingerprints, restart persistence and real browser mouse/keyboard, Arabic/English and mobile checks. QA fixtures are synthetic; real production data is never restored into QA.

## Research basis

- [Google HEART: user-centered metrics](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/): start with a research goal, then identify observable signals and appropriate metrics.
- [NN/g: Journey Mapping for UX Practitioners](https://www.nngroup.com/articles/journey-mapping-ux-practitioners/): make a map useful for action through opportunities, ownership and measurement.
- [NN/g: Research for Journey Mapping](https://www.nngroup.com/articles/research-journey-mapping/): combine quantitative signals with research rather than inventing motivations or emotions from event counts.
- [Amplitude: Understand journey visualizations](https://www.amplitude.com/docs/analytics/charts/journeys/journeys-understand-visualizations): inspect scoped journeys and timing while keeping measurement assumptions visible.
