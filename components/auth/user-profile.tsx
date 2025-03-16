"use client"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"

export default function UserProfile() {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
  }

  if (!user) return null

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-gray-500">Signed in</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Signing Out...
            </>
          ) : (
            "Sign Out"
          )}
        </Button>
      </div>
    </div>
  )
}

