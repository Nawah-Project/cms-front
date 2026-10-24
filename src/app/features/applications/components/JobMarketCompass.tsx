import { useState, useMemo } from "react";
import { Compass, ChevronDown, ChevronUp, ExternalLink, Globe, Sparkles, AlertCircle } from "lucide-react";
import { useI18n } from "../../../i18n";
import { useAuth } from "../../auth/store/authStore";
import { useToast } from "../../../components/ui/ToastProvider";
import type { ApplicationMethod, CreateApplicationInput } from "../../../types";

// ============================================================================
// Macro-Markets and Sub-Countries Definition
// ============================================================================
interface SubCountry {
  key: string;
  labelAr: string;
  labelEn: string;
  flag: string;
}

interface MacroMarket {
  id: string;
  labelAr: string;
  labelEn: string;
  flag: string;
  subCountries?: SubCountry[];
}

const MACRO_MARKETS: MacroMarket[] = [
  {
    id: "Remote",
    labelAr: "عن بُعد (عالمي)",
    labelEn: "Remote / Global",
    flag: "🌐",
  },
  {
    id: "Egypt",
    labelAr: "مصر",
    labelEn: "Egypt",
    flag: "🇪🇬",
  },
  {
    id: "GCC",
    labelAr: "الخليج العربي",
    labelEn: "GCC",
    flag: "🌴",
    subCountries: [
      { key: "Saudi Arabia", labelAr: "السعودية", labelEn: "Saudi Arabia", flag: "🇸🇦" },
      { key: "UAE", labelAr: "الإمارات", labelEn: "UAE", flag: "🇦🇪" },
      { key: "Qatar", labelAr: "قطر", labelEn: "Qatar", flag: "🇶🇦" },
      { key: "Kuwait", labelAr: "الكويت", labelEn: "Kuwait", flag: "🇰🇼" },
      { key: "Oman", labelAr: "عُمان", labelEn: "Oman", flag: "🇴🇲" },
      { key: "Bahrain", labelAr: "البحرين", labelEn: "Bahrain", flag: "🇧🇭" },
    ],
  },
  {
    id: "Europe",
    labelAr: "أوروبا",
    labelEn: "Europe",
    flag: "🇪🇺",
    subCountries: [
      { key: "Germany", labelAr: "ألمانيا", labelEn: "Germany", flag: "🇩🇪" },
      { key: "United Kingdom", labelAr: "بريطانيا", labelEn: "United Kingdom", flag: "🇬🇧" },
      { key: "Netherlands", labelAr: "هولندا", labelEn: "Netherlands", flag: "🇳🇱" },
      { key: "Sweden", labelAr: "السويد", labelEn: "Sweden", flag: "🇸🇪" },
      { key: "France", labelAr: "فرنسا", labelEn: "France", flag: "🇫🇷" },
      { key: "Spain", labelAr: "إسبانيا", labelEn: "Spain", flag: "🇪🇸" },
    ],
  },
  {
    id: "North America",
    labelAr: "أمريكا الشمالية",
    labelEn: "North America",
    flag: "🌎",
    subCountries: [
      { key: "United States", labelAr: "أمريكا", labelEn: "United States", flag: "🇺🇸" },
      { key: "Canada", labelAr: "كندا", labelEn: "Canada", flag: "🇨🇦" },
    ],
  },
  {
    id: "APAC",
    labelAr: "آسيا والمحيط الهادئ",
    labelEn: "APAC",
    flag: "🌏",
    subCountries: [
      { key: "Singapore", labelAr: "سنغافورة", labelEn: "Singapore", flag: "🇸🇬" },
      { key: "Australia", labelAr: "أستراليا", labelEn: "Australia", flag: "🇦🇺" },
      { key: "Malaysia", labelAr: "ماليزيا", labelEn: "Malaysia", flag: "🇲🇾" },
    ],
  },
  {
    id: "LATAM",
    labelAr: "أمريكا اللاتينية",
    labelEn: "LATAM",
    flag: "🌎",
    subCountries: [
      { key: "Brazil", labelAr: "البرازيل", labelEn: "Brazil", flag: "🇧🇷" },
      { key: "Mexico", labelAr: "المكسيك", labelEn: "Mexico", flag: "🇲🇽" },
      { key: "Argentina", labelAr: "الأرجنتين", labelEn: "Argentina", flag: "🇦🇷" },
    ],
  },
];

// ============================================================================
// 18+ Job Platforms Definitions
// ============================================================================
interface PlatformConfig {
  id: string;
  name: string;
  category: "GLOBAL" | "REGIONAL";
  supportsLocationParam: boolean;
  method: ApplicationMethod;
  descriptionAr: string;
  descriptionEn: string;
  buildUrl: (title: string, location: string, isRemote: boolean) => string;
}

const PLATFORMS: PlatformConfig[] = [
  // --- Global Platforms ---
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "LINKEDIN",
    descriptionAr: "البحث المباشر عن الوظائف ومسؤولي التوظيف على شبكة LinkedIn",
    descriptionEn: "Direct search for jobs and hiring managers on LinkedIn",
    buildUrl: (title, location, isRemote) =>
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}${isRemote ? "&f_WT=2" : ""}`,
  },
  {
    id: "indeed",
    name: "Indeed",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "محرك البحث الأكبر للوظائف في مختلف الشركات العالمية",
    descriptionEn: "Largest job aggregator across global companies",
    buildUrl: (title, location) =>
      `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}&l=${encodeURIComponent(location)}`,
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف مع تقييمات بيئة العمل ومستويات الرواتب الحقيقية",
    descriptionEn: "Jobs with verified company ratings and salary insights",
    buildUrl: (title, location) =>
      `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(title)}&locKeyword=${encodeURIComponent(location)}`,
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف الشركات الناشئة والتقنية العالمية في مراحل النمو",
    descriptionEn: "Top startup and tech opportunities worldwide",
    buildUrl: (title, location) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://wellfound.com/jobs?role=${slug}&location=${encodeURIComponent(location)}`;
    },
  },
  {
    id: "otta",
    name: "Otta (Welcome to the Jungle)",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "منصة ذكية لاكتشاف الشركات التقنية الأسرع نمواً",
    descriptionEn: "Curated tech job platform for fast-growing companies",
    buildUrl: (title) =>
      `https://app.otta.com/jobs?search=${encodeURIComponent(title)}`,
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    category: "GLOBAL",
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المجتمع الأكبر عالمياً لوظائف العمل عن بُعد 100%",
    descriptionEn: "The largest remote work community in the world",
    buildUrl: (title) =>
      `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(title)}`,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    category: "GLOBAL",
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف العمل الحر وعن بُعد في الشركات التقنية حول العالم",
    descriptionEn: "Remote jobs for digital nomads and tech specialists",
    buildUrl: (title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://remoteok.com/remote-${slug}-jobs`;
    },
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف موثوقة ومفحوصة بالكامل للعمل المرن وعن بُعد",
    descriptionEn: "Hand-screened flexible and remote job listings",
    buildUrl: (title, location) =>
      `https://www.flexjobs.com/search?search=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`,
  },
  {
    id: "jobspresso",
    name: "Jobspresso",
    category: "GLOBAL",
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف تقنية مختارة بعناية للعمل عن بُعد",
    descriptionEn: "Expertly curated remote tech jobs",
    buildUrl: (title) =>
      `https://jobspresso.co/browsejobs/?search_keywords=${encodeURIComponent(title)}`,
  },
  {
    id: "hired",
    name: "Hired",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "سوق العمل العكسي حيث تتنافس الشركات لتقديم عروض لك",
    descriptionEn: "Reverse marketplace where top employers pitch you",
    buildUrl: () => `https://hired.com/`,
  },
  {
    id: "ycjobs",
    name: "Y Combinator Jobs",
    category: "GLOBAL",
    supportsLocationParam: false,
    method: "COMPANY_WEBSITE",
    descriptionAr: "التقديم المباشر لشركات مسرعة Y Combinator الرائدة",
    descriptionEn: "Work directly at top Y Combinator-backed startups",
    buildUrl: (title) =>
      `https://www.ycombinator.com/jobs?query=${encodeURIComponent(title)}`,
  },
  {
    id: "dice",
    name: "Dice",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة التخصصية لوظائف تكنولوجيا المعلومات والبرمجيات",
    descriptionEn: "Specialized tech career marketplace",
    buildUrl: (title, location) =>
      `https://www.dice.com/jobs?q=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`,
  },

  // --- Regional Platforms (MENA & GCC) ---
  {
    id: "bayt",
    name: "Bayt.com",
    category: "REGIONAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف الأولى في الخليج والشرق الأوسط وشمال أفريقيا",
    descriptionEn: "Leading employment portal across GCC and MENA",
    buildUrl: (title, location) =>
      `https://www.bayt.com/en/international/jobs/?q=${encodeURIComponent(title)}&filters%5Bcountry%5D%5B%5D=${encodeURIComponent(location)}`,
  },
  {
    id: "wuzzuf",
    name: "Wuzzuf",
    category: "REGIONAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة الأكثر انتشاراً للوظائف التقنية والمحترفين في مصر",
    descriptionEn: "Egypt's premier professional and tech career hub",
    buildUrl: (title, location) =>
      `https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(title)}&filters%5Bcountry%5D%5B0%5D=${encodeURIComponent(location)}`,
  },
  {
    id: "forasna",
    name: "Forasna (فرصنا)",
    category: "REGIONAL",
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف السوق المصري لجميع التخصصات المهنية والتقنية",
    descriptionEn: "Comprehensive Egyptian employment portal",
    buildUrl: (title) =>
      `https://forasna.com/job/search?q=${encodeURIComponent(title)}`,
  },
  {
    id: "naukrigulf",
    name: "Naukrigulf",
    category: "REGIONAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة الوظائف الكبرى في السعودية والإمارات ودول الخليج",
    descriptionEn: "Major job board for Saudi Arabia, UAE, and GCC",
    buildUrl: (title, location) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://www.naukrigulf.com/${slug}-jobs?location=${encodeURIComponent(location)}`;
    },
  },
  {
    id: "tanqeeb",
    name: "Tanqeeb (تنقيب)",
    category: "REGIONAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "محرك بحث يجمع الوظائف من مئات المواقع العربية في مكان واحد",
    descriptionEn: "Comprehensive MENA job search engine aggregating all listings",
    buildUrl: (title, location) =>
      `https://www.tanqeeb.com/jobs/search?keywords=${encodeURIComponent(title)}&country=${encodeURIComponent(location)}`,
  },
  {
    id: "gulftalent",
    name: "GulfTalent",
    category: "REGIONAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف الكفاءات والشركات متعددة الجنسيات في دول الخليج",
    descriptionEn: "Top professional and multinational careers in the Gulf",
    buildUrl: (title, location) =>
      `https://www.gulftalent.com/jobs/search?keyword=${encodeURIComponent(title)}&country=${encodeURIComponent(location)}`,
  },
];

interface JobMarketCompassProps {
  onLaunchDraft: (draft: Partial<CreateApplicationInput>) => void;
  collapsible?: boolean;
}

export function JobMarketCompass({
  onLaunchDraft,
  collapsible = true,
}: JobMarketCompassProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";
  const { user } = useAuth();
  const toast = useToast();

  const [expanded, setExpanded] = useState(true);
  const [selectedMarketId, setSelectedMarketId] = useState<string>("Remote");
  const [selectedSubCountryKey, setSelectedSubCountryKey] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | "GLOBAL" | "REGIONAL">("ALL");

  const targetJobTitle = user?.targetJobTitle || "Software Engineer";

  // Current active macro-market
  const activeMarket = useMemo(
    () => MACRO_MARKETS.find((m) => m.id === selectedMarketId) ?? MACRO_MARKETS[0],
    [selectedMarketId],
  );

  // Determine effective location string
  const effectiveLocation = useMemo(() => {
    if (selectedMarketId === "Remote") return "Remote";
    if (selectedMarketId === "Egypt") return "Egypt";
    if (selectedSubCountryKey) return selectedSubCountryKey;
    if (activeMarket.subCountries && activeMarket.subCountries.length > 0) {
      return activeMarket.subCountries[0].key;
    }
    return activeMarket.labelEn;
  }, [selectedMarketId, selectedSubCountryKey, activeMarket]);

  const isRemote = selectedMarketId === "Remote";

  const handleMarketChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    const m = MACRO_MARKETS.find((x) => x.id === marketId);
    if (m?.subCountries && m.subCountries.length > 0) {
      setSelectedSubCountryKey(m.subCountries[0].key);
    } else {
      setSelectedSubCountryKey(null);
    }
  };

  const handlePlatformClick = (platform: PlatformConfig) => {
    const finalUrl = platform.buildUrl(targetJobTitle, effectiveLocation, isRemote);
    window.open(finalUrl, "_blank", "noopener,noreferrer");

    if (!platform.supportsLocationParam && !isRemote) {
      toast.info(
        isRtl
          ? "💡 هذه المنصة تفرز الوظائف عالمياً تلقائياً، يمكنك كتابة الدولة في شريط البحث الداخلي للمنصة عند فتحها."
          : "💡 This platform searches globally; you can refine by country in the platform's search bar.",
      );
    }

    // Launch draft with empty jobUrl as strictly required!
    onLaunchDraft({
      jobTitle: targetJobTitle,
      location: effectiveLocation,
      applicationMethod: platform.method,
      jobUrl: "", // STRICTLY EMPTY: NEVER PREFILL SEARCH URL!
    });
  };

  const filteredPlatforms = useMemo(() => {
    if (activeCategoryFilter === "ALL") return PLATFORMS;
    return PLATFORMS.filter((p) => p.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  return (
    <section
      aria-label={t("applications.compassTitle")}
      className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-xs transition-all space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                {isRtl ? "بوصلة سوق العمل الذكية" : "Smart Job Market Compass"}
              </h2>
              <span
                dir="ltr"
                className="rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200"
              >
                {targetJobTitle}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {isRtl
                ? "محركات بحث مباشرة لـ 18+ منصة عالمية وإقليمية مطابقة لتخصصك ودولتك المستهدفة"
                : "Live automated search engines across 18+ global & regional job platforms"}
            </p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span>
              {expanded
                ? (isRtl ? "إخفاء الفلاتر" : "Collapse")
                : (isRtl ? "عرض البوصلة" : "Expand")}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Level 1: 7 Macro-Markets Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isRtl ? "1. اختر السوق الإقليمي المستهدف:" : "1. Select Macro Market:"}
              </span>
              <span className="text-[11px] text-neutral-400">
                {effectiveLocation}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MACRO_MARKETS.map((m) => {
                const active = selectedMarketId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMarketChange(m.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-border bg-neutral-50/70 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span>{m.flag}</span>
                    <span>{isRtl ? m.labelAr : m.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Sub-Country Flag Selector (for multi-country markets) */}
          {activeMarket.subCountries && activeMarket.subCountries.length > 0 && (
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30 p-3 space-y-2 animate-in fade-in duration-150">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">
                {isRtl ? "الدولة الفرعية المحددة:" : "Select Specific Country:"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {activeMarket.subCountries.map((c) => {
                  const active = selectedSubCountryKey === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedSubCountryKey(c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-neutral-900 bg-neutral-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-border bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{isRtl ? c.labelAr : c.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Tabs: All vs Global vs Regional */}
          <div className="flex items-center justify-between pt-1 border-t border-border/70">
            <div className="flex items-center gap-1.5">
              {[
                { id: "ALL" as const, label: isRtl ? "كل المنصات (18+)" : "All Platforms (18+)" },
                { id: "GLOBAL" as const, label: isRtl ? "منصات عالمية (12)" : "Global (12)" },
                { id: "REGIONAL" as const, label: isRtl ? "منصات إقليمية ومحلية (6)" : "Regional (6)" },
              ].map((cat) => {
                const active = activeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-neutral-400 hidden sm:inline-block">
              {isRtl
                ? "الضغط يفتح نتائج البحث ويجهز مسودة طلب فارغة لتسجيله"
                : "Click launches live search & prepares clean draft"}
            </span>
          </div>

          {/* Platforms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {filteredPlatforms.map((platform) => {
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handlePlatformClick(platform)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-3.5 text-start transition-all hover:border-neutral-400 hover:shadow-xs dark:hover:border-neutral-600"
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-info-strong transition-colors truncate">
                        {platform.name}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors" />
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                      {isRtl ? platform.descriptionAr : platform.descriptionEn}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        platform.category === "GLOBAL"
                          ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      }`}
                    >
                      {platform.category === "GLOBAL"
                        ? (isRtl ? "عالمي" : "Global")
                        : (isRtl ? "إقليمي" : "Regional")}
                    </span>

                    {!platform.supportsLocationParam && !isRemote ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title={isRtl ? "تتطلب فلتر داخلي" : "Manual in-site filter"}>
                        <AlertCircle className="h-3 w-3" />
                        <span>{isRtl ? "بحث عام" : "Global only"}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 font-mono">
                        {effectiveLocation}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
