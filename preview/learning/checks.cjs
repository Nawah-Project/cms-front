const { chromium } = require("/review/tools/node_modules/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = "http://localhost:3000",
  errors = [];
let page, browser;
const name = (text) => ({ name: text, exact: true });
async function state(p = page) {
  return p.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nawah-learning-review-v1", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("documents", "readonly"),
            q = t
              .objectStore("documents")
              .get("00000000-0000-4000-8000-000000000004");
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
          q.onerror = () => reject(q.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
async function waitState(check, p = page) {
  for (let i = 0; i < 100; i++) {
    const s = await state(p);
    if (s && check(s)) return s;
    await p.waitForTimeout(80);
  }
  throw Error("Saved-state expectation timed out");
}
async function go(view) {
  await page
    .locator(".workspace-sidebar")
    .getByRole("link", name(view))
    .click();
}
async function render() {
  await page.waitForTimeout(300);
  await page.locator("[data-pdf-page] canvas").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".ll-page-scroll")?.getAttribute("aria-busy") ===
      "false",
  );
  await page.waitForTimeout(200);
  await page.waitForFunction(
    () =>
      document.querySelector(".ll-page-scroll")?.getAttribute("aria-busy") ===
      "false",
  );
}
async function setPage(n) {
  await page.locator(".ll-page-number input").fill(String(n));
  await render();
  await waitState((s) => Object.values(s.positions).some((p) => p.page === n));
}
async function luminance() {
  return page.locator("[data-pdf-page] canvas").evaluate((c) => {
    const ctx = c.getContext("2d");
    const a = [];
    for (let y = 1; y < 10; y++)
      for (let x = 1; x < 10; x++) {
        const v = ctx.getImageData(
          ((c.width * x) / 10) | 0,
          ((c.height * y) / 10) | 0,
          1,
          1,
        ).data;
        a.push((v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722) / 255);
      }
    return a.sort((a, b) => a - b)[40];
  });
}
async function confirm(start, end) {
  await page.getByRole("button", name("تأكيد ما قرأته")).click();
  const d = page.getByRole("dialog");
  await d.locator("[name=start]").fill(String(start));
  await d.locator("[name=end]").fill(String(end));
  await d.getByRole("button", name("تأكيد القراءة")).click();
  await d.waitFor({ state: "hidden" });
}
async function note(text) {
  await page.locator(".ll-inline-note textarea").fill(text);
  await page.getByRole("button", name("حفظ الملاحظة")).click();
  await page.locator(".ll-inline-note").waitFor({ state: "hidden" });
  await waitState((s) => s.notes.some((n) => n.body === text));
}
(async () => {
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1100 },
    reducedMotion: "reduce",
  });
  context.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => {
      if (r.status() >= 400) errors.push("HTTP " + r.status() + " " + r.url());
    });
  });
  await context.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "localhost" || ["data:", "blob:"].includes(u.protocol))
      return route.continue();
    errors.push("Unexpected network " + u.origin);
    return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  try {
    await page.goto(base + "/admin/learning/today");
    await page.getByRole("heading", name("قراءتي اليوم")).waitFor();
    await page.getByRole("button", name("PDF نصي")).click();
    await render();
    assert.equal((await state()).books.length, 1);
    await setPage(10);
    assert.equal(
      (await state()).reading.filter((x) => x.kind === "confirmed").length,
      0,
    );
    await page
      .getByRole("combobox", name("ألوان صفحات الكتاب"))
      .selectOption("night");
    await render();
    assert.ok((await luminance()) < 0.25, "Night text page stays dark");
    await page.getByRole("button", name("عرض الأصل")).click();
    await render();
    assert.ok((await luminance()) > 0.8, "Original text page is light");
    await page.getByRole("button", name("العودة للقراءة")).click();
    await render();
    await confirm(10, 12);
    await confirm(11, 15);
    const s = await state();
    assert.equal(s.reading.filter((x) => x.kind === "confirmed").length, 2);
    await page.getByRole("button", name("حدد موضعًا")).click();
    const box = await page.locator("[data-pdf-page]").boundingBox();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.25);
    await page.mouse.up();
    await page.getByRole("button", name("ملاحظة على التحديد")).click();
    await note("فكرة تجريبية: أميز القراءة المؤكدة عن زيارة الصفحات.");
    const anchor = (await state()).notes[0].rectangles;
    assert.ok(anchor.length && anchor[0].width > 0.2);
    await page.getByRole("button", name("تكبير")).click();
    await render();
    assert.deepEqual((await state()).notes[0].rectangles, anchor);
    await page
      .getByRole("combobox", name("ألوان صفحات الكتاب"))
      .selectOption("paper");
    await render();
    assert.deepEqual((await state()).notes[0].rectangles, anchor);
    await page
      .getByRole("combobox", name("ألوان صفحات الكتاب"))
      .selectOption("night");
    await render();
    await page
      .getByRole("button", name("100%"))
      .count()
      .then(async (n) => {
        if (!n) await page.getByRole("button", name("125%")).click();
      });
    await render();
    await page.screenshot({
      path: "/evidence/reader-night-notes.png",
      fullPage: true,
    });
    await page.getByRole("button", name("بحث")).click();
    await page
      .locator(".ll-reader-notes input[type=search]")
      .fill("SEARCH-MARKER-PAGE-14");
    await page
      .locator(".ll-reader-notes form")
      .getByRole("button", name("ابحث"))
      .click();
    await page.locator(".ll-search-result").first().waitFor();
    assert.match(await page.locator(".ll-search-result").innerText(), /14/);
    await page.locator(".ll-search-result").click();
    await render();
    assert.equal(
      await page.locator(".ll-page-number input").inputValue(),
      "14",
    );
    await page.getByRole("button", name("ملاحظة على الصفحة")).click();
    await page
      .locator(".ll-inline-note textarea")
      .fill("مسودة لا يجب فقدها عند التنقل");
    await go("المكتبة");
    await page.getByRole("dialog", name("عندك مسودة غير محفوظة")).waitFor();
    await page.getByRole("button", name("ابقَ مع المسودة")).click();
    assert.equal(
      await page.locator(".ll-inline-note textarea").inputValue(),
      "مسودة لا يجب فقدها عند التنقل",
    );
    await note("مسودة لا يجب فقدها عند التنقل");
    await page
      .getByRole("button", name("إلغاء اتصال الملف المحلي مع إبقاء الملاحظات"))
      .click();
    await page
      .getByRole("heading", name("اختر ملف هذه النسخة لمواصلة القراءة"))
      .waitFor();
    assert.equal((await state()).notes.length, 2);
    const readerURL = page.url();
    await page.reload();
    await page
      .getByRole("heading", name("اختر ملف هذه النسخة لمواصلة القراءة"))
      .waitFor();
    await page
      .locator(".ll-reader > input[type=file]")
      .setInputFiles({
        name: "renamed-identical-book.pdf",
        mimeType: "application/pdf",
        buffer: fs.readFileSync("/evidence/samples/text.pdf"),
      });
    await render();
    assert.equal((await state()).books.length, 1);
    assert.equal((await state()).notes.length, 2);
    await page
      .getByRole("button", name("إلغاء اتصال الملف المحلي مع إبقاء الملاحظات"))
      .click();
    await page
      .locator(".ll-reader > input[type=file]")
      .setInputFiles("/evidence/samples/mixed.pdf");
    await page
      .getByRole("alert")
      .filter({ hasText: "هذا ملف مختلف" })
      .waitFor();
    assert.equal((await state()).editions.length, 1);
    await page
      .getByRole("button", name("الملف مختلف؟ أضفه كطبعة أخرى صراحةً"))
      .click();
    await render();
    assert.equal((await state()).editions.length, 2);
    assert.equal((await state()).books.length, 1);
    assert.equal(
      (await state()).notes[0].editionId,
      (await state()).editions[0].id,
    );
    await page.screenshot({
      path: "/evidence/reader-arabic.png",
      fullPage: true,
    });
    console.log(
      "PASS actual PDF render, original/night/paper, middle-page reading, overlap, search, anchored note, zoom, draft protection, missing/renamed/different edition",
    );
    await go("خرائط المعرفة");
    await page.getByRole("button", name("خريطة جديدة")).click();
    let d = page.getByRole("dialog");
    await d.locator("[name=title]").fill("كيف أربط القراءة بالتطبيق؟");
    await d.locator("[name=book]").selectOption({ index: 1 });
    await d.locator("[name=topics]").fill("UX, تعلّم");
    await d.getByRole("button", name("إنشاء الخريطة")).click();
    await d.waitFor({ state: "hidden" });
    await page.getByRole("button", name("أضف عقدة")).click();
    d = page.getByRole("dialog");
    await d.locator("select").first().selectOption("idea");
    await d.locator("[name=title]").fill("اختبر الفكرة على موقف حقيقي");
    await d.getByRole("button", name("أضف العقدة")).click();
    await page.getByRole("button", name("أضف رابطًا وسببه")).click();
    d = page.getByRole("dialog");
    await d
      .locator("[name=reason]")
      .fill("الفهم يحتاج تجربة محددة ومراجعة للنتيجة، وليس ملخصًا فقط.");
    await d.getByRole("button", name("أضف الرابط")).click();
    await page.getByRole("button", name("ترتيب عند الطلب")).click();
    await page.getByRole("button", name("حفظ الخريطة")).click();
    await waitState((s) => s.maps[0]?.edges.length === 1);
    const before = (await state()).maps[0].nodes[0].x;
    await page.locator(".ll-graph-node").first().focus();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", name("حفظ الخريطة")).click();
    await waitState((s) => s.maps[0].nodes[0].x === before + 10);
    await page.getByRole("button", name("اطوِ الفرع")).first().click();
    assert.equal(await page.locator(".ll-graph-node").count(), 1);
    await page.getByRole("button", name("افتح الفرع")).click();
    assert.equal(await page.locator(".ll-graph-node").count(), 2);
    await page.getByRole("button", name("حفظ الخريطة")).click();
    await page.locator(".ll-connections summary").click();
    await page.screenshot({
      path: "/evidence/knowledge-map.png",
      fullPage: true,
    });
    console.log(
      "PASS contextual map, edge reasons, explicit arrangement, keyboard movement, folding and persistence",
    );
    await go("التطبيق والمراجعة");
    await page.getByRole("button", name("هدف قراءة وتطبيق")).click();
    d = page.getByRole("dialog");
    await d.locator("[name=title]").fill("فهم الفرق بين النشاط ودليل التعلّم");
    await d
      .locator("[name=question]")
      .fill("كيف أختبر أن القراءة غيرت ممارستي؟");
    await d
      .locator("[name=summary]")
      .fill("الصفحات المقروءة نشاط، والتطبيق يحتاج دليلًا مستقلًا.");
    await d
      .locator("[name=application]")
      .fill("جربت كتابة سؤال قبل القراءة ثم مثال تطبيقي.");
    await d
      .locator("[name=review]")
      .fill("ساعد السؤال في اختيار الفصل المناسب، وأحتاج اختبارًا آخر.");
    await d.locator("[name=stage]").selectOption("done");
    await d.getByRole("button", name("حفظ الهدف والمراجعة")).click();
    await waitState((s) => s.goals[0]?.stage === "done");
    await go("الملاحظات والأفكار");
    const second = await context.newPage();
    await second.goto(base + "/admin/learning/notes");
    await second.getByRole("heading", name("الملاحظات والأفكار")).waitFor();
    await page.getByRole("button", name("ملاحظة عامة عن كتاب")).click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("مسودة النافذة الأولى محفوظة عند تعارض التعديل");
    await second.getByRole("button", name("ملاحظة عامة عن كتاب")).click();
    await second
      .getByRole("dialog")
      .locator("textarea")
      .fill("ملاحظة من النافذة الثانية");
    await second.getByRole("button", name("حفظ الملاحظة")).click();
    await waitState((s) => s.notes.length === 3, second);
    await page.getByRole("button", name("حفظ الملاحظة")).click();
    await page
      .getByRole("dialog")
      .getByRole("alert")
      .filter({ hasText: "يوجد تعديل أحدث" })
      .waitFor();
    assert.equal(
      await page.getByRole("dialog").locator("textarea").inputValue(),
      "مسودة النافذة الأولى محفوظة عند تعارض التعديل",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", name("تصدير المسودة"))
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", name("تحميل التحديثات مع إبقاء المسودة"))
      .click();
    await page.getByRole("button", name("حفظ الملاحظة")).click();
    await waitState((s) => s.notes.length === 4);
    await second.close();
    console.log(
      "PASS application review and two-tab CAS conflict with draft retained and retry",
    );
    await go("التقدم والحصيلة");
    assert.equal(
      (
        await page.locator(".ll-stat-grid article").first().innerText()
      ).includes("6"),
      true,
    );
    await page.screenshot({
      path: "/evidence/reading-progress.png",
      fullPage: true,
    });
    await go("قراءتي اليوم");
    await page.getByRole("button", name("صفحات مصوّرة")).click();
    await render();
    await setPage(2);
    console.log("SCANNED night median " + (await luminance()));
    await page.getByRole("button", name("حدد موضعًا")).click();
    const sb = await page.locator("[data-pdf-page]").boundingBox();
    await page.mouse.click(sb.x + sb.width * 0.4, sb.y + sb.height * 0.2);
    await page.getByRole("button", name("ملاحظة على التحديد")).click();
    await note("ملاحظة موضعية على صفحة مصوّرة بلا طبقة نصية");
    await page.screenshot({
      path: "/evidence/reader-scanned.png",
      fullPage: true,
    });
    await page.getByRole("button", name("وضع التركيز")).click();
    assert.equal(
      await page.locator(".workspace-sidebar").evaluate((e) => e.inert),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".workspace-sidebar").evaluate((e) => e.inert),
      false,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page
      .getByRole("heading", name("اختر ملف هذه النسخة لمواصلة القراءة"))
      .waitFor();
    await page
      .locator(".ll-reader > input[type=file]")
      .setInputFiles("/evidence/samples/scan.pdf");
    await render();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 2,
      ),
      false,
    );
    await page.getByRole("button", name("الملاحظات والفهرس")).click();
    await page.locator(".ll-reader-notes.is-open").waitFor();
    await page.screenshot({
      path: "/evidence/reader-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", name("طي لوحة الملاحظات")).click();
    await page.getByRole("button", name("وضع التركيز")).click();
    await page.screenshot({ path: "/evidence/reader-mobile-focus.png" });
    await page.keyboard.press("Escape");
    console.log(
      "PASS scanned annotation, focus escape, mobile reader without page overflow",
    );
    assert.deepEqual(
      errors,
      [],
      "No uncaught browser errors or failed/network leaks",
    );
    fs.writeFileSync(
      "/evidence/browser-results.json",
      JSON.stringify(
        {
          pass: true,
          errors,
          books: (await state()).books.length,
          notes: (await state()).notes.length,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(e);
    console.error("BROWSER ERRORS", errors);
    if (page) {
      console.log((await page.locator("body").innerText()).slice(-5500));
      await page
        .screenshot({ path: "/evidence/checks-failure.png", fullPage: true })
        .catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
