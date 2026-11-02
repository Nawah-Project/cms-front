# Career Consulting: Roadmaps

Admin: `/admin/career-consulting?view=maps`. The fourth entry is staff-only. The generic practice map is fetched from the protected backend; participant-specific preparation is never compiled into public assets. Map data is visible to its owning consulting admin and Root only, using existing CAREER_CONSULTING READ/WRITE checks.

The DOM/SVG map branches between work preferences and search/market evidence, joins at shared understanding, and offers purposeful experiments before recommendation and the person's decision. Stage details explain questions, expected evidence, return conditions, real case tools and printed book locators. Neither the diagram nor its selected stage records participant progress. Selecting a map creates no case, invitation, consent or Journey write.

Private map title/context and stage notes save to the server with revision checks. Unsaved navigation warns; stale edits remain visible and explain how to recover. Repeated saves reuse the request ID for the same attempted payload. Owner maps retain for the explicitly recorded period (90-day UI default), independently of cases, and expire without extending when notes change. Backups follow the existing database backup policy.

Keyboard: focus a stage button and press Enter/Space; focus moves to the stage explanation. Mobile stacks stages without horizontal page scroll; a button expands/collapses the bounded map. Arabic/English and reduced motion use the existing consulting shell. Evidence and dated sources are available on demand so the map stays central. A blocked public profile is labelled unavailable; a closed listing is a requirements example rather than an application lead.

Validation: real browser QA covers branches, keyboard, map expansion, private note persistence after reload, 390px layout, English/LTR, concurrent-edit conflicts, READ UI and member denial. API owner isolation/retention and existing consulting behaviour are covered by backend integration tests. Existing stabilization/design checks and production builds remain required. See the backend `docs/consulting-roadmaps.md` for the schema, API and deployment/rollback contract.
