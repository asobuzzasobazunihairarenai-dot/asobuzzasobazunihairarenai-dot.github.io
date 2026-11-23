// 🔴【2026-11-23・続き835】マイ山札の**箱のスキン**（蓋にするカードのイラスト）を選ぶ画面。
//
// ユーザー案「箱のスキンはユーザーがマイ山札を作るときに**好きなカードのイラストを
// 箱のスキンとして設定**します」。
//
// ⚠ 候補は**その山札に入っているカード**にした。理由は2つ:
//   ①「この山札の顔」を選ぶ、という意味がそのまま通る
//   ②全部（126種）並べると探すのが大変で、しかもその山札に入っていない絵が蓋になると
//     中身と食い違う。
//   ⇒ ただし山札がまだ空の時だけ、標準のカードから選ばせる（選べない画面を出さない＝#729）。
//
// ⚠ 絵は**イラストだけの版**（assets/cards-illust）。文字入りの絵だと蓋に効果文が並んで読めない。
// ⚠ 小さい札を126枚ぶん DOM で組むと重い（deck-viewer.js の教訓）ので、**背景画像で敷くだけ**にする。

import { getCardDefinition, getCardIllustPath } from "./cards-data.js";
import { getCardName } from "./card-text.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { t } from "./ui-text.js";

let 開いている = null;

export function closeStackSkinPicker() {
  if (!開いている) return;
  開いている.destroy();
  開いている = null;
}

function 名(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}

/**
 * @param {object} o
 * @param {string[]} o.候補      並べるカードの id
 * @param {string}   o.いま      いま選ばれている id（空でよい）
 * @param {Function} o.onPick    選ばれた時に呼ぶ（id、または "" ＝無地に戻す）
 */
export function openStackSkinPicker({ 候補 = [], いま = "", onPick = null } = {}) {
  closeStackSkinPicker();

  const close = () => closeStackSkinPicker();
  const backdrop = createBackdrop(close, { dim: true, zIndex: 2680, blocksGame: false });
  const panel = document.createElement("div");
  panel.id = "stack-skin-picker";

  panel.appendChild(createModalCloseX(close));

  const title = document.createElement("div");
  title.className = "stack-skin-title";
  title.textContent = t("mystack.skin.title");
  panel.appendChild(title);

  const note = document.createElement("div");
  note.className = "stack-skin-note";
  note.textContent = t("mystack.skin.note");
  panel.appendChild(note);

  const grid = document.createElement("div");
  grid.className = "stack-skin-grid";

  const 決める = (id) => {
    try {
      onPick?.(id);
    } catch (err) {
      console.error("stack skin onPick failed", err);
    }
    close();
  };

  // 「無地に戻す」も1つ目に置く（選んだあとに戻せないと困る＝押せない約束を残さない）。
  const 無地 = document.createElement("button");
  無地.type = "button";
  無地.className = "stack-skin-cell is-none" + (いま ? "" : " is-on");
  無地.textContent = t("mystack.skin.none");
  無地.addEventListener("click", () => 決める(""));
  grid.appendChild(無地);

  for (const id of 候補) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "stack-skin-cell" + (id === いま ? " is-on" : "");
    b.title = 名(id);
    b.setAttribute("aria-label", 名(id));
    // ⚠ ショートハンド `background` は書かない（background-size が初期値へ戻る＝教訓9）。
    b.style.backgroundImage = `url("${getCardIllustPath(id)}")`;
    b.style.backgroundSize = "cover";
    b.style.backgroundPosition = "center";
    b.addEventListener("click", () => 決める(id));
    grid.appendChild(b);
  }
  panel.appendChild(grid);

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  const onKey = (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  };
  window.addEventListener("keydown", onKey);

  開いている = {
    destroy() {
      window.removeEventListener("keydown", onKey);
      panel.remove();
      backdrop.remove();
    },
  };
}
