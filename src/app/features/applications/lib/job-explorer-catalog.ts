import type { ApplicationMethod } from "../../../types";

export type WorkMode = "ALL" | "REMOTE" | "ON_SITE";

export const COUNTRY_DETAILS: Record<
  string,
  { name: string; code: string; indeed: string; tanqeeb?: string }
> = {
  Egypt: { name: "Egypt", code: "EG", indeed: "eg.indeed.com", tanqeeb: "213" },
  "Saudi Arabia": {
    name: "Saudi Arabia",
    code: "SA",
    indeed: "sa.indeed.com",
    tanqeeb: "54",
  },
  UAE: {
    name: "United Arab Emirates",
    code: "AE",
    indeed: "ae.indeed.com",
    tanqeeb: "25",
  },
  Qatar: { name: "Qatar", code: "QA", indeed: "qa.indeed.com", tanqeeb: "183" },
  Kuwait: {
    name: "Kuwait",
    code: "KW",
    indeed: "kw.indeed.com",
    tanqeeb: "48",
  },
  Oman: { name: "Oman", code: "OM", indeed: "om.indeed.com", tanqeeb: "165" },
  Bahrain: {
    name: "Bahrain",
    code: "BH",
    indeed: "bh.indeed.com",
    tanqeeb: "26",
  },
  Germany: { name: "Germany", code: "DE", indeed: "de.indeed.com" },
  "United Kingdom": {
    name: "United Kingdom",
    code: "GB",
    indeed: "uk.indeed.com",
  },
  Netherlands: { name: "Netherlands", code: "NL", indeed: "nl.indeed.com" },
  Sweden: { name: "Sweden", code: "SE", indeed: "se.indeed.com" },
  France: { name: "France", code: "FR", indeed: "fr.indeed.com" },
  Spain: { name: "Spain", code: "ES", indeed: "es.indeed.com" },
  "United States": {
    name: "United States",
    code: "US",
    indeed: "www.indeed.com",
  },
  Canada: { name: "Canada", code: "CA", indeed: "ca.indeed.com" },
  Singapore: { name: "Singapore", code: "SG", indeed: "sg.indeed.com" },
  Australia: { name: "Australia", code: "AU", indeed: "au.indeed.com" },
  Malaysia: { name: "Malaysia", code: "MY", indeed: "malaysia.indeed.com" },
  Brazil: { name: "Brazil", code: "BR", indeed: "br.indeed.com" },
  Mexico: { name: "Mexico", code: "MX", indeed: "mx.indeed.com" },
  Argentina: { name: "Argentina", code: "AR", indeed: "ar.indeed.com" },
};

const TANQEEB_PORTALS: Record<string, string> = {
  Egypt: "egypt",
  "Saudi Arabia": "saudi",
  UAE: "uae",
  Qatar: "qatar",
  Kuwait: "kuwait",
  Oman: "oman",
  Bahrain: "bahrain",
};
const WELLFOUND_ROLES: Record<string, string> = {
  "UI/UX Designer": "ui-ux-designer",
  "Frontend Developer": "front-end-developer",
  "Backend Developer": "backend-developer",
  "Full Stack Developer": "full-stack-developer",
  "AI Engineer": "ai-engineer",
  "Mobile Developer": "mobile-engineer",
  "Data Analyst": "data-analyst",
  "Data Scientist": "data-scientist",
  "DevOps Engineer": "devops-engineer",
  "Software QA Engineer": "qa-engineer",
  "Product Manager": "product-manager",
  "Cybersecurity Specialist": "cyber-security-specialist",
  "Software Engineer": "software-engineer",
};

const searchUrl = (
  base: string,
  params: Record<string, string | string[] | undefined>,
) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value]) {
      url.searchParams.append(key, item);
    }
  }
  return url.toString();
};
const slug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const countryName = (value: string) => COUNTRY_DETAILS[value]?.name ?? value;

// ============================================================================
// Macro-Markets and Sub-Countries Definition
// ============================================================================
export interface SubCountry {
  key: string;
  labelAr: string;
  labelEn: string;
  flag: string;
}

export interface MacroMarket {
  id: string;
  labelAr: string;
  labelEn: string;
  flag: string;
  subCountries?: SubCountry[];
}

export const MACRO_MARKETS: MacroMarket[] = [
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
      {
        key: "Saudi Arabia",
        labelAr: "السعودية",
        labelEn: "Saudi Arabia",
        flag: "🇸🇦",
      },
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
      {
        key: "United Kingdom",
        labelAr: "بريطانيا",
        labelEn: "United Kingdom",
        flag: "🇬🇧",
      },
      {
        key: "Netherlands",
        labelAr: "هولندا",
        labelEn: "Netherlands",
        flag: "🇳🇱",
      },
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
      {
        key: "United States",
        labelAr: "أمريكا",
        labelEn: "United States",
        flag: "🇺🇸",
      },
      { key: "Canada", labelAr: "كندا", labelEn: "Canada", flag: "🇨🇦" },
    ],
  },
  {
    id: "APAC",
    labelAr: "آسيا والمحيط الهادئ",
    labelEn: "APAC",
    flag: "🌏",
    subCountries: [
      {
        key: "Singapore",
        labelAr: "سنغافورة",
        labelEn: "Singapore",
        flag: "🇸🇬",
      },
      {
        key: "Australia",
        labelAr: "أستراليا",
        labelEn: "Australia",
        flag: "🇦🇺",
      },
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
      {
        key: "Argentina",
        labelAr: "الأرجنتين",
        labelEn: "Argentina",
        flag: "🇦🇷",
      },
    ],
  },
];

// ============================================================================
// Job Platforms Definitions with Strict Regional Market Mapping
// ============================================================================
export interface PlatformConfig {
  id: string;
  name: string;
  domain: string;
  category: "GLOBAL" | "REGIONAL";
  markets?: string[];
  countries?: string[];
  available?: boolean;
  supportsKeywordParam?: boolean;
  supportedWorkModes?: Exclude<WorkMode, "ALL">[];
  isRemoteOnly?: boolean;
  supportsLocationParam: boolean;
  method: ApplicationMethod;
  descriptionAr: string;
  descriptionEn: string;
  buildUrl: (
    title: string,
    location: string,
    workMode: "ALL" | "REMOTE" | "ON_SITE",
  ) => string;
}

export const PLATFORMS: PlatformConfig[] = [
  // --- 1. Global Major Platforms ---
  {
    id: "linkedin",
    supportedWorkModes: ["REMOTE", "ON_SITE"],
    name: "LinkedIn Jobs",
    domain: "linkedin.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "LINKEDIN",
    descriptionAr:
      "البحث المباشر عن الوظائف ومسؤولي التوظيف على شبكة LinkedIn العالمية المفلترة بتخصصك ودولتك ونمط عملك.",
    descriptionEn:
      "Direct search for jobs and hiring managers on LinkedIn filtered by your specialization, location, and work mode.",
    buildUrl: (title, location, mode) =>
      searchUrl("https://www.linkedin.com/jobs/search/", {
        keywords: title,
        location: countryName(location),
        f_WT: mode === "REMOTE" ? "2" : mode === "ON_SITE" ? "1,3" : undefined,
      }),
  },
  {
    id: "indeed",
    supportedWorkModes: ["REMOTE"],
    name: "Indeed",
    domain: "indeed.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "أكبر محرك بحث وتجميع للوظائف في مختلف الشركات والمؤسسات حول العالم مع فلترة الموقع الجغرافي ونمط العمل.",
    descriptionEn:
      "Largest job search aggregator across companies worldwide with precise geographic and work mode filtering.",
    buildUrl: (title, location, mode) =>
      searchUrl(
        `https://${COUNTRY_DETAILS[location]?.indeed ?? "www.indeed.com"}/jobs`,
        {
          q: title,
          l: countryName(location),
          sc: mode === "REMOTE" ? "0kf:attr(DSQF7);" : undefined,
        },
      ),
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    domain: "glassdoor.com",
    category: "GLOBAL",
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف مع تقييمات بيئة العمل الحقيقية ومستويات الرواتب المعتمدة وتجارب المقابلات الشخصية.",
    descriptionEn:
      "Jobs with verified employee reviews, certified salary ranges, and authentic interview experiences.",
    buildUrl: (title) =>
      searchUrl("https://www.glassdoor.com/Job/jobs.htm", {
        "sc.keyword": title,
      }),
  },
  {
    id: "wellfound",
    name: "Wellfound (AngelList)",
    domain: "wellfound.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة الأولى عالمياً لفرص العمل في الشركات الناشئة والتقنية المبتكرة في مراحل النمو السريع.",
    descriptionEn:
      "Top global platform for career opportunities in high-growth startups and tech innovators.",
    buildUrl: (title, location) =>
      WELLFOUND_ROLES[title]
        ? `https://wellfound.com/role/l/${WELLFOUND_ROLES[title]}/${slug(countryName(location))}`
        : `https://wellfound.com/location/${slug(countryName(location))}`,
  },
  {
    id: "remotive",
    name: "Remotive",
    domain: "remotive.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "مجتمع عالمي رائد لوظائف التكنولوجيا والعمل عن بُعد، مفحوصة ومحدثة يومياً للمطورين والمصممين.",
    descriptionEn:
      "Top global remote tech job board curated and updated daily for developers, designers, and digital experts.",
    buildUrl: (title) =>
      searchUrl("https://remotive.com/remote-jobs", { query: title }),
  },
  {
    id: "himalayas",
    name: "Himalayas",
    domain: "himalayas.app",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "منصة عمل عن بُعد حديثة تتميز ببيانات رواتب موثوقة وشفافية المزايا وتفاصيل ثقافة العمل.",
    descriptionEn:
      "Modern remote job platform featuring transparent compensation data, perks, and company culture.",
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
    descriptionAr:
      "بوابة متخصصة لتوظيف أفضل المطورين والمهندسين والمصممين عن بُعد في الشركات والفرق العالمية.",
    descriptionEn:
      "Leading platform connecting top remote developers and designers with global tech companies.",
    buildUrl: (title) =>
      searchUrl("https://arc.dev/remote-jobs", { keyword: title }),
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    domain: "weworkremotely.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المجتمع الأكبر عالمياً لوظائف العمل عن بُعد 100% في مجالات البرمجة والتصميم والتسويق الرقمي.",
    descriptionEn:
      "The largest remote work community in the world for software, design, and product roles.",
    buildUrl: (title) =>
      `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(title)}`,
  },
  {
    id: "remoteok",
    supportsKeywordParam: false,
    name: "RemoteOK",
    domain: "remoteok.com",
    category: "GLOBAL",
    isRemoteOnly: true,
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "منصة عالمية متخصصة في وظائف العمل عن بُعد لخبراء التكنولوجيا والرحالة الرقميين حول العالم.",
    descriptionEn:
      "Worldwide remote job platform for digital nomads, software engineers, and tech specialists.",
    buildUrl: (title) => {
      const tags: Record<string, string> = {
        "UI/UX Designer": "design",
        "Frontend Developer": "dev",
        "Backend Developer": "dev",
        "Full Stack Developer": "dev",
        "AI Engineer": "ai",
        "Mobile Developer": "dev",
        "Data Analyst": "data",
        "Data Scientist": "data",
        "DevOps Engineer": "devops",
        "Software QA Engineer": "qa",
        "Product Manager": "product",
        "Cybersecurity Specialist": "security",
      };
      return tags[title]
        ? `https://remoteok.com/remote-${tags[title]}-jobs`
        : "https://remoteok.com/";
    },
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    domain: "flexjobs.com",
    category: "GLOBAL",
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف موثوقة ومفحوصة بالكامل للعمل المرن وعن بُعد بدون أي إعلانات مضللة أو فرص احتيالية.",
    descriptionEn:
      "Hand-screened, verified flexible and remote job listings with zero scams or low-quality ads.",
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
    descriptionAr:
      "وظائف تقنية وهندسية وتسويقية مختارة بعناية للعمل عن بُعد في أفضل الشركات الناشئة.",
    descriptionEn:
      "Expertly curated remote tech, engineering, and marketing opportunities at top companies.",
    buildUrl: (title) =>
      searchUrl("https://jobspresso.co/remote-work/", {
        search_keywords: title,
      }),
  },

  // --- 2. Egypt Regional Platforms ---
  {
    id: "wuzzuf",
    countries: ["Egypt"],
    name: "Wuzzuf",
    domain: "wuzzuf.net",
    category: "REGIONAL",
    markets: ["Egypt"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة الأكثر انتشاراً للوظائف التقنية والمحترفين في السوق المصري مع ربط مباشر بمسؤولي الشركات.",
    descriptionEn:
      "Egypt's premier professional and tech career hub with direct connections to corporate recruiters.",
    buildUrl: (title, location) =>
      `https://wuzzuf.net/search/jobs/?q=${encodeURIComponent(title)}&filters%5Bcountry%5D%5B0%5D=${encodeURIComponent(location)}`,
  },
  {
    id: "forasna",
    countries: ["Egypt"],
    name: "Forasna (فرصنا)",
    domain: "forasna.com",
    category: "REGIONAL",
    markets: ["Egypt"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف السوق المصري لجميع التخصصات والكوادر المهنية والتقنية بمختلف المحافظات والقطاعات.",
    descriptionEn:
      "Comprehensive Egyptian employment portal across all technical specializations and provinces.",
    buildUrl: (title) =>
      searchUrl("https://forasna.com/job/search", { query: title }),
  },
  {
    id: "bayt",
    name: "Bayt.com",
    domain: "bayt.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة التوظيف الأولى في مصر والخليج والشرق الأوسط، تضم آلاف الوظائف في كبرى الشركات.",
    descriptionEn:
      "Leading employment portal across Egypt, GCC, and MENA with thousands of corporate listings.",
    buildUrl: (title, location) =>
      `https://www.bayt.com/en/${location === "UAE" ? "uae" : slug(countryName(location))}/jobs/${slug(title) ? `${slug(title)}-jobs/` : ""}`,
  },
  {
    id: "tanqeeb",
    supportedWorkModes: ["REMOTE"],
    name: "Tanqeeb (تنقيب)",
    domain: "tanqeeb.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "محرك بحث يجمع الوظائف من مئات المواقع العربية والمصرية في مكان واحد لتغطية شاملة للفرص.",
    descriptionEn:
      "Job search engine aggregating all listings across Egypt and GCC into a single searchable index.",
    buildUrl: (title, location, mode) =>
      searchUrl(
        `https://${TANQEEB_PORTALS[location] ?? "www"}.tanqeeb.com/jobs/search`,
        {
          keywords: title.replace(/\//g, " ").replace(/\s+/g, " ").trim(),
          workplace: mode === "REMOTE" ? "remote" : undefined,
        },
      ),
  },
  {
    id: "laimoon",
    available: false, // Search currently returns the provider's "Coming Soon" page.
    name: "Laimoon Jobs",
    domain: "laimoon.com",
    category: "REGIONAL",
    markets: ["Egypt", "GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة الوظائف والتطوير المهني في الإمارات والسعودية والخليج ومصر مع استكشاف الرواتب والشركات.",
    descriptionEn:
      "Career and recruitment portal across UAE, Saudi Arabia, GCC, and Egypt with salary insights.",
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
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف الكفاءات والشركات متعددة الجنسيات في السعودية والإمارات والكويت وعُمان وقطر والبحرين.",
    descriptionEn:
      "Top professional and multinational careers across Saudi Arabia, UAE, Kuwait, and the Gulf.",
    buildUrl: (title) =>
      slug(title)
        ? `https://www.gulftalent.com/jobs/title/${slug(title)}`
        : "https://www.gulftalent.com/jobs",
  },
  {
    id: "naukrigulf",
    name: "Naukrigulf",
    domain: "naukrigulf.com",
    category: "REGIONAL",
    markets: ["GCC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة الوظائف الكبرى في السعودية والإمارات ودول الخليج، تركز على الوظائف التقنية والهندسية.",
    descriptionEn:
      "Major Gulf job board in Saudi Arabia and UAE specializing in tech, engineering, and digital roles.",
    buildUrl: (title, location) =>
      `https://www.naukrigulf.com/${slug(title) ? `${slug(title)}-` : ""}jobs-in-${location === "UAE" ? "uae" : slug(countryName(location))}`,
  },

  // --- 4. Europe Regional Platforms ---
  {
    id: "stepstone",
    countries: ["Germany"],
    name: "StepStone",
    domain: "stepstone.de",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة الرائدة للتوظيف المهني والتقني في ألمانيا وبريطانيا وكافة دول الاتحاد الأوروبي.",
    descriptionEn:
      "Leading professional and tech career portal in Germany, UK, and European Union member states.",
    buildUrl: (title) =>
      slug(title)
        ? `https://www.stepstone.de/jobs/${slug(title)}/in-germany`
        : "https://www.stepstone.de/",
  },
  {
    id: "honeypot",
    available: false, // The former application hostname no longer resolves.
    name: "Honeypot.io",
    domain: "honeypot.io",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة العكسية للمطورين والمهندسين في أوروبا حيث تتنافس الشركات التقنية لتقديم عروضها لك.",
    descriptionEn:
      "Developer-focused reverse hiring platform where European tech companies apply directly to you.",
    buildUrl: () => `https://app.honeypot.io/`,
  },
  {
    id: "relocateme",
    supportedWorkModes: ["REMOTE"],
    name: "Relocate.me",
    domain: "relocate.me",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف تقنية أوروبية تقدم دعماً كاملاً لنقل الإقامة ورعاية تأشيرات العمل وتكاليف الانتقال.",
    descriptionEn:
      "European tech jobs offering verified relocation assistance and work visa sponsorship packages.",
    buildUrl: (title, location, mode) =>
      searchUrl("https://relocate.me/international-jobs", {
        query: title,
        "country[]": countryName(location),
        "type[]": mode === "REMOTE" ? "remote" : undefined,
      }),
  },
  {
    id: "landingjobs",
    supportedWorkModes: ["REMOTE", "ON_SITE"],
    name: "Landing.jobs",
    domain: "landing.jobs",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "مجتمع التوظيف التقني الأول في البرتغال وإسبانيا وجنوب وغرب أوروبا للعمل المحلي وعن بُعد.",
    descriptionEn:
      "Leading tech recruitment community in Portugal, Spain, and Western Europe for local and remote work.",
    buildUrl: (title, _location, mode) =>
      searchUrl("https://landing.jobs/jobs", {
        query: title,
        "work_model[]":
          mode === "REMOTE"
            ? ["remote"]
            : mode === "ON_SITE"
              ? ["hybrid", "onsite"]
              : undefined,
      }),
  },
  {
    id: "iamexpat",
    countries: ["Germany"],
    name: "IamExpat Jobs",
    domain: "iamexpat.de",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة الوظائف الناطقة بالإنجليزية للمغتربين والمقيمين الدوليين في ألمانيا وهولندا وسويسرا.",
    descriptionEn:
      "English-speaking job board tailored for international talent and expatriates in Germany and Netherlands.",
    buildUrl: (title) =>
      searchUrl("https://www.iamexpat.de/career/jobs-germany", { what: title }),
  },
  {
    id: "welcometothejungle",
    name: "Welcome to the Jungle",
    domain: "welcometothejungle.com",
    category: "REGIONAL",
    markets: ["Europe"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "استكشف ثقافة الشركات والفرص التقنية المميزة في فرنسا وبريطانيا ومختلف العواصم الأوروبية.",
    descriptionEn:
      "Discover company culture and innovative tech opportunities across France, the UK, and Europe.",
    buildUrl: (title) =>
      `https://www.welcometothejungle.com/en/jobs?query=${encodeURIComponent(title)}`,
  },

  // --- 5. North America Regional Platforms ---
  {
    id: "builtin",
    countries: ["United States"],
    name: "BuiltIn",
    domain: "builtin.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "ملتقى الشركات التقنية والناشئة في كبرى المراكز التقنية الأمريكية (Silicon Valley, New York, Austin).",
    descriptionEn:
      "The hub for tech companies and startups across major US tech centers and remote roles.",
    buildUrl: (title) =>
      searchUrl("https://builtin.com/jobs", {
        search: title,
        country: "USA",
        allLocations: "true",
      }),
  },
  {
    id: "dice",
    name: "Dice",
    domain: "dice.com",
    category: "REGIONAL",
    markets: ["North America"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة التخصصية الأبرز لوظائف البرمجيات وتكنولوجيا المعلومات في أمريكا وكندا للتعاقد والدوام الكامل.",
    descriptionEn:
      "Leading career marketplace for software engineers and IT specialists in the US and Canada.",
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
    descriptionAr:
      "شبكة التوظيف الذكية الأسرع انتشاراً وتطابقاً مع الوظائف في كبرى المؤسسات الأمريكية والكندية.",
    descriptionEn:
      "Fast-growing intelligent employment network matching professionals across the US and Canada.",
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
    descriptionAr:
      "بوابة التوظيف العريقة لمختلف الشركات والمؤسسات الأمريكية الكبرى في كافة التخصصات والولايات.",
    descriptionEn:
      "Longstanding career portal connecting candidates with leading US employers nationwide.",
    buildUrl: (title, location) =>
      `https://www.monster.com/jobs/search?q=${encodeURIComponent(title)}&where=${encodeURIComponent(location)}`,
  },

  // --- 6. APAC Regional Platforms ---
  {
    id: "techinasia",
    countries: ["Singapore", "Malaysia"],
    supportsKeywordParam: false,
    name: "TechInAsia Jobs",
    domain: "techinasia.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "المنصة التقنية الكبرى لشركات التكنولوجيا والشركات الناشئة في سنغافورة وإندونيسيا وآسيا.",
    descriptionEn:
      "The premier platform for tech startups and emerging tech ventures across Southeast Asia.",
    buildUrl: () => "https://www.techinasia.com/jobs/search",
  },
  {
    id: "nodeflair",
    countries: ["Singapore", "Malaysia"],
    name: "NodeFlair",
    domain: "nodeflair.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "وظائف التقنية في سنغافورة وتايوان وجنوب شرق آسيا مع شفافية كاملة في بيانات الرواتب.",
    descriptionEn:
      "Tech careers in Singapore, Taiwan, and Southeast Asia with verified salary transparency.",
    buildUrl: (title) =>
      `https://nodeflair.com/jobs?query=${encodeURIComponent(title)}`,
  },
  {
    id: "glints",
    countries: ["Singapore", "Malaysia"],
    name: "Glints",
    domain: "glints.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "منصة المواهب والتوظيف الرائدة في إندونيسيا وسنغافورة وماليزيا وفيتنام للكفاءات التقنية.",
    descriptionEn:
      "Leading talent discovery and career ecosystem in Indonesia, Singapore, and Malaysia.",
    buildUrl: (title, location) =>
      searchUrl(
        `https://glints.com/${location === "Malaysia" ? "my" : "sg"}/opportunities/jobs/explore`,
        { keyword: title },
      ),
  },
  {
    id: "seek",
    countries: ["Australia"],
    name: "Seek",
    domain: "seek.com.au",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة التوظيف الأولى والأكبر بلا منازع في أستراليا ونيوزيلندا لكافة التخصصات المهنية والتقنية.",
    descriptionEn:
      "Australia and New Zealand's undisputed number one employment and recruitment marketplace.",
    buildUrl: (title) =>
      slug(title)
        ? `https://www.seek.com.au/${slug(title)}-jobs`
        : "https://www.seek.com.au/jobs",
  },
  {
    id: "wantedly",
    name: "Wantedly",
    domain: "wantedly.com",
    category: "REGIONAL",
    markets: ["APAC"],
    supportsLocationParam: false,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "شبكة التوظيف الاجتماعي القائمة على التوافق الثقافي ورؤية الشركة في اليابان وسنغافورة وآسيا.",
    descriptionEn:
      "Social recruiting platform matching professionals based on mission and culture in Japan and Asia.",
    buildUrl: (title) =>
      searchUrl("https://www.wantedly.com/projects", {
        new: "true",
        page: "1",
        keywords: title,
        order: "mixed",
      }),
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
    descriptionAr:
      "المنصة المتخصصة الأولى في وظائف التكنولوجيا والشركات الرقمية الناشئة في أمريكا اللاتينية.",
    descriptionEn:
      "The leading specialized digital and tech talent marketplace across all of Latin America.",
    buildUrl: (title) =>
      slug(title)
        ? `https://www.getonbrd.com/jobs-${slug(title)}`
        : "https://www.getonbrd.com/",
  },
  {
    id: "computrabajo",
    countries: ["Mexico", "Argentina"],
    name: "Computrabajo",
    domain: "computrabajo.com",
    category: "REGIONAL",
    markets: ["LATAM"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة التوظيف الأكثر زيارة وانتشاراً في المكسيك وكولومبيا والأرجنتين وتشيلي وبيرو.",
    descriptionEn:
      "Most visited employment website in Mexico, Colombia, Argentina, and across South America.",
    buildUrl: (title, location) =>
      `https://${location === "Argentina" ? "ar" : "mx"}.computrabajo.com/${slug(title) ? `trabajo-de-${slug(title)}` : ""}`,
  },
  {
    id: "bumeran",
    countries: ["Argentina"],
    name: "Bumeran",
    domain: "bumeran.com.ar",
    category: "REGIONAL",
    markets: ["LATAM"],
    supportsLocationParam: true,
    method: "RECRUITMENT_PLATFORM",
    descriptionAr:
      "بوابة التوظيف الرائدة في الأرجنتين وفنزويلا والإكوادور وبيرو لمختلف القطاعات والشركات.",
    descriptionEn:
      "Leading employment and careers board in Argentina, Venezuela, Peru, and Latin America.",
    buildUrl: (title) =>
      slug(title)
        ? `https://www.bumeran.com.ar/empleos-busqueda-${slug(title)}.html`
        : "https://www.bumeran.com.ar/",
  },
];

export function getPlatformsForSelection(
  market: string,
  country: string,
  workMode: WorkMode,
): PlatformConfig[] {
  return PLATFORMS.filter(
    (platform) =>
      platform.available !== false &&
      (platform.category === "GLOBAL" || platform.markets?.includes(market)) &&
      (!platform.countries || platform.countries.includes(country)) &&
      !(workMode === "ON_SITE" && platform.isRemoteOnly),
  );
}

export function getManualFilters(
  platform: PlatformConfig,
  workMode: WorkMode,
  title = "UI/UX Designer",
): ("keyword" | "country" | "workMode")[] {
  const result: ("keyword" | "country" | "workMode")[] = [];
  if (
    platform.supportsKeywordParam === false ||
    (platform.id === "wellfound" && !WELLFOUND_ROLES[title]) ||
    ([
      "bayt",
      "gulftalent",
      "naukrigulf",
      "stepstone",
      "seek",
      "getonbrd",
      "computrabajo",
      "bumeran",
    ].includes(platform.id) &&
      !slug(title))
  )
    result.push("keyword");
  if (!platform.supportsLocationParam) result.push("country");
  if (
    workMode !== "ALL" &&
    !platform.isRemoteOnly &&
    !platform.supportedWorkModes?.includes(workMode)
  )
    result.push("workMode");
  return result;
}
