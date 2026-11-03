# Independent member and administrator frontends

## Build composition

`NAWAH_FRONTEND_APP=member|admin` selects production routes and runtime; omitted/combined is for development and global type generation. A single source repository produces independent images and candidate approvals:

- `nawah/frontend:sha-COMMIT`: member routes, authentication, onboarding, journey and member consulting.
- `nawah/admin:sha-COMMIT`: administrative routes and founder workspace; no programme page routes.

The member image is actually built **after removing `src/app/features/admin` and the founder public assets inside the disposable builder**. A new accidental dependency therefore fails the build. `check-frontend-bundle.mjs` verifies compiled route IDs and asset exclusion. This does not change the local checkout or remove existing shared domain resources needed by admin workflows.

Shared permission helpers, loading state, performance observer, and recipient view contracts were removed from the admin implementation boundary. Admin-only feedback/guidance editors were moved into admin; the legacy mixed feedback page sends administrators to `/admin/feedback`. The shared feedback reader receives an administrative loader explicitly rather than importing an admin API.

## Same URLs and account

The member process remains on the existing public frontend origin. It streams `/admin`, `/admin/*`, `/admin-assets/*`, and `/founder-workspace/*` to the administrator container over the existing Docker network. Account cookies and API origin stay the same; the gateway does not read JWT secrets or decide business permissions. The API rechecks authorization.

Admin Vite assets use a separate `/admin-assets/` base. Shared navigation uses full document navigation only when crossing application boundaries; normal in-app navigation stays client-side. A root location guard covers shared programmatic auth redirects. If the admin process is unavailable, its routes return a clear 503 while member routes continue.

The gateway proxy preserves path, query, cookies and response status/headers, strips hop-by-hop headers, uses a fixed configured internal target, handles aborts, and has a bounded timeout. Both frontend processes preserve the patched Node/runtime baseline and protected metrics; admin metrics have their own service label.

## Founder workspace

`/admin/founder-workspace` is a protected full-page workspace, using an independent view document under the admin frontend. It keeps its task model and scheduling engine detached from React and the existing admin pages. A visible link returns to the main admin area.

Its persistence adapter uses credentialed API calls, actual backend READ/WRITE capability, revisions and stable request IDs. First-tab bootstrap is account-scoped/idempotent across windows. No plan content, draft, participant material, or auth token is persisted in browser storage. Failed saves keep the form and offer draft export; conflicting changes are not silently replaced. Cross-tab broadcasts contain revision metadata only.

The reviewed local-preview JSON can be imported explicitly into the authenticated workspace after validation. No automatic browser-account migration or sharing occurs. Evidence remains text/link-based. The consulting practice guide links to the existing consulting workspace without copying client data or writing case/Journey state.

## Delivery and rollback

GitHub builds/tests both images. Frontend candidate tags keep the existing `build-SHA-RUN-ATTEMPT` format; admin uses `build-admin-SHA-RUN-ATTEMPT`. Approval requires the chosen component and an already successful main build. Admin promotion does not replace the member repository's latest frontend release. The local release agent maintains an independent admin slot and still rate-limits and checksums each archive.

Roll out API, then admin, then the member gateway. On first installation an old known-good frontend image can bootstrap the internal admin slot before replacing it through the approved release path. Existing routes continue working during transition. Rollback keeps data and previous component images; additional Prisma tables remain. Do not rebuild images or recreate PostgreSQL/CV volumes on the production host.

This is separation of frontend deployment and the founder domain, not wholesale migration of the backend into microservices or a change in public-source privacy.
