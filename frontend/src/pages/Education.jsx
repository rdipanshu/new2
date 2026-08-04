import { motion } from "framer-motion";
import { GraduationCap, Star } from "lucide-react";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";

export default function Education() {
  const page = usePage("education");
  const d = page?.data || {};
  return (
    <PageShell videoUrl={page?.video_url} testId="education-page">
      <PageHeading overline="// academic records" title={d.heading || "Education"} />
      <div className="max-w-3xl space-y-5">
        {(d.items || []).map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <GlassCard className="p-7 hover:border-cyan-500/50 transition-colors duration-300" data-testid={`education-item-${i}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-mono text-xs text-emerald-400 uppercase tracking-widest mb-1">{item.date}</p>
                  <h2 className="font-heading text-lg font-semibold text-white">{item.degree}</h2>
                  <p className="text-zinc-400 text-sm mt-1">{item.school}</p>
                  {item.highlight && (
                    <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-sm">
                      <Star className="w-3 h-3" /> {item.highlight}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
