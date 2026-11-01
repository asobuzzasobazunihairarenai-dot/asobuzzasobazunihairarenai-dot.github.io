// 原本の .ai から「カードの飾り」を層ごとに焼き出す道具（**一度だけ走らせる**）。
//
// 【なぜ要るか】
// 4層目として書き出された PNG は、Illustrator で **合成モード（乗算・オーバーレイ）**が
// 掛かっていた層まで**普通の不透明な板に焼き込まれている**。そのまま重ねると、
// 紙の肌理が灰色の膜になってカード全面が白っぽくなる（ユーザー報告①）。
// 合成モードは「下に何があるか」で結果が変わる計算なので、**1枚の絵には畳めない**。
// ⇒ 合成モードの種類ごとに分けて持つしかない。
//
// 【やれると分かった経緯（実測）】
// 「SOSC_ol（レイヤーごとに分ける）.ai」は中身が **PDF 1.6・37ページ（＝37枠ぶん）**で、
// **20個の OCG（レイヤー）**を持っている。pdf.js で開くと**レイヤーを1つずつ描き分けられる**。
//   ⚠ 描画の引数は `optionalContentConfigPromise`（`optionalContentConfig` ではない。
//      ここを間違えて「全部同じ絵」になり、1往復むだにした）
//   ⚠ pdf.js は **ca（不透明度）は正しく反映するが、合成モードは落とす**
//      （真っ赤な地にテクスチャだけ描かせたら 204,0,0 → 200,62,63 と**緑が増えた**＝
//        乗算なら増えようがない）。だから**合成モードは私の側で掛け直す**。
//
// 【本物とどれだけ一致するか（紫１で実測・0〜255の平均差）】
//   pdf.js に丸ごと描かせた（＝これ以上良くならない下限） … 10.74
//   .ai のイラスト層を使って、この道具の重ね方で     … 9.89
//   **イラストを自分で置いて、この道具の重ね方で**   … **8.67**
//   ＝重ね方には誤差が残っていない（残りは pdf.js と Illustrator の描き味の差）。
//
// 【層の役割（p24 を1層ずつ描いて確かめた）】
//   Paper       … 色のべた塗り（＝1層目）
//   image       … 2層目のイラスト（半透明）   ← 新しいカードでは自分の絵に差し替える
//   レイヤー 22 … 3層目のイラスト             ← 同上
//   Over        … 枠線・幾何模様・上下の帯
//   Shadow      … フレーバー欄の紫の帯
//   Text_Futura_Bold … 色名（PURPLE など）    ← 枠ごとに決まるので焼き込む
//   Gradation   … 明暗の階調（**オーバーレイ 50%**）
//   Texture     … 紙の肌理（**乗算 30%**）
//   Icon / Bahamut / Text_* … コストの印・区切り線・カード名・効果文・クレジット
//                             ＝**カードごとに変わるので焼かない**（アプリと道具が描く）
//
// 【出すもの】SRC_DIR/焼き出し/<枠の名前>_{normal,grad,tex}.png
//   normal … そのまま重ねる   grad … オーバーレイで重ねる   tex … 乗算で重ねる
//   （色のべた塗りは 1層目/ をそのまま使うので焼かない）
//
// 【使い方】
//   node tools/bake-card-layers.mjs            … 対応表を確かめてから37枠ぶん焼く
//   node tools/bake-card-layers.mjs --check    … 焼かずに対応表だけ出す
//   node tools/bake-card-layers.mjs --page 24 --frame 通常カード_表_紫１  … 1枠だけ
//
// ⚠ .ai は 468MB ある。読み込みに30秒ほどかかるが、**開くのは1回だけ**で37ページを回す。
// ⚠ この道具が作るものはリポジトリに入れない（実物の絵なので＝CLAUDE.md の決まり）。
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const SRC_DIR = process.env.SO7_CARD_SRC || "D:/7 SHADES OF SEVEN remake デジタル版/画像素材/カード製作用オリジナル";
const AI_PATH = process.env.SO7_CARD_AI || path.join(SRC_DIR, "SOSC_ol（レイヤーごとに分ける）.ai");
const OUT_DIR = path.join(SRC_DIR, "焼き出し");
const PORT = 8951;

// 合成モードごとに、どのレイヤーを束ねるか。
// 重ねる順と合成モードは [tools/card-layout.mjs] の BAKE_ORDER / BAKE_BLEND にある。
// 🔴 Shadow（下のパネル）は **normal に混ぜない**。混ぜると緑や黄のカードで
//    パネルが白っぽく抜ける（.ai では「カラー50%＋乗算50%」で重なっているため）。
export const BAKE_GROUPS = {
  shadow: ["Shadow"],
  normal: ["Design", "Base", "Over", "Text_Superclarendon", "Text_Futura_Bold", "Pyaa", "Light"],
  grad: ["Gradation"],
  tex: ["Texture"],
};
// 焼かない層（カードごとに変わるもの・イラストそのもの）
export const SKIP_LAYERS = ["Paper", "image", "レイヤー 22", "Icon", "Bahamut", "Text_Name", "Text_Name_Min", "Text_Flavor", "Text_Date", "Text_ヒラギノ角ゴ Pro W6"];
// 🔴 照合の時だけ消す層。**上の SKIP_LAYERS とは別物**（あれは「焼かない層」で、
//    地の色とイラストまで含む）。照合では地もイラストも要る——**カードごとに絵が違うことが
//    手がかりそのもの**なので。消すのは「本物のテキスト無しカードに写っていないもの」だけ。
//    ⚠ ここを SKIP_LAYERS で代用して、地もイラストも消したまま照合し、見事に総崩れした。
export const MATCH_OFF = ["Icon", "Bahamut", "Text_Name", "Text_Name_Min", "Text_Flavor", "Text_ヒラギノ角ゴ Pro W6"];

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf("--" + k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const has = (k) => args.includes("--" + k);
const SIZE = Number(opt("size", "650"));

if (!fs.existsSync(AI_PATH)) {
  console.error("🔴 原本の .ai が見つからない: " + AI_PATH);
  console.error("   環境変数 SO7_CARD_AI で場所を指定できます。");
  process.exit(2);
}

// 枠の名前の一覧（1層目と4層目の両方にあるもの）
const strip = (f) => f.replace(/^SOSC_ol_/, "").replace(/\.png$/i, "");
const d1 = path.join(SRC_DIR, "1層目");
const d4 = path.join(SRC_DIR, "4層目");
const frames = (() => {
  if (!fs.existsSync(d1) || !fs.existsSync(d4)) return [];
  const a = new Set(fs.readdirSync(d1).filter((f) => f.endsWith(".png")).map(strip));
  return fs.readdirSync(d4).filter((f) => f.endsWith(".png")).map(strip).filter((x) => a.has(x)).sort();
})();
if (!frames.length) { console.error("🔴 1層目 / 4層目 が見つからない: " + SRC_DIR); process.exit(2); }

const toUrl = (p) => "data:image/png;base64," + fs.readFileSync(p).toString("base64");

// .ai を Range 対応で配る（468MB を丸ごとメモリに載せない）
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
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("  [ブラウザ] " + m.text().slice(0, 160)); });
await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" });

console.log("原本: " + AI_PATH + "（" + (aiSize / 1024 / 1024).toFixed(0) + "MB）");
console.log("読み込み中…（30秒ほどかかります）");

// ① どのページがどの枠かを決める。
//
// 🔴 **ここは3回やり直した。正解は「完成した本物のカードと突き合わせる」だった。**
//   ・色で照合 → 通常・エターナル・ファーストに同じ色があり、21枠が重複して失敗。
//   ・枠の形で照合 → 「赤１」と「赤２」は枠の絵が同じなので決まらない。
//   ・4層目の PNG で照合 → **4層目は「紫１」と「紫２」で1画素も違わない**ことが分かった
//     （ハッシュは違うが、それは PNG の詰め方の差だけ）。つまり手がかりが無い。
//     🔴 この時 **紫１と紫２が入れ替わって焼かれ、本物にある右上の七角形の印が
//        消えたカードができた**（実害）。
//
// ⇒ **本物の「テキスト無し」カード**（通常/エターナル/ファーストの各フォルダ＋カード裏面）と
//   突き合わせる。**カードごとにイラストが違う**ので、取り違えようがない。
//   ページ側は「カードごとに変わる文字と印」を消して描けば、ほぼ同じ絵になる。
//   ⚠ 本物が無い枠（通常カード_表_黒２）は、余ったページが当たる。下の表で分かるようにしてある。
const REF_DIRS = ["通常カード（テキスト無し）", "エターナルカード（テキスト無し）", "ファーストカード（テキスト無し）", "カード裏面"]
  .map((d) => path.resolve(SRC_DIR, "..", d));
function findRef(name) {
  const f = "SOSC_ol_" + name + ".png";
  for (const d of REF_DIRS) { const t = path.join(d, f); if (fs.existsSync(t)) return t; }
  return null;
}
const frameRefs = frames.map((name) => {
  const ref = findRef(name);
  return { name, paper: toUrl(path.join(d1, "SOSC_ol_" + name + ".png")), real: ref ? toUrl(ref) : null };
});
{
  const miss = frameRefs.filter((r) => !r.real).map((r) => r.name);
  console.log("本物のカードが見つかった枠: " + (frameRefs.length - miss.length) + "/" + frameRefs.length +
    (miss.length ? "（無い: " + miss.join(", ") + "）" : ""));
}

const mapping = await page.evaluate(async (o) => {
  const { port, refs } = o;
  const L = window["pdfjsLib"];
  L.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const doc = await L.getDocument({ url: "http://localhost:" + port + "/card.pdf", disableAutoFetch: true, rangeChunkSize: 1 << 18 }).promise;
  const occ = await doc.getOptionalContentConfig();
  const groups = occ.getGroups();
  const ids = Object.keys(groups).map((id) => ({ id, name: groups[id].name }));
  const load = (s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
  const T = 192; // イラストで照合するので、この大きさで十分に効く（速い）

  // 参照側（本物の「テキスト無し」カード）を白地に描いて持つ
  const grab = async (url) => {
    const im = await load(url);
    const c = document.createElement("canvas"); c.width = T; c.height = T;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, T, T);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(im, 0, 0, T, T);
    return g.getImageData(0, 0, T, T).data;
  };
  const refFeat = [];
  for (const r of refs) refFeat.push({ name: r.name, real: r.real ? await grab(r.real) : null });

  // 本物の書き出しに入っていない層＝カードごとの文字と印。これを消して描けば本物と揃う。
  const OFF = new Set(o.skip);

  const rows = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const vp0 = p.getViewport({ scale: 1 });
    const vp = p.getViewport({ scale: T / vp0.width });
    for (const x of ids) occ.setVisibility(x.id, !OFF.has(x.name));
    const c = document.createElement("canvas"); c.width = T; c.height = T;
    const g = c.getContext("2d", { willReadFrequently: true });
    await p.render({ canvasContext: g, viewport: vp, optionalContentConfigPromise: Promise.resolve(occ), background: "#ffffff" }).promise;
    const md = g.getImageData(0, 0, T, T).data;

    // このページと、37枠すべてとの差を出す（1対1の割り当ては外でやる）。
    // 二乗で測る＝「一部が大きく違う」方を重く見る（イラスト違いは必ず大きく出る）。
    const scores = refFeat.map((r) => {
      // ⚠ Infinity は JSON で null に化けるので、大きな有限の数にする
      if (!r.real) return 1e9; // 本物が無い枠は、余りとして最後に当てる
      let s = 0;
      for (let i = 0; i < md.length; i += 4) {
        const dr = md[i] - r.real[i], dg = md[i + 1] - r.real[i + 1], db = md[i + 2] - r.real[i + 2];
        s += (dr * dr + dg * dg + db * db) / 3;
      }
      return s / (T * T);
    });
    rows.push({ ページ: n, scores });
  }
  // 🔴 焼き出しで使い回すために取っておく。開き直すと**そのたびに30秒かかる**
  //    （最初そう書いていて、37枠で18分かかる計算になった）。
  window.__so7ai = { doc, occ, ids };
  return { rows, names: refFeat.map((r) => r.name) };
}, { port: PORT, refs: frameRefs, skip: MATCH_OFF });

// ② 37ページと37枠を **1対1** で割り当てる。
//
// 🔴 ページごとに「いちばん近い枠」を独立に選ぶと取り合いになる（21枠が重複して止まった）。
//    「赤１」と「赤２」のように**見た目が同じで、紙の肌理の粒だけが違う**組があるため、
//    差が 0.01 しか開かず、同じ枠に2ページが集まってしまう。
//    ⇒ 差の小さい組から順に確定させ、使った枠とページは外す（貪欲な1対1）。
//    ⚠ 見分けがつかない組（赤１と赤２）はどちらに割り当たっても**見た目は変わらない**
//      （飾りの絵が同じなので）。それでも1対1にしておけば、取りこぼしが出ない。
const pairs = [];
for (const r of mapping.rows) {
  for (let j = 0; j < mapping.names.length; j++) pairs.push({ p: r.ページ, j, s: r.scores[j] });
}
pairs.sort((a, b) => a.s - b.s);
const pageTaken = new Set(), frameTaken = new Set();
const assign = new Map(); // ページ → 枠
for (const x of pairs) {
  if (pageTaken.has(x.p) || frameTaken.has(x.j)) continue;
  pageTaken.add(x.p); frameTaken.add(x.j);
  assign.set(x.p, { 枠: mapping.names[x.j], 差: x.s });
}
const table = mapping.rows.map((r) => {
  const a = assign.get(r.ページ);
  const order = r.scores.map((s, j) => ({ j, s })).sort((u, v) => u.s - v.s);
  const 独立 = mapping.names[order[0].j];
  return {
    ページ: r.ページ, 枠: a ? a.枠 : "（無し）", 差: a ? Number(a.差.toFixed(2)) : 999,
    取り合い: a && a.枠 !== 独立 ? "→ 独立なら " + 独立 : "",
    次点との開き: Number((order[1].s - order[0].s).toFixed(2)),
  };
});
const used = new Map();
let dup = 0, weak = 0;
for (const r of table) {
  if (used.has(r.枠)) dup++;
  used.set(r.枠, (used.get(r.枠) || 0) + 1);
  if (r.次点との開き < r.差 * 0.02) weak++;
}
const missing = frames.filter((f) => !used.has(f));
console.log("");
console.table(table);
console.log("ページ数: " + table.length + " / 枠の数: " + frames.length);
console.log("重複した枠: " + dup + "件 ／ 当てはまらなかった枠: " + missing.length + "件" + (missing.length ? "（" + missing.join(", ") + "）" : ""));
console.log("⚠ 見分けがつきにくかったページ: " + weak + "件");
console.log("   ＝ 本物が無い枠（余りとして当てたもの）か、絵がほぼ同じ組。");
if (dup || missing.length) {
  console.error("🔴 対応表が合っていないので焼き出しを中止します。");
  console.error("   （本物の「テキスト無し」カードと突き合わせて照合しています。");
  console.error("     素材フォルダの 1層目 と、本物のカードの枚数が揃っているか確かめてください）");
  await browser.close(); server.close();
  process.exit(1);
}
console.log("✅ 37ページと37枠が1対1で対応しました。");

if (has("check")) {
  console.log("（--check なので焼き出しはしていません）");
  await browser.close(); server.close();
  process.exit(0);
}

// ③ 焼き出し
fs.mkdirSync(OUT_DIR, { recursive: true });
const only = opt("frame", null);
const onlyPage = opt("page", null);
const targets = table.filter((r) => (!only || r.枠 === only) && (!onlyPage || String(r.ページ) === String(onlyPage)))
  .map((r) => ({ ...r, real: findRef(r.枠) }));
console.log("");
console.log("焼き出し先: " + OUT_DIR);
let done = 0;
// 枠ごとに選んだ「影の重ね方」。make-card.mjs がこれを読む。
const 影の選択 = {};
for (const t of targets) {
  const got = await page.evaluate(async ({ pageNo, size, groups, skip }) => {
    const { doc, occ, ids } = window.__so7ai; // 開き直さない（上の照合で開いたものを使う）
    const p = await doc.getPage(pageNo);
    const vp0 = p.getViewport({ scale: 1 });
    const vp = p.getViewport({ scale: size / vp0.width });
    const out = {};
    const 面積 = {};
    for (const key of Object.keys(groups)) {
      const want = new Set(groups[key]);
      for (const x of ids) occ.setVisibility(x.id, want.has(x.name));
      const c = document.createElement("canvas"); c.width = size; c.height = size;
      const g = c.getContext("2d", { willReadFrequently: true });
      await p.render({ canvasContext: g, viewport: vp, optionalContentConfigPromise: Promise.resolve(occ), background: "rgba(0,0,0,0)" }).promise;
      const d = g.getImageData(0, 0, size, size).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      面積[key] = n;
      out[key] = c.toDataURL("image/png");
    }
    // 焼かない層に中身があるかも控える（あとで「なぜ出ていないか」を追えるように）
    const 残り = {};
    for (const nm of skip) {
      const x = ids.find((y) => y.name === nm);
      if (!x) continue;
      for (const y of ids) occ.setVisibility(y.id, y.id === x.id);
      const c = document.createElement("canvas"); c.width = 128; c.height = 128;
      const g = c.getContext("2d", { willReadFrequently: true });
      await p.render({ canvasContext: g, viewport: p.getViewport({ scale: 128 / vp0.width }), optionalContentConfigPromise: Promise.resolve(occ), background: "rgba(0,0,0,0)" }).promise;
      const d = g.getImageData(0, 0, 128, 128).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
      if (n) 残り[nm] = n;
    }
    // 影の重ね方を選ぶのに使う「地＋イラスト」（.ai のものをそのまま）
    for (const x of ids) occ.setVisibility(x.id, x.name === "Paper" || x.name === "image" || x.name === "レイヤー 22");
    const bc = document.createElement("canvas"); bc.width = size; bc.height = size;
    await p.render({ canvasContext: bc.getContext("2d"), viewport: vp, optionalContentConfigPromise: Promise.resolve(occ), background: "#ffffff" }).promise;
    return { out, 面積, 残り, backdrop: bc.toDataURL("image/png") };
  }, { pageNo: t.ページ, size: SIZE, groups: BAKE_GROUPS, skip: SKIP_LAYERS });

  for (const key of Object.keys(got.out)) {
    const dest = path.join(OUT_DIR, t.枠 + "_" + key + ".png");
    fs.writeFileSync(dest, Buffer.from(got.out[key].split(",")[1], "base64"));
  }
  done++;
  console.log(
    "  [" + done + "/" + targets.length + "] " + t.枠 +
    "（" + Object.keys(got.面積).map((k) => k + " " + got.面積[k]).join(" / ") + " 画素）"
  );

  // ⑤ 🔴 **影（下のパネルとタイトル帯）の重ね方を、枠ごとに測って選ぶ。**
  //
  // なぜ1つに決めないか: **枠によって影の作りが違う**（焼いた影の不透明度を調べて分かった）。
  //   α191/128 の2段 … 15枠（紫・緑・青・黄・桃ほか）＝ パネル1回・帯2回
  //   α255 で真っ平ら … 6枠（橙・赤）
  //   α128/0        … 6枠（白・虹・黒）＝ 帯だけ
  //   ファースト・裏 … それぞれ別のα
  // 規則を1つに決めると必ずどこかが悪くなった（25枠で試して、平均は良くなるが
  // **白・虹は帯が 7 → 17〜20 と悪化**した）。⇒ **その枠の本物と見比べて選ぶ。**
  //
  // 選択肢（どれも根拠がある）:
  //   color      … .ai の1回目の描き（カラー50%）そのまま
  //   soft-light … 色も明るさも少しだけ動かす。真っ平らな影（橙・赤）に効いた
  //   split      … αがパネルより濃い所＝**2回目の描き（乗算50%）が重なった帯**と見て、
  //                そこだけ乗算を足す。これが効くと帯が 24.6 → 10.2 のように一気に合う
  //   split-full … split と同じだが、カラーは頭打ちせず全面に掛ける
  if (t.real) {
    const 選 = await page.evaluate(async (o) => {
      const load = (s) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
      const S = o.size;
      const [real, sh, nm, gr, tx, bd] = await Promise.all([o.real, o.shadow, o.normal, o.grad, o.tex, o.backdrop].map(load));
      const rc = document.createElement("canvas"); rc.width = S; rc.height = S;
      const rg = rc.getContext("2d", { willReadFrequently: true });
      rg.drawImage(real, 0, 0, S, S);
      const R = rg.getImageData(0, 0, S, S).data;
      // 影の不透明度の台地を測る（パネルと帯）
      const sc = document.createElement("canvas"); sc.width = S; sc.height = S;
      const sg2 = sc.getContext("2d", { willReadFrequently: true });
      sg2.drawImage(sh, 0, 0, S, S);
      const sd = sg2.getImageData(0, 0, S, S).data;
      const mode = (y0, y1) => {
        const m = {};
        for (let y = y0; y <= y1; y++) for (let x = 60; x < S - 60; x += 3) { const a = sd[(y * S + x) * 4 + 3]; if (a > 4) m[a] = (m[a] || 0) + 1; }
        const t2 = Object.entries(m).sort((p, q) => q[1] - p[1])[0];
        return t2 ? Number(t2[0]) : 0;
      };
      const aPanel = mode(Math.round(S * 0.615), Math.round(S * 0.908));
      const aBand = mode(Math.round(S * 0.526), Math.round(S * 0.566));
      const 割れる = aBand > aPanel;
      let cA = null, cB = null;
      if (割れる) {
        cA = document.createElement("canvas"); cA.width = S; cA.height = S;
        cB = document.createElement("canvas"); cB.width = S; cB.height = S;
        const ia = new ImageData(S, S), ib = new ImageData(S, S);
        const span = aBand - aPanel;
        for (let i = 0; i < sd.length; i += 4) {
          const a = sd[i + 3];
          ia.data[i] = sd[i]; ia.data[i + 1] = sd[i + 1]; ia.data[i + 2] = sd[i + 2]; ia.data[i + 3] = Math.min(a, aPanel);
          ib.data[i] = sd[i]; ib.data[i + 1] = sd[i + 1]; ib.data[i + 2] = sd[i + 2];
          ib.data[i + 3] = Math.max(0, Math.min(255, Math.round((a - aPanel) * 255 / span)));
        }
        cA.getContext("2d").putImageData(ia, 0, 0);
        cB.getContext("2d").putImageData(ib, 0, 0);
      }
      const 組む = (mode2) => {
        const c = document.createElement("canvas"); c.width = S; c.height = S;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(bd, 0, 0, S, S);          // 地＋イラスト（.ai のものをそのまま使う）
        g.drawImage(nm, 0, 0, S, S);          // 枠
        if (mode2 === "color" || mode2 === "soft-light") {
          g.save(); g.globalCompositeOperation = mode2; g.drawImage(sh, 0, 0, S, S); g.restore();
        } else if (割れる) {
          g.save(); g.globalCompositeOperation = "color";
          g.drawImage(mode2 === "split-full" ? sh : cA, 0, 0, S, S); g.restore();
          g.save(); g.globalCompositeOperation = "multiply"; g.globalAlpha = o.mul; g.drawImage(cB, 0, 0, S, S); g.restore();
        } else return null;
        g.save(); g.globalCompositeOperation = "overlay"; g.drawImage(gr, 0, 0, S, S); g.restore();
        g.save(); g.globalCompositeOperation = "multiply"; g.drawImage(tx, 0, 0, S, S); g.restore();
        const B = g.getImageData(0, 0, S, S).data;
        let s = 0, sb = 0, nb = 0;
        const y0 = Math.round(S * 0.526), y1 = Math.round(S * 0.566);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const i = (y * S + x) * 4;
          const v = (Math.abs(R[i] - B[i]) + Math.abs(R[i + 1] - B[i + 1]) + Math.abs(R[i + 2] - B[i + 2])) / 3;
          s += v; if (y >= y0 && y <= y1) { sb += v; nb++; }
        }
        return { 全体: s / (S * S), 帯: sb / nb };
      };
      const 結果 = {};
      for (const m of ["color", "soft-light", "split", "split-full"]) { const r2 = 組む(m); if (r2) 結果[m] = r2; }
      const best = Object.entries(結果).sort((a, b2) => a[1].全体 - b2[1].全体)[0];
      return { aPanel, aBand, 選んだ: best[0], 結果 };
    }, {
      size: SIZE, mul: 0.4, real: toUrl(t.real),
      shadow: got.out.shadow, normal: got.out.normal, grad: got.out.grad, tex: got.out.tex,
      backdrop: got.backdrop,
    });
    影の選択[t.枠] = { mode: 選.選んだ, mul: 0.4, aPanel: 選.aPanel, aBand: 選.aBand };
    console.log("        影の重ね方: " + 選.選んだ + "（α パネル" + 選.aPanel + " 帯" + 選.aBand + "）" +
      Object.keys(選.結果).map((k) => " " + k + " " + 選.結果[k].全体.toFixed(1) + "/" + 選.結果[k].帯.toFixed(1)).join(""));
  }
}
// ④ エディション記号も絵として焼き出す。
//
// 🔴 **書体では再現できなかった。** ユーザーから「S は文字で、書体がある（AR HERMANN）」と
//   教わったが、その書体の印字できる文字94種を**総当たりで重ねても、いちばん良くて5割**しか
//   合わなかった（形がはっきり違う）。別の書体か、字を加工したものと思われる。
//   ⇒ **当て物をやめて、原本から絵として取り出す。** こちらの方が確実で、
//     新しい記号が要る時も「その絵を置く」だけで済む。
// ⚠ 全7種のページで**同じ箱・同じ画素数**（598,597,22x23）だったので、カードによらず同じ。
//   本物のカードから測った箱（598,597,21x22）とも一致した。
{
  const got = await page.evaluate(async ({ size, mul }) => {
    const { doc, occ, ids } = window.__so7ai;
    const p = await doc.getPage(24);
    const vp0 = p.getViewport({ scale: 1 });
    for (const x of ids) occ.setVisibility(x.id, x.name === "Text_Date");
    // まず等倍で箱を測る
    const c1 = document.createElement("canvas"); c1.width = size; c1.height = size;
    const g1 = c1.getContext("2d", { willReadFrequently: true });
    await p.render({ canvasContext: g1, viewport: p.getViewport({ scale: size / vp0.width }), optionalContentConfigPromise: Promise.resolve(occ), background: "rgba(0,0,0,0)" }).promise;
    const X = 585, Y = 585, W = 48, H = 45;
    const d = g1.getImageData(X, Y, W, H).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const B = { x: X + x0, y: Y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    // 縮めた時になめらかになるよう、大きめ（4倍）で切り出す
    const big = document.createElement("canvas"); big.width = size * mul; big.height = size * mul;
    await p.render({ canvasContext: big.getContext("2d"), viewport: p.getViewport({ scale: (size * mul) / vp0.width }), optionalContentConfigPromise: Promise.resolve(occ), background: "rgba(0,0,0,0)" }).promise;
    const cut = document.createElement("canvas"); cut.width = B.w * mul; cut.height = B.h * mul;
    cut.getContext("2d").drawImage(big, B.x * mul, B.y * mul, B.w * mul, B.h * mul, 0, 0, B.w * mul, B.h * mul);
    return { box: B, mul, png: cut.toDataURL("image/png") };
  }, { size: SIZE, mul: 4 });
  if (got) {
    fs.writeFileSync(path.join(OUT_DIR, "記号_S.png"), Buffer.from(got.png.split(",")[1], "base64"));
    fs.writeFileSync(path.join(OUT_DIR, "記号_S.json"), JSON.stringify({ ...got.box, 倍率: got.mul }, null, 2));
    console.log("  記号 S（" + got.box.w + "x" + got.box.h + " を " + got.mul + "倍で）→ 記号_S.png");
  } else {
    console.log("  ⚠ 記号が見つからなかった（Text_Date レイヤーが空？）");
  }
}

// ⑥ 選んだ「影の重ね方」を控える。make-card.mjs / verify-card-art.mjs が読む。
//   ⚠ 本物のカードが無い枠は選べないので、**同じ作り（αの台地が同じ）の枠から借りる**。
if (Object.keys(影の選択).length) {
  const 型ごと = {};
  for (const k of Object.keys(影の選択)) {
    const v = 影の選択[k];
    const key = v.aPanel + "/" + v.aBand;
    (型ごと[key] ||= {});
    型ごと[key][v.mode] = (型ごと[key][v.mode] || 0) + 1;
  }
  const 借りる = {};
  for (const key of Object.keys(型ごと)) 借りる[key] = Object.entries(型ごと[key]).sort((a, b2) => b2[1] - a[1])[0][0];
  const dest = path.join(OUT_DIR, "影の重ね方.json");
  fs.writeFileSync(dest, JSON.stringify({ 既定: "color", 乗算の強さ: 0.4, 作りごと: 借りる, 枠ごと: 影の選択 }, null, 2));
  console.log("");
  console.log("✅ 影の重ね方を " + Object.keys(影の選択).length + "枠ぶん選びました → " + path.basename(dest));
  const 内訳 = {};
  for (const k of Object.keys(影の選択)) 内訳[影の選択[k].mode] = (内訳[影の選択[k].mode] || 0) + 1;
  console.log("   内訳: " + Object.entries(内訳).map(([k, v]) => k + " " + v + "枠").join(" / "));
  console.log("   作りごとの既定: " + Object.entries(借りる).map(([k, v]) => "α" + k + "→" + v).join(" / "));
}

console.log("");
console.log("✅ " + done + "枠ぶん焼きました（1枠につき " + Object.keys(BAKE_GROUPS).join(" / ") + " の" + Object.keys(BAKE_GROUPS).length + "枚）。");
console.log("   これで make-card.mjs は .ai を開かずにカードを組み立てられます。");
await browser.close();
server.close();
