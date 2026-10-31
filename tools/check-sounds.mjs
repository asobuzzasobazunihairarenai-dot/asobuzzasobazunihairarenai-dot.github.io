// 効果音の名前とファイルの照合。
//
// 【なぜ道具にしたか・2026-10-31】`playSound("名前")` は、名前が登録に無いと
// **何も言わずに return する**（sound.js: `if (!def) return;`）。つまりタイプミスは
// エラーにならず「その音だけ鳴らない」という形で出る——しかも鳴らないことに気づくのは
// 実際にその場面に到達した人だけ。勝利演出のように**数分の対局の最後にしか来ない場面**だと、
// 何週間も気づけない（#385 の七色の衝撃波が2週間以上白いままだったのと同じ形）。
//
// 見るもの:
//   ① src の中の `playSound("名前")` が、全部 SOUND_DEFS に在るか
//   ② SOUND_DEFS の `path` のファイルが、全部ディスクに在るか
//
// 終了コード: 0=合格 / 1=問題あり / 2=検査そのものが失敗（探し方が空振り）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const SRC = path.join(ROOT, "src");

let soundJs;
try {
  soundJs = fs.readFileSync(path.join(SRC, "sound.js"), "utf8");
} catch (e) {
  console.error("❌ src/sound.js を読めない: " + e.message);
  process.exit(2);
}

// ① 登録されている名前と path を取り出す
const defsStart = soundJs.indexOf("const SOUND_DEFS = {");
if (defsStart < 0) {
  console.error("❌ SOUND_DEFS が見つからない。検査が当たっていない疑い。");
  process.exit(2);
}
const defsEnd = soundJs.indexOf("\n};", defsStart);
if (defsEnd < 0) {
  console.error("❌ SOUND_DEFS の終わりが見つからない。検査が当たっていない疑い。");
  process.exit(2);
}
const defsText = soundJs.slice(defsStart, defsEnd);
const defs = new Map();
for (const m of defsText.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{\s*path:\s*"([^"]+)"/gm)) {
  defs.set(m[1], m[2]);
}
if (defs.size < 5) {
  console.error("❌ 登録を " + defs.size + " 件しか取り出せなかった。検査が当たっていない疑い。");
  process.exit(2);
}

// ② src 全体から playSound("名前") を集める
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".js"));
const used = new Map(); // 名前 -> どのファイルで使われたか
for (const f of files) {
  const s = fs.readFileSync(path.join(SRC, f), "utf8");
  for (const m of s.matchAll(/playSound\(\s*"([^"]+)"/g)) {
    if (!used.has(m[1])) used.set(m[1], []);
    if (!used.get(m[1]).includes(f)) used.get(m[1]).push(f);
  }
}
if (used.size === 0) {
  console.error("❌ playSound(\"…\") が1件も見つからない。検査が当たっていない疑い。");
  process.exit(2);
}

const problems = [];
for (const [name, where] of used) {
  if (!defs.has(name)) {
    problems.push(`playSound("${name}") の登録が無い（${where.join(", ")}）＝その音は鳴らない`);
  }
}
for (const [name, rel] of defs) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    problems.push(`${name} のファイルが無い: ${rel}`);
  }
}

if (problems.length) {
  console.error("❌ 効果音に問題 " + problems.length + " 件");
  for (const p of problems) console.error("  ・" + p);
  process.exit(1);
}
console.log(
  "✅ 問題なし（登録 " + defs.size + " 件・呼び出し " + used.size + " 種・ファイルは全部ある）"
);
