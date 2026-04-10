import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MePage from "./pages/MePage";
import UsersPage from "./pages/UsersPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import UserEditorPage from "./pages/UserEditorPage";
import { ShellAuthProvider } from "./context/shellAuth";

const shellAuthStub = {
  user: null,
  logout: async () => {},
  refreshClaims: async () => {},
};

export default function App() {
  return (
    <BrowserRouter>
      <ShellAuthProvider value={shellAuthStub}>
        <Routes>
          <Route path="/me" element={<MePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserEditorPage />} />
          <Route path="/rbac" element={<RolesPermissionsPage />} />

          <Route path="*" element={<Navigate to="/me" replace />} />
        </Routes>
      </ShellAuthProvider>
    </BrowserRouter>
  );
}
