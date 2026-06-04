import { hasRole, useSession } from "@home/auth";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
  const { user } = useSession();
  if (!hasRole(user, "admin")) {
    return <Navigate to="/me" replace />;
  }
  return <Outlet />;
}
