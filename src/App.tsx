import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AssignmentDetailPage from './pages/AssignmentDetailPage';
import AvailableJobsPage from './pages/AvailableJobsPage';
import JobDetailPage from './pages/JobDetailPage';
import JobCompletePage from './pages/JobCompletePage';
import JobCompleteSuccessPage from './pages/JobCompleteSuccessPage';
import ReschedulePage from './pages/ReschedulePage';
import CustomerNotHomePage from './pages/CustomerNotHomePage';
import PartsPage from './pages/PartsPage';
import EarningsPage from './pages/EarningsPage';
import AccountPage from './pages/AccountPage';

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/:id" element={<AssignmentDetailPage />} />
          <Route path="/assignments/:id/complete" element={<JobCompletePage />} />
          <Route path="/assignments/:id/complete-success" element={<JobCompleteSuccessPage />} />
          <Route path="/assignments/:id/reschedule" element={<ReschedulePage />} />
          <Route path="/assignments/:id/customer-not-home" element={<CustomerNotHomePage />} />
          <Route path="/available-jobs" element={<AvailableJobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/chat" element={<div />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
