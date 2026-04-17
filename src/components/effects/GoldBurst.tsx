'use client';

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

interface GoldBurstProps {
  trigger: boolean;
  className?: string;
}

const GOLD_COLORS = [
  "#DEA93E", // Match our brand gold
  "#e8c882",
  "#d4b87a",
  "#f0d898",
  "#b89850",
  "#dcc48e",
];

export default function GoldBurst({ trigger, className = "" }: GoldBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!trigger || hasTriggered.current) return;
    hasTriggered.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const particles: Particle[] = [];
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Create burst particles
    for (let i = 0; i < 35; i++) {
      const angle = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.5;
      const speed = 1.5 + Math.random() * 3;
      const maxLife = 40 + Math.random() * 30;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 1.5 + Math.random() * 3,
        opacity: 1,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }

    // Add some sparkle dots
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 0.8 + Math.random() * 1.2,
        opacity: 1,
        color: "#fff",
        life: 0,
        maxLife: 25 + Math.random() * 20,
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      let alive = false;
      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.rotationSpeed;

        const lifeRatio = p.life / p.maxLife;
        p.opacity = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1 - (lifeRatio - 0.2) / 0.8;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.color === "#fff") {
          // Sparkle
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * p.size * 2, Math.sin(a) * p.size * 2);
          }
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          // Gold particle: diamond shape
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();

          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;
          ctx.fill();
        }

        ctx.restore();
      }

      if (alive) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-20 ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
