import { fetchApi } from "../../../lib/api-client";
import type { OperationsStatsResponse } from "../api/adminApi";
export type OpsSettings = {
  revision: number;
  updatedAt: string | null;
  admissionMode: "OPEN" | "PAUSED" | "LIMITED";
  maxMembers: number;
  cvQuotaMiB: number;
  diskReserveMiB: number;
  uplinkMbps: number;
  activeWarn: number;
  activeCritical: number;
  latencyWarnMs: number;
  latencyCriticalMs: number;
  errorWarnPercent: number;
  errorCriticalPercent: number;
  cpuWarn: number;
  cpuCritical: number;
  memoryWarn: number;
  memoryCritical: number;
};
export type OpsSample = {
  capturedAt: string;
  startedAt: string;
  windowSeconds: number;
  requests: number;
  errors: number;
  clientErrors: number;
  rateLimited: number;
  aborted: number;
  bytesOut: number;
  clientP95Ms: number | null;
  clientSamples: number;
  activeUsers: number;
  inFlight: number;
  p95Ms: number | null;
  errorPercent: number | null;
  rps: number;
  host: {
    cpu: number | null;
    memory: number | null;
    memoryTotalBytes: number | null;
    memoryAvailableBytes: number | null;
    swapUsedBytes: number | null;
    swapTotalBytes: number | null;
    diskFreeBytes: number | null;
    diskTotalBytes: number | null;
    rootFreeBytes: number | null;
    txMbps: number | null;
    rxMbps: number | null;
    source: string;
    available: boolean;
  };
  process: {
    rssBytes: number;
    cpuPercent: number;
    eventLoopP95Ms: number;
    uptimeSeconds: number;
  };
  database: {
    available: boolean;
    pingMs: number | null;
    connections: number | null;
    maxConnections: number | null;
    sizeBytes: number | null;
  };
  services: {
    frontend: { available: boolean | null; ms: number | null };
    tunnel: { available: boolean | null; ms: number | null };
  };
  routes: {
    route: string;
    method: string;
    requests: number;
    errors: number;
    p95Ms: number | null;
  }[];
};
export type OpsPoint = {
  time: string;
  active: number | null;
  rps: number;
  p95: number | null;
  clientP95: number | null;
  errors: number | null;
  cpu: number | null;
  memory: number | null;
  tx: number | null;
  rx: number | null;
  cvMiB: number | null;
  requests: number;
  rateLimited: number;
  bytesOut: number;
  samples: number;
};
export type OpsOverview = {
  generatedAt: string;
  settings: OpsSettings;
  members: number;
  storage: {
    bytes: number;
    files: number;
    diskAvailableBytes: number;
    diskTotalBytes: number;
  };
  latest: OpsSample | null;
  series: OpsPoint[];
  peaks: {
    active: { value: number; at: string } | null;
    rps: { value: number; at: string } | null;
    latency: { value: number; at: string } | null;
  };
  coverage: {
    first: string | null;
    last: string | null;
    persistedAt: string | null;
    stale: boolean;
    sampleSeconds: number;
    retentionDays: number;
    bucketMinutes: number;
  };
  alerts: {
    key: string;
    severity: "OK" | "UNKNOWN" | "WARNING" | "CRITICAL";
    value: number | null;
    warn: number;
    critical: number;
  }[];
  audit: {
    id: string;
    revision: number;
    createdAt: string;
    next: OpsSettings;
  }[];
  mail: OperationsStatsResponse["notifications"];
  maintenance: OperationsStatsResponse["noResponseProcessor"];
};
export const operationsApi = {
  overview: (minutes: number) =>
    fetchApi<OpsOverview>("/admin/operations/overview", {
      params: { minutes },
    }),
  save: (settings: OpsSettings) => {
    const { updatedAt, ...body } = settings;
    return fetchApi<OpsSettings>("/admin/operations/settings", {
      method: "PATCH",
      body,
    });
  },
};
