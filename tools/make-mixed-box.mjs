// 🔴【2026-11-24・続き839】「まぜる」の箱の絵を、**既にある箱の絵から**焼く道具。
//
// ユーザー要望「**まぜる やつも箱絵があってもいいかも！なんか色んな箱絵が混ざってる感じの
// かっこいい感じのやつ、あなたの方で作れる？既存の箱絵を組み合わせて！**」。
//
// ■ 何をしているか
//   assets/boxes/ に既にある3つの版の面（リメイク／1st／旧0th）を**切り貼り**して、
//   まぜる用の 天面・裏・側面 を作る。**新しく描いた絵は1枚も無い**（全部この3つの合成）。
//
// 🔴 元の絵は1枚も触らない。足すだけ（make-thumbs.mjs と同じ作法）。
//
// ■ なぜ Playwright（ブラウザのcanvas）か
//   この repo には sharp 等の画像ライブラリが無い（ビルド不要の方針）。箱の面を焼いた時
//   （続き742・834）も同じやり方なので、そろえてある。
//
// 使い方:
//   node tools/make-mixed-box.mjs            … assets/boxes/mixed-*.webp を焼く
//   node tools/make-mixed-box.mjs --candidates  … scratchpad/_mixbox/ に案を3つ出す（焼かない）
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

// 🔴 **まぜるの中身は「リメイク＋0th拡張＋1st」**（src/mixed-deck.js）。**旧0th は入らない。**
//   ⇒ 旧0th の箱を混ぜてはいけない（入っていない札の箱を見せることになる）。
//   ⚠ 0th拡張は**ブースターパックで売られた拡張で、箱が無い**。deck-box-3d.js でも
//     リメイクの箱の絵を流用している。⇒ 絵として出せるのは**リメイクと 1st の2つ**。
//     リメイクの帯が 0th拡張のぶんも兼ねる形になる（絵の出どころが同じなので嘘にならない）。
const 元 = {
  rm: { top: 読む("rm-top"), back: 読む("rm-back"), side: 読む("rm-side") },
  first: { top: 読む("1st-top"), back: 読む("1st-back"), side: 読む("1st-side") },
  old: { top: 読む("old0th-top"), back: 読む("old0th-back"), side: 読む("old0th-side") },
};
// 帯に並べる版（左から）。
const 並び = ["rm", "first"];

const browser = await chromium.launch();
const page = await browser.newPage();

// ブラウザの中で描く。引数は data URL の組。
const 描く = (仕事) => page.evaluate(async ({ 元, 並び, 種, W, H, 質 }) => {
  const よむ = async (u) => { const i = new Image(); i.src = u; await i.decode(); return i; };
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");

  // 地（濃い紺。白い蓋が2つあるので、間を暗くしないと境目が消える）
  const 地 = () => {
    const r = g.createRadialGradient(W / 2, H * 0.42, W * 0.05, W / 2, H * 0.5, W * 0.78);
    r.addColorStop(0, "#1b2432");
    r.addColorStop(1, "#070a10");
    g.fillStyle = r;
    g.fillRect(0, 0, W, H);
  };
  // 絵を「その中心が箱の中心に来る」ように、倍率を指定して描く。
  const のせる = (img, cx, cy, 倍) => {
    const w = img.width * 倍, h = img.height * 倍;
    g.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  };
  const 金 = "rgba(216,178,76,0.85)";

  if (種 === "A" || 種 === "A-back") {
    // ── 案A: 斜めの帯で継ぐ ────────────────────────────────────
    // 縦を人数ぶんに割って、それぞれの帯に**その版の真ん中**を置く。
    // 斜めにするのは、まっすぐだと「2枚並べただけ」に見えるため。
    const 面 = 種 === "A-back" ? "back" : "top";
    const 絵 = [];
    for (const k of 並び) 絵.push(await よむ(元[k][面]));
    const n = 絵.length;
    地();
    const 傾き = W * 0.17; // 上辺と下辺のずれ
    for (let i = 0; i < n; i++) {
      const x0 = (W / n) * i, x1 = (W / n) * (i + 1);
      // 🔴 両端の帯は**画面の外まで**広げる。広げないと、斜めにずらした分だけ
      //   左上と右下の角に地（黒）の三角が残る（143px で撮って気づいた）。
      const 切0 = i === 0 ? -W : x0;
      const 切1 = i === n - 1 ? W * 2 : x1;
      g.save();
      g.beginPath();
      g.moveTo(切0 + 傾き, -2);
      g.lineTo(切1 + 傾き, -2);
      g.lineTo(切1 - 傾き, H + 2);
      g.lineTo(切0 - 傾き, H + 2);
      g.closePath();
      g.clip();
      // その帯の真ん中に、その版の**中心**が来るように置く（題字やロゴが帯から外れない）。
      // 🔴 倍率は「高さいっぱい」。縮めると上下に地（黒）の帯が残る——角だけでなく
      //   **上下の全幅**が暗くなり、蓋に見えなくなる（撮って数えて気づいた：暗い画素 21.6%）。
      のせる(絵[i], (x0 + x1) / 2, H / 2, H / 絵[i].height);
      g.restore();
    }
    // 継ぎ目の金の線（2本引いて、細い方を影に見せる）
    for (let k = 1; k < n; k++) {
      const x = (W / n) * k;
      g.lineWidth = Math.max(3, W / 110);
      g.strokeStyle = 金;
      g.beginPath();
      g.moveTo(x + 傾き, 0);
      g.lineTo(x - 傾き, H);
      g.stroke();
      g.lineWidth = Math.max(1, W / 340);
      g.strokeStyle = "rgba(255,245,215,0.9)";
      g.stroke();
    }
  } else if (種 === "side") {
    // ── 側面: 背を縦に継ぐ（上から リメイク / 1st）────────────────
    const 絵 = [];
    for (const k of 並び) 絵.push(await よむ(元[k].side));
    const n = 絵.length;
    g.fillStyle = "#0a0f16";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const y0 = (H / n) * i;
      g.save();
      g.beginPath();
      g.rect(0, y0, W, H / n);
      g.clip();
      // 背の真ん中（ロゴや題字がある所）がその区画に来るように置く。
      const img = 絵[i];
      const 倍 = W / img.width;
      g.drawImage(img, 0, y0 + H / n / 2 - (img.height * 倍) / 2, W, img.height * 倍);
      g.restore();
    }
    g.strokeStyle = 金;
    g.lineWidth = Math.max(2, H / 260);
    for (let k = 1; k < n; k++) {
      g.beginPath();
      g.moveTo(0, (H / n) * k);
      g.lineTo(W, (H / n) * k);
      g.stroke();
    }
  }
  return c.toDataURL("image/webp", 質);
}, 仕事);

const 書く = async (out, 仕事) => {
  const u = await 描く(仕事);
  const buf = Buffer.from(u.split(",")[1], "base64");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log("  " + path.relative(ROOT, out) + "  " + 仕事.W + "x" + 仕事.H + "  " + (buf.length / 1024).toFixed(0) + "KB");
};

if (案だけ) {
  // assets は1バイトも触らず、scratchpad に出すだけ（見てから決めるため）。
  console.log("案を出す（焼かない）:");
  await 書く(path.join(ROOT, "scratchpad", "_mixbox", "蓋.webp"), { 元, 並び, 種: "A", W: 512, H: 512, 質: 0.9 });
  await 書く(path.join(ROOT, "scratchpad", "_mixbox", "裏.webp"), { 元, 並び, 種: "A-back", W: 512, H: 512, 質: 0.9 });
  await 書く(path.join(ROOT, "scratchpad", "_mixbox", "側面.webp"), { 元, 並び, 種: "side", W: 64, H: 512, 質: 0.9 });
} else {
  // 🔴 採った形は**斜めの帯で継ぐ**。小さく出しても（スマホで143px）どちらの版が
  //   混ざっているか一目で分かる。
  //   ⚠ 一度「扇に3枚重ねる」案と「四分割＋7色」案も描いて並べたが、前者は小さくすると
  //     3枚とも潰れ、後者は7色の帯が強すぎて箱に見えなかった（撮って決めた）。
  console.log("まぜるの箱を焼く:");
  await 書く(path.join(箱, "mixed-top.webp"), { 元, 並び, 種: "A", W: 512, H: 512, 質: 0.9 });
  await 書く(path.join(箱, "mixed-back.webp"), { 元, 並び, 種: "A-back", W: 512, H: 512, 質: 0.9 });
  await 書く(path.join(箱, "mixed-side.webp"), { 元, 並び, 種: "side", W: 64, H: 512, 質: 0.9 });
}
await browser.close();
