// GA4 dataLayer push utility for Google Tag Manager
// All events follow GA4 naming conventions (snake_case)
// GTM Container: GTM-KD6BK34Z

// Window.dataLayer type is declared in clarityTracking.ts

// ── Dedup guard (prevents double-push from React StrictMode) ──
let _lastEvent = '';
let _lastTime = 0;
const DEDUP_MS = 300;

// ── Core push helper ──
const pushEvent = (eventName: string, params?: Record<string, any>) => {
  const now = Date.now();
  if (eventName === _lastEvent && now - _lastTime < DEDUP_MS) return;
  _lastEvent = eventName;
  _lastTime = now;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
  console.log(`[GA4] ${eventName}`, params || '');
};

// ══════════════════════════════════════════════════════════════
// AUTH EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4Login = (username: string, userData?: any) => {
  const params: Record<string, any> = {
    method: 'vendor_id',
    user_id: username,
    vendor_name: userData?.vendorName || userData?.email || username,
    user_role: userData?.role || 'technician',
  };
  if (userData?.vendorId) params.vendor_id = String(userData.vendorId);
  if (userData?.zipCode || userData?.zipCodes?.[0]) params.user_zip_code = userData.zipCode || userData.zipCodes[0];
  if (userData?.city) params.user_city = userData.city;
  if (userData?.state) params.user_state = userData.state;
  if (userData?.phone) params.user_phone = userData.phone;
  pushEvent('login', params);
};

export const ga4UserProfileLoaded = (profileData: any) => {
  const params: Record<string, any> = {};
  if (profileData?.vendorName || profileData?.name) params.vendor_name = profileData.vendorName || profileData.name;
  if (profileData?.zipCode || profileData?.zipCodes?.[0]) params.user_zip_code = profileData.zipCode || profileData.zipCodes[0];
  if (profileData?.city) params.user_city = profileData.city;
  if (profileData?.state) params.user_state = profileData.state;
  if (profileData?.phone || profileData?.mobile) params.user_phone = profileData.phone || profileData.mobile;
  if (profileData?.email) params.user_email = profileData.email;
  if (profileData?.addressLine1) params.user_address = profileData.addressLine1;
  if (Object.keys(params).length > 0) pushEvent('user_profile_loaded', params);
};

export const ga4LoginFailed = (username: string, errorMessage: string) => {
  pushEvent('login_failed', {
    user_id: username,
    error_message: errorMessage,
  });
};

export const ga4Logout = () => {
  // Include user details at time of logout (read from storage before it's cleared)
  const params: Record<string, any> = {};
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    if (stored?.username) params.user_id = stored.username;
    if (stored?.vendorId) params.vendor_id = String(stored.vendorId);
    params.vendor_name = stored?.vendorName || stored?.email || stored?.username || '';
    params.user_role = stored?.role || 'technician';
    if (stored?.zipCode || stored?.zipCodes?.[0]) params.user_zip_code = stored.zipCode || stored.zipCodes[0];
    if (stored?.city) params.user_city = stored.city;
    if (stored?.state) params.user_state = stored.state;
    if (stored?.phone || stored?.mobile) params.user_phone = stored.phone || stored.mobile;
  } catch (_) {}
  pushEvent('logout', params);
};

export const ga4SessionRestored = (username: string) => {
  const params: Record<string, any> = { user_id: username };
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    if (stored?.vendorId) params.vendor_id = String(stored.vendorId);
    params.vendor_name = stored?.vendorName || stored?.email || username;
    params.user_role = stored?.role || 'technician';
    if (stored?.zipCode || stored?.zipCodes?.[0]) params.user_zip_code = stored.zipCode || stored.zipCodes[0];
    if (stored?.city) params.user_city = stored.city;
    if (stored?.state) params.user_state = stored.state;
    if (stored?.phone || stored?.mobile) params.user_phone = stored.phone || stored.mobile;
  } catch (_) {}
  pushEvent('session_restored', params);
};

// ══════════════════════════════════════════════════════════════
// NAVIGATION / PAGE VIEW EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4PageView = (pageName: string, pagePath: string) => {
  pushEvent('page_view', {
    page_title: pageName,
    page_location: window.location.href,
    page_path: pagePath,
  });
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4DashboardLoaded = (assignmentCount: number, todaysJobCount: number) => {
  pushEvent('dashboard_loaded', {
    total_assignments: assignmentCount,
    todays_jobs: todaysJobCount,
  });
};

export const ga4DashboardRefresh = () => {
  pushEvent('dashboard_refresh');
};

export const ga4DashboardCardClick = (cardName: string) => {
  pushEvent('dashboard_card_click', {
    card_name: cardName,
  });
};

// ══════════════════════════════════════════════════════════════
// SERVICE ORDER FUNNEL EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4SOViewed = (assignmentId: string, soNumber?: string, applianceType?: string) => {
  pushEvent('so_viewed', {
    assignment_id: assignmentId,
    so_number: soNumber,
    appliance_type: applianceType,
  });
};

export const ga4SOClaimed = (assignmentId: string, soNumber?: string) => {
  pushEvent('so_claimed', {
    assignment_id: assignmentId,
    so_number: soNumber,
  });
};

export const ga4SOArrived = (assignmentId: string) => {
  pushEvent('so_arrived', {
    assignment_id: assignmentId,
  });
};

export const ga4SOInProgress = (assignmentId: string) => {
  pushEvent('so_in_progress', {
    assignment_id: assignmentId,
  });
};

export const ga4SOCompleted = (assignmentId: string, completionType?: string, repairCode?: string) => {
  pushEvent('so_completed', {
    assignment_id: assignmentId,
    completion_type: completionType,
    repair_code: repairCode,
  });
};

export const ga4SORescheduled = (assignmentId: string, reason?: string, newDate?: string) => {
  pushEvent('so_rescheduled', {
    assignment_id: assignmentId,
    reschedule_reason: reason,
    new_scheduled_date: newDate,
  });
};

export const ga4SOCustomerNotHome = (assignmentId: string, reason?: string) => {
  pushEvent('so_customer_not_home', {
    assignment_id: assignmentId,
    cnh_reason: reason,
  });
};

export const ga4SOCancelled = (assignmentId: string, reason?: string) => {
  pushEvent('so_cancelled', {
    assignment_id: assignmentId,
    cancel_reason: reason,
  });
};

export const ga4SOEstimateDeclined = (assignmentId: string, reason?: string) => {
  pushEvent('so_estimate_declined', {
    assignment_id: assignmentId,
    decline_reason: reason,
  });
};

export const ga4StatusChange = (assignmentId: string, newStatus: string) => {
  pushEvent('so_status_change', {
    assignment_id: assignmentId,
    new_status: newStatus,
  });
};

// ══════════════════════════════════════════════════════════════
// PARTS EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4PartAdded = (assignmentId: string, partNumber: string, partDescription?: string) => {
  pushEvent('part_added', {
    assignment_id: assignmentId,
    part_number: partNumber,
    part_description: partDescription,
  });
};

export const ga4PartDeleted = (assignmentId: string, partId?: string) => {
  pushEvent('part_deleted', {
    assignment_id: assignmentId,
    part_id: partId,
  });
};

export const ga4PartsOrdered = (assignmentId: string, partCount?: number, parts?: { partNo: string; name?: string }[]) => {
  const params: Record<string, any> = {
    assignment_id: assignmentId,
    part_count: partCount,
  };
  if (parts?.length) {
    params.part_numbers = parts.map(p => p.partNo).join(', ');
    params.part_names = parts.map(p => p.name || p.partNo).join(', ').slice(0, 500);
  }
  pushEvent('parts_ordered', params);
};

export const ga4PartTracked = (assignmentId: string, trackingNumber: string) => {
  pushEvent('part_tracked', {
    assignment_id: assignmentId,
    tracking_number: trackingNumber,
  });
};

// ══════════════════════════════════════════════════════════════
// APPLIANCE EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4ApplianceUpdated = (assignmentId: string, brand?: string, model?: string) => {
  pushEvent('appliance_updated', {
    assignment_id: assignmentId,
    appliance_brand: brand,
    appliance_model: model,
  });
};

// ══════════════════════════════════════════════════════════════
// ACCOUNT & PROFILE EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4AddressUpdated = () => {
  pushEvent('address_updated');
};

export const ga4FeedbackSubmitted = (questionCount: number, answers?: Record<string, any>[]) => {
  pushEvent('feedback_submitted', {
    question_count: questionCount,
    feedback_answers: answers ? JSON.stringify(answers).slice(0, 500) : undefined,
  });
};

export const ga4FeedbackOpened = () => {
  pushEvent('feedback_opened');
};

// ══════════════════════════════════════════════════════════════
// EARNINGS EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4EarningsViewed = (period: string) => {
  pushEvent('earnings_viewed', {
    earnings_period: period,
  });
};

// ══════════════════════════════════════════════════════════════
// CHAT AI EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4ChatAIOpened = () => {
  pushEvent('chat_ai_opened');
};

export const ga4ChatAIRefreshed = () => {
  pushEvent('chat_ai_refreshed');
};

export const ga4ChatAIOpenedExternal = () => {
  pushEvent('chat_ai_opened_external');
};

// ══════════════════════════════════════════════════════════════
// SEARCH EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4SearchUsed = (searchContext: string, query: string) => {
  pushEvent('search', {
    search_term: query,
    search_context: searchContext,
  });
};

// ══════════════════════════════════════════════════════════════
// UI INTERACTION EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4TabChanged = (tabName: string, context: string) => {
  pushEvent('tab_changed', {
    tab_name: tabName,
    tab_context: context,
  });
};

export const ga4ViewToggled = (viewType: string) => {
  pushEvent('view_toggled', {
    view_type: viewType,
  });
};

export const ga4ButtonClick = (buttonName: string, context?: string) => {
  pushEvent('button_click', {
    button_name: buttonName,
    click_context: context,
  });
};

export const ga4ModalOpened = (modalName: string) => {
  pushEvent('modal_opened', {
    modal_name: modalName,
  });
};

export const ga4ModalClosed = (modalName: string) => {
  pushEvent('modal_closed', {
    modal_name: modalName,
  });
};

// ══════════════════════════════════════════════════════════════
// NON-SEARS JOB EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4NonSearsJobCreated = (jobData?: { source?: string; appliance?: string; brand?: string; issue?: string; zipCode?: string; scheduledDate?: string; clientType?: string }) => {
  const params: Record<string, any> = {};
  if (jobData?.source) params.job_source = jobData.source;
  if (jobData?.appliance) params.appliance_type = jobData.appliance;
  if (jobData?.brand) params.appliance_brand = jobData.brand;
  if (jobData?.issue) params.job_issue = jobData.issue;
  if (jobData?.zipCode) params.job_zip_code = jobData.zipCode;
  if (jobData?.scheduledDate) params.scheduled_date = jobData.scheduledDate;
  if (jobData?.clientType) params.client_type = jobData.clientType;
  pushEvent('non_sears_job_created', params);
};

export const ga4NonSearsJobUpdated = (jobId: string) => {
  pushEvent('non_sears_job_updated', {
    job_id: jobId,
  });
};

// ══════════════════════════════════════════════════════════════
// API ERROR EVENTS
// ══════════════════════════════════════════════════════════════

export const ga4ApiError = (method: string, endpoint: string, status?: number, message?: string) => {
  pushEvent('api_error', {
    api_method: method,
    api_endpoint: endpoint,
    api_status: status,
    error_message: message?.slice(0, 100),
  });
};
