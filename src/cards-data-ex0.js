// 0th拡張（0th EDITION 拡張）のカードデータ。NORMAL_CARDS と同じ形。
//
// 枚数はユーザー指示「1色14枚になるようになるべく均等に混ぜる。ONLYカードは1枚ずつ」から計算した。
// 7色98枚＋白4枚＋黒3枚＝105枚。これに虹（なないろの欠片7枚・リメイクのものを使い回す）を
// 足して**112枚**で、リメイクとぴったり同じ枚数になる。
// only: true は「1枚しか入れられない」カード（元のカードに ONLY と印字されている）。
//
// 作り直すには node tools/gen-ex0-text.mjs。**手で直さない**（tools/ex0-cards.mjs が正）。
export const EX0_NORMAL_CARDS = [
  { id: "ex0-orange-bus", name: "オレンジバス", color: "orange", count: 5, note: "特になし。" },
  { id: "ex0-yellow-reach-cancel", name: "リーチキャンセル", color: "yellow", count: 5, note: "特になし。" },
  { id: "ex0-green-lost-forest", name: "迷いの森", color: "green", count: 5, note: "特になし。" },
  { id: "ex0-blue-appraiser", name: "鑑定士の技 -トゥルーアイズ-", color: "blue", count: 5, note: "見るのは選んだマスの１番上のカードである。（１番上の原則） 「ここまで」とは「色を２色宣言する」から「あなたの手札に加える」までである。繰り返すたびに色を宣言し直す。（カードの下線部と同じ範囲） 「このフェイズを終了する」は繰り返さない。" },
  { id: "ex0-pink-wish-for-peace", name: "平和への願い", color: "pink", count: 5, note: "どちらになるかは、次のあなたのターンの開始時に決まる。 条件を満たしたときは、これをあなたの手札に加えない。裏向きにしてそのマスに残す。 「そうでないなら」とは、あなたがこれの上にいない／誰かが手札効果を使った、のどちらかである。" },
  { id: "ex0-purple-hidden-fortune", name: "足下の隠し財産", color: "purple", count: 5, note: "あなたのいるマスも選べる。あなたの隣のマスは選べない。" },
  { id: "ex0-red-beginning", name: "赤のはじまり", color: "red", count: 5, note: "特になし。" },
  { id: "ex0-orange-bus-stop", name: "バスストップ", color: "orange", count: 4, note: "特になし。" },
  { id: "ex0-yellow-gate-charge", name: "ゲートチャージ", color: "yellow", count: 4, note: "特になし。" },
  { id: "ex0-green-creation", name: "大地創造", color: "green", count: 4, note: "特になし。" },
  { id: "ex0-blue-strict-watch", name: "厳重警戒", color: "blue", count: 4, note: "特になし。" },
  { id: "ex0-pink-mystic-fruit", name: "不思議な果実", color: "pink", count: 4, note: "特になし。" },
  { id: "ex0-purple-redo-key", name: "やり直しのカギ", color: "purple", count: 4, note: "特になし。" },
  { id: "ex0-flute-red", name: "色寄せの笛", color: "red", count: 4, note: "特になし。" },
  { id: "ex0-flute-orange", name: "色寄せの笛", color: "orange", count: 4, note: "特になし。" },
  { id: "ex0-flute-yellow", name: "色寄せの笛", color: "yellow", count: 4, note: "特になし。" },
  { id: "ex0-flute-green", name: "色寄せの笛", color: "green", count: 4, note: "特になし。" },
  { id: "ex0-flute-blue", name: "色寄せの笛", color: "blue", count: 4, note: "特になし。" },
  { id: "ex0-flute-pink", name: "色寄せの笛", color: "pink", count: 4, note: "特になし。" },
  { id: "ex0-flute-purple", name: "色寄せの笛", color: "purple", count: 4, note: "特になし。" },
  { id: "ex0-red-joyner", name: "走り人　ジョイナーの走術", color: "red", count: 1, only: true, note: "特になし。" },
  { id: "ex0-orange-mccool", name: "異能者　マックールのネオ・フォース", color: "orange", count: 1, only: true, note: "特になし。" },
  { id: "ex0-yellow-little-mouse", name: "大盗賊　リトルマウスの手癖", color: "yellow", count: 1, only: true, note: "特になし。" },
  { id: "ex0-green-peterhood", name: "森の民　ピーターフッドの日常", color: "green", count: 1, only: true, note: "特になし。" },
  { id: "ex0-blue-jake", name: "歴史家　ジェイクの記憶術", color: "blue", count: 1, only: true, note: "特になし。" },
  { id: "ex0-pink-yaeza", name: "魅惑のヤエザ", color: "pink", count: 1, only: true, note: "特になし。" },
  { id: "ex0-purple-vivian", name: "後援するヴィヴィアン", color: "purple", count: 1, only: true, note: "特になし。" },
  { id: "ex0-white-pure-burger", name: "ピュアバーガー", color: "white", count: 2, note: "特になし。" },
  { id: "ex0-white-someones-shadow", name: "誰かの白きカゲ", color: "white", count: 1, only: true, note: "特になし。" },
  { id: "ex0-white-dragon", name: "我忘れの白き龍", color: "white", count: 1, only: true, note: "【色者】（しきじゃ）とは。これが場に表向きである限り、各プレイヤーのターン終了時に山札から１枚捨て、そのカードの色（捨色）を確認して、①移動先表示に従いこれをそのマスに置く。②その色の効果を得る。 移動先表示（絵の右下の円盤）は、カードの上を上として、緑＝上／黄＝右上／橙＝右／赤＝右下／白＝下／紫＝左下／桃＝左／青＝左上。 カードの向きは、オープンした、または場に表向きで置いたプレイヤーから見て正の方向とする。 他の色者カードが新たに場に出たときは、これを裏向きにする。 これに到達しても、これをあなたの手札に加えない。 効果に記載の無い色が出た場合は何もしない。捨色には黒と白を含む。 任意のマスを選ぶ等の決定行為が必要な場合は、そのターンのプレイヤーが決定する。" },
  { id: "ex0-black-bad-burger", name: "バッドバーガー", color: "black", count: 2, note: "特になし。" },
  { id: "ex0-black-vood-contract", name: "ヴド族との契約", color: "black", count: 1, only: true, note: "特になし。" },
  { id: "ex0-red-crimson-fist", name: "紅の鉄拳", color: "red", count: 4, note: "接触で奪えるカードはSの２倍の枚数である。 【追色S】とは。追色コストをS枚支払う（これと同色のS枚のカードをあなたの手札から捨てる）ことで、次の効果を得る。Sは自然数である。 Sは使う人が決める。あなたの手札にある赤のカードの枚数までである。 Sは１以上なので、赤のカードが手札に１枚も無いならこの手札効果は使えない。 カードの右上の「⬡×S」は、このカードに追色コストがあり、その枚数が決まっていないことを表す印である。" },
];
