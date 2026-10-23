import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminApi,
  type AdminActivity,
  type AdminGroup,
  type AdminMember,
  type AdminOverview,
  type AttentionItem,
} from "./api/adminApi";
import { AdminActivityList } from "./components/AdminActivityList";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { useI18n } from "../../i18n";
import {
  AttentionReasonBadges,
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  PageHeading,
  relativeTime,
} from "./components/AdminUI";
import { SparklesIcon } from "../../components/Icons";
import { useToast } from "../../components/ui/ToastProvider";
import {
  useUxExperiment,
  getUxEvents,
  isValidVariant,
  type ExperimentVariant,
} from "../../utils/uxAnalytics";

export default function AdminOverviewPage() {
  const { t, tp, number, locale } = useI18n();
  const { variant, adminPreview, setVariant, refreshAssignment } =
    useUxExperiment("dashboard_layout_v2");
  const toast = useToast();
  const [data, setData] = useState<{
    overview: AdminOverview;
    groups: AdminGroup[];
    activity: AdminActivity[];
    attention: AttentionItem[];
    uxMetrics?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [groupVariants, setGroupVariants] = useState<
    Record<string, ExperimentVariant>
  >({});
  const [defaultVariant, setDefaultVariant] =
    useState<ExperimentVariant>("B");
  const [savingConfig, setSavingConfig] = useState(false);
  const [showUxSettings, setShowUxSettings] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(
    null,
  );
  const [feedbackTarget, setFeedbackTarget] = useState<AdminMember | null>(
    null,
  );
  const load = () => {
    setLoading(true);
    setError(false);
    void Promise.all([
      adminApi.overview(),
      adminApi.groups(),
      adminApi.activity(6),
      adminApi.attention(8).catch(() => ({ total: 0, items: [] })),
      adminApi.uxAnalytics().catch(() => null),
    ])
      .then(([overview, groups, activity, attention, uxMetrics]) =>
        setData({
          overview,
          groups: groups.items,
          activity: activity.items,
          attention: attention.items ?? [],
          uxMetrics,
        }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const config = data?.uxMetrics?.config;
    if (!config) return;
    setVideoUrlInput(
      typeof config.introVideoUrl === "string" ? config.introVideoUrl : "",
    );
    if (isValidVariant(config.defaultVariant)) {
      setDefaultVariant(config.defaultVariant);
    }
    if (config.groupVariants && typeof config.groupVariants === "object") {
      setGroupVariants(config.groupVariants);
    }
  }, [data]);
  if (loading) return <LoadingState label={t("admin.loadingOverview")} />;
  if (error || !data) return <ErrorState onRetry={load} />;

  const targetMembers = 50;
  const acquisitionPercent = Math.min(
    100,
    Math.round((data.overview.usersCount / targetMembers) * 100),
  );
  const uxEvents = getUxEvents();
  const localCount = (eventName: string) =>
    uxEvents.filter((e) => e.name === eventName || (e as any).event === eventName).length;

  const backendOnboardingStartedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_started ??
    data.uxMetrics?.totalsByEvent?.onboarding_started;
  const onboardingStartedCount =
    backendOnboardingStartedCount ??
    (localCount("onboarding_started") || data.overview.usersCount);

  const backendOnboardingCompletedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_completed ??
    data.uxMetrics?.totalsByEvent?.onboarding_completed;
  const onboardingCompletedCount =
    backendOnboardingCompletedCount ??
    (localCount("onboarding_completed") || data.overview.activeUsersCount);

  const videoWatchedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_video_watched ??
    data.uxMetrics?.totalsByEvent?.onboarding_video_watched ??
    localCount("onboarding_video_watched");

  const onboardingCompletionPercent =
    onboardingStartedCount > 0
      ? Math.min(
          100,
          Math.round((onboardingCompletedCount / onboardingStartedCount) * 100),
        )
      : 0;

  const videoWatchPercent =
    data.overview.usersCount > 0
      ? Math.min(
          100,
          Math.round((videoWatchedCount / Math.max(1, data.overview.usersCount)) * 100),
        )
      : 0;

  const variants: ExperimentVariant[] = ["A", "B", "C"];
  const variantLabels: Record<ExperimentVariant, string> = {
    A: t("admin.variantA"),
    B: t("admin.variantB"),
    C: t("admin.variantC"),
  };
  const interactionEvents = new Set([
    "application_created",
    "task_status_changed",
    "feedback_read",
  ]);
  const variantInteractions = Object.fromEntries(
    variants.map((item) => [
      item,
      data.uxMetrics?.abTestSummary?.[item]?.interactionsCount ??
        uxEvents.filter(
          (event) => event.variant === item && interactionEvents.has(event.name),
        ).length,
    ]),
  ) as Record<ExperimentVariant, number>;
  const totalVariantInteractions = variants.reduce(
    (total, item) => total + variantInteractions[item],
    0,
  );
  const variantInteractionShares = Object.fromEntries(
    variants.map((item) => [
      item,
      totalVariantInteractions > 0
        ? Math.round(
            (variantInteractions[item] / totalVariantInteractions) * 100,
          )
        : 0,
    ]),
  ) as Record<ExperimentVariant, number>;

  const applySavedConfig = (config: {
    defaultVariant: ExperimentVariant;
    groupVariants: Record<string, ExperimentVariant>;
    introVideoUrl: string;
  }) => {
    setDefaultVariant(config.defaultVariant);
    setGroupVariants(config.groupVariants);
    setVideoUrlInput(config.introVideoUrl);
    setData((current) =>
      current
        ? {
            ...current,
            uxMetrics: { ...current.uxMetrics, config },
          }
        : current,
    );
  };

  const saveDefaultVariant = async (next: ExperimentVariant) => {
    setSavingConfig(true);
    try {
      const config = await adminApi.updateUxConfig({ defaultVariant: next });
      applySavedConfig(config);
      void refreshAssignment();
      toast.success(t("admin.uxConfigSaved"));
    } catch {
      toast.error(t("admin.uxConfigSaveFailed"));
    } finally {
      setSavingConfig(false);
    }
  };

  const saveGroupVariant = async (
    groupId: string,
    next: ExperimentVariant,
  ) => {
    setSavingConfig(true);
    try {
      const config = await adminApi.updateUxConfig({
        groupVariants: { ...groupVariants, [groupId]: next },
      });
      applySavedConfig(config);
      void refreshAssignment();
      toast.success(t("admin.uxConfigSaved"));
    } catch {
      toast.error(t("admin.uxConfigSaveFailed"));
    } finally {
      setSavingConfig(false);
    }
  };

  const saveIntroVideo = async () => {
    setSavingConfig(true);
    try {
      const config = await adminApi.updateUxConfig({
        introVideoUrl: videoUrlInput.trim(),
      });
      applySavedConfig(config);
      void refreshAssignment();
      toast.success(t("admin.uxConfigSaved"));
    } catch {
      toast.error(t("admin.uxConfigSaveFailed"));
    } finally {
      setSavingConfig(false);
    }
  };

  const stat = (label: string, value: number, note?: string, tone = "") => (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>
        {number(value)}
      </p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
  const journeySummary = data.overview.journey;
  const maxWeekMembers = Math.max(
    1,
    ...(journeySummary?.weeks.map((item) => item.members) ?? [1]),
  );

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow={t("admin.operations")}
        title={t("admin.overviewTitle")}
        description={t("admin.overviewDescription")}
      />

      {/* 1. Operational Workspace Totals */}
      <section
        aria-label={t("admin.workspaceTotals")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stat(
          t("admin.totalUsers"),
          data.overview.usersCount,
          tp("admin.unassignedCount", data.overview.unassignedUsersCount),
          "text-info-strong",
        )}
        {stat(
          t("admin.groupsCount"),
          data.overview.groupsCount,
          tp("admin.assignedMembers", data.overview.membershipsCount),
          "text-info-strong",
        )}
        {stat(
          t("admin.activeUsers"),
          data.overview.activeUsersCount,
          t("admin.activityLast3Days"),
          "text-success-strong",
        )}
        {stat(
          t("admin.warningUsers"),
          data.overview.warningUsersCount,
          t("admin.inactive3to6Days"),
          "text-warning-strong",
        )}
        {stat(
          t("admin.criticalUsers"),
          data.overview.criticalUsersCount,
          t("admin.inactive7Days"),
          "text-danger-strong",
        )}
        {stat(
          t("admin.neverActiveUsers"),
          data.overview.neverActiveUsersCount,
          t("admin.noApplicationsYet"),
          "text-neutral-700 dark:text-neutral-300",
        )}
        {stat(
          t("admin.applications"),
          data.overview.applicationsCount,
          t("admin.acrossMembers"),
          "text-info-strong",
        )}
        {stat(
          t("admin.groupsWithSpace"),
          data.groups.filter((group) => group.availableSlots > 0).length,
          t("admin.capacityAvailable"),
          "text-success-strong",
        )}
      </section>

      {/* 2. Journey Engine V4 Funnel */}
      {journeySummary && (
        <section
          aria-label={t("admin.journeyFunnelTitle")}
          className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t("admin.journeyFunnelTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                {t("admin.journeyFunnelSubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="status-badge status-info">
                {t("admin.journeyStartedCount", {
                  count: number(journeySummary.startedCount),
                })}
              </span>
              <span className="status-badge status-warning">
                {t("admin.journeyNotStartedCount", {
                  count: number(journeySummary.notStartedCount),
                })}
              </span>
              <span className="status-badge status-success">
                {t("admin.journeyFinishedCount", {
                  count: number(journeySummary.finishedCount),
                })}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {journeySummary.weeks.map((item) => {
              const label =
                item.week === 0
                  ? t("admin.journeyWeek0")
                  : t("admin.journeyWeekN", { week: number(item.week) });
              const barPct = Math.round((item.members / maxWeekMembers) * 100);
              return (
                <div
                  key={item.week}
                  className="rounded-xl border border-border-subtle bg-neutral-50/70 p-3.5 dark:bg-neutral-900/50"
                >
                  <p className="text-xs font-medium text-neutral-500">{label}</p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {number(item.members)}
                  </p>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all ${item.week === 0 ? "bg-warning-strong" : "bg-info-strong"}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Needs Intervention Now (Action Queue) */}
      <section
        aria-label={t("admin.attentionTitle")}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {t("admin.attentionTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t("admin.attentionSubtitle")}
            </p>
          </div>
          <Link
            to="/admin/members"
            className="text-xs font-medium text-info-strong hover:underline"
          >
            {t("admin.members")} ←
          </Link>
        </div>
        {!data.attention.length ? (
          <EmptyState>{t("admin.attentionEmpty")}</EmptyState>
        ) : (
          <div className="divide-y divide-border-subtle">
            {data.attention.map(({ member, reasons }) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Initials name={member.name} avatar={member.avatar} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(member)}
                        className="truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {member.name}
                      </button>
                      <span className="text-xs text-neutral-500">
                        · {member.group?.name ?? t("common.unassigned")}
                      </span>
                      <JourneyBadge journey={member.journey} compact />
                    </div>
                    <div className="mt-1.5">
                      <AttentionReasonBadges reasons={reasons} />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackTarget(member)}
                    className="button-primary px-3 py-1.5 text-xs"
                  >
                    {t("admin.quickFeedback")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="button-secondary px-3 py-1.5 text-xs"
                  >
                    {t("admin.quickInspect")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Group Status & Capacity */}
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.groupStatus")}</p>
            <h3 className="mt-1 text-lg font-semibold">
              {t("admin.capacityActivity")}
            </h3>
          </div>
          <Link
            to="/admin/groups"
            className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
          >
            {t("admin.allGroups")}
          </Link>
        </div>
        {!data.groups.length ? (
          <EmptyState>{t("admin.noGroups")}</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="hidden grid-cols-[minmax(9rem,1.4fr)_1fr_1fr_1fr] gap-4 border-b border-border bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-500 dark:bg-neutral-900 sm:grid">
              <span>{t("admin.group")}</span>
              <span>{t("admin.capacity")}</span>
              <span>{t("admin.lastActivity")}</span>
              <span>{t("admin.memberStatus")}</span>
            </div>
            {data.groups.map((group) => (
              <div
                key={group.id}
                className="grid gap-2 border-b border-border-subtle px-4 py-4 last:border-0 sm:grid-cols-[minmax(9rem,1.4fr)_1fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-neutral-500 sm:hidden">
                    {t("admin.memberCapacity", { members: group.memberCount, capacity: group.capacity })}
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    {t("admin.memberCapacity", { members: group.memberCount, capacity: group.capacity })}
                  </p>
                  <div className="mt-2 h-1.5 w-36 max-w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-700"
                      style={{
                        width: `${Math.min(100, (group.memberCount / Math.max(1, group.capacity)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`text-xs ${group.availableSlots ? "text-success-strong" : "text-neutral-500"}`}
                  >
                    {group.availableSlots
                      ? tp("common.spotCount", group.availableSlots)
                      : t("admin.full")}
                  </p>
                </div>
                <p className="text-xs text-neutral-500">
                  {t("admin.groupLastActivity", { time: relativeTime(group.lastActivityAt, locale) })}
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="status-badge status-success">
                    {tp("admin.statusCount", group.activeMembers, { status: t("admin.active") })}
                  </span>
                  <span className="status-badge status-warning">
                    {tp("admin.statusCount", group.warningMembers, { status: t("admin.warning") })}
                  </span>{" "}
                  <span className="status-badge status-danger">
                    {tp("admin.statusCount", group.criticalMembers, { status: t("admin.critical") })}
                  </span>
                  {group.neverActiveMembers > 0 && (
                    <span className="status-badge status-neutral">
                      {tp("admin.statusCount", group.neverActiveMembers, { status: t("admin.neverActiveShort") })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Recent Activity */}
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.recentChanges")}</p>
            <h3 className="mt-1 text-lg font-semibold">{t("admin.recentActivity")}</h3>
          </div>
          <Link
            to="/admin/activity"
            className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
          >
            {t("admin.viewActivity")}
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 sm:px-5">
          <AdminActivityList items={data.activity} />
        </div>
      </section>

      {/* 6. UX & Growth Targets + Experiment Settings */}
      <section
        aria-label={t("admin.uxGrowthSectionTitle")}
        className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-soft text-info-strong">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {t("admin.uxGrowthSectionTitle")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("admin.currentExperimentVariant", {
                  variant: variantLabels[variant],
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-text-secondary">
              {t("admin.abVariantSwitcher")}: {variantLabels[variant]}
            </span>
            <button
              type="button"
              onClick={() => setShowUxSettings((prev) => !prev)}
              className="button-secondary px-3 py-1.5 text-xs"
            >
              {showUxSettings
                ? t("admin.hideUxSettings")
                : t("admin.showUxSettings")}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: t("admin.acquisitionTarget"),
              value: `${number(data.overview.usersCount)} / 50`,
              percent: acquisitionPercent,
              subtitle: t("admin.acquisitionProgress", {
                count: number(data.overview.usersCount),
                percent: number(acquisitionPercent),
              }),
              color: "bg-info-strong",
              variantBreakdown: false,
            },
            {
              title: t("admin.onboardingCompletionRate"),
              value: `${number(onboardingCompletionPercent)}%`,
              percent: onboardingCompletionPercent,
              subtitle: t("admin.funnelCompleted", {
                count: number(onboardingCompletedCount),
                percent: number(onboardingCompletionPercent),
              }),
              color: "bg-success-strong",
              variantBreakdown: false,
            },
            {
              title: t("admin.videoWatchRate"),
              value: `${number(videoWatchPercent)}%`,
              percent: videoWatchPercent,
              subtitle: t("admin.funnelViews", {
                count: number(videoWatchedCount),
              }),
              color: "bg-info-strong",
              variantBreakdown: false,
            },
            {
              title: t("admin.abMetricsComparison"),
              value: number(totalVariantInteractions),
              percent: totalVariantInteractions > 0 ? 100 : 0,
              subtitle: t("admin.totalVariantInteractions"),
              color: "bg-success-strong",
              variantBreakdown: true,
            },
          ].map((target) => (
            <div
              key={target.title}
              className="space-y-2 rounded-xl border border-border/80 bg-neutral-50/50 p-4"
            >
              <p className="text-xs font-medium text-neutral-500">{target.title}</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-neutral-900">
                {target.value}
              </p>
              <div
                className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={target.percent}
                aria-label={target.title}
              >
                {target.variantBreakdown ? (
                  variants.map((item) => (
                    <div
                      key={item}
                      className={`h-full transition-all duration-500 ${item === "A" ? "bg-neutral-500" : item === "B" ? "bg-success-strong" : "bg-info-strong"}`}
                      style={{ width: `${variantInteractionShares[item]}%` }}
                    />
                  ))
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${target.color}`}
                    style={{ width: `${target.percent}%` }}
                  />
                )}
              </div>
              <p className="text-[11px] text-neutral-500">{target.subtitle}</p>
              {target.variantBreakdown && (
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  {variants.map((item) => (
                    <div
                      key={item}
                      className="rounded-md border border-border-subtle bg-surface px-1.5 py-1 text-center text-neutral-600"
                    >
                      <span className="font-semibold">{item}</span>{" "}
                      {number(variantInteractions[item])} ({number(variantInteractionShares[item])}%)
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {showUxSettings && (
          <div className="grid gap-4 lg:grid-cols-3 pt-2 border-t border-border-subtle">
            <section className="space-y-3 rounded-xl border border-border bg-neutral-50/60 p-4">
              <h4 className="text-sm font-semibold text-neutral-900">
                {t("admin.adminPreviewTitle")}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={adminPreview === null}
                  onClick={() => setVariant(null)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${adminPreview === null ? "border-info-strong bg-info-soft text-info-strong" : "border-border bg-surface text-neutral-600"}`}
                >
                  {t("admin.previewByGroup")}
                </button>
                {variants.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={adminPreview === item}
                    onClick={() => setVariant(item)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${adminPreview === item ? "border-info-strong bg-info-soft text-info-strong" : "border-border bg-surface text-neutral-600"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-neutral-50/60 p-4">
              <h4 className="text-sm font-semibold text-neutral-900">
                {t("admin.groupVariantsTitle")}
              </h4>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {[
                  { id: "__default__", name: t("admin.defaultGroupVariant") },
                  ...data.groups.map((group) => ({
                    id: group.id,
                    name: group.name,
                  })),
                ].map((item) => {
                  const selected =
                    item.id === "__default__"
                      ? defaultVariant
                      : groupVariants[item.id] ?? defaultVariant;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700">
                        {item.name}
                      </span>
                      <div className="inline-flex shrink-0 rounded-lg border border-border bg-neutral-50 p-0.5">
                        {variants.map((itemVariant) => (
                          <button
                            key={itemVariant}
                            type="button"
                            disabled={savingConfig}
                            aria-label={`${item.name}: ${itemVariant}`}
                            aria-pressed={selected === itemVariant}
                            onClick={() =>
                              item.id === "__default__"
                                ? void saveDefaultVariant(itemVariant)
                                : void saveGroupVariant(item.id, itemVariant)
                            }
                            className={`min-w-8 rounded-md px-2 py-1 text-xs font-semibold ${selected === itemVariant ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"} disabled:opacity-50`}
                          >
                            {itemVariant}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-neutral-50/60 p-4">
              <h4 className="text-sm font-semibold text-neutral-900">
                {t("admin.introVideoUrl")}
              </h4>
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveIntroVideo();
                }}
              >
                <input
                  type="text"
                  dir="ltr"
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  placeholder={t("admin.introVideoUrlPlaceholder")}
                  maxLength={2048}
                  className="field-control w-full text-sm"
                />
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="button-primary w-full px-3 py-2 text-sm disabled:opacity-50"
                >
                  {t("admin.saveIntroVideo")}
                </button>
              </form>
            </section>
          </div>
        )}
      </section>

      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            load();
          }}
        />
      )}
      {feedbackTarget && (
        <FeedbackFormDialog
          post={null}
          initialTargetUserId={feedbackTarget.id}
          initialTargetName={feedbackTarget.name}
          initialVisibility="DIRECT"
          onClose={() => setFeedbackTarget(null)}
          onSaved={(msg) => {
            setFeedbackTarget(null);
            toast.success(t(`professionalDevelopment.${msg}`));
          }}
        />
      )}
    </div>
  );
}
