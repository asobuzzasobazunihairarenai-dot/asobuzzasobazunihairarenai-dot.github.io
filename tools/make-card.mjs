// カードの絵を、イラスト1枚から組み立てる道具。
//
// 【何を作るか】ユーザーの手順どおりに重ねる:
//   1層目 … 色のべた塗り（素材フォルダの 1層目/）
//   2層目 … イラストを**カードより少し大きく**して中心を合わせ、**15%の半透明**で重ねる
//   3層目 … 同じイラストを**カードより少し小さく**して中心を合わせ、そのまま重ねる
//   飾り  … 枠・帯・色名・階調・紙の肌理（下記のとおり**合成モードごとに分けて**重ねる）
//   文字  … 下のクレジット行だけここで描く。カード名・効果文・フレーバーは**アプリが描く**
//          （効果文を直すと全画面に即反映される今の作りを壊さないため＝ユーザー判断）。
//
// 🔴 【飾りは「4層目の PNG」ではなく、焼き出した3枚を使う】
//   4層目として書き出された PNG は、Illustrator で **乗算・オーバーレイ**が掛かっていた層まで
//   **普通の不透明な板に焼き込まれている**。そのまま重ねると紙の肌理が灰色の膜になり、
//   カード全面が白っぽくなる（ユーザー報告①「帯が白っぽい／キューブの透かしが薄い」）。
//   合成モードは「下に何があるか」で結果が変わる計算なので、**1枚の絵には畳めない**。
//   ⇒ [tools/bake-card-layers.mjs] で原本の .ai から**合成モードごとに3枚**焼き出し、
//     normal はそのまま／grad はオーバーレイ／tex は乗算で重ねる。
//   ⚠ 焼き出しが無い時は、今までどおり 4層目/5層目 の PNG を使う（下の「古いやり方」）。
//     見た目は落ちるが止まらない。
//
// 🔴 【倍率と透け具合は推測ではなく、原本の .ai から読んだ値】
//   「SOSC_ol（レイヤーごとに分ける）.ai」は中身が PDF なので、レイヤー（OCG）と
//   変形行列をそのまま読み取った。出てきた数字:
//     ・アートボード  155.906pt = 55.0mm（650px で書き出すと 300dpi ちょうど）
//     ・2層目  172.9133825pt = 61.0mm、原点 -8.5039368pt → **110.909%・中央**
//     ・2層目の不透明度  ExtGState GS1 の ca = 0.149994 → **15%**（合成は Normal）
//     ・3層目  144.566925pt = 51.0mm、原点 5.6692915pt → **92.727%・中央**
//   mm で見ると **55 / 61 / 51** ときれいに揃う。
//   ⚠ 2層目は .ai でもアートボードに切り抜かれている（W n）ので、はみ出しは捨ててよい。
//
// 【本物とどれだけ一致するか（紫１で実測・0〜255の平均差）】
//   pdf.js に .ai を丸ごと描かせた（＝これ以上良くならない下限） … 10.74
//   **このやり方（自分のイラスト＋焼き出した3枚）**                 … **8.67**
//
// 【使い方】
//   node tools/make-card.mjs --list            （使える枠の名前を出す）
//   node tools/make-card.mjs --illust 絵.png --frame 通常カード_表_赤１ --out out.png \
//        --illustrator SEVRAIL --date 2026.11 --edition S
//   つまみ: --size 650（出力の一辺） --app <出力.webp>（アプリ用 433px も出す）
//           --no-credits（下の行を入れない） --legacy（焼き出しを使わず古いやり方で）
//
// ⚠ **新しいライブラリは入れていない。** すでに開発依存にある Playwright の Chromium で
//   canvas に描く。アプリと同じ描画エンジンなので、縮小の滑らかさが本番と一致する。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// 素材はリポジトリの外（公開リポジトリに実物の絵は入れない＝CLAUDE.md の決まり）。
const SRC_DIR = process.env.SO7_CARD_SRC || "D:/7 SHADES OF SEVEN remake デジタル版/画像素材/カード製作用オリジナル";
const BAKE_DIR = path.join(SRC_DIR, "焼き出し");

// 🔴 決まった値は [tools/card-layout.mjs] に集めてある。
//   確かめる道具（verify-card-art.mjs）も同じものを読む＝片方だけ直してズレるのを防ぐため。
import { LAYER, SCALE2, SCALE3, BAKE_ORDER, BAKE_BLEND, CREDITS } from "./card-layout.mjs";
export { LAYER, BAKE_ORDER, BAKE_BLEND, CREDITS };

const strip = (f) => f.replace(/^SOSC_ol_/, "").replace(/\.png$/i, "");
function listFrames() {
  const d1 = path.join(SRC_DIR, "1層目");
  const d4 = path.join(SRC_DIR, "4層目");
  if (!fs.existsSync(d1) || !fs.existsSync(d4)) return [];
  const a = new Set(fs.readdirSync(d1).filter((f) => f.endsWith(".png")).map(strip));
  const b = new Set(fs.readdirSync(d4).filter((f) => f.endsWith(".png")).map(strip));
  return [...a].filter((x) => b.has(x)).sort();
}
function framePaths(name, legacy) {
  const f = "SOSC_ol_" + name + ".png";
  const p1 = path.join(SRC_DIR, "1層目", f);
  if (!fs.existsSync(p1)) throw new Error("1層目が見つからない: " + p1);
  // 焼き出した3枚（あればこちらを使う）
  const baked = {};
  let hasBaked = true;
  for (const key of BAKE_ORDER) {
    const t = path.join(BAKE_DIR, name + "_" + key + ".png");
    if (fs.existsSync(t)) baked[key] = t; else hasBaked = false;
  }
  if (!legacy && hasBaked) return { p1, baked, p4: null, p5: null };
  // 古いやり方: 4層目（枠と模様）＋ 5層目（色名）の PNG
  const p4 = path.join(SRC_DIR, "4層目", f);
  if (!fs.existsSync(p4)) throw new Error("4層目も焼き出しも見つからない: " + name);
  let p5 = null;
  const d5 = path.join(SRC_DIR, "5層目");
  if (fs.existsSync(d5)) {
    for (const cand of ["SOSC_ol（レイヤーごとに分ける）_" + name + ".png", f]) {
      const t = path.join(d5, cand);
      if (fs.existsSync(t)) { p5 = t; break; }
    }
  }
  return { p1, baked: null, p4, p5 };
}

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf("--" + k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const has = (k) => args.includes("--" + k);

if (has("list") || args.length === 0) {
  const frames = listFrames();
  const baked = fs.existsSync(BAKE_DIR) ? new Set(fs.readdirSync(BAKE_DIR).filter((f) => f.endsWith("_normal.png")).map((f) => f.replace(/_normal\.png$/, ""))) : new Set();
  console.log("素材フォルダ: " + SRC_DIR);
  console.log("焼き出し: " + (baked.size ? baked.size + "枠ぶん在る" : "🔴 まだ無い（node tools/bake-card-layers.mjs で作れます）"));
  console.log("使える枠（" + frames.length + "種）:");
  for (const f of frames) console.log("  " + f + (baked.has(f) ? "" : "   ⚠ 焼き出しなし（古いやり方になります）"));
  console.log("");
  console.log("例: node tools/make-card.mjs --illust 絵.png --frame 通常カード_表_赤１ --out out.png \\");
  console.log("      --illustrator SEVRAIL --date 2026.11 --edition S");
  process.exit(frames.length ? 0 : 2);
}

const illust = opt("illust");
const frame = opt("frame");
const out = opt("out");
const size = Number(opt("size", "650"));
const legacy = has("legacy");
const texScale = Number(opt("tex", String(LAYER.textureScale))); // 古いやり方でだけ効く
const illustrator = opt("illustrator", null); // 誰がイラストか
const issueDate = opt("date", null);          // 発行年月（例 2026.11）
const edition = opt("edition", null);         // エディション記号
const noCredits = has("no-credits");
const appOut = opt("app");
if (!illust || !frame || !out) {
  console.error("🔴 --illust と --frame と --out は必須です（--list で枠の名前が出ます）");
  process.exit(2);
}
if (!fs.existsSync(illust)) { console.error("🔴 イラストが見つからない: " + illust); process.exit(2); }
const { p1, baked, p4, p5 } = framePaths(frame, legacy);
// エディション記号の絵（焼き出し/記号_<名前>.png）。無ければ書体で描く。
const markImagePath = (() => {
  if (!edition) return null;
  const t = path.join(BAKE_DIR, "記号_" + edition + ".png");
  return fs.existsSync(t) ? t : null;
})();

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
const toDataUrl = (p) => {
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
  return "data:" + mime + ";base64," + fs.readFileSync(p).toString("base64");
};

const result = await page.evaluate(
  async ({ base, illu, baked, blend, order, top, name5, size, scale2, scale3, op2, tex, cr }) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("画像を読めなかった")); i.src = src; });
    const imgBase = await load(base);
    const imgIllu = await load(illu);

    const cv = document.createElement("canvas");
    cv.width = size; cv.height = size;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 正方形でない絵でも中心を合わせて「箱いっぱいに覆う」（はみ出しは切る）。
    const drawCover = (img, box) => {
      const s = Math.max(box / img.naturalWidth, box / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    };

    // ①色のべた塗り
    ctx.drawImage(imgBase, 0, 0, size, size);
    // ②イラストを少し大きく・半透明で（canvas の外は自然に切られる＝.ai の切り抜きと同じ）
    ctx.save();
    ctx.globalAlpha = op2;
    drawCover(imgIllu, size * scale2);
    ctx.restore();
    // ③イラストを少し小さく・そのまま
    drawCover(imgIllu, size * scale3);

    let 使った = "";
    let texTouched = "—";
    if (baked) {
      // ④焼き出した絵を、決めた順に・それぞれの合成モードで重ねる
      for (const key of order) {
        const im = await load(baked[key]);
        ctx.save();
        if (blend[key]) ctx.globalCompositeOperation = blend[key];
        ctx.drawImage(im, 0, 0, size, size);
        ctx.restore();
      }
      使った = "焼き出した" + order.length + "枚（" + order.map((k) => k + (blend[k] ? "=" + blend[k] : "")).join(" / ") + "）";
    } else {
      // ④'古いやり方: 4層目 PNG の紙の肌理だけ薄めて重ねる
      const imgTop0 = await load(top);
      const thinTexture = (img) => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const id = g.getImageData(0, 0, c.width, c.height);
        const d = id.data;
        let touched = 0;
        for (let i = 3; i < d.length; i += 4) {
          const a = d[i] / 255;
          if (a >= tex.min && a <= tex.max) { d[i] = Math.round(a * tex.scale * 255); touched++; }
        }
        g.putImageData(id, 0, 0);
        return { canvas: c, touched, total: d.length / 4 };
      };
      const thinned = tex.scale < 1 ? thinTexture(imgTop0) : null;
      ctx.drawImage(thinned ? thinned.canvas : imgTop0, 0, 0, size, size);
      if (name5) ctx.drawImage(await load(name5), 0, 0, size, size);
      使った = "4層目の PNG（古いやり方）";
      texTouched = thinned ? (thinned.touched / thinned.total * 100).toFixed(1) + "%" : "薄めていない";
    }

    // ⑤クレジット行（文字）。650px を基準に測った値なので、出力の大きさに合わせて伸ばす。
    const k = size / 650;
    const 書体 = { 本文: null, 記号: null };
    if (cr && (cr.illustrator || cr.date || cr.edition)) {
      // 字の高さ（ascent）が狙いどおりになる文字サイズを探す（書体ごとに違うので毎回測る）
      const fitAscent = (font, target, sample) => {
        let lo = 2, hi = 160, sz = 12;
        for (let i = 0; i < 28; i++) {
          sz = (lo + hi) / 2;
          ctx.font = "bold " + sz + "px '" + font + "'";
          const a = ctx.measureText(sample).actualBoundingBoxAscent || 0;
          if (a < target) lo = sz; else hi = sz;
        }
        return sz;
      };
      // 書体が本当に当たったかを控える（当たらないと既定の書体で描かれて、黙って違う形になる）
      const 当たったか = (font) => {
        ctx.font = "bold 40px '" + font + "'";
        const a = ctx.measureText("S7Mg").width;
        ctx.font = "bold 40px 'Zz No Such Font Zz'";
        const b = ctx.measureText("S7Mg").width;
        return Math.abs(a - b) > 0.5;
      };
      書体.本文 = 当たったか(cr.font) ? cr.font : "🔴 当たらなかった:" + cr.font;
      const sz = fitAscent(cr.font, cr.ascent * k, "illustration");
      ctx.save();
      ctx.fillStyle = cr.color;
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold " + sz + "px '" + cr.font + "'";
      const draw = (text, x, align) => {
        const w = ctx.measureText(text).width * cr.squeeze;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        ctx.save();
        ctx.translate(left, cr.baseline * k);
        ctx.scale(cr.squeeze, 1);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };
      if (cr.illustrator) draw("illustration : " + cr.illustrator, cr.leftX * k, "left");
      draw(cr.center, cr.centerX * k, "center");
      if (cr.date) draw(cr.date, cr.rightEnd * k, "right");
      if (cr.edition && cr.markImage) {
        // 🔴 焼き出した記号の絵を、測った箱にそのまま置く（いちばん確実）
        const B = cr.markBox;
        const mi = await load(cr.markImage);
        ctx.drawImage(mi, B.x * k, B.y * k, B.w * k, B.h * k);
        書体.記号 = "焼き出した絵";
      } else if (cr.edition) {
        // 絵が無い記号 → 書体で描く（形は本物と違う。上の説明参照）
        書体.記号 = (当たったか(cr.markFont) ? cr.markFont : "🔴 当たらなかった:" + cr.markFont) + "（⚠ 絵が無いので書体で代用）";
        const B = cr.markBox;
        const probe = 100;
        ctx.font = probe + "px '" + cr.markFont + "'";
        const m = ctx.measureText(cr.edition);
        const gw = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
        const gh = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0);
        if (gw > 0 && gh > 0) {
          // 箱に収まる方の倍率を使う（はみ出させない）
          const sc = Math.min((B.w * k) / gw, (B.h * k) / gh) * probe;
          ctx.font = sc + "px '" + cr.markFont + "'";
          const m2 = ctx.measureText(cr.edition);
          const l2 = m2.actualBoundingBoxLeft || 0;
          const a2 = m2.actualBoundingBoxAscent || 0;
          const w2 = l2 + (m2.actualBoundingBoxRight || 0);
          const h2 = a2 + (m2.actualBoundingBoxDescent || 0);
          // 箱の中で中央に置く
          const ox = B.x * k + (B.w * k - w2) / 2 + l2;
          const oy = B.y * k + (B.h * k - h2) / 2 + a2;
          ctx.textBaseline = "alphabetic";
          ctx.fillText(cr.edition, ox, oy);
        }
      }
      ctx.restore();
    }

    return {
      png: cv.toDataURL("image/png"),
      webp433: await (async () => {
        const c2 = document.createElement("canvas");
        c2.width = 433; c2.height = 433;
        const g = c2.getContext("2d");
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
        g.drawImage(cv, 0, 0, 433, 433);
        return c2.toDataURL("image/webp", 0.92);
      })(),
      illustSize: imgIllu.naturalWidth + "x" + imgIllu.naturalHeight,
      baseSize: imgBase.naturalWidth + "x" + imgBase.naturalHeight,
      使った, texTouched, 書体,
    };
  },
  {
    base: toDataUrl(p1), illu: toDataUrl(illust),
    baked: baked ? Object.fromEntries(BAKE_ORDER.map((k) => [k, toDataUrl(baked[k])])) : null,
    blend: BAKE_BLEND, order: BAKE_ORDER,
    top: p4 ? toDataUrl(p4) : null,
    name5: p5 ? toDataUrl(p5) : null,
    size, scale2: SCALE2, scale3: SCALE3, op2: LAYER.layer2Opacity,
    tex: { min: LAYER.textureAlphaMin, max: LAYER.textureAlphaMax, scale: texScale },
    cr: noCredits ? null : { ...CREDITS, illustrator, date: issueDate, edition, markImage: markImagePath ? toDataUrl(markImagePath) : null },
  }
);
await browser.close();

const write = (dataUrl, dest) => {
  fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(dataUrl.split(",")[1], "base64"));
  return fs.statSync(dest).size;
};
const n1 = write(result.png, out);
console.log("✅ " + out + "（" + size + "x" + size + " / " + Math.round(n1 / 1024) + "KB）");
if (appOut) {
  const n2 = write(result.webp433, appOut);
  console.log("✅ " + appOut + "（433x433 / " + Math.round(n2 / 1024) + "KB・アプリ用）");
}
console.log("");
console.log("使った素材: 枠「" + frame + "」 / 1層目 " + result.baseSize + " / イラスト " + result.illustSize);
console.log("飾り: " + result.使った + (baked ? "" : "（紙の肌理を " + (texScale * 100).toFixed(0) + "% に薄めた・面の " + result.texTouched + "）"));
console.log(
  "クレジット: " +
    (noCredits ? "入れていない（--no-credits）" :
      [illustrator ? "illustration : " + illustrator : null, issueDate, edition ? "記号 " + edition : null]
        .filter(Boolean).join(" / ") || "（--illustrator / --date / --edition で指定）")
);
if (!noCredits && (illustrator || issueDate || edition)) {
  console.log("使った書体: 本文 " + result.書体.本文 + (edition ? " / 記号 " + result.書体.記号 : ""));
}
console.log("重ね方: 2層目 " + (SCALE2 * 100).toFixed(3) + "%・不透明度 " + (LAYER.layer2Opacity * 100).toFixed(1) + "% ／ 3層目 " + (SCALE3 * 100).toFixed(3) + "%（どちらも中心合わせ）");
if (result.illustSize.split("x").some((n) => Number(n) < size * SCALE2)) {
  console.log("⚠ イラストが " + Math.ceil(size * SCALE2) + "px より小さいので、2層目が引き伸ばされています（元絵は長辺 " + Math.ceil(size * SCALE2) + "px 以上が理想）。");
}
void HERE;
