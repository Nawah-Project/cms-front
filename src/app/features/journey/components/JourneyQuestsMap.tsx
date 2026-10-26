import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import {
  CheckCircle2,
  Compass,
  ExternalLink,
  FlaskConical,
  Lock,
  Plus,
  Send,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  journeyApi,
  useJourneyState,
  useSubmitSideTask,
} from "../api/journeyApi";
import { journeyQueryKeys } from "../config/query-keys";
import { isNodeInteractive } from "../lib/journey-policies";
import { celebrateJourneyUnlocks } from "../lib/celebrate-unlocks";
import type {
  EnrichedJourneyNode,
  JourneyStateResponse,
  OutreachStatus,
} from "../types";
import { useI18n } from "../../../i18n";
import { useToast } from "../../../components/ui/ToastProvider";
import { useAppModal } from "../../../components/AppModalContext";
import { profileApi } from "../../profile/profileApi";
import { useAuth } from "../../auth/store/authStore";
import { useTour } from "../../applications/components/FirstApplicationGuidedTour";

function getNodeAvailableAt(
  node: EnrichedJourneyNode,
  journeyData: JourneyStateResponse,
) {
  const elapsedDays = journeyData.nodes
    .filter(
      (candidate) =>
        candidate.weekNumber === node.weekNumber &&
        candidate.orderIndex < node.orderIndex,
    )
    .reduce((days, candidate) => days + candidate.durationDays, 0);
  const weeksAfterCurrent = Math.max(
    0,
    node.weekNumber - journeyData.state.currentWeek,
  );
  return new Date(
    new Date(journeyData.state.weekStartedAt).getTime() +
      (weeksAfterCurrent * 7 + elapsedDays) * 24 * 60 * 60 * 1000,
  );
}

function getLockedNodeMessage(
  node: EnrichedJourneyNode,
  journeyData: JourneyStateResponse,
  locale: string,
  isAdmin: boolean,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (isAdmin) return t("journey.fogOfWarOverlay");
  if (node.weekNumber > journeyData.state.currentWeek) return t("journey.completePreviousFirst");

  const incompletePreviousNode = journeyData.nodes.some(
    (candidate) =>
      candidate.weekNumber === node.weekNumber &&
      candidate.orderIndex < node.orderIndex &&
      candidate.status !== "COMPLETED",
  );
  if (incompletePreviousNode) return t("journey.completePreviousFirst");

  const availableAt = getNodeAvailableAt(node, journeyData);
  const availableDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(availableAt);
  return t("journey.nodeAvailableOn", { date: availableDate });
}

function ProgressBar({
  label,
  current,
  required,
  percentage,
  autoSyncHint,
  isObscured = false,
}: {
  label: string;
  current: number;
  required: number;
  percentage: number;
  autoSyncHint?: string;
  isObscured?: boolean;
}) {
  if (required <= 0) return null;
  const clamped = Math.min(100, Math.max(0, percentage));
  const isDone = current >= required;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={`font-medium text-neutral-800 dark:text-neutral-200 ${
            isObscured ? "filter blur-[4.5px] opacity-40 select-none" : ""
          }`}
        >
          {label}
        </span>
        <span
          dir="ltr"
          className={`tabular-nums font-semibold ${
            isDone
              ? "text-success-strong"
              : "text-neutral-700 dark:text-neutral-300"
          } ${
            isObscured ? "filter blur-[5px] opacity-35 select-none" : ""
          }`}
        >
          {current} / {required} ({clamped}%)
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isDone ? "bg-emerald-600" : "bg-neutral-900 dark:bg-neutral-100"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {autoSyncHint && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          {autoSyncHint}
        </p>
      )}
    </div>
  );
}

function ActiveNodeSideTaskForms({
  node,
  onSubmitted,
  compact,
}: {
  node: EnrichedJourneyNode;
  onSubmitted: (nextState: JourneyStateResponse) => void;
  compact: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const submitMutation = useSubmitSideTask();

  // LinkedIn post mini-form state
  const [postUrl, setPostUrl] = useState("");
  const [postSummary, setPostSummary] = useState("");

  // Outreach contact mini-form state
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactMethod, setContactMethod] = useState("LinkedIn");
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>("SENT");

  const handleLinkedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postUrl.trim()) return;
    try {
      await submitMutation.mutateAsync({
        nodeCode: node.code,
        type: "LINKEDIN_POST",
        postUrl: postUrl.trim(),
        postTopic: postSummary.trim() || undefined,
      });
      setPostUrl("");
      setPostSummary("");
      showToast({
        message: t("journey.linkedInPostSaved"),
        variant: "success",
      });
      onSubmitted(await journeyApi.getJourneyState());
    } catch {
      showToast({
        message: t("common.unexpectedError"),
        variant: "error",
      });
    }
  };

  const handleOutreachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !companyName.trim()) return;
    try {
      await submitMutation.mutateAsync({
        nodeCode: node.code,
        type: "OUTREACH_CONTACT",
        contactName: contactName.trim(),
        contactRole: contactRole.trim() || undefined,
        companyName: companyName.trim(),
        contactMethod: contactMethod.trim() || "LinkedIn",
        outreachState: outreachStatus,
      });
      setContactName("");
      setContactRole("");
      setCompanyName("");
      showToast({
        message: t("journey.outreachSaved"),
        variant: "success",
      });
      onSubmitted(await journeyApi.getJourneyState());
    } catch {
      showToast({
        message: t("common.unexpectedError"),
        variant: "error",
      });
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {node.requiredPostsCount > 0 &&
        node.progress.posts.current < node.requiredPostsCount && (
          <form
            onSubmit={handleLinkedInSubmit}
            className="space-y-3 rounded-xl border border-border bg-neutral-50/80 p-3.5 dark:bg-neutral-900/60"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {t("journey.submitLinkedInTitle")}
              </h4>
              <span className="text-[11px] text-neutral-500">
                {node.progress.posts.current}/{node.requiredPostsCount}
              </span>
            </div>
            <div className={`grid grid-cols-1 gap-2.5 ${compact ? "" : "sm:grid-cols-2"}`}>
              <input
                type="url"
                required
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="field-control py-1.5 text-xs"
              />
              <input
                type="text"
                value={postSummary}
                onChange={(e) => setPostSummary(e.target.value)}
                placeholder={t("journey.postSummaryPlaceholder")}
                className="field-control py-1.5 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("journey.submitLinkedInBtn")}</span>
            </button>
          </form>
        )}

      {node.requiredOutreachCount > 0 &&
        node.progress.outreach.current < node.requiredOutreachCount && (
          <form
            onSubmit={handleOutreachSubmit}
            className="space-y-3 rounded-xl border border-border bg-neutral-50/80 p-3.5 dark:bg-neutral-900/60"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {t("journey.submitOutreachTitle")}
              </h4>
              <span className="text-[11px] text-neutral-500">
                {node.progress.outreach.current}/{node.requiredOutreachCount}
              </span>
            </div>
            <div className={`grid grid-cols-1 gap-2.5 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("journey.contactNamePlaceholder")}
                className="field-control py-1.5 text-xs"
              />
              <input
                type="text"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder={t("journey.contactRolePlaceholder")}
                className="field-control py-1.5 text-xs"
              />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("journey.companyNamePlaceholder")}
                className="field-control py-1.5 text-xs"
              />
              <select
                value={outreachStatus}
                onChange={(e) =>
                  setOutreachStatus(e.target.value as OutreachStatus)
                }
                className="field-control py-1.5 text-xs"
              >
                <option value="SENT">{t("journey.outreachSent")}</option>
                <option value="REPLIED">{t("journey.outreachReplied")}</option>
                <option value="REFERRED">
                  {t("journey.outreachReferred")}
                </option>
                <option value="NO_RESPONSE">
                  {t("journey.outreachNoResponse")}
                </option>
              </select>
            </div>
            <input type="hidden" value={contactMethod} />
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("journey.submitOutreachBtn")}</span>
            </button>
          </form>
        )}
    </div>
  );
}

function LockedFogZone({
  lockedMessage,
  children,
  className = "",
}: {
  lockedMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [showHint, setShowHint] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strip yellow lock emoji to ensure pure, elegant typography
  const cleanMessage = lockedMessage.replace(/🔒/g, "").trim();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);

    setShowHint(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowHint(false);
    }, 1800);
  };

  const handleMouseLeave = () => {
    setShowHint(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      aria-label={cleanMessage}
      className={`relative rounded-xl border border-neutral-300/80 bg-neutral-100/50 shadow-inner dark:border-neutral-700/80 dark:bg-neutral-900/50 cursor-pointer select-none transition-colors hover:border-neutral-400 dark:hover:border-neutral-600 ${className}`}
    >
      {/* Inner bounded container with calm static frosted glass */}
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="filter blur-[5px] opacity-30 select-none pointer-events-none p-5"
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Calm Static Frosted Glass Layer */}
        <div
          className="absolute inset-0 backdrop-blur-md bg-white/65 dark:bg-neutral-900/65 border border-neutral-200/80 dark:border-neutral-800 rounded-xl pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Lock & Tooltip container */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20 overflow-visible">
        <div className="relative pointer-events-auto">
          {/* Floating requirement tooltip bubble */}
          {showHint && (
            <div
              role="status"
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-xl bg-neutral-900/95 px-4 py-2 text-center text-xs font-medium text-white shadow-2xl backdrop-blur-md dark:bg-white/95 dark:text-neutral-900 animate-in fade-in zoom-in-95 duration-150 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-neutral-900/95 dark:after:border-t-white/95"
            >
              {cleanMessage}
            </div>
          )}

          {/* Elevated High-Contrast Lock Icon */}
          <div
            className={`flex w-11 h-11 shrink-0 aspect-square items-center justify-center rounded-full bg-white text-neutral-800 shadow-xl border border-white/80 ring-4 ring-neutral-400/25 backdrop-blur-sm dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600 dark:ring-neutral-900/40 transition-transform hover:scale-105 ${
              isShaking ? "animate-lock-wiggle" : ""
            }`}
          >
            <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewStationCard({
  node,
  journeyData,
  onSubmitted,
  compact,
}: {
  node: EnrichedJourneyNode;
  journeyData: JourneyStateResponse;
  onSubmitted: (nextState: JourneyStateResponse) => void;
  compact: boolean;
}) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const submitMutation = useSubmitSideTask();
  const [notes, setNotes] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvUploadedName, setCvUploadedName] = useState<string | null>(null);

  const isCompleted = node.status === "COMPLETED";
  const isActive = isNodeInteractive(node);
  const isLocked = node.status === "LOCKED_BLURRED";
  const lockedMessage = getLockedNodeMessage(
    node,
    journeyData,
    locale,
    user?.role === "ADMIN",
    t,
  );

  const title = locale === "ar" ? node.titleAr : node.titleEn;
  const description = locale === "ar" ? node.descriptionAr : node.descriptionEn;
  const stats = journeyData.weeklyStats;

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    try {
      await profileApi.uploadCv(file);
      setCvUploadedName(file.name);
      showToast({
        message: t("journey.cvUpdatedSuccess"),
        variant: "success",
      });
    } catch {
      showToast({
        message: t("common.unexpectedError"),
        variant: "error",
      });
    } finally {
      setUploadingCv(false);
    }
  };

  const handleCompleteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitMutation.mutateAsync({
        nodeCode: node.code,
        type: "WEEKLY_REVIEW",
        reviewSummary: notes.trim(),
      });
      setNotes("");
      showToast({
        message: t("journey.reviewCompletedToast"),
        variant: "success",
      });
      onSubmitted(await journeyApi.getJourneyState());
    } catch {
      showToast({
        message: t("common.unexpectedError"),
        variant: "error",
      });
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all ${
        isLocked
          ? "border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30"
          : "border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-white to-stone-50 dark:border-amber-700/60 dark:from-amber-950/30 dark:via-neutral-900 dark:to-neutral-900"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                isLocked
                  ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  : "bg-amber-500 text-white"
              }`}
            >
              {node.nodeType === "FINAL_REPORT" ? (
                <Trophy className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isLocked
                      ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                  }`}
                >
                  {node.nodeType === "FINAL_REPORT"
                    ? t("journey.finalReportBadge")
                    : t("journey.day7LabBadge")}
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t("journey.completedStatus")}</span>
                  </span>
                )}
              </div>
              <h3
                className={`mt-1.5 text-base font-bold ${
                  isLocked
                    ? "text-neutral-700 dark:text-neutral-300"
                    : "text-neutral-950 dark:text-neutral-100"
                }`}
              >
                {title}
              </h3>
              {!isLocked && (
                <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-300">
                  {description}
                </p>
              )}
            </div>
          </div>

          {node.unlocksInsightCode && (isCompleted || isActive) && (
            <Link
              to={`/professional-development?guidance=${node.unlocksInsightCode}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs transition hover:bg-amber-50 dark:border-amber-700 dark:bg-neutral-800 dark:text-amber-200"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>{t("journey.openUnlockedInsight")}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Weekly Conversion Metrics or Locked Fog Zone */}
        {isLocked ? (
          <LockedFogZone lockedMessage={lockedMessage} className="mt-4">
            <div className="space-y-3">
              <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400 filter blur-[4.5px] opacity-40 select-none">
                {description}
              </p>
              <div
                className={`grid grid-cols-2 gap-3 ${
                  compact ? "" : "sm:grid-cols-4"
                }`}
              >
                <div className="h-16 rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50" />
                <div className="h-16 rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50" />
                <div className="h-16 rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50" />
                <div className="h-16 rounded-xl bg-neutral-200/50 dark:bg-neutral-800/50" />
              </div>
            </div>
          </LockedFogZone>
        ) : (
          <>
            {(isActive || isCompleted) && (
              <div
                className={`mt-4 grid grid-cols-2 gap-3 ${
                  compact ? "" : "sm:grid-cols-4"
                }`}
              >
                <div className="rounded-xl border border-amber-200/80 bg-white/90 p-3 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <span className="block text-[11px] text-neutral-500">
                    {t("journey.statWeekApps")}
                  </span>
                  <strong className="mt-1 block text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.totalApplications}
                  </strong>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white/90 p-3 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <span className="block text-[11px] text-neutral-500">
                    {t("journey.statTailoredApps")}
                  </span>
                  <strong className="mt-1 block text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.tailoredApplications}
                  </strong>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white/90 p-3 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <span className="block text-[11px] text-neutral-500">
                    {t("journey.statInterviewsResponses")}
                  </span>
                  <strong className="mt-1 block text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stats.interviewsOrResponses}
                  </strong>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white/90 p-3 dark:border-neutral-800 dark:bg-neutral-900/80">
                  <span className="block text-[11px] text-neutral-500">
                    {t("journey.statConversionRate")}
                  </span>
                  <strong className="mt-1 block text-lg font-bold text-amber-700 dark:text-amber-400">
                    {stats.conversionRate}%
                  </strong>
                </div>
              </div>
            )}

            {/* Interactive Lab Form when ACTIVE */}
            {node.nodeType === "FINAL_REPORT" && (isActive || isCompleted) && <Link className="btn-primary mt-4 inline-flex" to="/reports?final=1">{locale === "ar" ? "اقرأ تقرير الرحلة بالكامل" : "Read the complete journey report"}</Link>}
            {isActive && node.nodeType !== "FINAL_REPORT" && (
              <form onSubmit={handleCompleteReview} className="mt-4 space-y-3">
                <div>
                  <label className="field-label text-xs">
                    {t("journey.day7ReflectionLabel")}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("journey.day7ReflectionPlaceholder")}
                    className="field-control text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {uploadingCv
                        ? t("common.loading")
                        : cvUploadedName
                          ? cvUploadedName
                          : t("journey.uploadUpdatedCvBtn")}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleCvUpload}
                      className="sr-only"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="button-primary inline-flex items-center gap-2 px-4 py-2 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("journey.completeReviewUnlockNextBtn")}</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function JourneyQuestsMap({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openAddModal } = useAppModal();
  const { isTourActive, step, setStep } = useTour();
  const queryClient = useQueryClient();
  const { data: journeyData, isLoading, isError, refetch } = useJourneyState();

  const currentWeek = journeyData?.state.currentWeek ?? 0;
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [lockedPopoverWeek, setLockedPopoverWeek] = useState<number | null>(null);
  const [lockedBtnRect, setLockedBtnRect] = useState<DOMRect | null>(null);
  const [wigglingWeek, setWigglingWeek] = useState<number | null>(null);
  const popoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (popoverTimerRef.current) {
        window.clearTimeout(popoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (journeyData?.state.currentWeek !== undefined) {
      setSelectedWeek(journeyData.state.currentWeek);
    }
  }, [journeyData?.state.currentWeek]);

  useEffect(() => {
    if (!journeyData || user?.role === "ADMIN") return;

    const now = Date.now();
    const nextScheduledNode = journeyData.nodes
      .filter((node) => {
        if (node.status !== "LOCKED_BLURRED") return false;
        return journeyData.nodes
          .filter(
            (candidate) =>
              candidate.weekNumber === node.weekNumber &&
              candidate.orderIndex < node.orderIndex,
          )
          .every((candidate) => candidate.status === "COMPLETED");
      })
      .map((node) => getNodeAvailableAt(node, journeyData).getTime())
      .filter((timestamp) => timestamp > now)
      .sort((a, b) => a - b)[0];

    if (!nextScheduledNode) return;

    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: journeyQueryKeys.state(),
      });
    }, nextScheduledNode - now + 250);

    return () => window.clearTimeout(timer);
  }, [journeyData, queryClient, user?.role]);

  if (isError) return <section role="alert" className="rounded-2xl border border-border bg-surface p-5"><p>{locale === 'ar' ? 'تعذر تحميل الرحلة.' : 'Could not load your journey.'}</p><button className="button-primary mt-3" onClick={() => void refetch()}>{locale === 'ar' ? 'حاول تاني' : 'Retry'}</button></section>;
  if (isLoading || !journeyData) {
    return (
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </section>
    );
  }

  const weekNodes = journeyData.nodes.filter(
    (node) => node.weekNumber === selectedWeek,
  );
  const hasActiveTask = weekNodes.some(
    (n) =>
      n.status === "ACTIVE" &&
      n.nodeType !== "REVIEW_STATION" &&
      n.nodeType !== "FINAL_REPORT",
  );
  const completedInWeek = weekNodes.filter(
    (n) => n.status === "COMPLETED",
  ).length;
  const weekProgressPct =
    weekNodes.length > 0
      ? Math.round((completedInWeek / weekNodes.length) * 100)
      : 0;

  const selectWeek = (weekNum: number) => {
    setSelectedWeek(weekNum);
  };

  const showLockedPopover = (
    weekNum: number,
    targetEl?: HTMLElement | null,
    wiggle = false,
  ) => {
    if (wiggle) {
      setWigglingWeek(weekNum);
      setTimeout(() => setWigglingWeek(null), 600);
    }
    if (targetEl) {
      setLockedBtnRect(targetEl.getBoundingClientRect());
    }
    if (popoverTimerRef.current) {
      window.clearTimeout(popoverTimerRef.current);
    }
    setLockedPopoverWeek(weekNum);
    popoverTimerRef.current = window.setTimeout(() => {
      setLockedPopoverWeek(null);
      setLockedBtnRect(null);
    }, 2200);
  };

  const handleDismissLockedPopover = () => {
    if (popoverTimerRef.current) {
      window.clearTimeout(popoverTimerRef.current);
    }
    setLockedPopoverWeek(null);
    setLockedBtnRect(null);
  };

  const getLockedWeekPopoverText = (weekNum: number) => locale === "ar"
    ? `يفتح الأسبوع ${weekNum} بعد إتمام أنشطة ومراجعة الأسبوع السابق. توقيت الإتاحة يتبع تقدمك الفعلي.`
    : `Week ${weekNum} unlocks after completing the preceding week and its review. Availability follows your actual progress.`;

  const getFutureWeekMessage = (weekNum: number) => weekNum > currentWeek ? getLockedWeekPopoverText(weekNum) : null;

  const handleSideTaskSubmitted = (nextState: JourneyStateResponse) => {
    celebrateJourneyUnlocks(journeyData, nextState, t, locale, showToast);
    queryClient.setQueryData(["journey", "state"], nextState);
  };

  return (
    <section
      aria-labelledby="journey-map-heading"
      className={`space-y-5 rounded-2xl ${compact ? "border-0 bg-transparent p-0 shadow-none" : "border border-border bg-surface p-5 shadow-xs sm:p-6"}`}
    >
      {/* Top Header & Week Tabs */}
      <div className={`flex flex-col gap-4 border-b border-border pb-5 ${compact ? "" : "lg:flex-row lg:items-center lg:justify-between"}`}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {t("journey.currentWeekBadge", {
                week: journeyData.state.currentWeek,
              })}
            </span>
          </div>
          <h2
            id="journey-map-heading"
            className="mt-2 text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-100"
          >
            {t("journey.mapTitle")}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t("journey.mapSubtitle")}
          </p>
        </div>

        {/* Week Selector Pills */}
        <div className={`flex items-center gap-1.5 rounded-xl border border-border bg-neutral-50 p-1.5 dark:bg-neutral-900 ${compact ? "max-w-full flex-nowrap overflow-x-auto" : "flex-wrap"}`}>
          {[0, 1, 2, 3, 4].map((weekNum) => {
            const isSelected = selectedWeek === weekNum;
            const isFutureWeek = weekNum > journeyData.state.currentWeek;
            const isLockedPopoverOpen = lockedPopoverWeek === weekNum;
            const isWiggling = wigglingWeek === weekNum;

            return (
              <div
                key={weekNum}
                className="relative"
              >
                <button
                  type="button"
                  onMouseEnter={(e) => {
                    if (isFutureWeek) {
                      showLockedPopover(weekNum, e.currentTarget, false);
                    }
                  }}
                  onMouseLeave={handleDismissLockedPopover}
                  onClick={(e) => {
                    if (isFutureWeek) {
                      showLockedPopover(weekNum, e.currentTarget, true);
                    } else {
                      handleDismissLockedPopover();
                      selectWeek(weekNum);
                    }
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-neutral-900 text-white shadow-2xs dark:bg-white dark:text-neutral-900"
                      : isFutureWeek
                        ? "text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 opacity-80"
                        : "text-neutral-600 hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-800"
                  } ${isWiggling ? "animate-lock-wiggle" : ""}`}
                >
                  <span>
                    {weekNum === 0
                      ? t("journey.weekZeroTab")
                      : t("journey.weekNumberTab", { week: weekNum })}
                  </span>
                  {isFutureWeek && (
                    <Lock
                      className={`h-3 w-3 ${isWiggling ? "text-amber-500" : "opacity-70"}`}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isLockedPopoverOpen && lockedBtnRect && createPortal(
                  <div
                    role="tooltip"
                    onMouseEnter={() => {
                      if (popoverTimerRef.current) window.clearTimeout(popoverTimerRef.current);
                    }}
                    onMouseLeave={handleDismissLockedPopover}
                    className="fixed z-[200] w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-2xl text-start animate-in fade-in zoom-in-95 duration-150 dark:border-neutral-700 dark:bg-neutral-900 pointer-events-auto"
                    style={{
                      top: Math.min(window.innerHeight - 150, lockedBtnRect.bottom + 8),
                      left: locale === "ar"
                        ? Math.max(16, Math.min(window.innerWidth - 270, lockedBtnRect.right - 256))
                        : Math.max(16, Math.min(window.innerWidth - 270, lockedBtnRect.left)),
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-1.5 mb-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>
                        {locale === "ar"
                          ? `الأسبوع ${weekNum} غير متاح حالياً 🔒`
                          : `Week ${weekNum} is currently locked 🔒`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {getLockedWeekPopoverText(weekNum)}
                    </p>
                  </div>,
                  document.body
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Week Progress Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-neutral-50/60 px-4 py-3 dark:bg-neutral-900/50">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <span>
              {selectedWeek === 0
                ? t("journey.weekZeroProgressTitle")
                : t("journey.weekProgressTitle", { week: selectedWeek })}
            </span>
            <span dir="ltr" className="tabular-nums">
              {completedInWeek} / {weekNodes.length} ({weekProgressPct}%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${weekProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Future Week Waiting Notice */}
      {selectedWeek > currentWeek && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 text-xs font-medium text-amber-900 shadow-xs dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{getFutureWeekMessage(selectedWeek)}</span>
        </div>
      )}

      {/* Sequential Nodes List */}
      <div className="space-y-4">
        {weekNodes.map((node) => {
          if (
            node.nodeType === "REVIEW_STATION" ||
            node.nodeType === "FINAL_REPORT"
          ) {
            return (
              <ReviewStationCard
                key={node.code}
                node={node}
                journeyData={journeyData}
                onSubmitted={handleSideTaskSubmitted}
                compact={compact}
              />
            );
          }

          const isCompleted = node.status === "COMPLETED";
          const isActive = isNodeInteractive(node);
          const isLocked = node.status === "LOCKED_BLURRED";
          const lockedMessage = getLockedNodeMessage(
            node,
            journeyData,
            locale,
            user?.role === "ADMIN",
            t,
          );

          const title = locale === "ar" ? node.titleAr : node.titleEn;
          const description =
            locale === "ar" ? node.descriptionAr : node.descriptionEn;

          return (
            <article
              key={node.code}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
                isActive
                  ? "border-2 border-neutral-900 bg-white shadow-sm dark:border-neutral-100 dark:bg-neutral-900"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/15"
                    : isLocked
                      ? "border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40"
                      : "border-border bg-neutral-50/60 dark:bg-neutral-900/40"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{t("journey.completedStatus")}</span>
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                          <span>{t("journey.activeQuestBadge")}</span>
                        </span>
                      )}
                      <span className="text-xs font-medium text-neutral-500">
                        {t("journey.durationDaysLabel", {
                          days: node.durationDays,
                        })}
                      </span>
                    </div>

                    <h3
                      className={`text-base font-bold ${
                        isLocked
                          ? "text-neutral-700 dark:text-neutral-300"
                          : "text-neutral-950 dark:text-neutral-100"
                      }`}
                    >
                      {title}
                    </h3>
                    {!isLocked && (
                      <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                        {description}
                      </p>
                    )}
                  </div>

                  {!isLocked && (
                    <div className="flex flex-wrap items-center gap-2">
                      {isActive && (
                        <button
                          type="button"
                          data-tour-step="journey-add-app-btn"
                          onClick={() => {
                            if (isTourActive && step === 2) {
                              setStep(3);
                            }
                            openAddModal();
                          }}
                          className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t("common.addApplication")}</span>
                        </button>
                      )}

                      {node.unlocksInsightCode && isCompleted && (
                        <Link
                          to={`/professional-development?guidance=${node.unlocksInsightCode}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          <span>{t("journey.openUnlockedInsight")}</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress & Details: Locked Fog Zone if locked, normal otherwise */}
                {isLocked ? (
                  <LockedFogZone lockedMessage={lockedMessage} className="mt-4">
                    <div className="space-y-4">
                      <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400 filter blur-[4.5px] opacity-40 select-none">
                        {description}
                      </p>
                      <div
                        className={`grid grid-cols-1 gap-4 ${
                          compact ? "" : "sm:grid-cols-2"
                        }`}
                      >
                        <ProgressBar
                          label={t("journey.reqGeneralApps")}
                          current={node.progress.apps.current}
                          required={node.requiredAppsCount}
                          percentage={node.progress.apps.percentage}
                          isObscured
                        />
                        <ProgressBar
                          label={t("journey.reqTailoredApps")}
                          current={node.progress.tailored.current}
                          required={node.requiredTailoredCount}
                          percentage={node.progress.tailored.percentage}
                          isObscured
                        />
                        <ProgressBar
                          label={t("journey.reqLinkedInPosts")}
                          current={node.progress.posts.current}
                          required={node.requiredPostsCount}
                          percentage={node.progress.posts.percentage}
                          isObscured
                        />
                        <ProgressBar
                          label={t("journey.reqOutreachContacts")}
                          current={node.progress.outreach.current}
                          required={node.requiredOutreachCount}
                          percentage={node.progress.outreach.percentage}
                          isObscured
                        />
                      </div>
                    </div>
                  </LockedFogZone>
                ) : (
                  <>
                    <div
                      className={`mt-4 grid grid-cols-1 gap-4 ${
                        compact ? "" : "sm:grid-cols-2"
                      }`}
                    >
                      <ProgressBar
                        label={t("journey.reqGeneralApps")}
                        current={node.progress.apps.current}
                        required={node.requiredAppsCount}
                        percentage={node.progress.apps.percentage}
                        autoSyncHint={
                          isActive
                            ? t("journey.autoSyncFromAppsHint")
                            : undefined
                        }
                      />
                      <ProgressBar
                        label={t("journey.reqTailoredApps")}
                        current={node.progress.tailored.current}
                        required={node.requiredTailoredCount}
                        percentage={node.progress.tailored.percentage}
                        autoSyncHint={
                          isActive
                            ? t("journey.autoSyncTailoredFromAppsHint")
                            : undefined
                        }
                      />
                      <ProgressBar
                        label={t("journey.reqLinkedInPosts")}
                        current={node.progress.posts.current}
                        required={node.requiredPostsCount}
                        percentage={node.progress.posts.percentage}
                      />
                      <ProgressBar
                        label={t("journey.reqOutreachContacts")}
                        current={node.progress.outreach.current}
                        required={node.requiredOutreachCount}
                        percentage={node.progress.outreach.percentage}
                      />
                    </div>

                    {/* Inline Side-Task Forms for Active Node */}
                    {isActive && (
                      <ActiveNodeSideTaskForms
                        node={node}
                        onSubmitted={handleSideTaskSubmitted}
                        compact={compact}
                      />
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}

        {/* Fallback Add Application Button when all quests in week are completed or in review station */}
        {!hasActiveTask && (
          <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center bg-neutral-50/60 dark:bg-neutral-900/40">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 font-medium">
              {locale === "ar"
                ? "جميع مهام الأسبوع مكتملة أو في مرحلة التقييم — هل ترغب في تسجيل طلب تقديم إضافي؟"
                : "All week tasks are completed or in review — Log an additional application?"}
            </p>
            <button
              type="button"
              data-tour-step="journey-add-app-btn"
              onClick={() => {
                if (isTourActive && step === 2) {
                  setStep(3);
                }
                openAddModal();
              }}
              className="button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("common.addApplication")}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
