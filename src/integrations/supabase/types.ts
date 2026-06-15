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
      appointment_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_role: string
          sender_user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_role: string
          sender_user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          message: string | null
          patient_id: string
          proposed_date: string | null
          psychologist_id: string
          psychologist_response: string | null
          reason: string | null
          request_type: string
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          message?: string | null
          patient_id: string
          proposed_date?: string | null
          psychologist_id: string
          psychologist_response?: string | null
          reason?: string | null
          request_type: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          message?: string | null
          patient_id?: string
          proposed_date?: string | null
          psychologist_id?: string
          psychologist_response?: string | null
          reason?: string | null
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          duration_minutes: number | null
          google_event_id: string | null
          id: string
          meeting_status: string | null
          notes: string | null
          patient_cancelled_at: string | null
          patient_confirmed_at: string | null
          patient_id: string
          psychologist_id: string
          recurrence_end_date: string | null
          recurrence_extended_until: string | null
          recurrence_open_ended: boolean
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
          cancellation_reason?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          duration_minutes?: number | null
          google_event_id?: string | null
          id?: string
          meeting_status?: string | null
          notes?: string | null
          patient_cancelled_at?: string | null
          patient_confirmed_at?: string | null
          patient_id: string
          psychologist_id: string
          recurrence_end_date?: string | null
          recurrence_extended_until?: string | null
          recurrence_open_ended?: boolean
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
          cancellation_reason?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          duration_minutes?: number | null
          google_event_id?: string | null
          id?: string
          meeting_status?: string | null
          notes?: string | null
          patient_cancelled_at?: string | null
          patient_confirmed_at?: string | null
          patient_id?: string
          psychologist_id?: string
          recurrence_end_date?: string | null
          recurrence_extended_until?: string | null
          recurrence_open_ended?: boolean
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
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          psychologist_id: string
          trigger_config: Json
          trigger_count: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          psychologist_id: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          psychologist_id?: string
          trigger_config?: Json
          trigger_count?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          is_recurring: boolean
          paid_date: string | null
          patient_id: string
          payment_link_sent_at: string | null
          payment_method: string | null
          psychologist_id: string
          receipt_url: string | null
          recurrence_parent_id: string | null
          reminder_count: number
          reminder_sent_at: string | null
          status: string | null
          stripe_paid_at: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_link: string | null
          stripe_payment_link_id: string | null
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
          is_recurring?: boolean
          paid_date?: string | null
          patient_id: string
          payment_link_sent_at?: string | null
          payment_method?: string | null
          psychologist_id: string
          receipt_url?: string | null
          recurrence_parent_id?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          status?: string | null
          stripe_paid_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          stripe_payment_link_id?: string | null
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
          is_recurring?: boolean
          paid_date?: string | null
          patient_id?: string
          payment_link_sent_at?: string | null
          payment_method?: string | null
          psychologist_id?: string
          receipt_url?: string | null
          recurrence_parent_id?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          status?: string | null
          stripe_paid_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          stripe_payment_link_id?: string | null
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
      integration_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          integration_id: string
          is_active: boolean
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          integration_id: string
          is_active?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          integration_id?: string
          is_active?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
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
      medical_record_versions: {
        Row: {
          change_reason: string | null
          content: Json
          created_at: string
          created_by: string
          id: string
          record_id: string
          title: string | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          content: Json
          created_at?: string
          created_by: string
          id?: string
          record_id: string
          title?: string | null
          version_number: number
        }
        Update: {
          change_reason?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          record_id?: string
          title?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_versions_record_id_fkey"
            columns: ["record_id"]
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
          is_favorite: boolean
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
          is_favorite?: boolean
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
          is_favorite?: boolean
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
          category: string
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
          category?: string
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
          category?: string
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
      patient_access_links: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_revoked: boolean
          patient_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_revoked?: boolean
          patient_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          patient_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_access_links_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_access_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_billing_plans: {
        Row: {
          active: boolean
          amount: number
          billing_type: string
          created_at: string
          day_of_month: number | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          last_generated_at: string | null
          patient_id: string
          payment_method: string | null
          psychologist_id: string
          sessions_per_cycle: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          billing_type: string
          created_at?: string
          day_of_month?: number | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          last_generated_at?: string | null
          patient_id: string
          payment_method?: string | null
          psychologist_id: string
          sessions_per_cycle?: number | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          billing_type?: string
          created_at?: string
          day_of_month?: number | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          last_generated_at?: string | null
          patient_id?: string
          payment_method?: string | null
          psychologist_id?: string
          sessions_per_cycle?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_billing_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          is_revoked: boolean
          patient_id: string
          psychologist_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          patient_id: string
          psychologist_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          patient_id?: string
          psychologist_id?: string
          token?: string
        }
        Relationships: []
      }
      patient_onboarding_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          patient_id: string
          psychologist_id: string
          status: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          patient_id: string
          psychologist_id: string
          status?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          patient_id?: string
          psychologist_id?: string
          status?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      patient_portal_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          patient_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          patient_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          patient_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patient_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          patient_id: string
          previous_status: string | null
          psychologist_id: string
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          patient_id: string
          previous_status?: string | null
          psychologist_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          patient_id?: string
          previous_status?: string | null
          psychologist_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_status_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_number: string | null
          birth_date: string | null
          birth_place: string | null
          cep: string | null
          children: Json
          city: string | null
          cnh: string | null
          company: string | null
          complement: string | null
          cpf: string | null
          created_at: string | null
          default_session_value: number | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          education: string | null
          education_level: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          emergency_whatsapp: string | null
          father_name: string | null
          father_profession: string | null
          full_name: string
          gender: string | null
          health_plan: string | null
          health_plan_expiry: string | null
          health_plan_id: string | null
          id: string
          initial_demand: string | null
          lgpd_data_consent: boolean
          lgpd_privacy_consent: boolean
          lgpd_signature_data: string | null
          lgpd_signed_at: string | null
          lgpd_truth_declaration: boolean
          lifecycle_reason: string | null
          lifecycle_status: string
          lifecycle_updated_at: string | null
          marital_status: string | null
          medications: Json
          monthly_plan_value: number | null
          mother_name: string | null
          mother_profession: string | null
          neighborhood: string | null
          notes: string | null
          onboarding_completed_at: string | null
          onboarding_status: string
          payment_day: number | null
          permanent_room_token: string | null
          phone: string | null
          phone_residential: string | null
          portal_activated_at: string | null
          preferred_notification_channel: string
          prior_therapy: boolean | null
          prior_therapy_duration: string | null
          prior_therapy_reason: string | null
          prior_therapy_when: string | null
          profession: string | null
          profession_role: string | null
          psychologist_id: string
          recording_authorization: string | null
          religion: string | null
          rg: string | null
          rg_issuer: string | null
          siblings_brothers: number | null
          siblings_sisters: number | null
          signature_device: string | null
          signature_ip: string | null
          signature_timestamp: string | null
          social_name: string | null
          spouse_name: string | null
          spouse_relationship_time: string | null
          state: string | null
          status: string | null
          street: string | null
          treatment_start_date: string | null
          updated_at: string | null
          uploaded_documents: Json | null
          user_id: string | null
          uses_medication: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cep?: string | null
          children?: Json
          city?: string | null
          cnh?: string | null
          company?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          default_session_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          education?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          emergency_whatsapp?: string | null
          father_name?: string | null
          father_profession?: string | null
          full_name: string
          gender?: string | null
          health_plan?: string | null
          health_plan_expiry?: string | null
          health_plan_id?: string | null
          id?: string
          initial_demand?: string | null
          lgpd_data_consent?: boolean
          lgpd_privacy_consent?: boolean
          lgpd_signature_data?: string | null
          lgpd_signed_at?: string | null
          lgpd_truth_declaration?: boolean
          lifecycle_reason?: string | null
          lifecycle_status?: string
          lifecycle_updated_at?: string | null
          marital_status?: string | null
          medications?: Json
          monthly_plan_value?: number | null
          mother_name?: string | null
          mother_profession?: string | null
          neighborhood?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          payment_day?: number | null
          permanent_room_token?: string | null
          phone?: string | null
          phone_residential?: string | null
          portal_activated_at?: string | null
          preferred_notification_channel?: string
          prior_therapy?: boolean | null
          prior_therapy_duration?: string | null
          prior_therapy_reason?: string | null
          prior_therapy_when?: string | null
          profession?: string | null
          profession_role?: string | null
          psychologist_id: string
          recording_authorization?: string | null
          religion?: string | null
          rg?: string | null
          rg_issuer?: string | null
          siblings_brothers?: number | null
          siblings_sisters?: number | null
          signature_device?: string | null
          signature_ip?: string | null
          signature_timestamp?: string | null
          social_name?: string | null
          spouse_name?: string | null
          spouse_relationship_time?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
          uploaded_documents?: Json | null
          user_id?: string | null
          uses_medication?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cep?: string | null
          children?: Json
          city?: string | null
          cnh?: string | null
          company?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string | null
          default_session_value?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          education?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          emergency_whatsapp?: string | null
          father_name?: string | null
          father_profession?: string | null
          full_name?: string
          gender?: string | null
          health_plan?: string | null
          health_plan_expiry?: string | null
          health_plan_id?: string | null
          id?: string
          initial_demand?: string | null
          lgpd_data_consent?: boolean
          lgpd_privacy_consent?: boolean
          lgpd_signature_data?: string | null
          lgpd_signed_at?: string | null
          lgpd_truth_declaration?: boolean
          lifecycle_reason?: string | null
          lifecycle_status?: string
          lifecycle_updated_at?: string | null
          marital_status?: string | null
          medications?: Json
          monthly_plan_value?: number | null
          mother_name?: string | null
          mother_profession?: string | null
          neighborhood?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          payment_day?: number | null
          permanent_room_token?: string | null
          phone?: string | null
          phone_residential?: string | null
          portal_activated_at?: string | null
          preferred_notification_channel?: string
          prior_therapy?: boolean | null
          prior_therapy_duration?: string | null
          prior_therapy_reason?: string | null
          prior_therapy_when?: string | null
          profession?: string | null
          profession_role?: string | null
          psychologist_id?: string
          recording_authorization?: string | null
          religion?: string | null
          rg?: string | null
          rg_issuer?: string | null
          siblings_brothers?: number | null
          siblings_sisters?: number | null
          signature_device?: string | null
          signature_ip?: string | null
          signature_timestamp?: string | null
          social_name?: string | null
          spouse_name?: string | null
          spouse_relationship_time?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          treatment_start_date?: string | null
          updated_at?: string | null
          uploaded_documents?: Json | null
          user_id?: string | null
          uses_medication?: boolean | null
          whatsapp_phone?: string | null
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
          phone_is_whatsapp: boolean
          preferred_clinical_style: string | null
          specialty: string | null
          updated_at: string | null
          username: string | null
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
          phone_is_whatsapp?: boolean
          preferred_clinical_style?: string | null
          specialty?: string | null
          updated_at?: string | null
          username?: string | null
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
          phone_is_whatsapp?: boolean
          preferred_clinical_style?: string | null
          specialty?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_billings: {
        Row: {
          amount: number
          auto_send_link: boolean
          billing_day: number
          channel: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_run_date: string | null
          next_run_date: string
          patient_id: string
          psychologist_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          auto_send_link?: boolean
          billing_day: number
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date: string
          patient_id: string
          psychologist_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_send_link?: boolean
          billing_day?: number
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date?: string
          patient_id?: string
          psychologist_id?: string
          updated_at?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          host_notified_at: string | null
          id: string
          live_notes: string | null
          medical_record_id: string | null
          patient_id: string | null
          patient_joined_at: string | null
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
          host_notified_at?: string | null
          id?: string
          live_notes?: string | null
          medical_record_id?: string | null
          patient_id?: string | null
          patient_joined_at?: string | null
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
          host_notified_at?: string | null
          id?: string
          live_notes?: string | null
          medical_record_id?: string | null
          patient_id?: string | null
          patient_joined_at?: string | null
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
      user_preferences: {
        Row: {
          created_at: string
          dashboard_layout: Json
          primary_hue: number
          settings: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_layout?: Json
          primary_hue?: number
          settings?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_layout?: Json
          primary_hue?: number
          settings?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      whatsapp_config: {
        Row: {
          access_token: string | null
          app_id: string | null
          business_account_id: string | null
          business_name: string | null
          created_at: string
          display_phone_number: string | null
          id: string
          is_active: boolean
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          phone_number_id: string | null
          updated_at: string
          updated_by: string | null
          verify_token: string | null
          webhook_subscribed: boolean
        }
        Insert: {
          access_token?: string | null
          app_id?: string | null
          business_account_id?: string | null
          business_name?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          webhook_subscribed?: boolean
        }
        Update: {
          access_token?: string | null
          app_id?: string | null
          business_account_id?: string | null
          business_name?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          phone_number_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verify_token?: string | null
          webhook_subscribed?: boolean
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          appointment_id: string | null
          attempts: number
          body_preview: string | null
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          message_type: string
          patient_id: string | null
          payload: Json | null
          phone: string
          psychologist_id: string
          read_at: string | null
          response: Json | null
          sent_at: string | null
          status: string
          template: string | null
          updated_at: string
          wa_message_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          body_preview?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_type?: string
          patient_id?: string | null
          payload?: Json | null
          phone: string
          psychologist_id: string
          read_at?: string | null
          response?: Json | null
          sent_at?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          body_preview?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message_type?: string
          patient_id?: string | null
          payload?: Json | null
          phone?: string
          psychologist_id?: string
          read_at?: string | null
          response?: Json | null
          sent_at?: string | null
          status?: string
          template?: string | null
          updated_at?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_patient_invite: {
        Args: { _token: string; _user_id: string }
        Returns: string
      }
      calculate_trial_end: { Args: { start_date: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_notification_async: {
        Args: {
          _action_label?: string
          _action_path?: string
          _category: string
          _message: string
          _metadata?: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_appointment_email_status: {
        Args: { _appointment_ids: string[] }
        Returns: {
          appointment_id: string
          sent_at: string
          status: string
          template_name: string
        }[]
      }
      get_email_by_username: { Args: { _username: string }; Returns: string }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      restore_deleted_record: {
        Args: { _entity_id: string; _entity_type: string; _restored_by: string }
        Returns: boolean
      }
      validate_system_signature: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "psychologist"
        | "secretary"
        | "super_admin"
        | "patient"
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
      app_role: [
        "admin",
        "psychologist",
        "secretary",
        "super_admin",
        "patient",
      ],
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
