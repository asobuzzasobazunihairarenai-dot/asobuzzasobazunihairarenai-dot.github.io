// フレンドリーマッチの「この対局の山札」を選ぶ画面（続き743・②）。
//
// ■ ユーザー判断（続き742 の冒頭そのまま）
//   「みんなのマイ山札及び公式山札の中から部屋主が選ぶ方式でいこう！
//     そのラインナップは全プレイヤーも見れるようにしよう！
//     部屋主はランダム方式で選ぶことも選べるようにしよう！」
//
// ■ 3つの約束
//   ① **ラインナップは部屋の全員が見られる**（部屋主以外は選べないが、何が候補かは見える）
//   ② **出すか出さないかは本人が決める**（マイ山札は端末の中にしか無いので、本人が出さない
//      限り誰にも見えない＝続き742 で「預ける表」をやめた理由）
//   ③ **ランダムはサーバーが1回だけ引く**（端末で引くと理屈の上では引き直せる）
//
// ■ 公式山札は**実物の箱**で見せる（[src/deck-box-3d.js](deck-box-3d.js)）。指で回ると裏が読める。
//
// ⚠ 作り直すと箱の回転が初期化されるので、**中身が本当に変わった時だけ**組み直す
//   （`最後の指紋` の比較）。6秒ごとに見に行っているので、毎回作り直すと回せない。
//
// 🔴 **サーバーのSQL（続き742）がまだの環境では、この節ごと出さない。**
//   出して押せない物を見せるより、無い方がよい（#729 の教訓の裏返し）。

import {
  listStackOffers,
  setRoomDeckChoice,
  offerMyStackToRoom,
  withdrawMyStackFromRoom,
  isAdminUser,
} from "./online.js";
import { CARD_SETS, getCardSet } from "./card-set.js";
import { getMyStacks } from "./my-stack.js";
import { buildDeckBox3d, hasDeckBoxArt } from "./deck-box-3d.js";
import { isFlatten2dMode } from "./tablet-2d-mode.js";
import { t } from "./ui-text.js";
import { showNoticeModal } from "./ui-helpers.js";

// 公式山札（箱がある3つ）。まぜるは箱が無いので**管理者の時だけ**最後に足す。
const 公式 = [
  { set: CARD_SETS.REMAKE, key: "home.matchChoice.cardSetRemake" },
  { set: CARD_SETS.EX0, key: "home.matchChoice.cardSetEx0" },
  { set: CARD_SETS.FIRST_ED, key: "home.matchChoice.cardSet1st" },
];

function 名前(stack, i) {
  return (stack?.name || "").trim() || t("deckChoice.unnamedStack", { n: i + 1 });
}

// 選択（choice）を1行の文にする。部屋の全員に同じ文が出る。
// ⚠ 持ち主の名前は choice には入っていない（SQL が入れているのは山札の名前まで）。
//   **ラインナップ（offers）から引く**——そこには display_name が載っている。
//   引けない時（出した人が引っ込めた後など）は山札の名前だけ出す。
export function describeDeckChoice(choice, offers = []) {
  if (!choice || !choice.mode) return t("deckChoice.current.none");
  if (choice.mode === "random") {
    return choice.pending ? t("deckChoice.current.randomPending") : t("deckChoice.current.random");
  }
  if (choice.mode === "stack") {
    const o = (offers || []).find((x) => x.userId === choice.userId && x.stackKey === choice.stackKey);
    const 持ち主 = o ? (o.mine ? t("deckChoice.mine") : o.ownerName) : null;
    if (!持ち主) return t("deckChoice.current.stackNoOwner", { name: choice.name || "?" });
    return t("deckChoice.current.stack", { name: choice.name || o.name || "?", owner: 持ち主 });
  }
  const o = 公式.find((x) => x.set === choice.cardSet);
  return t("deckChoice.current.official", {
    name: o ? t(o.key) : choice.cardSet === CARD_SETS.MIXED ? t("home.matchChoice.cardSetMixed") : String(choice.cardSet || ""),
  });
}

// 節を作る。
//   gameId        … 部屋
//   onCardSetPick … 公式が選ばれた時に呼ぶ（ロビーの pendingRoomCardSet を合わせるため）
// 返り値: { el, destroy } ／ サーバーが対応していなければ el は空のまま（何も出ない）
export function buildDeckChoiceSection(gameId, { onCardSetPick = null } = {}) {
  const el = document.createElement("div");
  el.className = "deck-choice";

  let 生きている = true;
  let 最後の指紋 = null;
  let タイマー = 0;
  const 箱たち = [];
  let 平面 = false;
  try { 平面 = isFlatten2dMode(); } catch (err) { 平面 = false; }

  const 箱を片付ける = () => {
    for (const b of 箱たち) { try { b.so7Box?.destroy?.(); } catch (err) { /* 片付けで落ちても困らない */ } }
    箱たち.length = 0;
  };

  const 組み立てる = (データ) => {
    箱を片付ける();
    el.innerHTML = "";
    const { offers, choice, iamHost } = データ;

    const title = document.createElement("div");
    title.className = "deck-choice-title";
    title.textContent = t("deckChoice.title");
    el.appendChild(title);

    const 今 = document.createElement("div");
    今.className = "deck-choice-current";
    今.textContent = describeDeckChoice(choice, offers);
    el.appendChild(今);

    // ── 公式山札（箱） ──────────────────────────────────────────────
    const boxRow = document.createElement("div");
    boxRow.className = "deck-choice-boxes";
    const 一覧 = [...公式];
    let 管理者 = false;
    try { 管理者 = isAdminUser(); } catch (err) { 管理者 = false; }
    if (管理者) 一覧.push({ set: CARD_SETS.MIXED, key: "home.matchChoice.cardSetMixed" });

    for (const o of 一覧) {
      const 選ばれている = choice?.mode === "official" && choice.cardSet === o.set;
      const tile = document.createElement("div");
      tile.className = "deck-choice-box" + (選ばれている ? " is-selected" : "") + (iamHost ? " is-pickable" : "");
      tile.dataset.set = o.set;
      const 選ぶ = () => (iamHost ? 決める({ mode: "official", cardSet: o.set }) : null);

      if (hasDeckBoxArt(o.set)) {
        const box = buildDeckBox3d(o.set, { size: 76, flat: 平面, onTap: 選ぶ });
        if (box) { tile.appendChild(box); 箱たち.push(box); }
      } else {
        // 箱の絵が無いもの（まぜる）は、札だけ出す。
        const ph = document.createElement("div");
        ph.className = "deck-choice-box-placeholder";
        ph.textContent = "🎴";
        ph.addEventListener("click", 選ぶ);
        tile.appendChild(ph);
      }
      if (o.set === CARD_SETS.EX0) {
        const rib = document.createElement("span");
        rib.className = "deck-choice-box-ribbon";
        rib.textContent = t("deckChoice.expansionRibbon");
        tile.appendChild(rib);
      }
      const nm = document.createElement("div");
      nm.className = "deck-choice-box-name";
      nm.textContent = t(o.key);
      nm.addEventListener("click", 選ぶ);
      tile.appendChild(nm);
      boxRow.appendChild(tile);
    }

    // おまかせ（ランダム）。🔴 **引くのはサーバー**。ここでは「ランダムにする」と決めるだけ。
    {
      const 選ばれている = choice?.mode === "random";
      const tile = document.createElement("div");
      tile.className = "deck-choice-box is-random" + (選ばれている ? " is-selected" : "") + (iamHost ? " is-pickable" : "");
      tile.dataset.set = "random";
      const face = document.createElement("div");
      face.className = "deck-choice-box-placeholder is-dice";
      face.textContent = "🎲";
      tile.appendChild(face);
      const nm = document.createElement("div");
      nm.className = "deck-choice-box-name";
      nm.textContent = t("deckChoice.random");
      tile.appendChild(nm);
      if (iamHost) tile.addEventListener("click", () => 決める({ mode: "random" }));
      boxRow.appendChild(tile);
    }
    el.appendChild(boxRow);

    // 「回せる」と気づいてもらうための1行（2D表示では回らないので出さない）。
    if (!平面) {
      const hint = document.createElement("div");
      hint.className = "deck-choice-note";
      hint.textContent = t("deckChoice.spinHint");
      el.appendChild(hint);
    }

    // ── みんなのマイ山札 ───────────────────────────────────────────
    const sub = document.createElement("div");
    sub.className = "deck-choice-sub";
    sub.textContent = t("deckChoice.stacksTitle");
    el.appendChild(sub);

    const list = document.createElement("div");
    list.className = "deck-choice-stack-list";
    if (offers.length === 0) {
      const none = document.createElement("div");
      none.className = "deck-choice-empty";
      none.textContent = t("deckChoice.noOffers");
      list.appendChild(none);
    }
    for (const of of offers) {
      const 選ばれている =
        choice?.mode === "stack" && choice.userId === of.userId && choice.stackKey === of.stackKey;
      const row = document.createElement("div");
      row.className = "deck-choice-stack" + (選ばれている ? " is-selected" : "");
      const nm = document.createElement("span");
      nm.className = "deck-choice-stack-name";
      nm.textContent = of.name || "?";
      const who = document.createElement("span");
      who.className = "deck-choice-stack-owner";
      who.textContent = of.mine ? t("deckChoice.mine") : of.ownerName || "?";
      row.append(nm, who);
      if (iamHost) {
        const pick = document.createElement("button");
        pick.type = "button";
        pick.className = "deck-choice-mini-btn";
        pick.textContent = 選ばれている ? t("deckChoice.picked") : t("deckChoice.pick");
        pick.disabled = 選ばれている;
        pick.addEventListener("click", () =>
          決める({ mode: "stack", userId: of.userId, stackKey: of.stackKey }));
        row.appendChild(pick);
      }
      if (of.mine) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "deck-choice-mini-btn is-quiet";
        del.textContent = t("deckChoice.withdraw");
        del.addEventListener("click", async () => {
          del.disabled = true;
          try { await withdrawMyStackFromRoom(gameId, of.stackKey); } catch (err) { 知らせる(err); }
          await 読み直す(true);
        });
        row.appendChild(del);
      }
      list.appendChild(row);
    }
    el.appendChild(list);

    // 🔴 正直に書く。マイ山札で山を組むのは**サーバー（Edge Function）だけ**で、そこはまだ
    //   今までどおり標準の山を作る（続き743 の③が入るまで）。黙って効かないのが一番悪い。
    //   ⚠ ③ が本番に入ったら**この5行を消す**こと。
    const 準備中 = document.createElement("div");
    準備中.className = "deck-choice-note deck-choice-pending";
    準備中.textContent = t("deckChoice.stackNotYet");
    el.appendChild(準備中);

    // ── 自分のマイ山札を出す ───────────────────────────────────────
    const 手持ち = getMyStacks().filter((s) => Object.keys(s.recipe || {}).length > 0);
    const 出し済み = new Set(offers.filter((o) => o.mine).map((o) => o.stackKey));
    const まだ = 手持ち.map((s, i) => ({ ...s, 表示名: 名前(s, i) })).filter((s) => !出し済み.has(s.id));
    const offerBox = document.createElement("div");
    offerBox.className = "deck-choice-offer";
    if (手持ち.length === 0) {
      const hint = document.createElement("div");
      hint.className = "deck-choice-empty";
      hint.textContent = t("deckChoice.noMyStack");
      offerBox.appendChild(hint);
    } else if (まだ.length === 0) {
      const hint = document.createElement("div");
      hint.className = "deck-choice-empty";
      hint.textContent = t("deckChoice.allOffered");
      offerBox.appendChild(hint);
    } else {
      const sel = document.createElement("select");
      sel.className = "deck-choice-select";
      for (const s of まだ) {
        const op = document.createElement("option");
        op.value = s.id;
        op.textContent = s.表示名;
        sel.appendChild(op);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deck-choice-mini-btn";
      btn.textContent = t("deckChoice.offer");
      btn.addEventListener("click", async () => {
        const s = まだ.find((x) => x.id === sel.value);
        if (!s) return;
        btn.disabled = true;
        try {
          await offerMyStackToRoom(gameId, s.id, s.表示名, getCardSet(), s.recipe);
        } catch (err) {
          知らせる(err);
        }
        await 読み直す(true);
      });
      offerBox.append(sel, btn);
    }
    el.appendChild(offerBox);

    if (!iamHost) {
      const note = document.createElement("div");
      note.className = "deck-choice-note deck-choice-host-decides";
      note.textContent = t("deckChoice.hostDecides");
      el.appendChild(note);
    }
  };

  const 知らせる = (err) => {
    const 生 = err?.message || String(err || "");
    const 既知 = {
      not_in_room: t("deckChoice.err.notInRoom"),
      not_host: t("deckChoice.err.notHost"),
      already_started: t("deckChoice.err.alreadyStarted"),
      bad_recipe: t("deckChoice.err.badRecipe"),
      too_many_offers: t("deckChoice.err.tooMany"),
      offer_not_found: t("deckChoice.err.offerGone"),
    };
    const 鍵 = Object.keys(既知).find((k) => 生.includes(k));
    // 🔴 分からない時は**生の文をそのまま添える**（「失敗しました」だけでは原因に辿り着けない＝#729）。
    showNoticeModal(鍵 ? 既知[鍵] : t("deckChoice.err.unknown", { msg: 生.slice(0, 160) }));
  };

  const 決める = async (choice) => {
    try {
      await setRoomDeckChoice(gameId, choice);
      if (choice.mode === "official" && typeof onCardSetPick === "function") onCardSetPick(choice.cardSet);
    } catch (err) {
      知らせる(err);
    }
    await 読み直す(true);
  };

  const 読み直す = async (強制 = false) => {
    if (!生きている) return;
    let データ;
    try {
      データ = await listStackOffers(gameId);
    } catch (err) {
      // 🔴 SQL がまだの環境では関数が無い。**この節ごと出さない**（押せない物を見せない）。
      if (!el.childElementCount) el.classList.add("is-unavailable");
      return;
    }
    if (!生きている) return;
    el.classList.remove("is-unavailable");
    const 指紋 = JSON.stringify([データ.offers, データ.choice, データ.iamHost]);
    if (!強制 && 指紋 === 最後の指紋) return; // 箱の回転を壊さない
    最後の指紋 = 指紋;
    組み立てる(データ);
    // 公式が選ばれているなら、開始時のセットも合わせておく（部屋主の画面だけで意味がある）。
    if (データ.choice?.mode === "official" && typeof onCardSetPick === "function") {
      onCardSetPick(データ.choice.cardSet);
    }
  };

  読み直す(true);
  タイマー = setInterval(() => 読み直す(false), 6000);

  return {
    el,
    refresh: () => 読み直す(false),
    destroy: () => {
      生きている = false;
      if (タイマー) clearInterval(タイマー);
      タイマー = 0;
      箱を片付ける();
    },
  };
}
