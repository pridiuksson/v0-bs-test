"use client"

import { Tabs } from "@/components/tabs"
import NinePictureGrid from "@/components/nine-picture-grid"
import DebugPanel from "@/components/debug-panel"
import AuthContainer from "@/components/auth/auth-container"
import { useAuth } from "@/context/auth-context"

export default function NinePictureGridApp() {
  const { user } = useAuth()

  const tabs = [
    {
      id: "grid",
      label: "Grid",
      content: <NinePictureGrid />,
    },
    {
      id: "auth",
      label: "Account",
      content: <AuthContainer />,
    },
    {
      id: "debug",
      label: "Debug",
      content: <DebugPanel />,
    },
  ]

  return (
    <div className="space-y-4">
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Authentication Required:</strong> You need to sign in or create an account to upload images. Please
            go to the <strong>Account</strong> tab to sign in or sign up.
          </p>
        </div>
      )}
      <Tabs tabs={tabs} defaultTabId="grid" />
    </div>
  )
}

