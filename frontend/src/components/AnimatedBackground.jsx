import { useEffect, useRef } from "react";

function makeParticleWave(canvas, ctx) {
  const pts = [];
  const COLS = 90, ROWS = 34;
  return {
    init() {
      pts.length = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) pts.push({ c, r });
    },
    draw(t, w, h) {
      ctx.fillStyle = "#02100a";
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.32;
      for (const p of pts) {
        const depth = p.r / ROWS;
        const x = (p.c / (COLS - 1)) * w * 1.4 - w * 0.2;
        const wave = Math.sin(p.c * 0.25 + t * 0.9 + p.r * 0.45) * 26 + Math.sin(p.c * 0.07 - t * 0.5) * 44;
        const y = horizon + depth * (h - horizon) + wave * (0.25 + depth);
        const a = 0.12 + depth * 0.75;
        const size = 0.8 + depth * 2.1;
        ctx.fillStyle = `rgba(52,232,154,${a})`;
        ctx.fillRect(x, y, size, size);
      }
    },
  };
}

function makeTunnel(canvas, ctx) {
  const rings = [];
  const RINGS = 42, PER = 46;
  return {
    init() {
      rings.length = 0;
      for (let i = 0; i < RINGS; i++) rings.push(i / RINGS);
    },
    draw(t, w, h) {
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2 + Math.sin(t * 0.3) * 30;
      const cy = h / 2 + Math.cos(t * 0.22) * 22;
      for (let i = 0; i < rings.length; i++) {
        let z = (rings[i] + t * 0.055) % 1;
        const radius = Math.pow(z, 2.2) * Math.max(w, h) * 0.75 + 8;
        const a = Math.min(0.85, z * 1.1);
        for (let j = 0; j < PER; j++) {
          const ang = (j / PER) * Math.PI * 2 + t * 0.18 + i * 0.35 + Math.sin(t * 0.6 + i) * 0.12;
          const x = cx + Math.cos(ang) * radius;
          const y = cy + Math.sin(ang) * radius * 0.82;
          const cyan = j % 3 === 0;
          ctx.fillStyle = cyan ? `rgba(34,211,238,${a})` : `rgba(99,102,241,${a * 0.8})`;
          const s = 0.7 + z * 2.4;
          ctx.fillRect(x, y, s, s);
        }
      }
    },
  };
}

function makeSparks(canvas, ctx) {
  const sparks = [];
  return {
    init() {
      sparks.length = 0;
      for (let i = 0; i < 130; i++)
        sparks.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.8, v: 0.0004 + Math.random() * 0.0012, ph: Math.random() * 6.28 });
    },
    draw(t, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0d0703");
      g.addColorStop(0.55, "#0a0806");
      g.addColorStop(1, "#030612");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const p of sparks) {
        p.y -= p.v * (1 + Math.sin(t + p.ph) * 0.3);
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const x = p.x * w + Math.sin(t * 0.8 + p.ph) * 14;
        const y = p.y * h;
        const warm = p.ph > 3.14;
        const a = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.4 + p.ph));
        ctx.fillStyle = warm ? `rgba(217,119,6,${a})` : `rgba(251,191,36,${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, p.s, 0, 6.28);
        ctx.fill();
      }
    },
  };
}

function makeMotes(canvas, ctx) {
  const motes = [];
  return {
    init() {
      motes.length = 0;
      for (let i = 0; i < 110; i++)
        motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.0005, vy: (Math.random() - 0.5) * 0.0005, ph: Math.random() * 6.28 });
    },
    draw(t, w, h) {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h * 0.95, 0, w / 2, h * 0.95, Math.max(w, h) * 0.85);
      g.addColorStop(0, "rgba(34,211,238,0.10)");
      g.addColorStop(0.5, "rgba(16,185,129,0.05)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const p of motes) {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        const a = 0.15 + 0.4 * Math.abs(Math.sin(t * 0.7 + p.ph));
        ctx.fillStyle = `rgba(148,233,255,${a})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.s, 0, 6.28);
        ctx.fill();
      }
    },
  };
}

const VARIANTS = { home: makeMotes, summary: makeTunnel, experience: makeParticleWave, education: makeSparks };

export const AnimatedBackground = ({ variant }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const maker = VARIANTS[variant] || makeMotes;
    const scene = maker(canvas, ctx);
    let raf;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    scene.init();
    window.addEventListener("resize", resize);
    const start = performance.now();
    const loop = () => {
      scene.draw((performance.now() - start) / 1000, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [variant]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" data-testid={`animated-bg-${variant}`} />;
};
