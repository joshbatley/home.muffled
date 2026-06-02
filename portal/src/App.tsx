import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "@home/auth";
import AppFrame from "./components/AppFrame";
import Loading from "./components/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const UsersRoutesRemote = lazy(() => import("usersRemote/UsersRoutes"));

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
            <Route
              path="*"
              element={
                <AppFrame>
                  <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading app...</div>}>
                    <UsersRoutesRemote />
                  </Suspense>
                </AppFrame>
              }
            />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
