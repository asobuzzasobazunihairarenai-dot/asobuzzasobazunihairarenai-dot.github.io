// 「パックを開ける」画面（2026-11-15・続き726 → 🔴 続き728 でアカウント対応に作り直し）。
// いまは**管理者だけ**に出す（ユーザー指示）。
//
// 🔴 中身の決まりは src/card-packs.js の冒頭と supabase_setup_so7.sql の節。
//   ここは**見せ方と押し方**だけ。持ち物も引きも**全部サーバー**が持っている。
//
// ■ 画面の中身
//   ①持ち物の行（かけら／パック／ノーマルワイルド／ONLYワイルド）
//   ②買う・開ける
//   ③開封（1枚ずつ押してめくる・ぜんぶめくる）
//   ④デイリーチャレンジ（進みと受け取り）
//   ⑤ウィークリー（週の勝利数と節目のパック）
//   ⑥コレクション（52種・持っている枚数・ワイルドで1枚もらう）
//
// ⚠ **新しい画像も canvas も1枚も足さない**（カードの絵と裏面はアプリが既に持っている／
//   全画面の canvas は1枚で約23MB＝#441・#607）。めくりは transform だけ。
// ⚠ **色は決め打ちしない**（教訓15。明暗2テーマ）。地と文字色はパネルから継ぐ。
// ⚠ SQL をまだ流していない環境では RPC が落ちる。**握りつぶさずに文で出す**
//   （黙って空の画面になると、何が起きているか分からない）。

import { EX0_NORMAL_CARDS } from "./cards-data-ex0.js";
import { FIRST_ED_NORMAL_CARDS } from "./cards-data-1st.js";
import { getCardImagePath, getCardBackImagePath, hasNoPrintedFace, getCardDefinition } from "./cards-data.js";
import { showCardFace } from "./card-face-display.js";
import { getCardName } from "./card-text.js";
import {
  PACK_SIZE,
  PACK_COST,
  COPY_MAX,
  WILD_PER,
  getCollection,
  isCollectionReady,
  refreshCollection,
  buyPacks,
  openPack,
  redeemWildcard,
  claimDailyChallenge,
  claimWeekly,
  adminGrantAllCards,
  adminResetCards,
} from "./card-packs.js";
import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { t } from "./ui-text.js";

// パックに入り得る札＝**まだアプリで公開していない**0th拡張と 1st EDITION の通常カード。
// ⓘ リメイクの33種は最初から全員が上限まで持っている（標準の山札そのもの）ので入れない。
export function getPackPool() {
  return [...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS];
}
function capOf(def) {
  return def?.only ? 1 : COPY_MAX;
}
function cardDisplayName(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}

let panel = null;
let backdrop = null;
let 再描画 = () => {};
let いまの引き = null; // [{ cardId, only, isNew, shard, rare, めくった }]
let 知らせ = null; // 画面の上に出す1行（エラー・結果）
let 忙しい = false;
let 管理者 = false;

// ── 小さな部品 ─────────────────────────────────────────────────────────────
// めくる7枚用（大きく出るので、文字の無い絵の札はカード面を組み立てる＝#660）。
function 札の面(cardId) {
  const el = document.createElement("div");
  el.className = "card-pack-face";
  if (hasNoPrintedFace(cardId)) showCardFace(el, cardId, null);
  else {
    el.style.backgroundImage = `url("${getCardImagePath(cardId)}")`;
    el.style.backgroundSize = "cover";
  }
  return el;
}

// 🔴 コレクションの小さい枠用。**絵だけ**にする（background-image）。
//   showCardFace は**カード面をDOMで組み立てる**ので、52枚ぶん作ると画面が固まる
//   （実際に固まった。deck-viewer.js に「99種ぶん作ると重い」と書いてあった罠と同じ）。
//   ⚠ 3.4rem では文字は読めないので、絵だけで困らない。押した時に大きく出す仕組みは
//     まだ無い——欲しくなったら、その時だけカード面を1枚組む形にする。
function 小さい札(cardId, 大きさ) {
  const el = document.createElement("div");
  el.className = "card-pack-face";
  el.style.width = 大きさ;
  el.style.height = 大きさ;
  el.style.backgroundImage = `url("${getCardImagePath(cardId)}")`;
  el.style.backgroundSize = "cover";
  el.loading = "lazy";
  return el;
}

function ボタン(文, 中身, { 主役 = false, 無効 = false } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = 主役 ? "card-pack-open-btn" : "card-pack-sub-btn";
  b.textContent = 文;
  b.disabled = 無効 || 忙しい;
  b.addEventListener("click", async () => {
    if (忙しい) return;
    忙しい = true;
    知らせ = null;
    再描画();
    try {
      await 中身();
    } catch (err) {
      知らせ = 文言にする(err);
    } finally {
      忙しい = false;
      再描画();
    }
  });
  return b;
}

// サーバーが投げた理由を、プレイヤーの言葉に直す。
function 文言にする(err) {
  const m = String(err?.message || err || "");
  if (/not_authenticated|not_ready|not_connected/.test(m)) return t("packs.needLogin");
  if (/insufficient_balance/.test(m)) return t("packs.noCoins");
  if (/no_pack/.test(m)) return t("packs.noPacks");
  if (/no_wildcard/.test(m)) return t("packs.noWildcard");
  if (/already_max/.test(m)) return t("packs.alreadyMax");
  if (/already_claimed/.test(m)) return t("packs.alreadyClaimed");
  if (/not_complete/.test(m)) return t("packs.notComplete");
  if (/nothing_to_claim/.test(m)) return t("packs.nothingToClaim");
  // PostgREST は「関数が無い」を 404 / PGRST202 で返す＝SQL をまだ流していない。
  if (/PGRST202|schema cache|does not exist|404/i.test(m)) return t("packs.needSql");
  return t("packs.failed");
}

// ── ① 持ち物の行 ───────────────────────────────────────────────────────────
function 持ち物の行() {
  const c = getCollection();
  const wrap = document.createElement("div");
  wrap.className = "card-pack-stat";
  const 組 = [
    [t("packs.coins"), c.balance],
    [t("packs.packs"), c.packs],
    [t("packs.wildNormal"), `${c.wildCards}　(${c.wildShards}/${WILD_PER})`],
    [t("packs.wildOnly"), `${c.onlyCards}　(${c.onlyShards}/${WILD_PER})`],
  ];
  for (const [名, 値] of 組) {
    const cell = document.createElement("span");
    cell.className = "card-pack-stat-cell";
    const k = document.createElement("span");
    k.className = "card-pack-stat-key";
    k.textContent = 名;
    const v = document.createElement("b");
    v.textContent = String(値);
    cell.append(k, v);
    wrap.appendChild(cell);
  }
  return wrap;
}

// ── ③ 開封 ─────────────────────────────────────────────────────────────────
function 引いた札を組む() {
  const wrap = document.createElement("div");
  wrap.className = "card-pack-row";
  for (const c of いまの引き) {
    const slot = document.createElement("div");
    slot.className = "card-pack-slot";
    if (c.rare) slot.classList.add("is-rare");

    const card = document.createElement("div");
    card.className = "card-pack-card" + (c.めくった ? " is-open" : "");
    const inner = document.createElement("div");
    inner.className = "card-pack-card-inner";
    const back = document.createElement("div");
    back.className = "card-pack-card-back";
    back.style.backgroundImage = `url("${getCardBackImagePath(null)}")`;
    const front = 札の面(c.cardId);
    front.classList.add("card-pack-card-front");
    inner.append(back, front);
    card.appendChild(inner);
    card.addEventListener("click", () => {
      if (c.めくった) return;
      c.めくった = true;
      再描画();
    });
    slot.appendChild(card);

    const label = document.createElement("div");
    label.className = "card-pack-label";
    if (c.めくった) {
      if (c.shard) {
        // 上限まで持っていた札＝欠片になった。**何になったかをその場で言う**。
        const s = document.createElement("span");
        s.className = "card-pack-shard";
        s.textContent = c.only ? t("packs.toOnlyShard") : t("packs.toShard");
        label.appendChild(s);
      } else if (c.isNew) {
        const nw = document.createElement("span");
        nw.className = "card-pack-new";
        nw.textContent = t("packs.new");
        label.appendChild(nw);
      }
      if (c.rare) {
        const mark = document.createElement("span");
        mark.className = "card-pack-rare-mark";
        mark.textContent = "✦";
        mark.title = t("packs.rare");
        label.appendChild(mark);
      }
      label.appendChild(document.createTextNode(cardDisplayName(c.cardId)));
    } else {
      label.textContent = t("packs.tapToFlip");
    }
    slot.appendChild(label);
    wrap.appendChild(slot);
  }
  return wrap;
}

// ── ④⑤ デイリー・ウィークリー ─────────────────────────────────────────────
function 節(題) {
  const h = document.createElement("div");
  h.className = "card-pack-section";
  h.textContent = 題;
  return h;
}

function デイリーの区画() {
  const c = getCollection();
  const d = c.daily;
  const box = document.createElement("div");
  box.className = "card-pack-task";
  if (!d) {
    box.appendChild(節(t("packs.daily")));
    const n = document.createElement("div");
    n.className = "card-pack-note";
    n.textContent = t("packs.needLogin");
    box.appendChild(n);
    return box;
  }
  box.appendChild(節(t("packs.daily")));
  const line = document.createElement("div");
  line.className = "card-pack-task-line";
  const text = document.createElement("span");
  text.textContent = t(`packs.challenge.${d.kind}`, { n: d.goal }) + `　${d.progress} / ${d.goal}`;
  line.appendChild(text);
  line.appendChild(bar(d.progress, d.goal));
  const 済み = d.claimed;
  const 達成 = d.progress >= d.goal;
  line.appendChild(
    ボタン(済み ? t("packs.claimed") : t("packs.claim", { n: d.reward }), async () => {
      await claimDailyChallenge();
      知らせ = t("packs.gotCoins", { n: d.reward });
    }, { 無効: 済み || !達成 })
  );
  box.appendChild(line);
  return box;
}

function bar(now, goal) {
  const outer = document.createElement("span");
  outer.className = "card-pack-bar";
  const inner = document.createElement("span");
  inner.style.width = Math.min(100, goal > 0 ? (now / goal) * 100 : 0) + "%";
  outer.appendChild(inner);
  return outer;
}

function ウィークリーの区画() {
  const c = getCollection();
  const w = c.weekly;
  const box = document.createElement("div");
  box.className = "card-pack-task";
  box.appendChild(節(t("packs.weekly")));
  if (!w) {
    const n = document.createElement("div");
    n.className = "card-pack-note";
    n.textContent = t("packs.needLogin");
    box.appendChild(n);
    return box;
  }
  const steps = Array.isArray(w.steps) ? w.steps : [];
  const 届いた = steps.filter((n) => w.wins >= n).length;
  const 次 = steps.find((n) => w.wins < n) ?? steps[steps.length - 1] ?? 0;
  const line = document.createElement("div");
  line.className = "card-pack-task-line";
  const text = document.createElement("span");
  text.textContent = t("packs.weeklyWins", { n: w.wins, next: 次 }) + "　" + steps.join(" / ");
  line.appendChild(text);
  line.appendChild(bar(w.wins, 次 || 1));
  line.appendChild(
    ボタン(t("packs.claimPacks", { n: Math.max(0, 届いた - w.claimed) }), async () => {
      await claimWeekly();
      知らせ = t("packs.gotPacks");
    }, { 無効: 届いた <= w.claimed })
  );
  box.appendChild(line);
  return box;
}

// ── ⑥ コレクション ─────────────────────────────────────────────────────────
function コレクションの区画() {
  const c = getCollection();
  const box = document.createElement("div");
  const pool = getPackPool();
  const 持っている = pool.filter((d) => (c.cards[d.id] || 0) > 0).length;
  box.appendChild(節(t("packs.collection", { n: 持っている, total: pool.length })));

  const grid = document.createElement("div");
  grid.className = "card-pack-collection";
  for (const def of pool) {
    const n = Math.min(Number(c.cards[def.id]) || 0, capOf(def));
    const cell = document.createElement("div");
    cell.className = "card-pack-cell" + (n === 0 ? " is-missing" : "");
    const face = 小さい札(def.id, "3.4rem");
    cell.appendChild(face);
    const name = document.createElement("div");
    name.className = "card-pack-cell-name";
    name.textContent = cardDisplayName(def.id);
    cell.appendChild(name);
    const cnt = document.createElement("div");
    cnt.className = "card-pack-cell-count";
    cnt.textContent = `${n} / ${capOf(def)}` + (def.only ? "　ONLY" : "");
    cell.appendChild(cnt);
    // ワイルドカードで1枚もらう。⚠ 上限まで持っている札には出さない（無駄打ちさせない）。
    const 持ちワイルド = def.only ? c.onlyCards : c.wildCards;
    if (n < capOf(def) && 持ちワイルド > 0) {
      cell.appendChild(
        ボタン(t("packs.useWildcard"), async () => {
          await redeemWildcard(def.id);
          知らせ = t("packs.wildcardUsed", { name: cardDisplayName(def.id) });
        })
      );
    }
    grid.appendChild(cell);
  }
  box.appendChild(grid);
  return box;
}

// ── 組み立て ───────────────────────────────────────────────────────────────
function 中身を組む(inner) {
  inner.textContent = "";

  if (!isCollectionReady()) {
    const n = document.createElement("div");
    n.className = "card-pack-note is-warn";
    n.textContent = t("packs.needLogin");
    inner.appendChild(n);
    return;
  }

  if (知らせ) {
    const n = document.createElement("div");
    n.className = "card-pack-note is-warn";
    n.textContent = 知らせ;
    inner.appendChild(n);
  }

  inner.appendChild(持ち物の行());

  const actions = document.createElement("div");
  actions.className = "card-pack-actions";
  const c = getCollection();
  actions.appendChild(
    ボタン(t("packs.open"), async () => {
      いまの引き = (await openPack()).map((x) => ({ ...x, めくった: false }));
    }, { 主役: true, 無効: c.packs < 1 })
  );
  actions.appendChild(
    ボタン(t("packs.buy", { n: PACK_COST }), async () => {
      await buyPacks(1);
      知らせ = t("packs.bought");
    }, { 無効: c.balance < PACK_COST })
  );
  if (いまの引き && いまの引き.some((x) => !x.めくった)) {
    actions.appendChild(
      ボタン(t("packs.flipAll"), async () => {
        for (const x of いまの引き) x.めくった = true;
      })
    );
  }
  if (管理者) {
    actions.appendChild(ボタン(t("packs.grantAll"), async () => { await adminGrantAllCards(); いまの引き = null; }));
    actions.appendChild(ボタン(t("packs.reset"), async () => { await adminResetCards(); いまの引き = null; }));
  }
  inner.appendChild(actions);

  if (いまの引き) inner.appendChild(引いた札を組む());
  else {
    const note = document.createElement("div");
    note.className = "card-pack-note";
    note.textContent = t("packs.hint", { n: PACK_SIZE, max: COPY_MAX, per: WILD_PER });
    inner.appendChild(note);
  }

  inner.appendChild(デイリーの区画());
  inner.appendChild(ウィークリーの区画());
  inner.appendChild(コレクションの区画());
}

export async function openCardPackPanel(admin) {
  管理者 = !!admin;
  if (!panel) {
    const close = () => {
      if (!panel) return;
      panel.style.display = "none";
      backdrop.style.display = "none";
    };
    backdrop = createBackdrop(close, { dim: true, zIndex: 2400, blocksGame: false });
    panel = document.createElement("div");
    panel.id = "card-pack-panel";

    const back = document.createElement("button");
    back.id = "card-pack-back";
    back.textContent = t("common.back");
    back.addEventListener("click", close);
    panel.appendChild(back);

    const title = document.createElement("div");
    title.id = "card-pack-title";
    title.textContent = t("packs.title");
    panel.appendChild(title);

    const closeX = createModalCloseX(close);
    closeX.style.position = "fixed"; // 全画面＋縦スクロールなので貼り付ける（#641 と同じ）
    panel.appendChild(closeX);

    const inner = document.createElement("div");
    inner.id = "card-pack-inner";
    panel.appendChild(inner);
    再描画 = () => 中身を組む(inner);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }
  いまの引き = null;
  知らせ = null;
  再描画();
  backdrop.style.display = "block";
  panel.style.display = "block";
  panel.scrollTop = 0;
  // 開いた時にいちど読み直す（別の端末で買っていることもある）。
  try {
    await refreshCollection();
  } catch (err) {
    知らせ = 文言にする(err);
  }
  再描画();
}
