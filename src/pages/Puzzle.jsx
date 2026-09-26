import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from '../lib/chess'
import { PUZZLE_THEMES, ALL_PUZZLES } from '../data/puzzles'
import ChessBoard from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function loadSolved() {
  try {
    const raw = localStorage.getItem('kaleMeydaniSolvedPuzzleIds')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
function saveSolved(arr) {
  try { localStorage.setItem('kaleMeydaniSolvedPuzzleIds', JSON.stringify(arr)) } catch { /* yok say */ }
}

export default function Puzzle() {
  const { user } = useAuth()
  const [themeId, setThemeId] = useState(PUZZLE_THEMES[0].id)
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [message, setMessage] = useState(null) // {kind:'good'|'bad', text}
  const [solvedIds, setSolvedIds] = useState(loadSolved)
  const revertTimerRef = useRef(null)

  const theme = PUZZLE_THEMES.find((t) => t.id === themeId) || PUZZLE_THEMES[0]
  const puzzle = theme.puzzles[puzzleIndex] || theme.puzzles[0]
  const puzzleId = `${theme.id}-${puzzleIndex}`
  const [fen, setFen] = useState(puzzle.fen)
  const game = useMemo(() => new Chess(fen), [fen])

  useEffect(() => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current)
      revertTimerRef.current = null
    }
    setFen(puzzle.fen)
    setSolved(solvedIds.includes(puzzleId))
    setMessage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, puzzleIndex])

  useEffect(() => {
    return () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current)
    }
  }, [])

  function handleThemeChange(id) {
    setThemeId(id)
    setPuzzleIndex(0)
  }

  async function markSolved() {
    if (solvedIds.includes(puzzleId)) return
    const next = [...solvedIds, puzzleId]
    setSolvedIds(next)
    saveSolved(next)
    if (user) {
      const completedThemes = PUZZLE_THEMES.filter((t) =>
        t.puzzles.every((_, i) => next.includes(`${t.id}-${i}`))
      ).length
      const { error } = await supabase.from('profiles').update({
        puzzles_solved: next.length,
        highest_puzzle_level: completedThemes,
      }).eq('id', user.id)
      // eslint-disable-next-line no-console
      if (error) console.error('Puzzle sayacı güncellenemedi:', error.message)
    }
  }

  function handleMove(from, to) {
    if (solved) return
    const isCorrect = from === puzzle.from && to === puzzle.to
    if (isCorrect) {
      const g = new Chess(fen)
      g.move({ from, to, promotion: 'q' })
      setFen(g.fen())
      setSolved(true)
      setMessage({ kind: 'good', text: `Doğru! ${theme.name} motifini buldun.` })
      markSolved()
    } else {
      setMessage({ kind: 'bad', text: 'Bu hamle çözüm değil — tahta başa alındı, tekrar dene.' })
      const revertToFen = puzzle.fen
      revertTimerRef.current = setTimeout(() => {
        revertTimerRef.current = null
        setFen(revertToFen)
      }, 700)
    }
  }

  const themeSolvedCount = theme.puzzles.filter((_, i) => solvedIds.includes(`${theme.id}-${i}`)).length
  const pct = Math.round((solvedIds.length / ALL_PUZZLES.length) * 100)

  return (
    <div className="ai-game">
      <h1>Puzzle Çöz</h1>
      <div className="game-layout">
        <div className="board-card">
          <div className="status-row">
            <span className={`status-pill${solved ? ' over' : ''}`}>{solved ? 'Çözüldü!' : 'Beyaz oynar — en iyi hamleyi bul'}</span>
            <span className="level-chip">{theme.name} — {puzzleIndex + 1}/{theme.puzzles.length}</span>
          </div>
          <ChessBoard game={game} onMove={handleMove} orientation="white" disabled={solved} />
          {message && (
            <p className={message.kind === 'good' ? 'form-info' : 'form-error'} style={{ marginTop: 10 }}>{message.text}</p>
          )}
        </div>

        <div className="panel">
          <div className="side-card">
            <h2>Konu Başlığı</h2>
            <select value={themeId} onChange={(e) => handleThemeChange(e.target.value)}>
              {PUZZLE_THEMES.map((t) => {
                const solvedInTheme = t.puzzles.filter((_, i) => solvedIds.includes(`${t.id}-${i}`)).length
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({solvedInTheme}/{t.puzzles.length}){solvedInTheme === t.puzzles.length ? ' ✓' : ''}
                  </option>
                )
              })}
            </select>
            <p className="hint-text">{theme.description}</p>
          </div>

          <div className="side-card">
            <h2>Soru</h2>
            <select value={puzzleIndex} onChange={(e) => setPuzzleIndex(parseInt(e.target.value, 10))}>
              {theme.puzzles.map((p, i) => (
                <option key={i} value={i}>
                  {i + 1}. {p.name}{solvedIds.includes(`${theme.id}-${i}`) ? ' ✓' : ''}
                </option>
              ))}
            </select>
            <p className="hint-text">{puzzle.hint}</p>
          </div>

          <div className="side-card">
            <h2>İlerleme</h2>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <p className="hint-text">{solvedIds.length}/{ALL_PUZZLES.length} soru çözüldü · bu konuda {themeSolvedCount}/{theme.puzzles.length}</p>
          </div>

          <div className="side-card">
            <div className="btn-row">
              <button className="primary-btn" onClick={() => setFen(puzzle.fen)} style={{ gridColumn: '1 / -1' }}>Baştan Dene</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
