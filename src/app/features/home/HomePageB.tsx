import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpLeft,
  Check,
  Clock3,
  Compass,
  Eye,
  FileText,
  FlaskConical,
  Globe2,
  Layers3,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Sparkles,
  UsersRound,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { useAuth } from "../auth/store/authStore";
import { JourneyTasksPanel } from "../../components/JourneyTasksPanel";
import { openJourneyTasksPanel } from "../../components/journeyTasksPanelEvents";
import { trackSectionAction } from "../ux-lab/SectionExperience";
import { useNavigate } from "react-router";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { GoalIllustration } from "./GoalIllustration";
import { JourneyTrail } from "./JourneyTrail";
import {
  createHomeApi,
  type HomeNode,
  type Peer,
  type Scenario,
  type Branch,
} from "./home-preview-api";
import { useJourneyState } from "../journey/api/journeyApi";
import "./home-preview.css";
import "./journey-trail.css";
type PeopleScope = "ME" | "GROUP" | "PLATFORM";
const scenarios: [Scenario, string, string][] = [
  ["START", "بداية الرحلة", "Starting out"],
  ["WEEK_ONE", "الأسبوع الأول · السيرة", "Week one · CV foundation"],
  ["AFTER_WEEK_TWO", "بعد الأسبوع الثاني", "After week two"],
  ["FINISHED", "رحلة مكتملة", "Journey completed"],
  ["WAITING", "انتظار موعد المراجعة", "Waiting for the review"],
];
type Detail =
  | { kind: "station"; code: string }
  | { kind: "branch"; code: string; branch: Branch }
  | { kind: "peer" | "portfolio" | "cv"; peer: Peer; code: string };
const initials = (s: string) =>
  s
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
export default function HomePageB({ preview = true }: { preview?: boolean }) {
  const homePreviewApi = useMemo(() => createHomeApi(preview), [preview]);
  const { locale, number } = useI18n(),
    ar = locale === "ar",
    text = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [scenario, setScenario] = useState<Scenario>("START"),
    [scope, setScope] = useState<PeopleScope>("ME"),
    [allSpecialties, setAllSpecialties] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null),
    [peerPage, setPeerPage] = useState(1),
    [mapExpanded, setMapExpanded] = useState(false);
  const exampleRequested = useRef(false),
    focusCurrentRequested = useRef(false);
  const mapSection = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: [preview ? "home-preview" : "home-member", user?.id, scenario],
    queryFn: () => homePreviewApi.home(scenario),
    enabled: preview ? user?.role === "ADMIN" : user?.role === "USER",
    staleTime: preview ? 30_000 : 0,
  });
  const journeyState = useJourneyState({
    enabled: !preview && user?.role === "USER",
  });
  const data = query.data;
  const showGroup = scope === "GROUP";
  const showPlatform = scope === "PLATFORM";
  const hasGroup = preview
    ? Boolean(data?.viewer.groupUnlocked)
    : Boolean(data?.viewer.hasGroup);
  const previousJourneyUpdate = useRef<number | null>(null);
  const unlockToastShown = useRef(false);
  useEffect(() => {
    const updatedAt = journeyState.dataUpdatedAt;
    if (!updatedAt) return;
    if (previousJourneyUpdate.current === null) {
      previousJourneyUpdate.current = updatedAt;
      return;
    }
    if (previousJourneyUpdate.current === updatedAt) return;
    previousJourneyUpdate.current = updatedAt;
    if (query.data) void query.refetch();
  }, [journeyState.dataUpdatedAt, query.data, query.refetch]);
  useEffect(() => {
    if (
      preview ||
      !user?.id ||
      !data?.viewer.outsideUnlocked ||
      unlockToastShown.current
    )
      return;
    const key = `nawah_home_platform_unlocked_${user.id}_v1`;
    try {
      if (localStorage.getItem(key) === "true") {
        unlockToastShown.current = true;
        return;
      }
      localStorage.setItem(key, "true");
    } catch {
      // The unlocked state is still enforced by the server if storage is unavailable.
    }
    unlockToastShown.current = true;
    showToast({
      message: text(
        "🎉 أتممت مراجعة الأسبوع الثاني. اتفتح عرض أعضاء المنصة على خريطة رحلتك.",
        "🎉 You completed the week two review. Platform members are now available on your journey map.",
      ),
      variant: "success",
    });
  }, [preview, user?.id, data?.viewer.outsideUnlocked, showToast, text]);
  useEffect(() => {
    setDetail(null);
    const example = exampleRequested.current;
    setScope(example ? "PLATFORM" : "ME");
    setAllSpecialties(example);
    exampleRequested.current = false;
  }, [scenario]);
  const nodes = data?.weeks.flatMap((w) => w.nodes) ?? [],
    current = nodes.find((n) => n.code === data?.currentCode);
  const selected = detail ? nodes.find((n) => n.code === detail.code) : null;
  useEffect(
    () => setPeerPage(1),
    [scenario, selected?.code, scope, allSpecialties],
  );
  const peers = useQuery({
    queryKey: [
      preview ? "home-preview-peers" : "home-member-peers",
      user?.id,
      scenario,
      selected?.code,
      scope,
      allSpecialties,
      peerPage,
    ],
    enabled: !!selected && detail?.kind === "station" && scope !== "ME",
    queryFn: () =>
      homePreviewApi.peers(
        scenario,
        selected!.code,
        scope === "PLATFORM" ? (allSpecialties ? "ALL" : "SPECIALTY") : "GROUP",
        peerPage,
        showPlatform,
      ),
  });
  const verifiedPeer = useQuery({
    queryKey: [
      preview ? "home-preview-profile" : "home-member-profile",
      user?.id,
      scenario,
      detail && "peer" in detail ? detail.peer.id : null,
    ],
    enabled: !!detail && "peer" in detail,
    queryFn: () =>
      homePreviewApi.peer(
        scenario,
        detail && "peer" in detail ? detail.peer.id : "",
      ),
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null),
    [pdfError, setPdfError] = useState(false),
    [pdfRetry, setPdfRetry] = useState(0);
  useEffect(() => {
    setPdfUrl(null);
    setPdfError(false);
    if (detail?.kind !== "cv") return;
    let active = true,
      url: string | null = null;
    homePreviewApi
      .cv(scenario, detail.peer.id)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => {
        if (active) setPdfError(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [
    detail?.kind,
    detail && "peer" in detail ? detail.peer.id : null,
    scenario,
    pdfRetry,
  ]);
  const currentRef = useRef<HTMLButtonElement>(null);
  const focusCurrent = () => {
    currentRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    currentRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!mapExpanded || !data || !focusCurrentRequested.current) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        focusCurrentRequested.current = false;
        focusCurrent();
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [mapExpanded, data]);
  const goToCurrent = () => {
    if (mapExpanded) focusCurrent();
    else {
      focusCurrentRequested.current = true;
      setMapExpanded(true);
    }
  };
  const showPeerExample = () => {
    if (scenario === "AFTER_WEEK_TWO") {
      setScope("PLATFORM");
      setAllSpecialties(true);
      goToCurrent();
    } else {
      exampleRequested.current = true;
      focusCurrentRequested.current = true;
      setMapExpanded(true);
      setScenario("AFTER_WEEK_TWO");
    }
  };
  const toggleMap = () => {
    const wasExpanded = mapExpanded;
    setMapExpanded(!wasExpanded);
    if (wasExpanded)
      requestAnimationFrame(() => {
        const toggle =
          mapSection.current?.querySelector<HTMLButtonElement>(
            ".home-map-toggle",
          );
        toggle?.scrollIntoView({ behavior: "instant", block: "end" });
        toggle?.focus({ preventScroll: true });
      });
  };
  const peerName = (p: Peer) => text(p.nameAr, p.nameEn);
  const goals = [
    {
      kind: "skills" as const,
      numeral: "01",
      title: text("قدراتك ومهاراتك", "Your skills & capabilities"),
      copy: text(
        "اعرف تتكلم عن اللي اتعلّمته، وتشرح بتعرف تنفّذ إيه بأمثلة من شغلك.",
        "Explain what you have learned and what you can deliver, with examples from your work.",
      ),
      question: text(
        "هل عندك القدرات اللي محتاجينها؟",
        "Do you have the capabilities we need?",
      ),
      label: text("قدرات واضحة", "Clear capabilities"),
    },
    {
      kind: "people" as const,
      numeral: "02",
      title: text("أثرك على المستخدم", "Your impact on people"),
      copy: text(
        "اربط مهاراتك بمشكلة بتحلّها، وحدّد مين استفاد وإزاي شغلك سهّل عليه.",
        "Connect your skills to a problem you solve. Explain who benefits and how their experience improves.",
      ),
      question: text(
        "فاهم إزاي شغلك بيساعد عملاءنا؟",
        "How does your work help our customers?",
      ),
      label: text("أثر مفهوم", "Meaningful impact"),
    },
    {
      kind: "business" as const,
      numeral: "03",
      title: text("قيمتك للشركة", "Your value to the business"),
      copy: text(
        "وضّح إزاي أثر شغلك يخدم هدف للشركة، وادعم كلامك بالدليل المتاح عندك.",
        "Show how your work contributes to a business goal, supported by the evidence you actually have.",
      ),
      question: text(
        "فاهم إزاي شغلك بيأثر على الشركة؟",
        "How does your work support the business?",
      ),
      label: text("قيمة قابلة للشرح", "Value you can explain"),
    },
  ];
  const openStation = (n: HomeNode) => {
    if (!preview) {
      trackSectionAction("home_station_opened");
      openJourneyTasksPanel(n.code, n.week);
    } else openJourneyTasksPanel(n.code, n.week);
  };
  const mainLabel = (n: HomeNode) =>
    n.kind === "FINAL"
      ? text("التقرير النهائي", "Final report")
      : n.kind === "REVIEW"
        ? text("المراجعة", "Review")
        : n.week === 0
          ? text("المهمة صفر", "Task zero")
          : text("المهمة ", "Task ") +
            number(
              data?.weeks
                .find((w) => w.week === n.week)
                ?.nodes.filter((x) => x.kind === "TASK")
                .findIndex((x) => x.code === n.code)! + 1,
            );
  const peer = detail && "peer" in detail ? verifiedPeer.data : null;
  const modalTitle =
    detail?.kind === "station"
      ? selected?.status === "LOCKED"
        ? text("محطة قادمة", "An upcoming station")
        : text(selected?.titleAr ?? "", selected?.titleEn ?? "")
      : detail?.kind === "branch"
        ? text(
            detail.branch.titleAr ?? "محتوى مقفول",
            detail.branch.titleEn ?? "Locked content",
          )
        : detail?.kind === "cv"
          ? text(
              preview
                ? "السيرة الذاتية · نموذج تجريبي"
                : "السيرة الذاتية الحالية",
              preview ? "CV · synthetic example" : "Current CV",
            )
          : detail?.kind === "portfolio"
            ? text(
                preview ? "معرض الأعمال · نموذج تجريبي" : "معرض الأعمال",
                preview ? "Portfolio · synthetic example" : "Portfolio",
              )
            : peer
              ? peerName(peer)
              : text("الملف المهني", "Professional profile");
  return (
    <div className="home-b" dir={ar ? "rtl" : "ltr"}>
      {preview && (
        <header className="home-preview-bar">
          <div>
            <FlaskConical size={17} />
            <strong>{text("الرئيسية B", "Home B")}</strong>
            <span>
              {text(
                "معاينة الأدمن فقط · بيانات تجريبية",
                "Admin preview only · synthetic data",
              )}
            </span>
          </div>
          <label>
            <span>{text("جرّب مرحلة", "Preview a stage")}</span>
            <select
              aria-label={text("سيناريو المعاينة", "Preview scenario")}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              {scenarios.map(([id, a, e]) => (
                <option key={id} value={id}>
                  {text(a, e)}
                </option>
              ))}
            </select>
          </label>
          <Link to="/admin/ux-lab">
            {text("معمل التجارب", "Experiment lab")}
            <ArrowUpLeft size={14} />
          </Link>
        </header>
      )}
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-eyebrow">
          <Compass size={15} />
          {text(
            "مشروع نواة · رحلة مهنية باتجاه أوضح",
            "NAWAH PROJECT · A clearer professional direction",
          )}
        </div>
        <h1 id="home-title">
          {text("رحلتك علشان تعرف", "A journey to make")}{" "}
          <em>{text("توضّح قيمتك.", "your value clear.")}</em>
        </h1>
        <p className="home-intro-copy">
          {text(
            "الهدف مش مجرد عدد تقديمات. الرحلة دي بتساعدك تبني إجابة واضحة على ٣ أسئلة مهمة في التوظيف.",
            "It goes beyond counting applications. Build a clear answer to three important hiring questions.",
          )}
        </p>
        <div className="home-goals">
          {goals.map((g) => (
            <article className={`home-goal home-goal--${g.kind}`} key={g.kind}>
              <div className="home-goal-top">
                <span>{g.numeral}</span>
                <small>{g.label}</small>
              </div>
              <GoalIllustration kind={g.kind} />
              <h2>{g.title}</h2>
              <p>{g.copy}</p>
              <footer>
                <span>
                  {text("السؤال اللي بتجاوب عليه", "The question you answer")}
                </span>
                <strong>«{g.question}»</strong>
              </footer>
            </article>
          ))}
        </div>
        <p className="home-purpose">
          <Sparkles size={18} />
          <span>
            {text(
              "لما تعرف توضّح قدراتك، وأثرها على الناس، وقيمتها للشركة، تقدر تقدّم نفسك بأدلة أوضح في السيرة والمقابلة.",
              "When you connect your capabilities, their impact on people and their value to a business, you can present clearer evidence in your CV and interviews.",
            )}
          </span>
        </p>
      </section>
      {query.isPending && (
        <div className="home-loading" role="status">
          <Compass size={26} />
          {text(
            preview ? "بنجهّز خريطة المعاينة…" : "بنجهّز خريطة رحلتك…",
            preview
              ? "Preparing your preview map…"
              : "Preparing your journey map…",
          )}
        </div>
      )}
      {query.isError && (
        <div className="home-error" role="alert">
          <p>
            {text(
              preview
                ? "تعذر تحميل المعاينة. حاول مرة أخرى."
                : "تعذر تحميل خريطة رحلتك. يمكنك إعادة المحاولة أو فتح الطلبات من القائمة.",
              preview
                ? "Could not load the preview. Try again."
                : "Could not load your journey. Retry or open Applications from the navigation.",
            )}
          </p>
          <button onClick={() => query.refetch()}>
            <RefreshCw size={15} />
            {text("إعادة المحاولة", "Try again")}
          </button>
        </div>
      )}
      {data && current && (
        <>
          <section className="home-next" aria-labelledby="home-next-title">
            <div className="home-next-orbit" aria-hidden="true">
              <span />
              <span />
              <MapPin size={30} />
            </div>
            <div className="home-next-copy">
              <div className="home-eyebrow">
                <span className="home-live-dot" />
                {text("خطوتك دلوقتي", "Your next step")}
              </div>
              <h2 id="home-next-title">
                {text(data.nextAction.titleAr, data.nextAction.titleEn)}
              </h2>
              <p>{text(data.nextAction.detailAr, data.nextAction.detailEn)}</p>
              <div className="home-next-station">
                <MapPin size={14} />
                {mainLabel(current)} ·{" "}
                {text(current.titleAr ?? "", current.titleEn ?? "")}
              </div>
              {data.nextAction.availableAt && (
                <p className="home-opening">
                  <Clock3 size={15} />
                  {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
                    timeZone: "Africa/Cairo",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(data.nextAction.availableAt))}{" "}
                  · {text("بتوقيت القاهرة", "Cairo time")}
                </p>
              )}
            </div>
            <div className="home-next-actions">
              <button
                className="home-primary"
                onClick={() => {
                  if (!preview) trackSectionAction("home_continue_clicked");
                  if (!preview && data.nextAction.kind === "CV")
                    navigate(
                      "/professional-development?guidance=INSIGHT_TASK_0_CV_BASE",
                    );
                  else openStation(current);
                }}
              >
                {data.nextAction.kind === "REPORT"
                  ? text("راجع حصاد الرحلة", "Review your journey")
                  : data.nextAction.kind === "WAIT"
                    ? text("راجع شغلك الحالي", "Review your current work")
                    : text("كمّل من هنا", "Continue from here")}
                <ArrowUpLeft size={17} />
              </button>
              <span>
                {number(data.viewer.completedCount)} /{" "}
                {number(data.viewer.totalNodes)}{" "}
                {text("محطة مكتملة", "stations completed")}
              </span>
              <div className="home-overall-track">
                <i
                  style={{
                    width: `${(data.viewer.completedCount / data.viewer.totalNodes) * 100}%`,
                  }}
                />
              </div>
            </div>
          </section>
          <section
            className="home-map-section home-treasure-section"
            ref={mapSection}
            aria-labelledby="home-map-title"
          >
            <header className="home-map-heading home-map-masthead">
              <div>
                <span className="home-eyebrow">
                  <Layers3 size={15} />
                  {text(
                    "الصورة الكبيرة، وخطوة واحدة في وقتها",
                    "The bigger picture. One step at a time.",
                  )}
                </span>
                <h2 id="home-map-title">
                  {text("خريطة رحلتك", "Your journey map")}
                </h2>
                <p>
                  {text(
                    "شايف الطريق كله. تفاصيل كل محطة بتظهر لما توصل لها.",
                    "See the whole route. Each station reveals its details when you reach it.",
                  )}
                </p>
              </div>
              <button className="home-secondary" onClick={goToCurrent}>
                <MapPin size={16} />
                {text("اذهب لمحطتي", "Find my station")}
              </button>
            </header>
            <div className="home-map-controls">
              <div className="home-people-filters">
                <span>
                  {text("مين ظاهر على الخريطة؟", "Who is on the map?")}
                </span>
                <button
                  type="button"
                  aria-pressed={scope === "ME"}
                  onClick={() => {
                    setScope("ME");
                    if (!preview) trackSectionAction("home_scope_changed");
                  }}
                  className={`home-filter self ${scope === "ME" ? "on" : ""}`}
                >
                  <MapPin size={13} />
                  {text("أنا", "Me")}
                </button>
                <button
                  type="button"
                  aria-pressed={showGroup}
                  onClick={() => {
                    if (!data.viewer.groupUnlocked || !hasGroup) {
                      showToast({
                        message: !data.viewer.groupUnlocked
                          ? text(
                              "أكمل المهمة صفر أولًا؛ بعدها يتم تعيينك لمجموعة وتقدر تشوف تقدم أعضائها.",
                              "Complete Task zero first. You will then be assigned to a group and can view its members.",
                            )
                          : text(
                              "هيظهر تقدم أعضاء المجموعة بعد انضمامك لمجموعة.",
                              "Group progress will appear after you join a group.",
                            ),
                        variant: "info",
                      });
                      return;
                    }
                    setScope("GROUP");
                    if (!preview) trackSectionAction("home_scope_changed");
                  }}
                  className={`home-filter group ${showGroup ? "on" : ""}`}
                  aria-label={text("مجموعتي", "My group")}
                >
                  <UsersRound size={15} />
                  {text("مجموعتي", "My group")}
                  {(!data.viewer.groupUnlocked || !hasGroup) && (
                    <LockKeyhole size={12} />
                  )}
                </button>
                <button
                  type="button"
                  aria-pressed={showPlatform}
                  disabled={!data.viewer.outsideUnlocked}
                  title={
                    !data.viewer.outsideUnlocked
                      ? text(
                          "يُفتح بعد إكمال الأسبوع الثاني ومراجعته.",
                          "Unlocks after completing and reviewing week two.",
                        )
                      : undefined
                  }
                  onClick={() => {
                    setScope("PLATFORM");
                    if (!preview) trackSectionAction("home_scope_changed");
                  }}
                  className={`home-filter platform ${showPlatform ? "on" : ""} ${!data.viewer.outsideUnlocked ? "locked" : ""}`}
                >
                  <Globe2 size={15} />
                  {text("أعضاء المنصة", "Platform members")}
                  {!data.viewer.outsideUnlocked && <LockKeyhole size={12} />}
                </button>
                <select
                  aria-label={text(
                    "نطاق أعضاء المنصة",
                    "Platform member scope",
                  )}
                  disabled={!showPlatform}
                  value={allSpecialties ? "ALL" : "SPECIALTY"}
                  onChange={(e) => setAllSpecialties(e.target.value === "ALL")}
                >
                  <option value="SPECIALTY">
                    {text("نفس تخصصي", "My specialization")}
                  </option>
                  <option value="ALL">
                    {text("كل التخصصات", "All specializations")}
                  </option>
                </select>
              </div>
              <p>
                {scope === "ME"
                  ? text(
                      data.viewer.outsideUnlocked
                        ? "الخريطة تعرض تقدمك أنت فقط. يمكنك اختيار مجموعتك أو أعضاء المنصة لعرض زملائك."
                        : "الخريطة تعرض تقدمك أنت فقط. تنفتح المنصة بعد إكمال الأسبوع الثاني ومراجعته.",
                      data.viewer.outsideUnlocked
                        ? "The map shows only your own progress. Choose your group or platform members to see peers."
                        : "The map shows only your own progress. Platform members unlock after completing and reviewing week two.",
                    )
                  : scope === "GROUP" && !data.viewer.groupUnlocked
                    ? text(
                        "هتظهر مجموعتك بعد إكمال المهمة صفر والانضمام لمجموعة.",
                        "Your group appears after you complete Task zero and join a group.",
                      )
                    : scope === "GROUP" && !hasGroup
                      ? text(
                          "هيظهر تقدم المجموعة بعد انضمامك لمجموعة.",
                          "Group progress appears after you join a group.",
                        )
                      : showPlatform && !data.viewer.outsideUnlocked
                        ? text(
                            "أعضاء المنصة يفتحوا بعد إكمال الأسبوع الثاني ومراجعته.",
                            "Platform members unlock after completing and reviewing week two.",
                          )
                        : showPlatform
                          ? text(
                              "عرض المنصة يشمل أعضاء مجموعتك؛ تفاصيل من خارجها تظهر بعد مراجعة الأسبوع الثاني.",
                              "Platform view includes your group. Outside profiles appear after the week two review.",
                            )
                          : text(
                              "الخريطة تعرض تقدم أعضاء مجموعتك فقط.",
                              "The map shows progress from your group only.",
                            )}
              </p>
            </div>
            {preview && (
              <div className="home-peer-example">
                <div>
                  <UsersRound size={18} />
                  <span>
                    <strong>
                      {text(
                        "شوف ظهور زملائك على الطريق",
                        "See your peers along the route",
                      )}
                    </strong>
                    <small>
                      {text(
                        "المجموعة خضراء والمنصة زرقاء. زر المثال يعرض حالة تجريبية بعد الأسبوع الثاني.",
                        "Green marks your group; blue marks the platform. The example shows a synthetic post-week-two state.",
                      )}
                    </small>
                  </span>
                </div>
                <button
                  onClick={showPeerExample}
                  className="home-example-button"
                >
                  <Eye size={15} />
                  {text("شوف مثال لتقدم الزملاء", "Show peer progress example")}
                </button>
              </div>
            )}
            <div className="home-map-legend">
              <span>
                <i className="current" />
                {text("أنت هنا", "You are here")}
              </span>
              <span>
                <Check size={13} />
                {text("مكتمل", "Completed")}
              </span>
              <span>
                <LockKeyhole size={13} />
                {text("تفاصيل لسه مقفولة", "Details not yet open")}
              </span>
              {scope === "GROUP" && (
                <span className="group">
                  <UsersRound size={13} />
                  {text("من مجموعتك", "Your group")}
                </span>
              )}
              {showPlatform && (
                <span className="platform">
                  <Globe2 size={13} />
                  {text("من المنصة", "Platform members")}
                </span>
              )}
            </div>
            <div
              className={`home-map-window ${mapExpanded ? "expanded" : "collapsed"}`}
              id="home-map-window"
              role="region"
              aria-label={text("مساحة خريطة الرحلة", "Journey map area")}
            >
              <JourneyTrail
                data={data}
                expanded={mapExpanded}
                board={board}
                currentRef={currentRef}
                showGroup={showGroup}
                showPlatform={showPlatform}
                allSpecialties={allSpecialties}
                onStation={openStation}
                onPeers={(node) =>
                  setDetail({ kind: "station", code: node.code })
                }
                onBranch={(node, branch) =>
                  !preview
                    ? branch.kind === "GUIDANCE" && !branch.locked
                      ? navigate(
                          `/professional-development?guidance=${encodeURIComponent(branch.id)}`,
                        )
                      : openJourneyTasksPanel(node.code, node.week)
                    : setDetail({ kind: "branch", code: node.code, branch })
                }
              />
            </div>
            <div className="home-map-expand-bar">
              <button
                className="home-map-toggle"
                aria-expanded={mapExpanded}
                aria-controls="home-map-window"
                onClick={toggleMap}
              >
                {mapExpanded ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
                <span>
                  {mapExpanded
                    ? text("اختصار عرض الخريطة", "Collapse journey map")
                    : text("عرض الخريطة كاملة", "Show the full journey map")}
                </span>
              </button>
              <small>
                {mapExpanded
                  ? text(
                      "الخريطة كاملة · بدون زوم أو سحب",
                      "Full map · no zoom or panning",
                    )
                  : text(
                      "المهمة صفر وأربعة أسابيع متصلة",
                      "Task zero and four connected weeks",
                    )}
              </small>
            </div>
            <footer className="home-map-foot">
              <LockKeyhole size={14} />
              {text(
                "كل محطة بتتفتح بإنجاز متطلباتها وفي موعدها. وجود زميل عليها لا يفتحها لك.",
                "Stations open when requirements and timing are met. A peer being there does not unlock them for you.",
              )}
            </footer>
          </section>
          {preview && (
            <footer className="home-preview-note">
              <Eye size={15} />
              {text(
                "دي معاينة B مستقلة ببيانات تجريبية؛ لا تغيّر تعيينات المستخدمين ولا تحفظ تقدمًا أو طلبات أو ملفات.",
                "This independent Home B preview uses synthetic data. It does not change assignments or save progress, applications or files.",
              )}
            </footer>
          )}
        </>
      )}
      {preview && data && <JourneyTasksPanel preview={data} />}
      {detail && data && (
        <Modal
          isOpen
          onClose={() => setDetail(null)}
          title={modalTitle}
          subtitle={text(
            preview ? "معاينة B · بيانات تجريبية فقط" : "رحلتك وزملاؤك",
            preview
              ? "Home B preview · synthetic data only"
              : "Your journey and peers",
          )}
          size={detail.kind === "cv" ? "2xl" : "xl"}
        >
          <div className="home-detail" dir={ar ? "rtl" : "ltr"}>
            {detail.kind !== "station" && (
              <button
                className="home-back"
                onClick={() =>
                  setDetail(
                    detail.kind === "cv" || detail.kind === "portfolio"
                      ? { kind: "peer", peer: detail.peer, code: detail.code }
                      : { kind: "station", code: detail.code },
                  )
                }
              >
                <ArrowRight size={15} />
                {detail.kind === "cv" || detail.kind === "portfolio"
                  ? text("رجوع للملف المهني", "Back to profile")
                  : text("رجوع للمحطة", "Back to station")}
              </button>
            )}
            {detail.kind === "station" && selected && (
              <>
                {selected.status === "LOCKED" ? (
                  <div className="home-locked-detail">
                    <LockKeyhole size={25} />
                    <h3>
                      {text(
                        "مكانها واضح. تفاصيلها لسه في وقتها.",
                        "The place is visible. Its details will unfold.",
                      )}
                    </h3>
                    <p>
                      {text(
                        "كمّل محطتك الحالية علشان تتكشف الخطوات اللي بعدها. تقدر تشوف الزملاء المسموح بعرضهم من غير فتح محتوى المحطة.",
                        "Complete your current station to reveal the following steps. You can view eligible peers without revealing the station content.",
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="home-detail-copy">
                      {text(
                        selected.descriptionAr ?? "",
                        selected.descriptionEn ?? "",
                      )}
                    </p>
                    <div className="home-detail-requirements">
                      {selected.requirements.map((r) => (
                        <div key={r.key}>
                          <span>{text(r.titleAr, r.titleEn)}</span>
                          <b>
                            {number(r.current)} / {number(r.required)}
                          </b>
                          <progress value={r.current} max={r.required} />
                        </div>
                      ))}
                    </div>
                    {preview && selected.code === current?.code && (
                      <div className="home-action-explainer">
                        <h3>
                          {text(
                            data.nextAction.titleAr,
                            data.nextAction.titleEn,
                          )}
                        </h3>
                        <p>
                          {text(
                            data.nextAction.detailAr,
                            data.nextAction.detailEn,
                          )}
                        </p>
                        {data.nextAction.kind === "CV" ? (
                          <ol>
                            <li>
                              {text(
                                "راجع أمثلة مهاراتك، والحلول التي ساعدت بها المستخدم، والقيمة للشركة.",
                                "Review your skills, useful solutions and business value.",
                              )}
                            </li>
                            <li>
                              {text(
                                "طبّق التعديلات على سيرتك، ثم ارفع النسخة الجديدة داخل الإرشاد في التجربة الفعلية.",
                                "Apply the revision, then upload the new CV inside the guidance in the live experience.",
                              )}
                            </li>
                          </ol>
                        ) : data.nextAction.kind === "APPLICATION" ? (
                          <div className="home-form-example">
                            <span>
                              {text(
                                "نموذج الخطوة التالية",
                                "Example of the next step",
                              )}
                            </span>
                            <label>
                              {text("اسم الشركة", "Company")}
                              <input
                                value={text("شركة تجريبية", "Example company")}
                                readOnly
                              />
                            </label>
                            <label>
                              {text("المسمى الوظيفي", "Job title")}
                              <input value="UI/UX Designer" readOnly />
                            </label>
                            <small>
                              {text(
                                "عرض توضيحي فقط؛ لا يتم إنشاء طلب تقديم.",
                                "Read-only illustration. No application is created.",
                              )}
                            </small>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
                <section className="home-peers">
                  <h3>
                    <UsersRound size={17} />
                    {text("مين موجود في المحطة دي؟", "Who is at this station?")}
                  </h3>
                  {!showGroup && !showPlatform ? (
                    <p className="home-detail-copy">
                      {text(
                        "أنت فقط هو النطاق المحدد. اختر مجموعتي أو أعضاء المنصة لعرض الزملاء هنا.",
                        "Me only is selected. Choose My group or Platform members to see peers here.",
                      )}
                    </p>
                  ) : peers.isPending ? (
                    <p role="status">
                      {text("تحميل الزملاء…", "Loading peers…")}
                    </p>
                  ) : peers.isError ? (
                    <div role="alert">
                      <p>
                        {text("تعذر تحميل الزملاء.", "Could not load peers.")}
                      </p>
                      <button
                        className="home-secondary"
                        onClick={() => peers.refetch()}
                      >
                        {text("إعادة المحاولة", "Try again")}
                      </button>
                    </div>
                  ) : (
                    <>
                      {peers.data?.items.map((p) => (
                        <button
                          className="home-peer-row"
                          key={p.id}
                          onClick={() =>
                            setDetail({
                              kind: "peer",
                              peer: p,
                              code: selected.code,
                            })
                          }
                        >
                          <span className="home-avatar">
                            {initials(peerName(p))}
                          </span>
                          <span>
                            <strong>{peerName(p)}</strong>
                            <small>{p.specialization}</small>
                          </span>
                          <span
                            className={
                              p.inGroup
                                ? "home-group-count"
                                : "home-platform-count"
                            }
                          >
                            {p.inGroup ? (
                              <UsersRound size={13} />
                            ) : (
                              <Globe2 size={13} />
                            )}
                          </span>
                          <ArrowUpLeft size={15} />
                        </button>
                      ))}
                      {peers.data && peers.data.total > peers.data.pageSize && (
                        <nav
                          className="home-peer-pagination"
                          aria-label={text("صفحات الزملاء", "Peer pages")}
                        >
                          <button
                            className="home-secondary"
                            disabled={peerPage <= 1}
                            onClick={() => setPeerPage((n) => n - 1)}
                          >
                            {text("السابق", "Previous")}
                          </button>
                          <span>
                            {number(peerPage)} /{" "}
                            {number(
                              Math.ceil(peers.data.total / peers.data.pageSize),
                            )}
                          </span>
                          <button
                            className="home-secondary"
                            disabled={
                              peerPage >=
                              Math.ceil(peers.data.total / peers.data.pageSize)
                            }
                            onClick={() => setPeerPage((n) => n + 1)}
                          >
                            {text("التالي", "Next")}
                          </button>
                        </nav>
                      )}
                      {!!peers.data?.lockedGroupCount && (
                        <div className="home-locked-peers">
                          <LockKeyhole size={16} />
                          <p>
                            {text(
                              "زملاؤك في المجموعة يظهروا بعد إكمال المهمة صفر.",
                              "Your group opens after completing Task zero.",
                            )}
                          </p>
                        </div>
                      )}
                      {!!peers.data?.lockedOutsideCount && (
                        <div className="home-locked-peers">
                          <LockKeyhole size={17} />
                          <div>
                            <strong>
                              {number(peers.data.lockedOutsideCount)}{" "}
                              {text(
                                "من خارج مجموعتك هنا",
                                "outside your group are here",
                              )}
                            </strong>
                            <p>
                              {text(
                                "أكمل الأسبوع الثاني ومراجعته علشان تفتح أسماءهم والبورتفوليو والـCV الحالي.",
                                "Complete week two and its review to open their names, portfolios and current CVs.",
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      {!peers.data?.items.length &&
                        !peers.data?.lockedGroupCount &&
                        !peers.data?.lockedOutsideCount && (
                          <p className="home-empty">
                            {text(
                              "مفيش زملاء في المحطة دي ضمن النطاق المختار.",
                              "No peers at this station in the selected scope.",
                            )}
                          </p>
                        )}
                    </>
                  )}
                </section>
              </>
            )}
            {detail.kind === "branch" && (
              <div className="home-branch-detail">
                <span className="home-eyebrow">
                  <Sparkles size={15} />
                  {detail.branch.kind === "GUIDANCE"
                    ? text("إرشاد مرتبط بالرحلة", "Linked journey guidance")
                    : text("متطلب مرتبط بالمحطة", "A linked requirement")}
                </span>
                <h3>
                  {text(
                    detail.branch.titleAr ?? "",
                    detail.branch.titleEn ?? "",
                  )}
                </h3>
                {detail.branch.value && (
                  <p>
                    <strong>{number(detail.branch.value)}</strong>{" "}
                    {text("مطلوب في هذه المحطة.", "required at this station.")}
                  </p>
                )}
                <p>
                  {detail.branch.kind === "GUIDANCE"
                    ? text(
                        "حوّل الإرشاد لخطوة عملية: راجع المثال المناسب لتخصصك، طبّق ما تعلّمته، وسجّل الناتج في مكانه داخل الرحلة.",
                        "Turn guidance into action: review an example for your specialization, apply it, then record the result in its place in the journey.",
                      )
                    : text(
                        "جزء من متطلبات نفس المحطة، وليس محطة مستقلة. اكتماله يُحسب مع بقية متطلبات المهمة.",
                        "This is part of the station requirements, not a separate station. It contributes alongside the other requirements.",
                      )}
                </p>
                <div className="home-read-only">
                  <Eye size={15} />
                  {text(
                    "المحتوى هنا للمعاينة؛ القراءة لا تؤكد الإنجاز ولا تغيّر تقدم حساب.",
                    "Preview only. Reading does not confirm completion or change an account.",
                  )}
                </div>
              </div>
            )}
            {detail && "peer" in detail && verifiedPeer.isPending && (
              <p role="status">
                {text("تحميل الملف المهني…", "Loading professional profile…")}
              </p>
            )}
            {detail && "peer" in detail && verifiedPeer.isError && (
              <div role="alert">
                <p>
                  {text(
                    "الملف غير متاح في المرحلة الحالية.",
                    "This profile is not available at this stage.",
                  )}
                </p>
                <button
                  className="home-secondary"
                  onClick={() => verifiedPeer.refetch()}
                >
                  {text("إعادة المحاولة", "Try again")}
                </button>
              </div>
            )}
            {detail.kind === "peer" && peer && (
              <div className="home-professional-card">
                <span className="home-avatar large">
                  {initials(peerName(peer))}
                </span>
                <h3>{peerName(peer)}</h3>
                <p>{peer.specialization}</p>
                <span className="home-demo-label">
                  {text(
                    preview ? "شخصية تجريبية" : "الملف المهني",
                    preview ? "Synthetic member" : "Professional profile",
                  )}
                </span>
                <div className="home-profile-actions">
                  {peer.hasPortfolio ? (
                    <button
                      className="home-secondary"
                      onClick={() =>
                        setDetail({
                          kind: "portfolio",
                          peer,
                          code: detail.code,
                        })
                      }
                    >
                      {text("عرض الأعمال", "View portfolio")}
                      <ExternalLink size={16} />
                    </button>
                  ) : (
                    <p>
                      {text(
                        "لا يوجد بورتفوليو متاح.",
                        "No portfolio available.",
                      )}
                    </p>
                  )}
                  {peer.hasCv ? (
                    <button
                      className="home-primary"
                      onClick={() =>
                        setDetail({ kind: "cv", peer, code: detail.code })
                      }
                    >
                      {text("عرض السيرة الذاتية", "View CV")}
                      <FileText size={16} />
                    </button>
                  ) : (
                    <p>
                      {text("لا توجد سيرة ذاتية متاحة.", "No CV available.")}
                    </p>
                  )}
                </div>
                <small>
                  {text(
                    "لا تُعرض طلبات تقديم أو نسخ سيرة سابقة.",
                    "Applications and historical CVs are not shared here.",
                  )}
                </small>
              </div>
            )}
            {detail.kind === "portfolio" &&
              peer &&
              !preview &&
              peer.portfolioUrl && (
                <a
                  className="home-primary"
                  href={peer.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text("افتح البورتفوليو", "Open portfolio")}{" "}
                  <ExternalLink size={16} />
                </a>
              )}
            {detail.kind === "portfolio" && peer && preview && (
              <div className="home-portfolio">
                <span className="home-eyebrow">
                  {text(
                    "مشروع تجريبي · طريقة عرض القيمة",
                    "Sample project · explaining value",
                  )}
                </span>
                <h3>
                  {text(
                    "تبسيط رحلة إتمام طلب",
                    "Making an application flow easier",
                  )}
                </h3>
                <div className="home-portfolio-art">
                  <div>
                    <span />
                    <span />
                    <span />
                    <i />
                  </div>
                  <ArrowUpLeft size={35} />
                  <div>
                    <Check size={35} />
                    <strong>
                      {text("خطوة أوضح للمستخدم", "A clearer next step")}
                    </strong>
                  </div>
                </div>
                {goals.map((g) => (
                  <article key={g.kind}>
                    <h4>{g.title}</h4>
                    <p>
                      {g.kind === "skills"
                        ? text(
                            "بحث ومقابلات، تحديد المشكلة، وتجربة نموذج للواجهة.",
                            "Research, interviews, problem framing and interface prototyping.",
                          )
                        : g.kind === "people"
                          ? text(
                              "تقليل الالتباس حول المطلوب في كل خطوة. هذا هدف توضيحي، وليس نتيجة مقاسة.",
                              "Reduce uncertainty about each step. This is an illustrative goal, not a measured outcome.",
                            )
                          : text(
                              "مساعدة الفريق على تحسين إتمام الطلبات وتقليل طلبات الدعم، مع قياس النتيجة في المشروع الفعلي.",
                              "Help the team improve completion and reduce support needs, measured in the actual project.",
                            )}
                    </p>
                  </article>
                ))}
              </div>
            )}
            {detail.kind === "cv" && peer && (
              <div className="home-cv">
                {pdfError ? (
                  <div role="alert">
                    <p>{text("تعذر فتح الملف.", "Could not open the file.")}</p>
                    <button
                      className="home-secondary"
                      onClick={() => setPdfRetry((n) => n + 1)}
                    >
                      {text("إعادة المحاولة", "Try again")}
                    </button>
                  </div>
                ) : !pdfUrl ? (
                  <p role="status">
                    {text(
                      preview ? "تجهيز ملف تجريبي…" : "تجهيز السيرة الذاتية…",
                      preview
                        ? "Preparing the sample PDF…"
                        : "Preparing the CV…",
                    )}
                  </p>
                ) : (
                  <>
                    <a
                      className="home-secondary"
                      href={pdfUrl}
                      download={preview ? "nawah-sample-cv.pdf" : "cv.pdf"}
                    >
                      <FileText size={15} />
                      {text(
                        preview ? "تنزيل النموذج التجريبي" : "تنزيل السيرة",
                        preview ? "Download sample PDF" : "Download CV",
                      )}
                    </a>
                    <iframe
                      title={text(
                        preview ? "سيرة ذاتية تجريبية" : "السيرة الذاتية",
                        preview ? "Synthetic CV preview" : "CV",
                      )}
                      src={pdfUrl}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
