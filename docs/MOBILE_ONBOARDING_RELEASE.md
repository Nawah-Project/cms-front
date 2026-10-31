# Mobile onboarding improvements — 2026-10-26

After OTP, the professional profile form now uses one labelled native specialization picker instead of a long grid of cards. It retains English specialization values for job search and displays the selected specialization description. Mobile form spacing is reduced while desktop spacing is retained.

During the required guided tour, Job Explorer shows the LinkedIn action directly with the member's specialization, without the full market/filter/platform list. The full explorer remains available outside the tour. Tour cards use their measured height and the visual viewport, including keyboard resize events. Targets are aligned once per step, rather than continuously forcing scroll. The tour waits for a completed profile before starting.

After a successful first application save, the mandatory tour is recorded as complete. A separate optional spotlight dims the screen and points at the tasks drawer. Open tasks opens the drawer; Got it, Escape, or tapping outside dismisses the prompt without opening it. Dialog focus is contained and the completion state prevents the mandatory tour from replaying on reload. The completion prompt is scoped to the current account.

The shared application-modal context was extracted from the route module to remove the circular route/component dependency during the transition from the task drawer to the application form.

Validation: frontend TypeScript, 18 stabilization tests and a full production build. Browser checks use authenticated read access to the user-authorized Nawah Synthetic QA account. Profile updates, application creation and telemetry writes are simulated/suppressed inside the test browser; the account's existing profile, CV, verification state and five applications are retained. The complete seven-step flow, visible LinkedIn target/card, optional dismissal/open actions, no replay after reload and absence of runtime errors are checked. Screenshots and release details are in /data/cms/mobile-onboarding-review-20261026.

This is a frontend-only release. The backend, databases and development deployment remain unchanged.
