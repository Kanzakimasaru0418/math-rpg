// =====================================================
// audio.js … 効果音とBGM（ぜんぶプログラムで鳴らす自作の音）
// =====================================================
// Web Audio API（ブラウザで音を作る仕組み）を使って、
// ファミコンのような「ピコピコ音」をその場で作ります。
// 曲もこのファイルで作曲したオリジナルなので、著作権の心配はありません。

let ctx = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem('mathrpg-muted') === '1';
} catch {
  /* 保存できない環境でも動くように */
}

// 音の名前（C4 など）→ 周波数（Hz）
const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function freq(name) {
  const m = name.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return 0;
  let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (n / 12);
}

// 最初にボタンが押されたときに呼ぶ（ブラウザのルールで、さわるまで音が出せないため）
export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
}

export function isMuted() {
  return muted;
}
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('mathrpg-muted', muted ? '1' : '0');
  } catch {
    /* 何もしない */
  }
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

// 1つの音を鳴らす
function tone(f, start, dur, { type = 'square', vol = 0.15, slide = 0 } = {}) {
  if (!ctx || !f) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.02);
}

// ザッという音（ノイズ）
function noise(start, dur, vol = 0.2) {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(start);
}

// ----- 効果音 -----
export const sfx = {
  select() {
    if (!ctx) return;
    tone(freq('A5'), ctx.currentTime, 0.06, { vol: 0.08 });
  },
  confirm() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(freq('E5'), t, 0.07, { vol: 0.1 });
    tone(freq('A5'), t + 0.06, 0.1, { vol: 0.1 });
  },
  correct() {
    if (!ctx) return;
    const t = ctx.currentTime;
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone(freq(n), t + i * 0.07, 0.15, { vol: 0.12 }));
  },
  wrong() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(freq('E3'), t, 0.25, { type: 'sawtooth', vol: 0.12, slide: 0.6 });
    tone(freq('C3'), t + 0.18, 0.35, { type: 'sawtooth', vol: 0.12, slide: 0.5 });
  },
  slash() {
    if (!ctx) return;
    noise(ctx.currentTime, 0.18, 0.25);
    tone(freq('C6'), ctx.currentTime, 0.15, { vol: 0.08, slide: 0.3 });
  },
  hurt() {
    if (!ctx) return;
    noise(ctx.currentTime, 0.3, 0.3);
    tone(110, ctx.currentTime, 0.3, { type: 'square', vol: 0.12, slide: 0.5 });
  },
  defeat() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) tone(freq('C6') * (1 - i * 0.1), t + i * 0.05, 0.08, { vol: 0.08 });
  },
  encounter() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 8; i++) tone(freq('C5') * 2 ** (i / 12), t + i * 0.03, 0.05, { vol: 0.07 });
  },
  barrier() {
    if (!ctx) return;
    const t = ctx.currentTime;
    ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone(freq(n), t + i * 0.06, 0.3, { type: 'triangle', vol: 0.12 }));
  },
  chest() {
    if (!ctx) return;
    const t = ctx.currentTime;
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => tone(freq(n), t + i * 0.08, 0.4, { type: 'triangle', vol: 0.12 }));
  },
  bump() {
    if (!ctx) return;
    tone(90, ctx.currentTime, 0.08, { vol: 0.08 });
  },
  tick() {
    if (!ctx) return;
    tone(freq('E6'), ctx.currentTime, 0.03, { vol: 0.04 });
  },
};

// ----- BGM（オリジナル曲）-----
// 1文字のかたまり＝8分音符1つ。'-' はのばす、'.' は休み
const SONGS = {
  field: {
    bpm: 132,
    lead: 'E5 - G5 C6 B5 - G5 - A5 - G5 E5 F5 - D5 - E5 - G5 C6 D6 - C6 B5 A5 - B5 G5 C6 - - - ' +
      'A5 - C6 A5 G5 - E5 - F5 - A5 F5 E5 - C5 - D5 - F5 A5 G5 - E5 D5 C5 - - - . . . . ',
    bass: 'C3 . G3 . C3 . G3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . . . ' +
      'F2 . C3 . F2 . C3 . D3 . A3 . D3 . A3 . G2 . D3 . G2 . B2 . C3 . G2 . C3 . . . ',
  },
  battle: {
    bpm: 168,
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 E5 A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 - E5 - ',
    bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3 A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 G2 G3 E2 E3 E2 E3 ',
  },
  boss: {
    bpm: 150,
    lead: 'D5 - F5 - A5 - G#5 - A5 - D6 - C6 A5 Bb5 - A5 - G5 - F5 E5 F5 - D5 - E5 - C#5 - A4 - ' +
      'D5 F5 A5 D6 C#6 - A5 - Bb5 A5 G5 F5 E5 - F5 G5 A5 - - - G5 - F5 - E5 - D5 - - - ',
    bass: 'D2 D2 D3 D2 D2 D2 D3 D2 Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1 G1 G1 G2 G1 A1 A1 A2 A1 D2 D2 D3 D2 A1 A1 C#2 E2 ' +
      'D2 D2 D3 D2 D2 D2 D3 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 A1 A1 A2 A1 A1 A1 A2 A1 D2 D2 D3 D2 D2 . . . ',
  },
  clear: {
    bpm: 140,
    lead: 'C5 E5 G5 C6 - - G5 C6 E6 - - - D6 C6 B5 C6 - - - - - - . . ',
    bass: 'C3 . G3 . C3 . E3 . G3 . C4 . G2 . D3 . G2 . C3 . . . . . ',
    loop: false,
  },
};

let current = null; // 今の曲
let timer = null;

export function playBgm(name) {
  if (!ctx) return;
  if (current?.name === name) return;
  stopBgm();
  const song = SONGS[name];
  if (!song) return;
  const lead = song.lead.trim().split(/\s+/);
  const bass = song.bass.trim().split(/\s+/);
  const step = 60 / song.bpm / 2; // 8分音符の長さ（秒）
  current = { name, i: 0, next: ctx.currentTime + 0.1 };
  // 少し先まで音を予約していく（スケジューリング）
  timer = setInterval(() => {
    while (current && current.next < ctx.currentTime + 0.25) {
      const i = current.i;
      if (song.loop === false && i >= lead.length) {
        stopBgm();
        return;
      }
      const li = i % lead.length;
      const len = (arr, k) => {
        let n = 1;
        while (arr[(k + n) % arr.length] === '-') n++;
        return n;
      };
      if (!['-', '.'].includes(lead[li])) tone(freq(lead[li]), current.next, step * len(lead, li) * 0.95, { vol: 0.05 });
      const bi = i % bass.length;
      if (!['-', '.'].includes(bass[bi])) tone(freq(bass[bi]), current.next, step * 0.9, { type: 'triangle', vol: 0.12 });
      current.next += step;
      current.i++;
    }
  }, 50);
}

export function stopBgm() {
  clearInterval(timer);
  timer = null;
  current = null;
}
