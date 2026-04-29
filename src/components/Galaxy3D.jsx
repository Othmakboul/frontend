import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Info, BookOpen, FolderOpen, GraduationCap } from 'lucide-react';
import api from '../lib/api';

// Lazy-load the 3D graph (code-split so build succeeds even if lib tree-shakes weirdly)
const ForceGraph3D = lazy(() => import('react-force-graph-3d'));

// ──────────────────────────────────────────────────
// Starfield canvas background
// ──────────────────────────────────────────────────
function Stars() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.2,
      alpha: Math.random() * 0.6 + 0.15,
      drift: Math.random() * 0.8 + 0.2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const t = Date.now() * 0.001;
      stars.forEach(s => {
        const a = Math.max(0.05, Math.min(0.9, s.alpha + Math.sin(t * s.drift) * 0.15));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ──────────────────────────────────────────────────
// Galaxy 3D Main Component
// ──────────────────────────────────────────────────
export default function Galaxy3D({ onClose }) {
  const graphRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // Build graph data from API
  useEffect(() => {
    const buildGraph = async () => {
      setLoading(true);
      try {
        const [resR, cardsR] = await Promise.all([
          api.get('/researchers'),
          api.get('/api/researchers/cards').catch(() => ({ data: [] })),
        ]);

        const researchers = resR.data || [];
        const cards = cardsR.data || [];
        const cardMap = Object.fromEntries(cards.map(c => [c._unique_id, c]));

        const catColors = {
          enseignants_chercheurs: '#60a5fa',
          chercheurs: '#34d399',
          doctorants: '#a78bfa',
          post_doc: '#fb923c',
          ater: '#f472b6',
        };
        const defaultColor = '#94a3b8';

        const nodes = researchers.map(r => ({
          id: r._unique_id,
          name: r.name,
          category: r.category,
          color: catColors[r.category] || defaultColor,
          pub_count: cardMap[r._unique_id]?.pub_count || 0,
          project_count: cardMap[r._unique_id]?.project_count || 0,
          phd_count: cardMap[r._unique_id]?.phd_count || 0,
          val: Math.max(4, Math.min(18, (cardMap[r._unique_id]?.pub_count || 1) * 0.4 + 4)),
        }));

        // Build links: try collaboration API, fallback to category-based
        let links = [];
        try {
          const collabR = await api.post('/api/advanced/aggregated-stats', {
            researchers: researchers.map(r => r.name),
            start_year: 2010,
            end_year: 2026,
          });
          const pairs = collabR.data?.collaborations?.pairs || [];
          links = pairs.slice(0, 150).map(p => {
            const [nameA, nameB] = p.pair.split(' | ');
            const nodeA = researchers.find(r => r.name === nameA);
            const nodeB = researchers.find(r => r.name === nameB);
            if (!nodeA || !nodeB) return null;
            return {
              source: nodeA._unique_id,
              target: nodeB._unique_id,
              value: p.count,
            };
          }).filter(Boolean);
        } catch {
          // Fallback: sparse links within same category
          const catGroups = {};
          researchers.forEach(r => {
            const cat = r.category || 'other';
            if (!catGroups[cat]) catGroups[cat] = [];
            catGroups[cat].push(r._unique_id);
          });
          Object.values(catGroups).forEach(group => {
            group.forEach((id, i) => {
              if (i > 0 && Math.random() > 0.5) {
                links.push({ source: group[Math.floor(Math.random() * i)], target: id, value: 1 });
              }
            });
          });
        }

        setGraphData({ nodes, links });
      } catch (e) {
        console.error('Galaxy3D data error:', e);
      } finally {
        setLoading(false);
      }
    };
    buildGraph();
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (graphRef.current) {
      const dist = 100;
      const distRatio = 1 + dist / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      graphRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1200
      );
    }
  }, []);

  const nodeColor = useCallback((node) => node.color, []);
  const nodeVal = useCallback((node) => node.val, []);
  const linkColor = useCallback(() => 'rgba(99,102,241,0.25)', []);
  const linkWidth = useCallback((link) => Math.max(0.5, (link.value || 1) * 0.25), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #0d1117 0%, #020408 100%)' }}
    >
      <Stars />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">🌌 LISTIC Galaxy — Mode 3D</h2>
            <p className="text-slate-500 text-xs">Cliquez sur une sphère · Faites glisser pour pivoter · Scroll pour zoomer</p>
          </div>
        </div>

        {/* Category legend */}
        <div className="hidden md:flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 border border-white/8">
          {[
            { color: '#60a5fa', label: 'Enseignants-chercheurs' },
            { color: '#34d399', label: 'Chercheurs' },
            { color: '#a78bfa', label: 'Doctorants' },
            { color: '#fb923c', label: 'Post-doc' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-white/8 hover:bg-white/15 text-white rounded-xl border border-white/10 text-sm font-semibold transition backdrop-blur-sm">
          <X className="w-4 h-4" /> Fermer
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
          <p className="text-indigo-300 font-semibold animate-pulse">Génération de la galaxie LISTIC…</p>
          <p className="text-slate-600 text-sm mt-1">{graphData.nodes.length} chercheurs chargés</p>
        </div>
      )}

      {/* 3D Graph */}
      {!loading && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Chargement du moteur 3D…
          </div>
        }>
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            backgroundColor="transparent"
            nodeColor={nodeColor}
            nodeVal={nodeVal}
            nodeLabel="name"
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalParticles={2}
            linkDirectionalParticleColor={() => '#818cf8'}
            linkDirectionalParticleWidth={1.2}
            onNodeClick={handleNodeClick}
            showNavInfo={false}
            width={window.innerWidth}
            height={window.innerHeight}
          />
        </Suspense>
      )}

      {/* Node info panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute top-20 right-4 z-30 w-72 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden"
            style={{ background: 'rgba(15,23,42,0.95)' }}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: selectedNode.color, boxShadow: `0 0 20px ${selectedNode.color}60` }}>
                  {selectedNode.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{selectedNode.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{selectedNode.category?.replace(/_/g, ' ')}</p>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: BookOpen, value: selectedNode.pub_count, label: 'Pubs', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { icon: FolderOpen, value: selectedNode.project_count, label: 'Projets', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { icon: GraduationCap, value: selectedNode.phd_count, label: 'PhD', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                ].map(({ icon: Icon, value, label, color, bg }) => (
                  <div key={label} className={`text-center p-2.5 rounded-xl ${bg}`}>
                    <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                    <p className="text-lg font-bold text-white">{value ?? 0}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-4">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Taille de la sphère ∝ publications</span>
              </div>
            </div>

            <div className="border-t border-white/8 px-5 py-3">
              <a href={`/researcher/${selectedNode.id}`}
                className="flex items-center justify-center gap-2 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-xl text-xs font-semibold transition border border-blue-500/20">
                Voir le profil complet →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
