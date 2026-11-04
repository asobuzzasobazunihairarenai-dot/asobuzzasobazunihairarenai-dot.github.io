// 【2026-11-04・#505】小さい版（assets/thumbs/）の取りこぼしを見張る。
//
// 🔴 なぜ要るか: 絵を1枚足した時に小さい版を焼き忘れると、**その絵だけ 404 になる**。
//    貼る側（image-thumbs.js の setThumbSrc）が原寸へ戻すので画面は壊れないが、
//    「その人のアバターだけ重いまま」という、誰も気づかない形で残る。
//    ⇒ 焼き忘れをここで落とす（`npm run check` の中で毎回走る）。
//
// ⚠ 逆（小さい版だけ在って元が無い）も落とす。絵を消した時の置き去り。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));
// tools/make-thumbs.mjs の TARGETS と同じ決まり。
const TARGETS = [
  { dir: "backgrounds" },
  { dir: "playmats" },
  { dir: "avatars" },
  { dir: "cards", only: (f) => f.startsWith("back-") },
];
const IMG = /\.(webp|png|jpe?g)$/i;

// 🔴 焼き出しの長辺は2か所にある（焼く側と貼る側）。ズレると「貼る側は384で足りると思って
//    いるのに実物は256」のような、気づきにくい粗さになる。
const 焼く側 = fs.readFileSync(path.join(ROOT, "tools/make-thumbs.mjs"), "utf8");
const 貼る側 = fs.readFileSync(path.join(ROOT, "src/image-thumbs.js"), "utf8");
const 数 = (text, 目印) => {
  const i = text.indexOf(目印);
  if (i < 0) return null;
  const m = text.slice(i + 目印.length).match(/[0-9]+/);
  return m ? Number(m[0]) : null;
};
const e1 = 数(焼く側, "const THUMB_EDGE =");
const e2 = 数(貼る側, "export const THUMB_EDGE =");
if (e1 === null || e2 === null) {
  console.error("check-thumbs: THUMB_EDGE を取り出せませんでした（名前が変わった？）");
  process.exit(2);
}
if (e1 !== e2) {
  console.error("check-thumbs: 長辺の値がズレています 焼く側=" + e1 + " / 貼る側=" + e2);
  process.exit(1);
}

let 原寸合計 = 0;
let 小さい版合計 = 0;
const 足りない = [];
const 置き去り = [];
let 対象 = 0;

for (const t of TARGETS) {
  const srcDir = path.join(ROOT, "assets", t.dir);
  const thumbDir = path.join(ROOT, "assets", "thumbs", t.dir);
  if (!fs.existsSync(srcDir)) continue;
  const expect = new Set();
  for (const f of fs.readdirSync(srcDir)) {
    if (!IMG.test(f)) continue;
    if (t.only && !t.only(f)) continue;
    対象++;
    const want = f.replace(/\.(png|jpe?g)$/i, ".webp");
    expect.add(want);
    const fp = path.join(thumbDir, want);
    if (!fs.existsSync(fp)) {
      足りない.push("assets/" + t.dir + "/" + f);
      continue;
    }
    原寸合計 += fs.statSync(path.join(srcDir, f)).size;
    小さい版合計 += fs.statSync(fp).size;
  }
  if (fs.existsSync(thumbDir)) {
    for (const f of fs.readdirSync(thumbDir)) {
      if (!IMG.test(f)) continue;
      if (!expect.has(f)) 置き去り.push("assets/thumbs/" + t.dir + "/" + f);
    }
  }
}

if (対象 === 0) {
  console.error("check-thumbs: 対象の絵が1枚も見つかりませんでした（置き場所が変わった？）");
  process.exit(2);
}

if (足りない.length || 置き去り.length) {
  if (足りない.length) {
    console.error("小さい版が足りません（node tools/make-thumbs.mjs で焼けます）: " + 足りない.length + "件");
    for (const f of 足りない.slice(0, 20)) console.error("  - " + f);
  }
  if (置き去り.length) {
    console.error("元の絵が無いのに残っている小さい版: " + 置き去り.length + "件");
    for (const f of 置き去り.slice(0, 20)) console.error("  - " + f);
  }
  process.exit(1);
}

console.log(
  "小さい版: " + 対象 + "件そろっています（元 " +
    Math.round((原寸合計 / 1048576) * 10) / 10 + "MB → " +
    Math.round((小さい版合計 / 1048576) * 10) / 10 + "MB）"
);
