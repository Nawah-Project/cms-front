import { useI18n, type Locale } from ".";
import { GlobeIcon } from "../components/Icons";

export function LanguageSwitcher({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const options: Array<{ locale: Locale; label: string }> = [
    { locale: "ar", label: t("common.languageArabic") },
    { locale: "en", label: t("common.languageEnglish") },
  ];
  return (
    <details className="group relative">
      <summary
        aria-label={t("common.changeLanguage")}
        className={`flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-info-strong ${inverse ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800" : "border-border text-text-secondary hover:bg-surface-hover"} ${compact ? "w-full justify-center" : ""}`}
      >
        <GlobeIcon className="h-4 w-4 shrink-0" />
        {!compact && <span>{options.find((option) => option.locale === locale)?.label}</span>}
      </summary>
      <div className="absolute end-0 top-full z-50 mt-2 min-w-36 rounded-lg border border-border bg-surface p-1 shadow-xl" role="group" aria-label={t("common.changeLanguage")}>
        {options.map((option) => (
          <button
            key={option.locale}
            type="button"
            aria-current={locale === option.locale ? "true" : undefined}
            onClick={(event) => {
              setLocale(option.locale);
              const details = event.currentTarget.closest("details");
              if (details) details.open = false;
            }}
            className={`flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-surface-hover ${locale === option.locale ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}
          >
            <span>{option.label}</span>
            {locale === option.locale && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
