// UI v2 の素材タイルを作る（assets/ui-v2/*.webp）。
//
// 【2026-11-13・続き699】
//   3枚（麻布・真鍮・紙）は**ここで手続き的に作る**（ノイズ。継ぎ目なし・ライセンス問題なし）。
//   1枚（七色の箔）だけは **Leonardo.ai で生成したもの**を元にする——
//   金属の刷毛目と箔の干渉色は手で書く式では無理があり、実測で木目／飴の縞にしかならなかった。
//
// 🔴 継ぎ目が出ない理由: 格子の座標を**タイルの幅で剰余**しているので、作りからして繋がる。
// 🔴 大きさは **512px角**。画像は容量ではなく「幅×高さ×4バイト」でメモリを食う（#223 / #607）ので、
//    全画面の1枚絵（1672x941 = 6.3MB）は使わない。512px角なら 1.0MB で全画面に敷ける。
//
// 使い方:
//   node tools/make-ui-v2-textures.mjs
//   （箔の元絵を差し替えたい時は --foil "<パス>" を渡す）
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// 🔴 大きさは**用途から逆算**する（512角4枚だと 4.00MB で払いすぎ＝#607 の教訓）。
//   ・紙/麻布/真鍮 … 地の粒。スマホ実機（ステージ0.478・dpr3）で 180ステージpx ＝ 258実画素
//     ＝ **256角でちょうど1:1**。PCでは少し伸びるが、粒なので柔らかくなるだけで分からない。
//   ・箔 … 使い道が「上端の3pxの線」で**幅いっぱいに1枚伸ばす**ので、縦は要らない。
const N = 256;
const 箔W = 512;
const 箔H = 64;
const 出力 = "assets/ui-v2";
const 既定の箔 =
  "D:/Adobe退避/lucid-origin_Seamless_tileable_texture_of_holographic_rainbow_foil_smooth_iridescent_spectrum-0.jpg";
const 引数 = process.argv.slice(2);
const 箔の元 = 引数.includes("--foil") ? 引数[引数.indexOf("--foil") + 1] : 既定の箔;

const 生成器 = `
const N = ${N};
function hash(ix, iy, s) {
  let h = (ix * 374761393 + iy * 668265263 + s * 1442695040) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, y, period, seed) {
  const gx = Math.floor(x / (N / period));
  const gy = Math.floor(y / (N / period));
  const fx = (x / (N / period)) - gx;
  const fy = (y / (N / period)) - gy;
  const w = (a, b) => hash(((a % period) + period) % period, ((b % period) + period) % period, seed);
  const a = w(gx, gy), b = w(gx + 1, gy), c = w(gx, gy + 1), d = w(gx + 1, gy + 1);
  const u = smooth(fx), v = smooth(fy);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x, y, 基, 段, seed) {
  let s = 0, amp = 1, tot = 0, p = 基;
  for (let i = 0; i < 段; i++) { s += amp * noise(x, y, p, seed + i); tot += amp; amp *= 0.5; p *= 2; }
  return s / tot;
}
function 作る(名) {
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const im = g.createImageData(N, N);
  const d = im.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const o = (y * N + x) * 4;
      let R = 0, G = 0, B = 0;
      if (名 === "linen") {
        // 麻布: 縦糸と横糸を交互に。糸の太さ（節）と地の斑をノイズで揺らす。
        // ⚠ 斑の周期を低くしすぎる（= 塊が大きい）と、斜めの縞に見える（実測で踏んだ）。
        const 糸 = 4;
        const 縦 = Math.sin((x / 糸) * Math.PI) * 0.5 + 0.5;
        const 横 = Math.sin((y / 糸) * Math.PI) * 0.5 + 0.5;
        const 交互 = (Math.floor(x / 糸) + Math.floor(y / 糸)) % 2 === 0 ? 縦 : 横;
        const 斑 = fbm(x, y, 28, 3, 11);
        const 節 = fbm(x, y, 7, 2, 31);
        const v = 0.30 + 交互 * (0.13 + (節 - 0.5) * 0.09) + (斑 - 0.5) * 0.13;
        R = 58 * v * 2.1; G = 54 * v * 2.1; B = 48 * v * 2.1;
      } else if (名 === "brass") {
        // 真鍮: 横方向に長く平均したノイズ＝刷毛目。
        // ⚠ 色むらの周期を低くすると**木目**に見える（実測で踏んだ）。細かく・弱く。
        let 筋 = 0;
        for (let k = -15; k <= 15; k++) 筋 += fbm(x + k * 2, y, 170, 1, 23);
        筋 /= 31;
        const むら = fbm(x, y, 26, 2, 77);
        const v = 0.52 + (筋 - 0.5) * 1.15 + (むら - 0.5) * 0.09;
        R = 232 * v; G = 186 * v; B = 104 * v;
      } else {
        // 簀の目紙: 細かい粒＋横に走る長い繊維＋うっすら簀の目
        const 粒 = fbm(x, y, 64, 3, 5);
        let 繊維 = 0;
        for (let k = -9; k <= 9; k++) 繊維 += fbm(x + k * 3, y, 96, 2, 41);
        繊維 /= 19;
        const 簀 = Math.sin((y / 7) * Math.PI * 2) * 0.5 + 0.5;
        const v = 0.90 + (粒 - 0.5) * 0.08 + (繊維 - 0.5) * 0.1 + (簀 - 0.5) * 0.02;
        R = 255 * v; G = 252 * v; B = 243 * v;
      }
      d[o] = Math.max(0, Math.min(255, R));
      d[o + 1] = Math.max(0, Math.min(255, G));
      d[o + 2] = Math.max(0, Math.min(255, B));
      d[o + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL("image/webp", 0.86);
}
window.__make = 作る;
`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto("about:blank");
  await page.evaluate(生成器);
  fs.mkdirSync(出力, { recursive: true });

  const 結果 = [];
  for (const 名 of ["linen", "brass", "paper"]) {
    const url = await page.evaluate((n) => window.__make(n), 名);
    const buf = Buffer.from(url.split(",")[1], "base64");
    fs.writeFileSync(path.join(出力, 名 + ".webp"), buf);
    結果.push([名, buf.length]);
  }

  // 箔: Leonardo の生成物を横長の帯へ落として webp にする。
  // ⚠ タイルにはしない——使い道が「上端の3pxの線」で、幅いっぱいに1枚伸ばすので継ぎ目が出ない。
  // 🔴 箔W / 箔H は **Node 側の変数**なので、page.evaluate へは引数で渡す（中からは見えない）。
  if (!fs.existsSync(箔の元)) {
    console.log("⚠ 箔の元絵が見つからないので飛ばす: " + 箔の元);
  } else {
    const 元 = "data:image/jpeg;base64," + fs.readFileSync(箔の元).toString("base64");
    const url = await page.evaluate(async ({ d, 箔W, 箔H }) => {
      const img = new Image();
      img.src = d;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = 箔W; c.height = 箔H;
      const g = c.getContext("2d");
      // 真ん中の横帯だけを使う（線にするので縦は要らない）
      const h = Math.round(img.naturalHeight / 6);
      g.drawImage(img, 0, Math.round((img.naturalHeight - h) / 2), img.naturalWidth, h, 0, 0, 箔W, 箔H);
      return c.toDataURL("image/webp", 0.88);
    }, { d: 元, 箔W, 箔H });
    const buf = Buffer.from(url.split(",")[1], "base64");
    fs.writeFileSync(path.join(出力, "foil.webp"), buf);
    結果.push(["foil", buf.length]);
  }

  const タイル = 結果.filter((r) => r[0] !== "foil").length;
  const 箔あり = 結果.some((r) => r[0] === "foil");
  const 合計MB = (タイル * N * N * 4 + (箔あり ? 箔W * 箔H * 4 : 0)) / 1024 / 1024;
  console.log(結果.map(([n, b]) => n + " " + (b / 1024).toFixed(1) + "KB").join(" / "));
  console.log("🔴 画面に出した時のメモリ: " + N + "px角 x " + タイル + "枚" + (箔あり ? " ＋ 箔 " + 箔W + "x" + 箔H : "") + " = " + 合計MB.toFixed(2) + "MB（幅×高さ×4バイト）");
} finally {
  await browser.close();
}
