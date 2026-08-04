export const GlassCard = ({ children, className = "", ...props }) => (
  <div
    className={`bg-zinc-950/70 backdrop-blur-xl border border-white/10 rounded-md ${className}`}
    {...props}
  >
    {children}
  </div>
);
