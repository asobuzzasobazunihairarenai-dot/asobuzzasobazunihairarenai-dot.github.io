// ⚠⚠【続き736】**このモジュールはもう使われていない。**
//   ユーザー指摘「**ミニモーダルは画面中央ですよ？** ミニモーダルとは出た後に
//   このターンの出来事、前のターンの出来事としてストックされていくやつのこと」
//   （ユーザー訂正「**右にストックでしたね**」＝右下のボタン列の上の横帯）
//   ⇒ 続き735 で作ったこの左上のモーダルは**別物**だった。正しくは既にある
//     中央のフラッシュ（hand-announcer.js の announceCardsDiscarded →
//     turn-event-stock.js）で、そこに「複数枚を1つにまとめる」も最初から在った。
//     盤面の一括捨てが**それを呼んでいなかっただけ**だった。
//   ⚠ **ファイルは消さない**（公開済みの src/*.js は消さない＝続き423 の実害。
//     利用者の端末のキャッシュに古い import が生きていると 404 で機能が丸ごと死ぬ）。
//
// 【教訓】ユーザーの言葉（「ミニモーダル」）が**アプリの中の既存の物を指している**
//   可能性を、作る前に確かめる。新しく作る前に「同じことをする物が既に無いか」を探す。
//
// 【2026-11-15・続き735・#673】「捨てられたカード」を**全員に**見せるミニモーダル。
//
// ユーザー要望: 「迷いの森で捨てられたカードを**捨てられた順に**ミニモーダルで全員へ。
//   複数枚は1つにまとめる。」
//
// なぜ要るか: 迷いの森は「あなたの隣のカードをすべて捨てる」＝**一度に何枚も**盤面から
// 消える。state は全員に同期されるので結果は正しいが、**画面には「n枚捨てました」の文しか
// 出ない**ので、何が消えたのか誰にも分からない（#592 の「勝手に効くので追えない」と同じ形）。
// 捨て場は積み重なり、どれが1番上かが後で効く（赤のはじまり＝1番上／フェニックス＝上から
// 2番目）ので、**順番が見えること自体がゲームの情報**になる。
//
// 🔴 設計のきまり
//  ・**1枚ずつ出さない。** 1枚＝1モーダルだと n 枚ぶん出て、しかも右上の同じ場所で
//    上書きし合う（card-arrival.js が実際にそうしている）＝最後の1枚しか見えない。
//    ⇒ **1つのモーダルに横並び**で、左から順に 1,2,3… の番号を振る。
//  ・**置き場所は左上**（card-arrival-modal は右上）。迷いの森の到達モーダルが右上に
//    出ているので、同じ所に出すと取り合う。
//  ・大きさ・消える時間は **到達モーダルと同じ変数**（--card-arrival-modal-*）を使う
//    ——プレイヤーが設定で大きくしたら、こちらも一緒に大きくなるのが筋。
//  ・**新しい画像も canvas も使わない**（絵はアプリが既に持っているものを敷くだけ）。
//
// ⚠ 中継（他の人の画面に出す）は main.js 側の責務。このモジュールは見せるだけ。

import { getCardDefinition, getCardImagePath } from "./cards-data.js";
import { showCardFace } from "./card-face-display.js";
import { createModalCloseX } from "./ui-helpers.js";
import { t } from "./ui-text.js";

// 一度に出す上限。これを超えたぶんは「＋n」とだけ出す（白の意志の覚醒のように
// 場の表向き全部を捨てる札だと、理屈の上では49枚まで在り得る）。
const MAX_SHOWN = 12;

let current = null;
let timer = null;

function durationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--card-arrival-modal-duration").trim();
  const sec = parseFloat(raw);
  return Math.max(3, Number.isNaN(sec) ? 5 : sec) * 1000;
}

export function hideDiscardRevealModal() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!current) return;
  const el = current;
  current = null;
  el.classList.remove("show");
  setTimeout(() => el.remove(), 300);
}

// cardIds … **捨てられた順**（先頭が1番目＝捨て場の下の方）。
// options.label … 見出し（既定「捨てられたカード」）。
export function showDiscardedCardsModal(cardIds, options = {}) {
  const ids = (Array.isArray(cardIds) ? cardIds : []).filter((x) => typeof x === "string" && x);
  if (ids.length === 0) return;
  hideDiscardRevealModal(); // 連続で捨てる札があっても重ならないように

  const modal = document.createElement("div");
  modal.className = "discard-reveal-modal";
  if (ids.length >= 5) modal.classList.add("is-many");

  const label = document.createElement("div");
  label.className = "discard-reveal-modal-label";
  label.textContent = options.label || t("dr.label");
  modal.appendChild(label);

  const row = document.createElement("div");
  row.className = "discard-reveal-row";
  for (const [i, id] of ids.slice(0, MAX_SHOWN).entries()) {
    const cell = document.createElement("div");
    cell.className = "discard-reveal-cell";

    const art = document.createElement("div");
    art.className = "discard-reveal-card";
    // 🔴【#660・#611】生のURLを `background-image` に敷くだけにしない。0th拡張・1st は
    //   **文字を焼き込んだ絵を持たない**ので、下地を敷くだけでは効果欄が真っ白になる。
    //   `showCardFace` が「文字を描くか・絵を敷くか」を1か所で判断している唯一の入口なので、
    //   必ずここを通す（ONLY の金の光もこの関数が付ける）。
    showCardFace(art, id, getCardImagePath(id));
    const def = getCardDefinition(id);
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", def?.name || id);
    cell.appendChild(art);

    // 捨てられた順。番号が無いと「左から順」が約束に見えない。
    const num = document.createElement("div");
    num.className = "discard-reveal-num";
    num.textContent = String(i + 1);
    cell.appendChild(num);

    row.appendChild(cell);
  }
  modal.appendChild(row);

  if (ids.length > MAX_SHOWN) {
    const more = document.createElement("div");
    more.className = "discard-reveal-more";
    more.textContent = t("dr.more", { n: ids.length - MAX_SHOWN });
    modal.appendChild(more);
  }

  modal.appendChild(createModalCloseX(hideDiscardRevealModal));
  // 触れば消える（到達モーダルと同じ作法）。
  modal.addEventListener("click", () => hideDiscardRevealModal());

  document.body.appendChild(modal);
  current = modal;
  requestAnimationFrame(() => modal.classList.add("show"));
  timer = setTimeout(hideDiscardRevealModal, durationMs());
}
