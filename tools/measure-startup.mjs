// 起動の重さを測る物差し。
//
// 【なぜ作ったか・続き622】起動時のコードを減らす作業は**何度も繰り返す**（お知らせ・管理者
// モード・チュートリアル・ショップ・ランキング…）。毎回「効いたか」を判定できないと手探りに
// なる。ところが**壁時計（オープニングが出るまで）はこの機械では2倍以上ばらつく**ので、
// 10%の変化が埋もれて見えない（続き621 で実際に判定できなかった）。
//
// 🔴 **だから壁時計ではなく、ブラウザが内部で数えている「JavaScript の実行に使った時間」を
// 直接もらう**（Chrome DevTools Protocol の `Performance.getMetrics` の `ScriptDuration`）。
// こちらは機械の都合に引きずられにくい。あわせて**取得したコードの本数とバイト数**も出す
// （こちらは決まった値なので、ばらつきに関係なく効果が分かる）。
//
// 使い方:
//   node tools/measure-startup.mjs                  … いまの状態を測る
//   node tools/measure-startup.mjs --runs 5         … 回数を変える（既定3）
//   node tools/measure-startup.mjs --cpu 4          … CPU を4分の1に絞る（実機に近づける）
//   node tools/measure-startup.mjs --swap a.js=scratchpad/old_a.js  … 配信を差し替えて A/B
//   node tools/measure-startup.mjs --json           … 機械で読む形で出す
//
// ⚠ 本番の訪問記録・不具合報告の書き込みは止めて測る（本番の数字を汚さないため＝続き589）。
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const RUNS = Number(argOf("runs", 3));
const CPU = Number(argOf("cpu", 1));
const AS_JSON = argv.includes("--json");
const swaps = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--swap" && argv[i + 1]) {
    const [from, to] = argv[i + 1].split("=");
    if (from && to) swaps["/src/" + from.replace(/^\/?src\//, "")] = to;
  }
}

const PORT = 8992 + Math.floor(Math.random() * 200); // 走らせ重ねた時にぶつからないように
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, swaps[p] || p.replace(/^\//, ""));
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(fp));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const once = async () => {
  const ctx = await browser.newContext({ viewport: { width: 932, height: 430 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    hasTouch: true, isMobile: true });
  await ctx.route(
    (u) => ["so7_visit_log", "so7_bug_reports", "so7_log_visit"].some((k) => String(u).includes(k)),
    (r) => r.abort()
  );
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "commit" });
  // オープニングが出るまで待つ（出ない作りに変わっても止まらないよう上限を置く）
  let openingAt = null;
  for (let i = 0; i < 400 && openingAt === null; i++) {
    await page.waitForTimeout(50);
    try {
      if (await page.evaluate(() => {
        const el = document.querySelector("#opening-screen, .opening-screen");
        return !!el && el.getBoundingClientRect().height > 50;
      })) openingAt = Date.now() - t0;
    } catch { /* 画面の入れ替わりで一瞬読めない */ }
  }
  const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const res = await page.evaluate(() => {
    const rs = performance.getEntriesByType("resource");
    const js = rs.filter((r) => /\.js(\?|$)/.test(r.name));
    return {
      コードの本数: js.length,
      コードのバイト数: js.reduce((a, r) => a + (r.encodedBodySize || 0), 0),
      要求の数: rs.length,
      読んだコード: js.map((r) => r.name.replace(/^https?:\/\/[^/]+\//, "")),
    };
  });
  await ctx.close();
  return {
    "JSの実行(ms)": Math.round((m.ScriptDuration || 0) * 1000),
    "レイアウト(ms)": Math.round((m.LayoutDuration || 0) * 1000),
    "スタイル計算(ms)": Math.round((m.RecalcStyleDuration || 0) * 1000),
    "オープニングまで(ms)": openingAt,
    ...res,
  };
};

const runs = [];
for (let i = 0; i < RUNS; i++) runs.push(await once());
await browser.close();
server.close();

const med = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
const pick = (k) => runs.map((r) => r[k]);
const summary = {
  回数: RUNS,
  "CPUの絞り": CPU,
  差し替え: Object.keys(swaps).length ? swaps : "なし",
  コードの本数: med(pick("コードの本数")),
  "コードのKB": Math.round(med(pick("コードのバイト数")) / 1024),
  要求の数: med(pick("要求の数")),
  "JSの実行(ms) 中央値": med(pick("JSの実行(ms)")),
  "JSの実行(ms) 全部": pick("JSの実行(ms)"),
  "レイアウト(ms) 中央値": med(pick("レイアウト(ms)")),
  "スタイル計算(ms) 中央値": med(pick("スタイル計算(ms)")),
  "オープニングまで(ms) 中央値": med(pick("オープニングまで(ms)")),
  "オープニングまで(ms) 全部": pick("オープニングまで(ms)"),
};
if (AS_JSON) {
  console.log(JSON.stringify({ summary, runs }, null, 1));
} else {
  for (const [k, v] of Object.entries(summary)) console.log("  " + k + ": " + (typeof v === "object" ? JSON.stringify(v) : v));
}
