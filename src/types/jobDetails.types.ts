export interface JobDetailsResponse {
  success: boolean;
  data?: JobDetailsDto;
  message?: string;
}

export interface JobDetailsDto {
  id: string;
  soNumber?: string;
  assignmentId?: string;
  status?: string;
  priority?: string;
  customerName?: string;
  customerLastName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  customerPhone?: string;
  applianceType?: string;
  applianceCode?: string;
  applianceBrand?: string;
  manufacturerBrand?: string;
  serviceDescription?: string;
  scheduledDate?: string;
  scheduledTimeWindow?: string;
  productInfoUpdate?: ProductInfoUpdate;
  parts?: Part[];
  arrived?: boolean;
}

export interface ProductInfoUpdate {
  brand?: string;
  issue?: string;
  modelNumber?: string;
  serialNumber?: string;
}

export interface Part {
  id?: string;
  partNumber?: string;
  appliance?: string;
  brand?: string;
  quantity?: number;
  imageUrl?: string;
}

export interface ClaimRequest {
  notes: string;
  action: 'accept' | 'decline';
}

export interface ClaimResponse {
  success: boolean;
  message?: string;
  data?: any;
}
