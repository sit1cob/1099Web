import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ApiService from '../api/apiService';
import { ga4PageView, ga4UserProfileLoaded } from '../utils/ga4DataLayer';
import SashaChatPage from '../pages/SashaChatPage';
import {
  LayoutDashboard, ClipboardList, Wrench, DollarSign, LogOut,
  Shield, Search, MessageSquare, ChevronDown, ChevronRight, Award,
  User, Settings, Star, TrendingUp, Calendar, List, History, Sun, Moon, MessageCircle,
  Menu, X
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const profileLoadedFired = useRef(false);

  // Fetch vendor profile to get the correct business name + persist profile fields
  useEffect(() => {
    ApiService.getVendorProfile().then(res => {
      if (res.success && res.data) {
        const profile = res.data;
        const name = profile.vendorName || profile.name || null;
        setDisplayName(name);
        // Persist profile fields to localStorage so logout/session_restored can use them
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          if (name) { stored.vendorName = name; stored.name = name; }
          if (profile.zipCode) stored.zipCode = profile.zipCode;
          if (profile.city) stored.city = profile.city;
          if (profile.state) stored.state = profile.state;
          if (profile.phone || profile.mobile) stored.phone = profile.phone || profile.mobile;
          if (profile.email) stored.email = profile.email;
          if (profile.addressLine1) stored.addressLine1 = profile.addressLine1;
          localStorage.setItem('user', JSON.stringify(stored));
        } catch (_) {}
        // Fire GA4 event only once
        if (!profileLoadedFired.current) {
          ga4UserProfileLoaded(profile);
          profileLoadedFired.current = true;
        }
      }
    }).catch(() => {});
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  // GA4 page view — only on pathname changes (not query param changes)
  useEffect(() => {
    const pageNames: Record<string, string> = {
      '/': 'Dashboard',
      '/assignments': 'My Jobs',
      '/available-jobs': 'Available Jobs',
      '/parts': 'Parts & Inventory',
      '/earnings': 'Earnings',
      '/account': 'Account',
      '/chat': 'Chat AI',
    };
    const pageName = pageNames[location.pathname] || location.pathname;
    ga4PageView(pageName, location.pathname);
  }, [location.pathname]);

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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-gray-900">SEARS KAIROS</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex-shrink-0 flex flex-col overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ background: 'radial-gradient(circle at top left, #0A2647, #001021)', color: '#f1f5f9' }}
      >
        {/* Sears KAIros / Sasha 1099 Branding */}
        <div className="p-6 border-b border-blue-900/40 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/20">
                <Shield className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-wider" style={{ color: '#ffffff' }}>SEARS KAIROS</h1>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#60a5fa' }}>KRIS 1099 PORTAL</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tree */}
        <nav className="flex-grow px-3 py-4 space-y-1.5 select-none">
          {/* Dashboard */}
          <NavLink
            to="/"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-[15px] font-semibold rounded-lg transition-all ${
              isActive && location.search === ''
                ? 'bg-blue-600 shadow-md shadow-blue-600/10'
                : 'hover:bg-white/5'
            }`}
            style={{ color: '#cbd5e1' }}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          {/* My Jobs (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('My Jobs')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg hover:bg-white/5 cursor-pointer`}
              style={{ color: isActiveRoute('/assignments') ? '#ffffff' : '#cbd5e1' }}
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
                      ? 'bg-blue-500/20 font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ color: isActiveRoute('/assignments') && (hasQueryParams('view', 'list') || !location.search.includes('view=')) ? '#ffffff' : '#94a3b8' }}
                >
                  <List className="h-4 w-4" />
                  <span>List View</span>
                </button>
                <button
                  onClick={() => navigate('/assignments?view=calendar')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/assignments') && hasQueryParams('view', 'calendar')
                      ? 'bg-blue-500/20 font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ color: isActiveRoute('/assignments') && hasQueryParams('view', 'calendar') ? '#ffffff' : '#94a3b8' }}
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
                : 'hover:bg-white/5'
            }`}
            style={({ isActive }) => ({ color: isActive ? '#ffffff' : '#cbd5e1' })}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 shrink-0 text-cyan-400" />
              <span>Chat AI (Kris)</span>
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
                ? 'bg-blue-600 shadow-md shadow-blue-600/10'
                : 'hover:bg-white/5'
            }`}
            style={({ isActive }) => ({ color: isActive ? '#ffffff' : '#cbd5e1' })}
          >
            <Search className="h-5 w-5 shrink-0" />
            <span>Available Jobs</span>
          </NavLink>

          {/* Parts & Inventory (Collapsible Group) */}
          <div className="space-y-0.5">
            <div 
              onClick={() => toggleExpand('Parts & Inventory')}
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg hover:bg-white/5 cursor-pointer`}
              style={{ color: isActiveRoute('/parts') ? '#ffffff' : '#cbd5e1' }}
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
                      ? 'bg-blue-500/20 font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ color: isActiveRoute('/parts') && (hasQueryParams('tab', 'active') || !location.search.includes('tab=')) ? '#ffffff' : '#94a3b8' }}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Active Orders</span>
                </button>
                <button
                  onClick={() => navigate('/parts?tab=history')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all ${
                    isActiveRoute('/parts') && hasQueryParams('tab', 'history')
                      ? 'bg-blue-500/20 font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ color: isActiveRoute('/parts') && hasQueryParams('tab', 'history') ? '#ffffff' : '#94a3b8' }}
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
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg hover:bg-white/5 cursor-pointer`}
              style={{ color: isActiveRoute('/earnings') ? '#ffffff' : '#cbd5e1' }}
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
                        ? 'bg-blue-500/20 font-semibold'
                        : 'hover:bg-white/5'
                    }`}
                    style={{ color: isActiveRoute('/earnings') && (hasQueryParams('tab', tab) || (!location.search.includes('tab=') && tab === 'today')) ? '#ffffff' : '#94a3b8' }}
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
              className={`flex items-center justify-between px-3 py-2.5 text-[15px] font-semibold rounded-lg hover:bg-white/5 cursor-pointer`}
              style={{ color: isActiveRoute('/account') ? '#ffffff' : '#cbd5e1' }}
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
                      ? 'bg-blue-500/20 font-semibold'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ color: isActiveRoute('/account') && (hasQueryParams('tab', 'profile') || !location.search.includes('tab=')) ? '#ffffff' : '#94a3b8' }}
                >
                  <Settings className="h-4 w-4" />
                  <span>Profile & Settings</span>
                </button>
                <button
                  onClick={() => navigate('/account?feedback=open')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md text-left transition-all hover:bg-white/5`}
                  style={{ color: '#94a3b8' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Feedback</span>
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
              <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-400'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {/* User Footer */}
        <div className="mt-auto p-4.5 border-t border-blue-900/40" style={{ backgroundColor: 'rgba(2, 6, 23, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center font-bold border border-blue-400/20 shrink-0 text-base shadow-inner" style={{ color: '#ffffff' }}>
              {(displayName || user?.vendorName || user?.username || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate" style={{ color: '#ffffff' }}>{displayName || user?.vendorName || user?.username || 'Technician'}</p>
              </div>
              <span className="text-xs truncate mt-1 block" style={{ color: '#94a3b8' }}>Technician</span>
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
      <main className="flex-grow flex flex-col overflow-hidden bg-gray-50 relative pt-14 lg:pt-0">
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
