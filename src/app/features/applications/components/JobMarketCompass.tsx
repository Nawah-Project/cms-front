import { useState, useMemo } from "react";
import { Compass, ChevronDown, ChevronUp, ExternalLink, Globe, AlertCircle } from "lucide-react";
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
// Job Platforms Definitions with Strict Regional Market Mapping
// ============================================================================
interface PlatformConfig {
  id: string;
  name: string;
  domain: string;
  category: "GLOBAL" | "REGIONAL";
  markets?: string[];
  isRemoteOnly?: boolean;
  supportsLocationParam: boolean;
  method: ApplicationMethod;
  descriptionAr: string;
  descriptionEn: string;
  buildUrl: (title: string, location: string, workMode: "ALL" | "REMOTE" | "ON_SITE") => string;
}

const PLATFORMS: PlatformConfig[] = [
  // --- 1. Global Major Platforms ---
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    domain: "linkedin.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "LINKEDIN",
    descriptionAr: "البحث المباشر عن الوظائف ومسؤولي التوظيف على شبكة LinkedIn العالمية المفلترة بتخصصك ودولتك ونمط عملك.",
    descriptionEn: "Direct search for jobs and hiring managers on LinkedIn filtered by your specialization, location, and work mode.",
    buildUrl: (title, location, workMode) => {
      let wtParam = "";
      if (workMode === "REMOTE") wtParam = "&f_WT=2";
      else if (workMode === "ON_SITE") wtParam = "&f_WT=1%2C3";
      return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}${wtParam}`;
    },
  },
  {
    id: "indeed",
    name: "Indeed",
    domain: "indeed.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "أكبر محرك بحث وتجميع للوظائف في مختلف الشركات والمؤسسات حول العالم مع فلترة الموقع الجغرافي ونمط العمل.",
    descriptionEn: "Largest job search aggregator across companies worldwide with precise geographic and work mode filtering.",
    buildUrl: (title, location, workMode) => {
      const remoteParam = workMode === "REMOTE" ? "&sc=0kf%3Aattr%28DSQF7%29%3B" : "";
      return `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}&l=${encodeURIComponent(location)}${remoteParam}`;
    },
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    domain: "glassdoor.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف مع تقييمات بيئة العمل الحقيقية ومستويات الرواتب المعتمدة وتجارب المقابلات الشخصية.",
    descriptionEn: "Jobs with verified employee reviews, certified salary ranges, and authentic interview experiences.",
    buildUrl: (title, location) =>
      `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(title)}&locKeyword=${encodeURIComponent(location)}`,
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    domain: "wellfound.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة الأولى عالمياً لفرص العمل في الشركات الناشئة والتقنية المبتكرة في مراحل النمو السريع.",
    descriptionEn: "Top global platform for career opportunities in high-growth startups and tech innovators.",
    buildUrl: (title, location) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://wellfound.com/jobs?role=${slug}&location=${encodeURIComponent(location)}`;
    },
  },
  {
    id: "remotive",
    name: "Remotive",
    domain: "remotive.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "مجتمع عالمي رائد لوظائف التكنولوجيا والعمل عن بُعد، مفحوصة ومحدثة يومياً للمطورين والمصممين.",
    descriptionEn: "Top global remote tech job board curated and updated daily for developers, designers, and digital experts.",
    buildUrl: (title) =>
      `https://remotive.com/remote-jobs/search?query=${encodeURIComponent(title)}`,
  },
  {
    id: "himalayas",
    name: "Himalayas",
    domain: "himalayas.app",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "منصة عمل عن بُعد حديثة تتميز ببيانات رواتب موثوقة وشفافية المزايا وتفاصيل ثقافة العمل.",
    descriptionEn: "Modern remote job platform featuring transparent compensation data, perks, and company culture.",
    buildUrl: (title) =>
      `https://himalayas.app/jobs?q=${encodeURIComponent(title)}`,
  },
  {
    id: "arcdev",
    name: "Arc.dev",
    domain: "arc.dev",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة متخصصة لتوظيف أفضل المطورين والمهندسين والمصممين عن بُعد في الشركات والفرق العالمية.",
    descriptionEn: "Leading platform connecting top remote developers and designers with global tech companies.",
    buildUrl: (title) =>
      `https://arc.dev/remote-jobs?search=${encodeURIComponent(title)}`,
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    domain: "weworkremotely.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المجتمع الأكبر عالمياً لوظائف العمل عن بُعد 100% في مجالات البرمجة والتصميم والتسويق الرقمي.",
    descriptionEn: "The largest remote work community in the world for software, design, and product roles.",
    buildUrl: (title) =>
      `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(title)}`,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    domain: "remoteok.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "منصة عالمية متخصصة في وظائف العمل عن بُعد لخبراء التكنولوجيا والرحالة الرقميين حول العالم.",
    descriptionEn: "Worldwide remote job platform for digital nomads, software engineers, and tech specialists.",
    buildUrl: (title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://remoteok.com/remote-${slug}-jobs`;
    },
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    domain: "flexjobs.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف موثوقة ومفحوصة بالكامل للعمل المرن وعن بُعد بدون أي إعلانات مضللة أو فرص احتيالية.",
    descriptionEn: "Hand-screened, verified flexible and remote job listings with zero scams or low-quality ads.",
    buildUrl: (title, location) =>
      `https://www.flexjobs.com/search?search=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`,
  },
  {
    id: "jobspresso",
    name: "Jobspresso",
    domain: "jobspresso.co",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف تقنية وهندسية وتسويقية مختارة بعناية للعمل عن بُعد في أفضل الشركات الناشئة.",
    descriptionEn: "Expertly curated remote tech, engineering, and marketing opportunities at top companies.",
    buildUrl: (title) =>
      `https://jobspresso.co/browsejobs/?search_keywords=${encodeURIComponent(title)}`,
  },

  // --- 2. Egypt Regional Platforms ---
  {
    id: "wuzzuf",
    name: "Wuzzuf",
    domain: "wuzzuf.net",
    category: "REGIONAL",
    markets: ["Egypt"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة الأكثر انتشاراً للوظائف التقنية والمحترفين في السوق المصري مع ربط مباشر بمسؤولي الشركات.",
    descriptionEn: "Egypt's premier professional and tech career hub with direct connections to corporate recruiters.",
    buildUrl: (title, location) =>
      `https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(title)}&filters%5Bcountry%5D%5B0%5D=${encodeURIComponent(location)}`,
  },
  {
    id: "forasna",
    name: "Forasna (فرصنا)",
    domain: "forasna.com",
    category: "REGIONAL",
    markets: ["Egypt"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف السوق المصري لجميع التخصصات والكوادر المهنية والتقنية بمختلف المحافظات والقطاعات.",
    descriptionEn: "Comprehensive Egyptian employment portal across all technical specializations and provinces.",
    buildUrl: (title) =>
      `https://forasna.com/job/search?q=${encodeURIComponent(title)}`,
  },
  {
    id: "bayt",
    name: "Bayt.com",
    domain: "bayt.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف الأولى في مصر والخليج والشرق الأوسط، تضم آلاف الوظائف في كبرى الشركات.",
    descriptionEn: "Leading employment portal across Egypt, GCC, and MENA with thousands of corporate listings.",
    buildUrl: (title, location) =>
      `https://www.bayt.com/en/international/jobs/?q=${encodeURIComponent(title)}&filters%5Bcountry%5D%5B%5D=${encodeURIComponent(location)}`,
  },
  {
    id: "tanqeeb",
    name: "Tanqeeb (تنقيب)",
    domain: "tanqeeb.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "محرك بحث يجمع الوظائف من مئات المواقع العربية والمصرية في مكان واحد لتغطية شاملة للفرص.",
    descriptionEn: "Job search engine aggregating all listings across Egypt and GCC into a single searchable index.",
    buildUrl: (title, location) =>
      `https://www.tanqeeb.com/jobs/search?keywords=${encodeURIComponent(title)}&country=${encodeURIComponent(location)}`,
  },
  {
    id: "laimoon",
    name: "Laimoon Jobs",
    domain: "laimoon.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة الوظائف والتطوير المهني في الإمارات والسعودية والخليج ومصر مع استكشاف الرواتب والشركات.",
    descriptionEn: "Career and recruitment portal across UAE, Saudi Arabia, GCC, and Egypt with salary insights.",
    buildUrl: (title, location) =>
      `https://jobs.laimoon.com/search?keyword=${encodeURIComponent(title)}&country=${encodeURIComponent(location)}`,
  },

  // --- 3. GCC Regional Platforms ---
  {
    id: "gulftalent",
    name: "GulfTalent",
    domain: "gulftalent.com",
    category: "REGIONAL",
    markets: ["GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف الكفاءات والشركات متعددة الجنسيات في السعودية والإمارات والكويت وعُمان وقطر والبحرين.",
    descriptionEn: "Top professional and multinational careers across Saudi Arabia, UAE, Kuwait, and the Gulf.",
    buildUrl: (title, location) =>
      `https://www.gulftalent.com/jobs/search?keyword=${encodeURIComponent(title)}&country=${encodeURIComponent(location)}`,
  },
  {
    id: "naukrigulf",
    name: "Naukrigulf",
    domain: "naukrigulf.com",
    category: "REGIONAL",
    markets: ["GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة الوظائف الكبرى في السعودية والإمارات ودول الخليج، تركز على الوظائف التقنية والهندسية.",
    descriptionEn: "Major Gulf job board in Saudi Arabia and UAE specializing in tech, engineering, and digital roles.",
    buildUrl: (title, location) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://www.naukrigulf.com/${slug}-jobs?location=${encodeURIComponent(location)}`;
    },
  },

  // --- 4. Europe Regional Platforms ---
  {
    id: "stepstone",
    name: "StepStone",
    domain: "stepstone.de",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة الرائدة للتوظيف المهني والتقني في ألمانيا وبريطانيا وكافة دول الاتحاد الأوروبي.",
    descriptionEn: "Leading professional and tech career portal in Germany, UK, and European Union member states.",
    buildUrl: (title, location) =>
      `https://www.stepstone.de/work/${encodeURIComponent(title)}?where=${encodeURIComponent(location)}`,
  },
  {
    id: "honeypot",
    name: "Honeypot.io",
    domain: "honeypot.io",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة العكسية للمطورين والمهندسين في أوروبا حيث تتنافس الشركات التقنية لتقديم عروضها لك.",
    descriptionEn: "Developer-focused reverse hiring platform where European tech companies apply directly to you.",
    buildUrl: () => `https://app.honeypot.io/`,
  },
  {
    id: "relocateme",
    name: "Relocate.me",
    domain: "relocate.me",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف تقنية أوروبية تقدم دعماً كاملاً لنقل الإقامة ورعاية تأشيرات العمل وتكاليف الانتقال.",
    descriptionEn: "European tech jobs offering verified relocation assistance and work visa sponsorship packages.",
    buildUrl: (title) =>
      `https://relocate.me/search?query=${encodeURIComponent(title)}`,
  },
  {
    id: "landingjobs",
    name: "Landing.jobs",
    domain: "landing.jobs",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "مجتمع التوظيف التقني الأول في البرتغال وإسبانيا وجنوب وغرب أوروبا للعمل المحلي وعن بُعد.",
    descriptionEn: "Leading tech recruitment community in Portugal, Spain, and Western Europe for local and remote work.",
    buildUrl: (title) =>
      `https://landing.jobs/jobs?q=${encodeURIComponent(title)}`,
  },
  {
    id: "iamexpat",
    name: "IamExpat Jobs",
    domain: "iamexpat.de",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة الوظائف الناطقة بالإنجليزية للمغتربين والمقيمين الدوليين في ألمانيا وهولندا وسويسرا.",
    descriptionEn: "English-speaking job board tailored for international talent and expatriates in Germany and Netherlands.",
    buildUrl: (title) =>
      `https://jobs.iamexpat.de/career-search?keywords=${encodeURIComponent(title)}`,
  },
  {
    id: "welcometothejungle",
    name: "Welcome to the Jungle",
    domain: "welcometothejungle.com",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "استكشف ثقافة الشركات والفرص التقنية المميزة في فرنسا وبريطانيا ومختلف العواصم الأوروبية.",
    descriptionEn: "Discover company culture and innovative tech opportunities across France, the UK, and Europe.",
    buildUrl: (title) =>
      `https://www.welcometothejungle.com/en/jobs?query=${encodeURIComponent(title)}`,
  },

  // --- 5. North America Regional Platforms ---
  {
    id: "builtin",
    name: "BuiltIn",
    domain: "builtin.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "ملتقى الشركات التقنية والناشئة في كبرى المراكز التقنية الأمريكية (Silicon Valley, New York, Austin).",
    descriptionEn: "The hub for tech companies and startups across major US tech centers and remote roles.",
    buildUrl: (title) =>
      `https://builtin.com/jobs?search=${encodeURIComponent(title)}`,
  },
  {
    id: "dice",
    name: "Dice",
    domain: "dice.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة التخصصية الأبرز لوظائف البرمجيات وتكنولوجيا المعلومات في أمريكا وكندا للتعاقد والدوام الكامل.",
    descriptionEn: "Leading career marketplace for software engineers and IT specialists in the US and Canada.",
    buildUrl: (title, location) =>
      `https://www.dice.com/jobs?q=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`,
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    domain: "ziprecruiter.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "شبكة التوظيف الذكية الأسرع انتشاراً وتطابقاً مع الوظائف في كبرى المؤسسات الأمريكية والكندية.",
    descriptionEn: "Fast-growing intelligent employment network matching professionals across the US and Canada.",
    buildUrl: (title, location) =>
      `https://www.ziprecruiter.com/candidate/search?search=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}`,
  },
  {
    id: "monster",
    name: "Monster",
    domain: "monster.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف العريقة لمختلف الشركات والمؤسسات الأمريكية الكبرى في كافة التخصصات والولايات.",
    descriptionEn: "Longstanding career portal connecting candidates with leading US employers nationwide.",
    buildUrl: (title, location) =>
      `https://www.monster.com/jobs/search?q=${encodeURIComponent(title)}&where=${encodeURIComponent(location)}`,
  },

  // --- 6. APAC Regional Platforms ---
  {
    id: "techinasia",
    name: "TechInAsia Jobs",
    domain: "techinasia.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة التقنية الكبرى لشركات التكنولوجيا والشركات الناشئة في سنغافورة وإندونيسيا وآسيا.",
    descriptionEn: "The premier platform for tech startups and emerging tech ventures across Southeast Asia.",
    buildUrl: (title) =>
      `https://www.techinasia.com/jobs/search?query=${encodeURIComponent(title)}`,
  },
  {
    id: "nodeflair",
    name: "NodeFlair",
    domain: "nodeflair.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "وظائف التقنية في سنغافورة وتايوان وجنوب شرق آسيا مع شفافية كاملة في بيانات الرواتب.",
    descriptionEn: "Tech careers in Singapore, Taiwan, and Southeast Asia with verified salary transparency.",
    buildUrl: (title) =>
      `https://nodeflair.com/jobs?query=${encodeURIComponent(title)}`,
  },
  {
    id: "glints",
    name: "Glints",
    domain: "glints.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "منصة المواهب والتوظيف الرائدة في إندونيسيا وسنغافورة وماليزيا وفيتنام للكفاءات التقنية.",
    descriptionEn: "Leading talent discovery and career ecosystem in Indonesia, Singapore, and Malaysia.",
    buildUrl: (title) =>
      `https://glints.com/opportunities/jobs/explore?keyword=${encodeURIComponent(title)}`,
  },
  {
    id: "seek",
    name: "Seek",
    domain: "seek.com.au",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف الأولى والأكبر بلا منازع في أستراليا ونيوزيلندا لكافة التخصصات المهنية والتقنية.",
    descriptionEn: "Australia and New Zealand's undisputed number one employment and recruitment marketplace.",
    buildUrl: (title) =>
      `https://www.seek.com.au/jobs?keywords=${encodeURIComponent(title)}`,
  },
  {
    id: "wantedly",
    name: "Wantedly",
    domain: "wantedly.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "شبكة التوظيف الاجتماعي القائمة على التوافق الثقافي ورؤية الشركة في اليابان وسنغافورة وآسيا.",
    descriptionEn: "Social recruiting platform matching professionals based on mission and culture in Japan and Asia.",
    buildUrl: (title) =>
      `https://www.wantedly.com/projects?q=${encodeURIComponent(title)}`,
  },

  // --- 7. LATAM Regional Platforms ---
  {
    id: "getonbrd",
    name: "GetOnBoard",
    domain: "getonbrd.com",
    category: "REGIONAL",
    markets: ["LATAM"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "المنصة المتخصصة الأولى في وظائف التكنولوجيا والشركات الرقمية الناشئة في أمريكا اللاتينية.",
    descriptionEn: "The leading specialized digital and tech talent marketplace across all of Latin America.",
    buildUrl: (title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://www.getonbrd.com/jobs-${slug}`;
    },
  },
  {
    id: "computrabajo",
    name: "Computrabajo",
    domain: "computrabajo.com",
    category: "REGIONAL",
    markets: ["LATAM"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف الأكثر زيارة وانتشاراً في المكسيك وكولومبيا والأرجنتين وتشيلي وبيرو.",
    descriptionEn: "Most visited employment website in Mexico, Colombia, Argentina, and across South America.",
    buildUrl: (title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://www.computrabajo.com/trabajo-de-${slug}`;
    },
  },
  {
    id: "bumeran",
    name: "Bumeran",
    domain: "bumeran.com",
    category: "REGIONAL",
    markets: ["LATAM"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr: "بوابة التوظيف الرائدة في الأرجنتين وفنزويلا والإكوادور وبيرو لمختلف القطاعات والشركات.",
    descriptionEn: "Leading employment and careers board in Argentina, Venezuela, Peru, and Latin America.",
    buildUrl: (title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `https://www.bumeran.com.ar/empleos-busqueda-${slug}.html`;
    },
  },
];

interface JobMarketCompassProps {
  onLaunchDraft: (draft: Partial<CreateApplicationInput>) => void;
  collapsible?: boolean;
}

export type WorkMode = "ALL" | "REMOTE" | "ON_SITE";

export function JobMarketCompass({
  onLaunchDraft,
  collapsible = true,
}: JobMarketCompassProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";
  const { user } = useAuth();
  const toast = useToast();

  const [expanded, setExpanded] = useState(true);
  const [selectedMarketId, setSelectedMarketId] = useState<string>("Egypt");
  const [selectedSubCountryKey, setSelectedSubCountryKey] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>("ALL");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | "GLOBAL" | "REGIONAL">("ALL");

  const targetJobTitle = user?.targetJobTitle || "Software Engineer";

  // Current active macro-market
  const activeMarket = useMemo(
    () => MACRO_MARKETS.find((m) => m.id === selectedMarketId) ?? MACRO_MARKETS[0],
    [selectedMarketId],
  );

  // Determine effective location string
  const effectiveLocation = useMemo(() => {
    let base = "";
    if (selectedSubCountryKey && activeMarket.subCountries) {
      const sub = activeMarket.subCountries.find((c) => c.key === selectedSubCountryKey);
      base = isRtl ? (sub?.labelAr || selectedSubCountryKey) : (sub?.labelEn || selectedSubCountryKey);
    } else if (selectedMarketId === "Egypt") {
      base = isRtl ? "مصر" : "Egypt";
    } else if (activeMarket.subCountries && activeMarket.subCountries.length > 0) {
      const sub = activeMarket.subCountries[0];
      base = isRtl ? sub.labelAr : sub.labelEn;
    } else {
      base = isRtl ? activeMarket.labelAr : activeMarket.labelEn;
    }

    if (workMode === "REMOTE") {
      return isRtl ? `${base} - عن بُعد` : `${base} - Remote`;
    }
    return base;
  }, [selectedMarketId, selectedSubCountryKey, activeMarket, workMode, isRtl]);

  const effectiveLocationQuery = useMemo(() => {
    if (selectedSubCountryKey) return selectedSubCountryKey;
    if (selectedMarketId === "Egypt") return "Egypt";
    if (activeMarket.subCountries && activeMarket.subCountries.length > 0) {
      return activeMarket.subCountries[0].key;
    }
    return activeMarket.labelEn;
  }, [selectedMarketId, selectedSubCountryKey, activeMarket]);

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
    const finalUrl = platform.buildUrl(targetJobTitle, effectiveLocationQuery, workMode);
    window.open(finalUrl, "_blank", "noopener,noreferrer");

    if (!platform.supportsLocationParam && workMode !== "REMOTE") {
      toast.info(
        isRtl
          ? "💡 هذه المنصة تفرز الوظائف عالمياً؛ يمكنك كتابة الدولة في شريط البحث الداخلي للمنصة عند فتحها."
          : "💡 This platform searches globally; you can refine by country in the platform's search bar.",
      );
    }

    // Launch draft with smart auto-filled location and applicationMethod
    const appMethod: ApplicationMethod = platform.id === "linkedin" ? "LINKEDIN" : "RECRUITMENT_PLATFORM";

    onLaunchDraft({
      jobTitle: targetJobTitle,
      location: effectiveLocation,
      applicationMethod: appMethod,
      jobUrl: "", // STRICTLY EMPTY: NEVER PREFILL SEARCH URL!
    });
  };

  // Strict market-linked platforms filtering
  const globalPlatforms = useMemo(() => {
    return PLATFORMS.filter((p) => {
      if (p.category !== "GLOBAL") return false;
      if (workMode === "ON_SITE" && p.isRemoteOnly) return false;
      return true;
    });
  }, [workMode]);

  const regionalPlatformsForMarket = useMemo(() => {
    return PLATFORMS.filter(
      (p) => p.category === "REGIONAL" && p.markets?.includes(selectedMarketId),
    );
  }, [selectedMarketId]);

  const allPlatformsForMarket = useMemo(() => {
    return [...globalPlatforms, ...regionalPlatformsForMarket];
  }, [globalPlatforms, regionalPlatformsForMarket]);

  const displayedPlatforms = useMemo(() => {
    if (activeCategoryFilter === "GLOBAL") return globalPlatforms;
    if (activeCategoryFilter === "REGIONAL") return regionalPlatformsForMarket;
    return allPlatformsForMarket;
  }, [activeCategoryFilter, globalPlatforms, regionalPlatformsForMarket, allPlatformsForMarket]);

  const globalCount = globalPlatforms.length;
  const regionalCount = regionalPlatformsForMarket.length;
  const allCount = allPlatformsForMarket.length;

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
                {isRtl ? "مستكشف الوظائف" : "Job Explorer"}
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
                ? "محركات بحث مباشرة لأكثر من 20 منصة عالمية وإقليمية مطابقة لتخصصك ودولتك المستهدفة"
                : "Direct search engines across 20+ global and regional platforms tailored to your specialization and target country"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Work Mode Switcher Segmented Control */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-neutral-100/80 dark:bg-neutral-900/80 p-1">
            <span className="text-[11px] font-bold text-neutral-500 px-1.5 select-none">
              {isRtl ? "نمط العمل:" : "Work Mode:"}
            </span>
            {[
              { id: "ALL" as WorkMode, labelAr: "الكل", labelEn: "All" },
              { id: "REMOTE" as WorkMode, labelAr: "🏠 عن بُعد", labelEn: "🏠 Remote" },
              { id: "ON_SITE" as WorkMode, labelAr: "🏢 مقر الشركة / هجين", labelEn: "🏢 On-site" },
            ].map((mode) => {
              const isSelected = workMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setWorkMode(mode.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-800 dark:text-white"
                      : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {isRtl ? mode.labelAr : mode.labelEn}
                </button>
              );
            })}
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
                  : (isRtl ? "عرض المستكشف" : "Expand")}
              </span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Level 1: 7 Macro-Markets Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isRtl ? "1. اختر السوق الإقليمي المستهدف:" : "1. Select Macro Market:"}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
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

          {/* Category Tabs with Dynamic Market Counts */}
          <div className="flex items-center justify-between pt-1 border-t border-border/70">
            <div className="flex items-center gap-1.5">
              {[
                {
                  id: "ALL" as const,
                  label: isRtl ? `كل المنصات (${allCount})` : `All Platforms (${allCount})`,
                },
                {
                  id: "GLOBAL" as const,
                  label: isRtl ? `منصات عالمية (${globalCount})` : `Global (${globalCount})`,
                },
                {
                  id: "REGIONAL" as const,
                  label: isRtl
                    ? `منصات إقليمية ومحلية (${regionalCount})`
                    : `Regional (${regionalCount})`,
                },
              ].map((cat) => {
                const active = activeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
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
                ? "الضغط يفتح نتائج البحث ويجهز مسودة طلب فارغة"
                : "Click launches live search & prepares draft"}
            </span>
          </div>

          {/* Horizontal Rectangular Cards Grid (2 Columns, Official Logos, Full Descriptions) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {displayedPlatforms.map((platform) => {
              return (
                <button
                  key={platform.id}
                  type="button"
                  data-tour-step={platform.id === "linkedin" ? "explorer-linkedin-card" : undefined}
                  onClick={() => handlePlatformClick(platform)}
                  className="group flex items-start gap-3.5 rounded-2xl border border-border bg-surface p-4 text-start transition-all hover:border-neutral-400 hover:shadow-sm dark:hover:border-neutral-600 w-full"
                >
                  {/* Platform Logo Box */}
                  <div className="h-11 w-11 shrink-0 rounded-xl border border-border/80 bg-white dark:bg-neutral-900 flex items-center justify-center p-2 shadow-2xs">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${platform.domain}&sz=64`}
                      alt={platform.name}
                      className="h-6 w-6 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove("hidden");
                      }}
                    />
                    <Globe className="h-5 w-5 text-neutral-500 hidden" />
                  </div>

                  {/* Content (Complete description, no line clamping) */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-neutral-950 dark:text-neutral-100 group-hover:text-info-strong transition-colors">
                          {platform.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            platform.category === "GLOBAL"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {platform.category === "GLOBAL"
                            ? (isRtl ? "عالمي" : "Global")
                            : (isRtl ? "إقليمي" : "Regional")}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {effectiveLocation}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
                    </div>

                    <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {isRtl ? platform.descriptionAr : platform.descriptionEn}
                    </p>
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
