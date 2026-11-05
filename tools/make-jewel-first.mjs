// 1st EDITION のファーストカード（◯のジュエル）の絵を作る。
//
// 【考え方】リメイクのファーストカードは「キューブを真上から見たシルエット」が元のデザイン
//   （外の輪郭＋内の輪郭＋それをつなぐ稜線）。1st のファーストは**ジュエル**なので、
//   同じ組み立てでラウンドブリリアントを真上から描く:
//     キューブ = 正方形 + 正方形 + 対角線4本
//     ジュエル = 八角形(ガードル) + 八角形(テーブル面) + 稜線16本
//   🔴 テーブル面は**ガードルに対して22.5度回す**。本物のブリリアントは「テーブルの角が
//     ガードルの辺の真ん中を向く」ので、この回転があって初めて凧形と三角が交互に並ぶ。
//     回さないと「ただの八角形」に見える。
//
// 【作り方】原本 .ai から **レイヤー 22（キューブの幾何模様）だけを消して**描き、
//   空いたそこへジュエルを描く。地・階調・中心の発光・紙の粒子・中央の紋章・色名・
//   クレジット行は**かくざとう氏のデータそのまま**。私が足すのは幾何模様・台座・爪・財力の印だけ。
//
// 🔴 pdf.js は**不透明度は反映するが合成モードを落とす**（続き646）。素直に1枚で描くと
//   Gradation（本当はオーバーレイ）と Texture（本当は乗算）がそのまま乗って**色が淡くなる**
//   （実測で彩度が黄 -0.31・橙 -0.27・赤 -0.23 落ちた）。層を分けて、tools/card-layout.mjs の
//   BAKE_BLEND と同じ重ね方を自分で掛ける。
//
// 【出すもの】assets/cards-blank/first-1st-<色>.webp と assets/cards-illust/first-1st-<色>.webp
//   🔴 assets/cards/（文字入り）は作らない——文字はアプリが描く（そうしないと英語に切り替わらない）。
//
// 使い方: node tools/make-jewel-first.mjs [--out-dir <dir>]
// ⚠ 素材（原本 .ai）はリポジトリの外にあるので、無い時は終了コード2で止まる（CIでは動かせない）。
// ⚠ このファイルにはバックティックを1文字も書かない。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SRC_DIR = "D:/7 SHADES OF SEVEN remake デジタル版/画像素材/カード製作用オリジナル";
const AI_PATH = process.env.SO7_CARD_AI || path.join(SRC_DIR, "SOSC_ol（レイヤーごとに分ける）.ai");
const PORT = 8841;
const 色一覧 = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];

const 引数 = process.argv.slice(2);
const outIdx = 引数.indexOf("--out-dir");
const OUT_BLANK = outIdx >= 0 ? path.resolve(引数[outIdx + 1]) : path.join(REPO, "assets/cards-blank");
const OUT_ILLUST = outIdx >= 0 ? path.resolve(引数[outIdx + 1]) : path.join(REPO, "assets/cards-illust");

if (!fs.existsSync(AI_PATH)) {
  console.log("⚠ 原本が見つかりません: " + AI_PATH);
  console.log("  （実物の絵はリポジトリの外にあります。確かめられないので何もしません）");
  process.exit(2);
}
for (const c of 色一覧) {
  const p = path.join(REPO, "assets/cards-blank/first-" + c + ".webp");
  if (!fs.existsSync(p)) { console.log("🔴 見本が無い: " + p); process.exit(2); }
}

const 本物 = {};
for (const c of 色一覧) {
  本物[c] = "data:image/webp;base64," + fs.readFileSync(path.join(REPO, "assets/cards-blank/first-" + c + ".webp")).toString("base64");
}

const aiSize = fs.statSync(AI_PATH).size;
const server = http.createServer((req, res) => {
  if ((req.url || "").split("?")[0] !== "/card.pdf") { res.writeHead(404); res.end(); return; }
  const common = { "Content-Type": "application/pdf", "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" };
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Number(m[2]) : aiSize - 1;
    res.writeHead(206, { ...common, "Content-Range": "bytes " + start + "-" + end + "/" + aiSize, "Content-Length": end - start + 1 });
    fs.createReadStream(AI_PATH, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...common, "Content-Length": aiSize });
    fs.createReadStream(AI_PATH).pipe(res);
  }
});
await new Promise((r) => server.listen(PORT, r));

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") console.log("  [ブラウザ] " + m.text().slice(0, 200)); });
await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" });
console.log("原本 " + (aiSize / 1024 / 1024).toFixed(0) + "MB を読み込み中…（30秒ほど）");

const 結果 = await page.evaluate(async (o) => {
  const L = window["pdfjsLib"];
  L.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const doc = await L.getDocument({ url: "http://localhost:" + o.port + "/card.pdf", disableAutoFetch: true, rangeChunkSize: 1 << 18 }).promise;
  const occ = await doc.getOptionalContentConfig();
  const groups = occ.getGroups();
  const ids = Object.keys(groups).map((id) => ({ id, name: groups[id].name }));

  const S = 433, Z = 2, SS = S * Z;
  const CUBE = "レイヤー 22";   // キューブの幾何模様（これを消して、ジュエルを描く）
  const ICON = "Over";          // 右上の追色アイコン（7辺＝7色）。財力の印に差し替える
  const 文字 = ["Icon", "Bahamut", "Text_Name", "Text_Name_Min", "Text_Flavor", "Text_ヒラギノ角ゴ Pro W6", "Text_Superclarendon"];

  const 画布 = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const 読む = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });

  async function 描く(p, 見える, size) {
    for (const x of ids) occ.setVisibility(x.id, 見える(x.name));
    const c = 画布(size, size);
    const vp0 = p.getViewport({ scale: 1 });
    await p.render({
      canvasContext: c.getContext("2d"),
      viewport: p.getViewport({ scale: size / vp0.width }),
      optionalContentConfigPromise: Promise.resolve(occ),
      background: "rgba(0,0,0,0)",
    }).promise;
    return c;
  }

  // 本物の文字無しカードから「枠の灰色」と「札の矩形」を取る（台座の色と形をそろえる）
  const im0 = await 読む(o.本物.red);
  const c0 = 画布(S, S); const g0 = c0.getContext("2d", { willReadFrequently: true });
  g0.drawImage(im0, 0, 0);
  const d0 = g0.getImageData(0, 0, S, S).data;
  const px0 = (x, y) => { const i = (y * S + x) * 4; return [d0[i], d0[i + 1], d0[i + 2]]; };
  const 灰 = px0(2, 2);
  const 灰か = (p) => Math.abs(p[0] - 灰[0]) < 14 && Math.abs(p[1] - 灰[1]) < 14 && Math.abs(p[2] - 灰[2]) < 14;
  const mid = Math.round(S / 2);
  let Lx = 0; while (Lx < S && 灰か(px0(Lx, mid))) Lx++;
  let Rx = S - 1; while (Rx > 0 && 灰か(px0(Rx, mid))) Rx--;
  let Ty = 0; while (Ty < S && 灰か(px0(mid, Ty))) Ty++;
  let By = S - 1; while (By > 0 && 灰か(px0(mid, By))) By--;
  const 札 = { x: Lx, y: Ty, w: Rx - Lx + 1, h: By - Ty + 1 };
  const 灰色 = (明) => {
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * 明)));
    return "rgb(" + f(灰[0]) + "," + f(灰[1]) + "," + f(灰[2]) + ")";
  };

  const 出力 = {}, 情報 = [];

  for (let n = 4; n <= 10; n++) {
    const p = await doc.getPage(n);

    // 色を決める（Paper 層のべた塗り）
    const paper = await 描く(p, (x) => x === "Paper", 64);
    const pd = paper.getContext("2d", { willReadFrequently: true }).getImageData(32, 32, 1, 1).data;
    const 紙 = [pd[0], pd[1], pd[2]];
    const 名 = (() => {
      const [R2, G2, B2] = 紙;
      const mx = Math.max(R2, G2, B2), mn = Math.min(R2, G2, B2);
      let h = 0;
      if (mx !== mn) {
        if (mx === R2) h = ((G2 - B2) / (mx - mn) + 6) % 6;
        else if (mx === G2) h = (B2 - R2) / (mx - mn) + 2;
        else h = (R2 - G2) / (mx - mn) + 4;
        h *= 60;
      }
      if (h < 15 || h >= 330) return (B2 > 120 && R2 > 180) ? "pink" : "red";
      if (h < 30) return "orange";
      if (h < 70) return "yellow";
      if (h < 170) return "green";
      if (h < 250) return "blue";
      if (h < 290) return "purple";
      return "pink";
    })();

    // 右上アイコンの囲み（財力の印をそこへ置く。ページによって層が空なので控えを持つ）
    const iconC = await 描く(p, (x) => x === ICON, S);
    const icd = iconC.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, S, S).data;
    let ix0 = S, iy0 = S, ix1 = -1, iy1 = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (icd[(y * S + x) * 4 + 3] > 8) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
    }
    const 印 = (ix1 > ix0 && iy1 > iy0 && ix1 - ix0 < 80)
      ? { x: ix0, y: iy0, w: ix1 - ix0 + 1, h: iy1 - iy0 + 1 }
      : { x: 361, y: 92, w: 20, h: 19 };

    const baseN = await 描く(p, (x) => x !== CUBE && x !== ICON && x !== "Texture" && x !== "Gradation" && !文字.includes(x), SS);
    const grad = await 描く(p, (x) => x === "Gradation", SS);
    const tex = await 描く(p, (x) => x === "Texture", SS);
    const credit = await 描く(p, (x) => x === "Text_Date", SS);

    // 宝石のもと＝「キューブを抜いたカード」を正しい合成モードで組み直す
    const gemSrc = 画布(SS, SS);
    {
      const gg = gemSrc.getContext("2d");
      gg.drawImage(baseN, 0, 0);
      gg.globalCompositeOperation = "overlay"; gg.drawImage(grad, 0, 0);
      gg.globalCompositeOperation = "multiply"; gg.drawImage(tex, 0, 0);
      gg.globalCompositeOperation = "source-over";
    }

    // ---------------- 組み立て ----------------
    const out = 画布(S, S);
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.fillStyle = "rgb(" + 灰.join(",") + ")";
    g.fillRect(0, 0, S, S);
    g.save();
    g.shadowColor = "rgba(0,0,0,0.30)"; g.shadowBlur = 9; g.shadowOffsetX = 5; g.shadowOffsetY = 6;
    g.fillStyle = "#000"; g.beginPath(); g.roundRect(札.x + 3, 札.y + 3, 札.w - 6, 札.h - 6, 16); g.fill();
    g.restore();

    const K = 画布(SS, SS);
    const k = K.getContext("2d");
    k.imageSmoothingEnabled = true; k.imageSmoothingQuality = "high";
    const 札2 = { x: 札.x * Z, y: 札.y * Z, w: 札.w * Z, h: 札.h * Z };
    const cx = 札2.x + 札2.w / 2, cy = 札2.y + 札2.h / 2;
    const 半 = Math.min(札2.w, 札2.h) / 2 - 12 * Z;
    const Rg = 半 - 2 * Z, Rm = Rg * 0.66, Rt = Rg * 0.40;
    const 八角 = (rad, ずれ) => {
      const a = [];
      for (let i = 0; i < 8; i++) { const t = (Math.PI / 4) * i + ずれ; a.push([cx + rad * Math.cos(t), cy + rad * Math.sin(t)]); }
      return a;
    };
    const G8 = 八角(Rg, Math.PI / 8);
    const T8 = 八角(Rt, 0); // ガードルに対して 22.5度 回す
    const 道 = (ctx, pts, 閉) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); if (閉) ctx.closePath(); };
    const 中点 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    k.save();
    k.beginPath(); k.roundRect(札2.x, 札2.y, 札2.w, 札2.h, 16 * Z); k.clip();

    // ===== ① 台座（金属の板）=====
    k.fillStyle = 灰色(1.0); k.fillRect(札2.x, 札2.y, 札2.w, 札2.h);
    {
      const rg = k.createRadialGradient(cx, cy, Rg * 0.9, cx, cy, Rg * 1.9);
      rg.addColorStop(0, "rgba(255,255,255,0.40)");
      rg.addColorStop(0.45, "rgba(255,255,255,0.10)");
      rg.addColorStop(1, "rgba(0,0,0,0.055)");
      k.fillStyle = rg; k.fillRect(札2.x, 札2.y, 札2.w, 札2.h);
    }
    k.save(); // サテン仕上げ（放射のヘアライン）
    for (let i = 0; i < 900; i++) {
      const a = (i / 900) * Math.PI * 2 + 0.013;
      const 濃 = (i % 7 === 0) ? 0.030 : (i % 3 === 0 ? 0.018 : 0.009);
      const lg = k.createLinearGradient(cx + Math.cos(a) * Rg, cy + Math.sin(a) * Rg, cx + Math.cos(a) * 半 * 2.1, cy + Math.sin(a) * 半 * 2.1);
      lg.addColorStop(0, "rgba(255,255,255," + 濃 + ")");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      k.strokeStyle = lg; k.lineWidth = (i % 5 === 0) ? 1.6 : 0.8;
      k.beginPath();
      k.moveTo(cx + Math.cos(a) * Rg, cy + Math.sin(a) * Rg);
      k.lineTo(cx + Math.cos(a) * 半 * 2.1, cy + Math.sin(a) * 半 * 2.1);
      k.stroke();
    }
    k.restore();
    for (const 倍 of [1.085, 1.155]) { // 彫り（暗い線の下に明るい線）
      const P = 八角(Rg * 倍, Math.PI / 8);
      k.lineJoin = "miter";
      k.strokeStyle = "rgba(0,0,0,0.055)"; k.lineWidth = 1.5 * Z; 道(k, P, true); k.stroke();
      k.save(); k.translate(0, 1.1 * Z);
      k.strokeStyle = "rgba(255,255,255,0.22)"; k.lineWidth = 1.0 * Z; 道(k, P, true); k.stroke();
      k.restore();
    }
    { // 四隅の角印
      const m = 15 * Z, len = 20 * Z;
      const 角 = [[札2.x + m, 札2.y + m, 1, 1], [札2.x + 札2.w - m, 札2.y + m, -1, 1],
      [札2.x + m, 札2.y + 札2.h - m, 1, -1], [札2.x + 札2.w - m, 札2.y + 札2.h - m, -1, -1]];
      for (const [x, y, sx, sy] of 角) {
        k.strokeStyle = "rgba(0,0,0,0.10)"; k.lineWidth = 1.4 * Z; k.lineCap = "butt";
        k.beginPath(); k.moveTo(x + sx * len, y); k.lineTo(x, y); k.lineTo(x, y + sy * len); k.stroke();
        k.strokeStyle = "rgba(255,255,255,0.45)"; k.lineWidth = 1.0 * Z;
        k.beginPath(); k.moveTo(x + sx * len, y + sy * 1.2 * Z); k.lineTo(x + sx * 1.2 * Z, y + sy * 1.2 * Z); k.lineTo(x + sx * 1.2 * Z, y + sy * len); k.stroke();
      }
    }
    k.save(); // 紙の粒子（乗算）。🔴 宝石を置く前に。後からだと石だけ二重になる
    k.globalCompositeOperation = "multiply"; k.globalAlpha = 0.85;
    k.drawImage(tex, 0, 0, SS, SS, 札2.x, 札2.y, 札2.w, 札2.h);
    k.restore();

    // ===== ② 宝石（八角形で切り抜いたカード）=====
    k.save(); // 彫り込んだ穴（落ち影）
    道(k, 八角(Rg * 1.045, Math.PI / 8), true);
    k.shadowColor = "rgba(0,0,0,0.30)"; k.shadowBlur = 7 * Z; k.shadowOffsetX = 1.5 * Z; k.shadowOffsetY = 2 * Z;
    k.fillStyle = 灰色(0.86); k.fill();
    k.restore();
    k.strokeStyle = "rgba(255,255,255,0.28)"; k.lineWidth = 1.0 * Z;
    道(k, 八角(Rg * 1.045, Math.PI / 8), true); k.stroke();

    k.save(); 道(k, G8, true); k.clip();
    k.drawImage(gemSrc, 0, 0, SS, SS, 札2.x, 札2.y, 札2.w, 札2.h);
    // 面（凧形と三角を互い違いに）。🔴 白をそのまま乗せると色が抜けるので soft-light
    k.globalCompositeOperation = "soft-light";
    const 基 = 0.26;
    const 引く = (pts, 閉, 濃, 太) => {
      k.strokeStyle = "rgba(255,255,255," + (基 * 濃).toFixed(3) + ")";
      k.lineWidth = 太 * Z; 道(k, pts, 閉); k.stroke();
    };
    k.lineJoin = "round"; k.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const t = T8[i], a = G8[(i + 7) % 8], b = G8[i];
      道(k, [t, a, b], true);
      const e = 中点(a, b);
      const lg = k.createLinearGradient(e[0], e[1], t[0], t[1]);
      lg.addColorStop(0, "rgba(255,255,255,0.30)");
      lg.addColorStop(1, "rgba(255,255,255,0.02)");
      k.fillStyle = lg; k.fill();
    }
    for (let i = 0; i < 8; i++) {
      const t0 = T8[i], t1 = T8[(i + 1) % 8], g2 = G8[i];
      道(k, [t0, t1, g2], true);
      const e = 中点(t0, t1);
      const lg = k.createLinearGradient(e[0], e[1], g2[0], g2[1]);
      lg.addColorStop(0, "rgba(255,255,255,0.22)");
      lg.addColorStop(1, "rgba(255,255,255,0.01)");
      k.fillStyle = lg; k.fill();
    }
    k.globalCompositeOperation = "source-over";
    引く(G8, true, 1.00, 1.5);
    引く(T8, true, 0.90, 1.3);
    for (let i = 0; i < 8; i++) {
      引く([T8[i], G8[(i + 7) % 8]], false, 0.62, 1.0);
      引く([T8[i], G8[i]], false, 0.62, 1.0);
    }
    k.strokeStyle = "rgba(255,255,255," + (基 * 0.30).toFixed(3) + ")";
    k.lineWidth = 0.9 * Z;
    k.beginPath(); k.arc(cx, cy, Rm, 0, Math.PI * 2); k.stroke();
    k.restore();

    k.strokeStyle = "rgba(255,255,255,0.30)"; k.lineWidth = 1.1 * Z;
    道(k, G8, true); k.stroke();

    // ===== ③ 爪（台座が石を掴む）=====
    // 🔴 八角形の「辺」までの距離は Rg×cos22.5 ＝ 0.924Rg。内側の端をそれより内に入れないと
    //   石に掛からず、灰色のテープが浮いて見える（試作で実際にそうなった）。
    for (const 角度 of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
      const ux = Math.cos(角度), uy = Math.sin(角度);
      const px2 = -uy, py2 = ux;
      const 外 = Rg * 1.00, 内 = Rg * 0.855;
      const 幅外 = Rg * 0.055, 幅内 = Rg * 0.034;
      const A = [cx + ux * 外 + px2 * 幅外, cy + uy * 外 + py2 * 幅外];
      const B = [cx + ux * 外 - px2 * 幅外, cy + uy * 外 - py2 * 幅外];
      const C = [cx + ux * 内 - px2 * 幅内, cy + uy * 内 - py2 * 幅内];
      const D = [cx + ux * 内 + px2 * 幅内, cy + uy * 内 + py2 * 幅内];
      k.save();
      道(k, [A, B, C, D], true);
      k.shadowColor = "rgba(0,0,0,0.34)"; k.shadowBlur = 3.2 * Z; k.shadowOffsetX = 1.0 * Z; k.shadowOffsetY = 1.2 * Z;
      const lg = k.createLinearGradient(cx + ux * 外, cy + uy * 外, cx + ux * 内, cy + uy * 内);
      lg.addColorStop(0, 灰色(0.99));
      lg.addColorStop(0.55, 灰色(0.88));
      lg.addColorStop(1, 灰色(0.70));
      k.fillStyle = lg; k.fill();
      k.restore();
      k.strokeStyle = "rgba(255,255,255,0.32)"; k.lineWidth = 0.8 * Z;
      道(k, [A, D], false); k.stroke();
      k.strokeStyle = "rgba(0,0,0,0.14)"; k.lineWidth = 0.8 * Z;
      道(k, [B, C], false); k.stroke();
    }

    // ===== ④ 札の縁の面取り・クレジット行 =====
    k.strokeStyle = "rgba(255,255,255,0.55)"; k.lineWidth = 1.6 * Z;
    k.beginPath(); k.roundRect(札2.x + 0.8 * Z, 札2.y + 0.8 * Z, 札2.w - 1.6 * Z, 札2.h - 1.6 * Z, 16 * Z); k.stroke();
    k.strokeStyle = "rgba(0,0,0,0.10)"; k.lineWidth = 1.2 * Z;
    k.beginPath(); k.roundRect(札2.x + 2.4 * Z, 札2.y + 2.4 * Z, 札2.w - 4.8 * Z, 札2.h - 4.8 * Z, 15 * Z); k.stroke();
    k.drawImage(credit, 0, 0, SS, SS, 札2.x, 札2.y, 札2.w, 札2.h);

    // ===== ⑤ 財力の印（手札の束＝正方形の札3枚の扇 ＋「＝N」）=====
    // 元の七角形は**追色**の印（7辺＝7色）なので、1st では財力に差し替える。
    // 🔴 石は45度で切れているので**右上が灰色の三角**になる。印はそこへ収める
    //   （元の位置のまま左へ伸ばすと扇が石に乗り上げる）。
    // 🔴 台座が明るいので印は暗く。元は「濃い色地に白」だったので、対比の向きを反転させる。
    {
      const 右端 = (札.x + 札.w - 16) * Z, 中Y = (札.y + 40) * Z;
      const 字 = 印.h * Z * 0.82;
      k.font = "bold " + 字 + "px " + String.fromCharCode(34) + "Futura" + String.fromCharCode(34) + ",Century Gothic,Avenir Next,sans-serif";
      k.textBaseline = "middle"; k.textAlign = "left";
      const 数 = String(o.財力);
      const w数 = k.measureText(数).width, w等 = k.measureText("=").width;
      const 間 = 字 * 0.20;
      const x数 = 右端 - w数, x等 = x数 - 間 - w等;
      k.save();
      k.shadowColor = "rgba(0,0,0,0.22)"; k.shadowBlur = 2.0 * Z; k.shadowOffsetX = 0.7 * Z; k.shadowOffsetY = 0.9 * Z;
      k.fillStyle = 灰色(0.42);
      k.fillText("=", x等, 中Y);
      k.fillText(数, x数, 中Y);
      k.restore();
      // 扇。中心のずれ ＝ 持ち上げ × sin(開き)。札の幅の半分以上ずらさないと1枚に潰れる。
      const 辺 = 字 * 0.56, 持上 = 辺 * 1.05, 開き = 0.58;
      const 扇幅 = 辺 * 1.95;
      k.save();
      k.translate(x等 - 間 * 1.5 - 扇幅 / 2, 中Y + 持上 * 0.55);
      for (const 角 of [-開き, 0, 開き]) {
        k.save();
        k.rotate(角);
        k.translate(0, -持上);
        k.beginPath(); k.roundRect(-辺 / 2, -辺 / 2, 辺, 辺, 辺 * 0.17);
        k.strokeStyle = 灰色(1.02); k.lineWidth = 2.2 * Z; k.lineJoin = "round"; k.stroke();
        k.save();
        k.shadowColor = "rgba(0,0,0,0.30)"; k.shadowBlur = 2.2 * Z; k.shadowOffsetX = 0.8 * Z; k.shadowOffsetY = 1.0 * Z;
        k.fillStyle = 灰色(0.42); k.fill();
        k.restore();
        k.strokeStyle = "rgba(255,255,255,0.30)"; k.lineWidth = 0.7 * Z; k.stroke();
        k.restore();
      }
      k.restore();
    }

    k.restore();
    g.drawImage(K, 0, 0, SS, SS, 0, 0, S, S);
    出力[名] = out.toDataURL("image/webp", 0.92);
    情報.push({ ページ: n, 色: 名, 紙 });
  }
  return { 出力, 情報, 札 };
}, { port: PORT, 本物, 財力: 1 });

fs.mkdirSync(OUT_BLANK, { recursive: true });
fs.mkdirSync(OUT_ILLUST, { recursive: true });
let 書いた = 0;
for (const [色, url] of Object.entries(結果.出力)) {
  const buf = Buffer.from(url.split(",")[1], "base64");
  fs.writeFileSync(path.join(OUT_BLANK, "first-1st-" + 色 + ".webp"), buf);
  fs.writeFileSync(path.join(OUT_ILLUST, "first-1st-" + 色 + ".webp"), buf);
  書いた++;
  console.log("  first-1st-" + 色 + ".webp  " + (buf.length / 1024).toFixed(1) + " KB");
}
if (書いた !== 7) { console.log("🔴 7色そろっていない（" + 書いた + "色）"); process.exit(1); }
console.log("✅ ジュエル版のファーストカード " + 書いた + " 色を書きました（札の矩形 " + JSON.stringify(結果.札) + "）");
await browser.close();
server.close();
