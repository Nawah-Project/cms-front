import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
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
import { useAppModal } from "../../../routes/layout";
import { profileApi } from "../../profile/profileApi";
import { useAuth } from "../../auth/store/authStore";

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

function CloudFogLayer() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
      aria-hidden="true"
    >
      {/* Patchy Ambient Shadow Vignette: Asymmetric density leaving open clearings */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_15%_25%,_rgba(115,115,115,0.3)_0%,_transparent_70%),radial-gradient(ellipse_55%_45%_at_85%_75%,_rgba(82,82,82,0.35)_0%,_transparent_65%)]" />

      {/* Localized Patchy Backdrop Blur: Concentrated around the center lock, leaving perimeter clearings crisp */}
      <div
        className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none"
        style={{
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 48%, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 48%, black 25%, transparent 75%)",
        }}
      />

      {/* Cloud Bank 1 - Heavy Deep Dark-Silver Mass (High density / darker contrast) */}
      <motion.div
        className="absolute -top-12 -right-10 h-40 w-64 rounded-[65%_35%_60%_40%/50%_60%_40%_50%] filter blur-2xl bg-gradient-to-br from-neutral-700/75 via-neutral-600/60 to-transparent dark:from-neutral-700/70 dark:via-neutral-800/50 dark:to-transparent"
        animate={{
          x: [0, -55, 20, 0],
          y: [0, 20, -12, 0],
          scale: [1, 1.22, 0.94, 1],
          opacity: [0.7, 0.88, 0.6, 0.7],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Cloud Bank 2 - Medium Volumetric Silver Mass (Mid-tone density) */}
      <motion.div
        className="absolute -bottom-12 -left-8 h-44 w-68 rounded-[40%_60%_35%_65%/60%_40%_60%_40%] filter blur-2xl bg-gradient-to-tl from-neutral-600/60 via-neutral-500/45 to-transparent dark:from-neutral-700/65 dark:via-neutral-800/45 dark:to-transparent"
        animate={{
          x: [0, 60, -15, 0],
          y: [0, -22, 10, 0],
          scale: [1.08, 0.9, 1.2, 1.08],
          opacity: [0.55, 0.75, 0.5, 0.55],
        }}
        transition={{
          duration: 17,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Cloud Bank 3 - Dense Core Billowing Around Lock */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-30 w-48 rounded-[50%_50%_50%_50%/50%_50%_50%_50%] filter blur-xl bg-gradient-to-r from-neutral-500/65 via-neutral-400/75 to-neutral-500/65 dark:from-neutral-800/60 dark:via-neutral-700/70 dark:to-neutral-800/60"
        animate={{
          x: ["-50%", "-35%", "-65%", "-50%"],
          y: ["-50%", "-60%", "-38%", "-50%"],
          scale: [0.95, 1.22, 0.88, 0.95],
          opacity: [0.5, 0.78, 0.45, 0.5],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Cloud Bank 4 - Floating Light Silver Wisp (Creates clearings where details peek through) */}
      <motion.div
        className="absolute -top-6 left-10 h-28 w-44 rounded-[55%_45%_50%_50%/40%_60%_40%_60%] filter blur-lg bg-gradient-to-bl from-neutral-400/40 via-neutral-300/20 to-transparent dark:from-neutral-700/40 dark:via-neutral-800/20 dark:to-transparent"
        animate={{
          x: [0, 35, -25, 0],
          y: [0, 15, -10, 0],
          scale: [0.92, 1.15, 0.96, 0.92],
          opacity: [0.35, 0.55, 0.3, 0.35],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />

      {/* Cloud Bank 5 - Trailing Lower-Right Wisp */}
      <motion.div
        className="absolute -bottom-6 right-12 h-30 w-48 rounded-[50%_50%_45%_55%/55%_45%_55%_45%] filter blur-xl bg-gradient-to-tr from-neutral-500/45 via-neutral-400/25 to-transparent dark:from-neutral-700/40 dark:via-neutral-800/20 dark:to-transparent"
        animate={{
          x: [0, -40, 18, 0],
          y: [0, -14, 8, 0],
          scale: [1.12, 0.93, 1.18, 1.12],
          opacity: [0.4, 0.6, 0.35, 0.4],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2.2,
        }}
      />

      {/* Atmospheric Sweeping Mist Drift */}
      <motion.div
        className="absolute inset-y-0 -left-1/3 w-1/2 filter blur-3xl bg-gradient-to-r from-transparent via-neutral-400/20 to-transparent dark:via-neutral-600/15 pointer-events-none"
        animate={{
          x: ["0%", "300%", "0%"],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
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
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      onClick={handleClick}
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
      {/* Inner bounded container with rounded corners and overflow-hidden for the blurred content and cloud layer */}
      <div className="relative overflow-hidden rounded-xl">
        {/* Partially obscured details subtly showing through underneath the mist */}
        <div
          className="filter blur-[0.8px] opacity-75 select-none pointer-events-none p-5"
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Dynamic Multi-layered Clouds & Mist Animation */}
        <CloudFogLayer />
      </div>

      {/* Lock & Tooltip container with overflow-visible so the notification bubble is NEVER clipped */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20 overflow-visible">
        <div className="relative pointer-events-auto">
          {/* Floating requirement tooltip bubble - unclipped outside the frame */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                role="status"
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-xl bg-neutral-900/95 px-4 py-2 text-center text-xs font-medium text-white shadow-2xl backdrop-blur-md dark:bg-white/95 dark:text-neutral-900 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-neutral-900/95 dark:after:border-t-white/95"
              >
                {cleanMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Elevated High-Contrast Lock Icon (pops against dark silver/gray fog) */}
          <motion.div
            animate={isShaking ? { rotate: [0, -14, 14, -8, 8, 0] } : {}}
            transition={{ duration: 0.38, ease: "easeInOut" }}
            whileHover={{ scale: 1.06 }}
            className="flex w-11 h-11 shrink-0 aspect-square items-center justify-center rounded-full bg-white text-neutral-800 shadow-xl border border-white/80 ring-4 ring-neutral-400/25 backdrop-blur-sm dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600 dark:ring-neutral-900/40"
          >
            <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
          </motion.div>
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
        reviewSummary:
          notes.trim() ||
          `Completed Week ${node.weekNumber} Review & Optimization`,
        newCvUploaded: Boolean(cvUploadedName),
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
            {isActive && (
              <form onSubmit={handleCompleteReview} className="mt-4 space-y-3">
                <div>
                  <label className="field-label text-xs">
                    {t("journey.day7ReflectionLabel")}
                  </label>
                  <textarea
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
                      accept=".pdf,.doc,.docx"
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
  const queryClient = useQueryClient();
  const { data: journeyData, isLoading } = useJourneyState();

  const currentWeek = journeyData?.state.currentWeek ?? 0;
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

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

  const getFutureWeekMessage = (weekNum: number) => {
    if (weekNum <= currentWeek) return null;
    if (currentWeek === 0) {
      return t("journey.weekZeroGateNotice");
    }
    const daysUntilAvailable = (weekNum - currentWeek) * 7;
    const availableAt = new Date(
      new Date(journeyData.state.weekStartedAt).getTime() +
        daysUntilAvailable * 24 * 60 * 60 * 1000,
    );
    const availableDate = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(availableAt);

    return t("journey.weekUnavailable", {
      week: weekNum,
      date: availableDate,
    });
  };

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
            return (
              <button
                key={weekNum}
                type="button"
                onClick={() => selectWeek(weekNum)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-neutral-900 text-white shadow-2xs dark:bg-white dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                <span>
                  {weekNum === 0
                    ? t("journey.weekZeroTab")
                    : t("journey.weekNumberTab", { week: weekNum })}
                </span>
                {isFutureWeek && (
                  <Lock className="h-3 w-3 opacity-70" aria-hidden="true" />
                )}
              </button>
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
            <span className="tabular-nums">
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
                      {isActive && node.requiredAppsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openAddModal()}
                          className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
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
      </div>
    </section>
  );
}
