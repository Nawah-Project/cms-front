import { useEffect, useRef, type RefObject } from "react";
export function useDialogFocus(
  root: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  disableClose = false,
) {
  const close = useRef(onClose),
    blocked = useRef(disableClose);
  close.current = onClose;
  blocked.current = disableClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = root.current;
    if (!node) return;
    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
    (focusable()[0] ?? node).focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !blocked.current) {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        node.focus();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === node)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", key);
    return () => {
      node.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, root]);
}
