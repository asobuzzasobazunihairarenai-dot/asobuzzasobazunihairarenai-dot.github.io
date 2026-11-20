// 0thリメイクの限定カード（志炎者7枚）の**道具側の正**。
//
// ■ これは何か
//   クラウドファンディングの限定報酬として配る7枚。旧0thにも「◯の志炎を待つ者」という
//   **題名が同じ札**があるので、こちらは「**◯を待つ志炎者　-△△-**」に改名してある
//   （2026-11-21・ユーザー判断。続き776）。
//   名前は7人で「火の一生」を表す（すべてラテン語の火の言葉）。
//
// ■ 扱い（ユーザー判断）
//   ・**拡張カード**。新しいエディションではない（旧0th・1st のように別の山札にはしない）。
//   ・**パックではなく限定報酬**として配る。
//
// ■ 🔴 枠は「◯２」（追色の印が付かない方）
//   続き758 で焼き出しを1画素ずつ比べた結果、**「◯１」は右上に7角形の印（追色）が付く**。
//   志炎者に追色は無いので **２** を使う。
//   ⚠ 赤・黄・緑・青・桃は１と２の差が 0〜4画素（実質同じ）だが、**そろえて２**にしてある。
//
// ■ ⚠ 絵のファイル名が文字化けしている
//   素材フォルダ（`しえんしゃ　画像`）のファイル名は Shift_JIS が壊れた形で入っているので、
//   **英語の部分（鍵）で当てる**。色の取り違えが無いことは目で確かめてある
//   （scratchpad/_cf_art_check.mjs ／ scratchpad/_cf/絵.png）。
import fs from "node:fs";
import path from "node:path";

export const CF_SRC_ROOT = "J:/自作カードゲーム/7 seven/画像集/しえんしゃ　画像";

// ⚠ illustrator は**仮**。これらの絵はリメイクの SEVRAIL 名義ではないので、
//   出す前にユーザーに確かめること（続き776 の申し送り）。
export const CF_CREDITS = { illustrator: "YGM", date: "2026.11", edition: "S" };

export const CF_CARDS = [
  { no: "01", id: "cf-yellow-scintilla", name: "黄を待つ志炎者　-スキンティラ-", color: "yellow",
    frame: "通常カード_表_黄２", 鍵: "a_boy_with_yellow_fla", 意味: "火花", 段: "① 生まれる" },
  { no: "02", id: "cf-pink-flamma", name: "桃を待つ志炎者　-フランマ-", color: "pink",
    frame: "通常カード_表_桃２", 鍵: "a_girl_with_pink_flam", 意味: "炎", 段: "② 育つ" },
  { no: "03", id: "cf-red-ignis", name: "赤を待つ志炎者　-イグニス-", color: "red",
    frame: "通常カード_表_赤２", 鍵: "a_man_with_red_flames", 意味: "火", 段: "③ 燃え盛る" },
  { no: "04", id: "cf-orange-brand", name: "橙を待つ志炎者　-ブランド-", color: "orange",
    frame: "通常カード_表_橙２", 鍵: "a_canine_humanoid_fig", 意味: "燃え木・焼き印", 段: "④ 運ばれる" },
  { no: "05", id: "cf-blue-candela", name: "青を待つ志炎者　-カンデラ-", color: "blue",
    frame: "通常カード_表_青２", 鍵: "an_old_father_with_bl", 意味: "燭", 段: "⑤ 灯される" },
  { no: "06", id: "cf-green-ember", name: "緑を待つ志炎者　-エンバー-", color: "green",
    frame: "通常カード_表_緑２", 鍵: "a_large_man_with_gree", 意味: "残り火", 段: "⑥ 燻る" },
  { no: "07", id: "cf-purple-favilla", name: "紫を待つ志炎者　-ファウィラ-", color: "purple",
    frame: "通常カード_表_紫２", 鍵: "an_elderly_hunched_wom", 意味: "燃えさし・灰", 段: "⑦ 還る" },
];

// 旧0th のクラファン限定にも在る2人（まだ作らない。絵だけ在ることの覚え書き）。
export const CF_残り = [
  { 名: "絆結びの志炎者（旧0th）", 鍵: "a_goddesslike_woman_i" },
  { 名: "闇堕ちの志炎者（旧0th）", 鍵: "a_man_holding_black_f" },
];

// 鍵から実際のファイルを探す。
export function cfArtPath(鍵) {
  if (!fs.existsSync(CF_SRC_ROOT)) return null;
  const f = fs.readdirSync(CF_SRC_ROOT)
    .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
    .find((n) => n.includes(鍵));
  return f ? path.join(CF_SRC_ROOT, f) : null;
}

// 自己点検。**0しか出ない検査にしない**ので、数と中身の両方を見る。
export function checkCfCards() {
  const 問題 = [];
  if (CF_CARDS.length !== 7) 問題.push("7枚であってほしいのに " + CF_CARDS.length + " 枚");
  const 色 = new Set(CF_CARDS.map((c) => c.color));
  for (const c of ["red", "orange", "yellow", "green", "blue", "pink", "purple"]) {
    if (!色.has(c)) 問題.push("色が足りない: " + c);
  }
  const id = new Set();
  for (const c of CF_CARDS) {
    if (id.has(c.id)) 問題.push("id が重なっている: " + c.id);
    id.add(c.id);
    if (!/^cf-[a-z]+-[a-z]+$/.test(c.id)) 問題.push("id の形がちがう: " + c.id);
    if (!c.name.includes("を待つ志炎者")) 問題.push("名前の形がちがう（「◯を待つ志炎者」）: " + c.name);
    if (!/-.+-$/.test(c.name)) 問題.push("名前に -△△- が無い: " + c.name);
    // 🔴 枠は「２」（１は追色の印が付く）
    if (!/２$/.test(c.frame)) 問題.push("枠が「２」でない（１は追色の印が付く）: " + c.id + " → " + c.frame);
  }
  // 段が ①〜⑦ でそろっているか（火の一生）
  const 段 = CF_CARDS.map((c) => c.段.slice(0, 1)).join("");
  if (段 !== "①②③④⑤⑥⑦") 問題.push("火の段階の並びがちがう: " + 段);
  return 問題;
}
