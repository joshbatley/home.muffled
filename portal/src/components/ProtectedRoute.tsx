import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@home/auth-ts";
import Loading from "./Loading";

interface Props {
  allowForcePasswordChange?: boolean;
}

export default function ProtectedRoute({ allowForcePasswordChange = false }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.forcePasswordChange && !allowForcePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
