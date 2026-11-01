// 横長のイラストを、正方形のイラストに整える道具。
//
// 【なぜ要るか】リメイクのカードは**イラストがカード全面に透かしのように広がる**作りで、
//   元のイラストも 433x433 の正方形で描かれている。ところが 0th拡張のイラストは
//   **1024x512（2:1）や 1472x832（16:9）の横長**。そのまま正方形のカードに収めると
//   **左右が切り落とされ、半分近くが見えなくなる**（ユーザー報告「見切れている部分が
//   大きすぎていまいち何の画像かわかりづらい」）。
//
// 【やること】絵を**上半分に置き、下を空けて正方形にする**。
//   ・空けた所は既定で**透明**。合成すると一番下のべた塗り（そのカードの色）が透けるので、
//     絵がその色の面に浮かんで見える。--white を付ければ白で埋める。
//   ・リメイクの版面は「上が絵・真ん中に名前の帯・下が効果文の面」なので、
//     **空けた下半分がちょうど文字の面と重なる**。元の 0th拡張のカードも絵は上の
//     横長の窓に入っていたので、構造が揃う。
//
// 🔴 **合成そのもの（make-card.mjs）には手を入れない。** あちらは本物37枠と突き合わせて
//   検算してある（差 6〜17.7・取り違え0件）。手前に1つ道具を足す形にすれば、その保証を
//   崩さずに済む。
//
// ⚠ 新しいライブラリは入れていない。開発依存にある Playwright の Chromium で canvas に描く。
//
// 【使い方】
//   node tools/squarify-illust.mjs --in 絵.jpg --out 絵_正方形.png
//   つまみ: --white（下を白で埋める。既定は透明）
//           --top 0（絵を置く縦位置。0＝上端、0.5＝中央。既定 0）
//           --size 1024（出力の一辺。既定は元絵の長辺）
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const arg = (name, def = null) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const has = (name) => process.argv.includes("--" + name);

const IN = arg("in");
const OUT = arg("out");
if (!IN || !OUT) {
  console.error("使い方: node tools/squarify-illust.mjs --in 絵.jpg --out 絵_正方形.png [--white] [--top 0] [--size 1024]");
  process.exit(2);
}
if (!fs.existsSync(IN)) {
  console.error("🔴 元の絵が無い: " + IN);
  process.exit(2);
}
const TOP = Number(arg("top", "0"));
if (!(TOP >= 0 && TOP <= 1)) {
  console.error("🔴 --top は 0〜1 で指定する（0＝上端・0.5＝中央）");
  process.exit(2);
}

const { chromium } = await import("playwright");
const b = await chromium.launch();
const page = await b.newPage();
await page.goto("about:blank");

// 🔴 about:blank のページは file:// の画像を読めない（EncodingError）。data URL にして渡す。
const ext = path.extname(IN).toLowerCase();
const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
const dataUrl = "data:" + mime + ";base64," + fs.readFileSync(IN).toString("base64");

const r = await page.evaluate(
  "(async (o) => {" +
    "const im = new Image(); im.src = o.src; await im.decode();" +
    "const W = im.naturalWidth, H = im.naturalHeight;" +
    "const S = o.size || Math.max(W, H);" +
    "const cv = document.createElement('canvas'); cv.width = S; cv.height = S;" +
    "const g = cv.getContext('2d');" +
    "if (o.white) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S); }" +
    // 絵は幅いっぱいに収める（横長なので縦が余る）。縦長の絵なら高さいっぱい。
    "const s = W >= H ? S / W : S / H;" +
    "const dw = W * s, dh = H * s;" +
    "const dx = (S - dw) / 2, dy = (S - dh) * o.top;" +
    "g.drawImage(im, 0, 0, W, H, dx, dy, dw, dh);" +
    // 出力の形は拡張子で決める。webp は 0.92 で書く（assets/ の既存カードと同じくらいの重さ）。
    "const url = o.webp ? cv.toDataURL('image/webp', 0.92) : cv.toDataURL('image/png');" +
    "return { W, H, S, dw: Math.round(dw), dh: Math.round(dh), dx: Math.round(dx), dy: Math.round(dy), url };" +
  "})(" +
    JSON.stringify({
      src: dataUrl,
      white: has("white"),
      top: TOP,
      size: Number(arg("size", "0")) || 0,
      webp: path.extname(OUT).toLowerCase() === ".webp",
    }) +
  ")"
);
await b.close();

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(r.url.split(",")[1], "base64"));

const 埋め = has("white") ? "白" : "透明";
console.log("✅ " + path.basename(OUT));
console.log("   元: " + r.W + "x" + r.H + "（" + (r.W / r.H).toFixed(2) + ":1）→ " + r.S + "x" + r.S);
console.log("   絵の置き場所: 左" + r.dx + " 上" + r.dy + " / " + r.dw + "x" + r.dh + "（残りは" + 埋め + "）");
if (r.dh >= r.S - 1) console.log("   ⓘ 元から正方形に近いので、ほとんど埋めていません。");
else console.log("   ⓘ 下に " + Math.round(((r.S - r.dh - r.dy) / r.S) * 100) + "% の余白ができました（文字の面と重なる所）。");
