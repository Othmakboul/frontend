import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3, Search, Info, X } from 'lucide-react';
import api from '../lib/api';

// ──────────────────────────────────────────────────
// Color scale: 0 → deep dark, max → vibrant indigo/blue
// ──────────────────────────────────────────────────
function heatColor(value, max) {
  if (value === 0) return 'rgba(15,23,42,0.6)';
  if (max === 0) return 'rgba(15,23,42,0.6)';
  const ratio = Math.min(1, value / Math.max(max * 0.8, 1));
  // Interpolate: dark slate → indigo → blue → cyan
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    return `rgba(${Math.round(30 + t * 67)}, ${Math.round(27 + t * 56)}, ${Math.round(75 + t * 130)}, ${0.6 + t * 0.4})`;
  }
  if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return `rgba(${Math.round(97 - t * 38)}, ${Math.round(83 + t * 16)}, ${Math.round(205 - t * 20)}, 0.9)`;
  }
  const t = (ratio - 0.66) / 0.34;
  return `rgba(${Math.round(59 - t * 10)}, ${Math.round(99 + t * 31)}, ${Math.round(185 + t * 55)}, 1)`;
}

export default function CollaborationHeatmap() {
  const [matrix, setMatrix] = useState(null);
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null); // { row, col, value, nameA, nameB }
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [researchers, setResearchers] = useState([]);
  const [maxVal, setMaxVal] = useState(1);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resR, collabR] = await Promise.all([
        api.get('/api/researchers/cards'),
        api.post('/api/advanced/aggregated-stats', {
          researchers: [], // will get all
          start_year: 2010,
          end_year: 2026,
        }).catch(() => ({ data: { collaborations: { pairs: [] } } })),
      ]);

      const cards = resR.data || [];
      setResearchers(cards);

      // Build name→index map
      const nameList = cards.map(r => r.name);
      const nameIdx = Object.fromEntries(nameList.map((n, i) => [n, i]));
      const n = nameList.length;

      // Initialize matrix
      const mat = Array.from({ length: n }, () => new Array(n).fill(0));

      // Fill from pairs
      const pairs = collabR.data?.collaborations?.pairs || [];
      let localMax = 0;
      pairs.forEach(p => {
        const [nameA, nameB] = p.pair.split(' | ');
        const i = nameIdx[nameA];
        const j = nameIdx[nameB];
        if (i !== undefined && j !== undefined) {
          mat[i][j] = p.count;
          mat[j][i] = p.count;
          if (p.count > localMax) localMax = p.count;
        }
      });

      setNames(nameList);
      setMatrix(mat);
      setMaxVal(localMax || 1);
    } catch (e) {
      console.error('Heatmap error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter researchers by search + category
  const filteredCards = researchers.filter(r => {
    const nameOk = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const catOk = catFilter === 'all' || r.category === catFilter;
    return nameOk && catOk;
  });

  const filteredNames = filteredCards.map(r => r.name);
  const filteredIndices = filteredNames.map(n => names.indexOf(n)).filter(i => i !== -1);

  const categories = ['all', ...new Set(researchers.map(r => r.category).filter(Boolean))];

  const cellSize = Math.min(22, Math.max(10, Math.floor(560 / Math.max(filteredIndices.length, 1))));
  const labelWidth = 140;
  const totalSize = filteredIndices.length * cellSize;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-slate-500 text-sm animate-pulse">Construction de la matrice de collaboration…</p>
      </div>
    );
  }

  if (!matrix || filteredIndices.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Grid3x3 className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p>Aucune donnée disponible. Synchronisez d'abord HAL.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer un chercheur…"
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 ring-indigo-500 placeholder-slate-600"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 outline-none"
        >
          {categories.map(c => (
            <option key={c} value={c} className="bg-slate-800">
              {c === 'all' ? 'Toutes catégories' : c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{filteredIndices.length} chercheurs</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Chaque cellule = nombre de publications co-signées. Plus c'est bleu, plus la collaboration est intense.</span>
        <div className="flex items-center gap-1 ml-auto">
          <span>0</span>
          {[0, 0.15, 0.3, 0.5, 0.7, 0.9, 1].map((v, i) => (
            <div key={i} className="w-5 h-3 rounded-sm" style={{ background: heatColor(v * maxVal, maxVal) }} />
          ))}
          <span>{maxVal}</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="relative" style={{ minWidth: labelWidth + totalSize + 10 }}>
          {/* Column headers (rotated) */}
          <div
            className="flex"
            style={{ marginLeft: labelWidth, height: labelWidth, position: 'relative' }}
          >
            {filteredIndices.map((gi, ci) => (
              <div
                key={gi}
                style={{
                  width: cellSize,
                  height: labelWidth,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transformOrigin: 'left bottom',
                    transform: 'rotate(-55deg)',
                    whiteSpace: 'nowrap',
                    fontSize: Math.max(8, cellSize * 0.55) + 'px',
                    color: selected !== null && (selected.row === ci || selected.col === ci) ? '#818cf8' : '#64748b',
                    fontWeight: 500,
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 0.15s',
                  }}
                  title={names[gi]}
                >
                  {names[gi].split(' ').pop()}
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {filteredIndices.map((gi, ri) => (
            <div key={gi} className="flex items-center" style={{ height: cellSize }}>
              {/* Row label */}
              <div
                style={{
                  width: labelWidth,
                  fontSize: Math.max(9, cellSize * 0.52) + 'px',
                  color: selected !== null && (selected.row === ri || selected.col === ri) ? '#818cf8' : '#64748b',
                  fontWeight: 500,
                  paddingRight: 8,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                  transition: 'color 0.15s',
                }}
                title={names[gi]}
              >
                {names[gi]}
              </div>

              {/* Cells */}
              {filteredIndices.map((gj, ci) => {
                const value = ri === ci ? -1 : (matrix[gi]?.[gj] ?? 0);
                const isHov = hovered?.row === ri && hovered?.col === ci;
                const isSel = selected?.row === ri && selected?.col === ci;
                const isDiag = ri === ci;

                return (
                  <div
                    key={gj}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      flexShrink: 0,
                      background: isDiag
                        ? 'rgba(99,102,241,0.15)'
                        : isHov || isSel
                        ? 'rgba(129,140,248,0.8)'
                        : heatColor(value, maxVal),
                      border: `0.5px solid rgba(255,255,255,0.04)`,
                      cursor: isDiag ? 'default' : 'pointer',
                      transition: 'background 0.1s, transform 0.1s',
                      transform: isHov ? 'scale(1.3)' : 'scale(1)',
                      zIndex: isHov ? 10 : 1,
                      position: 'relative',
                      borderRadius: isDiag ? '3px' : '2px',
                    }}
                    onMouseEnter={e => {
                      if (!isDiag) {
                        setHovered({ row: ri, col: ci, value, nameA: names[gi], nameB: names[gj] });
                        setTooltip({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (!isDiag && value > 0) {
                        setSelected(isSel ? null : { row: ri, col: ci, value, nameA: names[gi], nameB: names[gj] });
                      }
                    }}
                  >
                    {isDiag && cellSize > 14 && (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: cellSize * 0.5 + 'px', color: 'rgba(129,140,248,0.6)',
                      }}>
                        ●
                      </div>
                    )}
                    {!isDiag && value > 0 && cellSize > 17 && (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.max(7, cellSize * 0.48) + 'px',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 700,
                        pointerEvents: 'none',
                      }}>
                        {value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="fixed z-[200] pointer-events-none px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-2xl border border-white/10 backdrop-blur-xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'rgba(15,23,42,0.95)',
          }}
        >
          {hovered.value === 0 ? (
            <span className="text-slate-400">Aucune collaboration entre<br /><strong className="text-white">{hovered.nameA}</strong> et <strong className="text-white">{hovered.nameB}</strong></span>
          ) : (
            <span>
              <strong className="text-indigo-300">{hovered.nameA}</strong>
              <span className="text-slate-400"> × </span>
              <strong className="text-indigo-300">{hovered.nameB}</strong>
              <br />
              <span className="text-white text-sm">{hovered.value} publication{hovered.value > 1 ? 's' : ''} co-signée{hovered.value > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      )}

      {/* Selected cell detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
              {selected.value}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold">
                {selected.nameA} <span className="text-indigo-400">×</span> {selected.nameB}
              </p>
              <p className="text-indigo-300 text-sm">
                {selected.value} publication{selected.value > 1 ? 's' : ''} co-signée{selected.value > 1 ? 's' : ''} dans la base HAL
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
