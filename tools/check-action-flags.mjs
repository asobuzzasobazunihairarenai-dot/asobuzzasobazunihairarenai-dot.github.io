// 【続き804】**効果データに書いた印を、エンジンが読んでいるか**を見る検査。
//
//   node tools/check-action-flags.mjs
//
// 🔴 なぜ要るか（同じ形で2回踏んでいる）:
//   ・#577（2026-11-13）: 「移動先のカードはオープンしない」を持つ札は4枚あったのに、
//     貧民の行進だけ直して**残り3枚を見落としていた**。
//   ・#763 / #767（続き800 → 続き804）: `FORCED_MOVE_TO_PREVIOUS_CELL` に `noArrival: true` を
//     書いたのに、**エンジンがその印を1行も読んでいなかった**。しかも続き800 の記録・お知らせ・
//     対処済みの名簿には「直した」と書いてあり、**テストも通っていた**（土台では札がめくれない
//     ので、見ていた期待値が直す前でも真だった）。
//   ⇒ この検査を入れた初回に、**本物の取りこぼしをもう1件見つけた**（旧0th いろ落ちガエル●の
//     `drawCount: 0`。あの動詞が読むのは `count` なので、お知らせが
//     「undefined 枚ドローしました」になっていた）。
//
// しくみ: card-effects.js で**動詞に渡している印の名前**を集めて、card-effect-engine.js の
//   その動詞の `case` がその名前を読んでいるかを見る。読んでいなければ
//   「静かに何も起きない」＝プレイヤーには「効果が違う」としか見えない。
//
// ⚠ **当てにならない時は黙らずに落ちる**（数え方が壊れていたら名前を挙げて exit 2）。
// ⚠ 文字列とコメントは js-strip.mjs で落とす（位置と行数は変えない）。そのため
//   `amountOf(action, ctx, helpers, "maxCount")` のような**文字列ごしの参照は見えない**
//   ——下の名簿にそう書いて外してある。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripJs } from "./js-strip.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 読む = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// 動詞の case に出てこなくてよい印（**行動を回す共通の所**が読む）。
const 共通の印 = new Set([
  "verb", "actions", "id", "labelKey", "label", "cost", "usageLimit", "condition",
  "stopIfPreviousFailed", "onlyIfPreviousFailed", "stopIfAnyPreviousFailed",
  "arrivalOnly", "optional", "self", "forPlayer", "hintKey", "note", "requires", "skipIfNoTarget",
]);

// 🔴 動詞ごとに外す印。**理由を必ず書く**（書けないものは外さない＝それは不具合）。
//   形: "VERB.印": "理由"
const 外す = {
  // ① amountOf(action, ctx, helpers, key) の**動的参照**（action[key]）。文字列が消えるので見えない。
  "DRAW.count": "amountOf(action, …) が action[key] で読む（動的参照）",
  "PICKUP_TO_HAND.count": "同上",
  "PLACE_DECK_CARDS_IN_CHOSEN_CELLS.count": "同上",
  "FLIP_UP_TO_N_WITHIN_RANGE.maxCount": 'amountOf(action, ctx, helpers, "maxCount") ＝文字列ごしの参照',

  // ② 読むのが card-effects.js の**文の生成**（describeAction）側。挙動には関わらない。
  "MOVE_TO_CELL_WITH_NAMED_FACEUP_CARD.targetName": "文の生成だけが読む（「『バスストップ』のあるマスに移動する。」）",
  "PICKUP_NAMED_CARD_AT_OWN_CELL.targetName": "同上",
  "LOCK_ONE_HAND_CARD_EXCEPT_FINAL.lockArea": "文の生成だけが読む（印字「あなたのロックエリアに」）",
  // 🔴【続き876・分類の訂正】これは**効いていない印ではない**。続き804 で「効いていない」と
  //   書いたのは私の数え間違いで、`card-effects.js` の文の生成が `renderWealthCondition(action.wealth)`
  //   として**読んでいる**（財閥の威光は【財力＝S】が**2文目の頭**に付くので、効果全体ではなく
  //   行動に付けるのが正しい——カードのコメントにもそう書いてある）。
  "FLIP_UP_TO_N_WITHIN_RANGE.wealth": "文の生成が読む（renderWealthCondition(action.wealth)＝【財力＝S】を句の頭に出す）",

  // ③ 🔴 **効いていない印**（いまは無害だが、データを変えても挙動は変わらない）。
  //   ⚠ 直す時は「挙動をデータから決める」か「印を消す」かのどちらか。**放っておくと、
  //     次に誰かがここを書き換えて『変えたのに効かない』で時間を使う。**
  //   ⓘ【続き876】ここに在った3件は片付けた:
  //     ・`ANNOUNCE_MOVEMENT_BOOST_THIS_TURN.plain` … **印を消した**（既定が plain）
  //     ・`PLACE_DECK_CARDS_IN_CHOSEN_CELLS.requireNoCard` … **印を消した**（候補は常にカードの無いマス）
  //     ・`REGISTER_PEACE_WISH.count` … **挙動をデータから決めるようにした**（main.js の 2 の直書きをやめた）
  //   ⇒ **いまここは空**。新しく足す時は、理由を必ず書くこと。
};

const データ = stripJs(読む("src/card-effects.js"));
const エンジン = stripJs(読む("src/card-effect-engine.js"));

// ── ① データ側: { verb: VERBS.X, 印: … } の印を集める ─────────────────────
const 使われ方 = new Map(); // 動詞 → Set(印)
const re = /verb:\s*VERBS\.([A-Z0-9_]+)/g;
let m;
while ((m = re.exec(データ))) {
  const 動詞 = m[1];
  let i = m.index;
  while (i > 0 && データ[i] !== "{") i--; // その行動の「{」まで戻る
  let 深さ = 0, j = i;
  for (; j < データ.length; j++) {
    if (データ[j] === "{") 深さ++;
    else if (データ[j] === "}") { 深さ--; if (深さ === 0) break; }
  }
  // 1段深い所（入れ子の { } / [ ]）は落とす——あちらは別の行動や条件の印
  const 浅い = データ.slice(i + 1, j).replace(/\{[^{}]*\}/g, "").replace(/\[[^[\]]*\]/g, "");
  if (!使われ方.has(動詞)) 使われ方.set(動詞, new Set());
  for (const k of 浅い.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*:/g)) {
    if (!共通の印.has(k[1])) 使われ方.get(動詞).add(k[1]);
  }
}

// ── ② エンジン側: case VERBS.X: … の塊を切り出す ─────────────────────────
//   ⚠ 同じ動詞の case が2か所（実装と文の生成）に在ることがあるので**全部つなげる**。
const 塊 = new Map();
const 場所 = [];
const caseRe = /case\s+VERBS\.([A-Z0-9_]+)\s*:/g;
let c;
while ((c = caseRe.exec(エンジン))) 場所.push({ 動詞: c[1], at: c.index });
for (let k = 0; k < 場所.length; k++) {
  const 終 = k + 1 < 場所.length ? 場所[k + 1].at : エンジン.length;
  const v = 場所[k].動詞;
  塊.set(v, (塊.get(v) || "") + "\n" + エンジン.slice(場所[k].at, 終));
}

// ── ③ 突き合わせ ───────────────────────────────────────────────────────
const 問題 = [], 使われていない名簿 = [];
let 見た = 0, 外した = 0;
for (const [動詞, 印たち] of [...使われ方].sort()) {
  const 本文 = 塊.get(動詞);
  if (!本文) continue; // 実装がまだ無い動詞は check-cards の仕事
  for (const 印 of [...印たち].sort()) {
    const 鍵 = 動詞 + "." + 印;
    if (鍵 in 外す) { 外した++; continue; }
    見た++;
    if (!本文.includes(印)) 問題.push(鍵 + " を、エンジンが読んでいない");
  }
}
// 名簿が古くなっていないか（直したのに外したままだと、次の取りこぼしを見逃す）
for (const 鍵 of Object.keys(外す)) {
  const [動詞, 印] = 鍵.split(".");
  if (!使われ方.get(動詞)?.has(印)) 使われていない名簿.push(鍵);
}

// ⚠ 歯止めの数は**実測から**決める（2026-11-23 で 81 個）。決め打ちで 100 と書いて落ちた。
if (見た < 60) {
  console.error("🔴 見た印が " + 見た + " 個しかない（数え方が壊れている）");
  process.exit(2);
}
if (使われていない名簿.length > 0) {
  console.error("🔴 名簿（外す）にもう使われていない印が " + 使われていない名簿.length + " 件");
  for (const s of 使われていない名簿) console.error("  ・" + s + " ← データから消えている。名簿からも消すこと");
  process.exit(2);
}
if (問題.length > 0) {
  console.error("❌ 効果データの印をエンジンが読んでいない " + 問題.length + " 件");
  for (const p of 問題) console.error("  ・" + p);
  console.error("  ⚠ 印は書いただけでは効かない。動詞の実装でその名前を読むこと（#763 / #767 の実害）。");
  console.error("  ⚠ 共通の所や文の生成が読んでいるなら、この道具の「外す」名簿に**理由つきで**足す。");
  process.exit(1);
}
console.log(
  "✅ 問題なし（動詞 " + [...使われ方].filter(([v]) => 塊.has(v)).length + " 種に渡している印 " +
  見た + " 個とも、エンジンが読んでいる／理由つきで外してある印 " + 外した + " 個）"
);
