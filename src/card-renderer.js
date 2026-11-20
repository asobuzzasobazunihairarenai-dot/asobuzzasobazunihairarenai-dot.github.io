// アプリ内でカードを「テキスト無しブランク画像＋アプリ側テキスト」で組み立てるレンダラ。
// ユーザー合意: 枠・仕切り線の装飾・イラスト・エンブレム・色枠は画像（assets/cards-blank/）が
// 持ち、タイトル・効果文・フレーバー・能力名などの「テキストだけ」をアプリが重ねて表示する。
// これにより効果文の修正が全表示へ即反映でき、将来の多言語化もテキスト差し替えだけで済む。
//
// カードは3レイアウトで別物（ユーザー指摘「ファーストはまたデザインが異なる」）:
//  - normal : フレーバー(上) ＋ 下部に タイトル＋●到達＋■手札（下パネル領域に重ねる）
//  - eternal: フレーバー(上) ＋ 下部に タイトル＋★基本＋■手札（能力名《》は■文にインライン）
//  - first  : ★基本(上) ＋ タイトル(中上) ＋ 《能力名》(中) ＋ ■手札(下)。イラスト無し・エンブレム中心。
// 効果セクションを仕切る「おしゃれな横線」はアプリ側（CSS）で描く（ユーザー依頼）。
//
// テキストの元データは src/card-text.js（カード効果　テキスト.txt から生成、印字カードと一致）。
// ★基本 / ●到達 / Θ効果名(subtitle) / ■手札 / Ωフレーバー。

import { getCardDefinition, getCardBlankPath } from "./cards-data.js";
import { getCardText, getCardName } from "./card-text.js";
import { getLang } from "./i18n.js";
import { LAYOUT, cardTypeOf, groupOf, shapeHalfWidthAt } from "./card-layout-config.js";
import { splitUnderlineRuns, splitLeadingIcon } from "./card-text-markup.js";
// 【続き773】色者の円盤を絵の上に重ねる（絵に焼かずに重ねる＝ユーザー判断）。
import { SHIKIJA_DIAL_SRC, hasShikijaDial } from "./shikija-dial.js";
// 【続き774】枠から色名を抜いた札は、色名＋ONLY をこちらが文字で組んで置く。
import { buildOnlyMark, CARDS_WITH_TYPESET_COLOR_NAME } from "./only-mark.js";

// 能力名《》・マーカー等の色味には単色を使う（color-mix/border-color はグラデーション不可）。
const SOLID_ACCENT = {
  red: "#c70025", orange: "#ee781f", yellow: "#fabe00", green: "#22ac38",
  blue: "#1bb8ce", pink: "#f19ec2", purple: "#915da3",
  rainbow: "#b07cc6", white: "#c9c0a8", black: "#3a3a44", noir: "#3a3a44",
};
function accentFor(color) { return SOLID_ACCENT[color] || "#888888"; }

// セクション本文（\n区切り。"・"始まりの行は選択肢）を行要素にする。
function buildLines(text) {
  const frag = document.createDocumentFragment();
  for (const 生行 of String(text || "").split("\n").filter((s) => s.length > 0)) {
    // 🔴【続き774】行頭の `{白}` `{黒}` は**絵の印**（印刷の【色者】と同じ）。
    //   印が無ければ line は元のままなので、**今までと1文字も変わらない**。
    const { icon, label, text: line } = splitLeadingIcon(生行);
    const div = document.createElement("div");
    div.className = line.startsWith("・") ? "card-face-subline" : "card-face-textline";
    if (icon) {
      div.classList.add("has-lineicon");
      const im = document.createElement("span");
      im.className = "card-face-lineicon";
      im.style.backgroundImage = "url(\"" + icon + "\")";
      // ⚠ 絵は読み上げに乗らないので、字を持たせる（「白」「黒」）。
      im.setAttribute("role", "img");
      im.setAttribute("aria-label", label);
      div.appendChild(im);
    }
    // 🔴【続き762】文の中の `__…__` は**下線**（印字のカードが下線で範囲を示している札がある）。
    //   印が無ければ runs は1つなので、**今までと1文字も変わらない**（textContent と同じ結果）。
    //   ⚠ 解析は card-text-markup.js に1つだけ（カードの面と補足の箱の2か所で使う）。
    for (const run of splitUnderlineRuns(line)) {
      if (!run.underline) { div.appendChild(document.createTextNode(run.text)); continue; }
      const u = document.createElement("span");
      u.className = "card-face-u";
      u.textContent = run.text;
      div.appendChild(u);
    }
    frag.appendChild(div);
  }
  return frag;
}

// 効果セクション（★基本/●到達/■手札）を、マーカー付きの行ブロックにする。
// ●到達・■手札のマーカーは正式なアイコン画像（CSS background-image、is-arrival/is-hand）。
// ★基本はマーカー非表示（印字カードに合わせる）。
// opts.effectClass で要素クラスを、opts.markerKind でマーカー種別を上書き可（null でマーカー無し）。
function buildSection(kind, text, opts = {}) {
  const row = document.createElement("div");
  row.className = `card-face-effect ${opts.effectClass || `is-${kind}`}`;
  const markerKind = opts.markerKind === null ? null : (opts.markerKind || kind);
  if (markerKind !== null) {
    const mk = document.createElement("span");
    mk.className = `card-face-marker is-${markerKind}`;
    mk.setAttribute("aria-hidden", "true");
    row.appendChild(mk);
  }
  const body = document.createElement("div");
  body.className = "card-face-effect-body";
  body.appendChild(buildLines(text));
  row.appendChild(body);
  return row;
}

// 効果の本文を「絵の形」に沿わせる。見えない土手を左右に浮かべ、shape-outside で
// 石の斜めの縁をなぞらせると、**行ごとに短くなって台形に流れる**。
//
// 🔴 なぜ枠の幅を細くするだけでは足りないか: 1つの枠は1つの幅しか持てないのに、
//   4行ある手札効果は縦に長く、上の行と下の行で使える幅が違う。上に合わせると下がはみ出し、
//   下に合わせると上が無駄に細くなる。
// ⚠ 土手は**高さを多めに取る**（下の枠線までの余地）。本文（.card-face-effect-body）は
//   flex の子＝**新しい整形文脈を作る**ので、**この高さぶん箱が押し広がる**（見えないが広がる）。
//   それでよい——文字の位置は変わらないし、箱は絶対配置なので他の要素を押さない。
//   🔴 ただし**自動縮小（--cf-fit）が箱で測ると必ず 95% を超えてしまう**ので、
//     deepestTextPct は土手を持つ要素だけ**中の行**で測る。そこを外すと字が最小まで縮む。
function appendShapeSpacers(row, shape, slot) {
  if (!shape || !slot) return;
  const body = row && row.querySelector(".card-face-effect-body");
  const top = Number(slot.y), w = Number(slot.w);
  if (!body || !Number.isFinite(top) || !Number.isFinite(w)) return;
  const 左 = 50 - w / 2, 右 = 50 + w / 2;
  const 高 = Math.max(6, 95 - top); // 枠の下辺（約94.9%）までの余地
  const 刻み = 1.5;
  const 左点 = [], 右点 = [];
  let 左最大 = 0, 右最大 = 0;
  for (let t = 0; t <= 高 + 0.001; t += 刻み) {
    const hw = shapeHalfWidthAt(shape, top + t);
    if (hw == null) return;
    const il = Math.max(0, Math.min(w, shape.cx - hw - 左));
    const ir = Math.max(0, Math.min(w, 右 - (shape.cx + hw)));
    左点.push([il, t]); 右点.push([ir, t]);
    if (il > 左最大) 左最大 = il;
    if (ir > 右最大) 右最大 = ir;
  }
  const 作る = (側, 幅, 点) => {
    const sp = document.createElement("i");
    sp.className = "card-face-shape is-" + 側;
    sp.setAttribute("aria-hidden", "true");
    const 頂点 = [];
    if (側 === "l") {
      頂点.push("0cqw 0cqw");
      for (const [v, t] of 点) 頂点.push(v.toFixed(2) + "cqw " + t.toFixed(2) + "cqw");
      頂点.push("0cqw " + 高.toFixed(2) + "cqw");
    } else {
      頂点.push(幅.toFixed(2) + "cqw 0cqw");
      for (const [v, t] of 点) 頂点.push((幅 - v).toFixed(2) + "cqw " + t.toFixed(2) + "cqw");
      頂点.push(幅.toFixed(2) + "cqw " + 高.toFixed(2) + "cqw");
    }
    sp.style.width = 幅.toFixed(2) + "cqw";
    sp.style.height = 高.toFixed(2) + "cqw";
    // 🔴 下マージンを高さぶん負にして「親の高さに効かせない」ことを一度試したが、**それだと
    //   土手そのものが効かなくなる**（続き669 の実測: 負マージン有りの行と、土手を丸ごと
    //   取り除いた行が**1 cqw も違わなかった**）。float が行を短くするかどうかは
    //   **マージン箱の縦の範囲**で決まるので、高さ 0 に潰すと shape-outside まで無効になる。
    //   ⇒ マージンは触らず、押し広がった箱の方を見ないようにする（deepestTextPct）。
    sp.style.shapeOutside = "border-box polygon(" + 頂点.join(",") + ")";
    return sp;
  };
  // 食い込みがほぼ無い側には置かない（無駄な要素を作らない）。
  if (右最大 > 0.3) body.insertBefore(作る("r", 右最大, 右点), body.firstChild);
  if (左最大 > 0.3) body.insertBefore(作る("l", 左最大, 左点), body.firstChild);
}

// ファーストの手札効果を「【…】（…）」の部分（追色コスト）と、それ以降の効果本文に分ける。
// 例:「【追色１】（これと同色の…得る。）捨て場の…加える。」→ { cost:"【追色１】（…）", rest:"捨て場の…" }
// 括弧は全角（）でも半角()でも可（多言語対応：英語は 【Color Cost 1】(...) のようにASCII括弧を使う）。
function splitFirstHandCost(text) {
  const m = String(text || "").match(/^(【[^】]*】\s*[（(][^）)]*[）)])\s*([\s\S]*)$/);
  if (!m) return null;
  return { cost: m[1], rest: m[2].trim() };
}

// タイトルにふりがな（ルビ）を振る。titleRuby は空白区切りの読み（例 "ぐれん　かざん"）で、
// タイトル中の「漢字の連続」に順番で対応する（紅蓮→ぐれん, 火山→かざん）。数が合わない時は
// 誤ったルビを避けてルビ無しにフォールバックする。
const KANJI_RE = /[一-鿿々〆〇]/;
// ルビの span を1つ作って base に差す（「漢字のかたまり」用と「題名ぜんぶ」用で共用）。
// 【#194】<ruby>/<rt> は使わない。Safari が ruby 内部ボックスへの position 指定を
// 尊重せず、ルビが行の高さを食ってタイトルが下へ押し出される（＝効果文と重なる）ため。
// 普通の span なら、どのエンジンでも「ベースの真上に浮かせる」が同じように効く。
function makeRubyRun(text, reading) {
  const base = document.createElement("span");
  base.className = "card-face-title-run";
  base.textContent = text;
  const rt = document.createElement("span");
  rt.className = "card-face-title-rt";
  rt.setAttribute("aria-hidden", "true"); // 読み上げでは本文（漢字）だけでよい
  rt.textContent = reading;
  base.appendChild(rt);
  return base;
}
function applyTitleRuby(el, name, rubyStr) {
  el.textContent = "";
  const raw = String(rubyStr || "");
  // 先頭が "*" なら**題名ぜんぶに1つ**のルビ（固有名の読み）。
  // 0th拡張「我忘れの白き龍」の印刷カードが「ノクスアエル」を題名全体の上に振っており、
  // 漢字のかたまりごとの仕組みでは表せないため。
  if (raw.startsWith("*")) {
    const reading = raw.slice(1).trim();
    if (!reading) { el.textContent = name; return; }
    el.appendChild(makeRubyRun(name, reading));
    return;
  }
  const readings = raw.split(/[\s　]+/).filter(Boolean);
  if (!readings.length) { el.textContent = name; return; }
  // name を「漢字の連続」と「それ以外」のランに分割
  const runs = [];
  let i = 0;
  while (i < name.length) {
    const isK = KANJI_RE.test(name[i]);
    let j = i + 1;
    while (j < name.length && KANJI_RE.test(name[j]) === isK) j++;
    runs.push({ text: name.slice(i, j), kanji: isK });
    i = j;
  }
  const kanjiRunCount = runs.filter((r) => r.kanji).length;
  if (kanjiRunCount !== readings.length) { el.textContent = name; return; }
  let ri = 0;
  for (const run of runs) {
    if (run.kanji) {
      el.appendChild(makeRubyRun(run.text, readings[ri++]));
    } else {
      el.appendChild(document.createTextNode(run.text));
    }
  }
}

function divEl(cls, textContent) {
  const el = document.createElement("div");
  el.className = cls;
  if (textContent != null) el.textContent = textContent;
  return el;
}

// 仕切り線（黒系の線のみ・中央のダイヤは無し）。効果セットの各効果の間に置く。
function buildDivider() {
  const d = document.createElement("div");
  d.className = "card-face-divider";
  d.setAttribute("aria-hidden", "true");
  return d;
}


// ===== 効果文が「印刷された枠」からはみ出さないよう、文字サイズを自動で縮める =====
// ブランク画像を実測すると、下パネルの下辺はカード高さの約95.4%（ファーストは約94.9%）。
// テキストがそこを越えると、枠の外（イラストの上）に文がはみ出して見える
// （実例: なないろの欠片は日本語でも英語でもはみ出していた）。
//
// カード面の寸法は全て cqw（カード幅比）なので、はみ出すかどうかは「カードid＋言語」だけで決まり、
// 表示サイズには依らない。そこで初回だけ画面外で実測し、収まる倍率（--cf-fit）を求めて覚えておく。
// CSSの font-size は全て calc(… * var(--cf-fit, 1)) になっている（tools/gen-cardface-css.mjs）。
const FIT_LIMIT_PCT = 94.2; // 枠の下辺の少し内側（余白を見込む）
const FIT_MIN = 0.72;       // これ以上は縮めない（小さすぎると読めないため）
const FIT_STEP = 0.02;
const fitCache = new Map(); // "cardId|lang" -> 倍率
let measuringFit = false;   // 実測中の再帰防止（実測用の面は自動フィットを掛けない）

// 実測用の隠しホスト（カード1枚分。container-type: inline-size が cqw の基準になる）。
let fitHostEl = null;
function getFitHost() {
  if (fitHostEl && fitHostEl.isConnected) return fitHostEl;
  fitHostEl = document.createElement("div");
  fitHostEl.setAttribute("aria-hidden", "true");
  fitHostEl.style.cssText =
    "position:fixed;left:-99999px;top:0;width:433px;height:433px;pointer-events:none;" +
    "visibility:hidden;container-type:inline-size;z-index:-1;";
  document.body.appendChild(fitHostEl);
  return fitHostEl;
}

// face 内の一番下のテキストの下端が、カード高さの何%かを返す。
// 🔴 土手（.card-face-shape＝見えない float）を持つ要素だけは、**箱ではなく中の行で測る**。
//   土手は「枠の下辺までの余地」ぶんの高さを持つので、箱で測ると必ず 95% を超え、
//   文字が収まっていても自動縮小が最小倍率まで走ってしまう（続き669）。
//   土手が無い要素＝リメイク・0th拡張のカードは今までどおり箱で測る（倍率を変えない）。
function deepestTextPct(face, hostRect) {
  let deepest = 0;
  for (const el of face.querySelectorAll(".card-face-flavor, .card-face-title, .card-face-subtitle, .card-face-effect, .card-face-fx")) {
    let bottom = null;
    if (el.querySelector(".card-face-shape")) {
      for (const ln of el.querySelectorAll(".card-face-textline, .card-face-subline")) {
        const q = ln.getBoundingClientRect();
        if (q.height === 0) continue;
        if (bottom == null || q.bottom > bottom) bottom = q.bottom;
      }
    } else {
      const r = el.getBoundingClientRect();
      if (r.height !== 0) bottom = r.bottom;
    }
    if (bottom == null) continue;
    const pct = ((bottom - hostRect.top) / hostRect.height) * 100;
    if (pct > deepest) deepest = pct;
  }
  return deepest;
}

// このカード（現在の言語）が枠に収まる倍率を求める。1 なら縮小不要。
function computeFit(cardId) {
  if (typeof document === "undefined" || !document.body) return 1;
  const host = getFitHost();
  measuringFit = true;
  try {
    host.innerHTML = "";
    const face = buildCardFace(cardId);
    host.appendChild(face);
    const hostRect = host.getBoundingClientRect();
    let fit = 1;
    while (deepestTextPct(face, hostRect) > FIT_LIMIT_PCT && fit > FIT_MIN) {
      fit = Math.round((fit - FIT_STEP) * 100) / 100;
      face.style.setProperty("--cf-fit", String(fit));
    }
    host.innerHTML = "";
    return fit;
  } catch (e) {
    return 1; // 実測できない環境でも従来通り（等倍）に倒す
  } finally {
    measuringFit = false;
  }
}

function fitFor(cardId) {
  if (measuringFit || !cardId) return 1;
  const key = cardId + "|" + getLang();
  if (!fitCache.has(key)) fitCache.set(key, computeFit(cardId));
  return fitCache.get(key);
}

// カード面エディタ（card-render-preview.js）が配置用のCSS変数をいじった時に呼ぶ。
// 変数が変われば収まり方も変わるため、覚えている倍率を捨てて測り直させる。
export function clearCardFaceFitCache() {
  fitCache.clear();
}

// カード面のDOMを組み立てて返す。各テキスト要素は種別ごとに絶対配置（CSS＝card-layout-config.js由来）。
// 中の文字はコンテナクエリ(cqw)でカード幅に比例＝どのサイズでも比率が崩れない。
// その種別の config に定義された要素だけを描画する（＝必ず位置ルールが存在する）。
// 効果は fx スロットがあれば「基本/到達/手札」を1つのセット(.card-face-fx)にまとめ、上から詰めて
// 各効果の間に仕切り線を置く。fx が無い種別（first）は基本/手札を個別に絶対配置する。
export function buildCardFace(cardId, { showFlavor = true } = {}) {
  const def = getCardDefinition(cardId);
  const text = getCardText(cardId) || {};
  const color = def?.color || "white";
  const type = cardTypeOf(cardId);
  const slots = LAYOUT[groupOf(cardId)] || {};

  const face = document.createElement("div");
  face.className = "card-face";
  face.dataset.cardId = cardId || "";
  face.dataset.color = color;
  face.dataset.cardType = type;
  face.dataset.lang = getLang(); // 英語用レイアウト上書き（style.css の .card-face[data-lang="en"]）用

  face.style.setProperty("--card-accent", accentFor(color));
  face.style.backgroundImage = `url("${getCardBlankPath(cardId)}")`;

  // 🔴【続き773】色者の円盤。**絵に焼かずに重ねる**（ユーザー判断「2で」）。
  //   焼くと ①10色ぶん焼き直しが要る ②並びを直すたびに焼き直し ③絵が別物なのに
  //   円盤だけ本物にするとちぐはぐ、になる。重ねれば並びを直しても絵は触らなくてよい。
  // ⚠ 置き場所は、絵に焼かれている色名（実測 y 34.54%〜）の**上**。ぶつからない所に置く。
  // ⚠ 読み上げには出さない（意味は効果文と補足の方に書いてある）。
  // ⚠ 読めなければ自分を外す（進行を止めない＝続き767 と同じ作法）。
  // 🔴【続き774】枠から色名を抜いた札（いまは色者だけ）は、**色名と ONLY を文字で組んで置く**。
  //   かくざとうさんの新しいカードと同じ配置（色名の字の天 40.2%／ONLY はその下）。
  //   こうすると色名が下がるので、**円盤を本物と同じ大きさ（28.3%）にできる**。
  //   ⚠ 寸法と字間は only-mark.js／style.css が1か所で持っている（印刷を測った値）。
  if (CARDS_WITH_TYPESET_COLOR_NAME.has(cardId)) {
    const mk = buildOnlyMark(color);
    mk.classList.add("card-face-onlymark");
    mk.setAttribute("aria-hidden", "true");
    face.appendChild(mk);
  }
  if (hasShikijaDial(cardId)) {
    const dial = document.createElement("img");
    dial.className = "card-face-dial";
    dial.src = SHIKIJA_DIAL_SRC;
    dial.alt = "";
    dial.setAttribute("aria-hidden", "true");
    dial.addEventListener("error", () => dial.remove());
    face.appendChild(dial);
  }

  // 個別に絶対配置する要素（config にスロットがある時だけ描画）。
  if ("flavor" in slots && showFlavor && text.flavor) {
    face.appendChild(divEl("card-face-flavor", text.flavor));
  }
  if ("title" in slots) {
    const title = divEl("card-face-title");
    // 表示名は言語データの name（非ja）→ 無ければ cards-data.js の日本語名。
    const displayName = getCardName(cardId) || def?.name || cardId || "";
    applyTitleRuby(title, displayName, text.titleRuby);
    face.appendChild(title);
  }
  if ("sub" in slots && text.subtitle) face.appendChild(divEl("card-face-subtitle", text.subtitle));

  if ("fx" in slots) {
    // 効果セット：基本→到達→手札を上から詰め、間に仕切り線。
    const sections = [];
    if (text.basic) sections.push(buildSection("basic", text.basic));
    if (text.arrival) sections.push(buildSection("arrival", text.arrival));
    if (text.hand) sections.push(buildSection("hand", text.hand));
    if (sections.length) {
      const fx = document.createElement("div");
      fx.className = "card-face-fx";
      sections.forEach((sec, i) => {
        if (i > 0) fx.appendChild(buildDivider());
        fx.appendChild(sec);
      });
      face.appendChild(fx);
    }
  } else {
    // first: 効果も個別に絶対配置。手札効果は「【追色】部分」と「効果本文」を別要素に分ける。
    // 絵の形（slots.shape）があるグループは、本文を石の縁に沿わせる（1st EDITION のジュエル）。
    const 形 = slots.shape || null;
    const 形付き = (sec, slot) => { appendShapeSpacers(sec, 形, slot); return sec; };
    if ("basic" in slots && text.basic) face.appendChild(形付き(buildSection("basic", text.basic), slots.basic));
    if ("arrival" in slots && text.arrival) face.appendChild(形付き(buildSection("arrival", text.arrival), slots.arrival));
    if ("hand" in slots && text.hand) {
      const split = ("handcost" in slots) ? splitFirstHandCost(text.hand) : null;
      if (split) {
        // ■アイコンは独立要素（左位置調整）。テキスト（【追色】部分＋本文）はマーカー無し・中央。
        if ("handicon" in slots) {
          const ic = document.createElement("span");
          ic.className = "card-face-hand-icon";
          ic.setAttribute("aria-hidden", "true");
          face.appendChild(ic);
        }
        face.appendChild(形付き(buildSection("hand", split.cost, { effectClass: "is-hand-cost", markerKind: null }), slots.handcost));
        if (split.rest) face.appendChild(形付き(buildSection("hand", split.rest, { markerKind: null }), slots.hand));
      } else {
        face.appendChild(形付き(buildSection("hand", text.hand), slots.hand));
      }
    }
  }

  const fit = fitFor(cardId);
  if (fit !== 1) face.style.setProperty("--cf-fit", String(fit));

  return face;
}

// ===== 本物のカード面を canvas へ写す（霧散演出など、canvas が要る所のため）=====
//
// 🔴🔴【#709・#710・続き746】報告「拡張カードの霧散演出で効果文のフォント・配置がおかしい」
//   「ジュエルの効果発動時もカードテキストおかしい。総点検だね。」
//
//   原因は**組版が2つ在ったこと**。0th拡張・1st EDITION は文字を焼き込んだ絵を持たないので、
//   霧散演出（card-dissolve.js）は canvas に文字を自分で描いていた。ところがその組版は
//   このファイル（＝本物）とは**別物の手書き**で、余白も字の大きさも違い、仕切り線も無く、
//   効果文をカード高さの 93% まで垂れ流していた。報告に付いていた実測がそれを示している:
//
//        本物（報告の cardFace）: 題名 上52.5% / 効果 上58%・高さ8.2% / 仕切り 67.6%
//        canvas の手書き:        題名 54.5%  / 効果 60% 〜 **93%**   / 仕切り **無し**
//
//   ⇒ canvas 側で組み直すのをやめ、**本物の DOM を画面外で組んで測り、それを写す**。
//     組版の持ち主はこのファイル1つになるので、CSS を直せば霧散演出にも同じだけ効く。
//
//   ⓘ 報告の `fontsReady` は "loaded" だった＝書体の読み込み待ちが原因**ではなかった**。
//     ただし canvas は webfont の読み込みを待たない（未読込なら黙って serif に落ちる）ので、
//     呼ぶ側で `await document.fonts.ready` しておくこと（tools/check-canvas-fonts.mjs が見張る）。
//
//   ⚠ 折り返しは**自分で計算しない**。ブラウザが組んだ行の箱（Range.getClientRects）を
//     そのまま写す。自前で折り返すと DOM と1行ズレて、最後の行が枠からはみ出す。
//   ⚠ 影は canvas の shadow をそのまま使う（縁取りで代用すると、ぼかし影が硬い線になって
//     にじんで太く見える。どちらも続き746 で実際にやって、撮って気づいた）。
//   ⚠ 見るのは**文字の節**であって要素ではない。ルビ付きの題名のように「文字と子要素の
//     両方を持つ」要素があり、要素だけ見ると題名が丸ごと落ちる。
// CSS の text-shadow を canvas の影に読み替える。
// 🔴 **縁取り（strokeText）で代用しない。** CSS のそれは「ぼかした影」なので、
//   同じ太さの硬い線で描くと**にじんで太く見える**（続き746 で実際にそうなり、撮って気づいた）。
//   canvas には影そのものがあるので、本物の値をそのまま渡す。
// 🔴 **影は1枚とは限らない。** 題名は2枚重ね（落とす影＋輪郭の影）で、
//   canvas は1回の描画に1枚しか乗せられないので、**枚数ぶん描く**。
//   1枚目しか読まないと、題名のまわりがわずかに明るくなる（続き746 の実測で見つけた）。
// 形: "rgba(0, 0, 0, 0.7) 0px 1.299px 3.464px, rgba(0, 0, 0, 0.5) 0px 0px 1.5px"
function 影を読む(textShadow) {
  if (!textShadow || textShadow === "none") return [];
  return String(textShadow)
    .split(/,(?![^(]*\))/)
    .map((一枚) => {
      const 色 = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(一枚);
      if (!色) return null;
      const 数 = [...一枚.replace(色[1], "").matchAll(/(-?[\d.]+)px/g)].map((m) => +m[1]);
      return { 色: 色[1], x: 数[0] || 0, y: 数[1] || 0, ぼかし: 数[2] || 0 };
    })
    .filter(Boolean);
}

// 背景画像（●到達・■手札のアイコン）の読み込み置き場。同じ絵を何度も読まない。
const 絵の控え = new Map();
function 絵を読む(url) {
  if (絵の控え.has(url)) return 絵の控え.get(url);
  const p = new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null); // 読めなくても演出は止めない
    i.src = url;
  });
  絵の控え.set(url, p);
  return p;
}

export async function paintCardFaceTextToCanvas(g, cardId, 辺) {
  if (!g || !cardId || typeof document === "undefined" || !document.body) return false;
  const host = getFitHost();
  const 前の中身 = host.innerHTML;
  try {
    host.innerHTML = "";
    const face = buildCardFace(cardId);
    // 🔴 隠しホストは `visibility:hidden`（自動縮小の実測用）。そのままだと**子孫が全部それを継ぐ**ので、
    //   下の「見えていない要素は飛ばす」で**1文字も描かれない**（続き746 で実際にそうなった。
    //   仕切り線だけ出て文字が無い＝原因が分かりにくい形）。位置は画面の外（left:-99999px）なので、
    //   見えるようにしても人の目には触れない。
    face.style.visibility = "visible";
    host.appendChild(face);
    const 枠 = host.getBoundingClientRect();
    if (!枠.width || !枠.height) return false;
    // 🔴🔴 物差しが2つある。取り違えると字だけが別の大きさになる（続き746 で実際にやった。
    //   続き725・740 と同じ形）:
    //     ・getBoundingClientRect() … **実画面px**。body にステージ倍率の transform が
    //       掛かっているので、433px の箱が 271px として返る。
    //     ・getComputedStyle().fontSize / .width … **CSS px**。倍率の影響を受けない。
    //   ⇒ 箱の位置は「実画面px ÷ ステージ倍率」で CSS px に直してから canvas へ移す。
    //     字の大きさは最初から CSS px なので、ステージ倍率で割ってはいけない。
    const CSS辺 = parseFloat(getComputedStyle(host).width) || 433;
    const ステージ = 枠.width / CSS辺; // ホスト自身から出す（外から渡さない＝ズレない）
    const 倍 = 辺 / CSS辺; // CSS px → canvas px
    const 位置 = (実画面px) => (実画面px / ステージ) * 倍; // 実画面px → canvas px

    // 仕切り線（本物にだけ在って、手書きには無かったもの）
    // 🔴 **線そのものは要素ではなく `::before`**（続き746 の実測で見つけた）。
    //   `.card-face-divider` は `height: 1.2cqw` の**入れ物**で、背景を1つも持たない。
    //   見えている線は `::before { height: 0.22cqw; background: … }` ＝入れ物の 1/5 の太さで、
    //   `align-items: center` によって中央に置かれている。
    //   ⇒ 入れ物を塗ると **5px の黒い帯**になり、本物の **1px の細線**と見た目が変わる
    //     （実測: 本物は横幅の6割を超える行が **1行**、入れ物を塗った版は **6行**）。
    //   ⚠ 擬似要素の height は **CSS px** なので `倍`（CSS px → canvas px）を掛ける。
    //     `位置()` は実画面px用なので、ここで使うとステージ倍率のぶん二重に割れる。
    for (const el of face.querySelectorAll(".card-face-divider")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      const 擬似 = getComputedStyle(el, "::before");
      const 透明 = (c) => !c || c === "rgba(0, 0, 0, 0)" || c === "transparent";
      const 色 = !透明(擬似?.backgroundColor)
        ? 擬似.backgroundColor
        : !透明(cs.backgroundColor)
          ? cs.backgroundColor
          : cs.borderTopColor;
      if (透明(色)) continue;
      // ⚠ `::before` が無い形（昔の仕切り線）でも壊れないよう、取れなければ入れ物の高さに戻す。
      const 線高 = parseFloat(擬似?.height);
      const 高 = Number.isFinite(線高) && 線高 > 0 ? 線高 * 倍 : 位置(r.height);
      const 中心 = 位置(r.top - 枠.top) + 位置(r.height) / 2;
      g.fillStyle = 色;
      g.fillRect(位置(r.left - 枠.left), 中心 - 高 / 2, 位置(r.width), Math.max(1, 高));
    }

    // 🔴 **折り返しを自分で計算しない。** ブラウザが組んだ行の箱をそのまま写す。
    //   ①自前で折り返すと DOM と1行ズレて、最後の行が枠からはみ出す（続き746 で実際にそうなった）
    //   ②中央寄せ・右寄せの計算も要らない（行の箱の左端をそのまま使えばよい）
    //   ⚠ 見るのは**文字の節**であって要素ではない。ルビ付きの題名のように
    //     「文字と子要素の両方を持つ」要素があり、要素だけ見ると題名が丸ごと落ちる。
    const 行を取る = (tn) => {
      const 文 = tn.data;
      const rg = document.createRange();
      const 出 = [];
      let 開始 = 0;
      let 今 = null;
      for (let i = 0; i < 文.length; i++) {
        rg.setStart(tn, i);
        rg.setEnd(tn, i + 1);
        const r = rg.getBoundingClientRect();
        if (!r.width && !r.height) continue; // 箱を持たない文字（改行など）
        if (今 && Math.abs(r.top - 今.top) > 0.5) {
          出.push({ 文: 文.slice(開始, i), ...今 });
          開始 = i;
          今 = null;
        }
        // ⚠ right / bottom は**下線を引くため**に持つ（続き762）。文字の箱そのものなので、
        //   fillText が置く位置と同じ基準になる＝線と字がズレない。
        if (!今) 今 = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
        else {
          今.left = Math.min(今.left, r.left);
          今.right = Math.max(今.right, r.right);
          今.bottom = Math.max(今.bottom, r.bottom);
        }
      }
      if (今) 出.push({ 文: 文.slice(開始), ...今 });
      return 出;
    };

    // 要素の中の「文字の節」を集める（下線を引く時に使う）。
    // ⚠ 要素ではなく**文字の節**を見る（続き746 と同じ理由。要素だけ見ると取りこぼす）。
    const 文字の節 = (親) => {
      const 出 = [];
      const 潜る = (e) => {
        for (const node of e.childNodes) {
          if (node.nodeType === 1) {
            const cs = getComputedStyle(node);
            if (cs.display !== "none" && cs.visibility !== "hidden") 潜る(node);
          } else if (node.nodeType === 3 && node.data && node.data.trim()) 出.push(node);
        }
      };
      潜る(親);
      return 出;
    };

    // ●到達 / ■手札 のアイコン（背景画像）。本物に在るものは写す。
    // ⚠ 読み込みは1回だけ控えるので、2枚目以降の霧散では待ち時間ゼロ。
    const アイコン = [];
    for (const el of face.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const m = /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage || "");
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      アイコン.push({ url: m[1], r });
    }
    for (const a of アイコン) {
      const im = await 絵を読む(a.url);
      if (!im) continue;
      g.drawImage(im, 位置(a.r.left - 枠.left), 位置(a.r.top - 枠.top), 位置(a.r.width), 位置(a.r.height));
    }

    let 描いた = 0;
    const 歩く = (親) => {
      for (const node of 親.childNodes) {
        if (node.nodeType === 1) {
          const cs0 = getComputedStyle(node);
          if (cs0.display !== "none" && cs0.visibility !== "hidden") 歩く(node);
          continue;
        }
        if (node.nodeType !== 3) continue;
        if (!node.data || !node.data.trim()) continue;
        const cs = getComputedStyle(親);
        const 字 = parseFloat(cs.fontSize) * 倍; // ⚠ fontSize は CSS px。ステージ倍率で割らない
        if (!(字 > 0)) continue;
        g.font = (cs.fontStyle !== "normal" ? cs.fontStyle + " " : "") + cs.fontWeight + " " + 字 + "px " + cs.fontFamily;
        g.textAlign = "left"; // 揃えはブラウザが済ませてある（行の箱の左端がそのまま答え）
        g.textBaseline = "top";
        const 影 = 影を読む(cs.textShadow)[0];
        if (影) {
          g.shadowColor = 影.色;
          g.shadowOffsetX = 影.x * 倍;
          g.shadowOffsetY = 影.y * 倍;
          g.shadowBlur = 影.ぼかし * 倍;
        } else {
          g.shadowColor = "transparent";
          g.shadowOffsetX = g.shadowOffsetY = g.shadowBlur = 0;
        }
        g.fillStyle = cs.color;
        // 🔴 **1行につき fillText は1回だけ。** 影を2枚とも出そうとして
        //   「影ごとに描く＋最後に影なしで描く」を試したが、**本物から遠ざかった**
        //   （続き746 の実測: 墨の量の比 1.015 → 1.032、題名の帯の違い 19.6% → 20.5%）。
        //   canvas の fillText は**毎回ぼかした縁ごと描く**ので、重ねた回数だけ縁が
        //   濃くなって**字が太る**。影1枚ぶんの損より、字が太る損の方が大きい。
        for (const 行 of 行を取る(node)) {
          if (!行.文.trim()) continue;
          g.fillText(行.文, 位置(行.left - 枠.left), 位置(行.top - 枠.top));
          描いた++;
        }
        g.shadowColor = "transparent";
        g.shadowOffsetX = g.shadowOffsetY = g.shadowBlur = 0;
      }
    };
    歩く(face);

    // 🔴【続き762】下線（`.card-face-u`）。**文字とは別に線を1本引く**。
    //   canvas の fillText は text-decoration を描かないので、要素の箱から自分で引く。
    //   ⚠ `getClientRects()` を使う（**折り返すと箱が行ごとに分かれる**。
    //     getBoundingClientRect だと2行にまたがった時に全体を囲む1つの箱になり、
    //     行間にも線が通ってしまう）。
    //   ⚠ 太さと色は CSS から読む（決め打ちすると、字の大きさを変えた時に取り残される）。
    for (const u of face.querySelectorAll(".card-face-u")) {
      const cu = getComputedStyle(u);
      if (cu.display === "none" || cu.visibility === "hidden") continue;
      // 🔴 **CSS が下線を出しているかを見る。** 見ないと、CSS で切っても canvas だけ線が残り、
      //   画面と焼いた絵が食い違う（実測で見つけた）。
      if (!/underline/.test(cu.textDecorationLine || "")) continue;
      const 太 = parseFloat(cu.textDecorationThickness);
      const 厚 = (Number.isFinite(太) && 太 > 0 ? 太 : parseFloat(cu.fontSize) * 0.06) * 倍;
      const 離 = (parseFloat(cu.textUnderlineOffset) || 0) * 倍;
      g.fillStyle = cu.textDecorationColor && cu.textDecorationColor !== "currentcolor" ? cu.textDecorationColor : cu.color;
      // 🔴 **要素の箱（getClientRects）を使わない。** あれは**行ボックス**（行間の余白込み）で、
      //   canvas の fillText は**字の箱**に置くので基準が違う。
      //   ⇒ **文字を置くのに使っているのと同じ測り方**（行を取る）で出す。折り返しも同じ扱い。
      //
      // 🔴🔴 そして**線は baseline から下ろす。** 日本語の書体は**字の箱が行送りより高い**ので、
      //   「字の箱の下端」から引くと**次の行の字の上に乗る**（この札の実測: 行1の箱 301.9〜321.9、
      //   行2の箱 319.6〜339.6 ＝ **重なっている**）。CSS の `text-underline-offset` は
      //   **baseline から**測る決まりなので、そちらに合わせないと DOM と canvas で線の位置が
      //   8px ずれる（実測でそうなった。数字だけ見ていると気づけず、**焼いた絵を見て分かった**）。
      for (const tn of 文字の節(u)) {
        const cs = getComputedStyle(tn.parentElement || u);
        const 字 = parseFloat(cs.fontSize) * 倍; // ⚠ fontSize は CSS px。ステージ倍率で割らない
        if (!(字 > 0)) continue;
        g.font = (cs.fontStyle !== "normal" ? cs.fontStyle + " " : "") + cs.fontWeight + " " + 字 + "px " + cs.fontFamily;
        g.textBaseline = "top"; // ⚠ 文字を描くのと同じ基準にしてから測る
        const m = g.measureText("あ");
        // 🔴 欲しいのは「top の線から baseline までの距離」＝ `alphabeticBaseline`。
        //   canvas の計量は**上が正**なので負で返る（実測 -12.19）。符号を返して使う。
        //   ⚠ `fontBoundingBoxAscent` ではない——あれは "top" の線から**上**への距離で、
        //     実測では 3.81 しかなく、線が 8px 高くなって**字を横切った**（絵を見て分かった）。
        //   ⚠ 取れない環境では 0.88em で代える（線が消えるより良い）。
        const 下げ = Number.isFinite(m.alphabeticBaseline) ? -m.alphabeticBaseline : 字 * 0.88;
        const 上 = 下げ > 0 ? 下げ : 字 * 0.88;
        for (const 行 of 行を取る(tn)) {
          const 幅 = 位置(行.right - 行.left);
          if (!(幅 > 0)) continue;
          g.fillRect(位置(行.left - 枠.left), 位置(行.top - 枠.top) + 上 + 離, 幅, Math.max(1, 厚));
        }
      }
    }

    return 描いた > 0;
  } catch (e) {
    return false; // 測れない環境では、絵だけで出す（今までどおり）
  } finally {
    host.innerHTML = 前の中身;
  }
}
