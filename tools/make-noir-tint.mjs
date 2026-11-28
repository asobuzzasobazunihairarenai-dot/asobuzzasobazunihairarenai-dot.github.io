// 🔴【続き899】ノワールの駒を**7色に塗り分ける**。
//
// ユーザー要望「**全員がノワールにすると、どれが誰の駒かわからなくなります。ノワールの駒の
// スキンの白い部分を、ノワールが置かれているロックエリアの色にできる？**」。
//
// 【やり方】`assets/pieces/noir.webp`（黒い本体＋白い線と輪）の**白い所だけ**を色に置き換え、
// `assets/pieces/noir-{色}.webp` を7枚焼く。黒い本体はそのまま＝ノワールらしさは失わない。
//
// 🔴 **色は style.css の `--color-*` から写す**（表を2か所に持たない）。変えた時はここも直す。
// ⚠ この repo の画像道具は **ブラウザの canvas** を使う作法（tools/make-card.mjs と同じ）。
//   node には画像ライブラリが入っていない。
// ⚠ 走らせても**既定の noir.webp は1バイトも触らない**（読むだけ）。
//
//   使い方: node tools/make-noir-tint.mjs        … 焼く
//           node tools/make-noir-tint.mjs --dry  … 何も書かずに数えるだけ
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 元の道 = path.join(ROOT, "assets/pieces/noir.webp");
const 書かない = process.argv.includes("--dry");

// 🔴 src/style.css の :root と同じ値（--color-*）。
const 色 = {
  red: "#c70025",
  orange: "#ee781f",
  yellow: "#fabe00",
  green: "#22ac38",
  blue: "#1bb8ce",
  pink: "#f19ec2",
  purple: "#915da3",
};

if (!fs.existsSync(元の道)) {
  console.error("🔴 元の絵が無い: assets/pieces/noir.webp");
  process.exit(2);
}
const 元 = "data:image/webp;base64," + fs.readFileSync(元の道).toString("base64");

const b = await chromium.launch();
const page = await b.newPage();
await page.setContent("<body></body>");

const 結果 = await page.evaluate(async ({ 元, 色 }) => {
  const img = new Image();
  img.src = 元;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const 素 = g.getImageData(0, 0, w, h);

  // まず中身を数える（焼く前に、白い所が本当にあるか確かめる＝0しか出ない道具にしない）
  let 透明 = 0, 白 = 0, 黒 = 0, 中間 = 0, 有色 = 0;
  for (let i = 0; i < 素.data.length; i += 4) {
    const r = 素.data[i], gg = 素.data[i + 1], bb = 素.data[i + 2], a = 素.data[i + 3];
    if (a < 20) { 透明++; continue; }
    const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
    if (mx - mn > 30) { 有色++; continue; }
    if (mx > 200) 白++; else if (mx < 60) 黒++; else 中間++;
  }

  const 出 = {};
  for (const [名, hex] of Object.entries(色)) {
    const R = parseInt(hex.slice(1, 3), 16), G = parseInt(hex.slice(3, 5), 16), B = parseInt(hex.slice(5, 7), 16);
    const d = new ImageData(new Uint8ClampedArray(素.data), w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const a = d.data[i + 3];
      if (a < 20) continue; // 透明はそのまま
      const r = d.data[i], gg = d.data[i + 1], bb = d.data[i + 2];
      const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
      if (mx - mn > 30) continue; // 元から色が付いている所は触らない
      // 🔴 かけ算で塗る（白→その色／黒→黒のまま／灰→暗いその色）。
      //   こうすると**線のふちのなめらかさ（半端な灰）もそのまま**残る。
      d.data[i] = Math.round((r * R) / 255);
      d.data[i + 1] = Math.round((gg * G) / 255);
      d.data[i + 2] = Math.round((bb * B) / 255);
    }
    const c2 = document.createElement("canvas");
    c2.width = w; c2.height = h;
    c2.getContext("2d").putImageData(d, 0, 0);
    出[名] = c2.toDataURL("image/webp", 0.95);
  }
  return { w, h, 数: { 透明, 白, 黒, 中間, 有色 }, 出 };
}, { 元, 色 });

await b.close();

const 全 = 結果.w * 結果.h;
const 割 = (n) => Math.round((n / 全) * 1000) / 10 + "%";
console.log("元の絵: " + 結果.w + "x" + 結果.h);
console.log("  透明 " + 割(結果.数.透明) + " ／ 白 " + 割(結果.数.白) + " ／ 黒 " + 割(結果.数.黒) +
  " ／ 中間 " + 割(結果.数.中間) + " ／ 色つき " + 割(結果.数.有色));

// 🔴 白い所が無ければ**焼かずに止まる**（塗るものが無いのに7枚作っても意味が無い）。
if (結果.数.白 < 全 * 0.01) {
  console.error("🔴 白い所が " + 割(結果.数.白) + " しか無い。元の絵が変わった？");
  process.exit(2);
}

if (書かない) { console.log("（--dry なので何も書いていません）"); process.exit(0); }

let 書いた = 0;
for (const [名, url] of Object.entries(結果.出)) {
  const buf = Buffer.from(url.split(",")[1], "base64");
  const 先 = path.join(ROOT, "assets/pieces/noir-" + 名 + ".webp");
  fs.writeFileSync(先, buf);
  console.log("  ✅ assets/pieces/noir-" + 名 + ".webp  " + Math.round(buf.length / 1024) + "KB");
  書いた++;
}
console.log("✅ " + 書いた + " 枚焼いた（元の noir.webp は触っていない）");
