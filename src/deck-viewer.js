// 「山札一覧」: テキストデータ(cards-data.js)と実際のカード画像(assets/cards/)がちゃんと
// 紐づいているかを目視確認するためのデバッグ用ビューア。通常カード・エターナルカード・
// ファーストカードそれぞれのタイトル・画像・枚数をグリッドで一覧表示し、タイルをクリックすると
// カードの拡大画像とルール補足テキストをまとめたモーダルが開く。管理者モードと同様、
// ゲーム本編のUIではなく開発用ツール。

import {
  NORMAL_CARDS,
  FIRST_CARDS,
  getEternalCards,
  // 【続き722】対局中の山札一覧は「実際にこの対局で使う山の中身」を出す。
  getDeckNormalCards,
  getCardImagePath,
  getCardDefinition,
  // 【#660】「文字を焼き込んだ絵を持たない」札（0th拡張・1st EDITION）の判定。
  hasNoPrintedFace,
} from "./cards-data.js";
// 0th拡張（管理者だけのテストモード）。どちらも import を持たない葉なので循環しない。
import { EX0_NORMAL_CARDS } from "./cards-data-ex0.js";
import { FIRST_ED_NORMAL_CARDS, FIRST_ED_FIRST_CARDS } from "./cards-data-1st.js";
import { OLD0TH_NORMAL_CARDS } from "./cards-data-0th.js";
import { CF_NORMAL_CARDS } from "./cards-data-cf.js"; // 0thリメイクの限定カード（志炎者7枚・続き782）
import { getCardSet, CARD_SETS } from "./card-set.js";
import { showCardFace } from "./card-face-display.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { getCardName, getCardNote } from "./card-text.js"; // UI英語化フェーズ12: 表示用のカード名・補足
import { t } from "./ui-text.js"; // UI英語化フェーズ12
// 【続き722】対局中かどうか（席が決まっていれば対局中）。state.js は葉なので循環しない。
import { getState } from "./state.js";
import { sortCardDefsByColor } from "./card-sort.js";

// 表示用カード名（英語なら英語名、日本語ならcards-data.jsの名前）。
function cardDisplayName(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || "";
}

let showCardModal = null; // initDeckViewer内で実体を設定する

// ユーザー要望「山札一覧でホバーや長押しでカードを拡大表示できるように」。盤面の#card-preview
// とは別に、山札一覧（全画面パネル）専用の大きな拡大プレビューを持つ。ホバー（PC）と長押し
// （スマホ）で表示し、離すと消える。クリックは従来通り補足テキスト付きモーダル(showCardModal)。
let deckPreviewEl = null;
function getDeckPreviewEl() {
  if (!deckPreviewEl) {
    deckPreviewEl = document.createElement("div");
    deckPreviewEl.id = "deck-viewer-card-preview";
    deckPreviewEl.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(26rem, 82vw); max-height: 88vh; aspect-ratio: 1 / 1;
      overflow: hidden; background-size: cover; background-position: center; background-repeat: no-repeat;
      border-radius: 0.6rem; border: 2px solid rgba(255, 255, 255, 0.75);
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.75); pointer-events: none;
      z-index: 2300; display: none;
    `;
    document.body.appendChild(deckPreviewEl);
  }
  return deckPreviewEl;
}
function showDeckPreview(def) {
  const el = getDeckPreviewEl();
  showCardFace(el, def.id, getCardImagePath(def.id));
  el.setAttribute("aria-label", cardDisplayName(def.id));
  el.style.display = "block";
}
function hideDeckPreview() {
  if (deckPreviewEl) deckPreviewEl.style.display = "none";
}

// 🔴【続き722】ユーザー指示「**対局中の基本設定内のカード一覧は山札一覧にしよう。
//   実際に今の対局で使用している山札の中身を枚数入りで表示。いつものホーム画面の図鑑の
//   時のカード一覧は今のままでいいです。**」
//   ⇒ 同じ一覧を2つの顔で出す。対局中は**その対局の山の中身＋枚数**、それ以外は今までどおり。
//   ⓘ 出すのは「山をどう組んだか（種類と枚数）」であって、**残り枚数ではない**。
//     山は裏向きなので、残りが見えると引かれた札が分かってしまう＝対局の情報が変わる。
export function isDeckListMode() {
  try {
    // ⚠ state に turn という欄は無い（実際のブラウザで確かめた）。対局が始まっているかは
    //   **activePlayers に席が入っているか**で見る（ホーム画面では空）。
    return (getState().activePlayers || []).length > 0;
  } catch {
    return false;
  }
}
// オプションの項目名とパネルの題。対局中だけ「山札一覧」。
export function deckViewerTitle() {
  return isDeckListMode() ? t("deckviewer.titleDeck") : t("deckviewer.title");
}

function buildCardTile(def, showCount) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.style.cssText = `
    position: relative; display: flex; flex-direction: column; align-items: center;
    gap: 0.2rem; padding: 0.3rem; background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 0.4rem; cursor: pointer;
    font-family: sans-serif; color: #e2e8f0; text-align: center;
  `;

  // 🔴【#660 の続き・2026-11-14（続き716）】ユーザー報告「**拡張と1stの効果文テキストが
  //   表示されてないです**」（山札一覧の画像つき）。
  //   0th拡張・1st EDITION は**文字を焼き込んだ絵を持たない**ので、`getCardImagePath` が返す
  //   のは**文字なしの下地**。通常カードだけ文字が焼かれているため、**並ぶと拡張だけ空っぽ**に見える。
  //   🔴 続き714 でここは「サムネは小さくて読めないから」と**見送ったが、それは判断違いだった**
  //     ——読めるかどうかではなく、**隣と見た目が揃っているか**の問題だった。
  //   ⇒ そういう札は `<img>` ではなく **showCardFace でカード面を組み立てる**
  //     （カード面は入れ物に対する割合で組まれているので、小さくしても崩れない）。
  //   ⚠ 文字を焼き込んだ絵を持つ札（リメイク34種）は**今までどおり img**
  //     ＝一覧に DOM のカード面を大量に作らない（99種ぶん作ると重い）。
  const face = document.createElement("div");
  face.style.cssText = "position: relative; width: 4.2rem; height: 4.2rem; border-radius: 0.25rem; overflow: hidden;";
  if (hasNoPrintedFace(def.id)) {
    showCardFace(face, def.id, null); // アプリが文字を描く
  } else {
    const img = document.createElement("img");
    img.src = getCardImagePath(def.id);
    img.alt = cardDisplayName(def.id);
    img.loading = "lazy";
    img.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";
    face.appendChild(img);
  }
  tile.appendChild(face);

  // 🔴【2026-11-14・続き717】ユーザー指示「**図鑑のここは山札一覧ではなくカード一覧に
  //   しよう。なので中のカードも枚数表示は不要です。**」
  //   ⇒ 「山札に何枚入っているか」の札（×N）は外す。ここは**カードの一覧**であって、
  //     山の中身の話ではない。
  //   ⚠ def.count 自体は残す（山札の構成を作る側＝cards-data.js が使っている）。

  // 【続き722】対局中の山札一覧でだけ、山に何枚入っているかを出す。
  if (showCount && def.count > 0) {
    const n = document.createElement("div");
    n.textContent = t("deckviewer.countN", { n: def.count });
    n.style.cssText =
      "position: absolute; right: 0.25rem; top: 0.25rem; padding: 0 0.3rem; border-radius: 0.6rem;" +
      "background: rgba(15, 23, 32, 0.82); font-size: 0.6rem; line-height: 1.5; font-weight: bold;";
    tile.appendChild(n);
  }

  const name = document.createElement("div");
  name.textContent = cardDisplayName(def.id);
  // 英語のカード名は日本語より長く3行になるものがある（例: Konohanasakuya, the Cherry of Bonds）ため、
  // 2行で切らず3行まで見せる（タイル自体は高さ自動なので他のタイルには影響しない）。
  name.style.cssText = "font-size: 0.6rem; line-height: 1.2; max-height: 3.6em; overflow: hidden;";
  tile.appendChild(name);

  // ホバー（PC）で拡大プレビュー。
  tile.addEventListener("mouseenter", () => showDeckPreview(def));
  tile.addEventListener("mouseleave", hideDeckPreview);

  // 長押し（スマホ）で拡大プレビュー。長押しが発火した後のクリックは、補足モーダルを
  // 開かずプレビューを閉じるだけにする（長押しとタップを区別する）。
  let holdTimer = null;
  let didLongPress = false;
  tile.addEventListener(
    "touchstart",
    () => {
      didLongPress = false;
      holdTimer = setTimeout(() => {
        didLongPress = true;
        showDeckPreview(def);
      }, 300);
    },
    { passive: true }
  );
  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    hideDeckPreview();
  };
  tile.addEventListener("touchend", cancelHold);
  tile.addEventListener("touchmove", cancelHold);
  tile.addEventListener("touchcancel", cancelHold);

  tile.addEventListener("click", () => {
    if (didLongPress) {
      didLongPress = false;
      return; // 長押しプレビュー後のクリックは無視
    }
    hideDeckPreview();
    // 【続き624】拡大モーダルも初めて必要になった時に作る（起動時には作らない）。
    // 🔴 ここで作る形にしておくと、山札一覧を開かずに buildDeckSections() だけを
    //    使う側（図鑑）から押された時も落ちない（元は initDeckViewer で作っていたので
    //    「initDeckViewer後に呼ぶこと」という前提が要っていた）。
    if (!showCardModal) showCardModal = buildCardModal();
    showCardModal(def);
  });

  return tile;
}

function buildSection(title, cardDefs, showCount) {
  const section = document.createElement("div");
  section.style.cssText = "margin-bottom: 0.8rem;";

  const heading = document.createElement("div");
  // 対局中は「何種」ではなく「何種・合計何枚」を出す（山の中身の話なので枚数が主役）。
  const 合計 = cardDefs.reduce((a, c) => a + (c.count > 0 ? c.count : 1), 0);
  heading.textContent = showCount
    ? t("deckviewer.sectionDeck", { title, n: cardDefs.length, total: 合計 })
    : t("deckviewer.section", { title, n: cardDefs.length });
  heading.style.cssText = `
    font-weight: bold; color: #7dd3fc; margin-bottom: 0.4rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.3); padding-bottom: 0.3rem;
    font-family: sans-serif;
  `;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap: 0.5rem;";
  for (const def of cardDefs) {
    grid.appendChild(buildCardTile(def, showCount));
  }
  section.appendChild(grid);
  return section;
}

// タイルクリックで開く、カード拡大画像＋補足テキストのモーダル。
function buildCardModal() {
  const backdrop = document.createElement("div");
  backdrop.id = "deck-card-modal-backdrop";
  backdrop.style.cssText = "position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 2100; display: none;";

  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: min(62rem, calc(94vw / var(--stage-scale, 1)));
    max-height: calc(92vh / var(--stage-scale, 1)); overflow-y: auto;
    background: rgba(15, 23, 32, 0.98); border: 1px solid rgba(148, 163, 184, 0.4);
    border-radius: 0.5rem; padding: 1rem; z-index: 2101;
    font-family: sans-serif; color: #e2e8f0; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    display: none;
  `;

  // 拡大画像の右隣に補足テキストを並べ、縦スクロールをなるべく減らす
  // （狭い画面ではflex-wrapで縦積みにフォールバック）。
  const content = document.createElement("div");
  content.style.cssText = "display: flex; gap: 0.8rem; margin-bottom: 0.8rem; flex-wrap: wrap;";

  const img = document.createElement("div");
  // 🔴【#721】絵を大きくする。実測（932x430）では **107px** しかなかった。
  //   ⚠ **ステージの中で vh / vw をそのまま使わない。** vh は「実画面」の高さなので、
  //     body ごと倍率で縮むぶん**二重に小さくなる**（58vh のつもりが画面では 119px だった）。
  //     ⇒ `--stage-scale` で割って打ち消す（ミニロックが style.css で使っているのと同じ手）。
  //     rem はもともとステージ側の物差しなので割らない。
  img.style.cssText =
    "position: relative; width: min(28rem, calc(56vh / var(--stage-scale, 1)), calc(46vw / var(--stage-scale, 1))); flex-shrink: 0; border-radius: 0.4rem; display: block; aspect-ratio: 1 / 1; overflow: hidden; background-size: cover; background-position: center; background-repeat: no-repeat;";

  const textCol = document.createElement("div");
  // ⚠ min-width は**絵より小さく**しておく（狭い画面で縦積みに落ちるのを妨げない）。
  textCol.style.cssText = "flex: 1 1 16rem; min-width: 0;";

  const name = document.createElement("div");
  name.style.cssText = "font-weight: bold; font-size: 1.35rem; margin-bottom: 0.5rem; line-break: strict;";

  const note = document.createElement("div");
  note.style.cssText = `
    padding: 0.5rem; background: rgba(0, 0, 0, 0.3); border-radius: 0.25rem;
    font-size: 1rem; line-height: 1.7; white-space: pre-wrap; line-break: strict;
  `;
  textCol.appendChild(name);
  textCol.appendChild(note);
  content.appendChild(img);
  content.appendChild(textCol);

  function close() {
    backdrop.style.display = "none";
    modal.style.display = "none";
  }
  function open(def) {
    showCardFace(img, def.id, getCardImagePath(def.id));
    img.setAttribute("aria-label", cardDisplayName(def.id));
    name.textContent = cardDisplayName(def.id);
    note.textContent = getCardNote(def.id) || def.note || t("deckviewer.noNote");
    backdrop.style.display = "block";
    modal.style.display = "block";
  }

  modal.appendChild(createModalCloseX(close));
  modal.appendChild(content);
  backdrop.addEventListener("click", close);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  return open;
}

function buildPanel(close) {
  const panel = document.createElement("div");
  panel.id = "deck-viewer-panel";
  // ユーザー要望「山札一覧は全画面表示にしましょう」。中央モーダルではなく画面いっぱいに
  // 広げ、中身は縦スクロールで見せる。
  panel.style.cssText = `
    position: fixed; inset: 0; overflow-y: auto;
    background: rgba(15, 23, 32, 0.98);
    padding: 1rem 1.2rem 2rem; z-index: 2001;
    font-family: sans-serif; font-size: 0.85rem; color: #e2e8f0;
    display: none;
  `;

  const titleEl = document.createElement("div");
  titleEl.id = "deck-viewer-title";
  titleEl.textContent = deckViewerTitle();
  titleEl.style.cssText = "font-weight: bold; margin-bottom: 0.6rem; padding-right: 1.6rem;";
  // 🔴【#641】左上に名前のある戻る口を置く（✕ だけだと『見当たらない』という報告になる）。
  const backBtn = document.createElement("button");
  backBtn.id = "deck-viewer-back";
  backBtn.textContent = t("common.back");
  backBtn.style.cssText = "margin-bottom: 0.6rem;";
  backBtn.addEventListener("click", close);
  panel.appendChild(backBtn);
  panel.appendChild(titleEl);
  const closeX = createModalCloseX(close);
  // 🔴【#641】この一覧は全画面＋縦スクロール。✕ を中の要素のままにすると
  //   **下へスクロールした時に画面の外へ流れて見えなくなる**。貼り付けたままにする。
  closeX.style.position = "fixed";
  panel.appendChild(closeX);

  // 【続き722】中身は開くたびに作り直す（対局中かどうか・カードセットが変わるため）。
  const body = document.createElement("div");
  body.id = "deck-viewer-body";
  panel.appendChild(body);

  return panel;
}

// 山札一覧の中身（3セクション）だけを組み立てて返す。図鑑／ルールブックの全画面版
// （codex-page.js）からも使う。カードのクリック→拡大のモーダルは初めて押された時に
// 作られるので（続き624）、initDeckViewer より先に呼んでも構わない。
// 🔴【#640】**出す時だけ**色で並べ直す（表そのものは触らない＝サーバー側の写しと
//   ズレない）。同じ色の中の順は変えない（安定）ので、既に色で揃っている一覧は
//   1枚も動かない。動くのは**表の末尾に足された札**（紅の鉄拳）だけ。
// 🔴【続き740】色の順は **src/card-sort.js に1つだけ**置いた（ここ・マイデッキ編集・
//   コレクションの3か所に同じ表が生まれかけたため）。
const 色でそろえる = sortCardDefsByColor;
export function buildDeckSections(opts = {}) {
  const wrap = document.createElement("div");
  // 🔴 対局中（山札一覧）は **getDeckNormalCards()** をそのまま出す——あれが
  //   「この対局の山をどう組むか」を決めている本人なので、ここで組み直すと必ずズレる
  //   （まぜるの時の配分も、1st を選んだ時にどの33種が入るかも、全部あちらが持っている）。
  const 枚数を出す = !!opts.showCount;
  if (枚数を出す) {
    wrap.appendChild(buildSection(t("deckviewer.normal"), 色でそろえる(getDeckNormalCards()), true));
    wrap.appendChild(buildSection(t("deckviewer.eternal"), getEternalCards(), true));
    wrap.appendChild(buildSection(t("deckviewer.first"), FIRST_CARDS, true));
    return wrap;
  }
  // 0th拡張を選んでいる時は、その33種を先に出す（いま山札に入っているものが上に来るように）。
  // 🔴 「まぜる」の時は両方出す。既定（リメイク）では**1枚も出さない**——この関数は図鑑からも
  //   使われるので、遊んでいる人に未公開のカードが並ばないようにする。
  // 🔴 「いま山札に入っているものだけ」を出す。セットが3つ以上になったので、
  //   「REMAKE 以外なら0th拡張」のような**裏返しの条件では足りない**（1st EDITION を
  //   選んだ時に0th拡張が並んでしまう）。⇒ セットごとに**何を出すかを直接書く**。
  const セット = getCardSet();
  const 混ぜる = セット === CARD_SETS.MIXED;
  if (セット === CARD_SETS.EX0 || 混ぜる) {
    wrap.appendChild(buildSection(t("deckviewer.ex0"), 色でそろえる(EX0_NORMAL_CARDS)));
  }
  if (セット === CARD_SETS.FIRST_ED || 混ぜる) {
    wrap.appendChild(buildSection(t("deckviewer.firstEd"), 色でそろえる(FIRST_ED_NORMAL_CARDS)));
  }
  // ⚠ 旧0th は「まぜる」には入れていない（mixed-deck.js は3セットで組んでいる）。
  //   選んでいる時だけ出す。
  if (セット === CARD_SETS.OLD_0TH) {
    wrap.appendChild(buildSection(t("deckviewer.old0th"), 色でそろえる(OLD0TH_NORMAL_CARDS)));
  }
  // 🔴【続き782】リメイク＋志炎者。リメイクの19種と志炎者7種の**両方**を出す。
  //   ⚠ 片方だけ出すと「一覧に無い札が出てくる」になる（この関数の上のコメントの通り）。
  if (セット === CARD_SETS.REMAKE_CF) {
    wrap.appendChild(buildSection(t("deckviewer.cf"), 色でそろえる(CF_NORMAL_CARDS)));
  }
  if (セット === CARD_SETS.REMAKE || セット === CARD_SETS.REMAKE_CF || 混ぜる) {
    wrap.appendChild(buildSection(t("deckviewer.normal"), 色でそろえる(NORMAL_CARDS)));
  }
  // エターナル。🔴 1st EDITION を選んでいる時は**その対局で実際に出てくるのは1st のEカード**
  //   なので、そちらを出す（getEternalCards と同じ判断。ズレると「一覧に無い札が出てくる」）。
  wrap.appendChild(buildSection(t("deckviewer.eternal"), getEternalCards()));
  wrap.appendChild(buildSection(t("deckviewer.first"), FIRST_CARDS));
  // 1st EDITION の Fカード7種。⚠ **まだどの山にも入れていない**（ファーストカードを1st の
  //   ものに差し替えるかは別途相談）ので、「ここにあるよ」と見せるだけ。
  //   見せるのは 1st を選んでいる人だけ＝遊んでいる人に未公開のカードは並ばない。
  if (セット === CARD_SETS.FIRST_ED) {
    wrap.appendChild(buildSection(t("deckviewer.firstEd1st"), FIRST_ED_FIRST_CARDS));
  }
  return wrap;
}

let openDeckViewerFn = null;

// 「⚙ オプション」の中の「📋 山札一覧」項目から呼ぶ（以前は右上に専用ボタンがあったが、
// 右上のボタン列を整理するためオプションメニューに統合した）。
export function openDeckViewer() {
  openDeckViewerFn?.();
}

export function initDeckViewer() {
  let panel = null;
  let backdrop = null;
  function close() {
    if (!panel) return; // まだ組み立てていない＝開いていないので何もしない
    panel.style.display = "none";
    backdrop.style.display = "none";
  }
  function open() {
    ensureBuilt();
    // 🔴 開くたびに中身を作り直す。対局が始まると「カード一覧」→「山札一覧（枚数入り）」に
    //   変わるし、カードセットも対局ごとに変わるので、1回組んだきりだと**古い顔のまま**になる。
    const 枚数 = isDeckListMode();
    const 題 = panel.querySelector("#deck-viewer-title");
    if (題) 題.textContent = deckViewerTitle();
    const 中 = panel.querySelector("#deck-viewer-body");
    if (中) {
      中.innerHTML = "";
      中.appendChild(buildDeckSections({ showCount: 枚数 }));
    }
    panel.style.display = "block";
    backdrop.style.display = "block";
  }
  openDeckViewerFn = open;

  // 【続き624】**パネルの組み立ては「初めて開く時」まで遅らせる**（続き623 の管理者パネルと同じ形）。
  function ensureBuilt() {
    if (panel) return;
    panel = buildPanel(close);
    backdrop = createBackdrop(close, { dim: true, zIndex: 2000 });
    // ハマりどころ: 他のパネル（admin.js/options-menu.js等）と違い、ここだけ生成直後に
    // display:noneを付け忘れていたため、ページを開いた瞬間から画面全体が薄暗いbackdropで
    // 覆われていた。1回目のクリックはこのbackdrop自身をclose()するだけに消費され、
    // 実際にはマウスがまだ動いていない（クリックだけでは新しいpointermoveが発生しない）ため、
    // 盤面のホバー演出が効き始めるにはもう1回の操作が必要になる、という体感になっていた。
    backdrop.style.display = "none";

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }
}
