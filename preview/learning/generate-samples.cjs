const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "/review/tools/node_modules/playwright",
);
const fs = require("node:fs"),
  path = require("node:path");
const out = process.env.SAMPLES_OUTPUT || "/samples",
  source = process.env.SOURCE_ROOT || "/source";
fs.mkdirSync(out, { recursive: true });
const arabic = fs
    .readFileSync(
      path.join(source, "public/fonts/plex-ar-v15-400-arabic.woff2"),
    )
    .toString("base64"),
  latin = fs
    .readFileSync(path.join(source, "public/fonts/plex-ar-v15-400-latin.woff2"))
    .toString("base64");
const style =
  "<style>@font-face{font-family:Plex;src:url(data:font/woff2;base64," +
  arabic +
  ")}@font-face{font-family:PlexLatin;src:url(data:font/woff2;base64," +
  latin +
  ")}*{box-sizing:border-box}body{margin:0;font-family:Plex,PlexLatin,sans-serif;color:#193a31}article{height:182mm;break-after:page;padding:16mm 10mm;position:relative}article:last-child{break-after:auto}h1{font-size:28px;line-height:1.6;margin:0 0 20px}h2{font-size:23px}p{font-size:15px;line-height:2.1}small{font-size:10px}.cover{background:#133e32;color:#f3f2db;border:12px solid #e7b85a;display:flex;flex-direction:column;justify-content:center}.cover p{color:#d5e3d7}.footer{position:absolute;bottom:5mm;left:10mm;right:10mm;border-top:1px solid #a9bdb0;padding-top:5px;font-size:10px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #96ada0;padding:8px}th{background:#eef2e7}svg{display:block;width:100%;margin:20px 0}</style>";
function html(title, body) {
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>' +
    title +
    "</title>" +
    style +
    "</head><body>" +
    body +
    "</body></html>"
  );
}
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 650, height: 900 } });
  const story =
    "A useful reading record keeps evidence separate from assumptions. Opening a later page does not confirm all the earlier pages. A question gives a reading session direction. A small application helps us notice what changed in our practice. We can revisit the original source when a note needs more context.";
  let pages = "";
  for (let i = 1; i <= 18; i++)
    pages +=
      '<article class="' +
      (i === 1 ? "cover" : "") +
      '"><small>NAWAH · SYNTHETIC REVIEW DOCUMENT</small><h1>' +
      (i === 1
        ? "Learning Experiments"
        : i % 4 === 2
          ? "Chapter " + Math.ceil(i / 4) + " — Reading with a question"
          : "Practice page " + i) +
      "</h1><p>" +
      story +
      "</p><p>" +
      story +
      "</p><p>SEARCH-MARKER-PAGE-" +
      i +
      '</p><div class="footer">Synthetic sample only · PDF page ' +
      i +
      "</div></article>";
  await page.setContent(html("Learning Experiments — Synthetic Review", pages));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(out, "text.pdf"),
    format: "A5",
    margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    printBackground: true,
    outline: true,
    tagged: true,
  });
  await page.setContent(
    html(
      "Scan source",
      "<article><h1>Scanned practice page</h1><p>" +
        story +
        '</p><p>This page is intentionally rendered as a single image. Position notes work without selectable text.</p><svg viewBox="0 0 500 140"><rect x="20" y="30" width="180" height="80" rx="12" fill="#174c87"/><path d="M210 70H280" stroke="#193a31" stroke-width="4"/><rect x="290" y="30" width="180" height="80" rx="12" fill="#e7b85a"/></svg></article>',
    ),
  );
  await page.evaluate(() => document.fonts.ready);
  const png = (await page.screenshot()).toString("base64");
  await page.setContent(
    html(
      "Scanned Pages — Synthetic Review",
      Array.from(
        { length: 3 },
        () =>
          '<article style="padding:0"><img style="width:100%;height:175mm;object-fit:contain" src="data:image/png;base64,' +
          png +
          '"></article>',
      ).join(""),
    ),
  );
  await page.pdf({
    path: path.join(out, "scan.pdf"),
    format: "A5",
    margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    printBackground: true,
  });
  pages = "";
  for (let i = 1; i <= 6; i++)
    pages +=
      '<article dir="rtl"><small>نواة · ملف تجريبي مصطنع</small><h1>التعلّم بالممارسة — ' +
      i +
      '</h1><p>أبدأ بسؤال واضح، وأختار من الكتاب ما يخدم هذا السؤال. أحفظ الفكرة مع موضعها، ثم أختبرها في موقف مناسب. زيارة الصفحة ليست دليلًا على قراءتها، وإكمال القراءة لا يثبت التمكّن.</p><p>أعود إلى الملاحظات لأفهم لماذا ربطت هذا المرجع بغيره، وما الذي تغيّر في فهمي بعد التجربة.</p><svg viewBox="0 0 500 150"><rect x="10" y="25" width="140" height="90" rx="12" fill="#125e4e"/><rect x="180" y="25" width="140" height="90" rx="12" fill="#174c87"/><rect x="350" y="25" width="140" height="90" rx="12" fill="#e7b85a"/><path d="M155 70H175M325 70H345" stroke="#183b37" stroke-width="5"/></svg><table><tr><th>المرحلة</th><th>الدليل</th></tr><tr><td>قراءة</td><td>صفحات أكدت قراءتها</td></tr><tr><td>تطبيق</td><td>تجربة ونتيجة وحدود</td></tr></table><div class="footer">عينة مصطنعة · ' +
      i +
      "</div></article>";
  await page.setContent(html("التعلّم بالممارسة — عينة مصطنعة", pages));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(out, "mixed.pdf"),
    format: "A5",
    margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    printBackground: true,
    outline: true,
    tagged: true,
  });
  await browser.close();
  console.log("Three synthetic PDF samples generated.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
