import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, profile } = useAuth()

  return (
    <div className="home">
      <div className="hero">
        <span className="hero-emblem">♜</span>
        <h1>Sardes Satranç'a Hoş Geldin{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
        <p className="tagline">Kulübün satranç platformu — yapay zekaya karşı oyna, puzzle çöz, üyelerle karşılaş, gelişimini takip et.</p>
      </div>
      <div className="home-grid">
        <div className="home-card">
          <h2>Yapay Zekaya Karşı Oyna</h2>
          <p>10 zorluk seviyesinde, zaman kontrollü satranç.</p>
          {user ? <Link to="/oyna/yapay-zeka">Oyna →</Link> : <Link to="/kayit">Üye ol →</Link>}
        </div>
        <div className="home-card">
          <h2>Puzzle Çöz</h2>
          <p>10 seviyeli taktik puzzle'ları ile pratik yap.</p>
          {user ? <Link to="/puzzle">Çöz →</Link> : <Link to="/kayit">Üye ol →</Link>}
        </div>
        <div className="home-card">
          <h2>Üyelerle Oyna</h2>
          <p>Kulüpten bir üyeye karşı gerçek zamanlı satranç oyna.</p>
          {user ? <Link to="/oyna/online">Lobiye git →</Link> : <Link to="/kayit">Üye ol →</Link>}
        </div>
        <div className="home-card">
          <h2>Profilim</h2>
          <p>Oyun ve puzzle istatistiklerini gör.</p>
          {user ? <Link to="/profilim">Profile git →</Link> : <Link to="/kayit">Üye ol →</Link>}
        </div>
      </div>
    </div>
  )
}
