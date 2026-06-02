import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { formatUSDate } from '../utils/date';
import {
  ArrowLeft, Phone, MapPin, Calendar, Wrench, Clock, User,
  CheckCircle, Navigation, PlayCircle, Loader2, AlertTriangle,
  CalendarClock, FileText,
} from 'lucide-react';

const AssignmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const load = async () => {
    try {
      const res = await ApiService.getAssignmentDetails(id!);
      if (res.success) setDetails(res.data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await ApiService.updateAssignmentStatus(id, newStatus);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (!details) return <div className="text-center py-20 text-gray-400">Assignment not found</div>;

  const job = details.job || {};
  const status = (details.status || 'assigned').toLowerCase();
  const customerAddress = [job.customerAddress, job.customerCity, job.customerState, job.customerZip].filter(Boolean).join(', ');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{job.applianceType || 'Service Assignment'}</h1>
          <p className="text-sm text-gray-500">SO# {details.soNumber || job.soNumber}</p>
        </div>
        <StatusBadge status={details.status || 'assigned'} />
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-accent" /> Customer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<User className="h-4 w-4" />} label="Name" value={`${job.customerName || ''} ${job.customerLastName || ''}`.trim() || 'N/A'} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={job.customerPhone || 'N/A'} isLink={!!job.customerPhone} href={`tel:${job.customerPhone}`} />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={customerAddress || 'N/A'} className="md:col-span-2" />
        </div>
      </div>

      {/* Job Info */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Wrench className="h-5 w-5 text-accent" /> Job Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Scheduled" value={formatUSDate(job.scheduledDate) || 'N/A'} />
          <InfoRow icon={<Clock className="h-4 w-4" />} label="Time Window" value={job.scheduledTimeWindow || 'N/A'} />
          <InfoRow icon={<Wrench className="h-4 w-4" />} label="Appliance" value={job.applianceType || 'N/A'} />
          <InfoRow icon={<FileText className="h-4 w-4" />} label="Brand" value={job.manufacturerBrand || job.applianceBrand || 'N/A'} />
          {job.serviceDescription && (
            <div className="md:col-span-2">
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Description" value={job.serviceDescription} />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {status === 'assigned' && (
            <ActionButton icon={<Navigation className="h-4 w-4" />} label="Mark Arrived" color="bg-warning" onClick={() => handleStatusUpdate('arrived')} disabled={isUpdating} />
          )}
          {status === 'arrived' && (
            <ActionButton icon={<PlayCircle className="h-4 w-4" />} label="Start Job" color="bg-purple" onClick={() => handleStatusUpdate('in_progress')} disabled={isUpdating} />
          )}
          {(status === 'in_progress' || status === 'arrived') && (
            <>
              <ActionButton icon={<CheckCircle className="h-4 w-4" />} label="Complete Job" color="bg-success" onClick={() => navigate(`/assignments/${id}/complete`)} />
              <ActionButton icon={<CalendarClock className="h-4 w-4" />} label="Reschedule" color="bg-accent" onClick={() => navigate(`/assignments/${id}/reschedule`)} />
              <ActionButton icon={<AlertTriangle className="h-4 w-4" />} label="Customer Not Home" color="bg-danger" onClick={() => navigate(`/assignments/${id}/customer-not-home`)} />
            </>
          )}
          {status === 'completed' && (
            <p className="text-success font-medium flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Job Completed</p>
          )}
        </div>
        {isUpdating && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Updating...</div>}
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value, isLink, href, className }: { icon: React.ReactNode; label: string; value: string; isLink?: boolean; href?: string; className?: string }) => (
  <div className={`flex items-start gap-3 ${className || ''}`}>
    <span className="text-gray-400 mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {isLink ? <a href={href} className="text-accent hover:underline">{value}</a> : <p className="text-gray-900">{value}</p>}
    </div>
  </div>
);

const ActionButton = ({ icon, label, color, onClick, disabled }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer`}
  >
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-700', arrived: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
    rescheduled: 'bg-red-100 text-red-700',
  };
  const cls = colors[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
  return <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>{status.replace(/_/g, ' ')}</span>;
};

export default AssignmentDetailPage;
