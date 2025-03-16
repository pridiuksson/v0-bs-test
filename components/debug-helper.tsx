"use client"

import { useEffect, useState } from "react"
import { __getInstanceCount } from "@/lib/supabase-client"

export default function DebugHelper() {
  const [instanceCount, setInstanceCount] = useState(0)

  useEffect(() => {
    // Update instance count every second
    const interval = setInterval(() => {
      setInstanceCount(__getInstanceCount())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Supabase Instances: {instanceCount}</div>
    </div>
  )
}

