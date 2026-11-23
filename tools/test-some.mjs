// 【続き804】カード効果テストの**一部だけ**走らせる。
//
//   node tools/test-some.mjs "ちょっと待った|吊り橋"      ← 名前に当たるケースだけ
//   node tools/test-some.mjs                               ← 全部（= npm test と同じ）
//
// 🔴 なぜ要るか: 開発機では `npm test`（264件）が **`page.evaluate: Target crashed`** で
//   途中で落ちることがある。原因はメモリで、2026-11-23 の実測では空きが **1.79GB / 16GB**
//   しかなかった（こちらが止められるプロセスは1つも無い）。触ったカードのテストだけなら
//   数十秒で終わるので、手元ではこれで見て、**全部は GitHub Actions で見る**。
//   ⚠ 「落ちた」を**コードの問題と取り違えない**。切り分けは os.freemem() を見るのが早い。
//
// ⚠ 本物（test/effects.mjs）と**同じ土台**（test/effect-runner.mjs / checkExpect）を使う。
//   絞り込み以外は1行も変えない——別の判定を書くと「ここだけ通る」になる。
// ⚠ これは開発用。デプロイには含まれない（tools/ は公開ページに出ない）。
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CASES, checkExpect } from "../test/effect-cases.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.SO7_TEST_PORT || 8821);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff2": "font/woff2",
};
const 絞り = new RegExp(process.argv[2] || ".");

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(d);
  });
});
await new Promise((r) => srv.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  try {
    localStorage.setItem("so7-disable-update-checker", "1");
    localStorage.setItem("so7-bgm-intro-shown-v1", "1");
    localStorage.setItem("so7-intros-all-off", "1");
  } catch (e) {}
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "load" });
await page.waitForTimeout(2500);

let pass = 0, fail = 0;
const 対象 = CASES.filter((c) => 絞り.test(c.name));
console.log("対象 " + 対象.length + " 件 / 全 " + CASES.length + " 件");
for (const c of 対象) {
  const res = await page.evaluate(async (spec) => {
    const r = await import("/test/effect-runner.mjs");
    return await r.runOneCase(spec);
  }, c);
  if (res && res.error) {
    fail++;
    console.log("❌ " + c.name + "\n   例外: " + res.error.split("\n")[0]);
    continue;
  }
  const fails = [];
  for (const exp of c.expect) {
    const msg = checkExpect(res, exp);
    if (msg) fails.push(msg);
  }
  if (fails.length === 0) {
    pass++;
    console.log("✅ " + c.name);
  } else {
    fail++;
    console.log("❌ " + c.name);
    for (const m of fails) console.log("   - " + m);
    console.log("   calls: " + JSON.stringify(res.calls));
  }
}
console.log("\nPASS " + pass + " / FAIL " + fail);
await browser.close();
srv.close();
process.exit(fail > 0 ? 1 : 0);
