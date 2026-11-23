// パフォーマンス改善用の「アニメーションを減らす」設定。統合グラフィックスのPC等で
// 動作が重い場合に、プレイヤー自身の判断で個別にオン/オフできるようにする。純粋に
// クライアントローカルな描画設定のため（サーバーへは一切送らない）、1人がオンにしても
// 相手プレイヤーの画面には影響しない。src/lock-color.jsと同じ「モジュール変数＋
// getter/setter」パターン。ページ再読み込みでデフォルト（全てオフ＝今まで通り）に戻る、
// 他の基本設定トグルと同じ扱い（永続化しない）。

let flightDisabled = false;
let arrivalEffectDisabled = false;
let continuousGlowDisabled = false;

// 移動アニメーション（駒・カードの飛翔、ghost-flight.jsのflyGhost経由の全て）。
export function isFlightAnimationDisabled() {
  return flightDisabled;
}
export function setFlightAnimationDisabled(v) {
  flightDisabled = v;
}

// 到達・ロック演出（光の柱・光の輪・ロック画像の拡大フェードアウトなど、一時的な演出）。
export function isArrivalEffectDisabled() {
  return arrivalEffectDisabled;
}
export function setArrivalEffectDisabled(v) {
  arrivalEffectDisabled = v;
}

// 常時光る演出（手番の駒/ロックエリア/名前ラベル/アバターのパルス、ロック中カードの
// 周回演出など、ゲーム中ずっと動き続けるCSSアニメーション）。
export function isContinuousGlowDisabled() {
  return continuousGlowDisabled;
}
export function setContinuousGlowDisabled(v) {
  continuousGlowDisabled = v;
}

// ユーザー要望「相手の基本時間のカウントダウンを表示/非表示できるようにしてほしい。
// デフォルトは非表示で」（src/turn-timer.jsのupdateBaseClock参照）。自分自身の
// カウントダウンは常に表示するので対象外——これは「相手の分」だけを見るかどうかの
// 設定。画面中央の砂時計ロープ（延長時間、turn-timer.jsのupdateRope）は元々誰の分でも
// 常時表示のままで、この設定の対象外。
// 🔴【#806・続き825】**既定を「出す」に変えた**（ユーザー判断 2026-11-23。
//   報告「相手のタイマーの進みが見えない」）。上の「デフォルトは非表示で」は
//   2026-09 の指示で、**今回それが更新された**——消さずに残してあるのは、
//   次に読む人が「昔はこうだった」と分かるようにするため。
//   ⚠ 出し分けの設定（⚙オプション「相手の持ち時間も表示する」）はそのまま残る。
//   ⚠ 色だけで見分けさせない。誰の分かは turn-timer.js が**名前**でも出す。
let opponentBaseTimerVisible = true;
export function isOpponentBaseTimerVisible() {
  return opponentBaseTimerVisible;
}
export function setOpponentBaseTimerVisible(v) {
  opponentBaseTimerVisible = v;
}
