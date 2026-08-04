import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Terminal, ShieldCheck, Cpu, Network } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { api } from "../lib/api";

export default function Home() {
  const page = usePage("home");
  const [certCount, setCertCount] = useState(null);
  useEffect(() => {
    api.get("/certifications").then((r) => setCertCount(r.data.length)).catch(() => {});
  }, []);
  const d = page?.data || {};
  const stats = [
    { icon: ShieldCheck, label: "Certifications", value: certCount ?? "—" },
    { icon: Network, label: "Enterprise Projects", value: "UPCL / PTCUL" },
    { icon: Cpu, label: "AI-Driven Security", value: "LLM Workflows" },
  ];
  return (
    <PageShell videoUrl={page?.video_url} testId="home-page">
      <div className="min-h-[60vh] flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-cyan-400 text-xs sm:text-sm uppercase tracking-[0.25em] mb-6 flex items-center gap-2" data-testid="hero-overline">
            <Terminal className="w-4 h-4" />
            {d.overline || "// CYBERSECURITY SPECIALIST & NETWORK SECURITY ENGINEER"}
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-white" data-testid="hero-title">
            {d.title || "Dipanshu Rana"}
            <span className="text-cyan-400 cursor-blink">_</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-300 font-medium" data-testid="hero-subtitle">{d.subtitle}</p>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-zinc-400 leading-relaxed" data-testid="hero-tagline">{d.tagline}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/skills"
              data-testid="hero-cta-portfolio"
              className="inline-flex items-center gap-2 bg-cyan-500 text-black font-semibold px-7 py-3 rounded-sm hover:bg-cyan-400 transition-colors duration-200 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              {d.cta_primary || "View Portfolio"} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              data-testid="hero-cta-contact"
              className="inline-flex items-center gap-2 border border-cyan-500/60 text-cyan-400 font-semibold px-7 py-3 rounded-sm hover:bg-cyan-500/10 transition-colors duration-200"
            >
              {d.cta_secondary || "Contact Me"}
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {stats.map((s) => (
            <GlassCard key={s.label} className="p-6 hover:border-cyan-500/50 transition-colors duration-300" data-testid={`hero-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
              <s.icon className="w-5 h-5 text-emerald-400 mb-3" />
              <p className="font-heading text-xl font-bold text-white">{s.value}</p>
              <p className="font-mono text-xs uppercase tracking-wider text-zinc-500 mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </motion.div>
      </div>
    </PageShell>
  );
}
