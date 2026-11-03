// Explicit file-based preview integration. No account, database, API or production writes.
import {validateDocument as validateFounder,rangeLoad,copy} from './founder-contract.mjs';
import {cycles} from '../domain/library.mjs';
import {DomainError} from '../domain/model.mjs';
export function planningProposal(input,start='2026-11-03',mapping={}){
 const before=validateFounder(copy(input)),next=copy(before),program=cycles(start),missing=[],added=[];
 const laneId=next.lanes.some(l=>l.id==='relationships')?'relationships':'relationships';
 if(!next.lanes.some(l=>l.id===laneId))next.lanes.push({id:laneId,labelAr:'العلاقات الاستراتيجية',labelEn:'Strategic relationships',color:'#5d7e72'});
 const practiceId='practice-strategic-relationships';
 if(!next.practices.some(p=>p.id===practiceId))next.practices.push({id:practiceId,titleAr:'إدارة علاقات وتحليلها بحدود واضحة',titleEn:'Manage relationships and interpret evidence',level:'assisted',verified:false,evidenceIds:[],gap:'',reviewDate:''});
 const blocks=[['reading','قراءة وفهم الأداة','Read & understand','learning',3.21,0,6],['practice','تطبيق على موقف مناسب','Apply to a suitable context','execution',4.29,3,12],['review','مراجعة الأدلة وشرح الممارسة','Review evidence & explain','review',2.14,12,14]];
 for(const c of program){
  const mapped=mapping[c.id],target=mapped?next.cycles.find(x=>x.id===mapped):next.cycles.find(x=>x.start===c.start&&x.end===c.end);
  if(!target){missing.push(c);continue;}
  for(const [kind,ar,en,type,hours,offset,endOffset] of blocks){
   const taskId=`relationships-course-${c.number}-${kind}`;if(next.tasks.some(t=>t.id===taskId))continue;
   const date=offset=>new Date(Date.parse(c.start+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
   const task={id:taskId,cycleId:target.id,laneId,practiceId,title:`${c.number}. ${ar} — ${c.title.ar}`,titleEn:`${c.number}. ${en} — ${c.title.en}`,notes:'محتوى التمرين والأشخاص وأدلته الخاصة يظل في قسم العلاقات. هذه المهمة تملك موعد التنفيذ والجهد فقط.',notesEn:'Private relationship context and exercise evidence remain in that domain. This task owns scheduling and effort only.',deliverable:c.outcome.ar,deliverableEn:c.outcome.en,status:'planned',kind:type,start:date(offset),end:date(endOffset),hours,actualHours:0,deadline:'',dependsOn:'',blocker:'',archived:false,resourceUrl:''};next.tasks.push(task);added.push(task);
  }
 }
 if(missing.length)return {before,document:null,missing,added,program};
 validateFounder(next);
 return {before,document:next,missing:[],added,program,beforeLoad:rangeLoad(before,program[0].start,program.at(-1).end),afterLoad:rangeLoad(next,program[0].start,program.at(-1).end)};
}
