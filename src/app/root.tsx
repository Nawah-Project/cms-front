import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./features/auth/store/authStore";
import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./theme/ThemeProvider";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/nawah-logo.svg" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
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
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isEn = typeof document !== "undefined" && document.documentElement.lang === "en";
  let title = isEn ? "Something went wrong" : "حدث خطأ غير متوقع";
  let description = isEn
    ? "An unexpected issue occurred while rendering this page. You can return to the dashboard or try again."
    : "حدثت مشكلة أثناء عرض هذه الصفحة. يمكنك العودة إلى لوحة التحكم أو إعادة المحاولة.";
  let statusCode = "500";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = String(error.status);
    if (error.status === 404) {
      title = isEn ? "Page Not Found" : "الصفحة غير موجودة";
      description = isEn
        ? "The page you are looking for doesn't exist or may have been moved."
        : "الصفحة التي تبحث عنها غير موجودة أو تم نقلها لمكان آخر.";
    } else {
      title = isEn ? "Service Error" : "خطأ في الخدمة";
      description = error.data || description;
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    description = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-app p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
          <span className="text-xl font-bold font-mono">{statusCode}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xs transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {isEn ? "Go to Dashboard" : "العودة للوحة التحكم"}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-750"
          >
            {isEn ? "Refresh Page" : "إعادة تحميل الصفحة"}
          </button>
        </div>

        {stack && (
          <details className="mt-6 text-start">
            <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              {isEn ? "Error details (Dev Mode)" : "تفاصيل الخطأ البرمجي (وضع التطوير)"}
            </summary>
            <pre className="mt-2 max-h-48 w-full overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
              <code>{stack}</code>
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
