import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const JobCompleteSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const completionType = (location.state as any)?.completionType || 'Completed';

  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Job {completionType}!</h1>
        <p className="text-gray-500 mb-8">The assignment has been successfully updated.</p>
        <button
          onClick={() => navigate('/assignments')}
          className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors flex items-center gap-2 mx-auto cursor-pointer"
        >
          Back to Assignments <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default JobCompleteSuccessPage;
