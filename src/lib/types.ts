export type SubscriptionPlan = "free" | "pro" | "enterprise";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

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
  default_hourly_rate?: number;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  hourly_rate?: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  tenant_id: string;
  client_id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
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
  };
  assigned_user?: Profile;
  created_user?: Profile;
}

export interface TicketComment {
  id: string;
  tenant_id: string;
  ticket_id: string;
  content: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  created_user?: Profile;
}

export interface TimeEntry {
  id: string;
  tenant_id: string;
  ticket_id: string;
  user_id: string;
  description?: string;
  hours: number;
  is_billable: boolean;
  entry_date: string;
  created_at: string;
  updated_at: string;
  ticket?: Ticket;
  user?: Profile;
}

// Form types
export interface CreateClientForm {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface CreateTicketForm {
  client_id: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  estimated_hours?: number;
  due_date?: string;
}

export interface CreateTimeEntryForm {
  ticket_id: string;
  description?: string;
  hours: number;
  is_billable: boolean;
  entry_date: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

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
  client?: Client;
  line_items?: InvoiceLineItem[];
  recurrence_rule?: RecurrenceRule;
  next_run_at?: string;
}

export type RecurrenceRule = "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringInvoice extends Invoice {
  recurrence_rule: RecurrenceRule;
  next_run_at: string;
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

export interface PaymentMethodForm {
  method_type: string;
  display_name: string;
  instructions?: string;
  payment_link_template?: string;
  is_active: boolean;
  sort_order: number;
}
