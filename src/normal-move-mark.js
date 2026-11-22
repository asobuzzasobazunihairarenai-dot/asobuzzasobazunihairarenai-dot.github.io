// 「このターン、通常の移動をしたか」だけを覚える、ごく小さな葉モジュール。
// import を一切持たないので循環 import の心配が無い（effect-delegation.js と同じ作り）。
//
// 🔴 なぜ要るか: 旧0th の**ダッシュ**の手札効果
//   「このターン、**通常の移動をしたなら**、１マス移動する。」（続き788）。
//
// 🔴 **なぜ `moveActionTaken` では足りないか**: あれは**接触でも立つ**。
//   接触は「移動」ではないので、接触したターンにダッシュが使えてしまう。
//   ⇒ 「通常の移動（タップ／ドラッグ／自動）」の時だけ立てる別の印を持つ。
//
// 🔴 **なぜ phase-automation.js に置かないか**: そこを card-effect-engine.js から import すると
//   **循環 import**（phase-automation → card-effect-engine → phase-automation）になる。
//   葉に切り出せば両方から読める。
//
// ⚠ ターン番号で覚える（NEXT_TURN のたびに増える単純な値なので、違えば別のターン）。
//   クライアントのローカルな記録で、state には入れない——消えたら「使えない」に倒れる＝安全側。
//
// 🔴🔴 **この印を手札効果の条件（`requiresNormalMoveThisTurn`）に使ってはいけない**（#768・続き800）。
//   「通常の移動」は**用語集どおり「ムーブフェイズでの移動」**（ユーザー確認済み 2026-11-22）で、
//   フェイズの順番は **lock → hand → move** ＝ **ハンドフェイズはムーブフェイズの前**。
//   だから自分のハンドフェイズでは**原理的に一度も真にならず、その札は一度も使えない**
//   （ダッシュ■が実際にそうなっていた）。
//   ⇒ 「このターン、通常の移動をしたなら〜」という手札効果は、条件で待つのではなく
//     **`ANNOUNCE_MOVEMENT_BOOST_THIS_TURN` の `plain`**（宣言しておいて、ムーブフェイズの
//     通常の移動のあとに1マス多く歩ける）で書く。接触は歩数を使わないので条件は守られる。
//   ⚠ `requiresNormalMoveThisTurn` 自体は**いまどのカードも使っていない**。
//     到達効果や「相手のターンに割り込む」形でなら真になり得るので残してあるが、
//     **手札効果に付けるなら、その条件が真になり得る順番かを先に見ること。**
let 覚えたターン = -1;

// 通常の移動をした時に呼ぶ（phase-automation.js の markPhaseMoveActionTaken から1か所だけ）。
export function noteNormalMove(turnNumber) {
  覚えたターン = Number.isFinite(turnNumber) ? turnNumber : -1;
}

// そのターンに通常の移動をしたか。
export function didNormalMoveOnTurn(turnNumber) {
  return 覚えたターン >= 0 && 覚えたターン === turnNumber;
}
