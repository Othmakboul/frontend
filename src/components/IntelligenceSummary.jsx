import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertTriangle, Star,
  Zap, Users, BookOpen, Award, Activity
} from 'lucide-react';
import api from '../lib/api';

// ─── Mapping sobres (pas de couleurs "IA" criardes) ─────────────────────────
const INSIGHT_CONFIG = {
  growth:      { icon: TrendingUp,   accent: '#22c55e', label: 'TENDANCE',            bg: 'bg-emerald-500/8 dark:bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-600 dark:text-emerald-400' },
  warning:     { icon: AlertTriangle, accent: '#f59e0b', label: 'ATTENTION',           bg: 'bg-amber-500/8 dark:bg-amber-500/10',    border: 'border-amber-500/25',   text: 'text-amber-600 dark:text-amber-400' },
  star:        { icon: Star,          accent: '#3b82f6', label: 'TOP RESEARCHER',      bg: 'bg-blue-500/8 dark:bg-blue-500/10',      border: 'border-blue-500/25',    text: 'text-blue-600 dark:text-blue-400' },
  synergy:     { icon: Zap,           accent: '#8b5cf6', label: 'SYNERGIE',            bg: 'bg-slate-500/8 dark:bg-white/5',         border: 'border-slate-300/50 dark:border-white/10', text: 'text-slate-600 dark:text-slate-300' },
  team:        { icon: Users,         accent: '#0ea5e9', label: 'VITALITÉ DU LABO',   bg: 'bg-sky-500/8 dark:bg-sky-500/8',         border: 'border-sky-500/20',     text: 'text-sky-600 dark:text-sky-400' },
  publication: { icon: BookOpen,      accent: '#6366f1', label: 'PATRIMOINE SCIENTIFIQUE', bg: 'bg-indigo-500/8 dark:bg-indigo-500/8', border: 'border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
  award:       { icon: Award,         accent: '#f59e0b', label: 'ANNÉE RECORD',        bg: 'bg-amber-500/8 dark:bg-amber-500/8',     border: 'border-amber-500/20',   text: 'text-amber-600 dark:text-amber-400' },
  decline:     { icon: TrendingDown,  accent: '#ef4444', label: 'BAISSE',              bg: 'bg-red-500/8 dark:bg-red-500/8',         border: 'border-red-500/20',     text: 'text-red-600 dark:text-red-400' },
};

function InsightCard({ insight, index }) {
  const cfg = INSIGHT_CONFIG[insight.icon] || INSIGHT_CONFIG.synergy;
  const Icon = cfg.icon;

  // Création d'un layout "Bento Box" asymétrique pour plus de dynamisme
  const isFeatured = index === 0 || index === 3;

  // Séparation heuristique du chiffre et de l'unité pour une typographie avancée
  const numberPart = insight.metric ? insight.metric.replace(/[^0-9.%+-]/g, '') : '';
  const unitPart = insight.metric ? insight.metric.replace(/[0-9.%+-]/g, '').trim() : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`relative group overflow-hidden rounded-3xl border p-5 md:p-6 transition-all duration-300 ${cfg.bg} ${cfg.border} backdrop-blur-md shadow-sm hover:shadow-lg ${isFeatured ? 'md:col-span-2 xl:col-span-2' : ''}`}
    >
      {/* Background glow effect based on accent color */}
      <div 
        className="absolute -right-20 -top-20 w-40 h-40 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full pointer-events-none"
        style={{ backgroundColor: cfg.accent }}
      />
      <div 
        className="absolute -left-10 -bottom-10 w-32 h-32 blur-[50px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 rounded-full pointer-events-none delay-100"
        style={{ backgroundColor: cfg.accent }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/10 ${cfg.text}`}>
              <Icon className={`${isFeatured ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest border bg-white/60 dark:bg-black/20 backdrop-blur-md ${cfg.text} border-current/20`}>
              {cfg.label}
            </span>
          </div>
          {insight.metric && (
             <div className="flex flex-col items-end">
               <span className={`text-3xl ${isFeatured ? 'md:text-4xl' : ''} font-black tracking-tighter ${cfg.text} drop-shadow-sm leading-none`}>
                 {numberPart}
               </span>
               {unitPart && (
                 <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${cfg.text} opacity-70`}>
                   {unitPart}
                 </span>
               )}
             </div>
          )}
        </div>

        <div>
          <p className={`text-slate-700 dark:text-slate-300 leading-relaxed ${isFeatured ? 'text-base md:text-lg font-medium' : 'text-sm'}`}>
            {insight.text}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function IntelligenceSummary() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState(0);

  useEffect(() => {
    api.get('/api/analytics/insights').then(r => {
      const d = r.data;
      const generated = [];

      if (d.top_researcher) {
        generated.push({
          icon: 'star',
          metric: `${d.top_researcher.count} pubs`,
          text: `${d.top_researcher.name} domine le classement avec ${d.top_researcher.count} publications indexées dans HAL — un moteur scientifique incontournable du laboratoire.`,
        });
      }

      if (d.growth_3y_pct > 0) {
        generated.push({
          icon: 'growth',
          metric: `+${d.growth_3y_pct}%`,
          text: `Le LISTIC a enregistré une croissance de ${d.growth_3y_pct}% de sa production scientifique sur les 3 dernières années (${d.recent_3y} vs ${d.prev_3y} publications).`,
        });
      } else if (d.growth_3y_pct < 0) {
        generated.push({
          icon: 'decline',
          metric: `${d.growth_3y_pct}%`,
          text: `La production a baissé de ${Math.abs(d.growth_3y_pct)}% sur les 3 dernières années. Une révision de la stratégie de publication est conseillée.`,
        });
      }

      if (d.peak_year) {
        generated.push({
          icon: 'award',
          metric: `${d.peak_count} pubs`,
          text: `${d.peak_year} fut l'année la plus productive du laboratoire avec ${d.peak_count} publications — représentant un pic historique de la recherche LISTIC.`,
        });
      }

      if (d.isolated_count > 0) {
        generated.push({
          icon: 'warning',
          metric: `${d.isolated_count} chercheurs`,
          text: `${d.isolated_count} chercheur${d.isolated_count > 1 ? 's' : ''} senior${d.isolated_count > 1 ? 's sont' : ' est'} sans publication HAL indexée${d.isolated_researchers?.length ? ' : ' + d.isolated_researchers.slice(0, 2).join(', ') + (d.isolated_count > 2 ? '…' : '') : ''}. Une mise à jour du profil HAL est conseillée.`,
        });
      }

      const activeRate = d.total_researchers > 0
        ? Math.round((d.active_researchers / d.total_researchers) * 100) : 0;
      generated.push({
        icon: 'team',
        metric: `${activeRate}%`,
        text: `${d.active_researchers} sur ${d.total_researchers} chercheurs permanents ont au moins une publication HAL indexée, soit un taux d'activité scientifique de ${activeRate}%.`,
      });

      generated.push({
        icon: 'publication',
        metric: `${d.total_publications?.toLocaleString()} pubs`,
        text: `Le LISTIC totalise ${d.total_publications?.toLocaleString()} publications dans l'archive ouverte HAL — un corpus scientifique de référence pour l'évaluation HCERES.`,
      });

      setInsights(generated);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Rotate spotlight every 4s
  useEffect(() => {
    if (!insights.length) return;
    const id = setInterval(() => setSpotlight(p => (p + 1) % insights.length), 4000);
    return () => clearInterval(id);
  }, [insights.length]);

  if (loading) return null;
  if (!insights.length) return null;

  return (
    <div className="mb-6">
      {/* Header — sobre, pas de dégradé violet criard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl
          bg-slate-100 dark:bg-white/5
          border border-slate-200 dark:border-white/10">
          <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
            Synthèse Algorithmique
          </span>
        </div>
        <div className="hidden sm:block h-px flex-1 bg-slate-200 dark:bg-white/8" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Insights générés par agrégation heuristique multi-sources
        </span>
      </div>

      {/* Insight grid (Bento Box style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, i) => (
            <InsightCard key={(insight.icon || '') + i} insight={insight} index={i} isActive={spotlight === i} />
          ))}
        </AnimatePresence>
      </div>


    </div>
  );
}
