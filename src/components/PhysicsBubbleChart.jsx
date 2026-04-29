import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PALETTE = [
  { fill: '#6366f1', glow: 'rgba(99,102,241,0.4)' },
  { fill: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  { fill: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  { fill: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  { fill: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  { fill: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  { fill: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  { fill: '#ec4899', glow: 'rgba(236,72,153,0.4)' },
  { fill: '#14b8a6', glow: 'rgba(20,184,166,0.4)' },
  { fill: '#84cc16', glow: 'rgba(132,204,22,0.4)' },
  { fill: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  { fill: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
];

function computeGridTargets(clusters, W, H) {
  const n = clusters.length;
  if (!n) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (W / H))));
  const rows = Math.ceil(n / cols);
  const cellW = W / cols;
  const cellH = H / rows;
  const maxSize = Math.max(...clusters.map(c => c.size), 1);

  return clusters.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = cellW * (col + 0.5);
    const ty = cellH * (row + 0.5);
    const maxR = Math.min(cellW, cellH) * 0.40;
    const r = Math.max(24, maxR * Math.sqrt(c.size / maxSize));
    return { tx, ty, r };
  });
}

export default function PhysicsBubbleChart({ clusters }) {
  const svgRef = useRef(null);
  const nodesRef = useRef([]);
  const rafRef = useRef(null);
  const [renderNodes, setRenderNodes] = useState([]);
  const [hovered, setHovered] = useState(null);
  const W = 900, H = 460;

  const initNodes = useCallback((clusterData, targets) => {
    return clusterData.map((c, i) => {
      const { tx, ty, r } = targets[i];
      const prev = nodesRef.current[i];
      return {
        x: prev ? prev.x : tx + (Math.random() - 0.5) * 40,
        y: prev ? prev.y : ty + (Math.random() - 0.5) * 40,
        vx: prev ? prev.vx * 0.3 : 0,
        vy: prev ? prev.vy * 0.3 : 0,
        tx, ty, r,
        ...c,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, []);

  useEffect(() => {
    if (!clusters?.length) return;
    const targets = computeGridTargets(clusters, W, H);
    const nodes = initNodes(clusters, targets);
    nodesRef.current = nodes;

    let frame = 0;
    const tick = () => {
      frame++;
      const ns = nodesRef.current;

      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];

        // Spring toward target
        const kSpring = 0.04;
        n.vx += (n.tx - n.x) * kSpring;
        n.vy += (n.ty - n.y) * kSpring;

        // Repulsion from other nodes
        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const o = ns[j];
          const dx = n.x - o.x;
          const dy = n.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const minDist = n.r + o.r + 8;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.35;
            n.vx += dx * force;
            n.vy += dy * force;
          }
        }

        // Wall bounce
        const margin = n.r + 4;
        if (n.x < margin) n.vx += (margin - n.x) * 0.15;
        if (n.x > W - margin) n.vx -= (n.x - (W - margin)) * 0.15;
        if (n.y < margin) n.vy += (margin - n.y) * 0.15;
        if (n.y > H - margin) n.vy -= (n.y - (H - margin)) * 0.15;

        // Damping
        n.vx *= 0.82;
        n.vy *= 0.82;

        n.x += n.vx;
        n.y += n.vy;
      }

      // Update render every 2 frames for perf
      if (frame % 2 === 0) {
        setRenderNodes(ns.map(n => ({ ...n })));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clusters, initNodes]);

  if (!clusters?.length) return null;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ height: '440px' }}
        className="w-full rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800"
      >
        <defs>
          {renderNodes.map((n, i) => (
            <radialGradient key={`grad-${i}`} id={`grad-${i}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor={n.color.fill} />
            </radialGradient>
          ))}
          {renderNodes.map((n, i) => (
            <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={hovered?.cluster_id === n.cluster_id ? 8 : 4} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          ))}
        </defs>

        {/* Glow halos */}
        {renderNodes.map((n, i) => (
          <circle
            key={`halo-${i}`}
            cx={n.x} cy={n.y}
            r={n.r + (hovered?.cluster_id === n.cluster_id ? 18 : 8)}
            fill={n.color.glow}
            style={{ transition: 'r 0.3s ease' }}
          />
        ))}

        {/* Main bubbles */}
        {renderNodes.map((n, i) => {
          const isHov = hovered?.cluster_id === n.cluster_id;
          const label = n.name.split(' | ')[0].split(' ').slice(0, 2).join(' ');
          const fontSize = Math.max(9, Math.min(14, n.r / 3.2));
          return (
            <g
              key={`bubble-${n.cluster_id}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={n.x} cy={n.y} r={n.r}
                fill={`url(#grad-${i})`}
                stroke={n.color.fill}
                strokeWidth={isHov ? 2.5 : 1}
                strokeOpacity={isHov ? 1 : 0.6}
                style={{ transition: 'stroke-width 0.2s, stroke-opacity 0.2s' }}
              />
              <text
                x={n.x} y={n.y - (n.r > 36 ? 8 : 1)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={fontSize} fontWeight="700"
                style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {label.length > 15 ? label.slice(0, 13) + '…' : label}
              </text>
              {n.r > 34 && (
                <text
                  x={n.x} y={n.y + fontSize + 4}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.7)" fontSize={Math.max(7, fontSize - 3)}
                  style={{ pointerEvents: 'none' }}
                >
                  {n.size} membre{n.size > 1 ? 's' : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-3 right-3 w-72 p-4 rounded-2xl pointer-events-none z-10
              bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hovered.color.fill }} />
              <p className="font-bold text-white text-sm leading-tight">{hovered.name}</p>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {hovered.size} chercheur{hovered.size > 1 ? 's' : ''}
            </p>
            {hovered.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {hovered.keywords.slice(0, 5).map((kw, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-white/10 text-slate-300">{kw}</span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {hovered.members?.map(m => (
                <span key={m.id}
                  className="text-xs px-2 py-0.5 rounded-lg font-medium text-white"
                  style={{ backgroundColor: hovered.color.fill + 'bb' }}>
                  {m.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
