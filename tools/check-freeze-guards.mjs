// 🔴🔴 「対局が固まる」を二度と起こさないための歯止めが、外れていないか見る検査（26本目）。
//
// 【なぜ要るか】2026-11-22〜23 に**同じ固まり方の報告が7件**出た
//   （#775 #776 #786 #787 #788 #791 #792）。正体はどれも同じ:
//
//     選択モーダルの持ち主（`activeEffectPicker`）は**1つしかない**。
//     誰かが選んでいる最中に別の到達が始まり、その到達が自分の選択を登録すると、
//     **外側の登録が上書きで消える**。消された側は誰も答えないので永久に待ち、
//     `pointerdown` の先頭の `if (activeEffectPicker) return;` によって
//     **盤面も手札もタップが全部死ぬ**（DOM のボタンだけ効くので「全部は効かない
//     わけじゃない」と見える＝報告の言葉どおり）。
//
// 【入れた歯止め（これが外れたら、また7件出る）】
//   A 到達の門   … 誰かが選んでいる最中は、新しい到達を**その場で始めない**（あとで流す）
//   B 流す保険   … 溜めた到達は、始めてよくなったら必ず流す（見張りが5秒ごとに戻ってくる）
//   C 空の選択   … 候補が0個の選択は**開かない**（誰にも答えられないので、それ自体が固まりの素）
//
// 🔴 C は「新しいカードが増えても同じ罠を踏まない」ための汎用の歯止め。
//   カード側に「善処の原則」（候補が無いなら聞かない）を書くのが本筋だが、
//   **1枚でも書き忘れると対局が丸ごと止まる**ので、入口でも止めている。
import fs from "node:fs";

const 道 = "src/main.js";
const s = fs.readFileSync(道, "utf8").replace(/\r\n/g, "\n");
const 問題 = [];
const 見た = [];

function 要る(名, 条件, 説明) {
  見た.push(名);
  if (!条件) 問題.push(名 + " … " + 説明);
}

// ── A 到達の門 ─────────────────────────────────────────────────────
const 門 = /function 到達を今は始められない理由\(\)\s*\{([\s\S]*?)\n\}/.exec(s);
要る("到達の門がある", !!門, "`到達を今は始められない理由()` が main.js から消えている");
if (門) {
  const 中 = 門[1];
  要る("門が委任を見る", /getEffectDelegationTarget\(\)/.test(中), "委任中（CPUが代わりに選ぶ場面）を見ていない");
  要る("門が候補選択を見る", /activeEffectPicker/.test(中), "🔴 **これが本体**。誰かが選んでいる最中を見ていない");
  要る("門が手札効果を見る", /isHandEffectBusy\(\)/.test(中), "手札効果の最中を見ていない（#775 #792 がこれ）");
}

// 呼ぶ側2か所（片方だけだと、もう一方から同じ事故が起きる＝#477 の家族）
for (const [名, fn] of [
  ["露出した札の到達", "maybeTriggerCardArrivalForExposedCard"],
  ["駒の下に入った札の到達", "maybeTriggerCardArrivalForCard"],
]) {
  const m = new RegExp("function " + fn + "\\([\\s\\S]*?\\n\\}").exec(s);
  要る(名 + "が門を通る", !!m && /到達を今は始められない理由\(\)/.test(m[0]), fn + " が門を見ていない");
}

// ── B 流す保険 ─────────────────────────────────────────────────────
要る("流す前に確かめる", /function 溜めた到達を流せるなら流す\(/.test(s), "`溜めた到達を流せるなら流す` が無い");
要る(
  "到達が終わった時に流す",
  /arrivalEffectProcessingDepth === 0\)\s*\{[\s\S]{0,400}?溜めた到達を流せるなら流す\(/.test(s),
  "depth 0 の所で流していない"
);
要る(
  "見張りでも流す（取りこぼし防止）",
  /rescuePhaseIfNeverStarted\(\);[\s\S]{0,900}?溜めた到達を流せるなら流す\("watchdog"\)/.test(s),
  "🔴 5秒ごとの見張りから流していない。**溜めたまま消えるのが一番怖い**（手札効果の経路は到達処理を通らない）"
);

// ── C 空の選択は開かない ───────────────────────────────────────────
const 断 = /function 空の選択を断る\(種類, 件数\)\s*\{([\s\S]*?)\n\}/.exec(s);
要る("空の選択の歯止めがある", !!断, "`空の選択を断る` が無い");
if (断) {
  要る("1件以上なら今までどおり通す", /件数 > 0\)\s*return false/.test(断[1]), "0件以外も断ってしまう（#639『候補が1人でも必ず選ばせる』を壊す）");
  要る("断った時に記録を残す", /logAction\("diag-empty-pick"/.test(断[1]), "どのカードが書き忘れたのか分からなくなる");
}
for (const [名, fn] of [
  ["マス選択", "requestCellChoiceForEffect"],
  ["手札選択", "requestHandCardChoiceForEffect"],
  ["プレイヤー選択", "requestPlayerChoiceForEffect"],
]) {
  const m = new RegExp("function " + fn + "\\(([\\s\\S]*?)\\n\\}").exec(s);
  要る(名 + "が歯止めを通る", !!m && /空の選択を断る\(/.test(m[0]), fn + " が空の候補でも開いてしまう");
}

// ── D 取り残された候補選択の掃除役（続き806・809）───────────────────
要る("掃除役がある", /function runEffectPickerLeakWatchdog\(/.test(s), "取り残された候補選択を片付ける見張りが無い");
要る(
  "降りた理由を必ず書く",
  /書き残す\(picker, stuckMs, \{ \.\.\.旗, 理由: 押せる物\.理由/.test(s),
  "🔴 **黙って降りる門を作らない。** 続き806 でここだけ書かずにいて、6件の報告で1行も残らなかった"
);
// 🔴【#778・続き812】**id だけで探さない。** 選択モーダルは class で作られているものがあり
//   （`.hand-effect-option-picker`）、id だけ見ていた時は**画面に出ているのに見えず、
//   掃除役が人の選択を取り上げた**。この門は多めに見る方が安全（多すぎる＝掃除が遅れるだけ）。
要る(
  "返事待ちは class でも探す",
  /返事待ちの印[\s\S]{0,400}?class\*=/.test(s),
  "🔴 id だけで探すと、class で作られた選択モーダルが見えず**人の選択を取り上げる**（#778）"
);
要る(
  "『押せる』は押せる形だけ",
  /function 押せる形か\(el\)[\s\S]{0,600}?pointerEvents === "none"/.test(s),
  "大きさ0・pointer-events:none の残骸まで『人が選んでいる最中』と数えてしまう"
);

// ── D 自動で回す対局を、人の返事で止めない ──────────────────────────
// 🔴🔴 2026-11-28（続き883）の実害: ノワールのお試しを聞くモーダルを
//   `runCpuBattleSetup` に足したら、**スモークテスト（自己対戦）がそこで永久に止まった**
//   （CI の「カード効果のテストとスモーク」が緑にならず、押す人が居ないので一生待つ）。
//   ⇒ あの関数の中で**人の返事を待つ**所は、必ず `askDeck`（＝「人が始めた対局か」の印）で
//      囲み、自動で回す側は `askDeck: false` を渡す。
const cpu道 = "src/cpu-battle.js";
const c = fs.readFileSync(cpu道, "utf8").replace(/\r\n/g, "\n");
const 設定の中 = (() => {
  const i = c.indexOf("export async function runCpuBattleSetup");
  if (i < 0) return "";
  const j = c.indexOf("\nexport ", i + 10);
  return c.slice(i, j < 0 ? c.length : j);
})();
要る(
  "runCpuBattleSetup が在る",
  設定の中.length > 200,
  "🔴 関数が見つからない＝この節が何も見ていない（検査の数え方が壊れている）"
);
// 人の返事を待つ呼び出し（await showConfirmModal など）を数える。
const 返事待ち = [...設定の中.matchAll(/await\s+(show\w*(?:Confirm|Choice|Prompt)\w*Modal|askUser\w*)\s*\(/g)];
for (const m of 返事待ち) {
  // その行から前へ遡って、同じ if の中に askDeck が在るか見る（素朴だが、ここでは十分）。
  const 前 = 設定の中.slice(Math.max(0, m.index - 700), m.index);
  要る(
    "人の返事待ち（" + m[1] + "）が askDeck で囲まれている",
    /askDeck\s*&&|if\s*\(\s*askDeck\b/.test(前),
    "🔴 囲まないと、スモーク等の**自動で回す対局がここで永久に止まる**（続き883 の実害）"
  );
}
// 🔴🔴 **自動で回す所は「スモーク」だけではない**（続き885 の実害）。
//   続き884 でスモークだけ直したら、**同じ CI ジョブの中で先に走る**
//   `tools/check-cpu-value.mjs` が同じ形で止まっていて、CI は緑にならなかった（#477 の家族）。
//   ⇒ **ファイル名を名簿に書かず**、自動で回す置き場（test/ と tools/ と
//      src/smoke-test-runner.js）を**歩いて全部数える**。新しく足した道具も自動で入る。
const 自動の置き場 = [
  ...fs.readdirSync("test").filter((f) => f.endsWith(".mjs")).map((f) => "test/" + f),
  ...fs.readdirSync("tools").filter((f) => f.endsWith(".mjs")).map((f) => "tools/" + f),
  "src/smoke-test-runner.js",
];
let 自動の呼び出し = 0;
for (const 道 of 自動の置き場) {
  if (!fs.existsSync(道)) continue;
  if (道 === "tools/check-freeze-guards.mjs") continue; // この検査そのものの説明文
  const t = fs.readFileSync(道, "utf8").replace(/\r\n/g, "\n");
  for (const m of t.matchAll(/runCpuBattleSetup\(\{([^}]*)\}/g)) {
    自動の呼び出し++;
    要る(
      道 + " の呼び出しが askDeck: false を渡している",
      /askDeck\s*:\s*false/.test(m[1]),
      "🔴 自動で回す対局は**誰も押さない**ので、人の返事を待つ所が増えた日にここで永久に止まる（続き883・885）"
    );
  }
}
要る(
  "自動で回す呼び出しが見つかっている",
  自動の呼び出し > 0,
  "🔴 1件も見つからない＝上の行が『0しか出ない検査』になっている（数え方が壊れている）"
);

if (問題.length) {
  console.log("❌ 固まり防止の歯止めが外れている " + 問題.length + " 件");
  for (const p of 問題) console.log("  - " + p);
  console.log("");
  console.log("🔴 ここが外れると、カード1枚の書き忘れで**対局が丸ごと固まる**。");
  console.log("   経緯は CLAUDE.md の続き806 / 809 / 811 を読むこと。");
  process.exitCode = 1;
} else {
  console.log("✅ 問題なし（固まり防止の歯止め " + 見た.length + " 点すべて在る）");
}
