import { motion } from "framer-motion";
import { Trophy, Mountain, Car, Gamepad2, Coffee, Compass } from "lucide-react";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";

const HOBBY_ICONS = [Mountain, Compass, Car, Gamepad2, Coffee];

export default function Activity() {
  const page = usePage("activity");
  const d = page?.data || {};
  return (
    <PageShell videoUrl={page?.video_url} testId="activity-page">
      <PageHeading overline="// beyond the terminal" title={d.heading || "Activity & Honors"} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <GlassCard className="p-8 h-full" data-testid="honors-card">
            <h2 className="font-heading text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Honors
            </h2>
            <ul className="space-y-4">
              {(d.honors || []).map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-sm">
                  <span className="font-mono text-amber-400 text-xs">{String(i + 1).padStart(2, "0")}</span>
                  {h}
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <GlassCard className="p-8 h-full" data-testid="hobbies-card">
            <h2 className="font-heading text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" /> Hobbies & Interests
            </h2>
            <ul className="space-y-4">
              {(d.hobbies || []).map((h, i) => {
                const Icon = HOBBY_ICONS[i % HOBBY_ICONS.length];
                return (
                  <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm bg-white/5 border border-white/10 px-4 py-3 rounded-sm hover:border-emerald-500/40 transition-colors duration-200">
                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    {h}
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </motion.div>
      </div>
    </PageShell>
  );
}
