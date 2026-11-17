// カード効果エンジンが呼ぶ helpers.X が、呼び出し側（main.js）に本当に在るかを見る。
//
// 【なぜ要るか・#477 の実害】
// 赤のはじまり（0th拡張）の到達効果は、公開してから2日間ずっと**エラーで落ちていた**:
//
//   effect-verb: {"verb":"pickup_discard_top","result":"error",
//     "error":"TypeError: helpers.drawFromDiscard is not a function"}
//
// 原因は **helpers が2つある**こと。main.js は
//   ・手札効果用 …… await runHandEffect(ctx, { ...50個ほど })
//   ・到達効果用 …… await runArrivalEffect(ctx, { ...50個ほど })
// と**別々のオブジェクト**を渡しており、`drawFromDiscard` は手札側にしか無かった
// （先に実装した赤のキューブ フェニックスが手札効果だったため）。
// 赤のはじまりは**到達**でその動詞を使うので、到達側では undefined になる。
//
// 🔴 **なぜテストで気づけなかったか**: test/effect-runner.mjs のスタブは
// 手札・到達を区別せず**全部のヘルパーを持っている**。つまり**スタブが本物より豊か**で、
// テストは通るのに本番だけ落ちる。エンジンは例外を catch してログに流すだけなので、
// プレイヤーには「不発」と区別が付かない（#477 の報告は「なぜ不発になった？」だった）。
//
// 【見かた】
//   1. main.js の2つの helpers オブジェクトから鍵の集合を取る。
//   2. card-effect-engine.js の `switch (action.verb)` を case ごとに切り、
//      その case が使う helpers.X を集める。switch の外（共通処理）で使うものは
//      **両方**に要るものとして扱う。
//   3. card-effects.js の CARD_EFFECTS から、各動詞が「到達側から走り得るか」
//      「手札側から走り得るか」を調べる（INHERIT_ARRIVAL_ACTIONS / inheritsArrival で
//      到達の動詞が手札側からも走ることを勘定に入れる）。
//   4. 走り得る側に無いヘルパーを名指しで落とす。
//
// ⚠ 取り出しに失敗したら**終了コード2**で止める（空振りを合格にしない）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const 読む = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let 失敗 = 0;
const 落ちる = (msg) => {
  console.error("🔴 " + msg);
  失敗++;
};

// ---- 文字列・コメントを飛ばしながら対応する閉じ括弧を探す ----
function 閉じ括弧(s, open) {
  if (s[open] !== "{") throw new Error("開き括弧ではない: " + JSON.stringify(s.slice(open, open + 20)));
  let d = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === "/" && s[i + 1] === "/") {
      i = s.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && s[i + 1] === "*") {
      i = s.indexOf("*/", i + 2) + 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      for (; i < s.length; i++) {
        if (s[i] === "\\") {
          i++;
          continue;
        }
        if (s[i] === q) break;
      }
      continue;
    }
    if (c === "{") d++;
    else if (c === "}") {
      d--;
      if (d === 0) return i;
    }
  }
  throw new Error("閉じ括弧が見つからない");
}

// ---- 1. main.js の2つの helpers オブジェクト ----
const main = 読む("src/main.js");

function ヘルパーの鍵(呼び出し) {
  const i = main.indexOf(呼び出し);
  if (i < 0) throw new Error("呼び出しが見つからない: " + 呼び出し);
  // 第1引数の ctx オブジェクト → その次の '{' が helpers
  const ctx開き = main.indexOf("{", i);
  const ctx閉じ = 閉じ括弧(main, ctx開き);
  const 開き = main.indexOf("{", ctx閉じ);
  const 閉じ = 閉じ括弧(main, 開き);
  const 本体 = main.slice(開き, 閉じ + 1);
  return 鍵を拾う(本体);
}

// 🔴 到達側の helpers は**関数へ切り出してある**（続き668）。【状況】カードがターン開始時に
//   同じエンジンを走らせるので、2か所に同じ helpers を書かないため。呼び出しの形が
//   `runArrivalEffect(ctx, buildArrivalEffectHelpers(player))` になったので、
//   オブジェクトはその関数の中を読む。
function 関数の鍵(名前) {
  const 目印 = "function " + 名前 + "(";
  const i = main.indexOf(目印);
  if (i < 0) throw new Error("関数が見つからない: " + 名前);
  const r = main.indexOf("return {", i);
  if (r < 0) throw new Error("return { が見つからない: " + 名前);
  const 開き = main.indexOf("{", r);
  const 閉じ = 閉じ括弧(main, 開き);
  return 鍵を拾う(main.slice(開き, 閉じ + 1));
}

function 鍵を拾う(本体) {
  const ks = new Set();
  for (const 行 of 本体.split("\n")) {
    const t = 行.trim();
    let m = t.match(/^([A-Za-z_$][\w$]*)\s*:/);
    if (m) {
      ks.add(m[1]);
      continue;
    }
    m = t.match(/^([A-Za-z_$][\w$]*)\s*,/);
    if (m) ks.add(m[1]);
  }
  return ks;
}

let 手札の鍵, 到達の鍵;
try {
  手札の鍵 = ヘルパーの鍵("await runHandEffect(");
  到達の鍵 = 関数の鍵("buildArrivalEffectHelpers");
} catch (e) {
  console.error("🔴 main.js の helpers を取り出せなかった: " + e.message);
  process.exit(2);
}
if (手札の鍵.size < 30 || 到達の鍵.size < 30) {
  console.error("🔴 helpers の鍵が少なすぎる（手札 " + 手札の鍵.size + " / 到達 " + 到達の鍵.size + "）＝取り出しに失敗している");
  process.exit(2);
}

// ---- 2. エンジンの case ごとに helpers.X を集める ----
const eng = 読む("src/card-effect-engine.js");
const sw = eng.indexOf("switch (action.verb) {");
if (sw < 0) {
  console.error("🔴 card-effect-engine.js の switch (action.verb) が見つからない");
  process.exit(2);
}
const sw開き = eng.indexOf("{", sw);
const sw閉じ = 閉じ括弧(eng, sw開き);
const switch本体 = eng.slice(sw開き, sw閉じ + 1);
const switch外 = eng.slice(0, sw開き) + eng.slice(sw閉じ + 1);

// 🔴 **省略可の呼び方（`helpers.foo?.(…)`）は、無くても落ちない**ので数えない。
//    落ちるのは `helpers.foo(…)` と書いてある所だけ。エンジンは「在れば呼ぶ」ものと
//    「無いと成り立たない」ものを `?.` で書き分けてあるので、その書き分けをそのまま使う。
//
// 🔴 **ただし「落ちない」と「効いている」は別**（#478 の実害）。
//    リトルマウスの到達効果は `const tok = await helpers.pickRandomFromOpponentHand?.(target)`
//    と書いてあり、到達側の helpers にその口が無かった。`?.` なので例外は出ないが
//    **undefined が返って break → 1枚も奪えない**。プレイヤーには「不発」に見える。
//    ⇒ **戻り値を使っている省略可の呼び出しも落とす**。
//
// 🔴🔴【続き746・#704 の正体】**「戻り値を使っていない＝見せ方だけ」は間違いだった。**
//    この検査は元々「戻り値を捨てている省略可の呼び出し」を**まるごと見逃していた**（28件）。
//    理屈は「announce 等の見せ方だけなので無くても結果が変わらない」だったが、その中に
//
//        await helpers.maybeTriggerArrivalForPlacedCard?.({…}, revealedCardId);
//
//    が混ざっていた。これは見せ方ではなく**到達効果の連鎖をまるごと起こす口**で、
//    到達効果の表にだけ無かったので「CPUの笛で足元がオープンされたのに到達効果が
//    起きない」（#704。#508・#630 として2回再発）になっていた。
//
//    ⇒ 規則を**逆にした**: 戻り値を捨てていても**原則として要る**ものとして数え、
//      「本当に見せ方だけ（無くても盤面もルールも同じ）」だけを下の名簿へ**理由つきで**書く。
//      ⚠ 名簿へ足す時は「無くても盤面が変わらないか」を自分で確かめること。
//        迷ったら足さない（足さなければ検査が落ちるだけで、害は無い）。
const 見せ方だけ = new Set([
  // ── お知らせ・公開（出なくても盤面とルールは同じ）
  "announceCardAddedToHand", // 「誰が何を手札に入れたか」の中央モーダル
  "announceCardsDiscarded", // まとめて捨てた札の公開（#673）
  "announceColorsResolved", // 色宣言の結果の合図
  "announceEffectNotice", // 非ブロックの軽い通知
  "announceEffectReason", // 「○○によって」の説明
  "announceFizzle", // 「何も起きませんでした」
  "announceSteppedCard", // 踏んだ札を中央で見せる
  "announceUse", // 手札効果の使用宣言の演出
  "announceDrawTargets", // 誰がドロー対象かをアバターで
  "revealCardToAll", // 1枚を中央で全員に見せる
  "revealDiscardedCards", // 捨てた札を順番付きで見せる
  "showForcedDiscardReveal", // 捨てさせた札を中央で見せる
  "onCardAcquiredToHand", // 手に入れた札を光らせる＋お知らせ（中身は announce と render だけ）
  "playAdditionalColorUse", // 追色コストの「吸収→霧散」の演出
  // ── 画面の印（盤面の状態ではなく、光らせているだけ）
  "clearPlacementTargets",
  "markPlacedLocation",
  "markPlacementTarget",
  // ── 間・音・カメラ
  "delay",
  "holdCamera",
  "holdForReveal",
  "stopSuspenseSound",
  "startSuspenseSound",
  "celebrate",
]);
const ヘルパー名 = (s) => {
  const 要る = new Set();
  const 戻り値を使う = new Set();
  const 使い捨て = new Set();
  for (const m of s.matchAll(/helpers\??\.\s*([A-Za-z_$][\w$]*)\s*(\?\.)?/g)) {
    if (!m[2]) {
      要る.add(m[1]);
      continue;
    }
    // 直前の非空白（await は飛ばす）が `=` `(` `,` `!` `?` `&` `|` `n`(return) なら戻り値を使っている。
    let 前 = s.slice(Math.max(0, m.index - 40), m.index).replace(/\s+$/, "");
    if (前.endsWith("await")) 前 = 前.slice(0, -5).replace(/\s+$/, "");
    if (/[=(,!?&|]$/.test(前) || /\breturn$/.test(前)) 戻り値を使う.add(m[1]);
    else 使い捨て.add(m[1]);
  }
  // 1か所でも戻り値を使っていれば「要る」側に数える。
  for (const n of 戻り値を使う) 要る.add(n);
  // 🔴【続き746】戻り値を捨てていても、**見せ方だけの名簿に無いものは要る**（上の長い注を参照）。
  for (const n of 使い捨て) if (!見せ方だけ.has(n)) 要る.add(n);
  return { 要る, 使い捨て };
};

// case の切り出し: 「case VERBS.X:」の位置で区切る
const case印 = [...switch本体.matchAll(/case VERBS\.([A-Z0-9_]+)\s*:/g)];
if (case印.length < 50) {
  console.error("🔴 case が " + case印.length + " 件しか取れなかった＝取り出しに失敗している");
  process.exit(2);
}
const 動詞が使うヘルパー = new Map(); // 動詞名 → Set
for (let i = 0; i < case印.length; i++) {
  const 名 = case印[i][1];
  const 先 = case印[i].index;
  // 連続した case ラベル（fall-through）は、次の非 case までを共有する
  const 終 = i + 1 < case印.length ? case印[i + 1].index : switch本体.length;
  const 塊 = switch本体.slice(先, 終);
  動詞が使うヘルパー.set(名, ヘルパー名(塊).要る);
}
// switch の外の処理は、**どちら側の入口から走るか**で分ける。
// `runArrivalEffect` の中でしか呼ばれないもの（pickArrivalOption 等）を
// 手札側にも要求すると誤検知になる。
function 関数の本体(名) {
  const i = eng.indexOf(名);
  if (i < 0) throw new Error("関数が見つからない: " + 名);
  const 開き = eng.indexOf("{", eng.indexOf(")", i));
  const 閉じ = 閉じ括弧(eng, 開き);
  return { 本体: eng.slice(開き, 閉じ + 1), 開き, 閉じ };
}
let 到達入口, 到達選択肢, 手札入口, 手札選択肢, 状況入口;
try {
  到達入口 = 関数の本体("export async function runArrivalEffect(");
  到達選択肢 = 関数の本体("async function runArrivalOptionsEffect(");
  手札入口 = 関数の本体("export async function runHandEffect(");
  手札選択肢 = 関数の本体("async function runHandEffectOption(");
  // 🔴【続き746】【状況】カード（治安悪化・フェスティバル等）の入口。main.js は
  //   `runSituationEffect(cardId, player, buildArrivalEffectHelpers(player))` と
  //   **到達側の表**を渡すので、ここで使う口は**到達側だけ**に要る。
  //   ⚠ これを「共通処理」に入れていたため、pickArrivalOption を手札側にも
  //     要求して誤検知になっていた（到達専用の選択肢モーダルなので手札側には無くて正しい）。
  状況入口 = 関数の本体("export async function runSituationEffect(");
} catch (e) {
  console.error("🔴 エンジンの入口関数を取り出せなかった: " + e.message);
  process.exit(2);
}
// 入口3つと switch を抜いた残り＝本当に共通の処理。
// ⚠ 位置は eng（元の全文）基準なので、eng から後ろの範囲から順に削る。
let 残り = eng;
for (const r of [{ 開き: sw開き, 閉じ: sw閉じ }, 到達入口, 到達選択肢, 手札入口, 手札選択肢, 状況入口].sort((a, b) => b.開き - a.開き)) {
  残り = 残り.slice(0, r.開き) + 残り.slice(r.閉じ + 1);
}
const 本当に共通 = ヘルパー名(残り).要る;
const 到達入口のヘルパー = new Set([
  ...ヘルパー名(到達入口.本体).要る,
  ...ヘルパー名(到達選択肢.本体).要る,
  ...ヘルパー名(状況入口.本体).要る, // 【状況】カードも到達側の表で走る（上記参照）
]);
const 手札入口のヘルパー = new Set([...ヘルパー名(手札入口.本体).要る, ...ヘルパー名(手札選択肢.本体).要る]);

// ---- 3. 動詞が「どちら側から走り得るか」 ----
const effects = 読む("src/card-effects.js");
const ce = effects.indexOf("export const CARD_EFFECTS");
if (ce < 0) {
  console.error("🔴 CARD_EFFECTS が見つからない");
  process.exit(2);
}
const ce開き = effects.indexOf("{", ce);
const ce閉じ = 閉じ括弧(effects, ce開き);
const ce本体 = effects.slice(ce開き, ce閉じ + 1);

// カードごとの塊に切る: 「"card-id": {」
const カード印 = [...ce本体.matchAll(/"([a-z0-9-]+)"\s*:\s*\{/g)];
if (カード印.length < 30) {
  console.error("🔴 カードが " + カード印.length + " 件しか取れなかった＝取り出しに失敗している");
  process.exit(2);
}
const 到達側の動詞 = new Set();
const 手札側の動詞 = new Set();
let カード数 = 0;
for (const m of カード印) {
  const 開き = ce本体.indexOf("{", m.index + m[0].length - 1);
  let 閉じ;
  try {
    閉じ = 閉じ括弧(ce本体, 開き);
  } catch {
    continue;
  }
  const 塊 = ce本体.slice(開き, 閉じ + 1);
  // 入れ子のカード（無い想定）を避けるため、直下のカードだけ数える
  カード数++;
  const 節 = (鍵) => {
    const out = [];
    const re = new RegExp("(?:^|\\n)\\s{4}" + 鍵 + "\\s*:\\s*", "g");
    let mm;
    while ((mm = re.exec(塊))) {
      const o = 塊.indexOf(鍵 === "arrivalOptions" || 鍵 === "handEffectOptions" ? "[" : "{", mm.index + mm[0].length - 1);
      if (o < 0) continue;
      // 配列の時は [ ... ] を、オブジェクトの時は { ... } をざっくり取る
      const 開 = 塊[o];
      const 閉 = 開 === "[" ? "]" : "}";
      let d = 0;
      let j = o;
      for (; j < 塊.length; j++) {
        if (塊[j] === 開) d++;
        else if (塊[j] === 閉) {
          d--;
          if (d === 0) break;
        }
      }
      out.push(塊.slice(o, j + 1));
    }
    return out;
  };
  const 到達文 = 節("arrival").concat(節("arrivalOptions")).join("\n");
  const 手札文 = 節("handEffect").concat(節("handEffectOptions")).join("\n");
  const 動詞を拾う = (s) => [...s.matchAll(/VERBS\.([A-Z0-9_]+)/g)].map((x) => x[1]);
  const 到達の = 動詞を拾う(到達文);
  const 手札の = 動詞を拾う(手札文);
  for (const v of 到達の) 到達側の動詞.add(v);
  for (const v of 手札の) 手札側の動詞.add(v);
  // 🔴 「上記の到達効果を得る」＝到達の動詞が手札側からも走る
  if (手札文.includes("INHERIT_ARRIVAL_ACTIONS") || /inheritsArrival\s*:\s*true/.test(塊)) {
    for (const v of 到達の) 手札側の動詞.add(v);
  }
}
if (カード数 < 30) {
  console.error("🔴 カードの塊が " + カード数 + " 件＝取り出しに失敗している");
  process.exit(2);
}

// ---- 4. 照合 ----
const 無い = [];
const 見る = (側名, 側の鍵, 動詞集合) => {
  for (const v of [...動詞集合].sort()) {
    const 使う = 動詞が使うヘルパー.get(v);
    if (!使う) continue; // データにしか無い動詞（エンジンの case が無い）は check-cards 側の役目
    for (const h of [...使う].sort()) {
      if (!側の鍵.has(h)) 無い.push({ 側: 側名, 動詞: v, ヘルパー: h });
    }
  }
};
見る("到達", 到達の鍵, 到達側の動詞);
見る("手札", 手札の鍵, 手札側の動詞);
for (const h of [...本当に共通].sort()) {
  if (!到達の鍵.has(h)) 無い.push({ 側: "到達", 動詞: "(共通処理)", ヘルパー: h });
  if (!手札の鍵.has(h)) 無い.push({ 側: "手札", 動詞: "(共通処理)", ヘルパー: h });
}
for (const h of [...到達入口のヘルパー].sort()) {
  if (!到達の鍵.has(h)) 無い.push({ 側: "到達", 動詞: "(runArrivalEffect)", ヘルパー: h });
}
for (const h of [...手札入口のヘルパー].sort()) {
  if (!手札の鍵.has(h)) 無い.push({ 側: "手札", 動詞: "(runHandEffect)", ヘルパー: h });
}

console.log(
  "helpers: 手札 " +
    手札の鍵.size +
    " / 到達 " +
    到達の鍵.size +
    "、エンジンの動詞 " +
    動詞が使うヘルパー.size +
    "、カード " +
    カード数 +
    "（到達側の動詞 " +
    到達側の動詞.size +
    " / 手札側の動詞 " +
    手札側の動詞.size +
    "）"
);

if (無い.length > 0) {
  for (const x of 無い) {
    // ⚠ 症状の言い方を取り違えると、読む人を間違った方へ送る（続き746）。
    //   `?.` 無しで呼んでいる＝例外で止まる／`?.` 付きで戻り値を使う＝undefined で不発／
    //   `?.` 付きで戻り値を捨てている＝**例外もログも出ず、ただ起きない**（#704 がこれ）。
    const 無防備 = new RegExp("helpers\\.\\s*" + x.ヘルパー + "\\s*\\(").test(eng);
    const 症状 = 無防備
      ? "例外になって、効果がそこで途中で止まる"
      : "例外もログも出ず、**ただ何も起きない**（プレイヤーには「不発」に見える）";
    落ちる(
      x.側 + "効果の helpers に `" + x.ヘルパー + "` が無いのに、" + x.動詞 + " がそれを呼んでいる。\n" +
        "   ⇒ その経路では " + 症状 + "。\n" +
        "   ⚠ 同じカードでも「手札から使った時」と「到達で発動した時」で**別の表**を通るので、" +
        "片方だけに足すとこうなる（#704・#508・#630・#477・#478 は全部この形）。"
    );
  }
  console.error(
    "→ main.js の " + (無い[0].側 === "到達" ? "runArrivalEffect" : "runHandEffect") + " へ渡すオブジェクトに足すこと。"
  );
}

if (失敗 > 0) {
  console.error("🔴 " + 失敗 + " 件");
  process.exit(1);
}
console.log("✅ エンジンが呼ぶヘルパーは、走り得る側すべてに在る");
