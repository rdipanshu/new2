import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Award, FileText, BadgeCheck, Maximize2, Search, X, Link2, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { api, assetUrl, CATEGORIES } from "../lib/api";

const CertCard = ({ cert, index, onOpen }) => {
  const preview = cert.file_type === "image" ? cert.file_url : cert.thumb_url;
  const copyLink = () => {
    const url = `${window.location.origin}/certifications?cert=${cert.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Certificate link copied to clipboard"),
      () => toast.error("Could not copy link")
    );
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 6) * 0.05 }}
    >
      <GlassCard className="overflow-hidden group hover:border-cyan-500/50 hover:-translate-y-1 transition-[border-color,transform] duration-300" data-testid={`cert-card-${cert.id}`}>
        {!cert.file_url && cert.verify_url ? (
          <a
            href={cert.verify_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-44 bg-zinc-900/80 flex flex-col items-center justify-center gap-3 hover:bg-zinc-900 transition-colors duration-200"
            data-testid={`cert-click-to-show-${cert.id}`}
          >
            <Award className="w-10 h-10 text-cyan-400/70" />
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-cyan-400 border border-cyan-500/40 px-3 py-1.5 rounded-sm">
              Click to Show <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        ) : (
          <button
            onClick={() => cert.file_url && onOpen(cert)}
            className="relative w-full h-44 block text-left cursor-pointer"
            data-testid={`cert-preview-${cert.id}`}
            aria-label={`View ${cert.title}`}
          >
            {preview ? (
              <img src={assetUrl(preview)} alt={cert.title} className="w-full h-full object-cover object-top bg-white" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-zinc-900/80 flex items-center justify-center">
                {cert.file_type === "pdf" ? (
                  <FileText className="w-10 h-10 text-emerald-400/70" />
                ) : (
                  <Award className="w-10 h-10 text-cyan-400/50" />
                )}
              </div>
            )}
            {cert.file_url && (
              <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-cyan-400" />
              </span>
            )}
          </button>
        )}
        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1.5">{cert.category}</p>
          <h3 className="text-white text-sm font-semibold leading-snug">{cert.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {cert.verify_url && (
              <a
                href={cert.verify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-cyan-400 border border-cyan-500/40 px-2.5 py-1 rounded-sm hover:bg-cyan-500/10 transition-colors duration-200"
                data-testid={`cert-verify-${cert.id}`}
              >
                <BadgeCheck className="w-3.5 h-3.5" /> Verify credential
              </a>
            )}
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded-sm hover:border-cyan-500/50 hover:text-cyan-400 transition-colors duration-200"
              data-testid={`cert-share-${cert.id}`}
              title="Copy shareable link"
            >
              <Link2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default function Certifications() {
  const page = usePage("certifications");
  const [certs, setCerts] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const d = page?.data || {};

  useEffect(() => {
    api.get("/certifications").then((r) => {
      setCerts(r.data);
      const shared = searchParams.get("cert");
      if (shared) {
        const cert = r.data.find((c) => c.id === shared);
        if (cert) {
          if (cert.file_url) openLightbox(cert);
          else if (cert.verify_url) window.open(cert.verify_url, "_blank");
        }
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLightbox = (cert) => {
    setLightbox(cert);
    api.post("/analytics/cert-view", { cert_id: cert.id }).catch(() => {});
  };

  const visible = query.trim()
    ? certs.filter((c) => `${c.title} ${c.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    : certs;

  const renderGrid = (list) =>
    list.length === 0 ? (
      <GlassCard className="p-10 text-center text-zinc-500 font-mono text-sm" data-testid="certs-empty-state">
        {query.trim() ? `No certifications match "${query}".` : "No certifications in this category yet. Upload them from the Admin Console."}
      </GlassCard>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {list.map((c, i) => <CertCard key={c.id} cert={c} index={i} onOpen={openLightbox} />)}
      </div>
    );

  return (
    <PageShell videoUrl={page?.video_url} testId="certifications-page">
      <PageHeading overline={`// ${certs.length} credentials verified`} title={d.heading || "Certifications & Badges"} />
      <p className="text-zinc-400 -mt-6 mb-8 max-w-2xl">{d.intro}</p>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search credentials..."
          className="w-full bg-zinc-950/70 backdrop-blur-xl border border-white/10 rounded-md pl-10 pr-10 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors duration-200"
          data-testid="cert-search-input"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors" data-testid="cert-search-clear" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Tabs defaultValue="all" data-testid="cert-tabs">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-950/70 backdrop-blur-xl border border-white/10 p-1.5 rounded-md mb-8 justify-start">
          <TabsTrigger value="all" data-testid="cert-tab-all" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-cyan-500 data-[state=active]:text-black rounded-sm">
            All ({visible.length})
          </TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              data-testid={`cert-tab-${cat.toLowerCase().replace(/\s/g, "-")}`}
              className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-cyan-500 data-[state=active]:text-black rounded-sm"
            >
              {cat} ({visible.filter((c) => c.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all">{renderGrid(visible)}</TabsContent>
        {CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat}>
            {renderGrid(visible.filter((c) => c.category === cat))}
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl w-[94vw] h-[88vh] bg-zinc-950 border-white/10 p-3 flex flex-col gap-2" data-testid="cert-lightbox">
          <DialogTitle className="font-heading text-white text-base px-1">{lightbox?.title}</DialogTitle>
          <DialogDescription className="sr-only">Full-screen preview of the certificate</DialogDescription>
          <div className="flex-1 min-h-0">
            {lightbox?.file_type === "pdf" ? (
              <iframe src={assetUrl(lightbox.file_url)} title={lightbox.title} className="w-full h-full rounded-sm bg-white" />
            ) : (
              lightbox && <img src={assetUrl(lightbox.file_url)} alt={lightbox.title} className="w-full h-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
