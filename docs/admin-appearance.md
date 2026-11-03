# Administrative appearance

All `/admin` routes share the member daytime identity and the approved forest-charcoal night palette. Dark, Light and System controls are owned by the administration layout, so changing sections retains the preference and does not remount domain workspaces or save their documents. Member routes remain daytime.

The whitelisted browser preference `nawah.admin.appearance.v1` takes precedence over the previous Founder pilot preference. If only the pilot preference exists it is adopted without changing the old key. Default is Dark. Storage failures keep a session preference and show a status message; changes in system appearance and other tabs are observed. A constant route-checked pre-paint bootstrap avoids a bright initial render. Cleanup removes the attribute when leaving administration.

Shared `--n-*` tokens define canvas, surface, raised surface, text, muted text, actions, focus, borders, charts and statuses. Legacy domain styles use `--admin-*` roles with their original literal as the daytime fallback. Only administration night defines those aliases; shared consulting/member styles keep their daytime values. Green text is separate from filled green actions, as are blue/red/gold filled controls. Utility adapters target exact existing class tokens without enabling dormant Tailwind dark variants. Native controls, portals, graph labels, tooltip surfaces and both integrated ShadowRoot workspaces follow the palette. ShadowRoot is style isolation, not authorization.

No backend, permission, database or saved-document changes are made. Deploy the administrator image through the existing hosted build, approval, rate-limited download and health-check workflow. Retain the previous image for rollback.

Validation:

- TypeScript and `node --test scripts/*checks.mjs` include palette contrast, route/bootstrap isolation, storage behavior and migration from the pilot preference.
- `scripts/qa/admin-appearance.cjs` with synthetic fixtures checks all five Founder views, the other admin sections, charts, operating-control dialog, draft persistence, blocked storage, system/cross-tab behavior, refresh, Arabic/English and responsive layouts. `QA_WEB`, `PLAYWRIGHT_MODULE`, `SOURCE_ROOT` and `QA_OUTPUT` select a disposable runtime, tools, fixtures and evidence location. No production token or private record is used.
- Run the same harness against the hosted image via the member gateway, then against the production deployment with API responses intercepted. HTTP health and runtime/data fingerprints are verified separately. Appearance testing is not a new audit of unchanged backend authorization.

Selected role pairs are tested at 4.5:1 for normal text and 3:1 for control indicators/connectors, not a claim of complete WCAG conformance. References: [WCAG text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html), [native color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme).
