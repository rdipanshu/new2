import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { PageShell } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { api } from "../lib/api";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const renderContent = (content) =>
  content.split(/\n\n+/).map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return <h2 key={i} className="font-heading text-xl font-semibold text-white mt-8 mb-3">{trimmed.slice(3)}</h2>;
    }
    if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i} className="list-disc ml-6 space-y-1.5 text-zinc-300 text-base mb-4">
          {trimmed.split("\n").map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}
        </ul>
      );
    }
    return <p key={i} className="text-zinc-300 text-base leading-loose mb-4 whitespace-pre-wrap">{trimmed}</p>;
  });

export default function BlogPost() {
  const { slug } = useParams();
  const page = usePage("blog");
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/blog/${slug}`)
      .then((r) => {
        setPost(r.data);
        document.title = `${r.data.title} | Dipanshu Rana`;
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  return (
    <PageShell videoUrl={page?.video_url} testId="blog-post-page">
      <Link to="/blog" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors mb-8" data-testid="blog-post-back">
        <ArrowLeft className="w-4 h-4" /> All write-ups
      </Link>
      {notFound && (
        <GlassCard className="p-10 text-center text-zinc-500 font-mono text-sm max-w-2xl" data-testid="blog-post-notfound">
          Article not found or unpublished.
        </GlassCard>
      )}
      {post && (
        <GlassCard className="p-8 md:p-12 max-w-3xl" data-testid="blog-post-content">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">{fmtDate(post.created_at)}</p>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500">
              <Clock className="w-3 h-3" /> {Math.max(1, Math.round(post.content.split(/\s+/).length / 200))} min read
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-white mb-4" data-testid="blog-post-title">{post.title}</h1>
          <div className="flex flex-wrap gap-2 mb-8">
            {(post.tags || []).map((t) => (
              <span key={t} className="font-mono text-[10px] uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm">{t}</span>
            ))}
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-cyan-400 to-transparent mb-8" />
          {renderContent(post.content)}
        </GlassCard>
      )}
    </PageShell>
  );
}
