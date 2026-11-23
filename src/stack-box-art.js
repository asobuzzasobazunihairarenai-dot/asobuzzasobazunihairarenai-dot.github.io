// 🔴【2026-11-23・続き835】マイ山札の**箱の絵**を組む。
//
// ユーザー案「**マイ山札も同じ箱サイズで並ぶのはどう？ 箱のスキンはユーザーがマイ山札を
// 作るときに好きなカードのイラストを箱のスキンとして設定します。**」
//
// ■ なぜ別のファイルか
//   `deck-box-3d.js` は**何も import しない葉**（card-set.js と同じ作法）。カードの絵の道や
//   色の表を知っているのはこちら側なので、**絵を組むのはここ、貼るのはあちら**と分けた。
//   ⇒ あちらは「絵の組（{top, back, side, edge}）を受け取って貼るだけ」で済む。
//
// ⚠ 色は**自分で表を持たない**。`--color-*`（style.css が1か所で決めている）から読む。
//   表を2か所に書くと必ず食い違う（続き762 の教訓）。読めない時だけ落ち着いた金に落とす。

import { getCardDefinition, getCardIllustPath } from "./cards-data.js";

const 既定の縁 = "#b08d3f";

function 色を読む(色名) {
  if (!色名) return 既定の縁;
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--color-" + 色名).trim();
    return v || 既定の縁;
  } catch (err) {
    return 既定の縁;
  }
}

/**
 * マイ山札の箱の絵を組む。
 * @param {string} skinCardId 箱のスキンに選ばれたカードの id（空なら無地の箱）
 * @returns {{top: (string|null), back: (string|null), side: null, edge: string}}
 */
export function buildStackBoxArt(skinCardId) {
  const def = skinCardId ? getCardDefinition(skinCardId) : null;
  // ⚠ **イラストだけの絵**を使う（文字入りの絵だと、箱の蓋に効果文が小さく並んで読めない）。
  const 絵 = def ? getCardIllustPath(skinCardId) : null;
  return {
    top: 絵,
    // 裏も同じ絵（回した時に真っ白だと「壊れている」ように見える）。
    back: 絵,
    // ⚠ 側面の絵は**持たない**。刷られた箱と違って帯のデザインが無いので、縁の色で塗る。
    side: null,
    edge: 色を読む(def?.color),
  };
}
