# Microsoft Clarity Integration - Documentation

**Project:** 1099Web Vendor Portal
**Clarity Project ID:** `xc26pyfb8t`
**Date:** June 24–25, 2026

---

## 1. Overview

Microsoft Clarity is integrated into the 1099Web vendor portal to provide:
- **Session recordings** — replay exactly what technicians see and do
- **Heatmaps** — visualize click/scroll patterns
- **Custom event tracking** — track every key action (login, job claim, status changes, etc.)
- **Custom tags** — attach technician details to every session for filtering
- **User identification** — link sessions to specific technicians
- **API error monitoring** — automatically capture all API failures with full details
- **Service order funnels** — track the complete lifecycle of a service order

---

## 2. Files Modified

| File | Change |
|------|--------|
| `index.html` | Added Clarity tracking script in `<head>` |
| `src/utils/clarityTracking.ts` | **NEW** — Centralized tracking utility (all functions) |
| `src/api/apiService.ts` | Added `trackApiError` in Axios interceptor + stored full user data in localStorage |
| `src/context/AuthContext.tsx` | Added `trackLogin`, `trackLogout`, `identifySession` |
| `src/pages/AssignmentsPage.tsx` | Tracking for arrived, appliance, reschedule, parts, complete, claim |
| `src/pages/AccountPage.tsx` | Tracking for feedback submit + technician profile tags |
| `src/pages/JobDetailPage.tsx` | Tracking for job claim |
| `src/pages/JobCompletePage.tsx` | Tracking for all completion types |
| `src/pages/AssignmentDetailPage.tsx` | Tracking for generic status updates |

---

## 3. Clarity Script (index.html)

Added as the **first child** inside `<head>`:

```html
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xc26pyfb8t");
</script>
```

---

## 4. Clarity API Methods Used

### 4.1 `clarity('event', eventName)`
Fires a custom event. Appears in Clarity dashboard under **Settings → Smart Events** as "API" type.

```typescript
window.clarity('event', 'login_success');
```

### 4.2 `clarity('set', key, value)`
Sets a custom tag (key-value pair) on the session. Appears in session recordings under **"Customised tags"**. Used for filtering sessions.

```typescript
window.clarity('set', 'username', 'test_vendor');
```

### 4.3 `clarity('identify', customUserId, customSessionId, customPageId, friendlyName)`
Links the session to a specific user. Shows in Clarity under **"Clarity user ID"**.

```typescript
window.clarity('identify', 'vendor-1', 'session_vendor-1_1719250000', '/', 'vendor-1');
```

---

## 5. Tracking Utility — `src/utils/clarityTracking.ts`

All tracking logic is centralized in one file. No raw `window.clarity()` calls exist elsewhere in the codebase.

### 5.1 Core Functions

| Function | Clarity API | Purpose |
|----------|-------------|---------|
| `trackEvent(eventName)` | `clarity('event', ...)` | Fire a custom event |
| `setTag(key, value)` | `clarity('set', ...)` | Set a session tag |
| `identifyUser(userId)` | `clarity('identify', ...)` | Link session to a user |

### 5.2 Authentication Tracking

| Function | When Called | Events Fired | Tags Set |
|----------|------------|--------------|----------|
| `trackLogin(username, userData)` | After successful login | `login_success` | `username`, `user_role`, `user_id`, `vendor_id`, `vendor_name`, `tech_name`, `tech_phone`, `tech_zip_codes`, `tech_is_active`, `tech_address`, `tech_city`, `tech_state`, `tech_zip`, `permissions` |
| `trackLogout()` | On logout | `logout` | — |
| `identifySession()` | On page reload (if already logged in) | — | Same as `trackLogin` (restored from localStorage) |
| `trackTechnicianProfile(profile)` | When vendor profile loads (Account page) | — | `tech_email`, `tech_mobile`, `tech_tier`, `tech_city`, `tech_state`, `tech_zip`, `tech_rating`, `tech_ftf_rate` |

### 5.3 Service Order Funnel Events

Designed for building **funnels** in Clarity. Every state change fires two events:
- `so_funnel_<state>` — specific step (e.g., `so_funnel_claimed`)
- `so_state_change` — generic event for all transitions

Tags set per event: `so_id`, `so_state`

| Function | Event Name | Additional Tags |
|----------|------------|-----------------|
| `trackSOViewed(id)` | `so_funnel_viewed` | — |
| `trackSOClaimed(id)` | `so_funnel_claimed` | — |
| `trackSOArrived(id)` | `so_funnel_arrived` | — |
| `trackSOInProgress(id)` | `so_funnel_in_progress` | — |
| `trackSOPartOrder(id)` | `so_funnel_part_order` | — |
| `trackSORescheduled(id, reason)` | `so_funnel_rescheduled` | `so_reschedule_reason` |
| `trackSOCompleted(id, type)` | `so_funnel_completed` | `so_completion_type` |
| `trackSOCustomerNotHome(id)` | `so_funnel_customer_not_home` | — |
| `trackSOCancelled(id)` | `so_funnel_cancelled` | — |
| `trackSOEstimateDeclined(id)` | `so_funnel_estimate_declined` | — |

**Funnel order:** `viewed → claimed → arrived → in_progress → part_order → rescheduled → completed`

**Terminal states:** `customer_not_home`, `cancelled`, `estimate_declined`

### 5.4 Job & Assignment Actions

| Function | Event Name | Tags Set |
|----------|------------|----------|
| `trackJobViewed(jobId)` | `job_viewed` | `job_id` |
| `trackJobClaimed(jobId)` | `job_claimed` | `job_id` |
| `trackMarkArrived(id)` | `so_funnel_arrived` | `so_id`, `so_state` |
| `trackJobCompleted(id)` | `so_funnel_completed` | `so_id`, `so_state` |
| `trackStatusChange(id, status)` | `so_funnel_<status>` | `so_id`, `so_state` |
| `trackApplianceUpdated(id)` | `appliance_updated` | `assignment_id` |
| `trackReschedule(id)` | `job_rescheduled` | `assignment_id` |

### 5.5 Parts Tracking

| Function | Event Name | Tags Set |
|----------|------------|----------|
| `trackPartAdded(id, partNo)` | `part_added` | `assignment_id`, `part_no` |
| `trackPartDeleted(id)` | `part_deleted` | `assignment_id` |
| `trackPartsOrdered(id)` | `parts_ordered` | `assignment_id` |

### 5.6 Other Actions

| Function | Event Name | Tags Set |
|----------|------------|----------|
| `trackFeedbackSubmitted()` | `feedback_submitted` | — |
| `trackPageView(pageName)` | `page_<pageName>` | `page` |

### 5.7 API Error Tracking (Automatic)

Every failed API call is **automatically tracked** via the Axios response interceptor in `apiService.ts`. No manual calls needed.

| Tag | Example Value |
|-----|---------------|
| `api_error_endpoint` | `/api/vendors/me` |
| `api_error_method` | `GET` |
| `api_error_status` | `500` |
| `api_error_status_text` | `Internal Server Error` |
| `api_error_message` | `Request failed with status 500` |
| `api_error_code` | `ECONNABORTED` |
| `api_error_response` | `{"success":false,"message":"..."}` |

**Events fired per error:**
- `api_error` — generic (filter all sessions with any API error)
- `api_error_<METHOD>_<endpoint>` — specific (e.g., `api_error_GET_api_vendors_me`)

---

## 6. Integration Points by File

### `AuthContext.tsx`
```
Login success  → trackLogin(username, fullUserData)
Logout         → trackLogout()
Page reload    → identifySession()
```

### `AssignmentsPage.tsx`
```
Mark Arrived        → trackMarkArrived(id) + trackSOArrived(id) [via alias]
Save Appliance      → trackApplianceUpdated(id) + trackSOInProgress(id)
Reschedule          → trackReschedule(id) + trackSORescheduled(id, reason)
Add Parts           → trackPartsOrdered(id) + trackStatusChange(id, 'part_order')
Complete Job        → trackSOCompleted / trackSOCustomerNotHome / trackSOCancelled / trackSOEstimateDeclined / trackSORescheduled
Claim Job           → trackJobClaimed(id) + trackSOClaimed(id)
Delete Part         → trackPartDeleted(id)
```

### `AccountPage.tsx`
```
Profile loaded      → trackTechnicianProfile(profileData)
Feedback submitted  → trackFeedbackSubmitted()
```

### `JobDetailPage.tsx`
```
Claim Job           → trackSOClaimed(id)
```

### `JobCompletePage.tsx`
```
Complete            → trackSOCompleted(id, completionType)
Reschedule          → trackSORescheduled(id, reason)
Customer Not Home   → trackSOCustomerNotHome(id)
Cancel at Door      → trackSOCancelled(id)
Estimate Declined   → trackSOEstimateDeclined(id)
```

### `AssignmentDetailPage.tsx`
```
Status update       → trackServiceOrderFunnel(id, newStatus)
```

### `apiService.ts` (Automatic)
```
Any API error       → trackApiError({method, url, status, ...}) [via Axios interceptor]
```

---

## 7. Complete List of Custom Tags

| Tag Key | Source | Description |
|---------|--------|-------------|
| `username` | Login | Technician username |
| `user_role` | Login | User role (e.g., `registered_user`) |
| `user_id` | Login | User ID from backend |
| `vendor_id` | Login | Vendor ID |
| `vendor_name` | Login | Vendor company name |
| `tech_name` | Login | Technician display name |
| `tech_phone` | Login | Phone number |
| `tech_zip_codes` | Login | Service area zip codes |
| `tech_is_active` | Login | Active status |
| `tech_address` | Login | Street address |
| `tech_city` | Login / Profile | City |
| `tech_state` | Login / Profile | State |
| `tech_zip` | Login / Profile | Zip code |
| `permissions` | Login | User permissions |
| `tech_email` | Profile | Email address |
| `tech_mobile` | Profile | Mobile number |
| `tech_tier` | Profile | Tier level (e.g., `ELITE`) |
| `tech_rating` | Profile | Performance rating |
| `tech_ftf_rate` | Profile | First-time fix rate |
| `job_id` | Job actions | Current job ID |
| `so_id` | SO funnel | Service order ID |
| `so_state` | SO funnel | Current SO state |
| `so_completion_type` | SO complete | Completion type |
| `so_reschedule_reason` | SO reschedule | Reschedule reason |
| `assignment_id` | Parts/Appliance | Assignment ID |
| `part_no` | Part added | Part number |
| `page` | Navigation | Current page name |
| `api_error_endpoint` | API error | Failed endpoint path |
| `api_error_method` | API error | HTTP method |
| `api_error_status` | API error | HTTP status code |
| `api_error_status_text` | API error | Status text |
| `api_error_message` | API error | Error message |
| `api_error_code` | API error | Error code (e.g., `ECONNABORTED`) |
| `api_error_response` | API error | Full response body (max 255 chars) |

---

## 8. Complete List of Custom Events

| Event Name | Category | Trigger |
|------------|----------|---------|
| `login_success` | Auth | Successful login |
| `logout` | Auth | User logs out |
| `job_viewed` | Jobs | Job detail opened |
| `job_claimed` | Jobs | Job claimed by technician |
| `so_state_change` | SO Funnel | Any service order state change |
| `so_funnel_viewed` | SO Funnel | SO viewed |
| `so_funnel_claimed` | SO Funnel | SO claimed |
| `so_funnel_arrived` | SO Funnel | Technician marked arrived |
| `so_funnel_in_progress` | SO Funnel | Work in progress |
| `so_funnel_part_order` | SO Funnel | Parts ordered |
| `so_funnel_rescheduled` | SO Funnel | Job rescheduled |
| `so_funnel_completed` | SO Funnel | Job completed |
| `so_funnel_customer_not_home` | SO Funnel | Customer not home |
| `so_funnel_cancelled` | SO Funnel | Cancelled at door |
| `so_funnel_estimate_declined` | SO Funnel | Estimate declined |
| `part_added` | Parts | Part added to job |
| `part_deleted` | Parts | Part removed from job |
| `parts_ordered` | Parts | Parts order submitted |
| `appliance_updated` | Appliance | Appliance details saved |
| `job_rescheduled` | Reschedule | Job rescheduled |
| `feedback_submitted` | Feedback | Feedback form submitted |
| `page_<name>` | Navigation | Page viewed |
| `api_error` | API | Any API call failed |
| `api_error_<METHOD>_<endpoint>` | API | Specific endpoint failed |
| `api_success` | API | API call succeeded (optional) |

---

## 9. How to Use in Clarity Dashboard

### View Tags
**Recordings → click a session → "Customised tags"** section shows all tags for that session.

### View Events
**Settings → Smart Events** — all API events are listed here. Events also appear on the **recording playback timeline** as markers.

### Filter Sessions
Use **Filters → Customised filters** to filter by any tag (e.g., `username = test_vendor`, `api_error_status = 500`).

### Build Funnels
Use the `so_funnel_*` events to create funnels:
`so_funnel_claimed → so_funnel_arrived → so_funnel_in_progress → so_funnel_completed`

This shows drop-off at each stage of the service order lifecycle.

### Identify Users
**Filters → User info → Clarity user ID** — enter a vendor ID to see all sessions for that technician.

---

## 10. Console Logging

All tracking calls log to the browser console with the `[Clarity]` prefix for debugging:

```
[Clarity] Identify: userId=vendor-1, sessionId=session_vendor-1_1719250000
[Clarity] Tag: username = test_vendor
[Clarity] Tag: user_role = registered_user
[Clarity] Event: login_success
[Clarity] Event: api_error
```

---

## 11. Architecture

```
index.html                    ← Clarity script (loads async)
    │
    ▼
clarityTracking.ts            ← Centralized utility (all functions)
    │
    ├── AuthContext.tsx        ← Login/Logout/Session restore
    ├── AssignmentsPage.tsx    ← All assignment actions
    ├── AccountPage.tsx        ← Profile + Feedback
    ├── JobDetailPage.tsx      ← Job claim
    ├── JobCompletePage.tsx    ← Job completion
    ├── AssignmentDetailPage   ← Status updates
    └── apiService.ts          ← API error interceptor (automatic)
```
