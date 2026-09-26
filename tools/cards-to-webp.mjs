// 新しいカードの絵（画像素材/配下の入稿PNG）を、アプリが配るカード画像へ変換する。
//
// 【アプリは3種類の絵を使い分けている】ので、3セットとも入れ替えないと画面がちぐはぐになる。
//   assets/cards        … 文字が焼き込まれた絵。拡大表示・演出・一部のモーダル
//   assets/cards-blank  … 文字の入っていない絵。**既定の表示**（この上にアプリが文字を描く）
//   assets/cards-illust … イラストのみ（枠の下の文字欄が無い）。盤面に並ぶカード
//   （card-face-display.js の既定は text モード＝blank を使う）
//
// 【大きさ】433px角に揃える（今アプリが配っているのと同じ）。画像はファイル容量ではなく
//   「幅×高さ×4バイト」でメモリを食う（#223）ので、勝手に大きくしない。
//
// 【対応付け】入稿のファイル名は色＋番号（例 SOSC_ol_通常カード_表_赤１.png）で、カード名が入って
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
// 日本語のフォルダ名は決め打ちせず、readdirSync が返す OS からの名前で辿る（続き504の罠）。
const root = fs.readdirSync(".").find((n) => n.startsWith("画像素材")); // 画像素材
if (!root) throw new Error("画像素材フォルダが見つからない");

const NORMAL = [
  "pink-party", "pink-present", "orange-harvest-sow", "orange-mass-change",
  "white-radiance", "white-awakening", "purple-sorry", "purple-trial-ritual",
  "green-joint-construction", "green-growing-trees", "rainbow-shard",
  "red-jump-pad", "red-counter-lock", "blue-slum-official", "blue-choosable-trap",
  "yellow-sleight-of-hand", "yellow-gamble", "black-faded-cat", "black-contract-brand",
]; // 桃1 桃2 橙1 橙2 白1 白2 紫1 紫2 緑1 緑2 虹1 赤1 赤2 青1 青2 黄1 黄2 黒1 黒3 の順
// 黒２「強欲なパレット」はユーザー判断で不採用（画像素材/バックナンバー/不採用_… にある）。
const FIRST = ["first-pink", "first-orange", "first-purple", "first-green", "first-red", "first-blue", "first-yellow"];
// ノワール（first-noir）は新しい入稿に無いので、旧版をそのまま使う＝ここでは触らない。
const ETERNAL = ["eternal-pink", "eternal-orange", "eternal-purple", "eternal-green", "eternal-red", "eternal-blue", "eternal-yellow"];
const BACKS = ["back-eternal", "back-first", "back-normal"]; // エターナル/ファースト/通常 の順（ファイル名の昇順）

const K = { normal: "通常カード", first: "ファーストカード", eternal: "エターナルカード", back: "カード裏面" };
const SUF_BLANK = "（テキスト無し）"; // （テキスト無し）
const SUF_ILLUST = "（イラストのみ）"; // （イラストのみ）

const SETS = [
  { out: "assets/cards", groups: [[K.normal, NORMAL], [K.first, FIRST], [K.eternal, ETERNAL], [K.back, BACKS]] },
  { out: "assets/cards-blank", groups: [[K.normal + SUF_BLANK, NORMAL], [K.first + SUF_BLANK, FIRST], [K.eternal + SUF_BLANK, ETERNAL]] },
  { out: "assets/cards-illust", groups: [[K.normal + SUF_ILLUST, NORMAL], [K.first + SUF_ILLUST, FIRST], [K.eternal + SUF_ILLUST, ETERNAL]] },
];

const jobs = [];
for (const s of SETS) {
  for (const [dirName, ids] of s.groups) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) throw new Error("フォルダが無い: " + dirName);
    const files = fs.readdirSync(dir).filter((n) => /\.png$/i.test(n)).sort();
    if (files.length !== ids.length) {
      throw new Error(`件数が合わない: ${dirName} は ${files.length}枚、対応表は ${ids.length}件。対応表を見直すこと。`);
    }
    files.forEach((n, i) => jobs.push({ src: path.join(dir, n), name: n, id: ids[i], out: s.out }));
  }
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
  const dst = path.join(j.out, `${j.id}.webp`);
  const oldSize = fs.existsSync(dst) ? fs.statSync(dst).size : 0;
  if (!DRY) fs.writeFileSync(dst, outBuf);
  before += oldSize; after += outBuf.length;
  console.log(`${j.out.padEnd(20)} ${j.id.padEnd(26)} <- ${j.name}  ${r.ow}x${r.oh} -> ${r.w}x${r.h}  ${(oldSize / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB`);
  done++;
}
await browser.close();
console.log(`\n${DRY ? "[下見]" : "[実行]"} ${done}枚  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
if (DRY) console.log("※ --dry なので1枚も書き換えていません。");
