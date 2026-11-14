// 🔴【2026-11-14・続き711】**手元の検査と、GitHub Actions の検査がズレていないか**を見る。
//
// なぜ要るか: `npm run check` は11本まで増えていたのに、`.github/workflows/checks.yml` は
// **5本のまま**だった。つまり「push したら自動で全部走る」と思っていた6本は、
// **誰も走らせていなかった**。しかも**自動は緑のまま**なので、気づく手がかりが無い。
// ⚠ CLAUDE.md には「同じものが GitHub Actions でも push のたびに自動で走る」と書いてある。
//   その前提が静かに崩れていたことになる。**書いてあるとおりに動いているかは、機械で見る。**
//
// 見方: package.json の `check` が呼ぶ `tools/*.mjs` が、全部ワークフローにも在るか。
//   ⚠ 逆（ワークフローにだけ在る）は咎めない——CI でだけ回したい検査はあってよい。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, "..", "package.json");
const WF = path.join(HERE, "..", ".github", "workflows", "checks.yml");

const 取り出す = (s) => {
  const out = [];
  const 印 = "tools/";
  let i = 0;
  for (;;) {
    const j = s.indexOf(印, i);
    if (j < 0) break;
    let k = j + 印.length;
    let 名 = "";
    while (k < s.length && /[A-Za-z0-9_.-]/.test(s[k])) 名 += s[k++];
    if (名.endsWith(".mjs")) out.push(名);
    i = j + 印.length;
  }
  return out;
};

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
} catch (e) {
  console.error("❌ package.json を読めない: " + e.message);
  process.exit(2);
}
const checkCmd = pkg?.scripts?.check;
if (typeof checkCmd !== "string" || !checkCmd.includes("tools/")) {
  console.error("❌ package.json の scripts.check が見つからない（空振りを合格にしない）");
  process.exit(2);
}

let wf;
try {
  wf = fs.readFileSync(WF, "utf8");
} catch (e) {
  console.error("❌ .github/workflows/checks.yml を読めない: " + e.message);
  process.exit(2);
}
if (!wf.includes("node tools/")) {
  console.error("❌ ワークフローに node tools/… の行が1つも無い（空振りを合格にしない）");
  process.exit(2);
}

const 手元 = [...new Set(取り出す(checkCmd))];
const CI = new Set(取り出す(wf));
if (手元.length < 5) {
  console.error("❌ scripts.check から取れた検査が " + 手元.length + " 本しか無い（空振りを合格にしない）");
  process.exit(2);
}

const 足りない = 手元.filter((n) => !CI.has(n));
if (足りない.length) {
  console.error("❌ 手元で走らせている検査が、GitHub Actions に " + 足りない.length + " 本足りない");
  for (const n of 足りない) console.error("  ・tools/" + n + " … .github/workflows/checks.yml の static ジョブへ1行足す");
  console.error("  ⚠ このままだと「push したら自動で全部走る」が嘘になり、しかも**自動は緑のまま**になる。");
  process.exit(1);
}

console.log("✅ 問題なし（手元の検査 " + 手元.length + " 本すべてが GitHub Actions にも在る）");
