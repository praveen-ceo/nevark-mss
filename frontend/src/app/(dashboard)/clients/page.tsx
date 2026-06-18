"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";
import {
  AlertCircle, BadgeDollarSign, Briefcase, CheckCircle2,
  Download, Loader2, Pencil, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";

interface ContactBrief {
  id: string; first_name: string; last_name: string;
  email: string | null; phone: string | null;
  designation: string | null; is_primary: boolean;
}

interface Client {
  id: string; name: string;
  industry: string | null; website: string | null;
  email: string | null; phone: string | null;
  address: string | null; city: string | null; country: string | null;
  tax_id: string | null; notes: string | null;
  is_active: boolean; contacts: ContactBrief[];
}

interface ClientCreate {
  name: string; industry: string; website: string;
  email: string; phone: string; address: string;
  city: string; country: string; tax_id: string; notes: string;
}

interface ClientUpdate extends Partial<ClientCreate> { is_active?: boolean; }

const api = {
  list:   (search: string) =>
    apiClient.get<Client[]>("/clients", { params: search ? { search } : {} }).then(r => r.data),
  create: (d: ClientCreate) => apiClient.post<Client>("/clients", d).then(r => r.data),
  update: (id: string, d: ClientUpdate) => apiClient.put<Client>(`/clients/${id}`, d).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/clients/${id}`),
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-emerald-500","bg-purple-500","bg-orange-500",
  "bg-rose-500","bg-teal-500","bg-indigo-500","bg-cyan-500",
];
const EMPTY: ClientCreate = {
  name:"",industry:"",website:"",email:"",
  phone:"",address:"",city:"",country:"",tax_id:"",notes:"",
};

interface ToastState { msg: string; type: "success" | "error"; }

export function Toast({ msg, type, onClose }: ToastState & { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:20 }}
      className={cn("fixed bottom-6 right-6 z-100 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type==="success"?"bg-emerald-600":"bg-red-600")}>
      {type==="success"?<CheckCircle2 className="w-4 h-4 shrink-0"/>:<AlertCircle className="w-4 h-4 shrink-0"/>}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-3.5 h-3.5"/></button>
    </motion.div>
  );
}

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{ opacity:0,scale:0.96 }} animate={{ opacity:1,scale:1 }}
        exit={{ opacity:0,scale:0.96 }} transition={{ duration:0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

const inputCls = "w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-400";

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ClientForm({ form, setForm, err, isPending, onSubmit, onClose, submitLabel }: {
  form: ClientCreate;
  setForm: React.Dispatch<React.SetStateAction<ClientCreate>>;
  err: string | null; isPending: boolean;
  onSubmit: () => void; onClose: () => void; submitLabel: string;
}) {
  const set = (k: keyof ClientCreate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-100">Company</p></div>
        <div className="col-span-2">
          <Field label="Client Name" required>
            <input value={form.name} onChange={set("name")} placeholder="e.g. Acme Corp" className={inputCls}/>
          </Field>
        </div>
        <Field label="Industry"><input value={form.industry} onChange={set("industry")} placeholder="e.g. Technology" className={inputCls}/></Field>
        <Field label="Website"><input value={form.website} onChange={set("website")} placeholder="https://..." className={inputCls}/></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set("email")} placeholder="contact@company.com" className={inputCls}/></Field>
        <Field label="Phone"><input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className={inputCls}/></Field>
        <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-100 pt-2">Location</p></div>
        <div className="col-span-2"><Field label="Address"><input value={form.address} onChange={set("address")} placeholder="Street address" className={inputCls}/></Field></div>
        <Field label="City"><input value={form.city} onChange={set("city")} placeholder="City" className={inputCls}/></Field>
        <Field label="Country"><input value={form.country} onChange={set("country")} placeholder="Country" className={inputCls}/></Field>
        <Field label="Tax ID / GST"><input value={form.tax_id} onChange={set("tax_id")} placeholder="GST / Tax number" className={inputCls}/></Field>
        <div/>
        <div className="col-span-2">
          <Field label="Notes"><textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Additional notes..." className={inputCls+" resize-none"}/></Field>
        </div>
      </div>
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || !form.name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
          {submitLabel}
        </button>
      </div>
    </>
  );
}

function AddModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:(m:string)=>void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ClientCreate>(EMPTY);
  const [err, setErr] = useState<string|null>(null);
  const mut = useMutation({
    mutationFn: () => api.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["clients"] }); onSuccess("Client added"); onClose(); },
    onError: (e: AxiosError<{ detail:string }>) => setErr(e.response?.data?.detail ?? "Failed to create client"),
  });
  return (
    <Modal title="Add New Client" onClose={onClose}>
      <ClientForm form={form} setForm={setForm} err={err} isPending={mut.isPending}
        onSubmit={() => mut.mutate()} onClose={onClose} submitLabel="Create Client"/>
    </Modal>
  );
}

function EditModal({ client, onClose, onSuccess }: { client:Client; onClose:()=>void; onSuccess:(m:string)=>void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ClientCreate>({
    name:client.name, industry:client.industry??"", website:client.website??"",
    email:client.email??"", phone:client.phone??"", address:client.address??"",
    city:client.city??"", country:client.country??"", tax_id:client.tax_id??"", notes:client.notes??"",
  });
  const [err, setErr] = useState<string|null>(null);
  const mut = useMutation({
    mutationFn: () => api.update(client.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["clients"] }); onSuccess("Client updated"); onClose(); },
    onError: (e: AxiosError<{ detail:string }>) => setErr(e.response?.data?.detail ?? "Failed to update"),
  });
  return (
    <Modal title={`Edit — ${client.name}`} onClose={onClose}>
      <ClientForm form={form} setForm={setForm} err={err} isPending={mut.isPending}
        onSubmit={() => mut.mutate()} onClose={onClose} submitLabel="Save Changes"/>
    </Modal>
  );
}

function DeactivateModal({ client, onClose, onSuccess }: { client:Client; onClose:()=>void; onSuccess:(m:string)=>void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.remove(client.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["clients"] }); onSuccess("Client deactivated"); onClose(); },
  });
  return (
    <Modal title="Deactivate Client" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-500"/>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Deactivate {client.name}?</p>
          <p className="text-sm text-gray-500 mt-1">Marks the client as inactive. Reversible via Edit.</p>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2">{client.email ?? client.phone ?? "No contact info"}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
          Deactivate
        </button>
      </div>
    </Modal>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-700",
};

function mkInitials(name: string) {
  return name.split(" ").slice(0,2).map(w => w[0] ?? "").join("").toUpperCase();
}

function primaryContact(contacts: ContactBrief[]) {
  return contacts.find(c => c.is_primary) ?? contacts[0] ?? null;
}

export default function ClientsPage() {
  const [search, setSearch]       = useState("");
  const [dSearch, setDSearch]     = useState("");
  const [industryF, setIndustryF] = useState("All");
  const [statusF, setStatusF]     = useState("All");
  const [showAdd, setShowAdd]     = useState(false);
  const [editClient, setEditClient] = useState<Client|null>(null);
  const [delClient, setDelClient]   = useState<Client|null>(null);
  const [toast, setToast]           = useState<ToastState|null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
  if (debounce.current) {
    clearTimeout(debounce.current);
  }

  debounce.current = setTimeout(() => {
    setDSearch(search);
  }, 400);

  return () => {
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
  };
}, [search]);

  const { data: clients=[], isLoading, isError } = useQuery({
    queryKey: ["clients", dSearch],
    queryFn: () => api.list(dSearch),
  });

  const industries = ["All", ...Array.from(new Set(clients.map(c => c.industry).filter(Boolean) as string[])).sort()];

  const filtered = clients.filter(c => {
    const matchI = industryF === "All" || c.industry === industryF;
    const matchS = statusF === "All"
      || (statusF === "active" && c.is_active)
      || (statusF === "inactive" && !c.is_active);
    return matchI && matchS;
  });

  const active   = clients.filter(c => c.is_active).length;
  const inactive = clients.filter(c => !c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">Track relationships across your client portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <Download className="w-4 h-4"/>Export
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-4 h-4"/>Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Clients" value={String(clients.length)} icon={Briefcase}      color="blue"    index={0}/>
        <KpiCard label="Active"        value={String(active)}         icon={Users}          color="emerald" index={1}/>
        <KpiCard label="Inactive"      value={String(inactive)}       icon={Users}          color="red"     index={2}/>
        <KpiCard label="Industries"    value={String(industries.length - 1)} icon={BadgeDollarSign} color="teal" index={3}/>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-50 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"/>
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0"/>}
          </div>
          <select value={industryF} onChange={e => setIndustryF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer">
            {industries.map(i => <option key={i}>{i}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer">
            {["All","active","inactive"].map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} clients</span>
        </div>

        {isError && (
          <div className="p-6 flex items-center gap-3 text-red-600 bg-red-50">
            <AlertCircle className="w-5 h-5 shrink-0"/>
            <p className="text-sm">Failed to load clients. Check that the backend is running.</p>
          </div>
        )}

        {isLoading && !isError && (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin"/>
            <p className="text-sm">Loading clients...</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Client","Industry","Primary Contact","Location","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const contact = primaryContact(c.contacts);
                  const statusKey = c.is_active ? "active" : "inactive";
                  return (
                    <motion.tr key={c.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                            {mkInitials(c.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.email ?? c.phone ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.industry
                          ? <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">{c.industry}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {contact ? (
                          <div>
                            <p className="text-gray-800 font-medium">{contact.first_name} {contact.last_name}</p>
                            <p className="text-xs text-gray-400">{contact.designation ?? contact.email ?? ""}</p>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold capitalize", STATUS_STYLE[statusKey])}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditClient(c)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Edit">
                            <Pencil className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={() => setDelClient(c)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Deactivate">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {dSearch || industryF !== "All" || statusF !== "All"
                  ? "No clients match your filters."
                  : "No clients yet. Add your first client."}
              </div>
            )}
          </div>
        )}
      </div>

 <AnimatePresence>
  {showAdd && (
    <AddModal
      key="add-client-modal"
      onClose={() => setShowAdd(false)}
      onSuccess={(m) => setToast({ msg: m, type: "success" })}
    />
  )}

  {editClient && (
    <EditModal
      key={`edit-client-${editClient.id}`}
      client={editClient}
      onClose={() => setEditClient(null)}
      onSuccess={(m) => setToast({ msg: m, type: "success" })}
    />
  )}

  {delClient && (
    <DeactivateModal
      key={`deactivate-client-${delClient.id}`}
      client={delClient}
      onClose={() => setDelClient(null)}
      onSuccess={(m) => setToast({ msg: m, type: "success" })}
    />
  )}
</AnimatePresence>
{toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
