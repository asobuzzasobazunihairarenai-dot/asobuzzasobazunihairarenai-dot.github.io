// 🔴【続き740】ペットのアニメに「体の一部が消えるコマ」が無いかを、**ブラウザ自身の
//   webp展開器で1コマずつ描いて**見張る。
//
// 【なぜ要るか（ユーザー報告・ポヨン）】
//   「ショップでポヨンをクリックしていると、**特定の動きの時に体の下半分が消える**」。
//   コードは1行も悪くなく、**画像ファイルの書き出しが悪かった**。
//   アニメーションwebp の 1コマ（ANMF）は
//     ・矩形（キャンバスのどこへ、どれだけ描くか。書き出し器は差分だけを小さな矩形にする）
//     ・混ぜ方（blend: 0=アルファ合成 / 1=混ぜずに置き換える）
//     ・捨て方（dispose: 0=そのまま残す / 1=このコマの矩形を透明で塗りつぶす）
//   を持つ。**差分のコマは「残りは前のコマのまま」が前提**なので、そこへ
//   「捨て方=1」が付くと前のコマが消えてから小さな差分だけが描かれる＝
//   **はみ出た所（体の下半分）が透明になる。**
//
// 🔴 **「捨て方=1」を全部0にするのは誤り**（実測で分かった）。歩きは体が移動するので
//   前の位置を消すのが正しく、消さないと**古い絵が残って積もる**。
//   ⇒ 続き740 の直しは「**落ちているコマの直前の1コマだけ**」を狙った（6本・6ビット）。
//
// 【この検査のやり方】ヘッダだけでは「壊れている」と「意図どおり」を分けられなかった
//   （実測で確認）。⇒ **描いて面積を数える**しかない。1本のアニメの中で、
//   あるコマの不透明な面積が**中央値の7割未満**なら「体の一部が消えている」とみなす。
//
// ⚠ 0しか出さない検査ではない: 直す前は 8本を名指しで拾った（poyon の idle/yawn 系）。
// ⚠ 下の「既知の例外」は、**フラグでは直せないと実測で分かったもの**。
//   絵を書き出し直せば消える（＝直したら例外から外す）。
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = "assets/pets";
// フラグでは直せないと実測で分かったもの（続き740）。絵の書き出し直しが要る。
const 既知の例外 = {
  "assets/pets/poyon/poyon-front-walk.webp":
    "コマ4 がそれ自体で欠けている。歩きは体が移動するので「混ぜ方」を変えると古い絵が残る（実測）",
  "assets/pets/poyon/poyon-left-idle.webp":
    "コマ0 が差分なので、**いちばん最初の1周だけ**上半分しか出ない（2周目以降は前の周の絵に重なるので正しい）",
};
const しきい値 = 0.7;

if (!fs.existsSync(ROOT)) {
  console.log("ℹ ペットの絵が無い環境なので何も見ない（" + ROOT + "）");
  process.exit(0);
}

// アニメ（ANMF を持つもの）だけを対象にする。静止画は ImageDecoder が扱えない。
const 一覧 = [];
for (const 犬小屋 of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, 犬小屋);
  if (!fs.statSync(dir).isDirectory() || 犬小屋 === "portraits") continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const p = path.join(dir, f);
    if (!fs.readFileSync(p).includes("ANMF")) continue;
    一覧.push(p.replace(/\\/g, "/"));
  }
}
if (一覧.length === 0) {
  console.log("ℹ アニメのペットが無いので何も見ない");
  process.exit(0);
}

const PORT = Number(process.env.SO7_PETCHECK_PORT || 3197);
const 基点 = path.resolve(".");
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || "/").split("?")[0]);
  const p = path.join(基点, u === "/" ? "index.html" : u);
  fs.readFile(p, (e, b) => {
    if (e) return void res.writeHead(404).end();
    const ext = path.extname(p).toLowerCase();
    res.writeHead(200, {
      "Content-Type": ext === ".webp" ? "image/webp" : ext === ".html" ? "text/html; charset=utf-8" : "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(b);
  });
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 400, height: 400 } });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "domcontentloaded" });

if (!(await page.evaluate(() => typeof window.ImageDecoder === "function"))) {
  console.log("⚠ この Chrome には ImageDecoder が無いので見られない（検査は飛ばす）");
  await browser.close();
  server.close();
  process.exit(0);
}

const 結果 = await page.evaluate(async (files) => {
  const out = {};
  for (const f of files) {
    try {
      const res = await fetch(f + "?t=" + Date.now());
      const dec = new window.ImageDecoder({ data: await res.arrayBuffer(), type: "image/webp" });
      await dec.tracks.ready; // ⚠ これを待たないと selectedTrack が null
      await dec.completed;
      const n = dec.tracks.selectedTrack.frameCount;
      const cv = document.createElement("canvas");
      const g = cv.getContext("2d", { willReadFrequently: true });
      const 面積 = [];
      for (let i = 0; i < n; i += 1) {
        const { image } = await dec.decode({ frameIndex: i });
        cv.width = image.displayWidth;
        cv.height = image.displayHeight;
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(image, 0, 0);
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        let a = 0;
        for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (d[(y * cv.width + x) * 4 + 3] > 24) a += 1;
        面積.push(a);
        image.close();
      }
      out[f] = { 面積 };
    } catch (e) {
      out[f] = { エラー: String(e && e.message ? e.message : e) };
    }
  }
  return out;
}, 一覧);

await browser.close();
server.close();

let NG = 0;
let 例外のまま = 0;
let 見た = 0;
for (const f of 一覧) {
  const r = 結果[f];
  if (!r || r.エラー) {
    console.log(" 🔴 読めなかった: " + f + "（" + (r?.エラー || "不明") + "）");
    NG += 1;
    continue;
  }
  見た += 1;
  if (r.面積.length < 2) continue;
  const 並び = [...r.面積].sort((a, b) => a - b);
  const 中央 = 並び[Math.floor(並び.length / 2)];
  if (!中央) continue;
  const 割 = 並び[0] / 中央;
  if (割 >= しきい値) continue;
  const 言い訳 = 既知の例外[f];
  const 文 =
    f + "：あるコマの絵が中央値の " + Math.round(割 * 100) + "% しか無い（コマごとの面積 " + r.面積.join(",") + "）";
  if (言い訳) {
    console.log(" ⚠ 既知 " + 文 + "\n        理由: " + 言い訳);
    例外のまま += 1;
  } else {
    console.log(" 🔴 " + 文);
    NG += 1;
  }
}

console.log("\nペットのアニメ " + 見た + " 本を1コマずつ描いて数えた（既知の例外 " + 例外のまま + " 本）");
if (NG === 0) {
  console.log("✅ 体の一部が消えるコマは無い");
  process.exit(0);
}
console.log(
  "\n🔴 コマごとに絵の量が大きく落ちている＝**体の一部が消えて見える**。" +
    "\n   たいていは画像の書き出しの「捨て方(disposal)」か「混ぜ方(blend)」の取り違え。" +
    "\n   直し方は tools/check-pet-sprites.mjs の冒頭のコメントを読むこと（続き740 の実例つき）。"
);
process.exit(1);
