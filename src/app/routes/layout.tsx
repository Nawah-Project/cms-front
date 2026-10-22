import { createContext, useContext, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AddApplicationModal } from "../features/applications/components/AddApplicationModal";
import { AppSidebar } from "../components/AppSidebar";
import { JourneyTasksPanel } from "../components/JourneyTasksPanel";
import type { CreateApplicationInput } from "../types";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { ProfileCompletionGate } from "../features/profile/ProfileCompletionGate";
import { useI18n } from "../i18n";
import { useToast } from "../components/ui/ToastProvider";
import { trackUxEvent } from "../utils/uxAnalytics";
import { useCreateApplication } from "../features/applications/api/applicationsApi";
import { journeyApi } from "../features/journey/api/journeyApi";
import { journeyQueryKeys } from "../features/journey/config/query-keys";
import type { JourneyStateResponse } from "../features/journey/types";
import { celebrateJourneyUnlocks } from "../features/journey/lib/celebrate-unlocks";

export interface AppContextType {
  openAddModal: (initialValues?: Partial<CreateApplicationInput>) => void;
}

const AppContext = createContext<AppContextType>({
  openAddModal: () => {},
});

export function useAppModal() {
  return useContext(AppContext);
}

export default function Layout() {
  const { t, locale } = useI18n();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const createAppMutation = useCreateApplication();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draftValues, setDraftValues] =
    useState<Partial<CreateApplicationInput> | null>(null);
  const navigate = useNavigate();

  const openAddModal = (initialValues?: Partial<CreateApplicationInput>) => {
    setDraftValues(initialValues ?? null);
    setIsAddModalOpen(true);
  };

  const handleCreateApplication = async (data: CreateApplicationInput) => {
    const prevJourney = queryClient.getQueryData<JourneyStateResponse>(
      journeyQueryKeys.state(),
    );
    const created = await createAppMutation.mutateAsync(data);
    showToast({
      message: t("applications.applicationCreated"),
      variant: "success",
    });
    trackUxEvent("application_created", { company: created.companyName });

    try {
      const nextJourney = await queryClient.fetchQuery({
        queryKey: journeyQueryKeys.state(),
        queryFn: () => journeyApi.getJourneyState(),
      });
      celebrateJourneyUnlocks(prevJourney, nextJourney, t, locale, showToast);
    } catch {
      // Ignore if journey state fetch fails
    }

    navigate("/applications");
    return created;
  };

  return (
    <ProtectedRoute>
      <ProfileCompletionGate>
        <AppContext.Provider value={{ openAddModal }}>
          <div className="min-h-screen bg-app font-sans text-text-primary selection:bg-neutral-200">
            <AppSidebar />
            <JourneyTasksPanel />

            <div className="min-h-screen w-full lg:ps-64">
              <main className="w-full px-5 py-7 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 lg:py-10">
                <Outlet context={{ openAddModal }} />
              </main>
            </div>

            <AddApplicationModal
              isOpen={isAddModalOpen}
              initialValues={draftValues}
              onClose={() => {
                setIsAddModalOpen(false);
                setDraftValues(null);
              }}
              onSubmit={handleCreateApplication}
            />
          </div>
        </AppContext.Provider>
      </ProfileCompletionGate>
    </ProtectedRoute>
  );
}
