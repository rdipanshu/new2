import { assetUrl } from "../lib/api";
import { AnimatedBackground } from "./AnimatedBackground";

const FALLBACK =
  "https://images.unsplash.com/photo-1761599821310-da0d6356b4f3?crop=entropy&cs=srgb&fm=jpg&q=85";

export const VideoBackground = ({ src }) => {
  const isAnim = src && src.startsWith("anim:");
  return (
    <div className="fixed inset-0 -z-10 bg-zinc-950" aria-hidden="true">
      {isAnim ? (
        <AnimatedBackground variant={src.slice(5)} />
      ) : (
        <>
          <img src={FALLBACK} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          {src && (
            <video
              key={src}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => console.error("Background video failed to load:", src, e)}
            >
              {src.endsWith(".mp4") && <source src={assetUrl(src).replace(/\.mp4$/, ".webm")} type="video/webm" />}
              <source src={assetUrl(src)} type="video/mp4" />
            </video>
          )}
        </>
      )}
      <div className={`absolute inset-0 ${isAnim ? "bg-black/30" : "bg-black/60"}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90" />
    </div>
  );
};
