import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import valleyBackdropUrl from '../assets/images/fernhollow_night_valley_1794802373150.jpg';

interface FernhollowCanvasProps {
  variant?: 'hero' | 'dashboard';
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  speed: number;
  hue: number;
}

interface Flower {
  xRatio: number;
  height: number;
  swayPhase: number;
  swaySpeed: number;
  petalColor: string;
  glowColor: string;
  scale: number;
}

export const FernhollowCanvas: React.FC<FernhollowCanvasProps> = ({
  variant = 'hero',
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      pointerRef.current.targetX = nx;
      pointerRef.current.targetY = ny;
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = variant === 'hero' ? 54 : 26;
    const fireflies: Firefly[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.08 - Math.random() * 0.25,
      radius: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.025,
      hue: 245 + Math.random() * 45, // indigo to violet/blue
    }));

    const flowerCount = variant === 'hero' ? 22 : 10;
    const flowers: Flower[] = Array.from({ length: flowerCount }, (_, i) => {
      const palette = [
        { petal: 'rgba(139, 92, 246, 0.55)', glow: 'rgba(139, 92, 246, 0.25)' },
        { petal: 'rgba(99, 102, 241, 0.55)', glow: 'rgba(99, 102, 241, 0.25)' },
        { petal: 'rgba(167, 139, 250, 0.50)', glow: 'rgba(167, 139, 250, 0.22)' },
        { petal: 'rgba(96, 165, 250, 0.45)', glow: 'rgba(96, 165, 250, 0.20)' },
      ][i % 4];
      return {
        xRatio: (i + 0.5) / flowerCount + (Math.random() - 0.5) * 0.03,
        height: 44 + Math.random() * 76,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.008 + Math.random() * 0.009,
        petalColor: palette.petal,
        glowColor: palette.glow,
        scale: 0.75 + Math.random() * 0.65,
      };
    });

    let rafId = 0;
    let tick = 0;

    const render = () => {
      tick++;
      pointerRef.current.x +=
        (pointerRef.current.targetX - pointerRef.current.x) * 0.04;
      pointerRef.current.y +=
        (pointerRef.current.targetY - pointerRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';
      const parallaxX = pointerRef.current.x * 16;
      const parallaxY = pointerRef.current.y * 10;

      // Soft bioluminescent botanical valley blooms along the bottom edge (dark mode hero/auth)
      if (isDark && variant === 'hero') {
        for (const f of flowers) {
          const sway = prefersReduced
            ? 0
            : Math.sin(tick * f.swaySpeed + f.swayPhase) * 10;
          const baseX = f.xRatio * width + parallaxX * 0.6;
          const baseY = height + 8;
          const tipX = baseX + sway;
          const tipY = height - f.height;

          // Stem
          ctx.beginPath();
          ctx.moveTo(baseX, baseY);
          ctx.quadraticCurveTo(baseX + sway * 0.4, (baseY + tipY) / 2, tipX, tipY);
          ctx.strokeStyle = 'rgba(49, 46, 129, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Bioluminescent halo
          const pulse = prefersReduced
            ? 1
            : 0.85 + 0.15 * Math.sin(tick * 0.025 + f.swayPhase);
          const glowRadius = 28 * f.scale * pulse;
          const grad = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, glowRadius);
          grad.addColorStop(0, f.glowColor);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(tipX, tipY, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          // Delicate petals
          ctx.fillStyle = f.petalColor;
          for (let p = 0; p < 5; p++) {
            const ang = (p * Math.PI * 2) / 5 + sway * 0.01;
            const px = tipX + Math.cos(ang) * 4.5 * f.scale;
            const py = tipY + Math.sin(ang) * 4.5 * f.scale;
            ctx.beginPath();
            ctx.arc(px, py, 2.8 * f.scale, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center pistil
          ctx.fillStyle = 'rgba(233, 213, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 2 * f.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating fireflies & glowing dust motes
      for (const fly of fireflies) {
        if (!prefersReduced) {
          fly.phase += fly.speed;
          fly.x += fly.vx + Math.sin(fly.phase * 0.7) * 0.25;
          fly.y += fly.vy + Math.cos(fly.phase * 0.5) * 0.15;

          if (fly.y < -20) fly.y = height + 20;
          if (fly.x < -20) fly.x = width + 20;
          if (fly.x > width + 20) fly.x = -20;
        }

        const alphaBase = isDark ? (variant === 'hero' ? 0.78 : 0.42) : 0.28;
        const alpha =
          alphaBase * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(fly.phase)));

        const drawX = fly.x + parallaxX;
        const drawY = fly.y + parallaxY;

        const halo = ctx.createRadialGradient(
          drawX,
          drawY,
          0,
          drawX,
          drawY,
          fly.radius * 6
        );
        const colorRGB = isDark
          ? fly.hue > 270
            ? '196, 181, 253'
            : '129, 140, 248'
          : '139, 92, 246';
        halo.addColorStop(0, `rgba(${colorRGB}, ${alpha})`);
        halo.addColorStop(1, `rgba(${colorRGB}, 0)`);

        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(drawX, drawY, fly.radius * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, fly.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        rafId = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, variant]);

  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Base atmosphere */}
      {isDark ? (
        <div className="absolute inset-0 bg-[#050712]">
          {!imgFailed && (
            <img
              src={valleyBackdropUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover animate-fernhollow-drift transition-opacity duration-500 ${
                variant === 'hero' ? 'opacity-65' : 'opacity-20'
              }`}
            />
          )}
          {/* Fallback / atmospheric midnight vignette */}
          <div
            className={`absolute inset-0 ${
              variant === 'hero'
                ? 'bg-gradient-to-b from-[#050712]/70 via-[#090d22]/45 to-[#050712]/90'
                : 'bg-gradient-to-b from-[#050712]/85 via-[#080c1e]/85 to-[#050712]/95'
            }`}
          />
          <div className="absolute -top-32 left-1/4 w-[42rem] h-[42rem] rounded-full bg-violet-600/10 blur-[140px]" />
          <div className="absolute bottom-0 right-1/5 w-[36rem] h-[36rem] rounded-full bg-indigo-600/10 blur-[140px]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#FAF9F6]">
          <div className="absolute -top-40 right-1/4 w-[46rem] h-[46rem] rounded-full bg-violet-200/40 blur-[140px]" />
          <div className="absolute bottom-0 left-1/5 w-[40rem] h-[40rem] rounded-full bg-indigo-100/50 blur-[140px]" />
        </div>
      )}

      {/* Interactive fireflies & bioluminescent blooms */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
