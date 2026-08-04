import { useEffect, useState } from "react";

const LINES = [
  { text: "> initializing dr_sec portfolio v2.6 ...", cls: "text-zinc-400" },
  { text: "> loading security modules ............ OK", cls: "text-zinc-400" },
  { text: "> verifying credentials database ..... OK", cls: "text-zinc-400" },
  { text: "> access granted", cls: "text-emerald-400" },
];

export const BootSplash = () => {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem("boot_done"));
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (step < LINES.length) {
      const t = setTimeout(() => setStep(step + 1), 320);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setFading(true), 350);
    const t2 = setTimeout(() => {
      sessionStorage.setItem("boot_done", "1");
      setVisible(false);
    }, 750);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [step, visible]);

  if (!visible) return null;
  return (
    <div
      className={`fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center px-6 ${fading ? "opacity-0" : "opacity-100"}`}
      style={{ transition: "opacity 400ms ease" }}
      data-testid="boot-splash"
    >
      <div className="w-full max-w-md font-mono text-sm space-y-2">
        {LINES.slice(0, step).map((l, i) => (
          <p key={i} className={l.cls}>{l.text}</p>
        ))}
        <p className="text-cyan-400">{step < LINES.length ? <span className="cursor-blink">_</span> : null}</p>
      </div>
    </div>
  );
};
