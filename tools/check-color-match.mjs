// 🔴【#878・続き895】「色が同じか」を見る所が、**なないろの欠片を拾っているか**を見張る。
//
// 【なぜ要るか】なないろの欠片は **★これはすべての色である**（docs/cards.md）。
// ところがこの決まりは `card-effect-engine.js` の中に何度も書き写されていて、
// **書き写すたびに1つずつ欠けた**:
//
//   #584（続き837） セレナーデの追色で、欠片を数えていなかった
//   #878（続き895） 志炎者の到達で、欠片しか持っていない人が**聞かれないまま不発**
//   同上           強欲なパレット■ の「宣言色の１枚」／【志炎】の窓
//
// engine の `cardMatchesColor` のすぐ上には「**色を突き合わせる所を足したら、必ず欠片の
// 例外を書く**」と**書いてあった**。人任せの約束は3か所で破れたので、機械で見る。
//
// 【決まり】engine の中で色を `===` / `!==` で突き合わせている行は、
//   ① `cardMatchesColor(` か `colorsMatch(` を通っている（＝判定が1か所）か
//   ② 下の名簿に**理由つき**で載っている（一致の話ではない所）
// のどちらかでなければならない。
//
// ⚠ 名簿が古くなったら落ちる（データから消えた行が名簿に残っていたら止まる）
//   ——でないと、直した後も外されたままで次の取りこぼしを見逃す。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripJs } from "./js-strip.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 道 = "src/card-effect-engine.js";

// 🔴 一致の話ではないので見ない所。**理由を書けない行は外さない**（それは不具合）。
//   いまは1行も無い（全部、判定を通すか欠片の例外を直に書いている）。
const 外す = [];

const 生 = fs.readFileSync(path.join(ROOT, 道), "utf8");
const 行 = 生.split(/\r?\n/);
const 素 = stripJs(生).split(/\r?\n/); // コメントと文字列を落とした版（コメントの例文に当たらないように）

const 問題 = [];
let 見た = 0;
let 通した = 0;
const 使った外す = new Set();

素.forEach((l, i) => {
  // 色を突き合わせている形は2つ: `…color === x` と `…includes(…color)`
  if (!/\.color\s*(===|!==)/.test(l) && !/includes\(.*\.color/.test(l)) return;
  const 本物 = 行[i];
  見た++;
  const 外すの = 外す.find((x) => 本物.includes(x.印));
  if (外すの) { 使った外す.add(外すの.印); return; }
  // その行の前後6行（＝1つの式のかたまり）に、判定か欠片の例外が在るか
  const 窓 = 行.slice(Math.max(0, i - 6), i + 3).join(" ");
  if (/cardMatchesColor\(|colorsMatch\(/.test(窓)) { 通した++; return; }
  if (/rainbow-shard/.test(窓)) { 通した++; return; } // 直に書いてある（許すが、寄せる方が良い）
  問題.push(道 + ":" + (i + 1) + "  " + 本物.trim().slice(0, 100));
});

// 判定そのものが在るか（0しか出ない検査にしない）
if (!/function cardMatchesColor\(/.test(生)) 問題.push("cardMatchesColor が無い（判定の持ち主が消えた）");
if (!/function colorsMatch\(/.test(生)) 問題.push("colorsMatch が無い（色の値どうしの判定が消えた）");
if (見た < 3) 問題.push("色を突き合わせている行が " + 見た + " 行しか見つからない（数え方が壊れている）");

// 名簿が古くなっていないか
for (const x of 外す) {
  if (!使った外す.has(x.印)) 問題.push("名簿の行が、もうコードに無い: " + x.印 + "（" + x.訳 + "）");
}

if (問題.length) {
  console.error("❌ 色の突き合わせに問題 " + 問題.length + " 件");
  for (const p of 問題) console.error("  🔴 " + p);
  console.error("  ⇒ なないろの欠片は★すべての色です。cardMatchesColor（カード）か colorsMatch（色の値）を使ってください。");
  process.exitCode = 1;
} else {
  console.log("✅ 問題なし（色を突き合わせている " + 見た + " 行。判定を通している " + 通した + " 行・一致の話でない " + 外す.length + " 行）");
}
