import { Link } from "react-router-dom";
import { ShieldAlert, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4" data-testid="notfound-page">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="ml-3 font-mono text-xs text-zinc-500">dr_sec@portfolio: ~</span>
        </div>
        <div className="p-8 font-mono text-sm space-y-3">
          <p className="text-zinc-400">$ access requested_resource</p>
          <p className="text-red-500 flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="w-5 h-5" /> ERROR 404 // ACCESS DENIED
          </p>
          <p className="text-zinc-400">&gt; The resource you are looking for does not exist,</p>
          <p className="text-zinc-400">&gt; has been moved, or is protected by a firewall.</p>
          <p className="text-emerald-400">&gt; Intrusion attempt logged<span className="cursor-blink">_</span></p>
          <div className="pt-4">
            <Link
              to="/"
              data-testid="notfound-home-btn"
              className="inline-flex items-center gap-2 bg-cyan-500 text-black font-sans font-semibold px-6 py-2.5 rounded-sm hover:bg-cyan-400 transition-colors duration-200"
            >
              <Home className="w-4 h-4" /> Return to Base
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
