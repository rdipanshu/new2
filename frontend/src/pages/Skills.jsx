import { motion } from "framer-motion";
import { ShieldAlert, Wrench, Cloud, Code2, Globe, Scale, Target, BrainCircuit, Layers } from "lucide-react";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";

const ICONS = [ShieldAlert, Wrench, Cloud, Code2, Globe, Scale, Target, BrainCircuit, Layers];

export default function Skills() {
  const page = usePage("skills");
  const d = page?.data || {};
  const categories = d.categories || [];
  return (
    <PageShell videoUrl={page?.video_url} testId="skills-page">
      <PageHeading overline="// capabilities loaded" title={d.heading || "Skills & Arsenal"} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="skills-grid">
        {categories.map((cat, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            >
              <GlassCard
                className="p-7 h-full hover:border-cyan-500/50 hover:-translate-y-1 transition-[border-color,transform] duration-300"
                data-testid={`skill-category-${i}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-sm bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-cyan-400" size={18} />
                  </div>
                  <h2 className="font-heading text-base md:text-lg font-semibold text-white leading-snug">{cat.name}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(cat.skills || []).map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[11px] uppercase tracking-wide text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-sm hover:border-emerald-500/50 hover:text-emerald-400 transition-colors duration-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
