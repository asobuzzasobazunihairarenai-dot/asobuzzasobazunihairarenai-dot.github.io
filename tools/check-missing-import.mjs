// 「その行に来た瞬間に ReferenceError になる名前」を静的に見つける検査。
//
//   node tools/check-missing-import.mjs
//
// 【なぜ要るか】この事故は**2回起きている**:
//   ・続き782 … `BOARD_SIZE` を使ったが、そのファイルにも src のどこにも無かった
//   ・続き786 … `getEffectDelegationTarget()` を **import せずに呼んだ**
//   どちらも `check-undeclared.mjs`（未宣言の名前への**代入**だけを見る）を素通りし、
//   `node --check` も `npm test` もスモークも通る。**その行が実際に走るまで誰も気づかない。**
//
// 【なぜ正規表現でやるのか】この環境には JS の構文解析器が入っていない（node_modules は
//   playwright だけ）。勝手に依存を増やさない方針なので、**狙いを1つに絞って**精度を出す:
//
//   「**src の他のファイルが export している名前**を呼んでいるのに、
//     このファイルには宣言も import も無い」＝ import 漏れ。
//
// ⚠ **ALL_CAPS の定数（`BOARD_SIZE` の類）は見ていない。** 試したが、正規表現リテラルの中や
//   日本語の識別子の一部（`カード持ち物RPC`）まで拾って誤検知が残った。別の道が要る＝申し送り。
//
// 🔴 **誤検知を出さないために「宣言」は多めに拾う**（拾いすぎても見逃すだけで、嘘はつかない）。
// 🔴 **探し方が空振りすると「0件＝合格」になる**ので、まず「それらしい数が取れたか」を確かめる。
//
// ⚠ この道具を書く時に踏んだ罠（同じ所でまた転ばないように）:
//   ・コメントを消す時に**行の数を変えた** → 行がずれて1785件の嘘
//   ・`//.*$` が効かない（このリポジトリは **CRLF**。JS の `.` は `\r` に当たらない）→ 1784件の嘘
//   ・引用符を剥がす順（テンプレートを先に剥がすと、文中のバッククォートが始まりに見える）
//   ・import を貪欲に読むと**副作用だけの import を跨ぐ** → 名前の取りこぼし
//   ・import の中かっこに**コメント**が入っていると `[^}]*` が早く閉じる → 取りこぼし
import fs from "node:fs";
import path from "node:path";
import { stripJs } from "./js-strip.mjs";

const SRC = "src";
const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".js"))
  .map((f) => path.join(SRC, f));

const GLOBALS = new Set([
  "window","document","navigator","location","history","localStorage","sessionStorage","console",
  "Math","JSON","Date","Object","Array","String","Number","Boolean","Promise","Map","Set","Error",
  "RegExp","Symbol","Intl","URL","URLSearchParams","Blob","File","FormData","Image","Audio","Event",
  "CustomEvent","MouseEvent","PointerEvent","KeyboardEvent","TouchEvent","performance","crypto",
  "fetch","alert","confirm","prompt","setTimeout","setInterval","clearTimeout","clearInterval",
  "requestAnimationFrame","cancelAnimationFrame","requestIdleCallback","getComputedStyle","matchMedia",
  "structuredClone","globalThis","self","process","module","exports","screen","Notification","THREE",
  "undefined","NaN","Infinity","parseInt","parseFloat","isNaN","isFinite","encodeURIComponent",
  "decodeURIComponent","encodeURI","decodeURI","queueMicrotask","btoa","atob","AbortController",
  "Request","Response","Headers","WebSocket","Worker","MutationObserver","ResizeObserver",
  "IntersectionObserver","DOMParser","XMLHttpRequest","ImageData","OffscreenCanvas","WeakMap","WeakSet",
  "Proxy","Reflect","BigInt","ArrayBuffer","Uint8Array","Uint8ClampedArray","Int32Array","Float32Array",
  "Float64Array","DataView","TextEncoder","TextDecoder","HTMLElement","Node","Element","AudioContext",
  "speechSynthesis","SpeechSynthesisUtterance","indexedDB","caches","ReadableStream","AbortSignal",
  "if","for","while","switch","catch","return","typeof","new","await","function","super","import",
  "export","do","else","try","finally","case","yield","void","delete","in","of","class","this",
]);

// 🔴 コメントと文字列は **tools/js-strip.mjs**（1文字ずつ読む切り分け器）に任せる。
//   正規表現で剥がすのは**原理的に無理**だった（上の「踏んだ罠」参照）。
//   位置も行数も変わらないので、行番号はそのまま使える。
function 素にする(src) {
  return stripJs(src);
}

// そのファイルで「見える」名前を**多めに**拾う。
function 見える名前(src素, src生) {
  const srcImp = src素; // import も切り分け済みのものから読んでよい（コメントは消えている）
  const s = new Set();
  const add = (n) => {
    if (/^[A-Za-z_$][\w$]*$/.test(n)) s.add(n);
  };
  // import（中かっこで区切る＝1つの文の中で必ず閉じるので、次の文を跨がない）
  for (const m of srcImp.matchAll(/import\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      add(part.includes(" as ") ? part.split(" as ").pop().trim() : part.trim());
    }
  }
  for (const m of srcImp.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) add(m[1]);
  for (const m of srcImp.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  // 宣言・関数・クラス
  for (const m of src素.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  // 分割代入・短縮形・引数（まとめて雑に）
  // 🔴 終わりの区切りは**食べない**（先読み）。食べると `{ a, b }` の `b` が読めない
  //   ——`a` の後ろの `,` を消費してしまい、`b` の前に区切りが無くなるため。
  //   実害: 動的 import（`const { startCpuBattle, runCpuBattleSetup } = await import(…)`）の
  //   **2つ目以降**が「import していない」と9件の嘘になった（実測）。
  for (const m of src素.matchAll(/[{,(]\s*\.{0,3}\s*([A-Za-z_$][\w$]*)\s*(?=[,})\]:=]|$)/gm)) add(m[1]);
  for (const m of src素.matchAll(/\(([^()]*)\)/g)) {
    for (const p of m[1].split(",")) add(p.split(":").pop().split("=")[0].trim().replace(/^\.{3}/, ""));
  }
  for (const m of src素.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) add(m[1]);
  for (const m of src素.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of src素.matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)) add(m[1]);
  return s;
}

// ── src 全体の export 名（名前 -> それを export しているファイル）────────────────
const 公開 = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (!公開.has(m[1])) 公開.set(m[1], f);
  }
}
if (公開.size < 100) {
  console.log(`❌ 検査そのものが怪しい: src の export が ${公開.size} 件しか取れない（探し方が合っていない可能性）`);
  process.exit(2);
}

const 問題 = [];
let 調べた = 0;

for (const f of files) {
  const 生 = fs.readFileSync(f, "utf8");
  const 素 = 素にする(生);
  const ある = 見える名前(素, 生);
  const lines = 素.split("\n");
  const 生行 = 生.split("\n");
  lines.forEach((line, k) => {
    for (const m of line.matchAll(/(^|[^\w$.?])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = m[2];
      if (GLOBALS.has(name)) continue;
      const どこ = 公開.get(name);
      if (!どこ || どこ === f) continue;
      調べた++;
      if (ある.has(name)) continue;
      問題.push(
        `${f}:${k + 1}  ${name}() を import していない（${どこ} が export している）  | ${String(生行[k] ?? "").trim().slice(0, 90)}`
      );
    }
  });
}

if (問題.length === 0) {
  console.log(`✅ 問題なし（src ${files.length} ファイル／よその export を呼ぶ所 ${調べた} 件・export ${公開.size} 名）`);
  process.exit(0);
}
console.log(`❌ ${問題.length} 件`);
for (const p of 問題.slice(0, 40)) console.log("  - " + p);
if (問題.length > 40) console.log(`  …ほか ${問題.length - 40} 件`);
process.exit(1);
