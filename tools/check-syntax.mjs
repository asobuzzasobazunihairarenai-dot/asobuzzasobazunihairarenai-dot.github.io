// src/*.js が **ブラウザと同じ読み方（ESモジュール）で本当に構文が通るか**を見る。
//
// 【なぜ要るか・続き737 の実害】
// `card-pack-ui.js` の末尾に **`}` が1つ余った**（置換スクリプトの切り出しを1文字ずらした）。
// ところが:
//
//   $ node --check src/card-pack-ui.js
//   $ echo $?
//   0            ← 🔴 **通ってしまう**
//
//   ブラウザ:  import("/src/card-pack-ui.js") → SyntaxError: Unexpected token '}'
//              ＝**パックの画面が丸ごと開かない**
//
// 🔴 原因: `node --check` は拡張子が `.js` だと**まず CommonJS として**読む。
//   この形（余分な閉じ括弧）は CJS の読み方だと見逃される。**`.mjs` なら落ちる。**
//   つまり私がずっと頼りにしてきた `node --check src/*.js` には**穴がある**。
//
// ⇒ ここでは src/*.js を一時フォルダへ **`.mjs` として写してから** `node --check` する。
//   実行はしない（import ではないので localStorage 等に触れない＝副作用ゼロ）。
//
// ⚠ 取り出しに失敗したら終了コード2（空振りを合格にしない）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

let files;
try {
  files = fs.readdirSync(SRC).filter((f) => f.endsWith(".js"));
} catch (e) {
  console.error("🔴 src/ を読めなかった: " + e.message);
  process.exit(2);
}
if (files.length < 50) {
  console.error("🔴 src/*.js が " + files.length + " 件しか見つからない＝取り出しに失敗している");
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "so7-syntax-"));
const 失敗 = [];

function 見る(f) {
  return new Promise((resolve) => {
    const dst = path.join(tmp, f.replace(/\.js$/, "") + ".mjs");
    fs.copyFileSync(path.join(SRC, f), dst);
    execFile(process.execPath, ["--check", dst], (err, stdout, stderr) => {
      if (err) {
        const 文 = String(stderr || stdout || err.message)
          .split("\n")
          .filter((l) => /SyntaxError|\^|^\s*\d+\s*$/.test(l) || /Error/.test(l))
          .slice(0, 3)
          .join(" / ");
        失敗.push({ f, 文 });
      }
      resolve();
    });
  });
}

// 8本ずつ並行で（1本ずつだと 200 ファイルで数十秒かかる）。
const 並行 = 8;
const 列 = files.slice();
await Promise.all(
  Array.from({ length: 並行 }, async () => {
    for (;;) {
      const f = 列.shift();
      if (!f) return;
      await 見る(f);
    }
  })
);

try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (e) {
  /* 消せなくても検査の結果は変わらない */
}

if (失敗.length > 0) {
  for (const x of 失敗) console.error("🔴 src/" + x.f + " が ES モジュールとして読めない: " + x.文);
  console.error("→ ブラウザでは**そのファイルを使う機能が丸ごと起動しません**（import が落ちる）。");
  console.error("→ ⚠ `node --check src/xxx.js` は .js だと CommonJS で読むので**見逃します**。");
  process.exit(1);
}
console.log("✅ 問題なし（src/*.js " + files.length + " 件が ES モジュールとして構文が通る）");
