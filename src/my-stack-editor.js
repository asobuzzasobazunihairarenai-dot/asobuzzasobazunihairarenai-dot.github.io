// 「マイ山札」の編集画面（2026-11-15・続き725 →🔴 続き726 で公式ルールどおりに作り直し）。
//
// 🔴 ルールの芯は src/my-stack.js の冒頭に書いてある（公開されている山札カスタマイズルール）。
//   ここは**見せ方と押し方**だけ。
//
// ■ 画面の形
//   左にグループの列（7色＋虹＋**無色**の9つ・「14 / 14」の数えつき）、右にその札の行（− n ＋）。
//   枠は固定なので、**足せば他を減らすしかない**——それが分かる見せ方にした。
//   ⚠ 無色だけは「**7枚以下**」なので、少ないままでも正しい（警告を出さない）。
//
// ⚠ **色は決め打ちしない**（教訓15。このアプリは明暗2テーマある）。
//   地と文字色はパネル側から継ぎ、違いは枠・太さ・不透明度で出す。
//   色の点だけは「カードの色」そのものなのでテーマに依らない。
// ⚠ 大きさは rem（ステージ1600x900 基準）。スマホ横（932x430）は倍率 0.478 なので、
//   読ませたい字は実画面 11px 以上・押す所は 28px 以上になるよう style.css 側で上げてある。

import { MY_STACK_SETS, getCardDefinition, getCardImagePath, hasNoPrintedFace } from "./cards-data.js";
import {
  COLORLESS,
  MY_STACK_GROUP_ORDER,
  candidatesByGroup,
  defaultRecipeOf,
  groupQuotaOf,
  randomRecipeOf,
  validateMyStack,
  isMyStackEnabled,
  setMyStackEnabled,
  getMyStackRecipe,
  setMyStackRecipe,
  // 【#688・続き740】複数のマイ山札
  MAX_MY_STACKS,
  getMyStacks,
  getSelectedStackId,
  selectMyStack,
  createMyStack,
  renameMyStack,
  setMyStackSkin,
  deleteMyStack,
} from "./my-stack.js";
// 🔴【続き835】箱の絵（スキン）を選ぶ画面。
import { openStackSkinPicker } from "./my-stack-skin-picker.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { getCardName } from "./card-text.js";
import { t } from "./ui-text.js";
import { showCardFace } from "./card-face-display.js";
// 【続き737】候補の札も、ホバー（スマホは長押し）で拡大して読めるように。
import { attachCardHoverPreview } from "./card-hover-preview.js";
// 【続き726→728】パックで手に入れた札と、その**所持枚数**。
//   card-packs.js は online.js を import しない葉なので循環しない。
import { copiesOf } from "./card-packs.js";

// 色の点に使う hex（カードの色そのもの。board-3d.js の七色と同じ値）。
const COLOR_HEX = {
  red: "#c70025",
  orange: "#ee781f",
  yellow: "#fabe00",
  green: "#22ac38",
  blue: "#1bb8ce",
  pink: "#f19ec2",
  purple: "#915da3",
  white: "#f2f2f2",
  black: "#2b2b2b",
  rainbow: "linear-gradient(135deg,#c70025,#ee781f,#fabe00,#22ac38,#1bb8ce,#f19ec2,#915da3)",
  // 無色は白と黒の2色なので、点も半分ずつにする。
  [COLORLESS]: "linear-gradient(135deg,#f2f2f2 50%,#2b2b2b 50%)",
};

// 🔴【続き726】候補は「**リメイクの33種 ＋ パックで手に入れた札**」。
//   公式ルールの前書きどおり、山札カスタマイズは「**他のエディションや拡張パックのカードを
//   混ぜて**自分だけの山札にする」遊び方。だから**持っている札が増えたぶんだけ選べる幅が増える**
//   のが正しい形で、パック開封（src/card-packs.js）とセットで初めて意味を持つ。
//   ⓘ リメイクの33種は**最初から全員が持っている**（標準の山札そのもの）。
//   ⚠ だから1枚もパックを開けていない人には、今までどおりリメイクの33種だけが並ぶ
//     ＝**未公開の札が勝手に見えることはない**。
//   ⚠ それでも**無色（7枚以下）は1セットでも選べる**（公式ルール①）。
function 候補のセット() {
  const 既定 = MY_STACK_SETS[0];
  const 手に入れた = MY_STACK_SETS.slice(1).map((list) => list.filter((c) => copiesOf(c.id, true) > 0));
  return [既定, ...手に入れた.filter((l) => l.length > 0)];
}
// ⚠ 続き725 で置いた「全部見せる」の入口。パックに替えたので**何もしない**
//   （呼び出し側を一度に直さなくて済むように残す＝公開済みの口は黙って消さない）。
export function setMyStackShowAllSets() {}
function 標準の表() {
  return MY_STACK_SETS[0];
}

// 🔴【続き728】ユーザー判断「**マイ山札に7枚入れるには、その札を7枚持っている必要がある**」
//   （MTGA 方式）。⇒ 1種類の上限は「**公式ルールの上限**（ノーマル7・ONLY1）と
//   **持っている枚数**の小さい方」。
//   ⓘ リメイクの33種は**最初から上限まで持っている扱い**なので、ここは今までどおり動く
//     （copiesOf の第2引数が false ＝ 拡張ではない ⇒ 常に上限を返す）。
//   ⚠ my-stack.js（ルールの側）はこれを知らない。あちらは**公式ルールだけ**を見る葉で、
//     持ち物はこの画面が縛る——所持枚数は**減ることがない**ので、ここで縛れば
//     保存された組み方が後から不正になることはない。
function 拡張か(cardId) {
  return MY_STACK_SETS.slice(1).some((list) => list.some((c) => c.id === cardId));
}
function 持ち物で縛る(c) {
  const 拡張 = 拡張か(c.id);
  const 持ち = copiesOf(c.id, 拡張);
  return { ...c, 拡張, 持ち, max: Math.min(c.max, 持ち) };
}
function 候補を縛る(list) {
  return (list || []).map(持ち物で縛る);
}

function cardDisplayName(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}

// 🔴【#688・続き740】ユーザー要望「**持っているカードだけ表示などもできるように**」。
//   ⚠ 既定は**オフ**——0枚の札も見えている方が「何を集めればいいか」が分かる。
//     ただし札が増えるほど並びが長くなるので、**畳める口**を用意する。
//   ⚠ リメイクの33種は最初から上限まで持っているので、この絞り込みでは消えない。
const 所持のみKEY = "so7-my-stack-owned-only";
let 所持のみ = false;
try {
  所持のみ = localStorage.getItem(所持のみKEY) === "1";
} catch (e) {
  /* 読めなくても既定（オフ）で困らない */
}
function 所持のみを設定(b) {
  所持のみ = !!b;
  try {
    localStorage.setItem(所持のみKEY, 所持のみ ? "1" : "0");
  } catch (e) {
    /* 覚えられなくても、そのセッションの間は効く */
  }
}

let panel = null;
let backdrop = null;
let 開いているグループ = "red";
let 下書き = {};
let 再描画 = () => {};

function 丸(key, size) {
  const dot = document.createElement("span");
  dot.className = "my-stack-dot";
  dot.style.width = size;
  dot.style.height = size;
  dot.style.background = COLOR_HEX[key] || "#888";
  return dot;
}

function 数えの文(情報) {
  if (!情報) return "";
  return 情報.exact
    ? t("mystack.groupTotal", { n: 情報.total, quota: 情報.quota })
    : t("mystack.groupTotalAtMost", { n: 情報.total, quota: 情報.quota });
}

function グループの列を組む() {
  const wrap = document.createElement("div");
  wrap.className = "my-stack-rail";
  const quota = groupQuotaOf(標準の表());
  const cands = candidatesByGroup(候補のセット());
  const 検査 = validateMyStack(下書き, 候補のセット(), 標準の表());
  for (const g of MY_STACK_GROUP_ORDER) {
    if (!(g in quota)) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-rail-btn";
    b.dataset.group = g;
    if (g === 開いているグループ) b.classList.add("is-on");
    const 情報 = 検査.perGroup[g];
    if (情報 && !情報.ok) b.classList.add("is-off-balance");
    b.appendChild(丸(g, "0.9rem"));
    const name = document.createElement("span");
    name.className = "my-stack-rail-name";
    name.textContent = t(`mystack.group.${g}`);
    b.appendChild(name);
    const n = document.createElement("span");
    n.className = "my-stack-rail-count";
    n.textContent = 情報
      ? `${情報.total} / ${情報.quota}` + (情報.exact ? "" : t("mystack.orLess"))
      : "";
    b.appendChild(n);
    // 選ぶ余地が無いグループ（候補が1種類だけ＝なないろの欠片）は押しても何も変わらないと分かるように。
    if ((cands.get(g) || []).length <= 1) b.classList.add("is-fixed");
    b.addEventListener("click", () => {
      開いているグループ = g;
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
  attachCardHoverPreview(face, c.id); // 【続き737】ホバー／長押しで拡大
  row.appendChild(face);

  const name = document.createElement("div");
  name.className = "my-stack-card-name";
  // 無色のグループでは、白か黒かが行だけでは分からないので点を添える。
  if (c.group === COLORLESS) {
    name.appendChild(丸(c.color, "0.7rem"));
    name.appendChild(document.createTextNode(" "));
  }
  name.appendChild(document.createTextNode(cardDisplayName(c.id)));
  row.appendChild(name);

  const max = document.createElement("div");
  max.className = "my-stack-card-max";
  // ONLYカードは理由が分かるように名指しする（「なぜ1枚だけ？」が一番出る所）。
  // 🔴 拡張の札は「**持っている枚数**／上限」を出す（なぜ7枚入れられないのかが分かるように）。
  //   リメイクの33種は最初から上限まで持っているので、今までどおり印刷枚数を添える。
  max.textContent = c.拡張
    ? t("mystack.owned", { n: c.持ち, max: c.only ? 1 : 7 })
    : c.only
      ? t("mystack.onlyCard")
      : t("mystack.maxPrinted", { n: c.max, printed: c.printed });
  row.appendChild(max);

  const stepper = document.createElement("div");
  stepper.className = "my-stack-stepper";
  const 現在 = Math.min(Math.floor(Number(下書き[c.id]) || 0), c.max);
  const グループの合計 = () => {
    let s = 0;
    for (const x of 候補を縛る(candidatesByGroup(候補のセット()).get(c.group))) {
      s += Math.min(Math.floor(Number(下書き[x.id]) || 0), x.max);
    }
    return s;
  };
  function 作る(記号, 差) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-step-btn";
    b.textContent = 記号;
    const 次 = 現在 + 差;
    // 枠の合計は超えられない（7色・虹はちょうど、無色は7枚以下）。他を減らしてから。
    if (次 < 0 || 次 > c.max || (差 > 0 && グループの合計() >= quota)) b.disabled = true;
    b.addEventListener("click", () => {
      const now = Math.min(Math.floor(Number(下書き[c.id]) || 0), c.max) + 差;
      if (now <= 0) delete 下書き[c.id];
      else 下書き[c.id] = now;
      setMyStackRecipe(下書き);
      再描画();
    });
    return b;
  }
  stepper.appendChild(作る("−", -1));
  const 数 = document.createElement("span");
  数.className = "my-stack-step-n";
  数.textContent = String(現在);
  stepper.appendChild(数);
  stepper.appendChild(作る("＋", +1));
  row.appendChild(stepper);
  if (現在 === 0) row.classList.add("is-unused");
  return row;
}

function 中身を組む() {
  const body = document.createElement("div");
  body.className = "my-stack-body";
  body.appendChild(グループの列を組む());

  const right = document.createElement("div");
  right.className = "my-stack-cards";
  const q = groupQuotaOf(標準の表())[開いているグループ];
  const 検査 = validateMyStack(下書き, 候補のセット(), 標準の表());
  const 情報 = 検査.perGroup[開いているグループ];

  const head = document.createElement("div");
  head.className = "my-stack-cards-head";
  head.appendChild(丸(開いているグループ, "1.1rem"));
  const headName = document.createElement("span");
  headName.className = "my-stack-cards-head-name";
  headName.textContent = t(`mystack.group.${開いているグループ}`);
  head.appendChild(headName);
  const headN = document.createElement("span");
  headN.className = "my-stack-cards-head-n";
  headN.textContent = 数えの文(情報);
  if (情報 && !情報.ok) headN.classList.add("is-off-balance");
  head.appendChild(headN);
  right.appendChild(head);

  const 全部 = 候補を縛る(candidatesByGroup(候補のセット()).get(開いているグループ));
  // 🔴【#688】「持っているカードだけ表示」。**いま入れている札は 0枚でも消さない**
  //   （消すと「減らす」ができなくなる＝袋小路になる）。
  const cands = 所持のみ ? 全部.filter((c) => c.持ち > 0 || (Number(下書き[c.id]) || 0) > 0) : 全部;
  if (所持のみ && 全部.length > cands.length) {
    const n = document.createElement("div");
    n.className = "my-stack-note";
    n.textContent = t("mystack.hiddenByFilter", { n: 全部.length - cands.length });
    right.appendChild(n);
  }
  if (cands.length <= 1) {
    const only = document.createElement("div");
    only.className = "my-stack-note";
    only.textContent = t("mystack.onlyOneKind");
    right.appendChild(only);
  }
  for (const c of cands) right.appendChild(札の行を組む(c, q?.n ?? 0));

  // 揃っていない時だけ、何が起きるかをその場で言う（黙って標準に戻すと分からない）。
  // ⚠ 無色は「7枚以下」なので、少ないのは**正しい**＝警告を出さない。
  if (情報 && !情報.ok) {
    const warn = document.createElement("div");
    warn.className = "my-stack-note is-warn";
    warn.textContent = 情報.exact
      ? t("mystack.groupNotBalanced", { quota: 情報.quota })
      : t("mystack.groupTooMany", { quota: 情報.quota });
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
  // 🔴【#688】「持っているカードだけ表示」。
  const only = document.createElement("button");
  only.type = "button";
  only.className = "my-stack-action-btn" + (所持のみ ? " is-on" : "");
  only.textContent = 所持のみ ? t("mystack.ownedOnlyOn") : t("mystack.ownedOnlyOff");
  only.addEventListener("click", () => {
    所持のみを設定(!所持のみ);
    再描画();
  });
  actions.appendChild(only);

  row.appendChild(actions);
  return row;
}

// 🔴【#688・続き740】山札の切り替え（マイデッキと同じく**複数**持てる）。
//   ⚠ 名前は空でもよい（既定の名前を出す）。**最後の1つは消せない**。
function 既定の名前(i) {
  return t("mystack.defaultName", { n: i + 1 });
}
function 山札の列を組む() {
  const row = document.createElement("div");
  row.className = "my-stack-tabs";
  const 一覧 = getMyStacks();
  const 選択 = getSelectedStackId();
  一覧.forEach((st, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "my-stack-tab" + (st.id === 選択 ? " is-on" : "");
    b.textContent = st.name || 既定の名前(i);
    b.addEventListener("click", () => {
      if (st.id === 選択) return;
      selectMyStack(st.id);
      下書き = getMyStackRecipe();
      if (Object.keys(下書き).length === 0) {
        下書き = defaultRecipeOf(標準の表());
        setMyStackRecipe(下書き);
      }
      再描画();
    });
    row.appendChild(b);
  });
  if (一覧.length < MAX_MY_STACKS) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "my-stack-tab is-add";
    add.textContent = t("mystack.newStack");
    add.addEventListener("click", () => {
      // 新しい山札は**標準の山札から**始める（空から112枚を手で埋めるのは無理）。
      createMyStack(既定の名前(getMyStacks().length), defaultRecipeOf(標準の表()));
      下書き = getMyStackRecipe();
      再描画();
    });
    row.appendChild(add);
  }
  const 手 = document.createElement("div");
  手.className = "my-stack-tabs-tools";
  const ren = document.createElement("button");
  ren.type = "button";
  ren.className = "my-stack-tab-tool";
  ren.textContent = t("mystack.rename");
  ren.addEventListener("click", () => {
    const i = 一覧.findIndex((x) => x.id === 選択);
    const 今 = i >= 0 ? 一覧[i].name || 既定の名前(i) : "";
    const 次 = window.prompt(t("mystack.renamePrompt"), 今);
    if (次 === null) return;
    renameMyStack(選択, 次.trim());
    再描画();
  });
  手.appendChild(ren);

  // 🔴【続き835】箱の絵（スキン）。ユーザー案「好きなカードのイラストを箱のスキンとして設定」。
  //   ⚠ 候補は**この山札に入っているカード**（「この山札の顔」を選ぶ意味がそのまま通る）。
  //     まだ空の時だけ標準の表から選ばせる（選べない画面を出さない＝#729 の家族）。
  const skin = document.createElement("button");
  skin.type = "button";
  skin.className = "my-stack-tab-tool";
  skin.textContent = t("mystack.skin.button");
  skin.addEventListener("click", () => {
    const 中身 = Object.keys(下書き || {}).filter((id) => (下書き[id] || 0) > 0);
    const 候補 = 中身.length ? 中身 : 標準の表().map((c) => c.id);
    const いま = 一覧.find((x) => x.id === 選択)?.skin || "";
    openStackSkinPicker({
      候補,
      いま,
      onPick: (id) => {
        setMyStackSkin(選択, id);
        再描画();
      },
    });
  });
  手.appendChild(skin);

  if (一覧.length > 1) {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "my-stack-tab-tool";
    del.textContent = t("mystack.deleteStack");
    del.addEventListener("click", () => {
      const i = 一覧.findIndex((x) => x.id === 選択);
      const 名 = i >= 0 ? 一覧[i].name || 既定の名前(i) : "";
      if (!window.confirm(t("mystack.deleteConfirm", { name: 名 }))) return;
      deleteMyStack(選択);
      下書き = getMyStackRecipe();
      再描画();
    });
    手.appendChild(del);
  }
  row.appendChild(手);
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
    inner.appendChild(山札の列を組む());
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
    // 🔴【続き734】パネル(2661)と一緒に上げる。覆いだけ下に残すと、マイページが
    //   覆いの上に出てしまい「後ろに開いた」のと同じ見え方になる。
    backdrop = createBackdrop(close, { dim: true, zIndex: 2660, blocksGame: false });
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
