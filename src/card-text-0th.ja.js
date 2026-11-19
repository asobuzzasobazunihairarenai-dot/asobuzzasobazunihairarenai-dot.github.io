// 旧0th EDITION（白地に虹の輪の版・2026.04 第2版）のカード面テキスト（日本語）。
//
// 🔴 **card-text.ja.js とは別のファイルにしてある。** あちらは tools/gen-card-text.mjs が
//   「カード効果　テキスト.txt」から丸ごと上書きして作るので、ここに書き足すと次の生成で消える。
//   card-text.js（言語ディスパッチャ）が両方を混ぜて引く。
//
// 文の出どころは tools/0th-text-source.json（アーティファクトで1枚ずつ確認して固めたもの）。
// 作り直すには node tools/gen-0th-text.mjs。**手で直さない**（次の生成で消えるため）。
// ★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω)。選択肢は本文の中に \n・ で並べる。
//
// ⚠ エターナル7種・ファースト7種・なないろの欠片は**リメイクのものを使い回す**ので、ここには無い。
export const CARD_TEXT_OLD0TH_JA = {
  "0th-red-dash": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "１マス移動する。", hand: "このターン、通常の移動をしたなら、１マス移動する。" },
  "0th-red-counterattack": { flavor: "", titleRuby: "はんげき", basic: "", subtitle: "", arrival: "あなたの手札が１番少ないなら、２枚ドローし、あなたの手札を１枚捨てる。", hand: "あなたへの接触の宣言時に使える。その接触を無効にする。あなたはその相手に接触する。" },
  "0th-orange-force": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの隣の１枚をあなたの手札に加える。", hand: "【追色１】相手を１人選ぶ。その相手をカードの置かれた任意のマスへ移動する。" },
  "0th-orange-lost-item": { flavor: "", titleRuby: "だれ　お　もの", basic: "", subtitle: "", arrival: "１枚ドロー。", hand: "相手を１人選ぶ。これをその相手のゲートに裏向きで置く。１枚ドロー。" },
  "0th-yellow-steal": { flavor: "", titleRuby: "とうぞく　わざ", basic: "", subtitle: "", arrival: "１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーの手札から無作為に１枚、あなたの手札に加える。", hand: "上記の到達効果を得る。" },
  "0th-yellow-thunder": { flavor: "", titleRuby: "かみなり", basic: "", subtitle: "", arrival: "あなたのゲートに強制移動する。移動先のカードはオープンしない。", hand: "任意の１マスのカードをすべて捨てる。" },
  "0th-green-peoples-road": { flavor: "", titleRuby: "たみ　みち　けんせつ", basic: "", subtitle: "", arrival: "カードの置かれていない任意の５マスに山札から１枚ずつ裏向きで置く。", hand: "相手の周囲以外の任意の２マスの裏向きのカードを２枚選ぶ。その２枚を裏向きのまま、カードの置かれていない任意の２マスに置く。" },
  "0th-green-rich-whim": { flavor: "", titleRuby: "ふゆうそう　き", basic: "", subtitle: "", arrival: "手札が３枚以上ある全員は、自分の手札から１枚を、カードの置かれていない任意のマスに裏向きで置く。置けなかったカードは捨てる。", hand: "上記の到達効果を得る。" },
  "0th-blue-greedy-bridge": { flavor: "", titleRuby: "ほ　つ　ばし", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・あなたの手札を１枚捨てる。\n・移動前のマスに強制移動する。移動先のカードはオープンしない。", hand: "これをあなたの周囲以外の任意のマスに裏向きで置く。そのマスの周囲のカードから１枚選び、これの直下に置く。" },
  "0th-blue-set-trap": { flavor: "", titleRuby: "しか　わな", basic: "", subtitle: "", arrival: "あなたの手札を半分捨てる。", hand: "これをあなたの周囲以外の任意のマスに裏向きで置く。そのマスの周囲のカードから１枚選び、捨てる。" },
  "0th-pink-disclosure": { flavor: "", titleRuby: "じょうほうかいじ", basic: "", subtitle: "", arrival: "任意の１マスのカードをオープンする。", hand: "２枚ドローして、それらを公開する。それらの手札効果はこのターン使うことができない。" },
  "0th-pink-favorite-flower": { flavor: "", titleRuby: "だれ　す　はな", basic: "", subtitle: "", arrival: "相手を１人選ぶ。これをその相手の手札に加える。このターンにこれがオープンされたのなら、１枚ドロー。", hand: "１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーの周囲の、プレイヤーのいないマスにこれを表向きで置く。１枚ドロー。" },
  "0th-purple-wait": { flavor: "", titleRuby: "ま", basic: "", subtitle: "", arrival: "移動前のマスに強制移動する。移動先のカードはオープンしない。１マス移動する。", hand: "【追色１】相手が最後のロックを宣言した時に使える。相手がロックしようとしたカードを捨てる。その相手はこのターンにロックできない。" },
  "0th-purple-apocalypse": { flavor: "", titleRuby: "よげんしゃ　わざ", basic: "", subtitle: "", arrival: "あなたの手札から１枚を、あなたの周囲の任意のマスに裏向きで置く。", hand: "__色を２色宣言する。１枚ドローして公開する。__そのカードが宣言色なら、下線部の手順を繰り返す。" },
  "0th-white-colorful-hole": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "任意の１マスのカードをすべてあなたの手札に加える。", hand: "１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーのロックしている１枚を、そのプレイヤーに選ばせ、あなたの手札に加える。" },
  "0th-white-rainbow-rain": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "カードのないすべてのマスに山札から１枚ずつ裏向きで置く。", hand: "場の任意の縦または横１列（７マス）を選ぶ。その列に山札から１枚ずつ裏向きで置く。" },
  "0th-black-faded-frog": { flavor: "", titleRuby: "お", basic: "", subtitle: "", arrival: "全員は手札をすべて捨てる。１番少なくロックしているプレイヤーを１人選ぶ。これをそのプレイヤーの手札に加える。", hand: "１番多くロックしている全員は、自分のロックしている１枚を選んで捨てる。あなたの手札をすべて捨てる。" },
  "0th-black-greedy-palette": { flavor: "", titleRuby: "ごうよく", basic: "", subtitle: "", arrival: "あなたの手札をすべて捨てる。", hand: "いつでも使える。色を１色宣言する。相手全員は以下の効果のうち１つ得る。\n・自分の手札から宣言色の１枚を選び、あなたの手札に加える。\n・自分の手札を３枚捨てる。" },
  "0th-black-rainbow-curse": { flavor: "", titleRuby: "のろ", basic: "", subtitle: "", arrival: "これをあなたの空いているロックエリアに表向きで置く。そこへのロックには同色のカードが２枚以上必要になる（ロックフェイズに置けるのは１ターンに１枚のみ）。ロックが済んだら、これを任意のマスに裏向きで置く。これはあなたの手札に加えない。", hand: "１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーは上記の到達効果を得る。" },
};
