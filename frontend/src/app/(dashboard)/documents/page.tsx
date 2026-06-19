"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  Download,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string | null;
  related_type: string | null;
  related_id: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  category: Category | null;
  uploader_name: string | null;
}

interface DownloadUrlResponse {
  url: string;
  expires_in_minutes: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const api = {
  categories: () => apiClient.get<Category[]>("/documents/categories").then((r) => r.data),
  list: (params: Record<string, string | undefined>) =>
    apiClient.get<Document[]>("/documents", { params }).then((r) => r.data),
  download: (id: string) =>
    apiClient.get<DownloadUrlResponse>(`/documents/${id}/download`).then((r) => r.data),
  upload: (form: FormData) =>
    apiClient.post<Document>("/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MIME_FILTER_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word" },
  { value: "xlsx", label: "Excel" },
  { value: "image", label: "Image" },
];

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return { Icon: File, color: "text-gray-500", bg: "bg-gray-50" };
  if (mimeType.includes("pdf")) return { Icon: FileText, color: "text-red-600", bg: "bg-red-50" };
  if (mimeType.includes("word") || mimeType.includes("document"))
    return { Icon: File, color: "text-blue-600", bg: "bg-blue-50" };
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return { Icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (mimeType.startsWith("image/")) return { Icon: Image, color: "text-purple-600", bg: "bg-purple-50" };
  return { Icon: File, color: "text-gray-500", bg: "bg-gray-50" };
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
interface Toast { id: number; message: string; type: "success" | "error" }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const show = (message: string, type: Toast["type"] = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };
  return { toasts, show };
}

// ---------------------------------------------------------------------------
// Upload Modal
// ---------------------------------------------------------------------------
interface UploadModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: (doc: Document) => void;
}

function UploadModal({ categories, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [relatedType, setRelatedType] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (form: FormData) => api.upload(form),
    onSuccess: (doc) => onSuccess(doc),
    onError: (e: AxiosError<{ detail: string }>) =>
      setError(e.response?.data?.detail ?? "Upload failed"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file"); return; }
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    if (description) form.append("description", description);
    if (categoryId) form.append("category_id", categoryId);
    if (relatedType) form.append("related_type", relatedType);
    if (tags) form.append("tags", tags);
    mutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        key="upload-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition",
              file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            {file ? (
              <p className="text-sm font-medium text-blue-700">{file.name} ({fmtSize(file.size)})</p>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to select a file</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Attach To</label>
              <select
                value={relatedType}
                onChange={(e) => setRelatedType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">General</option>
                <option value="project">Project</option>
                <option value="client">Client</option>
                <option value="employee">Employee</option>
                <option value="invoice">Invoice</option>
                <option value="task">Task</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. legal, q4, finance"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------
function DeleteModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: Document;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        key="delete-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
      >
        <h2 className="text-base font-semibold text-gray-900 mb-2">Delete Document?</h2>
        <p className="text-sm text-gray-500 mb-5">
          &ldquo;{doc.title}&rdquo; will be soft-deleted and removed from the list.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
type ActiveModal = { type: "upload" } | { type: "delete"; doc: Document };

export default function DocumentsPage() {
  const qc = useQueryClient();
  const { toasts, show: showToast } = useToast();

  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function handleSearch(v: string) {
    setSearch(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  const { data: categories = [] } = useQuery({
    queryKey: ["doc-categories"],
    queryFn: api.categories,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", debouncedSearch, categoryFilter, mimeFilter],
    queryFn: () =>
      api.list({
        search: debouncedSearch || undefined,
        category_id: categoryFilter || undefined,
        mime_filter: mimeFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      showToast("Document deleted");
      setModal(null);
    },
    onError: () => showToast("Delete failed", "error"),
  });

  async function handleDownload(doc: Document) {
    try {
      const { url } = await api.download(doc.id);
      window.open(url, "_blank");
    } catch {
      showToast("Could not generate download link", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Centralised storage for all business documents</p>
        </div>
        <button
          onClick={() => setModal({ type: "upload" })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search documents or tags..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={mimeFilter}
          onChange={(e) => setMimeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MIME_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div className="text-xs text-gray-400">
        {isLoading ? "Loading..." : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">No documents found</p>
          <p className="text-xs mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Uploaded</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documents.map((doc) => {
                const { Icon, color, bg } = getFileIcon(doc.mime_type);
                const tagList = doc.tags
                  ? doc.tags.split(",").map((t) => t.trim()).filter(Boolean)
                  : [];
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                          <Icon className={cn("w-4 h-4", color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-xs">{doc.title}</p>
                          <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tagList.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {doc.category ? (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg">
                          {doc.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{fmtSize(doc.file_size)}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{fmtDate(doc.created_at)}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{doc.uploader_name ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModal({ type: "delete", doc })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {modal?.type === "upload" && (
          <UploadModal
            key="upload"
            categories={categories}
            onClose={() => setModal(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["documents"] });
              showToast("Document uploaded successfully");
              setModal(null);
            }}
          />
        )}
        {modal?.type === "delete" && (
          <DeleteModal
            key="delete"
            doc={modal.doc}
            onClose={() => setModal(null)}
            onConfirm={() => deleteMutation.mutate(modal.doc.id)}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg",
                t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              )}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
