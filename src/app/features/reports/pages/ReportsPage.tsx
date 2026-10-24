import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router";
import {
  TrendingUp,
  Activity,
  Sparkles,
  Plus,
  Lock,
  FileText,
  Send,
  FolderGit2,
  Share2,
  Compass,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useI18n } from "../../../i18n";
import { api } from "../../../services/api";
import type { Application, DashboardStats } from "../../../types";
import {
  useJourneyState,
  useSideTasks,
  useSubmitSideTask,
} from "../../journey/api/journeyApi";
import { openJourneyTasksPanel } from "../../../components/journeyTasksPanelEvents";
import { SpinnerIcon } from "../../../components/Icons";

export function meta() {
  return [
    { title: "تحليل الأداء | Nawah Project" },
    {
      name: "description",
      content:
        "معمل تحليل الأداء، مسار التحول، وسجل تتبع أثر التعديلات المتكامل مع رحلة نواة",
    },
  ];
}

type WeekScope = "ALL" | 1 | 2 | 3 | 4;

type ChangeCategory =
  | "CV_UPDATE"
  | "PORTFOLIO_UPDATE"
  | "LINKEDIN_OPTIMIZATION"
  | "PITCH_STRATEGY";

export interface UserChangeLog {
  id: string;
  category: ChangeCategory;
  title: string;
  note: string;
  createdAt: string;
  appCountAtChange: number;
  cvVersion: number;
}

interface EquipmentEra {
  id: string;
  title: string;
  category: ChangeCategory;
  cvVersion: number;
  startDate: string;
  endDate: string | null;
  appsCount: number;
  responsesCount: number;
  rate: number;
  ratio: number;
  isBaseline: boolean;
  verdict?: {
    status: "TESTING" | "IMPROVED" | "NO_IMPROVEMENT";
    deltaPercent?: number;
    remainingNeeded?: number;
  };
}

export default function ReportsPage() {
  const { t, number, locale } = useI18n();
  const isRtl = locale === "ar";
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();

  // Scope: exactly 5 tabs ("ALL", 1, 2, 3, 4)
  const [selectedWeek, setSelectedWeek] = useState<WeekScope>("ALL");
  const [applications, setApplications] = useState<Application[]>([]);
  const [, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review & Change Log Modal States
  const [reviewDraft, setReviewDraft] = useState("");
  const [newCvChecked, setNewCvChecked] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [newChangeCategory, setNewChangeCategory] = useState<ChangeCategory>("PORTFOLIO_UPDATE");
  const [newChangeTitle, setNewChangeTitle] = useState("");
  const [newChangeNote, setNewChangeNote] = useState("");
  const [newChangeIsNewCv, setNewChangeIsNewCv] = useState(true);

  // Locked Week Tab Anchored Popover state
  const [lockedPopoverWeek, setLockedPopoverWeek] = useState<number | null>(null);
  const [wigglingTab, setWigglingTab] = useState<number | null>(null);
  const popoverTimerRef = useRef<number | null>(null);

  const handleLockedTabClick = (weekNum: number) => {
    setWigglingTab(weekNum);
    window.setTimeout(() => setWigglingTab(null), 400);

    if (popoverTimerRef.current) window.clearTimeout(popoverTimerRef.current);
    setLockedPopoverWeek(weekNum);
    popoverTimerRef.current = window.setTimeout(() => {
      setLockedPopoverWeek(null);
    }, 4000);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-week-tab-container]")) {
        setLockedPopoverWeek(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (popoverTimerRef.current) window.clearTimeout(popoverTimerRef.current);
    };
  }, []);

  // Growth Curve Chart Controls
  const [viewMode, setViewMode] = useState<"cumulative" | "period">("cumulative");
  const [metricMode, setMetricMode] = useState<"volume" | "rate">("volume");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Journey state & side tasks
  const { data: journeyData, isLoading: journeyLoading } = useJourneyState();
  const { data: sideTasksData = [] } = useSideTasks();
  const submitSideTaskMutation = useSubmitSideTask();

  const journeyState = journeyData?.state;
  const currentWeek = journeyState?.currentWeek ?? 0;
  const cvVersion = journeyState?.cvVersionNumber ?? 1;
  const currentNodeCode = journeyState?.currentNodeCode ?? "TASK_0";
  const completedCodes = useMemo(
    () => journeyState?.completedNodeCodes ?? [],
    [journeyState?.completedNodeCodes],
  );

  // Fetch applications and dashboard stats
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [appsRes, statsRes] = await Promise.all([
        api.getApplications({ limit: 1000 }),
        api.getDashboardStats(),
      ]);
      setApplications(appsRes.items ?? []);
      setStats(statsRes);
    } catch {
      setError(
        isRtl
          ? "تعذر تحميل بيانات التحليلات. يرجى التحقق من الاتصال."
          : "Unable to load analytics data. Please check connection.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Strict Week Filter Gating Logic (Requirement 1)
  const isWeekReviewReached = (weekNum: number): boolean => {
    if (weekNum === 1) {
      return (
        completedCodes.includes("W1_REVIEW") ||
        currentNodeCode === "W1_REVIEW" ||
        currentWeek > 1
      );
    }
    if (weekNum === 2) {
      return (
        completedCodes.includes("W2_REVIEW") ||
        currentNodeCode === "W2_REVIEW" ||
        currentWeek > 2
      );
    }
    if (weekNum === 3) {
      return (
        completedCodes.includes("W3_REVIEW") ||
        currentNodeCode === "W3_REVIEW" ||
        currentWeek > 3
      );
    }
    if (weekNum === 4) {
      return (
        completedCodes.includes("FINAL_REPORT") ||
        currentNodeCode === "FINAL_REPORT"
      );
    }
    return false;
  };

  // 5 Filter Tabs Definition
  const FILTER_TABS = useMemo(() => {
    return [
      {
        id: "ALL" as WeekScope,
        labelAr: "نظرة شاملة (كل الرحلة)",
        labelEn: "All Journey (Overview)",
        isLocked: false,
      },
      {
        id: 1 as WeekScope,
        labelAr: isWeekReviewReached(1) ? "تقرير الأسبوع 1" : "تقرير الأسبوع 1 🔒",
        labelEn: isWeekReviewReached(1) ? "Week 1 Report" : "Week 1 Report 🔒",
        isLocked: !isWeekReviewReached(1),
      },
      {
        id: 2 as WeekScope,
        labelAr: isWeekReviewReached(2) ? "تقرير الأسبوع 2" : "تقرير الأسبوع 2 🔒",
        labelEn: isWeekReviewReached(2) ? "Week 2 Report" : "Week 2 Report 🔒",
        isLocked: !isWeekReviewReached(2),
      },
      {
        id: 3 as WeekScope,
        labelAr: isWeekReviewReached(3) ? "تقرير الأسبوع 3" : "تقرير الأسبوع 3 🔒",
        labelEn: isWeekReviewReached(3) ? "Week 3 Report" : "Week 3 Report 🔒",
        isLocked: !isWeekReviewReached(3),
      },
      {
        id: 4 as WeekScope,
        labelAr: isWeekReviewReached(4)
          ? "تقرير الأسبوع 4 (النهائي)"
          : "تقرير الأسبوع 4 (النهائي) 🔒",
        labelEn: isWeekReviewReached(4)
          ? "Week 4 Report (Final)"
          : "Week 4 Report (Final) 🔒",
        isLocked: !isWeekReviewReached(4),
      },
    ];
  }, [completedCodes, currentNodeCode, currentWeek]);

  // Filtered applications based on active week scope
  const scopedApps = useMemo(() => {
    if (selectedWeek === "ALL") return applications;
    return applications.filter((app) => app.journeyWeek === selectedWeek);
  }, [applications, selectedWeek]);

  // Applications sorted chronologically (oldest first)
  const sortedApps = useMemo(() => {
    return [...applications].sort(
      (a, b) =>
        new Date(a.createdAt || a.applicationDate).getTime() -
        new Date(b.createdAt || b.applicationDate).getTime(),
    );
  }, [applications]);

  // Sourced Changes (from SideTask submissions + localStorage cache)
  const userChanges = useMemo<UserChangeLog[]>(() => {
    const fromApi: UserChangeLog[] = sideTasksData
      .filter((st) => st.type === "WEEKLY_REVIEW" && st.reviewSummary)
      .map((st) => {
        try {
          const parsed = JSON.parse(st.reviewSummary!);
          return {
            id: st.id,
            category: (parsed.category as ChangeCategory) || "CV_UPDATE",
            title: parsed.title || (isRtl ? "تعديل في التجهيز" : "Tooling Pivot"),
            note: parsed.note || "",
            createdAt: parsed.createdAt || st.createdAt,
            appCountAtChange: parsed.appCountAtChange ?? 0,
            cvVersion: parsed.cvVersion ?? st.journeyWeek + 1,
          };
        } catch {
          return {
            id: st.id,
            category: "CV_UPDATE",
            title: isRtl
              ? `مراجعة الأسبوع ${st.journeyWeek || 1}`
              : `Week ${st.journeyWeek || 1} Review`,
            note: st.reviewSummary || "",
            createdAt: st.createdAt,
            appCountAtChange: 0,
            cvVersion: st.journeyWeek ? st.journeyWeek + 1 : 2,
          };
        }
      });

    // Merge with local storage if available
    let fromLocal: UserChangeLog[] = [];
    if (typeof window !== "undefined") {
      try {
        const key = `nawah_user_change_logs_${journeyState?.userId || "default"}`;
        const raw = localStorage.getItem(key);
        if (raw) fromLocal = JSON.parse(raw);
      } catch {
        fromLocal = [];
      }
    }

    // Merge and deduplicate by ID or createdAt
    const map = new Map<string, UserChangeLog>();
    for (const c of fromLocal) map.set(c.id, c);
    for (const c of fromApi) map.set(c.id, c);

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [sideTasksData, journeyState?.userId, isRtl]);

  // Baseline Change (Era 0 - Always Present)
  const baselineChange = useMemo<UserChangeLog>(() => {
    const earliestAppDate =
      sortedApps[0]?.createdAt ||
      sortedApps[0]?.applicationDate ||
      new Date(Date.now() - 7 * 86400000).toISOString();

    return {
      id: "baseline-cv-v1",
      category: "CV_UPDATE",
      title: isRtl
        ? "التجهيز الأولي عند بدء الرحلة (CV v1)"
        : "Initial Setup (CV v1)",
      note: isRtl
        ? "مرحلة التقديم بالسيرة الذاتية الأولية لقياس نقطة البداية قبل أي تحسينات."
        : "Initial application phase with baseline resume before iterative improvements.",
      createdAt: earliestAppDate,
      appCountAtChange: 0,
      cvVersion: 1,
    };
  }, [sortedApps, isRtl]);

  // All Changes = [Baseline, ...userChanges]
  const allChanges = useMemo<UserChangeLog[]>(() => {
    return [baselineChange, ...userChanges];
  }, [baselineChange, userChanges]);

  // Calculate Equipment Eras & Impact Verdicts
  const eras = useMemo<EquipmentEra[]>(() => {
    return allChanges.map((change, idx) => {
      const isBaseline = idx === 0;
      const nextChange = allChanges[idx + 1];
      const startDate = change.createdAt;
      const endDate = nextChange ? nextChange.createdAt : null;

      // Filter applications belonging to this era
      const eraApps = sortedApps.filter((app) => {
        const appTime = new Date(app.createdAt || app.applicationDate).getTime();
        const startTime = new Date(startDate).getTime();
        if (isBaseline && allChanges.length > 1) {
          const nextTime = new Date(allChanges[1].createdAt).getTime();
          return appTime < nextTime;
        }
        if (nextChange) {
          const nextTime = new Date(nextChange.createdAt).getTime();
          return appTime >= startTime && appTime < nextTime;
        }
        return appTime >= startTime;
      });

      const responses = eraApps.filter(
        (a) =>
          a.hasAssignment ||
          a.stage === "INTERVIEW" ||
          a.stage === "DECISION" ||
          a.outcome === "ACCEPTED",
      );

      const appsCount = eraApps.length;
      const responsesCount = responses.length;
      const rate = appsCount > 0 ? Math.round((responsesCount / appsCount) * 100) : 0;
      const ratio =
        responsesCount > 0 ? Math.max(1, Math.round(appsCount / responsesCount)) : 0;

      // Calculate Impact Verdict for changes after baseline
      let verdict: EquipmentEra["verdict"];
      if (!isBaseline) {
        const changeTime = new Date(change.createdAt).getTime();
        const appsBefore = sortedApps.filter(
          (a) => new Date(a.createdAt || a.applicationDate).getTime() < changeTime,
        );
        const respBefore = appsBefore.filter(
          (a) =>
            a.hasAssignment ||
            a.stage === "INTERVIEW" ||
            a.stage === "DECISION" ||
            a.outcome === "ACCEPTED",
        );
        const rateBefore =
          appsBefore.length > 0 ? respBefore.length / appsBefore.length : 0;

        const appsAfter = sortedApps.filter(
          (a) => new Date(a.createdAt || a.applicationDate).getTime() >= changeTime,
        );
        const respAfter = appsAfter.filter(
          (a) =>
            a.hasAssignment ||
            a.stage === "INTERVIEW" ||
            a.stage === "DECISION" ||
            a.outcome === "ACCEPTED",
        );
        const rateAfter =
          appsAfter.length > 0 ? respAfter.length / appsAfter.length : 0;

        if (appsAfter.length < 5) {
          verdict = {
            status: "TESTING",
            remainingNeeded: 5 - appsAfter.length,
          };
        } else if (rateAfter > rateBefore) {
          verdict = {
            status: "IMPROVED",
            deltaPercent: Math.round((rateAfter - rateBefore) * 100),
          };
        } else {
          verdict = {
            status: "NO_IMPROVEMENT",
          };
        }
      }

      return {
        id: change.id,
        title: change.title,
        category: change.category,
        cvVersion: change.cvVersion,
        startDate,
        endDate,
        appsCount,
        responsesCount,
        rate,
        ratio,
        isBaseline,
        verdict,
      };
    });
  }, [allChanges, sortedApps]);

  // Overall Performance Calculations for Scoped Apps
  const totalAppsCount = scopedApps.length;
  const tailoredAppsCount = scopedApps.filter((a) => a.isTailored).length;
  const generalAppsCount = totalAppsCount - tailoredAppsCount;

  const responsesList = useMemo(() => {
    return scopedApps.filter(
      (a) =>
        a.hasAssignment ||
        a.stage === "INTERVIEW" ||
        a.stage === "DECISION" ||
        a.outcome === "ACCEPTED",
    );
  }, [scopedApps]);

  const totalResponsesCount = responsesList.length;
  const interviewsCount = scopedApps.filter((a) => a.stage === "INTERVIEW").length;
  const assignmentsCount = scopedApps.filter((a) => a.hasAssignment).length;
  const decisionsCount = scopedApps.filter(
    (a) => a.stage === "DECISION" || a.outcome === "ACCEPTED",
  ).length;

  const overallRatio =
    totalResponsesCount > 0
      ? Math.max(1, Math.round(totalAppsCount / totalResponsesCount))
      : 0;

  const overallConversionRate =
    totalAppsCount > 0
      ? Math.round((totalResponsesCount / totalAppsCount) * 100)
      : 0;

  const openAppsCount = scopedApps.filter((a) => a.stage !== "CLOSED").length;
  const closedAppsCount = scopedApps.filter((a) => a.stage === "CLOSED").length;

  // Slices for Donut Chart (Requirement 3.A)
  const appliedCount = scopedApps.filter(
    (a) => a.stage === "APPLIED" && !a.hasAssignment && a.outcome === "NONE",
  ).length;
  const donutAssignmentCount = scopedApps.filter(
    (a) =>
      (a.stage === "ASSIGNMENT" || a.hasAssignment) &&
      a.stage !== "INTERVIEW" &&
      a.stage !== "DECISION" &&
      a.stage !== "CLOSED",
  ).length;
  const donutInterviewCount = scopedApps.filter(
    (a) => a.stage === "INTERVIEW" && a.outcome === "NONE",
  ).length;
  const donutDecisionCount = scopedApps.filter(
    (a) => (a.stage === "DECISION" && a.outcome === "NONE") || a.outcome === "ACCEPTED",
  ).length;
  const donutClosedCount = scopedApps.filter(
    (a) =>
      a.stage === "CLOSED" ||
      a.outcome === "REJECTED" ||
      a.outcome === "NO_RESPONSE" ||
      a.outcome === "WITHDRAWN",
  ).length;

  const acceptedCount = scopedApps.filter((a) => a.outcome === "ACCEPTED").length;
  const rejectedCount = scopedApps.filter((a) => a.outcome === "REJECTED").length;
  const withdrawnCount = scopedApps.filter((a) => a.outcome === "WITHDRAWN").length;
  const noResponseCount = scopedApps.filter(
    (a) => a.outcome === "NO_RESPONSE",
  ).length;

  // Automated Bottleneck Diagnosis Engine
  const diagnosis = useMemo(() => {
    const allCount = applications.length;
    const allResp = applications.filter(
      (a) =>
        a.hasAssignment ||
        a.stage === "INTERVIEW" ||
        a.stage === "DECISION" ||
        a.outcome === "ACCEPTED",
    ).length;
    const allRejected = applications.filter((a) => a.outcome === "REJECTED").length;

    if (allCount < 10) {
      return {
        caseNumber: 1,
        titleAr: "مرحلة بناء العينة الأولية",
        titleEn: "Baseline Building",
        badgeAr: "بناء العينة",
        badgeEn: "Baseline Sample",
        textAr:
          "أنت في مرحلة بناء العينة الأولية. ركز على إتمام مهام التقديم الحالية للوصول إلى حجم عينة يسمح بحساب معدل التحويل بدقة.",
        textEn:
          "You are in the baseline building phase. Focus on finishing your active application quota to establish a statistically significant conversion baseline.",
        tone: "info",
        actionLabelAr: "إضافة طلب تقديم جديد",
        actionLabelEn: "Add New Application",
        onAction: openAddModal,
      };
    }
    if (allCount >= 25 && allResp === 0) {
      return {
        caseNumber: 2,
        titleAr: "فجوة العبور الأولي (Screening Bottleneck)",
        titleEn: "Resume Screening Bottleneck",
        badgeAr: "تعديل الكلمات المفتاحية",
        badgeEn: "Keywords & ATS",
        textAr:
          "تشخيص الأداء: لديك التزام ممتاز بالكمية، لكن الفجوة حالياً في (العبور الأولي للفلترة). في محطة التقييم القادمة (اليوم السابع)، ركز على تخصيص السيرة الذاتية والكلمات المفتاحية.",
        textEn:
          "Performance Diagnosis: Strong application volume, but the bottleneck is initial resume screening. At the next review station (Day 7), focus on tailoring resumes and keywords.",
        tone: "warning",
        actionLabelAr: "فتح درج مهام الرحلة",
        actionLabelEn: "Open Journey Tasks",
        onAction: openJourneyTasksPanel,
      };
    }
    if (allResp > 0 && allRejected >= allResp) {
      return {
        caseNumber: 3,
        titleAr: "فجوة مرحلة المقابلة والأسيمنت (Conversion Bottleneck)",
        titleEn: "Interview Conversion Bottleneck",
        badgeAr: "التحضير المتقدم",
        badgeEn: "Interview Prep",
        textAr:
          "تشخيص الأداء: سيرتك الذاتية تنجح في عبور الفلترة وجلب الفرص! الفجوة الحالية في (مرحلة المقابلة/الأسيمنت). راجع ملاحظات ما بعد المقابلة ودليل التحضير المتقدم.",
        textEn:
          "Performance Diagnosis: Your resume successfully passes screening and lands interviews! The bottleneck is the interview/assignment stage. Review post-interview feedback and preparation guides.",
        tone: "purple",
        actionLabelAr: "دليل الملاحظات والتوجيه",
        actionLabelEn: "View Feedback & Insights",
        toLink: "/professional-development/feedback",
      };
    }
    return {
      caseNumber: 4,
      titleAr: "كفاءة استجابة ممتازة وزخم تصاعدي",
      titleEn: "High Momentum & Strong Traction",
      badgeAr: "استجابة مرتفعة",
      badgeEn: "Strong Traction",
      textAr:
        "تشخيص الأداء: معدل استجابتك ممتاز! استمر بنفس الاستراتيجية مع زيادة حصة الطلبات المخصصة والظهور المهني لمضاعفة العروض.",
      textEn:
        "Performance Diagnosis: Excellent response rate! Continue with this strategy while expanding tailored applications and professional visibility to multiply offers.",
      tone: "success",
      actionLabelAr: "تسجيل طلب تقديم جديد",
      actionLabelEn: "Add Application",
      onAction: openAddModal,
    };
  }, [applications, openAddModal]);

  // Master Area Line Chart Points Calculation (Requirement 2.C)
  const chartPoints = useMemo(() => {
    if (scopedApps.length === 0) return [];

    // Group scoped applications by date (YYYY-MM-DD)
    const grouped = new Map<
      string,
      { date: string; apps: Application[]; responses: Application[] }
    >();

    for (const app of scopedApps) {
      const d = app.createdAt ? app.createdAt.slice(0, 10) : app.applicationDate;
      const key = d || "start";
      if (!grouped.has(key)) {
        grouped.set(key, { date: key, apps: [], responses: [] });
      }
      const entry = grouped.get(key)!;
      entry.apps.push(app);
      if (
        app.hasAssignment ||
        app.stage === "INTERVIEW" ||
        app.stage === "DECISION" ||
        app.outcome === "ACCEPTED"
      ) {
        entry.responses.push(app);
      }
    }

    const sortedDates = Array.from(grouped.keys()).sort();

    let cumulativeApps = 0;
    let cumulativeResponses = 0;

    return sortedDates.map((dateStr, idx) => {
      const entry = grouped.get(dateStr)!;
      cumulativeApps += entry.apps.length;
      cumulativeResponses += entry.responses.length;

      const dateObj = new Date(dateStr);
      const label = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
            day: "numeric",
            month: "short",
          })
        : `${isRtl ? "يوم" : "Day"} ${idx + 1}`;

      // Check if any change occurred on or near this date
      const changeAtPoint = allChanges.find((c) => c.createdAt.slice(0, 10) === dateStr);
      const isPin = Boolean(changeAtPoint && changeAtPoint.id !== "baseline-cv-v1");

      // Active era for this point
      const activeEra =
        eras.find((e) => {
          const ptTime = new Date(dateStr).getTime();
          const start = new Date(e.startDate).getTime();
          const end = e.endDate ? new Date(e.endDate).getTime() : Infinity;
          return ptTime >= start && ptTime <= end;
        }) || eras[0];

      const rate =
        cumulativeApps > 0
          ? Math.round((cumulativeResponses / cumulativeApps) * 100)
          : 0;

      return {
        dateStr,
        label,
        dayApps: entry.apps.length,
        cumApps: cumulativeApps,
        dayResponses: entry.responses.length,
        cumResponses: cumulativeResponses,
        rate,
        isPin,
        pinTitle: changeAtPoint?.title,
        eraTitle: activeEra?.title || `CV v${cvVersion}`,
      };
    });
  }, [scopedApps, allChanges, eras, cvVersion, isRtl]);

  // Handle Save New Tooling Change (Requirement 4.B)
  const handleSaveNewChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChangeTitle.trim()) return;

    const changeId = `change-${Date.now()}`;
    const newChange: UserChangeLog = {
      id: changeId,
      category: newChangeCategory,
      title: newChangeTitle.trim(),
      note: newChangeNote.trim(),
      createdAt: new Date().toISOString(),
      appCountAtChange: applications.length,
      cvVersion: newChangeIsNewCv ? cvVersion + 1 : cvVersion,
    };

    // 1. Save to local storage for immediate persistence
    if (typeof window !== "undefined") {
      try {
        const key = `nawah_user_change_logs_${journeyState?.userId || "default"}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        localStorage.setItem(key, JSON.stringify([newChange, ...existing]));
      } catch {
        // storage ignored
      }
    }

    // 2. Submit side-task to API
    try {
      await submitSideTaskMutation.mutateAsync({
        type: "WEEKLY_REVIEW",
        nodeCode: currentNodeCode,
        reviewSummary: JSON.stringify({
          isUserChange: true,
          category: newChangeCategory,
          title: newChangeTitle.trim(),
          note: newChangeNote.trim(),
          appCountAtChange: applications.length,
          cvVersion: newChangeIsNewCv ? cvVersion + 1 : cvVersion,
          createdAt: newChange.createdAt,
        }),
        newCvUploaded: newChangeIsNewCv,
      });
    } catch {
      // Local state is already updated
    }

    // Reset and close modal
    setNewChangeTitle("");
    setNewChangeNote("");
    setIsChangeModalOpen(false);
  };

  // Handle Day 7 Station Submit (Requirement 5)
  const handleDay7ReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDraft.trim()) return;
    try {
      await submitSideTaskMutation.mutateAsync({
        type: "WEEKLY_REVIEW",
        nodeCode: currentNodeCode,
        reviewSummary: reviewDraft.trim(),
        newCvUploaded: newCvChecked,
      });
      setReviewDraft("");
      setNewCvChecked(false);
    } catch {
      // Handled by mutation error
    }
  };

  const isAtReviewStation =
    currentNodeCode === "W1_REVIEW" ||
    currentNodeCode === "W2_REVIEW" ||
    currentNodeCode === "W3_REVIEW" ||
    currentNodeCode === "FINAL_REPORT";

  if (isLoading || journeyLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-sm text-neutral-500">
        <SpinnerIcon className="mb-3 h-8 w-8 animate-spin text-neutral-400" />
        <p>
          {isRtl
            ? "جارٍ إعداد معمل تحليلات الأداء والرحلة…"
            : "Loading performance lab analytics…"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-soft/30 p-6 text-center text-danger-strong">
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="button-secondary mt-3 px-4 py-2 text-xs font-semibold"
        >
          {isRtl ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* 1. Header & Strict Week Filter (Requirement 1) */}
      <header className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-100">
                {t("dashboard.reportsTitle")}
              </h1>
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-neutral-700 shadow-2xs dark:bg-neutral-900 dark:text-neutral-300">
                {isRtl ? `النسخة النشطة: CV v${cvVersion}` : `Active Setup: CV v${cvVersion}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t("dashboard.reportsSubtitle")}
            </p>
          </div>

          {currentWeek >= 3 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(true)}
                className="button-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("dashboard.recordNewChange")}</span>
              </button>
            </div>
          )}
        </div>

        {/* 5 Filter Tabs with Anchored Popovers on Locked Tabs */}
        <div className="pt-1">
          <div className="flex items-center gap-2 overflow-visible pb-1 scrollbar-none flex-wrap">
            {FILTER_TABS.map((tab) => {
              const isSelected = selectedWeek === tab.id;
              const isLocked = tab.isLocked;

              return (
                <div key={String(tab.id)} className="relative" data-week-tab-container>
                  <button
                    type="button"
                    aria-disabled={isLocked}
                    onClick={() => {
                      if (isLocked) {
                        handleLockedTabClick(tab.id as number);
                      } else {
                        setSelectedWeek(tab.id);
                      }
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                      isLocked
                        ? "border-border/70 bg-neutral-100/60 text-neutral-500 opacity-60 cursor-pointer hover:opacity-85 dark:bg-neutral-900/50 dark:text-neutral-400 select-none"
                        : isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white shadow-xs font-bold dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-border bg-surface text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {isLocked && (
                      <Lock
                        className={`h-3 w-3 text-neutral-400 shrink-0 ${
                          wigglingTab === tab.id ? "animate-lock-wiggle" : ""
                        }`}
                      />
                    )}
                    <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
                  </button>

                  {/* Anchored Popover (Auto-Dismisses after 4s) */}
                  {isLocked && lockedPopoverWeek === tab.id && (
                    <div
                      role="tooltip"
                      className="absolute top-full mt-2 z-50 w-72 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xl text-start animate-in fade-in slide-in-from-top-1 duration-150 dark:border-neutral-700 dark:bg-neutral-900"
                      style={{
                        [isRtl ? "right" : "left"]: 0,
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-1.5 mb-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>
                          {isRtl
                            ? `تقرير الأسبوع ${tab.id} غير متاح حالياً 🔒`
                            : `Week ${tab.id} Report is currently locked 🔒`}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                        {isRtl
                          ? `يُفتح هذا التقرير تلقائياً فور وصولك إلى عقدة "محطة التقييم والتعديل" الخاصة بالأسبوع ${tab.id} في اليوم السابع من رحلتك. ركّز الآن على إنجاز مهام أسبوعك الحالي!`
                          : `Unlocks automatically upon reaching the Day 7 Strategic Review Station for Week ${tab.id}. Focus on your current week quests!`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* 2. Automated Bottleneck Diagnosis Banner */}
      <section
        aria-label={t("dashboard.diagnosisTitle")}
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-xs transition-shadow ${
          diagnosis.tone === "warning"
            ? "border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20"
            : diagnosis.tone === "purple"
              ? "border-purple-300 bg-purple-50/70 dark:border-purple-900/60 dark:bg-purple-950/20"
              : diagnosis.tone === "success"
                ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                : "border-sky-300 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                diagnosis.tone === "warning"
                  ? "bg-amber-500 text-white"
                  : diagnosis.tone === "purple"
                    ? "bg-purple-600 text-white"
                    : diagnosis.tone === "success"
                      ? "bg-emerald-600 text-white"
                      : "bg-sky-600 text-white"
              }`}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t("dashboard.diagnosisTitle")}
                </span>
                <span className="rounded-full bg-white/80 dark:bg-neutral-900/80 px-2 py-0.5 text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  {isRtl ? diagnosis.badgeAr : diagnosis.badgeEn}
                </span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-neutral-900 dark:text-neutral-100 sm:text-base">
                {isRtl ? diagnosis.titleAr : diagnosis.titleEn}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-3xl">
                {isRtl ? diagnosis.textAr : diagnosis.textEn}
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-2 md:pt-0">
            {diagnosis.onAction ? (
              <button
                type="button"
                onClick={diagnosis.onAction}
                className="button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold shadow-xs"
              >
                <span>{isRtl ? diagnosis.actionLabelAr : diagnosis.actionLabelEn}</span>
                {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            ) : diagnosis.toLink ? (
              <Link
                to={diagnosis.toLink}
                className="button-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              >
                <span>{isRtl ? diagnosis.actionLabelAr : diagnosis.actionLabelEn}</span>
                {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3. Master Growth Curve Card (Requirement 2) */}
      <section
        aria-label={t("dashboard.tractionChartTitle")}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-6"
      >
        {/* Header & Segmented Toggles */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {t("dashboard.tractionChartTitle")}
                </h2>
                {eras.length > 1 && eras[eras.length - 1].verdict?.status === "IMPROVED" ? (
                  <span className="status-badge status-success">
                    {`+${eras[eras.length - 1].verdict?.deltaPercent}% ${isRtl ? "تحسن في الاستجابة ↗" : "traction lift ↗"}`}
                  </span>
                ) : totalAppsCount < 10 ? (
                  <span className="status-badge status-neutral">
                    {isRtl ? "مرحلة جمع العينة الأولية" : "Baseline Sampling"}
                  </span>
                ) : (
                  <span className="status-badge status-info">
                    {isRtl ? "تتبع مستمر للمؤشرات" : "Live Tracking"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                {isRtl
                  ? "تحليل تطور عدد التقديمات ومعدل ردود المقابلات مع كل محطة تغيير"
                  : "Evolution of applications volume and interview response traction across iterations"}
              </p>
            </div>
          </div>

          {/* Segmented Controls (Left in RTL) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-neutral-100 p-0.5 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setViewMode("cumulative")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "cumulative"
                    ? "bg-surface text-neutral-900 shadow-2xs dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                {t("dashboard.growthCumulative")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("period")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "period"
                    ? "bg-surface text-neutral-900 shadow-2xs dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                {t("dashboard.periodPerformance")}
              </button>
            </div>

            {/* Metric Mode Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-neutral-100 p-0.5 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setMetricMode("volume")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  metricMode === "volume"
                    ? "bg-surface text-neutral-900 shadow-2xs dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                {t("dashboard.metricVolume")}
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("rate")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  metricMode === "rate"
                    ? "bg-surface text-neutral-900 shadow-2xs dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
                }`}
              >
                {t("dashboard.metricRate")}
              </button>
            </div>
          </div>
        </div>

        {/* 12-Column Split Layout (Side-by-Side on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Right Column (in RTL): Vertically Stacked 4 Metric Cards */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between gap-3">
            {/* Metric 1: Scope & Era */}
            <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">
                {isRtl ? "النطاق والتجهيز المختار" : "Scope & Active Iteration"}
              </span>
              <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {selectedWeek === "ALL"
                  ? isRtl
                    ? "الرحلة الشاملة (تراكمي)"
                    : "All Journey (Cumulative)"
                  : isRtl
                    ? `تقرير الأسبوع ${selectedWeek}`
                    : `Week ${selectedWeek} Report`}
              </div>
              <span className="inline-block rounded-md bg-info-soft border border-info-border px-2 py-0.5 text-[10px] text-info-strong font-semibold">
                {`CV v${cvVersion} — ${cvVersion === 1 ? (isRtl ? "التجهيز الأولي" : "Baseline") : (isRtl ? `تحديث #${cvVersion - 1}` : `Iteration #${cvVersion - 1}`)}`}
              </span>
            </div>

            {/* Metric 2: Applications Sent */}
            <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">
                {isRtl ? "إجمالي الطلبات المرسلة" : "Applications Sent"}
              </span>
              <div className="text-2xl font-bold tabular-nums text-neutral-950 dark:text-neutral-100">
                {number(totalAppsCount)}
              </div>
              <p className="text-[11px] text-neutral-500">
                {`${number(openAppsCount)} ${isRtl ? "مفتوح" : "open"} · ${number(closedAppsCount)} ${isRtl ? "مغلق" : "closed"}`}
              </p>
            </div>

            {/* Metric 3: Responses Achieved */}
            <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">
                {isRtl ? "عدد الردود والمقابلات" : "Responses & Interviews"}
              </span>
              <div className="text-2xl font-bold tabular-nums text-info-strong">
                {number(totalResponsesCount)}
              </div>
              <p className="text-[11px] text-neutral-500">
                {`${number(assignmentsCount)} ${isRtl ? "أسيمنت" : "assgn"} · ${number(interviewsCount)} ${isRtl ? "مقابلة" : "intvw"} · ${number(decisionsCount)} ${isRtl ? "بانتظار القرار" : "decision"}`}
              </p>
            </div>

            {/* Metric 4: Golden Ratio Formula */}
            <div className="rounded-xl border border-border bg-neutral-50/70 dark:bg-neutral-900/50 p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-neutral-500">
                {isRtl ? "متوسط الاستجابة الفعلي (المؤشر الذهبي)" : "Response Ratio (Golden Metric)"}
              </span>
              <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {overallRatio > 0
                  ? isRtl
                    ? `1 رد : كل ${overallRatio} طلب`
                    : `1 response : ${overallRatio} apps`
                  : isRtl
                    ? "0 ردود حتى الآن"
                    : "0 responses yet"}
              </div>
              <p className="text-[11px] text-neutral-500">
                {`${isRtl ? "معدل التحول:" : "Conversion:"} ${overallConversionRate}%`}
              </p>
            </div>
          </div>

          {/* Left Column (in RTL): Edge-to-Edge SVG Curve + Bottom Legend */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between rounded-xl border border-border/60 bg-neutral-50/30 dark:bg-neutral-950/30 p-4 min-h-[340px]">
            {/* Interactive SVG Area Line Chart */}
            <div className="relative flex-1 flex flex-col justify-center">
          {chartPoints.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-neutral-50/50 dark:bg-neutral-900/30 text-center p-6">
              <Activity className="h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isRtl
                  ? "يبدأ رسم منحنى الاستجابة تلقائياً بمجرد إرسال أول طلب تقديم"
                  : "Response traction curve begins plotting after your first application"}
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="button-primary mt-3 px-3 py-1.5 text-xs font-semibold shadow-xs"
              >
                {isRtl ? "+ إضافة طلب تقديم" : "+ Add Application"}
              </button>
            </div>
          ) : (
            (() => {
              const svgW = 800;
              const svgH = 220;
              const padTop = 20;
              const padBtm = 40;
              const padLeft = 45;
              const padRight = 35;
              const plotW = svgW - padLeft - padRight;
              const plotH = svgH - padTop - padBtm;

              const values = chartPoints.map((pt) =>
                metricMode === "volume"
                  ? viewMode === "cumulative"
                    ? pt.cumApps
                    : pt.dayApps
                  : pt.rate,
              );
              const maxVal = Math.max(
                metricMode === "volume" ? 10 : 20,
                Math.ceil(Math.max(...values, 1) * 1.2),
              );

              const coords = chartPoints.map((pt, i) => {
                const x =
                  padLeft +
                  (chartPoints.length === 1
                    ? plotW / 2
                    : (i / (chartPoints.length - 1)) * plotW);
                const val =
                  metricMode === "volume"
                    ? viewMode === "cumulative"
                      ? pt.cumApps
                      : pt.dayApps
                    : pt.rate;
                const y = padTop + plotH - (val / maxVal) * plotH;
                return { x, y, pt };
              });

              // Construct Area path
              let linePathD = `M ${coords[0].x} ${coords[0].y}`;
              for (let i = 1; i < coords.length; i++) {
                linePathD += ` L ${coords[i].x} ${coords[i].y}`;
              }
              const areaPathD = `${linePathD} L ${coords[coords.length - 1].x} ${padTop + plotH} L ${coords[0].x} ${padTop + plotH} Z`;

              // Construct Response secondary line if metricMode === 'volume'
              let respLineD = "";
              if (metricMode === "volume") {
                const respCoords = chartPoints.map((pt, i) => {
                  const x =
                    padLeft +
                    (chartPoints.length === 1
                      ? plotW / 2
                      : (i / (chartPoints.length - 1)) * plotW);
                  const val =
                    viewMode === "cumulative" ? pt.cumResponses : pt.dayResponses;
                  const y = padTop + plotH - (val / maxVal) * plotH;
                  return { x, y };
                });
                respLineD = `M ${respCoords[0].x} ${respCoords[0].y}`;
                for (let i = 1; i < respCoords.length; i++) {
                  respLineD += ` L ${respCoords[i].x} ${respCoords[i].y}`;
                }
              }

              const hoveredCoord =
                hoveredPointIndex !== null && coords[hoveredPointIndex]
                  ? coords[hoveredPointIndex]
                  : null;

              return (
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-56 select-none overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="respGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = padTop + plotH * (1 - ratio);
                      const gridVal = Math.round(maxVal * ratio);
                      return (
                        <g key={ratio}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={padLeft + plotW}
                            y2={y}
                            stroke="currentColor"
                            className="text-neutral-200 dark:text-neutral-800"
                            strokeDasharray="2 3"
                          />
                          <text
                            x={padLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            className="text-[10px] fill-neutral-400 font-mono tabular-nums"
                          >
                            {gridVal}
                            {metricMode === "rate" ? "%" : ""}
                          </text>
                        </g>
                      );
                    })}

                    {/* Filled Area */}
                    <path d={areaPathD} fill="url(#areaGradient)" />

                    {/* Primary Line */}
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Secondary Response Line */}
                    {metricMode === "volume" && (
                      <path
                        d={respLineD}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Change Checkpoint Pins (Requirement 2.C) */}
                    {coords.map((c, i) => {
                      if (!c.pt.isPin) return null;
                      return (
                        <g key={`pin-${i}`}>
                          <line
                            x1={c.x}
                            y1={padTop}
                            x2={c.x}
                            y2={padTop + plotH}
                            stroke="currentColor"
                            className="text-neutral-400 dark:text-neutral-600"
                            strokeDasharray="3 3"
                          />
                          {/* Double-ring marker */}
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r="7"
                            fill="#ffffff"
                            stroke="#202124"
                            strokeWidth="2.5"
                          />
                          <circle cx={c.x} cy={c.y} r="2.5" fill="#059669" />
                        </g>
                      );
                    })}

                    {/* X-Axis Ticks (Zero Spoilers - only lived points) */}
                    {coords.map((c, i) => {
                      // Show every Nth label to avoid overcrowding
                      const step = Math.ceil(coords.length / 6);
                      if (i % step !== 0 && i !== coords.length - 1) return null;
                      return (
                        <text
                          key={`x-label-${i}`}
                          x={c.x}
                          y={padTop + plotH + 20}
                          textAnchor="middle"
                          className="text-[10px] fill-neutral-500 font-sans"
                        >
                          {c.pt.label}
                        </text>
                      );
                    })}

                    {/* Hover Crosshair */}
                    {hoveredCoord && (
                      <g>
                        <line
                          x1={hoveredCoord.x}
                          y1={padTop}
                          x2={hoveredCoord.x}
                          y2={padTop + plotH}
                          stroke="#202124"
                          className="dark:stroke-neutral-300"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={hoveredCoord.x}
                          cy={hoveredCoord.y}
                          r="5"
                          fill="#059669"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* Invisible Overlay for Mouse Move Tracking */}
                    <rect
                      x={padLeft}
                      y={padTop}
                      width={plotW}
                      height={plotH}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, mouseX / plotW));
                        const closestIdx = Math.round(
                          ratio * (chartPoints.length - 1),
                        );
                        setHoveredPointIndex(closestIdx);
                      }}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                  </svg>

                  {/* Floating Hover Tooltip */}
                  {hoveredCoord && (
                    <div
                      className="pointer-events-none absolute z-20 rounded-xl border border-border bg-surface p-3 text-xs shadow-lg transition-transform text-start min-w-[170px]"
                      style={{
                        top: Math.max(10, (hoveredCoord.y / svgH) * 100 - 10) + "%",
                        left: isRtl
                          ? undefined
                          : Math.min(75, Math.max(5, (hoveredCoord.x / svgW) * 100)) +
                            "%",
                        right: isRtl
                          ? Math.min(75, Math.max(5, 100 - (hoveredCoord.x / svgW) * 100)) +
                            "%"
                          : undefined,
                      }}
                    >
                      <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-between border-b border-border/70 pb-1.5 mb-1.5">
                        <span>{hoveredCoord.pt.label}</span>
                        <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-info-strong font-semibold">
                          {hoveredCoord.pt.eraTitle}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                          <span>{isRtl ? "الطلبات:" : "Applications:"}</span>
                          <span className="font-bold tabular-nums text-neutral-900 dark:text-white">
                            {viewMode === "cumulative"
                              ? hoveredCoord.pt.cumApps
                              : hoveredCoord.pt.dayApps}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                          <span>{isRtl ? "الردود المحققة:" : "Responses:"}</span>
                          <span className="font-bold tabular-nums">
                            {viewMode === "cumulative"
                              ? hoveredCoord.pt.cumResponses
                              : hoveredCoord.pt.dayResponses}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                          <span>{isRtl ? "معدل التحول:" : "Conversion:"}</span>
                          <span className="font-bold tabular-nums">
                            {hoveredCoord.pt.rate}%
                          </span>
                        </div>
                        {hoveredCoord.pt.isPin && (
                          <div className="pt-1 mt-1 border-t border-border/70 text-[10px] text-amber-600 font-medium">
                            📌 {hoveredCoord.pt.pinTitle || (isRtl ? "تعديل في التجهيز" : "Tooling Pivot")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chart Legend */}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-neutral-500">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-4 rounded-full bg-emerald-600 inline-block" />
                      <span>{t("dashboard.metricVolume")}</span>
                    </div>
                    {metricMode === "volume" && (
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-4 rounded-full bg-indigo-500 inline-block" />
                        <span>{isRtl ? "الردود والمقابلات" : "Responses & Interviews"}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-neutral-900 bg-emerald-500 inline-block" />
                      <span>{isRtl ? "دبوس تعديل مسجل" : "Logged Pivot Checkpoint"}</span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Double Chart Row (Requirement 3: Donut Chart + Era Bar Chart) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Right Card (lg:col-span-5): SVG Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t("dashboard.distributionTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t("dashboard.distributionSubtitle")}
            </p>
          </div>

          {/* Centered Donut SVG */}
          <div className="py-2 flex items-center justify-center">
            {totalAppsCount === 0 ? (
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 220 220" className="w-48 h-48">
                  <circle
                    cx="110"
                    cy="110"
                    r="75"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="24"
                    className="text-neutral-100 dark:text-neutral-800"
                  />
                  <text
                    x="110"
                    y="105"
                    textAnchor="middle"
                    className="text-2xl font-bold fill-neutral-900 dark:fill-white font-sans"
                  >
                    0
                  </text>
                  <text
                    x="110"
                    y="125"
                    textAnchor="middle"
                    className="text-xs fill-neutral-400 font-sans"
                  >
                    {isRtl ? "طلب تقديم" : "Applications"}
                  </text>
                </svg>
              </div>
            ) : (
              (() => {
                const r = 75;
                const circumference = 2 * Math.PI * r;
                const slices = [
                  { label: "Applied", count: appliedCount, color: "#38bdf8" }, // Sky
                  { label: "Assignment", count: donutAssignmentCount, color: "#8b5cf6" }, // Purple
                  { label: "Interview", count: donutInterviewCount, color: "#2563eb" }, // Blue
                  { label: "Decision", count: donutDecisionCount, color: "#10b981" }, // Emerald
                  { label: "Closed", count: donutClosedCount, color: "#f43f5e" }, // Rose
                ];

                let accumulatedOffset = 0;

                return (
                  <div className="relative flex items-center justify-center">
                    <svg viewBox="0 0 220 220" className="w-48 h-48 rotate-[-90deg]">
                      {slices.map((slice, idx) => {
                        const sliceLength =
                          (slice.count / totalAppsCount) * circumference;
                        const dashArray = `${sliceLength} ${circumference}`;
                        const offset = accumulatedOffset;
                        accumulatedOffset += sliceLength;

                        if (slice.count === 0) return null;

                        return (
                          <circle
                            key={idx}
                            cx="110"
                            cy="110"
                            r={r}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="24"
                            strokeDasharray={dashArray}
                            strokeDashoffset={-offset}
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Count */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className="text-3xl font-bold text-neutral-950 dark:text-neutral-100 tabular-nums">
                        {number(totalAppsCount)}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-500">
                        {isRtl ? "طلب تقديم" : "Applications"}
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Slices Legend */}
          <div className="space-y-2 border-t border-border/70 pt-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRtl ? "تم التقديم (قيد الانتظار)" : "Applied (Pending)"}
                </span>
              </div>
              <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {number(appliedCount)} ({totalAppsCount > 0 ? Math.round((appliedCount / totalAppsCount) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRtl ? "اختبار فني / أسيمنت" : "Technical Assignment"}
                </span>
              </div>
              <span className="font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {number(donutAssignmentCount)} ({totalAppsCount > 0 ? Math.round((donutAssignmentCount / totalAppsCount) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRtl ? "مقابلة (Interview)" : "Interview Scheduled"}
                </span>
              </div>
              <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {number(donutInterviewCount)} ({totalAppsCount > 0 ? Math.round((donutInterviewCount / totalAppsCount) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRtl ? "عروض وقرارات" : "Decision / Offer"}
                </span>
              </div>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {number(donutDecisionCount)} ({totalAppsCount > 0 ? Math.round((donutDecisionCount / totalAppsCount) * 100) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  {isRtl ? "مغلق (مرفوض / عدم رد)" : "Closed (Rejected / No Response)"}
                </span>
              </div>
              <div className="text-end">
                <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {number(donutClosedCount)} ({totalAppsCount > 0 ? Math.round((donutClosedCount / totalAppsCount) * 100) : 0}%)
                </span>
                <span className="block text-[10px] text-neutral-400">
                  {isRtl
                    ? `مقبول: ${number(acceptedCount)} · مرفوض: ${number(rejectedCount)} · منسحب: ${number(withdrawnCount)} · لا يوجد رد: ${number(noResponseCount)}`
                    : `Accepted: ${number(acceptedCount)} · Rejected: ${number(rejectedCount)} · Withdrawn: ${number(withdrawnCount)} · No Response: ${number(noResponseCount)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Card (lg:col-span-7): Vertical Bar Chart by Equipment Era (Requirement 3.B) */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t("dashboard.eraComparisonTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t("dashboard.eraComparisonSubtitle")}
            </p>
          </div>

          {/* Era Columns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end min-h-[220px]">
            {eras.map((era) => {
              const maxEraApps = Math.max(...eras.map((e) => e.appsCount), 10);
              const heightPct = Math.max(15, Math.round((era.appsCount / maxEraApps) * 100));

              return (
                <div key={era.id} className="flex flex-col items-center gap-2">
                  {/* Top Conversion Pill */}
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    {era.rate}% {isRtl ? "استجابة" : "traction"}
                  </span>

                  {/* Vertical Column Bar */}
                  <div className="h-40 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 relative flex items-end p-2 overflow-hidden border border-border/60">
                    <div
                      className="w-full rounded-lg bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 flex flex-col items-center justify-center text-white"
                      style={{ height: `${heightPct}%` }}
                    >
                      <span className="text-[11px] font-bold tabular-nums">
                        {number(era.appsCount)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Label & Ratio */}
                  <div className="text-center space-y-0.5">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block truncate max-w-[120px]">
                      {era.isBaseline ? t("dashboard.baselineEraTitle") : era.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 block tabular-nums">
                      {era.ratio > 0
                        ? `${isRtl ? "1 رد : كل" : "1 :"} ${era.ratio}`
                        : isRtl
                          ? "0 ردود"
                          : "0 resp"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* If no changes logged yet: show ONE single locked dashed column (Zero Spoilers) */}
            {eras.length === 1 && (
              <div className="h-56 rounded-xl border-2 border-dashed border-border/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-4 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                  <Lock className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {t("dashboard.nextEraLocked")}
                </span>
                <p className="text-[10px] text-neutral-400 leading-normal max-w-[140px]">
                  {isRtl
                    ? "يُفتح عمود المقارنة فور تسجيل أول تعديل على أدواتك وسيرتك الذاتية"
                    : "Unlocks automatically upon logging your next resume or portfolio iteration"}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 pt-3 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>
              {isRtl
                ? "يقارن هذا الرسم كفاءة كل تجهيز أحدثته في استقطاب المقابلات"
                : "Compares market conversion traction across your iterative setups"}
            </span>
            <button
              type="button"
              onClick={() => setIsChangeModalOpen(true)}
              className="text-xs font-bold text-info-strong hover:underline"
            >
              {isRtl ? "+ تسجيل تحديث" : "+ Log Iteration"}
            </button>
          </div>
        </div>
      </section>

      {/* 5. Change Impact Tracker & Experiment Log (Requirement 4) */}
      <section
        aria-label={t("dashboard.changeTrackerTitle")}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t("dashboard.changeTrackerTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {t("dashboard.changeTrackerSubtitle")}
            </p>
          </div>

          {currentWeek >= 3 ? (
            <button
              type="button"
              onClick={() => setIsChangeModalOpen(true)}
              className="button-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("dashboard.recordNewChange")}</span>
            </button>
          ) : (
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400 max-w-md">
              <span>
                {isRtl
                  ? "يتم تسجيل تحديثات السيرة الذاتية (CV v1, v2) تلقائياً عند رفع ملف جديد في صفحة الملف الشخصي. فتح إمكانية تسجيل التغييرات اليدوية الإضافية (لينكدإن، البورتفوليو، المراسلات) سيبدأ تلقائياً مع الأسبوع 3."
                  : "CV updates (CV v1, v2) are automatically logged when uploading a new file in your Profile. Manual changes (LinkedIn, Portfolio, Outreach) unlock in Week 3."}
              </span>
            </div>
          )}
        </div>

        {/* Cards Grid: Baseline + Registered Changes + Single Next Locked Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Baseline Card */}
          <div className="rounded-xl border border-border bg-neutral-50/60 dark:bg-neutral-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neutral-200/80 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                {isRtl ? "النسخة 1 (خط الأساس)" : "Version 1 (Baseline)"}
              </span>
              <span className="text-[10px] text-neutral-400">
                {new Date(baselineChange.createdAt).toLocaleDateString(
                  isRtl ? "ar-EG" : "en-US",
                  { month: "short", day: "numeric" },
                )}
              </span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {baselineChange.title}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {baselineChange.note}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isRtl ? "الطلبات بهذه النسخة:" : "Apps Sent:"}</span>
                <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {number(eras[0]?.appsCount ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                <span>{isRtl ? "الردود المحققة:" : "Responses:"}</span>
                <span className="font-bold tabular-nums text-info-strong">
                  {number(eras[0]?.responsesCount ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>{isRtl ? "معدل الاستجابة:" : "Traction Rate:"}</span>
                <span className="tabular-nums">{eras[0]?.rate ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* 2. Registered Changes Cards */}
          {eras.slice(1).map((era, i) => (
            <div
              key={era.id}
              className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-bold text-info-strong">
                  {isRtl ? `تحديث #${i + 1}` : `Iteration #${i + 1}`}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {new Date(era.startDate).toLocaleDateString(
                    isRtl ? "ar-EG" : "en-US",
                    { month: "short", day: "numeric" },
                  )}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {era.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2">
                  {allChanges[i + 1]?.note || ""}
                </p>
              </div>

              {/* Performance During Era */}
              <div className="rounded-lg border border-border/70 bg-neutral-50/50 dark:bg-neutral-900/40 p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{isRtl ? "الطلبات المرسلة:" : "Apps Sent:"}</span>
                  <span className="font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {number(era.appsCount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{isRtl ? "الردود:" : "Responses:"}</span>
                  <span className="font-bold tabular-nums text-info-strong">
                    {number(era.responsesCount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>{isRtl ? "معدل التحول:" : "Traction Rate:"}</span>
                  <span className="tabular-nums">{era.rate}%</span>
                </div>
              </div>

              {/* Impact Verdict Box */}
              {era.verdict && (
                <div
                  className={`rounded-lg border p-2.5 text-xs ${
                    era.verdict.status === "IMPROVED"
                      ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                      : era.verdict.status === "TESTING"
                        ? "border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"
                        : "border-border bg-neutral-100/70 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {era.verdict.status === "IMPROVED" ? (
                    <div>
                      <span className="font-bold block">
                        {isRtl
                          ? `أثر إيجابي: ارتفع معدل الاستجابة بـ +${era.verdict.deltaPercent}% ↗`
                          : `Positive Lift: Response rate rose by +${era.verdict.deltaPercent}% ↗`}
                      </span>
                      <p className="mt-0.5 text-[10px] opacity-90">
                        {isRtl
                          ? "التعديل حقق نتيجة ملموسة مقارنة بالتجهيز السابق."
                          : "This tooling adjustment drove measurable improvement."}
                      </p>
                    </div>
                  ) : era.verdict.status === "TESTING" ? (
                    <div>
                      <span className="font-bold block">
                        {isRtl
                          ? `قيد الاختبار — أرسل ${era.verdict.remainingNeeded} طلبات إضافية`
                          : `Testing — Send ${era.verdict.remainingNeeded} more apps`}
                      </span>
                      <p className="mt-0.5 text-[10px] opacity-90">
                        {isRtl
                          ? "العينة الحالية قيد الجمع للحكم على أثر التعديل."
                          : "Building sample to compute statistically valid delta."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold block">
                        {isRtl
                          ? "لم يظهر تحسن بعد — راجع الملاحظات 💡"
                          : "No lift yet — Review guidance 💡"}
                      </span>
                      <p className="mt-0.5 text-[10px] opacity-90">
                        {isRtl
                          ? "استعن بنموذج التقييم في محطة المراجعة القادمة."
                          : "Refine targeting keywords at your next review checkpoint."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 3. Next Expected Station Card (Single Locked Card - Zero Spoilers) */}
          <div className="rounded-xl border-2 border-dashed border-border/80 bg-neutral-50/40 dark:bg-neutral-900/30 p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                <span>
                  {currentWeek === 0
                    ? isRtl
                      ? "محطة التعديل الأولى"
                      : "First Iteration Station"
                    : isRtl
                      ? `محطة مراجعة الأسبوع ${currentWeek}`
                      : `Week ${currentWeek} Review Station`}
                </span>
              </span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentWeek === 0
                  ? isRtl
                    ? "التطوير التأسيسي بعد المهمة صفر"
                    : "Foundational Pivot after Task 0"
                  : isRtl
                    ? "محطة التقييم والتعديل (اليوم السابع)"
                    : "Day 7 Strategic Review Station"}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                {currentWeek === 0
                  ? isRtl
                    ? "أكمل المهمة صفر (أول 5 طلبات) لفتح إرشادات التعديل الأول للسيرة الذاتية وقياس الفارق في النتائج."
                    : "Complete Task 0 (first 5 applications) to unlock initial resume upgrade guidance."
                  : isRtl
                    ? "تُفتح محطة التقييم في اليوم السابع لمراجعة نتائج هذا الأسبوع وتعديل أدواتك."
                    : "Unlocks on Day 7 to review weekly results and calibrate your tooling."}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">
                {currentWeek === 0 ? "5 / 5" : isRtl ? "اليوم السابع" : "Day 7"}
              </span>
              <button
                type="button"
                onClick={openJourneyTasksPanel}
                className="font-bold text-info-strong hover:underline"
              >
                {isRtl ? "متابعة المهام الحالية" : "View Active Tasks"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Modal: Log New Tooling Change (Requirement 4.B) */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {t("dashboard.changeModalTitle")}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {t("dashboard.changeModalSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewChange} className="space-y-4">
              {/* Category Pills (Without CV Update - CV is automated upon upload) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  {t("dashboard.fieldCategory")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: "PORTFOLIO_UPDATE" as ChangeCategory,
                      label: t("dashboard.categoryPortfolio"),
                      icon: FolderGit2,
                    },
                    {
                      id: "LINKEDIN_OPTIMIZATION" as ChangeCategory,
                      label: t("dashboard.categoryLinkedIn"),
                      icon: Share2,
                    },
                    {
                      id: "PITCH_STRATEGY" as ChangeCategory,
                      label: t("dashboard.categoryPitch"),
                      icon: Send,
                    },
                  ].map((cat) => {
                    const isSelected = newChangeCategory === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewChangeCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-start text-xs font-medium transition-all flex items-start gap-2 ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-xs font-bold dark:border-white dark:bg-white dark:text-neutral-900"
                            : "border-border bg-surface text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <IconComp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  {t("dashboard.fieldChangeTitle")}
                </label>
                <input
                  type="text"
                  required
                  value={newChangeTitle}
                  onChange={(e) => setNewChangeTitle(e.target.value)}
                  placeholder={
                    isRtl
                      ? "مثال: تعديل البورتفوليو وإضافة مشاريع الإنتاج السابقة"
                      : "e.g., Added production projects to portfolio"
                  }
                  className="w-full rounded-xl border border-border bg-neutral-50/60 dark:bg-neutral-900 px-3.5 py-2 text-xs text-neutral-900 dark:text-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              {/* Specific Note Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  {t("dashboard.fieldChangeNote")}
                </label>
                <textarea
                  rows={3}
                  value={newChangeNote}
                  onChange={(e) => setNewChangeNote(e.target.value)}
                  placeholder={
                    isRtl
                      ? "أضفت أرقام الأثر والنتائج وحذفت الكلمات المكررة في الوظائف السابقة..."
                      : "Quantified results and trimmed legacy bullet points..."
                  }
                  className="w-full rounded-xl border border-border bg-neutral-50/60 dark:bg-neutral-900 p-3 text-xs text-neutral-900 dark:text-white focus:border-neutral-900 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="button-secondary px-4 py-2 text-xs font-semibold"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!newChangeTitle.trim()}
                  className="button-primary px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {t("dashboard.btnSaveChange")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
