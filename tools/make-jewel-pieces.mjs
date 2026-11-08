// 1st EDITION のファーストカード「◯のジュエル」に合わせた駒テクスチャを7色ぶん作る。
//
// 🔴 **絵は PV・説明書（1st）で使っているジュエルそのもの**（ユーザー指示「1stのPVで
//    使用した感じのジュエルがいいです」）。元は
//    J:\自作カードゲーム\7 seven\説明用\説明書（1st）\素材\jewel_<色>.png（8色＋透明・2024-09）。
//    ⚠ 元の素材はリポジトリの外にあるので、この道具は**素材が手元にある時だけ**走る
//    （GitHub Actions では走らない＝npm run check には入れない）。
//
// 🔴 駒は **1枚のテクスチャを上面と4つの壁にすべて貼る**（main.js の buildCubePiece）ので、
//    「地の色＋中央にジュエル1つ」という作りにする。どの面から見ても同じジュエルが見える＝
//    標準スキン（色の地＋中央に白い紋章）とまったく同じ考え方。
//
// 🔴 **完全に不透明にする。** 既存の駒スキン113枚は透明画素が1つも無く、接触演出の
//    「filter を使わずに黒を重ねて陰影を作る」直し（続き671・#523）は
//    「brightness(b) ＝ 色×b ＝ 黒を 1-b で重ねる」が成り立つことに依っている。
//    透明があるとその等式が崩れる。
//
// 🔴 地の色はカードの絵から測る（私の目分量ではない）。assets/cards-illust/first-1st-<色>.webp の
//    宝石の面を輪状に標本して中央値を取り、**暗くして**地にする（ジュエルが明るいので、
//    地が明るいと沈む）。カードの絵を描き直したら、この道具を流し直せば駒も付いてくる。
//
// 使い方: node tools/make-jewel-pieces.mjs        （書き出す）
//         node tools/make-jewel-pieces.mjs --dry  （測るだけ・書かない）
//
// ⚠ このファイルにはバックティックを1文字も書かない（この環境の heredoc と node -e が
//   バックスラッシュ・バックティックを食うため＝続き650・657 の罠）。
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];
const SIZE = 384; // 既存の駒スキンと同じ
const DRY = process.argv.includes("--dry");

// PV・説明書（1st）のジュエル素材の置き場所。手元に無ければ、はっきり止める
// （黙って古い絵で作り直すと、どの版の絵なのか分からなくなる）。
const 素材 = process.env.SO7_JEWEL_SRC || "J:/自作カードゲーム/7 seven/説明用/説明書（1st）/素材";
const 素材名 = { red: "jewel_red.png", orange: "jewel_orange-300x300.png", yellow: "jewel_yellow-300x300.png", green: "jewel_green-300x300.png", blue: "jewel_blue-300x300.png", pink: "jewel_pink-300x300.png", purple: "jewel_purple-300x300.png" };

const pngUrl = (abs) => {
  if (!fs.existsSync(abs)) throw new Error("ジュエルの素材が無い: " + abs + "（SO7_JEWEL_SRC で場所を指定できる）");
  return "data:image/png;base64," + fs.readFileSync(abs).toString("base64");
};
const webpUrl = (rel) => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) throw new Error("絵が無い: " + rel);
  return "data:image/webp;base64," + fs.readFileSync(p).toString("base64");
};

const 入力 = {
  SIZE,
  ジュエル: Object.fromEntries(COLORS.map((c) => [c, pngUrl(path.join(素材, 素材名[c]))])),
  カード: Object.fromEntries(COLORS.map((c) => [c, webpUrl("assets/cards-illust/first-1st-" + c + ".webp")])),
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank"); // ⚠ about:blank は file:// を読めないので data URL で渡す

const 結果 = await page.evaluate(async (入力) => {
  const S = 入力.SIZE;
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("読めない")); i.src = src; });
  const toPix = async (src) => {
    const img = await load(src);
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return { w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data };
  };

  // カードの絵から宝石の色を測る（地の色のもと）
  const 色を測る = (j) => {
    const cx = j.w / 2, cy = j.h / 2, R = j.w / 2;
    const 輪 = (半径たち) => {
      const 標本 = [];
      for (let a = 0; a < 360; a += 2) {
        for (const r of 半径たち) {
          const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * R * r);
          const y = Math.round(cy + Math.sin((a * Math.PI) / 180) * R * r);
          const i = (y * j.w + x) * 4;
          標本.push([j.d[i], j.d[i + 1], j.d[i + 2]]);
        }
      }
      const med = (k) => { const v = 標本.map((s) => s[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
      return [med(0), med(1), med(2)];
    };
    return 輪([0.40, 0.43]);
  };
  const rgb = (v, f) => "rgb(" + Math.max(0, Math.min(255, Math.round(v[0] * f))) + "," + Math.max(0, Math.min(255, Math.round(v[1] * f))) + "," + Math.max(0, Math.min(255, Math.round(v[2] * f))) + ")";

  // ジュエルの絵の、本当に描かれている範囲（透明を除いた箱）を測る。
  // 🔴 素材は周りに余白があり、しかも色によって余白の量が違う。箱で測らずに貼ると
  //    **色ごとに大きさがバラバラ**になる。
  const 中身の箱 = (j) => {
    let x0 = j.w, y0 = j.h, x1 = -1, y1 = -1;
    for (let y = 0; y < j.h; y++) {
      for (let x = 0; x < j.w; x++) {
        if (j.d[(y * j.w + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) throw new Error("ジュエルの絵が空っぽ");
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  const 出 = {};
  for (const 色名 of Object.keys(入力.ジュエル)) {
    const 宝石 = await load(入力.ジュエル[色名]);
    const 宝石p = await toPix(入力.ジュエル[色名]);
    const 箱 = 中身の箱(宝石p);
    const 地色 = 色を測る(await toPix(入力.カード[色名]));

    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    const 中 = S / 2;

    // (1) 地: その色の濃いめ。🔴 不透明に塗りつぶす。
    //     ジュエルが明るい色なので、地は暗くしないと宝石が沈む。
    const g0 = ctx.createRadialGradient(S * 0.36, S * 0.30, 0, 中, 中, S * 0.78);
    g0.addColorStop(0, rgb(地色, 1.12));
    g0.addColorStop(0.55, rgb(地色, 0.98));
    g0.addColorStop(1, rgb(地色, 0.80));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, S, S);

    // (2) 宝石の後ろの光（宝石の輪郭を地から浮かせる）
    const g1 = ctx.createRadialGradient(中, 中, 0, 中, 中, S * 0.46);
    g1.addColorStop(0, "rgba(255,255,255,0.22)");
    g1.addColorStop(0.55, "rgba(255,255,255,0.10)");
    g1.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, S, S);

    // (3) ジュエル本体。長辺を 0.80*S に合わせて中央へ（色ごとの余白の差を吸収）
    const 倍 = (S * 0.80) / Math.max(箱.w, 箱.h);
    const dw = 箱.w * 倍, dh = 箱.h * 倍;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = S * 0.035;
    ctx.shadowOffsetY = S * 0.012;
    ctx.drawImage(宝石, 箱.x, 箱.y, 箱.w, 箱.h, 中 - dw / 2, 中 - dh / 2, dw, dh);
    ctx.restore();

    // (4) 角をほんの少し暗く（立方体の辺が見分けやすくなる）
    const g2 = ctx.createRadialGradient(中, 中, S * 0.40, 中, 中, S * 0.74);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(1, "rgba(0,0,0,0.17)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, S, S);

    // (5) 🔴 不透明にする（透明画素が1つでもあると、接触演出の陰影の計算が崩れる）
    const img = ctx.getImageData(0, 0, S, S);
    let 透明 = 0;
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 255) { img.data[i] = 255; 透明++; }
    if (透明) ctx.putImageData(img, 0, 0);

    出[色名] = { url: c.toDataURL("image/webp", 0.92), 地色, 素材の大きさ: 宝石p.w + "x" + 宝石p.h, 中身の箱: 箱, 透明を直した: 透明 };
  }
  return 出;
}, 入力);

let 書いた = 0;
for (const [色名, v] of Object.entries(結果)) {
  const rel = "assets/pieces/" + 色名 + "-jewel.webp";
  const buf = Buffer.from(v.url.split(",")[1], "base64");
  console.log(
    色名.padEnd(7) + " 素材" + v.素材の大きさ + " 中身" + v.中身の箱.w + "x" + v.中身の箱.h +
    " 地" + JSON.stringify(v.地色) + "  " + (buf.length / 1024).toFixed(1) + "KB" + (DRY ? "  （書かない）" : "")
  );
  if (!DRY) { fs.writeFileSync(path.join(ROOT, rel), buf); 書いた++; }
}
console.log(DRY ? "測っただけ" : "書いた: " + 書いた + " 枚");
await browser.close();
