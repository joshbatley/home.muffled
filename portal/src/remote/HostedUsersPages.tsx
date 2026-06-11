import { lazy, Suspense } from "react";
import { useSession } from "@home/auth";

const RemoteMePage = lazy(() => import("usersRemote/MePage"));
const RemoteUsersPage = lazy(() => import("usersRemote/UsersPage"));
const RemoteUserEditorPage = lazy(() => import("usersRemote/UserEditorPage"));
const RemoteRolesPermissionsPage = lazy(() => import("usersRemote/RolesPermissionsPage"));

function RemoteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
}

export function HostedMePage() {
  const { user } = useSession();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <RemoteMePage user={user} />
    </Suspense>
  );
}

export function HostedUsersPage() {
  return (
    <Suspense fallback={<RemoteFallback />}>
      <RemoteUsersPage />
    </Suspense>
  );
}

export function HostedUserEditorPage() {
  const { refreshUser } = useSession();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <RemoteUserEditorPage refreshUser={refreshUser} />
    </Suspense>
  );
}

export function HostedRolesPermissionsPage() {
  const { refreshUser } = useSession();
  return (
    <Suspense fallback={<RemoteFallback />}>
      <RemoteRolesPermissionsPage refreshUser={refreshUser} />
    </Suspense>
  );
}
