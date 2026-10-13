import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircleIcon, CheckIcon, CloseIcon } from "../Icons";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = "info" }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 end-5 z-[120] flex max-w-sm w-full flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
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
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-border border-s-4 ${borderClass} bg-surface p-3.5 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
            >
              {icon}
              <div className="flex-1 text-sm font-medium text-text-primary leading-snug pt-0.5">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
                className="rounded-lg p-1 text-text-muted hover:bg-neutral-100 hover:text-text-primary shrink-0 transition-colors"
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
