// 「マイ山札」（2026-11-15・続き725 → 🔴 続き726 で**公式ルールどおりに作り直した**）。
//
// 🔴 ユーザー指摘「**１種類７枚までです。HPの山札カスタマイズのルールを確認してください。**」
//   ⇒ 公開されているルールが在った（https://www.asobuzz.net/variant-rules「山札のカスタマイズ」）。
//   私は続き725 で「実物の枚数だと選ぶ余地がゼロだから上限を枠まで広げる」と**自分で決めて
//   しまった**が、**決める話ではなく、調べる話だった**。
//
// ■ 公式の山札カスタマイズルール（そのまま）
//   ①最終的に以下の枚数になるように山札を構築する。
//       赤・橙・黄・緑・青・桃・紫 … 各**14枚**
//       虹 … **7枚**
//       無色 … **7枚以下**   ← 🔴 白と黒を**分けない**。合わせて7枚以下（少なくてもよい）
//   ②同じ名前のカードは**7枚まで**入れてもよい。
//   ※ 山札に入れられる **ONLYカードは1種類につき1枚まで**（絵の左下に ONLY と印字）。
//
//   ⓘ ページの前書きどおり、これは「**他のエディションや拡張パックのカードを混ぜて**
//     自分だけの山札にする」ための遊び方。だから**1セットしか持っていなければ7色は
//     ほぼ一意に決まる**（赤の枠14に対して候補が2種×7枚）——それはルールどおりで、
//     機能の不備ではない。**選べる幅はカードの種類が増えたぶんだけ増える。**
//     ⚠ ただし**無色だけは1セットでも選べる**（7枚以下の中で、どの無色を入れるか）。
//
// ■ これは何か（持ち込みデッキとは別物）
//   このゲームの山札は**全員で共有**している——49マスに配られ、残りが共通の山になる。
//   ⚠ マイデッキ戦の持ち込みデッキ（src/my-deck.js・7枚以上）は**自分だけが引く個人の山**で、別物。
//
// 🔴 **オンラインでは効かない。** 理由は2つあって、どちらも作りの都合ではなく筋の問題:
//   ①山札は全員で共有するので、**1人の好みが他の3人の引く札を決めてしまう**。
//   ②オンラインの山札を組むのは**サーバー（Edge Function）だけ**なので、こちらが何を
//     選んでもサーバーは標準の山を作る——つまり**勝手に効くことはない**。
//   ⇒ 混乱しないよう、オンラインに入っている間は**この機能ごと黙らせる**
//      （setMyStackSuspended。state.js の setOnlineMode から呼ぶ）。
//
// 🔴 **このファイルは何も import しない葉にしてある**（card-set.js と同じ作法）。
//   cards-data.js から呼ばれるので、何かを import すると循環 import → TDZ になる
//   （続き573 で実際に落ちている）。カードの表は**引数で受け取る**（mixed-deck.js と同じ）。

// 同じ名前のカードの上限（公式ルール②）。
export const MAX_SAME_NAME = 7;
// ONLYカードの上限（公式ルール※）。
export const MAX_ONLY = 1;

// 無色（白・黒）は**1つの枠**として扱う（公式ルール①「無色：7枚以下」）。
export const COLORLESS = "colorless";
export function groupOf(color) {
  return color === "white" || color === "black" ? COLORLESS : color;
}

// 画面に出す並び（無色は最後の1つにまとめる）。
export const MY_STACK_GROUP_ORDER = [
  "red", "orange", "yellow", "green", "blue", "pink", "purple", "rainbow", COLORLESS,
];

// baseCards（[{id, color, count, only}]）から、枠（グループごとの枚数）を数える。
// 戻り: { グループ: { n: 枚数, exact: ちょうどその枚数か } }
//   7色と虹は **ちょうど**。無色だけ **以下**（公式ルール①）。
export function groupQuotaOf(baseCards) {
  const q = {};
  for (const c of baseCards || []) {
    const g = groupOf(c.color);
    q[g] = (q[g] || 0) + (c.count ?? 1);
  }
  const out = {};
  for (const [g, n] of Object.entries(q)) out[g] = { n, exact: g !== COLORLESS };
  return out;
}

// 1種類に入れられる上限（公式ルール②と※）。
export function capFor(card) {
  return card?.only ? MAX_ONLY : MAX_SAME_NAME;
}

// 選べる札の一覧をグループごとにまとめる。sets は [[...], [...], ...]（リメイク／0th拡張／1st 等）。
// ⚠ 同じ id が複数のセットに在ることは無い（前提）が、万一あっても最初の1つだけ採る。
export function candidatesByGroup(sets) {
  const byGroup = new Map();
  const seen = new Set();
  for (const list of sets || []) {
    for (const c of list || []) {
      if (!c || !c.id || seen.has(c.id)) continue;
      seen.add(c.id);
      const g = groupOf(c.color);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push({
        id: c.id,
        color: c.color,
        group: g,
        printed: c.count ?? 1, // 実物に刷られている枚数（画面に出すだけ。上限ではない）
        only: !!c.only,
        max: capFor(c),
      });
    }
  }
  return byGroup;
}

// recipe（{ [cardId]: 枚数 }）を検証する。
// 返り値: { ok, perGroup: { グループ: { total, quota, exact, ok } }, errors: [...] }
// ⚠ 文言は作らない（ここは葉なので ui-text.js を import できない）。画面側が訳す。
export function validateMyStack(recipe, sets, baseCards) {
  const quota = groupQuotaOf(baseCards);
  const cands = candidatesByGroup(sets);
  const byId = new Map();
  for (const list of cands.values()) for (const c of list) byId.set(c.id, c);

  const perGroup = {};
  const errors = [];
  const 合計 = {};
  for (const [cardId, raw] of Object.entries(recipe || {})) {
    const n = Math.floor(Number(raw) || 0);
    if (n <= 0) continue;
    const c = byId.get(cardId);
    if (!c) {
      errors.push({ kind: "unknown", cardId });
      continue;
    }
    if (n > c.max) errors.push({ kind: "tooMany", cardId, max: c.max, n, only: c.only });
    合計[c.group] = (合計[c.group] || 0) + Math.min(n, c.max);
  }
  for (const [g, q] of Object.entries(quota)) {
    const total = 合計[g] || 0;
    const ok = q.exact ? total === q.n : total <= q.n;
    perGroup[g] = { total, quota: q.n, exact: q.exact, ok };
    if (!ok) errors.push({ kind: "groupTotal", group: g, total, quota: q.n, exact: q.exact });
  }
  return { ok: errors.length === 0, perGroup, errors };
}

// 山札の中身を組む。**グループごとに独立して**見て、揃っていないグループだけ標準へ落とす
// （全部捨てるより、直し忘れた1色だけが標準に戻る方が事故が小さい）。
export function buildMyStackNormalCards(sets, recipe, baseCards) {
  const quota = groupQuotaOf(baseCards);
  const cands = candidatesByGroup(sets);
  const out = [];
  for (const [g, q] of Object.entries(quota)) {
    const list = cands.get(g) || [];
    let total = 0;
    const 採る = [];
    for (const c of list) {
      const n = Math.min(Math.floor(Number(recipe?.[c.id]) || 0), c.max);
      if (n > 0) {
        採る.push({ id: c.id, color: c.color, count: n });
        total += n;
      }
    }
    const 良い = q.exact ? total === q.n : total <= q.n;
    // ⚠ 無色は「0枚」も正しい（7枚以下）。その時は**1枚も入れない**のが答えなので、
    //   採るが空でも標準へ落とさない。7色・虹は 0 なら必ず不正（exact）なので落ちる。
    if (良い) out.push(...採る);
    else out.push(...(baseCards || []).filter((c) => groupOf(c.color) === g).map((c) => ({ ...c })));
  }
  return out;
}

// 標準の山札そのままの recipe（編集の出発点）。
export function defaultRecipeOf(baseCards) {
  const r = {};
  for (const c of baseCards || []) r[c.id] = (r[c.id] || 0) + (c.count ?? 1);
  return r;
}

// 「おまかせ」: グループごとに枠を埋めるまで、上限に達していない札へ1枚ずつ無作為に足す。
export function randomRecipeOf(sets, baseCards) {
  const quota = groupQuotaOf(baseCards);
  const cands = candidatesByGroup(sets);
  const r = {};
  for (const [g, q] of Object.entries(quota)) {
    const list = cands.get(g) || [];
    let 残り = q.n;
    let 行き止まり = 0;
    while (残り > 0 && 行き止まり < 500) {
      const pool = list.filter((c) => (r[c.id] || 0) < c.max);
      if (pool.length === 0) break;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      r[pick.id] = (r[pick.id] || 0) + 1;
      残り--;
      行き止まり++;
    }
    // 埋まらなかったグループは標準へ落とす（ちょうどが要る7色・虹の保険）。
    if (残り > 0 && q.exact) {
      for (const c of list) delete r[c.id];
      for (const c of (baseCards || []).filter((x) => groupOf(x.color) === g)) r[c.id] = c.count ?? 1;
    }
  }
  return r;
}

// ── 覚えておく側（localStorage） ─────────────────────────────────────────
const KEY = "so7-my-stack-v1";

let 有効 = false;
let 組み方 = {};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    if (o && typeof o === "object") {
      有効 = !!o.enabled;
      if (o.recipe && typeof o.recipe === "object") {
        for (const [k, v] of Object.entries(o.recipe)) {
          const n = Math.floor(Number(v) || 0);
          if (typeof k === "string" && n > 0) 組み方[k] = n;
        }
      }
    }
  }
} catch (e) {
  // プライベートウィンドウ等で読めないことがある。標準の山札のままで困らない。
}

// オンラインの間は黙らせる（上の説明参照）。
let 止めている = false;
export function setMyStackSuspended(b) {
  止めている = !!b;
}

export function isMyStackEnabled() {
  return 有効;
}
export function getMyStackRecipe() {
  return { ...組み方 };
}
// 実際に山札へ効くか（画面の「山札一覧」もこれを見る）。
export function isMyStackActive() {
  return 有効 && !止めている && Object.keys(組み方).length > 0;
}

function 保存() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: 有効, recipe: 組み方 }));
  } catch (e) {
    /* 覚えられなくても、そのセッションの間は効く */
  }
  for (const fn of 購読) {
    try {
      fn();
    } catch (e) {
      console.error("[my-stack] 購読先で例外", e);
    }
  }
}

export function setMyStackEnabled(b) {
  有効 = !!b;
  保存();
}
export function setMyStackRecipe(recipe) {
  const next = {};
  for (const [k, v] of Object.entries(recipe || {})) {
    const n = Math.floor(Number(v) || 0);
    if (typeof k === "string" && n > 0) next[k] = n;
  }
  組み方 = next;
  保存();
}

const 購読 = new Set();
export function onMyStackChange(fn) {
  購読.add(fn);
  return () => 購読.delete(fn);
}
