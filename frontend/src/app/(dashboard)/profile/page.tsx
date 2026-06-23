"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  getProfile,
  updateProfile,
  changePassword,
  type ProfileResponse,
} from "@/lib/api/users";
import {
  Mail,
  Shield,
  User,
  CheckCircle2,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Pencil,
  X,
  Save,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { AxiosError } from "axios";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfileForm(form: ProfileFormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (form.full_name !== undefined && form.full_name.trim().length < 2)
    errs.full_name = "Name must be at least 2 characters.";
  if (form.first_name !== undefined && form.first_name.trim().length < 2)
    errs.first_name = "First name must be at least 2 characters.";
  if (form.last_name !== undefined && form.last_name.trim().length < 2)
    errs.last_name = "Last name must be at least 2 characters.";
  if (form.email && !EMAIL_RE.test(form.email))
    errs.email = "Enter a valid email address.";
  if (form.phone && !PHONE_RE.test(form.phone))
    errs.phone = "Phone must be a valid 10-digit Indian mobile number (starts 6-9).";
  return errs;
}

function validatePasswordForm(form: PasswordFormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.current_password) errs.current_password = "Current password is required.";
  if (form.new_password.length < 8)
    errs.new_password = "Password must be at least 8 characters.";
  if (form.confirm_password !== form.new_password)
    errs.confirm_password = "Passwords do not match.";
  return errs;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileFormState {
  full_name: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  job_title: string;
}

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const EMPTY_PW: PasswordFormState = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function profileToForm(p: ProfileResponse): ProfileFormState {
  return {
    full_name: p.full_name ?? "",
    email: p.email,
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    job_title: p.job_title ?? "",
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { user } = useAuthStore();

  // ── Profile state ──
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Edit state ──
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Password state ──
  const [pwForm, setPwForm] = useState<PasswordFormState>(EMPTY_PW);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});

  // ── Load profile ──
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await getProfile();
      setProfile(data);
      setForm(profileToForm(data));
    } catch {
      setProfileError("Failed to load profile. Please refresh the page.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── Avatar initials (fall back to authStore while profile loads) ──
  const initials = ((profile?.full_name ?? user?.full_name ?? "U"))
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = (role: string) =>
    role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Edit handlers ──
  const startEdit = useCallback(() => {
    if (profile) setForm(profileToForm(profile));
    setFormErrors({});
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    if (profile) setForm(profileToForm(profile));
    setFormErrors({});
    setSaveError(null);
    setEditing(false);
  }, [profile]);

  const handleFormChange = useCallback(
    (field: keyof ProfileFormState, value: string) => {
      setForm((prev) => prev ? { ...prev, [field]: value } : prev);
      setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form) return;
    const errs = validateProfileForm(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: Record<string, string> = {};
      if (form.full_name.trim())  payload.full_name  = form.full_name.trim();
      if (form.email.trim())      payload.email      = form.email.trim();
      if (form.first_name.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name.trim())  payload.last_name  = form.last_name.trim();
      if (form.phone.trim())      payload.phone      = form.phone.trim();
      if (form.address.trim())    payload.address    = form.address.trim();
      if (form.job_title.trim())  payload.job_title  = form.job_title.trim();

      const updated = await updateProfile(payload);
      setProfile(updated);
      setForm(profileToForm(updated));
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      const axErr = err as AxiosError<{ detail: string }>;
      const detail = axErr.response?.data?.detail;
      setSaveError(
        typeof detail === "string"
          ? detail
          : "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [form]);

  // ── Password handlers ──
  const handlePwChange = useCallback(
    (field: keyof PasswordFormState, value: string) => {
      setPwForm((prev) => ({ ...prev, [field]: value }));
      setPwErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    },
    []
  );

  const handlePasswordSubmit = useCallback(async () => {
    const errs = validatePasswordForm(pwForm);
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    setPwSuccess(null);
    setPwError(null);
    try {
      const res = await changePassword(pwForm);
      setPwSuccess(res.message);
      setPwForm(EMPTY_PW);
      setTimeout(() => setPwSuccess(null), 5000);
    } catch (err) {
      const axErr = err as AxiosError<{ detail: string }>;
      const detail = axErr.response?.data?.detail;
      setPwError(
        typeof detail === "string"
          ? detail
          : "Failed to update password. Please try again."
      );
    } finally {
      setPwLoading(false);
    }
  }, [pwForm]);

  const toggleShowPw = useCallback((field: string) => {
    setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // ── Loading skeleton ──
  if (profileLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Your account information</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-3 text-sm text-gray-400">Loading profile…</span>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        </div>
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {profileError}
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Your account information</p>
      </div>

      {/* Save success toast */}
      {saveSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Profile updated successfully.
        </div>
      )}

      {/* Avatar + name card (unchanged) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900 truncate">
            {profile?.full_name ?? "—"}
          </p>
          <p className="text-sm text-gray-500 truncate">{profile?.email}</p>
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
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </div>
        )}
      </div>

      {/* ── Account Details card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {/* Header row with Edit / Save / Cancel */}
        <div className="px-6 py-4 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Account Details
          </p>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Save error */}
        {saveError && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {saveError}
          </div>
        )}

        {/* Fields */}
        <div className="px-6 py-4 space-y-4">
          <EditableRow
            icon={User}
            label="Full Name"
            field="full_name"
            value={form?.full_name ?? ""}
            displayValue={profile?.full_name ?? "—"}
            editing={editing}
            error={formErrors.full_name}
            onChange={handleFormChange}
          />
          <EditableRow
            icon={Mail}
            label="Email"
            field="email"
            type="email"
            value={form?.email ?? ""}
            displayValue={profile?.email ?? "—"}
            editing={editing}
            error={formErrors.email}
            onChange={handleFormChange}
          />
          <EditableRow
            icon={User}
            label="First Name"
            field="first_name"
            value={form?.first_name ?? ""}
            displayValue={profile?.first_name ?? "—"}
            editing={editing}
            error={formErrors.first_name}
            onChange={handleFormChange}
            placeholder="First name"
          />
          <EditableRow
            icon={User}
            label="Last Name"
            field="last_name"
            value={form?.last_name ?? ""}
            displayValue={profile?.last_name ?? "—"}
            editing={editing}
            error={formErrors.last_name}
            onChange={handleFormChange}
            placeholder="Last name"
          />
          <EditableRow
            icon={Phone}
            label="Phone"
            field="phone"
            type="tel"
            value={form?.phone ?? ""}
            displayValue={profile?.phone ?? "—"}
            editing={editing}
            error={formErrors.phone}
            onChange={handleFormChange}
            placeholder="10-digit mobile number"
          />
          <EditableRow
            icon={MapPin}
            label="Address"
            field="address"
            value={form?.address ?? ""}
            displayValue={profile?.address ?? "—"}
            editing={editing}
            error={formErrors.address}
            onChange={handleFormChange}
            placeholder="Your address"
          />
          <EditableRow
            icon={Briefcase}
            label="Designation"
            field="job_title"
            value={form?.job_title ?? ""}
            displayValue={profile?.job_title ?? "—"}
            editing={editing}
            error={formErrors.job_title}
            onChange={handleFormChange}
            placeholder="Job title / designation"
          />
          {/* Department — read-only (not updatable via free text; requires UUID) */}
          <Row
            icon={Building2}
            label="Department"
            value={profile?.department_name ?? "—"}
          />
          {/* Role — from authStore */}
          <Row
            icon={Shield}
            label="Role"
            value={(user?.roles ?? []).map(roleLabel).join(", ") || "—"}
          />
        </div>

        {/* Account Status */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Account Status
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                profile?.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {profile?.is_active ? "Active" : "Inactive"}
            </span>
            {user?.is_verified && (
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                Email Verified
              </span>
            )}
            {profile?.employee_code && (
              <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                {profile.employee_code}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Change Password
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Success */}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {pwSuccess}
            </div>
          )}
          {/* Error */}
          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {pwError}
            </div>
          )}

          <PasswordField
            label="Current Password"
            field="current_password"
            value={pwForm.current_password}
            show={!!showPw.current_password}
            error={pwErrors.current_password}
            onToggle={() => toggleShowPw("current_password")}
            onChange={(v) => handlePwChange("current_password", v)}
            disabled={pwLoading}
          />
          <PasswordField
            label="New Password"
            field="new_password"
            value={pwForm.new_password}
            show={!!showPw.new_password}
            error={pwErrors.new_password}
            hint="Minimum 8 characters"
            onToggle={() => toggleShowPw("new_password")}
            onChange={(v) => handlePwChange("new_password", v)}
            disabled={pwLoading}
          />
          <PasswordField
            label="Confirm Password"
            field="confirm_password"
            value={pwForm.confirm_password}
            show={!!showPw.confirm_password}
            error={pwErrors.confirm_password}
            onToggle={() => toggleShowPw("confirm_password")}
            onChange={(v) => handlePwChange("confirm_password", v)}
            disabled={pwLoading}
          />

          <div className="pt-1">
            <button
              onClick={handlePasswordSubmit}
              disabled={pwLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {pwLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Lock className="w-4 h-4" />}
              {pwLoading ? "Updating…" : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type ProfileField = "full_name" | "email" | "first_name" | "last_name" | "phone" | "address" | "job_title";

function EditableRow({
  icon: Icon,
  label,
  field,
  value,
  displayValue,
  editing,
  error,
  onChange,
  type = "text",
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  field: ProfileField;
  value: string;
  displayValue: string;
  editing: boolean;
  error?: string;
  onChange: (field: ProfileField, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-1">{label}</p>
        {editing ? (
          <div>
            <input
              type={type}
              value={value}
              placeholder={placeholder ?? label}
              onChange={(e) => onChange(field, e.target.value)}
              className={`w-full text-sm px-3 py-1.5 rounded-lg border ${
                error
                  ? "border-red-300 focus:border-red-400 bg-red-50"
                  : "border-gray-200 focus:border-blue-400 bg-white"
              } outline-none transition-colors focus:ring-2 ${
                error ? "focus:ring-red-100" : "focus:ring-blue-50"
              }`}
            />
            {error && (
              <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900">{displayValue}</p>
        )}
      </div>
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

function PasswordField({
  label,
  value,
  show,
  error,
  hint,
  onToggle,
  onChange,
  disabled,
}: {
  label: string;
  field: string;
  value: string;
  show: boolean;
  error?: string;
  hint?: string;
  onToggle: () => void;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full text-sm px-3 py-2 pr-10 rounded-lg border ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100"
              : "border-gray-200 bg-white focus:border-blue-400 focus:ring-blue-50"
          } outline-none focus:ring-2 transition-colors disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
