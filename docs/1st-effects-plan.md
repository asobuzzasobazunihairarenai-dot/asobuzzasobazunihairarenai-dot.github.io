# 1st EDITION のカード効果：作業表

> **2026-11-06（続き668）で 33/33 そろいました。** 通常カード19種・Eカード7種・Fカード7種。
> この表は「どう作ったか」と「残っている限界」を後から追うためのもの。

## 【財力】の土台（2026-11-05・続き666 で入れた）

財力＝そのプレイヤーの**手札の枚数**（公開ドロー中のカードも含む＝このアプリの既存の「手札」の定義）。
🔴 リメイクの【追色】とは違い**何も捨てない**。「条件」である。

| 書き方 | 意味 |
|---|---|
| `wealth: { eq: 3 }` | 【財力＝３】ちょうど3 |
| `wealth: { max: 2 }` | 【財力≦２】2以下 |
| `wealth: { min: 3 }` | 【財力≧３】3以上 |
| `wealth: { variable: true }` | 【財力＝S】S はあなたの財力そのもの（条件ではない） |
| `count: "wealth"` / `maxCount: "wealth"` / `total: "wealth"` | 枚数・マス数を S にする（文では "S" と出る） |
| `qualifyWealth: { max: 2 }` | 🔴 **効果全体の条件ではなく「どのプレイヤーが対象か」**（貧民の行進）。`wealth` にすると文の頭に【財力≦２】が重なって出る |

- **修正値**: 1st の Eカードを持っていると「あなたはいつでも、自分の財力を１多く計算してもよい」
  （**手札でもロックエリアでも「持っている」**）。⇒ 財力は **base 〜 base+bonusMax の幅**。
  条件は**本人に有利に読む**（幅の中に満たす値があればよい）。考え方の全文は
  [src/wealth.js](../src/wealth.js) の冒頭。
- 🔴 **罰の効果でも「本人は宣言しないはず」と決め打ちしない**（ユーザー指摘「あえて罰を
  受けたいときも出てきます」）。宣言で結果が変わる時だけ `wealthNeedsDeclaration()` で本人に聞く。

## 🔴 【状況】カードの仕組み（続き668 で新設）

5種（治安悪化7・フェスティバル7・建設バブル7・経済成長7・デプレッション2＝**30枚**）の共通の形。

| | |
|---|---|
| 到達 | 「このカードを場の中央に表向きで置く。」＝`PLACE_SELF_AT_BOARD_CENTER`（`addsCardToHandAfter: false`） |
| 常時 | `CARD_EFFECTS[id].situation` に書く。**場の中央の１番上の表向きの札**だけが効く（`getActiveSituationCardId`） |
| いつ | **全員のターン開始時**。main.js の `resolveSituationAtTurnStart`（平和への願いと同じ subscribe） |
| 手札 | 「上記の到達時の効果を得る。」＝`inheritsArrival` |

- ⚠ **「効くのは１番上の表向き1枚だけ」はルールの読み**（新しい状況札を中央へ置けば前の札は下に隠れて
  読めなくなる＝１番上の原則と同じ考え方）。変えるなら `getActiveSituationCardId` 1つを直せばよい。
  **ユーザー判断待ち。**
- 🔴 到達の「中央に置く」は**到達を起こさない**（第6引数 true）。中央に誰かの駒が立っていると、
  表向きになった瞬間にその人の到達が走って**同じ札の「中央に置く」がまた動く**ため。
- ⚠ 記録はクライアントのローカルではなく**盤面そのもの**（中央に札が在るかどうか）なので、
  読み込み直しても消えない＝平和への願い（続き653）とは違う。

## 完成（33/33）

| カード | 枚 | 到達 | 手札 | 使った仕組み |
|---|---|---|---|---|
| 貧民の行進 | 7 | ✅ | ✅ | `QUALIFYING_PLAYERS_DRAW_AND_MOVE` / `ANNOUNCE_MOVEMENT_BOOST_THIS_TURN{noOpen}` |
| 治安悪化 | 7 | ✅ | ✅ | 【状況】＋2択 |
| 財閥の威光 | 7 | ✅ | ✅ | `GIVE_HAND_CARDS_TO_CHOSEN_PLAYER{pick:"lowest_wealth"}` |
| フェスティバル | 7 | ✅ | ✅ | 【状況】＋`PICKUP_TO_HAND{optional, excludeOpponentSurrounding}` |
| 貴族の特権 | 7 | ✅ | ✅ | `LOCK_ONE_HAND_CARD_EXCEPT_FINAL{optional, lockArea}` / `MOVE_CHOSEN_PLAYER_ONE_CELL` |
| ロックチェンジ | 7 | ✅ | ✅ | `PICKUP_OWN_LOCKED_TO_HAND` ＋ `stopIfPreviousFailed` |
| 大盤振舞 | 7 | ✅ | ✅ | `PLACE_DECK_CARDS_ON_ADJACENT{source:"hand", total:2}` |
| 建設バブル | 7 | ✅ | ✅ | 【状況】＋`PLACE_DECK_CARDS_IN_CHOSEN_CELLS{allowHand}` |
| 苦渋の強盗 | 7 | ✅ | ✅ | `PICKUP_FROM_OPPONENT_GATE` / `STEAL_LOCKED_FROM_MOST_LOCKED` |
| 貧しき心 | 7 | ✅ | ✅ | （続き666） |
| 食べ過ぎ | 7 | ✅ | ✅ | `STACK_ADJACENT_CARDS_ON_OWN_CELL` |
| 経済成長 | 7 | ✅ | ✅ | 【状況】＋`DRAW{optional}` |
| 路地裏のスラム街 | 7 | ✅ | ✅ | 2択＋`DISCARD_OWN_HAND_DOWN_TO{random}` ＋ `FLIP_SELF_FACE_DOWN` ＋ `keepsCardOnBoard` |
| 裏貴族の賄賂 | 7 | ✅ | ✅ | `STEAL_RANDOM_AND_GIVE_SELF` / `BRIBE_ON_LOCK_DECLARE`（ロック宣言の窓） |
| 飛空艇アルヴァ | 1 | ✅ | ✅ | `DISCARD_OWN_HAND_DOWN_TO{count,random}` ＋ `FORCED_MOVE{atOnce, optional}` |
| 大富豪の気紛れ | 1 | ✅ | ✅ | `GIVE_SELF_TO_EXTREME_WEALTH` / `ALL_OPPONENTS_DISCARD_LOCKED_AND_DRAW` |
| ドゥエンの革命 | 1 | ✅ | ✅ | `EQUALIZE_HAND_SIZES` |
| デプレッション | 2 | ✅ | ✅ | 【状況】＋`DISCARD_OWN_HAND_DOWN_TO{count:1}` |
| 偉大なる大号令 | 2 | ✅ | ✅ | `PLACE_DECK_CARDS_AROUND_CENTER` / `ALL_PLAYERS_MOVE_TO_CENTER_ADJACENT` / `ALL_PLAYERS_DISCARD_TO_FEWEST` |
| （E赤）基本走術 | — | — | ✅ | `ANNOUNCE_MOVEMENT_BOOST_THIS_TURN{plain}` |
| （E橙）愚直な欲求 | — | — | ✅ | `PICKUP_ALL_AT_CHOSEN_CELL_TO_HAND` |
| （E黄）富豪の教え | — | — | ✅ | `WEALTH_BONUS_FOR_ALL_UNTIL_NEXT_TURN` ＋ `usageLimit` |
| （E緑）財を自然に | — | — | ✅ | （続き666） |
| （E青）過去の誘い | — | — | ✅ | （続き666） |
| （E桃）恋の押付け | — | — | ✅ | `GIVE_HAND_CARDS_TO_CHOSEN_PLAYER{count:"any"}` |
| （E紫）カオスチェンジ | — | — | ✅ | `SWAP_ENTIRE_HAND_WITH_CHOSEN` |

## ⚠ 限界・ユーザー判断待ち

- 🔴 **【状況】カードの「効くのは１番上の表向き1枚だけ」はルールの読み**（上記）。
- ⚠ **「持っている」の読み**（Eカードの＋1が、手札でもロックエリアでも効く）は続き666 からの持ち越し。
- ⚠ **【財力＝S】の S は base**（任意の＋1 を入れない）。入れると「宣言するかどうか」で
  起きることの量が変わり、毎回聞く必要が出る。変えるなら `wealthCountFor` の1行。
- ⚠ **貴族の特権の手札効果**は印字が「このカードを捨て、以下の効果のうち１つ得る。」だが、
  生成文には「このカードを捨て、」が出ない（`handEffectOptions` の文の仕組みの限界。
  なないろの欠片等も同じ）。**動きは正しい**（既定で発動時に自分を捨てる）。
- ⚠ **生成文と印字は一致しない**（1st の印字は「このカードを捨てる。」のような旧い言い回しで、
  生成側は続き647 で「これ」に揃えてある）。画面に出るのは**印字の方**なので遊びには影響しないが、
  **カード開発モードの照合は 1st では当てにならない**。
- ⚠ **実機での通し確認はしていない**（ヘッドレスのユニットテスト181件とCPU自己対戦まで）。
- ⚠ **貧民の行進の「通常の移動では移動先のカードはオープンしない」は、実際のムーブフェイズでは
  確かめていない**（配線とユニットテストまで）。
- **Fカード7種はファーストの山に入る**（続き669。カードセットが 1st なら◯のジュエル7種、
  「まぜる」なら色ごとにリメイク／1st のどちらか1枚を抽選）。絵はジュエル版。
  ⚠ **オンラインで効かせるには Edge Function の再デプロイが要る。**
