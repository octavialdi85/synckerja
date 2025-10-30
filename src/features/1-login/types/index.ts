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
          order: number
          priority: string | null
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
          order?: number
          priority?: string | null
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
          order?: number
          priority?: string | null
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
        }
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
