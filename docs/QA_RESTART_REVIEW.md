# Synthetic QA restart review — 2026-10-26

At the user's explicit request, only Nawah Synthetic QA was reset to the verified-email, incomplete-profile state. A private scoped backup was taken first; email verification and authentication settings were preserved.

A real production browser flow then completed specialization, portfolio and CV upload, opened the LinkedIn action, saved one clearly named synthetic test application, dismissed the optional task hint using Got it, refreshed without replaying the mandatory tour, and opened the current tasks manually. No API requests or writes were mocked. Final state: one application, one CV version, Week 0 / TASK_0, group still locked. No API or browser runtime errors were observed.

Visual inspection identified and corrected three small issues: the CV size hint now receives its interpolation value; the mobile task drawer clears the sticky header while retaining its desktop placement; numeric progress fractions explicitly use left-to-right direction inside the Arabic layout.

TypeScript and all 18 frontend stabilization tests passed, including the empty-CV hint check. Final drawer verification is read-only and does not reset the account or add applications.
