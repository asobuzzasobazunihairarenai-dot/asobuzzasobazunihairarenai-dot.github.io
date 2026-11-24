// 🔴【2026-11-23・続き832】**エディション（使うカード）を選ぶ画面。**
//
// ユーザー指示「エディション選択画面の実装に進めましょう。**今はとりあえず管理者のみ対応で
// いいです**」。
//
// ■ それまでの形と、何が問題だったか
//   ホームの「CPU戦」の設定パネルの中に、**横1列の小さなボタンが6つ**並んでいた。
//   ⚠ 報告 #741「この選択モーダルが細々している」はまさにこの列で、スマホでは
//     単語の途中で折り返していた（続き806 で幅は直したが、**窮屈さ自体**は残っていた）。
//   ⚠ しかも箱の絵（assets/boxes）を持っているのに、ここでは**1枚も見えなかった**。
//
// ■ 作り
//   フレンドリーマッチの「この対局の山札」（deck-choice-ui.js・続き744）と**同じ形**にする。
//   あれはユーザー判断「**モーダル形式ダサいかも！画面全体が黒い半透明で覆われて、
//   そこにモーダル無しで箱が並んでみたいな画面全体でやった方がかっこよくない？**」で
//   作り直したもので、既に**見た目も作法も決まっている**。
//   ⇒ CSS は `.deck-chooser-*` を**そのまま共有**する（写しを作らない＝続き762 の教訓）。
//
// 🔴 あちらとの違い（**別のモジュールにした理由**）
//   ・あちらは**部屋（gameId）**の持ち物で、選ぶと**サーバーへ書く**（setRoomDeckChoice）。
//   ・こちらは**この端末の既定**（card-set.js の localStorage）。通信は1つも無い。
//   ⇒ 同じ関数に両方を持たせると、「部屋に居ない時に gameId が null」の分岐が全部に散る。
//
// ⚠ 選べるかどうか（管理者か）は**呼ぶ側が決める**（card-set.js と同じ作法。
//   ここで isAdminUser() を呼ぶと online.js → state.js → … と輪になりかねない）。

import { CARD_SETS, getCardSet, setCardSet } from "./card-set.js";
import { buildDeckBox3d, hasDeckBoxArt } from "./deck-box-3d.js";
import { isFlatten2dMode } from "./tablet-2d-mode.js";
import { t } from "./ui-text.js";
import { createModalCloseX } from "./ui-helpers.js";

// 公式＝**実物の箱で売られたもの**（続き744 のユーザー判断と同じ並び）。
const 公式 = [
  { set: CARD_SETS.REMAKE, key: "home.matchChoice.cardSetRemake" },
  { set: CARD_SETS.FIRST_ED, key: "home.matchChoice.cardSet1st" },
];
// 試験＝管理者のテスト用。0th拡張はブースターパックで売られた拡張、旧0thは「とりあえず
// 管理者だけ」（続き758 のユーザー判断）、まぜる・リメイク＋志炎者は試験用。
const 試験 = [
  { set: CARD_SETS.EX0, key: "home.matchChoice.cardSetEx0" },
  { set: CARD_SETS.OLD_0TH, key: "home.matchChoice.cardSet0th" },
  { set: CARD_SETS.MIXED, key: "home.matchChoice.cardSetMixed" },
  { set: CARD_SETS.REMAKE_CF, key: "home.matchChoice.cardSetRemakeCf" },
];

export function セットの名(set) {
  const o = [...公式, ...試験].find((x) => x.set === set);
  return o ? t(o.key) : String(set || "");
}

let 開いている = null;

export function closeEditionChooser() {
  if (!開いている) return;
  開いている.destroy();
  開いている = null;
}

/**
 * エディションを選ぶ画面を開く。
 * @param {object} o
 * @param {boolean} o.試験も   管理者か（試験用のセットも並べるか）
 * @param {Function} o.onChanged 選ばれた時に呼ぶ（呼ぶ側が自分の画面を描き直す）
 */
export function openEditionChooser({ 試験も = false, onChanged = null } = {}) {
  closeEditionChooser();

  const root = document.createElement("div");
  root.id = "edition-chooser";
  // 🔴 見た目は「この対局の山札」と同じ（CSS を共有する）。
  root.className = "deck-chooser";
  document.body.appendChild(root);

  const 平面 = (() => {
    try { return isFlatten2dMode(); } catch (err) { return false; }
  })();
  const 箱たち = [];
  let 生きている = true;

  const 箱を片付ける = () => {
    for (const b of 箱たち) {
      try { b.so7Box?.destroy?.(); } catch (err) { /* 片付けで落ちても困らない */ }
    }
    箱たち.length = 0;
  };
  const とじる = () => closeEditionChooser();

  const 選ぶ = (set) => {
    if (!生きている) return;
    setCardSet(set);
    // ⚠ **組み立て直さない。** 箱を作り直すと回転台が初期化され、せっかく回した向きが戻る
    //   （deck-choice-ui.js の「中身が本当に変わった時だけ組み直す」と同じ考え方）。
    置き直す();
    try { onChanged?.(set); } catch (err) { console.error("edition onChanged failed", err); }
  };

  // ── 回転台（カルーセル）─────────────────────────────────────────
  // 🔴 ユーザー案「**置く方向に円形に並んでてて左右に矢印があって、それ押すと後ろにある箱が
  //   前面に出てくる**感じはどう」。⇒ そのとおりに作った。
  //
  // ⚠ **本物の 3D の入れ子にはしない。** 箱そのものが preserve-3d の塊（6面）なので、
  //   それを回す台も preserve-3d にすると、祖先チェーン全部を preserve-3d に保つ必要があり
  //   （教訓2）、箱を指で回す操作とも喧嘩する。
  //   ⇒ **角度から x と奥行きを自分で計算して、translateX + scale で並べる**。
  //     見た目は回転台そのもので、箱の中の 3D には一切触らない。
  const 並び = [...公式, ...(試験も ? 試験 : [])];
  let 位置 = Math.max(0, 並び.findIndex((o) => o.set === getCardSet()));
  const 札たち = [];

  // 🔴【続き839】大きさは**ステージの座標**で決める（`root` は inset:0 なので 1600x900）。
  //   ユーザー報告「スマホでは全体的に箱とかいろいろ表示もっと大きくていいかも！」。
  //   それまでは `window.innerWidth / innerHeight`（＝**実画面**の px）から出していたが、
  //   この値を**ステージの px として**使っていたので、body ごとの縮小（--stage-scale）で
  //   **もう一度**小さくなっていた（実測: スマホ 932x430 で狙い134 → 画面では **64px**）。
  //   ＝#453・#569・#721・#731・#760・#796 と同じ家族で**7回目**。
  //   ⚠ ステージは窓の大きさによらず 1600x900 なので、この式は**窓を変えても動かない**
  //     （どの端末でもステージに対して同じ割合＝実画面では端末の大きさに比例する）。
  const 箱の大きさ = () => {
    const W = root.clientWidth || 1568;
    const H = root.clientHeight || 900;
    return Math.round(Math.max(190, Math.min(320, Math.min(W / 4.6, H / 3.2))));
  };

  // 角度 → 置き場所。奥（z が小さい）ほど小さく・薄く・後ろに。
  const 置き直す = () => {
    const n = 札たち.length;
    if (!n) return;
    // ⚠ 半径も**ステージの座標**で（`clientWidth` は縮む前の px、`getBoundingClientRect`
    //   は縮んだ後の px。混ぜると上と同じ二重縮小になる）。
    const 台幅 = 台 ? 台.clientWidth : root.clientWidth || 1440;
    const R = Math.min(台幅 * 0.3, 箱の大きさ() * 1.25);
    // ⚠ 枚数が少ない時に真円で並べると**真後ろ**に1枚隠れて「消えた」ように見える。
    //   1周を枚数で割るのではなく、1つあたりの角度に上限（60度）を置く。
    const 刻み = Math.min((Math.PI * 2) / n, Math.PI / 3);
    for (let k = 0; k < n; k++) {
      const 札 = 札たち[k];
      // いちばん近い向きで数える（端から端へ回る時に大回りしない）。
      let d = k - 位置;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const a = d * 刻み;
      const x = Math.sin(a) * R;
      const z = Math.cos(a); // 1 = 手前、-1 = 真後ろ
      const 倍 = 0.56 + 0.44 * ((z + 1) / 2);
      const 前 = k === 位置;
      札.el.style.transform = `translate(-50%, -50%) translateX(${Math.round(x)}px) scale(${倍.toFixed(3)})`;
      札.el.style.opacity = (0.35 + 0.65 * ((z + 1) / 2)).toFixed(3);
      札.el.style.zIndex = String(100 + Math.round(z * 100));
      札.el.classList.toggle("is-front", 前);
      // 🔴 撮って分かった: 6つ並べると**奥の札の名前が盤面の上まで散らばる**
      //   （とくに「リメイク+志炎者（各1枚・テスト用）」が長い）。2つ以上奥の名前は出さない
      //   ——前に出ている物の名前は、下に大きく出ている。
      札.el.classList.toggle("is-far", Math.abs(d) >= 2);
      札.el.classList.toggle("is-selected", getCardSet() === 札.set);
      // 🔴 前の1枚だけが「箱そのもの」を触れる（指で回す・押して選ぶ）。
      //   後ろの箱を触れるままにすると、回そうとした指で**奥の箱**を掴んでしまう。
      if (札.覆い) 札.覆い.style.display = 前 ? "none" : "block";
    }
    const いま = 並び[位置];
    if (名前の行) 名前の行.textContent = いま ? t(いま.key) : "";
    if (決めるボタン) {
      const 選択中 = いま && getCardSet() === いま.set;
      決めるボタン.textContent = 選択中 ? t("deckChoice.picked") : t("deckChoice.pick");
      決めるボタン.disabled = !!選択中;
    }
    if (いまの行) いまの行.textContent = t("edition.current", { name: セットの名(getCardSet()) });
  };

  const 回す = (向き) => {
    const n = 札たち.length;
    if (n < 2) return;
    位置 = (位置 + 向き + n) % n;
    置き直す();
  };

  let 名前の行 = null;
  let 決めるボタン = null;
  let いまの行 = null;
  let 台 = null;

  // 札1つ（箱＋名前）。位置は 置き直す() が決めるので、ここでは作るだけ。
  const 札を作る = (o, k) => {
    const el = document.createElement("div");
    el.className = "edition-carousel-item";
    el.dataset.set = o.set;

    const stage = document.createElement("div");
    stage.className = "deck-chooser-stage";
    // ⚠ 箱の絵が無いセット（いまは「リメイク＋志炎者」だけ）は札の絵で代える。
    //   ⚠ 0th拡張は deck-box-3d がリメイクの箱の絵を流用しているので、ここでは出さない
    //     （リメイクと見分けが付かない＝続き832 で撮って気づいた）。
    //   ⓘ 旧0th は続き834 で、まぜるは続き839 で箱の絵が付いた。
    const 箱を出す = hasDeckBoxArt(o.set) && o.set !== CARD_SETS.EX0;
    if (箱を出す) {
      const box = buildDeckBox3d(o.set, { size: 箱の大きさ(), flat: 平面, onTap: () => 選ぶ(o.set) });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
    } else {
      const ph = document.createElement("div");
      ph.className = "deck-chooser-dice is-plain";
      ph.textContent = "🎴";
      ph.addEventListener("click", () => 選ぶ(o.set));
      stage.appendChild(ph);
    }
    el.appendChild(stage);

    const nm = document.createElement("div");
    nm.className = "deck-chooser-name";
    nm.textContent = t(o.key);
    el.appendChild(nm);

    // 後ろの箱を押したら「前へ出す」だけ（選ばない）。前に出ている時は箱そのものに触らせる。
    const 覆い = document.createElement("div");
    覆い.className = "edition-carousel-hit";
    覆い.addEventListener("click", () => { 位置 = k; 置き直す(); });
    el.appendChild(覆い);

    札たち.push({ el, set: o.set, 覆い });
    return el;
  };

  function 組み立てる() {
    箱を片付ける();
    札たち.length = 0;
    root.innerHTML = "";

    root.appendChild(createModalCloseX(とじる));

    const title = document.createElement("div");
    title.className = "deck-chooser-title";
    title.textContent = t("edition.title");
    root.appendChild(title);

    いまの行 = document.createElement("div");
    いまの行.className = "deck-chooser-current";
    root.appendChild(いまの行);

    // ── 回転台 ───────────────────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.className = "edition-carousel";

    const 左 = document.createElement("button");
    左.type = "button";
    左.className = "edition-carousel-arrow is-left";
    左.setAttribute("aria-label", t("edition.prev"));
    左.textContent = "◀";
    左.addEventListener("click", () => 回す(-1));

    const 右 = document.createElement("button");
    右.type = "button";
    右.className = "edition-carousel-arrow is-right";
    右.setAttribute("aria-label", t("edition.next"));
    右.textContent = "▶";
    右.addEventListener("click", () => 回す(1));

    台 = document.createElement("div");
    台.className = "edition-carousel-stage";
    // ⚠ 箱の下に名前が付くので、箱の高さそのままでは足りない。1.38倍で両方入る
    //   （1.5倍にすると、字を大きくしたぶんと合わせて縦が 900 を超えて巻き取りが出る）。
    台.style.height = Math.round(箱の大きさ() * 1.38) + "px";
    並び.forEach((o, k) => 台.appendChild(札を作る(o, k)));

    wrap.append(左, 台, 右);
    root.appendChild(wrap);

    // 前に出ている物の名前と「これにする」。
    名前の行 = document.createElement("div");
    名前の行.className = "edition-carousel-title";
    root.appendChild(名前の行);

    決めるボタン = document.createElement("button");
    決めるボタン.type = "button";
    決めるボタン.className = "deck-chooser-pick";
    決めるボタン.addEventListener("click", () => {
      const いま = 並び[位置];
      if (いま) 選ぶ(いま.set);
    });
    root.appendChild(決めるボタン);

    if (!平面) {
      const hint = document.createElement("div");
      hint.className = "deck-chooser-hint";
      hint.textContent = t("deckChoice.spinHint");
      root.appendChild(hint);
    }

    const note = document.createElement("div");
    note.className = "deck-chooser-note";
    note.textContent = t("edition.note");
    root.appendChild(note);

    置き直す();
  }
  組み立てる();

  // 出口は2つ（✕ と Esc）。開いたまま固まらないようにする（pack-opening.js と同じ作法）。
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      とじる();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      回す(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      回す(1);
    }
  };
  window.addEventListener("keydown", onKey);

  開いている = {
    destroy() {
      生きている = false;
      window.removeEventListener("keydown", onKey);
      箱を片付ける();
      root.remove();
    },
  };
}
