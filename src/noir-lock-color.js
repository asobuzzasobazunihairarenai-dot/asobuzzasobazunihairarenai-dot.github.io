// 🔴【続き899】**ノワールが置かれているロックエリアの色**を1か所で出す。
//
// ノワール（`first-noir`）は、その席の**元のファーストカードと同じ色スロット**に
// `placed: true` のまま残る（state.js の APPLY_SEAT_NOIR）。つまりこの色は
// 「その人が本来持っていた色」であり、**ノワールどうしを見分ける唯一の手がかり**になる。
//
// 【なぜ1か所にするか】同じ計算が main.js に**2か所**写してあった（CPUのロック予約）。
// 写すたびに1つずつ欠けるのが、このリポジトリで何度も起きている形（続き863・886・895）。
// ⇒ **ここが唯一の持ち主。** 駒の色分け・アバター・CPUの予約がここを見る。
//
// ⚠ import は state と board-layout だけ（どちらもこちらを import しない＝輪にならない）。
import { getState } from "./state.js";
import { COLORS, SEAT_TO_SIDE } from "./board-layout.js";

/**
 * その席のノワールが置かれている色スロットの色を返す。
 * @param {string|null} seat
 * @returns {string|null} "red" 等。ノワールでない席・まだ配られていない時は null
 */
export function noirLockColorForSeat(seat) {
  if (!seat) return null;
  try {
    const side = SEAT_TO_SIDE[seat];
    if (!side) return null;
    const tok = getState().tokens.find(
      (t) =>
        t.cardId === "first-noir" &&
        t.location &&
        t.location.zone === "lock" &&
        t.location.side === side &&
        t.placed
    );
    return tok ? COLORS[tok.location.index] ?? null : null;
  } catch (e) {
    return null; // state がまだ無い等。見た目の話なので黙って諦める
  }
}
