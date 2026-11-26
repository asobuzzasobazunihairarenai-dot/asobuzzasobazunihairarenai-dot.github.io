// 「他のカードの効果の対象にならない」の、**唯一の持ち主**（続き863で新設・続き865で書き直し）。
//
// ─────────────────── 決まり（ユーザー裁定 2026-11-26・案A）───────────────────
//
// 🔴 **公開されている札は対象にできない。秘匿の札は対象にできる。**
//
// 理屈（ユーザーの言葉）: 「裏向きの場合（つまり秘匿の場合）対象にできる。例えば白龍が
//   裏向きで場にあった時、そのマスのカードを破壊するカード効果で破壊することは可能です。
//   **あくまでカード効果が対象にしたのは「白龍」ではなく「そのマスの裏向きのカード」である**
//   からです。」
//
// | 居る所 | 公開か | 対象にできるか |
// |---|---|---|
// | ロックエリア | 常に表向き＝公開 | ❌ できない |
// | 表向きのマス | 公開 | ❌ できない |
// | 公開ドローエリア | 誰が何を引いたか全員に見える＝公開 | ❌ できない |
// | **裏向きのマス** | 秘匿 | ✅ **できる** |
// | **手札** | 秘匿 | ✅ **できる** |
//
// 🔴 **この決まりに変えた一番の理由は、前の作りが秘匿情報を漏らしていたこと。**
//   迷いの森（隣のカードを捨てる）が**裏向きの龍のマスだけ黙って飛ばして**いたので、
//   「なぜかこの1マスだけ捨てられない」＝**そこが龍だと全員に分かった**。
//   しかも盤面に出得る「対象にならない札」は**龍だけ**（ファースト／エターナルは山に入らず、
//   必ずロックエリア）なので、飛ばした時点で正体が確定していた。
//
// ⓘ **ファースト／エターナルは何も変わらない。** あれらは必ずロックエリアに表向きで在る
//   （state.js の faceUpForLocation が lock を常に true にしている）ので、常に守られる。
//   ⇒ **この決まりで挙動が変わるのは我忘れの白き龍だけ。**
//
// ─────────────────── 使い方 ───────────────────
//
// 🔴 **一覧を組む所では `isTargetableToken(トークン)` を使う。**
//   `isProtectedCardKind(cardId)` は「その種類かどうか」を見るだけで、**公開されているかを
//   見ていない**ので、targeting の判定にそのまま使ってはいけない。
//
// ⚠ `tools/check-untargetable.mjs`（検査30本目）が、よそでの手写しと使い分けの間違いを見つける。
// ⚠ 葉のモジュール（**何も import しない**）にしてある。どこから読んでも輪にならない。

// 命名規則では拾えない札を名指しで足す所。
export const NOT_TARGETABLE_CARD_IDS = new Set(["ex0-white-dragon"]);

// その cardId が「守られ得る種類」か（＝公開されていれば対象にできない札か）。
// 🔴 これ単体で targeting を決めない。公開されているかは isTargetableToken が見る。
export function isProtectedCardKind(cardId) {
  if (!cardId) return false;
  if (NOT_TARGETABLE_CARD_IDS.has(cardId)) return true;
  return cardId.startsWith("eternal-") || cardId.startsWith("first-");
}

// その札が、いま**公開されている**か（中身が全員に分かっているか）。
// ⚠ 手札の faceUp は「自分の画面で見えるか」でしかない（state.js の faceUpForLocation は
//   zone==="hand" で `location.player === "A"` を返す）ので、**手札の判定に faceUp を使わない**。
//   居る所で決める。
export function isCardIdentityPublic(token) {
  const zone = token?.location?.zone;
  if (zone === "lock") return true; // ロックエリアは常に表向き
  if (zone === "publicDraw") return true; // 公開ドローは誰が何を引いたか全員に見える
  if (zone === "hand") return false; // 手札は秘匿
  if (zone === "cell") return !!token.faceUp; // 盤面は表裏そのまま
  return false; // それ以外（山札・捨て場等）はトークンとして存在しない
}

// 🔴 **これが targeting の判定。** 他のカードの効果で、この札に触れるか。
export function isTargetableToken(token) {
  if (!token) return false;
  if (!isProtectedCardKind(token.cardId)) return true; // ふつうの札はいつでも触れる
  return !isCardIdentityPublic(token); // 守られ得る札でも、秘匿なら触れる
}

// トークンの配列から、他のカードの効果で触れるものだけを残す。
export function filterTargetableTokens(tokens) {
  return (tokens || []).filter((t) => isTargetableToken(t));
}

// ⚠ 続き863〜864 の名前（cardId だけを見る古い判定）。**新しく使わないこと。**
//   消さないのは、端末のキャッシュに残った古い main.js がこれを import しているため
//   （公開済みの src/*.js からは export を消さない＝続き423 の実害と同じ家族）。
export function isTargetableByOtherCardEffects(cardId) {
  return !isProtectedCardKind(cardId);
}
