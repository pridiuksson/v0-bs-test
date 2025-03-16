"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Create a singleton for the Supabase client
let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing")
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return supabaseInstance
}

// For debugging - allows us to check if we're reusing the same instance
let instanceCount = 0

export function __getInstanceCount() {
  return instanceCount
}

// Reset the instance (useful for testing)
export function __resetSupabaseClient() {
  supabaseInstance = null
  instanceCount = 0
}

