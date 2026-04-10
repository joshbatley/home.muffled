import { AuthProvider, useAuth } from "@home/auth-ts";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppFrame from "./components/AppFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const UsersRoutesRemote = lazy(() => import("usersRemote/UsersRoutes"));

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
      </AuthProvider>
    </BrowserRouter>
  );
}
