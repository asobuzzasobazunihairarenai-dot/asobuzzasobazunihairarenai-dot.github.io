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
  // 2026-11-12（続き694・695）で直した分。🔴 直したらその場で足す（続き672・678・691 で3回
  //   取りこぼして、管理者ダッシュボードの「未対処」が実際より多く出ていた）。
  582, // フェニックスが撃てなくなっていた（続き694）
  580, // 「次へ」をカードのそばへ
  583, // 選択肢モーダルが上下に見切れる
  585, // ゲートブレイクの余韻（音は注文書）
  586, // CPU戦の「自分にも持ち時間」が効かない
  587, // ジュエルの周りの透明な立方体
  588, // 行動ログに状況カードと選択
  591, // 画面の下が見切れる（#531 の巻き添え）
  595, // ジョイナーの手札効果で終われない
  // 2026-11-11（続き691）の棚卸しで登録した分。直っていたのに書き忘れていた古い報告（#349〜#427）。
  // 🔴 根拠は docs/dev-log.md に「直した／説明した」と書いてある回だけ。再現せず・原因未特定・
  //   記載なしのもの（#349 #376 #377 #388 #409 #410 #422 #423 #426 #427）は**入れていない**。
  442, // 移動の確認に行き先を言葉で出した（続き680）
  358, // 長押し拡大の大きさの上限を広げた（続き563）
  369, // 盤面が真っ白になるのを捕まえてCSS描画へ戻す（続き556）
  370, // カメラの戻りの予約を置く場所を直した（続き553）
  371, // 駒消し・カード消しボタンを既定で出さないようにした（続き554）
  372, // カメラが動いている最中に画面座標を使う処理が走っていた（続き553）
  373, // 同上（続き553）
  374, // 同上（続き553）
  375, // ゴメンナサイで止められた時に何が起きたか分かるようにした（続き557）
  385, // 勝利演出の衝撃波が七色になっていなかったのを直した（続き638）
  389, // 色落ちキャットの捨てる順をモーダルで選べるようにした（続き563）
  390, // 言語切り替えの案内を出すようにした（続き571）
  391, // ブーストONでノワールが3枚になっていたのを直した（続き571）
  400, // 全画面表示ボタンは不具合ではないと説明した（続き578）
  401, // アプリアイコンをロゴに差し替えた（続き579）
  402, // ホーム画面のスクロールを詰めた（続き578）
  403, // 中央のモーダルの文字をスマホで大きくした（続き589 系）
  405, // 試練の儀式の覗き中もホバーで盤面を見られるようにした（続き581・582）
  406, // もう一回の時に誰を待っているか名指しするようにした（続き581・582）
  407, // 移動できないのに移動先だけめくれるのを直した（続き586）
  408, // サマリーの✕を大きくした（続き589）
  412, // 複数捨てるモーダルの見切れを直した（続き589）
  414, // ターン表示の改行を直した（続き591）
  415, // カードのふりがなを黒にした（続き591）
  416, // 1つのロック宣言に複数のゴメンナサイが使えたのを直した（続き592）
  417, // ゴメンナサイの最中の自動承認を直した（続き592）
  424, // HUERISEの読み込みを速くした（続き6xx）
  // 2026-11-11（続き691）で登録した分（直したのに書き忘れていた＝続き672・678 と同じ取りこぼし）。
  536, // スマホで盤面・ロックのカードを長押し→上スワイプで補足を見られるようにした（続き683）
  546, // 捨て札一覧は既定で見られない（在メモリの管理者トグルのみ）と確認して回答（続き690）
  548, // 連鎖の数え方を「自分の駒が連鎖した数」だけにした（続き690）
  550, // ジュエルのカットの線を半分にした（続き690）
  551, // 1st のカード題字にルビを入れた（続き690）
  552, // 治安悪化の選択モーダルが2つとも灰色で詰むのを直した（続き690）
  553, // 同上（#552 と同じ原因）
  555, // 選んだマスをもう一度押すと外れるようにした（続き690）
  556, // 裏向きの表面を見る演出を「次へ」で進め、光っているマスに重ならない所へ出した（続き690）
  560, // 迷いの森の捨てる順を盤面のマスで選べるようにした（続き690）
  561, // 紅の鉄拳の手札効果に括弧書きを入れ、奪う枚数を1行で知らせるようにした（続き691）
  562, // リトルマウスの割り込みを、奪える相手がいる時だけ出すようにした（続き691）
  566, // 同上（#562 と同じ原因）
  567, // リトルマウスで対局が止まるのを直した（優先権の戻し先。続き691）
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

  // 2026-11-07（続き672）に**まとめて登録した分**。
  // 🔴 直したのにここへ足し忘れていたもの。ダッシュボードで「未対処」の数が実際より
  //   多く出ていたため、CLAUDE.md の開発ログ（続き656〜671）に「直した／説明した」と
  //   書いてある回だけを根拠に入れた。
  //   ⚠ **未解決・情報待ち・相談中のものは入れていない**（#442 #445 #446 #450 #452 #453
  //   #454 #457 #459 #505 #507 #508 #511 #512 #513 #516）。
  // 2026-11-03（続き656）
  449, // ミニモーダルが4回出るのをまとめたい（#315 の batchNotice に寄せた）
  455, // HUERISE のタイトルが反応しない（pointerdown でも受ける＋白いガードのどこでも始まる）
  456, // ホームのBGMの頭が隠れる（フェードを3.2秒・2.2乗の曲線へ）
  460, // 同上（#455 と同じ）
  463, // 捨てた後のお知らせが何度も出る（まとめる側へ寄せた）
  464, // ゲートチャージの到達効果が発動しない（続き654 の push で解消済み）
  465, // オレンジバスの到達効果が発動しない（同上）
  466, // リーチキャンセルの到達効果が発動しない（同上）
  469, // ゲーム中に日本語へ切り替えても次は英語に戻る（オープニングの言語ボタンが保存していなかった）
  471, // ヴィヴィアンで相手の到達なのに自分に選択モーダルが出る（選ぶ権利を到達した本人へ）
  472, // ジェイクはマスを選ぶたびにその場で表面を見せる
  476, // CPUがリーチキャンセルをコイン投げで使っていた（基準を与えた）
  // 2026-11-03（続き657）
  467, // 赤のはじまりの手札効果を「捨て場の1番上から2番目」に（続き659 で意図どおりに確定）
  473, // 足下の隠し財産の効果を作り直した
  474, // 同上
  477, // 赤のはじまりの到達が不発（到達側の helpers に drawFromDiscard が無かった）
  478, // リトルマウスが一度も奪えていなかった（到達側に pickRandomFromOpponentHand が無かった）
  482, // ジェイクの見せ方（続き656 の push で解消済み）
  483, // CPUの割り込みモーダルが自分に出る（手札効果側にも選ぶ権利を渡した）
  484, // ジョイナーの走術で1回しか移動できない → 到達は印字どおり1マス（説明。#493 で本人も確認）
  486, // リーチキャンセルのモーダルの非表示が効かない
  487, // 「盤面を見る」の後に「戻す」で戻れるように
  488, // ヤエザでまとめて捨てる時に順番を聞いていなかった
  // 2026-11-03（続き658・659）
  458, // CPUが罠のある自分のゲートへ行く（ものさしの重みを -7 へ）
  462, // パーティの下のギャンブルが発動しない → 他の人の到達なので自分の画面では処理されない（説明）
  468, // 手札から置く時、飛翔の時点で表向きに
  470, // 日本語なのに詳細モーダルが英語（文言を関数で渡す形に）
  481, // ジェイクの7マスを選んだ後にまとめて1回だけ確認する
  485, // 効果でオープンする時にカメラが寄る
  // 2026-11-04（続き661）
  493, // ジョイナーの到達でカードのあるマスに移動できる → 印字どおり（本人も「私のdebugが間違ってました」）
  497, // ヴィヴィアンの報告（#498 で本人が取り下げ）
  498, // 同上（取り下げの連絡そのもの）
  // 2026-11-04（続き663）
  479, // 割り込みモーダルを非表示にできるように＋非表示中の再開ボタン（＝#495 として実装した）
  480, // 「もう実装されてたね！ごめん!」＝#479 の取り下げ
  489, // 追色コストが1枚なら自動で払う（設定で選べるように。既定は今までどおり）
  490, // 色を当てたらお祝いする（鑑定士の技・ジェイク）
  494, // 不思議な果実の効果を変えた
  495, // 割り込みのモーダルに「今後表示しない」＋再開ボタン
  504, // CPUが2枚のオレンジバスを行き来する（続き670 で -7 へ強化）
  // 2026-11-05（続き664・665）
  509, // 割り込みのモーダルに「使わない」が無い
  510, // オープンのお知らせがズームしたカードに被る（カメラが戻ってから出す）
  514, // 大地創造で4マス選んでも確認が出ない
  515, // 不思議な果実で動かされても移動先がオープンされない
  // 2026-11-07〜11-08（続き673・674・676）。⚠ 直した回に足し忘れていたので、続き678 でまとめて入れた。
  //    （#521・#523 は BUG_REPORT_FIX_NOTES に文面があるので自動で入る＝ここには書かない）
  525, // 「場の中央に表向きで置く」は飛翔の時から表向きにする
  526, // 捨て場にカードが無いのにルビナグナが使えてしまう（善処の原則）
  527, // 相手のロック宣言時に賄賂を発動できない（割り込みの窓が開いたままだった）
  528, // 建設バブルは1マスずつ「山札か手札か」を聞く
  529, // 賄賂が後から使えてしまう（#527 と同じ穴の裏側）
  530, // 【状況】カードの名前が「null」と出る
  540, // 1st EDITION のカードのタイトルが読みにくい（地の色が濃いまま）
  // 2026-11-09（続き678）
  531, // ホーム画面から開いたアプリで下に黒い余白が残る
  532, // 貴族の特権で動かされた相手の移動先がオープンされない
  533, // 食べ過ぎの手札効果の文から「このカードを捨てる」を削除
  534, // 相手の貧民の行進で自分の移動先が選べない（委任の候補に zone が無かった）
  535, // 迷いの森で捨てる順が選べない
  539, // 2人対戦でいないプレイヤーのゲートを選べてしまう
  541, // カードタイトルが黒くて見にくい（0th拡張。#540 は 1st だけ直していた）
  542, // 接触の助走・突進で駒がひらぺったくなる（#523 と同じ。続き677 で直した）
  // 2026-11-10（続き679）
  450, // 練習をやめて待機に戻る帯が邪魔（右上へ寄せた）
  452, // 下に黒い余白が残る（#531 と同じ。standalone の高さで直した）
  453, // 「このマスでいいですか」が小さい（スマホ・タブレットだけ大きくした）
  537, // 中央に既にある状況カードに到達しても置き直さない（不発モーダルにした）
  538, // ピーターフッドで置くマスの順番を選べるようにした
  // 2026-11-11（続き688〜689）
  544, // ジュエルの駒の足元の影が正方形（丸くした。大きさの方はユーザー判断待ち）
  545, // 移動で駒が跳ねる時、一瞬ジュエルがキューブになる（本物の駒を盤面の中で飛ばすようにした）
  547, // ピーターフッドの置く順番（続き679 で直し済み。報告の25分後に入っていた）
  549, // 同上（#545 と同じ）
  557, // 貧民の行進は「２マス一気」ではなく「１マスずつ２回」
  558, // ホーム画面がスクロールする（52px → 22px。残り22px はユーザー判断待ち）
  559, // 貧民の行進でスラム街に到達しない（表なら到達する、が正しい）
  // ── 2026-11-12（続き696） ──
  589, // カード補足の文の用語を押すと説明が出るようにした（追色・財力を用語集へ追加）
  590, // 盤面が真っ暗: 見えていないと分かったらCSS描画へ戻す＋計器
  592, // 【状況】カードが効く時の演出
  593, // 割り込みのオンオフをサマリーの隣へ（持っている間だけ出る）
  594, // 状況カードの処理中にフェイズが進んでしまうのを止めた
  596, // ONLYカードを光らせる
  597, // 状況カードの手札効果で「オープン動作」が見えていたのを直した
  598, // CPU戦で「自分にも持ち時間」を入れてもタイマーの数字が出なかった
  599, // 置けるマスが無いのに大地創造が使えた
  600, // 相手の鑑定士の技で、こちらにも表面が見えていた
  601, // 590 と同じ（盤面が真っ暗）
  606, // CPUのターンのフェスティバルのモーダルが人間に出た
  609, // CPUの経済成長のモーダルが人間に出た
  // ── 2026-11-12（続き697） ──
  602, // ランク戦の探し中を左上の小さな箱へ（くわしくは ⓘ）
  603, // 続けてオープンする時、1枚ずつ見てから次のマスへ
  605, // CPUが何も起きないマスへ行っていた（状況カードの重み）
  607, // 盤面のカードのテクスチャを256pxへ（WebGLの持ち物を減らす）
  608, // ピーターフッドの到達効果を短く
  // ── 2026-11-13（続き698） ──
  564, // ゲート侵攻のモーダルと GATE BREAK の演出が重なっていた（続き691 で直し済み・登録漏れ）
  569, // 「このマスでいいですか？」のボタンをスマホで大きく
  570, // 相手を選ぶ画面にアバターを並べた
  572, // 盤面拡大ボタンとターン履歴の重なり（履歴を上へ逃がした）
  573, // 接触で戻る時、宝石の駒が一瞬キューブに見えていた
  574, // 長押しの案内を指の所に（上向きの矢印＋「補足」）
  576, // 虹色のてかりは「なないろの欠片」のキラ加工だと説明した（不具合ではない）
  577, // マックール等「オープンしない」の札で、既に表向きなら到達するように
  610, // CPUが色寄せの笛でコイン投げをしていた（取る＞オープン）
  611, // 画像モードで 0th拡張・1st の効果文が出ていなかった
  612, // CPU戦で「自分にも持ち時間」を入れても延長ロープが出なかった
  613, // 色寄せの笛で「なないろの欠片」を選べなかった
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
  604: {
    ja: "こちらは不具合ではありませんでした。ロックエリアに置いてあるファーストカードは、手札が1枚ちょうどの時に使えるようになるので、手札が賄賂だけでもハンドフェイズは止まります（使えるカードが残っているため）。",
    en: "This one is working as intended. The First card in your lock area becomes usable when your hand is exactly one card, so the Hand phase waits even when the bribe is your only card in hand.",
  },
  600: {
    ja: "直しました。裏向きのカードの表面は、効果を使った本人だけが見られるようにしました。相手が確かめた時は「確かめました」とだけ出ます。",
    en: "Fixed. The face of a face-down card is now shown only to the player whose effect revealed it. When someone else checks, you only see that they checked.",
  },
  589: {
    ja: "入れました。カードの補足の画面に出てくる言葉（【追色】【財力】など）を押すと、その場で説明が開きます。",
    en: "Added. In the card notes screen you can now tap a term such as Color Cost or Wealth to open its explanation right there.",
  },
  598: {
    ja: "直しました。CPU対戦で「自分にも持ち時間」を入れている時に、持ち時間の数字が出ていませんでした。",
    en: "Fixed. In CPU matches with your own timer turned on, the time was not being displayed.",
  },
  563: {
    ja: "再読み込みや強制終了のあとでも、その直前の行動ログが残るようにしました。これまでは入り直した瞬間に消えていたので、今回のように「移動できなかった」時間帯が丸ごと欠けていました。次に同じことが起きたら原因まで追えます。",
    en: "The action log now survives a reload or a crash. Until now it was wiped the moment you re-entered, so the period you were describing was missing entirely. If it happens again the cause can be traced.",
  },
  568: {
    ja: "案内表示の設定は、いまは端末ごとの保存でアカウントには紐づいていません。別の端末で遊ぶと案内がもう一度出ます。アカウントに紐づけることもできるので、必要なら言ってください。",
    en: "Guide-display settings are currently saved per device, not on your account, so the guides reappear on another device. They can be moved onto your account if you want that.",
  },
  571: {
    ja: "直しました。ロックエリアを選んでいる時は「このロックエリアでいいですか？」と出るようにしました。",
    en: "Fixed. When you are choosing a lock area it now asks \"Use this lock area?\" instead of calling it a square.",
  },
  575: {
    ja: "直しました。接触が行動ログに1行も残っていませんでした（内部の記録だけで、読める方のログには出ていませんでした）。これからは「誰に接触して何を奪ったか」が1行で残ります。",
    en: "Fixed. Contacts were leaving no line in the readable action log (only internal diagnostics). Each contact now records who you contacted and what you took.",
  },
  578: {
    ja: "直しました。前日に入れた「選んだマスをもう一度押すと外れる」が原因で、CPUが同じマスを選び直し続けていました。自動で動く席には選び済みのマスを出さないようにしたので止まりません。",
    en: "Fixed. A change made the day before (tap a chosen square again to deselect it) made the CPU re-pick the same square forever. Automatic seats are no longer offered squares they have already chosen.",
  },
  410: {
    ja: "いまは**ブーストモードではありません**。当時は本当に漏れていて、CPU戦のモーダルで選んだブースト・白黒の設定がそのまま本気のエイドス戦に引き継がれていました（白紙カードが混ざるなど）。2026-10-16 に、物語戦は誰がやっても同じ戦いになるよう設定を固定したので、いまは端末の設定に関わらずブースト無し・白黒無しです。",
    en: "No, it is not. Back then the setting really did leak: the Boost and colorless options you picked in the CPU match dialog carried over into the serious Eidos battle. Since 2026-10-16 the story battle has fixed settings so that it plays the same for everyone, so Boost and colorless are always off there now.",
  },
  422: {
    ja: "この形はすでに直っています。「このマスでいいですか？」が出ている間は、盤面のタップを受け付けないようにしました（別の報告への対応で入った直しです）。実際に確かめたところ、『はい』の裏に光っているマスが重なっていても、選んだマスのまま確定します。もし今も違うマスへ動くことがあれば、その時の行動ログを付けて教えてください。",
    en: "This has already been fixed: while the \"Is this the square?\" prompt is open, taps on the board are ignored (the fix came in with another report). Measured directly: even when a highlighted square sits behind the Yes button, the move still goes to the square you picked. If it ever moves somewhere else again, please send the action log with it.",
  },
  507: {
    ja: "ボタンを右側へ寄せました。2つの選択肢は「フレンドリーマッチ（左）」「CPU戦（右）」の並びなので、右端に付けるとCPU側の話だと見た目で分かります。なお強さ・人数・追加ルールはCPU戦だけの設定です（カードセットだけは、フレンドリーの部屋を作る時の最初の値にもなります）。",
    en: "The button is now aligned to the right. The two choices are Friendly match (left) and CPU match (right), so putting it at the right edge shows at a glance that it belongs to the CPU side. Difficulty, player count and extra rules are CPU-only settings (only the card set also acts as the starting value when you open a friendly room).",
  },
  565: {
    ja: "ゲート侵攻の告知の「✕」が、残りの告知をまとめて飛ばしていました（スキップボタンと同じ動きでした）。✕は「いま出ているものを閉じて次へ進む」だけにしたので、一気に進んでしまうことはなくなります。相手のワインウェアが画面に反映されない件は、まだ調べています。",
    en: "The X on the gate-invasion announcements was skipping all of the remaining ones at once (it behaved exactly like the Skip button). X now just closes the current announcement and moves to the next one. The separate issue of an opponent's Wineware not showing on your screen is still being looked into.",
  },
  376: {
    ja: "画像を添付できないことがあったのを直しました。ログインの状態が古くなっていると、添付ボタンは出るのに送る時だけ「ログインしていない」と判断されてしまうのが原因のひとつでした。あわせて、万一また送れなかった時にその理由が報告に残るようにしたので、次に起きたらすぐ原因が分かります。",
    en: "Fixed a case where an image could not be attached. One cause was a stale sign-in state: the attach button appeared, but the upload itself decided you were signed out. The reason for any future failure is now recorded with the report, so the next occurrence can be pinned down right away.",
  },
  447: {
    ja: "英語で遊んでいる時に、ログインボーナスのお知らせだけ日本語で出ることがあったのを直しました。言語の設定をアカウントから読み込むより先にお知らせが出てしまうのが原因だったので、出ている間に言語が決まったら書き直すようにしました。",
    en: "Fixed the daily bonus notice sometimes appearing in Japanese while you are playing in English. It was being shown before your language setting had finished loading from your account, so it now updates itself if the language is decided while it is on screen.",
  },
  448: {
    ja: "言語を切り替えた時に、画面右上の「セットアップ」と人数のボタンだけ前の言語のまま残っていたのを直しました。総点検した結果、残っていたのはこの3か所でした。",
    en: "Fixed the Setup button and the player-count buttons keeping the previous language after switching. A full sweep found those three places and nothing else.",
  },
  451: {
    ja: "接触の時の助走とタックルが見えないことがあったのを直しました。演出が始まる直前に駒が作り直されていて、もう画面に無い方の駒を動かしていたのが原因です。3回も報告してくださってありがとうございます——おかげで「演出は動いているのに見えない」という、記録だけでは分からない形だと分かりました。",
    en: "Fixed the run-up and tackle sometimes not being visible during a contact. The piece was rebuilt just before the animation began, so the animation was moving a piece that was no longer on screen. Thank you for reporting it three times - that is what showed us the animation itself was running and only the piece being moved was wrong.",
  },
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
  433: {
    ja: "間を置くようにしました。CPUの番に到達効果が続けて起きた時、次に進むまで少しだけ待つので、何が起きたのか追えるようになります。自分の番の速さは変わりません（動きを減らす設定にしている場合も今までどおりです）。",
    en: "A pause has been added. When arrival effects happen one after another on a CPU's turn, the game now waits a moment before moving on, so you can follow what happened. Your own turn is just as fast as before, and nothing changes if you have reduced motion turned on.",
  },
  437: {
    ja: "すっきりさせました。「CPUマッチ＆フレンドリーマッチ」を押した時は、まず「CPU戦」「フレンドリーマッチ」の2択だけが出ます。強さ・人数・白黒カード・ブーストなどは「⚙ 詳細を設定する」の中にしまってあり、押さなければおすすめの設定（CPU1体・強さ普通・追加ルールなし）でそのまま始まります。前に設定を変えていた場合は、閉じたままでもそれが分かるように1行で出します。",
    en: "Tidied up. Pressing CPU / Friendly match now shows just those two choices. Difficulty, player count, black-and-white cards, boost and the rest live inside a Set details button; if you do not open it, the match starts with the recommended setup (one CPU, normal difficulty, no extra rules). If you had changed those settings before, a single line tells you so while they stay closed.",
  },
  440: {
    ja: "音を作って入れました。ゲート侵攻が成功した時に専用の効果音が鳴ります（今までこの場面には音がありませんでした）。音量は⚙オプションの音量調整から変えられます。スマホのスピーカーでも芯が聞こえるように、低い音に頼らない音を選んでいます。",
    en: "A sound has been made and added, so a successful gate invasion now has its own effect (this moment used to be silent). You can change its volume from the volume sliders in Options. It was chosen to stay audible on a phone speaker rather than relying on bass.",
  },
  461: {
    ja: "入れました。相手プレイヤーを選ぶ場面で、名前のボタンが並んだ画面も出るようにしました。盤面のアイコンを直接押す今までの選び方もそのまま残してあるので、どちらでも選べます。スリカエだけでなく、相手を選ぶカードすべてで出ます。",
    en: "Added. When a card asks you to pick an opponent, a panel of player names now appears as well. Tapping a player icon on the board still works exactly as before, so you can use either. This shows for every card that picks an opponent, not just Swap.",
  },
  475: {
    ja: "ご相談のうえ、今のままにしました。手札の効果の演出中は、画面を触れば演出を飛ばせる仕組みが既に入っているので、そちらをお使いください。",
    en: "After talking it over we have left this as it is. While a hand-card effect is playing you can already tap the screen to skip the animation, so please use that.",
  },
  491: {
    ja: "直しました。ロックが宣言された瞬間の割り込みは、これまで「画面を出すだけ」で、答えを待たずにロックが進んでいました。やり直しのカギはロックそのものを止めるカードなので、間に合わないと使う意味がありません。割り込める人がいる時は、答えが出るまでロックを待つようにしました。誰も割り込めるカードを持っていない時は待たないので、ふだんのロックの速さは変わりません。",
    en: "Fixed. The interrupt window that opens when a lock is declared used to be show-and-forget: the lock went through without waiting for an answer. Key of Redo stops the lock itself, so being too late makes it useless. Now, when someone can interrupt, the lock waits for the answer. When nobody holds a usable card there is no wait at all, so ordinary locks are as fast as before.",
  },
  492: {
    ja: "直しました。オレンジバスの到達効果は、バスストップが無くて移動できなかった場合でも、このカードを自分の隣に表向きで置けるようになりました（ご指摘のとおりです）。3つめの「そのバスストップを手札に加える」だけは、移動できた時にしか起きません。",
    en: "Fixed. Orange Bus's arrival effect now places the card face up beside you even when there was no Bus Stop to move to - exactly as you said. Only the third part, taking that Bus Stop into your hand, still requires the move to have happened.",
  },
  496: {
    ja: "直しました。カードの効果が「他のプレイヤーに選ばせる」時、選ぶ権利がその相手に移っていませんでした。そのため、CPUの番にあなたが選ぶはずの場面がCPUのものとして扱われ、勝手に決まってしまっていました。委任している間は選ぶ権利もその人のものになるようにしたので、パーティ・ヤエザ・役人・合同建設など、相手に選ばせるカードすべてで直ります。",
    en: "Fixed. When an effect asks another player to choose, the right to choose was not actually handed over. On a CPU's turn a choice that was yours was treated as the CPU's and decided automatically. The right to choose now moves with the delegation, which fixes every card that asks someone else to choose - Party, Yaeza, the Official, Joint Construction and the rest.",
  },
  499: {
    ja: "もっと寄るようにしました。カード効果で場のカードがオープンされる時のカメラの寄りを、ぐっと強くしました（何のカードか分かる近さです）。何枚も続けてオープンする効果では、間で元の視点に戻らずマスからマスへ滑り、最後の1枚の後だけ元に戻ります。強さや角度は管理者モードのつまみで調整できます。",
    en: "Now closer. The camera moves in much harder when a card effect opens a card on the board - close enough to read it. For effects that open several cards in a row it slides from square to square without returning in between, and only goes back after the last one. The strength and angle can be tuned from admin mode.",
  },
  500: {
    ja: "直しました（#491 と同じ原因です）。ロックが宣言された瞬間の割り込みが、答えを待たずに先へ進んでいたため、やり直しのカギを使う前にロックが済んでしまっていました。割り込める人がいる時は答えが出るまで待つようにしました。",
    en: "Fixed - the same cause as #491. The interrupt window did not wait for an answer, so the lock was already done before Key of Redo could be used. Now, when someone can interrupt, it waits for the answer.",
  },
  501: {
    ja: "直しました。ご指摘のとおり、手札は非公開情報です。あの画面はもともと「1台の端末を回して遊ぶ対戦」向けに、他の席の分も見せて代わりに決めてもらう作りでしたが、CPU戦では①CPUの手札が見えてしまう②CPUが割り込むかを人が決めてしまう、という2つの問題がありました。CPUが動かしている席は画面を出さず、CPU自身の判断で決めるようにしました（人同士で1台を回して遊ぶ場合は今までどおりです）。",
    en: "Fixed. You are right that hands are private. That window was built for passing one device around, where showing the other seats' cards is fine; in a CPU battle it both exposed the CPU's hand and let a person decide for it. Seats driven by the CPU now skip the window and decide for themselves. Passing one device between people is unchanged.",
  },
  502: {
    ja: "直しました。ご指摘のとおり「表向きで置く」＝公開情報なので、マスの1番下に沈める前に、中央で1回大きく見せるようにしました。オンラインでは相手の画面にも同じように出ます。",
    en: "Fixed. You are right that \"place face up\" means it is public information, so the card is now shown once, large, in the centre before it is slid to the bottom of the square. Online, the other players see the same reveal.",
  },
  503: {
    ja: "直しました。手札から表向きで置くカードは、飛んでいる間も着地した時も表向きのままになります。これまでは表で飛んできたのに、置かれる瞬間だけ裏になり、そのあとめくれる、という3段の見え方になっていました。",
    en: "Fixed. A card placed face up from your hand now stays face up the whole way - while it flies and when it lands. Before, it flew in face up, turned face down for the moment it was placed, and then flipped over again.",
  },
  521: {
    ja: "直しました。「⚙ 詳細を設定する」を開くと中身がほぼ倍に伸びるのに高さの上限が無く、画面の上下にはみ出て読めなくなっていました。収まる高さにして、足りないぶんは中でスクロールできるようにしました。",
    en: "Fixed. Opening the detail settings nearly doubles the panel's height, and it had no height limit, so it ran off the top and bottom of the screen. It now fits and scrolls inside.",
  },
  523: {
    ja: "原因を取り除きました。駒が平たく見えるのは助走・突進の間だけで、そこだけ駒の描き方が切り替わっています。その描き方に、立体を平らに潰してしまう書き方（過去にも2回同じことが起きています）が残っていたので、見た目が変わらない別の書き方に置き換えました。⚠ こちらの環境では一度も再現しないため、直ったかどうかは実機で見ていただく必要があります。もし再発したら、行動ログに駒の高さが残るようにしたので、次は原因が1行で分かります。",
    en: "The cause has been removed. The piece only looks flat while it runs up and charges, which is the one moment the piece is drawn a different way, and that path still used a construct known to flatten the 3D cube - it has caused this twice before. It is replaced with one that looks identical. This could not be reproduced here, so please check on a real device; if it happens again, the action log now records the cube's height.",
  },
  517: {
    ja: "直しました。やり直しのカギの「任意の枚数を捨てる」画面が、他のカードと同じ『全部捨てる（選ぶのは順番だけ）』の画面を使っていたため、押さなかった札まで捨てられていました。押した札だけを捨てるようにし、１枚も押さずに確定すれば何も捨てません。",
    en: "Fixed. The Redo Key discard screen was reusing the \"discard everything, you only choose the order\" screen, so cards you did not tap were discarded too. Only the cards you tap are discarded now, and confirming without tapping any discards nothing.",
  },
  518: {
    ja: "もっと寄るようにしました（1.28倍 → 1.7倍。少し角度も付けました）。カードのオープンほど強く寄せていないのは、駒が動く演出なので寄せすぎると「どこから動いたか」が画面の外に出てしまうためです。",
    en: "The camera now moves in closer (1.28x to 1.7x, with a slight angle). It is deliberately less than the card-reveal shot, because the piece is moving and too much zoom would push the starting square off screen.",
  },
  519: {
    ja: "直しました。オレンジバスに乗っても得が無い時（表向きのバスストップが場に無い時）の減点が小さすぎて、橙の色や前進の加点に負けていました。はっきり嫌がるようにしたので、他に良い手があればそちらを選びます。",
    en: "Fixed. The penalty for riding an Orange Bus that gains nothing (no face-up Bus Stop on the board) was too small and was outweighed by the bonus for the colour and for moving forward. It is now a clear penalty, so the CPU will prefer any better move.",
  },
  520: {
    ja: "もっと寄るようにしました（#518 と同じ直しです）。リーチキャンセルの到達効果も「移動前のマスへ強制移動」なので、同じつまみで一緒に寄るようになります。",
    en: "The camera now moves in closer - the same change as #518. Reach Cancel's arrival effect is also a forced move, so it is covered by the same setting.",
  },
  522: {
    ja: "いまのバージョンでは動きます。報告をいただいた時のアプリには、まだ 1st EDITION の効果が入っていませんでした（19種のうち7種だけの状態でした）。",
    en: "This works in the current version. The build you reported from did not yet contain the 1st EDITION effects - only 7 of the 19 were implemented at that point.",
  },
  524: {
    ja: "いまのバージョンでは動きます（#522 と同じで、報告をいただいた時のアプリにはまだ入っていませんでした）。",
    en: "This works in the current version - the same as #522; it was not yet in the build you reported from.",
  },
  506: {
    ja: "直しました（#496 と同じ原因です）。ヤエザのように「相手に選ばせる」カードで、選ぶ権利がその相手に移っていませんでした。委任している間は選ぶ権利もその人のものになるようにしました。",
    en: "Fixed - the same cause as #496. For cards like Yaeza that ask an opponent to choose, the right to choose was not handed over. It now moves with the delegation.",
  },
  615: {
    ja: "直しました。色寄せの笛で「手札に加える」側に、笛そのものしか対象が無い時は、CPUが「オープンする」を選ぶようにしました（笛を取っても、その笛でまた同じ選択が来るだけなので）。",
    en: "Fixed. With the colour flute, when the only card it could take is another flute, the CPU now picks \"reveal\" instead - taking a flute only brings up the same choice again.",
  },
  616: {
    ja: "前半は不具合ではありませんでした。奪った紫のスロットには「なないろの欠片」がもう1枚残っていたので、7色は揃ったままでした。ただし画面が「7色が揃わない」と出していて紛らわしかったので、スロットがまだ埋まっている時はそう出すようにしました。後半の「画面が真っ暗」は直しました。",
    en: "The first half was not a bug: the purple slot still held a second Rainbow Shard, so the seven colours were still complete. The message wrongly said \"not seven colours any more\", so it now says when the slot is still filled. The black screen is fixed.",
  },
  618: {
    ja: "直しました。報告をいただいた時のアプリにはまだ入っていなかった直し（光源が消えていた件）が入り、さらに「最初の1コマが描けてから見せる」ようにしたので、一瞬の暗転も出なくなりました。",
    en: "Fixed. The light-rig fix was not yet in the build you reported from, and the board now waits for its first frame before hiding the fallback art, so the brief flash is gone too.",
  },
  620: {
    ja: "直しました。CPUの評価表に「裏貴族の賄賂」が載っておらず、使える場面でも一度も選ばれませんでした。相手のロック色数が多いほど使うようにしました。",
    en: "Fixed. The CPU had no value entry for Noble Bribe, so it never chose it. It now uses it when an opponent is close to winning.",
  },
  623: {
    ja: "直しました。カメラを戻す処理が「演出の最中なら待ち直す」形で、上限がありませんでした。演出中の印が下りないと永久に待ち続けるので、6秒で切り上げて戻すようにしました。",
    en: "Fixed. The camera return waited for animations to finish with no upper bound, so a stuck animation flag kept it zoomed forever. It now gives up after 6 seconds and returns.",
  },
  624: {
    ja: "直しました（#620 と同じ原因です）。CPUの評価表に「やり直しのカギ」が載っていませんでした。",
    en: "Fixed - the same cause as #620. The CPU had no value entry for Redo Key.",
  },
  625: {
    ja: "直しました（#618 と同じ）。盤面は最初の1コマを描き終えてから見せるようにしたので、一瞬の暗転も出なくなりました。",
    en: "Fixed - same as #618. The board now waits for its first rendered frame before hiding the fallback art.",
  },
  617: {
    ja: "直しました。おっしゃるとおり、あの帯は画面の端まで広がっていて、しかも効果のボタンより手前に出ていたので「見えないだけでなく押せない」状態でした。🏆 の小さなつまみに畳むようにして、出た直後の5秒だけ開くようにしました（つまみを押せばいつでも開き直せます）。左上へ移す案もいただきましたが、左上は題字・右上はアイコン列で埋まっているので、小さくして今の場所に残しました。",
    en: "Fixed. You were right - the bar stretched to the edge of the screen and sat above the effect buttons, so it was not just hiding them but blocking taps. It now folds into a small trophy chip, staying open only for the first 5 seconds (tap the chip to reopen). You also suggested moving it to the top left, but the title is there and the icon row is on the right, so it stays put and just gets smaller.",
  },
  619: {
    ja: "そうしました。試練の儀式の間はカメラを元の位置へ戻さず、繰り返している間は寄ったまま札から札へ滑って、儀式が終わってから1回だけ戻ります。",
    en: "Done. During the Trial Ritual the camera no longer returns between steps - it stays in close, glides from card to card, and returns once when the ritual ends.",
  },
  621: {
    ja: "入れました。輪を3枚に増やして間隔をずらし、中央から色が滲む光を1枚足しました（輪だけだと的に見えたので）。あわせて、それまで効いている本人の画面にしか出ていなかったのを、オンラインでも全員の画面に出るようにしました。",
    en: "Added. Three staggered rings instead of two, plus a soft colored bloom spreading from the center. The effect also now shows on everyone's screen online, not just the player whose turn it is.",
  },
  622: {
    ja: "入れました。状況効果が起きた瞬間に、そのカードを右上に大きく出します（大きさ・表示時間は⚙オプションの「右上に出るカードの大きさ」と同じ設定です）。",
    en: "Added. The situation card is now shown enlarged in the top right when the effect fires, using the same size and duration setting as the other top-right cards.",
  },
  614: {
    ja: "直りました（#616 と同じ原因です）。盤面を描き直す時に光源への参照を捨てていなかったので、作り直した盤面に光が1つも足されず、真っ暗になっていました。「盤面に光を当てる」を入れている人だけに出る不具合でした。",
    en: "Fixed - same cause as #616. The renderer kept a stale reference to its light rig, so a recreated scene got no lights at all and rendered pure black. It only affected players with board lighting turned on.",
  },
  626: {
    ja: "入れました。CPU戦で右下のタイマーの数字を押すと「⏳ タイマーをOFFにする」が出て、その場で切れます（オンライン対戦は相手の承認が要るので今までどおりです）。",
    en: "Added. In CPU battles, tapping the timer readout at the bottom right now offers \"turn the timer off\" and switches it immediately (online still needs every player's approval).",
  },
  627: {
    ja: "直しました。行き先が「移動前のマス」＝必ず1回通っているマスなので、CPUの無意味ループ防止（同じマスへ戻るのは1回まで）に毎回弾かれていました。この札だけ上限を2にしたので戻れます（2枚で往復するのは今までどおり止まります）。",
    en: "Fixed. The destination is \"the square you came from\", which the piece has by definition already visited, so the CPU's anti-loop guard (one revisit) blocked it every time. That card now allows two, so it can step back while a genuine ping-pong is still stopped.",
  },
  632: {
    ja: "移しました。あのトロフィーは、ランク戦を待っている間のCPU練習で出る「相手を探し中」のつまみです（#617 で小さく畳んだもの）。右上は到達したカードの拡大が出る場所なので重なっていました。左上へ移したので、どちらも隠れません。",
    en: "Moved. That trophy is the ranked-wait practice chip (the one collapsed in #617). The top-right corner is where the arrival card zooms in, so they overlapped; the chip now sits at the top-left.",
  },
  631: {
    ja: "直しました。カードの文は「このカードをあなたの手札に加える。」が**先**に書かれているのに、既定の「効果の後に手札へ加える」で処理していました。この札は条件が**財力（手札の枚数）**なので、先に入るかどうかで対象になる人が変わります。先に手札へ入れるようにしました。",
    en: "Fixed. The card reads “add this card to your hand” FIRST, but it was using the default “add after the effect”. That matters because the condition is wealth (= hand size), so the timing changes who qualifies. It now goes to your hand before the effect runs.",
  },
  633: {
    ja: "直しました。「場の中央に表向きで置く」はオープンする効果ではないので、めくる演出を出さないようにしました（置く直前に表向きにしているぶんが、裏→表のめくりとして見えていました）。",
    en: "Fixed. Placing a card face up in the centre is not an “open” action, so the flip animation no longer plays there.",
  },
  635: {
    ja: "直しました。ログインのカードを描き直す処理が途中で待つので、2回続けて呼ばれると『両方が先に中身を消して、待ち終わってから両方が足す』で二重になっていました。新しい描き直しが始まっていたら前の回は捨てるようにしました。",
    en: "Fixed. The sign-in card re-render awaits mid-way, so two calls in quick succession each cleared and then each appended, producing two copies. A stale run is now discarded.",
  },
  636: {
    ja: "直しました。日付の括弧（11/15まで）は途中で折らないようにしました。あわせて、短い文は行の長さをそろえる（最後の行に1〜2文字だけ残らない）ようにしています。",
    en: "Fixed. The date in parentheses no longer breaks across lines, and short texts now balance their line lengths so a line never ends with one or two orphan characters.",
  },
  628: {
    ja: "重みを上げました。相手の隣で手番を終えるのは元から減点していたのですが、前進＋そのマスの札の価値に負けていました（実際の手を足すと +6 対 −4 で「行く」になっていました）。減点を −6 にしたので、割に合わない時は近づきません。",
    en: "Re-weighted. Ending a turn next to an opponent was already penalised, but the advance plus the card's value outweighed it (+6 against -4 in the actual move). The penalty is now -6, so the CPU no longer walks into a bad trade.",
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
