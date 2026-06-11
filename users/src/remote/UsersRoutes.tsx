import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "@home/auth";
import MePage from "../pages/MePage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import UserEditorPage from "../pages/UserEditorPage";
import UsersPage from "../pages/UsersPage";

function MePageRoute() {
  const { user } = useSession();
  return <MePage user={user} />;
}

function UserEditorPageRoute() {
  const { refreshUser } = useSession();
  return <UserEditorPage refreshUser={refreshUser} />;
}

function RolesPermissionsPageRoute() {
  const { refreshUser } = useSession();
  return <RolesPermissionsPage refreshUser={refreshUser} />;
}

/** Standalone users app routing (portal host defines these routes itself). */
export default function UsersRoutes() {
  return (
    <Routes>
      <Route path="/me" element={<MePageRoute />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:id" element={<UserEditorPageRoute />} />
      <Route path="/rbac" element={<RolesPermissionsPageRoute />} />
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
}
