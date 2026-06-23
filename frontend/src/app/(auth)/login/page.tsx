"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, Zap } from "lucide-react";
import { login, me } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { V, ERR_CLS, EMAIL_RE } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [email, setEmail]     = useState("superadmin@nevark.com");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [fe, setFe]           = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    const emailErr = V.chain(V.required, V.email)(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = V.required(password, "Password");
    if (pwErr) errs.password = pwErr;
    setFe(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setError(null);
    setLoading(true);
    try {
      const tokens = await login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await me();
      setUser(user);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid credentials";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#0B0F19" }}
    >
      {/* ── Left panel — branding ── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0B0F19 0%, #111827 60%, #0d1220 100%)",
          borderRight: "1px solid rgba(212,175,55,0.12)",
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 48px,rgba(255,255,255,0.025) 48px,rgba(255,255,255,0.025) 49px)," +
              "repeating-linear-gradient(90deg,transparent,transparent 48px,rgba(255,255,255,0.025) 48px,rgba(255,255,255,0.025) 49px)",
          }}
        />

        {/* Violet glow orb */}
        <div
          className="absolute top-[38%] left-[40%] -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Gold accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #D4AF37 40%, #F4D03F 60%, transparent)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #b8962e 100%)",
              boxShadow: "0 4px 16px rgba(212,175,55,0.4)",
            }}
          >
            <Zap className="w-5 h-5" style={{ color: "#0B0F19" }} />
          </div>
          <div>
            <p style={{ color: "#D4AF37", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              NEVARK
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "0.625rem", letterSpacing: "0.16em", textTransform: "uppercase", lineHeight: 1.2 }}>
              Enterprise Suite
            </p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <p
              style={{
                fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase",
                color: "#D4AF37", marginBottom: "1rem", fontWeight: 600,
              }}
            >
              Management &amp; Smart System
            </p>
            <h1
              style={{
                fontSize: "2.75rem", fontWeight: 800, lineHeight: 1.15,
                color: "#E5E7EB", marginBottom: "1.25rem", letterSpacing: "-0.03em",
              }}
            >
              NEVARK GROUPS
              <br />
              <span
                style={{
                  backgroundImage: "linear-gradient(135deg, #D4AF37 0%, #F4D03F 50%, #c9a227 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Enterprise Platform
              </span>
            </h1>
            <p style={{ color: "#6B7280", fontSize: "1rem", lineHeight: 1.7, maxWidth: "420px" }}>
              HR · Products · Finance · Projects · Documents · AI — unified in one premium system.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap gap-2 mt-8"
          >
            {["Employees", "Products", "Finance", "Projects", "AI Assistant"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 text-xs font-medium rounded-full"
                style={{
                  background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  color: "#D4AF37",
                }}
              >
                {f}
              </span>
            ))}
          </motion.div>
        </div>

        <p style={{ color: "#374151", fontSize: "0.75rem", position: "relative", zIndex: 10 }}>
          © 2025 Nevark Groups. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "#0B0F19" }}
      >
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "linear-gradient(145deg, #141c2e 0%, #111827 100%)",
              border: "1px solid rgba(212,175,55,0.15)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-7 lg:hidden">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #D4AF37, #b8962e)" }}
              >
                <Zap className="w-4 h-4" style={{ color: "#0B0F19" }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "#D4AF37" }}>NEVARK</span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
                style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5CF6" }} />
                <span style={{ fontSize: "0.65rem", color: "#8B5CF6", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Secure Sign-In
                </span>
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#E5E7EB", marginBottom: "0.35rem", letterSpacing: "-0.02em" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                Sign in to your Nevark MSS account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "#4B5563" }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fe.email) setFe(p => ({ ...p, email: "" })); }}
                    required
                    placeholder="you@nevark.com"
                    style={{
                      width: "100%",
                      paddingLeft: "2.5rem",
                      paddingRight: "1rem",
                      paddingTop: "0.75rem",
                      paddingBottom: "0.75rem",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(192,192,192,0.12)",
                      borderRadius: "0.75rem",
                      fontSize: "0.875rem",
                      color: "#FFFFFF",
                      outline: "none",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.25), 0 0 0 3px rgba(124,58,237,0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(192,192,192,0.12)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.25)";
                    }}
                  />
                </div>
                {fe.email && <span className={ERR_CLS} style={{ color: "#F87171" }}>{fe.email}</span>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "#4B5563" }}
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fe.password) setFe(p => ({ ...p, password: "" })); }}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      paddingLeft: "2.5rem",
                      paddingRight: "2.75rem",
                      paddingTop: "0.75rem",
                      paddingBottom: "0.75rem",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(192,192,192,0.12)",
                      borderRadius: "0.75rem",
                      fontSize: "0.875rem",
                      color: "#FFFFFF",
                      outline: "none",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.25), 0 0 0 3px rgba(124,58,237,0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(192,192,192,0.12)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.25)";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#4B5563" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#4B5563")}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fe.password && <span className={ERR_CLS} style={{ color: "#F87171" }}>{fe.password}</span>}
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#f87171",
                    fontSize: "0.875rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  marginTop: "0.5rem",
                  padding: "0.8rem 1rem",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "#fff",
                  background: loading
                    ? "rgba(124,58,237,0.6)"
                    : "linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)",
                  boxShadow: loading ? "none" : "0 4px 18px rgba(124,58,237,0.4)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,0.55)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(124,58,237,0.4)";
                  e.currentTarget.style.transform = "translateY(0)";
                       }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sign in to Nevark MSS
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
