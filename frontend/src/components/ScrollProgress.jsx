import { useEffect, useState } from "react";

export const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 h-[3px] z-[60] bg-transparent" data-testid="scroll-progress">
      <div
        className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
        style={{ width: `${progress}%`, transition: "width 80ms linear" }}
      />
    </div>
  );
};
