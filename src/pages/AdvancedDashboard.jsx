import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Network, AlertTriangle, Layers, BookOpen,
  FolderOpen, RefreshCw, Shield, ChevronRight,
  GraduationCap, Users
} from 'lucide-react';
import api from '../lib/api';

// ─── Tab Navigation ────────────────────────────────────────────────────────
const TABS = [
  { id: 'collaborations', label: 'Collaborations', icon: Network },
  { id: 'inconsistencies', label: 'Inconsistencies', icon: AlertTriangle },
  { id: 'clustering', label: 'Clustering', icon: Layers },
];

// ─── Researcher Cards Tab ──────────────────────────────────────────────────
function ResearcherCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pubs, setPubs] = useState(null);
  const [phds, setPhds] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    api.get('/api/researchers/cards').then(r => {
      setCards(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openResearcher = async (r) => {
    setSelected(r);
    setPubs(null);
    setPhds(null);
    setPanelLoading(true);
    try {
      const [pubRes, phdRes] = await Promise.all([
        api.get(`/api/researchers/${r._unique_id}/publications`),
        api.get(`/api/researchers/${r._unique_id}/phd-students`),
      ]);
      setPubs(pubRes.data);
      setPhds(phdRes.data);
    } catch (e) { console.error(e); }
    finally { setPanelLoading(false); }
  };

  if (loading) return <Spinner label="Loading researcher cards from database..." />;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Grid */}
      <div className={`overflow-y-auto p-1 ${selected ? 'w-1/2' : 'w-full'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(r => (
            <button key={r._unique_id} onClick={() => openResearcher(r)}
              className={`text-left p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                ${selected?._unique_id === r._unique_id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {r.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{r.category?.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                  <BookOpen className="w-3.5 h-3.5" /> {r.pub_count} Pubs
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <FolderOpen className="w-3.5 h-3.5" /> {r.project_count} Projects
                </span>
                {r.phd_count > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg">
                    <GraduationCap className="w-3.5 h-3.5" /> {r.phd_count} PhD
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <Link to={`/researcher/${r._unique_id}`} onClick={e => e.stopPropagation()}
                  className="text-xs text-blue-500 hover:underline">Full Profile →</Link>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {selected && (
        <div className="w-1/2 border-l border-slate-200 dark:border-slate-700 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
              {selected.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selected.name}</h2>
              <p className="text-sm text-slate-500 capitalize">{selected.category?.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={() => setSelected(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-2xl">×</button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatBox label="Publications" value={selected.pub_count} color="blue" />
            <StatBox label="Projects" value={selected.project_count} color="emerald" />
            <StatBox label="PhD Students" value={selected.phd_count} color="violet" />
          </div>

          {panelLoading && <Spinner label="Loading details..." />}

          {/* PhD Students */}
          {phds && phds.total > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-violet-500" /> PhD Students ({phds.total})
              </h3>
              <div className="space-y-2">
                {[...phds.active, ...phds.defended].map((d, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm border ${d.status === 'defended'
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 dark:text-white truncate">{d.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${d.status === 'defended'
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        : 'bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300'}`}>
                        {d.status === 'defended' ? 'Defended' : 'Active'}
                      </span>
                    </div>
                    {d.Sujet && <p className="text-slate-500 mt-1 line-clamp-2">{d.Sujet}</p>}
                    {d.start_date && <p className="text-xs text-slate-400 mt-1">Since {d.start_date}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Publications */}
          {pubs && (
            <>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Recent Publications
              </h3>
              {pubs.publications.slice(0, 8).map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 mb-2 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white line-clamp-2">
                    {Array.isArray(p.title_s) ? p.title_s[0] : p.title_s}
                  </p>
                  <p className="text-slate-500 mt-1">{p.producedDateY_i} · {p.docType_s}</p>
                </div>
              ))}
              {pubs.total > 8 && (
                <p className="text-sm text-slate-400 text-center mt-2">+ {pubs.total - 8} more publications</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Collaborations Tab ────────────────────────────────────────────────────
function Collaborations() {
  const [allResearchers, setAllResearchers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [startYear, setStartYear] = useState(2020);
  const [endYear, setEndYear] = useState(2026);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/researchers').then(r => {
      setAllResearchers(r.data);
      setSelected(r.data.map(x => x.name));
    });
  }, []);

  const run = useCallback(async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      const res = await api.post('/api/advanced/aggregated-stats', {
        researchers: selected, start_year: startYear, end_year: endYear
      });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selected, startYear, endYear]);

  return (
    <div className="space-y-6 p-1">
      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">From Year</label>
          <input type="number" value={startYear} onChange={e => setStartYear(+e.target.value)}
            className="w-24 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">To Year</label>
          <input type="number" value={endYear} onChange={e => setEndYear(+e.target.value)}
            className="w-24 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 ring-blue-500" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Researchers ({selected.length}/{allResearchers.length})</label>
          <div className="flex gap-2">
            <button onClick={() => setSelected(allResearchers.map(r => r.name))} className="px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition">All</button>
            <button onClick={() => setSelected([])} className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition">None</button>
          </div>
        </div>
        <button onClick={run} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Analyse
        </button>
      </div>

      {loading && <Spinner label="Computing collaborations..." />}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Overview</h3>
              <StatBox label="Deduplicated Publications" value={data.stats.total_publications} color="blue" />
              {data.stats.phd_students?.length > 0 && (
                <div className="mt-3">
                  <StatBox label="PhD Students" value={data.stats.phd_students.length} color="violet" />
                </div>
              )}
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(data.stats.types_distribution || {}).slice(0, 5).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{k}</span><span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pairs */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-500" /> Top Collaborating Pairs
              </h3>
              {data.collaborations.pairs.length === 0
                ? <p className="text-slate-400 text-sm italic">No pairs found for this selection.</p>
                : data.collaborations.pairs.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 text-sm">
                    <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{p.pair}</span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold whitespace-nowrap">{p.count}</span>
                  </div>
                ))
              }
            </div>

            {/* Triples + Unconnected */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white mb-3">Top Triples</h3>
                {data.collaborations.triples.length === 0
                  ? <p className="text-slate-400 text-sm italic">No triples found.</p>
                  : data.collaborations.triples.slice(0, 4).map((t, i) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-700 text-sm">
                      <span className="text-slate-700 dark:text-slate-300 text-xs pr-2">{t.triple}</span>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">{t.count}</span>
                    </div>
                  ))
                }
              </div>
              <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-800/50">
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> No Co-author Link
                </h3>
                {data.collaborations.unconnected.length === 0
                  ? <p className="text-emerald-500 text-sm">Everyone has at least one co-authored pub!</p>
                  : data.collaborations.unconnected.map((u, i) => (
                    <span key={i} className="inline-block m-1 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">{u}</span>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Co-supervision Pairs */}
          {data.collaborations.cosupervision_pairs?.length > 0 && (
            <div className="p-5 rounded-2xl border border-violet-200 dark:border-violet-900/40 bg-white dark:bg-slate-800/50">
              <h3 className="font-bold text-violet-700 dark:text-violet-400 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Co-supervision Collaborations ({data.collaborations.cosupervision_pairs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.collaborations.cosupervision_pairs.map((cs, i) => (
                  <div key={i} className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800 text-sm">
                    <p className="font-semibold text-violet-800 dark:text-violet-300 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      {cs.pair.replace(' | ', ' + ')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium line-clamp-1">{cs.doctorant}</p>
                    {cs.sujet && cs.sujet !== 'Non trouve' && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2 italic">{cs.sujet}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {cs.start_date && <span className="text-xs text-slate-400">{cs.start_date}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cs.status === 'defended'
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        : 'bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300'}`}>
                        {cs.status === 'defended' ? 'Defended' : 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inconsistencies Tab ───────────────────────────────────────────────────
function Inconsistencies() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics/inconsistencies').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Running inconsistency analysis on the database..." />;

  const severityStyle = (sev) => ({
    high:   { card: 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10',   icon: 'bg-red-100 dark:bg-red-900/30',   iconColor: 'text-red-500',   badge: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
    medium: { card: 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10', icon: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    low:    { card: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50', icon: 'bg-slate-100 dark:bg-slate-700', iconColor: 'text-slate-400', badge: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
  }[sev] || { card: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50', icon: 'bg-slate-100', iconColor: 'text-slate-400', badge: 'bg-slate-100 text-slate-500' });

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Issues" value={data.total_issues} color="slate" />
        <StatBox label="High Severity" value={data.high_severity} color="red" />
        <StatBox label="Medium Severity" value={data.medium_severity} color="amber" />
        <StatBox label="Low Severity" value={data.low_severity ?? 0} color="emerald" />
      </div>

      <div className="space-y-3">
        {data.issues.map((issue, i) => {
          const s = severityStyle(issue.severity);
          return (
            <div key={i} className={`p-4 rounded-2xl border flex items-start gap-4 ${s.card}`}>
              <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${s.icon}`}>
                <AlertTriangle className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-slate-800 dark:text-white">{issue.researcher}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${s.badge}`}>
                    {issue.severity}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                    {issue.type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{issue.message}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {issue.sources.map((src, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg">{src}</span>
                  ))}
                </div>
              </div>
              {issue.researcher_id && (
                <Link to={`/researcher/${issue.researcher_id}`}
                  className="text-xs text-blue-500 hover:underline flex-shrink-0">View →</Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bubble Chart ──────────────────────────────────────────────────────────
const BUBBLE_FILLS = [
  '#3b82f6','#10b981','#8b5cf6','#f97316',
  '#ec4899','#06b6d4','#f59e0b','#84cc16',
  '#ef4444','#6366f1','#14b8a6','#f43f5e',
];

function BubbleChart({ clusters }) {
  const [hovered, setHovered] = useState(null);
  const W = 900, H = 460;

  if (!clusters.length) return null;

  const maxSize = Math.max(...clusters.map(c => c.size));
  const n = clusters.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (W / H))));
  const rows = Math.ceil(n / cols);
  const cellW = W / cols;
  const cellH = H / rows;

  const bubbles = clusters.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = cellW * (col + 0.5);
    const cy = cellH * (row + 0.5);
    const maxR = Math.min(cellW, cellH) * 0.42;
    const r = Math.max(22, maxR * Math.sqrt(c.size / maxSize));
    return { ...c, cx, cy, r, fill: BUBBLE_FILLS[i % BUBBLE_FILLS.length] };
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
        style={{ height: '420px' }}
      >
        {bubbles.map(b => {
          const isHov = hovered?.cluster_id === b.cluster_id;
          const fontSize = Math.max(8, Math.min(13, b.r / 3.5));
          const words = b.name.split(' | ')[0].split(' ');
          const label = words.slice(0, 2).join(' ');
          return (
            <g key={b.cluster_id}
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}>
              <circle
                cx={b.cx} cy={b.cy} r={b.r}
                fill={b.fill}
                fillOpacity={isHov ? 0.95 : 0.8}
                stroke={b.fill}
                strokeWidth={isHov ? 3 : 1.5}
              />
              <text x={b.cx} y={b.cy - (b.r > 35 ? 8 : 2)}
                textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={fontSize} fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {label.length > 16 ? label.slice(0, 14) + '…' : label}
              </text>
              {b.r > 32 && (
                <text x={b.cx} y={b.cy + fontSize + 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.8)" fontSize={Math.max(7, fontSize - 2)}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {b.size} member{b.size > 1 ? 's' : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-72 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl pointer-events-none z-10">
          <p className="font-bold mb-1 text-sm" style={{ color: hovered.fill }}>{hovered.name}</p>
          <p className="text-xs text-slate-500 mb-2">{hovered.size} researcher{hovered.size > 1 ? 's' : ''}</p>
          {hovered.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {hovered.keywords.map((kw, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{kw}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {hovered.members.map(m => (
              <span key={m.id} className="text-xs px-2 py-0.5 rounded-lg font-medium text-white" style={{ backgroundColor: hovered.fill + 'cc' }}>
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clustering Tab ────────────────────────────────────────────────────────
function Clustering() {
  const [granularity, setGranularity] = useState(0.4);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('bubble');

  const CLUSTER_COLORS = [
    'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
    'from-purple-500 to-violet-600', 'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600', 'from-cyan-500 to-blue-600',
    'from-amber-500 to-orange-600', 'from-lime-500 to-green-600',
  ];

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/analytics/cluster?granularity=${granularity}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || e?.message || 'Failed to load clusters');
    }
    finally { setLoading(false); }
  }, [granularity]);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  return (
    <div className="space-y-6 p-1">
      {/* Slider Control */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Granularity Control</h3>
            <p className="text-xs text-slate-500 mt-0.5">Left = fewer big clusters · Right = many specific clusters</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold">
              {data ? `${data.total_clusters} clusters` : '...'}
            </span>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
              <button onClick={() => setViewMode('bubble')}
                className={`px-3 py-1.5 transition ${viewMode === 'bubble' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                Bubble
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 transition ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                Cards
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">1 cluster</span>
          <input type="range" min="0.05" max="0.95" step="0.05"
            value={granularity} onChange={e => setGranularity(+e.target.value)}
            className="flex-1 accent-indigo-500 cursor-pointer" />
          <span className="text-xs text-slate-400">N clusters</span>
        </div>
      </div>

      {loading && <Spinner label="Running agglomerative clustering on publication keywords..." />}

      {error && !loading && (
        <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && !loading && data.clusters.length === 0 && (
        <div className="p-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-center">
          <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">No clustering data available</p>
          <p className="text-sm text-slate-400 mt-1">The publications collection may be empty. Run a HAL sync first:</p>
          <button onClick={() => api.get('/api/sync/hal').then(() => fetchClusters())}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Sync HAL Data & Retry
          </button>
        </div>
      )}

      {data && !loading && data.clusters.length > 0 && viewMode === 'bubble' && (
        <BubbleChart clusters={data.clusters} />
      )}

      {data && !loading && data.clusters.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.clusters.map((cluster, i) => (
            <div key={cluster.cluster_id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${CLUSTER_COLORS[i % CLUSTER_COLORS.length]} text-white text-sm font-bold mb-3`}>
                <Layers className="w-3.5 h-3.5" />
                {cluster.name || `Cluster ${i + 1}`}
              </div>
              <p className="text-xs text-slate-500 mb-2">{cluster.size} researcher{cluster.size > 1 ? 's' : ''}</p>
              {cluster.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {cluster.keywords.slice(0, 5).map((kw, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{kw}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {cluster.members.map(m => (
                  <Link key={m.id} to={`/researcher/${m.id}`}
                    className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                    {m.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      {label && <p className="text-slate-500 text-sm animate-pulse">{label}</p>}
    </div>
  );
}

function StatBox({ label, value, color }) {
  const colors = {
    blue:   'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
    emerald:'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10',
    red:    'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    amber:  'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
    violet: 'border-l-violet-500 bg-violet-50 dark:bg-violet-900/10',
    slate:  'border-l-slate-400 bg-slate-50 dark:bg-slate-800',
  };
  return (
    <div className={`p-4 rounded-xl border-l-4 ${colors[color] || colors.slate} mb-0`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value ?? '--'}</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState('collaborations');

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">
          LISTIC <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Intelligence</span>
        </h1>
        <p className="text-slate-500 mt-1">Advanced analytics powered by the local HAL data warehouse ({new Date().getFullYear()})</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 flex-wrap mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex-1 justify-center
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
      {activeTab === 'collaborations' && <Collaborations />}
        {activeTab === 'inconsistencies' && <Inconsistencies />}
        {activeTab === 'clustering' && <Clustering />}
      </div>
    </div>
  );
}
