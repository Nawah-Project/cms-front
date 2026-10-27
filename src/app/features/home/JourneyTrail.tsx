import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  Check,
  Compass,
  FileText,
  Globe2,
  LockKeyhole,
  MapPin,
  Megaphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { JourneyConnections } from "./JourneyConnections";
import { trailColumns, trailPlacement } from "./trail-layout";
import type { Branch, HomeNode, HomePreview } from "./home-preview-api";
export function JourneyTrail({
  data,
  expanded,
  board,
  currentRef,
  showGroup,
  showPlatform,
  allSpecialties,
  onStation,
  onBranch,
}: {
  data: HomePreview;
  expanded: boolean;
  board: RefObject<HTMLDivElement | null>;
  currentRef: RefObject<HTMLButtonElement | null>;
  showGroup: boolean;
  showPlatform: boolean;
  allSpecialties: boolean;
  onStation: (node: HomeNode) => void;
  onBranch: (node: HomeNode, branch: Branch) => void;
}) {
  const { locale, number } = useI18n(),
    ar = locale === "ar",
    text = (a: string, e: string) => (ar ? a : e);
  const [columns, setColumns] = useState(4),
    [clipped, setClipped] = useState<Set<string>>(new Set());
  const frame = useRef(0);
  const nodes = data.weeks.flatMap((w) => w.nodes);
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        setColumns(trailColumns(el.clientWidth));
        const viewport = el.parentElement!.getBoundingClientRect();
        const hidden = new Set<string>();
        if (!expanded)
          el.querySelectorAll<HTMLElement>("[data-trail-key]").forEach(
            (stop) => {
              if (stop.getBoundingClientRect().bottom > viewport.bottom - 70)
                hidden.add(stop.dataset.trailKey!);
            },
          );
        setClipped((previous) =>
          [...hidden].join() === [...previous].join() ? previous : hidden,
        );
      });
    });
    resize.observe(el);
    resize.observe(el.parentElement!);
    el.querySelectorAll("[data-trail-key]").forEach((s) => resize.observe(s));
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [board, data, expanded, columns]);
  const place = (index: number) => {
    const p = trailPlacement(index, nodes.length + 1, columns);
    return {
      p,
      style: {
        gridRow: p.row,
        gridColumn: p.column,
        "--trail-offset": `${p.offset}px`,
      } as CSSProperties,
    };
  };
  const title = (n: HomeNode) =>
    n.kind === "FINAL"
      ? text("التقرير النهائي", "Final report")
      : n.kind === "REVIEW"
        ? text("المراجعة", "Review")
        : n.week === 0
          ? text("المهمة صفر", "Task zero")
          : text("المهمة ", "Task ") +
            number(
              data.weeks
                .find((w) => w.week === n.week)!
                .nodes.filter((x) => x.kind === "TASK")
                .findIndex((x) => x.code === n.code) + 1,
            );
  const ratio = (n: HomeNode) =>
    n.requirements.length
      ? Math.round(
          (n.requirements.reduce(
            (sum, r) => sum + Math.min(1, r.current / r.required),
            0,
          ) /
            n.requirements.length) *
            100,
        )
      : 0;
  const branchLabel = (b: Branch) =>
    b.kind === "GUIDANCE"
      ? text("إرشاد", "Guidance")
      : b.kind === "TAILORED"
        ? text("مخصص", "Tailored")
        : b.kind === "POSTS"
          ? text("منشور", "Post")
          : text("تواصل", "Outreach");
  const first = place(0);
  return (
    <div
      className="home-map home-trail"
      ref={board}
      data-trail-columns={columns}
      style={{ "--trail-columns": columns } as CSSProperties}
    >
      <JourneyConnections root={board} data={data} rtl={ar} />
      <div
        className="trail-stop trail-origin"
        style={first.style}
        data-trail-key="ONBOARDING"
        data-trail-row={first.p.row}
        data-trail-column={first.p.column}
        inert={!expanded && clipped.has("ONBOARDING")}
        aria-hidden={!expanded && clipped.has("ONBOARDING") ? true : undefined}
      >
        <article className="home-origin-card" data-home-anchor="ONBOARDING">
          <span className="trail-week-badge">{text("البداية", "Start")}</span>
          <span className="home-origin-icon">
            <Compass size={29} />
          </span>
          <h3>{text("جهّزت بدايتك.", "Your start is ready.")}</h3>
          <p>
            {text("الاستقبال والملف المهني", "Welcome & professional profile")}
          </p>
          <span className="home-origin-ready">
            <Check size={13} />
            {text("خطوتك الأولى جاهزة", "Ready for your first step")}
          </span>
        </article>
      </div>
      {nodes.map((n, i) => {
        const { p, style } = place(i + 1),
          group = showGroup ? (n.counts.group ?? 0) : 0,
          platform = showPlatform
            ? allSpecialties
              ? n.counts.all
              : n.counts.specialty
            : 0;
        return (
          <div
            key={n.code}
            className={`trail-stop ${n.status === "ACTIVE" ? "trail-stop-current" : ""}`}
            style={style}
            data-trail-key={n.code}
            data-trail-row={p.row}
            data-trail-column={p.column}
            inert={!expanded && clipped.has(n.code)}
            aria-hidden={!expanded && clipped.has(n.code) ? true : undefined}
          >
            <button
              data-home-anchor={n.code}
              data-home-station={n.code}
              ref={n.code === data.currentCode ? currentRef : undefined}
              onClick={() => onStation(n)}
              className={`home-station ${n.kind.toLowerCase()} ${n.status.toLowerCase()} ${group ? "has-group" : ""} ${platform ? "has-platform" : ""}`}
              aria-label={`${n.week ? text("الأسبوع ", "Week ") + number(n.week) + " · " : ""}${title(n)} · ${n.status === "LOCKED" ? text("محطة قادمة", "Upcoming station") : text(n.titleAr ?? "", n.titleEn ?? "")}`}
            >
              <span
                className={`trail-week-badge ${n.status === "ACTIVE" ? "current" : ""}`}
              >
                {n.week
                  ? text("أسبوع ", "Week ") + number(n.week)
                  : text("البداية", "Start")}
              </span>
              <div className="home-station-top">
                <span>{title(n)}</span>
                {n.status === "COMPLETED" ? (
                  <Check size={15} />
                ) : n.status === "LOCKED" ? (
                  <LockKeyhole size={14} />
                ) : (
                  <MapPin size={15} />
                )}
              </div>
              {n.status === "LOCKED" ? (
                <div className="home-masked" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <>
                  <h4>
                    {text(n.titleAr ?? "", n.titleEn ?? "").replace(
                      /^المهمة\s*صفر:\s*|^Task\s*0:\s*/i,
                      "",
                    )}
                  </h4>
                  {n.requirements[0] && (
                    <div className="home-card-metric">
                      <strong>{number(n.requirements[0].current)}</strong>
                      <span>
                        / {number(n.requirements[0].required)}{" "}
                        {n.requirements[0].key === "apps"
                          ? text("طلب", "apps")
                          : text("تسليم", "submission")}
                      </span>
                    </div>
                  )}
                  <div className="home-card-progress">
                    <i style={{ width: `${ratio(n)}%` }} />
                  </div>
                </>
              )}
              <div className="home-station-footer">
                {n.status === "ACTIVE" ? (
                  <span className="home-you-here">
                    <span />
                    {text("أنت هنا", "You are here")}
                  </span>
                ) : n.status === "LOCKED" ? (
                  <span>{text("تتكشف في وقتها", "Unfolds in its time")}</span>
                ) : (
                  <span>{text("تم الإنجاز", "Completed")}</span>
                )}
              </div>
              {(group > 0 || platform > 0) && (
                <div
                  className="trail-peers"
                  aria-label={text("أماكن الزملاء", "Peer positions")}
                >
                  {group > 0 && (
                    <span className="trail-peer-group">
                      <span className="trail-avatar-pair" aria-hidden="true">
                        <i />
                        <i />
                      </span>
                      <UsersRound size={12} />
                      <b>{number(group)}</b>
                      <span>{text("مجموعتك", "group")}</span>
                    </span>
                  )}
                  {platform > 0 && (
                    <span className="trail-peer-platform">
                      <Globe2 size={13} />
                      <b>{number(platform)}</b>
                      <span>{text("المنصة", "platform")}</span>
                    </span>
                  )}
                </div>
              )}
            </button>
            {n.branches.length > 0 && (
              <div className="home-step-branches trail-branches">
                {n.branches.map((b) => (
                  <button
                    key={b.id}
                    data-home-anchor={b.id}
                    className={`home-branch ${b.kind.toLowerCase()} ${b.locked ? "locked" : ""}`}
                    title={
                      b.locked
                        ? undefined
                        : text(b.titleAr ?? "", b.titleEn ?? "")
                    }
                    aria-label={
                      b.locked
                        ? text(
                            "متطلب مرتبط مقفول",
                            "A linked requirement not yet open",
                          )
                        : text(b.titleAr ?? "", b.titleEn ?? "")
                    }
                    onClick={() => (b.locked ? onStation(n) : onBranch(n, b))}
                  >
                    {b.locked ? (
                      <>
                        <LockKeyhole size={12} />
                        <span className="home-branch-mask" aria-hidden="true" />
                      </>
                    ) : (
                      <>
                        {b.kind === "GUIDANCE" ? (
                          <Sparkles size={13} />
                        ) : b.kind === "TAILORED" ? (
                          <FileText size={13} />
                        ) : b.kind === "POSTS" ? (
                          <Megaphone size={13} />
                        ) : (
                          <UsersRound size={13} />
                        )}
                        <span>
                          {branchLabel(b)}
                          {b.value ? (
                            <>
                              {" "}
                              · <b>{number(b.value)}</b>
                            </>
                          ) : (
                            ""
                          )}
                        </span>
                        {b.done && <Check size={12} />}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
