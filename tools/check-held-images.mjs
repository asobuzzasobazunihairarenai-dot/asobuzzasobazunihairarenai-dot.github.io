// 【続き755】`registerHeldImage(鍵, 絵のパス, MB)` に書いた MB が、**絵の実寸と合っているか**。
//
// 🔴 なぜ機械で数えるのか
//   不具合報告の `imgMB` は `document.getElementsByTagName("img")` を舐めただけなので、
//   **CSS の背景**と **new Image() の先読み**は1MBも数えていない。
//   続き643 で「勝利サマリの先読み＝どの計器にも写らない数十MBの山」を踏んだのに、
//   同じ形がホーム背景の先読み（6.0MB）として残っていた。
//   ⇒ 抱えている側が `registerHeldImage` で名乗る形にした（走査は無し＝ただ）。
//   ⚠ ただし MB は**人が書き写した数字**。絵を差し替えて寸法が変わると、
//     **計器だけが古い数字を言い続ける**＝嘘の計器になる。だから毎回突き合わせる。
//
// ⓘ 見るのは3つ:
//   ① 書いた絵のパスが本当に在るか
//   ② 書いた MB が **幅×高さ×4バイト**（#223）と合っているか（1割まで許す）
//   ③ 名乗った鍵が、**手放す側（releaseHeldImage）にもそろっているか**
//      （名乗ったまま手放し忘れると、画面から消えても計器だけが抱え続ける）
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));
// 第1引数で別のフォルダを見られる（わざと崩した写しに当てて、本当に落ちるかを確かめるため）。
const SRC = process.argv[2] || "src";

/** webp / png / jpeg の寸法をヘッダから読む（decode しない）。 */
function 寸法(fp) {
  let b;
  try {
    b = fs.readFileSync(fp);
  } catch {
    return null;
  }
  if (b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP") {
    const t = b.slice(12, 16).toString("ascii");
    if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (t === "VP8L") {
      const v = b.readUInt32LE(21);
      return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
    }
    return null;
  }
  if (b.slice(1, 4).toString("ascii") === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

// ⚠ コメントの中の呼び出しを数えないよう、行コメントとブロックコメントを空白にする
//   （続き746「コメントで通る検査は無い方がまし」の裏返し。行番号は保つ）。
function コメントを消す(src) {
  let out = "";
  let i = 0;
  let 状態 = "code";
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (状態 === "code") {
      if (c === "/" && c2 === "/") { 状態 = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && c2 === "*") { 状態 = "block"; out += "  "; i += 2; continue; }
      if (c === "'") 状態 = "sq";
      else if (c === '"') 状態 = "dq";
      else if (c === "`") 状態 = "tpl";
      out += c; i += 1; continue;
    }
    if (状態 === "line") {
      if (c === "\n") { 状態 = "code"; out += c; i += 1; continue; }
      out += " "; i += 1; continue;
    }
    if (状態 === "block") {
      if (c === "*" && c2 === "/") { 状態 = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i += 1; continue;
    }
    if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue; }
    if ((状態 === "sq" && c === "'") || (状態 === "dq" && c === '"') || (状態 === "tpl" && c === "`")) 状態 = "code";
    out += c; i += 1;
  }
  return out;
}

let NG = 0;
const 落とす = (s) => { NG += 1; console.error("  ❌ " + s); };

const 名乗り = [];
const 手放し = new Set();
for (const f of fs.readdirSync(path.join(ROOT, SRC))) {
  if (!f.endsWith(".js")) continue;
  const rel = SRC + "/" + f;
  const src = コメントを消す(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n"));
  const 行たち = src.split("\n");
  for (let i = 0; i < 行たち.length; i += 1) {
    // 1行でも、改行をまたいでいても拾えるように、その行から3行ぶんを見る。
    const 窓 = 行たち.slice(i, i + 3).join(" ");
    const m = 窓.match(/registerHeldImage\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*([0-9.]+)\s*\)/);
    if (m && /registerHeldImage\(/.test(行たち[i])) {
      名乗り.push({ 鍵: m[1], 絵: m[2], MB: Number(m[3]), どこ: rel + ":" + (i + 1) });
    }
    const r = 窓.match(/releaseHeldImage\(\s*["']([^"']+)["']\s*\)/);
    if (r && /releaseHeldImage\(/.test(行たち[i])) 手放し.add(r[1]);
  }
}

console.log("[check-held-images] <img> でも canvas でもない画像の名乗り");

if (名乗り.length === 0) {
  console.error("  ❌ registerHeldImage の呼び出しが1件も見つかりません（名前が変わった？）");
  process.exit(2);
}

for (const x of 名乗り) {
  const d = 寸法(path.join(ROOT, x.絵));
  if (!d) {
    落とす(`${x.どこ}: 絵が読めません（${x.絵}）。消した／移した？`);
    continue;
  }
  const 実MB = (d[0] * d[1] * 4) / 1048576;
  const ずれ = Math.abs(実MB - x.MB) / 実MB;
  if (ずれ > 0.1) {
    落とす(
      `${x.どこ}: 書いてある ${x.MB}MB と実寸が合いません。` +
        `${x.絵} は ${d[0]}x${d[1]} ＝ ${Math.round(実MB * 100) / 100}MB（幅×高さ×4バイト）⇒ ${Math.round(実MB * 100) / 100} に直すこと`
    );
    continue;
  }
  if (!手放し.has(x.鍵)) {
    落とす(`${x.どこ}: 鍵 "${x.鍵}" を名乗っているのに releaseHeldImage("${x.鍵}") がどこにも無い＝手放し忘れ`);
    continue;
  }
  console.log(`  ✅ ${x.鍵.padEnd(20)} ${x.絵.padEnd(28)} ${d[0]}x${d[1]} = ${Math.round(実MB * 100) / 100}MB（書いてある ${x.MB}MB）`);
}

// 逆（手放す側だけ在る）は害が無いので知らせるだけ。
for (const k of 手放し) {
  if (!名乗り.some((x) => x.鍵 === k)) console.log(`  ⓘ "${k}" は手放す側だけ在る（名乗りが消えた？ 害は無い）`);
}

console.log(NG === 0 ? `✅ 問題なし（${名乗り.length} 件）` : `❌ ${NG} 件`);
process.exit(NG === 0 ? 0 : 1);
