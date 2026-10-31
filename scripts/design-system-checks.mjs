import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/app/design-system/tokens.css',import.meta.url),'utf8');
const tokens=Object.fromEntries([...source.matchAll(/--n-([\w-]+):\s*(#[\da-f]{6});/g)].map(m=>[m[1],m[2]]));
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('member text, actions and hover states retain WCAG AA text contrast',()=>{
 for(const [fg,bg] of [['paper','green'],['paper','green-hover'],['paper','green-pressed'],['blue','paper'],['blue-hover','blue-soft'],['ink','paper'],['muted','paper'],['muted','canvas'],['ink','blue-soft'],['gold-ink','gold-soft'],['danger','danger-soft'],['on-brand-muted','green']]){
  const ratio=contrast(tokens[fg],tokens[bg]);assert.ok(ratio>=4.5,`${fg} on ${bg}: ${ratio.toFixed(2)}:1`);
 }
});
test('field borders and focus indicators remain distinguishable',()=>{
 for(const [fg,bg]of[['control-line','paper'],['blue','paper'],['blue','green-soft']])assert.ok(contrast(tokens[fg],tokens[bg])>=3,`${fg}/${bg}`);
});
test('page composition and controls consume colour roles instead of page-local hex colours',()=>{
 for(const file of ['components.css','member-pages.css']){
  const css=readFileSync(new URL('../src/app/design-system/'+file,import.meta.url),'utf8');assert.equal(/#[\da-f]{3,8}\b/i.test(css),false,file);
 }
});
