export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      daily_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          finish_date: string | null
          id: string
          objective_id: string | null
          organization_id: string
          plan_date: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finish_date?: string | null
          id?: string
          objective_id?: string | null
          organization_id: string
          plan_date?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          finish_date?: string | null
          id?: string
          objective_id?: string | null
          organization_id?: string
          plan_date?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_steps: {
        Row: {
          actual_hours: number | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          blocked_at: string | null
          blocked_by_dependencies: boolean | null
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          dependency_count: number | null
          estimated_hours: number | null
          has_dependencies: boolean | null
          id: string
          is_completed: boolean
          manual_completed_at: string | null
          manual_is_completed: boolean
          order: number
          priority: string | null
          social_media_plan_id: string | null
          started_at: string | null
          status: string | null
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          blocked_at?: string | null
          blocked_by_dependencies?: boolean | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          dependency_count?: number | null
          estimated_hours?: number | null
          has_dependencies?: boolean | null
          id?: string
          is_completed?: boolean
          manual_completed_at?: string | null
          manual_is_completed?: boolean
          order?: number
          priority?: string | null
          social_media_plan_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          blocked_at?: string | null
          blocked_by_dependencies?: boolean | null
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          dependency_count?: number | null
          estimated_hours?: number | null
          has_dependencies?: boolean | null
          id?: string
          is_completed?: boolean
          manual_completed_at?: string | null
          manual_is_completed?: boolean
          order?: number
          priority?: string | null
          social_media_plan_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string
          title?: string
          updated_at?: string
        }
      }
      task_files: {
        Row: {
          created_at: string
          file_size: number
          file_url: string
          filename: string
          id: string
          task_steps_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          file_url: string
          filename: string
          id?: string
          task_steps_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_url?: string
          filename?: string
          id?: string
          task_steps_id?: string
        }
      }
      deadline_history: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          new_deadline: string
          original_deadline: string
          reason: string | null
          requested_at: string | null
          requested_by: string | null
          status: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          new_deadline: string
          original_deadline: string
          reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          new_deadline?: string
          original_deadline?: string
          reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          task_id?: string
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          active_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          active_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          active_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_verification_tokens: {
        Row: {
          id: string
          user_id: string
          email_verified: boolean
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_verified?: boolean
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_verified?: boolean
          used_at?: string | null
          created_at?: string
        }
      }
      permission_configurations: {
        Row: {
          id: string
          organization_id: string | null
          page_path: string
          page_title: string
          is_active: boolean
          roles_allowed: string[] | null
          job_levels_allowed: string[] | null
          exceptions: string[] | null
          exception_paths: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          page_path: string
          page_title: string
          is_active?: boolean
          roles_allowed?: string[] | null
          job_levels_allowed?: string[] | null
          exceptions?: string[] | null
          exception_paths?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          page_path?: string
          page_title?: string
          is_active?: boolean
          roles_allowed?: string[] | null
          job_levels_allowed?: string[] | null
          exceptions?: string[] | null
          exception_paths?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          full_name: string
          email: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          company_name: string
          email: string | null
          phone_number: string | null
          address: string | null
          website: string | null
          description: string | null
          industry: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          description?: string | null
          industry?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          description?: string | null
          industry?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organization_meta_config: {
        Row: {
          id: string
          organization_id: string
          meta_access_token: string
          meta_business_manager_id: string | null
          whatsapp_business_account_id: string
          verify_token: string
          phone_number_id: string | null
          display_phone_number: string | null
          whatsapp_business_name: string | null
          name_status: string | null
          facebook_page_id: string | null
          facebook_verify_token: string | null
          instagram_business_account_id: string | null
          instagram_verify_token: string | null
          instagram_username: string | null
          instagram_name: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          meta_access_token: string
          meta_business_manager_id?: string | null
          whatsapp_business_account_id?: string
          verify_token?: string
          phone_number_id?: string | null
          display_phone_number?: string | null
          whatsapp_business_name?: string | null
          name_status?: string | null
          facebook_page_id?: string | null
          facebook_verify_token?: string | null
          instagram_business_account_id?: string | null
          instagram_verify_token?: string | null
          instagram_username?: string | null
          instagram_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          meta_access_token?: string
          meta_business_manager_id?: string | null
          whatsapp_business_account_id?: string
          verify_token?: string
          phone_number_id?: string | null
          display_phone_number?: string | null
          whatsapp_business_name?: string | null
          name_status?: string | null
          facebook_page_id?: string | null
          facebook_verify_token?: string | null
          instagram_business_account_id?: string | null
          instagram_verify_token?: string | null
          instagram_username?: string | null
          instagram_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_whatsapp_accounts: {
        Row: {
          id: string
          organization_id: string
          whatsapp_business_account_id: string
          phone_number_id: string
          meta_access_token: string | null
          display_phone_number: string | null
          whatsapp_business_name: string | null
          name_status: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          whatsapp_business_account_id: string
          phone_number_id: string
          meta_access_token?: string | null
          display_phone_number?: string | null
          whatsapp_business_name?: string | null
          name_status?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          whatsapp_business_account_id?: string
          phone_number_id?: string
          meta_access_token?: string | null
          display_phone_number?: string | null
          whatsapp_business_name?: string | null
          name_status?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          id: string
          organization_id: string
          customer_wa_id: string
          customer_name: string | null
          last_message_at: string | null
          phone_number_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_wa_id: string
          customer_name?: string | null
          last_message_at?: string | null
          phone_number_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          customer_wa_id?: string
          customer_name?: string | null
          last_message_at?: string | null
          phone_number_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          id: string
          conversation_id: string
          direction: string
          wa_message_id: string | null
          body: string | null
          message_type: string
          raw_metadata: Json | null
          created_at: string
          status: string | null
          status_updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          direction: string
          wa_message_id?: string | null
          body?: string | null
          message_type?: string
          raw_metadata?: Json | null
          created_at?: string
          status?: string | null
          status_updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          direction?: string
          wa_message_id?: string | null
          body?: string | null
          message_type?: string
          raw_metadata?: Json | null
          created_at?: string
          status?: string | null
          status_updated_at?: string | null
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          is_active: boolean
          joined_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          is_active?: boolean
          joined_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          is_active?: boolean
          joined_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      task_step_links: {
        Row: {
          id: string
          task_step_id: string
          title: string
          url: string
          created_at: string | null
          updated_at: string | null
          description?: string | null
          created_by?: string | null
          is_auto_synced?: boolean | null
          source_social_media_plan_id?: string | null
        }
        Insert: {
          id?: string
          task_step_id: string
          title: string
          url: string
          created_at?: string | null
          updated_at?: string | null
          description?: string | null
          created_by?: string | null
          is_auto_synced?: boolean | null
          source_social_media_plan_id?: string | null
        }
        Update: {
          id?: string
          task_step_id?: string
          title?: string
          url?: string
          created_at?: string | null
          updated_at?: string | null
          description?: string | null
          created_by?: string | null
          is_auto_synced?: boolean | null
          source_social_media_plan_id?: string | null
        }
      }
      task_step_history: {
        Row: {
          id: string
          task_step_id: string
          action_type: string
          old_value?: string | null
          new_value?: string | null
          description?: string | null
          blocker_type?: string | null
          blocker_severity?: string | null
          brief_type?: string | null
          created_at: string | null
          created_by?: string | null
          updated_at?: string | null
          task_steps_to_steps_id?: string | null
          is_resolved?: boolean | null
          organization_id?: string | null
          task_id?: string | null
          employee_id?: string | null
        }
        Insert: {
          id?: string
          task_step_id: string
          action_type: string
          old_value?: string | null
          new_value?: string | null
          description?: string | null
          blocker_type?: string | null
          blocker_severity?: string | null
          brief_type?: string | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          task_steps_to_steps_id?: string | null
          is_resolved?: boolean | null
          organization_id?: string | null
          task_id?: string | null
          employee_id?: string | null
        }
        Update: {
          id?: string
          task_step_id?: string
          action_type?: string
          old_value?: string | null
          new_value?: string | null
          description?: string | null
          blocker_type?: string | null
          blocker_severity?: string | null
          brief_type?: string | null
          created_at?: string | null
          created_by?: string | null
          updated_at?: string | null
          task_steps_to_steps_id?: string | null
          is_resolved?: boolean | null
          organization_id?: string | null
          task_id?: string | null
          employee_id?: string | null
        }
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_task_step_history_batch: {
        Args: {
          p_task_step_ids?: string[] | null
          p_sub_step_ids?: string[] | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Database['public']['Tables']['task_step_history']['Row'][]
      }
      get_task_step_history_batch_v2: {
        Args: {
          p_organization_id: string
          p_task_step_ids?: string[] | null
          p_sub_step_ids?: string[] | null
          p_limit?: number | null
          p_cursor_id?: string | null
          p_cursor_created_at?: string | null
        }
        Returns: Array<Database['public']['Tables']['task_step_history']['Row'] & {
          next_cursor_id?: string | null
          next_cursor_created_at?: string | null
          has_more?: boolean
        }>
      }
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
