import { Navigate, useLocation } from "react-router";

export default function AdminMembersRedirect() {
  const location = useLocation();
  const search = location.search ? `&${location.search.replace(/^\?/, "")}` : "";
  return <Navigate to={`/admin/community?tab=members${search}`} replace />;
}

