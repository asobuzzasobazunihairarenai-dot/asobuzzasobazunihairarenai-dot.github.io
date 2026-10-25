// 「いまこの効果の処理を、誰に委ねているか」を、どのモジュールからも参照できるようにするだけの
// 葉モジュール（import を一切持たないので循環importの心配が無い。anim-gate.js /
// celebration-state.js と同じ作り）。
//
// ユーザー報告（2026-10-25）「スラム上がりの役人の到達効果で相手に捨てさせてる時に、右下の
// 『自分のターンです』が優先権は○○です的な表示になってなかった」。
//
// 🔴 **なぜ「優先権」では足りなかったか**: main.js の `delegateToPlayerForEffect` は、委任中だけ
// 優先権をその席へ移している（ユーザー要望で入れたもの）。ところが `transferPriorityTo()` は
// **その対局でまだ一度も優先権が初期化されていない（＝ターンタイマーがOFF）と何もしない**。
// タイマーは既定でOFFなので、**普通の対局では優先権が終始 null ＝ この移譲が丸ごと無効**で、
// 右下の表示も「自分のターンです」のままだった（報告時もタイマーOFFだったとユーザー確認済み）。
//
// ⚠ **優先権の方を初期化する手（`initializeIfUnset: true`）は採らなかった。** 接触の解決では
// #61 でそれをやっているが、あれを全員効果にも広げると**その対局の以後ずっと優先権が存在する**
// ことになり、`nextTurn()` を呼ぶ経路のどれか1つでも同期を忘れていると**右下が嘘をつき続ける**
// （`NEXT_TURN` は priorityPlayer を触らないので、`transferPriorityToNextTurnPlayer` の呼び忘れが
// そのまま表に出る）。**見せたいのは表示だけ**なので、ゲームの状態には一切触らない形にした。
//
// 【安全側の作り】`release()` の呼び忘れで表示が永久に残らないよう、**古くなった記録は自動で
// 無視する**（下記 STALE_MS。タイマーを持たず、見る時に判定するだけ）。委任の返事待ちは
// main.js 側で90秒まで待つので、それより十分長くとる。

const STALE_MS = 150000; // 2分半。90秒の返事待ちより長く、かつ「永久に残る」ことはない長さ

// 入れ子になり得る（効果の解決中にさらに別の委任が起きる）ので、積んで持つ。
let stack = [];
let changeHandlers = new Set();

function notifyChange() {
  for (const fn of changeHandlers) {
    try {
      fn();
    } catch (err) {
      // 表示の更新に失敗しても、効果の解決は止めない。
      console.error("effect delegation change handler failed", err);
    }
  }
}

// 表示を持っている側（phase-automation.js）が登録する。委任の始まり／終わりで呼ばれる。
// 🔴 これが無いと、委任の間に render() が走らない経路（ローカルのCPU戦など）で
// 右下の表示が更新されない＝直したのに出ない、になる。
export function onEffectDelegationChange(fn) {
  if (typeof fn !== "function") return () => {};
  changeHandlers.add(fn);
  return () => changeHandlers.delete(fn);
}

// 委任の始まり。返ってきた関数を**必ず finally で呼ぶ**。
export function beginEffectDelegation(player, taskType) {
  const entry = { player, taskType, at: Date.now() };
  stack.push(entry);
  notifyChange();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    notifyChange();
  };
}

// いま委任している相手（入れ子なら一番内側）。古い記録は無視する。
export function getEffectDelegationTarget() {
  const now = Date.now();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (now - stack[i].at <= STALE_MS) return stack[i].player;
  }
  return null;
}

// 何の処理を委ねているか（記録・診断用）。表示には使っていない。
export function getEffectDelegationTaskType() {
  const now = Date.now();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (now - stack[i].at <= STALE_MS) return stack[i].taskType;
  }
  return null;
}
