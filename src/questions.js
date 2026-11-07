// =====================================================
// questions.js … 4択問題を自動で作るファイル
// =====================================================
// 問題は「ジェネレーター（問題を作る関数）」で毎回ランダムに作ります。
// ジェネレーターは { text: 問題文, answer: 正解, wrongs: まちがいの候補 } を返します。
//
// 難易度（小・中・高・大人）の中を、さらに3つのランク（tier：段階）に分けています。
//   easy   … 弱い敵
//   normal … ふつうの敵
//   hard   … ボスと宝箱
// どれも「暗算でとける」ように数字の大きさをおさえています。

// ----- 便利な道具（ヘルパー関数） -----

// min 以上 max 以下の整数をランダムに1つ選ぶ
export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列の中から1つランダムに選ぶ
export function pick(array) {
  return array[rand(0, array.length - 1)];
}

// 配列の順番をバラバラにする（フィッシャー–イェーツのシャッフル）
export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 正解の数に近い「まちがいの数」をいくつか作る
function near(answer, deltas = [1, -1, 2, -2, 10, -10, 3, -3]) {
  return deltas.map((d) => answer + d);
}

// マイナスの数を見やすくカッコでかこむ（例：-3 → (-3)）
function paren(n) {
  return n < 0 ? `(${n})` : `${n}`;
}

// 「+ 3」「- 3」のように、符号つきで書く
function signed(n) {
  return n >= 0 ? `+ ${n}` : `- ${-n}`;
}

// 「3x²」のような項を作る（c：係数、p：次数）
const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'];
function term(c, p) {
  if (p === 0) return `${c}`;
  return `${c === 1 ? '' : c}x${SUP[p]}`;
}

// 係数が1のときは「x」、-1のときは「-x」と書く
function coef(n, letter = 'x') {
  if (n === 1) return letter;
  if (n === -1) return `-${letter}`;
  return `${n}${letter}`;
}

// 最大公約数（2つの数を両方わりきれる、いちばん大きい数）
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

// 最小公倍数（2つの数の、どちらでもわりきれる、いちばん小さい数）
function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

// 分数を約分して「3/4」のような文字にする（分母が1なら整数だけ）
function frac(n, d) {
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? `${nn}` : `${nn}/${dd}`;
}

// 組み合わせ nCr（n個から r個をえらぶ方法の数）
function comb(n, r) {
  let v = 1;
  for (let i = 0; i < r; i++) v = (v * (n - i)) / (i + 1);
  return v;
}

// =====================================================
// 小学生
// =====================================================
const elementary = {
  easy: [
    // たし算（くり上がりあり）
    () => {
      const a = rand(15, 59);
      const b = rand(6, 39);
      return { text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b) };
    },
    // ひき算
    () => {
      const a = rand(30, 90);
      const b = rand(8, a - 5);
      return { text: `${a} - ${b} = ?`, answer: a - b, wrongs: near(a - b) };
    },
    // 九九
    () => {
      const a = rand(3, 9);
      const b = rand(3, 9);
      return { text: `${a} × ${b} = ?`, answer: a * b, wrongs: [a * b + a, a * b - a, a * b + b, a * b - 1, a * b + 1] };
    },
    // わり算（わりきれる）
    () => {
      const b = rand(2, 9);
      const ans = rand(2, 9);
      return { text: `${b * ans} ÷ ${b} = ?`, answer: ans, wrongs: near(ans, [1, -1, 2, -2, b]) };
    },
    // 3つの数のたし算
    () => {
      const a = rand(10, 40);
      const b = rand(10, 40);
      const c = rand(5, 20);
      const s = a + b + c;
      return { text: `${a} + ${b} + ${c} = ?`, answer: s, wrongs: near(s) };
    },
    // □（あな）うめ
    () => {
      const b = rand(5, 30);
      const box = rand(5, 40);
      return { text: `□ + ${b} = ${box + b}\n□ = ?`, answer: box, wrongs: [box + b + b, box + 1, box - 1, box + 10] };
    },
    // 時間（何分？）
    () => {
      const h = rand(1, 3);
      const m = rand(5, 55);
      const ans = h * 60 + m;
      return { text: `${h}時間 ${m}分 は\n何分？`, answer: ans, wrongs: [h * 100 + m, h + m, ans + 10, ans - 10] };
    },
    // 長さの単位
    () => {
      const m = rand(1, 9);
      const cm = rand(5, 95);
      const ans = m * 100 + cm;
      return { text: `${m}m ${cm}cm は\n何cm？`, answer: ans, wrongs: [m * 10 + cm, m * 1000 + cm, m + cm, ans + 10] };
    },
  ],
  normal: [
    // 2けた × 1けた
    () => {
      const a = rand(12, 29);
      const b = rand(3, 6);
      return { text: `${a} × ${b} = ?`, answer: a * b, wrongs: [a * b + b, a * b - b, a * b + 10, a * b - 10, a * b + 1] };
    },
    // 長方形の面積
    () => {
      const w = rand(4, 12);
      const h = rand(3, 9);
      return {
        text: `たて ${h}cm、よこ ${w}cm の\n長方形の面積は？（cm²）`,
        answer: w * h,
        wrongs: [2 * (w + h), w + h, w * h + w, w * h - h, w * h + 10],
      };
    },
    // かけ算とたし算のまじった計算（かけ算が先）
    () => {
      const a = rand(2, 9);
      const b = rand(2, 6);
      const c = rand(2, 6);
      return { text: `${a} + ${b} × ${c} = ?`, answer: a + b * c, wrongs: [(a + b) * c, a + b + c, a * b + c, a + b * c + 1] };
    },
    // 分数のたし算（分母が同じ）
    () => {
      const d = pick([5, 7, 9, 11]);
      const a = rand(1, d - 3);
      const b = rand(1, d - a - 1);
      return {
        text: `${a}/${d} + ${b}/${d} = ?`,
        answer: `${a + b}/${d}`,
        wrongs: [`${a + b}/${d * 2}`, `${a + b + 1}/${d}`, `${a + b - 1}/${d}`, `${a * b}/${d}`],
      };
    },
    // あまりのあるわり算
    () => {
      const b = rand(3, 9);
      const q = rand(3, 9);
      const r = rand(1, b - 1);
      return { text: `${b * q + r} ÷ ${b} の\nあまりは？`, answer: r, wrongs: [q, r + 1, r - 1, b - r] };
    },
    // 正方形のまわりの長さ
    () => {
      const a = rand(3, 25);
      return { text: `1辺 ${a}cm の正方形の\nまわりの長さは？（cm）`, answer: a * 4, wrongs: [a * a, a * 2, a * 4 + 4, a * 4 - 2] };
    },
    // 最小公倍数
    () => {
      const [a, b] = pick([[4, 6], [6, 8], [3, 4], [6, 9], [4, 10], [8, 12], [6, 10], [9, 12]]);
      const ans = lcm(a, b);
      return { text: `${a} と ${b} の\n最小公倍数は？`, answer: ans, wrongs: [a * b, gcd(a, b), ans + a, ans * 2] };
    },
    // 最大公約数
    () => {
      const g = pick([2, 3, 4, 6]);
      const [x, y] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]);
      const ans = g;
      return { text: `${g * x} と ${g * y} の\n最大公約数は？`, answer: ans, wrongs: [g * x * y, g * 2, g + 1, x * y] };
    },
    // 速さ（道のり）
    () => {
      const v = rand(3, 12) * 5;
      const t = rand(2, 5);
      return { text: `時速 ${v}km で ${t} 時間\n進むと何km？`, answer: v * t, wrongs: [v + t, v * t + v, v * t - v, v * (t + 1) + 5] };
    },
  ],
  hard: [
    // 三角形の面積
    () => {
      const base = rand(3, 8) * 2;
      const h = rand(3, 9);
      return {
        text: `底辺 ${base}cm、高さ ${h}cm の\n三角形の面積は？（cm²）`,
        answer: (base * h) / 2,
        wrongs: [base * h, (base * h) / 2 + h, (base * h) / 2 - 2, base + h],
      };
    },
    // 直方体の体積
    () => {
      const a = rand(2, 5);
      const b = rand(3, 5);
      const c = rand(2, 6);
      return {
        text: `たて ${a}cm、よこ ${b}cm、高さ ${c}cm の\n直方体の体積は？（cm³）`,
        answer: a * b * c,
        wrongs: [a * b + c, a * b * c + a * b, a * b * c - b, (a + b + c) * 2, a * b * c + 10],
      };
    },
    // 平均
    () => {
      const avg = rand(5, 12);
      const d = rand(1, 4);
      const nums = [avg - d, avg, avg + d];
      return { text: `${nums.join('、')} の\n平均は？`, answer: avg, wrongs: [avg + 1, avg - 1, avg * 3, avg + d] };
    },
    // 割合
    () => {
      const whole = pick([200, 300, 400, 500, 600, 800]);
      const pct = pick([10, 20, 25, 50]);
      const ans = (whole * pct) / 100;
      return { text: `${whole}円 の ${pct}% は何円？`, answer: ans, wrongs: [ans * 2, ans / 2, whole - ans, ans + 10] };
    },
    // 円の面積（円周率 3.14）
    () => {
      const r = pick([10, 20, 30]);
      const ans = Math.round(r * r * 3.14);
      return { text: `半径 ${r}cm の円の面積は？\n（円周率は3.14、cm²）`, answer: ans, wrongs: [Math.round(r * 2 * 314), ans / 2, ans * 2, r * r * 3] };
    },
    // 速さ（時速を求める）
    () => {
      const v = rand(4, 15) * 5;
      const t = rand(2, 4);
      return { text: `${v * t}km を ${t}時間 で進んだ。\n時速何km？`, answer: v, wrongs: [v * t * t, v + t, v - 5, v + 5] };
    },
    // 比（□を求める）
    () => {
      const a = rand(2, 5);
      const b = rand(a + 1, 9);
      const k = rand(2, 6);
      return { text: `${a} : ${b} = ${a * k} : □\n□ = ?`, answer: b * k, wrongs: [b + k, a * b, b * k + k, b * k - 1] };
    },
    // 場合の数（ならべかた）
    () => {
      const n = rand(3, 5);
      let ans = 1;
      for (let i = 2; i <= n; i++) ans *= i;
      return { text: `${n}人が1列に ならぶ\nならびかたは何通り？`, answer: ans, wrongs: [n * n, n * 2, ans / n, ans + n] };
    },
  ],
};

// =====================================================
// 中学生
// =====================================================
const middle = {
  easy: [
    // 正負の数のたし算
    () => {
      const a = -rand(2, 15);
      const b = rand(2, 15);
      return { text: `${a} + ${b} = ?`, answer: a + b, wrongs: [-(a + b), a - b, a + b + 1, a + b - 1] };
    },
    // 正負の数のかけ算
    () => {
      const a = -rand(2, 9);
      const b = pick([-1, 1]) * rand(2, 9);
      return { text: `${a} × ${paren(b)} = ?`, answer: a * b, wrongs: [-(a * b), a * b + 1, a * b - 1, a + b] };
    },
    // √ の中が平方数
    () => {
      const n = rand(4, 15);
      return { text: `√${n * n} = ?`, answer: n, wrongs: near(n, [1, -1, 2, -2, n]) };
    },
    // 累乗（るいじょう）
    () => {
      const n = rand(2, 9);
      return { text: `(-${n})² = ?`, answer: n * n, wrongs: [-(n * n), -2 * n, 2 * n, n * n + 1] };
    },
    // 正負の数のひき算
    () => {
      const a = rand(2, 15);
      const b = rand(2, 15);
      return { text: `${a} - (-${b}) = ?`, answer: a + b, wrongs: [a - b, -(a + b), b - a, a + b + 1] };
    },
    // 文字式に数を入れる
    () => {
      const a = rand(2, 6);
      const b = pick([-1, 1]) * rand(1, 9);
      const x = -rand(1, 5);
      const ans = a * x + b;
      return { text: `x = ${x} のとき\n${a}x ${signed(b)} の値は？`, answer: ans, wrongs: [-a * x + b, a * x - b, a + x + b, ans + 1] };
    },
    // 同類項をまとめる
    () => {
      const a = rand(2, 9);
      const b = pick([-1, 1]) * rand(2, 9);
      const ans = a + b;
      if (ans === 0) return { text: `${a}x - ${a}x = ?`, answer: 0, wrongs: [`${2 * a}x`, 'x', `${a}`, `-${a}x`] };
      return {
        text: `${a}x ${signed(b).replace(/(\d+)$/, '$1x')} = ?`,
        answer: coef(ans),
        wrongs: [coef(a - b), coef(a * b), coef(ans + 1), coef(ans - 1), `${ans}`, `${ans}x²`].filter((w) => w !== '0x'),
      };
    },
    // 比例の式
    () => {
      const a = pick([-1, 1]) * rand(2, 8);
      const x = rand(2, 6);
      return { text: `y は x に比例し、\nx = ${x} のとき y = ${a * x}\n比例定数は？`, answer: a, wrongs: [-a, a * x, a + x, a + 1] };
    },
  ],
  normal: [
    // 1次方程式
    () => {
      const a = rand(2, 9);
      const x = pick([-1, 1]) * rand(1, 9);
      const b = pick([-1, 1]) * rand(1, 15);
      return { text: `${a}x ${signed(b)} = ${a * x + b}\nx = ?`, answer: x, wrongs: [-x, x + 1, x - 1, x + 2] };
    },
    // 1次関数
    () => {
      const a = pick([-1, 1]) * rand(2, 5);
      const b = pick([-1, 1]) * rand(1, 9);
      const x = pick([-1, 1]) * rand(1, 5);
      const y = a * x + b;
      return { text: `y = ${a}x ${signed(b)} で\nx = ${x} のとき y = ?`, answer: y, wrongs: [y + 1, y - 1, -y, a * x - b] };
    },
    // ルートを簡単にする
    () => {
      const k = rand(2, 5);
      const m = pick([2, 3, 5]);
      const other = pick([2, 3, 5].filter((v) => v !== m));
      return {
        text: `√${k * k * m} を簡単にすると？`,
        answer: `${k}√${m}`,
        wrongs: [`${m}√${k}`, `${k + 1}√${m}`, `${k}√${other}`, `${k * m}√${m}`],
      };
    },
    // 連立方程式（x + y と x - y）
    () => {
      const x = rand(2, 9);
      const y = rand(1, x - 1);
      return { text: `x + y = ${x + y}\nx - y = ${x - y}\nx = ?`, answer: x, wrongs: [y, x + 1, x - 1, x + y] };
    },
    // 反比例
    () => {
      const a = pick([12, 18, 24, 36, 48]);
      const divs = [2, 3, 4, 6].filter((d) => a % d === 0);
      const x = pick(divs);
      const ans = a / x;
      return { text: `y = ${a}/x で\nx = ${x} のとき y = ?`, answer: ans, wrongs: [a * x, a - x, ans + 1, x] };
    },
    // 多角形の内角の和
    () => {
      const n = rand(5, 10);
      const ans = 180 * (n - 2);
      return { text: `${n}角形の\n内角の和は？（°）`, answer: ans, wrongs: [180 * n, 360, 180 * (n - 1), 180 * (n - 3)] };
    },
    // 確率（サイコロ2個）
    () => {
      const s = rand(4, 10);
      const ways = 6 - Math.abs(7 - s);
      const ans = frac(ways, 36);
      return {
        text: `サイコロを2個ふって、\n目の和が ${s} になる確率は？`,
        answer: ans,
        wrongs: [frac(ways + 1, 36), frac(1, 6), frac(ways, 12), frac(Math.max(ways - 1, 1), 36), '1/12', '5/36'],
      };
    },
    // y = ax² の値
    () => {
      const a = pick([-1, 1]) * rand(1, 4);
      const x = pick([-1, 1]) * rand(2, 5);
      const ans = a * x * x;
      return { text: `y = ${coef(a, 'x²')} で\nx = ${x} のとき y = ?`, answer: ans, wrongs: [-ans, a * x * 2, a * x, ans + a] };
    },
  ],
  hard: [
    // 三平方の定理
    () => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]);
      return {
        text: `直角をはさむ2辺が ${p} と ${q} の\n直角三角形。斜辺の長さは？`,
        answer: r,
        wrongs: [p + q, r + 1, r - 1, r + 2],
      };
    },
    // 展開したときの x の係数
    () => {
      const a = rand(1, 9);
      const b = pick([-1, 1]) * rand(1, 9);
      return { text: `(x + ${a})(x ${signed(b)}) を展開すると\nx の係数は？`, answer: a + b, wrongs: [a * b, a - b, a + b + 1, a + b - 1] };
    },
    // 2次方程式（因数分解）
    () => {
      const p = rand(1, 7);
      const q = rand(p + 1, 9);
      return {
        text: `x² - ${p + q}x + ${p * q} = 0\nの大きいほうの解は？`,
        answer: q,
        wrongs: [p, p + q, p * q, -q],
      };
    },
    // 円周角
    () => {
      const center = pick([60, 80, 100, 120, 140]);
      return { text: `中心角が ${center}° のとき\n同じ弧の円周角は？（°）`, answer: center / 2, wrongs: [center, center * 2, 180 - center, center / 2 + 10] };
    },
    // 中央値
    () => {
      const base = rand(3, 20);
      const nums = [0, rand(1, 3), rand(4, 6), rand(7, 9), rand(10, 14)].map((v) => base + v);
      const ans = nums[2];
      const avg = nums.reduce((t, v) => t + v, 0) / 5;
      return { text: `${shuffle(nums).join('、')} の\n中央値は？`, answer: ans, wrongs: [avg, nums[1], nums[3], nums[4] - nums[0]] };
    },
    // 相似な図形の面積
    () => {
      const k = rand(2, 4);
      const s = rand(2, 9);
      const ans = s * k * k;
      return { text: `相似比 1 : ${k} の図形。\n小さいほうの面積が ${s}cm² のとき\n大きいほうは？（cm²）`, answer: ans, wrongs: [s * k, s * k * k * k, s + k, ans + s] };
    },
    // 変化の割合（y = ax²）
    () => {
      const a = pick([-1, 1]) * rand(1, 3);
      const p = rand(1, 3);
      const q = rand(p + 1, 6);
      const ans = a * (p + q);
      return { text: `y = ${coef(a, 'x²')} で x が ${p} から ${q}\nまで増えるときの変化の割合は？`, answer: ans, wrongs: [a * (q - p), a * q * q - a * p * p, -ans, ans + a] };
    },
    // 対角線の数
    () => {
      const n = rand(5, 10);
      const ans = (n * (n - 3)) / 2;
      return { text: `${n}角形の対角線は\nぜんぶで何本？`, answer: ans, wrongs: [n * (n - 3), n - 3, ans + 1, (n * (n - 1)) / 2] };
    },
  ],
};

// =====================================================
// 高校生（数学Ⅱ・B ＋ かんたんな微分）
// =====================================================
const TRIG = [
  { deg: 30, sin: '1/2', cos: '√3/2', tan: '1/√3' },
  { deg: 45, sin: '√2/2', cos: '√2/2', tan: '1' },
  { deg: 60, sin: '√3/2', cos: '1/2', tan: '√3' },
  { deg: 90, sin: '1', cos: '0', tan: null },
  { deg: 120, sin: '√3/2', cos: '-1/2', tan: '-√3' },
  { deg: 135, sin: '√2/2', cos: '-√2/2', tan: '-1' },
  { deg: 150, sin: '1/2', cos: '-√3/2', tan: '-1/√3' },
  { deg: 180, sin: '0', cos: '-1', tan: '0' },
];
const TRIG_POOL = ['0', '1', '-1', '1/2', '-1/2', '√2/2', '-√2/2', '√3/2', '-√3/2', '√3', '-√3', '1/√3'];
const SUB = { 2: '₂', 3: '₃', 10: '₁₀' };

const high = {
  easy: [
    // 対数
    () => {
      const base = pick([2, 3, 10]);
      const n = rand(2, base === 2 ? 6 : 4);
      return { text: `log${SUB[base]} ${base ** n} = ?`, answer: n, wrongs: [n + 1, n - 1, n + 2, base * n] };
    },
    // 指数法則
    () => {
      const a = rand(2, 5);
      const b = rand(2, 4);
      return { text: `2${SUP[a]} × 2${SUP[b]} = 2ⁿ\nn = ?`, answer: a + b, wrongs: [a * b, a + b + 1, a + b - 1, b - a] };
    },
    // 三角関数（30°, 45°, 60°）
    () => {
      const row = pick(TRIG.slice(0, 3));
      const fn = pick(['sin', 'cos']);
      return { text: `${fn} ${row.deg}° = ?`, answer: row[fn], wrongs: TRIG_POOL };
    },
  ],
  normal: [
    // 組み合わせ nCr
    () => {
      const n = rand(4, 8);
      const r = rand(2, 3);
      const ans = comb(n, r);
      return { text: `${n}C${r} = ?`, answer: ans, wrongs: [n * r, ans * r, ans + n, comb(n, r - 1)] };
    },
    // 順列 nPr
    () => {
      const n = rand(4, 7);
      const ans = n * (n - 1);
      return { text: `${n}P2 = ?`, answer: ans, wrongs: [ans / 2, n * n, n * 2, ans + n] };
    },
    // 複素数
    () => {
      const a = rand(1, 6);
      const b = rand(1, 6);
      const ans = a * a + b * b;
      return { text: `(${a} + ${b}i)(${a} - ${b}i) = ?\n（i² = -1）`, answer: ans, wrongs: [a * a - b * b, ans + 2 * a * b, a + b, -ans] };
    },
    // 2点間の距離
    () => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5]]);
      const x0 = rand(-3, 3);
      const y0 = rand(-3, 3);
      return {
        text: `点 (${x0}, ${y0}) と 点 (${x0 + p}, ${y0 + q})\nの距離は？`,
        answer: r,
        wrongs: [p + q, r + 1, r - 1, p * q],
      };
    },
  ],
  normal: [
    // 三角関数（いろいろな角）
    () => {
      const row = pick(TRIG.slice(3));
      const fn = pick(row.tan === null ? ['sin', 'cos'] : ['sin', 'cos', 'tan']);
      return { text: `${fn} ${row.deg}° = ?`, answer: row[fn], wrongs: TRIG_POOL };
    },
    // 分数の指数
    () => {
      const [b, p, q, ans] = pick([[8, 2, 3, 4], [27, 2, 3, 9], [4, 3, 2, 8], [9, 3, 2, 27], [16, 3, 4, 8], [64, 1, 3, 4], [25, 3, 2, 125]]);
      return { text: `${b} の ${p}/${q} 乗 = ?`, answer: ans, wrongs: [ans * 2, ans + 1, ans - 1, b * p] };
    },
    // 等差数列
    () => {
      const a1 = rand(1, 10);
      const d = pick([-1, 1]) * rand(2, 5);
      const n = rand(5, 10);
      const an = a1 + (n - 1) * d;
      return { text: `初項 ${a1}、公差 ${d} の等差数列。\n第 ${n} 項は？`, answer: an, wrongs: [a1 + n * d, an + 1, an - d, a1 * n] };
    },
    // 導関数（そのまま）
    () => {
      const a = rand(2, 5);
      const n = rand(2, 4);
      return {
        text: `f(x) = ${term(a, n)} のとき\nf'(x) = ?`,
        answer: term(a * n, n - 1),
        wrongs: [term(a, n - 1), term(a * n, n), term(n, n - 1), term(a * n + a, n - 1), term(a * (n - 1), n - 1)],
      };
    },
    // 解と係数の関係
    () => {
      const p = pick([-1, 1]) * rand(1, 6);
      const q = pick([-1, 1]) * rand(1, 6);
      const B = -(p + q);
      const C = p * q;
      const ask = pick(['和', '積']);
      const ans = ask === '和' ? p + q : p * q;
      const cText = C >= 0 ? `+ ${C}` : `- ${-C}`;
      const bText = B === 0 ? '' : ` ${B > 0 ? '+' : '-'} ${coef(Math.abs(B))}`;
      return { text: `x²${bText} ${cText} = 0\nの2つの解の${ask}は？`, answer: ans, wrongs: [-ans, B, C, ask === '和' ? C : p + q, ans + 1] };
    },
    // 対数のひき算
    () => {
      const k = pick([3, 5, 7]);
      const m = rand(1, 4);
      return { text: `log₂ ${k * 2 ** m} - log₂ ${k} = ?`, answer: m, wrongs: [k * 2 ** m - k, 2 ** m, m + 1, m - 1, k] };
    },
    // ベクトルの内積
    () => {
      const a1 = rand(-4, 4);
      const a2 = rand(1, 4);
      const b1 = rand(1, 5);
      const b2 = rand(-4, 4);
      const ans = a1 * b1 + a2 * b2;
      return {
        text: `a = (${a1}, ${a2})、b = (${b1}, ${b2})\nのとき 内積 a・b = ?`,
        answer: ans,
        wrongs: [a1 * b2 + a2 * b1, a1 * a2 + b1 * b2, ans + 1, -ans, a1 + b1 + a2 + b2],
      };
    },
    // 点と直線の距離
    () => {
      const c = pick([-1, 1]) * rand(1, 10);
      const ans = rand(1, 5);
      // 3x0 + 4y0 + c = ±5*ans となる点をさがす
      let x0 = 0;
      let y0 = 0;
      for (let t = 0; t < 200; t++) {
        const tx = rand(-5, 5);
        const ty = rand(-5, 5);
        if (Math.abs(3 * tx + 4 * ty + c) === 5 * ans) {
          x0 = tx;
          y0 = ty;
          break;
        }
        if (t === 199) return { text: `点 (0, 0) と直線\n3x + 4y - 10 = 0 の距離は？`, answer: 2, wrongs: [10, 5, 1, 3] };
      }
      return {
        text: `点 (${x0}, ${y0}) と直線\n3x + 4y ${signed(c)} = 0 の距離は？`,
        answer: ans,
        wrongs: [5 * ans, ans + 1, Math.abs(c), ans + 2],
      };
    },
  ],
  hard: [
    // 微分係数（2次関数）
    () => {
      const a = pick([-1, 1]) * rand(1, 4);
      const b = pick([-1, 1]) * rand(1, 6);
      const k = pick([-1, 1]) * rand(1, 3);
      const ans = 2 * a * k + b;
      const bText = b >= 0 ? `+ ${coef(b)}` : `- ${coef(-b)}`;
      return { text: `f(x) = ${coef(a, 'x²')} ${bText} のとき\nf'(${k}) = ?`, answer: ans, wrongs: [a * k * k + b * k, a * k + b, ans + 1, ans - 1] };
    },
    // 微分係数（3次関数）
    () => {
      const k = pick([1, 2, -1, -2, 3]);
      const c = rand(1, 5);
      const ans = 3 * k * k - c;
      return { text: `f(x) = x³ - ${coef(c)} のとき\nf'(${k}) = ?`, answer: ans, wrongs: [k ** 3 - c * k, 3 * k - c, ans + 1, 3 * k * k + c] };
    },
    // 等比数列
    () => {
      const a1 = rand(1, 3);
      const r = pick([2, 3]);
      const n = r === 2 ? rand(4, 6) : rand(3, 4);
      const an = a1 * r ** (n - 1);
      return { text: `初項 ${a1}、公比 ${r} の等比数列。\n第 ${n} 項は？`, answer: an, wrongs: [a1 * r ** n, an / r, an + r, an * 2 + 1] };
    },
    // 和の公式
    () => {
      const n = pick([10, 12, 15, 20]);
      const s = (n * (n + 1)) / 2;
      return { text: `1 + 2 + 3 + … + ${n} = ?`, answer: s, wrongs: [(n * n) / 2, s + n, s - n, s + 1] };
    },
    // 定積分（かんたん）
    () => {
      const a = pick([1, 2, 3]);
      const ans = a * a; // ∫0→a 2x dx = a²
      return { text: `∫ 2x dx を 0 から ${a} まで\n積分すると？`, answer: ans, wrongs: [2 * a, ans + 1, a, 2 * ans] };
    },
    // 定積分（3x²）
    () => {
      const a = rand(1, 3);
      const b = rand(a + 1, 4);
      const ans = b ** 3 - a ** 3;
      return { text: `∫ 3x² dx を ${a} から ${b} まで\n積分すると？`, answer: ans, wrongs: [b ** 3, 3 * (b * b - a * a), ans + 1, b * b - a * a] };
    },
    // 等比数列の和
    () => {
      const n = rand(4, 8);
      const last = 2 ** (n - 1);
      const ans = 2 ** n - 1;
      return { text: `1 + 2 + 4 + … + ${last} = ?`, answer: ans, wrongs: [2 ** n, last * 2 + 1, ans - 1, last + n] };
    },
    // 二項定理
    () => {
      const n = rand(4, 7);
      const r = rand(2, 3);
      const ans = comb(n, r);
      return { text: `(x + 1)${SUP[n]} を展開したときの\nx${SUP[r]} の係数は？`, answer: ans, wrongs: [n * r, n, ans + 1, comb(n, r - 1) + 1] };
    },
    // 極小値
    () => {
      const a = rand(1, 3);
      const ans = -2 * a ** 3;
      return { text: `f(x) = x³ - ${3 * a * a}x の\n極小値は？`, answer: ans, wrongs: [2 * a ** 3, -(a ** 3), a, -a] };
    },
  ],
};

// 難易度の名前と問題リストの対応表
export const LEVELS = {
  elementary: { label: '小学生', sub: '四則演算・面積・体積' },
  middle: { label: '中学生', sub: '正負の数・ルート・関数・三平方' },
  high: { label: '高校生', sub: '数学Ⅱ・B ＋ 微分' },
  adult: { label: '大人', sub: '小・中・高 ぜんぶから出題' },
};

const POOLS = { elementary, middle, high };

// 難易度とランクから、使うジェネレーターの一覧を返す
function poolFor(level, tier) {
  if (level === 'adult') {
    // 大人は、小・中・高の同じランクをまぜる
    return [...elementary[tier], ...middle[tier], ...high[tier]];
  }
  return POOLS[level][tier];
}

// =====================================================
// 4択問題を1つ作る（ほかのファイルから使う入口）
// =====================================================
export function makeQuestion(level, tier = 'easy') {
  const q = pick(poolFor(level, tier))();
  const answer = String(q.answer);

  // まちがいの選択肢：正解と同じもの・重なり・小数などを取りのぞく
  const wrongs = shuffle(
    [...new Set(q.wrongs.map(String))].filter((w) => w !== answer && w !== 'NaN' && !/\.\d/.test(w))
  ).slice(0, 3);

  // 候補が3つにたりなかったら、正解に近い数でうめる
  let extra = 1;
  while (wrongs.length < 3) {
    const c = String(Number(answer) + extra);
    if (c !== 'NaN' && c !== answer && !wrongs.includes(c)) wrongs.push(c);
    else if (c === 'NaN') wrongs.push(`${answer}${'′'.repeat(wrongs.length + 1)}`); // 数でない答えの保険
    extra = extra > 0 ? -extra : -extra + 1;
  }

  const choices = shuffle([answer, ...wrongs]);
  return { text: q.text, choices, correctIndex: choices.indexOf(answer) };
}
