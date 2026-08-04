import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, FileText, X, Check, GripVertical, Download, Upload } from "lucide-react";
import { api, assetUrl, CATEGORIES } from "../../lib/api";
import { inputCls } from "./PageEditor";

export default function CertManager() {
  const [certs, setCerts] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("All");
  const fileRef = useRef(null);
  const dragIndex = useRef(null);

  const importFileRef = useRef(null);

  const load = () => api.get("/certifications").then((r) => setCerts(r.data));
  useEffect(() => { load(); }, []);

  const exportCerts = async () => {
    try {
      const r = await api.get("/certifications/export");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certifications-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${r.data.count} certifications`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Export failed");
    }
  };

  const importCerts = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!window.confirm("Import certifications from this JSON file?\n\nExisting certs with matching id will be updated (merge mode).")) {
      e.target.value = "";
      return;
    }
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const items = parsed.certifications || parsed;
      if (!Array.isArray(items) || items.length === 0) throw new Error("File must contain a certifications array");
      const r = await api.post("/certifications/import", { certifications: items, mode: "merge" });
      toast.success(`Imported: ${r.data.inserted} new, ${r.data.updated} updated (total ${r.data.total})`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Import failed");
    } finally {
      e.target.value = "";
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("category", category);
      fd.append("verify_url", verifyUrl);
      if (file) fd.append("file", file);
      await api.post("/certifications", fd);
      toast.success("Certification added");
      setTitle("");
      setVerifyUrl("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add certification");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    try {
      const fd = new FormData();
      fd.append("title", editing.title);
      fd.append("category", editing.category);
      fd.append("verify_url", editing.verify_url?.trim() ? editing.verify_url.trim() : "__CLEAR__");
      await api.put(`/certifications/${editing.id}`, fd);
      toast.success("Certification updated");
      setEditing(null);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this certification?")) return;
    await api.delete(`/certifications/${id}`);
    toast.success("Certification deleted");
    load();
  };

  const filtered = filter === "All" ? certs : certs.filter((c) => c.category === filter);

  const onDrop = async (targetIndex) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const others = certs.filter((c) => !filtered.some((f) => f.id === c.id));
    setCerts(filter === "All" ? reordered : [...others, ...reordered]);
    try {
      await api.post("/certifications/reorder", { ids: reordered.map((c) => c.id) });
      toast.success("Order saved");
      load();
    } catch {
      toast.error("Failed to save order");
      load();
    }
  };

  return (
    <div className="space-y-8" data-testid="cert-manager">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Backup / Migrate</p>
        <div className="flex gap-2">
          <button
            onClick={exportCerts}
            className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-sm hover:border-cyan-500 hover:text-cyan-400 transition-colors"
            data-testid="cert-export-btn"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-sm hover:border-emerald-500 hover:text-emerald-400 transition-colors"
            data-testid="cert-import-btn"
          >
            <Upload className="w-3.5 h-3.5" /> Import JSON
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            onChange={importCerts}
            className="hidden"
            data-testid="cert-import-input"
          />
        </div>
      </div>

      <form onSubmit={create} className="border border-zinc-800 rounded-md p-5 bg-zinc-900/50 space-y-4 max-w-2xl">
        <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest">Upload New Certification</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input required placeholder="Certificate title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} data-testid="cert-input-title" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} data-testid="cert-select-category">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input placeholder="Verification URL (optional)" value={verifyUrl} onChange={(e) => setVerifyUrl(e.target.value)} className={inputCls} data-testid="cert-input-verify" />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-zinc-800 file:text-zinc-300 file:text-xs file:font-mono file:uppercase hover:file:bg-zinc-700 file:cursor-pointer file:transition-colors"
          data-testid="cert-file-input"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-cyan-500 text-black font-semibold px-5 py-2.5 rounded-sm hover:bg-cyan-400 transition-colors duration-200 disabled:opacity-50"
          data-testid="cert-add-button"
        >
          <Plus className="w-4 h-4" /> {saving ? "Uploading..." : "Add Certification"}
        </button>
      </form>

      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors duration-200 ${
                filter === c ? "bg-cyan-500 text-black border-cyan-500" : "border-zinc-700 text-zinc-400 hover:border-cyan-500/50"
              }`}
              data-testid={`cert-filter-${c.toLowerCase().replace(/\s/g, "-")}`}
            >
              {c} ({c === "All" ? certs.length : certs.filter((x) => x.category === c).length})
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] text-zinc-600 mb-5">Drag cards by the grip handle to change display order.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="cert-admin-list">
          {filtered.map((cert, idx) => (
            <div
              key={cert.id}
              draggable
              onDragStart={() => { dragIndex.current = idx; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className="border border-zinc-800 rounded-md bg-zinc-900/50 overflow-hidden cursor-grab active:cursor-grabbing"
              data-testid={`cert-admin-item-${cert.id}`}
            >
              <div className="relative">
                {(cert.file_type === "image" ? cert.file_url : cert.thumb_url) ? (
                  <img src={assetUrl(cert.file_type === "image" ? cert.file_url : cert.thumb_url)} alt={cert.title} className="w-full h-32 object-cover object-top bg-white" />
                ) : (
                  <div className="w-full h-32 bg-zinc-900 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-zinc-700" />
                  </div>
                )}
                <span className="absolute top-2 right-2 bg-black/70 rounded-sm p-1" data-testid={`cert-drag-handle-${cert.id}`}>
                  <GripVertical className="w-4 h-4 text-zinc-400" />
                </span>
              </div>
              <div className="p-4">
                {editing?.id === cert.id ? (
                  <div className="space-y-2">
                    <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputCls} data-testid="cert-edit-title" />
                    <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls} data-testid="cert-edit-category">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input placeholder="Verification URL" value={editing.verify_url || ""} onChange={(e) => setEditing({ ...editing, verify_url: e.target.value })} className={inputCls} data-testid="cert-edit-verify" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 transition-colors" data-testid="cert-edit-save"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white transition-colors" data-testid="cert-edit-cancel"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">{cert.category}</p>
                    <p className="text-white text-sm font-medium leading-snug">{cert.title}</p>
                    {cert.verify_url && <p className="font-mono text-[10px] text-cyan-400/70 truncate mt-1">{cert.verify_url}</p>}
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setEditing({ id: cert.id, title: cert.title, category: cert.category, verify_url: cert.verify_url || "" })} className="text-zinc-500 hover:text-cyan-400 transition-colors" data-testid={`cert-edit-btn-${cert.id}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(cert.id)} className="text-zinc-500 hover:text-red-500 transition-colors" data-testid={`cert-delete-btn-${cert.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-zinc-600 font-mono text-sm col-span-full" data-testid="cert-admin-empty">No certifications yet.</p>}
        </div>
      </div>
    </div>
  );
}
