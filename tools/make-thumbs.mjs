// 【2026-11-04・#505】小さく表示する絵のために、小さい版を焼き出す道具。
//
// 🔴 なぜ要るか: 画像のメモリは**ファイル容量ではなく「幅×高さ×4バイト」**で決まる（#223）。
//    1672x941 の背景を 15x15px のアイコンとして貼ると、画面では米粒なのに **6MB** 抱える。
//    実測（iPhone 932x430・4人CPU戦）では、15x15 の3つのアイコンだけで **11.2MB**、
//    盤面のアバター（768角×5枚）で **11.3MB**。合計28MBのうち23MBがこの2つだった。
//
// ⚠ 元の絵は**1枚も触らない**。別の場所（assets/thumbs/）へ小さい版を足すだけ。
//    元が要る所（プレイマットそのもの・拡大表示）は今までどおり元を使う。
//
// ⚠ 同じ名前の .png と .webp が並んでいる所（白のプレイマット・一部のアバター・カード裏）は、
//    小さい版を**1つだけ共有する**（焼き出しは全部 webp なので名前がぶつかる）。中身は同じ絵なので
//    問題にならない。だから「対象279件・ファイル269個」とズレる。
//
// 使い方: node tools/make-thumbs.mjs            （足りない物だけ焼く）
//         node tools/make-thumbs.mjs --force    （全部焼き直す）
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));
const FORCE = process.argv.includes("--force");

// 焼く対象。maxEdge は「長辺を何pxにするか」。
//   背景・プレイマット・カード裏は 15x15px のアイコン用（dpr3 でも45px）＝96で2倍の余裕。
//   アバターは盤面の席（最大74px・dpr3 で222px）用＝256。
// 🔴 大きさは**1つに統一**している（384px）。理由: 使う場所でいちばん大きいのが
//    「選ぶ一覧」の見本（6.5rem＝dpr3 で約312px）なので、それを下回ると**ぼやける**。
//    小さい方（15x15px のアイコン）には過剰だが、それでも 6.0MB → 0.33MB になるので十分。
//    2種類に分けると、貼る側が「どの大きさを使うか」を知る必要が出て複雑になる。
const THUMB_EDGE = 384;

const TARGETS = [
  { dir: "assets/backgrounds", maxEdge: THUMB_EDGE },
  { dir: "assets/playmats", maxEdge: THUMB_EDGE },
  { dir: "assets/avatars", maxEdge: THUMB_EDGE },
  { dir: "assets/cards", maxEdge: THUMB_EDGE, only: (f) => /^back-/.test(f) },
];

const MIME = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || "/").replace(/^\//, "").split("?")[0]);
  const fp = path.join(ROOT, rel);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
  res.end(fs.readFileSync(fp));
});
await new Promise((r) => server.listen(8931, r));

const jobs = [];
for (const t of TARGETS) {
  const abs = path.join(ROOT, t.dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!/\.(webp|png|jpg|jpeg)$/i.test(f)) continue;
    if (t.only && !t.only(f)) continue;
    const outRel = path.join("assets/thumbs", path.basename(t.dir), f.replace(/\.(png|jpg|jpeg)$/i, ".webp")).split(path.sep).join("/");
    jobs.push({ srcRel: (t.dir + "/" + f), outRel, maxEdge: t.maxEdge });
  }
}
const todo = jobs.filter((j) => FORCE || !fs.existsSync(path.join(ROOT, j.outRel)));
console.log("対象 " + jobs.length + " 件 / 焼くのは " + todo.length + " 件");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:8931/index.html", { waitUntil: "commit" }).catch(() => {});
await page.setContent("<html><body></body></html>");

let made = 0;
for (const j of todo) {
  const dataUrl = await page.evaluate(async ({ src, maxEdge }) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    await new Promise((res, rej) => { im.onload = res; im.onerror = () => rej(new Error("load " + src)); im.src = src; });
    const s = Math.min(1, maxEdge / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * s));
    const h = Math.max(1, Math.round(im.naturalHeight * s));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(im, 0, 0, w, h);
    return c.toDataURL("image/webp", 0.86);
  }, { src: "http://localhost:8931/" + j.srcRel, maxEdge: j.maxEdge });
  if (!/^data:image\/webp/.test(dataUrl)) throw new Error("webpで出なかった: " + j.srcRel);
  const out = path.join(ROOT, j.outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
  made++;
}
await browser.close();
server.close();

let before = 0, after = 0;
for (const j of jobs) {
  before += fs.statSync(path.join(ROOT, j.srcRel)).size;
  const o = path.join(ROOT, j.outRel);
  if (fs.existsSync(o)) after += fs.statSync(o).size;
}
console.log("焼いた " + made + " 件");
console.log("ファイル容量 " + Math.round(before / 1048576 * 10) / 10 + "MB → " + Math.round(after / 1048576 * 10) / 10 + "MB");
