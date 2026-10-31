// カード拡大プレビューのサイズ（CSS変数 --card-preview-size）を端末に保存し、起動時に復元する。
// このサイズは純粋な「見た目の好み」で、初回設定モーダル(first-run-bgm.js)とオプションの
// 基本設定(options-menu.js)の両方から調整できる。どちらで変えても次回以降まで保たれるよう、
// localStorageへ保存する。
//
// 補足: 管理者モードのCSS変数調整はセッション限りの運用（admin.jsの方針コメント参照）だが、
// これは一般ユーザー向けの明示的な好み設定なので、端末に保存して継続させるのが自然と判断した。
// 保存が無ければ style.css の :root 既定値（20rem）がそのまま使われる。

import { registerSyncedPref } from "./pref-registry.js";

const KEY = "so7-card-preview-size-rem";
// 【#358・2026-10-07・ユーザー要望「設定でサイズを調整できるようにして」】上限を 36→52rem に
// 広げた。設定は元から長押しの拡大にも効いていた（同じ #card-preview・同じCSS変数を使う）が、
// **上限が足りていなかった**——実測（報告者と同じ 932x430＝iPhoneの横持ち。ステージ倍率0.478）で、
// 8rem＝画面の高さの14%／既定の32rem＝57%／当時の上限36rem＝64% にしかならなかった。
// 52rem なら 92% まで出せる（ステージの高さ900pxに収まる範囲＝これ以上はみ出して切れる）。
const MIN = 8;
const MAX = 52;

// 【続き640・2026-10-31】既定値を定数で1か所に置く。実際の見た目を決めているのは
// style.css 末尾の :root ブロックで、管理者モードのつまみ（admin.js）の default も
// 同じ値を持っている＝**同じ事実が3か所にある**。ズレると「戻す」で既定と違う値へ
// 戻る（続き608・627 で実際に起きた）ので、`tools/check-css.mjs` が3か所を毎回照合する。
export const DEFAULT_CARD_PREVIEW_SIZE = 32;

function clamp(v) {
  return Math.min(MAX, Math.max(MIN, v));
}

// 起動時に一度呼ぶ。保存済みの好みがあればCSS変数へ復元する（無ければ何もしない＝既定値）。
export function applyStoredCardPreviewSize() {
  try {
    const v = parseFloat(localStorage.getItem(KEY));
    if (Number.isFinite(v)) {
      document.documentElement.style.setProperty("--card-preview-size", `${clamp(v)}rem`);
    }
  } catch {
    /* localStorageが使えない環境でも既定サイズで問題なく動く */
  }
}

// 今のサイズ(rem)。保存されていなければ既定を返す（アカウント同期で使う）。
// 🔴 【続き640】ここは長く `return 20` だったが、**本当の既定は 32**（style.css 末尾の
// :root ブロック）。この値はアカウントへ保存され、別の端末で開いた時にそのまま適用される
// ので、**つまみを一度も触っていない人の拡大が、別の端末では 20rem に縮んでいた**。
export function getCardPreviewSize() {
  try {
    const v = parseFloat(localStorage.getItem(KEY));
    if (Number.isFinite(v)) return clamp(v);
  } catch {
    /* 読めなければ既定値 */
  }
  return DEFAULT_CARD_PREVIEW_SIZE;
}

// スライダー操作時に呼ぶ。CSS変数へ即反映し、端末へ保存し、再描画を促す（admin:change）。
export function setCardPreviewSize(rem) {
  const v = clamp(rem);
  document.documentElement.style.setProperty("--card-preview-size", `${v}rem`);
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* 保存できなくても、そのセッションの間は見た目に反映される */
  }
  window.dispatchEvent(new CustomEvent("admin:change"));
  return v;
}

// カード拡大プレビューを、カーソル/長タップ位置の「右」に出すか「左」に出すか（ユーザー要望
// 2026-08-07: スマホの長タップ・PCのホバーどちらも、右拡大/左拡大を選べるように。既定は右）。
// main.jsのpositionPreviewPanelが既定の展開方向としてこれを使う（画面端でははみ出す側と反対へ
// 自動反転するのは従来通り）。純粋な見た目の好みなので端末に保存する。
const SIDE_KEY = "so7-card-preview-side"; // "right" | "left"
let previewSide = "right";
try {
  const s = localStorage.getItem(SIDE_KEY);
  if (s === "left" || s === "right") previewSide = s;
} catch {
  /* 使えなくても既定(右)で動く */
}
export function getCardPreviewSide() {
  return previewSide;
}
export function setCardPreviewSide(side) {
  if (side !== "left" && side !== "right") return;
  previewSide = side;
  try {
    localStorage.setItem(SIDE_KEY, side);
  } catch {
    /* 保存できなくてもそのセッションでは効く */
  }
  window.dispatchEvent(new CustomEvent("admin:change"));
}


// ── 右上に出るカードの大きさ（--card-arrival-modal-size） ───────────────────
// 【#438・続き640・2026-10-31・ユーザー要望「変えられるようにしよう。デフォに戻せるように
// もしてください」】元は管理者モードだけで動かせる値だった。#438 の質問（「設定の『カードを
// 拡大表示する大きさ』ってどっちのカード？長タップの方？到達した時に右に出る方？」）の通り、
// プレイヤーはこちらの大きさも変えたいと考える。
//
// ⚠ この1つの変数が**到達モーダル（.card-arrival-modal）と手札使用モーダル
// （.hand-effect-use-modal）の両方**の幅を決めている（style.css のコメント参照）。だから
// 文言は「到達」と限定せず「右上に出るカード」にしてある。
// 上限40remは管理者モードのつまみと同じ（ステージの横1600px＝100rem なので、40rem＝画面の
// 4割。これ以上にすると盤面が見えなくなる）。
const ARRIVAL_KEY = "so7-card-arrival-size-rem";
export const DEFAULT_CARD_ARRIVAL_SIZE = 25;
const ARRIVAL_MIN = 8;
const ARRIVAL_MAX = 40;

function clampArrival(v) {
  return Math.min(ARRIVAL_MAX, Math.max(ARRIVAL_MIN, v));
}

// 起動時に一度呼ぶ（main.js）。保存が無ければ何もしない＝CSSの既定値がそのまま使われる。
export function applyStoredCardArrivalSize() {
  try {
    const v = parseFloat(localStorage.getItem(ARRIVAL_KEY));
    if (Number.isFinite(v)) {
      document.documentElement.style.setProperty("--card-arrival-modal-size", `${clampArrival(v)}rem`);
    }
  } catch {
    /* localStorageが使えない環境でも既定サイズで問題なく動く */
  }
}

export function getCardArrivalSize() {
  try {
    const v = parseFloat(localStorage.getItem(ARRIVAL_KEY));
    if (Number.isFinite(v)) return clampArrival(v);
  } catch {
    /* 読めなければ既定値 */
  }
  return DEFAULT_CARD_ARRIVAL_SIZE;
}

export function setCardArrivalSize(rem) {
  const v = clampArrival(rem);
  document.documentElement.style.setProperty("--card-arrival-modal-size", `${v}rem`);
  try {
    localStorage.setItem(ARRIVAL_KEY, String(v));
  } catch {
    /* 保存できなくても、そのセッションの間は見た目に反映される */
  }
  window.dispatchEvent(new CustomEvent("admin:change"));
  return v;
}

// アカウントにも保存する（pref-registry.js 参照）。
registerSyncedPref("cardPreviewSize", getCardPreviewSize, setCardPreviewSize);
registerSyncedPref("cardPreviewSide", getCardPreviewSide, setCardPreviewSide);
registerSyncedPref("cardArrivalSize", getCardArrivalSize, setCardArrivalSize);
