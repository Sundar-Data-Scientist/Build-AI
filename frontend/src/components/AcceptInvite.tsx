import { useMemo, useState } from 'react'

export default function AcceptInvite() {
  const token = useMemo(() => {
    // hash format: #/accept?token=xxxx
    const q = window.location.hash.split('?')[1] || ''
    const params = new URLSearchParams(q)
    return params.get('token') || ''
  }, [])

  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function accept() {
    if (!token) {
      setStatus('error');
      setMessage('Missing or invalid invitation token')
      return
    }
    try {
      setStatus('working')
      const res = await fetch('http://localhost:8000/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to accept invite')
      }
      const data = await res.json()
      try {
        const invitedUser = { id: -1, name: data.name || (data.email || '').split('@')[0], email: data.email }
        localStorage.setItem('invited_user', JSON.stringify(invitedUser))
      } catch {}
      setStatus('success')
      setMessage('Invitation accepted. You can close this page or go back.')
      setTimeout(() => { window.location.hash = '#/' }, 1200)
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || 'Failed to accept invite')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8f9fa', padding: '2rem' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>Accept Invitation</h2>
        <p>Click the button below to accept your invitation.</p>
        <button onClick={accept} disabled={status==='working'} style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8 }}>
          {status==='working' ? 'Accepting...' : 'Accept Invitation'}
        </button>
        {message ? <div style={{ marginTop: 12, color: status==='error' ? '#b91c1c' : '#111827' }}>{message}</div> : null}
        <div style={{ marginTop: 16 }}>
          <a href="#/invites" style={{ color: 'var(--color-secondary-2)' }}>Go to Invite Users</a>
        </div>
      </div>
    </div>
  )
}


