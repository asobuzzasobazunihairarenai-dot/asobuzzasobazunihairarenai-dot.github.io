// 【2026-09-11・ユーザー要望】試遊の入口。アナログ版のクラウドファンディングのページから
// （戦績管理システム経由で）来た、まだ登録していない人のためのもの。
// URL に ?trial が付いている時だけ、タイトル画面でログインの代わりに
// 「遊び方を教わりながら遊ぶ／すぐにCPUと対戦する」を出す（opening-screen.js）。
// 初回のサウンド設定モーダルも出さない（main.js）——遊び始めるまでの手順を減らすため。
// 音量は既定のまま始まり、あとからオプションで変えられる。

// 【2026-10-16・ユーザー報告】「クラファンページの試遊版、入った後ホームに追加して開き直すと、
// タイトル画面が通常のになっちゃってる気がする」——**気のせいではなく、そのとおりだった。**
// ホーム画面から開く時のURLは `manifest.json` の `start_url`（`"./"`）で、**`?trial` が付かない**。
// つまり「ホーム画面に追加して、そこから開いてください」という**こちらが勧めている道**を通ると、
// 試遊の入口が消えて、ログインを求める通常のタイトルに変わってしまう。
// 🔴 **manifest の `start_url` に `?trial` を入れてはいけない**——あれは全員で共有の1枚なので、
// 試遊で来ていない人の追加まで試遊扱いになる。**この端末が試遊から入ったことを覚えておく**
// 形にする（URLが無くなっても分かるように）。
const TRIAL_MEMO_KEY = "so7-trial-entry";
// 覚えておく期間。ゲムマのような催しの前後をまたげればよく、何か月も試遊の入口を出し続ける
// 必要は無い（長く持ちすぎると、ふつうに遊び始めた端末にいつまでも試遊の画面が出る）。
const TRIAL_MEMO_MS = 30 * 24 * 60 * 60 * 1000;

function hasTrialParam() {
  try {
    return new URLSearchParams(window.location.search).has("trial");
  } catch {
    return false;
  }
}

// URLに `?trial` が在る間に、この端末へ控えておく（ホーム画面から開いた時のため）。
function rememberTrialEntry() {
  try {
    localStorage.setItem(TRIAL_MEMO_KEY, String(Date.now()));
  } catch {
    /* 保存できなくても、その場で遊ぶことには影響しない */
  }
}

function rememberedTrialEntry() {
  try {
    const at = Number(localStorage.getItem(TRIAL_MEMO_KEY));
    if (!Number.isFinite(at) || at <= 0) return false;
    if (Date.now() - at > TRIAL_MEMO_MS) {
      localStorage.removeItem(TRIAL_MEMO_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isTrialEntry() {
  if (hasTrialParam()) {
    rememberTrialEntry();
    return true;
  }
  return rememberedTrialEntry();
}

// 試遊の控えを消す（ログインへ進む時）。`clearTrialParam` と対で呼ぶ。
export function forgetTrialEntry() {
  try {
    localStorage.removeItem(TRIAL_MEMO_KEY);
  } catch {
    /* 消せなくても害は無い（期限で消える） */
  }
}

// 【2026-09-18・ユーザー要望（試遊の効果測定）】訪問記録に残す「どこから来たか」。
// ?trial だけなら "trial"、?trial=cf のように値が付いていれば "trial:cf"（宣伝の場所ごとに
// リンクを分けて数えられる）。値は英数字・-・_ の16文字までに切り詰める（記録を汚さないため）。
// 試遊の入口でなければ null。
// ⚠ こちらは **URLに `?trial` が在る時だけ** 返す（上の「端末の控え」は見ない）。
// 訪問記録の数字は「試遊のリンクから来た人」という意味で既にコンソールに出ているので、
// ホーム画面から開き直した2回目以降まで数え始めると**意味が変わってしまう**。
export function getTrialSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("trial")) return null;
    const tag = (params.get("trial") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);
    return tag ? `trial:${tag}` : "trial";
  } catch {
    return null;
  }
}

// ログインへ進む時に呼ぶ。Googleログインはページを離れて「今のURL」へ戻ってくるので、
// ?trial を残したままだと、ログインし終えた人にまた試遊の入口が出てしまう。
export function clearTrialParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("trial")) return;
    url.searchParams.delete("trial");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch {
    /* URLを書き換えられなくても、遊ぶこと自体には影響しない */
  }
}
