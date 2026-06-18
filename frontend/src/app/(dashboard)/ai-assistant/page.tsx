"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Edit3,
  Lightbulb,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  date: string;
  active: boolean;
}

const HISTORY: Conversation[] = [
  { id:"1", title:"Revenue analysis Q4",    preview:"What is our total revenue...", date:"Today",     active:true  },
  { id:"2", title:"Project risk assessment", preview:"Which projects are at risk...", date:"Yesterday", active:false },
  { id:"3", title:"Employee performance",    preview:"Show me top performers...",    date:"2 days ago", active:false },
  { id:"4", title:"Invoice follow-up plan",  preview:"List overdue invoices...",     date:"3 days ago", active:false },
  { id:"5", title:"Client retention report", preview:"Analyse client churn...",      date:"Last week",  active:false },
];

const INIT: ChatMessage[] = [
  { id:"1", role:"ai", content:"Hello! I am Nevark AI, your intelligent business assistant. I can help you analyse revenue, track projects, monitor employees and surface insights from your data. What would you like to explore today?", time:"Now" },
];

const PROMPTS = [
  "Show revenue summary for this month",
  "Which projects are behind schedule?",
  "Top performing employees this quarter",
  "Overdue invoices and their amounts",
  "Client retention rate analysis",
  "Predict next month cash flow",
];

const INSIGHTS = [
  { icon: TrendingUp, color:"text-blue-600 bg-blue-50",    title:"Revenue Up 14%",       desc:"January revenue hit $624K, best month in 2 years." },
  { icon: Wallet,     color:"text-emerald-600 bg-emerald-50", title:"Profit Margin 44%", desc:"Operating costs down 5% due to automation savings."   },
  { icon: Users,      color:"text-purple-600 bg-purple-50",   title:"Team Growth +3%",   desc:"12 new hires in engineering and sales last quarter."  },
];

const MOCK_RESPONSES: Record<string, string> = {
  "revenue":    "Based on current data: Total revenue this month is $624,000, up 14.2% from December. YTD revenue stands at $2.4M against a target of $2.1M. Top contributors are Zenith Industries ($82K) and Innovate Ltd ($56K).",
  "project":    "Project health overview: 18 in progress, 7 in review, 4 on hold. Projects at risk: ERP Integration (budget 68% spent, only 68% complete) and Cloud Migration (deadline in 5 days, 45% progress). Recommend immediate resource review.",
  "employee":   "Top performers this quarter: Kiran Mehta (4.9/5, Sales), Arjun Sharma (4.8/5, Engineering), Anand Krishnan (4.7/5, DevOps). 2 employees currently on leave. Average team performance score: 4.4/5.",
  "invoice":    "Outstanding invoices: INV-024 (TechCorp, $45K, due 25 Jan), INV-008 ($9.5K, due 22 Jan). Overdue: INV-022 (Apex Retail, $31.5K, 14 days overdue), INV-019 (UrbanEdge, $18.5K, 22 days overdue). Total at risk: $50K.",
  "client":     "Client portfolio: 6 active, 1 inactive, 1 prospect. At-risk: BlueSky Ventures (no contact in 3 weeks, $130K revenue). Top client: Zenith Industries ($580K LTV, 7 active projects). Recommend scheduling a review call with BlueSky.",
  "cash flow":  "Projected February cash flow: Expected inflows of $580K (3 invoices due + recurring). Expected outflows of $360K (payroll $280K + vendor $80K). Projected net: $220K. Current cash reserve: 2.3 months of operating expenses.",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  const key = Object.keys(MOCK_RESPONSES).find((k) => lower.includes(k));
  return key
    ? MOCK_RESPONSES[key]
    : "I have analysed your query using the available business data. To provide more accurate insights, please connect live data sources in the Settings panel. I can currently work with mock data for revenue, projects, employees, invoices, clients and cash flow.";
}

function now(): string {
  return new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
}

export default function AIAssistantPage() {
  const [messages, setMessages]     = useState<ChatMessage[]>(INIT);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState<Conversation[]>(HISTORY);
  const [activeConv, setActiveConv] = useState("1");
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");
    setLoading(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role:"user", content:msg, time:now() };
    setMessages((m) => [...m, userMsg]);

    setTimeout(() => {
      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role:"ai", content:getResponse(msg), time:now() };
      setMessages((m) => [...m, aiMsg]);
      setLoading(false);
    }, 900);
  }

  function newChat() {
    setMessages(INIT);
    setActiveConv("");
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New conversation",
      preview: "Start a new query...",
      date: "Now",
      active: true,
    };
    setHistory((h) => [newConv, ...h.map((c) => ({ ...c, active:false }))]);
    setActiveConv(newConv.id);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {history.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl transition text-sm group",
                activeConv === conv.id ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50 border border-transparent"
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className={cn("font-medium leading-tight line-clamp-1", activeConv === conv.id ? "text-blue-700" : "text-gray-800")}>
                  {conv.title}
                </p>
                <Edit3 className="w-3 h-3 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{conv.preview}</p>
              <p className="text-[10px] text-gray-300 mt-1">{conv.date}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-w-0">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Nevark AI</p>
            <p className="text-xs text-gray-500">Business intelligence assistant</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Online
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.25 }}
                className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
              >
                {m.role === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                <div className={cn("max-w-[75%] flex flex-col gap-1", m.role === "user" && "items-end")}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    m.role === "ai"
                      ? "bg-gray-50 text-gray-800 rounded-tl-sm"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  )}>
                    {m.content}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{m.time}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                {[0,1,2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y:[0,-4,0] }}
                    transition={{ duration:0.6, repeat:Infinity, delay:i*0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 pb-3 flex gap-2 overflow-x-auto border-t border-gray-100 pt-3">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full whitespace-nowrap transition flex-shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about your business data..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">AI responses use mock data. Connect live data sources for real insights.</p>
        </div>
      </div>

      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-gray-900 text-sm">Business Insights</p>
          </div>
          <div className="space-y-3">
            {INSIGHTS.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex items-start gap-2.5">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color.split(" ")[1])}>
                  <Icon className={cn("w-4 h-4", color.split(" ")[0])} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{title}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-blue-700 rounded-2xl p-4 text-white">
          <Sparkles className="w-5 h-5 mb-2 opacity-80" />
          <p className="font-semibold text-sm mb-1">Pro Tip</p>
          <p className="text-xs opacity-75 leading-relaxed">
            Ask specific questions like "compare Q3 vs Q4 revenue" or "projects over budget" for detailed analysis.
          </p>
        </div>
      </div>
    </div>
  );
}