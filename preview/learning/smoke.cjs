const { chromium } = require("/review/tools/node_modules/playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE " + m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) console.log("HTTP " + r.status() + " " + r.url());
  });
  page.setDefaultTimeout(30000);
  try {
    await page.goto("http://localhost:3000/admin/learning/today", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("heading", { name: "قراءتي اليوم", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "/evidence/smoke-today.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "PDF نصي", exact: true }).click();
    await page.locator("[data-pdf-page] canvas").waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".ll-page-scroll[aria-busy=true]"),
    );
    console.log(
      "READER " + (await page.locator(".ll-reader-head").innerText()),
    );
    await page.screenshot({
      path: "/evidence/smoke-reader.png",
      fullPage: true,
    });
    console.log("PASS preview and real PDF reader");
  } catch (error) {
    console.error(error);
    console.log((await page.locator("body").innerText()).slice(-7000));
    await page.screenshot({
      path: "/evidence/smoke-failure.png",
      fullPage: true,
    });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
