import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router";
import { useSectionDesign } from "../features/ux-lab/SectionExperience";
import { useAuth } from "../features/auth/store/authStore";
const HomePreview = lazy(() => import("../features/home/HomePageB"));
export default function IndexRedirect() {
  const { user, loading } = useAuth();
  const home = useSectionDesign("home");
  const { search } = useLocation();
  if (loading) return null;
  if (
    user?.role === "ADMIN" &&
    new URLSearchParams(search).get("labPreview") === "home:B"
  )
    return (
      <Suspense fallback={<p role="status">…</p>}>
        <HomePreview />
      </Suspense>
    );
  if (user?.role === "USER" && home.loading) return <p role="status">…</p>;
  if (user?.role === "USER" && home.version === "B")
    return (
      <Suspense fallback={<p role="status">…</p>}>
        <HomePreview preview={false} />
      </Suspense>
    );
  return <Navigate to="/applications" replace />;
}
