import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/store/authStore";
import { useI18n } from "../../i18n";
import { profileApi, type ProfessionalProfile } from "./profileApi";
import { ProfileForm } from "./ProfileForm";
import { trackUxEvent, useUxExperiment } from "../../utils/uxAnalytics";
import { IntroVideoPlayer } from "../../components/IntroVideoPlayer";
import { Modal } from "../../components/ui/Modal";
import {
  SpinnerIcon,
  CheckIcon,
  PlayCircleIcon,
  SparklesIcon,
  ArrowLeftIcon,
  PlusIcon,
} from "../../components/Icons";

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { authenticated, user, setUser } = useAuth();
  const { t } = useI18n();
  const { variant } = useUxExperiment();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3>(() =>
    variant === "A" ? 2 : 1,
  );
  const [completed, setCompleted] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    setProfile(null);
    void profileApi
      .get()
      .then((result) => {
        if (active) {
          setProfile(result);
          if (!result.profileComplete) {
            trackUxEvent("onboarding_started");
          }
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, user?.id, attempt]);

  useEffect(() => {
    if (variant === "A" && profile && !profile.profileComplete) {
      setStep(2);
    }
  }, [variant, profile]);

  if (!authenticated) return children;
  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-app text-sm text-neutral-500"
        role="status"
      >
        <SpinnerIcon className="h-5 w-5 text-neutral-500 me-2" />
        <span>{t("profile.loadingProfile")}</span>
      </main>
    );
  }
  if (failed || !profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app p-6 text-center">
        <p role="alert" className="text-sm text-danger-strong">
          {t("profile.loadError")}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="button-secondary"
        >
          {t("common.retry")}
        </button>
      </main>
    );
  }

  // If already complete and not in the middle of onboarding wizard step 3
  if (profile.profileComplete && (completed || step === 1 || variant === "A")) {
    return children;
  }

  const steps = [
    { number: 1, title: t("profile.onboardingStep1Title") },
    { number: 2, title: t("profile.onboardingStep2Title") },
    { number: 3, title: t("profile.onboardingStep3Title") },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-xs">
      <section
        aria-labelledby="onboarding-wizard-title"
        className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8"
      >
        {/* Stepper Header */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => {
              const isPast = step > s.number;
              const isCurrent = step === s.number;
              return (
                <div
                  key={s.number}
                  className={`flex items-center ${idx < steps.length - 1 ? "flex-1" : ""}`}
                >
                  <div className="flex flex-col items-center sm:flex-row sm:gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isPast
                          ? "bg-success-strong text-white"
                          : isCurrent
                            ? "bg-info-strong text-white ring-4 ring-info-soft"
                            : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {isPast ? <CheckIcon className="h-4 w-4" /> : s.number}
                    </div>
                    <span
                      className={`mt-1 sm:mt-0 text-xs font-medium text-center sm:text-start ${
                        isCurrent
                          ? "text-neutral-950 font-semibold"
                          : isPast
                            ? "text-neutral-700"
                            : "text-neutral-400"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`mx-3 hidden sm:block h-0.5 flex-1 transition-colors ${
                        step > s.number ? "bg-success-strong" : "bg-neutral-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Platform Overview & Weekly Expectations */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-strong">
                <SparklesIcon className="h-3.5 w-3.5" />
                <span>{t("auth.heroBadge")}</span>
              </span>
              <h1
                id="onboarding-wizard-title"
                className="mt-3 text-2xl font-bold tracking-tight text-neutral-950"
              >
                {t("profile.onboardingWelcomeTitle")}, {user?.name || ""}
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                {t("profile.onboardingWelcomeSubtitle")}
              </p>
            </div>

            {/* Video preview card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setVideoModalOpen(true);
                trackUxEvent("onboarding_video_watched");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setVideoModalOpen(true);
                  trackUxEvent("onboarding_video_watched");
                }
              }}
              className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-neutral-50 p-4 transition hover:bg-neutral-100"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-strong">
                <PlayCircleIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <span>{t("auth.watchIntroTitle")}</span>
                  <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs text-info-strong">
                    90s
                  </span>
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                  {t("auth.watchIntroSubtitle")}
                </p>
              </div>
            </div>

            {/* 3 Weekly Expectations Cards */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-info-soft text-xs text-info-strong">
                    1
                  </span>
                  <span>{t("profile.expectation1Title")}</span>
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed ps-7">
                  {t("profile.expectation1Desc")}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-soft text-xs text-warning-strong">
                    2
                  </span>
                  <span>{t("profile.expectation2Title")}</span>
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed ps-7">
                  {t("profile.expectation2Desc")}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-xs text-success-strong">
                    3
                  </span>
                  <span>{t("profile.expectation3Title")}</span>
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed ps-7">
                  {t("profile.expectation3Desc")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="button-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2"
            >
              <span>{t("profile.nextToProfileSetup")}</span>
              <ArrowLeftIcon className="w-4 h-4 rotate-180 rtl:rotate-0" />
            </button>
          </div>
        )}

        {/* Step 2: Professional Profile Setup */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h1
                id="onboarding-wizard-title"
                className="text-2xl font-bold tracking-tight text-neutral-950"
              >
                {t("profile.completeTitle")}
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                {t("profile.completeDescription")}
              </p>
            </div>
            <ProfileForm
              initial={profile}
              onboarding
              onSaved={(saved) => {
                setProfile(saved);
                if (user) setUser({ ...user, name: saved.name });
                trackUxEvent("onboarding_completed");
                if (variant === "A") setCompleted(true);
                else setStep(3);
              }}
            />
          </div>
        )}

        {/* Step 3: Launch Celebration & First Action */}
        {step === 3 && (
          <div className="text-center py-6 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success-strong">
              <CheckIcon className="h-8 w-8" />
            </div>

            <div>
              <h1
                id="onboarding-wizard-title"
                className="text-2xl font-bold tracking-tight text-neutral-950"
              >
                {t("profile.onboardingReadyTitle")}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600 leading-relaxed">
                {t("profile.onboardingReadyDesc")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setCompleted(true);
                  navigate("/applications");
                }}
                className="button-primary flex-1 py-3 text-sm inline-flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t("common.addApplication")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompleted(true);
                  navigate("/professional-development");
                }}
                className="button-secondary flex-1 py-3 text-sm inline-flex items-center justify-center gap-2"
              >
                <span>{t("common.navProfessionalDevelopment")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Intro Video Modal */}
        <Modal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          title={t("auth.watchIntroTitle")}
          subtitle={t("auth.watchIntroSubtitle")}
          size="lg"
        >
          <div className="space-y-4">
            <IntroVideoPlayer />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
                <p className="text-xs font-semibold text-text-primary">
                  1. {t("profile.expectation1Title")}
                </p>
                <p className="text-[11px] text-text-secondary mt-1">
                  {t("profile.expectation1Desc")}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
                <p className="text-xs font-semibold text-text-primary">
                  2. {t("profile.expectation2Title")}
                </p>
                <p className="text-[11px] text-text-secondary mt-1">
                  {t("profile.expectation2Desc")}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3 bg-neutral-50/60">
                <p className="text-xs font-semibold text-text-primary">
                  3. {t("profile.expectation3Title")}
                </p>
                <p className="text-[11px] text-text-secondary mt-1">
                  {t("profile.expectation3Desc")}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </section>
    </main>
  );
}

