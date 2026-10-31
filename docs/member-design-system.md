# Nawah Project — member experience

## Design intent

The member journey has four rhythms: orient, act, learn, review. Neutral paper carries the reading, green anchors the action, blue connects supporting information, and gold identifies an earned milestone or the current station. The colours are not quotas and are not assigned one per arbitrary card.

- Primary action and active selection: green, consistent darker hover/pressed states.
- Links, external destinations, supporting data: blue; blue hover surfaces remain pale.
- Progress milestone/current station: limited gold; never gold body text on white.
- Validation/error: semantic red retained. Locked controls include text/icon cues.
- Base canvas: warm paper. Cards: white. Secondary information: restrained green or blue surfaces.

## Code ownership

`src/app/design-system/tokens.css` owns member colour and state roles. `components.css` owns shared controls, field validation, headings, panels, selected states, modals and empty states. `member-pages.css` owns the page composition. All rules are scoped to `body[data-brand-scope="user"]`; admin controls are unchanged.

`Button` and `MemberPageHeader` are React primitives. Existing semantic button classes resolve to exactly the same state rules, allowing incremental migration without duplicating behaviour. Avoid page-local primary/secondary hover colours and arbitrary hex colours in components.

## Page decisions

| Surface | Focus and composition |
| --- | --- |
| Login/register | Keep the approved photography. White form surface, consistent green submit, quiet blue links. |
| Welcome | Keep equal step dimensions and native scrolling behaviour. Same fields, buttons and blue focus ring. |
| Home | Compact three goals into an orientation row; show the next action sooner. All goal cards share one surface. Current-action panel anchors the page in green. Continuous map uses a restrained cool paper ground; gold belongs to the current station. |
| Applications | Shared header with one main add action. Explorer is secondary. Tools sit in a separate white toolbar; columns sit on quiet green paper and cards on white. Status labels retain their meaning. |
| Explorer | Native external anchors and browser long-press preserved. Shared selected states; platform cards have a consistent blue destination cue. |
| Profile | Green identity band, white edit area, blue-tinted CV workspace. Save is the primary action; document viewing is secondary. |
| Guidance | Shared page header; green availability context, white actionable guides. Locked content is quiet and uses the available width. Prompts use a readable blue paper surface; CV action is a distinct green completion step. |
| Group | Shared heading; activity and progress become separate white reading sections. No change to membership or privacy rules. |
| Analytics | Shared page frame; neutral summary cards, blue supporting evidence, green application series, gold change markers. Numeric data and access rules are unchanged. |
| Tasks/dialogs/tours | Preserve drawer dimensions, focus management and journey events. Shared surfaces and semantic controls reduce competition between multiple actions. |

## Component workshop

`/__design-system` renders the actual primitives, form states, selected/disabled controls, statuses, surfaces, empty state, toast and modal. It includes RTL/LTR and interactive keyboard controls. In production it returns 404 unless the isolated preview process explicitly sets `UI_WORKSHOP_ENABLED=1`. It has no real API or database data. This is a local component workshop, not the Storybook package.

## References used

- [USWDS: theme colour roles](https://designsystem.digital.gov/design-tokens/color/theme-tokens/): named roles rather than page-local colours; neutral surfaces are distinct from accent proportions.
- [Carbon: colour usage](https://carbondesignsystem.com/elements/color/usage/): colour roles, hierarchy and consistent interaction states.
- [Storybook: writing stories](https://storybook.js.org/docs/writing-stories): review discrete component states together using the real component.
- [WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4.5:1 for normal text, 3:1 for large text.
- [WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): meaningful control and focus cues need adequate contrast.

## Review protocol

Review every member route in Arabic and English, desktop and phone; include empty/locked/populated states and open dialogs. Check no horizontal page overflow, navigation legibility, consistent control states, keyboard focus, reduced motion and equal welcome-step dimensions. Run journey regressions with mocked API responses; never modify production member data for visual testing. Check the isolated workshop is not exposed on production. Commit and deploy only frontend after review.
