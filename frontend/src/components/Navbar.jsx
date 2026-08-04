import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Shield, Menu, X, Linkedin, Github } from "lucide-react";
import { getSocials } from "../lib/api";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/summary", label: "Summary" },
  { to: "/skills", label: "Skills" },
  { to: "/experience", label: "Experience" },
  { to: "/certifications", label: "Certifications" },
  { to: "/education", label: "Education" },
  { to: "/activity", label: "Activity" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [socials, setSocials] = useState({});
  useEffect(() => { getSocials().then(setSocials); }, []);
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6" data-testid="main-navbar">
        <div className="mt-4 flex items-center justify-between bg-zinc-950/70 backdrop-blur-xl border border-white/10 rounded-md px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <Shield className="w-5 h-5 text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-[filter]" />
            <span className="font-mono text-sm tracking-widest text-white uppercase">DR<span className="text-cyan-400">_</span>SEC</span>
          </NavLink>
          <div className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-link-${l.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-colors duration-200 ${
                    isActive ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <span className="mx-2 h-4 w-px bg-white/10" />
            {socials.linkedin && (
              <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" data-testid="nav-social-linkedin" className="p-1.5 text-zinc-400 hover:text-cyan-400 transition-colors duration-200">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {socials.github && (
              <a href={socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" data-testid="nav-social-github" className="p-1.5 text-zinc-400 hover:text-cyan-400 transition-colors duration-200">
                <Github className="w-4 h-4" />
              </a>
            )}
          </div>
          <button
            className="lg:hidden text-zinc-300 hover:text-cyan-400 transition-colors"
            onClick={() => setOpen(!open)}
            data-testid="nav-mobile-toggle"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden mt-2 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-md p-3 grid grid-cols-2 gap-1" data-testid="nav-mobile-menu">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 font-mono text-xs uppercase tracking-wider rounded-sm ${
                    isActive ? "text-cyan-400 bg-cyan-500/10" : "text-zinc-400"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="col-span-2 flex gap-2 pt-1 border-t border-white/10 mt-1">
              {socials.linkedin && (
                <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {socials.github && (
                <a href={socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors">
                  <Github className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
