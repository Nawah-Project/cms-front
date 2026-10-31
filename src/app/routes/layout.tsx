import { OperationsPerformanceObserver } from "../features/admin/operations/OperationsPerformanceObserver";
import { useAuth } from "../features/auth/store/authStore";
import {
  SectionExperienceProvider,
  SectionExposure,
} from "../features/ux-lab/SectionExperience";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AddApplicationModal } from "../features/applications/components/AddApplicationModal";
import { AppSidebar } from "../components/AppSidebar";
import { JourneyTasksPanel } from "../components/JourneyTasksPanel";
import type { CreateApplicationInput } from "../types";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { EmailVerificationGate } from "../features/auth/components/EmailVerificationGate";
import { ProfileCompletionGate } from "../features/profile/ProfileCompletionGate";
import { useI18n } from "../i18n";
import { useToast } from "../components/ui/ToastProvider";
import { trackUxEvent } from "../utils/uxAnalytics";
import { useCreateApplication } from "../features/applications/api/applicationsApi";
import { journeyApi } from "../features/journey/api/journeyApi";
import { journeyQueryKeys } from "../features/journey/config/query-keys";
import type { JourneyStateResponse } from "../features/journey/types";
import { celebrateJourneyUnlocks } from "../features/journey/lib/celebrate-unlocks";
import {
  CELEBRATE_MILESTONE_EVENT,
  type MilestoneCelebrationData,
} from "../features/journey/lib/celebrationEvents";
import { closeJourneyTasksPanel } from "../components/journeyTasksPanelEvents";
import { MilestoneCelebrationModal } from "../components/ui/MilestoneCelebrationModal";
import { AppContext } from "../components/AppModalContext";
export { useAppModal } from "../components/AppModalContext";
import { FirstApplicationGuidedTourProvider } from "../features/applications/components/FirstApplicationGuidedTour";
import { ExperienceProgressProvider } from "../features/experience/ExperienceProgress";

export default function Layout() {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const createAppMutation = useCreateApplication();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [draftValues, setDraftValues] =
    useState<Partial<CreateApplicationInput> | null>(null);
  const openedFromMemberHome = useRef(false);
  const [celebrationData, setCelebrationData] =
    useState<MilestoneCelebrationData | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: previewUser } = useAuth();
  const isHomePreview =
    previewUser?.role === "ADMIN" &&
    location.pathname === "/" &&
    new URLSearchParams(location.search).get("labPreview") === "home:B";

  const openAddModal = useCallback(
    (initialValues?: Partial<CreateApplicationInput>) => {
      openedFromMemberHome.current =
        location.pathname === "/" && previewUser?.role === "USER";
      closeJourneyTasksPanel();
      setDraftValues(initialValues ?? null);
      setIsAddModalOpen(true);
    },
    [location.pathname, previewUser?.role],
  );

  useEffect(() => {
    if (window.localStorage.getItem("nawah.sidebar.collapsed") === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "nawah.sidebar.collapsed",
      String(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<MilestoneCelebrationData>;
      if (customEvent.detail) {
        closeJourneyTasksPanel();
        setCelebrationData(customEvent.detail);
      }
    };
    const openAddHandler = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<CreateApplicationInput>>;
      openAddModal(customEvent.detail);
    };
    window.addEventListener(CELEBRATE_MILESTONE_EVENT, handler);
    window.addEventListener("nawah_open_add_modal", openAddHandler);
    return () => {
      window.removeEventListener(CELEBRATE_MILESTONE_EVENT, handler);
      window.removeEventListener("nawah_open_add_modal", openAddHandler);
    };
  }, [openAddModal]);

  const handleCreateApplication = async (data: CreateApplicationInput) => {
    const prevJourney = queryClient.getQueryData<JourneyStateResponse>(
      journeyQueryKeys.state(),
    );
    const created = await createAppMutation.mutateAsync(data);

    trackUxEvent("application_created");

    try {
      const nextJourney = await queryClient.fetchQuery({
        queryKey: journeyQueryKeys.state(),
        queryFn: () => journeyApi.getJourneyState(),
      });
      celebrateJourneyUnlocks(prevJourney, nextJourney, t, locale, showToast);
    } catch {
      // Ignore if journey state fetch fails
    }

    window.dispatchEvent(new CustomEvent("nawah_app_created"));
    const stayOnHome = openedFromMemberHome.current;
    openedFromMemberHome.current = false;
    if (!stayOnHome) navigate("/applications");
    return created;
  };

  return (
    <ProtectedRoute>
      <SectionExperienceProvider>
        <EmailVerificationGate>
          <ProfileCompletionGate>
            <ExperienceProgressProvider>
              <FirstApplicationGuidedTourProvider
                enabled={
                  !location.pathname.startsWith("/admin") && !isHomePreview
                }
              >
                <AppContext.Provider value={{ openAddModal }}>
                  <OperationsPerformanceObserver />
                  <div className="workspace-shell min-h-screen bg-app font-sans text-text-primary selection:bg-neutral-200">
                    <AppSidebar
                      collapsed={isSidebarCollapsed}
                      onToggleCollapsed={() =>
                        setIsSidebarCollapsed((collapsed) => !collapsed)
                      }
                    />
                    {!location.pathname.startsWith("/admin") &&
                      !isHomePreview && <JourneyTasksPanel />}

                    <div
                      className={`min-h-screen w-full min-w-0 transition-none lg:transition-[padding] duration-200 ${
                        isSidebarCollapsed ? "lg:ps-20" : "lg:ps-64"
                      }`}
                    >
                      <main className="min-w-0 w-full px-5 py-7 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 lg:py-10">
                        <SectionExposure>
                          <Outlet context={{ openAddModal }} />
                        </SectionExposure>
                      </main>
                    </div>

                    <AddApplicationModal
                      isOpen={isAddModalOpen}
                      journeyQueryEnabled={
                        location.pathname !== "/admin/report-preview"
                      }
                      initialValues={draftValues}
                      onClose={() => {
                        setIsAddModalOpen(false);
                        setDraftValues(null);
                      }}
                      onSubmit={handleCreateApplication}
                    />

                    {celebrationData && (
                      <MilestoneCelebrationModal
                        isOpen={Boolean(celebrationData)}
                        onClose={() => setCelebrationData(null)}
                        title={celebrationData.title}
                        description={celebrationData.description}
                        unlockedItems={celebrationData.unlockedItems}
                        ctaLabel={celebrationData.ctaLabel}
                        onCtaClick={() => {
                          const targetRoute = celebrationData.ctaRoute;
                          setCelebrationData(null);
                          if (targetRoute) {
                            navigate(targetRoute);
                          }
                        }}
                      />
                    )}
                  </div>
                </AppContext.Provider>
              </FirstApplicationGuidedTourProvider>
            </ExperienceProgressProvider>
          </ProfileCompletionGate>
        </EmailVerificationGate>
      </SectionExperienceProvider>
    </ProtectedRoute>
  );
}
