import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import api from '../lib/api';

const MIN_YEAR = 2010;
const MAX_YEAR = 2026;

function AnimatedNumber({ value }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="inline-block tabular-nums"
      >
        {value?.toLocaleString() ?? '—'}
      </motion.span>
    </AnimatePresence>
  );
}

export default function TimeMachineSlider({ activeYear, onYearChange }) {
  const [playing, setPlaying] = useState(false);
  const [yearlyData, setYearlyData] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    api.get('/api/analytics/yearly-stats').then(r => setYearlyData(r.data)).catch(() => {});
  }, []);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    clearInterval(intervalRef.current);
  }, []);

  const startPlay = useCallback(() => {
    setPlaying(true);
    clearInterval(intervalRef.current);
    if (activeYear >= MAX_YEAR) onYearChange(MIN_YEAR);
    intervalRef.current = setInterval(() => {
      onYearChange(prev => {
        if (prev >= MAX_YEAR) {
          stopPlay();
          return MAX_YEAR;
        }
        return prev + 1;
      });
    }, 900);
  }, [activeYear, onYearChange, stopPlay]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const progress = ((activeYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const globalByYear = yearlyData?.global_by_year || {};
  const cumulative = Object.entries(globalByYear)
    .filter(([y]) => parseInt(y) <= activeYear)
    .reduce((sum, [, c]) => sum + c, 0);
  const thisYear = globalByYear[activeYear] || 0;
  const maxYearCount = Math.max(...Object.values(globalByYear), 1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl
      bg-gradient-to-r from-slate-900/90 via-indigo-950/50 to-slate-900/90 p-5 mt-6">

      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative flex flex-wrap items-center gap-6">
        {/* Icon + label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Time Machine</p>
            <p className="text-xs text-slate-500">Évolution du laboratoire</p>
          </div>
        </div>

        {/* Year display */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <div className="text-4xl font-black text-white leading-none tabular-nums overflow-hidden h-10 flex items-center justify-center">
            <AnimatedNumber value={activeYear} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Année</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400 tabular-nums h-7 flex items-center">
              <AnimatedNumber value={thisYear} />
            </div>
            <p className="text-xs text-slate-500">pubs cette année</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400 tabular-nums h-7 flex items-center">
              <AnimatedNumber value={cumulative} />
            </div>
            <p className="text-xs text-slate-500">cumulées jusqu'ici</p>
          </div>
        </div>

        {/* Slider + controls */}
        <div className="flex-1 min-w-[200px] space-y-2">
          {/* Mini bar chart */}
          {Object.keys(globalByYear).length > 0 && (
            <div className="flex items-end gap-0.5 h-8">
              {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map(y => {
                const count = globalByYear[y] || 0;
                const heightPct = (count / maxYearCount) * 100;
                const isPast = y <= activeYear;
                return (
                  <div
                    key={y}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    className={`flex-1 rounded-t-sm transition-all duration-300 cursor-pointer ${
                      isPast ? 'bg-indigo-400' : 'bg-slate-700'
                    } ${y === activeYear ? 'bg-white' : ''}`}
                    onClick={() => onYearChange(y)}
                    title={`${y}: ${count} pubs`}
                  />
                );
              })}
            </div>
          )}

          {/* Range slider */}
          <div className="relative">
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={activeYear}
              onChange={e => { stopPlay(); onYearChange(+e.target.value); }}
              className="w-full accent-indigo-400 cursor-pointer h-1.5"
              style={{
                background: `linear-gradient(to right, #818cf8 ${progress}%, #334155 ${progress}%)`
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>{MIN_YEAR}</span>
            {Array.from({ length: 3 }, (_, i) => MIN_YEAR + Math.round((MAX_YEAR - MIN_YEAR) * (i + 1) / 4)).map(y => (
              <span key={y}>{y}</span>
            ))}
            <span>{MAX_YEAR}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { stopPlay(); onYearChange(MIN_YEAR); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/10"
            title="Retour au début"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={playing ? stopPlay : startPlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition border ${
              playing
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'
            }`}
          >
            {playing
              ? <><Pause className="w-4 h-4" /> Pause</>
              : <><Play className="w-4 h-4" /> Play</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
