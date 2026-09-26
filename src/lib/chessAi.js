// Basit ama gerçek bir satranç motoru: negamax + alpha-beta budama,
// malzeme + kare-tablosu (piece-square table) değerlendirmesi.
// Stockfish gibi hazır bir motora bu ortamda erişilemediği için elle yazıldı.

export const LEVELS = [
  { n: 1, name: 'Yeni Başlayan', depth: 1, blunder: 0.55, topN: 8, noise: 120,
    desc: 'Rastgele hatalar yapar, kısa vadeli düşünür. İlk kez oynayanlar için ideal.' },
  { n: 2, name: 'Meraklı', depth: 1, blunder: 0.40, topN: 6, noise: 90,
    desc: 'Basit tuzaklara düşebilir, hâlâ oldukça hoşgörülü.' },
  { n: 3, name: 'Çırak', depth: 2, blunder: 0.28, topN: 5, noise: 70,
    desc: 'Temel taktikleri görür ama sık sık yanlış değerlendirir.' },
  { n: 4, name: 'Kulüp Oyuncusu', depth: 2, blunder: 0.18, topN: 4, noise: 50,
    desc: 'Kulüp seviyesinde dengeli bir rakip.' },
  { n: 5, name: 'İstikrarlı', depth: 3, blunder: 0.10, topN: 3, noise: 35,
    desc: 'Planlı oynar, küçük hatalara açık.' },
  { n: 6, name: 'Deneyimli', depth: 3, blunder: 0.05, topN: 2, noise: 22,
    desc: 'Taktik olarak güçlenir, dikkatli oynamak gerekir.' },
  { n: 7, name: 'Usta Adayı', depth: 3, blunder: 0.02, topN: 2, noise: 12,
    desc: 'Hataya çok az yer bırakır, iyi bir sınav.' },
  { n: 8, name: 'Kulüp Ustası', depth: 4, blunder: 0.0, topN: 2, noise: 6,
    desc: 'Derinlemesine hesaplar, sağlam bir rakip.' },
  { n: 9, name: 'Uzman', depth: 4, blunder: 0.0, topN: 1, noise: 0,
    desc: 'Çok az hata yapar, ciddi bir meydan okuma.' },
  { n: 10, name: 'Şampiyon', depth: 5, blunder: 0.0, topN: 1, noise: 0,
    desc: 'En güçlü seviye — tam derinlikte arar, yine de yenilebilir.' },
]

const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
]
const PST_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
]
const PST_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
]
const PST_KING = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
]

function pstValue(type, color, rank, file) {
  const idx = color === 'w' ? rank * 8 + file : (7 - rank) * 8 + file
  switch (type) {
    case 'p': return PST_PAWN[idx]
    case 'n': return PST_KNIGHT[idx]
    case 'b': return PST_BISHOP[idx]
    case 'k': return PST_KING[idx]
    default: return 0
  }
}

function evaluateBoard(g) {
  if (g.in_checkmate()) return g.turn() === 'w' ? -100000 : 100000
  if (g.in_draw() || g.in_stalemate() || g.in_threefold_repetition()) return 0
  const board = g.board()
  let score = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      const val = PIECE_VALUE[p.type] + pstValue(p.type, p.color, r, c)
      score += p.color === 'w' ? val : -val
    }
  }
  return score
}

function orderMoves(moves) {
  return moves.slice().sort((a, b) => {
    const av = a.captured ? PIECE_VALUE[a.captured] : 0
    const bv = b.captured ? PIECE_VALUE[b.captured] : 0
    return bv - av
  })
}

function negamax(g, depth, alpha, beta, sign) {
  if (depth === 0 || g.game_over()) return sign * evaluateBoard(g)
  const moves = orderMoves(g.moves({ verbose: true }))
  let best = -Infinity
  for (let i = 0; i < moves.length; i++) {
    g.move(moves[i])
    const score = -negamax(g, depth - 1, -beta, -alpha, -sign)
    g.undo()
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

// `g` verilen pozisyonda sırası gelen tarafın en iyi (ya da seviyeye göre
// kasıtlı hatalı) hamlesini seçer. `g`'yi değiştirmez.
export function pickAiMove(g, levelCfg) {
  const moves = orderMoves(g.moves({ verbose: true }))
  if (moves.length === 0) return null

  if (Math.random() < levelCfg.blunder) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  const sign = g.turn() === 'w' ? 1 : -1
  const scored = moves.map((m) => {
    g.move(m)
    let s = -negamax(g, levelCfg.depth - 1, -Infinity, Infinity, -sign)
    g.undo()
    if (levelCfg.noise > 0) s += (Math.random() * 2 - 1) * levelCfg.noise
    return { move: m, score: s }
  })
  scored.sort((a, b) => b.score - a.score)

  const n = Math.min(levelCfg.topN, scored.length)
  return scored[Math.floor(Math.random() * n)].move
}

export function evaluatePosition(g) {
  return evaluateBoard(g)
}
