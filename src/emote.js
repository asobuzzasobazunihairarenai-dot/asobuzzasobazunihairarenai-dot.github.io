// エモート機能（続き78）。ユーザー要望「左下の巨大アバターを押すとマイページではなく
// エモートを選べるようにしたい。よろしく、ごめん、とか取り合ずそういうの！押すと
// 相手の画面の自分のアバターからその言葉が吹き出しで出る」。マイページへの入口は
// 続き77でオプションエリアのアイコンだけで足りるようになった（ユーザー確認済み）ため、
// 大アバターはエモート専用に転用する。
//
// 質問への回答で固まった仕様:
// ・候補は色分類も含めたやや多め（8〜12個）。この7色ゲームのカラーパレット
//   （--color-red等、board-layout.jsのCOLORSと同じ7色）を各ボタンの縁取りに使い、
//   ぱっと見で区別しやすくする（意味上の色分類ではなく見た目の分類）。
// ・吹き出しは対局中の他プレイヤー全員の画面（オンライン含む）に表示する。
//
// 表示先は「送信者本人の.player-avatar（盤面周囲、data-player属性で特定）」——
// 各クライアントは4座席分の.player-avatarを描画しているため、これは自分の画面にも
// 他プレイヤーの画面にも同じセレクタで存在する（main.jsのbuildPlayerZone参照）。
// オンライン中の配信はhand_effect_use等と同じ「見た目だけの合図」パターン
// （broadcastEmote/onEmoteEvents、online.js）。

import { getSelfSeat, isOnlineMode, broadcastEmote, onEmoteEvents, isSpectatingGame } from "./online.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ10
import { stageClientToLocal, stageDelta } from "./main.js";

const COLOR_CYCLE = ["red", "blue", "yellow", "pink", "green", "purple", "orange"];
// UI英語化フェーズ10: 文言そのものではなくキーで持つ。相手へは「キー＋自分の言語での文字列」を
// 両方送り、受け取った側はキーがあれば自分の言語で表示する（お互い自分の言語で読める）。
// キーが無い古いクライアントからの受信は text をそのまま出す（後方互換）。
const EMOTE_KEYS = [
  "emote.hello",
  "emote.sorry",
  "emote.nice",
  "emote.thanks",
  "emote.dontmind",
  "emote.agree",
  "emote.wait",
  "emote.goodluck",
  "emote.hmm",
  "emote.good",
  "emote.notlosing",
  "emote.gg",
];
const EMOTES = EMOTE_KEYS.map((key, i) => ({ key, color: COLOR_CYCLE[i % COLOR_CYCLE.length] }));

// ユーザー要望2026-08-17「相手のアバターをクリックすると『このプレイヤーのエモートを非表示』
// 的なボタンが出るようにしたい」。座席ごとに“このプレイヤーのエモートを見ない”を保持する
// （この端末のセッション限りのローカル状態。うるさい相手を個別にミュートできる）。
const mutedEmotePlayers = new Set();
export function isEmotePlayerMuted(player) {
  return mutedEmotePlayers.has(player);
}

let pickerEl = null;
let backdropEl = null;
let muteMenuEl = null;
let muteMenuBackdropEl = null;
// 自分の盤面アバター（.player-avatar[data-player=自分の座席]）は、admin.jsの
// isSelfBoardAvatarVisible()がデフォルトoff（「自分の分だけステータスエリアの
// 大アバターと重複して冗長」との既存判断）のため存在しないことが多い。その場合でも
// 送信者自身が反応を確認できるよう、openEmotePicker()に渡された大アバター要素を
// 覚えておき、ローカル送信時のフォールバック表示先にする。
let selfAvatarFallbackEl = null;

function closeEmotePicker() {
  pickerEl?.remove();
  pickerEl = null;
  backdropEl?.remove();
  backdropEl = null;
}

// anchorEl（大アバター要素）の右隣に開く、軽量なポップアップ。他のモーダルのような
// 暗転バックドロップではなく、外側クリックで閉じるだけの透明な当たり判定にする
// （エモートはテンポよく連投したい操作のため、画面を暗くして重さを出したくない）。
export function openEmotePicker(anchorEl) {
  selfAvatarFallbackEl = anchorEl ?? null;
  if (pickerEl) {
    closeEmotePicker();
    return;
  }
  backdropEl = document.createElement("div");
  backdropEl.id = "emote-picker-backdrop";
  backdropEl.addEventListener("click", closeEmotePicker);
  document.body.appendChild(backdropEl);

  pickerEl = document.createElement("div");
  pickerEl.id = "emote-picker";

  const title = document.createElement("div");
  title.id = "emote-picker-title";
  title.textContent = t("emote.pickerTitle");
  pickerEl.appendChild(title);

  const grid = document.createElement("div");
  grid.id = "emote-picker-grid";
  for (const emote of EMOTES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emote-picker-btn";
    btn.style.setProperty("--emote-color", `var(--color-${emote.color})`);
    btn.textContent = t(emote.key);
    btn.addEventListener("click", () => {
      sendEmote(emote.key);
      closeEmotePicker();
    });
    grid.appendChild(btn);
  }
  pickerEl.appendChild(grid);

  document.body.appendChild(pickerEl);

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const pickerRect = pickerEl.getBoundingClientRect();
    // 【座標総点検2026-09-01】はみ出し判定は実画面座標のまま行い、**最後に**ステージの
    // ローカル座標へ直してから left/top に入れる（body のステージ変形の中にあるため、
    // 実画面座標を直に入れるとスマホで位置がズレる）。
    let left = rect.right + 12;
    if (left + pickerRect.width > window.innerWidth - 8) left = window.innerWidth - pickerRect.width - 8;
    pickerEl.style.left = `${stageClientToLocal(left, 0).x}px`;
    pickerEl.style.bottom = `${Math.max(8, window.innerHeight - rect.bottom)}px`;
  }
}

function sendEmote(emoteKey) {
  const text = t(emoteKey);
  // 🔴【#653・続き740】ユーザー要望「**観戦中に観戦者としてエモートできるといい。
  //   観客席とか左上にあるといいかな？**」。
  //   ⚠ 観戦者には席が無い（getSelfSeat() は**見ている席**を返す＝続き712 の #652/#655 と
  //     同じ罠）。席の吹き出しに混ぜると「その人が言った」ことになってしまうので、
  //     **別の入れ物（観客席）**へ出す。
  //   ⚠ 名前は出さない（席が無い＝名乗る所が無い）。全部「観客」。
  if (isSpectatingGame()) {
    showSpectatorEmote(text, true);
    if (isOnlineMode()) broadcastEmote({ spectator: true, text, key: emoteKey });
    return;
  }
  const player = getSelfSeat();
  const shown = showEmoteBubble(player, text);
  // 自分の盤面アバターがデフォルト非表示（isSelfBoardAvatarVisible()）の場合、
  // 送信者自身には何も見えなくなってしまうため、大アバター（ステータスエリア）を
  // フォールバック表示先にする。
  if (!shown) attachBubble(selfAvatarFallbackEl, text);
  if (isOnlineMode()) broadcastEmote({ player, text, key: emoteKey });
}

// player本人の.player-avatar（盤面周囲、自分の画面にも相手の画面にも同じセレクタで
// 存在する）へ、吹き出しを一時的に追加する。ワンショット演出のため、他の同種演出
// （spawnArrivalBurst等）と同じ「使い捨てDOM要素、一定時間後にremove」パターン。
// 戻り値: 実際に表示できたか（対象アバターが存在したか）。
const EMOTE_BUBBLE_DURATION_MS = 3200;
function attachBubble(targetEl, text) {
  if (!targetEl) return false;
  const bubble = document.createElement("div");
  bubble.className = "emote-speech-bubble";
  bubble.textContent = text;
  targetEl.appendChild(bubble);
  setTimeout(() => bubble.remove(), EMOTE_BUBBLE_DURATION_MS);
  return true;
}
export function showEmoteBubble(player, text) {
  // ミュートしたプレイヤーのエモートは表示しない（ユーザー要望2026-08-17）。
  if (mutedEmotePlayers.has(player)) return false;
  return attachBubble(document.querySelector(`.player-avatar[data-player="${player}"]`), text);
}

// 相手のアバターをクリックした時に出す小さなメニュー（このプレイヤーのエモートを非表示/表示）。
// openEmotePicker と同じ「暗転しない・外側クリックで閉じるだけ」の軽量ポップアップ。
// getPlayerName は循環import（player-identity→online→emote は無いが念のため）を避けるため
// 呼び出し側(main.js)から表示名を渡してもらう。
export function openEmoteMuteMenu(anchorEl, player, playerName) {
  closeEmoteMuteMenu();
  muteMenuBackdropEl = document.createElement("div");
  muteMenuBackdropEl.id = "emote-mute-backdrop";
  muteMenuBackdropEl.addEventListener("pointerdown", closeEmoteMuteMenu);
  document.body.appendChild(muteMenuBackdropEl);

  muteMenuEl = document.createElement("div");
  muteMenuEl.id = "emote-mute-menu";
  const title = document.createElement("div");
  title.id = "emote-mute-menu-title";
  title.textContent = playerName ? t("emote.ofPlayer", { name: playerName }) : t("emote.ofThisPlayer");
  muteMenuEl.appendChild(title);

  const muted = mutedEmotePlayers.has(player);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "emote-mute-menu-btn";
  btn.textContent = muted ? t("emote.show") : t("emote.hide");
  btn.addEventListener("click", () => {
    if (mutedEmotePlayers.has(player)) mutedEmotePlayers.delete(player);
    else mutedEmotePlayers.add(player);
    closeEmoteMuteMenu();
  });
  muteMenuEl.appendChild(btn);
  document.body.appendChild(muteMenuEl);

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const menuRect = muteMenuEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - menuRect.width / 2;
    left = Math.max(8, Math.min(window.innerWidth - menuRect.width - 8, left));
    let top = rect.bottom + 8;
    if (top + menuRect.height > window.innerHeight - 8) top = Math.max(8, rect.top - menuRect.height - 8);
    muteMenuEl.style.left = `${stageClientToLocal(left, 0).x}px`;
    muteMenuEl.style.top = `${stageClientToLocal(0, top).y}px`;
  }
}
function closeEmoteMuteMenu() {
  muteMenuEl?.remove();
  muteMenuEl = null;
  muteMenuBackdropEl?.remove();
  muteMenuBackdropEl = null;
}

// 受信側（自分以外のクライアントから届いたエモート）。自分自身の発信はsendEmote内で
// 既にローカル表示済みのため、自分の座席からの合図は無視する（hand_effect_use受信側と
// 同じ判定パターン）。
onEmoteEvents(({ player, text, key, spectator }) => {
  // 🔴【#653】**観客の合図が先**。観戦中は getSelfSeat() が「見ている席」を返すので、
  //   下の席の判定に落とすと取りこぼす（続き712 の #652/#655 と同じ罠）。
  if (spectator) {
    showSpectatorEmote(key ? t(key) : text, false);
    return;
  }
  if (player === getSelfSeat()) return;
  // キーがあれば自分の言語で表示（無ければ送信者の文字列をそのまま＝古いクライアント対策）。
  showEmoteBubble(player, key ? t(key) : text);
});

// ── 観客席（#653）───────────────────────────────────────────────────────
// 画面の左上に、観客の声が数秒だけ積まれて消える。
// ⚠ **押せない**（pointer-events: none）。当たり判定は elementsFromPoint の自前判定なので、
//   透明でも拾われると盤面の操作を奪う（教訓4）。
// ⚠ うるさい時のために「観客の声を隠す」を用意する（端末に覚える）。
const SPECTATOR_EMOTE_MS = 3600;
const 観客ミュートKEY = "so7-mute-spectator-emotes";
let 観客ミュート = false;
try {
  観客ミュート = localStorage.getItem(観客ミュートKEY) === "1";
} catch (e) {
  /* 読めなくても既定（出す）で困らない */
}
export function isSpectatorEmoteMuted() {
  return 観客ミュート;
}
export function setSpectatorEmoteMuted(b) {
  観客ミュート = !!b;
  try {
    localStorage.setItem(観客ミュートKEY, 観客ミュート ? "1" : "0");
  } catch (e) {
    /* 覚えられなくても、そのセッションの間は効く */
  }
}

let 観客席El = null;
function 観客席() {
  if (観客席El?.isConnected) return 観客席El;
  観客席El = document.createElement("div");
  観客席El.id = "spectator-emote-gallery";
  // 🔴 うるさい時にその場で止められるように。**対局している人には観戦バナーが出ない**ので、
  //   止める口はここに置くしかない（設定の奥に入れても見つからない）。
  //   ⚠ 入れ物は pointer-events: none（教訓4）。このボタンだけ auto に戻す。
  const 消す = document.createElement("button");
  消す.type = "button";
  消す.className = "spectator-emote-mute";
  消す.textContent = "🔇";
  消す.title = t("game.spectate.muteOn");
  消す.addEventListener("click", () => {
    setSpectatorEmoteMuted(true);
    観客席El?.remove();
    観客席El = null;
  });
  観客席El.appendChild(消す);
  document.body.appendChild(観客席El);
  return 観客席El;
}
export function showSpectatorEmote(text, 自分) {
  // 自分が出した声は、隠していても自分には見せる（押した手応えが無くなるため）。
  if (観客ミュート && !自分) return;
  const 席 = 観客席();
  const line = document.createElement("div");
  line.className = "spectator-emote-line" + (自分 ? " is-self" : "");
  const who = document.createElement("span");
  who.className = "spectator-emote-who";
  who.textContent = 自分 ? t("emote.spectatorSelf") : t("emote.spectator");
  line.appendChild(who);
  const body = document.createElement("span");
  body.className = "spectator-emote-text";
  body.textContent = text;
  line.appendChild(body);
  席.appendChild(line);
  // 積みすぎない（古いものから消す）。
  // ⚠ 先頭は消音ボタンなので、消すのは2つ目以降（行だけ）。
  while (席.querySelectorAll(".spectator-emote-line").length > 4) 席.querySelector(".spectator-emote-line").remove();
  setTimeout(() => {
    line.remove();
    if (席.querySelectorAll(".spectator-emote-line").length === 0) {
      席.remove();
      if (観客席El === 席) 観客席El = null;
    }
  }, SPECTATOR_EMOTE_MS);
}
