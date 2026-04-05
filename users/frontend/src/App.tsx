import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import MePage from "./pages/MePage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/me" element={<MePage />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/me" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
