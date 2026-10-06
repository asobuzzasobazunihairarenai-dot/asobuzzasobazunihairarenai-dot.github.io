// 対戦中の「戻る」操作で対局から抜けてしまうのを防ぐ（#377）。
//
// ★なぜ要るか（2026-10-06・crash-blackbox の記録で判明）
//   報告 #377「CPUとの4人対戦中に落ちてタイトルに戻ってしまった」は**落ちていなかった**。
//   ブラックボックスが残した起動時の記録が決定的で:
//       navType: "back_forward" ／ prevInGame: true ／ prevMode: "cpu"
//       prevLastError: null ／ secsSincePrev: 7
//   `back_forward` は**履歴を戻った**という意味。メモリ不足でタブが捨てられたのなら
//   `reload` になるし、未捕捉エラーも出ていない。つまり**「戻る」でアプリを抜けた**。
//   iPhone は画面の端のスワイプが「戻る」なので、横持ちで遊んでいれば十分起こり得る。
//   アプリ側には pushState も popstate の受けも無く、守りが1つも無かった。
//
// ★やり方
//   対局が始まった時に履歴へ目印を1つ積み、「戻る」が来たら積み直して**その場に留まる**。
//   黙って握り潰すと「戻るが壊れている」と思われるので、短い案内を出す。
//   対局が終わったら目印を外す（対局外の「戻る」は今までどおり効く）。
//
// 設計上の注意: アプリの他モジュールを一切 import しない（crash-blackbox.js と同じ方針。
// 循環 import を作らない）。window/history/document だけを使い、全て try/catch で囲む。

const MARK = "so7-back-guard";
let active = false;
let pushed = false;
let noticeEl = null;
let noticeTimer = null;
let noticeText = "対戦中です。やめる時はオプション（⚙）から。";

// 案内の文はアプリ側（ui-text.js）から渡してもらう。この葉モジュールは翻訳を持たない。
export function setBackGuardNotice(text) {
  if (typeof text === "string" && text) noticeText = text;
}

function showNotice() {
  try {
    if (!noticeEl) {
      noticeEl = document.createElement("div");
      noticeEl.id = "back-guard-notice";
      document.body.appendChild(noticeEl);
    }
    noticeEl.textContent = noticeText;
    noticeEl.classList.add("show");
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      noticeEl?.classList.remove("show");
      noticeTimer = null;
    }, 2600);
  } catch {
    /* 案内が出せなくても、戻るを止める方が大事 */
  }
}

function onPopState(e) {
  if (!active) return;
  // 自分が積んだ目印かどうかに関わらず、対局中は留まる。積み直してから案内を出す。
  try {
    history.pushState({ [MARK]: true }, "", location.href);
  } catch {
    /* ignore */
  }
  void e;
  showNotice();
}

// 対局の開始・終了に合わせて呼ぶ（main.js の subscribe から、状態が変わった時だけ）。
export function setBackGuardActive(on) {
  const next = !!on;
  if (next === active) return;
  active = next;
  try {
    if (active) {
      if (!pushed) {
        history.pushState({ [MARK]: true }, "", location.href);
        pushed = true;
      }
    } else if (pushed) {
      pushed = false;
      // 積んだ目印を自分で1つ戻しておく（対局外の「戻る」が1回ぶん効かなくなるのを防ぐ）。
      // この back は active=false の後なので onPopState は何もしない。
      history.back();
    }
  } catch {
    /* ignore */
  }
}

export function isBackGuardActive() {
  return active;
}

try {
  window.addEventListener("popstate", onPopState);
} catch {
  /* ignore */
}
