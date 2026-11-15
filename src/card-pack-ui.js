// 「パックを開ける」画面（2026-11-15・続き726）。管理者だけに出す。
//
// 🔴 中身の決まりは src/card-packs.js の冒頭。ここは**見せ方と押し方**だけ。
//
// ■ 開け方
//   ①「パックを開ける」を押すと、裏向きのカードが5枚並ぶ。
//   ②1枚ずつ押すとめくれる（「ぜんぶめくる」もある）。
//   ③まだ持っていなかった札には **NEW**、レア枠には **ONLY/レア** の印。
//   ④全部めくると所持に入る（途中で閉じたら**入らない**＝見ていない札を持ったことにしない）。
//
// ⚠ **新しい画像は1枚も足さない**（カードの絵と裏面はアプリが既に持っている）。
//   全画面の canvas も使わない（1枚で約23MB＝#441・#607 で実際に落ちている）。
// ⚠ 演出は CSS の transform だけ（`filter` は使わない＝教訓1 の平坦化／続き634 の重さ）。
// ⚠ **色は決め打ちしない**（教訓15。明暗2テーマ）。地と文字色はパネルから継ぐ。

import { EX0_NORMAL_CARDS } from "./cards-data-ex0.js";
import { FIRST_ED_NORMAL_CARDS } from "./cards-data-1st.js";
import { getCardImagePath, getCardBackImagePath, hasNoPrintedFace, getCardDefinition } from "./cards-data.js";
import { showCardFace } from "./card-face-display.js";
import { getCardName } from "./card-text.js";
// 🔴 getCardName は訳の表に無い札には空を返すので、deck-viewer.js と同じく**定義の name へ落とす**
//   （実測でラベルに "ex0-purple-vivian" と id がそのまま出ていた）。
import {
  PACK_SIZE,
  drawPack,
  commitPack,
  getOwnedCardIds,
  getOpenedCount,
  grantAllCards,
  resetOwnedCards,
} from "./card-packs.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { t } from "./ui-text.js";

// パックに入り得る札＝**まだアプリで公開していない**0th拡張と 1st EDITION の通常カード。
// ⓘ リメイクの33種は最初から全員が持っている（標準の山札そのもの）ので、パックには入れない。
export function getPackPool() {
  return [...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS];
}

let panel = null;
let backdrop = null;
let 再描画 = () => {};
let いまの引き = null; // [{ id, rare, isNew, めくった }]

function カードの面(cardId, めくった) {
  const el = document.createElement("div");
  el.className = "card-pack-card" + (めくった ? " is-open" : "");
  const inner = document.createElement("div");
  inner.className = "card-pack-card-inner";

  const back = document.createElement("div");
  back.className = "card-pack-card-back";
  back.style.backgroundImage = `url("${getCardBackImagePath(null)}")`;
  inner.appendChild(back);

  const front = document.createElement("div");
  front.className = "card-pack-card-front";
  // 【#660 と同じ扱い】文字を焼き込んだ絵を持たない札は、アプリがカード面を組み立てる。
  if (hasNoPrintedFace(cardId)) {
    showCardFace(front, cardId, null);
  } else {
    front.style.backgroundImage = `url("${getCardImagePath(cardId)}")`;
    front.style.backgroundSize = "cover";
  }
  inner.appendChild(front);
  el.appendChild(inner);
  return el;
}

function 引いた札を組む() {
  const wrap = document.createElement("div");
  wrap.className = "card-pack-row";
  いまの引き.forEach((c, i) => {
    const slot = document.createElement("div");
    slot.className = "card-pack-slot";
    if (c.rare) slot.classList.add("is-rare");
    const card = カードの面(c.id, c.めくった);
    card.addEventListener("click", () => {
      if (c.めくった) return;
      c.めくった = true;
      再描画();
    });
    slot.appendChild(card);

    const label = document.createElement("div");
    label.className = "card-pack-label";
    if (c.めくった) {
      if (c.isNew) {
        const nw = document.createElement("span");
        nw.className = "card-pack-new";
        nw.textContent = t("packs.new");
        label.appendChild(nw);
      }
      // レア枠の印。⚠ カードの方を光らせない（ONLYカードの光と取り合う＝style.css の注記）。
      if (c.rare) {
        const mark = document.createElement("span");
        mark.className = "card-pack-rare-mark";
        mark.textContent = "✦";
        mark.title = t("packs.rare");
        label.appendChild(mark);
      }
      label.appendChild(document.createTextNode(getCardName(c.id) || getCardDefinition(c.id)?.name || c.id));
    } else {
      label.textContent = t("packs.tapToFlip");
    }
    slot.appendChild(label);
    wrap.appendChild(slot);
  });
  return wrap;
}

function 中身を組む(inner, admin) {
  inner.textContent = "";

  const pool = getPackPool();
  const owned = getOwnedCardIds();

  // 所持の数え（この画面の芯＝「あと何種類？」）。
  const stat = document.createElement("div");
  stat.className = "card-pack-stat";
  stat.textContent = t("packs.owned", { n: owned.length, total: pool.length, packs: getOpenedCount() });
  inner.appendChild(stat);

  const actions = document.createElement("div");
  actions.className = "card-pack-actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "card-pack-open-btn";
  openBtn.textContent = t("packs.open");
  openBtn.addEventListener("click", () => {
    いまの引き = drawPack(pool).map((c) => ({ ...c, めくった: false }));
    再描画();
  });
  actions.appendChild(openBtn);

  if (いまの引き && いまの引き.some((c) => !c.めくった)) {
    const all = document.createElement("button");
    all.type = "button";
    all.className = "card-pack-sub-btn";
    all.textContent = t("packs.flipAll");
    all.addEventListener("click", () => {
      for (const c of いまの引き) c.めくった = true;
      再描画();
    });
    actions.appendChild(all);
  }

  // 管理用（テストのため全部手に入れる／やり直す）。⚠ 管理者だけ。
  if (admin) {
    for (const [key, fn] of [
      ["packs.grantAll", () => grantAllCards(pool)],
      ["packs.reset", () => resetOwnedCards()],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card-pack-sub-btn";
      b.textContent = t(key);
      b.addEventListener("click", () => {
        fn();
        いまの引き = null;
        再描画();
      });
      actions.appendChild(b);
    }
  }
  inner.appendChild(actions);

  if (いまの引き) {
    inner.appendChild(引いた札を組む());
    // 全部めくり終わったら所持に入れる（1回だけ）。
    if (いまの引き.every((c) => c.めくった) && !いまの引き.済み) {
      いまの引き.済み = true;
      commitPack(いまの引き);
      // 数えの行だけ書き直す（めくった絵は残したい＝丸ごと作り直さない）。
      stat.textContent = t("packs.owned", {
        n: getOwnedCardIds().length,
        total: pool.length,
        packs: getOpenedCount(),
      });
      const done = document.createElement("div");
      done.className = "card-pack-note";
      done.textContent = t("packs.added");
      inner.appendChild(done);
    }
  } else {
    const note = document.createElement("div");
    note.className = "card-pack-note";
    note.textContent = t("packs.hint", { n: PACK_SIZE });
    inner.appendChild(note);
  }
}

export function openCardPackPanel(admin) {
  if (!panel) {
    const close = () => {
      if (!panel) return;
      panel.style.display = "none";
      backdrop.style.display = "none";
    };
    backdrop = createBackdrop(close, { dim: true, zIndex: 2400, blocksGame: false });
    panel = document.createElement("div");
    panel.id = "card-pack-panel";

    const back = document.createElement("button");
    back.id = "card-pack-back";
    back.textContent = t("common.back");
    back.addEventListener("click", close);
    panel.appendChild(back);

    const title = document.createElement("div");
    title.id = "card-pack-title";
    title.textContent = t("packs.title");
    panel.appendChild(title);

    const closeX = createModalCloseX(close);
    closeX.style.position = "fixed"; // 全画面＋縦スクロールなので貼り付ける（#641 と同じ）
    panel.appendChild(closeX);

    const inner = document.createElement("div");
    inner.id = "card-pack-inner";
    panel.appendChild(inner);
    再描画 = () => 中身を組む(inner, !!admin);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }
  いまの引き = null;
  再描画();
  backdrop.style.display = "block";
  panel.style.display = "block";
  panel.scrollTop = 0;
}
