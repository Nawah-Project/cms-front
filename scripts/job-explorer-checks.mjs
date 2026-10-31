import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL(
    "../src/app/features/applications/lib/job-explorer-catalog.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const {
  PLATFORMS,
  MACRO_MARKETS,
  COUNTRY_DETAILS,
  getPlatformsForSelection,
  getManualFilters,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const platform = (id) => {
  const item = PLATFORMS.find((p) => p.id === id);
  assert.ok(item, id);
  return item;
};
const search = (
  id,
  title = "UI/UX Designer",
  country = "Egypt",
  mode = "ALL",
) => new URL(platform(id).buildUrl(title, country, mode));
const selections = MACRO_MARKETS.flatMap((market) =>
  (market.subCountries ?? [{ key: market.id }]).map((country) => ({
    market: market.id,
    country: country.key,
  })),
);
const titles = [
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "AI Engineer",
  "Mobile Developer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "Software QA Engineer",
  "Product Manager",
  "Cybersecurity Specialist",
];

test("all supported countries, work modes and specializations produce valid matching platform links", () => {
  assert.equal(new Set(PLATFORMS.map((p) => p.id)).size, PLATFORMS.length);
  for (const { market, country } of selections) {
    assert.ok(COUNTRY_DETAILS[country], country);
    for (const mode of ["ALL", "REMOTE", "ON_SITE"]) {
      const items = getPlatformsForSelection(market, country, mode);
      assert.ok(items.some((p) => p.id === "linkedin"));
      for (const p of items) {
        assert.notEqual(p.available, false);
        assert.ok(p.category === "GLOBAL" || p.markets.includes(market));
        assert.ok(!p.countries || p.countries.includes(country));
        if (mode === "ON_SITE") assert.ok(!p.isRemoteOnly);
        for (const title of titles) {
          const url = new URL(p.buildUrl(title, country, mode));
          assert.equal(url.protocol, "https:", `${p.id} ${country}`);
          assert.ok(
            url.hostname === p.domain || url.hostname.endsWith(`.${p.domain}`),
            url.toString(),
          );
          assert.equal(url.username + url.password, "");
          assert.ok(
            !url.toString().includes("undefined") &&
              !url.toString().includes("NaN"),
          );
        }
      }
    }
  }
});

test("repaired paths and actual search field names preserve the job title", () => {
  assert.equal(search("remotive").pathname, "/remote-jobs");
  assert.equal(search("remotive").searchParams.get("query"), "UI/UX Designer");
  assert.equal(search("arcdev").searchParams.get("keyword"), "UI/UX Designer");
  assert.equal(search("forasna").searchParams.get("query"), "UI/UX Designer");
  assert.equal(search("jobspresso").pathname, "/remote-work/");
  assert.equal(
    search("jobspresso").searchParams.get("search_keywords"),
    "UI/UX Designer",
  );
  assert.equal(
    search("wantedly").searchParams.get("keywords"),
    "UI/UX Designer",
  );
  assert.equal(search("wantedly").searchParams.get("new"), "true");
  assert.equal(search("iamexpat").pathname, "/career/jobs-germany");
  assert.equal(search("iamexpat").searchParams.get("what"), "UI/UX Designer");
  assert.equal(search("wellfound").pathname, "/role/l/ui-ux-designer/egypt");
  for (const [title, role] of [
    ["Frontend Developer", "front-end-developer"],
    ["Mobile Developer", "mobile-engineer"],
    ["Software QA Engineer", "qa-engineer"],
    ["Cybersecurity Specialist", "cyber-security-specialist"],
  ]) {
    assert.equal(search("wellfound", title).pathname, `/role/l/${role}/egypt`);
  }
  assert.equal(search("stepstone").pathname, "/jobs/ui-ux-designer/in-germany");
  assert.equal(search("gulftalent").pathname, "/jobs/title/ui-ux-designer");
  assert.ok(
    getManualFilters(platform("gulftalent"), "ALL").includes("country"),
  );
  assert.equal(search("remoteok").pathname, "/remote-design-jobs");
  assert.equal(
    search("tanqeeb").searchParams.get("keywords"),
    "UI UX Designer",
  );
  assert.equal(search("wellfound", "Custom role").pathname, "/location/egypt");
  assert.ok(
    getManualFilters(platform("wellfound"), "ALL", "Custom role").includes(
      "keyword",
    ),
  );
});

test("country routing does not silently send people to a different country's board", () => {
  for (const { country } of selections)
    assert.equal(
      search("indeed", undefined, country).hostname,
      COUNTRY_DETAILS[country].indeed,
    );
  assert.equal(
    search("linkedin", undefined, "UAE").searchParams.get("location"),
    "United Arab Emirates",
  );
  assert.equal(
    search("bayt", undefined, "UAE").pathname,
    "/en/uae/jobs/ui-ux-designer-jobs/",
  );
  assert.equal(
    search("tanqeeb", undefined, "Saudi Arabia").hostname,
    "saudi.tanqeeb.com",
  );
  assert.equal(
    search("tanqeeb", undefined, "Egypt").hostname,
    "egypt.tanqeeb.com",
  );
  assert.equal(
    search("naukrigulf", undefined, "UAE").pathname,
    "/ui-ux-designer-jobs-in-uae",
  );
  assert.equal(
    search("computrabajo", undefined, "Mexico").hostname,
    "mx.computrabajo.com",
  );
  assert.equal(
    search("computrabajo", undefined, "Argentina").hostname,
    "ar.computrabajo.com",
  );
  assert.ok(
    !getPlatformsForSelection("Europe", "France", "ALL").some((p) =>
      ["stepstone", "iamexpat"].includes(p.id),
    ),
  );
  assert.ok(
    !getPlatformsForSelection("APAC", "Singapore", "ALL").some(
      (p) => p.id === "seek",
    ),
  );
  assert.ok(
    !getPlatformsForSelection("LATAM", "Brazil", "ALL").some((p) =>
      ["bumeran", "computrabajo"].includes(p.id),
    ),
  );
  assert.ok(
    !getPlatformsForSelection("North America", "Canada", "ALL").some(
      (p) => p.id === "builtin",
    ),
  );
});

test("supported work modes are applied, while manual filters are disclosed", () => {
  assert.equal(
    search("linkedin", undefined, "Egypt", "REMOTE").searchParams.get("f_WT"),
    "2",
  );
  assert.equal(
    search("linkedin", undefined, "Egypt", "ON_SITE").searchParams.get("f_WT"),
    "1,3",
  );
  assert.equal(
    search("indeed", undefined, "Egypt", "REMOTE").searchParams.get("sc"),
    "0kf:attr(DSQF7);",
  );
  assert.equal(
    search("tanqeeb", undefined, "Egypt", "REMOTE").searchParams.get(
      "workplace",
    ),
    "remote",
  );
  assert.deepEqual(
    search("landingjobs", undefined, "Germany", "ON_SITE").searchParams.getAll(
      "work_model[]",
    ),
    ["hybrid", "onsite"],
  );
  assert.deepEqual(getManualFilters(platform("linkedin"), "REMOTE"), []);
  assert.deepEqual(getManualFilters(platform("glassdoor"), "REMOTE"), [
    "country",
    "workMode",
  ]);
  assert.deepEqual(getManualFilters(platform("remotive"), "REMOTE"), [
    "country",
  ]);
  assert.deepEqual(getManualFilters(platform("remoteok"), "REMOTE"), [
    "keyword",
    "country",
  ]);
  assert.ok(
    getManualFilters(platform("indeed"), "ON_SITE").includes("workMode"),
  );
});

test("free text is encoded once and cannot inject another query parameter", () => {
  const title = "C++ / QA & AI #1 ?remote=true";
  for (const [id, key] of [
    ["linkedin", "keywords"],
    ["indeed", "q"],
    ["forasna", "query"],
    ["remotive", "query"],
    ["arcdev", "keyword"],
  ]) {
    const url = search(id, title);
    assert.equal(url.searchParams.get(key), title);
    assert.equal(url.searchParams.has("remote"), false);
    assert.equal(url.hash, "");
  }
});

test("legacy non-Latin specializations fall back to usable boards with an explicit manual title filter", () => {
  for (const id of [
    "wellfound",
    "bayt",
    "gulftalent",
    "naukrigulf",
    "stepstone",
    "seek",
    "getonbrd",
    "computrabajo",
    "bumeran",
  ]) {
    const title = "مصمم تجربة المستخدم";
    const url = search(id, title);
    assert.equal(url.protocol, "https:");
    assert.ok(
      !/\/jobs-$|\/-jobs|busqueda--|trabajo-de-$/.test(url.pathname),
      url.toString(),
    );
    assert.ok(
      getManualFilters(platform(id), "ALL", title).includes("keyword"),
      id,
    );
  }
});
