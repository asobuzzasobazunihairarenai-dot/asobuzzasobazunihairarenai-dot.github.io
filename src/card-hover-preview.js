// 🔴【2026-11-15・続き737】カードにホバーすると拡大を出す、**どの画面でも使える**部品。
//
// ユーザー要望「**カードにホバーすると拡大が出るようにした方が良いかも。これはいろんな
//   シーンでそうなってた方が良いと思うので総点検した方が良いかも。**」
//
// 【なぜ1つにまとめるか】
//   同じことをする実装が既に**2つ**あった:
//     ・対局画面（main.js の `#card-preview`。盤面の自前の当たり判定から出す）
//     ・マイデッキ編集（my-deck-builder.js の `#mdb-preview`）
//   このまま画面ごとに3つ目・4つ目を書くと、**大きさの設定（--card-preview-size）や
//   touch 端末の扱いが画面ごとに食い違う**。⇒ 一覧系の画面はここに寄せる。
//   ⚠ 対局画面は**そのまま**（あちらは `elementsFromPoint` の自前判定から出していて、
//     盤面の3D・ドラッグ・演出の抑制と密に絡んでいる。触ると #189 の家族を起こす）。
//
// 【見た目】既にある `#mdb-preview` の規則をそのまま使う（新しいCSSを足さない）。
//   大きさは `--card-preview-size`＝**基本設定の「カード拡大の大きさ」と同じ変数**なので、
//   プレイヤーが大きくしたらここも一緒に大きくなる。
//
// 【触る端末】ホバーが無いので**長押し**で出す（押している間だけ）。
//   ⚠ タップでは出さない——一覧のカードはタップに別の意味（選ぶ・増やす）があるため。
//   ⚠ 長押しで出したら、その後の click は**飲み込む**（押し間違いを防ぐ）。
//
// 依存は葉だけ（card-face-display → card-renderer / cards-data）。循環しない。

import { showCardFace } from "./card-face-display.js";
import { getCardImagePath } from "./cards-data.js";

const LONG_PRESS_MS = 380;

let previewEl = null;
let 長押しタイマー = null;
let 長押しで出した = false;

function 入れ物() {
  if (previewEl) return previewEl;
  previewEl = document.createElement("div");
  previewEl.id = "mdb-preview"; // ⚠ 見た目は既にある規則を使う（新しいCSSを足さない）
  const face = document.createElement("div");
  face.className = "mdb-preview-face";
  previewEl.appendChild(face);
  document.body.appendChild(previewEl);
  return previewEl;
}

function 動かす(x, y) {
  if (!previewEl) return;
  const w = previewEl.offsetWidth || 240;
  const h = previewEl.offsetHeight || 240;
  const pad = 18;
  let left = x + pad;
  let top = y - h / 2;
  // 右に入らなければ左へ回す（画面の外へ出さない）。
  if (left + w > window.innerWidth - 6) left = x - w - pad;
  if (left < 6) left = 6;
  if (top < 6) top = 6;
  if (top + h > window.innerHeight - 6) top = window.innerHeight - h - 6;
  previewEl.style.left = left + "px";
  previewEl.style.top = top + "px";
}

export function showCardHoverPreview(cardId, x, y) {
  if (!cardId) return;
  const p = 入れ物();
  showCardFace(p.querySelector(".mdb-preview-face"), cardId, getCardImagePath(cardId));
  p.classList.add("is-visible");
  動かす(x, y);
}

export function hideCardHoverPreview() {
  clearTimeout(長押しタイマー);
  長押しタイマー = null;
  previewEl?.classList.remove("is-visible");
}

// el … カード1枚の要素。cardId は文字列か、呼ばれた時に引く関数（一覧が描き直される画面用）。
export function attachCardHoverPreview(el, cardId) {
  if (!el) return;
  const 札 = () => (typeof cardId === "function" ? cardId() : cardId);

  // ── マウス ──
  el.addEventListener("mouseenter", (e) => showCardHoverPreview(札(), e.clientX, e.clientY));
  el.addEventListener("mousemove", (e) => {
    if (previewEl?.classList.contains("is-visible")) 動かす(e.clientX, e.clientY);
  });
  el.addEventListener("mouseleave", hideCardHoverPreview);

  // ── 触る端末（長押し）──
  el.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse") return; // マウスは上のホバーで出ている
      長押しで出した = false;
      clearTimeout(長押しタイマー);
      長押しタイマー = setTimeout(() => {
        長押しで出した = true;
        showCardHoverPreview(札(), e.clientX, e.clientY);
      }, LONG_PRESS_MS);
    },
    { passive: true }
  );
  const やめる = () => {
    clearTimeout(長押しタイマー);
    長押しタイマー = null;
    if (長押しで出した) hideCardHoverPreview();
  };
  el.addEventListener("pointerup", やめる);
  el.addEventListener("pointercancel", やめる);
  el.addEventListener("pointerleave", やめる);
  // 長押しで出した直後の click は飲み込む（押し間違いを防ぐ）。
  el.addEventListener(
    "click",
    (e) => {
      if (!長押しで出した) return;
      長押しで出した = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
}
