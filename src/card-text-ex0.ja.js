// 0th拡張（0th EDITION 拡張）のカード面テキスト（日本語）。
//
// 🔴 **card-text.ja.js とは別のファイルにしてある。** あちらは tools/gen-card-text.mjs が
//   「カード効果　テキスト.txt」から丸ごと上書きして作るので、ここに書き足すと次の生成で消える。
//   card-text.js（言語ディスパッチャ）が両方を混ぜて引く。
//
// 文の出どころは tools/ex0-text-source.json（アーティファクトで1枚ずつ確認して固めたもの）。
// 作り直すには node tools/gen-ex0-text.mjs。**手で直さない**（次の生成で消えるため）。
// ★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω)。選択肢は本文の中に \n・ で並べる。
export const CARD_TEXT_EX0_JA = {
  "ex0-orange-bus": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "「バスストップ」のあるマスに移動する。これをあなたの隣に表向きで置く。その「バスストップ」をあなたの手札に加える。", hand: "これをあなたの隣以外のマスに表向きで置く。" },
  "ex0-yellow-reach-cancel": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "移動前のマスに強制移動する。", hand: "無色以外のカードの到達効果の処理の直前に使える。そのカードの効果を無効にし、そのカードを捨てる。" },
  "ex0-green-lost-forest": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "１枚ドロー。カードの置かれていない４マスに山札から１枚ずつ裏向きで置く。あなたの隣のカードをすべて捨てる。", hand: "これをあなたの隣以外の、プレイヤーのいないマスに表向きで置く。" },
  "ex0-blue-appraiser": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "任意の１マスの裏向きのカードの表面を見る。", hand: "色を２色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンし、あなたの手札に加える。そのカードが宣言色なら、ここまでを繰り返す。このフェイズを終了する。" },
  "ex0-pink-wish-for-peace": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "次のあなたのターンの開始時、あなたがこれの上にいて、その間に誰も手札効果を使っていないなら、全員は２枚ドローし、これを裏向きにする。そうでないなら、これをあなたの手札に加える。", hand: "１枚ドロー。これをあなたの隣以外のマスに裏向きで置く。" },
  "ex0-purple-hidden-fortune": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの隣以外の、カードの置かれたマスを１マス選ぶ。１枚ドローして公開する。そのカードを選んだマスの１番下に表向きで置く。", hand: "以下の効果のうち１つ得る。\n・上記の到達効果を得る。\n・あなたの手札から１枚を、カードの置かれた任意のマスの１番下に表向きで置く。" },
  "ex0-red-beginning": { flavor: "その無垢な表情にはたしかに赤の意志が宿っていた／この灯火は誰かに授けられたものなのか、自らの火なのか", titleRuby: "", basic: "", subtitle: "", arrival: "捨て場の１番上のカードをあなたの手札に加える。", hand: "上記の到達効果を得る。このフェイズを終了する。" },
  "ex0-orange-bus-stop": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "これはあなたの手札に加えない。このターンにこれがオープンされたのなら、１枚ドロー。", hand: "以下の効果のうち１つ得る。\n・あなたの手札を１枚捨てる。これを任意のマスに表向きで置く。\n・これを任意のマスに裏向きで置く。" },
  "ex0-yellow-gate-charge": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "１枚ドロー。このターンにこれがオープンされたのなら、これをあなたのゲートに表向きで置く。そうでないなら、移動前のマスに強制移動し、これを捨てる。ただし相手のゲートへは移動できない。", hand: "これをあなたのゲートに表向きで置く。" },
  "ex0-green-creation": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "何もない４マスに山札から１枚ずつ裏向きで置く。それらをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-blue-strict-watch": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・あなたの手札が１枚になるように捨てる。\n・あなたのゲートに強制移動する。移動先のカードはオープンしない。", hand: "これをプレイヤーのいないマスに表向きで置く。" },
  "ex0-pink-mystic-fruit": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの手札が奇数枚なら１枚ドロー。", hand: "あなたの隣の２マス以上にカードが置かれている時に使える。１枚ドロー。あなたの右隣の相手が、あなたを１マス移動させる。このターンを終了する。" },
  "ex0-purple-redo-key": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの手札を任意の枚数捨ててもよい。捨てた枚数分ドロー。", hand: "相手がロックを宣言した時に使える。その相手はこのターンにロックできない。" },
  "ex0-flute-red": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-orange": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-yellow": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-green": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-blue": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-pink": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-flute-purple": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・これと同色の、場の表向きのカード１枚をあなたの手札に加える。\n・任意の１マスのカードをオープンする。", hand: "上記の到達効果を得る。" },
  "ex0-red-joyner": { flavor: "「何も無い場所を走り続ける、だからこそ大切なものに気付けるんだ。」── 走り人　ジョイナー", titleRuby: "", basic: "", subtitle: "", arrival: "１マス強制移動する。", hand: "何もないあなたの隣のマスに強制移動することを、任意の回数繰り返す。このターンを終了する。" },
  "ex0-orange-mccool": { flavor: "「私は特別だ。君か？君ももちろん特別さ。早くそれに気付くといい。」── 異能者　マックール", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの隣のマスのカードを２枚、あなたの手札に加える。", hand: "【追色１】相手を１人選ぶ。その相手の周囲に強制移動する。移動先のカードはオープンしない。このターンを終了する。" },
  "ex0-yellow-little-mouse": { flavor: "「弱者、強者、私はいつか世界から〝不平等〟を頂戴する」── 大盗賊　リトルマウス", titleRuby: "", basic: "", subtitle: "", arrival: "１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーの手札から無作為に２枚、あなたの手札に加える。", hand: "いつでも使える。上記の到達効果を得る。あなたのターンに使ったなら、このターンを終了する。" },
  "ex0-green-peterhood": { flavor: "「自然は育まれ、民に平等だ。僕もそうでありたいと思うよ。」── 森の民　ピーターフッド", titleRuby: "", basic: "", subtitle: "", arrival: "あなたの隣に山札から３枚ずつ裏向きで置く。", hand: "１〜７の数字を１つ選ぶ。全員は手札がその枚数になるようにドローする、または捨てる。このフェイズを終了する。" },
  "ex0-blue-jake": { flavor: "「この世界をもっと知りたい。過去も、そして未来も。」── 歴史家　ジェイク", titleRuby: "", basic: "", subtitle: "", arrival: "任意の７マスの裏向きのカードの表面を見る。", hand: "色を１色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンする。そのカードが宣言色なら、ここまでを繰り返す、ただし計７枚までしかオープンできない。７枚目が宣言色なら、それら７枚をあなたの手札に加える。このターンを終了する。" },
  "ex0-pink-yaeza": { flavor: "「気付いたころには、みんな私に奪われてるでしょうね。ふふふ。」── 魅惑のヤエザ", titleRuby: "", basic: "", subtitle: "", arrival: "相手を１人選ぶ。その相手はこれを自分の手札に加え、以下の効果のうち１つ得る。\n・自分の手札をすべて捨てる。１枚ドロー。\n・自分のロックしている１枚を捨てる。", hand: "上記の到達効果を得る。" },
  "ex0-purple-vivian": { flavor: "「優しさで満ち溢れた世界、私はそれを強く望むわ。」── 後援するヴィヴィアン", titleRuby: "", basic: "", subtitle: "", arrival: "相手を１人選ぶ。その相手はムーブフェイズを行う。その相手が到達したカードを自分の手札に加えるなら、代わりにそのカードをあなたの手札に加える。", hand: "上記の到達効果を得る。" },
  "ex0-white-pure-burger": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "プレイヤーのいないマスを１マス選ぶ。全員は１枚ドローし、自分の手札から１枚をそのマスの１番上に置く。", hand: "任意の１マスを選ぶ。そのマスの裏向きのカードの枚数分ドロー。" },
  "ex0-white-someones-shadow": { flavor: "「なぜこのようなことになってしまっているのだ。」── 無色の者／何か知っているような口ぶりでそっと力を貸した", titleRuby: "", basic: "", subtitle: "", arrival: "これを捨てる。このマスから十字方向の計１２マスに山札から１枚ずつ裏向きで置く。それらをすべてオープンする。", hand: "これをあなたの周囲以外のマスに裏向きで置く。" },
  "ex0-white-dragon": { flavor: "暴れている…冷静になれぬ理由ももはや覚えていないのであろう", titleRuby: "", basic: "これは他のカードの効果の対象にならない。", subtitle: "", arrival: "１枚ドロー。１マス強制移動する。", hand: "これを任意のマスに表向きで置く。" },
  "ex0-black-bad-burger": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "１枚ドロー。場の中央と四隅のマスのうち、プレイヤーのいないマスを１マス選ぶ。あなたの手札をすべて、そのマスの１番上に置く。", hand: "任意の１マスのカードをすべて捨てる。１枚ドロー。" },
  "ex0-black-vood-contract": { flavor: "契約とは時に一方的なものだ", titleRuby: "", basic: "", subtitle: "", arrival: "全員は手札が２枚以下になるように捨てる。そうしたなら、自分の手札を１枚ロックしてもよい、ただし最後のロックはできない。", hand: "上記の到達効果を得る。" },
  "ex0-red-crimson-fist": { flavor: "", titleRuby: "", basic: "", subtitle: "", arrival: "以下の効果のうち１つ得る。\n・【追色１】２枚ドロー。\n・あなたの周囲の相手を１人選ぶ。その相手に接触する。", hand: "【追色S】あなたの周囲の相手を１人選ぶ。その相手に接触する。" },
};
