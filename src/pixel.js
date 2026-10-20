// =====================================================
// pixel.js … ドット絵を「文字の地図」から自作するファイル
// =====================================================
// 1文字が1ドット（画面の点）です。'.' はとうめい。
// ほかの文字は、下の PALETTE（パレット：色見本）で色が決まります。
// ネットの素材を使わず、全部ここで描いているので著作権の心配がありません。
import * as THREE from 'three';

// ----- 色見本 -----
const BASE = {
  k: '#1b1730', // ふちどり
  w: '#ffffff',
  e: '#1b1730', // 目
};

// 主人公（オリジナルの勇者）
const HERO = {
  ...BASE,
  h: '#7a4426', H: '#a8653a', // かみの毛
  s: '#f5cfa0', S: '#d99c6c', // はだ
  r: '#d8383a', // マフラー
  b: '#2f6fd6', B: '#1d468e', // 服
  y: '#f0c43c', // ベルト
  p: '#5a3d2b', g: '#3a2418', // ズボン・くつ
};

export const HERO_FRAMES = {
  down: [
    [
      '......kkkk......',
      '....kkhhhhkk....',
      '...khHHhhhhhk...',
      '...khhhhhhhhk...',
      '..khhssssssshk..',
      '..khsesssseshk..',
      '...ksssssssSk...',
      '....kSssssSk....',
      '...krrrrrrrrk...',
      '..kbbbrrrrbbbk..',
      '..ksbbbbbbbbsk..',
      '..ksBbbbbbbBsk..',
      '...kyyyyyyyyk...',
      '...kbbbkkbbbk...',
      '...kppk..kppk...',
      '...kggk..kggk...',
    ],
    [
      '................',
      '......kkkk......',
      '....kkhhhhkk....',
      '...khHHhhhhhk...',
      '...khhhhhhhhk...',
      '..khhssssssshk..',
      '..khsesssseshk..',
      '...ksssssssSk...',
      '....kSssssSk....',
      '...krrrrrrrrk...',
      '..kbbbrrrrbbbk..',
      '..ksbbbbbbbbsk..',
      '..ksBbbbbbbBsk..',
      '...kyyyyyyyyk...',
      '..kppk...kppk...',
      '..kggk....kggk..',
    ],
  ],
  up: [
    [
      '......kkkk......',
      '....kkhhhhkk....',
      '...khhhhhhhhk...',
      '...khhhhhhHhk...',
      '..khhhhhhhhhhk..',
      '..khhhhhhhhhhk..',
      '...khhhhhhhhk...',
      '....kSssssSk....',
      '...krrrrrrrrk...',
      '..kbbbbrrbbbbk..',
      '..ksbbbbbbbbsk..',
      '..ksBbbbbbbBsk..',
      '...kyyyyyyyyk...',
      '...kbbbkkbbbk...',
      '...kppk..kppk...',
      '...kggk..kggk...',
    ],
    [
      '................',
      '......kkkk......',
      '....kkhhhhkk....',
      '...khhhhhhhhk...',
      '...khhhhhhHhk...',
      '..khhhhhhhhhhk..',
      '..khhhhhhhhhhk..',
      '...khhhhhhhhk...',
      '....kSssssSk....',
      '...krrrrrrrrk...',
      '..kbbbbrrbbbbk..',
      '..ksbbbbbbbbsk..',
      '..ksBbbbbbbBsk..',
      '...kyyyyyyyyk...',
      '...kppk...kppk..',
      '..kggk....kggk..',
    ],
  ],
  right: [
    [
      '.....kkkkk......',
      '...kkhhhhhk.....',
      '..khHHhhhhhk....',
      '..khhhhhhhhhk...',
      '..khhhhssssk....',
      '..khhhsssesk....',
      '...khhsssssk....',
      '....kSsssSk.....',
      '....krrrrrrk....',
      '..rrkbbbbbbk....',
      '....kbbbsbbk....',
      '....kBbbsbBk....',
      '....kyyyyyyk....',
      '....kbbbbbbk....',
      '....kppkppk.....',
      '....kggkggk.....',
    ],
    [
      '................',
      '.....kkkkk......',
      '...kkhhhhhk.....',
      '..khHHhhhhhk....',
      '..khhhhhhhhhk...',
      '..khhhhssssk....',
      '..khhhsssesk....',
      '...khhsssssk....',
      '....kSsssSk.....',
      '....krrrrrrk....',
      '.rrrkbbbbbbk....',
      '....kbbbsbbk....',
      '....kyyyyyyk....',
      '....kbbbbbbk....',
      '...kppk..kppk...',
      '...kggk..kggk...',
    ],
  ],
};

// 弱い敵「カズダマ」（ひとつ目のまるいモンスター）
export const PUCHI = [
  '................',
  '.......kk.......',
  '......kyok......',
  '.....kkookk.....',
  '...kkooooookk...',
  '..kyyoooooooOk..',
  '..kyoowwwwooOk..',
  '.kyoowwweewooOk.',
  '.kooowweeewoOOk.',
  '.koooowwwwooOOk.',
  '.kooooooooooOOk.',
  '.kooommmmmooOOk.',
  '..kooommmoooOk..',
  '..kOooooooooOk..',
  '...kkOOOOOOkk...',
  '.....kkkkkk.....',
];

// ふつうの敵「シグマバット」（こうもり型）
export const BAT = [
  '................',
  '................',
  'k..............k',
  'kk....k..k....kk',
  'kPk..kpkkpk..kPk',
  'kPPk.kppppk.kPPk',
  'kPPPkprpprpkPPPk',
  'kPPPPplpplpPPPPk',
  'kPPPPppwwppPPPPk',
  '.kPPPpppppppPPk.',
  '..kPkpppppppkPk.',
  '...k.kpppppk.k..',
  '......kpppk.....',
  '.......kpk......',
  '........k.......',
  '................',
];

// ボス「むげんの魔王インフィニタス」（胸に∞のもよう）
export const BOSS = [
  '....hk..............kh....',
  '....hHk............kHh....',
  '.....hHk..........kHh.....',
  '.....khHkkkkkkkkkkHhk.....',
  '......kkaAAAAAAAAakk......',
  '.....kaAAAAAAAAAAAAak.....',
  '.....kaArrrAaaArrrAak.....',
  '.....kaAAAAAkkAAAAAak.....',
  '......kaAAAAAAAAAAak......',
  '....kCCkkaggggggakkCCk....',
  '...kCcckLAAgAAgAAAAkccCk..',
  '...kCcckLAgAggAgAAAkccCk..',
  '...kCcckLAAgAAgAAAAkccCk..',
  '..kCcccLkAAAAggAAAAkLcccCk',
  '..kCcccLkaAAAAAAAAakLcccCk',
  '..kCcccckLkaaaaaakLkccccCk',
  '..kCccccckggggggggkcccccCk',
  '..kCcccccLkaAAAAakLccccCk.',
  '..kCccccLkaAAkkAAakLcccCk.',
  '.kCcccccLkaAk..kAakLccccCk',
  '.kCccccckaAAk..kAAakcccccCk',
  '.kCCcccckLLk....kLLkccccCCk',
  'kCCCCcckggk......kggkcCCCCk',
  'kkkkkkkkkk........kkkkkkkk',
];

// 宝箱（とじている・ひらいている）
export const CHEST_CLOSED = [
  '................',
  '................',
  '................',
  '..kkkkkkkkkkkk..',
  '.kwwwwgwwgwwwwk.',
  '.kwWWWgWWgWWWwk.',
  '.kwwwwgwwgwwwwk.',
  '.kggggglggggggk.',
  '.kGGGGGlkGGGGGk.',
  '.kwwwwgwwgwwwwk.',
  '.kwWWWgWWgWWWwk.',
  '.kwwwwgwwgwwwwk.',
  '.kWWWWGWWGWWWWk.',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
];
export const CHEST_OPEN = [
  '................',
  '..kkkkkkkkkkkk..',
  '.kwwwwgwwgwwwwk.',
  '.kWWWWGWWGWWWWk.',
  '.kkkkkkkkkkkkkk.',
  '.klllllllllllk..',
  '.kyyyyllyyyyyk..',
  '.kggggggggggggk.',
  '.kGGGGGGGGGGGGk.',
  '.kwwwwgwwgwwwwk.',
  '.kwWWWgWWgWWWwk.',
  '.kwwwwgwwgwwwwk.',
  '.kWWWWGWWGWWWWk.',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
];
export const CHEST_PALETTE = {
  ...BASE,
  w: '#b8702e', W: '#7a4318',
  g: '#f2c440', G: '#b5862a',
  l: '#fff4b0', y: '#ffd84a',
};

// 敵の色ちがい（パレットスワップ：色だけ入れかえて別の敵にする方法）
export const PUCHI_COLORS = [
  { name: 'カズダマ', o: '#f08a24', O: '#b85a10', y: '#ffd27a' },
  { name: 'ミドリダマ', o: '#4cc25a', O: '#2a7f36', y: '#b8f0a0' },
  { name: 'アオダマ', o: '#3d8ef0', O: '#1f55a8', y: '#a8d4ff' },
  { name: 'モモダマ', o: '#f06aa8', O: '#a8326c', y: '#ffc4e0' },
  { name: 'キンダマ', o: '#f0c834', O: '#a8861a', y: '#fff3a8' },
].map((c) => ({ name: c.name, palette: { ...BASE, ...c, m: '#7a1f2c' } }));

export const BAT_COLORS = [
  { name: 'シグマバット', p: '#8a5ad0', P: '#4b2a80', l: '#c9a8f5' },
  { name: 'デルタバット', p: '#2fb5a8', P: '#17665e', l: '#9df0e6' },
  { name: 'パイバット', p: '#d04a5a', P: '#7a1f2c', l: '#f5a8b0' },
].map((c) => ({ name: c.name, palette: { ...BASE, ...c, r: '#ffe14a' } }));

export const BOSS_PALETTE = {
  ...BASE,
  h: '#efe6cc', H: '#a89e86',
  a: '#2c2348', A: '#4f4290', L: '#8f7fe0',
  c: '#a51f3c', C: '#5e0f22',
  g: '#f0c03a', r: '#ff4a4a',
};

// =====================================================
// 文字の地図 → 画像（キャンバス）にする
// =====================================================
export function drawPixels(rows, palette, { flip = false, scale = 1 } = {}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      const color = palette[ch];
      if (!color || ch === '.') continue;
      ctx.fillStyle = color;
      const dx = flip ? w - 1 - x : x;
      ctx.fillRect(dx * scale, y * scale, scale, scale);
    }
  });
  return canvas;
}

// キャンバスを Three.js で使える「テクスチャ（ものに貼る絵）」にする
export function toTexture(canvas, repeat = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // 拡大してもぼやけない＝ドット絵がくっきり
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function spriteTexture(rows, palette, opts) {
  return toTexture(drawPixels(rows, palette, opts));
}

export function heroTextures() {
  const t = {};
  for (const dir of ['down', 'up', 'right']) {
    t[dir] = HERO_FRAMES[dir].map((f) => spriteTexture(f, HERO));
  }
  t.left = HERO_FRAMES.right.map((f) => spriteTexture(f, HERO, { flip: true }));
  return t;
}

// =====================================================
// 地面などの「タイル模様」をランダムに描く
// =====================================================
// 同じ結果になる乱数（シード付き乱数）… 毎回同じ模様にするため
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noiseTile(size, colors, seed, extra) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = seeded(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = colors[Math.floor(r() * colors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (extra) extra(ctx, r, size);
  return c;
}

export function makeTileTextures() {
  const T = {};
  // 草
  T.grass = toTexture(
    noiseTile(16, ['#5fae4a', '#58a544', '#67b852', '#4f9a3e', '#5fae4a', '#5fae4a'], 11, (ctx, r) => {
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(r() * 15);
        const y = Math.floor(r() * 14);
        ctx.fillStyle = '#86cf63';
        ctx.fillRect(x, y, 1, 2);
      }
    })
  );
  // 花の多い草
  T.flower = toTexture(
    noiseTile(16, ['#5fae4a', '#58a544', '#67b852', '#4f9a3e'], 12, (ctx, r) => {
      const cols = ['#ffe36b', '#ff8fb8', '#ffffff', '#9ec8ff'];
      for (let i = 0; i < 7; i++) {
        const x = 1 + Math.floor(r() * 13);
        const y = 1 + Math.floor(r() * 13);
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = '#ffd34a';
        ctx.fillRect(x, y, 1, 1);
      }
    })
  );
  // 土の道（石だたみ）
  T.path = toTexture(
    noiseTile(16, ['#c9a46a', '#bf9a5f', '#d4b078', '#b8925a'], 21, (ctx) => {
      ctx.fillStyle = '#9c7a48';
      for (let i = 0; i < 16; i += 8) {
        ctx.fillRect(0, i, 16, 1);
        ctx.fillRect(i === 0 ? 4 : 12, i, 1, 8);
      }
    })
  );
  // 石のかべ
  T.stone = toTexture(
    noiseTile(16, ['#8a8aa0', '#7d7d94', '#9696ac', '#73738a'], 31, (ctx) => {
      ctx.fillStyle = '#4e4e66';
      for (let y = 0; y < 16; y += 4) {
        ctx.fillRect(0, y, 16, 1);
        const off = (y / 4) % 2 === 0 ? 0 : 4;
        for (let x = off; x < 16; x += 8) ctx.fillRect(x, y, 1, 4);
      }
    }),
    true
  );
  // 土のよこ（がけ）
  T.dirt = toTexture(
    noiseTile(16, ['#7a5434', '#6e4a2c', '#86603c', '#5f3f24'], 41, (ctx) => {
      ctx.fillStyle = '#5fae4a';
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = '#4f9a3e';
      for (let x = 0; x < 16; x += 2) ctx.fillRect(x, 3, 1, 1);
    })
  );
  // 水
  T.water = toTexture(
    noiseTile(16, ['#3a86d4', '#3f8fdc', '#357cc8', '#3a86d4'], 51, (ctx, r) => {
      ctx.fillStyle = '#9fd4ff';
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(r() * 12);
        const y = Math.floor(r() * 15);
        ctx.fillRect(x, y, 3, 1);
      }
    }),
    true
  );
  // 木の板（橋）
  T.plank = toTexture(
    noiseTile(16, ['#a8743e', '#9c6a36', '#b07c44'], 61, (ctx) => {
      ctx.fillStyle = '#6b4220';
      for (let x = 0; x < 16; x += 4) ctx.fillRect(x, 0, 1, 16);
    })
  );
  // 葉っぱ
  T.leaf = toTexture(
    noiseTile(16, ['#2f7a3a', '#357f40', '#2a6e34', '#3f9048', '#245f2d'], 71, (ctx, r) => {
      ctx.fillStyle = '#5cb860';
      for (let i = 0; i < 8; i++) ctx.fillRect(Math.floor(r() * 15), Math.floor(r() * 15), 1, 1);
    })
  );
  // 木のみき
  T.bark = toTexture(noiseTile(8, ['#6b4426', '#5c3a20', '#7a4e2c'], 81));
  // 岩
  T.rock = toTexture(noiseTile(8, ['#8e8e9c', '#7c7c8a', '#a0a0ae', '#6c6c7a'], 91));
  return T;
}

// 草の小さな「しげみ」の絵（地面にたくさん立てる）
export function tuftTexture() {
  const rows = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......g.........',
    '..g...gG...g....',
    '..gG..gG..gG..g.',
    '...gG.gGg.gG.gG.',
    '.g.gGggGg.gGgG..',
    '.gGgGgGGgggGgG..',
    '..gGGGGGGGGGGg..',
    '................',
    '................',
  ];
  return spriteTexture(rows, { g: '#7fd05a', G: '#4f9a3e' });
}

// やわらかい光のつぶ（パーティクル用）
export function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
