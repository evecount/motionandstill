import { useEffect, useRef } from "react";
import { fractalStage, hilbertPoint, type Point } from "@/lib/fractal";

const SAMPLE_COUNT = 4096;
const CURVES = Array.from({ length: 7 }, (_, order) => {
  const count = 4 ** order;
  const curve = Array.from({ length: count }, (_, i) => hilbertPoint(order, i));
  return Array.from({ length: SAMPLE_COUNT }, (_, i): Point => {
    const position = i / (SAMPLE_COUNT - 1) * (count - 1);
    const a = curve[Math.floor(position)] ?? { x: 0, y: 0 };
    const b = curve[Math.min(count - 1, Math.floor(position) + 1)] ?? a;
    const t = position % 1;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
});

export function FractalMeditation({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = -1;
    let ink = "";
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      ink = getComputedStyle(canvas).color;
      previous = -1;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = () => {
      const p = progressRef.current;
      if (p !== previous) {
        previous = p;
        const { order, blend, scale } = fractalStage(p);
        const fine = CURVES[order] ?? CURVES[0];
        const coarse = CURVES[Math.max(0, order - 1)] ?? CURVES[0];
        context.clearRect(0, 0, width, height);
        context.strokeStyle = ink;
        context.fillStyle = ink;
        context.lineWidth = 0.75 + p * 0.9;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.globalAlpha = 0.52 + p * 0.28;
        const size = Math.min(width * 0.68, height * 0.54, 720) * scale;
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(Math.PI / 4);
        context.beginPath();
        fine?.forEach((a, i) => {
          const b = coarse?.[i] ?? a;
          const x = (a.x + (b.x - a.x) * blend) * size;
          const y = (a.y + (b.y - a.y) * blend) * size;
          if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
        context.beginPath();
        context.globalAlpha = 0.3 + p * 0.7;
        context.arc(0, 0, 1.5 + p * 1.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} role="img" aria-label="Fractal maze unraveling toward a central dot" data-progress={progress.toFixed(3)} className="pointer-events-none absolute inset-0 h-full w-full text-foreground" />;
}