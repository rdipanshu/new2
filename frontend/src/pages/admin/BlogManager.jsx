import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Eye, EyeOff, X } from "lucide-react";
import { api } from "../../lib/api";
import { inputCls } from "./PageEditor";

const EMPTY = { title: "", excerpt: "", content: "", tags: "", published: true };

export default function BlogManager() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/blog/admin").then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published: form.published,
    };
    try {
      if (editingId) {
        await api.put(`/blog/${editingId}`, payload);
        toast.success("Post updated");
      } else {
        await api.post("/blog", payload);
        toast.success("Post published");
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch {
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const edit = (p) => {
    setEditingId(p.id);
    setForm({ title: p.title, excerpt: p.excerpt || "", content: p.content, tags: (p.tags || []).join(", "), published: p.published });
    window.scrollTo(0, 0);
  };

  const togglePublish = async (p) => {
    await api.put(`/blog/${p.id}`, { published: !p.published });
    toast.success(p.published ? "Post unpublished" : "Post published");
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await api.delete(`/blog/${id}`);
    toast.success("Post deleted");
    if (editingId === id) { setEditingId(null); setForm(EMPTY); }
    load();
  };

  return (
    <div className="space-y-8 max-w-3xl" data-testid="blog-manager">
      <form onSubmit={submit} className="border border-zinc-800 rounded-md p-5 bg-zinc-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest">{editingId ? "Edit Post" : "New Write-up"}</p>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="text-zinc-500 hover:text-white transition-colors" data-testid="blog-cancel-edit">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} data-testid="blog-input-title" />
        <input placeholder="Short excerpt (shown on the list page)" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={inputCls} data-testid="blog-input-excerpt" />
        <textarea
          required
          rows={12}
          placeholder={"Write your article...\n\nUse '## Heading' for section headings and '- item' for bullet lists. Blank lines separate paragraphs."}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className={inputCls}
          data-testid="blog-input-content"
        />
        <input placeholder="Tags (comma-separated, e.g. pentesting, ai)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} data-testid="blog-input-tags" />
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-cyan-500" data-testid="blog-input-published" />
          Published (visible on the site)
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-cyan-500 text-black font-semibold px-5 py-2.5 rounded-sm hover:bg-cyan-400 transition-colors duration-200 disabled:opacity-50"
          data-testid="blog-save-button"
        >
          <Plus className="w-4 h-4" /> {saving ? "Saving..." : editingId ? "Update Post" : "Publish Post"}
        </button>
      </form>

      <div className="space-y-3" data-testid="blog-admin-list">
        {posts.length === 0 && <p className="text-zinc-600 font-mono text-sm" data-testid="blog-admin-empty">No posts yet. Write your first article above.</p>}
        {posts.map((p) => (
          <div key={p.id} className="border border-zinc-800 rounded-md bg-zinc-900/50 p-5 flex items-start justify-between gap-4" data-testid={`blog-admin-item-${p.id}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-semibold">{p.title}</p>
                <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${p.published ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"}`}>
                  {p.published ? "Live" : "Draft"}
                </span>
              </div>
              <p className="font-mono text-[10px] text-zinc-600 mt-1">/blog/{p.slug} — {new Date(p.created_at).toLocaleDateString()}</p>
              {p.excerpt && <p className="text-zinc-400 text-xs mt-1 truncate">{p.excerpt}</p>}
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => togglePublish(p)} title={p.published ? "Unpublish" : "Publish"} className="text-zinc-500 hover:text-amber-400 transition-colors" data-testid={`blog-toggle-${p.id}`}>
                {p.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => edit(p)} className="text-zinc-500 hover:text-cyan-400 transition-colors" data-testid={`blog-edit-${p.id}`}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(p.id)} className="text-zinc-500 hover:text-red-500 transition-colors" data-testid={`blog-delete-${p.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
