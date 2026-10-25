// 公式のルール説明動画（YouTube）の在りか。ヘルプ（help.js）と試遊の入口（opening-screen.js）の
// 両方から開くので、**URLをここ1か所にだけ書く**（同じ判断を2か所に書かない＝続き549・552・557・
// 574 と同じ考え方。片方だけ差し替えて食い違う事故を作らないため）。
//
// 🔴 **このモジュールは他の src/*.js を一切 import しない。** opening-screen.js と help.js の
// 両方から読まれるので、何かを import すると循環 import になり得る（続き573 で実際に TDZ で
// 落ちている）。文言は呼ぶ側が ui-text から引く。
//
// 【URLの確認の経緯・続き615】ユーザー「80秒と12分のルール説明動画がもうYouTubeにアップして
// あります」→ URLは公式サイト asobuzz.net/howtoplay の「まずは動画で」から読み取った
// （「押すと再生されます」の遅延読み込みで iframe は空・a も無く、
// `<button class="ytlite" data-yt="...">` の属性に入っていた＝ブラウザでDOMを読んで初めて取れた）。
// そのうえで YouTube の oembed で**公開状態・題・投稿者**を確かめてある:
//   MKDBGe3pLaQ … 「7 SHADES OF S:EVEN ─ 80秒でわかるルール｜ボードゲーム完全リメイク版」
//   wPGUp6sHp2s … 「7 SHADES OF S:EVEN ─ 遊び方ガイド【完全版】｜ボードゲーム完全リメイク版」
//   （投稿者はどちらも「7 SHADES OF S:EVEN」）
// ⓘ 公式サイトは見出しで「1分18秒」・本文で「80秒」と食い違っている。動画の題が
// 「80秒でわかるルール」なので、アプリでは **80秒**と書く。
export const RULE_VIDEO_SHORT_ID = "MKDBGe3pLaQ"; // 80秒でわかるルール
export const RULE_VIDEO_FULL_ID = "wPGUp6sHp2s"; // 遊び方ガイド【完全版】（12分10秒）

export function ruleVideoUrl(id) {
  return "https://youtu.be/" + id;
}
