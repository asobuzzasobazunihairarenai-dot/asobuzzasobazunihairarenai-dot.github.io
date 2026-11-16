// カードの並び順（色）。**ここ1か所だけ**に置く。
//
// 🔴 なぜ切り出したか（続き740・#691）: 同じ「色の順」が
//   deck-viewer.js（#640 で足した）と my-deck-builder.js と、今回のコレクションで
//   **3か所に書かれようとしていた**。式を2か所に書くと必ずズレる（#586 の事故）。
//
// ⚠ **import を1つも持たない葉**にしてある（card-set.js / my-stack.js と同じ作法。
//   どこから呼んでも輪にならない＝続き573 の TDZ 対策）。
//
// ⚠ 並べ替えは**安定**（同じ色の中の順は変えない）。既に色でそろっている一覧は1枚も動かない。
//   知らない色は**最後**へ置く（新しい色が増えても、黙って先頭に紛れ込まない）。

// ロックエリアの7色 → なないろ → 無色（白・黒）。ルールブックの並びと同じ。
export const CARD_COLOR_ORDER = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "rainbow",
  "white",
  "black",
];

export function colorRank(color) {
  const i = CARD_COLOR_ORDER.indexOf(color);
  return i < 0 ? 99 : i;
}

// カード定義の配列を色の順に並べ直す（元の配列は変えない）。
export function sortCardDefsByColor(defs) {
  return (defs || [])
    .map((c, i) => ({ c, i }))
    .sort((a, b) => colorRank(a.c?.color) - colorRank(b.c?.color) || a.i - b.i)
    .map((o) => o.c);
}
