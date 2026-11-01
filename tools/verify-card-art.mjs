// 焼き出した飾り（tools/bake-card-layers.mjs の出力）が、枠ごとに正しいかを確かめる道具。
//
// 【やり方】枠ごとに「1層目 ＋ 元のイラスト ＋ 焼き出した3枚」で組み立て、
//   **本物の「テキスト無し」カード**と点ごとに突き合わせる。
//   🔴 これは焼き出しの**取り違え**を捕まえるためのもの。実際に一度、紫１と紫２が
//     入れ替わって焼かれ、**本物にある右上の七角形の印が消えたカード**ができた。
//     差を見れば一目で分かる（取り違えた枠は差が跳ね上がる）。
//
// 【使い方】node tools/verify-card-art.mjs
//   つまみ: --max 18（これを超えたら🔴にする） --save <フォルダ>（組み立てた絵を残す）
//
// ⚠ **`npm run check` には入れない。** 素材（実物の絵）はリポジトリの外にあり、
//   他の人の手元や GitHub Actions には無いため。無ければ「確かめられない」として
//   終了コード2で止まる（合格とは言わない）。
import fs from "node:fs";
import path from "node:path";

const SRC_DIR = process.env.SO7_CARD_SRC || "D:/7 SHADES OF SEVEN remake デジタル版/画像素材/カード製作用オリジナル";
const MAT = path.resolve(SRC_DIR, "..");
const BAKE_DIR = path.join(SRC_DIR, "焼き出し");
const ILL_DIR = path.join(MAT, "カードイラスト（org3）");
const REF_DIRS = ["通常カード（テキスト無し）", "エターナルカード（テキスト無し）", "ファーストカード（テキスト無し）", "カード裏面"].map((d) => path.join(MAT, d));

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf("--" + k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
// 「差」は色の近さの目安（合否ではない）。pdf.js と Illustrator の色の出方の違いが入るので
// 0 にはならない。この .ai では 6〜18 くらいに収まる。
const MAXDIFF = Number(opt("max", "20"));
const SAVE = opt("save", null);
// 🔴 「別の枠の飾りの方が合う」と出ても、**差が小さければ取り違えではない**。
//   赤１と赤２のように**飾りの絵がほぼ同じ**（紙の肌理の粒だけが違う）組があり、
//   どちらが合うかは粒の揺れで決まる＝コイン投げになる。実測の値は下の --run で確かめた。
const SWAPMARGIN = Number(opt("swap-margin", "40"));

if (!fs.existsSync(BAKE_DIR)) {
  console.error("🔴 焼き出しが無い: " + BAKE_DIR);
  console.error("   先に node tools/bake-card-layers.mjs を走らせてください。");
  process.exit(2);
}

// make-card.mjs と同じ値を使う（2か所に書かない＝card-layout.mjs に集めてある）
const { LAYER, SCALE2, SCALE3, BAKE_ORDER, BAKE_BLEND } = await import("./card-layout.mjs");
const OP2 = LAYER.layer2Opacity;
const BLEND = BAKE_BLEND;

const findRef = (name) => {
  for (const d of REF_DIRS) { const t = path.join(d, "SOSC_ol_" + name + ".png"); if (fs.existsSync(t)) return t; }
  return null;
};
// 元のイラストの置き場は枠の名前と少し違う（「SOSC_通常カード_表_紫１.png」「エターナル紫.png」）
const findIllust = (name) => {
  const cands = [
    "SOSC_" + name + ".png",
    name.replace("エターナルカード_表_", "エターナル") + ".png",
    name.replace("ファーストカード_表_", "ファースト") + ".png",
  ];
  for (const c of cands) { const t = path.join(ILL_DIR, c); if (fs.existsSync(t)) return t; }
  return null;
};

const names = fs.readdirSync(BAKE_DIR).filter((f) => f.endsWith("_normal.png")).map((f) => f.replace(/_normal\.png$/, "")).sort();
const jobs = [];
for (const name of names) {
  const p1 = path.join(SRC_DIR, "1層目", "SOSC_ol_" + name + ".png");
  const ref = findRef(name);
  const ill = findIllust(name);
  if (!fs.existsSync(p1) || !ref || !ill) { jobs.push({ name, 飛ばした: !ill ? "元のイラストが無い" : !ref ? "本物が無い" : "1層目が無い" }); continue; }
  jobs.push({ name, p1, ref, ill, baked: BAKE_ORDER.map((k) => path.join(BAKE_DIR, name + "_" + k + ".png")) });
}

const { chromium } = await import("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
const u = (p) => "data:image/png;base64," + fs.readFileSync(p).toString("base64");

// 🔴 **ここがこの道具のかなめ。取り違えの見つけ方は2回作り直した。**
//
//  ①「本物との差が大きいか」で見る → ❌ 見逃す。
//     実際に紫１と紫２を入れ替えて焼いた時、差は 8.37 → 8.74 としか動かなかった。
//  ②「組み立てた絵が、ほかのどの本物より自分の本物に近いか」で見る → ❌ これも見逃す。
//     **イラストが枠ごとに違うので、飾りを入れ替えても自分の本物がいちばん近いまま**。
//     わざと入れ替えて試して、終了コード0（合格）が出てしまった。
//  ③ ⇒ **イラストを同じに保ったまま、飾りだけを入れ替えて比べる。**
//     こうすると差は飾りの違いだけになり、取り違えがそのまま数字に出る。
//     比べる相手は**地の色が同じ枠**だけでよい（色が違えば色で分かるし、組み合わせも減る）。
//
// 【実測した「差」の大きさ（二乗の平均）】
//   飾りの絵がまったく同じ組（赤１と赤２など） … **0〜3**（どちらが合うかは紙の肌理の
//     粒の揺れで決まる＝コイン投げ。入れ替わっても**見た目は1画素も変わらない**ので無害）
//   右上の七角形の印だけが違う組（紫１と紫２） … **52〜56**
//   カードの種類ごと違う組（エターナル同士）   … **435〜1174**
//   ⇒ しきい値 40 なら、**無害な組では黙り、本物の取り違えは捕まえる。**
//   ✅ わざと紫１と紫２を入れ替えて試し、**終了コード1 で2枠とも名指しで出る**ことを確認済み
//     （入れ替えていない時は終了コード0）。
const 同色 = new Map(); // 1層目の中身 → 枠の一覧
for (const j of jobs) {
  if (j.飛ばした) continue;
  const key = fs.readFileSync(j.p1).length + ":" + fs.readFileSync(j.p1).subarray(0, 4096).toString("base64");
  if (!同色.has(key)) 同色.set(key, []);
  同色.get(key).push(j.name);
}
const 候補 = {};
for (const list of 同色.values()) for (const n of list) 候補[n] = list;

const rows = [];
let worst = 0;
const byName = Object.fromEntries(jobs.filter((j) => !j.飛ばした).map((j) => [j.name, j]));
for (const j of jobs) {
  if (j.飛ばした) { rows.push({ 枠: j.name, 差: "—", 飾りの照合: "—", 判定: "飛ばした（" + j.飛ばした + "）" }); continue; }
  const 相手 = 候補[j.name].filter((n) => n !== j.name);
  const r = await page.evaluate(async (o) => {
    const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
    const S = 650;
    const base = await load(o.p1), ill = await load(o.ill);
    const 組む = async (飾り) => {
      const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      const cover = (img, box) => { const s = Math.max(box / img.naturalWidth, box / img.naturalHeight); const w = img.naturalWidth * s, h = img.naturalHeight * s; g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h); };
      g.drawImage(base, 0, 0, S, S);
      g.save(); g.globalAlpha = o.op2; cover(ill, S * o.s2); g.restore();
      cover(ill, S * o.s3);
      for (let i = 0; i < o.order.length; i++) {
        const im = await load(飾り[i]);
        g.save(); if (o.blend[o.order[i]]) g.globalCompositeOperation = o.blend[o.order[i]];
        g.drawImage(im, 0, 0, S, S); g.restore();
      }
      return { cv, d: g.getImageData(0, 0, S, S).data };
    };
    const rc = document.createElement("canvas"); rc.width = S; rc.height = S;
    const rg = rc.getContext("2d", { willReadFrequently: true });
    rg.drawImage(await load(o.ref), 0, 0, S, S);
    const A = rg.getImageData(0, 0, S, S).data;
    // 🔴 二乗で測る。取り違えの違い（右上の印など）は**狭い場所に大きく**出るので、
    //    平均の差では紙の肌理の揺れに埋もれる（実際それで見逃した）。
    const 測る = (B) => { let s = 0; for (let i = 0; i < A.length; i += 4) { const dr = A[i] - B[i], dg = A[i + 1] - B[i + 1], db = A[i + 2] - B[i + 2]; s += (dr * dr + dg * dg + db * db) / 3; } return s / (S * S); };
    const 平均の差 = (B) => { let s = 0; for (let i = 0; i < A.length; i += 4) s += (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3; return s / (S * S); };
    const 自分 = await 組む(o.baked);
    const 自分の点 = 測る(自分.d);
    const 他 = [];
    for (const k of Object.keys(o.相手)) 他.push({ 名: k, 点: 測る((await 組む(o.相手[k])).d) });
    return { 差: 平均の差(自分.d), 自分の点, 他, png: o.save ? 自分.cv.toDataURL("image/png") : null };
  }, {
    p1: u(j.p1), ill: u(j.ill), ref: u(j.ref), baked: j.baked.map(u),
    相手: Object.fromEntries(相手.map((n) => [n, byName[n].baked.map(u)])),
    s2: SCALE2, s3: SCALE3, op2: OP2, blend: BLEND, order: BAKE_ORDER, save: !!SAVE,
  });
  const d = Number(r.差.toFixed(2));
  if (d > worst) worst = d;
  let 照合 = 相手.length ? "" : "（同じ色の枠が他に無い）";
  if (相手.length) {
    const 勝ち = r.他.filter((x) => x.点 < r.自分の点);
    if (勝ち.length) {
      const w2 = 勝ち.sort((a, b2) => a.点 - b2.点)[0];
      照合 = (r.自分の点 - w2.点 > SWAPMARGIN ? "🔴 " : "・") + w2.名 + " の方が " + (r.自分の点 - w2.点).toFixed(0) + " 合う";
    } else {
      const 次 = r.他.sort((a, b2) => a.点 - b2.点)[0];
      照合 = "✅ 自分が最良（次点と " + (次.点 - r.自分の点).toFixed(0) + " 差）";
    }
  }
  rows.push({ 枠: j.name, 差: d, 飾りの照合: 照合, 判定: 照合.startsWith("🔴") ? "🔴 取り違えの疑い" : d > MAXDIFF ? "⚠ 差が大きい" : "✅" });
  if (SAVE && r.png) {
    fs.mkdirSync(SAVE, { recursive: true });
    fs.writeFileSync(path.join(SAVE, j.name + ".png"), Buffer.from(r.png.split(",")[1], "base64"));
  }
}
await browser.close();

const 取り違え = rows.filter((r) => r.判定 === "🔴 取り違えの疑い").length;
console.table(rows);
const 測れた = rows.filter((r) => typeof r.差 === "number");
console.log("測れた枠: " + 測れた.length + "/" + rows.length + " ／ いちばん大きい差: " + worst + "（目安 " + MAXDIFF + " 以下）");
console.log("⚠ 「差」は本物との色の近さ。pdf.js と Illustrator の色の出方の違いが入るので、");
console.log("   0 にはならない（この .ai では 6〜18 くらい）。大事なのは下の行の方。");
if (!測れた.length) { console.error("🔴 1枠も測れませんでした（素材の場所を確かめてください）。"); process.exit(2); }
if (取り違え) {
  console.error("🔴 " + 取り違え + "枠で、別の枠の飾りを当てた方が本物に近い＝**焼き出しの取り違え**。");
  console.error("   node tools/bake-card-layers.mjs --check で対応表を見直してください。");
  process.exit(1);
}
console.log("✅ 飾りの照合: 取り違えなし。");
const 大きい = rows.filter((r) => r.判定 === "⚠ 差が大きい").length;
if (大きい) console.log("⚠ " + 大きい + "枠は目安（" + MAXDIFF + "）より差が大きい。色の出方の違いなので、見比べて確かめてください。");
