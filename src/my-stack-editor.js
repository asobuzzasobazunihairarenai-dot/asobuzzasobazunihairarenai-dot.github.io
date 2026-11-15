// 「マイ山札」の編集画面（2026-11-15・続き725）。
//
// 🔴 作りの芯は src/my-stack.js の冒頭に書いてある。ここは**見せ方と押し方**だけ。
//
// ■ 画面の形
//   左に色のタブ（10色・「14 / 14」の数えつき）、右にその色の札の行（− n ＋）。
//   色ごとの枠は標準と同じなので、**足せば他を減らすしかない**——それが分かる見せ方にした。
//
// ⚠ **色は決め打ちしない**（教訓15。このアプリは明暗2テーマある）。
//   地と文字色はパネル側から継ぎ、違いは枠・太さ・不透明度で出す。
//   色の点だけは「カードの色」そのものなのでテーマに依らない。
// ⚠ 大きさは rem（ステージ1600x900 基準）。スマホ横（932x430）では倍率 0.478 なので、
//   読ませたい字は 1.6rem 以上・押す所は 2rem 以上を目安にしてある。

import { MY_STACK_SETS, getCardDefinition, getCardImagePath, hasNoPrintedFace } from "./cards-data.js";
import {
  MY_STACK_COLOR_ORDER,
  candidatesByColor,
  colorQuotaOf,
  defaultRecipeOf,
  randomRecipeOf,
  validateMyStack,
  isMyStackEnabled,
  setMyStackEnabled,
  getMyStackRecipe,
  setMyStackRecipe,
} from "./my-stack.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { getCardName } from "./card-text.js";
import { t } from "./ui-text.js";
import { showCardFace } from "./card-face-display.js";

// 色の点に使う hex（カードの色そのもの。board-3d.js の七色と同じ値）。
const COLOR_HEX = {
  red: "#c70025",
  orange: "#ee781f",
  yellow: "#fabe00",
  green: "#22ac38",
  blue: "#1bb8ce",
  pink: "#f19ec2",
  purple: "#915da3",
  rainbow: "linear-gradient(135deg,#c70025,#ee781f,#fabe00,#22ac38,#1bb8ce,#f19ec2,#915da3)",
  white: "#f2f2f2",
  black: "#2b2b2b",
};

// 「どこまで選ばせるか」はここが決める（my-stack.js は葉なので管理者判定を持てない）。
// 🔴 0th拡張・1st EDITION は**まだ公開していない**（カードセットの選択自体が管理者だけ）。
//   遊んでいる人に未公開の札を並べないよう、**既定ではリメイクの33種だけ**を候補にする。
//   ⓘ それでも選ぶ余地はちゃんとある——1色14枚を2種で分けるので、7/7 のほかに
//     10/4・12/2 のような偏らせ方ができる（引き味が変わる）。
let 全部見せる = false;
export function setMyStackShowAllSets(b) {
  全部見せる = !!b;
}
function 候補のセット() {
  return 全部見せる ? MY_STACK_SETS : [MY_STACK_SETS[0]];
}
function 標準の表() {
  return MY_STACK_SETS[0];
}

function cardDisplayName(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}

let panel = null;
let backdrop = null;
let 開いている色 = "red";
let 下書き = {};
let 再描画 = () => {};

function 丸(color, size) {
  const dot = document.createElement("span");
  dot.className = "my-stack-dot";
  dot.style.width = size;
  dot.style.height = size;
  dot.style.background = COLOR_HEX[color] || "#888";
  return dot;
}

function 色タブを組む() {
  const wrap = document.createElement("div");
  wrap.className = "my-stack-rail";
  const quota = colorQuotaOf(標準の表());
  const cands = candidatesByColor(候補のセット(), 標準の表());
  const 検査 = validateMyStack(下書き, 候補のセット(), 標準の表());
  for (const color of MY_STACK_COLOR_ORDER) {
    if (!(color in quota)) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-rail-btn";
    b.dataset.color = color;
    if (color === 開いている色) b.classList.add("is-on");
    const 情報 = 検査.perColor[color];
    if (情報 && !情報.ok) b.classList.add("is-off-balance");
    b.appendChild(丸(color, "0.9rem"));
    const name = document.createElement("span");
    name.className = "my-stack-rail-name";
    name.textContent = t(`mystack.color.${color}`);
    b.appendChild(name);
    const n = document.createElement("span");
    n.className = "my-stack-rail-count";
    n.textContent = `${情報?.total ?? 0} / ${quota[color]}`;
    b.appendChild(n);
    // 選ぶ余地が無い色（候補が1種類だけ＝なないろの欠片）は押しても何も変わらないと分かるように。
    if ((cands.get(color) || []).length <= 1) b.classList.add("is-fixed");
    b.addEventListener("click", () => {
      開いている色 = color;
      再描画();
    });
    wrap.appendChild(b);
  }
  return wrap;
}

function 札の行を組む(c, quota) {
  const row = document.createElement("div");
  row.className = "my-stack-card-row";

  const face = document.createElement("div");
  face.className = "my-stack-card-face";
  // 【#660 と同じ扱い】文字を焼き込んだ絵を持たない札（0th拡張・1st）は、
  //   アプリがカード面を組み立てる（絵だけ敷くと効果欄が真っ白になる）。
  if (hasNoPrintedFace(c.id)) {
    showCardFace(face, c.id, null);
  } else {
    const img = document.createElement("img");
    img.src = getCardImagePath(c.id);
    img.alt = cardDisplayName(c.id);
    img.loading = "lazy";
    face.appendChild(img);
  }
  row.appendChild(face);

  const name = document.createElement("div");
  name.className = "my-stack-card-name";
  name.textContent = cardDisplayName(c.id);
  row.appendChild(name);

  const max = document.createElement("div");
  max.className = "my-stack-card-max";
  // 上限と、実物に刷られている枚数の両方を出す（情報を消さない＝my-stack.js の判断の記録）。
  max.textContent =
    c.printed === c.max
      ? t("mystack.max", { n: c.max })
      : t("mystack.maxPrinted", { n: c.max, printed: c.printed });
  row.appendChild(max);

  const stepper = document.createElement("div");
  stepper.className = "my-stack-stepper";
  const 現在 = Math.min(Math.floor(Number(下書き[c.id]) || 0), c.max);
  const 色の合計 = () => {
    let s = 0;
    for (const x of candidatesByColor(候補のセット(), 標準の表()).get(c.color) || []) {
      s += Math.min(Math.floor(Number(下書き[x.id]) || 0), x.max);
    }
    return s;
  };
  // − と ＋ の間に今の枚数を置く。素直に3つ並べる（押せない時は disabled にして理由が
  // 分かるようにする＝枠がいっぱい／上限／0枚）。
  const minus = 作る("−", -1);
  stepper.appendChild(minus);
  const 数 = document.createElement("span");
  数.className = "my-stack-step-n";
  数.textContent = String(現在);
  stepper.appendChild(数);
  stepper.appendChild(作る("＋", +1));

  function 作る(記号, 差) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-step-btn";
    b.textContent = 記号;
    const 次 = 現在 + 差;
    // 色ごとの合計は固定なので、枠がいっぱいならもう足せない（他を減らしてから）。
    if (次 < 0 || 次 > c.max || (差 > 0 && 色の合計() >= quota)) b.disabled = true;
    b.addEventListener("click", () => {
      const now = Math.min(Math.floor(Number(下書き[c.id]) || 0), c.max) + 差;
      if (now <= 0) delete 下書き[c.id];
      else 下書き[c.id] = now;
      setMyStackRecipe(下書き);
      再描画();
    });
    return b;
  }
  row.appendChild(stepper);
  if (現在 === 0) row.classList.add("is-unused");
  return row;
}

function 中身を組む() {
  const body = document.createElement("div");
  body.className = "my-stack-body";
  body.appendChild(色タブを組む());

  const right = document.createElement("div");
  right.className = "my-stack-cards";
  const quota = colorQuotaOf(標準の表())[開いている色] ?? 0;
  const 検査 = validateMyStack(下書き, 候補のセット(), 標準の表());
  const 情報 = 検査.perColor[開いている色];

  const head = document.createElement("div");
  head.className = "my-stack-cards-head";
  head.appendChild(丸(開いている色, "1.1rem"));
  const headName = document.createElement("span");
  headName.className = "my-stack-cards-head-name";
  headName.textContent = t(`mystack.color.${開いている色}`);
  head.appendChild(headName);
  const headN = document.createElement("span");
  headN.className = "my-stack-cards-head-n";
  headN.textContent = t("mystack.colorTotal", { n: 情報?.total ?? 0, quota });
  if (情報 && !情報.ok) headN.classList.add("is-off-balance");
  head.appendChild(headN);
  right.appendChild(head);

  const cands = candidatesByColor(候補のセット(), 標準の表()).get(開いている色) || [];
  if (cands.length <= 1) {
    const only = document.createElement("div");
    only.className = "my-stack-note";
    only.textContent = t("mystack.onlyOneKind");
    right.appendChild(only);
  }
  for (const c of cands) right.appendChild(札の行を組む(c, quota));

  // この色が揃っていない時だけ、何が起きるかをその場で言う（黙って標準に戻すと分からない）。
  if (情報 && !情報.ok) {
    const warn = document.createElement("div");
    warn.className = "my-stack-note is-warn";
    warn.textContent = t("mystack.colorNotBalanced", { quota });
    right.appendChild(warn);
  }
  body.appendChild(right);
  return body;
}

function 上の行を組む() {
  const row = document.createElement("div");
  row.className = "my-stack-toprow";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "my-stack-toggle";
  toggle.classList.toggle("is-on", isMyStackEnabled());
  toggle.textContent = isMyStackEnabled() ? t("mystack.onNow") : t("mystack.offNow");
  toggle.addEventListener("click", () => {
    setMyStackEnabled(!isMyStackEnabled());
    再描画();
  });
  row.appendChild(toggle);

  const actions = document.createElement("div");
  actions.className = "my-stack-actions";
  for (const [key, fn] of [
    ["mystack.resetToDefault", () => defaultRecipeOf(標準の表())],
    ["mystack.random", () => randomRecipeOf(候補のセット(), 標準の表())],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-action-btn";
    b.textContent = t(key);
    b.addEventListener("click", () => {
      下書き = fn();
      setMyStackRecipe(下書き);
      再描画();
    });
    actions.appendChild(b);
  }
  row.appendChild(actions);
  return row;
}

function buildPanel(close) {
  const p = document.createElement("div");
  p.id = "my-stack-panel";

  const back = document.createElement("button");
  back.id = "my-stack-back";
  back.textContent = t("common.back");
  back.addEventListener("click", close);
  p.appendChild(back);

  const title = document.createElement("div");
  title.id = "my-stack-title";
  title.textContent = t("mystack.title");
  p.appendChild(title);

  const closeX = createModalCloseX(close);
  // この画面は全画面＋縦スクロールなので、✕ は貼り付けたままにする（#641 と同じ）。
  closeX.style.position = "fixed";
  p.appendChild(closeX);

  const hint = document.createElement("div");
  hint.id = "my-stack-hint";
  hint.textContent = t("mystack.hint");
  p.appendChild(hint);

  const inner = document.createElement("div");
  inner.id = "my-stack-inner";
  p.appendChild(inner);

  再描画 = () => {
    inner.textContent = "";
    inner.appendChild(上の行を組む());
    inner.appendChild(中身を組む());
  };
  再描画();
  return p;
}

export function openMyStackEditor() {
  下書き = getMyStackRecipe();
  // 初めて開いた時は標準の山札から始める（空から組ませない＝112枚を手で埋めるのは無理）。
  if (Object.keys(下書き).length === 0) {
    下書き = defaultRecipeOf(標準の表());
    setMyStackRecipe(下書き);
  }
  if (!panel) {
    const close = () => {
      if (!panel) return;
      panel.style.display = "none";
      backdrop.style.display = "none";
    };
    backdrop = createBackdrop(close, { dim: true, zIndex: 2400, blocksGame: false });
    panel = buildPanel(close);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  } else {
    再描画();
  }
  backdrop.style.display = "block";
  panel.style.display = "block";
  panel.scrollTop = 0;
}
