// 0thリメイクの限定カード（志炎者7枚）のカード画像を、イラストから一気に作る。
//
//   node tools/make-cf-art.mjs                      （全部）
//   node tools/make-cf-art.mjs cf-red-ignis         （指定した分だけ）
//   つまみ: --dry（作らずに何を作るかだけ出す）
//
// 【作るもの】1種につき2枚（0th拡張・旧0th と同じ）:
//   assets/cards-blank/<id>.webp  … 文字の入っていないカード。**アプリがこの上に名前と効果文を描く**
//   assets/cards-illust/<id>.webp … イラストだけ（盤面の遠景表示用）
//
// 【手順】squarify-illust.mjs で横長の絵を正方形に整えてから、make-card.mjs でリメイクの
//   装飾に合成する。**合成の処理には手を入れない**（本物37枠との検算が生きたままになる）。
//
// ⚠ イラストは J: の素材フォルダにある。リポジトリには入っていないので、
//   素材を持っている端末でしか走らない（走らなければ、その旨を言って終わる）。
// ⚠ ファイル名が文字化けしているので、**英語の部分（鍵）で当てる**（cf-cards.mjs）。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CF_CARDS, CF_SRC_ROOT, CF_CREDITS, cfIllustFor, checkCfCards } from "./cf-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, ".cf-tmp");
const DRY = process.argv.includes("--dry");
const 指定 = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const 自己点検 = checkCfCards();
if (自己点検.length) {
  console.error("🔴 cf-cards.mjs の中身がおかしい:");
  for (const p of 自己点検) console.error("  - " + p);
  process.exit(2);
}

if (!fs.existsSync(CF_SRC_ROOT)) {
  console.error("🔴 素材フォルダが見つかりません: " + CF_SRC_ROOT);
  console.error("   （実物の絵は git 管理外です。素材を持っている端末で走らせてください）");
  process.exit(2);
}

const node = process.execPath;
function 走らせる(args) {
  const r = spawnSync(node, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-4).join("\n"));
  return r.stdout;
}

const 対象 = 指定.length ? CF_CARDS.filter((c) => 指定.includes(c.id)) : CF_CARDS;
if (指定.length && 対象.length !== 指定.length) {
  console.error("🔴 知らない id が混ざっている: " + 指定.filter((x) => !CF_CARDS.some((c) => c.id === x)).join(", "));
  process.exit(2);
}

if (!DRY) fs.mkdirSync(TMP, { recursive: true });
const 問題 = [];
let 作った = 0;

let 横長のまま = 0;
for (const c of 対象) {
  const 選 = cfIllustFor(c);
  if (選.err) { 問題.push(c.id + ": " + 選.err); continue; }
  const 絵 = 選.p;
  if (!選.正方形) 横長のまま++;
  const blank = path.join(ROOT, "assets/cards-blank", c.id + ".webp");
  const illust = path.join(ROOT, "assets/cards-illust", c.id + ".webp");
  if (DRY) {
    console.log(c.id.padEnd(22) + c.frame.padEnd(20) + (選.正方形 ? "[正方形] " : "[横長]   ") + path.basename(絵).slice(-44));
    continue;
  }
  const sq = path.join(TMP, c.id + "_sq.png");
  try {
    // ① 横長の絵を正方形に整える（下は透明＝カードの色が透ける）
    走らせる(["tools/squarify-illust.mjs", "--in", 絵, "--out", sq]);
    // ② イラストだけの 433px を書き出す
    走らせる(["tools/squarify-illust.mjs", "--in", 絵, "--out", illust, "--size", "433"]);
    // ③ リメイクの装飾に合成（650pxで作り、アプリ用の433pxも書き出す）
    走らせる([
      "tools/make-card.mjs",
      "--illust", sq,
      "--frame", c.frame,
      "--out", path.join(TMP, c.id + "_650.png"),
      "--app", blank,
      "--illustrator", CF_CREDITS.illustrator,
      "--date", CF_CREDITS.date,
      "--edition", CF_CREDITS.edition,
    ]);
    作った++;
    process.stdout.write("✅ " + c.id + "（" + c.name + "）" + (選.正方形 ? "" : "  ⚠ 横長の控えから") + "\n");
  } catch (e) {
    問題.push(c.id + ": " + String(e.message || e));
  }
}

if (!DRY) {
  console.log("\n作った: " + 作った + " 種 / " + 対象.length + " 種");
  // 🔴 正方形版（`_正方形版/<id>.png`）が正。横長の控えから焼いたら、黙って通さずに言う。
  if (横長のまま) {
    console.log("⚠ " + 横長のまま + " 種を**横長の控え**から焼きました（下が空いた絵になります）。");
    console.log("   正方形版の置き場: " + path.join(CF_SRC_ROOT, "_正方形版") + "（ファイル名はカードの id）");
  } else {
    console.log("✅ " + 対象.length + " 種とも**正方形版**から焼きました。");
  }
  // 出来たものを数える（黙って抜けていないか）
  for (const c of 対象) {
    for (const [dir, label] of [["assets/cards-blank", "文字なし"], ["assets/cards-illust", "イラスト"]]) {
      const p = path.join(ROOT, dir, c.id + ".webp");
      if (!fs.existsSync(p)) 問題.push(label + "が無い: " + c.id);
      else if (fs.statSync(p).size < 2000) 問題.push(label + "が小さすぎる: " + c.id + "（" + fs.statSync(p).size + "バイト）");
    }
  }
  try { for (const f of fs.readdirSync(TMP)) fs.unlinkSync(path.join(TMP, f)); fs.rmdirSync(TMP); } catch (e) {}
}

if (問題.length) {
  console.error("\n🔴 問題:");
  for (const p of 問題) console.error("  - " + p);
  process.exit(1);
}
if (!DRY) console.log("✅ 抜けも、小さすぎるものもありません。");
