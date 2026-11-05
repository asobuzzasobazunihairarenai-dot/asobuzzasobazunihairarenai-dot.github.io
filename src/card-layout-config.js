// カード面の各テキスト要素の配置設定を1箇所にまとめる。
// card-renderer.js / style.css / card-render-preview.js（エディタ）で共有し、ズレを防ぐ。
// 位置・サイズは全て cqw（カード幅比）。x=左, y=上, w=幅, s=文字サイズ, oy=上下微調整(ルビ)。
// style.css の各 var(..., 既定) の「既定値」と一致させること
// （tools/gen-cardface-css.mjs がこの設定からCSSを生成する）。
//
// レイアウトは3グループ:
//  - std     : 通常カード と エターナルカード（位置調整は共通・ユーザー要望）。効果は fx＝基本/到達/手札を
//              1セットで上から詰め、間に仕切り線。
//  - first   : ファーストカード（基本→タイトル→能力名→手札の交互配置。効果も個別。文字は全て白・効果中央）。
//  - first1st: **1st EDITION のファーストカード（◯のジュエル）専用**。
//      🔴 first と分けた理由: 1st の手札効果は【財力＝１（あなたの手札の枚数が…）】という
//        説明つきの長文で（財力のサマリーを兼ねるのでユーザー判断で短くしない）、リメイクと
//        同じ配置だと**枠の下辺（約94.9%）を越えてクレジット行に被る**（実測 94.1〜95.9%）。
//        1st 用の値にすると 85.0〜85.8% に収まる。
//      ⚠ cardTypeOf は "first-1st-" を **"first-" より先に**見ること（後ろだと first に取られる）。

export const LAYOUT = {
  std: {
    flavor:  { x: 6, y: 5, w: 88, s: 2.5 },
    title:   { x: 6, y: 52.5, w: 90, s: 3.9 },
    ruby:    { s: 1.8, oy: 0, props: ["s", "oy"] },
    fx:      { x: 6, y: 58, w: 88, s: 3.2 },
    // ★基本は fx内で font-size・幅・左位置(margin-left)を個別に調整（到達/手札とは別）。
    fxbasic: { s: 2.7, w: 80, mx: 8, props: ["s", "w", "mx"] },
    icon:    { s: 6.6, props: ["s"] }, // ●/■アイコンのサイズ（cqw）
    gap:     { s: 1.5, props: ["s"] }, // アイコン→文の間隔（cqw）
  },
  // first は中央配置（左位置Xは不要）＝タイトル/能力名/効果文は中央。ただし■アイコンだけは
  // 独立要素(handicon)にして左位置Xを持つ（ユーザー要望「アイコンは中央でなく左位置調整」）。
  first: {
    basic:    { y: 6.5, w: 58, s: 2.8, props: ["y", "w", "s"] },
    title:    { y: 23.5, w: 90, s: 3.5, props: ["y", "w", "s"] },
    ruby:     { s: 1.6, oy: 0, props: ["s", "oy"] },
    sub:      { y: 58.5, w: 90, s: 3.8, props: ["y", "w", "s"] },
    handicon: { x: 9, y: 69, s: 8, props: ["x", "y", "s"] }, // ■アイコン（左基準の絶対配置・中央ではない）
    handcost: { y: 69, w: 64.5, s: 2.9, props: ["y", "w", "s"] }, // 手札効果の【追色N】（…）部分（中央・マーカー無し）
    hand:     { y: 82.5, w: 61.5, s: 2.9, props: ["y", "w", "s"] }, // 手札効果の本文（中央・マーカー無し）
  },
  // 1st EDITION のファースト（◯のジュエル）。first の写しから、長い手札効果が収まるよう
  // 上へ詰めて文字を少し小さくした値。カード面エディタの「1st EDITION ファースト」で調整できる。
  first1st: {
    // ユーザー指示（2026-11-06）「下の効果文もう少し上に／タイトルももう少し下に」。
    // 実測した隙間に合わせた: ★基本は 10.0〜19.6% で終わり、能力名は 56.5〜61.6%、
    // 手札効果は 76% 始まりで下に 14.4% も空いていた。題を下げ、手札を上げる。
    // ⚠ 題を 31 以上にすると、絵に描かれた色名（R E D＝約35.8%〜）に触れる。
    basic:    { y: 10, w: 60, s: 2.5, props: ["y", "w", "s"] },
    title:    { y: 29, w: 90, s: 3.3, props: ["y", "w", "s"] },
    ruby:     { s: 1.6, oy: 0, props: ["s", "oy"] },
    sub:      { y: 56.5, w: 90, s: 3.4, props: ["y", "w", "s"] },
    handicon: { x: 10, y: 62, s: 7, props: ["x", "y", "s"] },
    handcost: { y: 62, w: 66, s: 2.45, props: ["y", "w", "s"] },
    hand:     { y: 66, w: 66, s: 2.45, props: ["y", "w", "s"] },
    // 🔴 文を「石の形」に沿わせる（card-renderer.js が shape-outside の土手を2つ入れる）。
    //   絵は八角形のジュエルなので、上と下では使える幅が狭い。長方形の枠のままだと
    //   実測で**左右に各12〜13%はみ出して台座に乗る**（続き667 で測った）。
    //   値は scratchpad/_gemgeom.mjs で実測（斜辺の傾きが1であることも検算済み）。
    //   ⚠ これは**絵の形**なので、絵を描き直したら測り直すこと。
    shape: { kind: "octagon", cx: 51.62, cy: 50.81, r: 45 },
  },
};

// 八角形（頂点が 22.5°+45°k ＝ 上下左右と斜めに「辺」が来る向き）の、ある高さでの半幅。
// 単位はすべて cqw（カード幅に対する%）。shape が無い／範囲外なら null を返す。
//   |dy| ≦ R sin22.5  … 左右の平らな辺の区間（半幅は最大の R cos22.5）
//   R sin22.5 < |dy| ≦ R cos22.5 … 45°の斜辺（半幅は 1 ずつ減る）
// 🔴 LAYOUT のエントリには「配置を持つ要素」以外も混ざる（first1st の shape）。
//   CSSの生成とエディタのつまみ作りは**要素だけ**を回すこと。ELEMENT_META に載っているかで判る。
//   ここを通さずに Object.keys(LAYOUT[group]) を回すと、shape を要素と誤解して落ちる。
export function elementSlotsOf(group) {
  const slots = LAYOUT[group] || {};
  const out = {};
  for (const [k, v] of Object.entries(slots)) if (ELEMENT_META[k]) out[k] = v;
  return out;
}

export function shapeHalfWidthAt(shape, y) {
  if (!shape || shape.kind !== "octagon") return null;
  const dy = Math.abs(y - shape.cy);
  const K = Math.cos(Math.PI / 8) * shape.r; // 辺までの距離＝最大半幅
  const S = Math.sin(Math.PI / 8) * shape.r;
  if (dy <= S) return K;
  if (dy > K) return 0;
  return K + S - dy;
}

// カード種別 → レイアウトグループ（通常・エターナルは共通の std）。
export const TYPE_GROUP = { normal: "std", eternal: "std", first: "first", first1st: "first1st" };
// グループ → CSS変数の接頭文字。
const GROUP_LETTER = { std: "s", first: "f", first1st: "f1" };

// 要素 → CSSセレクタ・表示名・種類。effect=マーカー付き効果行, fx=効果セットのコンテナ, ruby=ふりがな。
export const ELEMENT_META = {
  flavor:  { sel: ".card-face-flavor",            labelJa: "フレーバー",       kind: "text" },
  title:   { sel: ".card-face-title",             labelJa: "タイトル",         kind: "text" },
  ruby:    { sel: ".card-face-title rt",          labelJa: "ふりがな(ルビ)",   kind: "ruby" },
  sub:     { sel: ".card-face-subtitle",          labelJa: "能力名《》",       kind: "text" },
  basic:   { sel: ".card-face-effect.is-basic",   labelJa: "★基本効果",       kind: "effect" },
  arrival: { sel: ".card-face-effect.is-arrival", labelJa: "●到達効果",       kind: "effect" },
  hand:    { sel: ".card-face-effect.is-hand",    labelJa: "■手札効果",       kind: "effect" },
  handcost:{ sel: ".card-face-effect.is-hand-cost", labelJa: "手札効果の【追色】部分", kind: "effect" },
  handicon:{ sel: ".card-face-hand-icon",         labelJa: "■アイコン（手札効果）", kind: "iconpos", sLabel: "大きさ" },
  fx:      { sel: ".card-face-fx",                labelJa: "効果（基本/到達/手札）", kind: "fx" },
  fxbasic: { sel: ".card-face-fx .card-face-effect.is-basic", labelJa: "★基本効果（サイズ・幅・左位置）", kind: "size", sLabel: "文字サイズ" },
  icon:    { sel: ".card-face-marker",            labelJa: "アイコンのサイズ", kind: "iconsize", sLabel: "大きさ" },
  gap:     { sel: ".card-face-effect",            labelJa: "アイコン→文の間隔", kind: "gap", sLabel: "間隔" },
};

export const TYPE_LABEL = { normal: "通常", eternal: "エターナル", first: "ファースト", first1st: "ファースト（1st）" };
// エディタでグループを説明する見出し。
export const GROUP_LABEL = {
  std: "通常／エターナル（共通）",
  first: "ファースト",
  first1st: "1st EDITION ファースト",
};

export function cardTypeOf(cardId) {
  // 🔴 "first-1st-" は "first-" でも始まるので、**必ず先に**見る。順番を入れ替えると
  //   1st のファーストがリメイクのファーストの配置に吸われる。
  if (cardId?.startsWith("first-1st-")) return "first1st";
  if (cardId?.startsWith("first-")) return "first";
  if (cardId?.startsWith("eternal-")) return "eternal";
  return "normal";
}
export function groupOf(cardId) { return TYPE_GROUP[cardTypeOf(cardId)]; }

// CSS変数名: --cf-{s|f}-{element}-{x|y|w|s|oy}
export function cfVar(group, el, prop) {
  return `--cf-${GROUP_LETTER[group]}-${el}-${prop}`;
}

// その要素で調整するプロパティ（既定は x/y/w/s。ルビ等は config の props で上書き）。
export function propsFor(slot) {
  return slot?.props || ["x", "y", "w", "s"];
}

// エディタのスライダー範囲。
export const PROP_RANGE = {
  x:  { min: 0,   max: 95, step: 0.5, unit: "cqw", label: "左位置(X)" },
  y:  { min: 0,   max: 95, step: 0.5, unit: "cqw", label: "上位置(Y)" },
  w:  { min: 20,  max: 98, step: 0.5, unit: "cqw", label: "幅" },
  s:  { min: 1.0, max: 9,  step: 0.1, unit: "cqw", label: "文字サイズ" },
  oy: { min: -4,  max: 4,  step: 0.1, unit: "cqw", label: "上下微調整" },
  mx: { min: -30, max: 30, step: 0.5, unit: "cqw", label: "左位置(ずらし)" },
};
