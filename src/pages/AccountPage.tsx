import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/apiService';
import { 
  User, Settings, Award, Star, MapPin, Mail, Phone, 
  ShieldCheck, Edit2, Check, Percent, Clock, ThumbsUp, 
  AlertCircle, ChevronRight, ArrowRight, Loader2 
} from 'lucide-react';

interface AddressPayload {
  addressLine1: string;
  city: string;
  state: string;
  countryCode: string;
  zipCode: string;
}

const AccountPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'performance' | 'reviews'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile edit states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressPayload>({
    addressLine1: '',
    city: '',
    state: '',
    countryCode: 'US',
    zipCode: ''
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Parse URL queries on mount/location change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'performance' || tabParam === 'reviews' || tabParam === 'profile') {
      setActiveTab(tabParam as any);
    }
  }, [window.location.search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileRes = await ApiService.getVendorProfile();
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
        setAddressForm({
          addressLine1: profileRes.data.addressLine1 || '',
          city: profileRes.data.city || '',
          state: profileRes.data.state || '',
          countryCode: profileRes.data.countryCode || 'US',
          zipCode: profileRes.data.zipCode || ''
        });
      }
      
      const dbReviews = ApiService.getUser() ? ApiService.getUser().reviews || [] : [];
      // Combine with mock reviews from database
      const reviewsList = ApiService.getUser() ? ApiService.getUser().reviews : null;
      // In our mock service we have reviews returned from dashboard feed or mockDb
      const feedRes = await ApiService.getDashboardV2('2026-05-01', '2026-05-31');
      if (feedRes.success && feedRes.data?.data?.recent_feedback) {
        setReviews(feedRes.data.data.recent_feedback);
      }
    } catch (e) {
      console.error('Failed to load profile details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const res = await ApiService.updateVendorAddress(addressForm);
      if (res.success) {
        setIsEditingAddress(false);
        await loadData();
      } else {
        alert(res.message || 'Failed to update address');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating address');
    } finally {
      setSavingAddress(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 text-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="text-gray-500 text-sm">Loading technician profile...</p>
        </div>
      </div>
    );
  }

  const performance = profile?.performance || {
    rating: 4.85,
    firstTimeFixRate: 92,
    recallRate: 2.1,
    professionalism: 98,
    weeklyEarnings: 1250
  };

  const initials = (profile?.vendorName || user?.vendorName || 'Sasha').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 min-h-screen overflow-y-auto">
      {/* Upper Cover Gradient Panel */}
      <div className="relative h-44 shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </div>

      {/* Main Layout Container */}
      <div className="px-6 md:px-12 max-w-6xl w-full mx-auto -mt-20 relative z-10 flex-grow pb-16">
        
        {/* Profile Card & Info */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-5">
            {/* Initials Avatar with glowing ring */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-extrabold text-white border-2 border-white shadow-xl shadow-blue-500/10 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                  {profile?.vendorName || 'Sasha Tech Solutions'}
                </h1>
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-[10px] font-extrabold text-yellow-400 tracking-wider uppercase">
                  ELITE PARTNER
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Active 1099 Service Contractor (ID: VND-{profile?.id || '29482'})</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-white border border-gray-200 shadow-sm rounded-xl p-3">
            <div className="px-3 border-r border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Rating</p>
              <p className="text-lg font-bold text-yellow-400 mt-0.5 flex items-center justify-center gap-1">
                {performance.rating} <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
              </p>
            </div>
            <div className="px-3 border-r border-gray-200 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">FTF Rate</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{performance.firstTimeFixRate}%</p>
            </div>
            <div className="px-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Level</p>
              <p className="text-lg font-extrabold text-blue-400 mt-0.5">Lvl 4</p>
            </div>
          </div>
        </div>

        {/* Inner Route Navigation Tabs */}
        <div className="flex border-b border-gray-200 mt-6 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-500 text-gray-900 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/20'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Profile & Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-blue-500 text-gray-900 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/20'
            }`}
          >
            <Award className="h-4 w-4 text-yellow-400" />
            <span>Performance Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-blue-500 text-gray-900 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/20'
            }`}
          >
            <Star className="h-4 w-4 text-cyan-400" />
            <span>Customer Reviews</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-8">
          
          {/* PROFILE & SETTINGS TAB */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Account Credentials */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span>Contractor Details</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</label>
                      <input
                        type="text"
                        readOnly
                        value={profile?.vendorName || 'Sasha Tech Solutions'}
                        className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Managed via contractor registration portal.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">IRS 1099 Tier</label>
                      <div className="mt-1.5 w-full bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700 font-semibold flex items-center gap-2 select-none">
                        <Award className="h-4 w-4 text-yellow-400 fill-yellow-400/20" />
                        <span>Elite Status (8% payout bonus active)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <div className="mt-1.5 relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          defaultValue={profile?.email || 'sasha.tech@searskairos.ai'}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile Number</label>
                      <div className="mt-1.5 relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          defaultValue={profile?.mobile || '555-019-2834'}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Address Details */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span>Dispatch Service Address</span>
                    </h3>
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Address</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-gray-900">{profile?.addressLine1 || '3333 Beverly Rd'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {profile?.city || 'Hoffman Estates'}, {profile?.state || 'IL'} {profile?.zipCode || '60192'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        This location is utilized by Sasha AI Route Intelligence to order assignments and estimate driving times.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side column: Legal & Terms */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4">Verification & Credentials</h4>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Background Check</p>
                        <p className="text-xs text-gray-500">Passed - Expires Dec 2026</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">General Liability Insurance</p>
                        <p className="text-xs text-gray-500">Active policy ($2,000,000 limit)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">EPA 608 Certification</p>
                        <p className="text-xs text-gray-500">Universal Type - Approved</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-gray-200 text-[11px] text-gray-400 leading-relaxed">
                    Need to renew or upload credentials? Contact the Sears Field Operations compliance center at <span className="text-blue-400">compliance@searskairos.ai</span>.
                  </div>
                </div>

                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-2">Technician Tier System</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sears Sasha 1099 assigns technicians tiers based on performance score, customer feedback, and first-time fix rate:
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs">
                      <span className="font-semibold text-yellow-400">Elite Tier (90+)</span>
                      <span className="text-gray-500 font-medium">+8% payout boost</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-transparent text-xs border border-transparent">
                      <span className="font-semibold text-gray-700">Pro Tier (80-89)</span>
                      <span className="text-gray-400 font-medium">+3% payout boost</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-transparent text-xs border border-transparent">
                      <span className="font-semibold text-gray-500">Standard Tier (60-79)</span>
                      <span className="text-gray-400 font-medium">Standard rates</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PERFORMANCE DASHBOARD TAB */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Radial Header Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Circle Indicator for the Elite Score */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Overall Performance</h4>
                  
                  {/* Circle SVG */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-gray-200"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Colored progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-yellow-400 transition-all duration-1000"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * performance.value || 92) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Inner score label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-gray-900">{performance.value || 92}</span>
                      <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">ELITE TIER</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4 max-w-[200px] leading-relaxed">
                    Your score is recalculating every Sunday. Maintain &gt;90 to stay Elite.
                  </p>
                </div>

                {/* Score details grid columns */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* First Time Fix */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">First Time Fix Rate</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{performance.firstTimeFixRate}%</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                        <span className="font-semibold">🟢 +2.5%</span>
                        <span className="text-gray-400">vs last month</span>
                      </div>
                    </div>
                  </div>

                  {/* Recall Rate */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Recall Rate (30D)</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{performance.recallRate}%</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                        <span className="font-semibold">🟢 -0.5%</span>
                        <span className="text-gray-400">vs last month (lower is better)</span>
                      </div>
                    </div>
                  </div>

                  {/* Professionalism */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <ThumbsUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Professionalism Score</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{performance.professionalism}%</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                        <span className="font-semibold text-gray-500">98% positive feedback</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Estimated Earnings */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Avg Weekly Payout</p>
                      <p className="text-2xl font-extrabold text-gray-900 mt-0.5">${performance.weeklyEarnings}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                        <span className="font-semibold">🟢 +$150</span>
                        <span className="text-gray-400">weekly average</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sasha AI Insight Panel */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-400/20 shadow-lg shadow-blue-500/10">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Sasha Route Intelligence Recommendation</h4>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed max-w-xl">
                      "Your first-time fix rate is outstanding at 92%. However, drive-time delays are the main driver for rescheduling. To push your score past 95, claim available jobs closer to Hoffman Estates (within a 15-mile radius)."
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/chat?query=how%20to%20improve%20my%20performance%20score'}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-sm font-semibold rounded-lg text-white whitespace-nowrap transition-colors cursor-pointer self-start md:self-auto"
                >
                  <span>Consult Sasha</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>
          )}

          {/* CUSTOMER REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Ratings Summary Column */}
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4">Rolling 90-Day Rating</h4>
                  
                  {/* Huge rating and stars */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-gray-900">4.85</span>
                    <span className="text-sm text-gray-500 font-semibold">/ 5.0</span>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-yellow-400">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <Star className="h-5 w-5 fill-yellow-400/20 text-yellow-500/20" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-medium">Based on 47 verified client responses</p>
                  
                  {/* Rating distribution progress bars */}
                  <div className="mt-6 space-y-2">
                    <RatingDistributionRow stars={5} percentage={85} />
                    <RatingDistributionRow stars={4} percentage={10} />
                    <RatingDistributionRow stars={3} percentage={3} />
                    <RatingDistributionRow stars={2} percentage={2} />
                    <RatingDistributionRow stars={1} percentage={0} />
                  </div>
                </div>

                {/* Performance Badge info */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-3">Feedback Guidelines</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sears customers receive an SMS feedback survey containing 3 questions after a job completion:
                  </p>
                  <ul className="text-xs text-gray-700 space-y-2 mt-4 list-disc pl-4">
                    <li>Did the technician arrive inside the promised appointment slot?</li>
                    <li>Did the technician explain the diagnostic result and repairs performed?</li>
                    <li>Would you recommend the technician to family and neighbors?</li>
                  </ul>
                </div>
              </div>

              {/* Feed Grid reviews */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-md font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Star className="h-4.5 w-4.5 text-yellow-400" />
                  <span>Recent Client Feedback Feed</span>
                </h4>

                {reviews.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500 text-sm shadow-sm">
                    No recent feedback comments found.
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{rev.customerName || 'Verified Customer'}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{rev.appliance || 'Service Job'} • {new Date(rev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        
                        {/* Review star rating */}
                        <div className="flex items-center gap-1 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3.5 w-3.5 ${
                                i < (rev.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed italic bg-gray-50 p-3 rounded-lg border border-gray-200">
                        "{rev.comment || 'Excellent service'}"
                      </p>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Dispatch Address Edit Modal Overlay */}
      {isEditingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-gray-700">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Service Address</h3>
            
            <form onSubmit={handleUpdateAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Street Address</label>
                <input
                  type="text"
                  required
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={addressForm.zipCode}
                    onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                    className="mt-1.5 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    readOnly
                    value="US"
                    className="mt-1.5 w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingAddress && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const RatingDistributionRow = ({ stars, percentage }: { stars: number; percentage: number }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-12 text-gray-500 font-semibold text-right">{stars} Star</span>
    <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="h-full bg-yellow-400 rounded-full" 
        style={{ width: `${percentage}%` }}
      />
    </div>
    <span className="w-8 text-gray-500 font-bold text-right">{percentage}%</span>
  </div>
);

export default AccountPage;
