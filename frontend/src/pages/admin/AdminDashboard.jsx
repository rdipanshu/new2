import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, LogOut, ExternalLink, Home, FileText, Wrench, Briefcase, Award, GraduationCap, Trophy, Mail, Inbox, Menu, BarChart3, Newspaper } from "lucide-react";
import { api } from "../../lib/api";
import AdminLogin from "./AdminLogin";
import PageEditor from "./PageEditor";
import CertManager from "./CertManager";
import MessagesPanel from "./MessagesPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import BlogManager from "./BlogManager";

const SECTIONS = [
  { id: "home", label: "Home", icon: Home },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "certifications", label: "Certifications Page", icon: Award },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "activity", label: "Activity & Honors", icon: Trophy },
  { id: "blog", label: "Blog Page", icon: Newspaper },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "certs-manager", label: "Manage Certificates", icon: Award, special: true },
  { id: "blog-manager", label: "Manage Blog Posts", icon: Newspaper, special: true },
  { id: "messages", label: "Inbox", icon: Inbox, special: true },
  { id: "analytics", label: "Analytics", icon: BarChart3, special: true },
];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(false))
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("admin_token");
    setUser(false);
  };

  if (checking)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-sm">Verifying session...</div>;
  if (!user) return <AdminLogin onLogin={setUser} />;

  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex" data-testid="admin-dashboard">
      <aside className={`${sidebarOpen ? "flex" : "hidden"} md:flex flex-col w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 fixed md:static inset-y-0 z-40`}>
        <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-sm tracking-widest uppercase">Admin<span className="text-cyan-400">_</span>Console</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest px-3 pt-2 pb-1">Page Content</p>
          {SECTIONS.filter((s) => !s.special).map((s) => (
            <button
              key={s.id}
              onClick={() => { setActive(s.id); setSidebarOpen(false); }}
              data-testid={`admin-nav-${s.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors duration-200 ${
                active === s.id ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest px-3 pt-4 pb-1">Management</p>
          {SECTIONS.filter((s) => s.special).map((s) => (
            <button
              key={s.id}
              onClick={() => { setActive(s.id); setSidebarOpen(false); }}
              data-testid={`admin-nav-${s.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors duration-200 ${
                active === s.id ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800 space-y-1">
          <Link to="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" data-testid="admin-view-site">
            <ExternalLink className="w-4 h-4" /> View Site
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-colors" data-testid="admin-logout">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          <button className="md:hidden text-zinc-400" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="admin-sidebar-toggle">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-lg font-semibold" data-testid="admin-section-title">{activeSection?.label}</h1>
          <p className="ml-auto font-mono text-xs text-zinc-600 hidden sm:block">{user.email}</p>
        </div>
        <div className="p-6">
          {active === "certs-manager" ? <CertManager /> : active === "blog-manager" ? <BlogManager /> : active === "messages" ? <MessagesPanel /> : active === "analytics" ? <AnalyticsPanel /> : <PageEditor pageId={active} />}
        </div>
      </main>
    </div>
  );
}
