import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { ArrowLeft, Loader2, Camera, X, AlertTriangle, Check } from 'lucide-react';

const REASONS = [
  'Customer Not Home / No-Show', 'Customer Requested Reschedule',
  'Customer Delayed or Unavailable', 'No Access to Property',
  'Gate Code / Access Issue', 'Unsafe Conditions', 'Other',
];

const CustomerNotHomePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!photoPreview) { alert('Please take a photo (required)'); return; }

    setIsSubmitting(true);
    try {
      await ApiService.markCustomerNotHome(id!, reason, notes);
      alert('Customer Not Home submitted successfully');
      navigate(`/assignments/${id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-50 text-gray-900 overflow-y-auto p-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" /> Customer Not Home
          </h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              {REASONS.map(r => <option key={r} value={r} className="bg-white text-gray-900">{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Photo (required)</label>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handlePhotoChange} 
              className="hidden" 
            />
            {photoPreview ? (
              <div className="relative inline-block mt-2">
                <img src={photoPreview} alt="Location" className="h-32 rounded-lg object-cover border border-gray-200" />
                <button 
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 border border-dashed border-gray-300 bg-gray-50 rounded-lg text-sm text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Camera className="h-5 w-5" /> Take Photo of Location
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              placeholder="Additional notes..."
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-sm focus:border-blue-500 outline-none resize-none" 
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-red-500/20 shadow-lg shadow-red-600/15"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {isSubmitting ? 'Submitting...' : 'Submit Customer Not Home'}
        </button>
      </div>
    </div>
  );
};

export default CustomerNotHomePage;
