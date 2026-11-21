// 最後のロック承認バナー（画面上部中央、常設）: state.jsのpendingFinalLockを見て、
// 「誰が最後のロックに挑戦中か」「今誰の承認待ちか」を表示し、承認/却下ボタンを出す。
// ユーザー要望「最後のロックをしようとした時は他プレイヤー全員の承認が必要。左隣から
// 時計回りに承認を得られればロックでき勝利となる」を実装したもの。
//
// 実際の状態変更（respondFinalLock呼び出し・オンライン中のfetchAndHydrate・演出の発火）は
// main.jsが握っている（isOnlineMode()・fetchAndHydrate・triggerLockEffect等、必要な依存を
// 既に持っているため）。このモジュール自体はGROUPS/TOGGLE_SECTIONS等と同じ「表示専用」の
// 役割に徹し、ボタンが押された時にmain.jsから注入されたハンドラを呼ぶだけにする
// （setup-animation.js/remote-move-animator.jsと同じ「main.jsから注入してもらう」既存パターン）。

import { getState } from "./state.js";
import { isOnlineMode, getSelfSeat, isSpectatingGame } from "./online.js";
import { getPlayerName } from "./player-identity.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ6
import { getCardImagePath } from "./cards-data.js";

// 紫のキューブ「ゴメンナサイッ！」のカードID（ボタンに実物の絵を出すのに使う）。
const GOMENNASAI_CARD_ID = "purple-sorry";

let bannerEl = null;
let respondHandler = null;
// ゴメンナサイの最後のロック割り込み（続き64、ユーザー確認済み方針「コストを払える
// 人だけが却下（＝妨害）できる」）。checkEligibilityは承認者の座席を受け取り、
// ゴメンナサイ＋追色1コストを払えるなら真を返す（main.jsのfindGomennasaiEligibility）。
// 払えない承認者にはボタン自体を出さない（main.js側のcheckGomennasaiAutoApproval()が
// 自動で承認する）。
let checkGomennasaiEligibility = null;
let useGomennasaiHandler = null;
// 【CPU強化 2026-08-08】承認者がローカルCPU戦のCPU席の時に真を返す判定（main.jsから注入）。
// 真の時はバナーの承認/ゴメンナサイのボタンを人間に出さず「CPUの承認を待っています…」表示に
// する（人間がCPUの代わりに承認・発動してしまうのを防ぐ。実際の承認/ゴメンナサイ発動は
// main.jsのcheckCpuFinalLockApprovalが自動で行う）。
let isApproverAutoDriven = null;
export function registerApproverAutoDrivenCheck(fn) {
  isApproverAutoDriven = fn;
}

// ユーザー要望2026-08-08（#36a）「『ゴメンナサイを使う』を押した後は『ロックエリアの奪う
// カードを選んでください』的な案内に切り替わってほしい」。押してから奪う札を選び終えるまでの間、
// main.js側がこれをtrueにする。その間バナーは承認/ゴメンナサイのボタンを引っ込め、案内だけ出す。
let gomennasaiPicking = false;
// 🔴【続き799】押した後の案内は**札ごとに違う**（ゴメンナサイ＝奪う札を選ぶ／
//   ちょっと待った！＝追色に捨てる札を選ぶ）。札ごとに差し替えられるようにした。
//   ⚠ 渡さなければ今までどおりゴメンナサイの文（既定を変えていない）。
let gomennasaiPickingLabels = null; // { titleKey, statusKey }
export function setGomennasaiPicking(v, labels = null) {
  gomennasaiPicking = !!v;
  gomennasaiPickingLabels = v ? labels : null;
}

export function registerFinalLockApprovalHandler(fn) {
  respondHandler = fn;
}

export function registerGomennasaiHelpers({ checkEligibility, onUseGomennasai }) {
  checkGomennasaiEligibility = checkEligibility;
  useGomennasaiHandler = onUseGomennasai;
}

// 🔴【続き799】**割り込める札はゴメンナサイッ！だけではない。** 旧0th「ちょっと待った！」も
//   同じ窓（最後のロックの全員承認）に割り込む。今までこのファイルは1枚を決め打ちして
//   いたので、**並べられる形**に広げた（3枚目が来ても同じ穴を掘らないように）。
//   ⚠ ゴメンナサイッ！の分は今までの道のまま（上の2つの変数）＝見た目も順番も変わらない。
//   ⚠ 1件は { cardId, checkEligibility, onUse, labelKey }。labelKey を省けば
//     ゴメンナサイと同じ「このカードを使う」になる。
const EXTRA_INTERRUPT_CARDS = [];
export function registerFinalLockInterruptCard(entry) {
  if (!entry || !entry.cardId) return;
  if (EXTRA_INTERRUPT_CARDS.some((e) => e.cardId === entry.cardId)) return; // 二重登録は無視
  EXTRA_INTERRUPT_CARDS.push(entry);
}
function eligibleExtraInterrupts(approver) {
  return EXTRA_INTERRUPT_CARDS.filter((e) => {
    try {
      return !!e.checkEligibility?.(approver);
    } catch (err) {
      console.error("final-lock interrupt check failed", e.cardId, err);
      return false; // 判定が落ちても承認そのものは止めない
    }
  });
}
// このバナーに割り込みの札のボタンを1つ作る（ゴメンナサイと見た目をそろえる）。
function buildInterruptCardButton(cardId, labelText, onClick) {
  const btn = document.createElement("button");
  btn.className = "final-lock-approval-reject final-lock-approval-gomennasai";
  btn.type = "button";
  const img = document.createElement("img");
  img.className = "final-lock-approval-gomennasai-card";
  // ⚠ getCardImagePath は「文字を焼き込んだ絵を持たない札」（旧0th 等）では
  //   文字なしの下地へ自分で振り替える＝404 にならない（cards-data.js 参照）。
  img.src = getCardImagePath(cardId);
  img.alt = "";
  img.draggable = false;
  btn.appendChild(img);
  const label = document.createElement("span");
  label.textContent = labelText;
  btn.appendChild(label);
  btn.addEventListener("click", onClick);
  return btn;
}

export function buildFinalLockApprovalBanner() {
  bannerEl = document.createElement("div");
  bannerEl.id = "final-lock-approval-banner";
  document.body.appendChild(bannerEl);
  return bannerEl;
}

// 直近に描画したバナー内容の署名。render()は対局中ひっきりなしに呼ばれ、そのたびに
// このバナーを作り直す（innerHTML=""）と、ユーザーがボタンを押す瞬間にDOMごと差し替わり
// クリックが取りこぼされる（ユーザー報告「ゴメンナサイを使うを押しても何も起きない」の
// 主因）。中身が変わらない限り作り直さないよう、署名が一致する間はDOMをそのまま残す。
let lastBannerSignature = null;
function hideBanner() {
  if (lastBannerSignature === null) return;
  bannerEl.classList.remove("is-visible");
  bannerEl.innerHTML = "";
  lastBannerSignature = null;
}

export function updateFinalLockApprovalBanner() {
  if (!bannerEl) return;
  const pending = getState().pendingFinalLock;
  if (!pending || pending.queue.length === 0) {
    hideBanner();
    return;
  }
  const approver = pending.queue[0];
  // ローカルモードは1人で全座席を操作するテスト用途のため、既存の「座席を持っていれば
  // 何でも動かせる」方針を踏襲し、常にボタンを押せるようにする。オンライン中だけ、
  // 実際にその座席でログインしている本人にだけ操作を許可する。
  // ローカルCPU戦でCPU席が承認者の時は、人間に操作させず「待っています…」表示にする。
  const autoDriven = !!isApproverAutoDriven?.(approver);
  // 【2026-09-21】観戦者は対局に関与しない（getSelfSeat()は観戦中「見ている席」を返すため、
  // これが無いとその席の本人として応答UIが出てしまう）。
  const canRespond = !isSpectatingGame() && (!isOnlineMode() || getSelfSeat() === approver) && !autoDriven;
  // #36a: 「ゴメンナサイを使う」を押して奪う札を選んでいる最中は、承認/却下ボタンを引っ込め、
  // 「ロックエリアから奪うカードを選んでください」の案内だけに切り替える。
  if (gomennasaiPicking && canRespond) {
    const signature = "gomennasai-picking|" + approver + "|" + (gomennasaiPickingLabels?.titleKey ?? "");
    if (signature === lastBannerSignature) {
      bannerEl.classList.add("is-visible");
      return;
    }
    lastBannerSignature = signature;
    bannerEl.classList.add("is-visible");
    bannerEl.innerHTML = "";
    const title = document.createElement("div");
    title.className = "final-lock-approval-title";
    title.textContent = t(gomennasaiPickingLabels?.titleKey ?? "game.finalLock.gomennasaiTitle");
    bannerEl.appendChild(title);
    const status = document.createElement("div");
    status.className = "final-lock-approval-status";
    status.textContent = t(gomennasaiPickingLabels?.statusKey ?? "game.finalLock.gomennasaiPick");
    bannerEl.appendChild(status);
    return;
  }
  // ユーザー確認済み方針「コストを払える人だけが却下（＝妨害）できる」。払えない
  // 承認者にはボタン自体を見せず、バナー全体を隠す（main.js側のcheckGomennasaiAuto
  // Approval()がこの承認者を検知し、自動で承認して先へ進める。「あなたの承認が
  // 必要です」と見せておいてすぐ消えるチラつきを避けるため、最初から出さない）。
  const isEligibleForGomennasai = canRespond && !!checkGomennasaiEligibility?.(approver);
  // 🔴【続き799】ゴメンナサイッ！以外の割り込みの札（旧0th「ちょっと待った！」）。
  //   これを混ぜ忘れると、**その札を持っている人が黙って自動承認されて**、持っているのに
  //   一度も使えないまま勝たれる（ゴメンナサイで #180 以前に起きていたのと同じ形）。
  const extraInterrupts = canRespond ? eligibleExtraInterrupts(approver) : [];
  // オンラインでは、ゴメンナサイを使えない人にも「承認する」だけのバナーを出す
  // （情報漏れ対策。main.js の checkGomennasaiAutoApproval のコメント参照）。
  // ローカルのCPU戦は従来通り、使えない席は自動承認されるのでバナーを出さない。
  if (canRespond && !isEligibleForGomennasai && extraInterrupts.length === 0 && !isOnlineMode()) {
    hideBanner();
    return;
  }
  // 中身が変わらない限り作り直さない（作り直すと連打レンダーにクリックを奪われる）。
  // 署名には表示に効く全要素（挑戦者/承認者/操作可否/ゴメンナサイ可否＋表示名）を含める。
  const signature = [
    pending.attacker,
    approver,
    canRespond,
    isEligibleForGomennasai,
    // ⚠ 足した札の分も署名に入れる。入れないと「使えるようになったのにボタンが出ない」
    //   （中身が変わらない限り作り直さない作りなので＝連打レンダー対策）。
    extraInterrupts.map((e) => e.cardId).join(","),
    getPlayerName(pending.attacker),
    getPlayerName(approver),
  ].join("|");
  if (signature === lastBannerSignature) {
    bannerEl.classList.add("is-visible"); // 念のため可視状態は維持
    return;
  }
  lastBannerSignature = signature;
  bannerEl.classList.add("is-visible");
  bannerEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "final-lock-approval-title";
  title.textContent = t("game.finalLock.title", { name: getPlayerName(pending.attacker) });
  bannerEl.appendChild(title);

  const status = document.createElement("div");
  status.className = "final-lock-approval-status";
  status.textContent = canRespond
    ? t("game.finalLock.needYou", { name: getPlayerName(approver) })
    : t("game.finalLock.waiting", { name: getPlayerName(approver) });
  bannerEl.appendChild(status);

  if (canRespond) {
    const buttons = document.createElement("div");
    buttons.className = "final-lock-approval-buttons";
    const approveBtn = document.createElement("button");
    approveBtn.className = "final-lock-approval-approve";
    approveBtn.type = "button";
    approveBtn.textContent = t("game.finalLock.approve");
    approveBtn.addEventListener("click", () => respondHandler?.(true));
    buttons.appendChild(approveBtn);
    // ゴメンナサイを持っていて追色1を払える場合だけ、却下の代わりにこのボタンを出す
    // （続き64）。使うと相手が既に持っているロック1枚を奪ってから、相手の新しい
    // ロック自体は承認したのと同じ扱いで進む（card-effects.jsのpurple-sorryコメント
    // 参照）。
    // 【2026-10-12】ユーザー報告「承認＝緑／ゴメンナサイ＝赤で押し間違えた」。赤は
    // 「やめる・キャンセル」に見えるのに、ここでは**ゴメンナサイの方が能動的な選択**なので
    // 読み違える。**色を入れ替えるのではなく**（入れ替えると今度は逆向きに誤読される）、
    // ゴメンナサイ側に**実際のカードそのもの**を出して「このカードを使う」と分かるようにし、
    // 承認側からは色を抜く（ユーザー了承済みの案）。
    // 🔴【続き799】ゴメンナサイッ！を持っていない時はこのボタンを出さない。
    //   以前は必ず出していたが、割り込みの札が増えた今は**持っている札のボタンだけ**を出す
    //   （持っていない札のボタンを押しても何も起きない＝#729 の家族）。
    //   ⚠ オンラインでは「使えない人にも承認だけのバナーを出す」方針なので、
    //     ここへ来ても両方が空のことがある（承認ボタンだけが並ぶ＝今までどおり）。
    if (isEligibleForGomennasai) {
      buttons.appendChild(
        buildInterruptCardButton(GOMENNASAI_CARD_ID, t("game.finalLock.useGomennasaiCard"), () => useGomennasaiHandler?.())
      );
    }
    for (const entry of extraInterrupts) {
      const labelText = entry.labelKey ? t(entry.labelKey) : t("game.finalLock.useGomennasaiCard");
      buttons.appendChild(buildInterruptCardButton(entry.cardId, labelText, () => entry.onUse?.()));
    }
    bannerEl.appendChild(buttons);
  }
}
