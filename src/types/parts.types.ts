export interface AddPartToAssignmentRequest {
  brand?: string;
  applianceType?: string;
  partNumber?: string;
  serialNumber?: string;
  assignmentId?: number;
  notes?: string;
  partType?: string;
  quantity?: number;
  photoPaths?: string[];
  partNo?: string;
  sourceType?: string;
  draft?: boolean;
  price?: number;
  itemDescription?: string;
}

export type PartType = 'ordered' | 'installed' | 'returned' | 'local';

export interface PartResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface AddedPartResponse {
  success: boolean;
  data: AddedPart[];
  message?: string;
}

export interface AddedPart {
  id: string;
  orderId?: string;
  partId?: number;
  partNumber?: string;
  partType?: string;
  quantity?: number;
  brand?: string;
  applianceType?: string;
  serialNumber?: string;
  notes?: string;
  photoPaths?: string[];
  createdAt?: string;
  status?: string;
}

export interface DeletePartResponse {
  success: boolean;
  message?: string;
}

export const PART_TYPE_COLORS: Record<string, string> = {
  ordered: '#FF9500',
  order_part: '#FF9500',
  installed: '#4CAF50',
  returned: '#F44336',
  i_have_part_in_hand: '#2196F3',
};

export const PART_TYPES = [
  'Compressor', 'Motor', 'Thermostat', 'Control Board',
  'Heating Element', 'Pump', 'Belt', 'Filter', 'Seal/Gasket', 'Other',
];

export interface ModelDetailsResponse {
  numFound: string;
  model: ModelInfo;
  items: ModelPartItem[];
  modelSchematics: ModelSchematic[];
}

export interface ModelInfo {
  modelId: string;
  modelNo: string;
  modelDescription: string;
  brand: string;
  productTypeName: string;
}

export interface ModelPartItem {
  itemId: string;
  partNo: string;
  productGroupId: string;
  productGroupName: string;
  itemDescription: string;
  itemAvailabilityStatus: string;
  itemSellingPrice: string;
  itemImageUrl?: string;
}

export interface ModelSchematic {
  schematicId: string;
  schematicName: string;
  schematicURL: string;
}
