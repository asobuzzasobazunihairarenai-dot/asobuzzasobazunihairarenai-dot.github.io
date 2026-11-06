// 「まぜる」の山札を組む（2026-11-06・続き671）。
//
// 🔴 ユーザー指示: 「混ぜるときは山札の総枚数は通常エディションの枚数にしてください。
//   たとえば赤は全部で１４枚にしてください。その中で混ぜるカードのバランスがなるべく
//   均等になるようにしてください。」
//
// それまでは3つのセットを**そのまま繋げていた**ので、赤だけで 14+14+14＝42枚、
// 合計 322枚という別物の山になっていた（盤面49マスに配った後の山札が厚すぎて、
// 1回の対局で出てくる札の割合も変わる）。
//
// ■ 組み方
//   ・7色はそれぞれ **14枚**（通常のエディションと同じ）
//   ・なないろの欠片 **7枚**（3セットで同じ札なので1種類しかない）
//   ・白 **4枚** ＋ 黒 **3枚**（リメイク／0th拡張と同じ内訳）
//   合計 98 + 7 + 7 = **112枚**＝リメイク・0th拡張・1st とぴったり同じ。
//
// ■ 色（7色）の配り方 ＝ なるべく均等
//   その色の種類を3セットから全部集めると**8種類**（リメイク2・0th拡張4・1st 2）。
//   🔴 **ONLYカード（元のセットで1枚しか入らない札）は1枚のまま**にする
//     （0th拡張の決まり「ONLYカードは1枚ずつしか入れれません」）。
//   残り7種類で13枚を分けるので、**6種類が2枚・1種類が1枚**になる。
//   ⇒ **どの種類も最低1枚は入る**（まぜても消える札が無い）。
//   ⚠ 「余りの1枚」がいつも同じエディションへ偏らないよう、並べる時に
//     **エディションを交互**にしてから先頭から配る。
//
// ■ 白黒だけは全種類を入れられない
//   白は8種類・黒は6種類あるのに、枠は白4・黒3しかない。
//   ⇒ **毎回その中から無作為に選ぶ**（各1枚）。こうすればどの札にも出番があり、
//     対局ごとに顔ぶれが変わる。**決め打ちにすると半分の札が永久に出てこない。**
//
// ⚠ このファイルは **import を1つも持たない葉**にしてある（続き573 の TDZ 対策）。
//   サーバー側（supabase/functions/so7-apply-action.ts）にも同じ処理の写しがあり、
//   tools/check-cards.mjs が毎回ズレていないか照合する。

export const MIXED_PER_COLOR = 14; // 1色あたりの枚数（通常のエディションと同じ）
export const MIXED_WHITE = 4; // 白の枚数
export const MIXED_BLACK = 3; // 黒の枚数

const MIXED_COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];

// セットごとの同じ色の並びを、1つずつ順番に取って1本にする（エディション交互）。
function interleave(lists) {
  const out = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const l of lists) {
      if (i < l.length) out.push(l[i]);
    }
  }
  return out;
}

function pickRandom(list, n) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// remake / ex0 / firstEd は、それぞれ { id, color, count } の配列。
export function buildMixedNormalCards(remake, ex0, firstEd) {
  const sets = [remake || [], ex0 || [], firstEd || []];
  const out = [];

  // --- 7色 ---
  for (const color of MIXED_COLORS) {
    const perSet = sets.map((s) => s.filter((c) => c.color === color));
    const all = interleave(perSet);
    if (all.length === 0) continue;
    // ONLYカード（元のセットで1枚だけ）は1枚で固定。
    const only = all.filter((c) => (c.count ?? 1) === 1);
    const rest = all.filter((c) => (c.count ?? 1) !== 1);
    let 残り = MIXED_PER_COLOR - only.length;
    for (const c of only) out.push({ id: c.id, color: c.color, count: 1 });
    if (rest.length === 0) continue;
    const base = Math.floor(残り / rest.length);
    let 余り = 残り - base * rest.length;
    for (const c of rest) {
      const n = base + (余り > 0 ? 1 : 0);
      if (余り > 0) 余り--;
      if (n > 0) out.push({ id: c.id, color: c.color, count: n });
    }
  }

  // --- なないろの欠片（3セットで同じ札なので1種類だけ） ---
  const rainbow = sets.flat().find((c) => c.color === "rainbow");
  if (rainbow) out.push({ id: rainbow.id, color: "rainbow", count: rainbow.count ?? 7 });

  // --- 白黒（枠より種類が多いので無作為に選ぶ） ---
  for (const [color, want] of [["white", MIXED_WHITE], ["black", MIXED_BLACK]]) {
    const all = interleave(sets.map((s) => s.filter((c) => c.color === color)));
    for (const c of pickRandom(all, want)) out.push({ id: c.id, color, count: 1 });
  }

  return out;
}
