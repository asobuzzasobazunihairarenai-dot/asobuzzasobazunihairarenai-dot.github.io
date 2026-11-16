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
//
// 🔴【#688・続き740】ユーザー要望「**マイ山札はマイデッキと同じく複数設定できるように**」。
//   ⇒ 覚える形を `{ enabled, stacks: [{id,name,recipe}], selectedId }` にした。
//   ⚠ **古い形（{enabled, recipe}）は読み込みの時に1つの山札へ移す**（名前は画面側が
//     後から付ける。ここは葉なので文言を持てない）。移行は読むだけで済み、
//     古い鍵は上書きされるまで触らない。
//   ⚠ 既存の口（getMyStackRecipe など）は**選ばれている1つ**に働く＝呼び出し側は無変更。
const KEY = "so7-my-stack-v1";
export const MAX_MY_STACKS = 8; // 増やしすぎると選ぶのが大変になるので上限を置く

let 有効 = false;
let 山札たち = []; // [{ id, name, recipe }]
let 選んでいる = null;

function 新しいid() {
  return "ms_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}
function 組み方を整える(o) {
  const out = {};
  for (const [k, v] of Object.entries(o || {})) {
    const n = Math.floor(Number(v) || 0);
    if (typeof k === "string" && n > 0) out[k] = n;
  }
  return out;
}

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    if (o && typeof o === "object") {
      有効 = !!o.enabled;
      if (Array.isArray(o.stacks)) {
        for (const st of o.stacks) {
          if (!st || typeof st !== "object") continue;
          山札たち.push({
            id: typeof st.id === "string" && st.id ? st.id : 新しいid(),
            name: typeof st.name === "string" ? st.name : "",
            recipe: 組み方を整える(st.recipe),
          });
        }
        選んでいる = typeof o.selectedId === "string" ? o.selectedId : null;
      } else if (o.recipe && typeof o.recipe === "object") {
        // 古い形（1つだけ）からの移行。名前は空のまま＝画面側が既定の名前を出す。
        山札たち.push({ id: 新しいid(), name: "", recipe: 組み方を整える(o.recipe) });
      }
    }
  }
} catch (e) {
  // プライベートウィンドウ等で読めないことがある。標準の山札のままで困らない。
}
if (山札たち.length > 0 && !山札たち.some((x) => x.id === 選んでいる)) 選んでいる = 山札たち[0].id;

// オンラインの間は黙らせる（上の説明参照）。
let 止めている = false;
export function setMyStackSuspended(b) {
  止めている = !!b;
}

function 今の山札() {
  return 山札たち.find((x) => x.id === 選んでいる) || null;
}

export function isMyStackEnabled() {
  return 有効;
}
export function getMyStackRecipe() {
  return { ...(今の山札()?.recipe || {}) };
}
// 実際に山札へ効くか（画面の「山札一覧」もこれを見る）。
export function isMyStackActive() {
  return 有効 && !止めている && Object.keys(今の山札()?.recipe || {}).length > 0;
}

// ── 複数の山札 ───────────────────────────────────────────────────────────
export function getMyStacks() {
  return 山札たち.map((x) => ({ id: x.id, name: x.name, recipe: { ...x.recipe } }));
}
export function getSelectedStackId() {
  return 今の山札()?.id || null;
}
export function selectMyStack(id) {
  if (!山札たち.some((x) => x.id === id)) return false;
  選んでいる = id;
  保存();
  return true;
}
// 新しい山札を足して、それを選ぶ。recipe を渡さなければ空（画面側が標準から始める）。
export function createMyStack(name, recipe) {
  if (山札たち.length >= MAX_MY_STACKS) return null;
  const st = { id: 新しいid(), name: typeof name === "string" ? name : "", recipe: 組み方を整える(recipe) };
  山札たち.push(st);
  選んでいる = st.id;
  保存();
  return st.id;
}
export function renameMyStack(id, name) {
  const st = 山札たち.find((x) => x.id === id);
  if (!st) return false;
  st.name = typeof name === "string" ? name.slice(0, 24) : "";
  保存();
  return true;
}
// ⚠ 最後の1つは消させない（消すと「どれを編集しているのか」が無くなる）。
export function deleteMyStack(id) {
  if (山札たち.length <= 1) return false;
  const i = 山札たち.findIndex((x) => x.id === id);
  if (i < 0) return false;
  山札たち.splice(i, 1);
  if (選んでいる === id) 選んでいる = 山札たち[Math.min(i, 山札たち.length - 1)].id;
  保存();
  return true;
}

function 保存() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: 有効, stacks: 山札たち, selectedId: 選んでいる }));
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
// 選ばれている山札の組み方を書き換える。1つも無ければ作る（初めて開いた時）。
export function setMyStackRecipe(recipe) {
  const next = 組み方を整える(recipe);
  let st = 今の山札();
  if (!st) {
    st = { id: 新しいid(), name: "", recipe: next };
    山札たち.push(st);
    選んでいる = st.id;
  } else {
    st.recipe = next;
  }
  保存();
}

const 購読 = new Set();
export function onMyStackChange(fn) {
  購読.add(fn);
  return () => 購読.delete(fn);
}
