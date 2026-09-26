import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from '../lib/chess'
import { LEVELS, pickAiMove } from '../lib/chessAi'
import { createStockfish, STOCKFISH_LEVELS } from '../lib/stockfishEngine'
import ChessBoard from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function loadLevel() {
  try {
    const raw = localStorage.getItem('kaleMeydaniLevel')
    const n = raw ? parseInt(raw, 10) : 3
    return LEVELS.some((l) => l.n === n) ? n : 3
  } catch {
    return 3
  }
}

export default function AiGame() {
  const { user, profile } = useAuth()
  const [fen, setFen] = useState(new Chess().fen())
  const [level, setLevel] = useState(loadLevel)
  const [thinking, setThinking] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [overMessage, setOverMessage] = useState('')
  const [banner, setBanner] = useState(null)
  const [engineReady, setEngineReady] = useState(false)
  const statSentRef = useRef(false)
  const engineRef = useRef(null)
  const moveTokenRef = useRef(0)

  // Sayfa açılınca Stockfish'i yüklemeyi dene. Başarısız olursa (ağ/engelleyici)
  // sessizce yerel yedek motora (chessAi.js) düşülür — engineRef.current null kalır.
  useEffect(() => {
    let cancelled = false
    createStockfish()
      .then((engine) => {
        if (cancelled) { engine.destroy(); return }
        engineRef.current = engine
        setEngineReady(true)
      })
      .catch(() => {
        // yerel motor zaten devrede, ekstra bir şey yapmaya gerek yok
      })
    return () => {
      cancelled = true
      moveTokenRef.current += 1 // bekleyen bir hamle varsa sonucunu artık uygulama
      if (engineRef.current) engineRef.current.destroy()
    }
  }, [])

  const game = new Chess(fen)
  const levelCfg = LEVELS.find((l) => l.n === level) || LEVELS[2]
  const isOver = gameOver || game.game_over()

  const resetGame = useCallback(() => {
    moveTokenRef.current += 1 // devam eden bir AI hamlesi varsa artık geçersiz say
    setFen(new Chess().fen())
    setThinking(false)
    setGameOver(false)
    setOverMessage('')
    setBanner(null)
    statSentRef.current = false
  }, [])

  // Oyun bittiğinde (mat/berabere), üyenin profil sayacını bir kez güncelle.
  useEffect(() => {
    if (!isOver || !user || statSentRef.current) return
    statSentRef.current = true
    const played = (profile?.games_played ?? 0) + 1
    supabase.from('profiles').update({ games_played: played }).eq('id', user.id)
      .then(({ error }) => {
        // eslint-disable-next-line no-console
        if (error) console.error('Oyun sayacı güncellenemedi:', error.message)
      })
  }, [isOver, user, profile])

  function afterMove(g) {
    setFen(g.fen())
    if (g.game_over()) {
      setGameOver(true)
      if (g.in_checkmate()) {
        setOverMessage(g.turn() === 'w' ? 'Şah mat — Yapay zeka kazandı.' : 'Şah mat — Sen kazandın!')
      } else {
        setOverMessage('Oyun berabere.')
      }
      return true
    }
    return false
  }

  async function handlePlayerMove(from, to) {
    if (thinking || isOver) return
    const g = new Chess(fen)
    const move = g.move({ from, to, promotion: 'q' })
    if (!move) return
    setBanner(null)
    const over = afterMove(g)
    if (over) return
    setThinking(true)
    const myToken = ++moveTokenRef.current // bu hamle turunu benzersiz şekilde etiketle

    const g2 = new Chess(g.fen())
    let mv = null
    const sfLevel = STOCKFISH_LEVELS.find((l) => l.n === level) || STOCKFISH_LEVELS[2]
    if (engineRef.current) {
      try {
        mv = await engineRef.current.getBestMove(g2.fen(), sfLevel)
      } catch {
        mv = null // motor takıldı/zaman aşımına uğradı — yerel motora düş
      }
    }
    if (!mv) {
      await new Promise((r) => setTimeout(r, 250))
      mv = pickAiMove(g2, levelCfg)
    }

    // Beklerken oyun sıfırlandıysa, sayfadan ayrıldıysa ya da yeni bir tur
    // başladıysa bu sonucu artık uygulama — eski/iptal edilmiş oyunun
    // hamlesini yeni tahtanın üzerine yazmasını engeller.
    if (myToken !== moveTokenRef.current) return

    setThinking(false)
    if (!mv) {
      setGameOver(true)
      return
    }
    g2.move(mv)
    afterMove(g2)
  }

  function handleLevelChange(e) {
    const n = parseInt(e.target.value, 10)
    setLevel(n)
    try { localStorage.setItem('kaleMeydaniLevel', String(n)) } catch { /* yok say */ }
  }

  function handleUndo() {
    if (thinking) return
    const g = new Chess(fen)
    g.undo()
    g.undo()
    setFen(g.fen())
    setGameOver(false)
    setOverMessage('')
    setBanner(null)
  }

  function handleResign() {
    if (thinking || isOver) return
    setGameOver(true)
    setOverMessage('Pes ettin — Yapay zeka kazandı.')
  }

  function handleDrawOffer() {
    if (thinking || isOver) return
    const g = new Chess(fen)
    const farEnough = g.history().length > 16
    if (farEnough) {
      setGameOver(true)
      setOverMessage('Beraberlik teklifin kabul edildi.')
    } else {
      setBanner('Yapay zeka beraberlik teklifini reddetti — pozisyonu avantajlı görüyor.')
    }
  }

  const turnColor = game.turn()
  let statusLine
  if (thinking) statusLine = 'Yapay zeka düşünüyor…'
  else if (isOver) statusLine = overMessage || 'Oyun bitti.'
  else statusLine = turnColor === 'w' ? 'Sıra sende (beyaz)' + (game.in_check() ? ' — Şah!' : '') : 'Sıra yapay zekada'

  return (
    <div className="ai-game">
      <h1>Yapay Zekaya Karşı Oyna</h1>
      <div className="game-layout">
        <div className="board-card">
          <div className="status-row">
            <span className={`status-pill${thinking ? ' thinking' : ''}${isOver ? ' over' : ''}`}>{statusLine}</span>
          </div>
          <ChessBoard game={game} onMove={handlePlayerMove} orientation="white" disabled={thinking || isOver || turnColor !== 'w'} />
          {banner && <p className="form-info" style={{ marginTop: 10 }}>{banner}</p>}
        </div>

        <div className="panel">
          <div className="side-card">
            <h2>Zorluk Seviyesi</h2>
            <select value={level} onChange={handleLevelChange} disabled={thinking}>
              {LEVELS.map((l) => (
                <option key={l.n} value={l.n}>Seviye {l.n} — {l.name}</option>
              ))}
            </select>
            <p className="hint-text">{levelCfg.desc}</p>
            <p className="hint-text">Motor: {engineReady ? 'Stockfish' : 'Yerleşik motor'}</p>
          </div>

          <div className="side-card">
            <h2>Oyun</h2>
            <div className="btn-row">
              <button className="primary-btn" onClick={resetGame} disabled={thinking}>Yeni Oyun</button>
              <button onClick={handleUndo} disabled={thinking || isOver}>Geri Al</button>
              <button onClick={handleDrawOffer} disabled={thinking || isOver}>Beraberlik Teklif Et</button>
              <button className="danger-btn" onClick={handleResign} disabled={thinking || isOver}>Pes Et</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
