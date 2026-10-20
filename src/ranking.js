// =====================================================
// ranking.js … ランキングの記録と読みこみ
// =====================================================
// Vercel（バーセル）で公開したあとは、インターネット上のデータベースに保存して
// 世界中の人と競えるようにします（api/ranking.js がその受付係）。
// まだデータベースがないとき（自分のパソコンで試しているとき）は、
// ブラウザの中（localStorage：ブラウザの小さな保存場所）に保存します。

const LOCAL_KEY = 'mathrpg-ranking';
const NG_WORDS = ['しね', '死ね', '殺', 'ころす', 'fuck', 'shit', 'bitch', 'sex', 'ちんこ', 'まんこ', 'ちんぽ', 'kill'];

// 名前のチェック（8文字まで・ことばのチェック）
export function checkName(name) {
  const n = name.trim();
  if (n.length === 0) return 'なまえを入れてね';
  if ([...n].length > 8) return 'なまえは8文字までだよ';
  const lower = n.toLowerCase();
  if (NG_WORDS.some((w) => lower.includes(w))) return 'その なまえは つかえないよ';
  return null;
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* 保存できなくてもゲームは続ける */
  }
}

// ランキングを取ってくる → { list: [{name, time}], online: true/false }
export async function fetchRanking(level) {
  try {
    const res = await fetch(`/api/ranking?level=${encodeURIComponent(level)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.list)) return { list: data.list, online: true };
    }
  } catch {
    /* インターネットのランキングが使えないときは下へ */
  }
  const local = readLocal()[level] || [];
  return { list: local.slice(0, 10), online: false };
}

// 記録を送る
export async function submitRanking(level, name, time) {
  try {
    const res = await fetch('/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, name, time }),
    });
    if (res.ok) return { online: true };
  } catch {
    /* 下でブラウザに保存 */
  }
  const data = readLocal();
  const list = data[level] || [];
  list.push({ name, time, at: Date.now() });
  list.sort((a, b) => a.time - b.time);
  data[level] = list.slice(0, 10);
  writeLocal(data);
  return { online: false };
}

// ミリ秒 → 「2:05.32」のような見た目にする
export function formatTime(ms) {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = (total % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}
