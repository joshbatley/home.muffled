export interface MyPermissionsRow {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  forcePasswordChange: boolean;
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  force_password_change: boolean;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  created_at?: string;
}

export interface PermissionRow {
  id: string;
  key: string;
  description: string | null;
  created_at?: string;
}
