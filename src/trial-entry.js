// 【2026-09-11・ユーザー要望】試遊の入口。アナログ版のクラウドファンディングのページから
// （戦績管理システム経由で）来た、まだ登録していない人のためのもの。
// URL に ?trial が付いている時だけ、タイトル画面でログインの代わりに
// 「遊び方を教わりながら遊ぶ／すぐにCPUと対戦する」を出す（opening-screen.js）。
// 初回のサウンド設定モーダルも出さない（main.js）——遊び始めるまでの手順を減らすため。
// 音量は既定のまま始まり、あとからオプションで変えられる。

export function isTrialEntry() {
  try {
    return new URLSearchParams(window.location.search).has("trial");
  } catch {
    return false;
  }
}

// 【2026-09-18・ユーザー要望（試遊の効果測定）】訪問記録に残す「どこから来たか」。
// ?trial だけなら "trial"、?trial=cf のように値が付いていれば "trial:cf"（宣伝の場所ごとに
// リンクを分けて数えられる）。値は英数字・-・_ の16文字までに切り詰める（記録を汚さないため）。
// 試遊の入口でなければ null。
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
