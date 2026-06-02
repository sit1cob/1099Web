import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { ServiceOrder } from '../types/serviceOrder.types';
import { formatUSDate } from '../utils/date';
import { Search, Loader2, MapPin, Calendar, Wrench, ArrowRight, Briefcase, RefreshCw } from 'lucide-react';

const AvailableJobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getAvailableJobs();
      if (res.success) setJobs(res.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(j =>
      (j.soNumber || '').toLowerCase().includes(q) ||
      (j.appliance || '').toLowerCase().includes(q) ||
      (j.city || '').toLowerCase().includes(q) ||
      (j.brand || '').toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 overflow-y-auto p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6 flex-grow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-gray-900">Available Jobs</h1>
            <p className="text-[15px] text-gray-500 mt-1">{jobs.length} jobs available to claim</p>
          </div>
          <button 
            onClick={load} 
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SO#, appliance, city, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white placeholder:text-gray-400"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading available jobs...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="h-20 w-20 rounded-3xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-5">
              <Briefcase className="h-9 w-9 text-gray-400" />
            </div>
            <p className="text-gray-700 font-bold text-lg">No available jobs right now</p>
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              New jobs are posted regularly. Pull to refresh or check back in a few minutes.
            </p>
            <button 
              onClick={load} 
              className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-blue-600/15"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(job => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden shadow-sm"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                  <p className="font-bold text-gray-900 text-[16px] mb-1">{job.appliance || 'Service'}</p>
                  <p className="text-[13px] text-gray-500 font-mono mb-4">SO# {job.soNumber}</p>
                  <div className="space-y-2.5 text-[13px] text-gray-600">
                    <div className="flex items-center gap-2.5">
                      <Wrench className="h-3.5 w-3.5 text-gray-400" />
                      <span>{job.brand || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{job.city || job.address || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {formatUSDate(job.scheduledDate)}
                        {job.scheduledTimeWindow && (
                          <span className="text-blue-600 font-semibold ml-1">{job.scheduledTimeWindow}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableJobsPage;
