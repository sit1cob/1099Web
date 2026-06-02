import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { JobDetailsDto } from '../types/jobDetails.types';
import { formatUSDate } from '../utils/date';
import { ArrowLeft, MapPin, Calendar, Wrench, Phone, User, Loader2, CheckCircle, FileText } from 'lucide-react';

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ApiService.getJobDetails(id!);
        if (res.success) setJob(res.data || null);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    load();
  }, [id]);

  const handleClaim = async () => {
    if (!id) return;
    setIsClaiming(true);
    try {
      const res = await ApiService.claimJob(id, { notes: '', action: 'accept' });
      if (res.success) {
        alert('Job claimed successfully!');
        navigate('/assignments');
      } else {
        alert(res.message || 'Failed to claim job');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to claim job');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading assignment details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 text-gray-500 min-h-screen">
        Job not found
      </div>
    );
  }

  const address = [job.customerAddress, job.customerCity, job.customerState, job.customerZip].filter(Boolean).join(', ');

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 overflow-y-auto p-6">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{job.applianceType || 'Available Job'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">SO# {job.soNumber}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" /> Customer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Name</p>
                <p className="mt-0.5 text-gray-900 font-semibold">{job.customerName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Phone</p>
                <p className="mt-0.5 text-gray-900 font-semibold">{job.customerPhone || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Address</p>
                <p className="mt-0.5 text-gray-900 font-semibold">{address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" /> Job Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date</p>
                <p className="mt-0.5 text-gray-900 font-semibold">{formatUSDate(job.scheduledDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wrench className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Brand</p>
                <p className="mt-0.5 text-gray-900 font-semibold">{job.manufacturerBrand || job.applianceBrand || 'N/A'}</p>
              </div>
            </div>
            {job.serviceDescription && (
              <div className="flex items-start gap-3 md:col-span-2">
                <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Description</p>
                  <p className="mt-0.5 text-gray-900 leading-relaxed">{job.serviceDescription}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-blue-500/20 shadow-lg shadow-blue-600/15"
        >
          {isClaiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          {isClaiming ? 'Claiming...' : 'Claim This Job'}
        </button>
      </div>
    </div>
  );
};

export default JobDetailPage;
