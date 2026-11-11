// カード効果の自動処理エンジン。src/card-effects.jsの構造化データ（動詞＋パラメータ）を
// 実際にゲーム状態へ適用する。ユーザー確認済み方針:
// ・基本設定でON/OFFを選べる（デフォルトOFF、既存の自己申告プレイを壊さないため）。
// ・構造化データを持つカード（CARD_EFFECTSに.arrival/.arrivalOptions/.handEffectの
//   いずれかを持つカード）だけを自動処理の対象にし、それ以外は今まで通り自己申告のまま。
//   全33種類のカードは既にCARD_EFFECTSにデータを持っている（docs/cards.mdの
//   「収録状況」参照、続き55で確認済み）。
//
// 手札効果（■）の自動処理も既に対応済み（下のrunHandEffect/canUseHandEffect参照。
// main.js側のドラッグ/クリックでの発動トリガーはhasHandEffectData/canUseHandEffectを
// 見て判定している）——このコメントは初期の設計試作時点（構造化データがパイロット5枚
// しかなく、手札効果はまだ未着手だった頃）のもので、その後の実装で古くなっていた。
//
// このモジュール自身はDOM操作を一切行わない（main.jsから、実際に駒・カードを動かす
// 関数とプレイヤーに選ばせる関数を`helpers`として渡してもらう、他の箇所と同じ
// 「呼び出し元に注入してもらう」設計）。

import { getState } from "./state.js";
import { VERBS, TARGETS, TARGET_SELECTIONS, CARD_EFFECTS, optionLabel } from "./card-effects.js";
import { getCardDefinition } from "./cards-data.js";
import { getCardName } from "./card-text.js"; // UI英語化フェーズ11: 表示用のカード名
import { wealthSatisfies, wealthNeedsDeclaration, wealthCountFor, formatWealth, describeWealthRequirement } from "./wealth.js"; // 1st EDITION の【財力】
import { t } from "./ui-text.js";

// 表示用のカード名（英語のカードテキストがあればそれ、無ければ日本語の原名）。
function cardDisplayName(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}
import { COLORS, SEAT_TO_SIDE, SIDE_TO_SEAT, GATE_POSITIONS, SEAT_ORDER, rotateSeatsFrom } from "./board-layout.js";
import { logAction } from "./action-log.js";
// 桃のキューブ セレナーデ専用（LOCK_ONE_HAND_CARD_EXCEPT_FINAL）:「最後のロックは
// できない」の判定に、victory.jsの既存の「最後のロック承認」機能用の関数
// （main.jsの通常ドロップ処理でも使っている）をそのまま流用する。victory.jsは
// card-effect-engine.jsを（直接にも間接にも）importしていないため循環参照の
// 心配はない。
import { wouldCompleteLockWithNewIndex, getLockedCardCount } from "./victory.js";

// ユーザー確認済み「効果自動処理は基本設定でON/OFFを選べるように」。他の「アニメーションを
// 減らす」設定（motion-prefs.js）と同じくセッション限りの設定（ページ再読み込みで
// デフォルトに戻る）。まだ試験運用中の機能のため、アカウントへの永続化はしない。
// ユーザー要望（続き63）によりデフォルトをONに変更（以前はOFF）。
let autoProcessingEnabled = true;

// 無意味なループ防止（#49）で人間が「同じマスへ戻れる」上限回数。ジャンプ台の連鎖で、周囲が
// 全部ジャンプ台のときに起点へ何度か戻る等の正当な繰り返しを許すため（ユーザー要望2026-08-15、
// 安全率込みで10回）。真の無限ループはこの上限で必ず止まる。CPUは1回に固定（runAction参照）。
const HUMAN_MOVE_REVISIT_LIMIT = 10;

// 試練の儀式（RITUAL_PLACE_MOVE_REPEAT）の再入ガード（不具合#46）。オンラインで到達効果が二重に
// 発火する（同じカードの arrival が depth1/depth2 で連続して起きる）と、儀式が二重に走って色宣言
// モーダルが重なり「選択しても閉じない」等の異常になっていた。儀式は同時に2つ走ることは無いので、
// 既に処理中なら2つ目は即座に何もしないで抜ける。
let ritualPlaceMoveInProgress = false;
export function isAutoProcessingEnabled() {
  return autoProcessingEnabled;
}
export function setAutoProcessingEnabled(v) {
  autoProcessingEnabled = !!v;
}

// このカードの到達効果を自動処理してよいか（設定がON、かつ構造化データを持っている）。
// 選べる罠のように`arrival`ではなく`arrivalOptions`（複数選択肢から1つ選ぶ形の
// 到達効果）でデータを持つカードも対象に含める。
export function canAutoProcessArrival(cardId) {
  return autoProcessingEnabled && !!(CARD_EFFECTS[cardId]?.arrival || CARD_EFFECTS[cardId]?.arrivalOptions);
}

// ユーザー確認済み「手品師の技の『いつでも使える』はゲート侵攻処理を含む効果の処理中
// 以外はいつでも使えるという意味」。main.js側がこれを見て、ハンドフェイズ以外でも
// ドラッグでの発動を許可するかどうかを判断する（handEffectOptionsを持つカード
// ＝複数選択肢のあるカードにはこの概念は今のところ無いため対象外）。
export function isHandEffectUsableAnytime(cardId) {
  return !!CARD_EFFECTS[cardId]?.handEffect?.usableAnytime;
}

// --- 手札効果（■）の自動処理 -----------------------------------------------------------
// 「１ターンに１度のみ」等の使用回数制限（黄金の宮殿）は、セッション限りの試験運用の方針
// （アカウントには一切保存しない）に合わせ、このモジュール内のメモリだけで追跡する。
// キーは`${cardId}:${player}`、値は{turnNumber, count}（state.jsのturnNumberが変われば
// 新しいターンとみなしリセットする——NEXT_TURNのたびに+1されるだけの単純増加値のため、
// 「前回記録した時のturnNumberと今のturnNumberが違う」で「ターンが変わった」を判定できる）。
const handEffectUsage = new Map();
function usageKey(cardId, player) {
  return `${cardId}:${player}`;
}
function usageCountThisTurn(cardId, player) {
  const entry = handEffectUsage.get(usageKey(cardId, player));
  if (!entry || entry.turnNumber !== getState().turnNumber) return 0;
  return entry.count;
}
function isUnderUsageLimit(usageLimit, cardId, player) {
  if (!usageLimit) return true;
  if (usageLimit.per !== "turn") return true; // 今回のパイロットは"turn"のみ対応
  return usageCountThisTurn(cardId, player) < usageLimit.count;
}
function recordHandEffectUsage(cardId, player) {
  handEffectSerial++; // 0th拡張（平和への願い）: 「誰も手札効果を使っていない」の判定に使う
  handEffectUsage.set(usageKey(cardId, player), { turnNumber: getState().turnNumber, count: usageCountThisTurn(cardId, player) + 1 });
}

// 赤のキューブ フェニックス（first-red）無限ループ防止（不具合#72）。
// カード注記: 「複数回使用は可、意味のないループ行為は禁止」。ping-pong無限ループの本質は
// 「first-redの追色コストで捨てたカードを、次のfirst-redで second-from-top として拾い直す」
// こと（例: なないろの欠片1と2を交互に捨て⇄回収）。そこで「そのターンに first-red の追色
// コストとして捨てた cardId は、同じターンの first-red では拾い直せない」ようにする——これで
// 2枚をぐるぐる回すループだけを止め、別の（コストにしていない）カードを拾う正当な複数回使用は
// 一切妨げない。捨て場はトークンIDを保持しない（捨てると cardId で積まれ、引くと新トークンに
// なる）ため、tokenIdではなく cardId で追跡する。turnNumberで自動失効（handEffectUsageと同じ方式）。
let phoenixCostTurnNumber = -1;
const phoenixCostCardIds = new Set();
function notePhoenixCostCard(cardId) {
  const turn = getState().turnNumber;
  if (phoenixCostTurnNumber !== turn) {
    phoenixCostTurnNumber = turn;
    phoenixCostCardIds.clear();
  }
  phoenixCostCardIds.add(cardId);
}
function isPhoenixCostCardThisTurn(cardId) {
  return phoenixCostTurnNumber === getState().turnNumber && phoenixCostCardIds.has(cardId);
}

// 禁断の果実 マルメゴ専用（PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD）:
// 「それらの手札効果はこのターン使うことができない。」を、handEffectUsageと同じ
// 「turnNumberが一致する間だけ有効」という自動失効パターンで実現する（このカード
// 固有のtokenId単位のため、cardId+player単位のhandEffectUsageとは別のMapにする）。
const handEffectDisabledUntilTurn = new Map(); // tokenId -> turnNumber
function disableHandEffectForTurn(tokenId) {
  handEffectDisabledUntilTurn.set(tokenId, getState().turnNumber);
}
function isHandEffectDisabledThisTurn(tokenId) {
  return handEffectDisabledUntilTurn.get(tokenId) === getState().turnNumber;
}

// 0th拡張（ヴィヴィアン）専用: 「その相手が到達したカードを自分の手札に加えるなら、
// 代わりにそのカードをあなたの手札に加える。」
// 🔴 到達効果の**既定動作（処理後にこのカード自身を手札に加える）の宛先だけ**を付け替える。
//   効果の中で手札に入れる動詞は付け替えない（カードの文は「到達したカード」の話なので）。
let arrivalHandRedirect = null; // { from, to }
function redirectArrivalHandTarget(player) {
  return arrivalHandRedirect && arrivalHandRedirect.from === player ? arrivalHandRedirect.to : player;
}

// 0th拡張（やり直しのカギ）専用: 「その相手はこのターンにロックできない。」
// ⚠ 既にある「このターン移動できない」「このターン接触できない」と同じ、turnNumber 一致の
//   自動失効パターン。ロックの可否は phase-automation の isCardLockable が見る。
const lockDisabledUntilTurn = new Map(); // player -> turnNumber
function disableLockForTurn(player) {
  lockDisabledUntilTurn.set(player, getState().turnNumber);
}
export function isLockDisabledThisTurn(player) {
  return lockDisabledUntilTurn.get(player) === getState().turnNumber;
}

// 0th拡張（やり直しのカギ）専用: 「相手がロックを宣言した時」の窓。
// 🔴 ふだんの割り込みモーダルは**ロック宣言・移動宣言・接触・到達の後**に共通で出るので、
//   「どの宣言で開いた窓か」を覚えておかないと、ロックと関係ない場面でも使えてしまう。
//   main.js の fireAnytimeCheckpoint が種類を渡し、窓が閉じる時に clearInterruptWindow する。
// ⚠ tokenId（ロックしようとしている札）は 1st EDITION の裏貴族の賄賂が使う
//   （「相手がロックしようとしたカードをあなたの手札に加える」）。渡されなければ null。
let interruptWindow = null; // { kind, player, tokenId }
export function noteInterruptWindow(kind, player, tokenId = null) {
  interruptWindow = kind ? { kind, player, tokenId: tokenId ?? null } : null;
}
export function clearInterruptWindow() {
  interruptWindow = null;
}
// 行動ログ用（#527・#529）。「いまどの宣言の窓が開いているか」を残すためだけのもの。
export function getInterruptWindowKind() {
  return interruptWindow ? interruptWindow.kind : null;
}
function getLockDeclarerInWindow(viewer) {
  if (!interruptWindow || interruptWindow.kind !== "lock-declare") return null;
  if (!interruptWindow.player || interruptWindow.player === viewer) return null; // 「相手が」
  return interruptWindow.player;
}
// 裏貴族の賄賂（1st）専用: いま相手がロックしようとしている札そのもの。
// ⚠ 窓が「ロック宣言」でない／自分の宣言／札が分からない時は null（＝この効果は使えない）。
function getLockDeclaredTokenInWindow(viewer) {
  if (!getLockDeclarerInWindow(viewer)) return null;
  const id = interruptWindow?.tokenId;
  if (!id) return null;
  return getState().tokens.find((tk) => tk.id === id) ?? null;
}

// 0th拡張（平和への願い）専用: 「次のあなたのターンの開始時、…その間に誰も手札効果を
// 使っていないなら…」。
// 🔴 「誰も手札効果を使っていない」を数えるため、手札効果の使用に**通し番号**を振る
//   （誰が何を使ったかは要らない。番号が変わったかどうかだけ見れば足りる）。
// ⚠ これもクライアントのローカルな記録（state には入れない＝続き653 と同じ理由）。
//   記録が消えたら「札が盤面に残るだけ」＝安全側に倒れる。
let handEffectSerial = 0;
const peaceWishPending = new Map(); // cardTokenId -> { player, turnNumber, serial }
export function registerPeaceWish(cardTokenId, player) {
  if (!cardTokenId) return;
  peaceWishPending.set(cardTokenId, { player, turnNumber: getState().turnNumber, serial: handEffectSerial });
}
// そのプレイヤーの「次のターンの開始時」に解決するぶんを取り出す（取り出したら消える）。
export function takePeaceWishesToResolve(player, turnNumber) {
  const out = [];
  for (const [id, info] of [...peaceWishPending.entries()]) {
    if (info.player !== player) continue;
    if (!(turnNumber > info.turnNumber)) continue; // 置いたのと同じターンでは判定しない
    peaceWishPending.delete(id);
    out.push({ cardTokenId: id, player: info.player, turnNumber: info.turnNumber, serial: info.serial });
  }
  return out;
}
// 条件を満たしているか（駒がその札の上にいて、間に誰も手札効果を使っていない）。
export function isPeaceWishConditionMet(info) {
  if (!info) return false;
  if (handEffectSerial !== info.serial) return false; // 誰かが手札効果を使った
  const token = getState().tokens.find((tk) => tk.id === info.cardTokenId);
  if (!token || token.location.zone !== "cell") return false;
  const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === info.player);
  if (!piece || piece.location.zone !== "cell") return false;
  if (piece.location.row !== token.location.row || piece.location.col !== token.location.col) return false;
  // 「これの上にいて」＝その札がそのマスの一番上（１番上の原則）。
  return findTopCardAtCell(token.location.row, token.location.col)?.id === token.id;
}

// 0th拡張（リーチキャンセル・ゲートチャージ）専用: 「移動前のマス」。
// 🔴 **駒が動く所を1つずつ呼び出すのではなく、render() のたびに位置を見比べる**。
//   駒を動かす経路は、ムーブフェイズ・ドラッグ・接触の強制移動・カード効果・オンラインの
//   再現（remote-move-animator）と**5つ以上ある**ので、1つずつ足すと必ずどれかを忘れて
//   「ある時だけ効かない」になる（続き653 でオープンの経路を3つ数えた時と同じ形）。
//   見比べる形なら、どの経路で動いても必ず拾える。
// ⓘ 使う側（到達効果）は移動の直後に走り、render() は移動と到達の**間に必ず1回**走る
//   （performPhaseMoveToCell は render() を呼んでから triggerCardArrival する）。
// ⚠ 限界: 1つの効果の中で render() を挟まずに2回以上動いた場合、覚えているのは
//   **その連なりの最初の出発マス**になる。到達効果は1回の移動の直後に走るので実害は無い。
// ⚠ state には入れない（サーバー側のリデューサーにも同じものが要る＝続き653 と同じ理由）。
const pieceLastCell = new Map(); // pieceTokenId -> "row,col"
const movedFromByPlayer = new Map(); // player -> { row, col }
export function notePieceLocationsForMovedFrom() {
  for (const tk of getState().tokens) {
    if (tk.kind !== "piece" || tk.location?.zone !== "cell") continue;
    const now = tk.location.row + "," + tk.location.col;
    const before = pieceLastCell.get(tk.id);
    if (before !== undefined && before !== now) {
      const [row, col] = before.split(",").map(Number);
      movedFromByPlayer.set(tk.player, { row, col });
    }
    pieceLastCell.set(tk.id, now);
  }
}
function getMovedFromCell(player) {
  const cell = movedFromByPlayer.get(player);
  return cell ? { zone: "cell", row: cell.row, col: cell.col } : null;
}

// 0th拡張（バスストップ）専用: 「このターンにこれがオープンされたのなら」。
// handEffectDisabledUntilTurn と同じ「turnNumber が一致する間だけ有効」の自動失効パターン。
// 🔴 **これは、その操作をしたクライアントのローカルな記録**（state には入れない）。
//   到達効果は「その席を動かしているクライアント」だけが処理する（shouldAutoProcess）ので、
//   オープンしたのも同じクライアント＝記録は揃う。他の人の画面には記録が無いが、
//   そちらは効果を処理しないので食い違わない。state に入れるとサーバー（Edge Function）側の
//   リデューサーにも同じ処理が要り、再デプロイ待ちの間だけ消える、という面倒が増える。
// ⚠ 記録が無い時は「オープンされていない」と見なす＝**効果が出ないだけ**（安全側）。
const cardOpenedUntilTurn = new Map(); // tokenId -> turnNumber
// 0th拡張（我忘れの白き龍の【色者】）: カードの向き。
// 🔴 「カードの向きは、オープンした、または場に表向きで置いたプレイヤーから見て正の方向と
//   する」（カードの補足）。移動先表示（絵の右下の円盤）はこの向きを基準に読むので、
//   誰が表向きにしたのかを覚えておかないと向きが決まらない。
// ⚠ 記録する席は**その時の手番プレイヤー**。オープンするのも表向きで置くのも手番の人
//   なので、これで足りる（ここを呼ぶ3か所とも手番中の操作）。
const cardOrientationSeat = new Map(); // tokenId -> seat
export function getCardOrientationSeat(tokenId) {
  return cardOrientationSeat.get(tokenId) ?? null;
}
export function noteCardOpenedThisTurn(tokenId) {
  if (!tokenId) return;
  cardOpenedUntilTurn.set(tokenId, getState().turnNumber);
  const seat = getState().turnPlayer;
  if (seat) cardOrientationSeat.set(tokenId, seat);
}
function wasCardOpenedThisTurn(tokenId) {
  return !!tokenId && cardOpenedUntilTurn.get(tokenId) === getState().turnNumber;
}

// 紫のキューブ ディメンション専用（ANNOUNCE_MOVEMENT_BOOST_THIS_TURN）: 「このターンの
// 通常の移動は２マス先に一気に移動する。」ユーザー指摘「効果文中の『通常の移動』とは
// ムーブフェイズで通常行う移動のこと」の通り、自動処理モードのムーブフェイズが計算する
// 移動候補（phase-automation.jsのreconcileMovePhase）自体を、このターンの間だけ
// count:1→2・atOnce:trueに切り替える必要がある。handEffectDisabledUntilTurnと同じ
// 「turnNumberが一致する間だけ有効」の自動失効パターン。
const movementBoostUntilTurn = new Map(); // player -> turnNumber
function activateMovementBoostForTurn(player) {
  movementBoostUntilTurn.set(player, getState().turnNumber);
}
export function isMovementBoostActiveThisTurn(player) {
  return movementBoostUntilTurn.get(player) === getState().turnNumber;
}

// 1st EDITION（貧民の行進の手札効果）専用: 「このターン通常の移動では…移動先のカードは
// オープンしない。」移動の範囲を伸ばす上の仕組みと**対**で使う（同じ自動失効パターン）。
// 🔴 掛かるのは「通常の移動」＝ムーブフェイズの移動だけ。接触の強制移動や、カード効果での
//   移動には掛けない（印字が「通常の移動では」と限定しているため）。見るのは main.js の
//   ムーブフェイズの2経路（タップ＝performPhaseMoveToCell／ドラッグ＝maybeTriggerCardArrival）。
const moveOpenSuppressedUntilTurn = new Map(); // player -> turnNumber
function suppressMoveOpenForTurn(player) {
  moveOpenSuppressedUntilTurn.set(player, getState().turnNumber);
}
export function isMoveOpenSuppressedThisTurn(player) {
  return moveOpenSuppressedUntilTurn.get(player) === getState().turnNumber;
}

// 禁断の果実 マルメゴ専用（PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD）: 公開ドローの
// 中に橙があった時の「あなたはこのターン移動できない。」を実際に強制する（不具合#57: 以前は
// 案内するだけで、その後のムーブフェイズで移動できてしまっていた）。他の「このターン○○
// できない」系（eternal-pinkの接触できない等）は自己申告のままだが、マルメゴの移動禁止は
// ムーブフェイズのハイライト（phase-automation.js reconcileMovePhase）と、人間の手動移動
// （main.jsのドラッグ/タップ移動の確定）で実際に弾く。movementBoostUntilTurnと同じ
// 「turnNumberが一致する間だけ有効」の自動失効パターン。移動禁止は移動だけが対象で、接触は
// 禁止しない（効果文はあくまで「移動できない」であり接触には触れていないため）。
const movementDisabledUntilTurn = new Map(); // player -> turnNumber
function disableMovementForTurn(player) {
  movementDisabledUntilTurn.set(player, getState().turnNumber);
}
export function isMovementDisabledThisTurn(player) {
  return movementDisabledUntilTurn.get(player) === getState().turnNumber;
}

// 結ばれの一本桜 コノハナサクヤ専用（#228: ユーザー報告「コノハナサクヤで呼び寄せた相手に
// 接触できちゃった」）: カード文の「このターンあなたは接触できない。」を実際に強制する。
// 以前は案内モーダルで知らせるだけの自己申告だった（Phase 1の「ルール適用はしない」方針の
// 名残）。マルメゴの移動禁止(movementDisabledUntilTurn)と同じ「turnNumberが一致する間だけ
// 有効」の自動失効パターンで、main.js の接触の入口（人間のドラッグ/タップ・CPUの判断）で弾く。
const contactDisabledUntilTurn = new Map(); // player -> turnNumber
function disableContactForTurn(player) {
  contactDisabledUntilTurn.set(player, getState().turnNumber);
}
export function isContactDisabledThisTurn(player) {
  return contactDisabledUntilTurn.get(player) === getState().turnNumber;
}

// テスト中に発覚したバグの修正: resetGame()するとstate.jsのturnNumberは1から再スタートする
// ため、前のゲームで既に「turnNumber:1で1回使用済み」と記録されていたカードが、新しい
// ゲームのturnNumber:1でも誤って「もう使った」扱いになってしまっていた（handEffectUsageは
// このモジュールのメモリに残り続け、resetGame()では一切クリアされないため）。ゲームを
// リセットする箇所（game-setup.js）から呼んでもらう。他のturnNumber基準の自動失効Map
// （handEffectDisabledUntilTurn・movementBoostUntilTurn）も同じ理由でここで一緒に
// クリアする。
export function resetHandEffectUsage() {
  handEffectUsage.clear();
  cardOpenedUntilTurn.clear(); // 0th拡張（バスストップ）: ケース間に漏らさない
  cardOrientationSeat.clear(); // 0th拡張（色者のカードの向き）: ケース間に漏らさない
  pieceLastCell.clear(); // 0th拡張（移動前のマス）: ケース間に漏らさない
  movedFromByPlayer.clear();
  lockDisabledUntilTurn.clear(); // 0th拡張（やり直しのカギ）: ケース間に漏らさない
  interruptWindow = null;
  arrivalHandRedirect = null;
  peaceWishPending.clear(); // 0th拡張（平和への願い）: ケース間に漏らさない
  handEffectSerial = 0;
  handEffectDisabledUntilTurn.clear();
  movementDisabledUntilTurn.clear();
  contactDisabledUntilTurn.clear();
  movementBoostUntilTurn.clear();
  moveOpenSuppressedUntilTurn.clear(); // 1st EDITION（貧民の行進）: ケース間に漏らさない
  wealthBonusForAllUntilTurn = null; // 1st EDITION（全員の財力＋1）: 対局・ケース間に漏らさない
}

// ───────────────────── 1st EDITION の【状況】カード ─────────────────────
// 🔴 5種（治安悪化・フェスティバル・建設バブル・経済成長・デプレッション＝**30枚**）の共通の形。
//   到達すると「このカードを場の中央に表向きで置く」だけで、本体の効果は
//   **そこに在る限り、全員のターン開始時に効き続ける**（印字の【状況】の行）。
// ⚠ **効くのは場の中央の１番上の表向きのカード1枚だけ**、と読んだ。物理的に、新しい状況札を
//   中央へ置けば前の札はその下に隠れて読めなくなるため（１番上の原則と同じ考え方）。
//   ⚠ ここはルールの読みなのでユーザー判断待ち。変えるならこの関数1つを直せばよい。
export const BOARD_CENTER = { zone: "cell", row: 3, col: 3 };
export function getActiveSituationCardId() {
  const top = findTopCardAtCell(BOARD_CENTER.row, BOARD_CENTER.col);
  if (!top || !top.faceUp) return null;
  return CARD_EFFECTS[top.cardId]?.situation ? top.cardId : null;
}
// その状況札が、いまその人のターン開始時に効くか（財力の条件を見る）。
export function situationAppliesTo(cardId, player) {
  const def = CARD_EFFECTS[cardId]?.situation;
  if (!def) return false;
  return meetsWealth(def.wealth, player);
}
// 🔴 その人が「財力の宣言しだいで効くかどうかが変わる」か（＝本人に聞く必要があるか）。
//   ユーザー指摘「あえて罰を受けたいときも出てきます」のとおり、罰の効果でも
//   「本人は宣言しないはず」と決め打ちしない。
export function situationNeedsWealthDeclaration(cardId, player) {
  const def = CARD_EFFECTS[cardId]?.situation;
  if (!def?.wealth) return false;
  return wealthNeedsDeclaration(def.wealth, getWealth(player));
}
// ターン開始時にその人へ状況札の効果を走らせる。呼ぶのは main.js の1か所だけ
// （ターンが切り替わった瞬間を見ている subscribe ＝平和への願いと同じ所）。
export async function runSituationEffect(cardId, player, helpers) {
  const def = CARD_EFFECTS[cardId]?.situation;
  if (!def) return false;
  const token = getState().tokens.find(
    (tk) => tk.kind === "card" && tk.cardId === cardId && tk.location.zone === "cell"
  );
  const runCtx = {
    player,
    cardId,
    cardTokenId: token?.id ?? null,
    pieceTokenId: getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player)?.id ?? null,
    pieceLocation: getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player)?.location ?? null,
    selections: {},
    arrivedAt: null,
  };
  // 「以下の効果のうち１つ得る」形（治安悪化）は選択肢で持つ。選ぶのは**その本人**。
  if (def.options) {
    const usable = def.options.filter((opt) => isArrivalOptionUsable(player, runCtx.pieceLocation, opt, cardId));
    if (usable.length === 0) return false;
    // 🔴【#552 / #553・2026-11-11】**選択肢には必ず usable の印を付けて渡す。**
    //   ピッカー（showHandEffectOptionPicker）は `if (!option.usable)` でボタンを無効にするので、
    //   印の無い選択肢は**全部グレーアウトする**。しかもこのモーダルは✕も覆いのキャンセルも
    //   無い（カード効果はキャンセルできないので意図的）ため、**そのターンが完全に詰む**
    //   ——ユーザー報告「治安悪化の選択項目が２つともグレーアウトしてどちらも選べない」はこれ。
    //   ⚠ 到達効果の側（runArrivalOptionsEffect）と**同じ形**にそろえた＝選べないものも
    //     灰色で見せる（なぜ選べないのかが分かる）。**片方だけ別の渡し方をしない。**
    const optionsWithUsability = def.options.map((opt) => ({ ...opt, usable: usable.includes(opt) }));
    const chosen = usable.length === 1 ? usable[0] : await helpers.pickArrivalOption?.(cardId, optionsWithUsability, player);
    const opt = chosen ?? usable[0];
    let 何かした = false;
    for (const action of opt.actions) {
      if (await runActionSafely(action, runCtx, helpers)) 何かした = true;
    }
    return 何かした;
  }
  let 何かした = false;
  for (const action of def.actions ?? []) {
    if (await runActionSafely(action, runCtx, helpers)) 何かした = true;
  }
  return 何かした;
}

// 「追色」コスト（同色の別カードを手札から捨てる）で実際に捨てられる候補。cardTokenIdは
// 効果を使おうとしている本人のカード自身（同じ色でも自分自身は対象外）。
// ユーザー指摘＋docs/cards.mdの「なないろの欠片」記載（「★ これはすべての色であり、
// ロックフェイズではロックできない。」）確認: なないろの欠片は「すべての色」を兼ねる
// ため、追色コストとしてはどの色の代わりにも使える。
// main.jsのゴメンナサイ最後のロック割り込み（続き64）が、追色コスト候補の算出に
// そのまま再利用する。
// #169b（ユーザー報告）: 手札公開エリア(publicDraw)のカードもルール上は「手札」
// （getHandTokensの定義、続き55）。以前は zone === "hand" だけを見ていたため、公開ドロー中の
// 同色カードを追色コストに使えず、マスチェンジ等の手札効果が「コストを払えない」扱いで
// 使えなかった。getHandTokensと同じ範囲（hand + publicDraw）に揃える。
export function findSameColorDiscardCandidates(cardTokenId, color, player) {
  return getState().tokens.filter((t) => {
    if (t.kind !== "card" || t.location.player !== player || t.id === cardTokenId) return false;
    if (t.location.zone !== "hand" && t.location.zone !== "publicDraw") return false;
    if (t.cardId === "rainbow-shard") return true;
    return getCardDefinition(t.cardId)?.color === color;
  });
}

// 手札効果データを「選択肢の配列」に正規化する。単一handEffectのカード（今までの
// 大半）は1件だけの配列として扱い（id:"default"）、handEffectOptionsを持つカード
// （なないろの欠片等、複数選択肢を持つ手札効果）はそのまま返す。呼び出し元（main.js）が
// 「選択肢が1つならモーダル無しでそのまま実行、2つ以上なら選ばせる」を共通の形で
// 書けるようにするための正規化。
export function getHandEffectOptions(cardId) {
  const def = CARD_EFFECTS[cardId];
  if (!def) return [];
  if (def.handEffectOptions) return def.handEffectOptions;
  if (def.handEffect) return [{ id: "default", label: null, ...def.handEffect }];
  return [];
}

// 1つの選択肢が今使えるか（設定ON・使用回数制限内・コストを払える・
// requiresPairInHand等の追加条件を満たす、の全てを満たすか）。
// 結ばれの一本桜 コノハナサクヤ（eternal-pink）専用の「善処の原則」判定（ユーザー指摘 2026-09-04)。
// 「相手を選び、あなたの周囲へ移動させる」効果なので、①移動させられる相手の駒が盤面にあり、
// ②自分の周囲8マスに移動先になれるマス（＝カードが置かれていて、駒が乗っていないマス。
// これは『強制移動』ではなく『移動』なのでカードの無いマスは選べない）が1つ以上ある時だけ
// 使える。どちらも無ければコストを払っても何も起きないので、発動宣言自体をできないものとする
// （セレナーデ・マスチェンジ等と同じ扱い）。
function hasKonohanasakuyaTarget(player) {
  if (getAllOpponentPieceCells(player).length === 0) return false;
  const selfPiece = getState().tokens.find((t) => t.kind === "piece" && t.player === player);
  if (!selfPiece || selfPiece.location.zone !== "cell") return false;
  return enumerateSurroundingOffsets()
    .map(({ dr, dc }) => ({ row: selfPiece.location.row + dr, col: selfPiece.location.col + dc }))
    .some(({ row, col }) => inBounds(row, col) && !hasPieceAt(row, col) && findTopCardAtCell(row, col));
}

// 【#566 / #562・2026-11-11】リトルマウスで「奪える相手」がいるか。
//   🔴 **動詞の実装（STEAL_RANDOM_FROM_MOST_LOCKED）とまったく同じ数え方**にそろえる
//     ——別々に書くと「押せるのに何も起きない」「押せないのに起きるはず」が生える。
//   ⚠ 自分は対象にならない（カードの文の literal な読み＝動詞側のコメント参照）。
//   ⚠ 手札が1枚でも奪える（善処の原則・#478 でユーザー確認済み）。0枚の人しかいない時だけ false。
function hasStealableMostLockedTarget(player) {
  const players = getState().activePlayers;
  let 最大 = -1;
  for (const p of players) 最大 = Math.max(最大, countLockedCardsFor(p));
  return players.some((p) => p !== player && countLockedCardsFor(p) === 最大 && getHandTokens(p).length > 0);
}

export function isHandEffectOptionUsable(cardId, cardTokenId, player, option) {
  if (!autoProcessingEnabled) return false;
  if (isHandEffectDisabledThisTurn(cardTokenId)) return false;
  if (!isUnderUsageLimit(option.usageLimit, cardId, player)) return false;
  // 🔴 1st EDITION の【財力】。手札効果は**発動の最初にこのカード自身を捨てる**ので、
  //   捨てた後の枚数で数えたくなるが、**印字は発動前の条件**として書かれている
  //   （リメイクの追色コストと同じ位置＝効果文の頭）。だからここ（＝発動前）で見る。
  //   ⚠ スラム上がりの役人の補足「手札のカウントの際にこのカード自身は含まない」は
  //     **効果の中の数え方**の話で、発動条件の話ではない。
  if (!meetsWealth(option.wealth, player)) return false;
  if (option.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
    const color = getCardDefinition(cardId)?.color;
    const candidates = findSameColorDiscardCandidates(cardTokenId, color, player);
    if (candidates.length < option.cost.count) return false;
  }
  // 【CPU自己対戦が止まる不具合の真因】赤のキューブ フェニックス(first-red)専用。
  // #72で入れたループ防止は「実行時に」止める形（runHandEffectOptionでコストを払う前に
  // returnする）だった。ところが**使えるかどうかの判定(ここ)には同じ条件が無かった**ため、
  // CPUは「使える」と判断して撃つ→#72に止められて何も起きない→次のtickでまた撃つ、を
  // 延々と繰り返し、ハンドフェイズが終わらず**ターンが進まなくなっていた**（#200の対応で
  // ロック中のファースト/エターナルをCPUが使えるようにした直後にCPU自己対戦が停止した原因。
  // フェニックスはファーストカード＝撃っても手元から消えないので、そのまま無限ループになる）。
  // 判定にも同じ条件を入れて、そもそも「今は使えない」と見えるようにする（人間から見ても、
  // 押せてしまうのに断られるより分かりやすい）。
  if (cardId === "first-red" && option.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
    const pile = getState().piles.discard;
    const futureTarget = pile.length >= 1 ? pile[pile.length - 1] : null;
    if (futureTarget && isPhoenixCostCardThisTurn(futureTarget)) return false;
  }
  // ピュアバーガー（0th拡張）専用。裏向きのカードが場に1枚も無ければ、ドロー0枚＝何も
  // 起きないので発動宣言自体ができない（セレナーデ等と同じ扱い）。
  if (option.actions?.some((a) => a.verb === VERBS.DRAW_PER_FACEDOWN_AT_CHOSEN_CELL)) {
    if (getCellsWithAnyFaceDownCard().length === 0) return false;
  }
  // 足下の隠し財産（0th拡張）専用。置く先のマスが無ければ何も起きない。
  // 🔴 ①（到達効果を得る）は「隣以外」・②は「任意のマス」で**条件が違う**。
  if (option.requiresNonAdjacentCellWithCard) {
    const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player);
    if (getCellsWithCardCandidates({ excludeAdjacent: true }, piece?.location ?? null).length === 0) return false;
  }
  if (option.requiresCellWithCard) {
    if (getCellsWithCardCandidates().length === 0) return false;
  }
  // 🔴【#566 / #562】リトルマウス（0th拡張）専用。
  //   この札は「上記の到達効果を得る（奪う）。**あなたのターンに使ったなら**このターンを終了する。」
  //   ⇒ 相手のターンに割り込んだ時は**この札の2文目が条件で外れる**ので、奪えなければ何も起きない。
  //   ⚠ **割り込みで「このターンを終了する」が効かないわけではない**（ユーザー指摘）。条件無しで
  //     「このターンを終了する」と書かれた札なら、相手のターンでも終了する。これはリトルマウス固有。
  //   善処の原則では、何も起きないと分かっている効果は発動宣言そのものができない。
  //   報告「相手の手札が2枚未満なのに割り込みモーダルが出ます」「割り込みができていない」。
  //   ⚠ **自分のターンなら今までどおり使える**（奪えなくてもターンを終える＝起きることがある）。
  if (option.requiresStealTargetUnlessOwnTurn) {
    if (getState().turnPlayer !== player && !hasStealableMostLockedTarget(player)) return false;
  }
  // 不思議な果実（0th拡張）。「あなたの隣の２マス以上にカードが置かれている時に使える。」
  if (Number.isFinite(option.requiresAdjacentCardsAtLeast)) {
    const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player);
    if (countAdjacentCellsWithCard(piece?.location ?? null) < option.requiresAdjacentCardsAtLeast) return false;
  }
  // やり直しのカギ（0th拡張）。「相手がロックを宣言した時に使える。」
  // 🔴 窓が開いていない時は使えない（これが無いと、どの割り込みの場面でも使えてしまう）。
  if (option.requiresOpponentLockDeclaration) {
    if (!getLockDeclarerInWindow(player)) return false;
    // 1st EDITION（裏貴族の賄賂）: どの札をロックしようとしているかまで分かっている時だけ
    //   使える（「相手がロックしようとしたカードをあなたの手札に加える」ため）。
    if (option.requiresLockDeclaredToken && !getLockDeclaredTokenInWindow(player)) return false;
  }
  // リーチキャンセル（0th拡張）。実行は main.js の専用の窓が行うので、ふだんの経路では
  // 使えないままにする（handEffectReactiveOnly と二重の守り）。
  if (option.requiresArrivalEffectWindow) return false;
  // 🔴【#526・2026-11-07】捨て場から取る効果は、捨て場が足りなければ何も起きない。
  //   善処の原則なので**発動宣言そのものができない**のが正しい（報告「捨て場にカードが
  //   ないのにルビナグナをつかえることになっていてた。スキップされなかった」）。
  //   動詞の中にも同じ判定はあるが、あれは**実行時**なので「使ったのに何も起きない」になる。
  if (getState().piles.discard.length < requiredDiscardPileSize(option, cardId)) return false;
  if (option.requiresOtherHandCard) {
    // これ自身は発動時に先に捨てられるので、置けるのは**これ以外の手札**だけ。
    if (getHandTokens(player).filter((tk) => tk.id !== cardTokenId).length === 0) return false;
  }
  // 迷いの森・厳重警戒（0th拡張）専用。置ける先（「あなたの隣以外」「プレイヤーのいない
  // マス」）が1つも無ければ置けないので発動宣言自体ができない（セレナーデ等と同じ扱い）。
  // 🔴 数える条件は PLACE_CARD 側と**同じ関数**を使う（別々に書くとズレる）。
  const 置く先 = option.actions?.find(
    (a) =>
      a.verb === VERBS.PLACE_CARD &&
      a.source === "self" &&
      (a.destination?.excludeAdjacent || a.destination?.excludePieceCells || a.destination?.excludeSurrounding)
  );
  if (置く先) {
    const piece = getState().tokens.find((t) => t.kind === "piece" && t.player === player);
    if (getPlaceCardCellCandidates(置く先.destination, piece?.location ?? null).length === 0) return false;
  }
  // 色寄せの笛（0th拡張）専用。到達効果側（isArrivalOptionUsable）と同じ善処の原則。
  // 🔴 **両方に書く必要がある**——到達と手札で別の関数が判定しているため、片方だけだと
  //   「押せるのに何も起きない」選択肢が出る（続き626 の『仕組みは入れたが効いていない』と同じ形）。
  if (option.requiresFaceUpSameColorOnBoard) {
    if (getFaceUpCellCandidatesOfColor(getCardDefinition(cardId)?.color ?? null).length === 0) return false;
  }
  if (option.requiresFaceDownCardOnBoard) {
    if (getAnyCellWithFaceDownCardCandidates().length === 0) return false;
  }
  if (option.requiresPairInHand) {
    // 手札公開エリア(publicDraw)のカードもルール上「手札」（getHandTokensの定義、続き55）。
    // なないろの欠片の2枚判定でも公開中の欠片を数える（ユーザー指摘2026-08-10）。
    const count = getHandTokens(player).filter((t) => t.cardId === cardId).length;
    if (count < 2) return false;
  }
  // 桃のキューブ セレナーデ専用。ユーザー指摘: 「善処の原則」は発動宣言の時点で
  // 適用される——条件を満たせないと分かっているなら、コストを払う前の発動宣言
  // 自体ができない（コストだけ払わせて実際には何も起きない、という状態を避ける）。
  if (option.requiresLockableCardAvailable) {
    const { tokens } = getLockableHandTokensExceptFinal(player);
    if (tokens.length === 0) return false;
  }
  // スラム上がりの役人専用（続き59）。ユーザー指摘: セレナーデと同じ「善処の原則」の
  // 理屈で、DRAW_IF_HAND_AT_MOST（「あなたの手札が１枚以下なら２枚ドロー」）は、
  // このカード自身を先に捨てた後の残り手札枚数がmaxHandSizeを超えると分かっている
  // 時点で、発動宣言自体ができないはず（このカードを捨てるだけで何も起きない状態を
  // 避ける）。actions配列にDRAW_IF_HAND_AT_MOSTが含まれる場合、実際の検証と同じ
  // getHandTokens()の定義（手札＋公開ドロー、続き55参照）で、このカード自身を
  // 除いた枚数がmaxHandSizeを超えていないか事前に確認する。
  const drawIfAtMost = option.actions?.find((a) => a.verb === VERBS.DRAW_IF_HAND_AT_MOST);
  if (drawIfAtMost) {
    const handCountExcludingSelf = getHandTokens(player).filter((t) => t.id !== cardTokenId).length;
    if (handCountExcludingSelf > drawIfAtMost.maxHandSize) return false;
  }
  // ザ・ギャンブル専用（DISCARD_ONE_HAND_CARD）。手札効果はこのカード自身を先に捨てて
  // から残りのアクションを実行するため（DRAW_IF_HAND_AT_MOSTのコメント参照）、「手札を
  // 1枚捨てる」時点で自分以外に捨てられる手札が1枚も無いと、そこで止まって効果が完結
  // しない。セレナーデ等と同じ善処の原則で、自分以外の手札が無いなら発動宣言自体を
  // できないものとして扱う（ユーザー報告「ザ・ギャンブル1枚だけの時、使えないのに
  // ハンドフェイズがスキップされない」の一因）。
  const discardOne = option.actions?.find((a) => a.verb === VERBS.DISCARD_ONE_HAND_CARD);
  if (discardOne) {
    const otherHandCount = getHandTokens(player).filter((t) => t.id !== cardTokenId).length;
    if (otherHandCount < 1) return false;
  }
  // マスチェンジ専用（SWAP_POSITION）。セレナーデ等と同じ「善処の原則」で、指定マス数
  // 以内（３マス以内）に入れ替えられる相手の駒が1つも無ければ、対象がおらず効果が何も
  // 起きない（SWAP_POSITIONの実装は候補0でfalseを返す）ため、発動宣言自体をできない
  // ものとして扱う＝ハンドフェイズでトーンオフする（ユーザー要望2026-08-09）。
  const swap = option.actions?.find((a) => a.verb === VERBS.SWAP_POSITION);
  if (swap) {
    const selfPiece = getState().tokens.find((t) => t.kind === "piece" && t.player === player);
    if (!selfPiece?.location || getOpponentPieceCellsWithinRange(selfPiece.location, swap.count, player).length === 0) return false;
  }
  // コノハナサクヤ専用（MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF）。上のhasKonohanasakuyaTarget参照。
  if (option.actions?.some((a) => a.verb === VERBS.MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF) && !hasKonohanasakuyaTarget(player)) {
    return false;
  }
  // 黒のキューブ ノワール(first-noir, LOCK_HAND_CARD_INTO_NOIR_SLOT)専用: ノワールの置かれた
  // 色スロットにまだロック札（非placed）が無く、かつ手札にロックできるカードがある時だけ使える。
  // 一度ロックするとスロットが埋まって使えなくなり、そのロック札が除去されて空けば再度使える。
  const lockIntoNoir = option.actions?.find((a) => a.verb === VERBS.LOCK_HAND_CARD_INTO_NOIR_SLOT);
  if (lockIntoNoir) {
    const noir = getState().tokens.find((t) => t.id === cardTokenId);
    if (!noir || noir.location.zone !== "lock") return false;
    const { side, index } = noir.location;
    const alreadyLocked = getState().tokens.some(
      (t) =>
        t.kind === "card" &&
        t.id !== noir.id &&
        t.location.zone === "lock" &&
        t.location.side === side &&
        t.location.index === index &&
        !t.placed
    );
    if (alreadyLocked) return false;
    // #119: ノワールのスロット（＝ある色）にロックできるのは、その色に一致する手札（＋虹）だけ。
    // 一致する手札が1枚も無ければ使えない（善処の原則）。以前は「手札が1枚でもあれば使える」
    // だったため、色違いのカードを色無視でロックできてしまっていた。
    if (!getHandTokens(player).some((t) => cardCanLockIntoColorIndex(t.cardId, index))) return false;
  }
  return true;
}

// 1つの選択肢が「今使えない理由」を日本語で返す（使えるならnull）。isHandEffectOptionUsableと
// 全く同じ順序・同じ条件で判定し、最初に引っかかった理由の説明文を返す。ユーザー報告#52
// 「まだセレナーデを一度も使っていないのに『使用済みの可能性がある』と出て使えない」への対応
// ——実際の不許可理由（追色コスト不足／ロックできる手札が無い／このカードでは勝利になる
// 最後のロックはできない、等）を正確に伝え、誤解を招く定型文を出さないようにするため。
// その手札効果が成り立つために、捨て場に最低何枚必要か。
// 🔴【#526】**カードごとに requires… を書くと必ず書き忘れる**ので、動詞から出す
//   （新しく捨て場を使うカードが増えても自動で効く）。
// ⚠ 発動の最初に**このカード自身を捨てる**カードは、その1枚が積まれてから動詞が走るので
//   1枚ぶん差し引く（赤のはじまりの手札効果がこれ＝捨て場が1枚あれば「２番目」が成立する）。
//   ファースト／エターナルと keepsCardOnUse のカードは自分を捨てないので差し引かない。
function requiredDiscardPileSize(option, cardId) {
  const actions = option?.actions || [];
  let need = 0;
  for (const a of actions) {
    if (a.verb === VERBS.PICKUP_DISCARD_TOP) need = Math.max(need, 1);
    else if (a.verb === VERBS.PICKUP_DISCARD_SECOND_FROM_TOP) need = Math.max(need, 2);
  }
  if (need === 0) return 0;
  // 🔴 **捨て場から取る以外にも起きることがあるなら止めない。**
  //   赤のはじまりの手札効果は「…手札に加える。**このフェイズを終了する。**」なので、
  //   取れなくてもフェイズ終了は起きる＝発動する値打ちがある（既存のテストがこれを固定している）。
  //   ⚠ DISCARD_SELF は「このカードの始末」で、プレイヤーの得にはならないので数えない。
  const 他にも起きる = actions.some(
    (a) =>
      a.verb !== VERBS.PICKUP_DISCARD_TOP &&
      a.verb !== VERBS.PICKUP_DISCARD_SECOND_FROM_TOP &&
      a.verb !== VERBS.DISCARD_SELF
  );
  if (他にも起きる) return 0;
  const 自分も捨てる =
    !option?.keepsCardOnUse && !cardId?.startsWith("eternal-") && !cardId?.startsWith("first-");
  // 🔴 【#582・2026-11-12】**コストで捨てる分も捨て場に積まれてから効果が走る。**
  //   赤のキューブ フェニックスは【追色１】＋「捨て場の２番目」なので、
  //   捨て場が**1枚**あれば、追色で1枚捨てて2枚になり「２番目」が成立する。
  //   ここを数え落としていたため、撃てるはずの場面で発動宣言できなくなっていた
  //   （続き673 で #526 を直した時の見落とし）。⚠ いまコストに使われる動詞は
  //   DISCARD_SAME_COLOR（追色）だけ。別の「捨てる」コストを足す時はここにも足すこと。
  const コストで捨てる = option?.cost?.verb === VERBS.DISCARD_SAME_COLOR ? (option.cost.count || 0) : 0;
  return Math.max(0, need - (自分も捨てる ? 1 : 0) - コストで捨てる);
}

function explainHandEffectOptionUnusable(cardId, cardTokenId, player, option) {
  if (!autoProcessingEnabled) return t("ce.L291");
  if (isHandEffectDisabledThisTurn(cardTokenId)) return t("ce.L292");
  if (!isUnderUsageLimit(option.usageLimit, cardId, player)) return t("ce.L293");
  // 🔴 isHandEffectOptionUsable と**同じ順番・同じ条件**で並べる決まり（この関数の冒頭のコメント）。
  //   ここに書かないと「押せないのに理由が出ない」になる（続き651 で同じ形を踏んだ）。
  if (!meetsWealth(option.wealth, player)) {
    return t("ce.wealthNotMet", { now: formatWealth(getWealth(player)), need: describeWealthRequirement(option.wealth) });
  }
  if (option.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
    const color = getCardDefinition(cardId)?.color;
    const candidates = findSameColorDiscardCandidates(cardTokenId, color, player);
    if (candidates.length < option.cost.count) return t("ce.L297");
  }
  // 色寄せの笛（0th拡張）専用の説明。ここに書かないと「押せないのに理由が出ない」になる。
  if (option.requiresFaceUpSameColorOnBoard) {
    if (getFaceUpCellCandidatesOfColor(getCardDefinition(cardId)?.color ?? null).length === 0) return t("ce.noFaceUpSameColor");
  }
  if (option.requiresFaceDownCardOnBoard) {
    if (getAnyCellWithFaceDownCardCandidates().length === 0) return t("ce.noFaceDownOnBoard");
  }
  // 足下の隠し財産（0th拡張）。ここに書かないと「押せないのに理由が出ない」になる。
  if (option.requiresNonAdjacentCellWithCard) {
    const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player);
    if (getCellsWithCardCandidates({ excludeAdjacent: true }, piece?.location ?? null).length === 0)
      return t("ce.noNonAdjacentCellWithCard");
  }
  if (option.requiresCellWithCard) {
    if (getCellsWithCardCandidates().length === 0) return t("ce.noCellWithCard");
  }
  // 【#566 / #562】ここに書かないと「押せないのに理由が出ない」になる（続き651 の教訓）。
  if (option.requiresStealTargetUnlessOwnTurn) {
    if (getState().turnPlayer !== player && !hasStealableMostLockedTarget(player)) return t("ce.ex0NoStealTarget");
  }
  if (Number.isFinite(option.requiresAdjacentCardsAtLeast)) {
    const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === player);
    if (countAdjacentCellsWithCard(piece?.location ?? null) < option.requiresAdjacentCardsAtLeast)
      return t("ce.ex0NeedAdjacentCards", { n: option.requiresAdjacentCardsAtLeast });
  }
  if (option.requiresOpponentLockDeclaration) {
    if (!getLockDeclarerInWindow(player)) return t("ce.ex0NeedLockDeclaration");
    if (option.requiresLockDeclaredToken && !getLockDeclaredTokenInWindow(player)) return t("ce.ex0NeedLockDeclaration");
  }
  if (option.requiresArrivalEffectWindow) return t("ce.ex0NeedArrivalWindow");
  // 🔴【#526】ここに書かないと「押せないのに理由が出ない」になる（続き651 と同じ形）。
  {
    const 必要 = requiredDiscardPileSize(option, cardId);
    if (必要 > 0 && getState().piles.discard.length < 必要) return t("ce.needDiscardPile", { n: 必要 });
  }
  if (option.requiresOtherHandCard) {
    if (getHandTokens(player).filter((tk) => tk.id !== cardTokenId).length === 0) return t("ce.L317");
  }
  if (option.requiresPairInHand) {
    // publicDrawの同名カードも手札としてカウントする（isHandEffectOptionUsableと同じ）。
    const count = getHandTokens(player).filter((t) => t.cardId === cardId).length;
    if (count < 2) return t("ce.L302");
  }
  if (option.requiresLockableCardAvailable) {
    const { tokens } = getLockableHandTokensExceptFinal(player);
    if (tokens.length === 0)
      return t("ce.L307");
  }
  const drawIfAtMost = option.actions?.find((a) => a.verb === VERBS.DRAW_IF_HAND_AT_MOST);
  if (drawIfAtMost) {
    const handCountExcludingSelf = getHandTokens(player).filter((t) => t.id !== cardTokenId).length;
    if (handCountExcludingSelf > drawIfAtMost.maxHandSize) return t("ce.L312");
  }
  const discardOne = option.actions?.find((a) => a.verb === VERBS.DISCARD_ONE_HAND_CARD);
  if (discardOne) {
    const otherHandCount = getHandTokens(player).filter((t) => t.id !== cardTokenId).length;
    if (otherHandCount < 1) return t("ce.L317");
  }
  const swap = option.actions?.find((a) => a.verb === VERBS.SWAP_POSITION);
  if (swap) {
    const selfPiece = getState().tokens.find((t) => t.kind === "piece" && t.player === player);
    if (!selfPiece?.location || getOpponentPieceCellsWithinRange(selfPiece.location, swap.count, player).length === 0)
      return t("ce.noSwapTarget", { n: swap.count });
  }
  if (option.actions?.some((a) => a.verb === VERBS.MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF) && !hasKonohanasakuyaTarget(player)) {
    return t("ce.noKonohanaTarget");
  }
  return null;
}

// このカードの手札効果が今使えない場合の理由（使えるならnull）。どれか1つでも使える選択肢が
// あればnull（＝使える）。全て使えない時は最初の選択肢の理由を返す（大半のカードは選択肢1つ）。
export function getHandEffectUnusableReason(cardId, cardTokenId, player) {
  const options = getHandEffectOptions(cardId);
  if (options.length === 0) return t("ce.L332");
  if (options.some((opt) => isHandEffectOptionUsable(cardId, cardTokenId, player, opt))) return null;
  return explainHandEffectOptionUnusable(cardId, cardTokenId, player, options[0]);
}

// このカードの手札効果を今使ってよいか（いずれかの選択肢が使えるか）。トリガーUI側
// （main.js）が「使用する」操作を有効にするかどうかの判定にも、Hand Phaseの自動
// スキップ判定にも使う共通関数。
export function canUseHandEffect(cardId, cardTokenId, player) {
  return getHandEffectOptions(cardId).some((opt) => isHandEffectOptionUsable(cardId, cardTokenId, player, opt));
}

// このカードが構造化された手札効果データを持っているか（使用可否は問わない）。
// main.js側の「クリックしたが手札効果自体を持っていないカードなら何もしない」判定用。
export function hasHandEffectData(cardId) {
  return getHandEffectOptions(cardId).length > 0;
}


// ゴメンナサイッ！・カウンターロックのように、手札効果が「あなたへのロック/接触の
// 宣言時に使える」等の反応時専用（Hand Phaseの自己申告では絶対に使えない）カードか。
// これらはhandEffectデータ自体を持たない（別種の実装が必要なため今回は未対応、
// card-effects.js参照）ため、main.js側の「hasHandEffectDataかつcanUseHandEffectが
// false」というトーンダウン判定の対象に自然には乗らない。ユーザー報告「ハンドフェイズで
// 通常はトーンダウンさせるべき」への対応で、この専用フラグだけを見る。
export function isHandEffectReactiveOnly(cardId) {
  return !!CARD_EFFECTS[cardId]?.handEffectReactiveOnly;
}

// コスト（追色）だけを見て払えるかどうか（使用回数制限・自動処理ON/OFFは問わない）。
// ユーザー要望「追色コストになるカードが手札に無い場合はその旨の警告を出す」ための、
// canUseHandEffectより細かい判定（何が原因で使えないかをUI側が案内できるようにする）。
// 選択肢が複数ある場合は、コストだけ見ていずれか1つでも払えればtrue（コスト以外の
// 条件、例えばrequiresPairInHandは問わない——「捨てられる手札が無い」という別種の
// 警告の判定専用のため）。
export function canPayHandEffectCost(cardId, cardTokenId, player) {
  const options = getHandEffectOptions(cardId);
  if (options.length === 0) return true;
  return options.some((opt) => {
    if (opt.cost?.verb !== VERBS.DISCARD_SAME_COLOR) return true;
    const color = getCardDefinition(cardId)?.color;
    return findSameColorDiscardCandidates(cardTokenId, color, player).length >= opt.cost.count;
  });
}

// docs/rulebook.md「ファーストカード/エターナルカード: 他のカードの効果の対象に
// ならない（奪われたり捨てることはできない）」。ロックされていても、選べる罠の
// 「ロックしているカードを1枚捨てる」のような他カードの効果からは常に除外する。
// 0th拡張（我忘れの白き龍）: ★「これは他のカードの効果の対象にならない。」
// ⚠ ファースト/エターナルと同じ扱い（cardId の命名規則では拾えないので名指しで足す）。
const NOT_TARGETABLE_CARD_IDS = new Set(["ex0-white-dragon"]);

function isTargetableByOtherCardEffects(cardId) {
  if (NOT_TARGETABLE_CARD_IDS.has(cardId)) return false;
  return !cardId?.startsWith("eternal-") && !cardId?.startsWith("first-");
}

// ユーザー確認済み設計方針（続き55、ヴァーディアンの手札効果で公開ドローした2枚が
// 選べる罠の「手札を半分捨てる」を選べない現象への対応）: 「ドロー」＝「山札から
// 手札に加える」ため、公開ドロー（publicDrawゾーン、山からの公開ドロー・手札効果
// 使用宣言の駐機のどちらの経由でも）にあるカードも、まだ通常の手札に合流していない
// だけで「あなたの手札」であることに変わりはない（docs/cards.md補足）。ザ・ギャンブル
// のDISCARD_HAND_IF_REVEALED_MATCHES_DECLAREDで先行導入していたこの定義を、手札の
// 枚数を数える／手札をまとめて捨てる系の判定全てに一般化する。「今使える手札効果が
// あるか」（hasUsableHandEffect等）はここでは対象外——公開ドロー中のカードから直接
// 手札効果を発動するUI自体がまだ無い、別スコープの話のため意図的に含めない。
function getHandTokens(player) {
  return getState().tokens.filter(
    (t) => t.kind === "card" && t.location.player === player && (t.location.zone === "hand" || t.location.zone === "publicDraw")
  );
}

// ───────────────────────── 1st EDITION の【財力】 ─────────────────────────
// 財力＝そのプレイヤーの**手札の枚数**（＋修正値）。考え方は src/wealth.js の冒頭に全部書いた。
// 🔴 リメイクの【追色】と違い**何も捨てない**（条件を見るだけ）。
//
// 「全員の財力を１多く計算する」（1st の黄のEカードの手札効果）の持ち越し。
//   そのプレイヤーの次のターンの開始時まで効くので、「いつまで」をターン番号で持つ
//   （既存の handEffectDisabledUntilTurn と同じ形。state には入れない＝
//   入れるとサーバー側のリデューサーにも同じ処理が要る＝続き653・654 と同じ判断）。
let wealthBonusForAllUntilTurn = null; // { turnNumber } | null
export function registerWealthBonusForAll(turnNumber) {
  wealthBonusForAllUntilTurn = { turnNumber };
}
export function clearWealthBonusForAll() {
  wealthBonusForAllUntilTurn = null;
}
function forcedWealthBonus() {
  if (!wealthBonusForAllUntilTurn) return 0;
  // 「次のあなたのターンの開始時まで」＝登録したターンの間だけ効く、として扱う。
  // ⚠ ターン番号が進んだら自然に切れる（自動失効）。読む時に見るだけなので取りこぼしが無い。
  return getState().turnNumber === wealthBonusForAllUntilTurn.turnNumber ? 1 : 0;
}

// そのプレイヤーが「持っている」1st の Eカードの枚数。
// 🔴 **自分のロックエリアにある分だけ**（ユーザー判断 2026-11-06「手札では得られません」）。
//   続き666 では「手札でも持っている」と読んでいたが、それは私の読みで、正しくなかった。
//   ⇒ 手札に持っているだけでは財力の＋1は得られない。ロックして初めて効く。
function countOwnedFirstEdEternals(player) {
  const side = SEAT_TO_SIDE[player];
  return getState().tokens.filter((tk) => {
    if (tk.kind !== "card" || !tk.cardId?.startsWith("eternal-1st-")) return false;
    return tk.location.zone === "lock" && tk.location.side === side;
  }).length;
}

// そのプレイヤーの財力。base＝実際の枚数（＋強制の修正）、bonusMax＝任意で足せる上限。
export function getWealth(player) {
  const base = getHandTokens(player).length + forcedWealthBonus();
  return { base, bonusMax: countOwnedFirstEdEternals(player) };
}

// 財力の条件を満たしているか（条件が無ければ常に true）。
function meetsWealth(cond, player) {
  if (!cond) return true;
  return wealthSatisfies(cond, getWealth(player));
}

// 【財力＝S】の S（枚数・マス数として使う値）。
// 🔴 Eカードを**ロックしていて任意の＋1 ができる状況なら、その都度本人に聞く**
//   （ユーザー判断 2026-11-06）。続き666 では「宣言で起きることの量が変わるので base 固定」
//   としていたが、それは私の判断で、正しくなかった。
//   ⚠ 聞くのは**1つの効果につき1回だけ**（同じ効果の中で2回聞かれると煩わしいので ctx に覚える）。
async function askWealthCount(ctx, helpers) {
  const w = getWealth(ctx.player);
  if (!w.bonusMax) return wealthCountFor(w);
  if (ctx && ctx.__wealthDeclared != null) return ctx.__wealthDeclared;
  const 下 = w.base, 上 = w.base + w.bonusMax;
  const n = await helpers.pickNumber?.(ctx.cardId, 下, 上, t("ce.feWealthDeclare", { base: 下, max: 上 }));
  const 値 = Number.isFinite(n) ? Math.max(下, Math.min(上, n)) : 下;
  if (ctx) ctx.__wealthDeclared = 値;
  return 値;
}

// アクションの「枚数・マス数」を実際の数にする。
// 🔴 データ側に `count: "wealth"`（または maxCount: "wealth"）と書くと、
//   **その場のそのプレイヤーの財力**になる（1st EDITION の【財力＝S】）。
//   ⚠ 文に出す時は card-effects.js の toFullWidthNumber が "S" に直す（印字と同じ形）。
//   ⚠ 財力は本人に聞くことがあるので **await が要る**（"wealth" 以外はその場で返る）。
async function amountOf(action, ctx, helpers, key = "count") {
  const v = action[key];
  return v === "wealth" ? await askWealthCount(ctx, helpers) : v;
}

// 「あなたの財力が１番小さいなら」（1st EDITION・貧しき心）。
// ⚠ **同率も含む**（カウンターロックの isFewestLocked と同じ扱い。補足「１番少なくロック
//   しているとは、ロックしている枚数が１番少ないことである」＝枚数が最小かどうかを見る）。
// ⚠ 比べるのは base（実際の枚数）だけ。任意の＋1は「自分に有利な時だけ宣言する」ものなので、
//   「自分が1番小さい」を狙う時には誰も宣言しない。
function isLowestWealth(player) {
  const list = getState().activePlayers.map((p) => getWealth(p).base);
  if (list.length === 0) return false;
  return getWealth(player).base === Math.min(...list);
}

// 選べる罠専用: arrivalOptionsの1つの選択肢が今選べるか（docs/cards.mdの善処の原則
// 条件を満たすか）。requiresMinHandSize/requiresNotAtOwnGate/requiresHasLockedCardの
// いずれかを満たさなければ選べない（指定の無い条件はチェックしない）。
function isArrivalOptionUsable(player, pieceLocation, option, cardId) {
  // 🔴 1st EDITION の【財力】（条件を満たさない選択肢は選べない＝善処の原則と同じ扱い）。
  if (!meetsWealth(option.wealth, player)) return false;
  // 🔴 到達効果の選択肢に**追色コスト**が付くのは 0th拡張（紅の鉄拳）が最初。
  //   手札効果の側（isHandEffectOptionUsable）には元からあった判定を、こちらにも足す。
  //   これが無いと「払えないのに選べて、払う所で止まる」ことになる。
  if (option.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
    const color = getCardDefinition(cardId)?.color;
    // ⚠ 到達効果のコストは「このカード自身」ではなく**手札から**払う。到達したカードは
    //   まだ盤面に在る（手札に加わるのは効果の後）ので、除外する id は無い。
    if (findSameColorDiscardCandidates(null, color, player).length < option.cost.count) return false;
  }
  // 紅の鉄拳（0th拡張）: 周囲に相手が1人もいなければ接触できない（善処の原則）。
  if (option.requiresOpponentInSurrounding) {
    if (getOpponentPieceCellsInSurrounding(pieceLocation, player).length === 0) return false;
  }
  if (option.requiresMinHandSize != null) {
    const count = getHandTokens(player).length;
    if (count < option.requiresMinHandSize) return false;
  }
  if (option.requiresNotAtOwnGate) {
    const gate = GATE_POSITIONS[SEAT_TO_SIDE[player]];
    if (pieceLocation && pieceLocation.row === gate.row && pieceLocation.col === gate.col) return false;
  }
  // 色寄せの笛（0th拡張）専用。善処の原則: その選択肢で何も起きないと分かっているなら選べない。
  if (option.requiresFaceUpSameColorOnBoard) {
    if (getFaceUpCellCandidatesOfColor(getCardDefinition(cardId)?.color ?? null).length === 0) return false;
  }
  if (option.requiresFaceDownCardOnBoard) {
    if (getAnyCellWithFaceDownCardCandidates().length === 0) return false;
  }
  if (option.requiresHasLockedCard) {
    // ユーザー報告「ファーストカード1枚しかロックしていないのに『ロックしている
    // カードを1枚捨てる』を選べてしまっている」。ファースト/エターナルカードは
    // 他のカードの効果の対象にならないため、それらを除いた「捨てられるロック
    // カード」の有無で判定する。
    const side = SEAT_TO_SIDE[player];
    const hasLocked = getState().tokens.some(
      (t) => t.kind === "card" && t.location.zone === "lock" && t.location.side === side && isTargetableByOtherCardEffects(t.cardId)
    );
    if (!hasLocked) return false;
  }
  return true;
}

// 自分の手札の中に、今すぐ使える手札効果カードが1枚でもあるか（Hand Phaseの自動スキップ
// 判定用）。
export function hasUsableHandEffect(player) {
  return getState().tokens.some(
    (t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === player && canUseHandEffect(t.cardId, t.id, player)
  );
}

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

function inBounds(row, col) {
  return row >= 0 && row <= 6 && col >= 0 && col <= 6;
}

function hasCardAt(row, col) {
  return getState().tokens.some((t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === row && t.location.col === col);
}

function hasPieceAt(row, col) {
  return getState().tokens.some((t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === row && t.location.col === col);
}

// ユーザー指摘「２マス先とは２マス移動できる範囲のことなので斜め隣のマスも対象」。
// atOnce（一気に）の「Nマス先」は、上下左右の単位移動をN回組み合わせて届く範囲全体を指し、
// 直線上のNマス先（4方向）だけでなく、方向を途中で変えた結果届く斜め隣接マスも含む
// （例: N=2なら、直線上の2マス先4方向＋「上に1＋右に1」のような組み合わせで届く
// 斜め隣接4方向＝合計8マス）。数学的には「そのマスからマンハッタン距離がちょうどN」の
// マス全て。N=1の場合はこの式でも従来通り上下左右4マスのみになる（斜めは距離2以上でしか
// 出現しないため）。
function enumerateManhattanRing(count) {
  const offsets = [];
  for (let drAbs = 0; drAbs <= count; drAbs++) {
    const dcAbs = count - drAbs;
    const drs = drAbs === 0 ? [0] : [drAbs, -drAbs];
    const dcs = dcAbs === 0 ? [0] : [dcAbs, -dcAbs];
    for (const dr of drs) {
      for (const dc of dcs) offsets.push({ dr, dc });
    }
  }
  return offsets;
}

// 「周囲」＝駒の周りの縦横斜めの計8マス（docs/rulebook.md の用語定義。#224: コノハナサクヤの
// 「相手をあなたの周囲へ移動する」で、斜めの4マスがハイライトされていなかった）。
// **「隣」（＝前後左右の4マス、試練の儀式の補足に明記）とは別の概念**なので、カード文が
// 「隣」なら enumerateManhattanRing(1)、「周囲」ならこちらを使う。
function enumerateSurroundingOffsets() {
  const offsets = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      offsets.push({ dr, dc });
    }
  }
  return offsets;
}
// moveの候補マスを計算する（純粋関数、DOM不要）。ユーザー指摘を受けdocs/rulebook.mdの
// 「移動」の定義を確認: 「移動」とは自分の駒を、現在のマスから"カードの置かれた"別のマスに
// 置くこと（カードの無いマスにも置けるのは「強制移動」という別の用語で、ジャンプ台の
// 効果文にその語は出てこない）。またルール上、駒は物理的に1マスに1つまでなので、既に
// 駒がいるマスへは移動できない。atOnce（一気に）が唯一免除するのは「1マス目（＝経路の
// 途中のマス）のカード・駒の有無」（rulebook.md 289行目補足）であり、最終的な移動先
// （このコードが計算する候補そのもの）には適用されない。そのため、移動先が「カードあり・
// 駒なし」であることは、atOnceの有無に関わらず常に課す（旧実装はatOnce時にこの判定自体を
// 丸ごとスキップしており、駒のいるマスや空きマスまで候補に出てしまうバグだった）。
export function getMoveCandidates(fromLocation, count, atOnce) {
  const candidates = [];
  const offsets = atOnce
    ? enumerateManhattanRing(count)
    : DIRECTIONS.map(({ dr, dc }) => ({ dr: dr * count, dc: dc * count }));
  for (const { dr, dc } of offsets) {
    const row = fromLocation.row + dr;
    const col = fromLocation.col + dc;
    if (!inBounds(row, col)) continue;
    if (!hasCardAt(row, col) || hasPieceAt(row, col)) continue;
    candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// 「任意の1マス」（カードがあるマスに限る、1マスの1枚を対象にする効果向け）の候補一覧。
export function getAnyCellWithCardCandidates() {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      if (hasCardAt(row, col)) candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

// 「任意のNマス」（カードの有無を問わない、山札から置く先を選ばせる効果向け）の候補一覧。
function getAllCellCandidates() {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// enumerateManhattanRing（ちょうど距離N）を0からNまで積み重ねた「N マス以内」
// （自分のいるマスも含む、距離0〜N全て）の候補。「２マス以内」等の効果文の実際の判定範囲
// （docs/cards.md「仮にNマス移動する場合に移動できる範囲」）に対応する。
function enumerateManhattanDisk(maxCount) {
  const offsets = [];
  for (let d = 0; d <= maxCount; d++) offsets.push(...enumerateManhattanRing(d));
  return offsets;
}

// 「Nマス以内のカードがあるマス」の候補（橙のキューブ ハーベスト等）。
function getCellsWithCardWithinRange(fromLocation, range) {
  const candidates = [];
  for (const { dr, dc } of enumerateManhattanDisk(range)) {
    const row = fromLocation.row + dr;
    const col = fromLocation.col + dc;
    if (!inBounds(row, col)) continue;
    if (!hasCardAt(row, col)) continue;
    candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// 指定マスに重なっているカードのうち一番上（１番上の原則、main.jsのfindTopCardAtと
// 同じ「トークン配列の末尾＝一番最後に動かされた＝一番上」という考え方）のトークンを
// 返す。無ければnull。PICKUP_TO_HANDの過去のバグ（Array#findで一番下を拾っていた）と
// 同じ間違いを繰り返さないよう、盤面マスの特定カードを1枚だけ取り出す箇所は必ずこれを使う。
function findTopCardAtCell(row, col) {
  const stack = getState().tokens.filter((t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === row && t.location.col === col);
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

// 指定マスにいる駒（あれば）を返す。getAllOpponentPieceCells/pickLocationで選ばれた
// マスから、実際にどのプレイヤーの駒かを引き直すのに使う。
function findPieceAtCell(row, col) {
  return getState().tokens.find((t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === row && t.location.col === col) ?? null;
}

// 「Nマス以内の、一番上が裏向きのカードがあるマス」の候補（黄のキューブ サフラン専用）。
function getCellsWithFaceDownCardWithinRange(fromLocation, range) {
  const candidates = [];
  for (const { dr, dc } of enumerateManhattanDisk(range)) {
    const row = fromLocation.row + dr;
    const col = fromLocation.col + dc;
    if (!inBounds(row, col)) continue;
    const top = findTopCardAtCell(row, col);
    if (top && !top.faceUp) candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// 「場（49マス）のうち、一番上が裏向きのカードがあるマス」の候補（色寄せの笛専用）。
// getCellsWithFaceDownCardWithinRange の範囲なし版。「場」はルール上**7×7の49マスだけ**
// （ロックエリアは含まない＝アプリ内ヘルプの用語集「場」の定義）。
function getAnyCellWithFaceDownCardCandidates() {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      const top = findTopCardAtCell(row, col);
      if (top && !top.faceUp) candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

// 「置ける空きマス」の候補（大地創造・迷いの森）。
// 🔴 **カードの文で2種類ある**ので取り違えない:
//   ・「何もないマス」    … カードも駒も無い（用語集の定義）＝ requireNoPiece: true
//   ・「カードの置かれていないマス」… カードが無いだけ。**駒はいてもよい**＝ requireNoPiece: false
// PLACE_CARD（destination.selection: CHOOSE）の置き先の候補。
// 🔴 **PLACE_CARD の本体と、手札効果が使えるかの判定（善処の原則）の両方から呼ぶ。**
//   同じ条件を2か所に書くと必ずズレて「押せるのに置けない／押せないのに置ける」になる。
//   ・excludeGates       … ゲート以外（ジャンプ台の手札効果）
//   ・excludePieceCells  … 「プレイヤーのいないマス」（迷いの森・厳重警戒）
//   ・excludeAdjacent    … 「あなたの隣以外」（迷いの森）。「隣」＝前後左右の4マス
//                           （用語集。斜めも含む「周囲」とは別の概念）
function getPlaceCardCellCandidates(destination, pieceLocation) {
  let cells = getAllCellCandidates();
  if (destination?.excludeGates) {
    cells = cells.filter((c) => !Object.values(GATE_POSITIONS).some((g) => g.row === c.row && g.col === c.col));
  }
  if (destination?.excludePieceCells) {
    cells = cells.filter((c) => !hasPieceAt(c.row, c.col));
  }
  if (destination?.excludeSurrounding) {
    // 「周囲」＝斜めも含む8マス（用語集。「隣」＝前後左右4マスとは別）。
    // 駒の位置が分からない時は**安全側（候補なし）に倒す**（絞らずに出すとルール違反になる）。
    if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
    const 周囲 = new Set(
      enumerateSurroundingOffsets().map(({ dr, dc }) => pieceLocation.row + dr + "," + (pieceLocation.col + dc))
    );
    cells = cells.filter((c) => !周囲.has(c.row + "," + c.col));
  }
  if (destination?.onlyAdjacent) {
    // 「これをあなたの隣に置く」（オレンジバス）。「隣」＝前後左右の4マス（用語集）。
    if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
    const となり = new Set(DIRECTIONS.map(({ dr, dc }) => pieceLocation.row + dr + "," + (pieceLocation.col + dc)));
    cells = cells.filter((c) => となり.has(c.row + "," + c.col));
  }
  if (destination?.excludeAdjacent) {
    // 駒の位置が分からない時は絞れない。**安全側（候補なし）に倒す**——
    // 絞らずに全マスを出すと「隣に置けてしまう」＝ルール違反になる。
    if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
    const となり = new Set(DIRECTIONS.map(({ dr, dc }) => pieceLocation.row + dr + "," + (pieceLocation.col + dc)));
    cells = cells.filter((c) => !となり.has(c.row + "," + c.col));
  }
  return cells;
}

// 「強制移動」の候補（用語集: 「カードが無いマスにも移動できる『移動』のこと」）。
// 🔴 **ふつうの「移動」（getMoveCandidates）はカードがあるマスに限る**ので、別の関数にする。
//   取り違えると「何もないマスへ行けない／行けてしまう」というルール違反になる。
//   ・requireEmpty          … 「何もないマス」＝カードも駒も無い（用語集。ジョイナーの手札効果）
//   ・excludeOpponentGates  … 「ただし相手のゲートへは移動できない」（ゲートチャージ）
// ⚠ 駒は1マスに1つまで（物理ルール）なので、駒がいるマスは常に除く。
function getForcedMoveCandidates(fromLocation, count, opts = {}) {
  const candidates = [];
  if (!fromLocation || typeof fromLocation.row !== "number") return candidates;
  const n = count ?? 1;
  // 🔴 1st EDITION（飛空艇アルヴァ）「カードの置かれていない７マス先に**一気に**強制移動」。
  //   「一気に」＝ちょうど距離Nのマス全部（ジャンプ台と同じ enumerateManhattanRing）。
  //   既定（atOnce 無し）は今までどおり**まっすぐ4方向のN マス先**だけ。
  const offsets = opts.atOnce ? enumerateManhattanRing(n) : DIRECTIONS.map(({ dr, dc }) => ({ dr: dr * n, dc: dc * n }));
  for (const { dr, dc } of offsets) {
    const row = fromLocation.row + dr;
    const col = fromLocation.col + dc;
    if (!inBounds(row, col)) continue;
    if (hasPieceAt(row, col)) continue;
    if (opts.requireEmpty && hasCardAt(row, col)) continue;
    if (opts.excludeOpponentGates && isOpponentGateCell(row, col, opts.player)) continue;
    candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// そのマスが「自分以外のプレイヤーのゲート」かどうか（ゲートチャージ専用）。
// ⚠ 自分のゲートは除かない（「相手のゲートへは移動できない」だけ）。
function isOpponentGateCell(row, col, player) {
  for (const side of Object.keys(GATE_POSITIONS)) {
    const g = GATE_POSITIONS[side];
    if (g.row !== row || g.col !== col) continue;
    return SEAT_TO_SIDE[player] !== side;
  }
  return false;
}

// 「カードの置かれたマス」の候補（足下の隠し財産）。
// ⓘ 補足「あなたのいるマスも選べる。あなたの隣のマスは選べない。」＝除くのは隣の4マスだけ。
// 🔴 **到達効果（隣以外）と手札効果②（任意のマス）で条件が違う**ので、呼ぶ側が渡す。
function getCellsWithCardCandidates(opts = {}, pieceLocation = null) {
  let cells = getAnyCellWithCardCandidates();
  if (opts.excludeAdjacent) {
    // 駒の位置が分からない時は**安全側（候補なし）に倒す**（絞らずに出すとルール違反）。
    if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
    const となり = new Set(DIRECTIONS.map(({ dr, dc }) => pieceLocation.row + dr + "," + (pieceLocation.col + dc)));
    cells = cells.filter((c) => !となり.has(c.row + "," + c.col));
  }
  if (opts.excludeOwnCell) {
    // 【#473/#474】「あなたのいるマス以外の」（足下の隠し財産）。
    // 🔴 「隣以外」と同じ理由で、駒の位置が分からない時は**候補なしに倒す**
    //   （絞らずに出すとルール違反になる）。
    if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
    cells = cells.filter((c) => !(c.row === pieceLocation.row && c.col === pieceLocation.col));
  }
  return cells;
}

// 「そのマスの１番下に（表向きで）置く」（足下の隠し財産）。
// 🔴 **重なり順は state.tokens の配列順だけで決まる**（後ろほど上＝１番上の原則、
//   state.js の MOVE_TOKEN のコメント参照）。「一番下へ入れる」専用のアクションは
//   **作らない**——リデューサーを足すとサーバー側（Edge Function）にも同じものが要り、
//   再デプロイするまで食い違う（続き650・653 と同じ判断）。
//   代わりに「そのカードを置いた後、元からあったカードを順番に置き直す」＝MOVE_TOKEN だけで
//   済むので、今のサーバーのままでも通る。
// ⚠ マス→同じマスの移動は table→table なので表裏は変わらない（MOVE_TOKEN の分岐）。
// ⚠ 置き直しの間だけ一番上が入れ替わるので、露出到達（#152）は**出さない**
//   （最後には元の一番上に戻る＝駒が触れている面は変わっていないため）。
async function sinkCardToBottomOfCell(tokenId, cell, helpers) {
  const others = getState()
    .tokens.filter(
      (tk) =>
        tk.kind === "card" &&
        tk.id !== tokenId &&
        tk.location.zone === "cell" &&
        tk.location.row === cell.row &&
        tk.location.col === cell.col
    )
    .map((tk) => tk.id);
  for (const id of others) {
    await helpers.moveAndSync(id, { zone: "cell", row: cell.row, col: cell.col }, undefined, undefined, false, true);
  }
  return others.length;
}

// 「プレイヤーのいない１マスの裏向きのカード」の候補（鑑定士の技・ジェイクの手札効果）。
// 🔴 駒がいるマスを外すのが要点——外さないと、開けた瞬間にその駒が到達してしまう。
function getCellsWithFaceDownCardWithoutPiece() {
  return getAnyCellWithFaceDownCardCandidates().filter((c) => !hasPieceAt(c.row, c.col));
}

// 「プレイヤーのいないマス」の候補（ピュアバーガーの到達効果）。カードの有無は問わない。
function getCellCandidatesWithoutPiece() {
  return getAllCellCandidates().filter((c) => !hasPieceAt(c.row, c.col));
}

// 「あなたの隣のマスのうち、カードが置かれているマス」の数（不思議な果実の使用条件）。
// ⓘ 「隣」＝前後左右の4マス（用語集。斜めを含む「周囲」とは別）。
function countAdjacentCellsWithCard(pieceLocation) {
  if (!pieceLocation || typeof pieceLocation.row !== "number") return 0;
  let n = 0;
  for (const { dr, dc } of DIRECTIONS) {
    const row = pieceLocation.row + dr;
    const col = pieceLocation.col + dc;
    if (inBounds(row, col) && hasCardAt(row, col)) n++;
  }
  return n;
}

// 「あなたの右隣の相手」（不思議な果実）。
// 🔴 **手番順のひとつ『前』**。座席は 手前(南)=A・左(西)=B・奥(北)=C・右(東)=D で、
//   手番は A→B→C→D（盤面を上から見て時計回り）。A から見て右手側に座っているのは
//   **D＝SEAT_ORDER のひとつ前**で、次の人（B）は左隣になる。
//   ⚠ 「次の人」と取り違えやすい所なので、ここに書いておく。
function getRightNeighborOf(player) {
  const order = SEAT_ORDER.filter((p) => getState().activePlayers.includes(p));
  const idx = order.indexOf(player);
  if (order.length < 2 || idx === -1) return null;
  return order[(idx - 1 + order.length) % order.length];
}

function getEmptyCellCandidates(requireNoPiece) {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      if (hasCardAt(row, col)) continue;
      if (requireNoPiece && hasPieceAt(row, col)) continue;
      candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

// 「場の中央と四隅」＝(3,3) と四隅の計5マス（バッドバーガー専用）。用語集「場の中央」は
// 7×7の真ん中＝(3,3)。駒がいるマスは除く（カードの文の「プレイヤーのいないマス」）。
function getCenterOrCornerCellsWithoutPiece() {
  const cells = [
    { row: 3, col: 3 },
    { row: 0, col: 0 },
    { row: 0, col: 6 },
    { row: 6, col: 0 },
    { row: 6, col: 6 },
  ];
  return cells.filter((c) => !hasPieceAt(c.row, c.col)).map((c) => ({ zone: "cell", row: c.row, col: c.col }));
}

// 「裏向きのカードが1枚以上あるマス」の候補（ピュアバーガーの手札効果専用）。
// ⚠ 一番上が表向きでも、下に裏向きが埋まっていれば対象になる（枚数を数える効果なので
//   １番上の原則は関係ない）。裏向きの枚数は誰でも見える公開情報。
function getCellsWithAnyFaceDownCard() {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      if (countFaceDownCardsAtCell(row, col) > 0) candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

function countFaceDownCardsAtCell(row, col) {
  return getState().tokens.filter(
    (t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === row && t.location.col === col && !t.faceUp
  ).length;
}

// 「場の表向きのカードのうち、指定の色のもの」があるマスの候補（色寄せの笛専用）。
// 🔴 **一番上が表向きで、かつその色**のマスだけ。１番上の原則があるので、下に同色が
//   埋まっていても取れない（取れるのは一番上の1枚だけ）。
// ⚠ オンラインでは裏向きのカードの cardId がマスクされて null になるので、null は飛ばす
//   （裏向きはそもそも対象外なので、取りこぼしにはならない）。
function getFaceUpCellCandidatesOfColor(color) {
  if (!color) return [];
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      const top = findTopCardAtCell(row, col);
      if (!top || !top.faceUp || !top.cardId) continue;
      if (getCardDefinition(top.cardId)?.color !== color) continue;
      candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

// 「Nマス以内にいる相手の駒のマス」の候補（マスチェンジ等）。自分のいるマス自身は
// 対象外（自分自身との入れ替えは意味を成さないため）。
function getOpponentPieceCellsWithinRange(fromLocation, range, player) {
  const candidates = [];
  for (const { dr, dc } of enumerateManhattanDisk(range)) {
    if (dr === 0 && dc === 0) continue;
    const row = fromLocation.row + dr;
    const col = fromLocation.col + dc;
    if (!inBounds(row, col)) continue;
    const piece = getState().tokens.find(
      (t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === row && t.location.col === col && t.player !== player
    );
    if (piece) candidates.push({ zone: "cell", row, col });
  }
  return candidates;
}

// 「相手の駒がいる全てのマス」の候補（範囲制限なし版、プレゼント・結ばれの一本桜等の
// 「相手を選ぶ」効果用）。ユーザー要望「場に関する効果で相手を選ぶ時はアバターでは
// なく駒を選ぶ形にしてほしい。場に関する効果は駒、相手の手札に関する効果はアバター、
// という使い分けはどうか」への対応。マスチェンジ（getOpponentPieceCellsWithinRange）
// と同じ「相手の駒のマスをpickLocationで選ばせる」パターンの、範囲を問わない版。
// 「あなたの周囲（斜めも含む8マス）にいる相手の駒」のマス（紅の鉄拳）。
// ⚠ ふだんの接触は「隣」（前後左右）だけなので、**この効果だけ斜めの相手にも届く**。
function getOpponentPieceCellsInSurrounding(pieceLocation, player) {
  if (!pieceLocation || typeof pieceLocation.row !== "number") return [];
  const out = [];
  for (const { dr, dc } of enumerateSurroundingOffsets()) {
    const row = pieceLocation.row + dr;
    const col = pieceLocation.col + dc;
    if (!inBounds(row, col)) continue;
    const piece = findPieceAtCell(row, col);
    if (piece && piece.player && piece.player !== player) out.push({ zone: "cell", row, col });
  }
  return out;
}

function getAllOpponentPieceCells(player) {
  const candidates = [];
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      const piece = getState().tokens.find(
        (t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === row && t.location.col === col && t.player !== player
      );
      if (piece) candidates.push({ zone: "cell", row, col });
    }
  }
  return candidates;
}

// あるカードが「index番目の色スロット」にロックできるか（＝そのスロットの色に一致するか）。
// 不具合#119（ユーザー訂正2026-08-15）: ロックは特に指定が無ければ原則そのロックエリアの色の
// カードしかロックできない。ノワールの手札効果は「その置かれた“色”のロックエリアにカードを
// ロックする」＝色縛りが効く（以前は色を問わず置けてしまっていた）。なないろの欠片（虹）は
// 「すべての色である」ので任意の色スロットに一致する。無色（白/黒/noir）はロック対象外。
function cardCanLockIntoColorIndex(cardId, index) {
  if (cardId === "rainbow-shard") return true; // ★これはすべての色である
  const color = getCardDefinition(cardId)?.color;
  if (!color || ["white", "black", "noir", "rainbow"].includes(color)) return false;
  return COLORS.indexOf(color) === index;
}

// なないろの欠片のLOCK_PAIR専用: 自分のロックエリアの7色スロット全部（埋まっている
// スロットも含む——通常の「1色1枚まで」占有チェックの対象外の特殊ロックのため）。
function getOwnLockSlotCandidates(player) {
  const side = SEAT_TO_SIDE[player];
  return COLORS.map((_, index) => ({ zone: "lock", side, index }));
}

// 黒の契約の烙印専用: 自分のロックエリアの「空いている」スロットだけ（通常のロックと
// 違い色は問わない、getOwnLockSlotCandidatesと違って占有中のスロットは除外する）。
function getOwnEmptyLockSlotCandidates(player) {
  const side = SEAT_TO_SIDE[player];
  return getOwnLockSlotCandidates(player).filter(
    (slot) => !getState().tokens.some((t) => t.kind === "card" && t.location.zone === "lock" && t.location.side === side && t.location.index === slot.index)
  );
}

// 桃のキューブ セレナーデ専用（LOCK_ONE_HAND_CARD_EXCEPT_FINAL）: 今ロック可能な
// （＝それをロックしても7色目＝勝利にはならない）手札カードと、それぞれの有効な
// 置き先スロットをまとめて求める。isHandEffectOptionUsable（発動前の善処の原則
// チェック——コストを払う前に「そもそも今使えるか」を判定する）と、実際の実行
// （runAction内のLOCK_ONE_HAND_CARD_EXCEPT_FINAL）の両方で同じロジックを使う
// ことで、「発動を宣言できたのに実際には何も起きない」という状態を避ける
// （ユーザー指摘: シェイズオブセブンの「善処の原則」は、手札効果発動宣言時に
// 条件を満たせないと分かっていたら発動自体できない、という方針）。
// opts.allowFinal: 「最後のロック（7色目＝勝利になるロック）」も候補に含めるか。
//   既定 false ＝ セレナーデ用（カードに「ただし最後のロックはできない」と明記されている）。
//   true ＝ #186（ユーザー確定2026-08-28）: カウンターロックの「あなたの手札を１枚ロック
//   してもよい」にはその制限文が無いため、最後の1色もロックできる（呼び出し側で通常の
//   ロック宣言と同じ全員承認フロー＝requestFinalLock に載せること）。
export function getLockableHandTokensExceptFinal(player, opts = {}) {
  const allowFinal = !!opts.allowFinal;
  const emptySlots = getOwnEmptyLockSlotCandidates(player).filter(
    (slot) => allowFinal || !wouldCompleteLockWithNewIndex(player, slot.index)
  );
  const candidateSlotsFor = (token) => {
    if (emptySlots.length === 0) return [];
    const color = getCardDefinition(token.cardId)?.color;
    // 無色（白・黒）と虹（なないろの欠片）は特定の色スロットに縛られないので、空いている
    // どのスロットにも置ける（プレイヤーがどの色にするか選ぶ）。虹をセレナーデでロックする
    // 場合は「色を選んで1枚だけ」ロックする（不具合#52、serenade-rainbow-shard-lock-rule。
    // 虹本来の手札効果=2枚ロックとは別で、ここでは単体を1スロットに置く＝勝利判定でも1色）。
    if (color === "white" || color === "black" || color === "rainbow") return emptySlots;
    const idx = COLORS.indexOf(color);
    const matching = emptySlots.filter((s) => s.index === idx);
    return idx >= 0 ? matching : [];
  };
  // 以前はなないろの欠片を候補から一律除外していたが、ユーザー報告#52「ピンクを追色コストに
  // 払い、なないろの欠片をロックできる状況なのにセレナーデが使えない」への対応で、虹も
  // セレナーデのロック対象に含める（色は上のcandidateSlotsForでプレイヤーが選ぶ）。
  const handTokens = getState().tokens.filter(
    (t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === player
  );
  const tokens = handTokens.filter((t) => candidateSlotsFor(t).length > 0);
  return { candidateSlotsFor, tokens };
}

// カウンターロック／プレゼント専用: 指定プレイヤーが実際に「ロックしている」色数。victory.jsの
// getLockedCountに一本化する（#109: 以前はロックエリアの全カードを素で数えていたため、ノワール
// の「置いている」プレースホルダーや無色の「置いている」カードまでロック扱いで数えてしまい、
// 「１番少なくロックしている」の判定が狂っていた。getLockedCountはplaced・無色を除外し、正式に
// ロックされた色スロットだけを数える＝勝利判定と同じ基準）。
function countLockedCardsFor(player) {
  // #170: 色数(getLockedCount)ではなく枚数(getLockedCardCount)で数える。なないろの欠片を
  // 2枚同じスロットへロックした場合に「2枚→1」と過少カウントしていたため。
  return getLockedCardCount(player);
}

// カウンターロック専用: 「１番少なくロックしている」＝参加している全プレイヤーの中で
// ロック枚数が最少（同率首位も含む——docs/cards.md補足「ロックしている枚数が
// １番少ないことである」の一般的な解釈、他の「１番多い/少ない」系カードと同じ）。
function isFewestLocked(player) {
  const counts = getState().activePlayers.map((p) => countLockedCardsFor(p));
  if (counts.length === 0) return false;
  return countLockedCardsFor(player) === Math.min(...counts);
}

// 処理順の原則（docs/cards.md「複数のプレイヤーを対象にした効果は原則、効果の
// 使用者から時計回りに効果を処理する」）: SEAT_ORDERをplayerから始まるように
// 回転させる。プレゼント・色落ちキャット等、複数箇所で同じ回転を個別に書いて
// いたのをここへ集約した。
export function rotatedActivePlayersFrom(player) {
  // 【続き626】回転そのものは board-layout.js の rotateSeatsFrom に移した
  // （ゲート侵攻でも同じ並べ方が要るので、2か所に書かない）。中身は変えていない。
  return rotateSeatsFrom(SEAT_ORDER.filter((p) => getState().activePlayers.includes(p)), player);
}

// 1つのactionを実行する。helpers:
//   moveAndSync(tokenId, location): 実際にトークンを動かし、オンライン中の同期・
//     再描画まで面倒を見る（main.jsのaddArrivedCardToHand等と同じ責務）。
//   pickLocation(candidates, hint): プレイヤーに候補マスの中から1つ選んでもらう
//     （候補が1つしかなければ選ばせずそのまま採用してよい、呼び出し元の裁量）。hintは
//     「何を選ぶ場面か」をプレイヤーに案内する短い文（ユーザー要望「移動先のマスを
//     選択してください、等の案内を出してほしい」への対応）。
//   pickHandCard(player, hint): プレイヤーに自分の手札から1枚選んでもらう（手札トークンを返す）。
//   onCardAcquiredToHand(tokenId, cardId): PICKUP_TO_HANDで手札に加わったカードを
//     「何を獲得したか」表示し、後で置き直すまで手札内で光らせる（ユーザー要望）。省略可。
//   markPlacementTarget(location): PICKUP_TO_HANDで拾った元のマスを「ここに置き直す」
//     目印としてハイライトし続ける（ユーザー要望「どこに置かれるか忘れないように」）。省略可。
// 戻り値: 実際に何かが起きたか（true）、候補が無い等で「善処の原則」により何も
// 起きなかったか（false）。ユーザー要望「効果が不発だった場合は『不発のためこのカードを
// 手札に加えます』的なモーダルを出してほしい」への対応でrunArrivalEffect側が使う
// （runHandEffectOption側は今のところこの戻り値を見ていない）。
async function runAction(action, ctx, helpers) {
  switch (action.verb) {
    case VERBS.MOVE: {
      const candidates = getMoveCandidates(ctx.pieceLocation, action.count, !!action.atOnce);
      if (candidates.length === 0) return false; // 善処の原則: 選べる先が無ければ何もしない
      // 無意味なループ防止（#49、ユーザー方針「セブンではルール上無意味なループは禁止」）。この移動
      // 連鎖で既に通ったマス（出発マス含む）へ戻る候補を「ループ先」として扱う。ジャンプ台の連続移動で
      // 2つのジャンプ台を永遠に往復する等を防ぐ。
      helpers.recordMoveVisited?.(ctx.pieceLocation); // 出発マスを記録（この連鎖で通った回数を++）
      // 同じマスへ戻れる上限回数。人間は起点のジャンプ台へ何度か戻れるように余裕を持たせる
      // （ユーザー要望2026-08-15、安全率込みで10回）。CPUは無駄なバウンドを避けるため厳格に1回。
      const revisitLimit = helpers.isCpuDriving?.(ctx.player) ? 1 : HUMAN_MOVE_REVISIT_LIMIT;
      const isLoop = (c) => !!helpers.isLoopMoveDest?.(c, revisitLimit);
      const freshCells = candidates.filter((c) => !isLoop(c));
      const loopCells = candidates.filter(isLoop);
      let dest;
      if (helpers.isCpuDriving?.(ctx.player)) {
        // CPU（CPU戦のCPU席・AFK代行の自席）はループ先を選ばない。非ループの行き先が無ければ移動
        // しない（連鎖はここで自然終了。駒は直前に着地した現在地＝正当なマスに留まる）。
        if (freshCells.length === 0) return false;
        dest =
          freshCells.length === 1 && !ctx.forcePrompt
            ? freshCells[0]
            // #340: 用途を渡さないと、CPUの自動選択が「拾う/乗る」用の判断になり
            //   移動の善し悪し（自ゲート防衛・接触の危険・前進）が一切入らない（cpu-brain.js 参照）。
            : await helpers.pickLocation(freshCells, t("ce.L738"), { purpose: "move" });
      } else {
        // 人間: ループ先は警告して選べないようにする（alertCellsでクリック時に注意を出し選択させない）。
        // 非ループの行き先が1つも無ければ移動しない（＝実質行き先なし。駒は現在地に留まる）。
        if (freshCells.length === 0) return false;
        dest =
          freshCells.length === 1 && !ctx.forcePrompt
            ? freshCells[0]
            : await helpers.pickLocation(freshCells, t("ce.L738"), {
                alertCells: loopCells,
                alertMessage: t("ce.L748"),
              });
      }
      if (!dest) return false;
      // ユーザー要望「ジャンプ台で移動するときに専用の効果音を使ってください」。
      // action.sound（DSL側で指定した場合のみ）をそのままhelpers.moveAndSyncへ
      // 渡す。指定が無い他のMOVEアクションは従来通り無音のまま。
      await helpers.moveAndSync(ctx.pieceTokenId, dest, action.sound);
      helpers.recordMoveVisited?.(dest); // 到達マスも記録（次の連鎖でここへ戻る＝ループとして検知）
      ctx.pieceLocation = dest;
      ctx.arrivedAt = dest; // 呼び出し元が「移動の結果、新しいマスに到達した」連鎖判定に使う
      return true;
    }
    case VERBS.DRAW: {
      // target: SELF（自分だけ）/ALL_OPPONENTS（対象は自分以外の参加座席それぞれ、
      // 1人ずつ指定枚数）。helpers.drawCards(player, count)はplayerごとに1回呼ぶ。
      const players =
        action.target === TARGETS.ALL_OPPONENTS
          ? getState().activePlayers.filter((p) => p !== ctx.player)
          : action.target === TARGETS.ALL_PLAYERS
            ? getState().activePlayers
            : [ctx.player];
      // 🔴 1st EDITION（経済成長の【状況】）「１枚ドローしてもよい」。optional の時だけ聞く
      //   （既定は今までどおり必ず引く）。聞くのは**その人自身**ではなく効果の処理者だが、
      //   状況カードはその人のターン開始時に本人の画面で走るので同じになる。
      if (action.optional) {
        const 返事 = await helpers.pickChoice?.(
          ctx.cardId,
          [
            { id: "yes", label: t("ce.feDrawYes", { n: await amountOf(action, ctx, helpers) }), usable: true },
            { id: "no", label: t("ce.feDrawNo"), usable: true },
          ],
          t("ce.feDrawOptional")
        );
        if (返事 !== "yes") return false;
      }
      for (const p of players) {
        await helpers.drawCards(p, await amountOf(action, ctx, helpers));
      }
      return true;
    }
    case VERBS.LOCK_HAND_CARD_INTO_NOIR_SLOT: {
      // 黒のキューブ ノワール(first-noir)専用: ノワールの置かれた“色”スロットへ、手札のカードを
      // 1枚ロックする。#119（ユーザー訂正2026-08-15）: ロックは原則そのロックエリアの色のカード
      // しかできない——ノワールの効果文も「その置かれた色のロックエリアにカードをロックする」で
      // 色を問わないとは書いていないため、色縛りが効く（虹＝すべての色は可）。ノワール自身は
      // 「置いている」プレースホルダーとしてそのまま残る。スロットに既にロック札（非placed）が
      // あれば何もしない（善処の原則。除去されて空けば再度使える）。一致する手札が無くても何もしない。
      const noir = getState().tokens.find((t) => t.id === ctx.cardTokenId);
      if (!noir || noir.location.zone !== "lock") return false;
      const { side, index } = noir.location;
      const alreadyLocked = getState().tokens.some(
        (t) =>
          t.kind === "card" &&
          t.id !== noir.id &&
          t.location.zone === "lock" &&
          t.location.side === side &&
          t.location.index === index &&
          !t.placed
      );
      if (alreadyLocked) return false;
      // そのスロットの色に一致する手札（＋虹）だけを候補にする（色縛り）。
      const lockable = getHandTokens(ctx.player).filter((t) => cardCanLockIntoColorIndex(t.cardId, index));
      if (lockable.length === 0) return false;
      const handIds = new Set(lockable.map((t) => t.id));
      const chosen = await helpers.pickHandCard(ctx.player, t("ce.L799"), handIds, {
        purpose: "lock",
      });
      if (!chosen) return false;
      await helpers.moveAndSync(chosen.id, { zone: "lock", side, index });
      return true;
    }
    case VERBS.PICKUP_DISCARD_TOP: {
      // 赤のはじまり（0th拡張）専用: 捨て場の１番上のカードを手札に加える。
      // 捨て場が空なら何も起きない（善処の原則）。
      if (getState().piles.discard.length < 1) return false;
      const topToken = await helpers.drawFromDiscard(ctx.player);
      if (!topToken) return false;
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.tookFromDiscard", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(topToken.cardId) })
      );
      return true;
    }
    case VERBS.PICKUP_DISCARD_SECOND_FROM_TOP: {
      // 赤のキューブ フェニックス専用: 捨て場の１番上から２番目のカードを手札に加える。
      // 捨て場は「一番上を引く」（DRAW_FROM_PILE）操作しか無く、途中のインデックスを
      // 直接指定する手段が無い（サーバー側so7-apply-action.tsも同様）。新しいアクション
      // 型を追加せず、既存の「一番上を引く」を2回使う（1回目＝退避、2回目＝本来の対象）
      // →退避した分を捨て場へ戻す、という3ステップで実現する。
      // 🔴 【#467・2026-11-03 ユーザー説明】**「２番目」は、自分自身を数えた上での２番目**。
      //   赤のはじまりは到達も手札も「捨て場の１番上を取りたい」カードだが、**手札効果は
      //   『捨ててから発動』が原則**なので、そのまま「１番上」と書くと**発動して捨てた
      //   赤のはじまり自身を永遠に拾い直す**ことになる。それを避けるための「２番目」であって、
      //   結果として取れるのは**使う直前の１番上**＝到達効果と同じ札で**それが正しい**。
      //   ⚠ 一度「自分は数えない」形にしたが（素直に数えると到達と同じ札になるので意図を
      //     取り違えた）、ユーザー説明で**数えるのが正**と確定したので元に戻した。
      //   ⚠ 赤のキューブ フェニックス（first-red）はロックエリアに残る＝捨て場に入らないので、
      //     あちらは最初から「ふつうの２番目」として働く。
      if (getState().piles.discard.length < 2) return false; // 善処の原則
      const setAsideToken = await helpers.drawFromDiscard(ctx.player);
      if (!setAsideToken) return false;
      const targetToken = await helpers.drawFromDiscard(ctx.player);
      if (!targetToken) {
        // 2枚目が引けなかった場合（同時操作等でスタック枚数がズレた等）、退避した分を
        // 捨て場へ戻して原状回復する。
        await helpers.discardAndSync(setAsideToken.id, { silent: true }); // 【#268】戻すだけなので「捨てた」とは知らせない
        return false;
      }
      await helpers.discardAndSync(setAsideToken.id, { silent: true }); // 【#268】戻すだけなので「捨てた」とは知らせない
      // お知らせ（ユーザー要望）: 誰が捨て場から何を手札に加えたか。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.tookFromDiscard", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(targetToken.cardId) })
      );
      return true;
    }
    case VERBS.PLACE_DECK_CARDS_IN_CHOSEN_CELLS: {
      // 大地創造「何もない４マスに山札から１枚ずつ裏向きで置く。それらをオープンする。」
      // 迷いの森「カードの置かれていない４マスに山札から１枚ずつ裏向きで置く。」
      // 善処の原則: 空きマスが count より少なければ**あるだけ置く**（置けないぶんは諦める）。
      // 🔴 【#514・2026-11-04】報告「大地創造で4マス選び終わったタイミングで**これらのマスで
      //    いいか？の確認が出なかった**」。#481（ジェイクの7マス）でユーザーが指定した流れ
      //    ①確認なしで N マス選ぶ → ②まとめて1回だけ確認 → ③処理する、をこちらにも入れる。
      //    ⚠ **置くのは全部選び終わってから**（途中で置くと、まとめて聞く前に盤面が変わる）。
      //    ⚠ 1マスだけの時は今までどおり（1マスずつの確認が出て、まとめては聞かない）。
      // 🔴 1st EDITION（大盤振舞）: count: "wealth" ＝【財力＝S】。
      const 欲しい枚数 = await amountOf(action, ctx, helpers);
      const 置ける枚数 = Math.min(欲しい枚数, getState().piles.deck.length);
      // 🔴【#528・2026-11-07】ユーザー判断「**山札からか手札からか選ぶときで複数マスの時は
      //   １マスずつ確認がいい**と思います」（「1マスは手札から1マスは山札から」）。
      //   ⇒ allowHand（建設バブル）で2マス以上の時だけ、**まとめ確認をやめて1マスずつ**
      //     「マスを選ぶ → このマスでいいですか → そのマスの出どころを選ぶ → 置く」を繰り返す。
      //   ⚠ 山札だけから置くカード（大地創造・迷いの森・大盤振舞）は**今までどおり**
      //     まとめて1回確認する（#481・#514 でユーザーが指定した流れ）——あちらは
      //     マスごとに決めることが無いので、確認が増えるだけになる。
      const 一マスずつ = !!action.allowHand && 置ける枚数 >= 2;
      const まとめ確認 = 置ける枚数 >= 2 && !一マスずつ;
      let 選んだマス = [];
      // ⚠ 1マスずつの時はここで選ばない（下で「選ぶ→置く」を繰り返すため）。
      for (; !一マスずつ; ) {
        // 🔴【#555】選んだマスをもう一度押すと外れる（共通の pickCellsWithDeselect）。
        選んだマス = await pickCellsWithDeselect(helpers, {
          want: 置ける枚数,
          forcePrompt: ctx.forcePrompt,
          listCells: () => getEmptyCellCandidates(!!action.requireNoPiece),
          label: (n) => t("ce.placeNth", { i: n, n: 欲しい枚数 }),
          // 1マスずつの「このマスでいいですか？」は出さない（②でまとめて聞くため）。
          pickOpts: { purpose: "place", skipConfirm: まとめ確認 },
          highlight: まとめ確認,
        });
        if (選んだマス.length === 0) break;
        if (!まとめ確認 || 選んだマス.length < 2) break;
        if (await helpers.confirmPickedCells(ctx.cardId, ctx.player, 選んだマス.length)) break;
        helpers.clearPlacementTargets?.(); // 「いいえ」＝選び直し
      }
      if (まとめ確認) helpers.clearPlacementTargets?.();
      // 🔴 1st EDITION（建設バブルの【状況】）「自分の**手札または山札から**１枚ずつ置く」。
      //   allowHand の時だけ「どちらから出すか」を聞く（足下の隠し財産と同じ形）。
      //   ⚠ 片方しか無い時は聞かない（選ぶ余地が無い）。
      const 出どころを決める = async () => {
        if (!action.allowHand) return "deck";
        const 手 = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
        const 山 = getState().piles.deck.length > 0;
        if (!(山 && 手.length > 0)) return 山 ? "deck" : "hand";
        return (
          (await helpers.pickChoice?.(
            ctx.cardId,
            [
              { id: "deck", label: t("ce.ex0FromDeck"), usable: true },
              { id: "hand", label: t("ce.ex0FromHand"), usable: true },
            ],
            t("ce.ex0PickDeckOrHand")
          )) ?? "deck"
        );
      };
      const 置いた = [];
      // 1マス置く。置けたら true。
      const 置く = async (dest, 出どころ) => {
        if (出どころ === "hand") {
          const 残り = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
          if (残り.length === 0) return false;
          const chosen =
            残り.length === 1 && !ctx.forcePrompt
              ? 残り[0]
              : await helpers.pickHandCard(ctx.player, t("ce.ex0PickHandForBottom"), new Set(残り.map((tk) => tk.id)));
          if (!chosen) return false;
          // 第6引数 true ＝到達を起こさない（裏向きで置くので、そもそも到達の条件を満たさない）。
          await helpers.moveAndSync(chosen.id, dest, undefined, undefined, false, true);
        } else {
          if (getState().piles.deck.length === 0) return false; // 山札が尽きたらそこまで
          await helpers.placeFromDeck(dest); // マスへ置くと既定で裏向き（カードの文どおり）
        }
        helpers.markPlacedLocation?.(dest);
        置いた.push(dest);
        return true;
      };
      if (一マスずつ) {
        // 🔴【#528】マスごとに「選ぶ → このマスでいいですか → そのマスの出どころ → 置く」。
        //   ⚠ **置いてから次のマスを選ぶ**ので、「どのマスの話か」が常にはっきりする
        //     （先に全部選んでから出どころを聞くと、どちらのマスの質問か分からない）。
        //   ⓘ 置いた先は空きマスでなくなるので、次の候補から自然に外れる。
        for (let i = 0; i < 置ける枚数; i++) {
          const candidates = getEmptyCellCandidates(!!action.requireNoPiece);
          if (candidates.length === 0) break;
          const dest =
            candidates.length === 1 && !ctx.forcePrompt
              ? candidates[0]
              : await helpers.pickLocation(candidates, t("ce.placeNth", { i: i + 1, n: 欲しい枚数 }), {
                  purpose: "place",
                });
          if (!dest) break;
          if (!(await 置く(dest, await 出どころを決める()))) break;
        }
      } else {
        // まとめて置く時は**1回だけ**聞いて全部に使う（山札だけのカードは選ぶ余地が無い）。
        const 出どころ = await 出どころを決める();
        for (const dest of 選んだマス) {
          if (!(await 置く(dest, 出どころ))) break;
        }
      }
      if (置いた.length === 0) return false;
      if (action.reveal) {
        // 「それらをオープンする。」置いた順に表向きにする。
        // ⓘ requireNoPiece のカード（大地創造）は**駒のいないマスにしか置かない**ので到達は
        //   起きないが、将来 reveal を駒のいるマスで使うなら到達判定が要る（その時はここに足す）。
        for (const dest of 置いた) {
          const top = findTopCardAtCell(dest.row, dest.col);
          if (top && !top.faceUp) await helpers.flipCard(top.id);
        }
      }
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.placedFromDeckN", { name: helpers.getPlayerName(ctx.player), n: 置いた.length })
      );
      return true;
    }
    case VERBS.DISCARD_ALL_ADJACENT_CARDS: {
      // 迷いの森「あなたの隣のカードをすべて捨てる。」
      // 「隣」＝前後左右の4マス（用語集。「周囲」＝斜めも含む8マスとは別）。
      // そのマスに**積まれているカード全部**が対象（「カードをすべて」＝枚数の限定が無い）。
      if (!ctx.pieceLocation) return false;
      const 対象 = [];
      for (const { dr, dc } of DIRECTIONS) {
        const row = ctx.pieceLocation.row + dr;
        const col = ctx.pieceLocation.col + dc;
        if (!inBounds(row, col)) continue;
        for (const tk of getState().tokens) {
          if (tk.kind !== "card" || tk.location.zone !== "cell") continue;
          if (tk.location.row !== row || tk.location.col !== col) continue;
          // ファースト/エターナルは他のカードの効果の対象にならない（盤面に出ることは
          // 普通は無いが、念のため既存の判定を通す）。
          if (!isTargetableByOtherCardEffects(tk.cardId)) continue;
          対象.push(tk.id);
        }
      }
      if (対象.length === 0) return false;
      // 🔴【#535・2026-11-09】**捨てる順を選べるようにする**（報告「迷いの森で捨てる順を
      //   選べなかった。」）。捨て場は積み重なるので、どれが1番上になるかは後で効く
      //   （赤のはじまり＝1番上／フェニックス＝上から2番目）。同じ形は #488（ヤエザ）と
      //   白の意志の覚醒で既にやっているので、**同じモーダル**（pickBoardCardsOrdered）に寄せる。
      //   ⚠ 1枚だけの時は聞かない（選ぶ余地が無い）。
      let 並び = 対象;
      // 🔴【#560・2026-11-11】ユーザー要望「迷いの森は**盤面で**選びたい」。
      //   捨てる順はモーダルではなく、**光っているマスを順番にタップ**して決める
      //   （#481・#514 でユーザーが決めた「①確認なしで選ぶ →②まとめて1回確認」と同じ流れ）。
      //   ⚠ **決められるのはマスの順番まで。** 同じマスに積まれた札は、物と同じく
      //     **上から順**に捨てる（1枚ずつ別のマスの札と混ぜる並べ方はできない）。
      //   ⚠ 捨てる札のあるマスが1つだけなら聞かない（選ぶ余地が無い）。
      const マス別 = [];
      for (const id of 対象) {
        const tk = getState().tokens.find((t2) => t2.id === id);
        if (!tk) continue;
        const 鍵 = tk.location.row + "," + tk.location.col;
        let 枠 = マス別.find((g) => g.鍵 === 鍵);
        if (!枠) { 枠 = { 鍵, row: tk.location.row, col: tk.location.col, ids: [] }; マス別.push(枠); }
        // ⚠ tokens の並びは**下から上**（教訓18）。捨てるのは物と同じく上からなので逆に積む。
        枠.ids.unshift(id);
      }
      if (マス別.length >= 2) {
        for (;;) {
          const 順 = await pickCellsWithDeselect(helpers, {
            want: マス別.length,
            forcePrompt: true,
            listCells: () => マス別.map((g) => ({ zone: "cell", row: g.row, col: g.col })),
            label: (n) => t("ce.forestPickCellOrder", { i: n, n: マス別.length }),
            pickOpts: { purpose: "destroy", skipConfirm: true },
            highlight: true,
          });
          if (順.length === 0) break; // 選ばなかった＝今までどおりの並びで捨てる
          if (await helpers.confirmPickedCells(ctx.cardId, ctx.player, 順.length)) {
            const 済 = new Set();
            const 新 = [];
            for (const c of 順) {
              const 枠 = マス別.find((g) => g.row === c.row && g.col === c.col);
              if (!枠) continue;
              for (const id of 枠.ids) if (!済.has(id)) { 済.add(id); 新.push(id); }
            }
            for (const id of 対象) if (!済.has(id)) 新.push(id); // 選ばれなかった分は後ろへ
            並び = 新;
            break;
          }
          helpers.clearPlacementTargets?.(); // 「いいえ」＝選び直し
        }
        helpers.clearPlacementTargets?.();
      }
      // #463: 直後に「n枚捨てた」の要約を出すので、1枚ごとのお知らせは出さない。
      for (const id of 並び) await helpers.discardAndSync(id, { batchNotice: true });
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.discardedAdjacentN", { name: helpers.getPlayerName(ctx.player), n: 対象.length })
      );
      return true;
    }
    case VERBS.DRAW_IF_HAND_ODD: {
      // 不思議な果実「あなたの手札が**偶数**枚なら１枚ドロー。」（#494 で奇数から変わった）
      // 「手札」は公開ドロー置き場も含む（getHandTokens の定義＝続き55）。
      // ⓘ 到達効果なので、このカード自身はまだ盤面にある（数に入らない）。
      // ⚠ 動詞の名前は ODD のままにしてある（**公開済みの名前を変えると、保存された
      //   効果データや過去のログと食い違う**）。どちらを見るかは action.parity で決める。
      const 偶数が当たり = action.parity === "even";
      const 枚数 = getHandTokens(ctx.player).length;
      if ((枚数 % 2 === 0) !== 偶数が当たり) {
        await helpers.announceEffectReason?.(
          ctx.cardId,
          偶数が当たり ? t("ce.handOddNoDraw", { n: 枚数 }) : t("ce.handEvenNoDraw", { n: 枚数 })
        );
        return false; // 当たりでなければ不発（善処の原則）
      }
      await helpers.drawCards(ctx.player, action.count ?? 1);
      return true;
    }
    case VERBS.PLACE_WHOLE_HAND_AT_CHOSEN_CELL: {
      // バッドバーガー「場の中央と四隅のマスのうち、プレイヤーのいないマスを１マス選ぶ。
      //   あなたの手札をすべて、そのマスの１番上に置く。」
      const candidates = getCenterOrCornerCellsWithoutPiece();
      if (candidates.length === 0) return false; // 5マス全部に駒がいる（4人戦でも起きない）
      const hand = getHandTokens(ctx.player);
      if (hand.length === 0) return false; // 置くものが無い（善処の原則）
      const dest =
        candidates.length === 1 && !ctx.forcePrompt
          ? candidates[0]
          : await helpers.pickLocation(candidates, t("ce.pickCenterOrCorner"), { purpose: "place" });
      if (!dest) return false;
      // 「１番上に置く」＝順に積む。state 側は配列の末尾が一番上（１番上の原則）。
      for (const tk of hand) {
        await helpers.moveAndSync(tk.id, dest);
      }
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.placedWholeHand", { name: helpers.getPlayerName(ctx.player), n: hand.length })
      );
      return true;
    }
    case VERBS.DRAW_PER_FACEDOWN_AT_CHOSEN_CELL: {
      // ピュアバーガー（手札）「任意の１マスを選ぶ。そのマスの裏向きのカードの枚数分ドロー。」
      // 善処の原則: 裏向きが1枚も無いマスを選んでも0枚ドロー＝何も起きないので、
      //   **裏向きが1枚以上あるマスだけ**を候補にする（光らないマスは選べない）。
      const candidates = getCellsWithAnyFaceDownCard();
      if (candidates.length === 0) return false;
      const chosen =
        candidates.length === 1 && !ctx.forcePrompt
          ? candidates[0]
          : await helpers.pickLocation(candidates, t("ce.pickCellForFaceDownCount"));
      if (!chosen) return false;
      const n = countFaceDownCardsAtCell(chosen.row, chosen.col);
      if (n <= 0) return false;
      await helpers.drawCards(ctx.player, n);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.drewPerFaceDown", { name: helpers.getPlayerName(ctx.player), n })
      );
      return true;
    }
    case VERBS.PICKUP_FACEUP_SAME_COLOR_TO_HAND: {
      // 色寄せの笛（0th拡張）専用: 「これと同色の、場の表向きのカード１枚をあなたの手札に加える。」
      // 🔴 **「場」は7×7の49マスだけ**（ロックエリア・捨て場は含まない＝用語集「場」）。
      // 🔴 **取れるのは各マスの一番上の1枚だけ**（１番上の原則）。下に同色が埋まっていても取れない。
      const myColor = getCardDefinition(ctx.cardId)?.color ?? null;
      const sameColorCells = getFaceUpCellCandidatesOfColor(myColor);
      if (sameColorCells.length === 0) return false;
      // #336 と同じ事情: 到達効果でこのカード自身のマスを選ぶと二重に損をする（既定動作で
      // どうせ手札に入る札に「1枚」を使ってしまう）。ルール上は選べるので候補からは外さず、
      // CPUの自動選択でだけ避ける（avoidCells は「他に候補があるなら選ばない」という弱い指定）。
      const fluteToken = getState().tokens.find((x) => x.id === ctx.cardTokenId);
      const fluteCell =
        fluteToken && fluteToken.location.zone === "cell"
          ? [{ row: fluteToken.location.row, col: fluteToken.location.col }]
          : null;
      const pickedCell =
        sameColorCells.length === 1 && !ctx.forcePrompt
          ? sameColorCells[0]
          : await helpers.pickLocation(sameColorCells, t("ce.pickFaceUpSameColor"), fluteCell ? { avoidCells: fluteCell } : undefined);
      if (!pickedCell) return false;
      const pickedToken = findTopCardAtCell(pickedCell.row, pickedCell.col);
      if (!pickedToken) return false;
      const pickedCardId = pickedToken.cardId;
      // 拾ったことで下のカードが露出して到達（コンボ）が起きる場合は、それを完全に解決して
      // から次へ進む（PICKUP_TO_HAND と同じ。第5引数 true）。
      await helpers.moveAndSync(pickedToken.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(pickedToken.id, pickedCardId, true, ctx.player);
      if (pickedCardId) {
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.tookFaceUpSameColor", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(pickedCardId) })
        );
      }
      return true;
    }
    case VERBS.FLIP_UP_TO_N_WITHIN_RANGE: {
      // 黄のキューブ サフラン専用: あなたからwithinCellsマス以内の裏向きカードを、
      // maxCountまで（0枚でもよい＝「してもよい」）オープンする。候補が尽きるか、
      // maxCountに達するか、プレイヤーがこれ以上選ばない（pickLocationでnull）まで
      // 繰り返す。
      // 色寄せの笛（0th拡張）: withinCells を渡さない＝**場（49マス）全体**。
      //   optional: false＝「してもよい」ではなく必ず1枚オープンする（＝スキップを出さない）。
      //   既定は「してもよい」のまま（サフランの挙動を変えないため、false を明示した時だけ必須）。
      const 範囲なし = action.withinCells == null;
      const してもよい = action.optional !== false;
      // 🔴 1st EDITION（財閥の威光）: maxCount: "wealth" ＝【財力＝S】。
      //   **1回だけ数える**（ループの中で数えると、オープンのたびに手札が増えて上限が動く）。
      const 上限 = await amountOf(action, ctx, helpers, "maxCount");
      let flippedCount = 0;
      for (let i = 0; i < 上限; i++) {
        const candidates = 範囲なし
          ? getAnyCellWithFaceDownCardCandidates()
          : getCellsWithFaceDownCardWithinRange(ctx.pieceLocation, action.withinCells);
        if (candidates.length === 0) break;
        const chosen = await helpers.pickLocation(
          candidates,
          してもよい ? t("ce.pickOpenCells", { n: 上限 - i }) : t("ce.pickOpenCellRequired"),
          してもよい ? { allowSkip: true, skipLabel: t("ce.L842") } : undefined
        );
        if (!chosen) break; // 「してもよい」なので、これ以上選ばない＝正常終了
        const token = findTopCardAtCell(chosen.row, chosen.col);
        if (!token) break;
        await helpers.flipCard(token.id);
        flippedCount++;
        // オープンした先に駒が乗っていれば、その駒がそのカードに「到達」したものとして
        // 到達効果を発動する（サフランで自分の足元の裏向きカードをオープンした等）。
        // ジャンプ台を自分の駒の下へ表向きに置いた時と同じ扱い
        // （main.jsのmaybeTriggerArrivalForPlacedCard / maybeTriggerCardArrivalForCard）。
        // 以前はflipCardが裏→表に反転するだけで到達を一切起こさず、ユーザー報告
        // 「サフランで自分の足元をオープンしても到達効果が発動しない」の原因だった。
        // 不具合#76: オンラインでは反転前の裏向きカードのcardIdはマスクされ null のため、
        // ここで上のtoken.cardId（=null）をそのまま渡すと到達判定内の getCardDefinition(null)
        // で「Cannot read properties of undefined (reading 'name')」で落ち、到達効果も不発だった。
        // flipCardは（オンラインでも）反転後にfetchAndHydrateまで待つので、最新stateから
        // 表向きになったカードのcardIdを読み直して渡す。
        const revealedTop = findTopCardAtCell(chosen.row, chosen.col);
        const revealedCardId = revealedTop?.cardId ?? token.cardId;
        // ユーザー要望2026-09-01「サフランの効果でカードを表向きにしたとき、表向きの
        // カードが何のカードか分かるようにしたい」。オープンした時点で公開情報なので、
        // 全員に「誰が何をオープンしたか」を出す（盤面のカードは小さくて読みにくいため）。
        // 到達効果の告知より先に出す（この後 maybeTriggerArrivalForPlacedCard が走る）。
        if (revealedCardId) {
          await helpers.announceEffectReason?.(
            ctx.cardId,
            t("ce.flippedCard", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(revealedCardId) })
          );
        }
        if (revealedCardId) {
          // #93: 内側の到達チェーンを最後まで待ってから次の1枚へ（fire-and-forgetにしない）。
          await helpers.maybeTriggerArrivalForPlacedCard?.({ zone: "cell", row: chosen.row, col: chosen.col }, revealedCardId);
        }
      }
      // お知らせ（ユーザー要望）: 何枚オープンしたか（優先度低だが一応）。
      if (flippedCount > 0) await helpers.announceEffectReason?.(ctx.cardId, t("ce.flipped", { n: flippedCount }));
      return flippedCount > 0;
    }
    case VERBS.DISCARD_RANDOM_FROM_QUALIFYING_OPPONENTS: {
      // 青のキューブ セレスティア専用: 手札がminHandSize枚以上ある相手全員から、
      // 無作為に１枚ずつ選んで捨てる。「無作為に」は隠し情報（相手の手札の中身）が
      // 絡むため、スリカエ・接触の強奪と同じ「儀式的ピック」（相手の裏向きの手札から
      // 見た目上ランダムに選ぶ）で実現する（helpers.pickRandomFromOpponentHand）。
      // 処理順の原則に沿ってctx.playerから時計回りに1人ずつ。
      let hadEffect = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (p === ctx.player) continue;
        const handCount = getState().tokens.filter((t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === p).length;
        if (handCount < action.minHandSize) continue;
        const picked = await helpers.pickRandomFromOpponentHand(p);
        if (!picked) continue;
        await helpers.discardAndSync(picked.id);
        // お知らせ（ユーザー要望2026-08-28）: 捨てられたカードは公開情報（捨て場に積まれる）なので、
        // 全プレイヤーにモーダルで公開する（announceEffectReasonはオンライン中も他クライアントへ中継）。
        // #166修正: オンラインでは picked.cardId が伏せ情報(null)のため getCardDefinition(null).name で
        // クラッシュし、1人目を捨てさせた直後にループが中断＝「一人からしか捨てさせられない」不具合だった。
        // discardAndSync（捨て場へ送りhydrate完了まで await）後は、捨て場の一番上＝今捨てたカードの
        // 実cardId（捨て場は公開情報）を読める。取れない時は名前を出さず「1枚を捨てさせました」に落とす。
        const discardPile = getState().piles?.discard ?? [];
        const discardedCardId = discardPile[discardPile.length - 1] ?? picked.cardId;
        const discardedDef = getCardDefinition(discardedCardId);
        // 【#298】中央の「捨てさせた／捨てさせられた」のカード表示は、選んだ直後ではなく
        // ここまで持ち越してある（オンラインでは選んだ時点の cardId が伏せられていて裏面に
        // なるため）。捨て場に積まれた今なら公開情報として実際の札が読めるので、それで見せる。
        await helpers.showForcedDiscardReveal?.(discardedCardId);
        await helpers.announceEffectReason?.(
          ctx.cardId,
          discardedDef
            ? t("ce.madeDiscardNamed", { name: helpers.getPlayerName(p), card: cardDisplayName(discardedDef.id) })
            : t("ce.madeDiscardOne", { name: helpers.getPlayerName(p) })
        );
        hadEffect = true;
      }
      return hadEffect;
    }
    case VERBS.DISCARD_ALL_AT_CHOSEN_CELL: {
      // 紅蓮の火山 ワイナウエア専用: 任意の１マスの、そこにあるカード全て（スタック分
      // 含め全部、表裏問わず）を捨てる。
      const candidates = getAnyCellWithCardCandidates();
      if (candidates.length === 0) return false;
      // #313: purpose:"destroy" ＝ 賢いCPUの選び方を「拾う」ではなく「壊す」用に切り替える
      // （cpu-brain.js chooseEffectCell）。人間の選択には影響しない。
      const chosen =
        candidates.length === 1 && !ctx.forcePrompt
          ? candidates[0]
          : await helpers.pickLocation(candidates, t("ce.L910"), { purpose: "destroy" });
      if (!chosen) return false;
      const stack = getState().tokens.filter(
        (t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === chosen.row && t.location.col === chosen.col
      );
      if (stack.length === 0) return false;
      // #312（ユーザー報告「ワイナウェアの効果でどのマスを捨てたのか分かりづらかった」）:
      // 盤面からカードが消えるだけなので、どこが対象だったのかが分からない。配置系と同じ
      // ハイライト（markPlacementTarget＝捨てている間ずっと光る／markPlacedLocation＝
      // 捨て終わった後も数秒残る）を流用して、対象のマスを見せる。
      const targetCell = { zone: "cell", row: chosen.row, col: chosen.col };
      helpers.markPlacementTarget?.(targetCell);
      const discardedCount = stack.length;
      // 【#357・2026-09-28／2026-09-29 に条件を修正】2枚以上あれば、捨てる順番を本人に聞く。
      // 捨て場は一番上から使われる（山札切れの補充は捨て場をそのまま裏返す＝シャッフルしない）ので、
      // どの順で積むかがそのまま次の一手の価値を変える。
      // **当初は「表向きが1枚以上ある時だけ聞く」にしていたが、これは誤りだった**（ユーザー指摘）——
      // **裏向き＝中身不明とは限らない**。選べる罠・パーティー・収穫と種まき・合同建設のように
      // **カードを裏向きで盤面に置く効果**があるため、プレイヤーは「あのマスに何を置いたか」を
      // 覚えていることがある。全部裏向きでも、どれがどれか分かっていれば順番を選ぶ意味がある。
      // 並べて見せる順は**マスの上から**（ユーザー要望「どの順番でカードが重ねられてたか
      // わかりやすく」）。state.tokens の中では**後ろにあるものほど上**なので反転して渡す。
      let orderedStack = [...stack].reverse(); // 上から順（聞けない時もこの順で捨てる＝物理的に自然）
      if (stack.length >= 2 && helpers.pickBoardCardsOrdered) {
        const topFirst = orderedStack;
        const ordered = await helpers.pickBoardCardsOrdered(ctx.player, t("ce.pickDiscardOrder", { n: 1 }), topFirst, {
          purpose: "discard",
          note: t("game.pick.boardDiscardStackNote"),
        });
        if (Array.isArray(ordered) && ordered.length > 0) {
          const seen = new Set(ordered.map((tk) => tk.id));
          orderedStack = [...ordered, ...topFirst.filter((tk) => !seen.has(tk.id))];
        }
      }
      for (const token of orderedStack) {
        await helpers.discardAndSync(token.id, { batchNotice: true }); // #463: 1枚ごとのお知らせは出さず、下の要約1回にまとめる
      }
      // 【#335】お知らせは中央が空くまで順番待ちする（実機で最大9秒）。既定の3秒で光が消えると
      // 文面の「光っているマス」が何も指さなくなるので、**お知らせが出て読み終わるまで光らせ続け**、
      // 終わってから短く畳む。焼失の演出 → お知らせ、という順番はこれで自然に成立する
      // （ユーザー提案「炎で燃えるような演出が終わった後にミニモーダルを出すのはどう？」）。
      helpers.markPlacedLocation?.(targetCell, { holdMs: 20000 });
      // お知らせ（ユーザー要望）: どのマスを対象にしたか＋何枚捨てたか。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.winewareDiscarded", { n: discardedCount }));
      helpers.markPlacedLocation?.(targetCell, { holdMs: 1200 });
      return true;
    }
    case VERBS.PUBLIC_DRAW_THEN_DISCARD_AT_TURN_END: {
      // 緑のキューブ ヴァーディアン(first-green)専用: N枚公開ドローし、ターン終了時にそれらを捨てる。
      // 「ターン終了時」の実現方法はmain.jsのmarkDiscardAtTurnEnd/
      // flushPendingTurnEndDiscards参照（新しいサーバーアクション・状態を増やさず、
      // ターン終了ボタンが実際にnextTurn()を呼ぶ直前に先回りして捨てる方式）。ここでは
      // 「公開ドローする」＋「捨てる予定として覚えておく」だけで完結する。
      const tokenIds = await helpers.publicDrawReturningTokens(ctx.player, action.count);
      if (tokenIds.length === 0) return false;
      helpers.markDiscardAtTurnEnd?.(ctx.player, tokenIds);
      // お知らせ（ユーザー要望「マンズウッドは公開ドローではない→○○は1枚ドロー」）。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.drewN", { name: helpers.getPlayerName(ctx.player), n: tokenIds.length }));
      return true;
    }
    case VERBS.MOVE_CHOSEN_OPPONENT_ADJACENT_TO_SELF: {
      // 結ばれの一本桜 コノハナサクヤ専用: 相手を選び、その相手の駒をあなた自身の駒に
      // 隣接するマスへ移動させる。「移動」扱いのため、移動先が裏向きカードならオープン
      // する（docs/rulebook.md「移動」の定義、パーティーの「移動先の到達効果は得ない」
      // オプションと同じ考え方）。到達効果自体は対象になった相手プレイヤー本人の
      // クライアント側の既存の自動処理（remote-move-animator.jsが他プレイヤーの駒移動を
      // 検知して面上のカードが表向きなら自動で到達判定する仕組み、マスチェンジ等の
      // 「相手の駒を動かす」効果と同じ経路）に任せる——ここでは駒の移動とオープンだけを
      // 行う。「このターンあなたは接触できない」は実際には強制せず（このアプリの
      // Phase 1方針「ルール適用は一切しない」通り）、案内モーダルで知らせるに留める。
      // ユーザー要望「場に関する効果で相手を選ぶ時はアバターではなく駒を選ぶ形に」。
      // 盤面上の相手の駒のマスをpickLocationで選ばせる（マスチェンジと同じパターン）。
      const opponentCells = getAllOpponentPieceCells(ctx.player);
      if (opponentCells.length === 0) return false;
      let targetCell;
      if (opponentCells.length === 1) {
        // ユーザー要望「選べる相手が１人しかいない場合は自動でその人を選択し、その旨を
        // モーダルで示してほしい」（続き65／プレゼント等の再要望 2026-08-07）。スリカエ・
        // マスチェンジ等の「相手を選ぶ」系と揃え、手札効果のforcePrompt（対象1人でも選ばせる）
        // に関係なく自動選択する——相手が1人なら実質的に選択の余地が無いため（続き93の
        // 総点検ではマスチェンジだけを直したが、この「相手の駒を選ぶ」系にも抜けが残っていた）。
        targetCell = opponentCells[0];
        helpers.announceEffectNotice?.(ctx.cardId, t("ce.L958")); // 続き214: 非ブロック（直後の選択をすぐ可能に）
      } else {
        // #207: これは「マス」ではなく**相手（の駒）**を選ぶ場面。確認モーダルの文言を切り替える。
        targetCell = await helpers.pickLocation(opponentCells, t("ce.L960"), { pickTarget: "piece" });
      }
      if (!targetCell) return false;
      const targetPiece = findPieceAtCell(targetCell.row, targetCell.col);
      const selfPiece = getState().tokens.find((t) => t.kind === "piece" && t.player === ctx.player);
      if (!targetPiece || !selfPiece || selfPiece.location.zone !== "cell") return false;
      // #224: カード文は「あなたの**周囲**へ移動する」＝縦横斜めの8マス（rulebook の用語定義）。
      // 以前は enumerateManhattanRing(1)＝前後左右の4マスしか候補にしていなかった。
      // ユーザー指摘2026-09-04: これは「移動」であって「強制移動」ではないので、**カードの
      // 置かれているマスだけ**が候補（rulebook「『移動』とは: …カードの置かれた別のマスに置き…」
      // 「『強制移動』とは: カードが無いマスにも移動できる『移動』のこと」）。空きマスは選べない。
      const adjacentCells = enumerateSurroundingOffsets()
        .map(({ dr, dc }) => ({ row: selfPiece.location.row + dr, col: selfPiece.location.col + dc }))
        .filter(({ row, col }) => inBounds(row, col) && !hasPieceAt(row, col) && findTopCardAtCell(row, col))
        .map(({ row, col }) => ({ zone: "cell", row, col }));
      if (adjacentCells.length === 0) return false; // 善処の原則: 隣接マスが無ければ何もしない
      const dest = adjacentCells.length === 1 ? adjacentCells[0] : await helpers.pickLocation(adjacentCells, t("ce.L971"));
      if (!dest) return false;
      await helpers.moveAndSync(targetPiece.id, dest);
      const destTop = findTopCardAtCell(dest.row, dest.col);
      if (destTop && !destTop.faceUp) {
        await helpers.flipCard(destTop.id);
      }
      // #228: 「このターンあなたは接触できない。」を実際に強制する（告知だけでなくフラグを立てる）。
      disableContactForTurn(ctx.player);
      // お知らせ（ユーザー要望）: 誰を誰の隣へ動かしたか＋接触制限。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.movedNextTo", { target: helpers.getPlayerName(targetPiece.player), name: helpers.getPlayerName(ctx.player) })
      );
      // 【#333・2026-09-07】移動先の到達効果を、**移動させられた相手**が得る。
      // docs/cards.md の補足に明記されている（「効果の対象となった相手プレイヤーは『移動』扱いに
      // なるため、移動先のカードが裏向きであればオープンし到達効果を得る」）。
      // 以前はこれを「相手プレイヤー本人のクライアントの差分検知に任せる」設計にしていたが、
      // **CPU戦（1画面で全席を回す）にはその経路が無い**ため、カードがオープンするだけで
      // 到達効果が一度も起きなかった（ユーザー報告 #333）。マスチェンジ(MASS_CHANGE)が
      // 相手ぶんの到達を自分で発火させているのと同じ形に揃える。
      await helpers.triggerArrivalAtIfFaceUp?.(dest, targetPiece.player);
      return true;
    }
    case VERBS.PUBLIC_DRAW_DISABLE_HAND_EFFECTS_CONDITIONAL_DISCARD: {
      // 禁断の果実 マルメゴ専用: N枚公開ドロー→それらの手札効果は今ターン使用不可
      // （disableHandEffectForTurn、上のisHandEffectOptionUsableで参照）→その中に
      // 橙（なないろの欠片は全色兼用のため橙としても扱う、他の効果と同じ判定基準）が
      // あれば手札を全て捨てる。「あなたはこのターン移動できない」は他の「このターン
      // ○○できない」系（eternal-pink参照）と同じ理由で実際には強制せず、案内モーダルで
      // 知らせるに留める。
      // ユーザー要望2026-08-09「４枚ドローの演出をザ・ギャンブルと同様に」への対応。
      // ザ・ギャンブル（PUBLIC_DRAW_MATCHING_DECLARED_COLOR_COUNT）と全く同じ
      // 「鼓動SE→1枚ずつ中央でじらしフリップ公開（残り2枚以上なら『1枚公開/全部公開』の
      // モーダルでもったいぶれる）→結果」の流れにする。マルメゴは「橙が出るか（＝手札全捨て）」
      // のドキドキがギャンブルの「宣言色が出るか」とちょうど同じ構図なので、成功（橙なし）は
      // ギャンブル同様に紙吹雪で祝い、失敗（橙あり）は従来どおり結果モーダルで知らせる。
      // publicDrawReturningTokensはtokenIdを返す（手札効果封じ・橙判定に必要）。中央フリップ
      // 公開（gambleReveal）はcardIdを取るので、引いたtokenからcardIdを引き当てて渡す。
      helpers.startSuspenseSound?.();
      // 【#346】以前は「公開エリアへ引く → 中央でじらしフリップ」の順だったので、フリップの前に
      // カードが手札（公開エリア＝手札の扇の末尾）に見えてしまい、ワクワクが無かった。ザ・ギャンブルが
      // #95 で直したのと同じ helpers.publicDrawThenReveal（山にあるうちに中央でフリップ → 公開エリアへ）と、
      // 全部のフリップが終わるまで公開エリアへの描画を遅らせる begin/endPublicDrawDefer に揃える。
      // 手札効果封じ・橙判定にはトークンidが要るので、公開エリアの前後の差分で新しく入った札を特定する
      // （publicDrawReturningTokens と同じやり方）。
      const publicDrawIdsOf = () =>
        new Set(
          getState()
            .tokens.filter((x) => x.kind === "card" && x.location.zone === "publicDraw" && x.location.player === ctx.player)
            .map((x) => x.id)
        );
      const beforeIds = publicDrawIdsOf();
      const revealedCardIds = [];
      const drawAndReveal = async (n) => {
        if (helpers.publicDrawThenReveal) {
          revealedCardIds.push(...(await helpers.publicDrawThenReveal(ctx.player, n)));
          return;
        }
        // 古い helpers しか無い呼び出し元向け（従来の順番のまま）。
        for (const tid of await helpers.publicDrawReturningTokens(ctx.player, n)) {
          const tok = getState().tokens.find((x) => x.id === tid);
          if (tok) {
            await helpers.gambleReveal?.(tok.cardId);
            revealedCardIds.push(tok.cardId);
          }
        }
      };
      let remaining = action.count;
      helpers.beginPublicDrawDefer?.();
      try {
        while (remaining > 0) {
          if (helpers.pickHandEffectOption && remaining > 1) {
            const opt = await helpers.pickHandEffectOption(
              ctx.cardId,
              [
                { id: "one", label: t("ce.L1015"), usable: true },
                { id: "all", label: t("ce.revealRest", { n: remaining }), usable: true },
              ],
              t("ce.L1018") // 「効果を選択」ではなく「公開の仕方」の場面なので専用の見出し（ユーザー指摘2026-08-18）
            );
            if (opt?.id === "all") {
              await drawAndReveal(remaining);
              remaining = 0;
              break;
            }
            // "one"/閉じた(null) → 1枚だけ公開して次へ。
          }
          await drawAndReveal(1);
          remaining -= 1;
        }
      } finally {
        // 全部のフリップが終わった今、公開エリアにまとめて並べる（描画遅延を解除）。
        await helpers.endPublicDrawDefer?.(ctx.player, revealedCardIds);
      }
      const tokenIds = [...publicDrawIdsOf()].filter((id) => !beforeIds.has(id));
      helpers.stopSuspenseSound?.(); // 結果が出るので鼓動を止める
      if (tokenIds.length === 0) return false;
      for (const tokenId of tokenIds) disableHandEffectForTurn(tokenId);
      const hasOrange = tokenIds.some((tokenId) => {
        const token = getState().tokens.find((t) => t.id === tokenId);
        if (!token) return false;
        return token.cardId === "rainbow-shard" || getCardDefinition(token.cardId)?.color === "orange";
      });
      if (hasOrange) {
        const handTokens = getHandTokens(ctx.player);
        // 【#357】2枚以上まとめて捨てる時は、本人に順番を選んでもらう（ユーザー要望「複数枚捨てる時は
        // 順番を指定できるように。総点検を！」）。捨て場は一番上から使われる（山札切れの補充は捨て場を
        // そのまま裏返す＝シャッフルしない）ので、どの順で積むかがそのまま次の一手の価値を変える。
        // ザ・ギャンブルの DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED と同じ考え方・同じ部品。
        // 1枚以下・CPUの番なら pickHandCardsOrdered 側が画面を出さずに決めるので、ここで人間かどうかを
        // 気にしなくてよい。古い呼び出し元（helper が無い）でも不発にしない＝並び順のまま捨てる。
        let orderedHand = handTokens;
        if (handTokens.length >= 2 && helpers.pickHandCardsOrdered) {
          const ordered = await helpers.pickHandCardsOrdered(
            ctx.player,
            t("ce.pickDiscardOrder", { n: 1 }),
            new Set(handTokens.map((tk) => tk.id)),
            { purpose: "discard" }
          );
          if (Array.isArray(ordered) && ordered.length > 0) {
            const seen = new Set(ordered.map((tk) => tk.id));
            orderedHand = [...ordered, ...handTokens.filter((tk) => !seen.has(tk.id))];
          }
        }
        for (const token of orderedHand) {
          await helpers.discardAndSync(token.id, { batchNotice: true }); // #463: 1枚ごとのお知らせは出さず、下の要約1回にまとめる
        }
        // 「あなたはこのターン移動できない」を実際に強制する（不具合#57）。ムーブフェイズの
        // ハイライトと人間の手動移動の確定で弾く（reconcileMovePhase / main.jsのドラッグ・
        // タップ移動、isMovementDisabledThisTurnを参照）。接触は禁止しない（効果文は移動のみ）。
        disableMovementForTurn(ctx.player);
        // お知らせ（ユーザー要望）: 条件成立の結果を対象名付きで。
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.gambleLose", { name: helpers.getPlayerName(ctx.player) })
        );
      } else if (helpers.celebrate) {
        // 橙が出なかった＝手札を捨てずに済んだ（成功）。ザ・ギャンブルの「宣言色が出なかった
        // 時」と同様に紙吹雪＋英語見出しで祝う。
        await helpers.celebrate(ctx.cardId, {
          tone: "success",
          headline: "CONGRATULATIONS!",
          sub: t("ce.gambleSafe", { name: helpers.getPlayerName(ctx.player) }),
        });
      }
      return true;
    }
    case VERBS.ANNOUNCE_MOVEMENT_BOOST_THIS_TURN: {
      // 紫のキューブ ディメンション専用。ユーザー指摘「効果文中の『通常の移動』とは
      // ムーブフェイズで通常行う移動のこと。ジャンプ台みたいに２マス先がハイライト
      // されていなければならない」への対応で、自動処理モードのムーブフェイズが計算する
      // 移動候補（phase-automation.jsのreconcileMovePhase）自体をこのターンの間だけ
      // 2マス先・一気に（atOnce）へ切り替えるようにした（activateMovementBoostForTurn、
      // isMovementBoostActiveThisTurnで参照）。
      activateMovementBoostForTurn(ctx.player);
      // 🔴 1st EDITION（貧民の行進の手札効果）「…移動先のカードはオープンしない。」
      //   範囲を伸ばすのと対で、ムーブフェイズの自動オープンを止める印を立てる。
      if (action.noOpen) suppressMoveOpenForTurn(ctx.player);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t(action.noOpen ? "ce.feMoveBoostNoOpen" : "ce.moveBoost", { name: helpers.getPlayerName(ctx.player) })
      );
      return true;
    }
    case VERBS.LOCK_ONE_HAND_CARD_EXCEPT_FINAL: {
      // 桃のキューブ セレナーデ専用: 手札を1枚選んでロックする（候補の求め方は
      // getLockableHandTokensExceptFinal参照——通常の色一致ルールに従い、「最後の
      // ロック」＝7色目になってしまうスロットは除外済み）。このチェック自体は
      // isHandEffectOptionUsable（発動宣言前）でも同じ関数を使って行っており、
      // 候補が無い状態ではそもそもこの効果自体が発動宣言できない（善処の原則）ため、
      // ここに到達した時点で候補が0件になっているのは主に「宣言直後に他の効果で
      // 状況が変わった」ような稀なケースへの保険。
      const { candidateSlotsFor, tokens } = getLockableHandTokensExceptFinal(ctx.player);
      if (tokens.length === 0) return false;
      // 🔴 1st EDITION（貴族の特権）「…ロックしてもよい、ただし最後のロックはできない。」
      //   optional の時だけ「する／しない」を聞く（既定は今までどおり必ず1枚ロックする）。
      if (action.optional) {
        const 返事 = await helpers.pickChoice?.(
          ctx.cardId,
          [
            { id: "yes", label: t("ce.feLockYes"), usable: true },
            { id: "no", label: t("ce.feLockNo"), usable: true },
          ],
          t("ce.feLockOptional")
        );
        if (返事 !== "yes") return false;
      }
      const lockableTokenIds = new Set(tokens.map((t) => t.id));
      // purpose:"lock" でCPUは「ロックしたい札（虹・要る色）優先」で自動選択（ユーザー要望2026-08-10）。
      const chosen = await helpers.pickHandCard(ctx.player, t("ce.L1086"), lockableTokenIds, { purpose: "lock" });
      if (!chosen) return false;
      const slots = candidateSlotsFor(chosen);
      if (slots.length === 0) return false;
      // ロック先スロットが1つに定まっているカード（通常の色カードは自分の色スロット1つ）は
      // 選ぶ余地が無いので、手札効果のforcePromptに関係なくモーダルを出さず自動でそこへ置く。
      // 七色の欠片のように複数スロットが候補になる（虹＝任意の欠色に置ける）カードだけ、
      // 「ロックする場所を選択してください」を出す。ユーザー要望（2026-08-07）。
      const dest = slots.length === 1 ? slots[0] : await helpers.pickLocation(slots, t("ce.L1094"));
      if (!dest) return false;
      await helpers.moveAndSync(chosen.id, dest);
      return true;
    }
    case VERBS.PICKUP_TO_HAND: {
      // withinCells指定時（橙のキューブ ハーベスト等）は「Nマス以内」に絞る。未指定なら
      // 従来通り盤面全体（収穫と種まき等）。
      let candidates =
        action.withinCells != null ? getCellsWithCardWithinRange(ctx.pieceLocation, action.withinCells) : getAnyCellWithCardCandidates();
      // 🔴 1st EDITION（フェスティバルの【状況】）「相手プレイヤーの**周囲以外**のカードを１枚」。
      //   「周囲」＝縦横斜めの8マス（用語集。「隣」＝前後左右の4マスとは別）。
      //   ⚠ 相手が立っているマスそのものも除く（「周囲」の中心＝その相手のいる所も取れない、
      //     と読んだ。駒の足下の札を抜くのは「周囲以外」の意図から外れるため）。
      if (action.excludeOpponentSurrounding) {
        const 禁止 = new Set();
        for (const tk of getState().tokens) {
          if (tk.kind !== "piece" || tk.player === ctx.player || tk.location?.zone !== "cell") continue;
          禁止.add(tk.location.row + "," + tk.location.col);
          for (const { dr, dc } of enumerateSurroundingOffsets()) {
            禁止.add(tk.location.row + dr + "," + (tk.location.col + dc));
          }
        }
        candidates = candidates.filter((c) => !禁止.has(c.row + "," + c.col));
      }
      if (candidates.length === 0) return false;
      // 🔴 1st EDITION（フェスティバル）「…自分の手札に加えて**もよい**」。
      if (action.optional) {
        const 返事 = await helpers.pickChoice?.(
          ctx.cardId,
          [
            { id: "yes", label: t("ce.feTakeYes"), usable: true },
            { id: "no", label: t("ce.feTakeNo"), usable: true },
          ],
          t("ce.feTakeOptional")
        );
        if (返事 !== "yes") return false;
      }
      // #336（ユーザー報告「収穫の種まきの到達効果でその収穫と種まき自身を回収するのは
      // 勿体無いです！」）。到達効果でこのカード自身のマスを選ぶと二重に損をする——
      //   ①到達効果の既定動作（処理後にこのカード自身を手札に加える）で**どうせ手札に入る**札に
      //     「任意の1枚」を使ってしまう。
      //   ②しかも一度手札へ動かしたことで #203 の判定が働き、既定動作が省かれる＝置き直した札は
      //     盤面に裏向きで残り、**結局そのカードを手に入れられない**。
      // ルール上は選べるので候補からは外さない（人間の選択肢は変えない・#203のテストも通す）。
      // CPUの自動選択でだけ避ける（avoidCells は「他に候補があるなら選ばない」という弱い指定）。
      const selfToken = getState().tokens.find((x) => x.id === ctx.cardTokenId);
      const selfCell =
        selfToken && selfToken.location.zone === "cell"
          ? [{ row: selfToken.location.row, col: selfToken.location.col }]
          : null;
      const chosen =
        candidates.length === 1 && !ctx.forcePrompt
          ? candidates[0]
          : await helpers.pickLocation(candidates, t("ce.L1108"), selfCell ? { avoidCells: selfCell } : undefined);
      if (!chosen) return false;
      // ユーザー報告「収穫と種まきで場のカードを取るとき、そのマスがスタックされて
      // いたら一番上ではなく上から2枚目のカードを取ってしまう」の原因: Array#find()は
      // 配列内で最初に見つかった要素（＝一番古く積まれた、スタックの一番下）を返して
      // しまっていた。main.jsのfindTopCardAt/getCardStackGroupsと同じ「トークン配列の
      // 末尾＝一番最後に動かされた＝一番上」という１番上の原則に合わせ、該当マスの
      // トークンを全て集めてから配列の最後（一番上）を選ぶよう修正した。
      const stackAtCell = getState().tokens.filter(
        (t) =>
          t.kind === "card" &&
          t.location.zone === "cell" &&
          t.location.row === chosen.row &&
          t.location.col === chosen.col
      );
      const token = stackAtCell[stackAtCell.length - 1];
      if (!token) return false;
      const wasFaceUp = token.faceUp; // 手札に入ると自動で表向きになるため、移動前の状態を保持しておく
      // 収穫と種まき等: 拾ったことで下のカードが露出して到達（コンボ）が起きる場合、その到達を
      // 完全に解決してから次のアクション（PLACE＝種まき/同じマスへ置き直す）へ進む。第5引数true。
      // これをしないと露出到達と種まきの手札選択が並行して走り、手札が全トーンオフのまま固着する
      // （ユーザー確認済みルール #85）。
      await helpers.moveAndSync(token.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(token.id, token.cardId, wasFaceUp, ctx.player);
      // #336: 直後の「手札から1枚そのマスへ置く」で**今拾った札をそのまま置き直す**と、
      // 拾って戻すだけの完全な空振りになる（実機ログ T15: 同じ card-91 が手札へ→同じマスへ）。
      // CPUの自動選択でだけ避けるため、拾った札のidを控える。
      ctx.justPickedUpTokenId = token.id;
      if (action.target?.saveAs) {
        ctx.selections[action.target.saveAs] = chosen;
        helpers.markPlacementTarget?.(chosen);
      }
      return true;
    }
    case VERBS.PLACE_CARD: {
      // destination.selection: SAME_AS（収穫と種まき・終わりなき化学ゲンテクニーク等、
      // 同じ効果内の別アクションで既に選んだマスへ置き直す）／CHOOSE（月下の漂流船
      // プリドゥエン等、その場でN個のマスを選ばせる。action.countがマス数）。
      let destinations = [];
      if (action.destination?.selection === TARGET_SELECTIONS.SAME_AS) {
        const dest = ctx.selections[action.destination.ref];
        if (dest) destinations = [dest];
      } else if (action.destination?.selection === TARGET_SELECTIONS.CHOOSE) {
        const pickCount = action.count ?? 1;
        // ユーザー要望「ジャンプ台の手札効果」：「これをゲート以外の任意のマスに」
        // 置く場合、ゲートマスは候補から外す（destination.excludeGates）。
        const cellCandidates = getPlaceCardCellCandidates(action.destination, ctx.pieceLocation);
        // ユーザー報告「プリドゥエン/増殖する樹々は『任意の“2マス”』なのに、同じ1マスに
        // 2枚置けてしまう」。既に選んだマスは次以降の候補から除外し、別々のマスにしか
        // 置けないようにする（＝重複マスは光らない＝選べない）。あわせて、既に選んだマスを
        // もう一度選ぼうとした時にはアラートで知らせる（pickLocationにalertCellsを渡す）。
        const pickedKeys = new Set();
        for (let i = 0; i < pickCount; i++) {
          const available = cellCandidates.filter((c) => !pickedKeys.has(`${c.row},${c.col}`));
          if (available.length === 0) break;
          // #225（ユーザー報告「罠を使った時の『それぞれ違うマス』ってどういう意味？」）:
          // 1枚しか置かないカード（選べる罠・ジャンプ台等）でも「（それぞれ別のマス）」と
          // 出ていて意味が分からなかった。1枚なら余計な但し書きを出さず、複数枚なら
          // 「何枚目か／同じマスには置けない」ことを具体的に伝える。
          const placeHint = pickCount <= 1 ? t("ce.placeOne") : t("ce.placeNth", { i: i + 1, n: pickCount });
          const dest = await helpers.pickLocation(available, placeHint, {
            // #337（ユーザー報告「CPUが増殖する樹々の手札効果で、目指してなさそうなゲートにも
            // 置いたのなんでだろう？」）。用途を渡していなかったため、CPUの自動選択は
            // chooseEffectCell の既定＝「拾う/乗る」用の判断（優先1が相手ゲート）で選んでいた。
            // その結果、参加している**全員のゲートに1枚ずつ**置いていた（実機ログ T17: Dが
            // B・C・Aの3つのゲートに置き、自分のゲートには置いていない）。「置く」は
            // 「そこが着地できるマスになる」手なので、狙っていない相手のゲートに作るのは
            // 相手に足場を配るだけ。cpu-brain.js の purpose:"place" で選び方を切り替える。
            purpose: "place",
            alertCells: [...pickedKeys].map((k) => {
              const [row, col] = k.split(",").map(Number);
              return { row, col };
            }),
            alertMessage: t("ce.L1166"),
          });
          if (!dest) break;
          destinations.push(dest);
          pickedKeys.add(`${dest.row},${dest.col}`);
          // ユーザー報告「増殖する樹々の手札効果で、どのマスが選択済みかわかりづらい」。
          // 選ぶたびにmarkPlacementTargetで「ここに置かれる」目印を積み重ねる。
          helpers.markPlacementTarget?.(dest);
        }
      } else if (action.destination?.selection === TARGET_SELECTIONS.ALL_WITHIN_RANGE) {
        // 増殖する樹々専用: プレイヤーが選ぶのではなく、範囲内の「何もないマス」
        // （カードも駒も無いマス）全てが自動的に対象になる。自分がいるマスは自分の
        // 駒があるため、hasPieceAtの判定で自然に除外される（特別扱い不要）。
        const range = action.destination.withinCells ?? 0;
        for (const { dr, dc } of enumerateManhattanDisk(range)) {
          const row = ctx.pieceLocation.row + dr;
          const col = ctx.pieceLocation.col + dc;
          if (!inBounds(row, col)) continue;
          if (hasCardAt(row, col) || hasPieceAt(row, col)) continue;
          destinations.push({ zone: "cell", row, col });
        }
      } else if (action.destination?.selection === TARGET_SELECTIONS.OWN_GATE) {
        // 0th拡張（ゲートチャージ）: 「あなたのゲートに置く」。選ぶ余地が無いので聞かない。
        const myGate = GATE_POSITIONS[SEAT_TO_SIDE[ctx.player]];
        if (!myGate) return false;
        destinations = [{ zone: "cell", row: myGate.row, col: myGate.col }];
      } else if (action.destination?.selection === TARGET_SELECTIONS.OWN_EMPTY_LOCK_SLOTS) {
        // 黒の契約の烙印専用: 自分のロックエリアの空いているスロット（色不問）から選ぶ。
        const candidates = getOwnEmptyLockSlotCandidates(ctx.player);
        if (candidates.length === 0) return false; // 善処の原則: 空きが無ければ何もしない
        const dest = await helpers.pickLocation(candidates, t("ce.L1191"));
        if (dest) destinations = [dest];
      } else {
        console.warn(t("ce.L1194"), action);
        return false;
      }
      if (destinations.length === 0) return false;
      for (const dest of destinations) {
        if (action.source === "self") {
          // ジャンプ台の手札効果／黒の契約の烙印の到達効果専用: このカード自身
          // （効果カード本体）を盤面またはロックエリアへ置く。他の手札からの選択とは
          // 違い相手に選ばせる必要が無い。destは既に正しい形（cellまたはlock）で
          // 渡ってくるため、ここで作り直さずそのまま使う。
          // 【#468】表向きで置くと分かっている時は、**飛んでいる間から表の面**を見せる。
          await helpers.moveAndSync(ctx.cardTokenId, dest, undefined, undefined, false, false, action.faceUp ? { landFaceUp: true } : null);
          // 表向き指定の時だけ明示的にめくる。ただしflipCardはトグルなので、置いた先の
          // 既定の向き(state.jsのfaceUpForLocation)によって向きが変わる:
          //   - cell/手札 … 既定は裏向き → flipで表向きになる（ジャンプ台の手札効果等、正しい）
          //   - lock     … 既定は表向き(faceUpForLocation lock=true) → ここで無条件にflipすると
          //                 逆に裏返ってしまう（不具合#71: 黒の契約の烙印がロックエリアに裏向きで
          //                 置かれた）。
          // よって「今まさに裏向きの時だけ表にする」ようにして、ゾーンによらず必ず表向きで
          // 終わるようにする。
          if (action.faceUp) {
            const placed = getState().tokens.find((t) => t.id === ctx.cardTokenId);
            if (placed && placed.faceUp === false) {
              await helpers.flipCard?.(ctx.cardTokenId);
            }
            // ユーザー報告「ジャンプ台を自分の駒の下に表向きで置いたのに到達効果が
            // 発動しなかった」（続き62）。通常のドラッグ配置と同じく、置いた先に
            // 既に駒がいれば到達を発動させる（ロックエリアには駒がいないので実質cellのみ）。
            await helpers.maybeTriggerArrivalForPlacedCard?.(dest, ctx.cardId);
          }
          // ユーザー要望2026-08-16「置く系の効果はどこに置いたか行動ログに記載してほしい」。
          // source:"self"は効果カード自身＝公開情報なので名前を出す（faceUp指定なら表向き）。
          logAction("place", { player: ctx.player, cardId: ctx.cardId, location: dest, faceDown: !action.faceUp, revealName: true });
        } else if (action.source === "hand") {
          // #336: 直前に拾った札をそのまま置き直すのは完全な空振り。CPUの自動選択でだけ避ける
          // （人間は今までどおり選べる＝#203のテストが通る）。
          const handToken = await helpers.pickHandCard(
            ctx.player,
            t("ce.L1227"),
            undefined,
            ctx.justPickedUpTokenId ? { avoidTokenIds: [ctx.justPickedUpTokenId] } : undefined
          );
          if (!handToken) continue;
          await helpers.moveAndSync(handToken.id, { zone: "cell", row: dest.row, col: dest.col });
          // 手札から裏向きで置いた＝中身は非公開。座標だけ記録し、名前は伏せる（cardIdを含めない）。
          logAction("place", { player: ctx.player, location: { zone: "cell", row: dest.row, col: dest.col }, faceDown: true, revealName: false });
        } else {
          // "deck"（山札）: 手札からではなく山札の一番上を直接そのマスへ置く。
          await helpers.placeFromDeck(dest);
          // 山札から裏向きで置いた＝中身は非公開。座標だけ記録し、名前は伏せる。
          logAction("place", { player: ctx.player, location: dest, faceDown: true, revealName: false });
        }
        // ユーザー要望「配置後ここに配置したよがわかるように配置場所をしっかり
        // ハイライトしてください。マスの枠だけでなくカードの面も」。マスハイライト用の
        // ため、盤面（cell）への配置の時だけ呼ぶ（黒の契約の烙印のロックエリア配置は
        // 対象外——row/colを持たないロックスロットは元々この演出の対象外）。
        if (dest.zone === "cell") helpers.markPlacedLocation?.(dest);
      }
      return true;
    }
    case VERBS.SWAP_POSITION: {
      // 「入れ替え」であり「移動」ではないため（docs/cards.md補足）、到達判定は連鎖させない
      // （ctx.arrivedAtをセットしない）。
      const candidates = getOpponentPieceCellsWithinRange(ctx.pieceLocation, action.count, ctx.player);
      if (candidates.length === 0) return false;
      // 以前（続き31）はユーザー要望「３マス以内の相手をハイライトしてプレイヤーに
      // 選ばせるステップを踏んでください（対象が１人でも）」に沿い、候補が1人でも
      // 常にプレイヤーに選ばせていた。ユーザー要望（続き93）「マスチェンジで対象が
      // 1人しかいない場合はスリカエ時同様にその旨モーダルで示し自動選択で」で方針を
      // 転換。スリカエ（SWAP_RANDOM_HAND_CARD）と全く同じ「選べる相手が1人しかいない
      // 場合は自動選択し、その旨をモーダルで示す」パターンに揃える——スリカエ自身も
      // 到達・手札効果どちらの経路でもforcePromptに関係なく自動選択するため、ここでも
      // ctx.forcePromptは見ない（続き93の総点検で、「相手を選ぶ」系の効果の中で
      // このパターンが抜けていたのはマスチェンジだけと確認済み）。
      let target;
      if (candidates.length === 1) {
        target = candidates[0];
        helpers.announceEffectNotice?.(ctx.cardId, t("ce.L958")); // 続き214: 非ブロック（直後の選択をすぐ可能に）
      } else {
        // #207: マスチェンジは入れ替える**相手（の駒）**を選ぶ。
        target = await helpers.pickLocation(candidates, t("ce.L1265"), { pickTarget: "piece" });
      }
      if (!target) return false;
      // お知らせ用に入れ替え相手を先に捕まえる（swapPieces後は駒が動くため）。
      const swapTargetPlayer = findPieceAtCell(target.row, target.col)?.player;
      const fromLoc = { zone: "cell", row: ctx.pieceLocation.row, col: ctx.pieceLocation.col }; // 発動者の元マス(M)。相手はここへ入れ替わる。
      await helpers.swapPieces(ctx.pieceTokenId, ctx.pieceLocation, target);
      ctx.pieceLocation = target;
      if (swapTargetPlayer)
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.swapped", { a: helpers.getPlayerName(ctx.player), b: helpers.getPlayerName(swapTargetPlayer) })
        );
      // #163（ユーザー指定2026-08-23）: マスチェンジ自身の回収は「入れ替えが終わった直後＝入れ替え
      // 先の到達効果が発動する直前」に行う。従来はrunArrivalEffectの既定add-to-hand（全アクション後）で
      // 回収していたため、発動者(A)の入れ替え先(target)の到達効果チェーンが全て終わってからようやく
      // マスチェンジが手札へ吸われる＝順序が不自然だった。ここで先に回収する（cellから外れるので
      // 既定add-to-handは自動でスキップされる）。回収の露出コンボは抑止し（skipExposedArrival）、
      // B(相手)の入れ替え先(M=fromLoc)の到達は下のmassChangeStillOnBoard=false分岐で発動者ぶんの後に
      // 明示的に発動させる＝A→Bの処理順（発動者→時計回り）を保つ。手札効果版はこの時点で既に捨て済み
      // （zone!=="cell"）なので、この回収ブロックは自動的にスキップされる（到達版だけが対象）。
      if (getState().tokens.find((t) => t.id === ctx.cardTokenId)?.location?.zone === "cell") {
        const collected = getState().tokens.find((t) => t.id === ctx.cardTokenId);
        const addedCardId = collected?.cardId;
        const wasFaceUp = !!collected?.faceUp;
        await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: ctx.player }, null, false, false, true);
        helpers.announceCardAddedToHand?.(addedCardId, ctx.player, wasFaceUp);
      }
      // ユーザー指定ルール2026-08-08（マスチェンジの入れ替えと到達効果）＋#163（2026-08-23）:
      // ・入れ替えは「移動」ではないので裏向きカードは開かない（表向きの時だけ到達効果が発動）。
      // ・マスチェンジ自身は上のブロックで既に回収済み（到達版・手札効果版とも盤上に無い）＝
      //   massChangeStillOnBoard は false。
      // ・発動者(A)は入れ替わり先(target)の表向きカードの到達効果を得る。
      // ・相手(B)は入れ替わり先(M=fromLoc)の表向きカードの到達効果を得る（マスチェンジが回収されて
      //   露出した、その下の表向きカード）。
      // ・入れ替えは同時なので両者の入れ替わり先に表向きカードがあれば両者発動。処理順は処理順の
      //   原則（発動者→時計回り）に従うため、先に発動者(A)ぶんを処理してから相手(B)ぶんを処理する。
      await helpers.triggerArrivalAtIfFaceUp?.(target, ctx.player);
      const massChangeStillOnBoard =
        getState().tokens.find((t) => t.id === ctx.cardTokenId)?.location?.zone === "cell";
      if (!massChangeStillOnBoard && swapTargetPlayer) {
        await helpers.triggerArrivalAtIfFaceUp?.(fromLoc, swapTargetPlayer);
      }
      return true;
    }
    case VERBS.LOCK_PAIR: {
      // なないろの欠片専用: これを含めた同名2枚を、任意の1箇所（自分のロックエリアの
      // 好きな色スロット、通常の1色1枚の占有チェックは対象外の特殊ロック）へまとめて置く。
      // 【2026-09-04】相方の探索範囲を「使えるか」の判定(requiresPairInHand→getHandTokens)と
      // 揃える。以前はここだけ zone==="hand" に限っていたため、2枚目が手札公開エリア
      // (publicDraw)にあると「選択肢は出るのに選ぶと何も起きない」状態になっていた。
      const partner = getHandTokens(ctx.player).find(
        (t) => t.cardId === "rainbow-shard" && t.id !== ctx.cardTokenId
      );
      if (!partner) return false;
      const candidates = getOwnLockSlotCandidates(ctx.player);
      const dest = await helpers.pickLocation(candidates, t("ce.L1094"));
      if (!dest) return false;
      await helpers.moveAndSync(ctx.cardTokenId, dest);
      await helpers.moveAndSync(partner.id, dest);
      return true;
    }
    // 1st EDITION（貧しき心）: 「あなたの財力が１番小さいなら２枚ドロー。」
    case VERBS.DRAW_IF_LOWEST_WEALTH: {
      if (!isLowestWealth(ctx.player)) return false;
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.lowestWealthDraw", { name: helpers.getPlayerName(ctx.player), n: action.count ?? 1 })
      );
      await helpers.drawCards(ctx.player, action.count ?? 1);
      return true;
    }
    case VERBS.DRAW_IF_FEWEST_LOCKED: {
      if (!isFewestLocked(ctx.player)) return false;
      // ユーザー要望「カウンターロックの到達効果について『あなたは１番少なくロック
      // しているので１枚ドローします』みたいなモーダルを出してからドローして
      // ください」。判定条件（盤面全体のロック枚数比較）は見ただけでは分からないため、
      // 先に理由を説明してから実際にドローする。
      // ユーザー要望2026-08-08「相手がカウンターロックに到達した時、自分の画面で『あなた』ではなく
      // そのプレイヤー名を表示してほしい」。効果の主語は発動者(ctx.player)。オンラインではこの文言を
      // 全員へ中継する（announceEffectReason）ため、「あなた」だと受け手全員に「あなた」と出て
      // しまう。常に発動者の名前で表示する。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.fewestDraw", { name: helpers.getPlayerName(ctx.player) })
      );
      await helpers.drawCards(ctx.player, 1);
      return true;
    }
    case VERBS.SWAP_RANDOM_HAND_CARD: {
      // 手品師の技専用。ユーザー要望「駒ではなくアバターを選択して相手を選ぶ」への
      // 対応で、マス/駒ベースのpickLocationではなく専用のpickPlayer（アバターを
      // クリックして選ぶ）を使う。実際の手札交換（相手の手札を裏向きのまま画面中央に
      // 表示して選ばせる「儀式」演出＋自分から渡すカードは自分で選べる）はhelpers側
      // （main.jsのswapHandCardWithOpponentForEffect）に委ねる。
      const opponents = getState().activePlayers.filter((p) => p !== ctx.player);
      if (opponents.length === 0) return false;
      // ユーザー要望「相手が誰も手札を持っていないときのスリカエは不発モーダルにしたい」。
      // 交換相手として意味があるのは手札を1枚以上持つ相手だけ。全員が0枚なら不発にする
      // （以前は相手が1人だと『相手が1人のため～』と出して空振りしていた）。
      const handCountOf = (p) =>
        getState().tokens.filter((t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === p).length;
      const swappableOpponents = opponents.filter((p) => handCountOf(p) > 0);
      if (swappableOpponents.length === 0) {
        await helpers.announceFizzle?.(ctx.cardId);
        return false;
      }
      let targetPlayer;
      if (swappableOpponents.length === 1) {
        // ユーザー要望「スリカエなどで相手を選ぶ効果の場合で選べる相手が１人しかいない
        // 場合は自動でその人を選択してください。そしてその旨をモーダルで示してください」（続き65）。
        targetPlayer = swappableOpponents[0];
        helpers.announceEffectNotice?.(ctx.cardId, t("ce.L1364")); // 続き214: 非ブロック（直後の奪う札選択をすぐ可能に）
      } else {
        targetPlayer = await helpers.pickPlayer(swappableOpponents, t("ce.L1366"));
      }
      if (!targetPlayer) return false;
      await helpers.swapRandomHandCard(ctx.player, targetPlayer);
      // お知らせ（ユーザー要望）: 誰と誰が手札を交換したか。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.swappedHands", { a: helpers.getPlayerName(ctx.player), b: helpers.getPlayerName(targetPlayer) })
      );
      return true;
    }
    case VERBS.DRAW_ALL_FEWEST_LOCKED: {
      // プレゼント専用: カウンターロック（DRAW_IF_FEWEST_LOCKED、効果の使用者本人だけ
      // 判定）と違い、「該当する全員」がそれぞれドローする。処理順の原則（docs/cards.md
      // 「複数のプレイヤーを対象にした効果は原則、効果の使用者から時計回りに処理する」）
      // に沿うよう、SEAT_ORDERをctx.playerから時計回りに並べ替えてから絞り込む。
      const qualifying = rotatedActivePlayersFrom(ctx.player).filter((p) => isFewestLocked(p));
      if (qualifying.length === 0) return false;
      // ユーザー要望2026-08-07「プレゼントの到達効果で誰がドロー対象なのか画面中央にアバターで
      // 周知したい」。対象者のアバターを並べて見せる（未対応環境では従来のテキスト通知に戻す）。
      if (helpers.announceDrawTargets) {
        await helpers.announceDrawTargets(qualifying, t("ce.L1387"));
      } else {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.L1389"));
      }
      for (const p of qualifying) {
        await helpers.drawCards(p, 1);
      }
      return true;
    }
    case VERBS.DISCARD_ALL_FACEUP_ON_BOARD: {
      // 白の意思の覚醒専用: 盤面マスにある表向きのカード全てを捨てる（１番上の原則により
      // 「場」＝盤面マスの一番上のカードだけが対象、という前提はgetState().tokensの
      // location.zone==="cell"フィルタで自然に満たされる——重なりの下側は元々別トークンの
      // faceUp状態を問わず対象に含めてよいわけではないが、この効果は「表向きのカード」
      // 全部が対象という素直な読みのため、重なりの上下は区別せずfaceUp:trueの盤面
      // カード全てを対象にする）。
      const candidates = getState().tokens.filter((t) => t.kind === "card" && t.location.zone === "cell" && t.faceUp);
      if (candidates.length === 0) return false;
      // 【#357・2026-09-28】こちらは対象が**全部表向き**（効果の文が「場の全ての表向きのカード」）
      // なので、2枚以上あれば必ず捨てる順番を聞く。盤面じゅうに散らばっているため、盤面を探して
      // 押して回るのではなくモーダルに一覧で並べて選ばせる（requestBoardCardsOrderedForEffect）。
      let orderedCandidates = candidates;
      if (candidates.length >= 2 && helpers.pickBoardCardsOrdered) {
        const ordered = await helpers.pickBoardCardsOrdered(ctx.player, t("ce.pickDiscardOrder", { n: 1 }), candidates, {
          purpose: "discard",
        });
        if (Array.isArray(ordered) && ordered.length > 0) {
          const seen = new Set(ordered.map((tk) => tk.id));
          orderedCandidates = [...ordered, ...candidates.filter((tk) => !seen.has(tk.id))];
        }
      }
      for (const token of orderedCandidates) {
        await helpers.discardAndSync(token.id, { batchNotice: true }); // #463: 1枚ごとのお知らせは出さず、下の要約1回にまとめる
      }
      // お知らせ（ユーザー要望）: 盤面一括変化の要約。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.L1409"));
      return true;
    }
    case VERBS.DISCARD_SELF: {
      // なないろの巨光・色落ちキャット専用: 既定動作（手札に加える）の代わりに
      // このカード自身を捨てる（effectDef.addsCardToHandAfter:falseと対で使う）。
      await helpers.discardAndSync(ctx.cardTokenId);
      return true;
    }
    case VERBS.ALL_PLAYERS_DISCARD_HAND_AND_DRAW: {
      // 色落ちキャット専用: 参加者全員が手札を全て捨ててから指定枚数ドローする
      // （処理順の原則に沿い、効果の使用者から時計回りに1人ずつ処理する）。
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        // 【#357・2026-09-28】捨てる順番はその人自身に選んでもらう。**使用者の画面では聞けない**——
        // オンラインでは相手の手札は cardId がマスクされていて中身が見えないため（意図的な仕様）。
        // 合同建設・スラム上がりの役人と同じ delegateToPlayer に乗せて、本人の画面で聞く。
        if (helpers.delegateToPlayer) await helpers.delegateToPlayer(p, "discard-hand-ordered");
        // 委任が届かなかった／時間切れだった／委任の仕組みを持たない呼び出し元でも、
        // 「手札を全て捨てる」というルールは必ず守る（残っていればここで捨てる。通常は空振り）。
        for (const token of getHandTokens(p)) {
          await helpers.discardAndSync(token.id);
        }
        await helpers.drawCards(p, action.count);
      }
      // お知らせ（ユーザー要望）: 全員の手札が変わったこと。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.discardAllAndDraw", { n: action.count }));
      return true;
    }
    case VERBS.DISCARD_OWN_HAND_DOWN_TO: {
      // 厳重警戒（0th拡張）「あなたの手札が１枚になるように捨てる。」
      // 作りは DISCARD_HALF_HAND と同じ（2枚以上なら順番を付けてまとめて選ぶ＝#344）。
      // 「手札」は公開ドロー置き場も含む（getHandTokens の定義＝続き55）。
      // 🔴 1st EDITION で2つ足した:
      //   ① action.count ＝「ちょうどN枚捨てる」（治安悪化の「手札を４枚捨てる」・
      //      デプレッション「手札を１枚捨てる」）。手札がそれより少なければ**あるだけ**（善処の原則）。
      //   ② action.random ＝「**無作為に**捨てる」（路地裏のスラム街・飛空艇アルヴァ）。
      //      選ばせずにこちらで引く＝本人も何が捨てられるか選べない。
      // ⚠ action.keep（今までの形＝「N枚になるように捨てる」）はそのまま。
      const handTokens2 = getHandTokens(ctx.player).filter((tk) => !action.exceptSelf || tk.id !== ctx.cardTokenId);
      const discardCount2 =
        action.count != null
          ? Math.min(await amountOf(action, ctx, helpers), handTokens2.length)
          : Math.max(0, handTokens2.length - (action.keep ?? 0));
      if (discardCount2 === 0) return false; // 既にその枚数以下＝何もしない（善処の原則）
      const discardedNames2 = [];
      let ordered2 = null;
      if (action.random) {
        // 無作為に discardCount2 枚（Fisher-Yates で並べ替えてから頭から取る）。
        const 袋 = [...handTokens2];
        for (let i = 袋.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [袋[i], 袋[j]] = [袋[j], 袋[i]];
        }
        ordered2 = 袋.slice(0, discardCount2);
      } else if (discardCount2 >= 2 && helpers.pickHandCardsOrdered) {
        const picked = await helpers.pickHandCardsOrdered(
          ctx.player,
          t("ce.pickDiscardOrderN", { n: discardCount2 }),
          handTokens2.map((tk) => tk.id),
          { limit: discardCount2 }
        );
        if (Array.isArray(picked) && picked.length > 0) ordered2 = picked.slice(0, discardCount2);
      }
      if (ordered2) {
        for (const token of ordered2) {
          discardedNames2.push(cardDisplayName(token.cardId));
          await helpers.discardAndSync(token.id);
        }
      } else {
        // ⚠ exceptSelf を渡した時は、まとめて選ぶ側だけでなくここでも候補を絞る
        //   （2か所に同じ条件を書かない＝同じ handTokens2 から作る）。
        const 候補id2 = action.exceptSelf ? new Set(handTokens2.map((tk) => tk.id)) : undefined;
        for (let i = 0; i < discardCount2; i++) {
          const chosen = await helpers.pickHandCard(ctx.player, t("ce.pickDiscardN", { n: discardCount2 - i }), 候補id2);
          if (!chosen) break;
          discardedNames2.push(cardDisplayName(chosen.cardId));
          await helpers.discardAndSync(chosen.id);
        }
      }
      if (discardedNames2.length === 0) return false;
      // 捨て札は公開情報なので、何を捨てたかを全員へ告知する（選べる罠と同じ形）。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.trapDiscarded", { name: helpers.getPlayerName(ctx.player), cards: discardedNames2.join("」「") })
      );
      return true;
    }
    case VERBS.DISCARD_HALF_HAND: {
      // 選べる罠専用: 手札の半分（端数切り捨て、docs/rulebook.md「手札の半分」の
      // 定義通り）を、自分で選んで捨てる（ゲート侵攻ボーナスの「無作為に奪う」とは
      // 違い、これは自分自身の手札を自分で選ぶ効果のため隠し情報の抽選は不要）。
      const handTokens = getHandTokens(ctx.player);
      const discardCount = Math.floor(handTokens.length / 2);
      if (discardCount === 0) return false;
      const discardedNames = [];
      // 【2026-09-29・続き545・ユーザー要望「総点検を」】2枚以上捨てる時は、1枚ずつ確認を
      // 繰り返すのをやめ、順番を付けて最後に1回確定する画面にする（#344・役人と同じ形）。
      // 捨てる枚数は「手札の半分」で決まっているので limit を渡す。
      // 古い pickHandCardsOrdered を持たない呼び出し元でも動くよう、1枚ずつの経路は残す。
      let ordered = null;
      if (discardCount >= 2 && helpers.pickHandCardsOrdered) {
        const picked = await helpers.pickHandCardsOrdered(
          ctx.player,
          t("ce.pickDiscardOrderN", { n: discardCount }),
          handTokens.map((tk) => tk.id),
          { limit: discardCount }
        );
        if (Array.isArray(picked) && picked.length > 0) ordered = picked.slice(0, discardCount);
      }
      if (ordered) {
        for (const token of ordered) {
          discardedNames.push(cardDisplayName(token.cardId));
          await helpers.discardAndSync(token.id);
        }
      } else {
        for (let i = 0; i < discardCount; i++) {
          const chosen = await helpers.pickHandCard(ctx.player, t("ce.pickDiscardN", { n: discardCount - i }));
          if (!chosen) break;
          discardedNames.push(cardDisplayName(chosen.cardId));
          await helpers.discardAndSync(chosen.id);
        }
      }
      // お知らせ（ユーザー要望「選べる罠で何を捨てたか全員にモーダルで一覧表示したい」）:
      // 捨て札は公開情報のため、捨てたカードの一覧を全員へ告知する（effect_reasonモーダル）。
      if (discardedNames.length > 0) {
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.trapDiscarded", { name: helpers.getPlayerName(ctx.player), cards: discardedNames.join("」「") })
        );
      }
      return true;
    }
    case VERBS.FORCED_MOVE_TO_OWN_GATE: {
      // 選べる罠専用: 自分のゲートへ強制移動する。「移動」であり接触の強制移動と同じく
      // 到達判定は連鎖する（docs/cards.mdにSWAP_POSITION等のような「到達効果を得ない」
      // 旨の記載が無いため）。
      const gate = GATE_POSITIONS[SEAT_TO_SIDE[ctx.player]];
      const dest = { zone: "cell", row: gate.row, col: gate.col };
      if (ctx.pieceLocation.row === dest.row && ctx.pieceLocation.col === dest.col) return false; // 善処の原則: 既に自分のゲートにいるなら何もしない
      // 🔴 厳重警戒（0th拡張）の「移動先のカードはオープンしない」用。
      //   ctx.arrivedAt を立てると、呼び出し元（main.js）が移動先の到達処理をする＝
      //   裏向きのカードを自動でオープンしてしまう（続き70 の『自動処理では移動・強制移動の
      //   移動先が裏なら原則自動でオープン』）。立てなければ、ただ駒が移るだけになる。
      //   あわせて state 側にも印を残す（suppressArrival）——オンラインで他クライアントの
      //   remote-move-animator が『表向きカードの上にいる＝到達した』と誤判定しないため
      //   （state.js の MOVE_TOKEN のコメント参照）。
      await helpers.moveAndSync(ctx.pieceTokenId, dest, undefined, !!action.noArrival);
      ctx.pieceLocation = dest;
      if (!action.noArrival) ctx.arrivedAt = dest;
      return true;
    }
    case VERBS.DISCARD_ONE_LOCKED_CARD: {
      // 選べる罠専用: 自分のロックしているカードから1枚選んで捨てる。lock_pair等と同じく
      // ロックスロットの形（{zone:"lock",side,index}）をそのままpickLocationの候補として使う。
      // ファースト/エターナルカードは他のカードの効果の対象にならないため候補から除外する
      // （docs/rulebook.md、isArrivalOptionUsableのrequiresHasLockedCard判定と揃える）。
      const side = SEAT_TO_SIDE[ctx.player];
      const lockedTokens = getState().tokens.filter(
        (t) => t.kind === "card" && t.location.zone === "lock" && t.location.side === side && isTargetableByOtherCardEffects(t.cardId)
      );
      if (lockedTokens.length === 0) return false;
      const candidates = lockedTokens.map((t) => t.location);
      const dest = candidates.length === 1 ? candidates[0] : await helpers.pickLocation(candidates, t("ce.L1479"));
      if (!dest) return false;
      const chosen = lockedTokens.find((t) => t.location.side === dest.side && t.location.index === dest.index);
      if (!chosen) return false;
      await helpers.discardAndSync(chosen.id);
      // お知らせ（ユーザー要望「選べる罠で何を捨てたか全員にモーダルで表示したい」）:
      // ロック上のカードは元々公開情報。捨てたカードを全員へ告知する。
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.trapDiscardedLock", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(chosen.cardId) })
      );
      return true;
    }
    case VERBS.DRAW_IF_OPENED_THIS_TURN: {
      // バスストップ（0th拡張）「このターンにこれがオープンされたのなら、１枚ドロー。」
      // ⓘ 裏向きのバスストップへ移動した時は、移動の処理の中でオープンされる＝記録が付く。
      //   既に表向きだったバスストップに到達した時は記録が無い＝ドローしない。
      if (!wasCardOpenedThisTurn(ctx.cardTokenId)) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.notOpenedThisTurn"));
        return false;
      }
      await helpers.drawCards(ctx.player, action.count ?? 1);
      return true;
    }
    case VERBS.CHOSEN_OPPONENT_DOES_MOVE_PHASE_FOR_YOU: {
      // ヴィヴィアン（0th拡張）。「相手を１人選ぶ。その相手はムーブフェイズを行う。
      //   その相手が到達したカードを自分の手札に加えるなら、代わりにそのカードを
      //   あなたの手札に加える。」
      // ⚠ 「ムーブフェイズを行う」を、このアプリでは**1マス移動→オープン→到達**に
      //   まとめている（接触を選ぶ道は作っていない＝申し送り）。
      const opponents = getState().activePlayers.filter((p) => p !== ctx.player);
      if (opponents.length === 0) return false;
      const target =
        opponents.length === 1 && !ctx.forcePrompt
          ? opponents[0]
          : await helpers.pickPlayer(opponents, t("ce.ex0PickOpponent"));
      if (!target) return false;
      const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === target);
      if (!piece || piece.location.zone !== "cell") return false;
      // 「移動」なので行き先はカードのあるマスだけ（「強制移動」とは別＝用語集）。
      const cands = getMoveCandidates(piece.location, 1, false);
      if (cands.length === 0) return false; // 善処の原則
      // どこへ動くかは**その相手が決める**（委任）。
      const 返事 = await helpers.delegateToPlayer(target, "choose-cell", {
        candidates: cands,
        hintKey: "ce.ex0VivianMove",
        forPlayer: target,
      });
      const dest = 返事 && typeof 返事.row === "number" ? { zone: "cell", row: 返事.row, col: 返事.col } : null;
      if (!dest) return false;
      await helpers.moveAndSync(piece.id, dest);
      // 移動先が裏向きならオープンする（「移動」はオープンを伴う＝用語集）。
      const top = findTopCardAtCell(dest.row, dest.col);
      if (top && !top.faceUp) await helpers.flipCard?.(top.id);
      // 🔴 ここから、その相手の到達の**既定の手札入り先をこちらへ**付け替える。
      //   必ず finally で戻す（戻し忘れると、以降ずっと他人の到達札がこちらへ来る）。
      arrivalHandRedirect = { from: target, to: ctx.player };
      try {
        await helpers.triggerArrivalAtIfFaceUp?.(dest, target);
      } finally {
        arrivalHandRedirect = null;
      }
      return true;
    }
    case VERBS.DISABLE_LOCK_THIS_TURN_FOR_DECLARER: {
      // やり直しのカギ（0th拡張）手札効果。「その相手はこのターンにロックできない。」
      const 宣言者 = getLockDeclarerInWindow(ctx.player);
      if (!宣言者) return false;
      disableLockForTurn(宣言者);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.ex0LockDisabled", { name: helpers.getPlayerName?.(宣言者) ?? 宣言者 })
      );
      return true;
    }
    case VERBS.CANCEL_ARRIVAL_EFFECT: {
      // リーチキャンセル（0th拡張）手札効果。
      // 🔴 **この動詞は、ここでは実行しない。** 実際の処理は main.js の
      //   offerArrivalCancelInterrupt（到達効果を走らせる直前の専用の窓）が行う——
      //   「効果を無効にする」は、効果が始まる前に止めるしかないので、効果の中からは
      //   自分を止められない。ここに来るのは想定外なので、何もしないで不発にする
      //   （黙って通さない＝安全側）。この動詞を置いてあるのは効果文を組み立てるため。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0NeedArrivalWindow"));
      return false;
    }
    case VERBS.REGISTER_PEACE_WISH: {
      // 平和への願い（0th拡張）到達効果。ここでは**印を付けるだけ**。
      // 実際の判定は main.js の resolvePeaceWishesAtTurnStart（ターンが切り替わった瞬間）。
      registerPeaceWish(ctx.cardTokenId, ctx.player);
      await helpers.announceEffectNotice?.(ctx.cardId, t("ce.ex0PeaceWishRegistered"));
      return true;
    }
    case VERBS.CONTACT_CHOSEN_OPPONENT_IN_SURROUNDING: {
      // 紅の鉄拳（0th拡張）。「あなたの周囲の相手を１人選ぶ。その相手に接触する。」
      // ⚠ 接触そのものは今までの流れ（宣言→相手の承認→奪う→ゲートへ強制移動）に乗せる。
      // 🔴 到達効果②で奪う枚数は**通常どおり1枚**（2026-11-02 ユーザー回答）。
      //   手札効果【追色S】だけ「接触で奪えるカードはSの２倍の枚数である」なので、
      //   stealMultiplier を立てたデータでだけ、払った追色の枚数（S）×2 を渡す。
      //   ⓘ 奪う処理はローカルが state.js の RESPOND_CONTACT、オンラインは Edge Function が
      //     行う（隠し情報の抽選のため）。どちらも pendingContact.stealCount を見る。
      if (isContactDisabledThisTurn(ctx.player)) return false;
      const cells = getOpponentPieceCellsInSurrounding(ctx.pieceLocation, ctx.player);
      if (cells.length === 0) return false; // 善処の原則
      const cell =
        cells.length === 1 && !ctx.forcePrompt ? cells[0] : await helpers.pickLocation(cells, t("ce.ex0PickContactTarget"));
      if (!cell) return false;
      const piece = findPieceAtCell(cell.row, cell.col);
      if (!piece?.player) return false;
      if (!helpers.initiateContact) return false;
      const 奪う枚数 = action.stealMultiplier ? Math.max(1, (ctx.addColorPaid ?? 1) * action.stealMultiplier) : undefined;
      // 🔴【#561・2026-11-11】**奪う枚数を1行で知らせる。**
      //   カード面には「（接触で奪えるカードはＳの２倍の枚数である）」と印字されているが、
      //   **払った S がいくつで、結局何枚になるのか**は画面のどこにも出ていなかった。
      //   ⚠ ふだんの接触（1枚）では出さない——毎回出ると邪魔なだけ。到達効果②も1枚なので出ない。
      if (奪う枚数 && 奪う枚数 > 1) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0StealCountN", { s: ctx.addColorPaid ?? 1, n: 奪う枚数 }));
      }
      await helpers.initiateContact(ctx.player, piece.player, 奪う枚数);
      return true;
    }
    case VERBS.PICKUP_ADJACENT_CARDS_TO_HAND: {
      // マックール（0th拡張）到達効果。「あなたの隣のマスのカードを２枚、あなたの手札に加える。」
      // ⓘ 「隣」＝前後左右の4マス。同じマスに2枚積まれていれば、同じマスを2回選んでもよい
      //   （毎回その時の一番上を取る＝１番上の原則）。
      const want = action.count ?? 1;
      let 取った = 0;
      for (let i = 0; i < want; i++) {
        const cells = [];
        for (const { dr, dc } of DIRECTIONS) {
          const row = ctx.pieceLocation.row + dr;
          const col = ctx.pieceLocation.col + dc;
          if (inBounds(row, col) && hasCardAt(row, col)) cells.push({ zone: "cell", row, col });
        }
        if (cells.length === 0) break; // 善処の原則
        const cell =
          cells.length === 1 && !ctx.forcePrompt
            ? cells[0]
            : await helpers.pickLocation(cells, t("ce.ex0PickAdjacentCard", { i: i + 1, n: want }));
        if (!cell) break;
        const top = findTopCardAtCell(cell.row, cell.col);
        if (!top) break;
        const 元は表 = top.faceUp;
        await helpers.moveAndSync(top.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(top.id, top.cardId, 元は表, ctx.player);
        取った++;
      }
      return 取った > 0;
    }
    case VERBS.FORCED_MOVE_TO_SURROUNDING_OF_CHOSEN_OPPONENT: {
      // マックール（0th拡張）手札効果。「相手を１人選ぶ。その相手の周囲に強制移動する。」
      // ⓘ 「周囲」＝斜めも含む8マス。「強制移動」なのでカードが無いマスにも行ける。
      const oppCells = getAllOpponentPieceCells(ctx.player);
      if (oppCells.length === 0) return false;
      const 相手マス =
        oppCells.length === 1 && !ctx.forcePrompt
          ? oppCells[0]
          : await helpers.pickLocation(oppCells, t("ce.ex0PickOpponentPiece"));
      if (!相手マス) return false;
      const dests = enumerateSurroundingOffsets()
        .map(({ dr, dc }) => ({ row: 相手マス.row + dr, col: 相手マス.col + dc }))
        .filter(({ row, col }) => inBounds(row, col) && !hasPieceAt(row, col))
        .map(({ row, col }) => ({ zone: "cell", row, col }));
      if (dests.length === 0) return false;
      const dest =
        dests.length === 1 && !ctx.forcePrompt
          ? dests[0]
          : await helpers.pickLocation(dests, t("ce.ex0PickSurrounding"), { purpose: "move" });
      if (!dest) return false;
      await helpers.moveAndSync(ctx.pieceTokenId, dest, undefined, !!action.noArrival);
      helpers.recordMoveVisited?.(dest);
      ctx.pieceLocation = dest;
      if (!action.noArrival) ctx.arrivedAt = dest;
      return true;
    }
    case VERBS.STEAL_RANDOM_FROM_MOST_LOCKED: {
      // リトルマウス（0th拡張）。「１番多くロックしているプレイヤーを１人選ぶ。
      //   そのプレイヤーの手札から無作為に２枚、あなたの手札に加える。」
      // ⚠ 「プレイヤー」＝**自分も含む**（「相手」と書かれていない）。自分が単独で1番多い時は
      //   自分しか選べず、自分から奪う＝何も起きない。literal な読み。
      const players = getState().activePlayers;
      let 最大 = -1;
      for (const p of players) 最大 = Math.max(最大, countLockedCardsFor(p));
      const cands = players.filter((p) => countLockedCardsFor(p) === 最大);
      if (cands.length === 0) return false;
      const target =
        cands.length === 1 && !ctx.forcePrompt ? cands[0] : await helpers.pickPlayer(cands, t("ce.ex0PickMostLocked"));
      if (!target) return false;
      if (target === ctx.player) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0SelfIsMostLocked"));
        return false;
      }
      let 取った = 0;
      for (let i = 0; i < (action.count ?? 1); i++) {
        const tok = await helpers.pickRandomFromOpponentHand?.(target);
        if (!tok) break; // 相手の手札が尽きた（善処の原則）
        await helpers.moveAndSync(tok.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(tok.id, tok.cardId, false, ctx.player);
        取った++;
      }
      return 取った > 0;
    }
    case VERBS.END_TURN_IF_OWN_TURN: {
      // リトルマウス（0th拡張）手札効果の後半。「あなたのターンに使ったなら、このターンを終了する。」
      // ⓘ 「いつでも使える」カードなので、相手のターンに割り込んで使った時は終了しない。
      if (getState().turnPlayer !== ctx.player) return false;
      if (!helpers.endTurn) return false;
      await helpers.endTurn(ctx.player);
      return true;
    }
    case VERBS.PLACE_DECK_CARDS_ON_ADJACENT: {
      // ピーターフッド（0th拡張）到達効果。「あなたの隣に山札から３枚ずつ裏向きで置く。」
      // ⓘ 「隣」＝前後左右の4マス。盤の外へは置けない（善処の原則）。
      const here = ctx.pieceLocation;
      if (!here || here.zone !== "cell") return false;
      const 隣 = [];
      for (const { dr, dc } of DIRECTIONS) {
        const row = here.row + dr;
        const col = here.col + dc;
        if (inBounds(row, col)) 隣.push({ zone: "cell", row, col });
      }
      // 🔴 1st EDITION（大盤振舞の到達）「あなたの隣**計２マス**にあなたの**手札から**
      //   裏向きで１枚ずつ置く。」= 隣の4マスのうち2マスを選ぶ・出どころは手札。
      //   ⚠ 既定（total も source も無し）は今までどおり**隣の全マスに山札から count 枚ずつ**
      //     （ピーターフッド）。
      if (action.total != null || action.source === "hand") {
        const 枚数 = (await amountOf(action, ctx, helpers, "total")) ?? 隣.length;
        const 済 = new Set();
        let 置いたT = 0;
        for (let i = 0; i < 枚数; i++) {
          const cands = 隣.filter((c) => !済.has(c.row + "," + c.col));
          if (cands.length === 0) break;
          const 残り = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
          if (action.source === "hand" && 残り.length === 0) break; // 善処の原則
          if (action.source !== "hand" && getState().piles.deck.length === 0) break;
          const dest =
            cands.length === 1 && !ctx.forcePrompt
              ? cands[0]
              : await helpers.pickLocation(cands, t("ce.placeNth", { i: i + 1, n: 枚数 }), { purpose: "place" });
          if (!dest) break;
          済.add(dest.row + "," + dest.col);
          if (action.source === "hand") {
            const chosen =
              残り.length === 1 && !ctx.forcePrompt
                ? 残り[0]
                : await helpers.pickHandCard(ctx.player, t("ce.ex0PickHandForBottom"), new Set(残り.map((tk) => tk.id)));
            if (!chosen) break;
            // 第6引数 true ＝到達を起こさない（裏向きで置くので条件を満たさない）。
            await helpers.moveAndSync(chosen.id, dest, undefined, undefined, false, true);
          } else {
            await helpers.placeFromDeck(dest);
          }
          helpers.markPlacedLocation?.(dest);
          置いたT++;
        }
        return 置いたT > 0;
      }
      // 🔴【#538・2026-11-10】**置くマスの順番を選べるようにする**（報告「ピーターフッドの
      //   到達効果で置くマスの順番を選べるといいです！」→ ユーザー判断「お願いします」）。
      //   山札は上から順に出るので、**どのマスにどの札が行くかは順番で決まる**＝選ぶ意味がある。
      //   ⚠ 隣が1マスだけなら聞かない（選ぶ余地が無い）。
      //   ⚠ 山札が尽きたら途中で止める（善処の原則）。placeFromDeck は空だと何もしないので、
      //     **置く前に残りを見て**から進める。
      let 置いた = 0;
      const 残りマス = [...隣];
      const 全部 = 残りマス.length;
      for (let i = 0; i < 全部; i++) {
        if (getState().piles.deck.length === 0) break;
        const dest =
          残りマス.length === 1 && !ctx.forcePrompt
            ? 残りマス[0]
            : await helpers.pickLocation(残りマス, t("ce.placeNth", { i: i + 1, n: 全部 }), { purpose: "place" });
        if (!dest) break;
        const j = 残りマス.findIndex((c) => c.row === dest.row && c.col === dest.col);
        if (j >= 0) 残りマス.splice(j, 1);
        else 残りマス.shift(); // 念のため（候補外が返ってきても無限ループにしない）
        for (let k = 0; k < (action.count ?? 1); k++) {
          if (getState().piles.deck.length === 0) break;
          await helpers.placeFromDeck(dest);
          置いた++;
        }
        helpers.markPlacedLocation?.(dest);
      }
      return 置いた > 0;
    }
    case VERBS.ALL_PLAYERS_SET_HAND_SIZE: {
      // ピーターフッド（0th拡張）手札効果。「１〜７の数字を１つ選ぶ。全員は手札がその枚数に
      //   なるようにドローする、または捨てる。」
      // 🔴 捨てる方は**本人に選ばせる**（オンラインでは相手の手札の中身が見えない＝委任）。
      const n = await helpers.pickNumber?.(ctx.cardId, action.min ?? 1, action.max ?? 7, t("ce.ex0PickHandSize"));
      if (!Number.isFinite(n)) return false;
      let 何かした = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        const 今 = getHandTokens(p).length;
        if (今 < n) {
          await helpers.drawCards(p, n - 今);
          何かした = true;
        } else if (今 > n) {
          if (await helpers.delegateToPlayer(p, "discard-down-to", { n })) 何かした = true;
        }
      }
      return 何かした;
    }
    case VERBS.GIVE_SELF_TO_CHOSEN_OPPONENT_WITH_OPTIONS: {
      // ヤエザ（0th拡張）。「相手を１人選ぶ。その相手はこれを自分の手札に加え、以下の効果の
      //   うち１つ得る。」
      // 🔴 2つの選択肢は**相手が**選ぶので、arrivalOptions（使用者が選ぶ形）では表せない。
      //   委任（yaeza-option）で相手の画面に出す。
      const opponents = getState().activePlayers.filter((p) => p !== ctx.player);
      if (opponents.length === 0) return false;
      const target =
        opponents.length === 1 && !ctx.forcePrompt
          ? opponents[0]
          : await helpers.pickPlayer(opponents, t("ce.ex0PickOpponent"));
      if (!target) return false;
      await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: target });
      helpers.onCardAcquiredToHand?.(ctx.cardTokenId, ctx.cardId, true, target);
      await helpers.delegateToPlayer(target, "yaeza-option", {});
      return true;
    }
    case VERBS.ALL_PLAYERS_DISCARD_DOWN_TO_THEN_MAY_LOCK: {
      // ヴド族との契約（0th拡張）。「全員は手札が２枚以下になるように捨てる。そうしたなら、
      //   自分の手札を１枚ロックしてもよい、ただし最後のロックはできない。」
      // ⚠ 「自分の」は**『全員』それぞれ**と読んだ（ヤエザの「その相手は…自分の手札に加え」と
      //   同じ用法＝直前の主語を指す）。つまり捨てた人は全員ロックしてよい。
      //   ⚠ 読み替えが要るならここだけ直せばよい（ユーザー確認待ち）。
      const keep = action.keep ?? 2;
      let 何かした = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (getHandTokens(p).length <= keep) continue; // 「そうしたなら」＝捨てていない人は対象外
        if (!(await helpers.delegateToPlayer(p, "discard-down-to", { n: keep }))) continue;
        何かした = true;
        await helpers.delegateToPlayer(p, "may-lock-one-except-final", {});
      }
      return 何かした;
    }
    case VERBS.PEEK_FACEDOWN_AT_CHOSEN_CELLS: {
      // 鑑定士の技・ジェイク（0th拡張）到達効果。「任意のNマスの裏向きのカードの表面を見る。」
      // ⓘ 見るのは１番上の原則どおり、そのマスの一番上のカード。
      // ⚠ **オンラインでは裏向きのカードの cardId がマスクされて読めない**（意図的な仕様）。
      //   その時は helpers.peekCards 側が「手元で確かめてください」と出す。盤面は何も
      //   変わらないので、見られなくてもルール違反にはならない（CPU戦では普通に見える）。
      // 🔴 【#481・2026-11-03 ユーザー指定】2マス以上の時の流れは
      //     ①確認なしで N マス選ぶ → ②**まとめて1回だけ**「これらでいいですか？」
      //     → ③選んだ順に1枚ずつ表面を見る
      //   「ジェイクの到達効果で7マス選ぶ時、1マスずつ確認は煩わしい」への対応。
      //   ⓘ 選んだマスは**光らせたまま**にし、③では**いま見ているマスだけ**を光らせ直すので、
      //     「どの札がどのマスのものか」も分かる（#472／#482 の趣旨はこれで保てる）。
      //   ⚠ 1マスだけの効果（鑑定士の技）は今までどおり——1マスずつの確認が出て、
      //     まとめての確認は出ない。
      const want = action.count ?? 1;
      const まとめ確認 = want >= 2;
      let 選んだ = [];
      for (;;) {
        // 🔴【#555】選んだマスをもう一度押すと外れる（共通の pickCellsWithDeselect）。
        選んだ = await pickCellsWithDeselect(helpers, {
          want,
          forcePrompt: ctx.forcePrompt,
          listCells: () =>
            getCellsWithFaceDownCardWithoutPiece().concat(
              getAnyCellWithFaceDownCardCandidates().filter((c) => hasPieceAt(c.row, c.col))
            ),
          label: (n) => t("ce.ex0PeekPick", { i: n, n: want }),
          // 1マスずつの「このマスでいいですか？」は出さない（②でまとめて聞くため）。
          pickOpts: { skipConfirm: まとめ確認 },
          highlight: まとめ確認,
        });
        if (選んだ.length === 0) return false; // 1マスも選べなかった（善処の原則）
        if (!まとめ確認 || 選んだ.length < 2) break;
        if (await helpers.confirmPickedCells(ctx.cardId, ctx.player, 選んだ.length)) break;
        helpers.clearPlacementTargets?.(); // 「いいえ」＝選び直し。光を消して最初から
      }
      const 見たもの = [];
      for (const cell of 選んだ) {
        const top = findTopCardAtCell(cell.row, cell.col);
        if (!top) continue;
        // ③ いま見ているマスだけを光らせる（どの札がどのマスのものか分かるように）。
        if (まとめ確認) {
          helpers.clearPlacementTargets?.();
          helpers.markPlacementTarget?.(cell);
        }
        見たもの.push(top.cardId ?? null);
        // ⓘ 見えるのは**この効果を使っている人の画面だけ**（peekCards →
        //    playCenterCardFlipReveal は配信しない。みんなに見せる時は別の関数を使う）。
        // 🔴【#556】**どのマスの札か**と**誰の効果か**を渡す。中央の拡大がその
        //   マスに重ならない所へ出て、本人の時だけ「次へ」で進む形になる（main.js 側）。
        await helpers.peekCards?.([top.cardId ?? null], { cell, player: ctx.player });
      }
      if (見たもの.length === 0) return false;
      return true;
    }
    case VERBS.DECLARE_AND_OPEN_TO_HAND_REPEAT: {
      // 鑑定士の技（0th拡張）手札効果。「色を２色宣言する。プレイヤーのいない１マスの
      //   裏向きのカードをオープンし、あなたの手札に加える。そのカードが宣言色なら、
      //   ここまでを繰り返す。」
      // ⓘ 補足「『ここまで』とは『色を２色宣言する』から『あなたの手札に加える』まで」＝
      //   **繰り返すたびに宣言し直す**。
      // ⚠ 安全弁。理屈の上では山と盤が尽きるまで続く（試練の儀式と同じ考え方）。
      const MAX = 60;
      let 何かした = false;
      // 【#490・2026-11-04】ユーザー要望「試練の儀式とギャンブルは終わったときにコングラッチ的な
      //   演出が入ります。鑑定士とジェイクにも入れませんか？今後同様の効果には同じように入れよう！」
      //   ⇒ **当たった時だけ**出す（外した時は何も出さない。外れを強調しても気分が悪いだけ）。
      let 当たった回数 = 0;
      for (let i = 0; i < MAX; i++) {
        const cells = getCellsWithFaceDownCardWithoutPiece();
        if (cells.length === 0) break; // 善処の原則
        const colors = await helpers.declareColors({ exactCount: action.colorCount ?? 1 }, ctx.cardId, ctx.player);
        if (!colors || colors.length === 0) break;
        ctx.selections.declaredColors = colors;
        const cell = await helpers.pickLocation(cells, t("ce.ex0PickFaceDownNoPiece"));
        if (!cell) break;
        const top = findTopCardAtCell(cell.row, cell.col);
        if (!top) break;
        await helpers.flipCard?.(top.id);
        const めくれた = getState().tokens.find((tk) => tk.id === top.id);
        const cardId = めくれた?.cardId ?? null;
        await helpers.moveAndSync(top.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(top.id, cardId, true, ctx.player);
        何かした = true;
        // なないろの欠片は「すべての色」なので必ず宣言色扱い（試練の儀式と同じ）。
        const color = getCardDefinition(cardId)?.color;
        const 当たり = cardId === "rainbow-shard" || colors.includes(color);
        await helpers.announceColorsResolved?.({ hit: 当たり, color: cardId === "rainbow-shard" ? "rainbow" : color ?? null });
        if (!当たり) break;
        当たった回数++;
      }
      if (当たった回数 > 0 && helpers.celebrate) {
        await helpers.celebrate(ctx.cardId, {
          tone: "success",
          headline: t("ce.ex0GuessHitN", { n: 当たった回数 }),
          sub: t("ce.ex0GuessSub", { name: helpers.getPlayerName?.(ctx.player) ?? "" }),
        });
      }
      return 何かした;
    }
    case VERBS.DECLARE_AND_OPEN_UP_TO_N_THEN_HAND: {
      // ジェイク（0th拡張）手札効果。「色を１色宣言する。プレイヤーのいない１マスの裏向きの
      //   カードをオープンする。そのカードが宣言色なら、ここまでを繰り返す、ただし計７枚まで
      //   しかオープンできない。７枚目が宣言色なら、それら７枚をあなたの手札に加える。」
      // 🔴 鑑定士の技と違い、**毎回は手札に入れない**。最後まで当て続けた時だけ全部もらえる。
      const max = action.maxCount ?? 7;
      const 開けた = [];
      let 全部当たり = false;
      for (let i = 0; i < max; i++) {
        const cells = getCellsWithFaceDownCardWithoutPiece();
        if (cells.length === 0) break;
        const colors = await helpers.declareColors({ exactCount: action.colorCount ?? 1 }, ctx.cardId, ctx.player);
        if (!colors || colors.length === 0) break;
        ctx.selections.declaredColors = colors;
        const cell = await helpers.pickLocation(cells, t("ce.ex0PickFaceDownNoPiece"));
        if (!cell) break;
        const top = findTopCardAtCell(cell.row, cell.col);
        if (!top) break;
        await helpers.flipCard?.(top.id);
        const めくれた = getState().tokens.find((tk) => tk.id === top.id);
        const cardId = めくれた?.cardId ?? null;
        開けた.push(top.id);
        const color = getCardDefinition(cardId)?.color;
        const 当たり = cardId === "rainbow-shard" || colors.includes(color);
        await helpers.announceColorsResolved?.({ hit: 当たり, color: cardId === "rainbow-shard" ? "rainbow" : color ?? null });
        if (!当たり) break;
        if (開けた.length >= max) { 全部当たり = true; break; }
      }
      if (全部当たり) {
        for (const id of 開けた) {
          const tk = getState().tokens.find((x) => x.id === id);
          if (!tk) continue;
          await helpers.moveAndSync(id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
          helpers.onCardAcquiredToHand?.(id, tk.cardId, true, ctx.player);
        }
        // 【#490】最後まで当て続けた＝この札のいちばんの見せ場。ギャンブル・試練の儀式と同じ
        //   お祝いの演出を出す。⚠ 途中で外した時は何も出さない。
        if (helpers.celebrate) {
          await helpers.celebrate(ctx.cardId, {
            tone: "success",
            headline: t("ce.ex0GuessHitN", { n: 開けた.length }),
            sub: t("ce.ex0GuessSub", { name: helpers.getPlayerName?.(ctx.player) ?? "" }),
          });
        }
      }
      return 開けた.length > 0;
    }
    case VERBS.ALL_PLAYERS_DRAW_AND_PLACE_ONE_AT_CHOSEN_CELL: {
      // ピュアバーガー（0th拡張）到達効果。「プレイヤーのいないマスを１マス選ぶ。全員は
      //   １枚ドローし、自分の手札から１枚をそのマスの１番上に置く。」
      // 🔴 「どの手札を置くか」は**本人に聞く**（オンラインでは相手の手札の中身が見えない
      //   ＝合同建設・色落ちキャットと同じ委任の仕組みに乗せる）。置く先のマスは委任の
      //   引数で相手の画面へ渡す。
      const cells = getCellCandidatesWithoutPiece();
      if (cells.length === 0) return false;
      const cell =
        cells.length === 1 && !ctx.forcePrompt
          ? cells[0]
          : await helpers.pickLocation(cells, t("ce.ex0PickCellNoPiece"), { purpose: "place" });
      if (!cell) return false;
      let 何かした = false;
      // 処理順の原則（使用者から時計回り）。
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        await helpers.drawCards(p, action.count ?? 1);
        const r = await helpers.delegateToPlayer(p, "place-hand-card-at-cell", { row: cell.row, col: cell.col });
        if (r) 何かした = true;
      }
      return 何かした;
    }
    case VERBS.MOVE_SELF_BY_RIGHT_NEIGHBOR: {
      // 不思議な果実（0th拡張）手札効果。「あなたの右隣の相手が、あなたを１マス移動させる。」
      // ⓘ 「移動」なので行き先は**カードのあるマス**だけ（「強制移動」とは別＝用語集）。
      const 右隣 = getRightNeighborOf(ctx.player);
      if (!右隣) return false;
      const cands = getMoveCandidates(ctx.pieceLocation, action.count ?? 1, false);
      if (cands.length === 0) return false; // 善処の原則
      // 候補は委任の引数で相手の画面へ渡す（相手は「どこへ動かすか」だけを決める）。
      const 返事 = await helpers.delegateToPlayer(右隣, "choose-cell", {
        candidates: cands,
        hintKey: "ce.ex0MoveOtherPlayer",
        forPlayer: ctx.player,
      });
      const dest = 返事 && typeof 返事.row === "number" ? { zone: "cell", row: 返事.row, col: 返事.col } : null;
      if (!dest) return false;
      await helpers.moveAndSync(ctx.pieceTokenId, dest);
      helpers.recordMoveVisited?.(dest);
      ctx.pieceLocation = dest;
      ctx.arrivedAt = dest; // 「移動」なので移動先のカードに到達する
      return true;
    }
    case VERBS.PLACE_DECK_CARDS_IN_CROSS_AND_OPEN_ALL: {
      // 誰かの白きカゲ（0th拡張）到達効果。「このマスから十字方向の計１２マスに山札から
      //   １枚ずつ裏向きで置く。それらをすべてオープンする。」
      // ⓘ 「十字方向」＝上下左右の4方向。7×7 なのでどの方向も最大3マス＝4×3＝12マス。
      //   盤の外へ出る分は置けない（善処の原則）。
      const here = ctx.pieceLocation;
      if (!here || here.zone !== "cell") return false;
      const 方向ごと = Math.max(1, Math.floor((action.cellCount ?? 12) / DIRECTIONS.length));
      const 置いた = [];
      for (const { dr, dc } of DIRECTIONS) {
        for (let step = 1; step <= 方向ごと; step++) {
          const row = here.row + dr * step;
          const col = here.col + dc * step;
          if (!inBounds(row, col)) break;
          for (let k = 0; k < (action.count ?? 1); k++) {
            await helpers.placeFromDeck({ zone: "cell", row, col });
            const top = findTopCardAtCell(row, col);
            if (top && !置いた.includes(top.id)) 置いた.push(top.id);
          }
        }
      }
      if (置いた.length === 0) return false;
      for (const id of 置いた) {
        const tk = getState().tokens.find((x) => x.id === id);
        if (tk && !tk.faceUp) await helpers.flipCard?.(id);
      }
      // 🔴 駒がいるマスで新しい一番上が表向きになったら**到達する**（用語集「到達」。
      //   サフラン＝FLIP_UP_TO_N_WITHIN_RANGE が既にこの形で、ユーザー報告を受けて
      //   直した前例がある）。置いた札がそのマスの一番上である時だけ。
      for (const id of 置いた) {
        const tk = getState().tokens.find((x) => x.id === id);
        if (!tk || tk.location.zone !== "cell") continue;
        const { row, col } = tk.location;
        if (!hasPieceAt(row, col)) continue;
        if (findTopCardAtCell(row, col)?.id !== id) continue;
        const piece = findPieceAtCell(row, col);
        await helpers.triggerArrivalAtIfFaceUp?.({ zone: "cell", row, col }, piece?.player ?? null);
      }
      return true;
    }
    case VERBS.PUBLIC_DRAW_TO_BOTTOM_OF_CHOSEN_CELL: {
      // 足下の隠し財産（0th拡張）到達効果。
      // 「あなたの隣以外の、カードの置かれたマスを１マス選ぶ。１枚ドローして公開する。
      //   そのカードを選んだマスの１番下に表向きで置く。」
      const cells = getCellsWithCardCandidates({ excludeAdjacent: true }, ctx.pieceLocation);
      if (cells.length === 0) return false; // 善処の原則
      const cell =
        cells.length === 1 && !ctx.forcePrompt
          ? cells[0]
          : await helpers.pickLocation(cells, t("ce.ex0PickCellForBottom"), { purpose: "place" });
      if (!cell) return false;
      for (let i = 0; i < (action.count ?? 1); i++) {
        await helpers.placeFromDeck(cell);
        // 置いた札は（その時点の）一番上に来る。それを表向きにしてから一番下へ沈める。
        const placed = findTopCardAtCell(cell.row, cell.col);
        if (!placed) return i > 0;
        if (!placed.faceUp) await helpers.flipCard?.(placed.id);
        await helpers.announceEffectNotice?.(ctx.cardId, t("ce.ex0RevealedToBottom", { name: cardDisplayName(placed.cardId) }));
        await sinkCardToBottomOfCell(placed.id, cell, helpers);
      }
      return true;
    }
    case VERBS.PLACE_HAND_CARD_AT_BOTTOM_OF_CHOSEN_CELL: {
      // 足下の隠し財産（0th拡張）手札効果②。
      // 「あなたの手札から１枚を、カードの置かれた任意のマスの１番下に表向きで置く。」
      // 🔴 ①と違い「隣以外」の縛りは**無い**。
      const cells = getCellsWithCardCandidates();
      if (cells.length === 0) return false;
      const handTokens = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
      if (handTokens.length === 0) return false;
      const chosen = await helpers.pickHandCard(ctx.player, t("ce.ex0PickHandForBottom"), new Set(handTokens.map((tk) => tk.id)));
      if (!chosen) return false;
      const cell =
        cells.length === 1 && !ctx.forcePrompt
          ? cells[0]
          : await helpers.pickLocation(cells, t("ce.ex0PickCellForBottom"), { purpose: "place" });
      if (!cell) return false;
      await helpers.moveAndSync(chosen.id, cell, undefined, undefined, false, true);
      const moved = getState().tokens.find((tk) => tk.id === chosen.id);
      if (moved && !moved.faceUp) await helpers.flipCard?.(chosen.id);
      await sinkCardToBottomOfCell(chosen.id, cell, helpers);
      return true;
    }
    case VERBS.PLACE_DECK_OR_HAND_CARD_AT_BOTTOM_OF_CHOSEN_CELL: {
      // 足下の隠し財産（0th拡張）到達効果。2026-11-03（#473/#474）にユーザー判断で作り直した形。
      // 「あなたのいるマス以外の、カードの置かれたマスを１マス選ぶ。山札または手札から１枚を、
      //   そのマスの１番下に表向きで置く。」
      // ⓘ ユーザー回答: 山札か手札かは**使う人がその場で選ぶ**／選んだマスに**（他の人の）駒が
      //   いてもよい**／１番下に置くので**到達は起きない**（だから ctx.arrivedAt は立てない）。
      // 🔴 除くのは**自分のいるマスだけ**（2026-11-03 の追加指示「隠し財産だけど自分のいる
      //   マス以外が良いな！」）。前の形の「隣以外」とは別の縛りなので取り違えないこと——
      //   隣4マスは**選べる**。
      const cells = getCellsWithCardCandidates({ excludeOwnCell: true }, ctx.pieceLocation);
      if (cells.length === 0) return false; // 善処の原則
      const handTokens = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
      const 山がある = getState().piles.deck.length > 0;
      if (!山がある && handTokens.length === 0) return false; // 善処の原則（出せる札が無い）
      const cell =
        cells.length === 1 && !ctx.forcePrompt
          ? cells[0]
          : await helpers.pickLocation(cells, t("ce.ex0PickCellForBottom"), { purpose: "place" });
      if (!cell) return false;
      // どちらから出すか。**片方しか無い時は聞かない**（選ぶ余地が無い＝他の動詞と同じ作法）。
      let から = 山がある ? "deck" : "hand";
      if (山がある && handTokens.length > 0) {
        から =
          (await helpers.pickChoice(
            ctx.cardId,
            [
              // 「山札から」を先に置く（CPUは評価表に無いと先頭寄りを選ぶ。山札から出す方が
              // CPU自身の手札を減らさないので、どちらに転んでも不自然にならない）。
              { id: "deck", label: t("ce.ex0FromDeck"), usable: true },
              { id: "hand", label: t("ce.ex0FromHand"), usable: true },
            ],
            t("ce.ex0PickDeckOrHand")
          )) ?? "deck";
      }
      for (let i = 0; i < (action.count ?? 1); i++) {
        let 置いた = null;
        if (から === "hand") {
          const 残り = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
          if (残り.length === 0) return i > 0;
          const chosen =
            残り.length === 1 && !ctx.forcePrompt
              ? 残り[0]
              : await helpers.pickHandCard(ctx.player, t("ce.ex0PickHandForBottom"), new Set(残り.map((tk) => tk.id)));
          if (!chosen) return i > 0;
          // 第6引数 true ＝到達を起こさない（１番下へ沈めるので、そもそも乗らない）。
          await helpers.moveAndSync(chosen.id, cell, undefined, undefined, false, true);
          置いた = getState().tokens.find((tk) => tk.id === chosen.id) ?? null;
        } else {
          if (getState().piles.deck.length === 0) return i > 0;
          await helpers.placeFromDeck(cell);
          置いた = findTopCardAtCell(cell.row, cell.col);
        }
        if (!置いた) return i > 0;
        if (!置いた.faceUp) await helpers.flipCard?.(置いた.id);
        // 🔴 【#502・2026-11-04】ユーザー報告「隠し財産について、『表向きで置く』ので、その
        //   カードは公開情報です。なので一度全プレイヤーに見せてからおきましょう」。
        //   **そのとおり**——１番下へ沈めると上の札に隠れて誰にも見えなくなるので、
        //   お知らせの文（名前だけ）では「見せた」ことにならない。
        //   ⇒ 沈める**前に**、中央に出して全員へ1回見せる（revealCardToAll は配信する）。
        //   ⓘ 文のお知らせはやめた——見せる演出に名前も出るので、同じことを2回出すと
        //     モーダルが続いて煩わしい（#463・#449 でまとめた話と同じ）。
        await helpers.revealCardToAll?.(置いた.cardId);
        await sinkCardToBottomOfCell(置いた.id, cell, helpers);
      }
      return true;
    }
    case VERBS.MOVE_TO_CELL_WITH_NAMED_FACEUP_CARD: {
      // オレンジバス（0th拡張）到達効果。「『バスストップ』のあるマスに移動する。」
      // 🔴 **表向きのものだけが対象**（2026-11-02 ユーザー回答）。裏向きも対象にすると
      //   「どこに伏せてあるか」が漏れる。
      // ⚠ 一番上が表向きのそのカード、というだけでなく**下に埋まっている表向き**も
      //   ルール上は「あるマス」なので、マスの中の表向きのカードを全部見る。
      const cells = [];
      for (let row = 0; row <= 6; row++) {
        for (let col = 0; col <= 6; col++) {
          if (hasPieceAt(row, col)) continue; // 駒は1マスに1つまで＝移動できない
          const 居る = getState().tokens.some(
            (tk) =>
              tk.kind === "card" &&
              tk.faceUp &&
              tk.cardId === action.targetCardId &&
              tk.location.zone === "cell" &&
              tk.location.row === row &&
              tk.location.col === col
          );
          if (居る) cells.push({ zone: "cell", row, col });
        }
      }
      if (cells.length === 0) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0NoBusStop"));
        return false;
      }
      const dest =
        cells.length === 1 && !ctx.forcePrompt
          ? cells[0]
          : await helpers.pickLocation(cells, t("ce.ex0PickBusStop"), { purpose: "move" });
      if (!dest) return false;
      await helpers.moveAndSync(ctx.pieceTokenId, dest);
      helpers.recordMoveVisited?.(dest);
      ctx.pieceLocation = dest;
      // ⚠ 到達の連鎖は立てない。この効果はこの後「そのバスストップを手札に加える」まで
      //   続くので、ここで到達を立てると**手札へ入れる前にバスストップの到達効果が走る**
      //   （あちらは「これは手札に加えない」なので、2枚の指示が噛み合わない）。
      //   句点の原則どおり、この句では移動だけを行う。
      return true;
    }
    case VERBS.PICKUP_NAMED_CARD_AT_OWN_CELL: {
      // オレンジバス（0th拡張）。「その『バスストップ』をあなたの手札に加える。」
      // ⚠ いま自分が立っているマスの、その名前のカード（表向き）を取る。
      const here = ctx.pieceLocation;
      if (!here || here.zone !== "cell") return false;
      const stack = getState().tokens.filter(
        (tk) =>
          tk.kind === "card" &&
          tk.cardId === action.targetCardId &&
          tk.faceUp &&
          tk.location.zone === "cell" &&
          tk.location.row === here.row &&
          tk.location.col === here.col
      );
      const token = stack[stack.length - 1]; // １番上の原則
      if (!token) return false;
      await helpers.moveAndSync(token.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(token.id, token.cardId, true, ctx.player);
      return true;
    }
    case VERBS.FORCED_MOVE: {
      // 0th拡張（ジョイナー等）。「強制移動」＝カードが無いマスにも行ける「移動」（用語集）。
      // repeat: "any" の時は「任意の回数繰り返す」。
      const 回数上限 = action.repeat === "any" ? 12 : 1;
      let 動いた = 0;
      for (let i = 0; i < 回数上限; i++) {
        const cands = getForcedMoveCandidates(ctx.pieceLocation, action.count, {
          requireEmpty: !!action.requireEmpty,
          excludeOpponentGates: !!action.excludeOpponentGates,
          atOnce: !!action.atOnce, // 1st EDITION（飛空艇アルヴァ）「７マス先に一気に」
          player: ctx.player,
        });
        // 無意味なループ防止（#49）。繰り返しの強制移動は、同じマスを行き来できてしまう。
        helpers.recordMoveVisited?.(ctx.pieceLocation);
        const revisitLimit = helpers.isCpuDriving?.(ctx.player) ? 1 : HUMAN_MOVE_REVISIT_LIMIT;
        const fresh = cands.filter((c) => !helpers.isLoopMoveDest?.(c, revisitLimit));
        if (fresh.length === 0) break;
        // 🔴 1st EDITION（飛空艇アルヴァ）「…強制移動して**もよい**」。optional の時だけ聞く。
        if (action.optional && i === 0) {
          const 返事 = await helpers.pickChoice?.(
            ctx.cardId,
            [
              { id: "yes", label: t("ce.feForcedMoveYes"), usable: true },
              { id: "no", label: t("ce.feForcedMoveNo"), usable: true },
            ],
            t("ce.feForcedMoveOptional")
          );
          if (返事 !== "yes") break;
        }
        const dest =
          fresh.length === 1 && !ctx.forcePrompt && action.repeat !== "any"
            ? fresh[0]
            : await helpers.pickLocation(fresh, action.repeat === "any" ? t("ce.ex0ForcedMoveRepeat") : t("ce.ex0ForcedMove"), {
                purpose: "move",
              });
        // 繰り返しの時は「選ばない＝もう動かない」で終わる（任意の回数）。
        if (!dest) break;
        await helpers.moveAndSync(ctx.pieceTokenId, dest, undefined, !!action.noArrival);
        helpers.recordMoveVisited?.(dest);
        ctx.pieceLocation = dest;
        if (!action.noArrival) ctx.arrivedAt = dest;
        動いた++;
      }
      return 動いた > 0;
    }
    case VERBS.FORCED_MOVE_TO_PREVIOUS_CELL: {
      // リーチキャンセル（0th拡張）到達効果。「移動前のマスに強制移動する。」
      const dest = getMovedFromCell(ctx.player);
      if (!dest) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0NoPreviousCell"));
        return false;
      }
      if (hasPieceAt(dest.row, dest.col)) {
        // 駒は1マスに1つまで（物理ルール）。誰かが入っていたら戻れない。
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0PreviousCellTaken"));
        return false;
      }
      // 無意味なループ防止（#49）。リーチキャンセルが2枚で往復するのを止める。
      const revisitLimit = helpers.isCpuDriving?.(ctx.player) ? 1 : HUMAN_MOVE_REVISIT_LIMIT;
      if (helpers.isLoopMoveDest?.(dest, revisitLimit)) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.L748"));
        return false;
      }
      await helpers.moveAndSync(ctx.pieceTokenId, dest);
      helpers.recordMoveVisited?.(dest);
      ctx.pieceLocation = dest;
      ctx.arrivedAt = dest; // 強制移動は「移動」なので、戻った先のカードに到達する
      return true;
    }
    case VERBS.GATE_CHARGE_PLACE_OR_RETURN: {
      // ゲートチャージ（0th拡張）到達効果の後半。
      // 「このターンにこれがオープンされたのなら、これをあなたのゲートに表向きで置く。
      //   そうでないなら、移動前のマスに強制移動し、これを捨てる。
      //   ただし相手のゲートへは移動できない。」
      if (wasCardOpenedThisTurn(ctx.cardTokenId)) {
        const myGate = GATE_POSITIONS[SEAT_TO_SIDE[ctx.player]];
        if (!myGate) return false;
        const dest = { zone: "cell", row: myGate.row, col: myGate.col };
        await helpers.moveAndSync(ctx.cardTokenId, dest, undefined, undefined, false, true);
        const moved = getState().tokens.find((tk) => tk.id === ctx.cardTokenId);
        if (moved && !moved.faceUp) await helpers.flipCard?.(ctx.cardTokenId);
        helpers.markPlacedLocation?.(dest);
        return true;
      }
      // 「そうでないなら」の枝。
      const back = getMovedFromCell(ctx.player);
      const 戻れる =
        !!back &&
        !hasPieceAt(back.row, back.col) &&
        !isOpponentGateCell(back.row, back.col, ctx.player);
      if (戻れる) {
        await helpers.moveAndSync(ctx.pieceTokenId, back);
        helpers.recordMoveVisited?.(back);
        ctx.pieceLocation = back;
        ctx.arrivedAt = back; // 強制移動は「移動」＝戻った先のカードに到達する
      } else {
        // ⚠ **移動できなくても、これを捨てるところまでは行う**（句点の原則・善処の原則）。
        //   「移動前のマス」が分からない／相手のゲートだった／誰かが入っていた場合。
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0GateChargeCannotReturn"));
      }
      await helpers.discardAndSync(ctx.cardTokenId);
      return true;
    }
    case VERBS.END_TURN: {
      // 0th拡張。「このターンを終了する。」
      // 🔴 **「このフェイズを終了する」とは別物**（あちらは END_CURRENT_PHASE＝次のフェイズへ
      //   進むだけ）。こちらは残りのフェイズを飛ばして手番を next へ渡す。
      // ⚠ 渡された関数が無い（＝まだ配線していない）時は何もしない（安全側）。
      if (!helpers.endTurn) return false;
      await helpers.endTurn(ctx.player);
      return true;
    }
    case VERBS.DISCARD_ANY_HAND_THEN_DRAW_SAME: {
      // やり直しのカギ（0th拡張）「あなたの手札を任意の枚数捨ててもよい。捨てた枚数分ドロー。」
      // 作りは DISCARD_ANY_OWN_LOCKED_DRAW_PER（色落ちキャットの手札効果）と同じ考え方:
      //   まとめて選べるモーダルがあればそれで、無ければ（CPU等）1枚ずつ聞く。
      // ⓘ 0枚でもよい効果なので、0枚なら不発（＝このカードが手札に加わるだけ）。
      const handNow = getHandTokens(ctx.player);
      if (handNow.length === 0) return false;
      let 捨てた = 0;
      if (helpers.pickHandCardsOrdered) {
        const chosen = await helpers.pickHandCardsOrdered(
          ctx.player,
          t("ce.pickDiscardAnyOptional"),
          new Set(handNow.map((tk) => tk.id)),
          // 🔴【2026-11-06・#517】anyCount が無いと、このモーダルは**全部捨てる**意味になる
          //   （選ばなかった分を後ろに足す）。報告「一部しか手札選んでないのに全部捨てさせ
          //   られた」の正体。この効果は枚数を本人が決めるので anyCount で呼ぶ。
          { anyCount: true }
        );
        if (Array.isArray(chosen)) {
          for (const tk of chosen) {
            await helpers.discardAndSync(tk.id);
            捨てた++;
          }
          if (捨てた > 0) {
            await helpers.drawCards(ctx.player, 捨てた);
            await helpers.announceEffectReason?.(
              ctx.cardId,
              t("ce.redoKeyDrew", { name: helpers.getPlayerName(ctx.player), n: 捨てた })
            );
          }
          return 捨てた > 0;
        }
      }
      // まとめて選べない呼び出し元（CPU等）: 1枚ずつ聞く。手札の枚数を上限にする。
      for (let i = 0; i < handNow.length; i++) {
        const のこり = getHandTokens(ctx.player);
        if (のこり.length === 0) break;
        const chosen = await helpers.pickHandCard(
          ctx.player,
          t("ce.pickDiscardAnyOptional"),
          new Set(のこり.map((tk) => tk.id)),
          { allowSkip: true, skipLabel: t("ce.L842") }
        );
        if (!chosen) break; // 「任意の枚数」＝これ以上捨てない＝正常終了
        await helpers.discardAndSync(chosen.id);
        捨てた++;
      }
      if (捨てた === 0) return false;
      await helpers.drawCards(ctx.player, 捨てた);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.redoKeyDrew", { name: helpers.getPlayerName(ctx.player), n: 捨てた })
      );
      return true;
    }
    case VERBS.DISCARD_ANY_OWN_LOCKED_DRAW_PER: {
      // 色落ちキャット手札効果（2026-08-18ユーザー変更）専用: 自分のロックしているカードを
      // 任意の枚数（0枚でもよい）捨て、捨てたカード1枚につきaction.drawPer枚ドローする。
      // DISCARD_ONE_LOCKED_CARDの候補生成（ファースト/エターナルは対象外）＋
      // FLIP_UP_TO_N_WITHIN_RANGEの「0..N複数選択（stop可）」を組み合わせた形。
      const drawPer = action.drawPer ?? 3;
      const side = SEAT_TO_SIDE[ctx.player];
      let discarded = 0;
      // 【2026-09-29・続き546・ユーザー要望】まとめて選べるモーダル（ロックエリア風）で聞く。
      // 枚数はプレイヤーが決める（0枚でもよい）ので「N枚選ぶ」ではなく、押した分だけ捨てる。
      // **CPUの番とモーダルを持たない呼び出し元では null が返る**ので、その時は従来どおり
      // 1枚ずつ聞く下のループへ落ちる（CPUの選び方をこの変更で変えないため）。
      if (helpers.pickLockCardsOrdered) {
        const lockedNow = getState().tokens.filter(
          (t) => t.kind === "card" && t.location.zone === "lock" && t.location.side === side && isTargetableByOtherCardEffects(t.cardId)
        );
        if (lockedNow.length > 0) {
          const chosen = await helpers.pickLockCardsOrdered(
            ctx.player,
            t("ce.pickLockDiscardOptional", { n: drawPer }),
            lockedNow,
            { drawPer }
          );
          if (Array.isArray(chosen)) {
            for (const token of chosen) {
              await helpers.discardAndSync(token.id);
              discarded++;
            }
            if (discarded > 0) {
              await helpers.drawCards(ctx.player, discarded * drawPer);
              await helpers.announceEffectReason?.(
                ctx.cardId,
                t("ce.lockDiscardedDrew", { n: discarded, draw: discarded * drawPer })
              );
            }
            return true;
          }
        }
      }
      for (let i = 0; i < 7; i++) {
        const lockedTokens = getState().tokens.filter(
          (t) => t.kind === "card" && t.location.zone === "lock" && t.location.side === side && isTargetableByOtherCardEffects(t.cardId)
        );
        if (lockedTokens.length === 0) break;
        const candidates = lockedTokens.map((t) => t.location);
        const dest = await helpers.pickLocation(
          candidates,
          t("ce.pickLockDiscardOptional", { n: drawPer }),
          { allowSkip: true, skipLabel: discarded > 0 ? t("ce.L1509") : t("ce.L1509_2") }
        );
        if (!dest) break; // 「任意の枚数」＝これ以上選ばない＝正常終了
        const chosen = lockedTokens.find((t) => t.location.side === dest.side && t.location.index === dest.index);
        if (!chosen) break;
        await helpers.discardAndSync(chosen.id);
        discarded++;
      }
      if (discarded > 0) {
        await helpers.drawCards(ctx.player, discarded * drawPer);
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.lockDiscardedDrew", { n: discarded, draw: discarded * drawPer })
        );
      }
      // END_CURRENT_PHASEが後続にあるので、捨てなかった（discarded:0）場合でも効果全体は
      // 「不発」ではない（フェイズ終了は必ず起きる）。ここは実際に捨てたかどうかを返す。
      return discarded > 0;
    }
    case VERBS.DECLARE_COLORS: {
      // ザ・ギャンブル（action.minCount、以上）/試練の儀式（action.count、固定数）
      // 共通。実際の選択UI（複数色から選ばせる）はhelpers側（main.jsのdeclareColorsForEffect）
      // に委ねる。選んだ色はctx.selectionsに保存し、後続のアクションから参照する。
      const chosen = await helpers.declareColors(
        action.minCount != null ? { minCount: action.minCount } : { exactCount: action.count },
        ctx.cardId,
        ctx.player
      );
      if (!chosen || chosen.length === 0) return false;
      ctx.selections.declaredColors = chosen;
      return true;
    }
    case VERBS.PUBLIC_DRAW_MATCHING_DECLARED_COLOR_COUNT: {
      // ザ・ギャンブル専用: 直前のDECLARE_COLORSで宣言した色の種類数分、公開ドローする。
      const declaredColors = ctx.selections.declaredColors;
      if (!declaredColors?.length) return false;
      // ユーザー要望「1枚ずつもったいぶりたい。公開のたびに『1枚公開する/全部公開する』の
      // モーダルを出す」。残り2枚以上の時だけ選ばせ、残り1枚は自動で最後の1枚を公開する。
      const total = declaredColors.length;
      const revealedCardIds = [];
      let remaining = total;
      // ユーザー要望2026-08-08: 公開のたびに、そのカードを画面中央に大きく“じらしてフリップ”で
      // 見せる（helpers.gambleReveal）。緊張感を出すため心臓の鼓動（helpers.startSuspenseSound）を
      // 鳴らし始め、結果が出るDISCARD_HAND側で止める。
      helpers.startSuspenseSound?.();
      // #95改（ユーザー要望2026-08-14）: 公開したカードは「全部の中央じらしフリップが終わってから」
      // 公開エリアに一斉に並べる。begin〜end の間は公開エリアへの描画を遅延する。
      helpers.beginPublicDrawDefer?.();
      try {
      while (remaining > 0) {
        if (helpers.pickHandEffectOption) {
          // 残り2枚以上なら「1枚公開/全部公開」、最後の1枚は「最後の1枚を公開する」を毎回出す
          // （ユーザー要望: 最後の1枚ももったいぶりたい）。
          const options =
            remaining > 1
              ? [
                  { id: "one", label: t("ce.L1015"), usable: true },
                  { id: "all", label: t("ce.revealRest", { n: remaining }), usable: true },
                ]
              : [{ id: "last", label: t("ce.L1568"), usable: true }];
          // 「効果を選択」ではなく「公開の仕方の選択」の場面なので専用の見出しにする（ユーザー指摘2026-08-18）。
          const opt = await helpers.pickHandEffectOption("yellow-gamble", options, t("ce.L1018"));
          if (opt?.id === "all") {
            // #95: publicDrawThenReveal は「山から確定→中央じらしフリップで公開→公開エリアへ表向き
            // 描画」の順で、公開エリアに先に見えてしまう問題を解消する（内部で公開演出まで行うので
            // gambleReveal は呼ばない）。未提供の環境向けに従来経路のフォールバックも残す。
            if (helpers.publicDrawThenReveal) {
              const rest = await helpers.publicDrawThenReveal(ctx.player, remaining);
              revealedCardIds.push(...rest);
            } else {
              const rest = await helpers.publicDraw(ctx.player, remaining);
              for (const cid of rest) {
                await helpers.gambleReveal?.(cid);
                revealedCardIds.push(cid);
              }
            }
            remaining = 0;
            break;
          }
          // "one"/"last"/閉じた(null) → 1枚だけ公開して次へ。
        }
        if (helpers.publicDrawThenReveal) {
          const one = await helpers.publicDrawThenReveal(ctx.player, 1);
          revealedCardIds.push(...one);
        } else {
          const one = await helpers.publicDraw(ctx.player, 1);
          for (const cid of one) {
            await helpers.gambleReveal?.(cid);
            revealedCardIds.push(cid);
          }
        }
        remaining -= 1;
      }
      } finally {
        // 全部の公開演出が終わった今、公開エリアにまとめて並べる（描画遅延を解除）。
        await helpers.endPublicDrawDefer?.(ctx.player, revealedCardIds);
      }
      ctx.selections.revealedCardIds = revealedCardIds;
      return revealedCardIds.length > 0;
    }
    case VERBS.DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED: {
      // ザ・ギャンブル専用: 公開ドローした中に宣言色が1つでもあれば、手札を全て捨てる。
      // 「ドロー」＝「山札から手札に加える」ため、この効果でドローしたカード（＝まだ
      // publicDrawゾーンにあり通常の手札には合流していない分）も対象に含める
      // （docs/cards.md補足）。この定義はgetHandTokens()として一般化した
      // （続き55、選べる罠の「手札を半分捨てる」にも同じ定義漏れがあったため）。
      const declaredColors = ctx.selections.declaredColors ?? [];
      const revealedCardIds = ctx.selections.revealedCardIds ?? [];
      // ユーザー報告「公開ドローの中に宣言色があるのに手札を全て捨てる処理が漏れている」
      // の原因: なないろの欠片は「全ての色を兼ねる」（RITUAL_PLACE_MOVE_REPEAT等、
      // 他の色一致判定と同じ既存の扱い）ため、公開ドローで出た時は宣言した色に関係なく
      // 常に一致扱いになるはずだが、ここではcardId==="rainbow-shard"の特別扱いが
      // 抜けており、getCardDefinition("rainbow-shard").color（実際の値は"rainbow"、
      // 宣言できる7色のいずれとも一致しない）だけで判定していたため、公開ドローで
      // なないろの欠片単独が出たケースで一致判定を取りこぼしていた。
      const matches = revealedCardIds.some(
        (cardId) => cardId === "rainbow-shard" || declaredColors.includes(getCardDefinition(cardId)?.color)
      );
      // 続き65: 公開ドローの結果で宣言色が判明した瞬間なので、常駐していた色宣言表示を消す。
      // 【演出③-2・賭ける】その際、当たり／外れを表示側に伝えて見せ場にする（当たった色の丸が
      // 輝いて割れる／外れた色はひび割れて沈む）。どの色で当たったかも渡す。
      const hitColor =
        revealedCardIds
          .map((cardId) => (cardId === "rainbow-shard" ? "rainbow" : getCardDefinition(cardId)?.color))
          .find((c) => c === "rainbow" || declaredColors.includes(c)) ?? null;
      await helpers.announceColorsResolved?.({ hit: matches, color: hitColor });
      helpers.stopSuspenseSound?.(); // 結果が出たので鼓動を止める
      // 誰の結果かが分かるように発動者名を主語に添える（相手が発動した時に自分の画面で
      // 「自分が成功した」ように見えないように。ユーザー要望2026-08-08の総点検）。
      const gambleName = helpers.getPlayerName?.(ctx.player) ?? "";
      if (!matches) {
        // ユーザー要望2026-08-07: 宣言色が出なかった＝良い結果（手札を捨てずに済む）を、
        // 紙吹雪＋大きな英語見出しでお祝いする（案A、「おめでとう」ではなく英語で）。
        if (helpers.celebrate) {
          await helpers.celebrate(ctx.cardId, {
            tone: "success",
            headline: "CONGRATULATIONS!",
            sub: t("ce.gambleNoColor", { name: gambleName }),
          });
        } else {
          await helpers.announceEffectReason?.(ctx.cardId, t("ce.gambleNoColor2", { name: gambleName }));
        }
        return false;
      }
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.gambleHit", { name: gambleName }));
      const toDiscard = getHandTokens(ctx.player);
      // ユーザー報告「宣言色が出た時に手札がすべて捨てられず止まってしまっている」への
      // 対応。1枚ごとのdiscardAndSyncのどこかで例外が起きると（オンライン中の通信
      // エラー等）、そこでこのループ自体が中断し、残りのカードが手札に残ったまま
      // 効果全体が停止してしまう（catchが無いとrunArrivalEffectの外まで例外が伝播し、
      // 呼び出し元main.jsのtriggerCardArrivalではconsole.errorに落ちるだけで、
      // ユーザーからは何も起きなくなったように見える）。1枚失敗しても残りは
      // 続けて捨てられるようにする。
      // 【#315】1枚ずつ「捨てました」を出すと、中央は一度に1つ（#266）なので手札の枚数ぶん
      // 順番待ちになる（ユーザー要望「捨てるカードの全てを一気に表示させたい」）。捨てる間は
      // 焼失演出だけを出し、お知らせは捨て終わってから**1つにまとめて**見せる。
      // 【ユーザー要望2026-09-07】「複数枚捨てるときは捨てる順番を選べるようにしたい。
      // フェニックスなどの効果がある以上、捨てる順番は重要です」。赤のキューブ フェニックスは
      // **捨て場の上から2番目**を拾うので、どの順で積むかがそのまま次の一手の価値を変える。
      // 2枚以上ある時だけ、本人に「1番目に捨てる／2番目に捨てる…」と選んでもらう
      // （最後の1枚は自動＝残りが1枚になったら選ぶ意味が無い）。CPU・自動代行のときは
      // pickHandCard 側が自動で選ぶので、ここは人間かどうかを気にしなくてよい。
      // ※他の複数枚捨てる効果（スラム上がりの役人・選べる罠）は元から1枚ずつ選ぶ作りなので、
      //   すでに選んだ順に積まれている。
      // 【#344・2026-09-09】以前は1枚ずつ pickHandCard で聞いていたため、選ぶたびに
      // 「これでいいですか？」の確認が挟まり、5枚捨てる場面では確認が4回出ていた
      // （ユーザー報告「毎回これでいいかの確認は大変」）。押した順に番号が付き、もう一度
      // 押せば外れ、最後に1回だけ確定する pickHandCardsOrdered に置き換える。
      // 古い pickHandCard しか持たない呼び出し元でも動くよう、無ければ手札の並び順のまま
      // 捨てる（＝順番を選べないだけで、効果は不発にしない＝善処の原則）。
      let orderedToDiscard = toDiscard;
      if (toDiscard.length >= 2 && helpers.pickHandCardsOrdered) {
        const ordered = await helpers.pickHandCardsOrdered(
          ctx.player,
          t("ce.pickDiscardOrder", { n: 1 }),
          new Set(toDiscard.map((tk) => tk.id)),
          { purpose: "discard" }
        );
        if (Array.isArray(ordered) && ordered.length > 0) {
          // 選ばれなかった札が万一あっても必ず捨てる（全部捨てる効果のため）。
          const seen = new Set(ordered.map((tk) => tk.id));
          orderedToDiscard = [...ordered, ...toDiscard.filter((tk) => !seen.has(tk.id))];
        }
      }
      const discardedIds = [];
      for (const token of orderedToDiscard) {
        try {
          const shownId = token.cardId;
          await helpers.discardAndSync(token.id, { batchNotice: true });
          if (shownId) discardedIds.push(shownId);
        } catch (err) {
          console.error("DISCARD_HAND_IF_REVEALED_MATCHES_DECLARED: discardAndSync failed for", token.id, err);
        }
      }
      await helpers.announceCardsDiscarded?.(ctx.player, discardedIds);
      return true;
    }
    case VERBS.RITUAL_PLACE_MOVE_REPEAT: {
      // 試練の儀式専用: 隣接するマスへ山札から1枚表向きで置く→そこへ移動
      // （到達効果は得ない、ctx.arrivedAtはセットしない・置いたカードは手札にも
      // 加えない＝盤面に置かれたままになる）→置いたカードが宣言色なら「また色を
      // 宣言するところから」繰り返す。ユーザー補足:
      // ・なないろの欠片は「すべての色」を兼ねるため、出た時点で常に宣言色扱い
      //   （宣言した3色が何であっても関係なく続行する）。
      // ・「繰り返す」は同じ宣言色のまま置き直すことではなく、毎回改めて3色を
      //   宣言し直すこと。当たり続ける限り理論上いつまでも続けられる
      //   （実際には山札の残り枚数・盤面の広さで自然に打ち止めになる）。
      // 無限ループの安全弁の上限も、上記の「理論上いつまでも」を尊重して余裕を
      // 持たせてある（実戦で現実的に到達し得ない回数）。
      let declaredColors = ctx.selections.declaredColors;
      if (!declaredColors?.length) return false;
      // 不具合#46: 到達効果の二重発火で儀式が2つ同時に走らないようにする（再入ガード）。
      if (ritualPlaceMoveInProgress) return false;
      ritualPlaceMoveInProgress = true;
      try {
      let placedAny = false;
      let successCount = 0; // 宣言色に当たった回数（試練は必ずハズレで終わるので、最後にまとめて祝う）
      const MAX_ITERATIONS = 300;
      // ユーザー要望2026-08-08: 試練の緊張感を出すため心臓の鼓動を鳴らし、最後（結果表示前）に止める。
      helpers.startSuspenseSound?.();
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const adjacentCandidateCells = enumerateManhattanRing(1)
          .map(({ dr, dc }) => ({ row: ctx.pieceLocation.row + dr, col: ctx.pieceLocation.col + dc }))
          .filter(({ row, col }) => inBounds(row, col) && !hasPieceAt(row, col))
          .map(({ row, col }) => ({ zone: "cell", row, col }));
        if (adjacentCandidateCells.length === 0) break; // 善処の原則: 置ける隣接マスが無ければそこで終わる
        const dest =
          adjacentCandidateCells.length === 1
            ? adjacentCandidateCells[0]
            : await helpers.pickLocation(adjacentCandidateCells, t("ce.L1697"));
        if (!dest) break;
        // ユーザー要望2026-08-08「CPUの色選択後から移動・カード捲りまでが早すぎる」。宣言色が
        // 決まってから実際に置いて捲るまで、鼓動とともに“ため”を作る（読みやすさと緊張感）。
        await helpers.delay?.(750);
        // ユーザー要望2026-08-08「フリップする時に盤面のカードが先にオープンされていてドキドキ感が
        // ない」。山札から“裏向き”で置き（盤面ではまだ中身が見えない）、下で中央じらしフリップで
        // 公開してから盤面のカードも表向きにする。裏向き置き（placeFromDeck）は戻り値でcardIdを
        // 返さないため、置いたカードは盤面のそのマスの一番上（DRAW_FROM_PILEは末尾に追加）から取る。
        // 山札から“裏向き”で置く（盤面ではまだ中身が見えない）。オンラインでもローカル同様の
        // じらしフリップにするため（ユーザー要望2026-08-08）、placeFromDeckRevealは「引いた本人
        // だけに中身(cardId)を返す」——サーバーが revealToActor でリクエスト元にのみcardIdを返し、
        // 盤面のカードは伏せたまま（他プレイヤーには見えない）。これにより下の中央じらしフリップ→
        // 盤面フリップの順で、オンラインでもドキドキ感が出る。
        const revealedCardId = (await helpers.placeFromDeckReveal?.(dest)) ?? null;
        const topCardAtDest = () =>
          getState()
            .tokens.filter((t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === dest.row && t.location.col === dest.col)
            .slice(-1)[0];
        let placedToken = topCardAtDest();
        let placedCardId = revealedCardId ?? placedToken?.cardId;
        // フォールバック（不具合#41）: サーバー未再デプロイ等で中身が返らず、かつオンラインでは
        // 伏せカードの中身がRLSで隠れて盤面からも読めない場合は、先に盤面のカードを表向きにして
        // 判明させる（この時だけ盤面が先に見え“じらし”は効かないが、不発にはならず正常動作する）。
        if (placedToken && !placedCardId) {
          await helpers.flipCard?.(placedToken.id);
          placedToken = topCardAtDest();
          placedCardId = placedToken?.cardId;
        }
        if (!placedCardId) break; // 山札切れ等
        placedAny = true;
        // 続き59: 到達効果を得ない移動（ctx.arrivedAtを意図的にセットしない）である旨を
        // suppressArrival=trueで伝え、オンライン対戦の相手クライアント側
        // （remote-move-animator.js）が誤って到達を再現しないようにする。
        await helpers.moveAndSync(ctx.pieceTokenId, dest, undefined, true);
        ctx.pieceLocation = { row: dest.row, col: dest.col };
        // ユーザー要望2026-08-08「移動先をしっかり周知した後、じらしフリップで」。駒が移動先へ
        // 進んだ姿を一拍見せて（周知）から、中央のじらしフリップで踏んだカードを公開する。
        await helpers.delay?.(500);
        // 踏んだカードを中央に大きく“じらしてフリップ”で見せる（試練で踏んだカードは
        // 表向きで盤面に残る）。
        // 【#287】盤面のカードのめくれは、中央のじらしフリップが**開く瞬間**に合わせて
        // 同時に行う。ユーザー指摘「盤のめくれとモーダルのめくれは同時でいい。今回は盤の
        // めくれがモーダルのめくれの後に来たので、二回めくれたことになってしまっていた」。
        // 以前は中央の演出が完全に終わってから盤面をめくっていた（当時は盤面が一瞬で
        // 切り替わるだけだったので目立たなかった）が、続き432で盤面にも「めくれる動き」を
        // 付けたため、同じカードが2回めくれて見えるようになっていた。
        // onFlip は演出側（playCenterCardFlipReveal）が中央のカードを開く瞬間に呼ぶ。
        // 演出が無い環境（演出オフ・テストのスタブ）でも必ずめくれるよう、演出の後に
        // 同じ関数をもう一度呼ぶ（2回目は最初のPromiseを返すだけの no-op）。
        let boardFlipPromise = null;
        const flipBoardCardNow = () => {
          if (boardFlipPromise) return boardFlipPromise;
          const boardCardNow = getState().tokens.find((t) => t.id === placedToken.id);
          // オンラインで上の判明処理により既に表向きの場合は、二度目のflipで裏返さない。
          boardFlipPromise =
            boardCardNow && !boardCardNow.faceUp
              ? Promise.resolve(helpers.flipCard?.(placedToken.id))
              : Promise.resolve();
          return boardFlipPromise;
        };
        await helpers.announceSteppedCard?.(placedCardId, flipBoardCardNow);
        await flipBoardCardNow();
        const placedColor = getCardDefinition(placedCardId)?.color;
        const isMatch = placedCardId === "rainbow-shard" || declaredColors.includes(placedColor);
        // 続き65: 置いたカードで宣言色が判明した瞬間なので、常駐していた色宣言表示を消す
        // （当たっていた場合はこの直後にhelpers.declareColorsで新しい表示に置き換わる）。
        // 【演出③-2・賭ける】当たり／外れを表示側へ伝える（ザ・ギャンブルと同じ見せ方）。
        await helpers.announceColorsResolved?.({
          hit: isMatch,
          color: placedCardId === "rainbow-shard" ? "rainbow" : placedColor ?? null,
        });
        if (!isMatch) break; // 宣言色が出なかった＝試練終了。結果はループ後にまとめて出す。
        // 当たり。踏んだカード自体は announceSteppedCard で中央に見せているので、ここでは
        // 「おめでとう」モーダルは挟まず（ユーザー: おめでとうはダサい／最後にまとめて出す）、
        // 回数だけ数えて次の色宣言へ進む。
        successCount += 1;
        const redeclared = await helpers.declareColors({ exactCount: 3 }, ctx.cardId, ctx.player);
        if (!redeclared || redeclared.length === 0) break; // 善処の原則: 再宣言をキャンセルしたらそこで終わる
        declaredColors = redeclared;
        ctx.selections.declaredColors = declaredColors;
      }
      helpers.stopSuspenseSound?.(); // 結果表示前に鼓動を止める
      // ユーザー要望2026-08-07: 試練は必ずハズレで終わるので、最後に「〇回成功！」を出す。
      // 1回以上当てていれば紙吹雪でお祝い、0回なら控えめに残念を出す。
      // 誰の結果かが分かるように発動者名を主語に添える（総点検、ユーザー要望2026-08-08）。
      const ritualName = helpers.getPlayerName?.(ctx.player) ?? "";
      if (successCount > 0) {
        if (helpers.celebrate) {
          await helpers.celebrate(ctx.cardId, { tone: "success", headline: t("ce.ritualSuccessN", { n: successCount }), sub: t("ce.ritualEndured", { name: ritualName }) });
        } else {
          await helpers.announceEffectReason?.(ctx.cardId, t("ce.ritualEnduredN", { name: ritualName, n: successCount }));
        }
      } else {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ritualFailed", { name: ritualName }));
      }
      return placedAny;
      } finally {
        ritualPlaceMoveInProgress = false;
      }
    }
    case VERBS.ALL_PLAYERS_PLACE_ONE_CARD_IN_EMPTY_CELL: {
      // 合同建設専用: 全員がそれぞれ「何もない1マスに山札または手札から1枚裏向きで
      // 置く」を、処理順の原則に沿って1人ずつ行う。各プレイヤー自身の選択
      // （マス・山札か手札か・どのカードか）はhelpers.delegateToPlayerに委ねる
      // （main.js側：自分の番ならその場で、他プレイヤーの番ならオンライン中継で
      // 対象プレイヤー本人の画面に委任する）。
      let hadEffect = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (await helpers.delegateToPlayer(p, "joint-construction")) hadEffect = true;
      }
      return hadEffect;
    }
    case VERBS.ALL_PLAYERS_DISCARD_TO_THREE: {
      // スラム上がりの役人専用: 全員がそれぞれ「手札が3枚になるまで自分で選んで
      // 捨てる」を、処理順の原則に沿って1人ずつ行う。
      let hadEffect = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        const beforeCount = getHandTokens(p).length;
        if (await helpers.delegateToPlayer(p, "slum-official-discard")) hadEffect = true;
        // お知らせ（ユーザー要望）: 誰が何枚捨てたか（対象ごと）。委任前後の手札枚数の差から算出。
        const discarded = beforeCount - getHandTokens(p).length;
        if (discarded > 0)
          await helpers.announceEffectReason?.(ctx.cardId, t("ce.discardedN", { name: helpers.getPlayerName(p), n: discarded }));
      }
      return hadEffect;
    }
    case VERBS.ALL_PLAYERS_CHOOSE_PARTY_OPTION: {
      // パーティー専用: 全員がそれぞれ3択から1つ選んで得る、を処理順の原則に沿って
      // 1人ずつ行う。
      let hadEffect = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (await helpers.delegateToPlayer(p, "party-option")) hadEffect = true;
      }
      return hadEffect;
    }
    case VERBS.END_CURRENT_PHASE: {
      // なないろの巨光・スラム上がりの役人・ザ・ギャンブルの手札効果専用。
      helpers.endCurrentPhase?.();
      return true;
    }
    case VERBS.PLACE_SELF_ADJACENT_TO_CHOSEN_OPPONENT: {
      // プレゼント専用: 相手を選び、その隣接マス（4方向、docs/cards.mdに「何もない」の
      // 限定が無いため占有状況は問わない）へこのカード自身を裏向きで置く。
      // ユーザー要望「場に関する効果で相手を選ぶ時はアバターではなく駒を選ぶ形に」。
      // 盤面上の相手の駒のマスをpickLocationで選ばせる（マスチェンジと同じパターン）。
      const opponentCells = getAllOpponentPieceCells(ctx.player);
      if (opponentCells.length === 0) return false;
      let targetCell;
      if (opponentCells.length === 1) {
        // ユーザー要望「選べる相手が１人しかいない場合は自動でその人を選択し、その旨を
        // モーダルで示してほしい」（続き65／プレゼント等の再要望 2026-08-07）。スリカエ・
        // マスチェンジ等の「相手を選ぶ」系と揃え、手札効果のforcePrompt（対象1人でも選ばせる）
        // に関係なく自動選択する——相手が1人なら実質的に選択の余地が無いため（続き93の
        // 総点検ではマスチェンジだけを直したが、この「相手の駒を選ぶ」系にも抜けが残っていた）。
        targetCell = opponentCells[0];
        helpers.announceEffectNotice?.(ctx.cardId, t("ce.L958")); // 続き214: 非ブロック（直後の選択をすぐ可能に）
      } else {
        // #207: プレゼントは置く先の基準になる**相手（の駒）**を選ぶ。
        targetCell = await helpers.pickLocation(opponentCells, t("ce.L1834"), { pickTarget: "piece" });
      }
      if (!targetCell) return false;
      const targetPiece = findPieceAtCell(targetCell.row, targetCell.col);
      if (!targetPiece || targetPiece.location.zone !== "cell") return false;
      const adjacentCells = enumerateManhattanRing(1)
        .map(({ dr, dc }) => ({ row: targetPiece.location.row + dr, col: targetPiece.location.col + dc }))
        .filter(({ row, col }) => inBounds(row, col))
        .map(({ row, col }) => ({ zone: "cell", row, col }));
      if (adjacentCells.length === 0) return false; // 善処の原則: 盤面端で隣接マスが無い場合
      const dest =
        adjacentCells.length === 1 ? adjacentCells[0] : await helpers.pickLocation(adjacentCells, t("ce.L1697"));
      if (!dest) return false;
      await helpers.moveAndSync(ctx.cardTokenId, dest);
      // お知らせ（ユーザー要望）: 誰の隣にプレゼントを置いたか。
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.presentPlaced", { name: helpers.getPlayerName(targetPiece.player) }));
      return true;
    }
    case VERBS.PLACE_DECK_CARD_ON_ALL_FACEUP_CELLS: {
      // 白の意思の覚醒専用: 場の全ての表向きのカードの上に山札から1枚ずつ裏向きで置く
      // （１番上の原則により対象は盤面マスのトークンのみでよい、白の意思の覚醒の
      // 到達効果DISCARD_ALL_FACEUP_ON_BOARDと同じ判定基準）。
      const faceUpCells = getState()
        .tokens.filter((t) => t.kind === "card" && t.location.zone === "cell" && t.faceUp)
        .map((t) => ({ zone: "cell", row: t.location.row, col: t.location.col }));
      if (faceUpCells.length === 0) return false;
      for (const dest of faceUpCells) {
        await helpers.placeFromDeck(dest);
      }
      return true;
    }
    case VERBS.DISCARD_OWN_HAND: {
      // 色落ちキャットの手札効果専用: 全員対象のALL_PLAYERS_DISCARD_HAND_AND_DRAWと
      // 違い、自分の手札だけを全て捨てる。
      const handTokens = getHandTokens(ctx.player);
      if (handTokens.length === 0) return false;
      for (const token of handTokens) {
        await helpers.discardAndSync(token.id);
      }
      return true;
    }
    case VERBS.DISCARD_ONE_HAND_CARD: {
      // ザ・ギャンブルの手札効果専用コスト: 追色（同色限定）と違い、手札からどの色でも
      // 1枚選んで捨てる。
      // 🔴 exceptSelf（0th拡張・バスストップ）: **これ自身を候補から外す**。あちらは
      //   keepsCardOnUse でこのカードを盤面へ置くので、自分を捨ててしまうと置けなくなる
      //   （ザ・ギャンブルは先に自分を捨てる作りなので、そもそも候補に入らなかった）。
      const handTokens = getHandTokens(ctx.player).filter((tk) => !action.exceptSelf || tk.id !== ctx.cardTokenId);
      if (handTokens.length === 0) return false;
      const chosen = await helpers.pickHandCard(ctx.player, t("ce.L1880"), new Set(handTokens.map((tk) => tk.id)));
      if (!chosen) return false;
      await helpers.discardAndSync(chosen.id);
      return true;
    }
    case VERBS.DRAW_IF_HAND_AT_MOST: {
      // スラム上がりの役人専用: 手札効果は先にこのカード自身を捨ててから残りの
      // アクションが実行されるため（docs/cards.md補足）、ここでの手札枚数カウントには
      // このカード自身は含まれない。
      const handCount = getHandTokens(ctx.player).length;
      if (handCount > action.maxHandSize) return false;
      await helpers.drawCards(ctx.player, action.count);
      return true;
    }
    // ══════════════ ここから 1st EDITION（続き668） ══════════════
    case VERBS.PLACE_SELF_AT_BOARD_CENTER: {
      // 【状況】カード5種（1st）の共通の到達効果。「このカードを場の中央に表向きで置く。」
      // ⚠ 中央に既にカードがあればその上に重なる＝新しい状況が前の状況を覆う
      //   （効くのは１番上の表向きだけ＝getActiveSituationCardId）。
      // 🔴 **到達は起こさない**（第6引数 true）。中央に誰かの駒が立っていると、この札が
      //   表向きになった瞬間にその人の到達が走り、**同じ札の「中央に置く」がまた動く**
      //   （置き直すだけの無限ループになりかねない）。盤面は変わらないので実害は無い。
      if (!ctx.cardTokenId) return false;
      // 🔴【#537・2026-11-10】**既に場の中央に在るなら、置き直さず不発にする。**
      //   報告「例えば場の中央に経済成長があってそこに駒が到達した時、経済成長は場の中央に
      //   置き直しません。なので不発です！」。ユーザー判断「現状置きなおす演出が入って
      //   いますが、不発モーダルでいいです」。
      //   ⓘ false を返すと呼び出し元が「不発」のモーダルを出す。この札は
      //     addsCardToHandAfter: false なので**盤面にそのまま残る**（手札には行かない）。
      {
        const いま = getState().tokens.find((tk) => tk.id === ctx.cardTokenId);
        const 中央に在る =
          いま?.location?.zone === "cell" &&
          いま.location.row === BOARD_CENTER.row &&
          いま.location.col === BOARD_CENTER.col;
        if (中央に在る) return false;
      }
      // 🔴【#525・2026-11-07】**飛んでいる間から表の面**を見せる（landFaceUp）。
      //   報告「場に表向きで置く系のカードは、手札から飛翔する時から表向きがいい！
      //   裏向きで飛んでって場で表向きだと効果文にはない『オープン』するという行為を、
      //   挟んだことになっちゃう。例えば経済成長のカードとか。総点検して。」
      //   ⇒ 総点検した結果、**マスへ置いた後にめくるのはここだけ**だった。
      //   他の「置く」は、カードの文に「オープンする」（大地創造・誰かの白きカゲ）か
      //   「裏向きで」（大盤振舞・建設バブル・偉大なる大号令ほか）と書いてあるので、
      //   裏で飛んでから開く／裏のままで正しい。
      await helpers.moveAndSync(ctx.cardTokenId, { ...BOARD_CENTER }, undefined, undefined, false, true, {
        landFaceUp: true,
      });
      const 中央札 = getState().tokens.find((tk) => tk.id === ctx.cardTokenId);
      if (中央札 && !中央札.faceUp) await helpers.flipCard(ctx.cardTokenId);
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.fePlacedAtCenter", { card: cardDisplayName(ctx.cardId) }));
      return true;
    }
    case VERBS.QUALIFYING_PLAYERS_DRAW_AND_MOVE: {
      // 貧民の行進（1st）到達。「このカードをあなたの手札に加える。財力２以下のプレイヤーは全員、
      //   ２枚ドローし２マス移動する、移動先のカードはオープンしない。」
      // ⚠ 「プレイヤー」＝**自分も含む**（「相手」と書かれていない）。処理順は使用者から時計回り。
      // 🔴【#557 / #559・2026-11-10】「２マス移動」は**1マスずつ2回**。
      //   それまでは距離2のマス（ring）を1回選ばせていたが、ユーザー指摘のとおり
      //   「２マス先に一気に」とは別物で、**途中の道のりも選ぶ**のが正しい。
      //   ⚠ しかも「移動先のカードはオープンしない」は**裏の札をめくらない**という意味で、
      //     **既に表なら到達する**（#559「スラム街に到達しなかった」がこれ）。
      //     ⇒ 既定の到達は止めたまま（moveAndSync の第4引数 true）、
      //       triggerArrivalAtIfFaceUp を1マスごとに自分で呼ぶ。
      // 🔴 他の人の移動先は**本人に選んでもらう**（choose-cell の委任）。使用者の画面で
      //   勝手に決めると、相手の意思が入らない（#471・#506 と同じ考え方）。
      let 行進した = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (!meetsWealth(action.qualifyWealth, p)) continue;
        if (action.draw) {
          await helpers.drawCards(p, action.draw);
          行進した = true;
        }
        const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === p);
        if (!piece || piece.location.zone !== "cell") continue;
        const 歩数 = action.move ?? 2;
        for (let 歩 = 0; 歩 < 歩数; 歩++) {
          const いま = getState().tokens.find((tk) => tk.id === piece.id);
          if (!いま || いま.location.zone !== "cell") break;
          const cands = getMoveCandidates(いま.location, 1, true);
          if (cands.length === 0) break;
          let dest = null;
          if (p === ctx.player) {
            dest = cands.length === 1 && !ctx.forcePrompt
              ? cands[0]
              : await helpers.pickLocation(cands, t("ce.feMarchMove"), { purpose: "move" });
          } else {
            const 返事 = await helpers.delegateToPlayer?.(p, "choose-cell", {
              // ⚠ zone を落とさない。落とすと委任先の画面で候補のマスが1つも見つからず、
              //   選ぶ画面が出ないまま既定の候補に決まってしまう（#534）。
              candidates: cands.map((c) => ({ ...c })),
              hintKey: "ce.feMarchMoveFor",
              forPlayer: p,
            });
            if (返事 && typeof 返事.row === "number") dest = { zone: "cell", row: 返事.row, col: 返事.col };
            if (!dest) dest = cands[0]; // 委任が届かなかった時も「移動する」は守る（善処の原則）
          }
          if (!dest) break;
          // 第4引数 true ＝既定の到達をさせない（＝裏の札をめくらない）。
          await helpers.moveAndSync(piece.id, dest, undefined, true);
          helpers.recordMoveVisited?.(dest);
          if (p === ctx.player) ctx.pieceLocation = dest;
          行進した = true;
          // 🔴 既に表向きの札なら到達する（めくらないだけ）。1マスごとに見る。
          await helpers.triggerArrivalAtIfFaceUp?.(dest, p);
        }
      }
      return 行進した;
    }
    case VERBS.GIVE_HAND_CARDS_TO_CHOSEN_PLAYER: {
      // 財閥の威光（到達）「財力の１番少ないプレイヤーを１人選ぶ。そのプレイヤーの手札に
      //   あなたの手札から２枚加える。」／恋の押付け（E桃）「相手プレイヤーを１人選ぶ。
      //   あなたの手札から任意の枚数選び、その相手の手札に加える。」
      // 🔴 選ぶ範囲は data 側で決める: pick:"lowest_wealth" なら財力が1番少ない人（自分も含む
      //   ——「相手」と書かれていないため）、既定は相手全員。
      const 全員 = getState().activePlayers;
      let 候補 = 全員.filter((p) => p !== ctx.player);
      if (action.pick === "lowest_wealth") {
        const 最小 = Math.min(...全員.map((p) => getWealth(p).base));
        候補 = 全員.filter((p) => getWealth(p).base === 最小);
      }
      if (候補.length === 0) return false;
      const 相手 = 候補.length === 1 && !ctx.forcePrompt
        ? 候補[0]
        : await helpers.pickPlayer(候補, t(action.pick === "lowest_wealth" ? "ce.fePickLowestWealth" : "ce.fePickGiveTarget"));
      if (!相手) return false;
      if (相手 === ctx.player) {
        // 自分が1番少ない＝自分に渡す＝何も起きない（literal な読み）。
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.feSelfIsLowestWealth"));
        return false;
      }
      // 渡せるのは自分自身（効果カード）以外の手札。
      const 渡せる = () => getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
      const 上限 = action.count === "any" ? 渡せる().length : (action.count ?? 1);
      let 渡した = 0;
      for (let i = 0; i < 上限; i++) {
        const 残り = 渡せる();
        if (残り.length === 0) break;
        const ids = new Set(残り.map((tk) => tk.id));
        const hint = action.count === "any"
          ? t("ce.feGiveAnyMore", { name: helpers.getPlayerName(相手) })
          : t("ce.feGiveNth", { name: helpers.getPlayerName(相手), i: i + 1, n: 上限 });
        const chosen = await helpers.pickHandCard(ctx.player, hint, ids, { optional: action.count === "any" });
        if (!chosen) break; // 「任意の枚数」＝選ばなければそこで終わり
        await helpers.moveAndSync(chosen.id, { zone: "hand", player: 相手 }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(chosen.id, chosen.cardId, false, 相手);
        渡した++;
      }
      if (渡した === 0) return false;
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feGaveCards", { from: helpers.getPlayerName(ctx.player), to: helpers.getPlayerName(相手), n: 渡した })
      );
      return true;
    }
    case VERBS.PICKUP_OWN_LOCKED_TO_HAND: {
      // ロックチェンジ（1st）「あなたのロックしているカードを１枚、あなたの手札に加える。」
      // ⚠ ファースト／エターナルは他のカードの効果の対象外（DISCARD_ONE_LOCKED_CARD と同じ絞り込み）。
      const side = SEAT_TO_SIDE[ctx.player];
      const locked = getState().tokens.filter(
        (tk) => tk.kind === "card" && tk.location.zone === "lock" && tk.location.side === side && isTargetableByOtherCardEffects(tk.cardId)
      );
      if (locked.length === 0) return false;
      const cands = locked.map((tk) => tk.location);
      const dest = cands.length === 1 && !ctx.forcePrompt ? cands[0] : await helpers.pickLocation(cands, t("ce.fePickOwnLocked"));
      if (!dest) return false;
      const chosen = locked.find((tk) => tk.location.side === dest.side && tk.location.index === dest.index);
      if (!chosen) return false;
      await helpers.moveAndSync(chosen.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(chosen.id, chosen.cardId, true, ctx.player);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feTookOwnLocked", { name: helpers.getPlayerName(ctx.player), card: cardDisplayName(chosen.cardId) })
      );
      return true;
    }
    case VERBS.MOVE_CHOSEN_PLAYER_ONE_CELL: {
      // 貴族の特権（1st）手札効果の②「任意のプレイヤーを１人選ぶ。そのプレイヤーは１マス移動する。」
      // ⚠ 「任意のプレイヤー」＝自分も含む。移動先は**その本人**が選ぶ（委任）。
      // ⚠ 「移動」なので到達する（オープンしないとは書かれていない）。
      const 全員 = getState().activePlayers;
      const 相手 = 全員.length === 1 && !ctx.forcePrompt ? 全員[0] : await helpers.pickPlayer(全員, t("ce.fePickMover"));
      if (!相手) return false;
      const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === 相手);
      if (!piece || piece.location.zone !== "cell") return false;
      const cands = getMoveCandidates(piece.location, 1, false);
      if (cands.length === 0) return false;
      let dest = null;
      if (相手 === ctx.player) {
        dest = cands.length === 1 && !ctx.forcePrompt ? cands[0] : await helpers.pickLocation(cands, t("ce.feMoveOne"), { purpose: "move" });
      } else {
        const 返事 = await helpers.delegateToPlayer?.(相手, "choose-cell", {
          // ⚠ zone を落とさない（#534 と同じ理由）。
          candidates: cands.map((c) => ({ ...c })),
          hintKey: "ce.feMoveOneFor",
          forPlayer: 相手,
        });
        if (返事 && typeof 返事.row === "number") dest = { zone: "cell", row: 返事.row, col: 返事.col };
        if (!dest) dest = cands[0];
      }
      if (!dest) return false;
      await helpers.moveAndSync(piece.id, dest);
      helpers.recordMoveVisited?.(dest);
      if (相手 === ctx.player) {
        ctx.pieceLocation = dest;
        ctx.arrivedAt = dest;
      } else {
        // 🔴【#532・2026-11-09】他の人の移動先も**裏向きならオープンしてから**到達させる。
        //   報告「貴族の特権の移動させる効果について、『移動』にオープンと到達が伴うけど、
        //   オープンしませんでした」。triggerArrivalAtIfFaceUp は名前のとおり
        //   **表向きの時しか到達させない**＝裏向きのカードは開かないまま素通りしていた。
        //   handleArrivalDestination は「裏なら開けてから到達」まで面倒を見る
        //   （自分が動いた時に呼び出し元がやっているのと同じ処理＝#515 で切り出した関数）。
        //   ⓘ 到達するのは**そのマスに立っている駒の持ち主**（triggerCardArrival が
        //     getPieceOwnerAt で決める）ので、動かされた本人の到達になる。
        if (helpers.handleArrivalDestination) await helpers.handleArrivalDestination(dest);
        else await helpers.triggerArrivalAtIfFaceUp?.(dest, 相手);
      }
      return true;
    }
    case VERBS.STACK_ADJACENT_CARDS_ON_OWN_CELL: {
      // 食べ過ぎ（1st）到達「あなたの隣計４マスのカードを裏向きにして、あなたのいるマスに重ねて置く。」
      // ⚠ 「隣」＝前後左右の4マス（用語集。「周囲」＝斜めも含む8マスとは別）。
      // ⚠ 「カードを」＝そのマスのカード**全部**（枚数の指定が無い）。重ねる順は隣のマスの順。
      // 🔴 到達は起こさない（第6引数 true）。自分の足下へ**裏向きで**積むので、そもそも
      //   表向きのカードは現れない＝到達の条件を満たさない。
      const here = ctx.pieceLocation;
      if (!here || here.zone !== "cell") return false;
      let 積んだ = 0;
      for (const { dr, dc } of DIRECTIONS) {
        const row = here.row + dr;
        const col = here.col + dc;
        if (!inBounds(row, col)) continue;
        const stack = getState().tokens.filter(
          (tk) => tk.kind === "card" && tk.location.zone === "cell" && tk.location.row === row && tk.location.col === col
        );
        for (const tk of stack) {
          if (tk.faceUp) await helpers.flipCard(tk.id); // 「裏向きにして」
          await helpers.moveAndSync(tk.id, { zone: "cell", row: here.row, col: here.col }, undefined, undefined, false, true);
          積んだ++;
        }
      }
      if (積んだ === 0) return false;
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feStackedAdjacent", { name: helpers.getPlayerName(ctx.player), n: 積んだ })
      );
      return true;
    }
    case VERBS.FLIP_SELF_FACE_DOWN: {
      // 路地裏のスラム街（1st）到達①の後半「このカードを裏向きにする。」
      // ⚠ flipCard は表裏を**反転**するので、表向きの時だけ呼ぶ（平和への願いと同じ作法）。
      const self = getState().tokens.find((tk) => tk.id === ctx.cardTokenId);
      if (!self || !self.faceUp) return false;
      await helpers.flipCard(ctx.cardTokenId);
      return true;
    }
    case VERBS.PICKUP_FROM_OPPONENT_GATE: {
      // 苦渋の強盗（1st）到達「【財力≦２】相手ゲートのカードを１枚、あなたの手札に加える。」
      // ⚠ 「相手ゲート」＝自分以外の席のゲートのマス（isOpponentGateCell と同じ判定）。
      //   カードが積まれていればその１番上（１番上の原則）。
      // 🔴【#539・2026-11-09】**座っている相手のゲートだけ**を候補にする。
      //   報告「2人対戦なのに、いないプレイヤーのゲートを選択できてしまう」。
      //   盤面には4辺ぶんのゲートが常に在るので、席に誰も居ない辺を外さないと候補に出る。
      const 相手の辺 = new Set(
        (getState().activePlayers || []).filter((p) => p !== ctx.player).map((p) => SEAT_TO_SIDE[p])
      );
      const gates = [];
      for (const side of Object.keys(GATE_POSITIONS)) {
        if (!相手の辺.has(side)) continue;
        const g = GATE_POSITIONS[side];
        if (hasCardAt(g.row, g.col)) gates.push({ zone: "cell", row: g.row, col: g.col });
      }
      if (gates.length === 0) return false;
      const cell = gates.length === 1 && !ctx.forcePrompt ? gates[0] : await helpers.pickLocation(gates, t("ce.fePickOpponentGate"));
      if (!cell) return false;
      const top = findTopCardAtCell(cell.row, cell.col);
      if (!top) return false;
      const 表だった = top.faceUp;
      await helpers.moveAndSync(top.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(top.id, top.cardId, 表だった, ctx.player);
      return true;
    }
    case VERBS.STEAL_LOCKED_FROM_MOST_LOCKED: {
      // 苦渋の強盗（1st）手札効果「１番多くロックしているプレイヤーを１人選び、そのプレイヤーの
      //   ロックしているカード１枚をあなたの手札に加える。」
      // ⚠ 「プレイヤー」＝自分も含む（リトルマウスと同じ literal な読み）。自分が単独で1番多い
      //   時は自分しか選べず、自分から奪う＝何も起きない。
      const 全員2 = getState().activePlayers;
      let 最多 = -1;
      for (const p of 全員2) 最多 = Math.max(最多, countLockedCardsFor(p));
      const cands2 = 全員2.filter((p) => countLockedCardsFor(p) === 最多);
      if (cands2.length === 0) return false;
      const target2 = cands2.length === 1 && !ctx.forcePrompt ? cands2[0] : await helpers.pickPlayer(cands2, t("ce.ex0PickMostLocked"));
      if (!target2) return false;
      if (target2 === ctx.player) {
        await helpers.announceEffectReason?.(ctx.cardId, t("ce.ex0SelfIsMostLocked"));
        return false;
      }
      const side2 = SEAT_TO_SIDE[target2];
      const locked2 = getState().tokens.filter(
        (tk) => tk.kind === "card" && tk.location.zone === "lock" && tk.location.side === side2 && isTargetableByOtherCardEffects(tk.cardId)
      );
      if (locked2.length === 0) return false;
      const cells2 = locked2.map((tk) => tk.location);
      const dest2 = cells2.length === 1 && !ctx.forcePrompt ? cells2[0] : await helpers.pickLocation(cells2, t("ce.feStealLocked"));
      if (!dest2) return false;
      const chosen2 = locked2.find((tk) => tk.location.side === dest2.side && tk.location.index === dest2.index);
      if (!chosen2) return false;
      await helpers.moveAndSync(chosen2.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(chosen2.id, chosen2.cardId, true, ctx.player);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feStoleLocked", {
          name: helpers.getPlayerName(ctx.player),
          from: helpers.getPlayerName(target2),
          card: cardDisplayName(chosen2.cardId),
        })
      );
      return true;
    }
    case VERBS.STEAL_RANDOM_AND_GIVE_SELF: {
      // 裏貴族の賄賂（1st）到達「相手プレイヤーを１人選ぶ。その相手の手札から無作為に１枚、
      //   あなたの手札に加える。このカードをその相手の手札に加える。」
      const 相手候補 = getState().activePlayers.filter((p) => p !== ctx.player);
      if (相手候補.length === 0) return false;
      const 賄賂先 = 相手候補.length === 1 && !ctx.forcePrompt ? 相手候補[0] : await helpers.pickPlayer(相手候補, t("ce.fePickBribeTarget"));
      if (!賄賂先) return false;
      const tok = await helpers.pickRandomFromOpponentHand?.(賄賂先);
      if (tok) {
        await helpers.moveAndSync(tok.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(tok.id, tok.cardId, false, ctx.player);
      }
      // 「このカードをその相手の手札に加える。」＝相手の手札が空でも必ず行う（句点の原則）。
      if (ctx.cardTokenId) {
        await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: 賄賂先 }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(ctx.cardTokenId, ctx.cardId, true, 賄賂先);
      }
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feBribed", { name: helpers.getPlayerName(ctx.player), to: helpers.getPlayerName(賄賂先) })
      );
      return true;
    }
    case VERBS.BRIBE_ON_LOCK_DECLARE: {
      // 裏貴族の賄賂（1st）手札効果「相手プレイヤーがロックを宣言した時に使える。このカードを捨てる。
      //   相手がロックしようとしたカードをあなたの手札に加える。あなたの手札から１枚、その相手の手札に加える。」
      // 🔴 「ロック宣言の窓」でだけ使える（やり直しのカギと同じ仕組み）。窓はどの札を
      //   ロックしようとしているかまで覚えている（noteInterruptWindow の第3引数）。
      const 宣言者 = getLockDeclarerInWindow(ctx.player);
      const 対象札 = getLockDeclaredTokenInWindow(ctx.player);
      if (!宣言者 || !対象札) return false;
      await helpers.discardAndSync(ctx.cardTokenId); // 「このカードを捨てる。」
      await helpers.moveAndSync(対象札.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(対象札.id, 対象札.cardId, true, ctx.player);
      // 「あなたの手札から１枚、その相手の手札に加える。」
      // ⚠ いま奪った札も含めて選べる（印字に除外が書かれていない）。
      const 残り2 = getHandTokens(ctx.player).filter((tk) => tk.id !== ctx.cardTokenId);
      if (残り2.length > 0) {
        const 渡す = 残り2.length === 1 && !ctx.forcePrompt
          ? 残り2[0]
          : await helpers.pickHandCard(ctx.player, t("ce.feGiveNth", { name: helpers.getPlayerName(宣言者), i: 1, n: 1 }), new Set(残り2.map((tk) => tk.id)));
        if (渡す) {
          await helpers.moveAndSync(渡す.id, { zone: "hand", player: 宣言者 }, undefined, undefined, true);
          helpers.onCardAcquiredToHand?.(渡す.id, 渡す.cardId, false, 宣言者);
        }
      }
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feBribeStoleLock", {
          name: helpers.getPlayerName(ctx.player),
          from: helpers.getPlayerName(宣言者),
          card: cardDisplayName(対象札.cardId),
        })
      );
      return true;
    }
    case VERBS.GIVE_SELF_TO_EXTREME_WEALTH: {
      // 大富豪の気紛れ（1st）到達の後半「財力の１番多いプレイヤーを１人選び、このカードを
      //   そのプレイヤーの手札に加える。」
      // ⚠ 「プレイヤー」＝自分も含む。自分を選んだら、既定動作（手札に加える）と同じ結果になる。
      const 全員3 = getState().activePlayers;
      const 極値 = Math.max(...全員3.map((p) => getWealth(p).base));
      const cands3 = 全員3.filter((p) => getWealth(p).base === 極値);
      if (cands3.length === 0 || !ctx.cardTokenId) return false;
      const 受取 = cands3.length === 1 && !ctx.forcePrompt ? cands3[0] : await helpers.pickPlayer(cands3, t("ce.fePickHighestWealth"));
      if (!受取) return false;
      await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: 受取 }, undefined, undefined, true);
      helpers.onCardAcquiredToHand?.(ctx.cardTokenId, ctx.cardId, true, 受取);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feGaveSelfTo", { card: cardDisplayName(ctx.cardId), to: helpers.getPlayerName(受取) })
      );
      return true;
    }
    case VERBS.ALL_OPPONENTS_DISCARD_LOCKED_AND_DRAW: {
      // 大富豪の気紛れ（1st）手札効果「相手プレイヤーは全員、自分のロックしているカードを
      //   １枚捨て、２枚ドロー。」
      // 🔴 どのロック札を捨てるかは**その本人**に選んでもらう（ロック札は公開情報なので
      //   使用者の画面でも選べるが、自分の札をどう手放すかは本人の判断＝#471・#506 の考え方）。
      let 何か起きた = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (p === ctx.player) continue;
        const sideP = SEAT_TO_SIDE[p];
        const lockedP = getState().tokens.filter(
          (tk) => tk.kind === "card" && tk.location.zone === "lock" && tk.location.side === sideP && isTargetableByOtherCardEffects(tk.cardId)
        );
        if (lockedP.length > 0) {
          let 捨てる = lockedP[0];
          if (lockedP.length > 1) {
            const 返事2 = await helpers.delegateToPlayer?.(p, "choose-cell", {
              candidates: lockedP.map((tk) => ({ ...tk.location })),
              hintKey: "ce.fePickOwnLockedToDiscard",
              forPlayer: p,
            });
            const 見つけた = 返事2 ? lockedP.find((tk) => tk.location.index === 返事2.index && tk.location.side === 返事2.side) : null;
            if (見つけた) 捨てる = 見つけた;
          }
          await helpers.discardAndSync(捨てる.id);
          何か起きた = true;
        }
        if (action.draw) {
          await helpers.drawCards(p, action.draw);
          何か起きた = true;
        }
      }
      return 何か起きた;
    }
    case VERBS.EQUALIZE_HAND_SIZES: {
      // ドゥエンの革命（1st）到達「手札が１番多いプレイヤーは、手札が１番少ないプレイヤーの
      //   手札枚数になるまでカードを捨て、手札が１番少ないプレイヤーは、手札が１番多い
      //   プレイヤーの手札枚数になるまでドロー。」
      // 🔴 **数えるのは「手札の枚数」**（財力ではない＝印字のとおり。Eカードの＋1は入らない）。
      // 🔴 捨てる枚数・引く枚数は**最初に1回だけ**決める（捨てた後に数え直すと、
      //   「1番少ない人」が入れ替わって無限に続いてしまう）。
      const 全員4 = getState().activePlayers;
      const 枚数 = new Map(全員4.map((p) => [p, getHandTokens(p).length]));
      const 最多4 = Math.max(...枚数.values());
      const 最少4 = Math.min(...枚数.values());
      if (最多4 === 最少4) return false; // 全員同じ＝何も起きない
      let 革命した = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        const n = 枚数.get(p);
        if (n === 最多4) {
          // 🔴 捨てるのは本人に選ばせる（オンラインでは相手の手札の中身が見えない）。
          if (p === ctx.player) {
            if (await runAction({ verb: VERBS.DISCARD_OWN_HAND_DOWN_TO, keep: 最少4 }, ctx, helpers)) 革命した = true;
          } else if (await helpers.delegateToPlayer?.(p, "discard-down-to", { n: 最少4 })) {
            革命した = true;
          }
        } else if (n === 最少4) {
          await helpers.drawCards(p, 最多4 - 最少4);
          革命した = true;
        }
      }
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.feRevolution", { most: 最多4, least: 最少4 }));
      return 革命した;
    }
    case VERBS.ALL_PLAYERS_DISCARD_TO_FEWEST: {
      // 偉大なる大号令（1st）到達の3文目「プレイヤー全員は、１番手札の少ないプレイヤーの
      //   手札枚数になるまで手札を捨てる。」
      const 全員5 = getState().activePlayers;
      const 最少5 = Math.min(...全員5.map((p) => getHandTokens(p).length));
      let 捨てた5 = false;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        if (getHandTokens(p).length <= 最少5) continue;
        if (p === ctx.player) {
          if (await runAction({ verb: VERBS.DISCARD_OWN_HAND_DOWN_TO, keep: 最少5 }, ctx, helpers)) 捨てた5 = true;
        } else if (await helpers.delegateToPlayer?.(p, "discard-down-to", { n: 最少5 })) {
          捨てた5 = true;
        }
      }
      return 捨てた5;
    }
    case VERBS.PLACE_DECK_CARDS_AROUND_CENTER: {
      // 偉大なる大号令（1st）到達の1文目「場の中央の周囲８マスに山札からカードを裏向きで置く。」
      let 置いた8 = 0;
      for (const { dr, dc } of enumerateSurroundingOffsets()) {
        const row = BOARD_CENTER.row + dr;
        const col = BOARD_CENTER.col + dc;
        if (!inBounds(row, col)) continue;
        if (getState().piles.deck.length === 0) break;
        await helpers.placeFromDeck({ zone: "cell", row, col });
        置いた8++;
      }
      if (置いた8 === 0) return false;
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.placedFromDeckN", { name: helpers.getPlayerName(ctx.player), n: 置いた8 })
      );
      return true;
    }
    case VERBS.ALL_PLAYERS_MOVE_TO_CENTER_ADJACENT: {
      // 偉大なる大号令（1st）到達の2文目「プレイヤー全員は、場の中央の上下左右（各自ゲートの
      //   方角）のマスに移動し、移動先のカードはオープンしない。」
      // 🔴 「各自ゲートの方角」＝その人のゲートから中央を見た向き。ゲートの座標が分かれば
      //   決まるので**選ぶ余地が無い**（誰にも聞かない）。
      // ⚠ そのマスに既に誰かが居たら動かない（駒は1マスに1つ＝物理ルール）。
      let 動いた9 = 0;
      for (const p of rotatedActivePlayersFrom(ctx.player)) {
        const g = GATE_POSITIONS[SEAT_TO_SIDE[p]];
        if (!g) continue;
        const dr = Math.sign(g.row - BOARD_CENTER.row);
        const dc = Math.sign(g.col - BOARD_CENTER.col);
        const row = BOARD_CENTER.row + dr;
        const col = BOARD_CENTER.col + dc;
        if (!inBounds(row, col) || hasPieceAt(row, col)) continue;
        const piece = getState().tokens.find((tk) => tk.kind === "piece" && tk.player === p);
        if (!piece) continue;
        if (piece.location.zone === "cell" && piece.location.row === row && piece.location.col === col) continue;
        // 第4引数 true ＝到達させない（＝移動先のカードはオープンしない）。
        await helpers.moveAndSync(piece.id, { zone: "cell", row, col }, undefined, true);
        helpers.recordMoveVisited?.({ zone: "cell", row, col });
        if (p === ctx.player) ctx.pieceLocation = { zone: "cell", row, col };
        動いた9++;
      }
      return 動いた9 > 0;
    }
    case VERBS.PICKUP_ALL_AT_CHOSEN_CELL_TO_HAND: {
      // 愚直な欲求（E橙・1st）手札効果「任意の１マスのカードをすべてあなたの手札に加える。」
      const cells10 = getAnyCellWithCardCandidates();
      if (cells10.length === 0) return false;
      const cell10 = cells10.length === 1 && !ctx.forcePrompt ? cells10[0] : await helpers.pickLocation(cells10, t("ce.fePickCellTakeAll"));
      if (!cell10) return false;
      const stack10 = getState().tokens.filter(
        (tk) => tk.kind === "card" && tk.location.zone === "cell" && tk.location.row === cell10.row && tk.location.col === cell10.col
      );
      if (stack10.length === 0) return false;
      // １番上から順に取る（１番上の原則）。
      for (const tk of [...stack10].reverse()) {
        const 表 = tk.faceUp;
        await helpers.moveAndSync(tk.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
        helpers.onCardAcquiredToHand?.(tk.id, tk.cardId, 表, ctx.player);
      }
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feTookWholeCell", { name: helpers.getPlayerName(ctx.player), n: stack10.length })
      );
      return true;
    }
    case VERBS.WEALTH_BONUS_FOR_ALL_UNTIL_NEXT_TURN: {
      // 富豪の教え（E黄・1st）手札効果「次のあなたのターン開始時までプレイヤー全員は、
      //   財力を１多く計算する。この効果は１ターンに１度のみ得られる。」
      // ⚠ 「１ターンに１度」は効果データの usageLimit が見る（ここでは何もしない）。
      registerWealthBonusForAll(getState().turnNumber);
      await helpers.announceEffectReason?.(ctx.cardId, t("ce.feWealthBonusAll"));
      return true;
    }
    case VERBS.SWAP_ENTIRE_HAND_WITH_CHOSEN: {
      // カオスチェンジ（E紫・1st）手札効果「相手プレイヤーを１人選ぶ。その相手と手札を
      //   すべて交換する。このターンを終了する。」
      // 🔴 このカード自身（エターナル）は交換しない——ロックエリアに在るか、手札に在っても
      //   「他のカードの効果の対象にならない」ので動かさない。
      const 相手候補11 = getState().activePlayers.filter((p) => p !== ctx.player);
      if (相手候補11.length === 0) return false;
      const 相手11 = 相手候補11.length === 1 && !ctx.forcePrompt ? 相手候補11[0] : await helpers.pickPlayer(相手候補11, t("ce.fePickSwapTarget"));
      if (!相手11) return false;
      const 動かせる = (p) => getHandTokens(p).filter((tk) => tk.id !== ctx.cardTokenId && isTargetableByOtherCardEffects(tk.cardId));
      const 自分の札 = 動かせる(ctx.player);
      const 相手の札 = 動かせる(相手11);
      if (自分の札.length === 0 && 相手の札.length === 0) return false;
      for (const tk of 自分の札) await helpers.moveAndSync(tk.id, { zone: "hand", player: 相手11 }, undefined, undefined, true);
      for (const tk of 相手の札) await helpers.moveAndSync(tk.id, { zone: "hand", player: ctx.player }, undefined, undefined, true);
      for (const tk of 相手の札) helpers.onCardAcquiredToHand?.(tk.id, tk.cardId, false, ctx.player);
      for (const tk of 自分の札) helpers.onCardAcquiredToHand?.(tk.id, tk.cardId, false, 相手11);
      await helpers.announceEffectReason?.(
        ctx.cardId,
        t("ce.feSwappedHands", { name: helpers.getPlayerName(ctx.player), other: helpers.getPlayerName(相手11) })
      );
      return true;
    }
    // ══════════════ ここまで 1st EDITION ══════════════
    case VERBS.INHERIT_ARRIVAL_ACTIONS: {
      // ザ・ギャンブルの手札効果専用: 到達効果と全く同じactionsをそのまま実行する
      // （続き29のeffectDef単位inheritsArrivalフラグと違い、前後に別のアクションを
      // 挟めるアクション単位の仕組み）。
      const arrivalDef = CARD_EFFECTS[ctx.cardId]?.arrival;
      if (!arrivalDef?.actions?.length) return false;
      let hadEffect = false;
      for (const a of arrivalDef.actions) {
        if (await runActionSafely(a, ctx, helpers)) hadEffect = true;
      }
      return hadEffect;
    }
    default:
      console.warn(`card-effect-engine: 未対応の動詞 "${action.verb}"`);
      return false;
  }
}

// ユーザー報告「ザ・ギャンブルで宣言色が出てしまったときに、手札がすべて捨てられず
// 止まってしまっている」の調査で発見: runAction単体が例外を投げると（未実装の
// helper呼び出し等）、呼び出し元のfor-of loopにtry/catchが無いため、そこで例外が
// そのまま外まで伝播し、以降のアクション（手札を全て捨てる・フェイズを終了する等）が
// 一切実行されないまま効果全体が静かに止まる（コンソールにエラーは出るがユーザー
// 画面には何も表示されない）。1つのアクションの失敗が後続を道連れにしないよう、
// runAction/runActionSafelyを呼ぶ4箇所全て（runArrivalEffect・runHandEffectOption・
// runArrivalOptionsEffect・INHERIT_ARRIVAL_ACTIONS）でこちらを使う。
async function runActionSafely(action, ctx, helpers) {
  try {
    const result = await runAction(action, ctx, helpers);
    logAction("effect-verb", { verb: action.verb, cardId: ctx.cardId, player: ctx.player, result });
    return result;
  } catch (err) {
    console.error(`card-effect-engine: アクション実行に失敗（動詞 "${action.verb}"）`, err);
    logAction("effect-verb", { verb: action.verb, cardId: ctx.cardId, player: ctx.player, result: "error", error: String(err) });
    return false;
  }
}

// 🔴【#555・2026-11-11】**複数マスを選ぶ時は、選んだマスをもう一度押すと外れる。**
//   ユーザー要望（押し間違いの救い）。同じことをする所が3つある（裏を見る／山札から置く／
//   迷いの森の捨てる順）ので、**1つの関数に寄せる**——別々に書くと必ず片方だけ直して
//   食い違う（このプロジェクトで何度も踏んだ形）。
//   ⚠ **既に選んだマスも候補に残す**（残さないと押せない＝外せない）。
//   ⚠ これ以上選べるマスが無くなったら抜ける（やり直しは呼び出し側の「いいえ」でできる）。
//   ⚠ 光らせ直しは**毎回まとめて**行う（1つずつ足し引きすると、外した時にズレる）。
async function pickCellsWithDeselect(helpers, { want, listCells, label, pickOpts, forcePrompt, highlight }) {
  const 鍵 = (c) => c.row + "," + c.col;
  const 選んだ = [];
  const 光らせ直す = () => {
    if (!highlight) return;
    helpers.clearPlacementTargets?.();
    for (const c of 選んだ) helpers.markPlacementTarget?.(c);
  };
  // ⚠ 押した回数の上限。**付け外しは人が押すものなので現実には届かない数**だが、
  //   上限が無いと「同じマスが返り続ける」経路があった時に**対局が固まる**
  //   （実際にテスト用スタブがそうなって止まった）。固まるより打ち切る方が安全。
  //   🔴【#578・2026-11-11】**上限に当たった時は行動ログへ1行残す。**
  //   報告「迷いの森をCPUが踏んだらなんかマス選択をし続けて動かなくなりました」＝
  //   **自動の席が同じマスを選び直し続けていた**（main.js 側で候補から外すようにした）。
  //   上限は効いていたが、**何も残らないので『固まった』としか見えなかった**。
  let 回数 = 0;
  const 上限 = want * 20 + 40;
  while (選んだ.length < want) {
    if (++回数 > 上限) {
      try {
        logAction("diag-cell-pick-loop", { want, 上限, 選んだ: 選んだ.length, label: String(label(0)).slice(0, 24) });
      } catch (err) {
        /* ログが書けなくても打ち切る方を優先 */
      }
      break;
    }
    const base = listCells();
    if (base.length === 0) break;
    if (選んだ.length >= base.length) break; // これ以上は選べない（全部選び終わった）
    const 自動 = base.length === 1 && !forcePrompt && want <= 1;
    const 文 = label(選んだ.length + 1) + (highlight ? t("ce.tapAgainToUnselect") : "");
    // 🔴 いま選んでいるマスも渡す（画面では光っている。検査用のスタブもこれを見る）。
    const cell = 自動 ? base[0] : await helpers.pickLocation(base, 文, { ...pickOpts, selectedCells: 選んだ });
    if (!cell) break;
    const i = 選んだ.findIndex((c) => 鍵(c) === 鍵(cell));
    if (i >= 0) { 選んだ.splice(i, 1); 光らせ直す(); continue; } // もう一度押した＝外す
    選んだ.push(cell);
    光らせ直す();
  }
  return 選んだ;
}

// 選べる罠専用: 「以下の効果のうち1つ得る」形の到達効果（arrivalOptions）を処理する。
// なないろの欠片のhandEffectOptionsと同じ考え方だが、選ぶのはこのカードの到達効果
// 自身なので、使えるプレイヤーは常にeffectの使用者本人（対象選択は不要）。
async function runArrivalOptionsEffect(ctx, options, helpers) {
  const runCtx = {
    player: ctx.player,
    cardId: ctx.cardId,
    cardTokenId: ctx.cardTokenId,
    pieceTokenId: ctx.pieceTokenId,
    pieceLocation: ctx.pieceLocation,
    selections: {},
    arrivedAt: null,
  };
  const usableOptions = options.filter((opt) => isArrivalOptionUsable(runCtx.player, runCtx.pieceLocation, opt, ctx.cardId));
  let hadEffect = false;
  // 1st EDITION（路地裏のスラム街）: 選んだ選択肢を最後まで覚えておく（下の既定動作が見る）。
  let 選んだ選択肢 = null;
  if (usableOptions.length > 0) {
    const optionsWithUsability = options.map((opt) => ({ ...opt, usable: usableOptions.includes(opt) }));
    const chosen = await helpers.pickArrivalOption(ctx.cardId, optionsWithUsability);
    if (chosen) {
      // 選べる罠（3択から1つ得る）で選んだ内容を全員に告知（choose-effect-reveal方針）。
      // ユーザー報告2026-08-18「手札を半分捨てるを押した後、しばらく手札クリックが効かない」:
      // 告知(announceEffectChoice)は約2.9秒ブロックするため、この間ずっと次の操作（捨てる
      // カード選択）へ進めず手札クリックが効かなかった。pink-partyと同じく、告知は待たずに
      // 走らせ（announced）すぐ次のアクションへ進み、最後に完了だけawaitする（ペーシング/
      // CPU結果ホールドは保つ）。「〇〇を選びました」モーダル表示中に手札を選べてよい。
      const announced = helpers.announceEffectChoice?.(ctx.cardId, ctx.player, optionLabel(chosen));
      // 🔴 到達効果の選択肢の**追色コスト**（0th拡張・紅の鉄拳）。手札効果側
      //   （runHandEffectOption）と同じ順番——アクションより前に払う。払えなければ不発。
      if (chosen.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
        const color = getCardDefinition(ctx.cardId)?.color;
        const candidates = findSameColorDiscardCandidates(null, color, ctx.player);
        const paid = await helpers.pickDiscardCost?.(
          candidates,
          t("ce.pickCostColor", { color: color === "white" || color === "black" ? "" : t("ce.sameColor") })
        );
        if (!paid) {
          await announced;
          await helpers.announceFizzle?.(ctx.cardId, true);
          const tk = getState().tokens.find((x) => x.id === ctx.cardTokenId);
          if (tk && tk.location.zone === "cell") await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: ctx.player });
          return runCtx.arrivedAt;
        }
        await helpers.discardAndSync(paid.id);
      }
      選んだ選択肢 = chosen;
      for (const action of chosen.actions) {
        if (await runActionSafely(action, runCtx, helpers)) hadEffect = true;
      }
      await announced;
    }
  }
  // docs/cards.md補足「全て選べないときは効果は不発となる。効果が不発の時は、この
  // カードをあなたの手札に加えるだけである」。選べる選択肢自体が無い場合に加え、
  // 選択肢はあったが（プレイヤーがピッカーをキャンセルした等で）結局何も起きなかった
  // 場合も同じ扱いにする。
  if (!hadEffect) {
    await helpers.announceFizzle?.(ctx.cardId, true);
  }
  // runArrivalEffectの既定動作と同じ理由（このカード自身が、選択肢の中の「場の
  // カードを手札に加える」系アクションで既に別プレイヤーの手札へ渡っている
  // 可能性がある）で、まだ盤面に残っている場合だけ動かす。
  // 🔴 1st EDITION（路地裏のスラム街の①）だけは**盤面に残す**。「このカードを裏向きにする。」
  //   ＝裏向きでそのマスに在り続けるのが正しく、手札へ持っていくと効果が消える。
  //   選択肢ごとに違う（②は今までどおり手札へ入る）ので、**選んだ選択肢に書く**。
  const currentToken = getState().tokens.find((t) => t.id === ctx.cardTokenId);
  if (currentToken && currentToken.location.zone === "cell" && !選んだ選択肢?.keepsCardOnBoard) {
    await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: ctx.player });
  }
  return runCtx.arrivedAt;
}

// 到達効果を自動処理する。ctx: { cardId, player, pieceTokenId, cardTokenId, pieceLocation }。
// 戻り値: 効果中にmoveが発生し新しいマスへ到達した場合はその場所（呼び出し元が続けて
// そのマスの到達判定を行うために使う）、それ以外はnull。
export async function runArrivalEffect(ctx, helpers) {
  // 選べる罠専用: `arrival`ではなく`arrivalOptions`でデータを持つカードは別経路。
  const arrivalOptions = CARD_EFFECTS[ctx.cardId]?.arrivalOptions;
  if (arrivalOptions) return runArrivalOptionsEffect(ctx, arrivalOptions, helpers);
  const effectDef = CARD_EFFECTS[ctx.cardId]?.arrival;
  if (!effectDef) return null;
  // ハマりどころ: このctx（このファイル冒頭のドキュメントコメント通り本来
  // cardTokenIdを含むはず）にcardTokenIdが抜けていた。runAction内でctx.cardTokenId
  // を参照するアクション（現状はPLACE_CARDのsource:"self"）が実行時に必ずundefined
  // を受け取ってしまうバグだったため、ここで明示的に引き継ぐ。
  const runCtx = {
    player: ctx.player,
    cardId: ctx.cardId,
    cardTokenId: ctx.cardTokenId,
    pieceTokenId: ctx.pieceTokenId,
    pieceLocation: ctx.pieceLocation,
    selections: {},
    arrivedAt: null,
  };
  // 不具合報告#203「収穫と種まきに到達して、効果でその収穫と種まき自身を指定し、場に戻したのに
  // 最終的に手札に加わった」。下の既定動作（到達したカードを手札に加える）は「そのカードがまだ
  // 盤面に残っているか」だけを見ていたため、効果が**一度手札へ回収してから場に置き直した**場合も
  // 「盤面に残っている」と判定して、もう一度手札へ持っていってしまっていた。効果が一度でも
  // このカードを盤面の外（手札・捨て場等）へ動かしていたら、その行き先は効果が決めた結果なので
  // 既定動作は行わない。
  let arrivalCardMovedByEffect = false;
  // 【#353】「色落ちキャットの下のジャンプ台が発動しなかった」。到達したカードが**自分で自分を
  // 捨てる**（DISCARD_SELF＝色落ちキャット・なないろの巨光）と、駒の足元には下にあったカードが
  // 新しく一番上として現れる。手札に加える既定動作（moveAndSync）はその「露出した下のカードへの
  // 到達（コンボ）」を起こすが、捨てる経路（discardAndSync）は起こしていなかった。
  // 捨てた元のマスを控えておき、効果を全部処理し終えた後（手札に加える場合と同じ順番）で起こす。
  let selfDiscardedFrom = null;
  const wrappedHelpers = {
    ...helpers,
    moveAndSync: (tokenId, location, ...rest) => {
      if (tokenId === ctx.cardTokenId && location?.zone !== "cell") arrivalCardMovedByEffect = true;
      return helpers.moveAndSync(tokenId, location, ...rest);
    },
    discardAndSync: (tokenId, ...rest) => {
      if (tokenId === ctx.cardTokenId && !selfDiscardedFrom) {
        const loc = getState().tokens.find((t) => t.id === tokenId)?.location;
        if (loc?.zone === "cell") selfDiscardedFrom = { ...loc };
      }
      return helpers.discardAndSync(tokenId, ...rest);
    },
  };
  let hadEffect = false;
  // 🔴 既定は**句点の原則どおり「前の句が不発でも次の句は行う」**（今までの動き）。
  //   ただし前提が崩れる並びもある——オレンジバスの「『バスストップ』のあるマスに移動する。
  //   これをあなたの隣に表向きで置く。」は、移動できなかったのに置く所だけ走ると
  //   **元いたマスの隣に置いてしまう**（実際にテストで出た）。そういう句にだけ
  //   データ側で stopIfPreviousFailed を立てる。
  let 直前が成功 = true;
  // 🔴 【#492・2026-11-04】**「直前」ではなく「ここまで全部」に掛けたい句もある。**
  //   オレンジバスの到達は「『バスストップ』のあるマスに移動する。これをあなたの隣に表向きで
  //   置く。**その**「バスストップ」をあなたの手札に加える。」の3句。3句目の「その」は
  //   1句目で移った先の札を指すので、**移動できていなければ行わない**のが正しいが、
  //   2句目（置く）は成功するので `stopIfPreviousFailed` では止まらない。
  let ここまで全部成功 = true;
  // 🔴 1st EDITION の【財力】。条件を満たしていなければ**この到達効果は丸ごと不発**。
  //   ⚠ カード自身を手札に加える既定動作は**そのまま行う**（印字に「これはあなたの手札に
  //     加えない」と書かれていない限り、条件を満たさなくても札は手に入る＝不発の扱いと同じ）。
  const 財力を満たす = meetsWealth(effectDef.wealth, ctx.player);
  if (!財力を満たす) {
    logAction("effect-wealth-unmet", {
      cardId: ctx.cardId, player: ctx.player, wealth: formatWealth(getWealth(ctx.player)),
      need: describeWealthRequirement(effectDef.wealth),
    });
  }
  for (const action of 財力を満たす ? effectDef.actions : []) {
    if (action.stopIfPreviousFailed && !直前が成功) break;
    if (action.stopIfAnyPreviousFailed && !ここまで全部成功) break;
    直前が成功 = await runActionSafely(action, runCtx, wrappedHelpers);
    if (!直前が成功) ここまで全部成功 = false;
    if (直前が成功) hadEffect = true;
  }
  // ユーザー要望「効果が不発だった場合（例: マスチェンジで３マス以内に相手がいない等）
  // は『不発のためこのカードを手札に加えます』的なモーダルを出しましょう」。アクションが
  // 1つ以上あるのに1つも実際には起きなかった場合だけが対象——なないろの欠片のように
  // actions:[]（＝到達効果自体が元々存在しないカード）は「不発」ではなく仕様通りの
  // 「何もしない」なので、こちらは対象外にする。
  if (effectDef.actions.length > 0 && !hadEffect) {
    await helpers.announceFizzle?.(ctx.cardId, effectDef.addsCardToHandAfter !== false);
  }
  // 既定動作（到達効果処理後にこのカード自身を手札に加える）。明示的にfalseの時だけ省略する
  // （docs/cards.mdの凡例通り）。
  // ユーザー報告「パーティの到達効果で場のカードを取ることを選んだ時、到達した
  // パーティのカード自身も対象にでき取れるが、到達していないプレイヤーがそれを
  // 取ったとき、そのプレイヤーの手札に加わらず到達プレイヤーに持っていかれて
  // しまう」の原因: パーティー等の「全員がそれぞれ選ぶ」効果（ALL_PLAYERS_
  // CHOOSE_PARTY_OPTION→delegateToPlayer）の中の「場の任意の１枚を手札に加える」
  // 選択肢は、まだ盤面に残っているこのカード自身（ctx.cardTokenId）も候補に
  // 含み得る。誰かがそれを選んで既に自分の手札へ移していても、ここの既定動作は
  // 無条件にctx.cardTokenIdを「到達プレイヤーの手札」へ動かしてしまい、既に
  // 別のプレイヤーへ渡っていたはずのカードを奪い返す形になっていた。このカードが
  // まだ盤面（cellゾーン）に残っている場合だけ既定動作を行うようにする。
  if (effectDef.addsCardToHandAfter !== false && !arrivalCardMovedByEffect) {
    const currentToken = getState().tokens.find((t) => t.id === ctx.cardTokenId);
    if (currentToken && currentToken.location.zone === "cell") {
      // 手札へ移す前に、獲得するカードのidと公開状態を控えておく（移動後はcellから消えるため）。
      const addedCardId = currentToken.cardId;
      const wasFaceUp = !!currentToken.faceUp;
      // 0th拡張（ヴィヴィアン）: 宛先が付け替えられていればそちらへ（上の説明参照）。
      const 宛先 = redirectArrivalHandTarget(ctx.player);
      // ユーザー要望「到達後、そのカードが実際に手札へ吸い込まれて加わるアニメを入れたい」。
      // 到達したカードが手札へ入る飛翔は moveAndSyncForEffect（main.js）が「マス→手札」を検知して
      // playCardLiftToHand（配置演出と統一した“持ち上げ→手札へグライド”）で出す（続き211）。以前は
      // ここで helpers.flyCardToHand を別途 await していたが、演出を一本化するため moveAndSync 側へ移した。
      await helpers.moveAndSync(ctx.cardTokenId, { zone: "hand", player: 宛先 });
      // ユーザー報告2026-08-07「到達したカードを獲得した時、右下のカード獲得トーストが
      // 出ていない気がする」。手動の到達（addArrivedCardToHand）は announceHandPickups で
      // 通知していたが、自動処理経由のこの既定動作では通知が漏れていた。同じトーストを出す。
      helpers.announceCardAddedToHand?.(addedCardId, 宛先, wasFaceUp);
    }
  }
  // 【#353】自分で自分を捨てたカードの下から現れたカードへの到達（上の selfDiscardedFrom の説明）。
  // 駒がまだそのマスにいて、下のカードが表向きの時だけ起きる（判定は呼び出し側の関数が持つ）。
  // 待つのは収穫と種まき（#85）と同じ理由——下のカードの効果（ジャンプ台なら移動）が済む前に
  // ターンの終わりへ進まないように。
  if (selfDiscardedFrom) await helpers.triggerExposedArrival?.(selfDiscardedFrom, ctx.cardTokenId);
  return runCtx.arrivedAt;
}

// 選ばれた1つの選択肢を実際に実行する（runHandEffectの内部処理を切り出したもの）。
async function runHandEffectOption(ctx, option, helpers) {
  // 【#419・2026-10-18】**もう手札に無い札で、もう一度効果が走るのを止める。**
  // 不具合報告「たたかってるときに、七色のカード２枚しかもってなかったけど、七色のカードを
  // クリックしまくってたら２つの色ろっくできて勝っちゃいました」。行動ログでは、
  // 1回目の発動で**ロック0番へ置いた**なないろの欠片(card-208)が、2回目の発動でも
  // ctx.cardTokenId として使われ、**0番から2番へ引きずり出されていた**（0番には相方が
  // 残るので、**1色が無から増えて**7色に届き勝利していた）。
  // 大半のカードは発動の最初に自分自身を捨てる（下の discardAndSync）ので二重発動しても
  // 実害が出にくいが、**なないろの欠片の「2枚をロックする」選択肢は keepsCardOnUse で
  // カードを残す**ため、同じ札を何度でもロックし直せてしまう。
  // ★ ファースト/エターナルは「これがロックされていても手札効果を使える」特別枠なので
  // 対象外（判定は下の discardAndSync の分岐と同じ cardId の命名規則）。
  if (!ctx.cardId.startsWith("eternal-") && !ctx.cardId.startsWith("first-")) {
    if (!getHandTokens(ctx.player).some((tk) => tk.id === ctx.cardTokenId)) {
      logAction("diag-hand-effect-stale", {
        cardId: ctx.cardId,
        tokenId: ctx.cardTokenId,
        player: ctx.player,
        zone: getState().tokens.find((tk) => tk.id === ctx.cardTokenId)?.location?.zone ?? null,
      });
      return false;
    }
  }
  // 🔴 1st EDITION の【財力】。isHandEffectOptionUsable で既に止めているが、**実行側にも置く**
  //   ——CPU・持ち時間切れの代行・割り込みの経路は、使えるかの判定を通らずにここへ来ることが
  //   ある（#72 のフェニックスで「判定にだけ条件があり、実行側で止めていた」逆の形を踏んでいる）。
  //   まだ何も捨てていない・何も見せていないこの位置で返すので、札も演出も無駄にならない。
  if (!meetsWealth(option.wealth, ctx.player)) {
    logAction("effect-wealth-unmet", {
      cardId: ctx.cardId, player: ctx.player, wealth: formatWealth(getWealth(ctx.player)),
      need: describeWealthRequirement(option.wealth), where: "hand",
    });
    return false;
  }
  // ユーザー要望「手札効果を使用したら、このカードが使用されるよ！って知らしめる
  // モーダルをしっかりと出したい」。実際の状態変更（捨てる・コスト支払い等）より前、
  // 「このカードを使う」と決まった瞬間に出す。
  // 続き218: 追色コストありの手札効果（V5）は、コスト確定後に「吸収→霧散」演出を出すため、
  // ここでの視覚・音・broadcastを遅延する（deferVisual）。追色なし（V4）は従来通りここで霧散演出。
  const hasAddColorCost = option.cost?.verb === VERBS.DISCARD_SAME_COLOR;
  // 【#274】追色なし(V4)の霧散演出も**完了を待つ**（追色あり(V5)は下の playAdditionalColorUse で
  // 待っている）。待たないと、演出が始まった直後に効果本体のモーダル（試練の儀式なら色宣言）が
  // 重なって出る。演出OFF・タップでのスキップ時も必ず解決するので、ここで止まることはない。
  await helpers.announceUse?.(ctx.cardId, optionLabel(option), ctx.player, { deferVisual: hasAddColorCost });
  // ユーザー指摘: 手札効果は「原則まず最初にそのカードを捨てて効果を発動する」。
  // 凡例（docs/cards.md）「効果カード自身の処遇の記載がなければ、効果発動時に
  // このカードを捨てる」の「発動時に」は、追色コストの支払いやアクション実行より
  // 前——最初のステップだという指摘。実際、スラム上がりの役人の手札効果補足
  // 「あなたの手札が１枚以下ならの時の手札のカウントの際にこのカード自身は含まない」
  // の通り、後続のアクションが「捨てた後の手札状態」を参照する効果が実在するため、
  // 単なる見た目の順序の話ではなく実際に先に捨てておく必要がある。エターナル/
  // ファーストカードは基本効果「これの手札効果はこれがロックされていても使える」の
  // 通り消費されない特別枠のため、このデフォルトの対象外（cardIdの命名規則で判定、
  // main.js側の他の分岐と同じ基準）。なないろの欠片の「２枚をロックする」選択肢の
  // ように、選択肢自体がこのカードを別の形で処遇する場合はkeepsCardOnUseで上書きする。
  if (!option.keepsCardOnUse && !ctx.cardId.startsWith("eternal-") && !ctx.cardId.startsWith("first-")) {
    // 【#274】焼失演出は出さない（noBurn）。直前の使用演出で同じカードが霧散していくところを
    // 既に見せているので、続けて焼失まで出すと同じカードが2回消えるように見える。
    await helpers.discardAndSync(ctx.cardTokenId, { noBurn: true });
  }
  // 🔴 【追色S】用。実際に払った追色コストの枚数（既定の1枚払いなら1、追色なしなら0）。
  //   紅の鉄拳の「接触で奪えるカードはSの２倍」がこれを読む（runCtx.addColorPaid）。
  let 払った追色 = 0;
  if (option.cost?.verb === VERBS.DISCARD_SAME_COLOR) {
    // フェニックス(first-red)ループ防止(#72): これから追色コストを払うと、その後の
    // PICKUP_DISCARD_SECOND_FROM_TOP が拾うのは「今の捨て場の一番上」(discard[len-1])に
    // なる。それがこのターン既に first-red の追色コストとして捨てた cardId なら、2枚を
    // ぐるぐる回す無限ループになるため、コストを払う前にここで使用を止める（コスト札を
    // 無駄にしない。別のカードを拾う正当な複数回使用は一切妨げない）。
    if (ctx.cardId === "first-red") {
      const discardPile = getState().piles.discard;
      const futureTargetCardId = discardPile.length >= 1 ? discardPile[discardPile.length - 1] : null;
      if (futureTargetCardId && isPhoenixCostCardThisTurn(futureTargetCardId)) {
        await helpers.announceEffectReason?.(
          ctx.cardId,
          t("ce.L2082")
        );
        return false;
      }
    }
    const color = getCardDefinition(ctx.cardId)?.color;
    const candidates = findSameColorDiscardCandidates(ctx.cardTokenId, color, ctx.player);
    // ユーザー要望「追色カードを手札から選択するステップを踏んでください」。候補が
    // 1枚でも自動採用せず、常にpickDiscardCostのステップを踏ませる。
    const chosen = await helpers.pickDiscardCost(candidates, t("ce.pickCostColor", { color: color === "white" || color === "black" ? "" : t("ce.sameColor") }));
    if (!chosen) return false;
    // 続き218・V5: 追色コスト確定後、捨てる“前”（コスト札のDOMがまだ手札にある間）に演出を発火。
    // 使用カードへ追色カードを吸い込み→脈動→霧散→右の使用モーダル。
    // 【2026-09-01】以前は fire-and-forget だったため、演出の最中に効果本体（セレスティアなら
    // 「相手の手札を選ぶ」モーダル）が走って重なっていた（ユーザー報告）。**演出の完了を待つ**。
    // 画面タップでスキップできる（card-dissolve.js）ので、待っても待たされ続けることはない。
    await helpers.playAdditionalColorUse?.(ctx.cardId, optionLabel(option), chosen.id);
    await helpers.discardAndSync(chosen.id);
    // このコストで捨てた cardId を、first-red のときだけ記録（上のループ防止判定で使う）。
    if (ctx.cardId === "first-red") notePhoenixCostCard(chosen.cardId);
    払った追色 = 1;
    // 🔴 【追色S】（紅の鉄拳・0th拡張）: 払う枚数を**使う人が決める**。
    //   「追色コストをS枚支払う（これと同色のS枚のカードをあなたの手札から捨てる）」
    //   「Sは自然数」「あなたの手札にある同色のカードの枚数まで」「Sは１以上」。
    //   ⇒ 1枚目は上の既定の流れで払い済みなので、ここでは**2枚目以降**を聞く。
    //   ⚠ 既定（variable なし）のカードはここを素通りする＝今までどおり1枚。
    if (option.cost.variable) {
      const 残り候補 = findSameColorDiscardCandidates(ctx.cardTokenId, color, ctx.player);
      const 上限 = 1 + 残り候補.length;
      // 1枚しか払えないなら聞かない（選ぶ余地が無い＝他の動詞と同じ作法）。
      const S = 上限 <= 1 ? 1 : (await helpers.pickNumber?.(ctx.cardId, 1, 上限, t("ce.ex0PickAddColorS"))) ?? 1;
      for (let i = 1; i < S; i++) {
        const なお候補 = findSameColorDiscardCandidates(ctx.cardTokenId, color, ctx.player);
        if (なお候補.length === 0) break;
        const つぎ = await helpers.pickDiscardCost(
          なお候補,
          t("ce.pickCostColor", { color: color === "white" || color === "black" ? "" : t("ce.sameColor") })
        );
        if (!つぎ) break; // 途中でやめたら、そこまでの枚数で確定する
        await helpers.playAdditionalColorUse?.(ctx.cardId, optionLabel(option), つぎ.id);
        await helpers.discardAndSync(つぎ.id);
        払った追色++;
      }
    }
  }
  const piece = getState().tokens.find((t) => t.kind === "piece" && t.player === ctx.player);
  // ハマりどころ: このruncCtxにcardTokenIdが抜けていたため、runAction内で
  // ctx.cardTokenIdを参照するアクション（LOCK_PAIRの「自分自身は除外して同名の
  // もう1枚を探す」判定、PLACE_CARDのsource:"self"等）が実行時に必ずundefinedを
  // 受け取ってしまうバグだった（LOCK_PAIRの場合、`t.id !== ctx.cardTokenId`が
  // 常にtrueになり除外が効かなくなる）。ctx.cardTokenIdをそのまま引き継ぐ。
  const runCtx = {
    player: ctx.player,
    cardId: ctx.cardId,
    cardTokenId: ctx.cardTokenId,
    pieceTokenId: piece?.id ?? null,
    pieceLocation: piece?.location ?? null,
    selections: {},
    arrivedAt: null,
    // 【追色S】払った追色コストの枚数（＝S）。紅の鉄拳だけが読む。
    addColorPaid: 払った追色,
    // ユーザー要望「対象が１人でもハイライトして選ばせるステップを踏んでください」。
    // 到達効果（runArrivalEffect）は従来通り候補1つなら自動採用のまま
    // （テンポを優先、今回の要望の対象外）——手札効果だけこのフラグで切り替える。
    forcePrompt: true,
  };
  // 到達効果側と同じ「前の句が不発なら続けない」（上の runArrivalEffect のコメント参照）。
  let 直前が成功 = true;
  let ここまで全部成功 = true; // 【#492】「ここまで全部」に掛ける句のため（到達側と同じ）
  for (const action of option.actions) {
    if (action.stopIfPreviousFailed && !直前が成功) break;
    if (action.stopIfAnyPreviousFailed && !ここまで全部成功) break;
    直前が成功 = await runActionSafely(action, runCtx, helpers);
    if (!直前が成功) ここまで全部成功 = false;
  }
  // 【#515】駒が動いた先のカードを開けて到達させる（到達効果の側と同じ道を通す）。
  // ⚠ ここを忘れると「手札効果で動かされた時だけオープンしない」という、
  //   いちばん分かりにくい形で出る（報告そのもの）。
  if (runCtx.arrivedAt) await helpers.handleArrivalDestination?.(runCtx.arrivedAt);
  recordHandEffectUsage(ctx.cardId, ctx.player);
  return true;
}

// 手札効果を自動処理する。ctx: { cardId, cardTokenId, player }。helpers（moveAndSync等の
// 既存分に加えて）:
//   discardAndSync(tokenId): 「追色」コストで実際にカードを1枚捨てる（オンライン同期込み）。
//   pickDiscardCost(candidates, hint): 追色コストの候補（同色の手札トークン配列）から
//     1枚選ばせる。
//   pickHandEffectOption(cardId, optionsWithUsability): 選択肢が2つ以上ある手札効果
//     （なないろの欠片等）で、どれを使うか選ばせる。optionsWithUsabilityの各要素は
//     `{...option, usable}` — usable:falseの選択肢はグレー表示にする（ユーザー要望）。
//     選ばれたoptionオブジェクト（またはキャンセル時null）を返す。
//   drawCards(player, count): 山札からplayerの手札へcount枚引く（オンライン同期込み）。
//   placeFromDeck(location): 山札の一番上を直接そのマスへ裏向きで置く（オンライン同期込み、
//     PLACE_CARDのsource:"deck"用）。
//   swapPieces(pieceTokenId, fromLocation, toLocation): 自分の駒と、toLocationにいる相手の
//     駒の位置を入れ替える（SWAP_POSITION用）。
//   announceUse(cardId, optionLabel): 「このカードを使用します」の告知モーダルを出す。
// マスチェンジ等、手札効果でも到達効果と同じアクション（PICKUP_TO_HAND・PLACE_CARD・
// SWAP_POSITION等）を使うカードが出てきたため、到達効果と同じrunAction()ディスパッチャを
// 共有する。自分の駒はplayerから引ける（盤面上に必ず1つだけ存在するため、呼び出し元から
// 別途渡してもらう必要は無い）。
// 戻り値: 実際に発動できた（コストを払えた）ならtrue、使用回数制限・コスト不足・
// 選択肢を選ばず終わった等で発動できなかったならfalse（呼び出し元がその旨を案内するために使う）。
export async function runHandEffect(ctx, helpers) {
  const options = getHandEffectOptions(ctx.cardId);
  if (options.length === 0) return false;
  if (!canUseHandEffect(ctx.cardId, ctx.cardTokenId, ctx.player)) return false;
  let chosenOption;
  if (options.length === 1) {
    chosenOption = options[0];
  } else {
    // ユーザー要望「手札効果は２つあります。効果選択モーダルを出してください。
    // 使用できない方はグレー表示。」
    const optionsWithUsability = options.map((opt) => ({
      ...opt,
      usable: isHandEffectOptionUsable(ctx.cardId, ctx.cardTokenId, ctx.player, opt),
    }));
    // #230「なないろのかけら２枚使えず」の切り分け用（2026-09-04）。選択肢がグレー表示に
    // なった時、その瞬間に何がどこにあったのかを行動ログへ残す（カード名は自分の手札の分だけ
    // ＝伏せ情報は入らない）。次に同じ報告が来たら「本当に2枚とも手札にあったのか」を推測せず
    // 判定できるようにするため。
    if (optionsWithUsability.some((o) => !o.usable)) {
      logAction("diag-hand-option-unusable", {
        cardId: ctx.cardId,
        player: ctx.player,
        options: optionsWithUsability.map((o) => ({ id: o.id, usable: o.usable })),
        sameCardCount: getHandTokens(ctx.player).filter((tk) => tk.cardId === ctx.cardId).length,
        sameCardZones: getState()
          .tokens.filter((tk) => tk.kind === "card" && tk.cardId === ctx.cardId && tk.location.player === ctx.player)
          .map((tk) => tk.location.zone),
      });
    }
    chosenOption = await helpers.pickHandEffectOption(ctx.cardId, optionsWithUsability);
    if (!chosenOption) return false;
    // 「選ぶ系」の手札効果（なないろの欠片 等、複数選択肢から1つ）は、選んだ内容を全員に
    // 告知する（ユーザー要望・choose-effect-reveal方針）。単一効果（options.length===1）は
    // 選択ではないので告知しない。
    await helpers.announceEffectChoice?.(ctx.cardId, ctx.player, optionLabel(chosenOption));
  }
  return runHandEffectOption(ctx, chosenOption, helpers);
}
