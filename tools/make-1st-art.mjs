// 1st EDITION のカード画像を、イラストから一気に作る。
//
//   node tools/make-1st-art.mjs            （全部）
//   node tools/make-1st-art.mjs 1st-red-poor-march   （指定した分だけ）
//   つまみ: --dry（作らずに何を作るかだけ出す）
//
// 【作るもの】1種につき2枚:
//   assets/cards-blank/<id>.webp … 文字の入っていないカード。**アプリがこの上に名前と効果文を描く**
//   assets/cards-illust/<id>.webp … イラストだけ（盤面の遠景表示用）
//   ⚠ 「文字入り」の assets/cards/ は作らない（0th拡張と同じ理由。文字はアプリが描くので、
//      焼き込むと効果文を直すたびに絵の作り直しになるし、英語に切り替えられない）。
//
// 【手順】tools/squarify-illust.mjs で横長の絵を正方形に整えてから、
//   tools/make-card.mjs でリメイクの装飾に合成する。**合成の処理には手を入れていない**
//   （本物37枠との検算が生きたままになる）。
//
// 🔴 【Fカードだけは別の道】ユーザー判断（2026-11-05「とりあえず暫定で、旧デザインの
//   カードを当てておくとかできる？」）。イラストの候補がまだ決まっていないので、
//   **印刷データ（1st EDITION の完成カードそのもの）を 433x433 に縮めて当てる**。
//   ⇒ 文字が焼き込まれているので、この7枚だけは **assets/cards/** を持ち、
//     アプリは文字を描かない（cards-data.js の hasBakedCardFace）。
//   正式な絵が決まったら first-cards.mjs の 暫定印刷絵 を外して pick を書けば、
//   他の26種と同じ合成の道に戻る。
//
// ⚠ イラストは J: の素材フォルダにある。リポジトリには入っていないので、
//   素材を持っている端末でしか走らない（走らなければ、その旨を言って終わる）。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  FIRST_ED_BUILD, FIRST_ED_PRINTED_FACE, FIRST_ED_SRC_ROOT, FIRST_ED_PRINTED_ROOT,
  printedCardFile, FIRST_ED_CREDITS, checkFirstEdCards,
} from "./first-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, ".1st-tmp");
const DRY = process.argv.includes("--dry");
const 指定 = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const 自己点検 = checkFirstEdCards();
if (自己点検.問題.length) {
  console.error("🔴 カード一覧がおかしい:");
  for (const p of 自己点検.問題) console.error("  " + p);
  process.exit(2);
}

if (!fs.existsSync(FIRST_ED_SRC_ROOT)) {
  console.error("🔴 イラストの素材フォルダが無い: " + FIRST_ED_SRC_ROOT);
  console.error("   （素材はリポジトリに入っていないので、持っている端末で走らせてください）");
  process.exit(2);
}

// 🔴 **正方形版があればそちらを使う**（0th拡張と同じ仕組み＝続き663）。
//   いまの素材は横長（1024x512 等）で、squarify-illust.mjs が上半分に置いて下を空けている。
//   ユーザーが**カードと同じ正方形に描き直した版**をくれたら、置くだけで切り替わる。
//   置き場所は素材フォルダ直下の _正方形版/ で、**ファイル名はカードのフォルダ名と同じ**。
//   ⚠ リポジトリには入らない（実物の絵は git 管理外）。
const 正方形の置き場 = path.join(FIRST_ED_SRC_ROOT, "_正方形版");
function 正方形版を探す(folder) {
  if (!fs.existsSync(正方形の置き場)) return null;
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
    const p = path.join(正方形の置き場, folder + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// フォルダ直下の画像を名前順に並べ、pick 番目を使う（BN/ は没案なので見ない＝ディレクトリは外す）。
// 🔴 候補が2枚以上あるのに pick が書かれていない時は**止める**。
//   黙って1枚目を使うと、取り違えたまま出来てしまう（続き646 で実際に紫を取り違えた）。
function 絵を探す(c) {
  const sq = 正方形版を探す(c.folder);
  if (sq) return { p: sq, name: path.basename(sq), 正方形: true };
  const dir = path.join(FIRST_ED_SRC_ROOT, c.folder);
  if (!fs.existsSync(dir)) return { err: "フォルダが無い: " + c.folder };
  const files = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
  if (files.length === 0) return { err: "絵が1枚も無い: " + c.folder };
  if (files.length > 1 && c.pick == null) {
    return { err: files.length + " 枚あるのに pick が無い: " + files.join(" / ") };
  }
  const i = c.pick || 0;
  if (!files[i]) return { err: "pick " + i + " に当たる絵が無い（" + files.length + " 枚）" };
  return { p: path.join(dir, files[i]), name: files[i] };
}

const node = process.execPath;
function 走らせる(args) {
  const r = spawnSync(node, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-4).join("\n"));
  return r.stdout;
}

const 対象 = 指定.length ? FIRST_ED_BUILD.filter((c) => 指定.includes(c.id)) : FIRST_ED_BUILD;
// ⚠ 指定した id は「合成で作るもの」か「暫定の印刷絵で作るもの」のどちらかでよい。
const 作れる = new Set([...FIRST_ED_BUILD, ...FIRST_ED_PRINTED_FACE].map((c) => c.id));
const 知らない = 指定.filter((x) => !作れる.has(x));
if (知らない.length) {
  console.error("🔴 知らない id が混ざっている: " + 知らない.join(", "));
  process.exit(2);
}

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(ROOT, "assets/cards-blank"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "assets/cards-illust"), { recursive: true });

let 作った = 0;
const 問題 = [];
for (const c of 対象) {
  const 絵 = 絵を探す(c);
  if (絵.err) { 問題.push(c.id + ": " + 絵.err); continue; }
  const blank = path.join(ROOT, "assets/cards-blank", c.id + ".webp");
  const illust = path.join(ROOT, "assets/cards-illust", c.id + ".webp");
  if (DRY) {
    console.log(c.id.padEnd(26) + c.frame.padEnd(22) + 絵.name.slice(0, 50));
    continue;
  }
  const sq = path.join(TMP, c.id + "_sq.png");
  try {
    走らせる(["tools/squarify-illust.mjs", "--in", 絵.p, "--out", sq]);
    走らせる(["tools/squarify-illust.mjs", "--in", 絵.p, "--out", illust, "--size", "433"]);
    走らせる([
      "tools/make-card.mjs",
      "--illust", sq,
      "--frame", c.frame,
      "--out", path.join(TMP, c.id + "_650.png"),
      "--app", blank,
      "--illustrator", FIRST_ED_CREDITS.illustrator,
      "--date", FIRST_ED_CREDITS.date,
      "--edition", FIRST_ED_CREDITS.edition,
    ]);
    作った++;
    process.stdout.write("✅ " + c.id + "（" + c.name + "）" + (絵.正方形 ? "（正方形版）" : "") + "\n");
  } catch (e) {
    問題.push(c.id + ": " + String(e.message || e));
  }
}

// ── Fカードの暫定絵（印刷データをそのまま縮める） ─────────────────────────────
// 指定が無い（＝全部作る）時だけ回す。指定された id が暫定印刷絵のものなら、それも作る。
const 印刷対象 = 指定.length ? FIRST_ED_PRINTED_FACE.filter((c) => 指定.includes(c.id)) : FIRST_ED_PRINTED_FACE;
if (印刷対象.length) {
  if (!fs.existsSync(FIRST_ED_PRINTED_ROOT)) {
    問題.push("印刷データのフォルダが無い: " + FIRST_ED_PRINTED_ROOT);
  } else {
    fs.mkdirSync(path.join(ROOT, "assets/cards"), { recursive: true });
    for (const c of 印刷対象) {
      const src = path.join(FIRST_ED_PRINTED_ROOT, printedCardFile(c.no));
      if (!fs.existsSync(src)) { 問題.push(c.id + ": 印刷データが無い: " + printedCardFile(c.no)); continue; }
      if (DRY) { console.log(c.id.padEnd(26) + "（暫定・印刷データ）" + printedCardFile(c.no)); continue; }
      try {
        // 元は 650x650 の正方形なので、squarify は「433 へ縮めるだけ」になる（切り落とさない）。
        // ⚠ 盤面の遠景用（cards-illust）も同じ絵を当てる。文字入りのまま小さく出るが、
        //   **絵が出ないより良い**（正式な絵が決まるまでの暫定）。
        for (const dir of ["assets/cards", "assets/cards-illust"]) {
          走らせる(["tools/squarify-illust.mjs", "--in", src, "--out", path.join(ROOT, dir, c.id + ".webp"), "--size", "433"]);
        }
        作った++;
        process.stdout.write("✅ " + c.id + "（" + c.name + "）暫定・印刷データ\n");
      } catch (e) {
        問題.push(c.id + ": " + String(e.message || e));
      }
    }
    if (!DRY) {
      for (const c of 印刷対象) {
        for (const [dir, label] of [["assets/cards", "文字入り"], ["assets/cards-illust", "イラスト"]]) {
          const p = path.join(ROOT, dir, c.id + ".webp");
          if (!fs.existsSync(p)) 問題.push(label + "が無い: " + c.id);
          else if (fs.statSync(p).size < 2000) 問題.push(label + "が小さすぎる: " + c.id);
        }
      }
    }
  }
}

if (!DRY) {
  console.log("\n作った: " + 作った + " 種 / " + (対象.length + 印刷対象.length) + " 種");
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
