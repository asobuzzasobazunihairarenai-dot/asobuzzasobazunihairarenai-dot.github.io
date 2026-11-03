// 共有ステートの欄が、オンラインの再取得（hydrateState）で**落ちていないか**を見る。
//
// 【なぜ要るか・turnPhase の実害】
// `hydrateState(newState)` は **state を丸ごと置き換える**（src/state.js）。だから
// `src/online.js` が組み立てるオブジェクトに欄を1つ書き忘れると、サーバーから取り直すたびに
// **その欄が undefined で上書きされる**。
//
// この穴は src/online.js のコメントが**2回も警告している**:
//   ・pendingFinalLock …「ここのhydrateState()に渡すオブジェクトにこのフィールドが抜けて
//     いたため、fetchAndHydrate()が呼ばれるたびに undefined へ上書きされ、バナーが常に
//     非表示扱いになっていた」
//   ・pendingContact …「pendingFinalLockと全く同じ理由でここに含める必要がある」
//
// それでも **turnPhase（#167）が同じ穴に落ちていた**（2026-11-03 に発見）。
// 「渡し忘れ」は目で見つけるものではないので、機械で見る。
//
// 【見かた】
//   1. src/state.js の初期ステート（createInitialState 等の最初のオブジェクト）の欄を取る。
//   2. src/online.js の hydrateState({ … }) に渡している欄を取る。
//   3. 1 にあって 2 に無い欄を落とす（下の「渡さなくてよい欄」を除く）。
//
// ⚠ 取り出しに失敗したら**終了コード2**で止める（空振りを合格にしない）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const 読む = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// 🔴 「オンラインでは渡さなくてよい」と判断した欄は、**理由つきで**ここに書く。
//   理由を書けないものは、足し忘れの可能性が高い。
const 渡さなくてよい = {
  // ⓘ 2026-11-03（続き659）に turnPhase をここから外した（SQLの列・Edge Function の保存・
  //   online.js の受け取りを足して**本当に渡すようにした**ため）。いまは0件。
  //   足す時は必ず理由を書くこと——理由を書けないものは、足し忘れの可能性が高い。
};

// 開き括弧の位置から、対応する閉じ括弧までの**直下の階層だけ**の鍵を拾う。
//
// 🔴 1回目に書いた版は2つ間違えていた（記録）:
//   ① 鍵を拾った後に「その行の終わりまで」読み飛ばしたので、**同じ行にある `{` を数え損ね**、
//      入れ子（`piles: { deck: [], … }`）の中の鍵まで直下として拾っていた。
//   ② `tokens,` のような**省略形**（値を書かない書き方）を拾えていなかったので、
//      渡しているのに「渡していない」と誤報した。
//   ⇒ **行ごとに「その行が始まる時点の深さ」を見る**形に書き直した。深さ1で始まる行だけが直下。
function オブジェクトの欄(本文, 開き) {
  const 全体 = 本文.slice(開き);
  const 鍵 = [];
  let d = 0;
  let 行頭 = 0;
  let 終わった = false;
  for (const 行 of 全体.split("\n")) {
    if (終わった) break;
    const 始まりの深さ = d;
    // コメント・文字列を外してから括弧を数える（文字列の中の括弧に惑わされないため）。
    let 素 = 行.replace(/\/\/.*$/, "");
    素 = 素.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    for (const c of 素) {
      if (c === "{" || c === "[") d++;
      else if (c === "}" || c === "]") {
        d--;
        if (d === 0) {
          終わった = true;
          break;
        }
      }
    }
    if (始まりの深さ === 1) {
      const t = 行.replace(/\/\/.*$/, "").trim();
      // 「名前:」（ふつうの書き方）と「名前,」（省略形）の両方を拾う。
      const m = t.match(/^([A-Za-z_$][\w$]*)\s*[:,]/);
      if (m && !鍵.includes(m[1])) 鍵.push(m[1]);
    }
    行頭 += 行.length + 1;
  }
  if (!終わった) throw new Error("閉じ括弧が見つからない");
  return { 鍵 };
}

// ---- 1. 初期ステートの欄 ----
const st = 読む("src/state.js");
// 🔴 目印は `createInitialState` の中の `return {` にする。
//   1回目は `tokens: [],` を目印にしたら **RESET_GAME の中の別のオブジェクト**に当たっていた
//   （そちらも似た形なので、出てくる欄がそれらしく見えてしまい気づきにくかった）。
//   ⚠ 「それらしい結果が出た」は、正しい所を読んだ証拠にならない。
const 関数印 = st.indexOf("function createInitialState");
if (関数印 < 0) {
  console.error("🔴 src/state.js の createInitialState を見つけられない");
  process.exit(2);
}
const 初期印 = st.indexOf("\n  return {", 関数印);
if (初期印 < 0) {
  console.error("🔴 createInitialState の return { … } を見つけられない");
  process.exit(2);
}
const 初期開き = st.indexOf("{", 初期印);
let 初期の欄;
try {
  初期の欄 = オブジェクトの欄(st, 初期開き).鍵;
} catch (e) {
  console.error("🔴 初期ステートを読み取れなかった: " + e.message);
  process.exit(2);
}
if (初期の欄.length < 10) {
  console.error("🔴 初期ステートの欄が " + 初期の欄.length + " 件＝取り出しに失敗している");
  process.exit(2);
}

// ---- 2. hydrateState へ渡している欄 ----
const on = 読む("src/online.js");
const h印 = on.indexOf("hydrateState({");
if (h印 < 0) {
  console.error("🔴 src/online.js の hydrateState({ … }) を見つけられない");
  process.exit(2);
}
let 渡す欄;
try {
  渡す欄 = オブジェクトの欄(on, on.indexOf("{", h印)).鍵;
} catch (e) {
  console.error("🔴 hydrateState の引数を読み取れなかった: " + e.message);
  process.exit(2);
}
if (渡す欄.length < 10) {
  console.error("🔴 hydrateState へ渡す欄が " + 渡す欄.length + " 件＝取り出しに失敗している");
  process.exit(2);
}

// ---- 3. 照合 ----
const 無い = 初期の欄.filter((k) => !渡す欄.includes(k) && !(k in 渡さなくてよい));
const 余分 = 渡す欄.filter((k) => !初期の欄.includes(k));

console.log(
  "共有ステートの欄 " + 初期の欄.length + " / hydrateState へ渡している欄 " + 渡す欄.length
);

let 失敗 = 0;
for (const k of 無い) {
  console.error(
    "🔴 `" +
      k +
      "` が hydrateState({ … }) に無い（src/online.js）。オンラインでサーバーから取り直すたびに " +
      "**undefined で上書きされる**ので、その欄を読む機能は常に効かなくなる。" +
      "渡さなくてよい欄なら tools/check-hydrate-fields.mjs の「渡さなくてよい」へ理由つきで足すこと。"
  );
  失敗++;
}
for (const k of 余分) {
  console.error("🔴 `" + k + "` を hydrateState へ渡しているが、共有ステートの初期値に無い（名前の打ち間違い？）");
  失敗++;
}

if (失敗 > 0) {
  console.error("🔴 " + 失敗 + " 件");
  process.exit(1);
}
console.log("✅ 共有ステートの欄は、オンラインの再取得でも全部そろっている");
