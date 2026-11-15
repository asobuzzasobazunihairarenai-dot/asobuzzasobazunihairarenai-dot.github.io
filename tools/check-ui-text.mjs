// 画面の文言（src/ui-text.js）を機械で見る。
//
// 【なぜ要るか・続き728 の実害】
// 文言の塊を差し替えた時、**古い鍵が後ろに取り残されて「同じ鍵が2回」**になった。
// JS のオブジェクトは**後に書いた方が勝つ**ので、画面には**古い文言**が出る
// ——しかもエラーは1つも出ない。さらに直そうとして ja/en の並び順を取り違え、
// **英語の方を消して古い日本語を残した**。どちらも「読めば分かる」種類ではなく、
// **数えないと分からない**種類の間違いだった。
//
// 【見かた】
//   ① ja と en の鍵の集合が同じか（片方だけに在る鍵＝その言語で文言が出ない）
//   ② 同じ鍵が2回書かれていないか（後の値が勝つ＝前の値は死んでいる）
//   ③ 差し込み（{name} 等）の名前が ja と en でそろっているか
//      （ずれていると、その言語だけ「{n}」が生のまま画面に出る）
//
// ⚠ 取り出しに失敗したら**終了コード2**で止める（空振りを合格にしない）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const P = "src/ui-text.js";
const lines = fs.readFileSync(path.join(ROOT, P), "utf8").split(/\r?\n/);

const enAt = lines.findIndex((l) => l.startsWith("  en: {"));
const jaAt = lines.findIndex((l) => l.startsWith("  ja: {"));
if (jaAt < 0 || enAt < 0 || enAt < jaAt) {
  console.error("🔴 " + P + " の ja: { / en: { が見つからない＝取り出しに失敗している");
  process.exit(2);
}

// 鍵の行だけを拾う（インデント4つ＝言語の直下）。
function 拾う(a, b) {
  const out = [];
  for (let i = a; i < b; i++) {
    const m = lines[i].match(/^\s{4}"((?:[^"\\]|\\.)+)"\s*:\s*(.*)$/);
    if (m) out.push({ key: m[1], val: m[2], line: i + 1 });
  }
  return out;
}
const ja = 拾う(jaAt, enAt);
const en = 拾う(enAt, lines.length);

if (ja.length < 1000 || en.length < 1000) {
  console.error("🔴 鍵が少なすぎる（ja " + ja.length + " / en " + en.length + "）＝取り出しに失敗している");
  process.exit(2);
}

let 失敗 = 0;
const 落ちる = (m) => {
  console.error("🔴 " + m);
  失敗++;
};

// ── ② 同じ鍵が2回 ─────────────────────────────────────────────────────────
function 重複(rows, 側) {
  const 見た = new Map();
  for (const r of rows) {
    if (見た.has(r.key)) {
      const 前 = 見た.get(r.key);
      落ちる(
        側 + " の `" + r.key + "` が2回書かれている（" + P + ":" + 前.line + " と :" + r.line +
          "）。**後に書いた方が勝つ**ので、前の値は画面に出ない" +
          (前.val === r.val ? "（値は同じなので見た目は変わらないが、直しても効かない所になる）" : "（値が違う＝前の行を直しても何も変わらない）")
      );
    }
    見た.set(r.key, r);
  }
}
重複(ja, "ja");
重複(en, "en");

// ── ① 片方だけに在る鍵 ─────────────────────────────────────────────────────
const sj = new Set(ja.map((r) => r.key));
const se = new Set(en.map((r) => r.key));
for (const k of sj) if (!se.has(k)) 落ちる("`" + k + "` が ja にしか無い（英語にすると文言が出ない）");
for (const k of se) if (!sj.has(k)) 落ちる("`" + k + "` が en にしか無い（日本語で文言が出ない）");

// ── ③ 差し込みの名前がそろっているか ───────────────────────────────────────
// ⚠ 文言の中の {name} 等。片方だけに在ると、その言語で「{n}」が生のまま出る。
const 差し込み = (s) => new Set([...String(s).matchAll(/\{([A-Za-z_][\w]*)\}/g)].map((m) => m[1]));
const enMap = new Map(en.map((r) => [r.key, r]));
for (const r of ja) {
  const e = enMap.get(r.key);
  if (!e) continue;
  const a = 差し込み(r.val);
  const b = 差し込み(e.val);
  const 足りない = [...a].filter((x) => !b.has(x));
  const 余り = [...b].filter((x) => !a.has(x));
  if (足りない.length || 余り.length) {
    落ちる(
      "`" + r.key + "` の差し込みが ja/en でずれている（ja にだけ: " +
        (足りない.join(", ") || "なし") + " / en にだけ: " + (余り.join(", ") || "なし") +
        "）。足りない側では、その値が文に入らない"
    );
  }
}

console.log("文言: ja " + ja.length + " / en " + en.length + " 件");
if (失敗 > 0) {
  console.error("🔴 " + 失敗 + " 件");
  process.exit(1);
}
console.log("✅ 問題なし（ja/en の鍵がそろい・同じ鍵の二重書きなし・差し込みも一致）");
