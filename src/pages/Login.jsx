import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'E-posta veya şifre hatalı.'
        : error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="auth-card">
      <h1>Giriş Yap</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-posta
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Şifre
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}</button>
      </form>
      <p className="auth-alt"><Link to="/sifremi-unuttum">Şifremi unuttum</Link></p>
      <p className="auth-alt">Hesabın yok mu? <Link to="/kayit">Üye ol</Link></p>
    </div>
  )
}
