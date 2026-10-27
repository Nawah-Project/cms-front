import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../features/auth/store/authStore";
const HomePreview = lazy(() => import("../features/home/HomePageB"));
export default function IndexRedirect() {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  if (loading) return null;
  if (user?.role === "ADMIN" && new URLSearchParams(search).get("labPreview") === "home:B")
    return <Suspense fallback={<p role="status">…</p>}><HomePreview /></Suspense>;
  return <Navigate to="/applications" replace />;
}
