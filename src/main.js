// =====================================================
// main.js … ゲーム本体（全部のファイルをつなげる司令塔）
// =====================================================
import './style.css';
import * as THREE from 'three';
import { World, START, tileToWorld } from './world.js';
import { createComposer } from './post.js';
import { makeQuestion, LEVELS } from './questions.js';
import { initAudio, sfx, playBgm, stopBgm, toggleMute, isMuted } from './audio.js';
import { fetchRanking, submitRanking, checkName, formatTime } from './ranking.js';

// ===== ゲームのルール（仕様で決めた数字） =====
const RULES = {
  maxHp: 100,
  weak: { tier: 'easy', hp: 1, time: 15, damage: 10 },
  normal: { tier: 'normal', hp: 1, time: 20, damage: 20 },
  boss: { tier: 'hard', hp: 3, time: 30, damage: 30 },
  chest: { tier: 'hard', time: 30, damage: 10 },
  totalEnemies: 9,
};

// ===== 画面の部品を取ってくる =====
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), hpText: $('hpText'), hpBar: $('hpBar'), timeText: $('timeText'), killText: $('killText'),
  levelBadge: $('levelBadge'),
  enemyInfo: $('enemyInfo'), enemyName: $('enemyName'), enemyHp: $('enemyHp'),
  battle: $('battle'), question: $('questionText'), timerBar: $('timerBar'), timerText: $('timerText'),
  choices: [...document.querySelectorAll('.choice')],
  message: $('message'), messageText: $('messageText'), messageNext: $('messageNext'),
  dpad: $('dpad'), slash: $('slash'), popups: $('popups'), fade: $('fade'),
  screens: { title: $('title'), how: $('how'), ranking: $('rankingScreen'), gameover: $('gameover'), clear: $('clear') },
};

// ===== 3Dの準備 =====
const isMobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('view').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
const world = new World(scene);
const fx = createComposer(renderer, scene, camera);

function onResize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 52 : 32; // たて長の画面（スマホ）は広く見えるようにする
  camera.updateProjectionMatrix();
  fx.composer.setPixelRatio(renderer.getPixelRatio());
  fx.setSize(w, h);
}
addEventListener('resize', onResize);
onResize();

// ===== ゲームの状態（ステート） =====
const state = {
  mode: 'title', // title / field / busy（演出中）/ battle / end
  level: 'elementary',
  hp: RULES.maxHp,
  kills: 0,
  startTime: 0,
  endTime: 0,
  col: START.col,
  row: START.row,
  dir: 'up',
  moving: false,
  walkFrame: 0,
};

// カメラの「いまの場所」と「行きたい場所」
const cam = {
  pos: new THREE.Vector3(0, 8, 20),
  look: new THREE.Vector3(),
  goalPos: new THREE.Vector3(),
  goalLook: new THREE.Vector3(),
  shake: 0,
};

// =====================================================
// 入力（キーボード・十字ボタン）
// =====================================================
const held = new Set(); // 押されている方向
let tapped = null; // さっと押してすぐはなした方向も、1歩ぶんは覚えておく
const KEY_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};
let keyHandler = null; // メッセージやバトル中にキーを受け取る係

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (KEY_DIR[e.key]) {
    held.add(KEY_DIR[e.key]);
    if (!e.repeat) tapped = KEY_DIR[e.key];
    e.preventDefault();
  }
  if (keyHandler) keyHandler(e);
});
addEventListener('keyup', (e) => {
  if (KEY_DIR[e.key]) held.delete(KEY_DIR[e.key]);
});
addEventListener('blur', () => held.clear());
function clearInput() {
  held.clear();
  tapped = null;
}

// 十字ボタン（おしっぱなしで歩きつづける）
for (const btn of ui.dpad.querySelectorAll('button')) {
  const dir = btn.dataset.dir;
  const on = (e) => {
    e.preventDefault();
    held.add(dir);
    tapped = dir;
    btn.classList.add('on');
  };
  const off = () => {
    held.delete(dir);
    btn.classList.remove('on');
  };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
}
let touchUsed = isMobile;
addEventListener('touchstart', () => (touchUsed = true), { once: true, passive: true });

function showDpad(show) {
  ui.dpad.classList.toggle('hidden', !(show && touchUsed));
}

// 音のボタン
const muteBtn = $('muteBtn');
muteBtn.classList.toggle('muted', isMuted());
muteBtn.addEventListener('click', () => {
  initAudio();
  muteBtn.classList.toggle('muted', toggleMute());
});

// =====================================================
// 便利な道具
// =====================================================
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function showScreen(name) {
  for (const [key, el] of Object.entries(ui.screens)) el.classList.toggle('hidden', key !== name);
}

async function fadeOut() {
  ui.fade.classList.add('on');
  await wait(380);
}
function fadeIn() {
  ui.fade.classList.remove('on');
}

// メッセージを1文字ずつ表示する。wait=true なら決定キーかタップでつぎへ
function say(text, { wait: needTap = true, auto = 0, top = false } = {}) {
  return new Promise((resolve) => {
    ui.message.classList.remove('hidden');
    ui.message.classList.toggle('top', top);
    ui.messageNext.classList.add('hidden');
    ui.messageText.textContent = '';
    const chars = [...text];
    let i = 0;
    let done = false;
    const typer = setInterval(() => {
      i++;
      ui.messageText.textContent = chars.slice(0, i).join('');
      if (i % 3 === 0) sfx.tick();
      if (i >= chars.length) finishTyping();
    }, 28);

    function finishTyping() {
      if (done) return;
      done = true;
      clearInterval(typer);
      ui.messageText.textContent = text;
      if (needTap) ui.messageNext.classList.remove('hidden');
      else setTimeout(close, auto || 700);
    }
    function close() {
      keyHandler = null;
      ui.message.removeEventListener('pointerdown', onTap);
      ui.message.classList.add('hidden');
      resolve();
    }
    function next() {
      if (!done) return finishTyping();
      if (needTap) {
        sfx.select();
        close();
      }
    }
    function onTap(e) {
      e.preventDefault();
      next();
    }
    ui.message.addEventListener('pointerdown', onTap);
    keyHandler = (e) => {
      if (['Enter', ' ', 'z', 'Z'].includes(e.key)) next();
    };
  });
}

// 3Dの位置 → 画面の位置（ダメージ数字を出すため）
function toScreen(v) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
}
function popup(text, pos3d, color) {
  const s = toScreen(pos3d);
  popupAt(text, s.x, s.y, color);
}
function popupAt(text, x, y, color) {
  const s = { x, y };
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  el.style.color = color;
  ui.popups.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// バトルの見た目に切りかえる（主人公をかくして、敵だけにピントを合わせる）
function setBattleView(on) {
  world.hero.visible = !on;
  fx.blur = on ? 2.4 : 1.0;
  fx.focusY = on ? 0.66 : 0.5;
  fx.apply(renderer.domElement.width, renderer.domElement.height);
}

function flash(color, strength, ms) {
  const c = new THREE.Color(color);
  const start = performance.now();
  const step = () => {
    const k = 1 - (performance.now() - start) / ms;
    fx.flash(c, Math.max(0, k) * strength);
    if (k > 0) requestAnimationFrame(step);
  };
  step();
}

// =====================================================
// HUD（HP・時間・たおした数）
// =====================================================
function updateHud() {
  ui.hpText.textContent = state.hp;
  const ratio = state.hp / RULES.maxHp;
  ui.hpBar.style.width = `${ratio * 100}%`;
  ui.hpBar.classList.toggle('warn', ratio <= 0.5 && ratio > 0.25);
  ui.hpBar.classList.toggle('danger', ratio <= 0.25);
  ui.killText.textContent = state.kills;
}

// =====================================================
// タイトル画面
// =====================================================
const levelBox = $('levelButtons');
for (const [key, info] of Object.entries(LEVELS)) {
  const b = document.createElement('button');
  b.className = 'btn level-btn';
  b.innerHTML = `<b>${info.label}</b><small>${info.sub}</small>`;
  b.addEventListener('click', () => {
    initAudio();
    sfx.confirm();
    startGame(key);
  });
  levelBox.appendChild(b);
}
$('howBtn').addEventListener('click', () => {
  initAudio();
  sfx.select();
  showScreen('how');
});
$('rankingBtn').addEventListener('click', () => {
  initAudio();
  sfx.select();
  openRanking('elementary');
});
document.querySelectorAll('.back-btn').forEach((b) =>
  b.addEventListener('click', () => {
    sfx.select();
    showScreen('title');
  })
);
document.querySelectorAll('.to-title').forEach((b) => b.addEventListener('click', () => goTitle()));
$('retryBtn').addEventListener('click', () => startGame(state.level));
$('againBtn').addEventListener('click', () => startGame(state.level));

async function goTitle() {
  sfx.select();
  await fadeOut();
  state.mode = 'title';
  document.body.classList.remove('playing');
  ui.hud.classList.add('hidden');
  showDpad(false);
  showScreen('title');
  stopBgm();
  world.reset();
  placeHero(START.col, START.row);
  fadeIn();
}

// ランキング画面
const rankTabs = $('rankTabs');
for (const [key, info] of Object.entries(LEVELS)) {
  const b = document.createElement('button');
  b.textContent = info.label;
  b.dataset.level = key;
  b.addEventListener('click', () => openRanking(key));
  rankTabs.appendChild(b);
}
async function openRanking(level) {
  showScreen('ranking');
  rankTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.level === level));
  const list = $('rankList');
  list.innerHTML = '<li class="empty">よみこみ中…</li>';
  const { list: rows, online } = await fetchRanking(level);
  renderRank(list, rows);
  $('rankNote').textContent = online ? '世界ランキング（上位10人）' : 'このブラウザの記録（公開後は世界ランキングになります）';
}
function renderRank(el, rows, highlight) {
  el.innerHTML = '';
  if (rows.length === 0) {
    el.innerHTML = '<li class="empty">まだ記録がありません</li>';
    return;
  }
  rows.forEach((r) => {
    const li = document.createElement('li');
    li.textContent = r.name; // textContent を使うと、名前にHTMLを入れられても安全
    const t = document.createElement('span');
    t.textContent = formatTime(r.time);
    li.appendChild(t);
    if (highlight && r.name === highlight.name && r.time === highlight.time) li.classList.add('me');
    el.appendChild(li);
  });
}

// =====================================================
// ゲーム開始
// =====================================================
function placeHero(col, row) {
  state.col = col;
  state.row = row;
  const p = tileToWorld(col, row);
  world.hero.position.set(p.x, world.groundY(col, row), p.z);
  setHeroFrame('up', 0);
}

function setHeroFrame(dir, frame) {
  state.dir = dir;
  const tex = world.heroTex[dir][frame];
  const s = world.hero.userData.sprite;
  s.material.map = tex;
  s.customDepthMaterial.map = tex;
}

async function startGame(level) {
  await fadeOut();
  state.level = level;
  state.hp = RULES.maxHp;
  state.kills = 0;
  state.moving = false;
  clearInput();
  world.reset();
  setBattleView(false);
  placeHero(START.col, START.row);
  ui.levelBadge.textContent = `【${LEVELS[level].label}】`;
  updateHud();
  showScreen(null);
  document.body.classList.add('playing');
  ui.hud.classList.remove('hidden');
  ui.enemyInfo.classList.add('hidden');
  ui.battle.classList.add('hidden');
  snapCamera();
  fadeIn();
  playBgm('field');
  state.mode = 'busy';
  state.startTime = performance.now();
  await say('ここは かずの森。\n森のおくの遺跡に 「むげんの魔王」が いるらしい…', { wait: true });
  await say(
    touchUsed
      ? '十字ボタンで 歩こう。\nモンスターに ぶつかると バトルが はじまるよ！'
      : '矢印キーで 歩こう。\nモンスターに ぶつかると バトルが はじまるよ！'
  );
  state.mode = 'field';
  showDpad(true);
}

// =====================================================
// フィールド（歩く）
// =====================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function tryMove() {
  if (state.mode !== 'field' || state.moving) return;
  const dir = tapped || ['up', 'down', 'left', 'right'].find((d) => held.has(d));
  tapped = null;
  if (!dir) return;
  const [dx, dy] = DIRS[dir];
  const nc = state.col + dx;
  const nr = state.row + dy;
  setHeroFrame(dir, state.walkFrame);

  // ぶつかったものを調べる
  const enemy = world.enemyAt(nc, nr);
  if (enemy) return startBattle(enemy);
  if (world.chestAt(nc, nr)) return openChest();
  const barrier = world.barrierAt(nc, nr);
  if (barrier) return bumpBarrier(barrier);
  if (!world.isWalkableTerrain(nc, nr)) {
    if (!state.bumped) sfx.bump();
    state.bumped = true;
    setTimeout(() => (state.bumped = false), 250);
    return;
  }

  // 1マス歩く
  state.moving = true;
  state.col = nc;
  state.row = nr;
  const from = world.hero.position.clone();
  const p = tileToWorld(nc, nr);
  const to = new THREE.Vector3(p.x, world.groundY(nc, nr), p.z);
  const start = performance.now();
  const dur = 170;
  state.walkFrame = 1 - state.walkFrame;
  setHeroFrame(dir, state.walkFrame);
  const step = () => {
    const k = Math.min(1, (performance.now() - start) / dur);
    world.hero.position.lerpVectors(from, to, k);
    world.hero.position.y += Math.sin(k * Math.PI) * 0.06; // ちょっとはねる
    if (k < 1) requestAnimationFrame(step);
    else state.moving = false;
  };
  step();
}

async function bumpBarrier(barrier) {
  state.mode = 'busy';
  showDpad(false);
  clearInput();
  sfx.bump();
  const kind = barrier.needKind;
  const left = world.enemies.filter((e) => e.kind === kind && e.alive).length;
  const who = kind === 'weak' ? '草原の モンスター' : '川むこうの モンスター';
  await say(`ふしぎな 結界が 道を ふさいでいる。\n${who}を あと ${left}体 たおそう！`);
  state.mode = 'field';
  showDpad(true);
}

// =====================================================
// バトル
// =====================================================
function setEnemyHp(enemy) {
  const max = RULES[enemy.kind].hp;
  ui.enemyHp.textContent = '♥'.repeat(enemy.hp) + '♡'.repeat(max - enemy.hp);
}

async function startBattle(enemy) {
  state.mode = 'busy';
  showDpad(false);
  clearInput();
  const rule = RULES[enemy.kind];
  enemy.hp = rule.hp;

  // 戦闘開始の演出
  sfx.encounter();
  flash('#ffffff', 0.9, 400);
  playBgm(enemy.kind === 'boss' ? 'boss' : 'battle');
  // 主人公を敵のほうへ向ける
  const ep = enemy.group.position;
  const hp = world.hero.position;
  const dx = ep.x - hp.x;
  const dz = ep.z - hp.z;
  setHeroFrame(Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up', 0);
  state.battleEnemy = enemy;
  setBattleView(true);

  ui.enemyName.textContent = enemy.name;
  setEnemyHp(enemy);
  ui.enemyInfo.classList.remove('hidden');
  await wait(500);
  await say(enemy.kind === 'boss' ? `${enemy.name}が すがたを あらわした！` : `${enemy.name}が あらわれた！`, { wait: false, auto: 800 });

  // 問題をくりかえす
  while (enemy.hp > 0) {
    const q = makeQuestion(state.level, rule.tier);
    const result = await askQuestion(q, rule.time);
    if (result.ok) {
      await heroAttack(enemy);
      enemy.hp--;
      setEnemyHp(enemy);
      if (enemy.hp > 0) await say(`${enemy.name}に ダメージ！ のこり ${enemy.hp}`, { wait: false, auto: 700 });
    } else {
      const alive = await enemyAttack(enemy, rule.damage, result, q);
      if (!alive) return gameOver();
    }
  }

  // たおした！
  await defeatEnemy(enemy);
  ui.enemyInfo.classList.add('hidden');
  state.kills++;
  updateHud();
  setBattleView(false);
  state.battleEnemy = null;

  if (enemy.kind === 'boss') {
    await say('むげんの魔王を たおした！\n遺跡の おくで 宝箱が 光っている…');
    sfx.barrier();
    world.chest.visible = true;
    world.chest.userData.light.intensity = 2.5;
    world.burst(world.chest.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xfff0a0, 60, 3);
  } else {
    await checkBarriers();
  }
  playBgm('field');
  state.mode = 'field';
  showDpad(true);
}

// 結界が消えるかチェック
async function checkBarriers() {
  for (const b of world.barriers) {
    if (b.open) continue;
    const left = world.enemies.filter((e) => e.kind === b.needKind && e.alive).length;
    if (left > 0) continue;
    b.open = true;
    sfx.barrier();
    world.burst(b.mesh.position.clone(), 0x80e0ff, 70, 3);
    const start = performance.now();
    await new Promise((resolve) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / 700);
        b.mesh.scale.y = 1 - k;
        b.light.intensity = 3 * (1 - k);
        if (k < 1) requestAnimationFrame(step);
        else {
          b.mesh.visible = false;
          resolve();
        }
      };
      step();
    });
    await say(b.needKind === 'weak' ? '橋の 結界が きえた！\n川の むこうへ すすもう。' : '遺跡の 門の 結界が きえた！\nこの先に 魔王が いる…');
  }
}

// 4択の問題を出して、答えを待つ
function askQuestion(q, limitSec) {
  state.currentQ = q;
  return new Promise((resolve) => {
    ui.battle.classList.remove('hidden');
    ui.question.textContent = q.text;
    let cursor = 0;
    let answered = false;
    ui.choices.forEach((b, i) => {
      b.textContent = q.choices[i];
      b.dataset.key = i + 1;
      b.className = 'choice';
      b.onclick = () => choose(i);
      b.onpointerenter = () => moveCursor(i);
    });
    moveCursor(0);

    function moveCursor(i) {
      if (answered) return;
      if (i !== cursor) sfx.select();
      cursor = i;
      ui.choices.forEach((b, k) => b.classList.toggle('cursor', k === i));
    }

    // 制限時間
    const start = performance.now();
    const limit = limitSec * 1000;
    let lastSec = limitSec;
    const tick = () => {
      if (answered) return;
      const left = Math.max(0, limit - (performance.now() - start));
      ui.timerBar.style.width = `${(left / limit) * 100}%`;
      ui.timerBar.classList.toggle('hurry', left < 5000);
      const sec = Math.ceil(left / 1000);
      ui.timerText.textContent = `のこり ${sec}秒`;
      if (sec !== lastSec && sec <= 5) sfx.tick();
      lastSec = sec;
      if (left <= 0) return finish(-1);
      requestAnimationFrame(tick);
    };
    tick();

    keyHandler = (e) => {
      if (['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') moveCursor(cursor ^ 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') moveCursor(cursor ^ 2);
      else if (e.key === 'Enter' || e.key === ' ') choose(cursor);
    };

    function choose(i) {
      if (answered) return;
      finish(i);
    }
    async function finish(i) {
      answered = true;
      keyHandler = null;
      const ok = i === q.correctIndex;
      ui.choices.forEach((b) => {
        b.onclick = null;
        b.onpointerenter = null;
        b.classList.remove('cursor');
      });
      ui.choices[q.correctIndex].classList.add('right');
      if (i >= 0 && !ok) ui.choices[i].classList.add('wrong');
      if (ok) sfx.correct();
      else sfx.wrong();
      await wait(ok ? 550 : 1100);
      ui.battle.classList.add('hidden');
      resolve({ ok, timeout: i < 0 });
    }
  });
}

// 主人公のこうげき
async function heroAttack(enemy) {
  ui.slash.classList.remove('go');
  void ui.slash.offsetWidth; // アニメーションをやり直すための小ワザ
  ui.slash.classList.add('go');
  sfx.slash();
  await wait(150);
  const s = enemy.group.userData.sprite;
  const head = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.h * 0.6 + (enemy.kind === 'normal' ? 0.35 : 0), 0));
  world.burst(head, 0xfff4c0, 24, 2);
  popup(enemy.kind === 'boss' ? 'HIT!' : 'HIT!', head, '#fff6a0');
  // ちかちか点めつ＆ゆれる
  const baseX = s.position.x;
  for (let i = 0; i < 6; i++) {
    s.visible = i % 2 === 1;
    s.position.x = baseX + (i % 2 ? 0.08 : -0.08);
    await wait(55);
  }
  s.visible = true;
  s.position.x = baseX;
}

// 敵のこうげき（まちがい・時間切れ）
async function enemyAttack(enemy, damage, result, q) {
  const s = enemy.group.userData.sprite;
  // 敵が飛びかかる
  const base = s.position.z;
  for (let i = 0; i <= 6; i++) {
    s.position.z = base + Math.sin((i / 6) * Math.PI) * 0.6;
    await wait(25);
  }
  sfx.hurt();
  flash('#ff2030', 0.45, 450);
  cam.shake = 0.35;
  document.getElementById('game').classList.remove('shake');
  void document.body.offsetWidth;
  document.getElementById('game').classList.add('shake');
  state.hp = Math.max(0, state.hp - damage);
  updateHud();
  popupAt(`-${damage}`, innerWidth / 2, innerHeight * 0.3, '#ff8080');
  const why = result.timeout ? '時間切れ！' : 'ざんねん！';
  await say(`${why} 正解は「${q.choices[q.correctIndex]}」。\nゆうしゃは ${damage} の ダメージを うけた！`, { wait: true });
  return state.hp > 0;
}

// 敵をたおす演出
async function defeatEnemy(enemy) {
  sfx.defeat();
  const s = enemy.group.userData.sprite;
  s.material.transparent = true;
  const center = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.h * 0.5, 0));
  world.burst(center, enemy.kind === 'boss' ? 0xff6080 : 0xffe080, enemy.kind === 'boss' ? 120 : 50, enemy.kind === 'boss' ? 4 : 2.6);
  const start = performance.now();
  const dur = enemy.kind === 'boss' ? 1400 : 600;
  await new Promise((resolve) => {
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / dur);
      s.material.opacity = 1 - k;
      s.scale.set(1 + k * 0.4, 1 - k * 0.6, 1);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    step();
  });
  enemy.alive = false;
  enemy.group.visible = false;
  await say(`${enemy.name}を たおした！`, { wait: false, auto: 800 });
}

// =====================================================
// 宝箱
// =====================================================
async function openChest() {
  state.mode = 'busy';
  showDpad(false);
  clearInput();
  setHeroFrame('up', 0);
  state.battleEnemy = { group: world.chest, h: 1.1, w: 1.1, kind: 'chest' };
  setBattleView(true);
  await say('宝箱には ふしぎな カギが かかっている。\n問題を とけば ひらきそうだ…');
  const rule = RULES.chest;
  for (;;) {
    const q = makeQuestion(state.level, rule.tier);
    const result = await askQuestion(q, rule.time);
    if (result.ok) break;
    sfx.hurt();
    flash('#ff2030', 0.4, 400);
    cam.shake = 0.3;
    state.hp = Math.max(0, state.hp - rule.damage);
    updateHud();
    popupAt(`-${rule.damage}`, innerWidth / 2, innerHeight * 0.3, '#ff8080');
    await say(`${result.timeout ? '時間切れ！' : 'ざんねん！'} 正解は「${q.choices[q.correctIndex]}」。\n宝箱の わなで ${rule.damage} の ダメージ！`);
    if (state.hp <= 0) return gameOver();
  }

  // ひらいた！
  state.endTime = performance.now();
  world.chestOpened = true;
  world.chest.userData.sprite.material.map = world.chestTex.open;
  sfx.chest();
  flash('#fff6d0', 0.8, 900);
  world.burst(world.chest.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xffe070, 140, 4.5);
  world.chest.userData.light.intensity = 5;
  playBgm('clear');
  await say('宝箱が ひらいた！\n中には 「むげんの方程式」が 入っていた！');
  showClear();
}

// =====================================================
// ゲームオーバー・クリア
// =====================================================
async function gameOver() {
  state.mode = 'end';
  stopBgm();
  ui.battle.classList.add('hidden');
  ui.enemyInfo.classList.add('hidden');
  setBattleView(false);
  state.battleEnemy = null;
  await wait(300);
  showScreen('gameover');
}

let lastRecord = null;
function showClear() {
  state.mode = 'end';
  setBattleView(false);
  state.battleEnemy = null;
  const time = state.endTime - state.startTime;
  $('clearTime').textContent = formatTime(time);
  $('clearSub').textContent = `${LEVELS[state.level].label}モード ・ のこりHP ${state.hp}`;
  $('nameError').textContent = '';
  $('nameForm').classList.remove('hidden');
  $('nameInput').value = '';
  $('clearRank').innerHTML = '';
  lastRecord = { level: state.level, time: Math.round(time) };
  showScreen('clear');
  fetchRanking(state.level).then(({ list }) => renderRank($('clearRank'), list));
}

$('nameForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lastRecord) return;
  const name = $('nameInput').value.trim();
  const err = checkName(name);
  if (err) {
    $('nameError').classList.add('bad');
    $('nameError').textContent = err;
    return;
  }
  sfx.confirm();
  $('nameError').textContent = '';
  $('nameForm').classList.add('hidden');
  const rec = { ...lastRecord, name };
  lastRecord = null;
  const { online } = await submitRanking(rec.level, rec.name, rec.time);
  const { list } = await fetchRanking(rec.level);
  renderRank($('clearRank'), list, rec);
  $('nameError').classList.remove('bad');
  $('nameError').textContent = online ? '世界ランキングに とうろくしたよ！' : 'このブラウザに 記録したよ！';
});

// =====================================================
// カメラ
// =====================================================
function fieldCameraGoal() {
  const h = world.hero.position;
  // たて長の画面（スマホ）は、少しはなれて広く見せる
  const portrait = camera.aspect < 1;
  cam.goalPos.set(h.x * (portrait ? 0.85 : 0.6), h.y + (portrait ? 7.6 : 6.8), h.z + (portrait ? 7.4 : 8.2));
  cam.goalLook.set(h.x * (portrait ? 0.9 : 0.75), h.y + 0.4, h.z - (portrait ? 1.6 : 0.8));
}
function snapCamera() {
  fieldCameraGoal();
  cam.pos.copy(cam.goalPos);
  cam.look.copy(cam.goalLook);
}

function updateCamera(t, dt) {
  const target = state.battleEnemy;
  if (state.mode === 'title') {
    // タイトル画面：森の上を ゆっくり ながめる
    const z = Math.sin(t * 0.07) * 9;
    cam.goalPos.set(Math.sin(t * 0.11) * 3, 7.5, z + 9);
    cam.goalLook.set(0, 0, z - 1);
  } else if (target) {
    // バトル：敵の前にカメラを動かす
    const e = target.group.position;
    const dir = new THREE.Vector3(0, 0, 1); // いつも敵の正面（南がわ）から見る
    const boss = target.kind === 'boss';
    const dist = boss ? 7.4 : 3.4;
    const k = camera.aspect < 1 ? 1.25 : 1;
    cam.goalPos.set(e.x + dir.x * dist * k, e.y + (boss ? 2.6 : 1.6 + target.h * 0.35), e.z + dir.z * dist * k + 0.8);
    cam.goalLook.set(e.x, e.y + (boss ? target.h * 0.42 - 0.2 : target.h * 0.35 - 0.45), e.z);
  } else {
    fieldCameraGoal();
  }
  const a = 1 - Math.exp(-dt * (target ? 5 : 4)); // なめらかに追いかける
  cam.pos.lerp(cam.goalPos, a);
  cam.look.lerp(cam.goalLook, a);
  camera.position.copy(cam.pos);
  if (cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * cam.shake;
    camera.position.y += (Math.random() - 0.5) * cam.shake;
    cam.shake = Math.max(0, cam.shake - dt * 1.2);
  }
  camera.lookAt(cam.look);
  world.followSun(cam.look.x, cam.look.z);
}

// =====================================================
// メインループ（1秒に約60回）
// =====================================================
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  tryMove();
  updateCamera(t, dt);
  world.update(t, dt, camera);
  if (['field', 'busy'].includes(state.mode) && state.startTime) {
    ui.timeText.textContent = formatTime(performance.now() - state.startTime);
  }
  fx.composer.render();
  requestAnimationFrame(loop);
}
showScreen('title');
loop();

// 開発中（npm run dev）だけ使えるテスト用の道具。公開版には入らない
if (import.meta.env.DEV) window.__debug = { state, world, placeHero };
