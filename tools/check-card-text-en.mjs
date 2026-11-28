// 🔴【続き898】**日本語に効果文があるカードは、英語にもあること。**
//
// 【なぜ要るか】card-text.js は「英語の欄が空なら日本語で出す」作りなので、
// 英語を書き忘れても**何も壊れない**——ただ英語で遊ぶ人の画面に**日本語が出るだけ**。
// 誰も気づかないまま残り、実際に **0th拡張33種・旧0th19種・1st 33種・志炎者7種**が
// 名前だけの状態で公開されていた（報告 #880 で初めて分かった）。
// ⇒ **セットを足した日に分かる**ようにする。
//
// 【決まり】日本語に arrival / hand / basic のどれかがあるなら、英語にも同じ欄があること。
// ⚠ ブーストの白紙カードは**日本語も空**なので対象外（自動で外れる＝名簿を持たない）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 🔴 セットを足したらここにも足す（ja と en の対）。
const 組 = [
  ["リメイク", "src/card-text.ja.js", "CARD_TEXT_JA", "src/card-text.en.js", "CARD_TEXT_EN"],
  ["0th拡張", "src/card-text-ex0.ja.js", "CARD_TEXT_EX0_JA", "src/card-text-ex0.en.js", "CARD_TEXT_EX0_EN"],
  ["1st", "src/card-text-1st.ja.js", "CARD_TEXT_1ST_JA", "src/card-text-1st.en.js", "CARD_TEXT_1ST_EN"],
  ["旧0th", "src/card-text-0th.ja.js", "CARD_TEXT_OLD0TH_JA", "src/card-text-0th.en.js", "CARD_TEXT_OLD0TH_EN"],
  ["志炎者", "src/card-text-cf.ja.js", "CARD_TEXT_CF_JA", "src/card-text-cf.en.js", "CARD_TEXT_CF_EN"],
];

const 問題 = [];
let 見た = 0, 空でよい = 0;
const 行 = [];

for (const [名, jaP, jaK, enP, enK] of 組) {
  for (const p of [jaP, enP]) {
    if (!fs.existsSync(path.join(ROOT, p))) { 問題.push(名 + ": " + p + " が無い"); }
  }
  const ja = (await import("file://" + path.join(ROOT, jaP).replace(/\\/g, "/")))[jaK];
  const en = (await import("file://" + path.join(ROOT, enP).replace(/\\/g, "/")))[enK];
  if (!ja || !en) { 問題.push(名 + ": 中身を読めない（export の名前が違う？）"); continue; }
  let 足りない = 0, 対象 = 0;
  for (const [id, t] of Object.entries(ja)) {
    const 中身がある = ["arrival", "hand", "basic"].some((k) => (t[k] || "").trim().length > 0);
    if (!中身がある) { 空でよい++; continue; } // 白紙カード等（英語も空でよい）
    対象++; 見た++;
    const e = en[id];
    if (!e) { 問題.push(名 + ": 英語に無い札 " + id); 足りない++; continue; }
    for (const k of ["arrival", "hand", "basic"]) {
      if ((t[k] || "").trim().length > 0 && !(e[k] || "").trim().length) {
        問題.push(名 + ": " + id + " の " + k + " が英語で空（英語で遊ぶ人には日本語のまま出る）");
        足りない++;
      }
    }
  }
  行.push("   " + 名.padEnd(8) + " " + (対象 - 足りない) + " / " + 対象 + (足りない ? "  🔴 " + 足りない + " 件" : ""));
}

// 0しか出ない検査にしない（母数が崩れたら分かる）
if (見た < 100) 問題.push("見た札が " + 見た + " 枚しかない（数え方が壊れている）");

if (問題.length) {
  console.error("❌ カード文の英語に問題 " + 問題.length + " 件");
  for (const p of 問題.slice(0, 20)) console.error("  🔴 " + p);
  if (問題.length > 20) console.error("  … ほか " + (問題.length - 20) + " 件");
  console.error("  ⇒ 英語の出どころ（tools/*-text-en.json）に足して、生成ツールを走らせ直してください。");
  process.exitCode = 1;
} else {
  console.log("✅ 問題なし（日本語に効果文がある " + 見た + " 枚は英語もそろっている。白紙など " + 空でよい + " 枚は対象外）");
  for (const l of 行) console.log(l);
}
