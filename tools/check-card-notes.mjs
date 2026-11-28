// カードの「補足」に、開発用の記法を出さない検査。
//
// 【なぜ要るか】補足は**そのまま画面に出る**（図鑑・カードの詳細・拡大カードの虫眼鏡から）。
//   ところが補足の文は人が手で書く／生成ツールが拾うので、**開発メモがそのまま混ざる**。
//   実害が2回:
//     ・続き895（#879）… 志炎者7枚の補足が `t.notes.join(" ")` ＝**作業メモ全部**で、
//       🔴 や ** が並び、**こちらの手元のフォルダの道まで全員の画面に出ていた**。
//     ・続き904 ……… 新カード3枚の補足に `**…**`・🔴・「ユーザー判断 2026-11-28」が
//       そのまま出ていた（撮って初めて分かった）。
//   ⇒ 3回目を機械で止める。
//
// 【何を見るか】**マークダウンの強調（`**`）・開発の印（🔴 ⓘ）・開発の言葉**だけ。
//   ⚠ `⚠` は**落とさない**——「印刷されたカードから効果を変えています」の断りで
//     house style として使っている（実測10枚）。ここを咎めると、正しい文が落ちる。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 補足が入っている所は2つ: カードの表（cards-data-*.js の note）と、
// 文の表（card-text-*.ja.js の note。生成ツールが作る分はこちら）。
const カードの表 = ["cards-data.js", "cards-data-ex0.js", "cards-data-1st.js", "cards-data-0th.js", "cards-data-cf.js", "cards-data-new.js"];
const 文の表 = ["card-text.ja.js", "card-text-ex0.ja.js", "card-text-1st.ja.js", "card-text-0th.ja.js", "card-text-cf.ja.js", "card-text-new.ja.js"];

const 禁じ手 = [
  ["**", "マークダウンの強調（画面ではそのまま ** と出る）"],
  ["🔴", "開発の印"],
  ["ⓘ", "開発の印"],
  ["ユーザー判断", "開発の経緯（いつ誰が決めたかはプレイヤーに関係ない）"],
  ["続き", "開発の回番号"],
  ["J:/", "手元のフォルダの道"],
  ["J:\\", "手元のフォルダの道"],
];

const 束 = [];
for (const f of カードの表) {
  const p = path.join(根, "src", f);
  if (!fs.existsSync(p)) continue;
  const m = await import(pathToFileURL(p).href);
  for (const v of Object.values(m)) if (Array.isArray(v)) for (const c of v) if (c?.id && c.note) 束.push({ 元: f, id: c.id, 文: String(c.note) });
}
for (const f of 文の表) {
  const p = path.join(根, "src", f);
  if (!fs.existsSync(p)) continue;
  const m = await import(pathToFileURL(p).href);
  for (const v of Object.values(m)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    for (const [id, c] of Object.entries(v)) if (c?.note) 束.push({ 元: f, id, 文: String(c.note) });
  }
}

console.log("── カードの補足（開発用の記法が混ざっていないか）──");
// 🔴 母数を必ず出す（数え方が壊れたら分かる＝0しか出ない検査にしない）。
console.log("  ⓘ 補足のある札: " + 束.length + " 件");
if (束.length < 100) {
  console.error("🔴 補足の数え方が怪しい（" + 束.length + " 件）。読む所が変わっていないか。");
  process.exit(2);
}

const 問題 = [];
for (const { 元, id, 文 } of 束) {
  for (const [印, 理由] of 禁じ手) {
    if (文.includes(印)) 問題.push("  🔴 " + 元 + " の " + id + " の補足に « " + 印 + " » が在る（" + 理由 + "）");
  }
}

// ⚠ は house style（印刷から変えた断り）なので落とさない。数だけ出す。
const 断り = 束.filter((x) => x.文.includes("⚠")).length;
console.log("  ⓘ 「⚠」で始まる断りを持つ札: " + 断り + " 件（これは house style なので落とさない）");

if (問題.length > 0) {
  console.error("❌ カードの補足に問題 " + 問題.length + " 件");
  for (const x of 問題) console.error(x);
  console.error("  ⇒ 補足は**そのまま画面に出る**。開発の事情は JS のコメントへ移す。");
  process.exit(1);
}
console.log("✅ 問題なし（" + 束.length + " 件の補足に、開発用の記法は1つも無い）");
