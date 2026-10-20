// =====================================================
// QuizScene.js … 4択クイズの画面
// マップの上に重ねて表示し、答え終わったらマップにもどる
// =====================================================
import * as Phaser from 'phaser';
import { makeQuestion } from '../questions.js';
import { FONT, makeButton } from '../ui.js';

export class QuizScene extends Phaser.Scene {
  constructor() {
    super('QuizScene');
  }

  // init は create の前に動き、ほかのシーンから渡されたデータを受け取る
  init(data) {
    this.onFinish = data.onFinish; // 答え終わったときに呼ぶ関数（コールバック）
  }

  create() {
    const { width, height } = this.scale;
    const level = this.registry.get('level');
    const q = makeQuestion(level); // 問題を1つ作る
    this.answered = false;         // もう答えたかどうか（2回押せないようにする）

    // うしろを少し暗くする
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

    // 問題文のまど
    this.add.rectangle(width / 2, 120, width - 60, 150, 0x000000, 0.9).setStrokeStyle(3, 0xffffff);
    this.add
      .text(width / 2, 120, q.text, { fontFamily: FONT, fontSize: '26px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5);

    // 4つの選択肢ボタン（2列 × 2行）
    this.buttons = q.choices.map((choice, i) => {
      const col = i % 2;               // 0なら左、1なら右
      const row = Math.floor(i / 2);   // 0なら上、1なら下
      const x = width / 2 + (col === 0 ? -140 : 140);
      const y = 270 + row * 80;
      return makeButton(this, x, y, 250, 60, choice, () => this.choose(i, q.correctIndex));
    });

    // 結果を出す文字（最初は空っぽ）
    this.resultText = this.add
      .text(width / 2, 430, '', { fontFamily: FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
  }

  // 選択肢が押されたときに動く
  choose(index, correctIndex) {
    if (this.answered) return;
    this.answered = true;

    const isCorrect = index === correctIndex;

    // 正解のボタンを緑にする。まちがえたら押したボタンを赤にする
    this.buttons[correctIndex].box.setFillStyle(0x2e7d32);
    if (!isCorrect) this.buttons[index].box.setFillStyle(0xc62828);

    this.resultText.setText(isCorrect ? '◯ せいかい！' : '✕ ざんねん…');
    this.resultText.setColor(isCorrect ? '#81c784' : '#ef9a9a');

    // 1.2秒まってからマップにもどる
    this.time.delayedCall(1200, () => {
      this.onFinish(isCorrect);
      this.scene.stop(); // このクイズ画面をとじる
    });
  }
}
