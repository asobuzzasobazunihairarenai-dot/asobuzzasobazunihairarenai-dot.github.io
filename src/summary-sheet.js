// 【2026-10-12・続き583】サマリー（早見表）を見る画面。
// ユーザー要望「サマリーを見るボタンを右下の自動送りボタンの左隣に新設するのはどう？」。
// 実物のゲームに入っている早見表（表＝自分のターンの流れ／裏＝覚えておきたい原則とゲート侵攻）
// をそのまま見られるようにする。遊んでいる最中に「移動と接触どっちだっけ」「侵攻のボーナスの
// 順番は」を確かめる場面が多いため。
//
// 【メモリに気をつける】元データは 2363x1182 の PNG で1枚4MB。画像は**ファイル容量ではなく
// 幅×高さ×4バイト**でメモリを食う（#223 でiPhoneが落ちた）。幅1500pxのWebPに落としたうえで、
// **開いた時に初めて読み込み、閉じたら要素ごと捨てる**（img を remove する）。
// 2枚を同時に持たないよう、切り替えのたびに src を差し替える（新しい要素は作らない）。
import { t } from "./ui-text.js";
import { createBackdrop, createModalCloseX } from "./ui-helpers.js";

const SHEETS = {
  front: "assets/summary-front.webp",
  back: "assets/summary-back.webp",
};

let panelEl = null;
let backdropEl = null;

export function isSummarySheetOpen() {
  return !!panelEl;
}

export function closeSummarySheet() {
  // img を先に外してから捨てる（デコード済みの画像を抱えたままにしない）。
  panelEl?.querySelector("img")?.remove();
  panelEl?.remove();
  backdropEl?.remove();
  panelEl = null;
  backdropEl = null;
}

export function openSummarySheet() {
  if (panelEl) return;
  // blocksGame:false ＝ これは対局の流れに属さない「見るだけ」の画面なので、
  // 開いている間にフェイズが止まらないようにする（続き455 の実害と同じ理由）。
  backdropEl = createBackdrop(closeSummarySheet, { dim: true, zIndex: 10460, blocksGame: false });
  panelEl = document.createElement("div");
  panelEl.id = "summary-sheet-panel";

  const title = document.createElement("div");
  title.className = "summary-sheet-title";
  title.textContent = t("summary.title");

  const tabs = document.createElement("div");
  tabs.className = "summary-sheet-tabs";
  const img = document.createElement("img");
  img.className = "summary-sheet-image";
  img.alt = "";
  img.decoding = "async";

  let current = "front";
  const buttons = {};
  const show = (side) => {
    current = side;
    img.src = SHEETS[side];
    for (const [key, b] of Object.entries(buttons)) b.classList.toggle("is-current", key === side);
  };
  for (const side of ["front", "back"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "summary-sheet-tab";
    b.textContent = t(side === "front" ? "summary.front" : "summary.back");
    b.addEventListener("click", () => show(side));
    buttons[side] = b;
    tabs.appendChild(b);
  }

  // 画像を押しても切り替わるようにする（タブが小さい端末でも裏を見られるように）。
  img.addEventListener("click", () => show(current === "front" ? "back" : "front"));

  const hint = document.createElement("div");
  hint.className = "summary-sheet-hint";
  hint.textContent = t("summary.hint");

  panelEl.appendChild(createModalCloseX(closeSummarySheet));
  panelEl.appendChild(title);
  panelEl.appendChild(tabs);
  panelEl.appendChild(img);
  panelEl.appendChild(hint);
  document.body.appendChild(backdropEl);
  document.body.appendChild(panelEl);
  show("front");
}
