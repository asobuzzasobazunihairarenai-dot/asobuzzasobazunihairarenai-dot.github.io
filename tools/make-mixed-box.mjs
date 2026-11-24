// 🔴【2026-11-24・続き839 → 841】「まぜる」の箱の絵を、**既にある箱の絵から**焼く道具。
//
// ユーザー要望（続き839）「**まぜる やつも箱絵があってもいいかも！なんか色んな箱絵が混ざってる感じの
// かっこいい感じのやつ、あなたの方で作れる？既存の箱絵を組み合わせて！**」。
//
// 🔴🔴【続き841】ユーザー指摘「**中心から放射状に境界線が出ていて区切られてる感じはださいかな？**」
//   ⇒ **帯で切り貼りするのをやめた。** 続き839〜840 は3つの蓋を斜めの帯で継ぎ、継ぎ目に金の線を
//     引いていたが、
//       ・金の線＝**はっきりした区切り**なので「3枚貼り合わせました」に見える（コラージュ）
//       ・1st の蓋は**ロゴが無く模様だけ**なので、真ん中の帯が丸ごと死んでいた
//       ・リメイクの「7」も旧0thの輪も**帯の縁で切れて**いた
//     ⇒ いまは **1枚の絵**（線は1本も引かない）。濃紺の地＋7色の光＋旧0thの虹の輪。
//   ⚠ 「継ぎ目のぼかしで溶かす」も試したが、**重なった所で2枚が二重写しになり**、
//     題字も7も読めなくなった（scratchpad/_mix841/案A.png）。採らない。
//   ⚠ 「3つの蓋を重ねて置く」案も描いたが、**箱の上に箱の絵**になるうえ、箱の横には
//     既に本物のパックが立てかけてある（続き840）ので、**物が二重**になる。採らない。
//
// ■ 何をしているか
//   assets/boxes/ に既にある絵から**虹の輪だけ**を取り出し、濃紺の地に置く。
//   **新しく描いた絵は1枚も無い**（地と光は canvas のグラデーション）。
//
// 🔴 元の絵は1枚も触らない。足すだけ（make-thumbs.mjs と同じ作法）。
//
// ■ なぜ Playwright（ブラウザのcanvas）か
//   この repo には sharp 等の画像ライブラリが無い（ビルド不要の方針）。箱の面を焼いた時
//   （続き742・834）も同じやり方なので、そろえてある。
//
// 使い方:
//   node tools/make-mixed-box.mjs            … assets/boxes/mixed-*.webp を焼く
//   node tools/make-mixed-box.mjs --candidates  … scratchpad/_mixbox/ に出す（assets は触らない）
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));
const 案だけ = process.argv.includes("--candidates");
const 箱 = path.join(ROOT, "assets", "boxes");

const 読む = (名) => {
  const f = path.join(箱, 名 + ".webp");
  if (!fs.existsSync(f)) throw new Error("🔴 元の絵が無い: " + f);
  return "data:image/webp;base64," + fs.readFileSync(f).toString("base64");
};

// 🔴【続き840】**まぜるの中身は「リメイク＋0th拡張＋1st＋旧0th」**（src/mixed-deck.js）。
//   ⚠ 0th拡張だけは**ブースターパックで売られた拡張で、箱が無い**（deck-box-3d.js でも
//     リメイクの箱の絵を流用している）。⇒ ユーザー案「**拡張も混ざってるので拡張パックは
//     別で箱のそばに置いてある感じで混ぜてるのを表現**」に従い、**絵には入れず**、
//     エディションを選ぶ画面で**箱の横にパックを1つ置く**形にした（src/edition-select-ui.js）。
const 元 = {
  rm: { top: 読む("rm-top"), back: 読む("rm-back") },
  old: { top: 読む("old0th-top") },
};

// このゲームの7色（src/style.css の --color-* と同じ値）。
// ⚠ 表を2か所に持つとズレるが、ここは**焼く時に1回使うだけ**なので写してある。
//   style.css を変えた時は、ここも見ること。
const 七色 = ["#d32549", "#ed910e", "#fabe00", "#18ab67", "#18b6c9", "#f19ec2", "#a0549a"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<body>");

// 🔴 虹の輪の位置は**目分量で切らず、実際に測る**（元の絵が差し替わっても当たるように）。
//   鮮やかな画素（彩度が高く、明るすぎず暗すぎない）の囲みを取る。
const 輪 = await page.evaluate(async (u) => {
  const img = new Image(); img.src = u; await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const D = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const r = D[i], gg = D[i + 1], bb = D[i + 2];
      const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
      const L = (mx + mn) / 2 / 255;
      const S = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
      if (S > 0.35 && L > 0.2 && L < 0.88) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1, n, w: c.width, h: c.height };
}, 元.old.top);

// 🔴 測り損ねたまま焼かない（0しか出ない道具にしない）。
if (輪.n < 5000 || 輪.x1 - 輪.x0 < 輪.w * 0.5 || 輪.y1 - 輪.y0 < 輪.h * 0.5) {
  throw new Error("🔴 旧0thの虹の輪を測れなかった: " + JSON.stringify(輪));
}
const 輪の中心x = (輪.x0 + 輪.x1) / 2;
const 輪の中心y = (輪.y0 + 輪.y1) / 2;
const 輪の半径 = Math.max(輪.x1 - 輪.x0, 輪.y1 - 輪.y0) / 2;
console.log(
  "旧0thの虹の輪（実測）: 中心 " + 輪の中心x.toFixed(0) + "," + 輪の中心y.toFixed(0) +
  " / 半径 " + 輪の半径.toFixed(0) + " / 鮮やかな画素 " + 輪.n
);

// ブラウザの中で描く。引数は data URL の組。
const 描く = (仕事) => page.evaluate(async ({ 元, 輪, 七色, 種, W, H, 質 }) => {
  const よむ = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  // 地（濃紺）。🔴 **旧0thの箱は白地**なので、まぜるを白地にすると小さく出した時に
  //   見分けが付かない（並べて確かめた＝scratchpad/_mix841/くらべ2.png）。
  const 地 = () => {
    const r = g.createRadialGradient(W / 2, H * 0.46, W * 0.05, W / 2, H / 2, W * 0.8);
    r.addColorStop(0, "#1d2838");
    r.addColorStop(1, "#06090f");
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  };
  // 7色の光を輪のまわりに置く（「7色が全部入っている」の印）。線ではないので区切って見えない。
  const 七色の光 = (強さ) => {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const cx = W / 2 + Math.cos(a) * W * 0.34;
      const cy = H / 2 + Math.sin(a) * W * 0.34;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, W * 0.3);
      gr.addColorStop(0, 七色[i] + 強さ);
      gr.addColorStop(1, "#00000000");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  };

  if (種 === "top") {
    const ol = await よむ(元.old.top);
    地();
    七色の光("66");
    // 虹の輪だけを円で取り出して中央へ。🔴 ふちはやわらかく——硬く切ると、
    //   結局そこが「境界線」になってしまう（今回やめたかったもの）。
    const R = 輪.r * 1.1;
    const 倍 = (W * 0.82) / (R * 2);
    const t = document.createElement("canvas");
    t.width = W; t.height = H;
    const tg = t.getContext("2d");
    tg.save();
    tg.beginPath();
    tg.arc(W / 2, H / 2, R * 倍, 0, Math.PI * 2);
    tg.clip();
    tg.drawImage(ol, W / 2 - 輪.cx * 倍, H / 2 - 輪.cy * 倍, ol.width * 倍, ol.height * 倍);
    tg.restore();
    const gr = tg.createRadialGradient(W / 2, H / 2, R * 倍 * 0.88, W / 2, H / 2, R * 倍);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    tg.globalCompositeOperation = "destination-in";
    tg.fillStyle = gr;
    tg.fillRect(0, 0, W, H);
    g.drawImage(t, 0, 0);
  } else if (種 === "back") {
    // 裏は「何が入っているか」を読む面。🔴 3つの裏を継ぐと**説明の文がどれも読めなくなる**
    //   （続き840 の形がそうだった）ので、**リメイクの裏を1枚そのまま**、濃紺の額に入れる。
    const rb = await よむ(元.rm.back);
    地();
    七色の光("33");
    const 大 = 0.86;
    const w = W * 大, h = H * 大;
    const x = (W - w) / 2, y = (H - h) / 2;
    g.save();
    g.shadowColor = "rgba(0,0,0,0.6)";
    g.shadowBlur = W * 0.04;
    g.shadowOffsetY = W * 0.012;
    g.fillStyle = "#fff";
    g.fillRect(x, y, w, h);
    g.restore();
    g.drawImage(rb, x, y, w, h);
  } else if (種 === "side") {
    // 背。縦に濃紺、真ん中に7色の筋を1本。区切らない。
    const r = g.createLinearGradient(0, 0, 0, H);
    r.addColorStop(0, "#1d2838");
    r.addColorStop(1, "#06090f");
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
    const 筋 = g.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i < 七色.length; i++) 筋.addColorStop(i / (七色.length - 1), 七色[i]);
    g.save();
    g.globalAlpha = 0.72;
    g.fillStyle = 筋;
    g.fillRect(W * 0.41, H * 0.07, W * 0.18, H * 0.86);
    g.restore();
  }
  return c.toDataURL("image/webp", 質);
}, 仕事);

const 共通 = { 元, 七色, 輪: { cx: 輪の中心x, cy: 輪の中心y, r: 輪の半径 } };

const 書く = async (out, 仕事) => {
  const u = await 描く({ ...共通, ...仕事 });
  const buf = Buffer.from(u.split(",")[1], "base64");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log("  " + path.relative(ROOT, out) + "  " + 仕事.W + "x" + 仕事.H + "  " + (buf.length / 1024).toFixed(0) + "KB");
};

const 先 = 案だけ ? path.join(ROOT, "scratchpad", "_mixbox") : 箱;
const 名 = 案だけ ? { top: "蓋", back: "裏", side: "側面" } : { top: "mixed-top", back: "mixed-back", side: "mixed-side" };
console.log(案だけ ? "案を出す（assets は触らない）:" : "まぜるの箱を焼く:");
await 書く(path.join(先, 名.top + ".webp"), { 種: "top", W: 512, H: 512, 質: 0.9 });
await 書く(path.join(先, 名.back + ".webp"), { 種: "back", W: 512, H: 512, 質: 0.9 });
await 書く(path.join(先, 名.side + ".webp"), { 種: "side", W: 64, H: 512, 質: 0.9 });
await browser.close();
