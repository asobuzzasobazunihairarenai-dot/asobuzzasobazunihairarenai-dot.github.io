// 🔴 色者の円盤の絵を焼く。**手で描き写さない**（本物の絵から切り抜く）。
//   node tools/make-shikija-dial.mjs            … 比較の絵だけ出す（書かない）
//   node tools/make-shikija-dial.mjs --write    … assets/icons/shikija-dial.png を書く
//
// ■ なぜ切り抜きなのか（続き767。続き766 のやり直し）
//   続き766 は絵を見ながら SVG を手で描いた。ユーザー指摘「中の紋様が結構違うね！」のとおり、
//   **見て描く限り本物には届かない**。では本物のベクターはどこかと探したが:
//     ・印刷データ ⑤_表_入稿用（0th拡張）.ai に円盤はベクターで在るが、**旧0th拡張の別デザイン**
//       （黒白の方位盤に7色の単純な扇。リメイクの物とは別物）
//     ・リメイク版の円盤は 2026.11.9 にかくざとうさんから **PNG で**来たもので、
//       SOSC_*.ai（約490MB・2026.9）には**まだ入っていない**
//   ⇒ 手元で取れる最大の解像度は **650px角のカードの中の直径約190px**。
//   🔴 **完全に一致させたいなら、かくざとうさんにベクター（.ai / .svg）をもらうしかない。**
//
// ■ 切り方（明るさだけでは切れない）
//   実測: 背景（龍）の明るさ 163／円盤の中の非色画素は 10%=126・50%=177・95%=247
//   ＝ **白線と背景が重なっている**。一律のしきい値だと白線が欠け、雲を拾う。
//   ⇒ ① 幾何で囲う（核 r≦50 ＋ 7本の棘の角度の中だけ）
//      ② 背景 B(x,y) を「円盤でないと分かっている画素」から推定（穴は重み付きぼかしで埋める）
//      ③ 白の不透明度 = (明るさ − B) / (250 − B)  ＝ 背景が暗い所の細い白線も拾える
//
// ■ 🔴 地は焼かない（続き768・ユーザー判断）
//   円盤の線は**白**なので、切り抜いたままでは**明るいテーマで消える**（実測）。
//   続き767 は「カードと同じ淡い灰の地を絵に焼く」で片付けたが、ユーザーの判断
//   「**今回の場合灰色の下地はダサいかも！ モーダル内での色者アイコンの背景色を
//   工夫してみるのはどう？**」で**焼くのをやめた**。
//   ⇒ 絵は**透明な地のまま**（白線＋7色だけ）。地は **CSS 側**（`.effect-reason-modal-dial`）が
//     敷く。そちらの方が後から色も形も変えられるし、焼き直さなくてよい。
//   ⚠ **この絵を新しい所に置く時は、置く側で暗い地を敷くこと。**
//     明るい地に素で置くと**白線が消える**（色のくさびだけが浮いて見える）。
//
// ■ 幾何（scratchpad/_dial_cut.mjs で半径ごとに数えて出した）
//   中心 (321.9, 146.2) ／ 中心の白箱 r≦5 ／ くさび 6〜38 ／ 白い輪 ≈42 ／ 棘 57〜92
import { chromium } from "playwright";
import fs from "node:fs";

const SRC = "D:/Adobe退避/SOSC_通常カード_表_only１.png"; // ⚠ ファイル名は NFD（カード の ド が ト+濁点）
const 控 = "scratchpad/_only1.png"; // 手元の控え（元が無い時はこちら）
const 元 = 650;
const CX = 321.9, CY = 146.2;
const 核 = 50, 棘先 = 92, 棘幅 = 10;
const 向き = [0, 45, 90, 135, 225, 270, 315]; // 上から時計回り。下（180）は無い＝無色は動かない
const OUT = "assets/icons/shikija-dial.png";
const 書く = process.argv.includes("--write");

function 元絵() {
  if (fs.existsSync(控)) return fs.readFileSync(控);
  // NFD のファイル名は文字列リテラルで当たらないので、読んで探す
  const dir = SRC.slice(0, SRC.lastIndexOf("/"));
  const 名 = fs.readdirSync(dir).find((f) => /only.*\.png$/i.test(f) && /通常/.test(f));
  if (!名) throw new Error("元の絵が見つからない: " + SRC);
  return fs.readFileSync(dir + "/" + 名);
}

const b64 = "data:image/png;base64," + 元絵().toString("base64");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
await p.setContent("<body style='margin:0'></body>");

const 出 = await p.evaluate(async (A) => {
  const { src, 元, CX, CY, 核, 棘先, 棘幅, 向き } = A;
  const im = new Image(); im.src = src; await im.decode();
  const s = document.createElement("canvas"); s.width = 元; s.height = 元;
  s.getContext("2d").drawImage(im, 0, 0);
  const d = s.getContext("2d").getImageData(0, 0, 元, 元).data;
  const 彩 = (c) => Math.max(...c) - Math.min(...c);
  const 明 = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  const V = Math.ceil((棘先 + 6) * 2);
  const x0 = Math.round(CX - V / 2), y0 = Math.round(CY - V / 2);
  const at = (i, j) => { const k = ((y0 + j) * 元 + (x0 + i)) * 4; return [d[k], d[k + 1], d[k + 2]]; };

  const 窓 = (dx, dy) => {
    const r = Math.hypot(dx, dy);
    if (r <= 核) return 1;
    if (r > 棘先) return 0;
    let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (a < 0) a += 360;
    let 最 = 999;
    for (const v of 向き) { let e = Math.abs(a - v); if (e > 180) e = 360 - e; if (e < 最) 最 = e; }
    return 最 <= 棘幅 ? 1 : 0;
  };

  const 色 = new Uint8Array(V * V), L = new Float32Array(V * V), 窓値 = new Uint8Array(V * V);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const c = at(i, j), k = j * V + i;
    L[k] = 明(c);
    色[k] = (彩(c) >= 45 && Math.max(...c) >= 90) ? 1 : 0;
    窓値[k] = 窓(x0 + i + 0.5 - CX, y0 + j + 0.5 - CY);
  }

  // 背景 B：円盤でないと分かっている画素だけを、重み付きぼかしで広げる
  const 除 = new Uint8Array(V * V);
  for (let k = 0; k < V * V; k++) if (色[k] || L[k] > 200) 除[k] = 1;
  const 除2 = 除.slice();
  for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) {
    if (除[j * V + i]) continue;
    外: for (let b2 = -1; b2 <= 1; b2++) for (let a2 = -1; a2 <= 1; a2++) if (除[(j + b2) * V + i + a2]) { 除2[j * V + i] = 1; break 外; }
  }
  let 値 = new Float32Array(V * V), 重 = new Float32Array(V * V);
  for (let k = 0; k < V * V; k++) if (!除2[k]) { 値[k] = L[k]; 重[k] = 1; }
  for (let 回 = 0; 回 < 14; 回++) {
    const nv = new Float32Array(V * V), nw = new Float32Array(V * V);
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      let sv = 0, sw = 0;
      for (let b2 = -3; b2 <= 3; b2++) {
        const jj = j + b2; if (jj < 0 || jj >= V) continue;
        for (let a2 = -3; a2 <= 3; a2++) {
          const ii = i + a2; if (ii < 0 || ii >= V) continue;
          const k2 = jj * V + ii;
          if (重[k2] > 0) { sv += 値[k2]; sw += 1; }
        }
      }
      const k = j * V + i;
      if (sw > 0) { nv[k] = sv / sw; nw[k] = 1; }
    }
    for (let k = 0; k < V * V; k++) if (!除2[k]) { nv[k] = L[k]; nw[k] = 1; }
    値 = nv; 重 = nw;
  }
  const B = 値;

  // 核の外は「色の画素」と「そのすぐ隣の白」だけ（カードの飾り線を拾わない）
  const 色近 = new Uint8Array(V * V);
  for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) {
    if (!色[j * V + i]) continue;
    for (let b2 = -1; b2 <= 1; b2++) for (let a2 = -1; a2 <= 1; a2++) 色近[(j + b2) * V + i + a2] = 1;
  }

  // ① 円盤だけ（透明な地）
  const cut = document.createElement("canvas"); cut.width = V; cut.height = V;
  const cg = cut.getContext("2d");
  const od = cg.createImageData(V, V);
  let 色数 = 0, 白数 = 0;
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const k = j * V + i, k4 = k * 4;
    if (!窓値[k]) continue;
    if (色[k]) {
      const c = at(i, j);
      od.data[k4] = c[0]; od.data[k4 + 1] = c[1]; od.data[k4 + 2] = c[2]; od.data[k4 + 3] = 255; 色数++;
      continue;
    }
    const r = Math.hypot(x0 + i + 0.5 - CX, y0 + j + 0.5 - CY);
    if (r > 核 && !色近[k]) continue;
    const bg = Math.max(60, Math.min(230, B[k] || 163));
    const a = ((L[k] - bg) / Math.max(20, 250 - bg)) * 1.25;
    if (a <= 0.08) continue;
    od.data[k4] = 255; od.data[k4 + 1] = 255; od.data[k4 + 2] = 255;
    od.data[k4 + 3] = Math.round(255 * Math.min(1, a)); 白数++;
  }
  cg.putImageData(od, 0, 0);

  // ② 🔴 地は焼かない（続き768）。切り抜いたものがそのまま成果物。
  const fin = cut;

  // ③ 比較の絵。**地を敷かないと明るいテーマで何が起きるか**を並べて見せる
  //    （3枚目がそれ。白線が消えて色のくさびだけが浮く）。
  const 辺 = 300;
  const 札 = [
    ["1 本物（カードのまま）", null],
    ["2 絵だけ・暗いモーダル", "#0f1720"],
    ["3 絵だけ・明るいモーダル（白線が消える）", "#fffdf7"],
    ["4 CSSの円盤を敷いた所（明るいモーダル）", "#fffdf7"],
  ];
  const cmp = document.createElement("canvas"); cmp.width = 辺 * 札.length; cmp.height = 辺 + 22;
  const q = cmp.getContext("2d");
  q.imageSmoothingQuality = "high";
  q.fillStyle = "#333"; q.fillRect(0, 0, cmp.width, cmp.height);
  q.drawImage(im, x0, y0, V, V, 0, 22, 辺, 辺);
  for (let n = 1; n < 札.length; n++) {
    const x = 辺 * n;
    q.fillStyle = 札[n][1]; q.fillRect(x, 22, 辺, 辺);
    if (n === 3) {
      // CSS の `.effect-reason-modal-dial` と同じ地（色を変える時は両方そろえる）
      const cx = x + 辺 / 2, cy = 22 + 辺 / 2, 半 = 辺 * 0.46;
      const gr = q.createRadialGradient(cx, cy - 半 * 0.16, 半 * 0.1, cx, cy, 半);
      gr.addColorStop(0, "#1e2a38"); gr.addColorStop(0.62, "#121b25"); gr.addColorStop(1, "#0a1016");
      q.beginPath(); q.arc(cx, cy, 半, 0, Math.PI * 2); q.fillStyle = gr; q.fill();
      q.strokeStyle = "rgba(176,141,63,0.45)"; q.lineWidth = 2; q.stroke();
    }
    q.drawImage(fin, 0, 0, V, V, x + 辺 * 0.08, 22 + 辺 * 0.08, 辺 * 0.84, 辺 * 0.84);
  }
  q.fillStyle = "#fff"; q.font = "13px monospace";
  for (let n = 0; n < 札.length; n++) q.fillText(札[n][0], 辺 * n + 6, 16);

  return { V, 色数, 白数, png: fin.toDataURL("image/png"), cmp: cmp.toDataURL("image/png") };
}, { src: b64, 元, CX, CY, 核, 棘先, 棘幅, 向き });

const buf = Buffer.from(出.png.split(",")[1], "base64");
fs.writeFileSync("scratchpad/_dial_cmp.png", Buffer.from(出.cmp.split(",")[1], "base64"));
console.log("円盤 " + 出.V + "x" + 出.V + "  色の画素 " + 出.色数 + " ／ 白の画素 " + 出.白数 + " ／ " + (buf.length / 1024).toFixed(1) + "KB");
console.log("→ scratchpad/_dial_cmp.png（比較）");
if (書く) {
  fs.mkdirSync("assets/icons", { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("→ " + OUT);
} else {
  console.log("（--write を付けると " + OUT + " に書く）");
}
await b.close();
