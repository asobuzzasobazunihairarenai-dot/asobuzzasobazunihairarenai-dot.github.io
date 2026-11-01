// カードの「持ち物検査」。カードを1枚足した時に、**足りないものを一覧で教える**ための道具。
//
//   node tools/check-cards.mjs
//
// 【なぜ要るか】2026-10-16 時点で、カードは34種そろっていて効果データ・日英の文・画像・
// テストも 34/34 欠けが無い。**ただしそれは人が気をつけているからで、仕組みは何も見ていない。**
// 足し忘れても誰も何も言わず、どこかで初めて落ちるか、黙って動かないだけになる。
//
// 【読み方の方針】src を import せずに**本文を読んで**調べる（check-undeclared.mjs と同じ）。
// カードのデータは DOM や他のモジュールに繋がっているので、import すると Node では動かない。
// 🔴 **探し方が空振りすると「0件＝合格」になってしまう**ので、まず「それらしい数が取れたか」を
// 確かめ、取れていなければ検査そのものを失敗にする（黙って合格しない）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const problems = [];
const note = (m) => problems.push(m);

// --- 1. カードの一覧（これが正） -------------------------------------------------
const cardsSrc = read("src/cards-data.js");
const cards = [...cardsSrc.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"\s*,\s*name:\s*"([^"]*)"/g)].map((m) => ({
  id: m[1],
  name: m[2],
}));
// ブーストモードの「効果なしファーストカード」（BOOST_BLANK_FIRST_CARDS）は、cards-data.js の中で
// **7色ぶん自動で作られる**特別枠。効果を持たず、絵も実物ではなくその場で描くSVGなので、
// 効果データ・webp・テストは**在る方がおかしい**。一覧には載せるが、それらの検査からは外す。
const BLANK_COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];
if (/BOOST_BLANK_FIRST_CARDS/.test(cardsSrc)) {
  for (const color of BLANK_COLORS) cards.push({ id: `first-blank-${color}`, name: `${color} のブーストカード`, blank: true });
}
if (cards.length < 20) {
  console.error(`❌ 検査そのものが怪しい: cards-data.js から ${cards.length} 種しか読めなかった（探し方が合っていない可能性）`);
  process.exit(2);
}

// --- 2. それぞれが持っていてほしいもの -------------------------------------------
const effectsSrc = read("src/card-effects.js");
const effectIds = new Set([...effectsSrc.matchAll(/^ {2}"([a-z0-9-]+)":/gm)].map((m) => m[1]));
const jaSrc = read("src/card-text.ja.js");
const jaIds = new Set([...jaSrc.matchAll(/^ {2}"([a-z0-9-]+)":/gm)].map((m) => m[1]));
const enSrc = read("src/card-text.en.js");
const enIds = new Set([...enSrc.matchAll(/^ {2}"([a-z0-9-]+)":/gm)].map((m) => m[1]));
const casesSrc = read("test/effect-cases.mjs");

for (const check of [
  ["効果データ(card-effects.js)", effectIds],
  ["日本語の文(card-text.ja.js)", jaIds],
  ["英語の文(card-text.en.js)", enIds],
]) {
  if (check[1].size < 20) {
    console.error(`❌ 検査そのものが怪しい: ${check[0]} から ${check[1].size} 件しか読めなかった`);
    process.exit(2);
  }
}

for (const c of cards) {
  if (c.blank) continue; // ブーストの白紙カード（上の説明参照）
  if (!effectIds.has(c.id)) note(`効果データが無い: ${c.id}（${c.name}）→ src/card-effects.js`);
  if (!jaIds.has(c.id)) note(`日本語の文が無い: ${c.id}（${c.name}）→ カード効果　テキスト.txt に書いて node tools/gen-card-text.mjs`);
  if (!enIds.has(c.id)) note(`英語の文が無い: ${c.id}（${c.name}）→ src/card-text.en.js（こちらは手書き）`);
  for (const dir of ["assets/cards", "assets/cards-illust"]) {
    if (!fs.existsSync(path.join(ROOT, dir, `${c.id}.webp`))) note(`絵が無い: ${dir}/${c.id}.webp`);
  }
  // テストは「そのカードIDが1度でも出てくるか」だけを見る（中身の良し悪しまでは見ない）。
  if (!casesSrc.includes(`"${c.id}"`)) note(`テストが1件も無い: ${c.id}（${c.name}）→ test/effect-cases.mjs`);
}

// --- 3. 逆向き（カード一覧に無いのにデータだけ在る＝消し忘れ） ----------------------
// ⚠ 0th拡張のカードは cards-data-ex0.js の方に居るので、ここでも一覧に入れる。
//   入れ忘れると「効果データだけ在る＝消し忘れ？」という**嘘の指摘**が出る（実際に出た）。
const ex0Ids = (() => {
  try {
    return [...read("src/cards-data-ex0.js").matchAll(/\{\s*id:\s*"(ex0-[a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
const known = new Set([...cards.map((c) => c.id), ...ex0Ids]);
for (const [label, ids] of [["効果データ", effectIds], ["日本語の文", jaIds], ["英語の文", enIds]]) {
  for (const id of ids) {
    if (!known.has(id)) note(`カード一覧に無いのに ${label} だけ在る: ${id}（消し忘れ？）`);
  }
}

// --- 4. 0th拡張（0th EDITION 拡張）--------------------------------------------------
// 🔴 **リメイクとは要るものが違う**ので別に見る。
//   ・絵は assets/cards-blank（文字なし）と assets/cards-illust の2種。
//     **assets/cards（文字入り）は作らない**——0th拡張は文字をアプリが描くので、焼き込んだ絵を
//     持つと効果文を直すたびに絵の作り直しになる。
//   ・文は card-text-ex0.ja.js / .en.js（card-text.ja.js は生成物なのでそこには置けない）。
//   ・効果データとテストは**これから**。無い数をそのまま出して、進み具合が毎回見えるようにする。
const ex0Src = (() => {
  try {
    return read("src/cards-data-ex0.js");
  } catch (e) {
    return null;
  }
})();
let ex0Line = "";
if (ex0Src) {
  const ex0 = [...ex0Src.matchAll(/\{\s*id:\s*"(ex0-[a-z0-9-]+)"\s*,\s*name:\s*"([^"]*)"/g)].map((m) => ({ id: m[1], name: m[2] }));
  if (ex0.length < 20) {
    console.error(`❌ 検査そのものが怪しい: cards-data-ex0.js から ${ex0.length} 種しか読めなかった`);
    process.exit(2);
  }
  const jaEx0 = new Set([...read("src/card-text-ex0.ja.js").matchAll(/^ {2}"(ex0-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  const enEx0 = new Set([...read("src/card-text-ex0.en.js").matchAll(/^ {2}"(ex0-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  let 効果あり = 0;
  let テストあり = 0;
  for (const c of ex0) {
    if (!jaEx0.has(c.id)) note(`0th拡張: 日本語の文が無い: ${c.id}（${c.name}）→ node tools/gen-ex0-text.mjs`);
    if (!enEx0.has(c.id)) note(`0th拡張: 英語の文が無い: ${c.id}（${c.name}）→ node tools/gen-ex0-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${c.id}.webp`))) note(`0th拡張: 絵が無い: ${dir}/${c.id}.webp → node tools/make-ex0-art.mjs`);
    }
    if (effectIds.has(c.id)) 効果あり++;
    if (casesSrc.includes(`"${c.id}"`)) テストあり++;
  }
  ex0Line =
    `ⓘ 0th拡張 ${ex0.length} 種: 文(日英)と絵2種は上で検査済み。` +
    `効果データ ${効果あり}/${ex0.length}・テスト ${テストあり}/${ex0.length}` +
    (効果あり === ex0.length && テストあり === ex0.length ? "（そろった）" : "（**これから**）");
}

// --- 5. 0th拡張の表が、サーバー側の写しとズレていないか -------------------------
// 🔴 **オンラインの山札を組むのはサーバー（supabase/functions/so7-apply-action.ts）**なので、
//   あちらは src/cards-data-ex0.js と同じ内容の**写し**を持っている。ズレると
//   「CPU戦では0th拡張なのに、フレンドリーマッチだと枚数が違う」という分かりにくい形で出る。
//   ⚠ サーバーの方は**手でコピペしてデプロイする運用**なので、機械で見張る価値が高い。
// ⓘ 正規表現を使わずに読む（この環境では置換スクリプトの \ が食われて空振りしたことがある）。
function 表を読む(本文, 始まりの目印) {
  const i = 本文.indexOf(始まりの目印);
  if (i < 0) return null;
  const 塊 = 本文.slice(i, 本文.indexOf("];", i));
  const 表 = new Map();
  for (const 行 of 塊.split("\n")) {
    const a = 行.indexOf('id: "ex0-');
    if (a < 0) continue;
    const id = 行.slice(a + 5).split('"')[0];
    const c = 行.indexOf('color: "');
    const n = 行.indexOf("count: ");
    if (c < 0 || n < 0) continue;
    const color = 行.slice(c + 8).split('"')[0];
    const count = parseInt(行.slice(n + 7), 10);
    if (!id || !color || !Number.isFinite(count)) continue;
    表.set(id, color + ":" + count);
  }
  return 表;
}
if (ex0Src) {
  let edge = null;
  try {
    edge = read("supabase/functions/so7-apply-action.ts");
  } catch (e) {
    edge = null; // Edge Function が無い環境（切り出し後など）では見ない
  }
  if (edge) {
    const 写し = 表を読む(edge, "const EX0_NORMAL_CARDS");
    const 正 = 表を読む(ex0Src, "export const EX0_NORMAL_CARDS");
    if (!写し || !正 || 写し.size < 20 || 正.size < 20) {
      console.error("❌ 検査そのものが怪しい: 0th拡張の表が 正" + (正 ? 正.size : "読めず") + " / 写し" + (写し ? 写し.size : "読めず") + " しか取れなかった");
      process.exit(2);
    }
    for (const [id, v] of 正) {
      if (!写し.has(id)) note("0th拡張: サーバー側の写しに無い: " + id + " → supabase/functions/so7-apply-action.ts の EX0_NORMAL_CARDS");
      else if (写し.get(id) !== v) note("0th拡張: 色か枚数がサーバー側とズレている: " + id + "（正 " + v + " / 写し " + 写し.get(id) + "）");
    }
    for (const id of 写し.keys()) if (!正.has(id)) note("0th拡張: サーバー側にだけ在る: " + id + "（消し忘れ？）");
  }
}

if (problems.length === 0) {
  const checked = cards.filter((c) => !c.blank).length;
  console.log(`✅ 問題なし（カード ${checked} 種・効果/日本語/英語/絵2種/テスト を確認。ブーストの白紙カード ${cards.length - checked} 種は対象外）`);
  if (ex0Line) console.log("   " + ex0Line);
  process.exit(0);
}
console.log(`❌ ${problems.length} 件`);
for (const p of problems) console.log("  - " + p);
process.exit(1);
