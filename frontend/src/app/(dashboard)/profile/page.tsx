"use client";

import { useAuthStore } from "@/store/authStore";
import { Mail, Shield, User, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuthStore();

  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = (role: string) =>
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Your account information</p>
      </div>

      {/* Avatar + name card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900 truncate">{user?.full_name ?? "—"}</p>
          <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(user?.roles ?? []).map((r) => (
              <span
                key={r}
                className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium"
              >
                {roleLabel(r)}
              </span>
            ))}
          </div>
        </div>
        {user?.is_verified && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />Verified
          </div>
        )}
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Account Details</p>
          <div className="space-y-4">
            <Row icon={User} label="Full Name" value={user?.full_name ?? "—"} />
            <Row icon={Mail} label="Email" value={user?.email ?? "—"} />
            <Row
              icon={Shield}
              label="Role"
              value={(user?.roles ?? []).map(roleLabel).join(", ") || "—"}
            />
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Account Status</p>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                user?.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {user?.is_active ? "Active" : "Inactive"}
            </span>
            {user?.is_verified && (
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                Email Verified
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        To update your name or password, contact your system administrator.
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
