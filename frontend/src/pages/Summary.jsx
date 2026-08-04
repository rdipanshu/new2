import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { FileText, Download, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { BACKEND_URL } from "../lib/api";

export default function Summary() {
  const page = usePage("summary");
  const d = page?.data || {};
  return (
    <PageShell videoUrl={page?.video_url} testId="summary-page">
      <PageHeading overline="// whoami" title={d.heading || "Professional Summary"} />
      <GlassCard className="p-8 md:p-12 max-w-4xl" data-testid="summary-card">
        <FileText className="w-6 h-6 text-cyan-400 mb-6" />
        <p className="text-zinc-300 leading-loose text-base md:text-lg" data-testid="summary-body">{d.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`${BACKEND_URL}/api/uploads/CV_Dipanshu_Rana.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="summary-download-cv"
            className="inline-flex items-center gap-2 border border-emerald-500/60 text-emerald-400 font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-sm hover:bg-emerald-500/10 transition-colors duration-200"
          >
            <Download className="w-4 h-4" /> Download CV
          </a>
          <Link
            to="/resume"
            data-testid="summary-resume-link"
            className="inline-flex items-center gap-2 border border-cyan-500/60 text-cyan-400 font-mono text-sm uppercase tracking-wider px-5 py-2.5 rounded-sm hover:bg-cyan-500/10 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" /> Printable Resume
          </Link>
        </div>
      </GlassCard>
    </PageShell>
  );
}
