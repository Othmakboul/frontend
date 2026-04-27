import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function NetworkSubNav({ onSelectElement }) {
    const [researchers, setResearchers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resRes, projRes] = await Promise.all([
                    api.get('/researchers'),
                    api.get('/projects')
                ]);
                setResearchers(resRes.data.sort((a, b) => a.name.localeCompare(b.name)));
                setProjects(projRes.data.sort((a, b) => a.NOM.localeCompare(b.NOM)));
            } catch (err) {
                console.error("Error fetching data for sub-nav", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center gap-4 px-6 py-3 bg-slate-900/40 animate-pulse rounded-2xl border border-slate-800 shadow-lg z-30 mb-4 h-[60px]" />
    );

    return (
        <div className="flex items-center gap-4 px-6 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-lg z-30 mb-4 shrink-0 transition-all hover:border-slate-700">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-300">Aller vers:</span>
            </div>
            
            <div className="flex-1 flex gap-4">
                <div className="relative flex-1 max-w-sm">
                    <select 
                        className="w-full appearance-none bg-slate-800 text-sm font-medium text-slate-200 py-2.5 pl-4 pr-10 rounded-xl border border-slate-700 hover:border-blue-500/50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
                        onChange={(e) => {
                            if(e.target.value) {
                                const researcher = researchers.find(r => r._unique_id === e.target.value);
                                if (researcher) onSelectElement('researcher', researcher);
                                e.target.value = ""; // reset after selection
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>👨‍🔬 Sélectionner un Chercheur...</option>
                        {researchers.map(r => (
                            <option key={r._unique_id} value={r._unique_id}>{r.name} {r.category ? `(${r.category})` : ''}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <select 
                        className="w-full appearance-none bg-slate-800 text-sm font-medium text-slate-200 py-2.5 pl-4 pr-10 rounded-xl border border-slate-700 hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner"
                        onChange={(e) => {
                            if(e.target.value) {
                                const project = projects.find(p => p._unique_id === e.target.value);
                                if (project) onSelectElement('project', project);
                                e.target.value = ""; // reset after selection
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>🚀 Sélectionner un Projet...</option>
                        {projects.map(p => (
                            <option key={p._unique_id} value={p._unique_id}>{p.NOM} {p.type ? `(${p.type})` : ''}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
