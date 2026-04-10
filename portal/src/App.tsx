import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import {
  MePage,
  RolesPermissionsPage,
  ShellAuthProvider,
  UserEditorPage,
  UsersPage,
} from "users-frontend/domain";
import AppFrame from "./components/AppFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/auth";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function LoginRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.forcePasswordChange) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/me" replace />;
  return <LoginPage />;
}

function UsersDomainBridge() {
  const { user, logout, refreshClaims } = useAuth();
  return (
    <ShellAuthProvider value={{ user, logout, refreshClaims }}>
      <Outlet />
    </ShellAuthProvider>
  );
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
            <Route element={<UsersDomainBridge />}>
              <Route element={<AppFrame />}>
                <Route path="/me" element={<MePage />} />
                <Route element={<ProtectedRoute requireAdmin />}>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserEditorPage />} />
                  <Route path="/rbac" element={<RolesPermissionsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/me" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
