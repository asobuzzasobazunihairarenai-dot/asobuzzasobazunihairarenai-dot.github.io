// 0thリメイクの限定カード（志炎者7枚）の「カードの文」と「カードのデータ」を書き出す。
//
//   node tools/gen-cf-text.mjs
//
// 【文の出どころ】tools/cf-text-source.json。アーティファクト「クラファン限定7枚の効果文」で
//   ユーザーと1枚ずつ確認して固めた文を、**アーティファクトの中身をそのまま読んで**落としたもの。
//   🔴 文を直す時は、まずアーティファクト側を直してから、この json を更新する。
//
// 【なぜ card-text.ja.js に直接書かないか】あのファイルは tools/gen-card-text.mjs が
//   「カード効果　テキスト.txt」から**丸ごと上書きして作る**ので、書き足しても次に誰かが
//   あれを走らせた瞬間に**黙って消える**。だから別ファイルに分け、card-text.js で混ぜる。
//
// 【英語】いまは**カード名だけ**。効果文は空にしてあり、空のフィールドは日本語のまま出る
//   （card-text.js の「部分翻訳を許す」作り）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CF_CARDS, CF_DECK_COUNT, checkCfCards } from "./cf-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "tools/cf-text-source.json");

const 点検 = checkCfCards();
if (点検.length) {
  console.error("🔴 cf-cards.mjs の中身がおかしい:");
  for (const p of 点検) console.error("  - " + p);
  process.exit(2);
}
if (!fs.existsSync(SRC)) { console.error("🔴 文の出どころが無い: " + SRC); process.exit(2); }
const 文 = JSON.parse(fs.readFileSync(SRC, "utf8"));

// 🔴 道具の表（cf-cards.mjs）と文の表（json）が**食い違っていたら止まる**。
//   片方だけ直して気づかない、がいちばん怖い。
const 問題 = [];
if (文.length !== CF_CARDS.length) 問題.push("枚数がちがう: 道具 " + CF_CARDS.length + " / 文 " + 文.length);
for (const c of CF_CARDS) {
  const t = 文.find((x) => x.id === c.id);
  if (!t) { 問題.push("文が無い: " + c.id); continue; }
  if (t.nm !== c.name) 問題.push("名前がちがう: " + c.id + " 道具「" + c.name + "」／文「" + t.nm + "」");
  if (t.c !== c.color) 問題.push("色がちがう: " + c.id);
  if (!t.文 || !t.文.arrival || !t.文.hand) 問題.push("到達か手札の文が空: " + c.id);
}
if (問題.length) {
  console.error("🔴 道具の表と文の表が食い違っています:");
  for (const p of 問題) console.error("  - " + p);
  process.exit(2);
}

const q = (s) => JSON.stringify(String(s ?? ""));
const 頭 = (何) => [
  "// 0thリメイクの限定カード（志炎者7枚）の" + 何 + "。",
  "//",
  "// 🔴 **このファイルは生成物です。手で直さない**（次の生成で消えます）。",
  "//    直す時は tools/cf-text-source.json → node tools/gen-cf-text.mjs。",
  "//",
  "// ⚠ 旧0thにも「◯の志炎を待つ者」という**題名が同じ札**がある（公式サイトに掲載済み）。",
  "//    こちらは「◯を待つ志炎者　-△△-」。**別物なので取り違えないこと**（続き776）。",
  "// ⚠ 扱いは**拡張カード**（新しいエディションではない）。**パックではなく限定報酬**で配る。",
  "// 🔴 【志炎】は**まだ未実装**。「相手が、このカードと同色のカードの手札効果を使用した直後に限り、",
  "//    宣言できる」＝払うコストではなく**割り込みの窓**。アプリにその仕組みがまだ無い。",
  "",
].join("\n");

// ① 日本語の文
{
  const 行 = CF_CARDS.map((c) => {
    const t = 文.find((x) => x.id === c.id);
    return "  " + q(c.id) + ": { flavor: " + q(t.文.flavor) + ", titleRuby: " + q(t.文.titleRuby)
      + ", basic: " + q(t.文.basic) + ", subtitle: \"\", arrival: " + q(t.文.arrival)
      + ", hand: " + q(t.文.hand) + " },";
  });
  fs.writeFileSync(path.join(ROOT, "src/card-text-cf.ja.js"),
    頭("日本語の文") + "export const CARD_TEXT_CF_JA = {\n" + 行.join("\n") + "\n};\n");
}

// ② 英語（名前だけ）
{
  const 行 = CF_CARDS.map((c) => {
    const t = 文.find((x) => x.id === c.id);
    return "  " + q(c.id) + ": { name: " + q(t.en) + " },";
  });
  fs.writeFileSync(path.join(ROOT, "src/card-text-cf.en.js"),
    頭("英語の文（いまは名前だけ）") + "export const CARD_TEXT_CF_EN = {\n" + 行.join("\n") + "\n};\n");
}

// ③ カードのデータ
{
  const 行 = CF_CARDS.map((c) => {
    const t = 文.find((x) => x.id === c.id);
    return "  { id: " + q(c.id) + ", name: " + q(c.name) + ", color: " + q(c.color)
      + ", count: " + CF_DECK_COUNT + ", limited: true, note: " + q(t.notes.join(" ")) + " },";
  });
  fs.writeFileSync(path.join(ROOT, "src/cards-data-cf.js"), 頭("カードデータ")
    + "// ⚠ `limited: true` は「**手に入り方**が限定報酬だけ」の印。\n"
    + "//    ONLY カードの `only` とは別物（あちらは印刷カードに ONLY と刷ってある札）。\n"
    + "// 🔴 山札に入れられるのは **" + CF_DECK_COUNT + "枚**＝ふつうの拡張カードと同じ\n"
    + "//    （2026-11-21・ユーザー判断「これはONLYカードではないので通常通り７枚です」）。\n"
    + "//    ⚠ ONLY カードの「1種類1枚まで」と**取り違えないこと**。\n"
    + "// 🔴 金色に光らせるのは**貰うときだけ**。ゲーム中は光らせない（同日のユーザー判断）。\n"
    + "//\n"
    + "// 🔴 **繋ぐ所は「山札」だけではない**（続き758 の実害: 山札だけ繋いで `ALL_CARDS` に足し忘れ、\n"
    + "//    名前が id のまま出た）。いま繋いである所:\n"
    + "//      ・src/card-text.js        … 名前と効果文\n"
    + "//      ・src/cards-data.js       … ALL_CARDS（id を引く表）と MY_STACK_SETS（マイ山札の候補）\n"
    + "//      ・src/card-pack-ui.js     … コレクションに並べる顔ぶれ（getCollectionPool・持ち物として数える札）\n"
    + "//    🔴 **足していない所と、その理由**:\n"
    + "//      ・getPackPool()           … パックには入らない（限定報酬）。あれはサーバーの写しで検査が照合する\n"
    + "//      ・my-page.js の称号の数え … 足すと「全部集めた」系の称号が**到達不能になる**（分母だけ増える）\n"
    + "export const CF_NORMAL_CARDS = [\n" + 行.join("\n") + "\n];\n");
}

console.log("✅ 書き出した:");
for (const f of ["src/card-text-cf.ja.js", "src/card-text-cf.en.js", "src/cards-data-cf.js"]) {
  console.log("   " + f.padEnd(26) + CF_CARDS.length + " 種");
}
