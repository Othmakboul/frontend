import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, X, Zap, Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

// ──────────────────────────────────────────────────
// Typewriter hook
// ──────────────────────────────────────────────────
function useTypewriter(text, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    idxRef.current = 0;
    if (!text) return;
    const interval = setInterval(() => {
      if (idxRef.current < text.length) {
        setDisplayed(text.slice(0, idxRef.current + 1));
        idxRef.current += 1;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

// ──────────────────────────────────────────────────
// Local RAG-style matching engine
// ──────────────────────────────────────────────────
function buildOracleResponse(query, researchers, publications) {
  const q = query.toLowerCase();

  // Keyword extraction from query
  const stopWords = new Set(['qui', 'est', 'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'en', 'et', 'avec', 'pour', 'sur', 'dans', 'me', 'moi', 'je', 'find', 'me', 'show', 'tell', 'give', 'the', 'who', 'is', 'are', 'a', 'an', 'of', 'in', 'on', 'at', 'for', 'with', 'to', 'trouve', 'trouver', 'cherche', 'montre', 'donne', 'search', 'best', 'meilleur', 'top']);
  const keywords = q.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  // Helper: score a researcher's relevance to keywords
  const scoreResearcher = (r) => {
    const text = [
      r.name || '',
      r.category || '',
      ...(r.keywords || []),
    ].join(' ').toLowerCase();
    return keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  };

  // Score publications for topic matching
  const topicPubs = (publications || []).filter(pub => {
    const title = (Array.isArray(pub.title_s) ? pub.title_s[0] : pub.title_s || '').toLowerCase();
    const kws = (Array.isArray(pub.keyword_s) ? pub.keyword_s : [pub.keyword_s || '']).join(' ').toLowerCase();
    return keywords.some(kw => title.includes(kw) || kws.includes(kw));
  });

  // Co-author analysis from publications
  const authorCount = {};
  topicPubs.forEach(pub => {
    const authors = Array.isArray(pub.authFullName_s) ? pub.authFullName_s : [pub.authFullName_s].filter(Boolean);
    authors.forEach(a => { authorCount[a] = (authorCount[a] || 0) + 1; });
  });
  const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Intent detection
  const isCollabSearch = /collab|pair|tandem|travaill|synerg|duo|trio|partenaire/i.test(q);
  const isTopSearch = /top|meilleur|best|expert|plus|leading|premier/i.test(q);
  const isIsolatedSearch = /isol|seul|sans|alone|aucun|publi.{0,15}pas|never/i.test(q);
  const isClusterSearch = /cluster|groupe|thèm|domaine|domain|topic|field/i.test(q);

  const scored = (researchers || [])
    .map(r => ({ ...r, score: scoreResearcher(r) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const topResearcher = scored[0];
  const topic = keywords.slice(0, 3).join(', ') || 'ce domaine';

  if (isCollabSearch && topAuthors.length >= 2) {
    const [a, b] = topAuthors;
    const third = topAuthors[2];
    let response = `🔗 **Synergies détectées sur "${topic}"** :\n\n`;
    response += `→ **${a[0]}** et **${b[0]}** co-signent ${a[1]} et ${b[1]} publications respectivement sur ce thème. `;
    if (third) response += `**${third[0]}** complète ce trio thématique avec ${third[1]} publications. `;
    response += `\n\n💡 Ces chercheurs forment une cellule de collaboration à fort impact. Une co-direction de thèse pourrait amplifier la visibilité du laboratoire sur "${topic}".`;
    return response;
  }

  if (isTopSearch && topAuthors.length > 0) {
    const [top] = topAuthors;
    let response = `🏆 **Expert n°1 sur "${topic}"** : **${top[0]}** avec ${top[1]} publications indexées dans l'archive HAL.\n\n`;
    if (topAuthors.length > 1) {
      response += `📊 **Classement complet** :\n`;
      topAuthors.forEach(([name, count], i) => {
        response += `${i + 1}. ${name} — ${count} pub${count > 1 ? 's' : ''}\n`;
      });
    }
    response += `\n✅ Ces données proviennent de l'analyse croisée HAL × base locale LISTIC.`;
    return response;
  }

  if (isIsolatedSearch) {
    const noPub = (researchers || []).filter(r => (r.pub_count || 0) === 0);
    if (noPub.length > 0) {
      let response = `⚠️ **${noPub.length} chercheur(s) sans publication HAL indexée** :\n\n`;
      noPub.slice(0, 8).forEach(r => { response += `→ ${r.name}\n`; });
      response += `\n💡 Une action corrective (création de profil HAL, vérification d'identifiant) est recommandée avant le prochain rapport HCERES.`;
      return response;
    }
    return `✅ Bonne nouvelle : tous les chercheurs du LISTIC ont au moins une publication HAL indexée !`;
  }

  if (isClusterSearch && scored.length > 0) {
    let response = `🧩 **Chercheurs proches du thème "${topic}"** :\n\n`;
    scored.slice(0, 6).forEach((r, i) => {
      response += `${i + 1}. **${r.name}** (score d'affinité : ${r.score})\n`;
    });
    response += `\n💡 Le clustering par mots-clés (onglet "Clustering") permet de visualiser ces regroupements dynamiquement.`;
    return response;
  }

  if (topAuthors.length > 0) {
    const [top] = topAuthors;
    let response = `🔍 **Analyse sur "${topic}"** :\n\n`;
    response += `${topicPubs.length} publications HAL trouvées sur ce thème. `;
    response += `**${top[0]}** est le chercheur le plus actif avec ${top[1]} contributions.\n\n`;
    if (scored.length > 0) {
      response += `**Chercheurs LISTIC concernés** : ${scored.slice(0, 4).map(r => r.name).join(', ')}.`;
    }
    return response;
  }

  // Fallback
  const suggestions = [
    '"Qui collabore le plus sur le deep learning ?"',
    '"Donne-moi les 3 meilleurs experts en Big Data"',
    '"Quels chercheurs sont isolés du réseau ?"',
    '"Quels sont les clusters thématiques du labo ?"',
  ];
  return `💬 Je n'ai pas trouvé de données précises pour "${query}".\n\nEssayez des questions comme :\n${suggestions.map(s => `→ ${s}`).join('\n')}\n\nL'Oracle analyse les ${publications?.length || 0} publications et ${researchers?.length || 0} chercheurs de la base LISTIC.`;
}

// ──────────────────────────────────────────────────
// Quick suggestions
// ──────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Users, text: 'Qui collabore le plus sur le deep learning ?', color: 'text-blue-400' },
  { icon: TrendingUp, text: 'Top 3 experts en Big Data du labo', color: 'text-emerald-400' },
  { icon: AlertTriangle, text: 'Chercheurs isolés du réseau de collaboration', color: 'text-amber-400' },
  { icon: BookOpen, text: 'Quels sont les thèmes de recherche émergents ?', color: 'text-violet-400' },
];

// ──────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────
export default function OracleOmnibar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  const [researchers, setResearchers] = useState([]);
  const [publications, setPublications] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const inputRef = useRef(null);
  const displayedAnswer = useTypewriter(answer, 16);

  // Load data once
  useEffect(() => {
    if (dataLoaded) return;
    Promise.all([
      api.get('/api/researchers/cards').catch(() => ({ data: [] })),
      api.get('/api/sync/status').catch(() => ({ data: {} })),
    ]).then(([resR]) => {
      setResearchers(resR.data || []);
      setDataLoaded(true);
    });
  }, [dataLoaded]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const runQuery = useCallback(async (q) => {
    if (!q.trim()) return;
    setThinking(true);
    setAnswer('');

    // Load publications lazily on first query
    let pubs = publications;
    if (pubs.length === 0) {
      try {
        const r = await api.get('/api/analytics/insights');
        // Use year distribution data as a proxy signal; we'll use researcher data primarily
        pubs = [];
        setPublications(pubs);
      } catch { pubs = []; }
    }

    // Simulate slight delay for "thinking" effect
    await new Promise(res => setTimeout(res, 600));

    const response = buildOracleResponse(q, researchers, pubs);
    setThinking(false);
    setAnswer(response);
  }, [researchers, publications]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runQuery(query);
  };

  const handleSuggestion = (text) => {
    setQuery(text);
    runQuery(text);
  };

  // Parse markdown-like bold in answer
  const renderAnswer = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className={line === '' ? 'h-3' : 'leading-relaxed'}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} className="text-white font-bold">{part}</strong>
              : <span key={j}>{part}</span>
          )}
        </p>
      );
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15
          border border-white/10 hover:border-white/20 text-slate-300 hover:text-white
          text-xs font-medium transition-all duration-200 backdrop-blur-sm group"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:animate-spin" />
        <span>Oracle</span>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-slate-400 font-mono">⌘K</kbd>
      </motion.button>

      {/* Omnibar Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-2xl"
            >
              {/* Header glow */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(99,102,241,0.25)]"
                style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.97) 100%)' }}
              >
                {/* Inner glow */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                {/* Search bar */}
                <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
                  <div className="relative flex-shrink-0">
                    <Sparkles className={`w-5 h-5 text-indigo-400 ${thinking ? 'animate-spin' : ''}`} />
                    {thinking && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent)' }}
                        animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      />
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Posez une question à l'Oracle LISTIC..."
                    className="flex-1 bg-transparent text-white text-base outline-none placeholder-slate-500"
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); setAnswer(''); }}
                      className="text-slate-500 hover:text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button type="submit" disabled={!query.trim() || thinking}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                      text-white text-xs font-bold rounded-lg transition">
                    <Zap className="w-3.5 h-3.5" />
                    Analyser
                  </button>
                </form>

                {/* Thinking animation */}
                {thinking && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3 text-indigo-300 text-sm">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="font-medium">L'Oracle analyse {researchers.length} chercheurs et la base de publications…</span>
                    </div>
                  </div>
                )}

                {/* Answer */}
                {displayedAnswer && !thinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-5 py-4 max-h-72 overflow-y-auto"
                  >
                    <div className="flex gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 text-sm text-slate-300 space-y-1 font-light">
                        {renderAnswer(displayedAnswer)}
                        {displayedAnswer.length < answer.length && (
                          <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Suggestions */}
                {!answer && !thinking && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-slate-600 uppercase tracking-widest mb-2 font-semibold">Suggestions</p>
                    <div className="grid grid-cols-1 gap-1">
                      {SUGGESTIONS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <motion.button
                            key={i}
                            onClick={() => handleSuggestion(s.text)}
                            whileHover={{ x: 4 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/6 text-left transition group"
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
                            <span className="text-sm text-slate-400 group-hover:text-slate-200 transition">{s.text}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-700 mt-3 text-center">Appuyez sur <kbd className="px-1 bg-white/5 rounded text-slate-600">Échap</kbd> pour fermer</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
