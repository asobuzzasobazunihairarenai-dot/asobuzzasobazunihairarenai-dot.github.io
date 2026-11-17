// 【続き746】「いま選ぶ権利を持っている席」が、効果エンジンの入口すべてで立っているかを見る。
//
// 🔴 なぜ要るか（#706 の正体。#471・#483・#501・#506・#496・#600 と同じ形で7回出た）:
//   カード効果の最中は「**選ぶ人**」と「**優先権の持ち主**」が別人になり得る。
//     ・強制移動で相手の駒が動く（動かされた本人が到達する）
//     ・入れ替え・他人の駒を動かす効果
//     ・委任（ヤエザ・パーティ・役人…）
//     ・相手の手番に割り込んで使う手札効果（リトルマウス）
//   ところが選択モーダルの出し先は、席が渡されない時**優先権の持ち主**で決まっていた。
//   ⇒ 「相手（CPU）が選ぶはずの画面が、こちらに出る」「こちらが選ぶはずの画面が、
//     CPU のものとして勝手に自動解決される」が**両方向に**起きる。
//
//   直し方は「呼び出し側に席を渡して回る」ではなく、**入口で席を立てる**。
//   main.js には effectChoiceSeatOverride（＝いま選ぶ権利を持つ席）があり、
//   pickerOwner() と isCpuSelectingNow() がそれを見る。立てるのは入口の責務。
//
//   🔴 実際に、入口4つのうち**到達効果だけが立てていなかった**（続き746 で判明）。
//     手札効果・委任・【状況】カードは立てていたので、**同じカードでも到達で発動した時だけ**
//     選択が別人に出る、という最も分かりにくい形になっていた。
//
// ⇒ この検査は「エンジンを走らせる所は、必ず席を立ててから走らせ、finally で戻す」を数える。
//   新しい入口を足した時に立て忘れたら、ここで落ちる。
//
// ⚠ 0しか出ない検査ではない: 立てている3行を消すと、その入口を名指しで落ちる
//   （続き746 で実際に試して確かめてある）。

import fs from "node:fs";
import path from "node:path";

const 根 = path.resolve(path.join(import.meta.dirname, ".."));
const main = fs.readFileSync(path.join(根, "src/main.js"), "utf8");

let NG = 0;
const 落ちる = (...a) => { NG++; console.log("🔴 " + a.join("")); };

// ── エンジンを走らせる入口（ここを通ると、プレイヤーに選択を聞き得る）────────
const 入口 = [
  { 呼ぶ: "runArrivalEffect(", 何: "到達効果" },
  { 呼ぶ: "runHandEffect(", 何: "手札効果" },
  { 呼ぶ: "runSituationEffect(", 何: "【状況】カード" },
  { 呼ぶ: "delegateToPlayerForEffect__inner(", 何: "委任（他の人に選ばせる）" },
];

// その位置を含む、いちばん外側の関数の本体を取る
const 行頭の関数 = [...main.matchAll(/^(?:export )?(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)];
function 包んでいる関数(位置) {
  let 前 = null;
  for (const m of 行頭の関数) {
    if (m.index > 位置) break;
    前 = m;
  }
  if (!前) return null;
  // 関数の本体（波括弧の対応で終わりを探す）
  const 開き = main.indexOf("{", main.indexOf(")", 前.index));
  let d = 0;
  for (let i = 開き; i < main.length; i++) {
    const c = main[i];
    if (c === "{") d++;
    else if (c === "}") {
      d--;
      if (d === 0) {
        if (i < 位置) return null; // この位置はその関数の外（取り違え）
        return { 名: 前[1], 本体: main.slice(開き, i + 1), 行: main.slice(0, 前.index).split("\n").length };
      }
    }
  }
  return null;
}

console.log("効果の「選ぶ権利を持つ席」の数え合わせ");

let 見た = 0;
for (const { 呼ぶ, 何 } of 入口) {
  const 場所 = [];
  let i = -1;
  while ((i = main.indexOf(呼ぶ, i + 1)) >= 0) {
    // 定義・import・コメントの中は数えない（呼び出しだけ）
    const 行頭から = main.lastIndexOf("\n", i) + 1;
    const 行 = main.slice(行頭から, main.indexOf("\n", i));
    if (/^\s*(\/\/|\*)/.test(行)) continue;
    if (/\bfunction\s+$/.test(main.slice(Math.max(0, i - 30), i))) continue;
    場所.push(i);
  }
  if (場所.length === 0) {
    console.log("🔴 " + 何 + " の入口（" + 呼ぶ + "）が main.js に1つも見つからない＝この検査は空振りしている");
    process.exit(2);
  }
  for (const 位置 of 場所) {
    const f = 包んでいる関数(位置);
    if (!f) {
      console.log("🔴 " + 呼ぶ + "（" + main.slice(0, 位置).split("\n").length + "行目）を包む関数が取れない＝切り出しに失敗している");
      process.exit(2);
    }
    見た++;
    // ⚠ このコードベースには `◯◯` が席を立てて `◯◯__inner` を呼ぶ形が何か所もある
    //   （resolveSituationAtTurnStart / delegateToPlayerForEffect / requestCellChoiceForEffect …）。
    //   包んでいる関数が `__inner` なら、**包み側も一緒に見る**（見ないと誤検知になる）。
    const 包み = f.名.endsWith("__inner")
      ? 包んでいる関数(main.indexOf("\n", main.indexOf("function " + f.名.replace(/__inner$/, "") + "(")))
      : null;
    const 両方 = f.本体 + (包み?.本体 ?? "");
    const 立てる = 両方.includes("effectChoiceSeatOverride =");
    const 戻す = /finally\s*\{[^}]*effectChoiceSeatOverride\s*=/.test(両方);
    if (!立てる) {
      落ちる(
        何 + "を走らせる `" + f.名 + "`（" + f.行 + "行目）が、**選ぶ権利を持つ席を立てていない**。\n" +
        "   ⇒ そこから出る選択モーダル・案内は「その時の優先権の持ち主」に向いてしまう。\n" +
        "      到達した人・動かされた人・委任された人と優先権の持ち主が違う場面で、\n" +
        "      **別人の画面に選択が出る**か、**こちらの選択が勝手に自動解決される**（#706 の形）。\n" +
        "   直し方: エンジンを呼ぶ前に\n" +
        "      const 前の選ぶ席 = effectChoiceSeatOverride;\n" +
        "      effectChoiceSeatOverride = player ?? 前の選ぶ席;\n" +
        "   を置き、**必ず finally で戻す**。"
      );
    } else if (!戻す) {
      落ちる(
        何 + "を走らせる `" + f.名 + "`（" + f.行 + "行目）は席を立てているが、**finally で戻していない**。\n" +
        "   ⇒ 途中で例外が出ると、**以降ずっと別人が選ぶ**ことになる（#471 で実害）。"
      );
    }
  }
}

// ── 既定値そのものが正しいか（続き746 で直した所を戻されないように）──────────
const 既定 = /const seat = owner \?\? effectChoiceSeatOverride \?\? getState\(\)\.priorityPlayer;/.test(main);
if (!既定) {
  落ちる(
    "isCpuSelectingNow の既定値が `owner ?? effectChoiceSeatOverride ?? priorityPlayer` ではない。\n" +
    "   ⇒ 席を渡さない呼び方（色宣言モーダル・置き場所モーダル・候補の光・選択の案内）が、\n" +
    "      また「優先権の持ち主」で判断するようになる＝#706 の再発。"
  );
}

if (NG === 0) console.log("  ✅ エンジンの入口 " + 見た + " か所すべてが、選ぶ権利を持つ席を立てて finally で戻している");
process.exit(NG ? 1 : 0);
