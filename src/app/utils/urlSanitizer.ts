export function sanitizeJobUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    const url = new URL(trimmed);
    const trackingParams = [
      "trackingId",
      "refId",
      "origin",
      "trk",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "originalSubdomain",
      "li_fat_id",
      "fbclid",
      "gclid",
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}
