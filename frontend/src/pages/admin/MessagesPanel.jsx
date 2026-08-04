import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Mail, MailOpen } from "lucide-react";
import { api } from "../../lib/api";

export default function MessagesPanel() {
  const [messages, setMessages] = useState([]);
  const load = () => api.get("/contact/messages").then((r) => setMessages(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/contact/messages/${id}`);
    toast.success("Message deleted");
    load();
  };

  const markRead = async (id) => {
    await api.patch(`/contact/messages/${id}/read`);
    load();
  };

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-4 max-w-3xl" data-testid="messages-panel">
      <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest" data-testid="messages-unread-count">
        {messages.length} messages / <span className={unread ? "text-cyan-400" : ""}>{unread} unread</span>
      </p>
      {messages.length === 0 && <p className="text-zinc-600 font-mono text-sm" data-testid="messages-empty">No messages yet.</p>}
      {messages.map((m) => (
        <div
          key={m.id}
          className={`border rounded-md p-5 ${m.read ? "border-zinc-800 bg-zinc-900/50" : "border-cyan-500/40 bg-cyan-500/5"}`}
          data-testid={`message-item-${m.id}`}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {m.read ? <MailOpen className="w-4 h-4 text-zinc-500" /> : <Mail className="w-4 h-4 text-cyan-400" />}
                <p className="text-white text-sm font-semibold">{m.name}</p>
                <a href={`mailto:${m.email}`} className="text-zinc-500 text-xs hover:text-cyan-400 transition-colors">{m.email}</a>
                {!m.read && <span className="font-mono text-[9px] uppercase tracking-widest bg-cyan-500 text-black px-1.5 py-0.5 rounded-sm" data-testid={`message-new-badge-${m.id}`}>New</span>}
              </div>
              {m.subject && <p className="font-mono text-xs text-emerald-400 uppercase tracking-wider mb-2">{m.subject}</p>}
              <p className="text-zinc-300 text-sm leading-relaxed">{m.message}</p>
              <p className="font-mono text-[10px] text-zinc-600 mt-3">{new Date(m.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              {!m.read && (
                <button onClick={() => markRead(m.id)} title="Mark as read" className="text-cyan-400 hover:text-cyan-300 transition-colors" data-testid={`message-mark-read-${m.id}`}>
                  <MailOpen className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => remove(m.id)} className="text-zinc-500 hover:text-red-500 transition-colors" data-testid={`message-delete-${m.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
