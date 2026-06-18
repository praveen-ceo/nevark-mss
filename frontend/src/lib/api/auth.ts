import { apiClient } from "./client";
import type { LoginRequest, TokenResponse, UserOut } from "@/types/auth";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>("/auth/login", data);
  return res.data;
}

export async function me(): Promise<UserOut> {
  const res = await apiClient.get<UserOut>("/auth/me");
  return res.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout", { refresh_token: refreshToken });
}