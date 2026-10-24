export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          user_id: string
          plans: Json
          settings: Json
          depot: Json
          roster_synced_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          plans?: Json
          settings?: Json
          depot?: Json
          roster_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          plans?: Json
          settings?: Json
          depot?: Json
          roster_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
