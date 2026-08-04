import { useState } from "react";
import { MapPin, Phone, Mail, Globe, Send, Linkedin, Github } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeading } from "../components/PageShell";
import { GlassCard } from "../components/GlassCard";
import { usePage } from "../hooks/usePage";
import { api } from "../lib/api";

export default function Contact() {
  const page = usePage("contact");
  const d = page?.data || {};
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent successfully. I'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const details = [
    { icon: MapPin, label: "Location", value: d.location, testId: "contact-location" },
    { icon: Phone, label: "Phone", value: d.phone, href: `tel:${d.phone}`, testId: "contact-phone" },
    { icon: Mail, label: "Email", value: d.email, href: `mailto:${d.email}`, testId: "contact-email" },
    { icon: Globe, label: "Website", value: d.website, href: `https://${d.website}`, testId: "contact-website" },
    ...(d.linkedin ? [{ icon: Linkedin, label: "LinkedIn", value: d.linkedin.replace(/^https?:\/\/(www\.)?/, ""), href: d.linkedin, testId: "contact-linkedin" }] : []),
    ...(d.github ? [{ icon: Github, label: "GitHub", value: d.github.replace(/^https?:\/\/(www\.)?/, ""), href: d.github, testId: "contact-github" }] : []),
  ];

  const inputCls =
    "w-full bg-black/50 border border-zinc-700 rounded-sm px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors duration-200";

  return (
    <PageShell videoUrl={page?.video_url} testId="contact-page">
      <PageHeading overline="// open channel" title={d.heading || "Get In Touch"} />
      <p className="text-zinc-400 -mt-6 mb-10 max-w-2xl">{d.intro}</p>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <GlassCard className="p-8 lg:col-span-3" data-testid="contact-form-card">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="contact-input-name" />
              <input required type="email" placeholder="Your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} data-testid="contact-input-email" />
            </div>
            <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputCls} data-testid="contact-input-subject" />
            <textarea required rows={6} placeholder="Your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls} data-testid="contact-input-message" />
            <button
              type="submit"
              disabled={sending}
              data-testid="contact-submit-button"
              className="inline-flex items-center gap-2 bg-cyan-500 text-black font-semibold px-7 py-3 rounded-sm hover:bg-cyan-400 transition-colors duration-200 disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              <Send className="w-4 h-4" /> {sending ? "Transmitting..." : "Send Message"}
            </button>
          </form>
        </GlassCard>
        <div className="lg:col-span-2 space-y-4">
          {details.map((it) => (
            <GlassCard key={it.label} className="p-5 hover:border-cyan-500/50 transition-colors duration-300" data-testid={it.testId}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <it.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{it.label}</p>
                  {it.href ? (
                    <a href={it.href} className="text-white text-sm hover:text-cyan-400 transition-colors">{it.value}</a>
                  ) : (
                    <p className="text-white text-sm">{it.value}</p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
