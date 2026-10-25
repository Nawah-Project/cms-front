import { Navigate } from "react-router";

export default function AdminGroupsRedirect() {
  return <Navigate to="/admin/community?tab=groups" replace />;
}

