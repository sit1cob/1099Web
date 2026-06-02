import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { 
  Loader2, DollarSign, TrendingUp, Briefcase, Receipt, 
  ArrowUpRight, Wallet, Percent, Calendar, Award, CheckCircle2 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid 
} from 'recharts';

type Tab = 'today' | 'week' | 'month' | 'ytd';

interface InvoiceRecord {
  date: string;
  amountPaid: number;
  amountOwed: number;
  projectedAmount: number;
  bonus: number;
  jobsCount: number;
  label?: string; // used for chart display
}

const EarningsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse active tab from query parameters (?tab=today|week|month|ytd)
  const queryTab = new URLSearchParams(location.search).get('tab');
  const activeTab = (queryTab === 'today' || queryTab === 'week' || queryTab === 'month' || queryTab === 'ytd' 
    ? queryTab 
    : 'today') as Tab;

  const [earningsData, setEarningsData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Invoice Summary from API
  useEffect(() => {
    const loadEarnings = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const to = today.toISOString().slice(0, 10);
        // Start from January 1st of the current year to ensure YTD trend is loaded
        const from = `${today.getFullYear()}-01-01`;
        const res = await ApiService.getVendorInvoiceSummary(from, to);
        if (res?.success && res.data) {
          setEarningsData(res.data);
        } else {
          setEarningsData(null);
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
        setEarningsData(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadEarnings();
  }, []);

  // Tab switch navigator
  const handleTabSwitch = (tab: Tab) => {
    navigate(`/earnings?tab=${tab}`);
  };

  const eliteBonus = earningsData?.elite_bonus;
  const isEliteActive = eliteBonus && eliteBonus.tier?.toLowerCase() === 'elite';
  const eliteRate = eliteBonus ? `+${Number(eliteBonus.bonus_percent).toFixed(1)}%` : '+8.0%';

  // Extract metrics based on the active tab
  const activePeriodMetrics = useMemo(() => {
    if (!earningsData) {
      return { jobs: 0, grossPayout: 0, projected: 0, bonus: 0, paid: 0, owed: 0 };
    }

    if (activeTab === 'today') {
      const todayData = earningsData.today || {};
      const paid = todayData.earned ?? 0;
      const owed = todayData.remaining ?? 0;
      const bonus = todayData.bonus_amount ?? 0;
      const grossPayout = todayData.total_earnings ?? (paid + owed + bonus);
      return {
        jobs: (todayData.jobs_scheduled ?? 0) + (todayData.jobs_in_progress ?? 0),
        grossPayout,
        projected: paid + owed,
        bonus,
        paid,
        owed
      };
    }

    if (activeTab === 'week') {
      const weekData = earningsData.week || {};
      const paid = weekData.paid ?? 0;
      const owed = weekData.owed ?? 0;
      const grossPayout = weekData.total ?? 0;
      const bonus = Math.max(0, grossPayout - (paid + owed));
      return {
        jobs: weekData.week_history?.[0]?.jobs ?? 0,
        grossPayout,
        projected: weekData.projected_total ?? (paid + owed),
        bonus,
        paid,
        owed
      };
    }

    if (activeTab === 'month') {
      const monthData = earningsData.month || {};
      const paid = monthData.paid ?? 0;
      const owed = monthData.owed ?? 0;
      const grossPayout = monthData.total ?? 0;
      const bonus = Math.max(0, grossPayout - (paid + owed));
      return {
        jobs: monthData.month_history?.[0]?.jobs ?? 0,
        grossPayout,
        projected: monthData.projected_total ?? (paid + owed),
        bonus,
        paid,
        owed
      };
    }

    // YTD
    const ytdData = earningsData.ytd || {};
    const paid = ytdData.paid ?? 0;
    const owed = ytdData.owed ?? 0;
    const grossPayout = ytdData.total ?? 0;
    const bonus = ytdData.bonus_earned ?? 0;
    return {
      jobs: ytdData.jobs_completed ?? 0,
      grossPayout,
      projected: grossPayout - bonus,
      bonus,
      paid,
      owed
    };
  }, [earningsData, activeTab]);

  // Generate enriched chart data depending on selected tab
  const enrichedData = useMemo((): InvoiceRecord[] => {
    if (!earningsData) return [];

    if (activeTab === 'today') {
      const todayData = earningsData.today || {};
      if ((todayData.earned ?? 0) === 0 && (todayData.remaining ?? 0) === 0) {
        return [];
      }
      return [{
        date: 'Today',
        amountPaid: todayData.earned ?? 0,
        amountOwed: todayData.remaining ?? 0,
        projectedAmount: (todayData.earned ?? 0) + (todayData.remaining ?? 0),
        bonus: todayData.bonus_amount ?? 0,
        jobsCount: (todayData.jobs_scheduled ?? 0) + (todayData.jobs_in_progress ?? 0),
        label: 'Today'
      }];
    }

    if (activeTab === 'week') {
      const weekData = earningsData.week || {};
      return (weekData.daily_breakdown ?? []).map((d: any) => ({
        date: d.day || d.date || '',
        amountPaid: d.paid ?? 0,
        amountOwed: d.owed ?? 0,
        projectedAmount: (d.paid ?? 0) + (d.owed ?? 0) + (d.projected ?? 0),
        bonus: (d.paid + d.owed) * 0.08,
        jobsCount: d.paid > 0 || d.owed > 0 || d.projected > 0 ? 1 : 0,
        label: d.day ? `May ${d.day}` : d.date || ''
      }));
    }

    if (activeTab === 'month') {
      const monthData = earningsData.month || {};
      return (monthData.weekly_breakdown ?? []).map((w: any) => ({
        date: w.label || w.week_label || '',
        amountPaid: w.paid ?? 0,
        amountOwed: w.owed ?? 0,
        projectedAmount: (w.paid ?? 0) + (w.owed ?? 0) + (w.projected ?? 0),
        bonus: (w.paid + w.owed) * 0.08,
        jobsCount: w.jobs || 0,
        label: w.label || w.week_label || ''
      }));
    }

    // YTD - Monthly breakdown for the current year
    const ytdData = earningsData.ytd || {};
    return (ytdData.monthly_trend ?? []).map((m: any) => ({
      date: m.label || m.month_label || '',
      amountPaid: m.paid ?? 0,
      amountOwed: m.owed ?? 0,
      projectedAmount: (m.paid ?? 0) + (m.owed ?? 0) + (m.projected ?? 0),
      bonus: (m.paid + m.owed) * 0.08,
      jobsCount: m.jobs || 0,
      label: m.label || m.month_label || ''
    }));
  }, [earningsData, activeTab]);

  // Generate ledger list entries depending on active tab
  const ledgerEntries = useMemo(() => {
    if (!earningsData) return [];

    if (activeTab === 'today') {
      const todayData = earningsData.today || {};
      if ((todayData.earned ?? 0) === 0 && (todayData.remaining ?? 0) === 0) {
        return [];
      }
      return [{
        label: 'Today\'s Earnings',
        date: 'Today',
        jobsCount: (todayData.jobs_scheduled ?? 0) + (todayData.jobs_in_progress ?? 0),
        amountPaid: todayData.earned ?? 0,
        amountOwed: todayData.remaining ?? 0,
        bonus: todayData.bonus_amount ?? 0,
        total: todayData.total_earnings ?? ((todayData.earned ?? 0) + (todayData.remaining ?? 0) + (todayData.bonus_amount ?? 0))
      }];
    }

    if (activeTab === 'week') {
      const weekData = earningsData.week || {};
      return (weekData.week_history ?? []).map((w: any) => ({
        label: w.label || 'Weekly Invoice',
        date: w.label || 'This Week',
        jobsCount: w.jobs ?? 0,
        amountPaid: w.amount ?? 0,
        amountOwed: 0,
        bonus: w.amount * 0.08,
        total: w.amount * 1.08,
        status: w.status
      }));
    }

    if (activeTab === 'month') {
      const monthData = earningsData.month || {};
      return (monthData.month_history ?? []).map((m: any) => ({
        label: m.month || 'Monthly Invoice',
        date: m.month || 'This Month',
        jobsCount: m.jobs ?? 0,
        amountPaid: m.amount ?? 0,
        amountOwed: 0,
        bonus: m.amount * 0.08,
        total: m.amount * 1.08,
        status: m.status
      }));
    }

    // YTD
    return (earningsData.recent_payments ?? []).map((p: any) => ({
      label: p.label || 'Recent Payment',
      date: p.subtitle || '',
      jobsCount: p.jobs ?? 0,
      amountPaid: p.amount ?? 0,
      amountOwed: 0,
      bonus: p.amount * 0.08,
      total: p.amount * 1.08,
      status: p.status
    }));
  }, [earningsData, activeTab]);

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 min-h-screen overflow-y-auto">
      {/* Cover atmospheric header */}
      <div className="relative h-44 shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      <div className="px-6 md:px-12 max-w-6xl w-full mx-auto -mt-20 relative z-10 flex-grow pb-16">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Earnings Ledger</h1>
              {isEliteActive && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-yellow-50 border border-yellow-300 rounded text-[10px] font-extrabold text-yellow-700 tracking-wider uppercase">
                  Elite Bonus Active
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1.5">
              Review completed job payouts, pending invoice approvals, and Elite Tier 8% commission bonuses.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="px-3 border-r border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Jobs Count</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{activePeriodMetrics.jobs}</p>
            </div>
            <div className="px-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Elite Rate</p>
              <p className="text-lg font-bold text-yellow-600 mt-0.5">{eliteRate}</p>
            </div>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex border-b border-gray-200 mt-6 overflow-x-auto shrink-0 scrollbar-none">
          {(['today', 'week', 'month', 'ytd'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-gray-900 bg-blue-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>{tab === 'ytd' ? 'YTD' : tab === 'week' ? 'This Week' : tab === 'month' ? 'This Month' : 'Today'}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl mt-8 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 mt-4">Compiling ledger statistics...</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Summary Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Total Gross Hero Card */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-500/20 shadow-xl flex flex-col justify-between min-h-[190px]">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-200 animate-pulse" />
                    <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Gross Est Payout (With Bonus)</span>
                  </div>
                  {isEliteActive && (
                    <span className="px-2 py-0.5 bg-yellow-400/20 border border-yellow-300/40 rounded text-[9px] font-extrabold text-yellow-200 tracking-wider">
                      ELITE TIER BONUS APPLIED
                    </span>
                  )}
                </div>

                <div className="relative z-10 mt-4">
                  <p className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    ${activePeriodMetrics.grossPayout.toFixed(2)}
                  </p>
                  <p className="text-blue-200 text-[11px] mt-1">
                    Invoice summary for period: <span className="text-white font-semibold uppercase">{activeTab}</span>
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-white/20 mt-4 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-blue-200 block">Job Payouts</span>
                    <span className="font-bold text-white">${activePeriodMetrics.projected.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 block">8% Elite Bonus</span>
                    <span className="font-bold text-yellow-300">${activePeriodMetrics.bonus.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-200 block">Payout Date</span>
                    <span className="font-bold text-emerald-300">Next Tuesday</span>
                  </div>
                </div>
              </div>

              {/* Status breakdown Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between min-h-[190px] shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="h-4.5 w-4.5 text-blue-600" />
                  <span>Invoice Settlements</span>
                </h3>

                <div className="space-y-3.5 my-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-gray-700">Paid / Settled</span>
                    </div>
                    <span className="font-bold text-gray-900">${activePeriodMetrics.paid.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-gray-700">Owed / Pending Approval</span>
                    </div>
                    <span className="font-bold text-amber-600">${activePeriodMetrics.owed.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-500 leading-relaxed">
                  Sears dispatches pay out weekly. Invoices approved by Sunday midnight are cleared for Tuesday deposit.
                </div>
              </div>
            </div>

            {/* Recharts Visual Graph block */}
            {enrichedData.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm">
                <TrendingUp className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-xs text-gray-500 font-semibold">No payout analytics available</p>
                <p className="text-[10px] text-gray-400 mt-1 max-w-sm leading-relaxed">
                  There is no invoice activity to display for this range. Complete jobs to track your earnings trend over time.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
                      <span>Ledger Payout Analytics</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Visual representation of Paid vs. Owed invoices</p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 select-none">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      <span>Owed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#EAB308]" />
                      <span>Elite Bonus</span>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={enrichedData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#64748B" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#64748B" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `$${value}`} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          borderColor: '#E5E7EB', 
                          borderRadius: '8px', 
                          color: '#111827',
                          fontSize: '11px'
                        }}
                        itemStyle={{ color: '#374151' }}
                        formatter={(value: any, name: any) => {
                          const label = name === 'amountPaid' ? 'Paid' : name === 'amountOwed' ? 'Owed' : 'Elite Bonus';
                          return [`$${Number(value).toFixed(2)}`, label];
                        }}
                        labelFormatter={(label) => `Period: ${label}`}
                      />
                      <Bar dataKey="amountPaid" stackId="a" fill="#10B981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="amountOwed" stackId="a" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="bonus" fill="#EAB308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List breakdown block */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-blue-600" />
                <span>Invoice Ledger Entries</span>
              </h3>

              <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1">
                {ledgerEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-xs text-gray-500 font-semibold">No ledger entries found</p>
                    <p className="text-[10px] text-gray-400 mt-1">There are no completed payouts or invoices listed for this period.</p>
                  </div>
                ) : (
                  ledgerEntries.map((entry: any, idx: number) => {
                    const status = entry.status || 'Paid';
                    const isActive = status.toLowerCase() === 'active';
                    
                    return (
                      <div 
                        key={idx} 
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 group-hover:border-gray-300 transition-colors">
                            <Receipt className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 flex items-center gap-2">
                              {entry.label}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                isActive ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              }`}>
                                {status}
                              </span>
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {entry.date} • {entry.jobsCount || 0} jobs completed
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs text-right">
                          <div className="hidden sm:block">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">Payments</span>
                            <span className="font-semibold text-gray-700">
                              Paid: ${entry.amountPaid.toFixed(2)}
                              {entry.amountOwed > 0 && <span className="text-amber-600 ml-1.5">• Owed: ${entry.amountOwed.toFixed(2)}</span>}
                            </span>
                          </div>
                          
                          <div className="hidden sm:block">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">8% Bonus</span>
                            <span className="font-semibold text-yellow-600">+${entry.bonus.toFixed(2)}</span>
                          </div>

                          <div>
                            <span className="text-gray-400 block sm:hidden text-[9px] uppercase font-bold tracking-wider">Total Est Gross</span>
                            <span className="font-extrabold text-gray-900 text-sm">
                              ${entry.total.toFixed(2)}
                            </span>
                          </div>

                          <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all hidden sm:block shrink-0" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sasha Payout recommendation block */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
                <Award className="h-5.5 w-5.5 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-xs">Sasha Earnings Tip</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {isEliteActive 
                    ? `"Your active Elite Tier status delivers a direct ${eliteBonus?.bonus_percent || 8}% commission boost on top of standard contract pay. Keep your customer feedback positive and check available jobs every morning to lock in higher earnings rates."`
                    : `"Boost your earnings by qualifying for the Elite Tier! Maintain a service score of 90 or above to activate an additional 8% commission bonus on all your completed jobs."`
                  }
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsPage;
