import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SashaChatPage from '../pages/SashaChatPage';
import {
  LayoutDashboard, ClipboardList, Wrench, DollarSign, LogOut,
  Shield, Search, MessageSquare, ChevronDown, ChevronRight, Award,
  User, Settings, Star, TrendingUp, Calendar, List, History, Sun, Moon
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep track of which sidebar sections are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'My Jobs': true,
    'Parts & Inventory': true,
    'Earnings': true,
    'Account': true,
  });

  const toggleExpand = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isActiveRoute = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const hasQueryParams = (key: string, value: string) => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get(key) === value;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside 
        className="w-72 flex-shrink-0 flex flex-col text-slate-100 overflow-y-auto" 
        style={{ background: 'radial-gradient(circle at top left, #0A2647, #001021)' }}
      >
        {/* Sears KAIros / Sasha 1099 Branding */}
        <div className="p-6 border-b border-blue-900/40 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/20">
              <Shield className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white">SEARS KAIROS</h1>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">SASHA 1099 PORTAL</p>
            </div>
          </div>
        </div>

        {/* Navigation Tree */}
        <nav className="flex-grow px-3 py-4 space-y-1.5 select-none">
          {/* Dashboard */}
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-[15px] font-semibold rounded-lg transition-all ${
              isActive && location.search === ''
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          {/* My Jobs (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('My Jobs')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer ${
                isActiveRoute('/assignments') ? 'text-white' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 shrink-0" />
                <span>My Jobs</span>
              </div>
              {expanded['My Jobs'] ? <ChevronDown className="h-4.5 w-4.5 opacity-75" /> : <ChevronRight className="h-4.5 w-4.5 opacity-75" />}
            </div>
            {expanded['My Jobs'] && (
              <div className="pl-8 pr-1 py-0.5 space-y-1 border-l border-blue-900/30 ml-5">
                <button
                  onClick={() => navigate('/assignments?view=list')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/assignments') && (hasQueryParams('view', 'list') || !location.search.includes('view='))
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <List className="h-4 w-4" />
                  <span>List View</span>
                </button>
                <button
                  onClick={() => navigate('/assignments?view=calendar')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/assignments') && hasQueryParams('view', 'calendar')
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Weekly Calendar View</span>
                </button>
              </div>
            )}
          </div>

          {/* Chat AI (Sasha Assistant) with green pulsing indicator */}
          <NavLink
            to="/chat"
            className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 shrink-0 text-cyan-400" />
              <span>Chat AI (Sasha)</span>
            </div>
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </NavLink>

          {/* Available Jobs */}
          <NavLink
            to="/available-jobs"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-[15px] font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Search className="h-5 w-5 shrink-0" />
            <span>Available Jobs</span>
          </NavLink>

          {/* Parts & Inventory (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('Parts & Inventory')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer ${
                isActiveRoute('/parts') ? 'text-white' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 shrink-0" />
                <span>Parts & Inventory</span>
              </div>
              {expanded['Parts & Inventory'] ? <ChevronDown className="h-4.5 w-4.5 opacity-75" /> : <ChevronRight className="h-4.5 w-4.5 opacity-75" />}
            </div>
            {expanded['Parts & Inventory'] && (
              <div className="pl-8 pr-1 py-0.5 space-y-1 border-l border-blue-900/30 ml-5">
                <button
                  onClick={() => navigate('/parts?tab=active')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/parts') && (hasQueryParams('tab', 'active') || !location.search.includes('tab='))
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Active Orders</span>
                </button>
                <button
                  onClick={() => navigate('/parts?tab=history')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/parts') && hasQueryParams('tab', 'history')
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Order History</span>
                </button>
              </div>
            )}
          </div>

          {/* Earnings (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('Earnings')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer ${
                isActiveRoute('/earnings') ? 'text-white' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 shrink-0" />
                <span>Earnings</span>
              </div>
              {expanded['Earnings'] ? <ChevronDown className="h-4.5 w-4.5 opacity-75" /> : <ChevronRight className="h-4.5 w-4.5 opacity-75" />}
            </div>
            {expanded['Earnings'] && (
              <div className="pl-8 pr-1 py-0.5 space-y-1 border-l border-blue-900/30 ml-5">
                {['today', 'week', 'month', 'ytd'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => navigate(`/earnings?tab=${tab}`)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left capitalize transition-all ${
                      isActiveRoute('/earnings') && (hasQueryParams('tab', tab) || (!location.search.includes('tab=') && tab === 'today'))
                        ? 'bg-blue-500/20 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>{tab === 'ytd' ? 'YTD' : tab === 'week' ? 'This Week' : tab}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('Account')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer ${
                isActiveRoute('/account') ? 'text-white' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 shrink-0" />
                <span>Account</span>
              </div>
              {expanded['Account'] ? <ChevronDown className="h-4.5 w-4.5 opacity-75" /> : <ChevronRight className="h-4.5 w-4.5 opacity-75" />}
            </div>
            {expanded['Account'] && (
              <div className="pl-8 pr-1 py-0.5 space-y-1 border-l border-blue-900/30 ml-5">
                <button
                  onClick={() => navigate('/account?tab=profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/account') && (hasQueryParams('tab', 'profile') || !location.search.includes('tab='))
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Profile & Settings</span>
                </button>
                <button
                  onClick={() => navigate('/account?tab=performance')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/account') && hasQueryParams('tab', 'performance')
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Award className="h-4 w-4 animate-pulse text-yellow-400" />
                  <span>Performance</span>
                </button>
                <button
                  onClick={() => navigate('/account?tab=reviews')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/account') && hasQueryParams('tab', 'reviews')
                      ? 'bg-blue-500/20 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Star className="h-4 w-4" />
                  <span>Customer Reviews</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-blue-900/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'light' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-300" />}
              <span className="text-xs font-semibold text-slate-300">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-400'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* User Footer with ELITE Badge */}
        <div className="mt-auto p-4.5 border-t border-blue-900/40 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-blue-400/20 shrink-0 text-base shadow-inner">
              {(user?.vendorName || user?.username || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate text-white">{user?.vendorName || 'Sasha Tech'}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-yellow-500/25 border border-yellow-500/40 rounded text-[10px] font-extrabold text-yellow-400 tracking-wider">
                  ELITE
                </span>
                <span className="text-xs text-slate-400 truncate">Technician</span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-grow flex flex-col overflow-hidden bg-gray-50 relative">
        {isActiveRoute('/chat') ? (
          <div className="flex-grow flex flex-col h-full w-full">
            <SashaChatPage active={true} />
          </div>
        ) : (
          <div className="flex-grow flex flex-col h-full overflow-hidden">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};

export default Layout;
