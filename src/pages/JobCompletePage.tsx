import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { ArrowLeft, Loader2, Camera, X, Check } from 'lucide-react';

const FALLBACK_COMPLETION_TYPES = [
  'Completed', 'Rescheduled – With Part', 'Rescheduled – Without Part',
  'Customer Not Home', 'Cancel at Door', 'Estimate Declined',
];

const REPAIR_TYPES = ['Service Attempt', 'Standard Repair', 'Major Repair', 'Sealed System Repair'];
const REPAIR_CODES = ['No Fault Found', 'Mechanical Failure', 'Electrical/Control', 'Sealed System', 'Part Replacement', 'User Education', 'Other'];

const CNH_REASONS = ['No Answer at Door', 'Customer Not Home', 'Customer Cancelled Day Of', 'Locked Out / No Access', 'Wrong Address Provided'];
const CANCEL_REASONS = ['Customer Declined Service', 'Unsafe Working Conditions', 'Appliance Not Accessible', 'Customer Not Present and No Access', 'Other Safety Concern'];
const ESTIMATE_DECLINE_REASONS = ['Cost Too High', 'Customer Willing to Repair Themselves', 'Customer Wants Replacement Instead', 'Warranty/Authorization Issues', 'Other'];
const RESCHEDULE_REASONS = ['Parts Not Available', 'Customer Requested New Time', 'Customer Not Home / No-Show', 'Customer Delayed or Unavailable', 'Tech Unavailable / Reassigned', 'Scheduling Conflict', 'Weather / Safety Issue', 'Site Access Problem'];

const JobCompletePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [completionTypes, setCompletionTypes] = useState(FALLBACK_COMPLETION_TYPES);
  const [completionType, setCompletionType] = useState('Completed');
  const [serviceAttemptType, setServiceAttemptType] = useState('');
  const [repairCode, setRepairCode] = useState('');
  const [notes, setNotes] = useState('');
  const [customerAcknowledge, setCustomerAcknowledge] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [rescheduleReason, setRescheduleReason] = useState('');
  const [nextAppointment, setNextAppointment] = useState('');
  const [cnhReason, setCnhReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [estimateDeclineReason, setEstimateDeclineReason] = useState('');

  const normalize = (v: string) => (v || '').trim().toLowerCase().replace(/\u2013|\u2014/g, '-').replace(/\s+/g, ' ');
  const ct = normalize(completionType);
  const isRescheduled = ct.includes('rescheduled');
  const isCNH = ct === 'customer not home';
  const isCancelAtDoor = ct === 'cancel at door';
  const isEstimateDeclined = ct === 'estimate declined';
  const isCompleted = ct === 'completed';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ApiService.getServiceUpdateAttemptDescriptions();
        const data = res?.data || res?.data?.data;
        if (data?.completionType?.length) setCompletionTypes(data.completionType);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!serviceAttemptType) { alert('Please select a repair type'); return; }
    if (!completionType) { alert('Please select a completion type'); return; }

    setIsProcessing(true);
    try {
      const payload: any = {
        status: isCompleted ? 'completed' : isRescheduled ? 'rescheduled' : isCNH ? 'customer_not_home' : isCancelAtDoor ? 'cancelled' : isEstimateDeclined ? 'estimate_declined' : 'completed',
        serviceAttemptType,
        completionNotes: notes,
        completionType,
        repairCode,
        customerAcknowledged: customerAcknowledge,
      };

      if (isRescheduled) payload.rescheduleReason = rescheduleReason;
      if (isRescheduled && nextAppointment) payload.nextAppointment = nextAppointment;
      if (isCNH) payload.cnhReason = cnhReason;
      if (isCancelAtDoor) payload.cancelReason = cancelReason;
      if (isEstimateDeclined) payload.estimateDeclineReason = estimateDeclineReason;

      await ApiService.updateAssignmentStatusV3(id!, payload);

      if (selectedPhoto) {
        try { await ApiService.uploadCompletionPhoto(id!, selectedPhoto); } catch (e) { console.error('Photo upload failed:', e); }
      }

      navigate(`/assignments/${id}/complete-success`, { state: { completionType } });
    } catch (err: any) {
      alert(err.message || 'Failed to complete job');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Complete Job</h1>
      </div>

      {/* Repair Type */}
      <Section title="Repair Type">
        <div className="grid grid-cols-2 gap-2">
          {REPAIR_TYPES.map(t => (
            <SelectButton key={t} label={t} selected={serviceAttemptType === t} onClick={() => setServiceAttemptType(t)} />
          ))}
        </div>
      </Section>

      {/* Completion Type */}
      <Section title="Completion Type">
        <select
          value={completionType}
          onChange={(e) => setCompletionType(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none"
        >
          {completionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Section>

      {/* Repair Code */}
      <Section title="Repair Code">
        <select value={repairCode} onChange={(e) => setRepairCode(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none">
          <option value="">Select repair code</option>
          {REPAIR_CODES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Section>

      {/* Conditional Fields */}
      {isRescheduled && (
        <Section title="Reschedule Details">
          <select value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none mb-3">
            <option value="">Select reason</option>
            {RESCHEDULE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input type="datetime-local" value={nextAppointment} onChange={(e) => setNextAppointment(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" placeholder="Next Appointment" />
        </Section>
      )}

      {isCNH && (
        <Section title="Customer Not Home Reason">
          <select value={cnhReason} onChange={(e) => setCnhReason(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none">
            <option value="">Select reason</option>
            {CNH_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Section>
      )}

      {isCancelAtDoor && (
        <Section title="Cancel Reason">
          <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none">
            <option value="">Select reason</option>
            {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Section>
      )}

      {isEstimateDeclined && (
        <Section title="Estimate Decline Reason">
          <select value={estimateDeclineReason} onChange={(e) => setEstimateDeclineReason(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg bg-white text-sm focus:ring-2 focus:ring-accent outline-none">
            <option value="">Select reason</option>
            {ESTIMATE_DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add completion notes..."
          className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none resize-none" />
      </Section>

      {/* Photo */}
      <Section title="Completion Photo">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        {photoPreview ? (
          <div className="relative inline-block">
            <img src={photoPreview} alt="Photo" className="h-32 rounded-lg object-cover" />
            <button onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 cursor-pointer"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-accent hover:text-accent transition-colors cursor-pointer">
            <Camera className="h-5 w-5" /> Take or Upload Photo
          </button>
        )}
      </Section>

      {/* Customer Acknowledgement */}
      {(isCompleted || isEstimateDeclined) && (
        <label className="flex items-center gap-3 bg-white rounded-xl border border-border p-4 cursor-pointer">
          <input type="checkbox" checked={customerAcknowledge} onChange={(e) => setCustomerAcknowledge(e.target.checked)}
            className="h-5 w-5 rounded text-accent" />
          <span className="text-sm text-gray-700">Customer acknowledges the service</span>
        </label>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={isProcessing}
        className="w-full py-3.5 bg-success text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        {isProcessing ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-border p-5">
    <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
    {children}
  </div>
);

const SelectButton = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
  <button onClick={onClick}
    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
      selected ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border hover:bg-gray-50'
    }`}>
    {label}
  </button>
);

export default JobCompletePage;
