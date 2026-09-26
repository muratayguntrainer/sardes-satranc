import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Chess } from '../lib/chess'
import ChessBoard from '../components/ChessBoard'

function formatClock(ms, hasClock) {
  if (!hasClock) return '∞'
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

// NOT: Bu bileşendeki tüm hook'lar (useState/useEffect/vb.) en üstte, herhangi
// bir "erken return"dan önce çağrılır — React kuralı gereği. Veri henüz
// gelmediğinde (`row` null) hook'ların içi kendi kontrolünü yapar.
export default function OnlineGame() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const [row, setRow] = useState(null)
  const [error, setError] = useState('')
  const [moveError, setMoveError] = useState('')
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(Date.now())
  const timeoutSentRef = useRef(false)

  const loadGame = useCallback(async () => {
    const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (error) {
      setError('Oyun bulunamadı.')
      return
    }
    setRow(data)
  }, [gameId])

  useEffect(() => {
    loadGame()
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => setRow(payload.new)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, loadGame])

  const hasClock = !!row && row.time_control_minutes > 0
  const isActive = !!row && row.status === 'active'

  // Saatleri her saniye görsel olarak güncelle (sadece süreli ve aktif oyunlarda).
  useEffect(() => {
    if (!hasClock || !isActive) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasClock, isActive])

  const game = row ? new Chess(row.fen) : null
  const turnColor = game ? game.turn() : 'w'
  const myColor = row ? (row.white_id === user.id ? 'w' : row.black_id === user.id ? 'b' : null) : null

  const turnStartedMs = row?.turn_started_at ? new Date(row.turn_started_at).getTime() : now
  const elapsed = isActive ? Math.max(0, now - turnStartedMs) : 0
  const whiteRemaining = row && hasClock
    ? (turnColor === 'w' && isActive ? Math.max(0, row.white_time_ms - elapsed) : row.white_time_ms)
    : null
  const blackRemaining = row && hasClock
    ? (turnColor === 'b' && isActive ? Math.max(0, row.black_time_ms - elapsed) : row.black_time_ms)
    : null

  // Süresi biten tarafı, katılımcılardan biri (varsa) sunucuya bildirir.
  useEffect(() => {
    if (!row || !hasClock || !isActive || timeoutSentRef.current || !myColor) return
    const flagged = whiteRemaining <= 0 ? 'white' : blackRemaining <= 0 ? 'black' : null
    if (!flagged) return
    timeoutSentRef.current = true
    const winner = flagged === 'white' ? 'black' : 'white'
    supabase
      .from('games')
      .update({
        status: 'finished',
        result: winner,
        white_time_ms: flagged === 'white' ? 0 : row.white_time_ms,
        black_time_ms: flagged === 'black' ? 0 : row.black_time_ms,
      })
      .eq('id', gameId)
      .eq('status', 'active')
      .then(() => {
        timeoutSentRef.current = false
      })
  }, [row, hasClock, isActive, myColor, whiteRemaining, blackRemaining, gameId])

  if (error) {
    return (
      <div className="lobby">
        <p className="form-error">{error}</p>
        <Link to="/oyna/online">Lobiye dön</Link>
      </div>
    )
  }

  if (!row) return <p className="loading">Yükleniyor…</p>

  const isWhite = row.white_id === user.id
  const isBlack = row.black_id === user.id
  const myTurn = myColor && turnColor === myColor && row.status === 'active'

  async function handleMove(from, to) {
    if (!myTurn) return
    const move = game.move({ from, to, promotion: 'q' })
    if (!move) return

    let status = 'active'
    let result = null
    if (game.in_checkmate()) {
      status = 'finished'
      result = game.turn() === 'w' ? 'black' : 'white'
    } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      status = 'finished'
      result = 'draw'
    }

    const patch = {
      fen: game.fen(),
      status,
      result,
      last_move: { from, to },
      move_count: row.move_count + 1,
      updated_at: new Date().toISOString(),
    }

    if (hasClock) {
      // Bu hamleyi yapan tarafın saatinden geçen süreyi düş, sırayı devret.
      if (myColor === 'w') {
        patch.white_time_ms = Math.max(0, whiteRemaining)
      } else {
        patch.black_time_ms = Math.max(0, blackRemaining)
      }
      patch.turn_started_at = new Date().toISOString()
    }

    // İyimser güncelleme: karşı tarafın hamlesi gelene kadar kendi hamlenin
    // hemen tahtada görünmesi ve "sıra sende" durumunun anında değişmesi için.
    setRow((prev) => ({ ...prev, ...patch }))

    const { error: updateError } = await supabase.from('games').update(patch).eq('id', gameId)
    if (updateError) {
      // Güncelleme başarısız oldu — hamleyi geri al ve sunucudaki gerçek durumu göster.
      setMoveError('Hamlen kaydedilemedi, tekrar dene.')
      loadGame()
    } else if (moveError) {
      setMoveError('')
    }
  }

  function copyInviteLink() {
    const url = `${window.location.origin}/oyna/online/${gameId}`
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  let statusLine
  if (row.status === 'waiting') {
    const myWaitingColor = isWhite ? 'beyaz' : isBlack ? 'siyah' : null
    statusLine = myWaitingColor
      ? `Rakip bekleniyor — sen ${myWaitingColor} oynayacaksın. Kodu bir kulüp arkadaşına söyleyebilirsin.`
      : 'Rakip bekleniyor.'
  } else if (row.status === 'finished') {
    statusLine =
      row.result === 'draw'
        ? 'Oyun berabere bitti.'
        : `Oyun bitti — ${row.result === 'white' ? 'beyaz' : 'siyah'} kazandı.`
  } else if (!myColor) {
    statusLine = 'Bu oyunu izliyorsun.'
  } else {
    statusLine = myTurn ? 'Sıra sende.' : 'Rakibin oynuyor…'
  }

  return (
    <div className="online-game">
      <h1>Üye Maçı</h1>
      <p className="tagline">{statusLine}</p>

      {row.status !== 'waiting' && (
        <div className="clocks online-clocks">
          <div className={`clock-chip${turnColor === 'w' && isActive ? ' active' : ''}${hasClock && whiteRemaining <= 20000 && whiteRemaining > 0 ? ' low' : ''}`}>
            <span className="clock-label">Beyaz</span>
            <span className="clock-time">{formatClock(whiteRemaining, hasClock)}</span>
          </div>
          <div className={`clock-chip${turnColor === 'b' && isActive ? ' active' : ''}${hasClock && blackRemaining <= 20000 && blackRemaining > 0 ? ' low' : ''}`}>
            <span className="clock-label">Siyah</span>
            <span className="clock-time">{formatClock(blackRemaining, hasClock)}</span>
          </div>
        </div>
      )}

      {row.status === 'waiting' && row.created_by === user.id && (
        <button className="primary-btn" onClick={copyInviteLink}>
          {copied ? 'Kopyalandı!' : 'Davet Linkini Kopyala'}
        </button>
      )}

      {moveError && <p className="form-error">{moveError}</p>}

      <div className="online-board-wrap">
        <ChessBoard
          game={game}
          onMove={handleMove}
          orientation={isBlack ? 'black' : 'white'}
          disabled={!myTurn}
        />
      </div>

      <Link to="/oyna/online" className="auth-alt">← Lobiye dön</Link>
    </div>
  )
}
