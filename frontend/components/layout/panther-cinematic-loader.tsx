"use client";

import { useEffect, useMemo, useState } from "react";

const STATUS_MESSAGES = [
  "Initializing logistics systems…",
  "Connecting to PantherTMS services…",
  "Synchronizing shipment data…",
  "Preparing your workspace…",
];

const PARTICLES = [
  [7, 18, 1.1, 0], [14, 72, 0.8, 1.2], [23, 34, 1.4, 0.4], [31, 82, 0.7, 2.1],
  [44, 13, 0.9, 1.4], [54, 78, 1.2, 0.8], [67, 22, 0.8, 2.6], [76, 68, 1.3, 1.7],
  [86, 39, 0.7, 0.2], [92, 83, 1, 2.8], [11, 46, 0.7, 2.4], [82, 14, 0.9, 1.9],
];

export function PantherCinematicLoader({ label }: { label?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    const tick = () => {
      setElapsed((performance.now() - startedAt) % 10000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const progress = Math.min(100, Math.round((elapsed / 10000) * 100));
  const status = label || STATUS_MESSAGES[Math.min(3, Math.floor(elapsed / 2500))];
  const formattedProgress = String(progress).padStart(2, "0");
  const hubs = useMemo(() => [
    { x: "23%", y: "42%", name: "WEST" },
    { x: "43%", y: "32%", name: "NORTH" },
    { x: "61%", y: "53%", name: "CENTRAL" },
    { x: "77%", y: "38%", name: "EAST" },
    { x: "68%", y: "73%", name: "SOUTH" },
  ], []);

  return (
    <main className="panther-loader" aria-label="PantherTMS loading">
      <div className="loader-aurora loader-aurora-left" />
      <div className="loader-aurora loader-aurora-right" />
      <div className="loader-grid" />
      <div className="loader-vignette" />

      {PARTICLES.map(([left, top, size, delay], index) => (
        <span
          key={index}
          className="loader-particle"
          style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` }}
        />
      ))}

      <div className="loader-corner loader-corner-tl">PANTHER / OPS<span>SECURE TRANSPORT LAYER</span></div>
      <div className="loader-corner loader-corner-tr">LIVE SYSTEMS<span>NODE 01 · ONLINE</span></div>

      <section className="loader-stage">
        <div className="loader-brand">
          <div className="loader-mark-wrap">
            <div className="loader-mark-ring loader-mark-ring-outer" />
            <div className="loader-mark-ring loader-mark-ring-inner" />
            <img src="/panther-logo-transparent.png" alt="PantherTMS" className="loader-mark" />
          </div>
          <div className="loader-wordmark"><span>PANTHER</span><b>TMS</b></div>
          <p>CONNECTED LOGISTICS OPERATIONS</p>
        </div>

        <div className="loader-network" aria-hidden="true">
          <svg viewBox="0 0 1000 520" preserveAspectRatio="none" className="loader-map">
            <defs>
              <linearGradient id="routeStroke" x1="0" x2="1">
                <stop offset="0" stopColor="#6ee7ff" stopOpacity=".15" />
                <stop offset=".5" stopColor="#62d9ff" stopOpacity=".9" />
                <stop offset="1" stopColor="#8aa8ff" stopOpacity=".2" />
              </linearGradient>
              <filter id="routeGlow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path className="continent" d="M110 180l64-61 98 12 62 65-30 76-84 42-101-34-40-51zM446 147l82-30 87 52-13 72-54 23-19 119-56 58-35-99 22-89-38-59zM634 154l92-45 126 46 66 85-36 96-106 14-73-50-67-4-35-58zM755 390l73-25 55 44-34 56-101-3z" />
            <path className="route" d="M230 278 C330 190 365 205 442 275 S580 350 670 245 S772 184 840 245" />
            <path className="route route-secondary" d="M230 278 C270 360 390 388 442 275 S606 220 670 245 S740 350 792 424" />
            <path className="route route-secondary" d="M442 275 C520 205 610 190 670 245" />
            <circle className="route-dot" cx="230" cy="278" r="7" /><circle className="route-dot" cx="442" cy="275" r="7" /><circle className="route-dot" cx="670" cy="245" r="7" /><circle className="route-dot" cx="840" cy="245" r="7" /><circle className="route-dot" cx="792" cy="424" r="6" />
            <circle className="packet packet-one" cx="230" cy="278" r="4" /><circle className="packet packet-two" cx="442" cy="275" r="4" /><circle className="packet packet-three" cx="670" cy="245" r="4" />
          </svg>
          {hubs.map((hub) => <span key={hub.name} className="hub" style={{ left: hub.x, top: hub.y }}><i /><b>{hub.name}</b></span>)}
          <div className="loader-truck"><span className="truck-light" /><span className="truck-body" /><span className="truck-cab" /><i /><i /></div>
        </div>

        <div className="loader-status">
          <div className="status-live"><span /> SYSTEM INITIALIZATION</div>
          <p key={status} className="status-message">{status}</p>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /><span className="progress-glow" style={{ left: `${progress}%` }} /></div>
          <div className="progress-meta"><span>Panther core systems</span><span>{formattedProgress}%</span></div>
        </div>
      </section>

      <footer className="loader-footer"><span>FREIGHT INTELLIGENCE PLATFORM</span><span className="footer-line" /><span>AUTHENTICATED ENVIRONMENT</span></footer>
    </main>
  );
}
