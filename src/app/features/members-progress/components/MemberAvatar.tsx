import type { MemberSummary } from "../types/membersProgress.types";

export function MemberAvatar({
  member,
  size = "normal",
}: {
  member: Pick<MemberSummary, "name" | "avatar">;
  size?: "small" | "normal";
}) {
  const initials =
    member.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toLocaleUpperCase() || "?";
  const sizeClass =
    size === "small" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return member.avatar ? (
    <img
      src={member.avatar}
      alt=""
      className={`${sizeClass} shrink-0 rounded-full border border-neutral-200 object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 font-semibold text-neutral-600`}
    >
      {initials}
    </span>
  );
}
