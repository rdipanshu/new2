import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Printer, ArrowLeft, MapPin, Phone, Mail, Globe } from "lucide-react";
import { api } from "../lib/api";

export default function Resume() {
  const [pages, setPages] = useState(null);
  const [certCount, setCertCount] = useState(0);

  useEffect(() => {
    document.title = "Resume | Dipanshu Rana";
    api.get("/pages").then((r) => {
      const map = {};
      r.data.forEach((p) => (map[p.page_id] = p.data));
      setPages(map);
    });
    api.get("/certifications").then((r) => setCertCount(r.data.length)).catch(() => {});
  }, []);

  if (!pages) return <div className="min-h-screen bg-white flex items-center justify-center font-mono text-sm text-zinc-500">Loading resume...</div>;

  const contact = pages.contact || {};
  const summary = pages.summary || {};
  const skills = pages.skills || {};
  const experience = pages.experience || {};
  const education = pages.education || {};
  const activity = pages.activity || {};

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 print:bg-white" data-testid="resume-page">
      <div className="no-print fixed top-4 right-4 flex gap-2 z-10">
        <Link to="/summary" className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-zinc-700 transition-colors" data-testid="resume-back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-cyan-500 text-black text-sm font-semibold px-4 py-2 rounded-sm hover:bg-cyan-400 transition-colors" data-testid="resume-print-btn">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>
      <div className="mx-auto max-w-3xl bg-white shadow-lg print:shadow-none my-8 print:my-0 p-10 print:p-0">
        <header className="border-b-2 border-zinc-900 pb-5 mb-6">
          <h1 className="font-heading text-3xl font-bold tracking-tight" data-testid="resume-name">Dipanshu Rana</h1>
          <p className="text-zinc-600 font-medium mt-1">Cybersecurity Specialist & Network Security Engineer</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {contact.location}</span>
            <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>
            <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {contact.website}</span>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Summary</h2>
          <p className="text-sm leading-relaxed text-zinc-700">{summary.body}</p>
        </section>

        <section className="mb-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Experience</h2>
          {(experience.items || []).map((item, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-baseline">
                <p className="font-semibold text-sm">{item.company} <span className="font-normal text-zinc-600">— {item.role}</span></p>
                <p className="text-xs text-zinc-500 shrink-0 ml-3">{item.period}</p>
              </div>
              <ul className="list-disc ml-5 mt-1 text-sm text-zinc-700 space-y-0.5">
                {(item.points || []).map((p, j) => <li key={j}>{p}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Skills</h2>
          {(skills.categories || []).map((cat, i) => (
            <p key={i} className="text-sm mb-1.5">
              <span className="font-semibold">{cat.name}:</span>{" "}
              <span className="text-zinc-700">{(cat.skills || []).join(", ")}</span>
            </p>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Education</h2>
          {(education.items || []).map((item, i) => (
            <div key={i} className="flex justify-between items-baseline mb-2">
              <p className="text-sm"><span className="font-semibold">{item.degree}</span> <span className="text-zinc-600">— {item.school}</span>{item.highlight && <span className="text-zinc-500 italic"> ({item.highlight})</span>}</p>
              <p className="text-xs text-zinc-500 shrink-0 ml-3">{item.date}</p>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Certifications</h2>
          <p className="text-sm text-zinc-700">{certCount} verified certifications across Anthropic, IBM, Cisco, Google, University of Helsinki, Amazon and Simplilearn. Full gallery: {contact.website}/certifications</p>
        </section>

        <section>
          <h2 className="font-heading text-sm font-bold uppercase tracking-widest border-b border-zinc-300 pb-1 mb-3">Honors & Interests</h2>
          <p className="text-sm text-zinc-700 mb-1"><span className="font-semibold">Honors:</span> {(activity.honors || []).join(", ")}</p>
          <p className="text-sm text-zinc-700"><span className="font-semibold">Interests:</span> {(activity.hobbies || []).join(", ")}</p>
        </section>
      </div>
    </div>
  );
}
