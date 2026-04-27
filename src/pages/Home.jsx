import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Search, Mail, Phone, Building, BookOpen, FolderOpen, GraduationCap } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

export default function Home() {
    const [researchers, setResearchers] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Use /api/researchers/cards which includes pub_count & project_count from local DB
        api.get('/api/researchers/cards')
            .then(res => {
                setResearchers(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                // Fallback to basic endpoint
                api.get('/researchers').then(r => {
                    setResearchers(r.data);
                    setLoading(false);
                });
            });
    }, []);

    const q = query.toLowerCase();
    const filtered = researchers.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q))
    );

    return (
        <div className="max-w-7xl mx-auto px-6 pb-20">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-extrabold text-slate-800 dark:text-white mb-4">
                    Discover <span className="text-blue-600">Research</span> Excellence
                </h1>
                <p className="text-slate-500 text-lg">Explore the profiles and impact of LISTIC laboratory members.</p>

                <div className="mt-8 relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="Search researchers..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-slate-400 animate-pulse">Loading researchers...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((r, i) => (
                        <Motion.div
                            key={r._unique_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                        >
                            <Link to={`/researcher/${r._unique_id}`} className="block group">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 transition-all duration-300 transform group-hover:-translate-y-1">
                                    {/* Header */}
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                            {r.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-blue-600 transition truncate">{r.name}</h3>
                                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                {r.category?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats from DB warehouse */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-semibold">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            {r.pub_count ?? '–'} Pubs
                                        </span>
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-semibold">
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            {r.project_count ?? '–'} Projects
                                        </span>
                                        {r.phd_count > 0 && (
                                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-xl text-sm font-semibold">
                                                <GraduationCap className="w-3.5 h-3.5" />
                                                {r.phd_count} PhD
                                            </span>
                                        )}
                                    </div>

                                    {/* Contact Info */}
                                    <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                                        {r.email && (
                                            <div className="flex items-center space-x-2">
                                                <Mail className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{r.email.replace(/ -@- | @ | @ /g, '@')}</span>
                                            </div>
                                        )}
                                        {r.phone && (
                                            <div className="flex items-center space-x-2">
                                                <Phone className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{Array.isArray(r.phone) ? r.phone[0] : r.phone}</span>
                                            </div>
                                        )}
                                        {r.office && (
                                            <div className="flex items-center space-x-2">
                                                <Building className="w-4 h-4 flex-shrink-0" />
                                                <span>{r.office}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </Motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
