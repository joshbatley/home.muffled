import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "@home/auth";
import { ThemeProvider } from "@/lib/theme-provider";
import AdminRoute from "./components/AdminRoute";
import AppFrame from "./components/AppFrame";
import Loading from "./components/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import {
  HostedMePage,
  HostedRolesPermissionsPage,
  HostedUserEditorPage,
  HostedUsersPage,
} from "./remote/HostedUsersPages";

const RESET_PASSWORD_PATHS = ["/reset-password", "/reset"];

function LoginRoute() {
  const { user, isLoading } = useSession();
  if (isLoading) return <Loading />;
  if (user?.forcePasswordChange) return <Navigate to="/change-password" replace />;
  if (user) return <Navigate to="/me" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {RESET_PASSWORD_PATHS.map((path) => (
            <Route key={path} path={path} element={<ResetPasswordPage />} />
          ))}

          <Route element={<ProtectedRoute allowForcePasswordChange />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppFrame />}>
              <Route path="/me" element={<HostedMePage />} />
              <Route element={<AdminRoute />}>
                <Route path="/users" element={<HostedUsersPage />} />
                <Route path="/users/:id" element={<HostedUserEditorPage />} />
                <Route path="/rbac" element={<HostedRolesPermissionsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/me" replace />} />
            </Route>
          </Route>
        </Routes>
      </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
