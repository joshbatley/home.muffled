import { Navigate, Route, Routes } from "react-router-dom";
import MePage from "../pages/MePage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import UserEditorPage from "../pages/UserEditorPage";
import UsersPage from "../pages/UsersPage";

/** Standalone users app routing (portal host defines these routes itself). */
export default function UsersRoutes() {
  return (
    <Routes>
      <Route path="/me" element={<MePage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:id" element={<UserEditorPage />} />
      <Route path="/rbac" element={<RolesPermissionsPage />} />
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
}
