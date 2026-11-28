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
// 旧0th・志炎者（0thリメイクの限定カード）も同じ理由で一覧に入れる（続き781）。
const old0thIdsForKnown = (() => {
  try {
    return [...read("src/cards-data-0th.js").matchAll(/\{\s*id:\s*"(0th-[a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
const cfIdsForKnown = (() => {
  try {
    return [...read("src/cards-data-cf.js").matchAll(/\{\s*id:\s*"(cf-[a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
const newIdsForKnown = (() => {
  try {
    return [...read("src/cards-data-new.js").matchAll(/\{\s*\n?\s*id:\s*"(new-[a-z0-9-]+)"/g)].map((m) => m[1]);
  } catch (e) {
    return [];
  }
})();
const known = new Set([
  ...cards.map((c) => c.id),
  ...ex0Ids,
  ...firstEdIds,
  ...firstEdTextIds,
  ...old0thIdsForKnown,
  ...newIdsForKnown, // 🔴【続き882】新しい無色カード3枚
  ...cfIdsForKnown,
]);
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
  // 🔴【#517 の回・続き670】Fカードの効果データとテストも数える。ここを数えていなかったので
  //   「1st は全部実装済み」と読めてしまい、**Fカード7種の手札効果だけ抜けている**ことに
  //   ユーザーの指摘まで気づけなかった（Eカードと同じ扱いにして、抜けたら数字で見えるようにする）。
  let F効果あり = 0;
  let Fテストあり = 0;
  for (const id of first1st) {
    if (effectIds.has(id)) F効果あり++;
    if (casesSrc.includes(`"${id}"`)) Fテストあり++;
  }
  for (const id of first1st) {
    if (!enFe.has(id)) note(`1st EDITION: 英語の文が無い: ${id} → node tools/gen-1st-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${id}.webp`))) note(`1st EDITION: Fカードの絵が無い: ${dir}/${id}.webp → node tools/make-jewel-first.mjs`);
    }
    if (fs.existsSync(path.join(ROOT, "assets/cards", `${id}.webp`)))
      note(`1st EDITION: Fカードは文字をアプリが描くので assets/cards を持たないはず: ${id}`);
  }
  // 🔴 1st EDITION のファーストカードを持っている席は、駒が宝石になる
  //   （src/piece-skins.js の seatUsesJewelPiece）。絵が無いと **駒が丸ごと見えなくなる**
  //   （404。0th拡張で同じ形の穴を踏んでいる＝続き652）。7色そろっているかを毎回見る。
  // 🔴【続き677】WebGL描画がONの時は、その駒を**宝石の立体**で描く
  //   （src/jewel-piece-shape.js）。色がそこに無いと立体が作れず、**駒が1つだけ消える**
  //   （立方体の板も作らない作りなので、代わりに描かれるものが無い）。色の表も毎回見る。
  const 宝石色 = fs.readFileSync(path.join(ROOT, "src/jewel-piece-shape.js"), "utf8");
  const 宝石色の表 = 宝石色.slice(宝石色.indexOf("JEWEL_BODY_RGB = {"));
  for (const id of first1st) {
    const 色 = id.replace("first-1st-", "");
    const rel = `assets/pieces/${色}-jewel.webp`;
    if (!fs.existsSync(path.join(ROOT, rel))) note(`1st EDITION: 宝石の駒の絵が無い: ${rel} → node tools/make-jewel-pieces.mjs`);
    if (!宝石色の表.includes(`${色}:`)) note(`1st EDITION: 宝石の立体の色が無い: ${色}（src/jewel-piece-shape.js の JEWEL_BODY_RGB）`);
  }
  firstEdLine =
    `ⓘ 1st EDITION ${fe.length} 種（＋Eカード ${eternal1st.length} 種・Fカード ${first1st.length} 種）: 文(日英)と絵は上で検査済み。` +
    `効果データ 通常 ${効果あり}/${fe.length}・E ${E効果あり}/${eternal1st.length}・F ${F効果あり}/${first1st.length}、` +
    `テスト 通常 ${テストあり}/${fe.length}・F ${Fテストあり}/${first1st.length}` +
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

// --- 8. getCardName() を、日本語のフォールバック無しで画面に出していないか -------------
// 🔴【#530・2026-11-07】`getCardName()` は **card-text.js の「翻訳の引き当て」** で、
//   **日本語では設計上 null を返す**（呼び出し側が cards-data.js の日本語名へ落とす前提）。
//   これをそのままモーダルに入れて「【状況】「null」の効果が…」と出た。
//   ⇒ 素で使うのは禁止。`cardDisplayName()` か `getCardName(x) || def.name` の形にする。
{
  const 除外 = new Set(["src/card-text.js"]); // 定義そのもの
  const 悪い = [];
  for (const f of ["src/main.js", "src/card-effect-engine.js", "src/gate-invasion.js", "src/gate-invasion-modal.js",
                   "src/deck-viewer.js", "src/codex-page.js", "src/card-dev-mode.js", "src/online.js"]) {
    let 本文 = null;
    try {
      本文 = read(f);
    } catch (e) {
      continue; // 無いファイルは飛ばす（将来名前が変わっても検査が空振りで落ちないように）
    }
    if (除外.has(f)) continue;
    本文.split("\n").forEach((行, i) => {
      if (!行.includes("getCardName(")) return;
      if (行.includes("||")) return; // フォールバックがある
      if (行.includes("import ")) return; // import 文
      if (行.includes("function cardDisplayName")) return;
      悪い.push(`${f}:${i + 1} ${行.trim().slice(0, 70)}`);
    });
  }
  if (悪い.length > 0) {
    for (const b of 悪い) {
      note("getCardName() を日本語のフォールバック無しで使っている（日本語では null になる）: " + b);
    }
  }
}

// --- 9. ONLY カードの一覧が、サーバー側の写しとズレていないか ---------------------------
// 🔴【続き744】マイ山札で山を組む時、ONLY は**1種1枚まで**という上限がある。その判定を
//   Edge Function 側でも持つ必要があるが、あちらのカードの表には `only` の印が無いので
//   **id の一覧（ONLY_CARD_IDS）を別に持っている**。ズレると「ONLY を7枚積んだ山札が通る」
//   という、見た目には分からない形で出るので毎回照合する。
//   ⚠ `count === 1` では代用できない（black-faded-cat や 1st の白は1枚刷りだが ONLY ではない）。
{
  let edge3 = null;
  try {
    edge3 = read("supabase/functions/so7-apply-action.ts");
  } catch (e) {
    edge3 = null;
  }
  if (edge3) {
    const i = edge3.indexOf("const ONLY_CARD_IDS = new Set<string>([");
    const j = i < 0 ? -1 : edge3.indexOf("]);", i);
    if (i < 0 || j < 0) {
      note("ONLY カードの一覧がサーバー側に見つからない（supabase/functions/so7-apply-action.ts の ONLY_CARD_IDS）");
    } else {
      const 写し = new Set(
        edge3.slice(i, j).split("\n").slice(1)
          .map((行) => (行.match(/"([^"]+)"/) || [])[1])
          .filter(Boolean),
      );
      // 正は src/cards-data-ex0.js の `only: true`。印の直前にある id を拾う
      //   （この表は1行1枚で書かれている。形が変わったら下の件数0で落ちるので気づける）。
      const ex0Src = read("src/cards-data-ex0.js");
      const 正 = new Set();
      for (const m of ex0Src.matchAll(/id:\s*"([a-z0-9-]+)"[^\n]*only:\s*true/g)) 正.add(m[1]);
      if (正.size === 0) {
        console.error("❌ 検査そのものが怪しい: 手元の ONLY カードが0件");
        process.exit(2);
      }
      for (const id of 正) if (!写し.has(id)) note("ONLY: サーバー側の写しに無い: " + id + " → so7-apply-action.ts の ONLY_CARD_IDS");
      for (const id of 写し) if (!正.has(id)) note("ONLY: サーバー側の写しに余計な id がある: " + id);
    }
  }
}

// --- 8. card-effects.js のコメント見出しのカード名が実在するか ------------------
// 🔴【続き751】1st EDITION の Eカード5枚のコメント見出しが、**実在しない名前**になっていた
//   （「赤き焔の書　フレイムドレイク」等。正しくは「走書の赤歴　ジョイナール」）。
//   コメントなので画面には1文字も出ないが、**読んだ人がその名前を本物だと信じてしまう**
//   （実際に私がユーザーへ存在しないカード名で説明してしまった）。
// ⚠ 見るのは「// <名前>（<色>…）」の形の見出し行だけ。本文の中でカード名に触れている
//   コメントは山ほどあるので、そこまで見ると誤検知だらけになる。
// ⚠ 比べる時は「番号の頭（3. ）」と「空白（全角も）」を落とす——見出しは番号付きのものや、
//   名前の中の全角空白を半角で書いたものが混ざっている。
{
  const ならす = (x) => x.replace(/^\d+\.\s*/, "").replace(/[\s\u3000]+/g, "");
  const 実名 = new Set();
  // 🔴【続き781】**セットを足したらここにも足す。** 抜けると「実在するのに実在しない」と出る
  //   （志炎者7枚の効果データを入れた時に、cards-data-cf.js が無くて7件とも誤検知になった）。
  for (const p of [
    "src/cards-data.js",
    "src/cards-data-1st.js",
    "src/cards-data-ex0.js",
    "src/cards-data-0th.js",
    "src/cards-data-cf.js",
    "src/cards-data-new.js", // 🔴【続き882】新しい無色カード3枚
  ]) {
    let src = null;
    try {
      src = read(p);
    } catch (e) {
      src = null;
    }
    if (!src) continue;
    for (const m of src.matchAll(/name:\s*"([^"]+)"/g)) 実名.add(ならす(m[1]));
  }
  const 見出し = /^\s*\/\/ ([^\s/][^（]*)（(赤|橙|黄|緑|青|紫|桃|白|黒|虹)[^）]*）\s*$/;
  const 見出し達 = [];
  read("src/card-effects.js").split("\n").forEach((行, i) => {
    const m = 行.match(見出し);
    if (m) 見出し達.push({ line: i + 1, name: m[1].trim() });
  });
  // 🔴 探し方が空振りすると「0件＝合格」になるので、それらしい数が取れたかを先に見る。
  if (実名.size < 50 || 見出し達.length < 20) {
    console.error(`❌ 検査そのものが怪しい: 実名 ${実名.size}件 / 見出し ${見出し達.length}件`);
    process.exit(2);
  }
  for (const h of 見出し達) {
    if (!実名.has(ならす(h.name))) {
      note(`コメント見出しのカード名が実在しない: src/card-effects.js:${h.line}「${h.name}」（cards-data*.js の name と突き合わせた）`);
    }
  }
}

// --- 8. 旧0th EDITION（白地に虹の輪の版・2024.04）------------------------------
// 🔴 0th拡張・1st EDITION とまったく同じ見方（絵は blank と illust の2種・文は専用ファイル・
//   assets/cards は作らない）。
// ⚠ Eカード・Fカード・なないろの欠片は**リメイクのものを使い回す**ので、ここには出てこない。
// ⚠ **効果データとテストはまだ0件**。無い数をそのまま出して、進み具合が毎回見えるようにする。
const old0thSrc = (() => {
  try {
    return read("src/cards-data-0th.js");
  } catch (e) {
    return null;
  }
})();
let old0thLine = "";
if (old0thSrc) {
  const old0th = [...old0thSrc.matchAll(/\{\s*id:\s*"(0th-[a-z0-9-]+)"\s*,\s*name:\s*"([^"]*)"/g)].map((m) => ({ id: m[1], name: m[2] }));
  if (old0th.length < 15) {
    console.error(`❌ 検査そのものが怪しい: cards-data-0th.js から ${old0th.length} 種しか読めなかった`);
    process.exit(2);
  }
  const jaOld = new Set([...read("src/card-text-0th.ja.js").matchAll(/^ {2}"(0th-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  const enOld = new Set([...read("src/card-text-0th.en.js").matchAll(/^ {2}"(0th-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  let 効果あり = 0;
  let テストあり = 0;
  for (const c of old0th) {
    if (!jaOld.has(c.id)) note(`旧0th: 日本語の文が無い: ${c.id}（${c.name}）→ node tools/gen-0th-text.mjs`);
    if (!enOld.has(c.id)) note(`旧0th: 英語の文が無い: ${c.id}（${c.name}）→ node tools/gen-0th-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${c.id}.webp`))) note(`旧0th: 絵が無い: ${dir}/${c.id}.webp → node tools/make-0th-art.mjs`);
    }
    if (fs.existsSync(path.join(ROOT, "assets/cards", `${c.id}.webp`))) {
      note(`旧0th: 文字をアプリが描くので assets/cards を持たないはず: ${c.id}`);
    }
    if (effectIds.has(c.id)) 効果あり++;
    if (casesSrc.includes(`"${c.id}"`)) テストあり++;
  }
  old0thLine =
    `ⓘ 旧0th ${old0th.length} 種（E・F・なないろの欠片はリメイクのものを使う）: 文(日英)と絵2種は上で検査済み。` +
    `効果データ ${効果あり}/${old0th.length}・テスト ${テストあり}/${old0th.length}` +
    (効果あり === old0th.length && テストあり === old0th.length ? "（そろった）" : "（**これから**）");

  // サーバー側の写しとのズレ（0th拡張・1st とまったく同じ理由。手でコピペしてデプロイする運用）。
  // 🔴【続き840】旧0thは「まぜる」の4セット目にも入ったので、ここがズレると
  //   **旧0thで遊んだ時だけでなく、まぜるでも**CPU戦とフレンドリーマッチで山札が食い違う。
  let edge0 = null;
  try {
    edge0 = read("supabase/functions/so7-apply-action.ts");
  } catch (e) {
    edge0 = null;
  }
  if (edge0) {
    const 写し = 表を読む(edge0, "const OLD0TH_NORMAL_CARDS", "0th-");
    const 正 = 表を読む(old0thSrc, "export const OLD0TH_NORMAL_CARDS", "0th-");
    if (!写し || !正 || 写し.size < 15 || 正.size < 15) {
      console.error(
        "❌ 検査そのものが怪しい: 旧0th の表が 正" + (正 ? 正.size : "読めず") +
          " / 写し" + (写し ? 写し.size : "読めず") + " しか取れなかった"
      );
      process.exit(2);
    }
    for (const [id, v] of 正) {
      if (!写し.has(id)) note("旧0th: サーバー側の写しに無い: " + id + " → supabase/functions/so7-apply-action.ts の OLD0TH_NORMAL_CARDS");
      else if (写し.get(id) !== v) note("旧0th: 色か枚数がサーバー側とズレている: " + id + "（正 " + v + " / 写し " + 写し.get(id) + "）");
    }
    for (const id of 写し.keys()) if (!正.has(id)) note("旧0th: サーバー側にだけ在る: " + id + "（消し忘れ？）");
    // 🔴 山札を組む枝そのものも見る（表だけ写して枝を足し忘れると、黙ってリメイクの山になる）。
    if (!edge0.includes('cardSet === "0th"')) {
      note("旧0th: サーバーに旧0thの枝が無い（知らない値としてリメイクの山札に落ちる） → deckPoolForCardSet");
    }
    if (!edge0.includes("FIRST_ED_NORMAL_CARDS, OLD0TH_NORMAL_CARDS")) {
      note("まぜる: サーバーが旧0thを混ぜていない（続き840 で4セットにした） → deckPoolForCardSet");
    }
  }
}


// 本文から「ここからここまで」を切り出す。見つからなければ null（＝黙って合格しない）。
function 切り出す(本文, 始, 終) {
  const i = 本文.indexOf(始);
  if (i < 0) return null;
  const j = 本文.indexOf(終, i + 始.length);
  if (j < 0) return null;
  return 本文.slice(i, j + 終.length);
}
// --- 9. 0thリメイクの限定カード（志炎者7枚）--------------------------------------
// 🔴 0th拡張・1st・旧0th と同じ見方（絵は blank と illust の2種・文は専用ファイル・
//   assets/cards は作らない）。
// 🔴 ここだけの見張り（黙って戻ると気づけない決まりごと）:
//   ・名義は **SEVRAIL**（2026-11-21・ユーザー判断。仮で YGM にしていた時期がある）
//   ・山札に入れられるのは **7枚**（ONLY の「1種類1枚まで」ではない）
//   ・**パックには入らない**（限定報酬）。card-pack-ui.js の getPackPool に混ざっていないこと
//   ・**持ち物として数える札**に入っていること——抜けると「持っていないのに 7/7」と出る
// ⚠ **効果データとテストはまだ0件**（【志炎】＝割り込みの窓が未実装）。
//   無い数をそのまま出して、進み具合が毎回見えるようにする。
const cfSrc = (() => {
  try {
    return read("src/cards-data-cf.js");
  } catch (e) {
    return null;
  }
})();
let cfLine = "";
if (cfSrc) {
  const cf = [...cfSrc.matchAll(/\{\s*id:\s*"(cf-[a-z0-9-]+)"\s*,\s*name:\s*"([^"]*)"/g)]
    .map((m) => ({ id: m[1], name: m[2] }));
  if (cf.length !== 7) {
    console.error(`❌ 検査そのものが怪しい: cards-data-cf.js から ${cf.length} 種しか読めなかった（7種のはず）`);
    process.exit(2);
  }
  const jaCf = new Set([...read("src/card-text-cf.ja.js").matchAll(/^ {2}"(cf-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  const enCf = new Set([...read("src/card-text-cf.en.js").matchAll(/^ {2}"(cf-[a-z0-9-]+)":/gm)].map((m) => m[1]));
  let 効果あり = 0;
  let テストあり = 0;
  for (const c of cf) {
    if (!jaCf.has(c.id)) note(`志炎者: 日本語の文が無い: ${c.id}（${c.name}）→ node tools/gen-cf-text.mjs`);
    if (!enCf.has(c.id)) note(`志炎者: 英語の文が無い: ${c.id}（${c.name}）→ node tools/gen-cf-text.mjs`);
    for (const dir of ["assets/cards-blank", "assets/cards-illust"]) {
      if (!fs.existsSync(path.join(ROOT, dir, `${c.id}.webp`))) note(`志炎者: 絵が無い: ${dir}/${c.id}.webp → node tools/make-cf-art.mjs`);
    }
    if (fs.existsSync(path.join(ROOT, "assets/cards", `${c.id}.webp`))) {
      note(`志炎者: 文字をアプリが描くので assets/cards を持たないはず: ${c.id}`);
    }
    if (effectIds.has(c.id)) 効果あり++;
    if (casesSrc.includes(`"${c.id}"`)) テストあり++;
  }
  // 🔴 山札の枚数が 7 であること（ONLY の 1 に戻っていないか）
  const 枚数 = [...cfSrc.matchAll(/id: "cf-[a-z0-9-]+".*?count: (\d+)/g)].map((m) => Number(m[1]));
  if (枚数.length !== 7) note(`志炎者: 山札の枚数を7種ぶん読めなかった（${枚数.length} 件）`);
  else if (枚数.some((n) => n !== 7)) note(`志炎者: 山札に入れられるのは7枚のはず（読めた値: ${枚数.join(",")}）。ONLYの1枚と取り違えていないか`);
  // 🔴 名義が SEVRAIL であること（道具の表。焼く時にカードへ焼き込まれる）
  const 名義 = /illustrator:\s*"([^"]*)"/.exec(read("tools/cf-cards.mjs"))?.[1];
  if (名義 !== "SEVRAIL") note(`志炎者: 焼くときの名義が SEVRAIL でない（いま「${名義}」）→ tools/cf-cards.mjs の CF_CREDITS`);
  // 🔴 繋ぎ先（続き758 の実害: 山札だけ繋いで ALL_CARDS に足し忘れ、名前が id のまま出た）
  // 🔴 **名前が在るかではなく、使われているか**を見る。
  //   import 行に名前が残っているだけで合格してしまい、A/B で3件とも素通りした（実測で捕まえた）。
  const cardsData = read("src/cards-data.js");
  const allCards = 切り出す(cardsData, "const ALL_CARDS = [", "];");
  const myStack = 切り出す(cardsData, "export const MY_STACK_SETS", ";");
  if (!allCards || !allCards.includes("...CF_NORMAL_CARDS")) note("志炎者: ALL_CARDS に入っていない（id を引けず、名前が id のまま出る＝続き758 の実害）");
  if (!myStack || !myStack.includes("CF_NORMAL_CARDS")) note("志炎者: MY_STACK_SETS に入っていない（手に入れてもマイ山札に出てこない）");
  const cardText = read("src/card-text.js");
  const 混ぜJA = 切り出す(cardText, "const JA = {", "};");
  const 混ぜEN = 切り出す(cardText, "const EN = {", "};");
  if (!混ぜJA || !混ぜJA.includes("...CARD_TEXT_CF_JA")) note("志炎者: card-text.js が日本語の文を混ぜていない（効果文が出ない）");
  if (!混ぜEN || !混ぜEN.includes("...CARD_TEXT_CF_EN")) note("志炎者: card-text.js が英語の文を混ぜていない");
  const packUi = read("src/card-pack-ui.js");
  if (!packUi.includes("function 持ち物として数える札か(")) note("志炎者: card-pack-ui.js に「持ち物として数える札か」が無い（持っていないのに 7/7 と出る）");
  const 数える = 切り出す(packUi, "function 持ち物として数える札か(", "}");
  if (!数える || !数える.includes("CF_NORMAL_CARDS")) note("志炎者: 「持ち物として数える札か」が志炎者を見ていない（持っていないのに 7/7 と出る）");
  const 集める = 切り出す(packUi, "export function getCollectionPool", "}");
  if (!集める || !集める.includes("CF_NORMAL_CARDS")) note("志炎者: コレクションに並ばない（getCollectionPool）");
  const 袋 = packUi.slice(packUi.indexOf("export function getPackPool"), packUi.indexOf("export function getCollectionPool"));
  if (袋.includes("CF_NORMAL_CARDS")) note("志炎者: パック（getPackPool）に混ざっている。限定報酬なのでパックからは出ない（サーバーの写しとも食い違う）");
  // 🔴🔴【続き878】**「リメイク＋志炎者」はサーバーにも同じ枝と同じ枚数が要る。**
  //   続き878 まで**サーバーにこの枝が無く**、オンラインのフレンドリーマッチでは
  //   知らない値としてリメイクの山札に落ちていた（＝志炎者が1枚も入らない）。
  //   旧0thでまったく同じことが起きている（続き840）ので、ここも機械で見張る。
  //   ⚠ 見るのは**表の写し**と**枝そのもの**と**枚数（2枚ずつ）**の3つ。
  //     表だけ写して枝を足し忘れると、**黙ってリメイクの山になる**（いちばん分かりにくい形）。
  let edgeCf = null;
  try {
    edgeCf = read("supabase/functions/so7-apply-action.ts");
  } catch (e) {
    edgeCf = null;
  }
  if (edgeCf) {
    const 写し = 表を読む(edgeCf, "const CF_NORMAL_CARDS", "cf-");
    const 正 = 表を読む(cfSrc, "export const CF_NORMAL_CARDS", "cf-");
    if (!写し || !正 || 写し.size !== 7 || 正.size !== 7) {
      console.error(
        "❌ 検査そのものが怪しい: 志炎者の表が 正" + (正 ? 正.size : "読めず") +
          " / 写し" + (写し ? 写し.size : "読めず") + " しか取れなかった（7種のはず）"
      );
      process.exit(2);
    }
    for (const [id, v] of 正) {
      if (!写し.has(id)) note("志炎者: サーバー側の写しに無い: " + id + " → supabase/functions/so7-apply-action.ts の CF_NORMAL_CARDS");
      else if (写し.get(id) !== v) note("志炎者: 色か枚数がサーバー側とズレている: " + id + "（正 " + v + " / 写し " + 写し.get(id) + "）");
    }
    for (const id of 写し.keys()) if (!正.has(id)) note("志炎者: サーバー側にだけ在る: " + id + "（消し忘れ？）");
    if (!edgeCf.includes('cardSet === "remake+cf"')) {
      note("リメイク＋志炎者: サーバーにこの枝が無い（知らない値としてリメイクの山札に落ち、志炎者が1枚も入らない） → deckPoolForCardSet");
    }
    // 🔴 枚数（各2枚）が**両側でそろっている**こと。片方だけ直すと山札の中身が食い違う。
    const 枝の枚数 = (本文) => {
      const m = /CF_NORMAL_CARDS\.map\(\(c\) => \(\{ \.\.\.c, count: (\d+) \}\)\)/.exec(本文);
      return m ? Number(m[1]) : null;
    };
    const 客 = 枝の枚数(cardsData);
    const 鯖 = 枝の枚数(edgeCf);
    if (客 === null) note("リメイク＋志炎者: クライアントの枝で枚数を読めない（src/cards-data.js の REMAKE_CF）");
    else if (鯖 === null) note("リメイク＋志炎者: サーバーの枝で枚数を読めない（so7-apply-action.ts の deckPoolForCardSet）");
    else if (客 !== 鯖) note("リメイク＋志炎者: 志炎者の枚数が食い違う（クライアント " + 客 + "枚 / サーバー " + 鯖 + "枚）");
    else if (客 !== 2) note("リメイク＋志炎者: 志炎者は**各2枚**のはず（ユーザー指示 2026-11-28）。いま " + 客 + "枚");
  }
  cfLine =
    `ⓘ 志炎者 ${cf.length} 種（0thリメイクの限定カード・パックではなく限定報酬）: 文(日英)と絵2種は上で検査済み。` +
    `名義 ${名義}・山札 ${枚数[0]}枚・効果データ ${効果あり}/${cf.length}・テスト ${テストあり}/${cf.length}` +
    (効果あり === cf.length && テストあり === cf.length ? "（そろった）" : "（**これから**）");
}
if (problems.length === 0) {
  const checked = cards.filter((c) => !c.blank).length;
  console.log(`✅ 問題なし（カード ${checked} 種・効果/日本語/英語/絵2種/テスト を確認。ブーストの白紙カード ${cards.length - checked} 種は対象外）`);
  if (ex0Line) console.log("   " + ex0Line);
  if (firstEdLine) console.log("   " + firstEdLine);
  if (old0thLine) console.log("   " + old0thLine);
  if (cfLine) console.log("   " + cfLine);
  process.exit(0);
}
console.log(`❌ ${problems.length} 件`);
for (const p of problems) console.log("  - " + p);
process.exit(1);
