import { Navigate } from "react-router";

export default function AdminActivityRedirect() {
  return <Navigate to="/admin/community?tab=activity" replace />;
}

