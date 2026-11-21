// 🔴🔴 カード効果エンジンの中で「**どこにも無い名前**」を呼んでいないか見る検査（23本目）。
//
// 【なぜ要るか】2026-11-21（続き797）までに**同じ罠を3回**踏んだ:
//   ・続き789 … `flipToFaceUp` / `triggerArrivalAt`（本物は別名）
//   ・続き782 … `BOARD_SIZE`（どこにも無い）
//   ・続き796 … `topCardTokenAt`（置換が片方しか当たらず残った）
//
// 🔴 **どれも「静かに何も起きない」形で表に出る。**
//   `runActionSafely` は例外を catch してログに流すだけなので、プレイヤーには
//   「効果が不発だった」としか見えない（#477 の報告がまさにそれ）。
//   実際、続き796 では**実測が「pickLocation が1回」と出るまで3回も原因を取り違えた**。
//
// 【既にある検査では捕まらない理由】
//   ・`check-missing-import` … 「**よそが export している名前**」しか見ない
//     ⇒ どこにも無い名前は素通り。
//   ・`check-undeclared` … **代入**しか見ない ⇒ 呼び出しは素通り。
//   ・`check-effect-helpers` … `helpers.xxx` だけ ⇒ エンジン内部の関数は見ない。
//
// 【なぜエンジンだけに絞るか】
//   src 全体に当てると 54件 出て、そのほとんどが
//   「組み込み（`Uint8Array` 等）」と「引数・分割代入の取りこぼし」＝**誤検知**だった。
//   エンジンは**関数が素直に並ぶ1枚のファイル**なので誤検知が出ない（実測0件）。
//   ⇒ まず**いちばん踏んでいる所**だけを見る。広げるのは誤検知を潰してから。
import fs from "node:fs";
import path from "node:path";
import { stripJs } from "./js-strip.mjs";

const 対象 = ["src/card-effect-engine.js"];
const srcDir = "src";

// src 全体の export 名（よそから来ている名前は import 漏れの検査の担当なので、ここでは見逃す）
const 公開 = new Set();
for (const f of fs.readdirSync(srcDir).filter((x) => x.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(srcDir, f), "utf8");
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) 公開.add(m[1]);
}
if (公開.size < 100) {
  console.log(`❌ 検査そのものが怪しい: src の export が ${公開.size} 件しか取れない`);
  process.exit(2);
}

// 組み込み（ブラウザ／JS）。⚠ 足りないと**嘘の指摘**になるので、迷ったら入れる側に倒す。
const GLOBALS = new Set(
  ("Array Object String Number Boolean Symbol BigInt Math JSON Date RegExp Error TypeError RangeError Map Set WeakMap WeakSet " +
    "Promise Proxy Reflect parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI " +
    "structuredClone queueMicrotask setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame " +
    "fetch alert confirm prompt console document window navigator location localStorage sessionStorage history screen performance " +
    "crypto Image Audio Blob File FileReader FormData Headers Request Response URL URLSearchParams AbortController ClipboardItem " +
    "CustomEvent Event PointerEvent MouseEvent KeyboardEvent TouchEvent MutationObserver IntersectionObserver ResizeObserver " +
    "Intl Notification ServiceWorker WebSocket Worker OffscreenCanvas Path2D DOMParser XMLHttpRequest CSS " +
    "Uint8Array Uint8ClampedArray Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array ArrayBuffer DataView " +
    "TextEncoder TextDecoder createImageBitmap DOMMatrix DOMMatrixReadOnly requestIdleCallback matchMedia getComputedStyle atob btoa " +
    "if for while switch catch return typeof instanceof new delete void in of do else try finally throw yield await async function class const let var"
  ).split(/\s+/)
);

const 問題 = [];
let 調べた = 0;
for (const f of 対象) {
  const 生 = fs.readFileSync(f, "utf8");
  const 素 = stripJs(生);
  const 生行 = 生.split("\n");

  // そのファイルで「在る」名前を**多めに**拾う（拾いすぎても見逃すだけで、嘘はつかない）。
  const ある = new Set();
  for (const m of 素.matchAll(/(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) ある.add(m[1]);
  for (const m of 素.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const p of m[1].split(",")) {
      const n = p.trim().split(/\s+as\s+/).pop().trim();
      if (n) ある.add(n);
    }
  }
  for (const m of 素.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) ある.add(m[1]);
  for (const m of 素.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) ある.add(m[1]);
  // 引数名（かっこの中をざっくり）・分割代入
  for (const m of 素.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    for (const p of m[1].split(",")) {
      const n = p.trim().replace(/[={].*$/, "").replace(/^\.\.\./, "").trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) ある.add(n);
    }
  }
  for (const m of 素.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const p of m[1].split(",")) {
      const n = p.trim().split(/[:=]/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) ある.add(n);
    }
  }

  素.split("\n").forEach((line, k) => {
    for (const m of line.matchAll(/(^|[^\w$.?])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = m[2];
      if (GLOBALS.has(name)) continue;
      if (ある.has(name)) continue;
      調べた++;
      if (公開.has(name)) continue; // よそから来ている＝import 漏れの検査の担当
      問題.push(`${f}:${k + 1}  ${name}() はどこにも無い名前  | ${String(生行[k] ?? "").trim().slice(0, 90)}`);
    }
  });
}

if (問題.length === 0) {
  console.log(`✅ 問題なし（${対象.join(" / ")}：どこにも無い名前の呼び出しは 0 件）`);
  process.exit(0);
}
console.log(`❌ ${問題.length} 件`);
for (const p of 問題) console.log("  - " + p);
console.log("");
console.log("🔴 どこにも無い名前を呼ぶと、runActionSafely が例外を握りつぶして");
console.log("   **「静かに何も起きない」**形で表に出る（プレイヤーには『不発』にしか見えない）。");
process.exit(1);
