import { Navigate } from "react-router";

export default function AdminNotificationsRedirect() {
  return <Navigate to="/admin/operations" replace />;
}

