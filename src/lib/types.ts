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
  client?: Client;
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
