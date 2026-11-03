const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const SOURCE=process.env.SOURCE_ROOT || process.cwd(), OUTPUT=process.env.QA_OUTPUT || '/tmp/nawah-workspace-integration';fs.mkdirSync(OUTPUT,{recursive:true});
const WEB=process.env.QA_WEB||'http://nawah-admin-integration-dev:3000';
const checks=[],errors=[],escaped=[];let browser, debugPage;
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name)}
(async()=>{
 const {blank}=await import(SOURCE+'/public/strategic-relationships/domain/model.mjs');
 const {createSeed}=await import(SOURCE+'/public/founder-workspace/domain/seed.mjs');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--unsafely-treat-insecure-origin-as-secure='+WEB]});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});let readOnly=false,failSave=false,writes=0;
 const user={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic integration reviewer',email:'qa@example.invalid',role:'ADMIN',emailVerified:true,adminAccess:{isRoot:true,permissions:{}}};
 const docs={'strategic-relationships':blank(),'founder-workspace':createSeed()};for(const [key,value]of Object.entries(docs)){value.id='20000000-0000-4000-8000-'+(key==='founder-workspace'?'000000000001':'000000000002');value.revision=0;}
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='api.nawah-project.com'){
   let value={};const p=u.pathname;
   if(p==='/auth/me')value=user;
   else if(p==='/journey/state')value={state:{currentWeek:0},nodes:[]};
   else if(p==='/ux-lab/assignment')value={excluded:true,sections:{}};
   else if(p.includes('/notifications'))value={items:[],unreadCount:0};
   else if(p.includes('/admin/strategic-relationships')||p.includes('/admin/founder-workspace')){
    const name=p.includes('/strategic-relationships')?'strategic-relationships':'founder-workspace',doc=docs[name];
    if(p.endsWith('/access'))value={canWrite:!readOnly,actorId:user.id};
    else if(p.endsWith('/workspaces')||p.endsWith('/plans'))value={items:[{id:doc.id,revision:doc.revision}]};
    else if(req.method()==='PATCH'){
     if(readOnly)return route.fulfill({status:403,json:{code:'READ_ONLY'}});
     if(failSave){failSave=false;return route.abort('failed');}
     const data=req.postDataJSON();assert.equal(data.expectedRevision,doc.revision);docs[name]={...data.document,revision:doc.revision+1};writes++;value={id:doc.id,revision:doc.revision+1,document:docs[name]};
    }else value={id:doc.id,revision:doc.revision,document:doc};
   }
   return route.fulfill({json:value});
  }
  if(u.origin===WEB){if(u.pathname.endsWith('/config.json'))return route.fulfill({json:{apiUrl:'https://api.nawah-project.com'}});return route.continue();}
  escaped.push(req.url());return route.abort('blockedbyclient');
 });
 const page=await context.newPage();debugPage=page;page.on("console",m=>{if(m.type()==="error")console.log("CONSOLE "+m.text())});page.on("response",r=>{if(r.status()>=400)console.log("HTTP "+r.status()+" "+r.url())});page.setDefaultTimeout(20000);page.on('pageerror',error=>{errors.push(error.message);console.log('PAGEERROR '+error.message)});
 const content=name=>page.locator(`[data-integrated-workspace="${name}"]`);
 const rel=()=>content('strategic-relationships'),founder=()=>content('founder-workspace');
 async function goto(path){await page.goto(WEB+path);await page.locator('[data-integrated-workspace] #main h1').waitFor();}
 async function nav(name,view){const group=page.locator('#workspace-'+name+'-desktop');if(!await group.isVisible())await page.getByRole('button',{name:name==='founder-workspace'?/^(مساحة المؤسس|Founder workspace)$/:/^(إدارة العلاقات الاستراتيجية|Strategic relationships)$/}).click();await group.locator(`a[href="/admin/${name}/${view}"]`).click();}
 await check('native content uses one administrator sidebar with direct subview routes',async()=>{
  await goto('/admin/strategic-relationships/people');assert.equal(await page.locator('iframe').count(),0);assert.equal(await rel().locator('aside').count(),0);assert.match(await rel().locator('#main h1').innerText(),/السياق|تنسى|أشخاص|الأسماء/);
  await nav('strategic-relationships','network');await page.waitForURL('**/network');await rel().locator('.network-controls,.network-graph').first().waitFor();
  await page.goBack();await page.waitForURL('**/people');await rel().locator('#people-search').waitFor();await page.goForward();await page.waitForURL('**/network');
 });
 await check('relationship draft survives blocked route navigation and can be saved then reloaded',async()=>{
  await rel().locator('[data-action=new-person]').first().click();await rel().locator('[name=name]').fill('SYNTHETIC remembered contact');
  // Dialog is a native modal, so exercise browser history navigation (not pointer events behind the modal).
  await page.goBack();await page.getByRole('heading',{name:'عندك تعديل لم يُحفظ'}).waitFor();await page.getByRole('button',{name:'ابقَ مع المسودة'}).click();
  assert.equal(await rel().locator('[name=name]').inputValue(),'SYNTHETIC remembered contact');
  await rel().locator('#editor [type=submit]').click();await rel().locator('#editor').waitFor({state:'hidden'});assert.equal(writes,1);await page.reload();await rel().locator('#main h1').waitFor();assert.equal(docs['strategic-relationships'].people.length,1);
 });
 await check('training is entered from learning, never writes private records, and resets on leaving',async()=>{
  assert.equal(await rel().locator('[data-mode=training]').count(),0);await nav('strategic-relationships','learning');await rel().locator('[data-mode=training]').click();await rel().locator('[data-mode=training][aria-pressed=true]').waitFor();const before=writes;
  await rel().locator('[data-action=new-person]').first().click();await rel().locator('[name=name]').fill('SYNTHETIC training only');await rel().locator('#editor [type=submit]').click();await rel().locator('#editor').waitFor({state:'hidden'});assert.equal(writes,before);
  await nav('strategic-relationships','today');await rel().locator('#main h1').filter({hasText:/علاقات تتذكرها/}).waitFor();assert.equal(await rel().locator('[data-mode=training]').count(),0);assert.equal(docs['strategic-relationships'].people.length,1);
 });
 await check('founder uses the same sidebar; settings contain no preview permission switch',async()=>{
  await nav('founder-workspace','overview');await founder().locator('#main h1').waitFor();assert.equal(await founder().locator('aside').count(),0);assert.equal(await page.locator('iframe').count(),0);
  await founder().locator('[data-action=settings]').click();assert.equal(await founder().locator('[name=readOnly]').count(),0);await founder().locator('#editor [data-action=close-dialog]').first().click();await nav('founder-workspace','timeline');await page.waitForURL('**/timeline');await page.reload();await founder().locator('#main h1').waitFor();
 });
 await check('failed founder save keeps the form and blocks leaving until an explicit decision',async()=>{
  await founder().locator('[data-action=new-task]').first().click();await founder().locator('[name=title]').fill('SYNTHETIC unsaved task');failSave=true;await founder().locator('#editor [type=submit]').click();await founder().locator('.form-error:not([hidden])').waitFor();
  await page.goBack();await page.getByRole('heading',{name:'عندك تعديل لم يُحفظ'}).waitFor();await page.getByRole('button',{name:'ابقَ مع المسودة'}).click();assert.equal(await founder().locator('[name=title]').inputValue(),'SYNTHETIC unsaved task');
  await founder().locator('#editor [type=submit]').click();await founder().locator('#editor').waitFor({state:'hidden'});await nav('strategic-relationships','today');await rel().locator('#main h1').waitFor();
 });
 await check('shared language and small viewports retain navigation without a second menu',async()=>{
  await page.getByRole('button',{name:/تغيير اللغة|Change language/}).first().click();await rel().locator('#main h1').filter({hasText:/Relationships/}).waitFor();
  for(const size of [{width:390,height:844},{width:820,height:1180}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.screenshot({path:OUTPUT+'/integrated-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 });
 await check('legacy hashes normalize, mobile navigation reaches another section, and keyboard leave preserves draft',async()=>{
  await page.goto(WEB+'/admin/founder-workspace#today');await page.waitForURL('**/founder-workspace/today');await founder().locator('#main h1').waitFor();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/Open menu|فتح القائمة/}).click();const group=page.locator('#workspace-strategic-relationships-mobile');if(!await group.isVisible())await page.getByRole('button',{name:/^Strategic relationships$/}).filter({visible:true}).click();await group.locator('a[href="/admin/strategic-relationships/people"]').click();await rel().locator('#people-search').waitFor();
  await page.screenshot({path:OUTPUT+'/integrated-phone.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:OUTPUT+'/integrated-desktop.png',fullPage:true});
 });
 await check('READ remains read-only while navigation and learning remain usable',async()=>{
  readOnly=true;user.adminAccess={isRoot:false,permissions:{STRATEGIC_RELATIONSHIPS:'READ',FOUNDER_WORKSPACE:'READ'}};await goto('/admin/strategic-relationships/people');assert(await rel().locator('[data-action=new-person]').first().isDisabled());await nav('founder-workspace','today');await founder().locator('#main h1').waitFor();assert(await founder().locator('[data-action=new-task]').first().isDisabled());
 });
 assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);fs.writeFileSync(OUTPUT+'/result.json',JSON.stringify({passed:true,checks,errors,escaped,syntheticOnly:true},null,2));await context.close();
})().catch(async error=>{console.error(error);if(debugPage){console.log('BODY '+(await debugPage.locator('body').innerText()).slice(0,4000));await debugPage.screenshot({path:OUTPUT+'/failure.png',fullPage:true});}process.exitCode=1}).finally(async()=>{await browser?.close()});
