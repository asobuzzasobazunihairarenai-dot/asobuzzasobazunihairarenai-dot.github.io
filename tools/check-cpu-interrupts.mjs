// 「いつでも使える／割り込み」の札を、CPU が**一度も使わないまま**にしていないか見る検査。
//
//   node tools/check-cpu-interrupts.mjs
//
// 【なぜ要るか】この事故は**3回起きている**:
//   ・#620 報告「CPUが私の最後のロックの時にやり直しの鍵を使ってこなかった」
//   ・#624 報告「最後ロックする時、CPUが賄賂を使ってこなかった」
//   ・続き782 で、リトルマウス・ロックチェンジも同じく一度も使われていなかったと判明
// どれも原因は同じ——`cpu-brain.js` の `handEffectValueFor` に登録が無く、
// **`default: return 0` に静かに落ちていた**。落ちても誰も何も言わない。
// 札を1枚足すたびに人が気をつける、では**また起きる**ので、機械で見張る。
//
// 【見かた】効果データに「窓」を持つ選択肢（usableAnytime / requiresOpponentLockDeclaration /
//   requiresOpponentSameColorHandEffect / requiresArrivalEffectWindow）がある札は、
//   cpu-brain.js のどこかに **その id が書かれていること**を求める。
//   ⚠ 「値が正しいか」までは見ない（それは遊んで決めること）。見るのは
//     **一度も検討されない状態になっていないか**だけ。
// 🔴 **探し方が空振りすると「0件＝合格」になる**ので、まず「それらしい数が取れたか」を確かめる。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { CARD_EFFECTS } = await import(path.join(ROOT, "src/card-effects.js").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "file:///$1:"));
const brain = fs.readFileSync(path.join(ROOT, "src/cpu-brain.js"), "utf8");

// 🔴 **ファイル全体ではなく「値を決める関数の中」を見る。**
//   最初はファイル全体で id を探していたが、**優先順の表（OPTION_RANK）に名前が在るだけで
//   合格**してしまった（A/B で発覚）。値の登録が無ければ CPU は**そのカードを選ばない**ので、
//   優先順だけ在っても一度も使われない。
const 値の関数 = (() => {
  const i = brain.indexOf("function handEffectValueFor");
  if (i < 0) return null;
  const j = brain.indexOf("\nexport function chooseHandEffectCard", i);
  return j < 0 ? null : brain.slice(i, j);
})();
if (!値の関数 || 値の関数.length < 2000) {
  console.error("❌ 検査そのものが怪しい: cpu-brain.js の handEffectValueFor が読めなかった");
  process.exit(2);
}

// 🔴 意図的に CPU が使わない札。**理由を必ず書く**（書けないなら、それは漏れ）。
const 除外 = new Map([
  [
    "ex0-yellow-reach-cancel",
    "リーチキャンセルは到達効果の窓（requiresArrivalEffectWindow）で、isHandEffectOptionUsable が常に false を返す作り（実行は main.js の専用の窓）。CPU の割り込みは別の道が要る＝続き782 の申し送り。",
  ],
]);

const 窓の札 = [];
for (const [id, d] of Object.entries(CARD_EFFECTS)) {
  const opts = d.handEffectOptions || (d.handEffect ? [d.handEffect] : []);
  const 窓 = opts.some(
    (o) =>
      o &&
      (o.usableAnytime ||
        o.requiresOpponentLockDeclaration ||
        o.requiresOpponentSameColorHandEffect ||
        o.requiresArrivalEffectWindow)
  );
  if (窓) 窓の札.push(id);
}

if (窓の札.length < 5) {
  console.error(`❌ 検査そのものが怪しい: 「窓」を持つ札が ${窓の札.length} 件しか取れなかった（探し方が合っていない可能性）`);
  process.exit(2);
}

const 問題 = [];
for (const id of 窓の札) {
  if (除外.has(id)) continue;
  if (!値の関数.includes('"' + id + '"')) {
    問題.push(
      `CPU が一度も使わない割り込みの札: ${id} → src/cpu-brain.js の handEffectValueFor に case を足す` +
        "（意図的に使わせないなら、この検査の 除外 に**理由つきで**足す）"
    );
  }
}
// 除外の側も見る（直したのに除外に残っていたら、それはもう嘘）。
for (const [id, 理由] of 除外) {
  if (!窓の札.includes(id)) 問題.push(`除外に書いてあるが、もう「窓」を持っていない: ${id}（除外から外す）`);
  else if (値の関数.includes('"' + id + '"')) 問題.push(`除外に書いてあるのに CPU が見ている: ${id}（除外から外す）`);
  if (!理由 || 理由.length < 20) 問題.push(`除外の理由が書かれていない: ${id}`);
}

// 選択肢が2つ以上ある札は、CPU の優先順（OPTION_RANK）が無いと**ランダム**に落ちる。
// 🔴 割り込みの札でそれが起きると「せっかく割り込んだのに小さい方を選ぶ」になる。
for (const id of 窓の札) {
  if (除外.has(id)) continue;
  const opts = CARD_EFFECTS[id]?.handEffectOptions;
  if (!opts || opts.length < 2) continue;
  // OPTION_RANK の中にその id の行が在るか（"<id>": { … } の形）
  const i = brain.indexOf("const OPTION_RANK");
  const 表 = i >= 0 ? brain.slice(i, brain.indexOf("\n};", i)) : "";
  if (!表.includes('"' + id + '"')) {
    問題.push(`選択肢が ${opts.length} つあるのに CPU の優先順が無い（ランダムに落ちる）: ${id} → OPTION_RANK`);
  }
}

if (問題.length === 0) {
  console.log(
    `✅ 問題なし（「いつでも／割り込み」の札 ${窓の札.length} 件のうち、CPU が見ているのは ${窓の札.length - 除外.size} 件・` +
      `意図的な除外 ${除外.size} 件）`
  );
  process.exit(0);
}
console.log(`❌ ${問題.length} 件`);
for (const p of 問題) console.log("  - " + p);
process.exit(1);
