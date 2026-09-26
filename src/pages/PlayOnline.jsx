import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const TIME_OPTIONS = [
  { v: 0, label: 'Süresiz' },
  { v: 1, label: '1 dakika' },
  { v: 3, label: '3 dakika' },
  { v: 5, label: '5 dakika' },
  { v: 10, label: '10 dakika' },
  { v: 15, label: '15 dakika' },
  { v: 30, label: '30 dakika' },
]

export default function PlayOnline() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [openGames, setOpenGames] = useState([])
  const [myGames, setMyGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [timeControl, setTimeControl] = useState(10)
  const [newGameCode, setNewGameCode] = useState('')
  const [joiningId, setJoiningId] = useState(null) // hangi oyun için kod kutusu açık
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinError, setJoinError] = useState('')

  const loadGames = useCallback(async () => {
    const [{ data: open, error: openErr }, { data: mine, error: mineErr }] = await Promise.all([
      supabase
        .from('games')
        .select('id, created_at, time_control_minutes, creator:created_by(full_name)')
        .eq('status', 'waiting')
        .neq('created_by', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('games')
        .select('id, status, white_id, black_id, updated_at')
        .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
        .neq('status', 'finished')
        .order('updated_at', { ascending: false }),
    ])
    if (openErr || mineErr) {
      setError('Oyunlar yüklenemedi — bağlantını kontrol edip tekrar dene.')
    }
    setOpenGames(open || [])
    setMyGames(mine || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadGames()
    const channel = supabase
      .channel('lobby-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, loadGames)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadGames])

  async function createGame() {
    const code = newGameCode.trim()
    if (code.length < 3) {
      setError('Oyun kodu en az 3 karakter olmalı.')
      return
    }
    setBusy(true)
    setError('')
    const ms = timeControl * 60 * 1000
    const { data, error } = await supabase.rpc('create_game_with_code', {
      p_fen: START_FEN,
      p_time_control_minutes: timeControl,
      p_white_time_ms: ms,
      p_black_time_ms: ms,
      p_code: code,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(`/oyna/online/${data.id}`)
  }

  function startJoin(gameId) {
    setJoiningId(gameId)
    setJoinCodeInput('')
    setJoinError('')
  }

  function cancelJoin() {
    setJoiningId(null)
    setJoinCodeInput('')
    setJoinError('')
  }

  async function confirmJoin(gameId) {
    if (!joinCodeInput.trim()) {
      setJoinError('Kodu girmelisin.')
      return
    }
    setBusy(true)
    setJoinError('')
    const { data, error } = await supabase.rpc('join_game_with_code', {
      p_game_id: gameId,
      p_code: joinCodeInput.trim(),
    })
    setBusy(false)
    if (error) {
      setJoinError('Bir şeyler ters gitti, tekrar dene.')
      return
    }
    if (data === 'wrong_code') {
      setJoinError('Kod yanlış — tekrar dene.')
      return
    }
    if (data === 'not_available') {
      setJoinError('Bu oyuna artık katılamazsın — başka biri katılmış olabilir.')
      return
    }
    navigate(`/oyna/online/${gameId}`)
  }

  return (
    <div className="lobby">
      <h1>Üyelerle Oyna</h1>
      <p className="tagline">Yeni bir oyun aç ya da bekleyen bir oyuna katıl — hamleler anında karşılıklı görünür.</p>

      <label className="time-select-label">
        Zaman kontrolü
        <select value={timeControl} onChange={(e) => setTimeControl(parseInt(e.target.value, 10))}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.v} value={t.v}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="time-select-label">
        Oyun kodu (rakibine sen söyleyeceksin)
        <input
          type="text"
          value={newGameCode}
          onChange={(e) => setNewGameCode(e.target.value.toUpperCase().slice(0, 12))}
          placeholder="Örn. KALE24"
          maxLength={12}
        />
      </label>

      <button className="primary-btn" onClick={createGame} disabled={busy}>
        {busy ? 'Oluşturuluyor…' : 'Yeni Oyun Oluştur'}
      </button>
      {error && <p className="form-error">{error}</p>}

      {myGames.length > 0 && (
        <>
          <h2 className="lobby-subhead">Devam Eden Oyunların</h2>
          <ul className="lobby-list">
            {myGames.map((g) => (
              <li key={g.id}>
                <span>{g.status === 'waiting' ? 'Rakip bekleniyor…' : 'Sırada oyun var'}</span>
                <button onClick={() => navigate(`/oyna/online/${g.id}`)}>Devam Et</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="lobby-subhead">Bekleyen Oyunlar</h2>
      {loading ? (
        <p className="hint-text">Yükleniyor…</p>
      ) : openGames.length === 0 ? (
        <p className="hint-text">Şu an bekleyen oyun yok — ilk oyunu sen aç.</p>
      ) : (
        <ul className="lobby-list">
          {openGames.map((g) => (
            <li key={g.id} className="lobby-list-item">
              <div className="lobby-list-row">
                <span>
                  {g.creator?.full_name || 'Bir üye'} rakip bekliyor
                  {' · '}
                  {TIME_OPTIONS.find((t) => t.v === g.time_control_minutes)?.label || `${g.time_control_minutes} dk`}
                </span>
                {joiningId !== g.id && (
                  <button onClick={() => startJoin(g.id)} disabled={busy}>Katıl</button>
                )}
              </div>
              {joiningId === g.id && (
                <div className="join-code-row">
                  <input
                    type="text"
                    autoFocus
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 12))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmJoin(g.id) }}
                    placeholder="Oyun kodu"
                    maxLength={12}
                  />
                  <button className="primary-btn" onClick={() => confirmJoin(g.id)} disabled={busy}>
                    {busy ? 'Kontrol ediliyor…' : 'Onayla'}
                  </button>
                  <button onClick={cancelJoin} disabled={busy}>Vazgeç</button>
                  {joinError && <p className="form-error">{joinError}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
