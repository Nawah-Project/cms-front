import {id,today} from './model.mjs';
export function record(kind,values={}){
 const defaults={
  people:{name:'',aliases:[],role:'',market:'',domain:'',context:'',offer:'',notes:'',resources:[],purposes:[],channels:[],goalLinks:[],stage:'research',organizationId:'',sourceUrl:'',recordedAt:today(),reviewDate:'',triggerPhase:'',triggerReason:'',archived:false},
  organizations:{name:'',description:'',resources:[],url:'',archived:false},
  goals:{title:'',description:'',beneficiaries:'',questions:'',needs:[],level:'personal',reviewDate:'',archived:false},
  facts:{from:'',to:'',kind:'knows',state:'unknown',sourceKind:'unverified',evidence:'',date:today(),sourceUrl:''},
  interactions:{title:'',date:today(),personIds:[],eventId:'',collaborationId:'',type:'meeting',summary:'',questions:'',nextStep:'',sourceUrl:'',consentA:'not-requested',consentB:'not-requested',introductionMade:false},
  commitments:{title:'',due:today(),personId:'',goalId:'',collaborationId:'',direction:'mine',status:'open',hours:.5,notes:'',completedAt:''},
  events:{title:'',date:today(),purpose:'',questions:'',takeaways:'',personIds:[],url:'',status:'planned'},
  collaborations:{title:'',personIds:[],context:'simulation',status:'draft',goal:'',alternatives:'',fit:'',contributions:'',roles:'',decisions:'',boundaries:'',evaluation:'',exit:'',coordination:'',reviewDate:''},
  reviews:{title:'',subjectId:'',date:today(),perspective:'self',observations:'',interpretation:'',alternatives:'',decision:'',limits:'',nextDate:''},
  analyses:{question:'',date:today(),decision:'',limitations:'',snapshot:{}},
  learningEvidence:{lessonId:'',date:today(),context:'simulation',level:'draft',answer:'',outcome:'',limitations:'',next:'',url:''},
 };
 if(!defaults[kind])throw Error('Unknown record');return {...defaults[kind],id:id(kind.slice(0,3)),...values};
}
