import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../api/apiService';
import { RESCHEDULE_REASONS, TIME_WINDOWS } from '../types/reschedule.types';
import { ArrowLeft, Loader2, CalendarClock, Check } from 'lucide-react';

const ReschedulePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reason, setReason] = useState(RESCHEDULE_REASONS[0]);
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date) { alert('Please select a date'); return; }
    if (!timeWindow) { alert('Please select a time window'); return; }

    setIsSubmitting(true);
    try {
      await ApiService.rescheduleAssignment(id!, {
        reason,
        newScheduledDate: date,
        notes,
      });
      alert('Assignment rescheduled successfully');
      navigate(`/assignments/${id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule');
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
            <CalendarClock className="h-6 w-6 text-blue-600" /> Reschedule
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
              {RESCHEDULE_REASONS.map(r => <option key={r} value={r} className="bg-white text-gray-900">{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-lg text-sm focus:border-blue-500 outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time Window</label>
            <div className="flex gap-2">
              {TIME_WINDOWS.map(tw => (
                <button 
                  key={tw} 
                  onClick={() => setTimeWindow(tw)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    timeWindow === tw 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/10' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tw}
                </button>
              ))}
            </div>
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
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-blue-500/20 shadow-lg shadow-blue-600/15"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {isSubmitting ? 'Rescheduling...' : 'Reschedule'}
        </button>
      </div>
    </div>
  );
};

export default ReschedulePage;
