import { useEffect, useState } from 'react'
import Logo from './Logo'
import ProjectModal from './ProjectModal'
import ProjectDetail from './ProjectDetail'
import { useTimeTracking } from '../hooks/useTimeTracking'
type DashboardProps = {
  user: { id: number; name: string; email: string }
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()
  const [isOpen, setOpen] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const [recentProjects, setRecentProjects] = useState<{ name: string; createdAt: string }[]>([])
  
  const { startTracking, stopTracking, activeProject, isTracking } = useTimeTracking()

  // Persist user email for the time tracking hook to discover
  useEffect(() => {
    try {
      localStorage.setItem('userEmail', user.email)
    } catch {}
    return () => {
      try { localStorage.removeItem('userEmail') } catch {}
    }
  }, [user.email])


  useEffect(() => {
    try {
      const key = `recent-projects:${user.email}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setRecentProjects(parsed)
      } else {
        setRecentProjects([])
      }
    } catch {
      setRecentProjects([])
    }
  }, [user.email])

  const openProject = async (projectName: string) => {
    try {
      // If there's an active project different from the one being opened, stop tracking
      if (activeProject && activeProject !== projectName && isTracking) {
        await stopTracking()
      }
      
      // Start tracking for the new project
      await startTracking(projectName, user.email)
      setCurrentProject(projectName)
    } catch (error) {
      console.error('Failed to start time tracking:', error)
      // Still open the project even if tracking fails
      setCurrentProject(projectName)
    }
  }

  const handleProjectCreated = (projectName: string) => {
    const next = [{ name: projectName, createdAt: new Date().toISOString() }, ...recentProjects.filter(p => p.name !== projectName)].slice(0, 20)
    setRecentProjects(next)
    try { 
      const key = `recent-projects:${user.email}`
      localStorage.setItem(key, JSON.stringify(next)) 
    } catch {}
    openProject(projectName)
  }

  if (currentProject) {
    return <ProjectDetail projectName={currentProject} onBack={() => setCurrentProject(null)} userEmail={user.email} />
  }

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Fixed Header with navigation */}
      <header style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'white', 
        padding: '0 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        height: '72px',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo maxHeight={79} size={200} />
        </div>

        {/* Centered navigation */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <button style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#374151', 
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Dashboard
            </button>
            <button style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#374151', 
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Projects
            </button>
            <button style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#374151', 
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Pricing
            </button>
            <button style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#374151', 
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Help
            </button>
          </nav>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Time Tracking Indicator */}
          {isTracking && activeProject && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(90deg, #10b981, #059669)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span>Tracking: {activeProject}</span>
            </div>
          )}
          
          <button style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#374151', 
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px'
          }}>
            🔔
          </button>
          <div style={{ position: 'relative' }}>
            <button
              aria-label="User menu"
              onClick={() => setOpen(!isOpen)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', 
                color: '#fff', 
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {initial}
            </button>
            {isOpen ? (
              <div style={{ 
                position: 'absolute', 
                right: 0, 
                top: '100%',
                marginTop: 8, 
                background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', 
                border: '1px solid #2a2a34', 
                borderRadius: 8, 
                minWidth: 140, 
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                zIndex: 1000
              }}>
                <button 
                  onClick={onSignOut} 
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    textAlign: 'center', 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#fff', 
                    padding: '0.6rem 0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div style={{ marginBottom: 24, paddingTop: '96px' }}>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Digital Workspace</div>
        <h1 style={{ margin: 0 }}>Hello, {user.name}</h1>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <section style={{ background: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
          {recentProjects.length === 0 ? (
            <ul style={{ paddingLeft: 18, marginTop: 8 }}>
              <li style={{ marginBottom: 6 }}>No recent activity yet.</li>
            </ul>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {recentProjects.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.6rem 0.8rem', background: 'var(--color-background)' }}>
                  <div style={{ display: 'grid' }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Created {new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openProject(p.name)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 6, padding: '0.35rem 0.6rem' }}>Open</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section style={{ background: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'grid', gap: 10, alignContent: 'start', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
          <button onClick={() => setShowProjectModal(true)} style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none' }}>Project Setup</button>
          <button style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none' }}>View Projects</button>
        </section>
      </div>

      <ProjectModal 
        isOpen={showProjectModal} 
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleProjectCreated}
        userEmail={user.email}
      />
    </div>
  )
}


