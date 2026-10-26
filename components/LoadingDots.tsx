"use client";

import { useEffect, useRef } from "react";

// A 16:9 grey panel filled with a grid of dots that scale up/down in interfering, slowly-rotating
// waves — the effect of waves travelling around the surface. Driven by rAF writing transforms
// directly to the dot nodes (no React re-render) for smooth 60fps.
const COLS = 22;
const ROWS = 12;

export default function LoadingDots({ label }: { label?: string }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const dots = Array.from(grid.querySelectorAll<HTMLDivElement>("[data-dot]"));
    const coords = dots.map((d) => ({ d, nx: +d.dataset.nx!, ny: +d.dataset.ny! }));

    let raf = 0;
    const start = performance.now();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const ang = t * 0.22; // slowly rotating wave direction
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      for (const { d, nx, ny } of coords) {
        const proj = nx * ca + ny * sa; // position along the rotating wavefront
        const r = Math.hypot(nx, ny); // radial distance for ripples
        const w1 = Math.sin(proj * 5.0 - t * 1.7);
        const w2 = Math.sin(r * 6.5 - t * 1.15);
        const v = ((w1 * 0.62 + w2 * 0.38) + 1) / 2; // 0..1
        const scale = 0.26 + v * 0.92; // 0.26 .. 1.18
        const opacity = 0.22 + v * 0.62;
        d.style.transform = `scale(${scale.toFixed(3)})`;
        d.style.opacity = opacity.toFixed(3);
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nx = c / (COLS - 1) - 0.5;
      const ny = r / (ROWS - 1) - 0.5;
      cells.push(
        <span key={`${r}-${c}`} className="flex items-center justify-center">
          <span
            data-dot
            data-nx={nx}
            data-ny={ny}
            className="rounded-full"
            style={{ width: 5, height: 5, background: "#8b8b93", willChange: "transform, opacity" }}
          />
        </span>,
      );
    }
  }

  return (
    <div className="w-full">
      {label && <div className="mb-3 text-[13.5px] text-faint">{label}</div>}
      <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-[#efeff0]">
        <div
          ref={gridRef}
          className="grid h-[93%] w-[95%]"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
}
