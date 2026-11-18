// 【続き756】**「続きから」＝自分が入っている進行中の対局へ戻る札。**
//
// 🔴 なぜ要るか（調べて分かったこと）
//   このアプリの目標は「オンライン非同期対戦（各自が自分のタイミングで手番を進める）」で、
//   持ち時間は既定オフなので**待っていても対局は消えない**。ところが——
//     ・「どの対局に居たか」は online.js の currentGameId（ただの変数）にしか無い
//       ＝**アプリを閉じる／読み込み直すと消える**
//     ・so7_games_list は status='open' だけを返すので、**始まった対局は一覧に出ない**
//     ・観戦の一覧は「見る」用（席を取らないので自分の手は打てない）
//   ⇒ **自分の対局へ戻る道が1つも無かった。** 手番が来たことを知らせても押す先が無い。
//   だから通知より先にこれを作った。
//
// ⚠ ホーム画面を**待たせない**。札は先に（空で）置き、中身は通信が終わってから入れる
//   （#685 でマイページが通信を待って遅れたのと同じ形を作らない）。
//   1件も無ければ札ごと消える＝ふだんは何も見えない。
// ⚠ 既定の画面と v2 の**両方**に出す。これは試作の飾りではなく「戻れない」を直す物なので、
//   片方だけに出すと「ある時だけ出る」（#477 の家族）になる。
// ⚠ 新しい画像は1枚も使わない。
import { t } from "./ui-text.js";
import { logAction } from "./action-log.js";

// 戻った後に何をするか（ホームを閉じる等）は呼び元が渡す。ここは online.js しか知らない。
export function buildResumeMatchCard({ onResume } = {}) {
  const card = document.createElement("div");
  card.id = "home-resume-match";
  card.style.display = "none"; // 中身が入るまで出さない（空の箱を見せない）
  void 中身を入れる(card, onResume);
  return card;
}

async function 中身を入れる(card, onResume) {
  let 対局たち = [];
  try {
    const { listMyActiveGames } = await import("./online.js");
    対局たち = await listMyActiveGames();
  } catch (err) {
    // ⚠ ログインしていない・通信できない時は**黙って出さない**（ホームに赤い字を出さない）。
    return;
  }
  if (!Array.isArray(対局たち) || 対局たち.length === 0) return;
  // ⚠ 札がもう画面から外されていたら何もしない（開いてすぐ閉じた時）。
  if (!card.isConnected) return;

  // 🔴 自分の番のものを先に出す（押したい物が上に来る）。
  対局たち.sort((a, b) => (b.myTurn ? 1 : 0) - (a.myTurn ? 1 : 0));

  const 見出し = document.createElement("div");
  見出し.className = "home-resume-label";
  見出し.textContent = t("resume.label");
  card.appendChild(見出し);

  for (const g of 対局たち.slice(0, 3)) {
    card.appendChild(作る行(g, onResume));
  }
  if (対局たち.length > 3) {
    const 残り = document.createElement("div");
    残り.className = "home-resume-more";
    残り.textContent = t("resume.more", { n: 対局たち.length - 3 });
    card.appendChild(残り);
  }
  // 🔴【続き756】**「手番が来たら知らせる」をここで1回だけ勧める。**
  //   なぜここか: 通知の許可を聞く所は**ランク戦の中にしか無かった**ので、フレンドリー
  //   マッチだけで遊ぶ人には「あなたの番です」が1通も届かない（許可→購読が無いと送れない）。
  //   ⇒ 勧めるのに**いちばん筋が通る場所**がここ。進行中の対局が在って、しかも自分の番で
  //     ない人だけに出る＝「待っている人」にだけ出る。しかも押すのは**人の操作**なので、
  //     ブラウザが許可を求められる（背景の処理からでは requestPermission が通らない）。
  //   ⚠ 対局の最中には出さない（手を止めない）。ホームの札の中だけ。
  // 🔴 **プッシュが使える端末かを、本家の判定（push-notify.js）に聞く。**
  //   自分で条件を書き写すと必ずズレる。とくに **iPhone の Safari（ホーム画面に追加して
  //   いない状態）では Notification は在るのに PushManager が無い**＝勧めても届かないので、
  //   そこで勧めてはいけない（押せない約束を残さない＝#729 の家族）。
  let プッシュが使える = false;
  try {
    const pn = await import("./push-notify.js");
    プッシュが使える = !!pn.isPushSupported?.() && !!pn.isPushConfigured?.();
  } catch (err) {
    プッシュが使える = false;
  }
  const 勧め = プッシュが使える ? 作る勧め(対局たち) : null;
  if (勧め) card.appendChild(勧め);
  card.style.display = "";
  logAction("diag-resume-list", {
    count: 対局たち.length,
    myTurn: 対局たち.filter((g) => g.myTurn).length,
  });
}

// 「手番が来たら知らせる」の勧め。出す条件がそろわなければ null（＝何も出さない）。
const 勧めの鍵 = "so7-turn-notify-asked-v1";
function 作る勧め(対局たち) {
  try {
    // ⚠ 一度でも答えた端末には二度と出さない（ねだらない）。
    if (localStorage.getItem(勧めの鍵)) return null;
  } catch (e) {
    /* localStorage が使えない端末では勧めない（答えを覚えられないので） */
    return null;
  }
  // 通知そのものが使えない端末には出さない。
  if (typeof Notification === "undefined") return null;
  // 既に許可／拒否が決まっているなら聞く意味が無い（"default" の時だけ聞ける）。
  if (Notification.permission !== "default") return null;
  // 🔴 「待っている人」にだけ出す。全部が自分の番なら、いま知らせる必要は無い。
  if (!対局たち.some((g) => !g.myTurn)) return null;

  const 箱 = document.createElement("div");
  箱.className = "home-resume-ask";

  const 文 = document.createElement("div");
  文.className = "home-resume-ask-text";
  文.textContent = t("resume.askNotify");
  箱.appendChild(文);

  const 列 = document.createElement("div");
  列.className = "home-resume-ask-btns";

  const はい = document.createElement("button");
  はい.type = "button";
  はい.className = "home-resume-ask-yes";
  はい.textContent = t("resume.askNotifyYes");
  はい.addEventListener("click", async () => {
    覚える();
    はい.disabled = true;
    try {
      // 🔴 **人が押した流れの中でしか許可は取れない**ので、ここで直接呼ぶ。
      const 答え = await Notification.requestPermission();
      logAction("diag-turn-notify-ask", { answer: 答え });
      if (答え === "granted") {
        const { subscribeToPush } = await import("./push-notify.js");
        await subscribeToPush();
      }
    } catch (err) {
      logAction("diag-turn-notify-ask-failed", { reason: String(err?.message || err).slice(0, 120) });
    }
    箱.remove();
  });
  列.appendChild(はい);

  const いいえ = document.createElement("button");
  いいえ.type = "button";
  いいえ.className = "home-resume-ask-no";
  いいえ.textContent = t("resume.askNotifyNo");
  いいえ.addEventListener("click", () => {
    覚える();
    logAction("diag-turn-notify-ask", { answer: "declined" });
    箱.remove();
  });
  列.appendChild(いいえ);

  箱.appendChild(列);
  return 箱;
}
function 覚える() {
  try {
    localStorage.setItem(勧めの鍵, "1");
  } catch (e) {
    /* 覚えられなくても、この場の答えは効く */
  }
}

function 作る行(g, onResume) {
  const 行 = document.createElement("button");
  行.type = "button";
  行.className = "home-resume-row" + (g.myTurn ? " is-my-turn" : "");
  行.dataset.gameId = g.gameId;

  const 左 = document.createElement("div");
  左.className = "home-resume-main";

  const 誰 = document.createElement("div");
  誰.className = "home-resume-who";
  // 名前が取れない時は人数で言う（「？さんとの対局」より分かりやすい）。
  const 名前たち = (g.opponents || []).filter(Boolean);
  誰.textContent = 名前たち.length
    ? t("resume.vs", { names: 名前たち.join("・") })
    : t("resume.vsUnknown");
  左.appendChild(誰);

  const 状況 = document.createElement("div");
  状況.className = "home-resume-state";
  const 節 = [];
  if (g.myTurn) 節.push(t("resume.yourTurn"));
  else if (g.turnPlayer) 節.push(t("resume.theirTurn"));
  if (Number.isFinite(g.turnNumber)) 節.push(t("resume.turn", { n: g.turnNumber }));
  if (g.isRanked) 節.push(t("resume.ranked"));
  状況.textContent = 節.join(" ・ ");
  左.appendChild(状況);
  行.appendChild(左);

  const 右 = document.createElement("div");
  右.className = "home-resume-go";
  右.textContent = t("resume.go");
  行.appendChild(右);

  行.addEventListener("click", async () => {
    if (行.disabled) return;
    行.disabled = true;
    右.textContent = t("resume.going");
    try {
      const { rejoinMyGame } = await import("./online.js");
      await rejoinMyGame(g.gameId);
      logAction("diag-resume-entered", { gameId: g.gameId, seat: g.seat });
      // 盤面を見せるのは呼び元（ホームを閉じる等）。ここで画面の面倒は見ない。
      onResume?.(g.gameId);
    } catch (err) {
      // 🔴 黙って戻らないのが最悪（#729 の教訓）。理由をそのまま出す。
      行.disabled = false;
      右.textContent = t("resume.go");
      const 理由 = String(err?.message || err || "").slice(0, 160);
      logAction("diag-resume-failed", { gameId: g.gameId, reason: 理由 });
      try {
        const { showNoticeModal } = await import("./ui-helpers.js");
        showNoticeModal(t("resume.failedBody", { reason: 理由 }), { 見出し: t("resume.failedTitle") });
      } catch (e2) {
        /* モーダルも出せない時は、せめてボタンを押し直せる状態に戻す */
      }
    }
  });
  return 行;
}
