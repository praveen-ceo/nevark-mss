"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Filter,
  Image,
  Search,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Doc {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  date: string;
  uploadedBy: string;
  tags: string[];
}

const DOCS: Doc[] = [
  { id:"1",  name:"Q4 2024 Financial Report",     category:"Reports",    type:"pdf",  size:"3.2 MB", date:"10 Jan", uploadedBy:"Sneha R.",  tags:["finance","quarterly"]         },
  { id:"2",  name:"Employee Handbook v3.1",        category:"HR",         type:"docx", size:"1.1 MB", date:"08 Jan", uploadedBy:"Priya N.",  tags:["hr","policy"]                 },
  { id:"3",  name:"TechCorp MSA Agreement",        category:"Contracts",  type:"pdf",  size:"2.7 MB", date:"06 Jan", uploadedBy:"Kiran M.",  tags:["legal","client"]              },
  { id:"4",  name:"Project Budget Template",       category:"Finance",    type:"xlsx", size:"0.8 MB", date:"05 Jan", uploadedBy:"Sneha R.",  tags:["template","projects"]         },
  { id:"5",  name:"Q3 Sales Deck",                 category:"Reports",    type:"pdf",  size:"5.4 MB", date:"03 Jan", uploadedBy:"Kiran M.",  tags:["sales","presentation"]        },
  { id:"6",  name:"NDA - Innovate Ltd",            category:"Legal",      type:"pdf",  size:"0.5 MB", date:"02 Jan", uploadedBy:"Arjun S.",  tags:["legal","nda"]                 },
  { id:"7",  name:"Office Floor Plan 2025",        category:"Other",      type:"png",  size:"4.1 MB", date:"30 Dec", uploadedBy:"Admin",     tags:["facility"]                    },
  { id:"8",  name:"Vendor Comparison Matrix",      category:"Reports",    type:"xlsx", size:"1.3 MB", date:"28 Dec", uploadedBy:"Ravi K.",   tags:["vendor","procurement"]        },
  { id:"9",  name:"HR Recruitment Policy",         category:"HR",         type:"docx", size:"0.6 MB", date:"22 Dec", uploadedBy:"Priya N.",  tags:["hr","recruitment"]            },
  { id:"10", name:"Cloud Migration Agreement",     category:"Contracts",  type:"pdf",  size:"1.9 MB", date:"18 Dec", uploadedBy:"Arjun S.",  tags:["legal","it"]                  },
];

const CATEGORIES = ["All","Reports","HR","Contracts","Finance","Legal","Other"];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pdf:  { icon: FileText,        color: "text-red-600",    bg: "bg-red-50"    },
  docx: { icon: File,            color: "text-blue-600",   bg: "bg-blue-50"   },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-600",bg: "bg-emerald-50"},
  png:  { icon: Image,           color: "text-purple-600", bg: "bg-purple-50" },
  jpg:  { icon: Image,           color: "text-pink-600",   bg: "bg-pink-50"   },
};

const TYPE_BADGE: Record<string, string> = {
  pdf:  "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  xlsx: "bg-emerald-100 text-emerald-700",
  png:  "bg-purple-100 text-purple-700",
};

export default function DocumentsPage() {
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView]       = useState<"grid"|"list">("grid");

  const filtered = useMemo(() => DOCS.filter((d) => {
    const q = search.toLowerCase();
    const matchQ = d.name.toLowerCase().includes(q) || d.tags.some((t) => t.includes(q));
    const matchC = category === "All" || d.category === category;
    return matchQ && matchC;
  }), [search, category]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Centralised storage for all your business documents</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
          <Upload className="w-4 h-4" />Upload Document
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap border",
                category === cat ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm ml-auto">
          {(["grid","list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-3 py-2 text-xs font-medium transition", view === v ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50")}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{filtered.length} files</span>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((doc, i) => {
            const tc = TYPE_CONFIG[doc.type] ?? TYPE_CONFIG.pdf;
            const IconComp = tc.icon;
            return (
              <motion.div key={doc.id} initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", tc.bg)}>
                    <IconComp className={cn("w-5 h-5", tc.color)} />
                  </div>
                  <span className={cn("text-[11px] font-bold uppercase px-2 py-0.5 rounded-full", TYPE_BADGE[doc.type] ?? "bg-gray-100 text-gray-600")}>
                    {doc.type}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{doc.name}</p>
                <p className="text-xs text-gray-400 mb-2.5">{doc.size} &bull; {doc.date}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{doc.uploadedBy}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><Download className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name","Category","Type","Size","Uploaded By","Date",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => {
                const tc = TYPE_CONFIG[doc.type] ?? TYPE_CONFIG.pdf;
                const IconComp = tc.icon;
                return (
                  <motion.tr key={doc.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", tc.bg)}>
                          <IconComp className={cn("w-4 h-4", tc.color)} />
                        </div>
                        <span className="font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">{doc.category}</span></td>
                    <td className="px-4 py-3.5"><span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded-full", TYPE_BADGE[doc.type] ?? "bg-gray-100 text-gray-600")}>{doc.type}</span></td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{doc.size}</td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs">{doc.uploadedBy}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{doc.date}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No documents match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}