import axios, { AxiosInstance } from 'axios';
import { LoginRequest, LoginResponse } from '../types/auth.types';
import { DashboardV2Response } from '../types/dashboard.types';
import { AvailableJobsResponse } from '../types/serviceOrder.types';
import { JobDetailsResponse, ClaimRequest, ClaimResponse } from '../types/jobDetails.types';
import { AssignmentsListResponse } from '../types/assignments.types';
import { AddPartToAssignmentRequest, PartResponse, AddedPartResponse, DeletePartResponse } from '../types/parts.types';
import { RescheduleRequest, RescheduleResponse } from '../types/reschedule.types';
import { VendorProfileResponse } from '../types/vendor.types';
import { API_CONFIG, V2_API_CONFIG, APP_CONFIG } from '../utils/config';
import { trackApiError } from '../utils/clarityTracking';
import { ga4ApiError } from '../utils/ga4DataLayer';

const TOKEN_ERROR_PATTERNS = [
  'invalid token', 'expired token', 'token expired', 'jwt expired',
  'unauthorized', 'authentication failed', 'session expired',
  'access denied', 'no token provided', 'forbidden',
];

const isTokenError = (data: any): boolean => {
  if (!data) return false;
  const message = (data.message || data.error || data.msg || '').toLowerCase();
  return TOKEN_ERROR_PATTERNS.some(pattern => message.includes(pattern));
};

export const isTokenErrorMessage = (message?: string | null): boolean => {
  if (!message) return false;
  const m = message.toLowerCase();
  return TOKEN_ERROR_PATTERNS.some(pattern => m.includes(pattern));
};

let logoutCallback: (() => void) | null = null;

export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

const forceLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  logoutCallback?.();
};


// Set global defaults so every axios call (including direct ones) sends platform & version
axios.defaults.headers.common['x-client-platform'] = APP_CONFIG.PLATFORM;
axios.defaults.headers.common['x-client-version'] = APP_CONFIG.VERSION;

class ApiService {
  private api: AxiosInstance;
  private v2Api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    this.v2Api = axios.create({
      baseURL: V2_API_CONFIG.BASE_URL,
      timeout: V2_API_CONFIG.TIMEOUT,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    this.setupInterceptors(this.api);
    this.setupInterceptors(this.v2Api);
  }

  private setupInterceptors(client: AxiosInstance): void {
    client.interceptors.request.use(async (config) => {
      config.headers['x-client-platform'] = APP_CONFIG.PLATFORM;
      config.headers['x-client-version'] = APP_CONFIG.VERSION;
      const isLoginEndpoint = config.url?.includes('/api/auth/login');
      if (!isLoginEndpoint) {
        const rawToken = localStorage.getItem('accessToken');
        const token = rawToken?.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '') || null;
        if (token) {
          config.headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
        }
      }
      return config;
    });

    client.interceptors.response.use(
      (response) => {
        if (isTokenError(response.data)) {
          forceLogout();
        }
        return response;
      },
      (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const method = error?.config?.method || 'GET';
        const isLoginEndpoint = url.includes('/api/auth/login');

        // Track every API error in Clarity + GA4
        trackApiError({
          method,
          url,
          status,
          statusText: error?.response?.statusText,
          errorMessage: error?.message,
          errorCode: error?.code,
          responseData: error?.response?.data,
        });
        const endpoint = (url || '').replace(/https?:\/\/[^/]+/, '').split('?')[0];
        ga4ApiError(method, endpoint, status, error?.message);

        if ((status === 401 || status === 403 || isTokenError(error?.response?.data)) && !isLoginEndpoint) {
          forceLogout();
        }
        return Promise.reject(error);
      }
    );
  }

  // ── Auth ──
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.api.post<LoginResponse>('/api/auth/login', request);
      console.log('[LOGIN] Raw API response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.error('Login failed:', error?.response?.status, error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Login failed. Please check your credentials.',
        accessToken: '',
        refreshToken: '',
        user: null,
      } as any;
    }
  }

  saveAuthData(response: LoginResponse): void {
    const accessToken = response.data?.accessToken || response.accessToken;
    const refreshToken = response.data?.refreshToken || response.refreshToken;
    const user = response.data?.user || response.user;
    console.log('[saveAuthData] accessToken:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NONE');
    console.log('[saveAuthData] user:', user?.username || user?.vendorName || 'NONE');
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (user) {
      // Merge top-level response.data fields into user so address/phone/etc. are persisted
      const fullUser = { ...(response.data || {}), ...user };
      delete fullUser.accessToken;
      delete fullUser.refreshToken;
      localStorage.setItem('user', JSON.stringify(fullUser));
    }
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('savedUsername');
    localStorage.removeItem('savedPassword');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken') || null;
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // ── Vendor ──
  async getVendorProfile(): Promise<VendorProfileResponse> {
    try {
      const response = await this.api.get<VendorProfileResponse>('/api/vendors/me');
      const raw = response.data?.data || response.data;
      console.log('[getVendorProfile] Raw API response:', JSON.stringify(raw));
      // Map real API field names to what the UI expects
      const storedUser = this.getUser();
      const mapped: any = {
        ...raw,
        name: (raw as any)?.vendorName || (raw as any)?.name || storedUser?.vendorName || null,
        vendorName: (raw as any)?.vendorName || (raw as any)?.name || storedUser?.vendorName || null,
        mobile: (raw as any)?.mobile || (raw as any)?.phone || (raw as any)?.contactNumber || null,
        email: (raw as any)?.email || (raw as any)?.emailAddress || (raw as any)?.contactEmail || storedUser?.email || null,
        countryCode: (raw as any)?.countryCode || 'US',
      };
      return { success: true, data: mapped };
    } catch (error: any) {
      console.error('getVendorProfile failed:', error?.response?.status, error?.message);
      return { success: false, data: null } as any;
    }
  }

  // ── Feedback ──
  async getFeedbackConfig(): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.get('https://1099backend.searskairos.ai/api/feedback/config', {
        headers: {
          Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      console.error('getFeedbackConfig failed:', error?.response?.status, error?.message);
      return { success: false, data: null };
    }
  }

  async submitFeedback(data: { metadata: { appVersion: string; deviceModel: string; osVersion: string; timestamp: string }; answers: { questionId: string; answer: any }[] }): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.post('https://1099backend.searskairos.ai/api/feedback/submit', data, {
        headers: {
          Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('submitFeedback failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to submit feedback' };
    }
  }

  async updateVendorAddress(payload: { addressLine1: string; city: string; state: string; countryCode: string; zipCode: string }): Promise<any> {
    try {
      const res = await this.api.patch('/api/vendors/me/address', payload);
      return res.data;
    } catch (error: any) {
      console.error('updateVendorAddress failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update address' };
    }
  }

  // ── Dashboard ──
  async getDashboardV2(from: string, to: string): Promise<DashboardV2Response> {
    try {
      const response = await this.v2Api.get<DashboardV2Response>('/api/vendors/me/dashboard', { params: { from, to } });
      return response.data;
    } catch (error: any) {
      console.error('getDashboardV2 failed:', error?.response?.status, error?.message);
      return { success: false, data: null } as any;
    }
  }

  // ── Jobs ──
  async getAvailableJobs(): Promise<AvailableJobsResponse> {
    try {
      const response = await this.v2Api.get<any>('/api/jobs/available');
      const raw = response.data;
      // Map API fields to ServiceOrder interface
      if (raw.success && Array.isArray(raw.data)) {
        raw.data = raw.data.map((j: any) => ({
          ...j,
          appliance: j.appliance || j.applianceType || 'Service',
          applianceCode: j.applianceCode || '',
          brand: j.brand || j.manufacturerBrand || '',
          city: j.city || j.customerCity || '',
          address: j.address || j.customerAddress || '',
        }));
      }
      return raw;
    } catch (error: any) {
      console.error('getAvailableJobs failed:', error?.response?.status, error?.message);
      return { success: false, data: [] } as any;
    }
  }

  async getJobDetails(jobId: string): Promise<JobDetailsResponse> {
    try {
      const response = await this.api.get<JobDetailsResponse>(`/api/jobs/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error('getJobDetails failed:', error?.response?.status, error?.message);
      return { success: false, data: null } as any;
    }
  }

  async claimJob(jobId: string, request: ClaimRequest): Promise<ClaimResponse> {
    try {
      const response = await this.api.post<ClaimResponse>(`/api/jobs/${jobId}/claims`, request);
      return response.data;
    } catch (error: any) {
      console.error('claimJob failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to claim job' } as any;
    }
  }

  // ── Assignments ──
  async getMyAssignments(): Promise<AssignmentsListResponse> {
    try {
      const response = await this.v2Api.get<AssignmentsListResponse>('/api/vendors/me/assignments');
      return response.data;
    } catch (error: any) {
      console.error('getMyAssignments failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async getAssignmentDetails(assignmentId: string): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.get(`https://1099backend.searskairos.ai/api/assignments/${assignmentId}`, {
        headers: {
          Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('getAssignmentDetails failed:', error?.response?.status, error?.message);
      return { success: false, message: 'Failed to load assignment details' };
    }
  }

  async getNonShsJobs(): Promise<any> {
    try {
      const response = await this.v2Api.get('/api/vendors/me/non-shs-jobs');
      return response.data;
    } catch (error: any) {
      console.error('getNonShsJobs failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async logNonShsJob(payload: { scheduledAt: string; source: string; appliance: string; brand: string; jobChannel?: string; customerName?: string; customerPhone?: string; customerAddress?: string; issue: string; notes: string; duration?: string; zipCode?: string; clientType?: string }): Promise<any> {
    try {
      console.log('[logNonShsJob] POST /api/vendors/me/non-shs-jobs', JSON.stringify(payload, null, 2));
      const response = await this.v2Api.post('/api/vendors/me/non-shs-jobs', payload);
      console.log('[logNonShsJob] SUCCESS:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('[logNonShsJob] FAILED:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
      });
      return { success: false, message: error?.response?.data?.message || 'Failed to log non-SHS job' };
    }
  }

  async updateNonShsJob(jobId: string, payload: { scheduledAt: string; source: string; appliance: string; brand: string; jobChannel?: string; customerName?: string; customerPhone?: string; customerAddress?: string; issue: string; notes: string; duration?: string; zipCode?: string; clientType?: string }): Promise<any> {
    try {
      console.log(`[updateNonShsJob] PUT /api/vendors/me/non-shs-jobs/${jobId}`, JSON.stringify(payload, null, 2));
      const response = await this.v2Api.put(`/api/vendors/me/non-shs-jobs/${jobId}`, payload);
      console.log('[updateNonShsJob] SUCCESS:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('[updateNonShsJob] FAILED:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
      });
      return { success: false, message: error?.response?.data?.message || 'Failed to update non-SHS job' };
    }
  }

  // ── Status Updates ──
  async updateAssignmentStatus(
    assignmentId: string,
    status: string,
    options?: {
      notes?: string;
      completionNotes?: string;
      serviceAttemptType?: string;
      completionType?: string;
      repairCode?: string;
      customerAcknowledged?: boolean;
    }
  ): Promise<any> {
    try {
      const body: Record<string, any> = { status };
      if (options?.notes !== undefined) body.notes = options.notes;
      if (options?.completionNotes !== undefined) body.completionNotes = options.completionNotes;
      if (options?.serviceAttemptType !== undefined) body.serviceAttemptType = options.serviceAttemptType;
      if (options?.completionType !== undefined) body.completionType = options.completionType;
      if (options?.repairCode !== undefined) body.repairCode = options.repairCode;
      if (options?.customerAcknowledged !== undefined) body.customerAcknowledged = options.customerAcknowledged;

      const token = this.getToken();
      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v3/assignments/${assignmentId}`,
        body,
        {
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json',
            Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
          },
          timeout: API_CONFIG.TIMEOUT,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('updateAssignmentStatus failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update status' };
    }
  }

  async updateAssignmentStatusV3(
    assignmentId: string | number,
    payload: {
      status: string;
      serviceAttemptType: string;
      completionNotes?: string;
      completionType: string;
      repairCode: string;
      customerAcknowledged: boolean;
      rescheduleReason?: string;
      nextAppointment?: string;
      cnhReason?: string;
      cancelReason?: string;
      estimateDeclineReason?: string;
    }
  ): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v3/assignments/${assignmentId}`,
        payload,
        {
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json',
            Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
          },
          timeout: API_CONFIG.TIMEOUT,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('updateAssignmentStatusV3 failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update status' };
    }
  }

  async getServiceUpdateAttemptDescriptions(): Promise<any> {
    try {
      const token = this.getToken()?.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '') || '';
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/service-update-attempt-descriptions`, {
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      });
      return response.data;
    } catch (error: any) {
      console.error('getServiceUpdateAttemptDescriptions failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  // ── Customer Not Home ──
  async markCustomerNotHome(assignmentId: string, reason: string, notes: string, photos?: string[]): Promise<any> {
    try {
      const imageUrl = photos && photos.length > 0 ? photos[0] : '';
      const response = await this.api.patch(`/api/assignments/${assignmentId}/customer-not-home`, {
        status: true, reason, additionalNote: notes, imageUrl,
      });
      return response.data;
    } catch (error: any) {
      console.error('markCustomerNotHome failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to mark customer not home' };
    }
  }

  // ── Reschedule ──
  async rescheduleAssignment(assignmentId: string, request: RescheduleRequest): Promise<RescheduleResponse> {
    try {
      const token = this.getToken();
      const response = await axios.put<RescheduleResponse>(
        `https://1099backend.searskairos.ai/api/v3/assignments/${assignmentId}/schedule`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('rescheduleAssignment failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to reschedule' } as any;
    }
  }

  // ── Appliance ──
  async updateApplianceInfo(assignmentId: string, body: { applianceBrandname: string; applianceModel: string; applianceSerial: string; applianceIssue: string; status?: string }): Promise<any> {
    try {
      const response = await this.v2Api.patch(`/api/assignments/${assignmentId}`, body);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('updateApplianceInfo failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update appliance info' };
    }
  }

  async updateProductInfo(assignmentId: string | number, body: { productLine?: string; brand: string; modelNumber: string; serialNumber: string; issue: string; imageUrl?: string }): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.patch(
        `https://1099backend.searskairos.ai/api/v3/assignments/${assignmentId}`,
        {
          applianceBrandname: body.brand,
          applianceModel: body.modelNumber,
          applianceSerial: body.serialNumber,
          applianceIssue: body.issue,
          status: 'arrived',
        },
        {
          headers: {
            Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('updateProductInfo failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update product info' };
    }
  }

  // ── Parts ──
  async addPart(assignmentId: string, request: AddPartToAssignmentRequest): Promise<PartResponse> {
    try {
      const response = await this.v2Api.post<PartResponse>(`/api/assignments/${assignmentId}/parts`, request);
      return response.data;
    } catch (error: any) {
      console.error('addPart failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to add part' } as any;
    }
  }

  async getAssignmentParts(assignmentId: string): Promise<AddedPartResponse> {
    try {
      const response = await this.v2Api.get(
        `/api/assignments/${assignmentId}/orders/tracking/part-order-details`,
        { timeout: 5000 }
      );
      const payload = response.data || {};
      const data = payload.data || {};
      const combinedItems: any[] = [];

      const draftOrders: any[] = Array.isArray(data.draftOrders) ? data.draftOrders : [];
      draftOrders.forEach((order) => {
        const items: any[] = Array.isArray(order?.items) ? order.items : [];
        items.forEach((item, idx) => {
          combinedItems.push({
            id: `draft-${order?.orderId ?? 'order'}-${idx}`,
            orderId: String(order?.orderId),
            partNumber: item.partNo,
            quantity: item.quantity,
            brand: item.brand,
            partType: item.partType || 'ordered',
            itemDescription: item.itemDescription,
            imageUrl: item.itemImageUrl,
            orderNo: order?.orderNumber,
            isDraft: true,
            status: order?.status || 'draft',
          });
        });
      });

      const partOrderList = data.partOrderDetailsListVOs?.item || [];
      const orderedItems: any[] = Array.isArray(partOrderList) ? partOrderList : [];
      orderedItems.forEach((orderDetail) => {
        const items: any[] = Array.isArray(orderDetail?.orderedPartDetailsExtVOs?.item) ? orderDetail.orderedPartDetailsExtVOs.item : [];
        items.forEach((item, idx) => {
          combinedItems.push({
            id: `ordered-${orderDetail?.partOrderNumber ?? 'order'}-${idx}`,
            orderId: String(orderDetail?.partOrderNumber),
            partNumber: item.partNumber,
            quantity: item.partOrderLineQuantity || 1,
            partType: 'ordered',
            itemDescription: item.lineItemDescription,
            orderNo: orderDetail?.partOrderNumber,
            isDraft: false,
            status: item.statusDescLineItem || item.statusCodeLineItem,
            trackingNumber: item.shipmentTrackingNumber,
            carrier: item.shipmentCarrierCode?.trim(),
            price: item.eachPriceOfLineItem,
          });
        });
      });

      return { success: true, data: combinedItems, message: payload.message || 'Part order details retrieved' };
    } catch (error: any) {
      console.error('getAssignmentParts failed:', error?.response?.status, error?.message);
      return { success: false, data: [], message: 'Failed to load parts' };
    }
  }

  async getStatusByTrackingNo(
    assignmentId: string | number,
    body: { trackingNumber: string }
  ): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.post(
        `https://1099backend.searskairos.ai/api/assignments/${assignmentId}/orders/tracking/status`,
        body,
        {
          headers: {
            Authorization: token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : '',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('getStatusByTrackingNo failed:', error?.response?.status, error?.message);
      return { success: false, data: null };
    }
  }


  async deletePart(assignmentId: string | number, orderId: string | number, partId?: string | number): Promise<DeletePartResponse> {
    try {
      const baseUrl = `/api/pros/assignments/${assignmentId}/orders/${orderId}`;
      const url = partId != null ? `${baseUrl}/parts/${partId}` : baseUrl;
      const response = await this.api.delete<DeletePartResponse>(url);
      return response.data || { success: true, message: 'Part deleted successfully' };
    } catch (error: any) {
      console.error('deletePart failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to delete part' } as any;
    }
  }

  async searchModels(assignmentId: number, modelNo: string): Promise<any> {
    try {
      const trimmed = (modelNo || '').trim();
      if (!trimmed) throw new Error('Model number is required');
      const response = await this.api.get(`/api/assignments/${assignmentId}/models/search`, { params: { q: trimmed } });
      return response.data;
    } catch (error: any) {
      console.error('searchModels failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async getModelParts(assignmentId: number, modelId: string): Promise<any> {
    try {
      if (!modelId) throw new Error('Model ID is required');
      const response = await this.api.get(`/api/assignments/${assignmentId}/models/${modelId}/parts`);
      return response.data;
    } catch (error: any) {
      console.error('getModelParts failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async searchPartsByPartNo(partNo: string): Promise<any> {
    try {
      const trimmed = (partNo || '').trim();
      if (!trimmed) throw new Error('Part number is required');
      const response = await this.v2Api.get('/api/assignments/parts/item-search', { params: { partNo: trimmed } });
      return response.data;
    } catch (error: any) {
      console.error('searchPartsByPartNo failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async getOrders(assignmentId: number | string): Promise<any> {
    try {
      const response = await this.api.get(`/api/assignments/${assignmentId}/orders`);
      return response.data;
    } catch (error: any) {
      console.error('getOrders failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async createOrder(assignmentId: number, items: Array<{ itemId: string; partNo: string; quantity: number; productGroupId: string; productGroupName?: string; itemDescription?: string; itemImageUrl?: string; partType?: string }>): Promise<any> {
    try {
      const response = await this.api.post(`/api/assignments/${assignmentId}/orders`, { items });
      return response.data;
    } catch (error: any) {
      console.error('createOrder failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to create order' };
    }
  }

  async updateOrder(assignmentId: number, orderId: string, items: Array<{ itemId: string; partNo: string; quantity: number; productGroupId: string; productGroupName?: string; itemDescription?: string; itemImageUrl?: string; partType?: string }>): Promise<any> {
    try {
      const response = await this.api.patch(`/api/assignments/${assignmentId}/orders/${orderId}`, { items });
      return response.data;
    } catch (error: any) {
      console.error('updateOrder failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to update order' };
    }
  }

  async submitOrder(assignmentId: string, orderId: string): Promise<any> {
    try {
      const response = await this.api.post(`/api/assignments/${assignmentId}/orders/${orderId}/submit`);
      return response.data || { success: true, message: 'Order submitted successfully' };
    } catch (error: any) {
      console.error('submitOrder failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to submit order' };
    }
  }

  async getAssignmentOrders(assignmentId: string): Promise<{ success: boolean; data: any[] }> {
    try {
      const response = await this.api.get(`/api/assignments/${assignmentId}/orders`);
      const payload = response.data || {};
      return { success: true, data: Array.isArray(payload.data) ? payload.data : [] };
    } catch (error: any) {
      console.error('getAssignmentOrders failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async submitAllOrders(assignmentId: string): Promise<{ success: boolean; totalOrders: number; submittedCount: number; failedCount: number; errors: string[] }> {
    try {
      const ordersResponse = await this.getAssignmentOrders(assignmentId);
      const orders = ordersResponse.data;
      if (!orders || orders.length === 0) return { success: true, totalOrders: 0, submittedCount: 0, failedCount: 0, errors: [] };
      const results = await Promise.all(
        orders.map(async (order: any) => {
          const orderId = order?.orderId ?? order?.id;
          if (!orderId) return { success: false, error: 'Missing orderId' };
          try { await this.submitOrder(assignmentId, String(orderId)); return { success: true }; }
          catch (err: any) { return { success: false, error: err?.message || 'Submit failed' }; }
        })
      );
      const submittedCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      const errors = results.filter(r => !r.success).map(r => r.error || '');
      return { success: failedCount === 0, totalOrders: orders.length, submittedCount, failedCount, errors };
    } catch (error: any) {
      console.error('submitAllOrders failed:', error?.response?.status, error?.message);
      return { success: false, totalOrders: 0, submittedCount: 0, failedCount: 1, errors: [error?.message || 'Failed to submit orders'] };
    }
  }

  private parsePartsResponse(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload.data && Array.isArray(payload.data)) return payload.data;

    const data = payload.data || payload || {};
    const combinedItems: any[] = [];

    // Draft Orders
    const draftOrders = Array.isArray(data.draftOrders) 
      ? data.draftOrders 
      : Array.isArray(payload.draftOrders) 
        ? payload.draftOrders 
        : [];
        
    draftOrders.forEach((order: any) => {
      const items = Array.isArray(order?.items) ? order.items : [];
      items.forEach((item: any, idx: number) => {
        combinedItems.push({
          id: `draft-${order?.orderId ?? 'order'}-${idx}`,
          orderId: String(order?.orderId),
          partNumber: item.partNo || item.partNumber,
          quantity: item.quantity,
          brand: item.brand,
          partType: item.partType || 'ordered',
          itemDescription: item.itemDescription || item.description,
          imageUrl: item.itemImageUrl,
          orderNo: order?.orderNumber,
          isDraft: true,
          status: order?.status || 'draft',
        });
      });
    });

    // Ordered Parts
    const partOrderList = (data.partOrderDetailsListVOs?.item || data.partOrderDetailsListVOs || payload.partOrderDetailsListVOs?.item || payload.partOrderDetailsListVOs || []);
    const orderedItems = Array.isArray(partOrderList) ? partOrderList : [];
    orderedItems.forEach((orderDetail: any) => {
      const items = Array.isArray(orderDetail?.orderedPartDetailsExtVOs?.item) 
        ? orderDetail.orderedPartDetailsExtVOs.item 
        : Array.isArray(orderDetail?.orderedPartDetailsExtVOs) 
          ? orderDetail.orderedPartDetailsExtVOs 
          : [];
      items.forEach((item: any, idx: number) => {
        combinedItems.push({
          id: `ordered-${orderDetail?.partOrderNumber ?? 'order'}-${idx}`,
          orderId: String(orderDetail?.partOrderNumber),
          partNumber: item.partNumber || item.partNo,
          quantity: item.partOrderLineQuantity || 1,
          partType: 'ordered',
          itemDescription: item.lineItemDescription || item.itemDescription,
          orderNo: orderDetail?.partOrderNumber,
          isDraft: false,
          status: item.statusDescLineItem || item.statusCodeLineItem || orderDetail?.status,
          trackingNumber: item.shipmentTrackingNumber,
          carrier: item.shipmentCarrierCode?.trim(),
          price: item.eachPriceOfLineItem,
        });
      });
    });

    if (combinedItems.length > 0) return combinedItems;
    if (data.parts && Array.isArray(data.parts)) return data.parts;
    if (payload.parts && Array.isArray(payload.parts)) return payload.parts;

    return [];
  }

  async getPartsTracking(): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.get('https://1099backend.searskairos.ai/api/assignments/parts/tracking', {
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      });
      return {
        success: true,
        data: this.parsePartsResponse(response.data)
      };
    } catch (error: any) {
      console.error('getPartsTracking failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async getPartsHistory(limit = 20, offset = 0): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.get('https://1099backend.searskairos.ai/api/assignments/parts/history', {
        params: { limit, offset },
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      });
      return {
        success: true,
        data: this.parsePartsResponse(response.data)
      };
    } catch (error: any) {
      console.error('getPartsHistory failed:', error?.response?.status, error?.message);
      return { success: false, data: [] };
    }
  }

  async checkPartsAvailability(assignmentId: string | number, parts: Array<{ itemId: string; partNo: string; productGroupId: string; quantity: number }>): Promise<any> {
    try {
      const response = await this.v2Api.post(`/api/assignments/${assignmentId}/models/parts/available`, { parts });
      return response.data;
    } catch (error: any) {
      console.error('checkPartsAvailability failed:', error?.response?.status, error?.message);
      return { success: false, data: null };
    }
  }

  async submitPartDisposition(assignmentId: number, dispositions: Array<{ partId: number; disposition: string }>): Promise<any> {
    try {
      const response = await this.api.post(`/api/assignments/${assignmentId}/parts/dispositions`, { dispositions });
      return response.data;
    } catch (error: any) {
      console.error('submitPartDisposition failed:', error?.response?.status, error?.message);
      return { success: false, message: error?.response?.data?.message || 'Failed to submit disposition' };
    }
  }

  // ── Photos (web: standard fetch) ──
  async getCompletionPhotoUploadToken(assignmentId: string, fileName: string, mimeType: string): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.post(
        `https://1099backend.searskairos.ai/api/assignments/${assignmentId}/completion-photo-upload-tokens`,
        { files: [{ fileName, mimeType }] },
        { headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' } }
      );
      return response.data;
    } catch (error: any) {
      console.error('getCompletionPhotoUploadToken failed:', error?.response?.status, error?.message);
      return { success: false, data: null };
    }
  }

  async uploadPhotoToS3(uploadUrl: string, uploadFields: any, file: File): Promise<void> {
    try {
      const formData = new FormData();
      Object.entries(uploadFields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);
      await fetch(uploadUrl, { method: 'POST', body: formData });
    } catch (error: any) {
      console.error('uploadPhotoToS3 failed:', error?.message);
      throw error;
    }
  }

  async consumePhotoTokens(assignmentId: string, tokens: string[]): Promise<any> {
    try {
      const token = this.getToken();
      const response = await axios.post(
        `https://1099backend.searskairos.ai/api/assignments/${assignmentId}/completion-photo-tokens/consume`,
        { tokens },
        { headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' } }
      );
      return response.data;
    } catch (error: any) {
      console.error('consumePhotoTokens failed:', error?.response?.status, error?.message);
      return { success: false, message: 'Failed to consume photo tokens' };
    }
  }

  async uploadCompletionPhoto(assignmentId: string, file: File): Promise<any> {
    try {
      const tokenResponse = await this.getCompletionPhotoUploadToken(assignmentId, file.name, file.type);
      const tokens = tokenResponse.data?.tokens;
      if (!tokens || tokens.length === 0) throw new Error('No upload token received');
      const uploadToken = tokens[0];
      await this.uploadPhotoToS3(uploadToken.uploadUrl, uploadToken.uploadFields, file);
      return this.consumePhotoTokens(assignmentId, [uploadToken.token]);
    } catch (error: any) {
      console.error('uploadCompletionPhoto failed:', error?.message);
      return { success: false, message: 'Failed to upload photo' };
    }
  }

  // ── Earnings ──
  async getVendorInvoiceSummary(from: string, to: string): Promise<any> {
    try {
      const response = await this.v2Api.get('/api/vendors/me/invoices/summary', {
        params: { from, to, group_by: 'day', include_bonus: 'true' },
      });
      const payload = response.data;
      // Normalize: API may return { success, data } or raw data
      if (payload?.success !== undefined) return payload;
      return { success: true, data: payload };
    } catch (error: any) {
      console.error('[getVendorInvoiceSummary] Failed:', error?.response?.status, error?.message);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Failed to load earnings summary',
        data: null,
      };
    }
  }
}

export default new ApiService();
