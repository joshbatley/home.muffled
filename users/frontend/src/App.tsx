import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import MePage from "./pages/MePage";
import UsersPage from "./pages/UsersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import UserEditorPage from "./pages/UserEditorPage";

function LoginRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.forcePasswordChange) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/me" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute allowForcePasswordChange />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/me" element={<MePage />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserEditorPage />} />
            <Route path="/rbac" element={<RolesPermissionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/me" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
