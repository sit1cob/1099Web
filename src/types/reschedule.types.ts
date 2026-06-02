export interface RescheduleRequest {
  reason?: string;
  newScheduledDate?: string;
  notes?: string;
  reasonCode?: string;
  requestedArrivalDate?: string;
  source?: string;
}

export interface RescheduleResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export const RESCHEDULE_REASONS = [
  'Customer Not Home / No-Show',
  'Customer Requested New Time',
  'Customer Delayed or Unavailable',
  'Tech Unavailable / Reassigned',
  'Parts Not Available',
  'Scheduling Conflict',
  'Weather / Safety Issue',
  'Site Access Problem',
];

export const TIME_WINDOWS = ['8AM-12PM', '12PM-4PM', '4PM-8PM'];
