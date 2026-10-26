import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  count: number;
  anchor?: {top:number;bottom:number;left:number;right:number};
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  show: (
    message: string,
    options?: { type?: ToastVariant; variant?: ToastVariant; duration?: number },
  ) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TOAST_DURATION = 4000;
const MAX_CONCURRENT_TOASTS = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const anchorRef = useRef<ToastItem["anchor"]>(undefined);
  useEffect(()=>{const capture=(event:Event)=>{const el=(event.target as HTMLElement)?.closest<HTMLElement>('button,a,input,select,textarea,[role="button"]');if(el){const r=el.getBoundingClientRect();anchorRef.current={top:r.top,bottom:r.bottom,left:r.left,right:r.right};}};document.addEventListener('pointerdown',capture,true);document.addEventListener('focusin',capture,true);return()=>{document.removeEventListener('pointerdown',capture,true);document.removeEventListener('focusin',capture,true);};},[]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useLayoutEffect(()=>{
    const place=()=>{for(const toast of toasts){const node=document.getElementById(`feedback-${toast.id}`);if(!node)continue;const r=node.getBoundingClientRect(),a=toast.anchor;const left=(a?(a.left+a.right)/2:innerWidth/2)-r.width/2;const top=a?(a.bottom+10+r.height>innerHeight-12?a.top-r.height-10:a.bottom+10):80;node.style.left=`${Math.max(12,Math.min(left,innerWidth-r.width-12))}px`;node.style.top=`${Math.max(12,Math.min(top,innerHeight-r.height-12))}px`;}};place();window.addEventListener('resize',place);return()=>window.removeEventListener('resize',place);
  },[toasts]);
  const removeToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = "info", duration = DEFAULT_TOAST_DURATION }: ToastOptions) => {
      setToasts((prev) => {
        // Check for duplicate message with same variant
        const existingIndex = prev.findIndex(
          (t) => t.message === message && t.variant === variant,
        );

        if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          // Clear and reset timer
          const oldTimer = timersRef.current.get(existing.id);
          if (oldTimer) clearTimeout(oldTimer);

          const newTimer = setTimeout(() => {
            removeToast(existing.id);
          }, duration);
          timersRef.current.set(existing.id, newTimer);

          // Bump count
          const next = [...prev];
          next[existingIndex] = {
            ...existing,
            count: existing.count + 1,
            duration,
          };
          return next;
        }

        // New toast
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newTimer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, newTimer);

        // Limit concurrent toasts
        const trimmed =
          prev.length >= MAX_CONCURRENT_TOASTS
            ? prev.slice(prev.length - MAX_CONCURRENT_TOASTS + 1)
            : prev;

        return [...trimmed, { id, message, variant, duration, count: 1, anchor: anchorRef.current }];
      });
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string) => showToast({ message, variant: "success" }),
    [showToast],
  );

  const error = useCallback(
    (message: string) => showToast({ message, variant: "error" }),
    [showToast],
  );

  const info = useCallback(
    (message: string) => showToast({ message, variant: "info" }),
    [showToast],
  );

  const warning = useCallback(
    (message: string) => showToast({ message, variant: "warning" }),
    [showToast],
  );

  const show = useCallback(
    (
      message: string,
      options?: { type?: ToastVariant; variant?: ToastVariant; duration?: number },
    ) => {
      const variant = options?.variant || options?.type || "info";
      showToast({ message, variant, duration: options?.duration });
    },
    [showToast],
  );

  const value = useMemo(
    () => ({ showToast, show, success, error, info, warning }),
    [showToast, show, success, error, info, warning],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length>0 && typeof document!=="undefined" && createPortal(<div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-0 z-[12050]">
        {toasts.map((toast) => {
          let iconContainer = (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
              <Info className="h-4 w-4" />
            </div>
          );


          if (toast.variant === "success") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Check className="h-4 w-4" />
              </div>
            );

          } else if (toast.variant === "error") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertCircle className="h-4 w-4" />
              </div>
            );

          } else if (toast.variant === "warning") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            );

          }

          const durationMs = toast.duration || DEFAULT_TOAST_DURATION;

          return (
            <div
              key={toast.id}
              role={toast.variant==="error"?"alert":"status"}
              id={`feedback-${toast.id}`}
              style={{position:"fixed",width:"min(320px, calc(100vw - 24px))",maxHeight:"min(180px, calc(100dvh - 24px))",overflowY:"auto",left:12,top:80}}
              data-context-feedback
              className="pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-xl border border-border backdrop-blur-md bg-white dark:bg-neutral-900/95 p-3 shadow-xl"
            >
              {iconContainer}
              <div className="flex-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-relaxed pt-0.5 flex items-center justify-between gap-2">
                <span>{toast.message}</span>
                {toast.count > 1 && (
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-200/80 px-2 py-0.5 text-[10px] font-bold text-neutral-800 shadow-xs dark:bg-neutral-800 dark:text-neutral-200">
                    ×{toast.count}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 shrink-0 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>


            </div>
          );
        })}
      </div>,document.body)}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
