import { useState } from 'react'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
// Klasik "cburnett" satranç taşı seti (lichess.org'un varsayılan seti,
// serbestçe kullanılabilir/açık lisanslı) — public/pieces/ altında SVG olarak duruyor.
const PIECE_ICON = {
  wp: '/pieces/wP.svg', wn: '/pieces/wN.svg', wb: '/pieces/wB.svg',
  wr: '/pieces/wR.svg', wq: '/pieces/wQ.svg', wk: '/pieces/wK.svg',
  bp: '/pieces/bP.svg', bn: '/pieces/bN.svg', bb: '/pieces/bB.svg',
  br: '/pieces/bR.svg', bq: '/pieces/bQ.svg', bk: '/pieces/bK.svg',
}

// Basit, yeniden kullanılabilir satranç tahtası. `game` bir chess.js örneğidir;
// bu bileşen kendi başına hamle yapmaz, sadece seçileni ve tıklamaları yönetir,
// gerçek hamleyi üst bileşene (onMove) bırakır.
export default function ChessBoard({ game, onMove, orientation = 'white', disabled = false }) {
  const [selected, setSelected] = useState(null)

  const board = game.board() // [0]=rank8 ... [7]=rank1, dosyalar a->h

  function squareAt(row, col) {
    // row,col: ekrandaki 0..7 ızgara konumu (orientation'a göre gerçek kareye çevir)
    const rank = orientation === 'white' ? 8 - row : row + 1
    const file = orientation === 'white' ? col : 7 - col
    return FILES[file] + rank
  }

  function pieceAt(square) {
    const file = FILES.indexOf(square[0])
    const rank = parseInt(square[1], 10)
    const row = 8 - rank
    return board[row][file]
  }

  const legalTargets = selected
    ? game.moves({ square: selected, verbose: true }).map((m) => m.to)
    : []

  function handleClick(square) {
    if (disabled) return
    if (selected) {
      if (legalTargets.includes(square)) {
        onMove(selected, square)
        setSelected(null)
        return
      }
      const piece = pieceAt(square)
      if (piece && piece.color === game.turn()) {
        setSelected(square)
      } else {
        setSelected(null)
      }
      return
    }
    const piece = pieceAt(square)
    if (piece && piece.color === game.turn()) {
      setSelected(square)
    }
  }

  const cells = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = squareAt(row, col)
      const piece = pieceAt(square)
      const isLight = (row + col) % 2 === 0
      const isSelected = selected === square
      const isTarget = legalTargets.includes(square)
      cells.push(
        <div
          key={square}
          className={`cboard-sq ${isLight ? 'light' : 'dark'}${isSelected ? ' selected' : ''}`}
          onClick={() => handleClick(square)}
        >
          {piece && (
            <img
              className="cboard-piece-img"
              src={PIECE_ICON[piece.color + piece.type]}
              alt={`${piece.color === 'w' ? 'Beyaz' : 'Siyah'} ${piece.type}`}
              draggable={false}
            />
          )}
          {isTarget && <span className={piece ? 'cboard-dot-capture' : 'cboard-dot-move'} />}
        </div>
      )
    }
  }

  return <div className="cboard">{cells}</div>
}
