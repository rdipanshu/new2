import { motion } from "framer-motion";
import { Briefcase, ChevronRight } from "lucide-react";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";

export default function Experience() {
  const page = usePage("experience");
  const d = page?.data || {};
  const items = d.items || [];
  return (
    <PageShell videoUrl={page?.video_url} testId="experience-page">
      <PageHeading overline="// career log" title={d.heading || "Experience Timeline"} />
      <div className="relative max-w-3xl pl-8 md:pl-10" data-testid="experience-timeline">
        <div className="absolute left-2 md:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-400 via-cyan-500/40 to-transparent" />
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="relative mb-8"
            data-testid={`experience-item-${i}`}
          >
            <div className="absolute -left-8 md:-left-10 top-7 translate-x-2 md:translate-x-3 -ml-[5px] w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
            <GlassCard className="p-7 hover:border-cyan-500/50 transition-colors duration-300">
              <p className="font-mono text-xs text-emerald-400 uppercase tracking-widest mb-2">{item.period}</p>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <h2 className="font-heading text-lg font-semibold text-white">{item.company}</h2>
              </div>
              <p className="text-zinc-400 text-sm mb-4">{item.role}</p>
              <ul className="space-y-2">
                {(item.points || []).map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-300">
                    <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
