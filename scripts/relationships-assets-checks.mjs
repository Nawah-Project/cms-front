import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {blank} from '../public/strategic-relationships/domain/model.mjs';
import {shell} from '../public/strategic-relationships/ui/render.mjs';
test('workspace defers branding to the admin shell and resolves its fonts in its asset directory',()=>{
 const html=shell(blank(),{language:'ar',view:'today',today:'2026-11-03'},'<p>Synthetic</p>');
 assert(!html.includes('class="brand"'));assert(!html.includes('<aside'));
 const css=readFileSync('public/strategic-relationships/ui/styles.css','utf8');
 for(const [,src]of css.matchAll(/url\('([^']+)'\)/g))assert(existsSync(resolve('public/strategic-relationships/ui',src)));
});
