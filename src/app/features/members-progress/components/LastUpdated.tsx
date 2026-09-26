import { useI18n } from "../../../i18n";

export function LastUpdated({ value }: { value: string | null }) {
  const { t, locale, relativeTime } = useI18n();
  if (!value) {
    return (
      <span className="text-xs text-neutral-400 dark:text-neutral-600">
        {t("members.noMeaningfulActivity")}
      </span>
    );
  }
  const label = relativeTime(value);
  return (
    <time
      className="text-xs text-neutral-500"
      dateTime={value}
      title={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}
    >
      {label === t("common.justNow") ? label : t("members.lastUpdated", { time: label })}
    </time>
  );
}

export function relativeActivityTime(value: string, locale = "en"): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  if (Math.abs(seconds) < 45) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4, "week"],
    [12, "month"],
  ];
  let amount = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [threshold, nextUnit] of units) {
    if (Math.abs(amount) < threshold) break;
    amount = Math.round(amount / threshold);
    unit = nextUnit;
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    amount,
    unit,
  );
}
