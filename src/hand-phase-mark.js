// 🔴【#885・#886・続き901】**いま自分のハンドフェイズか**をエンジンへ伝えるための葉。
//
// 【なぜ要るか】手札効果（ふつうの方）は**自分のハンドフェイズの物**。ところがエンジンは
// フェイズを知らない——`state.turnPhase` は**オンラインの時しか書かれない**（CPU戦では常に
// null＝続き786 で確かめた）ので、あれを見ると CPU戦でふつうの手札効果が全部使えなくなる。
//
// 一方 main.js は `isSelfHandPhase()` を持っている。⇒ **main.js が起動時に1回ここへ渡し、
// エンジンはここに聞く。** （`setOnlineTransport` / `registerCollectionTransport` と同じ作法。
// 値を写して同期させるのではなく、**聞きに行く**ので古くならない。）
//
// ⚠ 渡されていない間は **null**（＝分からない）。エンジンは分からない時に**塞がない**
//   ——テストの土台や、まだ起動しきっていない一瞬で、ふつうの手札効果まで使えなくなるのを
//   避けるため（「分からないなら今までどおり」）。
// ⚠ import は1つも持たない（葉のまま保つ＝どこから呼んでも輪にならない）。

let 聞く先 = null;

/** main.js が起動時に1回だけ渡す。 */
export function registerSelfHandPhaseProvider(fn) {
  聞く先 = typeof fn === "function" ? fn : null;
}

/**
 * いま自分のハンドフェイズか。
 * @returns {boolean|null} 分からない時は null（呼ぶ側は「塞がない」側に倒すこと）
 */
export function isSelfHandPhaseNow() {
  if (!聞く先) return null;
  try {
    return !!聞く先();
  } catch (e) {
    return null;
  }
}
