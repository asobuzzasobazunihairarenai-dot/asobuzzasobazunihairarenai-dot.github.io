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
let 覚えたターン = -1;

// 通常の移動をした時に呼ぶ（phase-automation.js の markPhaseMoveActionTaken から1か所だけ）。
export function noteNormalMove(turnNumber) {
  覚えたターン = Number.isFinite(turnNumber) ? turnNumber : -1;
}

// そのターンに通常の移動をしたか。
export function didNormalMoveOnTurn(turnNumber) {
  return 覚えたターン >= 0 && 覚えたターン === turnNumber;
}
