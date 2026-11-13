// カード面の表示モード（テキスト合成 / 画像）と、スロットへの表示ヘルパー。
// 既定は「テキスト」（アプリ側でブランク画像＋タイトル・効果文・フレーバーを合成して描画）。
// 管理者モードで「画像」（従来の焼き込み画像）に切り替え可能（この端末のみ・localStorage）。
//
// showCardFace(el, cardId, imageUrl):
//  - テキストモード: buildCardFace(cardId) を el に inset:0 のオーバーレイ(.card-face-mount)として
//    被せ、el の背景画像は消す。el の他の子（バッジ・グロー用の擬似要素・ロックスタンプ等）は
//    そのまま残す（オーバーレイは先頭に挿入＝背面）。
//  - 画像モード（または cardId 不明）: 従来通り el に背景画像を敷き、マウントがあれば撤去する。
//
// ドラッグ中のゴースト・飛翔演出・canvas（victory-summary / card-dissolve）は DOM スロットでは
// ないため対象外（常に画像/canvasのまま）。
import { buildCardFace } from "./card-renderer.js";
import { hasBakedCardFace, hasNoPrintedFace, getCardImagePath, getCardDefinition } from "./cards-data.js";
import { getLang } from "./i18n.js";

const STORE_KEY = "so7-card-face-mode";
let mode = null; // "text" | "image"（遅延ロード）

function load() {
  if (mode) return mode;
  try {
    mode = localStorage.getItem(STORE_KEY) === "image" ? "image" : "text"; // 既定=text
  } catch {
    mode = "text";
  }
  return mode;
}

export function getCardFaceMode() {
  return load();
}
export function isCardFaceTextMode() {
  return load() === "text";
}
export function setCardFaceMode(m) {
  mode = m === "image" ? "image" : "text";
  try {
    localStorage.setItem(STORE_KEY, mode);
  } catch {
    /* 保存不可でもその場のモードは効く */
  }
}

// モーダル等で「1枚のカードを表示する箱」を作って返す（従来 <img> だった箇所の置き換え用）。
// テキストモード=カード面を合成、画像モード=背景画像。正方形（aspect-ratio 1/1）。呼び出し側は
// .card-box に対して幅・枠・角丸などを CSS で指定する（旧 `.modal img` ルールを `.modal .card-box` に
// 変えるだけ）。extraClass で追加クラスを付けられる。
export function buildCardBox(cardId, imageUrl, extraClass = "") {
  const box = document.createElement("div");
  box.className = "card-box" + (extraClass ? " " + extraClass : "");
  showCardFace(box, cardId, imageUrl);
  return box;
}

// スロット el 直下のマウント（.card-face-mount）を取り除く。
export function clearCardFaceMount(el) {
  if (!el) return;
  const prev = el.querySelector(":scope > .card-face-mount");
  if (prev) prev.remove();
}

// el に「表向きカードの見た目」を表示する。テキストモードならカード面を合成して被せ、
// 画像モードなら imageUrl を背景に敷く。
// 🔴【#596・2026-11-12】ユーザー要望「ONLYカードはてからせよう！」＝**光らせる**（確認済み）。
//   ONLY は「1枚しか入れられない」札（元のカードに ONLY と印字されている。0th拡張の
//   7色＋白黒で計10種）。遊んでいて**その1枚と分かる**ようにする。
//   ⚠ 目印のクラスを付けるだけ。見た目は style.css の .is-only-card が決める
//     （金の縁＝ゆっくり脈打つ）。showCardFace は**表向きのカードを出す唯一の入口**なので、
//     盤面・手札・ロックエリア・山札一覧・図鑑・拡大のどこでも一度で効く。
//   ⚠ 裏向きのカードには付かない（cardId が無い呼び出し＝裏面には届かない）。
//     伏せてある札が ONLY だと分かってしまうのは非公開情報の漏れになる。
export function showCardFace(el, cardId, imageUrl) {
  if (!el) return;
  el.classList.toggle("is-only-card", !!cardId && !!getCardDefinition(cardId)?.only);
  const prev = el.querySelector(":scope > .card-face-mount");
  // 🔴 絵に文字が焼き込まれているカード（1st EDITION の Fカード7種＝暫定で印刷データを
  //   当てている）は、テキストモードでも**画像のまま**出す。上から文字を描くと二重になる。
  //   正式な絵ができたら hasBakedCardFace が空になり、自動でテキストモードに戻る。
  // 🔴【#611・2026-11-13】「バスストップを使用するとき…効果欄のテキストがなくなっていた。総点検を！」。
  //   0th拡張・1st EDITION は**文字を焼き込んだ絵を持たない**（文字はアプリが描く）。
  //   ところが**画像モード**を選んでいると、ここは絵をそのまま敷く道へ行き、
  //   getCardImagePath が文字なしの下地（cards-blank）を返す＝**文字が1字も出ない**。
  //   ⇒ そういうカードは、画像モードでも**必ず文字を描く**（画像モードには出せる絵が無い）。
  //   教訓: 「絵が無いので下地で代用する」を足したら、**絵をそのまま出す経路**も必ず見る。
  if ((isCardFaceTextMode() || hasNoPrintedFace(cardId)) && cardId && !hasBakedCardFace(cardId)) {
    el.style.backgroundImage = "none";
    // マウントは inset:0 の絶対配置なので、スロットが包含ブロック（positioned）である必要がある。
    // 【重要】未挿入(detached)の要素は getComputedStyle が常に position:static を返す（スタイルが
    // まだ効いていない）ため、ここで relative を付けると .hand-card 等 CSS で absolute 指定の要素を
    // 壊してしまう。なので el.isConnected の時だけ判定し、detached の要素は CSS 側の position に任せる
    // （検証: 各スロットの CSS が positioned になっていること）。
    if (el.isConnected && getComputedStyle(el).position === "static") el.style.position = "relative";
    // 同じカード・同じ言語のマウントが既にあれば作り直さない（無駄なDOM再構築を避ける・ホバー等で
    // 有効）。言語が変わった時は作り直す必要があるため lang も鍵に含める（buildCardFace が
    // face.dataset.lang をスタンプする）。
    if (prev && prev.dataset.mountCardId === cardId && prev.dataset.lang === getLang()) return;
    if (prev) prev.remove();
    const face = buildCardFace(cardId);
    face.classList.add("card-face-mount");
    face.dataset.mountCardId = cardId;
    el.insertBefore(face, el.firstChild);
  } else {
    if (prev) prev.remove();
    // 焼き込み済みのカードは、呼び出し側が絵のURLを渡していなくても絵を敷く
    // （テキストモードから回ってくるので、渡されていないことがある）。
    const url = imageUrl || (cardId && hasBakedCardFace(cardId) ? getCardImagePath(cardId) : null);
    if (url) el.style.backgroundImage = `url("${url}")`;
  }
}
