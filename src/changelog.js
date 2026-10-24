// ホーム画面の「お知らせ／更新情報」（ユーザー要望「ホーム画面にバージョンアップ情報を追加し、
// デプロイの度にその概要を日時を添えて記載していきたい」）。
//
// ★運用メモ: デプロイするたびに、この CHANGELOG の先頭に { date, items } を1件追記する
//   （新しい順＝先頭が最新）。日付は YYYY-MM-DD。itemsはその回の変更の概要（箇条書き）。
//   ★2026-08-29から: 新しく追記する回は itemsEn（英語版・itemsと同じ順番・同じ件数）も
//     一緒に書く（ユーザー判断で過去分の英訳はしない＝itemsEnが無い回は日本語のまま出る）。
//
// ★2026-09-08（続き484）から: 項目を2階層に分ける（ユーザー要望「debug関係の詳細は管理者のみ
//   見れるようにして、一般の方にはもっと大きな変更を伝えたい。アプリが問題だらけであると
//   ネガティブキャンペーンしている感じになっちゃうので」）。
//     items / itemsEn       … 全員に見せる。**プレイヤーにとって意味のある変化**だけを書く
//                             （新しくできること・遊び方や見え方が変わること・端末での快適さ・
//                              連絡事項。「対戦が途中で止まることがあったのを直しました」の
//                              ように、起きていた現象がプレイヤーの言葉で書けるもの）。
//     devItems / devItemsEn … 管理者だけに見せる（isAdminUser）。**開発の内輪話**をここへ置く
//                             （特定カードの内部処理・CPUの思考の細部・診断ログ・テストの話。
//                              「CPUが収穫と種まきで自分自身を拾って置き直す空振りをしていた」等）。
//   どちらも ja/en は同じ順番・同じ件数で書くこと。**事実を消すためのものではない**——
//   詳しさの階層を分けるだけで、管理者の画面には今までどおり全部出る。
//
// ★2026-09-28（続き535）から: **不具合の直しは items ではなく fixes / fixesEn に書く**
//   （ユーザー要望「『不具合を修正しました』だけにして、隣の『詳細』を押した人が見る形にしたい。
//    その詳細も一般に見せるものはめちゃ簡単な内容に」）。
//     items / itemsEn   … **良いニュース**だけ。新しくできるようになったこと・見え方や遊び方の
//                         変化。畳まずそのまま並べる（ここを畳むと見てほしいものまで隠れる）。
//     fixes / fixesEn   … **不具合の直し**。画面では「不具合を修正しました」の1行に畳まれ、
//                         「詳細」を押した時だけ開く。**1件1行の、めちゃ簡単な言い方で書く**
//                         （items より短く。原因・仕組みの話は devItems の方へ）。
//     devItems / …      … 管理者だけ。上の「詳細」の中に続けて出る。
//   **件数は出さない**（「不具合を修正しました（3件）」のようにしない。数が見えると結局
//   「たくさんある」印象になるため＝ユーザー判断）。
//   過去分（2026-09-27 より前）の振り分けはしない＝古い回は今までどおり items に不具合の直しが
//   混ざったまま出る（itemsEn を足した時と同じ方針。ユーザー判断 2026-09-28）。
//   items も fixes も空（devItems だけ）の回は、一般の画面ではその日付ごと出さない。
//
// ★2026-09-29（続き544）から: **良いニュースも「短い1行＋詳細」に畳む**（ユーザー要望
//   「もっと要約して『詳細はこちら』スタイルにしませんか？」）。
//     summary / summaryEn … 1件1行の**短い見出し**。items / itemsEn と**同じ順番・同じ件数**。
//                           画面にはこれだけが並び、「詳細」を押すと items の本文が各見出しの
//                           下に開く（1つのボタンでその回の全項目をまとめて開閉）。
//   **items の本文は書き換えず、上に見出しを足す**こと（要約で書き直すと本文の意味がズレる。
//   過去の回に後から付けられるのもこの形のおかげ）。件数が合っていない回は、対応を取り違える
//   より安全なので従来どおり本文をそのまま並べる（黙って旧表示に落ちるので、書いたら
//   scratchpad の照合スクリプトで件数を確かめること）。
//   過去分は**直近だけ**付ける（ユーザー判断 2026-09-29。9/28・9/26・9/23・9/21 に付けた）。

import { createBackdrop } from "./ui-helpers.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ13
import { getLang } from "./i18n.js";

export const CHANGELOG = [
  {
    date: "2026-10-24",
    summary: [
      "ヘルプの用語集に、言葉を12個足しました",
    ],
    summaryEn: [
      "Added twelve terms to the glossary in Help",
    ],
    items: [
      "ヘルプの用語集に**12個の言葉**を足しました——**ロックフェイズ／ハンドフェイズ／ムーブフェイズ**（これまで、説明文の中では使っているのに**言葉そのものの説明がありませんでした**）、**割り込み**、**単数の原則**（数の指定がなければ対象は1つ）、**領域**、**不発**、**虹**、**ループの禁止**、**到達コンボ**、**一気に移動**、**他のカードの効果の対象にならない**。公式サイトの総合ルールと言い方をそろえてあります。",
    ],
    itemsEn: [
      "Added twelve entries to the glossary in Help: Lock Phase, Hand Phase and Move Phase (used throughout the other entries but never defined), Interrupt, the singular principle (no number given means one target), Zone, Fizzle, Rainbow, No pointless loops, Arrival combo, Move at once, and Cannot be targeted by other cards. The wording matches the comprehensive rules on the official site.",
    ],
    devItems: [
      "**きっかけ**: ユーザー提案「一度アプリの中とHP、説明書のルールを整合したほうがいいかな？」。足す前に**4つの資料の用語の集合を機械的に突き合わせた**（`scratchpad/glossary-diff.mjs`）: 総合ルール245条・索引46語／HPの基本用語集55語（**全版共通**なので1st専用の財力S・志炎・色者を含む）／アプリのヘルプ46語／説明書8pt版36語。**統合すると57語**。",
      "**分かったこと: アプリのヘルプは「2026年初期の説明書（25ページ版）の写し」で止まっていた。** アプリの46語は25p版の45語＋「いつでも使える」とほぼ一致し、その後に整理した語（割り込み・単数の原則・領域・不発・虹・ループの禁止・到達コンボ）が**1つも入っていない**。さらに**ハンドフェイズ等のフェイズ3種が立項されていない**——`help-content.ja.js` の中で9回使われているのに言葉の説明が無い状態だった（HPには3つとも在る）。",
      "**説明書は触らない**と決めた（紙面の制限）。25p版45語→8pt版36語は**意図的な削減**で、12語を落として3語に集約している（相手・自分・プレイヤー・プレイヤー全員→「全員」、手札の半分→「半分」など）。巻き戻すと26ページに収まらない。",
      "**1st専用の語は入れていない**。HPの「固有効果」にある財力S・志炎・色者・状況は1st EDITIONのカードの仕組みで、REMAKEには無い（`docs/cards.md` に【状況】のカードが無いことを確認した。grepの「収録状況」に引っかかるので文字列一致では判断できない）。",
      "**定義はすべて総合ルールの条文から取った**（111/112/115/203.2/300/502.1/502.4/503.1/504.1/505.1/605/609.3/610.2/611/704.3）。私が作文した定義は無い。日英とも**同じ順・同じ件数**で挿入し、**46→58語**。挿入は五十音／アルファベット順を保つため「このtermのブロックの直前」に入れる形（`scratchpad/add-glossary.mjs`）。**`help-content.*.js` は LF**（src の多くは CRLF なので、道具側で改行コードを確認してから書いた＝続き550の教訓）。",
      "**検証**: 実際にヘッドレスでヘルプを開き、**12語とも一覧に在る**ことと、「割り込み」を開いて本文が出ること（スマホ相当932x430で題15.3px・本文13px・モーダル398x168で画面内）を確認。例外0件。`npm test` 63/63 PASS、`check-undeclared` 0件（168ファイル）。",
      "**残り（未着手）**: ①HPに無くてアプリ・説明書・総合ルールに在る語が3つある（句点の原則・無作為・公開する）＋総合ルールで新設した語もHPには無い ②表記ゆれ（ロックする／ロック、一気に移動／一気に移動する、無色のカード／無色のカード（白黒）、1番上の原則／「1番上」の原則）③説明書は次の改訂時に「単数の原則」を1〜2行だけ入れる価値があるか（カードの読み方そのものに関わるため）。",
    ],
    devItemsEn: [
      "Prompted by the owner asking whether the app, the site and the manual should be reconciled. Before adding anything, the four glossaries were diffed mechanically: comprehensive rules (46 indexed terms), the site glossary (55, shared across all editions and so including first-edition-only mechanics), the app's Help (46) and the printed manual (36). The union is 57.",
      "The finding: the app's Help was still a copy of the early 2026 manual. Its 46 terms match that manual's 45 plus one, so nothing settled since then had reached it, and the three phases were never defined even though other entries use the word nine times. The site defines all three.",
      "The printed manual was deliberately left alone. Its reduction from 45 terms to 36 was a conscious choice to fit the page count, collapsing twelve terms into three; undoing that would not fit in 26 pages.",
      "First-edition-only mechanics were excluded. The site lists them because its glossary spans editions, but they do not exist in this one, confirmed by checking the card data rather than by string match.",
      "Every definition was taken from a numbered rule rather than written fresh. The twelve entries were inserted in both languages in matching order, 46 to 58, keeping alphabetical position. The help content files use LF while most sources use CRLF, so the tool checked the line endings first.",
      "Verified by opening Help in a headless browser at phone size: all twelve appear in the index, and one was opened to confirm the body renders at a readable size within the screen. No exceptions; tests and the undeclared-name check pass.",
      "Still open: three terms exist everywhere except the site, several terms are spelled differently between sources, and the printed manual may warrant one line on the singular principle at its next revision.",
    ],
  },
  {
    date: "2026-10-24",
    summary: [
      "ターンが変わる時、右上の拡大カードがふわっと消えるようにしました",
      "はじめて遊ぶ時の音量を小さくしました",
      "観戦中に「視点の人の手札だけ」を表示できるようになりました",
    ],
    summaryEn: [
      "The enlarged card in the corner now fades away when the turn changes",
      "The game now starts quieter the first time you play",
      "While spectating you can now show only the viewed player's hand",
    ],
    items: [
      "ターンが変わると、画面右上に出ている拡大カード（到達したカード・使ったカード）はぱっと消えていました。出てきた時と同じようにふわっと引っ込むようにしたので、何が起きていたのかを目で追いやすくなります。",
      "「音が大きすぎる」というお声をいただいたので、はじめて遊ぶ時の音量を小さくしました（BGM・効果音ともに15%）。すでに音量を調整された方の設定はそのままです。音量は⚙オプションの「基本設定」からいつでも変えられます。あわせて、その区画の「戻す」を押した時に、はじめの音量より大きくなってしまっていたのも直しました。",
      "観戦の「すべて」モードで、手札の見せ方を切り替えられるようにしました。観戦バナーの👁のボタンを押すと、表向きにするのを「いま視点にしている人の手札だけ」に絞れます（もう一度押すと全員ぶんに戻ります）。4人の手札が一度に開いていると追いきれない、という時に、誰か1人の目線で試合を追えます。視点を切り替えれば、その人の手札が表向きになります。この設定はお使いの端末に覚えておきます。",
    ],
    itemsEn: [
      "The enlarged card shown in the top corner — the card you arrived on, or the one you just used — used to vanish the instant the turn changed. It now fades out the same way it faded in, so it is easier to follow what happened.",
      "After hearing that the game was too loud, the starting volume is now lower for a first play (15% for both music and sound effects). If you have already set your own volume, that is kept. You can change it any time from Settings under the gear menu, and the Reset button in that section no longer turns the volume up above the starting level.",
      "While spectating in the mode that reveals hands, a new eye button on the spectator bar narrows the face-up hands to just the player you are currently viewing; press it again for everyone. Switching your viewpoint moves which hand is shown. The choice is remembered on your device.",
    ],
    fixes: [
      "スマホでマイデッキを選ぶ画面が小さく出てしまい、デッキの名前や枚数が読めなかったのを直しました。",
      "駒のジャンプなどの動きが終わる前にカメラが引いてしまい、駒がおかしな位置で動いて見えることがあったのを直しました。",
      "カメラが駒に寄る移動（ワープなど）で、駒が先に移動先へ出てから出発点に戻って跳びはじめることがあったのを直しました。",
      "ゲート侵攻の演出が、画面を触った拍子に途中で消えてしまうことがあったのを直しました。",
      "カードにカーソルを合わせても拡大が出なくなっていたのを直しました（オンラインの対局中・観戦中）。",
      "観戦しているだけなのに、色を選ぶ画面が出て選べてしまうことがあったのを直しました。",
    ],
    fixesEn: [
      "Fixed the deck selection screen appearing too small on phones, which made deck names and card counts unreadable.",
      "Fixed the camera pulling back before a piece finished moving, which made the piece appear to land in the wrong place.",
      "Fixed a move the camera zooms in on showing the piece already at its destination before it snapped back and jumped.",
      "Fixed the gate invasion sequence vanishing part-way if you tapped the screen as it appeared.",
      "Fixed the card zoom not appearing when you hover a card, during online play and while spectating.",
      "Fixed a colour-choice dialog appearing, and being usable, for someone who was only spectating.",
    ],
    devItems: [
      "**#413「マイデッキ選択がスマホで横に出きらない」——測ったら `vw`/`vh` の罠だった（続き575 の★が実害になった）。** `#mds-panel` が `width: min(56rem, 94vw)` / `max-height: 88vh` で、🔴 **このオーバーレイは body（＝1600x900 のステージ）の中に居るのに、`vw`/`vh` はビューポートを指す**ので、描かれる大きさにステージ倍率（0.478／0.356）が二重に掛かっていた。**実測（直す前）**: iPhone 932x430 でパネルは **419px＝画面の45%**、932x320 では **311px＝33%** で **84pxはみ出して巻く**。文字は 題9.6px・説明6.5px・デッキ名6.3px・枚数5.5px・ボタン7px（320 では 7.1/4.8/4.7/4.1/5.2px）。**60秒でどのデッキで戦うかを決める画面**なので読めないと選べない。直しは `src/style.css` だけ: ①`94vw`→`94%`・`88vh`→`50rem`（`#my-deck-select` は fixed だが **transform を持つ body が containing block になる**のでステージ基準になる）②スマホ・タブレットだけ広げて字を上げる（**PCの値は一字も変えていない**）③`@media (max-height: 380px)` では**説明の1行を省いてから**字を上げる（残り時間とデッキ一覧は消さない）。🔴 **副産物**: 1920x1080（倍率1.2）では `88vh` が 950 と評価されて**ステージの高さ900を超えて**いた（パネルが外へ出られた）のも直った。小さな窓のPCでは逆に高く使えるようになる（1280x500 で 49%→89%）。**実測（直した後）**: 430＝幅77%・11px未満0種、320＝幅57%（ステージ自体が932のうち569pxしかないのでほぼ上限）・巻かない・11px未満0種、**PC＝56%・128x127・題16px で完全に不変**。デッキ4つ（枠の上限）でも全部1行・はみ出し0。⚠ **私の測り方が間違っていて一度PCが壊れたように見えた**——プローブが3つの端末像すべてを iPhone の UA で開いていたため「PC」の行にも `is-phone-device` が付いていた。**端末ごとの規則を足した時は、プローブが本当にその端末像で開いているかを body の判定クラスで確かめる。** `vw`/`vh` の罠はまだ他に残っている（続き575 の★）。スマホで「小さい」「出きらない」と来たら、まずその画面のCSSで `vw`/`vh` を grep するのが早い。",
      "**#411「ターン切り替え時、右の拡大カードをフェードアウトで片付けたい」——仕組みは元から在った。** `.card-arrival-modal` / `.hand-effect-use-modal` は自分で消える時の `dismiss()` を持っていて、それが「`show` を外して 300ms 後に DOM から取り除く」形（CSS も `transition: opacity .3s, transform .3s`）。**ターン切り替えの経路だけが `remove()` で即座に消していた**ので、その2つの hide 関数に `{ fade: true }` を足して turnPlayer 変化の subscribe からそちらで呼ぶようにした（新しい演出は1行も書いていない）。🔴 **対局を畳んでホームへ戻る時（`dismissAllInGameTransientUi`）は fade を渡さない**——あちらは #144「ホーム画面に被さって残る」ための後始末なので、待つとむしろ被って見える。**同じ関数でも呼ぶ場面によって正しい振る舞いが違う。** あわせて、この2つは右上の同じ場所に出るので、300ms の間に次の到達が来ると重なる。`fadingModals` に控えて次を出す時に片付け、フェードへ渡す前に `currentModal = null` にしてある。**A/B**（本物の経路＝`hydrateState` で turnPlayer を動かして subscribe に拾わせた）: 直す前＝ターンが変わった直後にもう消えている／直した後＝0ms・120ms は残ってフェード中、**520ms で消える**。消えかけに次を出しても数は1。畳む時は即座に消えるまま。⚠ **一度「フェードインを壊したか」と疑った**が、測り直したら**両方とも 400ms で opacity 1.00・scale 1** で同一。違ったのは 200ms の1点だけ（0.92 対 0.00）＝**ヘッドレスはコマを毎秒1回しか出さないので transition の途中の値は揺れる**。**1点の差で結論を出さない。**",
      "**ユーザー報告（同じ日の第2報）「駒のアクションが完全に終わる前にカメラが戻るので駒が変な位置でアクションしてしまってます」。** 🔴 **根っこは「飛翔ゴーストがカメラの外に居る」こと**——ゴースト（`.piece-hop-ghost` ほか）は `position: fixed` で **body（＝ステージ）**の上に置かれ、**カメラ変形は `#game-table` にしか掛かっていない**（body に掛かるのはステージの倍率と中央寄せだけ）。出発点・着地点は**ゴーストを作る瞬間に1回だけ**測るので、**飛んでいる間にカメラが動くと盤面だけがずれて、ゴーストは古い座標のまま着地する**。食い込む経路はいくつもある: 効果による移動は **#370 以来、移動が始まる前に 1200ms の戻りを予約している**（到達効果の途中で選択を聞くと答えるまで寄りっぱなしになるため＝あれは正しい）が、**ジャンプは 675ms** かかり、**オンラインは送信の往復**、**コノハナサクヤは霧散待ち（最大1800ms）**が前に挟まる。連鎖の途中で寄らない手があれば前の予約がそのまま残る。🔴 **だから予約の時間を調整するのでは足りず、発火する瞬間に『いま演出中か』を見る**ようにした（`scheduleCameraHome` の中で `isBoardAnimationPlaying()` なら 150ms 後に見に来る）。これは `withBoardAnimation` で包まれた演出すべて（駒の飛翔・接触のタックル・ゲート侵攻の奪取・エターナル獲得）で立つので**1か所で全部守れる**うえ、main.js は #261 で**すでに import 済み**だった。止まる心配も無い——anim-gate.js は取り残されたフラグを 15秒で自力で下ろす。**A/B**（演出をわざと `--piece-move-duration: 3s` に伸ばして、予約が確実に飛翔中に来る状況を作った）: 直す前＝飛翔 835〜6079ms に対し**2940ms で zoom 1.28→1 に戻り切っていた**／直した後＝飛翔の間ずっと 1.28 で、**終わってから 8075ms に zoom 1**。⚠ 実機の通し確認はしていない（ヘッドレスは演出も遅いので時間の絶対値は参考外）。確かめたのは「飛んでいる間に寄りが解けないこと」と「終われば戻ること」の2点。",
      "**ユーザー報告「初プレイの人は音が大きすぎるといわれる方がいました」→ 選択肢A/B/Cを出して「Aで両方15%」。** 初期音量は `sound.js` の `masterVolume` / `masterBgmVolume` で BGM・効果音ともに 30%（2026-07-30 に 50%→30%）→ **0.15 へ**。🔴 **既定値を下げるのがいちばん効く理由が、調べていて分かった**: **初回のサウンド設定モーダルは試遊の入口からは出さない**作り（`main.js` の `if (!isTrialEntry()) maybeShowFirstRunBgmModal()`＝遊び始めるまでの手順を減らすため）なので、**初めて遊ぶ人こそ、音量を調整する画面を一度も見ずに既定値で始まる**。案内モーダルにつまみを足す案Bは見送り（ユーザー判断）。🔴 **ついでに食い違いを1つ直した**: オプションの「🔊」区画の**「戻す」が 効果音0.8 / BGM0.5 に戻す**作りで、**既定より大きくなっていた**（既定が 0.5 だった頃の名残り）。15%にすると**押すと5倍以上大きくなる**ので、**既定値を `DEFAULT_SOUND_VOLUME` / `DEFAULT_BGM_VOLUME` として sound.js に1か所だけ置き、両方からそれを読む**形にした。⚠ `sound_volume` は 0〜1 だが **`sound_volume_bgm` は 0〜100**（`online.js` の読み込みが `/ 100`）なので同じ値をそのまま入れない。**A/B**: 直す前＝既定 30%/30%・「戻す」で **80%/50%**／直した後＝既定 **15%/15%**・「戻す」でも **15%/15%**。⚠ 保存済みの設定がある人はそちらが優先なので、変わるのは**新しい端末・未設定の人**だけ。**測り方のミス（記録）**: 最初「🔊区画の戻すボタンが見つからない」と出たが、**`openOptionsMenu` という export は無く（あるのは `initOptionsMenu`）パネルが開いていなかった**だけ。`#options-menu-button` を押す形に直して測れた（続き605・607 と同じ失敗を同じ日に3回）。",
      "**ユーザー報告「ジャンプなどのアクション時にカメラが駒に寄るけど、その際の最初に駒が普通に一瞬移動したのち、移動前のマスにシュって戻ってジャンプの演出します。多分この現象はジャンプに限りません」——通信のラグでもスペックでもなかった。** 駒の移動は ①state を動かす → ②`render()` → ③演出が駒を隠して出発点からゴーストを飛ばす の順で、③は②の直後の**同じ処理の中**なので本来②の絵は出ない。**②と③の間で画面が1回でも描かれると、駒が先に移動先へ現れてから出発点へ戻る**。🔴 **隙は2か所**: ①**ディメンションのワープは、カメラが寄る 380ms を `render()` の『後ろ』で待っていた**（＝寄っている間ずっと移動先に駒が居る絵が見える。A/Bで3回とも漏れた・116〜1398ms）→ **寄りを `render()` の前へ移した**（寄り先は移動先のマスなので、描き直す前でも同じ位置に在る＝測れる）②**オンラインは `moveToken` の往復中に自分の操作のこだま（`state_changed`）が戻ってきて、`fetchAndHydrate` が同期的に hydrate→`subscribe(render)` まで走る**——`online.js` の同じハンドラに「取り直しは同期的に描き直しまで走るので、後から隠しても必ず一度は描かれてしまう」と2026-09-07 の時点で書いてある → **移動を確定させている間だけ汎用の描き直しを据え置く**（`suppressGenericRenderForDrawFlight`＝「ドロー演出の前にもう手札に札が加わっていた」件と同じやり方。入れ子になり得るので数で持ち、必ず `finally` で戻す）。⚠ **据え置きは汎用の描き直し1か所だけ**——隣の `handleRemoteMoveHydrate`（他人の移動の演出）とターン告知には足していない（止める方が実害が大きい）。**測り方で行き詰まった記録**: rAF も `setTimeout(4ms)` も**ヘッドレスでは5秒に3回しか走らない**ので 380ms の窓が測れず、`MutationObserver` ＋ **位置は『どのマスの中に居るか』（`closest('.cell')`）** に替えてやっと測れた。🔴 **画面座標で判定してはいけなかった——カメラが寄ると移動先のマス自体が画面上で動く。カメラを動かす機能を測る時は、座標ではなく親子関係で見る。** 一度「直った後も53ms漏れている」と出たが、計器を足して測り直したら `render()` 直後と駒を隠した直後の差は **34〜108ms＝1つの同期処理の中**＝漏れていなかった（ヘッドレスの揺れ）。⚠ **本物のオンライン部屋での通し確認はできていない**（手元から席に入れない）。こだまの方は `hydrateState` を直接呼んで模した試験で、据え置きが効くことまでを確かめた。",
      "**ユーザー報告「観戦中にプレイヤーの色選択モーダルが出て選べる状態でした。前もあった気がするけど」——当たり。同じ系統の3か所目だった。** `getSelfSeat()` は**観戦中「見ている席」を返す**（online.js のコメント「観戦中は座席を持たないが、盤面をどのプレイヤー視点で描くか…**操作は全てブロックされる**」）。ところが `getAutoDriveSeat()` がそれをそのまま返しており、`shouldAutoProcess = player === getAutoDriveSeat() && …` が**見ている席の到達で true** になる＝**観戦者の画面が、その人の効果を自分の仕事だと思って走らせ**、色宣言のモーダルまで出していた。🔴 しかも宣言は `broadcastColorsDeclared` で全員へ流れるので、**観戦者が対局に口を出せる**状態だった。⚠ **2026-09-21 に接触の承認と最後のロックの承認で同じ守り（`!isSpectatingGame()`）を足しているのに、効果を走らせる側には足していなかった**——ユーザーの「前もあった気がする」はそのこと。直しは `getAutoDriveSeat()` の先頭で観戦中は null を返し、時間切れの自動代行（`performPriorityTimeoutAutoAction`）にも同じ守りを足した。⚠ **手元で再現・確認ができていない（正直な限界）**: 到達の処理は盤面の操作から呼ばれる作りで、state を直接動かしても走らない。**3回測り方を変えたが到達を起こせなかった**（途中『再現した』と見えたのは探し方が雑で別の文字に反応していただけ＝続き605 と同じ失敗）。根拠は**コードの読み**と**同じ守りが既に2か所にある**ことで、**実機での確認をお願いしてある**。",
      "**ユーザー要望「観戦モードの時はその視点プレイヤーの手札が見えるように選べるといいかも！」→ A/B を出して A を採用。** A＝**画面側だけ**（「すべて」モードは元から全員の手札が届いているので、**表向きにするのを視点の人だけに絞る**。情報の出方は1ミリも変わらない）。B＝「公開情報のみ」の部屋で1人分だけ届ける。🔴 **B を採らなかった理由は2つ**: ①手札の中身は**サーバーが送る段階で伏せられている**（`so7_game_tokens_visible`）ので、そもそも届いていない＝サーバーの改修が要る ②観戦者は**視点を自由に切り替えられる**ので、「視点の人だけ見える」＋「切り替え自由」＝**結局全員の手札が見える**（視点の固定か部屋の許可制とセットでないと成立しない）。実装は3行＋バナーのボタン——`isSelf` は `buildPlayerZone(side, seat, self === seat)` 由来で、**観戦中の self は『見ている席』**なので、そのまま「視点の人か」として使える。ボタンは**「すべて」モードの時だけ**出す（「公開情報のみ」では元から全部裏向きで、出しても何も変わらず紛らわしい）。設定は端末に覚える。**実測（4人・観戦allを模して）**: OFF＝他の3人 表2/裏0・視点の人 表2／**ON＝他の3人 裏4/表0・視点の人は表4のまま**、ボタンの文字も入れ替わる。例外0件。",
      "**#425「観戦中にカードの拡大が表示されなくなった」（YGM）——観戦だけの話ではなかった。** 報告に入っていた画面の記録（続き572）に、**id も class も中身も無い `z-index:999` の div が盤面全体（24,0,1232,693）を覆って**写っていた。その形の膜を作るのは2か所だけで、管理者パネルの方は id が付いている＝**セットアップウィザードの膜**。読むと `createBackdrop(close, { dim:false, zIndex:999 })` の直後に **`display:none` を付け忘れていた**（管理者パネルの方は付けてある）。**パネル自身は display:none なのに、膜だけ起動直後からずっと表示**——手元で実測して確認した。🔴 **何が起きるか**: 拡大プレビュー（ホバー）は **`#game-table` の pointermove** で拾っているが、膜は #game-table の子ではないので**マウスの動きが盤面に届かない**。タップ・ドラッグは document の capture で拾うので効き続ける＝**拡大だけが死ぬ**。🔴 **そして膜を隠すのは `closePanel()` だけで、それはセットアップの手順を最後まで実行した時しか呼ばれない**——CPU戦はその手順を通るので隠れるが、**オンラインの対局者・観戦者はずっと覆われたまま**だった。直しは作成直後に `display:none`（＋次に画面の記録を見る時に悩まないよう `id` を付けた）。**A/B**: 起動直後の膜が **block → none**／ウィザードを開くと block・背景を押すと none＝**開閉は壊していない**。⚠ **オンラインでホバーが実際に戻ることの通し確認はできていない**（手元からオンラインの席に入れないため）。要素の状態と、ホバーの受け口の読み合わせまで。",
      "**#428「ゲート侵攻の演出がスキップされました」（YGM）。** 報告のログで**6段積んだのに2段しか出ていない**ことが確定。列を途中で空にできるのは `skipAll`（スキップ／✕／**背景を押す**）か例外だけで、例外の記録（`diag-gate-invasion-modal-error`）は無く、直後に `diag-notice-wait {blocker:\"none\"}` が出ている＝**止まったのではなく空にされた**。🔴 背景は**画面全体を覆う**うえ、この演出は**相手の操作で突然現れる**ので、**盤面を触ろうとしていた指がそのまま背景に当たって6段まとめて消える**。背景を押せるようにしたのは #380 で、それ以前は何も起きなかった（＝比較的新しい事故）。直しは「**出てから500msの間だけ背景を無視する**」。✕とスキップは狙って押す小さな的なので今までどおり即座に効く。**A/B**: 背景が出た**80ms後**に押すと、直す前は**1段で全部消えた**／直した後は**3段続いた**（無視の記録が1件）。**900ms後**に押すと前後とも1段で終了＝狙って飛ばす操作は変えていない。あわせて `diag-gate-invasion-skipped {via}`（背景／✕／スキップのどれで飛ばしたか）を残した——**次に同じ報告が来た時、押されたのか別の原因なのかが1行で分かる**。⚠ **測り方で2回しくじった（記録）**: 最初は「少し待ってから背景を探して押す」形にしたため、**別の要素を押していて何も起きなかった**（守りが効いているのかどうかすら分からなかった）。`MutationObserver` で**背景が body に足されたその瞬間を捕まえて押す**形にして、はじめて A/B が噛み合った。**「効かない」と見えたら、まず操作が届いているかを確かめる**（続き558・562・582 と同じ）。",
    ],
    devItemsEn: [
      "The deck selection panel sized itself with viewport units while living inside the scaled stage element, so the stage scale was applied on top of a viewport measurement and the panel came out at 45% of the screen on a phone, 33% with the browser bars showing, where it also scrolled. Every label fell between 4 and 10 real pixels on a screen whose whole purpose is choosing a deck within a minute. The sizes are now stage-relative, with separate phone and tablet rules and a short-screen case that drops one line of explanatory text before enlarging the rest; desktop values are untouched. The same change also removes an error in the other direction on large displays, where the old height cap exceeded the stage itself.",
      "Both corner modals already had a fade-out used by their own auto-dismiss — drop the show class, remove from the DOM 300ms later — and only the turn-change path removed the element outright. The two hide functions now take a fade flag, which the turn-change subscriber passes; the teardown path that runs when leaving a game deliberately does not, because there the point is to stop the overlay covering the home screen. Leftovers mid-fade are tracked and cleared when the next modal appears, since both use the same corner.",
      "The flight ghost used for piece movement is position-fixed on the stage element, while the camera transform applies only to the board, so the ghost sits outside the camera and its endpoints are measured once when it is created. Any camera movement during the flight therefore slides the board out from under it. Effect-driven moves have scheduled the camera return before the move since an earlier fix, which is correct for the case it was written for, but a jump takes longer than that delay once a network round trip or a preceding effect wait is added. Rather than tune the delay, the scheduled return now checks whether a board animation is in progress when it fires and waits if so, which covers every animation wrapped by the shared gate.",
      "Starting volume for music and sound effects dropped from 30% to 15% after a report that first-time players found it loud. What makes the default the right lever is that the first-run sound dialog is deliberately skipped for the trial entry, so a first-time player never sees a volume control at all. The Reset button in the volume section of Settings also restored 80%/50%, louder than the default it was supposed to restore, so both the initial value and the reset now read one pair of exported constants; note the two saved fields use different scales (0-1 and 0-100). Players who already set a volume keep theirs.",
      "A piece briefly appeared at its destination and then snapped back before the jump animation played. The move applies state, renders, and only then does the animation hide the piece and fly a ghost from the origin; any paint between the render and the hide shows the piece already arrived. Two gaps existed: the warp camera zoom was awaited after the render, and online the echo of your own action re-hydrates and renders synchronously during the round trip. The zoom now happens before the render, and the generic render listener is held off while a move is being committed, using the same mechanism already applied to the draw animation.",
      "getSelfSeat returns the viewed seat while spectating, and the function that decides which seat this client drives returned it unchanged, so a spectator's client ran the viewed player's arrival effects and opened the colour dialog — and the declaration is broadcast to everyone. The same guard had been added to two sibling approval paths a month earlier but not to the effect driver. Could not be reproduced locally because arrivals are triggered from board interaction rather than from state changes.",
      "The spectator hand option was built client-side only: in the mode that already delivers every hand, the face-up rendering is narrowed to the viewed seat. Delivering a single hand in the public-only mode was rejected because hands are masked server-side and because free viewpoint switching would turn it into full visibility anyway.",
      "The setup wizard's backdrop was appended without being hidden, so a transparent full-screen layer sat over the board from launch. Hover zoom listens on the board element, which the layer is not inside, so the zoom never fired, while taps kept working because those are captured on the document. The only thing that hid the layer was finishing the wizard, which online players and spectators never do.",
      "Six steps were queued but only two were shown, and the only paths that empty the queue are the skip button, the close cross and the backdrop, none of which had logged an exception. The backdrop covers the whole screen and the sequence appears without warning on an opponent's turn, so a tap meant for the board wipes the rest; backdrop taps are now ignored for the first half second, and the control that caused a skip is recorded.",
    ],
  },
  {
    date: "2026-10-20",
    summary: [
      "不具合を報告してくださった方に、直ったことをアプリの中でお知らせするようにしました",
    ],
    summaryEn: [
      "If you report a problem, the game now tells you when it is fixed",
    ],
    items: [
      "不具合を報告してくださった方へ、その件が直った時に、ホーム画面で「ご報告ありがとうございました」とお伝えするようにしました。ご自分が書いてくださった文と、何が直ったかを並べて出します。一度見たら二度と出ませんし、別の端末で開いても重ねて出ることはありません。いつもありがとうございます。なお、ログインせずに送っていただいた報告は、どなたの報告か分からないためお伝えできません。",
    ],
    itemsEn: [
      "When something you reported gets fixed, the home screen now says thank you and tells you what changed, next to the words you wrote. It appears once and will not come back, on any of your devices. Reports sent without logging in cannot be answered this way, because there is no way to tell whose they are.",
    ],
    fixes: [
      "公開ドローで出したカードをそのターン中に使った時、ターン終了時にその1枚が置いた先から消えてしまうことがあったのを直しました（盤面に伏せて置いた罠が消え、その下にあったカードが代わりに発動していました）。",
    ],
    fixesEn: [
      "Fixed a card drawn face-up and then played in the same turn being taken back off the board and discarded at the end of that turn, which left the card underneath to trigger instead.",
    ],
    devItems: [
      "**【同じ日に作り替え】ユーザー提案「ここであなたが直してコミットした時にあなたが入力して送るようにしたら？ その文面はコミット前に私が確認する」。** その方がよいので、**お礼の文をコードに置ける**形にした（`handled-bug-reports.js` の `BUG_REPORT_FIX_NOTES`）。理由: ①**文面がコミットに入るので、公開前に必ずユーザーの目を通る**（「聞き忘れ」が構造上起きない）②**Claude は管理者としてログインできない＝DBには書けない**（このファイルの冒頭に元から書いてある制約）③**日本語と英語の両方を書ける**（DBの列は1つなので1言語だけになる）④どの修正でどう伝えたかが git の履歴に残る。🔴 **これに伴い SQL 側の絞りを緩めた**——`fixed_note is not null` で絞ったままだと**コードに書いた文が永久に届かない**。サーバーは「本人のもの・まだ見ていない」だけで返し、**何を見せるか（見せないか）はクライアントが決める**: DBの文 → 無ければコードの文 → **どちらにも無ければ出さない**。「すべて対処済みにする」で嘘の通知が飛ばない保証は、この最後の1行が担っている。🔴 **既読にするのは実際に見せた分だけ**——見せていない報告まで既読にすると、**あとから文を書いても二度と届かない**。**実測**: 3件（コードの文あり／DBの文あり／どちらも無し）を渡すと**2件だけ表示**され、**既読に送られたのもその2件だけ**。画面でも、1件目はコードの文・2件目はDBの文が出ていることを確認した。⚠ **SQLの再実行が必要**（同じファイルを貼り直すだけ。`so7_get_my_fixed_bug_reports` は戻り値の列が増えたので drop → 作り直しにしてある）。",
      "**ユーザー要望「debug報告者に、内容が解決した際にそのことをアプリ内でお礼とともに通知してあげたい」。** `so7_bug_reports` には **SELECT ポリシーが一切無い**（生ログは管理者しか読めない設計）ので、**報告した本人が自分の報告を読む口すら無かった**。本人の行だけを返す SECURITY DEFINER 関数（`so7_get_my_fixed_bug_reports`）を足し、返すのは **id・日時・本人が書いた文・直った内容** だけにした（ログや画面の状態は本人のものでも返さない）。🔴 **設計で一番考えたところ: 「対処済み」になっただけでは通知しない。** 管理画面には「すべて対処済みにする」という一括ボタンがあり（溜まった一覧を畳むためのもの）、対処済み＝通知にすると**そのボタン1回で全員に「直りました」という嘘が一斉に飛ぶ**。そこで**管理者が「直った内容」を一言書いた時だけ**通知する形にした——事故を仕組みで防げるうえ、中身のある通知になる。「見た」の記録は **DB に持つ**（端末の localStorage ではなく。別の端末で二重に出ないため。iOS はホーム画面アプリと Safari で保管場所が別、という続き596 の件もあるので端から選ばない）。出す場所は**ホーム画面を開いた時・1セッション1回**（対局中は手が止まる／起動直後は案内モーダルと重なる＝続き574）。**閉じた時に初めて「見た」を送る**——開いた瞬間に送ると、読む前に閉じた人の分が永久に消える。**実測**（データ部分だけ差し替えて本物の描画を動かした）: PC 435x361・スマホ 419x362 でどちらも画面内・はみ出し0、スマホの文字は 題17.6px／説明13.4px／直った内容13px／閉じる13px（高さ33px）。閉じると覆いも消え、見た記録が送られる。例外0件。⚠ **`supabase_setup_so7.sql` に追記したので手動実行が必要**（実行するまではお礼が出ないだけで、他は何も壊れない＝関数が無い時は黙って空を返す作りにしてある）。⚠ **ログインせずに送られた報告（user_id が null）には届かない**——誰あてか分からないため。管理画面では「📨 届きません」と出して押せないようにした。",
      "**#421「罠をおいたのに、そのしたにあったプレゼントの効果が発動されてて、エイドスの処理が速すぎてよくわからなかったです。ばぐなのか、エイドスの効果なのか。」——不具合だった。** 報告のログで経路が全部追えた: `19:54` に A が「選べる罠」の手札効果で `card-320` をマス(2,3)へ**伏せて置き**（直前の `diag-exposed-arrival` の location が `publicDraw` ＝**公開ドロー置き場から出した札**だった）、`19:54:xx` のターン終了時に **`SEND_TOKEN_TO_PILE card-320 → discard`**。その後 `19:55` にエイドスの駒が(2,3)へ来ると、`FLIP_TOKEN card-300` → **`arrival: pink-present`** → さらに下の `red-jump-pad` と続いた。**罠が盤面から消えていたので、下のカードが一番上になって発動していた。** 🔴 原因は `flushPendingTurnEndDiscards`（緑のキューブ ヴァーディアンの「ターン終了時、それらを捨てる」の実装）。`それら` は**まだ公開ドロー置き場に残っているもの**のはずなのに、**「そのトークンがまだ存在するか」しか見ていなかった**ため、**使って置いた先から引き剥がして捨てていた**。直しは、残す対象を「その人の `publicDraw` か `hand` に在るもの」に限定し（手札はターン終了時に公開ドローが合流する先なので未使用と同じ扱い）、外したものは `diag-turn-end-discard-skipped` に残す。**A/B**（一時の出口を付けて実測・確認後に除去＝`grep` 0件）: 直す前は**盤面に伏せた罠・公開ドローの札・手札の札の3つとも消えた**／直した後は**盤面の罠だけが残り**、公開ドローと手札の札はこれまでどおり捨てられる。",
    ],
    devItemsEn: [
      "Reworked the same day so the fix note can live in the code next to the list of handled report numbers, which puts the wording inside the commit for review and allows both languages; the server filter had to be loosened accordingly, because filtering on the database note would have made code-side notes undeliverable. The client now decides what to show — database note, else code note, else nothing — and only marks as seen the ones it actually showed.",
      "Reporters had no way to read their own reports, since the table deliberately has no select policy, so a definer function returns just their own id, date, words and the fix note. Notifying on the resolved flag alone would have been a trap, because the admin screen has a bulk resolve button for tidying the list, so the trigger is the admin writing a one-line note instead. The seen mark lives in the database rather than on the device, and is only written when the reader closes the dialog.",
      "The end-of-turn discard that implements the green First card's drawback only checked that the token still existed, not where it was, so a card drawn face-up and then played onto the board was pulled back off it and discarded. It now only takes cards still sitting in that player's face-up draw area or hand, and logs the ones it skips.",
    ],
  },
  {
    date: "2026-10-19",
    summary: [
      "エイドスの黒いカードが、英語でも英語で読めるようになりました",
    ],
    summaryEn: [
      "The Eidos black card now reads in English too",
    ],
    items: [
      "エイドス専用の「黒のキューブ　ノワール」は、絵そのものに日本語が刷り込まれていたため、言語を英語にしてもこのカードだけ日本語のままでした。絵から文字を取り除き、ほかのカードと同じ仕組みで文章を載せるようにしたので、英語でもちゃんと英語で読めます。",
    ],
    itemsEn: [
      "The Eidos-only Black Cube: Noir had its Japanese text printed into the artwork, so it stayed Japanese even when the language was set to English. The text has been taken out of the picture and is now drawn the same way as on every other card, so it reads in English.",
    ],
    fixes: [
      "エイドスの黒いカードで、文章が二重に重なって見えていたのを直しました。",
      "同じカードの真ん中の紋様が、紫のカードのものになっていたので、黒のものに直しました。",
      "自分の手札が、途中から本来より上（盤面に重なる位置）にずれたまま戻らなくなることがあったのを直しました。",
    ],
    fixesEn: [
      "Fixed the text on the Eidos black card appearing twice, overlapping itself.",
      "The emblem in the middle of that card was the purple card's; it is now the black one.",
      "Fixed your hand sometimes drifting upward, over the board, and staying there for the rest of the game.",
    ],
    devItems: [
      "**ユーザー報告「手札が添付の位置に途中からなってしまうことがあります。多分カメラワークの時な気がする」。** 実測で原因が確定した。手札には、画面からはみ出しそうな時だけ内側へ寄せる仕組み（`nudgeHandsIntoStage`。#361/#370）があり、その値は `.hand-area` の `style.translate` に入る。🔴 **ところが「手札を画面下に固定する」が ON の間、自分の手札は `#game-table` の外（`#self-hand-overlay`）へ移される**（`syncFixedHandOverlay`）のに、**寄せの計算も取り消しも `table.querySelectorAll` ＝ 盤面の中しか見ていなかった**。つまり**ONにした時点で付いていた値がそのまま凍りつき、以後どれだけ画面が変わっても戻らない**。しかも `.hand-area` は作り直されずに使い回される要素なので、永久に残る。**A/B（実測）**: 直す前は、固定ONのまま手で寄せを消して描き直しても**付き直らず**、固定OFFにすると**古い値 `-14.09px` を持ち込み**、盤面拡大1→2→切と画面が激変しても（手札の上端 698→1209→-13844→698）**値は `-14.0917px` のまま1ミリも動かなかった**。直した後は、固定ONの間は**常に外れ**、盤面の中にある間だけ毎回ちゃんと計算し直す。直しは2か所——①取り消しの対象にオーバーレイの中も含める ②オーバーレイへ移す時にその場で外す（画面に固定された手札に、ステージの枠を基準にした寄せは意味を持たないため）。⚠ **ユーザーの推測「カメラワークの時」は、凍る『きっかけ』としてはあり得るが確定はしていない**——凍った値の大きさは「最後に盤面の中で計算された瞬間」の画面しだいで、カメラ・窓の高さ・手札の枚数のどれでも大きくなり得る。**凍ること自体を無くしたので、きっかけが何であれ残らない。**",
      "**#418「赤枠で囲ってる文章が２重に見えます」の原因は、画像の取り違えだった。** カード面は「文字の入っていない下地（`assets/cards-blank/`）の上に、アプリが文章を重ねて描く」仕組み（そうしないと英語に切り替えられない）。🔴 **34種を突き合わせたところ、`first-noir` だけ下地が刷り上がり（`assets/cards/`）とバイト単位で同一**だった——2026-08-25 に下地一式を入れた時、このカードだけ文字無し版が無く、実物をそのまま置いていた（ノワールは 8/15 追加のエイドス専用で、他より後から入った）。だから**文字が刷られた絵の上に同じ文章をもう一度描いて**いた。**ユーザーに文字無しの元データが無かったので、こちらで消した**: 白い文字だけを拾い（その帯の上下の明るさを基準に、+38 より明るい画素）、3回膨張させてから**拡散で埋める**（900回）。消したのは4か所（上の帯／タイトル／《抽出》／下の帯＋◆■の印）で、**BRACK・中央の光・枠線・フッターは残した**。⚠ 文字のあった帯は**わずかにのっぺりする**（完全な復元ではない）。",
      "**紋様も間違っていた（ユーザー指摘「真ん中の紋様も紫の紋様になってます」）。** 7色の紋様を並べて確かめると**色ごとに形が違い**、ノワールのものは**紫と同一**だった。🔴 **正しい黒の紋様は `assets/pieces/noir.webp`（駒）にあった**——駒と札は色ごとに同じ紋様を使う（紫の駒＝紫の札で確認）。駒から取り出す時、素朴に「中央付近の白い画素」で拾うと**白い丸ごと**拾ってしまう（紋様は「白い丸の上の黒い正方形の中の白」）ので、**黒い正方形を塗りつぶし探索で特定してから、その中の白**を取り出した。札側は、古い紋様を**半径ごとの下位25%の色**で塗り直して（中央値だと紋様自体を拾って白く飛ぶ）光のにじみを残したまま消し、新しい紋様を白＋発光で描いた。⚠ **BRACK と《抽出》の帯は、この塗り直しの対象から外す**——半径に入るので、外さないと文字が消える（実際に一度 A が消えた）。差し替えたのは下地・札の絵・イラスト版の3つで、**「下地と札の絵が同一」のカードは0件になった**。",
    ],
    devItemsEn: [
      "The hand carries an inline nudge that pulls it back inside the stage when it would fall off, but while the fixed-hand option is on the hand lives outside the board element, and both the nudge and its removal only ever scanned inside the board. The value therefore froze at whatever it was when the option took effect and never updated again, on an element that is reused rather than rebuilt. The overlay is now included when clearing, and the nudge is dropped as the hand moves into it.",
      "The blank used to draw card text was, for this one card out of thirty-four, a byte-identical copy of the printed artwork, so the text was drawn on top of itself. No textless original existed, so the lettering was removed by masking the bright strokes and filling them by diffusion, keeping the latin word, the central glow, the frame and the footer.",
      "Each colour has its own emblem, and this card was wearing the purple one. The correct black emblem was found on the noir piece artwork, extracted by flood-filling the dark square it sits on, and redrawn over a radially rebuilt glow; the bands holding the latin word and the subtitle are excluded from that rebuild so they survive.",
    ],
  },
  {
    date: "2026-10-18",
    summary: [
      "ログインしなくても、タイトル画面からそのまま遊べるようになりました",
    ],
    summaryEn: [
      "You can now start playing straight from the title screen, without an account",
    ],
    items: [
      "タイトル画面の「ログイン」の下に「アカウントを作らずに試す」を足しました。押すと、物語で遊び方を教わるか、すぐCPUと対戦するかを選べます。ホーム画面に追加したショートカットから開いた時や、お友達にURLをそのまま教えてもらった時など、これまで行き止まりになっていた入り方でも、そのまま遊び始められます。一度押した端末では、次からはこの画面が最初から出ます。ログインしている方にはこれまでどおりの画面が出ます。",
    ],
    itemsEn: [
      "The title screen now offers \"Try it without an account\" under the log-in button. It leads to the same two ways in as the trial page: learn the game through the story, or play the CPU right away. This covers the ways people used to hit a dead end — opening the home screen shortcut, or being handed the plain address by a friend. Once you have used it on a device, that screen comes up first from then on. Nothing changes for people who are logged in.",
    ],
    fixes: [
      "試遊版をホーム画面に追加して開き直すと、ふつうのタイトル画面になってしまう件を直しました（前回の直しでは iPhone で直っていませんでした）。",
      "なないろの欠片で、すでにロックした札をもう一度使えてしまい、ロックの色が増えることがあったのを直しました。",
      "不具合報告のボタンを、タイトル画面にも出るようにしました。",
    ],
    fixesEn: [
      "Fixed, for real this time, the trial entry being lost when the game is opened from a home screen shortcut; the previous attempt did not work on iPhone.",
      "Fixed a Shard of Seven Hues card that was already locked being usable again, which could add a locked colour out of nowhere.",
      "The bug report button is shown on the title screen again.",
    ],
    devItems: [
      "**#419「七色のカード2枚しかもってなかったけど、クリックしまくってたら2つの色ろっくできて勝っちゃいました」＝勝敗が狂う不具合。** 行動ログで確定した: 1回目の発動で**ロック0番へ置いた**なないろの欠片(card-208)が、2回目の発動でも `ctx.cardTokenId` として使われ、**0番から2番へ引きずり出されていた**（0番には相方が残るので**1色が無から増え**、7色に届いて勝利）。大半のカードは発動の最初に自分自身を捨てるので二重発動が実害にならないが、**なないろの欠片の「2枚をロックする」選択肢は `keepsCardOnUse` でカードを残す**ため、同じ札を何度でもロックし直せた。直しは `runHandEffectOption` の冒頭に**「この札がまだ手札にあるか」の確認**を1つ（ファースト/エターナルは『ロックされていても手札効果を使える』特別枠なので対象外）。**A/B**: 直す前＝ロック済みの札で `ok:true`・**0番→2番へ移動＋2枚ドロー**／直した後＝`ok:false`・**何も起きない**。**正常系（手札の札）は前後で完全に同じ**。`diag-hand-effect-stale` を残したので、次に起きたら経路が分かる。",
      "**#420 の試遊版の件は、URLにも端末の記憶にも頼らない形へ切り替えた。** 報告 #420 で `href=\"https://seven.asobuzz.net/\"` かつ **version が最新**と分かり、「古いキャッシュ」ではなく **iOS 18.7 が差し替えた manifest を見ていない**ことが確定した（続き596 の手が効かない）。さらに **manifest 系の手はどれも『すでに追加してあるショートカット』には効かない**（追加し直しが要る）。→ **試遊パネルを常に組み立てておき、通常のタイトル画面に「アカウントを作らずに試す」を置いた**。未ログインの時だけ出す。押すと `rememberTrialEntry()`（続き593 の30日の控え）も立てるので、次からは最初から試遊パネルになる。**A/B（iPhoneのUA・932x430）**: ①通常の入口＝ボタンが出る（139x27・画面内）②押すと試遊パネル（321x302・画面内）③開き直すと最初から試遊パネル ④`?trial` で来た人は従来どおり（ボタンは出ない）。例外0件。**なお `manifest-trial.json`（続き596）はそのまま残してある**——効く端末では効くので、二重の備えとして。",
      "**ユーザー報告 第2報「やっぱり試遊版URLですがホーム追加した後開くと普通のデジタル版になっちゃいます」。** 10/16 の直し（この端末が試遊から入ったことを localStorage に覚える）では**直っていなかった**。🔴 理由: **iOS では、ホーム画面から開いたアプリは Safari とは別の保管場所を持つ**——Cookie・localStorage・IndexedDB は共有されず、共有されるのは Service Worker の登録と CacheStorage だけ（WebKit 側の説明。ウェブで裏を取った）。つまり Safari で覚えた印はホーム画面のアプリからは**見えない**ので、「端末に覚えさせる」やり方ではこの経路は**原理的に越えられない**。→ **ショートカット自身の行き先に残す**のが正解。ホーム画面から開く時のURLは manifest の `start_url` なので、**試遊で来た人の画面でだけ** `start_url` に `?trial=app` を持つ `manifest-trial.json` へ差し替える（`manifest.json` は全員で共有の1枚なので、そちらに書くと試遊で来ていない人の追加まで試遊扱いになる＝誤り）。差し替えは **index.html に直接**書いた——本番では試遊メニューが出るまで10秒前後かかるので、その間に「ホーム画面に追加」を押されても間に合うようにするため。タグを `gm` ではなく **`app`**（＝ホーム画面から開いた）にして、`getTrialSource()` がこれを数えないようにした——数えると「試遊のリンクから来た人」という数字の意味が変わるため。**A/Bで確認**: `?trial=gm` で開くと manifest が `manifest-trial.json`（`start_url: \"./?trial=app\"`）に替わり試遊パネルが出て訪問記録は `trial:gm`／試遊でない人は `manifest.json`（`\"./\"`）のままで試遊パネルは出ない／`?trial=app` では試遊パネルが出て訪問記録は数えない。**10/16 の『端末に覚える』方も残してある**（Android の Chrome など保管場所が共有される端末と、Safari で開き直した時に効く＝二重の備え）。",
    ],
    devItemsEn: [
      "A rainbow shard that had already been locked could be played again as the effect card, dragging itself out of its lock slot into another one while its partner stayed behind, which created a locked colour out of nothing and ended the game. The hand effect runner now checks that the card is still in hand before anything happens, except for First and Eternal cards, which are meant to work from the lock.",
      "Report #420 showed the newest build still opening the bare address from the home screen, so iOS was ignoring the swapped manifest, and no manifest-based fix can repair shortcuts people have already created. The trial panel is now built on every title screen and reachable from a button shown to logged-out visitors, so the entry no longer depends on the address or on device storage.",
      "Remembering the trial entry in localStorage could never work on iOS, where a home screen app has its own storage separate from Safari; the shortcut's own destination now carries the flag instead, by swapping in a trial manifest whose start_url keeps the parameter, and only on the page of someone who arrived through the trial link. The swap is inline in the document so that it is already in place during the ten seconds the app takes to load, and the relaunch uses a distinct tag that the visit metric ignores.",
    ],
  },
  {
    date: "2026-10-16",
    fixes: [
      "複数のカードを捨てる画面で、下の「これで捨てる」などのボタンが見切れていたのを直しました。カードが増えても必ず見えます。",
      "サマリー（早見表）の✕を押しやすい大きさにして、画面が少しスクロールしてしまうのをやめました。",
      "最初に出る案内（ことば／ホーム画面に追加）が、画面の低い端末で小さすぎて読めなかったのを直しました。",
      "右下の「○○のターンです」が、名前が入ると折り返してしまうことがあったのを直しました。",
      "カードのタイトルのふりがなが白くて読みづらかったのを、濃い文字にしました。",
      "ゴメンナサイを使っている途中で、勝手に承認が進んで相手が勝ってしまうことがあったのを直しました。じっくり選んでも大丈夫です。",
      "1つのロック宣言に対して、2人目以降もゴメンナサイを使えてしまうことがあったのを直しました。",
      "試遊版をホーム画面に追加して開き直すと、ふつうのタイトル画面になってしまっていたのを直しました。",
      "物語のエイドス戦に、CPU戦で選んだ設定（無色あり・ブーストあり）が混ざってしまっていたのを直しました。物語の戦いは誰がやっても同じ中身になります。",
    ],
    fixesEn: [
      "Fixed the confirm buttons being cut off at the bottom of the multi-card discard dialog, however many cards you hold.",
      "The quick reference sheet now has a larger close button and no longer scrolls slightly.",
      "Fixed the first-run notice (language / add to home screen) being too small to read on short screens.",
      "Fixed the turn banner at the bottom right wrapping onto several lines once a player name was in it.",
      "The furigana above card titles is now dark instead of white, so it can be read.",
      "Fixed an approval going through on its own while you were still playing So Sorry!, which could hand the win to your opponent. Take your time choosing.",
      "Fixed a second player being able to play So Sorry! against the same final-lock declaration.",
      "Fixed the trial entry being lost when the game was opened from a home screen shortcut.",
      "Fixed the story battles against Eidos picking up the colourless and boost options chosen for ordinary CPU games; the story battles are now the same for everyone.",
    ],
    devItems: [
      "**#412「複数捨てるモーダルの時、下のボタンが見切れてます！カードの上部も少し見切れてる気がします！」**。報告に入っていた**画面の記録（screen2）でその場で確定した**——モーダルの箱は `160,40,612,349` で画面(430)には収まっているのに、**中身が476**（はみ出し112）。`#stack-modal` 自身が `overflow-y: auto` なので**確定ボタンが巻かれて見えなくなっていた**。手元でも同じ箱（`160,40,612,349`）で再現し、**手札4枚では見えるが8枚から見えなくなる**ことを確かめた（続き563 の検証が3〜4枚だったので通ってしまっていた）。直しは、中身を縦3段（題と案内／一覧／確定ボタン）に分けて**巻くのは一覧だけ**にする（`min-height: 0` が無いと flex の子は縮まず結局はみ出す）。あわせてスマホの `max-height: 85vh`（実画面349px＝**vhの罠**）を `26rem`（約398px）に、カードを 8rem→6rem に。**A/Bで確認**——直す前は8枚・12枚で確定ボタンが枠外、直した後はどちらも枠内。**戻ってきたのはボタン1つではなく3つ**（「これで捨てる」「おまかせ」「盤面を見る」が全部隠れていた）。932x320 の低い画面でも枠内。",
      "**#408「サマリー表示で、バツボタンが小さい。あと少しスクロールになるので動かない方がいい」**。実測（932x430）: ✕ が **19.9x19.9px**（押すものの目安28px未満）、パネルは中身894に対して見える830＝**はみ出し64**で早見表の下が切れていた。直しは #412 と同じ形——パネルを縦3段にして**絵だけが縮む**ようにし（`object-fit: contain` なので形は崩れない）、巻きを止めた。✕ は**この画面の中だけ** 3.8rem に（共通クラスなので他のモーダルに波及させない。題の右余白も一緒に広げないと文字に被る）。実測: **はみ出し 0**・✕ **29x29px**・早見表の下端405.7<430。",
      "**起動時の案内（ことば／ホーム画面に追加）が、画面の低い端末で読めなかった**（試遊の動線を本番で通して見つけた）。実測（932x320＝iPhone横持ちでSafariのバーが出ている状態・ステージ倍率0.356）: **11行すべてが11px未満**で「このまま遊ぶ」が8.5px、手順8.5px、注記6.5px。**10/17 に来た人が最初に見る画面**で、いちばん伝えたい「ホーム画面に追加してください」が読めない。🔴 **字を大きくするだけでは入らない**（320pxの画面でモーダルは既に268px＝84%を使っていた）ので、`@media (max-height: 380px)` で**長い説明と注記を隠してから字を大きくし、横幅も広げた**（折り返しが減って縦が縮む）。**A/Bで確認**——11px未満が **11行→1行**（「もう出さない」10.3px＝控えめにしたい文字）、「このまま遊ぶ」8.5→**11.9px**、モーダルの高さ 268.6→**213.9**（画面の84%→67%）。**932x430 は箱も行も1つも変わっていない**＝低い画面だけに効いている。",
      "**#414「右下の『エイドスのターンです』の改行が気になります」**——10/12 に入れた名指しの回帰。原因は `max-width` ではなく**入れ物の幅**だった。この表示は案内板バーの中に `position: absolute; right: 0` で置かれていて、**幅が auto だと入れ物（バー）の幅までしか広がれない**（実測: 上限は352pxと書いてあるのに、折り返した時の箱は実画面168px＝CSS約279pxで頭打ちだった）。`width: max-content` にすると**入れ物をはみ出して左へ伸びられる**ので1行に収まる（右端基準なので伸びる先は画面の内側）。長すぎる時だけ `max-width: 44rem` で折り返す。**A/Bで確認**——長い文（優先権の注記つき）が **3行→1行**、箱は 168→343.5px で**画面内のまま**、短い文は1つも変わっていない。932x320 でも 3行→1行。",
      "**#415「カードタイトルのルビが白色ですが背景が白なので黒文字がいいかと！」**。2026-09-26 に題の帯が濃くなったとき、題とふりがなをまとめて白にしていた。しかし**ふりがなだけは帯の外（真上）に浮いている**（`bottom: 100%`。実測でもルビの下端が題の箱の上端より上にある）ので、**乗っているのは帯の上の淡い所**だった。ふりがなだけ濃い字（`#141414`＝基底と同じ）に戻し、影も外した。⚠ **ファーストは触っていない**——あちらは題もふりがなも**絵の上**に乗る作りで、全部白が正しい。実測: 通常・エターナルとも ルビ `rgb(20,20,20)`／題は `rgb(255,255,255)` のまま。実際に3枚描いて目でも確かめた。",
      "**#417「ゴメンナサイが通る前に、次のプレイヤーの承認モーダルが出て承認すると勝っちゃった」＋ #416「1つのロック宣言に対して複数のゴメンナサイが使える？」——同じ根だった。** `main.js` には「ゴメンナサイを使っている最中は自動承認しない」ための `gomennasaiManualUseInFlight` が前からあり（#36/#83 の対策）、**2か所**で使われている。ところが**あとから足した2つの自動承認の経路には付け忘れていた**: ①45秒の自動承認（`checkFinalLockApprovalTimeout`）②60秒の詰まり救済（`checkFinalLockStuckApprove`）。ゴメンナサイは「奪う札を選ぶ→コストの紫を選ぶ→発動宣言と『防いだ！』の演出」と進むので45秒を超えやすく、**本人の画面のタイマーが本人を裏切って承認を送っていた**。承認待ちが先へ進むと、次の人の画面では攻撃側がまだ7色目に届いて見えるので**2人目にもボタンが出る**＝#416。報告のログでも `diag-final-lock-auto-approve`（A 23:57:27 / B 00:00:14）が出ており、**B のぶんは `diag-lock-robbed-notice`（00:00:14）と同じ秒**だった＝奪取とタイマーが競っていた。①は守りを足して時計も進めるようにした。",
      "**②の60秒の救済は「撃つ前に、承認者が本当に止まっているかを確かめる」形にした。** この救済のコメント自身が目的を「その人の通信が切れていれば誰も解決できない」と書いているのに、**切れているかを確かめずに時間だけで撃っていた**。確かめる材料は既にあった——各席は **25秒ごとに `so7_game_seats.last_seen` を更新し続けており**（`HEARTBEAT_MS`）、「もう一度遊ぶ」の待ち相手判定が同じ値を **70秒**のしきい値で使っている（`REMATCH_FRESH_MS`）。**ゴメンナサイを選んでいる最中でも、生きていればこの値は新しいまま**。`isSeatAlive()` を online.js に新設し、生きていれば撃たずに時計を進め直す。⚠ **読み取りに失敗した時（null）は「落ちている」と読まない**——読めなかっただけで人を撃つことになるため。ただし永久に止めると落ちた人が1人いるだけで対局が終わらないので、**その時だけ180秒まで待ってから撃つ**（迷ったら遅い方へ倒す）。判定そのものは `isLastSeenFresh()` に切り出して、部屋に入らなくても true / false / null を直接確かめられるようにした。",
      "**ユーザー報告「クラファンページの試遊版、入った後ホームに追加して開き直すと、タイトル画面が通常のになっちゃってる気がする」——気のせいではなかった。** ホーム画面から開く時のURLは `manifest.json` の `start_url`（`\"./\"`）で、**`?trial` が付かない**。つまり**こちらが勧めている道**（起動時の案内で「ホーム画面に追加して、そこから開いてください」と出している）を通ると、試遊の入口が消えてログインを求める通常のタイトルに変わる。🔴 **manifest の `start_url` に `?trial` を入れるのは誤り**——あれは全員で共有の1枚なので、試遊で来ていない人の追加まで試遊扱いになる。**この端末が試遊から入ったことを覚えておく**形にした（`so7-trial-entry`・30日で失効）。ログインへ進む時は `clearTrialParam` と一緒に控えも消すので、登録した人には次から通常のタイトルが出る。⚠ **訪問記録の `getTrialSource` は URL だけを見るまま**にした——あの数字は「試遊のリンクから来た人」という意味で既にコンソールに出ているので、開き直した2回目以降まで数え始めると意味が変わる。**A/Bで確認**——直す前は `?trial` 無しで開くと通常のタイトル（ログインボタンだけ）、直した後は試遊パネルが出る。ログイン後は両方とも通常のタイトル。",
      "**カードの「持ち物検査」を作った**（`node tools/check-cards.mjs`）。ユーザー「今後カードが増えていった際にスマートに対応できるプログラムになってますか？」への答えとして、まず実測した: カード34種に対し **効果データ34/34・日英の文34/34・画像34/34・テスト34/34** で欠けゼロ、山札も `expandDeck(NORMAL_CARDS)` でデータから自動で組まれる（枚数の決め打ちは無い）。**つまり骨格は良い。ただし揃っているのは人が気をつけているからで、仕組みは何も見ていなかった。** カードを足して効果データや英文やテストを忘れても誰も何も言わない。そこで全カードについて（効果データ／日本語の文／英語の文／カード画像／イラスト版／テスト）の有無と、逆向き（一覧に無いのにデータだけ在る＝消し忘れ）を突き合わせる道具を足した。🔴 **探し方が空振りすると「0件＝合格」になる**ので、まず「それらしい数が取れたか」を確かめ、取れていなければ検査自体を失敗にする。**A/Bで確認**——にせのカードを1枚足すと6件を名指しで報告し終了コード1、戻すと合格。ブーストの白紙カード7種は効果も実画像も持たない作りなので対象外にしてある。あわせて `card-effects.js` の冒頭に残っていた「**まだゲーム本体には一切配線していない、パイロット5枚だけの設計たたき台**」という**古い説明を訂正した**（実際はとっくに全34種を本番で動かしている）。",
      "**ユーザー報告「本気のエイドスの時、CPU戦の時の選択（ブーストモードとかマイデッキ戦とか）が引き継がれちゃってる？」——そのとおりだった。** `runCpuBattleSetup` は**渡さなかった項目にCPU戦モーダルで選んだ設定を既定で使う**作り。`eidos-story.js` は `myDeck` と人数を明示していたが、**白黒（無色）とブーストを渡し忘れていた**ので、物語戦の中身が「その端末のCPU戦の設定」で変わっていた。**実測**（本気エイドス戦を設定だけ変えて4回開始）: 両方オフ＝白紙0・無色2／**ブーストON＝白紙2枚混ざる**／**白黒ON＝無色3に増える**／両方ON＝白紙2・無色4。コードのコメント自体が「物語のエイドス戦は myDeck を明示で渡してくるので、そちらはこの設定に左右されない」と書いており、**意図はあったのに2つ渡し忘れていた**形。物語戦は作り込まれた筋書き（エイドス＝ノワール＋両隣に烙印）なので**誰がやっても同じ戦い**であるべき、という判断で `includeBlackWhite: false, boost: false` を明示した（ユーザー了承）。設定どうしのぶつかり合いも消える——**#391「本気のエイドスがノワールを3枚ロックしている」は、まさにブーストONの白紙カードがノワールに変換されていたもの**だった。**A/Bで確認**——直した後は4通りすべて同じ中身（白紙0・無色2・ノワール1・烙印2）。易しい方・本気の方どちらも同じ1か所を通るので両方に効く。⚠ **既定は両方オフ**なので、初めて開く端末（ゲムマで来る人）には元から影響が無かった。",
    ],
    devItemsEn: [
      "The multi-card discard dialog clipped its confirm buttons because the modal itself scrolled; it is now a three-row flex column where only the card list scrolls, so the buttons are always visible. The report's captured screen state identified the cause immediately, and the same box was reproduced locally at eight cards.",
      "The quick reference panel was given the same treatment so only the sheet image shrinks, and its close button was enlarged inside that panel alone, since the class is shared with every other modal.",
      "The first-run notice was unreadable on short screens, where every line fell below eleven pixels; long explanations are now hidden and the remaining text enlarged under a height media query, leaving taller screens untouched.",
      "The turn banner wrapped because its width was auto inside the narrow phase-guide bar, so it could never exceed the bar; max-content lets it extend leftwards into the screen and it now stays on one line.",
      "Card title furigana floats above the title band rather than inside it, so the white introduced when the band darkened left it on a pale background; only the furigana is dark again, and First cards are untouched.",
      "Both So Sorry! reports shared one cause: the flag that suppresses auto-approval while So Sorry! is being resolved existed in two places but had never been added to the forty-five second timeout or the sixty second stuck rescue, so a player's own client could approve on their behalf mid-resolution and hand the attacker the win, which in turn let a second player see the declaration as still completing and offer them the button too.",
      "The stuck rescue now checks whether the approver's seat is actually stale before firing, using the per-seat heartbeat the app already writes every twenty-five seconds; an unreadable result is never treated as absence, but it does extend the wait to three minutes so a genuinely dead client cannot freeze the game.",
      "Adding the game to a home screen dropped the trial entry because the manifest start_url carries no query, so the device now remembers that it arrived through the trial link and forgets it again when the player goes to log in; the visit metric still counts only real link arrivals.",
      "A card inventory check was added so that adding a card reports anything missing by name: effect data, Japanese and English text, both images and a test. The checker fails loudly if its own search finds implausibly few cards, and a stale comment claiming the effect data was an unwired prototype was corrected.",
      "The story battles passed only the deck and player-count options to the shared CPU setup, so the colourless and boost options fell back to whatever the device had chosen for ordinary CPU games, changing an authored scenario; both are now passed explicitly.",
    ],
  },
  {
    date: "2026-10-12",
    summary: [
      "対戦が戦績システムに登録されないことがあったのを直しました",
      "「もう一度遊ぶ」で、誰を待っているかが分かるようになりました",
      "サマリー（早見表）をゲーム中に開けるようになりました",
      "ホーム画面とマイページの文字の大きさを、前の見え方に戻しました",
      "「相手のターンです」が「○○のターンです」と名前で出るようになりました",
      "最後のロックの承認で、ゴメンナサイのボタンに実物のカードが出るようになりました",
    ],
    summaryEn: [
      "Fixed matches sometimes not being recorded in the stats system",
      "The rematch screen now tells you who it is waiting for",
      "The quick reference sheet can now be opened during a game",
      "Home and My Page are back to their previous text sizes on phones",
      "The turn banner now names whose turn it is, instead of saying “your opponent”",
      "The final-lock approval now shows the actual So Sorry! card on its button",
    ],
    items: [
      "**対戦の結果が戦績システムに登録されないこと**があったのを直しました。**勝った人がゲスト（戦績システムに登録していない人）だと、その対戦がまるごと記録されていませんでした**——勝った人だけでなく、**一緒に遊んだ全員のぶん**が消えていました。これからは記録され、勝者は「ゲスト」と表示されます。",
      "オンラインで「もう一度遊ぶ」を押した後、**誰を待っているのかが名前で分かる**ようになりました（「○○さんを待っています（2/4人が準備OK）」）。この機能は**全員が押すと始まる**作りですが、これまでは「他の参加者を待っています…」としか出ず、1人が席を外しているだけでも**壊れているように見えていました**。",
      "右下の「自動送り」の左隣に**📋 サマリー**のボタンが付きました。実物に入っている**早見表**を、遊びながらそのまま見られます（**表**＝自分のターンの流れ・勝利条件・移動と接触／**裏**＝覚えておきたい原則・相手ゲート侵攻のボーナス）。タブか画像を押すと表／裏が切り替わります。",
      "スマホの**ホーム画面とマイページ**の文字の大きさを、**1つ前の見え方に戻しました**。昨日まとめて大きくしたのですが、「する前のがよかった」というご指摘をいただいたので戻しています。あわせて、大きくしたぶんを収めるために狭めていた**余白・タイルの間隔・絵の大きさも元の値に戻りました**。ほかの画面（お知らせ、サウンドの初回設定、物語、対局中の表示、不具合報告、効果の説明など）の文字は大きいままです。",
      "画面の右下の**ターン表示が名前で出る**ようになりました。これまでは誰の番でも「**相手のターンです**」で、4人で遊んでいると**3人のうち誰の番なのか分からなかった**ところです。これからは「**つづさんのターンです**」のように出ます。**優先権**の一行（効果の処理中などに添えられるもの）も同じく「優先権は**○○**にあります」と名前で出ます。",
      "相手が**最後のロック**を宣言した時の承認の画面で、**ゴメンナサイのボタンに実物のカードが出る**ようになりました。これまでは「承認する」が**緑**・「ゴメンナサイを使う」が**赤**で、赤が「やめる・キャンセル」に見えて**押し間違いが起きていました**。**色を入れ替えるのではなく**（入れ替えても、今度は逆向きに読み違えるだけなので）、使う方に**カードそのもの**を出して「このカードを使う」と分かるようにし、承認する方からは色を抜きました。",
    ],
    itemsEn: [
      "Fixed match results sometimes not reaching the stats system. When the winner was a guest who is not registered there, the whole match was dropped, taking everyone else's record with it. Those matches are now kept, with the winner shown as a guest.",
      "After tapping play again in an online room, the screen now names who it is still waiting for, with a count. It always needed everyone to tap it, but the old message said only that it was waiting, so one person stepping away looked like a breakage.",
      "A quick reference button now sits next to the auto-advance button at the bottom right. It opens the reference sheet that comes with the physical game: the front covers your turn, the victory condition and moving versus contact, and the back covers the standing principles and the gate invasion bonus. Tap a tab or the sheet itself to flip it.",
      "The text sizes on the phone home screen and My Page are back to how they looked before yesterday's change, following your feedback that the earlier look was better. The padding, tile spacing and icon sizes that had been tightened to make room for the larger text are back to their original values as well. Every other screen keeps its larger text.",
      "The turn banner at the bottom right now names the player whose turn it is. It used to say only that it was your opponent's turn, which told you nothing in a four-player game. The priority note that appears alongside it during effect resolution now names the player too.",
      "A card is easier to recognise by its own art than by the colour of a button, so the approval banner for a final lock now shows the actual So Sorry! card on the button that plays it, and the approve button no longer competes for attention with a green fill. The colours were not swapped, because swapping them would only move the misreading to the other side.",
    ],
    fixes: [
      "カードの効果を処理している途中なのに、別の手札カードを使えてしまうことがあったのを直しました。",
      "「盤面を見る」で覗いている間、カードにカーソルを合わせても拡大できなかったのを直しました。",
      "オンラインで、移動したのに駒がその場から動かず、移動先のカードだけめくれてしまうことがあったのを直しました。もう一度マスを選べます。",
    ],
    fixesEn: [
      "Fixed being able to play another hand card while a card effect was still being resolved.",
      "Fixed card previews not appearing while peeking at the board from a selection dialog.",
      "Fixed an online move sometimes leaving your piece where it was while only flipping the destination card. You can now pick a square again.",
    ],
    devItems: [
      "**戦績に登録されない件の原因**（#405/#406 のログから確定）: `null value in column \"winner_id\" of relation \"matches\" violates not-null constraint`。勝者が戦績システム未登録（ゲスト）だと `winner_id` が null になるが、姉妹プロジェクト側が **not null** だったため insert が例外になり、**参加者全員ぶんの記録が消えていた**。コードのコメントは「nullのまま記録する」と書いてあった＝**実際のスキーマで試していなかった**。実データでも 10/11 夜に `matches` へ入ったデジタル版の試合は**1件だけ**で、21:58 の4人戦は保険の経路（20秒後の再試行）ごと失敗していた。**教訓: 別プロジェクトのテーブルへ書く時は、相手の列の not null / 型を実物で確かめる。**",
      "直しは `alter table matches alter column winner_id drop not null;`（ユーザーが実行）。**行を1つも作らない方法で効いたことを確認した**——`winner_id` を null、かつ `date`（not null・既定なし）をわざと欠けさせて送り、返るエラーが `winner_id` から `date` に変わることを見た。あわせて**姉妹プロジェクト側も直した**（別リポジトリ BATTLE-log。`supabase_setup.sql` の記述を実物に合わせ、勝者が引けない時の表示を「不明」→「ゲスト」に4か所。勝敗数の集計は winnerId の一致で数えるので null は「誰の勝ちでもない」と扱われて狂わない）。",
      "**#406「もう一回を押しても次のゲームがはじまらない」**: 報告のログ802行に **rematch の記録が1行も無く**、押したかどうかすら分からなかった。仕組みは「生きている座席が全員押したら再開」なので1人でも押さないと永久に始まらないのに、画面は「他の参加者を待っています…」だけ。**仕組みは変えず**、誰を待っているかを名前と人数で出し、同じ内容を `diag-rematch-waiting`／押した事実を `diag-rematch-ready` に残すようにした。**推測で仕組み（人数で見切る等）を変えると別の壊れ方をする**ので、次の報告で誰が押していないかが分かる状態にしてから判断する。",
      "**合同建設の途中で別のカードを使えた件**: 手札を場へ出して効果を使ってよいかの判定が `isHandPhaseActive() || (usableAnytime && !isAnyEffectProcessingBusy())` で、**ハンドフェイズ側だけ「いま別の効果を処理中か」を見ていなかった**。合同建設は自分のハンドフェイズで使うので、解決の最中（マス選択・山札/手札の選択）もハンドフェイズのまま＝別のカードを出せてしまった。`(isHandPhaseActive() || usableAnytime) && !isAnyEffectProcessingBusy()` に直した。`isAnyEffectProcessingBusy()` には候補の選択待ち（activeEffectPicker）も含まれるので「選択を待っている間は他のカードを使えない」が自然に成立する。候補として手札を選ぶ操作は別経路なので塞がらない（スモークで通常のカード使用が壊れていないことも確認）。",
      "**「盤面を見る」中にホバー拡大が効かない件**: あの機能は**覆いを残したまま透明にする**作り（続き546。盤面を触らせないため）だが、ホバーの入口 `updateHover` が「返事待ちの覆いが出ていたら何もしない」（#317）なので**覗いている間はホバーも死んでいた**。覗いている間だけ `body.so7-peeking-board` を付け、**ホバーの判定だけ**通すようにした。**A/Bで確認**——覆いあり＝拡大出ない／覗き中＝**拡大が出る**／覗き中でも覆いは手前にあり**掴めない**まま。",
      "**ユーザー要望「サマリーを見るボタンを右下の自動送りボタンの左隣に新設するのはどう？」**。`src/summary-sheet.js` を新設し、フェイズ案内板の**先頭**（自動送りのさらに左）にボタンを置いた。素材は入稿データの PNG（2363x1182・各4MB）。**画像はファイル容量ではなく幅×高さ×4バイトでメモリを食う**（#223 でiPhoneが落ちた）ので、**幅1500pxのWebP（各374KB）に落とし、開いた時だけ読み込み、閉じたら img ごと捨てる**（2枚を同時に持たないよう、切り替えは src の差し替えだけ）。",
      "**また `vw` の罠を踏んだ（記録）**: パネルを `width: 96vw` にしたら**実画面の46%（405px）にしかならなかった**。`vw` はビューポート基準なのに、描かれる大きさにはステージ倍率0.478が掛かるため（続き575 の★）。ステージ基準の **`96rem`** に直して **718px（画面の77%）** になった。早見表は横長で情報が詰まっているので、**どれだけ大きく映せるかがそのまま読みやすさ**になる。",
      "横持ちのスマホは**高さが足りない**（早見表は幅の半分の高さ）ので、見出しを詰めて注記は省き、1画面に収めた。実測 **734x398 で画面内**・画像の表示幅718px・見出し13px・タブ11.5px。閉じると**パネルも img も消える**ことを確認。例外0件。",
      "**続き575〜578 で入れたホーム画面とマイページのスマホ用の拡大を取り消した**（ユーザー「スマホでのホーム画面とマイページ画面ですが昨日文字サイズ調整してるんだけど、する前のがよかったです」）。取り消したのは style.css の4つの塊——①マイページの着せ替え・段位まわり（続き576）②ホーム画面の文字13種と「ホーム画面に追加」の案内バー（続き576）③マイページのパネルの幅・余白・題名（続き577）④②で縦に伸びたぶんを取り返すために詰めた余白・タイルの間隔・絵の大きさ（続き578 の #402 対応）。🔴 **④は②があって初めて必要になったものなので、②だけ戻すと余白が詰まったままの中途半端な見た目になる＝必ずまとめて戻す。** #402「ホーム画面がスクロールする」も②を戻せば一緒に消える。`#my-page-panel` の**基本の規則は残した**——あれは続き577 で my-page.js の inline style から移してきたもので、PCの値は移す前とまったく同じ。消すとパネルの見た目そのものが無くなる（my-page.js 側はもう inline で持っていない）。共通の ✕ だけは全モーダル向けの拡大（2.6rem）が効いてしまうので、ヘルプと同じ形で**このパネルの中だけ 1.8rem に戻した**。",
      "**A/Bで「良かった状態」と一致することを確かめた**: 続き575 の直前（`739a729^`）の `style.css` と `my-page.js` を**配信のときだけ差し替える**プローブを書き、同じ手順でホーム画面とマイページを描いて、部品ごとに**computed の font-size・幅・高さ・行間・余白**を突き合わせた。ホーム**20種**・マイページ**17種**で**差0件**（マイページの1件はクラス名が `div` → `div.my-page-panel-title` に変わっただけで、値は 13.6px・409.1x9.7・行間20.4px まで同一）。ホーム画面のはみ出しも **30px＝続き575 より前と同じ値**に戻った（この30pxは元からある行の高さの丸め誤差で、見た目には出ていない）。⚠ **最初に「実画面px」だけで見比べたら NEW バッジが 6.3→6.8px と差が出たが、これは `offsetWidth` が整数なので小さい部品では実効倍率の推定がぶれるため**で、computed font-size は両方とも同じだった。**小さい部品を実効倍率で測る時は、派生の数字だけで差を判定しない。**",
      "**#407「ムーブフェイズにその場から移動できず移動先のカードだけめくれて効果が発動しなかった」**（まっちゃん・オンライン）。報告のログの決め手は `arrival: {\"cardId\":\"purple-trial-ritual\",\"location\":{\"zone\":\"cell\",\"row\":4,\"col\":0},\"player\":null,\"self\":\"B\",\"auto\":false,\"depth\":1}` の **`player` が null**——`triggerCardArrival` が `getPieceOwnerAt(location)` を引いた時点で**そのマスに駒が居なかった**。`player` が null だと `shouldAutoProcess` が false になるので**効果は動かず・手札に加えるボタンも出ない**。つまり `moveToken` は例外を投げずに戻ったのに、取り直した状態では駒が移動先に居なかった。それでも `performPhaseMoveToCell` はそのまま先へ進むので、①移動先のカードだけ表向きになる（全員に見える＝情報が只で漏れる）②到達効果が動かない ③「1手を使った」印は立っているのでそのままターンが終わる、という**報告の文面そのままの壊れ方**になる。なお `depth:1` は異常ではない（`beginPostMoveArrivalGuard` が移動のたびに +1 する）。直しは「確かめてから進む」——オンラインの `moveToken` → `fetchAndHydrate` のあとに `confirmPieceLandedOnline()` を挟み、駒が移動先に居なければ**一度だけ取り直してから**判定する（手元が古いだけならここで直ってそのまま進む）。それでも居なければ**カードをめくらずに止め**、`clearPhaseMoveActionTaken()`（phase-automation.js に新設）で1手の印を戻して**もう一度動ける**ようにし、赤い一行を出す。印を戻す判断の根拠は「**サーバーから取り直した状態が『まだ動いていない』と言っている**」こと——サーバーの言い分に合わせるのが、いちばん食い違わない。⚠ **なぜサーバーに適用されなかったのかは確定できていない**（`callAction` は `ok:false` でも非2xxでも throw するのに、ログに `diag-edge-error` もコンソールのエラーも無い）。`diag-move-not-applied`（refetch / recovered / confirmed の3段）を残したので、次に起きたら1回で切り分けられる。",
      "**ユーザー報告「CPU2にゴメンナサイでロック阻止された時、押し間違えた」への対応（本人了承済みの案）**。承認＝緑／ゴメンナサイ＝赤だったが、**赤は「やめる・キャンセル」に見える**のに、ここでは**ゴメンナサイの方が能動的な選択**なので読み違える。**色を入れ替えない**（入れ替えると今度は逆向きに誤読される）。ゴメンナサイ側に `getCardImagePath(\"purple-sorry\")` で**実物のカード**を出し（2.4rem角・正方形）、文言を「このカードを使う」に、承認側からは色を抜いた。🔴 **`.final-lock-approval-approve` / `-reject` はタイマーのオン/オフ・自動処理のオン/オフ・接触の承認でも流用されている**ので、`#final-lock-approval-banner` で囲って**このバナーの中だけ**に効かせた（A/Bで、他のバナーが緑・赤のままであることを確認）。⚠ **一度、明るいテーマで承認ボタンの文字が消えた**——共通規則が `color:#f0fdf4`（ほぼ白）を当てており、それは**緑地の上でだけ成り立つ色**だった。`color` を書かないだけでは足りず、`inherit` を明示してバナー自身の文字色を継ぐようにした（教訓15。**撮って初めて気づいた**）。実測: 暗いテーマ＝文字 `rgb(254,243,199)`／明るいテーマ＝`rgb(58,51,38)` で、どちらも読める。",
      "**ユーザー要望「『相手のターンです』→『○○のターンです』と名指しに」**。`phase-automation.js` のターン表示（`#phase-automation-turn-status`）が `turnPlayer === getSelfSeat()` の二択で「自分／相手」を出していた。`getPlayerName(state.turnPlayer)` を使って名指しにする（新しい文言 `pa.turnOfNamed` / `pa.priorityNamed`）。**名前が空の時だけ従来の「相手のターンです」に落とす**——名前のつもりで空文字が出ると「のターンです」になるため。同じ一文の中にある優先権の一行も名指しにした（片方だけ「相手」だと誰のことか分からない）。`player-identity.js` を `phase-automation.js` から import したが、**循環にはならない**（player-identity は board-layout / ui-text / online / state しか読まず、同じ深さの `gate-invasion.js` が既に同じ import をしている）。**A/Bで確認**——直す前は手番B・C・Dのどれでも「相手のターンです」と**同じ文**が出る／直した後は「CPU 1／CPU 2／プレイヤーD のターンです」と**出し分かれる**。優先権の一行も「優先権は相手に」→「優先権はプレイヤーDに」。どれも実画面12.5px・画面内・見切れなし（長くなった分は折り返して箱が 48.4→67.2 に伸びるだけ）。例外0件。",
    ],
    devItemsEn: [
      "The stats failure was a not-null violation on the winner column: a guest winner produced a null and the insert threw, dropping the whole match for every participant. The comment in the code claimed null was acceptable, which had never been tested against the real schema.",
      "The column was made nullable, verified without creating any row by sending a payload that fails on a different column instead, and the sister project was updated to match and to show a guest winner rather than unknown.",
      "The rematch report contained no rematch log lines at all, so the fix was to surface who is being waited for and to log it, rather than to guess at changing the rule that everyone must tap it.",
      "Playing another hand card mid-effect was possible because the hand-phase branch of the timing check never looked at whether an effect was already being resolved.",
      "Peeking at the board keeps the modal backdrop in place to block taps, which also disabled hover previews; hover alone is now allowed while peeking, verified by A/B that taps remain blocked.",
      "A quick reference button was added at the head of the phase guide bar, opening the physical game reference sheet. The source art was 4MB per side, so it was reduced to 1500px WebP and is only loaded while the panel is open, with the image element discarded on close.",
      "The vw trap appeared again: a 96vw panel rendered at only 46 percent of the screen because vw is viewport based while the rendering is scaled, so it was switched to stage-relative rem and now uses 77 percent.",
      "On a landscape phone the limiting dimension is height, so the heading was tightened and the footnote hidden to keep the whole sheet on one screen.",
      "The phone-only enlargements for the home screen and My Page were removed in four blocks, including the padding and spacing that had only been tightened to absorb the larger text; reverting the text without the spacing would have left a half-finished look, and the home screen scrolling report goes away with it. The base rule for the My Page panel was kept because it holds the values that used to be inline, and the shared close button was restored to its original size inside that panel only.",
      "The revert was confirmed by serving the pre-change style sheet and my-page module from the commit before the enlargement and comparing every element on both screens: twenty on the home screen and seventeen on My Page matched on computed font size, width, height, line height and padding, with the only listed difference being a class name. An apparent difference on one tiny badge turned out to be integer rounding of offsetWidth in the derived figure, not a real change.",
      "An online move could be acknowledged by the server call yet leave the piece where it was; the client then flipped the destination card and raised an arrival for a square with no piece on it, so no effect ran and the turn was spent. The move is now confirmed against a fresh fetch before going any further, the turn is handed back if it truly did not apply, and three diagnostic stages were added because the server-side cause is still unknown.",
      "The turn banner now resolves the player's name instead of choosing between you and your opponent, falling back to the old wording only when the name is empty; the priority note in the same sentence was changed the same way. An A/B run confirmed that all three opponents previously produced identical text and now produce distinct names, with no clipping at phone size.",
      "The approve and reject buttons of the final-lock banner were restyled inside that banner only, because those class names are reused by three other banners; an A/B run confirmed the others are untouched. The approve button now inherits its text colour instead of keeping the near-white value that only worked on the old green fill, which had made it invisible in the light theme.",
    ],
  },
  {
    date: "2026-10-11",
    summary: [
      "言語を切り替えている間、「切り替えています」と出るようになりました",
      "盤面に光が当たり、見せ場でカメラが寄るようになりました（既定で入りました）",
      "不具合報告に「今の画面の状態も送る」が付きました",
      "不具合報告の画面が、スマホでも読める大きさになりました",
      "試遊の画面が、いまログインしているかを教えてくれるようになりました",
      "最初に「言語」と「ホーム画面への追加」を案内するようになりました",
      "スマホの文字が小さすぎた所をまとめて大きくしました",
      "ホーム画面とヘルプまわりの文字も読める大きさにしました",
      "マイページがスマホで読める大きさになりました",
      "効果の説明が画面中央に大きく出るようになりました",
      "ホーム画面に追加した時のアイコンがロゴになりました",
    ],
    summaryEn: [
      "A notice now appears while the language is being switched",
      "Lighting on the board and camera moves at key moments are now on by default",
      "The problem report can now include what is on your screen",
      "The problem report is now readable on a phone",
      "The trial screen now tells you whether you are signed in",
      "A first-run guide now covers language and adding to your home screen",
      "Text that was far too small on phones has been enlarged",
      "The home screen and surrounding text are now readable too",
      "My Page is now readable on a phone",
      "Effect explanations now appear larger in the middle of the screen",
      "The home-screen icon is now the game logo",
    ],
    items: [
      "言語を切り替えると**1秒前後かかる**ことがあり（初回はとくに）、押しても何も起きないように見えていました。押した直後に**「言語を切り替えています…」**と出して、終わると消えるようにしました。オープニングの左上のボタンからでも、⚙オプションの言語選択からでも出ます。",
      "これまで**自分でスイッチを入れた人だけ**が使えていた2つの見せ方を、**最初から入った状態**にしました。①**盤面に光が当たります**（駒の面ごとに陰影が付き、立体感が出ます）②**見せ場でカメラが寄ります**——接触（タックル）、効果による移動、相手ゲートへの侵攻、ロックの成立、そして最後の1色。**通常の移動では寄りません**（毎ターン起きるので、うるさくならないように）。どちらも⚙オプションや管理者モードで**切れます**。**すでに自分で選んでいた方の設定は変わりません**（切っていた方は切ったまま、「全部」にしていた方は全部のまま）。",
      "不具合報告に**「今の画面の状態も送る」**（既定でオン）が付きました。送ると、その時に**どんな画面が出ていたか**——開いていた案内やモーダル、手番とフェイズ、光っている候補の数、盤面がちゃんと描けていたか——が**文字で**一緒に届きます。画像の添付と違って**必ず届く**ので、「何が起きたか画面で見せられない」場面でも原因が追えます。カードの中身や名前は入りません。送りたくない時はチェックを外せます。",
      "スマホで不具合報告を開いた時の**文字とボタンが大きく**なりました。これまでは文字が実画面で**6〜7px**（送信ボタンの高さ19px）しかなく、読むのも押すのも難しい状態でした。見出し・説明・入力欄・ボタンをまとめて2倍前後に拡大しました（パソコンの表示は変わりません）。",
      "試遊の入口（遊び方を教わる／CPUと対戦する／ログインする、が並ぶ画面）が、**いまログインしているかどうか**を出すようになりました。この画面はログインしていても出るのに、ボタンにはいつも「ログインしてすべてを使う」と書いてあったため、**ログイン中なのに未ログインだと読めてしまう**状態でした。ログイン中は誰で入っているかを表示し、ボタンも「アカウントの画面を開く」に変わります。",
      "スマホ・タブレットで開いた時、最初に**言語**と**ホーム画面への追加**を案内するようになりました。このゲームは**横向きの全画面**で遊ぶ作りで、ホーム画面に追加してその印から開くと**全画面・横向きで始まります**（ブラウザのままだと画面が狭く、下に黒い余白が出たり「端末を横向きにしてください」が出続けたりします）。Androidなどは**ボタン1つで追加**でき、iPhone・iPadは手順をその場に出します。全画面に対応している端末では「いますぐ全画面にする」も選べます。「このまま遊ぶ」でそのまま始められ、「もう出さない」で次から出なくなります（ホーム画面から起動している人には最初から出ません）。",
      "スマホ・タブレットで**文字が小さすぎた所をまとめて大きく**しました。直したのは、**お知らせ／更新情報**（全体。見出し・日付・本文・「詳細」・「戻る」）、**サウンドの初回設定**、**オープニングの物語の文章**、**対局中の表示**（ターン／ラウンド、手札の枚数、自分の名前、「自分のターンです」、アイコンの下の文字、自動送りのON/OFF）、**「今回のメンバー」**、**「スタートプレイヤー決定」**、**オープニングの言語の切り替え**、**モーダルを閉じる✕**です。押しやすさも一緒に上げています（✕や「詳細」などの当たり判定を大きくしました）。パソコンの表示は変わりません。",
      "スマホ・タブレットで、**ホーム画面**（タイルの名前・「次にやること」・各バッジ・「ホーム画面に追加」の案内）と**マイページの着せ替えまわり**、**α版のお知らせ**の文字を読める大きさにしました。あわせて、前回の調整で**大きすぎになっていた所を元に戻しました**（ヘルプ・マイページの名前・フェイズ案内板の文字・自分の名前など。これらは元から十分な大きさでした）。パソコンの表示は変わりません。",
      "スマホ・タブレットで**マイページ**の文字が読める大きさになり、パネルも広くなりました（これまでは中の文字が実画面で6.5px、幅も画面の2割ほどしかありませんでした）。",
      "スマホで、**カードの効果の説明が画面中央に出る小さな窓**が読める大きさになりました（文字が実画面で6px、窓の幅も画面の16%しかありませんでした）。",
      "ホーム画面に追加した時のアイコンが、**7色の玉からゲームのロゴ**（金の「7」と七色の紋章）に変わりました。既に追加してある端末では古い絵のままなので、**一度ホーム画面から消して追加し直す**と新しくなります。",
    ],
    itemsEn: [
      "Switching the language can take about a second, especially the first time, and until now pressing the button looked as if nothing had happened. A notice reading \"switching language\" now appears immediately and disappears once the switch is done. It shows whether you use the button at the top left of the opening screen or the language selector in the options.",
      "Two presentation features that previously had to be switched on by hand are now on from the start. The board is lit, so the faces of the pieces catch light and read as solid; and the camera moves in at key moments - a tackle, a move caused by a card effect, an invasion of an opponent's gate, a lock being completed, and the final colour. It deliberately does not move for ordinary moves, which happen every turn. Both can still be turned off in the options or the admin panel, and anyone who had already made a choice keeps it: off stays off, and \"all\" stays \"all\".",
      "The problem report now has an \"also send what is on screen now\" option, on by default. It attaches a text summary of your screen at that moment: which panels were open, whose turn it was, how many highlights were showing, and whether the board actually drew. Unlike an image attachment it always gets through, so problems that are hard to describe can still be traced. No card contents or names are included, and you can switch it off.",
      "The problem report is now much larger on a phone. Its text used to render at only 6-7 real pixels, with a 19px tall send button, which was hard to read and hard to tap. The heading, description, text box and buttons are now about twice the size (the desktop layout is unchanged).",
      "The trial entry screen now shows whether you are signed in. It appears even when you are signed in, yet its button always read \"log in to use every feature\", which made it look as though you were not. When you are signed in it now names the account and the button reads \"open the account screen\" instead.",
      "When you open the game on a phone or tablet, a short guide now covers your language and adding the game to your home screen. This game is built for full screen in landscape: opened from a home-screen icon it starts full screen and locked to landscape, whereas a browser tab gives a smaller view, sometimes a black band at the bottom, and the repeated \"please rotate your device\" notice. On Android and similar it can be added with one tap; on iPhone and iPad the steps are shown. Devices that support full screen also get a \"go full screen now\" option. You can play as it is, or switch the guide off for good, and it never appears if you already launched from the home screen.",
      "Text that was far too small on phones and tablets has been enlarged across the app: the news and updates page in full, the first-run sound settings, the opening story text, the in-game readouts (turn and round, hand count, your name, whose turn it is, the icon labels, the auto-advance on/off badge), the match intro, the start-player announcement, the opening language switch, and the close buttons on dialogs. Tap targets grew with them. The desktop layout is unchanged.",
      "On phones and tablets the home screen (tile names, the next-step card, the badges and the add-to-home prompt), the cosmetics area of My Page and the alpha notice are now readable. At the same time, items that the previous pass had made too large were returned to their original size, because they were already big enough. The desktop layout is unchanged.",
      "My Page is now readable on phones and tablets, and the panel itself is wider. Until now its text rendered at about 6.5 real pixels and the panel used only a fifth of the screen width.",
      "On phones, the small panel that explains a card effect in the middle of the screen is now readable. Its text rendered at about 6 real pixels and the panel used only a sixth of the screen width.",
      "The icon you get when you add the game to your home screen is now the game logo instead of the seven dots. Devices that already have it keep the old picture, so remove it from your home screen and add it again to see the new one.",
    ],
    fixes: [
      "本気のエイドス戦を「無色あり」で始めると、相手のロックエリアが正しくない形で始まっていたのを直しました。",
      "ログアウトしても、名前・アバター・物語の進み具合がその端末に残っていたのを直しました（アカウントには残るので、入り直せば戻ります）。",
      "ログインしていなくても（試遊のままでも）不具合報告を送れるようになりました。これまでは送信を押すと失敗していました。",
      "ホーム画面が縦にスクロールするようになっていたのを直しました（文字を大きくした分、縦に伸びていました）。",
    ],
    fixesEn: [
      "Fixed the serious Eidos battle starting with the opponent lock area set up incorrectly when blank cards were enabled.",
      "Fixed your name, avatar and story progress staying on the device after you log out (they remain on your account, so logging back in restores them).",
      "You can now send a problem report without being signed in, including from the trial entry. Until now, pressing send simply failed.",
      "Fixed the home screen having started to scroll vertically, which was a side effect of enlarging its text.",
    ],
    devItems: [
      "#391「本気のエイドスがノアールを2枚ロックでスタートしてます。正しいのはノワール1枚、その両側に誘惑の烙印を1枚ずつです」。**原因**: `APPLY_SEAT_NOIR` は「その辺のロックエリアにある `first-` で始まる札を全部ノワールに変える」作りだが、**ブースト（無色あり）はファーストの左右隣へ `first-blank-{色}` を置く**ので、**それらも一緒に変換されていた**。実測（本気エイドス戦の引数＋ブーストON）: `first-noir` が**3枚**（index 0・1・6）になり、さらに `noirIndex` が最後に見つかった札（index 1）になるので**烙印が間違った両隣**（0と2）に置かれ、index 0 では烙印とノワールが重なっていた。直し方は①**本物のファーストだけ**をノワールにする（`first-blank-` を先に除く）②ノワールの席のブースト札は**取り除く**（残すと烙印と重なるし、ユーザーの示した正しい形にならない）。7色勝利の数え方は変わらない（変換後はどれも placed＝数えない札だったため）。検証: ブーストON・OFF の両方で**ノワール1枚＋両側に烙印1枚ずつ**（ONは index 2・3・4）。npm test 63/63 PASS、smoke PASS、例外0件。",
      "**⚠ この件は一度「仕様どおり」として閉じた（#386）が、それが誤りだった。** 再現時に**ブーストをONにしていなかった**ため、正しい形（ノワール1枚＋烙印2枚）が出てしまい、ユーザーの「2枚見える」と噛み合わなかった。**設定で置かれる札が増減する所は、設定を変えて両方試す。** ユーザーが2回目の報告で**正しい形を具体的に書いてくれた**ことで、私の再現が実機と違うと気づけた。",
      "#390「オープニングで左上の言語切り替えボタンを押した後、反映されるまでが長い。押した後すぐに切り替えています的なモーダルが出ると嬉しい」。**実測**（スマホ相当・オープニング）: **1回目の切り替えは同期処理だけで1085ms**（描画込み1293ms）、2回目以降は180〜200ms。**ここが肝: `setLang` は同期で、その間ブラウザは1フレームも描けない**ので、案内を足すだけでは**出ないまま終わる**。案内を置いたあとに**わざと1フレーム描かせてから**切り替えを始める形にした（`requestAnimationFrame` 2回）。入口は「オープニングのボタン」と「基本設定の言語選択」の2つあるので、**共通の入口**（`setLangWithNotice`）を1つ作って両方そこを通す（アカウントからの自動復元は人が押していないので対象外）。文言は**日英併記**——切り替えの途中なのでどちらで出すかを決める意味が無い。取り残さない保険として `finally` と8秒の強制撤去を入れた。検証: 実際にボタンを押すと**76msで案内が見え**、1520msまで出ていて、終わると消え、言語は ja→en に変わっている。例外0件。",
      "**import 漏れを今回もやった（記録）**: `setLangWithNotice` を2ファイルで使ったのに import を書き忘れ、**`check-undeclared` は今回も0件と報告した**（この道具は import 漏れを見ない＝続き554 と同じ）。自分で grep して気づいた。**他のファイルの関数を新しく使ったら、import 行を自分の目で確かめる。**",
      "**ユーザー判断「派手な魅せ方はONにします」**。10/17 のクラウドファンディング公開で**初めて触る人が素の見え方のまま遊ぶ**ことになるため、2つの既定を変えた。①アグレッシブモード（`cinematic-camera.js` の `LEVEL_DEFAULT`）を `\"off\"` → **`\"highlights\"`**。②盤面の光（`board-3d-setting.js` の `isBoard3dLit()`）を**未設定なら true** に。明るさの既定は 4（続き546 でユーザーが実機で決めた値）のまま。",
      "**`\"all\"` にはしていない（判断の記録）**: `\"all\"` は**通常の移動でも寄る**ので1ターンに必ず1回以上カメラが動き、うるさい上に**自分で動かしたものには情報が無い**（続き547 でユーザーと合意した線）。`\"highlights\"` なら接触・効果による移動・ゲート侵攻・ロック成立・最後の1色だけに絞られる。",
      "**実装の肝**: 光の方は `localStorage.getItem(LIT_KEY) === \"1\"` のままでは既定を変えられないが、**単に反転させると「自分でOFFにした人のOFF」まで無視してしまう**。**未設定（null）だけを true** にして、明示的な `\"0\"` は尊重する形にした。検証: ①触っていない端末＝`highlights` ＋ 光ON（決め所で寄る・通常移動では寄らない）②自分でOFFにした端末＝両方OFFのまま ③「全部」にした端末＝`all` のまま（通常移動でも寄る）。例外0件。**カメラ演出と光がONの状態で smoke も通した**（8ターンまで自己対戦して PASS）。",
      "⚠ **申し送り**: 光の計算をやめていた元の理由は **#348「iPhoneの画面が熱い」**。ユーザーが実機で見て判断したうえでONにしているが、**熱が出るようなら `isBoard3dLit()` の未設定時を false に戻すだけ（1行）**で元に戻る。当日ブースで長時間つけっぱなしにする場合は、発熱の様子を見てほしい。",
      "**ユーザー提案「debugの機能に、画像添付以外に『今の画面を伝える』とかもあってもいいかも！どう？」**への対応。**画像ではなく文字**にしたのが判断の肝で、理由は3つ: ①画像は添付できないことがある（#376 は未解決。10/5 の7件は全滅）し、試遊（未ログイン）では Storage へ上げられない。**文字は報告の本体に入るので必ず届く** ②軽い ③この数日の #369（盤面が真っ白）・#389（モーダルが出ない＝実は画面最上部に17pxで出ていた）・#391 は、どれも「その時画面に何が出ていたか」が分からず推測に時間を使った。載せる項目はその3件を1回で切り分けられるものだけに絞った。",
      "**撮る時点は「報告の画面を開いた瞬間」**（送信時ではない）。報告モーダル自身が画面を覆うので、送信時に撮ると「報告モーダルが出ている画面」しか残らない。検証でも **layers に bug-report-modal が写っていない**ことを確かめた。何秒前の話かを `agoMs` で残す（報告を開いたまま対局が進むことがある）。",
      "中身は `context.screen2`: ①画面（inner/visualViewport/向き/ステージ倍率/横向き案内/「読み込み中」の消え残り）②body直下の覆い（z-index順に最大14件。**名前を決め打ちせず body の子を走査**するので新しいモーダルが増えても勝手に拾える）③手番・フェイズ・優先権・承認待ち ④光っている候補の数（クラス名は main.js を grep して実物を使った＝続き569 の教訓）⑤**盤面が本当に描けているか**（WebGLの板の枚数＋`board-3d-on` で CSS の絵が剥がされているか＋背景画像が残っている枚数。#369 はこの3つで即断できる）⑥いま押せるボタンの文字。カード名・手札の中身は入れない。",
      "検証は **page.route で送信を止めて中身だけ読む**形にした（本番のDBに検証用の行を作らないため）。実測: チェックは既定ON・画面内、送られる `screen2` は1783文字、**A/Bでチェックを外すと screen2 が入らない**、例外0件。手番の欄は state.js の公開APIで手番を立ててから撮り、`turnPlayer: A / turnPhase: A/move / priority: A(base)` が入ることを確かめた。",
      "**【ついでに見つけた・同時に直した】報告モーダル自体がスマホで読めなかった。** 実測（iPhone横持ち相当932x430・ステージ倍率0.478）で**送信ボタンの文字6.9px・高さ19px／添付の案内5.4px／説明文6.3px**。続き566 の CAMPFIRE リンク（6.3px）と #389 の「画面最上部の17pxの帯」と**まったく同じ寸法**だった。**報告する側の画面が読めなければ報告は来ない**ので、`body.is-phone-device` の拡大規則を足した。A/B実測で 見出し8.4→16.8px／説明6.3→10.3px／入力欄6.9→12.2px／送信ボタン6.9px・19px高→12.2px・32px高／チェック行6.1px・9px高→11.5px・24px高。モーダルは 260x249 → 419x362 で**画面内に収まっている**。画像を添付するとプレビューで縦に伸びるので `max-height: 52rem` + 巻きを付けた。",
      "**⚠ まだ直っていない（ユーザー判断待ち）: 試遊（ログイン無し）からは不具合報告が送れない。** `so7_bug_reports` の INSERT ポリシーが `to authenticated` だけなので、ログインを一切しない試遊の入口（?trial）から送ると RLS に弾かれて「送信に失敗しました」としか出ない。10/17 のクラファンから来る人は**まさにこの経路**なので、不具合に当たっても1件も届かない。ポリシーを `to anon, authenticated` に広げれば直る（訪問記録 so7_visit_log は元から anon に開いている）が、**公開鍵があれば誰でも書き込めるようになる**トレードオフがあるため、勝手に広げずユーザーの判断を仰いでいる。",
      "画像の添付は**ログイン中だけ**であることを画面に出すようにした（Storage の bug-shots は「ログイン済みの人が自分のフォルダへ」しか書けない作りで、公開読み取りのバケットを誰でも書ける状態にするのは危ないのでそこは開けない）。未ログインでは添付ボタンを隠し、代わりに「今の画面の状態」が使えることを案内する。",
      "`src/bug-report.js` の送信失敗時に `status.textContent =` が**2回続けて書かれていた**書き損じ（動作には影響しないが読み手を迷わせる）を直した。",
      "**ユーザー報告「試遊版でログイン無しでやろうとしたら、名前がログインした時の名前で、エイドス戦も本気のエイドスからになった。その辺ってアカウントではなく端末に情報が保存されてる？」**——調べたとおり**端末が基本の保存先**だった。名前・アバター（`so7-player-names` / `so7-player-avatars`）と物語の進み具合（`so7-eidos-progress-v1`）は localStorage に持ち、アカウントはその上に重ねる層（ログイン時に上書き／マージ）。本気のエイドスから始まったのは `eidos_hard_unlocked` が端末に残っていたため。**そしてログアウトでは何も消していなかった。**",
      "**「基本情報を全部アカウントに紐づけた方がいいか」はノー、と答えた。** アカウントだけにすると**試遊の人（＝10/17 に来る人）は何も保存できなくなる**。足りていないのは保存場所ではなく**区切り**だったので、ログアウトの時に端末から消す形にした。**消して困らない根拠**: 名前・アバターは `so7_user_profiles`、進み具合は `so7_user_profiles.eidos_progress` にアカウント側にも在る。進み具合は `startEidosStory` が読む前に必ず `syncEidosProgressFromAccount()` を await しているので、**空のローカルでアカウント側を上書きしてしまう事故も起きない**。**音量・テーマ・2D表示などの「端末の好み」は消さない**（人ではなく端末に属する設定）。",
      "**掃除は通信（`auth.signOut()`）の前に置いた。** 後ろだと、セッションが既に切れている等で例外になった時に掃除が丸ごと走らない。消しているのは入り直せば戻る情報だけなので、先にやって困らない。",
      "**【設計を1回やり直した・循環import】** 最初は「player-identity.js から掃除用の関数を online.js に登録してもらう」形にしたが、**検証で初期化前アクセス（TDZ）で落ちた**。`online.js → admin.js →（中継）→ player-identity.js → online.js（まだ評価中）`という経路があり、**player-identity.js の本体が online.js の `let` 宣言に届く前に走る**ことがある。登録方式をやめ、`signOut()` の中で**動的 import**（読み込みの輪に入らない）に変えて解決。**教訓: 登録してもらう方式は「登録する側が、登録先の変数の初期化より先に走らない」ことが前提。遠回りの循環があると崩れる。**",
      "検証（前後を同じ回で測るのでそのままA/B）: ログアウト前＝名前「テスト太郎」・アバター赤・本気解放済み true・3つのキーすべて在り → ログアウト後＝名前「プレイヤーA」（既定）・アバター protagonist（既定）・本気解放済み false・**3つのキーすべて null**・**端末の好みのキーは \"1\" のまま残っている**。例外0件。",
      "試遊パネルのログイン状態は、**実際のアカウントを作らずに**確かめた（HTTP の途中で `getCachedUser()` の戻り値だけ差し替え、リポジトリのコードは無改変）。未ログイン＝行は非表示・ボタンは「ログインしてすべてを使う」／ログイン中＝行が 321x37・実画面11.5px で出て（スマホの拡大規則にも入れた＝続き566 の再発防止）・ボタンは「アカウントの画面を開く」。メールは `getAccountDisplayLabel` が伏せた形で出る（ブースでも困らない）。",
      "**正直な限界**: 実際にログイン中に `?trial` を開くと、`maybeAutoAdvanceForLoggedInUser` が先にログインカードを出す（「ログイン中（○○）」と書かれている）ので、試遊パネルのこの行は**✕でカードを閉じて戻った時**に見えるものになる。パネル側に無かった情報を足した、という位置づけ。",
      "**試遊（ログイン無し）から不具合報告が送れなかったのを直した。** `so7_bug_reports` の INSERT ポリシーが `to authenticated` だけだったので、ログインを一切しない試遊の入口（?trial。trial-entry.js は URL を見るだけで認証に触らない）から送ると RLS に弾かれ「送信に失敗しました」としか出なかった。**10/17 のクラファンから来る人はまさにこの経路**なので、不具合に当たっても1件も届かない状態だった。`to anon, authenticated` に広げた（訪問記録 so7_visit_log は元から anon に開いている＝前例あり）。トレードオフは承知の上で開ける側に倒した——SELECTポリシーは無いので**書いた本人にも読めない**（情報は漏れない）／溜まっても管理者ダッシュボードの「全部対処済みにする」で畳める／戻すのは1語。**届かない方が痛い。**",
      "**効いたかどうかは「行を1つも作らない形」で確かめた。** わざと必ず失敗する中身を送り、返るエラーの種類で判定する——`42501`（ポリシーに弾かれた）／`23502`（ポリシーは通り、本文が空という別の理由で失敗）／`permission denied for table`（テーブルへの権限自体が無い＝GRANTの問題）。**RLS は NOT NULL より先に評価される**ことを、両方おかしい中身を送って目盛り合わせしてから読んだ。結果: 広げる前は ③が 42501 → 広げた後は **③が 23502**（＝ログイン無しの行がポリシーを通った）。①偽のIDは前後とも 42501 のままで、**何でも通る状態にはなっていない**ことも確認。",
      "**⚠ 私の手順ミス（記録）**: SQLを直して push したあと「全文を貼って実行してください」とだけ案内したが、**ユーザーが開く作業フォルダのファイルは worktree のものではなく main checkout のもので、push では更新されない**。1回目の実行は古いファイルで、何も変わっていなかった（上の検証で気づけた）。**SQLの実行を依頼する時は、変更した本文そのものをメッセージのコードブロックに貼る**（古いファイルを開かれても事故らない）。全文を案内するなら、先にユーザー側のファイルにその変更が入っているかを `grep` で確かめる。",
      "**ユーザー要望「トライアルも普通のもオープニング画面で、言語設定と全画面表示にするかと、ホームに追加してアプリとして起動するかなどの案内を入れたい」→「遊ぶ画面はホームに追加して全画面じゃないとプレイがしにくいのでマストです。言語、ホーム追加（アンドロイドは全画面）は最初にモーダルでしっかり案内しましょう」**。`src/opening-setup-modal.js` を新設し、試遊も通常も、タッチ端末なら最初に出す。",
      "**【調べて設計が変わった】主役を「全画面ボタン」ではなく「ホーム画面に追加」にした。** `isFullscreenSupported()` が見ているのは `requestFullscreen` の有無で、**iPhone の Safari はこれを持っていない**＝全画面ボタンは押しても何も起きない（コードにも「安全に no-op」と書かれていた）。iPhone で全画面にする唯一の方法が**ホーム画面に追加して、そこから開くこと**で、`manifest.json` に `display:standalone` / `orientation:landscape` が入っているので**全画面になり横向きに固定される**。だから全画面ボタンは**効く端末だけ**に出す。副産物として、#378「下に黒い余白が残る」は Safari の上下のバーの出入りが原因なので、ホームから起動すれば**あの症状自体が起きない**。",
      "**追加の仕組みは `pwa-install.js` と共有した**（`canPromptInstall` / `promptInstall` / `isIosDevice` / `onInstallAvailabilityChange` を新しく外へ出した）。同じ判定を2か所に書かない（続き549・552・557 と同じ考え方）。**`beforeinstallprompt` は遅れて飛んでくることがある**ので、来たら手順の案内から「1タップで追加」のボタンへ差し替わるようにした。",
      "**PCには出さない**（「ホーム画面に追加」という言い方が合わず、2026-09-05 に「スマホではないのにホーム画面への追加推奨モーダルが出ています」という報告を受けた轍を踏まないため）。出す条件はタッチ端末・ホームから起動していない・「もう出さない」を押していない、の3つで、全部このモジュールに閉じ込めた。",
      "**サウンドの初回設定モーダルと重ならないようにした**——同時に2枚出ると下のモーダルに触れない。`maybeShowOpeningSetupModal({ onClose })` で閉じてから続けて出す形にし、出さない場合も `onClose` は呼ぶ（呼び出し側が素通りできるように）。",
      "**検証（ヘッドレス・932x430・iPhoneのUA）**: ①モーダルが出て **419x362 で画面内**・実画面の文字は見出し16.1px／小見出し13px／説明11.5px／言語ボタン13px（高さ33px）／「このまま遊ぶ」11.5px（高さ30px）。**iPhone の条件を作るために Fullscreen API そのものを消して測った**（UAを偽っても Chromium は API を持っているので、消さないとこの分岐が測れない）→ 全画面ボタンは出ず、追加の手順3つが出る ②言語ボタンで見出しが英語に変わり、現在の言語の印も移る ③「このまま遊ぶ」で消え、**STARTを押して試遊メニューまで到達でき**（パネル321x302・「遊び方を教わる」321x46・CAMPFIREリンク208x28、すべて画面内）、モーダルの取り残しも無い ④「もう出さない」を押した端末では次から出ない ⑤PCでは出ず、サウンドの初回モーダルは従来どおり出る ⑥スマホの通常の入口では、案内→（閉じる）→サウンド の順で**1枚ずつ**出る。例外0件。",
      "**Android 側の分岐も実測**（Pixel の UA ＋ `beforeinstallprompt` を模して発火）: 合図の前は「メニューからの手順2つ＋全画面ボタン」→ 合図が来ると**「ホーム画面に追加する」ボタンへ差し替わり手順が消える** → 押すと OS の確認が1回呼ばれ、承諾で「もう出さない」に記録して閉じ、試遊メニューへ戻る。例外0件。",
      "**寸法は実画面のpxで測ってから決めた**（続き566・572 と同じ手順）。最初の実測で説明文が10.3px・「もう出さない」が9.6pxだったので、**説明文を短くしてから字を大きくした**（長いまま大きくすると縦に伸びて画面に収まらない）。結果 11.5px / 10.7px。",
      "**測り方のミス（記録）**: 「閉じた後に覆いが残っている」と出たが、**私のプローブの探し方が雑だっただけ**だった——`.so7-modal-backdrop` はデッキ一覧・マイページ・ヘルプ等の**非表示のパネルが元から持っている**ので、7個が常に居る。z-index で特定し直したら、自分の覆い（100060）は正しく消えていた。**「直っていない」と出たら、まず探し方を疑う**（続き560・579 と同じ形）。",
      "**申し送り（未着手・ユーザー判断）**: サウンドの初回設定モーダル（`first-run-bgm.js`）も**スマホ用の拡大規則が無い**ので、スマホでは文字が6〜7pxのままのはず（今回の案内モーダルの直後に出る）。試遊の入口からは出ないので 10/17 の人は見ないが、通常の入口で初めて遊ぶ人は見る。直すならCSSだけで済む。",
      "**ユーザー「スマホだと文字が小さいと感じるものが多くあります。総点検して！」**。**全部を実画面のpxで測ってから**直した（1600x900のステージを縮めて描くので、iPhone 横持ち=932x430 ではステージ倍率0.478＝**1rem が実画面7.6px**。CSSの0.85remは実画面6.5px）。目安は「読ませるもの13px以上／押すもの高さ28px以上／補助的な文字も11px以上」。**一律に rem を増やす方法は採れない**——盤面・ロックエリア・手札の寸法まで一緒に大きくなって崩れるため、部品ごとに `body.is-phone-device` / `is-tablet-device` の規則を足した（PCは一切変えていない）。",
      "**前後を同じ検査で測った**（`scratchpad/_c575check.mjs`。実画面px＋**はみ出し・画面外・重なり**まで見る）。結果: お知らせ **11px未満30件→0件**（最小5.5px→11.1px）／サウンドの初回設定 **9件→0件**（最小6.5px→11.5px、はみ出し・重なり0）／物語テロップ 5件→0件（7.6px→13px）／対局中の盤面 **18件→3件**、はみ出し4→1・画面外2→0・**重なり9→1**。主な数字: アイコンの下の文字5.0→11.1px／ターン・ラウンド5.0→11.1px／自分の名前6.5→11.5px／手札の枚数5.7→11.5px／「自分のターンです」6.1→12.2px／✕ 8.4→12.4px／「詳細」5.5→11.5px／お知らせの見出し8.8→18px。",
      "**自分で2つ不具合を作って、測って気づいて直した（記録）**: ①✕を3.2remにしたら**モーダルの見出しの箱に被る量が増えた**（11x11→21x11。見出し側は padding-right 1.6rem しか空けていないものが多い）→2.6remに抑えた ②自動送りのON/OFFバッジを大きくしたら**⏭アイコンの半分以上を覆った**（16x10）→小さくして丸の外へ出したら、今度は**下の「自動送り」の文字に乗った**（32x7）→**丸の上の角**へ移して決着（上には何も無い）。**「大きくする」は必ず「どこへ伸びるか」と一緒に考える。**",
      "**物語テロップは見立てを1回外した（記録）**: 字を大きくすると文章が高くなり、`@keyframes` の移動量 -160rem（＝文章の高さ85rem＋ステージ56.25remから決め打ち）では**上まで抜けきらなくなる**。最初は「横幅を広げれば行数が減って高さが戻る」と考えたが、**実測で幅60/70/76/82/90remのどれでも高さ156.3remのまま**＝**行が折り返していない**（高さ＝行数×行間）ことが分かり、見立ては外れだった。スマホ用の `@keyframes`（-216rem）を作って解決。**字1.7倍・距離1.35倍なので1秒あたりに流れる行数はむしろ減る**（2.0行/秒→1.59行/秒）＝読みやすくなる方向。",
      "**★ついでに見つけた罠: `max-height: 90vh` はスマホの実画面では43%しか無い。** `vh` はビューポート基準なのに、描かれる大きさにはステージ倍率（0.478）が掛かるため。ステージ基準の **rem**（ステージの高さ=56.25rem）で書くのが正しい。`max-height: Nvh` は style.css に**20か所以上**あり、**今回触った2つ（サウンドの初回設定・スタートプレイヤー決定）だけ rem に直した**。残りは未対応。",
      "**管理者モードのつまみを壊さないようにした**: `--turn-round-counter-font-size` と `--match-intro-seat-size` はPC用の値なので、スマホ用に別の変数（`-phone`）を用意し、**admin.js にもスマホ用のつまみを足した**。単に body 側で上書きすると、管理者が調整した値をスマホでだけ黙って無視することになる（続き570 の「既定を変える時に人の設定を踏まない」と同じ考え方）。",
      "**inline style の文字サイズはクラスへ移した**（`game-setup.js` のスタートプレイヤー発表の見出し・本文）。inline style は CSS から `!important` 無しに上書きできないため。幅と高さの上限は `buildSimpleModal` が cssText で当てているので、そこだけ `!important` で上書きしている（幅は実画面153px→**min(56rem,94vw)**）。",
      "**まだ見ていない画面がある（正直な限界）**: 今回測ったのは オープニング／試遊メニュー／起動時の案内／物語テロップ／対局中の盤面／基本設定／お知らせ／サウンドの初回設定／「今回のメンバー」／スタートプレイヤー決定 まで。**ホーム画面・マイページ・ショップ・ヘルプ・デッキ構築・ランキング・戦績・オンラインのロビー・各カード効果のモーダルは未点検**で、同じ病気の可能性が高い。",
      "**直さないと決めたもの（判断の記録）**: ①**盤面のカードの文字**（実測1.1〜2.6px）＝長押しで拡大して読む設計で、大きくすると札の中に収まらない（拡大サイズの上限は続き563 で52remまで広げてある）②**左上の題字**（7.3px）＝装飾で読む必要がない。③自動送りのON/OFFバッジ（7.6px）と⏭（9.2px）は、**枠の色（緑=ON／赤=OFF）でも分かる**ので「読めれば十分」の位置づけ。",
      "**⚠ 測り方を間違えていた（今回いちばん大事）。** 続き575 では「実画面px = CSSのfont-size × ステージ倍率(0.478)」で測っていたが、**パネル自体がさらに transform で拡大されている場合を見落としていた**。正しくは **実画面px = CSSのrem × 16 × 実効倍率**、実効倍率は **`getBoundingClientRect().width / offsetWidth`**（ステージ倍率と途中の transform を全部含む）。この式で測り直すと: ヘルプのパネルは**元から2倍**（倍率0.956）で文字は12.6〜16px＝**直す必要が無かった**／α版のお知らせは倍率0.861で見出し17.2px・本文11.3px＝**十分だった**／マイページの名前は倍率1.44で12.2px＝**十分だった**／フェイズ案内板は倍率1.0（＝2.1倍）で文字10.5px＝**十分だった**／自席の名前は倍率0.836で11.4px＝**ほぼ足りていた**。",
      "**その結果、続き575 で一部を作りすぎていた**（ヘルプの題32.1px・マイページの名前36.8px・案内板の文字23.2px・自分の名前20.1px 等）。**全部戻した**。戻した後の実測: 対局中の盤面は22px超0種／ヘルプ0種／お知らせ0種／α版0種／ホーム画面0種。",
      "**本当に小さかったのはホーム画面だった**（倍率0.478＝拡大なし。13種のうち**12種が11px未満**）。「次にやること」5.4px／説明6.0px／NEW 6.9px／「ホーム」6.9px／「対戦する」7.3px／タイルの名前7.6px／「ホーム画面に追加」の案内6.1px。全部12〜14pxへ。**11px未満 12種→0種**。",
      "**教訓: 同じクラスでも入れ物の倍率が違えば見え方が違う。** アイコンの下の文字（`.icon-action-button-caption`）は**オプションエリア（倍率0.477）とフェイズ案内板（倍率1.002）の2か所**に出てくる。一律に1.45remへ上げたら案内板側だけ23.2pxになった。案内板の中だけ元へ戻した。モーダルの ✕ も同じで、ヘルプの中だけ元に戻した。**共通クラスを触る時は、そのクラスが出てくる場所を全部測る。**",
      "**「はみ出し」が出たらまず元の値でも出るか試す（記録）**: ホームのタイルの名前が `scrollHeight > clientHeight` で8個中8個はみ出していたが、**A/Bで文字を元の1remに戻しても8個中8個で出た**（21>19。1.5remで61>58、1.8remで74>69＝倍率に比例するだけ）。行の高さの丸め誤差で、私の変更のせいではなかった。行間を詰める対策を入れたが効かず、無意味な規則になるので撤去した。",
      "**まだ直していない（申し送り）**: ①マイページの「マイページ」「ログインする」等は **inline style で font-size を書いている**ため CSS から上書きできない（JS側を直す必要がある。実測6.5px）②**ショップ・デッキ構築・ランキング**はログインが要るので今回も開けず未点検③`max-height: Nvh` の罠（続き575 の★）は20か所以上残っている。",
      "**測り方の道具**: `scratchpad/_c576fix.mjs` が正しい式で測る版。画面を足す時はここに `run(名前, 準備, ルート)` を足す。",
      "マイページは**パネルの大きさと文字サイズが `my-page.js` の inline style に書かれていた**ため CSS から上書きできなかった（`!important` を使わない限り）。`#my-page-panel` の見た目を **style.css へ移した**（PCの値は一字も変えていない）。`display: none` だけ inline に残す——開閉が `style.display` の書き換えで行われているため。中の行が持っていた `font-size: 0.85rem` はパネルと同じ値なので外して継承させた。",
      "**⚠ パネル全体の font-size を上げてはいけなかった（記録）**: スマホ用に `#my-page-panel { font-size: 1.6rem }` としたら、**中の「元から拡大されている部分」が巨大化した**（名前が実画面36.8px・説明が23px）。マイページは部分ごとに実効倍率が違う（0.478／0.726／0.899／1.438）ので、**継承で一括して上げると拡大済みの所が壊れる**。小さいのは拡大されていない題名だけだったので、そこだけクラスを付けて個別に上げた。結果 11px未満0種・22px超0種。",
      "**残っている問題（ユーザー判断待ち）**: マイページの「🎨 着せ替え」の見出しと「ランク戦の段位」の行が**スマホで重なっている**。**A/Bで確かめたところ、文字を元の大きさに戻しても重なりは出る**（元から2件、私の拡大で1件増えて3件）。元からこの辺りの配置が崩れているので、直すなら**この区画の並べ方そのものを作り直す**話になる（文字サイズの調整では解けない）。",
      "**#402「ホーム画面がスクロールするようになっちゃった、多分文字大きくした影響です」——そのとおりだった。** A/B実測: 中身の高さ 930（見える高さ900＝はみ出し30）→ 続き576 の拡大後 **1054（はみ出し154）**。内訳（ステージpx）は 見出し38＋副題38＋「次にやること」171＋タイル668＋案内バー275で、**タイルが+147**と最大。**文字は小さく戻さず、縦の余白で取り返した**（読みやすくするのが目的なので、そこを戻したら元の木阿弥）: 画面の上下余白 2rem→0.8rem、タイルの間隔 1.6→0.9rem、タイルの絵 5.5→4rem、タイルの名前 1.8→1.55rem、「ホーム画面に追加」の案内バーの余白と文字。結果 **中身900／見える900＝はみ出し0・スクロールしない**。",
      "**`flex-wrap: nowrap` は逆効果だった（記録）**: 案内バーを1行に収めようとして付けたら、**文字の箱が細くなって何行にも折り返し、179→275（ステージpx）に増えた**。折り返しは許したまま字を抑える形に戻した。**「1行にしたい」からといって nowrap を付けると、幅が足りない時は縦に伸びる。**",
      "**#403「こういった中央のモーダル、スマホだと文字小さいかも！」**（画像つき）。`.effect-reason-modal`（main.js の showEffectReasonModal）で、名前0.75rem＝実画面5.7px・本文0.8rem＝6.1px・幅 min(20rem,80vw)＝**実画面153px**だった。幅 min(60rem,92vw)・名前1.5rem・本文1.6rem へ。実測 **410x80で画面内・名前11.5px・本文12.2px**。対局中にしか出ないモーダルなので、**同じクラスの箱を自分で作って測った**（CSSの効き方を見るのが目的なので十分）。",
      "**#400「不具合ボタン横の全画面表示ボタンが消えてるけどなんでだっけ？」——不具合ではない。** `initFullscreenToggle` は `isFullscreenSupported()` が false の環境では**ボタンを作らない**（押しても何も起きないボタンを常設しないため）。**iPhone の Safari は Fullscreen API を持たない**ので、iPhoneでは元から出ない（PC・Androidでは出る）。iPhoneで全画面にする唯一の方法は**ホーム画面に追加して、そこから開く**こと（続き574 の案内モーダルがこれを案内している）。報告の画面の状態でも、押せるボタンの一覧に全画面が無いことを確認した。",
      "**この報告は「今の画面の状態」（続き572）が初めて実戦で効いた回**。#400 と #402 に `screen2` が入っており、押せるボタンの一覧・覆いの一覧・ステージ倍率がそのまま読めた。**#400 は `?trial` から未ログインで届いており**（続き572 の SQL 変更が実際に効いていることの確認にもなった）、**#400 の画面は 932x320・ステージ倍率0.356**だった——**倍率0.478（932x430）で合わせた文字は、Safariのバーが出ている時は25%小さく見える**という材料も取れた。",
      "**司令塔の依頼（ユーザー承認済み）**: `so7_public_counts()` に `trialToday` / `trialVisitsToday` を足した。`loginsToday` は `user_id is not null` で数えるので**登録せずに遊べる試遊の人が全員落ちていた**（「今日0人」の原因）。材料は `so7_visit_log.source`（続き517）。**返すのは数だけでタグの内訳は返さない**——この関数は公開鍵で誰でも呼べるので出す情報は最小限にする。「今日」の切り方は既存の2つと同じ日本時間0時。**`supabase_setup_so7.sql` の変更なので手動実行が必要。**",
      "#401「ホームに追加した時のこの画像ってセブンのロゴに変えれる？」→「セブンのロゴをアプリアイコン用にアレンジしてみて！」→**「Aで私に位置サイズ調整させて！」**。ユーザーから背景透過のロゴ（1200x1200）を受け取り、**位置・大きさ・背景色をその場で動かせる調整画面**（`scratchpad/icon-tool.html`。ロゴをファイル内に埋め込んであるので開くだけで動く）を渡して決めてもらった。決まった値は **大きさ125%／左右-3.5／上下-4.5／背景はクリーム色#fbf8f1**（濃紺も作って見比べ、ユーザーがクリーム色を選んだ）。書き出しは調整画面と**まったく同じ式**で計算している（見本と出来上がりがズレないように）。`app-icon-512/192` と `apple-touch-icon-180` を差し替え、**URLに `?v=2` を付けた**（絵だけ替えるとブラウザが古いものを使い続けるため）。",
      "**作る前に2回失敗して方針を変えた（記録）**: ①og-image.jpg から切り出す案——紋章の左に小さな英字が重なっており、正方形に切ると必ず何かが切れるか要らないものが入った ②「紙の白を彩度で抜いて濃紺に載せる」案——**紋章の細い金の線と内側の目盛りまで消えて壊れた紋章になった**（薄い金は白地との彩度差が小さく抜きの対象に入る）。**背景透過の元データをもらうのが正解だった。** 素材の切り出しで粘る前に、元データがあるか聞く。",
      "**ブラウザのタブのアイコン（favicon）は7色の玉のまま**にした（index.html にインラインSVGで書いてある）。16〜32pxでは紋章は潰れるので、玉の方が向いている。",
    ],
    devItemsEn: [
      "#391: the serious Eidos battle started with the wrong lock area when blank boost cards were on. APPLY_SEAT_NOIR converts every card whose id starts with first- in that seat lock area into the noir card, and boost mode places first-blank-colour cards either side of the real first card, so those were converted too. Measured with the story-battle arguments and boost on, there were three noir cards at indices 0, 1 and 6, and because noirIndex ended up as the last one found, the two brands were placed around the wrong slot, leaving a brand stacked on a noir at index 0. The fix converts only the real first card, excluding first-blank-, and removes the boost blanks from that seat, which is what the owner described as correct. Seven-colour counting is unaffected, since all of those cards were placed markers that are not counted. Verified with boost both on and off: one noir with one brand on each side.",
      "This had previously been closed as working-as-intended, which was wrong: the reproduction had boost switched off, so it produced the correct arrangement and did not match what the owner was seeing. Where a setting changes how many cards are placed, try the setting both ways. The second report spelled out the correct arrangement, which is what revealed that the reproduction differed from the real game.",
      "#390: switching the language felt unresponsive. Measured on a phone-sized viewport, the first switch costs 1085ms of synchronous work and 1293ms to paint; later switches are 180-200ms. The key point is that setLang is synchronous, so the browser cannot paint a single frame while it runs - adding a notice alone would never show it. The notice is now placed, the browser is given a frame to paint it, and only then does the switch start. Both user-facing entry points, the opening screen button and the options selector, go through one shared function; the automatic restore from the account is excluded because nobody pressed anything. The text is shown in both languages, since mid-switch there is no right language to choose, and a finally block plus an eight-second hard removal keep it from being left behind. Verified by pressing the real button: the notice is visible from 76ms through 1520ms and then gone, with the language changed.",
      "A missing import happened again: the new shared function was used in two files without importing it, and the undeclared-symbol check reported zero problems, because it does not look at imports. Caught by grepping. When using a function from another file for the first time, check the import line by eye.",
      "At the owner's decision to turn the showy presentation on, two defaults changed, because from 17 October people arriving from the crowdfunding page would otherwise play with everything plain: the cinematic camera level goes from off to key-moments-only, and board lighting is on when nothing has been stored. The brightness default stays at the value the owner chose on a real device.",
      "It is deliberately not set to \"all\": that level also moves the camera on ordinary moves, which happen at least once per turn, making it noisy, and a move you made yourself carries no information to reveal. Key-moments-only covers tackles, effect-driven moves, gate invasions, completed locks and the final colour.",
      "The implementation detail that matters: reading the lighting flag as equal to \"1\" cannot express a new default, but simply inverting it would also ignore an explicit off from someone who turned it off. Only the unset case became true, and a stored zero is still respected. Verified across three cases: an untouched device gets key-moments plus lighting, with ordinary moves left alone; a device that turned both off keeps them off; and a device set to all keeps all. The smoke test also passes with both features on.",
      "A note for later: lighting was originally left off because of the iPhone heat report. The owner decided to enable it after trying it on a device, but if heat becomes a problem, returning the unset case to false is a one-line change. Worth watching if it runs for hours at the booth.",
      "At the owner's suggestion to add a \"tell us what is on screen\" feature next to the image attachment. The deciding call was to make it text rather than an image: image attachments sometimes fail outright (#376 is still open and all seven reports on 10/5 lost theirs) and the trial entry has no login, so it cannot upload to Storage at all. Text travels inside the report body, so it always arrives. The fields were chosen to be exactly the ones that would have settled #369, #389 and #391 in one pass.",
      "The snapshot is taken when the report dialog opens, not when it is sent, because the dialog itself covers the screen being reported. A check confirms the dialog does not appear in its own layer list, and agoMs records how old the snapshot is.",
      "context.screen2 holds: the viewport and stage scale and orientation, the visible top-level layers sorted by z-index (found by walking the body children rather than by hard-coded names, so new dialogs are picked up automatically), turn and phase and priority and pending approvals, counts of highlighted candidates, whether the board actually drew (WebGL quad count plus whether CSS artwork is stripped), and the labels of the buttons currently on screen. No card contents or names.",
      "Verification intercepted the outgoing request and read the payload instead of letting it reach the live database. The option is on by default and on screen, the payload is about 1800 characters, unchecking it removes the field, and no exceptions were raised.",
      "Found and fixed along the way: the report dialog itself was unreadable on a phone. Measured at a phone-sized viewport, its send button rendered at 6.9 real pixels of text and 19 pixels tall. Phone-specific rules now roughly double every part of it, and the dialog grew from 260x249 to 419x362 while still fitting on screen.",
      "Still open, awaiting a decision: reports cannot be sent from the trial entry, because the insert policy only allows signed-in users. Widening it to anonymous would fix it but would also let anyone with the public key write rows, so it was left for the owner to decide.",
      "Image attachment is now shown as sign-in-only, since the storage bucket can only be written to by a signed-in user into their own folder.",
      "A duplicated assignment in the failure path of the report dialog was cleaned up.",
      "The owner asked whether this information is stored per device rather than per account: it is. Names, avatars and story progress live in localStorage with the account layered on top, and logging out cleared none of it, which is why the trial showed the previous name and started the serious Eidos battle.",
      "Moving everything to the account was rejected: trial players have no account, so nothing would be saved for exactly the people arriving on 10/17. What was missing was the boundary, so logging out now clears the personal data from the device. Nothing is lost because all three live on the account too, and the story flow always merges the account copy before reading or writing flags. Device preferences such as volume and theme are deliberately left alone.",
      "The cleanup runs before the network sign-out call, so a failing call cannot skip it.",
      "The design was reworked once: registering a cleanup callback from the identity module hit a temporal-dead-zone error because an indirect import cycle lets that module run before the registry variable is initialised. A dynamic import inside the sign-out function avoids the cycle entirely.",
      "Verified before and after in the same run: the stored name, avatar and progress were in effect, then all three keys were gone and the values fell back to defaults, while a device preference key survived untouched.",
      "The signed-in state of the trial panel was verified without creating a real account, by substituting only the cached-user getter at the HTTP layer and leaving the repository code untouched.",
      "An honest limit: when actually signed in, the login card appears first, so this new line is what you see after dismissing that card and returning to the trial panel.",
      "Reports can now be sent without signing in. The insert policy only allowed signed-in users, so the trial entry — which never authenticates, and is exactly the route crowdfunding visitors take — could not report anything. The policy was widened to anonymous as well, matching the visit log. The table still has no select policy, so nothing became readable.",
      "Whether it took effect was verified without creating a single row, by sending deliberately invalid payloads and reading the error codes, after first calibrating that row-level security is evaluated before not-null constraints. Before the change an anonymous row was rejected by the policy; afterwards it got as far as the empty-body error, while a row with a forged user id is still rejected.",
      "A process mistake of mine: after committing the SQL change, the instruction to paste the whole file was wrong, because the file the owner opens lives in the main checkout and a push does not update it. The first run used the old file and changed nothing. Future SQL requests should include the changed statements inline.",
      "At the owner's request, a first-run modal now covers language and adding the game to the home screen, on both the trial and the normal entry, for touch devices.",
      "The design changed after checking the facts: iPhone Safari has no Fullscreen API, so a full-screen button there does nothing. The only way to get full screen on iPhone is launching from a home-screen icon, which the manifest already makes full screen and landscape-locked. The full-screen button is therefore only offered where it works.",
      "The install machinery is shared with the existing home-screen banner rather than duplicated, and a late-arriving install signal swaps the manual steps for a one-tap button.",
      "It is never shown on desktop, where the wording does not apply, and the showing conditions are all contained in the new module.",
      "It is sequenced with the existing first-run sound modal so only one dialog is ever open.",
      "Verified headless at a phone viewport, including measuring every element in real screen pixels, the iPhone branch with the Fullscreen API removed, the language switch, reaching the trial menu afterwards, the never-again option, desktop skipping, and the ordering with the sound modal.",
      "The Android install branch was verified by simulating the browser's install event: the manual steps are replaced by a one-tap button, which calls the OS prompt once and closes on acceptance.",
      "Sizes were set by measuring, not guessing: the explanation was shortened before enlarging it, because enlarging the long version pushed the dialog past the screen height.",
      "A measurement mistake of mine: a leftover backdrop appeared to remain, but the selector was matching the hidden backdrops that several panels keep in the DOM at all times.",
      "Noted for later: the first-run sound modal has no phone-specific sizes either, so its text is still tiny on a phone.",
      "At the owner's request for a full audit of small text on phones, every item was measured in real screen pixels first: the stage is scaled to 0.478 on a landscape iPhone, so 1rem renders as 7.6 real pixels. A global rem increase is impossible because the board and hand dimensions would grow too, so per-component phone rules were added and the desktop layout is untouched.",
      "The same check was run before and after, covering real pixel sizes plus overflow, off-screen and overlap detection. The news page went from 30 items under 11px to none, the first-run sound dialog from 9 to none, the opening crawl from 7.6px to 13px, and the in-game readouts from 18 to 3, with overlaps falling from 9 to 1.",
      "Two regressions were introduced and then caught by measuring: enlarging the close button made it cover more of dialog titles, and enlarging the auto-advance badge first covered the icon and then the label below it, so it was moved to the top corner.",
      "The opening crawl needed its scroll distance rebuilt: a first guess that widening the column would restore the height was wrong, because the lines do not wrap at all.",
      "A systemic trap was found: a vh-based max-height renders at only 43% of the screen on a phone, because vh is viewport-based while the rendered size is scaled. Only the two dialogs touched here were converted to rem; over twenty other places remain.",
      "Admin sliders were preserved by adding separate phone variables and matching sliders rather than silently overriding the tuned desktop values.",
      "Inline font sizes in the start-player announcement were moved to classes so CSS can override them without !important.",
      "An honest limit: the home screen, my page, shop, help, deck builder, rankings, stats and lobby were not audited and likely share the same problem.",
      "Deliberately left alone: the card face text, which is meant to be read by long-pressing to enlarge and would not fit if grown, and the decorative title in the corner.",
      "The measurement method itself was wrong in the previous pass: it multiplied the CSS font size by the stage scale only, ignoring that several panels are additionally transformed. The correct effective scale is the bounding rect width divided by the offset width.",
      "Re-measuring showed the help panel, the alpha notice, the My Page name and the phase guide bar were already large enough, so the previous pass had pushed some of them to 20-37 real pixels. All of those were reverted.",
      "The screen that genuinely needed work was the home screen, with twelve of thirteen distinct text styles under 11 real pixels. All are now 12-14.",
      "A lesson: the same class can render at different sizes depending on the transform of its container, so a shared class must be measured everywhere it appears.",
      "An overflow that looked like a regression turned out to exist at the original size too, confirmed by an A/B at three font sizes.",
      "Still open: My Page sets some font sizes inline so CSS cannot override them, the shop, deck builder and rankings need a login to measure, and the vh-based max-height trap remains in over twenty places.",
      "The corrected measuring probe lives in the scratchpad; new screens are added to it as one more entry.",
      "My Page had its panel size and font size written as inline styles, which CSS cannot override, so the panel's appearance was moved into the stylesheet with its desktop values unchanged.",
      "Raising the panel's font size turned out to be wrong: parts of My Page are additionally transformed, so inheritance pushed those to 23-37 real pixels. Only the unscaled title needed its own rule.",
      "Still open for a decision: the cosmetics heading and the rank rows overlap on a phone, and an A/B confirmed the overlap exists at the original font sizes too, so fixing it means reworking that section's layout rather than adjusting text sizes.",
      "The home screen had started to scroll because the previous pass enlarged its text; measured before and after, the content grew from 930 to 1054 against a 900 viewport. The space was reclaimed from vertical padding, tile spacing and the tile icon rather than by shrinking the text back, and the screen now fits exactly.",
      "Setting the install banner to nowrap backfired: squeezing the text into a narrow box made it wrap onto more lines and grow taller.",
      "The effect explanation panel shown in the middle of the screen was 6 real pixels of text in a panel a sixth of the screen wide; it is now 12 pixels in a panel that fits comfortably.",
      "The missing full-screen button on iPhone is not a bug: iPhone Safari has no Fullscreen API, so the button is deliberately not created there, and adding the game to the home screen is the way to get full screen.",
      "This round was the first real use of the screen snapshot feature: two reports carried it, one of them sent from the trial entry without a login, which also confirmed the database change works in the wild.",
      "At the owner's approval, the public counts function now also returns the number of trial-entry visitors today, since the existing login count excludes anyone playing without an account.",
      "At the owner request to arrange the logo into an app icon and then to let them adjust it themselves, a small self-contained tool with sliders was handed over, and the chosen values were applied with the same formula the tool previews with. The three icon files were replaced and their URLs versioned so browsers fetch the new art.",
      "Two earlier approaches were abandoned: cropping from the social share image always included stray parts of the wider lockup, and keying the white paper out destroyed the thin gold lines of the emblem. Asking for the transparent source was the right move.",
      "The browser tab favicon keeps the seven dots, which read better at 16 to 32 pixels than the detailed emblem.",
    ],
  },
  {
    date: "2026-10-08",
    summary: [
      "試遊ページから、クラウドファンディングのページへ行けるようにしました",
      "起動中に「読み込み中」を出すようにしました",
    ],
    summaryEn: [
      "The trial page now has a link to the crowdfunding page",
      "A loading screen now appears while the app starts up",
    ],
    items: [
      "登録なしで遊べる**試遊ページ**のメニューに、**クラウドファンディングのページを見る**リンクを足しました。これまでは試遊ページに来ると、ブラウザの「戻る」以外で戻る道がありませんでした。リンクは別のタブで開くので、遊んでいる途中でも試遊ページはそのまま残ります。",
      "アプリを開いた直後に**「読み込み中…」の画面**が出るようになりました。これまでは最初の読み込みが終わるまで**画面が真っ黒なまま**で、初めて開く方には「壊れている」ように見えていました（実測で、何も出ない時間が**7.7秒**ありました）。「最初の読み込みに10秒ほどかかることがあります」という案内も添えています。読み込みが終わると自動で消えます。",
    ],
    itemsEn: [
      "The menu on the trial page - the one you can play without signing up - now has a link to the crowdfunding page. Until now, once you arrived on the trial page there was no way back except the browser's Back button. The link opens in a new tab, so the trial page stays where it is even mid-game.",
      "A loading screen now appears as soon as the app is opened. Until now the screen stayed black until the first load finished, which looked broken to anyone opening it for the first time - measured, there were 7.7 seconds with nothing on screen. A note explains that the first load can take about ten seconds. It disappears on its own once loading finishes.",
    ],
    fixes: [
    ],
    fixesEn: [
    ],
    devItems: [
      "試遊ページ（`?trial`）の試遊パネルの末尾に、CAMPFIRE へ戻るテキストリンクを1本足した（`opening-trial-cf` ／ i18n `trial.campfire`）。**クラファンのページ側から試遊ページへのリンクは先に入っていて、こちらから戻る道が1本も無かった**（2026-09-08 に「体験版の画面にはCAMPFIREへ戻るリンクを必ず置く」と決めてあったのに実装が漏れていた）。凝ったものは不要という判断なので、ボタンにはせず**控えめなテキストリンク**にして「遊ぶ」導線の邪魔をしない。`target=\"_blank\"` ＋ `rel=\"noopener noreferrer\"`。言語切替で文字が入れ替わるよう `trialTexts` にも登録した（ここに入れ忘れると日本語のまま固まる）。文字色は決め打ちせず周りから継ぐ（明暗2テーマがあるため）。",
      "**URLは日付で自動的に切り替える**ようにした（`campfireProjectUrl()`）。CAMPFIRE はアイデア公開中が `/idea`・本公開後が `/view` で、**どちらを指すかで公開前に押した人が404を見るかが決まる**。実際に確かめたところ **`/idea` は 200・`/view` は 404**（2026-10-08 時点）だったので、`/view` を決め打ちすると公開日まで9日間ずっと死んだリンクになる。公開日に人が差し替えるのを忘れると事故になるので、**2026-10-17 の0時を境に自動で切り替える**形にした。端末の時計が狂っていても行き先はどちらか一方の正しいURLに収まる。延期・前倒しがあれば `LAUNCH` の1行だけ直せばよい。",
      "検証（ヘッドレス・報告者と同じ 932x430）: `?trial` でリンクが**1本だけ**出て、見えていて画面内にある／**公開前は `/idea`**／**時計を 2026-10-17 09:00 に進めると `/view`**／`target` と `rel` が付いている／英語では「▸ View the crowdfunding page」になる。例外0件。`npm test` 63/63 PASS、`check-undeclared` 0件、smoke PASS、CSSブレース平衡。",
      "【公開直後に直した】本番で実際に描いて測ったら、**このリンクだけスマホ用の拡大から漏れていた**。この画面はスマホでは「小さい説明文を隠して、ボタンと見出しを指で押せる大きさに拡大する」作りになっている（1remが実画面で7px前後にしかならないため）。実測で、遊ぶボタンは文字19.1px・高さ46pxに拡大されるのに、**リンクは文字6.3px・高さ10px**のままだった。10/17の公開で支援者候補が通る導線なので放置できない。`body.is-phone-device` 側に 1.7rem＋余白を足し、**文字13px・高さ28px（幅208px）**にした（ボタンより控えめ・押せる大きさ）。PCは従来どおり（文字10.5px）。",
      "**教訓**: 新しい部品をこの画面に足す時は、`body.is-phone-device` の拡大ルールにも入れる。入れ忘れると**PCでは普通に見えるのにスマホだけ読めない**という、気づきにくい形になる（#389 で「画面最上部の17pxの帯」を問題にしたのと同じ寸法だった）。",
      "切り替えの時刻を **0時 → 正午**へ遅らせた（司令塔の指摘）。本公開は 10/17 の**朝7時台**の予定なので、0時で切り替えると**朝まで約7時間 `/view` が404のまま**になる。実測でも、裸の `/projects/967235` は301で `/view` に落ちるため、**どちらの状態でも生きるURLは無い**。しかも**間違える向きが対称ではない**——早すぎれば「支援したい人がいちばん熱いときに404で弾かれる」が、遅すぎても「公開後に古いアイデアのページへ着く」だけで済む。だから遅めに倒す。公開予約の画面はCAMPFIREの審査通過後にしか出ない（10/5提出・承認待ち）ため、7時台に本当に設定できるかも確定していない＝その不確かさも正午で吸収する。検証: 10/17 06:00 と 11:59 は `/idea`、12:00 と翌日は `/view`（時計を進めて実測）。",
      "切り替えの時刻が **10/17 10:35** で確定（正本 `共通の事実.md` 第14節が更新され、公開は **10/17（土）10:30**＝2026-10-07 の本人決定。本人の言葉「時間は10:30でいい。問題があれば11時までに対処」）。そこに**5分の余裕**を足した値で、根拠はCAMPFIREの自動公開が1〜2分遅れることがあるという正本の記録。0時→正午→10:35 と2回動かしている。検証: 時計を進めて **10:29・10:34 は `/idea`、10:35・11:00・翌日は `/view`**。",
      "**食い違いの正体（記録）**: 司令塔2つが逆のことを言い、正本にも 10:30 が無い状態が一時あった。原因は**2つの別の話が混ざっていた**こと——「**何時に公開するか**」は 10/07 に決定済み、「**CAMPFIREの予約画面にその時刻を入力できるか**」は審査承認待ちで未了。後者を指して「まだ決まっていない」と言われたため、前者も未確定だと読めてしまった。加えて、最初の「朝・7時台」は正本の「**7時台の開始は問題なく設定できます**」（＝設定できるかという**可能性**の話）を**決定として読んだ**誤りだった。**自分で正本を grep して「10:30 は0件」と確かめ、どちらにも寄せずに両方へ照会したのが効いた**（事実は正本だけに置き、食い違いは司令塔へ上げる運用）。",
      "**起動中の「読み込み中」画面を入れた**（`index.html` 内に、インラインのCSS＋スクリプトで完結）。実測（本番・iPhone横持ち相当）で**画面が完全に真っ白なまま7.7秒**かかっていた——HTML自体は2.5秒で使える状態になるが、**191個のファイル**を読み終えてオープニングが組まれるまで何も出ない。10/17にクラウドファンディングから来た人が最初に見るのがこれなので、**何も出ないと「壊れている」と判断されて閉じられる**。**置き場所が肝**: `src/*.js` のモジュールに書くと**そのモジュールが読み終わるまで出ない**（＝遅れている当のものを待つことになる）ので、`index.html` に直接書いた。",
      "**絶対に取り残さないための三重の保険**: ①`pointer-events: none`＝万一消えなくても操作を邪魔しない ②オープニングか盤面の中身が出たのを0.12秒ごとに見て消す ③それでも消えなければ**25秒で強制的に消す**。検証: 出てから消えるまでを追い、**1.7秒で出て・6.6秒でオープニングが出た直後に消え・DOMから除去され・`pointer-events` は none**。例外0件。",
      "**残っている穴（正直な限界）**: 真っ白な時間は**全部は消せていない**。`<head>` に**ブロッキングの外部スクリプト2本**（Tailwind CDN・Supabase UMD）と `src/style.css` があり、本文が描かれるのはそれらの後なので、**最初の1〜2秒はまだ黒いまま**。消すには読み込み方を変える（`defer` 等）ことになり、見た目の崩れや初期化順の事故が起きうる**別の変更**なので、クラファン直前にはやらない。読み込み自体の短縮（191個のうちオープニングに要らない絵を後回しにする）も同じ理由で**クラファン後**に回す。",
    ],
    devItemsEn: [
      "A single text link back to CAMPFIRE was added at the end of the trial panel on the trial page (?trial). The crowdfunding page already linked to the trial page, but there was no way back at all, even though it had been agreed in September that the trial screens must carry a link back to CAMPFIRE. Nothing elaborate was wanted, so it is a quiet text link rather than a button, to avoid competing with the play options. It opens in a new tab with noopener noreferrer, and it is registered with the language-switch list so its text changes with the language; its colour is inherited rather than hard-coded, because the app has light and dark themes.",
      "The URL switches automatically by date. CAMPFIRE uses /idea while a project is in idea stage and /view once it launches, and which one is linked decides whether someone clicking before launch sees a 404. Checking directly showed /idea returning 200 and /view returning 404 as of 8 October, so hard-coding /view would have meant a dead link for nine days. Relying on a person to swap it on launch day is the kind of thing that gets forgotten, so the link switches on its own at midnight on 17 October. A wrong device clock still lands on one of the two valid URLs, and a change of date needs only the one LAUNCH line edited.",
      "Verified headless at 932x430: exactly one link appears on ?trial, visible and within the viewport; before launch it points at /idea; moving the clock to 17 October 09:00 makes it point at /view; target and rel are set; and in English it reads \"View the crowdfunding page\". No exceptions.",
      "Fixed right after publishing: rendering the live page and measuring it showed that this link alone had been left out of the phone-specific sizing. On phones this screen hides the small description lines and enlarges the buttons and headings so they can be tapped, because one rem is only about seven screen pixels here. Measured, the play button scales to 19.1px text at 46px tall while the link stayed at 6.3px text and 10px tall. Since this is the path supporters will take from 17 October, it could not be left that way: the phone rule now gives it 1.7rem plus padding, which measures 13px text at 28px tall and 208px wide - quieter than the buttons but large enough to tap. The desktop size is unchanged at 10.5px.",
      "The lesson: anything new added to this screen has to be added to the is-phone-device sizing rules as well. Leaving it out produces the awkward case where it looks fine on a desktop and is unreadable only on a phone - the same dimensions that were the complaint about a 17-pixel strip at the top of the screen in an earlier report.",
      "The switch moved from midnight to noon, at the commander's prompting. The launch is planned for the 7 o'clock hour on 17 October, so switching at midnight would leave /view returning 404 for about seven hours of that morning. Measured, the bare project URL also redirects to /view, so there is no single URL that works in both states. The two failure directions are not symmetric either: switching too early turns supporters away with a 404 at the hottest moment, while switching too late merely lands them on the older idea page. Hence erring late. The scheduling screen only appears after CAMPFIRE approves the project, which was submitted on 5 October and is still pending, so even the 7 o'clock plan is not certain - noon absorbs that uncertainty too. Verified by moving the clock: 06:00 and 11:59 on 17 October give /idea, while 12:00 and the following day give /view.",
      "The switch time is settled at 10:35 on 17 October. The shared facts file now records the launch as 10:30 on Saturday 17 October, decided by the owner on 7 October in their own words. Five minutes of margin are added because the facts file notes that CAMPFIRE's scheduled publishing can run one or two minutes late. The value has moved twice: midnight, then noon, now 10:35. Verified by moving the clock: 10:29 and 10:34 give /idea, while 10:35, 11:00 and the next day give /view.",
      "What the disagreement actually was: two commanders said opposite things and the facts file carried no 10:30 for a while, because two separate questions had been conflated - what time to launch, decided on 7 October, versus whether that time can yet be entered into CAMPFIRE's scheduler, which waits on approval. A remark about the latter read as though the former were unsettled. On top of that, the original \"7 a.m.\" came from reading a line about whether 7 a.m. could be set - a statement of possibility - as though it were the decision. Grepping the facts file directly, finding zero hits for 10:30, and querying both commanders rather than picking a side is what resolved it: facts live in the shared file, and discrepancies go up to the commanders rather than being patched locally.",
      "A startup loading screen was added, written inline in index.html so it does not depend on any module. Measured on production in a phone-sized landscape viewport, the screen stayed completely blank for 7.7 seconds: the HTML is interactive after 2.5 seconds, but nothing appears until 191 files have loaded and the opening screen is built. This is the first thing anyone arriving from the crowdfunding page will see, and a blank screen reads as broken. Where it lives matters: putting it in a module would mean waiting for the very thing that is slow, so it goes directly in the HTML.",
      "Three safeguards keep it from ever being left behind: pointer-events none so it cannot block input even if it stays, a check every 0.12 seconds that removes it once the opening screen or the board has content, and a hard timeout that removes it after 25 seconds regardless. Verified end to end: it appears at 1.7 seconds, disappears right after the opening screen at 6.6 seconds, is removed from the DOM, and reports pointer-events none throughout. No exceptions.",
      "An honest limit: the blank period is not fully covered. The head carries two parser-blocking external scripts, Tailwind's CDN build and the Supabase UMD bundle, plus the stylesheet, and the body cannot paint until those resolve - so the first one to two seconds are still black. Removing that means changing how those load, which risks unstyled flashes and initialisation-order faults, so it is not something to attempt days before the campaign. Shortening the load itself, by deferring the images among those 191 files that the opening screen does not need, is deferred for the same reason.",
    ],
  },
  {
    date: "2026-10-07",
    summary: [
      "駒を選ぶ効果では、選べる駒そのものが光るようになりました",
      "手札を捨てる順を選ぶ画面を、見やすいモーダルにしました",
      "カード拡大プレビューを、もっと大きくできるようにしました",
      "勝利演出を派手にしました（七色の衝撃波と、背後に回る光芒）",
    ],
    summaryEn: [
      "Effects that target a piece now light up the pieces you can choose",
      "Choosing the order to discard from hand now uses a proper, readable modal",
      "The card enlargement can now be made much bigger",
      "The victory sequence is flashier: seven-colour shockwaves and turning rays of light",
    ],
    items: [
      "マスチェンジや強制移動など**駒を選ばせる効果**で、選べる駒そのものが金色に光るようになりました。これまではマスの枠だけが光っていたので、「このマスを選ぶのか、この駒を選ぶのか」が見た目で分かりませんでした。マスの枠はこれまでどおり光るので、マスを選ぶ効果との違いもはっきりします。",
      "手札を複数枚捨てる効果（色落ちキャット・スラム上がりの役人・禁断の果実マルメゴ・選べる罠・ザ・ギャンブルなど）で**捨てる順を選ぶ画面**を、画面の中央に出る**モーダル**にしました。これまでは実際の手札を順番に押す形で、案内と「これで捨てる」ボタンが画面のいちばん上に小さく出ていたため、スマホでは**出ていることに気づけない**ことがありました（実測で、ボタンは高さ17ピクセル・手札は画面の一番下）。ロックエリアの札・盤面の札は以前からモーダルなので、見せ方が揃いました。モーダルの中では「おまかせ」も「盤面を見る」も使えます。",
      "**カード拡大プレビューの大きさ**（⚙オプション →「基本設定」→「カード拡大プレビューのサイズ」）の上限を広げました。スマホの横持ちだと、これまでの上限では画面の高さの64%までしか大きくできませんでしたが、**92%まで**出せるようになりました。この設定は長押しでの拡大にも効きます（マウスのホバーと同じ大きさです）。",
      "**勝利演出**に2つ足しました。①キューブが脈動するたびに、**七色の衝撃波**が盤面いっぱいに広がります（赤→橙→黄…の順）。②「VICTORY」の文字の背後で、**七色の光芒**がゆっくり回ります。あわせて、**スマホで控えめにしていた光の量を元に近い強さへ戻しました**（光の帯は半分→85%、画面振動は6割→8割、白の中の七色残光は6割→85%）。控えめにしていたのは発熱対策でしたが、勝利演出は10秒で終わる一度だけの見せ場なので、ここは見栄えを取りました。",
    ],
    itemsEn: [
      "Effects that ask you to choose a piece - Mass Change, forced moves and the like - now light up the pieces themselves in gold. Until now only the square's frame lit up, so there was no visual difference between \"choose this square\" and \"choose this piece\". Squares still light up as before, so the two cases are now clearly distinguishable.",
      "Choosing the order to discard several cards from hand - the Faded Cat, the Slum Official, Marumego, the Choosable Trap, The Gamble and so on - now happens in a modal in the middle of the screen. Until now you pressed your real hand cards in order while the instruction and the confirm button sat small at the very top of the screen, which on a phone made it easy to miss that anything had opened at all (measured: the button was 17 pixels tall while the hand sits at the very bottom). Lock-area cards and board cards have used a modal for a while, so the presentation now matches. Auto and \"look at the board\" are both available inside the modal.",
      "The maximum for the card enlargement size (Options, Basic settings, card enlargement size) has been raised. In landscape on a phone the old limit only reached 64% of the screen height; it now goes up to 92%. The setting applies to long-press enlargement as well, at the same size as mouse hover.",
      "Two additions to the victory sequence. Each pulse of the cube now sends a seven-colour shockwave sweeping across the board, in the red-orange-yellow order, and a slow turn of seven-coloured rays now sits behind the VICTORY text. The reductions that were applied on phones have also been eased back towards full strength: the light ribbons go from half to 85%, the screen shake from 60% to 80%, and the seven-colour afterglow inside the white from 60% to 85%. Those reductions existed to limit heat, but the victory sequence is a one-off ten-second moment, so the look wins here.",
    ],
    fixes: [
      "ゴメンナサイで奪うカードを選ぶ時、盤面が寄ったままで選べないカードがあったのを直しました。",
      "接触の助走と体当たりの動きが、スマホだと小さすぎて見えなかったのを直しました。",
      "CPU戦で「マイデッキあり」にしても、デッキを選ぶ画面が出なかったのを直しました。",
    ],
    fixesEn: [
      "Fixed cards being unreachable when choosing what to take with So Sorry!, because the board stayed zoomed in.",
      "Fixed the run-up and body-slam of a contact being too small to see on a phone.",
      "Fixed the deck selection screen not appearing in a CPU battle with My Deck enabled.",
    ],
    devItems: [
      "#384「ゴメンナサイで奪うカードを選ぶ時、カメラがアップのままで選べないカードがあった」。**続き557 の直しが届いていなかった**——カメラを引くのを**発動宣言の所**に入れたが、**自分でゴメンナサイを使う場合は「奪う札を選ぶ」が宣言より先**に来る。寄ったままだと画面の外に出た札に手が届かず**遊べなくなる**。入口ごとに足すのをやめ、**「触って選ぶ」ための共通の入口**（マスを選ぶ `requestCellChoiceForEffect` ／ 手札を選ぶ `requestHandCardChoiceForEffect`）でカメラを原点へ戻すようにした。こうすれば今後どの効果から呼ばれても同じ事故が起きない。モーダルの中で押して選ぶ画面は画面全体に重なるので対象外だが、その「盤面を見る」ボタンだけは同じ理由で戻す。検証: 1.85倍に寄せた状態から選択を始めると、**寄り1・原点**に戻ってから候補が出る。",
      "#387「やはり、接触の時の助走と体当たりのアニメが描画されません」。**続き558 の見立ては的を外していた。訂正する。** 報告と同じ画面（932x318＝iPhoneの横持ち。画面が極端に低いのでステージ倍率0.353）で実測すると、**駒そのものが画面上12.5px**で、助走8pxは**2.8px**、突進26pxは**9.2px**しか動いていなかった。「WebGLの描き直しが毎秒3回だから見えない」と書いたが、**それ以前に動く距離が数ピクセルしか無く、何コマ描けても見えない**。距離を**固定ピクセルから「相手までの間隔に対する割合」**（突進は相手の8割まで詰める／助走は3割下がる）へ変え、駒の大きさでも上限を掛けた。実測で**突進が画面上9.2px → 28.2px**（駒の幅14.1pxの2倍）、助走が**2.8px → 9.9px**になった。続き558 の「動く間はDOMが描く」は滑らかさと軽さには効くので残してある。",
      "**上限を足したのは実測で気づいた（記録）**。割合だけにしたところ、見本（▶ 接触）で駒が**232px＝盤面を横切って飛んでいった**。見本は「いま盤面にいる駒2つ」を使うので**相手が隣にいない**（本番の接触は必ず隣のマス）。駒の大きさで上限を掛けて解決した。**本番だけを考えて割合を決めると、見本が壊れる。**",
      "#382「CPU戦でマイデッキありでやってるけど、マイデッキ選べない」。マイデッキ戦をONにしても**デッキを選ぶ画面（`openDeckSelect`）が出ず**、「いま選択中のデッキ」か、無ければおまかせランダムで黙って始まっていた。この画面を出していたのは**本気エイドス戦とオンラインのランク戦だけ**で、通常のCPU戦だけが取り残されていた。直す場所は `runCpuBattleSetup` の中——CPU戦の入口は複数ある（ホーム画面・オープニング・対局後パネル・ランク待機中の練習）ので、入口ごとに書くと必ずどれかを書き忘れる。配布（`quickStart`）より前でないと開始色・駒スキン・裏面が反映できないので、必ずその前で聞く。スモークテスト（自己対戦）は誰も押さないので `askDeck: false` を渡して出さない。「ホームへ」は渡していない——通常のCPU戦では盤面がもう出ているので、出口は「選ぶ／おまかせ／新規作成」の3つで足りる。検証: ONにすると**全画面の選択画面が出て**、おまかせを押すと閉じ、`myDeckMode: true`・`myDeck-A` が7枚・`myDeck-C` も用意される。**A/Bで確認済み**——OFFだと画面は出ず、今までどおり対局が始まる。`npm test` 63/63 PASS、smoke PASS。",
      "#389「色落ちキャットでカードを捨てる時、捨てる順選択モーダルが出ない」は**調査の結果、出てはいた**。報告の経緯（`discard_self` の後58秒なにも起きず、そこで報告）から「効果が止まった」と見えたが、手元で同じ場面を作ると**手札3枚が光り・ヒストが出て・「これで捨てる（0/3枚）」も出た**（＝プレイヤーの操作を待っている正しい状態）。報告者の画面サイズ（932x430）で位置を測ると、**ヒントは y=35、確定ボタンは y=57 で高さ17px・幅89px＝画面最上部の細い帯**。肝心の手札は **y=346＝画面の一番下**。つまり出ているのに、押す場所から遠く小さすぎて気づけない。この「手札を順に押す」方式は 役人・マルメゴ・選べる罠など**手札を捨てる効果すべて共通**なので、見せ方を変えるならその全部に効く（＝ユーザー判断を仰ぐ）。",
      "#383「マスチェンジで対象のコマを選ぶ時、そのコマがわかりやすくハイライトされているといい」。効果側は既に `pickTarget: \"piece\"` を渡していた（確認文「この相手でいいですか」の切り替えに使っていた）ので、それを見て候補のマスに乗っている駒も光らせる。光らせるのは `.piece-face`（駒の各面）で `.piece` 自身ではない——`.piece` は box-shadow を既に持っており、box-shadow は後のルールで丸ごと上書きになるため（教訓10）。WebGL描画中は `.piece-face` の box-shadow を剥がすルールがあるが、あれは `!important` を付けていない（ハイライトの光は3D描画中でも見せたいという意図）ので、詳細度の高いこちらが勝つ。**印を覚えて描画時に付け直す形**にしてある——`.piece` は render のたびに createElement で作り直されるため、クラスを直接付けるだけでは次の描き直しで消える（#375 で実測済み）。検証: 駒を選ばせると**候補の駒2つとマス2つが光り**、描き直しをまたいでも残り、選び終わると消える。**A/Bで確認済み**——`pickTarget` を渡さない選択ではマスだけが光り、駒は光らない。",
      "**検証の書き方で1回落ちた（記録）**: 片付けを確かめるために `el.click()` でマスを押したが、**盤面の当たり判定は `#game-table` 1つのリスナーで自前にやっている**ので合成クリックは届かない（教訓4・20）。選択が解決されず「光が消えない」と出た。`PointerEvent` を `getBoundingClientRect` 基準の座標で `pointerdown`→`pointerup` と発行する形に直したら、解決も片付けも通った。**「消えない」と見えたら、まず操作が届いているかを確かめる。**",
      "#386「本気のエイドスがノワールを2枚ロックしている」は**仕様どおり**だった（ユーザー確認済み・2026-10-07「１です」＝これで正しい）。本気エイドス戦の開始時の盤面を手元で再現すると、C のロックエリアには**黒い札が3枚**入る——`first-noir`（index 6）＋「誘惑の黒の烙印」2枚（index 5 と 0＝ノワールの両隣。色相環でラップアラウンド）。これは 2026-08-15 のユーザー要望どおりで、3枚とも `placed: true`（＝「置いている」だけでロックではない）ので7色勝利のカウントには入らない。さらに報告のログでは、ノワールの手札効果が**ノワール自身のスロット（index 5）へ手札のカードをロック**している（`lock_hand_card_into_noir_slot`）。これも #108 の設計どおりで、結果として**1つのスロットに「置いてある黒い札」と「本当のロック札」が2枚重なる**。これが「2枚ロックしている」に見えたのだと思われる。ルール上の数え方は正しい（`victory.js` は `placed` を除外）。見せ方を変えるかを3択で確認し、**変えない**と決まった。",
      "#389（ユーザー判断「モーダルにするで決まったと思ってます」）: `requestHandCardsOrderedForEffect` の見せ方を、ハイライト方式から**モーダル**へ変えた。作りは `requestBoardCardsOrderedForEffect`（盤面のカード版）と同じ `#stack-modal` を流用。**候補の集め方と返し方は変えていない**——候補はDOMの手札から拾う（手札の並び順をそのまま使えるので「押さなかったぶんは今の並び順で捨てる」の意味が保てる）。`activeEffectPicker` も同じ形（`type: \"handMulti\"` ／ `toggle` ／ `confirmOrder` ／ `resolve`）で登録したまま——持ち時間切れの自動代行と「おまかせ」がここを通るため。検証（報告者と同じ 932x430）: 色落ちキャットの到達で**モーダルが画面中央に出る**（306x166・全ボタンが画面内。以前は案内 y=35・ボタン y=57 で高さ17px）／3枚目→1枚目→2枚目の順に押すとバッジが 2・3・1 になり、確定すると押した順で捨てられる／**limit がある場合**（役人等）は 0枚・1枚では確定を押しても閉じず、2枚で薄さが戻り、3枚目を押しても増えず、押した順の2枚だけが返る。`npm test` 63/63 PASS、smoke PASS、例外0件。",
      "#358（ユーザー要望「設定でサイズを調整できるようにして」）: **設定は元から長押しの拡大にも効いていた**（同じ `#card-preview`・同じ `--card-preview-size` を使う）が、**上限が足りていなかった**。実測（報告者と同じ 932x430＝iPhoneの横持ち。ステージ倍率0.478）で、8rem＝画面の高さの14%／既定の32rem＝57%／当時の上限36rem＝**64%**。上限を **52rem** に広げて**92%**まで出せるようにした（ステージの高さ900pxに収まる範囲。超えた値は従来どおり丸める＝実測で80remを指定しても52rem相当で止まる）。`card-preview-size.js` の MAX・基本設定のスライダー・管理者モードの3か所を揃えて変更。",
      "#385「最後のロックからの勝利演出がなんか微妙ですね💦」→「なんかもっと派手な凝ったアニメーション演出がいいです」。**まず数字で確認した**——報告のログの `diag-victory-celebration` が決定的で、`stages: WAIT@2 / COLORS@829 / GATHER@4727 / PULSE@5987 / FLASH@7507 / VICTORY@8199 / RESULT@10268`、`totalMs: 10271`、`light: false`、`reducedMotion: false`、`mobile: true`、`skippedByTapAtMs: 8997`。つまり**全段そろって10.3秒走っており、短縮版でもなく、ユーザーは9.0秒まで見てから自分でタップで飛ばしている**。足りないのは「量」ではなく「見栄え」だと分かったので、足す方向で直した。#349「CPUの勝利演出がだいぶはしょられてる」も同じ疑いで調べたが、そちらのログには `diag-victory-celebration` が無く（演出前に報告されたか版が古い）判断できない。",
      "#385 の直し: ①**スマホの減衰を緩めた**——`mobile` の時だけ `stream`×0.5・`shake`×0.6・`residue`×0.6 にしていた＝**一番「派手さ」に効く所を削っていた**。0.85/0.8/0.85 へ。減衰を入れた理由は #348（iPhoneが熱い）だが、あれは**変化が無い間も描き続けていた**件で、こちらは10秒で終わる一度だけの見せ場なので事情が違う。②**脈動ごとの七色の衝撃波**（`spawnPulseRing`／`--vic-rings`）。1回ごとに色を変える（COLORS の並びと同じ＝7色の話だと分かる）。③**VICTORY の背後に回る七色の光芒**（`.vic-rays`／`--vic-rays`）。②③はどちらも **DOM＋CSSだけ**で描くので、キャンバスの描画量（＝#348 の発熱の主因）を増やさない。結果画面の背景として数分間残る段では回すのをやめる（既存の `.is-settled` と同じ考え方）。`body.reduce-glow` では両方出さない。つまみは管理者モードのシミュレーター（victory-preview.js）に追加したので、**うるさい所は0にして切れる**。「軽量版」プリセットでは両方0にした。",
      "#385 の検証（報告者と同じ 932x430・ヘッドレス）: `--vic-rings: 1.2`／`--vic-rays: 1` が読めている／演出中に**衝撃波が最大2枚同時**に出る（脈動3回ぶんが重なる）／**光芒が実際に表示される**／終わると**衝撃波の残り0枚**・7段すべて実行・`is-settled` が付く。例外0件。`npm test` 63/63 PASS、`check-undeclared` 0件、smoke PASS、CSSブレース平衡。",
      "**層の取り違えを1回やった（記録）**: 衝撃波を `.vic-layer` という**存在しないクラス**に入れようとしていた（`|| root` のフォールバックがあるので例外にはならず、**幕の裏に入って色が沈む**だけの静かな間違いになる）。実際の層は `.vic-cubes`（疑似キューブと同じ、幕より手前）。`buildRoot` を読んで直した。**「落ちないけど見えない」間違いは、フォールバックがあると気づけない。**",
    ],
    devItemsEn: [
      "#384 (\"when choosing the card to take with So Sorry!, the camera stayed zoomed in and some cards could not be selected\"). The previous fix did not reach this case: the camera was brought home at the declaration, but when the local player uses So Sorry! the card selection comes before the declaration. Staying zoomed puts cards off screen and makes the game unplayable at that point. Rather than patching each entry point, the camera is now brought home inside the shared entry points for picking by touch - choosing a square and choosing a hand card - so no future effect can hit the same problem. Modal pickers cover the whole screen and are exempt, except that their \"look at the board\" button brings the camera home for the same reason. Verified: starting a selection while zoomed to 1.85 returns the camera to 1 and home before the candidates appear.",
      "#387 (\"the run-up and body-slam animation on contact still is not drawn\"). The earlier diagnosis was wrong and is corrected here. Measured on the reported viewport (932x318, an iPhone in landscape, where the stage scale is 0.353), the piece itself is 12.5 screen pixels wide, the 8px run-up moves 2.8 pixels and the 26px lunge moves 9.2 pixels. The claim that the WebGL redraw rate was the cause missed the point: the distance was a handful of pixels, which no frame rate can make visible. The distances are now a proportion of the gap to the opponent - the lunge closes 80% of it, the run-up backs off 30% - with an upper bound based on the piece size. Measured afterwards: the lunge went from 9.2 to 28.2 screen pixels (twice the 14.1px piece width) and the run-up from 2.8 to 9.9. The earlier change that hands the drawing to the DOM while the piece moves is kept, since it does help smoothness and cost.",
      "The upper bound came from a measurement: with a plain proportion, the preview sent the piece 232 pixels across the board, because the preview uses whatever two pieces are on the board and they are not adjacent, whereas a real contact always is. Bounding by the piece size fixed it. Designing a proportion around the real case alone broke the preview.",
      "#382 (\"I am playing a CPU battle with My Deck on, but I cannot choose my deck\"). Turning on My Deck never opened the deck selection screen; the game silently used the currently selected deck, or a random one if there was none. That screen was only opened by the serious Eidos story battle and by online ranked play - ordinary CPU battles had been left out. The fix goes inside runCpuBattleSetup, because CPU battles start from several places (home screen, opening, post-game panel, practice while queuing for ranked), and writing it per entry point guarantees missing one. It has to be asked before the deal (quickStart), otherwise the starting colour, piece skin and card backs cannot be applied. The smoke test plays itself, so it passes askDeck: false and sees no screen. No \"home\" button is offered, since the board is already up by then and choose / random / create new are enough. Verified: with the setting on, the full-screen selector appears, pressing random closes it, and myDeckMode is true with seven cards in myDeck-A and a pile for myDeck-C as well. An A/B with the setting off shows no screen and a normal start.",
      "#389 (\"the discard-order modal does not appear when discarding with the Faded Cat\") turned out to be appearing after all. The report's log looked like a stalled effect - nothing for 58 seconds after discard_self - but reproducing the same situation locally shows three hand cards highlighted, the hint displayed and the confirm button reading \"discard these (0/3)\", i.e. correctly waiting for the player. Measured at the reporter's viewport (932x430), the hint sits at y=35 and the confirm button at y=57, 17 pixels tall and 89 wide, a thin strip at the very top of the screen, while the hand itself is at y=346, at the very bottom. So it is on screen but too small and too far from where the player is looking. This press-your-hand-in-order approach is shared by every effect that discards from hand, so changing its presentation affects all of them - a call for the user to make.",
      "#383 (\"when Mass Change asks me to choose a piece, it would help if that piece were clearly highlighted\"). The effects already passed pickTarget: \"piece\" (it was used to switch the confirmation wording), so that flag now also lights up the pieces standing on the candidate squares. The glow goes on .piece-face rather than .piece, because .piece already carries a box-shadow and box-shadow is replaced wholesale by a later rule. While WebGL is drawing, a rule strips box-shadow from .piece-face, but it carries no !important - highlights are meant to stay visible during 3D drawing - so the more specific rule wins. The mark is remembered and re-applied at render time, because .piece is rebuilt with createElement on every render and a directly added class would be dropped by the next one. Verified: choosing a piece lights two candidate pieces and two squares, the glow survives a redraw, and it clears once the choice is made; an A/B without pickTarget lights only the squares.",
      "A note on the test: the cleanup check first failed because the square was pressed with el.click(), and board hit-testing is done by hand from a single listener on #game-table, so a synthetic click never arrives. The selection was never resolved and the glow \"would not clear\". Dispatching real PointerEvents at coordinates taken from getBoundingClientRect made both the resolution and the cleanup work. When something will not clear, first check that the input is arriving at all.",
      "#386 (\"the serious Eidos has two noirs locked\") is working as designed, confirmed by the user's confirmation. Reproducing the opening board of the serious Eidos battle locally shows three black cards in C's lock area: first-noir at index 6 plus two Black Contract Brands at indices 5 and 0, the neighbours of the noir with wrap-around. That matches the request from 2026-08-15, and all three are placed, i.e. merely sitting there rather than locked, so they do not count towards the seven-colour win. The report's log also shows the noir's hand effect locking a hand card into the noir's own slot, which is the design from #108, and the result is one slot holding both a placed black card and a real locked card. That is probably what read as \"two locked noirs\". The counting is correct, and the user confirmed on 2026-10-07 that it should be left as it is.",
      "#389 (the user settled on \"make it a modal\"): the presentation of requestHandCardsOrderedForEffect changed from the highlight approach to a modal, reusing the same #stack-modal as the board-card version. How candidates are gathered and returned is unchanged - they still come from the DOM hand, so the hand's display order is preserved and \"anything you do not tap is discarded in the order shown\" still means the same thing. activeEffectPicker is still registered in the same shape (type handMulti, toggle, confirmOrder, resolve), because the out-of-time auto action and the Auto button go through it. Verified at the reporter's 932x430: the Faded Cat's arrival now opens a modal in the middle of the screen, 306x166 with every button on screen, where the instruction used to sit at y=35 and a 17-pixel-tall button at y=57; pressing the third, first and second cards produces badges 2, 3, 1 and confirming discards them in that order; with a limit, confirm does nothing at zero or one card, returns to full opacity at two, ignores a third press, and returns exactly the two in the order pressed.",
      "#358 (the user asked to be able to adjust the size in settings): the setting already applied to long-press enlargement, since both use the same #card-preview element and the same CSS variable - but the ceiling was too low. Measured at the reporter's 932x430 (an iPhone in landscape, stage scale 0.478): 8rem is 14% of the screen height, the default 32rem is 57%, and the old maximum of 36rem only reached 64%. The maximum is now 52rem, which reaches 92% and still fits the 900px stage height; larger values are clamped as before, verified by asking for 80rem and getting the 52rem size. The limit was raised in all three places that carry it: card-preview-size.js, the Basic settings slider and the admin panel.",
      "#385 (\"the victory sequence after the final lock feels underwhelming\" and then \"I want something flashier and more elaborate\"). The numbers came first: the diag-victory-celebration entry in the report settles it - stages WAIT@2, COLORS@829, GATHER@4727, PULSE@5987, FLASH@7507, VICTORY@8199, RESULT@10268, totalMs 10271, light false, reducedMotion false, mobile true, skippedByTapAtMs 8997. So every stage ran, over 10.3 seconds, not a shortened version, and the user watched 9.0 seconds before tapping to skip. What was missing was impact, not length, so the fix adds rather than repairs. #349 (\"the CPU victory sequence looks heavily abbreviated\") was checked for the same cause, but its log has no diag-victory-celebration entry, so it cannot be judged.",
      "The changes: the phone reductions were eased - on mobile, stream was multiplied by 0.5 and shake and residue by 0.6, which cut exactly the things that make it feel lavish; they are now 0.85, 0.8 and 0.85. Those reductions came from the heat issue, but that was about redrawing while nothing changed, whereas this is a one-off ten-second moment. A seven-colour shockwave now expands from the cube on every pulse, changing colour each time in the same order as the colour stage, and seven-coloured rays turn slowly behind the VICTORY text. Both are drawn with DOM and CSS alone, so the canvas workload does not grow, and the rays stop turning once the sequence becomes the background of the result screens. Both are hidden under reduce-glow, and both have sliders in the admin simulator so anything noisy can be turned down to zero; the lightweight preset sets both to zero.",
      "Verified headless at the reporter's 932x430: the two new variables read back correctly, up to two shockwaves are on screen at once as the three pulses overlap, the rays really render, and afterwards no shockwave elements remain, all seven stages ran and the settled class is applied. No exceptions.",
      "A note on process: the shockwave was first appended to a class name that does not exist. Because the code falls back to the root element, nothing threw - it would simply have been placed behind the veil, where the backdrop filter drains the colour. Reading buildRoot showed the real layer. Mistakes that do not crash but cannot be seen are invisible precisely because of the fallback.",
    ],
  },
  {
    date: "2026-10-06",
    summary: [
      "「駒消し」「カード消し」ボタンを、既定では出さないようにしました。",
      "ゴメンナサイで止められた時、どの色を奪われたのかが分かるようになりました",
      "侵攻ボーナスの画面は、どこを押しても次に進められるようになりました",
      "ディメンションで伸びた移動にカメラが寄るようになりました",
    ],
    summaryEn: [
      "The \"hide pieces\" and \"hide cards\" buttons are no longer shown by default.",
      "When So Sorry! stops your lock, you can now see which colour was taken",
      "The Gate Invasion Bonus screens now advance when you tap anywhere",
      "The camera now moves in on the long move granted by Dimension",
    ],
    items: [
      "タブレット・スマホの画面左下に出ていた「駒消し」「カード消し」のボタンを、**既定では出さない**ようにしました。操作しやすくなって要らなくなった、というご意見によるものです。使いたい時は ⚙オプション →「詳細設定」→「「駒消し」「カード消し」ボタンを出す」で戻せます（タッチ操作の端末でだけ出る項目です）。なお、駒やカードを消した状態のままボタンを隠すと戻せなくなるので、隠す時は必ず元の表示に戻します。",
      "最後の1色をロックしようとして「ゴメンナサイッ！」で止められた時、**どのスロットから、どの色を奪われたのか**がひと目で分かるようになりました。奪われて空になったロックスロットがその色で点滅し、画面の下に「〇〇のロックから△が奪われた！　7色が揃わない」と一行出ます。この場面は、宣言したロック自体は成功しているのに勝てない（ゴメンナサイは宣言を取り消すのではなく、すでにロックしている別の1枚を奪う効果）という、ルールを知らないと読み取りにくい形になっていました。抜けた色を名前と光で直接指し示すようにしてあります。",
      "相手ゲート侵攻ボーナスのお知らせは段が何回も続くので、**画面の関係ない所（暗くなっている部分）を押しても次に進められる**ようにしました。小さな「OK」を狙って押す必要はありません。進み方はOKを押したときとまったく同じです。",
      "**紫のキューブ ディメンション**で移動が伸びている時の「ワープ」する移動に、カメラが寄るようになりました（アグレッシブモードを「決め所だけ」以上にしている場合）。通常の移動は毎ターン起きるので寄りませんが、この移動は限られた場面の特別な動きなので、現れる側のマスに寄ります。",
    ],
    itemsEn: [
      "The \"hide pieces\" and \"hide cards\" buttons in the lower left on tablets and phones are no longer shown by default, since handling the board has become easy enough without them. You can bring them back from Options, Advanced settings, \"Show the hide pieces and hide cards buttons\" (the setting only appears on touch devices). If either mode is active when you hide the buttons, it is turned off first, so you can never be left unable to touch the board.",
      "When your attempt at the seventh colour is stopped by So Sorry!, you can now see at a glance which slot was emptied and which colour was taken. The robbed lock slot flashes in that colour, and a line appears near the bottom of the screen: \"<colour> was taken from <player>'s Lock Area — not seven colours any more\". This moment used to be hard to read, because the lock you declared does succeed — So Sorry! does not cancel it, it takes a different card you had already locked — so the board showed a successful lock with no victory. Now the missing colour is pointed out by name and by light.",
      "The Gate Invasion Bonus notices come in several steps, so you can now advance them by tapping anywhere on the screen, including the darkened area - no need to aim for the small OK button. It does exactly what pressing OK does.",
      "The warp-style move you get while Dimension is extending your movement now draws the camera in (when Aggressive Mode is set to key moments or higher). Ordinary moves happen every turn and are left alone, but this one is a special move in a limited situation, so the camera moves to the square you appear on.",
    ],
    fixes: [
      "カメラが寄ったまま選択画面が開いて、盤面がずれた位置で止まってしまうのを直しました。",
      "カメラが寄っている間に、画面下のミニロックエリアが一瞬出てしまうのを直しました。",
      "ロックの鎖の演出やゲートへの着地が、カメラの動きとずれて見えるのを直しました。",
      "対戦中にブラウザの「戻る」操作をすると、対局から抜けてタイトルに戻ってしまうのを直しました。",
      "盤面の絵が突然すべて消えて、白い枠だけが残ってしまうことがあったのを直しました。",
      "ゴメンナサイで止められた時、画面が寄ったままで、止めた側の演出が見えなかったのを直しました。",
      "接触（タックル）で、助走してぶつかる動きが見えないことがあったのを直しました。",
      "スマホで、画面の下に黒い余白が残ったまま自動で直らないことがあったのを直しました。",
    ],
    fixesEn: [
      "The camera no longer stays zoomed in - leaving the board off-centre - while you are asked to choose something.",
      "The mini lock area no longer flashes at the bottom of the screen while the camera moves in.",
      "The lock chain effect and landings on a gate no longer appear misaligned because the camera was moving.",
      "Going back in the browser during a match no longer drops you out of the game and back to the title.",
      "Fixed a case where every piece of board artwork could vanish at once, leaving only empty outlines.",
      "Fixed the camera staying zoomed in when So Sorry! stops a lock, which hid the blocking player's animation.",
      "Fixed the run-up and collision of a tackle sometimes not being visible.",
      "Fixed a black band at the bottom of the screen on phones that would not correct itself.",
    ],
    devItems: [
      "アグレッシブモードが生んだ不具合4件（#370・#372・#373・#374）を直した。**原因は2つに集約**——①効果の移動で寄った後、戻りの予約を `finally`（＝効果が全部終わってから）に置いていたため、到達効果の途中でプレイヤーに選択を聞くと**答えるまで寄りっぱなし**になっていた（#370。報告の画像で確定。予約を効果の処理より前に移した）②画面に合わせる計算（手札の寄せ・ミニロックエリア）と、座標を測ってから重ねる演出（ロックの鎖・飛翔の着地）が、**カメラが動いている最中にも走っていた**（#372・#373・#374。前者はカメラが原点に居る時だけ計算し、戻った瞬間に1回測り直す。後者は `waitForBoardAnimation` で演出の終わりを待ってから寄る）。**A/Bが取れたのは #373 のみ**（守りなし＝寄っている間にミニロックが `flex`／あり＝`none`）。残り3件は実際の接触・侵攻・ロックを起こす必要があり手元で再現しきれていない＝実機での確認待ち。",
      "#371「駒消し、カード消しボタンは、デフォでは非表示でいいかと！操作性だいぶ上がったので！」。interaction-mode.js に `so7-interaction-toggle-visible`（既定 false）を足し、`updateVisibility()` の条件を「タッチ端末 **かつ** 出す設定」にした。**事故防止**: 隠す時に `piecesHidden`/`cardsHidden` を必ず false へ戻す——このトグルを解除できるのはこのボタン自身だけなので、消したまま隠すと**盤面に触れなくなる**。設定はタッチ端末の時だけ詳細設定に出す（PCでは意味が無い項目を増やさない）。実測（iPad相当で実際に押した）: 既定で両ボタンとも非表示／設定を入れると両方表示／消した状態で隠すと `pieces-interaction-hidden` が外れる／設定の行は幅489pxで画面内に見えていて初期はチェックなし／例外0件。",
      "#377「CPUとの4人対戦中に落ちてタイトルに戻ってしまった」は**落ちていなかった**。crash-blackbox.js が残していた起動時の記録が決定的で、`navType: \"back_forward\"` ／ `prevInGame: true` ／ `prevMode: \"cpu\"` ／ `prevLastError: null` ／ `secsSincePrev: 7`。`back_forward` は**履歴を戻った**という意味で、メモリ不足でタブが捨てられたのなら `reload` になるし未捕捉エラーも無い。iPhone は画面端のスワイプが「戻る」なので横持ちで十分起こり得る。アプリ側には `pushState` も `popstate` の受けも無く、守りが1つも無かった（`replaceState` だけ）。新しい葉モジュール `back-guard.js`（アプリの他モジュールを import しない＝crash-blackbox と同じ方針）で、対局中だけ履歴に目印を積み、「戻る」が来たら積み直してその場に留まり、短い案内を出す。対局が終わったら目印を自分で1つ戻す（対局外の「戻る」が1回ぶん効かなくなるのを防ぐ）。「対局中か」の判定はブラックボックスへ渡しているものをそのまま使う（2か所で別々に書くとズレる）。実測: 対戦前は守りなし／対局開始で守りON／戻るを押しても `/` のまま盤面が残り案内が出る／連打しても抜けない／対局が終わると `/version.json` へ戻れる／例外0件。",
      "**作る前に既にあるものを読むべきだった（記録）**。ユーザー依頼は「落ちる瞬間を残す仕組みをお願い」で、私は新規に作るつもりでいたが、`crash-blackbox.js` が**心拍・メモリのピーク・未捕捉エラーの持ち越し・起動時の不審終了判定まで実装済み**で、しかも**その結果が報告の `context.blackbox` に入っていた**。私がそれを読まずに「原因は特定できませんでした」と報告していた。**報告に付いている情報を全部読んでから、足りないものを足す。**",
      "#369「なんかこんな画面になっちゃってる」（盤面の49マス・ロックエリア・カード・駒が全部消え、白い枠だけが浮いた画面）の原因を**WebGLの文脈が失われた後の「復帰したつもり」**に絞り込んだ。報告のログには `diag-board3d-context-lost` が1回と `diag-board3d-context-recover` が1回だけ入っており、**復帰は「成功した」ことになっている**（#377 のログは両方0件なので、この2件は根が違う）。致命的なのは `body.board-3d-on` が戻ると CSS 側が盤面の絵を剥がす（`.board-card` / `.piece-face` / `.stack-top` / `.lock-area-bar-image` / `.playmat-bg` / `.table-background-bg` の `background-image` を `none` にする）ことで、**WebGLが描かない＋CSSも剥がす＝何も見えない盤面**になる。`board-3d.js` に `verifyRecovery()` を足し、復帰から1.8秒後に「文脈が本当に生きているか」「描いている板が1枚以上あるか」を確かめ、だめなら `diag-board3d-context-recover-failed` を記録してCSS描画へ戻す（設定そのものは変えないので、次に開いた時はまたWebGLで試す）。`ensureRenderer()` にも、文脈が死んだ renderer を使い回さず捨ててから作り直す守りを足した。",
      "**検証と、その正直な限界**。ヘッドレスChromiumで `WEBGL_lose_context` を使って文脈を失わせた。①**正常な復帰は壊れていない**——失った0.25秒後にCSS描画へ退避して盤面の絵が戻り、約1秒後にWebGLが198枚で復帰する。②**「復帰したつもりで死んでいる」状態を作れた**（`webglcontextlost` が届かないようにした上で復帰直後に失わせる）ところ、新しい守りが実際に発火して「復帰したが描けていないので、CSS描画へ戻します (lost=true, quads=198)」を出し、以降は盤面の絵が見えたままになった。守りを外して同じ筋書きを流すと、**白い盤面（`board-3d-on` が付き・板0枚・文脈は死んでいる）が実際に観測された**。③一方で**`quads === 0` の枝は手元で持続させられなかった**——描く対象を全部取り去っても `render()` が作り直すので自然に戻る。この枝は安全網として残す。④`ensureRenderer()` の守りは**正常な経路では到達しない**（`handleContextLost` が renderer を捨ててから復帰するため、復帰時には既に null）。片付けの途中で例外が出た時のための保険で、A/Bは取れていない。",
      "**測り方で2回間違えた（記録）**。①最初のプローブは文脈を失わせられていなかった。`canvas.getContext(\"webgl\")` を先に要求したせいで**種類の違う文脈を新規に作ってしまい**（コンソールに `A WebGL context could not be created. Reason: Canvas has an existing context of a different type`）、本物の文脈は生きたまま「PASS」が出た。既存の文脈と**同じ種類**（ここでは `webgl2`）を要求しないと掴めない。②CSS側の絵が見えているかを `display` / `opacity` で見ていたが、実際の隠し方は **`background-image: none`** だった。そのため「絵が見える」が常に true になり、ここでも素通りした。**比較する値は、実際にどう隠しているかをCSSで確かめてから書く**（続き553 で `!== \"block\"` と書いて実際は `flex` だった件と同じ形を、また踏んだ）。",
      "#375「CPU2にゴメンナサイでロック阻止されたけど、何が起きたのか画面上で分かりづらかったです」。報告の行動ログで場面が確定した——11:24:20 に A（報告者）が `REQUEST_FINAL_LOCK`、その3秒後に `hand-effect: purple-sorry, player: C`（＝CPU2）、捨て札2枚と `MOVE_TOKEN card-66 → hand C`（奪取）、11:24:36 に `lock: yellow-sleight-of-hand, player A`。**つまりロック自体は成立している**。原因は2つ。①**アグレッシブモードが、承認待ちの間ずっと宣言したロックスロットに寄ったまま**だった（続き549 の作り。`pendingFinalLock` が消えるまで戻らないので、この回は約16秒寄りっぱなし）。`playBlockedEffect` の盾は**止めた側の席**に、捨て札の公開は**その席の手札**に出るので、全部画面の外で起きていた。`playGomennasaiDeclaration()` の先頭で `cameraHome(320)` を呼ぶようにした——発動宣言はCPU・自分・オンラインの中継の**3経路すべてが通る**ので1か所で足りる。②**抜けた色を指す物が無かった**。空いたロックスロットをその色で点滅させ、下部に一行出す（`game.gomennasai.robbed`）。",
      "**入口ごとに書かず state を見た**（続き549・552 と同じ）。ゴメンナサイの入口は3つあるので、「承認待ちの間に、攻めた側のロックから札が1枚**手札へ**移った」という事実だけを `subscribe` で拾う。行き先が手札であることまで確かめているのは、ロックから札が出る理由がゴメンナサイ以外にもあるため。宣言そのものの札は除いてあるが、**実は除く必要は無かった**——却下では「カードは元々動かしていない」（state.js の `RESPOND_FINAL_LOCK` のコメント）ので承認待ち中の札はロックに入っていない。読んだ上で、将来そこが変わった時の保険として残した。",
      "**【実測で設計が変わった】最初はスロットに直接クラスを付けていたが、何も光らなかった。** `.lock-slot` は `render()` のたびに `createElement` で**作り直される**ので、付けたクラスは次の描き直しで消える。しかも A/B で外して測ると**奪った瞬間から光らない**＝描き直しが同じ処理の中で直後に走っている。`is-one-away`（あと1色の点滅）と同じ「印を覚えて**描画時に付け直す**」形に変えて解決した。**「付けたのに出ない」時は、その要素が作り直されていないかを疑う。**",
      "検証（ヘッドレス・`scratchpad/_c557probe.mjs`）: ①カメラ＝寄り1.85・原点ではない → 発動宣言で**寄り1・原点**に戻る。②攻めた側のロックから手札へ1枚移すと、**その色の名前入りの一行**（「プレイヤーAのロックから橙が奪われた！　7色が揃わない」）と**そのスロットだけ**（bottom/1）が光る。**描き直しをまたいだ後も残っている**。③**攻めた側ではない席のロックが動いても出ない**（誤爆しない）。例外0件。`npm test` 63/63 PASS、`check-undeclared` 0件（167ファイル）、`smoke 2` PASS、CSSブレース平衡。",
      "**測り方でまた詰まった（記録）**: 最初のプローブは「宣言してから0.25秒待って奪う」形にしていたが、**CPU戦では承認が一瞬で解決する**ので待っている間に `pendingFinalLock` が消えていた（続き549 で同じことを書いている）。宣言と奪取を**同じ処理の中で続けて**起こす形に直したら測れた。また、CPU戦の準備直後は**手札が0枚**（配られるのは進行中）なので、承認待ちを立てる札は盤面の札を使った。",
      "#381「接触の時助走してぶつかるアニメ描画されてないです」。**アニメは走っていた**——報告のログに `diag-contact-tackle: lunge-start`（12:50:43.344）→ `lunge-end`（12:50:48.433）と5.09秒ぶん残っている。見えない原因は**駒の絵をWebGLが描いている**こと。助走・突進はCSSでDOMの駒を動かすので、WebGLが描き直さないと絵は動かない。#360 で「動いている間は30msごとに描き直す」（`waitWhileFlushingBoard3d`）を入れてあったが、**実機では1回の作り直しに56〜280ms掛かる**ので追いつかない——同じログの `diag-board3d` を見ると、まさにタックル中の描き直しが**毎秒3.2回**（`rebuildMs: 56`）だった。助走8px・突進26pxが2〜3コマで終われば、見えないに等しい。",
      "直し方は「WebGLに追いかけさせるのをやめる」。動かす駒の面に `board3d-skip` を付けてWebGLの板を取り下げ、同時にDOM側の絵を復活させる（WebGL描画中はCSSが `background-image: none !important` で剥がしているので、インラインに `!important` で付け直して勝つ。絵の読み取りは `backgroundImageUrl` がインラインstyleから行うので、`!important` を足してもWebGL側は壊れない）。これで**ブラウザの合成が滑らかに動かしてくれる**上に、動いている間の作り直しが**0回**になる（作り直しは引き渡しと復帰の2回だけ）。発熱（#348）にも有利な方向。接触の後半（相手の駒がゲートへ飛ぶ `playContactFlight`）は元からDOMの影武者を飛ばす作りで、**前半だけが取り残されていた**という形だった。",
      "検証（ヘッドレス・`scratchpad/_c558probe2.mjs`）: 駒の面5枚について、開始前＝DOMの絵0枚・板205枚 → **動いている間＝5枚すべてに `board3d-skip` が付き・DOMの絵が5枚出て・板が200枚に減る**（＝面5枚ぶん取り下げられた）→ 終了後＝skip0・DOMの絵0・`!important`0・インライン指定は5枚のまま・板205枚に復帰。例外0件。**A/Bで確認済み**——引き渡しを外すと、動いている間もDOMの絵は0枚・板205枚のまま（＝WebGLの描き直し任せ）で FAIL になる。",
      "**正直な限界**: 「実機で滑らかに見えるか」はここでは測れない（ヘッドレスはWebGLをCPUで描くので毎秒数コマしか出ない＝続き542 と同じ）。測れたのは「DOMが描く側に替わった」ことと「動いている間の作り直しが要らなくなった」ことまで。実機の体感を待つ。",
      "**最初の切り分けで駒を取り違えた（記録）**: `#game-table .piece` の1つ目を見ていたが、見本（`playContactTacklePreview`）が動かすのは**自席の駒**。transform が1種類しか観測できず「動いていない」と出た。見本と同じ選び方で `data-token-id` を特定してから測り直したら、`\"\" → translate(5.6, 5.7) → translate(-18.1, -18.6) → translate(0,0)` と**4段階だけ**が観測できた（＝CSSは動いているが、拾える瞬間が少ない）。**「動いていない」と見えたら、まず見ている対象が合っているかを確かめる。**",
      "#378「すまほでやってるけど、下の黒余白が自動で治りません。縦向き横向きを繰り返すと治ります」。ステージ（1600x900）を画面に収まる倍率へ縮めて**中央に置く**作りなので、合わせた時より見えている高さが広くなると、その差が下（と上）の余白として残る。報告3件の `screen` が **932x318 / 932x371 / 932x430** とバラバラで、430-318＝112px がちょうど余白になる。自己修復（0.5秒ごとの `ensureViewportStageFresh`）は入っていたのに効かなかった理由は、**比べていたのが `window.innerHeight` だけ**だったこと。iOSはブラウザの下のバーが出入りしても `window.innerHeight` が変わらないことがあり、代わりに `visualViewport` の高さだけが変わる。`visualViewport` の resize は購読していたが、その先で比べるのが `window.innerHeight` だったので**「変わっていない」と判断して何もしていなかった＝購読が空振りしていた**。`viewportSize()`（visualViewport を正とし、文字入力中と拡大中だけ `window.inner*` に落とす）を1か所に作り、**合わせる時・控える時・食い違いを見る時の3か所すべてを同じ物差しに**した。`visualViewport` の scroll も合図に足した。",
      "#378 の検証（ヘッドレス・`scratchpad/_c559probe.mjs`）: 報告の形をそのまま作った——`window.innerHeight` を 318 に固定して嘘をつかせ、`visualViewport` の高さだけを 318→430 に動かす。**直す前は盤面の高さ318・下の余白112pxのまま変わらない**（A/Bで確認）。直した後は**430に合わせ直し・余白0**。例外0件。",
      "#380「この侵攻モーダルの時、画面の関係ないところを押して飛ばせるやつにしたい！」。背景（backdrop）を押したら**既にある進め方と同じこと**をするようにした——ローカル（CPU戦）の `showBonusStepModal` は「OK」と同じ＝この段を進める、オンラインの告知列（`gate-invasion-modal.js`）は「スキップ」「×」と同じ＝列を終える。新しい意味を足していないので、押し間違いで想定外のことは起きない。オンライン側は同じ処理が3か所（スキップ・×・背景）に散るので `skipAll` にまとめた。検証: 実際にゲート侵攻を起こしてモーダルを出し、**背景を押したら段が進んで消えた**（A/Bで確認——背景の押下を外すと本文が変わらず残る）。",
      "#379「ディメンションでの移動もカメラ寄りがいいかも！」。通常の移動は毎ターン起きるので決め所に入れていない（続き547）が、**ディメンションで伸びた移動は見た目も「ワープ」に変わる特別な移動**なので、ここだけ寄る。寄せ先は**現れる側のマス**（他の決め所と同じく結果の側を見せる）。つまみ（`warpZoom` / `warpYaw` / `warpTilt`）を管理者モードに足したので、「寄り1・角度0」にすればこの場面だけ切れる（続き552 と同じ仕組み）。検証: 実測で**寄り1.5・ヨー -6度**、終わると原点に戻る。**A/Bで確認済み**——ディメンションが効いていない通常移動では**寄り1.000（まったく動かない）**。",
      "**測り方で詰まった所（記録）**: #380 の検証で、駒をゲートへ動かす `moveToken` を `page.evaluate` の中で待つと**プローブ側が「promise was garbage collected」で落ちた**（ページの再読み込みもエラーも起きていない＝アプリ側の異常ではない）。`setTimeout` で投げっぱなしにして**外で待つ**形に変えたら通った。もう1つ、背景を `body > div` の中から「z-index が 10001 の最初のもの」で探していたが**別の層のものを掴んでいた**（`cursor` が空で出た）。モーダルの**直前の兄弟**を見る形に直して解決（作る順が「背景→モーダル」なので確実）。**「探し方」が雑だと、直っているものまで落ちる。**",
    ],
    devItemsEn: [
      "Fixed four regressions introduced by the cinematic camera (#370, #372, #373, #374), which came down to two causes. First, the scheduled return home sat in a finally block - after the whole effect had resolved - so if an arrival effect asked the player to choose, the camera stayed zoomed, and the board stayed off-centre, until they answered (#370, confirmed from the report's screenshot; the return is now scheduled before the effect runs). Second, the viewport-fit reactions (hand nudging, mini lock area) and the overlays that measure screen coordinates before animating (the lock chain, flight landings) were all running while the camera was in motion (#372, #373, #374); the former now only run when the camera is home and re-measure once it returns, and the latter wait for waitForBoardAnimation before the camera moves. Only #373 has an A/B so far (without the guard the mini lock area shows as flex mid-zoom; with it, none); the other three need a real contact, invasion or lock and could not be reproduced here.",
      "#371: the user asked for the hide-pieces and hide-cards buttons to be off by default now that the board is easy enough to handle. interaction-mode.js gained a so7-interaction-toggle-visible flag (default false) and updateVisibility now requires both a touch device and that flag. Safety matters here: hiding the buttons also clears piecesHidden and cardsHidden, because those modes can only be cleared from the buttons themselves - hiding them mid-mode would leave the board untouchable. The setting only appears in Advanced settings on touch devices. Measured on an iPad-like context: both buttons hidden by default, both shown once enabled, pieces-interaction-hidden cleared when hiding while active, and the settings row itself measured 489px wide and on screen with its checkbox unchecked. No exceptions.",
      "#377 (\"the game dropped to the title during a four-player CPU match\") was not a crash. The record crash-blackbox.js had already saved settled it: navType \"back_forward\", prevInGame true, prevMode \"cpu\", prevLastError null, secsSincePrev 7. back_forward means the history was traversed backwards; a tab discarded for memory would report reload, and there was no uncaught error. On an iPhone an edge swipe is Back, so this is easy to trigger in landscape, and the app had no protection at all - only replaceState, no pushState and no popstate handler. A new leaf module back-guard.js (importing nothing from the app, same rule as crash-blackbox) pushes a history marker while a match is running, re-pushes it when Back arrives so the page stays put, and shows a short notice; when the match ends it pops its own marker so Back works normally again. Whether a match is running reuses the same signal already fed to the blackbox rather than being computed twice. Measured: no guard before a match, guard on once it starts, Back leaves the page on / with the board intact and the notice visible, repeated Back still holds, and after release Back reaches /version.json. No exceptions.",
      "A note on process: the request was to build something that records the moment of a crash, and I was about to write it from scratch - but crash-blackbox.js already recorded heartbeats, peak memory, carried-over uncaught errors and a suspicious-exit verdict on boot, and its output was sitting in the report's own context.blackbox. I had reported \"cause unknown\" without reading it. Read everything the report already carries before building anything new.",
      "Narrowed down #369 (\"the screen ended up like this\" - the 49 cells, lock area, cards and pieces all gone, leaving a few white outlines) to a \"recovery that only looked successful\" after a lost WebGL context. The report's log holds exactly one diag-board3d-context-lost and one diag-board3d-context-recover, i.e. the recovery reported success (#377's log has zero of both, so the two reports have different roots). What makes this fatal is that once body.board-3d-on comes back, the CSS strips the board artwork (background-image: none on .board-card, .piece-face, .stack-top, .lock-area-bar-image, .playmat-bg, .table-background-bg) - WebGL draws nothing and the CSS art is stripped, so nothing is visible at all. board-3d.js gained verifyRecovery(), which 1.8s after a recovery checks whether the context is really alive and whether at least one quad is being drawn; if not it logs diag-board3d-context-recover-failed and falls back to CSS drawing (the setting itself is untouched, so the next launch tries WebGL again). ensureRenderer() also gained a guard that disposes a renderer whose context is dead instead of reusing it.",
      "Verification, and its honest limits. Using WEBGL_lose_context in headless Chromium: (1) normal recovery is not broken - 0.25s after the loss the board falls back to CSS and the artwork reappears, and about a second later WebGL is back with 198 quads. (2) The \"recovered but dead\" state could be reproduced (by stopping webglcontextlost from arriving and losing the context right after the recovery), and the new guard did fire, logging \"recovered but drawing nothing, falling back to CSS (lost=true, quads=198)\", after which the artwork stayed visible. With the guard removed, the same scenario actually produced the blank board (board-3d-on present, zero quads, dead context). (3) The quads === 0 branch could not be made to persist here - removing every drawable element just makes render() rebuild them, so it heals on its own; that branch stays as a safety net. (4) The ensureRenderer() guard is unreachable on the normal path (handleContextLost disposes the renderer before recovery, so it is already null), so it is insurance against an exception during cleanup and has no A/B.",
      "Two measurement mistakes worth recording. (1) The first probe never actually lost the context: requesting canvas.getContext(\"webgl\") first created a second context of a different type (the console said \"A WebGL context could not be created. Reason: Canvas has an existing context of a different type\") while the real one stayed alive, and the probe reported PASS. You have to request the same type the renderer used (webgl2 here). (2) Whether the CSS artwork was visible was checked via display/opacity, but the actual mechanism is background-image: none, so the check always said \"visible\" and passed regardless. Read how something is actually hidden in the CSS before writing the assertion - the same shape of mistake as checking against \"block\" when the real value was \"flex\".",
      "#375 (\"CPU2 stopped my lock with So Sorry! and it was hard to tell what happened on screen\"). The report's action log pinned the scene down: at 11:24:20 player A (the reporter) issued REQUEST_FINAL_LOCK, three seconds later hand-effect purple-sorry by player C (CPU2), then two discards and MOVE_TOKEN card-66 to C's hand (the steal), and at 11:24:36 lock yellow-sleight-of-hand player A - so the lock itself did succeed. Two causes. (1) Aggressive mode holds the camera on the declared lock slot for as long as the approval is pending (by design, from the final-lock shot), which in this round meant about 16 seconds zoomed in; playBlockedEffect puts its shield at the blocking player's seat and the discards are revealed at that seat's hand, so all of it happened off-screen. playGomennasaiDeclaration() now calls cameraHome(320) first - the declaration is on the path of all three entry points (CPU, local player, online relay), so one place covers them all. (2) Nothing pointed at the colour that went missing. The emptied lock slot now flashes in its own colour and a one-line caption appears near the bottom.",
      "Detected from state rather than per entry point. So Sorry! has three entry points, so the watcher only looks for the fact that a card left the attacker's lock zone and arrived in a hand while the approval was pending. Requiring the destination to be a hand matters because cards can leave a lock area for other reasons. The declared card is excluded too, although reading state.js shows that was unnecessary - on a rejection the card was never moved in the first place; it stays as insurance in case that changes.",
      "A measurement changed the design: adding the class straight to the slot lit nothing. Lock slots are rebuilt with createElement on every render, so the class is dropped by the next one - and an A/B showed it never appears at all, because a render runs within the same dispatch. Switching to the same approach used by the one-away pulse (remember a mark, re-apply it at render time) fixed it. When something you set does not show up, suspect that the element is being rebuilt.",
      "Verification (headless): (1) camera at 1.85 and not home, then the declaration brings it back to 1 and home. (2) Moving one card from the attacker's lock area into a hand produces the caption naming the colour and lights exactly that one slot, and it survives a following render. (3) A lock card moving on a seat that is not the attacker produces nothing. No exceptions; 63/63 unit tests, zero undeclared symbols across 167 files, smoke pass, CSS braces balanced.",
      "Two measurement traps worth recording: the first probe waited 0.25s after declaring before stealing, but in a CPU game the approval resolves instantly, so the pending state was already gone (the same note exists from the final-lock work). Doing the declaration and the steal in one synchronous stretch made it measurable. Also, right after CPU-battle setup the hands are still empty (cards are dealt as play proceeds), so the token used to raise the pending state was taken from the board.",
      "#381 (\"the run-up and collision animation on contact is not being drawn\"). The animation was running - the report's log holds diag-contact-tackle lunge-start at 12:50:43.344 and lunge-end at 12:50:48.433, 5.09 seconds apart. It is invisible because the piece artwork is drawn by WebGL: the run-up and lunge move the DOM piece with CSS, so the artwork only moves if WebGL rebuilds. A previous fix redrew every 30ms while the piece moved, but on the device a single rebuild costs 56-280ms, so it cannot keep up - the diag-board3d entry from the same log shows 3.2 draws per second during the tackle, with rebuildMs 56. An 8px run-up and a 26px lunge spread over two or three frames is as good as invisible.",
      "The fix stops asking WebGL to follow. The moving piece's faces get a board3d-skip class so their quads are withdrawn, and the DOM artwork is restored at the same time (while WebGL is drawing, the CSS strips background-image with !important, so the inline value is re-asserted with !important to win; the reader takes the url from inline style, so adding !important does not break it). The browser's compositor then animates it, and the number of rebuilds during the motion drops to zero - only two, at handover and restore. That also helps with the heat issue. The second half of a contact, where the defender's piece flies to a gate, already used a DOM stand-in rather than WebGL rebuilds; only the first half had been left behind.",
      "Verification (headless): for the piece's five faces, before the motion the DOM artwork count is 0 and there are 205 quads; during the motion all five faces carry board3d-skip, all five show DOM artwork, and the quad count falls to 200; afterwards everything is restored - no skip classes, no DOM artwork, no !important, the five inline declarations intact, and 205 quads again. No exceptions. An A/B confirms causality: with the handover disabled, the DOM artwork stays at 0 and the quads stay at 205 during the motion, and the check fails.",
      "Honest limit: whether it actually looks smooth on the device cannot be measured here, because headless draws WebGL on the CPU and manages only a few frames per second. What was measured is that the DOM took over the drawing and that no rebuilds are needed while the piece moves. Waiting on the device for the feel.",
      "A note on process: the first attempt at diagnosis watched the wrong piece - the first .piece in the DOM, while the preview moves the piece of the local seat. Only one transform value was observed, which read as \"nothing is moving\". Selecting the piece the same way the preview does showed four discrete transform values, i.e. the CSS was animating but few moments could be sampled. When something looks motionless, first check that you are watching the right thing.",
      "#378 (\"on my phone the black band at the bottom does not correct itself; repeating portrait and landscape fixes it\"). The stage (1600x900) is scaled to fit and centred, so when the visible height grows after a fit, the difference remains as a band at the bottom (and top). The three reports carry screen values of 932x318, 932x371 and 932x430, and 430-318 = 112px is exactly the band. Self-healing was already in place on a 500ms interval, but it compared only window.innerHeight. On iOS that value can stay unchanged when the browser's bottom bar hides, while only visualViewport's height changes; the visualViewport resize event was subscribed, but the comparison behind it used window.innerHeight, so it concluded nothing had changed and did nothing. A single viewportSize() now treats visualViewport as authoritative, falling back to window.inner* only while text is being entered or the page is pinch-zoomed, and all three places - fitting, recording and comparing - use that one measure. visualViewport's scroll event was added as another trigger.",
      "#378 verification (headless): the reported situation was reproduced by pinning window.innerHeight at 318 and moving only visualViewport's height from 318 to 430. Before the fix the stage stays 318 tall with a 112px band (confirmed by A/B); after the fix it refits to 430 with no band. No exceptions.",
      "#380 (\"I would like to be able to skip the invasion modal by pressing an unrelated part of the screen\"). Clicking the backdrop now does exactly what the existing control does: in the local CPU-battle modal it is the same as OK, advancing one step; in the online notice queue it is the same as Skip and the close X, ending the queue. No new meaning was introduced, so a stray tap cannot do something unexpected. On the online side the same three handlers were collapsed into one skipAll. Verified by triggering a real gate invasion and clicking the backdrop, which advanced and dismissed the step; an A/B without the listener leaves the same text on screen.",
      "#379 (\"a camera move for the Dimension move would be nice too\"). Ordinary moves happen every turn and are deliberately not key moments, but the move extended by Dimension also changes its look to a warp, so this one gets a shot, aimed at the square the piece appears on, as the other shots show the result side. Knobs (warpZoom, warpYaw, warpTilt) were added to the admin panel, so setting zoom to 1 and the angles to 0 switches off just this one. Measured: 1.5 zoom and -6 degrees of yaw, returning home afterwards; an A/B with Dimension inactive shows a flat 1.000, i.e. no camera movement at all.",
      "Measurement notes: awaiting moveToken inside page.evaluate made the probe fail with \"promise was garbage collected\" even though no navigation or error occurred in the page, so it is not an app fault; firing it via setTimeout and waiting outside worked. Also, the backdrop was being located as the first body child with z-index 10001, which picked up a different layer (its cursor read as empty); looking at the modal's immediately preceding sibling fixed it, since the creation order is backdrop then modal. A sloppy lookup makes working code look broken.",
    ],
  },
  {
    date: "2026-09-30",
    summary: [
      "最後の1色をロックする瞬間に、カメラが大きく寄るようになりました（アグレッシブモード）。",
      "カメラが少し斜めから寄るようになり、寄り方も強くなりました。",
      "ゲート侵攻とロック成立でもカメラが寄るようになりました。",
    ],
    summaryEn: [
      "The camera now moves in hard when someone locks their seventh colour (cinematic mode).",
      "The cinematic camera now comes in from an angle, and closer.",
      "The camera now moves in for gate invasions and for locking a colour.",
    ],
    items: [
      "アグレッシブモードを「決め所だけ」以上にしていると、誰かが7色目をロックしようとした瞬間、そのロックエリアへカメラが大きく寄ります（接触より強く・ゆっくり寄ります）。承認が一瞬で終わる場面でも見せ場が残るように、最低1.8秒は寄ったままにしてあります。見本ボタンも「▶ 接触」と「▶ 最後の1色」の2つになりました。",
      "アグレッシブモードのカメラが、正面からではなく**少し斜め**から寄るようになりました。寄り方も強くしています（接触は1.55倍、最後の1色は1.85倍）。斜めは「左右に振る」方で作っています——盤面を寝かせる方向だけで斜めにすると、奥のカードが潰れて読めなくなるためです。少しだけ傾きも足して立体感を出しています。",
      "アグレッシブモードを「決め所だけ」以上にしていると、**相手のゲートに乗った瞬間**と**色をロックした瞬間**にもカメラが寄ります。ロックは1試合で何度も起きるので、寄り方は控えめにしてあります。うるさく感じる場面があれば、管理者モードのつまみでその場面の「寄り」を1・角度を0にすると、**その場面だけ**カメラが動かなくなります。",
    ],
    itemsEn: [
      "With the cinematic camera set to \"Big moments\" or higher, the camera now sweeps in on the lock area the moment someone goes for their seventh colour - closer and slower than for a contact. It holds for at least 1.8 seconds so the moment still lands even when everyone approves instantly. There are now two preview buttons: Contact and Final lock.",
      "The cinematic camera now comes in from a slight angle rather than straight on, and moves in closer (1.55x for a contact, 1.85x for the final lock). The angle comes from swinging the camera sideways: tipping the board further would flatten the far cards until they cannot be read. A little extra tilt is mixed in for depth.",
      "With the cinematic camera on \"Big moments\" or higher, it now also moves in the moment a piece lands on an opponent's gate, and the moment a colour is locked. Locking happens many times in a game, so that shot is deliberately gentle. If any one of these feels intrusive, set that shot's zoom to 1 and its angles to 0 in the admin sliders and only that shot stops moving.",
    ],
    devItems: [
      "最後の1色（#359「最後のロックをもっと派手に」）をアグレッシブモードに乗せた。**state（pendingFinalLock）を見て切り替える**のが肝——ロックの宣言はタップ経路・ドラッグ経路・オンラインの同期と入口が複数あり、入口ごとに書くと必ずどれかを書き忘れる（続き83・524と同じ形）。pendingFinalLock の tokenId が変わった時だけ動かし、消えたら戻す。**A/Bで因果を確定**: 同じ宣言を「切」と「決め所だけ」で1回ずつ起こすと、切＝寄り 1.000（まったく動かない）／決め所だけ＝寄り 1.5。**測って初めて分かった問題**: 最初は 1.356 までしか寄らなかった——CPU戦では承認が同じ処理の中で一瞬で解決するので、寄り切る前に戻りが始まっていた。最低1.8秒は寄ったままにする下限（FINAL_LOCK_CAMERA_MIN_MS）を入れて 1.5 まで届くようにした。",
      "【管理者向け】「🎬 アグレッシブモードの寄り方（試作）」のつまみを追加しました（✨演出の中）。接触・最後の1色それぞれの「寄り／左右に振る／傾きを足す」と、最後の1色の「見せ場の長さ」の7本＋既定に戻す＋いまの値の行。オプションの「▶ 接触」「▶ 最後の1色」を押しながら回して、良い値を伝えてもらえば既定へ反映します（盤面の光と同じ運用）。実装は cinematic-camera.js に yaw / tilt の軸を足し、tableTransform に rotateY を差し込む形（2D表示ではアングルを付けない）。**寄せる前に目標のアングルも当てた状態で測ってから動かす**ので、斜めにしても対象が画面の中央に来ます。実測: 既定で寄り1.85・ヨー8度・傾き8度、演出中だけ rotateY が入り終了後は残らない。つまみを 2.4 / 20度 にすると見本に即反映され localStorage にも保存される。",
      "決め所を2つ追加（ゲート侵攻・ロック成立）。どちらも**入口ごとではなく state を見る**（移動もロックもドラッグ・タップ・効果・オンラインの再現と入口が複数あり、入口ごとに書くと必ずどれかを書き忘れる＝続き83・524・549 と同じ形）。ゲート侵攻は**駒が相手のゲートのマスに入った瞬間**で見る——侵攻の判定そのもの（gate-invasion.js）はターン終了時に走るが、見せたいのは乗った瞬間なので駒の位置の方を見る。ロック成立はロックゾーンのトークンidの集合が増えた時で、**配り始め（turnPlayer がまだ無い）と7色目（pendingFinalLock 中）は対象外**。管理者モードのつまみに6本追加（ゲート侵攻・ロック成立それぞれの寄り／左右に振る／傾き）。**「寄り1・角度0」にするとその決め所だけ止まる**ようにして、場面ごとのスイッチを増やさずに切れるようにした。実測: 配り始めの寄りは1.000（誤爆なし）／ゲート侵攻 1.6・ヨー8度／ロック成立 1.3・ヨー6度／つまみで切ると 1.000。例外0件。**勝利は今回入れていない**——勝利パネルが画面を覆ううえ、#349（勝利演出が途中で切れて見える）が「再現せず」で閉じたばかりで、ここに手を入れると切り分けが難しくなるため。",
    ],
    devItemsEn: [
      "Hooked the final lock (#359, \"make the last lock more spectacular\") into the cinematic camera. The trigger reads state (pendingFinalLock) rather than each call site: a final lock can be declared from the tap path, the drag path or an online sync, and writing it per entry point guarantees missing one. It fires when pendingFinalLock's tokenId changes and returns when it clears. An A/B pins down the causality: the same declaration with the mode off never moves the camera (zoom 1.000) while \"Big moments\" reaches 1.5. Measuring also exposed a problem: at first it only reached 1.356, because in a CPU match the approval resolves synchronously and the pull-back began before the move-in finished. A minimum hold (FINAL_LOCK_CAMERA_MIN_MS, 1.8s) now lets it arrive.",
      "[Admin] Added a \"cinematic camera framing (prototype)\" panel under Effects: seven sliders (zoom, sideways swing and extra tilt for both the contact and the final lock, plus the final lock's hold time), a reset, and a line showing the current values. Turn them while pressing the Contact and Final lock previews in the options, then send the values back to become the defaults - the same workflow as the board lighting. Implementation adds yaw and tilt axes to cinematic-camera.js and injects rotateY into tableTransform (no angle in 2D view). The target angle is applied before measuring, so the subject still ends up centred when the shot is angled. Measured: 1.85 zoom, 8 degrees of yaw and 8 of tilt by default, rotateY present only during the move and gone afterwards, and setting 2.4 / 20 degrees takes effect in the preview immediately and persists.",
      "Added two more moments: the gate invasion and locking a colour. Both watch state rather than each call site, since moves and locks arrive from the drag path, the tap path, card effects and online replay, and writing them per entry point reliably misses one. The gate invasion triggers when a piece enters an opponent's gate square - the invasion itself is only evaluated at end of turn, but the moment worth showing is the landing. Locking watches the set of token ids in the lock zone growing, excluding the initial deal (no turnPlayer yet) and the seventh colour (which has its own shot). Six more admin sliders cover zoom, yaw and tilt for each; setting a shot's zoom to 1 with no angle disables just that shot, so no extra switches were needed. Measured: no false trigger during the deal (zoom 1.000), 1.6 and 8 degrees for the gate, 1.3 and 6 for the lock, and 1.000 once switched off. Victory was deliberately left out: the victory panel covers the screen, and #349 (victory celebration looking cut short) was only just closed as not reproducible, so touching it now would muddy any future diagnosis.",
    ],
  },
  {
    date: "2026-09-29",
    summary: [
      "お知らせが短い1行になり、「詳細」を押すと詳しい説明が出るようになりました。",
      "スラム上がりの役人と選べる罠でも、捨てる順番をまとめて選べるようになりました。",
      "ロックしているカードを捨てる効果も、まとめて選べるようになりました。",
      "カードを選ぶ画面に「盤面を見る」ボタンが付きました。",
      "カメラが寄る「アグレッシブモード（試作）」を追加しました。",
      "アグレッシブモードに「▶ 見本」ボタンを付けました。",
    ],
    summaryEn: [
      "Update notes are now short one-liners, with a Details button for the full text.",
      "The Slum-Born Official and Choosable Trap now let you choose the discard order all at once.",
      "Discarding your locked cards is now done in one screen as well.",
      "Card-choosing screens now have a \"Look at the board\" button.",
      "Added a prototype cinematic camera mode.",
      "Added a Preview button to the cinematic camera mode.",
    ],
    items: [
      "ホーム画面のお知らせを、1件1行の短い見出しにまとめました。詳しい説明は「詳細」を押した時だけ出ます。これまでの長い文章は消していません——そのまま「詳細」の中に入っています。まずは直近の回（9月28日・26日・23日・21日）から新しい見せ方になっています。",
      "「スラム上がりの役人」で手札が3枚になるまで捨てる時と、「選べる罠」で手札を半分捨てる時も、他の複数枚捨てる効果と同じように、捨てる順にカードを押して最後に1回だけ確定する形になりました。これまでは1枚選ぶたびに確認が出ていたので、5枚捨てる場面では確認が4回出ていました。捨てる枚数は決まっているので、その枚数を選ぶまで確定ボタンは押せません。選び直したい時は、選んだカードをもう一度押すと外れて番号が繰り上がります。",
      "色落ちキャットの手札効果（ロックしているカードを好きな枚数捨てて、1枚につき3枚ドロー）が、ロックエリアと同じ7色の並びで一覧に出るようになりました。捨てたいカードを押すと押した順に番号が付き、最後に1回だけ確定します。何枚捨てると何枚ドローになるかもボタンに出ます。1枚も選ばずに確定すれば、何も捨てません。ファーストカード・エターナルカードは他のカードの効果の対象にならないので、見えていますが選べません。",
      "カードを選ぶ画面が盤面を覆ってしまうので、「盤面を見る」を押すと一時的に画面をどかして盤面を確かめられるようにしました。「選択に戻る」で元に戻ります。見ている間は盤面を触れません（選んでいる最中に盤面が変わってしまわないようにするためです）。",
      "⚙オプションの「詳細設定」に「アグレッシブモード（試作）」を足しました。「決め所だけ」を選ぶと、接触の瞬間や、カードの効果で駒が動く時にカメラが寄っていきます。「全部」にすると普通の移動でも寄ります。既定は「切」なので、選ばない限り今までどおりです。効果が続けて起きる間は寄ったままで、止まってから元の画角に戻ります。",
      "⚙オプション →「詳細設定」の「アグレッシブモード（試作）」の隣に「▶ 見本」を足しました。押すとオプションが閉じて、接触の演出だけがその場で再生されます。実際に接触が起きるのを待たなくても、切／決め所だけ／全部を切り替えながら見比べられます。盤面の状態は何も変わりません（駒は元の位置に戻ります）。対戦中だけ押せます。",
    ],
    itemsEn: [
      "The news on the home screen is now a short one-line headline per item, and the fuller explanation appears only when you press Details. Nothing has been removed - the longer text you saw before now lives inside Details. The most recent entries (28, 26, 23 and 21 September) have been converted first.",
      "Discarding down to three cards with \"The Slum-Born Official\", and discarding half your hand with \"Choosable Trap\", now work like every other multi-card discard: tap the cards in the order you want to discard them, then confirm once at the end. Previously a confirmation appeared for every single card, so discarding five cards meant four confirmations. Because the rule fixes how many cards go, the confirm button stays inactive until you have chosen exactly that many; tapping a chosen card again removes it and renumbers the rest.",
      "Fading Cat's hand effect (discard as many of your locked cards as you like, drawing three for each) now shows them laid out in the same seven colours as your lock area. Tap the cards you want to discard - they are numbered in the order you tap - and confirm once at the end; the button also tells you how many cards you will draw. Confirm without choosing any to discard nothing. First and Eternal cards cannot be targeted by other cards' effects, so they are shown but cannot be chosen.",
      "Because a card-choosing screen covers the board, a \"Look at the board\" button now moves it out of the way so you can check the board, and \"Back to choosing\" brings it back. You cannot touch the board while looking, so nothing changes underneath you while you are choosing.",
      "Advanced settings now have a prototype \"cinematic camera\". With \"Big moments\" the camera moves in for contacts and for pieces moved by card effects; with \"Everything\" it also follows ordinary moves. It is off by default, so nothing changes unless you turn it on. While effects keep resolving the camera stays in close, and it pulls back once things settle.",
      "Next to the prototype cinematic camera in Advanced settings there is now a Preview button. Pressing it closes the options and replays just the contact animation, so you can compare the three settings without waiting for a real contact to happen. Nothing on the board changes - the piece returns to where it was - and the button only works during a match.",
    ],
    devItems: [
      "CHANGELOG に summary / summaryEn（短い1行の見出し）を足した。items / itemsEn と**同じ順番・同じ件数**で書く。画面では summary だけが並び、「詳細」を押すと items の本文が各見出しの下に開く（1つのボタンでその回の全項目をまとめて開閉）。**本文は書き換えず、上に見出しを足す形**にしたので、過去の回に後から付けても本文の意味がズレない（ユーザー判断で直近4回＝9/28・9/26・9/23・9/21 に付けた。それ以前は従来どおり本文がそのまま並ぶ）。件数が合っていない回は、対応を取り違えるより安全なので従来表示に落とす。文字色は決め打ちせず継承にした（続き535で明るいテーマだけ文字が消えた実害があるため）。",
      "複数枚捨てる場面の総点検（続き537の再点検）。順番モーダルは**「全部捨てる」専用**の作りで、選ばなかった分を後ろに足して必ず全部捨てていたため、**捨てる枚数が決まっている効果には使えなかった**。requestHandCardsOrderedForEffect に options.limit（この枚数だけ選ぶ）を足し、スラム上がりの役人（main.js の runSlumOfficialDiscardTask）と選べる罠（engine の DISCARD_HALF_HAND）をそこへ載せた。1枚だけの時は順番が無いので従来の1枚選ぶ経路のまま。**確定ボタンは #game-table の自前の当たり判定で拾うので disabled 属性では止まらない**（教訓4）——薄くするのは見た目だけで、実際に弾くのは confirmOrder の中。CPUの番・「おまかせ」・持ち時間切れの自動代行も limit 枚で止まる。常設テストを1件追加（手札4枚→半分2枚を選んだ順に捨てる／limit=2 が渡っている／残り2枚は捨てない）。**A/Bで確認済み**——engine の呼び出しを旧経路に戻すと 60/61 で落ちる。実機でも直接確かめた: 0/2・1/2 では確定が弾かれ、3枚目を押しても増えず、選び直すと番号が繰り上がり、確定すると押した順の2枚だけが返る。",
      "残した判断: 色落ちキャットの手札効果「自分のロックカードを任意の枚数捨て、1枚につき3枚ドロー」は**枚数をプレイヤーが決める（0枚でもよい）**ので、1枚ずつ選んで「やめる」を押す今の形のままにした。ロックエリアのカードは全部見えていて1枚ずつ押せるため、モーダルにする理由（積み重なって押せない・確認が何度も出る）がどちらも当てはまらない。セレスティアの「相手全員から無作為に1枚ずつ」は選択そのものが無いので対象外。",
      "【管理者向け・試作】光の強さ・向きのつまみを追加しました（全体の明るさ／主な光の強さ／反対側からの弱い光／光の向き（左右）／光の高さ、の5本と「既定に戻す」）。ユーザーが実機で「暗い感じはありますね！光源を強くすればいいとか？」——そのとおりだが、こちらが数字を当てずっぽうで決めるより実機で見ながら回せる方が確実なので、つまみにした（管理者モードで調整→良い値をコードの既定へ反映、という既存の運用と同じ形）。動かすとその場で反映される（光の強さと向きを差し替えるだけで、材質の作り直しは要らないので軽い＝つまみを回すたびに盤面が消えることもない）。いまの値を読める行も出しているので、良い具合になったらその行をそのまま伝えてもらえば既定値に反映できる。実測: 既定(2.45/1.55)から 5.5/3.2 まで上げると明確に明るくなる（上げすぎるとロックエリアの札が白飛びするので、使える範囲はこの間）。",
      "【管理者向け・試作】管理者モードに「盤面に光を当てる（試作）」を追加しました。別プロジェクト「∞:EVEN」の3D卓の質感がPVに近い、という指摘から。調べたところ技術はまったく同じ（どちらもブラウザの three.js）で、違いは材質と光源だけだった——あちらは MeshStandardMaterial ＋ 光源3つ、こちらは MeshBasicMaterial ＋ 光源なし（#348「iPhoneが熱い」への対策）。既定はOFFで、押さない限り従来と1ミリも変わりません。踏んだ落とし穴: 光を足したら陰影が付くどころか盤面全体が暗くなり、光を強めたらもっと暗くなった。原因は、盤面の板は CSS の行列に Y 軸の反転が含まれるため**表がカメラと逆を向いている**こと（光が板の裏に当たり、見えている面はずっと影の中だった）。光源の Z を反転して解決し、平らに寝ているカードの明るさは元のまま・角度の違う面（駒の上面と側面）だけに差が出る形にした。重さはヘッドレスのソフトウェア描画では9秒に2〜3回しか描けず測れなかった（光ありの方が速いという、あり得ない数字が出た）ので、実機での体感を待つ。",
      "【管理者向け・試作】盤面の光の「全体の明るさ」の既定を 2.45 → 4 にしました（ユーザーが実機で見て決めた値）。既定はOFFのままなので、「盤面に光を当てる（試作）」を入れない限り見え方は変わりません。",
      "カメラ演出（アグレッシブモード）の土台を入れた。**動かすのは #game-table の transform**——board-3d.js は CSS の3D変形を読んで板に変換する*変換器*なので、three.js のカメラだけ動かしても枠線・文字・当たり判定のDOM層が付いてこない。そして board-3d.js は #game-table の変形を**1つの行列（rootGroup.matrix）にまとめて**扱うので、**カメラだけ動く分には盤面を作り直さない**（syncCamera が毎フレーム拾い直す）＝当初見積もっていた「作り直し 約28ms」は掛からない。実測でも、寄せた絵で枠線とWebGLの札・駒がズレずに一緒に動くことを確認した。既にあった --camera-zoom / --camera-offset-y / 手動ズーム・パンと同じ式に合流させ、直近のフィットの材料を覚えておいて**カメラだけ動く間は測り直さない**。動きは requestAnimationFrame だが**必ずタイマーと競争させて終わらせる**（rAF は画面が見えている間しか進まない＝#360 で実害）。連続する効果では戻りを予約にして、次の寄りが来たら取り消す（寄ったまま→止まってから1回だけ戻る）。",
      "接触の演出だけを再生するプレビューを足した（ユーザー要望「タックルですが試しに見るのに一苦労です」）。いま盤面にいる駒2つから本番と同じ tackle オブジェクトを組み立てて playContactLunge をそのまま呼ぶ＝**演出の実装を二重に持たない**。**state は一切変えない**（playContactLunge は突進した駒を元の位置へ戻し終える）。本番と同じく演出中は汎用の描き直しを止める。オプション側は `so7:preview-contact` の CustomEvent を投げるだけにして、main.js の内部関数に触らせていない。**実測**（ヘッドレスChromiumで実際に押した）: 最大の寄り 1.35倍・約5秒寄ったまま・終了後に transform が**元の文字列と完全一致**・例外0件。対戦中でない（盤面に駒が2つ無い）時はボタンを押せなくしてある。",
    ],
    devItemsEn: [
      "Added summary / summaryEn to CHANGELOG entries: short one-line headlines written in the same order and count as items / itemsEn. The list shows only the summaries, and a single Details button per entry opens every item's full text beneath its headline. The existing long text was not rewritten - the headline is added above it - so entries can be converted after the fact without their wording drifting (per the user's call, the four most recent entries were converted; older ones still render as before). An entry whose counts do not line up falls back to the old rendering rather than risk pairing the wrong texts. No text colour is hard-coded; it inherits, because hard-coding it once made the light theme unreadable.",
      "Re-audited every place that can discard several cards at once. The ordered picker was built only for \"discard all of these\": whatever you did not pick was appended and discarded too, so it could not be used where the rule fixes the number of cards. requestHandCardsOrderedForEffect now takes options.limit, and the Slum-Born Official (runSlumOfficialDiscardTask in main.js) and the Choosable Trap (DISCARD_HALF_HAND in the engine) both use it. A single card still goes through the old one-card path, since there is no order to choose. The confirm button is picked up by the custom hit test on #game-table, so the disabled attribute cannot stop it - dimming is cosmetic and confirmOrder itself rejects an incomplete selection. The CPU's turn, the Auto button and the out-of-time stand-in all stop at the limit as well. One permanent test was added (four cards in hand, half of them discarded in the chosen order, limit=2 passed, the other two kept), and an A/B confirms it: restoring the old path drops the suite to 60/61.",
      "Left as it is: Fading Cat's hand effect (discard any number of your locked cards, drawing three per card) lets the player decide how many, including none, so it keeps its one-at-a-time picker with a stop button. Locked cards are all visible and individually tappable, so neither reason for the modal applies. Celestia's \"one card at random from every qualifying opponent\" involves no choice at all.",
      "[Admin, prototype] Added sliders for the light's strength and direction (overall brightness, key light, fill light, horizontal direction and height, plus a reset). Trying it on a real device the user said it looked dark and asked whether the light should simply be stronger — it should, but guessing numbers from here is worse than turning a knob while looking at the board, which also matches how this project already works (tune in admin mode, then bake the good values into the defaults). Changes apply immediately: only the lights' intensity and position are swapped, with no material rebuild, so the board never blinks while dragging a slider. The current values are printed in a line that can be pasted back so they can become the new defaults. Measured: raising the default (2.45/1.55) to 5.5/3.2 brightens it clearly, though the lock-area cards blow out past that, so the usable range sits between the two.",
      "[Admin, prototype] Admin mode gained a Light the board switch. It came from noticing that the 3D table in a sibling project looks closer to the promo video: the technology turned out to be identical (three.js in the browser either way) and the only differences were the material and the lights — MeshStandardMaterial plus three lights there, MeshBasicMaterial and no lights here (the fix for #348, the overheating iPhone). It defaults to off, so nothing changes unless you turn it on. The trap encountered: adding light made the whole board darker rather than shaded, and turning the lights up made it darker still. The board's quads face away from the camera because the CSS matrix chain flips the Y axis, so the light was hitting their backs and every visible surface sat in shadow. Flipping the lights' Z fixed it: flat cards keep their original brightness and only surfaces at an angle (a piece's top versus its sides) differ. Cost could not be measured headlessly — software WebGL managed two or three redraws in nine seconds and reported the lit version as faster, which cannot be true — so it waits on a real device.",
      "[Admin, prototype] The board light's overall brightness now defaults to 4 instead of 2.45, the value the user settled on while looking at a real device. The lighting itself is still off by default, so nothing changes unless the prototype switch is turned on.",
      "Added the groundwork for the cinematic camera. What moves is #game-table's transform: board-3d.js is a converter that reads CSS 3D transforms into quads, so moving only the three.js camera would leave the DOM layer (borders, text, hit-testing) behind. Because board-3d.js already folds #game-table's transform into a single rootGroup matrix, a camera-only move needs no rebuild - syncCamera picks it up each frame - so the ~28ms rebuild cost estimated earlier does not apply, and a zoomed shot was verified to keep the DOM frame and the WebGL cards and pieces in step. It joins the existing --camera-zoom / --camera-offset-y and manual zoom and pan in one expression, remembering the last fit so nothing is re-measured while only the camera moves. Motion runs on requestAnimationFrame but always races a timer so it finishes even in a background tab (rAF only advances while the page is visible - the #360 lesson). For chained effects the pull-back is scheduled and cancelled by the next move in, so the camera stays close and returns once.",
      "Added a preview that replays only the contact animation (the user found it hard to trigger a real contact just to look at it). It builds the same tackle object from two pieces already on the board and calls playContactLunge itself, so the animation is not implemented twice, and it changes no state - playContactLunge returns the lunging piece to where it started. Generic re-rendering is suppressed during it, exactly as in the real path. The options menu only dispatches a so7:preview-contact CustomEvent rather than reaching into main.js. Measured by actually clicking it in headless Chromium: peak zoom 1.35, held for about five seconds, and the transform string afterwards is identical to the one before, with no exceptions. The button is disabled unless a match is running.",
    ],
  },
  {
    date: "2026-09-28",
    summary: [
      "スマホでの長押し拡大が、押した指と反対側に出るようになりました。",
      "盤面のカードを捨てる効果（ワイナウエア・白の意思の覚醒）でも、捨てる順番を選べるようになりました。",
      "ワイナウエアの一覧は、マスに積まれていた順に並びます。",
      "色落ちキャットで全員が手札を捨てる時も、それぞれが順番を選べます。",
      "順番にこだわらない人のために「おまかせ」ボタンを付けました。",
      "複数枚をまとめて捨てる場面で、捨てる順番を自分で選べるようになりました。",
      "このお知らせの見せ方を整えました。",
    ],
    summaryEn: [
      "On a phone, press-and-hold now shows the enlarged card on the opposite side from your finger.",
      "Effects that discard cards from the board (Winauea, Awakening of the White Will) now let you choose the order too.",
      "Winauea's list is laid out in the order the cards were stacked on the square.",
      "When Fading Cat makes everyone discard their hand, each player chooses their own order.",
      "Added an \"Auto\" button for players who do not care about the order.",
      "When several cards are discarded at once, you now choose the order yourself.",
      "Tidied up how these update notes are presented.",
    ],
    items: [
      "スマホでカードを長押しして拡大する時、拡大が「押した指と反対側」に出るようになりました。画面の右側のカードを押せば左に、左側のカードを押せば右に出るので、自分の手で隠れません（マウスでの拡大は今までどおり、設定した側に出ます）。",
      "盤面のカードを捨てる効果（ワイナウエア・白の意思の覚醒）でも、捨てる順番を選べるようになりました。対象のカードを一覧で広げて見せるので、マスに積み重なっていて盤面では押せないカードも選べます。裏向きのカードは裏向きのまま並ぶので、中身が見えてしまうことはありません。何も押さずに確定すれば、いま並んでいる順のまま捨てます。",
      "ワイナウエアの一覧は、マスに積まれていた順（上から）に左から並びます。どう重なっていたかが分かります。",
      "色落ちキャットで全員が手札を全部捨てる時も、それぞれが自分で捨てる順番を選べるようになりました。順番は本人の画面で聞きます。",
      "順番にこだわらない時のために「おまかせ」ボタンを付けました。捨てる順番を選ぶ画面で押すと、その場で自動的に順番が決まります。途中まで選んでいれば、その分はそのまま活かされます。",
      "複数枚をまとめて捨てる場面で、捨てる順番を自分で選べるようになりました。カードを押した順に番号が付きます。ヴァーディアンで公開した札をターン終了時に捨てる時と、マルメゴで橙が出て手札を全部捨てる時が対象です（ザ・ギャンブル・選べる罠・スラム上がりの役人は以前から選べます）。",
      "このお知らせの見せ方を整えました。不具合の直しは「不具合を修正しました」の1行にまとめ、中身を知りたい時だけ「詳細」を押して開く形にしました。新しくできるようになったことや見え方の変化は、今までどおりそのまま並びます。",
    ],
    itemsEn: [
      "On a phone, holding a card to enlarge it now shows the enlargement on the opposite side from your finger: press a card on the right and it opens on the left, and the other way round, so your own hand no longer covers it. Enlarging with a mouse still follows the side you chose in the settings.",
      "Effects that discard cards on the board (Winauea and the Awakening of the White Will) now let you choose the discard order too. The cards are laid out in a list, so you can also pick ones buried in a stack that you could never tap on the board. Face-down cards stay face down, so nothing is revealed. Confirm without tapping anything and they are discarded in the order shown.",
      "For Winauea the list runs left to right in the order the cards were stacked on the square, top first, so you can see how they were piled up.",
      "When the Faded Cat makes everyone discard their whole hand, each player now chooses their own discard order, asked on their own screen.",
      "Added an Auto button for when you do not care about the order: press it on the ordering screen and the order is decided for you. Anything you had already picked is kept as the start of that order.",
      "When several cards are discarded at once, you can now choose the order yourself; tapping the cards numbers them as you go. This covers the cards revealed by Vardian being discarded at the end of your turn, and Marumego discarding your whole hand when an orange card appears (The Gamble, Choosable Trap and the Slum Official already let you choose).",
      "Tidied up how this news page reads. Bug fixes are now collapsed into a single line, and you can press Details to see them if you want to. New features and changes you can see are still listed as before.",
    ],
    devItems: [
      "#358 の一部: 長押し拡大の出る側を「押した位置と反対側」にした（main.js の positionPreviewPanel。previewFollowsTouch が真の間だけユーザー設定より優先する）。フラグは長押しでプレビューを出した時に立て、指を離した時と中断時（ピンチ等）に下ろす。マウスのホバーは従来どおり設定に従う——指で隠れる問題が無いため。実測: 幅844で左(169)を押すと拡大の中心が219＝右へ、右(675)を押すと625＝左へ。マウスはどちらを押しても設定側（右）のまま。#358 のもう一方「拡大サイズが長押しに効かない」は、コード上は同じ #card-preview と --card-preview-size を共有しており再現しなかったので、見え方の詳細をユーザーに確認中。",
      "#357 の残りその2: 盤面のカードを捨てる順に選ぶモーダル（main.js の requestBoardCardsOrderedForEffect、picker type=\"boardMulti\"）を新設し、ワイナウエア（DISCARD_ALL_ON_CHOSEN_CELL 相当のマス指定）と白の意思の覚醒（DISCARD_ALL_FACEUP_ON_BOARD）から呼ぶ。手札用と別に作った理由は、ワイナウエアの対象が1マスの積み重ねで盤面では一番上しか押せないため。表示は #stack-modal を流用し各カードは自分の faceUp どおり（裏は裏のまま＝一覧にしたことで中身が覗けない）。聞く条件は「2枚以上」だけ。当初は「表向きが1枚以上」も条件にしていたが誤りで、ユーザー指摘で外した——裏向きで盤面に置く効果（選べる罠・パーティー・収穫と種まき・合同建設）があるため、裏向き＝中身不明とは限らず、プレイヤーは何がそこにあるか覚えていることがある。全部裏向きでも聞く検査を常設テストに追加し、A/Bで確認済み（誤った条件に戻すと 59/60 で落ちる）。ワイナウエアは state.tokens で後ろほど上なので反転して上から順に渡す。「おまかせ」ボタンは置いていない（選ばなかった分は表示順で捨てるので、何も押さずに確定するのがそのままおまかせ）。時間切れの自動代行は handMulti と同じ分岐に相乗りさせた。",
      "#357 の残りその1: 色落ちキャットの ALL_PLAYERS_DISCARD_HAND_AND_DRAW も順番を選べるようにした。相手の手札は使用者の画面では cardId がマスクされていて見えないため、合同建設と同じ delegateToPlayer に新しい taskType \"discard-hand-ordered\" を足して**本人の画面**で聞く（main.js の runDiscardWholeHandOrderedTask）。委任が届かなかった／時間切れ／委任の仕組みを持たない呼び出し元でも「全て捨てる」というルールは守るため、委任の後に従来どおりの全捨てループを残してある（通常は空振り）。常設テストに検査を追加し、A/Bで確認済み——委任の呼び出しを外すと 58/59 で落ちる。",
      "#357 の総点検。複数枚捨てる経路を全部洗い出したところ、engine 側は前回（#344）点検済みで、漏れていたのは2か所——(a) main.js の flushPendingTurnEndDiscards（ヴァーディアン first-green の PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END。Set の挿入順で捨てていた）※この動詞を使うのはヴァーディアンだけ。コード中の古いコメントが「奇跡の森マンズウッド専用」のままで最初そう書いてしまい、ユーザー指摘で気づいた（マンズウッド eternal-green は「【追色１】１枚ドロー。」）。紛らわしいコメント9か所も直した(b) engine の禁断の果実マルメゴ（橙が出たら手札を全捨て。手札の並び順だった）。どちらも既存の pickHandCardsOrdered を同じ形で挟んだ。残り: 色落ちキャットの ALL_PLAYERS_DISCARD_HAND_AND_DRAW は全員対象なので delegateToPlayer の新しい taskType が要る（未対応・ユーザー判断待ち）。ワイナウエア／白の意思の覚醒は盤面のカードを捨てるので手札ピッカーでは扱えない（同上）。DISCARD_OWN_HAND は効果変更で未使用。",
      "落とし穴を1つ潰した: 自動処理モード（既定）では自分の公開ドローは .hand-reveal-area ではなく**手札の扇の中**に描かれる（inlineRevealTokens）。拾えていないとピッカーが対象0件で素通りし「直したつもりで何も起きない」になる。扇の中の札も className に hand-card が付いているため requestHandCardsOrderedForEffect の検索式で拾えることを実測で確認した（公開ドローに2枚置いて、扇の中2枚・公開エリア0枚・2枚とも検索式にヒット）。",
      "マルメゴ側は常設テストに検査を足した（test/effect-cases.mjs、橙が出て手札全捨て→pickHandCardsOrdered が選んだ順で1回だけ呼ばれる）。A/Bで確認済み——engine 側の呼び出しを外すと 58/59 で落ちる。",
      "CHANGELOG の項目に fixes / fixesEn を追加した（items / itemsEn と同じ形）。表示は「不具合を修正しました」＋「詳細」ボタンの開閉で、件数は出さない（数が見えると結局「たくさんある」印象になる＝ユーザー判断）。管理者の devItems はこの詳細の中に続けて入れ、開く場所を1つにまとめた。fixes が無い回（過去の分）は従来どおり devItems をそのまま出す。generalEntries() と currentSignature() も fixes を見るように直した——items だけで判定したままだと「全部が不具合の直し」の回がその日付ごと消え、NEWも付かない。過去75件の振り分けはしない（itemsEn を足した時と同じ方針＝ユーザー判断）。",
    ],
    devItemsEn: [
      "Part of #358: the long-press enlargement now opens on the opposite side from where you pressed (positionPreviewPanel in main.js; while previewFollowsTouch is set it overrides the user's side preference). The flag is raised when the long press opens the preview and cleared on release or on interruption such as a pinch. Mouse hover still follows the setting, since a cursor never covers the panel. Measured at 844px wide: pressing at 169 puts the panel's centre at 219 (to the right), pressing at 675 puts it at 625 (to the left); with a mouse both stay on the configured right side. The other half of #358 (the size setting not applying to long press) could not be reproduced — the same #card-preview element and --card-preview-size variable are shared — so the user was asked what they actually see.",
      "#357, part three: added a modal for ordering board cards before they are discarded (requestBoardCardsOrderedForEffect in main.js, picker type boardMulti), called from Winauea (all cards on a chosen square) and the Awakening of the White Will (DISCARD_ALL_FACEUP_ON_BOARD). It is separate from the hand picker because Winauea targets a stack on one square where only the top card can ever be tapped on the board. It reuses the #stack-modal look and renders each card according to its own faceUp, so face-down cards stay hidden even when spread out. It asks whenever there are two or more cards. An earlier version also required at least one face-up card; that was wrong and was removed after the user pointed it out — several effects place cards face down on the board (Choosable Trap, Party, Harvest and Sow, Joint Construction), so a face-down card is not necessarily unknown and the player may well remember what is there. A permanent test covers the all-face-down case, confirmed A/B (restoring the old condition drops the suite to 59/60). For Winauea the stack is reversed before being passed, since later entries in state.tokens sit on top. There is no Auto button: anything left untapped is discarded in the order displayed, so confirming without tapping is already the automatic choice. The priority-timeout fallback rides on the same branch as handMulti.",
      "#357, part two: the Faded Cat's ALL_PLAYERS_DISCARD_HAND_AND_DRAW can now be ordered as well. The user of the card cannot be asked, because other players' hands come with masked cardIds, so a new delegateToPlayer task type (discard-hand-ordered) asks each player on their own screen (runDiscardWholeHandOrderedTask in main.js). The original discard-everything loop is kept after the delegation so the rule still holds if the delegation never arrives, times out, or the caller has no delegation helper (normally it finds nothing left). A permanent test was added and confirmed A/B — removing the delegation call drops the suite to 58/59.",
      "#357 sweep. Every path that discards several cards at once was reviewed: the engine had already been covered by #344, and two places had been missed — (a) flushPendingTurnEndDiscards in main.js (Vardian first-green, PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END, which discarded in Set insertion order; it is the only card using that verb — stale comments all over the code still called it Manzwood-only, which is what I wrote at first until the user caught it, since Manzwood eternal-green is simply a one-card draw; nine misleading comments were corrected) and (b) Marumego in the engine (discard the whole hand when an orange card appears, which used the hand's display order). Both now wrap the existing pickHandCardsOrdered the same way. Left open: the Faded Cat's ALL_PLAYERS_DISCARD_HAND_AND_DRAW targets everyone, so it would need a new delegateToPlayer task type (not done, pending the user's call); Winauea and the White Awakening discard cards on the board, which the hand picker cannot address (same).  DISCARD_OWN_HAND is unused since the card's effect changed.",
      "One trap closed: in auto-processing mode (the default) your own public draws are rendered inside the hand fan, not in .hand-reveal-area (inlineRevealTokens). If they were not picked up, the picker would see zero candidates and silently do nothing. Measured that they are found by requestHandCardsOrderedForEffect's selector because the fan cards also carry the hand-card class (two cards placed in publicDraw: two in the fan, zero in the reveal area, both matched).",
      "The Marumego side gained a permanent test (test/effect-cases.mjs: an orange card appears, the hand is discarded, and pickHandCardsOrdered is called once with the chosen order). Confirmed A/B — removing the engine call drops the suite to 58/59.",
      "Added fixes / fixesEn to each CHANGELOG entry (same shape as items / itemsEn). They render as a single line plus a Details toggle, with no count shown (a count would still read as \"lots of bugs\" — user's call). An admin's devItems now live inside that same Details box so there is only one thing to open; entries without fixes (the older ones) still show devItems directly as before. generalEntries() and currentSignature() now consider fixes too: judging by items alone would hide any entry that is entirely bug fixes, and it would not get the NEW badge. Past entries are not reclassified, matching how itemsEn was introduced (user's call).",
    ],
  },
  {
    date: "2026-09-27",
    fixes: [
      "接触の時に、攻める駒が相手に向かって動いて見えるようになりました。",
      "タイマーを切っている対戦で、相手が考えている途中に選択が飛ばされてしまうのを直しました。",
      "持ち時間が切れて代わりに選ばれた時に、誰の選択が時間切れになったかをお知らせします。",
    ],
    fixesEn: [
      "On contact, the attacking piece now visibly moves toward its target.",
      "In matches played without the timer, a choice is no longer skipped while someone is still thinking.",
      "When someone runs out of time and a choice is made for them, everyone is now told whose choice it was.",
    ],
    devItems: [
      "#360 の原因は、盤面のWebGL描画が「render() の合図と500msに1回のタイマー」でしか板を作り直さないこと。タックルはCSSトランジションでDOMを動かすだけなので絵が置いていかれる。A/B実測: タックルの5.4秒間に flushBoard3d() が走った回数は旧=0回／新=フレームごと。あわせて2つ穴を塞いだ——(a) flushNow は呼ばれるたびに盤面を丸ごと作り直す（実機で約28ms／通常フレーム36ms）ので毎フレームでは負荷がほぼ倍・120Hz機では毎秒120回になり #348 の教訓に逆行するため 30ms間隔（毎秒約33回）に制限 (b) requestAnimationFrame はタブを裏に回すと止まるので、rAF だけで待つと接触の最中にタブを移ると演出が止まって対局が進まない（オンラインでは相手も待たせる）。タイマーの保険（ms+250ms）と競争させた。実測: 保険なし=14秒経っても lunge-end が出ない／保険あり=5.2秒で完走。",
      "時間切れの告知は performPriorityTimeoutAutoAction() が picker を解決する所で announceEffectReasonForEffect を呼ぶ（オンラインは broadcast 経由で全員へ）。落とし穴: この関数は持ち時間切れの代行だけでなく**CPUが選ぶ時の本来の経路**でもあるため、isPseudoCpuTarget の席を除外しないとCPU戦でCPUの選択ごとに誤爆する。A/Bで実測——守りなし＝画面に2件表示（文言・名前とも正しい）／守りあり＝picker解決14回に対し0件。連続告知は8秒間隔で抑制（解決3回に対し表示2件で確認）。",
      "期限切れの委任は closeExpiredDelegationUi を「何も選ばず閉じる」から「自動操縦」に変更した（開いた picker を performPriorityTimeoutAutoAction で片端から解決し、「このマスでいいですか？」は新設の acceptOpenCellConfirm で承諾する。取り消すと「選んだのに置かれない」になるため）。ただし発火が8秒以上遅れていたら＝端末が眠っていて頼んだ側（90秒）はもう諦めている、と判断して従来どおり何も選ばずに閉じる（#352 の「後から遅れて置かれる」の再発防止）。自動操縦の時間を確保するため受け手の期限を85→70秒へ前倒しし、自動操縦は15秒で打ち切る（70+15=85秒 < 90秒）。",
      "期限の固定値（85→70秒）をやめ、本人の持ち時間に連動させた（ユーザー指示）。turn-timer.js に getPriorityClockBudgetMs()＝基本時間＋延長×砂時計の数（オンラインは同期 timer_config を見るので両者で同値）を新設し、受け手 delegationReceiverDeadlineMs()＝持ち時間+10秒（下限70秒）／頼んだ側 delegationCoordinatorGiveUpMs()＝受け手+自動操縦15秒+5秒／接触ピック contactPickWaitMaxMs()＝持ち時間+10秒（下限90秒）をそこから導く。70秒に決めた時に砂時計の延長を数え忘れており、**既定設定（30/30/3＝本人は最大120秒考えられる）でも保険が本人を追い越していた**。実測: 既定→受け手130秒／最大120/120/3→490秒／短め10/10/1→70秒（下限）。",
      "正直な限界: 自動操縦そのものはオンライン専用の経路（2クライアントが必要）で、手元では端から端まで再現できていない。告知とCPU誤爆の守りは上記のとおり実測済み。",
      "#366 の原因は、#352 で入れた保険の期限（頼まれた側 DELEGATION_RECEIVER_DEADLINE_MS=85秒・頼んだ側90秒）がタイマー設定をまったく見ていなかったこと。実ログの経過85.211秒が85秒の期限と一致し、その対局は timerConfig.enabled=false、相手は isPseudoCpuTarget=false＝実プレイヤーだった。isTurnTimerEnabled() が偽なら期限を張らない形にし、頼んだ側・頼まれた側を対称にした。#352 の原因は待つことではなく片方だけが諦めたことだったので、対称化は再発ではなく原因の除去になる。接触ピックの CONTACT_PICK_WAIT_MAX_MS も同じ扱いにした。3か所すべて isOnlineMode() の中なのでローカル戦・スモークテストには影響しない。",
      "直したはずの #361〜#365 が handled-bug-reports.js に入っておらず、ダッシュボードの対処済み表示が実態と合っていなかったので追記した。",
    ],
    devItemsEn: [
      "Root cause of #360: the WebGL board only rebuilds its quads on a render() signal or a 500ms timer, while the tackle merely animates the DOM through a CSS transition, so the picture is left behind. Measured A/B: during the 5.4s tackle, flushBoard3d() ran 0 times on the old code and once per frame on the new one. Two further holes were closed: (a) flushNow rebuilds the whole board on every call (~28ms on the user's device against a 36ms frame), so flushing every frame roughly doubles the load and would mean 120 rebuilds per second on a 120Hz phone, against the lesson of #348 — it is now capped to one per 30ms (~33/s); (b) requestAnimationFrame stops when the tab is hidden, so waiting on rAF alone meant switching tabs mid-contact froze the animation and stalled play (and online it stalls the opponent too). It now races a timer fallback (ms+250ms). Measured: without the fallback no lunge-end after 14s; with it, the lunge completes in 5.2s.",
      "The timeout notice is emitted where performPriorityTimeoutAutoAction() resolves a picker, via announceEffectReasonForEffect (broadcast to everyone when online). Pitfall: that function is not only the time-out stand-in but also the normal path by which the CPU makes its choices, so without excluding isPseudoCpuTarget seats it fires on every CPU choice in a CPU match. Measured A/B: without the guard, 2 notices actually rendered (correct wording and name); with the guard, 0 across 14 picker resolutions. Repeats are throttled to one per 8 seconds (confirmed: 3 resolutions, 2 notices).",
      "For an expired delegation, closeExpiredDelegationUi no longer closes without choosing; it now engages an autopilot that resolves each open picker through performPriorityTimeoutAutoAction and accepts an open cell confirmation via the new acceptOpenCellConfirm (cancelling would mean the player chose a cell yet nothing was placed). If the timer fires more than 8s late, the device was asleep and the coordinator (90s) has already given up, so we keep the old behaviour and close without choosing, to avoid reintroducing the late placement of #352. To give the autopilot room, the receiver deadline moved from 85s to 70s and the autopilot stops after 15s (70+15=85s < 90s).",
      "The fixed deadlines (85s, then 70s) were replaced by values derived from the player's own clock (user's instruction). turn-timer.js gained getPriorityClockBudgetMs() = base time + extension x hourglass stock (online reads the synced timer_config, so both sides agree), and main.js derives everything from it: receiver delegationReceiverDeadlineMs() = clock + 10s (floor 70s), coordinator delegationCoordinatorGiveUpMs() = receiver + 15s autopilot + 5s, contact pick contactPickWaitMaxMs() = clock + 10s (floor 90s). When 70s was chosen the hourglass extension had been overlooked, so even at the default settings (30/30/3, where a player may think for up to 120s) the safety net overtook the player. Measured: default gives a 130s receiver deadline; 120/120/3 gives 490s; 10/10/1 falls back to the 70s floor.",
      "Honest limitation: the autopilot itself is an online-only path (it needs two clients) and was not reproduced end to end locally. The notice and the CPU-misfire guard were measured as described above.",
      "Root cause of #366: the safety deadlines added for #352 (receiver DELEGATION_RECEIVER_DEADLINE_MS=85s, coordinator 90s) never consulted the timer setting. In the real log the elapsed time was 85.211s, matching the 85s deadline exactly, while that match had timerConfig.enabled=false and the other player was isPseudoCpuTarget=false, i.e. a real human. The deadlines are now only armed when isTurnTimerEnabled() is true, and the coordinator and receiver sides were made symmetric. Since #352 was caused by one side giving up while the other did not, making them symmetric removes its cause rather than reintroducing it. CONTACT_PICK_WAIT_MAX_MS for the contact pick got the same treatment. All three sites are inside isOnlineMode(), so local matches and the smoke test are unaffected.",
      "#361 through #365 had been fixed but were missing from handled-bug-reports.js, so the dashboard's handled status did not match reality; added them.",
    ],
  },
  {
    date: "2026-09-26",
    summary: [
      "対局中に盤面の画角が勝手に動かないようにしました。",
      "誘惑の黒の烙印でドローする時、お知らせが二重に出ていたのを直しました。",
      "「手品師の技 -スリカエ-」で、CPUが相手の欲しい色を渡してしまうのを直しました。",
      "カードの絵を新しいイラストに差し替えました。",
      "カードの名前が、新しい絵の上でも読めるようになりました。",
    ],
    summaryEn: [
      "The board no longer zooms in and out on its own during a match.",
      "Drawing with the Brand of the Tempting Contract no longer announces the draw twice.",
      "In \"Magician's Trick -Sleight-\", the CPU no longer hands you a colour you still need.",
      "Replaced the card art with the new illustrations.",
      "Card names are now readable on the new art.",
    ],
    items: [
      "盤面の見え方（画角）が、カードを引いたり手札が増えたりするたびに少し大きくなったり小さくなったりしていたのを直しました。対局中は画角が動かなくなり、手札が画面の端で見えなくなりそうな時は、盤面ではなくその手札だけが少し内側へ寄ります。",
      "誘惑の黒の烙印でドローする時、「ドローします」のお知らせが1回のドローにつき二重に出ていたのを直しました（烙印が2枚あると4回出ていました）。烙印のお知らせ1つにまとめました。",
      "「手品師の技 -スリカエ-」で、CPUが相手のまだロックしていない色のカードを進んで渡してしまうことがあったのを直しました。渡す相手が欲しがっている色は、他に渡せる札がある限り選ばなくなります。",
      "カードの絵を新しいイラストに差し替えました。手札・盤面・拡大表示・山札一覧、どこを見ても新しい絵になります。",
      "カードの名前が、新しい絵の帯の上でも読めるように白字になりました。",
    ],
    itemsEn: [
      "The board no longer zooms in and out slightly every time you draw a card or your hand changes size. The camera now stays put during a match; if a hand would slip off the edge of the screen, that hand alone shifts inward instead of the whole board shrinking.",
      "Drawing with the Brand of the Tempting Contract announced \"drawing a card\" twice for a single draw (four times when you had two brands). It is now a single announcement from the brand itself.",
      "In \"Magician's Trick -Sleight-\", the CPU could willingly hand you a colour you had not locked yet. It now avoids giving away a colour the recipient still needs, as long as it has anything else to give.",
      "All card art has been replaced with the new illustrations — your hand, the board, the zoomed view and the card list all use them now.",
      "Card titles are now drawn in white so they stay readable on the new, darker title bar.",
    ],
  },
  {
    date: "2026-09-24",
    items: [
      "「手品師の技 -スリカエ-」「ゴメンナサイッ！」「選べる罠」「増殖する樹々」の文章を、実際のカードに印刷される文章に合わせました。効果の内容・処理は変わりません。",
    ],
    itemsEn: [
      "The wording on \"Magician's Trick -Sleight-\", \"So Sorry!\", \"Choosable Trap\" and \"Growing Trees\" now matches the printed cards. How the cards actually work is unchanged.",
    ],
  },
  {
    date: "2026-09-23",
    summary: [
      "「このマスでいいですか？」に答えるまで、ゲームが先へ進まなくなりました。",
      "複数枚捨てる時の順番の番号が、手札が重なっていても読めるようになりました。",
      "CPU戦で、相手がカウンターロックした瞬間に画面が固まることがあったのを直しました。",
    ],
    summaryEn: [
      "The game now waits until you answer \"Use this square?\".",
      "The discard-order numbers are readable even when your cards overlap.",
      "Fixed a freeze that could happen the moment a CPU counter-locked.",
    ],
    items: [
      "「このマスでいいですか？」の確認を出している間は、ゲームの自動進行が待つようにしました（答えていないのにターンが進んでしまうのを防ぎます）。あわせて、答えないまま次のターンへ進んだ時に確認が画面に残り続けることがあったのも直し、確認が2つ同時に出ることもなくなりました。",
      "カードを複数枚捨てる時に付く順番の番号（①②③…）が、手札が重なっていると読めなかったのを直しました。選んだカードが手前に出て、番号もカードの上端に大きく表示されます。",
      "CPU戦（物語のエイドス戦を含む）で、こちらの接触を相手がカウンターロックで防いだ瞬間に画面が固まり、不具合報告のボタンを含めて何も押せなくなることがあったのを直しました。相手が選ぶ場面が残ったままになっていたのが原因で、今後はその選択が自動で進みます。",
    ],
    itemsEn: [
      "While the \"Is this the square?\" confirmation is open, automatic progression now waits for your answer, so play can no longer move on before you have chosen. The confirmation also closes by itself if the turn does change, and two confirmations can no longer be open at once.",
      "When discarding several cards, the order numbers could be hidden behind overlapping cards in your hand. Selected cards now come to the front, and the number sits at the top of the card in a larger badge.",
      "In CPU matches (including the Eidos story battle), the screen could lock up the moment your contact was blocked by Counter Lock — nothing was clickable, not even the bug report button. The opponent's pending choice was never resolved; it now resolves automatically.",
    ],
  },
  {
    date: "2026-09-21",
    summary: [
      "チュートリアルで、ドラッグしてロックしても案内が先へ進むようになりました。",
      "対戦が始まった後も「開始を待っています…」が残ることがあったのを直しました。",
      "満席の部屋を押した時は、観戦するかどうかをおたずねするようにしました。",
      "観戦中に選択を求められることがあったのを直しました。",
      "観戦中、誰の視点からでも盤面を見られるようになりました。",
      "手札から1枚選ぶ最中に、別のカードの効果が始まってしまうのを直しました。",
    ],
    summaryEn: [
      "In the tutorial, dragging a card into the lock area now advances the guide too.",
      "Fixed the \"waiting to start...\" notice staying on screen after the match had begun.",
      "Choosing a full room now asks whether you would like to spectate.",
      "Spectators are no longer asked to make choices.",
      "While spectating, you can now view the board from any player's seat.",
      "Fixed another card's effect starting while you were choosing a card from your hand.",
    ],
    items: [
      "チュートリアルで「紫のカードをロックしましょう」の場面のとき、カードをタップせずに自分でロックエリアへドラッグしてロックすると、案内がそこから先へ進まなくなっていたのを直しました。どちらのやり方でロックしても先へ進みます。",
      "対戦が始まった後も「◯◯さんがゲームを開始するのを待っています…」の案内が画面に出たままになることがあったのを直しました（席が足りず参加できなかった時や、観戦している時）。",
      "対戦できるのは4人までです。満席の部屋を押した時は、これまで席が無いまま入ってしまっていましたが、満席であることをお伝えして「観戦しますか？」とおたずねするようにしました。",
      "観戦中に、全員が対象のカード効果などで観戦者にも選択を求められることがあったのを直しました。観戦中は対局に一切関わりません（見るだけです）。",
      "観戦中に、誰の視点からでも盤面を見られるようにしました。画面上の観戦バーに並ぶプレイヤー名を押すと、その人から見た向きに切り替わります。",
      "セレナーデなどで「手札から1枚選ぶ」場面の最中に、別の手札カードの効果が勝手に始まってしまうことがあったのを直しました（選ぼうとしたカードが場に置かれ、ロックできなくなっていました）。",
    ],
    itemsEn: [
      "In the tutorial step that asks you to lock the purple card, dragging it into your lock area yourself (instead of tapping it) left the guide stuck at that step. Either way of locking now moves the guide forward.",
      "Fixed the \"Waiting for ... to start the match…\" notice staying on screen after the match had already begun (when there was no seat left for you, or while watching a match).",
      "A match seats up to four players. Tapping a full room used to let you in without a seat; now it tells you the room is full and asks whether you would like to watch instead.",
      "While watching a match, you could be asked to choose for effects that target every player. Spectators now take no part in the match at all.",
      "While watching, you can now view the board from any player's side — tap a player's name in the spectator bar to switch.",
      "Fixed another card's hand effect starting on its own while you were choosing a card from your hand (for example paying Serenade's cost), which put the card you meant to pick onto the board and left you unable to lock it.",
    ],
  },
  {
    date: "2026-09-18",
    items: [
      "色落ちキャットやなないろの巨光が自分を捨てた後、その下にあった表向きのカード（ジャンプ台など）の到達効果が起きていなかったのを直しました。手札に加えるカードと同じく、下から現れたカードにも到達します。",
      "オンライン対戦で合同建設などの「相手が選ぶ」場面の時、相手がしばらく操作しないと、相手の画面に選択が開いたまま残り、戻ってきた時に遅れて置かれたり、自分の番の移動先が選べなくなったりしていたのを直しました。時間切れになった選択は、相手の画面でも自動で閉じるようになります。",
      "iPhoneで対戦中のBGMが鳴らないことがあったため、画面をタップした時にBGMを鳴らし直す仕組みを見直しました。",
    ],
    itemsEn: [
      "After Faded Cat or Prismatic Radiance discarded itself, the face-up card underneath it (such as Jump Pad) did not trigger its arrival effect. Now the card revealed underneath triggers, just as it does when a card is added to your hand.",
      "In online matches, when an opponent had to make a choice (such as Joint Construction) and stayed idle, the choice stayed open on their screen. When they came back, a card could be placed late, or they could not pick where to move on their own turn. Now a choice that has timed out closes on their screen as well.",
      "The match BGM sometimes stayed silent on iPhone. We reworked how the BGM restarts when you tap the screen.",
    ],
  },
  {
    date: "2026-09-16",
    items: [
      "iPhoneなどで画面を長押しした時に、文字が青く選択されたり、端末のメニューが出たりしないようにしました（名前を入力する欄などは今までどおり選べます）。",
      "「このマスでいいですか？」の確認で、指を長めに置いたまま離すと、下にあったボタンが押されてしまうことがあったのを直しました。確認が出た後に改めてタップしたボタンだけが反応します（知らないうちに「今後表示しない」になってしまうことがありました）。",
    ],
    itemsEn: [
      "Long-pressing the screen on iPhone and similar devices no longer highlights text in blue or opens the device's menu (fields you type into, such as your name, still work as before).",
      "In the \"Is this square OK?\" confirmation, holding your finger down a little longer before lifting it could press the button underneath. Now only a tap made after the confirmation appears counts (this could silently switch the confirmation off).",
    ],
  },
  {
    date: "2026-09-14",
    items: [
      "マルメゴでカードを公開していく時、画面中央でめくられる前に、そのカードが手札に見えてしまっていたのを直しました。ザ・ギャンブルと同じく、全部めくり終わってから並ぶようになります。",
      "マルメゴで橙のカードが出て手札をすべて捨てた後、もう何もできないハンドフェイズが自動で進まず止まっていた不具合を直しました。",
      "3D表示の盤面が、何も動いていない間も休まず描き直していたのをやめました。対戦中の端末の発熱や電池の減りが抑えられます（見た目は変わりません）。",
    ],
    itemsEn: [
      "When Malmego reveals cards, each card could be seen in your hand before it was flipped in the center of the screen. Now, like The Gamble, they line up only after every flip is done.",
      "Fixed the hand phase getting stuck after Malmego turned up an orange card and your whole hand was discarded, even though there was nothing left to do.",
      "The 3D board no longer keeps redrawing while nothing is moving. This reduces device heat and battery drain during matches (it looks the same).",
    ],
  },
  {
    date: "2026-09-11",
    items: [
      "登録しなくても遊べる入口を用意しました。戦績管理システムの「デジタルアプリ版をテストプレイする」から開くと、ログインの代わりに「遊び方を教わりながら遊ぶ」「すぐにCPUと対戦する」が出て、そのまま遊び始められます。ログインしている方は、今までどおりの画面になります。",
      "物語チュートリアルで遊び方を教わった後、エイドス戦に入った時にもう一度チュートリアルが始まっていた不具合を直しました。",
      "チュートリアルで説明している場所（フェイズのアイコンなど）が、ちゃんと明るく照らされるようにしました。これまでは周りと一緒に暗くなっていて、どこを指しているのか分かりにくいことがありました。",
      "物語チュートリアルの説明の枠を、明るい配色の時は明るい見た目にしました（これまでは暗いままでした）。",
      "登録しなくても遊べる入口の画面で、「開発中のアプリです」という案内を大きく出すようにしました。「ログインして、すべての機能を使う」も、他のボタンと同じ大きさのボタンにしています。",
      "タイトル画面の左上にある「日本語／English」を押すと、言語が切り替わるようにしました（これまでは押しても反応しませんでした）。",
    ],
    itemsEn: [
      "Added a way to play without signing up. Open the app from the Battle Records site's test-play button and, instead of logging in, you can choose Learn as you play or Play the CPU now and start right away. If you are already logged in, nothing changes.",
      "Fixed the tutorial starting over again when you entered the battle with Eidos after finishing the story tutorial.",
      "The part of the screen a tutorial step is explaining (such as the phase icons) is now properly lit up. It used to be dimmed along with everything else, which could make it hard to tell what was being pointed at.",
      "The story tutorial's explanation box now uses the light look when the light color scheme is on (it used to stay dark).",
      "The no-sign-up entry screen now shows a large notice that the app is still in development. Log in to use every feature is now a full-size button like the others.",
      "Tapping the 日本語 / English switch at the top left of the title screen now changes the language (before, it did not respond).",
    ],
  },
  {
    date: "2026-09-09",
    items: [
      "アプリの起動が軽くなりました。ホーム画面の背景画像が約9分の1の大きさになり、開いてから表示されるまでが速くなります（見た目は変わりません）。",
      "BGMの通信量を大きく減らしました。音楽データが合計で3分の1以下になり、モバイル回線でも軽く鳴り始めます（曲は同じものです）。",
      "BGMが鳴り始めるときに、そっと音が立ち上がるようになりました。いきなり最大音量で始まる唐突さがなくなります。",
      "端末によってはBGMが鳴らないことがあったため、その端末で鳴らせない時は自動で別の形式に切り替えて必ず鳴るようにしました。",
      "アプリを一度離れて戻ってきた時に、BGMだけ聞こえなくなることがあった不具合を直しました。",
      "動きの重い端末で、BGMの出だしが長いあいだほとんど無音のままだった不具合を直しました。どの端末でも同じ速さで鳴り切ります。",
      "ロックするカードを選んだ後、右下の「スキップ」ボタンが消えるようになりました（もうすることが無い場面なのに押せて、迷わせていました）。",
      "CPU戦でも「白黒カード」「ブースト」「マイデッキ」「自分にも持ち時間」を選べるようになりました。CPU戦を始める画面の「対戦ルール」から、押すたびに入／切が切り替わります。",
      "手札を何枚もまとめて捨てる時の選び方を変えました。捨てたい順にカードを押していくと①②③…と番号が付き、最後に「これで捨てる」を1回押すだけで確定します（これまでは1枚選ぶたびに確認が出ていました）。押し間違えたカードはもう一度押せば外れ、後ろの番号が繰り上がります。",
      "ゴメンナサイを使った時の演出を少し長くしました。カードが大きく止まっている時間が伸びて、何が起きたのか読み取りやすくなります。",
      "対戦が始まる前の「今回のメンバー」の紹介を少し長くしました（これまでどおり、画面をタップすれば飛ばせます）。",
      "勝利演出で7色が1つずつ灯る時の音を作り直しました。1音ごとに音程がずり下がって安っぽく聞こえていたのをやめ、低く響く「バフン」という音にしています。7色が同時に灯る最後の瞬間は、一段低く長い音で締めます。",
    ],
    itemsEn: [
      "The app now loads lighter. The home screen background image is about nine times smaller, so it appears sooner after opening (it looks the same).",
      "Cut the data used by the music. The audio is now under a third of its former size, so it starts quickly even on mobile data (same tracks as before).",
      "Music now eases in when it starts, instead of jumping straight to full volume.",
      "Music failed to play on some devices, so the app now switches to another audio format automatically when a device cannot play the first one.",
      "Fixed the music going silent after you left the app and came back.",
      "Fixed the music staying almost silent for a long time at the start on slower devices. It now reaches full volume in the same time everywhere.",
      "The Skip button in the bottom right now disappears once you have chosen a card to lock (it used to stay pressable when there was nothing left to do).",
      "CPU matches can now use Black & white cards, Boost, My Deck, and a timer on your own turns. Toggle each one under Match rules on the CPU match screen.",
      "Changed how you discard several cards at once. Tap them in the order you want to discard and they get numbered 1, 2, 3...; then press Discard in this order once to confirm (it used to ask for confirmation after every single card). Tap a card again to unselect it, and the rest renumber.",
      "The Sorry! card now holds on screen a little longer when played, so it is easier to see what happened.",
      "The pre-match line-up now stays on screen a little longer (tap anywhere to skip it, as before).",
      "Reworked the sound of the seven colours lighting up one by one in the victory sequence. Each note used to slide down in pitch, which sounded cheap; it is now a low, soft thump, and the final all-colours flash closes on a deeper, longer one.",
    ],
    devItems: [
      "起動時に何が落ちてくるかを実測したところ 10.1MB で、その単体最大が assets/home-bg.png（2104KB）でした。他の画像は既にWebP化済みで、これだけPNGのまま残っていたものです。WebP(quality 92)へ変換して230KBになりました（3倍に拡大して元と見比べ、紙の質感・金線とも差が分からないことを確認済み）。元のPNGは、古いCSSがキャッシュされている端末のために assets/ へ残してあります。",
      "BGMを mp3(188〜256kbps) から AAC(.m4a, 96kbps) へ変換しました（15.68MB→5.59MB）。待機BGMは5:23の原曲から113秒のループ素材に切り出し、末尾3秒を先頭へクロスフェードして繋ぎ目を消してあります。変換は新設の tools/shrink-audio.mjs で行い、ループ点の決め方（周波数指紋の類似度で採点）もそこに書いてあります。",
      "【管理者向け】フェードインは src/sound.js の再生開始時に入れてあり、ファイルには焼き込んでいません（焼き込むとループのたびにフェードインして繋ぎ目が復活するため）。タイマーはフェードアウトと共有し、目標音量は毎回読み直すので、フェード中に音量スライダーを動かしても巻き戻りません。",
      "【管理者向け】以前の音は打撃音用の合成関数（鳴っている間に音程が0.6倍まで滑り落ちる）を鐘に流用していたのが原因でした。管理者モードの「🏆 勝利演出: 色が灯る音（聴き比べ）」から 低い「バフン」／澄んだ鐘／鐘＋きらめき／以前のまま を試聴して選べます。バフンは、低音だけだとiPhone本体のスピーカーで聞こえないため（300Hz以下がほとんど出ない）、400Hzより上の層を足して実測で調整してあります。",
      "【管理者向け】「BGMが鳴っていない」の報告を手元で再現できなかったため、行動ログに diag-bgm（鳴らし始めた3秒後の src / paused / readyState / エラー番号 / gain / 目標音量 / AudioContextの状態）と diag-bgm-fallback を残すようにしました。次の報告で「始まっていない・音量0・AudioContextが止まっている・ファイルを再生できない」のどれかが推測なしで分かります。",
      "【管理者向け】画面が隠れた時に AudioContext を suspend しているのに、戻った時に resume していませんでした。BGMは createMediaElementSource を通しているため、context が止まったままだと「再生中なのに完全に無音」になります（paused では検知できない）。戻った時に resume するようにしました。",
      "【管理者向け】フェードインの進み具合を「setInterval が呼ばれた回数」から「実際に経過した時間」に変えました。1フレーム135〜190msかかる端末では回数方式だと1.4秒のつもりが数秒〜十数秒かかり、その間ほぼ無音になります。実測で、3秒後の音量が目標の半分(0.061/0.12)から目標そのもの(0.12)になりました。",
      "【管理者向け】#342: スキップボタンの表示条件に、マイデッキボタン(#320)と同じ3つ（送信中／このフェイズで既にロック済み／ロックの代わりにマイデッキから引いた）を足しました。演出待ちでフェイズがまだ lock のまま残っている窓を塞ぎます。",
      "【管理者向け】CPU戦の4つは cpu-battle-state.js に永続フラグとして持ち（localStorage＋アカウント同期）、白黒・ブーストは quickStart の引数、マイデッキは setupMyDeckMode（3人・4人戦でも全席ぶん配る）、持ち時間は turn-timer.js の isSelfTimeLimitExempt を外す形で効かせています。「自分にも持ち時間」を選んだ時は基本時間の15分上書き（HUMAN_BASE_SECONDS）もしません。A/B実測: 席数2→3／白黒0→2枚／ブースト札0→6枚／マイデッキ無し→A・B・C全員ぶん／基本時間900→30秒。免除が外れることも実測（切=残り−12秒でも何も起きずターン1で停止、入=時間切れで処理が進み手番がCへ）。",
      "【管理者向け】#344: 順番付きの複数選択ピッカー（main.js の requestHandCardsOrderedForEffect、picker type=\"handMulti\"）を新設し、engine 側の1枚ずつのループ（続き469）を置き換えました。CPUが選ぶ番なら画面に出さずその場で順番を決め、持ち時間切れの自動代行にも受け口があります。常設テストも pickHandCardsOrdered を検査する形に更新し、engine 側の呼び出しを外すと 57/58 で落ちることをA/Bで確認済みです。",
    ],
    devItemsEn: [
      "Measured what actually downloads at startup: 10.1MB, whose single largest file was assets/home-bg.png (2104KB) — the only image never converted to WebP. Re-encoded at quality 92 for 230KB (verified against the original at 3x zoom: paper grain and gold linework are indistinguishable). The original PNG stays in assets/ for devices holding a cached copy of the old CSS.",
      "Converted the music from mp3 (188-256kbps) to AAC (.m4a, 96kbps): 15.68MB down to 5.59MB. The waiting theme is now a 113-second loop cut from the 5:23 original, with its last 3 seconds crossfaded onto the head so the seam disappears. Conversion runs through the new tools/shrink-audio.mjs, which also documents how the loop points were chosen (spectral-fingerprint similarity scoring).",
      "[Admin] The fade-in lives in src/sound.js at playback start, not baked into the files — baking it in would re-introduce a fade on every loop. It shares the fade-out timer per track and re-reads the target volume each step, so moving the volume slider mid-fade is not undone.",
      "[Admin] The old sound was built on the percussion helper, whose pitch slides down to 0.6x while it rings — that slide was the cheap part. Admin mode now has a listening comparison (low thump / clear bell / bell with sparkle / previous version) with a preview button. The thump carries added content above 400Hz, tuned by measurement, because iPhone speakers reproduce almost nothing below 300Hz.",
      "[Admin] Could not reproduce the \"no music\" report locally, so the action log now records diag-bgm (src / paused / readyState / error code / gain / target volume / AudioContext state, three seconds after playback starts) and diag-bgm-fallback. The next report will say without guesswork whether it never started, the volume is zero, the AudioContext is suspended, or the file cannot be decoded.",
      "[Admin] The AudioContext was suspended when the page hid but never resumed when it came back. Music runs through createMediaElementSource, so a suspended context means \"playing yet completely silent\" - invisible to a paused check. It now resumes on return.",
      "[Admin] Fade-in progress is now driven by elapsed time rather than by how many times setInterval fired. On a device spending 135-190ms per frame the step-counting version stretched a 1.4s fade into many seconds of near-silence. Measured: volume three seconds in went from half the target (0.061/0.12) to the target itself (0.12).",
      "[Admin] #342: the Skip button now also hides on the same three conditions the My Deck button uses (#320): submit in flight, already locked this phase, or drew from My Deck instead. This covers the window where the phase is still \"lock\" while the animation plays.",
      "[Admin] The four CPU-match rules live in cpu-battle-state.js as persisted flags (localStorage plus account sync). Black & white and Boost go through quickStart's arguments, My Deck through setupMyDeckMode (dealing a deck to every seat, including 3- and 4-player games), and the timer by skipping isSelfTimeLimitExempt in turn-timer.js. With the timer on, the 15-minute HUMAN_BASE_SECONDS override is also skipped. Measured A/B: seats 2 to 3, black/white 0 to 2 cards, boost 0 to 6, My Deck none to A/B/C, base time 900s to 30s; and the exemption really lifts (off: -12s remaining with nothing happening, stuck on turn 1; on: the turn times out and passes to C).",
      "[Admin] #344: added an ordered multi-select picker (requestHandCardsOrderedForEffect in main.js, picker type \"handMulti\") replacing the one-card-at-a-time loop from entry 469. CPU turns resolve it in place without any UI, and the priority-timeout fallback has a branch for it. The permanent test now checks pickHandCardsOrdered; removing the engine call drops it to 57/58, confirmed A/B.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "対戦が始まる前の「今回のメンバー」の見た目を整えました。ペットが大きくなり、ランク戦の段位バッジも大きく・見やすい位置になります。",
    ],
    itemsEn: [
      "Tuned the pre-match lineup: pets are much larger, and in ranked matches the rank badge is bigger and better placed.",
    ],
    devItems: [
      "「今回のメンバー」の調整値を既定として焼き込みました（ペットの大きさ 7→18rem・位置 -4.7/0.7rem、段位バッジ 4→9.1rem・段位名 0.8→1.3rem・位置 6.6/8rem）。あわせて上限に張り付いていたスライダーの幅を広げました——ペットの大きさ 18→30rem、段位バッジの大きさ 10→20rem、段位バッジの上下 ±8→−12〜24rem、左右 ±8→±16rem、段位名 2.5→4rem。",
      "「今回のメンバー」で段位バッジがペットの後ろに隠れていたのを、手前に描くようにしました。あわせて調整値を焼き直しています（段位バッジの大きさ 9.1→11.2rem・上下 8→18.2rem）。",
    ],
    devItemsEn: [
      "Baked the tuned lineup values in as defaults (pet size 7→18rem at -4.7/0.7rem; rank badge 4→9.1rem, its label 0.8→1.3rem, at 6.6/8rem). Widened the sliders that were pinned at their ceiling: pet size 18→30rem, rank badge size 10→20rem, rank badge vertical ±8→-12..24rem, horizontal ±8→±16rem, label 2.5→4rem.",
      "The lineup rank badge was being covered by the pet; it now draws in front. Re-baked the tuned values (rank badge size 9.1→11.2rem, vertical 8→18.2rem).",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "CPU戦で、CPUの番が毎回10秒ほど止まっていたのを直しました。ロックを終えたCPUがもう一度ロックしようとして空振りし、そのまま10秒待ってから次に進んでいました。",
      "ペット選択の画面・ショップ・マイページでも、大きな描き下ろしのイラスト（水彩画）が背景にうっすら出るようになりました。",
    ],
    itemsEn: [
      "Fixed the CPU pausing for about ten seconds on every one of its turns. Having already locked a card, it would try to lock a second one, come up empty, and then sit there until a ten-second safety net released it.",
      "The large watercolour pet artwork now also sits, softly, behind the pet picker, the shop and My Page.",
    ],
    devItems: [
      "管理者モードの「今回のメンバー」に位置調整を6本足しました（見出しの上下／名前まわりの左右／ペットの左右・上下／段位バッジの左右・上下）。既定はすべて0＝今までと同じ見た目です。",
      "原因は「ロックできる札を選ぶ→ performLockPhaseClick が already-locked-this-phase で断る→それでも自動処理は true を返す」形でした。呼び出し側（turn-timer）は1手打ったと見なしてラッチを立てるので、持ち時間が動かず10秒の安全網（diag-timeout-latch-retry）が下りるまで完全に止まっていました。ロック済みなら手前で避けるようにし、#334 で見えていた diag-lock-click-skip の連発も出なくなりました。",
    ],
    devItemsEn: [
      "Added six position sliders to the admin mode's lineup group: title vertical, name block horizontal, pet horizontal/vertical, rank badge horizontal/vertical. All default to 0, so nothing looks different until you move them.",
      "The cause: the auto-play picked a lockable card, performLockPhaseClick refused it with already-locked-this-phase, and the auto action still reported true. The caller latched it as \"a move was made\", so the clock never moved and nothing happened until the ten-second stuck-retry fired. It now bails out before choosing, which also stops the diag-lock-click-skip spam seen in #334.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "ランク戦の待ち時間に出る「豆知識」が読みにくかったのを直しました（明るい配色にしていると、文字が暗いままで背景に沈んでいました）。",
      "ランク戦では「今回のメンバー」に、参加者全員の段位バッジが出るようになりました。",
      "「今回のメンバー」に並ぶペットが、大きな描き下ろしのイラスト（水彩画）になりました。",
      "対戦が始まる前に「今回のメンバー」を出すようにしました。画面を人数ぶんに縦割りして、参加者のアバターが枠なしで大きく並びます（名前・駒の色・ペットつき）。画面をタップすればすぐ飛ばせます。",
      "Googleでログインした時に、Googleのプロフィール写真が自動で設定されるのをやめました。写真は選択肢の1つとして残るので、使いたい方はご自分で選べます。Googleの名前はもともと使っていませんでしたが、今後も一切読み取りません。",
      "初めてログインした時の「ニックネームとアバターを決める」案内が、Googleでログインした方以外にも出るようになりました。",
    ],
    itemsEn: [
      "Fixed the tips shown while waiting for a ranked match being hard to read - with a light colour scheme the text stayed dark against the dark waiting screen.",
      "In ranked matches, the pre-match lineup now shows every player's rank badge.",
      "Pets in the pre-match lineup are now shown as large, newly drawn watercolour artwork.",
      "Matches now open with a full-screen lineup: the screen splits into one tall panel per player, each filled edge to edge with their avatar, plus name, piece colour and pet. Tap anywhere to skip it.",
      "Signing in with Google no longer applies your Google profile photo automatically. It stays available as one of the avatar choices, so you can pick it yourself. Your Google name was never used, and is no longer read at all.",
      "The first-time \"pick a nickname and avatar\" prompt now appears for everyone, not just Google sign-ins.",
    ],
    devItems: [
      "管理者モードの「今回のメンバー」の『アバター画像の見せる位置』が動かなかったのを直しました（切り取られるのは左右なのに上下を動かしていたため。左右に直し、段位バッジの大きさも調整できるようにしました）。",
      "対戦開始前の「今回のメンバー」の大きさ・見せる長さを管理者モードから調整できるようにしました（スライダーを触ると実際の紹介画面が出ます）。ペットは既定を大きくしました。",
      "管理者モードの「今回のメンバー」に、プレビュー用のボタンを付けました。ホーム画面など、どこから開いても前面に出ます。プレビューは勝手に消えず、管理者パネルを触りながら調整できます（見本のペットも席ごとに並びます）。",
    ],
    devItemsEn: [
      "Fixed the admin lineup slider for the avatar's visible position doing nothing - it moved the axis that is never cropped. It now moves left/right, and the rank badge size is adjustable too.",
      "The pre-match lineup can now be tuned from admin mode - sizes and how long it stays up, with the real screen appearing as you drag a slider. Pets are larger by default.",
      "Added a preview button to the admin mode's lineup group. It comes to the front wherever it is opened from, stays up while you adjust the sliders behind it, and shows a sample pet on every panel.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "「ゴメンナサイッ！」で相手の最後のロックを止めた瞬間を、大きな発動演出にしました。画面が紫に染まり、カードと名乗りが飛び出します。相手や観戦している方の画面にも同じように出ます。",
      "CPUが「ゴメンナサイッ！」を使った時にも「防いだ！」の演出が出るようになりました（これまでは人が使った時だけでした）。",
      "ランク戦の待ち時間に出る豆知識から囲みを外し、文字だけを大きく出すようにしました。文の長さで枠が伸び縮みして下のボタンが動くこともなくなります。",
    ],
    itemsEn: [
      "Stopping an opponent's final lock with So Sorry! now gets a full declaration: the screen floods purple and the card slams in. Everyone else sees it too.",
      "The \"Blocked!\" effect now also plays when a CPU uses So Sorry! (previously only when a person did).",
      "The tips shown while waiting for a ranked match lost their box — just large text now, and the layout no longer shifts with the length of the tip.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "動作が重くなる問題に対処しました。盤面の絵を置いておく棚が、実際に必要な数より小さかったため、毎回作り直しになっていました。特に4人戦で効きます。",
      "ランク戦の待ち時間に出る豆知識を、大きく中央に出すようにしました。",
    ],
    itemsEn: [
      "Addressed the slowdown. The shelf holding the board's artwork was smaller than what the screen actually needs, so it was being rebuilt constantly. This matters most in 4-player games.",
      "The tips shown while waiting for a ranked match are now large and centered.",
    ],
    devItems: [
      "CPUが、自分のゲートに相手が迫っていても守りに戻らないことがあったのを直しました。ジャンプ台などカードの効果で動く時に、守りの判断が働いていませんでした。",
    ],
    devItemsEn: [
      "Fixed the CPU failing to fall back and defend its own gate when an opponent was closing in. When it moved via a card effect (a Jump Pad, for example), the defensive judgement was not applied at all.",
    ],
  },
  {
    date: "2026-09-08",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "遊び方の案内（チュートリアル）で、説明している場所が光らないことがあったのを直しました。「あなたの手札」「手札効果」の手順で手札がきちんと光ります。",
    ],
    devItemsEn: [
      "Fixed the how-to-play walkthrough not highlighting what it was describing. Your hand is now spotlighted correctly on the \"Your hand\" and \"Hand effects\" steps.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "不具合報告の画面を開いている間、対戦の進行が止まってしまうことがあったのを直しました。報告を書きながらでもゲームは進みます。",
    ],
    itemsEn: [
      "Fixed the game stalling while the bug report window was open. The match now keeps going while you write a report.",
    ],
    devItems: [
      "CPUが「増殖する樹々」などでカードを置く時、自分が向かっていない相手のゲートにまで置いていたのを直しました。これからは自分の進む道すじに置きます。",
      "CPUが「収穫と種まき」で、そのカード自身を拾って同じマスに置き直すだけ、という空振りをしていたのを直しました（そのカードは効果のあとで自動的に手札に入るので、拾う必要がありません）。",
    ],
    devItemsEn: [
      "Fixed CPU placement (Growing Trees and similar): it was placing cards on opponent gates it was not heading for. It now builds along its own route instead.",
      "Fixed a wasted CPU play with Harvest and Sow, where it picked up that very card and put it straight back on the same cell (the card is added to your hand automatically after the effect, so there is no need to take it).",
    ],
  },
  {
    date: "2026-09-08",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "相手ゲート侵攻の処理中に、その人がもう1枚ロックしてしまうことがあったのを直しました（1ターンに2枚ロックはルール違反です）。侵攻の処理が終わるまで、他の自動処理は動かなくなります。",
      "紅蓮の火山 ワイナウエアで、どのマスのカードを捨てたのか分かりにくかったのを直しました。お知らせが出て読み終わるまで、対象のマスが光り続けます。",
    ],
    devItemsEn: [
      "Fixed a case where a player could lock a second card during their Gate Invasion (locking twice in one turn is against the rules). Other automation now stays paused until the invasion finishes.",
      "Made it clear which cell Wineware discarded from: the target cell now keeps glowing until the notice has appeared and been read.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "スマホ（特にiPhone）で4人戦がカクついて重くなる問題に対処しました。光の明滅のたびに盤面の絵を作り直していたのが原因で、作り直しの回数を大幅に減らしました。見た目は変わりません。",
    ],
    itemsEn: [
      "Improved the slowdown on phones (especially iPhone) during 4-player games. The board art was being rebuilt every time a glow pulsed; that rebuilding is now greatly reduced. The look is unchanged.",
    ],
  },
  {
    date: "2026-09-08",
    items: [
      "対戦が途中で進まなくなることがある不具合を直しました。誰かの手番待ちのまま止まってしまった場合、しばらくすると自動で次へ進みます。",
    ],
    itemsEn: [
      "Fixed a case where a match could stop progressing. If play stalls while waiting on someone's turn, it now moves on automatically after a short while.",
    ],
    devItems: [
      "ザ・ギャンブル・試練の儀式で、宣言した色のカードが手札に2枚以上あると、捨てる処理が途中で止まってしまうことがあったのを直しました（昨日お配りした「捨てる順番を選べる」機能の不具合です。失礼しました）。",
    ],
    devItemsEn: [
      "Fixed The Gamble and Trial Ritual: when two or more cards in hand matched the declared color, the discard step could stop partway. (This was a defect in yesterday's \"choose the discard order\" feature — sorry about that.)",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "アプリのアドレスが新しくなりました。これまでのアドレスを開いた場合も自動でご案内しますので、そのままお使いいただけます。",
      "ホーム画面に追加してくださっている方は、新しいアドレスを開いてから、あらためて「ホーム画面に追加」をお願いします（古いアイコンは削除して構いません）。",
      "戦績管理システムも同じアドレスの下に移りました。ゲームでログインしていれば、これまでどおりそのまま見られます。",
    ],
    itemsEn: [
      "The app has a new address. Old links redirect automatically, so you can keep using them.",
      "If you added the app to your home screen, please open the new address and add it again (you can delete the old icon).",
      "The match record system moved under the same address. If you are signed in to the game, it stays signed in as before.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "コノハナサクヤの桜の演出が小さくて見えづらかったので、花びら・光の筋・渦を大きくし、少しゆっくりにしました。",
    ],
    itemsEn: [
      "Made Konohanasakuya's petals, thread and swirl larger and a little slower — they were too small to notice on phones.",
    ],
    devItems: [
      "結ばれの一本桜 コノハナサクヤで相手を引き寄せた時、移動先のカードがめくれるだけで到達効果が起きないことがあったのを直しました。カードの補足どおり、動かされた相手が到達効果を得ます。",
    ],
    devItemsEn: [
      "Fixed Konohanasakuya: when you pulled an opponent next to you, the card at the destination was flipped but its Arrival Effect sometimes never triggered. As the card note says, the moved player now gains it.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "自分が関わっていない奪い合い（CPU同士など）で、本来見えないはずの相手のカードが表向きで出ていたのを直しました。何が起きたかは今までどおり分かりますが、中身は伏せられます。",
      "右下の「このターンの出来事」の帯が、たくさん並ぶと盤面に重なっていたのを直しました。5枚ぶんで止まり、それ以上は横になぞって見られます。",
      "最後のミニモーダルが右下へ畳まれ切る前に「◯◯のターンです」が重なって出ていたのを直しました。",
    ],
    devItemsEn: [
      "Fixed cards being shown face-up in steals you are not part of (CPU vs CPU, for example). You still see that it happened, but not what was taken.",
      "Fixed the \"this turn\" strip at the bottom right overlapping the board when many entries piled up. It now stops at five and scrolls sideways.",
      "The turn announcement no longer appears on top of the last mini popup while it is still folding away.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "ゲート侵攻が、案内どおりの順番で見えるようになりました。案内が進むまで、あなたの駒は相手のゲートに乗ったまま、相手の手札も減らないまま、自分のゲートのカードも盤面に残ります。奪う札をめくる前に手札を見て中身が分かってしまうこともなくなりました。最後は自分のゲートへ跳んで帰ります。",
    ],
    devItemsEn: [
      "Gate invasions now play out in the order the narration describes. Until each step arrives, your piece stays on the enemy gate, the opponent's hand stays full, and the cards on your own gate stay on the board — and you can no longer read the stolen cards in your hand before flipping them. Your piece then leaps home at the end.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "手札を全て捨てる時（ザ・ギャンブルなど）、どの順番で捨てるかを選べるようになりました。捨て場に積まれる順番が変わるので、捨て場から拾うカードとの組み合わせが狙えます。",
      "オプションエリアのランキングアイコンを押すと、「ランキングを見る」「戦績システムへ」を選べるようになりました。",
    ],
    itemsEn: [
      "When you discard your whole hand (The Gamble and similar), you can now choose the order. The order they stack in the discard pile matters for cards that pick from it.",
      "Tapping the ranking icon now lets you choose between the in-app ranking and the match-record site.",
    ],
    devItems: [
      "スマホでマイページの下が見切れていたのを直しました（スクロールは出さず、中身が画面に収まるようになります）。",
      "ゲート侵攻で、エターナルカードを獲得した知らせが案内より先に出ていたのを直しました。案内の順番どおりに見えるようになります。",
    ],
    devItemsEn: [
      "Fixed the bottom of My Page being cut off on phones. It now fits the screen instead of scrolling.",
      "In a gate invasion, the notice about gaining an Eternal card no longer appears before the narration reaches it.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "接触をカウンターロックで止めた時や断った時に、返事をした側から手番のプレイヤーへ操作の順番が戻らず、対局が進まなくなることがあったのを直しました。",
      "持ち時間タイマーを使わない対局では、接触の返事のために操作の順番を移さないようにしました（時計が無いので移す意味がなく、戻らなくなる原因でした）。",
      "スマホでマイページの下が見切れて、指でスクロールしても届かなかったのを直しました。",
    ],
    devItemsEn: [
      "Fixed the turn order failing to return to the active player after a contact was stopped with a Counter Lock or declined, which could leave the match stuck.",
      "In matches played without the turn timer, the turn order is no longer handed over for answering a contact (there is no clock to run, and it could not be handed back).",
      "Fixed the bottom of My Page being cut off on phones with no way to scroll to it.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "「2D表示に切り替える」を使っていると、盤面が小さく左上にずれて描かれ、ロックエリアの枠や光る演出が実際の盤面と別の場所に出ていた不具合を直しました。2D表示中は盤面の絵の描き方が自動で切り替わります。",
    ],
    itemsEn: [
      "Fixed a bug where, with the flat 2D board turned on, the board was drawn small and shifted to the upper left, leaving lock-area frames and glow effects in a different place from the board itself. The board now switches its drawing method automatically while flat 2D is on.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "ランク戦で「対戦開始」を押さずに締め切りを迎えた後、待機画面に「もう一度さがす」ボタンが出るようになりました。これまでは探すのをやめた後もぐるぐるが回り続け、相手が入り直してもマッチしませんでした。",
    ],
    devItemsEn: [
      "In ranked matches, if you miss the Start prompt, the waiting screen now offers a Search again button. Previously the spinner kept turning even though the search had stopped, so you would never match even if your opponent re-queued.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "ランク戦で相手を探している間、遊び方の豆知識が順番に流れるようになりました。",
      "勝利演出で7色が1枚ずつ光る瞬間の効果音を差し替えました（暫定）。",
    ],
    itemsEn: [
      "While you wait for a ranked opponent, gameplay tips now cycle on screen.",
      "Changed the sound played as each of the seven colours lights up in the victory sequence (provisional).",
    ],
    devItems: [
      "タイトル画面の右下に並ぶボタンが重なっていたのを直しました（管理者のみ表示）。",
    ],
    devItemsEn: [
      "Fixed the buttons in the bottom-right of the title screen overlapping each other (admin only).",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "接触の解決中（相手が奪う札を選んでいる間）に、申し込んだ側のターンが先に終わってしまうことがあったのを直しました。",
      "相手が奪う札を選ばないまま画面を閉じても、対局が止まらないようにしました。しばらく待つと無作為に1枚が渡って先へ進みます。",
      "時間切れが続くと敗北（またはおまかせに交代）になることが分かるよう、「時間切れ 2/3」のように残り回数を画面に出すようにしました。あと1回になると赤くなり、中央でも一度お知らせします。",
      "ロックする札を選んだ直後も「マイデッキ」ボタンが少しの間残っていたのを直しました。",
      "右下のお知らせで、中身が「＋」だけの空っぽのカードが並ぶことがあったのを直しました。引いた分は裏面、まとめて手に入れた分は実際の札の絵が出ます。",
      "相手の効果で自分の手札が捨てられた時、自分の画面にも「何を捨てたか」の記録が残るようになりました。",
    ],
    devItemsEn: [
      "Fixed the attacker's turn sometimes ending while a contact was still being resolved (while they were choosing which card to take).",
      "A contact no longer freezes the match if the attacker closes their screen without picking a card — after a wait, one random card is taken and play continues.",
      "Repeated timeouts now show a counter (e.g. \"Timeouts 2/3\") so you can see how close you are to losing the match or being switched to auto-play. It turns red on the last one, with a one-off notice in the centre.",
      "The My Deck button no longer lingers for a moment after you pick a card to lock.",
      "Notification chips no longer show an empty card with just a \"+\" on it — draws show a card back, and multi-card gains show the actual card.",
      "When an opponent effect discards your hand, your own screen now keeps a record of what was discarded.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "接触された時に出ていた「拒否する」を、カード効果の自動処理がオンの時は出さないようにしました。接触は申し込まれたら断れないルールで、止められるのはカウンターロックだけです（自動処理をオフにして手動で進めている時は今までどおり出ます）。",
      "相手の返事が返ってこないまま接触が宙に浮いた時、これまでその接触を取り消していたのを、承認して先へ進める形に改めました。黙っていれば接触を避けられる、ということが無くなります。",
      "オンライン対戦で接触を申し込まれた時、返事をしている間はその人に手番の持ち時間が回るようになりました。時間内に答えないと承認されたものとして進みます（接触は断れないルールなので、待たせても得はしません）。",
      "上の見切りと、7色目のロックの承認の見切りを、どちらも少し早めました。",
    ],
    devItemsEn: [
      "The Reject button shown when you are contacted no longer appears while automatic card processing is on. A contact cannot be refused under the rules — only a Counter Lock stops it. (With automatic processing off, the button stays as before.)",
      "When a contact request was left hanging with no answer, it used to be cancelled; it is now approved so play moves on. Staying silent no longer lets you avoid a contact.",
      "In online play, being asked to accept a contact now runs on your own clock. If you do not answer in time it counts as approved (a contact cannot be refused, so stalling gains you nothing).",
      "That fallback, and the one for approving a seventh-colour lock, now both kick in a little sooner.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "「防いだ！」の演出が、防いだ本人だけでなく相手や観戦している人の画面にも出るようになりました。",
      "ゲート侵攻の締めくくり（自分のゲートへ帰る瞬間）に、自分の色の輪が迎え入れる演出を追加しました。",
    ],
    itemsEn: [
      "The block effect now also plays for the opponent and for spectators, not just the player who blocked.",
      "Returning home at the end of a gate invasion now closes with rings in your own colour.",
    ],
    devItems: [
      "接触を申し込んでいる間、にらみ合っている2つの駒が盤面で光るようになりました。狙われた側には音でも知らせます。",
      "接触で自分のゲートへ飛ばされた駒に、着地の輪と音が付きました。",
      "ゴメンナサイで相手のロックエリアから1枚を引き抜く瞬間に、スロットが割れて光の筋が走るようになりました。",
      "公開ドローのカードが、その場に現れるのではなく山札から飛んでくるようになりました。",
      "持ち時間が切れた時に音で知らせるようにしました。手札が0枚でハンドフェイズが飛ぶ時は手札エリアが一度光ります。",
    ],
    devItemsEn: [
      "While a contact request is waiting, the two pieces facing off now glow on the board — and the targeted player also hears it.",
      "A piece knocked back to its own gate by a contact now lands with a ring and a sound.",
      "Pulling a card out of an opponent lock area with Gomennasai now cracks the slot and sends a beam of light.",
      "Public draws now fly in from the deck instead of appearing in place.",
      "Running out of time now plays a sound, and an empty hand flashes once when the hand phase is skipped.",
    ],
  },
  {
    date: "2026-09-07",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "オンライン対戦で、接触を申し込んだあと相手の返事が返ってこないと対局が動かなくなることがあったのを直しました。相手が答えられない状態が続いた場合は、その接触は承認されて先に進みます。",
      "7色目のロックの承認が返ってこない時も同じように止まっていたのを直しました。しばらく待っても答えが無ければ承認されて先に進みます。",
      "相手が席を外していても一定時間で自動的に承認される仕組みが、実際には働いていなかったのを直しました。",
    ],
    devItemsEn: [
      "Fixed online matches locking up when a contact request never got an answer. If the opponent stays unable to respond, the contact is now approved so play continues.",
      "Fixed the same lock-up when approval for a seventh-colour lock never came back — after a wait it is approved so play continues.",
      "Fixed the safeguard that auto-approves after a while when an opponent is away — it was not actually running.",
    ],
  },
  {
    date: "2026-09-07",
    items: [
      "通信が一時的に切れた時などに、盤面が丸ごと表示されなくなり操作できなくなることがあったのを直しました。",
    ],
    itemsEn: [
      "Fixed the board vanishing entirely and becoming unusable after a temporary connection problem.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "オンラインの1対1で「降参する」を追加しました。⚙オプションの中にあり、対戦中だけ出ます。降参するとその対局はあなたの負け・相手の勝ちとして、普通に決着した時とまったく同じように記録されます（押す前に確認が出ます）。",
    ],
    itemsEn: [
      "Added Resign for online 1v1 matches. It sits in the ⚙ options and only appears during a match. Resigning records the game as your loss and your opponent's win, exactly like any other finish (you are asked to confirm first).",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "初回の音量設定やデイリーボーナスなど、対局とは関係のないお知らせが開いている間、対局が進まなくなっていたのを直しました。",
    ],
    itemsEn: [
      "Fixed the game halting while an unrelated pop-up was open — the first-run volume prompt or the daily bonus no longer holds up your match.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "対局が長く止まってしまうことがあったのを直しました。画面の中央に出るお知らせやモーダルが閉じずに残ると、その間ずっと次の手番へ進めなくなっていました。",
    ],
    itemsEn: [
      "Fixed matches that could freeze for a long time. If a message or dialog in the middle of the screen failed to close, the game stopped moving on to the next phase for as long as it stayed there.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "盤面やロックエリアのカードが捨てられる時に、散って消える演出を追加しました。紅蓮の火山は赤い熱、白の意思の覚醒は白い光、ロックエリアはその色の光が砕けます。",
      "結ばれの一本桜 コノハナサクヤで相手を引き寄せる時に、桜の花びらが舞う演出を追加しました。",
    ],
    itemsEn: [
      "Cards discarded from the board or a lock area now scatter as they vanish — red heat for the crimson volcano, white light for the awakening of the white will, and the slot's own colour shattering in a lock area.",
      "Drawing an opponent in with the Bound Cherry Tree now sends cherry blossom petals streaming across the board.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "勝利演出とそのあとの画面が重くなっていたのを直しました。7色が集まる演出から結果表示まで、動きがなめらかになります。",
    ],
    itemsEn: [
      "Fixed the victory sequence and the screens after it running heavy — the seven-colour finale and the result screens now stay smooth.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "駒の奥側の上の辺に黒い太い線が出ていたのを直しました（見えないはずの面が描かれていました）。",
      "設定などの画面を開いている時に、その裏の盤面を触ってカードが拡大表示されたり駒を掴めたりしたのを直しました。",
      "基本設定の1画面目の見た目を整えました。並んでいるものを同じ形のカードに揃え、押すと開くものには右端に同じ矢印を出しています。",
      "ザ・ギャンブルで外して手札を捨てる時、1枚ずつ順番に出ていたお知らせを、捨てたカードをまとめて1つに表示するようにしました。",
      "移動できるマスも接触できる相手もいない時に隣へ山札から1枚置く決まりを、何が起きたか分かるようお知らせで説明するようにしました。",
    ],
    devItemsEn: [
      "Fixed a thick black line along the far top edge of the cube pieces (a face that should have been hidden was being drawn).",
      "Fixed being able to touch the board behind a settings or full-screen page — cards no longer pop up and pieces can no longer be picked up through it.",
      "Tidied up the first page of the basic settings: every entry now uses the same card shape, and anything that opens shows the same arrow on the right.",
      "When The Gamble misses and your hand is discarded, the discarded cards are now shown together in a single notice instead of one at a time.",
      "When you have nowhere to move and no one to contact, the rule that places a card from the deck beside you is now explained in a notice.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "接触の見せ方の順番を変えました。まず突進の演出、次に相手の手札から1枚選び、奪ったカードを見せてから、相手が自分のゲートへ飛ばされます（以前は突進の前に手札を選んでいたので、結果が先に分かってしまっていました）。",
      "黒いカードがロックエリアに置かれる時、暗い封印が焼き付く演出を追加しました。",
      "「なないろの欠片」を2枚まとめてロックした時、七色の光が広がる大きな演出を追加しました。",
    ],
    itemsEn: [
      "Reordered the contact sequence: the charge animation comes first, then you pick a card from the opponent's hand, then the stolen card is revealed, and only then is the opponent sent flying back to their gate (previously the card was picked before the charge, so the outcome was known too early).",
      "Placing a black card on a lock slot now burns a dark seal into it.",
      "Locking two \"Shards of Seven\" at once now triggers a large seven-color burst.",
    ],
    devItems: [
      "接触でカードを選ぶ時、CPU戦でまれにカードを1枚も選べなくなることがあったのを直しました。",
    ],
    devItemsEn: [
      "Fixed a case in CPU battles where no card could be picked while resolving a contact.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "CPUの打ち方を良くしました。同じターンに「ディメンション」を二度使って手札を無駄にすることがなくなりました。",
      "CPUの「ワイナウエア」が、相手が欲しがっている色のカードや、相手が次に進もうとしているマスを狙って壊すようになりました（自分がまだ欲しい色や、自分の進み先は壊しません）。",
      "CPUの「合同建設」などでカードを置く時、ゲートに攻め込めそうで、かつ自分のゲートの近くに相手がいない時は、自分のゲートに置くようになりました（帰還の時に手札へ戻せるため）。",
      "「ワイナウエア」でどのマスのカードを捨てたのか分かるように、そのマスを光らせ、何枚捨てたかもお知らせに出すようにしました。",
    ],
    devItemsEn: [
      "Smarter CPU: it no longer wastes a card by using \"Dimension\" twice in the same turn.",
      "The CPU's \"Wineware\" now targets cards in colors an opponent still needs, or squares an opponent is about to move onto — and avoids destroying colors it still needs itself.",
      "When placing a card (Joint Construction and similar), the CPU now places it on its own gate if it is about to invade and no opponent is near that gate, since it will pick the card back up on returning home.",
      "\"Wineware\" now highlights the square whose cards were discarded and says how many were discarded.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "スマホでブーストカードの絵が出ないことがあったのを直しました（仮の絵の作り方を変えました）。",
      "「ランク戦で対戦相手を募集中の人がいます！」の案内で「参加する」を押しても何も起きないことがあったのを直しました。押すとそのまま相手探しが始まります。",
    ],
    devItemsEn: [
      "Fixed Boost cards sometimes showing no artwork on phones (their placeholder image is now drawn a different way).",
      "Fixed the \"Join\" button on the \"Someone is looking for a ranked opponent!\" notice doing nothing. It now takes you straight into matchmaking.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "マイデッキ戦で、自分の手札の1枚1枚が「自分のマイデッキ」「相手のマイデッキ」「共有の山札」のどれから来た札かを見分けられるようになりました。マイデッキの札は角が折れ、その札の実際の裏面がのぞきます（共有の山札の札には何も付きません＝角が折れていない札が共有の山札の札です）。これまでは相手の札にしか印が付いていませんでした。",
    ],
    itemsEn: [
      "In My Deck matches you can now tell, card by card in your own hand, whether it came from your own deck, an opponent's deck, or the shared deck. Cards from a personal deck have a folded corner showing that card's actual back; cards from the shared deck are left plain — an unfolded corner means it came from the shared deck. Previously only opponents' cards were marked.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "移動した駒や、飛んでいったカードが、置かれる瞬間に一瞬消えたり枠だけになったりしていたのを直しました。",
      "「合同建設」で山札から置くか手札から置くかを選ぶ画面が、明るい表示にしていても暗いままだったのを直しました。",
      "「パーティ」で表向きのカードを手札に加えた時、中央のお知らせが裏面で出ることがあったのを直しました。",
    ],
    devItemsEn: [
      "Fixed pieces and cards briefly vanishing, or showing only their outline, at the moment they land.",
      "Fixed the \"place from deck or hand\" prompt in Joint Construction staying dark even in light mode.",
      "Fixed the centre notice showing a card back when Party added a face-up card to your hand.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "接触をカウンターロックで止めた時と、最後のロックをゴメンナサイで止めた時に「防いだ！」の演出が出るようになりました。守った人のところに盾が張られ、攻めた駒がよろけます。",
      "山札が切れて捨て場が新しい山札になる瞬間に、捨て場の山がまるごと裏返って山札の場所へ移る演出を追加しました（今までは黙って入れ替わっていました）。",
    ],
    itemsEn: [
      "Blocking a contact with Counter Lock, or stopping a final lock with Sorry!, now plays a \"BLOCKED!\" effect: a shield flares around the defender and the attacking piece is knocked back.",
      "When the deck runs out and the discard pile becomes the new deck, the pile now visibly flips over and moves across (it used to happen silently).",
    ],
    devItems: [
      "宣言した色が当たったか外れたかが、色の丸の輝き・崩れで分かるようになりました（ザ・ギャンブル／試練の儀式）。",
      "カードが盤面に配られる時、着地したマスからそのカードの色の粒が弾けるようになりました。",
      "対局中なのに「ランク戦で対戦相手を募集中の人がいます！」の案内が出てしまうことがあったのを直しました。",
      "移動した駒が、着地の瞬間に一瞬消えることがあったのを直しました。",
      "相手の手札から１枚捨てさせる効果で、捨てさせたカードが裏面のまま表示されていたのを直しました（捨てたカードは表向きで見えます）。",
      "ブーストカードの絵柄が一部の端末で表示されないことがあった件の対策を入れました。",
    ],
    devItemsEn: [
      "You can now see at a glance whether a declared colour hit or missed, from the way the colour dots flare or crumble (The Gamble / Rite of Trial).",
      "Cards dealt onto the board now burst with sparks in that card's colour where they land.",
      "Fixed the \"Someone is looking for a ranked opponent!\" banner appearing while you were already in a game.",
      "Fixed a moved piece briefly vanishing at the moment it landed.",
      "Fixed the card shown face-down in the modal when an effect makes an opponent discard a card. Discarded cards are now shown face-up.",
      "Added a fix for Boost cards whose artwork did not appear on some devices.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "基本設定の1画面目を6つの大きな項目にまとめました（音量／案内表示に畳み、カードの拡大サイズは詳細設定へ）。スマホでは1つ1つが指で押せる大きさになり、スクロールなしで全部見えます。",
      "ランク戦で、お互いに「対戦開始」を押したのに始まらないことがあったのを直しました。押した後も自動でやり直すようになり、それでも始まらない時はもう一度押せるようになります。",
      "物語チュートリアルの「遊び方を知っているのでスキップ」などのボタンが、スマホで画面の端に寄りすぎて押しづらかったのを直しました。",
      "カードの効果文の「上記の到達時の効果を得る」を「上記の到達効果を得る」に統一しました（ほかの効果文と同じ言い方になり、少し短くなります）。",
    ],
    devItemsEn: [
      "The first page of Settings is now six large items (volume and prompts are grouped; card zoom size moved to Advanced). On phones each one is finger-sized and they all fit without scrolling.",
      "Fixed ranked matches sometimes not starting even though both players pressed Start match. It now retries on its own, and lets you press again if it still cannot start.",
      "Fixed the story tutorial's Skip and Restart buttons sitting too close to the screen edge to press on a phone.",
      "Card text now reads \"Gain the Arrival Effect above\" consistently, matching the wording used elsewhere.",
    ],
  },
  {
    date: "2026-09-06",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "物語チュートリアルの説明が一切出ず、左上のボタンも効かなくなっていたのを直しました。",
      "到達が続けて起きた時の「N 連鎖」の数え方が1つずれていたのを直しました。移動して最初に乗ったカードがいきなり「2 連鎖」と出て、その次も同じ数字のままでした。",
    ],
    devItemsEn: [
      "Fixed the story tutorial showing no instructions at all, which also left the buttons in the top-left unresponsive.",
      "Fixed the chain counter being off by one. The first card you landed on after moving was labelled \"2 CHAIN\", and the next one kept the same number.",
    ],
  },
  {
    date: "2026-09-06",
    items: [
      "試練の儀式などで踏んだカードが、画面中央の演出で開くのと同じ瞬間に盤面でもめくれるようにしました（中央で中身が分かった後にもう一度盤面がめくれ、二度めくれたように見えていました）。",
      "オンラインで、自分の操作が一瞬だけ「相手の操作」として古い演出で再生されることがあったのを、移動以外の場面（カードを置く・めくる・捨てる・奪う など）でも起きないようにしました。",
    ],
    itemsEn: [
      "The card you step on (Trial Ritual and the like) now flips over on the board at the very moment the centre animation opens it — previously the board flipped afterwards, so it looked as if it flipped twice.",
      "Online, your own actions could briefly replay as if they were an opponent's, using the old animation. This was fixed for moves before; it now covers placing, flipping, discarding and stealing cards as well.",
    ],
    devItems: [
      "ボタンやカードを続けて押した時に、同じ行動が二重に通ってしまう場面をまとめて塞ぎました（ロック・接触の申し込み・最後のロックの承認・カウンターロックの使用・ドラッグでの1手）。",
      "次のフェイズへ移るのを待っている間は「スキップ」ボタンを押せないようにしました。",
    ],
    devItemsEn: [
      "Closed a group of cases where pressing a button or a card twice in quick succession could put the same action through twice (locking, proposing contact, approving a final lock, using a counter lock, and drag-and-drop plays).",
      "The Skip button can no longer be pressed while the game is waiting to move on to the next phase.",
    ],
  },
  {
    date: "2026-09-05",
    items: [
      "オンラインで、自分が駒を動かした時に古い平たい移動演出が出てから跳ねる演出が出る（二重に見える）のを直しました。相手の駒の移動も、自分と同じ立方体のまま跳ねる動きになります。",
      "盤面のカードがめくれる演出より先に、画面中央のお知らせで中身が分かってしまうことがあったのを直しました。盤面でめくれてからお知らせが出ます。",
    ],
    itemsEn: [
      "Fixed a doubled move animation online: your own move showed the old flat glide before the hop. Opponents' pieces now hop as a cube, the same as yours.",
      "Fixed the notice in the middle of the screen sometimes revealing a card before it visibly flipped over on the board. The board flips first now.",
    ],
    devItems: [
      "1回のロックフェイズでマイデッキから何枚も引けてしまう／ロックした直後にも引けてしまうのを直しました。マイデッキから引けるのは「ロックする代わり」に1回だけです。",
      "山の側面の縞が、細い断面ではなく太い縞に見えていたのを直しました。",
      "山札や捨て場にカードが積まれた瞬間、少し沈み込んで「トン」と収まるようにしました。厚みも1枚ぶん増えます。",
      "自分の手札に札が加わる時、隣の札が場所を空けるように開き、そこへ新しい札が下から滑り込むようにしました。",
      "相手の手札からカードを奪った時（スリカエ・接触・ゲート侵攻）、奪われた人の手札から奪った人の手札へ、奪った人の色の光の筋が走るようにしました。",
      "ターンの始まりに、その人の席の方向から駒の色の光が走るようにしました。名前の枠もその人の色になり、自分の番の時だけ名前が一拍だけ大きく脈打ちます（待ち時間は変わりません）。",
      "到達が続けて起きた時、駒が動いて起きた分は「2 連鎖」、上のカードが取れてめくれたことで起きた分は「2 コンボ」と、文字と色で分けて出るようにしました。",
      "相手のゲートに攻め込まれて手札を奪われる時、奪う札を「奪われた本人」が選ばされていたのを直しました。選ぶのは奪う側です（相手がCPUなら自動で選びます）。",
      "CPUが、前に使った手札効果のお知らせがまだ画面の真ん中に出ているうちに次の効果を使い始めることがあったのを直しました。1つずつ順番に見えるようになります。",
      "「このフェイズを終了する」効果を使った後なのに、CPUがもう1枚手札効果を使ってしまうことがあったのを直しました。",
      "画面の真ん中に出るお知らせで、カードだけが左に寄って右側に大きな空白ができていたのを整えました。",
      "対戦が終わってホームに戻っても、画面の右上にターン数・ラウンド数が残っていたのを直しました。",
      "盤面のカードがオープンする瞬間に、実際にめくれる動きを付けました。裏面が回って表になります。",
      "到達が続けて起きた時に「2 連鎖」「3 連鎖」と回数を出すようにしました。連鎖するほど光が強くなります。",
      "6色ロックした人の、残り1つの空きスロットがゆっくり光り続けるようにしました。あと1色で勝ち、という場面が一目で分かります。",
      "相手のゲートに乗った瞬間に、そのゲートの持ち主の色で警告の輪が広がるようにしました。",
      "自分の持ち時間が残り10秒を切ると、画面のふちが自分の色でゆっくり脈打つようにしました。",
      "山札・捨て場などの山の側面を、カード1枚ずつの断面が見える縞模様にしました。つるつるの板ではなく、紙が重なっているように見えます。",
    ],
    devItemsEn: [
      "Fixed being able to draw many cards from your deck in one lock phase, or draw right after locking. Drawing from your deck replaces locking and happens once per lock phase.",
      "Fixed the stripes on the side of a pile showing as thick bands instead of thin card edges.",
      "Cards now settle onto the deck and discard piles with a small dip, and the pile grows by one card's thickness.",
      "When a card joins your hand, the cards beside it now open to make room and the new card slides in from below.",
      "Taking a card from an opponent's hand (sleight of hand, contact, gate invasion) now draws a streak of light in the taker's colour, from the victim's hand to theirs.",
      "A turn now opens with a sweep of light coming from that player's side of the table in their piece colour, the name plate takes their colour, and on your own turn the name gives one extra beat (the wait is unchanged).",
      "Consecutive arrivals are now labelled separately: \"2 CHAIN\" when the piece moved onto the next card, and \"2 COMBO\" when a card underneath was uncovered.",
      "Fixed the victim being asked to choose which cards are taken when an opponent invades their gate. The attacker chooses (automatically when the attacker is a CPU).",
      "Fixed a CPU sometimes starting its next hand effect while the notice for the previous one was still showing in the middle of the screen. They now appear one at a time.",
      "Fixed a CPU sometimes playing another hand card after an effect that ends the current phase.",
      "Tidied the notice in the middle of the screen: the card no longer sits against the left edge with a large gap on the right.",
      "Fixed the turn and round counter staying in the top right after a game ended and you returned home.",
      "Cards on the board now physically flip over when they are revealed, turning from back to face.",
      "Consecutive arrivals now show a chain count (\"2 CHAIN\", \"3 CHAIN\"), and the glow grows stronger the longer the chain.",
      "When a player has locked six colours, their one remaining empty slot now glows slowly, so \"one colour from winning\" is visible at a glance.",
      "Landing on an opponent's gate now sends out a warning ring in that gate owner's colour.",
      "When your own clock drops below ten seconds, the edge of the screen now pulses slowly in your colour.",
      "The sides of the deck, discard and other piles are now striped so you can see the edge of each card, instead of looking like a smooth block.",
    ],
  },
  {
    date: "2026-09-05",
    items: [

    ],
    itemsEn: [

    ],
    devItems: [
      "駒が移動して着地した瞬間に、駒の大きさが急に変わって見えていたのを直しました。移動中の駒が、着地先の実物と同じ大きさで飛ぶようになります。",
      "相手が到達したカードを手に入れた時、「このターンの出来事」に並ばなかったのを直しました。到達して表になったカードは全員に見えている情報なので、誰が手に入れたかも並びます（裏向きのまま手に入れた分は、これまで通り中身を伏せて「非公開のカードを1枚」と出ます）。",
      "ターンの終わり際に起きた出来事が「このターンの出来事」から消えてしまうことがあったのを直しました。お知らせが右下へ飛ぶ頃には次のターンに入っていた分は、捨てずに「前のターン」の行へ積みます。",
    ],
    devItemsEn: [
      "Fixed pieces appearing to change size the moment they land after a move. A moving piece is now drawn at the same size as the real piece at its destination.",
      "Fixed cards an opponent picked up on arrival not appearing in What happened this turn. A card turned face up on arrival is public information, so who took it is shown too (cards taken while still face down are still hidden, shown as \"one hidden card\").",
      "Fixed events near the end of a turn disappearing from What happened this turn. Notices that only reach the corner after the turn has changed are now filed under Previous turn instead of being discarded.",
    ],
  },
  {
    date: "2026-09-05",
    items: [
      "マイデッキ戦で、自分の手札のどれが他の人のデッキの札なのか分かるようにしました。他の人の札は、カードの左上の角がめくれて持ち主の裏面がのぞきます（自分の札には何も付きません）。",
      "iPhone・iPadで、盤面の描画が端末の都合で打ち切られた時に、自動でやり直すようにしました。これまでは打ち切られたきり古い描き方に戻ってしまい、そのまま画面がチカチカし続けていました。",
    ],
    itemsEn: [
      "In My Deck matches you can now tell which cards in your hand came from someone else's deck: their top-left corner is folded back to reveal the owner's card back (your own cards are left unmarked).",
      "On iPhone and iPad, board rendering now restarts automatically if the device cuts it off. Previously it stayed cut off, fell back to the old drawing method, and the screen kept flickering.",
    ],
    devItems: [
      "マイデッキ戦で、他の人のデッキの札が手札の右端にまとまるようにしました。奪ってきた札を探しやすくなります。",
      "カードを拡大表示すると「誰のマイデッキの札か」が出るようになりました。",
      "スマホでは盤面のふちをなめらかにする処理を切って、端末の負担を減らしました。",
      "最初の画面の「HUERISE」ボタンが、何度も押さないと次に進まないことがあったのを直しました。",
      "最初の画面の光の玉を、スマホでは軽くしました。動き方は同じで、尾が少し短くなります。",
      "スマホでの「駒を消す」「カードを消す」ボタンの位置を調整しました。",
    ],
    devItemsEn: [
      "In My Deck matches, cards from other people's decks are now grouped at the right end of your hand, making the ones you took easier to find.",
      "Enlarging a card now shows whose deck it came from.",
      "Edge smoothing for the board is now switched off on phones to lighten the load on the device.",
      "Fixed the HUERISE button on the first screen sometimes needing several taps before it would continue.",
      "The orbs of light on the first screen are now lighter on phones. They move the same way, with a slightly shorter trail.",
      "Adjusted the position of the Hide pieces / Hide cards buttons on phones.",
    ],
  },
  {
    date: "2026-09-05",
    items: [
      "盤面のカードや、盤面のふちの色帯がチカチカする症状に対策を入れました。まだ使っている絵をしまい込んでしまい、描き直しが止まらなくなることがありました。",
    ],
    itemsEn: [
      "Added a fix for the flickering of board cards and the coloured border bars. Textures that were still in use could be discarded, causing them to be redrawn over and over.",
    ],
    devItems: [
      "駒の移動に「よっこいしょ」感を足しました。進む方向の前側を持ち上げて跳び、着地でわずかに前へつんのめります。",
      "ジャンプ台のように2マス以上動く時は、高く長く跳ぶようにしました。距離が体感できます。",
      "紫のキューブ ディメンションで移動範囲が伸びている時は、跳ぶのではなく「ワープする」動きにしました。",
      "カード効果による駒の移動（ジャンプ台・試練の儀式・コノハナサクヤ・ゴメンナサイなど）にも移動の動きが付くようにしました。これまで動きが付いていたのは通常の移動だけでした。",
      "続けて移動した時は、通ってきた道にうっすらと光の軌跡が残るようにしました。",
      "「前のターン」の行に、誰のターンだったかを表示するようにしました。",
      "手札のカードを使った時、使用の演出が終わってから色の宣言などの選択が出るようにしました。演出の途中で選択が重なって出ることがなくなります。",
      "CPUがカードの効果を使った後、移動せずにターンが終わってしまうことがあったのを直しました。効果を処理している最中にフェイズが切り替わっていました。",
      "移動できるマスがあるのに「動けない」と判断されてターンが終わってしまうことがあったのを直しました。",
      "駒をドラッグしている間と、移動している間の駒が、色も模様も無いまっさらな箱になっていたのを直しました。盤面の新しい描き方に切り替えた時から、盤面の外にある駒の絵まで消してしまっていました。",
    ],
    devItemsEn: [
      "Pieces now lean into their move: the leading edge lifts as they take off, and they tip forward slightly on landing.",
      "Moves of two squares or more (such as the Jump Pad) now arc higher and longer, so distance is easier to feel.",
      "While Dimension has extended your movement range, your piece now warps instead of hopping.",
      "Piece moves caused by card effects (Jump Pad, Trial Ritual, Konohanasakuya, Sorry!, and others) are now animated too. Previously only ordinary moves were.",
      "When a piece moves several times in a row, a faint trail of light now marks the path it took.",
      "The Previous turn row now shows whose turn it was.",
      "When you use a card from your hand, the choice prompt (such as declaring colours) now appears after the use animation finishes, instead of overlapping it.",
      "Fixed a bug where the CPU could end its turn without moving after using a card effect. The phase was advancing while the effect was still being resolved.",
      "Fixed a bug where a turn could end as if the piece could not move, even though valid destinations existed.",
      "Fixed pieces appearing as blank, untextured boxes while being dragged or while moving. The switch to the new board rendering was also stripping the artwork from pieces drawn outside the board.",
    ],
  },
  {
    date: "2026-09-05",
    items: [
      "駒が移動するとき、平たい絵ではなく立方体のまま「ぴょんと跳ねて」動くようにしました。盤面に落ちる影と、着地したときの小さな輪も出ます。",
      "「このターンの出来事」の下に「前のターン」の行を追加しました。普段は数枚だけ薄く畳んであり、押すと全部開きます。相手のターンに何が起きたかを見逃しても、後から確かめられます。",
      "1回のロックフェイズで2枚ロックできてしまうことがあったのを直しました。演出とお知らせを待つ間に、もう1枚ロックできる状態が残っていました。",
      "ロックの演出を見ている最中にハンドフェイズのお知らせが出てしまうのを直しました。ロックの様子と「ロックしました」のお知らせが終わってから次のフェイズに入ります。",
      "演出（ロックの刻印や到達のオーラなど）の最中にフェイズが切り替わってしまうのをやめました。演出とお知らせが終わってから次のフェイズに入ります。",
      "到達したときのオーラなど、演出の最中に画面中央のお知らせが出てしまうのをやめました。演出が終わってから出ます。",
      "iPhone・iPadで、盤面のふちの色帯（赤橙黄緑青桃紫のバー）がチカチカしたままだったのを直しました。盤面を新しい方式で描くための部品が読み込めなくなっており、しかも一度失敗すると更新しても直らない状態になっていました。",
      "盤面の描き方をさらに進め、プレイマットと床も新しい方式で描くようにしました。iPhone・iPadで画面がチカチカする症状の軽減をねらったものです。うまく表示されない場合は、基本設定の「動きが重い・カクつくとき」から元の方式に戻せます。",
      "iPhone・iPadで、盤面のふちの色帯（赤橙黄緑青桃紫のバー）だけがチカチカしていたのを直しました。盤面の中でこの帯だけが古い描き方のまま残っていました。",
      "【重要】この日の一時期に、パソコンで盤面のカードやマスが見えなくなり、スマホでは画面がチカチカする不具合が出ていました。盤面の絵を描く順番を変えた変更が原因だったため、その変更を取り消しました。ご迷惑をおかけしました。",
      "盤面の演出（到達した時の光、ロックした時の刻印、ロック中でも使えるカードのまわりを回る光）が、盤面の絵の裏に隠れて見えなくなっていたのを直しました。",
      "自分のターンに自分の駒が光る演出が、うっすらとしか見えなくなっていたのを直しました。光が盤面のカードの裏側に隠れていました。",
      "【重要】オンライン対戦の「参加できる部屋」が常に空になり、対戦ロビーや観戦一覧、進行中の対局の再開も表示されなくなっていた不具合を直しました。部屋は正しく作られていて、一覧を画面に出す処理だけが止まっていました。8月29日から起きていました。ご不便をおかけしました。",
      "盤面の描き方を新しい方式（WebGL）に切り替えました。これまで管理者だけの試験機能でしたが、iPhone・iPadで画面がチカチカする・アプリが落ちる症状がこれで解消したため、全員に既定で有効にします。うまく表示されない端末では、基本設定の「動きが重い・カクつくとき」から元の方式に戻せます。",
      "これまで「そのブラウザにだけ」保存されていた設定を、アカウントにも保存するようにしました。CPUの速さ・強さ・人数、CPU戦の自動送り、フェイズの自動スキップ、マスの確認、カードを拡大表示する大きさと向き、盤面のカードを絵だけにする、手札を画面下に固定、自動処理中のドラッグ制限、ランク戦の通知（時間帯を含む）、振動、ホーム画面の「次にやること」の進み具合です。端末やブラウザを変えても引き継がれ、閲覧データを消しても元に戻りません。",
      "スマホ・タブレットで最初に一度だけ出ていた「2D表示がおすすめです」のお知らせを、出さないようにしました。盤面の描き方を新しくしたことで、画面がチカチカする症状が解消したためです（2D表示そのものは今までどおり基本設定から切り替えられます）。",
    ],
    itemsEn: [
      "Pieces now hop as a cube when they move, instead of sliding as a flat picture. They cast a shadow on the board and land with a small ring.",
      "Added a \"Previous turn\" row under \"What happened this turn\". It stays folded as a few faded cards and opens when you tap it, so you can check what happened on your opponent's turn.",
      "Fixed being able to lock two cards in a single Lock phase. While waiting for the animation and the notice, a second lock could still slip through.",
      "Fixed the Hand Phase notice appearing while you are still watching the lock animation. The next phase now starts after the lock animation and the \"locked\" notice have finished.",
      "Phases no longer change in the middle of an animation (the lock seal, the aura when you land on a card, and so on). The next phase starts once the animation and the notices have finished.",
      "Notices in the middle of the screen no longer appear during animations such as the aura that rises when you land on a card. They now wait until the animation has finished.",
      "Fixed the coloured band around the board (red/orange/yellow/green/blue/pink/purple) still flickering on iPhone and iPad. The part needed to draw the board the new way could no longer be loaded, and once it failed it stayed broken even after updating.",
      "The board now also draws the playmat and the floor with the new method, aiming to further reduce flickering on iPhone and iPad. If anything looks wrong, you can switch back under Settings → “When things feel slow or stutter”.",
      "Fixed the coloured band around the board (red, orange, yellow, green, blue, pink, purple) flickering on iPhone and iPad. It was the one part of the board still using the old drawing method.",
      "Fixed a problem that appeared briefly this day: on PC the cards and squares on the board became invisible, and on phones the screen flickered. The change to the board’s drawing order that caused it has been rolled back. Sorry for the trouble.",
      "Board effects (the glow on arrival, the lock stamp, the light circling cards you can still use while locked) were hidden behind the board artwork. They are visible again.",
      "Fixed the glow on your own piece during your turn being barely visible — the light was hidden behind the cards on the board.",
      "[Important] Fixed a bug that left the online “rooms you can join” list always empty, and also broke the match lobby, the spectate list and resuming a game in progress. Rooms were being created correctly — only the code that displayed the list was failing. This had been happening since August 29. Sorry for the trouble.",
      "The board is now drawn with the new method (WebGL) for everyone. It used to be an admin-only experiment, but since it fixed the flickering and crashes on iPhone and iPad, it is on by default. If your device does not display it correctly, you can switch back under “When things feel slow or stutter” in Settings.",
      "Settings that used to be saved only in one browser are now saved to your account as well: CPU speed, strength and player count, CPU auto-advance, phase auto-skip, the square confirmation, the size and side of the enlarged card, showing board cards as artwork only, pinning your hand to the bottom of the screen, the drag restriction during automatic processing, ranked match notifications (including the time window), vibration, and your progress on the “what to do next” card. They now follow you across devices and browsers, and clearing your browsing data no longer resets them.",
      "The one-time “the flat 2D view is recommended” notice no longer appears on phones and tablets. The new way of drawing the board fixed the flickering it was there to work around (the 2D view itself is still available in Settings).",
    ],
    devItems: [
      "画面の中央に出るお知らせは、画面のどこかを押すとすぐに右下へしまえるようにしました（待ちきれない時用。中身はこれまで通り右下に残ります）。",
      "フェイズのお知らせがまだ出ているのに、次のフェイズのお知らせが重なって出てしまうのを直しました。",
      "相手が何もしていないターンが猛スピードで飛んでいってしまうことがあったのを直しました。プレゼントなどでお知らせが並んだ後に起きていました。",
      "お知らせが画面の中央に出ている間は、ターンが終わらないようにしました。",
      "赤のキューブ フェニックスを使ったとき、コストで捨てたカードが2回捨てたことになってしまうのを直しました。",
      "自分の手札をタップしたのに、その奥に重なって見えているロックエリアのカードが使われてしまうことがあったのを直しました。",
      "対戦結果を小さくしまう時のお知らせが、明るい配色にしていても暗いままだったのを直しました。",
      "お知らせや確認のモーダルが、前のモーダルに重なって出てしまうのを直しました。画面の中央には一度に1つだけ出るようにしています。",
      "駒が平べったく、少し透けているように見えていたのを直しました。立方体の面ごとの陰影（奥や左右の面を暗くする処理）が、盤面の新しい描き方で失われていました。",
      "お知らせが次から次へと一瞬で切り替わって読めなかったのを直しました。1つずつ間を空けて出るようにしています。",
      "移動先を選んでいる間の暗転が、パソコンだけ濃すぎたのを直しました。暗くする処理が二重にかかっていました（スマホでの見え方が本来の濃さです）。",
      "ロックの演出（光が集まって刻印が焼き付く演出）の最中に、次のお知らせが重なって出ていたのをやめました。演出が終わってから出ます。",
      "接触やマスチェンジなどの演出の最中に、お知らせのモーダルが重なって出ていたのをやめました。演出が終わってから出ます（選択が必要なモーダルは今までどおりすぐ出ます）。",
      "移動先を選んでいる間、選べないマスのカードが十分に暗くならず、カードに影が付いているように見えていたのを直しました。暗くする量の計算が間違っていました。",
      "手番のプレイヤーを示すロックエリアの光が、途切れ途切れに見えていたのを直しました。光が盤面の絵の裏に隠れていました。",
      "処理中に、ロックエリアの色の枠が一瞬すべて消えてまた出る、という点滅を直しました。",
      "ゲートのマスに置かれたカードが、黄色っぽく透けて見えていたのを直しました。マスの色がカードの上に重なっていました。",
      "モーダルのボタンを押した時に、その裏の盤面まで反応してしまうこと（接触の確認を押したら移動の確認も出る、など）を直しました。",
      "山札・捨て場などの山の「側面」（厚み）が消えて、上面だけが浮いて見えていたのを直しました。",
      "画面の大きい環境で、盤面のカードや駒がぼやけて色がくすんで見えていたのを直しました。盤面を描く解像度が画面の大きさに追いついていませんでした。同じ対局でも人によって色味が違って見えることがなくなります。",
      "「ホーム画面に追加」の案内が、ホーム画面のボタンに重なっていたのを直しました。画面の右上（オプションの下）へ移動し、パソコンでは「アプリとしてインストール」という言い方に変えました。",
      "参加できる部屋が1つも無い時の案内に、「ランク戦にする」で作った部屋はこの一覧には出ないこと（部屋コードで参加すること）を書き添えました。",
      "駒が1マス移動する時に、パッと次のマスへ現れるのではなく、実際に移動して見えるようにしました（相手の移動を見ている時と同じ見え方になります）。",
      "接触する時に駒の上へ出ていた「🤝 接触する」ボタンを無くしました。すぐ後に「本当に接触しますか？」の確認が出るので、同じことを2回聞いていました。これからは相手の駒へドラッグすると、そのまま確認が出ます。",
      "接触のタックル演出を短くしました（助走・タックル・ゲートへ戻るまでの時間）。",
      "「ホーム画面に追加」の案内文が、最後の2文字だけ次の行にこぼれて読みにくかったのを直しました。",
    ],
    devItemsEn: [
      "Notices in the middle of the screen can now be tucked away to the bottom right by tapping anywhere (for when you do not want to wait — the contents still stay in the bottom-right row).",
      "Fixed the next phase notice appearing on top of the previous one while it was still showing.",
      "Fixed turns where nothing happens racing past. This happened after notices piled up, for example from Present.",
      "Turns no longer end while a notice is still showing in the middle of the screen.",
      "Fixed the card discarded as a cost being counted twice in this turn's events when you used Phoenix, the Red Cube.",
      "Fixed tapping your own hand card sometimes using the Lock Area card that shows through behind it.",
      "Fixed the notice shown when you tuck the match result away staying dark even in the light colour scheme.",
      "Fixed notices and confirmation dialogs appearing on top of the previous one. Only one thing is shown in the middle of the screen at a time.",
      "Fixed pieces looking flat and slightly see-through. The shading that darkens the back and side faces of the cube had been lost when the board moved to the new drawing method.",
      "Fixed notices flashing past one after another too quickly to read. They now appear one at a time, with a pause between them.",
      "Fixed the dimming shown while you choose where to move being too dark on PC. It was being applied twice (the way it looks on phones is the intended darkness).",
      "Notices no longer appear on top of the lock animation (the light gathering and the seal burning in). They now wait until the animation has finished.",
      "Information pop-ups no longer appear on top of animations such as contact or Space Swap. They now wait until the animation finishes (pop-ups that ask you to choose still appear right away).",
      "While choosing where to move, cards on unavailable squares were not dimmed enough, so they looked like they had a shadow. The dimming calculation was wrong; it is fixed.",
      "Fixed the glow marking the current player’s Lock Area appearing broken up. The glow was hidden behind the board artwork.",
      "Fixed the coloured frames in the Lock Areas flickering — all of them briefly vanished and came back while the game was processing.",
      "Fixed cards on a gate square looking washed out with a yellow tint — the square's colour was being drawn over the card.",
      "Tapping a button in a dialog no longer also reaches the board behind it (for example, confirming a contact and getting the move confirmation as well).",
      "Fixed the sides (the thickness) of the deck and discard piles disappearing, leaving only the top face floating.",
      "On large screens the board cards and pieces looked blurry and washed out. The board was being drawn at a lower resolution than the screen actually shows. Two people in the same match will no longer see different shades.",
      "The “add to home screen” prompt no longer overlaps the buttons on the home screen. It moved to the top right (under the options), and on a computer it now says “install as an app”.",
      "When no rooms are open, the message now explains that rooms created with “Make it ranked” never appear in that list and are joined with a room code.",
      "When a piece moves one square it now travels there instead of appearing instantly (the same way you already see opponents move).",
      "The floating “🤝 Contact” button that appeared above the piece is gone. A “Really make contact?” confirmation follows right after it, so it was asking the same thing twice. Dragging onto an opponent’s piece now brings up that confirmation directly.",
      "The contact tackle animation is shorter (the run-up, the tackle, and the return to the gate).",
      "The wording on the “add to home screen” prompt no longer breaks awkwardly onto a second line.",
    ],
  },
  {
    date: "2026-09-04",
    items: [
      "盤面の絵の描き方を新しい方式（WebGL）に切り替えられるようにしました。iPhone・iPadで盤面がチカチカする・アプリが落ちる症状への対策です。あわせて、この方式のときに出ていた見た目の崩れを直しました——ロックしたカードの絵が上下逆さまになる／移動できるマスを選んでいる間だけカードのまわりに濃い影が出たように見える／対戦開始の準備中に、まだ出ていないはずの駒が変な形で一瞬見える／駒がカードの下に隠れてしまう、の4件です。",
    ],
    itemsEn: [
      "The board can now be drawn with a new method (WebGL), to address the flickering and crashes on iPhone/iPad. We also fixed four visual problems that came with it: locked cards were drawn upside down; a heavy shadow appeared around cards while choosing a square to move to; pieces briefly appeared in a strange shape during setup before they should be visible; and pieces could be hidden behind cards.",
    ],
    devItems: [
      "ライトモードなのに、対局中に出るモーダル（到達したカードの拡大表示、効果の説明など）だけがダークのままだったのを直しました。",
      "「このマスでいいですか？」の確認が、いつの間にか出なくなってしまう不具合を直しました。スマホでマスをタップして指を離した位置に「今後このモーダルを表示しない」が現れ、その指のタップがそのままボタンを押していました。もし今後この確認をオフにした時は、画面に一言お知らせします（基本設定からいつでも戻せます）。",
      "「使う前に確認する」モーダルにも同じ対策を入れました。開いた直後の一瞬は、はい／いいえ／今後表示しない のどれも反応しません。",
      "ザ・ギャンブルや試練の儀式の心臓の鼓動を、スマホ本体のスピーカーでも聞こえるようにしました。これまでは低い音が中心で、iPhoneのスピーカーではほとんど鳴っていませんでした。",
    ],
    devItemsEn: [
      "Fixed in-game modals (the arrival card zoom, effect explanations, and so on) staying dark even in light mode.",
      "Fixed the “Use this square?” confirmation silently turning itself off. On a phone, the “Don’t show this again” button appeared right where your finger had just been, and that same tap pressed it. If the confirmation ever gets turned off, we now tell you on screen (you can turn it back on in Settings).",
      "The same protection was added to the “confirm before acting” dialog: for a moment after it opens, none of its buttons respond.",
      "The heartbeat sound in The Gamble and Trial Ritual can now actually be heard through a phone’s own speaker. It used to be almost all low frequencies, which an iPhone speaker can barely reproduce.",
    ],
  },
  {
    date: "2026-09-04",
    items: [
      "フレンド機能を追加しました。オンラインで対戦した相手には、対戦が終わった画面からその場で申請できます（マイページの「👥 フレンド」からも、最近対戦した人に申請できます）。フレンドになると、その人が今アプリを開いているか、その人との通算成績が分かります。知らない人から申請が届くことはありません（名前で検索する仕組みは用意していません）。",
      "ゲート侵攻の演出の途中で勝敗が決まった時、演出を飛ばして勝利演出に切り替わってしまうのを直しました。侵攻の演出が最後まで流れてから勝利演出に進みます。",
    ],
    itemsEn: [
      "Added friends. You can send a request right from the end-of-match screen to anyone you just played online (or from \"👥 Friends\" on My Page, to people you played recently). Once you are friends you can see whether they have the app open and your head-to-head record. Strangers can never send you a request — there is no name search.",
      "Fixed the victory sequence cutting off the Gate Invasion animation when the game was decided in the middle of it. The invasion now plays out fully before the victory sequence begins.",
    ],
    devItems: [
      "フェイズを進める「スキップ」「マイデッキ」のボタンが、対局の途中から出てこなくなる不具合を直しました（昨日の修正で入り込んだものです。申し訳ありません）。",
      "「なないろの欠片」などで効果を選ぶモーダルが出ないまま、勝手に片方（1枚ドロー）に決まってしまう不具合を直しました。スマホでカードをタップして指を離した位置に選択肢のボタンが現れ、その指のタップがそのままボタンを押していました。",
      "対局中に「タイマーをONにする」ボタンが出たままになってしまうのを直しました。他の場所を触るか、しばらく置くと閉じます。",
      "ランク戦などで「もう一度遊ぶ」を選ぶと、ブースト・白黒カード・マイデッキ戦の設定が消えてしまう不具合を直しました。前の対局と同じルールで続きます。",
      "ゲストとして遊んだ方が、戦績管理システムに「プレイヤー」という名前で登録されてしまう不具合を直しました。以前は他の人がゲストかどうかを確かめる仕組みがうまく働いておらず、7月末から30件ほど余分な登録ができていました。",
      "「結ばれの一本桜 コノハナサクヤ」を、動かす先が無い時（相手の駒が盤面にいない／自分の周囲にカードの置かれた空きマスが無い）は使えないようにしました。コストだけ払って何も起きない、ということが無くなります。",
      "「なないろの欠片」の「２枚をロックする」で、2枚目が手札公開エリアにある時に選べるのに何も起きなかった不具合を直しました。",
      "段位ランキング（戦績管理システム）で、まだ1勝もしていないブロンズ（ゲージ０）の方を対象外にしました。",
    ],
    devItemsEn: [
      "Fixed the Skip / My Deck buttons disappearing partway through a match (introduced by yesterday's fix — sorry).",
      "Fixed the effect-choice dialog (Prism Shard and others) silently resolving to the first option (Draw 1) without ever appearing. On a phone the buttons appeared right under the finger that had just tapped the card, and that same tap pressed one of them.",
      "Fixed the \"Turn the timer on\" button staying on screen during a match. It now closes when you tap elsewhere, or after a short while.",
      "Fixed \"Play again\" losing the Boost, black/white cards and My Deck settings (in ranked matches for example). The next game keeps the same rules.",
      "Fixed a bug where people playing as a guest were registered in the battle-record system under the name \"Player\". The check for whether someone else was a guest never worked, and about 30 stray entries had built up since late July.",
      "Konohanasakuya, the Cherry of Bonds can no longer be used when there is nowhere to move an opponent to (no opponent piece on the board, or no empty square with a card around you). You will no longer pay the cost for nothing.",
      "Fixed \"Lock two\" on Prism Shard doing nothing when the second shard was in your revealed-card area.",
      "Players still at Bronze with an empty gauge (no wins yet) are no longer listed in the rank ranking on the battle-record system.",
    ],
  },
  {
    date: "2026-09-03",
    items: [
      "「奪ったカード」などの画面中央のお知らせが出ている間に手札をタップすると、そのカードの手札効果が発動してしまうことがあったのを直しました（スリカエで返すカードを選ぶつもりが使ってしまう等）。お知らせを閉じるまで盤面や手札には触れなくなります。",
      "アプリが使う画像を、実際に表示される大きさに合わせて作り直しました。スマホ（特にiPhone）で対戦中にアプリが落ちてタイトル画面に戻ってしまう不具合の対策です。ゲーム中に読み込む画像の重さがおよそ3分の1になり、通信量と読み込みの待ち時間も減ります。見た目は変わりません。",
      "追色を払う演出でカードが脈打つ時に効果音を付けました。",
      "勝利の演出に音を足しました。七色が1つ灯るごとに音が上がっていき、光が弾ける瞬間に一撃が入ります。",
      "最後のロックの承認で、相手の番のまま進まなくなることがあった不具合を直しました。",
      "対応しているスマホでは、鼓動に合わせて端末が振動するようにしました（基本設定でオフにできます。iPhone・iPadは振動できません）。",
    ],
    itemsEn: [
      "Tapping a hand card while a centre notice (such as “you took this card”) was showing could trigger that card’s hand effect — for example using a card you meant to hand back during Sleight of Hand. The board and your hand now ignore taps until the notice is closed.",
      "Every image in the app has been rebuilt at the size it is actually displayed. This targets the crash where the app would drop back to the title screen mid-match on phones (iPhone especially): the memory used by images during a match is now about a third of what it was, and downloads are lighter too. Nothing looks different.",
      "Added a sound to the card’s pulse when you pay a Color Cost.",
      "Added sound to the victory sequence: the pitch rises as each of the seven colours lights up, with an impact as the light bursts.",
      "Fixed: approving someone’s final lock could get stuck waiting on one player and never continue.",
      "On phones that support it, the device now vibrates along with the heartbeat (switchable in Settings; iPhone and iPad cannot vibrate).",
    ],
    devItems: [
      "「結ばれの一本桜 コノハナサクヤ」で相手を呼び寄せる時、光るマスを「カードが置かれているマス」だけにしました。これは「移動」なので、カードの無いマスへは動かせません。",
      "同じカードの「このターンあなたは接触できない」を、実際に守るようにしました（これまでは文章で知らせるだけで、接触できてしまいました）。",
      "オンラインで接触された時、相手にもきちんと承認の確認が出るようにしました。これまではカウンターロックを持っていない人には何も出ずに自動で承認されていて、申し込んだ側からは「聞かれていない」ように見えるうえ、すぐ承認が返ること自体が「あの人は持っていない」と分かってしまっていました。",
      "明るい配色にしている時、カードを受け取った時の中央のお知らせだけが暗いままだったのを直しました。",
      "カードの効果を処理している間（相手の選択を待っている時も含む）は、フェイズを進める「スキップ」「マイデッキ」のボタンを出さないようにしました。処理の途中でフェイズが終わってしまうのを防ぎます。",
      "CPUが、場に出ている「パーティー」を優先して手札に回収するようになりました。相手が置いて踏み直して使い回すのを止められます。",
      "カード効果でカードを置くマスを選ぶ時の案内を分かりやすくしました。1枚だけ置くカードで「（それぞれ別のマス）」と出て意味が分からなかったのを直し、複数枚置く時は「何枚目か・同じマスには置けない」と出るようにしました。",
      "「結ばれの一本桜 コノハナサクヤ」で相手を引き寄せる時、斜めの4マスが選べなかったのを直しました。カードの「周囲」は縦横斜めの8マスです。",
      "はじめての方向けに、ホーム画面の一番上へ「次にやること」を1つだけ表示するようにしました。①遊び方を覚える→②CPUと1戦→③誰かと対戦、と進み、終われば自動的に消えます（✕でいつでも消せます）。",
      "BGMが重なって鳴ってしまう不具合を直しました（マイページからホームに戻るとタイトルのBGMが鳴り出し、対戦を始めても鳴りやまない等）。BGMは常に1つだけ鳴る作りにしました。",
      "ホーム画面のBGMを待機中のBGMに変えました。",
      "オンライン対戦では、最後のロックの承認を全員に確認するようにしました。以前はゴメンナサイを使えない人が自動で承認されていたため、すぐ通ったことで「あの人は持っていない」と分かってしまっていました。",
      "右下に並ぶ「このターンの出来事」のマークを分かりやすくしました。手に入れた・引いたは「＋」に統一、ロックはカードに鎖が重なる表示、ゲート侵攻は「∞」になります。",
      "「不発のためこのカードを手札に加えます」などの結果のお知らせは、画面のどこかをタップすればすぐ閉じて次へ進めるようにしました（放置すれば今まで通り自動で消えます）。",
      "試練の儀式やザ・ギャンブルで鳴る心臓の鼓動を、もっとはっきり聞こえるようにしました（特にスマホ）。",
      "CPU戦を始めた時、配り始める直前に前の盤面（または起動時の盤面）が一瞬映っていたのを直しました。",
      "CPUがカウンターロックを持っているのに使わないことがあったのを直しました。ロックするカードが無くても、接触を無効にするために使うようになります。",
      "カードをじっくり選んでいると、処理中の判定が先に切れて駒が動かせてしまう不具合を、根本から直しました。何分かけて選んでも大丈夫です。",
      "相手の効果で自分がカードを置いた時、盤面のマークが相手のアバターになっていたのを直しました。実際に置いた人が表示されます。",
      "ゲート侵攻で自分のゲートのカードを回収した時、複数枚あればまとめて1つの画面で見られるようにしました。",
      "スマホで「◯◯を選んでください」の案内が小さすぎて読めなかったのを、他の画面と同じ大きさに直しました。",
      "スマホでアプリを閉じた時に「プッ」という音が鳴ることがあったので、音をなめらかに止めるようにしました。",
      "CPUが盤面の端ばかり通らないよう、同じくらい良い手なら内側を選ぶようにしました。",
      "CPU同士が「スリカエ」で手札を交換した時、何を交換したかが見えてしまっていたのを直しました。自分が関わっていない交換では、中身は伏せたまま「交換しました」とだけお知らせします。",
      "接触した時にカードを2枚奪ってしまうことがあった不具合を直しました。自動で承認する仕組みが2か所にあり、条件の変わり目で両方が動いてしまうことがありました。",
      "カードをオープンする効果（サフランなど）でじっくり選んでいると、処理中の判定が先に切れてしまい、その隙に駒が動かせてしまうことがあったのを直しました。",
      "対戦のあとホーム画面に戻ると無音になっていたのを直しました。タイトル画面と同じBGMが流れます。",
    ],
    devItemsEn: [
      "Konohanasakuya, the Cherry of Bonds now highlights only squares that have a card on them. Pulling an opponent is a Move, so squares without a card are not valid destinations.",
      "That card’s “you cannot make contact this turn” is now actually enforced — it used to be a message only, and contact still went through.",
      "In online play the defender is now always asked to approve a contact. Previously anyone without a Counter Lock was auto-approved silently, which looked like they were never asked — and the instant approval itself revealed that they held no Counter Lock.",
      "In the light colour scheme, the centre “you received a card” notice was still dark. It now matches the other light panels.",
      "While a card effect is being resolved — including while waiting for an opponent to choose — the Skip and My Deck buttons are hidden, so a phase can no longer end in the middle of an effect.",
      "The CPU now prefers to take a Party card that is sitting on the board, denying an opponent the place-and-step-on-it loop.",
      "The prompt for choosing where to place a card is clearer now. Cards that place just one no longer say “each on a different square”, and when placing several it tells you which one you are on and that two cannot share a square.",
      "Konohanasakuya, the Cherry of Bonds now lets you pull an opponent to any of the eight surrounding squares. The four diagonals were missing — “surrounding” includes them.",
      "New players now see a single “Next up” card at the top of the home screen: 1) learn how to play, 2) play one CPU match, 3) play someone. It disappears once you are up and running (or via the ✕).",
      "Fixed overlapping background music (for example the title theme starting when you returned home from My Page and never stopping once a match began). Only one track can now play at a time.",
      "The home screen now uses the waiting-room music.",
      "Online matches now ask every player to approve a final lock. Previously players who could not use So Sorry! were approved automatically, and the instant skip revealed that they did not hold the card.",
      "Clearer marks on the “this turn” chips at the bottom right: gaining and drawing are now both “+”, a lock shows chains over the card, and a gate invasion shows “∞”.",
      "Result notices such as “the effect fizzled, so this card returns to your hand” can now be dismissed by tapping anywhere, moving the game on immediately (leave it alone and it still closes by itself).",
      "The heartbeat sound in Trial Ritual and The Gamble is now much easier to hear, especially on phones.",
      "Fixed: starting a CPU battle briefly flashed the previous (or the app’s startup) board just before the deal.",
      "Fixed: the CPU sometimes held Counter Lock without using it. It now uses it to negate contact even when it has no card to lock (locking is optional).",
      "Fixed at the root: taking your time choosing cards no longer ends the “busy” state early, which had allowed a piece to be moved mid-effect.",
      "Fixed: when you placed a card because of an opponent’s effect, the board marker showed their avatar. It now shows whoever actually placed it.",
      "Gate invasion: cards recovered from your own gate are now shown together in a single window instead of one at a time.",
      "Fixed: the “choose …” banner was far too small to read on phones — it now matches the other on-screen messages.",
      "Fixed: closing the app on a phone could produce a short pop. Sound now fades out instead of stopping abruptly.",
      "The CPU no longer hugs the board edge as much — among equally good moves it now prefers the inside.",
      "Fixed: when two CPUs swapped cards with Sleight of Hand, the swapped cards were revealed. Swaps you are not part of now only say that a swap happened.",
      "Fixed: making contact could steal two cards. Two separate auto-approval paths could both fire when the conditions changed mid-way.",
      "Fixed: taking your time while flipping cards (Saffron and similar) could end the “busy” state early, letting a piece be moved in the middle of the effect.",
      "Fixed: returning to the home screen after a match left it silent — the title music now plays.",
    ],
  },
  {
    date: "2026-09-02",
    items: [
      "アプリの更新中に、どこまで進んでいるかが画面上部に出るようになりました（時間がかかる時でも止まっているのか進んでいるのか分かります）。",
    ],
    itemsEn: [
      "Updating the app now shows progress at the top of the screen, so you can tell it is working even when it takes a while.",
    ],
    devItems: [
      "CPU戦では、あなたの手番に持ち時間の時間切れが起きなくなりました。待っている相手がいないので、席を外していても勝手に手が進んだり砂時計が減ったりしません（オンライン対戦はこれまで通りです）。",
      "しばらく席を外して自動で進んだあと戻ってきた時に、「このマスでいいですか？」で「選び直す」を押すと何度も同じ確認が出てしまう不具合を直しました。自動で選ばれた分にはこの確認を出しません。",
    ],
    devItemsEn: [
      "In CPU battles your own turn no longer times out. Nobody is waiting on you, so stepping away never plays a move for you or spends your hourglasses (online matches are unchanged).",
      "Fixed: after being away and having your turn played automatically, choosing “Pick again” on “Is this the square?” could ask you over and over. Automatic choices no longer show that confirmation.",
    ],
  },
  {
    date: "2026-09-02",
    items: [
      "勝利演出の最中に「ロックしました」などの対局中のお知らせが画面中央に出て、演出の邪魔になっていたのをやめました。演出が始まったら、その時に出ているお知らせも片付きます（選択が必要なモーダルはこれまで通り出ます）。",
    ],
    itemsEn: [
      "In-game notices (like “Locked!”) no longer appear over the victory celebration — any already on screen are cleared when it starts. Modals that need your choice still appear as before.",
    ],
    devItems: [
      "対戦のあとホーム画面に戻っても、盤面のBGMが鳴り続けていたのを直しました。",
    ],
    devItemsEn: [
      "Fixed: the in-game music kept playing after a match when you returned to the home screen.",
    ],
  },
  {
    date: "2026-09-02",
    items: [
      "追色（同じ色のカードを捨てて使う）の演出で、吸い込まれていくカードが手札にも残ったままで二重に見えていたのを直しました。",
    ],
    itemsEn: [
      "Fixed: during the Color Cost animation, the card being absorbed also stayed in your hand, so it looked doubled.",
    ],
    devItems: [
      "「スリカエ」で相手に返すカードを選んでいる最中に、選んだつもりのカードをそのまま使ってしまうことがあった不具合を直しました。カード効果の選択待ちの間は、手札や駒に触れても動かなくなります。",
      "ゲート侵攻の処理中に駒を動かせてしまい、本来の「自分のゲートへ戻る」が上書きされてしまうことがあった不具合を直しました。処理が終わるまで盤面の操作を受け付けません。",
    ],
    devItemsEn: [
      "Fixed: while choosing which card to hand back for Sleight of Hand, tapping a card could use it instead. Cards and pieces no longer respond while a card effect is waiting for a choice.",
      "Fixed: pieces could still be moved while a Gate Invasion was resolving, which overrode the “return to your own gate” step. The board no longer accepts input until it finishes.",
    ],
  },
  {
    date: "2026-09-02",
    items: [
      "運営からのお知らせに掲載期間を設定できるようにしました。期間を過ぎたお知らせは、まだ読んでいない方にも表示されません。",
      "ブラウザで遊んでいる方に、ホーム画面への追加（アプリのように起動できます）をご案内するようにしました。Androidなどではボタン一つで追加でき、iPhone・iPadでは追加の手順をご案内します（「あとで」を押すとしばらく出ません）。",
    ],
    itemsEn: [
      "Announcements from the team can now have a display period. Once it ends, the announcement is no longer shown — not even to people who have not seen it yet.",
      "If you play in a browser, you will now be offered a way to add the game to your home screen. On Android it takes one tap; on iPhone and iPad we show you the steps (“Later” hides it for a while).",
    ],
    devItems: [
      "「奇跡の森 ヴァーディアン」で公開ドローしたカードをタップしても、そのカードが手札に入って裏向きになるだけで使えなかった不具合を直しました。タップすると、手札のカードと同じように使用の確認が出ます。",
      "公開ドローしたカードにカーソルを合わせる（長押しする）と、拡大表示に「このターン使わなかったら、ターン終了時に捨てられます」と出るようにしました。",
      "通常の移動でも、移動先のマスを選んだあとに「このマスでいいですか？」の確認が出るようにしました（カード効果でマスを選ぶ時と同じ確認です。基本設定でまとめて切り替えられます）。",
      "CPUが「ゴメンナサイッ！」を使った時、処理が速すぎて何が起きたのか分からなかったのを直しました。奪ったカードを見せるモーダルを閉じる（または自動で消える）まで、次へ進まなくなります。",
      "ホームに戻っても勝利BGMが鳴り続け、しばらくすると勝利BGMがまた鳴り始めることがあった不具合を直しました。",
      "非公開のカードを手に入れた時のお知らせに、花札の絵文字ではなくカードの裏面を出すようにしました（画面中央のお知らせと、右下の「このターンの出来事」の両方）。",
    ],
    devItemsEn: [
      "Fixed: a card drawn face-up by Verdian, the Wondrous Forest could not be used — tapping it just moved it into your hand face-down. Tapping it now asks to use it, just like a card in your hand.",
      "Hovering (or long-pressing) a face-up drawn card now shows “Discarded at end of turn if you don’t use it this turn” on the enlarged card.",
      "Normal moves now also ask “Is this the square?” after you pick a destination — the same confirmation used when a card effect asks you to pick a square (both can be turned off together in Settings).",
      "Fixed: when a CPU used So Sorry!, everything resolved too fast to follow. The game now waits for the “what was taken” card modal to close before continuing.",
      "Fixed: the victory music kept playing after returning home, and could start again on its own after a while.",
      "Notices about cards gained face-down now show the actual card back instead of a playing-card emoji (both the center flash and the “this turn” strip at the bottom right).",
    ],
  },
  {
    date: "2026-08-29",
    items: [
      "運営からのお知らせを、ホーム画面を開いた時にお伝えできるようにしました（同じお知らせが何度も出ることはありません）。通知を許可している方には、アプリを開いていなくても届くお知らせも送れるようにしました。",
      "不具合報告に、CPUの強さ・人数・2D表示・自動処理・演出の設定などの「その時の状態」を自動で添えるようにしました。原因の特定が早くなります。",
      "ホーム画面を開いたときに、このアプリがまだα版（テスト中）であることと、不具合の教え方をお知らせするようにしました。アプリを開くたびに1回だけ出ます（「今後このお知らせを表示しない」で止められます）。",
      "追色の演出は、画面のどこかをタップすればスキップできるようになりました。",
      "スマホで、画面左下のプレイヤー名・称号・手札枚数が表示されなくなっていたのを直しました（着せ替えアイコンを隠した際に、その分だけ表示欄が画面の外へずれていました）。",
      "画面の左上から駒に向かって半透明のカードが飛んでいく、意味のない演出が時々出ていたのを直しました（隠れている場所から飛ばそうとして、位置が測れず画面の隅から飛んでいました）。",
      "スマホ・タブレットで勝利演出の光やカードが実物と大きくズレて出ていたのを直しました（画面全体の縮小が二重にかかっていたためで、演出全体が対象です）。",
      "接触の演出のあと「奪った」表示が出ている最中に、ターンが次の人へ切り替わってしまうことがあったのを直しました。",
      "スマホでの勝利演出で、ロックの光が画面外の見えない場所に出ていたのを直しました。スマホで実際に見えている小さいロック表示の方に光ります。",
      "スマホでは、画面左下の着せ替えアイコン（駒スキン・カード裏・ペット・プレイマット・背景）を表示しないようにしました。狭い画面で盤面や手札の邪魔になっていたためです。着せ替えはマイページからこれまで通り変更できます。",
      "マイページの実績（対戦数・勝利数・勝率・勝率順位・対戦数順位・登録年月日）が表示されなくなっていたのを直しました。英語表示に対応した際の書き換えミスが原因でした。",
      "勝利演出で、ロックエリアの光がカードの外側に浮いて見えていたのを直しました。光を合わせる相手をロックの枠から実際のカードに変え、盤面が動いても常に追いかけるようにしたので、カードのふちにぴったり沿って光ります。",
      "勝利演出の脈動から、駒のまわりの丸い光（スポットライト）をなくしました。駒自体が光るだけになります。",
      "勝利演出で、ロックエリアの光が実際のカードの位置とずれていたのを直しました。盤面の映り方を実際に測って合わせるようにしたので、画面の大きさや盤面の拡大率が変わってもぴったり重なります。",
      "勝利演出の脈動から、中央の白い丸を消しました（勝者の色のにじみだけになります）。",
      "勝利演出を細かく直しました。ロックエリアの光が盤面と同じ向きに寝るようになり（板が立って見えていました）、脈動に重なる白い光は勝者の駒の色でやわらかくにじむようにしました。",
      "勝利演出で、宙に浮いたロックカードがその場で消えるのをやめ、勝者の駒（キューブ）へ吸い込まれるようにしました。カードが浮いた後はロックエリアの光も残らず消えます。",
      "勝利演出で、勝者のロックエリアの七色が暗転の裏側に隠れてしまい色が見えなかったのを直しました。七色は暗転より手前ではっきりと灯ります。",
      "勝利演出の標準の強さを、以前の「派手版」の設定にしました（光の量・脈動・残光が強めになります）。",
      "ライトモードで、モーダルの中の文字が薄くて読めなかったところを直しました（63か所）。前回モーダルの地を明るくした際に、中の文字色が暗い地のままの想定で残っていたためです。あわせて、以前から明るかったマイページ・ランキング・マイデッキ・ショップなどのページ内も点検して直しています。",
      "7色目をロックした時の演出を「七色、集結」として作り直しました。盤面が静まり、勝者のロックエリアの七色が順に灯り、その光が帯や霧のように揺れながら勝者の国宝キューブへ集まって吸い込まれます。キューブが3回脈動したあと、強烈な白い光が画面を覆い、その中に勝者が浮かび上がります。",
      "不具合報告にスクリーンショットを添付できるようにしました（任意）。ファイルを選ぶほか、Ctrl+Vでの貼り付け・ドラッグ＆ドロップにも対応しています。",
      "ショップの駒スキンから「0thリメイク」を外しました（「標準」と同じ絵柄のため）。これを選んでいた場合は「標準」として表示されます。",
      "英語表示に対応しました。オプションの「基本設定」で言語を English に切り替えると、タイトル画面から対局中の案内・ヘルプ・物語・マイページ・ショップ、カードの効果文やその補足まで英語で表示されます。",
      "称号を追加しました。対戦成績・ランク戦・不具合報告に応じて全16種類が少しずつ解放されます。マイページの名前の上をクリックするとコレクションが開き、お気に入りの1つを選んで名前の上に表示できます。",
      "マイデッキ編集画面に「使い方」を追加しました。初めて開いた時に自動で表示され、以降はヘッダーの「？ 使い方」からいつでも見返せます。あわせて、デッキの箱にカードをドラッグすると箱の絵をそのカードに変えられるようになりました。",
      "CPU戦や自動処理の途中で、まれに盤面が完全に止まって何も進まなくなる不具合を直しました。",
    ],
    itemsEn: [
      "The team can now send you a message that appears when you open the home screen (the same message never shows twice). If you have allowed notifications, it can also reach you while the app is closed.",
      "Bug reports now automatically include the settings in effect at the time — CPU strength and player count, 2D display, auto-processing, animation options and so on — so causes can be pinned down faster.",
      "When you open the home screen, a notice now explains that the app is still an alpha and how to report anything odd. It appears once each time you open the app, and can be turned off from the notice itself.",
      "You can now skip the colour-cost animation by tapping anywhere on the screen.",
      "Fixed your name, title and hand count disappearing from the bottom-left of the screen on phones. Hiding the dress-up icons had pushed that panel off the edge of the screen.",
      "Fixed a stray translucent card sometimes flying from the top-left corner of the screen toward a piece. It was a flight animation starting from a hidden element whose position could not be measured.",
      "Fixed the victory sequence appearing far from where it should on phones and tablets — the whole-screen scaling was being applied twice, which threw off every part of the sequence.",
      "Fixed the turn sometimes passing to the next player while the “stolen card” display from a contact was still on screen.",
      "Fixed the Lock Area glow in the victory sequence appearing off-screen on phones. It now lights up the small lock display you can actually see.",
      "On phones, the dress-up icons at the bottom-left (piece skin, card back, pet, playmat, background) are no longer shown — they got in the way of the board and your hand on a small screen. You can still change all of them from My Page as before.",
      "Fixed the achievements on My Page (matches, wins, win rate, rankings, join date) not appearing at all. It was caused by a mistake made while adding English support.",
      "Fixed the Lock Area glow appearing to float outside the cards during the victory sequence. It now tracks the actual card instead of the slot frame and follows the board if it moves, so it traces each card’s edge exactly.",
      "Removed the round pool of light around the piece during the victory pulse — now only the piece itself glows.",
      "Fixed the Lock Area glow not sitting on the actual cards during the victory sequence. It now measures how the board is actually drawn, so it lines up exactly at any window size or board zoom.",
      "Removed the white disc from the pulse in the victory sequence — only the winner’s coloured haze remains.",
      "Polished the victory sequence. The glow on the Lock Area now lies flat along the board instead of standing upright, and the light around the pulsing cube is now a soft haze in the winner’s colour rather than a hard white disc.",
      "In the victory sequence, the locked cards floating in mid-air are now drawn into the winner’s cube instead of fading out where they are, and the Lock Area glow no longer lingers once the cards have lifted away.",
      "Fixed the winner’s seven colors being hidden behind the dimming layer during the victory sequence — they now light up clearly in front of it.",
      "The victory sequence now defaults to what used to be the “flashy” setting (stronger light, pulse and afterglow).",
      "Fixed 63 places where text inside a modal was too faint to read in light mode. When the panel backgrounds were lightened, the text colours inside were still written for a dark background. Pages that were already light — My Page, the rankings, your decks, the shop — were checked and fixed too.",
      "The victory sequence has been rebuilt as “Seven Colors, Gathered”. The board falls quiet, the seven colours in the winner's Lock Area light up in turn, and their light drifts as ribbons and mist into the winner's National Treasure Cube. The cube beats three times, then a blinding white light floods the screen, and the winner appears within it.",
      "You can now attach a screenshot to a problem report (optional). Pick a file, paste with Ctrl+V, or drag and drop.",
      "Removed the “0th Remake” piece skin from the shop — it is the same artwork as “Standard”. If you had it selected, it now shows as “Standard”.",
      "The app is now available in English. Switch the language to English in Settings and everything is translated — the title screen, the prompts during a match, the help, the story, My Page, the shop, and the text and notes on the cards themselves.",
      "Titles have been added. All 16 of them unlock gradually from your match record, your ranked play and the problems you report. Click above your name on My Page to open your collection and pick one favorite to show there.",
      "The deck editor now has a “How to use” walkthrough. It appears the first time you open the editor, and you can bring it back at any time from “? How to use” in the header. You can also drag a card onto the deck case to make it the artwork on the box.",
      "Fixed a problem where the board could occasionally freeze completely during a CPU match or while effects were resolving automatically.",
    ],
    devItems: [
      "「この相手でいいですか？」の確認を、マスを選ぶ効果と相手を選ぶ効果できちんと出し分けるようにしました（駒が乗っているマスを選ぶ効果では、これまで通り「このマスでいいですか？」と出ます）。",
      "CPUが、パーティのような「全員がそれぞれ選ぶ」効果で、強さの設定に関係なくランダムに選んでしまっていた不具合を直しました（最強にしていても2枚オープンを選ぶことがあったのはこれが原因でした）。",
      "相手を選ぶカード効果（プレゼントなど）で、駒を選んでいるのに「このマスでいいですか？」と出ていたのを「この相手でいいですか？」に直しました。",
      "CPU戦が途中で止まってしまうことがあった原因を突き止めて直しました（赤のキューブ フェニックスを、CPUが「使えるのに何も起きない」状態で撃ち続けていました）。念のため、CPUが同じカードを撃ち続けても止まらないようにもしています。",
      "「収穫と種まき」に到達して、その効果でその「収穫と種まき」自身を拾い、同じマスへ置き直した時に、最後にもう一度手札へ加わってしまう不具合を直しました。置き直した場所に残ります。",
      "CPUがパーティの効果で「2枚オープン」を選んでしまうことがあったのを直しました（他に選べる選択肢がある限り選びません。CPUの強さの設定に関係なく効きます）。",
      "スマホでアプリを開いた時に、画面の一部にしか表示されないことがある不具合を直しました（縦横を切り替えなくても自動で直ります）。",
      "ランク戦の「対戦相手を募集している人が現れたらお知らせ」を、ホームのランク戦アイコンと対戦相手を待っている画面からその場でONにできるようにしました。",
      "スマホのホーム画面で、画面全体を上下にスワイプできてしまっていたのを直しました（中身はもともと収まっているのに、ほんの少しだけはみ出してスクロールできる状態になっていました）。",
      "CPUが、自分のロックエリアに置いたままでも使えるカード（ファーストカード・エターナルカード）を使えるようになりました。これまでは一切使わなかったため、ディメンションで一気に2マス動いてゲート侵攻できる場面などを見逃していました。",
      "CPUが、あと1色で勝ちの相手が必要としている色のカードを、場から優先して回収するようになりました（相手の勝ち筋を止めにきます）。",
      "スマホでα版のお知らせがスクロールしないと読めなかったのを直しました。横向きの画面では3つの項目が横に並び、文字も大きくなって、そのまま全部読めます。",
      "効果の自動処理モード中は、自分の手札公開エリア（画面下の枠）を出さないようにしました。公開したカードは手札の並びの中に出るので、下の枠は常に空で場所だけ取っていたためです（管理者向けの設定で元に戻せます）。",
      "「このマスでいいですか？」の確認を、画面の端ではなく選んだマスのすぐ隣（右上、入らなければ右下・左上・左下）に出すようにしました。上に出たり下に出たりしないので視線が動きません。",
      "追色（同じ色のカードを捨てて使う）の演出中に、効果の続き（セレスティアなら「相手の手札を選ぶ」など）が重なって出てしまうのを直しました。演出が終わってから次へ進みます。",
      "「このカードを選びますか？」の確認モーダルで、ボタンを押しても反応しないこと（カウンターロックでロックするカードを選ぶ場面など）を直しました。以前この症状を直した別のモーダルと同じ原因で、押した反応（明るくなる）だけは出るのにボタンが効かない状態でした。",
      "色を宣言する画面で、必要な数（試練の儀式なら3色）まで選び終えたら、残りの色が灰色になって選べなくなるようにしました。うっかり4色目を押しても増えません。選び直したいときは、選んだ色をもう一度押して外してください。",
      "カード効果でマスを選んだあと、「このマスでいいですか？」と一度確認するようにしました。押し間違えたまま確定してしまうのを防ぎます。確認は盤面を隠さない位置（選んだマスと反対側の端）に出て、そのマスが金色に光ります。モーダルの「今後このモーダルを表示しない」で切れますし、基本設定からいつでも戻せます。",
      "「黄のキューブ サフラン」でカードをオープンしたとき、何のカードをオープンしたのかが全員に分かるようになりました。",
      "CPUが「パーティー」の効果で「2枚オープン」を選ばないようにしました（他に選べるものが無い時だけ選びます）。",
      "スマホで、ロックなどのミニ通知が画面中央から一瞬だけ左上へ飛んでから右下へ向かう、おかしな動きを直しました。エモートのメニューが開く位置も同じ理由でずれていたので直しています。",
      "iPhone・iPadで、カードのタイトルとふりがなが効果文に重なって表示されることがあったのを直しました（ふりがなの作り方を、機種によって解釈が変わらない方法に変えました）。",
      "「ゴメンナサイッ！」をCPUが使ったのに、そのまま相手が勝利してしまう不具合を修正しました。カードのコストを払った一瞬のすきに、システムが「使えなかった」と判断して先に承認していたためです。",
      "色を宣言する画面で、1色選んだだけで残りの色が薄くなり「もう選べない」ように見えていたのをやめました。",
      "スマホでの、自分のアバター・手札を画面下に固定した時のトレイ・左下ステータスの位置を調整しました。",
      "スマホでの、画面左下に大きく映る自分のアバターの位置と、その背後にうっすら重なるアバターの大きさ・位置・濃さを、スマホ専用に調整できるようにしました（管理者向けの設定です）。",
      "勝利演出の脈動を作り直しました。白い丸が広がるだけだったところを、勝者の駒（キューブ）に少し半透明のもう1つのキューブが重なって脈打ち、脈動のたびに一回り大きく広がって消えるようにしました。駒スキンもそのまま反映されます。",
      "ライトモードなのにダークのままだったモーダル・パネル・案内表示を、まとめてライトの見た目に直しました（53か所）。確認モーダル、右クリックメニュー、カード補足、各種ピッカー、フェイズ案内、承認バナー、ツールチップなどが対象です。幕（背景を暗くするもの）・お祝いの色付きモーダル・物語の場面は、暗いままが正しいのでそのままにしています。",
      "カードの文字を、印刷されたカードに近い書体・太さにしました。これまでは端末に入っているフォント任せで、WindowsとMacで別の書体・細い表示になっていました。今後はどの端末でも同じ見た目になります。",
      "手札のカードにカーソルを合わせた時、その後ろにあるロックエリアのカードが拡大表示されてしまうことがあったのを直しました。実際に手前に見えているカードが拡大されます。",
      "手札のカードが透明になって見えない・カードが丸く切り抜かれて見える・カードの効果文が中央寄せになる、という不具合を直しました（同じ日に入れた変更による一時的な不具合でした。ご迷惑をおかけしました）。",
      "英語表示で、フェイズ案内の「移動か接触ができます」・スキップボタン・左下の称号・カード名の一部が日本語のままだったのを直しました（言語をあとから切り替えた時も追随します）。",
      "カードの効果文が枠からはみ出して絵の上に重なってしまうこと（なないろの欠片）を直しました。今後は枠に収まらない時だけ、その文だけ自動的に少し小さくなります。",
      "オンライン対局中にブラウザを更新すると、そのターンのロックフェイズがやり直しになり、もう1枚ロックできてしまう不具合を直しました。更新しても続きのフェイズから再開します。",
      "カウンターロックで接触を無効にした後、最後の1色（置けば勝利になるカード）をロックできなかったのを直しました。この場合も通常どおり全員の承認を挟みます。",
      "「重なっているカードを見る」の一覧で、カードにカーソルを合わせても拡大表示されなかったのを直しました。",
      "右下の「このターンの出来事」に、前のターンの出来事が残ってしまうことがあったのを直しました。",
    ],
    devItemsEn: [
      "The confirmation now correctly distinguishes “Choose this opponent?” from “Use this square?”, so effects that target a square still say square even when a piece is standing on it.",
      "Fixed a bug where the CPU chose at random in “everyone chooses” effects such as Party, regardless of the difficulty setting. This is why the strongest CPU sometimes picked “open two cards”.",
      "When a card effect asks you to choose an opponent (Present and others), the confirmation now says “Choose this opponent?” instead of “Use this square?”.",
      "Fixed the cause of CPU battles freezing mid-game (the CPU kept firing Phoenix, the Red Cube, in a state where it counted as usable but nothing could happen). As a safety net, the CPU also stops repeating the same card.",
      "When you land on Harvest and Sow and its effect picks up that same Harvest and Sow and puts it back on the board, it no longer gets added to your hand afterwards. It stays where you put it.",
      "The CPU no longer picks Party’s “open two cards” option while any other option is available — at every CPU strength setting.",
      "Fixed a bug where the app sometimes drew into only part of the screen when opened on a phone. It now corrects itself without rotating the device.",
      "Ranked alerts (being told when someone is looking for an opponent) can now be switched on right from the ranked icon on the home screen and from the waiting screen.",
      "On phones, the home screen could be swiped up and down even though everything already fit. It no longer scrolls.",
      "The CPU can now use cards that stay usable in its own Lock Area (First and Eternal cards). It never used them before, so it missed plays such as moving two squares at once with Dimension to invade your gate.",
      "The CPU now prefers to pick up a board card in the colour an opponent needs to win, to cut off their last colour.",
      "On phones, the alpha notice no longer has to be scrolled to be read. In landscape the three points sit side by side and the text is larger, so it all fits on one screen.",
      "While automatic effect processing is on, your own reveal area at the bottom of the screen is no longer shown — revealed cards already appear among your hand, so the frame was always empty and just took up space (an admin setting can bring it back).",
      "The “Use this square?” prompt now appears right next to the square you picked (upper-right, falling back to lower-right, upper-left or lower-left) instead of at the edge of the screen, so your eyes stay in one place.",
      "Fixed the rest of an effect (such as Celestia’s “choose an opponent’s card”) appearing on top of the colour-cost animation. It now waits for the animation to finish.",
      "Fixed the “Choose this card?” prompt not responding to its buttons — for example when picking a card to lock with Counter Lock. It was the same cause as another prompt fixed earlier: the button lit up on tap but the press never registered.",
      "In the colour declaration screen, once you have picked the required number of colours (three for Trial Ritual) the rest turn grey and can no longer be picked. To change your mind, tap a chosen colour again to deselect it.",
      "After you pick a square for a card effect, the game now asks “Use this square?” once, so a mis-tap no longer locks in. The prompt appears on the opposite edge from the square you picked so it never covers it, and that square glows gold. You can switch it off from the prompt itself and turn it back on any time in the basic settings.",
      "When “Saffron, the Yellow Cube” reveals a card, everyone can now see which card was revealed.",
      "The CPU no longer picks “reveal two squares” for Party — it only does so when nothing else is available.",
      "Fixed the mini notifications (for locking a card and so on) briefly jumping to the top-left of the screen before flying to the corner on phones. The emote menu opened in the wrong place for the same reason and is fixed too.",
      "Fixed the card title and its reading overlapping the effect text on iPhone and iPad. The reading is now built in a way that every browser lays out the same.",
      "Fixed “So Sorry!” being played by a CPU yet the opponent still winning. While the cost was being paid, the game briefly judged the card unusable and approved the lock first.",
      "In the colour declaration screen, the remaining colours no longer dim after you pick just one — it looked as if you could not choose any more.",
      "Adjusted the placement on phones of your avatar, the fixed hand tray at the bottom of the screen, and the bottom-left status area.",
      "On phones, the position of the large avatar at the bottom-left of the screen, and the size, position and opacity of the translucent one behind it, can now be adjusted separately from desktop (an admin setting).",
      "Rebuilt the pulse in the victory sequence. Instead of a plain white circle expanding, a slightly translucent copy of the winner’s cube now sits on top of the real one and beats, sending out a larger fading cube with every pulse. Your chosen piece skin is used as-is.",
      "Fixed 53 modals, panels and notices that stayed dark in light mode — confirmation dialogs, the right-click menu, card notes, the various pickers, phase notices, approval banners, tooltips and more. Dimming layers, the coloured celebration modals and the story scenes are meant to be dark, so those are unchanged.",
      "The text on the cards now uses a typeface and weight close to the printed cards. Until now it depended on whichever fonts your device happened to have, so it looked different — and thinner — on Windows than on a Mac. Everyone now sees the same thing.",
      "Fixed hovering a card in your hand sometimes enlarging the card behind it in the Lock Area instead. The card you can actually see in front is the one that enlarges.",
      "Fixed cards in your hand becoming invisible, cards being clipped into a circle, and the text on a card being centred. These were introduced by a change made earlier the same day — sorry about that.",
      "Fixed parts of the interface staying in Japanese in English mode — the “Move or make contact” phase note, the Skip button, the title under your name, and some card names. They now follow the language even when you switch it after the app has started.",
      "Fixed the text on a card spilling out of its frame and over the artwork (Prism Shard). From now on, only the text that does not fit is shrunk slightly to stay inside the frame.",
      "Fixed a problem where reloading the page during an online match restarted your Lock phase for that turn, letting you lock a second card. You now resume from the phase you were in.",
      "Fixed Counter Lock not letting you lock your last remaining color (the card that would win you the game) after nullifying contact. As usual, everyone still has to approve that final lock.",
      "Fixed cards in the “See the stacked cards” list not enlarging when you hovered over them.",
      "Fixed events from the previous turn sometimes being left behind in “What happened this turn” at the bottom right.",
    ],
  },
  {
    date: "2026-08-28",
    items: [

    ],
    devItems: [
      "オプションの「基本設定」を整理しました。よく使う設定（効果音・BGMの音量／カードを拡大表示する大きさ／全画面で遊ぶ／使う前に確認する）は開いてすぐ触れる位置に出し、残りは「動きが重い・カクつくとき」「画面の見え方」のように“困りごと”の名前でまとめました。折りたたみの中にさらに折りたたみがある状態も無くし、項目名も何が起きるか分かる言い方に書き換えています（設定できることは今まで通り全部あります）。",
      "対戦が終わった後、結果モーダルを閉じた直後に勝手にホーム画面へ戻されてしまうこと（ランク戦）を修正しました。終了後も部屋に残って盤面を確認できます。",
      "対戦結果が戦績システムに登録されないことがある不具合を修正しました。登録は勝敗が決まった瞬間に行われるようになり、対戦後のコメントは勝ち負けに関係なく参加者それぞれが残せます。",
      "パーティ（到達効果）が2周してしまう・1回のロック宣言に複数人が「ゴメンナサイッ！」を使えてしまう・ゴメンナサイの返事待ちの間にターンが進んでしまう、といった不具合を修正しました。",
      "セレスティア（青のキューブ）で、1人にしか手札を捨てさせられないことがある不具合を修正しました。捨てられたカードは全員に公開されます。",
    ],
  },
  {
    date: "2026-08-24",
    items: [
      "スマホ・タブレットで横向きに固定しやすくしました。全画面表示ボタンで全画面にすると、対応端末では自動で横向きに固定されます。また、ホーム画面に追加したアプリ（PWA）として起動すると横向きで開くようになります（iPhoneのSafariのタブのままでは、これまで通り縦向きの時に横向き案内が出ます）。",
    ],
    devItems: [
      "対戦終了時のモーダル（勝敗・もう一度戦う等）の文字が、ライト配色の時に薄くて見えにくかったのを読みやすい色に修正しました。",
      "ゲート侵攻で奪ったカードの中身が、本来見えないはずの他のプレイヤー（観戦者など）にも伝わってしまう不具合を修正しました（オンライン対戦のプライバシー）。",
      "カウンターロックの「手札を1枚ロックしますか？」の確認ボタンが、まれにタップしても反応せず進めなくなる不具合に、より確実な対策を入れました。",
      "マスチェンジ（到達効果）で、入れ替えが終わった直後にカードが手札へ回収されるよう、処理の順番を直しました。",
    ],
  },
  {
    date: "2026-08-18",
    items: [
      "カードを盤面のマスに置くとき、手札や山札からマスの真上へすーっと滑り、上空で止まってストンと落ちて配置され、着地の瞬間にカードの周りに風・ホコリがふわっと舞う演出を追加しました。逆に、マスのカードが手札へ入るときも持ち上がって滑り込む演出になります。手で置く時（ドラッグ＆ドロップ）だけでなく、合同建設・増殖する樹々・ジャンプ台などのカード効果で置かれる時や、CPUが置く時も対象です（動作を軽くしたい時はオプションの「アニメーションを減らす」でオフにできます）。",
      "ホーム画面に追加して、アプリのように起動できるようになりました（PWA）。ブラウザのメニューから「ホーム画面に追加／インストール」を選ぶと、タブやアドレスバーの無い全画面で遊べます。",
      "iPhone・iPadでは、ホーム画面に追加しておくと、アプリを閉じていてもランク戦のマッチ成立などの通知が届くようになります（Safariのタブのままだと閉じている間は届きません）。",
      "【ランク戦】対局結果のランクバッジに、湯気のような幻想的なオーラと、表面の光沢の演出を加えました。",
    ],
    devItems: [
      "CPU戦（1人用の練習相手）が賢くなりました。標準の強さを「中級」にして、行き当たりばったりではなく盤面を見て打つようになります（移動先の選び方・効果の使いどころ・色の宣言などを考えて選びます）。もっと弱く／強くしたい時は、CPU戦の開始画面や基本設定で「新人（ランダム）〜最強（伏せカードののぞき見あり）」を選べます。",
      "マイページを開いたまま「ヘルプ」「ランキング」を押すと開かないことがある不具合を修正しました。",
    ],
  },
  {
    date: "2026-08-17",
    items: [
      "【ランク戦】3〜4人のランク戦に対応しました。マッチメイク（自動で相手を探す）は、まず2人集まったら対戦を組み、そこから約20秒のあいだ3人目・4人目の参加を待ってから対戦を確定します（人数がなかなか揃わなくてもすぐ遊べて、集まれば自然に3〜4人戦になります）。合言葉フレンド戦でも、部屋に2〜4人集まれば開始できます。順位は「7色ロックの勝者=1位、以降はロックできていた色の数が多い順」で決まり、人数に応じたポイント表でレートに反映されます。",
      "【ランク戦】合言葉（部屋コード）で友達とランク戦ができるようになりました。部屋を作る時に「🏆 ランク戦にする」にチェックすると、結果がちゃんとレートに反映される2人対戦の私的な部屋になります（部屋コードを相手に共有し、「🔑 部屋コードで参加」から入ってもらいます）。",
      "【ランク戦】ランク戦のルールを統一しました：ターンタイマー・マイデッキ戦・白黒（無色）カードあり・ブーストモードの4つを常にON固定にします（マッチメイク／合言葉フレンド戦とも共通）。",
      "【ランク戦】対戦相手を探している待機中に、CPUと練習できるようになりました（マッチが成立したら自動で中断して対人戦に呼び戻します。CPU戦はレートに影響しません）。",
      "新しいペット「モリラ」「ポヨン」を追加しました（ショップで購入でき、タイトル画面のお散歩にも登場します）。",
      "【ランク戦】対局終了後の結果画面で、七色ゲージの宝石を1個ずつゆっくり点灯（勝ち）／消灯（負け）させる演出にしました。昇格した時は、旧ランクのゲージが完成→称号が変わる→新ランクのゲージへ余りが持ち越される、という流れで見せます。",
      "【ランク戦】ホーム画面・マイページのランク表示をクリックすると「ランク戦について」の説明（段位・七色ゲージ・ポイント・シーズン・対戦相手の見つけ方）が開くようにしました。ヘルプの索引にも「🏆 ランク戦について」を追加しました。",
      "【ランク戦】対戦相手が待機に現れたら通知を受け取る設定（オプション）を追加し、ホーム画面のランク戦メニューに現在の待機人数を表示するようにしました（プレイ人口が少ないうち向け。通知の時間帯も設定できます）。",
    ],
    devItems: [
      "スマホで別のアプリ／画面を開いている間は、BGM・効果音が鳴らないようにしました。iPhoneのマナーモード（サイレントスイッチ）もできるだけ尊重して消音します。画面に戻ると、鳴っていたBGMが再開します。",
      "【ランク戦】別のタブやアプリを見ている時でも、対戦相手が見つかった時・待機中の相手が現れた時にブラウザ通知とタブのアイコン（ファビコン）点滅で気づけるようにしました（特にキュー待ち中に別タブへ移っていても、マッチのレディチェックを見逃しにくくなります）。通知の許可を求める前に「何のための通知か」をアプリ内で説明するようにしました（いきなりブラウザの許可ダイアログが出て戸惑わないように）。",
      "【ランク戦】シーズン（毎月）終了時に、その月の到達ランクに応じて通貨がもらえるようになりました。新しい月に初めてログインした時に「先月の報酬」として受け取れます。",
      "2D表示モードでペットが見えない（一瞬たまに見える）不具合を修正しました。",
      "【ランク戦】ランク戦は自動処理モード・ターンタイマーが常にON固定です（不正・放置対策）。",
      "【管理者向け】スモークテスト（CPU同士の自己対戦点検）に「不変条件チェック」を追加しました。対戦が止まらなくても、状態が壊れていないか（トークンの重複・同じマスに駒が2つ・カード総数の増減・ロックの色不一致など）を毎手番点検し、異常があれば診断ログに記録してFAIL扱いにします。人間対戦のバグ発見の負担軽減が狙いです。",
    ],
  },
  {
    date: "2026-08-14",
    items: [
      "ザ・ギャンブルの公開演出を改善しました（#95）。公開するカードを、公開エリアに出す前に画面中央のじらしフリップで全員に見せ、フリップ演出が全部終わってから公開エリアにまとめて並べるようにしました（以前は公開エリアに先に表向きで置かれてしまっていました）。",
      "タイトル画面の「🤖 CPU戦（1人用）」ボタンを撤去しました。CPU戦はログイン後のホーム画面「CPUマッチ＆フレンドリーマッチ」から始められます。",
      "ローカルCPU戦などで、接触の解決後にまれに進行が止まってしまう不具合を修正しました（接触後に優先権が手番プレイヤーへ戻らないケース。閉じる人がいない結果モーダルを短時間で自動的に閉じるようにしました）。",
      "盤面が固まって（手札が全部グレー表示・スキップボタンが押せない）進めなくなった時、しばらくすると自動で操作可能な状態へ復帰する安全装置を追加しました（#93。原因の切り分け用に、どこで固まったかの記録も残します）。",
    ],
    devItems: [
      "ザ・ギャンブルの「1枚ずつ公開する／全部公開する」モーダルが、オンライン対戦で到達効果が二重発火して二重に出たり閉じなくなったりする不具合を修正しました（#96）。",
      "カウンターロックで相手の接触を無効化した時、その旨を全員にカード画像付きモーダルで知らせるようにしました（#90）。",
      "「もう一度遊ぶ／もう一度戦う」を押した“その瞬間”に勝利BGMが止まるようにしました（#88。以前は再戦のセットアップが終わるまで鳴り続けていました）。",
      "2D／3D切替の説明モーダルが実質2回出てしまっていたのを、1つに統合しました（#89）。",
      "【管理者向け】タイトル画面の右下（管理者ログイン時のみ）に、CPU同士の自己対戦を自動で回してエラー・盤面破損・詰みを点検する「🧪 スモークテスト」ボタンを新設しました。ウィンドウはドラッグで移動でき、位置・サイズは管理者モードの「📐 位置合わせ」で調整できます。",
    ],
  },
  {
    date: "2026-08-08",
    items: [
      "【新機能】タイマーが連続で規定回数タイムアップしたプレイヤーを、自動的にCPU操作へ切り替えるようにしました（放置対策）。切り替わった本人には画面下に「🤖 CPUに切替中です／復帰する」バナーが出て、押せばすぐ操作に戻れます（手動操作すればカウントはリセット）。相手側にはそのプレイヤー名に「🤖CPU操作中」が表示されます。切り替えまでの回数と代行CPUの強さは、基本設定内（管理者のみ表示）で調整できます。",
      "ザ・ギャンブルの公開カードの中央じらしフリップ演出も、オンライン対戦で全プレイヤーに配信するようにしました（試練・マスチェンジと同様。公開カードのため全員が同じ演出を見られます）。",
      "マスチェンジの入れ替え電撃演出が、オンライン対戦で相手の画面に出ていなかった不具合を修正しました（#43。演出が実行者本人の画面だけのローカル再生だったため、相手クライアントにも配信して同じアークが見えるようにしました）。",
      "試練の儀式で踏んだカードの中央じらしフリップ演出を、オンライン対戦では全プレイヤーに配信するようにしました（踏んだカードは公開情報のため、実行者だけでなく全員が同じ演出を見られます）。",
      "マスチェンジの入れ替え演出の電撃を、鋭い実線から「ぼやけた湯気のようなオーラの電撃」に変更しました（外側に広くぼかしたオーラ層を追加し、芯も柔らかくにじませ、明滅を少しゆっくりに）。",
      "マスチェンジの入れ替え演出の電撃を橙色に変え、線をもっと太くしました。",
      "試練の儀式も、移動先を選んで駒が進んだ後に一拍おいてから、踏んだカードを画面中央で“じらしフリップ”で公開するようにしました（ザ・ギャンブルと同じ演出）。",
      "マスチェンジで駒が入れ替わる時に、両方の駒が発光し、不安定な電撃のような光で結ばれて位置が入れ替わる演出を追加しました。",
      "到達カードモーダルに「📌 キープ」ボタンを追加しました。押すとそのカードはターンを跨いでも消えず、✕で閉じるまで残ります（あとでゆっくり読みたい時用。複数キープすると左上に少しずつずらして重なります）。",
    ],
    devItems: [
      "盤面拡大でミニロックエリア（画面下中央の縮小ロック＋ミニ手札公開エリア）が出ている間は、自分の通常の手札公開エリアを非表示にしました（重複を解消）。",
      "無意味なループ（例：2マス離れたジャンプ台の永久往復）を、ルール通り正しく防ぐようにしました（#49）。移動連鎖で既に通ったマスへ戻る「ループ先」は、CPUは選ばず別の手を採り、人間はそのマスをクリックすると警告が出て選べません。行き先が実質無い場合は直前に着地したマスに正しく留まります（以前の暫定対応の“途中で打ち切り”を廃止）。",
      "不具合報告に対局コンテキスト（オンライン/ローカル/CPU戦の別、各座席・手番・自席がCPU代行中か）を添付するようにしました（#48のご提案。状況の切り分け用）。",
      "試練の儀式で、オンライン対戦時に到達効果が二重発火して儀式が二重に走り、色選択モーダルが選択しても閉じない等の異常になる不具合を修正しました（#46。儀式に再入ガードを追加し、同時に2つ走らないようにしました。#47の合同建設まわりの異常もこの二重処理が原因の可能性が高く、あわせて改善が見込まれます）。",
      "対戦後のコメントが戦績システムに反映されない不具合をさらに強化修正しました（#45）。敗者はコメントを勝者へも中継し、勝者（試合IDを確実に保持）が代理投稿する経路を追加。あわせて敗者本人の直接投稿も試みます（返信IDを試合×プレイヤーで一意にしたため二重投稿にはなりません）。",
      "【CPU代行】AFKでCPU代行中のプレイヤーが、ゴメンナサイ／カウンターロックなどのリアクション判断でも止まらないようにしました（CPU戦と同じ挙動。相手の最後のロードにはゴメンナサイで自動対応、接触にはカウンターロックを使わず自動承認）。",
      "スリカエで相手の手札を奪う時、中央の受け取りモーダルのカード画像が「null」になってしまう不具合を修正しました（#43/#44。オンラインでは相手の手札の中身が隠れているため、先に自分の手札へ移してから中身を表示するようにしました）。",
      "対戦後のコメントが戦績システムに反映されないことがある不具合を修正しました（#42）。敗者側は勝者からの試合ID通知（Realtime）を取りこぼすとコメントが黙って捨てられていたため、通知を受け取れなかった場合は直近の試合を直接検索してコメントを紐づけるフォールバックを追加しました。",
      "スマホの縦持ち時に出る「端末を横向きにしてください」の案内を、画面全体に大きく表示するようにしました（アイコン・文字を画面サイズに追従して拡大）。",
      "接触の結果モーダルが閉じる前に次のターンが始まってしまう不具合を修正しました（#40）。結果モーダルが閉じるまで自動ターン終了を止め、通常は数秒で自動的にも閉じるようにしました（CPU戦では自動で閉じず、クリックするまで結果を確認できます）。",
      "試練の儀式のじらしフリップを、オンライン対戦でもローカルと同じように（盤面は伏せたまま、中央で1枚ずつじらしフリップ→その後に盤面を表向き）体験できるようにしました（サーバーが引いたカードの中身を引いた本人だけに返す方式。※サーバー側の再デプロイ後に有効。未デプロイの間は従来どおり先に表向きになりますが正常動作します）。",
      "ライトモード時、ログインボーナスのモーダルがダークのままだった不具合を修正しました（アイボリー地＋ゴールド枠＋濃い文字に）。",
      "オンライン対戦で試練の儀式が不発（カードがめくられず、駒も動かず「残念でした」で終了）になっていた不具合を修正しました（#41。伏せて置いたカードの中身がオンラインでは読めず色判定に失敗していたため、読めない場合は先に表向きにして判定するようにしました）。",
      "【CPU強化】スリカエ（手品師の技）でCPUが相手に渡すカードを賢く選ぶようにしました。自分がまだ要る色・相手がまだ要る色・貴重札はなるべく渡さず、双方ロック済みで無害な色を優先して渡します。",
      "【CPU強化】合同建設でCPUが置く場所を賢くしました。相手ゲート（＝空きなら侵攻の足場作り、近い空きマスなら侵攻ルートの前進）へ山札から置き、自分のゲート（空なら着地不能で既に安全）には置かないようにしました。",
      "【CPU強化】自ゲート防衛を「乗られてから」ではなく「乗られる前」に行うよう修正しました。相手駒が自分のゲートに接近したら、CPUが自駒で自ゲートを占有し、相手が着地（＝ゲート侵攻）できないようブロックします。",
      "【CPU強化】CPUの移動が相手ゲートへ直行しやすくなりました（不具合#38対応。ゲートへの近づき度の重みを大きくし、途中のカード拾いより侵攻ルートの前進を優先）。",
      "【CPU強化】CPUの接触判断をカウンターロックの所持と連動させました。カウンターロックを持っていない時はむやみに相手の隣へ行かず（接触を狙わない・隣接に留まらない）、持っている時は積極的に接触を狙います。自分のゲートに乗った侵入者への体当たり（防衛）は常に行います。",
      "【CPU強化】パーティの「2枚オープン」で開けるマスを、無関係な場所ではなく相手ゲートに近いマス（＝侵攻ルートの偵察）から選ぶようにしました（不具合#39対応）。",
      "【CPU強化】CPU戦で、あなたが最後の7色目のロックを宣言した時、CPU（中級以上）がゴメンナサイ（＋追色コスト）を持っていれば自動で発動し、あなたのロックを1枚奪って勝利を阻止するようになりました。以前はCPUがゴメンナサイを一切使ってこず、承認欄の操作も人間側に見えてしまっていました（今はCPUの承認中は「CPUの承認を待っています…」表示になります）。",
      "ゲート侵攻で自分のゲートのカードを全て回収する時、何を回収したのかを回収した本人の画面だけに画面中央で大きく1枚ずつ表示するようにしました（表向き・裏向き問わず。裏向きだった分の中身も自分だけが確認できます）。",
      "【CPU強化】CPU（中級以上）が、収穫と種まき等で場のカードを拾う時、①相手ゲート ②相手の侵攻経路上のカード（拾って踏み台を潰し、自ゲートを守る）③場のジャンプ台（道具として積極的に確保）④まだ要る色、の順で狙うようになりました。",
      "【CPU強化】CPU（中級以上）が、効果でマスを選ぶ時（収穫と種まき等の拾う先など）に、相手ゲートに乗れるマス＞まだ揃っていない色の表向きカードがあるマス＞その他、の順で選ぶようになりました。また、スラム上がりの役人の手札効果は手札が少ない時だけ使う（多い時は不発になるので使わない）等、状況に応じて手札効果を使うようになりました。",
      "【CPU強化】CPUの移動がフラフラして意味不明だったのを、目的を持って動くようにしました。相手ゲートへ近づく（ゲート侵攻を狙う）、相手の駒へ近づく（接触を狙う）、自分のゲートに乗った相手には接触で追い返す（自ゲート防衛）を評価して移動先を選びます。",
      "効果お知らせの主語を総点検し、ザ・ギャンブルの成功（CONGRATULATIONS!）・試練の儀式の「〇回成功！」・ディメンションの一気移動など、相手が発動した時に自分の画面で「自分の結果」に見えてしまう文言に発動者名を添えました。",
      "試練の儀式で、置いたカードを盤面では裏向きのままにし、画面中央のじらしフリップで初めて公開するようにしました（以前は盤面のカードが先に表になっていてドキドキ感がありませんでした）。中央で公開した後に盤面のカードも表向きになります。",
      "【CPU強化】CPU（中級以上）が、コスト支払いや場に置くカード・捨てるカードを選ぶ時、要らないカード（既にロック済みの色など）を優先して手放し、まだ要る色や強い札（ゴメンナサイ・なないろの欠片・ファースト/エターナル）は残すようになりました。",
      "【CPU強化】最強のCPUは、相手の手札を奪う時（スリカエ・接触・ゲート侵攻）に中身をのぞき見して、一番価値の高い札（自分がまだ要る色・相手の強いリアクション札）を狙って奪うようになりました（中級・上級は従来通り無作為＝相手の手札は見えないため）。",
      "カウンターロックの到達効果のお知らせを「あなたは１番少なくロックしているので…」→「（発動者名）は１番少なくロックしているので…」に変更しました。相手が発動した時に自分の画面で「あなた」と出ていたのを、発動したプレイヤー名で表示します。",
      "【CPU強化】CPU（中級以上）が、ハンドフェイズで手札効果を能動的に使うようになりました（第一歩として、明確に得で安全な「収穫と種まき」「増殖する樹々」のみ。ザ・ギャンブルのようなリスクのある効果は使いません）。以前はハンドフェイズを丸ごとスキップしていました。",
      "捨てる／奪うロックカードを選ぶ時（選べる罠のロック捨て・ゴメンナサイの奪取など）、盤面を拡大してロックエリアが画面外の場合でも、ミニロックエリアの光っているスロットから選べるようにしました。",
      "セレスティア（青のキューブ）で相手の手札を選んだ時の中央モーダルを「奪った」→「捨てさせた」に変更しました（セレスティアは相手に捨てさせる効果で、自分の手札には加わらないため）。",
      "【CPU強化】CPU（中級以上）がゲート侵攻をより狙うようにしました。効果のマス選択で相手ゲートに乗れるならそこを選び、パーティーで1マス移動して相手ゲートに乗れるなら「移動」を優先、選べる罠では相手ゲートに乗って侵攻できる時に「自ゲートへ強制移動」を避けます。",
      "【CPU強化】CPU（中級以上）が、効果の選択肢を賢く選ぶようにしました。パーティーでは「場のカードを手札に得る」を優先し、選べる罠では被害の一番小さい選択肢（ロックを捨てる＝色が減る最悪手を避ける）を選びます（新人は従来通りランダム）。",
      "管理者モードのBGM「▶ 試聴」ボタンを、試聴中は「⏹ 停止」に切り替わるトグルにしました（もう一度押すと止まります）。スライダーは試聴中の音量をその場で反映します。",
      "スタートプレイヤー決定モーダルを、モーダルのどこかをクリックすると閉じられるようにしました（✕を押さなくてもOK。背景クリックは従来通り盤面へ素通しします）。",
      "勝利時BGMの既定音量を40%にしました（管理者モードで変更可）。",
      "接触で相手の手札を奪う時、「奪った」モーダルが出るその瞬間に、実際にそのカードが自分の手札へ加わるようにしました（以前は接触の一連の処理がすべて終わった後に加わっていました）。「奪った」モーダルは閉じる（クリック）まで次の処理へ進みません（タイムアップ時は自動で進みます）。",
      "【不具合#36】「ゴメンナサイを使う」を押した後、承認バナーが「ロックエリアから奪うカードを選んでください」の案内に切り替わるようにしました（承認/ゴメンナサイのボタンは引っ込みます）。",
      "管理者モードの各BGM音量スライダー（勝利時・オープニング・ゲーム時・待機中）に「▶ 試聴」ボタンを追加しました。スライダーを動かさなくても現在の音量で鳴らして確認できます（今後BGMが増えても同じ形で追加します）。",
      "マスチェンジの入れ替えと到達効果のルールを整備しました。入れ替えは「移動」ではないので裏向きカードは開きませんが、入れ替わり先に表向きのカードがあれば到達効果が発動します（発動者・相手ともそれぞれの入れ替わり先について）。到達効果で使った場合、相手が入れ替わった先＝マスチェンジ自身は再発動せず、マスチェンジが手札に加わって下の表向きカードが露出すればそれが相手の到達効果になります。両者の入れ替わり先に表向きカードがあれば同時発動で、処理順は発動者から時計回りです（カードの補足とQ&Aにも追記しました）。",
      "行動ログウィンドウの右上に✕（閉じる）ボタンを追加しました（📜アイコンだけでなくウィンドウ自身からも閉じられます）。",
      "【CPU強化】CPU（中級以上）が、ザ・ギャンブル・試練の儀式で色を賢く宣言するようにしました。ザ・ギャンブルでは手札を捨てないよう「出にくい色」を、試練の儀式では続きやすいよう「出やすい色」を、見えているカードから各色の残り枚数を推定して選びます。最強はさらに山札の一番上をのぞき見して、試練は当たる色、ギャンブルは引かれない色を狙います（新人は従来通りランダム）。",
      "ザ・ギャンブルの公開を、公開エリアだけでなく画面中央に大きく“じらしてフリップ”で1枚ずつ見せるようにしました（エターナル獲得と同じ正方形フリップ）。",
      "ザ・ギャンブル・試練の儀式の最中に、心臓の鼓動の効果音（合成音）を鳴らして緊張感を出すようにしました（結果が出たら止まります）。",
      "パーティで選択肢を選んでから移動先などのマスがハイライトされるまでの間が長かったのを、「○○を選択しました」の告知中にすぐハイライトされるようにしました。",
      "試練の儀式で、色を宣言してから実際にカードを置いて捲るまでに“ため”（少し間＋鼓動）を作り、CPUの進行が早すぎて追えなかったのを見やすくしました。",
    ],
  },
  {
    date: "2026-08-07",
    items: [
      "ザ・ギャンブルで宣言した色が出ずに手札を守れた時に、紙吹雪＋大きな「CONGRATULATIONS!」のお祝い演出を追加しました。",
      "試練の儀式は必ず最後はハズレで終わるため、最後に「〇回成功！」（当たった回数）を紙吹雪でお祝い表示するようにしました（途中の「おめでとう」モーダルはなくし、踏んだカードの中央表示＋最後のまとめ演出に整理しました）。",
      "カード拡大表示（PCはホバー、スマホ/タブレットは長押し）を、指やカーソルの右に出すか左に出すかをオプションの「基本設定」→「カード拡大を出す向き」で選べるようにしました（既定は右）。",
      "【CPU戦】CPUの強さを選べるようにしました（オプション →「CPU戦（1人用）」→「CPUの強さ」）。新人＝これまで通り完全ランダム。中級＝移動先を評価して選びます（相手ゲートに乗って侵攻を狙う／選べる罠・ザ・ギャンブル等の自滅マスを避ける／まだ揃っていない色を優先）。上級＝さらに相手の進行度を見て、進んでいる相手には接触（体当たり）で妨害します。最強＝上級に加えて伏せカードの中身ものぞき見して最善手を選びます。",
      "ゲート侵攻でエターナルを獲得する演出について、①画面中央で止まった後に少し“きゅっ”と拡大してからフリップしていたのを、継ぎ目なく（拡大せず）フリップするようにしました。②スマホでフリップしても表にならず裏向きのままになる不具合を修正しました（一部端末で効かない3D回転をやめ、全端末で確実に表になる方式に変更）。",
      "ミニロックエリア（拡大時の表示）に「ミニ手札公開エリア」を追加しました。公開ドロー（表向きに引いたカード）を、各プレイヤーのミニロック行の左隣に左揃えで表示します（自分・相手とも）。",
      "ミニロックエリアを改良しました。相手プレイヤーのミニロックエリアは画面最上部に表示するようにし、名前の隣は「N/7」ではなく手札枚数を表示するようにしました。自分のミニロックエリアの右隣にはミニ捨て場（一番上のカードと枚数）を追加しました（位置は管理者モードで調整可）。",
      "駒スキンの新デザイン（0thリメイク）を追加し、これを標準（デフォルト）の駒スキンにしました。旧「基本」スキンは「紋様」に名前を変更しました（駒スキン選択・ショップに反映）。※以前の駒が表示され続ける場合は、一度 Ctrl+Shift+R で強制再読み込みしてください（ブラウザの画像キャッシュ対策）。",
      "ミニロックエリア（拡大時に出る下部表示）の位置を画面最下部に変更しました。念のため、管理者モードの「表示位置」に位置調整（下からの位置・横ずれ・手札固定ON時の位置）を追加しました。",
      "盤面を拡大した状態でゲート侵攻のエターナル獲得演出が入ると、フリップするエターナルが画面からはみ出す不具合を修正しました（表示サイズを盤面ズームに引きずられず、常に画面内に収まるようにしました）。",
      "オプションの「基本設定」に『自分の手札を画面下に固定する』を追加しました（既定OFF）。ONにすると、マウスホイールで盤面を拡大しても自分の手札が見切れず、画面下に一定サイズ・一定位置の手札トレイとして固定表示されます（ステータスエリアと同じく盤面ズームの外側に出すため、見た目は平らな手札トレイになります）。",
      "【CPU戦】ゲーム開始時に、通常対戦と同じセットアップ演出（ファーストカードの配布→盤面へのカード配置アニメ）を見せるようにしました（以前は演出が裏で終わってしまい見えませんでした。開始時に一瞬4人が座って見える問題は引き続き出ません）。",
    ],
    devItems: [
      "初回起動時の「サウンドと表示の設定」モーダルを、①サウンド（BGM/効果音）②表示（カード拡大サイズ）の2ステップに分け、スクロール不要にしました。",
      "ゲート侵攻でエターナルを獲得する演出で、フリップするタイミングでカードの上下が見切れる不具合を修正しました（カード画像は正方形なのに、直前の修正で表示枠を横長のエターナル束の比率に合わせてしまい上下が切れていました。表示枠を正方形に戻し、飛翔から中央表示への受け渡しも継ぎ目なく保ちました）。",
      "合同建設で、置くプレイヤーの手札が無い時は「山札から／手札から」の選択を出さず、自動で山札から１枚置き、「手札がないため山札から置きました」と全員に周知するようにしました（手札が無いのに選択を求められる無駄をなくしました）。",
      "【不具合#35】CPU戦で、CPUが収穫と種まき等で獲得したカードが、右下のカード獲得トーストに「あなたが獲得」として中身ごと表示され、CPUの手札がバレてしまう不具合を修正しました（取得したのが自分の時だけトースト＆手札の発光を出すようにしました。CPUの取得は伏せたままです）。",
      "【不具合#34】相手の近くで出る「🤝 接触する」ボタンの左端しか反応せず、真ん中を押しても何も起きない不具合を修正しました（フローティングUI一式を載せる層の中の、盤面上部にある相手プレイヤーのステータス表示が接触ボタンより手前に来てクリックを奪っていたのが原因。接触ボタンを最前面へ出しました）。",
      "ミニロックエリアの位置調整で、相手（上部）の既定の上からの位置を調整しました（実機での見やすさに合わせて 0.5rem → 2.2rem）。",
      "【不具合#33】自分がゴメンナサイッ！を使った時、奪うロックカードが自動で選ばれてしまう不具合を修正しました。相手（CPU等）のターン中に自分がリアクションでゴメンナサイを使うと、選択の主体が自分なのにCPUの選択と誤判定され、CPUの自動処理が勝手に1枚選んでいたのが原因です。自分が使うリアクションの選択は自分で選べるようにしました（同種の『あなたのターン以外に使う手札効果』全般に効きます）。",
      "到達したカードを手札に獲得した時、右下のカード獲得トースト（何を獲得したか）が出ないことがある不具合を修正しました（自動処理で到達効果を処理した場合に通知が漏れていました。手動で「手札に加える」した時と同じ通知を出します）。",
      "【不具合#32】ゲート侵攻で相手の手札を全部奪ってしまう（本来は半分）不具合を修正しました。攻撃側が人間で「奪う札を選ぶ」のに時間がかかると、内部の多重実行防止ガードの安全タイマー（60秒）が切れてしまい、その隙に自動ターン終了が再発火してゲート侵攻が二重に走り、手札を全部奪う・エターナルも複数回獲得していたのが原因です。侵攻処理中は自動ターン終了を止め、二重起動もしないようにしました。",
      "ミニロックエリアの位置調整で、相手（上部）の横方向のずれを自分（下部）とは別に調整できるようにしました（管理者モード →「ミニロックエリアの位置」→「相手：横方向のずれ」）。",
      "行動ログ（📜）に、移動して到達した効果が記録されないことがある不具合を修正しました（内部の処理深度の都合で、移動由来の到達がほとんど記録から漏れていました）。連鎖した到達効果も記録されるようになります。",
      "スリカエで、カードの「受け取った／渡した」モーダルのタイトルが逆になることがある不具合を修正しました（CPUがあなたにスリカエした時など。今は常に“あなた（この画面）視点”で、受け取ったカードは「受け取った」、渡した（奪われた）カードは「渡した／奪われた」と表示します）。",
      "【CPU戦】CPUが選ぶ番の選択モーダルを総点検し、色宣言（ザ・ギャンブル/試練の儀式）・選択肢（パーティ等）・奪う札の選択・「どこから置きますか？」・接触の承認・任意のはい/いいえなど、CPUの選択モーダルを人間の画面に出さないようにしました（自動で選ばれます）。「何を選んだか」の結果表示は従来通り出ます。",
      "ミニロックエリア（拡大時の下部表示）に、相手プレイヤーのロック状況も表示するようにしました（相手→自分の順で、自分が一番下。相手がどの色をあと何色でロックし切るか一目で分かります）。",
      "【CPU戦】CPUがパーティ・合同建設などの「マスを選ぶ」効果の途中で止まってしまう不具合を修正しました（選んだ結果の通知を出している一瞬に、CPUの優先権が誤って自分へ戻り、続くCPUの選択が誰にも自動処理されず固まっていたのが原因。#31）。",
      "【CPU戦】CPUが選ぶ番の「○○を選択してください」等の案内・候補ハイライトを、人間の画面に出さないようにしました（自分が選ぶのかと紛らわしいため）。CPUの選択は自動で行われ、「何を選んだか」の結果モーダルは従来通り表示します。",
      "「自分の手札を画面下に固定する」ON時の手札トレイについて、スマホ専用の位置・全体サイズ・回転を管理者モードで調整できるようにしました。",
      "ミニロックエリア（拡大時の下部表示）に並ぶファーストカード・エターナルカードを、クリックでそのまま使えるようにしました（実ロックエリアと同じ使用フロー。使えるカードは光ります）。",
      "試練の儀式で「何を踏んだか（置いて移動したカード）」を、その都度画面中央に大きく表示するようにしました。",
      "ゲート侵攻で相手から複数枚奪う時、1枚選ぶごとに実際に自分の手札へ加える（手札が1枚ずつ増える）ようにしました（以前はまとめて最後に加わっていました）。",
      "「自分の手札を画面下に固定する」ON時の手札トレイ（手札＋公開エリア）の位置・全体サイズを、管理者モードの「表示位置」で調整できるようにしました。",
      "アバターの初期設定（デフォルト）を「記憶を失った青年」にしました（ゲーム開始前は灰色、開始後は自分のファーストカードの色になります）。",
      "盤面を拡大して自分のロックエリアが画面外に出た時、画面下中央に「ミニロックエリア」（7色スロットのロック状況＝勝利まであと何色か）を自動表示するようにしました。ロックエリアが半分以上見えていれば出ません。",
      "スリカエ・ゲート侵攻・接触などで相手の手札からカードを奪った（受け取った）時、何のカードを取ったのかを画面中央に大きく表示するようにしました（奪う側は裏向きしか見ていないため。ゲート侵攻で複数枚奪う時は1枚ずつ順番に表示）。",
      "プレゼントの到達効果（1番少なくロックしている人がドロー）で、誰がドロー対象なのかを画面中央にアバターで並べて周知するようにしました。",
      "セレナーデの手札効果でロックする時、ロック先が1つに決まっているカード（通常の色カード）では「ロックする場所を選択してください」のモーダルを出さず、自動でそこへロックするようにしました（七色の欠片のように複数の色スロットに置ける場合だけ選択モーダルを出します）。",
      "スリカエ（手品師の技）で相手にカードを渡した時、渡した側の画面に「受け取った」と出て『渡したのに自分が受け取った？』と誤解する問題を修正しました。渡した側には「渡した」と、相手に渡したカードを表示するようにしました。",
      "【CPU戦】画面右上の「🎲 セットアップ」ウィザードのボタン／パネルを、CPU戦の間は表示しないようにしました（1人用では使わないため）。",
      "【CPU戦】「CPUの結果通知を自動で進める」（旧・CPUのモーダルを自動で進める）をOFFにした時の挙動を変えました。CPUが“選ぶ”モーダル（パーティの選択肢・色宣言など）は自動で進め、その“結果”を知らせる通知モーダルだけをクリックするまで表示するようにしました（自分が選ぶのかと錯覚してしまう問題の解消。じっくり結果を読めます）。",
      "【CPU戦】自分のターンなのに「画面をクリックしてCPUの手を進める」の案内が出たままになる不具合を修正しました（CPUが選択待ちの間だけ出るようにしました）。パーティ等の『全員が選ぶ』効果で、あなた自身の選択中にこの案内が残って紛らわしかったのも解消しています（#29 / #30）。",
      "【CPU戦】CPUの選択モーダル（パーティの選択肢など）のボタンを、あなたが代わりに押せてしまう不具合を修正しました。CPUの選択はCPU自身が行い、あなたはCPUのモーダルを操作できません（自動スキップONなら自動で、OFFならクリックで1手ずつ進みます）。",
      "【CPU戦】CPUがロックした後、ハンドフェイズへ食い気味に進んでしまう問題を調整しました。CPUの速さ設定（特に「ゆっくり」）に合わせて、フェイズの切り替えにも間を取るようにしました。",
      "プレゼントの手札効果（相手を選んでその隣に自分を置く）で、選べる相手が1人しかいない場合は自動でその相手を選び、その旨をモーダルで知らせるようにしました（スリカエ・マスチェンジ等と同じ挙動に統一。相手の駒を動かす同種の効果もあわせて対応）。",
    ],
  },
  {
    date: "2026-08-06",
    items: [
      "【CPU戦】CPUに勝利すると、勝利モーダルに続いてコイン獲得の演出が出て、毎回20コインもらえるようにしました（ログイン時のみ。コインはアカウントに紐づくため、未ログインだと獲得できません）。",
      "【CPU戦】オプションの「CPU戦（1人用）」に『CPUのモーダルを自動で進める』のON/OFFを追加しました。OFFにすると、CPUの効果モーダル（ザ・ギャンブル等）は自動で進まず、画面をどこでもクリックするたびに1手ずつ進みます（じっくり読みたい方向け。待機中は画面下に案内が出ます）。移動やロックはこれまで通り自動です。",
      "【CPU戦】オプションの「基本設定」に🤖CPU戦（1人用）の項目を追加し、CPUの速さを「ゆっくり／普通／早い」から選べるようにしました（CPUの行動が速すぎてザ・ギャンブル等のモーダルが読み取れない、という声への対応です。選ぶと次のCPUの手から効きます）。",
      "🤖 CPU戦（1人用・ベータ）を追加しました。タイトル画面の「CPU戦」ボタンから、ログイン不要であなた対CPUの対戦をこの端末だけで遊べます。CPUの手はまだランダムです（今後かしこくしていきます）。",
      "【CPU戦】ゲート侵攻時に「OK」を何度も押させられる・背景がだんだん真っ暗になる・エターナル演出が何度も起きる不具合を修正しました（ローカルのゲート侵攻処理中に自動ターン終了が多重に走っていたのが原因。#20のオンライン版と同種の問題）。",
      "初回起動時の設定モーダルに「効果音の音量」と「カード拡大表示のサイズ」の調整を追加しました（試聴・プレビュー付き。文字が読みやすいサイズにご調整ください）。いずれもあとからオプションの「基本設定」で再調整でき、カード拡大サイズは次回以降も保持されます。",
      "ゲート侵攻の表示順を整えました（「ゲート侵攻成功！」の告知を、奪う札を選ぶ画面や手札を奪う演出より先に表示するようにしました）。",
      "ゲート侵攻のエターナル獲得演出で、獲得エターナルが演出前からロックエリアに見えて直前に急に消える／フリップしたエターナルが画面左上へ飛んでいってしまう、不具合を修正しました。",
      "新しいペット「キィ」を追加しました（画像アニメ・4方向×モーション。ショップで購入でき、タイトル画面のお散歩にも登場します）。",
      "スマホ／タブレットで、アプリを開いている間は画面が自動で暗くならない・ロックされないようにしました（対応ブラウザのみ）。",
      "ゲート侵攻で手札を奪う演出を改善しました（クリックした裏向きカードと別のカードがめくれて見える誤解を解消。奪う札は左から順にめくる表示にしました）。",
      "ゲート侵攻のエターナル獲得などの演出が終わり切る前に次のプレイヤーのターンへ移ってしまう不具合を修正しました（演出を最後まで見てから移行します）。",
    ],
    devItems: [
      "「新しいバージョンがあります」の更新通知バナーを、CPU戦の最中でも出すようにしました（以前は「対局中は出さない」対象にCPU戦も含まれており、CPU戦を続けていると新版に気づけず古い版のまま遊び続けてしまう状態でした）。",
      "オンライン対戦のゲート侵攻（手札を奪う時）で、「奪う札を選ぶ」モーダルが何重にも開いて閉じない・背景がだんだん暗くなる・「手札をシャッフル」が点滅する・ターンが勝手に何度も進む、という不具合を修正しました（ターン終了処理が奪う札の選択中に多重に走っていたのが原因）。「ゲート侵攻成功！」の告知が奪うモーダルより先に出るのもあわせて安定します。",
      "【CPU戦】ゲーム開始後にターンチェンジが延々と繰り返され、プレイできなくなる不具合を修正しました（ターンの区切りでフェイズがリセットされず、毎ターン即終了していたのが原因）。CPUの番が止まる・自分の番が始まらない症状もあわせて解消しています。",
      "【CPU戦】CPUがカードに到達しても到達効果が発動しない不具合を修正しました（到達効果の自動処理が自分の席の到達にしか働いておらず、CPU側の到達で素通りしていたのが原因）。",
      "【CPU戦】パーティ・合同建設・スラム上がりの役人など「全員がそれぞれ選ぶ」効果で、CPUの選択まであなたが代行させられていた不具合を修正しました（CPUの選択はCPUが自動で行います）。",
      "【CPU戦】逆に、CPUの番にパーティ・スラム上がりの役人などであなたの選択（残す札・捨てる札）まで勝手に自動で選ばれてしまう不具合を修正しました（あなたの選択はあなたが選べます）。",
      "【CPU戦】開始時に一瞬4人が座った盤面が見える問題を直しました（2人対戦のセットアップが終わってから盤面を表示します）。また、CPU戦では基本時間・タイマーの表示を出さないようにしました（CPUを自動で動かすため内部的には使いますが、画面には出しません）。",
      "捨て札の山をダブルタップ（ダブルクリック）すると、捨て札の一覧を確認できるようにしました（右クリックの無いタブレット/スマホでも見られます）。",
      "ヴァーディアンなどの「公開ドロー」で加えたカードが、ステータスエリアの手札枚数に反映されない不具合を修正しました。",
      "BGMの既定音量を調整しました（オープニング／ゲーム時／待機中を40%に）。ゲーム中のBGMがスマホで鳴りにくかったのも、操作をきっかけに鳴らし直すよう改善しました。",
      "スマホでオプションを開くと画面全体が左にずれて左半分が見切れる不具合を修正しました。",
      "不具合報告で、ページ読み込み直後のログや対戦相手のコンソールログも取りこぼさず取得するようにしました（調査の精度向上）。管理者用の不具合一覧で、コメントが長いと「詳細」ボタンが押せない不具合も修正しました。",
    ],
  },
  {
    date: "2026-08-05",
    items: [
      "カードのドロー演出を改善しました（プレゼント等で演出の前に手札へ加わってしまう／手札に着地する瞬間に一瞬カードが消える、を修正）。",
    ],
    devItems: [
      "ステータスエリアの自分のアバターに丸い枠が残る／背景が透明にならない不具合を修正しました（ランクリングの影が原因でした）。",
      "パーティの効果が2回処理される・自分のターン（ムーブフェイズ）が終わらなくなる不具合を修正しました。パーティを相手に取られた後にターンが相手へ移らない不具合もあわせて修正しました。",
      "ザ・ギャンブルなどの到達効果を処理している最中に、相手のターンへ移ってしまう不具合を修正しました。",
      "「記憶を失った青年」アバターを、ゲーム開始前は灰色、ゲームが始まって自分のファーストカードの色が決まったら、その色の青年に変わるようにしました。",
      "不具合報告に、対戦相手全員のアクションログも自動で添付するようにしました。",
      "ライトモードで「接触の結果」モーダルがダークのままだったのを修正しました。",
      "ランクリングの太さを調整しました（管理者モードでさらに微調整できます）。",
    ],
  },
  {
    date: "2026-08-02",
    items: [
      "ライトモード（白系テーマ）を追加しました。管理者モードの「カラーテーマ」で切り替えられ、マイページ・ランキング・オプション・ショップ・ルールブック・図鑑・部屋一覧に対応。「対戦画面もライトにする」は別トグルで、対戦中もその場で切り替えて見比べられます。",
      "新しいペット「キュビット」（画像アニメ・4方向×モーション）を追加しました。歩く向きに合わせて向きが変わり、待機と行動（ジャンプ／あくび／耳ピク／歩く／一周）を交互に行います。駒の裏に回ると駒に隠れます。大きさ・一周の軌跡は管理者モードで調整できます。",
      "ゲート侵攻のエターナル獲得演出で、フリップ直後に一瞬裏向きになる（2回フリップに見える）不具合を修正しました。",
    ],
    devItems: [
      "ロックしたファーストカード／エターナルカードをクリックしても効果を使えない不具合を修正しました（自動処理＋ドラッグ制限中に発火していなかった全種が対象）。",
      "自動処理モードで移動先も接触相手も無いとき、山札から隣に置くカードを「自分でマスを選び、裏向きで（中身は誰にも分からないように）」置くよう修正しました。",
      "ザ・ギャンブルのカード公開を1枚ずつにしました（「1枚公開する／全部公開する」「最後の1枚を公開する」モーダルでもったいぶれます）。",
      "合同建設で、各プレイヤーが山札から置いたのか手札から置いたのかを全員にお知らせするようにしました。",
      "対戦記録の画像にラウンド数・通算ターン数を記載するようにしました。",
      "対戦後のコメントがエンターで送信されず反映されない不具合を修正しました（Enterで送信、改行はShift+Enter）。",
      "ステータスエリアのオンライン状態アイコンを画面右上（残金の左）へ移し、部屋名を隣に表示するようにしました。プレイヤーB・C・Dのエモート表示位置も、名前と被らないよう調整しました。",
    ],
  },
  {
    date: "2026-08-01",
    items: [

    ],
    devItems: [
      "国王アバターが激昂状態のときに別の国王の絵になってしまう不具合を修正しました（全7種を点検・修正）。",
      "対戦終了後のモーダルは、✕や外側クリックでは閉じないようにしました（「この部屋を出る」か「もう一度遊ぶ」でのみ閉じます。「盤面を確認する」は最小化です）。",
      "ステータスエリアのアバターを枠線の無い丸に戻し、背面に半透明のアバターを少しずらして重ねられるようにしました（サイズ・位置・透明度は管理者モードで調整可能）。半透明側をクリックしてもエモートは出ません。",
      "対戦後の戦績登録が反映されなかった件の調査・改善、および管理者ダッシュボードのログイン履歴に名前が出るよう記録タイミングを修正しました。",
    ],
  },
  {
    date: "2026-07-31",
    items: [
      "対戦終了後のモーダルに「盤面を確認する」を追加しました。押すと案内のあとモーダルが画面左上の🏆アイコンに最小化され、盤面を確認できます（アイコンを押すといつでも戻せます）。また「この部屋を出る」を押すとホーム画面に戻るようにしました。",
      "対戦終了後の順位表示を、実際のランキングのようにアバターと名前が並んだ一覧にし、ハイライトが最下位から自分の順位まで登っていく演出にしました（自分の行に到達すると強調表示）。",
      "選べるアバターに「各国の国王」7種（赤の王・橙のキツネ王・黄の光の王・緑の森の王・青の氷海王・桃の女王・紫の長老女王）を追加しました。ロック数に応じた覚醒版・激昂版もあります。",
      "ホーム画面のメニューアイコンを大きくし、文字・間隔を調整。マイページの配置を更新し、巨大な半透明アバター（最背面の飾り）を追加しました。",
      "チュートリアルCPU戦のターン3まで完成：ジャンプ台で空いた相手ゲートへ侵攻→ゲート侵攻ボーナスでエターナル「緑」を獲得・ロック→7色そろえて勝利、まで遊べます。文言・演出も調整（CPU移動時のカードオープン、終了後はホームへ戻る 等）。",
      "観戦機能を追加：進行中の対局を後から観戦できます（「公開情報のみ」か「すべて見える」を選択可）。",
      "オンラインでゲート侵攻の演出（エターナル獲得・手札奪う）が出ない不具合を修正。",
      "アプリ更新時にお知らせバナーを表示（対局中は出さず、対局が終わってから出ます）。この更新情報ページも追加。",
      "チュートリアルCPU戦の左上に「チュートリアルを終了する」ボタンを追加（確認のうえホームへ戻ります）。",
      "駒に遅れて追従する飾りのペット（仮）を追加しました。ゲームには一切関係ない見た目だけの要素です。ペットは各プレイヤーの「自ゲート側」に立ち、うろうろ歩く・小さく跳ねる・たまに高く飛ぶ・駒の周りを一周する・止まるをランダムに行います（全員バラバラの動き）。ペットは仮の絵文字7種から選べます（左下ステータスエリアのアイコン／マイページから）。管理者モードで位置・大きさ・追従速度・うろつき範囲・跳ねる激しさを微調整できます。",
      "マイページに着せ替え一式（駒スキン・カード裏・プレイマット・背景・ペット）の変更ボタンを追加しました。",
      "ホーム画面のメニューアイコンを、新しく作成した専用アイコン画像に変更しました（アイコンごとの枠は撤去）。明るい背景でも見やすいよう文字・アイコンを調整し、4個ずつ2段に整列。ホバーするとアイコン背面に幻想的なオーラが浮かぶ演出を追加しました。ホーム画面に入る時に一瞬暗い画面が出る不具合も修正（背景の下地色＋画像の事前読み込み）。メニューアイコンのサイズを管理者モードで一括調整できるようにしました。",
    ],
    devItems: [
      "ランキングで自分の行をハイライト点滅で強調するようにしました（3ランキングそれぞれで見つけやすく）。",
      "マイページでアバターを変更したとき、巨大アバター（背面の飾り）も即座に見た目が変わるように修正しました（全画面版でも反映）。",
      "戦績システムとの同期を完全自動化しました：名前・アバターを変更した瞬間に（連携済みなら）自動で戦績システムへ反映されます。対局開始時・勝利時の自動同期はそのままで、手動の「戦績システムと同期する」ボタンは不要になったので撤去しました。",
      "ランキングを、勝率・勝利数・対戦数の3つを横に同時表示にしました（タブ切替を廃止、囲う枠も撤去）。",
      "対戦終了時のモーダル（勝利・獲得コイン・順位・個人成績）が自動で切り替わらないようにしました。✕か背景クリックで閉じるまで、次のモーダルへ進みません。",
      "マイページのプロフィール表示を刷新：囲う枠（見えない当たり判定・クリップ）を撤去し、装飾アバターや着せ替えが画面いっぱいまで切れずに表示されるようにしました。",
      "オンライン対戦の部屋パネルを整理：「🆕 部屋を作成」「🚪 参加できる部屋」「👀 観戦できる対局」を見出し＋区切り線ではっきり分け、常時フォーム表示にしました。リアルタイム更新になったため「更新」ボタン、重複していた「ログを表示」（オプションのアクションログに集約）、場違いだった「ログアウト」（タイトル画面から可能）をこのパネルから撤去しました。",
      "マイページのプレイヤー名を、名前を直接クリック（＋小さな鉛筆アイコン）で編集できるようにし、「変更」ボタンを撤去しました。",
      "マイページでアバターを変更しても表示が変わらない不具合を修正しました。",
      "マイページの拡大した装飾アバターが透明な当たり判定で他の項目のクリックを奪う「見えない枠」を修正しました。",
      "ペットの既定を「なし（非表示）」にしました。",
      "図鑑／ルールブックではカード画像を直接並べず、「山札一覧を開く」ボタンからカード一覧（全画面）を見る形にしました。",
      "マイページがマウスホイールで上下にスクロールしてしまう不具合を修正しました（焼き込みレイアウトは固定表示にしました）。マイページの配置も更新しました。",
      "マイページを開いた状態でオプションを出したとき、他の場所をクリックしてもオプションが閉じない不具合を修正しました（重なったモーダルに関係なく外側クリックで閉じるようにしました）。",
      "オンラインのゲート侵攻を修正・強化：エターナル獲得の3Dフリップ演出がオンラインでも出るようにし（演出前に既にロック済みに見えてしまう問題も修正）、手札を奪う飛翔演出も追加しました。あわせて、ゲート侵攻の状態同期が壊れる不具合（内部エラー）も修正しました。",
      "「山札一覧」を全画面表示にし、カードにホバー（PC）または長押し（スマホ）すると拡大表示できるようにしました（クリックで補足テキスト付きの詳細も従来通り開きます）。",
      "スマホで画像を長押しすると「写真に保存／共有」メニューが出てしまうのを防止しました（カードの長押し拡大はそのまま使えます）。",
      "スマホで手札を拡大している最中に「ロックしますか？」等の確認モーダルが拡大の手前に出て読めない不具合を修正（カード拡大を最前面に表示）。",
      "スマホ／タブレットで駒消し・カード消しアイコンを、これまでの限界よりさらに上へ動かせるよう調整範囲を広げました（管理者モード）。",
      "スマホでの左下の自分アバターのサイズを、管理者モードで調整できるようにしました（既定も少し小さくしました）。",
      "スマホでオプションのドロップダウンが小さかったのを、既定で少し大きくしました（管理者モードの「オプションのドロップダウン サイズ倍率（スマホ）」でさらに調整できます。部屋作成・各モーダルは「画面中央モーダルのサイズ倍率（スマホ）」で調整可能）。",
      "ゲート侵攻で手札を奪われたとき、奪われた本人のモーダルに「奪われた自分のカード」を一覧表示するようにしました（本人だけに見え、相手や観戦者には非公開のままです）。",
      "選べる罠で捨てたカード（手札から／ロックから）を、全員に見えるお知らせモーダルで一覧表示するようにしました。",
      "スマホで「自分のターンです／相手のターンです」表示が画面右端で見切れる不具合を修正しました（右端基準に配置し、長い場合は折り返すようにしました）。",
      "オンラインで自分のペットを変更すると相手のペットも変わってしまう不具合を修正しました（自分の座席の駒にだけ自分の選択を反映するようにしました）。",
      "カード効果の自動処理モードを「部屋（対局）ごとの共通設定」に変更し、常にON（既定）で開始するようにしました。以前は個人設定として保存され、一度OFFにすると毎回OFFで起動してしまう不具合がありました。対局中の変更は従来通り、部屋の全員が承認して切り替わります。",
      "ロビーで、後から入室した人が部屋主の画面に着席表示されない不具合を修正しました（再描画の重複排除が、対局開始前の着席プレビューの変化を取りこぼしていたのが原因。全席のロスターを見て判定するよう修正）。",
      "オンライン対戦のロビーを刷新：部屋を作る/入ると待機モーダルではなく盤面へ移り、入室順（C→B→D）に他プレイヤーが着席していきます。画面中央のロビーモーダルは部屋主だけに「ゲームを開始する」（オプション内蔵・2人以上で有効）が出て、他の人には「○○がゲーム開始するのを待っています」と表示。開始で自動的に席が確定します。",
      "ペットの選択肢に「なし（非表示）」を追加しました。",
      "ホーム画面の「お知らせ／更新情報」に、未読があると「NEW」バッジが付くようにしました。開くと消えます。",
      "「図鑑／ルールブック」を全画面表示にし、山札一覧とルール・ヘルプの内容を1画面にまとめて表示するようにしました。",
      "ペット変更ピッカーが背面に隠れて開かない不具合を修正（モーダルのz-index指定漏れ）。",
      "ホームのメニューアイコンを大きくしても頭打ちになる不具合を修正（グリッド幅をアイコンサイズに連動）。マイページのレイアウト編集で要素の枠が中身に合うよう調整し、プロフィールを囲う枠を撤去しました。",
      "ホーム画面から管理者モードを開いてもウィンドウが背面に隠れて見えない不具合を修正。",
      "戦績システムの試合コメントを「みんなのコメント」に刷新し、各コメントへ個別に返信できるようにしました。",
      "更新バナーが出ないまま勝手に更新されることがある不具合を修正（実行中コード自身のバージョンを基準に判定するように変更）。",
      "ホーム画面の背景画像を新しいタイトル画像に変更。ゲーム盤面の既定背景を「灰」に変更。",
      "右上オプションエリアに装飾帯を追加し（画面の左端から右端まで）、背景が白系でもアイコンが見やすくなるように改善。2D/3D切替アイコンは丸囲みと文字を外し、ホバーで説明が出る形にしました。",
      "更新バナーの「更新する」を押しても反映されず何度も出る不具合を修正（再読み込み前にキャッシュを取り直すように変更）。万一反映されない時はハードリフレッシュの案内も表示します。",
      "右上オプションエリアの各アイコン（Discord・ヘルプ・ランキング・マイページ・2D/3D）もホバーで簡易説明が出るように修正（画面上端で見切れないよう下側に表示）。アイコン下のテキストは背景が白系でも読めるよう暗いバッジ＋影を付けました。",
      "HUERISE画面の右下に、今動いているアプリのバージョン（デプロイ日時）を小さく表示するようにしました。",
      "自動処理モードで、ルールに反した自由なドラッグを制限しました：掴めるのは自分の手札カードだけになり、駒・盤面/ロックのカード・山札・捨て場・エターナル/ファースト束・相手の手札は掴めません。駒の移動は移動フェイズで光るマスをタップして行います。手札カードでも不正なドロップ（ロック不可タイミングでのロック、使えないタイミングでの効果発動、山などへの配置）は弾きます。管理者はオプションからこの制限を解除できます。",
      "（管理者用）マイページのレイアウト編集モードを追加。ONにするとマイページの各要素をドラッグ移動・端で拡大縮小でき、「テキスト出力」で配置を書き出せます（保存はせず、製作者がプログラムに焼き込む運用）。",
      "ステータスエリアの着せ替えアイコン群（駒スキン・カード裏・ペット・プレマ・背景・オンライン）が崩れる不具合を修正し、flexで自動整列するようにしました。ペット変更アイコンが反応しない不具合も修正（他アイコンと重なっていたのが原因）。ステータスエリアのレイアウト（アバター・情報位置等）を調整。",
      "マイページのレイアウト編集モードを改善：アバター変更ボタンを独立要素化、右へ動かすと要素が潰れる不具合（カード幅の見えない壁）を修正、要素の実寸を保持するように。",
      "Googleでログイン済みでも「戦績システム連携」がログイン未検出になることがある不具合を修正（Google連携の判定を厳格すぎる条件から総合判定に変更）。",
    ],
  },
  {
    date: "2026-07-30",
    items: [
      "ブーストモードを追加：開始時にファーストカードの両隣の色をロックした状態でスタート（時短ルール）。",
      "スリカエ・セレスティア等、対象や結果が分かるお知らせモーダルを追加。スリカエにシャッフル演出も追加。",
    ],
    devItems: [
      "捨て札の山を右クリックで捨て札一覧を表示できるようにしました。",
      "山札が切れたら自動でノーシャッフル補充（捨て場の一番上が山札の一番下）。",
      "駒にカーソルを合わせると全員のプレイヤー名を表示。盤外ではカーソル位置を相手に見せないように。",
    ],
  },
];

let modalEl = null;
let backdropEl = null;

// 未読お知らせの判定（ユーザー要望「未読があればメニューアイコンにNEW表示」）。
// 最新エントリの日付＋項目数＋エントリ総数を「署名」とし、開いた時にlocalStorageへ保存する。
// 署名が保存値と違えば未読（新しいお知らせがある）とみなす。
const CHANGELOG_READ_KEY = "so7-changelog-read";
// 続き484: 一般向けの項目（items）が1つでもある回だけを数える。
// **署名は管理者かどうかで変えない**——isAdminUser() はログインの読み込みが終わるまで false を
// 返すので、署名に混ぜると起動直後だけ NEW が付いたり消えたりする。管理者向けの項目のために
// NEW を出す必要も無い（開けば見える）。
// 【2026-09-28】fixes（不具合の直し）だけの回も一般の画面に出す。ここを items だけで判定したままだと、
// 今回のように「その回は全部が不具合の直し」だと**その日付ごと消えてしまう**。
function generalEntries() {
  return CHANGELOG.filter(
    (e) => (Array.isArray(e.items) && e.items.length > 0) || (Array.isArray(e.fixes) && e.fixes.length > 0)
  );
}
function currentSignature() {
  const list = generalEntries();
  const top = list[0];
  if (!top) return "";
  // 【2026-09-28】fixes も数に入れる（不具合の直しだけの回でも「NEW」が付くようにする）。
  return `${top.date}|${(top.items?.length ?? 0) + (top.fixes?.length ?? 0)}|${list.length}`;
}
export function hasUnreadChangelog() {
  try {
    return localStorage.getItem(CHANGELOG_READ_KEY) !== currentSignature();
  } catch (e) {
    return false;
  }
}
export function markChangelogRead() {
  try {
    localStorage.setItem(CHANGELOG_READ_KEY, currentSignature());
  } catch (e) {
    /* localStorage不可でも致命的ではない */
  }
}

function close() {
  backdropEl?.remove();
  modalEl?.remove();
  modalEl = null;
  backdropEl = null;
}

// 続き484: 管理者かどうかは呼び出し側（home-screen.js）から渡す。ここで online.js を
// import すると、表示だけのこの小さなモジュールがオンライン通信の塊に繋がってしまう
// （実際に Node からこのファイルを読むだけで location 未定義で落ちるようになった）。
// phase-automation / board-3d と同じく、必要なものは外から渡す形にしておく。
export function openChangelogModal({ admin = false } = {}) {
  if (modalEl) return;
  markChangelogRead(); // 開いた時点で既読に（メニューのNEW表示を消す）
  backdropEl = createBackdrop(close, { dim: true, blocksGame: false, zIndex: 2400 });
  modalEl = document.createElement("div");
  modalEl.id = "changelog-modal";

  // ユーザー要望「他の全画面ページ同様、左上に『← 戻る』ボタンを。右上✕は廃止」。
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.id = "changelog-back";
  backBtn.textContent = t("chg.back");
  backBtn.addEventListener("click", close);
  modalEl.appendChild(backBtn);

  const title = document.createElement("div");
  title.className = "changelog-modal-title";
  title.textContent = t("chg.title");
  modalEl.appendChild(title);

  const list = document.createElement("div");
  list.className = "changelog-list";
  if (CHANGELOG.length === 0) {
    const empty = document.createElement("div");
    empty.className = "changelog-empty";
    empty.textContent = t("chg.empty");
    list.appendChild(empty);
  } else {
    // 続き484: 管理者だけが開発者向けの詳細（devItems）も見る。一般の画面では、
    // 一般向けの項目が1つも無い回はその日付ごと出さない（空の日付が並ぶのを防ぐ）。
    const entries = admin ? CHANGELOG : generalEntries();
    for (const entry of entries) {
      const section = document.createElement("div");
      section.className = "changelog-entry";
      const date = document.createElement("div");
      date.className = "changelog-date";
      date.textContent = entry.date;
      section.appendChild(date);
      // 英語表示では itemsEn があればそちらを出す。無ければ日本語のまま出し、
      // 「この回は日本語のみ」と一言添える（過去分は英訳しない方針＝ユーザー判断）。
      const useEn = getLang() !== "ja" && Array.isArray(entry.itemsEn) && entry.itemsEn.length > 0;
      // 【2026-10-16】「この回は日本語のみ」は、**実際に日本語のまま出すものがある時だけ**添える。
      // 以前は `itemsEn` が無いだけで出していたので、**不具合の直しだけの回（fixes/fixesEn はある）**
      // に「日本語のみ」と出てしまっていた（英文はちゃんと出ているのに）。
      const jaOnlyItems =
        Array.isArray(entry.items) && entry.items.length > 0 && !(Array.isArray(entry.itemsEn) && entry.itemsEn.length > 0);
      const jaOnlyFixes =
        Array.isArray(entry.fixes) && entry.fixes.length > 0 && !(Array.isArray(entry.fixesEn) && entry.fixesEn.length > 0);
      if (getLang() !== "ja" && (jaOnlyItems || jaOnlyFixes)) {
        const note = document.createElement("div");
        note.className = "changelog-ja-only";
        note.textContent = t("chg.jaOnly");
        section.appendChild(note);
      }
      const appendList = (texts, className) => {
        if (!Array.isArray(texts) || texts.length === 0) return;
        const ul = document.createElement("ul");
        ul.className = className;
        for (const item of texts) {
          const li = document.createElement("li");
          li.textContent = item; // textContentで安全に表示
          ul.appendChild(li);
        }
        section.appendChild(ul);
      };
      // 【2026-09-29・ユーザー要望】良いニュース（items）も、長い本文が何行も並ぶと読む気が失せる
      // （「もっと要約して『詳細はこちら』スタイルにしませんか？」）。そこで summary / summaryEn
      // （短い1行の見出し）を足し、**今までの長い文はそのまま「詳細」の中身にした**。要約で本文を
      // 書き直すのではなく上に見出しを足す形なので、過去の回に後から付けても本文の意味がズレない。
      // summary は items と **同じ順番・同じ件数**で書く（1行が1項目の見出しになる）。件数が
      // 合っていない回は、対応を取り違えるより安全なので従来どおり本文をそのまま並べる。
      const itemTexts = useEn ? entry.itemsEn : entry.items;
      const sumTexts = useEn ? entry.summaryEn : entry.summary;
      const useSummary =
        Array.isArray(itemTexts) &&
        itemTexts.length > 0 &&
        Array.isArray(sumTexts) &&
        sumTexts.length === itemTexts.length;
      if (useSummary) {
        const ul = document.createElement("ul");
        ul.className = "changelog-items changelog-summary-items";
        const details = [];
        for (let i = 0; i < sumTexts.length; i += 1) {
          const li = document.createElement("li");
          const head = document.createElement("div");
          head.className = "changelog-summary-head";
          head.textContent = sumTexts[i]; // textContentで安全に表示
          li.appendChild(head);
          const detail = document.createElement("div");
          detail.className = "changelog-summary-detail";
          detail.textContent = itemTexts[i];
          detail.hidden = true;
          li.appendChild(detail);
          details.push(detail);
          ul.appendChild(li);
        }
        section.appendChild(ul);
        const row = document.createElement("div");
        row.className = "changelog-more-row";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "changelog-fixes-toggle"; // 不具合側の「詳細」と同じ見た目に揃える
        btn.textContent = t("chg.moreOpen");
        btn.addEventListener("click", () => {
          const open = details[0].hidden; // 1つのボタンでその回の全項目をまとめて開閉する
          for (const d of details) d.hidden = !open;
          btn.textContent = open ? t("chg.moreClose") : t("chg.moreOpen");
        });
        row.appendChild(btn);
        section.appendChild(row);
      } else {
        appendList(itemTexts, "changelog-items");
      }
      // 【2026-09-28・ユーザー要望】不具合の直し（fixes）は一覧で並べず、「不具合を修正しました」の
      // 1行に畳んで「詳細」で開く。理由は続き484 で devItems を分けたのと同じ——直した項目が列で
      // 並ぶと「問題だらけのアプリ」に見えてしまう。ただし**深さではなく種類で分ける**のが肝で、
      // 良いニュース（items＝新しくできること・見え方の変化）は畳まずそのまま見せる。畳んでしまうと
      // 見てほしいものまで隠れるため。**件数は出さない**（数が見えると結局「たくさんある」印象に
      // なる＝ユーザー判断 2026-09-28）。
      // 管理者の「めちゃ詳細」（devItems）は、この詳細の中に続けて入れる（開く場所を1つにまとめる）。
      const useFixEn = getLang() !== "ja" && Array.isArray(entry.fixesEn) && entry.fixesEn.length > 0;
      const fixTexts = useFixEn ? entry.fixesEn : entry.fixes;
      const useDevEn = getLang() !== "ja" && Array.isArray(entry.devItemsEn) && entry.devItemsEn.length > 0;
      const devTexts = useDevEn ? entry.devItemsEn : entry.devItems;
      const hasFixes = Array.isArray(fixTexts) && fixTexts.length > 0;
      const hasDev = admin && Array.isArray(devTexts) && devTexts.length > 0;
      const appendDev = () => {
        const head = document.createElement("div");
        head.className = "changelog-dev-head";
        head.textContent = t("chg.devHead");
        section.appendChild(head);
        appendList(devTexts, "changelog-items changelog-dev-items");
      };
      if (hasFixes) {
        const row = document.createElement("div");
        row.className = "changelog-fixes-row";
        const label = document.createElement("span");
        label.className = "changelog-fixes-label";
        label.textContent = t("chg.fixesLine");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "changelog-fixes-toggle";
        btn.textContent = t("chg.fixesOpen");
        row.appendChild(label);
        row.appendChild(btn);
        section.appendChild(row);
        const box = document.createElement("div");
        box.className = "changelog-fixes-detail";
        box.hidden = true;
        section.appendChild(box);
        // appendList は section へ足す作りなので、box の中に入れ替えるために一旦作ってから移す。
        const moveInto = (texts, className) => {
          const before = section.childNodes.length;
          appendList(texts, className);
          while (section.childNodes.length > before) box.appendChild(section.childNodes[before]);
        };
        moveInto(fixTexts, "changelog-items changelog-fix-items");
        if (hasDev) {
          const before = section.childNodes.length;
          appendDev();
          while (section.childNodes.length > before) box.appendChild(section.childNodes[before]);
        }
        btn.addEventListener("click", () => {
          box.hidden = !box.hidden;
          btn.textContent = box.hidden ? t("chg.fixesOpen") : t("chg.fixesClose");
        });
      } else if (hasDev) {
        // 不具合の直しが無い回（過去の分など）は従来どおり、管理者向けの詳細をそのまま出す。
        appendDev();
      }
      list.appendChild(section);
    }
  }
  modalEl.appendChild(list);

  document.body.appendChild(backdropEl);
  document.body.appendChild(modalEl);
}
