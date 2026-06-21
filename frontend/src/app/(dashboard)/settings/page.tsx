"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Building2, Info, Mail, Monitor, Moon, Palette, Shield, Sun, User } from "lucide-react";

type Theme = "dark" | "light" | "system";

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------
function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  return (localStorage.getItem("nevark-theme") as Theme) ?? "dark";
}

function applyTheme(t: Theme) {
  localStorage.setItem("nevark-theme", t);
  let resolved: "dark" | "light" = "dark";
  if (t === "light") resolved = "light";
  else if (t === "system") {
    resolved = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", resolved);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState<Theme>("dark");

  // Read stored preference on mount
  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  const roleLabel = (role: string) =>
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const THEME_OPTIONS: { value: Theme; label: string; Icon: React.ElementType }[] = [
    { value: "light",  label: "Light",  Icon: Sun     },
    { value: "dark",   label: "Dark",   Icon: Moon    },
    { value: "system", label: "System", Icon: Monitor },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Application and account preferences
        </p>
      </div>

      {/* Account */}
      <Section title="Account" icon={User}>
        <InfoRow label="Full Name" value={user?.full_name ?? "—"} icon={User} />
        <InfoRow label="Email"     value={user?.email ?? "—"}      icon={Mail} />
        <InfoRow
          label="Role"
          value={(user?.roles ?? []).map(roleLabel).join(", ") || "—"}
          icon={Shield}
        />
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          Account details are managed by your system administrator.
        </p>
      </Section>

      {/* Company */}
      <Section title="Company" icon={Building2}>
        <div className="grid grid-cols-2 gap-4">
          <PlaceholderField label="Company Name" value="Nevark Groups" />
          <PlaceholderField label="Industry"     value="Technology"    />
          <PlaceholderField label="Country"      value="India"         />
          <PlaceholderField label="Timezone"     value="Asia/Kolkata (IST)" />
        </div>
        <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Info className="w-3 h-3" />
          Company settings are configured by the Super Admin.
        </p>
      </Section>

      {/* Appearance — WORKING theme switcher */}
      <Section title="Appearance" icon={Palette}>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Theme
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Choose your interface theme preference
            </p>
          </div>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, #7C3AED 0%, #6d28d9 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: active ? "#fff" : "var(--text-secondary)",
                    border: active
                      ? "1px solid rgba(139,92,246,0.4)"
                      : "1px solid var(--border-metal)",
                    boxShadow: active ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Info className="w-3 h-3" />
          {theme === "system"
            ? "Following your OS color scheme preference."
            : theme === "light"
            ? "Light mode active. Switch to Dark for the premium experience."
            : "Premium dark metallic theme active."}
        </p>
      </Section>

      {/* App info */}
      <div className="text-xs space-y-0.5 px-1" style={{ color: "var(--text-muted)" }}>
        <p>Nevark MSS · v1.0.0 · Enterprise</p>
        <p>© {new Date().getFullYear()} Nevark Groups. All rights reserved.</p>
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
    <div className="premium-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "#8B5CF6" }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
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
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function PlaceholderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className="text-sm px-3 py-2 rounded-lg"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
