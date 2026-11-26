#!/usr/bin/env node
// 「他のカードの効果の対象にならない」の守りを見張る（続き863で新設・続き865で決まりが変わった）。
//
// ─────────────────── いまの決まり（ユーザー裁定 2026-11-26・案A）───────────────────
// 🔴 **公開されている札は対象にできない。秘匿の札は対象にできる。**
//   ロックエリア／表向きのマス／公開ドロー → 対象にできない
//   裏向きのマス／手札                     → **対象にできる**
//
// ⓘ ファースト／エターナルは必ずロックエリアに表向きで在るので、今までどおり常に守られる。
//   挙動が変わるのは **我忘れの白き龍** だけ。
//
// 🔴 なぜ検査が要るか（#829 の実害）
//   判定が card-effect-engine.js の private 関数にしか無く export されていなかったので、
//   エンジンの外で同じ一覧を組む人は条件を**手で書き写し**、写すたびに1つずつ欠けた
//   （ヤエザ②といろ落ちガエル■では丸ごと抜け、ゴメンナサイッ！では龍が抜けていた）。
//   さらに前の決まり（cardId だけを見る）は**秘匿情報を漏らしていた**——迷いの森が
//   裏向きの龍のマスだけ黙って飛ばすので、そこが龍だと全員に分かった。
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
for (const 名 of ["isTargetableToken", "isCardIdentityPublic", "isProtectedCardKind", "filterTargetableTokens", "NOT_TARGETABLE_CARD_IDS"]) {
  if (new RegExp("export (const|function) " + 名 + "\\b").test(葉)) OK("葉が " + 名 + " を export している");
  else NG("葉が " + 名 + " を export していない");
}
// ⚠ 古い名前は**消さない**（端末のキャッシュに残った古い main.js が import している
//   ＝公開済みの src/*.js から export を消さない。続き423 の実害と同じ家族）。
if (/export function isTargetableByOtherCardEffects\b/.test(葉)) OK("古い名前も残してある（キャッシュの古い端末のため）");
else NG("古い名前（isTargetableByOtherCardEffects）を消している——キャッシュの古い端末が壊れる");
if (/"ex0-white-dragon"/.test(葉)) OK("名簿に我忘れの白き龍が居る");
else NG("名簿に我忘れの白き龍が居ない（★「これは他のカードの効果の対象にならない。」）");
if (/^import\s/m.test(葉)) NG("葉が何かを import している（葉のままにすること）");
else OK("葉は何も import していない");

// ── 🔴 ② 判定そのものを動かす（決め打ちの8例）────────────────────────
// 名簿や export が在るだけでは「正しく判定する」証拠にならない。
let 対になっている = false;
{
  const mod = await import("file://" + path.join(ROOT, 葉道).replace(/\\/g, "/"));
  const 例 = [
    [{ cardId: "first-red", location: { zone: "lock" } }, false, "ファースト（ロック＝常に公開）"],
    [{ cardId: "eternal-blue", location: { zone: "lock" } }, false, "エターナル（ロック＝常に公開）"],
    [{ cardId: "ex0-white-dragon", location: { zone: "lock" } }, false, "龍（ロック）"],
    [{ cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: true }, false, "龍（表向きのマス＝公開）"],
    [{ cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: false }, true, "龍（裏向きのマス＝秘匿）"],
    [{ cardId: "ex0-white-dragon", location: { zone: "hand", player: "A" } }, true, "龍（手札＝秘匿）"],
    [{ cardId: "ex0-white-dragon", location: { zone: "publicDraw", player: "A" } }, false, "龍（公開ドロー＝公開）"],
    [{ cardId: "red-dash", location: { zone: "cell" }, faceUp: true }, true, "ふつうの札はどこでも触れる"],
  ];
  let 合 = 0;
  for (const [tok, 期待, 説明] of 例) {
    const 実 = mod.isTargetableToken(tok);
    if (実 === 期待) 合++;
    else NG("判定が違う: " + 説明 + " → " + 実 + "（期待 " + 期待 + "）");
  }
  if (合 === 例.length) OK("判定が8例とも合っている（公開4は触れない・秘匿2とふつう2は触れる）");

  // 🔴 「裏向きなら触れる」と「表向きなら触れない」が**両方**成り立って初めて意味がある。
  const 裏 = mod.isTargetableToken({ cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: false });
  const 表 = mod.isTargetableToken({ cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: true });
  対になっている = 裏 === true && 表 === false;
  if (対になっている) OK("同じ札でも、裏向きなら触れて表向きなら触れない（対になっている）");
  else NG("裏/表の対になっていない（裏=" + 裏 + " 表=" + 表 + "）");

  // ⚠ 手札の faceUp は「自分の画面で見えるか」でしかない。そこを見ていないことを確かめる。
  const 手表 = mod.isTargetableToken({ cardId: "ex0-white-dragon", location: { zone: "hand", player: "A" }, faceUp: true });
  if (手表 === true) OK("手札は faceUp を見ずに秘匿として扱う（faceUp は自分の画面の話）");
  else NG("手札の faceUp を見てしまっている（state.js の faceUpForLocation は hand で player==='A' を返すだけ）");

  const 絞った = mod.filterTargetableTokens([
    { cardId: "first-red", location: { zone: "lock" } },
    { cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: true },
    { cardId: "ex0-white-dragon", location: { zone: "cell" }, faceUp: false },
    { cardId: "red-dash", location: { zone: "hand" } },
  ]);
  if (絞った.length === 2) OK("一覧を絞る方も、公開されている2枚だけを落とす");
  else NG("filterTargetableTokens が " + 絞った.length + " 件を返した（期待 2）");
}

// ── ③ 読む側 ────────────────────────────────────────────────────
for (const f of ["src/card-effect-engine.js", "src/main.js"]) {
  const s = 読む(f);
  if (/import\s*\{[^}]*isTargetableToken[^}]*\}\s*from\s*"\.\/untargetable-cards\.js"/.test(s)) {
    OK(f + " が葉から isTargetableToken を読んでいる");
  } else {
    NG(f + " が葉から isTargetableToken を読んでいない");
  }
  if (/^\s*function (isTargetableToken|isProtectedCardKind)\s*\(/m.test(s)) {
    NG(f + " が判定の写しを持っている（葉1か所に集めること）");
  }
  // 🔴 古い判定（cardId だけ）を targeting に使っていないか。
  const 古 = (s.match(/isTargetableByOtherCardEffects\s*\(/g) || []).length;
  if (古 > 0) NG(f + " が古い判定（isTargetableByOtherCardEffects）を " + 古 + " か所で呼んでいる——公開されているかを見ていない");
  // 🔴 トークンではなく cardId を渡していないか。
  const 誤 = (s.match(/isTargetableToken\s*\(\s*\w+\.cardId\s*\)/g) || []).length;
  if (誤 > 0) NG(f + " が isTargetableToken に cardId を渡している（" + 誤 + " か所）——トークンを渡すこと");
}

// ── 🔴 ④ 委任タスクが lock の一覧を組むなら、判定を通す ──────────────────
const main = 読む("src/main.js");
const 行 = main.split("\n");
const 関数 = [];
{
  let 名 = null, 始 = 0;
  for (let i = 0; i < 行.length; i++) {
    const m = 行[i].match(/^(?:async )?function (run[A-Za-z0-9_]*Task)\s*\(/);
    if (!m) continue;
    if (名) 関数.push({ 名, 始 });
    名 = m[1];
    始 = i;
  }
  if (名) 関数.push({ 名, 始 });
}
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
  if (!/isTargetableToken/.test(本体)) 穴.push(f);
}
console.log("  ⓘ 委任タスク " + 関数.length + " 個のうち、ロックの一覧を組むのは " + 見た + " 個");
if (見た < 2) NG("ロックの一覧を組む委任タスクが " + 見た + " 個しか見つからない（数え方が壊れている）");
if (穴.length === 0) OK("ロックの一覧を組む委任タスクは、全部 判定を通している");
for (const f of 穴) NG("src/main.js:" + (f.始 + 1) + " " + f.名 + " が判定を通していない（公開されている札を捨てられる）");

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
    } else if (/isTargetableToken/.test(本体)) {
      OK("ゴメンナサイッ！の奪えるロックが判定を通している");
    } else {
      NG("ゴメンナサイッ！の奪えるロックに守りが無い");
    }
  }
}

// ── 🔴 ⑥ 手札側（公開ドローだけは守る）────────────────────────────
{
  const eng = 読む("src/card-effect-engine.js");
  const 定義 = /function 捨てられる手札\(player\) \{\s*\n\s*return getHandTokens\(player\)\.filter\(\(t\) => isTargetableToken\(t\)\);/;
  if (定義.test(eng)) OK("エンジンの『捨てられる手札』がトークンで判定している");
  else NG("エンジンの『捨てられる手札』が無い／トークンで判定していない");
  const 使用 = (eng.match(/捨てられる手札\(/g) || []).length - 1;
  console.log("  ⓘ エンジンで『捨てられる手札』を使っている所: " + 使用 + " か所");
  if (使用 >= 13) OK("捨てる／渡す動詞が、全部そこを通っている（13 か所以上）");
  else NG("『捨てられる手札』が " + 使用 + " か所でしか使われていない（13 か所以上のはず）");
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
  let 穴2 = 0;
  for (const [名, 説明] of 的) {
    const i = 行.findIndex((l) => new RegExp("^(?:async )?function " + 名 + "\\s*\\(").test(l));
    if (i < 0) { NG(名 + " が見つからない（名前が変わった？）"); 穴2++; continue; }
    let j = i + 1;
    for (; j < 行.length; j++) if (/^(?:async )?function [A-Za-z0-9_]+\s*\(/.test(行[j])) break;
    const 本体 = 行.slice(i, j).join("\n");
    if (!/isTargetableToken/.test(本体)) { NG("src/main.js:" + (i + 1) + " " + 名 + "（" + 説明 + "）が判定を通していない"); 穴2++; }
  }
  if (穴2 === 0) OK("手札から捨てる／奪う " + 的.length + " か所とも判定を通している");
}

if (落ちた > 0) {
  console.error("\n🔴 " + 落ちた + " 件。`src/untargetable-cards.js` の isTargetableToken(トークン) を通してください。");
  process.exit(1);
}
console.log("✅ 問題なし（判定の持ち主は1つ・読む側2ファイル・委任タスク " + 見た + " 個とも守られている）");
