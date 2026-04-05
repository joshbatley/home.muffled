import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth";

interface Props {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = false }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.roles.includes("admin")) {
    return <Navigate to="/me" replace />;
  }

  return <Outlet />;
}
