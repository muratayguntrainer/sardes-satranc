import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await sendPasswordReset(email)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-card">
        <h1>E-postanı kontrol et</h1>
        <p>{email} adresine bir şifre sıfırlama linki gönderdik.</p>
        <p className="auth-alt"><Link to="/giris">Girişe dön</Link></p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>Şifremi Unuttum</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-posta
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Sıfırlama Linki Gönder'}</button>
      </form>
      <p className="auth-alt"><Link to="/giris">Girişe dön</Link></p>
    </div>
  )
}
