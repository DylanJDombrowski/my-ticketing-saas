export type SubscriptionPlan = "free" | "pro" | "enterprise";

// Legacy types - Tasks/Tickets system removed
// Kept for backwards compatibility during migration
export type TaskStatus = "open" | "in_progress" | "resolved" | "closed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = TaskStatus;
export type TicketPriority = TaskPriority;

export interface Tenant {
  id: string;
  name: string;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  default_hourly_rate?: number | null;
  created_at: string;
  updated_at: string;
  // Stripe Connect
  stripe_account_id?: string;
  stripe_account_status?: string;
  stripe_onboarding_completed?: boolean;
  default_payment_instructions?: string;
  // Relations
  tenant?: Tenant;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  hourly_rate?: number | null;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// DEPRECATED: Task/Ticket system removed
// Kept for backwards compatibility only
// ============================================

/** @deprecated Tasks system removed - use direct time entries instead */
export interface Task {
  id: string;
  tenant_id: string;
  client_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours: number;
  due_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    email: string;
    company?: string;
    hourly_rate?: number | null;
  };
  assigned_user?: Profile;
  created_user?: Profile;
}

/** @deprecated Task comments removed with tasks system */
export interface TaskComment {
  id: string;
  tenant_id: string;
  task_id: string;
  content: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  created_user?: Profile;
}

/** @deprecated Use Task type instead (kept for migration) */
export type Ticket = Task;
/** @deprecated Use TaskComment type instead (kept for migration) */
export type TicketComment = TaskComment;

export interface TimeEntry {
  id: string;
  tenant_id: string;
  client_id: string;  // Direct client association (no task required)
  profile_id: string;
  invoice_id?: string;  // Optional: link to invoice
  description?: string;
  hours: number;
  is_billable: boolean;
  entry_date: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  user?: Profile;
  invoice?: Invoice;
  // Legacy fields - kept for backwards compatibility
  /** @deprecated Task system removed */
  task_id?: string;
  /** @deprecated Task system removed */
  task?: Task;
  /** @deprecated Use task instead */
  ticket?: Task;
  /** @deprecated Use task_id instead */
  ticket_id?: string;
}

// Form types
export interface CreateClientForm {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  hourly_rate?: number;
}

/** @deprecated Task system removed */
export interface CreateTaskForm {
  client_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  estimated_hours?: number;
  due_date?: string;
}

/** @deprecated Task system removed */
export type CreateTicketForm = CreateTaskForm;

export interface CreateTimeEntryForm {
  client_id: string;  // Direct client selection (no task required)
  description?: string;
  hours: number;
  is_billable: boolean;
  entry_date: string;
  invoice_id?: string;  // Optional: attach to existing invoice
  // Legacy field - kept for backwards compatibility
  /** @deprecated Task system removed */
  task_id?: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled";
export type PaymentMethodType = "stripe" | "manual" | "wire" | "check" | "crypto" | "other";

export interface Invoice {
  id: string;
  tenant_id: string;
  client_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date?: string;
  payment_instructions?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Payment tracking
  payment_method?: PaymentMethodType;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  sent_at?: string;
  sent_to_email?: string;
  paid_at?: string;
  amount_paid?: number;
  // Reminder tracking (new for "Bug Client" feature)
  last_reminder_sent_at?: string;
  reminder_count?: number;
  // Relations
  client?: Client;
  line_items?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  time_entry_id: string;
  description?: string;
  hours: number;
  rate: number;
  amount: number;
  created_at: string;
  time_entry?: TimeEntry;
}

// Manual payment methods (bank, venmo, etc.)
export interface UserPaymentMethod {
  id: string;
  profile_id: string;
  tenant_id: string;
  method_type: PaymentMethodType;
  method_name?: string;
  instructions: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodForm {
  method_type: PaymentMethodType;
  method_name?: string;
  instructions: string;
  is_default?: boolean;
}

// Stripe Connect account
export interface StripeConnectAccount {
  id: string;
  profile_id: string;
  tenant_id: string;
  stripe_account_id: string;
  account_status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  country?: string;
  currency?: string;
  business_type?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

// Legacy payment method type (keeping for backwards compatibility)
export interface PaymentMethod {
  id: string;
  tenant_id: string;
  method_type: string;
  display_name: string;
  instructions?: string;
  payment_link_template?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateInvoiceForm {
  client_id: string;
  time_entry_ids: string[];
  due_date?: string;
  tax_rate?: number;
  payment_instructions?: string;
  notes?: string;
}

export interface InvoiceFormData {
  client_id: string;
  selectedTimeEntries: TimeEntry[];
  due_date: string;
  tax_rate: number;
  payment_instructions: string;
  notes: string;
}

// Sprint 4: Business Automation Types
export type NotificationType = "invoice_sent" | "invoice_overdue" | "task_comment";
export type NotificationStatus = "pending" | "sent" | "failed";

// Client Portal Access
export interface ClientPortalAccess {
  id: string;
  client_id: string;
  access_token: string;
  expires_at?: string;
  last_accessed?: string;
  is_active: boolean;
  created_at: string;
  client?: Client;
}

// Notification Log
export interface NotificationLog {
  id: string;
  tenant_id: string;
  recipient_email: string;
  notification_type: NotificationType;
  subject?: string;
  message_body?: string;
  status: NotificationStatus;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

// Forms for Sprint 4 features
export interface AutoInvoiceGenerationForm {
  client_id: string;
  date_range_start: string;
  date_range_end: string;
  include_non_billable: boolean;
  send_notification: boolean;
}

// Stripe Payment Types
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded";

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
}

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

export interface CreatePaymentIntentRequest {
  invoice_id: string;
  amount: number;
  currency?: string;
}
