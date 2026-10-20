// =====================================================
// MapScene.js … マップを歩く画面
// 黄色い「？」マスに乗ると、4択クイズが始まる
// =====================================================
import * as Phaser from 'phaser';
import { LEVELS } from '../questions.js';
import { FONT } from '../ui.js';

// ===== 決まった数字（定数：ていすう＝あとから変わらない数） =====
export const TILE = 32; // 1マスの大きさ（ピクセル：画面の点の数）
export const COLS = 20; // 横のマスの数
export const ROWS = 15; // たてのマスの数

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    // --- 草のマス目をしきつめる ---
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = (x + y) % 2 === 0 ? 0x4caf50 : 0x43a047;
        this.add.rectangle(x * TILE, y * TILE, TILE, TILE, color).setOrigin(0);
      }
    }

    // --- 「？」マス（あとで敵に置きかえる予定） ---
    // 配列（はいれつ：データをならべてしまっておく入れ物）に位置を入れておく
    this.quizSpots = [
      { col: 4, row: 3 },
      { col: 15, row: 4 },
      { col: 6, row: 11 },
      { col: 16, row: 12 },
    ].map((spot) => {
      const cx = spot.col * TILE + TILE / 2;
      const cy = spot.row * TILE + TILE / 2;
      spot.box = this.add.rectangle(cx, cy, TILE - 4, TILE - 4, 0xffd54f);
      spot.mark = this.add
        .text(cx, cy, '？', { fontFamily: FONT, fontSize: '20px', color: '#5d4037', fontStyle: 'bold' })
        .setOrigin(0.5);
      return spot;
    });

    // --- 主人公（今はただの青い四角） ---
    this.playerCol = 10;
    this.playerRow = 7;
    this.player = this.add.rectangle(
      this.playerCol * TILE + TILE / 2,
      this.playerRow * TILE + TILE / 2,
      TILE - 6,
      TILE - 6,
      0x2196f3
    );

    // --- 矢印キーを使えるようにする ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.isMoving = false;

    // --- 画面の上の情報 ---
    this.correctCount = 0; // 正解した数
    const levelLabel = LEVELS[this.registry.get('level')].label;
    this.infoText = this.add.text(8, 8, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: { x: 6, y: 4 },
    });
    this.levelLabel = levelLabel;
    this.updateInfo();
  }

  // 画面の上の文字を書きかえる
  updateInfo() {
    this.infoText.setText(
      `【${this.levelLabel}】 ？マスを調べよう　せいかい：${this.correctCount}`
    );
  }

  update() {
    if (this.isMoving) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;
    if (dx === 0 && dy === 0) return;

    const nextCol = this.playerCol + dx;
    const nextRow = this.playerRow + dy;
    if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) return;

    this.playerCol = nextCol;
    this.playerRow = nextRow;
    this.isMoving = true;

    this.tweens.add({
      targets: this.player,
      x: nextCol * TILE + TILE / 2,
      y: nextRow * TILE + TILE / 2,
      duration: 150,
      onComplete: () => {
        this.isMoving = false;
        this.checkQuizSpot(); // 歩き終わったら「？」マスの上か調べる
      },
    });
  }

  // 「？」マスの上にいたらクイズを始める
  checkQuizSpot() {
    // find は、条件に合う最初のものを配列から探す
    const spot = this.quizSpots.find(
      (s) => !s.done && s.col === this.playerCol && s.row === this.playerRow
    );
    if (!spot) return;

    spot.done = true;
    this.scene.pause(); // マップを一時停止（クイズ中に歩けないように）

    // クイズ画面をマップの上に重ねて表示する
    this.scene.launch('QuizScene', {
      onFinish: (isCorrect) => {
        if (isCorrect) this.correctCount++;
        // 調べ終わった「？」マスを消す
        spot.box.destroy();
        spot.mark.destroy();
        this.updateInfo();
        this.input.keyboard.resetKeys(); // クイズ中に押したキーをわすれさせる
        this.scene.resume(); // マップの一時停止をとく
      },
    });
  }
}
