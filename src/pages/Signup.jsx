import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    setBusy(true)
    const { data, error } = await signUp(email, password, fullName)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      navigate('/')
    } else {
      setInfo('Kayıt oluşturuldu! E-postana gönderilen onay linkine tıklayıp giriş yapabilirsin.')
    }
  }

  return (
    <div className="auth-card">
      <h1>Kulübe Üye Ol</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Ad Soyad
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label>
          E-posta
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Şifre
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-info">{info}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Üye Ol'}</button>
      </form>
      <p className="auth-alt">Zaten üye misin? <Link to="/giris">Giriş yap</Link></p>
    </div>
  )
}
