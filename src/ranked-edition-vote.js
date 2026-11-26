// ランク戦で遊びたいエディションの希望（**事前投票**）。
//
// 【何のため】ユーザー判断（続き861）「ランク戦では基本エディションが並び、参加者が
//   エディション投票！割れれば投票されたものの中からランダム」＋「投票は**事前に
//   マイページから**決めておけるようにしよう！」。
//
// 🔴 なぜ事前か: レディチェックの窓は **62秒しかない**（supabase_setup_so7.sql の
//   so7_ranked_poll。ロックから62秒で締め切り、押さなかった人はキューから外れる）。
//   そこに9箱の投票は入らないので、**待っている間に決めておく**形にした。
//
// 🔴 持ち方は**順番付きの配列**。いまは1件だけ入れるが、将来「第一候補・第二候補」に
//   増やしても**持ち方を作り直さなくてよい**（サーバーも最初から重み付けで数えている）。
//
// ⚠ import を1つも持たない葉に近い形で保つ（pref-registry.js だけ。あれも葉）。
//   ⇒ どこから読んでも循環しない。
import { registerSyncedPref } from "./pref-registry.js";

const 鍵 = "so7-ranked-edition-votes";
const 上限 = 4; // 第一〜第四候補まで（サーバーの重み付けも4位以降は同じ重み）

let 希望 = [];
try {
  const 生 = localStorage.getItem(鍵);
  const v = 生 ? JSON.parse(生) : null;
  if (Array.isArray(v)) 希望 = v.filter((x) => typeof x === "string" && x).slice(0, 上限);
} catch (err) { /* 読めなければ希望なし＝おまかせ */ }

export function getRankedEditionVotes() {
  return 希望.slice();
}

// 配列を丸ごと差し替える。順番がそのまま優先順位（先頭＝第一候補）。
export function setRankedEditionVotes(arr) {
  const 次 = Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x).slice(0, 上限) : [];
  // 同じ版を2回入れても意味が無いので落とす（重み付けが狂う）。
  希望 = [...new Set(次)];
  try { localStorage.setItem(鍵, JSON.stringify(希望)); } catch (err) { /* 端末に保存できなくてもアカウント側へは乗る */ }
  return getRankedEditionVotes();
}

// 🔴 アカウントにも保存する（extra_prefs の jsonb に入るので **SQLの追加は要らない**
//   ＝pref-registry.js の冒頭の説明どおり）。別の端末でも希望が引き継がれる。
registerSyncedPref("rankedEditionVotes", () => getRankedEditionVotes(), (v) => {
  if (Array.isArray(v)) setRankedEditionVotes(v);
});
