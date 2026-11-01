import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useI18n } from '../../../i18n';
import { useAuth } from '../store/authStore';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

type Participation = {
  id: string;
  title: string;
  goal: string;
  status: string;
  consentStatus: string;
  consentAt: string | null;
  retentionUntil: string;
};

/** Participant-facing projection only: never fetches a private case or research notes. */
export function IndividualParticipationPanel() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const ar = locale === 'ar';
  const text = (a: string, e: string) => (ar ? a : e);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Participation | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const participation = useQuery({
    queryKey: ['individual-participation', user?.id],
    queryFn: () =>
      apiClient.get<Participation[]>('/individual-research/participation'),
  });
  if (participation.isPending) return null;
  if (participation.isError)
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <p>
          {text(
            'تعذر تحميل حالة المشاركة الفردية.',
            'Could not load individual participation.',
          )}
        </p>
        <button
          className="button-secondary mt-2"
          onClick={() => void participation.refetch()}
        >
          {text('حاول تاني', 'Retry')}
        </button>
      </section>
    );
  if (!participation.data.length) return null;
  return (
    <section
      className="mx-auto max-w-[1150px] rounded-2xl border border-border bg-surface p-5 sm:p-7 space-y-4"
      aria-label={text('المشاركة الفردية', 'Individual participation')}
    >
      <div>
        <h2 className="text-lg font-semibold">
          {text(
            'مشاركتك في البحث والإرشاد الفردي',
            'Your individual research & mentoring participation',
          )}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {text(
            'المشاركة اختيارية. سحب الموافقة يوقف المشاركة والإتاحات الاستثنائية، ولا يغير إنجازك الفعلي في الرحلة.',
            'Participation is optional. Withdrawal stops participation and exceptional access, without changing your actual journey progress.',
          )}
        </p>
      </div>
      {participation.data.map((p) => (
        <article
          key={p.id}
          className="rounded-xl border border-border p-4 space-y-2"
        >
          <h3 className="font-semibold">{p.title}</h3>
          <p className="text-sm">{p.goal}</p>
          <p className="text-xs text-text-secondary">
            {text('حالة الموافقة: ', 'Consent: ')}
            {p.consentStatus === 'GIVEN'
              ? text('موثقة', 'Recorded')
              : p.consentStatus === 'WITHDRAWN'
                ? text('مسحوبة', 'Withdrawn')
                : text('لم توثق بعد', 'Not recorded yet')}{' '}
            ·{' '}
            {text(
              'تنتهي فترة الاحتفاظ ببيانات البحث في: ',
              'Research retention ends: ',
            )}
            {new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
              dateStyle: 'medium',
            }).format(new Date(p.retentionUntil))}
          </p>
          {p.consentStatus !== 'WITHDRAWN' && (
            <button
              className="button-secondary text-sm"
              onClick={() => {
                setError('');
                setSelected(p);
              }}
            >
              {text(
                'سحب موافقتي على المشاركة',
                'Withdraw my participation consent',
              )}
            </button>
          )}
        </article>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger-strong">
          {error}
        </p>
      )}
      <ConfirmDialog
        isOpen={Boolean(selected)}
        isConfirming={busy}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title={text('سحب موافقة المشاركة', 'Withdraw participation consent')}
        message={text(
          'سيتم إلغاء الإتاحات الفردية وإيقاف المشاركة فورًا. تظل سجلات البحث للمسؤولين المصرح لهم حتى انتهاء فترة الاحتفاظ أو طلب حذفها من المسؤول. حسابك وتقدمك الطبيعي يظلان كما هما.',
          'Individual access is revoked and participation stops immediately. Research records remain accessible to authorized staff until retention ends or you request deletion from the administrator. Your account and normal progress remain unchanged.',
        )}
        confirmLabel={text('تأكيد سحب الموافقة', 'Confirm withdrawal')}
        onConfirm={() =>
          void (async () => {
            if (!selected || busy) return;
            setBusy(true);
            setError('');
            try {
              await apiClient.post(
                '/individual-research/participation/' +
                  selected.id +
                  '/withdraw',
                { requestId: crypto.randomUUID() },
              );
              await Promise.all([
                qc.invalidateQueries({
                  queryKey: ['individual-participation'],
                }),
                qc.invalidateQueries({ queryKey: ['journey'] }),
              ]);
              setSelected(null);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : text('تعذر سحب الموافقة', 'Could not withdraw consent'),
              );
              setSelected(null);
            } finally {
              setBusy(false);
            }
          })()
        }
      />
    </section>
  );
}
