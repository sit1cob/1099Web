export interface ServiceOrder {
  id: string;
  soNumber?: string;
  type: string;
  appliance: string;
  address: string;
  fullAddress: string;
  date: string;
  scheduledDate: string;
  timeSlot: string;
  scheduledTimeWindow: string;
  cc: string;
  brand: string;
  status: string;
  statusLabel?: string;
  city?: string;
}

export interface AvailableJobsResponse {
  success: boolean;
  data?: ServiceOrder[];
  message?: string;
}
