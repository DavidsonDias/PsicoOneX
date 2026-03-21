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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          duration_minutes: number | null
          google_event_id: string | null
          id: string
          notes: string | null
          patient_id: string
          psychologist_id: string
          recurrence_end_date: string | null
          recurrence_parent_id: string | null
          recurrence_type: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          session_value: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          duration_minutes?: number | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          psychologist_id: string
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          recurrence_type?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          session_value?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          duration_minutes?: number | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          psychologist_id?: string
          recurrence_end_date?: string | null
          recurrence_parent_id?: string | null
          recurrence_type?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          session_value?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          clinic_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          clinic_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          clinic_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          attachment_url: string | null
          category: string | null
          cost_center: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_status: string | null
          paid_date: string | null
          patient_id: string
          payment_method: string | null
          psychologist_id: string
          receipt_url: string | null
          status: string | null
          tax_amount: number | null
          tax_rate: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          attachment_url?: string | null
          category?: string | null
          cost_center?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_status?: string | null
          paid_date?: string | null
          patient_id: string
          payment_method?: string | null
          psychologist_id: string
          receipt_url?: string | null
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          attachment_url?: string | null
          category?: string | null
          cost_center?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_status?: string | null
          paid_date?: string | null
          patient_id?: string
          payment_method?: string | null
          psychologist_id?: string
          receipt_url?: string | null
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          auto_create: boolean | null
          auto_update: boolean | null
          calendar_id: string | null
          created_at: string | null
          google_email: string | null
          id: string
          refresh_token: string
          sync_enabled: boolean | null
          sync_new_only: boolean | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          auto_create?: boolean | null
          auto_update?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token: string
          sync_enabled?: boolean | null
          sync_new_only?: boolean | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          auto_create?: boolean | null
          auto_update?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token?: string
          sync_enabled?: boolean | null
          sync_new_only?: boolean | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medical_record_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          medical_record_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          medical_record_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          medical_record_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_attachments_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          complaints: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          evolution: string | null
          id: string
          next_steps: string | null
          observations: string | null
          patient_id: string
          psychologist_id: string
          session_date: string
          session_number: number | null
          techniques_used: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          complaints?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          evolution?: string | null
          id?: string
          next_steps?: string | null
          observations?: string | null
          patient_id: string
          psychologist_id: string
          session_date: string
          session_number?: number | null
          techniques_used?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          complaints?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          evolution?: string | null
          id?: string
          next_steps?: string | null
          observations?: string | null
          patient_id?: string
          psychologist_id?: string
          session_date?: string
          session_number?: number | null
          techniques_used?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_path: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_path?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_path?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          default_session_value: number | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          id: string
          monthly_plan_value: number | null
          notes: string | null
          payment_day: number | null
          phone: string | null
          psychologist_id: string
          status: string | null
          treatment_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          default_session_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          id?: string
          monthly_plan_value?: number | null
          notes?: string | null
          payment_day?: number | null
          phone?: string | null
          psychologist_id: string
          status?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          default_session_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          id?: string
          monthly_plan_value?: number | null
          notes?: string | null
          payment_day?: number | null
          phone?: string | null
          psychologist_id?: string
          status?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          avatar_url: string | null
          clinic_name: string | null
          created_at: string | null
          crp: string | null
          full_name: string
          id: string
          onboarding_completed: boolean
          phone: string | null
          preferred_clinical_style: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          clinic_name?: string | null
          created_at?: string | null
          crp?: string | null
          full_name: string
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_clinical_style?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          clinic_name?: string | null
          created_at?: string | null
          crp?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          preferred_clinical_style?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          plan_expires_at: string | null
          plan_started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end_date: string | null
          trial_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          plan_started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_expires_at?: string | null
          plan_started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          trial_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_metadata: {
        Row: {
          architecture: string
          build_timestamp: string
          created_at: string | null
          developed_by: string
          id: string
          system_signature: string
          system_type: string
        }
        Insert: {
          architecture?: string
          build_timestamp?: string
          created_at?: string | null
          developed_by?: string
          id?: string
          system_signature?: string
          system_type?: string
        }
        Update: {
          architecture?: string
          build_timestamp?: string
          created_at?: string | null
          developed_by?: string
          id?: string
          system_signature?: string
          system_type?: string
        }
        Relationships: []
      }
      telehealth_sessions: {
        Row: {
          ai_summary: string | null
          appointment_id: string | null
          chat_messages: Json | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          medical_record_id: string | null
          patient_id: string | null
          psychologist_id: string
          room_token: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          appointment_id?: string | null
          chat_messages?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          medical_record_id?: string | null
          patient_id?: string | null
          psychologist_id: string
          room_token?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          appointment_id?: string | null
          chat_messages?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          medical_record_id?: string | null
          patient_id?: string | null
          psychologist_id?: string
          room_token?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_sessions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trial_end: { Args: { start_date: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      restore_deleted_record: {
        Args: { _entity_id: string; _entity_type: string; _restored_by: string }
        Returns: boolean
      }
      validate_system_signature: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "psychologist" | "secretary" | "super_admin"
      plan_type: "trial" | "basic" | "pro" | "enterprise"
      subscription_status:
        | "active"
        | "trial"
        | "expired"
        | "blocked"
        | "suspended"
        | "cancelled"
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
      app_role: ["admin", "psychologist", "secretary", "super_admin"],
      plan_type: ["trial", "basic", "pro", "enterprise"],
      subscription_status: [
        "active",
        "trial",
        "expired",
        "blocked",
        "suspended",
        "cancelled",
      ],
    },
  },
} as const
