// お知らせ／更新情報の「NEW が付くか」だけを判断する、ごく小さなモジュール。
//
// 【なぜ分けたか・続き621】`changelog.js` は**592KB**あり（91回ぶんの本文＋開発メモ）、
// **起動時に毎回読み込まれて解析されていた**。実測で「オープニングが出るまで」の時間の
// **半分から4分の3が、コードの解析・実行**だった（通信を丸ごと取り除いても遅さが残る＝
// 続き620 の測定）。お知らせの本文は**ホーム画面でお知らせを開いた時だけ**あればよい。
//
// 🔴 **ところが NEW の印（`hasUnreadChangelog`）は起動時に要る。** そこで、印の判断に必要な
// **3つの数字だけ**をここに写し、本文の方は押された時に読み込む形にした。
//
// ⚠ **同じ事実を2か所に書くことになるので、機械で守る。**
// `node tools/check-changelog.mjs` が、ここの `CHANGELOG_SIGNATURE` が
// `changelog.js` の中身から計算した値と**一致しているか**を毎回確かめる
// （GitHub Actions でも push のたびに走る）。**ズレたら落ちて、正しい値を教えてくれる。**
//
// 署名の形（`changelog.js` の currentSignature と同じ）:
//   「一般に見せる回のうち先頭の日付」｜「その回の items + fixes の件数」｜「一般に見せる回の数」
// 一般に見せる回＝`items` か `fixes` が1件以上ある回（管理者だけの回は数えない。
// 管理者かどうかで署名を変えないのは、ログインの読み込みが終わるまで判定が false を返すため
// ——混ぜると起動直後だけ NEW が付いたり消えたりする＝続き484 の経緯）。
export const CHANGELOG_SIGNATURE = "2026-10-31|3|77";

const CHANGELOG_READ_KEY = "so7-changelog-read";

export function hasUnreadChangelog() {
  try {
    return localStorage.getItem(CHANGELOG_READ_KEY) !== CHANGELOG_SIGNATURE;
  } catch (e) {
    return false;
  }
}

export function markChangelogRead() {
  try {
    localStorage.setItem(CHANGELOG_READ_KEY, CHANGELOG_SIGNATURE);
  } catch (e) {
    /* localStorage不可でも致命的ではない */
  }
}
