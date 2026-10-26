import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../features/auth/store/authStore";
import { useI18n } from "../i18n";
import { useDialogFocus } from "./ui/useDialogFocus";
import { placeTourCard, readTourViewport, type TourViewport } from "../features/applications/components/tour-layout";

const SEEN_EVENT = "nawah:feature-tour-seen";
export function featureTourKey(userId: string, feature: string) { return `nawah_feature_tour_${userId}_${feature}`; }
export function markFeatureTourSeen(userId: string | undefined, feature: string) {
  if (!userId) return;
  try { localStorage.setItem(featureTourKey(userId,feature),"true"); } catch { /* The current page can still dismiss the hint. */ }
  window.dispatchEvent(new Event(SEEN_EVENT));
}
export interface FeatureTourStep { selector: string; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; finishOnTargetClick?: boolean }

export function FeatureTour({feature,enabled,steps,onFinish,finishAr="تمام، كمّل",finishEn="Got it"}:{feature:string;enabled:boolean;steps:FeatureTourStep[];onFinish?:(skipped:boolean,fromTarget?:boolean)=>void;finishAr?:string;finishEn?:string}) {
  const {user}=useAuth();const {locale}=useI18n();const ar=locale==="ar";
  const [seen,setSeen]=useState(true),[index,setIndex]=useState(0),[rect,setRect]=useState<DOMRect|null>(null),[viewport,setViewport]=useState<TourViewport|null>(null),[paused,setPaused]=useState(false),[height,setHeight]=useState(210);
  const card=useRef<HTMLDivElement>(null);const target=useRef<HTMLElement|null>(null);const title=useId(),body=useId();
  const active=enabled&&!seen&&user?.role!=="ADMIN";
  const finish=(skipped=false,fromTarget=false)=>{setSeen(true);markFeatureTourSeen(user?.id,feature);onFinish?.(skipped,fromTarget);};
  useEffect(()=>{const read=()=>{try{setSeen(!user?.id||localStorage.getItem(featureTourKey(user.id,feature))==="true");}catch{setSeen(true);}};read();setIndex(0);window.addEventListener(SEEN_EVENT,read);return()=>window.removeEventListener(SEEN_EVENT,read);},[user?.id,feature]);
  useEffect(()=>{
    if(!active||!steps[index])return;
    let frame=0,aligned:HTMLElement|null=null;
    const track=()=>{
      const element=[...document.querySelectorAll<HTMLElement>(steps[index].selector)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;})??null;
      target.current=element;
      if(element){
        const dialogs=[...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(el=>!el.hasAttribute('data-feature-tour')&&el.getBoundingClientRect().height>0);
        const last=dialogs.at(-1);const blocked=Boolean(last&&!last.contains(element));setPaused(blocked);
        if(!blocked&&aligned!==element){element.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});aligned=element;}
        const next=element.getBoundingClientRect();setRect(old=>old&&Math.abs(old.top-next.top)<0.5&&Math.abs(old.left-next.left)<0.5&&old.width===next.width&&old.height===next.height?old:next);
      }else setRect(null);
      const next=readTourViewport();setViewport(old=>old&&old.width===next.width&&old.height===next.height&&old.top===next.top&&old.left===next.left?old:next);
      frame=requestAnimationFrame(track);
    };
    frame=requestAnimationFrame(track);return()=>cancelAnimationFrame(frame);
  },[active,index,steps]);
  const visible=Boolean(active&&rect&&viewport&&!paused);
  useDialogFocus(card,visible,()=>finish(true));
  useEffect(()=>{if(!visible||!card.current)return;const node=card.current;const observer=new ResizeObserver(()=>setHeight(node.getBoundingClientRect().height));observer.observe(node);return()=>observer.disconnect();},[visible,index]);
  useEffect(()=>{if(!active||!steps[index]?.finishOnTargetClick)return;const click=(event:MouseEvent)=>{if(target.current?.contains(event.target as Node))finish(false,true);};document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);},[active,index,steps]);
  if(!visible||!rect||!viewport||!steps[index])return null;
  const left=Math.max(viewport.left+2,rect.left-3),top=Math.max(viewport.top+2,rect.top-3),right=Math.min(viewport.left+viewport.width-2,rect.right+3);
  const bottom=Math.min(viewport.top+viewport.height-2,rect.bottom+3,top+viewport.height*0.42);
  const focus={left,top,right,bottom,width:right-left,height:Math.max(1,bottom-top)};
  const placement=placeTourCard(focus,viewport,height);
  const step=steps[index];
  const block=(event:React.MouseEvent)=>event.stopPropagation();
  return createPortal(<div className="pointer-events-none fixed inset-0 z-[10030]" data-feature-tour-overlay={feature}>
    <div className="pointer-events-auto fixed" style={{top:0,left:0,right:0,height:top}} onClick={block}/><div className="pointer-events-auto fixed" style={{top:bottom,left:0,right:0,bottom:0}} onClick={block}/><div className="pointer-events-auto fixed" style={{top,left:0,width:left,height:focus.height}} onClick={block}/><div className="pointer-events-auto fixed" style={{top,left:right,right:0,height:focus.height}} onClick={block}/>
    <div className="fixed rounded-xl border-2 border-emerald-300 ring-4 ring-emerald-300/20" style={{top,left,width:focus.width,height:focus.height,boxShadow:'0 0 0 9999px rgba(9,9,11,.72)'}} aria-hidden="true"/>
    <div ref={card} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby={title} aria-describedby={body} data-feature-tour={feature} className="pointer-events-auto fixed rounded-2xl border border-white/20 bg-neutral-900 p-4 text-white shadow-2xl" style={{top:placement.top,left:placement.left,width:placement.width}} dir={ar?'rtl':'ltr'}>
      <div style={{maxHeight:viewport.height-56,overflowY:'auto'}}><p className="text-xs font-semibold text-emerald-300">{ar?`دليل سريع · ${index+1} من ${steps.length}`:`Quick guide · ${index+1} of ${steps.length}`}</p><h2 id={title} className="mt-2 text-base font-bold">{ar?step.titleAr:step.titleEn}</h2><p id={body} className="mt-2 text-sm leading-6 text-neutral-300">{ar?step.bodyAr:step.bodyEn}</p><div className="mt-4 flex items-center justify-between gap-2"><button type="button" className="min-h-10 rounded-lg px-2 text-xs text-neutral-300 underline" onClick={()=>finish(true)}>{ar?'تخطّي':'Skip'}</button><button type="button" className="min-h-11 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-neutral-950" onClick={()=>index+1<steps.length?setIndex(index+1):finish(false)}>{index+1<steps.length?(ar?'التالي':'Next'):(ar?finishAr:finishEn)}</button></div></div>
    </div>
  </div>,document.body);
}
