// 1st EDITION の通常カード（19種105枚）。NORMAL_CARDS と同じ形。
//
// 7色 × 2種 × 7枚 ＝ 98 ／ 白 3種 各1枚 ＝ 3 ／ 黒 2種 各2枚 ＝ 4。
// これに虹（なないろの欠片7枚・リメイクのものを使い回す）を足して**112枚**で、
// リメイク・0th拡張とぴったり同じ枚数になる。
// situation: true は【状況】カード（場の中央に置かれ、効果が出続ける）。
//
// 作り直すには node tools/gen-1st-text.mjs。**手で直さない**（tools/first-cards.mjs が正）。
export const FIRST_ED_NORMAL_CARDS = [
  { id: "1st-red-poor-march", name: "貧民の行進", color: "red", count: 7, note: "特になし。" },
  { id: "1st-red-unrest", name: "治安悪化", color: "red", count: 7, situation: true, note: "特になし。" },
  { id: "1st-orange-conglomerate", name: "財閥の威光", color: "orange", count: 7, note: "特になし。" },
  { id: "1st-orange-festival", name: "フェスティバル", color: "orange", count: 7, situation: true, note: "特になし。" },
  { id: "1st-yellow-privilege", name: "貴族の特権", color: "yellow", count: 7, note: "特になし。" },
  { id: "1st-yellow-lock-change", name: "ロックチェンジ", color: "yellow", count: 7, note: "特になし。" },
  { id: "1st-green-largesse", name: "大盤振舞", color: "green", count: 7, note: "特になし。" },
  { id: "1st-green-bubble", name: "建設バブル", color: "green", count: 7, situation: true, note: "特になし。" },
  { id: "1st-blue-robbery", name: "苦渋の強盗", color: "blue", count: 7, note: "特になし。" },
  { id: "1st-blue-poor-heart", name: "貧しき心", color: "blue", count: 7, note: "特になし。" },
  { id: "1st-pink-overeating", name: "食べ過ぎ", color: "pink", count: 7, note: "特になし。" },
  { id: "1st-pink-growth", name: "経済成長", color: "pink", count: 7, situation: true, note: "特になし。" },
  { id: "1st-purple-slum", name: "路地裏のスラム街", color: "purple", count: 7, note: "特になし。" },
  { id: "1st-purple-bribe", name: "裏貴族の賄賂", color: "purple", count: 7, note: "特になし。" },
  { id: "1st-white-airship", name: "飛空艇アルヴァ", color: "white", count: 1, note: "特になし。" },
  { id: "1st-white-whim", name: "大富豪の気紛れ", color: "white", count: 1, note: "特になし。" },
  { id: "1st-white-revolution", name: "ドゥエンの革命", color: "white", count: 1, note: "特になし。" },
  { id: "1st-black-depression", name: "デプレッション", color: "black", count: 2, situation: true, note: "特になし。" },
  { id: "1st-black-great-order", name: "偉大なる大号令", color: "black", count: 2, note: "特になし。" },
];

// 1st EDITION の Eカード（7種・各1枚）。ETERNAL_CARDS と同じ形（count を持たない）。
// 🔴 ユーザー判断（2026-11-05）で**リメイクと同じ役回り**＝「相手ゲート侵攻に成功したら、
//   その色のロックエリアへ即ロック」。だから印字の1行目（手札にあるならロックエリアを全部
//   手札に加え…）は使わない（tools/1st-text-source.json から外してある）。
// カードセットが 1st の時だけ、エターナルの山がこの7種になる（cards-data.js の getEternalCards）。
export const FIRST_ED_ETERNAL_CARDS = [
  { id: "eternal-1st-red", name: "走書の赤歴　ジョイナール", color: "red", note: "特になし。" },
  { id: "eternal-1st-orange", name: "強欲の絵本　オレギャング", color: "orange", note: "特になし。" },
  { id: "eternal-1st-yellow", name: "黄王学の薦め　ネロイズム", color: "yellow", note: "特になし。" },
  { id: "eternal-1st-green", name: "新緑の史文　グリングリン", color: "green", note: "特になし。" },
  { id: "eternal-1st-blue", name: "古の蒼書　ティセリオス", color: "blue", note: "特になし。" },
  { id: "eternal-1st-pink", name: "古紙恋書　ラブック", color: "pink", note: "特になし。" },
  { id: "eternal-1st-purple", name: "混沌の論文　カオスペーパー", color: "purple", note: "特になし。" },
];

// 1st EDITION の Fカード（7種・各1枚）。🔴 **まだどの山にも入れない**
//   （ファーストカードを1st のものに差し替えるかは別途相談＝ユーザー指示）。
//   名前・絵・効果文を引けるようにするためだけに持っている（図鑑・拡大表示用）。
// ⚠ 絵は**暫定で印刷データ（完成カード）そのもの**＝文字が焼き込まれている。
export const FIRST_ED_FIRST_CARDS = [
  { id: "first-1st-red", name: "赤のジュエル　ルビナグナ", color: "red", note: "特になし。" },
  { id: "first-1st-orange", name: "橙のジュエル　カリブランス", color: "orange", note: "特になし。" },
  { id: "first-1st-yellow", name: "黄のジュエル　ルミナジア", color: "yellow", note: "特になし。" },
  { id: "first-1st-green", name: "緑のジュエル　ネオリーフィア", color: "green", note: "特になし。" },
  { id: "first-1st-blue", name: "青のジュエル　ラピスティア", color: "blue", note: "特になし。" },
  { id: "first-1st-pink", name: "桃のジュエル　モルガライト", color: "pink", note: "特になし。" },
  { id: "first-1st-purple", name: "紫のジュエル　ラヴェルナイト", color: "purple", note: "特になし。" },
];
