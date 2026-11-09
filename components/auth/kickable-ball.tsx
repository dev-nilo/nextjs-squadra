"use client";

import { useCallback, useEffect, useRef } from "react";

const R = 14; // ball radius, px
const KICK_SPEED = 950; // px/s for a tap
const MAX_SPEED = 2600; // px/s cap for a flick
const RESTITUTION = 0.72; // energy kept on a wall bounce
const TAP_DISTANCE = 6; // px of pointer travel still counted as a tap
const STOP_SPEED = 6; // px/s below which the ball comes to rest

type Sample = { x: number; y: number; t: number };

/**
 * The lone ball on the auth pitch picture. Drag and release to flick it, tap to kick it away
 * from where you touched, Enter/Space to kick it from the keyboard. It rolls with grass
 * friction, spins as it rolls and bounces off the picture's edges.
 */
export function KickableBall() {
  const areaRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const spinRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const state = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    w: 0,
    h: 0,
    placed: false,
    raf: 0,
    last: 0,
    dragging: false,
    pointerId: -1,
    offX: 0,
    offY: 0,
    down: { x: 0, y: 0, t: 0 },
    samples: [] as Sample[],
    friction: 1.6, // per second, exponential decay rate
  });

  const paint = useCallback(() => {
    const s = state.current;
    if (ballRef.current) ballRef.current.style.transform = `translate(${s.x - R}px, ${s.y - R}px)`;
    if (shadowRef.current) shadowRef.current.style.transform = `translate(${s.x - R + 5}px, ${s.y + R - 4}px)`;
    spinRef.current?.setAttribute("transform", `rotate(${s.angle})`);
  }, []);

  const clamp = useCallback(() => {
    const s = state.current;
    s.x = Math.min(Math.max(s.x, R), Math.max(R, s.w - R));
    s.y = Math.min(Math.max(s.y, R), Math.max(R, s.h - R));
  }, []);

  const stepRef = useRef<(t: number) => void>(() => {});
  const step = useCallback(
    (t: number) => {
      const s = state.current;
      const dt = Math.min(0.032, (t - s.last) / 1000 || 0.016);
      s.last = t;

      const k = Math.exp(-s.friction * dt);
      s.vx *= k;
      s.vy *= k;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.x < R) {
        s.x = R;
        s.vx = Math.abs(s.vx) * RESTITUTION;
      } else if (s.x > s.w - R) {
        s.x = s.w - R;
        s.vx = -Math.abs(s.vx) * RESTITUTION;
      }
      if (s.y < R) {
        s.y = R;
        s.vy = Math.abs(s.vy) * RESTITUTION;
      } else if (s.y > s.h - R) {
        s.y = s.h - R;
        s.vy = -Math.abs(s.vy) * RESTITUTION;
      }

      const speed = Math.hypot(s.vx, s.vy);
      // rolling without slipping: angle = distance / radius
      s.angle += ((Math.sign(s.vx || s.vy) * speed * dt) / R) * (180 / Math.PI);
      paint();

      if (speed > STOP_SPEED && !s.dragging) {
        s.raf = requestAnimationFrame(stepRef.current);
      } else {
        s.raf = 0;
        if (!s.dragging) {
          s.vx = 0;
          s.vy = 0;
        }
      }
    },
    [paint],
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const run = useCallback(() => {
    const s = state.current;
    if (s.raf) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame(stepRef.current);
  }, []);

  const kick = useCallback(
    (dirX: number, dirY: number, power = KICK_SPEED) => {
      const s = state.current;
      const len = Math.hypot(dirX, dirY) || 1;
      s.vx = (dirX / len) * power;
      s.vy = (dirY / len) * power;
      run();
    },
    [run],
  );

  // Measure the picture, place the ball once, keep it inside on resize.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      state.current.friction = reduced.matches ? 9 : 1.6;
    };
    applyMotion();
    reduced.addEventListener("change", applyMotion);

    const ro = new ResizeObserver(([entry]) => {
      const s = state.current;
      s.w = entry.contentRect.width;
      s.h = entry.contentRect.height;
      if (!s.placed && s.w > 0 && s.h > 0) {
        s.x = s.w * 0.72;
        s.y = s.h * (s.h < 360 ? 0.46 : 0.76);
        s.placed = true;
      }
      clamp();
      paint();
      if (ballRef.current) ballRef.current.style.opacity = "1";
      if (shadowRef.current) shadowRef.current.style.opacity = "1";
    });
    ro.observe(area);
    const s = state.current;
    return () => {
      ro.disconnect();
      reduced.removeEventListener("change", applyMotion);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [clamp, paint]);

  const local = (e: React.PointerEvent) => {
    const rect = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = state.current;
    const p = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.dragging = true;
    s.pointerId = e.pointerId;
    s.vx = 0;
    s.vy = 0;
    s.offX = p.x - s.x;
    s.offY = p.y - s.y;
    s.down = { x: p.x, y: p.y, t: e.timeStamp };
    s.samples = [{ x: s.x, y: s.y, t: e.timeStamp }];
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    const p = local(e);
    const prevX = s.x;
    s.x = p.x - s.offX;
    s.y = p.y - s.offY;
    clamp();
    s.angle += ((s.x - prevX) / R) * (180 / Math.PI);
    s.samples.push({ x: s.x, y: s.y, t: e.timeStamp });
    s.samples = s.samples.filter((q) => e.timeStamp - q.t < 90);
    paint();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = state.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    s.dragging = false;
    const p = local(e);
    const travelled = Math.hypot(p.x - s.down.x, p.y - s.down.y);

    if (travelled < TAP_DISTANCE) {
      // tap: kick away from the side that was touched
      kick(s.x - p.x || Math.random() - 0.5, s.y - p.y || -1);
      return;
    }

    const first = s.samples[0];
    const last = s.samples[s.samples.length - 1];
    if (!first || !last) return;
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return;
    let vx = (last.x - first.x) / dt;
    let vy = (last.y - first.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }
    s.vx = vx;
    s.vy = vy;
    run();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const a = Math.random() * Math.PI * 2;
    kick(Math.cos(a), Math.sin(a));
  };

  return (
    <div ref={areaRef} className="pointer-events-none absolute inset-0 z-20">
      <span
        ref={shadowRef}
        aria-hidden="true"
        className="absolute left-0 top-0 h-2 w-7 rounded-full bg-overlay/40 opacity-0 blur-[3px]"
      />
      <button
        ref={ballRef}
        type="button"
        aria-label="Bola: arraste ou toque para chutar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="pointer-events-auto absolute left-0 top-0 h-7 w-7 cursor-grab touch-none select-none rounded-full opacity-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-panel active:cursor-grabbing"
      >
        <svg viewBox="-14 -14 28 28" className="h-full w-full" aria-hidden="true">
          <circle r="13" className="fill-panel-foreground" />
          <g ref={spinRef}>
            <path
              d="M-12 -4 Q0 -8 12 -4 M-12 5 Q0 9 12 5 M-4 -12 Q-6 -8 -4 -5 M4 -12 Q6 -8 4 -5 M-4 12 Q-6 8 -4 6 M4 12 Q6 8 4 6"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="stroke-panel"
              strokeOpacity="0.55"
            />
          </g>
        </svg>
      </button>
    </div>
  );
}
