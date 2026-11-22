// ハンドフェイズの「自動スキップ」が**判定できない札**を残していないか見る検査。
//
//   node tools/check-hand-skip.mjs
//
// 【なぜ要るか】#764 報告「使えるカードがないのにハンドフェイズが自動でスキップされない」。
//   自動スキップ（phase-automation.js の handHasNoUsableCards）は、手札の札を1枚ずつ
//   こう見ている:
//     ① 反応時専用（handEffectReactiveOnly）なら → ハンドフェイズでは使えない
//     ② 手札効果のデータ（handEffect / handEffectOptions）があるなら → canUseHandEffect で判定
//     🔴 ③ どちらでもないなら → **「使えるかもしれない」として残す**（＝スキップしない）
//   ③は「まだ実装していない効果を取りこぼして飛ばさない」ための**安全側の逃げ**なので
//   正しいが、**新しいセットを丸ごと足した直後は全部が③に落ちる**。
//   実際 #764 の時は旧0th EDITION の19種が**効果データ0件**で、旧0thで遊ぶ限り
//   ハンドフェイズが**一度も自動スキップされなかった**（続き788〜799 で19種とも実装して解消）。
//
// 【見かた】手札に入り得る札（通常・エターナル・ファースト）は、
//   **①か②のどちらかに当てはまること**。どちらでもない札を名指しで落とす。
//   ⚠ 「効果が正しいか」までは見ない（それはテストの仕事）。見るのは
//     **自動スキップが判定できる形になっているか**だけ。
// 🔴 **探し方が空振りすると「0件＝合格」になる**ので、まず「それらしい数が取れたか」を確かめる。
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 読む = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

const { CARD_EFFECTS } = await 読む("src/card-effects.js");
const cd = await 読む("src/cards-data.js");
const ex0 = await 読む("src/cards-data-ex0.js");
const ed1 = await 読む("src/cards-data-1st.js");
const o0 = await 読む("src/cards-data-0th.js");
const cf = await 読む("src/cards-data-cf.js");

// ⚠ 手札に入り得る札だけを見る。
//   ・ブーストの白紙カード（BOOST_BLANK_FIRST_CARDS）は**絵も効果も持たない仮の札**なので
//     対象外（check-cards.mjs も同じ理由で外している）。
//   ・黒のキューブ ノワール（first-noir）は見た目違いのファーストカードで、
//     効果はリメイクのファーストと同じ扱い＝ここでは見ない。
const 組 = [
  ["リメイク 通常", cd.NORMAL_CARDS],
  ["リメイク エターナル", cd.ETERNAL_CARDS],
  ["リメイク ファースト", cd.FIRST_CARDS],
  ["0th拡張", ex0.EX0_NORMAL_CARDS],
  ["1st 通常", ed1.FIRST_ED_NORMAL_CARDS],
  ["1st エターナル", ed1.FIRST_ED_ETERNAL_CARDS],
  ["1st ファースト", ed1.FIRST_ED_FIRST_CARDS],
  ["旧0th", o0.OLD0TH_NORMAL_CARDS],
  ["志炎者", cf.CF_NORMAL_CARDS],
];

const 総数 = 組.reduce((n, [, l]) => n + (l?.length || 0), 0);
if (総数 < 100) {
  console.error("❌ 検査そのものが怪しい: 見たカードが " + 総数 + " 枚しかない（カードの表が読めていない）");
  process.exit(2);
}

// card-effect-engine.js の getHandEffectOptions / isHandEffectReactiveOnly と**同じ読み方**。
// ⚠ engine そのものは localStorage を触るので node から import できない。読み方を写すしかないが、
//   写し間違えると嘘の合格になるので、下で「反応時専用の札が4枚以上ある」ことも確かめる。
function 手札効果データあり(id) {
  const def = CARD_EFFECTS[id];
  if (!def) return false;
  if (def.handEffectOptions) return def.handEffectOptions.length > 0;
  return !!def.handEffect;
}
function 反応時専用(id) {
  return !!CARD_EFFECTS[id]?.handEffectReactiveOnly;
}

const 反応時専用の数 = Object.values(CARD_EFFECTS).filter((d) => d?.handEffectReactiveOnly).length;
if (反応時専用の数 < 4) {
  console.error("❌ 検査そのものが怪しい: 反応時専用の札が " + 反応時専用の数 + " 件しか見つからない");
  process.exit(2);
}

const 困る = [];
for (const [名, list] of 組) {
  const 判定できない = (list || []).filter((c) => !反応時専用(c.id) && !手札効果データあり(c.id));
  const 専用 = (list || []).filter((c) => 反応時専用(c.id)).length;
  console.log(
    "  " + (判定できない.length ? "❌" : "✅") + " " + 名.padEnd(20) +
    String(list.length).padStart(3) + " 種（割り込み専用 " + 専用 + "）" +
    (判定できない.length ? "  判定できない " + 判定できない.length + " 件" : "")
  );
  for (const c of 判定できない) 困る.push({ 組: 名, id: c.id, name: c.name });
}

if (困る.length) {
  console.error("");
  console.error("❌ ハンドフェイズの自動スキップが**判定できない札**が " + 困る.length + " 件");
  console.error("   （手札がその札だけになっても、自動スキップされず手が止まる＝#764）");
  for (const x of 困る) console.error("   ・[" + x.組 + "] " + x.id + "  " + (x.name || ""));
  console.error("");
  console.error("   直し方はどちらか:");
  console.error("    ・手札効果を実装する（card-effects.js に handEffect / handEffectOptions）");
  console.error("    ・ハンドフェイズでは使えない札なら handEffectReactiveOnly: true を立てる");
  process.exit(1);
}
console.log("✅ 問題なし（" + 総数 + " 種とも、効果データか『割り込み専用』の印で判定できる）");
