# Responsive entry photo and account removal

`ProfessionalImage` serves the same login/onboarding photo through picture media sources. Phones up to 600 CSS pixels select only 480w (18,000 bytes) or 768w (33,438 bytes), including high-density devices. Tablets select up to 1200w; larger displays can select the original 1536w image. Loader, scenery and fallback video poster share this component so the loader cannot accidentally fetch the desktop source first. Intrinsic dimensions reserve the original aspect ratio. Browser checks used cold contexts at 390px/DPR1, 390px/DPR3, 820px/DPR2 and 1920px/DPR1 for login and onboarding.

Admin Community exposes a separate permanent-delete action for USER rows. A centered confirmation dialog previews affected counts and requires the account email to be typed. Cancellation never sends DELETE. Pending filesystem cleanup is reported separately from completed deletion. The journey task drawer is unchanged.
