import { useState, type FormEvent } from 'react'

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <h2>Sign In</h2>
      <p className="login-subtitle">Connect to your Smappee account</p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Smappee Email
          <input
            type="email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            placeholder="user@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="login-hint">API credentials are loaded from <code>.env</code></p>
    </div>
  )
}
