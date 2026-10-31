# Campaign operations console

The admin `/admin/operations` page uses actual server measurements, persisted every thirty seconds with fourteen-day retention. There is no fabricated historical backfill. Current, missing, initializing and stale data remain distinct. A failed refresh preserves the last available display and marks it stale. Calendar-day peaks and all displayed dates use Africa/Cairo, independently of the selected chart range and the host timezone.

## Measurement contracts

- API traffic, actual final 5xx/4xx/429/aborted responses, successful request latency buckets, bytes written, in-flight requests and normalized route patterns come from Express response finish/close events, including guard failures. Health/metrics/operations probes are excluded from the operating traffic view. URLs, query values, email addresses, form data and response bodies are never stored.
- Active accounts are distinct authenticated ordinary members with successful observed product activity within five minutes. Passive session/notification/assignment polling, administrators and the dedicated QA identity are excluded. Multiple tabs count once. Live activity warms up after API restart; stored history remains.
- Browser API timings use visible-page Resource Timing observations for data requests, excluding auth/admin/operations/CV-file requests. Only bounded numeric durations and an originating account ID for request-boundary validation are transported; IDs and URL strings are not persisted. Account changes discard pending client batches. The server excludes admins/QA and bounds ingestion to sixty observations per account per minute. The graph is API round-trip time, not full page load or Core Web Vitals.
- P95 is estimated from merged latency histogram observations, never an average of per-sample P95s. Values exceeding the finite thirty-second range are displayed as `>30000`, including CSV export. A zero-request window has no latency/error-rate observation, rather than a fake zero. Server error thresholds require twenty requests in the sample; small samples with actual 5xx still produce a warning.
- Host CPU, memory availability, swap, root/data filesystem space and one explicitly configured network device come from the existing read-only node exporter. They cover all host processes, including development workloads. No Docker socket or elevated privileges are exposed to the API. A missing exporter yields null values, not container readings presented as host measurements.
- Network interface traffic can include LAN. Its configurable uplink reference is not a bandwidth speed test or ISP quota meter. Internal frontend HTTP and cloudflared readiness probes do not establish external visitor availability. The database probe reports connectivity, a diagnostic query duration, connections/limit and logical DB size; it is not advertised as user request latency.
- Graph buckets show peak activity/resources/network, average request rate and P95 recomputed from observations. The latest window's slow routes are normalized patterns without concrete member IDs.

## Enforced controls

New-account admission defaults to OPEN to preserve the existing rollout. PAUSED stops creation only; existing password and existing Google sign-in remain available. LIMITED counts ordinary registered accounts, including incomplete/unverified accounts, excluding admins and dedicated QA. The same assignment transaction lock rechecks the cap immediately before account creation for both signup methods. Public registration status exposes only an open boolean; the backend remains authoritative under concurrent requests.

The existing 500 MiB display-only CV figure becomes an enforced, editable allocation. Physical unique PDF files are counted once even when current/history metadata reference the same key; unreferenced files occupy real space and remain included. A shared CV transaction lock serializes budget verification, physical writes and metadata updates. The metadata transaction is reused, avoiding nested transaction/pool deadlocks. Identical content reuses the existing version, and the disk-free reserve is checked separately. Lowering allocation below current physical use is rejected. Increasing allocation does not create filesystem capacity or alter the existing per-file size limit.

Settings use optimistic revisions and an append-only change audit. Changes require an admin and a centered confirmation; thresholds themselves do not automatically pause registrations or stop existing users. Warning/critical values are operating targets, not load-tested capacity claims.

## Mail and maintenance

Mail quotas/OTP reserve remain backed by their existing enforcement. SMTP configuration is not represented as a guarantee of inbox delivery. Recent statuses describe provider acceptance/failure/pending state. Test mail, orphan cleanup and running the no-response processor require explicit confirmation. Cleanup retains referenced current/history documents and the existing grace period. The job remains every fifteen minutes and uses stage age of seven days; the due/next-day count now follows the same stage-transition/application-date rule. A no-response total is labelled by outcome, not asserted to be only automatic job executions.

## Configuration and deployment

`OPS_NODE_EXPORTER_URL`, `OPS_NETWORK_DEVICE`, `OPS_FRONTEND_HEALTH_URL` and `OPS_TUNNEL_READY_URL` are deployment-owned values, not editable arbitrary fetch URLs. Production uses the existing private Docker network and exporter; Prometheus/Grafana need not be started for this page. `OPS_COLLECTOR_ENABLED=false` is a deployment escape hatch. No service-stop/restart shell controls are offered through the UI.

Research basis: Google SRE's traffic/latency/errors/saturation signals, Prometheus histogram aggregation guidance, and Docker's host-versus-container resource distinctions. A decision guide in the product links primary references and explains practical actions and source limitations.
