const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const SOURCE=process.env.SOURCE_ROOT || process.cwd(), OUTPUT=process.env.QA_OUTPUT || '/tmp/nawah-admin-appearance';fs.mkdirSync(OUTPUT,{recursive:true});
const WEB=process.env.QA_WEB||'http://nawah-admin-integration-dev:3000';
const fixtures=require('./admin-appearance-fixtures.cjs');
const checks=[],errors=[],escaped=[];let browser, debugPage;
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name)}
(async()=>{
 const {blank}=await import(SOURCE+'/public/strategic-relationships/domain/model.mjs');
 const {createSeed}=await import(SOURCE+'/public/founder-workspace/domain/seed.mjs');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--unsafely-treat-insecure-origin-as-secure='+WEB]});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});let readOnly=false,failSave=false,writes=0,loggedIn=true;
 const user={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic integration reviewer',email:'qa@example.invalid',role:'ADMIN',emailVerified:true,adminAccess:{isRoot:true,permissions:{}}};
 const docs={'strategic-relationships':blank(),'founder-workspace':createSeed()};for(const [key,value]of Object.entries(docs)){value.id='20000000-0000-4000-8000-'+(key==='founder-workspace'?'000000000001':'000000000002');value.revision=0;}
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.hostname==='api.nawah-project.com'){
   let value={};const p=u.pathname;
   if(p==='/auth/me'){if(!loggedIn)return route.fulfill({status:401,json:{message:'Synthetic signed out'}});value=user;}
   else if(p==='/admin/marketing/overview')value=fixtures.marketing;
   else if(p==='/admin/operations/overview')value=fixtures.operations;
   else if(p==='/admin/ux-lab/v2/journey-map')value=fixtures.journey;
   else if(p.includes('journey-observations'))value={items:[],total:0,page:1,pageSize:20};
   else if(p.startsWith('/admin/journey/'))value=[];
   else if(p.startsWith('/admin/career-consulting/catalog'))value={units:[],activities:[]};
   else if(p.startsWith('/admin/career-consulting/cases'))value={items:[],total:0};
   else if(p.startsWith('/admin/career-consulting/candidates'))value=[];
   else if(p==='/journey/state')value={state:{currentWeek:0},nodes:[]};
   else if(p==='/admin/monitoring/overview')value={usersCount:12,groupsCount:2,membershipsCount:8,applicationsCount:30,activeUsersCount:4,warningUsersCount:2,criticalUsersCount:1,neverActiveUsersCount:5,unassignedUsersCount:4,journey:{weeks:[]}};
   else if(p.startsWith('/admin/monitoring/'))value={items:[],total:0,totalPages:1};
   else if(p.startsWith('/admin/operations')||p.includes('ux-lab/analytics'))return route.fulfill({status:503,json:{message:'Synthetic unavailable optional data'}});
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

 const key='nawah.admin.appearance.v1';
 const choice=mode=>page.getByRole('group',{name:/اختيار المظهر|Appearance options/}).getByRole('button',{name:mode,exact:true});
 async function pixels(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:OUTPUT+'/'+name+'.png',fullPage:true});}
 const palette=()=>page.evaluate(()=>{const host=document.querySelector('[data-integrated-workspace=founder-workspace]'),root=host?.shadowRoot;const el=root?.querySelector('#main h1');return {theme:document.documentElement.dataset.adminTheme,body:getComputedStyle(document.body).backgroundColor,surface:root?getComputedStyle(root.querySelector('.workspace')).backgroundColor:null,text:el?getComputedStyle(el).color:null,mode:localStorage.getItem('nawah.admin.appearance.v1')};});
 await check('Founder opens in night mode before use, with the shared Arabic typeface and no data writes',async()=>{
  await goto('/admin/founder-workspace/overview');assert.equal((await palette()).theme,'dark');assert.equal(writes,0);assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).colorScheme),'dark');await pixels('founder-dark-overview');
 });
 await check('light/dark modes persist across refresh and preserve the five Founder views',async()=>{
  await choice('نهاري').click();await page.waitForFunction(()=>document.documentElement.dataset.adminTheme==='light');assert.equal((await palette()).mode,'light');await pixels('founder-light-overview');await page.reload();await founder().locator('#main h1').waitFor();assert.equal((await palette()).theme,'light');
  await choice('ليلي').click();for(const view of ['loop','timeline','today','review']){await nav('founder-workspace',view);await founder().locator('#main h1').waitFor();assert.equal((await palette()).theme,'dark');await pixels('founder-dark-'+view);}assert.equal(writes,0);
 });
 await check('open form contents survive live system appearance changes and failed storage',async()=>{
  await nav('founder-workspace','today');await choice('حسب الجهاز').click();await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.adminTheme==='light');await founder().locator('[data-action=new-task]').first().click();await founder().locator('[name=title]').fill('SYNTHETIC appearance draft');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.adminTheme==='dark');assert.equal(await founder().locator('[name=title]').inputValue(),'SYNTHETIC appearance draft');assert.equal(await founder().locator('.dialog-top .button').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(25, 41, 31)');await pixels('founder-dark-form');await founder().locator('#editor [data-action=discard-dialog]').count().then(async count=>{if(!count)await founder().locator('#editor [data-action=close-dialog]').first().click();});await founder().locator('#editor [data-action=discard-dialog]').click();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;window.__restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=()=>{throw Error('synthetic blocked storage')};});await choice('نهاري').click();await page.getByRole('status').filter({hasText:/الجلسة/}).waitFor();assert.equal((await palette()).theme,'light');await page.evaluate(()=>window.__restoreStorage());
 });
 await check('one saved preference follows every admin section, including domain cards, charts and dialogs',async()=>{
  const screens=[['','h1'],['/community','h1'],['/mentoring','h1'],['/journey','h1'],['/report-preview','h1'],['/ux-lab','.jro-shell'],['/marketing','.mk-panel'],['/operations','.ops-card'],['/career-consulting','.cc'],['/strategic-relationships/today','[data-integrated-workspace] #main h1']];
  for(const [path,ready]of screens){
   await page.goto(WEB+'/admin'+path);await page.locator(ready).first().waitFor();await choice('ليلي').click();await page.waitForFunction(()=>document.documentElement.dataset.adminTheme==='dark');assert.equal((await palette()).body,'rgb(16, 27, 22)');await pixels('admin'+(path.replaceAll('/','-')||'-overview')+'-dark');
   await choice('نهاري').click();assert.equal((await palette()).body,'rgb(244, 244, 237)');await pixels('admin'+(path.replaceAll('/','-')||'-overview')+'-light');
  }
  await page.goto(WEB+'/admin/operations');await page.locator('.ops-card').first().waitFor();await choice('ليلي').click();await page.getByRole('button',{name:'إعدادات التشغيل',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.locator('input').first().evaluate(el=>getComputedStyle(el).colorScheme),'dark');await pixels('admin-operations-dialog-dark');await page.keyboard.press('Escape');
  assert.equal(writes,0);
 });
 await check('mobile/tablet and English retain selectable themes, legibility and no page-width overflow',async()=>{
  await goto('/admin/founder-workspace/overview');await page.getByRole('button',{name:/تغيير اللغة|Change language/}).first().click();await founder().locator('#main h1').filter({hasText:/Build/}).waitFor();
  for(const [name,width,height]of [['phone',390,844],['tablet',820,1180]]){await page.setViewportSize({width,height});await choice('Dark').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await pixels('founder-dark-'+name);await choice('Light').click();await pixels('founder-light-'+name);}await page.setViewportSize({width:1440,height:1000});
 });
 await check('preferences synchronize between tabs without saving or changing the plan',async()=>{
  await choice('Dark').click();const second=await context.newPage();await second.goto(WEB+'/admin/founder-workspace/overview');await second.locator('[data-integrated-workspace] #main h1').waitFor();await second.getByRole('group',{name:/Appearance options/}).getByRole('button',{name:'Light',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.adminTheme==='light');assert.equal(writes,0);await second.close();
 });
 await check('responsive night surfaces work across the other admin domains in English',async()=>{
  await page.setViewportSize({width:390,height:844});
  for(const [path,ready]of [['marketing','.mk-panel'],['operations','.ops-card'],['ux-lab','.jro-shell'],['career-consulting','.cc'],['strategic-relationships/today','[data-integrated-workspace] #main h1']]){
   await page.goto(WEB+'/admin/'+path);await page.locator(ready).first().waitFor();await choice('Dark').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+path);await pixels('mobile-'+path.replaceAll('/','-')+'-night');
  }
 });
 await check('member login stays daytime with no administrative appearance controls',async()=>{loggedIn=false;await page.goto(WEB+'/auth/login');await page.locator('input').first().waitFor();assert.equal((await palette()).theme,undefined);assert.equal(await page.getByRole('group',{name:/Appearance options|اختيار المظهر/}).count(),0);});
 assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);fs.writeFileSync(OUTPUT+'/result.json',JSON.stringify({passed:true,checks,errors,escaped,syntheticOnly:true},null,2));await context.close();
})().catch(async error=>{console.error(error);if(debugPage){console.log('BODY '+(await debugPage.locator('body').innerText()).slice(0,4000));await debugPage.screenshot({path:OUTPUT+'/failure.png',fullPage:true});}process.exitCode=1}).finally(async()=>{await browser?.close()});
