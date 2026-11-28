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
import { NORMAL_CARDS } from "./cards-data.js";
import { sortCardDefsByColor, CARD_COLOR_ORDER } from "./card-sort.js";
import { FIRST_ED_NORMAL_CARDS } from "./cards-data-1st.js";
import { CF_NORMAL_CARDS } from "./cards-data-cf.js"; // 志炎者7枚（限定報酬・パックには入らない）
import { getCardImagePath, getCardBackImagePath, hasNoPrintedFace, getCardDefinition } from "./cards-data.js";
import { showCardFace, paintCardFace } from "./card-face-display.js";
// 【続き737】カードにホバー（スマホは長押し）で拡大（ユーザー要望・総点検）。
import { attachCardHoverPreview } from "./card-hover-preview.js";
import { openCardNoteModal } from "./card-note-modal.js"; // 🔴【#743・続き808】タップで詳細
import { flyPacksToOpener } from "./pack-fly.js"; // 🔴【#751・続き815】受け取ったパックが飛んでいく
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
  fetchBalanceDirect,
  adminGrantAllCards,
  adminResetCards,
} from "./card-packs.js";
import { createModalCloseX, createBackdrop, setTextWithCoin, CURRENCY_ICON, showNoticeModal } from "./ui-helpers.js";
// 🔴【続き735】開封の演出（ユーザー要望「ポケポケみたいにめちゃ豪華に」）。
//   ⚠ 画面を**作り直したのではない**——引いた7枚をそのまま渡すだけで、
//     パックの画面（持ち物・コレクション）は今までどおりその後ろに残る。
import { openPackCeremony } from "./pack-opening.js";
// 🔴【続き828】主役の袋。**pack-bag.js が唯一の持ち主**（開封の演出と同じ袋）。
//   ⚠ ここではなぞらせない（封を切るのは演出の中）＝ `封を切る: false` で道しるべを出さない。
import { buildPackBag } from "./pack-bag.js";
import { t } from "./ui-text.js";

// パックに入り得る札＝**まだアプリで公開していない**0th拡張と 1st EDITION の通常カード。
// ⓘ リメイクの33種は最初から全員が上限まで持っている（標準の山札そのもの）ので入れない。
// パックから出る札（＝持ち物として数える札）。0th拡張と 1st EDITION の通常カード。
// ⚠ サーバー（so7_pack_pool）と同じ顔ぶれでなければならない。tools/check-card-packs.mjs が照合する。
export function getPackPool() {
  return [...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS];
}

// 🔴【#691・続き740】**コレクションに出す**顔ぶれ。ユーザー要望
//   「オレンジから始まってるのが気になる。紅の鉄拳からが本来？
//     あと一応リメイクのカードも並べない？コレクションっていうとあった方が良い気もする。」
//   ⇒ ①**リメイクの33種も並べる**（最初から全員が7枚ずつ持っている＝7/7 で出る。
//      「集める対象」ではないが、コレクションとしては**在るべき**）
//     ②**色の順に並べ直す**（赤→橙→黄→緑→青→桃→紫→なないろ→白→黒）。
//   ⚠ パックの**中身**（getPackPool）は1枚も変えていない——あれはサーバーの写しなので、
//     ここで顔ぶれを変えると検査が落ちる。**出す時だけ**別に組む。
//   🔴【続き779】**志炎者7枚（限定報酬）も並べる。** パックからは出ないが、
//     「持ち物として数える札」なので、コレクションには 0/7 で出るのが正しい。
export function getCollectionPool() {
  return sortCardDefsByColor([...NORMAL_CARDS, ...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS, ...CF_NORMAL_CARDS]);
}

// その札の所持枚数を**数える側**か（＝リメイクの33種のように最初から全員が持っている札ではないか）。
// 🔴【続き779】ここは `getPackPool()` では**ない**。志炎者7枚はパックから出ないが、
//   持ち物として数える札なので、パックの顔ぶれだけで判ると**持っていないのに 7/7 と出る**
//   （下の 377 行目で `COPY_MAX` に落ちるため）。**パックに入るか**と**持ち物か**は別の問い。
function 持ち物として数える札か(id) {
  return getPackPool().some((d) => d.id === id) || CF_NORMAL_CARDS.some((d) => d.id === id);
}

// 🔴【続き780】**まだ持っていない限定報酬の札は「？」で伏せて並べる**
//   （2026-11-21・ユーザー判断「お楽しみ的なノリで「？」とかで並べとくのはどう？」）。
//   ⚠ 伏せるのは**持っていない間だけ**。手に入れたら**ふつうの札として出る**。
//   ⚠ 伏せた札では、**絵・名前・拡大表示・ワイルドカードのボタンを出さない**
//     （どれか1つでも残ると中身が割れる。ワイルドカードは**そもそも効かない**ので、
//      出すと「押せるのに何も起きない」になる＝#729 の家族）。
//   ⓘ 色だけは出す——色順に並ぶ格子の中で灰色の札だけが浮くと「壊れている」ように見えるのと、
//     「7色ぶん在る」と分かること自体が、伏せたままでも楽しみになるため。
function 伏せて出す札か(def, 枚) {
  return 枚 === 0 && CF_NORMAL_CARDS.some((d) => d.id === def.id);
}

// 「？」の札。小さい札（イラスト）の代わりに置く。
function 伏せ札(def, 大きさ) {
  const el = document.createElement("div");
  el.className = "card-pack-face is-mystery";
  el.style.width = 大きさ;
  el.style.height = 大きさ;
  // ⚠ 色は CSS 変数から取る（この表を2か所に書くと必ずズレる）。
  el.style.setProperty("--mystery-color", "var(--color-" + (def.color || "red") + ", #888)");
  el.textContent = "？";
  el.setAttribute("aria-label", "？");
  return el;
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
// 🔴 最後に起きたエラーの**生の文**（診断用。管理者だけに出す）。
//   文言にした後では「うまくいきませんでした」としか分からず、原因に辿り着けない。
let 生のエラー = null;
// 表から直接読んだ残高（診断用。RPC の値と並べる）。
let 直接の残高 = null;
let 忙しい = false;
// 🔴【続き855】袋に刷ってある版の名。**袋の絵と同じもの**を出す（いまは 0th 拡張だけ）。
const PACK_EDITION = "0th edition";
// 🔴【#827・続き858】コレクションの絞り込み（この画面を開いている間だけ覚える）。
//   ⚠ localStorage には入れない——次に開いた時に**絞ったまま**だと「札が消えた」に見える。
let 絞り色 = null;   // null = すべて
let 未所持だけ = false;
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
  // 🔴【#686】生のURLを敷かない。0th拡張・1st は文字が焼かれていないので、
  //   下地をそのまま敷くと**効果欄が真っ白**になる（52枚並ぶので特に目立つ）。
  //   ⚠ ここは 3.4rem で文字は読めないので、**イラストだけ**にする
  //     （白い空欄が出ず、DOM も作らないので 52枚でも軽い）。
  paintCardFace(el, cardId, { illustOnly: true });
  el.style.backgroundSize = "cover";
  return el;
}

function ボタン(文, 中身, { 主役 = false, 無効 = false } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = 主役 ? "card-pack-open-btn" : "card-pack-sub-btn";
  // 文に {icon} が入っていれば通貨アイコンの絵に差し替える（「パックを買う（🪙100）」等）。
  setTextWithCoin(b, 文);
  b.disabled = 無効 || 忙しい;
  b.addEventListener("click", async () => {
    if (忙しい) return;
    忙しい = true;
    知らせ = null;
    再描画();
    try {
      // 【#751・続き815】押したボタンそのものを渡す（演出の出どころに要る）。
      await 中身(b);
    } catch (err) {
      知らせ = 文言にする(err);
      生のエラー = 生の文(err);
      // 🔴【#692】押して駄目だった理由は**モーダル**で出す（画面のすみの1行は見落とされる）。
      //   ⚠ 文は今までどおり画面にも残す（モーダルを閉じた後も読めるように）。
      showNoticeModal(知らせ, { 見出し: t("packs.noticeTitle") });
    } finally {
      忙しい = false;
      再描画();
    }
  });
  return b;
}

// 診断用に、返ってきた物をそのまま1本の文字列にする。
function 生の文(err) {
  if (!err) return null;
  const 組 = [err.code, err.message, err.details, err.hint]
    .filter((x) => typeof x === "string" && x);
  return 組.length ? 組.join(" | ") : String(err);
}

// サーバーが投げた理由を、プレイヤーの言葉に直す。
function 文言にする(err) {
  // Supabase/PostgREST は code・details・hint にも理由を入れる。**全部つなげて**見る
  //   （message だけ見ていて「SQL をまだ流していない」を取りこぼした）。
  const m = [err?.code, err?.message, err?.details, err?.hint, err].
    map((x) => (typeof x === "string" ? x : "")).join(" ") || String(err || "");
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

// ── ① 持ち物の数字（主役の行の中） ───────────────────────────────────────
// 🔴【続き828】画面案Bへ（ユーザー判断「案Bのがスキかも！！！」）。
//   それまでは**4つの札**（セヴル／パック／ノーマルワイルド／ONLYワイルド）を横に並べ、
//   その下に小さな袋を置いていた。実寸で撮って分かった問題が2つ:
//     ①袋が 324x452 の絵なのに **81x113 まで縮めて**置いてあり、銀蒸着の虹色も
//       「7」のロゴもバーコードも**1つも見えない**（画面の下半分は空いていた）。
//     ②4つの札と診断の行が、**いちばん押したいボタンより目立っていた**。
//   ⇒ 袋を主役にし、数字は**左の列にまとめる**。
//   ⚠ **数字は1つも落としていない**——パックとセヴルは大きい数字、ワイルド2つと欠片の
//     進みは下の小さい行（下記 持ちワイルドの行）。
//   ⚠ 4つの札の作り（.card-pack-stat*）は CSS に残してある（戻したくなった時のため）。
function 持ち物の数字() {
  const c = getCollection();
  const wrap = document.createElement("div");
  wrap.className = "card-pack-hero-nums";
  // ⚠ 「のこり1パック」のような文にしない——語順が言語で変わる。
  //   **大きい数字＋下に単位**なら、どちらの言語でも同じ形で読める（既にある鍵を使う）。
  const 組 = [
    { 値: String(c.packs), 名: t("packs.packs") },
    { 値: String(c.balance), 名: t("packs.coins"), 絵: true },
  ];
  for (const x of 組) {
    const cell = document.createElement("div");
    cell.className = "card-pack-hero-num";
    const v = document.createElement("b");
    if (x.絵) {
      const img = document.createElement("img");
      img.className = "so7-coin-icon";
      img.src = CURRENCY_ICON;
      img.alt = "";
      v.appendChild(img);
    }
    v.appendChild(document.createTextNode(x.値));
    const k = document.createElement("i");
    k.textContent = x.名;
    cell.append(v, k);
    wrap.appendChild(cell);
  }
  return wrap;
}

// ワイルドカードの持ち数と欠片の進み（小さい1行）。
// 🔴【続き855】「のこり **N** パック」。大きい札2つ（持ち物の数字）のかわり。
//   ⚠ 数字だけ大きくして、単位は小さく添える（語順が言語で変わらない形）。
function のこりの行() {
  const c = getCollection();
  const el = document.createElement("div");
  el.className = "card-pack-left";
  const 前 = document.createElement("span");
  前.className = "card-pack-left-lead";
  前.textContent = t("packs.leftLead");
  const n = document.createElement("b");
  n.textContent = String(c.packs);
  const 後 = document.createElement("span");
  後.className = "card-pack-left-unit";
  後.textContent = t("packs.packs");
  el.append(前, n, 後);
  return el;
}

function 持ちワイルドの行() {
  const c = getCollection();
  const el = document.createElement("div");
  el.className = "card-pack-wilds";
  el.textContent = t("packs.heroWilds", {
    a: c.wildCards,
    b: c.wildShards + " / " + WILD_PER,
    c: c.onlyCards,
    d: c.onlyShards + " / " + WILD_PER,
  });
  return el;
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
      if (!c.めくった) {
        c.めくった = true;
        再描画();
        return;
      }
      // 🔴【#852・続き880】報告「パック開ける時、長押しでカードの詳細見れるといいかも」。
      //   ⚠ **長押しは既に「拡大」に使っている**（続き737 でユーザー要望により入れたもの）ので、
      //     そこへ詳細を重ねると拡大が出せなくなる。
      //   ⇒ コレクションの画面とまったく同じ割り当てにする（#743・続き808）:
      //     **軽く触る＝詳細／長押し＝拡大**。めくる前のタップは今までどおり「めくる」。
      const def = getCardDefinition(c.cardId);
      const 持 = getCollection();
      openCardNoteModal(c.cardId, {
        持っている: Number(持?.cards?.[c.cardId]) || 0,
        上限: def ? capOf(def) : undefined,
        名前: cardDisplayName(c.cardId),
      });
    });
    slot.appendChild(card);
    // 🔴 **めくった後だけ**拡大を出す（裏向きのうちに中身が見えてしまっては台無し）。
    if (c.めくった) attachCardHoverPreview(card, c.cardId);

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

// ⚠【続き733】いまは呼んでいない（ホームの7色のリングへ移した）。戻せるように残してある。
function デイリーの区画() {
  const c = getCollection();
  // ⚠【#683・続き738】daily は**配列**になった（1日3つ）。この区画はもう呼んでいないが、
  //   戻した時に落ちないよう先頭の1件を見る形にしておく。
  const d = Array.isArray(c.daily) ? c.daily[0] : c.daily;
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

// ⚠【続き733】いまは呼んでいない（ホームの7色のリングへ移した）。戻せるように残してある。
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
    ボタン(t("packs.claimPacks", { n: Math.max(0, 届いた - w.claimed) }), async (btn) => {
      const 枚 = Math.max(0, 届いた - w.claimed);
      // ⚠ **押した時の位置を控える**——この後 再描画() が走ってボタンは作り直される。
      const 出どころ = btn?.getBoundingClientRect?.() ?? null;
      await claimWeekly();
      知らせ = t("packs.gotPacks");
      // 🔴【#751・続き815】**押したボタンから**「パックを開ける」所へ飛ばす
      //   （数字が増えるだけでは、手に入った物がどこへ行ったのか分からない）。
      flyPacksToOpener(出どころ, 枚);
    }, { 無効: 届いた <= w.claimed })
  );
  box.appendChild(line);
  return box;
}

// その札を何枚持っているか。**リメイクの33種は最初から全員が上限まで持っている**
// （card-packs.js の copiesOf と同じ決まり。ここで別の数え方をするとズレる）。
function 枚数(c, def) {
  if (!持ち物として数える札か(def.id)) return COPY_MAX;
  return Math.max(0, Math.floor(Number(c.cards[def.id]) || 0));
}

// ── ⑥ コレクション ─────────────────────────────────────────────────────────
// 🔴【#827・続き858】ユーザー指摘「**コレクションですが、色別のがみやすくないですか？**
//   **気のせい？ほかに見やすくなる案があれば！あとコレクションはソートや絞り込みが**
//   **あるといい？**」。
//   ⇒ 調べたら**並びは最初から色順**（getCollectionPool → sortCardDefsByColor）だった。
//     見えていなかったのは**色の手がかりが1つも無かった**から。⇒ 3つ足した:
//       ①色ごとの見出しで区切る ②札の上辺に色の帯 ③絞り込み（色・持っていないものだけ）
//   ⚠ 並べ替え（ソート）は足していない——色順はルールブックの並びで、ここを変える意味が
//     薄い。欲しくなったら「持っている順」などをここへ足す。

// 絞り込みの行。押すと**コレクションの区画だけ**を作り直す（画面全体を描き直さない＝
// 縦の位置が飛ばない）。
function 絞り込みの行() {
  const bar = document.createElement("div");
  bar.className = "card-pack-filter";
  const 作る = (色, 名) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card-pack-filter-chip" + (絞り色 === 色 ? " is-on" : "");
    if (色) {
      const dot = document.createElement("span");
      dot.className = "card-pack-filter-dot";
      dot.style.background = "var(--color-" + 色 + ")";
      b.appendChild(dot);
    }
    b.appendChild(document.createTextNode(名));
    b.title = 名;
    b.addEventListener("click", () => { 絞り色 = 色; コレクションを描き直す(); });
    return b;
  };
  bar.appendChild(作る(null, t("packs.filterAll")));
  for (const 色 of CARD_COLOR_ORDER) bar.appendChild(作る(色, t("game.color." + 色)));
  const 未 = document.createElement("button");
  未.type = "button";
  未.className = "card-pack-filter-chip is-toggle" + (未所持だけ ? " is-on" : "");
  未.textContent = t("packs.filterMissing");
  未.addEventListener("click", () => { 未所持だけ = !未所持だけ; コレクションを描き直す(); });
  bar.appendChild(未);
  return bar;
}

// ⚠ 区画だけを入れ替える。panel 全体を再描画すると、縦の位置が頭へ飛ぶ。
function コレクションを描き直す() {
  const 古 = panel && panel.querySelector("#card-pack-collection-box");
  if (!古) return;
  古.replaceWith(コレクションの区画());
}

function コレクションの区画() {
  const c = getCollection();
  const box = document.createElement("div");
  box.id = "card-pack-collection-box"; // ⚠ 絞り込みでここだけ入れ替える
  // 🔴【#691】リメイクの33種も並べる＋色の順（getCollectionPool）。
  const pool = getCollectionPool();
  const 持っている = pool.filter((d) => 枚数(c, d) > 0).length;
  box.appendChild(節(t("packs.collection", { n: 持っている, total: pool.length })));

  // 🔴【続き737】どこまで集まったかを**帯**で見せる（数字だけだと進んだ実感が出ない）。
  const prog = document.createElement("div");
  prog.className = "card-pack-progress";
  const bar = document.createElement("div");
  bar.className = "card-pack-progress-bar";
  const fill = document.createElement("div");
  fill.className = "card-pack-progress-fill";
  fill.style.width = Math.round((持っている / Math.max(1, pool.length)) * 100) + "%";
  bar.appendChild(fill);
  prog.appendChild(bar);
  const num = document.createElement("div");
  num.className = "card-pack-progress-num";
  num.textContent = 持っている + " / " + pool.length;
  prog.appendChild(num);
  box.appendChild(prog);

  box.appendChild(絞り込みの行());

  // 絞った後の顔ぶれ。⚠ **伏せ札も数に入れる**（持っていない札なので「持っていないものだけ」
  //   で出るのが自然。中身は伏せたまま）。
  const 出す = pool.filter((d) => {
    if (絞り色 && d.color !== 絞り色) return false;
    if (未所持だけ && 枚数(c, d) >= capOf(d)) return false;
    return true;
  });

  if (出す.length === 0) {
    const からっぽ = document.createElement("div");
    からっぽ.className = "card-pack-note";
    からっぽ.textContent = t("packs.filterNone");
    box.appendChild(からっぽ);
    return box;
  }

  const grid = document.createElement("div");
  grid.className = "card-pack-collection";
  // 色ごとの見出しで区切る。⚠ 色で絞っている時は見出しを出さない（1色しかないので無駄）。
  let 前の色 = null;
  for (const def of pool) {
    if (!出す.includes(def)) continue;
    if (!絞り色 && def.color !== 前の色) {
      前の色 = def.color;
      const 同色 = 出す.filter((d) => d.color === def.color);
      const h = document.createElement("div");
      h.className = "card-pack-color-head";
      const dot = document.createElement("span");
      dot.className = "card-pack-filter-dot";
      dot.style.background = "var(--color-" + def.color + ")";
      h.appendChild(dot);
      const nm = document.createElement("span");
      nm.textContent = t("game.color." + def.color);
      h.appendChild(nm);
      const cn = document.createElement("span");
      cn.className = "card-pack-color-head-num";
      cn.textContent = 同色.filter((d) => 枚数(c, d) > 0).length + " / " + 同色.length;
      h.appendChild(cn);
      grid.appendChild(h);
    }
    const n = Math.min(枚数(c, def), capOf(def));
    const 伏せる = 伏せて出す札か(def, n);
    const cell = document.createElement("div");
    cell.className = "card-pack-cell" + (n === 0 ? " is-missing" : "") + (伏せる ? " is-mystery" : "");
    // ⚠ 上辺の細い帯でその札の色を出す（色の手がかり）。色は :root の --color-* から引く
    //   （表を2か所に書かない）。知らない色なら帯を出さない。
    if (def.color) cell.style.setProperty("--cell-color", "var(--color-" + def.color + ")");
    if (伏せる) {
      // 🔴 拡大表示（attachCardHoverPreview）は**付けない**——付けると中身が割れる。
      cell.appendChild(伏せ札(def, "3.4rem"));
    } else {
      const face = 小さい札(def.id, "3.4rem");
      // 【続き737】小さすぎて読めないので、**ホバー（スマホは長押し）で拡大**できるように。
      attachCardHoverPreview(face, def.id);
      // 🔴【#743・続き808】要望「カードをタップするとカードの詳細がわかるといいかも！」
      //   ⇒ **タップで詳細の札**（大きい絵＋名前＋補足＋持っている枚数）。
      //   ⚠ ホバー（長押し）の拡大は**そのまま**。指では「軽く触る＝詳細／長押し＝拡大」になる。
      //   ⚠ **伏せ札には付けない**（ここは else の枝なので、伏せ札は通らない＝続き780・793 の
      //     「割れる道を全部塞ぐ」を守る）。
      //   ⚠ 札そのものに付ける（セル全体ではない）——セルにはワイルドカードのボタンが
      //     入ることがあり、そちらを押した時に詳細まで開くと手が止まる。
      face.style.cursor = "pointer";
      face.setAttribute("role", "button");
      face.setAttribute("tabindex", "0");
      face.addEventListener("click", () => {
        openCardNoteModal(def.id, { 持っている: n, 上限: capOf(def), 名前: cardDisplayName(def.id) });
      });
      cell.appendChild(face);
    }
    const name = document.createElement("div");
    name.className = "card-pack-cell-name";
    name.textContent = 伏せる ? "？？？" : cardDisplayName(def.id);
    cell.appendChild(name);
    const cnt = document.createElement("div");
    cnt.className = "card-pack-cell-count";
    cnt.textContent = `${n} / ${capOf(def)}` + (def.only ? "　ONLY" : "");
    cell.appendChild(cnt);
    // ワイルドカードで1枚もらう。⚠ 上限まで持っている札には出さない（無駄打ちさせない）。
    // ⚠ リメイクの33種は**最初から全員7枚**なので、ここは必ず素通りする。
    // 🔴 伏せた札には出さない。ワイルドカードはパックの札にしか効かない（サーバーが弾く）ので、
    //   出すと「押せるのに何も起きない」になる（#729 の家族）。
    const 持ちワイルド = def.only ? c.onlyCards : c.wildCards;
    if (!伏せる && n < capOf(def) && 持ちワイルド > 0) {
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

  // 🔴【続き855】右上の静かな1行。⚠ ログインしていない時は空にする（0 と出さない）。
  const 札 = panel && panel.querySelector("#card-pack-status");
  if (札) {
    札.textContent = "";
    if (isCollectionReady()) {
      const c0 = getCollection();
      setTextWithCoin(札, t("packs.statusLine", { coin: c0.balance, wild: c0.wildCards + " / " + WILD_PER }));
    }
  }
  if (!isCollectionReady()) {
    const n = document.createElement("div");
    n.className = "card-pack-note is-warn";
    n.textContent = t("packs.needLogin");
    inner.appendChild(n);
    return;
  }

  // 🔴 押した結果（うまくいった／いかなかった）を**必ず文で出す**。
  //   ユーザー報告「パックを買うを押しても何も起きません」は、ここが無かったのが半分、
  //   ボタンを disabled にしていたのが半分。
  if (忙しい || 知らせ) {
    const n = document.createElement("div");
    n.className = "card-pack-note is-warn";
    setTextWithCoin(n, 忙しい ? t("packs.working") : 知らせ);
    inner.appendChild(n);
  }

  // 🔴【続き828】主役の行（画面案B）。**本物の袋を大きく右に**置き、左に文字を組む。
  //   ⚠ 袋は開封の演出と**同じ部品**（pack-bag.js）。それまではここだけのために
  //     グラデーション4枚の小さな写しを描いていたので、見た目が別物だった。
  //   ⚠ 新しい画像は1枚も足していない（袋は CSS のグラデーションと既にあるロゴだけ）。
  const hero = document.createElement("div");
  hero.className = "card-pack-hero";
  const heroText = document.createElement("div");
  heroText.className = "card-pack-hero-text";
  // 🔴【続き855】いただいた絵の形に寄せた。小見出し → 版の名 → 一言 → のこり → ボタン。
  //   ⚠ 「BOOSTER PACK」はここに置く。**画面の見出し（#card-pack-title）側からは外した**ので、
  //     二重には並ばない（続き828 で踏んだ所）。
  const eyebrow = document.createElement("div");
  eyebrow.className = "card-pack-hero-eyebrow";
  eyebrow.textContent = "BOOSTER PACK";
  heroText.appendChild(eyebrow);
  // ⚠ 版の名は**袋に刷ってあるもの**と同じ（いまは 0th 拡張のパックしか無い）。
  //   セットが増えたら、ここを持ち物の中身から決める。
  const edition = document.createElement("div");
  edition.className = "card-pack-hero-edition";
  edition.textContent = PACK_EDITION;
  heroText.appendChild(edition);
  const lead = document.createElement("div");
  lead.className = "card-pack-lead";
  lead.textContent = t("packs.heroLead", { n: PACK_SIZE });
  heroText.appendChild(lead);
  heroText.appendChild(のこりの行());

  const actions = document.createElement("div");
  actions.className = "card-pack-actions";
  const c = getCollection();
  // 🔴 **ボタンは disabled にしない。** 押せないと「何も起きない」としか見えず、
  //   理由が分からない（ユーザー報告の形）。押せるようにして、足りなければ
  //   サーバーが返す理由（no_pack / insufficient_balance）を文で出す。
  actions.appendChild(
    ボタン(t("packs.openSeal"), async () => {
      const 引いた = await openPack();
      // 🔴【続き735】引いたら**演出に渡す**（試作の3段構え: 封を切る→めくれる→1枚ずつ）。
      //   ⚠ 一覧（いまの引き）は**残したまま**にする——演出を途中で閉じても、
      //     後ろのこの画面に7枚が並んでいるので「何が出たのか分からない」にならない。
      //   ⚠ 演出では**全部めくった状態**にしておく（演出でもう見ているので、
      //     後ろの一覧で裏向きから押し直させるのは二度手間）。
      いまの引き = 引いた.map((x) => ({ ...x, めくった: true }));
      openPackCeremony(引いた, { onDone: () => 再描画() });
    }, { 主役: true })
  );
  actions.appendChild(
    ボタン(t("packs.buy", { n: PACK_COST }), async () => {
      await buyPacks(1);
      知らせ = t("packs.bought");
    })
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
  heroText.appendChild(actions);

  // 押す前に「いま押しても無理な理由」を書いておく（押してから知らせるより親切）。
  const 理由 = [];
  if (c.packs < 1) 理由.push(t("packs.whyNoPack"));
  if (c.balance < PACK_COST) 理由.push(t("packs.whyNoCoins", { n: PACK_COST - c.balance }));
  if (理由.length) {
    const w = document.createElement("div");
    w.className = "card-pack-why";
    setTextWithCoin(w, 理由.join("　/　"));
    heroText.appendChild(w);
  }
  heroText.appendChild(持ちワイルドの行());
  hero.appendChild(heroText);
  // 🔴 袋は**文字より後ろ**に足す（DOM順＝重なり順。袋を先に置くと、傾いた角が
  //   ボタンの上に乗って押せなくなる＝教訓3 の家族）。
  const bag = document.createElement("div");
  bag.className = "card-pack-bag";
  bag.setAttribute("aria-hidden", "true"); // 絵（中身は左の文字が全部言っている）
  // 🔴【#828・続き859】ユーザー案「パックもクルクル回せるといい？」⇒ 指でひっくり返せる。
  bag.appendChild(buildPackBag({ cards: PACK_SIZE, 封を切る: false, 裏も: true }));
  hero.appendChild(bag);
  inner.appendChild(hero);

  if (いまの引き) inner.appendChild(引いた札を組む());
  else {
    // 🔴【#856・続き880】ユーザー案「細々した説明はiまーくとかで隠す？」。
    //   あの3行は**初めての人には要るが、2回目からは邪魔**で、しかもいちばん押したい
    //   「封を切る」より下に長く居座っていた。⇒ **ⓘ の中へ畳む**（押した時だけ開く）。
    //   ⚠ 消すのではなく畳む（#729 の家族＝説明へ辿れなくならない）。
    //   ⚠ 文は1文字も変えていない。
    //   ⚠ 見た目は絞り込みの札（.card-pack-filter-chip）と同じ規則を借りる
    //     ——あちらは明暗2テーマの色を持っているので、ここで色を決め打ちしないで済む。
    const 畳み = document.createElement("div");
    畳み.className = "card-pack-hint-fold";
    const 開く = document.createElement("button");
    開く.type = "button";
    開く.className = "card-pack-filter-chip card-pack-hint-toggle";
    開く.setAttribute("aria-expanded", "false");
    開く.textContent = t("packs.hintToggle");
    const note = document.createElement("div");
    note.className = "card-pack-note card-pack-hint-body";
    note.hidden = true;
    note.textContent = t("packs.hint", { n: PACK_SIZE, max: COPY_MAX, per: WILD_PER });
    開く.addEventListener("click", () => {
      note.hidden = !note.hidden;
      開く.setAttribute("aria-expanded", note.hidden ? "false" : "true");
    });
    畳み.append(開く, note);
    inner.appendChild(畳み);
  }

  // 🔴【続き733】ユーザー判断「**パックを開けるページにデイリーチャレンジやウィークリーは
  //   不要です。これらはホームに表示しよう。**」⇒ ここからは外した（ホームの7色のリングへ）。
  //   ⚠ 組み立てる関数（デイリーの区画／ウィークリーの区画）は**消していない**——
  //     戻したくなったらこの2行を足すだけ。
  inner.appendChild(コレクションの区画());

  // 🔴【#815・#816・続き846】診断の行（**管理者だけ**）。「0 と出るが実際は違う」のような時に
  //   **何が返ってきたか**を見るためのもの（続き737）。
  //   ⚠ それまで**画面のいちばん上**（主役の行より前）に出ていたので、開いた瞬間に
  //     目に入るのがこの行だった（報告「このページの 診断よめた とかの表示はなんですか？」
  //     「パックを開ける画面ってオシャレにするんじゃなかったっけ？」）。⇒ **いちばん下**へ。
  //   ⚠ 消さない——残高の食い違いを調べる時に効く。かわりに**自分で名乗る**。
  if (管理者) {
    const c2 = getCollection();
    const d = document.createElement("div");
    d.className = "card-pack-diag";
    d.textContent =
      "［管理者だけに出ています］診断: 読めた=" + (c2.読んだ ? "はい" : "いいえ") +
      " / セヴル(RPC)=" + c2.balance + " / セヴル(表から直接)=" + (直接の残高 === null ? "?" : 直接の残高) +
      " / パック=" + c2.packs + " / カード=" + Object.keys(c2.cards).length + "種" +
      (生のエラー ? " / 最後のエラー: " + 生のエラー : "");
    inner.appendChild(d);
  }
}

export async function openCardPackPanel(admin) {
  管理者 = !!admin;
  // ⚠ 開くたびに絞りを戻す（前に絞ったままだと「札が消えた」に見える）。
  絞り色 = null;
  未所持だけ = false;
  if (!panel) {
    const close = () => {
      if (!panel) return;
      panel.style.display = "none";
      backdrop.style.display = "none";
    };
    // 【続き734】パネル(2663)と一緒に上げる。
    backdrop = createBackdrop(close, { dim: true, zIndex: 2662, blocksGame: false });
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

    // 🔴【続き855】右上の静かな1行（セヴル・ワイルド）。大きい札2つのかわり。
    //   ⚠ 中身は 再描画() が書き換える（ここでは殻だけ）。
    const status = document.createElement("div");
    status.id = "card-pack-status";
    panel.appendChild(status);

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
    生のエラー = null;
  } catch (err) {
    知らせ = 文言にする(err);
    生のエラー = 生の文(err);
  }
  // 🔴 表からも直接読む（RPC と食い違ったら、どちらが悪いかが1回で分かる）。
  if (管理者) 直接の残高 = await fetchBalanceDirect();
  再描画();
}
