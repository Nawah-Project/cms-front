import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircleIcon, CheckIcon, CloseIcon } from "../Icons";

export type ToastVariant = "success" | "error" | "info";

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
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TOAST_DURATION = 4000;
const MAX_CONCURRENT_TOASTS = 2;

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
        const trimmed = prev.length >= MAX_CONCURRENT_TOASTS
          ? prev.slice(prev.length - MAX_CONCURRENT_TOASTS + 1)
          : prev;

        return [...trimmed, { id, message, variant, count: 1 }];
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

  const value = useMemo(
    () => ({ showToast, success, error, info }),
    [showToast, success, error, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-5 end-5 z-[120] flex max-w-sm w-full flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          let borderClass = "border-s-info-strong";
          let icon = <AlertCircleIcon className="h-5 w-5 text-info-strong shrink-0" />;

          if (toast.variant === "success") {
            borderClass = "border-s-success-strong";
            icon = <CheckIcon className="h-5 w-5 text-success-strong shrink-0" />;
          } else if (toast.variant === "error") {
            borderClass = "border-s-danger-strong";
            icon = <AlertCircleIcon className="h-5 w-5 text-danger-strong shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-border border-s-4 ${borderClass} bg-surface p-3.5 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
            >
              {icon}
              <div className="flex-1 text-sm font-medium text-text-primary leading-snug pt-0.5 flex items-center justify-between gap-2">
                <span>{toast.message}</span>
                {toast.count > 1 && (
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-200/80 px-2 py-0.5 text-xs font-bold text-neutral-800 shadow-xs dark:bg-neutral-800 dark:text-neutral-200">
                    ×{toast.count}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
                className="rounded-lg p-1 text-text-muted hover:bg-neutral-100 hover:text-text-primary shrink-0 transition-colors dark:hover:bg-neutral-800"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
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
