import { lazy, Suspense } from "react";
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

const MePage = lazy(() => import("@home/users/pages/MePage"));
const UsersPage = lazy(() => import("@home/users/pages/UsersPage"));
const UserEditorPage = lazy(() => import("@home/users/pages/UserEditorPage"));
const RolesPermissionsPage = lazy(() => import("@home/users/pages/RolesPermissionsPage"));

const RESET_PASSWORD_PATHS = ["/reset-password", "/reset"];

function RemoteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
}

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
              <Route
                path="/me"
                element={
                  <Suspense fallback={<RemoteFallback />}>
                    <MePage />
                  </Suspense>
                }
              />
              <Route element={<AdminRoute />}>
                <Route
                  path="/users"
                  element={
                    <Suspense fallback={<RemoteFallback />}>
                      <UsersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/users/:id"
                  element={
                    <Suspense fallback={<RemoteFallback />}>
                      <UserEditorPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/rbac"
                  element={
                    <Suspense fallback={<RemoteFallback />}>
                      <RolesPermissionsPage />
                    </Suspense>
                  }
                />
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
