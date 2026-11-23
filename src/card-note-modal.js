// カードの詳細（大きい札＋名前＋補足）を出す小さなモーダル。
//
// 🔴【#743・続き808】なぜ切り出したか:
//   要望「このページのコレクションですがカードをタップするとカードの詳細がわかるといいかも！」
//   に答えるには、パックの画面（card-pack-ui.js）にも同じ札が要る。ところが同じものは
//   **既に2か所**に書かれていた（main.js の showCardNoteModal と my-deck-builder.js の写し）。
//   3つ目を書けば必ずズレる（続き762 の教訓）ので、**my-deck-builder の方をここへ移して
//   2か所から呼ぶ**形にした。
//   ⚠ main.js の方は**別物として残してある**——あちらは用語のリンク（linkifyGlossary）と
//     下線の印（card-text-markup）まで通す richer な版で、対局中の盤面から出す。
//     こちらは一覧の画面から出す簡素な版。**統合するなら main.js 側に寄せる**こと。
//
// 🔴 このモジュールは**葉**にする（`cards-data` / `card-text` / `card-face-display` /
//   `ui-text` だけ）。画面の側（my-deck-builder / card-pack-ui）を import しない
//   ——どちらからも呼ばれるので、輪になる（続き573 の TDZ）。
import { getCardDefinition, getCardImagePath } from "./cards-data.js";
import { getCardNote } from "./card-text.js";
import { showCardFace } from "./card-face-display.js";
import { t } from "./ui-text.js";

// cardId の詳細を出す。
//   opts.持っている / opts.上限 … 入っていれば「N / M 枚持っています」の1行を足す
//     （コレクションから開いた時用。マイデッキ編集から開いた時は出さない）。
//   opts.名前 … 表示名を差し替えたい時（英語名など）。既定は定義の name。
// ⚠ 既に出ている時は二重に出さない（連打で札が積み上がる＝#729 の家族）。
export function openCardNoteModal(cardId, opts = {}) {
  const def = getCardDefinition(cardId);
  if (!def) return false;
  if (document.getElementById("card-note-modal")) return false;

  const backdrop = document.createElement("div");
  backdrop.id = "card-note-modal-backdrop";
  const modal = document.createElement("div");
  modal.id = "card-note-modal";
  const content = document.createElement("div");
  content.className = "card-note-content";

  const img = document.createElement("div");
  img.className = "card-note-image";
  showCardFace(img, cardId, getCardImagePath(cardId));
  img.setAttribute("aria-label", opts.名前 || def.name);

  const textCol = document.createElement("div");
  textCol.className = "card-note-text-col";
  const title = document.createElement("div");
  title.className = "card-note-title";
  title.textContent = opts.名前 || def.name;
  const body = document.createElement("div");
  body.className = "card-note-body";
  body.textContent = getCardNote(def.id) || def.note || t("mydeckbuilder.L205");
  textCol.append(title, body);

  // 持っている枚数（コレクションから開いた時だけ）。
  if (Number.isFinite(opts.持っている) && Number.isFinite(opts.上限)) {
    const owned = document.createElement("div");
    owned.className = "card-note-owned";
    owned.textContent = t("cardNote.owned", { n: opts.持っている, max: opts.上限 });
    textCol.appendChild(owned);
  }

  content.append(img, textCol);

  const closeBtn = document.createElement("button");
  closeBtn.className = "card-note-close";
  closeBtn.type = "button";
  closeBtn.textContent = t("mydeckbuilder.L211");
  const close = () => {
    backdrop.remove();
    modal.remove();
    window.removeEventListener("keydown", onKey, true);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", onKey, true);

  modal.append(content, closeBtn);
  document.body.append(backdrop, modal);
  return true;
}
