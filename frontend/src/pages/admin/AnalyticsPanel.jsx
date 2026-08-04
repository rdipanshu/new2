import { useEffect, useState } from "react";
import { BarChart3, Eye, Award, Inbox, TrendingUp } from "lucide-react";
import { api } from "../../lib/api";

const PAGE_LABELS = {
  home: "Home", summary: "Summary", skills: "Skills", experience: "Experience",
  certifications: "Certifications", education: "Education", activity: "Activity", contact: "Contact",
};

export default function AnalyticsPanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/analytics/summary").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-zinc-500 font-mono text-sm">Loading analytics...</p>;

  const maxPage = Math.max(1, ...data.visits_by_page.map((v) => v.count));
  const maxCert = Math.max(1, ...data.top_certs.map((c) => c.views));

  const stats = [
    { icon: Eye, label: "Total Page Visits", value: data.total_visits, testId: "analytics-total-visits" },
    { icon: TrendingUp, label: "Visits (Last 7 Days)", value: data.visits_last_7_days, testId: "analytics-visits-7d" },
    { icon: Inbox, label: "Unread Messages", value: data.unread_messages, testId: "analytics-unread" },
  ];

  return (
    <div className="space-y-8 max-w-4xl" data-testid="analytics-panel">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-zinc-800 rounded-md bg-zinc-900/50 p-5" data-testid={s.testId}>
            <s.icon className="w-5 h-5 text-cyan-400 mb-3" />
            <p className="font-heading text-2xl font-bold text-white">{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="border border-zinc-800 rounded-md bg-zinc-900/50 p-6" data-testid="analytics-page-visits">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white mb-5">
          <BarChart3 className="w-4 h-4 text-cyan-400" /> Visits by Page
        </h2>
        {data.visits_by_page.length === 0 && <p className="text-zinc-600 font-mono text-sm">No visits recorded yet.</p>}
        <div className="space-y-3">
          {data.visits_by_page.map((v) => (
            <div key={v.page} className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-400 uppercase w-32 shrink-0">{PAGE_LABELS[v.page] || v.page}</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded-sm overflow-hidden">
                <div className="h-full bg-cyan-500/70" style={{ width: `${(v.count / maxPage) * 100}%` }} />
              </div>
              <span className="font-mono text-xs text-white w-10 text-right">{v.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-zinc-800 rounded-md bg-zinc-900/50 p-6" data-testid="analytics-top-certs">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white mb-5">
          <Award className="w-4 h-4 text-emerald-400" /> Most-Viewed Certificates
        </h2>
        {data.top_certs.length === 0 && <p className="text-zinc-600 font-mono text-sm">No certificate views yet. Views are counted when visitors open a certificate.</p>}
        <div className="space-y-3">
          {data.top_certs.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-48 shrink-0">
                <p className="text-white text-xs font-medium truncate">{c.title}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">{c.category}</p>
              </div>
              <div className="flex-1 h-5 bg-zinc-800 rounded-sm overflow-hidden">
                <div className="h-full bg-emerald-500/70" style={{ width: `${(c.views / maxCert) * 100}%` }} />
              </div>
              <span className="font-mono text-xs text-white w-10 text-right">{c.views}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
