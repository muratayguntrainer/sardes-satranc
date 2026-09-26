import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, profile } = useAuth()

  return (
    <div className="profile-card">
      <h1>Profilim</h1>
      <div className="profile-row"><span>Ad Soyad</span><strong>{profile?.full_name || '—'}</strong></div>
      <div className="profile-row"><span>E-posta</span><strong>{user?.email}</strong></div>
      <div className="profile-row"><span>Oynadığı oyun</span><strong>{profile?.games_played ?? 0}</strong></div>
      <div className="profile-row"><span>Çözdüğü puzzle</span><strong>{profile?.puzzles_solved ?? 0}</strong></div>
      <div className="profile-row"><span>Tamamlanan puzzle konusu</span><strong>{profile?.highest_puzzle_level ?? 0}</strong></div>
      <p className="hint-text">Oyun ve puzzle istatistikleri, satranç/puzzle ekranları bu hesaba bağlandığında otomatik güncellenecek.</p>
    </div>
  )
}
