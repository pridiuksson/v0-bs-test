"use client"

import { useAuth } from "@/context/auth-context"
import AuthForm from "./auth-form"
import UserProfile from "./user-profile"
import { Loader2 } from "lucide-react"

export default function AuthContainer() {
  // Always call hooks at the top level
  const { user, loading } = useAuth()

  // Render based on state
  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        <UserProfile />
      ) : (
        <AuthForm />
      )}
    </div>
  )
}

