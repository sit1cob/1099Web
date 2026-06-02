export interface AssignmentsListResponse {
  success: boolean;
  data?: AssignmentListItem[];
  message?: string;
}

export interface AssignmentListItem {
  id: string;
  soNumber?: string;
  status?: string;
  address?: string;
  scheduledDate?: string;
  scheduledArrival?: string;
  assignedAt?: string;
  job?: JobInfo;
}

export interface JobInfo {
  id?: string;
  soNumber?: string;
  customerName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  applianceType?: string;
  applianceCode?: string;
  scheduledDate?: string;
  distance?: string | number;
  priority?: boolean;
}

export interface AssignmentFilterState {
  location: string | null;
  appliance: string | null;
  fromDate: string | null;
  toDate: string | null;
  selectedStatuses: string[];
}

export const STATUS_COLORS: Record<string, string> = {
  assigned: '#0066CC',
  arrived: '#FF9500',
  in_progress: '#9333EA',
  completed: '#22C55E',
  rescheduled: '#FF3B30',
  'part order': '#666666',
};
