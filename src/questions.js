// =====================================================
// questions.js … 4択問題と解説を自動で作るファイル
// =====================================================
// 問題は「ジェネレーター（問題を作る関数）」で毎回ランダムに作ります。
// ジェネレーターは次の形のデータを返します。
//   text    : 問題文
//   answer  : 正解
//   wrongs  : まちがいの選択肢の候補
//   explain : 解説（とき方）… まちがえたときに表示します
//
// 学年ごとに、さらに3つのランク（tier：段階）に分けています。
//   easy   … 弱い敵
//   normal … ふつうの敵
//   hard   … ボスと宝箱
// どの学年も、学校で習う順番（学習指導要領）にそって、暗算でとける大きさにしています。

// ----- 便利な道具（ヘルパー関数） -----
export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function pick(array) {
  return array[rand(0, array.length - 1)];
}
export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 小数の計算でできる 0.30000000000000004 のようなズレを直して文字にする
function num(x) {
  return String(Math.round(x * 1000) / 1000);
}
function near(answer, deltas = [1, -1, 2, -2, 10, -10]) {
  return deltas.map((d) => answer + d);
}
function paren(n) {
  return n < 0 ? `(${n})` : `${n}`;
}
function signed(n) {
  return n >= 0 ? `+ ${n}` : `- ${-n}`;
}
const SUP = ['', '', '²', '³', '⁴', '⁵'];
function term(c, p) {
  if (p === 0) return `${c}`;
  return `${c === 1 ? '' : c === -1 ? '-' : c}x${SUP[p]}`;
}
function coef(n, letter = 'x') {
  if (n === 1) return letter;
  if (n === -1) return `-${letter}`;
  return `${n}${letter}`;
}
function gcd(a, b) {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}
// 分数を約分して「3/4」のような文字にする（分母が1なら整数）
function frac(n, d) {
  const g = gcd(n, d);
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? `${nn}` : `${nn}/${dd}`;
}
function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
}

// =====================================================
// 小学1年生
// =====================================================
const e1 = {
  easy: [
    () => {
      const a = rand(1, 6);
      const b = rand(1, 10 - a);
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b, [1, -1, 2, -2]),
        explain: `${a}と ${b}を あわせると ${a + b}。\nゆびで かぞえても いいよ。`,
      };
    },
    () => {
      const a = rand(5, 10);
      const b = rand(1, a - 1);
      return {
        text: `${a} - ${b} = ?`, answer: a - b, wrongs: near(a - b, [1, -1, 2, -2]),
        explain: `${a}から ${b}を とると、のこりは ${a - b}。`,
      };
    },
  ],
  normal: [
    // くり上がりのたし算
    () => {
      const a = rand(6, 9);
      const b = rand(11 - a, 9);
      const need = 10 - a;
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b, [1, -1, -10, 2]),
        explain: `${a}は あと ${need}で 10。\n${b}を ${need}と ${b - need}に わけて、\n10 と ${b - need}で ${a + b}。`,
      };
    },
    // くり下がりのひき算
    () => {
      const a = rand(11, 18);
      const b = rand(a - 9, 9);
      return {
        text: `${a} - ${b} = ?`, answer: a - b, wrongs: near(a - b, [1, -1, 10, 2]),
        explain: `10から ${b}を ひくと ${10 - b}。\nのこりの ${a - 10}と あわせて ${a - b}。`,
      };
    },
  ],
  hard: [
    // 3つのかず
    () => {
      const a = rand(2, 6);
      const b = rand(2, 6);
      const c = rand(1, a + b - 1);
      return {
        text: `${a} + ${b} - ${c} = ?`, answer: a + b - c, wrongs: [a + b + c, a + b - c + 1, a + b - c - 1, a - b + c],
        explain: `まえから じゅんばんに けいさんしよう。\n${a} + ${b} = ${a + b}、${a + b} - ${c} = ${a + b - c}。`,
      };
    },
    // なん十と なんこ
    () => {
      const t = rand(2, 9);
      const o = rand(1, 9);
      return {
        text: `10が ${t}こと 1が ${o}こで\nいくつ？`, answer: t * 10 + o, wrongs: [o * 10 + t, t + o, t * 10, t * 10 + o + 10],
        explain: `10が ${t}こで ${t * 10}。\n1が ${o}こで ${o}。あわせて ${t * 10 + o}。`,
      };
    },
  ],
};

// =====================================================
// 小学2年生
// =====================================================
const e2 = {
  easy: [
    () => {
      const a = pick([2, 3, 4, 5]);
      const b = rand(2, 9);
      return {
        text: `${a} × ${b} = ?`, answer: a * b, wrongs: [a * b + a, a * b - a, a + b, a * b + 1],
        explain: `${a}の だんの 九九。\n${a} × ${b} は ${a}を ${b}回 たした かず。 ${a * b}。`,
      };
    },
    () => {
      const a = rand(2, 7) * 10 + rand(1, 4);
      const b = rand(1, 5);
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b, [1, -1, 10, -10]),
        explain: `一のくらいどうしを たす。 ${a % 10} + ${b} = ${(a % 10) + b}。\nだから ${a + b}。`,
      };
    },
  ],
  normal: [
    () => {
      const a = rand(6, 9);
      const b = rand(2, 9);
      return {
        text: `${a} × ${b} = ?`, answer: a * b, wrongs: [a * b + a, a * b - a, a * b + b, a * b - 1],
        explain: `${a}の だんの 九九。 ${a} × ${b} = ${a * b}。\nわすれたら ${a} × ${b - 1} = ${a * (b - 1)} に ${a}を たそう。`,
      };
    },
    // くり上がりのある 2けた＋2けた
    () => {
      const a = rand(15, 59);
      const b = rand(15, 39);
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b, [10, -10, 1, -1]),
        explain: `十のくらい： ${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${(Math.floor(a / 10) + Math.floor(b / 10)) * 10}\n一のくらい： ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}\nあわせて ${a + b}。`,
      };
    },
  ],
  hard: [
    () => {
      const a = rand(4, 9) * 10 + rand(0, 4);
      const b = rand(1, 3) * 10 + rand(5, 9);
      return {
        text: `${a} - ${b} = ?`, answer: a - b, wrongs: near(a - b, [10, -10, 1, 2]),
        explain: `一のくらいが ひけないので、十のくらいから 10を かりる。\n${a} - ${b} = ${a - b}。\n（${b}を ${b + (10 - (b % 10))} - ${10 - (b % 10)} と かんがえても いいよ）`,
      };
    },
    () => {
      const c = rand(2, 9);
      const m = rand(1, 9);
      return {
        text: `${c}cm ${m}mm は\nなん mm？`, answer: c * 10 + m, wrongs: [c * 100 + m, c + m, c * 10, m * 10 + c],
        explain: `1cm = 10mm。\n${c}cm = ${c * 10}mm。\n${c * 10} + ${m} = ${c * 10 + m}mm。`,
      };
    },
    () => {
      const m = pick([10, 15, 20, 30, 40, 45]);
      return {
        text: `1時間 ${m}分は\nなん分？`, answer: 60 + m, wrongs: [100 + m, m + 1, 60 + m + 10, 60 - m],
        explain: `1時間 = 60分。\n60 + ${m} = ${60 + m}分。`,
      };
    },
  ],
};

// =====================================================
// 小学3年生
// =====================================================
const e3 = {
  easy: [
    () => {
      const b = rand(2, 9);
      const ans = rand(2, 9);
      return {
        text: `${b * ans} ÷ ${b} = ?`, answer: ans, wrongs: near(ans, [1, -1, 2, b]),
        explain: `「${b} × いくつ = ${b * ans}」を 九九で さがそう。\n${b} × ${ans} = ${b * ans} だから ${ans}。`,
      };
    },
    () => {
      const a = rand(1, 5) * 100 + rand(10, 49);
      const b = rand(1, 3) * 100 + rand(10, 40);
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: near(a + b, [100, -100, 10, -10]),
        explain: `百のくらいと のこりに わけて たそう。\n${Math.floor(a / 100) * 100} + ${Math.floor(b / 100) * 100} = ${(Math.floor(a / 100) + Math.floor(b / 100)) * 100}、${a % 100} + ${b % 100} = ${(a % 100) + (b % 100)}\nあわせて ${a + b}。`,
      };
    },
  ],
  normal: [
    // あまりのあるわり算
    () => {
      const b = rand(3, 9);
      const q = rand(2, 9);
      const r = rand(1, b - 1);
      const n = b * q + r;
      const fmt = (x, y) => `${x} あまり ${y}`;
      return {
        text: `${n} ÷ ${b} = ?`, answer: fmt(q, r),
        wrongs: [fmt(q + 1, r), fmt(q, r + 1 < b ? r + 1 : r - 1), fmt(q - 1, r + b > 9 ? r : r + b), fmt(q + 1, Math.max(0, r - 1))],
        explain: `${b} × ${q} = ${b * q}。 ${n} - ${b * q} = ${r}。\nあまりは わる数 ${b}より 小さく なるよ。`,
      };
    },
    () => {
      const a = rand(12, 29);
      const b = rand(2, 5);
      return {
        text: `${a} × ${b} = ?`, answer: a * b, wrongs: [a * b + b, a * b - b, a * b + 10, a + b],
        explain: `${a}を ${Math.floor(a / 10) * 10}と ${a % 10}に わける。\n${Math.floor(a / 10) * 10} × ${b} = ${Math.floor(a / 10) * 10 * b}、${a % 10} × ${b} = ${(a % 10) * b}\nあわせて ${a * b}。`,
      };
    },
  ],
  hard: [
    () => {
      const k = rand(1, 4);
      const m = rand(1, 9) * 100;
      return {
        text: `${k}km ${m}m は\nなん m？`, answer: k * 1000 + m, wrongs: [k * 100 + m, k * 10000 + m, k + m, k * 1000 + m / 10],
        explain: `1km = 1000m。\n${k}km = ${k * 1000}m。\n${k * 1000} + ${m} = ${k * 1000 + m}m。`,
      };
    },
    () => {
      const a = rand(1, 6);
      const b = rand(1, 9 - a);
      return {
        text: `0.${a} + 0.${b} = ?`, answer: num((a + b) / 10), wrongs: [`0.${a}${b}`, num((a + b) / 100), `${a + b}`, num((a + b + 1) / 10)],
        explain: `0.1が ${a}こと 0.1が ${b}こ。\nあわせて 0.1が ${a + b}こだから ${num((a + b) / 10)}。`,
      };
    },
    () => {
      const d = pick([5, 7, 9]);
      const a = rand(1, d - 3);
      const b = rand(1, d - a - 1);
      return {
        text: `${a}/${d} + ${b}/${d} = ?`, answer: `${a + b}/${d}`, wrongs: [`${a + b}/${d * 2}`, `${a + b + 1}/${d}`, `${a * b}/${d}`, `${Math.max(1, a + b - 1)}/${d}`, `${a}/${d}`, `${b}/${d}`],
        explain: `分母（下の かず）は そのまま。\n分子（上の かず）を たす： ${a} + ${b} = ${a + b}。\nこたえは ${a + b}/${d}。`,
      };
    },
  ],
};

// =====================================================
// 小学4年生
// =====================================================
const e4 = {
  easy: [
    () => {
      const b = rand(2, 4);
      const ans = rand(11, 24);
      return {
        text: `${b * ans} ÷ ${b} = ?`, answer: ans, wrongs: near(ans, [1, -1, 10, -10]),
        explain: `${b * ans}を ${Math.floor(ans / 10) * 10 * b}と ${(ans % 10) * b}に わける。\n${Math.floor(ans / 10) * 10 * b} ÷ ${b} = ${Math.floor(ans / 10) * 10}、${(ans % 10) * b} ÷ ${b} = ${ans % 10}\nあわせて ${ans}。`,
      };
    },
    () => {
      const n = rand(12, 98);
      return {
        text: `1万を ${n}こ あつめた数は？`, answer: `${n}万`, wrongs: [`${n}千`, `${n}億`, `${n * 10}万`, `${n}00万`],
        explain: `1万が ${n}こで ${n}万（${n * 10000}）。`,
      };
    },
  ],
  normal: [
    () => {
      const w = rand(4, 12);
      const h = rand(3, 9);
      return {
        text: `たて ${h}cm、よこ ${w}cm の\n長方形の面積は？（cm²）`, answer: w * h, wrongs: [2 * (w + h), w + h, w * h + w, w * h - h],
        explain: `長方形の面積 = たて × よこ\n${h} × ${w} = ${w * h} cm²。\n（まわりの長さ ${2 * (w + h)}cm と まちがえないように）`,
      };
    },
    () => {
      const a = rand(11, 49);
      const b = rand(11, 49);
      return {
        text: `${num(a / 10)} + ${num(b / 10)} = ?`, answer: num((a + b) / 10), wrongs: [num((a + b) / 10 + 1), num((a + b) / 10 - 0.1), num((a + b) / 100), num((a + b) / 10 + 0.1)],
        explain: `小数点の いちを そろえて たす。\n${num(a / 10)} + ${num(b / 10)} = ${num((a + b) / 10)}。`,
      };
    },
  ],
  hard: [
    () => {
      const x = pick([35, 40, 50, 65, 70, 110, 120, 135, 145]);
      return {
        text: `一直線（180°）を\n${x}° と □° に わけた。\n□ = ?`, answer: 180 - x, wrongs: [360 - x, 90 - x > 0 ? 90 - x : x - 90, 180 - x + 10, x],
        explain: `一直線の 角度は 180°。\n180 - ${x} = ${180 - x}°。`,
      };
    },
    () => {
      const k = rand(3, 9);
      return {
        text: `25 × ${k} × 4 = ?`, answer: 100 * k, wrongs: [25 * k + 4, 100 * k + 25, 10 * k, 1000 * k],
        explain: `じゅんばんを かえて、25 × 4 = 100 を さきに。\n100 × ${k} = ${100 * k}。`,
      };
    },
    () => {
      const n = rand(1, 9) * 1000 + rand(1, 9) * 100 + rand(0, 99);
      const r = Math.round(n / 1000) * 1000;
      return {
        text: `${n} を 四捨五入して\n千のくらいまでの がい数に すると？`, answer: r, wrongs: [r === Math.floor(n / 1000) * 1000 ? r + 1000 : r - 1000, Math.round(n / 100) * 100, r + 100, Math.floor(n / 10) * 10],
        explain: `百のくらいの 数字 ${Math.floor(n / 100) % 10} を 見る。\n4までなら きりすて、5からは きりあげ。\nだから ${r}。`,
      };
    },
  ],
};

// =====================================================
// 小学5年生
// =====================================================
const e5 = {
  easy: [
    () => {
      const a = rand(2, 9);
      const b = rand(2, 5);
      return {
        text: `0.${a} × ${b} = ?`, answer: num((a * b) / 10), wrongs: [num((a * b) / 100), `${a * b}`, num((a * b) / 10 + 0.1), num((a * b + 1) / 10 + 1)],
        explain: `0.1が ${a}こ の ${b}ばい → 0.1が ${a * b}こ。\nだから ${num((a * b) / 10)}。`,
      };
    },
    () => {
      const k = rand(3, 9);
      const n = rand(2, 5);
      return {
        text: `${k}の倍数で、\n小さいほうから ${n}番目の数は？`, answer: k * n, wrongs: [k * (n + 1), k * (n - 1), k + n, k * n + 1],
        explain: `${k}の倍数は ${k}, ${k * 2}, ${k * 3}, … と ${k}ずつ ふえる。\n${n}番目は ${k} × ${n} = ${k * n}。`,
      };
    },
  ],
  normal: [
    () => {
      const base = rand(3, 8) * 2;
      const h = rand(3, 9);
      return {
        text: `底辺 ${base}cm、高さ ${h}cm の\n三角形の面積は？（cm²）`, answer: (base * h) / 2, wrongs: [base * h, (base * h) / 2 + h, base + h, (base * h) / 2 + 2],
        explain: `三角形の面積 = 底辺 × 高さ ÷ 2\n${base} × ${h} ÷ 2 = ${(base * h) / 2} cm²。\n（÷2 を わすれないように！）`,
      };
    },
    () => {
      const avg = rand(5, 12);
      const d = rand(1, 4);
      const nums = [avg - d, avg, avg + d];
      return {
        text: `${nums.join('、')} の\n平均は？`, answer: avg, wrongs: [avg + 1, avg - 1, avg * 3, avg + d],
        explain: `平均 = ぜんぶの合計 ÷ こすう\n(${nums.join(' + ')}) ÷ 3 = ${avg * 3} ÷ 3 = ${avg}。`,
      };
    },
    () => {
      const g = rand(2, 6);
      const a = g * pick([2, 3]);
      const b = g * pick([5, 7]);
      return {
        text: `${a} と ${b} の\n最大公約数は？`, answer: g, wrongs: [g * 2, a, 1, g + 1],
        explain: `${a}の約数と ${b}の約数で、\nどちらにも ある いちばん大きい数は ${g}。`,
      };
    },
  ],
  hard: [
    () => {
      const a = rand(2, 5);
      const b = rand(3, 5);
      const c = rand(2, 6);
      return {
        text: `たて ${a}cm、よこ ${b}cm、高さ ${c}cm の\n直方体の体積は？（cm³）`, answer: a * b * c, wrongs: [a * b + c, a * b * c + a * b, (a + b + c) * 2, a * b * c - b],
        explain: `直方体の体積 = たて × よこ × 高さ\n${a} × ${b} × ${c} = ${a * b * c} cm³。`,
      };
    },
    () => {
      const whole = pick([200, 300, 400, 500, 600, 800]);
      const pct = pick([10, 20, 25, 50]);
      const ans = (whole * pct) / 100;
      return {
        text: `${whole}円 の ${pct}% は何円？`, answer: ans, wrongs: [ans * 2, ans / 2, whole - ans, ans + 10],
        explain: `${pct}% = ${num(pct / 100)}（もとの数の ${num(pct / 100)}ばい）\n${whole} × ${num(pct / 100)} = ${ans}円。`,
      };
    },
    () => {
      const [a, b] = pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5]]);
      const n = a + b;
      const d = a * b;
      return {
        text: `1/${a} + 1/${b} = ?`, answer: frac(n, d), wrongs: [`2/${a + b}`, `1/${d}`, `2/${d}`, frac(n + 1, d)],
        explain: `分母を ${d}に そろえる（通分）。\n1/${a} = ${b}/${d}、1/${b} = ${a}/${d}\n${b}/${d} + ${a}/${d} = ${frac(n, d)}。`,
      };
    },
  ],
};

// =====================================================
// 小学6年生
// =====================================================
const e6 = {
  easy: [
    () => {
      const d = pick([5, 7, 9, 11]);
      const a = rand(1, 3);
      const k = rand(2, 3);
      return {
        text: `${a}/${d} × ${k} = ?`, answer: frac(a * k, d), wrongs: [frac(a * k, d * k), frac(a, d * k), `${a * k}/${d * k + 1}`, frac(a + k, d)],
        explain: `分数 × 整数 は、分子に かける。\n${a} × ${k} = ${a * k} だから ${frac(a * k, d)}。`,
      };
    },
    () => {
      const a = rand(1, 5);
      const b = rand(2, 7);
      const k = rand(2, 5);
      return {
        text: `${a} : ${b} = ${a * k} : □\n□ = ?`, answer: b * k, wrongs: [b + k, b * k + 1, a * k, b * (k + 1)],
        explain: `${a} → ${a * k} は ${k}ばい。\nだから ${b}も ${k}ばいして ${b * k}。`,
      };
    },
  ],
  normal: [
    () => {
      const v = pick([4, 5, 40, 50, 60, 80]);
      const t = rand(2, 4);
      const unit = '時速';
      return {
        text: `${unit} ${v}km で ${t}時間 すすむと\nなん km？`, answer: v * t, wrongs: [v + t, v * (t + 1), v * t + 10, v * (t - 1)],
        explain: `道のり = 速さ × 時間\n${v} × ${t} = ${v * t} km。`,
      };
    },
    () => {
      const d = pick([3, 5, 7]);
      const a = rand(2, d - 1);
      return {
        text: `${a}/${d} ÷ 1/${d} = ?`, answer: a, wrongs: [frac(a, d * d), a + 1, frac(1, a), d],
        explain: `わる数を ひっくりかえして かける。\n${a}/${d} × ${d}/1 = ${a}。`,
      };
    },
    () => {
      const dist = pick([120, 150, 180, 240]);
      const t = pick([2, 3]);
      return {
        text: `${dist}km を ${t}時間 で すすんだ。\n速さは 時速 なん km？`, answer: dist / t, wrongs: [dist * t, dist / t + 10, dist - t, dist / t - 10],
        explain: `速さ = 道のり ÷ 時間\n${dist} ÷ ${t} = ${dist / t}。時速 ${dist / t}km。`,
      };
    },
  ],
  hard: [
    () => {
      const r = rand(1, 4);
      const ans = num(r * r * 3.14);
      return {
        text: `半径 ${r}cm の 円の面積は？\n（円周率は 3.14）`, answer: ans, wrongs: [num(r * 2 * 3.14), num(r * 3.14), num((r + 1) * (r + 1) * 3.14), num(r * r * 3)],
        explain: `円の面積 = 半径 × 半径 × 3.14\n${r} × ${r} × 3.14 = ${ans} cm²。`,
      };
    },
    () => {
      const n = rand(3, 4);
      return {
        text: `${n}人が 1列に ならぶ\nならびかたは なんとおり？`, answer: fact(n), wrongs: [n * n, n * (n - 1), fact(n) + n, 2 * n],
        explain: `1番目は ${n}とおり、2番目は ${n - 1}とおり…\n${[...Array(n)].map((_, i) => n - i).join(' × ')} = ${fact(n)}とおり。`,
      };
    },
    () => {
      const a = rand(2, 6);
      const x = rand(3, 9);
      return {
        text: `y は x に 比例し、\nx = 1 のとき y = ${a}。\nx = ${x} のとき y = ?`, answer: a * x, wrongs: [a + x, a * x + a, x, a * (x - 1)],
        explain: `比例の式は y = ${a} × x。\nx = ${x} を 入れて ${a} × ${x} = ${a * x}。`,
      };
    },
  ],
};

// =====================================================
// 中学1年生
// =====================================================
const m1 = {
  easy: [
    () => {
      const a = -rand(2, 15);
      const b = rand(2, 15);
      return {
        text: `${a} + ${b} = ?`, answer: a + b, wrongs: [-(a + b), a - b, a + b + 1, a + b - 1],
        explain: `符号がちがう数のたし算は、\n絶対値の大きいほうから小さいほうをひいて、大きいほうの符号をつける。\n答えは ${a + b}。`,
      };
    },
    () => {
      const a = -rand(2, 9);
      const b = pick([-1, 1]) * rand(2, 9);
      return {
        text: `${a} × ${paren(b)} = ?`, answer: a * b, wrongs: [-(a * b), a * b + 1, a * b - 1, a + b],
        explain: `（−）×（−）＝（＋）、（−）×（＋）＝（−）。\n${-a} × ${Math.abs(b)} = ${Math.abs(a * b)} に符号をつけて ${a * b}。`,
      };
    },
  ],
  normal: [
    () => {
      const a = rand(2, 9);
      const x = pick([-1, 1]) * rand(1, 9);
      const b = pick([-1, 1]) * rand(1, 15);
      return {
        text: `${a}x ${signed(b)} = ${a * x + b}\nx = ?`, answer: x, wrongs: [-x, x + 1, x - 1, x + 2],
        explain: `${b >= 0 ? b : `−${-b}`} を右へ移項： ${a}x = ${a * x + b} ${b >= 0 ? '−' : '+'} ${Math.abs(b)} = ${a * x}\n両辺を ${a} でわって x = ${x}。`,
      };
    },
    () => {
      const a = pick([-1, 1]) * rand(2, 5);
      const b = pick([-1, 1]) * rand(1, 9);
      const x = pick([-1, 1]) * rand(1, 4);
      const v = a * x + b;
      return {
        text: `x = ${x} のとき\n${a}x ${signed(b)} の値は？`, answer: v, wrongs: [v + 1, -v, a * x - b, a + x + b],
        explain: `x に ${paren(x)} を代入する。\n${a} × ${paren(x)} ${signed(b)} = ${a * x} ${signed(b)} = ${v}。`,
      };
    },
  ],
  hard: [
    () => {
      const a = pick([-3, -2, 2, 3, 4]);
      const x = rand(2, 5);
      return {
        text: `y は x に比例し、\nx = ${x} のとき y = ${a * x}。\n比例定数は？`, answer: a, wrongs: [-a, a * x, x, a + 1],
        explain: `比例の式 y = ax に代入： ${a * x} = a × ${x}\na = ${a * x} ÷ ${x} = ${a}。`,
      };
    },
    () => {
      const k = pick([12, 18, 24, 36]);
      const x = pick([2, 3, 4, 6].filter((v) => k % v === 0));
      return {
        text: `y = ${k}/x で\nx = ${x} のとき y = ?`, answer: k / x, wrongs: [k * x, k - x, k / x + 1, x],
        explain: `反比例の式に代入する。\ny = ${k} ÷ ${x} = ${k / x}。`,
      };
    },
    () => {
      const x = rand(2, 9);
      const a = rand(2, 4);
      const k = rand(1, 9);
      return {
        text: `${a}(x + ${k}) = ${a * (x + k)}\nx = ?`, answer: x, wrongs: [x + k, a * (x + k) - k, x - 1, x + 1],
        explain: `両辺を ${a} でわる： x + ${k} = ${x + k}\nx = ${x + k} − ${k} = ${x}。`,
      };
    },
  ],
};

// =====================================================
// 中学2年生
// =====================================================
const m2 = {
  easy: [
    () => {
      const a = rand(2, 6);
      const b = rand(2, 6);
      const c = rand(1, 4);
      const ans = a * b - c;
      return {
        text: `${a}(${b}x + 1) − ${c}x を計算すると\nx の係数は？`, answer: ans, wrongs: [a * b + c, b - c, a + b - c, ans + a],
        explain: `分配法則： ${a}(${b}x + 1) = ${a * b}x + ${a}\n${a * b}x − ${c}x = ${ans}x。係数は ${ans}。`,
      };
    },
    () => {
      const a = rand(2, 5);
      const b = rand(2, 5);
      return {
        text: `${a}x × ${b}y = ?`, answer: `${a * b}xy`, wrongs: [`${a + b}xy`, `${a * b}x`, `${a * b}y`, `${a}${b}xy`],
        explain: `数どうし・文字どうしをかける。\n${a} × ${b} = ${a * b}、x × y = xy で ${a * b}xy。`,
      };
    },
  ],
  normal: [
    () => {
      const x = rand(2, 9);
      const y = rand(1, x - 1);
      return {
        text: `x + y = ${x + y}\nx − y = ${x - y}\nx = ?`, answer: x, wrongs: [y, x + 1, x - 1, x + y],
        explain: `2つの式をたすと y が消える（加減法）。\n2x = ${2 * x} → x = ${x}。`,
      };
    },
    () => {
      const a = pick([-3, -2, 2, 3]);
      const x1 = rand(0, 2);
      const x2 = x1 + rand(1, 3);
      const b = rand(-3, 3);
      const y1 = a * x1 + b;
      const y2 = a * x2 + b;
      return {
        text: `2点 (${x1}, ${y1}) と (${x2}, ${y2}) を通る\n直線の傾きは？`, answer: a, wrongs: [-a, y2 - y1, x2 - x1, a + 1],
        explain: `傾き = y の増加量 ÷ x の増加量\n(${y2} − ${paren(y1)}) ÷ (${x2} − ${x1}) = ${y2 - y1} ÷ ${x2 - x1} = ${a}。`,
      };
    },
  ],
  hard: [
    () => {
      const n = rand(5, 8);
      return {
        text: `${n}角形の 内角の和は？（°）`, answer: 180 * (n - 2), wrongs: [180 * n, 360, 180 * (n - 1), 180 * (n - 3)],
        explain: `n角形は (n − 2) 個の三角形にわけられる。\n180 × (${n} − 2) = ${180 * (n - 2)}°。`,
      };
    },
    () => {
      const [text, ans, exp, wr] = pick([
        ['サイコロを1回ふって\n偶数が出る確率は？', '1/2', '偶数は 2, 4, 6 の 3通り。\n3/6 = 1/2。', ['1/3', '1/6', '2/3']],
        ['サイコロを1回ふって\n3の倍数が出る確率は？', '1/3', '3の倍数は 3, 6 の 2通り。\n2/6 = 1/3。', ['1/2', '1/6', '2/3']],
        ['サイコロを2回ふって\n目の和が7になる確率は？', '1/6', '全部で 6 × 6 = 36通り。\n和が7は (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) の6通り。\n6/36 = 1/6。', ['1/12', '7/36', '1/36']],
        ['コインを2回投げて\n2回とも表が出る確率は？', '1/4', '全部で 表表・表裏・裏表・裏裏 の4通り。\n2回とも表は1通りで 1/4。', ['1/2', '1/3', '3/4']],
      ]);
      return { text, answer: ans, wrongs: wr, explain: exp };
    },
  ],
};

// =====================================================
// 中学3年生
// =====================================================
const m3 = {
  easy: [
    () => {
      const n = rand(4, 15);
      return {
        text: `√${n * n} = ?`, answer: n, wrongs: near(n, [1, -1, 2, n]),
        explain: `${n} × ${n} = ${n * n} だから √${n * n} = ${n}。`,
      };
    },
    () => {
      const a = rand(1, 9);
      const b = pick([-1, 1]) * rand(1, 9);
      return {
        text: `(x + ${a})(x ${signed(b)}) を展開すると\nx の係数は？`, answer: a + b, wrongs: [a * b, a - b, a + b + 1, a + b - 1],
        explain: `(x + a)(x + b) = x² + (a + b)x + ab\nx の係数は ${a} + ${paren(b)} = ${a + b}。`,
      };
    },
  ],
  normal: [
    () => {
      const k = rand(2, 5);
      const m = pick([2, 3, 5]);
      const other = pick([2, 3, 5].filter((v) => v !== m));
      return {
        text: `√${k * k * m} を簡単にすると？`, answer: `${k}√${m}`, wrongs: [`${m}√${k}`, `${k + 1}√${m}`, `${k}√${other}`, `${k * m}√${m}`],
        explain: `${k * k * m} = ${k}² × ${m}\n√(${k}² × ${m}) = ${k}√${m}。`,
      };
    },
    () => {
      const p = rand(1, 7);
      const q = rand(p + 1, 9);
      return {
        text: `x² − ${p + q}x + ${p * q} = 0\nの大きいほうの解は？`, answer: q, wrongs: [p, p + q, p * q, -q],
        explain: `たして ${p + q}、かけて ${p * q} になる2数は ${p} と ${q}。\n(x − ${p})(x − ${q}) = 0 → x = ${p}, ${q}。`,
      };
    },
  ],
  hard: [
    () => {
      const [p, q, r] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]);
      return {
        text: `直角をはさむ2辺が ${p} と ${q} の\n直角三角形。斜辺の長さは？`, answer: r, wrongs: [p + q, r + 1, r - 1, r + 2],
        explain: `三平方の定理： a² + b² = c²\n${p}² + ${q}² = ${p * p} + ${q * q} = ${r * r} = ${r}²\n斜辺は ${r}。`,
      };
    },
    () => {
      const center = pick([60, 80, 100, 120, 140]);
      return {
        text: `中心角が ${center}° のとき\n同じ弧の円周角は？（°）`, answer: center / 2, wrongs: [center, center * 2, 180 - center, center / 2 + 10],
        explain: `円周角は 中心角の半分。\n${center} ÷ 2 = ${center / 2}°。`,
      };
    },
    () => {
      const a = pick([2, 3, -2]);
      const x = pick([-3, -2, 2, 3]);
      return {
        text: `y = ${a}x² で\nx = ${x} のとき y = ?`, answer: a * x * x, wrongs: [a * x, a * x * 2, -a * x * x, a * x * x + 1],
        explain: `x² = ${paren(x)}² = ${x * x}（マイナスも2乗するとプラス）\ny = ${a} × ${x * x} = ${a * x * x}。`,
      };
    },
  ],
};

// =====================================================
// 高校1年生（数学Ⅰ・A）
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
const TRIG_HINT = {
  30: '30°・60°・90° の三角形（辺の比 1 : √3 : 2）を思い出そう。',
  45: '45°・45°・90° の三角形（辺の比 1 : 1 : √2）を思い出そう。',
  60: '30°・60°・90° の三角形（辺の比 1 : √3 : 2）を思い出そう。',
  90: '単位円で 90° の点は (0, 1)。cos は x座標、sin は y座標。',
  120: '単位円で 120° の点は (−1/2, √3/2)。',
  135: '単位円で 135° の点は (−√2/2, √2/2)。',
  150: '単位円で 150° の点は (−√3/2, 1/2)。',
  180: '単位円で 180° の点は (−1, 0)。',
};
function trigQuestion(rows) {
  const row = pick(rows);
  const fn = pick(row.tan === null ? ['sin', 'cos'] : ['sin', 'cos', 'tan']);
  return {
    text: `${fn} ${row.deg}° = ?`, answer: row[fn], wrongs: TRIG_POOL,
    explain: `${TRIG_HINT[row.deg]}\n${fn} ${row.deg}° = ${row[fn]}。`,
  };
}

const h1 = {
  easy: [
    () => {
      const a = rand(2, 9);
      return {
        text: `(x + ${a})² を展開すると\n定数項は？`, answer: a * a, wrongs: [2 * a, a, a * a + 1, 2 * a * a],
        explain: `(x + a)² = x² + 2ax + a²\n定数項は ${a}² = ${a * a}。`,
      };
    },
    () => {
      const a = rand(2, 5);
      const x = rand(1, 6);
      const b = rand(1, 9);
      return {
        text: `${a}x + ${b} < ${a * x + b}\nを解くと？`, answer: `x < ${x}`, wrongs: [`x > ${x}`, `x < ${x + 1}`, `x < ${a * x}`, `x > ${x - 1}`],
        explain: `${b} を移項： ${a}x < ${a * x}\n正の数 ${a} でわるので向きはそのまま。 x < ${x}。`,
      };
    },
  ],
  normal: [
    () => trigQuestion(TRIG.slice(0, 3)),
    () => {
      const p = pick([-3, -2, -1, 1, 2, 3]);
      const q = pick([-4, -1, 2, 5]);
      const b = -2 * p;
      const c = p * p + q;
      return {
        text: `y = x² ${signed(b)}x ${signed(c)}\nの頂点の x座標は？`, answer: p, wrongs: [-p, q, b, p + 1],
        explain: `平方完成： y = (x ${signed(-p)})² ${signed(q)}\n頂点は (${p}, ${q})。x座標は ${p}。`,
      };
    },
  ],
  hard: [
    () => {
      const n = rand(4, 6);
      const r = 2;
      const ans = fact(n) / fact(n - r) / fact(r);
      return {
        text: `${n}人から ${r}人を選ぶ\n選び方は何通り？（${n}C${r}）`, answer: ans, wrongs: [n * (n - 1), n * r, ans + 1, fact(n)],
        explain: `${n}C${r} = (${n} × ${n - 1}) ÷ (2 × 1) = ${ans}通り。\n順番を考えないので 2! でわる。`,
      };
    },
    () => {
      const n = rand(4, 6);
      const ans = n * (n - 1) * (n - 2);
      return {
        text: `${n}人から 3人を選んで\n1列に並べる方法は？（${n}P3）`, answer: ans, wrongs: [ans / 6, n * 3, ans + n, n * n * n],
        explain: `${n}P3 = ${n} × ${n - 1} × ${n - 2} = ${ans}通り。`,
      };
    },
    () => {
      const g = rand(3, 9);
      const a = g * pick([2, 4]);
      const b = g * pick([3, 5]);
      return {
        text: `${a} と ${b} の\n最大公約数は？`, answer: g, wrongs: [g * 2, a * b / g, 1, g + 1],
        explain: `${a} = ${g} × ${a / g}、${b} = ${g} × ${b / g}\n共通の約数でいちばん大きいのは ${g}。`,
      };
    },
  ],
};

// =====================================================
// 高校2年生（数学Ⅱ・B ＋ かんたんな微分・積分）
// =====================================================
const SUB = { 2: '₂', 3: '₃', 10: '₁₀' };
const h2 = {
  easy: [
    () => {
      const base = pick([2, 3, 10]);
      const n = rand(2, base === 2 ? 6 : 4);
      return {
        text: `log${SUB[base]} ${base ** n} = ?`, answer: n, wrongs: [n + 1, n - 1, n + 2, base * n],
        explain: `${base ** n} = ${base}${SUP[n] || '^' + n} だから\nlog${SUB[base]} ${base ** n} = ${n}。`,
      };
    },
    () => {
      const a = rand(2, 5);
      const b = rand(2, 4);
      return {
        text: `2${SUP[a]} × 2${SUP[b]} = 2ⁿ\nn = ?`, answer: a + b, wrongs: [a * b, a + b + 1, a + b - 1, Math.abs(b - a) || 7],
        explain: `指数法則： aᵐ × aⁿ = aᵐ⁺ⁿ\n${a} + ${b} = ${a + b}。`,
      };
    },
  ],
  normal: [
    () => trigQuestion(TRIG.slice(3)),
    () => {
      const [b, p, q, ans] = pick([[8, 2, 3, 4], [27, 2, 3, 9], [4, 3, 2, 8], [9, 3, 2, 27], [16, 3, 4, 8], [64, 1, 3, 4], [25, 3, 2, 125]]);
      const root = Math.round(b ** (1 / q));
      return {
        text: `${b} の ${p}/${q} 乗 = ?`, answer: ans, wrongs: [ans * 2, ans + 1, ans - 1, b * p],
        explain: `${b} = ${root}${SUP[q]} だから\n${b}^(${p}/${q}) = ${root}^${p} = ${ans}。`,
      };
    },
    () => {
      const a1 = rand(1, 10);
      const d = pick([-1, 1]) * rand(2, 5);
      const n = rand(5, 10);
      const an = a1 + (n - 1) * d;
      return {
        text: `初項 ${a1}、公差 ${d} の等差数列。\n第 ${n} 項は？`, answer: an, wrongs: [a1 + n * d, an + 1, an - d, a1 * n],
        explain: `aₙ = a₁ + (n − 1)d\n${a1} + (${n} − 1) × ${paren(d)} = ${an}。`,
      };
    },
    () => {
      const a = rand(2, 5);
      const n = rand(2, 4);
      return {
        text: `f(x) = ${term(a, n)} のとき\nf'(x) = ?`, answer: term(a * n, n - 1),
        wrongs: [term(a, n - 1), term(a * n, n), term(n, n - 1), term(a * n + a, n - 1)],
        explain: `(xⁿ)' = n·xⁿ⁻¹\n${a} × ${n} = ${a * n} で、次数は1つ下がる → ${term(a * n, n - 1)}。`,
      };
    },
  ],
  hard: [
    () => {
      const a = pick([-1, 1]) * rand(1, 4);
      const b = pick([-1, 1]) * rand(1, 6);
      const k = pick([-1, 1]) * rand(1, 3);
      const ans = 2 * a * k + b;
      const bText = b >= 0 ? `+ ${coef(b)}` : `- ${coef(-b)}`;
      return {
        text: `f(x) = ${coef(a, 'x²')} ${bText} のとき\nf'(${k}) = ?`, answer: ans, wrongs: [a * k * k + b * k, a * k + b, ans + 1, ans - 1],
        explain: `f'(x) = ${2 * a}x ${signed(b)}\nx = ${k} を代入： ${2 * a} × ${paren(k)} ${signed(b)} = ${ans}。`,
      };
    },
    () => {
      const k = pick([1, 2, -1, -2, 3]);
      const c = rand(1, 5);
      const ans = 3 * k * k - c;
      return {
        text: `f(x) = x³ − ${coef(c)} のとき\nf'(${k}) = ?`, answer: ans, wrongs: [k ** 3 - c * k, 3 * k - c, ans + 1, 3 * k * k + c],
        explain: `f'(x) = 3x² − ${c}\nx = ${k} を代入： 3 × ${k * k} − ${c} = ${ans}。`,
      };
    },
    () => {
      const a1 = rand(1, 3);
      const r = pick([2, 3]);
      const n = r === 2 ? rand(4, 6) : rand(3, 4);
      const an = a1 * r ** (n - 1);
      return {
        text: `初項 ${a1}、公比 ${r} の等比数列。\n第 ${n} 項は？`, answer: an, wrongs: [a1 * r ** n, an / r, an + r, an * 2 + 1],
        explain: `aₙ = a₁ × rⁿ⁻¹\n${a1} × ${r}${SUP[n - 1] || '^' + (n - 1)} = ${an}。`,
      };
    },
    () => {
      const n = pick([10, 12, 15, 20]);
      const s = (n * (n + 1)) / 2;
      return {
        text: `1 + 2 + 3 + … + ${n} = ?`, answer: s, wrongs: [(n * n) / 2, s + n, s - n, s + 1],
        explain: `和の公式： n(n + 1)/2\n${n} × ${n + 1} ÷ 2 = ${s}。`,
      };
    },
    () => {
      const a = pick([1, 2, 3]);
      return {
        text: `∫ 2x dx を 0 から ${a} まで\n積分すると？`, answer: a * a, wrongs: [2 * a, a * a + 1, a, 2 * a * a],
        explain: `2x の原始関数は x²。\n[x²] を 0 から ${a} まで → ${a}² − 0² = ${a * a}。`,
      };
    },
  ],
};

// =====================================================
// 学年の一覧（タイトル画面のボタンになる）
// =====================================================
// time … 制限時間を何倍にするか（低学年は文字を読む時間を長めに）
export const SCHOOLS = [
  {
    key: 'elementary', label: '小学生', grades: [
      { key: 'e1', label: '小学1年', sub: 'たし算・ひき算', pool: e1, time: 1.6 },
      { key: 'e2', label: '小学2年', sub: '九九・2けたの計算・長さ', pool: e2, time: 1.4 },
      { key: 'e3', label: '小学3年', sub: 'わり算・小数・分数', pool: e3, time: 1.25 },
      { key: 'e4', label: '小学4年', sub: '面積・角度・がい数', pool: e4, time: 1.15 },
      { key: 'e5', label: '小学5年', sub: '三角形・体積・割合', pool: e5, time: 1.1 },
      { key: 'e6', label: '小学6年', sub: '比・速さ・円の面積', pool: e6, time: 1.1 },
    ],
  },
  {
    key: 'middle', label: '中学生', grades: [
      { key: 'm1', label: '中学1年', sub: '正負の数・方程式・比例', pool: m1, time: 1 },
      { key: 'm2', label: '中学2年', sub: '連立方程式・1次関数・確率', pool: m2, time: 1 },
      { key: 'm3', label: '中学3年', sub: '平方根・2次方程式・三平方', pool: m3, time: 1 },
    ],
  },
  {
    key: 'high', label: '高校生', grades: [
      { key: 'h1', label: '高校1年', sub: '数学Ⅰ・A', pool: h1, time: 1 },
      { key: 'h2', label: '高校2年', sub: '数学Ⅱ・B ＋ 微分', pool: h2, time: 1 },
    ],
  },
  {
    key: 'adult', label: '大人', grades: [{ key: 'adult', label: '大人', sub: '小1〜高2 ぜんぶから出題', pool: null, time: 1 }],
  },
];

// key（'e3' など）から学年の情報を探せる表
export const LEVELS = {};
for (const s of SCHOOLS) for (const g of s.grades) LEVELS[g.key] = { ...g, school: s.label };

const ALL = [e1, e2, e3, e4, e5, e6, m1, m2, m3, h1, h2];
function poolFor(level, tier) {
  if (level === 'adult') {
    // 大人は、小3〜高2 の同じランクをまぜる（小1・小2 はかんたんすぎるので外す）
    return ALL.slice(2).flatMap((p) => p[tier]);
  }
  return LEVELS[level].pool[tier];
}

// =====================================================
// 4択問題を1つ作る（ほかのファイルから使う入口）
// =====================================================
export function makeQuestion(level, tier = 'easy') {
  const q = pick(poolFor(level, tier))();
  const answer = String(q.answer);

  // まちがいの選択肢：正解と同じもの・重なり・マイナスの長さなどおかしなものを取りのぞく
  const wrongs = shuffle(
    [...new Set(q.wrongs.map(String))].filter(
      (w) => w !== answer && !['NaN', 'undefined', 'Infinity'].includes(w) && !/\.\d{4,}/.test(w)
    )
  ).slice(0, 3);

  // 候補が3つにたりなかったら、正解に近い数でうめる
  let extra = 1;
  while (wrongs.length < 3) {
    const c = num(Number(answer) + extra);
    if (c !== 'NaN' && c !== answer && !wrongs.includes(c)) wrongs.push(c);
    extra = extra > 0 ? -extra : -extra + 1;
    if (extra > 20) break;
  }

  const choices = shuffle([answer, ...wrongs]);
  return { text: q.text, choices, correctIndex: choices.indexOf(answer), answer, explain: q.explain };
}
