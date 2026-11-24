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

// 🔴【続き840】**まぜるの中身は「リメイク＋0th拡張＋1st＋旧0th」**（src/mixed-deck.js）。
//   ユーザー指示「混ぜるには旧0th混ぜよう！」で旧0thが4セット目に入ったので、
//   **箱の帯も3本**（リメイク／1st／旧0th）になった。
//   ⚠ 0th拡張だけは**ブースターパックで売られた拡張で、箱が無い**（deck-box-3d.js でも
//     リメイクの箱の絵を流用している）。⇒ ユーザー案「**拡張も混ざってるので拡張パックは
//     別で箱のそばに置いてある感じで混ぜてるのを表現**」に従い、**帯には入れず**、
//     エディションを選ぶ画面で**箱の横にパックを1つ置く**形にした（src/edition-select-ui.js）。
const 元 = {
  rm: { top: 読む("rm-top"), back: 読む("rm-back"), side: 読む("rm-side") },
  first: { top: 読む("1st-top"), back: 読む("1st-back"), side: 読む("1st-side") },
  old: { top: 読む("old0th-top"), back: 読む("old0th-back"), side: 読む("old0th-side") },
};
// 帯に並べる版（左から）。0th拡張は箱が無いので入らない（上の注）。
const 並び = ["rm", "first", "old"];

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
    // ── 案A: 斜めの帯で継ぐ（**横に3本**）────────────────────────
    // 🔴【続き840】帯が2本の時は**縦**に割っていたが、3本にしたら全部読めなくなった。
    //   512px角の蓋を縦3つに割ると、1本あたり幅の 1/3（171px）しか見えず、
    //   題字もロゴも真ん中で切れる。**横に割れば幅は丸ごと見える**ので、
    //   「運命の７つの贈り物」も「SHADES OF S:EVEN」も虹の輪も読める。
    //   ⇒ **縦と横を並べて143px（スマホの実寸）で見て決めた**（scratchpad/_shot840/帯くらべ.png）。
    // 斜めにするのは、まっすぐだと「3枚並べただけ」に見えるため。
    const 面 = 種 === "A-back" ? "back" : "top";
    const 絵 = [];
    for (const k of 並び) 絵.push(await よむ(元[k][面]));
    const n = 絵.length;
    地();
    // 左辺と右辺のずれ。🔴 **帯の太さに比例させる**——決め打ちだと、帯が増えた時に
    //   ずれが帯の太さを越えて、どの帯も隣の絵で埋まってしまう。
    const 傾き = (H / n) * 0.3;
    for (let i = 0; i < n; i++) {
      const y0 = (H / n) * i, y1 = (H / n) * (i + 1);
      // 🔴 両端の帯は**画面の外まで**広げる。広げないと、斜めにずらした分だけ
      //   右上と左下の角に地（黒）の三角が残る（143px で撮って気づいた）。
      const 切0 = i === 0 ? -H : y0;
      const 切1 = i === n - 1 ? H * 2 : y1;
      g.save();
      g.beginPath();
      g.moveTo(-2, 切0 + 傾き);
      g.lineTo(-2, 切1 + 傾き);
      g.lineTo(W + 2, 切1 - 傾き);
      g.lineTo(W + 2, 切0 - 傾き);
      g.closePath();
      g.clip();
      // その帯の真ん中に、その版の**中心**が来るように置く（題字やロゴが帯から外れない）。
      // 🔴 倍率は「幅いっぱい」。縮めると左右に地（黒）の帯が残る——角だけでなく
      //   **左右の全高**が暗くなり、蓋に見えなくなる（続き839 で縦の時に踏んだ形）。
      のせる(絵[i], W / 2, (y0 + y1) / 2, W / 絵[i].width);
      g.restore();
    }
    // 継ぎ目の金の線（2本引いて、細い方を影に見せる）
    for (let k = 1; k < n; k++) {
      const y = (H / n) * k;
      g.lineWidth = Math.max(3, W / 110);
      g.strokeStyle = 金;
      g.beginPath();
      g.moveTo(0, y + 傾き);
      g.lineTo(W, y - 傾き);
      g.stroke();
      g.lineWidth = Math.max(1, W / 340);
      g.strokeStyle = "rgba(255,245,215,0.9)";
      g.stroke();
    }
  } else if (種 === "side") {
    // ── 側面: 背を縦に継ぐ（上から リメイク / 1st / 旧0th）────────────
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
