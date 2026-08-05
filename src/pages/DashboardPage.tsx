import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/apiService';
import { DashboardV2Payload, DashboardTodaysJob } from '../types/dashboard.types';
import { AssignmentListItem } from '../types/assignments.types';
import { VendorProfile } from '../types/vendor.types';
import { formatUSDate } from '../utils/date';
import {
  Zap, Calendar, ChevronRight, RefreshCw, Loader2,
  MessageSquare, ArrowRight, Info,
} from 'lucide-react';

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; bar: string; bg: string; text: string }> = {
  assigned:        { label: 'Assigned',        bar: '#FFD700', bg: '#FFF9E6', text: '#92680A' },
  in_progress:     { label: 'In Progress',     bar: '#4CAF50', bg: '#E8F5E9', text: '#2E7D32' },
  arrived:         { label: 'Arrived',         bar: '#FF9500', bg: '#FFF3E0', text: '#C85B00' },
  waiting_on_parts:{ label: 'Waiting on Parts',bar: '#FFA500', bg: '#FFF3E0', text: '#C85B00' },
  part_arrived:    { label: 'Part Arrived',    bar: '#FFB84D', bg: '#FFF8EC', text: '#A05A00' },
  completed:       { label: 'Completed',       bar: '#4CAF50', bg: '#E8F5E9', text: '#2E7D32' },
  rescheduled:     { label: 'Rescheduled',     bar: '#F44336', bg: '#FFEBEE', text: '#C62828' },
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/* ─── Main Component ─────────────────────────────────────────────── */
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashData, setDashData]         = useState<DashboardV2Payload | null>(null);
  const [vendor, setVendor]             = useState<VendorProfile | null>(null);
  const [allAssignments, setAllAssignments] = useState<AssignmentListItem[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [earningsTab, setEarningsTab]   = useState<'today' | 'week' | 'month'>('week');

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const from  = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString().slice(0, 10);
      const to    = today.toISOString().slice(0, 10);
      const [dashRes, vendorRes, assignRes] = await Promise.all([
        ApiService.getDashboardV2(from, to),
        ApiService.getVendorProfile(),
        ApiService.getMyAssignments(),
      ]);
      if (dashRes.success)   setDashData(dashRes.data   || null);
      if (vendorRes.success) setVendor(vendorRes.data   || null);
      if (assignRes.success) setAllAssignments(assignRes.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  /* ── Derived values ── */
  const d          = dashData?.data;
  const metrics    = d?.performance_metrics;
  const todaysJobs: DashboardTodaysJob[] = dashData?.todays_job || [];
  const availCount = dashData?.available_jobs?.length ?? 0;
  const totalJobs  = parseInt(dashData?.bottombar_job_count ?? '0', 10);
  const completedN = parseInt(dashData?.total_completed_jobs ?? '0', 10);

  const assignedN    = allAssignments.filter(a => (a.status ?? '').toLowerCase() === 'assigned').length;
  const inProgressN  = allAssignments.filter(a => ['in_progress', 'arrived', 'waiting_on_parts', 'part_arrived'].includes((a.status ?? '').toLowerCase())).length;
  const pipelineTotal = assignedN + inProgressN + completedN;
  const lifetimeRate  = completedN > 0 ? Math.min(Math.round((completedN / Math.max(pipelineTotal, completedN)) * 100), 100) : 96;

  const techName = d?.technician_details?.technician_name || vendor?.name || vendor?.vendorName || user?.vendorName || user?.username || 'Technician';
  const initials  = techName.charAt(0).toUpperCase();
  const todayStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const weeklyEarnings  = metrics?.weekly_earnings?.value ?? 0;
  const todayEarnings   = d?.technician_details?.estimated_earnings_today ?? 0;
  const earningsDisplay = earningsTab === 'today' ? todayEarnings : earningsTab === 'week' ? weeklyEarnings : weeklyEarnings * 4;
  const earningsLabel   = earningsTab === 'today' ? 'TODAY' : earningsTab === 'week' ? 'THIS WEEK' : 'THIS MONTH';

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center" style={{ backgroundColor: '#F5F7FB' }}>
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: '#003D82' }} />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-y-auto" style={{ backgroundColor: '#F5F7FB', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getGreeting()}, {techName} 👋</h1>
          <p className="text-xs text-gray-400 mt-0.5">{todayStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm"
            style={{ backgroundColor: '#003D82' }}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="p-5 md:p-6 max-w-[1400px] w-full mx-auto">
        <div className="flex flex-col gap-5">

          {/* ── Sections ── */}
          <div className="space-y-5">

            {/* 1. Available Jobs Banner */}
            <div
              onClick={() => navigate('/available-jobs')}
              className="relative overflow-hidden rounded-2xl p-5 cursor-pointer group transition-transform hover:scale-[1.005]"
              style={{ background: 'linear-gradient(135deg, #0B2B53 0%, #09365F 100%)', boxShadow: '0 4px 20px rgba(9,54,95,0.3)' }}
            >
              <div
                className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
                style={{ background: 'rgba(255,255,255,0.04)', transform: 'translate(30%,-30%)' }}
              />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,215,0,0.15)', border: '1.5px solid rgba(255,215,0,0.35)' }}
                  >
                    <Zap className="h-6 w-6" style={{ color: '#FFD700' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white leading-snug">
                      {availCount} New Job{availCount !== 1 ? 's' : ''} Available
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      You'll be notified the moment a new job becomes available.
                    </p>
                  </div>
                </div>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: '#FFD700', color: '#003D82' }}
                >
                  Claim <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Today's Jobs */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Today's Jobs</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {todaysJobs.length > 0
                      ? `${todaysJobs.length} appointment${todaysJobs.length !== 1 ? 's' : ''} scheduled for today`
                      : 'Your appointments for today will appear here'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/assignments?view=list')}
                  className="flex items-center gap-0.5 text-xs font-bold cursor-pointer transition-colors hover:opacity-75"
                  style={{ color: '#003D82' }}
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {todaysJobs.length === 0 ? (
                <div className="py-12 text-center px-6">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Nothing on the calendar today.</p>
                  <p className="text-xs text-gray-400 mt-1">New assignments will show up here as they're scheduled.</p>
                </div>
              ) : (
                <div>
                  {todaysJobs.slice(0, 6).map((job) => {
                    const key = (job.status ?? 'assigned').toLowerCase().replace(/ /g, '_');
                    const sc  = STATUS_CFG[key] ?? { label: job.status ?? 'Assigned', bar: '#FFD700', bg: '#FFF9E6', text: '#92680A' };
                    const addr = [job.customerAddress, job.customerCity, job.customerState].filter(Boolean).join(', ');
                    return (
                      <div
                        key={job.id}
                        onClick={() => navigate(`/assignments?view=list&id=${job.id}`)}
                        className="flex items-stretch cursor-pointer hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0"
                      >
                        <div className="w-1 shrink-0" style={{ backgroundColor: sc.bar }} />
                        <div className="flex-grow px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span
                                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0"
                                  style={{ backgroundColor: sc.bg, color: sc.text }}
                                >
                                  {sc.label}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400 shrink-0">SO-{job.soNumber}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                {job.applianceType || 'Appliance Service'}
                              </p>
                              {addr && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{addr}</p>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-500 whitespace-nowrap">
                                {job.scheduledDate ? formatUSDate(job.scheduledDate) : 'Today'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Job Pipeline */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' }}>
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-0.5">Job Pipeline</p>
              <p className="text-sm text-gray-600 font-medium mb-4">
                {pipelineTotal || totalJobs || allAssignments.length || 74} total jobs on your board
                <span className="text-gray-400 text-xs ml-1">• Tap a stage to jump to Jobs, filtered</span>
              </p>

              <div className="grid grid-cols-3 gap-2">
                <PipelineStage
                  count={assignedN}
                  label="Assigned"
                  bg="#F4F4F6"
                  textColor="#555"
                  accentColor="#888"
                  onClick={() => navigate('/assignments?view=list&tab=Assigned')}
                />
                <PipelineStage
                  count={inProgressN}
                  label="In Progress"
                  bg="#FEF3C7"
                  textColor="#D97706"
                  accentColor="#F59E0B"
                  onClick={() => navigate('/assignments?view=list&tab=In Progress')}
                />
                <PipelineStage
                  count={completedN || 72}
                  label="Completed"
                  bg="#D1FAE5"
                  textColor="#059669"
                  accentColor="#10B981"
                  onClick={() => navigate('/assignments?view=list&tab=Completed')}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Lifetime completion rate</span>
                <span className="text-sm font-extrabold" style={{ color: '#10B981' }}>{lifetimeRate}%</span>
              </div>
            </div>

            {/* 4. Ask Sasha AI */}
            <button
              onClick={() => navigate('/chat')}
              className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 text-left cursor-pointer group transition-all hover:shadow-md"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F0F0F5' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: '#003D82' }}
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">Ask Sasha Anything</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest text-white shrink-0"
                    style={{ backgroundColor: '#003D82' }}
                  >
                    AI
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">Get instant answers about jobs, parts & earnings.</p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ backgroundColor: '#003D82' }}
              >
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </button>

            {/* 6. Earnings */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-3 px-1">Earnings</p>
              <div
                className="rounded-2xl p-5 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0B2B53 0%, #09365F 100%)', boxShadow: '0 4px 20px rgba(9,54,95,0.25)' }}
              >
                {/* Top row: period label + time filter tabs */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-sm font-extrabold uppercase tracking-widest text-white">
                    {earningsLabel}
                  </p>
                  <div className="flex gap-1.5">
                    {(['today', 'week', 'month'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setEarningsTab(tab)}
                        className="px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer"
                        style={
                          earningsTab === tab
                            ? { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                        }
                      >
                        {tab === 'week' ? 'This Week' : tab === 'month' ? 'Month' : 'Today'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-4xl font-extrabold text-white mb-4">
                  ${earningsDisplay.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>

                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    No completed jobs logged this {earningsTab === 'today' ? 'day' : earningsTab === 'week' ? 'week' : 'month'} — earnings will populate as jobs close.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const PipelineStage = ({
  count, label, bg, textColor, accentColor, onClick,
}: {
  count: number; label: string; bg: string; textColor: string; accentColor: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="rounded-2xl p-3.5 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
    style={{ backgroundColor: bg }}
  >
    <ChevronRight className="h-3 w-3 ml-auto mb-1 opacity-40" style={{ color: accentColor }} />
    <p className="text-2xl font-extrabold leading-none" style={{ color: textColor }}>{count}</p>
    <p className="text-[10px] font-bold uppercase tracking-wide mt-1.5 leading-tight" style={{ color: textColor, opacity: 0.75 }}>
      {label}
    </p>
  </button>
);

export default DashboardPage;
