// src/style.css の機械的な検査。
//
// 【なぜ道具にしたか・続き619】これまで毎回**手で**走らせていた（「CSSブレース平衡」）。
// 人が覚えている限り動く検査は、忘れた回に静かに通ってしまう。GitHub Actions からも
// 同じものを走らせるため、`node tools/check-css.mjs` の形に出した。
//
// 見るもの:
//   ① { } の数が合っているか（置換スクリプトで塊を壊した時にいちばん先に出る症状）
//   ③ **プレイヤーが動かせる大きさの「既定値」が3か所で一致しているか**（続き640）
//      🔴 既定値は **style.css 末尾の :root ブロック**（実際の見た目を決める）・
//      **admin.js のつまみの default**（管理者モードの「戻す」が使う）・
//      **card-preview-size.js の定数**（オプションの行ごとの「戻す」が使う）の3か所にある。
//      ズレると「戻す」を押した時に既定と違う値へ戻る＝続き608（🔊の戻すが既定より大きい）・
//      続き627（勝利BGMの既定）で**実際に2回起きた**事故。人が3か所を見比べるのは無理なので
//      機械で照合する。
//   ② `max-height` に `vh` を使っていないか
//      🔴 **このアプリで `vh` は「画面の高さ」ではない。** 画面全体が 1600x900 の
//      ステージを縮めて描く作りなので、body の中では **1vh = 4.30 ステージpx**
//      （iPhone 横持ちの実測）＝ `100vh` がステージの高さ900のうち430しかカバーしない。
//      続き613 で `max-height: Nvh` を25か所すべて rem に直したので、**ここが0であることを
//      これからも保ちたい**。新しく書かれたらこの検査が落ちる。
//      ⚠ `width: min(Nrem, Mvw)` の形は**多くの場合 rem 側が勝つので実害が無い**（続き613 で
//      69件を「触らない」と判断した）。だから **vw は禁止していない**。`height: Nvh` も、
//      実寸を決めている所が残っているので今回は対象外（続き613 の申し送り）。
//
// 終了コード: 0=合格 / 1=問題あり / 2=検査そのものが失敗（探し方が空振り）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ⚠ **今いるフォルダ（cwd）に頼らない。** リポジトリのどこから走らせても、CI から走らせても
// 同じファイルを見るように、この検査ファイル自身の位置から辿る。
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "..", "src", "style.css");
const SHOW = "src/style.css"; // 人に見せる名前
let src;
try {
  src = fs.readFileSync(FILE, "utf8");
} catch (e) {
  console.error("❌ " + SHOW + " を読めない: " + e.message);
  process.exit(2);
}
if (src.length < 10000) {
  // 探し方が空振りして「0件＝合格」になるのを防ぐ（続き593 と同じ考え方）。
  console.error("❌ " + SHOW + " が短すぎる（" + src.length + "文字）。検査が当たっていない疑い。");
  process.exit(2);
}

// コメントを外してから数える（コメントの中の { } を数えないため）
const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
const open = (noComments.match(/\{/g) || []).length;
const close = (noComments.match(/\}/g) || []).length;

const problems = [];
if (open !== close) problems.push("{ が " + open + " 個・} が " + close + " 個で合っていない");

// max-height に vh（コメントは外した状態で探す）
// ⚠ **`\bvh\b` と書いてはいけない（続き619 で実際に空振りした）。** `90vh` の「0」と「v」は
// どちらも単語文字なので、その間に単語境界が無く、一致しない＝**落ちるべき時に落ちない検査**に
// なる。わざと `max-height: 90vh` を混ぜる A/B をやって初めて気づいた。
// 「数字のすぐ後ろの vh」を探す形にする。`calc(100vh - 2rem)` のような書き方も拾える。
const vhLines = [];
noComments.split(/\r?\n/).forEach((line, i) => {
  if (/max-height\s*:[^;]*[0-9.]vh\b/.test(line)) vhLines.push(i + 1 + ": " + line.trim());
});
if (vhLines.length) {
  problems.push(
    "max-height に vh を使っている " + vhLines.length + " 件（ステージ基準の rem で書く。"
      + "56.25rem がステージの高さ＝100vh 相当）:\n    " + vhLines.join("\n    ")
  );
}

// ③ 既定値が3か所で一致しているか（上の説明参照）
const DEFAULT_TRIPLES = [
  { cssVar: "--card-preview-size", jsConst: "DEFAULT_CARD_PREVIEW_SIZE" },
  { cssVar: "--card-arrival-modal-size", jsConst: "DEFAULT_CARD_ARRIVAL_SIZE" },
];
const CPS_FILE = path.join(HERE, "..", "src", "card-preview-size.js");
const ADMIN_FILE = path.join(HERE, "..", "src", "admin.js");
let cpsSrc;
let adminSrc;
try {
  cpsSrc = fs.readFileSync(CPS_FILE, "utf8");
  adminSrc = fs.readFileSync(ADMIN_FILE, "utf8");
} catch (e) {
  console.error("❌ 既定値の照合に必要なファイルを読めない: " + e.message);
  process.exit(2);
}
for (const { cssVar, jsConst } of DEFAULT_TRIPLES) {
  // CSS: **最後の**宣言を採る。同じ詳細度の :root 宣言は後に書かれた方が勝つので、
  // ファイル末尾のまとめブロックが実際の既定値（style.css のそのブロックのコメント参照）。
  const cssMatches = [...noComments.matchAll(new RegExp(cssVar + "\\s*:\\s*([0-9.]+)rem", "g"))];
  const jsMatch = new RegExp("export const " + jsConst + "\\s*=\\s*([0-9.]+)\\s*;").exec(cpsSrc);
  const adminMatch = new RegExp('key:\\s*"' + cssVar + '"[^}]*?default:\\s*([0-9.]+)').exec(adminSrc);
  if (!cssMatches.length || !jsMatch || !adminMatch) {
    // 探し方が空振りしている＝「一致していた」ではない。黙って合格にしない。
    console.error(
      "❌ " + cssVar + " の既定値を見つけられなかった（css=" + cssMatches.length
        + " js=" + Boolean(jsMatch) + " admin=" + Boolean(adminMatch) + "）。検査が当たっていない疑い。"
    );
    process.exit(2);
  }
  const cssVal = parseFloat(cssMatches[cssMatches.length - 1][1]);
  const jsVal = parseFloat(jsMatch[1]);
  const adminVal = parseFloat(adminMatch[1]);
  if (!(cssVal === jsVal && jsVal === adminVal)) {
    problems.push(
      cssVar + " の既定値が3か所で食い違っている: style.css(末尾の:root)=" + cssVal
        + " / src/admin.js(つまみのdefault)=" + adminVal
        + " / src/card-preview-size.js(" + jsConst + ")=" + jsVal
    );
  }
}

if (problems.length) {
  console.error("❌ " + SHOW + " に問題 " + problems.length + " 件");
  for (const p of problems) console.error("  ・" + p);
  process.exit(1);
}
console.log(
  "✅ 問題なし（" + SHOW + " / ブレース " + open + "対" + close + "・max-height の vh 0件・"
    + "既定値の3か所照合 " + DEFAULT_TRIPLES.length + "件）"
);
