import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export function AnchoredSelect({
  value,
  onChange,
  options,
  label,
  guide,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  guide?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({ top: 0, left: 0, width: 240 });
  const trigger = useRef<HTMLButtonElement>(null),
    list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(Math.max(r.width, 240), window.innerWidth - 24),
        height = Math.min(
          list.current?.offsetHeight ?? 220,
          window.innerHeight - 24,
        );
      setPosition({
        left: Math.max(
          12,
          Math.min(r.right - width, window.innerWidth - width - 12),
        ),
        top: Math.max(
          12,
          Math.min(
            r.bottom + 6 + height > window.innerHeight
              ? r.top - height - 6
              : r.bottom + 6,
            window.innerHeight - height - 12,
          ),
        ),
        width,
      });
    };
    place();
    const obs = new ResizeObserver(place);
    if (list.current) obs.observe(list.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (
        !trigger.current?.contains(e.target as Node) &&
        !list.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-guide={guide}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-neutral-300 bg-white px-3 text-start text-xs font-semibold text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white ${className}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="truncate">
          {options.find((o) => o.value === value)?.label ?? label}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {open &&
        createPortal(
          <div
            ref={list}
            role="listbox"
            aria-label={label}
            data-anchored-options
            className="fixed z-[12040] max-h-[min(20rem,70dvh)] overflow-y-auto overflow-x-hidden rounded-xl border border-neutral-300 bg-white p-1.5 shadow-2xl dark:border-neutral-600 dark:bg-neutral-900"
            style={position}
            onKeyDown={(e) => {
              const items = [
                  ...list.current!.querySelectorAll<HTMLButtonElement>(
                    '[role="option"]',
                  ),
                ],
                index = items.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
              if (e.key === "Escape" || e.key === "Tab") {
                if (e.key === "Escape") e.preventDefault();
                close();
              } else if (
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
              ) {
                e.preventDefault();
                const i =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? items.length - 1
                      : (index +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          items.length) %
                        items.length;
                items[i]?.focus();
              }
            }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={value === o.value}
                tabIndex={value === o.value ? 0 : -1}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm focus:bg-neutral-100 focus:outline-none dark:focus:bg-neutral-800 ${value === o.value ? "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "text-neutral-800 dark:text-neutral-200"}`}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
              >
                <span className="break-words">{o.label}</span>
                {value === o.value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
