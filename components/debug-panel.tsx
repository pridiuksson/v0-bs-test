"use client"

import { useState, useEffect, useRef } from "react"
import { useLogs, type LogEntry } from "@/context/log-context"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, Database, User } from "lucide-react"
import { SupabaseService, DEFAULT_BUCKET_NAME } from "@/lib/supabase-service"

export default function DebugPanel() {
  const { logs, clearLogs, addLog } = useLogs()
  const { user } = useAuth()
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "error">("checking")
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [bucketStatus, setBucketStatus] = useState<"checking" | "exists" | "error" | "not-checked">("not-checked")
  const [bucketError, setBucketError] = useState<string | null>(null)
  const [bucketDetails, setBucketDetails] = useState<any>(null)

  // Create a ref for the Supabase service - initialize it immediately to avoid conditional hooks
  const supabaseService = useRef<SupabaseService>(new SupabaseService())

  // Initialize the service and check connection on mount
  useEffect(() => {
    // Set the logger after the component has mounted
    supabaseService.current.setLogger(addLog)

    // Check connection
    checkSupabaseConnection()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkSupabaseConnection = async () => {
    try {
      setSupabaseStatus("checking")
      setSupabaseError(null)

      const { success, error } = await supabaseService.current.testConnection()

      if (success) {
        setSupabaseStatus("connected")
      } else {
        setSupabaseStatus("error")
        setSupabaseError(error instanceof Error ? error.message : JSON.stringify(error))
      }
    } catch (error) {
      setSupabaseStatus("error")
      setSupabaseError(error instanceof Error ? error.message : String(error))
    }
  }

  const checkBucketStatus = async () => {
    try {
      setBucketStatus("checking")
      setBucketError(null)
      setBucketDetails(null)

      // Check if bucket exists
      addLog(`Checking if bucket '${DEFAULT_BUCKET_NAME}' exists`, "info")
      const bucketExists = await supabaseService.current.ensureBucketExists()

      if (bucketExists) {
        setBucketStatus("exists")

        // Get additional bucket details
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const bucketUrl = `${supabaseUrl}/storage/v1/object/public/${DEFAULT_BUCKET_NAME}`

        setBucketDetails({
          name: DEFAULT_BUCKET_NAME,
          url: bucketUrl,
        })

        addLog(`Bucket '${DEFAULT_BUCKET_NAME}' exists and is accessible`, "success")
      } else {
        setBucketStatus("error")
        setBucketError(`Failed to ensure bucket '${DEFAULT_BUCKET_NAME}' exists`)
        addLog(`Failed to ensure bucket '${DEFAULT_BUCKET_NAME}' exists`, "error")
      }
    } catch (error) {
      setBucketStatus("error")
      setBucketError(error instanceof Error ? error.message : String(error))
      addLog(`Error checking bucket status: ${error instanceof Error ? error.message : String(error)}`, "error", error)
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Debug Information</h2>
        <Button variant="outline" size="sm" onClick={clearLogs}>
          Clear Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Authentication Status */}
        <div className="bg-gray-50 border rounded-md p-4">
          <h3 className="text-md font-medium mb-2">Authentication Status</h3>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <User className="h-5 w-5 text-green-500" />
                <div>
                  <span className="text-green-700">Authenticated</span>
                  <p className="text-xs text-gray-600 mt-1">User ID: {user.id}</p>
                  <p className="text-xs text-gray-600">Email: {user.email}</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="text-amber-700">Not Authenticated</span>
              </>
            )}
          </div>
        </div>

        {/* Supabase Connection Status */}
        <div className="bg-gray-50 border rounded-md p-4">
          <h3 className="text-md font-medium mb-2">Supabase Connection Status</h3>
          <div className="flex items-center gap-2">
            {supabaseStatus === "checking" && (
              <>
                <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                <span>Checking connection...</span>
              </>
            )}
            {supabaseStatus === "connected" && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Connected to Supabase</span>
              </>
            )}
            {supabaseStatus === "error" && (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Connection Error</span>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={checkSupabaseConnection}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          {supabaseStatus === "error" && supabaseError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800 whitespace-pre-wrap">
              {supabaseError}
            </div>
          )}
        </div>

        {/* Bucket Status */}
        <div className="bg-gray-50 border rounded-md p-4">
          <h3 className="text-md font-medium mb-2">Storage Bucket Status</h3>
          <div className="flex items-center gap-2">
            {bucketStatus === "not-checked" && (
              <>
                <Database className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">Not Checked</span>
              </>
            )}
            {bucketStatus === "checking" && (
              <>
                <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                <span>Checking bucket...</span>
              </>
            )}
            {bucketStatus === "exists" && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Bucket Exists</span>
              </>
            )}
            {bucketStatus === "error" && (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Bucket Error</span>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={checkBucketStatus}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Check Bucket
            </Button>
          </div>

          {bucketStatus === "exists" && bucketDetails && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <p>
                <strong>Bucket Name:</strong> {bucketDetails.name}
              </p>
              <p className="mt-1">
                <strong>Bucket URL:</strong> <span className="text-xs break-all">{bucketDetails.url}</span>
              </p>
            </div>
          )}

          {bucketStatus === "error" && bucketError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800 whitespace-pre-wrap">
              {bucketError}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-md font-medium mb-2">Application Logs</h3>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 border rounded-md">No logs to display</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      Time
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20"
                    >
                      Level
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log: LogEntry) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {getLogIcon(log.level)}
                          <span className="ml-1 text-xs capitalize text-gray-700">{log.level}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div>
                          {log.message}
                          {log.details && (
                            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {typeof log.details === "object"
                                ? JSON.stringify(log.details, null, 2)
                                : String(log.details)}
                            </pre>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

