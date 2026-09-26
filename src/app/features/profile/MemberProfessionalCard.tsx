import { useState } from "react";
import { useI18n } from "../../i18n";
import { MemberAvatar } from "../members-progress/components/MemberAvatar";
import type { MemberProgress } from "../members-progress/types/membersProgress.types";
import { FocusDialog } from "./FocusDialog";
import { CvViewer } from "./CvViewer";

export function ProfessionalProfileActions({ portfolioUrl, hasCv, userId }: { portfolioUrl: string | null; hasCv: boolean; userId: string }) {
  const { t } = useI18n();
  const [viewingCv, setViewingCv] = useState(false);
  return <>
    <div className="grid gap-3">
      {portfolioUrl && <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">{t("profile.viewPortfolio")} <span className="ms-2" aria-hidden="true">↗</span></a>}
      {hasCv && <button type="button" onClick={() => setViewingCv(true)} className="min-h-12 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-strong dark:bg-white dark:text-neutral-900">{t("profile.viewCv")}</button>}
      {!portfolioUrl && !hasCv && <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-800">{t("profile.noProfessionalInfo")}</p>}
    </div>
    {viewingCv && <CvViewer userId={userId} onClose={() => setViewingCv(false)} />}
  </>;
}

export function MemberProfessionalCard({ member, onClose }: { member: MemberProgress; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <FocusDialog labelledBy="member-profile-title" onClose={onClose} className="max-w-md p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <MemberAvatar member={member} />
          <h2 id="member-profile-title" className="truncate text-xl font-semibold text-neutral-950 dark:text-neutral-100">{member.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-lg px-2 py-1 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">×</button>
      </header>
      <div className="mt-6"><ProfessionalProfileActions portfolioUrl={member.portfolioUrl} hasCv={member.hasCv} userId={member.memberId} /></div>
    </FocusDialog>
  );
}
