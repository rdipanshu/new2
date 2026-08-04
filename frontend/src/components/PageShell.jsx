import { motion } from "framer-motion";
import { Navbar } from "./Navbar";
import { VideoBackground } from "./VideoBackground";
import { ScrollProgress } from "./ScrollProgress";

export const PageShell = ({ videoUrl, children, testId }) => (
  <div className="min-h-screen text-white" data-testid={testId}>
    <ScrollProgress />
    <VideoBackground src={videoUrl} />
    <Navbar />
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-7xl px-4 sm:px-6 pt-32 pb-24"
    >
      {children}
    </motion.main>
  </div>
);

export const PageHeading = ({ overline, title }) => (
  <div className="mb-12">
    {overline && <p className="font-mono text-cyan-400 text-xs uppercase tracking-[0.3em] mb-3">{overline}</p>}
    <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">{title}</h1>
    <div className="mt-6 h-px w-24 bg-gradient-to-r from-cyan-400 to-transparent" />
  </div>
);
