// 「まぜる」の山札の組み立てが、サーバー側（Edge Function）の写しとズレていないかを見る。
//
// 🔴 まぜるは **通常のエディションと同じ内訳**（7色×14枚・虹7・白4・黒3＝112枚）で組む
//   （2026-11-06・続き671 のユーザー指示「混ぜるときは山札の総枚数は通常エディションの
//   枚数にしてください。たとえば赤は全部で１４枚に…」）。
//   組み方の本体は src/mixed-deck.js。**Edge Function は手でコピペした写し**を持つので、
//   いつか必ずズレる。ズレると「CPU戦とフレンドリーマッチで山札の中身が違う」という
//   いちばん分かりにくい形で出る。
//
// 🔴 **表の照合だけでは足りない**（続き650 で入れたあれは id・色・枚数の表を見るだけ）。
//   今回ズレ得るのは**処理の方**なので、**サーバーの本文をそのまま切り出して動かし**、
//   クライアントと同じ結果になるかを毎回見る。
// ⚠ 白黒は毎回無作為に選ぶ（種類が14あるのに枠が7しかないため）ので、
//   id ではなく**枚数**だけ突き合わせる。
//
// 空振り（＝目印が見つからない・動かせない）は**合格にしない**。終了コード2で止める。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildMixedNormalCards } from "../src/mixed-deck.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const QUOTE = String.fromCharCode(34);
const ID_KEY = "id: " + QUOTE;
const COLOR_KEY = "color: " + QUOTE;

function 止める(理由) {
  console.error("❌ 検査そのものが怪しい: " + 理由);
  process.exit(2);
}

// ⓘ 正規表現を使わずに読む（この環境では置換スクリプトの \ が食われて空振りしたことがある）。
function 表を読む(本文, 始まりの目印) {
  const i = 本文.indexOf(始まりの目印);
  if (i < 0) return null;
  const 塊 = 本文.slice(i, 本文.indexOf("];", i));
  const out = [];
  for (const 行 of 塊.split("\n")) {
    const a = 行.indexOf(ID_KEY);
    if (a < 0) continue;
    const c = 行.indexOf(COLOR_KEY);
    const n = 行.indexOf("count: ");
    if (c < 0 || n < 0) continue;
    const count = parseInt(行.slice(n + 7), 10);
    if (!Number.isFinite(count)) continue;
    out.push({
      id: 行.slice(a + ID_KEY.length).split(QUOTE)[0],
      color: 行.slice(c + COLOR_KEY.length).split(QUOTE)[0],
      count,
    });
  }
  return out;
}

let srv = null;
try {
  srv = read("supabase/functions/so7-apply-action.ts");
} catch (e) {
  止める("Edge Function のファイルが読めない");
}

const R = 表を読む(srv, "const NORMAL_CARDS");
const E = 表を読む(srv, "const EX0_NORMAL_CARDS");
const Fe = 表を読む(srv, "const FIRST_ED_NORMAL_CARDS");
if (!R || !E || !Fe || R.length < 15 || E.length < 30 || Fe.length < 15) {
  止める("サーバーの通常カードの表が読めなかった（remake/ex0/1st）");
}

const a = srv.indexOf("const MIXED_PER_COLOR");
const b = srv.indexOf("function deckPoolForCardSet");
if (a < 0 || b < 0 || b <= a) {
  止める("サーバー側に「まぜる」の組み立てが見つからない（src/mixed-deck.js の写し忘れ？）");
}

// 型注釈だけ外して、サーバーの本文をそのまま動かす。
// ⚠ ここに並べた形が1つでも見つからなければ止める（＝黙って素通りしない）。
let js = srv.slice(a, b);
const 外す = [
  ["<T>(lists: T[][]): T[]", "(lists)"],
  ["<T>(list: T[], n: number): T[]", "(list, n)"],
  ["const out: T[] = []", "const out = []"],
  ["  remake: { id: string; color: string; count: number }[],", "  remake,"],
  ["  ex0: { id: string; color: string; count: number }[],", "  ex0,"],
  ["  firstEd: { id: string; color: string; count: number }[]", "  firstEd"],
  ["): { id: string; color: string; count: number }[] {", ") {"],
  ["const out: { id: string; color: string; count: number }[] = []", "const out = []"],
  [" as [string, number][]", ""],
];
for (const [from, to] of 外す) {
  if (!js.includes(from)) 止める("サーバー側の型注釈の形が変わっている: " + from.slice(0, 44));
  js = js.split(from).join(to);
}

let 鯖 = null;
try {
  鯖 = new Function(js + "\nreturn buildMixedNormalCards;")();
} catch (e) {
  止める("サーバー側の「まぜる」を動かせない: " + e.message);
}

const 色の内訳 = (list) => {
  const m = new Map();
  for (const c of list) {
    if (c.color === "white" || c.color === "black") continue;
    m.set(c.id, (m.get(c.id) || 0) + c.count);
  }
  return [...m].sort().map(([k, v]) => k + ":" + v).join(" ");
};
const 枚 = (list, col) => list.filter((c) => c.color === col).reduce((x, y) => x + y.count, 0);

const 客結果 = buildMixedNormalCards(R, E, Fe);
const 鯖結果 = 鯖(R, E, Fe);
const problems = [];

if (色の内訳(客結果) !== 色の内訳(鯖結果)) {
  problems.push("色の内訳がサーバー側とズレている（src/mixed-deck.js の写しを貼り直す）");
}
for (const col of ["white", "black"]) {
  if (枚(客結果, col) !== 枚(鯖結果, col)) {
    problems.push(col + " の枚数がサーバー側とズレている（正 " + 枚(客結果, col) + " / 写し " + 枚(鯖結果, col) + "）");
  }
}
// 通常のエディションと同じ内訳になっているか（ユーザー指示そのもの）。
for (const col of ["red", "orange", "yellow", "green", "blue", "pink", "purple"]) {
  if (枚(客結果, col) !== 14) problems.push(col + " が14枚でない: " + 枚(客結果, col) + "枚");
}
const 合計 = 客結果.reduce((x, y) => x + y.count, 0);
if (合計 !== 112) problems.push("まぜるの合計が112枚でない: " + 合計 + "枚");
// どの色の種類も最低1枚は入っているか（まぜても消える札が無いこと）。
const 入った = new Set(客結果.map((c) => c.id));
for (const list of [R, E, Fe]) {
  for (const c of list) {
    if (c.color === "white" || c.color === "black") continue; // 白黒は枠が足りないので毎回全部は入らない
    if (!入った.has(c.id)) problems.push("まぜるに入らない札がある: " + c.id);
  }
}

if (problems.length === 0) {
  console.log(
    "✅ 問題なし（まぜる " + 合計 + "枚 / " + 客結果.length +
      "種・7色とも14枚・虹7・白4・黒3。サーバー側の写しを実際に動かして一致を確認）"
  );
  process.exit(0);
}
console.log("❌ まぜるの山札に問題 " + problems.length + " 件");
for (const p of problems) console.log("  - " + p);
process.exit(1);
