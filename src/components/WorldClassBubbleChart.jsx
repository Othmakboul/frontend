import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, GraduationCap, FolderOpen, Star } from 'lucide-react';
import api from '../lib/api';

// ── Palette ────────────────────────────────────────────────────────────────
const PALETTE = [
  { fill: '#0f766e', light: '#5eead4' },
  { fill: '#1d4ed8', light: '#93c5fd' },
  { fill: '#7c3aed', light: '#c4b5fd' },
  { fill: '#92400e', light: '#fcd34d' },
  { fill: '#881337', light: '#fda4af' },
  { fill: '#155e75', light: '#67e8f9' },
  { fill: '#1e3a5f', light: '#93c5fd' },
  { fill: '#4a1d96', light: '#d8b4fe' },
  { fill: '#14532d', light: '#86efac' },
  { fill: '#713f12', light: '#fde68a' },
  { fill: '#701a75', light: '#f0abfc' },
  { fill: '#1c4532', light: '#6ee7b7' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function drand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function jaccard(kwA, kwB) {
  if (!kwA?.length || !kwB?.length) return 0;
  const sA = new Set(kwA.map(k => k.toLowerCase()));
  const sB = new Set(kwB.map(k => k.toLowerCase()));
  let inter = 0;
  for (const k of sA) if (sB.has(k)) inter++;
  return inter / (sA.size + sB.size - inter);
}

function abbrev(name) {
  const p = name.trim().split(/\s+/);
  return p.length < 2 ? name : p[0][0] + '. ' + p.slice(1).join(' ');
}

function clusterLines(name) {
  const base  = name.split(' | ')[0];
  const words = base.split(/\s+/);
  if (words.length <= 2) return [base];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// ── Physics — fewer React re-renders = much less lag ──────────────────────
// Key optimisation: only snapshot into React state at ~6 milestones
// instead of every 3 frames → 95 % fewer re-renders during animation.
function useLayout(clusters, bridges, W, H) {
  const [nodes, setNodes] = useState([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!clusters?.length) { setNodes([]); return; }
    cancelAnimationFrame(rafRef.current);

    const n       = clusters.length;
    const maxSize = Math.max(...clusters.map(c => c.size), 1);
    const areaPC  = (W * H * 0.70) / n;
    const maxR    = Math.min(Math.sqrt(areaPC / Math.PI) * 1.1, Math.min(W, H) * 0.42);
    const minR    = 52;

    const sim = clusters.map((ca, i) =>
      clusters.map((cb, j) => {
        if (i === j) return 0;
        const kwSim  = jaccard(ca.keywords, cb.keywords);
        const bridge = bridges?.find(b =>
          (b.cluster_a_id === ca.cluster_id && b.cluster_b_id === cb.cluster_id) ||
          (b.cluster_a_id === cb.cluster_id && b.cluster_b_id === ca.cluster_id)
        );
        return Math.max(kwSim, (bridge?.similarity || 0) / 100);
      })
    );

    const buildOffsets = (members, ci) =>
      (members || []).map((m, k) => ({
        angle: (k / Math.max(members.length, 1)) * Math.PI * 2 + ci * 0.8,
        band:  [0.28, 0.46, 0.63][k % 3],
        jx:    (drand(k * 13 + ci * 7)  - 0.5) * 10,
        jy:    (drand(k * 17 + ci * 11) - 0.5) * 10,
        id:    m.id,
        name:  m.name,
      }));

    const spread = Math.min(W, H) * 0.22;
    const ns = clusters.map((c, i) => {
      const angle = (i / n) * Math.PI * 2;
      const r     = Math.max(minR, maxR * Math.sqrt(c.size / maxSize));
      return {
        x:  W / 2 + Math.cos(angle) * spread * (0.55 + drand(i * 3) * 0.65),
        y:  H / 2 + Math.sin(angle) * spread * (0.55 + drand(i * 5) * 0.65),
        vx: 0, vy: 0, r,
        ...c,
        color: PALETTE[i % PALETTE.length],
        simRow: sim[i],
        idx: i,
        memberOffsets: buildOffsets(c.members, i),
      };
    });

    // Only push to React state at these frames (6 snapshots instead of ~80)
    const FRAMES    = 240;
    const SNAPSHOTS = new Set([20, 55, 100, 150, 200, FRAMES]);
    let frame = 0;

    const tick = () => {
      frame++;
      for (let i = 0; i < n; i++) {
        const ni = ns[i];
        ni.vx += (W / 2 - ni.x) * 0.0022;
        ni.vy += (H / 2 - ni.y) * 0.0022;

        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const nj   = ns[j];
          const dx   = ni.x - nj.x;
          const dy   = ni.y - nj.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const s    = ni.simRow[j];

          const ideal   = (ni.r + nj.r) * (0.30 + (1 - s) * 1.30);
          const spring  = ((dist - ideal) / dist) * 0.016;
          ni.vx -= dx * spring;
          ni.vy -= dy * spring;

          const hardMin = (ni.r + nj.r) * 0.18;
          if (dist < hardMin) {
            const push = ((hardMin - dist) / dist) * 0.65;
            ni.vx += dx * push;
            ni.vy += dy * push;
          }
        }

        const pad = ni.r * 0.55;
        if (ni.x < pad)      ni.vx += (pad - ni.x) * 0.12;
        if (ni.x > W - pad)  ni.vx -= (ni.x - W + pad) * 0.12;
        if (ni.y < pad)      ni.vy += (pad - ni.y) * 0.12;
        if (ni.y > H - pad)  ni.vy -= (ni.y - H + pad) * 0.12;

        // Stronger damping → settles faster
        ni.vx *= 0.78;
        ni.vy *= 0.78;
        ni.x  += ni.vx;
        ni.y  += ni.vy;
      }

      if (SNAPSHOTS.has(frame)) setNodes(ns.map(n => ({ ...n })));
      if (frame < FRAMES) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clusters, bridges, W, H]);

  return nodes;
}

// ── Researcher Profile Modal ───────────────────────────────────────────────
function ResearcherModal({ star, clusterNode, onClose }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/researchers/cards')
      .then(r => {
        const found = (r.data || []).find(c => c._unique_id === star.id);
        setCard(found || null);
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [star.id]);

  const col   = clusterNode?.color ?? { fill: '#6366f1', light: '#a5b4fc' };
  const lines = clusterLines(clusterNode?.name ?? '');
  const initials = star.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const stats = card ? [
    card.pub_count     > 0 && { icon: BookOpen,      val: card.pub_count,     label: 'Publications', color: '#60a5fa' },
    card.phd_count     > 0 && { icon: GraduationCap, val: card.phd_count,     label: 'Thèses',       color: '#a78bfa' },
    card.project_count > 0 && { icon: FolderOpen,    val: card.project_count, label: 'Projets',      color: '#34d399' },
  ].filter(Boolean) : [];

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="relative w-[380px] rounded-3xl overflow-hidden shadow-2xl z-10"
        style={{ background: 'rgba(8,10,24,0.98)', border: `1px solid ${col.fill}35` }}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}>

        {/* Header gradient band */}
        <div className="relative px-6 pt-9 pb-7 text-center overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${col.fill}55 0%, ${col.fill}18 60%, transparent 100%)` }}>

          {/* Glow orb behind avatar */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${col.fill}, transparent)`, filter: 'blur(28px)' }} />
          </div>

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 22 }}
            className="relative w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
              text-2xl font-black text-white shadow-2xl"
            style={{
              background: `radial-gradient(circle at 35% 32%, ${col.light}, ${col.fill})`,
              boxShadow: `0 0 0 4px ${col.fill}30, 0 0 40px ${col.fill}60`,
            }}>
            {initials}
            {/* Star badge */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: col.fill, boxShadow: `0 0 10px ${col.fill}` }}>
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="text-xl font-black text-white mb-2 leading-tight">
            {star.name}
          </motion.h2>

          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
            className="inline-block text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: col.fill + '35', color: col.light, border: `1px solid ${col.fill}50` }}>
            {lines[0]}{lines[1] ? ` · ${lines[1]}` : ''}
          </motion.span>
        </div>

        {/* Stats row */}
        {!loading && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
            className="flex border-y border-white/8">
            {stats.map(({ icon: Icon, val, label, color }, i) => (
              <div key={label}
                className={`flex-1 py-4 text-center ${i < stats.length - 1 ? 'border-r border-white/8' : ''}`}>
                <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                <p className="text-2xl font-black text-white leading-none">{val}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Loading shimmer */}
        {loading && (
          <div className="flex border-y border-white/8">
            {[1,2].map(i => (
              <div key={i} className="flex-1 py-5 px-4 flex flex-col items-center gap-2">
                <div className="w-16 h-6 rounded-lg bg-white/6 animate-pulse" />
                <div className="w-10 h-3 rounded bg-white/4 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Keywords from cluster */}
        {clusterNode?.keywords?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            className="px-6 py-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
              Thèmes du domaine
            </p>
            <div className="flex flex-wrap gap-1.5">
              {clusterNode.keywords.slice(0, 10).map((kw, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.28 + i * 0.03 }}
                  className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: col.fill + '22', color: col.light, border: `1px solid ${col.fill}40` }}>
                  {kw}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Co-members in same cluster */}
        {clusterNode?.members?.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}
            className="px-6 pb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Collègues du cluster ({clusterNode.members.length - 1})
            </p>
            <div className="flex flex-wrap gap-1">
              {clusterNode.members
                .filter(m => m.id !== star.id)
                .slice(0, 8)
                .map((m, i) => (
                  <span key={i}
                    className="text-xs px-2 py-0.5 rounded-full text-white/65"
                    style={{ backgroundColor: col.fill + '15', border: `1px solid ${col.fill}28` }}>
                    {m.name}
                  </span>
                ))}
            </div>
          </motion.div>
        )}

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center
            text-slate-400 hover:text-white transition-all hover:bg-white/10"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function WorldClassBubbleChart({ clusters, bridges = [] }) {
  const W = 1100, H = 640;
  const nodes = useLayout(clusters, bridges, W, H);

  const [hovered,       setHovered]       = useState(null);
  const [selectedStar,  setSelectedStar]  = useState(null); // { star, clusterNode }
  const [selResearcher, setSelResearcher] = useState(null);

  const onEnter  = useCallback(id => setHovered(id), []);
  const onLeave  = useCallback(()  => setHovered(null), []);

  const handleStarClick = useCallback((star) => {
    const clusterNode = nodes.find(n => n.cluster_id === star.cluster_id);
    setSelectedStar({ star, clusterNode });
  }, [nodes]);

  // Left panel researcher list — deduped
  const allResearchers = useMemo(() => {
    const seen = new Set(), out = [];
    nodes.forEach(n =>
      (n.members || []).forEach(m => {
        if (!seen.has(m.id)) { seen.add(m.id); out.push({ ...m, color: n.color }); }
      })
    );
    return out;
  }, [nodes]);

  // Star positions — stable (no Math.random, only deterministic offsets)
  const stars = useMemo(() =>
    nodes.flatMap(n =>
      (n.memberOffsets || []).map(off => ({
        id:         off.id,
        name:       off.name,
        color:      n.color,
        cluster_id: n.cluster_id,
        x: n.x + Math.cos(off.angle) * n.r * off.band + off.jx,
        y: n.y + Math.sin(off.angle) * n.r * off.band + off.jy,
      }))
    ),
  [nodes]);

  const hovNode = nodes.find(n => n.cluster_id === hovered);

  if (!clusters?.length || !nodes.length) return null;

  return (
    <div className="relative select-none">

      {/* Title */}
      <div className="text-center mb-4">
        <p className="text-[10px] font-bold tracking-[0.35em] text-slate-500 uppercase mb-0.5">
          L'Univers Thématique du Labo
        </p>
        <p className="text-xs text-slate-600">
          {clusters.length} domaines · {allResearchers.length} chercheurs —
          survolez une bulle · cliquez une étoile ✦ pour le profil
        </p>
      </div>

      {/* Main row */}
      {/* Main row */}
      <div className="flex rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: 'rgba(4,6,18,0.98)' }}>

        {/* ── SVG canvas ──────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '640px' }}>
            <defs>
              {nodes.map(n => (
                <radialGradient key={`rg-${n.idx}`} id={`vrg-${n.idx}`} cx="38%" cy="32%" r="72%">
                  <stop offset="0%"   stopColor={n.color.light} stopOpacity="0.16" />
                  <stop offset="55%"  stopColor={n.color.fill}  stopOpacity="0.27" />
                  <stop offset="100%" stopColor={n.color.fill}  stopOpacity="0.40" />
                </radialGradient>
              ))}
              <filter id="ambient" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="24" />
              </filter>
              <filter id="sglow" x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>
            </defs>

            {/* Ambient glow */}
            {nodes.map(n => (
              <circle key={`amb-${n.idx}`} cx={n.x} cy={n.y} r={n.r}
                fill={n.color.fill} opacity={0.07}
                filter="url(#ambient)" pointerEvents="none" />
            ))}

            {/* Circles — big to small */}
            {[...nodes].sort((a, b) => b.r - a.r).map(n => {
              const isHov = n.cluster_id === hovered;
              const lines = clusterLines(n.name);
              const fs    = Math.max(15, Math.min(27, n.r * 0.29));
              return (
                <g key={`cl-${n.idx}`}
                  onMouseEnter={() => onEnter(n.cluster_id)}
                  onMouseLeave={onLeave}>
                  <circle cx={n.x} cy={n.y} r={n.r}
                    fill={`url(#vrg-${n.idx})`} opacity={isHov ? 1 : 0.88}
                    style={{ transition: 'opacity 0.25s', pointerEvents: 'all', cursor: 'default' }} />
                  <circle cx={n.x} cy={n.y} r={n.r} fill="none"
                    stroke={n.color.light}
                    strokeWidth={isHov ? 1.8 : 0.7}
                    opacity={isHov ? 0.55 : 0.20}
                    style={{ transition: 'all 0.25s' }} pointerEvents="none" />
                  {lines.map((line, li) => (
                    <text key={li}
                      x={n.x} y={n.y + (li - (lines.length - 1) / 2) * (fs * 1.22)}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={fs} fontWeight="900"
                      pointerEvents="none"
                      style={{ userSelect: 'none', letterSpacing: '-0.4px',
                        filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.95))' }}>
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}

            {/* Stars ✦ — each one clickable */}
            {stars.map(s => {
              const isHovC = s.cluster_id === hovered;
              const dim    = hovered && !isHovC;
              return (
                <g key={`star-${s.id}`}
                  opacity={dim ? 0.12 : 1}
                  style={{ transition: 'opacity 0.22s', cursor: 'pointer' }}
                  onClick={() => handleStarClick(s)}>

                  {/* Invisible wide click target */}
                  <circle cx={s.x} cy={s.y} r={16} fill="transparent" />

                  {/* Glow halo */}
                  <circle cx={s.x} cy={s.y} r={9}
                    fill={s.color.light}
                    opacity={isHovC ? 0.22 : 0.07}
                    style={{ transition: 'opacity 0.2s' }}
                    pointerEvents="none" />

                  {/* Star ✦ */}
                  <text x={s.x} y={s.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.90)" fontSize={11}
                    filter="url(#sglow)"
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}>
                    ✦
                  </text>

                  {/* Abbreviated name */}
                  <text x={s.x} y={s.y + 14}
                    textAnchor="middle" dominantBaseline="hanging"
                    fill="rgba(255,255,255,0.58)" fontSize={8}
                    pointerEvents="none"
                    style={{ userSelect: 'none',
                      filter: 'drop-shadow(0 1px 4px rgba(0,0,0,1))' }}>
                    {abbrev(s.name)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Cluster hover detail — overlaid at bottom, pointer-events none */}
          <AnimatePresence>
            {hovNode && (
              <motion.div
                key={`hov-${hovNode.cluster_id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.17 }}
                className="absolute bottom-0 left-0 right-0 px-5 py-4 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(4,6,18,0.97) 55%, transparent)',
                  borderBottomRightRadius: '0',
                }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hovNode.color.fill,
                      boxShadow: `0 0 8px ${hovNode.color.fill}` }} />
                  <p className="font-black text-white text-sm">{hovNode.name}</p>
                  <span className="text-xs text-slate-500 ml-1">
                    · {hovNode.size} chercheur{hovNode.size > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-5 flex-wrap">
                  {hovNode.keywords?.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Mots-clés</p>
                      <div className="flex flex-wrap gap-1">
                        {hovNode.keywords.slice(0, 7).map((kw, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: hovNode.color.fill + '28', color: hovNode.color.light,
                              border: `1px solid ${hovNode.color.fill}45` }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Membres</p>
                    <div className="flex flex-wrap gap-1">
                      {hovNode.members.map((m, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full text-white/70"
                          style={{ backgroundColor: hovNode.color.fill + '1a',
                            border: `1px solid ${hovNode.color.fill}30` }}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badge */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl border border-white/8
            text-xs font-bold text-slate-400"
            style={{ background: 'rgba(4,6,18,0.82)', backdropFilter: 'blur(8px)' }}>
            {clusters.length} domaines · {allResearchers.length} chercheurs
          </div>

          {!hovNode && (
            <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
              <p className="text-[11px] text-slate-600 italic">
                Survolez une bulle · cliquez ✦ pour voir le profil d'un chercheur
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Researcher profile modal (fixed, no layout impact) ─────────── */}
      <AnimatePresence>
        {selectedStar && (
          <ResearcherModal
            star={selectedStar.star}
            clusterNode={selectedStar.clusterNode}
            onClose={() => setSelectedStar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
