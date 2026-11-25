// 🔴【2026-11-23・続き828】ブースターパックの袋。**ここが唯一の持ち主。**
//
// それまで `pack-opening.js` の中に private な `袋()` として在ったが、
// 「パックを開ける」画面の主役にも同じ袋を出すことになったので切り出した
// （ユーザー判断: 画面案B＝袋を端にドーンと置いて、左に文字を組む）。
// ⚠ **写しを作らない。** 袋は層が13枚ある（銀蒸着の虹色・熱圧着のギザギザ・切り欠き・
//   内枠・七色の筋・版の帯・下の情報帯とバーコード）ので、2か所に書くと必ず食い違う
//   （続き762・769 で同じ形を踏んでいる）。
//
// 🔴【続き842】**実物の 0th拡張 ブースターパックの版面に作り直した。**
//   ユーザー指摘「旧0thの拡張パックデザインですが、今のままだとリメイクの拡張パックの
//   デザインに見えます！旧ゼロスの拡張パックはすでに正方形のデザインがあるので
//   そちらをアレンジしてリデザインしてみて」。
//   ⇒ 袋は**正方形・白**（実物のカードが正方形なので、袋も正方形）。表の版面は
//     入稿データから焼いた assets/ui-v2/pack-0th-face.webp（tools/make-pack-face.mjs）。
//   ⚠ それまで CSS で組んでいた「内枠・七色の筋・ロゴ・0TH EDITION・BOOSTER PACK・
//     下の情報帯」は**全部やめた**（版面に焼かれている）。入り数は読み上げ用の名前に残した。
//
// 🔴 きまり（pack-opening.js から引き継いだもの。どれも実害から来ている）
//  ・**canvas は1枚も足さない。** 全画面の canvas は1枚で約23MB
//    （#441・#607 で実機が実際に落ちている）。袋の光や封は全部 CSS のグラデーション。
//    ⚠ 画像は**版面の1枚だけ**（512x512＝約1MB。カードの絵より少し大きい程度）。
//      その1枚を足した理由は tools/make-pack-face.mjs の冒頭に書いてある。
//  ・**`filter: blur()` も `backdrop-filter` も使わない**（#634・#715）。
//
// ■ 封の切れ目（続き828 で足した）
//   `--tear`（0〜1）1つで、袋の上端が**左から右へ裂けていく**。
//   ・`.pkc-seal`（閉じている部分）は `--tear` のぶん左から削られる
//   ・`.pkc-rip`（裂けた中身）が同じぶん左から現れる
//   ・`.pkc-strip` の8つの札が、通り過ぎた順に1つずつ**めくれ上がる**
//   ⇒ 指でなぞれば**なぞった所まで**裂ける（pack-opening.js が --tear を書く）。
//   ⚠ 既定は 0＝封がされたまま。「パックを開ける」画面の主役はこのまま出す。

import { t } from "./ui-text.js";

// 袋の表の版面（実物の入稿データから焼いたもの＝tools/make-pack-face.mjs）。
const FACE = "assets/ui-v2/pack-0th-face.webp";
// 🔴【#828・続き859】袋の**裏**の版面（同じ入稿データの -03。どれが裏かは11枚を並べて
//   目で決めた＝tools/make-pack-face.mjs の注）。ひっくり返す時だけ使う。
const BACK = "assets/ui-v2/pack-0th-back.webp";

// 裂け目の札の数。多いほど滑らかだが、8つで十分に「ギザギザが1つずつ起きる」と見える
// （1つ 2.5rem ＝ ギザギザの周期とだいたい合う）。
const 札の数 = 8;

/**
 * ブースターパックの袋を1つ作る。
 * @param {object} o
 * @param {number} o.cards      入り数（既定7）。読み上げ用の名前にだけ出る（版面には焼かれている）
 * @param {boolean} o.封を切る   なぞる道しるべ（光・点線・走る光・裂け目）を付けるか。
 *                              false なら**封がされたままの絵**だけ（画面の主役用）。
 * @param {boolean} o.裏も      表と裏の2面にして、指で**ひっくり返せる**ようにするか（#828）。
 *                              ⚠ 封を切る と同時には使わない——あちらは同じ指の動きで
 *                                「なぞって封を切る」を取るので、操作がぶつかる。
 */
export function buildPackBag({ cards = 7, 封を切る = true, 裏も = false } = {}) {
  const 枚 = Number(cards) > 0 ? Math.floor(Number(cards)) : 7;
  const pack = document.createElement("div");
  pack.className = "pkc-pack";

  const foil = document.createElement("div");
  foil.className = "pkc-foil";

  // 🔴 版面は**いちばん下**に置く。あとから足す光（film / sheen）と封（seal）は
  //   この上に乗らないと、ツヤが紙の下に潜って見えなくなる。
  const face = document.createElement("img");
  face.className = "pkc-face";
  face.src = FACE;
  face.alt = "";
  face.setAttribute("aria-hidden", "true");
  face.decoding = "async";
  foil.appendChild(face);

  const film = document.createElement("div"); // 包材のツヤ（虹色）
  film.className = "pkc-film";
  film.setAttribute("aria-hidden", "true");
  foil.appendChild(film);

  const sheen = document.createElement("div"); // 角度で動く光
  sheen.className = "pkc-sheen";
  sheen.setAttribute("aria-hidden", "true");
  foil.appendChild(sheen);

  const seal = document.createElement("div"); // 上端の熱圧着（ギザギザ）
  seal.className = "pkc-seal";
  seal.setAttribute("aria-hidden", "true");
  foil.appendChild(seal);

  const notch = document.createElement("div"); // 開封口の切り欠き
  notch.className = "pkc-notch";
  notch.setAttribute("aria-hidden", "true");
  foil.appendChild(notch);

  const tear = document.createElement("div");
  tear.className = "pkc-tearhere";
  tear.textContent = "TEAR HERE \u25b6";
  foil.appendChild(tear);

  // ⚠ 版面に全部焼かれているので、画面に出す要素はこれ以上足さない。
  //   入り数と商品名は**読み上げ用の名前**に残す（絵の中の字は読み上げに乗らない）。
  pack.setAttribute("role", "img");
  pack.setAttribute("aria-label", "0TH EDITION BOOSTER PACK \u2014 " + t("packs.cer.packNote", { n: 枚 }));

  // 🔴【#828・続き859】**表と裏の2面**にして、指でひっくり返せるようにする。
  //   ⚠ 回すのは **foil の外**（.pkc-flip）。foil は `overflow: hidden` を持っていて、
  //     あれは 3D を**平らに潰す**ので、foil 自身を回しても裏が出ない（教訓1・2 の家族）。
  //   ⚠ `filter` は1つも足さない（preserve-3d を潰す＝教訓1）。影は box-shadow のまま。
  if (裏も && !封を切る) {
    const flip = document.createElement("div");
    flip.className = "pkc-flip";
    const back = document.createElement("div");
    back.className = "pkc-backface";
    back.setAttribute("aria-hidden", "true");
    const bimg = document.createElement("img");
    bimg.className = "pkc-face";
    bimg.src = BACK;
    bimg.alt = "";
    bimg.decoding = "async";
    back.appendChild(bimg);
    flip.append(foil, back);
    pack.appendChild(flip);
    回せるようにする(pack, flip);
    return pack;
  }

  pack.appendChild(foil);

  // 🔴 裂け目は **foil の外**（兄弟）に置く。foil は `overflow: hidden` なので、
  //   中に入れると**めくれ上がった札が切り落とされる**（元の `.pkc-seal` が
  //   -2.2rem 上げても見えなかったのはこれ）。
  if (封を切る) pack.appendChild(裂け目());

  if (!封を切る) return pack;

  // 封を切る光（呼吸する帯＋なぞる道しるべの矢印）
  const glow = document.createElement("div");
  glow.className = "pkc-tearglow";
  glow.setAttribute("aria-hidden", "true");
  pack.appendChild(glow);

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 440 120");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("pkc-tearpath");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M20 70 C 140 18, 300 18, 420 70");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c79a47");
  path.setAttribute("stroke-width", "2.2");
  path.setAttribute("stroke-dasharray", "6 9");
  svg.appendChild(path);
  const tri = document.createElementNS(NS, "polygon");
  tri.setAttribute("points", "420,54 430,70 420,86 410,70");
  tri.setAttribute("fill", "#c79a47");
  svg.appendChild(tri);
  pack.appendChild(svg);

  // 封を切る時に左から右へ走る金の光（段が tearing になった時だけ出す）。
  const run = document.createElement("div");
  run.className = "pkc-tearrun";
  run.setAttribute("aria-hidden", "true");
  pack.appendChild(run);

  return pack;
}

// 🔴【#828・続き859】指で左右になぞると回り、離すと**いちばん近い面**（表か裏）で止まる。
//   押すだけなら 180 度ひっくり返す。
//   ⚠ 角度は**要素のインラインの style**に書く（CSS 変数1つ）。1コマごとに transform を
//     組み立て直すと、止まる時の滑りも JS で持つことになる。
//   ⚠ なぞっている間は CSS の滑りを切る（残っていると指に遅れて付いてくる＝続き847）。
//   ⚠ touch-action: none（縦スクロールに取られると途中で止まる）。CSS 側で当てている。
function 回せるようにする(pack, flip) {
  let 角 = 0;        // 度
  let つかんだ = null; // { x, 角 }
  let 動いた = 0;
  const 書く = (v, 滑る) => {
    flip.style.setProperty("--flip", v.toFixed(2) + "deg");
    flip.style.transition = 滑る ? "transform .45s cubic-bezier(.2,.8,.2,1)" : "none";
  };
  書く(0, false);
  pack.addEventListener("pointerdown", (e) => {
    つかんだ = { x: e.clientX, 角 };
    動いた = 0;
    try { pack.setPointerCapture(e.pointerId); } catch (err) {}
  });
  pack.addEventListener("pointermove", (e) => {
    if (!つかんだ) return;
    const dx = e.clientX - つかんだ.x;
    動いた = Math.max(動いた, Math.abs(dx));
    角 = つかんだ.角 + dx * 0.55;
    書く(角, false);
  });
  const 離す = () => {
    if (!つかんだ) return;
    つかんだ = null;
    // いちばん近い面（180度ごと）で止める。
    角 = Math.round(角 / 180) * 180;
    書く(角, true);
  };
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) pack.addEventListener(ev, 離す);
  pack.addEventListener("click", () => {
    // ⚠ なぞった後の click は無視する（押さないと、払っただけで余計に回る＝続き847 と同じ）。
    if (動いた > 6) { 動いた = 0; return; }
    角 += 180;
    書く(角, true);
  });
}

// 裂けた中身と、めくれ上がる札。**どちらも `--tear` だけを見て動く**
// （JS が1フレームごとに座標を書く形にすると、指を離した後の戻りまで全部 JS で持つことになる）。
function 裂け目() {
  const wrap = document.createElement("div");
  wrap.className = "pkc-rip-wrap";
  wrap.setAttribute("aria-hidden", "true");

  // 裂けて見える中身（袋の内側の暗がり＋中のカードの天）。左から現れる。
  const rip = document.createElement("div");
  rip.className = "pkc-rip";
  wrap.appendChild(rip);

  // めくれ上がる札。通り過ぎた順に1つずつ起きる（CSS の clamp が札ごとに判断する）。
  const strip = document.createElement("div");
  strip.className = "pkc-strip";
  for (let i = 0; i < 札の数; i++) {
    const seg = document.createElement("div");
    seg.className = "pkc-strip-seg";
    seg.style.setProperty("--i", String(i));
    seg.style.left = (i * 100) / 札の数 + "%";
    seg.style.width = 100 / 札の数 + "%";
    // 札ごとに少し違う傾き＝**ちぎれ方がそろわない**（そろうと折り目に見える）。
    seg.style.setProperty("--skew", (i % 3 === 0 ? -1 : i % 3 === 1 ? 1.4 : -0.6) + "");
    strip.appendChild(seg);
  }
  wrap.appendChild(strip);
  return wrap;
}

// 裂け目の進みを書く（0〜1）。pack-opening.js だけが呼ぶ。
export function setTear(pack, v) {
  if (!pack) return;
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  pack.style.setProperty("--tear", String(x));
}
