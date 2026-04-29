import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Printer, Download, ChevronRight, CheckCircle, AlertTriangle, XCircle, Monitor } from 'lucide-react';
import api from '../lib/api';

// ──────────────────────────────────────────────────
// PPTX Export
// ──────────────────────────────────────────────────
async function exportToPptx(data) {
  const { insights: ins, inconsistencies: inc } = data;
  const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Dynamic import to avoid bundle bloat
  let pptxgenjs;
  try {
    pptxgenjs = (await import('pptxgenjs')).default;
  } catch {
    alert('pptxgenjs non disponible. Exécutez : npm install pptxgenjs');
    return;
  }

  const pptx = new pptxgenjs();
  pptx.layout = 'LAYOUT_WIDE';

  // ── Theme helpers ─────────────────────────────────
  const BG = '0d1b2a';
  const BLUE = '3b82f6';
  const INDIGO = '6366f1';
  const WHITE = 'FFFFFF';
  const SLATE = '94a3b8';
  const ACCENT = '818cf8';

  const titleFont = { fontFace: 'Calibri', bold: true, color: WHITE };
  const bodyFont = { fontFace: 'Calibri', color: SLATE };

  const addBg = (slide) => {
    slide.background = { color: BG };
    // Top accent bar
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.07, fill: { color: INDIGO } });
  };

  const addFooter = (slide, num) => {
    slide.addText(`LISTIC — Université Savoie Mont Blanc · ${today}`, {
      x: 0.4, y: '93%', w: '80%', h: 0.3,
      fontFace: 'Calibri', color: '334155', fontSize: 9,
    });
    slide.addText(`${num} / 5`, {
      x: '90%', y: '93%', w: 0.5, h: 0.3,
      fontFace: 'Calibri', color: '334155', fontSize: 9, align: 'right',
    });
  };

  // ── Slide 1 : Cover ──────────────────────────────
  const s1 = pptx.addSlide();
  addBg(s1);
  // Big gradient-like rect
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: 4.5, h: 5, fill: { color: '1e1b4b' }, line: { type: 'none' } });

  s1.addText('BILAN SCIENTIFIQUE', {
    x: 0.6, y: 1.2, w: 9, h: 0.6,
    ...titleFont, fontSize: 14, color: ACCENT, charSpacing: 4,
  });
  s1.addText('LISTIC', {
    x: 0.6, y: 1.8, w: 9, h: 1.4,
    ...titleFont, fontSize: 60, color: WHITE,
  });
  s1.addText('Université Savoie Mont Blanc', {
    x: 0.6, y: 3.0, w: 9, h: 0.5,
    fontFace: 'Calibri', fontSize: 18, color: SLATE,
  });
  s1.addText(`Rapport généré le ${today}`, {
    x: 0.6, y: 3.7, w: 9, h: 0.4,
    fontFace: 'Calibri', fontSize: 12, color: '475569',
  });
  s1.addShape(pptx.ShapeType.rect, { x: 0.6, y: 4.3, w: 2.2, h: 0.45, fill: { color: BLUE }, line: { type: 'none' } });
  s1.addText('USAGE INTERNE · HCERES', {
    x: 0.6, y: 4.3, w: 2.2, h: 0.45,
    fontFace: 'Calibri', fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle',
  });
  addFooter(s1, 1);

  // ── Slide 2 : KPIs ──────────────────────────────
  const s2 = pptx.addSlide();
  addBg(s2);
  s2.addText('Chiffres Clés', { x: 0.6, y: 0.4, w: 9, h: 0.6, ...titleFont, fontSize: 28 });
  s2.addText('Indicateurs de performance — base HAL × LISTIC × theses.fr', {
    x: 0.6, y: 1.0, w: 9, h: 0.35, ...bodyFont, fontSize: 11,
  });

  const kpis = [
    { label: 'Publications HAL', value: ins.total_publications?.toLocaleString() || '—', color: BLUE },
    { label: 'Chercheurs actifs', value: ins.active_researchers || '—', color: '10b981' },
    { label: 'Croissance 3 ans', value: `${ins.growth_3y_pct > 0 ? '+' : ''}${ins.growth_3y_pct}%`, color: ACCENT },
    { label: 'Anomalies détectées', value: inc.total_issues || 0, color: 'f59e0b' },
  ];

  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 5.1;
    const y = 1.6 + row * 1.9;
    s2.addShape(pptx.ShapeType.rect, { x, y, w: 4.7, h: 1.6, fill: { color: '1e293b' }, line: { color: '334155', pt: 1 } });
    s2.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h: 1.6, fill: { color: kpi.color }, line: { type: 'none' } });
    s2.addText(String(kpi.value), { x: x + 0.3, y: y + 0.2, w: 4.2, h: 0.7, fontFace: 'Calibri', bold: true, fontSize: 32, color: WHITE });
    s2.addText(kpi.label, { x: x + 0.3, y: y + 0.95, w: 4.2, h: 0.4, ...bodyFont, fontSize: 12 });
  });
  addFooter(s2, 2);

  // ── Slide 3 : Top chercheurs ──────────────────────
  const s3 = pptx.addSlide();
  addBg(s3);
  s3.addText('Top Chercheurs', { x: 0.6, y: 0.4, w: 9, h: 0.6, ...titleFont, fontSize: 28 });
  s3.addText('Chercheurs les plus productifs selon les données HAL indexées', {
    x: 0.6, y: 1.0, w: 9, h: 0.35, ...bodyFont, fontSize: 11,
  });

  if (ins.top_researcher) {
    s3.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.6, w: 9.7, h: 1.5, fill: { color: '1e1b4b' }, line: { color: INDIGO, pt: 1 } });
    s3.addText('🏆', { x: 0.7, y: 1.75, w: 0.8, h: 1.2, fontSize: 28, valign: 'middle' });
    s3.addText(ins.top_researcher.name || '—', { x: 1.6, y: 1.8, w: 6, h: 0.6, fontFace: 'Calibri', bold: true, fontSize: 22, color: WHITE });
    s3.addText(`${ins.top_researcher.count} publications HAL indexées · Chercheur le plus productif du LISTIC`, {
      x: 1.6, y: 2.4, w: 7.5, h: 0.4, ...bodyFont, fontSize: 11,
    });
  }

  // Isolated researchers
  if (ins.isolated_count > 0) {
    s3.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.4, w: 9.7, h: 1.0, fill: { color: '450a0a' }, line: { color: 'ef4444', pt: 1 } });
    s3.addText(`⚠️  ${ins.isolated_count} chercheur(s) sans publication HAL`, {
      x: 0.7, y: 3.6, w: 8, h: 0.5, fontFace: 'Calibri', bold: true, fontSize: 14, color: 'fca5a5',
    });
    s3.addText('Action recommandée avant le prochain rapport HCERES : vérifier les identifiants HAL', {
      x: 0.7, y: 4.0, w: 9, h: 0.3, ...bodyFont, fontSize: 10,
    });
  }
  addFooter(s3, 3);

  // ── Slide 4 : Collaborations & Anomalies ─────────
  const s4 = pptx.addSlide();
  addBg(s4);
  s4.addText('Réseau & Anomalies', { x: 0.6, y: 0.4, w: 9, h: 0.6, ...titleFont, fontSize: 28 });

  // Anomaly counts
  [
    { label: 'Total Anomalies', value: inc.total_issues, color: SLATE, x: 0.4 },
    { label: 'Critiques', value: inc.high_severity, color: 'ef4444', x: 3.8 },
    { label: 'Modérées', value: inc.medium_severity, color: 'f59e0b', x: 7.0 },
  ].forEach(b => {
    s4.addShape(pptx.ShapeType.rect, { x: b.x, y: 1.1, w: 2.8, h: 1.2, fill: { color: '1e293b' }, line: { color: b.color, pt: 1.5 } });
    s4.addText(String(b.value ?? 0), { x: b.x, y: 1.15, w: 2.8, h: 0.7, fontFace: 'Calibri', bold: true, fontSize: 36, color: WHITE, align: 'center' });
    s4.addText(b.label, { x: b.x, y: 1.85, w: 2.8, h: 0.35, ...bodyFont, fontSize: 11, align: 'center' });
  });

  // List high severity issues
  const criticals = (inc.issues || []).filter(i => i.severity === 'high').slice(0, 4);
  if (criticals.length > 0) {
    s4.addText('Anomalies critiques à traiter :', {
      x: 0.6, y: 2.5, w: 9, h: 0.4, fontFace: 'Calibri', bold: true, fontSize: 13, color: WHITE,
    });
    criticals.forEach((issue, i) => {
      s4.addText(`• ${issue.researcher} : ${issue.message}`, {
        x: 0.8, y: 3.0 + i * 0.55, w: 9, h: 0.45,
        ...bodyFont, fontSize: 11, bullet: false,
      });
    });
  }
  addFooter(s4, 4);

  // ── Slide 5 : Recommandations ─────────────────────
  const s5 = pptx.addSlide();
  addBg(s5);
  s5.addText('Recommandations Stratégiques', { x: 0.6, y: 0.4, w: 9, h: 0.6, ...titleFont, fontSize: 26 });
  s5.addText('Analyse LISTIC Intelligence Dashboard — données HAL × theses.fr', { x: 0.6, y: 1.0, w: 9, h: 0.35, ...bodyFont, fontSize: 11 });

  const recommendations = [
    ins.growth_3y_pct > 0
      ? `La production scientifique est en croissance (+${ins.growth_3y_pct}%) → maintenir l'effort de publications en revues indexées.`
      : `La production scientifique est en légère baisse (${ins.growth_3y_pct}%) → identifier les causes et renforcer les collaborations.`,
    ins.isolated_count > 0
      ? `${ins.isolated_count} chercheur(s) non référencés sur HAL → action corrective urgente avant évaluation HCERES.`
      : '✅ Tous les chercheurs sont actifs sur HAL — continuez ainsi.',
    'Mettre en place un programme de mentorat inter-équipes pour enrichir le réseau de collaboration interne.',
    `La synchronisation automatique HAL garantit la fraîcheur des données (${inc.total_issues} anomalies détectées à régulariser).`,
    'Utiliser le module "Matching" de l\'outil pour identifier les collaborations inter-thèmes à fort potentiel.',
  ];

  recommendations.forEach((rec, i) => {
    const y = 1.55 + i * 0.85;
    s5.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 9.7, h: 0.72, fill: { color: '1e293b' }, line: { color: '334155', pt: 0.5 } });
    s5.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 0.08, h: 0.72, fill: { color: i === 0 ? '10b981' : i === 1 && ins.isolated_count > 0 ? 'ef4444' : INDIGO }, line: { type: 'none' } });
    s5.addText(rec, { x: 0.65, y: y + 0.1, w: 9.2, h: 0.52, ...bodyFont, fontSize: 10.5 });
  });
  addFooter(s5, 5);

  // ── Save ─────────────────────────────────────────
  await pptx.writeFile({ fileName: `Bilan-LISTIC-${new Date().getFullYear()}.pptx` });
}


function useReportData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [insightsR, inconsistR, syncR] = await Promise.all([
        api.get('/api/analytics/insights'),
        api.get('/api/analytics/inconsistencies'),
        api.get('/api/sync/status'),
      ]);
      setData({
        insights: insightsR.data,
        inconsistencies: inconsistR.data,
        sync: syncR.data,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, load };
}

function ReportContent({ data, contentRef }) {
  const { insights: ins, inconsistencies: inc, sync } = data;
  const today = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  const byYear = ins.year_distribution || {};
  const years = Object.keys(byYear).sort().slice(-7);

  return (
    <div ref={contentRef} id="listic-report" className="bg-white text-slate-800 font-sans">
      {/* Cover */}
      <div className="border-b-4 border-blue-700 pb-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-[0.2em] mb-2">
              Laboratoire d'Informatique, Systèmes, Traitement de l'Information et de la Connaissance
            </div>
            <h1 className="text-4xl font-black text-slate-900 leading-tight">
              BILAN SCIENTIFIQUE<br />
              <span className="text-blue-700">LISTIC</span>
            </h1>
            <p className="text-xl text-slate-500 mt-1">Université Savoie Mont Blanc</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Rapport généré le</div>
            <div className="font-bold text-slate-700">{today}</div>
            <div className="mt-2 px-3 py-1 bg-blue-700 text-white text-xs font-bold rounded-lg inline-block">
              USAGE INTERNE — HCERES
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] border-b border-slate-200 pb-2 mb-5">
          1. Synthèse Exécutive
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-3xl font-black text-blue-700">{ins.total_publications?.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Publications indexées HAL</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-3xl font-black text-emerald-700">{ins.active_researchers}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Chercheurs permanents actifs</p>
          </div>
          <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-3xl font-black text-violet-700">
              {ins.growth_3y_pct > 0 ? '+' : ''}{ins.growth_3y_pct}%
            </p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Croissance triennale</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Le LISTIC (UMR — Université Savoie Mont Blanc) totalise <strong>{ins.total_publications?.toLocaleString()} publications</strong> dans
          l'archive ouverte HAL sur la période d'analyse. Parmi les <strong>{ins.total_researchers} chercheurs permanents</strong>,
          {' '}<strong>{ins.active_researchers}</strong> ({Math.round((ins.active_researchers / ins.total_researchers) * 100)}%) présentent au moins
          une publication indexée. La production a connu une variation de <strong>{ins.growth_3y_pct > 0 ? '+' : ''}{ins.growth_3y_pct}%</strong> sur
          la dernière période triennale (2022–2024 vs 2019–2021).
          {ins.peak_year && ` L'année ${ins.peak_year} représente le pic historique avec ${ins.peak_count} publications.`}
        </p>
      </section>

      {/* KPIs */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] border-b border-slate-200 pb-2 mb-5">
          2. Indicateurs Clés de Performance (KPI)
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left p-3 font-semibold">Indicateur</th>
              <th className="text-right p-3 font-semibold">Valeur</th>
              <th className="text-left p-3 font-semibold">Interprétation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { label: 'Publications totales HAL', val: ins.total_publications?.toLocaleString(), note: 'Corpus complet de la recherche LISTIC' },
              { label: 'Chercheurs permanents actifs', val: `${ins.active_researchers} / ${ins.total_researchers}`, note: `Taux d'activité : ${Math.round((ins.active_researchers / ins.total_researchers) * 100)}%` },
              { label: 'Croissance triennale', val: `${ins.growth_3y_pct > 0 ? '+' : ''}${ins.growth_3y_pct}%`, note: 'Comparaison 2019-2021 vs 2022-2024' },
              { label: 'Pic de production', val: ins.peak_year, note: `${ins.peak_count} publications en ${ins.peak_year}` },
              { label: 'Chercheurs sans publication HAL', val: ins.isolated_count, note: ins.isolated_count > 0 ? 'Action recommandée' : 'Aucun — situation optimale' },
              { label: 'Anomalies données détectées', val: inc.total_issues, note: `${inc.high_severity} critiques · ${inc.medium_severity} modérées` },
              { label: 'Intégrité base de données', val: `${Math.max(0, 100 - Math.round(inc.high_severity * 5))}%`, note: 'Score de qualité données' },
            ].map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-3 font-medium text-slate-700">{row.label}</td>
                <td className="p-3 text-right font-black text-slate-900">{row.val}</td>
                <td className="p-3 text-slate-500 text-xs">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Year by year */}
      {years.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] border-b border-slate-200 pb-2 mb-5">
            3. Évolution de la Production (7 dernières années)
          </h2>
          <div className="flex items-end gap-2 h-28 mb-2">
            {years.map(y => {
              const count = byYear[y] || 0;
              const maxCount = Math.max(...years.map(yr => byYear[yr] || 0), 1);
              const heightPct = Math.max(6, (count / maxCount) * 100);
              return (
                <div key={y} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-600">{count}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-blue-600 rounded-t-sm min-h-[6px]"
                  />
                  <span className="text-xs text-slate-400">{y}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top researcher */}
      {ins.top_researcher && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] border-b border-slate-200 pb-2 mb-5">
            4. Chercheur le Plus Productif
          </h2>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {ins.top_researcher.name?.charAt(0)}
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg">{ins.top_researcher.name}</p>
              <p className="text-blue-700 font-bold">{ins.top_researcher.count} publications HAL indexées</p>
            </div>
          </div>
        </section>
      )}

      {/* Anomalies */}
      {inc.total_issues > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] border-b border-slate-200 pb-2 mb-5">
            5. Anomalies Détectées — Plan d'Action
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-2xl font-black text-red-600">{inc.high_severity}</p>
              <p className="text-xs text-slate-500">Critiques</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-2xl font-black text-amber-600">{inc.medium_severity}</p>
              <p className="text-xs text-slate-500">Modérées</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-2xl font-black text-slate-600">{inc.low_severity ?? 0}</p>
              <p className="text-xs text-slate-500">Faibles</p>
            </div>
          </div>
          <div className="space-y-2">
            {(inc.issues || []).filter(i => i.severity === 'high').slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{issue.researcher}</p>
                  <p className="text-xs text-slate-600">{issue.message}</p>
                  {issue.action && <p className="text-xs text-blue-600 mt-0.5 font-medium">→ {issue.action}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conclusion */}
      <section className="pt-8 border-t border-slate-200">
        <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.15em] pb-2 mb-4">
          6. Conclusion et Recommandations
        </h2>
        <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
          {ins.growth_3y_pct > 0 && (
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p>La production scientifique est en croissance sur la période récente (+{ins.growth_3y_pct}%), témoignant de la vitalité du laboratoire.</p>
            </div>
          )}
          {ins.isolated_count > 0 && (
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>{ins.isolated_count} chercheur(s) sans publication HAL indexée — des profils HAL doivent être créés ou vérifiés.</p>
            </div>
          )}
          <div className="flex gap-2">
            <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>Un programme de mentorat inter-équipes est recommandé pour augmenter la densité du réseau de collaborations interne.</p>
          </div>
          <div className="flex gap-2">
            <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>La synchronisation régulière avec HAL (automatique toutes les 6h) garantit l'actualité des données d'évaluation.</p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
          <span>LISTIC — Université Savoie Mont Blanc</span>
          <span>Rapport généré par LISTIC Intelligence Dashboard</span>
          <span>{today}</span>
        </div>
      </section>
    </div>
  );
}

export default function ReportModal() {
  const [open, setOpen] = useState(false);
  const { data, loading, load } = useReportData();
  const contentRef = useRef(null);

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const handlePrint = () => {
    const el = contentRef.current;
    if (!el) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html><html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <title>Bilan LISTIC ${new Date().getFullYear()}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 32px; color: #1e293b; }
          @page { size: A4; margin: 20mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl
          bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm
          shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:shadow-[0_0_50px_rgba(99,102,241,0.7)]
          border border-indigo-400/40 transition-all duration-300"
      >
        <FileText className="w-4 h-4" />
        Générer le Rapport
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden
                bg-white dark:bg-slate-900 shadow-2xl border border-white/10"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700
                bg-gradient-to-r from-blue-700 to-indigo-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white" />
                  <div>
                    <h2 className="font-black text-white">Bilan Officiel LISTIC</h2>
                    <p className="text-xs text-blue-200">Rapport d'évaluation — Format HCERES</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportToPptx(data)}
                    disabled={loading || !data}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white
                      rounded-xl text-sm font-semibold transition disabled:opacity-50 border border-white/20"
                    title="Export PowerPoint 5 slides"
                  >
                    <Download className="w-4 h-4" /> Export .pptx
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={loading || !data}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white
                      rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" /> Imprimer / PDF
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto flex-1 p-8 bg-white">
                {loading && (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                )}
                {data && !loading && <ReportContent data={data} contentRef={contentRef} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
