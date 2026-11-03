// カード効果の構造化データ（DSL）試作。ユーザーと相談の上決めた方針:
// ・カード効果を「動詞（verb）＋パラメータ」の配列として表現する。
// ・効果テキストは保存せず、常にこのデータから毎回その場で生成する
//   （generateEffectText参照。データを1箇所直せば表示文もズレなく追従する）。
// ・将来的にはカード画像のテキスト欄を空欄にして、この生成テキストを重ねて表示する構想がある。
//
// 🔴【2026-10-16 訂正】ここには長らく「**まだゲーム本体には一切配線していない、パイロット5枚
// だけの設計たたき台**」と書いてあったが、**とっくに本番で全カードを動かしている**（下の
// CARD_EFFECTS は全34種ぶん揃っており、card-effect-engine.js が実際に実行している）。
// 古い説明のまま置いておくと、次に読む人が「この仕組みは使われていない」と誤解するので直した。
// **揃っているかは `node tools/check-cards.mjs` が見ている**（カードを足して効果データを
// 忘れると、その場で名前を挙げて教えてくれる）。
//
// 【当初のパイロット5枚】最初にこの形で書けるかを試した5枚（いまは全カードが入っている）:
//   1. ゴメンナサイッ！   - 最小構成（動詞1つ・数量1つだけ）
//   2. 奇跡の森 マンズウッド - 「ドロー」動詞＋「追色」コストの最小構成
//   3. ジャンプ台         - 「効果カード自身は手札に加えない」という既定動作の上書き
//   4. 収穫と種まき       - 対象選択＋連続する2アクション（拾う→置く、同じマスを参照）
//   5. 黄金の宮殿 ドムス・ネロ - 自分/相手全員で数量が違う複数ターゲット＋使用回数制限
//
// このデータ構造で表現しきれないカードが見つかるたびに、動詞・パラメータの語彙を
// 増やしていく想定（このファイル冒頭のVERBS一覧がそのまま「今サポートしている動詞」の
// 一覧になる）。

// --- 語彙（今回のパイロット5枚を表現するのに必要な最小セット） -----------------------
// verb一覧。新しいカードを追加するたびに、ここに無い動詞が必要になったら追記する。
import { t } from "./ui-text.js"; // UI英語化フェーズ11（選択肢ラベルの解決に使う）

export const VERBS = {
  MOVE: "move", // 自分の駒を移動する
  DRAW: "draw", // 山札から手札にカードを加える
  PICKUP_TO_HAND: "pickup_to_hand", // 盤面上のカードを手札に加える
  PLACE_CARD: "place_card", // 手札または山札からマスにカードを置く
  DISCARD_SAME_COLOR: "discard_same_color", // 「追色」コスト: 同色のカードを手札から捨てる
  SWAP_POSITION: "swap_position", // 自分の駒と、範囲内にいる相手の駒の位置を入れ替える（「移動」ではない）
  LOCK_PAIR: "lock_pair", // なないろの欠片専用: 手札の同名2枚を任意のロックスロットへまとめてロックする
  DRAW_IF_FEWEST_LOCKED: "draw_if_fewest_locked", // カウンターロック専用: 自分のロック枚数が全員中で最少（同率含む）なら1枚ドロー
  SWAP_RANDOM_HAND_CARD: "swap_random_hand_card", // 手品師の技専用: 選んだ相手と、互いの手札から無作為に1枚ずつ交換する
  DRAW_ALL_FEWEST_LOCKED: "draw_all_fewest_locked", // プレゼント専用: ロック枚数が全員中で最少（同率含む）の全員がそれぞれ1枚ドロー
  DISCARD_ALL_FACEUP_ON_BOARD: "discard_all_faceup_on_board", // 白の意思の覚醒専用: 盤面（マス）にある表向きのカードを全て捨てる
  DISCARD_SELF: "discard_self", // このカード自身を捨てる（既定動作「手札に加える」の代わり）
  ALL_PLAYERS_DISCARD_HAND_AND_DRAW: "all_players_discard_hand_and_draw", // 色落ちキャット専用: 全員が手札を全て捨ててから指定枚数ドローする
  DISCARD_HALF_HAND: "discard_half_hand", // 選べる罠専用: 自分の手札を半分（端数切り捨て）、自分で選んで捨てる
  FORCED_MOVE_TO_OWN_GATE: "forced_move_to_own_gate", // 選べる罠専用: 自分のゲートへ強制移動する（「移動」なので到達判定は連鎖する）
  DISCARD_ONE_LOCKED_CARD: "discard_one_locked_card", // 選べる罠専用: 自分のロックしているカードから1枚選んで捨てる
  DECLARE_COLORS: "declare_colors", // ザ・ギャンブル/試練の儀式専用: 色を宣言する（宣言数は固定/以上のどちらかをaction側で指定）
  PUBLIC_DRAW_MATCHING_DECLARED_COLOR_COUNT: "public_draw_matching_declared_color_count", // ザ・ギャンブル専用: 直前に宣言した色の種類数分、公開ドローする
  DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED: "discard_hand_if_revealed_matches_declared", // ザ・ギャンブル専用: 公開したカードの中に宣言色があれば手札を全て捨てる
  RITUAL_PLACE_MOVE_REPEAT: "ritual_place_move_repeat", // 試練の儀式専用: 隣に山札から1枚表向きで置く→そこへ移動（到達効果無し）→宣言色なら繰り返す
  ALL_PLAYERS_PLACE_ONE_CARD_IN_EMPTY_CELL: "all_players_place_one_card_in_empty_cell", // 合同建設専用: 全員がそれぞれ、何もない1マスに山札または手札から1枚裏向きで置く
  ALL_PLAYERS_DISCARD_TO_THREE: "all_players_discard_to_three", // スラム上がりの役人専用: 全員がそれぞれ、手札が3枚になるまで自分で選んで捨てる
  ALL_PLAYERS_CHOOSE_PARTY_OPTION: "all_players_choose_party_option", // パーティー専用: 全員がそれぞれ、3つの選択肢から1つ選んで得る
  END_CURRENT_PHASE: "end_current_phase", // なないろの巨光・スラム上がりの役人・ザ・ギャンブル専用: 現在のフェイズを強制的に終了する
  PLACE_SELF_ADJACENT_TO_CHOSEN_OPPONENT: "place_self_adjacent_to_chosen_opponent", // プレゼント専用: 相手を選び、その隣に自分自身を裏向きで置く
  PLACE_DECK_CARD_ON_ALL_FACEUP_CELLS: "place_deck_card_on_all_faceup_cells", // 白の意思の覚醒専用: 場の全ての表向きのカードの上に山札から1枚ずつ裏向きで置く
  DISCARD_OWN_HAND: "discard_own_hand", // （旧・色落ちキャット手札効果。効果変更で未使用に。他カードで使う可能性を残し定義は残置）自分の手札を全て捨てる
  DISCARD_ANY_OWN_LOCKED_DRAW_PER: "discard_any_own_locked_draw_per", // 色落ちキャット手札効果専用: 自分のロックカードを任意の枚数捨て、1枚につきdrawPer枚ドロー
  DISCARD_ONE_HAND_CARD: "discard_one_hand_card", // ザ・ギャンブル専用: 手札から1枚を選んで捨てる（追色コストと違い色の制約は無い）
  DRAW_IF_HAND_AT_MOST: "draw_if_hand_at_most", // スラム上がりの役人専用: 自分の手札が指定枚数以下ならドローする
  // ザ・ギャンブルの手札効果専用: 「上記の到達効果を得る」の前後に別のアクション
  // （手札を1枚捨てる・このフェイズを終了する）が挟まるカード用。既存のeffectDef単位の
  // inheritsArrivalフラグ（マスチェンジ・手品師の技・試練の儀式・合同建設の手札効果、
  // どれも「上記の到達効果を得る」だけで完結する）とは別に、actions配列の中の
  // 1アクションとして「到達効果のactionsをそのまま呼ぶ」を表現できるようにした。
  INHERIT_ARRIVAL_ACTIONS: "inherit_arrival_actions",
  // ここから続き43（ファースト/エターナルカードの手札効果を4枚追加）で新設した動詞。
  PICKUP_DISCARD_SECOND_FROM_TOP: "pickup_discard_second_from_top", // 赤のキューブ フェニックス専用: 捨て場の上から2番目のカードを手札に加える
  FLIP_UP_TO_N_WITHIN_RANGE: "flip_up_to_n_within_range", // 黄のキューブ サフラン専用: Nマス以内の裏向きカードを、M枚まで（してもよい）オープンする
  DISCARD_RANDOM_FROM_QUALIFYING_OPPONENTS: "discard_random_from_qualifying_opponents", // 青のキューブ セレスティア専用: 手札が指定枚数以上ある相手全員から無作為に1枚ずつ捨てる
  DISCARD_ALL_AT_CHOSEN_CELL: "discard_all_at_chosen_cell",
  // 0th拡張で新設。
  PICKUP_FACEUP_SAME_COLOR_TO_HAND: "pickup_faceup_same_color_to_hand",
  // ここから 0th拡張の第2弾（続き651）。
  PLACE_DECK_CARDS_IN_CHOSEN_CELLS: "place_deck_cards_in_chosen_cells", // 大地創造・迷いの森: 条件に合うNマスを選び、山札から1枚ずつ置く（revealでオープンも）
  DISCARD_ALL_ADJACENT_CARDS: "discard_all_adjacent_cards", // 迷いの森: あなたの隣（4マス）のカードをすべて捨てる
  DRAW_IF_HAND_ODD: "draw_if_hand_odd", // 不思議な果実: 手札が奇数枚ならドロー
  PLACE_WHOLE_HAND_AT_CHOSEN_CELL: "place_whole_hand_at_chosen_cell", // バッドバーガー: 中央と四隅のうち駒のいない1マスへ手札を全部置く
  DRAW_PER_FACEDOWN_AT_CHOSEN_CELL: "draw_per_facedown_at_chosen_cell", // ピュアバーガー(手札): 選んだマスの裏向きの枚数ぶんドロー
  DISCARD_OWN_HAND_DOWN_TO: "discard_own_hand_down_to", // 厳重警戒: あなたの手札が指定枚数になるように、自分で選んで捨てる
  DISCARD_ANY_HAND_THEN_DRAW_SAME: "discard_any_hand_then_draw_same", // やり直しのカギ: 手札を任意の枚数捨ててもよい。捨てた枚数分ドロー
  DRAW_IF_OPENED_THIS_TURN: "draw_if_opened_this_turn", // バスストップ: このターンにこれがオープンされたのならドロー
  PUBLIC_DRAW_TO_BOTTOM_OF_CHOSEN_CELL: "public_draw_to_bottom_of_chosen_cell", // 足下の隠し財産: 1枚ドローして公開し、選んだマスの1番下に表向きで置く
  PLACE_HAND_CARD_AT_BOTTOM_OF_CHOSEN_CELL: "place_hand_card_at_bottom_of_chosen_cell", // 足下の隠し財産(手札): 手札1枚を選んだマスの1番下に表向きで置く
  MOVE_TO_CELL_WITH_NAMED_FACEUP_CARD: "move_to_cell_with_named_faceup_card", // オレンジバス: 「バスストップ」のあるマスに移動する
  PICKUP_NAMED_CARD_AT_OWN_CELL: "pickup_named_card_at_own_cell", // オレンジバス: そのバスストップを手札に加える
  FORCED_MOVE: "forced_move", // ジョイナー等: ふつうの「強制移動」（カードが無いマスにも行ける）
  FORCED_MOVE_TO_PREVIOUS_CELL: "forced_move_to_previous_cell", // リーチキャンセル: 移動前のマスに強制移動する
  GATE_CHARGE_PLACE_OR_RETURN: "gate_charge_place_or_return", // ゲートチャージ: オープンされたならゲートへ／そうでないなら戻って捨てる
  END_TURN: "end_turn", // 「このターンを終了する。」（「このフェイズを終了する」とは別物）
  PEEK_FACEDOWN_AT_CHOSEN_CELLS: "peek_facedown_at_chosen_cells", // 鑑定士の技・ジェイク: 裏向きのカードの表面を見る
  DECLARE_AND_OPEN_TO_HAND_REPEAT: "declare_and_open_to_hand_repeat", // 鑑定士の技(手札): 色宣言→オープンして手札に加える→当たれば繰り返す
  DECLARE_AND_OPEN_UP_TO_N_THEN_HAND: "declare_and_open_up_to_n_then_hand", // ジェイク(手札): 色宣言→オープン→当たれば繰り返す（計N枚まで）。N枚目も当たりなら全部手札へ
  ALL_PLAYERS_DRAW_AND_PLACE_ONE_AT_CHOSEN_CELL: "all_players_draw_and_place_one_at_chosen_cell", // ピュアバーガー: 全員1枚ドローし、手札1枚をそのマスの1番上に置く
  MOVE_SELF_BY_RIGHT_NEIGHBOR: "move_self_by_right_neighbor", // 不思議な果実: あなたの右隣の相手が、あなたを1マス移動させる
  PLACE_DECK_CARDS_IN_CROSS_AND_OPEN_ALL: "place_deck_cards_in_cross_and_open_all", // 誰かの白きカゲ: 十字方向の計12マスに1枚ずつ置いて全部オープン
  PICKUP_ADJACENT_CARDS_TO_HAND: "pickup_adjacent_cards_to_hand", // マックール: あなたの隣のマスのカードをN枚手札に加える
  FORCED_MOVE_TO_SURROUNDING_OF_CHOSEN_OPPONENT: "forced_move_to_surrounding_of_chosen_opponent", // マックール(手札): 相手を1人選び、その相手の周囲に強制移動する
  STEAL_RANDOM_FROM_MOST_LOCKED: "steal_random_from_most_locked", // リトルマウス: 1番多くロックしているプレイヤーから無作為にN枚
  END_TURN_IF_OWN_TURN: "end_turn_if_own_turn", // リトルマウス(手札): あなたのターンに使ったならこのターンを終了する
  PLACE_DECK_CARDS_ON_ADJACENT: "place_deck_cards_on_adjacent", // ピーターフッド: あなたの隣に山札からN枚ずつ裏向きで置く
  ALL_PLAYERS_SET_HAND_SIZE: "all_players_set_hand_size", // ピーターフッド(手札): 1〜7の数を選び、全員の手札をその枚数にする
  GIVE_SELF_TO_CHOSEN_OPPONENT_WITH_OPTIONS: "give_self_to_chosen_opponent_with_options", // ヤエザ: 相手1人がこれを手札に加え、2択のどちらかを得る
  ALL_PLAYERS_DISCARD_DOWN_TO_THEN_MAY_LOCK: "all_players_discard_down_to_then_may_lock", // ヴド族との契約: 全員が手札N枚以下になるまで捨て、捨てたならロックしてもよい
  REGISTER_PEACE_WISH: "register_peace_wish", // 平和への願い: 次の自分のターンの開始時まで持ち越して判定する
  CONTACT_CHOSEN_OPPONENT_IN_SURROUNDING: "contact_chosen_opponent_in_surrounding", // 紅の鉄拳: あなたの周囲の相手1人に接触する
  DISABLE_LOCK_THIS_TURN_FOR_DECLARER: "disable_lock_this_turn_for_declarer", // やり直しのカギ(手札): ロックを宣言した相手はこのターンロックできない
  CANCEL_ARRIVAL_EFFECT: "cancel_arrival_effect", // リーチキャンセル(手札): そのカードの効果を無効にし、そのカードを捨てる
  CHOSEN_OPPONENT_DOES_MOVE_PHASE_FOR_YOU: "chosen_opponent_does_move_phase_for_you", // ヴィヴィアン: 相手がムーブフェイズを行い、到達したカードは自分の手札へ // やり直しのカギ: 手札を任意の枚数捨ててもよい。捨てた枚数分ドロー // 厳重警戒: あなたの手札が指定枚数になるように、自分で選んで捨てる // 色寄せの笛専用: これと同色の、場の表向きのカード１枚を手札に加える
  PICKUP_DISCARD_TOP: "pickup_discard_top", // 赤のはじまり専用: 捨て場の１番上のカードを手札に加える // 紅蓮の火山 ワイナウエア専用: 任意の1マスのカードを全て捨てる
  // 続き44で新設。
  PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END: "public_draw_then_discard_at_turn_end", // 緑のキューブ ヴァーディアン(first-green)専用: N枚公開ドローし、ターン終了時にそれらを捨てる
  MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF: "move_chosen_opponent_adjacent_to_self", // 結ばれの一本桜 コノハナサクヤ専用: 相手を選び、その駒をあなたの「周囲」（縦横斜めの8マス。#224）へ移動させる（「移動」扱い）
  PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD: "public_draw_disable_hand_effects_conditional_discard", // 禁断の果実 マルメゴ専用: N枚公開ドロー、それらの手札効果は今ターン使用不可、橙が混ざっていたら手札全捨て＋今ターン移動不可
  ANNOUNCE_MOVEMENT_BOOST_THIS_TURN: "announce_movement_boost_this_turn", // 紫のキューブ ディメンション専用: このターンの通常の移動が2マス一気になる（このアプリは元々移動先を制限しないため、実際には案内のみ）
  // 続き45（ユーザーがdocs/cards.mdの空欄だった効果文を補完）で新設。
  LOCK_ONE_HAND_CARD_EXCEPT_FINAL: "lock_one_hand_card_except_final", // 桃のキューブ セレナーデ専用: 手札を1枚選んでロックする（通常の色一致ルール、ただし7色目＝勝利になるロックは対象外）
  // 黒のキューブ ノワール(first-noir)専用: ノワールは「置いている」プレースホルダーとしてずっと
  // ロックエリアに残る（7色カウント外・他カードの効果の対象外）。この効果は、ノワールの置かれた
  // 色スロットへ手札のカードを1枚ロックする（そのロック札は7色カウントに入る・除去され得る）。
  // スロットに既にロック札があれば使えない（除去されて空けば再度使える）。
  LOCK_HAND_CARD_INTO_NOIR_SLOT: "lock_hand_card_into_noir_slot",
};

// 効果の主語（誰が対象か）。
export const TARGETS = {
  SELF: "self",
  ALL_OPPONENTS: "all_opponents",
  ALL_PLAYERS: "all_players", // なないろの巨光専用: 自分を含む参加者全員
};

// カードを置くマスの選び方。「choose」はプレイヤーが実際にマスを選ぶ（UIでの対象選択が
// 必要）、「sameAs」は同じ効果内の別のアクションで選んだマスをそのまま指す
// （収穫と種まきの「拾ったマスに置き直す」を表現するために必要になった）。
export const TARGET_SELECTIONS = {
  CHOOSE: "choose",
  SAME_AS: "same_as",
  // 増殖する樹々専用: プレイヤーが選ぶのではなく、範囲内の該当マス全てが自動的に対象になる
  // （destination.withinCellsと組み合わせて使う）。
  ALL_WITHIN_RANGE: "all_within_range",
  // 黒の契約の烙印専用: 自分のロックエリアの空いているスロット（通常のロックと違い色を
  // 問わない）から選ぶ。
  OWN_EMPTY_LOCK_SLOTS: "own_empty_lock_slots",
  // 0th拡張（ゲートチャージ）専用: 「あなたのゲート」。選ぶ余地が無いので候補を出さない。
  OWN_GATE: "own_gate",
};

// --- パイロットカード5枚 --------------------------------------------------------------
// cardIdはcards-data.jsの実際のidと一致させてある（将来ここを正規の効果データ置き場に
// 昇格させる時、getCardDefinition()の結果とこのファイルをcardId経由で突き合わせられる
// ようにするため）。
// 0th拡張・色寄せの笛（7色）の2択。**到達効果と手札効果が同じ内容**（手札効果の印字は
// 「上記の到達効果を得る。」）なので、片方だけ直してズレないよう**同じ配列を両方から参照する**。
// ⚠ 中身は書き換えない（7枚が同じ配列を共有しているため）。
// 善処の原則: 選べない選択肢は isArrivalOptionUsable / isHandEffectOptionUsable が落とす
//   （同色の表向きが場に無い／裏向きのカードが場に無い）。両方だめなら不発。
// 0th拡張・厳重警戒の2択（到達効果）。
// 🔴 ②は「移動先のカードはオープンしない」＝**到達しない**。noArrival で ctx.arrivedAt を
//   立てないようにしてある（立てると呼び出し元が移動先の到達処理＝自動オープンまでやる）。
const EX0_STRICT_WATCH_OPTIONS = [
  {
    id: "ex0-strict-discard-to-1",
    labelKey: "cef.opt.ex0StrictDiscardTo1",
    // 手札が1枚以下なら捨てるものが無い＝選べない（善処の原則）。
    // ⓘ 到達効果の時点では、このカード自身はまだ盤面にあるので手札に数えない。
    requiresMinHandSize: 2,
    actions: [{ verb: VERBS.DISCARD_OWN_HAND_DOWN_TO, keep: 1 }],
  },
  {
    id: "ex0-strict-gate",
    labelKey: "cef.opt.ex0StrictGate",
    requiresNotAtOwnGate: true,
    actions: [{ verb: VERBS.FORCED_MOVE_TO_OWN_GATE, noArrival: true }],
  },
];

const EX0_FLUTE_OPTIONS = [
  {
    id: "ex0-flute-pickup",
    labelKey: "cef.opt.ex0FlutePickup",
    requiresFaceUpSameColorOnBoard: true,
    actions: [{ verb: VERBS.PICKUP_FACEUP_SAME_COLOR_TO_HAND }],
  },
  {
    id: "ex0-flute-flip",
    labelKey: "cef.opt.ex0FluteFlip",
    requiresFaceDownCardOnBoard: true,
    // withinCells を渡さない＝場（49マス）全体。optional: false＝「してもよい」ではなく必ず1枚。
    actions: [{ verb: VERBS.FLIP_UP_TO_N_WITHIN_RANGE, maxCount: 1, optional: false }],
  },
];

export const CARD_EFFECTS = {
  // 1. ゴメンナサイッ！（紫、通常カード） 到達効果: 「１マス移動する。」
  // 手札効果は「【追色１】相手が最後のロックを宣言した時に使える。相手のロックしている
  // １枚をあなたの手札に加える。」（訂正: 以前このコメントは「あなたへのロック・接触の
  // 宣言時に使える。それを無効にする。」と書いていたが、これはdocs/cards.mdの実際の
  // 文言と食い違う誤りだった）。相手の新しいロック自体はこの効果の処理後にそのまま
  // 成立する（手札効果補足参照）——つまり「無効化」ではなく「相手が既に持っている
  // ロックを1枚横取りする」効果で、新しいロックが成立しても結局7色揃わなくなる、
  // という間接的な牽制。ロック承認フローへの割り込みが必要な特殊な発動条件のため、
  // 通常のhandEffect（Hand Phaseの自己申告で使う一般的な仕組み）としては表現せず、
  // main.jsのfindGomennasaiEligibility/useGomennasaiOnFinalLockに直接実装した
  // （続き64）。handEffectデータを持たないため、ユーザー報告「ハンドフェイズで
  // 通常はトーンダウンさせるべき」への対応で、hasHandEffectData前提のトーンダウン
  // 判定（main.js）とは別に、常に反応時専用（Hand Phaseの自己申告では絶対に
  // 使えない）と明示するフラグを立てる。
  "purple-sorry": {
    handEffectReactiveOnly: true,
    arrival: {
      actions: [{ verb: VERBS.MOVE, count: 1 }],
    },
  },

  // 2. 奇跡の森 マンズウッド（緑、エターナルカード） 手札効果: 「【追色１】１枚ドロー。」
  "eternal-green": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.DRAW, count: 1, target: TARGETS.SELF }],
    },
  },

  // 3. ジャンプ台（赤、通常カード）
  // 到達効果: 「これはあなたの手札に加えない。２マス先に一気に移動する。」
  // ユーザー指摘: 「一気に」は言い回しではなく実際の挙動を変える条件。atOnce:falseだと
  // 「1マス移動して到達判定→もう1マス移動して到達判定」を2回繰り返す（各ステップで
  // 通常の移動ルール＝移動先にカードが必要、が適用される）。atOnce:trueだと中間マスの
  // カード・駒の有無を問わず最終着地点まで直接ワープし、到達判定も最終着地点でのみ
  // 発生する（ノート「１マス目のカードや相手の駒等の有無は関係ない」の通り）。
  // 手札効果: 「これをゲート以外の任意のマスに表向きで置く。」
  "red-jump-pad": {
    arrival: {
      // 既定動作（効果処理後にこのカード自身を手札に加える）を明示的に上書きする。
      addsCardToHandAfter: false,
      // soundはgenerateEffectText（テキスト生成）には一切影響しない、実行時にだけ
      // 見るヒント（card-effect-engine.jsのVERBS.MOVE参照）。ユーザー要望
      // 「ジャンプ台で移動するときに専用の効果音を使ってください」。
      actions: [{ verb: VERBS.MOVE, count: 2, atOnce: true, sound: "jump" }],
    },
    handEffect: {
      // このカード自身が「置かれる」対象になるため、通常の手札効果のデフォルト
      // 「効果発動時にこのカードを捨てる」の対象外にする（なないろの欠片の
      // 「２枚をロックする」選択肢と同じ考え方）。
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludeGates: true },
        },
      ],
    },
  },

  // カウンターロック（赤、通常カード） 到達効果: 「１番少なくロックしているなら
  // １枚ドロー。」（補足: 「１番少なくロックしている」＝ロックしている枚数が
  // 参加者の中で１番少ないこと。同率首位も対象に含む一般的な解釈）。
  // 手札効果（「あなたへの接触の宣言時に使える。その接触を無効にする。あなたの
  // 手札を１枚ロックしてもよい。」）は、接触の承認/拒否フロー自体への割り込みが
  // 必要な別種の発動条件のため、通常のhandEffect（Hand Phaseの自己申告で使う
  // 一般的な仕組み）としては表現せず、ゴメンナサイッ！のfindGomennasaiEligibility/
  // useGomennasaiOnFinalLockと同じパターンでmain.jsのfindCounterLockToken/
  // useCounterLockOnContact/checkCounterLockAutoApprovalに直接実装した（続き89）。
  // ゴメンナサイッ！と同じ理由でhandEffectReactiveOnlyを立てる（Hand Phaseの
  // トーンダウン対応）。
  "red-counter-lock": {
    handEffectReactiveOnly: true,
    arrival: {
      actions: [{ verb: VERBS.DRAW_IF_FEWEST_LOCKED }],
    },
  },

  // プレゼント（桃、通常カード） 到達効果: 「１番少なくロックしている全員は、
  // １枚ドロー。」カウンターロックと違い、効果の使用者だけでなく「該当する
  // 全員」がそれぞれドローする（DRAW_ALL_FEWEST_LOCKED）。
  // 手札効果（「これを相手の隣に裏向きで置く。１枚ドロー。」）は「相手を選ぶ→隣接する
  // 空きマスを選ぶ」という新しい対象選択の組み合わせが必要なため今回は対象外。
  "pink-present": {
    arrival: {
      actions: [{ verb: VERBS.DRAW_ALL_FEWEST_LOCKED }],
    },
    // 手札効果: 「これを相手の隣に裏向きで置く。１枚ドロー。」相手を選び、その隣接
    // マスへこのカード自身を置く（このカード自身が「置かれる」対象になるため
    // keepsCardOnUse）。
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        { verb: VERBS.PLACE_SELF_ADJACENT_TO_CHOSEN_OPPONENT },
        { verb: VERBS.DRAW, count: 1, target: TARGETS.SELF },
      ],
    },
  },

  // 白の意思の覚醒（白、通常カード） 到達効果: 「場の全ての表向きのカードを
  // 捨てる。」（補足: カードの下にある表向きのカードは対象外＝１番上の原則、
  // つまり元々「場」＝盤面マスの一番上のカードしか意味を持たないため、対象は
  // 単純に「盤面マスにある表向きカード全部」でよい）。
  "white-awakening": {
    arrival: {
      actions: [{ verb: VERBS.DISCARD_ALL_FACEUP_ON_BOARD }],
    },
    // 手札効果: 「場の全ての表向きのカードの上に山札から１枚ずつ裏向きで置く。」
    handEffect: {
      actions: [{ verb: VERBS.PLACE_DECK_CARD_ON_ALL_FACEUP_CELLS }],
    },
  },

  // 増殖する樹々（緑、通常カード） 到達効果: 「２マス以内の何もない全てのマスに
  // 山札からカードを１枚ずつ裏向きで置く。」プレイヤーが選ぶのではなく、範囲内の
  // 該当マス全てが自動的に対象になる（destination.selection: ALL_WITHIN_RANGE）。
  "green-growing-trees": {
    arrival: {
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "deck",
          faceUp: false,
          destination: { selection: TARGET_SELECTIONS.ALL_WITHIN_RANGE, withinCells: 2 },
        },
      ],
    },
    // 手札効果: 「任意の３マスに山札から１枚ずつ裏向きで置く。」既存のPLACE_CARD
    // （source:"deck"・CHOOSE・count:3）をそのまま使う（続き89、ユーザーが
    // カード効果テキスト.txt/docs/cards.mdをこの生成文の語順に合わせて修正済み。
    // 続き25で決めた「生成文の語順統一を優先」の通り、生成側は変更していない）。
    handEffect: {
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          count: 3,
          source: "deck",
          faceUp: false,
          destination: { selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // なないろの巨光（白、通常カード） 到達効果: 「全員、３枚ドロー。これを
  // 捨てる。」既定動作（処理後に手札へ加える）を上書きし、代わりに捨てる
  // （DISCARD_SELF）。
  "white-radiance": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [
        { verb: VERBS.DRAW, count: 3, target: TARGETS.ALL_PLAYERS },
        { verb: VERBS.DISCARD_SELF },
      ],
    },
    // 手札効果: 「全員、３枚ドロー。このフェイズを終了する。」到達効果と違い自分自身は
    // 捨てない（手札効果の既定「使用時にこのカードを捨てる」がそのまま適用される）。
    handEffect: {
      actions: [
        { verb: VERBS.DRAW, count: 3, target: TARGETS.ALL_PLAYERS },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // 色落ちキャット（黒、通常カード） 到達効果: 「これを捨てる。全員、手札を全て
  // 捨て、１枚ドロー。」なないろの巨光と同じ「捨てる」。以前は巨光側が
  // 「このカードを」だったのでselfLabelで上書きしていたが、2026-11-01（続き647）に
  // 両方「これを」へ揃えたので既定のままでよい。
  "black-faded-cat": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [
        { verb: VERBS.DISCARD_SELF },
        { verb: VERBS.ALL_PLAYERS_DISCARD_HAND_AND_DRAW, count: 1 },
      ],
    },
    // 手札効果（2026-08-18ユーザーが効果変更）: 「あなたのロックしているカードを任意の枚数
    // 捨てる。捨てたカード１枚に付き３枚ドロー。このフェイズを終了する。」
    handEffect: {
      actions: [
        { verb: VERBS.DISCARD_ANY_OWN_LOCKED_DRAW_PER, drawPer: 3 },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // 黒の契約の烙印（黒、通常カード） 到達効果: 「あなたの空いているロックエリアに、
  // これを表向きで置く。」（補足: 「置く」であって「ロックした」扱いにはならない
  // ため、通常のロックの色制限は関係なく空いていればどの色のスロットでもよい）。
  // ★（あなたのロックフェイズにロックしないなら〜）・■（これを任意のマスに裏向きで
  // 置く）は基本効果・手札効果の話で、いずれも今回のスコープ外。
  "black-contract-brand": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          destination: { selection: TARGET_SELECTIONS.OWN_EMPTY_LOCK_SLOTS },
        },
      ],
    },
    // 手札効果: 「これを任意のマスに裏向きで置く。」ジャンプ台の手札効果と同じ
    // PLACE_CARD(source:"self")パターン（ゲート除外は無い・裏向き指定のみ違う）。
    // このカード自身が「置かれる」対象になるため、既定の「使用時にこのカードを
    // 捨てる」の対象外にする（keepsCardOnUse）。
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: false,
          destination: { selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // 4. 収穫と種まき（橙、通常カード）
  // 到達効果: 「任意の１マスの１枚をあなたの手札に加える。そのマスに手札から１枚
  // 裏向きで置く。」／手札効果: 「上記の到達効果を得る。」（docs/cards.md、
  // コスト無し）。ユーザー報告「手札からドラッグしても使用宣言がかからず、場に
  // 裏向きで置かれてしまう」の原因: handEffectデータ自体が無く、main.js側の
  // hasHandEffectData判定が常にfalseを返すため、ドラッグ時の自動処理割り込み
  // （runAutoHandEffect）に一切乗らず、通常の手札→盤面への配置にフォールスルー
  // していた。試練の儀式・マスチェンジ等と同じinheritsArrivalパターンで、
  // コスト無しでそのままarrivalと同じactionsを実行するhandEffectを追加する。
  "orange-harvest-sow": {
    arrival: {
      actions: [
        {
          verb: VERBS.PICKUP_TO_HAND,
          count: 1,
          target: { zone: "cell", selection: TARGET_SELECTIONS.CHOOSE, count: 1, saveAs: "chosenCell" },
        },
        {
          verb: VERBS.PLACE_CARD,
          count: 1,
          source: "hand",
          faceUp: false,
          destination: { zone: "cell", selection: TARGET_SELECTIONS.SAME_AS, ref: "chosenCell" },
        },
      ],
    },
    handEffect: {
      inheritsArrival: true,
      actions: [
        {
          verb: VERBS.PICKUP_TO_HAND,
          count: 1,
          target: { zone: "cell", selection: TARGET_SELECTIONS.CHOOSE, count: 1, saveAs: "chosenCell" },
        },
        {
          verb: VERBS.PLACE_CARD,
          count: 1,
          source: "hand",
          faceUp: false,
          destination: { zone: "cell", selection: TARGET_SELECTIONS.SAME_AS, ref: "chosenCell" },
        },
      ],
    },
  },

  // 5. 黄金の宮殿 ドムス・ネロ（黄、エターナルカード）
  // 手札効果: 「【追色１】２枚ドロー。相手全員は１枚ドロー。この効果は１ターンに
  // １度のみ得られる。」
  "eternal-yellow": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      usageLimit: { per: "turn", count: 1 },
      actions: [
        { verb: VERBS.DRAW, count: 2, target: TARGETS.SELF },
        { verb: VERBS.DRAW, count: 1, target: TARGETS.ALL_OPPONENTS },
      ],
    },
  },

  // 手品師の技 -スリカエ-（黄、通常カード）
  // 到達効果: 「相手１人の手札から無作為に１枚、あなたの手札に加える。あなたの手札から
  // １枚、その相手の手札に加える。」
  // 手札効果: 「上記の到達効果を得る。」——コスト無し。
  // ユーザー要望（続き87）「一旦『スリカエ』の手札効果を『この効果はいつでも使える。
  // 上記の到達効果を得る。』から『上記の到達効果を得る。』に変更します。
  // そうすると事実上『いつでも使える』カードはなくなりますが、今後、そういった
  // カードが出てくるし、スリカエをまたいつでも使えるカードにする場合があるので
  // 『いつでも使える』ギミック自体は削除しないでください」への対応。usableAnytime:
  // trueをこのカードから外しただけで、他の手札効果と同じ「ハンドフェイズ中のみ」に
  // 戻る（生成テキストからも「この効果はいつでも使える。」が自動的に消える、
  // card-effects.jsのgenerateEffectText参照）。usableAnytime自体の仕組み
  // （main.js/card-effect-engine.js/online.jsのfireAnytimeCheckpoint等）は
  // 一切削除していない——将来別のカードに`usableAnytime: true`を付ければそのまま
  // 使える。
  "yellow-sleight-of-hand": {
    arrival: {
      actions: [{ verb: VERBS.SWAP_RANDOM_HAND_CARD }],
    },
    handEffect: {
      // inheritsArrival: 到達効果と全く同じactionsを実行するが、生成テキストは
      // 「上記の到達効果を得る。」になる（docs/cards.md参照）。
      inheritsArrival: true,
      actions: [{ verb: VERBS.SWAP_RANDOM_HAND_CARD }],
    },
  },

  // 6. なないろの欠片（虹、通常カード） 手札効果: 「以下の効果のうち１つ得る。
  // ・１枚ドロー。・これを含めた「なないろの欠片」が２枚、あなたの手札にある時に
  // 使える。その２枚を任意の１箇所にロックする。２枚ドロー。」
  // ユーザー要望「手札効果は２つあります。効果選択モーダルを出してください。
  // 使用できない方はグレー表示。」への対応で、両方の選択肢をDSL化した
  // （handEffectOptions、複数選択肢を持つ手札効果の最初の例）。
  "rainbow-shard": {
    // 到達効果: 「到達効果はない。」（docs/cards.md）。actions:[]にすることで
    // runArrivalEffect()自体は動く（＝自己申告モーダルを出さず自動処理される）が
    // 何も実行せず、既定動作（このカード自身を手札に加える）だけが起きる。
    arrival: { actions: [] },
    handEffectOptions: [
      { id: "draw", labelKey: "cef.opt.draw1", actions: [{ verb: VERBS.DRAW, count: 1, target: TARGETS.SELF }] },
      {
        id: "lock-pair",
        labelKey: "cef.opt.lockPair",
        // これを含めた「なないろの欠片」が2枚、手札にある時だけ選べる。
        requiresPairInHand: true,
        // このカード自身が「ロックされる2枚」の1枚になるため、通常の手札効果の
        // デフォルト「効果発動時にこのカードを捨てる」の対象外にする
        // （docs/cards.md: 効果発動時の処遇は選択肢ごとに違う）。
        keepsCardOnUse: true,
        actions: [{ verb: VERBS.LOCK_PAIR }, { verb: VERBS.DRAW, count: 2, target: TARGETS.SELF }],
      },
    ],
  },

  // 7. 終わりなき化学 ゲンテクニーク（紫、エターナルカード） 手札効果:
  // 「【追色１】任意の１マスの１枚をあなたの手札に加える。そのマスに山札から
  // １枚裏向きで置く。」——収穫と種まきと同じ「拾う→同じマスに置き直す」の形だが、
  // 置き直す方の出どころが手札ではなく山札。
  "eternal-purple": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [
        {
          verb: VERBS.PICKUP_TO_HAND,
          count: 1,
          target: { zone: "cell", selection: TARGET_SELECTIONS.CHOOSE, count: 1, saveAs: "chosenCell" },
        },
        {
          verb: VERBS.PLACE_CARD,
          count: 1,
          source: "deck",
          faceUp: false,
          destination: { zone: "cell", selection: TARGET_SELECTIONS.SAME_AS, ref: "chosenCell" },
        },
      ],
    },
  },

  // 8. 月下の漂流船 プリドゥエン（青、エターナルカード） 手札効果:
  // 「【追色１】任意の２マスに山札から１枚ずつ裏向きで置く。」
  "eternal-blue": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          count: 2,
          source: "deck",
          faceUp: false,
          destination: { zone: "cell", selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // 9. マスチェンジ（橙、通常カード） 到達効果: 「３マス以内の相手のいる場所と
  // あなたのいる場所を入れ替える。相手はこれの到達効果を得ない。」／
  // 手札効果: 「【追色１】上記の到達効果を得る。」——同じ入れ替え効果を
  // 到達・手札の両方から呼べるよう、アクション自体を共有する。
  // 「入れ替える」は「移動」ではないため、入れ替え先のカードはオープンせず
  // 到達判定も連鎖しない（docs/cards.md 到達効果補足）。
  "orange-mass-change": {
    arrival: {
      actions: [{ verb: VERBS.SWAP_POSITION, count: 3 }],
    },
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      // inheritsArrival: 実際の実行はarrivalと同じactionsをそのまま使うが、
      // 生成テキストは「上記の到達効果を得る。」という参照文になる
      // （docs/cards.md、renderAction()参照）。
      inheritsArrival: true,
      actions: [{ verb: VERBS.SWAP_POSITION, count: 3 }],
    },
  },

  // 10. 橙のキューブ ハーベスト（橙、ファーストカード） 手札効果:
  // 「【追色１】２マス以内の１枚をあなたの手札に加える。」
  // cardIdはcards-data.js（FIRST_CARDS）の実際のid「first-orange」に合わせる
  // （「色-first」ではなく「first-色」——main.js側のクリック判定
  // (cardId?.startsWith("first-"))もこの命名規則に依存している）。
  "first-orange": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [
        {
          verb: VERBS.PICKUP_TO_HAND,
          count: 1,
          withinCells: 2,
          target: { zone: "cell", selection: TARGET_SELECTIONS.CHOOSE, count: 1 },
        },
      ],
    },
  },

  // 赤のキューブ フェニックス（赤、ファーストカード） 手札効果:
  // 「【追色１】捨て場の１番上から２番目のカードをあなたの手札に加える。」
  "first-red": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.PICKUP_DISCARD_SECOND_FROM_TOP }],
    },
  },

  // 黄のキューブ サフラン（黄、ファーストカード） 手札効果:
  // 「【追色１】２マス以内のカードを４枚までオープンしてもよい。」
  "first-yellow": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.FLIP_UP_TO_N_WITHIN_RANGE, withinCells: 2, maxCount: 4 }],
    },
  },

  // 青のキューブ セレスティア（青、ファーストカード） 手札効果:
  // 「【追色１】手札が２枚以上ある相手全員の手札から、無作為に１枚ずつ選び、
  // それらを捨てる。」
  "first-blue": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.DISCARD_RANDOM_FROM_QUALIFYING_OPPONENTS, minHandSize: 2 }],
    },
  },

  // 紅蓮の火山 ワイナウエア（赤、エターナルカード） 手札効果:
  // 「《紅色の雨》：【追色１】任意の１マスのカードをすべて捨てる。」
  "eternal-red": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.DISCARD_ALL_AT_CHOSEN_CELL }],
    },
  },

  // 緑のキューブ ヴァーディアン（緑、ファーストカード） 手札効果:
  // 【2026-09-28】この効果は元々「奇跡の森 マンズウッド」用に作られたが、マンズウッド
  // （eternal-green）の効果は「【追色１】１枚ドロー。」に変わっており、いまこの動詞を使うのは
  // **このヴァーディアンだけ**。コメントが「マンズウッド専用」のまま残っていて実際に読み違えた。
  // 「【追色１】２枚ドローして、それらをすべて公開する。ターン終了時、それらを
  // 捨てる。この効果は１ターンに１度のみ得られる。」
  "first-green": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      usageLimit: { per: "turn", count: 1 },
      actions: [{ verb: VERBS.PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END, count: 2 }],
    },
  },

  // 結ばれの一本桜 コノハナサクヤ（桃、エターナルカード） 手札効果:
  // 「《恋の訪れ》：【追色１】相手をあなたの周囲へ移動する。このターンあなたは
  // 接触できない。」
  "eternal-pink": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF }],
    },
  },

  // 禁断の果実 マルメゴ（橙、エターナルカード） 手札効果:
  // 「《果実の提案》：【追色１】４枚ドロー。それらを公開する。それらの手札効果は
  // このターン使うことができない。その中に橙のカードがあったなら、あなたの手札を
  // すべて捨て、あなたはこのターン移動できない。」
  "eternal-orange": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD, count: 4 }],
    },
  },

  // 紫のキューブ ディメンション（紫、ファーストカード） 手札効果:
  // 「【追色１】このターンの通常の移動は２マス先に一気に移動する。」続き44時点では
  // docs/cards.mdに追色コストの記載が無く、コスト無しとして実装していたが、ユーザーが
  // docs/cards.mdを追色コストありに修正（2026-07-27）。このアプリはそもそもムーブ
  // フェイズの移動先を制限していない（Phase 1方針「ルール適用は一切しない」、ドラッグで
  // 盤面のどこへでも置ける）ため、実際に「２マス先まで動けるようにする」ための制限
  // 緩和処理は元から不要——この手札効果は自己申告の案内として扱う（コストの支払い
  // 自体は他のファーストカードと同じ通常の追色フローで行われる）。
  "first-purple": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [{ verb: VERBS.ANNOUNCE_MOVEMENT_BOOST_THIS_TURN }],
    },
  },

  // 桃のキューブ セレナーデ（桃、ファーストカード） 手札効果:
  // 「【追色１】あなたの手札を１枚ロックする、ただし最後のロックはできない。
  // この効果は１ターンに１度のみ得られる。」（ユーザーがdocs/cards.mdの空欄
  // だった効果文を補完、2026-07-27）
  // ユーザー指摘「善処の原則は発動宣言時に適用される——最後のロックしか候補が
  // 無いなら、コストを払う前の発動宣言自体ができない」への対応で
  // requiresLockableCardAvailable:trueを付け、isHandEffectOptionUsableの時点で
  // 弾かれるようにしてある。
  "first-pink": {
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      usageLimit: { per: "turn", count: 1 },
      requiresLockableCardAvailable: true,
      actions: [{ verb: VERBS.LOCK_ONE_HAND_CARD_EXCEPT_FINAL }],
    },
  },

  // 黒のキューブ ノワール（黒、エイドス物語戦専用のファーストカード）。ユーザー要望2026-08-15。
  // ノワール自身は開始時からエイドスのロックエリアに「置いている」プレースホルダーとしてずっと
  // 残る（7色カウント外・他カードの効果の対象外）。手札効果「これの置かれた色のロック
  // エリアにカードを１枚ロックする。そうしたなら、１枚ドローし、１マス移動する。」＝ノワールの
  // 置かれた色スロットへ手札のカードを1枚ロック（LOCK_HAND_CARD_INTO_NOIR_SLOT）→1枚ドロー→
  // 1マス移動。ロック札は7色カウントに入り、他効果で除去され得る。除去されてスロットが空けば
  // 再度使える（ユーザー補足: セブンではロックカードがなくなる場合がある）。追色コスト無し。
  // ロックエリアに置かれていても使える（idが"first-"始まりでis-usable-while-lockedの対象）。
  "first-noir": {
    handEffect: {
      actions: [
        { verb: VERBS.LOCK_HAND_CARD_INTO_NOIR_SLOT },
        { verb: VERBS.DRAW, count: 1, target: TARGETS.SELF },
        { verb: VERBS.MOVE, count: 1 },
      ],
    },
  },

  // 選べる罠（青、通常カード） 到達効果: 「以下の効果のうち１つ得る。・あなたの手札を
  // 半分捨てる。・あなたのゲートに強制移動する。・あなたのロックしているカードを1枚
  // 捨てる。」なないろの欠片のhandEffectOptionsと同じ「複数選択肢から1つ」の考え方だが、
  // こちらは手札効果ではなく到達効果自身の選択のため、専用の`arrivalOptions`という
  // 別のトップレベルキーで表現する（`arrival`とは排他、runArrivalEffect側で分岐する）。
  // 善処の原則（docs/cards.md補足）で各選択肢に条件があり、選べる選択肢が1つも無い
  // 場合は不発（続き26で実装したannounceFizzle経由でプレイヤーに伝わる）。
  "blue-choosable-trap": {
    arrivalOptions: [
      {
        id: "discard-half-hand",
        labelKey: "cef.opt.discardHalf",
        // 手札枚数が１枚以下のときは選べない（docs/cards.md補足）。
        requiresMinHandSize: 2,
        actions: [{ verb: VERBS.DISCARD_HALF_HAND }],
      },
      {
        id: "forced-move-to-own-gate",
        labelKey: "cef.opt.forcedGate",
        // 自分のゲートにいるときは選べない（docs/cards.md補足）。
        requiresNotAtOwnGate: true,
        actions: [{ verb: VERBS.FORCED_MOVE_TO_OWN_GATE }],
      },
      {
        id: "discard-one-locked-card",
        labelKey: "cef.opt.discardLock",
        // 捨てれるロックカードが無いときは選べない（docs/cards.md補足）。
        requiresHasLockedCard: true,
        actions: [{ verb: VERBS.DISCARD_ONE_LOCKED_CARD }],
      },
    ],
    // 手札効果: 「これを任意のマスに裏向きで置く。」黒の契約の烙印・パーティーと同じ
    // PLACE_CARD(source:"self")パターン。以前は印字が「このカードを」だったので selfLabel で
    // 上書きしていたが、2026-09-24 に印刷カードどおり「これを」へ揃えたので既定のままでよい。
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: false,
          destination: { selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // ザ・ギャンブル（黄、通常カード） 到達効果: 「２色以上、色を宣言する。その色の種類の
  // 数分ドローし公開する。それらの中に宣言色があるなら、あなたの手札を全て捨てる。」
  // 「ドロー」＝「山札から手札に加える」ため、この効果でドローしたカードも「手札を
  // 全て捨てる」の対象（docs/cards.md補足）——実装上は、ドローを「公開ドロー」
  // （state.jsの既存publicDrawゾーン、手札シャッフル/ターン終了まで手札に合流しない
  // 表向き専用ゾーン）として行い、DISCARD_HAND_IF_REVEALED_MATCHES_DECLAREDが
  // 手札＋公開ドロー分の両方をまとめて対象にすることで、この補足を素直に満たす。
  "yellow-gamble": {
    arrival: {
      actions: [
        { verb: VERBS.DECLARE_COLORS, minCount: 2 },
        { verb: VERBS.PUBLIC_DRAW_MATCHING_DECLARED_COLOR_COUNT },
        { verb: VERBS.DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED },
      ],
    },
    // 手札効果: 「あなたは手札を１枚捨てる。上記の到達効果を得る。このフェイズを
    // 終了する。」到達効果と全く同じ処理をINHERIT_ARRIVAL_ACTIONSで挟み込む
    // （前後に「1枚捨てる」「フェイズ終了」が付くため、続き29のeffectDef単位の
    // inheritsArrivalフラグでは表現できず、アクション単位の新しい動詞にした）。
    handEffect: {
      actions: [
        { verb: VERBS.DISCARD_ONE_HAND_CARD },
        { verb: VERBS.INHERIT_ARRIVAL_ACTIONS },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // 試練の儀式（紫、通常カード） 到達効果: 「色を３色宣言する。あなたの隣に山札から
  // １枚表向きで置く。そのマスに移動し、移動先の到達効果は得ない。置いたカードが
  // 宣言色ならこの効果を繰り返す。」置く→移動→判定→（該当すれば）繰り返す、という
  // 一連の流れ全体をRITUAL_PLACE_MOVE_REPEAT 1つの動詞にまとめている（各繰り返しの
  // 隣接マスをその都度選ばせる必要があり、PLACE_CARD等の既存動詞を機械的に組み合わせる
  // よりも専用動詞の方がシンプルなため）。
  "purple-trial-ritual": {
    arrival: {
      actions: [
        { verb: VERBS.DECLARE_COLORS, count: 3 },
        { verb: VERBS.RITUAL_PLACE_MOVE_REPEAT },
      ],
    },
    // 手札効果: 「上記の到達効果を得る。」到達効果と全く同じactionsを
    // そのまま実行する（inheritsArrival、続き29のマスチェンジ・手品師の技と
    // 同じパターン）。
    handEffect: {
      inheritsArrival: true,
      actions: [
        { verb: VERBS.DECLARE_COLORS, count: 3 },
        { verb: VERBS.RITUAL_PLACE_MOVE_REPEAT },
      ],
    },
  },

  // 合同建設（緑、通常カード） 到達効果: 「全員は何もない１マスに山札または手札から
  // １枚裏向きで置く。」（ユーザー要望によりマス数を２→１に変更、続き51）。
  // 処理順の原則（効果の使用者から時計回り）に沿い、各プレイヤーが自分自身の選択
  // （マス・山札か手札か・手札ならどのカードか）を行う。他プレイヤーの選択は
  // 自分のクライアントでは表現できないため、main.js側のhelpers.delegateToPlayer
  // （オンライン中は対象プレイヤー本人の画面へ委任するbroadcast往復）に委ねる。
  "green-joint-construction": {
    arrival: {
      actions: [{ verb: VERBS.ALL_PLAYERS_PLACE_ONE_CARD_IN_EMPTY_CELL }],
    },
    // 手札効果: 「上記の到達効果を得る。」到達効果と同じ（inheritsArrival）。
    handEffect: {
      inheritsArrival: true,
      actions: [{ verb: VERBS.ALL_PLAYERS_PLACE_ONE_CARD_IN_EMPTY_CELL }],
    },
  },

  // スラム上がりの役人（青、通常カード） 到達効果: 「全員は手札が３枚になるように
  // 捨てる。」合同建設と同じdelegateToPlayerパターン。
  "blue-slum-official": {
    arrival: {
      actions: [{ verb: VERBS.ALL_PLAYERS_DISCARD_TO_THREE }],
    },
    // 手札効果: 「あなたの手札が１枚以下なら２枚ドロー。このフェイズを終了する。」
    // 手札効果は原則使用時に自分自身を先に捨てるため（docs/cards.md補足）、この
    // 「１枚以下」判定の時点でこのカード自身は既に手札から居ない。
    handEffect: {
      actions: [
        { verb: VERBS.DRAW_IF_HAND_AT_MOST, maxHandSize: 1, count: 2 },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // パーティー（桃、通常カード） 到達効果: 「全員は以下の効果のうち１つ得る。
  // ・１マス移動し、移動先の到達効果は得ない。・場の任意の１枚をあなたの手札に加える。
  // ・場の任意の２枚をオープンする。」合同建設と同じdelegateToPlayerパターンだが、
  // 各プレイヤーが委任された先でさらに3択から1つ選ぶ（main.js側で選べる罠と同じ
  // showHandEffectOptionPickerを流用）。
  "pink-party": {
    arrival: {
      actions: [{ verb: VERBS.ALL_PLAYERS_CHOOSE_PARTY_OPTION }],
    },
    // 手札効果: 「これを任意のマスに裏向きで置く。」黒の契約の烙印の手札効果と
    // 全く同じPLACE_CARD(source:"self")パターン。
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: false,
          destination: { selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // ================= ここから 0th拡張（0th EDITION 拡張） =================
  // ⚠ ここに載っているカードだけが自動処理される。**載っていないカードは
  //   今までどおり「文を読んでプレイヤーが自分で処理する」**（ユドンリウムコネクト方式）。
  //   半端なデータを置くと間違った処理が勝手に走るので、**1枚ずつ完成させてから載せる**。

  // 赤のはじまり（赤、0th拡張） 到達効果: 「捨て場の１番上のカードをあなたの手札に加える。」
  // 手札効果: 「上記の到達効果を得る。このフェイズを終了する。」
  // 捨て場から取る動詞は、フェニックス（first-red）の「上から２番目」が既にあるので
  // その1段手前の素直な形。helpers.drawFromDiscard がそのまま使える。
  "ex0-red-beginning": {
    arrival: {
      actions: [{ verb: VERBS.PICKUP_DISCARD_TOP }],
    },
    handEffect: {
      actions: [{ verb: VERBS.INHERIT_ARRIVAL_ACTIONS }, { verb: VERBS.END_CURRENT_PHASE }],
    },
  },

  // 大地創造（緑・4枚） 到達効果: 「何もない４マスに山札から１枚ずつ裏向きで置く。それらをオープンする。」
  // 手札効果: 「上記の到達効果を得る。」
  // ⚠ 「何もないマス」＝カードも駒も置かれていないマス（用語集）。駒がいないので、
  //   オープンしても到達は起きない（到達＝表向きのカードの上に駒が置かれたタイミング）。
  "ex0-green-creation": {
    arrival: {
      actions: [{ verb: VERBS.PLACE_DECK_CARDS_IN_CHOSEN_CELLS, count: 4, requireNoCard: true, requireNoPiece: true, reveal: true }],
    },
    handEffect: {
      inheritsArrival: true,
      actions: [{ verb: VERBS.PLACE_DECK_CARDS_IN_CHOSEN_CELLS, count: 4, requireNoCard: true, requireNoPiece: true, reveal: true }],
    },
  },

  // 迷いの森（緑・5枚） 到達効果: 「１枚ドロー。カードの置かれていない４マスに山札から１枚ずつ
  // 裏向きで置く。あなたの隣のカードをすべて捨てる。」
  // 手札効果: 「これをあなたの隣以外の、プレイヤーのいないマスに表向きで置く。」
  // 🔴 置く先は**「カードの置かれていない」マス**＝大地創造の「何もないマス」と違って
  //   **駒がいてもよい**（カードの文がそう書き分けられている）。裏向きで置くだけなので到達も起きない。
  "ex0-green-lost-forest": {
    arrival: {
      actions: [
        { verb: VERBS.DRAW, count: 1 },
        { verb: VERBS.PLACE_DECK_CARDS_IN_CHOSEN_CELLS, count: 4, requireNoCard: true, requireNoPiece: false, reveal: false },
        { verb: VERBS.DISCARD_ALL_ADJACENT_CARDS },
      ],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludeAdjacent: true, excludePieceCells: true },
        },
      ],
    },
  },

  // 不思議な果実（桃・4枚） 到達効果: 「あなたの手札が奇数枚なら１枚ドロー。」
  // ⚠ **手札効果はまだ自動処理にしていない**（「あなたの右隣の相手が、あなたを１マス移動させる」
  //   ＝委任と『このターンを終了する』が要る）。到達だけ自動で、手札効果は今までどおり
  //   文を読んで自分で処理する形になる。docs/ex0-effects-plan.md 参照。
  "ex0-pink-mystic-fruit": {
    // 手札効果: 「あなたの隣の２マス以上にカードが置かれている時に使える。１枚ドロー。
    //   あなたの右隣の相手が、あなたを１マス移動させる。このターンを終了する。」
    // ⓘ 「隣」＝前後左右の4マス（用語集）。「右隣の相手」＝時計回りで次の席。
    handEffect: {
      requiresAdjacentCardsAtLeast: 2,
      actions: [
        { verb: VERBS.DRAW, count: 1 },
        { verb: VERBS.MOVE_SELF_BY_RIGHT_NEIGHBOR, count: 1 },
        { verb: VERBS.END_TURN },
      ],
    },
    arrival: {
      actions: [{ verb: VERBS.DRAW_IF_HAND_ODD, count: 1 }],
    },
  },

  // バッドバーガー（黒・2枚） 到達効果: 「１枚ドロー。場の中央と四隅のマスのうち、プレイヤーの
  // いないマスを１マス選ぶ。あなたの手札をすべて、そのマスの１番上に置く。」
  // 手札効果: 「任意の１マスのカードをすべて捨てる。１枚ドロー。」
  // ⓘ 到達の「手札をすべて」は**ドローした1枚も含む**（句点の順どおり、先にドローする）。
  //   このカード自身はまだ盤面にあるので含まれない（既定動作で効果の後に手札へ入る）。
  "ex0-black-bad-burger": {
    arrival: {
      actions: [{ verb: VERBS.DRAW, count: 1 }, { verb: VERBS.PLACE_WHOLE_HAND_AT_CHOSEN_CELL }],
    },
    handEffect: {
      actions: [{ verb: VERBS.DISCARD_ALL_AT_CHOSEN_CELL }, { verb: VERBS.DRAW, count: 1 }],
    },
  },

  // ピュアバーガー（白・2枚） 手札効果: 「任意の１マスを選ぶ。そのマスの裏向きのカードの枚数分ドロー。」
  // ⚠ **到達効果はまだ自動処理にしていない**（「全員は１枚ドローし、自分の手札から１枚を
  //   そのマスの１番上に置く」＝全員への委任が要る）。docs/ex0-effects-plan.md 参照。
  // ピュアバーガー（白・2枚）
  //   到達: 「プレイヤーのいないマスを１マス選ぶ。全員は１枚ドローし、自分の手札から１枚を
  //         そのマスの１番上に置く。」
  //   手札: 「任意の１マスを選ぶ。そのマスの裏向きのカードの枚数分ドロー。」
  // ⚠ 「１番上に置く」＝ふつうに置けばそうなる（重なり順は配列の末尾が上）。
  "ex0-white-pure-burger": {
    arrival: {
      actions: [{ verb: VERBS.ALL_PLAYERS_DRAW_AND_PLACE_ONE_AT_CHOSEN_CELL, count: 1 }],
    },
    handEffect: {
      actions: [{ verb: VERBS.DRAW_PER_FACEDOWN_AT_CHOSEN_CELL }],
    },
  },

  // オレンジバス（橙・5枚）
  //   到達: 「『バスストップ』のあるマスに移動する。これをあなたの隣に表向きで置く。
  //         その『バスストップ』をあなたの手札に加える。」
  //   手札: 「これをあなたの隣以外のマスに表向きで置く。」
  // 🔴 **裏向きのバスストップは対象ではない**（2026-11-02 ユーザー回答）。対象にすると
  //   伏せ情報が漏れる。だから表向きのものだけを探す。
  // 🔴 addsCardToHandAfter: false ＝これ自身は手札に入らず**盤面（あなたの隣）へ置く**。
  "ex0-orange-bus": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [
        { verb: VERBS.MOVE_TO_CELL_WITH_NAMED_FACEUP_CARD, targetCardId: "ex0-orange-bus-stop", targetName: "バスストップ" },
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, onlyAdjacent: true },
          // 🔴 移動できなかったら、ここも行わない（元いたマスの隣に置いてしまう）。
          stopIfPreviousFailed: true,
        },
        {
          verb: VERBS.PICKUP_NAMED_CARD_AT_OWN_CELL,
          targetCardId: "ex0-orange-bus-stop",
          targetName: "バスストップ",
          stopIfPreviousFailed: true,
        },
      ],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludeAdjacent: true },
        },
      ],
    },
  },

  // 平和への願い（桃・5枚）
  //   到達: 「次のあなたのターンの開始時、あなたがこれの上にいて、その間に誰も手札効果を
  //         使っていないなら、全員は２枚ドローし、これを裏向きにする。そうでないなら、
  //         これをあなたの手札に加える。」
  //   手札: 「１枚ドロー。これをあなたの隣以外のマスに裏向きで置く。」
  // 🔴 到達の時点では**何も起きない**（印を付けて持ち越すだけ）。実際の判定は
  //   main.js の resolvePeaceWishesAtTurnStart（ターンが切り替わった瞬間）が行う。
  // 🔴 addsCardToHandAfter: false ＝到達では手札に加えない（盤面に残して持ち越す）。
  "ex0-pink-wish-for-peace": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [{ verb: VERBS.REGISTER_PEACE_WISH, count: 2 }],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        { verb: VERBS.DRAW, count: 1 },
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: false,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludeAdjacent: true },
        },
      ],
    },
  },

  // バスストップ（橙・4枚） 手札効果: 「以下の効果のうち１つ得る。／・あなたの手札を１枚捨てる。
  // これを任意のマスに表向きで置く。／・これを任意のマスに裏向きで置く。」
  // ⚠ **到達効果はまだ**（「このターンにこれがオープンされたのなら」の記録が要る）。
  // 🔴 どちらの選択肢も**これ自身を盤面へ置く**ので keepsCardOnUse（＝先に捨てない）。
  //   ①で捨てるのは**別の手札1枚**なので exceptSelf を渡す（自分を捨てると置けなくなる）。
  "ex0-orange-bus-stop": {
    // 到達効果: 「これはあなたの手札に加えない。このターンにこれがオープンされたのなら、１枚ドロー。」
    // 🔴 addsCardToHandAfter: false ＝「手札に加えない」（盤面に残る）。
    arrival: {
      addsCardToHandAfter: false,
      actions: [{ verb: VERBS.DRAW_IF_OPENED_THIS_TURN, count: 1 }],
    },
    handEffectOptions: [
      {
        id: "ex0-busstop-discard-faceup",
        labelKey: "cef.opt.ex0BusStopFaceUp",
        keepsCardOnUse: true,
        // 善処の原則（これ自身＋捨てる1枚＝2枚ないと選べない）は、
        // isHandEffectOptionUsable の「DISCARD_ONE_HAND_CARD があるなら、自分以外の手札が
        // 1枚以上あるか」の判定が既に担っている。
        // ⚠ requiresMinHandSize は**到達効果の側だけが見る**フラグなので、ここに書いても効かない。
        actions: [
          { verb: VERBS.DISCARD_ONE_HAND_CARD, exceptSelf: true },
          {
            verb: VERBS.PLACE_CARD,
            source: "self",
            faceUp: true,
            count: 1,
            destination: { selection: TARGET_SELECTIONS.CHOOSE },
          },
        ],
      },
      {
        id: "ex0-busstop-facedown",
        labelKey: "cef.opt.ex0BusStopFaceDown",
        keepsCardOnUse: true,
        actions: [
          {
            verb: VERBS.PLACE_CARD,
            source: "self",
            faceUp: false,
            count: 1,
            destination: { selection: TARGET_SELECTIONS.CHOOSE },
          },
        ],
      },
    ],
  },

  // ゲートチャージ（黄・4枚）
  //   到達: 「１枚ドロー。このターンにこれがオープンされたのなら、これをあなたのゲートに表向きで
  //         置く。そうでないなら、移動前のマスに強制移動し、これを捨てる。ただし相手のゲートへは
  //         移動できない。」
  //   手札: 「これをあなたのゲートに表向きで置く。」
  // 🔴 addsCardToHandAfter: false ＝どちらの枝でも**手札には入らない**（ゲートへ置くか捨てる）。
  "ex0-yellow-gate-charge": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [{ verb: VERBS.DRAW, count: 1 }, { verb: VERBS.GATE_CHARGE_PLACE_OR_RETURN }],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.OWN_GATE },
        },
      ],
    },
  },

  // 後援するヴィヴィアン（紫・1枚・ONLY）
  //   到達: 「相手を１人選ぶ。その相手はムーブフェイズを行う。その相手が到達したカードを
  //         自分の手札に加えるなら、代わりにそのカードをあなたの手札に加える。」
  //   手札: 「上記の到達効果を得る。」
  // ⚠ 「ムーブフェイズを行う」は、このアプリでは**1マスの移動＋移動先のオープン＋到達**に
  //   まとめてある（接触を選ぶ道は作っていない＝申し送り）。
  "ex0-purple-vivian": {
    arrival: {
      actions: [{ verb: VERBS.CHOSEN_OPPONENT_DOES_MOVE_PHASE_FOR_YOU }],
    },
    handEffect: {
      inheritsArrival: true,
      actions: [{ verb: VERBS.INHERIT_ARRIVAL_ACTIONS }],
    },
  },

  // 我忘れの白き龍（ノクスアエル）（白・1枚・ONLY）
  //   ★ 「これは他のカードの効果の対象にならない。」→ isTargetableByOtherCardEffects で除く。
  //   【色者】 「これが場に表向きである限り、各プレイヤーのターン終了時に山札から１枚捨て、
  //     そのカードの色（捨色）を確認して、①移動先表示に従いこれをそのマスに置く。
  //     ②その色の効果を得る。」
  //     → **この常駐の処理は main.js の resolveShikijaAtTurnEnd が行う**（ターンが切り替わった
  //       瞬間に、その前のターンのプレイヤーの「ターン終了時」として走る）。
  //   到達: 「１枚ドロー。１マス強制移動する。」（補足「これに到達しても、これをあなたの
  //         手札に加えない。」＝ addsCardToHandAfter: false ＋ hideNoHandNote）
  //   手札: 「これを任意のマスに表向きで置く。」
  "ex0-white-dragon": {
    arrival: {
      addsCardToHandAfter: false,
      hideNoHandNote: true,
      actions: [{ verb: VERBS.DRAW, count: 1 }, { verb: VERBS.FORCED_MOVE, count: 1 }],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE },
        },
      ],
    },
  },

  // 紅の鉄拳（赤・4枚）
  //   到達: 「以下の効果のうち１つ得る。／・【追色１】２枚ドロー。／
  //         ・あなたの周囲の相手を１人選ぶ。その相手に接触する。」
  //   手札: 「【追色S】あなたの周囲の相手を１人選ぶ。その相手に接触する。」
  // ⚠ **手札効果はまだ自動処理にしていない**。【追色S】は払う枚数をプレイヤーが決める
  //   新しいコストの形で、しかも「接触で奪えるカードはSの２倍」＝奪う枚数を変える必要がある。
  //   奪うのは**サーバー（Edge Function）が無作為に選ぶ**処理なので、そちらの改修も要る。
  // 🔴 到達の②で奪う枚数は**通常の接触と同じ1枚**（2026-11-02 ユーザー回答）。
  "ex0-red-crimson-fist": {
    arrivalOptions: [
      {
        id: "ex0-fist-draw",
        labelKey: "cef.opt.ex0FistDraw",
        cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
        actions: [{ verb: VERBS.DRAW, count: 2 }],
      },
      {
        id: "ex0-fist-contact",
        labelKey: "cef.opt.ex0FistContact",
        requiresOpponentInSurrounding: true,
        actions: [{ verb: VERBS.CONTACT_CHOSEN_OPPONENT_IN_SURROUNDING }],
      },
    ],
  },

  // 異能者　マックールのネオ・フォース（橙・1枚・ONLY）
  //   到達: 「あなたの隣のマスのカードを２枚、あなたの手札に加える。」
  //   手札: 「【追色１】相手を１人選ぶ。その相手の周囲に強制移動する。移動先のカードは
  //         オープンしない。このターンを終了する。」
  "ex0-orange-mccool": {
    arrival: {
      actions: [{ verb: VERBS.PICKUP_ADJACENT_CARDS_TO_HAND, count: 2 }],
    },
    handEffect: {
      cost: { verb: VERBS.DISCARD_SAME_COLOR, count: 1 },
      actions: [
        { verb: VERBS.FORCED_MOVE_TO_SURROUNDING_OF_CHOSEN_OPPONENT, noArrival: true },
        { verb: VERBS.END_TURN },
      ],
    },
  },

  // 大盗賊　リトルマウスの手癖（黄・1枚・ONLY）
  //   到達: 「１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーの手札から
  //         無作為に２枚、あなたの手札に加える。」
  //   手札: 「いつでも使える。上記の到達効果を得る。あなたのターンに使ったなら、
  //         このターンを終了する。」
  // ⚠ 「プレイヤー」＝**自分も含む**（「相手」と書かれていない）。自分が単独で1番多い時は
  //   自分しか選べず、自分から奪う＝何も起きない。これは literal な読み。
  "ex0-yellow-little-mouse": {
    arrival: {
      actions: [{ verb: VERBS.STEAL_RANDOM_FROM_MOST_LOCKED, count: 2 }],
    },
    handEffect: {
      usableAnytime: true,
      usableAnytimeLabel: "いつでも使える。", // 印字どおり（手品師の技とは文言が違う）
      // ⚠ inheritsArrival は立てない。立てると生成文が「上記の到達効果を得る。」
      //   だけになり、2文目（ターンを終了する）が消える。
      actions: [
        { verb: VERBS.INHERIT_ARRIVAL_ACTIONS },
        { verb: VERBS.END_TURN_IF_OWN_TURN },
      ],
    },
  },

  // 森の民　ピーターフッドの日常（緑・1枚・ONLY）
  //   到達: 「あなたの隣に山札から３枚ずつ裏向きで置く。」
  //   手札: 「１〜７の数字を１つ選ぶ。全員は手札がその枚数になるようにドローする、
  //         または捨てる。このフェイズを終了する。」
  "ex0-green-peterhood": {
    arrival: {
      actions: [{ verb: VERBS.PLACE_DECK_CARDS_ON_ADJACENT, count: 3 }],
    },
    handEffect: {
      actions: [
        { verb: VERBS.ALL_PLAYERS_SET_HAND_SIZE, min: 1, max: 7 },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // 魅惑のヤエザ（桃・1枚・ONLY）
  //   到達: 「相手を１人選ぶ。その相手はこれを自分の手札に加え、以下の効果のうち１つ得る。
  //         ・自分の手札をすべて捨てる。１枚ドロー。／・自分のロックしている１枚を捨てる。」
  //   手札: 「上記の到達効果を得る。」
  // 🔴 addsCardToHandAfter: false ＝これは**相手の手札**に行く。
  // 🔴 手札効果は keepsCardOnUse（先に捨てると渡すものが無くなる）。
  "ex0-pink-yaeza": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [{ verb: VERBS.GIVE_SELF_TO_CHOSEN_OPPONENT_WITH_OPTIONS }],
    },
    handEffect: {
      keepsCardOnUse: true,
      inheritsArrival: true,
      actions: [{ verb: VERBS.INHERIT_ARRIVAL_ACTIONS }],
    },
  },

  // ヴド族との契約（黒・1枚・ONLY）
  //   到達: 「全員は手札が２枚以下になるように捨てる。そうしたなら、自分の手札を１枚
  //         ロックしてもよい、ただし最後のロックはできない。」
  //   手札: 「上記の到達効果を得る。」
  // ⚠ **「自分の」は『全員』それぞれを指す**と読んだ（ヤエザの「その相手は…自分の手札に
  //   加え」と同じ用法＝直前の主語を指す）。つまり捨てた人は全員ロックしてよい。
  //   ⚠ 読み替えが要るならここだけ直せばよい（ユーザー確認待ち）。
  "ex0-black-vood-contract": {
    arrival: {
      actions: [{ verb: VERBS.ALL_PLAYERS_DISCARD_DOWN_TO_THEN_MAY_LOCK, keep: 2 }],
    },
    handEffect: {
      inheritsArrival: true,
      actions: [{ verb: VERBS.INHERIT_ARRIVAL_ACTIONS }],
    },
  },

  // 鑑定士の技 -トゥルーアイズ-（青・5枚）
  //   到達: 「任意の１マスの裏向きのカードの表面を見る。」
  //   手札: 「色を２色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンし、
  //         あなたの手札に加える。そのカードが宣言色なら、ここまでを繰り返す。このフェイズを終了する。」
  // ⓘ 補足「見るのは選んだマスの１番上のカードである。（１番上の原則）」
  // ⓘ 補足「『ここまで』とは『色を２色宣言する』から『あなたの手札に加える』まで」＝
  //   繰り返すたびに色を宣言し直す。「このフェイズを終了する」は繰り返さない。
  // ⚠ 到達効果（見る）は**オンラインでは中身が読めない**（裏向きのカードは cardId が
  //   マスクされる）。その時は「手元で確かめてください」と出す＝ルール違反にはならない
  //   （見る効果なので、盤面は何も変わらない）。CPU戦では普通に見られる。
  "ex0-blue-appraiser": {
    arrival: {
      actions: [{ verb: VERBS.PEEK_FACEDOWN_AT_CHOSEN_CELLS, count: 1 }],
    },
    handEffect: {
      actions: [
        { verb: VERBS.DECLARE_AND_OPEN_TO_HAND_REPEAT, colorCount: 2 },
        { verb: VERBS.END_CURRENT_PHASE },
      ],
    },
  },

  // 歴史家　ジェイクの記憶術（青・1枚・ONLY）
  //   到達: 「任意の７マスの裏向きのカードの表面を見る。」
  //   手札: 「色を１色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンする。
  //         そのカードが宣言色なら、ここまでを繰り返す、ただし計７枚までしかオープンできない。
  //         ７枚目が宣言色なら、それら７枚をあなたの手札に加える。このターンを終了する。」
  // 🔴 鑑定士の技と似ているが**毎回手札に入れるのではない**（7枚目も当たった時だけ全部）。
  "ex0-blue-jake": {
    arrival: {
      actions: [{ verb: VERBS.PEEK_FACEDOWN_AT_CHOSEN_CELLS, count: 7 }],
    },
    handEffect: {
      actions: [
        { verb: VERBS.DECLARE_AND_OPEN_UP_TO_N_THEN_HAND, colorCount: 1, maxCount: 7 },
        { verb: VERBS.END_TURN },
      ],
    },
  },

  // 足下の隠し財産（紫・5枚）
  //   到達: 「あなたの隣以外の、カードの置かれたマスを１マス選ぶ。１枚ドローして公開する。
  //         そのカードを選んだマスの１番下に表向きで置く。」
  //   手札: 「以下の効果のうち１つ得る。／・上記の到達効果を得る。／・あなたの手札から１枚を、
  //         カードの置かれた任意のマスの１番下に表向きで置く。」
  // ⓘ 補足「あなたのいるマスも選べる。あなたの隣のマスは選べない。」＝除くのは**隣の4マスだけ**。
  // 🔴 ②には「隣以外」の縛りが**無い**（①だけ）。取り違えると選べるマスがズレる。
  "ex0-purple-hidden-fortune": {
    arrival: {
      actions: [{ verb: VERBS.PUBLIC_DRAW_TO_BOTTOM_OF_CHOSEN_CELL, count: 1 }],
    },
    handEffectOptions: [
      {
        id: "ex0-fortune-inherit",
        labelKey: "cef.opt.ex0FortuneInherit",
        // 善処の原則: 「隣以外の、カードの置かれたマス」が1つも無ければ選べない。
        requiresNonAdjacentCellWithCard: true,
        actions: [{ verb: VERBS.INHERIT_ARRIVAL_ACTIONS }],
      },
      {
        id: "ex0-fortune-hand",
        labelKey: "cef.opt.ex0FortuneHand",
        // 善処の原則: 「カードの置かれたマス」と「これ以外の手札」の両方が要る。
        requiresCellWithCard: true,
        requiresOtherHandCard: true,
        actions: [{ verb: VERBS.PLACE_HAND_CARD_AT_BOTTOM_OF_CHOSEN_CELL, count: 1 }],
      },
    ],
  },

  // リーチキャンセル（黄・5枚）
  //   到達: 「移動前のマスに強制移動する。」
  //   手札: 「無色以外のカードの到達効果の処理の直前に使える。そのカードの効果を無効にし、
  //         そのカードを捨てる。」
  // 🔴 **この手札効果の実行は main.js の offerArrivalCancelInterrupt が行う**（下の
  //   CANCEL_ARRIVAL_EFFECT のコメント参照）。ここのデータは効果文の生成と
  //   「ハンドフェイズでは使えない」（handEffectReactiveOnly）のために置いてある。
  // ⚠ usableAnytime は立てない——ふだんの割り込みモーダル（ロック宣言・移動宣言の後）に
  //   並べても「到達効果の処理の直前」にはならないので、別の窓で聞く。
  "ex0-yellow-reach-cancel": {
    handEffectReactiveOnly: true,
    arrival: {
      actions: [{ verb: VERBS.FORCED_MOVE_TO_PREVIOUS_CELL }],
    },
    handEffect: {
      requiresArrivalEffectWindow: true,
      actions: [{ verb: VERBS.CANCEL_ARRIVAL_EFFECT }],
    },
  },

  // 走り人　ジョイナーの走術（赤・1枚・ONLY）
  //   到達: 「１マス強制移動する。」
  //   手札: 「何もないあなたの隣のマスに強制移動することを、任意の回数繰り返す。このターンを終了する。」
  // ⓘ 「何もないマス」＝カードも駒も無いマス（用語集）。カードが無いので到達は起きない。
  "ex0-red-joyner": {
    arrival: {
      actions: [{ verb: VERBS.FORCED_MOVE, count: 1 }],
    },
    handEffect: {
      actions: [
        { verb: VERBS.FORCED_MOVE, count: 1, requireEmpty: true, repeat: "any" },
        { verb: VERBS.END_TURN },
      ],
    },
  },

  // 誰かの白きカゲ（白・1枚・ONLY）
  //   到達: 「これを捨てる。このマスから十字方向の計１２マスに山札から１枚ずつ裏向きで置く。
  //         それらをすべてオープンする。」
  //   手札: 「これをあなたの周囲以外のマスに裏向きで置く。」
  // ⓘ 「周囲」＝斜めも含む8マス（「隣」＝前後左右4マスとは別の概念＝用語集）。
  // 🔴 addsCardToHandAfter: false ＝これは捨てる（DISCARD_SELF が先に書いてあるので
  //   「これはあなたの手札に加えない。」の一文は生成されない＝印字どおり）。
  "ex0-white-someones-shadow": {
    arrival: {
      addsCardToHandAfter: false,
      actions: [
        { verb: VERBS.DISCARD_SELF },
        { verb: VERBS.PLACE_DECK_CARDS_IN_CROSS_AND_OPEN_ALL, count: 1, cellCount: 12 },
      ],
    },
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: false,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludeSurrounding: true },
        },
      ],
    },
  },

  // やり直しのカギ（紫・4枚）
  //   到達: 「あなたの手札を任意の枚数捨ててもよい。捨てた枚数分ドロー。」
  //   手札: 「相手がロックを宣言した時に使える。その相手はこのターンにロックできない。」
  // 🔴 handEffectReactiveOnly ＝**ハンドフェイズの自己申告では使えない**（割り込み専用）。
  //   usableAnytime を立てると、既にある割り込みモーダル（triggerAnytimeInterruptCheckpoint）
  //   に並ぶ。ロック宣言の窓かどうかは requiresOpponentLockDeclaration が見る。
  // ⚠ usableAnytimeLabel で文言を印字に合わせている（既定は「この効果はいつでも使える。」）。
  "ex0-purple-redo-key": {
    handEffectReactiveOnly: true,
    arrival: {
      actions: [{ verb: VERBS.DISCARD_ANY_HAND_THEN_DRAW_SAME }],
    },
    handEffect: {
      usableAnytime: true,
      usableAnytimeLabel: "相手がロックを宣言した時に使える。",
      requiresOpponentLockDeclaration: true,
      actions: [{ verb: VERBS.DISABLE_LOCK_THIS_TURN_FOR_DECLARER }],
    },
  },

  // 厳重警戒（青・4枚） 到達効果: 「以下の効果のうち１つ得る。／・あなたの手札が１枚になるように
  // 捨てる。／・あなたのゲートに強制移動する。移動先のカードはオープンしない。」
  // 手札効果: 「これをプレイヤーのいないマスに表向きで置く。」
  "ex0-blue-strict-watch": {
    arrivalOptions: EX0_STRICT_WATCH_OPTIONS,
    handEffect: {
      keepsCardOnUse: true,
      actions: [
        {
          verb: VERBS.PLACE_CARD,
          source: "self",
          faceUp: true,
          count: 1,
          destination: { selection: TARGET_SELECTIONS.CHOOSE, excludePieceCells: true },
        },
      ],
    },
  },

  // 色寄せの笛（7色・各4枚＝計28枚）。**0th拡張の山札の4分の1がこれ**なので、
  // ここが自動で動くかどうかで遊び心地がだいぶ変わる。7枚は色だけが違い、効果は同じ。
  // 色寄せの笛（赤）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-red": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（橙）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-orange": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（黄）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-yellow": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（緑）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-green": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（青）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-blue": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（桃）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-pink": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
  // 色寄せの笛（紫）。到達効果・手札効果とも EX0_FLUTE_OPTIONS（上の2択）。
  "ex0-flute-purple": {
    arrivalOptions: EX0_FLUTE_OPTIONS,
    handEffectOptions: EX0_FLUTE_OPTIONS,
  },
};

// --- 効果データ → 表示テキスト生成 -----------------------------------------------------
// ユーザー確認済み方針「効果を修正したら効果文も毎回上書き生成される（＝そもそも保存せず
// 毎回その場で計算する）」。動詞ごとにテンプレート文を持たせる方式（1つの万能組み立て
// ロジックにはしない——日本語は助数詞・語順が動詞ごとに変わるため）。
// 生成される文章は今の説明書の言い回しほど自然ではない、やや機械的な文になる想定
// （フレーバーテキストΩは別枠のまま人力で書く）。

// ユーザー要望「効果文が生成される」を実際の説明書の言い回しに近づけるための微調整。
// 説明書（docs/cards.md）は数字を全角（１２３…）で書く慣習のため、生成テキストでも
// 半角の数値をそのまま埋め込まず全角に変換する。
const FULLWIDTH_DIGITS = "０１２３４５６７８９";
function toFullWidthNumber(n) {
  return String(n).replace(/[0-9]/g, (d) => FULLWIDTH_DIGITS[Number(d)]);
}

function renderTargetLabel(target) {
  if (target === TARGETS.ALL_OPPONENTS) return "相手全員は";
  // なないろの巨光専用: docs/cards.mdの実際の文言は「全員は」ではなく「全員、」
  // （読点区切り）になっている。ALL_OPPONENTSとは別の言い回しのため区別する。
  if (target === TARGETS.ALL_PLAYERS) return "全員、";
  return ""; // 自分が主語の場合、既存の説明書と同じく主語を省略する
}

function renderAction(action, context) {
  const count = toFullWidthNumber(action.count);
  switch (action.verb) {
    case VERBS.MOVE:
      // atOnce（一気に）: 中間マスの状態を無視して直接ワープする、実際に挙動が変わる
      // 条件（ユーザー指摘、単なる言い回しの違いではない）。falseなら1マスずつの
      // 通常移動をcount回繰り返す想定（各回で移動先にカードが必要、到達判定も毎回発生）。
      return action.atOnce ? `${count}マス先に一気に移動する。` : `${count}マス移動する。`;
    case VERBS.DRAW:
      return `${renderTargetLabel(action.target)}${count}枚ドロー。`;
    case VERBS.PICKUP_DISCARD_SECOND_FROM_TOP:
      return "捨て場の１番上から２番目のカードをあなたの手札に加える。";
    case VERBS.PICKUP_DISCARD_TOP:
      return "捨て場の１番上のカードをあなたの手札に加える。";
    case VERBS.FLIP_UP_TO_N_WITHIN_RANGE:
      // 色寄せの笛: withinCells を渡さない（＝場の全体）・optional:false（＝必ず）の形。
      if (action.withinCells == null) {
        return `任意の${toFullWidthNumber(action.maxCount)}マスのカードをオープンする。`;
      }
      return `${toFullWidthNumber(action.withinCells)}マス以内のカードを${toFullWidthNumber(action.maxCount)}枚までオープンしてもよい。`;
    case VERBS.PICKUP_FACEUP_SAME_COLOR_TO_HAND:
      return "これと同色の、場の表向きのカード１枚をあなたの手札に加える。";
    case VERBS.PLACE_DECK_CARDS_IN_CHOSEN_CELLS: {
      const どのマス = action.requireNoPiece ? "何もない" : "カードの置かれていない";
      const 置く = `${どのマス}${toFullWidthNumber(action.count)}マスに山札から１枚ずつ裏向きで置く。`;
      return action.reveal ? `${置く}それらをオープンする。` : 置く;
    }
    case VERBS.DISCARD_ALL_ADJACENT_CARDS:
      return "あなたの隣のカードをすべて捨てる。";
    case VERBS.DRAW_IF_HAND_ODD:
      return `あなたの手札が奇数枚なら${count}枚ドロー。`;
    case VERBS.PLACE_WHOLE_HAND_AT_CHOSEN_CELL:
      return "場の中央と四隅のマスのうち、プレイヤーのいないマスを１マス選ぶ。あなたの手札をすべて、そのマスの１番上に置く。";
    case VERBS.DRAW_PER_FACEDOWN_AT_CHOSEN_CELL:
      return "任意の１マスを選ぶ。そのマスの裏向きのカードの枚数分ドロー。";
    case VERBS.DISCARD_OWN_HAND_DOWN_TO:
      return `あなたの手札が${toFullWidthNumber(action.keep)}枚になるように捨てる。`;
    case VERBS.DISCARD_ANY_HAND_THEN_DRAW_SAME:
      return "あなたの手札を任意の枚数捨ててもよい。捨てた枚数分ドロー。";
    case VERBS.DRAW_IF_OPENED_THIS_TURN:
      return `このターンにこれがオープンされたのなら、${count}枚ドロー。`;
    case VERBS.PUBLIC_DRAW_TO_BOTTOM_OF_CHOSEN_CELL:
      return `あなたの隣以外の、カードの置かれたマスを${toFullWidthNumber(1)}マス選ぶ。${count}枚ドローして公開する。そのカードを選んだマスの${toFullWidthNumber(1)}番下に表向きで置く。`;
    case VERBS.PLACE_HAND_CARD_AT_BOTTOM_OF_CHOSEN_CELL:
      return `あなたの手札から${count}枚を、カードの置かれた任意のマスの${toFullWidthNumber(1)}番下に表向きで置く。`;
    case VERBS.MOVE_TO_CELL_WITH_NAMED_FACEUP_CARD:
      // ⚠ カード名は action.targetName から取る（このファイルは cards-data.js を import
      //   していない＝getCardDefinition が無い。import すると循環する）。
      return `「${action.targetName}」のあるマスに移動する。`;
    case VERBS.PICKUP_NAMED_CARD_AT_OWN_CELL:
      return `その「${action.targetName}」をあなたの手札に加える。`;
    case VERBS.FORCED_MOVE: {
      if (action.repeat === "any")
        return `${action.requireEmpty ? "何もないあなたの隣のマス" : count + "マス"}に強制移動することを、任意の回数繰り返す。`;
      return `${count}マス強制移動する。${action.noArrival ? "移動先のカードはオープンしない。" : ""}`;
    }
    case VERBS.FORCED_MOVE_TO_PREVIOUS_CELL:
      return "移動前のマスに強制移動する。";
    case VERBS.GATE_CHARGE_PLACE_OR_RETURN:
      return "このターンにこれがオープンされたのなら、これをあなたのゲートに表向きで置く。そうでないなら、移動前のマスに強制移動し、これを捨てる。ただし相手のゲートへは移動できない。";
    case VERBS.END_TURN:
      return "このターンを終了する。";
    case VERBS.PEEK_FACEDOWN_AT_CHOSEN_CELLS:
      return `任意の${count}マスの裏向きのカードの表面を見る。`;
    case VERBS.DECLARE_AND_OPEN_TO_HAND_REPEAT:
      return `色を${toFullWidthNumber(action.colorCount)}色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンし、あなたの手札に加える。そのカードが宣言色なら、ここまでを繰り返す。`;
    case VERBS.DECLARE_AND_OPEN_UP_TO_N_THEN_HAND:
      return `色を${toFullWidthNumber(action.colorCount)}色宣言する。プレイヤーのいない１マスの裏向きのカードをオープンする。そのカードが宣言色なら、ここまでを繰り返す、ただし計${toFullWidthNumber(action.maxCount)}枚までしかオープンできない。${toFullWidthNumber(action.maxCount)}枚目が宣言色なら、それら${toFullWidthNumber(action.maxCount)}枚をあなたの手札に加える。`;
    case VERBS.ALL_PLAYERS_DRAW_AND_PLACE_ONE_AT_CHOSEN_CELL:
      return `プレイヤーのいないマスを${toFullWidthNumber(1)}マス選ぶ。全員は${count}枚ドローし、自分の手札から${toFullWidthNumber(1)}枚をそのマスの${toFullWidthNumber(1)}番上に置く。`;
    case VERBS.MOVE_SELF_BY_RIGHT_NEIGHBOR:
      return `あなたの右隣の相手が、あなたを${count}マス移動させる。`;
    case VERBS.CHOSEN_OPPONENT_DOES_MOVE_PHASE_FOR_YOU:
      return `相手を${toFullWidthNumber(1)}人選ぶ。その相手はムーブフェイズを行う。その相手が到達したカードを自分の手札に加えるなら、代わりにそのカードをあなたの手札に加える。`;
    case VERBS.DISABLE_LOCK_THIS_TURN_FOR_DECLARER:
      return "その相手はこのターンにロックできない。";
    case VERBS.CANCEL_ARRIVAL_EFFECT:
      return "そのカードの効果を無効にし、そのカードを捨てる。";
    case VERBS.REGISTER_PEACE_WISH:
      return `次のあなたのターンの開始時、あなたがこれの上にいて、その間に誰も手札効果を使っていないなら、全員は${count}枚ドローし、これを裏向きにする。そうでないなら、これをあなたの手札に加える。`;
    case VERBS.CONTACT_CHOSEN_OPPONENT_IN_SURROUNDING:
      return `あなたの周囲の相手を${toFullWidthNumber(1)}人選ぶ。その相手に接触する。`;
    case VERBS.PICKUP_ADJACENT_CARDS_TO_HAND:
      return `あなたの隣のマスのカードを${count}枚、あなたの手札に加える。`;
    case VERBS.FORCED_MOVE_TO_SURROUNDING_OF_CHOSEN_OPPONENT:
      return `相手を${toFullWidthNumber(1)}人選ぶ。その相手の周囲に強制移動する。${action.noArrival ? "移動先のカードはオープンしない。" : ""}`;
    case VERBS.STEAL_RANDOM_FROM_MOST_LOCKED:
      return `${toFullWidthNumber(1)}番多くロックしているプレイヤーを${toFullWidthNumber(1)}人選ぶ。そのプレイヤーの手札から無作為に${count}枚、あなたの手札に加える。`;
    case VERBS.END_TURN_IF_OWN_TURN:
      return "あなたのターンに使ったなら、このターンを終了する。";
    case VERBS.PLACE_DECK_CARDS_ON_ADJACENT:
      return `あなたの隣に山札から${count}枚ずつ裏向きで置く。`;
    case VERBS.ALL_PLAYERS_SET_HAND_SIZE:
      return `${toFullWidthNumber(action.min)}〜${toFullWidthNumber(action.max)}の数字を${toFullWidthNumber(1)}つ選ぶ。全員は手札がその枚数になるようにドローする、または捨てる。`;
    case VERBS.GIVE_SELF_TO_CHOSEN_OPPONENT_WITH_OPTIONS:
      // ⚠ 2つの選択肢は**相手が**選ぶので arrivalOptions（使用者が選ぶ形）では表せない。
      //   文はここに直接書く（印字どおり）。
      return `相手を${toFullWidthNumber(1)}人選ぶ。その相手はこれを自分の手札に加え、以下の効果のうち${toFullWidthNumber(1)}つ得る。\n・自分の手札をすべて捨てる。${toFullWidthNumber(1)}枚ドロー。\n・自分のロックしている${toFullWidthNumber(1)}枚を捨てる。`;
    case VERBS.ALL_PLAYERS_DISCARD_DOWN_TO_THEN_MAY_LOCK:
      return `全員は手札が${toFullWidthNumber(action.keep)}枚以下になるように捨てる。そうしたなら、自分の手札を${toFullWidthNumber(1)}枚ロックしてもよい、ただし最後のロックはできない。`;
    case VERBS.PLACE_DECK_CARDS_IN_CROSS_AND_OPEN_ALL:
      return `このマスから十字方向の計${toFullWidthNumber(action.cellCount)}マスに山札から${count}枚ずつ裏向きで置く。それらをすべてオープンする。`;
    case VERBS.DISCARD_RANDOM_FROM_QUALIFYING_OPPONENTS:
      return `手札が${toFullWidthNumber(action.minHandSize)}枚以上ある相手全員の手札から、無作為に１枚ずつ選び、それらを捨てる。`;
    case VERBS.DISCARD_ALL_AT_CHOSEN_CELL:
      return "任意の１マスのカードをすべて捨てる。";
    case VERBS.PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END:
      return `${count}枚ドローして、それらをすべて公開する。ターン終了時、それらを捨てる。`;
    case VERBS.MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF:
      return "相手をあなたの周囲へ移動する。このターンあなたは接触できない。";
    case VERBS.PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD:
      return `${count}枚ドロー。それらを公開する。それらの手札効果はこのターン使うことができない。その中に橙のカードがあったなら、あなたの手札をすべて捨て、あなたはこのターン移動できない。`;
    case VERBS.ANNOUNCE_MOVEMENT_BOOST_THIS_TURN:
      return "このターンの通常の移動は２マス先に一気に移動する。";
    case VERBS.LOCK_ONE_HAND_CARD_EXCEPT_FINAL:
      return "あなたの手札を１枚ロックする、ただし最後のロックはできない。";
    case VERBS.LOCK_HAND_CARD_INTO_NOIR_SLOT:
      return "これの置かれた色のロックエリアにカードを１枚ロックする。そうしたなら、";
    case VERBS.PICKUP_TO_HAND: {
      const zoneLabel = action.withinCells
        ? `${toFullWidthNumber(action.withinCells)}マス以内の`
        : action.target?.selection === TARGET_SELECTIONS.CHOOSE
          ? `任意の${toFullWidthNumber(action.target.count)}マスの`
          : "";
      if (action.target?.saveAs) context.selections[action.target.saveAs] = action.target;
      return `${zoneLabel}${count}枚をあなたの手札に加える。`;
    }
    case VERBS.PLACE_CARD: {
      const faceLabel = action.faceUp ? "表向きで" : "裏向きで";
      // source: "self"（ジャンプ台の手札効果等）: 「手札から／山札から○枚」ではなく
      // 「これを」で始まる、このカード自身を指す専用の文型になる。
      if (action.source === "self") {
        // 黒の契約の烙印専用: 実際の文言は「これを」始まりではなく「あなたの空いている
        // ロックエリアに、これを〜置く」という置き場所（ロックエリア）が先に来る語順。
        if (action.destination?.selection === TARGET_SELECTIONS.OWN_EMPTY_LOCK_SLOTS) {
          return `あなたの空いているロックエリアに、これを${faceLabel}置く。`;
        }
        // 0th拡張（ゲートチャージ）: 「これをあなたのゲートに表向きで置く。」
        if (action.destination?.selection === TARGET_SELECTIONS.OWN_GATE) {
          return `これをあなたのゲートに${faceLabel}置く。`;
        }
        // 0th拡張（迷いの森・厳重警戒）: 置き先の条件をそのまま文にする。印字の語順に合わせて
        // 「あなたの隣以外の、プレイヤーのいないマスに」となるよう、隣→駒の順でつなぐ。
        const destLabel = action.destination?.onlyAdjacent
          ? "あなたの隣に"
          : action.destination?.excludeGates
          ? "ゲート以外の任意のマスに"
          : action.destination?.excludeSurrounding
            ? "あなたの周囲以外のマスに"
            : action.destination?.excludeAdjacent && action.destination?.excludePieceCells
              ? "あなたの隣以外の、プレイヤーのいないマスに"
              : action.destination?.excludeAdjacent
                ? "あなたの隣以外のマスに"
                : action.destination?.excludePieceCells
                  ? "プレイヤーのいないマスに"
                  : "任意のマスに";
        // selfLabelで上書きできる。以前は選べる罠の印字が「このカードを」だったため
        // 使っていたが、2026-09-24に印刷カードどおり「これを」へ揃えたので、いま渡して
        // いるカードは無い（既定の「これ」で全部足りる）。
        return `${action.selfLabel ?? "これ"}を${destLabel}${faceLabel}置く。`;
      }
      const sourceLabel = action.source === "hand" ? "手札から" : "山札から";
      // 増殖する樹々専用: 範囲内の「何もないマス」全てが自動的に対象になる（プレイヤーが
      // 選ぶ必要が無い）ため、他の選択式（choose/same_as）とは別の専用の文型になる。
      if (action.destination?.selection === TARGET_SELECTIONS.ALL_WITHIN_RANGE) {
        // 「１枚ずつ」は該当マス1つあたりの枚数を指す固定値で、action.count（無指定＝
        // undefined）とは無関係のため、上のcount変数は使わずここだけ決め打ちにする。
        const rangeLabel = action.destination.withinCells ? `${toFullWidthNumber(action.destination.withinCells)}マス以内の` : "";
        return `${rangeLabel}何もない全てのマスに${sourceLabel}カードを１枚ずつ${faceLabel}置く。`;
      }
      const destLabel =
        action.destination?.selection === TARGET_SELECTIONS.SAME_AS
          ? "そのマスに"
          : action.count > 1
            ? `任意の${count}マスに`
            : "任意のマスに";
      const perCardCount = action.destination?.selection === TARGET_SELECTIONS.SAME_AS ? count : "１";
      return `${destLabel}${sourceLabel}${perCardCount}枚${action.count > 1 ? "ずつ" : ""}${faceLabel}置く。`;
    }
    case VERBS.SWAP_POSITION:
      // ユーザー指摘: 生成文に「相手はこのカードの到達効果を得ない。」が欠けていた。
      // 入れ替えの結果、相手はこのカード（マスチェンジ）がまだ置かれたままの
      // マス（=このカードの使用者が元いたマス）へ移動することになるが、そこで
      // 到達判定を発生させると、相手がまた同じマスチェンジに到達→また入れ替え…と
      // 無限ループしてしまう。それを防ぐため到達判定を連鎖させない
      // （card-effect-engine.jsのVERBS.SWAP_POSITIONがctx.arrivedAtをセットしない）
      // という実装は元々あったが、その挙動を説明する一文がテキスト側に無かった。
      return `${count}マス以内の相手のいる場所とあなたのいる場所を入れ替える。相手はこれの到達効果を得ない。`;
    case VERBS.LOCK_PAIR:
      return "その２枚を任意の１箇所にロックする。";
    case VERBS.DRAW_IF_FEWEST_LOCKED:
      return "１番少なくロックしているなら１枚ドロー。";
    case VERBS.SWAP_RANDOM_HAND_CARD:
      return "相手１人の手札から無作為に１枚、あなたの手札に加える。あなたの手札から１枚、その相手の手札に加える。";
    case VERBS.DRAW_ALL_FEWEST_LOCKED:
      return "１番少なくロックしている全員は、１枚ドロー。";
    case VERBS.DISCARD_ALL_FACEUP_ON_BOARD:
      return "場の全ての表向きのカードを捨てる。";
    case VERBS.DISCARD_SELF:
      // 以前はなないろの巨光が「このカードを捨てる。」、色落ちキャットが「これを捨てる。」と
      // 実際の文言が違っていた（docs/cards.mdの表記ゆれ）ため action.selfLabel で選べるように
      // していたが、2026-11-01（続き647）に両方「これを」へ揃えたので既定だけで足りる。
      // 引数は残してあるが、いま渡しているカードは無い。
      return `${action.selfLabel ?? "これ"}を捨てる。`;
    case VERBS.ALL_PLAYERS_DISCARD_HAND_AND_DRAW:
      return `全員、手札を全て捨て、${count}枚ドロー。`;
    case VERBS.DISCARD_HALF_HAND:
      return "あなたの手札を半分捨てる。";
    case VERBS.FORCED_MOVE_TO_OWN_GATE:
      // 0th拡張（厳重警戒）: noArrival ＝「移動先のカードはオープンしない」。
      return action.noArrival ? "あなたのゲートに強制移動する。移動先のカードはオープンしない。" : "あなたのゲートに強制移動する。";
    case VERBS.DISCARD_ONE_LOCKED_CARD:
      return "あなたのロックしている１枚を捨てる。";
    case VERBS.DECLARE_COLORS:
      // ザ・ギャンブル（「以上」＝下限のみ指定、count自体はプレイヤーが選ぶ）と
      // 試練の儀式（固定数）とで実際の文言の語順が違う（docs/cards.md）ため、
      // action.minCount/countのどちらが指定されているかで文型を分ける。
      return action.minCount != null
        ? `${toFullWidthNumber(action.minCount)}色以上、色を宣言する。`
        : `色を${toFullWidthNumber(action.count)}色宣言する。`;
    case VERBS.PUBLIC_DRAW_MATCHING_DECLARED_COLOR_COUNT:
      return "その色の種類の数分ドローし公開する。";
    case VERBS.DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED:
      return "それらの中に宣言色があるなら、あなたの手札を全て捨てる。";
    case VERBS.RITUAL_PLACE_MOVE_REPEAT:
      return "あなたの隣に山札から１枚表向きで置く。そのマスに移動し、移動先の到達効果は得ない。置いたカードが宣言色ならこの効果を繰り返す。";
    case VERBS.ALL_PLAYERS_PLACE_ONE_CARD_IN_EMPTY_CELL:
      return "全員は何もない１マスに山札または手札から１枚裏向きで置く。";
    case VERBS.ALL_PLAYERS_DISCARD_TO_THREE:
      return "全員は手札が３枚になるように捨てる。";
    case VERBS.ALL_PLAYERS_CHOOSE_PARTY_OPTION:
      return "全員は以下の効果のうち１つ得る。・１マス移動し、移動先の到達効果は得ない。・場の任意の１枚をあなたの手札に加える。・場の任意の２枚をオープンする。";
    case VERBS.END_CURRENT_PHASE:
      return "このフェイズを終了する。";
    case VERBS.PLACE_SELF_ADJACENT_TO_CHOSEN_OPPONENT:
      return "これを相手の隣に裏向きで置く。";
    case VERBS.PLACE_DECK_CARD_ON_ALL_FACEUP_CELLS:
      return "場の全ての表向きのカードの上に山札から１枚ずつ裏向きで置く。";
    case VERBS.DISCARD_OWN_HAND:
      return "あなたの手札をすべて捨てる。";
    case VERBS.DISCARD_ANY_OWN_LOCKED_DRAW_PER:
      return `あなたのロックしているカードを任意の枚数捨てる。捨てたカード１枚に付き${toFullWidthNumber(action.drawPer)}枚ドロー。`;
    case VERBS.DISCARD_ONE_HAND_CARD:
      return "あなたは手札を１枚捨てる。";
    case VERBS.DRAW_IF_HAND_AT_MOST:
      return `あなたの手札が${toFullWidthNumber(action.maxHandSize)}枚以下なら${count}枚ドロー。`;
    case VERBS.INHERIT_ARRIVAL_ACTIONS:
      return "上記の到達効果を得る。";
    default:
      return `（未対応の動詞: ${action.verb}）`;
  }
}

function renderCost(cost) {
  if (!cost) return "";
  if (cost.verb === VERBS.DISCARD_SAME_COLOR) return `【追色${toFullWidthNumber(cost.count)}】`;
  return "";
}

function renderUsageLimit(usageLimit) {
  if (!usageLimit) return "";
  const perLabel = usageLimit.per === "turn" ? "１ターン" : usageLimit.per;
  return `この効果は${perLabel}に${toFullWidthNumber(usageLimit.count)}度のみ得られる。`;
}

// effectDef: CARD_EFFECTS[cardId].arrival または .handEffect のどちらか一方。
export function generateEffectText(effectDef) {
  if (!effectDef) return "";
  const context = { selections: {} };
  const parts = [];
  // docs/cards.mdの凡例通り、既定動作（到達効果処理後にこのカード自身を手札に加える）を
  // 上書きしている場合だけ、その旨を明示する一文を先頭に足す（ジャンプ台等）。ただし
  // DISCARD_SELFやPLACE_CARD(source:"self")のように、アクション自体が既にこのカードの
  // 行方を明示している場合は、docs/cards.md側にも「これは手札に加えない」の一文が
  // 存在しない（なないろの巨光・色落ちキャット・黒の契約の烙印で確認済み）ため、
  // 冗長な一文を足さない。
  const actionsHandleSelf = effectDef.actions?.some(
    (a) =>
      a.verb === VERBS.DISCARD_SELF ||
      (a.verb === VERBS.PLACE_CARD && a.source === "self") ||
      // 0th拡張（ゲートチャージ）: この動詞も「ゲートへ置く／捨てる」とこのカードの行方を
      // 自分で書いているので、「これはあなたの手札に加えない。」の一文は足さない
      // （印字にもその一文は無い）。
      a.verb === VERBS.GATE_CHARGE_PLACE_OR_RETURN ||
      // 0th拡張（ヤエザ）: これは相手の手札へ行く＝行方を自分で書いている。
      a.verb === VERBS.GIVE_SELF_TO_CHOSEN_OPPONENT_WITH_OPTIONS ||
      // 0th拡張（平和への願い）: 条件を満たせば裏向きで残り、満たさなければ手札に加える＝
      //   どちらになるかを効果文が自分で書いている。
      a.verb === VERBS.REGISTER_PEACE_WISH
  );
  // ⚠ 0th拡張の我忘れの白き龍は「これに到達しても、これをあなたの手札に加えない。」が
  //   **補足（カード下部の説明）**に書かれていて、効果文の本文には出てこない。
  //   hideNoHandNote でその1文を出さないようにする（印字と合わせるため）。
  if (effectDef.addsCardToHandAfter === false && !actionsHandleSelf && !effectDef.hideNoHandNote)
    parts.push("これはあなたの手札に加えない。");
  // ユーザー要望「マスチェンジのように『上記の到達効果を得る』で生成文を整理
  // できないか。到達効果の文面を手札効果が踏襲している場合この文言を使用する
  // ように」。手品師の技の「この効果はいつでも使える。」も同じく、今まで
  // generateEffectTextが素通りしていたフラグだったため、あわせて文章化する。
  // ⚠ 文言はカードごとに違う（手品師の技は「この効果はいつでも使える。」、0th拡張の
  //   リトルマウスは「いつでも使える。」）。既定はそのままで、違うカードだけ上書きする。
  if (effectDef.usableAnytime) parts.push(effectDef.usableAnytimeLabel ?? "この効果はいつでも使える。");
  // 0th拡張（不思議な果実）: 「〜の時に使える。」という使用条件そのものを文にする。
  // 🔴 判定は isHandEffectOptionUsable 側の requiresAdjacentCardsAtLeast が持っている。
  //   文だけ書いて判定を足し忘れる（またはその逆）と食い違うので、**同じフラグから両方**出す。
  // 0th拡張（リーチキャンセル）: 割り込みの窓そのものが使用条件。
  if (effectDef.requiresArrivalEffectWindow) parts.push("無色以外のカードの到達効果の処理の直前に使える。");
  if (Number.isFinite(effectDef.requiresAdjacentCardsAtLeast))
    parts.push(`あなたの隣の${toFullWidthNumber(effectDef.requiresAdjacentCardsAtLeast)}マス以上にカードが置かれている時に使える。`);
  const costText = renderCost(effectDef.cost);
  if (costText) parts.push(costText);
  // inheritsArrival: true（マスチェンジ・手品師の技の手札効果等）は、実際の
  // アクション配列（エンジン実行用にactionsは引き続き持つ）をテキスト化せず、
  // 代わりに「上記の到達効果を得る。」という参照文だけを出す
  // （docs/cards.mdの凡例通り、到達効果と全く同じ処理を手札効果からも呼べる
  // カードに共通の言い回し）。
  if (effectDef.inheritsArrival) {
    parts.push("上記の到達効果を得る。");
  } else {
    for (const action of effectDef.actions) {
      parts.push(renderAction(action, context));
    }
  }
  const limitText = renderUsageLimit(effectDef.usageLimit);
  if (limitText) parts.push(limitText);
  return parts.join("");
}

// handEffectOptions（複数選択肢を持つ手札効果、なないろの欠片等）専用。各選択肢を
// 「以下の効果のうち１つ得る。」の書式でまとめてテキスト化する（card-dev-mode.jsの
// 生成/実際テキスト比較用）。
//
// ユーザー指摘「生成文の『その』が文脈的に何を指すかわからない」への対応。
// requiresPairInHand（このカードを含めて同名2枚が手札に揃っている時だけ選べる、
// なないろの欠片の「２枚をロックする」選択肢用の特殊条件）は、選択肢が「使えるか
// どうか」の判定（card-effect-engine.jsのisHandEffectOptionUsable）にしか使われて
// おらず、generateEffectText側にはこの条件を文章化する仕組みが無かった。そのため
// 生成文はいきなり「その２枚を〜」から始まってしまい、「その」の指す相手（＝この
// カードを含めた同名2枚）がdocs/cards.mdの実際の文章と違って説明されないまま
// 欠けていた。requiresPairInHandを持つ選択肢には、cardNameを使って
// 「これを含めた「カード名」が２枚、あなたの手札にある時に使える。」という一文を
// 先頭に補うようにした（docs/cards.mdの実際の文言と同じ形）。
export function generateHandEffectOptionsText(options, cardName) {
  if (!options?.length) return "";
  const lines = options.map((opt) => {
    const prefix = opt.requiresPairInHand && cardName ? `これを含めた「${cardName}」が２枚、あなたの手札にある時に使える。` : "";
    return `・${prefix}${generateEffectText(opt)}`;
  });
  return `以下の効果のうち１つ得る。${lines.join("")}`;
}

// --- 動作確認用（このファイル単体で実行し、docs/cards.mdの実際の文章と目視比較する） ---
// 例: `node src/card-effects.js` で実行できる。ゲーム本体からは呼ばれない、
// スキーマ検証だけが目的の使い捨てチェック。
if (typeof process !== "undefined" && process.argv[1] && process.argv[1].endsWith("card-effects.js")) {
  console.log("生成テキスト vs docs/cards.mdの実際の文章（比較用）:\n");
  console.log("[ゴメンナサイッ！到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["purple-sorry"].arrival));
  console.log("  実際: １マス移動する。\n");

  console.log("[手品師の技 -スリカエ- 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["yellow-sleight-of-hand"].arrival));
  console.log("  実際: 相手１人の手札から無作為に１枚、あなたの手札に加える。あなたの手札から１枚、その相手の手札に加える。\n");

  console.log("[プレゼント 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["pink-present"].arrival));
  console.log("  実際: １番少なくロックしている全員は、１枚ドロー。\n");

  console.log("[白の意思の覚醒 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["white-awakening"].arrival));
  console.log("  実際: 場の全ての表向きのカードを捨てる。\n");

  console.log("[増殖する樹々 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["green-growing-trees"].arrival));
  console.log("  実際: ２マス以内の何もない全てのマスに山札からカードを１枚ずつ裏向きで置く。\n");

  console.log("[奇跡の森 マンズウッド 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["eternal-green"].handEffect));
  console.log("  実際: 【追色１】１枚ドロー。\n");

  console.log("[ジャンプ台 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["red-jump-pad"].arrival));
  console.log("  実際: これはあなたの手札に加えない。２マス先に一気に移動する。\n");

  console.log("[ジャンプ台 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["red-jump-pad"].handEffect));
  console.log("  実際: これをゲート以外の任意のマスに表向きで置く。\n");

  console.log("[カウンターロック 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["red-counter-lock"].arrival));
  console.log("  実際: １番少なくロックしているなら１枚ドロー。\n");

  console.log("[収穫と種まき 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["orange-harvest-sow"].arrival));
  console.log("  実際: 任意の１マスの１枚をあなたの手札に加える。手札から１枚をそのマスに裏向きで置く。\n");

  console.log("[黄金の宮殿 ドムス・ネロ 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["eternal-yellow"].handEffect));
  console.log("  実際: 【追色１】２枚ドロー。相手全員は１枚ドロー。この効果は１ターンに１度のみ得られる。\n");

  console.log("[なないろの欠片 手札効果]");
  console.log("  生成: " + generateHandEffectOptionsText(CARD_EFFECTS["rainbow-shard"].handEffectOptions, "なないろの欠片"));
  console.log(
    "  実際: 以下の効果のうち１つ得る。・１枚ドロー。・これを含めた「なないろの欠片」が２枚、あなたの手札にある時に使える。その２枚を任意の１箇所にロックする。２枚ドロー。\n"
  );

  console.log("[マスチェンジ 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["orange-mass-change"].arrival));
  console.log("  実際: ３マス以内の相手のいる場所とあなたのいる場所を入れ替える。相手はこれの到達効果を得ない。\n");

  console.log("[マスチェンジ 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["orange-mass-change"].handEffect));
  console.log("  実際: 【追色１】上記の到達効果を得る。\n");

  console.log("[手品師の技 -スリカエ- 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["yellow-sleight-of-hand"].handEffect));
  console.log("  実際: この効果はいつでも使える。上記の到達効果を得る。\n");

  console.log("[なないろの巨光 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["white-radiance"].arrival));
  console.log("  実際: 全員、３枚ドロー。これを捨てる。\n");

  console.log("[色落ちキャット 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["black-faded-cat"].arrival));
  console.log("  実際: これを捨てる。全員、手札を全て捨て、１枚ドロー。\n");

  console.log("[選べる罠 到達効果]");
  console.log(
    "  生成: " + generateHandEffectOptionsText(CARD_EFFECTS["blue-choosable-trap"].arrivalOptions)
  );
  console.log(
    "  実際: 以下の効果のうち１つ得る。・あなたの手札を半分捨てる。・あなたのゲートに強制移動する。・あなたのロックしている１枚を捨てる。\n"
  );

  console.log("[ザ・ギャンブル 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["yellow-gamble"].arrival));
  console.log(
    "  実際: ２色以上、色を宣言する。その色の種類の数分ドローし公開する。それらの中に宣言色があるなら、あなたの手札を全て捨てる。\n"
  );

  console.log("[試練の儀式 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["purple-trial-ritual"].arrival));
  console.log(
    "  実際: 色を３色宣言する。あなたの隣に山札から１枚表向きで置く。そのマスに移動し、移動先の到達効果は得ない。置いたカードが宣言色ならこの効果を繰り返す。\n"
  );

  console.log("[試練の儀式 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["purple-trial-ritual"].handEffect));
  console.log("  実際: 上記の到達効果を得る。\n");

  console.log("[黒の契約の烙印 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["black-contract-brand"].arrival));
  console.log("  実際: あなたの空いているロックエリアに、これを表向きで置く。\n");

  console.log("[黒の契約の烙印 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["black-contract-brand"].handEffect));
  console.log("  実際: これを任意のマスに裏向きで置く。\n");

  console.log("[合同建設 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["green-joint-construction"].arrival));
  console.log("  実際: 全員は何もない１マスに山札または手札から１枚裏向きで置く。\n");

  console.log("[合同建設 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["green-joint-construction"].handEffect));
  console.log("  実際: 上記の到達効果を得る。\n");

  console.log("[スラム上がりの役人 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["blue-slum-official"].arrival));
  console.log("  実際: 全員は手札が３枚になるように捨てる。\n");

  console.log("[パーティー 到達効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["pink-party"].arrival));
  console.log(
    "  実際: 全員は以下の効果のうち１つ得る。・１マス移動し、移動先の到達効果は得ない。・場の任意の１枚をあなたの手札に加える。・場の任意の２枚をオープンする。\n"
  );

  console.log("[パーティー 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["pink-party"].handEffect));
  console.log("  実際: これを任意のマスに裏向きで置く。\n");

  console.log("[増殖する樹々 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["green-growing-trees"].handEffect));
  console.log("  実際: 任意の３マスに山札からカードを裏向きで１枚ずつ置く。\n");

  console.log("[選べる罠 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["blue-choosable-trap"].handEffect));
  console.log("  実際: これを任意のマスに裏向きで置く。\n");

  console.log("[色落ちキャット 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["black-faded-cat"].handEffect));
  console.log("  実際: あなたの手札をすべて捨てる。１枚ドロー。\n");

  console.log("[白の意思の覚醒 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["white-awakening"].handEffect));
  console.log("  実際: 場の全ての表向きのカードの上に山札から１枚ずつ裏向きで置く。\n");

  console.log("[プレゼント 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["pink-present"].handEffect));
  console.log("  実際: これを相手の隣に裏向きで置く。１枚ドロー。\n");

  console.log("[なないろの巨光 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["white-radiance"].handEffect));
  console.log("  実際: 全員、３枚ドロー。このフェイズを終了する。\n");

  console.log("[スラム上がりの役人 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["blue-slum-official"].handEffect));
  console.log("  実際: あなたの手札が１枚以下なら２枚ドロー。このフェイズを終了する。\n");

  console.log("[ザ・ギャンブル 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["yellow-gamble"].handEffect));
  console.log("  実際: あなたは手札を１枚捨てる。上記の到達効果を得る。このフェイズを終了する。\n");

  console.log("[赤のキューブ フェニックス 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-red"].handEffect));
  console.log("  実際: 【追色１】捨て場の１番上から２番目のカードをあなたの手札に加える。\n");

  console.log("[黄のキューブ サフラン 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-yellow"].handEffect));
  console.log("  実際: 【追色１】２マス以内のカードを４枚までオープンしてもよい。\n");

  console.log("[青のキューブ セレスティア 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-blue"].handEffect));
  console.log("  実際: 【追色１】手札が２枚以上ある相手全員の手札から、無作為に１枚ずつ選び、それらを捨てる。\n");

  console.log("[紅蓮の火山 ワイナウエア 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["eternal-red"].handEffect));
  console.log("  実際: 【追色１】任意の１マスのカードをすべて捨てる。\n");

  console.log("[緑のキューブ ヴァーディアン 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-green"].handEffect));
  console.log("  実際: 【追色１】２枚ドローして、それらをすべて公開する。ターン終了時、それらを捨てる。この効果は１ターンに１度のみ得られる。\n");

  console.log("[結ばれの一本桜 コノハナサクヤ 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["eternal-pink"].handEffect));
  console.log("  実際: 【追色１】相手をあなたの周囲へ移動する。このターンあなたは接触できない。\n");

  console.log("[禁断の果実 マルメゴ 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["eternal-orange"].handEffect));
  console.log(
    "  実際: 【追色１】４枚ドロー。それらを公開する。それらの手札効果はこのターン使うことができない。その中に橙のカードがあったなら、あなたの手札をすべて捨て、あなたはこのターン移動できない。\n"
  );

  console.log("[紫のキューブ ディメンション 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-purple"].handEffect));
  console.log("  実際: 【追色１】このターンの通常の移動は２マス先に一気に移動する。\n");

  console.log("[桃のキューブ セレナーデ 手札効果]");
  console.log("  生成: " + generateEffectText(CARD_EFFECTS["first-pink"].handEffect));
  console.log("  実際: 【追色１】あなたの手札を１枚ロックする、ただし最後のロックはできない。この効果は１ターンに１度のみ得られる。\n");
}

// 選択肢の表示ラベル。labelKey（ui-text.jsのキー）を持つものは現在の言語で解決し、
// 旧来の label（文字列）を持つものはそのまま返す。表示のたびに呼ぶこと
// （定数に翻訳結果を埋めると言語切替に追随しないため。UI英語化フェーズ11）。
export function optionLabel(option) {
  if (!option) return "";
  return option.labelKey ? t(option.labelKey) : (option.label ?? option.id ?? "");
}
