// ホームの「7色のリング」（2026-11-15・続き733）。
//
// 🔴 ユーザー要望:
//   「**パックを開けるページにデイリーチャレンジやウィークリーは不要です。これらはホームに
//   表示しよう。MTGAみたいにホバーや長タップでチャレンジ内容が表示されて、普段はスマートな
//   表示でクリア進捗によってリングが埋まってく感じがいいかも！セブンだから７つの色が
//   灯ってく感じはどう？**」
//
// ■ 形
//   ・小さな円に**7本の弧**（7色）。デイリーの進みに応じて**左から順に灯る**。
//   ・真ん中は「1 / 2」のような小さな数え。達成したら金の点が灯る。
//   ・**普段はこれだけ**（スマートな表示）。
//   ・ホバー（PC）／長押し（スマホ）／押す で、中身の札が開く
//     （チャレンジの文・週の勝利・受け取るボタン）。
//
// ⚠ **新しい画像は1枚も足さない**（弧は SVG。7色はアプリの色をそのまま使う）。
// ⚠ **色は決め打ちしない**（教訓15）。札の地と文字色はテーマごとに分ける。
// ⚠ 当たり判定は盤面の外なので普通の addEventListener でよい（教訓4 は盤面の中の話）。
//
// 🔴 **この部品は online.js を import しない**（card-packs.js と同じ理由。輪を作らない）。
//   通信は card-packs.js が注入ずみのものを使う。

import {
  getCollection,
  isCollectionReady,
  refreshCollection,
  claimDailyChallenge,
  claimWeekly,
  onCardPacksChange,
} from "./card-packs.js";
import { t } from "./ui-text.js";
import { setTextWithCoin } from "./ui-helpers.js";

// 7色（アプリのカードの色。board-3d.js・マイ山札と同じ値）。
const SEVEN = ["#c70025", "#ee781f", "#fabe00", "#22ac38", "#1bb8ce", "#f19ec2", "#915da3"];

let ringEl = null;
let cardEl = null;
let 開いている = false;
let 長押しタイマー = null;
let 外れる = null;

function 灯る数(c) {
  const d = c?.daily;
  if (!d || !d.goal) return 0;
  if (d.claimed) return SEVEN.length;
  const 割合 = Math.max(0, Math.min(1, d.progress / d.goal));
  // 🔴 1つでも進んだら1本は灯す（0と1の違いが見えないと、進んだ実感が無い）。
  if (割合 <= 0) return 0;
  return Math.max(1, Math.ceil(割合 * SEVEN.length));
}

function 弧を描く(c) {
  const 灯 = 灯る数(c);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("daily-ring-svg");
  const r = 26;
  const 周 = 2 * Math.PI * r;
  const 弧１本 = 周 / SEVEN.length;
  SEVEN.forEach((hex, i) => {
    const seg = document.createElementNS(ns, "circle");
    seg.setAttribute("cx", "32");
    seg.setAttribute("cy", "32");
    seg.setAttribute("r", String(r));
    seg.setAttribute("fill", "none");
    seg.setAttribute("stroke", hex);
    seg.setAttribute("stroke-width", "5");
    seg.setAttribute("stroke-linecap", "butt");
    // 弧1本＋すき間。12時から時計回りに並べる。
    seg.setAttribute("stroke-dasharray", `${(弧１本 - 3.2).toFixed(2)} ${(周 - 弧１本 + 3.2).toFixed(2)}`);
    seg.setAttribute("stroke-dashoffset", String((-弧１本 * i).toFixed(2)));
    seg.setAttribute("transform", "rotate(-90 32 32)");
    seg.classList.add("daily-ring-seg");
    if (i < 灯) seg.classList.add("is-on");
    svg.appendChild(seg);
  });
  return svg;
}

function 中の数え(c) {
  const el = document.createElement("div");
  el.className = "daily-ring-num";
  const d = c?.daily;
  if (!d) el.textContent = "–";
  else if (d.claimed) el.textContent = "✓";
  else el.textContent = `${Math.min(d.progress, d.goal)}/${d.goal}`;
  return el;
}

// 受け取れるものがあるか（赤い点を出すかどうか）。
function 受け取れる(c) {
  const d = c?.daily;
  const w = c?.weekly;
  const 日 = !!d && !d.claimed && d.progress >= d.goal;
  const 週 = !!w && (w.steps || []).filter((n) => w.wins >= n).length > (w.claimed || 0);
  return 日 || 週;
}

function ボタン(文, 中身, 無効) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "daily-ring-btn";
  setTextWithCoin(b, 文);
  b.disabled = !!無効;
  b.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    b.disabled = true;
    try {
      await 中身();
    } catch (err) {
      // 失敗しても画面は壊さない。理由は札の中に出す。
      const n = cardEl?.querySelector(".daily-ring-note");
      if (n) n.textContent = t("packs.failed");
    }
    描き直す();
  });
  return b;
}

function 札を組む() {
  const c = getCollection();
  const el = document.createElement("div");
  el.className = "daily-ring-card";
  el.addEventListener("click", (e) => e.stopPropagation());

  const d = c?.daily;
  const w = c?.weekly;

  const 題 = document.createElement("div");
  題.className = "daily-ring-card-title";
  題.textContent = t("packs.daily");
  el.appendChild(題);

  if (d) {
    const 行 = document.createElement("div");
    行.className = "daily-ring-line";
    const 文 = document.createElement("span");
    文.textContent = t(`packs.challenge.${d.kind}`, { n: d.goal }) + `　${Math.min(d.progress, d.goal)} / ${d.goal}`;
    行.appendChild(文);
    el.appendChild(行);
    el.appendChild(
      ボタン(
        d.claimed ? t("packs.claimed") : t("packs.claim", { n: d.reward }),
        async () => {
          await claimDailyChallenge();
        },
        d.claimed || d.progress < d.goal
      )
    );
  }

  const 題2 = document.createElement("div");
  題2.className = "daily-ring-card-title";
  題2.textContent = t("packs.weekly");
  el.appendChild(題2);

  if (w) {
    const steps = w.steps || [];
    const 届いた = steps.filter((n) => w.wins >= n).length;
    const 次 = steps.find((n) => w.wins < n) ?? steps[steps.length - 1] ?? 0;
    const 行 = document.createElement("div");
    行.className = "daily-ring-line";
    行.textContent = t("packs.weeklyWins", { n: w.wins, next: 次 }) + "　" + steps.join(" / ");
    el.appendChild(行);
    el.appendChild(
      ボタン(t("packs.claimPacks", { n: Math.max(0, 届いた - (w.claimed || 0)) }), async () => {
        await claimWeekly();
      }, 届いた <= (w.claimed || 0))
    );
  }

  const note = document.createElement("div");
  note.className = "daily-ring-note";
  el.appendChild(note);
  return el;
}

function 描き直す() {
  if (!ringEl) return;
  const c = getCollection();
  ringEl.textContent = "";
  ringEl.appendChild(弧を描く(c));
  ringEl.appendChild(中の数え(c));
  ringEl.classList.toggle("has-claim", 受け取れる(c));
  // 札は開いている時だけ作り直す（閉じている間は何も持たない＝軽い）。
  if (cardEl) cardEl.remove();
  cardEl = null;
  if (開いている) {
    cardEl = 札を組む();
    ringEl.appendChild(cardEl);
  }
  ringEl.title = 開いている ? "" : t("packs.ringTip");
}

function 開く(v) {
  開いている = !!v;
  描き直す();
}

// 画面のどこかを押したら閉じる（札の中は上で止めてある）。
function 外を押したら閉じる() {
  if (外れる) return;
  const fn = () => 開く(false);
  document.addEventListener("click", fn);
  外れる = () => document.removeEventListener("click", fn);
}

// ホームの好きな所へ差し込む。戻り値はその要素（呼び出し側が置き場所を決める）。
export function buildDailyRing() {
  ringEl = document.createElement("div");
  ringEl.id = "daily-ring";
  ringEl.tabIndex = 0;
  ringEl.setAttribute("role", "button");

  // ホバー（PC）: 開く。離すと閉じる。
  ringEl.addEventListener("mouseenter", () => 開く(true));
  ringEl.addEventListener("mouseleave", () => {
    // 札の上にマウスが載っている時は閉じない。
    setTimeout(() => {
      if (!ringEl?.matches(":hover")) 開く(false);
    }, 120);
  });
  // 押す（スマホもPCも）: 開く／閉じる。
  ringEl.addEventListener("click", (e) => {
    e.stopPropagation();
    開く(!開いている);
  });
  // 長押し（スマホ）: 開く。
  ringEl.addEventListener("pointerdown", () => {
    clearTimeout(長押しタイマー);
    長押しタイマー = setTimeout(() => 開く(true), 420);
  });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) {
    ringEl.addEventListener(ev, () => clearTimeout(長押しタイマー));
  }
  ringEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      開く(!開いている);
    }
  });

  外を押したら閉じる();
  onCardPacksChange(() => 描き直す());
  描き直す();

  // 開いた時にいちど読み直す（別の端末で遊んでいることもある）。
  if (isCollectionReady()) void refreshCollection().catch(() => {});
  return ringEl;
}
