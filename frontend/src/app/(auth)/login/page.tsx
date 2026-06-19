"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, Zap } from "lucide-react";
import { login, me } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [email, setEmail] = useState("superadmin@nevark.com");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)" }}>

        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,#fff 40px,#fff 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,#fff 40px,#fff 41px)" }} />

        {/* Glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", boxShadow: "0 4px 14px rgba(59,130,246,0.5)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight">Nevark</span>
            <span className="text-blue-400 font-bold text-xl"> MSS</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-bold text-white leading-tight mb-5">
              Enterprise management,
              <br />
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)" }}>
                unified.
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              HR · Projects · Finance · Documents · AI — all in one platform.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-wrap gap-2 mt-8"
          >
            {["Employees", "Projects", "Finance", "Documents", "AI Assistant"].map((f) => (
              <span key={f} className="px-3 py-1 text-xs font-medium rounded-full text-blue-300"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                {f}
              </span>
            ))}
          </motion.div>
        </div>

        <p className="text-slate-600 text-sm relative z-10">© 2025 Nevark. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Nevark MSS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to your Nevark account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{ background: "#f8fafc" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  style={{ background: "#f8fafc" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200",
                "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              )}
              style={{ background: loading ? "#3b82f6" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Secured by Nevark Enterprise Auth · v1.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
