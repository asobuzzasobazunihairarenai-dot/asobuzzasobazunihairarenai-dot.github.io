// 「Claude（開発側）が対処した不具合報告」の番号一覧。管理者ダッシュボードの不具合一覧で
// 「対処済み（コード）」として表示され、既定のフィルターで隠れる。
//
// なぜファイルで持つのか: 対処済みフラグの本体は DB（so7_bug_reports.resolved）だが、
// そちらは**管理者のアカウントでログインした人だけ**が書き換えられる（so7_set_bug_report_resolved）。
// 開発作業をしている側（Claude）は管理者としてログインできないため DB に書けない。そこで
// 「直したらこのファイルに番号を足してコミットする」という形にした＝コードと一緒に履歴が残る
// ので、いつ・どの変更で対処したかは git log から追える。
//
// 運用: 不具合を直したら、その番号をここへ追加する（対処＝修正した／仕様として説明した／
// 再現せず対策だけ入れた、のいずれでも「こちらの作業は終わった」ものを入れる）。
// 直っていない・調査中のものは入れない。ユーザーが手で付ける DB のフラグとは独立で、
// どちらか一方でも立っていれば「対処済み」として扱われる（union）。
//
// 番号は不具合報告の #NN（so7_bug_reports.id）。
export const HANDLED_BUG_REPORT_IDS = new Set([
  // 2026-09-03 のセッション（続き377〜390）で対処したもの。
  // これより前の報告は、当時この仕組みが無かったため未記載（DB側の手動フラグで管理）。
  214, // 効果の途中で「処理中」が早く切れて駒が動いてしまう
  215, // 接触で2枚奪ってしまう／スマホで案内が小さすぎる／CPUがカウンターロックを使わない
  216, // 対戦後ホームに戻ると無音
  217, // CPU同士のスリカエで中身が見えてしまう
  218, // CPUが盤面の端ばかり通る
  219, // ゲート侵攻の回収カードを1つのモーダルにまとめる
  220, // 相手の効果で自分が置いた時、盤面のマークが相手のアバターになる
  221, // スマホでアプリを閉じると「プッ」と鳴る
  222, // 最後のロックの承認が2人目で止まる／飛ばされると持っていないことがバレる
  223, // iPhoneで対戦中にアプリが落ちてタイトルへ戻る（画像のメモリ過多）
  224, // コノハナサクヤの「周囲」が4マスしかハイライトされない
  225, // 「それぞれ別のマス」の文言／スリカエで返すはずのカードを使ってしまう
  226, // CPUが場のパーティを回収しない（4回のゲート侵攻自体はルール通り）
  227, // 効果の処理中に自分の側にスキップが表示される
  228, // コノハナサクヤの「このターン接触できない」が守られていない
  229, // 接触の承認ボタンが相手に出ない（カウンターロックを持っていないと自動承認だった）
  // 2026-09-04（続き391）
  230, // なないろの欠片の選択モーダルが出ずに1枚ドローに確定する（開いた瞬間の合成クリック）
  231, // エターナルで勝った時、ゲート侵攻の演出を飛ばして勝利演出になる
  232, // 「もう一度遊ぶ」でブースト・白黒・マイデッキの設定が引き継がれない
  233, // 「タイマーをONにする」ボタンが出たままになる
  234, // スキップ/マイデッキのボタンが出なくなる（#227の対応で入れた回帰）
  // 2026-09-04（続き400）
  235, // ライトモードなのに対戦中のモーダルがダークのまま
  236, // 「このマスでいいですか？」が出なくなる（開いた瞬間の合成クリックで「今後表示しない」が押されていた）
  237, // iPhoneで心臓の鼓動が聞こえない（スマホのスピーカーで鳴る帯域が足りなかった）
  238, // WebGL: ムーブフェイズで影が濃く見える／ロックしたカードが上下逆さま
  239, // 到達モーダルの背面がライトモードでもダーク（#235と同じ原因）
  240, // WebGL: CPU戦開始時に駒が変な形で見える（隠れているはずの駒を描いていた）
  241, // WebGL: 駒がカードに隠れる（重なり順をDOM順で決めていた）
  // 2026-09-05（続き411〜423）
  242, // 参加できる部屋が空／ロビーが白紙（英語化の一括置換が壊した17箇所）
  243, // 同上（もう一方のアカウント側の報告）
  244, // 盤面カードの色味が端末で違う（キャンバスがステージ倍率ぶん引き伸ばされていた）
  245, // 山の側面が消える（DOMの塗りを剥がす対象に入れてしまっていた）
  247, // 管理者モードのWebGLチェックが既定ONなのにOFFに見える（映すものを間違えていた）
  250, // 返事待ちモーダルの背後を盤面がタップしてしまう
  251, // ゲートのカードが黄色く透ける（描画順が浮動小数の厳密比較だった）
  253, // ロックエリアの色枠が点滅する（DOMを作り直すと形のキャッシュが空になっていた）
  257, // WebGLが落ちてCSS描画へ戻りチカチカ再発（第3段を取り消し）
  258, // PCで盤面が見えなくなる（並べ替えの鍵が「板の中心の奥行き」だった）
  259, // ロックエリアバーだけチカチカ（バーの画像がDOM描画のまま残っていた）
  260, // カードのドロップシャドウ（暗転を色空間を間違えて適用していた）
  261, // 演出の最中に情報モーダルが出る（演出ゲートを新設）
  263, // 暗転がPCだけ濃すぎる（二重）／ロック演出中にモーダルが出る
  264, // iPhoneでWebGL描画が起動しない（削除したモジュールが404）
  265, // 駒が透けて見える（面ごとの陰影が失われていた）／演出中の中央お知らせ／お知らせが一斉に出る
  266, // 演出中にフェイズが切り替わる／モーダルが前の表示に重なって出る
  267, // ロック中にハンドフェイズの告知が出る／プレゼント後にターンが猛スピードで飛ぶ
  268, // フェニックスで追色コストのカードが2回捨てたことになる
  269, // 手札をタップしたのに背面のロック中カードが使われる
  270, // フェイズ告知が前の告知に重なって出る
  271, // 対戦結果の最小化案内モーダルがライトモードでもダークのまま
  272, // CPUが1ターンに2回ロックする（T3）
  273, // CPUが1ターンに2回ロックする（T5・同じ原因）
  274, // 手札効果の使用演出の最中に色選択モーダルが出る（追色なしの演出を待っていなかった）
  275, // 3D描画で盤面のカード・ロックエリアバーがチカチカする（使用中のテクスチャを捨てていた）
  276, // CPUがドムス・ネロを使った後、移動せずにターンが終わる
  277, // 最初の画面のHUERISEボタンが何度も押さないと進まない
  278, // 3D描画でロックエリアバー・盤面カードのチカチカが残る（WebGLの文脈が失われたまま戻らなかった）
  279, // CPUが到達したカードを手に入れても「このターンの出来事」に並ばない
  280, // ゲート侵攻で奪う札を、奪われた本人が選ばされる（選ぶのは奪う側）
  281, // 対戦が終わってホームに戻ってもターン数・ラウンド数が右上に残る
  282, // 中央のお知らせで、カードだけが左に寄って右側に大きな空白ができる
  283, // CPUが前の手札効果の処理中に次の手札効果を使い始める
  284, // 「このフェイズを終了する」効果の後にCPUがもう1枚手札効果を使う
  285, // オンラインで、古い平たい移動演出のあとに跳ねる移動演出が二重に出る
  286, // ロック演出中にマイデッキボタンを押すとドローできてしまう
  287, // めくれ演出より先に中央のお知らせでカードが分かってしまう
  288, // 1回のロックフェイズでマイデッキボタン連打でデッキが尽きるまで引ける
  289, // 山の側面の縞が太い縞（モアレ）になる
  290, // 物語チュートリアルの説明モーダルが出ず、左上のボタンも効かない（showBack が引数から落ちていた）
  293, // 到達の「N 連鎖」が1つずれる（移動〜到達のガードを連鎖の回数に数えていた）
  // 2026-09-14（続き515）
  346, // マルメゴの公開で、めくる前にカードが手札に見える（引いてから中央でめくっていた）
  347, // マルメゴで橙が出て手札を全部捨てた後、ハンドフェイズが自動で進まない（公開ドローの抑止が残った）
  348, // iPhoneの画面が熱い（3D盤面が変化の無い間も毎フレーム描き直していた）
  // #349（CPUの勝利演出が短く見える）は手元で再現せず、切り分け用の記録だけ入れた＝ここには入れない。
  // 【2026-09-30・ユーザー判断で一旦終了】報告の中身は残す——「CPU戦で勝った時、勝利の演出が
  // だいぶはしょられて見えた」。続き515 で計測した結果は**演出は全段そろって出ていた**
  // （スマホ相当 C 22.3秒 / A 22.9秒、PC C 15.1秒 / A 17.3秒。7色の光も全部画面内。
  // 飛行演出オフ・視差効果を減らす はどちらも false）。短く見える候補は ①演出中に画面を触って
  // 早送り（skipRequested）②端末の「視差効果を減らす」③端末が重くて動きが飛ぶ の3つで、
  // diag-victory-celebration（段ごとの時刻・触って早送りした時刻・light/flightDisabled/reducedMotion）を
  // 記録するようにしてある。**再発したらこのログを見れば1回で切り分けられる。**
  // 2026-09-16（続き516）
  350, // iPhoneで長押しすると文字選択（青い帯）や端末のメニューが出る（ページ全体で抑止していなかった）
  351, // 「このマスでいいですか？」が出ない（押したまま離した指で「今後表示しない」が押され得た）
  // 2026-09-18（続き518）
  352, // 相手が離席した合同建設の選択が相手の画面に残り、後で遅れて置かれた／移動先が選べなかった
  353, // 色落ちキャットの下のジャンプ台が発動しない（自分を捨てた後の露出到達を起こしていなかった）
  // 2026-09-21（続き520）
  354, // チュートリアル中、紫をタップではなくドラッグでロックすると案内が進まなくなる
  355, // 対局が始まった後もロビー（開始待ち）が出っ放し（座席をもらえなかった人・観戦者）
  // 2026-09-21（続き521）
  356, // セレナーデの追色コストを選んでいる最中に、別の手札カードの効果が始まってしまう
  // 2026-09-23（続き523・524）
  362, // 複数枚捨てる時の順番の番号が重なりで読めない
  364, // 「このマスでいいですか？」が出っ放しでゲームが進む（返事待ちを処理中に数えていなかった）
  // 2026-09-26（続き530）
  361, // 何かが起こるたびに画角が少しズームしたり引いたりする（手札の枚数で倍率が動いていた）
  363, // スリカエでCPUが相手のまだロックしていない色のカードを渡してくる
  365, // 烙印ドローの「ドローします」のお知らせが二重に出る
  // 2026-09-27（続き531〜534）
  366, // タイマーを切っていても合同建設の相手の選択が85秒で飛ばされる
  360, // 接触のタックルで駒の絵が動かない（WebGL描画が作り直されていなかった）
  367, // エイドスがギャンブルの色宣言を外す → 仕様（のぞき見は「最強」だけ。エイドスは上級/中級）
]);

// ── 【続き603・2026-10-20】報告してくれた人へ伝える「直した内容」 ───────────────────
// ユーザー提案「ここであなたが直してコミットした時にあなたが入力して送るようにしたら？
// その文面はコミット前に私が確認する」。
//
// **文面をここに書くと、その人が次にホーム画面を開いた時にお礼と一緒に出る**
// （bug-report-thanks.js）。この形にした理由:
//  ・**文面がコミットに入るので、公開前に必ずユーザーの目を通る**（聞き忘れが起きない）
//  ・Claude は管理者としてログインできない＝**DBには書けない**（このファイルの冒頭の理由と同じ）
//  ・**日本語と英語の両方**を書ける（DBの列は1つしかないので1言語だけになる）
//  ・どの修正でどう伝えたかが **git の履歴に残る**
//
// 書き方: 報告者本人が読む文なので、**内部用語を使わず・1〜2文で・何が直ったか**だけ書く
// （お知らせ/changelog の fixes と同じ調子。番号や関数名は書かない）。
// ユーザーが管理画面の「📨 お礼を書く」で DB に書いた文がある場合は、**そちらが優先**される
// （言い回しを変えたくなった時に、コードを触らずに上書きできるように）。
export const BUG_REPORT_FIX_NOTES = {
  418: {
    ja: "黒いカードの文章が二重に見えていたのを直しました。真ん中の紋様も、紫のものになっていたので黒のものに差し替えています。",
    en: "Fixed the text on the black card showing twice. The emblem in the middle was the purple card's, and is now the black one.",
  },
  419: {
    ja: "なないろの欠片で、すでにロックした札をもう一度使えてしまい、ロックの色が増えることがあったのを直しました。",
    en: "Fixed a Shard of Seven Hues that was already locked being usable again, which could add a locked colour out of nowhere.",
  },
  420: {
    ja: "不具合報告のボタンを、タイトル画面にも出るようにしました。試遊版をホーム画面から開いた時に通常のタイトルになってしまう件も、ログインしていない方には「アカウントを作らずに試す」を出すようにして直しました。",
    en: "The bug report button is on the title screen again. The trial entry being lost from a home screen shortcut is handled too: logged-out visitors now get a \"Try it without an account\" button.",
  },
  425: {
    ja: "カードにカーソルを合わせても拡大が出なくなっていたのを直しました。見えない膜が盤面の上に乗りっぱなしになっていたのが原因で、観戦中だけでなくオンラインの対局中もそうなっていました。",
    en: "Fixed the card zoom not appearing on hover. An invisible layer was sitting over the board the whole time, which affected online play as well as spectating.",
  },
  428: {
    ja: "ゲート侵攻の演出が、画面を触った拍子に途中で消えてしまうことがあったのを直しました。出たばかりの背景を押しても飛ばなくなります（少し待ってから押せば、今までどおり飛ばせます）。",
    en: "The gate invasion sequence could vanish part-way if you happened to tap the screen as it appeared. Tapping the backdrop right as it shows up no longer skips it; wait a moment and it still skips as before.",
  },
  421: {
    ja: "置いた罠がターン終了時に消えてしまい、下にあったカードが代わりに発動していました。直しました。",
    en: "A trap you placed was being removed at the end of your turn, so the card underneath triggered instead. Fixed.",
  },
  411: {
    ja: "ターンが切り替わる時、右上に出ていた拡大カードがふわっと消えるようにしました。",
    en: "When the turn changes, the enlarged card in the top right now fades out instead of vanishing.",
  },
  413: {
    ja: "マイデッキを選ぶ画面が、スマホで横に入り切らなかったのを直しました。あわせて文字も読める大きさにしています。",
    en: "Fixed the deck picker not fitting across the screen on phones. The text is readable at that size now, too.",
  },
  // 🔴 #441 と #432 は同じ原因（たくさん捨てた時に端末のメモリが足りなくなる）。
  441: {
    ja: "手札をまとめて捨てた時にアプリが落ちてタイトルに戻ってしまうことがあったのを直しました。カードが燃える演出が1枚ずつ画面いっぱいの絵を用意していたため、枚数が多いと端末のメモリが足りなくなっていました。2枚目からは軽い演出に切り替わります。",
    en: "Fixed the app dropping back to the title screen when you discarded a lot of cards at once. The burn effect was preparing a full-screen image for every single card, which ran the device out of memory. From the second card onward it now uses a lighter effect.",
  },
  432: {
    ja: "色落ちキャットなどでまとめてカードを捨てた時にアプリが落ちてタイトルに戻ってしまうことがあったのを直しました。カードが燃える演出が1枚ずつ画面いっぱいの絵を用意していたため、枚数が多いと端末のメモリが足りなくなっていました。2枚目からは軽い演出に切り替わります。",
    en: "Fixed the app dropping back to the title screen when an effect like the Faded Cat made you discard several cards at once. The burn effect was preparing a full-screen image for every single card, which ran the device out of memory. From the second card onward it now uses a lighter effect.",
  },
  429: {
    ja: "ご指摘のとおりでした。「このターン移動できない」時にまで、移動先が1つもない時の救済（隣に山札から1枚置く）が働いてしまっていました。移動を封じられている時は何も置かずにターンを終えるようにし、その旨をお知らせするようにしました。",
    en: "You were right. The relief for having nowhere to move (placing one deck card next to your piece) was also firing when an effect had forbidden movement for the turn. Now nothing is placed in that case, and the game says so.",
  },
  431: {
    ja: "2点とも直しました。不具合報告の画面を常に一番手前に出すようにしたので、ほかの案内の後ろに隠れなくなりました。また、移動先の確認が出ている間は盤面を触れないようにしたので、接触の確認が重なって出ることがなくなりました（確認の「はい」「いいえ」は今までどおり押せます）。",
    en: "Both are fixed. The bug report window now always sits in front, so it no longer hides behind other notices. And while the move confirmation is open the board no longer responds, so the contact confirmation can no longer appear on top of it (the confirmation's own Yes/No still work).",
  },
  434: {
    ja: "ご指摘のとおりでした。誘惑の黒の烙印が置かれた色にロックするには、ロックするカードのほかに手札が2枚必要（＝2枚捨てる分）なのに、それが足りなくてもロックできてしまっていました。足りない時はロックできないようにし、光らないカードを押した時はその理由もお伝えするようにしました。",
    en: "You were right. Locking onto the colour where the Brand of Black Temptation sits requires two more cards in hand besides the one you lock, but the game let you do it without them. Now it does not, and tapping the card tells you why.",
  },
  436: {
    ja: "どちらも直しました。練習モードのバナーの文字とボタンをスマホで大きくし（ボタンの高さは3割ほどから倍以上に）、バナーの位置を少し下げて不具合報告ボタンと重ならないようにしました。",
    en: "Both are fixed. The practice banner's text and button are now much larger on a phone, and the banner sits a little lower so it no longer overlaps the bug report button.",
  },
  443: {
    ja: "ご指摘のとおりでした。マイページを開いている時にランキングのアイコンを押すと、出てくる2つの選び札（ランキングを見る／戦績システムへ）がマイページの下に隠れてしまい、押せなくなっていました。前に出るようにしたので、どの画面からでも選べます。",
    en: "You were right. While My Page was open, pressing the ranking icon opened its two choices behind the page, so they could not be pressed. They now come to the front, so you can pick from any screen.",
  },
  444: {
    ja: "入れました。フレンド申請が届いていると、画面上部のマイページのアイコンに赤い数字が出ます。ホーム画面を開いた時とログインした時に見に行き、申請に返事をするとすぐ減ります。",
    en: "Added. When friend requests are waiting, a red number now appears on the My Page icon at the top of the screen. It is checked when you open the home screen and when you log in, and it goes down as soon as you answer a request.",
  },
  439: {
    ja: "ご報告のとおりでした。スマホでは「音を鳴らしてよい操作」の外から対局のBGMを鳴らそうとすると端末に止められることがあり、その時に鳴らし直す仕組みが入っていたのですが、それが一度も働いていませんでした。効果音は別の仕組みで鳴るので出続ける——まさにご報告の症状でした。画面を触った時に鳴り直すようにしました。",
    en: "You were right. On phones the device can block the match BGM when it is started outside a tap, and the safety net that should retry it had never actually been running. Sound effects use a different path, which is why they kept playing - exactly what you described. It now retries when you touch the screen.",
  },
  435: {
    ja: "入れました。盤面のカードを複数枚捨てる場面（白の意志の覚醒など）にも「おまかせ」ボタンを付けました。手札を捨てる時と同じ位置にあります。これまでは「何も押さずに『これで捨てる』を押せば、並んでいる順で捨てます」という案内を出していたのですが、手札側で見慣れたボタンを探してしまいますよね。失礼しました。",
    en: "Added. The screen for discarding several cards from the board (White Will's Awakening and the like) now has an Auto button, in the same place as the one for discarding from your hand. Until now it only said in text that confirming without tapping anything discards them in the order shown - but of course you look for the button you know from the hand version. Sorry about that.",
  },
  438: {
    ja: "設定の「カード拡大の大きさ」は、カードを長押し（パソコンならマウスを乗せた時）に出る拡大の大きさです。到達した時などに画面の右上に出るカードは別のものでした。分かりにくかったので設定の名前に「長押し」と書き足し、あわせて**右上に出るカードの大きさも設定から変えられるように**しました（オプション → 詳細設定 → 画面の見え方）。どちらのつまみにも「戻す」を付けたので、いじりすぎても元に戻せます。",
    en: "The \"Card zoom size\" setting controls the enlargement that appears when you press and hold a card (or hover it on a PC). The card that appears at the top right when a piece arrives was indeed a separate thing. Since that was unclear, the setting is now labelled \"long press\", and the top-right card can now be resized from the settings too (Options - More settings - How things look). Both sliders have a Reset button, so you can always get back to the default.",
  },
  430: {
    ja: "ご報告のとおりでした。画面ごとの左上の「戻る」を測ったら、お知らせの画面だけがスマホ用に大きくしてあり、残りの7画面（図鑑・マイページ・ランキング・ショップ・マイデッキ2画面・基本設定）はその半分の大きさでした。8画面すべて同じ大きさに揃え、スマホでは指で押しやすい大きさにしました。",
    en: "You were right. Measuring the top-left Back button on every screen showed that only the news screen had been enlarged for phones - the other seven (codex, my page, ranking, shop, the two deck screens and settings) were half that size. All eight are now the same size, and large enough to tap comfortably on a phone.",
  },
};

// 文面がある番号は、自動的に「対処済み」にも入れる（二度書きしなくてよいように）。
for (const id of Object.keys(BUG_REPORT_FIX_NOTES)) HANDLED_BUG_REPORT_IDS.add(Number(id));

// その報告に対する「直した内容」を、今の言語で返す（無ければ null）。
export function getBugReportFixNote(id, lang) {
  const n = BUG_REPORT_FIX_NOTES[Number(id)];
  if (!n) return null;
  return (lang === "en" ? n.en : n.ja) || n.ja || null;
}

export function isBugReportHandledInCode(id) {
  return HANDLED_BUG_REPORT_IDS.has(Number(id));
}
