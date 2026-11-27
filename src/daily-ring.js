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

// 🔴【#683・続き738】デイリーは **1日3つ**になった（サーバーが配列で返す）。
//   card-packs.js が古いサーバーの1件も配列に直してくれるので、ここは**常に配列**を見る。
function 一覧(c) {
  return Array.isArray(c?.daily) ? c.daily : [];
}
// 🔴【続き853】**デイリーは1つにつき1つの輪**（ユーザー判断「リングは1にしよう！要するに
//   リング3つ！」）。あわせて**どのチャレンジも目標を7に**そろえたので、1回進むごとに
//   弧がちょうど1本灯る＝ゲージが素直に進む（ユーザー判断「〇〇を7回とかに縛りませんか？
//   そうすればリングのゲージの進捗が綺麗です！」）。
//   ⚠ **目標が7でない時も壊れない**ように、割合から出す（7 なら 1:1 になる）。
//     サーバー側の goal を後で調整しても、この輪はそのまま付いていく。
function 灯る数(prog, goal) {
  const g = Math.max(1, Number(goal) || 1);
  const p = Math.min(Math.max(0, Number(prog) || 0), g);
  // 🔴 1つでも進んだら1本は灯す（0と1の違いが見えないと、進んだ実感が無い）。
  if (p <= 0) return 0;
  return Math.max(1, Math.min(SEVEN.length, Math.round((p / g) * SEVEN.length)));
}

const ns = "http://www.w3.org/2000/svg";
function 輪の土台() {
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("daily-ring-svg");
  return svg;
}

// 7色の弧（デイリー1つぶん）。
function 七色の弧(灯) {
  const svg = 輪の土台();
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

function 中の字(文) {
  const el = document.createElement("div");
  el.className = "daily-ring-num";
  el.textContent = 文;
  return el;
}

// デイリー1つぶんの輪。
function 日の輪(d) {
  const goal = Math.max(1, Number(d?.goal) || 1);
  const prog = Math.min(Math.max(0, Number(d?.progress) || 0), goal);
  const 済 = prog >= goal;
  const el = document.createElement("div");
  el.className = "daily-ring-ring is-daily" + (済 ? " is-done" : "");
  // 🔴【#831・続き867】押された輪がどれかを、この印で見分ける。
  el.dataset.slot = String(Number(d?.slot) || 0);
  el.appendChild(七色の弧(灯る数(prog, goal)));
  el.appendChild(中の字(済 ? "✓" : String(prog)));
  // ⚠ 受け取れる印は**その輪だけ**に付ける（どれが受け取れるのかが一目で分かる）。
  if (済 && !d?.claimed) el.classList.add("has-claim");
  el.title = 題文(d?.kind, "title") + "　" + prog + " / " + goal;
  return el;
}

// 🔴【続き853】**ウィークリーは特別な1つの輪**（ユーザー判断）。デイリーの7色とは別物に
//   見せたいので、作りを変えてある:
//     ・7色の弧ではなく、**金〜七色のひと続きの帯**が勝ち数のぶんだけ伸びる
//     ・節目（3 / 7 / 12勝）に**印**。届いた印だけ金で灯る
//     ・ゆっくり回る破線の輪を1本重ねる（止める設定は CSS 側で面倒を見る）
//   ⚠ 節目はサーバーが持っている（steps）。こちらで数を決め打ちしない。
// 🔴【#831・続き867】いまどの輪だけを出しているか（null ＝ぜんぶ）。
//   ユーザー要望「デイリーチャレンジのリングをタップしたらそのリングの目標だけが出るといいです」。
//   ⚠ ホバー（PC）は今までどおり**ぜんぶ**出す（流し見のため）。押した時だけ絞る。
let 絞り = null;
let 週の番号 = 0;
function 週の輪(w) {
  const steps = (w?.steps || []).map((n) => Number(n) || 0).filter((n) => n > 0);
  const 最大 = steps.length ? steps[steps.length - 1] : 1;
  const wins = Math.max(0, Number(w?.wins) || 0);
  const 届いた = steps.filter((n) => wins >= n).length;
  const 割合 = Math.min(1, 最大 > 0 ? wins / 最大 : 0);

  const el = document.createElement("div");
  el.className = "daily-ring-ring is-weekly" + (届いた >= steps.length && steps.length ? " is-done" : "");
  el.dataset.slot = "weekly";
  const svg = 輪の土台();
  const r = 26;
  const 周 = 2 * Math.PI * r;

  // 帯の色（7色のひと続き）。id は**この輪ごとに別**にする（同じ id が2つ在ると後が勝つ）。
  const 鍵 = "daily-ring-week-" + ++週の番号;
  const defs = document.createElementNS(ns, "defs");
  const grad = document.createElementNS(ns, "linearGradient");
  grad.setAttribute("id", 鍵);
  grad.setAttribute("x1", "0");
  grad.setAttribute("y1", "0");
  grad.setAttribute("x2", "1");
  grad.setAttribute("y2", "1");
  SEVEN.forEach((hex, i) => {
    const s = document.createElementNS(ns, "stop");
    s.setAttribute("offset", ((i / (SEVEN.length - 1)) * 100).toFixed(1) + "%");
    s.setAttribute("stop-color", hex);
    grad.appendChild(s);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  // いちばん外の細い金の輪（勲章らしく見せる飾り。デイリーには無い）。
  const 外 = document.createElementNS(ns, "circle");
  外.setAttribute("cx", "32");
  外.setAttribute("cy", "32");
  外.setAttribute("r", "30.5");
  外.setAttribute("fill", "none");
  外.setAttribute("stroke-width", "0.9");
  外.classList.add("daily-ring-week-rim");
  svg.appendChild(外);

  // 下地の輪（金の細い線）。
  const track = document.createElementNS(ns, "circle");
  track.setAttribute("cx", "32");
  track.setAttribute("cy", "32");
  track.setAttribute("r", String(r));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke-width", "5");
  track.classList.add("daily-ring-week-track");
  svg.appendChild(track);

  // ゆっくり回る破線（飾り）。
  const spin = document.createElementNS(ns, "circle");
  spin.setAttribute("cx", "32");
  spin.setAttribute("cy", "32");
  spin.setAttribute("r", String(r - 5));
  spin.setAttribute("fill", "none");
  spin.setAttribute("stroke-width", "1");
  spin.setAttribute("stroke-dasharray", "1.6 6");
  spin.classList.add("daily-ring-week-spin");
  svg.appendChild(spin);

  // 勝ち数のぶんだけ伸びる帯。
  const arc = document.createElementNS(ns, "circle");
  arc.setAttribute("cx", "32");
  arc.setAttribute("cy", "32");
  arc.setAttribute("r", String(r));
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", "url(#" + 鍵 + ")");
  arc.setAttribute("stroke-width", "5");
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", `${(周 * 割合).toFixed(2)} ${周.toFixed(2)}`);
  arc.setAttribute("transform", "rotate(-90 32 32)");
  arc.classList.add("daily-ring-week-arc");
  if (割合 > 0) arc.classList.add("is-on");
  svg.appendChild(arc);

  // 節目の印。
  for (const n of steps) {
    const 角 = (n / 最大) * Math.PI * 2 - Math.PI / 2;
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", (32 + Math.cos(角) * r).toFixed(2));
    dot.setAttribute("cy", (32 + Math.sin(角) * r).toFixed(2));
    dot.setAttribute("r", "3.1");
    dot.classList.add("daily-ring-week-step");
    if (wins >= n) dot.classList.add("is-on");
    svg.appendChild(dot);
  }

  el.appendChild(svg);
  el.appendChild(中の字(steps.length === 0 ? "–" : String(wins)));
  if (届いた > (Number(w?.claimed) || 0)) el.classList.add("has-claim");
  el.title = t("packs.weekly") + "　" + wins + (steps.length ? " / " + steps.join(" / ") : "");
  return el;
}

// 受け取れるものがあるか（赤い点を出すかどうか）。
function 受け取れる(c) {
  const w = c?.weekly;
  const 日 = 一覧(c).some((d) => !d.claimed && (Number(d.progress) || 0) >= (Number(d.goal) || 1));
  const 週 = !!w && (w.steps || []).filter((n) => w.wins >= n).length > (w.claimed || 0);
  return 日 || 週;
}

// 【#683】種類ごとの題と説明。**知らない種類が来ても落ちない**
//   （サーバー側に新しい kind を足した時、古いクライアントでも「チャレンジ」と出るだけ）。
function 題文(kind, 部分, n) {
  const 鍵 = "packs.ch." + String(kind || "") + "." + 部分;
  const 文 = t(鍵, { n });
  // t() は見つからない鍵をそのまま返すので、それで判定する。
  if (文 && 文 !== 鍵) return 文;
  return t("packs.ch.unknown." + 部分, { n });
}

// 【#703・続き746】もらったセヴルが、押したボタンから所持金の欄まで飛んでいく。
// 🔴 **静的に import しない**。currency-display.js は online.js を取り込むので、
//   この部品の約束（online.js を取り込まない＝輪を作らない）を破ってしまう。
//   押した時だけ動的に取り込む（続き735 で teardownCpuBattle に使ったのと同じ手）。
// ⚠ 失敗しても受け取り自体は済んでいるので、黙って見送る（演出のために報酬を失わせない）。
// 🔴【#751・続き823】**受け取ったパックも飛ばす。**（続き815 の取りこぼし）
//   あの回で飛ばす仕掛け（pack-fly.js）を作った時、呼ぶ側として card-pack-ui と
//   **この daily-ring を見込んでいた**（pack-fly.js の冒頭にそう書いてある）のに、
//   実際に繋いだのは card-pack-ui だけだった。ウィークリーの「パックを受け取る」は
//   **もらった物がどこへ行ったのか分からないまま**になっていた（#751 の訴えそのもの）。
//   ⚠ pack-fly.js は葉（何も import しない）なので、ここから静かに取ってよい。
async function パックを飛ばす(fromEl, 枚) {
  if (!(枚 > 0) || !fromEl) return;
  try {
    const m = await import("./pack-fly.js");
    m.flyPacksToOpener?.(fromEl, 枚);
  } catch {}
}

async function セヴルを飛ばす(fromEl, 額) {
  if (!(額 > 0) || !fromEl) return;
  try {
    const m = await import("./currency-display.js");
    m.flyCurrencyToBalance?.(fromEl, 額);
  } catch {}
}

function ボタン(文, 中身, 無効, 報酬 = 0, パック = 0) {
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
      // 🔴 **受け取れた時だけ**飛ばす（失敗したのにセヴルが飛ぶと嘘になる）。
      //   描き直す前に出発点を押さえる——描き直すとこのボタンは DOM から消える。
      void セヴルを飛ばす(b, 報酬);
      void パックを飛ばす(b, パック);
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

  const w = c?.weekly;

  // 🔴【#831・続き867】週の輪だけを見ている時は、デイリーの題を出さない。
  if (絞り !== "weekly") {
    const 題 = document.createElement("div");
    題.className = "daily-ring-card-title";
    題.textContent = t("packs.daily");
    el.appendChild(題);
  }

  // 🔴【#683】1日3つ。それぞれに**題**（ユーザー要望「タイトルくらいは入れる？」）と
  //   進み、**セヴルの報酬**を出す。⚠ 題と説明はクライアントが持つ（英語に切り替えるため）。
  // 🔴【#831・続き867】押された輪だけを出す（null ならぜんぶ）。
  const 日々 = 絞り === null ? 一覧(c) : 絞り === "weekly" ? [] : 一覧(c).filter((d) => (Number(d.slot) || 0) === 絞り);
  for (const d of 日々) {
    const goal = Math.max(1, Number(d.goal) || 1);
    const prog = Math.min(Math.max(0, Number(d.progress) || 0), goal);
    const 済 = prog >= goal;
    const row = document.createElement("div");
    row.className = "daily-ring-task" + (済 ? " is-done" : "");
    const 題行 = document.createElement("div");
    題行.className = "daily-ring-task-title";
    題行.textContent = 題文(d.kind, "title");
    row.appendChild(題行);
    const 行 = document.createElement("div");
    行.className = "daily-ring-line";
    行.textContent = 題文(d.kind, "desc", goal) + "　" + prog + " / " + goal;
    row.appendChild(行);
    // 🔴【続き854】**1つ進むごとに少しだけセヴルが入る**ことを、その場で言う。
    //   ⚠ 額は**サーバーが持っている**（`step`）。こちらで数字を決め打ちしない
    //     （2か所に書くと必ず食い違う）。古いサーバーなら欄が無いので何も出さない。
    const 刻み = Number(d.step) || 0;
    if (刻み > 0 && !済) {
      const 行2 = document.createElement("div");
      行2.className = "daily-ring-line is-step";
      setTextWithCoin(行2, t("packs.ch.perStep", { n: 刻み }));
      row.appendChild(行2);
    }
    row.appendChild(
      ボタン(
        d.claimed ? t("packs.ch.done") : t("packs.ch.claim", { n: d.reward ?? 0 }),
        async () => {
          await claimDailyChallenge(Number(d.slot) || 0);
        },
        !!d.claimed || !済,
        Number(d.reward) || 0 // 【#703】もらったぶんのセヴルが所持金へ飛ぶ
      )
    );
    el.appendChild(row);
  }

  // 🔴【#831・続き867】デイリーの輪だけを見ている時は、週の節を出さない。
  const 週も出す = 絞り === null || 絞り === "weekly";
  if (週も出す) {
    const 題2 = document.createElement("div");
    題2.className = "daily-ring-card-title";
    題2.textContent = t("packs.weekly");
    el.appendChild(題2);
  }

  if (w && 週も出す) {
    const steps = w.steps || [];
    const 届いた = steps.filter((n) => w.wins >= n).length;
    const 次 = steps.find((n) => w.wins < n) ?? steps[steps.length - 1] ?? 0;
    const 行 = document.createElement("div");
    行.className = "daily-ring-line";
    行.textContent = t("packs.weeklyWins", { n: w.wins, next: 次 }) + "　" + steps.join(" / ");
    el.appendChild(行);
    el.appendChild(
      // 【#751・続き823】受け取るパックの枚数を渡す＝「パックを開ける」の所へ飛んでいく。
      ボタン(
        t("packs.claimPacks", { n: Math.max(0, 届いた - (w.claimed || 0)) }),
        async () => {
          await claimWeekly();
        },
        届いた <= (w.claimed || 0),
        0,
        Math.max(0, 届いた - (w.claimed || 0))
      )
    );
  }

  // 🔴【#847・続き871】**「ぜんぶ見る」ボタンは出さない**（ユーザー指示2026-11-27
  //   「**全部見るボタンも不要です！**」）。
  //   ⚠ 続き867 で「押せない行き止まりを作らない」ために足したものだが、数えたら
  //     **戻る道は元から3つある**: 同じ輪をもう一度押す（閉じる）／別の輪を押す（切り替わる）／
  //     札の外を押す（閉じて絞りも忘れる）。⇒ 行き止まりにはならない。
  //   ⚠ 文言の鍵（`packs.ch.showAll`）は**消していない**（よそで使う余地を残す）。

  const note = document.createElement("div");
  note.className = "daily-ring-note";
  el.appendChild(note);
  return el;
}

function 描き直す() {
  if (!ringEl) return;
  const c = getCollection();
  ringEl.textContent = "";
  // 🔴【続き853】デイリーは**1つにつき1つの輪**＋ ウィークリーの特別な輪を1つ。
  //   ⚠ まだ読めていない時（持ち物が空）は**3つぶん空の輪**を置く——数が増えたり減ったり
  //     すると、読み込みのたびに横幅が動いて目が散る（#685 の骨組みと同じ考え方）。
  const ds = 一覧(c);
  const 日々 = ds.length ? ds : [null, null, null];
  for (const d of 日々) ringEl.appendChild(日の輪(d || {}));
  ringEl.appendChild(週の輪(c?.weekly));
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
  // ⚠ 閉じたら絞りを忘れる（次に開いた時に、前の絞りが残っていると驚く）。
  if (!開いている) 絞り = null;
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

  // 🔴🔴【#847・続き871】**開く道が3つあって、2つが絞りを捨てていた**のが
  //   「**タップするとたまに全部表示される時がある**」の正体。
  //     ①ホバー（`mouseenter`）── 絞り = null。**触る端末でもタップで合成されて飛ぶ**
  //     ②長押し（420ms）── 絞りを触らずに開く＝その時の絞り（null）のまま＝**全部**
  //     ③押す（`click`）── 押された輪で絞る（これが狙いの道）
  //   ⇒ 少し長いタップ（420ms超）だと、②が先に**全部**を開いてしまう。
  //   ⇒ **①は本物のホバーが在る端末だけ**にし、②は**押された輪を見る**ようにした。
  const 本物のホバー = (() => {
    try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; }
  })();
  // ホバー（PC）: 開く。離すと閉じる。⚠ ぜんぶ出す（流し見のため）。
  ringEl.addEventListener("mouseenter", () => {
    if (!本物のホバー) return; // 触る端末では使わない（タップの合成イベントで飛ぶ）
    絞り = null;
    開く(true);
  });
  ringEl.addEventListener("mouseleave", () => {
    // 札の上にマウスが載っている時は閉じない。
    setTimeout(() => {
      if (!ringEl?.matches(":hover")) 開く(false);
    }, 120);
  });
  // 押す（スマホもPCも）: 開く／閉じる。
  // 🔴【#831・続き867】**押された輪だけ**を出す（ユーザー要望）。
  //   ⚠ 同じ輪をもう一度押したら閉じる。別の輪を押したら、そちらへ切り替える
  //     （閉じてから開き直させない）。輪の外（札の外側の余白）を押したら今までどおり。
  ringEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const 輪 = e.target instanceof Element ? e.target.closest(".daily-ring-ring") : null;
    const 押された = 輪 ? (輪.dataset.slot === "weekly" ? "weekly" : Number(輪.dataset.slot) || 0) : null;
    if (輪) {
      if (開いている && 絞り === 押された) { 開く(false); return; }
      絞り = 押された;
      開く(true);
      return;
    }
    絞り = null;
    開く(!開いている);
  });
  // 長押し（スマホ）: 開く。
  // 🔴【#847・続き871】**押された輪を見る。** それまで絞りを触らずに開いていたので、
  //   少し長いタップ（420ms超）で**全部**が開いていた（報告「たまに全部表示される」）。
  //   ⚠ 輪の外（札の外側の余白）を長押しした時は、今までどおり**ぜんぶ**出す。
  ringEl.addEventListener("pointerdown", (e) => {
    clearTimeout(長押しタイマー);
    const 輪 = e.target instanceof Element ? e.target.closest(".daily-ring-ring") : null;
    const 押された = 輪 ? (輪.dataset.slot === "weekly" ? "weekly" : Number(輪.dataset.slot) || 0) : null;
    長押しタイマー = setTimeout(() => { 絞り = 押された; 開く(true); }, 420);
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
