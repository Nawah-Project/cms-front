const { chromium } = require("/review/tools/node_modules/playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    }),
    p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto("http://localhost:3000/admin/learning/today");
    await p
      .getByRole("heading", { name: "قراءتي اليوم", exact: true })
      .waitFor();
    await p
      .locator(".workspace-sidebar button")
      .filter({ has: p.locator("svg") })
      .evaluateAll((elements) =>
        elements
          .find((e) => e.getAttribute("aria-label")?.includes("لغة"))
          ?.click(),
      );
    if (
      !(await p
        .getByRole("heading", { name: "Reading today", exact: true })
        .count())
    ) {
      const buttons = await p
        .locator(".workspace-sidebar button[title]")
        .evaluateAll((es) =>
          es.map((e) => ({
            title: e.title,
            label: e.getAttribute("aria-label"),
          })),
        );
      console.log(buttons);
      await p
        .locator(".workspace-sidebar button")
        .filter({ hasText: /^ع$/ })
        .click();
    }
    await p
      .getByRole("heading", { name: "Reading today", exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "Arabic & diagrams", exact: true })
      .click();
    await p.locator("[data-pdf-page] canvas").waitFor();
    await p.waitForTimeout(700);
    await p.waitForFunction(
      () =>
        document.querySelector(".ll-page-scroll")?.getAttribute("aria-busy") ===
        "false",
    );
    assert.ok((await p.locator(".textLayer span").count()) > 0);
    await p.getByRole("button", { name: "Page note", exact: true }).click();
    await p
      .locator(".ll-inline-note textarea")
      .fill("A source-linked English note.");
    await p.getByRole("button", { name: "Save note", exact: true }).click();
    await p
      .locator(".workspace-sidebar")
      .getByRole("link", { name: "Notes & ideas", exact: true })
      .click();
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "JSON", exact: true }).click();
    const file = await (await download).path();
    const doc = JSON.parse(require("node:fs").readFileSync(file, "utf8"));
    assert.equal(doc.notes[0].body, "A source-linked English note.");
    assert.equal(doc.notes[0].page, 1);
    assert.ok(doc.editions[0].fingerprint);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "/evidence/notes-english-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 2,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS English navigation, Arabic selectable PDF, English note export with edition identity, mobile no overflow",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
