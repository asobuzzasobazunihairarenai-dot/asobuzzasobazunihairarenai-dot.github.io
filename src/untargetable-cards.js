// 「他のカードの効果の対象にならない」札の、**唯一の持ち主**（続き863）。
//
// docs/rulebook.md「ファーストカード/エターナルカード: 他のカードの効果の対象にならない
// （**奪われたり捨てることはできない**）」。
// 0th拡張 我忘れの白き龍（`ex0-white-dragon`）も ★「これは他のカードの効果の対象に
// ならない。」を持つ（cardId の命名規則では拾えないので名指しで足す）。
//
// 🔴 **なぜ切り出したか（#829 の実害）**
//   この決まりは **4通りの書き方で手写し**されていて、**2か所では丸ごと抜けていた**:
//     - card-effect-engine.js … 自前の private 関数（龍を含む・正しい）
//     - main.js のゴメンナサイッ！… `!startsWith("eternal-") && !startsWith("first-")`
//                                   ＝**龍が抜けていた**
//     - 🔴 main.js のヤエザ②「自分のロックしている１枚を捨てる」… **守りが無い**
//          ⇒ **ファーストカードを捨てられた**（報告 #829）
//     - 🔴 main.js のいろ落ちガエル■「ロックしている１枚を捨てる」… **守りが無い**
//   エンジンの関数が **export されていなかった**ので、よそで一覧を組む人は必ず書き写す
//   ことになり、書き写すたびに1つずつ欠けていった。
//
// ⚠ **新しく「誰かの札を捨てる／奪う／動かす」一覧を組む時は、必ずこれを通すこと。**
//   `tools/check-untargetable.mjs`（検査30本目）が、よそでの手写しを見つけて落とす。
//
// ⚠ 葉のモジュールにしてある（**何も import しない**）ので、どこから読んでも輪にならない。

// 命名規則では拾えない札を名指しで足す所。
export const NOT_TARGETABLE_CARD_IDS = new Set(["ex0-white-dragon"]);

// その札が「他のカードの効果の対象になる」か。false ＝ 奪えない・捨てられない。
export function isTargetableByOtherCardEffects(cardId) {
  if (!cardId) return true;
  if (NOT_TARGETABLE_CARD_IDS.has(cardId)) return false;
  return !cardId.startsWith("eternal-") && !cardId.startsWith("first-");
}

// トークンの配列から、他のカードの効果で触れるものだけを残す。
// ⚠ 一覧を組む所では、こちらを使うと書き間違えようがない。
export function filterTargetableTokens(tokens) {
  return (tokens || []).filter((t) => isTargetableByOtherCardEffects(t?.cardId));
}
