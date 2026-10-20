// =====================================================
// TitleScene.js … タイトル画面（難易度をえらぶ）
// =====================================================
import * as Phaser from 'phaser';
import { LEVELS } from '../questions.js';
import { FONT, makeButton } from '../ui.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width } = this.scale; // ゲーム画面の横はば

    // タイトルの文字
    this.add
      .text(width / 2, 90, '数学RPG', { fontFamily: FONT, fontSize: '56px', color: '#ffd54f', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 150, 'むずかしさを えらんでね', { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    // 難易度のボタンを4つならべる
    // Object.entries は {a: 1, b: 2} を [['a', 1], ['b', 2]] の形にしてくれる
    Object.entries(LEVELS).forEach(([key, info], i) => {
      makeButton(this, width / 2, 220 + i * 62, 260, 48, info.label, () => {
        // registry（レジストリ）＝ どのシーンからでも見られる共通のメモ帳
        this.registry.set('level', key);
        this.scene.start('MapScene'); // マップ画面へ切りかえ
      });
    });
  }
}
