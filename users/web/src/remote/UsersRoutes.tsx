import { hasRole, useAuth } from "@home/auth-ts";
import { Navigate, Route, Routes } from "react-router-dom";
import MePage from "../pages/MePage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import UserEditorPage from "../pages/UserEditorPage";
import UsersPage from "../pages/UsersPage";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!hasRole(user, "admin")) {
    return <Navigate to="/me" replace />;
  }
  return <>{children}</>;
}

export default function UsersRoutes() {
  return (
    <Routes>
      <Route path="/me" element={<MePage />} />
      <Route
        path="/users"
        element={
          <RequireAdmin>
            <UsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/users/:id"
        element={
          <RequireAdmin>
            <UserEditorPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/rbac"
        element={
          <RequireAdmin>
            <RolesPermissionsPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
}
