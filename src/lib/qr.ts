/**
 * Self-contained QR Code encoder — no external dependencies.
 * Byte-mode encoding, EC level M, versions 1-4.
 * Styled for Bodhi's Temple Garden palette.
 */

// GF(256) lookup tables for Reed-Solomon
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let v = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = v; LOG[v] = i; v = (v << 1) ^ (v >= 128 ? 0x11d : 0); }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = new Uint8Array(ecLen + 1);
  gen[0] = 1;
  for (let i = 0; i < ecLen; i++) {
    for (let j = ecLen; j >= 1; j--) gen[j] = gen[j - 1] ^ gfMul(gen[j], EXP[i]);
    gen[0] = gfMul(gen[0], EXP[i]);
  }
  const msg = new Uint8Array(data.length + ecLen);
  for (let i = 0; i < data.length; i++) msg[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef === 0) continue;
    for (let j = 0; j <= ecLen; j++) msg[i + j] ^= gfMul(gen[j], coef);
  }
  return Array.from(msg.slice(data.length));
}

// Version params: [totalCodewords, ecPerBlock, numBlocks]
const VP: [number, number, number][] = [
  [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], // v1-v4, EC level M
];

function pickVersion(byteLen: number): number {
  for (let v = 0; v < 4; v++) { if (byteLen <= VP[v][0] - VP[v][1] * VP[v][2]) return v + 1; }
  throw new Error(`Data too long for QR v1-4 (${byteLen} bytes)`);
}

function encodeData(data: string, version: number): number[] {
  const [total, ecPerBlock, numBlocks] = VP[version - 1];
  const dataCap = total - ecPerBlock * numBlocks;
  const bytes = new TextEncoder().encode(data);
  const bits: number[] = [];
  const push = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4); push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  push(0, 4);
  while (bits.length % 8 !== 0) bits.push(0);
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) cw.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let p = 0; cw.length < dataCap; p++) cw.push(p % 2 === 0 ? 0xec : 0x11);

  // Split into blocks, compute EC, interleave
  const bs = Math.floor(dataCap / numBlocks);
  const allD: number[][] = [], allE: number[][] = [];
  let off = 0;
  for (let b = 0; b < numBlocks; b++) {
    const extra = b >= numBlocks - (dataCap % numBlocks) && dataCap % numBlocks !== 0 ? 1 : 0;
    const block = cw.slice(off, off + bs + extra); off += block.length;
    allD.push(block); allE.push(rsEncode(block, ecPerBlock));
  }
  const result: number[] = [];
  const maxLen = Math.max(...allD.map(b => b.length));
  for (let i = 0; i < maxLen; i++) for (const bl of allD) if (i < bl.length) result.push(bl[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const bl of allE) if (i < bl.length) result.push(bl[i]);
  return result;
}

// Module placement
function createMatrix(version: number): { grid: number[][]; reserved: boolean[][] } {
  const size = version * 4 + 17;
  const grid = Array.from({ length: size }, () => new Array(size).fill(0));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r: number, c: number, val: number) => {
    if (r >= 0 && r < size && c >= 0 && c < size) { grid[r][c] = val; reserved[r][c] = true; }
  };

  // Finder patterns + separators
  const drawFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const border = dr === -1 || dr === 7 || dc === -1 || dc === 7;
      const outer = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      set(r, c, !border && (outer || inner) ? 1 : 0);
    }
  };
  drawFinder(0, 0); drawFinder(0, size - 7); drawFinder(size - 7, 0);

  // Alignment pattern (v >= 2)
  if (version >= 2) {
    const pos = [6, version * 4 + 10];
    for (const r of pos) for (const c of pos) {
      if (reserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
        set(r + dr, c + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) set(6, i, i % 2 === 0 ? 1 : 0);
    if (!reserved[i][6]) set(i, 6, i % 2 === 0 ? 1 : 0);
  }
  set(size - 8, 8, 1); // dark module

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true; reserved[8][size - 1 - i] = true;
    reserved[i][8] = true; reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;
  return { grid, reserved };
}

function placeData(grid: number[][], reserved: boolean[][], codewords: number[]): void {
  const size = grid.length;
  const bits: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  let bitIdx = 0, upward = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) for (const dc of [0, -1]) {
      const c = col + dc;
      if (c < 0 || reserved[row][c]) continue;
      grid[row][c] = bitIdx < bits.length ? bits[bitIdx++] : 0;
    }
    upward = !upward;
  }
}

// Masking
const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0,
  (_, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(grid: number[][], reserved: boolean[][], mask: number): number[][] {
  return grid.map((row, r) => row.map((v, c) => reserved[r][c] ? v : v ^ (MASKS[mask](r, c) ? 1 : 0)));
}

function penalty(grid: number[][]): number {
  const n = grid.length;
  let score = 0;
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) { if (grid[r][c] === grid[r][c - 1]) run++; else { if (run >= 5) score += run - 2; run = 1; } }
    if (run >= 5) score += run - 2;
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) { if (grid[r][c] === grid[r - 1][c]) run++; else { if (run >= 5) score += run - 2; run = 1; } }
    if (run >= 5) score += run - 2;
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = grid[r][c];
    if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
  }
  return score;
}

function writeFormatInfo(grid: number[][], mask: number): void {
  const n = grid.length, data = (0b00 << 3) | mask; // EC M = 00
  let bits = data << 10;
  for (let i = 4; i >= 0; i--) if (bits & (1 << (i + 10))) bits ^= 0b10100110111 << i;
  bits = ((data << 10) | bits) ^ 0b101010000010010;
  const sb = (r: number, c: number, i: number) => { grid[r][c] = (bits >> i) & 1; };
  for (let i = 0; i <= 5; i++) sb(8, i, 14 - i);
  sb(8, 7, 8); sb(8, 8, 7); sb(7, 8, 6);
  for (let i = 0; i <= 5; i++) sb(5 - i, 8, 9 + i);
  for (let i = 0; i <= 7; i++) sb(n - 1 - i, 8, i);
  for (let i = 0; i <= 7; i++) sb(8, n - 8 + i, 7 - i);
}

/** Generate a QR code as an SVG string. Temple Garden palette: maroon on aged paper. */
export function generateQrSvg(data: string, size = 200): string {
  const version = pickVersion(new TextEncoder().encode(data).length);
  const modules = version * 4 + 17;
  const codewords = encodeData(data, version);
  const { grid, reserved } = createMatrix(version);
  placeData(grid, reserved, codewords);

  // Pick best mask
  let bestMask = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    const c = applyMask(grid, reserved, m);
    writeFormatInfo(c, m);
    const s = penalty(c);
    if (s < bestScore) { bestScore = s; bestMask = m; }
  }
  const final = applyMask(grid, reserved, bestMask);
  writeFormatInfo(final, bestMask);

  // Render SVG with rounded modules
  const quiet = 2, total = modules + quiet * 2;
  const cell = size / total, r = cell * 0.3;
  let rects = "";
  for (let row = 0; row < modules; row++) for (let col = 0; col < modules; col++) {
    if (!final[row][col]) continue;
    const x = ((col + quiet) * cell).toFixed(2), y = ((row + quiet) * cell).toFixed(2);
    const w = cell.toFixed(2), cr = r.toFixed(2);
    rects += `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${cr}" ry="${cr}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
    + `<rect width="${size}" height="${size}" rx="8" ry="8" fill="#f4e8d1"/>`
    + `<g fill="#5c1a2a">${rects}</g></svg>`;
}
