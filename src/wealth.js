// 1st EDITION の【財力】。**import を1つも持たない葉**（続き573 の TDZ 対策）。
//
// 【財力とは】そのプレイヤーの**手札の枚数**。1st EDITION のカードは、リメイクの【追色】
// （同色のカードを手札から捨てる＝払うコスト）とは**まったく別の仕組み**で、
// 「財力がいくつなら、この効果を得る」という**条件**として書かれている。
//   【財力＝３】… ちょうど3枚
//   【財力≦２】… 2枚以下
//   【財力≧３】… 3枚以上
//   【財力＝S】… S はあなたの財力そのもの（枚数・マス数として使う）
// 🔴 **何も捨てない。** 追色と違い、条件を満たしているかを見るだけ。
//
// 【「手札の枚数」の数え方】このアプリの既存の定義に合わせる（card-effect-engine.js の
//   getHandTokens）。公開ドロー中のカードも「あなたの手札」に含む（ユーザー確認済み設計方針）。
//
// 【修正値】Eカード（1st）の基本効果に「あなたはいつでも、自分の財力を１多く計算してもよい」が
//   在る。**持っている1枚につき任意で＋1**（手札でもロックエリアでも「持っている」）。
//   ⇒ 財力は1つの数ではなく **base 〜 base+bonusMax の幅**になる。
//
// 🔴 **「してもよい」なので、本人に有利な方に読む。** 条件を満たせる値が幅の中に1つでも
//   あれば満たしたことにする（＝使いたい時だけ＋1を宣言する、という実際の遊び方と同じ）。
//   ・【財力≦２】… ＋1すると外れるだけなので、宣言しなければよい ⇒ base で見る
//   ・【財力≧３】… 足りない時に宣言すれば届く ⇒ base+bonusMax で見る
//   ・【財力＝３】… ちょうどにできるなら宣言する ⇒ 幅の中に3が在るか
//
// 🔴 **罰の効果でも「有利な方」を決め打ちしない**（ユーザー指摘「あえて罰を受けたいときも
//   出てきます」）。治安悪化「財力５以上は捨てる」のような効果は、普通は宣言しないが、
//   **わざと受けたい場面がある**（手札を減らしたい・相手の効果の条件を外したい等）。
//   ⇒ **「宣言するかどうかで結果が変わる時だけ本人に聞く」**のが正しい。
//   そのための見分けが wealthNeedsDeclaration()。
//   ・満たす値も満たさない値も幅の中に在る ⇒ **聞く**（罰だろうが得だろうが本人が決める）
//   ・どちらかに決まっている ⇒ 聞かない（宣言しても結果が変わらないので無駄に止めない）
//   ⚠ 以前ここに penalty: true という逃げ道を置いていたが、上の指摘で**取り除いた**。
//     「本人は宣言しないはず」と決め打ちすると、わざと受ける道が塞がる。
//
// ⚠ 【財力＝S】の S は **base（実際の手札の枚数）** を使う。幅の上限を使わないのは、
//   「宣言するかどうか」で起きることの量が変わってしまい、毎回聞く必要が出るため。
//   （条件を満たすためだけの宣言なら、聞かずに有利に読んでも結果は同じになる。）
//   ⇒ ここはユーザー判断待ちの所。変えるなら wealthCountFor の1行だけ。

const 全角 = ["０", "１", "２", "３", "４", "５", "６", "７", "８", "９"];
function 全角数字(n) {
  return String(n)
    .split("")
    .map((c) => (c >= "0" && c <= "9" ? 全角[Number(c)] : c))
    .join("");
}

// カード面に印字されている形の文字列を作る（カード開発モードの照合に使う）。
export function renderWealthCondition(cond) {
  if (!cond) return "";
  if (cond.variable) return "【財力＝S】";
  if (Number.isFinite(cond.eq)) return `【財力＝${全角数字(cond.eq)}】`;
  if (Number.isFinite(cond.max)) return `【財力≦${全角数字(cond.max)}】`;
  if (Number.isFinite(cond.min)) return `【財力≧${全角数字(cond.min)}】`;
  return "";
}

// 財力の幅（本人が宣言して名乗れる値の範囲）。
export function wealthRange(w) {
  const base = Math.max(0, Number(w?.base) || 0);
  return { min: base, max: base + Math.max(0, Number(w?.bonusMax) || 0) };
}

// ある値（宣言した後の財力）1つが条件を満たすか。
function 値が満たす(cond, v) {
  if (!cond) return true;
  if (cond.variable) return true; // 【財力＝S】自体は条件ではない（Sが0なら何も起きないだけ）
  if (Number.isFinite(cond.eq)) return v === cond.eq;
  if (Number.isFinite(cond.max)) return v <= cond.max;
  if (Number.isFinite(cond.min)) return v >= cond.min;
  return true;
}

// 財力の条件を満たせるか（＝幅の中に満たす値が1つでもあるか）。
// w は { base, bonusMax }（card-effect-engine.js の getWealth）。
export function wealthSatisfies(cond, w) {
  if (!cond) return true;
  const { min, max } = wealthRange(w);
  for (let v = min; v <= max; v++) if (値が満たす(cond, v)) return true;
  return false;
}

// 幅のどの値でも満たすか（＝宣言のしかたに関わらず満たす）。
export function wealthAlwaysSatisfies(cond, w) {
  if (!cond) return true;
  const { min, max } = wealthRange(w);
  for (let v = min; v <= max; v++) if (!値が満たす(cond, v)) return false;
  return true;
}

// 🔴 宣言するかどうかで結果が変わるか（＝本人に聞くべきか）。
//   罰の効果でも「あえて受ける」道を塞がないために、決め打ちせずこれで見る。
export function wealthNeedsDeclaration(cond, w) {
  if (!cond) return false;
  return wealthSatisfies(cond, w) && !wealthAlwaysSatisfies(cond, w);
}

// 【財力＝S】の S（枚数・マス数として使う値）。
export function wealthCountFor(w) {
  return Math.max(0, Number(w?.base) || 0);
}

// 「いまの財力」を人に見せる時の文字列（例 "3" / "3〜4"）。
export function formatWealth(w) {
  const base = Number(w?.base) || 0;
  const bonus = Number(w?.bonusMax) || 0;
  return bonus > 0 ? `${base}〜${base + bonus}` : String(base);
}

// 条件を満たしていない時に、人に見せる説明の材料（文は呼び出し側が t() で組む）。
export function describeWealthRequirement(cond) {
  if (!cond) return "";
  if (Number.isFinite(cond.eq)) return `＝${cond.eq}`;
  if (Number.isFinite(cond.max)) return `≦${cond.max}`;
  if (Number.isFinite(cond.min)) return `≧${cond.min}`;
  return "";
}
