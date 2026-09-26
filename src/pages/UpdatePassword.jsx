import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Supabase, şifre sıfırlama e-postasındaki linke tıklandığında kullanıcıyı
// bu sayfaya (VITE ortamında /sifre-guncelle) oturum açık şekilde yönlendirir.
export default function UpdatePassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="auth-card">
      <h1>Yeni Şifre Belirle</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Yeni Şifre
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}</button>
      </form>
    </div>
  )
}
