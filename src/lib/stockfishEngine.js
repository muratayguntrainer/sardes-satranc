// Stockfish'i tarayıcıda bir Web Worker içinde çalıştıran hafif bir sarmalayıcı.
// npm paketi olarak eklemek yerine (Vite'ta wasm asset yolları için ekstra
// yapılandırma gerektirir ve bu ortamda test edilemez), motoru herkese açık
// cdnjs CDN'inden `importScripts` ile worker içine yüklüyoruz — bu, tarayıcı
// güvenlik kısıtlamalarına takılmayan, yaygın kullanılan bir yöntemdir.
// Motor bir sebeple yüklenemezse (ağ, engelleyici vb.) `create()` reddedilir
// ve çağıran taraf (AiGame.jsx) otomatik olarak yerel yedek motora
// (chessAi.js) düşer — oyun hiçbir zaman kırılmaz.

const ENGINE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
const INIT_TIMEOUT_MS = 6000
const MOVE_TIMEOUT_MS = 9000

// 10 seviyeyi Stockfish "Skill Level" (0-20) ve arama derinliğine eşle.
export const STOCKFISH_LEVELS = [
  { n: 1, skill: 0, depth: 2 },
  { n: 2, skill: 2, depth: 3 },
  { n: 3, skill: 4, depth: 4 },
  { n: 4, skill: 6, depth: 5 },
  { n: 5, skill: 8, depth: 6 },
  { n: 6, skill: 10, depth: 8 },
  { n: 7, skill: 12, depth: 10 },
  { n: 8, skill: 14, depth: 12 },
  { n: 9, skill: 17, depth: 14 },
  { n: 10, skill: 20, depth: 16 },
]

function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  }
}

export function createStockfish() {
  return new Promise((resolve, reject) => {
    let worker
    try {
      const bootstrap = `importScripts(${JSON.stringify(ENGINE_URL)});`
      const blob = new Blob([bootstrap], { type: 'application/javascript' })
      worker = new Worker(URL.createObjectURL(blob))
    } catch (e) {
      reject(e)
      return
    }

    let settled = false
    const initTimer = setTimeout(() => {
      if (settled) return
      settled = true
      worker.terminate()
      reject(new Error('stockfish init timeout'))
    }, INIT_TIMEOUT_MS)

    function onReady() {
      if (settled) return
      settled = true
      clearTimeout(initTimer)
      worker.onmessage = null

      let pending = null // { resolve, reject, timer }
      let dead = false // worker bir kez hata verdiyse artık güvenilmez, hemen reddet

      worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : ''
        if (pending && line.startsWith('bestmove')) {
          clearTimeout(pending.timer)
          const uci = line.split(' ')[1]
          const mv = uci && uci !== '(none)' ? parseUciMove(uci) : null
          const r = pending.resolve
          pending = null
          r(mv)
        }
      }
      worker.onerror = () => {
        dead = true
        if (pending) {
          clearTimeout(pending.timer)
          const rj = pending.reject
          pending = null
          rj(new Error('stockfish worker error'))
        }
      }

      resolve({
        getBestMove(fen, levelCfg) {
          return new Promise((res, rej) => {
            if (dead) {
              rej(new Error('stockfish dead'))
              return
            }
            if (pending) {
              rej(new Error('stockfish busy'))
              return
            }
            const timer = setTimeout(() => {
              pending = null
              rej(new Error('stockfish move timeout'))
            }, MOVE_TIMEOUT_MS)
            pending = { resolve: res, reject: rej, timer }
            worker.postMessage(`setoption name Skill Level value ${levelCfg.skill}`)
            worker.postMessage(`position fen ${fen}`)
            worker.postMessage(`go depth ${levelCfg.depth}`)
          })
        },
        destroy() {
          dead = true
          try { worker.terminate() } catch { /* yok say */ }
        },
      })
    }

    // uci -> uciok -> isready -> readyok sırasını bekle
    let uciAcked = false
    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : ''
      if (!uciAcked && line.includes('uciok')) {
        uciAcked = true
        worker.postMessage('isready')
      } else if (uciAcked && line.includes('readyok')) {
        onReady()
      }
    }
    worker.onerror = (err) => {
      if (settled) return
      settled = true
      clearTimeout(initTimer)
      reject(err)
    }
    worker.postMessage('uci')
  })
}
