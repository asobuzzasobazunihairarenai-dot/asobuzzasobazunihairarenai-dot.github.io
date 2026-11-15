// 🔴【2026-11-15・続き735】パック開封の演出（ユーザー要望「**ポケポケみたいにめちゃ豪華に**」）。
//
// 試作（Artifact「SEVEN ホーム画面 試作」の project/Pack.dc.html）の**3段構え**をそのまま実装する:
//   ① 封を切る   … 実物のブースターパックの袋（熱圧着のギザギザ・TEAR HERE の切り欠き・
//                   銀蒸着フィルムの虹色・0TH EDITION の帯・下の情報帯とバーコード）。
//                   「指でなぞって封を切る」＝切り口に沿って金の光が走る。
//   ② 包みがめくれる … 包みが手前へ倒れ（rotateX）、7色の結晶が外周に開く。「ここで一拍おく」。
//   ③ 1枚ずつ     … 押す／スワイプで次の1枚。レアの時だけ七色の縁。下に7つの点で「1 / 7」。
//
// 🔴 きまり（どれも実害から来ている）
//  ・**新しい画像も canvas も1枚も足さない。** 全画面の canvas は1枚で約23MB（#441・#607 で
//    実機が実際に落ちている）。袋も結晶も光も、全部 CSS のグラデーションと inline SVG で作る。
//    袋の商品名だけは**既にある** assets/ui-v2/logo.webp を使う（続き706 で入れた正式な印）。
//  ・**`filter: blur()` を使わない。** 全画面のぼかしは #634 で見つけた「どの計器にも写らない量」
//    そのもの（iOS は写し取り＋往復でバッファを2〜3倍持つ）。ぼかしは radial-gradient と
//    box-shadow の広がりで作る。
//  ・**`backdrop-filter` も使わない**（同じ理由。#715 で勝利演出から外したばかり）。
//  ・**押せない時間を作らない。** HUERISE は「押しても進まない」の報告が過去に4回
//    （#277/#424/#455/#460）。ここも **どの段でも、どこを押しても次へ進む**
//    （なぞる操作は「できたら気持ちいい」追加で、必須にしない）。
//  ・**必ず閉じられる。** ✕・Esc・最後の「とじる」。演出が途中で固まっても出口が残る。
//  ・2D表示（isFlatten2dMode）では、結晶の広がりと光の走りを止めて静止画にする
//    （古いタブレットで画面が壊れる報告への既定の対処＝opening-screen.js と同じ作法）。

import { getCardBackImagePath, getCardDefinition, getCardImagePath, hasNoPrintedFace } from "./cards-data.js";
import { showCardFace } from "./card-face-display.js";
import { getCardName } from "./card-text.js";
import { isFlatten2dMode } from "./tablet-2d-mode.js";
import { t } from "./ui-text.js";

// 袋の商品名。**続き706 で取り込んだ既存の素材**（新しい画像は足さない）。
const LOGO = "assets/ui-v2/logo.webp";

// 札の上に出す飾りの帯。試作と同じ Oswald の欧字なので、言語で切り替えない
// （「0TH EDITION」「BOOSTER PACK」と同じ扱いの意匠）。
const COLOR_BADGE = {
  red: "RED", orange: "ORANGE", yellow: "YELLOW", green: "GREEN",
  blue: "BLUE", pink: "PINK", purple: "PURPLE",
  rainbow: "RAINBOW", white: "WHITE", black: "BLACK",
};

let root = null;
let onDoneFn = null;
let 引き = [];
let 段 = "seal"; // seal → tearing → wrap → cards → done
let 何枚目 = 0;
let タイマー = [];
let keyHandler = null;

function 札の名(cardId) {
  return getCardName(cardId) || getCardDefinition(cardId)?.name || cardId;
}

function 後で(fn, ms) {
  const id = setTimeout(() => {
    タイマー = タイマー.filter((x) => x !== id);
    fn();
  }, ms);
  タイマー.push(id);
  return id;
}
function タイマーを全部止める() {
  for (const id of タイマー) clearTimeout(id);
  タイマー = [];
}

// ── 部品 ───────────────────────────────────────────────────────────────────

// 7色の結晶（試作の SVG をそのまま。回転角も同じ＝360/7 きざみ）。
function 結晶(大きさrem, 透明度) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 400");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("pkc-shards");
  svg.style.width = 大きさrem + "rem";
  svg.style.height = 大きさrem + "rem";
  const g = document.createElementNS(NS, "g");
  g.setAttribute("transform", "translate(200 200)");
  const 色 = ["#cc5b52", "#d98b45", "#d8b24c", "#7fa86f", "#6fa2a8", "#ce7f90", "#9183b5"];
  for (const [i, c] of 色.entries()) {
    const wrap = document.createElementNS(NS, "g");
    wrap.setAttribute("transform", "rotate(" + (i * (360 / 7)).toFixed(1) + ")");
    const p = document.createElementNS(NS, "polygon");
    p.setAttribute("points", "0,-120 11,-164 0,-208 -11,-164");
    p.setAttribute("fill", c);
    p.setAttribute("opacity", String(透明度));
    wrap.appendChild(p);
    g.appendChild(wrap);
  }
  svg.appendChild(g);
  const circle = document.createElementNS(NS, "circle");
  circle.setAttribute("cx", "200");
  circle.setAttribute("cy", "200");
  circle.setAttribute("r", "150");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", "#c79a47");
  circle.setAttribute("stroke-width", "1");
  circle.setAttribute("stroke-dasharray", "2 8");
  circle.setAttribute("opacity", "0.7");
  svg.appendChild(circle);
  return svg;
}

// カードの裏面（1枚）。
function 裏面(クラス) {
  const el = document.createElement("div");
  el.className = クラス;
  el.style.backgroundImage = 'url("' + getCardBackImagePath(null) + '")';
  return el;
}

// カードの表。文字を焼き込んだ絵を持たない札（0th拡張・1st）はカード面を組み立てる（#660）。
function 表面(cardId) {
  const el = document.createElement("div");
  el.className = "pkc-card-art";
  if (hasNoPrintedFace(cardId)) showCardFace(el, cardId, null);
  else el.style.backgroundImage = 'url("' + getCardImagePath(cardId) + '")';
  return el;
}

// 実物のブースターパックの袋。試作の作りをそのまま写した。
function 袋() {
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
  tear.textContent = "TEAR HERE ▶";
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
  nb.textContent = String(引き.length || 7);
  const ns = document.createElement("span");
  ns.textContent = "CARDS";
  n.append(nb, ns);
  const sub = document.createElement("div");
  sub.className = "pkc-info-sub";
  sub.textContent = t("packs.cer.packNote", { n: 引き.length || 7 });
  left.append(n, sub);
  const right = document.createElement("div");
  right.className = "pkc-info-right";
  const brand = document.createElement("div");
  brand.className = "pkc-brand";
  brand.textContent = "AsobuzZ";
  const cp = document.createElement("div");
  cp.className = "pkc-copy";
  cp.textContent = "©2026 AsobuzZ";
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

// ── 段ごとの絵 ─────────────────────────────────────────────────────────────

function 段1を組む(stage) {
  stage.classList.add("is-seal");
  stage.appendChild(袋());
  見出し(stage, t("packs.cer.tearTitle"), t("packs.cer.tearHint"));
}

function 段2を組む(stage) {
  stage.classList.add("is-wrap");
  const box = document.createElement("div");
  box.className = "pkc-wrapbox";

  const burst = document.createElement("div");
  burst.className = "pkc-burst";
  burst.setAttribute("aria-hidden", "true");
  box.appendChild(burst);

  // 🔴 撮って分かった: 40rem だと**下の2本が題字を突き抜ける**（「包みがめくれる」の上を
  //   緑と青緑の結晶が走る）。読めなくはないが、文字に刺さって見える。⇒ 30rem へ。
  box.appendChild(結晶(30, 0.75));

  const lid = document.createElement("div"); // 手前へ倒れる包み
  lid.className = "pkc-lid";
  box.appendChild(lid);

  const stack = document.createElement("div"); // 中のカード（裏面3枚重ね）
  stack.className = "pkc-stack";
  stack.appendChild(裏面("pkc-stack-back pkc-stack-3"));
  stack.appendChild(裏面("pkc-stack-back pkc-stack-2"));
  const top = 裏面("pkc-stack-top");
  const sh = document.createElement("div");
  sh.className = "pkc-sheen";
  sh.setAttribute("aria-hidden", "true");
  top.appendChild(sh);
  stack.appendChild(top);
  box.appendChild(stack);

  stage.appendChild(box);
  見出し(stage, t("packs.cer.openTitle"), t("packs.cer.openHint"));
}

function 段3を組む(stage) {
  stage.classList.add("is-cards");
  const c = 引き[何枚目];
  const 残り = 引き.length - 何枚目 - 1;

  const box = document.createElement("div");
  box.className = "pkc-cardbox";

  // レアの時だけ、外周に7色の結晶が開く（試作の指定どおり）。
  if (c?.rare) box.appendChild(結晶(35, 0.55));

  // 後ろに残っている枚数ぶんの裏面（最大2枚だけ描く＝見た目に足りる）。
  if (残り > 0) {
    const behind = document.createElement("div");
    behind.className = "pkc-behind";
    behind.setAttribute("aria-hidden", "true");
    if (残り > 1) behind.appendChild(裏面("pkc-behind-card pkc-behind-2"));
    behind.appendChild(裏面("pkc-behind-card pkc-behind-1"));
    box.appendChild(behind);
  }

  const frame = document.createElement("div");
  frame.className = "pkc-cardframe" + (c?.rare ? " is-rare" : "");
  // 毎回「新しい1枚が出た」と分かるよう、カードごとに出現の動きを掛け直す。
  frame.style.setProperty("--pkc-seq", String(何枚目));
  const face = document.createElement("div");
  face.className = "pkc-cardface";
  if (c) face.appendChild(表面(c.cardId));
  const sh = document.createElement("div");
  sh.className = "pkc-sheen";
  sh.setAttribute("aria-hidden", "true");
  face.appendChild(sh);
  frame.appendChild(face);

  const badge = document.createElement("div");
  badge.className = "pkc-colorbadge";
  const 色 = c ? getCardDefinition(c.cardId)?.color : null;
  badge.textContent = COLOR_BADGE[色] || "SEVEN";
  frame.appendChild(badge);
  box.appendChild(frame);
  stage.appendChild(box);

  // 札の名前と、その1枚が何になったか（新規／欠片／レア）。
  const name = document.createElement("div");
  name.className = "pkc-cardname";
  if (c?.rare) {
    const m = document.createElement("span");
    m.className = "pkc-rare";
    m.textContent = "✦";
    m.title = t("packs.rare");
    name.appendChild(m);
  }
  if (c?.isNew) {
    const nw = document.createElement("span");
    nw.className = "pkc-new";
    nw.textContent = t("packs.new");
    name.appendChild(nw);
  }
  name.appendChild(document.createTextNode(c ? 札の名(c.cardId) : ""));
  if (c?.shard) {
    const s = document.createElement("span");
    s.className = "pkc-shard";
    s.textContent = c.only ? t("packs.toOnlyShard") : t("packs.toShard");
    name.appendChild(s);
  }
  stage.appendChild(name);

  見出し(
    stage,
    null,
    残り > 0 ? t("packs.cer.nextHint") : t("packs.cer.lastHint")
  );

  // 下の点（1 / 7）。
  const dots = document.createElement("div");
  dots.className = "pkc-dots";
  for (let i = 0; i < 引き.length; i++) {
    const d = document.createElement("span");
    d.className = "pkc-dot" + (i === 何枚目 ? " is-now" : "") + (i < 何枚目 ? " is-done" : "");
    dots.appendChild(d);
  }
  const num = document.createElement("span");
  num.className = "pkc-count";
  num.textContent = 何枚目 + 1 + " / " + 引き.length;
  dots.appendChild(num);
  stage.appendChild(dots);
}

function 段4を組む(stage) {
  stage.classList.add("is-done");
  const row = document.createElement("div");
  row.className = "pkc-summary";
  for (const c of 引き) {
    const cell = document.createElement("div");
    cell.className = "pkc-sum-cell" + (c.rare ? " is-rare" : "");
    const art = document.createElement("div");
    art.className = "pkc-sum-art";
    art.style.backgroundImage = 'url("' + getCardImagePath(c.cardId) + '")';
    cell.appendChild(art);
    const nm = document.createElement("div");
    nm.className = "pkc-sum-name";
    // ⚠ 欠片になった札にも印を付ける（NEW だけだと、その1枚だけ何も無くて不安になる）。
    const 印 = c.isNew ? t("packs.new") + " " : c.shard ? (c.only ? t("packs.toOnlyShard") : t("packs.toShard")) + " " : "";
    nm.textContent = 印 + 札の名(c.cardId);
    cell.appendChild(nm);
    row.appendChild(cell);
  }
  stage.appendChild(row);
  見出し(stage, t("packs.cer.doneTitle"), t("packs.cer.doneHint", { n: 引き.filter((x) => x.isNew).length }));

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pkc-closebtn";
  btn.textContent = t("packs.cer.close");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    closePackCeremony();
  });
  stage.appendChild(btn);
}

function 見出し(stage, 題, 説明) {
  const cap = document.createElement("div");
  cap.className = "pkc-caption";
  if (題) {
    const h = document.createElement("div");
    h.className = "pkc-caption-title";
    h.textContent = 題;
    cap.appendChild(h);
  }
  if (説明) {
    const p = document.createElement("div");
    p.className = "pkc-caption-sub";
    p.textContent = 説明;
    cap.appendChild(p);
  }
  stage.appendChild(cap);
}

// ── 進行 ───────────────────────────────────────────────────────────────────

function 描く() {
  if (!root) return;
  const stage = root.querySelector(".pkc-stage");
  if (!stage) return;
  stage.textContent = "";
  stage.className = "pkc-stage";
  if (段 === "seal" || 段 === "tearing") {
    段1を組む(stage);
    if (段 === "tearing") stage.classList.add("is-tearing");
  } else if (段 === "wrap") 段2を組む(stage);
  else if (段 === "cards") 段3を組む(stage);
  else 段4を組む(stage);
}

// 🔴 **どの段でも、どこを押しても次へ進む。** 押せない時間は作らない（#277 の家族）。
function すすむ() {
  if (段 === "seal") {
    段 = "tearing";
    描く();
    // 金の光が左から右へ走り終わってから包みをめくる。2D表示では待たない。
    後で(() => {
      段 = "wrap";
      描く();
      // 「ここで一拍おく」（試作の指定）。押せば待たずに進める。
      後で(() => {
        if (段 === "wrap") {
          段 = "cards";
          何枚目 = 0;
          描く();
        }
      }, 1400);
    }, isFlatten2dMode() ? 0 : 900);
    return;
  }
  if (段 === "tearing") return; // 走っている間の連打は無視（すぐ wrap になる）
  if (段 === "wrap") {
    タイマーを全部止める();
    段 = "cards";
    何枚目 = 0;
    描く();
    return;
  }
  if (段 === "cards") {
    if (何枚目 + 1 < 引き.length) {
      何枚目 += 1;
      描く();
    } else {
      段 = "done";
      描く();
    }
    return;
  }
  closePackCeremony();
}

export function closePackCeremony() {
  タイマーを全部止める();
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  const el = root;
  root = null;
  const done = onDoneFn;
  onDoneFn = null;
  if (el) {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 260);
  }
  try {
    done?.();
  } catch (err) {
    console.error("pack ceremony onDone failed", err);
  }
}

// draw … openPack() が返した [{ cardId, only, isNew, shard, rare }]（7枚）。
export function openPackCeremony(draw, options = {}) {
  const 札 = (Array.isArray(draw) ? draw : []).filter((x) => x && x.cardId);
  if (札.length === 0) return false;
  closePackCeremony();
  引き = 札;
  段 = "seal";
  何枚目 = 0;
  onDoneFn = typeof options.onDone === "function" ? options.onDone : null;

  root = document.createElement("div");
  root.id = "pack-ceremony";
  if (isFlatten2dMode()) root.classList.add("is-flat");

  const bg = document.createElement("div");
  bg.className = "pkc-bg";
  bg.setAttribute("aria-hidden", "true");
  root.appendChild(bg);

  const line = document.createElement("div");
  line.className = "pkc-topline";
  line.setAttribute("aria-hidden", "true");
  root.appendChild(line);

  // ⚠ 出口は必ず2つ（✕ と Esc）。演出が途中で固まっても閉じられる。
  const x = document.createElement("button");
  x.type = "button";
  x.className = "pkc-x";
  x.setAttribute("aria-label", t("packs.cer.close"));
  x.textContent = "✕";
  x.addEventListener("click", (e) => {
    e.stopPropagation();
    closePackCeremony();
  });
  root.appendChild(x);

  // 「ぜんぶ見せる」＝1枚ずつ見るのが面倒な人のための近道（押せる口を減らさない）。
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "pkc-skip";
  skip.textContent = t("packs.cer.skip");
  skip.addEventListener("click", (e) => {
    e.stopPropagation();
    タイマーを全部止める();
    段 = "done";
    描く();
  });
  root.appendChild(skip);

  const stage = document.createElement("div");
  stage.className = "pkc-stage";
  root.appendChild(stage);

  // 本体のどこを押しても進む。
  root.addEventListener("click", () => すすむ());
  // スワイプでも進む（試作の「スワイプで次の1枚」）。⚠ **押すのを置き換えない**。
  let 起点 = null;
  root.addEventListener("pointerdown", (e) => {
    起点 = { x: e.clientX, y: e.clientY };
  });
  root.addEventListener("pointerup", (e) => {
    if (!起点) return;
    const dx = e.clientX - 起点.x;
    const dy = e.clientY - 起点.y;
    起点 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) すすむ();
  });

  keyHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePackCeremony();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      すすむ();
    }
  };
  window.addEventListener("keydown", keyHandler);

  document.body.appendChild(root);
  描く();
  // 🔴 **rAF だけに頼らない。** 画面が見えていない間 rAF は進まない（#360 の実害）ので、
  //   タブを切り替えている最中に開くと `show` が付かず、**透明のまま**になる
  //   （実測でも、ヘッドレスで opacity が 0 のまま止まるのを見た）。
  //   どちらが先でも同じクラスを足すだけなので、二重に呼んでも害は無い。
  const 見せる = () => root && root.classList.add("show");
  requestAnimationFrame(見せる);
  setTimeout(見せる, 24);
  return true;
}
