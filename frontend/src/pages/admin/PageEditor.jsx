import { useEffect, useState } from "react";
import { useRef } from "react";
import { toast } from "sonner";
import { Save, Upload, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

export const inputCls =
  "w-full bg-black/50 border border-zinc-700 rounded-sm px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none transition-colors duration-200";

const FIELD_DEFS = {
  home: [
    { key: "overline", label: "Overline", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "tagline", label: "Tagline", type: "textarea" },
    { key: "cta_primary", label: "Primary Button Text", type: "text" },
    { key: "cta_secondary", label: "Secondary Button Text", type: "text" },
  ],
  summary: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "body", label: "Summary Body", type: "textarea", rows: 12 },
  ],
  skills: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "categories", label: "Skill Categories", type: "list",
      itemFields: [
        { key: "name", label: "Category Name", type: "text" },
        { key: "skills", label: "Skills (comma-separated)", type: "csv" },
      ],
    },
  ],
  experience: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "items", label: "Experience Entries", type: "list",
      itemFields: [
        { key: "company", label: "Company", type: "text" },
        { key: "role", label: "Role", type: "text" },
        { key: "period", label: "Period", type: "text" },
        { key: "points", label: "Highlights (one per line)", type: "lines" },
      ],
    },
  ],
  certifications: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "intro", label: "Intro Text", type: "textarea" },
  ],
  education: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "items", label: "Education Entries", type: "list",
      itemFields: [
        { key: "degree", label: "Degree", type: "text" },
        { key: "school", label: "School / Institute", type: "text" },
        { key: "date", label: "Date", type: "text" },
        { key: "highlight", label: "Highlight (optional)", type: "text" },
      ],
    },
  ],
  activity: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "honors", label: "Honors (one per line)", type: "lines" },
    { key: "hobbies", label: "Hobbies (one per line)", type: "lines" },
  ],
  blog: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "intro", label: "Intro Text", type: "textarea" },
  ],
  contact: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "intro", label: "Intro Text", type: "textarea" },
    { key: "location", label: "Location", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "website", label: "Website", type: "text" },
    { key: "linkedin", label: "LinkedIn URL", type: "text" },
    { key: "github", label: "GitHub URL", type: "text" },
  ],
};

const toForm = (value, type) => {
  if (type === "csv") return (value || []).join(", ");
  if (type === "lines") return (value || []).join("\n");
  return value ?? "";
};
const fromForm = (value, type) => {
  if (type === "csv") return value.split(",").map((s) => s.trim()).filter(Boolean);
  if (type === "lines") return value.split("\n").map((s) => s.trim()).filter(Boolean);
  return value;
};

const Field = ({ def, value, onChange }) => {
  if (def.type === "textarea" || def.type === "lines")
    return <textarea rows={def.rows || 4} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} data-testid={`editor-field-${def.key}`} />;
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} data-testid={`editor-field-${def.key}`} />;
};

const ListEditor = ({ def, items, onChange }) => {
  const update = (i, key, val) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it));
    onChange(next);
  };
  const emptyItem = Object.fromEntries(def.itemFields.map((f) => [f.key, ""]));
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-zinc-800 rounded-md p-4 space-y-3 bg-zinc-900/50" data-testid={`list-item-${def.key}-${i}`}>
          <div className="flex justify-between items-center">
            <p className="font-mono text-xs text-zinc-500 uppercase">Item {i + 1}</p>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 transition-colors" data-testid={`list-remove-${def.key}-${i}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {def.itemFields.map((f) => (
            <div key={f.key}>
              <label className="block font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{f.label}</label>
              <Field def={{ ...f, key: `${def.key}-${i}-${f.key}` }} value={item[f.key]} onChange={(v) => update(i, f.key, v)} />
            </div>
          ))}
        </div>
      ))}
      <button
        onClick={() => onChange([...items, emptyItem])}
        className="inline-flex items-center gap-2 border border-cyan-500/60 text-cyan-400 font-mono text-xs uppercase px-4 py-2 rounded-sm hover:bg-cyan-500/10 transition-colors"
        data-testid={`list-add-${def.key}`}
      >
        <Plus className="w-3.5 h-3.5" /> Add Item
      </button>
    </div>
  );
};

export default function PageEditor({ pageId }) {
  const [form, setForm] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const defs = FIELD_DEFS[pageId] || [];

  useEffect(() => {
    setForm(null);
    api.get(`/pages/${pageId}`).then((r) => {
      const data = r.data.data || {};
      const f = {};
      defs.forEach((def) => {
        if (def.type === "list") {
          f[def.key] = (data[def.key] || []).map((item) => {
            const converted = {};
            def.itemFields.forEach((itf) => (converted[itf.key] = toForm(item[itf.key], itf.type)));
            return converted;
          });
        } else {
          f[def.key] = toForm(data[def.key], def.type);
        }
      });
      setForm(f);
      setVideoUrl(r.data.video_url || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const save = async () => {
    setSaving(true);
    try {
      const data = {};
      defs.forEach((def) => {
        if (def.type === "list") {
          data[def.key] = form[def.key].map((item) => {
            const out = {};
            def.itemFields.forEach((itf) => (out[itf.key] = fromForm(item[itf.key], itf.type)));
            return out;
          });
        } else {
          data[def.key] = fromForm(form[def.key], def.type);
        }
      });
      await api.put(`/pages/${pageId}`, { data, video_url: videoUrl });
      toast.success("Page saved successfully");
    } catch {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      setVideoUrl(data.url);
      toast.success("Video uploaded. Click Save to apply.");
    } catch {
      toast.error("Upload failed (mp4/webm/mov only)");
    } finally {
      setUploading(false);
    }
  };

  if (!form) return <p className="text-zinc-500 font-mono text-sm">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-6" data-testid={`page-editor-${pageId}`}>
      <div className="border border-zinc-800 rounded-md p-5 bg-zinc-900/50 space-y-3">
        <label className="block font-mono text-[11px] text-cyan-400 uppercase tracking-wider">Background Video URL</label>
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputCls} data-testid="editor-video-url" />
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => uploadVideo(e.target.files[0])} data-testid="editor-video-file-input" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase px-4 py-2 rounded-sm hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
            data-testid="editor-video-upload-btn"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload New Video"}
          </button>
        </div>
      </div>
      {defs.map((def) => (
        <div key={def.key}>
          <label className="block font-mono text-[11px] text-zinc-400 uppercase tracking-wider mb-1.5">{def.label}</label>
          {def.type === "list" ? (
            <ListEditor def={def} items={form[def.key]} onChange={(v) => setForm({ ...form, [def.key]: v })} />
          ) : (
            <Field def={def} value={form[def.key]} onChange={(v) => setForm({ ...form, [def.key]: v })} />
          )}
        </div>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-cyan-500 text-black font-semibold px-6 py-2.5 rounded-sm hover:bg-cyan-400 transition-colors duration-200 disabled:opacity-50"
        data-testid="editor-save-button"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
