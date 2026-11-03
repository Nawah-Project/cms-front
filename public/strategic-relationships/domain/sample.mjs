import {blank,validateDocument,addDays} from './model.mjs';
import {record} from './records.mjs';
export function training(){
 const d=blank('training');
 d.organizations=[record('organizations',{id:'org-studio',name:'استوديو تعلّم — جهة تدريبية',description:'جهة مؤلفة بالكامل لتجربة الوظائف.',resources:['تدريب'],url:'https://example.com/training'}),record('organizations',{id:'org-fund',name:'صندوق تجريبي — ليس جهة فعلية',description:'مثال مؤلف للتحضير لمحادثة استكشافية.',resources:['فهم التمويل'],url:'https://example.com/fund'})];
 d.goals=[record('goals',{id:'goal-frontend',title:'فهم تجربة تدريب Frontend',description:'تجربة هدف مؤلف مرتبط بتطوير نواة.',beneficiaries:'متعلمون ومدربون وشركات',questions:'هل نعرف مواضع التعثر الفعلية؟',needs:['خبرة متعلم','تصميم تدريب','مراجعة Frontend'],level:'nawah',reviewDate:'2026-11-17'}),record('goals',{id:'goal-market',title:'فهم فرص السوق السعودي',description:'أسئلة تحتاج مصادر متنوعة وحديثة، وليست استنتاجات عن السوق.',needs:['منظور السوق','فهم التمويل'],beneficiaries:'المؤسس والمستفيدون',questions:'ما الذي نعرفه وما الذي يحتاج تحققًا؟',level:'nawah',reviewDate:'2026-12-02'}),record('goals',{id:'goal-life',title:'دائرة خبرات للحياة والعمل',description:'الحفاظ على سياق معرفة خبراء يمكن استشارتهم عند احتياج مناسب.',needs:['خبرة قانونية'],beneficiaries:'احتياجات شخصية',questions:'ما نوع الخبرة الذي أعرفه فعلًا؟',level:'personal'})];
 const people=[
 ['person-adam','آدم — شخص تدريبي','Frontend','مصر','متعلم','ناقشنا مشروع React في مجتمع تعلّم تجريبي.','مراجعة صفحة صغيرة في حدود نصف ساعة.',['مراجعة Frontend','خبرة متعلم'],['تعلّم متبادل','إرشاد محتمل'],'known','org-studio'],
 ['person-layla','ليلى — شخص تدريبي','تعليم','مصر','مدربة','ناقشنا صعوبة تقييم تطبيق المتعلمين، دون اتفاق على تعاون.','مشاركة أسئلة عن التمرين الحالي.',['تصميم تدريب'],['تبادل خبرة','تعاون محتمل'],'met','org-studio'],
 ['person-salem','سالم — شخص تدريبي','بزنس','السعودية','ممارس سوق','حديث استكشافي مؤلف؛ ليس بحث سوق فعليًا.','مشاركة ما تعلمناه عن تجربة الاستخدام.',['منظور السوق'],['فهم السوق'],'active',''],
 ['person-mariam','مريم — شخص تدريبي','تمويل','السعودية','مستثمرة في المثال','شخصية مؤلفة نبحث عن ملاءمة الحديث معها؛ لم يتم لقاء حقيقي.','سؤال عن نوع الأدلة المفيدة في هذه المرحلة.',['فهم التمويل'],['تعلّم','تعارف محتمل'],'research','org-fund'],
 ['person-omar','عمر — شخص تدريبي','Backend','مصر','مطور','تبادل تقني سابق في مثال تدريبي.','نقاش حول فصل المجالات.',['Backend'],['تبادل خبرة'],'known',''],
 ['person-noor','نور — شخص تدريبي','UX','مصر','مصممة','زميلة في مجتمع مؤلف حول البحث والتصميم.','مراجعة سؤال بحث.',['بحث UX'],['زمالة'],'known',''],
 ['person-karim','كريم — شخص تدريبي','قانون','مصر','محامٍ في المثال','معرفة شخصية مؤلفة؛ لا توجد مسألة قانونية أو استشارة فعلية.','الحفاظ على المعرفة باحترام التخصص والوقت.',['خبرة قانونية'],['حياة شخصية'],'known',''],
 ['person-hana','هنا — شخص تدريبي','محتوى','الخليج','صانعة محتوى','ناقشنا محتوى تعليميًا بشكل افتراضي.','مشاركة مورد مناسب.',['محتوى تعليمي'],['تبادل خبرة'],'met',''],
 ];
 d.people=people.map(([id,name,domain,market,role,context,offer,resources,purposes,stage,organizationId])=>record('people',{id,name,domain,market,role,context,offer,resources,purposes,stage,organizationId,recordedAt:'2026-11-01',sourceUrl:'https://example.com/fiction',channels:[{type:'url',value:'https://example.com/'+id}],reviewDate:id==='person-adam'?'2026-11-03':''}));
 d.people[0].goalLinks=[{goalId:'goal-frontend',resource:'خبرة متعلم',status:'verified',evidence:'في المثال: ناقشنا تجربة متعلم محددة.'},{goalId:'goal-frontend',resource:'مراجعة Frontend',status:'potential',evidence:'نحتاج معرفة قدرته ووقته المناسب.'}];
 d.people[0].triggerPhase='frontend';d.people[0].triggerReason='عند بداية التركيز على Frontend أراجع ملاءمة تبادل تجربة أو إرشاد محدود.';
 d.people[1].goalLinks=[{goalId:'goal-frontend',resource:'تصميم تدريب',status:'potential',evidence:'المجال مناسب لكن لم نتفق على عمل.'}];
 d.people[2].goalLinks=[{goalId:'goal-market',resource:'منظور السوق',status:'verified',evidence:'منظور واحد مؤلف، لا يمثل السوق كله.'}];
 d.people[3].goalLinks=[{goalId:'goal-market',resource:'فهم التمويل',status:'potential',evidence:'شخصية بحثية في المثال فقط.'}];
 d.people[6].goalLinks=[{goalId:'goal-life',resource:'خبرة قانونية',status:'potential',evidence:'التخصص يحتاج تحققًا عند وجود احتياج.'}];
 d.events=[record('events',{id:'event-lab',title:'ملتقى تجريبي — ليس حدثًا فعليًا',date:'2026-11-06',purpose:'فهم فرص التعاون والتعلم، دون طلب استثمار مفترض.',questions:'ما النتائج التي يهتم بها الأطراف؟\nما الدليل المفيد لهم؟',personIds:['person-adam','person-layla','person-mariam'],url:'https://example.com/event'})];
 d.events.push(record('events',{id:'event-past',title:'لقاء مجتمع سابق — مثال مؤلف',date:'2026-11-01',status:'attended',purpose:'مثال لتوضيح أن حضور الحدث لا يثبت معرفة المشاركين ببعضهم.',personIds:['person-adam','person-mariam'],url:'https://example.com/past-event'}));
 d.facts=[['person-adam','person-layla','knows','present'],['person-adam','person-omar','knows','present'],['person-layla','person-noor','knows','present'],['person-salem','person-hana','knows','present'],['person-omar','person-noor','knows','absent']].map(([from,to,kind,state],i)=>record('facts',{id:'fact-'+i,from,to,kind,state,sourceKind:'observed',date:'2026-11-01',evidence:'واقعة مؤلفة داخل المثال التدريبي فقط.'}));
 // Co-attendance is a different type. It never becomes a knows tie.
 d.facts.push(record('facts',{id:'fact-attended-a',from:'person-adam',to:'event-past',kind:'attended',state:'present',sourceKind:'observed',date:'2026-11-01',evidence:'حضور افتراضي للتدريب على فصل أنواع العلاقات.'}),record('facts',{id:'fact-attended-b',from:'person-mariam',to:'event-past',kind:'attended',state:'present',sourceKind:'observed',date:'2026-11-01',evidence:'الحضور لا يثبت معرفة بين الأشخاص.'}));
 d.interactions=[record('interactions',{id:'int-chat',title:'محادثة عن صعوبة مراجعة التمرين',date:'2026-11-01',personIds:['person-adam'],summary:'في المثال، نحتاج فهم سبب تعثر المتعلم قبل اقتراح الحل.',questions:'أين تعثرت؟ وما الذي جرّبته؟',nextStep:'مشاركة مورد صغير ثم سؤال عن فائدته.'})];
 d.commitments=[record('commitments',{id:'commit-own',title:'إرسال مورد وعدت به في المثال',due:'2026-11-02',personId:'person-adam',direction:'mine',hours:.5,notes:'وعد تدريبي؛ لا إرسال فعلي من هذه المساحة.'}),record('commitments',{id:'commit-wait',title:'انتظار توضيح مناسب للموعد',due:'2026-11-04',personId:'person-layla',direction:'theirs',hours:0}),record('commitments',{id:'commit-done',title:'مشاركة ملخص سؤال — منجز في المثال',due:'2026-11-01',personId:'person-salem',direction:'mine',status:'done',hours:.25,completedAt:'2026-11-01'})];
 d.collaborations=[record('collaborations',{id:'collab-workshop',title:'ورشة صغيرة — تصميم تدريبي',personIds:['person-adam','person-layla'],goal:'فهم فائدة تمرين صغير في ورشة تجريبية.',alternatives:'الإنجاز الفردي أو شراء مراجعة أو التعاون.',fit:'نحتاج دليلًا على التكامل والقدرة والتوقيت.',context:'simulation',status:'draft',reviewDate:'2027-02-15'})];
 return validateDocument(d);
}
export function completeTrainingNetwork(){
 const d=training(),nodes=d.people.slice(0,6),edges=new Set(['0-1','0-2','1-2','2-3','3-4','3-5','4-5']);d.people=nodes;d.people.forEach(p=>{p.goalLinks=[];p.organizationId='';});
 d.organizations=[];d.goals=[];d.events=[];d.interactions=[];d.commitments=[];d.collaborations=[];d.facts=[];
 for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++)d.facts.push(record('facts',{id:`example-${a}-${b}`,from:nodes[a].id,to:nodes[b].id,kind:'knows',state:edges.has(a+'-'+b)?'present':'absent',sourceKind:'observed',date:'2026-11-01',evidence:'مصوفة تدريبية مكتملة مؤلفة لتفسير المؤشرات؛ لا تمثل أشخاصًا حقيقيين.'}));
 return validateDocument(d);
}
