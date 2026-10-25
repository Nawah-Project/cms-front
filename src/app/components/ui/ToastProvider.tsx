import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
const MAX_CONCURRENT_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

        return [...trimmed, { id, message, variant, duration, count: 1 }];
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
      <style>{`
        @keyframes toastProgressAnim {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-8 start-5 lg:start-[17.5rem] z-[120] flex max-w-sm w-full flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          let iconContainer = (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
              <Info className="h-4 w-4" />
            </div>
          );
          let progressBarClass = "bg-sky-500";

          if (toast.variant === "success") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Check className="h-4 w-4" />
              </div>
            );
            progressBarClass = "bg-emerald-500";
          } else if (toast.variant === "error") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertCircle className="h-4 w-4" />
              </div>
            );
            progressBarClass = "bg-rose-500";
          } else if (toast.variant === "warning") {
            iconContainer = (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            );
            progressBarClass = "bg-amber-500";
          }

          const durationMs = toast.duration || DEFAULT_TOAST_DURATION;

          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-2xl border border-border backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 p-4 shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
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

              {/* Thin auto-dismiss progress bar */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-200/50 dark:bg-neutral-800/50 overflow-hidden">
                <div
                  className={`h-full opacity-60 ${progressBarClass}`}
                  style={{
                    animation: `toastProgressAnim ${durationMs}ms linear forwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
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
