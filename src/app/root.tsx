import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { QueryClientProvider } from "@tanstack/react-query";
import type { Route } from "./+types/root";
import "./app.css";
import { AuthProvider } from "./features/auth/store/authStore";
import { I18nProvider } from "./i18n";
import { ToastProvider } from "./components/ui/ToastProvider";
import { queryClient } from "./lib/react-query";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/nawah-logo.svg" },

  { rel: "preload", href: "/fonts/plex-ar-v15-400-arabic.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: "/fonts/plex-ar-v15-700-arabic.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const locale = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar";
  let message = locale === "ar" ? "حدث خطأ" : "Something went wrong";
  let details = locale === "ar" ? "حدث خطأ غير متوقع. حاول مرة أخرى." : "Something went wrong. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : locale === "ar" ? "حدث خطأ" : "Error";
    details =
      error.status === 404
        ? locale === "ar" ? "الصفحة التي تبحث عنها غير موجودة." : "The requested page could not be found."
        : details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
