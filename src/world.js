// =====================================================
// world.js … 3Dの世界（ジオラマのようなマップ）を作るファイル
// =====================================================
// オクトパストラベラーの「HD-2D」と同じ考え方で、
//   ・地面、木、水、かべ … 3D（立体）
//   ・キャラクター       … 2Dのドット絵を板にはって立てる
// という組み合わせにしています。
import * as THREE from 'three';
import {
  makeTileTextures, tuftTexture, glowTexture, heroTextures, spriteTexture, seeded,
  PUCHI, PUCHI_COLORS, BAT, BAT_COLORS, BOSS, BOSS_PALETTE, CHEST_CLOSED, CHEST_OPEN, CHEST_PALETTE,
} from './pixel.js';

// ----- マップ（1文字＝1マス） -----
//  T 木   . 草   , 花   = 道   R 岩   ~ 水   b 橋   W 石のかべ   l たいまつ
// 下（南）からスタートして、上（北）の遺跡にいるボスをめざします。
const MAP = [
  'TTTTTTTTTTTTTTTT',
  'TTWWWWWWWWWWWWTT',
  'TTW.,..==..,.WTT',
  'TTW.l..==..l.WTT',
  'TTW....==....WTT',
  'TTW.,..==..,.WTT',
  'TTWWWW.==.WWWWTT',
  'TT,....==....,TT',
  'T..R...==..,...T',
  'T......==......T',
  'T..,...===.....T',
  'T.......==..R..T',
  '~~~~~~~~bb~~~~~~',
  '~~~~~~~~bb~~~~~~',
  'T.......==.....T',
  'T..T...==...T..T',
  'T.....==.......T',
  'T....==....,...T',
  'T.R..==........T',
  'T,...===.......T',
  'TT.....==....TTT',
  'T..,....==.....T',
  'T........==..R.T',
  'T..T.....==....T',
  'T........==..,.T',
  'T...,...==.....T',
  'T.......==...T.T',
  'T..R...==......T',
  'T......==..,...T',
  'TT.....==.....TT',
  'TTT....==....TTT',
  'TTTTTTT==TTTTTTT',
];
export const COLS = 16;
export const ROWS = MAP.length;
export const START = { col: 7, row: 30 };

// 敵の置き場所と、通せんぼ（バリア）の場所
const WEAK_SPOTS = [
  { col: 8, row: 27 },
  { col: 4, row: 24 },
  { col: 11, row: 22 },
  { col: 3, row: 18 },
  { col: 9, row: 16 },
];
const NORMAL_SPOTS = [
  { col: 4, row: 10 },
  { col: 11, row: 9 },
  { col: 7, row: 8 },
];
const BOSS_TILES = [{ col: 7, row: 4 }, { col: 8, row: 4 }];
const BRIDGE_BARRIER = [{ col: 8, row: 14 }, { col: 9, row: 14 }]; // 橋の手前
const GATE_BARRIER = [{ col: 6, row: 6 }, { col: 7, row: 6 }, { col: 8, row: 6 }, { col: 9, row: 6 }];

// マス目 → 3Dの位置（x, z）
export function tileToWorld(col, row) {
  return { x: col - COLS / 2 + 0.5, z: row - ROWS / 2 + 0.5 };
}

// 地面の高さを毎回同じにするための乱数
const rnd = seeded(2024);

export class World {
  constructor(scene) {
    this.scene = scene;
    this.tex = makeTileTextures();
    this.glow = glowTexture();
    this.updaters = []; // 毎フレーム動かすもの（水・光・敵のゆれ など）
    this.bursts = [];   // 光のつぶがはじける演出
    this.heights = [];  // マスごとの地面の高さ

    this.buildSky();
    this.buildGround();
    this.buildTrees();
    this.buildDecor();
    this.buildLights();
    this.buildParticles();
    this.buildTorches();
    this.buildActors();
  }

  // ---------- マップを調べる道具 ----------
  cell(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 'X';
    return MAP[row][col] ?? 'X';
  }
  groundY(col, row) {
    return this.heights[row]?.[col] ?? 0;
  }
  isWalkableTerrain(col, row) {
    return ['.', ',', '=', 'b'].includes(this.cell(col, row));
  }

  // ---------- 空と霧 ----------
  buildSky() {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3a5f9c');
    g.addColorStop(0.55, '#9cc4e4');
    g.addColorStop(1, '#f6dcb0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
    // 霧（きり）：遠くのものをかすませて、空気の厚みを出す
    this.scene.fog = new THREE.Fog(0xcfe0e6, 14, 34);
  }

  // ---------- 地面 ----------
  buildGround() {
    const T = this.tex;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const side = new THREE.MeshStandardMaterial({ map: T.dirt, roughness: 1 });
    const mats = {
      grass: [side, side, new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }), side, side, side],
      flower: [side, side, new THREE.MeshStandardMaterial({ map: T.flower, roughness: 1 }), side, side, side],
      path: [side, side, new THREE.MeshStandardMaterial({ map: T.path, roughness: 1 }), side, side, side],
      stone: new THREE.MeshStandardMaterial({ map: T.stone, roughness: 0.95 }),
      bed: new THREE.MeshStandardMaterial({ color: 0x2b3f5c, roughness: 1 }),
    };

    // 種類ごとに位置を集める
    const lists = { grass: [], flower: [], path: [], stone: [], bed: [] };
    for (let row = 0; row < ROWS; row++) {
      this.heights[row] = [];
      for (let col = 0; col < COLS; col++) {
        const ch = this.cell(col, row);
        const { x, z } = tileToWorld(col, row);
        let top = 0;
        if (ch === '.' || ch === 'T' || ch === 'R' || ch === 'l') top = rnd() * 0.08;
        if (ch === ',') top = rnd() * 0.06;
        if (ch === '=') top = -0.02;
        if (ch === '~' || ch === 'b') top = -0.45;
        this.heights[row][col] = ch === 'b' ? 0.04 : Math.max(top, ch === '~' ? -0.45 : top);

        if (ch === 'W') {
          // 石のかべは高さをばらつかせて「こわれた遺跡」っぽく
          const h = 1.1 + rnd() * 0.9;
          lists.stone.push({ x, y: h / 2, z, sy: h });
          lists.grass.push({ x, y: -0.5, z, sy: 1 });
          this.heights[row][col] = h;
        } else if (ch === '~' || ch === 'b') {
          lists.bed.push({ x, y: -0.55 - 0.5, z, sy: 1 });
        } else if (ch === '=') {
          lists.path.push({ x, y: top - 0.5, z, sy: 1 });
        } else if (ch === ',') {
          lists.flower.push({ x, y: top - 0.5, z, sy: 1 });
        } else {
          lists.grass.push({ x, y: top - 0.5, z, sy: 1 });
        }
      }
    }

    // InstancedMesh（インスタンスメッシュ）＝ 同じ形をたくさん並べるときに速く描ける仕組み
    const dummy = new THREE.Object3D();
    for (const [key, list] of Object.entries(lists)) {
      const mesh = new THREE.InstancedMesh(box, mats[key], list.length);
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(1, p.sy, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.receiveShadow = true;
      mesh.castShadow = key === 'stone';
      this.scene.add(mesh);
    }

    // ジオラマの土台（地面の下の厚み）
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 0.4, 2.5, ROWS + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 1 })
    );
    base.position.y = -1.0 - 1.25 - 0.02;
    this.scene.add(base);

    // 水面（すいめん）：もようを少しずつ動かして流れて見せる
    const waterTex = T.water.clone();
    waterTex.needsUpdate = true;
    waterTex.repeat.set(COLS, 2);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS, 2),
      new THREE.MeshStandardMaterial({
        map: waterTex, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.1,
        emissive: 0x1a4a80, emissiveIntensity: 0.35,
      })
    );
    water.rotation.x = -Math.PI / 2;
    const wpos = tileToWorld(0, 12.5);
    water.position.set(0, -0.2, wpos.z);
    water.receiveShadow = true;
    this.scene.add(water);
    this.updaters.push((t) => {
      waterTex.offset.x = t * 0.25;
      waterTex.offset.y = Math.sin(t * 0.8) * 0.05;
    });

    // 橋
    const plankMat = new THREE.MeshStandardMaterial({ map: T.plank, roughness: 0.9 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 0.16, 2.6), plankMat);
    const bpos = tileToWorld(8.5, 12.5);
    bridge.position.set(bpos.x, -0.04, bpos.z);
    bridge.castShadow = bridge.receiveShadow = true;
    this.scene.add(bridge);
    for (const dx of [-1.05, 1.05]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.6), plankMat);
      rail.position.set(bpos.x + dx, 0.35, bpos.z);
      rail.castShadow = true;
      this.scene.add(rail);
      for (const dz of [-1.2, 0, 1.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), plankMat);
        post.position.set(bpos.x + dx, 0.15, bpos.z + dz);
        post.castShadow = true;
        this.scene.add(post);
      }
    }
  }

  // ---------- 木 ----------
  buildTrees() {
    const T = this.tex;
    const spots = [];
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++) if (this.cell(col, row) === 'T') spots.push({ col, row });

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6);
    trunkGeo.translate(0, 0.4, 0);
    const leafGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ map: T.bark, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ map: T.leaf, roughness: 0.9, flatShading: true });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, spots.length * 2);
    const dummy = new THREE.Object3D();
    const r = seeded(7);
    spots.forEach((s, i) => {
      const { x, z } = tileToWorld(s.col, s.row);
      const sc = 0.85 + r() * 0.5;
      const ox = (r() - 0.5) * 0.3;
      const oz = (r() - 0.5) * 0.3;
      dummy.position.set(x + ox, this.groundY(s.col, s.row), z + oz);
      dummy.rotation.set(0, r() * Math.PI, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x + ox, this.groundY(s.col, s.row) + (0.95 + k * 0.45) * sc, z + oz);
        dummy.rotation.set(r(), r() * Math.PI, r());
        const ls = sc * (k === 0 ? 1.15 : 0.8);
        dummy.scale.set(ls, ls * 0.9, ls);
        dummy.updateMatrix();
        leaves.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    });
    for (const m of [trunks, leaves]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }

    // マップの外側にも木を並べて「森の中」に見せる
    const outer = [];
    for (let i = 0; i < 70; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      outer.push({ x: side * (COLS / 2 + 0.8 + r() * 3), z: -ROWS / 2 + r() * ROWS });
    }
    const ot = new THREE.InstancedMesh(trunkGeo, trunkMat, outer.length);
    const ol = new THREE.InstancedMesh(leafGeo, leafMat, outer.length);
    outer.forEach((p, i) => {
      const sc = 1 + r() * 0.8;
      dummy.position.set(p.x, -0.1, p.z);
      dummy.rotation.set(0, r() * 3, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      ot.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.0 * sc;
      dummy.scale.set(sc * 1.3, sc * 1.2, sc * 1.3);
      dummy.updateMatrix();
      ol.setMatrixAt(i, dummy.matrix);
    });
    ot.castShadow = ol.castShadow = true;
    this.scene.add(ot, ol);
  }

  // ---------- 岩・草のしげみ ----------
  buildDecor() {
    const rockMat = new THREE.MeshStandardMaterial({ map: this.tex.rock, roughness: 1, flatShading: true });
    const r = seeded(99);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.cell(col, row) !== 'R') continue;
        const { x, z } = tileToWorld(col, row);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), rockMat);
        rock.position.set(x, 0.22, z);
        rock.rotation.set(r(), r(), r());
        rock.scale.set(1, 0.75, 1);
        rock.castShadow = rock.receiveShadow = true;
        this.scene.add(rock);
      }
    }

    // 草のしげみ（板にドット絵をはったもの）をたくさん置く
    const tuftMat = new THREE.MeshStandardMaterial({ map: tuftTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    geo.translate(0, 0.22, 0);
    const spots = [];
    for (let row = 0; row < ROWS; row++)
      for (let col = 0; col < COLS; col++)
        if (['.', ',', 'T'].includes(this.cell(col, row)) && r() < 0.55) spots.push({ col, row });
    const tufts = new THREE.InstancedMesh(geo, tuftMat, spots.length * 2);
    const dummy = new THREE.Object3D();
    let n = 0;
    for (const s of spots) {
      const { x, z } = tileToWorld(s.col, s.row);
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x + (r() - 0.5) * 0.8, this.groundY(s.col, s.row), z + (r() - 0.5) * 0.8);
        dummy.rotation.set(-0.35, (r() - 0.5) * 0.6, 0);
        const sc = 0.6 + r() * 0.6;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        tufts.setMatrixAt(n++, dummy.matrix);
      }
    }
    tufts.receiveShadow = true;
    this.scene.add(tufts);
  }

  // ---------- 光 ----------
  buildLights() {
    // 空からのやわらかい光（上は青っぽく、下は緑っぽく）
    this.scene.add(new THREE.HemisphereLight(0xbfdcff, 0x5a7a3a, 1.1));

    // 太陽の光（かげを作る）
    const sun = new THREE.DirectionalLight(0xffe0b0, 2.6);
    sun.castShadow = true;
    const isMobile = matchMedia('(pointer: coarse)').matches;
    sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -11;
    sc.right = sc.top = 11;
    sc.near = 1;
    sc.far = 40;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    // 光のすじ（ゴッドレイ）… ななめに差しこむ光の帯
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,240,200,0)');
    g.addColorStop(0.5, 'rgba(255,240,200,0.9)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    const rayTex = new THREE.CanvasTexture(c);
    const r = seeded(5);
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: rayTex, transparent: true, opacity: 0.12, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      });
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + r() * 0.8, 9), mat);
      ray.position.set(-6 + r() * 12, 3, -ROWS / 2 + 2 + i * 3.4);
      ray.rotation.set(0, 0.4, 0.55);
      this.scene.add(ray);
      const phase = r() * 6;
      this.updaters.push((t) => (mat.opacity = 0.07 + Math.sin(t * 0.6 + phase) * 0.05));
    }
  }

  // 太陽とかげの範囲を、主人公についていかせる
  followSun(x, z) {
    this.sun.position.set(x - 6, 12, z + 7);
    this.sun.target.position.set(x, 0, z);
  }

  // ---------- 空中をただよう光のつぶ ----------
  buildParticles() {
    const count = 220;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seeds = [];
    const r = seeded(77);
    const palette = [new THREE.Color(0xfff2b0), new THREE.Color(0xc8ffb0), new THREE.Color(0xffd0f0)];
    for (let i = 0; i < count; i++) {
      seeds.push({ x: (r() - 0.5) * COLS, y: 0.3 + r() * 3, z: (r() - 0.5) * ROWS, p: r() * 10, s: 0.2 + r() * 0.5 });
      const c = palette[i % 3];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.12, map: this.glow, vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.updaters.push((t) => {
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        pos[i * 3] = s.x + Math.sin(t * s.s + s.p) * 0.6;
        pos[i * 3 + 1] = s.y + Math.sin(t * s.s * 1.7 + s.p) * 0.3;
        pos[i * 3 + 2] = s.z + Math.cos(t * s.s + s.p) * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  // ---------- 遺跡のたいまつ ----------
  buildTorches() {
    const stoneMat = new THREE.MeshStandardMaterial({ map: this.tex.stone, roughness: 1 });
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.cell(col, row) !== 'l') continue;
        const { x, z } = tileToWorld(col, row);
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), stoneMat);
        pillar.position.set(x, 0.65, z);
        pillar.castShadow = true;
        this.scene.add(pillar);
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.glow, color: 0xff9a3a, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        flame.position.set(x, 1.5, z);
        this.scene.add(flame);
        const light = new THREE.PointLight(0xff8a30, 6, 6, 1.6);
        light.position.set(x, 1.7, z);
        this.scene.add(light);
        const ph = col * 1.3;
        this.updaters.push((t) => {
          const f = 0.85 + Math.sin(t * 13 + ph) * 0.08 + Math.sin(t * 7.3 + ph) * 0.07;
          light.intensity = 6 * f;
          flame.scale.setScalar(0.55 * f);
        });
      }
    }
  }

  // ---------- キャラクター（ドット絵の板） ----------
  makeSprite(texture, w, h) {
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0); // 足もとを原点にする
    const mat = new THREE.MeshStandardMaterial({
      map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    // かげの形もドット絵の形にする
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5,
    });
    mesh.rotation.order = 'YXZ';
    const group = new THREE.Group();
    group.add(mesh);
    // 足もとの丸いかげ
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(w * 0.32, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    group.add(blob);
    group.userData.sprite = mesh;
    this.scene.add(group);
    return group;
  }

  buildActors() {
    // 主人公
    this.heroTex = heroTextures();
    this.hero = this.makeSprite(this.heroTex.down[0], 1.05, 1.05);

    // 敵
    this.enemies = [];
    WEAK_SPOTS.forEach((s, i) => {
      const c = PUCHI_COLORS[i];
      this.addEnemy('weak', c.name, spriteTexture(PUCHI, c.palette), 0.95, 0.95, [s]);
    });
    NORMAL_SPOTS.forEach((s, i) => {
      const c = BAT_COLORS[i];
      this.addEnemy('normal', c.name, spriteTexture(BAT, c.palette), 1.2, 1.2, [s]);
    });
    this.boss = this.addEnemy('boss', 'むげんの魔王インフィニタス', spriteTexture(BOSS, BOSS_PALETTE), 3.0, 2.8, BOSS_TILES);
    // ボスのまわりを赤くてらす
    const bl = new THREE.PointLight(0xff3050, 5, 5, 1.5);
    bl.position.set(0, 1.5, 0.8);
    this.boss.group.add(bl);

    // 通せんぼの結界（けっかい）
    this.barriers = [
      this.addBarrier(BRIDGE_BARRIER, 'weak'),
      this.addBarrier(GATE_BARRIER, 'normal'),
    ];

    // 宝箱（ボスをたおすまでかくしておく）
    this.chestTex = {
      closed: spriteTexture(CHEST_CLOSED, CHEST_PALETTE),
      open: spriteTexture(CHEST_OPEN, CHEST_PALETTE),
    };
    this.chest = this.makeSprite(this.chestTex.closed, 1.1, 1.1);
    this.chest.visible = false;
    this.chestTiles = BOSS_TILES;
    const cp = tileToWorld(7.5, 4);
    this.chest.position.set(cp.x, 0, cp.z);
    // 宝箱の光の柱
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff0a0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      })
    );
    beam.position.y = 3;
    this.chest.add(beam);
    const chestLight = new THREE.PointLight(0xffe08a, 0, 5, 1.5);
    chestLight.position.y = 1.2;
    this.chest.add(chestLight);
    this.chest.userData.beam = beam;
    this.chest.userData.light = chestLight;
    this.updaters.push((t) => {
      beam.material.opacity = 0.07 + Math.sin(t * 2) * 0.03;
      beam.rotation.y = t * 0.5;
    });
  }

  addEnemy(kind, name, texture, w, h, tiles) {
    const group = this.makeSprite(texture, w, h);
    const cx = tiles.reduce((a, t) => a + t.col, 0) / tiles.length;
    const cz = tiles.reduce((a, t) => a + t.row, 0) / tiles.length;
    const p = tileToWorld(cx, cz);
    group.position.set(p.x, this.groundY(tiles[0].col, tiles[0].row), p.z);
    const enemy = { kind, name, group, tiles, alive: true, texture, w, h, phase: Math.random() * 6 };
    this.enemies.push(enemy);
    return enemy;
  }

  addBarrier(tiles, needKind) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 32;
    const ctx = c.getContext('2d');
    for (let y = 0; y < 32; y++) {
      ctx.fillStyle = y % 4 < 2 ? 'rgba(120,230,255,0.9)' : 'rgba(60,140,255,0.5)';
      ctx.fillRect(0, y, 16, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tiles.length, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const first = tileToWorld(tiles[0].col, tiles[0].row);
    const last = tileToWorld(tiles[tiles.length - 1].col, tiles[0].row);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tiles.length, 1.8), mat);
    mesh.position.set((first.x + last.x) / 2, 0.9, first.z + 0.45);
    this.scene.add(mesh);
    const light = new THREE.PointLight(0x60d0ff, 3, 4, 1.5);
    light.position.set(mesh.position.x, 1.2, mesh.position.z + 0.5);
    this.scene.add(light);
    const barrier = { tiles, needKind, mesh, light, open: false };
    this.updaters.push((t) => {
      if (barrier.open) return;
      tex.offset.y = -t * 0.4;
      mat.opacity = 0.45 + Math.sin(t * 3) * 0.12;
    });
    return barrier;
  }

  // ---------- はじける光のつぶ ----------
  burst(position, color = 0xffffff, count = 40, speed = 2.5) {
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      pos.set([position.x, position.y, position.z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      vel.push(new THREE.Vector3(Math.cos(a) * speed * (0.3 + Math.random()), up * speed * 1.2, Math.sin(a) * speed * (0.3 + Math.random())));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25, map: this.glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1.2, max: 1.2 });
  }

  // ---------- 毎フレームの更新 ----------
  update(t, dt, camera) {
    for (const fn of this.updaters) fn(t, dt);

    // ドット絵の板をカメラのほうへ向ける（ビルボード）
    const yaw = Math.atan2(camera.position.x - this.hero.position.x, camera.position.z - this.hero.position.z);
    const face = (g) => {
      const s = g.userData.sprite;
      s.rotation.y = yaw;
      s.rotation.x = -0.28; // 少しうしろにたおして、上から見ても縦長に見えるように
    };
    face(this.hero);
    face(this.chest);

    // 敵のゆらゆら
    for (const e of this.enemies) {
      face(e.group);
      if (!e.alive) continue;
      const s = e.group.userData.sprite;
      if (e.kind === 'weak') {
        const b = Math.abs(Math.sin(t * 3 + e.phase));
        s.scale.set(1 + (1 - b) * 0.08, 0.92 + b * 0.1, 1);
        s.position.y = b * 0.12;
      } else if (e.kind === 'normal') {
        s.position.y = 0.35 + Math.sin(t * 4 + e.phase) * 0.15;
      } else {
        s.position.y = Math.sin(t * 1.5) * 0.06;
      }
    }

    // はじける光のつぶ
    this.bursts = this.bursts.filter((b) => {
      b.life -= dt;
      const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, i) => {
        v.y -= 3 * dt;
        arr[i * 3] += v.x * dt;
        arr[i * 3 + 1] += v.y * dt;
        arr[i * 3 + 2] += v.z * dt;
      });
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, b.life / b.max);
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        return false;
      }
      return true;
    });
  }

  // ---------- ゲームを最初からにする ----------
  reset() {
    for (const e of this.enemies) {
      e.alive = true;
      e.group.visible = true;
      const s = e.group.userData.sprite;
      s.material.opacity = 1;
      s.material.transparent = false;
      s.scale.set(1, 1, 1);
    }
    for (const b of this.barriers) {
      b.open = false;
      b.mesh.visible = true;
      b.mesh.scale.y = 1;
      b.light.intensity = 3;
    }
    this.chest.visible = false;
    this.chest.userData.sprite.material.map = this.chestTex.closed;
    this.chest.userData.light.intensity = 0;
    this.chest.userData.beam.visible = true;
    this.chestOpened = false;
  }

  enemyAt(col, row) {
    return this.enemies.find((e) => e.alive && e.tiles.some((t) => t.col === col && t.row === row));
  }
  barrierAt(col, row) {
    return this.barriers.find((b) => !b.open && b.tiles.some((t) => t.col === col && t.row === row));
  }
  chestAt(col, row) {
    return this.chest.visible && !this.chestOpened && this.chestTiles.some((t) => t.col === col && t.row === row);
  }
}
