import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Newspaper, ArrowRight, Clock } from "lucide-react";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { api } from "../lib/api";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export default function Blog() {
  const page = usePage("blog");
  const [posts, setPosts] = useState(null);
  const d = page?.data || {};

  useEffect(() => {
    api.get("/blog").then((r) => setPosts(r.data)).catch(() => setPosts([]));
  }, []);

  return (
    <PageShell videoUrl={page?.video_url} testId="blog-page">
      <PageHeading overline="// security write-ups" title={d.heading || "Security Write-ups"} />
      <p className="text-zinc-400 -mt-6 mb-10 max-w-2xl">{d.intro}</p>
      {posts && posts.length === 0 && (
        <GlassCard className="p-10 text-center text-zinc-500 font-mono text-sm max-w-2xl" data-testid="blog-empty-state">
          No articles published yet. Check back soon.
        </GlassCard>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
        {(posts || []).map((post, i) => (
          <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: (i % 4) * 0.07 }}>
            <Link to={`/blog/${post.slug}`} data-testid={`blog-card-${post.slug}`}>
              <GlassCard className="p-7 h-full hover:border-cyan-500/50 hover:-translate-y-1 transition-[border-color,transform] duration-300 group">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="w-4 h-4 text-cyan-400" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    {fmtDate(post.created_at)}
                  </p>
                </div>
                <h2 className="font-heading text-lg font-semibold text-white leading-snug group-hover:text-cyan-400 transition-colors duration-200">{post.title}</h2>
                {post.excerpt && <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{post.excerpt}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(post.tags || []).map((t) => (
                    <span key={t} className="font-mono text-[10px] uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm">{t}</span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-cyan-400">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
