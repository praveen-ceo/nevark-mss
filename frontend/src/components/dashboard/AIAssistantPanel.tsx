"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "ai"; text: string; }

const SUGGESTIONS = ["Revenue summary", "Overdue invoices", "Projects at risk"];

const RESPONSES: Record<string, string> = {
  "revenue summary": "Revenue YTD is $4.2M, up 14% vs last year. December was the strongest month at $624K.",
  "overdue invoices": "You have 3 overdue invoices totalling $87,500. Oldest is INV-009 at 34 days past due.",
  "projects at risk": "2 projects flagged: ERP Integration (budget 94% spent, 32% remaining) and Cloud Migration (deadline in 5 days).",
};

function getReply(input: string): string {
  const key = Object.keys(RESPONSES).find((k) => input.toLowerCase().includes(k));
  return key ? RESPONSES[key] : "I have analyzed your query. Connect the AI module to get live business insights from your data.";
}

export function AIAssistantPanel() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! Ask me anything about your business data." },
  ]);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", text: input };
    const aiMsg:   Msg = { role: "ai",   text: getReply(input) };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm leading-tight">AI Assistant</p>
          <p className="text-xs text-gray-500">Powered by Nevark AI</p>
        </div>
        <button
          onClick={() => router.push("/ai-assistant")}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Full view <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
            {m.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-purple-600" />
              </div>
            )}
            <div className={cn(
              "max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed",
              m.role === "ai" ? "bg-gray-50 text-gray-800 rounded-tl-sm" : "bg-blue-600 text-white rounded-tr-sm"
            )}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full whitespace-nowrap transition flex-shrink-0"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}