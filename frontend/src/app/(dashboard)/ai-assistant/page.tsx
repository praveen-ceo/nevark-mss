"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, Send, Zap } from "lucide-react";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AiMessage {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  data?: Record<string, string>[];
  error?: boolean;
}

interface ChatResponse {
  answer: string;
  intent: string;
  data: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Suggested chips
// ---------------------------------------------------------------------------
const SUGGESTIONS = [
  { label: "Total revenue",         query: "What is total revenue?" },
  { label: "Pending payments",      query: "Show pending payments"  },
  { label: "Active projects",       query: "Show active projects"   },
  { label: "Project finance",       query: "Show project finance"   },
  { label: "Pending tasks",         query: "Show pending tasks"     },
  { label: "Attendance today",      query: "Who has attendance today?" },
  { label: "Product performance",   query: "Show product performance" },
  { label: "Top clients",           query: "Show top clients"       },
  { label: "GST summary",           query: "What is GST amount?"    },
];

const WELCOME: AiMessage = {
  role: "assistant",
  content:
    "Hello! I am your Nevark business intelligence assistant. " +
    "Ask me about revenue, invoices, projects, tasks, attendance, products, or clients. " +
    "I query your live MSS database for real-time answers.",
};

// ---------------------------------------------------------------------------
// Data table rendered inside assistant bubble
// ---------------------------------------------------------------------------
function DataTable({ data }: { data: Record<string, string>[] }) {
  if (!data.length) return null;
  const cols = Object.keys(data[0]);
  return (
    <div
      className="mt-3 overflow-x-auto rounded-xl"
      style={{ border: "1px solid rgba(212,175,55,0.15)" }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
        <thead>
          <tr style={{ background: "rgba(212,175,55,0.08)" }}>
            {cols.map((c) => (
              <th
                key={c}
                style={{
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  color: "#D4AF37",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid rgba(212,175,55,0.15)",
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {cols.map((c) => (
                <td
                  key={c}
                  style={{
                    padding: "0.5rem 0.75rem",
                    color: "#C0C0C0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row[c] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AiAssistantPage() {
  const [messages, setMessages] = useState<AiMessage[]>([WELCOME]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const query = text.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await apiClient.post<ChatResponse>("/ai/chat", { message: query });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          intent: res.data.intent,
          data: res.data.data ?? [],
        },
      ]);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to get a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: detail, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
          }}
        >
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#E5E7EB" }}>
              AI Assistant
            </h1>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff" }}
            >
              BETA
            </span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#6B7280" }}>
            Rule-based business intelligence · Live database
          </p>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="flex gap-2 flex-wrap mb-4 flex-shrink-0">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => sendMessage(s.query)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "#9CA3AF",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(124,58,237,0.18)";
                e.currentTarget.style.color = "#D4AF37";
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(124,58,237,0.08)";
              e.currentTarget.style.color = "#9CA3AF";
              e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-4 space-y-4 mb-4"
        style={{
          background: "rgba(11,15,25,0.6)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 mr-2"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)" }}
                >
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={
                  msg.role === "user"
                    ? {
                        background: "linear-gradient(135deg, #7C3AED 0%, #6d28d9 100%)",
                        color: "#fff",
                        borderBottomRightRadius: "0.25rem",
                        boxShadow: "0 2px 12px rgba(124,58,237,0.3)",
                      }
                    : {
                        background: msg.error
                          ? "rgba(239,68,68,0.1)"
                          : "linear-gradient(145deg, #1a2234 0%, #141c2e 100%)",
                        border: `1px solid ${msg.error ? "rgba(239,68,68,0.25)" : "rgba(192,192,192,0.1)"}`,
                        color: msg.error ? "#f87171" : "#C0C0C0",
                        borderBottomLeftRadius: "0.25rem",
                      }
                }
              >
                <p style={{ fontSize: "0.875rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </p>
                {msg.data && msg.data.length > 0 && <DataTable data={msg.data} />}
                {msg.intent && msg.intent !== "general_help" && (
                  <p
                    className="mt-2"
                    style={{ fontSize: "0.65rem", color: "#4B5563", letterSpacing: "0.06em" }}
                  >
                    INTENT: {msg.intent.replace(/_/g, " ").toUpperCase()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)" }}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl"
              style={{
                background: "linear-gradient(145deg, #1a2234 0%, #141c2e 100%)",
                border: "1px solid rgba(192,192,192,0.1)",
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#8B5CF6" }} />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 flex-shrink-0"
        style={{
          background: "linear-gradient(145deg, #141c2e 0%, #111827 100%)",
          border: "1px solid rgba(212,175,55,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about revenue, projects, tasks, attendance…"
          disabled={loading}
          style={{
            flex: 1,
            background: "transparent",
            outline: "none",
            fontSize: "0.875rem",
            color: "#E5E7EB",
            border: "none",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all"
          style={{
            background:
              loading || !input.trim()
                ? "rgba(124,58,237,0.2)"
                : "linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            boxShadow:
              loading || !input.trim() ? "none" : "0 2px 10px rgba(124,58,237,0.4)",
          }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
