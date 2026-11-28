// 🔴【2026-11-28・続き882】新しい無色カード3枚のカード画像を作る。
//
//   node tools/make-new-art.mjs            （全部）
//   node tools/make-new-art.mjs new-white-tower   （指定した分だけ）
//   つまみ: --dry（作らずに何を作るかだけ出す）
//
// 【いまは「枠だけ」】
//   🔴 **イラストが製作中**（2026-11-28）。偽の絵を描くと本物が来た時に見分けが付かなくなるので、
//     `tools/make-blank-illust.mjs` の**透明な下地**を渡して**枠だけ**の札を焼いている。
//     ⇒ 2層目・3層目が何も足さないので、色のべた塗り・枠・帯・紙の肌理だけが出る。
//   届いたら `ILLUST_DIR` に **カードの id と同じ名前**で置いて、この道具を走らせ直すだけ。
//   （置き場所の作法は志炎者の `_正方形版` と同じ＝取り違えようのない id で当てる）
//
// 【作るもの】1種につき2枚（他のセットと同じ）:
//   assets/cards-blank/<id>.webp  … 文字の入っていないカード。**アプリがこの上に名前と効果文を描く**
//   assets/cards-illust/<id>.webp … イラストだけ（盤面の遠景表示用）
//
// ⚠ 枠は「白２」。続き758 で焼き出しを1画素ずつ比べた結果、**「◯１」は右上に7角形の印（追色）が
//   付く**。この3枚に追色は無いので ２ を使う（志炎者と同じ決まり）。
//   ⓘ 白は１と２の差が 0〜4画素（実質同じ）だが、**決まりとしてそろえる**。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const 指定 = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// 🔴 名義は **SEVRAIL**（志炎者・リメイクの札と同じ）。日付は作った月。
export const NEW_CREDITS = { illustrator: "SEVRAIL", date: "2026.11", edition: "S" };

// イラストが届いたらここへ（ファイル名はカードの id）。
export const ILLUST_DIR = "J:/自作カードゲーム/7 seven/画像集/新カード/_正方形版";

export const NEW_ART = [
  // 🔴 色者は親（我忘れの白き龍）と同じ見せ方: 枠に焼かれた色名を抜いて、アプリが
  //   WHITE / ONLY を組版で置く（円盤の場所を空けるため＝続き774）。
  { id: "new-white-young-dragon", name: "惑う白龍の幼体", frame: "通常カード_表_白２", noColorName: true },
  { id: "new-white-cubit", name: "弱者に懐く箱猫", frame: "通常カード_表_白２" },
  { id: "new-white-tower", name: "志炎を募る白塔", frame: "通常カード_表_白２" },
];

const node = process.execPath;
const 走らせる = (args) => {
  const r = spawnSync(node, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-4).join("\n"));
  return r.stdout;
};

const 対象 = 指定.length ? NEW_ART.filter((c) => 指定.includes(c.id)) : NEW_ART;
if (指定.length && 対象.length !== 指定.length) {
  console.error("🔴 知らない id が混ざっている: " + 指定.filter((x) => !NEW_ART.some((c) => c.id === x)).join(", "));
  process.exit(2);
}

const TMP = path.join(ROOT, ".new-tmp");
if (!DRY) fs.mkdirSync(TMP, { recursive: true });
const 透明 = path.join(TMP, "blank.png");
let 枠だけ = 0;
let 作った = 0;

for (const c of 対象) {
  // イラストが届いていれば使う。無ければ透明な下地（＝枠だけ）。
  let 絵 = null;
  for (const 拡張 of [".png", ".webp", ".jpg", ".jpeg"]) {
    const p = path.join(ILLUST_DIR, c.id + 拡張);
    if (fs.existsSync(p)) { 絵 = p; break; }
  }
  if (DRY) {
    console.log((絵 ? "絵あり " : "枠だけ ") + c.id + "  " + c.name + "  枠=" + c.frame);
    continue;
  }
  if (!絵) {
    if (!fs.existsSync(透明)) 走らせる([path.join(ROOT, "tools", "make-blank-illust.mjs"), 透明, "1254"]);
    絵 = 透明;
    枠だけ++;
  }
  const out = path.join(TMP, c.id + ".png");
  走らせる([
    path.join(ROOT, "tools", "make-card.mjs"),
    ...(c.noColorName ? ["--no-colorname"] : []),
    "--illust", 絵,
    "--frame", c.frame,
    "--out", out,
    "--app", path.join(ROOT, "assets", "cards-blank", c.id + ".webp"),
    "--illustrator", NEW_CREDITS.illustrator,
    "--date", NEW_CREDITS.date,
    "--edition", NEW_CREDITS.edition,
  ]);
  // イラストだけの絵（盤面の遠景用）。枠だけの時も**同じ絵**を置く
  // （置かないと `assets/cards-illust/<id>.webp` が 404 になる＝#686 の家族）。
  走らせる([
    path.join(ROOT, "tools", "squarify-illust.mjs"),
    "--in", 絵,
    "--out", path.join(ROOT, "assets", "cards-illust", c.id + ".webp"),
  ]);
  作った++;
  console.log("作った: " + c.id + "  " + c.name + (絵 === 透明 ? "（枠だけ・イラスト待ち）" : ""));
}

if (!DRY) {
  console.log("\n" + 作った + "種ぶん作った" + (枠だけ ? "（うち " + 枠だけ + " 種はイラスト待ちの枠だけ）" : ""));
  if (枠だけ) console.log("⚠ イラストが届いたら " + ILLUST_DIR + " に **id と同じ名前**で置いて、この道具を走らせ直す。");
}
