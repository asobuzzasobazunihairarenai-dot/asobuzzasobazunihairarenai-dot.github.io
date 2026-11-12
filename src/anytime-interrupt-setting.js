// 「いつでも使える」効果の割り込みモーダルを出すかどうか、という1つの状態。
//
// 🔴 **import を1つも持たない葉**（続き573 の TDZ 対策）。main.js と phase-guide.js の
//   両方から読み書きする必要があるので、状態をここへ置く——main.js に持ったままだと
//   phase-guide.js から読めず、逆向きに import すると循環して起動が落ちる。
//
// 🔴 【#593・2026-11-12】ユーザー要望「割り込みのオフを、モーダルが出る前からオフに
//   できた方が良い。**割り込みカードを手に入れたときから**サマリーボタンの隣にオンオフ
//   ボタン出現させるのはどう？」。
//   それまでは「今後このモーダルを出さない」をモーダルの中で押した後に、はじめて
//   『割り込みを再開』ボタンが出る形だった＝**出る前に切ることができなかった**。
//
// ⚠ 保存はしない（対局中の一時的な好み）。続き663 で「ふだんの割り込みと別の設定を作らない」
//   と決めた**1つの状態**を、置き場所だけここへ移したもの。
// ⚠ 値の意味は今までどおり「true＝出さない（オフ）」。画面のボタンは「割り込み ON/OFF」と
//   出すので、**表示は反転**している（ボタンの ON ＝ optedOut が false）。

let optedOut = false;
const listeners = new Set();

export function isAnytimeInterruptOptedOut() {
  return optedOut;
}

// 立てる唯一の口。立てたら必ず聞いている側（画面のボタン）へ知らせる
// ——戻す道が見えないまま消えるのを防ぐ（#495 でユーザーが「再開ボタンもセットで」と
// 指定した趣旨をそのまま守る）。
export function setAnytimeInterruptOptedOut(v) {
  const next = !!v;
  if (next === optedOut) return;
  optedOut = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch (err) {
      console.error("anytime-interrupt-setting listener failed", err);
    }
  }
}

export function onAnytimeInterruptOptedOutChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
