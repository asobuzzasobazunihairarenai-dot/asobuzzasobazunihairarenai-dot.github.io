// 0th拡張（33種）のカード画像を、イラストから一気に作る。
//
//   node tools/make-ex0-art.mjs            （全部）
//   node tools/make-ex0-art.mjs ex0-red-beginning ex0-flute-red   （指定した分だけ）
//   つまみ: --dry（作らずに何を作るかだけ出す）
//
// 【作るもの】1種につき2枚:
//   assets/cards-blank/<id>.webp … 文字の入っていないカード。**アプリがこの上に名前と効果文を描く**
//   assets/cards-illust/<id>.webp … イラストだけ（盤面の遠景表示用）
//   ⚠ 「文字入り」の assets/cards/ は作らない。0th拡張は文字をアプリが描くので、
//      焼き込んだ絵を持つ意味が無い（持つと効果文を直すたびに絵の作り直しになる）。
//
// 【手順】tools/squarify-illust.mjs で横長の絵を正方形に整えてから、
//   tools/make-card.mjs でリメイクの装飾に合成する。**合成の処理には手を入れていない**
//   （本物37枠との検算が生きたままになる）。
//
// ⚠ イラストは J: の素材フォルダにある。リポジトリには入っていないので、
//   素材を持っている端末でしか走らない（走らなければ、その旨を言って終わる）。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { EX0_CARDS, EX0_SRC_ROOT, EX0_CREDITS, checkEx0Cards } from "./ex0-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, ".ex0-tmp");
const DRY = process.argv.includes("--dry");
const 指定 = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const 自己点検 = checkEx0Cards();
if (自己点検.問題.length) {
  console.error("🔴 カード一覧がおかしい:");
  for (const p of 自己点検.問題) console.error("  " + p);
  process.exit(2);
}

if (!fs.existsSync(EX0_SRC_ROOT)) {
  console.error("🔴 イラストの素材フォルダが無い: " + EX0_SRC_ROOT);
  console.error("   （素材はリポジトリに入っていないので、持っている端末で走らせてください）");
  process.exit(2);
}

// 🔴 【2026-11-04】**正方形版があればそちらを使う。**
//   元の 0th拡張のイラストは横長（1024x512 等）で、squarify-illust.mjs が上半分に置いて
//   下を空けていた。ユーザーが**カードと同じ正方形に描き直した版**（1254x1254）をくれたので、
//   そちらが在る時はそれを使う（squarify はそのまま通す＝正方形なら余白を作らない）。
//   置き場所は素材フォルダ直下の 1 つのフォルダで、**ファイル名はカードのフォルダ名と同じ**。
//   ⚠ リポジトリには入らない（実物の絵は git 管理外）。
const 正方形の置き場 = path.join(EX0_SRC_ROOT, "_正方形版");
function 正方形版を探す(folder) {
  if (!fs.existsSync(正方形の置き場)) return null;
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
    const p = path.join(正方形の置き場, folder + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// フォルダ直下の1枚を探す（BN/ の中は没案なので見ない）
function 絵を探す(folder) {
  const sq = 正方形版を探す(folder);
  if (sq) return { p: sq, 正方形: true };
  const dir = path.join(EX0_SRC_ROOT, folder);
  const files = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(jpe?g|png|webp)$/i.test(e.name))
    .map((e) => e.name);
  if (files.length !== 1) return { err: files.length + " 枚ある（1枚であってほしい）: " + files.join(" / ") };
  return { p: path.join(dir, files[0]) };
}

const node = process.execPath;
function 走らせる(args) {
  const r = spawnSync(node, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-4).join("\n"));
  return r.stdout;
}

const 対象 = 指定.length ? EX0_CARDS.filter((c) => 指定.includes(c.id)) : EX0_CARDS;
if (指定.length && 対象.length !== 指定.length) {
  console.error("🔴 知らない id が混ざっている: " + 指定.filter((x) => !EX0_CARDS.some((c) => c.id === x)).join(", "));
  process.exit(2);
}

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(ROOT, "assets/cards-blank"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "assets/cards-illust"), { recursive: true });

let 作った = 0;
const 問題 = [];
for (const c of 対象) {
  const 絵 = 絵を探す(c.folder);
  if (絵.err) { 問題.push(c.id + ": " + 絵.err); continue; }
  const 印 = 絵.正方形 ? "（正方形版）" : "";
  const blank = path.join(ROOT, "assets/cards-blank", c.id + ".webp");
  const illust = path.join(ROOT, "assets/cards-illust", c.id + ".webp");
  if (DRY) {
    console.log(c.id.padEnd(26) + c.frame.padEnd(22) + path.basename(絵.p).slice(0, 44));
    continue;
  }
  const sq = path.join(TMP, c.id + "_sq.png");
  try {
    // ① 横長の絵を正方形に整える（下は透明＝カードの色が透ける）
    走らせる(["tools/squarify-illust.mjs", "--in", 絵.p, "--out", sq]);
    // ② イラストだけの 433px を書き出す
    走らせる(["tools/squarify-illust.mjs", "--in", 絵.p, "--out", illust, "--size", "433"]);
    // ③ リメイクの装飾に合成（650pxで作り、アプリ用の433pxも書き出す）
    走らせる([
      "tools/make-card.mjs",
      "--illust", sq,
      "--frame", c.frame,
      "--out", path.join(TMP, c.id + "_650.png"),
      "--app", blank,
      "--illustrator", EX0_CREDITS.illustrator,
      "--date", EX0_CREDITS.date,
      "--edition", EX0_CREDITS.edition,
    ]);
    作った++;
    process.stdout.write("✅ " + c.id + "（" + c.name + "）" + 印 + "\n");
  } catch (e) {
    問題.push(c.id + ": " + String(e.message || e));
  }
}

if (!DRY) {
  console.log("\n作った: " + 作った + " 種 / " + 対象.length + " 種");
  // 出来たものを数える（黙って抜けていないか）
  const 抜け = [];
  for (const c of 対象) {
    for (const [dir, label] of [["assets/cards-blank", "文字なし"], ["assets/cards-illust", "イラスト"]]) {
      const p = path.join(ROOT, dir, c.id + ".webp");
      if (!fs.existsSync(p)) 抜け.push(label + "が無い: " + c.id);
      else if (fs.statSync(p).size < 2000) 抜け.push(label + "が小さすぎる: " + c.id + "（" + fs.statSync(p).size + "バイト）");
    }
  }
  for (const a of 抜け) 問題.push(a);
}
if (問題.length) {
  console.error("\n🔴 " + 問題.length + " 件:");
  for (const p of 問題) console.error("  " + p);
  process.exit(1);
}
if (!DRY) console.log("✅ 抜けも、小さすぎるものもありません。");
