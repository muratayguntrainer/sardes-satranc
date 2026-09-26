// chess.js 0.12.x'in CommonJS export şekli bazı bundler'larda farklı
// görünebiliyor (default export ya da .Chess özelliği). İkisini de kapsar.
import ChessLib from 'chess.js'

export const Chess = ChessLib.Chess || ChessLib
