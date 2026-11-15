// 「マイ山札」（2026-11-15・続き725）。
//
// 🔴 ユーザー指示「**マイ山札から進めよう！**」。
//
// ■ これは何か
//   このゲームの山札（112枚）は**全員で共有**している——49マスに配られ、残りが共通の山になる。
//   いまはその中身が全員同じ（リメイクの33種）なので、「どのカードを何枚入れるか」を
//   **自分で決められる**ようにする。これが「マイ山札」。
//
//   ⚠ **持ち込みデッキ（マイデッキ戦）とは別物。** あちらは自分だけが引く個人の山
//     （src/my-deck.js・7枚以上）。こちらは**盤面になる共通の山**そのもの。
//
// ■ 色ごとの枚数は変えられない（これが設計の芯）
//   7色勝利（7色のロックを集める）がこのゲームの根っこなので、色の配分を崩すと別物になる。
//   ⇒ **色ごとの合計は標準と同じまま**にして、**その色の中でどの札を何枚使うかだけ**選ぶ。
//      7色＝各14枚 ／ なないろの欠片＝7枚 ／ 白＝4枚 ／ 黒＝3枚 ＝ **合計112枚**。
//   ⓘ なないろの欠片は**1種類しかない**ので選ぶ余地が無い（7枚で固定）。
//
// ■ 1種類の上限は「その色の枠まで」（🔴 ここは測って決め直した）
//   最初は「実物に刷られている枚数まで」にしていた。ところが机上で数えたら、
//   **リメイクの33種だけでは選ぶ余地がゼロ**だった:
//     赤の枠=14 ／ 候補=2種（ジャンプ台7枚・カウンターロック7枚）⇒ **7/7 しか組めない**。
//     白(4=2+2)・黒(3=1+2)・なないろ(7=1種) も同じで、**全色が一意に決まる**。
//   ＝遊んでいる人には何も選べない機能になっていた。
//   ⇒ 上限は**その色の枠**（7色なら14・白4・黒3）にした。箱に7枚しか入っていないのは
//     **箱の中身の話**で、ルールではない（デジタル版なら枚数は刷り直せる）。
//   🔴 ただし **ONLYカード（元のセットで1枚だけの札）は1枚のまま**——あちらは箱の中身では
//     なく**ルール**（0th拡張の「ONLYカードは1枚ずつしか入れれません」）。
//   ⚠ 実物の枚数は画面に「実物◯枚」として出す（情報を消さない）。
//
// 🔴 **オンラインでは効かない。** 理由は2つあって、どちらも作りの都合ではなく筋の問題:
//   ①山札は全員で共有するので、**1人の好みが他の3人の引く札を決めてしまう**。
//   ②オンラインの山札を組むのは**サーバー（Edge Function）だけ**なので、
//     こちらが何を選んでもサーバーは標準の山を作る——つまり**勝手に効くことはない**。
//   ⇒ 混乱しないよう、オンラインに入っている間は**この機能ごと黙らせる**
//      （setMyStackSuspended。state.js の setOnlineMode から呼ぶ）。
//      そうしないと「山札一覧」にマイ山札が出るのに実際の盤面は標準、という食い違いになる。
//
// 🔴 **このファイルは何も import しない葉にしてある**（card-set.js と同じ作法）。
//   cards-data.js から呼ばれるので、何かを import すると循環 import → TDZ になる
//   （続き573 で実際に落ちている）。カードの表は**引数で受け取る**（mixed-deck.js と同じ）。

// ── 色の並びと、色ごとの枠 ───────────────────────────────────────────────
// 🔴 枠の数は**ここに書かない**。標準の表（リメイクの33種）から数える＝表が変われば枠も動く。
export const MY_STACK_COLOR_ORDER = [
  "red", "orange", "yellow", "green", "blue", "pink", "purple", "rainbow", "white", "black",
];

// baseCards（[{id, color, count}]）から「色ごとの合計枚数」を数える。
export function colorQuotaOf(baseCards) {
  const q = {};
  for (const c of baseCards || []) {
    q[c.color] = (q[c.color] || 0) + (c.count ?? 1);
  }
  return q;
}

// 1種類に入れられる上限。printed=実物に刷られている枚数、quota=その色の枠。
// 🔴 ONLYカード（printed===1）だけは1枚で固定（ルール）。それ以外は枠まで。
export function capFor(printed, quota) {
  return printed === 1 ? 1 : Math.max(1, quota || 1);
}

// 選べる札の一覧を色ごとにまとめる。sets は [[...], [...], ...]（リメイク／0th拡張／1st 等）。
// baseCards を渡すと、色ごとの枠から上限（max）も計算して入れる。
// ⚠ 同じ id が複数のセットに在ることは無い（前提）が、万一あっても最初の1つだけ採る。
export function candidatesByColor(sets, baseCards) {
  const quota = baseCards ? colorQuotaOf(baseCards) : null;
  const byColor = new Map();
  const seen = new Set();
  for (const list of sets || []) {
    for (const c of list || []) {
      if (!c || !c.id || seen.has(c.id)) continue;
      seen.add(c.id);
      if (!byColor.has(c.color)) byColor.set(c.color, []);
      const printed = c.count ?? 1;
      byColor.get(c.color).push({
        id: c.id,
        color: c.color,
        printed,
        max: quota ? capFor(printed, quota[c.color]) : printed,
      });
    }
  }
  return byColor;
}

// recipe（{ [cardId]: 枚数 }）を色ごとに検証する。
// 返り値: { ok, perColor: { 色: { total, quota, ok } }, errors: [{ color, kind, ... }] }
// ⚠ 文言は作らない（ここは葉なので ui-text.js を import できない）。画面側が訳す。
export function validateMyStack(recipe, sets, baseCards) {
  const quota = colorQuotaOf(baseCards);
  const cands = candidatesByColor(sets, baseCards);
  const maxById = new Map();
  for (const list of cands.values()) for (const c of list) maxById.set(c.id, c.max);

  const perColor = {};
  const errors = [];
  const 色ごとの合計 = {};
  for (const [cardId, raw] of Object.entries(recipe || {})) {
    const n = Math.floor(Number(raw) || 0);
    if (n <= 0) continue;
    if (!maxById.has(cardId)) {
      errors.push({ kind: "unknown", cardId });
      continue;
    }
    const max = maxById.get(cardId);
    if (n > max) errors.push({ kind: "tooMany", cardId, max, n });
    const color = [...cands.entries()].find(([, l]) => l.some((c) => c.id === cardId))?.[0];
    色ごとの合計[color] = (色ごとの合計[color] || 0) + Math.min(n, max);
  }
  for (const color of Object.keys(quota)) {
    const total = 色ごとの合計[color] || 0;
    const ok = total === quota[color];
    perColor[color] = { total, quota: quota[color], ok };
    if (!ok) errors.push({ kind: "colorTotal", color, total, quota: quota[color] });
  }
  return { ok: errors.length === 0, perColor, errors };
}

// 山札の中身を組む。**色ごとに独立して**見て、揃っていない色だけ標準へ落とす
// （全部捨てるより、直し忘れた1色だけが標準に戻る方が事故が小さい）。
export function buildMyStackNormalCards(sets, recipe, baseCards) {
  const quota = colorQuotaOf(baseCards);
  const cands = candidatesByColor(sets, baseCards);
  const out = [];
  for (const color of Object.keys(quota)) {
    const list = cands.get(color) || [];
    let total = 0;
    const 採る = [];
    for (const c of list) {
      const n = Math.min(Math.floor(Number(recipe?.[c.id]) || 0), c.max);
      if (n > 0) {
        採る.push({ id: c.id, color, count: n });
        total += n;
      }
    }
    if (total === quota[color] && 採る.length > 0) out.push(...採る);
    else out.push(...(baseCards || []).filter((c) => c.color === color).map((c) => ({ ...c })));
  }
  // 標準の表に在るのに枠（quota）に出てこない色は無いが、念のため取りこぼさない。
  for (const c of baseCards || []) {
    if (!(c.color in quota)) out.push({ ...c });
  }
  return out;
}

// 標準の山札そのままの recipe（編集の出発点）。
export function defaultRecipeOf(baseCards) {
  const r = {};
  for (const c of baseCards || []) r[c.id] = (r[c.id] || 0) + (c.count ?? 1);
  return r;
}

// 「おまかせ」: 色ごとに枠を埋めるまで、上限に達していない札へ1枚ずつ無作為に足す。
export function randomRecipeOf(sets, baseCards) {
  const quota = colorQuotaOf(baseCards);
  const cands = candidatesByColor(sets, baseCards);
  const r = {};
  for (const color of Object.keys(quota)) {
    const list = cands.get(color) || [];
    let 残り = quota[color];
    let 行き止まり = 0;
    while (残り > 0 && 行き止まり < 500) {
      const pool = list.filter((c) => (r[c.id] || 0) < c.max);
      if (pool.length === 0) break;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      r[pick.id] = (r[pick.id] || 0) + 1;
      残り--;
      行き止まり++;
    }
    // 埋まらなかった色は標準へ落とす（上限の合計が枠に届かない表になった時の保険）。
    if (残り > 0) {
      for (const c of list) delete r[c.id];
      for (const c of (baseCards || []).filter((x) => x.color === color)) r[c.id] = c.count ?? 1;
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
