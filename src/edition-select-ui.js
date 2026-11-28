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
// 🔴【#859・続き881】マイ山札もこの回転台に並べる（ユーザー案「使うカードを選択する画面に
//   マイ山札も並べて、このページの山札の項目は無くしたほうがいい？」⇒「全部すすめよう」）。
//   ⚠ my-stack.js は **import を1つも持たない葉**なので、ここから取っても輪にならない。
import { isMyStackEnabled, setMyStackEnabled, getMyStacks, getSelectedStackId } from "./my-stack.js";
import { buildStackBoxArt } from "./stack-box-art.js"; // マイ山札の箱の絵（続き835）
import { buildDeckBox3d, hasDeckBoxArt } from "./deck-box-3d.js";
import { buildPackBag } from "./pack-bag.js"; // 「まぜる」の箱のそばに置く 0th拡張のパック（続き840）
import { isFlatten2dMode } from "./tablet-2d-mode.js";
import { t } from "./ui-text.js";
import { createModalCloseX } from "./ui-helpers.js";

// 🔴【#859・続き881】**マイ山札の札**。CARD_SETS の値ではない合図（エディションではないので）。
//   選ばれている間は `isMyStackEnabled()` が true になり、**使うカード（枠）は今の設定のまま**
//   ——マイ山札は「色ごとの枚数の枠」を使うカードから借りて、中の内訳だけ差し替える作り
//   （cards-data.js の getDeckNormalCards）。だから2つは排他ではなく**重なる**。
//   ⇒ 画面では1つの問い（「何のカードで遊ぶか」）に見せ、内部の2つはこの1か所で面倒を見る。
export const MY_STACK_PICK = "my-stack";

// 公式＝**実物の箱で売られたもの**（続き744 のユーザー判断と同じ並び）。
// 🔴 `公開` ＝ **管理者でない人にも並べてよいか**。
//   ⚠ 1st EDITION は「公式」だが**まだ公開していない**（続き850・851 のユーザー判断
//     「旧0th を公式へ出すかはまだです」と同じ扱い）。この印を外すと、**遊んでいる人が
//     未公開の版で遊べてしまう**ので、公開の判断が出るまで付けないこと。
const 公式 = [
  { set: CARD_SETS.REMAKE, key: "home.matchChoice.cardSetRemake", 公開: true },
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

// いま選んでいるマイ山札の「箱の絵にする札」の id（無ければ空＝無地の箱）。
function 箱の絵のid() {
  try {
    const id = getSelectedStackId();
    return (getMyStacks().find((x) => x.id === id) || {}).skin || "";
  } catch (err) {
    return "";
  }
}

// マイ山札の札（名前は選んでいる山札の名前。無ければ「マイ山札」）。
function 自分の山札の札() {
  let 名 = "";
  try {
    const id = getSelectedStackId();
    名 = (getMyStacks().find((x) => x.id === id) || {}).name || "";
  } catch (err) {
    /* 読めなくても既定の名前で出す */
  }
  return { set: MY_STACK_PICK, key: "home.matchChoice.stackMine", 名, 公開: true };
}

export function セットの名(set) {
  if (set === MY_STACK_PICK) {
    const o = 自分の山札の札();
    return o.名 || t(o.key);
  }
  const o = [...公式, ...試験].find((x) => x.set === set);
  return o ? t(o.key) : String(set || "");
}

// 🔴 いま選ばれているのはどれか。**使うカードとマイ山札は重なる**ので、
//   マイ山札が入なら必ずマイ山札（使うカードは枠として裏で効き続ける）。
export function いまの選択() {
  try {
    if (isMyStackEnabled()) return MY_STACK_PICK;
  } catch (err) {
    /* 読めなければエディションの方を答える */
  }
  return getCardSet();
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
    // 🔴【#859・続き881】マイ山札を選んだら**使うカード（枠）は変えない**
    //   ——マイ山札は枠を使うカードから借りる作りなので、ここで書き換えると
    //   「マイ山札にしたらエディションまで変わった」になる。
    if (set === MY_STACK_PICK) setMyStackEnabled(true);
    else {
      setMyStackEnabled(false);
      setCardSet(set);
    }
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
  // 🔴【#859・続き881】管理者でない人には**公開済みのものと、マイ山札だけ**を並べる。
  //   ⚠ ここを「公式ぜんぶ」にすると、**未公開の 1st EDITION で遊べてしまう**（上の注）。
  const 並び = [
    ...(試験も ? [...公式, ...試験] : 公式.filter((o) => o.公開)),
    自分の山札の札(),
  ];
  let 位置 = Math.max(0, 並び.findIndex((o) => o.set === いまの選択()));
  const 札たち = [];
  const 袋たち = []; // まぜるの箱のそばに置く 0th拡張のパック（続き840）

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

  // 🔴【#821・続き847】**指に付いてくる**ための小数のずれ（1.0 ＝ 箱1つぶん）。
  //   払っている間はここが動き、離した所でいちばん近い位置へ寄せて 0 に戻す。
  let ずれ = 0;

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
    // 🔴【#821】指に付いてくる間は**小数**の位置で並べる。
    //   ⚠ 名前・ボタン・覆いのような「どれが前か」で決まる物は、**丸めた位置**で決める
    //     （小数のまま使うと、払っている途中で名前がちらつく）。
    const 見かけ = 位置 + ずれ;
    const 前の番号 = ((Math.round(見かけ) % n) + n) % n;
    for (let k = 0; k < n; k++) {
      const 札 = 札たち[k];
      // いちばん近い向きで数える（端から端へ回る時に大回りしない）。
      let d = k - 見かけ;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      const a = d * 刻み;
      const x = Math.sin(a) * R;
      const z = Math.cos(a); // 1 = 手前、-1 = 真後ろ
      const 倍 = 0.56 + 0.44 * ((z + 1) / 2);
      const 前 = k === 前の番号;
      札.el.style.transform = `translate(-50%, -50%) translateX(${Math.round(x)}px) scale(${倍.toFixed(3)})`;
      札.el.style.opacity = (0.35 + 0.65 * ((z + 1) / 2)).toFixed(3);
      札.el.style.zIndex = String(100 + Math.round(z * 100));
      札.el.classList.toggle("is-front", 前);
      // 🔴 撮って分かった: 6つ並べると**奥の札の名前が盤面の上まで散らばる**
      //   （とくに「リメイク+志炎者（各1枚・テスト用）」が長い）。2つ以上奥の名前は出さない
      //   ——前に出ている物の名前は、下に大きく出ている。
      札.el.classList.toggle("is-far", Math.abs(d) >= 2);
      札.el.classList.toggle("is-selected", いまの選択() === 札.set);
      // 🔴 前の1枚だけが「箱そのもの」を触れる（指で回す・押して選ぶ）。
      //   後ろの箱を触れるままにすると、回そうとした指で**奥の箱**を掴んでしまう。
      if (札.覆い) 札.覆い.style.display = 前 ? "none" : "block";
    }
    const いま = 並び[前の番号];
    if (名前の行) 名前の行.textContent = いま ? (いま.名 || t(いま.key)) : "";
    if (決めるボタン) {
      const 選択中 = いま && いまの選択() === いま.set;
      決めるボタン.textContent = 選択中 ? t("deckChoice.picked") : t("deckChoice.pick");
      決めるボタン.disabled = !!選択中;
    }
    if (いまの行) いまの行.textContent = t("edition.current", { name: セットの名(いまの選択()) });
  };

  // 🔴【#812・続き845】横に払った直後は、奥の箱の覆いの click を無視する。
  //   払いの終わりでも click は飛ぶので、押さないと**払っただけで別の箱へ飛ぶ**。
  let 払った時刻 = 0;

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
    // 🔴【#859・続き881】マイ山札の箱。蓋の絵は**その山札に選んである札のイラスト**（続き835）。
    //   ⚠ `buildStackBoxArt` は**カードの表に在る id だけ**を絵にする（砦。素通しにしない）。
    //   ⚠ 選んでいなければ**無地の箱**になる（top が null でも buildDeckBox3d は作る）。
    const 箱を出す = o.set !== MY_STACK_PICK && hasDeckBoxArt(o.set) && o.set !== CARD_SETS.EX0;
    if (o.set === MY_STACK_PICK) {
      const 絵 = buildStackBoxArt(箱の絵のid());
      const box = buildDeckBox3d(絵, {
        size: 箱の大きさ(),
        flat: 平面,
        onTap: () => 選ぶ(o.set),
        nameplate: o.名 || t(o.key),
      });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
    } else if (箱を出す) {
      const box = buildDeckBox3d(o.set, { size: 箱の大きさ(), flat: 平面, onTap: () => 選ぶ(o.set) });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
    } else if (o.set === CARD_SETS.EX0) {
      // 🔴【#818・続き847】0th拡張は**箱が無い**（ブースターパックで売られた拡張）。
      //   ユーザー案「**パックがたくさんな感じ**がいいかも！パック一つじゃ絶対山札
      //   作れないから笑」⇒ 袋を3つ、少しずつずらして重ねる。
      //   ⚠ 袋は開封の演出と**同じ部品**（pack-bag.js が唯一の持ち主）。封は切らない姿。
      //   ⚠ 大きさは**文書に入ってから実測**して決める（rem が何px かに頼らない）。
      const 束 = document.createElement("div");
      束.className = "edition-pack-pile";
      // 🔴 束は**箱と同じ大きさの場所**を取る。点にすると札が潰れて、名前も当たり判定も
      //   場所を失う（実測で札の矩形が 42x18 になった）。
      束.style.width = 箱の大きさ() + "px";
      束.style.height = 箱の大きさ() + "px";
      for (let i = 0; i < 3; i++) {
        const 置き = document.createElement("div");
        置き.className = "edition-pack-pile-item";
        置き.style.setProperty("--i", String(i));
        const 袋 = buildPackBag({ cards: 7, 封を切る: false });
        置き.appendChild(袋);
        束.appendChild(置き);
        袋たち.push({ 置き, 袋, 束: true });
      }
      束.addEventListener("click", () => 選ぶ(o.set));
      stage.appendChild(束);
    } else if (o.set === CARD_SETS.REMAKE_CF) {
      // 🔴【#819・続き847】ユーザー案「**リメイクの箱の周りにしえんしゃのカードがある**
      //   のはどう？」⇒ リメイクの箱を置いて、志炎者の札を扇に広げて添える。
      //   ⚠ 箱は**リメイクの絵**（このセットは「リメイク＋志炎者」なので筋が通る）。
      const box = buildDeckBox3d("remake", { size: 箱の大きさ(), flat: 平面, onTap: () => 選ぶ(o.set) });
      if (box) { stage.appendChild(box); 箱たち.push(box); }
      const 扇 = document.createElement("div");
      扇.className = "edition-cf-fan";
      扇.setAttribute("aria-hidden", "true");
      // 7色から4枚（並べすぎると小さく出した時に団子になる）。
      const 札の絵 = ["cf-red-ignis", "cf-yellow-scintilla", "cf-blue-candela", "cf-purple-favilla"];
      札の絵.forEach((id, i) => {
        const c = document.createElement("div");
        c.className = "edition-cf-card";
        c.style.setProperty("--i", String(i));
        c.style.backgroundImage = 'url("assets/cards-blank/' + id + '.webp")';
        扇.appendChild(c);
      });
      stage.appendChild(扇);
    } else {
      const ph = document.createElement("div");
      ph.className = "deck-chooser-dice is-plain";
      ph.textContent = "🎴";
      ph.addEventListener("click", () => 選ぶ(o.set));
      stage.appendChild(ph);
    }
    // 🔴【続き840】ユーザー案「**あと拡張も混ざってるので拡張パックは別で箱のそばに
    //   置いてある感じで混ぜてるのを表現するのはどう？**」。
    //   まぜるの中身は リメイク＋**0th拡張**＋1st＋旧0th だが、**0th拡張だけ箱が無い**
    //   （ブースターパックで売られた拡張）。⇒ 蓋の帯には入れず、箱の右下に袋を立てかける。
    //   ⚠ 袋は開封の演出と同じ部品（pack-bag.js が唯一の持ち主＝写しを作らない）。
    //     封は切らない＝なぞる道しるべも裂け目も出さない「置いてあるだけ」の姿。
    //   ⚠ 大きさは**実測してから**決める（rem が何px かに頼らない）。
    if (o.set === CARD_SETS.MIXED) {
      const 袋置き = document.createElement("div");
      袋置き.className = "edition-pack-beside";
      袋置き.setAttribute("aria-hidden", "true");
      const 袋 = buildPackBag({ cards: 7, 封を切る: false });
      袋置き.appendChild(袋);
      stage.appendChild(袋置き);
      // 🔴 大きさは**画面に入ってから**決める（ここではまだ文書に付いていないので
      //   offsetHeight が 0 ＝「測れたつもりで倍率が Infinity」になる）。
      袋たち.push({ 置き: 袋置き, 袋 });
    }
    el.appendChild(stage);

    const nm = document.createElement("div");
    nm.className = "deck-chooser-name";
    // ⚠ マイ山札はその山札の名前を出す（箱の名札と同じ＝どれを指しているか分かる）。
    nm.textContent = o.名 || t(o.key);
    el.appendChild(nm);

    // 後ろの箱を押したら「前へ出す」だけ（選ばない）。前に出ている時は箱そのものに触らせる。
    const 覆い = document.createElement("div");
    覆い.className = "edition-carousel-hit";
    覆い.addEventListener("click", () => {
      if (performance.now() - 払った時刻 < 350) return; // 横に払った直後（#812）
      位置 = k;
      置き直す();
    });
    el.appendChild(覆い);

    札たち.push({ el, set: o.set, 覆い });
    return el;
  };

  function 組み立てる() {
    箱を片付ける();
    札たち.length = 0;
    袋たち.length = 0;
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

    // 🔴【#812・続き845】**左右のスワイプで回す**（報告「左右のスワイプで回転しないです」）。
    //   ⚠ 前に出ている箱そのものの上では**箱を指で回す**方が勝つ（あれは箱を回す操作）。
    //     それ以外（地・奥の箱の覆い・名前）で横に払えば、回転台が回る。
    //   ⚠ `touch-action: pan-y` ——横の払いをブラウザの戻る操作に取られないため。
    //     箱そのものは自分で `none` を持っているので、そちらの回転は今までどおり。
    台.style.touchAction = "pan-y";
    // 🔴【#821・続き847】**指に付いてくる。** 報告「一瞬で次の箱にいっちゃいます。
    //   ヌルヌルはワイプに追従して欲しいです」。払っている間は小数の `ずれ` を動かして
    //   その場で並べ直し、離した所でいちばん近い位置へ寄せる（寄せる所だけ滑らせる）。
    //   ⚠ 箱1つぶんの指の動きは**台の幅の 22%**（実画面の px）。狭いと少し動かしただけで
    //     飛び、広いと重く感じる。
    let 払い = null;
    const 一歩 = () => Math.max(60, 台.getBoundingClientRect().width * 0.22);
    const 付いてくるのをやめる = () => {
      払い = null;
      台.classList.remove("is-dragging");
      if (ずれ !== 0) {
        const n = 札たち.length;
        if (n > 0) 位置 = (((位置 + Math.round(ずれ)) % n) + n) % n;
        ずれ = 0;
        置き直す();
      }
    };
    台.addEventListener("pointerdown", (e) => {
      払い = null;
      if (e.target && typeof e.target.closest === "function" && e.target.closest(".edition-carousel-item.is-front .deck-box-3d")) return;
      払い = { x: e.clientX, y: e.clientY, 横: false };
    });
    台.addEventListener("pointermove", (e) => {
      if (!払い) return;
      const dx = e.clientX - 払い.x;
      const dy = e.clientY - 払い.y;
      // 横払いだと決まるまでは何もしない（縦に動かしただけで回らないように）。
      if (!払い.横) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        払い.横 = true;
        台.classList.add("is-dragging"); // 付いてくる間は滑らせない（1対1で動かす）
      }
      ずれ = -dx / 一歩();
      置き直す();
    });
    台.addEventListener("pointerup", () => {
      if (払い && 払い.横) 払った時刻 = performance.now();
      付いてくるのをやめる();
    });
    台.addEventListener("pointercancel", 付いてくるのをやめる);

    wrap.append(左, 台, 右);
    root.appendChild(wrap);

    // 🔴 パックの大きさは**文書に入ってから実測して**決める（rem が何px かに頼らない）。
    //   ⚠ 測れなければ何もしない＝CSS の既定（--edition-pack-scale: 0.3）のまま出る。
    for (const { 置き, 袋, 束 } of 袋たち) {
      const 高 = 袋.offsetHeight;
      if (高 <= 0) continue;
      // ⚠ 束（0th拡張）は**箱の横に添える袋ではなく主役**なので、札いっぱいに置く。
      const 倍 = (箱の大きさ() * (束 ? 0.82 : 0.6)) / 高;
      置き.style.setProperty("--edition-pack-scale", 倍.toFixed(3));
      // 置き場は**袋と同じ大きさ**にする（傾けた角のぶんは外へはみ出すだけ）。
      置き.style.width = Math.round(袋.offsetWidth * 倍) + "px";
      置き.style.height = Math.round(高 * 倍) + "px";
    }

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
