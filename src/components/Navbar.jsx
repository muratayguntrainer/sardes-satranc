import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/giris')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <img src="/logo.png" alt="Sardes Satranç logosu" className="brand-logo" />
        Sardes Satranç Kulübü
      </Link>
      <div className="nav-links">
        {user && (
          <>
            <NavLink to="/oyna/yapay-zeka" className={({ isActive }) => (isActive ? 'nav-active' : '')}>Yapay Zekaya Karşı</NavLink>
            <NavLink to="/puzzle" className={({ isActive }) => (isActive ? 'nav-active' : '')}>Puzzle</NavLink>
            <NavLink to="/oyna/online" className={({ isActive }) => (isActive ? 'nav-active' : '')}>Üyelerle Oyna</NavLink>
          </>
        )}
        {user ? (
          <>
            <Link to="/profilim">{profile?.full_name || 'Profilim'}</Link>
            <button onClick={handleSignOut} className="link-btn">Çıkış Yap</button>
          </>
        ) : (
          <>
            <Link to="/giris">Giriş Yap</Link>
            <Link to="/kayit" className="cta">Üye Ol</Link>
          </>
        )}
      </div>
    </nav>
  )
}
