"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

export type LogLevel = "info" | "warning" | "error" | "success"

export interface LogEntry {
  id: string
  timestamp: Date
  message: string
  level: LogLevel
  details?: any
}

interface LogContextType {
  logs: LogEntry[]
  addLog: (message: string, level: LogLevel, details?: any) => void
  clearLogs: () => void
}

const LogContext = createContext<LogContextType | undefined>(undefined)

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((message: string, level: LogLevel, details?: any) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
      level,
      details,
    }

    console.log(`[${level.toUpperCase()}] ${message}`, details || "")

    setLogs((prevLogs) => [newLog, ...prevLogs])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return <LogContext.Provider value={{ logs, addLog, clearLogs }}>{children}</LogContext.Provider>
}

export function useLogs() {
  const context = useContext(LogContext)
  if (context === undefined) {
    throw new Error("useLogs must be used within a LogProvider")
  }
  return context
}

