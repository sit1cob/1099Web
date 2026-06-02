import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/apiService';
import { DashboardV2Payload, DashboardTodaysJob, DashboardAvailableJob } from '../types/dashboard.types';
import { VendorProfile } from '../types/vendor.types';
import { formatUSDate } from '../utils/date';
import {
  Briefcase, Star, Award, Clock, ArrowRight, RefreshCw, 
  Loader2, Package, Zap, Target, RotateCcw, DollarSign, 
  Sparkles, ShieldAlert, MessageSquare, ChevronRight
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState<DashboardV2Payload | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick mini Sasha chat states
  const [sashaInput, setSashaInput] = useState('');
  const [sashaResponse, setSashaResponse] = useState<string | null>(null);
  const [sashaTyping, setSashaTyping] = useState(false);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString().slice(0, 10);
      const to = today.toISOString().slice(0, 10);
      const [dashRes, vendorRes] = await Promise.all([
        ApiService.getDashboardV2(from, to),
        ApiService.getVendorProfile(),
      ]);
      if (dashRes.success) setDashData(dashRes.data || null);
      if (vendorRes.success) setVendor(vendorRes.data || null);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const d = dashData?.data;
  const metrics = d?.performance_metrics;
  const summary = d?.summary_cards;
  const todaysJobs: DashboardTodaysJob[] = dashData?.todays_job || [];
  const availableJobs: DashboardAvailableJob[] = dashData?.available_jobs || [];
  const techName = d?.technician_details?.technician_name || vendor?.vendorName || user?.vendorName || user?.username || 'Technician';

  // Mini Sasha AI handler
  const handleMiniSashaQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sashaInput.trim()) return;
    setSashaTyping(true);
    setSashaResponse(null);
    const q = sashaInput.toLowerCase();
    
    setTimeout(() => {
      setSashaTyping(false);
      if (q.includes('schedule') || q.includes('job') || q.includes('today')) {
        setSashaResponse(`You have ${todaysJobs.length} active service orders scheduled for today. Your first stop is Joe Matteo (SO-13694840) in Hoffman Estates at 8:00 AM.`);
      } else if (q.includes('part') || q.includes('clutch') || q.includes('oil')) {
        setSashaResponse(`Clutch Oil (Part #13516) is currently out of stock. If you need it for Speed Queen model VA6013, please order it via the job parts catalog and schedule a rescheduled appointment.`);
      } else if (q.includes('earnings') || q.includes('payout') || q.includes('make')) {
        setSashaResponse(`Your estimated earnings for today are $${d?.technician_details?.estimated_earnings_today || 250}. Payouts are transferred every Tuesday.`);
      } else {
        setSashaResponse(`I'm on it! Feel free to ask about your route sequence, appliance model diagnostics, or part stock availability.`);
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 text-gray-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500">Loading technician dashboard...</p>
        </div>
      </div>
    );
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 overflow-y-auto">
      
      {/* Cover atmospheric accent glow */}
      <div className="p-6 md:p-8 max-w-[1450px] w-full mx-auto space-y-6 flex-grow pb-16 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-purple-100/30 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{greeting}, {techName}</h1>
              <span className="flex items-center gap-0.5 px-2 py-0.5 bg-yellow-50 border border-yellow-300 rounded text-[9px] font-extrabold text-yellow-700 tracking-wider">
                ELITE
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <span>{d?.technician_details?.jobs_today_count ?? todaysJobs.length} assignments today</span>
              {d?.technician_details?.estimated_earnings_today && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-600 font-semibold">Est. Earnings: ${d.technician_details.estimated_earnings_today.toFixed(0)}</span>
                </>
              )}
            </p>
          </div>
          <button 
            onClick={loadDashboard} 
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer text-gray-400 hover:text-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Grid layout containing 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columns 1 & 2: Main metrics and Schedule */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Available Jobs Claiming Banner */}
            <div
              onClick={() => navigate('/available-jobs')}
              className="relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 border border-blue-500/30 hover:border-blue-400/40 transition-all shadow-lg group"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent)]" />
              <div className="absolute top-0 right-0 w-52 h-52 bg-white/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
              
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/10">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-tight flex items-center gap-2">
                      <span>{availableJobs.length} Available Jobs</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </h3>
                    <p className="text-white/70 text-xs mt-1">
                      New dispatch service orders available to claim in your area. Grab them now to boost your weekly earnings.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 rounded-lg font-bold text-xs text-white transition-all whitespace-nowrap">
                  <span>View Jobs</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Quick Stats Grid cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                icon={<Award className="h-5 w-5" />}
                iconColor="text-blue-400"
                label="Perf Score"
                value={summary?.score?.value?.toString() || '92'}
                sub={summary?.score?.tier_label || 'ELITE'}
              />
              <SummaryCard
                icon={<Star className="h-5 w-5" />}
                iconColor="text-yellow-400"
                label="Customer Rating"
                value={summary?.rating?.value?.toFixed(2) || '4.85'}
                sub={`${summary?.rating?.review_count || 47} Reviews`}
              />
              <SummaryCard
                icon={<Package className="h-5 w-5" />}
                iconColor="text-purple-400"
                label="Parts on Order"
                value={summary?.parts?.on_order_count?.toString() || '2'}
                sub="In transit"
              />
            </div>

            {/* Today's Schedule */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-blue-600" />
                  <span>Today's Work Schedule ({todaysJobs.length})</span>
                </h3>
                <button 
                  onClick={() => navigate('/assignments?view=list')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Jobs</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {todaysJobs.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 italic">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/assignments?view=list&id=${job.id}`)}
                      className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                          <Zap className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {job.applianceType || 'Service'} — {job.customerName || 'Customer'}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                            SO# {job.soNumber} • {job.customerCity || 'Hoffman Estates'}, {job.customerState || 'IL'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3.5">
                        <span className="text-[10px] text-gray-600 font-bold bg-gray-100 px-2 py-0.5 border border-gray-200 rounded">
                          {job.scheduledDate ? formatUSDate(job.scheduledDate) : 'Today'}
                        </span>
                        <StatusBadge status={job.status || 'assigned'} />
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Sasha mini Chat helper and feedback */}
          <div className="space-y-6">
            
            {/* Sasha Quick Helper Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col h-[340px] justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Sasha Quick Console</h4>
                      <p className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        <span>Active</span>
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/chat')}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Full Chat
                  </button>
                </div>

                {/* Sasha conversation bubbles */}
                <div className="space-y-2 text-xs overflow-y-auto max-h-[190px] pr-1">
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 leading-relaxed">
                    Hello technician! I'm Sasha, your AI route advisor. Ask me anything about your scheduled jobs or part stock checks.
                  </div>
                  
                  {sashaTyping && (
                    <div className="flex items-center gap-1.5 py-1 text-gray-400 font-medium italic">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Sasha is checking stock...</span>
                    </div>
                  )}

                  {sashaResponse && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 leading-relaxed animate-fade-in">
                      {sashaResponse}
                    </div>
                  )}
                </div>
              </div>

              {/* Console Input */}
              <form onSubmit={handleMiniSashaQuery} className="flex gap-1.5 mt-3 shrink-0">
                <input
                  type="text"
                  placeholder="Ask Sasha: check schedule, clutch oil..."
                  value={sashaInput}
                  onChange={(e) => setSashaInput(e.target.value)}
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] text-gray-800 outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Elite Partner Checklist info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span>Technician Tier Target</span>
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Maintain a First Time Fix rate &gt;90% and recall rate &lt;3% to preserve your Elite tier 8% commission bonus next month.
              </p>
              
              {/* Progress visual bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                  <span>Elite Score Progression</span>
                  <span className="text-yellow-600 font-bold">92 / 100</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-yellow-400 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

const SummaryCard = ({ icon, iconColor, label, value, sub }: { icon: React.ReactNode; iconColor: string; label: string; value: string; sub: string }) => (
  <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between hover:border-gray-300 transition-colors relative overflow-hidden shadow-sm">
    <div className={`w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center ${iconColor} mb-2.5`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 mt-0.5">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{sub}</p>
    </div>
  </div>
);

const MetricIndicatorCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) => (
  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
    <div className="flex items-center justify-center text-gray-500 gap-1 mb-1">
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-lg font-bold text-gray-900">{value}</p>
    <p className="text-[9px] text-gray-500 font-medium mt-0.5">{sub}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    arrived: 'bg-orange-50 text-orange-700 border-orange-200',
    in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rescheduled: 'bg-rose-50 text-rose-700 border-rose-200',
    part_order: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const cls = styles[status.toLowerCase().replace(/ /g, '_')] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default DashboardPage;
