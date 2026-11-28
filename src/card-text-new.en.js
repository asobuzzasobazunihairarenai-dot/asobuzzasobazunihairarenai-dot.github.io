// 🔴【2026-11-28・続き882】新しい無色カード3枚の英語の文。
//
// ⚠ **生成物ではない**（印刷された版がまだ無い）。経緯は `src/cards-data-new.js` の冒頭。
// 🔴【続き904】**効果文の英語を入れた。** それまで名前だけだったので、英語で遊ぶ人には
//   日本語のまま出ていた（card-text.js は「英語が空なら日本語で出す」作り＝だから
//   **誰も気づかない**）。⇒ `tools/check-card-text-en.mjs` にこのセットも足した。
// ⚠ 言い回しは**自分で発明していない**。既にある札から写した:
//   Do not add this to your hand.（ジャンプ台・バスストップ）／
//   Place this face-up on any space.（我忘れの白き龍）／
//   place it directly beneath this（ヴィヴィアン）／ If you do, …（黒の契約）／
//   has locked the fewest（カウンターロック）／ Discard half of your hand.／【Shikija】
export const CARD_TEXT_NEW_EN = {
  "new-white-young-dragon": {
    name: "Nox Aether Hatchling, the Bewildered",
    flavor: "It has not yet learned how to forget.",
    basic: "【Shikija】\n{白}Players within 3 spaces draw 1 card.\n{黒}Players within 3 spaces discard half of their hand.",
    arrival: "You are forced to move 1 space.",
    hand: "Place this face-up on any space.",
  },
  "new-white-cubit": {
    name: "Cubit, the Box Cat Who Favours the Weak",
    flavor: "It curls up only in the emptiest hands.",
    arrival: "Draw 1 card. Place this face-down adjacent to the player who has locked the fewest.",
    hand: "Place this face-up on any space.",
  },
  "new-white-tower": {
    name: "The White Tower That Calls for Shien",
    flavor: "What is piled here burns all at once.",
    arrival:
      "Do not add this to your hand. Each player may place 1 card face-up from their hand directly beneath this and draw 2 cards.\n" +
      "You may discard 1 card you have locked. If you do, discard this card.",
    hand: "Place this face-up on any space.",
  },
};
