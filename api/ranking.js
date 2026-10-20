// =====================================================
// api/ranking.js … Vercel で動く「ランキングの受付係」（サーバー側のプログラム）
// =====================================================
// Vercel に公開すると、/api/ranking というアドレスで自動的に動きます。
// 記録は Upstash Redis（アップスタッシュ・レディス：無料で使えるデータベース）に保存します。
// Vercel の画面で Upstash をつなぐと、下の2つの「環境変数（かんきょうへんすう：秘密の設定）」が
// 自動で入ります。入っていないときは 503（準備中）を返し、ゲームはブラウザ保存に切りかえます。

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LEVELS = ['elementary', 'middle', 'high', 'adult'];
const NG_WORDS = ['しね', '死ね', '殺', 'ころす', 'fuck', 'shit', 'bitch', 'sex', 'ちんこ', 'まんこ', 'ちんぽ', 'kill'];

// データベースに命令を送る
async function redis(...command) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error('redis error');
  return (await res.json()).result;
}

export default async function handler(req, res) {
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'ranking database is not set up' });

  try {
    if (req.method === 'GET') {
      const level = String(req.query.level);
      if (!LEVELS.includes(level)) return res.status(400).json({ error: 'bad level' });
      // タイムが小さい順に10人
      const raw = await redis('ZRANGE', `ranking:${level}`, 0, 9, 'WITHSCORES');
      const list = [];
      for (let i = 0; i < raw.length; i += 2) {
        const entry = JSON.parse(raw[i]);
        list.push({ name: entry.name, time: Number(raw[i + 1]) });
      }
      return res.status(200).json({ list });
    }

    if (req.method === 'POST') {
      const { level, name, time } = req.body || {};
      const n = String(name || '').trim();
      // ズル（ありえない記録）や悪いことばをふせぐチェック
      if (!LEVELS.includes(level)) return res.status(400).json({ error: 'bad level' });
      if (n.length === 0 || [...n].length > 8) return res.status(400).json({ error: 'bad name' });
      if (NG_WORDS.some((w) => n.toLowerCase().includes(w))) return res.status(400).json({ error: 'ng word' });
      if (typeof time !== 'number' || time < 30000 || time > 3600000) return res.status(400).json({ error: 'bad time' });

      const member = JSON.stringify({ name: n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      await redis('ZADD', `ranking:${level}`, Math.round(time), member);
      await redis('ZREMRANGEBYRANK', `ranking:${level}`, 100, -1); // 上位100件だけ残す
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(500).json({ error: 'server error' });
  }
}
