import { useEffect, useState } from 'react'
import Logo from './Logo'

type InviteUsersProps = {
  user: { id: number; name: string; email: string }
}

export default function InviteUsers({ user }: InviteUsersProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [invitations, setInvitations] = useState<{ id: number; name: string; email: string; designation: string; status: string; project_name?: string; created_at?: string }[]>([])
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()

  async function fetchInvitations() {
    try {
      const res = await fetch('http://localhost:8000/api/auth/invite')
      if (!res.ok) return
      const data = await res.json()
      setInvitations(data)
    } catch {}
  }

  useEffect(() => { fetchInvitations() }, [])

  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Fixed Header (same as dashboard) */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'white', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '72px', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo maxHeight={79} size={200} />
        </div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <button onClick={() => { window.location.hash = '#/' }} style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: '16px', cursor: 'pointer', fontWeight: '500' }}>Dashboard</button>
            <button style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: '16px', cursor: 'pointer', fontWeight: '500' }}>Projects</button>
            <button style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: '16px', cursor: 'pointer', fontWeight: '500' }}>Pricing</button>
            <button style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: '16px', cursor: 'pointer', fontWeight: '500' }}>Help</button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button style={{ background: 'transparent', border: 'none', color: '#374151', fontSize: '20px', cursor: 'pointer', padding: '8px' }}>🔔</button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initial}</div>
        </div>
      </header>

      <div style={{ paddingTop: '96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Invite Users</h2>
            <div style={{ color: 'var(--color-muted)', fontSize: 14 }}>Manage user invitations for your team</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowInviteModal(true)} style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none' }}>Invite User</button>
            <button onClick={() => { window.location.hash = '#/' }} style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>Back</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', background: 'var(--color-primary)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Name</th>
              <th style={{ padding: '12px 16px' }}>Email</th>
              <th style={{ padding: '12px 16px' }}>Designation</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Invited Date</th>
              <th style={{ padding: '12px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 16px' }}>{inv.name || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{inv.email}</td>
                <td style={{ padding: '12px 16px' }}>{inv.designation || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  {inv.status === 'accepted' ? (
                    <span style={{ background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: 999 }}>Accepted</span>
                  ) : (
                    <span style={{ background: '#e5e7eb', color: '#111827', padding: '4px 10px', borderRadius: 999 }}>pending</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                <td style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                  <button style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>Edit</button>
                  <button onClick={() => fetchInvitations()} style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>Resend</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showInviteModal ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, width: '90%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'transparent', border: 'none', color: '#374151' }}>✕</button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const form = new FormData(e.currentTarget as HTMLFormElement)
              const name = String(form.get('name')||'')
              const email = String(form.get('email')||'')
              const designation = String(form.get('designation')||'')
              try {
                setInviteSending(true)
                const res = await fetch('http://localhost:8000/api/auth/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, designation }) })
                if (!res.ok) throw new Error('Failed to send invitation')
                await fetchInvitations()
                setShowInviteModal(false)
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
              <button disabled={inviteSending} type="submit" style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none', opacity: inviteSending ? 0.8 : 1 }}>{inviteSending ? 'Sending...' : 'Send Invitation'}</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}


