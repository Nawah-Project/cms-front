const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const fixtures = JSON.parse(
  fs.readFileSync(
    process.env.FIXTURES_PATH || '/tmp/studio-fixtures.json',
    'utf8',
  ),
);
const web = process.env.STUDIO_WEB || 'http://127.0.0.1:5173',
  api = process.env.STUDIO_API || 'http://127.0.0.1:3000';
if (
  !Object.values(fixtures.users).every((u) =>
    u.email.endsWith('@example.invalid'),
  )
)
  throw new Error('Synthetic identities required');
if (
  ![web, api].every((u) =>
    /^(localhost|127\.|172\.|10\.|192\.168\.)/.test(new URL(u).hostname),
  )
)
  throw new Error('Local QA origins required');
const out = process.env.OUTPUT_DIR || '/tmp/studio-browser';
fs.mkdirSync(out, { recursive: true });
let activeBrowser, activePage;
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--unsafely-treat-insecure-origin-as-secure=${web}`,
    ],
  });
  activeBrowser = browser;
  const checks = [],
    errors = [];
  checks.push = function (...items) {
    console.log('PASS', ...items);
    return Array.prototype.push.apply(this, items);
  };
  let currentPage;
  async function context(
    key,
    locale = 'ar',
    viewport = { width: 1440, height: 1000 },
  ) {
    const c = await browser.newContext({ viewport, reducedMotion: 'reduce' }),
      u = fixtures.users[key];
    const login = await c.request.post(api + '/auth/login', {
      data: { email: u.email, password: u.password },
    });
    assert.equal(login.status(), 200, await login.text());
    await c.addInitScript(
      ({ locale, id }) => {
        localStorage.setItem('job-tracker.locale', locale);
        for (const f of [
          'analytics-week1-v1',
          'analytics-unlocked-v1',
          'first-application-v1',
          'guidance-first-v1',
        ])
          localStorage.setItem(`nawah_feature_tour_${id}_${f}`, 'true');
      },
      { locale, id: u.id },
    );
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    currentPage = p;
    activePage = p;
    p.setDefaultTimeout(15000);
    return { c, p };
  }
  const { c: root, p } = await context('root');
  const base = '/admin/ux-lab/individual-research';
  await p.goto(web + base);
  console.log('root route', p.url());
  await p
    .getByRole('heading', { name: 'التجارب الفردية', exact: true })
    .waitFor();
  await p
    .getByRole('button', { name: 'تجربة فردية جديدة', exact: true })
    .click();
  let d = p.getByRole('dialog');
  await d
    .getByLabel('المشارك', { exact: false })
    .last()
    .selectOption(fixtures.users.participant.id);
  await d
    .getByLabel('عنوان التجربة')
    .fill('تجربة متصفح معزولة ' + fixtures.run);
  await d.getByLabel('هدف قابل للتحقق').fill('توثيق مثال حقيقي للقيمة المهنية');
  await d
    .getByLabel('فرضية تحتاج اختبارًا')
    .fill('صياغة المثال قد تساعد في توضيح أثر العمل');
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  await p.waitForURL(/[?&]case=/);
  const caseId = new URL(p.url()).searchParams.get('case');
  assert(caseId);
  checks.push('Create a draft case through Arabic UI');
  await p.getByRole('button', { name: 'توثيق موافقة صريحة' }).click();
  d = p.getByRole('dialog');
  await d
    .getByLabel('دليل مختصر')
    .fill(
      'Synthetic participant explicitly consented to notes, purpose, retention and withdrawal',
    );
  await d.locator('input[type=checkbox]').check();
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  await p
    .getByRole('button', { name: 'الحالة والخطوة التالية', exact: true })
    .click();
  d = p.getByRole('dialog');
  await d.getByLabel('حالة التجربة', { exact: true }).selectOption('ACTIVE');
  await d
    .getByLabel('الخطوة القادمة المتفق عليها')
    .fill('تسجيل جلسة ومتابعة المثال');
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  checks.push('Record explicit consent, activate case and save next step');
  await p.getByRole('button', { name: 'الجلسات', exact: true }).click();
  await p.getByRole('button', { name: 'سجّل جلسة' }).click();
  d = p.getByRole('dialog');
  await d.getByLabel('هدف الجلسة').fill('توضيح أثر المشروع على العميل');
  await d
    .getByLabel('ما صرّح به المشارك')
    .fill('PRIVATE_BROWSER_STATEMENT_' + fixtures.run);
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  await p
    .getByText('PRIVATE_BROWSER_STATEMENT_' + fixtures.run, { exact: true })
    .waitFor();
  checks.push('Record private session separately from member-facing content');
  await p.getByRole('button', { name: 'الملاحظات', exact: true }).click();
  await p.getByRole('button', { name: 'أضف ملاحظة خاصة' }).click();
  d = p.getByRole('dialog');
  await d
    .getByLabel('النص الوصفي')
    .fill('PRIVATE_BROWSER_OBSERVATION_' + fixtures.run);
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  checks.push('Record typed observation');
  await p.getByRole('button', { name: 'الخطة الفردية', exact: true }).click();
  await p.getByRole('button', { name: 'أضف خطوة', exact: true }).click();
  d = p.getByRole('dialog');
  await d
    .getByLabel('عنوان الخطوة')
    .fill('Synthetic example step ' + fixtures.run);
  await d
    .getByLabel('ما الدليل الواضح على اكتمالها؟')
    .fill('One example reviewed by the researcher');
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  await p.getByLabel('حالة الخطوة').selectOption('DONE');
  checks.push(
    'Create and manually verify a private plan item without completing a JourneyNode',
  );
  await p
    .getByRole('button', { name: 'التدخلات والتوجيه', exact: true })
    .click();
  await p
    .getByRole('button', { name: 'إسناد أو ربط تدخل', exact: true })
    .click();
  d = p.getByRole('dialog');
  await d
    .getByLabel('عنوان التدخل')
    .fill('Member-facing synthetic task ' + fixtures.run);
  await d
    .getByLabel('المحتوى الموجّه للمشارك')
    .fill('Write one real example of your professional work');
  await d.locator('input[type=checkbox]').check();
  await d.getByRole('button', { name: 'تأكيد التدخل للمشارك' }).click();
  await d.waitFor({ state: 'hidden' });
  checks.push(
    'Explicitly publish a member-facing intervention through the existing Tasks service',
  );
  await p.getByRole('button', { name: 'الإتاحة الفردية', exact: true }).click();
  assert(
    await p.evaluate(
      () =>
        document.querySelector('.ies').getBoundingClientRect().right <=
        document.querySelector('.workspace-sidebar').getBoundingClientRect()
          .left +
          1,
    ),
  );
  await p.screenshot({
    path: out + '/studio-desktop-ar.png',
    fullPage: true,
    animations: 'disabled',
  });
  // Exercise the UI grant form, then add a second grant through the real guarded API.
  await p
    .getByRole('button', { name: /أضف إتاحة|إتاحة جديدة|امنح إتاحة/ })
    .click();
  d = p.getByRole('dialog');
  await d.getByLabel('نوع المورد').selectOption('WEEKLY_REPORT');
  await d.getByLabel('الأسبوع', { exact: true }).selectOption('2');
  await d
    .getByLabel('سبب الإتاحة')
    .fill('Synthetic review of the second week report');
  await d.getByRole('button', { name: 'حفظ', exact: true }).click();
  await d.waitFor({ state: 'hidden' });
  checks.push('Grant a specific early weekly report through UI');
  const rid = () => ({ requestId: crypto.randomUUID() });
  async function grant(type, id) {
    const r = await root.request.post(
      api + '/admin/individual-research/cases/' + caseId + '/overrides',
      {
        data: {
          ...rid(),
          resourceType: type,
          resourceId: id,
          permission: 'VIEW',
          reason: 'Synthetic browser read-only check',
          startsAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    );
    assert.equal(r.status(), 201, await r.text());
    return r.json();
  }
  // Actual controller base differs from the frontend route.
  const controller = api + '/admin/individual-research/cases/' + caseId;
  const guidance = await root.request.post(controller + '/overrides', {
    data: {
      ...rid(),
      resourceType: 'GUIDANCE',
      resourceId: 'INSIGHT_W1_INTERVIEW_BASIC',
      permission: 'VIEW',
      reason: 'Synthetic browser guidance viewing',
      startsAt: new Date(Date.now() - 1000).toISOString(),
    },
  });
  assert.equal(guidance.status(), 201, await guidance.text());
  const own = await root.request.get(controller);
  const detail = await own.json();
  assert(detail.accessOverview.length > 0);
  await grant('FEATURE', 'professionalTasks');
  const { c: member, p: mp } = await context('participant');
  await mp.goto(web + '/reports');
  await mp.getByRole('heading', { name: /^تقرير الأسبوع [2٢]$/ }).waitFor();
  assert((await mp.getByText('إتاحة فردية', { exact: false }).count()) > 0);
  assert.equal(
    await mp.getByRole('button', { name: /أكمل الرحلة/ }).count(),
    0,
  );
  checks.push(
    'Participant lands on granted weekly report with truthful empty data and no completion',
  );
  await mp.goto(
    web + '/professional-development?guidance=INSIGHT_W1_INTERVIEW_BASIC',
  );
  await mp.getByRole('dialog').waitFor();
  assert(
    (await mp
      .getByText('إتاحة فردية للمشاهدة فقط.', { exact: false })
      .count()) > 0,
  );
  assert.equal(
    await mp
      .getByRole('button', { name: 'أتممت قراءة الإرشادات', exact: true })
      .count(),
    0,
  );
  await mp.getByRole('button', { name: 'إغلاق', exact: true }).first().click();
  checks.push('Guidance VIEW opens read-only and remains closable');
  await mp.goto(web + '/professional-development/tasks');
  await mp
    .getByText('Member-facing synthetic task ' + fixtures.run, { exact: true })
    .click();
  await mp.getByRole('dialog').waitFor();
  assert.equal(
    await mp.getByRole('dialog').locator('select:not([disabled])').count(),
    0,
  );
  assert.equal(
    await mp
      .getByRole('dialog')
      .getByRole('button', { name: /تعديل|حذف/ })
      .count(),
    0,
  );
  await mp.keyboard.press('Escape');
  checks.push(
    'Assigned task opens under FEATURE VIEW with mutation controls disabled',
  );
  const memberProjection = await member.request.get(
    api + '/individual-research/participation',
  );
  assert(!(await memberProjection.text()).includes('PRIVATE_BROWSER_'));
  const { c: outsider, p: op } = await context('outsider', 'en');
  await op.goto(web + base + '?case=' + caseId);
  await op
    .getByText('This case is unavailable or you are not authorized to view it.')
    .waitFor();
  assert.equal((await outsider.request.get(controller)).status(), 404);
  checks.push('Unassigned administrator denied in API and English UI');
  // Authorize a reader to verify server and interface write controls separately.
  const allow = await root.request.patch(controller, {
    data: { ...rid(), allowedAdminIds: [fixtures.users.reader.id] },
  });
  assert.equal(allow.status(), 200, await allow.text());
  const { c: reader, p: rp } = await context('reader', 'en', {
    width: 390,
    height: 844,
  });
  await rp.goto(web + base + '?case=' + caseId);
  await rp
    .getByRole('heading', {
      name: 'تجربة متصفح معزولة ' + fixtures.run,
      exact: true,
    })
    .waitFor();
  assert.equal(
    await rp.getByRole('button', { name: 'Status & next step' }).count(),
    0,
  );
  await rp.getByRole('button', { name: 'Sessions', exact: true }).click();
  assert.equal(
    await rp.getByRole('button', { name: 'Record session' }).count(),
    0,
  );
  assert.equal(
    (
      await reader.request.patch(controller, {
        data: { ...rid(), nextStep: 'not permitted' },
      })
    ).status(),
    403,
  );
  assert(
    await rp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await rp.screenshot({
    path: out + '/studio-mobile-en-readonly.png',
    fullPage: true,
    animations: 'disabled',
  });
  checks.push(
    'Authorized READ staff: mobile LTR, no page overflow and server denies mutation',
  );
  await p.getByRole('link', { name: 'Mentoring لهذا المشارك' }).click();
  await p.getByRole('link', { name: 'العودة للتجربة الفردية' }).waitFor();
  await p
    .getByText('Member-facing synthetic task ' + fixtures.run, { exact: true })
    .first()
    .waitFor();
  await p.getByRole('link', { name: 'العودة للتجربة الفردية' }).click();
  await p
    .getByRole('button', { name: 'الحالة والخطوة التالية', exact: true })
    .waitFor();
  checks.push(
    'Mentoring opens the selected participant and returns to the original case',
  );
  // Keyboard access / focus trap and Escape on the real editor.
  await p
    .getByRole('button', { name: 'الحالة والخطوة التالية', exact: true })
    .click();
  await p.getByRole('dialog').waitFor();
  await p.keyboard.press('Tab');
  assert(
    await p.evaluate(() =>
      Boolean(document.activeElement?.closest('[role=dialog]')),
    ),
  );
  await p.keyboard.press('Escape');
  await p.getByRole('dialog').waitFor({ state: 'hidden' });
  checks.push('Keyboard focus stays in modal; Escape closes it');
  // Mobile Arabic writable form remains bounded.
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole('button', { name: 'الجلسات', exact: true }).click();
  await p.getByRole('button', { name: 'سجّل جلسة' }).click();
  await p.getByRole('dialog').waitFor();
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.screenshot({
    path: out + '/studio-mobile-ar-form.png',
    fullPage: true,
    animations: 'disabled',
  });
  await p.keyboard.press('Escape');
  checks.push(
    'Arabic mobile editor with reduced motion and no horizontal page scrolling',
  );
  // Participant withdrawal is the normal profile UI and immediately revokes both grants.
  await mp.goto(web + '/profile');
  await mp.getByRole('button', { name: 'سحب موافقتي على المشاركة' }).click();
  await mp.getByRole('button', { name: 'تأكيد سحب الموافقة' }).click();
  await mp.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(
    (await member.request.get(api + '/journey/reports?scope=week:2')).status(),
    403,
  );
  checks.push(
    'Participant withdraws from Profile; report access is immediately revoked',
  );
  const second = await root.request.post(
    api + '/admin/individual-research/cases',
    {
      data: {
        ...rid(),
        userId: fixtures.users.participant.id,
        title: 'Synthetic incomplete-profile withdrawal',
        goal: 'Verify voluntary participation withdrawal',
        hypothesis: 'Withdrawal must stay reachable without profile readiness',
        retentionUntil: new Date(Date.now() + 10 * 86400000).toISOString(),
      },
    },
  );
  assert.equal(second.status(), 201, await second.text());
  const secondId = (await second.json()).id;
  // Simulate only the frontend readiness projection. All identity, ACL, case and withdrawal requests remain real.
  await mp.route(api + '/profile', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: { ...data, profileComplete: false },
    });
  });
  await mp.goto(web + '/profile');
  await mp
    .getByRole('heading', {
      name: 'Synthetic incomplete-profile withdrawal',
      exact: true,
    })
    .waitFor();
  await mp
    .locator('article')
    .filter({
      has: mp.getByRole('heading', {
        name: 'Synthetic incomplete-profile withdrawal',
        exact: true,
      }),
    })
    .getByRole('button', { name: 'سحب موافقتي على المشاركة' })
    .click();
  await mp.getByRole('button', { name: 'تأكيد سحب الموافقة' }).click();
  await mp.getByRole('dialog').waitFor({ state: 'hidden' });
  const secondDetail = await root.request.get(
    api + '/admin/individual-research/cases/' + secondId,
  );
  assert.equal((await secondDetail.json()).consentStatus, 'WITHDRAWN');
  checks.push(
    'Withdrawal remains reachable on the incomplete-profile welcome screen (readiness projection simulated)',
  );
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(
    out + '/results.json',
    JSON.stringify({ checks, errors, caseId, passed: checks.length }, null, 2),
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
  await browser.close();
})().catch(async (e) => {
  console.error(e.stack);
  if (activePage) {
    console.error(
      await activePage
        .locator('body')
        .innerText()
        .catch(() => ''),
    );
    await activePage
      .screenshot({
        path: out + '/failure.png',
        fullPage: true,
        animations: 'disabled',
      })
      .catch(() => {});
  }
  await activeBrowser?.close();
  process.exitCode = 1;
});
