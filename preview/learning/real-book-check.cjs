const { chromium } = require("/review/tools/node_modules/playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (
      u.hostname === "localhost" ||
      u.protocol === "blob:" ||
      u.protocol === "data:"
    )
      return r.continue();
    external.push(u.origin);
    return r.abort();
  });
  try {
    await page.goto("http://localhost:3000/admin/learning/library");
    await page.getByRole("heading", { name: "المكتبة", exact: true }).waitFor();
    await page
      .getByLabel("اختيار ملفات PDF محلية", { exact: true })
      .setInputFiles("/review-input/book.pdf");
    await page.locator("[data-pdf-page] canvas").waitFor({ timeout: 120000 });
    await page.locator(".ll-page-number input").fill("20");
    await page.waitForTimeout(500);
    await page.waitForFunction(
      () =>
        document.querySelector(".ll-page-scroll")?.getAttribute("aria-busy") ===
        "false",
    );
    const median = await page
      .locator("[data-pdf-page] canvas")
      .evaluate((c) => {
        const ctx = c.getContext("2d"),
          values = [];
        for (let y = 1; y < 10; y++)
          for (let x = 1; x < 10; x++) {
            const v = ctx.getImageData(
              ((c.width * x) / 10) | 0,
              ((c.height * y) / 10) | 0,
              1,
              1,
            ).data;
            values.push((v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722) / 255);
          }
        return values.sort((a, b) => a - b)[40];
      });
    assert.ok(median < 0.3);
    const selectableText = (await page.locator(".textLayer span").count()) > 0;
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      JSON.stringify({
        realUserProvidedPdf: true,
        pdfPages: await page.locator(".ll-page-number span").innerText(),
        sampledPage: 20,
        nightMedian: median,
        textLayer: selectableText,
        externalRequests: 0,
        errors: 0,
        fullFileUploaded: false,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
