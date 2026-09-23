// 新しいカードの絵（画像素材/配下の入稿PNG）を、アプリが配るカード画像 assets/cards/<id>.webp へ変換する。
//
// 【重要・これだけでは差し替えが完了しない】
//   アプリは既定でカードを「文字の入っていない絵（assets/cards-blank/）＋アプリ側で描く文字」で
//   表示し、盤面のカードは「イラストのみ（assets/cards-illust/）」を使う（card-face-display.js）。
//   assets/cards/ は「文字が焼き込まれた絵」で、拡大表示・演出・一部のモーダルで使う。
//   つまり絵を新しくするには**3種類とも**入れ替える必要がある。入稿に「テキスト無し」版・
//   「イラストのみ」版が無い間にここだけ走らせると、画面の一部だけ新しい絵になる。
//
// 【大きさ】433px角に揃える（今アプリが配っているのと同じ）。画像はファイル容量ではなく
//   「幅×高さ×4バイト」でメモリを食う（#223）ので、勝手に大きくしない。
//
// 【対応付け】入稿のファイル名は色＋番号（例 SOSC_通常カード_表_赤１.png）で、カード名が入って
//   いない。下の ids はファイル名の昇順に対応させた表で、2026-09-24 に1枚ずつ絵を見て確かめた。
//   件数が合わなければ例外を投げる（新しい札が増えた／減った時に黙って別の札へ割り当てないため）。
//   変換したファイル名と id は毎回すべて表示するので、目で照合できる。
//
//   使い方: node tools/cards-to-webp.mjs [--dry]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DRY = process.argv.includes("--dry");
const MAX = 433;
const QUALITY = 0.9;
const OUT = "assets/cards";
// 日本語のフォルダ名は決め打ちせず、readdirSync が返す OS からの名前で辿る（続き504の罠）。
const root = fs.readdirSync(".").find((n) => n.startsWith("画像素材")); // 画像素材
if (!root) throw new Error("画像素材フォルダが見つからない");

const GROUPS = [
  {
    dir: "通常カード", // 通常カード（桃1 桃2 橙1 橙2 白1 白2 紫1 紫2 緑1 緑2 虹1 赤1 赤2 青1 青2 黄1 黄2 黒1 黒3 の順）
    ids: [
      "pink-party", "pink-present", "orange-harvest-sow", "orange-mass-change",
      "white-radiance", "white-awakening", "purple-sorry", "purple-trial-ritual",
      "green-joint-construction", "green-growing-trees", "rainbow-shard",
      "red-jump-pad", "red-counter-lock", "blue-slum-official", "blue-choosable-trap",
      "yellow-sleight-of-hand", "yellow-gamble", "black-faded-cat", "black-contract-brand",
    ],
    // 黒２「強欲なパレット」はユーザー判断で不採用（2026-09-24）。
    // 画像素材/バックナンバー/不採用_強欲なパレット_20260924/ へ移してある。
  },
  {
    dir: "ファーストカード", // ファーストカード（桃 橙 紫 緑 赤 青 黄）
    ids: ["first-pink", "first-orange", "first-purple", "first-green", "first-red", "first-blue", "first-yellow"],
    // ノワール（first-noir）は新しい入稿に無い。旧版(webp)をそのまま使う＝ここでは触らない。
    ext: /\.png$/i,
  },
  {
    dir: "エターナルカード", // エターナルカード（桃 橙 紫 緑 赤 青 黄）
    ids: ["eternal-pink", "eternal-orange", "eternal-purple", "eternal-green", "eternal-red", "eternal-blue", "eternal-yellow"],
  },
  {
    dir: "カード裏面", // カード裏面（エターナル ファースト 通常）
    ids: ["back-eternal", "back-first", "back-normal"],
    // 裏面の別デザイン（back-*-10 / -11）は card-back-skins.js の切り替え用。ここでは触らない。
  },
];

const jobs = [];
for (const g of GROUPS) {
  const dir = path.join(root, g.dir);
  const files = fs.readdirSync(dir).filter((n) => (g.ext || /\.png$/i).test(n)).sort();
  if (files.length !== g.ids.length) {
    throw new Error(`件数が合わない: ${g.dir} は ${files.length}枚、対応表は ${g.ids.length}件。対応表を見直すこと。`);
  }
  files.forEach((n, i) => jobs.push({ src: path.join(dir, n), name: n, id: g.ids[i] }));
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
let done = 0, before = 0, after = 0;
for (const j of jobs) {
  const buf = fs.readFileSync(j.src);
  const r = await page.evaluate(async ({ dataUrl, max, quality }) => {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("decode failed"));
      i.src = dataUrl;
    });
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const k = Math.min(1, max / long);
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return { w, h, ow: img.naturalWidth, oh: img.naturalHeight, out: c.toDataURL("image/webp", quality) };
  }, { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, max: MAX, quality: QUALITY });
  const outBuf = Buffer.from(r.out.split(",")[1], "base64");
  const dst = path.join(OUT, `${j.id}.webp`);
  const oldSize = fs.existsSync(dst) ? fs.statSync(dst).size : 0;
  if (!DRY) fs.writeFileSync(dst, outBuf);
  before += oldSize; after += outBuf.length;
  console.log(`${j.id.padEnd(26)} <- ${j.name}  ${r.ow}x${r.oh} -> ${r.w}x${r.h}  ${(oldSize / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB`);
  done++;
}
await browser.close();
console.log(`\n${DRY ? "[下見]" : "[実行]"} ${done}枚  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
if (DRY) console.log("※ --dry なので1枚も書き換えていません。");
