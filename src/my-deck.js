// マイデッキ戦（マイデッキ.txtの暫定ルール）のデータ・所持・検証・保存を担う葉モジュール。
// cards-data.js以外に依存させない（online.js等を直接importするとcards-data.js側の
// 循環import／TDZの温床になるため。card-back-skins.jsと同じinject方針で永続化だけ後付けする）。
//
// v2（2026-08-11、ユーザー要望）: マイデッキを「複数」持てるようにした。1デッキ =
//   { id, name, cards:{cardId:count}, firstColor, pieceSkinIndex, petIndex, cardBackSetIndex }。
//   ファーストカードの色・駒スキン・ペット・裏面スキンもデッキごとに設定でき、マイデッキ戦では
//   その対戦の間だけプロフィール既定を上書きして使う。保存形は { decks:[...], selectedId }。
//
// 用語:
//  ・通常カード = リメイクの19種＋**パックや報酬で手に入れた札**（0th拡張・1st・限定報酬）。
//    ファースト/エターナルは対象外。
//  ・スペシャルカード = 無色(白黒)・なないろの欠片・**ONLYカード**。1枚につき非スペシャルの
//    通常カードを3枚入れる必要がある（3:1税）。🔴【2026-11-23・ユーザー裁定】ONLY も
//    スペシャル（マイデッキ戦.txt の原稿どおり。あそこには「（ONLYカードについてはまだ
//    アプリに実装されていません。）」と書いてあった＝#761 で候補に並ぶようになったので実装した）。
//  ・所持 = リメイクの19種は全員が最初から上限まで持っている。それ以外は**サーバーの持ち物**
//    （card-packs.js の copiesOf）。🔴【#761・2026-11-23】それまでは候補がリメイクの19種
//    だけで、パックで引いた札を入れられなかった。

import { NORMAL_CARDS, getCardDefinition } from "./cards-data.js";
// 🔴 下の4つは**どれも葉**（import を1つも持たない）ので、ここから取っても輪にならない。
//   とくに card-packs.js は online.js を import しない作りなので安全（あちらの冒頭を参照）。
import { EX0_NORMAL_CARDS } from "./cards-data-ex0.js"; // 0th拡張（パックから出る）
import { FIRST_ED_NORMAL_CARDS } from "./cards-data-1st.js"; // 1st EDITION（パックから出る）
import { CF_NORMAL_CARDS } from "./cards-data-cf.js"; // 志炎者7枚（限定報酬）
import { copiesOf, getCollection, COPY_MAX } from "./card-packs.js"; // 持ち物（サーバーの写し）
import { CARD_COLOR_ORDER } from "./card-sort.js"; // 色の並び（この表を2か所に書かない）
import { getCardName } from "./card-text.js"; // UI英語化フェーズ13: 表示用のカード名
import { t } from "./ui-text.js"; // UI英語化フェーズ13

// ⚠ **この表だけでスペシャルを判定しない**（ONLY カードも税の対象＝スペシャルか を使う）。
export const SPECIAL_CARD_COLORS = new Set(["white", "black", "rainbow"]);
// ファーストカード（＝駒）に選べる7色。
export const FIRST_COLORS = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];
// 🔴 【2026-11-03・ユーザー要望】**管理者アカウントだけ**、マイデッキ編集で
//   「黒のキューブ ノワール（first-noir）＋黒の駒」を選べるようにした。
//   ⚠ 7色の方（FIRST_COLORS）には**入れない**——あちらは「おまかせ」で引く抽選表でもあり、
//     混ぜると**管理者でない人にも黒が当たる**（my-deck-select.js の randomFirstColor）。
//   ⚠ 絵は assets/cards/first-noir.webp と assets/pieces/noir.webp。
//     **駒スキンの番号違いは無い**ので、黒を選んだ時はスキン番号を0に固定する
//     （noir-1.webp 等は存在せず404になる）。
export const NOIR_FIRST_COLOR = "noir";
export const ADMIN_FIRST_COLORS = [...FIRST_COLORS, NOIR_FIRST_COLOR];

// 🔴 スペシャルかどうかは**色だけでは決まらない**（ONLY カードも税の対象）。
//   ⚠ **def を受けるこちらを正にする。** cardId から引き直す形だけを置くと、
//     カードの表をそのまま見ている所（おまかせデッキ）が「色だけ見る古い判定」のまま
//     取り残される（実際そうなっていた＝下の makeRandomDeck）。
function スペシャルか(def) {
  return !!def && (SPECIAL_CARD_COLORS.has(def.color) || !!def.only);
}
export function isSpecialDeckCard(cardId) {
  return スペシャルか(getCardDefinition(cardId));
}

export const MIN_DECK_SIZE = 7;
export const MAX_SAME_NAME_COUNT = 7;
// 🔴 ONLY カード（絵の左下に ONLY と印字）は**1種類につき1枚まで**。
//   公式の山札カスタマイズルールと同じで、my-stack.js の MAX_ONLY と同じ値。
export const MAX_ONLY_COUNT = 1;
export const SPECIAL_TAX_RATIO = 3;
export const RANDOM_DECK_SIZE = 7; // おまかせ/タイムアップ時のランダムデッキ枚数

// 作成できるマイデッキの上限（ユーザー要望2026-08-12）。基本2個、ショップで+2枠を購入すると
// 増える（itemKey "mydeck-extra-slots"、100コイン）。実際の上限判定は maxDeckSlots(購入済みか)
// で行い、購入済みかどうか（isItemUnlocked）はUI側（my-deck-list.js）が渡す——このモジュールは
// online.jsに依存させない（循環import/TDZ回避）。
export const MYDECK_BASE_SLOTS = 2;
export const MYDECK_EXTRA_SLOTS = 2; // ショップ購入1回分で増える枠数
export function maxDeckSlots(hasExtraSlots) {
  return MYDECK_BASE_SLOTS + (hasExtraSlots ? MYDECK_EXTRA_SLOTS : 0);
}

// ── 候補と所持 ─────────────────────────────────────────────────────────────
// 🔴【#761・2026-11-23・ユーザー判断】**パックで手に入れた札も候補に並べる。**
//   「並べるのはユーザーが所持しているものすべてです。所持できるのは通常カードは
//     一種類につき7枚、Onlyカードは1種類につき1枚です。マイ山札の時と同じです。」
//   ⇒ ①候補＝**持っている札だけ**（リメイク19種＋パックの 0th拡張・1st＋限定報酬）
//     ②1種類の上限＝**ONLY は1枚・ほかは7枚**（my-stack.js の capFor と同じ決まり）
//   ⚠ それまでの上限は**実物に刷られている枚数**（色落ちキャット1・白/黒2）だった。
//     7枚にそろえたので**緩くなる方向**＝既にあるマイデッキが無効になることはない。
const NORMAL_BY_ID = new Map(NORMAL_CARDS.map((c) => [c.id, c]));
const DECKABLE_CARDS = [
  ...NORMAL_CARDS, ...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS, ...CF_NORMAL_CARDS,
];
const DECKABLE_BY_ID = new Map(DECKABLE_CARDS.map((c) => [c.id, c]));

// リメイクの19種は**最初から全員が上限まで持っている**（card-packs.js の copiesOf と
// 同じ決まり。ここで別の数え方をすると、コレクションの画面と枚数が食い違う）。
function 持ち物に数える札か(cardId) {
  return !NORMAL_BY_ID.has(cardId);
}
// 持ち物をサーバーから1度でも読めたか。
function 持ち物を読んだか() {
  try {
    return !!getCollection()?.読んだ;
  } catch (err) {
    return false;
  }
}

// 1種類に入れられる上限（ONLY は1枚）。
export function capForCard(cardId) {
  return DECKABLE_BY_ID.get(cardId)?.only ? MAX_ONLY_COUNT : MAX_SAME_NAME_COUNT;
}

// 🔴 **持っていなくても「マイデッキに入り得る札」なら true。**
//   normalizeDeck がこれで保存済みのデッキを濾すので、ここを所持で絞ると
//   **持ち物が届く前に読み込んだだけで、保存したデッキから札が黙って消える**。
//   所持で絞るのは getDeckableCards（画面に並べる顔ぶれ）と maxCopiesFor（枚数）の方。
export function isDeckableCard(cardId) {
  return DECKABLE_BY_ID.has(cardId);
}

// その札を何枚持っているか。
export function getOwnedCount(cardId) {
  if (!DECKABLE_BY_ID.has(cardId)) return 0;
  if (!持ち物に数える札か(cardId)) return COPY_MAX;
  // 🔴 **持ち物をまだ読めていない間は「0枚」と言わない。** 0 を返すと、サーバーの返事が
  //   届く前に、保存済みのマイデッキが一瞬「入れすぎ」で弾かれて保存できなくなる。
  if (!持ち物を読んだか()) return capForCard(cardId);
  return copiesOf(cardId, true);
}
export function maxCopiesFor(cardId) {
  return Math.min(getOwnedCount(cardId), capForCard(cardId));
}

// 画面に並べる顔ぶれ。⚠ こちらは**逆に慎重側**——持ち物を読めていない間は
//   リメイクの19種だけを出す（届いたら画面側が並べ直す＝onCardPacksChange）。
export function ownsDeckableCard(cardId) {
  if (!DECKABLE_BY_ID.has(cardId)) return false;
  if (!持ち物に数える札か(cardId)) return true;
  return 持ち物を読んだか() && copiesOf(cardId, true) > 0;
}
export function getDeckableCards() {
  return DECKABLE_CARDS.filter((c) => ownsDeckableCard(c.id)).sort(
    (a, b) => CARD_COLOR_ORDER.indexOf(a.color) - CARD_COLOR_ORDER.indexOf(b.color)
  );
}

// deck.cards（{ [cardId]: count }）を検証する。
export function validateDeck(cards) {
  const errors = [];
  let total = 0;
  let specialCount = 0;
  let nonSpecialCount = 0;
  for (const [cardId, rawCount] of Object.entries(cards || {})) {
    const count = Number(rawCount) || 0;
    if (count <= 0) continue;
    const def = getCardDefinition(cardId);
    if (!isDeckableCard(cardId)) {
      errors.push(t("md.notNormal", { name: getCardName(cardId) || def?.name || cardId }));
      continue;
    }
    const max = maxCopiesFor(cardId);
    if (count > max) errors.push(t("md.tooMany", { name: getCardName(cardId) || def.name, max, n: count }));
    total += count;
    if (isSpecialDeckCard(cardId)) specialCount += count;
    else nonSpecialCount += count;
  }
  if (total < MIN_DECK_SIZE) errors.push(t("md.tooFew", { min: MIN_DECK_SIZE, n: total }));
  const requiredNonSpecial = specialCount * SPECIAL_TAX_RATIO;
  if (nonSpecialCount < requiredNonSpecial) {
    errors.push(t("md.specialTax", { special: specialCount, required: requiredNonSpecial, n: nonSpecialCount }));
  }
  return { ok: errors.length === 0, errors, total, specialCount, nonSpecialCount, requiredNonSpecial };
}

export function deckTotal(cards) {
  let total = 0;
  for (const v of Object.values(cards || {})) total += Number(v) || 0;
  return total;
}

// ── デッキ雛形・ランダム生成 ─────────────────────────────────────────────
function uid() {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
export function makeEmptyDeck(name) {
  return {
    id: uid(),
    name: name || t("md.newDeck"),
    cards: {},
    firstColor: null, // null = 対戦開始時にランダム
    pieceSkinIndex: null, // null = プロフィール既定
    petIndex: null,
    cardBackSetIndex: null,
    mainCardId: null, // マイデッキ一覧の立体ケース表面に貼るカード（null=自動＝最多枚数のカード）
  };
}
// おまかせ/タイムアップ用: 非スペシャルの通常カードから7枚ジャスト＋ファースト色ランダム。
export function makeRandomDeck(name) {
  const deck = makeEmptyDeck(name || t("md.autoDeck"));
  const cards = {};
  for (let i = 0; i < RANDOM_DECK_SIZE; i++) {
    // まだ上限(所持/同名7)に達していない非スペシャルカードから1枚選ぶ。
    // ⚠ **持っている札から**選ぶ（NON_SPECIAL_CARDS のような決め打ちの表にしない＝#761）。
    const pool = getDeckableCards().filter(
      (c) => !スペシャルか(c) && (cards[c.id] ?? 0) < maxCopiesFor(c.id)
    );
    if (pool.length === 0) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    cards[pick.id] = (cards[pick.id] ?? 0) + 1;
  }
  deck.cards = cards;
  deck.firstColor = FIRST_COLORS[Math.floor(Math.random() * FIRST_COLORS.length)];
  return deck;
}

// ── 永続化（複数デッキのストア） ─────────────────────────────────────────
// フェーズ1は端末ローカル(localStorage)。ログイン中はアカウント(so7_user_profiles.my_deck)
// にも保存/復元する（online.js経由でregisterMyDeckPersistenceにより注入）。
const STORAGE_KEY = "so7-my-deck-v2";
const LEGACY_KEY = "so7-my-deck-v1"; // v1は単一デッキ {cardId:count} だった
let cachedStore = null;
let persistHelper = null;

export function registerMyDeckPersistence(fn) {
  persistHelper = fn;
}

function normalizeDeck(d) {
  if (!d || typeof d !== "object") return null;
  const cards = {};
  for (const [cardId, raw] of Object.entries(d.cards || {})) {
    const n = Number(raw) || 0;
    if (n > 0 && isDeckableCard(cardId)) cards[cardId] = n;
  }
  return {
    id: typeof d.id === "string" ? d.id : uid(),
    name: typeof d.name === "string" && d.name.trim() ? d.name : t("md.deck"),
    cards,
    // 🔴 黒（ノワール）も通す。**選べるのは管理者だけ**（画面側で出し分ける）が、ここで
    //   弾くと「管理者が保存した黒のデッキが、読み込み直しただけで色なしに戻る」ことになる。
    firstColor: ADMIN_FIRST_COLORS.includes(d.firstColor) ? d.firstColor : null,
    // 黒の駒はスキンの番号違いが無いので0に固定（noir-1.webp 等は存在せず404になる）。
    pieceSkinIndex:
      d.firstColor === NOIR_FIRST_COLOR ? 0 : typeof d.pieceSkinIndex === "number" ? d.pieceSkinIndex : null,
    petIndex: typeof d.petIndex === "number" ? d.petIndex : null,
    cardBackSetIndex: typeof d.cardBackSetIndex === "number" ? d.cardBackSetIndex : null,
    // メインカードは実際にデッキに入っている時だけ有効（抜けたら自動フォールバックに戻す）。
    mainCardId: typeof d.mainCardId === "string" && cards[d.mainCardId] ? d.mainCardId : null,
  };
}

// 任意の保存値（v2ストア / v1単一 / 生の{cardId:count}）を { decks, selectedId } に正規化する。
function normalizeStore(raw) {
  // v2形式
  if (raw && typeof raw === "object" && Array.isArray(raw.decks)) {
    const decks = raw.decks.map(normalizeDeck).filter(Boolean);
    const selectedId = decks.some((d) => d.id === raw.selectedId) ? raw.selectedId : decks[0]?.id ?? null;
    return { decks, selectedId };
  }
  // v1/旧: 単一の {cardId:count} → 1デッキへ移行
  if (raw && typeof raw === "object") {
    const looksLikeCards = Object.values(raw).every((v) => typeof v === "number");
    if (looksLikeCards && Object.keys(raw).length > 0) {
      const d = makeEmptyDeck(t("md.myDeck"));
      d.cards = normalizeDeck({ cards: raw }).cards;
      return { decks: [d], selectedId: d.id };
    }
  }
  return { decks: [], selectedId: null };
}

function loadStore() {
  if (cachedStore) return cachedStore;
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      cachedStore = normalizeStore(JSON.parse(rawV2));
      return cachedStore;
    }
    const rawV1 = localStorage.getItem(LEGACY_KEY);
    if (rawV1) {
      cachedStore = normalizeStore(JSON.parse(rawV1));
      persistStore(); // v2へ書き出しておく
      return cachedStore;
    }
  } catch {
    /* 破損時は空から */
  }
  cachedStore = { decks: [], selectedId: null };
  return cachedStore;
}

function persistStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStore));
  } catch {
    /* 保存不可でも編集は続けられる */
  }
  try {
    persistHelper?.({ decks: cachedStore.decks, selectedId: cachedStore.selectedId });
  } catch (err) {
    console.error("saveMyDeck persist failed", err);
  }
}

// ログイン時にアカウント保存済みのストアを流し込む（online.js経由）。
export function setMyDeckFromAccount(raw) {
  cachedStore = normalizeStore(raw);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStore));
  } catch {
    /* noop */
  }
}

// ── デッキCRUD ───────────────────────────────────────────────────────────
export function getAllDecks() {
  return loadStore().decks.map((d) => ({ ...d, cards: { ...d.cards } }));
}
export function getDeckById(id) {
  const d = loadStore().decks.find((x) => x.id === id);
  return d ? { ...d, cards: { ...d.cards } } : null;
}
export function getSelectedDeckId() {
  return loadStore().selectedId;
}
export function setSelectedDeckId(id) {
  const store = loadStore();
  if (store.decks.some((d) => d.id === id)) {
    store.selectedId = id;
    persistStore();
  }
}
// limit: 作成上限（超えていたら作らずnullを返す）。呼び出し側(UI)が maxDeckSlots(...) を渡す。
export function createDeck(name, limit = Infinity) {
  const store = loadStore();
  if (store.decks.length >= limit) return null; // 上限超過（UIが枠上限を伝える）
  const d = makeEmptyDeck(name);
  store.decks.push(d);
  store.selectedId = d.id;
  persistStore();
  return { ...d, cards: { ...d.cards } };
}
export function duplicateDeck(id, limit = Infinity) {
  const store = loadStore();
  if (store.decks.length >= limit) return null; // 上限超過
  const src = store.decks.find((d) => d.id === id);
  if (!src) return null;
  const copy = normalizeDeck({ ...src, cards: { ...src.cards } });
  copy.id = uid();
  copy.name = t("md.copyOf", { name: src.name });
  store.decks.push(copy);
  store.selectedId = copy.id;
  persistStore();
  return { ...copy, cards: { ...copy.cards } };
}
export function deleteDeck(id) {
  const store = loadStore();
  store.decks = store.decks.filter((d) => d.id !== id);
  if (store.selectedId === id) store.selectedId = store.decks[0]?.id ?? null;
  persistStore();
}
// エディタが確定したデッキ（1件）を保存する。無ければ追加、あれば置き換え。
export function saveDeck(deck) {
  const store = loadStore();
  const norm = normalizeDeck(deck);
  if (!norm) return;
  const i = store.decks.findIndex((d) => d.id === norm.id);
  if (i >= 0) store.decks[i] = norm;
  else store.decks.push(norm);
  store.selectedId = norm.id;
  persistStore();
  return { ...norm, cards: { ...norm.cards } };
}
