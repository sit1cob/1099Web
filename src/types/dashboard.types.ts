export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  message?: string;
}

export interface DashboardV2Response {
  success: boolean;
  data?: DashboardV2Payload;
  message?: string;
}

export interface DashboardV2Payload {
  status?: string;
  bottombar_job_count?: string;
  bottombar_parts_count?: string;
  total_completed_jobs?: string;
  technician_email?: string;
  tecnician_bonus_active?: string;
  todays_job?: DashboardTodaysJob[];
  available_jobs?: DashboardAvailableJob[];
  data?: DashboardV2Data;
}

export interface DashboardTodaysJob {
  id: number;
  status?: string;
  soNumber?: string;
  customerName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  customerPhone?: string;
  customerAltPhone?: string | null;
  scheduledDate?: string;
  applianceType?: string;
  applianceCode?: string;
  manufacturerBrand?: string;
  serviceDescription?: string | null;
  applianceModel?: string | null;
  applianceSerial?: string | null;
  vrsCode?: string | null;
}

export interface DashboardAvailableJobGroupInfo {
  hasGroup: boolean;
  totalJobs?: number;
  customerNumber?: string;
  customerName?: string;
  jobDate?: string;
}

export interface DashboardAvailableJob {
  id: number;
  soNumber?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  scheduledDate?: string;
  applianceType?: string;
  applianceCode?: string;
  manufacturerBrand?: string;
  serviceDescription?: string | null;
  status?: string;
  groupInfo?: DashboardAvailableJobGroupInfo;
}

export interface DashboardV2Data {
  technician_details?: {
    technician_name?: string;
    jobs_today_count?: number;
    estimated_earnings_today?: number;
    currency?: string;
  };
  tier?: {
    label?: string;
    score?: number;
    icon?: string;
    color?: string;
  };
  performance_metrics?: {
    period?: string;
    customer_rating?: { value?: number; change?: number; change_label?: string; trend?: string };
    first_time_fix_rate?: { value?: number; unit?: string; change?: number; change_label?: string; trend?: string };
    recall_rate?: { value?: number; unit?: string; change?: number; change_label?: string; trend?: string; lower_is_better?: boolean };
    weekly_earnings?: { value?: number; currency?: string; change?: number; change_label?: string; trend?: string };
  };
  summary_cards?: {
    score?: { value?: number; tier_label?: string };
    rating?: { value?: number; review_count?: number };
    parts?: { on_order_count?: number; label?: string };
  };
  recent_feedback?: unknown[];
}

export interface DashboardData {
  availableJobs: number;
  myJobs: number;
  completed: number;
  assignedCount?: number;
  statistics?: Statistics;
}

export interface Statistics {
  availableJobsCount?: number;
  myJobsCount?: number;
  completedCount?: number;
  assignedCount?: number;
  inProgressCount: number;
}

export interface MetricCard {
  id: string;
  title: string;
  count: number;
  color: string;
  icon: string;
  filter?: string;
}
