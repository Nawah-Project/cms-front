# Admin daytime identity and Founder night review

The administrator interface uses the same daytime role tokens and generic controls as the member interface: ivory canvas, white surfaces, forest green actions, blue information/comparison, gold emphasis and IBM Plex Sans Arabic. Existing member layouts remain scoped to members. Consulting, operations, marketing, journey, UX Lab and the two integrated workspaces resolve their presentation roles to this palette.

## Founder-only night pilot

Only `/admin/founder-workspace` and its subviews activate the night palette. Warm ivory text sits on charcoal forest surfaces; lighter green is for text, while stronger green is retained for filled actions. Blue and gold retain their semantic roles. Borders and focus indicators are distinct from decorative dividers. The ordinary admin sidebar is retained.

The local controls offer Dark, Light and System. Dark is the initial preference for this review. The whitelisted preference is stored under `nawah.founder.appearance.v1`, separately from documents, account data and API revisions. Blocked browser storage falls back to a session preference. System changes and cross-tab preference changes do not remount the workspace or save its document.

A constant pre-paint bootstrap checks the exact route and preference whitelist. Route cleanup removes the theme attribute. Other administrative sections and the member interface keep their daytime presentation, even after selecting Dark in Founder. There is no global dark class and no general night-mode rollout in this release.

## Validation and limits

`node --test scripts/founder-appearance-checks.mjs` checks normal-text role pairs at 4.5:1, controls/focus/connectors at 3:1, preference whitelisting and isolated bootstrap behavior. These checks cover selected palette pairs, not a claim of complete WCAG conformance. `scripts/qa/founder-appearance.cjs` is the reproducible browser harness (`QA_WEB`, `PLAYWRIGHT_MODULE`, `SOURCE_ROOT` and `QA_OUTPUT` select the disposable runtime, browser tools, fixtures and evidence directory). Browser QA uses synthetic data and verifies all five Founder views, open drafts, refresh, blocked storage, cross-tab and system changes, Arabic/English, phone/tablet/desktop, native form colors and the absence of night styling outside Founder.

Reference: [WCAG text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [native control color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme).

No schemas, permissions, workspace documents or backend behavior change. Publication uses the existing hosted build and approved admin-image deployment. Extending night mode to other sections requires the user's review of this pilot.
