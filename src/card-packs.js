// 「カードの持ち物・パック・ワイルドカード」（2026-11-15・続き726 → 🔴 続き728 で
// アカウントに紐づけ、引くのをサーバーへ移した）。
//
// 🔴 ユーザー判断（2026-11-15）:
//   ・「**もちろんアカウントに持たせます**」
//   ・「**マイ山札に7枚入れるには、その札を7枚持っている必要がある**」（MTGA 方式）
//   ・「**同じ種類で7枚以上になったダブりはワイルドカードの欠片に。数枚溜まるとワイルドカードに
//     なって任意のカードと交換。オンリーワイルドとノーマルワイルドを用意**」
//   ・「**カケラで買う**」「**デイリー／ウィークリー報酬**」
//
// ■ 置き場所
//   持ち物は**全部サーバー**（supabase_setup_so7.sql の so7_user_cards と so7_user_currency）。
//   🔴 **引くのもサーバー**（so7_open_pack）。クライアントで引くと「欲しい札が出るまで
//   やり直す」ができてしまう。このファイルは**読んだ結果を覚えておくだけ**。
//
// ■ リメイクの33種は「最初から全員が7枚ずつ持っている」扱い
//   表には入れない。⇒ ①いま遊んでいる人の出来ることが1つも減らない ②行が増えない
//   ③配り直しの移行作業が要らない。`copiesOf()` がそこを吸収する。
//
// 🔴 **このファイルは online.js を import しない**（online.js → state.js → cards-data.js →
//   my-stack.js と繋がっているので、輪になる恐れがある）。通信は**後から注入**してもらう
//   （card-back-skins.js の registerMyDeckPersistence と同じ作法）。

// ⚠ ここの4つは **supabase_setup_so7.sql の値と必ず同じ**にする。
//   値段を決めているのはサーバー（クライアントから cost を受け取ると 0 を渡せてしまう）。
//   ここに在るのは**画面に出すため**。tools/check-card-packs.mjs が両方を照合する。
export const PACK_SIZE = 7; // 1パックの枚数（セブンになぞらえて＝続き727）
export const PACK_COST = 100; // 1パックのかけら
export const COPY_MAX = 7; // 同じ名前は7枚まで（公式の山札カスタマイズルール②）
export const WILD_PER = 7; // 欠片7個でワイルドカード1枚（ユーザー判断）

// ── 通信の注入（online.js が main.js 経由で入れる）─────────────────────────
let 通信 = null;
export function registerCollectionTransport(fns) {
  通信 = fns || null;
}
export function isCollectionReady() {
  return !!通信?.isLoggedIn?.();
}

// ── 覚えている中身（サーバーから読んだもの）───────────────────────────────
let 持ち物 = 空の持ち物();
function 空の持ち物() {
  return {
    balance: 0,
    packs: 0,
    wildShards: 0,
    wildCards: 0,
    onlyShards: 0,
    onlyCards: 0,
    cards: {}, // { cardId: 枚数 }（リメイクの33種は**入らない**）
    daily: null,
    weekly: null,
    読んだ: false,
  };
}

function 入れる(o) {
  if (!o || typeof o !== "object") return;
  持ち物 = {
    balance: Number(o.balance) || 0,
    packs: Number(o.packs) || 0,
    wildShards: Number(o.wildShards) || 0,
    wildCards: Number(o.wildCards) || 0,
    onlyShards: Number(o.onlyShards) || 0,
    onlyCards: Number(o.onlyCards) || 0,
    cards: o.cards && typeof o.cards === "object" ? { ...o.cards } : {},
    daily: o.daily || null,
    weekly: o.weekly || null,
    読んだ: true,
  };
  知らせる();
}

export function getCollection() {
  return 持ち物;
}

// ── 所持枚数 ───────────────────────────────────────────────────────────────
// 🔴 **リメイクの33種は常に上限まで持っている扱い**（サーバーの表には入れない）。
//   判定は「id に `ex0-` / `1st-` が付いているか」ではなく、**呼ぶ側が渡す**
//   （ここは葉なのでカードの表を知らない）。渡されなければ「拡張ではない＝持っている」。
export function copiesOf(cardId, isExpansion) {
  if (!isExpansion) return COPY_MAX;
  return Math.max(0, Math.floor(Number(持ち物.cards[cardId]) || 0));
}
export function ownsCard(cardId, isExpansion) {
  return copiesOf(cardId, isExpansion) > 0;
}
export function getOwnedCardIds() {
  return Object.keys(持ち物.cards).filter((id) => 持ち物.cards[id] > 0);
}

// ── サーバーを呼ぶ ─────────────────────────────────────────────────────────
// どれも「失敗したら例外」。画面側が文言を出し分ける（未ログイン・残高不足・SQL未実行など）。
async function 呼ぶ(名, ...args) {
  if (!通信?.[名]) throw new Error("not_ready");
  const o = await 通信[名](...args);
  return o;
}

export async function refreshCollection() {
  if (!isCollectionReady()) {
    持ち物 = 空の持ち物();
    知らせる();
    return 持ち物;
  }
  入れる(await 呼ぶ("getCollection"));
  return 持ち物;
}
export async function buyPacks(n = 1) {
  入れる(await 呼ぶ("buyPack", n));
  return 持ち物;
}
// 戻り値: [{ cardId, only, isNew, shard, rare }]（めくる順。最後の1枚がレア枠）
export async function openPack() {
  const res = await 呼ぶ("openPack");
  入れる(res?.collection);
  return Array.isArray(res?.drawn) ? res.drawn : [];
}
export async function redeemWildcard(cardId) {
  入れる(await 呼ぶ("redeemWildcard", cardId));
  return 持ち物;
}
export async function claimDailyChallenge() {
  入れる(await 呼ぶ("claimDailyChallenge"));
  return 持ち物;
}
export async function claimWeekly() {
  入れる(await 呼ぶ("claimWeekly"));
  return 持ち物;
}
// 対局の区切りで呼ぶ（kind: "win" / "play" / "lock"）。失敗しても対局は止めない。
export async function noteProgress(kind, amount = 1) {
  if (!isCollectionReady()) return;
  try {
    入れる(await 呼ぶ("noteProgress", kind, amount));
  } catch (err) {
    console.error("noteProgress failed", err);
  }
}
// 管理用。
export async function adminGrantAllCards() {
  入れる(await 呼ぶ("adminGrantAll"));
  return 持ち物;
}
export async function adminResetCards() {
  入れる(await 呼ぶ("adminReset"));
  return 持ち物;
}

const 購読 = new Set();
export function onCardPacksChange(fn) {
  購読.add(fn);
  return () => 購読.delete(fn);
}
function 知らせる() {
  for (const fn of 購読) {
    try {
      fn(持ち物);
    } catch (e) {
      console.error("[card-packs] 購読先で例外", e);
    }
  }
}
