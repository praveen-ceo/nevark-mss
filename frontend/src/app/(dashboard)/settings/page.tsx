"use client";

import { useAuthStore } from "@/store/authStore";
import { Building2, Info, Mail, Palette, Shield, User } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();

  const roleLabel = (role: string) =>
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Application and account preferences</p>
      </div>

      {/* Account info */}
      <Section title="Account" icon={User}>
        <InfoRow label="Full Name" value={user?.full_name ?? "—"} icon={User} />
        <InfoRow label="Email" value={user?.email ?? "—"} icon={Mail} />
        <InfoRow
          label="Role"
          value={(user?.roles ?? []).map(roleLabel).join(", ") || "—"}
          icon={Shield}
        />
        <p className="text-xs text-gray-400 mt-3">
          Account details are managed by your system administrator.
        </p>
      </Section>

      {/* Company info placeholder */}
      <Section title="Company" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <PlaceholderField label="Company Name" value="Nevark" />
          <PlaceholderField label="Industry" value="Technology" />
          <PlaceholderField label="Country" value="India" />
          <PlaceholderField label="Timezone" value="Asia/Kolkata (IST)" />
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Company settings are configured by the Super Admin.
        </p>
      </Section>

      {/* Theme/appearance placeholder */}
      <Section title="Appearance" icon={Palette}>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-gray-900">Theme</p>
            <p className="text-xs text-gray-400">Choose your interface theme</p>
          </div>
          <div className="flex gap-2">
            {(["Light", "Dark", "System"] as const).map((t) => (
              <button
                key={t}
                disabled
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                  t === "Light"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Dark mode coming in a future update.
        </p>
      </Section>

      {/* App info */}
      <div className="text-xs text-gray-400 space-y-0.5 px-1">
        <p>Nevark MSS · v1.0.0 · Enterprise</p>
        <p>© {new Date().getFullYear()} Nevark. All rights reserved.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <Icon className="w-4 h-4 text-gray-300 shrink-0" />
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function PlaceholderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 bg-gray-50 text-gray-500 cursor-not-allowed">
        {value}
      </div>
    </div>
  );
}
