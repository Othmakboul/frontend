import { Link, useLocation } from 'react-router-dom';
import { Network, Sun, Moon } from 'lucide-react';

export default function Navbar({ theme, toggleTheme }) {
    const location = useLocation();

    const NavLink = ({ to, label, isBold = false }) => {
        const isActive = location.pathname === to;
        return (
            <Link 
                to={to} 
                className={`text-xs tracking-wide transition-colors duration-200 hidden md:inline px-3 py-1.5 rounded-full ${
                    isActive 
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white font-medium' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/5'
                } ${isBold ? 'font-semibold text-slate-700 dark:text-slate-300' : ''}`}
            >
                {label}
            </Link>
        );
    };

    return (
        <nav className="sticky top-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
            <div className="pointer-events-auto bg-white/80 dark:bg-[#131316]/80 backdrop-blur-xl border border-slate-200 dark:border-hairline shadow-lg dark:shadow-2xl rounded-full px-5 py-2.5 flex justify-between items-center w-full max-w-5xl">
                
                <Link to="/" className="flex items-center space-x-2.5 group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center border border-slate-300 dark:border-white/10 group-hover:border-slate-400 dark:group-hover:border-zinc-500 transition-colors">
                        <Network className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-white" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white">
                        VisioListic
                    </span>
                </Link>

                <div className="flex items-center space-x-1 ml-8">
                    <NavLink to="/" label="Chercheurs" />
                    <NavLink to="/projects" label="Projets" />
                    <NavLink to="/network" label="Réseau" />
                    <NavLink to="/global-stats" label="Statistiques" />
                    <NavLink to="/advanced" label="Vue Direction" isBold={true} />
                </div>

                <div className="flex items-center pl-6 border-l border-slate-200 dark:border-white/10 ml-6">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          bg-slate-200 dark:bg-white/15 border border-slate-300 dark:border-white/20
                          text-slate-700 dark:text-white font-medium text-xs
                          hover:bg-slate-300 dark:hover:bg-white/25
                          shadow-sm transition-all duration-200 focus:outline-none"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark'
                          ? <><Sun className="w-3.5 h-3.5" /><span className="hidden sm:inline">Clair</span></>
                          : <><Moon className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sombre</span></>}
                    </button>
                </div>
            </div>
        </nav>
    );
}
