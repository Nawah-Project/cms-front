import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blank} from '../public/strategic-relationships/domain/model.mjs';
import {shell as relationships} from '../public/strategic-relationships/ui/render.mjs';
import {createSeed} from '../public/founder-workspace/domain/seed.mjs';
import {shell as founder} from '../public/founder-workspace/ui/render.mjs';
import {createWorkspaceEnvironment} from '../src/app/platform/workspaces/runtime.mjs';

test('integrated content has one host navigation, and training entry belongs to learning',()=>{
 const doc=blank();const s={integrated:true,language:'ar',view:'today',today:'2026-11-03'};
 const html=relationships(doc,s,'<p>Synthetic content</p>');
 assert(!html.includes('<aside'));assert(!html.includes('data-action="mobile-nav"'));assert(!html.includes('data-action="language"'));assert(!html.includes('data-mode='));
 assert(relationships(doc,{...s,view:'learning'},'<p>Learning</p>').includes('data-mode="training"'));
 const plan=createSeed(),rendered=founder(plan,{integrated:true,language:'ar',view:'overview',today:'2026-11-03',horizon:6,cycleId:plan.cycles[0].id});
 assert(!rendered.includes('<aside'));assert(!rendered.includes('data-action="language"'));assert(!rendered.includes('target="_top"'));
});

test('workspace lifecycle scopes events, aborts requests and disposes timers/resources',async()=>{
 const originalFetch=globalThis.fetch;const originalWindow=globalThis.window;
 const root=new EventTarget();const native=new EventTarget();let disposed=0,called=0;
 root.ownerDocument=native;root.host={};root.getElementById=id=>id;root.querySelectorAll=()=>[];
 globalThis.window=new EventTarget();globalThis.fetch=(_url,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));
 try {
  const env=createWorkspaceEnvironment(root,{language:'ar',view:'today',onNavigate:()=>{}});
  env.document.addEventListener('click',()=>called++);env.window.addEventListener('resize',()=>called++);
  root.dispatchEvent(new Event('click'));native.dispatchEvent(new Event('click'));assert.equal(called,1);
  globalThis.window.dispatchEvent(new Event('resize'));assert.equal(called,2);
  env.onDispose(()=>disposed++);env.setTimeout(()=>called++,10);
  const request=env.fetch('https://invalid.example');env.dispose();env.dispose();
  await assert.rejects(request,{name:'AbortError'});root.dispatchEvent(new Event('click'));globalThis.window.dispatchEvent(new Event('resize'));
  await new Promise(r=>setTimeout(r,20));assert.equal(called,2);assert.equal(disposed,1);
 } finally {globalThis.fetch=originalFetch;globalThis.window=originalWindow;}
});

test('production workspace entry points have no frame or local-preview claims',()=>{
 for(const name of ['founder-workspace','strategic-relationships']) {
  const file=name==='founder-workspace'?'FounderWorkspacePage':'StrategicRelationshipsPage';
  assert(!readFileSync(`src/app/features/${name}/${file}.tsx`,'utf8').includes('iframe'));
 }
 const code=readFileSync('public/founder-workspace/ui/app.mjs','utf8');
 assert(!code.includes('local preview data'));assert(!code.includes('محاكاة القراءة فقط داخل المعاينة'));assert(code.includes('current Founder plan saved on the server'));
});
