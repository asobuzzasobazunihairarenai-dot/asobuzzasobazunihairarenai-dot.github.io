// 🔴【2026-11-23・続き828】ブースターパックの袋。**ここが唯一の持ち主。**
//
// それまで `pack-opening.js` の中に private な `袋()` として在ったが、
// 「パックを開ける」画面の主役にも同じ袋を出すことになったので切り出した
// （ユーザー判断: 画面案B＝袋を端にドーンと置いて、左に文字を組む）。
// ⚠ **写しを作らない。** 袋は層が13枚ある（銀蒸着の虹色・熱圧着のギザギザ・切り欠き・
//   内枠・七色の筋・版の帯・下の情報帯とバーコード）ので、2か所に書くと必ず食い違う
//   （続き762・769 で同じ形を踏んでいる）。
//
// 🔴 きまり（pack-opening.js から引き継いだもの。どれも実害から来ている）
//  ・**新しい画像も canvas も1枚も足さない。** 全画面の canvas は1枚で約23MB
//    （#441・#607 で実機が実際に落ちている）。袋は全部 CSS のグラデーションと inline SVG。
//    商品名だけは**既にある** assets/ui-v2/logo.webp を使う。
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

// 袋の商品名。**続き706 で取り込んだ既存の素材**（新しい画像は足さない）。
const LOGO = "assets/ui-v2/logo.webp";

// 裂け目の札の数。多いほど滑らかだが、8つで十分に「ギザギザが1つずつ起きる」と見える
// （1つ 2.5rem ＝ ギザギザの周期とだいたい合う）。
const 札の数 = 8;

/**
 * ブースターパックの袋を1つ作る。
 * @param {object} o
 * @param {number} o.cards      下の情報帯に出す入り数（既定7）
 * @param {boolean} o.封を切る   なぞる道しるべ（光・点線・走る光・裂け目）を付けるか。
 *                              false なら**封がされたままの絵**だけ（画面の主役用）。
 */
export function buildPackBag({ cards = 7, 封を切る = true } = {}) {
  const 枚 = Number(cards) > 0 ? Math.floor(Number(cards)) : 7;
  const pack = document.createElement("div");
  pack.className = "pkc-pack";

  const foil = document.createElement("div");
  foil.className = "pkc-foil";

  const film = document.createElement("div"); // 銀蒸着フィルムの虹色
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

  const frame = document.createElement("div"); // 内枠
  frame.className = "pkc-innerframe";
  frame.setAttribute("aria-hidden", "true");
  foil.appendChild(frame);

  const stripe = document.createElement("div"); // 七色の筋（この商品の記号）
  stripe.className = "pkc-stripe";
  stripe.setAttribute("aria-hidden", "true");
  foil.appendChild(stripe);

  const logo = document.createElement("img");
  logo.className = "pkc-logo";
  logo.src = LOGO;
  logo.alt = "7 SHADES OF S:EVEN";
  foil.appendChild(logo);

  const ed = document.createElement("div");
  ed.className = "pkc-edition";
  ed.textContent = "0TH EDITION";
  foil.appendChild(ed);

  const bp = document.createElement("div");
  bp.className = "pkc-booster";
  bp.textContent = "BOOSTER PACK";
  foil.appendChild(bp);

  // 下の情報帯（入り数・会社名・著作権・バーコード）
  const info = document.createElement("div");
  info.className = "pkc-info";
  const left = document.createElement("div");
  const n = document.createElement("div");
  n.className = "pkc-info-n";
  const nb = document.createElement("b");
  nb.textContent = String(枚);
  const ns = document.createElement("span");
  ns.textContent = "CARDS";
  n.append(nb, ns);
  const sub = document.createElement("div");
  sub.className = "pkc-info-sub";
  sub.textContent = t("packs.cer.packNote", { n: 枚 });
  left.append(n, sub);
  const right = document.createElement("div");
  right.className = "pkc-info-right";
  const brand = document.createElement("div");
  brand.className = "pkc-brand";
  brand.textContent = "AsobuzZ";
  const cp = document.createElement("div");
  cp.className = "pkc-copy";
  cp.textContent = "\u00a92026 AsobuzZ";
  right.append(brand, cp);
  const bar = document.createElement("div");
  bar.className = "pkc-barcode";
  bar.setAttribute("aria-hidden", "true");
  const row = document.createElement("div");
  row.className = "pkc-info-row";
  row.append(left, right);
  info.append(row, bar);
  foil.appendChild(info);

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
