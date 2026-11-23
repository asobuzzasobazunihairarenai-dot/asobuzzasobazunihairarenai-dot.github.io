// 🔴【2026-11-23・続き832】**エディション（使うカード）を選ぶ画面。**
//
// ユーザー指示「エディション選択画面の実装に進めましょう。**今はとりあえず管理者のみ対応で
// いいです**」。
//
// ■ それまでの形と、何が問題だったか
//   ホームの「CPU戦」の設定パネルの中に、**横1列の小さなボタンが6つ**並んでいた。
//   ⚠ 報告 #741「この選択モーダルが細々している」はまさにこの列で、スマホでは
//     単語の途中で折り返していた（続き806 で幅は直したが、**窮屈さ自体**は残っていた）。
//   ⚠ しかも箱の絵（assets/boxes）を持っているのに、ここでは**1枚も見えなかった**。
//
// ■ 作り
//   フレンドリーマッチの「この対局の山札」（deck-choice-ui.js・続き744）と**同じ形**にする。
//   あれはユーザー判断「**モーダル形式ダサいかも！画面全体が黒い半透明で覆われて、
//   そこにモーダル無しで箱が並んでみたいな画面全体でやった方がかっこよくない？**」で
//   作り直したもので、既に**見た目も作法も決まっている**。
//   ⇒ CSS は `.deck-chooser-*` を**そのまま共有**する（写しを作らない＝続き762 の教訓）。
//
// 🔴 あちらとの違い（**別のモジュールにした理由**）
//   ・あちらは**部屋（gameId）**の持ち物で、選ぶと**サーバーへ書く**（setRoomDeckChoice）。
//   ・こちらは**この端末の既定**（card-set.js の localStorage）。通信は1つも無い。
//   ⇒ 同じ関数に両方を持たせると、「部屋に居ない時に gameId が null」の分岐が全部に散る。
//
// ⚠ 選べるかどうか（管理者か）は**呼ぶ側が決める**（card-set.js と同じ作法。
//   ここで isAdminUser() を呼ぶと online.js → state.js → … と輪になりかねない）。

import { CARD_SETS, getCardSet, setCardSet } from "./card-set.js";
import { buildDeckBox3d, hasDeckBoxArt } from "./deck-box-3d.js";
import { isFlatten2dMode } from "./tablet-2d-mode.js";
import { t } from "./ui-text.js";
import { createModalCloseX } from "./ui-helpers.js";

// 公式＝**実物の箱で売られたもの**（続き744 のユーザー判断と同じ並び）。
const 公式 = [
  { set: CARD_SETS.REMAKE, key: "home.matchChoice.cardSetRemake" },
  { set: CARD_SETS.FIRST_ED, key: "home.matchChoice.cardSet1st" },
];
// 試験＝管理者のテスト用。0th拡張はブースターパックで売られた拡張、旧0thは「とりあえず
// 管理者だけ」（続き758 のユーザー判断）、まぜる・リメイク＋志炎者は試験用。
const 試験 = [
  { set: CARD_SETS.EX0, key: "home.matchChoice.cardSetEx0" },
  { set: CARD_SETS.OLD_0TH, key: "home.matchChoice.cardSet0th" },
  { set: CARD_SETS.MIXED, key: "home.matchChoice.cardSetMixed" },
  { set: CARD_SETS.REMAKE_CF, key: "home.matchChoice.cardSetRemakeCf" },
];

export function セットの名(set) {
  const o = [...公式, ...試験].find((x) => x.set === set);
  return o ? t(o.key) : String(set || "");
}

let 開いている = null;

export function closeEditionChooser() {
  if (!開いている) return;
  開いている.destroy();
  開いている = null;
}

/**
 * エディションを選ぶ画面を開く。
 * @param {object} o
 * @param {boolean} o.試験も   管理者か（試験用のセットも並べるか）
 * @param {Function} o.onChanged 選ばれた時に呼ぶ（呼ぶ側が自分の画面を描き直す）
 */
export function openEditionChooser({ 試験も = false, onChanged = null } = {}) {
  closeEditionChooser();

  const root = document.createElement("div");
  root.id = "edition-chooser";
  // 🔴 見た目は「この対局の山札」と同じ（CSS を共有する）。
  root.className = "deck-chooser";
  document.body.appendChild(root);

  const 平面 = (() => {
    try { return isFlatten2dMode(); } catch (err) { return false; }
  })();
  const 箱たち = [];
  let 生きている = true;

  const 箱を片付ける = () => {
    for (const b of 箱たち) {
      try { b.so7Box?.destroy?.(); } catch (err) { /* 片付けで落ちても困らない */ }
    }
    箱たち.length = 0;
  };
  const とじる = () => closeEditionChooser();

  const 選ぶ = (set) => {
    if (!生きている) return;
    setCardSet(set);
    組み立てる(); // 選んだ印を付け直す（箱は作り直しになるが、ここは数個なので軽い）
    try { onChanged?.(set); } catch (err) { console.error("edition onChanged failed", err); }
  };

  // ── 箱1つぶんの札（deck-choice-ui.js の 箱の札 と同じ作り）──────────────
  // ⚠ 試験用（小さい: true）は**箱を出さない**。理由が2つある:
  //   ① 0th拡張は**ブースターパックで売られた拡張**なので、そもそも箱が無い
  //      （ユーザー判断・続き744）。deck-box-3d はリメイクの箱の絵を流用しているので、
  //      ここで出すと**リメイクと見分けが付かない**（撮って気づいた）。
  //   ② 試験用は脇役。公式と同じ大きさの箱が並ぶと、どちらが本筋か分からなくなる。
  const 札 = (set, 名, { 小さい = false } = {}) => {
    const item = document.createElement("div");
    item.className =
      "deck-chooser-item is-pickable" + (小さい ? " is-small" : "") + (getCardSet() === set ? " is-selected" : "");
    item.dataset.set = set;

    const stage = document.createElement("div");
    stage.className = "deck-chooser-stage";
    if (!小さい && hasDeckBoxArt(set)) {
      // 画面全体なので大きく出せる（ここが「回して裏を読む」の値打ち）。
      const size = Math.max(120, Math.min(220, Math.round(Math.min(window.innerWidth / 3.4, window.innerHeight / 3.4))));
      const box = buildDeckBox3d(set, { size, flat: 平面, onTap: () => 選ぶ(set) });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
    } else {
      // 箱の絵が無いセット（旧0th・まぜる・リメイク＋志炎者）。
      const ph = document.createElement("div");
      ph.className = "deck-chooser-dice is-plain";
      ph.textContent = "🎴";
      ph.addEventListener("click", () => 選ぶ(set));
      stage.appendChild(ph);
    }
    item.appendChild(stage);

    const nm = document.createElement("div");
    nm.className = "deck-chooser-name";
    nm.textContent = 名;
    nm.addEventListener("click", () => 選ぶ(set));
    item.appendChild(nm);
    return item;
  };

  function 組み立てる() {
    箱を片付ける();
    root.innerHTML = "";

    root.appendChild(createModalCloseX(とじる));

    const title = document.createElement("div");
    title.className = "deck-chooser-title";
    title.textContent = t("edition.title");
    root.appendChild(title);

    const now = document.createElement("div");
    now.className = "deck-chooser-current";
    now.textContent = t("edition.current", { name: セットの名(getCardSet()) });
    root.appendChild(now);

    const row = document.createElement("div");
    row.className = "deck-chooser-row";
    for (const o of 公式) row.appendChild(札(o.set, t(o.key)));
    root.appendChild(row);

    if (!平面) {
      const hint = document.createElement("div");
      hint.className = "deck-chooser-hint";
      hint.textContent = t("deckChoice.spinHint");
      root.appendChild(hint);
    }

    // ⚠ 試験用は**管理者にだけ**並べる（呼ぶ側が決める）。
    if (試験も) {
      const sub = document.createElement("div");
      sub.className = "deck-chooser-sub is-test";
      sub.textContent = t("deckChoice.testOnly");
      root.appendChild(sub);

      const row2 = document.createElement("div");
      row2.className = "deck-chooser-row";
      for (const o of 試験) row2.appendChild(札(o.set, t(o.key), { 小さい: true }));
      root.appendChild(row2);
    }

    const note = document.createElement("div");
    note.className = "deck-chooser-note";
    note.textContent = t("edition.note");
    root.appendChild(note);
  }

  組み立てる();

  // 出口は2つ（✕ と Esc）。開いたまま固まらないようにする（pack-opening.js と同じ作法）。
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      とじる();
    }
  };
  window.addEventListener("keydown", onKey);

  開いている = {
    destroy() {
      生きている = false;
      window.removeEventListener("keydown", onKey);
      箱を片付ける();
      root.remove();
    },
  };
}
