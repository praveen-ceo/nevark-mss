export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string | null;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  roles: UserRole[];
}