// =====================================================
// share.js … 結果を X（旧Twitter）でシェアしたり、画像で保存したりするファイル
// =====================================================
// 「結果カード」は Canvas（キャンバス：プログラムで絵を描ける画用紙）に、
// ゲーム画面の写真と、タイムなどの文字を重ねて描いて作ります。

const W = 1200; // 画像の横はば（X で見やすい 1200 × 630 の大きさ）
const H = 630;
const FONT = '"DotGothic16", "Yu Gothic UI", "Hiragino Sans", sans-serif';

// 画像の読みこみを待つための道具
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ドラクエ風の「黒い窓に白いふち」を描く
function drawWindow(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 24, 0.86)';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f4f1ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 10);
  ctx.stroke();
  ctx.restore();
}

// 結果カードを作る → 画像データ（Blob：ブロブ＝ファイルの中身）を返す
// r = { cleared, gradeLabel, time, hp, missed, kills, url }
export async function makeResultImage(sceneDataUrl, r) {
  // ドット文字のフォントが読みこまれるのを待つ（まだなら少しだけ）
  try {
    await Promise.race([document.fonts.load(`40px ${FONT}`), new Promise((ok) => setTimeout(ok, 800))]);
  } catch {
    /* フォントがなくても描ける */
  }

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // 1. うしろにゲーム画面の写真をしきつめる（はみ出す分は切る）
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
  const img = sceneDataUrl ? await loadImage(sceneDataUrl) : null;
  if (img) {
    // 写真のまん中（宝箱や敵）が、結果の窓にかくれない右がわに来るようにずらす
    const cx = W * 0.76;
    const s = Math.max((cx * 2) / img.width, H / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    // バトル中のカメラは主役を画面の上のほうに写すので、写真の上がわを使う
    ctx.drawImage(img, cx - iw / 2, (H - ih) * 0.1, iw, ih);
  }
  // 左がわを暗くして、文字を読みやすくする
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.65)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 2. 結果の窓
  const wx = 50;
  const wy = 50;
  const ww = 600;
  const wh = 530;
  drawWindow(ctx, wx, wy, ww, wh);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const left = wx + 50;

  // タイトル
  ctx.font = `34px ${FONT}`;
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('数学RPG', left, wy + 80);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#cfd3ff';
  ctx.fillText('〜 むげんの魔王と 12の問い 〜', left + 160, wy + 78);

  // クリア or ゲームオーバー
  ctx.font = `60px ${FONT}`;
  ctx.fillStyle = r.cleared ? '#7ee08a' : '#ff7b7b';
  ctx.fillText(r.cleared ? 'GAME CLEAR!' : r.retired ? 'リタイア' : 'ゲームオーバー', left, wy + 170);

  // 学年のバッジ
  ctx.font = `26px ${FONT}`;
  const badge = `【${r.gradeLabel}】`;
  ctx.fillStyle = '#ffd54f';
  ctx.fillText(badge, left, wy + 225);

  // 結果の行
  const rows = r.cleared
    ? [
        ['クリアタイム', r.time, '#ffd54f', 52],
        ['のこりHP', `${r.hp} / 100`, '#ffffff', 34],
        ['まちがい', `${r.missed} 問`, r.missed === 0 ? '#7ee08a' : '#ffffff', 34],
      ]
    : [
        ['たおした数', `${r.kills} / 9`, '#ffd54f', 52],
        ['プレイ時間', r.time, '#ffffff', 34],
        ['まちがい', `${r.missed} 問`, '#ffffff', 34],
      ];
  let y = wy + 300;
  for (const [label, value, color, size] of rows) {
    ctx.font = `26px ${FONT}`;
    ctx.fillStyle = '#cfd3ff';
    ctx.fillText(label, left, y);
    ctx.font = `${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(value, wx + ww - 50, y + (size > 40 ? 6 : 0));
    ctx.textAlign = 'left';
    y += size > 40 ? 80 : 62;
  }

  // ノーミスのときのごほうびメッセージ
  if (r.cleared && r.missed === 0) {
    ctx.font = `24px ${FONT}`;
    ctx.fillStyle = '#7ee08a';
    ctx.fillText('★ ノーミス クリア！ ★', left, wy + wh - 40);
  }

  // 右下にアドレス
  ctx.font = `22px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText(r.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), W - 40, H - 36);
  ctx.shadowBlur = 0;

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

// X（旧Twitter）の投稿画面をひらく
// ※ X のこの方法では画像はつけられないので、文とアドレスだけを入れる
export function shareToX(text, url) {
  const u = new URL('https://x.com/intent/tweet');
  u.searchParams.set('text', text);
  u.searchParams.set('url', url);
  u.searchParams.set('hashtags', '数学RPG');
  window.open(u.toString(), '_blank', 'noopener');
}

// 画像をダウンロード（保存）する
export function saveImage(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// スマホの「共有」メニューで画像を送れるか（写真に保存・Xに画像つきで投稿 など）
export function canShareImage() {
  try {
    const f = new File([new Blob(['x'], { type: 'image/png' })], 'test.png', { type: 'image/png' });
    return !!navigator.canShare?.({ files: [f] });
  } catch {
    return false;
  }
}

// 共有メニューで画像を送る
// 結果：'shared'（送れた）／'cancel'（とちゅうでやめた）／'error'（使えなかった）
export async function shareImage(blob, filename, text) {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], text });
    return 'shared';
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancel' : 'error';
  }
}
