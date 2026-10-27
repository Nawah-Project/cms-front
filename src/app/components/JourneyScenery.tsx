import { ProfessionalImage } from "./ProfessionalImage";
import { ArrowUpLeft, ArrowUpRight, Compass, Play, Sparkles, Flag } from "lucide-react";
import { useI18n } from "../i18n";
import { useUxExperiment } from "../utils/uxAnalytics";

/** The same landscape carries the visitor from the front door into their first step. */
export function JourneyScenery({variant="entry",step=1,onExplore}:{variant?:"entry"|"onboarding";step?:number;onExplore?:()=>void}) {
  const {locale}=useI18n(); const ar=locale==="ar"; const {introVideoUrl}=useUxExperiment(); const Arrow=ar?ArrowUpLeft:ArrowUpRight;
  return <aside className={`journey-scenery journey-scenery--${variant}`} aria-label={ar?"رحلتك نحو فرصة تناسبك":"Your journey toward a suitable opportunity"}>
    <ProfessionalImage className="journey-scenery-image" sizes={variant === "entry" ? "100vw" : "(max-width: 900px) 100vw, 1110px"} />
    <div className="journey-scenery-shade" />
    <div className="journey-scenery-copy">
      <span className="journey-eyebrow"><Sparkles size={14}/>{ar?"نواة · بداية تستاهلها":"NAWAH · A beginning worth taking"}</span>
      <h2>{variant==="entry" ? <>{ar?"رحلتك لفرصة أنسب،":"Your next opportunity,"}<br/><em>{ar?"تبدأ بخطوة واضحة.":"starts with a clear step."}</em></> : <>{ar?"كل رحلة كبيرة،":"Every meaningful journey"}<br/><em>{ar?"ليها أول خطوة.":"starts with a first step."}</em></>}</h2>
      <p>{variant==="entry"?(ar?"قدّم بوعي، طوّر طريقتك، وشوف أثر خطواتك. نواة تساعدك تمشي باتجاه أوضح نحو شغلك الجاي.":"Apply with intention, improve your approach and see your progress. Find a clearer direction toward your next role."):(ar?"مش مطلوب منك تعرف الطريق كله دلوقتي. جهّز بدايتك، وكل خطوة هتظهر في وقتها.":"You don’t need the whole route yet. Prepare your starting point; each next step will appear when it matters.")}</p>
    </div>
    <div className="journey-destination"><Flag size={15}/><span>{ar?"وجهتك: فرصة تناسبك":"Destination: a role that fits"}</span></div>
    <div className="journey-scenery-footer">
      {variant==="entry" ? <>
        {onExplore && <button type="button" className="journey-explore" onClick={onExplore}><span className="journey-explore-icon">{introVideoUrl?<Play size={19}/>:<Compass size={21}/>}</span><span><strong>{introVideoUrl?(ar?"شوف الرحلة قبل ما تبدأ":"See the journey before you begin"):(ar?"إزاي هتبدأ رحلتك؟":"How does your journey begin?")}</strong><small>{ar?"دليل سريع لأول خطوة ليك في نواة":"A quick guide to your first step in Nawah"}</small></span><Arrow size={18}/></button>}
        <div className="journey-values"><span><i/> {ar?"خطوات واضحة":"Clear steps"}</span><span><i/> {ar?"تقدم له معنى":"Meaningful progress"}</span><span><i/> {ar?"رحلة مش لوحدك":"A shared journey"}</span></div>
      </> : <div className="journey-start-note"><span className="journey-note-number">0{step}</span><div><strong>{ar?(step===1?"تعرّف على نقطة البداية":"جهّز هويتك المهنية"):(step===1?"Meet your starting point":"Prepare your professional identity")}</strong><p>{ar?"بداية بسيطة. اتجاه أوضح. مساحة إنك تتطور.":"A simple beginning. A clearer direction. Room to grow."}</p></div></div>}
    </div>
  </aside>;
}
