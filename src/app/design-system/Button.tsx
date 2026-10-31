import type { ButtonHTMLAttributes, ReactNode } from "react";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: "default" | "small"; loading?: boolean; children: ReactNode;
};
/** Visual variants share their states with legacy semantic button classes. */
export function Button({variant="primary",size="default",loading=false,disabled,className="",children,type="button",...props}:ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`n-button n-button--${variant} ${size === "small" ? "n-button--small" : ""} ${className}`}>
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}{children}
  </button>;
}
