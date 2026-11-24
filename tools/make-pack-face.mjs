// 🔴【2026-11-24・続き842】ブースターパックの**表の絵**を焼く道具。
//
// ユーザー指摘「**旧0thの拡張パックデザインですが、今のままだとリメイクの拡張パックの
// デザインに見えます！旧ゼロスの拡張パックはすでに正方形のデザインがあるので
// そちらをアレンジしてリデザインしてみてもらってもいいですか？**」
//
// ■ 元の絵（実物の入稿データ。git 管理外なので手元にしか無い）
//   J:/自作カードゲーム/7 seven/印刷（名前変えない）/★最新リンク（名前変えない）/
//     カード（0th 拡張）（名前変えない）/裏面＆説明書（0th BP）_アートボード 1.png  … 表（650x650）
//   ⚠ 見つけ方の記録: 3Dの商材（動画/ゲーム風景　３D/拡張パック　Amazon商材.blend）の
//     **中に書かれていた画像の場所**から辿った。名前に「パック」も「袋」も入っていないので、
//     ファイル名で探しても出てこない。
//
// 🔴 なぜ画像を1枚足したか（pack-bag.js の「新しい画像も canvas も1枚も足さない」の例外）
//   あの決まりは**全画面の canvas が1枚で約23MB**（#441・#607 で実機が落ちた）から来ている。
//   ここで足すのは **512x512 の webp 1枚＝約1MB**で、カードの絵（433px角）より少し大きい程度。
//   そして**実物の版面そのもの**なので、CSS で似せた偽物より確実に合う
//   （題字の書体は手元のフォントに無い＝続き769 で ONLY の書体を探した時と同じ話）。
//
// 使い方: node tools/make-pack-face.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));
const 元 = "J:/自作カードゲーム/7 seven/印刷（名前変えない）/★最新リンク（名前変えない）/カード（0th 拡張）（名前変えない）/裏面＆説明書（0th BP）_アートボード 1.png";
const 先 = path.join(ROOT, "assets", "ui-v2", "pack-0th-face.webp");
const 辺 = 512;

if (!fs.existsSync(元)) {
  console.error("🔴 元の絵が無い: " + 元);
  console.error("   実物の入稿データは git 管理外。手元に無い端末では焼けない（既に焼いた webp を使う）。");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<body>");
const u = await page.evaluate(async ({ src, 辺 }) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  if (img.width !== img.height) throw new Error("元の絵が正方形でない: " + img.width + "x" + img.height);
  const c = document.createElement("canvas");
  c.width = 辺; c.height = 辺;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, 辺, 辺);
  return { webp: c.toDataURL("image/webp", 0.92), w: img.width, h: img.height };
}, { src: "data:image/png;base64," + fs.readFileSync(元).toString("base64"), 辺 });

const buf = Buffer.from(u.webp.split(",")[1], "base64");
fs.mkdirSync(path.dirname(先), { recursive: true });
fs.writeFileSync(先, buf);
console.log("元 " + u.w + "x" + u.h + " → " + path.relative(ROOT, 先) + "  " + 辺 + "x" + 辺 + "  " + (buf.length / 1024).toFixed(0) + "KB");
await browser.close();
