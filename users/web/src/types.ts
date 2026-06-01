export interface Role {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  key: string;
  description: string;
}

export interface UserSummary {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}
