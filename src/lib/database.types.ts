export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          hours: number
          id: string
          invoice_id: string
          rate: number
          time_entry_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          hours: number
          id?: string
          invoice_id: string
          rate: number
          time_entry_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          hours?: number
          id?: string
          invoice_id?: string
          rate?: number
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          payment_instructions: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          payment_instructions?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          payment_instructions?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          instructions: string | null
          is_active: boolean | null
          method_type: string
          payment_link_template: string | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          method_type: string
          payment_link_template?: string | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          method_type?: string
          payment_link_template?: string | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          default_hourly_rate: number | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_hourly_rate?: number | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_hourly_rate?: number | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          tenant_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tenant_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tenant_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          entry_date: string
          hours: number
          id: string
          is_billable: boolean | null
          tenant_id: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entry_date: string
          hours: number
          id?: string
          is_billable?: boolean | null
          tenant_id: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entry_date?: string
          hours?: number
          id?: string
          is_billable?: boolean | null
          tenant_id?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_with_tenant: {
        Args: {
          first_name?: string
          last_name?: string
          tenant_name: string
          user_email: string
          user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      subscription_plan: "free" | "pro" | "enterprise"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_plan: ["free", "pro", "enterprise"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
