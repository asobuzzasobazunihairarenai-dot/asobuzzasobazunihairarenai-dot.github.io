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
const QUOTE = String.fromCharCode(34); // 二重引用符1文字（正規表現を使わずに id を切り出すため）
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
const firstEdIds = (() => {
  try {
    return [...read("src/cards-data-1st.js").matchAll(/\{\s*id:\s*"((?:1st|eternal-1st|first-1st)-[a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
// 1st EDITION のEカードは山札に入らないので cards-data-1st.js に居ない。文の方から拾う。
const firstEdTextIds = (() => {
  try {
    return [...read("src/card-text-1st.ja.js").matchAll(/^ {2}"((?:1st|eternal-1st|first-1st)-[a-z0-9-]+)":/gm)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
const known = new Set([...cards.map((c) => c.id), ...ex0Ids, ...firstEdIds, ...firstEdTextIds]);
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
function 表を読む(本文, 始まりの目印, 接頭辞) {
  const i = 本文.indexOf(始まりの目印);
  if (i < 0) return null;
  const 塊 = 本文.slice(i, 本文.indexOf("];", i));
  const 表 = new Map();
  for (const 行 of 塊.split("\n")) {
    const a = 行.indexOf('id: "' + 接頭辞);
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
    const 写し = 表を読む(edge, "const EX0_NORMAL_CARDS", "ex0-");
    const 正 = 表を読む(ex0Src, "export const EX0_NORMAL_CARDS", "ex0-");
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

// --- 6. 1st EDITION ---------------------------------------------------------------
// 🔴 0th拡張とまったく同じ見方（絵は blank と illust の2種・文は専用ファイル・assets/cards は作らない）。
//   ⚠ **効果データとテストはまだ0件**。1st EDITION のコストは【財力】という別の仕組みで、
//     いまは文を出すだけ（処理はプレイヤーの自己申告＝CLAUDE.md の段階目標どおり）。
//     無い数をそのまま出して、進み具合が毎回見えるようにする。
//   ⚠ Fカード7種は「別途相談」なので、そもそも src に書き出していない（表にだけ在る）。
const firstEdSrc = (() => {
  try {
    return read("src/cards-data-1st.js");
  } catch (e) {
    return null;
  }
})();
let firstEdLine = "";
if (firstEdSrc) {
  // ⚠ ここは**山札に入る通常カード19種だけ**（id が 1st- で始まるもの）。E/Fカードは別に下で見る。
  const fe = [...firstEdSrc.matchAll(/\{\s*id:\s*"(1st-[a-z0-9-]+)"\s*,\s*name:\s*"([^"]*)"/g)].map((m) => ({ id: m[1], name: m[2] }));
  if (fe.length < 15) {
    console.error(`❌ 検査そのものが怪しい: cards-data-1st.js から ${fe.length} 種しか読めなかった`);
    process.exit(2);
  }
  const jaFe = new Set([...read("src/card-text-1st.ja.js").matchAll(/^ {2}"((?:1st|eternal-1st|first-1st)-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  const enFe = new Set([...read("src/card-text-1st.en.js").matchAll(/^ {2}"((?:1st|eternal-1st|first-1st)-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  let 効果あり = 0;
  let テストあり = 0;
  for (const c of fe) {
    if (!jaFe.has(c.id)) note(`1st EDITION: 日本語の文が無い: ${c.id}（${c.name}）→ node tools/gen-1st-text.mjs`);
    if (!enFe.has(c.id)) note(`1st EDITION: 英語の文が無い: ${c.id}（${c.name}）→ node tools/gen-1st-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${c.id}.webp`))) note(`1st EDITION: 絵が無い: ${dir}/${c.id}.webp → node tools/make-1st-art.mjs`);
    }
    if (effectIds.has(c.id)) 効果あり++;
    if (casesSrc.includes(`"${c.id}"`)) テストあり++;
  }
  // Eカード7種は山札に入らない（別の山）ので cards-data-1st.js には居ない。絵と文だけ確かめる。
  const eternal1st = [...jaFe].filter((id) => id.startsWith("eternal-1st-"));
  let E効果あり = 0;
  for (const id of eternal1st) {
    if (!enFe.has(id)) note(`1st EDITION: 英語の文が無い: ${id} → node tools/gen-1st-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${id}.webp`))) note(`1st EDITION: 絵が無い: ${dir}/${id}.webp → node tools/make-1st-art.mjs`);
    }
    if (effectIds.has(id)) E効果あり++;
  }
  if (eternal1st.length !== 7) note(`1st EDITION: Eカードが7種でない: ${eternal1st.length} 種`);
  // 🔴 Fカード7種は**ジュエル版の文字無しの絵**（tools/make-jewel-first.mjs）。文字はアプリが描くので、
  //   assets/cards-blank/ と assets/cards-illust/ を持つ（文字入りの assets/cards は持たない）。
  //   cards-data.js の hasBakedCardFace がこの前提で分岐しているので、ここで見張る。
  const first1st = [...jaFe].filter((id) => id.startsWith("first-1st-"));
  if (first1st.length !== 7) note(`1st EDITION: Fカードが7種でない: ${first1st.length} 種`);
  for (const id of first1st) {
    if (!enFe.has(id)) note(`1st EDITION: 英語の文が無い: ${id} → node tools/gen-1st-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${id}.webp`))) note(`1st EDITION: Fカードの絵が無い: ${dir}/${id}.webp → node tools/make-jewel-first.mjs`);
    }
    if (fs.existsSync(path.join(ROOT, "assets/cards", `${id}.webp`)))
      note(`1st EDITION: Fカードは文字をアプリが描くので assets/cards を持たないはず: ${id}`);
  }
  firstEdLine =
    `ⓘ 1st EDITION ${fe.length} 種（＋Eカード ${eternal1st.length} 種・Fカード ${first1st.length} 種）: 文(日英)と絵は上で検査済み。` +
    `効果データ 通常 ${効果あり}/${fe.length}・E ${E効果あり}/${eternal1st.length}、テスト ${テストあり}/${fe.length}` +
    `（Fカードはジュエル版の絵。ファーストの山はエディションごとに切り替わる）`;

  // サーバー側の写しとのズレ（0th拡張と同じ理由。手でコピペしてデプロイする運用なので見張る）
  let edge2 = null;
  try {
    edge2 = read("supabase/functions/so7-apply-action.ts");
  } catch (e) {
    edge2 = null;
  }
  if (edge2) {
    const 写し = 表を読む(edge2, "const FIRST_ED_NORMAL_CARDS", "1st-");
    const 正 = 表を読む(firstEdSrc, "export const FIRST_ED_NORMAL_CARDS", "1st-");
    if (!写し || !正 || 写し.size < 15 || 正.size < 15) {
      console.error("❌ 検査そのものが怪しい: 1st EDITION の表が 正" + (正 ? 正.size : "読めず") + " / 写し" + (写し ? 写し.size : "読めず") + " しか取れなかった");
      process.exit(2);
    }
    for (const [id, v] of 正) {
      if (!写し.has(id)) note("1st EDITION: サーバー側の写しに無い: " + id + " → supabase/functions/so7-apply-action.ts の FIRST_ED_NORMAL_CARDS");
      else if (写し.get(id) !== v) note("1st EDITION: 色か枚数がサーバー側とズレている: " + id + "（正 " + v + " / 写し " + 写し.get(id) + "）");
    }
    for (const id of 写し.keys()) if (!正.has(id)) note("1st EDITION: サーバー側にだけ在る: " + id + "（消し忘れ？）");

    // 🔴 Eカードの山も同じ理由で見張る（1st を選んだ時だけこちらになる）。
    //   ズレると「CPU戦では1stのEカードなのに、オンラインではリメイクのEカード」になる。
    const 札 = (本文, 目印) => {
      const i = 本文.indexOf(目印);
      if (i < 0) return null;
      const j = 本文.indexOf("]", i);
      if (j < 0) return null;
      return 本文
        .slice(i, j)
        .split("eternal-1st-")
        .slice(1)
        .map((x) => "eternal-1st-" + x.split(QUOTE)[0]);
    };
    const E写し = 札(edge2, "const FIRST_ED_ETERNAL_CARD_IDS");
    const E正 = 札(firstEdSrc, "export const FIRST_ED_ETERNAL_CARDS");
    if (!E写し || !E正 || E写し.length !== 7 || E正.length !== 7) {
      console.error(
        "❌ 検査そのものが怪しい: 1st EDITION のEカードの表が 正" +
          (E正 ? E正.length : "読めず") + " / 写し" + (E写し ? E写し.length : "読めず") + " しか取れなかった"
      );
      process.exit(2);
    }
    if (E写し.join(",") !== E正.join(",")) {
      note("1st EDITION: Eカードの山がサーバー側とズレている（正 " + E正.join(",") + " / 写し " + E写し.join(",") + "）");
    }

    // 🔴 Fカード（◯のジュエル）の山も同じ理由で見張る（続き669 でエディションごとに配る形にした）。
    //   ズレると「CPU戦では1stのファーストなのに、オンラインではリメイクのファースト」になる。
    const 札F = (本文, 目印F) => {
      const i = 本文.indexOf(目印F);
      if (i < 0) return null;
      const j = 本文.indexOf("];", i);
      if (j < 0) return null;
      return 本文
        .slice(i, j)
        .split("first-1st-")
        .slice(1)
        .map((x) => "first-1st-" + x.split(QUOTE)[0]);
    };
    const F写し = 札F(edge2, "const FIRST_ED_FIRST_CARDS");
    const F正 = 札F(firstEdSrc, "export const FIRST_ED_FIRST_CARDS");
    if (!F写し || !F正 || F写し.length !== 7 || F正.length !== 7) {
      console.error(
        "❌ 検査そのものが怪しい: 1st EDITION のFカードの表が 正" +
          (F正 ? F正.length : "読めず") + " / 写し" + (F写し ? F写し.length : "読めず") + " しか取れなかった"
      );
      process.exit(2);
    }
    if (F写し.join(",") !== F正.join(",")) {
      note("1st EDITION: Fカードの山がサーバー側とズレている（正 " + F正.join(",") + " / 写し " + F写し.join(",") + "）");
    }
  }
}

if (problems.length === 0) {
  const checked = cards.filter((c) => !c.blank).length;
  console.log(`✅ 問題なし（カード ${checked} 種・効果/日本語/英語/絵2種/テスト を確認。ブーストの白紙カード ${cards.length - checked} 種は対象外）`);
  if (ex0Line) console.log("   " + ex0Line);
  if (firstEdLine) console.log("   " + firstEdLine);
  process.exit(0);
}
console.log(`❌ ${problems.length} 件`);
for (const p of problems) console.log("  - " + p);
process.exit(1);
