import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@home/auth";
import Loading from "./Loading";

export default function ProtectedRoute({
  allowForcePasswordChange = false,
}: {
  allowForcePasswordChange?: boolean;
}) {
  const { user, isLoading } = useSession();

  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.forcePasswordChange && !allowForcePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
