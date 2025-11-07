import { useState, useEffect } from 'react'
import Dashboard from './Dashboard'
import Logo from './Logo'
import InviteUsers from './InviteUsers'
import AcceptInvite from './AcceptInvite'

type AuthMode = 'signin' | 'signup'

export default function Home() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [route, setRoute] = useState<'root' | 'invites' | 'accept'>(() => (window.location.hash.startsWith('#/invites') ? 'invites' : window.location.hash.startsWith('#/accept') ? 'accept' : 'root'))

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.startsWith('#/invites') ? 'invites' : window.location.hash.startsWith('#/accept') ? 'accept' : 'root')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (user) {
    if (route === 'invites') return <InviteUsers user={user} />
    if (route === 'accept') return <AcceptInvite />
    return <Dashboard user={user} onSignOut={() => setUser(null)} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'white', 
        padding: '0.5rem 1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        height: '60px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Logo size={200} />
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => { setMode('signin'); setShowAuthModal(true); }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#374151', 
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setMode('signup'); setShowAuthModal(true); }}
            style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none'
            }}
          >
            Register
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ 
        padding: '80px 2rem', 
        textAlign: 'center', 
        maxWidth: '800px', 
        margin: '0 auto' 
      }}>
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: '700', 
          color: '#111827', 
          margin: '0 0 24px 0',
          lineHeight: '1.2'
        }}>
          Smart Steel Detailing for Modern Engineering Teams
        </h1>
        <p style={{ 
          fontSize: '20px', 
          color: '#6b7280', 
          margin: '0 0 40px 0',
          lineHeight: '1.6'
        }}>
          Boost productivity and accuracy with AI-powered detailing, comprehensive BOM management, and integrated collaborative workflows.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button 
            onClick={() => { setMode('signup'); setShowAuthModal(true); }}
            style={{ 
              background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none'
            }}
          >
            Start Free Trial
          </button>
          <button style={{ background: 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))', color: '#fff', border: 'none'
          }}>
            Schedule Demo
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ 
        padding: '80px 2rem', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        <h2 style={{ 
          fontSize: '36px', 
          fontWeight: '700', 
          color: '#111827', 
          margin: '0 0 16px 0' 
        }}>
          Everything You Need
        </h2>
        <p style={{ 
          fontSize: '18px', 
          color: '#6b7280', 
          margin: '0 0 60px 0' 
        }}>
          Comprehensive tools for structural steel detailing projects
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          {[
            { icon: '📤', title: 'Drawing Upload', desc: 'AI-powered metadata extraction from structural drawings with drag & drop interface.', color: '#3b82f6' },
            { icon: '📋', title: 'BOM & Weight', desc: 'Automated bill of materials generation with precise weight calculations.', color: '#10b981' },
            { icon: '💬', title: 'RFI Management', desc: 'Streamlined Request for Information tracking and collaboration.', color: '#f97316' },
            { icon: '📝', title: 'Contract Drawing Log', desc: 'Comprehensive drawing revision tracking and status management.', color: '#8b5cf6' },
            { icon: '✅', title: 'Quality Protocols', desc: 'Standardized quality control checklists and process tracking.', color: '#ef4444' },
            { icon: '📁', title: 'File Management', desc: 'Centralized document storage and version control for all project files.', color: '#6366f1' }
          ].map((feature, index) => (
            <div key={index} style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              textAlign: 'left'
            }}>
              <div style={{ 
                fontSize: '24px', 
                marginBottom: '16px',
                color: feature.color
              }}>
                {feature.icon}
              </div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827', 
                margin: '0 0 8px 0' 
              }}>
                {feature.title}
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0',
                lineHeight: '1.5'
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            maxWidth: '400px', 
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#111827' }}>
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                {mode === 'signin' ? 'Please sign in to your account' : 'Please create your account'}
              </p>
            </div>

            <div style={{ display: 'flex', marginBottom: '16px', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                onClick={() => setMode('signin')}
                style={{
                  flex: 1,
                  background: mode === 'signin' ? 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))' : 'transparent',
                  color: mode === 'signin' ? '#ffffff' : '#374151',
                  border: 'none',
                  padding: '12px 16px',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                style={{
                  flex: 1,
                  background: mode === 'signup' ? 'linear-gradient(90deg, var(--color-secondary), var(--color-secondary-2))' : 'transparent',
                  color: mode === 'signup' ? '#ffffff' : '#374151',
                  border: 'none',
                  padding: '12px 16px',
                  cursor: 'pointer'
                }}
              >
                Sign Up
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              {mode === 'signin' ? <SignInForm onSuccess={setUser} /> : <SignUpForm onSuccess={setUser} />}
            </div>

            <button 
              onClick={() => setShowAuthModal(false)}
              style={{ 
                width: '100%', 
                background: '#f3f4f6', 
                color: '#374151', 
                border: 'none', 
                padding: '12px', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SignInForm({ onSuccess }: { onSuccess: (u: { id: number; name: string; email: string }) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    try {
      const res = await fetch('http://localhost:8000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to sign in')
      }
      const data = await res.json()
      onSuccess(data)
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
        <label htmlFor="email" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Email</label>
        <input name="email" id="email" required type="email" placeholder="you@example.com" style={{ width: '90%', padding: '0.8rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} />
      </div>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
        <label htmlFor="password" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Password</label>
        <input name="password" id="password" required type="password" placeholder="Your password" style={{ width: '90%', padding: '0.8rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} />
      </div>
      {error ? <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div> : null}
      <button disabled={loading} type="submit" style={{ backgroundColor: 'var(--color-secondary)', width: '100%', opacity: loading ? 0.8 : 1 }}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

// Allowed email domains for sign up
const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com']

function isValidEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? ALLOWED_EMAIL_DOMAINS.includes(domain) : false
}

function SignUpForm({ onSuccess }: { onSuccess: (u: { id: number; name: string; email: string }) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showOTPForm, setShowOTPForm] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpValue, setOtpValue] = useState<string>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const name = String(formData.get('name') || '')
    const email = String(formData.get('signup-email') || '')
    const password = String(formData.get('signup-password') || '')
    const confirmPassword = String(formData.get('signup-confirm-password') || '')
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    // Validate email domain
    if (!isValidEmailDomain(email)) {
      setError(`Only the following email domains are allowed: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`)
      setLoading(false)
      return
    }
    
    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to sign up')
      }
      const data = await res.json()
      setUserEmail(data.email)
      setOtpValue('') // Reset OTP input when showing OTP form
      setShowOTPForm(true)
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setOtpLoading(true)
    const otp = otpValue.trim()
    
    if (otp.length !== 6) {
      setError('OTP must be 6 digits')
      setOtpLoading(false)
      return
    }
    
    try {
      const res = await fetch('http://localhost:8000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Invalid OTP')
      }
      const data = await res.json()
      setOtpValue('') // Clear OTP after successful verification
      onSuccess(data)
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: '#6b7280', display: 'block' }}
    >
      {show ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )

  if (showOTPForm) {
    return (
      <form onSubmit={handleVerifyOTP} style={{ display: 'grid', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14, margin: '0 0 8px 0' }}>
            We've sent a verification code to
          </p>
          <p style={{ color: 'rgba(245,245,245,0.95)', fontSize: 14, fontWeight: '600', margin: 0 }}>
            {userEmail}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
          <label htmlFor="otp" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Enter OTP</label>
          <input 
            name="otp" 
            id="otp" 
            required 
            type="text" 
            maxLength={6}
            value={otpValue}
            placeholder="000000" 
            autoComplete="off"
            style={{ 
              width: '90%', 
              padding: '0.8rem', 
              background: 'var(--color-background)', 
              color: 'var(--color-text)', 
              border: '1px solid #2a2a34', 
              borderRadius: 10,
              textAlign: 'center',
              fontSize: '24px',
              letterSpacing: '8px',
              fontWeight: '600'
            }} 
            pattern="[0-9]{6}"
            inputMode="numeric"
            onChange={(e) => {
              // Only allow numbers and limit to 6 digits
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setOtpValue(value)
            }}
          />
          <small style={{ color: 'rgba(245,245,245,0.65)', fontSize: 12, textAlign: 'center' }}>
            Enter the 6-digit code sent to your email
          </small>
        </div>
        {error ? <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div> : null}
        <button disabled={otpLoading} type="submit" style={{ backgroundColor: 'var(--color-secondary)', color: '#ffffff', width: '100%', opacity: otpLoading ? 0.8 : 1 }}>
          {otpLoading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
        <label htmlFor="name" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Full name</label>
        <input name="name" id="name" required type="text" placeholder="Sundar" style={{ width: '90%', padding: '0.8rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} />
      </div>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
        <label htmlFor="signup-email" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Email</label>
        <input name="signup-email" id="signup-email" required type="email" placeholder="you@gmail.com" style={{ width: '90%', padding: '0.8rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} />
        <small style={{ color: 'rgba(245,245,245,0.65)', fontSize: 12 }}>
          Allowed domains: gmail.com, outlook.com, hotmail.com, yahoo.com, icloud.com, protonmail.com
        </small>
      </div>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left', position: 'relative' }}>
        <label htmlFor="signup-password" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Password</label>
        <div style={{ position: 'relative', width: '90%' }}>
          <input 
            name="signup-password" 
            id="signup-password" 
            required 
            minLength={6} 
            type={showPassword ? 'text' : 'password'} 
            placeholder="Create a password" 
            style={{ width: '100%', padding: '0.8rem', paddingRight: '2.5rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} 
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              display: 'flex', 
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <EyeIcon show={showPassword} />
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6, textAlign: 'left', position: 'relative' }}>
        <label htmlFor="signup-confirm-password" style={{ color: 'rgba(245,245,245,0.85)', fontSize: 14 }}>Confirm Password</label>
        <div style={{ position: 'relative', width: '90%' }}>
          <input 
            name="signup-confirm-password" 
            id="signup-confirm-password" 
            required 
            minLength={6} 
            type={showConfirmPassword ? 'text' : 'password'} 
            placeholder="Confirm your password" 
            style={{ width: '100%', padding: '0.8rem', paddingRight: '2.5rem', background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid #2a2a34', borderRadius: 10 }} 
          />
          <button 
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              display: 'flex', 
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <EyeIcon show={showConfirmPassword} />
          </button>
        </div>
      </div>
      {error ? <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div> : null}
      <button disabled={loading} type="submit" style={{ backgroundColor: 'var(--color-secondary)', color: '#ffffff', width: '100%', opacity: loading ? 0.8 : 1 }}>
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  )
}

