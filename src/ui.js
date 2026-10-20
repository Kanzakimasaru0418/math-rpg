// =====================================================
// ui.js … どの画面でも使う「ボタン」や「文字」の部品
// =====================================================

// 日本語がきれいに見えるフォント（文字の形）の指定
export const FONT = '"Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", sans-serif';

// ドラクエ風の「黒い箱に白いふち」のボタンを作る
// scene: どの画面に置くか / x, y: まん中の位置 / label: 文字 / onClick: 押されたときにすること
export function makeButton(scene, x, y, width, height, label, onClick) {
  // ボタンの箱
  const box = scene.add
    .rectangle(x, y, width, height, 0x000000, 0.85)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true }); // マウスやタッチで押せるようにする

  // ボタンの文字
  const text = scene.add
    .text(x, y, label, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center' })
    .setOrigin(0.5);

  // マウスが乗ったら黄色っぽくする（押せることがわかりやすい）
  box.on('pointerover', () => box.setStrokeStyle(3, 0xffd54f));
  box.on('pointerout', () => box.setStrokeStyle(3, 0xffffff));
  box.on('pointerdown', onClick);

  // 箱と文字をまとめて返す（あとで色を変えたりするため）
  return { box, text };
}
