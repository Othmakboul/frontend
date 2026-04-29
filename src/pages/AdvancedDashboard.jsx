import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, AlertTriangle, Layers, BookOpen,
  FolderOpen, RefreshCw, Shield, ChevronRight,
  GraduationCap, Users, Database, CheckCircle2,
  XCircle, AlertCircle, Clock, ExternalLink,
  Search, Filter, TrendingUp, Activity, Zap, Sparkles
} from 'lucide-react';
import api from '../lib/api';
import IntelligenceSummary from '../components/IntelligenceSummary';
import WorldClassBubbleChart from '../components/WorldClassBubbleChart';
import TimeMachineSlider from '../components/TimeMachineSlider';
import ReportModal from '../components/ReportModal';

// ─── Tab definitions ───────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',        label: 'Synthèse',          icon: Activity },
  { id: 'cards',           label: 'Fiches Chercheurs', icon: Users },
  { id: 'collaborations',  label: 'Collaborations',    icon: Network },
  { id: 'inconsistencies', label: 'Anomalies',         icon: AlertTriangle },
  { id: 'clustering',      label: 'Clustering',        icon: Layers },
  { id: 'datasources',     label: 'Sources de Données',icon: Database },
];

// ─── Shared helpers ────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      {label && <p className="text-slate-500 dark:text-slate-600 dark:text-slate-400 text-sm animate-pulse">{label}</p>}
    </div>
  );
}

function StatBox({ label, value, color = 'slate', sub }) {
  const palette = {
    blue:   'border-l-blue-500   bg-blue-500/5    text-blue-400    border-blue-500/30',
    emerald:'border-l-emerald-500 bg-emerald-500/5 text-emerald-400  border-emerald-500/30',
    red:    'border-l-red-500    bg-red-500/5     text-red-400     border-red-500/30',
    amber:  'border-l-amber-500  bg-amber-500/5   text-amber-400   border-amber-500/30',
    violet: 'border-l-violet-500 bg-violet-500/5  text-violet-400  border-violet-500/30',
    slate:  'border-l-slate-400  bg-white dark:bg-white/5 shadow-sm dark:shadow-none       text-slate-700 dark:text-slate-300   border-slate-200 dark:border-white/10',
    indigo: 'border-l-indigo-500 bg-indigo-500/5  text-indigo-400  border-indigo-500/30',
  };
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-xl border-l-4 border backdrop-blur-sm ${palette[color] || palette.slate}
        transition-all duration-200 cursor-default`}
    >
      <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value ?? '--'}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ─── Matchmaking Panel ─────────────────────────────────────────────────────
function MatchmakingPanel({ researcherId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!researcherId || !expanded) return;
    setLoading(true);
    api.get(`/api/researchers/${researcherId}/matchmaking`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [researcherId, expanded]);

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl
          bg-gradient-to-r from-violet-500/15 to-purple-500/15
          border border-violet-500/30 hover:border-violet-400/50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition" />
          <span className="text-sm font-bold text-violet-300">Hidden Synergies</span>
          <span className="text-xs text-violet-500">Matchmaking IA</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-violet-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {data?.suggestions?.length === 0 && !loading && (
                <p className="text-xs text-slate-500 text-center py-3 italic">
                  Aucune synergie cachée trouvée — ce chercheur collabore déjà avec tous les profils similaires.
                </p>
              )}
              {data?.suggestions?.map((s, i) => (
                <motion.div
                  key={s.researcher_id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.07 }}
                  className="p-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-violet-500/20 hover:border-violet-400/40
                    transition-all duration-200 group/match"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover/match:text-violet-200 transition">
                      {s.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(s.score * 5, 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.07 + 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                        />
                      </div>
                      <span className="text-xs font-bold text-violet-400">{s.score}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">
                    Jamais collaboré · {s.pub_count} pubs HAL
                  </p>
                  {s.common_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.common_keywords.slice(0, 4).map((kw, j) => (
                        <span key={j} className="text-xs px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              {data && data.suggestions?.length > 0 && (
                <p className="text-xs text-center text-slate-500 pt-1">
                  Score calculé par similarité TF-IDF sur {data.total_my_keywords} mots-clés
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — Researcher Cards
// ─────────────────────────────────────────────────────────────────────────────
function ResearcherCards({ activeYear }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pubs, setPubs] = useState(null);
  const [phds, setPhds] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');

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

  const categories = ['all', ...new Set(cards.map(r => r.category).filter(Boolean))];

  const filtered = cards.filter(r => {
    const qOk = !query || r.name.toLowerCase().includes(query.toLowerCase());
    const catOk = catFilter === 'all' || r.category === catFilter;
    return qOk && catOk;
  });

  if (loading) return <Spinner label="Chargement des fiches chercheurs..." />;

  const CATEGORY_COLORS = {
    enseignants_chercheurs: 'from-blue-500 to-indigo-600',
    doctorants: 'from-violet-500 to-purple-600',
    emerites: 'from-amber-500 to-orange-600',
    chercheurs_associes: 'from-emerald-500 to-teal-600',
    collaborateurs_benevoles: 'from-pink-500 to-rose-600',
    administratifs_techniques: 'from-slate-500 to-slate-600',
  };

  return (
    <div className="flex h-full overflow-hidden gap-4">
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un chercheur..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none
                focus:ring-2 ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-500
                backdrop-blur-sm transition-all duration-200 focus:bg-slate-50 dark:bg-white/8" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300
              outline-none focus:ring-2 ring-blue-500/50 backdrop-blur-sm">
            {categories.map(c => (
              <option key={c} value={c} className="bg-slate-800">
                {c === 'all' ? 'Toutes catégories' : c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-500">{filtered.length} chercheur{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className={`grid gap-3 ${selected ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
          <AnimatePresence mode="popLayout">
            {filtered.map((r, idx) => (
              <motion.button
                key={r._unique_id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.02 }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openResearcher(r)}
                className={`text-left p-5 rounded-2xl border backdrop-blur-sm transition-all duration-200 relative overflow-hidden group
                  ${selected?._unique_id === r._unique_id
                    ? 'border-blue-500/60 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-slate-50 dark:bg-white/8 hover:border-slate-300 dark:border-white/20 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'}`}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                  bg-gradient-to-r from-transparent via-white/3 to-transparent
                  -translate-x-full group-hover:translate-x-full transform transition-transform duration-700 ease-in-out" />

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${CATEGORY_COLORS[r.category] || 'from-slate-500 to-slate-700'}
                    flex items-center justify-center text-slate-900 dark:text-white font-bold text-lg flex-shrink-0 shadow-lg`}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{r.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{r.category?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/15 text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/20">
                    <BookOpen className="w-3 h-3" /> {r.pub_count} Pubs
                  </span>
                  {r.project_count > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/20">
                    <FolderOpen className="w-3 h-3" /> {r.project_count} Projects
                  </span>
                  )}
                  {r.phd_count > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-violet-500/15 text-violet-400 rounded-lg text-xs font-semibold border border-violet-500/20">
                      <GraduationCap className="w-3 h-3" /> {r.phd_count} PhD
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Link to={`/researcher/${r._unique_id}`} onClick={e => e.stopPropagation()}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    Profil complet →
                  </Link>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Side panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 30, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: 30, width: 0 }}
            transition={{ duration: 0.3 }}
            className="w-80 xl:w-96 flex-shrink-0 overflow-y-auto border-l border-slate-200 dark:border-white/10 rounded-2xl p-5
              backdrop-blur-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${CATEGORY_COLORS[selected.category] || 'from-slate-500 to-slate-700'}
                flex items-center justify-center text-slate-900 dark:text-white font-bold text-xl shadow-lg`}>
                {selected.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white truncate">{selected.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{selected.category?.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:bg-white/10 transition text-lg">
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { val: selected.pub_count, label: 'Pubs', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                ...(selected.project_count > 0 ? [{ val: selected.project_count, label: 'Projects', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }] : []),
                { val: selected.phd_count, label: 'PhD', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
              ].map(({ val, label, color }) => (
                <div key={label} className={`text-center p-3 rounded-xl border ${color}`}>
                  <p className="text-2xl font-bold">{val}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {panelLoading && <Spinner label="Chargement..." />}

            {/* PhD Students */}
            {phds && phds.total > 0 && (
              <div className="mb-5">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-violet-400" /> Doctorants ({phds.total})
                </h3>
                <div className="space-y-2">
                  {[...phds.active, ...phds.defended].map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-2.5 rounded-xl text-xs border ${d.status === 'defended'
                        ? 'bg-white/3 border-slate-200 dark:border-white/8'
                        : 'bg-violet-500/8 border-violet-500/20'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{d.name}</p>
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${d.status === 'defended'
                          ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400' : 'bg-violet-500/20 text-violet-300'}`}>
                          {d.status === 'defended' ? 'Soutenu' : 'Actif'}
                        </span>
                      </div>
                      {d.Sujet && <p className="text-slate-500 mt-1 line-clamp-2">{d.Sujet}</p>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Publications */}
            {pubs && (
              <>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-blue-400" /> Publications récentes
                </h3>
                {pubs.publications.slice(0, 6).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-2.5 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/8 mb-2 text-xs hover:bg-slate-50 dark:bg-white/8 transition"
                  >
                    <p className="font-medium text-slate-900 dark:text-white line-clamp-2">
                      {Array.isArray(p.title_s) ? p.title_s[0] : p.title_s}
                    </p>
                    <p className="text-slate-500 mt-0.5">{p.producedDateY_i} · {p.docType_s}</p>
                  </motion.div>
                ))}
                {pubs.total > 6 && (
                  <p className="text-xs text-slate-500 text-center mt-1">+ {pubs.total - 6} autres</p>
                )}
              </>
            )}

            {/* Matchmaking */}
            <MatchmakingPanel researcherId={selected._unique_id} />

            <Link to={`/researcher/${selected._unique_id}`}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5
                bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition-all duration-200
                shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
              Profil Complet <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Collaborations
// ─────────────────────────────────────────────────────────────────────────────
function Collaborations() {
  const [allResearchers, setAllResearchers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(2026);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchR, setSearchR] = useState('');

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
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">De</label>
          <input type="number" value={startYear} onChange={e => setStartYear(+e.target.value)}
            className="w-24 px-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">À</label>
          <input type="number" value={endYear} onChange={e => setEndYear(+e.target.value)}
            className="w-24 px-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50" />
        </div>

        <div className="flex-1 min-w-[250px]">
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Chercheurs ({selected.length}/{allResearchers.length})
          </label>
          <div className="flex gap-2">
            <button onClick={() => setSelected(allResearchers.map(r => r.name))}
              className="px-3 py-2 text-xs bg-blue-500/15 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/25 transition border border-blue-500/20">Tous</button>
            <button onClick={() => setSelected([])}
              className="px-3 py-2 text-xs bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-slate-600 dark:text-slate-400 rounded-lg font-semibold hover:bg-slate-100 dark:bg-white/10 transition border border-slate-200 dark:border-white/10">Aucun</button>
            <button onClick={() => setSelected(allResearchers.filter(r => r.category === 'enseignants_chercheurs').map(r => r.name))}
              className="px-3 py-2 text-xs bg-indigo-500/15 text-indigo-400 rounded-lg font-semibold hover:bg-indigo-500/25 transition border border-indigo-500/20">Permanents</button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={run} disabled={loading || !selected.length}
          className="flex items-center gap-2 px-6 py-2.5
            bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
            text-slate-900 dark:text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50
            shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Analyser
        </motion.button>
      </div>

      {loading && <Spinner label="Calcul des collaborations en cours..." />}

      {data && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Publications dédupliquées" value={data.stats.total_publications} color="blue" />
            <StatBox label="Doctorants" value={data.stats.phd_students?.length ?? 0} color="violet" />
            <StatBox label="Paires collaboratrices" value={data.collaborations.pairs.length} color="emerald" />
            <StatBox label="Triplets collaborateurs" value={data.collaborations.triples.length} color="indigo" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" /> Top Paires Collaboratrices
              </h3>
              {data.collaborations.pairs.length === 0
                ? <p className="text-slate-500 text-sm italic">Aucune paire trouvée.</p>
                : data.collaborations.pairs.slice(0, 10).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/5 last:border-0 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate text-xs">{p.pair}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-full text-xs font-bold ml-2 whitespace-nowrap border border-blue-500/20">{p.count} pubs</span>
                  </motion.div>
                ))
              }
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top Triplets Collaborateurs</h3>
              {data.collaborations.triples.length === 0
                ? <p className="text-slate-500 text-sm italic">Aucun triplet trouvé.</p>
                : data.collaborations.triples.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex justify-between items-start py-2 border-b border-slate-200 dark:border-white/5 last:border-0 text-sm">
                    <span className="text-slate-700 dark:text-slate-300 text-xs pr-2 line-clamp-2">{t.triple}</span>
                    <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full text-xs font-bold flex-shrink-0 border border-purple-500/20">{t.count}</span>
                  </div>
                ))
              }
            </div>

            <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm">
              <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Sans Lien de Collaboration
              </h3>
              <p className="text-xs text-slate-500 mb-3">Chercheurs sans co-publication dans la sélection :</p>
              {data.collaborations.unconnected.length === 0
                ? <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Tout le monde collabore !
                  </p>
                : data.collaborations.unconnected.map((u, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="inline-block m-1 px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20"
                  >{u}</motion.span>
                ))
              }
            </div>
          </div>

          {data.collaborations.cosupervision_pairs?.length > 0 && (
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-sm">
              <h3 className="font-bold text-violet-400 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Co-encadrements ({data.collaborations.cosupervision_pairs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.collaborations.cosupervision_pairs.map((cs, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-violet-500/20 text-sm hover:bg-slate-50 dark:bg-white/8 transition"
                  >
                    <p className="font-semibold text-violet-300 mb-1 flex items-center gap-1 text-xs">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      {cs.pair.replace(' | ', ' + ')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium line-clamp-1 text-xs">{cs.doctorant}</p>
                    {cs.sujet && cs.sujet !== 'Non trouve' && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2 italic">{cs.sujet}</p>
                    )}
                    <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${cs.status === 'defended'
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      : 'bg-violet-500/20 text-violet-300'}`}>
                      {cs.status === 'defended' ? 'Soutenu' : 'Actif'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(data.stats.types_distribution || {}).length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Types de publications
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.stats.types_distribution).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-xl border border-slate-200 dark:border-white/8">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{type}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-bold border border-blue-500/20">{count}</span>
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

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — Inconsistencies
// ─────────────────────────────────────────────────────────────────────────────
function Inconsistencies() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/analytics/inconsistencies').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Analyse cross-source (HAL + theses.fr + site LISTIC)..." />;

  const severityStyle = (sev) => ({
    high:   { card: 'border-red-500/30 bg-red-500/5', icon: 'bg-red-500/15 text-red-400', badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
    medium: { card: 'border-amber-500/30 bg-amber-500/5', icon: 'bg-amber-500/15 text-amber-400', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    low:    { card: 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none', icon: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10' },
  }[sev] || { card: 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none', icon: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-white/10 text-slate-500' });

  const allTypes = [...new Set((data?.issues || []).map(i => i.type))];
  const displayed = (data?.issues || []).filter(i =>
    (filter === 'all' || i.severity === filter) &&
    (typeFilter === 'all' || i.type === typeFilter)
  );

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Issues" value={data?.total_issues} color="slate" />
        <StatBox label="Critiques" value={data?.high_severity} color="red" />
        <StatBox label="Modérées" value={data?.medium_severity} color="amber" />
        <StatBox label="Faibles" value={data?.low_severity ?? 0} color="emerald" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-xs font-semibold">
          {['all', 'high', 'medium', 'low'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-2 transition capitalize ${filter === s ? 'bg-blue-600 text-slate-900 dark:text-white' : 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/10'}`}>
              {s === 'all' ? 'Tous' : s}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none">
          <option value="all" className="bg-slate-800">Tous types</option>
          {allTypes.map(t => <option key={t} value={t} className="bg-slate-800">{t.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition font-semibold border border-slate-200 dark:border-white/10">
          <RefreshCw className="w-3 h-3" /> Rafraîchir
        </button>
        <span className="text-xs text-slate-500">{displayed.length} issue{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayed.map((issue, i) => {
            const s = severityStyle(issue.severity);
            return (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ delay: i * 0.02 }}
                className={`p-4 rounded-2xl border backdrop-blur-sm flex items-start gap-4 ${s.card}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${s.icon}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{issue.researcher}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${s.badge}`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400">
                      {issue.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{issue.message}</p>
                  {issue.action && (
                    <p className="text-xs text-blue-400 mt-1 font-medium">→ {issue.action}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(issue.sources || []).map((src, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400 rounded-lg">{src}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1">
                  {issue.researcher_id && (
                    <Link to={`/researcher/${issue.researcher_id}`} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">Voir →</Link>
                  )}
                  {issue.adum_url && (
                    <a href={issue.adum_url} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:underline flex items-center gap-0.5">
                      ADUM <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {displayed.length === 0 && (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <p className="font-semibold text-emerald-400">Aucune anomalie pour ces filtres !</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — Clustering with Physics Bubbles
// ─────────────────────────────────────────────────────────────────────────────
function Clustering() {
  const [granularity, setGranularity] = useState(0.4);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('physics');
  const [allResearchers, setAllResearchers] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [searchR, setSearchR] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/researchers').then(r => {
      setAllResearchers(r.data);
      setCheckedIds(new Set(r.data.map(x => x._unique_id)));
    });
  }, []);

  const fetchClusters = useCallback(async (ids, gran) => {
    if (!ids.size) return;
    setLoading(true);
    setError(null);
    try {
      // cluster-bridges includes clusters + Jaccard similarity matrix for Venn rendering
      const res = await api.post('/api/analytics/cluster-bridges', { granularity: gran, researcher_ids: [...ids] });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Erreur de clustering');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkedIds.size) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchClusters(checkedIds, granularity), 400);
    return () => clearTimeout(debounceRef.current);
  }, [granularity, checkedIds, fetchClusters]);

  const toggleAll = () => {
    setCheckedIds(prev => prev.size === allResearchers.length ? new Set() : new Set(allResearchers.map(r => r._unique_id)));
  };
  const toggleOne = (id) => {
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredR = allResearchers.filter(r => !searchR || r.name.toLowerCase().includes(searchR.toLowerCase()));

  const CLUSTER_COLORS = [
    'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
    'from-purple-500 to-violet-600', 'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600', 'from-cyan-500 to-blue-600',
  ];

  return (
    <div className="flex gap-5">
      {/* Left: researcher checklist */}
      <div className="w-60 flex-shrink-0 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-sm flex flex-col">
        <div className="p-3 border-b border-slate-200 dark:border-white/10">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <input value={searchR} onChange={e => setSearchR(e.target.value)}
              placeholder="Filtrer..." className="w-full pl-8 pr-3 py-2 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-lg text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/8" />
          </div>
          <button onClick={toggleAll} className="w-full text-xs py-1.5 bg-blue-500/15 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/25 transition border border-blue-500/20">
            {checkedIds.size === allResearchers.length ? 'Désélectionner tout' : 'Sélectionner tout'}
          </button>
          <p className="text-xs text-slate-500 mt-1.5 text-center">{checkedIds.size}/{allResearchers.length} sélectionnés</p>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-0.5" style={{ maxHeight: '480px' }}>
          {filteredR.map(r => (
            <label key={r._unique_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none cursor-pointer transition">
              <input type="checkbox" checked={checkedIds.has(r._unique_id)} onChange={() => toggleOne(r._unique_id)}
                className="w-3.5 h-3.5 rounded accent-blue-500 flex-shrink-0" />
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{r.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Right: chart area */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Contrôle de Granularité</h3>
              <p className="text-xs text-slate-500 mt-0.5">Gauche = grands clusters · Droite = clusters spécialisés</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/15 text-indigo-400 rounded-lg text-sm font-bold border border-indigo-500/20">
                {data ? `${data.total_clusters} cluster${data.total_clusters !== 1 ? 's' : ''}` : '…'}
              </span>
              <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-xs font-semibold">
                {[['physics', 'Physique'], ['cards', 'Cartes']].map(([v, l]) => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className={`px-3 py-1.5 transition ${viewMode === v ? 'bg-indigo-600 text-slate-900 dark:text-white' : 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/10'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 whitespace-nowrap">1 cluster</span>
            <input type="range" min="0.05" max="0.95" step="0.05"
              value={granularity} onChange={e => setGranularity(+e.target.value)}
              className="flex-1 accent-indigo-500 cursor-pointer" />
            <span className="text-xs text-slate-500 whitespace-nowrap">N clusters</span>
          </div>
        </div>

        {loading && <Spinner label="Clustering en cours sur les chercheurs sélectionnés…" />}
        {error && !loading && (
          <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
            <strong>Erreur :</strong> {error}
          </div>
        )}
        {!checkedIds.size && (
          <div className="p-10 text-center text-slate-500">
            <Filter className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>Sélectionnez au moins un chercheur pour lancer le clustering.</p>
          </div>
        )}
        {data && !loading && data.clusters.length === 0 && (
          <div className="p-10 rounded-2xl border border-slate-200 dark:border-white/10 text-center text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="font-semibold">Aucune donnée de clustering</p>
            <p className="text-sm mt-1">Déclenchez d'abord une synchronisation HAL.</p>
            <button onClick={() => api.get('/api/sync/hal')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-xl text-sm font-semibold transition inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Sync HAL
            </button>
          </div>
        )}

        {data && !loading && data.clusters.length > 0 && viewMode === 'physics' && (
          <WorldClassBubbleChart
            clusters={data.clusters}
            bridges={data.bridges || []}
            granularity={granularity}
            researcherIds={[...checkedIds]}
          />
        )}

        {data && !loading && data.clusters.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {data.clusters.map((cluster, i) => (
                <motion.div
                  key={cluster.cluster_id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm hover:bg-slate-50 dark:bg-white/8 transition"
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${CLUSTER_COLORS[i % CLUSTER_COLORS.length]} text-slate-900 dark:text-white text-sm font-bold mb-3 shadow-lg`}>
                    <Layers className="w-3.5 h-3.5" /> {cluster.name || `Cluster ${i + 1}`}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{cluster.size} chercheur{cluster.size > 1 ? 's' : ''}</p>
                  {cluster.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {cluster.keywords.slice(0, 5).map((kw, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-slate-50 dark:bg-white/8 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/8">{kw}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.members.map(m => (
                      <Link key={m.id} to={`/researcher/${m.id}`}
                        className="text-xs px-2 py-1 bg-slate-50 dark:bg-white/8 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-white/15 hover:text-slate-900 dark:text-white transition border border-slate-200 dark:border-white/8">
                        {m.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 — Data Sources
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'ok' || status === 'completed') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
      <CheckCircle2 className="w-3.5 h-3.5" /> OK
    </span>
  );
  if (status === 'missing' || status === 'error') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
      <XCircle className="w-3.5 h-3.5" /> Manquant
    </span>
  );
  if (status === 'low') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
      <AlertCircle className="w-3.5 h-3.5" /> Faible
    </span>
  );
  if (status === 'syncing') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-blue-400">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sync...
    </span>
  );
  if (status === 'na') return <span className="text-xs text-slate-500">—</span>;
  return <span className="text-xs text-slate-500">{status}</span>;
}

function DataSources() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [halFilter, setHalFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/analytics/data-sources').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const triggerSync = async (source) => {
    setSyncing(source);
    await api.get(`/api/sync/${source}`);
    setTimeout(() => { setSyncing(''); load(); }, 2000);
  };

  if (loading) return <Spinner label="Récupération depuis toutes les sources..." />;
  if (!data) return <div className="text-slate-500 text-center py-10">Erreur de chargement</div>;

  const { summary, adum_details, website_details, researchers } = data;

  const filtered = (researchers || []).filter(r => {
    const catOk = catFilter === 'all' || r.category === catFilter;
    const halOk = halFilter === 'all' || r.hal.status === halFilter;
    return catOk && halOk;
  });

  const categories = ['all', ...new Set((researchers || []).map(r => r.category).filter(Boolean))];

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HAL */}
        <motion.div whileHover={{ scale: 1.01 }} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" /> HAL Archive
            </h3>
            <button onClick={() => triggerSync('hal')} disabled={syncing === 'hal'}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500/15 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/25 transition disabled:opacity-50 border border-blue-500/20">
              <RefreshCw className={`w-3 h-3 ${syncing === 'hal' ? 'animate-spin' : ''}`} /> Sync
            </button>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{summary.hal.total_publications.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mb-3">publications dans l'entrepôt</p>
          <div className="space-y-1.5 text-xs">
            {[
              ['Avec publications', `${summary.hal.researchers_with_pubs} chercheurs`, 'text-slate-700 dark:text-slate-300'],
              ['Sans HAL', `${summary.hal.researchers_missing}`, 'text-red-400'],
              ['Statut sync', null, ''],
            ].map(([label, val, cls], i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                {val ? <span className={`font-semibold ${cls}`}>{val}</span> : <StatusBadge status={summary.hal.sync_status} />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ADUM */}
        <motion.div whileHover={{ scale: 1.01 }} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-400" /> theses.fr (ADUM)
            </h3>
            <button onClick={() => triggerSync('adum')} disabled={syncing === 'adum'}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-violet-500/15 text-violet-400 rounded-lg font-semibold hover:bg-violet-500/25 transition disabled:opacity-50 border border-violet-500/20">
              <RefreshCw className={`w-3 h-3 ${syncing === 'adum' ? 'animate-spin' : ''}`} /> Sync
            </button>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{summary.adum.total_theses_fr}</p>
          <p className="text-xs text-slate-500 mb-3">thèses trouvées sur theses.fr</p>
          <div className="space-y-1.5 text-xs">
            {[
              ['Matchées avec la DB', `${summary.adum.matched}`, 'text-emerald-400'],
              ['Absentes de la DB', `${summary.adum.missing_in_db}`, 'text-red-400'],
              ['Non référencées', `${summary.adum.missing_in_adum}`, 'text-amber-400'],
              ['Discordances', `${summary.adum.with_discrepancies}`, 'text-orange-400'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className={`font-semibold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Website */}
        <motion.div whileHover={{ scale: 1.01 }} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Site LISTIC
            </h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{summary.listic_website.total_website}</p>
          <p className="text-xs text-slate-500 mb-3">membres scrappés du site</p>
          <div className="space-y-1.5 text-xs">
            {[
              ['Couverture DB', `${summary.listic_website.coverage_rate}%`, 'text-emerald-400'],
              ['DB mais pas site', `${summary.listic_website.in_db_not_website}`, 'text-amber-400'],
              ['Site mais pas DB', `${summary.listic_website.in_website_not_db}`, 'text-red-400'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className={`font-semibold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Per-researcher table */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-slate-900 dark:text-white">Statut par Chercheur</h3>
          <div className="flex gap-2 flex-wrap">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="px-2 py-1.5 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none">
              {categories.map(c => <option key={c} value={c} className="bg-slate-800">{c === 'all' ? 'Toutes catégories' : c.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={halFilter} onChange={e => setHalFilter(e.target.value)}
              className="px-2 py-1.5 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none">
              <option value="all" className="bg-slate-800">Tous statuts HAL</option>
              <option value="ok" className="bg-slate-800">OK</option>
              <option value="low" className="bg-slate-800">Faible</option>
              <option value="missing" className="bg-slate-800">Manquant</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                <th className="text-left py-2 pr-4 font-semibold">Chercheur</th>
                <th className="text-left py-2 pr-4 font-semibold">Catégorie</th>
                <th className="text-center py-2 pr-4 font-semibold">Pubs HAL</th>
                <th className="text-center py-2 pr-4 font-semibold">Statut HAL</th>
                <th className="text-center py-2 pr-4 font-semibold">theses.fr</th>
                <th className="text-center py-2 font-semibold">Site LISTIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filtered.map((r) => (
                <tr key={r.uid} className="hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none transition group">
                  <td className="py-2 pr-4">
                    <Link to={`/researcher/${r.uid}`} className="font-medium text-slate-900 dark:text-white hover:text-blue-400 transition">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="text-xs text-slate-500 capitalize">{r.category?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <span className={`font-semibold ${r.hal.pub_count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-600'}`}>
                      {r.hal.pub_count}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-center"><StatusBadge status={r.hal.status} /></td>
                  <td className="py-2 pr-4 text-center"><StatusBadge status={r.adum.status} /></td>
                  <td className="py-2 text-center"><StatusBadge status={r.listic_website.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [syncStatus, setSyncStatus] = useState(null);
  const [activeYear, setActiveYear] = useState(2026);

  useEffect(() => {
    api.get('/api/sync/status').then(r => setSyncStatus(r.data)).catch(() => {});
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-[#0a0a0a] min-h-screen transition-colors duration-300 relative">
    <div className="relative max-w-7xl mx-auto px-4 pb-32">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4 pt-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-600 dark:text-slate-400 uppercase tracking-widest">Platforme LISTIC</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Vue Direction
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Analyse multi-source — HAL · theses.fr (ADUM) · Site LISTIC
          </p>
        </div>
        {syncStatus && (
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 backdrop-blur-md">
              <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {syncStatus.database.publications.toLocaleString()} pubs
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                HAL: {syncStatus.hal.status === 'syncing' ? 'sync...' : syncStatus.hal.last_sync ? 'à jour' : 'en attente'}
              </span>
            </div>
          </div>
        )}
      </div>


      {/* Tab Bar Minimalist */}
      <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap relative border-b-2
                ${isActive
                  ? 'text-slate-900 border-slate-900 dark:text-slate-900 dark:text-white dark:border-white'
                  : 'text-slate-500 border-transparent hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900 dark:text-white' : ''}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="bg-transparent rounded-2xl md:p-4 mb-10"
        >
          {activeTab === 'overview'        && <IntelligenceSummary />}
          {activeTab === 'cards'           && <ResearcherCards activeYear={activeYear} />}
          {activeTab === 'collaborations'  && <Collaborations />}
          {activeTab === 'inconsistencies' && <Inconsistencies />}
          {activeTab === 'clustering'      && <Clustering />}
          {activeTab === 'datasources'     && <DataSources />}
        </motion.div>
      </AnimatePresence>

      {/* Time Machine */}
      <TimeMachineSlider activeYear={activeYear} onYearChange={setActiveYear} />

      {/* Floating Report Button */}
      <ReportModal />
    </div>
    </div>
  );
}
