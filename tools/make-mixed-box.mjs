// 🔴【2026-11-24・続き839 → 841 → 843】「まぜる」の箱の絵を、**既にある箱の絵から**焼く道具。
//
// ユーザー要望（続き839）「**まぜる やつも箱絵があってもいいかも！なんか色んな箱絵が混ざってる感じの
// かっこいい感じのやつ、あなたの方で作れる？既存の箱絵を組み合わせて！**」。
//
// ■ いまの意匠（続き843）：**中心から放射状に区切る**
//   ユーザー案「**中心から放射線状に区切り線やってみるの、どうかな？作ってみて！**」。
//   中心から外へ3本の線を引き、扇ひとつに1つの版を入れる（上＝リメイク／右下＝1st／左下＝旧0th）。
//   ⚠ 0th拡張だけは**箱が無い**（ブースターパックで売られた拡張）ので絵には入らない。
//     ユーザー案どおり、エディションを選ぶ画面で**箱の横にパックを1つ置いて**表している
//     （src/edition-select-ui.js・続き840）。
//
// 🔴 意匠は下の `意匠` 1つで切り替わる。もう1つ（"輪"＝濃紺＋7色の光＋虹の輪）は続き841 の形で、
//   **消さずに残してある**——どちらが良いかは好みなので、1行変えて焼き直せば戻せる。
//
// ■ 放射の形で踏んだこと（全部**撮って**分かった。数字では出ない）
//  1. 扇に絵をそのまま入れると、**どの版も地の模様ばかり**になる。題字も輪も絵の中心に在るので、
//     扇の要（中心）に集まって見えなくなる ⇒ 絵を**扇の真ん中へ寄せて**置く。
//  2. 寄せた絵が扇より小さいと、ふちのぼかしが見えて**貼り付けたシール**に見える
//     ⇒ 絵を扇いっぱい（0.95倍）にして、余りは**その絵の地の色**（四隅の平均）で埋める。
//        同じ色なので継ぎ目が見えない。
//  3. 金の線1本では**明るい地の上で消える** ⇒ 影を敷いてから金、仕上げに細い白。
//  4. 中央に飾り（金の輪）を置く案も描いたが、**旧0thの輪と二重**になって的に見えた ⇒ 置かない。
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

// 🔴 ここ1つで意匠が変わる。"放射"（続き843・いま）／"輪"（続き841）。
const 意匠 = "放射";

const 読む = (名) => {
  const f = path.join(箱, 名 + ".webp");
  if (!fs.existsSync(f)) throw new Error("🔴 元の絵が無い: " + f);
  return "data:image/webp;base64," + fs.readFileSync(f).toString("base64");
};

const 元 = {
  rm: { top: 読む("rm-top"), back: 読む("rm-back") },
  first: { top: 読む("1st-top"), back: 読む("1st-back") },
  old: { top: 読む("old0th-top"), back: 読む("old0th-back") },
};

// このゲームの7色（src/style.css の --color-* と同じ値）。
// ⚠ 表を2か所に持つとズレるが、ここは**焼く時に1回使うだけ**。style.css を変えた時はここも見ること。
const 七色 = ["#d32549", "#ed910e", "#fabe00", "#18ab67", "#18b6c9", "#f19ec2", "#a0549a"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<body>");

// 🔴 虹の輪の位置は**目分量で切らず、実際に測る**（"輪" の意匠で使う。元の絵が差し替わっても当たる）。
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

if (輪.n < 5000 || 輪.x1 - 輪.x0 < 輪.w * 0.5 || 輪.y1 - 輪.y0 < 輪.h * 0.5) {
  throw new Error("🔴 旧0thの虹の輪を測れなかった: " + JSON.stringify(輪));
}
const 輪の中心x = (輪.x0 + 輪.x1) / 2;
const 輪の中心y = (輪.y0 + 輪.y1) / 2;
const 輪の半径 = Math.max(輪.x1 - 輪.x0, 輪.y1 - 輪.y0) / 2;
console.log(
  "意匠: " + 意匠 + " ／ 旧0thの虹の輪（実測）: 中心 " + 輪の中心x.toFixed(0) + "," + 輪の中心y.toFixed(0) +
  " / 半径 " + 輪の半径.toFixed(0)
);

const 描く = (仕事) => page.evaluate(async ({ 元, 輪, 七色, 意匠, 種, W, H, 質 }) => {
  const よむ = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const R = Math.hypot(W, H); // 角まで届く長さ
  const T = -Math.PI / 2;     // 真上

  const 濃紺 = () => {
    const r = g.createRadialGradient(W / 2, H * 0.46, W * 0.05, W / 2, H / 2, W * 0.8);
    r.addColorStop(0, "#1d2838");
    r.addColorStop(1, "#06090f");
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  };

  // ── 放射の意匠 ───────────────────────────────────────────────────
  // その絵の「地の色」（四隅の平均）。扇の余りをこの色で埋めると継ぎ目が見えない。
  const 地の色 = (img) => {
    const t = document.createElement("canvas"); t.width = img.width; t.height = img.height;
    const tg = t.getContext("2d"); tg.drawImage(img, 0, 0);
    const 点 = [[4, 4], [img.width - 5, 4], [4, img.height - 5], [img.width - 5, img.height - 5]];
    let r = 0, gg = 0, bb = 0;
    for (const [x, y] of 点) { const D = tg.getImageData(x, y, 1, 1).data; r += D[0]; gg += D[1]; bb += D[2]; }
    return "rgb(" + Math.round(r / 4) + "," + Math.round(gg / 4) + "," + Math.round(bb / 4) + ")";
  };
  const 扇 = (img, a0, a1, 寄せ, 倍) => {
    const m = (a0 + a1) / 2;
    const cx = W / 2 + Math.cos(m) * W * 寄せ;
    const cy = H / 2 + Math.sin(m) * H * 寄せ;
    g.save();
    g.beginPath(); g.moveTo(W / 2, H / 2); g.arc(W / 2, H / 2, R, a0, a1); g.closePath(); g.clip();
    g.fillStyle = 地の色(img);
    g.fillRect(0, 0, W, H);
    const t = document.createElement("canvas"); t.width = W; t.height = H;
    const tg = t.getContext("2d");
    const w = W * 倍;
    tg.drawImage(img, cx - w / 2, cy - w / 2, w, w);
    // ふちは**絵の角のあたりだけ**をやわらかく（内側は切らない）
    const gr = tg.createRadialGradient(cx, cy, w * 0.42, cx, cy, w * 0.5);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    tg.globalCompositeOperation = "destination-in";
    tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
    g.drawImage(t, 0, 0);
    g.restore();
  };
  // 🔴 影 → 金 → 細い白 の3本。金1本では明るい地の上で消える。
  const 放射線 = (角たち) => {
    for (const a of 角たち) {
      const x1 = W / 2 + Math.cos(a) * R, y1 = H / 2 + Math.sin(a) * R;
      g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(x1, y1);
      g.lineWidth = Math.max(6, W / 64); g.strokeStyle = "rgba(20,16,10,0.5)"; g.stroke();
      g.lineWidth = Math.max(4, W / 100); g.strokeStyle = "rgba(216,178,76,0.95)"; g.stroke();
      g.lineWidth = Math.max(1, W / 300); g.strokeStyle = "rgba(255,247,222,0.95)"; g.stroke();
    }
  };
  const 放射の面 = async (面) => {
    const 絵 = [await よむ(元.rm[面]), await よむ(元.first[面]), await よむ(元.old[面])];
    for (let i = 0; i < 3; i++) 扇(絵[i], T + ((2 * Math.PI) / 3) * (i - 0.5), T + ((2 * Math.PI) / 3) * (i + 0.5), 0.24, 0.95);
    放射線([0, 1, 2].map((i) => T + ((2 * Math.PI) / 3) * (i + 0.5)));
  };

  // ── 輪の意匠（続き841。残してある） ───────────────────────────────
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
  const 虹の輪を中央に = async () => {
    const ol = await よむ(元.old.top);
    const Rr = 輪.r * 1.1;
    const 倍 = (W * 0.82) / (Rr * 2);
    const t = document.createElement("canvas"); t.width = W; t.height = H;
    const tg = t.getContext("2d");
    tg.save();
    tg.beginPath(); tg.arc(W / 2, H / 2, Rr * 倍, 0, Math.PI * 2); tg.clip();
    tg.drawImage(ol, W / 2 - 輪.cx * 倍, H / 2 - 輪.cy * 倍, ol.width * 倍, ol.height * 倍);
    tg.restore();
    const gr = tg.createRadialGradient(W / 2, H / 2, Rr * 倍 * 0.88, W / 2, H / 2, Rr * 倍);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    tg.globalCompositeOperation = "destination-in";
    tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
    g.drawImage(t, 0, 0);
  };
  const 裏に1枚入れる = async () => {
    const rb = await よむ(元.rm.back);
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
  };

  if (種 === "top") {
    if (意匠 === "放射") await 放射の面("top");
    else { 濃紺(); 七色の光("66"); await 虹の輪を中央に(); }
  } else if (種 === "back") {
    // 裏は「何が入っているか」を読む面。🔴 3つの裏を扇に割ると**どの説明文も読めない**
    //   （続き840 の帯の形がまさにそれだった）ので、意匠にかかわらず**1枚そのまま**入れる。
    //   ⚠ 額の色だけ意匠に合わせる（放射＝紙の色／輪＝濃紺）。
    if (意匠 === "放射") {
      g.fillStyle = "#efe7d6";
      g.fillRect(0, 0, W, H);
      // 四隅へ向かう金の線（表と同じ言い方にそろえる）
      放射線([0, 1, 2, 3].map((i) => (Math.PI / 2) * i + Math.PI / 4));
    } else {
      濃紺();
      七色の光("33");
    }
    await 裏に1枚入れる();
  } else if (種 === "side") {
    // 背。区切らない。意匠に合わせて地の色だけ変える。
    const r = g.createLinearGradient(0, 0, 0, H);
    if (意匠 === "放射") { r.addColorStop(0, "#f3ecdc"); r.addColorStop(1, "#ddd2ba"); }
    else { r.addColorStop(0, "#1d2838"); r.addColorStop(1, "#06090f"); }
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

const 共通 = { 元, 七色, 意匠, 輪: { cx: 輪の中心x, cy: 輪の中心y, r: 輪の半径 } };

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
