export interface Database {
  public: {
    Tables: {
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
