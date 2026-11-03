import { useState } from 'react';
import { Outlet } from 'react-router';
import { AppSidebar } from '../components/AppSidebar';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { EmailVerificationGate } from '../features/auth/components/EmailVerificationGate';
import { SectionExperienceProvider } from '../features/ux-lab/SectionExperience';

// Staff navigation shell. Programme forms, tours, drawers, and progression are not mounted here.
export default function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  return <ProtectedRoute><EmailVerificationGate><SectionExperienceProvider>
    <div className="workspace-shell min-h-screen bg-app font-sans text-text-primary">
      <AppSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(v => !v)} />
      <div className={`min-h-screen w-full min-w-0 ${collapsed ? 'lg:ps-20' : 'lg:ps-64'}`}>
        <main className="min-w-0 w-full px-5 py-7 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 lg:py-10"><Outlet /></main>
      </div>
    </div>
  </SectionExperienceProvider></EmailVerificationGate></ProtectedRoute>;
}
