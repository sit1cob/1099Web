# GA4 DataLayer Events — KRIS 1099 Web Portal

**GTM Container ID:** `GTM-KD6BK34Z`
**Implementation File:** `src/utils/ga4DataLayer.ts`
**Last Updated:** August 31, 2026

All events are pushed to `window.dataLayer` and captured by GTM for forwarding to GA4.

---

## 1. Authentication Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `login` | Successful vendor login | `method`, `user_id`, `vendor_id`, `vendor_name`, `user_role`, `user_zip_code`, `user_city`, `user_state`, `user_phone` | `AuthContext.tsx` |
| `user_profile_loaded` | Vendor profile API response received (fires once per app lifecycle) | `vendor_name`, `user_zip_code`, `user_city`, `user_state`, `user_phone`, `user_email`, `user_address` | `Layout.tsx` |
| `login_failed` | Failed login attempt | `user_id`, `error_message` | `AuthContext.tsx` |
| `logout` | User logs out | `user_id`, `vendor_id`, `vendor_name`, `user_role`, `user_zip_code`, `user_city`, `user_state`, `user_phone` | `AuthContext.tsx` |
| `session_restored` | Returning user detected on browser refresh/new tab (fires once per app lifecycle) | `user_id`, `vendor_id`, `vendor_name`, `user_role`, `user_zip_code`, `user_city`, `user_state` | `AuthContext.tsx` |

> **Note:** `session_restored` fires only once when the app initially loads with a stored session (browser refresh or new tab). It does **not** fire on in-app navigation or tab changes.

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `method` | string | `"vendor_id"` | Login method used |
| `user_id` | string | `"test_vendor"` | Username / Vendor ID |
| `vendor_id` | string | `"62"` | Numeric vendor ID |
| `vendor_name` | string | `"test_vendor"` | Vendor name or username/email as fallback |
| `user_role` | string | `"technician"` | User role |
| `user_zip_code` | string | `"33025"` | Technician's primary zip code |
| `user_city` | string | `"Hollywood"` | Technician's city |
| `user_state` | string | `"FL"` | Technician's state |
| `user_phone` | string | `"555-123-4567"` | Technician's phone number |
| `user_email` | string | `"tech@example.com"` | Technician's email address |
| `user_address` | string | `"123 Main St"` | Technician's street address |
| `error_message` | string | `"Invalid credentials"` | Login failure reason |

---

## 2. Navigation / Page View Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `page_view` | Every route change | `page_title`, `page_location`, `page_path` | `Layout.tsx` |

### Page Name Mapping

| Path | Page Title | Source |
|---|---|---|
| `/login` | Login | `LoginPage.tsx` |
| `/` | Dashboard | `Layout.tsx` |
| `/assignments` | My Jobs | `Layout.tsx` |
| `/assignments/:id` | Assignment Detail | `Layout.tsx` |
| `/assignments/:id/complete` | Job Complete | `Layout.tsx` |
| `/assignments/:id/complete-success` | Job Complete Success | `Layout.tsx` |
| `/assignments/:id/reschedule` | Reschedule | `Layout.tsx` |
| `/assignments/:id/customer-not-home` | Customer Not Home | `Layout.tsx` |
| `/available-jobs` | Available Jobs | `Layout.tsx` |
| `/jobs/:id` | Job Detail | `Layout.tsx` |
| `/parts` | Parts & Inventory | `Layout.tsx` |
| `/earnings` | Earnings | `Layout.tsx` |
| `/account` | Account | `Layout.tsx` |
| `/chat` | Chat AI | `Layout.tsx` |

---

## 3. Service Order Funnel Events

These events track the full lifecycle of a service order assignment.

| Event Name | Trigger | Parameters | Source File(s) |
|---|---|---|---|
| `so_viewed` | Technician opens an assignment detail | `assignment_id`, `so_number`, `appliance_type` | `AssignmentsPage.tsx` |
| `so_claimed` | Technician claims an available job | `assignment_id`, `so_number` | `AssignmentsPage.tsx`, `JobDetailPage.tsx` |
| `so_arrived` | Technician marks arrived at customer site | `assignment_id` | `AssignmentsPage.tsx` |
| `so_in_progress` | Job status changed to in_progress | `assignment_id` | `AssignmentsPage.tsx` |
| `so_completed` | Job completed successfully | `assignment_id`, `completion_type`, `repair_code` | `AssignmentsPage.tsx` |
| `so_rescheduled` | Job rescheduled | `assignment_id`, `reschedule_reason`, `new_scheduled_date` | `AssignmentsPage.tsx`, `ReschedulePage.tsx` |
| `so_customer_not_home` | Customer not home | `assignment_id`, `cnh_reason` | `AssignmentsPage.tsx` |
| `so_cancelled` | Job cancelled at door | `assignment_id`, `cancel_reason` | `AssignmentsPage.tsx` |
| `so_estimate_declined` | Customer declined estimate | `assignment_id`, `decline_reason` | `AssignmentsPage.tsx` |
| `so_status_change` | Generic status change | `assignment_id`, `new_status` | `AssignmentsPage.tsx`, `AssignmentDetailPage.tsx` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `assignment_id` | string | `"SO-13694840"` | Service order / assignment ID |
| `so_number` | string | `"13694840"` | Service order number |
| `appliance_type` | string | `"Washer"` | Appliance type for the service order |
| `completion_type` | string | `"Completed"` | How the job was completed |
| `repair_code` | string | `"Mechanical Failure"` | Repair diagnosis code |
| `reschedule_reason` | string | `"parts_delayed"` | Reason for reschedule |
| `new_scheduled_date` | string | `"2026-06-10"` | New appointment date |
| `cnh_reason` | string | `"No Answer at Door"` | Customer not home reason |
| `cancel_reason` | string | `"Customer Declined"` | Cancellation reason |
| `decline_reason` | string | `"Cost Too High"` | Estimate decline reason |
| `new_status` | string | `"arrived"` | New status value |

---

## 4. Parts Events

| Event Name | Trigger | Parameters | Source File(s) |
|---|---|---|---|
| `part_added` | Part added to cart/order | `assignment_id`, `part_number`, `part_description` | `AssignmentsPage.tsx` |
| `part_deleted` | Part removed from order | `assignment_id`, `part_id` | `AssignmentsPage.tsx` |
| `parts_ordered` | Parts order submitted | `assignment_id`, `part_count`, `part_numbers`, `part_names` | `AssignmentsPage.tsx` |
| `part_tracked` | User opens part tracking | `assignment_id`, `tracking_number` | `PartsPage.tsx` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `part_number` | string | `"WP3949247"` | Part number |
| `part_description` | string | `"Timer Switch"` | Part description |
| `part_id` | string | `"draft-123-0"` | Internal part ID |
| `part_count` | number | `3` | Number of parts ordered |
| `part_numbers` | string | `"WP3949247, WP12345"` | Comma-separated part numbers |
| `part_names` | string | `"Timer Switch, Pump"` | Comma-separated part names (max 500 chars) |
| `tracking_number` | string | `"1Z999AA10123456784"` | Shipping tracking number |

---

## 5. Appliance Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `appliance_updated` | Technician updates appliance info (brand, model, serial) | `assignment_id`, `appliance_brand`, `appliance_model` | `AssignmentsPage.tsx` |

---

## 6. Dashboard Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `dashboard_loaded` | Dashboard data finished loading | `total_assignments`, `todays_jobs` | `DashboardPage.tsx` |
| `dashboard_refresh` | User refreshes dashboard | — | `DashboardPage.tsx` |
| `dashboard_card_click` | User clicks a dashboard card | `card_name` | `DashboardPage.tsx` |

---

## 7. Earnings Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `earnings_viewed` | User switches earnings period tab | `earnings_period` | `EarningsPage.tsx` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `earnings_period` | string | `"today"` / `"week"` / `"month"` / `"ytd"` | Selected earnings period |

---

## 8. Account & Profile Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `address_updated` | Technician updates firm address | — | `AccountPage.tsx` |
| `feedback_opened` | User opens feedback modal | — | `AccountPage.tsx` |
| `feedback_submitted` | User submits feedback form | `question_count`, `feedback_answers` | `AccountPage.tsx` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `question_count` | number | `5` | Number of questions answered |
| `feedback_answers` | string (JSON) | `[{"questionId":"q1","answer":"Great"}]` | Serialized answers (max 500 chars) |

---

## 9. Chat AI Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `chat_ai_opened` | User navigates to Chat AI page | — | `SashaChatPage.tsx` |
| `chat_ai_refreshed` | User refreshes Chat AI iframe | — | `SashaChatPage.tsx` |
| `chat_ai_opened_external` | User opens Chat AI in new window | — | `SashaChatPage.tsx` |

---

## 10. UI Interaction Events

| Event Name | Trigger | Parameters | Source File(s) |
|---|---|---|---|
| `tab_changed` | User switches a tab | `tab_name`, `tab_context` | `EarningsPage.tsx`, `PartsPage.tsx` |
| `search` | User performs a search | `search_term`, `search_context` | `AssignmentsPage.tsx` |
| `view_toggled` | User toggles list/calendar view | `view_type` | `AssignmentsPage.tsx` |
| `button_click` | Key button interaction | `button_name`, `click_context` | Various |
| `modal_opened` | Modal/popup/drawer opened | `modal_name` | Various |
| `modal_closed` | Modal dialog closed | `modal_name` | Various |

### Tracked Modals (`modal_name` values)

| `modal_name` | Description | Page |
|---|---|---|
| `mark_arrived_confirm` | Confirm mark arrived dialog | AssignmentsPage |
| `scan_edit_appliance` | Appliance scan/edit drawer | AssignmentsPage |
| `add_parts` | Add parts modal | AssignmentsPage |
| `reschedule_wizard` | Reschedule wizard | AssignmentsPage |
| `complete_job` | Complete job modal | AssignmentsPage |
| `log_non_sears_job` | Log non-Sears job form | AssignmentsPage |
| `track_parts` | Track parts summary modal | AssignmentsPage |
| `track_part_detail` | Individual part tracking detail | AssignmentsPage |
| `edit_address` | Edit firm address form | AccountPage |
| `feedback_opened` | Feedback modal (via `ga4FeedbackOpened`) | AccountPage |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `tab_name` | string | `"week"` | Tab that was selected |
| `tab_context` | string | `"earnings"` / `"parts"` | Which tab group |
| `search_term` | string | `"washer"` | Search query text |
| `search_context` | string | `"assignments"` | Where the search happened |
| `view_type` | string | `"list"` / `"calendar"` | View mode |
| `button_name` | string | `"claim_job"` | Button identifier |
| `click_context` | string | `"job_detail"` | Where the click happened |
| `modal_name` | string | `"complete_job"` | Modal identifier |

---

## 11. Non-Sears Job Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `non_sears_job_created` | Technician logs a new non-Sears job | `job_source`, `appliance_type`, `appliance_brand`, `job_issue`, `job_zip_code`, `scheduled_date`, `client_type` | `AssignmentsPage.tsx` |
| `non_sears_job_updated` | Technician updates a non-Sears job | `job_id` | `AssignmentsPage.tsx` |

---

## 12. API Error Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `api_error` | Any API call returns an error | `api_method`, `api_endpoint`, `api_status`, `error_message` | `apiService.ts` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `api_method` | string | `"GET"` | HTTP method |
| `api_endpoint` | string | `"/api/vendors/me/assignments"` | API endpoint path |
| `api_status` | number | `500` | HTTP status code |
| `error_message` | string | `"Network Error"` | Error description (max 100 chars) |

---

## 13. Clarity Integration Events

| Event Name | Trigger | Parameters | Source File |
|---|---|---|---|
| `clarity_initialized` | Microsoft Clarity SDK finishes loading (detected via `_clsk` / `_clck` cookies) | `clarity_user_id`, `clarity_session_id` | `clarityTracking.ts` |

### Parameter Details

| Parameter | Type | Example | Description |
|---|---|---|---|
| `clarity_user_id` | string | `"abc123xyz"` | Clarity anonymous user ID (from `_clck` cookie) |
| `clarity_session_id` | string | `"def456uvw"` | Clarity session ID (from `_clsk` cookie) |

---

## Deduplication

A dedup guard in `pushEvent()` prevents the same event from firing twice within 300ms (handles React StrictMode double-rendering in dev). Additionally, `session_restored` and `dashboard_loaded` use `useRef` guards to ensure they fire only once per app lifecycle.

---

## GTM Configuration Notes

1. All events use `window.dataLayer.push({ event: 'event_name', ...params })`
2. Create a **GA4 Event** tag in GTM for each event or use a catch-all tag with a custom event trigger
3. Map event parameters as **Event Parameters** in the GA4 tag configuration
4. Recommended **Custom Dimensions** to register in GA4:
   - `user_id` (User scope)
   - `vendor_id` (User scope)
   - `user_zip_code` (User scope)
   - `assignment_id` (Event scope)
   - `completion_type` (Event scope)
   - `reschedule_reason` (Event scope)
   - `api_endpoint` (Event scope)
   - `modal_name` (Event scope)
   - `feedback_answers` (Event scope)

## Event Flow (Service Order Funnel)

```
so_viewed → so_claimed → so_arrived → so_in_progress → so_completed
                                         → so_rescheduled
                                         → so_customer_not_home
                                         → so_cancelled
                                         → so_estimate_declined
```
