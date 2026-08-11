// Microsoft Clarity custom event tracking utility
// Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api

declare global {
  interface Window {
    clarity: (...args: any[]) => void;
  }
}

// Track a custom event (shows up in Clarity dashboard under "Custom Events")
export const trackEvent = (eventName: string) => {
  if (typeof window.clarity === 'function') {
    window.clarity('event', eventName);
    console.log(`[Clarity] Event: ${eventName}`);
  }
};

// Set a custom tag (key-value, used for filtering sessions)
export const setTag = (key: string, value: string) => {
  if (typeof window.clarity === 'function') {
    window.clarity('set', key, value);
    console.log(`[Clarity] Tag: ${key} = ${value}`);
  }
};

// Identify user (links session to a specific user)
export const identifyUser = (userId: string, sessionId?: string, pageId?: string) => {
  if (typeof window.clarity === 'function') {
    // Clarity requires a non-empty customSessionId for the userId to register
    const sid = sessionId || `session_${userId}_${Date.now()}`;
    const pid = pageId || window.location.pathname;
    window.clarity('identify', userId, sid, pid, userId);
    console.log(`[Clarity] Identify: userId=${userId}, sessionId=${sid}`);
  }
};

// ── Pre-defined tracking functions for key actions ──

// Auth
export const trackLogin = (username: string, userData?: any) => {
  // Identify the user in Clarity using username as primary ID (same as mobile app)
  identifyUser(username);

  // Set all available technician details as tags
  setTag('username', username);
  setTag('user_role', userData?.role || 'technician');
  if (userData?.id) setTag('user_id', String(userData.username));
  if (userData?.vendorId) setTag('vendor_id', String(userData.vendorId));
  if (userData?.vendorName) setTag('vendor_name', userData.vendorName);
  if (userData?.name) setTag('tech_name', userData.name);
  if (userData?.phone) setTag('tech_phone', userData.phone);
  if (userData?.zipCodes?.length) setTag('tech_zip_codes', userData.zipCodes.join(','));
  if (userData?.isActive !== undefined) setTag('tech_is_active', String(userData.isActive));
  if (userData?.addressLine1) setTag('tech_address', userData.addressLine1);
  if (userData?.city) setTag('tech_city', userData.city);
  if (userData?.state) setTag('tech_state', userData.state);
  if (userData?.zipCode) setTag('tech_zip', userData.zipCode);
  if (userData?.permissions?.length) setTag('permissions', userData.permissions.join(','));

  trackEvent('login_success');
};

// Call on app load if user is already logged in (restores Clarity identity from stored session)
export const identifySession = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const username = user?.username;
    if (username) {
      identifyUser(username);
      setTag('username', username);
      if (user?.role) setTag('user_role', user.role);
      if (user?.id) setTag('user_id', String(user.username));
      if (user?.vendorId) setTag('vendor_id', String(user.vendorId));
      if (user?.vendorName) setTag('vendor_name', user.vendorName);
      if (user?.name) setTag('tech_name', user.name);
      if (user?.phone) setTag('tech_phone', user.phone);
      if (user?.zipCodes?.length) setTag('tech_zip_codes', user.zipCodes.join(','));
      if (user?.isActive !== undefined) setTag('tech_is_active', String(user.isActive));
      if (user?.addressLine1) setTag('tech_address', user.addressLine1);
      if (user?.city) setTag('tech_city', user.city);
      if (user?.state) setTag('tech_state', user.state);
      if (user?.zipCode) setTag('tech_zip', user.zipCode);
    }
  } catch (e) {
    // ignore parse errors
  }
};

// Track additional technician profile details from vendor profile API
export const trackTechnicianProfile = (profile: any) => {
  if (!profile) return;
  if (profile.email) setTag('tech_email', profile.email);
  if (profile.mobile) setTag('tech_mobile', profile.mobile);
  if (profile.tier) setTag('tech_tier', profile.tier);
  if (profile.city) setTag('tech_city', profile.city);
  if (profile.state) setTag('tech_state', profile.state);
  if (profile.zipCode) setTag('tech_zip', profile.zipCode);
  if (profile.performance?.rating) setTag('tech_rating', String(profile.performance.rating));
  if (profile.performance?.firstTimeFixRate) setTag('tech_ftf_rate', String(profile.performance.firstTimeFixRate));
};

export const trackLogout = () => {
  trackEvent('logout');
};

// Jobs
export const trackJobViewed = (jobId: string) => {
  setTag('job_id', jobId);
  trackEvent('job_viewed');
};

export const trackJobClaimed = (jobId: string) => {
  setTag('job_id', jobId);
  trackEvent('job_claimed');
};

// ── Service Order Funnel Events ──
// These use a consistent naming convention for building funnels in Clarity:
//   so_funnel_<state>
// Funnel order: viewed → claimed → arrived → in_progress → part_order → rescheduled → completed
// Alternative terminal states: customer_not_home, cancelled, estimate_declined

const SO_FUNNEL_PREFIX = 'so_funnel';

export const trackServiceOrderFunnel = (assignmentId: string, state: string, extra?: Record<string, string>) => {
  setTag('so_id', assignmentId);
  setTag('so_state', state);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => setTag(k, v));
  }
  // Specific funnel step event (e.g. so_funnel_claimed)
  trackEvent(`${SO_FUNNEL_PREFIX}_${state}`);
  // Generic event for overall funnel tracking
  trackEvent('so_state_change');
};

// Convenience wrappers for each funnel step
export const trackSOViewed = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'viewed');

export const trackSOClaimed = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'claimed');

export const trackSOArrived = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'arrived');

export const trackSOInProgress = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'in_progress');

export const trackSOPartOrder = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'part_order');

export const trackSORescheduled = (assignmentId: string, reason?: string) =>
  trackServiceOrderFunnel(assignmentId, 'rescheduled', reason ? { so_reschedule_reason: reason } : undefined);

export const trackSOCompleted = (assignmentId: string, completionType?: string) =>
  trackServiceOrderFunnel(assignmentId, 'completed', completionType ? { so_completion_type: completionType } : undefined);

export const trackSOCustomerNotHome = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'customer_not_home');

export const trackSOCancelled = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'cancelled');

export const trackSOEstimateDeclined = (assignmentId: string) =>
  trackServiceOrderFunnel(assignmentId, 'estimate_declined');

// Legacy aliases (kept for backward compatibility)
export const trackStatusChange = (assignmentId: string, status: string) =>
  trackServiceOrderFunnel(assignmentId, status);

export const trackMarkArrived = (assignmentId: string) =>
  trackSOArrived(assignmentId);

export const trackJobCompleted = (assignmentId: string) =>
  trackSOCompleted(assignmentId);

// Parts
export const trackPartAdded = (assignmentId: string, partNo: string) => {
  setTag('assignment_id', assignmentId);
  setTag('part_no', partNo);
  trackEvent('part_added');
};

export const trackPartDeleted = (assignmentId: string) => {
  setTag('assignment_id', assignmentId);
  trackEvent('part_deleted');
};

export const trackPartsOrdered = (assignmentId: string) => {
  setTag('assignment_id', assignmentId);
  trackEvent('parts_ordered');
};

// Reschedule
export const trackReschedule = (assignmentId: string) => {
  setTag('assignment_id', assignmentId);
  trackEvent('job_rescheduled');
};

// Appliance
export const trackApplianceUpdated = (assignmentId: string) => {
  setTag('assignment_id', assignmentId);
  trackEvent('appliance_updated');
};

// Feedback
export const trackFeedbackSubmitted = () => {
  trackEvent('feedback_submitted');
};

// Navigation
export const trackPageView = (pageName: string) => {
  setTag('page', pageName);
  trackEvent(`page_${pageName}`);
};

// ── API Tracking ──

// Track API error with full details
export const trackApiError = (config: {
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  errorMessage?: string;
  errorCode?: string;
  responseData?: any;
}) => {
  const endpoint = (config.url || 'unknown').replace(/https?:\/\/[^/]+/, '').split('?')[0];
  const method = (config.method || 'GET').toUpperCase();

  setTag('api_error_endpoint', endpoint);
  setTag('api_error_method', method);
  if (config.status) setTag('api_error_status', String(config.status));
  if (config.statusText) setTag('api_error_status_text', config.statusText);

  // Build a concise error message for the event
  const errMsg = config.errorMessage
    || config.responseData?.message
    || config.responseData?.error
    || config.statusText
    || 'Unknown error';
  setTag('api_error_message', String(errMsg).slice(0, 255));

  if (config.errorCode) setTag('api_error_code', config.errorCode);

  // Capture the full error response body
  if (config.responseData) {
    try {
      const responseStr = typeof config.responseData === 'string'
        ? config.responseData
        : JSON.stringify(config.responseData);
      setTag('api_error_response', responseStr.slice(0, 255));
    } catch (e) {
      // ignore stringify errors
    }
  }

  // Fire a smart event with method + endpoint for easy filtering
  trackEvent(`api_error_${method}_${endpoint.replace(/\//g, '_').replace(/^_/, '')}`);
  // Also fire a generic api_error event
  trackEvent('api_error');
};

// Track successful API call (optional, for key endpoints)
export const trackApiSuccess = (method: string, url: string, status: number) => {
  const endpoint = (url || '').replace(/https?:\/\/[^/]+/, '').split('?')[0];
  setTag('api_success_endpoint', endpoint);
  setTag('api_success_status', String(status));
  trackEvent('api_success');
};
