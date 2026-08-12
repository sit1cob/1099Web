import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiService from '../api/apiService';
import { APP_CONFIG } from '../utils/config';
import { trackFeedbackSubmitted, trackTechnicianProfile } from '../utils/clarityTracking';
import { 
  User, Settings, Award, Star, MapPin, Mail, Phone, 
  ShieldCheck, Edit2, Check, Percent, Clock, ThumbsUp, 
  AlertCircle, ChevronRight, ArrowRight, Loader2, MessageCircle, X 
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
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  
  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackConfig, setFeedbackConfig] = useState<any>(null);
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, any>>({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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
    if (params.get('feedback') === 'open') {
      openFeedbackModal();
    }
  }, [window.location.search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileRes = await ApiService.getVendorProfile();
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
        trackTechnicianProfile(profileRes.data);
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
      const outerPayload: any = feedRes.success ? feedRes.data : null;
      const innerData: any = outerPayload?.data || outerPayload;
      if (innerData?.recent_feedback) {
        setReviews(innerData.recent_feedback);
      }
      // Extract technician_email from outer payload (same as mobile app)
      const techEmail = typeof outerPayload?.technician_email === 'string' && outerPayload.technician_email.trim().length > 0
        ? outerPayload.technician_email.trim()
        : null;
      if (techEmail) {
        setDashboardEmail(techEmail);
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

  const openFeedbackModal = async () => {
    setShowFeedbackModal(true);
    setFeedbackAnswers({});
    if (!feedbackConfig) {
      setFeedbackLoading(true);
      try {
        const res = await ApiService.getFeedbackConfig();
        if (res.success) {
          const config = res.data?.questions ? res.data : res.data?.data || res.data;
          setFeedbackConfig(config);
        }
      } catch (e) {
        console.error('Failed to load feedback config', e);
      } finally {
        setFeedbackLoading(false);
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackConfig) return;
    // Validate required
    for (const q of feedbackConfig.questions) {
      if (q.required && (!feedbackAnswers[q.id] || feedbackAnswers[q.id] === '')) {
        alert(`Please answer: ${q.question}`);
        return;
      }
    }
    setFeedbackSubmitting(true);
    try {
      const answers = Object.keys(feedbackAnswers).map(key => ({ questionId: key, answer: feedbackAnswers[key] }));
      const res = await ApiService.submitFeedback({
        metadata: {
          appVersion: APP_CONFIG.VERSION,
          deviceModel: navigator.userAgent.slice(0, 50),
          osVersion: navigator.platform,
          timestamp: new Date().toISOString(),
        },
        answers,
      });
      if (res.success) {
        trackFeedbackSubmitted();
        alert('Thank you for your feedback!');
        setShowFeedbackModal(false);
      } else {
        alert(res.message || 'Failed to submit feedback');
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting feedback');
    } finally {
      setFeedbackSubmitting(false);
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
      <div className="px-4 sm:px-6 md:px-12 max-w-6xl w-full mx-auto -mt-20 relative z-10 flex-grow pb-16">
        
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
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Active 1099 Service Contractor (ID: VND-{profile?.id || '29482'})</span>
              </p>
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
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <div className="mt-1.5 relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={dashboardEmail || profile?.email || (user as any)?.email || ''}
                          readOnly
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
                      <span>Firm Address</span>
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

            </div>
          )}



        </div>
      </div>

      {/* Dispatch Address Edit Modal Overlay */}
      {isEditingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-gray-700">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Firm Address</h3>
            
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-center relative shrink-0">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="absolute right-4 top-4 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-extrabold text-white">Sasha 1099</h3>
              <p className="text-blue-200 text-xs mt-1">Sears Home Services Partner</p>
            </div>

            {/* Questions */}
            <div className="flex-grow overflow-y-auto p-6 space-y-5">
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : !feedbackConfig?.questions?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <p className="font-bold text-gray-600 mb-1">Unable to load feedback questions</p>
                  <p className="text-xs">Please try again later.</p>
                </div>
              ) : feedbackConfig?.questions?.map((q: any) => (
                <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
                  <p className="text-sm font-bold text-gray-900">
                    {q.question} {q.required && <span className="text-red-500">*</span>}
                  </p>
                  
                  {q.type === 'rating' ? (
                    <div className="flex items-center justify-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackAnswers(prev => ({ ...prev, [q.id]: star }))}
                          className="cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              star <= (feedbackAnswers[q.id] || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      placeholder="Type your feedback here..."
                      value={feedbackAnswers[q.id] || ''}
                      onChange={(e) => setFeedbackAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      rows={4}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 resize-none placeholder:text-gray-400"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-gray-200 p-4 flex items-center gap-3 shrink-0 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                disabled={feedbackSubmitting}
                className="flex-1 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
                className="flex-1 py-3 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {feedbackSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Submit</span>
              </button>
            </div>
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
