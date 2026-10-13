import React, { createContext, useContext, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { AddApplicationModal } from "../components/AddApplicationModal";
import { AppSidebar } from "../components/AppSidebar";
import { api } from "../services/api";
import type { CreateApplicationInput } from "../types";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { ProfileCompletionGate } from "../features/profile/ProfileCompletionGate";
import { useI18n } from "../i18n";
import { useToast } from "../components/ui/ToastProvider";
import { trackUxEvent } from "../utils/uxAnalytics";

interface AppContextType {
  openAddModal: () => void;
}

const AppContext = createContext<AppContextType>({
  openAddModal: () => {},
});

export function useAppModal() {
  return useContext(AppContext);
}

export default function Layout() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateApplication = async (data: CreateApplicationInput) => {
    const created = await api.createApplication(data);
    showToast({
      message: t("applications.applicationCreated"),
      variant: "success",
    });
    trackUxEvent("application_created", { company: created.companyName });
    // Navigate to applications page to see the new addition
    navigate("/applications");
    return created;
  };

  return (
    <ProtectedRoute>
      <ProfileCompletionGate>
      <AppContext.Provider
        value={{ openAddModal: () => setIsAddModalOpen(true) }}
      >
        <div className="min-h-screen bg-app font-sans text-text-primary selection:bg-neutral-200">
          <AppSidebar />

          <div className="min-h-screen w-full lg:ps-64">
            <main className="w-full px-5 py-7 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 lg:py-10">
              <Outlet
                context={{ openAddModal: () => setIsAddModalOpen(true) }}
              />
            </main>
          </div>

          <AddApplicationModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleCreateApplication}
          />
        </div>
      </AppContext.Provider>
      </ProfileCompletionGate>
    </ProtectedRoute>
  );
}
