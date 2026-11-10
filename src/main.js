// =====================================================
// main.js … ゲーム本体（全部のファイルをつなげる司令塔）
// =====================================================
import './style.css';
import * as THREE from 'three';
import { World, START, COLS, ROWS, tileToWorld } from './world.js';
import { createComposer } from './post.js';
import { makeQuestion, LEVELS, SCHOOLS } from './questions.js';
import { initAudio, sfx, playBgm, stopBgm, toggleMute, isMuted } from './audio.js';
import { fetchRanking, submitRanking, checkName, formatTime } from './ranking.js';
import { makeResultImage, shareToX, saveImage, canShareImage, shareImage } from './share.js';

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
  message: $('message'), messageText: $('messageText'), messageNext: $('messageNext'), messageHead: $('messageHead'),
  dpad: $('dpad'), slash: $('slash'), popups: $('popups'), fade: $('fade'),
  screens: {
    title: $('title'), grade: $('grade'), how: $('how'), ranking: $('rankingScreen'), gameover: $('gameover'), clear: $('clear'),
  },
};

// ===== 3Dの準備 =====
const isMobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
// ※ 結果カード用の写真は、描いた直後に toDataURL で取るので preserveDrawingBuffer はいらない
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
  level: 'e1',
  path: [], // クリックで歩くときの道順
  missed: [], // まちがえた問題（ふりかえり用）
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
  // タイトルなどの画面が出ているときは、矢印キーでボタンをえらぶ
  if (!keyHandler && activeScreen()) {
    if (state.mode === 'busy') return; // 画面を切りかえている途中
    menuKey(e);
    return;
  }
  if (KEY_DIR[e.key]) {
    held.add(KEY_DIR[e.key]);
    if (!e.repeat) tapped = KEY_DIR[e.key];
    state.path = []; // キーで歩きはじめたら、クリックの道順はやめる
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
  state.path = [];
  marker.visible = false;
}

// ----- 画面（タイトルなど）をキーボードで操作する -----
function activeScreen() {
  return Object.values(ui.screens).find((el) => !el.classList.contains('hidden')) || null;
}
function focusables(screen) {
  return [...screen.querySelectorAll('button, input, summary')].filter((el) => el.offsetParent !== null && !el.disabled);
}
function menuKey(e) {
  const screen = activeScreen();
  const list = focusables(screen);
  if (list.length === 0) return;
  const i = list.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    list[(i + 1) % list.length].focus();
    sfx.select();
  } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault();
    list[(i - 1 + list.length) % list.length].focus();
    sfx.select();
  } else if (e.key === 'Escape') {
    const back = screen.querySelector('.back-btn, .to-title');
    if (back) back.click();
  } else if ((e.key === 'Enter' || e.key === ' ') && i < 0) {
    // まだ何もえらんでいなければ、その画面のいちばん大事なボタンをえらぶ
    e.preventDefault();
    const name = Object.keys(ui.screens).find((k) => ui.screens[k] === screen);
    (screenDefault[name] || list[0]).focus();
  }
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

const screenDefault = {}; // 画面ごとに「Enterでえらばれるボタン」
function showScreen(name, focusEl) {
  for (const [key, el] of Object.entries(ui.screens)) el.classList.toggle('hidden', key !== name);
  if (!name) return;
  screenDefault[name] = focusEl || null;
  // キーボードだけでも操作できるように、最初のボタンをえらんでおく
  requestAnimationFrame(() => {
    const target = focusEl || focusables(ui.screens[name])[0];
    target?.focus({ preventScroll: true });
  });
}

async function fadeOut() {
  ui.fade.classList.add('on');
  await wait(380);
}
function fadeIn() {
  ui.fade.classList.remove('on');
}

// メッセージを1文字ずつ表示する。wait=true なら決定キーかタップでつぎへ
function say(text, { wait: needTap = true, auto = 0, top = false, head = '' } = {}) {
  return new Promise((resolve) => {
    ui.message.classList.remove('hidden');
    ui.message.classList.toggle('top', top);
    ui.messageNext.classList.add('hidden');
    ui.messageText.textContent = '';
    ui.messageHead.textContent = head;
    ui.messageHead.classList.toggle('hidden', !head);
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
      removeEventListener('pointerdown', onTap);
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
      if (e.target.closest('#muteBtn')) return; // 音ボタンは別
      e.preventDefault();
      next();
    }
    // 画面のどこをクリック・タップしても、つぎへ進める
    setTimeout(() => addEventListener('pointerdown', onTap), 0);
    keyHandler = (e) => {
      if (e.repeat) return; // おしっぱなしで一気に読み飛ばさないように
      if (['Enter', ' ', 'z', 'Z'].includes(e.key)) {
        e.preventDefault();
        next();
      }
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
// 学年に合わせた制限時間・解説・ふりかえり
// =====================================================
function timeLimit(base) {
  return Math.round(base * (LEVELS[state.level].time || 1));
}

// まちがえたときの解説
async function explain(q) {
  if (!q.explain) return;
  await say(q.explain, { head: '📘 かいせつ' });
}

// まちがえた問題の一覧（タップ・Enter で解説がひらく）
function renderReview(el, cleared = false) {
  el.innerHTML = '';
  const h = document.createElement('h3');
  if (state.missed.length === 0) {
    // ほめるのはクリアしたときだけ
    h.textContent = cleared ? 'まちがえた問題は ありませんでした！ すごい！' : 'まちがえた問題は ありません';
    el.appendChild(h);
    return;
  }
  h.textContent = `📘 ふりかえり（まちがえた問題 ${state.missed.length}問）`;
  el.appendChild(h);
  for (const m of state.missed) {
    const d = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = m.text.replace(/\n/g, ' ');
    const ans = document.createElement('div');
    ans.innerHTML = '正解：<span class="ans"></span>　<span class="mine"></span>';
    ans.querySelector('.ans').textContent = m.answer;
    ans.querySelector('.mine').textContent = `（あなたの答え：${m.mine}）`;
    const exp = document.createElement('div');
    exp.className = 'exp';
    exp.textContent = m.explain;
    d.append(sum, ans, exp);
    el.appendChild(d);
  }
}

// =====================================================
// クリック・タップで歩く
// =====================================================
// 行き先の目印（地面の光る輪）
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.28, 0.4, 24),
  new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.8, depthWrite: false })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// 画面の位置 → マス目
function screenToTile(x, y) {
  const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(ground, hit)) return null;
  return { col: Math.round(hit.x + COLS / 2 - 0.5), row: Math.round(hit.z + ROWS / 2 - 0.5) };
}

// そのマスに「歩いて入れる」か
function canStand(col, row) {
  return world.isWalkableTerrain(col, row) && !world.enemyAt(col, row) && !world.barrierAt(col, row) && !world.chestAt(col, row);
}
// 敵・宝箱・結界のように「ぶつかると何かが起きる」マスか
function isTarget(col, row) {
  return !!(world.enemyAt(col, row) || world.chestAt(col, row) || world.barrierAt(col, row));
}

// 幅優先探索（はばゆうせんたんさく：近いマスから順に調べて、いちばん短い道を見つける方法）
function findPath(from, to) {
  const key = (c, r) => r * COLS + c;
  const prev = new Map([[key(from.col, from.row), null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const c = cur.col + dx;
      const r = cur.row + dy;
      const k = key(c, r);
      if (prev.has(k)) continue;
      const reached = c === to.col && r === to.row;
      if (!reached && !canStand(c, r)) continue;
      prev.set(k, { from: cur, dir });
      if (reached) {
        // ゴールから逆にたどって、道順（方向のならび）を作る
        const path = [];
        let k2 = k;
        while (prev.get(k2)) {
          const p = prev.get(k2);
          path.unshift(p.dir);
          k2 = key(p.from.col, p.from.row);
        }
        return path;
      }
      queue.push({ col: c, row: r });
    }
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'field') return;
  const t = screenToTile(e.clientX, e.clientY);
  if (!t) return;
  if (!canStand(t.col, t.row) && !isTarget(t.col, t.row)) {
    sfx.bump();
    return;
  }
  const path = findPath({ col: state.col, row: state.row }, t);
  if (!path || path.length === 0) return;
  state.path = path;
  const p = tileToWorld(t.col, t.row);
  marker.position.set(p.x, world.groundY(t.col, t.row) + 0.04, p.z);
  marker.visible = !isTarget(t.col, t.row);
  sfx.select();
});

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
const SCHOOL_SUB = { elementary: '小学1年〜6年', middle: '中学1年〜3年', high: '数学Ⅰ・A／Ⅱ・B', adult: '小〜高 ぜんぶから出題' };
for (const school of SCHOOLS) {
  const b = document.createElement('button');
  b.className = 'btn level-btn';
  b.innerHTML = `<b>${school.label}</b><small>${SCHOOL_SUB[school.key]}</small>`;
  b.addEventListener('click', () => {
    initAudio();
    sfx.confirm();
    if (school.grades.length === 1) startGame(school.grades[0].key);
    else openGrades(school);
  });
  levelBox.appendChild(b);
}

// 学年をえらぶ画面
function openGrades(school) {
  $('gradeTitle').textContent = `${school.label}：学年を えらんでね`;
  const box = $('gradeButtons');
  box.innerHTML = '';
  for (const g of school.grades) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = `<b>${g.label}</b><small>${g.sub}</small>`;
    b.addEventListener('click', () => {
      sfx.confirm();
      startGame(g.key);
    });
    box.appendChild(b);
  }
  showScreen('grade');
}

// 「小学3年」→「小3」のような短い名前
const shortLabel = (key) => LEVELS[key].label.replace(/^(小|中|高)(学|校)(\d)年$/, '$1$3');
$('howBtn').addEventListener('click', () => {
  initAudio();
  sfx.select();
  showScreen('how');
});
$('rankingBtn').addEventListener('click', () => {
  initAudio();
  sfx.select();
  openRanking(state.level);
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
  if (state.mode !== 'end') return;
  state.mode = 'busy';
  document.activeElement?.blur();
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
for (const key of Object.keys(LEVELS)) {
  const b = document.createElement('button');
  b.textContent = shortLabel(key);
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
  // ボタンの連打で2回スタートしないようにする
  if (!['title', 'end'].includes(state.mode)) return;
  state.mode = 'busy';
  document.activeElement?.blur();
  await fadeOut();
  state.level = level;
  state.hp = RULES.maxHp;
  state.kills = 0;
  state.moving = false;
  state.missed = [];
  state.asking = false;
  state.pauseQuestion = null;
  state.abortQuestion = null;
  clearInput();
  world.reset();
  setBattleView(false);
  placeHero(START.col, START.row);
  ui.levelBadge.textContent = `【${shortLabel(level)}】`;
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
      ? '十字ボタンか、地面を タップして 歩こう。\nモンスターに ぶつかると バトルが はじまるよ！'
      : '矢印キーか、地面を クリックして 歩こう。\nモンスターに ぶつかると バトルが はじまるよ！'
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
  let dir = tapped || ['up', 'down', 'left', 'right'].find((d) => held.has(d));
  tapped = null;
  if (!dir && state.path.length > 0) dir = state.path.shift(); // クリックした場所へ向かう
  if (state.path.length === 0) marker.visible = false;
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
    const result = await askQuestion(q, timeLimit(rule.time));
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
    let cursor = -1; // -1 ＝ まだ何もえらんでいない（Enterだけでは答えにならない）
    let answered = false;
    const shownAt = performance.now();
    ui.choices.forEach((b, i) => {
      b.textContent = q.choices[i];
      b.dataset.key = i + 1;
      b.className = 'choice';
      b.onclick = () => choose(i);
      b.onpointerenter = (e) => e.pointerType === 'mouse' && moveCursor(i);
    });
    ui.choices.forEach((b) => b.classList.remove('cursor'));

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
    let pausedMs = 0; // リタイアの確認中など、止めていた時間
    let pausedAt = null;
    state.asking = true;
    // リタイアの確認中は時間を止める
    state.pauseQuestion = (on) => {
      if (on && pausedAt === null) pausedAt = performance.now();
      if (!on && pausedAt !== null) {
        pausedMs += performance.now() - pausedAt;
        pausedAt = null;
      }
    };
    // リタイアしたときに、問題をとちゅうでやめる
    state.abortQuestion = () => {
      answered = true;
      state.asking = false;
      ui.battle.classList.add('hidden');
    };
    const tick = () => {
      if (answered) return;
      if (pausedAt !== null) return requestAnimationFrame(tick);
      const left = Math.max(0, limit - (performance.now() - start - pausedMs));
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
      // 問題が出た直後のキー（メッセージ送りのEnterなど）と、おしっぱなしは無視する
      if (e.repeat || performance.now() - shownAt < 350) return;
      if (['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') moveCursor(cursor < 0 ? 0 : cursor ^ 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') moveCursor(cursor < 0 ? 0 : cursor ^ 2);
      else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) choose(cursor);
    };

    function choose(i) {
      if (answered) return;
      finish(i);
    }
    async function finish(i) {
      answered = true;
      state.asking = false;
      keyHandler = null;
      const ok = i === q.correctIndex;
      if (!ok) state.missed.push({ ...q, mine: i >= 0 ? q.choices[i] : '時間切れ' });
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
  await say(`${why} 正解は「${q.answer}」。\nゆうしゃは ${damage} の ダメージを うけた！`, { wait: true });
  await explain(q);
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
    const result = await askQuestion(q, timeLimit(rule.time));
    if (result.ok) break;
    sfx.hurt();
    flash('#ff2030', 0.4, 400);
    cam.shake = 0.3;
    state.hp = Math.max(0, state.hp - rule.damage);
    updateHud();
    popupAt(`-${rule.damage}`, innerWidth / 2, innerHeight * 0.3, '#ff8080');
    await say(`${result.timeout ? '時間切れ！' : 'ざんねん！'} 正解は「${q.answer}」。\n宝箱の わなで ${rule.damage} の ダメージ！`);
    await explain(q);
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
  await wait(500);
  makeResult(true); // 宝箱がひらいた瞬間を写真にする
  await say('宝箱が ひらいた！\n中には 「むげんの方程式」が 入っていた！');
  showClear();
}

// =====================================================
// 結果のシェア（X・画像保存）
// =====================================================
let result = null; // さいごの結果 { cleared, gradeLabel, time, hp, missed, kills, scene }

// 今の3Dの画面を写真にする
function captureScene() {
  // 写真をとる一瞬だけ、フラッシュとぼかしを弱くして、くっきり写す
  const blur = fx.blur;
  fx.blur = 0.7;
  fx.apply(renderer.domElement.width, renderer.domElement.height);
  fx.flash(new THREE.Color('#ffffff'), 0);
  fx.composer.render();
  let url = null;
  try {
    url = renderer.domElement.toDataURL('image/jpeg', 0.9);
  } catch {
    url = null;
  }
  fx.blur = blur;
  fx.apply(renderer.domElement.width, renderer.domElement.height);
  return url;
}

function makeResult(cleared) {
  const end = cleared ? state.endTime : performance.now();
  result = {
    cleared,
    gradeLabel: LEVELS[state.level].label,
    time: formatTime(end - state.startTime),
    hp: state.hp,
    missed: state.missed.length,
    kills: state.kills,
    url: location.origin + '/',
    scene: captureScene(),
  };
  // 結果カードの画像を先に作っておく（ボタンを押したらすぐシェアできるように）
  result.imagePromise = makeResultImage(result.scene, result);
}

function shareText(r) {
  return r.cleared
    ? `数学RPG【${r.gradeLabel}】をクリア！\nクリアタイム ${r.time}／まちがい ${r.missed}問${r.missed === 0 ? '（ノーミス！）' : ''}\nきみは魔王をたおせるかな？`
    : r.retired
      ? `数学RPG【${r.gradeLabel}】に ちょうせん！ ${r.kills}体のモンスターをたおした！\nつぎこそ 魔王をたおすぞ…！`
      : `数学RPG【${r.gradeLabel}】で ${r.kills}体のモンスターをたおした！\nつぎこそ 魔王をたおすぞ…！`;
}

function resultImage() {
  if (!result.imagePromise) result.imagePromise = makeResultImage(result.scene, result);
  return result.imagePromise;
}
const fileName = () => `mathrpg-${result.cleared ? 'clear' : 'result'}-${Date.now()}.png`;

// 「𝕏 でシェア」
//  ・スマホなど画像を共有できる端末 → 共有メニューで X をえらぶと、画像つきで投稿できる
//  ・できないパソコン → 画像を保存してから X の投稿画面をひらく（画像は自分で追加）
const imageShareOk = canShareImage();
document.querySelectorAll('.share-x').forEach((b) =>
  b.addEventListener('click', async () => {
    if (!result) return;
    sfx.confirm();
    const note = b.closest('.panel').querySelector('.share-note');
    const blob = await resultImage();
    if (imageShareOk) {
      const r = await shareImage(blob, fileName(), `${shareText(result)}\n${result.url}\n#数学RPG`);
      if (r !== 'error') return; // 送れた・やめた ときはここでおしまい
    }
    saveImage(blob, fileName());
    shareToX(shareText(result), result.url);
    note.textContent = '結果の画像を 保存したよ。Xの画面で 画像を追加してね！';
  })
);
document.querySelectorAll('.share-save').forEach((b) =>
  b.addEventListener('click', async () => {
    if (!result) return;
    sfx.confirm();
    const note = b.closest('.panel').querySelector('.share-note');
    note.textContent = '画像を つくっています…';
    const blob = await resultImage();
    saveImage(blob, fileName());
    note.textContent = '画像を 保存したよ！（ダウンロードフォルダを 見てね）';
  })
);
function resetShareNotes() {
  document.querySelectorAll('.share-note').forEach((n) => (n.textContent = ''));
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
  makeResult(false);
  resetShareNotes();
  setGameoverText(false);
  renderReview($('reviewGameover'));
  showScreen('gameover', $('retryBtn'));
}

// =====================================================
// リタイア
// =====================================================
const retireBtn = $('retireBtn');
const retireDialog = $('retireDialog');
const GAMEOVER_HTML = { title: $('gameoverTitle').innerHTML, text: $('gameoverText').innerHTML };

function setGameoverText(retired) {
  $('gameoverTitle').innerHTML = retired ? 'リタイアしました' : GAMEOVER_HTML.title;
  $('gameoverText').innerHTML = retired ? 'おつかれさま！ また ちょうせんしてね。' : GAMEOVER_HTML.text;
}

// リタイアできるのは「フィールドを歩いているとき」と「問題に答えているとき」だけ
function canRetire() {
  return retireDialog.classList.contains('hidden') && (state.mode === 'field' || state.asking);
}

function openRetire() {
  if (!canRetire()) return;
  sfx.select();
  const prevMode = state.mode;
  const prevKey = keyHandler;
  if (prevMode === 'field') state.mode = 'busy'; // 確認中は歩けないようにする
  clearInput();
  state.pauseQuestion?.(true);
  retireDialog.classList.remove('hidden');
  $('retireNo').focus();

  const close = (yes) => {
    retireDialog.classList.add('hidden');
    $('retireYes').onclick = $('retireNo').onclick = null;
    if (yes) return retire();
    sfx.select();
    state.mode = prevMode;
    keyHandler = prevKey;
    state.pauseQuestion?.(false);
    document.activeElement?.blur();
  };
  $('retireYes').onclick = () => close(true);
  $('retireNo').onclick = () => close(false);
  keyHandler = (e) => {
    if (e.key === 'Escape') {
      e.stopImmediatePropagation(); // このあとの「Escでリタイア」がまた動かないように
      close(false);
    }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      (document.activeElement === $('retireYes') ? $('retireNo') : $('retireYes')).focus();
      sfx.select();
    }
    // Enter は、えらんでいるボタンがそのまま押される
  };
}

function retire() {
  state.abortQuestion?.();
  state.asking = false;
  keyHandler = null;
  state.mode = 'end';
  clearInput();
  showDpad(false);
  stopBgm();
  ui.message.classList.add('hidden');
  ui.enemyInfo.classList.add('hidden');
  setBattleView(false);
  state.battleEnemy = null;
  makeResult(false);
  result.retired = true;
  result.imagePromise = makeResultImage(result.scene, result);
  resetShareNotes();
  setGameoverText(true);
  renderReview($('reviewGameover'));
  showScreen('gameover', $('retryBtn'));
}

retireBtn.addEventListener('click', openRetire);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !e.repeat && canRetire() && !activeScreen()) openRetire();
});

let lastRecord = null;
function showClear() {
  state.mode = 'end';
  setBattleView(false);
  state.battleEnemy = null;
  const time = state.endTime - state.startTime;
  resetShareNotes();
  $('clearTime').textContent = formatTime(time);
  $('clearSub').textContent = `${LEVELS[state.level].label} ・ のこりHP ${state.hp} ・ まちがい ${state.missed.length}問`;
  renderReview($('reviewClear'), true);
  $('nameError').textContent = '';
  $('nameForm').classList.remove('hidden');
  $('nameInput').value = '';
  $('clearRank').innerHTML = '';
  lastRecord = { level: state.level, time: Math.round(time) };
  showScreen('clear', $('nameInput'));
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
  $('againBtn').focus();
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
  renderer.domElement.classList.toggle('walkable', state.mode === 'field');
  retireBtn.classList.toggle('hidden', !document.body.classList.contains('playing') || state.mode === 'end');
  retireBtn.disabled = !canRetire();
  marker.material.opacity = 0.55 + Math.sin(t * 6) * 0.25;
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
if (import.meta.env.DEV) window.__debug = { state, world, placeHero, camera, tileToWorld };
