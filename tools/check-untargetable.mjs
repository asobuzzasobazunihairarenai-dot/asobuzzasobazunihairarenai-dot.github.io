#!/usr/bin/env node
// 「他のカードの効果の対象にならない」札（ファースト／エターナル／我忘れの白き龍）の守りが、
// **エンジンの外でも**効いているかを見張る（続き863・検査30本目）。
//
// 🔴 なぜ要るか（#829 の実害）
//   この決まりは card-effect-engine.js の **private 関数**にしか無く、export もされて
//   いなかった。だから「誰かの札を捨てる一覧」をエンジンの外（main.js の委任タスク）で
//   組む人は、条件を**手で書き写す**ことになり、書き写すたびに1つずつ欠けていった:
//     - ヤエザ②「自分のロックしている１枚を捨てる」      … 守りが丸ごと無い ⇒ **ファーストを捨てられた**
//     - いろ落ちガエル■「ロックしている１枚を捨てる」    … 同上
//     - ゴメンナサイッ！の「奪えるロック」               … 我忘れの白き龍が抜けていた
//   ⇒ 判定を `src/untargetable-cards.js` 1か所に集めた。ここが**唯一の持ち主**。
//
// 見るもの:
//   ① 葉（untargetable-cards.js）が在り、2つを export していて、龍が名簿に居る
//   ② エンジンが**写しを持たず**、葉から読んでいる
//   ③ main.js が葉から読んでいる
//   🔴 ④ **委任タスク**（run*Task）が lock の一覧を組むなら、必ず判定を通している
//   🔴 ⑤ ゴメンナサイッ！の「奪えるロック」が、手写しではなく判定を通している
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 読む = (相対) => fs.readFileSync(path.join(ROOT, 相対), "utf8").replace(/\r\n/g, "\n");

let 落ちた = 0;
const NG = (文) => { console.error("  🔴 " + 文); 落ちた++; };
const OK = (文) => console.log("  ✅ " + 文);

// ── ① 葉 ────────────────────────────────────────────────────────
const 葉道 = "src/untargetable-cards.js";
if (!fs.existsSync(path.join(ROOT, 葉道))) {
  console.error("  🔴 " + 葉道 + " が無い（判定の唯一の持ち主）");
  process.exit(1);
}
const 葉 = 読む(葉道);
for (const 名 of ["isTargetableByOtherCardEffects", "filterTargetableTokens", "NOT_TARGETABLE_CARD_IDS"]) {
  if (new RegExp("export (const|function) " + 名 + "\\b").test(葉)) OK("葉が " + 名 + " を export している");
  else NG("葉が " + 名 + " を export していない");
}
if (/"ex0-white-dragon"/.test(葉)) OK("名簿に我忘れの白き龍が居る");
else NG("名簿に我忘れの白き龍が居ない（★「これは他のカードの効果の対象にならない。」）");
// 葉は何も import しない（どこから読んでも輪にならない）
if (/^import\s/m.test(葉)) NG("葉が何かを import している（葉のままにすること）");
else OK("葉は何も import していない");

// ── 🔴 ①-2 判定そのものを動かす（決め打ちの6例）────────────────────────
// 名簿や export が在るだけでは「正しく判定する」証拠にならない。
{
  const mod = await import("file://" + path.join(ROOT, 葉道).replace(/\\/g, "/"));
  const 例 = [
    ["first-red", false, "ファーストカード"],
    ["eternal-blue", false, "エターナルカード"],
    ["eternal-1st-yellow", false, "1st EDITION の Eカード"],
    ["ex0-white-dragon", false, "我忘れの白き龍（★で対象にならない）"],
    ["red-dash", true, "ふつうの通常カード"],
    [null, true, "id が無い時は触れる側に倒す"],
  ];
  let 合 = 0;
  for (const [id, 期待, 説明] of 例) {
    const 実 = mod.isTargetableByOtherCardEffects(id);
    if (実 === 期待) 合++;
    else NG("判定が違う: " + 説明 + "（" + id + "）→ " + 実 + "（期待 " + 期待 + "）");
  }
  if (合 === 例.length) OK("判定が6例とも合っている（奪えない4・奪える2）");
  // 一覧を絞る方も動かす
  const 絞った = mod.filterTargetableTokens([
    { cardId: "first-red" }, { cardId: "red-dash" }, { cardId: "ex0-white-dragon" }, { cardId: "blue-jump" },
  ]);
  if (絞った.length === 2 && 絞った.every((t) => t.cardId === "red-dash" || t.cardId === "blue-jump")) {
    OK("一覧を絞る方も、守るべき2枚だけを落とす");
  } else {
    NG("filterTargetableTokens が " + 絞った.length + " 件を返した（期待 2）");
  }
}

// ── ②③ 読む側 ──────────────────────────────────────────────────
for (const f of ["src/card-effect-engine.js", "src/main.js"]) {
  const s = 読む(f);
  if (/import\s*\{[^}]*isTargetableByOtherCardEffects[^}]*\}\s*from\s*"\.\/untargetable-cards\.js"/.test(s)) {
    OK(f + " が葉から読んでいる");
  } else {
    NG(f + " が葉から読んでいない（判定を写していないか？）");
  }
  if (/^\s*function isTargetableByOtherCardEffects\s*\(/m.test(s)) {
    NG(f + " が判定の写しを持っている（葉1か所に集めること）");
  }
}

// ── 🔴 ④ 委任タスクが lock の一覧を組むなら、判定を通す ──────────────────
const main = 読む("src/main.js");
const 行 = main.split("\n");
// run*Task（委任で呼ばれる）の本体を切り出す
const 関数 = [];
{
  let 名 = null, 始 = 0;
  for (let i = 0; i < 行.length; i++) {
    const m = 行[i].match(/^(?:async )?function (run[A-Za-z0-9_]*Task)\s*\(/);
    if (!m) continue;
    if (名) 関数.push({ 名, 始, 終: i });
    名 = m[1];
    始 = i;
  }
  if (名) {
    // 次の関数定義までを本体とする
    let j = 始 + 1;
    for (; j < 行.length; j++) if (/^(?:async )?function [A-Za-z0-9_]+\s*\(/.test(行[j])) break;
    関数.push({ 名, 始, 終: j });
  }
}
// 始まりが分かっている分は、次の関数定義までを終わりにし直す
for (const f of 関数) {
  let j = f.始 + 1;
  for (; j < 行.length; j++) if (/^(?:async )?function [A-Za-z0-9_]+\s*\(/.test(行[j])) break;
  f.終 = j;
}

let 見た = 0;
const 穴 = [];
for (const f of 関数) {
  const 本体 = 行.slice(f.始, f.終).join("\n");
  if (!/zone === "lock"/.test(本体)) continue;
  見た++;
  if (!/isTargetableByOtherCardEffects/.test(本体)) 穴.push(f);
}
console.log("  ⓘ 委任タスク " + 関数.length + " 個のうち、ロックの一覧を組むのは " + 見た + " 個");
if (見た < 2) NG("ロックの一覧を組む委任タスクが " + 見た + " 個しか見つからない（数え方が壊れている）");
if (穴.length === 0) OK("ロックの一覧を組む委任タスクは、全部 判定を通している");
for (const f of 穴) NG("src/main.js:" + (f.始 + 1) + " " + f.名 + " が判定を通していない（他のカードの効果の対象にならない札を捨てられる）");

// ── 🔴 ⑤ ゴメンナサイッ！の奪えるロック ──────────────────────────────
{
  const i = main.indexOf("function findGomennasaiEligibility");
  if (i < 0) {
    NG("findGomennasaiEligibility が見つからない");
  } else {
    const j = main.indexOf("\nfunction ", i + 10);
    const 本体 = main.slice(i, j < 0 ? main.length : j);
    if (/startsWith\("first-"\)|startsWith\("eternal-"\)/.test(本体)) {
      NG("ゴメンナサイッ！が条件を手で書き写している（龍が抜ける）。判定を通すこと");
    } else if (/isTargetableByOtherCardEffects/.test(本体)) {
      OK("ゴメンナサイッ！の奪えるロックが判定を通している");
    } else {
      NG("ゴメンナサイッ！の奪えるロックに守りが無い");
    }
  }
}

// ── 🔴 ⑥ 手札側（続き864・ユーザー裁定 2026-11-26）──────────────────
// 「枚数としては数える」＝枚数を見る所は getHandTokens（全部）のまま。
// 「捨てられない／奪われない」＝**どれを捨てるか選ぶ一覧**だけを絞る ⇒ 捨てられる手札()。
// ⚠ 実際に効くのは我忘れの白き龍だけ（ファースト／エターナルは手札に来ない）。
{
  const eng = 読む("src/card-effect-engine.js");
  const 定義 = /function 捨てられる手札\(player\) \{\s*\n\s*return getHandTokens\(player\)\.filter\(\(t\) => isTargetableByOtherCardEffects\(t\.cardId\)\);/;
  if (定義.test(eng)) OK("エンジンに『捨てられる手札』が在り、判定を通している");
  else NG("エンジンの『捨てられる手札』が無い／判定を通していない");
  const 使用 = (eng.match(/捨てられる手札\(/g) || []).length - 1; // 定義そのものを引く
  console.log("  ⓘ エンジンで『捨てられる手札』を使っている所: " + 使用 + " か所");
  if (使用 >= 13) OK("捨てる／渡す動詞が、全部そこを通っている（13 か所以上）");
  else NG("『捨てられる手札』が " + 使用 + " か所でしか使われていない（13 か所以上のはず）");
  // 🔴 枚数を数える所は**全部の手札**のまま（裁定どおり）。1つも残っていなければ数え方が壊れている。
  const 数える = (eng.match(/getHandTokens\([^)]*\)\.length/g) || []).length;
  console.log("  ⓘ 枚数を『全部の手札』で数えている所: " + 数える + " か所");
  if (数える >= 5) OK("枚数は今までどおり全部の手札で数えている（裁定: 枚数としては数える）");
  else NG("枚数を全部の手札で数えている所が " + 数える + " か所しかない（裁定と食い違う）");
}

// ── 🔴 ⑦ main.js の「手札から捨てる／奪う」も判定を通す ──────────────
{
  const 的 = [
    ["requestOpponentHandRitualPick", "相手の手札から1枚奪う"],
    ["requestOpponentHandRitualMultiPick", "相手の手札から複数奪う"],
    ["swapHandCardWithOpponentForEffect", "手札の入れ替えで渡す札"],
    ["runSlumOfficialDiscardTask", "スラム上がりの役人"],
    ["runDiscardDownToTask", "N枚以下になるように捨てる"],
    ["runDiscardWholeHandOrderedTask", "手札をすべて捨てる（順を選ぶ）"],
  ];
  const 行2 = main.split("\n");
  let 穴2 = 0;
  for (const [名, 説明] of 的) {
    const i = 行2.findIndex((l) => new RegExp("^(?:async )?function " + 名 + "\\s*\\(").test(l));
    if (i < 0) { NG(名 + " が見つからない（名前が変わった？）"); 穴2++; continue; }
    let j = i + 1;
    for (; j < 行2.length; j++) if (/^(?:async )?function [A-Za-z0-9_]+\s*\(/.test(行2[j])) break;
    const 本体 = 行2.slice(i, j).join("\n");
    if (!/isTargetableByOtherCardEffects/.test(本体)) { NG("src/main.js:" + (i + 1) + " " + 名 + "（" + 説明 + "）が判定を通していない"); 穴2++; }
  }
  if (穴2 === 0) OK("手札から捨てる／奪う " + 的.length + " か所とも判定を通している");
}

if (落ちた > 0) {
  console.error("\n🔴 " + 落ちた + " 件。`src/untargetable-cards.js` の判定を通してください。");
  process.exit(1);
}
console.log("✅ 問題なし（判定の持ち主は1つ・読む側2ファイル・委任タスク " + 見た + " 個とも守られている）");
