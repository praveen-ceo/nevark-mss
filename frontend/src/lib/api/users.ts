import { apiClient } from "./client";

// ---------------------------------------------------------------------------
// Types matching backend ProfileResponse / ProfileUpdate / PasswordChange*
// ---------------------------------------------------------------------------

export interface ProfileResponse {
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  // Employee fields — null when no employee record exists
  employee_id: string | null;
  employee_code: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department_id: string | null;
  department_name: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  job_title?: string;
  department_id?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<ProfileResponse> {
  const res = await apiClient.get<ProfileResponse>("/users/me");
  return res.data;
}

export async function updateProfile(data: ProfileUpdate): Promise<ProfileResponse> {
  const res = await apiClient.put<ProfileResponse>("/users/me", data);
  return res.data;
}

export async function changePassword(
  data: PasswordChangeRequest
): Promise<PasswordChangeResponse> {
  const res = await apiClient.put<PasswordChangeResponse>("/users/change-password", data);
  return res.data;
}
