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
const SUP = ['', '', '²', '³', '⁴', '⁵'];
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
