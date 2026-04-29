import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import NetworkGraph from './pages/NetworkGraph';
import ProjectDashboard from './pages/ProjectDashboard';
import GlobalDashboard from './pages/GlobalDashboard';
import AdvancedDashboard from './pages/AdvancedDashboard';
import useTheme from './lib/useTheme';

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-[#0a0a0a] dark:text-zinc-100 font-sans selection:bg-blue-500/30 selection:text-blue-200">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/network" element={<NetworkGraph />} />
          <Route path="/projects" element={<ProjectDashboard />} />
          <Route path="/global-stats" element={<GlobalDashboard />} />
          <Route path="/advanced" element={<AdvancedDashboard />} />
          <Route path="/researcher/:id" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
