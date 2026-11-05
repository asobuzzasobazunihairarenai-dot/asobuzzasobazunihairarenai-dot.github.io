// どの「カードセット」で山札を組むかを覚えておく、ごく小さなモジュール。
//
// 【何のため】0th拡張（0th EDITION 拡張）の33種を、**管理者だけ**がテストで遊べるようにする。
//   遊んでいる人には何も変わらない（既定は今までどおりリメイクの33種）。
//
// 🔴 **このファイルは何も import しない葉にしてある。**
//   cards-data.js / state.js / 画面側の複数から読まれるので、何かを import すると
//   循環 import になり得る（続き573 で実際に TDZ で落ちている）。
//   「管理者かどうか」も**ここでは判定しない**——判定は online.js の isAdminUser() が持っていて、
//   あれを import すると online.js → state.js → cards-data.js → ここ、と輪になる。
//   ⇒ **選べるかどうかは画面側が決め、ここは「選ばれた値を覚えるだけ」**にする。
//
// ⚠ オンライン（フレンドリーマッチ）では、**部屋を作った人の設定が全員に効く**必要がある。
//   片方だけ別のセットだと盤面が食い違う。部屋の持ち物として渡す形は online 側で扱う。

export const CARD_SETS = {
  REMAKE: "remake", // リメイクの33種（既定）
  EX0: "ex0", // 0th拡張の33種＋なないろの欠片
  FIRST_ED: "1st", // 1st EDITION の19種＋なないろの欠片（2026-11-05 追加）
  MIXED: "mixed", // 全部まぜる（枚数は単純に合算。試験用）
};

const KEY = "so7-card-set";
const 有効 = new Set(Object.values(CARD_SETS));

let 現在 = CARD_SETS.REMAKE;
try {
  const v = localStorage.getItem(KEY);
  if (v && 有効.has(v)) 現在 = v;
} catch (e) {
  // プライベートウィンドウ等で読めないことがある。既定のままで困らない。
}

// 対局の途中で変わると盤面と山札が食い違うので、**次の対局から効く**形にする。
// （いま走っている対局の state は createInitialState の時点の山札を持っている）
let 対局中の値 = null;

export function getCardSet() {
  return 対局中の値 || 現在;
}

export function setCardSet(v) {
  if (!有効.has(v)) return false;
  現在 = v;
  try {
    localStorage.setItem(KEY, v);
  } catch (e) {
    /* 覚えられなくても、そのセッションの間は効く */
  }
  for (const fn of 購読) {
    try {
      fn(v);
    } catch (e) {
      console.error("[card-set] 購読先で例外", e);
    }
  }
  return true;
}

// オンラインの部屋など、「この対局はこのセット」と外から決められた時に使う。
// null を渡すと端末の設定に戻る。
export function lockCardSetForGame(v) {
  対局中の値 = v && 有効.has(v) ? v : null;
}

const 購読 = new Set();
export function onCardSetChange(fn) {
  購読.add(fn);
  return () => 購読.delete(fn);
}

// 画面に出す名前（ui-text を import しないで済むように、呼ぶ側が訳す前提の素の文字列）。
export const CARD_SET_LABEL_JA = {
  [CARD_SETS.REMAKE]: "リメイク（33種）",
  [CARD_SETS.EX0]: "0th拡張（33種）",
  [CARD_SETS.FIRST_ED]: "1st EDITION（19種）",
  [CARD_SETS.MIXED]: "まぜる（全部）",
};
export const CARD_SET_LABEL_EN = {
  [CARD_SETS.REMAKE]: "Remake (33 cards)",
  [CARD_SETS.EX0]: "0th Expansion (33 cards)",
  [CARD_SETS.FIRST_ED]: "1st EDITION (19 cards)",
  [CARD_SETS.MIXED]: "Mixed (all)",
};
