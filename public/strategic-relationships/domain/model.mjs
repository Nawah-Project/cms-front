// Domain-owned data and decisions. No DOM, storage, HTTP or other Nawah feature imports.
export const VERSION=1;
export const clone=value=>structuredClone(value);
export class DomainError extends Error{constructor(code){super(code);this.code=code;}}
export const fail=code=>{throw new DomainError(code);};
export const id=(prefix='row')=>`${prefix}-${globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}`;
export const clean=s=>String(s??'').trim();
export const normalize=s=>clean(s).toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ');
export function safeUrl(value){if(!value)return '';try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function dateValue(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('DATE');const n=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)fail('DATE');return n;}
export const addDays=(date,days)=>new Date(dateValue(date)+days*86400000).toISOString().slice(0,10);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const RELATIONS={knows:{ar:'معرفة مباشرة',en:'Knows',directed:false},collaborates:{ar:'تعاون فعلي',en:'Collaborates',directed:false},advice:{ar:'يطلب مشورة من',en:'Seeks advice from',directed:true},introduced:{ar:'عرّف شخصًا إلى',en:'Introduced to',directed:true},affiliated:{ar:'انتماء إلى جهة',en:'Affiliated with',directed:true},attended:{ar:'حضور حدث',en:'Attended event',directed:true}};
export const collections=['people','organizations','goals','facts','interactions','commitments','events','collaborations','reviews','analyses','learningEvidence'];
const assertText=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('TEXT');};
const idsOf=rows=>new Set(rows.map(r=>r.id));
const ref=(value,ids,optional=true)=>{if(!value&&optional)return;if(!ids.has(value))fail('REFERENCE');};
const strings=(v,max=30)=>{if(!Array.isArray(v)||v.length>max)fail('FORMAT');v.forEach(x=>assertText(x,500));};
const url=v=>{if(v&&!safeUrl(v))fail('URL');};
export function blank(mode='personal'){
 if(!['personal','training'].includes(mode))fail('MODE');
 return {kind:'nawah-strategic-relationships',formatVersion:VERSION,id:'relationships-'+mode,mode,revision:0,...Object.fromEntries(collections.map(k=>[k,[]])),settings:{startDate:'2026-11-03',weeklyHours:4.5,timeZone:'Africa/Cairo',activePhase:'ux'},history:[]};
}
export function validateDocument(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('FORMAT');
 const d=clone(input);if(new TextEncoder().encode(JSON.stringify(d)).length>750000)fail('TOO_LARGE');
 const allowed=['kind','formatVersion','id','mode','revision',...collections,'settings','history'];if(Object.keys(d).some(k=>!allowed.includes(k)))fail('UNKNOWN_FIELD');
 if(d.kind!=='nawah-strategic-relationships'||d.formatVersion!==VERSION||!['personal','training'].includes(d.mode)||!Number.isSafeInteger(d.revision)||d.revision<0)fail('FORMAT');
 assertText(d.id,150,true);
 const all=new Set(['self']);
 for(const key of collections){if(!Array.isArray(d[key])||d[key].length>1500)fail('FORMAT');for(const r of d[key]){if(!r||typeof r!=='object'||Array.isArray(r))fail('FORMAT');assertText(r.id,150,true);if(!/^[a-zA-Z0-9_-]+$/.test(r.id)||all.has(r.id))fail('IDENTIFIER');all.add(r.id);}}
 if(!d.settings||d.settings.timeZone!=='Africa/Cairo'||typeof d.settings.weeklyHours!=='number'||d.settings.weeklyHours<1||d.settings.weeklyHours>12)fail('SETTINGS');dateValue(d.settings.startDate);
 const people=idsOf(d.people),orgs=idsOf(d.organizations),goals=idsOf(d.goals),events=idsOf(d.events),collabs=idsOf(d.collaborations),entities=new Set(['self',...people,...orgs,...events,...collabs]);
 for(const p of d.people){
  assertText(p.name,200,true);strings(p.aliases);strings(p.resources);strings(p.purposes);assertText(p.role,200);assertText(p.market,150);assertText(p.domain,150);assertText(p.context,8000);assertText(p.offer,3000);assertText(p.notes,8000);url(p.sourceUrl);dateValue(p.recordedAt);
  if(!['research','known','met','active','paused'].includes(p.stage))fail('STAGE');ref(p.organizationId,orgs);if(p.reviewDate)dateValue(p.reviewDate);
  if(!Array.isArray(p.channels)||p.channels.length>20||!Array.isArray(p.goalLinks)||p.goalLinks.length>50)fail('FORMAT');
  if(p.triggerPhase!=null)assertText(p.triggerPhase,100);if(p.triggerReason!=null)assertText(p.triggerReason,1000);
  for(const c of p.channels){assertText(c.value,1000,true);if(!['phone','email','url','other'].includes(c.type))fail('CHANNEL');if(c.type==='url')url(c.value);}
  for(const g of p.goalLinks){ref(g.goalId,goals,false);assertText(g.resource,300,true);if(!['potential','verified'].includes(g.status))fail('STATUS');assertText(g.evidence,3000,g.status==='verified');}
 }
 for(const o of d.organizations){assertText(o.name,200,true);assertText(o.description,5000);strings(o.resources);url(o.url);}
 for(const g of d.goals){assertText(g.title,200,true);assertText(g.description,5000);assertText(g.beneficiaries,3000);assertText(g.questions,5000);strings(g.needs,20);if(!['personal','nawah','collaboration'].includes(g.level))fail('LEVEL');if(g.reviewDate)dateValue(g.reviewDate);}
 for(const f of d.facts){
  ref(f.from,entities,false);ref(f.to,entities,false);if(f.from===f.to||!RELATIONS[f.kind])fail('RELATION');if(!['present','absent','unknown','proposed'].includes(f.state)||!['observed','reported','interpretation','unverified'].includes(f.sourceKind))fail('FACT');assertText(f.evidence,5000,['present','absent'].includes(f.state));dateValue(f.date);url(f.sourceUrl);
  if(['knows','collaborates','advice','introduced'].includes(f.kind)&&(!new Set(['self',...people]).has(f.from)||!new Set(['self',...people]).has(f.to)))fail('RELATION_TYPE');
  if(f.kind==='attended'&&(!people.has(f.from)||!events.has(f.to)))fail('RELATION_TYPE');
  if(f.kind==='affiliated'&&(!people.has(f.from)||!orgs.has(f.to)))fail('RELATION_TYPE');
 }
 for(const i of d.interactions){assertText(i.title,200,true);assertText(i.summary,8000);assertText(i.questions,5000);assertText(i.nextStep,3000);dateValue(i.date);strings(i.personIds,30);i.personIds.forEach(x=>ref(x,people,false));ref(i.eventId,events);ref(i.collaborationId,collabs);if(!['message','call','meeting','help','introduction'].includes(i.type))fail('FORMAT');url(i.sourceUrl);if(i.type==='introduction'&&new Set(i.personIds).size!==2)fail('INTRO_PARTICIPANTS');if(i.type==='introduction'&&(!['not-requested','requested','agreed','declined'].includes(i.consentA)||!['not-requested','requested','agreed','declined'].includes(i.consentB)))fail('CONSENT');if(i.type==='introduction'&&i.introductionMade&&(i.consentA!=='agreed'||i.consentB!=='agreed'))fail('INTRO_CONSENT');}
 for(const c of d.commitments){assertText(c.title,200,true);assertText(c.notes,5000);ref(c.personId,people);ref(c.goalId,goals);ref(c.collaborationId,collabs);dateValue(c.due);if(!['mine','theirs'].includes(c.direction)||!['open','done','renegotiated','cancelled'].includes(c.status)||!Number.isFinite(c.hours)||c.hours<0||c.hours>100)fail('COMMITMENT');if(c.completedAt)dateValue(c.completedAt);}
 for(const e of d.events){assertText(e.title,200,true);dateValue(e.date);assertText(e.purpose,5000);assertText(e.questions,5000);assertText(e.takeaways,8000);strings(e.personIds,100);e.personIds.forEach(x=>ref(x,people,false));url(e.url);if(!['research','planned','attended','cancelled'].includes(e.status))fail('STATUS');}
 for(const c of d.collaborations){assertText(c.title,200,true);strings(c.personIds,30);c.personIds.forEach(x=>ref(x,people,false));if(!['simulation','real'].includes(c.context)||!['exploring','draft','active','review','closed'].includes(c.status))fail('FORMAT');for(const k of ['goal','alternatives','fit','contributions','roles','decisions','boundaries','evaluation','exit','coordination'])assertText(c[k],8000);if(c.reviewDate)dateValue(c.reviewDate);if(c.status==='active'&&(!c.goal.trim()||!c.roles.trim()||!c.contributions.trim()))fail('CHARTER_REQUIRED');}
 for(const r of d.reviews){assertText(r.title,200,true);ref(r.subjectId,entities);dateValue(r.date);if(!['self','reported'].includes(r.perspective))fail('PERSPECTIVE');for(const k of ['observations','interpretation','alternatives','decision','limits'])assertText(r[k],8000);if(r.perspective==='reported'&&!r.observations.trim())fail('EVIDENCE_REQUIRED');if(r.nextDate)dateValue(r.nextDate);}
 for(const a of d.analyses){assertText(a.question,200,true);assertText(a.decision,6000);assertText(a.limitations,6000);dateValue(a.date);if(!a.snapshot||typeof a.snapshot!=='object')fail('FORMAT');for(const k of ['people','pairs','known','unknown'])if(!Number.isSafeInteger(a.snapshot[k])||a.snapshot[k]<0||a.snapshot[k]>3540)fail('SNAPSHOT');for(const k of ['coverage','density'])if(a.snapshot[k]!==null&&(typeof a.snapshot[k]!=='number'||!Number.isFinite(a.snapshot[k])||a.snapshot[k]<0||a.snapshot[k]>1))fail('SNAPSHOT');if(a.snapshot.coverage!==1&&a.snapshot.density!==null)fail('INCOMPLETE_METRICS');}
 for(const e of d.learningEvidence){if(!/^lesson-[1-8]-[12]$/.test(e.lessonId))fail('LESSON');dateValue(e.date);if(!['simulation','real'].includes(e.context)||!['draft','applied','reviewed','transferred','taught'].includes(e.level))fail('FORMAT');for(const k of ['answer','outcome','limitations','next'])assertText(e[k],12000);url(e.url);if(e.level!=='draft'&&(e.answer.trim().length<30||!e.limitations.trim()))fail('EVIDENCE_REQUIRED');if(['transferred','taught'].includes(e.level)&&!e.outcome.trim())fail('TRANSFER_EVIDENCE');}
 if(!Array.isArray(d.history)||d.history.length>500)fail('FORMAT');for(const h of d.history){assertText(h.kind,100,true);if(!Number.isFinite(Date.parse(h.at)))fail('DATE');}
 return d;
}
export function searchPeople(d,query){const q=normalize(query);return d.people.filter(p=>!q||normalize([p.name,...p.aliases,p.role,p.market,p.domain,p.context,p.offer,p.notes,...p.purposes,...p.resources,...p.channels.map(c=>c.value)].join(' ')).includes(q));}
const comparableChannel=c=>c.type==='phone'?c.value.replace(/[^\d+]/g,''):normalize(c.value).replace(/\/$/,'');
export function duplicates(d,p,except=''){const channels=p.channels.map(comparableChannel);return d.people.filter(x=>x.id!==except&&(normalize(x.name)===normalize(p.name)||x.channels.some(c=>channels.includes(comparableChannel(c)))));}
export function mergePeople(d,keepId,removeId){
 if(keepId===removeId)fail('MERGE');const keep=d.people.find(p=>p.id===keepId),remove=d.people.find(p=>p.id===removeId);if(!keep||!remove)fail('REFERENCE');
 keep.aliases=[...new Set([...keep.aliases,remove.name,...remove.aliases])];keep.resources=[...new Set([...keep.resources,...remove.resources])];keep.purposes=[...new Set([...keep.purposes,...remove.purposes])];
 keep.channels=[...keep.channels,...remove.channels.filter(c=>!keep.channels.some(k=>k.type===c.type&&comparableChannel(k)===comparableChannel(c)))];
 keep.goalLinks=[...keep.goalLinks,...remove.goalLinks];keep.context=[keep.context,remove.context].filter(Boolean).join('\n—\n');keep.notes=[keep.notes,remove.notes].filter(Boolean).join('\n—\n');
 keep.mergedRecords=[...(keep.mergedRecords||[]),clone(remove)];
 for(const f of d.facts){if(f.from===removeId)f.from=keepId;if(f.to===removeId)f.to=keepId;}d.facts=d.facts.filter(f=>f.from!==f.to);
 for(const c of d.commitments)if(c.personId===removeId)c.personId=keepId;
 for(const r of d.reviews)if(r.subjectId===removeId)r.subjectId=keepId;
 for(const key of ['interactions','events','collaborations'])for(const row of d[key])row.personIds=[...new Set(row.personIds.map(x=>x===removeId?keepId:x))];
 d.people=d.people.filter(p=>p.id!==removeId);return validateDocument(d);
}
export function attention(d,at=today()){
 const items=[];
 for(const c of d.commitments.filter(c=>c.status==='open'))items.push({kind:c.direction==='mine'?'promise':'waiting',date:c.due,id:c.id,personId:c.personId,title:c.title,urgent:c.due<at});
 for(const p of d.people.filter(p=>!p.archived&&p.reviewDate&&p.reviewDate<=addDays(at,7)))items.push({kind:'relationship',date:p.reviewDate,id:p.id,personId:p.id,title:p.name,urgent:p.reviewDate<at});
 for(const p of d.people.filter(p=>!p.archived&&p.triggerPhase&&p.triggerPhase===d.settings.activePhase))items.push({kind:'phase',date:at,id:p.id,personId:p.id,title:p.name,urgent:false});
 for(const e of d.events.filter(e=>e.status==='planned'&&e.date>=at&&e.date<=addDays(at,14)))items.push({kind:'event',date:e.date,id:e.id,title:e.title,urgent:false});
 for(const c of d.collaborations.filter(c=>c.reviewDate&&c.status!=='closed'&&c.reviewDate<=addDays(at,7)))items.push({kind:'collaboration',date:c.reviewDate,id:c.id,title:c.title,urgent:c.reviewDate<at});
 return items.sort((a,b)=>a.date.localeCompare(b.date));
}
export function coverage(d){return d.goals.filter(g=>!g.archived).flatMap(g=>g.needs.map(resource=>{const candidates=d.people.filter(p=>!p.archived).flatMap(p=>{const links=p.goalLinks.filter(l=>l.goalId===g.id&&normalize(l.resource)===normalize(resource));const link=links.find(l=>l.status==='verified')||links[0];return link?[{person:p,link}]:[];});const verified=candidates.filter(c=>c.link.status==='verified');return {goal:g,resource,candidates,verified,singleSource:verified.length===1};}));}
export const reciprocityBoundary=(d,start,end)=>{const due=d.commitments.filter(c=>c.direction==='mine'&&c.due>=start&&c.due<=end&&!['cancelled','renegotiated'].includes(c.status));return {due:due.length,completed:due.filter(c=>c.status==='done').length,hours:d.commitments.filter(c=>c.status==='open'&&c.direction==='mine'&&c.due>=start&&c.due<=end).reduce((n,c)=>n+c.hours,0)};};

export function network(d,{personIds=d.people.map(p=>p.id),kind='knows',from='',to='9999-12-31'}={}){
 const definition=RELATIONS[kind];if(!definition||['attended','affiliated'].includes(kind))fail('NETWORK_TYPE');
 const nodes=d.people.filter(p=>personIds.includes(p.id));if(nodes.length>60)fail('NETWORK_LIMIT');
 const directed=definition.directed,pairs=[];let present=0,absent=0,unknown=0;
 const allowed=new Set(nodes.map(n=>n.id));
 const actual=d.facts.filter(f=>f.kind===kind&&allowed.has(f.from)&&allowed.has(f.to)&&f.date>=from&&f.date<=to);
 for(let i=0;i<nodes.length;i++)for(let j=0;j<nodes.length;j++){
  if(i===j||(!directed&&j<i))continue;const a=nodes[i].id,b=nodes[j].id;
  const facts=actual.filter(f=>f.from===a&&f.to===b||!directed&&f.from===b&&f.to===a).sort((x,y)=>y.date.localeCompare(x.date));
  const latest=facts[0],same=facts.filter(f=>f.date===latest?.date),credible=same.filter(f=>['observed','reported'].includes(f.sourceKind)&&['present','absent'].includes(f.state));
  const states=new Set(credible.map(f=>f.state));const conflict=states.size>1||same.some(f=>['observed','reported'].includes(f.sourceKind)&&f.state==='unknown');
  const state=conflict?'unknown':credible[0]?.state||'unknown';if(state==='present')present++;else if(state==='absent')absent++;else unknown++;
  pairs.push({from:a,to:b,state,conflict,facts:same,proposed:same.some(f=>f.state==='proposed')});
 }
 const possible=pairs.length,complete=possible>0&&unknown===0;
 const result={nodes,pairs,directed,kind,present,absent,unknown,possible,complete,known:present+absent,coverage:possible?(present+absent)/possible:null,density:null,centrality:[],components:[]};
 const edges=pairs.filter(p=>p.state==='present'),adj=new Map(nodes.map(n=>[n.id,[]]));for(const e of edges){adj.get(e.from).push(e.to);if(!directed)adj.get(e.to).push(e.from);}
 // Components describe observed undirected connectivity only, never real-world absence.
 const seen=new Set();for(const n of nodes){if(seen.has(n.id))continue;const component=[],queue=[n.id];seen.add(n.id);while(queue.length){const a=queue.shift();component.push(a);for(const e of edges){const b=e.from===a?e.to:e.to===a?e.from:null;if(b&&!seen.has(b)){seen.add(b);queue.push(b);}}}result.components.push(component);}
 if(!complete)return result;
 result.density=present/possible;
 const between=new Map(nodes.map(n=>[n.id,0]));
 for(const s of nodes.map(n=>n.id)){
  const stack=[],pred=new Map(nodes.map(n=>[n.id,[]])),sigma=new Map(nodes.map(n=>[n.id,0])),dist=new Map(nodes.map(n=>[n.id,-1]));sigma.set(s,1);dist.set(s,0);const queue=[s];
  while(queue.length){const v=queue.shift();stack.push(v);for(const w of adj.get(v)){if(dist.get(w)<0){dist.set(w,dist.get(v)+1);queue.push(w);}if(dist.get(w)===dist.get(v)+1){sigma.set(w,sigma.get(w)+sigma.get(v));pred.get(w).push(v);}}}
  const delta=new Map(nodes.map(n=>[n.id,0]));while(stack.length){const w=stack.pop();for(const v of pred.get(w))delta.set(v,delta.get(v)+(sigma.get(v)/sigma.get(w))*(1+delta.get(w)));if(w!==s)between.set(w,between.get(w)+delta.get(w));}
 }
 result.centrality=nodes.map(n=>{const incoming=edges.filter(e=>e.to===n.id||!directed&&e.from===n.id).length;return {id:n.id,outDegree:adj.get(n.id).length,inDegree:incoming,degree:adj.get(n.id).length/(nodes.length-1),betweenness:(between.get(n.id)/(directed?1:2))/((nodes.length-1)*(nodes.length-2)/(directed?1:2)||1)};});
 return result;
}
