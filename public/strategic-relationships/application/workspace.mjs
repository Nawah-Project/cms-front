import {blank,validateDocument,clone,id,DomainError,mergePeople} from '../domain/model.mjs';
import {record} from '../domain/records.mjs';
export class Workspace{
 constructor(repository,initial){this.repository=repository;this.initial=initial;this.document=null;this.pending=null;}
 async open(){const found=await this.repository.read();if(found){this.document=found;return found;}if(this.repository.canWrite===false){this.document=clone(this.initial);return this.document;}const seed=clone(this.initial);seed.revision=0;this.document=await this.repository.save(seed,-1,id('bootstrap'));return this.document;}
 async change(kind,mutate){
  if(this.repository.canWrite===false)throw new DomainError('READ_ONLY');if(this.pending)throw new DomainError('PENDING');
  const next=clone(this.document);mutate(next);next.history.push({kind,at:new Date().toISOString()});next.history=next.history.slice(-500);validateDocument(next);
  this.pending={next,expectedRevision:this.document.revision,requestId:id('attempt')};return this.retry();
 }
 async retry(){if(!this.pending)return this.document;const p=this.pending;const saved=await this.repository.save(p.next,p.expectedRevision,p.requestId);this.document=saved;this.pending=null;return saved;}
 async reload(){const next=await this.repository.read();if(!next)throw new DomainError('STORAGE_READ');this.document=next;this.pending=null;return next;}
 async upsert(key,row){return this.change('save-'+key,d=>{const index=d[key].findIndex(x=>x.id===row.id);if(index<0)d[key].push(clone(row));else d[key][index]=clone(row);});}
 async merge(keepId,removeId){return this.change('merge-people',d=>Object.assign(d,mergePeople(d,keepId,removeId)));}
 async import(value){const incoming=validateDocument(value);if(incoming.mode!==this.document.mode)throw new DomainError('MODE');return this.change('explicit-import',d=>{const revision=d.revision;Object.assign(d,clone(incoming));d.revision=revision;});}
 async archive(personId){return this.change('archive-person',d=>{const p=d.people.find(x=>x.id===personId);if(!p)throw new DomainError('REFERENCE');p.archived=true;});}
 async finishCommitment(commitmentId,date){return this.change('finish-commitment',d=>{const c=d.commitments.find(x=>x.id===commitmentId);if(!c)throw new DomainError('REFERENCE');c.status='done';c.completedAt=date;});}
 make(kind,values){return record(kind,values);}
 draft(){return this.pending?clone(this.pending.next):null;}
}
