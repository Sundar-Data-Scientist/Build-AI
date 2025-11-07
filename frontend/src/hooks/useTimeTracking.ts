import { useState, useEffect, useCallback } from 'react'

interface TimeEntry {
  id: number
  project_name: string
  user_email: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TimeTrackingSummary {
  project_name: string
  total_hours: number
  active_session: TimeEntry | null
  recent_entries: TimeEntry[]
}

interface UseTimeTrackingReturn {
  activeProject: string | null
  activeSession: TimeEntry | null
  isTracking: boolean
  startTracking: (projectName: string, userEmail: string) => Promise<void>
  stopTracking: () => Promise<void>
  getProjectSummary: (projectName: string, userEmail: string) => Promise<TimeTrackingSummary>
  getElapsedTime: () => number
}

export function useTimeTracking(): UseTimeTrackingReturn {
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<TimeEntry | null>(null)
  const [isTracking, setIsTracking] = useState(false)

  // Check for active session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (!userEmail) return

        const response = await fetch(`http://localhost:8000/api/time-tracking/active/${encodeURIComponent(userEmail)}`)
        if (response.ok) {
          const session = await response.json()
          if (session) {
            setActiveSession(session)
            setActiveProject(session.project_name)
            setIsTracking(true)
            // Persist for other tabs and listeners
            localStorage.setItem('activeTimeSession', JSON.stringify(session))
            window.dispatchEvent(new CustomEvent('time-tracking-updated', { detail: session }))
          }
        }
      } catch (error) {
        console.error('Failed to check active session:', error)
      }
    }

    checkActiveSession()

    // Listen for cross-component updates
    const onUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as TimeEntry | null
        if (detail) {
          setActiveSession(detail)
          setActiveProject(detail.project_name)
          setIsTracking(!!detail.is_active)
        }
      } catch {}
    }
    window.addEventListener('time-tracking-updated', onUpdated as EventListener)
    return () => window.removeEventListener('time-tracking-updated', onUpdated as EventListener)
  }, [])

  // Update elapsed time every second when tracking
  useEffect(() => {
    if (!isTracking || !activeSession) return

    const interval = setInterval(() => {
      // Force re-render to update elapsed time display
      setActiveSession(prev => prev ? { ...prev } : null)
    }, 1000)

    return () => clearInterval(interval)
  }, [isTracking, activeSession])

  const startTracking = useCallback(async (projectName: string, userEmail: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/time-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          user_email: userEmail,
        }),
      })

      if (response.ok) {
        const newSession = await response.json()
        setActiveSession(newSession)
        setActiveProject(projectName)
        setIsTracking(true)
        localStorage.setItem('activeTimeSession', JSON.stringify(newSession))
        window.dispatchEvent(new CustomEvent('time-tracking-updated', { detail: newSession }))
      } else {
        throw new Error('Failed to start tracking')
      }
    } catch (error) {
      console.error('Failed to start time tracking:', error)
      throw error
    }
  }, [])

  const stopTracking = useCallback(async () => {
    if (!activeSession) return

    try {
      const response = await fetch(`http://localhost:8000/api/time-tracking/${activeSession.id}`, {
        method: 'PUT',
      })

      if (response.ok) {
        setActiveSession(null)
        setActiveProject(null)
        setIsTracking(false)
        localStorage.removeItem('activeTimeSession')
        window.dispatchEvent(new CustomEvent('time-tracking-updated', { detail: null }))
      } else {
        throw new Error('Failed to stop tracking')
      }
    } catch (error) {
      console.error('Failed to stop time tracking:', error)
      throw error
    }
  }, [activeSession])

  const getProjectSummary = useCallback(async (projectName: string, userEmail: string): Promise<TimeTrackingSummary> => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/time-tracking/summary/${encodeURIComponent(projectName)}?user_email=${encodeURIComponent(userEmail)}`
      )

      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('Failed to get project summary')
      }
    } catch (error) {
      console.error('Failed to get project summary:', error)
      throw error
    }
  }, [])

  const getElapsedTime = useCallback((): number => {
    if (!activeSession || !isTracking) return 0
    
    const startTime = new Date(activeSession.start_time).getTime()
    const currentTime = new Date().getTime()
    return Math.floor((currentTime - startTime) / 1000)
  }, [activeSession, isTracking])

  return {
    activeProject,
    activeSession,
    isTracking,
    startTracking,
    stopTracking,
    getProjectSummary,
    getElapsedTime,
  }
}
