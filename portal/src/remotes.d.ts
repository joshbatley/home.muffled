declare module "usersRemote/MePage" {
  import type { ComponentType } from "react";
  import type { AppUser } from "@home/auth";
  const MePage: ComponentType<{ user: AppUser | null }>;
  export default MePage;
}

declare module "usersRemote/UsersPage" {
  import type { ComponentType } from "react";
  const UsersPage: ComponentType;
  export default UsersPage;
}

declare module "usersRemote/UserEditorPage" {
  import type { ComponentType } from "react";
  const UserEditorPage: ComponentType<{ refreshUser: () => Promise<void> }>;
  export default UserEditorPage;
}

declare module "usersRemote/RolesPermissionsPage" {
  import type { ComponentType } from "react";
  const RolesPermissionsPage: ComponentType<{ refreshUser: () => Promise<void> }>;
  export default RolesPermissionsPage;
}
