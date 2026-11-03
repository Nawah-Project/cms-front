import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {FOUNDER_APPEARANCE_KEY,FOUNDER_APPEARANCE_BOOTSTRAP,normalizeAppearance,resolveAppearance,isFounderPath,readAppearance} from '../src/app/platform/appearance/founder-appearance.mjs';
const props=text=>Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)].map(([,k,v])=>[k,v.trim()]));
const tokens=readFileSync('src/app/design-system/tokens.css','utf8');
const brand=readFileSync('src/app/brand-admin.css','utf8');
const pilot=readFileSync('src/app/founder-appearance.css','utf8');
const block=(text,selector)=>{const start=text.indexOf(selector);assert(start>=0,selector);const from=text.indexOf('{',start);return text.slice(from+1,text.indexOf('}',from));};
const base={...props(tokens),...props(brand),...props(block(pilot,'html[data-founder-theme] body[data-brand-scope="admin"]'))};
const dark={...base,...props(block(pilot,'html[data-founder-theme="dark"] body[data-brand-scope="admin"]'))};
function color(v,palette){for(let i=0;i<8&&v.startsWith('var(');i++)v=palette[v.match(/var\((--[\w-]+)/)[1]];assert.match(v,/^#[a-f0-9]{6}$/i);return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);}
function ratio(a,b,p){const x=color(p[a],p),y=color(p[b],p);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('day and night role pairs meet minimum text and control contrast',()=>{
 for(const [mode,p]of [['light',base],['dark',dark]]) {
  for(const [fg,bg]of [['--n-ink','--n-paper'],['--n-muted','--n-paper'],['--n-muted','--n-paper-soft'],['--n-green','--n-green-soft'],['--n-blue','--n-blue-soft'],['--n-gold-ink','--n-gold-soft'],['--n-danger','--n-danger-soft'],['--n-on-brand','--n-action'],['--n-on-brand','--n-action-hover'],['--n-hero-muted','--n-deep']])assert(ratio(fg,bg,p)>=4.5,`${mode}: ${fg}/${bg}=${ratio(fg,bg,p)}`);
  for(const [fg,bg]of [['--n-control-line','--n-paper'],['--n-blue','--n-paper'],['--n-connection','--n-map-ground']])assert(ratio(fg,bg,p)>=3,`${mode}: control ${fg}/${bg}=${ratio(fg,bg,p)}`);
 }
});
test('preferences are whitelisted and invalid/blocked storage falls back safely',()=>{
 assert.equal(normalizeAppearance('garbage'),'dark');assert.equal(resolveAppearance('system',true),'dark');assert.equal(resolveAppearance('system',false),'light');assert.equal(readAppearance({getItem(){throw Error('blocked')}}),'dark');assert.equal(readAppearance({getItem:()=> 'light'}),'light');
});
test('pre-paint bootstrap applies only to Founder and never executes stored content',()=>{
 for(const path of ['/admin/founder-workspace','/admin/founder-workspace/today']) {
  const document={documentElement:{dataset:{}}};vm.runInNewContext(FOUNDER_APPEARANCE_BOOTSTRAP,{location:{pathname:path},localStorage:{getItem:()=> 'system'},matchMedia:()=>({matches:false}),document});assert.equal(document.documentElement.dataset.founderTheme,'light');assert(isFounderPath(path));
 }
 for(const path of ['/auth/login','/admin/ux-lab','/admin/founder-workspace-other','/applications']) {
  const document={documentElement:{dataset:{}}};vm.runInNewContext(FOUNDER_APPEARANCE_BOOTSTRAP,{location:{pathname:path},document});assert.deepEqual(document.documentElement.dataset,{});assert(!isFounderPath(path));
 }
 const document={documentElement:{dataset:{}}};vm.runInNewContext(FOUNDER_APPEARANCE_BOOTSTRAP,{location:{pathname:'/admin/founder-workspace'},localStorage:{getItem:()=> '";throw Error("payload");'},document});assert.equal(document.documentElement.dataset.founderTheme,'dark');assert.match(FOUNDER_APPEARANCE_KEY,/appearance/);
});

test('theme declarations retain valid variable references after token migration',()=>{
 const css=readFileSync('public/founder-workspace/ui/styles.css','utf8')+brand+pilot;
 assert.doesNotMatch(css,/var\(--var\(/);
 assert.doesNotMatch(css,/var\(--[\w-]+\)[0-9a-f]{2}(?=[;,\s])/i);
});
