export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const KEY = 'nawah.marketing.session.v2';
const UTM_LIMITS = { utmSource: 120, utmMedium: 120, utmCampaign: 160, utmContent: 160 };
type Attribution = { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; referrerHost?: string };
type Visit = { id: string; lastSeen: number; attribution: Attribution };

export function marketingSession(storage: Pick<Storage, 'getItem' | 'setItem'>, url: URL, referrer: string, now: number, newId: () => string) {
  let previous: Visit | null = null;
  try { previous = JSON.parse(storage.getItem(KEY) || 'null'); } catch { /* Start a fresh session. */ }
  const incoming: Attribution = {};
  for (const [key, limit] of Object.entries(UTM_LIMITS)) {
    const param = key.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`);
    const value = url.searchParams.get(param)?.trim().slice(0, limit);
    if (value) incoming[key as keyof Attribution] = value;
  }
  try {
    const referring = referrer ? new URL(referrer) : null;
    if (referring && referring.hostname !== url.hostname && !referring.hostname.endsWith('.nawah-project.com'))
      incoming.referrerHost = referring.hostname.slice(0, 180);
  } catch { /* Ignore malformed referrers. */ }
  const hasCampaign = Object.keys(incoming).some(key => key !== 'referrerHost');
  const campaignChanged = hasCampaign && Object.keys(UTM_LIMITS).some(key => incoming[key as keyof Attribution] !== previous?.attribution?.[key as keyof Attribution]);
  const isNew = !previous?.id || !Number.isFinite(previous.lastSeen) || now - previous.lastSeen >= SESSION_TIMEOUT_MS || campaignChanged;
  const session: Visit = isNew ? { id: newId(), lastSeen: now, attribution: incoming } : { ...previous!, lastSeen: now };
  storage.setItem(KEY, JSON.stringify(session));
  return { session, isNew };
}
