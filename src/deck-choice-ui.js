// フレンドリーマッチの「この対局の山札」（続き743 ②／続き744 で**画面全体**に作り直し）。
//
// ■ ユーザー判断（続き742 の冒頭そのまま）
//   「みんなのマイ山札及び公式山札の中から部屋主が選ぶ方式でいこう！
//     そのラインナップは全プレイヤーも見れるようにしよう！
//     部屋主はランダム方式で選ぶことも選べるようにしよう！」
//
// 🔴【続き744】ユーザー判断「**このモーダル形式ダサいかも！ 画面全体が黒い半透明でおおわれて、
//   そこにモーダル無しで箱が並んでみたいな画面全体でやった方がかっこよくない？**」⇒ そのとおり。
//   ロビーの中に押し込めると箱が小さくなり、**回して裏を読む**という一番おもしろい所が死ぬ。
//   ⇒ **2つに分けた**:
//     ① ロビーには**1行の要約**（いま何が選ばれているか＋「選ぶ」／「見る」）だけ置く
//     ② 押すと**画面全体**（黒い半透明の上に箱だけが並ぶ。枠も札も無い）
//
// 🔴【続き744】ユーザー判断「**0th拡張もこれも旧0thの拡張です。これはブースターパック形式で
//   販売されました。なのでこれは公式山札として並べなくていいです。**」
//   ⇒ 公式山札は **リメイク と 1st EDITION の2つだけ**。
//     0th拡張と「まぜる」は**管理者のテスト用**として、小さく別に出す（箱は無い）。
//
// ■ 3つの約束
//   ① **ラインナップは部屋の全員が見られる**（部屋主以外は選べないが、何が候補かは見える）
//   ② **出すか出さないかは本人が決める**（マイ山札は端末の中にしか無い＝続き742）
//   ③ **ランダムはサーバーが1回だけ引く**（端末で引くと理屈の上では引き直せる）
//
// ⚠ 作り直すと箱の回転が初期化されるので、**中身が本当に変わった時だけ**組み直す（`最後の指紋`）。
// 🔴 サーバーのSQL（続き742）がまだの環境では、**この節ごと出さない**（押せない物を見せない）。

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
import { showNoticeModal, createModalCloseX } from "./ui-helpers.js";

// 公式山札＝**実物の箱で売られたもの**だけ（続き744 のユーザー判断）。
const 公式 = [
  { set: CARD_SETS.REMAKE, key: "home.matchChoice.cardSetRemake" },
  { set: CARD_SETS.FIRST_ED, key: "home.matchChoice.cardSet1st" },
];
// 管理者のテスト用（箱は無い。0th拡張はブースターパックで売られた拡張、まぜるは試験用）。
// ⚠ 旧0th は箱で売られた版だが、**とりあえず管理者だけ**にする（ユーザー判断 2026-11-19）。
//   出してよくなったら 公式 の方へ移し、assets/boxes に箱の6面を焼く。
const 試験 = [
  { set: CARD_SETS.EX0, key: "home.matchChoice.cardSetEx0" },
  { set: CARD_SETS.OLD_0TH, key: "home.matchChoice.cardSet0th" },
  { set: CARD_SETS.MIXED, key: "home.matchChoice.cardSetMixed" },
];

function 管理者か() {
  try { return isAdminUser(); } catch (err) { return false; }
}
function 平面か() {
  try { return isFlatten2dMode(); } catch (err) { return false; }
}
function 名前(stack, i) {
  return (stack?.name || "").trim() || t("deckChoice.unnamedStack", { n: i + 1 });
}
function セットの名(set) {
  const o = [...公式, ...試験].find((x) => x.set === set);
  return o ? t(o.key) : String(set || "");
}

// 選択（choice）を1行の文にする。部屋の全員に同じ文が出る。
// ⚠ 持ち主の名前は choice には入っていない（SQL が入れているのは山札の名前まで）。
//   **ラインナップ（offers）から引く**。引けない時は山札の名前だけ出す。
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
  return t("deckChoice.current.official", { name: セットの名(choice.cardSet) });
}

// 失敗の知らせ。🔴 分からない時は**生の文をそのまま添える**（「失敗しました」だけでは
// 原因に辿り着けない＝#729 の教訓）。
function 知らせる(err) {
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
  showNoticeModal(鍵 ? 既知[鍵] : t("deckChoice.err.unknown", { msg: 生.slice(0, 160) }));
}

// ════════════════════════════════════════════════════════════════════════════
// ① ロビーに置く1行の要約
// ════════════════════════════════════════════════════════════════════════════
export function buildDeckChoiceSummary(gameId, { onCardSetPick = null } = {}) {
  const el = document.createElement("div");
  el.className = "deck-choice-summary";

  let 生きている = true;
  let タイマー = 0;
  let 最後 = null;

  const 組む = (データ) => {
    el.innerHTML = "";
    const label = document.createElement("div");
    label.className = "deck-choice-summary-label";
    label.textContent = t("deckChoice.title");
    const now = document.createElement("div");
    now.className = "deck-choice-summary-current";
    now.textContent = describeDeckChoice(データ.choice, データ.offers);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "deck-choice-summary-btn";
    btn.textContent = データ.iamHost ? t("deckChoice.open.host") : t("deckChoice.open.guest");
    btn.addEventListener("click", () => openDeckChooser(gameId, { onCardSetPick, onChanged: () => 読み直す(true) }));
    el.append(label, now, btn);
  };

  const 読み直す = async (強制 = false) => {
    if (!生きている) return;
    let データ;
    try {
      データ = await listStackOffers(gameId);
    } catch (err) {
      el.classList.add("is-unavailable"); // SQL がまだの部屋では出さない
      return;
    }
    if (!生きている) return;
    el.classList.remove("is-unavailable");
    const 指紋 = JSON.stringify([データ.choice, データ.iamHost, データ.offers.length]);
    if (!強制 && 指紋 === 最後) return;
    最後 = 指紋;
    組む(データ);
    if (データ.choice?.mode === "official" && typeof onCardSetPick === "function") {
      onCardSetPick(データ.choice.cardSet);
    }
  };

  読み直す(true);
  タイマー = setInterval(() => 読み直す(false), 6000);

  return {
    el,
    refresh: () => 読み直す(true),
    destroy: () => {
      生きている = false;
      if (タイマー) clearInterval(タイマー);
      タイマー = 0;
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ② 画面全体の選び場
// ════════════════════════════════════════════════════════════════════════════
let 開いている = null;

export function closeDeckChooser() {
  if (!開いている) return;
  開いている.destroy();
  開いている = null;
}

export function openDeckChooser(gameId, { onCardSetPick = null, onChanged = null } = {}) {
  closeDeckChooser();

  const root = document.createElement("div");
  root.id = "deck-chooser";
  root.className = "deck-chooser";
  // ⚠ 置き場所: ロビー(2200)より手前・オプションの帯(2700)より後ろ（続き75 の並びを壊さない。
  //   続き734 で「開く元より下に居て後ろに開く」をやったばかり）。CSS に書いてある。
  document.body.appendChild(root);
  // 🔴 開いている間はロビーを隠す（半透明なので、隠さないと文字が重なって読めない）。
  document.body.classList.add("is-deck-chooser-open");

  const 平面 = 平面か();
  const 箱たち = [];
  let 生きている = true;
  let タイマー = 0;
  let 最後の指紋 = null;

  const 箱を片付ける = () => {
    for (const b of 箱たち) { try { b.so7Box?.destroy?.(); } catch (err) { /* 片付けで落ちても困らない */ } }
    箱たち.length = 0;
  };

  const とじる = () => { closeDeckChooser(); };

  const 決める = async (choice) => {
    try {
      await setRoomDeckChoice(gameId, choice);
      if (choice.mode === "official" && typeof onCardSetPick === "function") onCardSetPick(choice.cardSet);
    } catch (err) {
      知らせる(err);
    }
    await 読み直す(true);
    try { onChanged?.(); } catch (err) { /* 呼び先で落ちてもこちらは続ける */ }
  };

  // ── 箱1つぶんの札 ──────────────────────────────────────────────────
  const 箱の札 = (set, 名, { 選ばれている, 選べる, しるし = null }) => {
    const item = document.createElement("div");
    item.className = "deck-chooser-item" + (選ばれている ? " is-selected" : "") + (選べる ? " is-pickable" : "");
    item.dataset.set = set;
    const 選ぶ = () => (選べる ? 決める(set === "random" ? { mode: "random" } : { mode: "official", cardSet: set }) : null);

    const stage = document.createElement("div");
    stage.className = "deck-chooser-stage";
    if (set === "random") {
      const d = document.createElement("div");
      d.className = "deck-chooser-dice";
      d.textContent = "🎲";
      d.addEventListener("click", 選ぶ);
      stage.appendChild(d);
    } else if (hasDeckBoxArt(set)) {
      // 画面全体なので大きく出せる（ここが「回して裏を読む」の値打ち）。
      const size = Math.max(120, Math.min(220, Math.round(Math.min(window.innerWidth / 3.4, window.innerHeight / 3.4))));
      const box = buildDeckBox3d(set, { size, flat: 平面, onTap: 選ぶ });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
    } else {
      const ph = document.createElement("div");
      ph.className = "deck-chooser-dice is-plain";
      ph.textContent = "🎴";
      ph.addEventListener("click", 選ぶ);
      stage.appendChild(ph);
    }
    item.appendChild(stage);

    const nm = document.createElement("div");
    nm.className = "deck-chooser-name";
    nm.textContent = 名;
    nm.addEventListener("click", 選ぶ);
    item.appendChild(nm);

    if (しるし) {
      const s = document.createElement("span");
      s.className = "deck-chooser-mark";
      s.textContent = しるし;
      item.appendChild(s);
    }
    return item;
  };

  const 組み立てる = (データ) => {
    箱を片付ける();
    root.innerHTML = "";
    const { offers, choice, iamHost } = データ;

    root.appendChild(createModalCloseX(とじる));

    const title = document.createElement("div");
    title.className = "deck-chooser-title";
    title.textContent = t("deckChoice.title");
    root.appendChild(title);

    const now = document.createElement("div");
    now.className = "deck-chooser-current";
    now.textContent = describeDeckChoice(choice, offers);
    root.appendChild(now);

    // ── 箱の列 ─────────────────────────────────────────────────────
    const row = document.createElement("div");
    row.className = "deck-chooser-row";
    for (const o of 公式) {
      row.appendChild(箱の札(o.set, t(o.key), {
        選ばれている: choice?.mode === "official" && choice.cardSet === o.set,
        選べる: iamHost,
      }));
    }
    row.appendChild(箱の札("random", t("deckChoice.random"), {
      選ばれている: choice?.mode === "random",
      選べる: iamHost,
    }));
    root.appendChild(row);

    if (!平面) {
      const hint = document.createElement("div");
      hint.className = "deck-chooser-hint";
      hint.textContent = t("deckChoice.spinHint");
      root.appendChild(hint);
    }

    // ── みんなのマイ山札 ───────────────────────────────────────────
    const stacks = document.createElement("div");
    stacks.className = "deck-chooser-stacks";
    const sub = document.createElement("div");
    sub.className = "deck-chooser-sub";
    sub.textContent = t("deckChoice.stacksTitle");
    stacks.appendChild(sub);

    const list = document.createElement("div");
    list.className = "deck-chooser-stack-list";
    if (offers.length === 0) {
      const none = document.createElement("div");
      none.className = "deck-chooser-empty";
      none.textContent = t("deckChoice.noOffers");
      list.appendChild(none);
    }
    for (const of of offers) {
      const 選ばれている = choice?.mode === "stack" && choice.userId === of.userId && choice.stackKey === of.stackKey;
      const chip = document.createElement("div");
      chip.className = "deck-chooser-stack" + (選ばれている ? " is-selected" : "") + (iamHost ? " is-pickable" : "");
      const nm = document.createElement("span");
      nm.className = "deck-chooser-stack-name";
      nm.textContent = of.name || "?";
      const who = document.createElement("span");
      who.className = "deck-chooser-stack-owner";
      who.textContent = of.mine ? t("deckChoice.mine") : of.ownerName || "?";
      chip.append(nm, who);
      if (iamHost) chip.addEventListener("click", () => 決める({ mode: "stack", userId: of.userId, stackKey: of.stackKey }));
      if (of.mine) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "deck-chooser-mini-btn is-quiet";
        del.textContent = t("deckChoice.withdraw");
        del.addEventListener("click", async (e) => {
          e.stopPropagation(); // 札そのものを押す＝選ぶ、なので止める
          del.disabled = true;
          try { await withdrawMyStackFromRoom(gameId, of.stackKey); } catch (err) { 知らせる(err); }
          await 読み直す(true);
          try { onChanged?.(); } catch (err) { /* 呼び先で落ちてもこちらは続ける */ }
        });
        chip.appendChild(del);
      }
      list.appendChild(chip);
    }
    stacks.appendChild(list);

    // 自分のマイ山札を出す
    const 手持ち = getMyStacks().filter((s) => Object.keys(s.recipe || {}).length > 0);
    const 出し済み = new Set(offers.filter((o) => o.mine).map((o) => o.stackKey));
    const まだ = 手持ち.map((s, i) => ({ ...s, 表示名: 名前(s, i) })).filter((s) => !出し済み.has(s.id));
    const offerBox = document.createElement("div");
    offerBox.className = "deck-chooser-offer";
    if (手持ち.length === 0) {
      const hint = document.createElement("div");
      hint.className = "deck-chooser-empty";
      hint.textContent = t("deckChoice.noMyStack");
      offerBox.appendChild(hint);
    } else if (まだ.length === 0) {
      const hint = document.createElement("div");
      hint.className = "deck-chooser-empty";
      hint.textContent = t("deckChoice.allOffered");
      offerBox.appendChild(hint);
    } else {
      const sel = document.createElement("select");
      sel.className = "deck-chooser-select";
      for (const s of まだ) {
        const op = document.createElement("option");
        op.value = s.id;
        op.textContent = s.表示名;
        sel.appendChild(op);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deck-chooser-mini-btn";
      btn.textContent = t("deckChoice.offer");
      btn.addEventListener("click", async () => {
        const s = まだ.find((x) => x.id === sel.value);
        if (!s) return;
        btn.disabled = true;
        try { await offerMyStackToRoom(gameId, s.id, s.表示名, getCardSet(), s.recipe); } catch (err) { 知らせる(err); }
        await 読み直す(true);
        try { onChanged?.(); } catch (err) { /* 呼び先で落ちてもこちらは続ける */ }
      });
      offerBox.append(sel, btn);
    }
    stacks.appendChild(offerBox);
    root.appendChild(stacks);

    // ── 管理者のテスト用（箱は無い） ───────────────────────────────
    if (管理者か() && iamHost) {
      const lab = document.createElement("div");
      lab.className = "deck-chooser-sub is-test";
      lab.textContent = t("deckChoice.testOnly");
      const trow = document.createElement("div");
      trow.className = "deck-chooser-test-row";
      for (const o of 試験) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "deck-chooser-mini-btn" +
          (choice?.mode === "official" && choice.cardSet === o.set ? " is-on" : "");
        b.textContent = t(o.key);
        b.dataset.set = o.set;
        b.addEventListener("click", () => 決める({ mode: "official", cardSet: o.set }));
        trow.appendChild(b);
      }
      root.append(lab, trow);
    }

    if (!iamHost) {
      const note = document.createElement("div");
      note.className = "deck-chooser-note deck-choice-host-decides";
      note.textContent = t("deckChoice.hostDecides");
      root.appendChild(note);
    }

    const foot = document.createElement("button");
    foot.type = "button";
    foot.className = "deck-chooser-done";
    foot.textContent = t("deckChoice.done");
    foot.addEventListener("click", とじる);
    root.appendChild(foot);
  };

  const 読み直す = async (強制 = false) => {
    if (!生きている) return;
    let データ;
    try {
      データ = await listStackOffers(gameId);
    } catch (err) {
      知らせる(err);
      とじる();
      return;
    }
    if (!生きている) return;
    const 指紋 = JSON.stringify([データ.offers, データ.choice, データ.iamHost]);
    if (!強制 && 指紋 === 最後の指紋) return; // 箱の回転を壊さない
    最後の指紋 = 指紋;
    組み立てる(データ);
    if (データ.choice?.mode === "official" && typeof onCardSetPick === "function") {
      onCardSetPick(データ.choice.cardSet);
    }
  };

  // 覆いそのものを押したら閉じる（箱や札の上では閉じない）。
  root.addEventListener("click", (e) => { if (e.target === root) とじる(); });
  const キー = (e) => { if (e.key === "Escape") とじる(); };
  document.addEventListener("keydown", キー);

  読み直す(true);
  タイマー = setInterval(() => 読み直す(false), 4000);

  開いている = {
    gameId,
    destroy: () => {
      生きている = false;
      if (タイマー) clearInterval(タイマー);
      タイマー = 0;
      document.removeEventListener("keydown", キー);
      箱を片付ける();
      root.remove();
      document.body.classList.remove("is-deck-chooser-open");
    },
  };
  return 開いている;
}
