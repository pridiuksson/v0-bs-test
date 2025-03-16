"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { useLogs } from "./log-context"
import { getSupabaseClient } from "@/lib/supabase-client"

// Define the context type
type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>
  signOut: () => Promise<void>
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create a provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use the singleton Supabase client
  const supabase = getSupabaseClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { addLog } = useLogs()

  // Initialize the auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)
        addLog("Initializing authentication state", "info")

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (session) {
          setSession(session)
          setUser(session.user)
          addLog("User session restored", "success", {
            userId: session.user.id,
            email: session.user.email,
          })
        } else {
          addLog("No active session found", "info")
        }
      } catch (error) {
        addLog("Error initializing auth state", "error", error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog(`Auth state changed: ${event}`, "info")
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Clean up the subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, addLog])

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      addLog("Attempting to sign up user", "info", { email })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        addLog("Sign up failed", "error", error)
        return { success: false, error: error.message }
      }

      addLog("Sign up successful", "success", {
        userId: data.user?.id,
        email: data.user?.email,
      })

      return { success: true, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog("Exception during sign up", "error", error)
      return { success: false, error: errorMessage }
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      addLog("Attempting to sign in user", "info", { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        addLog("Sign in failed", "error", error)
        return { success: false, error: error.message }
      }

      addLog("Sign in successful", "success", {
        userId: data.user.id,
        email: data.user.email,
      })

      return { success: true, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      addLog("Exception during sign in", "error", error)
      return { success: false, error: errorMessage }
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      addLog("Signing out user", "info")
      await supabase.auth.signOut()
      addLog("User signed out successfully", "success")
    } catch (error) {
      addLog("Error signing out", "error", error)
    }
  }

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

