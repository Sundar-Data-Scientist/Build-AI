import { useEffect, useState } from 'react'
import Logo from './Logo'
import StageDetail from './StageDetail'
import ProjectSetup from './ProjectSetup'
import { useTimeTracking } from '../hooks/useTimeTracking'

type ProjectDetailProps = {
  projectName: string
  onBack: () => void
  userEmail?: string
}

type TabType = 'overview' | 'bom' | 'estimation' | 'basecamp' | 'time-spent' | 'protocols' | 'project-tree' | 'invite-teams'

export default function ProjectDetail({ projectName, onBack, userEmail }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStage, setSelectedStage] = useState<{ number: number; name: string } | null>(null)
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({})
  const [filesByStage, setFilesByStage] = useState<Record<number, { id: number; originalName: string; storedName: string; size: number; dpId?: number; createdAt?: string }[]>>({})
  const [loadingByStage, setLoadingByStage] = useState<Record<number, boolean>>({})
  const [errorByStage, setErrorByStage] = useState<Record<number, string | null>>({})
  const [treeQuery, setTreeQuery] = useState<string>('')
  const [timeSummary, setTimeSummary] = useState<any>(null)
  const [timeLoading, setTimeLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [invitations, setInvitations] = useState<{ id: number; name: string; email: string; designation: string; status: string; project_name?: string; created_at?: string }[]>([])
  
  const { activeSession, isTracking, getElapsedTime, getProjectSummary, stopTracking } = useTimeTracking()

  const allStages = [
    { stage: 1, name: 'CUSTOMER INPUTS' },
    { stage: 2, name: 'PROJECT STUDY' },
    { stage: 3, name: 'PRE-DETAILING MEETING' },
    { stage: 4, name: "RFI'S" },
    { stage: 5, name: 'AB, EMBEDS & ABM' },
    { stage: 6, name: 'APPROVAL RELEASE' },
    { stage: 7, name: 'BFA' },
    { stage: 8, name: 'FABRICATION RELAESE' },
    { stage: 9, name: 'CHANGE ORDER - CO' },
    { stage: 10, name: 'DETAILING STATUS REPORT - DSR' },
    { stage: 11, name: 'PROJECT CLOSURE' },
  ]

  const formatSizeMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`
  const formatDate = (iso?: string) => {
    try { return iso ? new Date(iso).toLocaleDateString() : '' } catch { return '' }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const loadTimeSummary = async () => {
    if (!userEmail) return
    setTimeLoading(true)
    try {
      const summary = await getProjectSummary(projectName, userEmail)
      setTimeSummary(summary)
    } catch (error) {
      console.error('Failed to load time summary:', error)
    } finally {
      setTimeLoading(false)
    }
  }

  async function fetchInvitations() {
    try {
      const res = await fetch('http://localhost:8000/api/auth/invite')
      if (!res.ok) return
      const data = await res.json()
      // Filter invitations for this project
      const projectInvitations = Array.isArray(data) 
        ? data.filter((inv: { project_name?: string }) => inv.project_name === projectName)
        : []
      setInvitations(projectInvitations)
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'invite-teams') {
      fetchInvitations()
    }
  }, [activeTab, projectName])

  // Load time summary when time-spent tab is selected
  useEffect(() => {
    if (activeTab === 'time-spent' && userEmail) {
      loadTimeSummary()
    }
  }, [activeTab, projectName, userEmail])

  // Listen for protocol uploads and refresh current open stage instantly
  useEffect(() => {
    function onUploaded(e: any) {
      const s = e?.detail?.stage as number | undefined
      const proj = e?.detail?.projectName as string | undefined
      if (!s || proj !== projectName) return
      if (!expandedStages[s]) return // only refresh if visible
      ;(async () => {
        try {
          setLoadingByStage(prev => ({ ...prev, [s]: true }))
          const params = new URLSearchParams({ stage: String(s), projectName })
          const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`)
          if (!res.ok) throw new Error('Failed to load files')
          const data = await res.json()
          setFilesByStage(prev => ({ ...prev, [s]: Array.isArray(data) ? data : [] }))
        } finally {
          setLoadingByStage(prev => ({ ...prev, [s]: false }))
        }
      })()
    }
    window.addEventListener('protocol-uploaded', onUploaded as EventListener)
    return () => window.removeEventListener('protocol-uploaded', onUploaded as EventListener)
  }, [expandedStages, projectName])

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bom', label: 'BOM' },
    { id: 'estimation', label: 'Estimation' },
    { id: 'basecamp', label: 'RFIs' },
    { id: 'time-spent', label: 'Effort Hours' },
    { id: 'protocols', label: 'Protocols' },
    { id: 'project-tree', label: 'Project Tree' },
    { id: 'invite-teams', label: 'Invite Teams' }
  ]

  if (selectedStage) {
    return (
      <StageDetail 
        stageNumber={selectedStage.number} 
        stageName={selectedStage.name} 
        onBack={() => setSelectedStage(null)} 
        projectName={projectName}
        userEmail={userEmail}
      />
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 16 }}>Project Overview</h3>
              <p>Project: {projectName}</p>
              <p>Status: Active</p>
              <p>Created: {new Date().toLocaleDateString()}</p>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32 }}>
              <ProjectSetup projectName={projectName} />
            </div>
          </div>
        )
      case 'bom':
        return (
          <div>
            <h3>Bill of Materials (BOM)</h3>
            <p>No BOM items added yet.</p>
          </div>
        )
      case 'estimation':
        return (
          <div>
            <h3>Cost Estimation</h3>
            <p>No estimates available yet.</p>
          </div>
        )
      case 'basecamp':
        return (
          <div>
            <h3>Basecamp Integration</h3>
            <p>Connect to Basecamp to sync project data.</p>
          </div>
        )
      case 'time-spent':
        const isCurrentProjectActive = activeSession?.project_name === projectName && isTracking
        const currentElapsed = isCurrentProjectActive ? getElapsedTime() : 0
        
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ margin: 0 }}>Time Tracking</h3>
              {isCurrentProjectActive && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  <span>Currently tracking: {formatDuration(currentElapsed)}</span>
                </div>
              )}
            </div>

            {timeLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div>Loading time tracking data...</div>
              </div>
            ) : timeSummary ? (
              <div style={{ display: 'grid', gap: 24 }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>
                      {timeSummary.total_hours.toFixed(1)}h
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Total Time</div>
                  </div>
                  
                  <div style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>
                      {timeSummary.recent_entries.length}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Sessions</div>
                  </div>
                  
                  {isCurrentProjectActive && (
                    <div style={{
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '1.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 32, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
                        {formatDuration(currentElapsed)}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Current Session</div>
                    </div>
                  )}
                </div>

                {/* Recent Time Entries */}
                <div>
                  <h4 style={{ marginBottom: 16 }}>Recent Time Entries</h4>
                  {timeSummary.recent_entries.length === 0 ? (
                    <div style={{
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--color-muted)'
                    }}>
                      No time entries recorded yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {timeSummary.recent_entries.map((entry: any) => (
                        <div key={entry.id} style={{
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {new Date(entry.start_time).toLocaleDateString()} at {new Date(entry.start_time).toLocaleTimeString()}
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                              {entry.end_time ? `Ended at ${new Date(entry.end_time).toLocaleTimeString()}` : 'Active session'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, color: entry.is_active ? '#10b981' : '#6b7280' }}>
                              {entry.duration_seconds ? formatDuration(entry.duration_seconds) : formatDuration(currentElapsed)}
                            </div>
                            {entry.is_active && (
                              <div style={{ fontSize: 12, color: '#10b981' }}>Active</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                Failed to load time tracking data.
              </div>
            )}
          </div>
        )
      case 'project-tree':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📁</span>
                <h3 style={{ margin: 0 }}>Protocol Files Root</h3>
              </div>
              <span style={{ fontSize: 12, background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '0.15rem 0.5rem' }}>{allStages.length} stages</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
              <input
                value={treeQuery}
                onChange={(e) => setTreeQuery(e.target.value)}
                placeholder="Search files…"
                style={{ width: 240, padding: '0.45rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-primary)', color: 'var(--color-text)' }}
              />
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              {allStages.map((s, idx) => {
                const isOpen = !!expandedStages[s.stage]
                const files = filesByStage[s.stage] || []
                const count = files.length
                return (
                  <div key={s.stage} style={{ background: idx % 2 === 0 ? 'var(--color-primary)' : 'var(--color-primary)' }}>
                    <div
                      onClick={async () => {
                        const isOpen = !!expandedStages[s.stage]
                        const next = { ...expandedStages, [s.stage]: !isOpen }
                        setExpandedStages(next)
                        if (!isOpen && !filesByStage[s.stage]) {
                          setLoadingByStage(prev => ({ ...prev, [s.stage]: true }))
                          setErrorByStage(prev => ({ ...prev, [s.stage]: null }))
                          try {
                            const params = new URLSearchParams({ stage: String(s.stage), projectName })
                            const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`)
                            if (!res.ok) throw new Error('Failed to load files')
                            const data = await res.json()
                            setFilesByStage(prev => ({ ...prev, [s.stage]: Array.isArray(data) ? data : [] }))
                          } catch (e: any) {
                            setErrorByStage(prev => ({ ...prev, [s.stage]: e?.message || 'Failed to load files' }))
                          } finally {
                            setLoadingByStage(prev => ({ ...prev, [s.stage]: false }))
                          }
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const next = { ...expandedStages, [s.stage]: !isOpen }
                            setExpandedStages(next)
                            if (!isOpen && !filesByStage[s.stage]) {
                              setLoadingByStage(prev => ({ ...prev, [s.stage]: true }))
                              setErrorByStage(prev => ({ ...prev, [s.stage]: null }))
                              try {
                                const params = new URLSearchParams({ stage: String(s.stage), projectName })
                                const res = await fetch(`http://localhost:8000/api/uploads?${params.toString()}`)
                                if (!res.ok) throw new Error('Failed to load files')
                                const data = await res.json()
                                setFilesByStage(prev => ({ ...prev, [s.stage]: Array.isArray(data) ? data : [] }))
                              } catch (e: any) {
                                setErrorByStage(prev => ({ ...prev, [s.stage]: e?.message || 'Failed to load files' }))
                              } finally {
                                setLoadingByStage(prev => ({ ...prev, [s.stage]: false }))
                              }
                            }
                          }}
                          style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)' }}
                        >
                          {isOpen ? '▾' : '▸'}
                        </button>
                        <span>📂</span>
                        <div style={{ fontWeight: 600 }}>Stage {s.stage}: {s.name}</div>
                      </div>
                      <span style={{ fontSize: 12, background: '#e7f0ff', color: '#1d4ed8', borderRadius: 12, padding: '0.15rem 0.5rem' }}>{count} {count === 1 ? 'file' : 'files'}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0.75rem 1rem', borderBottom: idx === allStages.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                        {loadingByStage[s.stage] ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} style={{ height: 18, background: 'var(--color-primary)', borderRadius: 4, opacity: 0.7 }} />
                            ))}
                          </div>
                        ) : errorByStage[s.stage] ? (
                          <div style={{ color: '#ef4444' }}>{errorByStage[s.stage]}</div>
                        ) : files.length === 0 ? (
                          <div style={{ color: 'var(--color-muted)' }}>No files uploaded yet.</div>
                        ) : (
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                            {files
                              .filter(f => (treeQuery || '').trim() === '' || f.originalName.toLowerCase().includes(treeQuery.toLowerCase()))
                              .map(f => {
                                const lower = (f.originalName || '').toLowerCase()
                                const icon = lower.endsWith('.pdf') ? '📕' : lower.endsWith('.doc') || lower.endsWith('.docx') ? '📘' : lower.endsWith('.xls') || lower.endsWith('.xlsx') ? '📗' : lower.endsWith('.ppt') || lower.endsWith('.pptx') ? '📙' : '📄'
                                return (
                                  <li key={f.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', alignItems: 'center', gap: 8 }}>
                                    <span>{icon}</span>
                                <div>
                                  <div style={{ fontSize: 14 }}>{f.originalName}</div>
                                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{formatSizeMB(f.size)} ・ {formatDate(f.createdAt)}</div>
                                </div>
                                <a href={`http://localhost:8000/api/uploads/${f.id}/download`} style={{ fontSize: 13, color: '#4f46e5', textDecoration: 'none' }}>Download</a>
                                <span />
                                  </li>
                                )
                              })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      case 'protocols':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 24 }}>📋</div>
              <h3 style={{ margin: 0 }}>Project Protocols</h3>
            </div>
            <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
              Quality control and process tracking checklists - Multi-approval system for collaborative work.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <button style={{ 
                padding: '0.5rem 1rem', 
                background: 'var(--color-secondary)', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                📥 Export Checklist
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Completed', count: 0, color: '#10b981' },
                { label: 'Partial', count: 0, color: '#f59e0b' },
                { label: 'In Progress', count: 0, color: '#3b82f6' },
                { label: 'Pending', count: 0, color: '#eab308' },
                { label: 'Overdue', count: 0, color: '#ef4444' },
                { label: 'N/A', count: 0, color: '#6b7280' }
              ].map((item) => (
                <div key={item.label} style={{
                  background: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: item.color, marginBottom: 4 }}>
                    {item.count}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Project Stages */}
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { stage: 1, name: 'CUSTOMER INPUTS', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 2, name: 'PROJECT STUDY', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 3, name: 'PRE-DETAILING MEETING', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 4, name: "RFI'S", completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 5, name: 'AB, EMBEDS & ABM', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 6, name: 'APPROVAL RELEASE', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 7, name: 'BFA', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 8, name: 'FABRICATION RELAESE', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 9, name: 'CHANGE ORDER - CO', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 10, name: 'DETAILING STATUS REPORT - DSR', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' },
                { stage: 11, name: 'PROJECT CLOSURE', completed: 0, total: 5, status: 'Pending', statusColor: '#eab308' }
              ].map((stage) => (
                <div 
                  key={stage.stage} 
                  onClick={() => setSelectedStage({ number: stage.stage, name: stage.name })}
                  style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 16, color: 'var(--color-muted)' }}>▶</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      Stage {stage.stage}: {stage.name}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                      {stage.completed}/{stage.total} items completed
                    </div>
                  </div>
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    background: stage.statusColor,
                    color: 'white',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    {stage.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'invite-teams':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0 }}>Team Members</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: '4px 0 0 0' }}>
                  Invite team members to collaborate on this project
                </p>
              </div>
              <button 
                onClick={() => setShowInviteModal(true)} 
                style={{ 
                  background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', 
                  color: '#fff', 
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                + Invite Team Member
              </button>
            </div>
            
            <div style={{ overflowX: 'auto', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: 'var(--color-primary)' }}>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Name</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Email</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Designation</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Invited Date</th>
                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                        No team members invited yet. Click "Invite Team Member" to get started.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px' }}>{inv.name || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{inv.email}</td>
                        <td style={{ padding: '12px 16px' }}>{inv.designation || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {inv.status === 'accepted' ? (
                            <span style={{ background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>Accepted</span>
                          ) : (
                            <span style={{ background: '#e5e7eb', color: '#111827', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch(`http://localhost:8000/api/auth/invite/${inv.id}`, { 
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                })
                                if (res.ok) {
                                  await fetchInvitations()
                                  alert('Invitation resent successfully')
                                }
                              } catch {
                                alert('Failed to resend invitation')
                              }
                            }}
                            style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                          >
                            Resend
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={48} />
          <div>
            <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Project Detail</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0 }}>{projectName}</h1>
              {activeSession?.project_name === projectName && isTracking && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                  <span>Tracking {formatDuration(getElapsedTime())}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={async () => {
            try {
              if (activeSession?.project_name === projectName && isTracking) {
                await stopTracking()
              }
            } catch {}
            onBack()
          }}
          style={{ 
            padding: '0.5rem 1rem', 
            background: 'transparent', 
            border: '1px solid var(--color-border)', 
            color: 'var(--color-text)', 
            borderRadius: 8 
          }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--color-border)', 
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-secondary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-secondary)' : 'var(--color-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 400
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'var(--color-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '2rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        minHeight: 400
      }}>
        {renderTabContent()}
      </div>

      {/* Invite Modal */}
      {showInviteModal ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, width: '90%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const form = new FormData(e.currentTarget as HTMLFormElement)
              const name = String(form.get('name')||'')
              const email = String(form.get('email')||'')
              const designation = String(form.get('designation')||'')
              try {
                setInviteSending(true)
                const res = await fetch('http://localhost:8000/api/auth/invite', { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ name, email, designation, project_name: projectName }) 
                })
                if (!res.ok) throw new Error('Failed to send invitation')
                await fetchInvitations()
                setShowInviteModal(false)
                alert('Invitation sent successfully')
              } catch {
                alert('Failed to send invitation')
              } finally {
                setInviteSending(false)
              }
            }} style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="invite-name" style={{ fontSize: 14, color: '#374151' }}>Name</label>
                <input id="invite-name" name="name" required placeholder="Full name" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="invite-email" style={{ fontSize: 14, color: '#374151' }}>Email</label>
                <input id="invite-email" name="email" type="email" required placeholder="you@example.com" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="invite-designation" style={{ fontSize: 14, color: '#374151' }}>Designation</label>
                <select id="invite-designation" name="designation" required defaultValue="" style={{ padding: '0.7rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', cursor: 'pointer' }}>
                  <option value="" disabled hidden style={{ display: 'none' }}>Select designation</option>
                  <option value="Project Director">Project Director</option>
                  <option value="Senior Project Manager">Senior Project Manager</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Senior Checker">Senior Checker</option>
                  <option value="Checker">Checker</option>
                  <option value="Senior Modellor">Senior Modellor</option>
                  <option value="Modellor">Modellor</option>
                  <option value="Senior Editor">Senior Editor</option>
                  <option value="Editor">Editor</option>
                  <option value="Project Coordinator">Project Coordinator</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <button disabled={inviteSending} type="submit" style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none', opacity: inviteSending ? 0.8 : 1, padding: '0.7rem', borderRadius: 8, cursor: inviteSending ? 'not-allowed' : 'pointer' }}>
                {inviteSending ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
