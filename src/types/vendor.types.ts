export interface VendorProfile {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  stats?: { totalJobs: number | string | null; completedJobs: number | string | null; averageRating: number | string | null } | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  techId?: string | null;
  vendorCode?: string | null;
  district?: string | null;
  serviceArea?: string | null;
  eliteBonusPercent?: number | null;
  tier?: string | null;
  isElite?: boolean | null;
  vendorName?: string | null;
  mobile?: string | null;
  countryCode?: string | null;
  performance?: {
    rating?: number;
    firstTimeFixRate?: number;
    recallRate?: number;
    professionalism?: number;
    weeklyEarnings?: number;
  } | null;
}

export interface VendorProfileResponse {
  success?: boolean;
  data?: VendorProfile | null;
}
