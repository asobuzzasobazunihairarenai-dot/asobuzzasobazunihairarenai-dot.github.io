// 【続き757】**実機で見る仕組み。**
//
// 🔴 なぜ要るか
//   検査20本・テスト216本・スモークは**全部ヘッドレス**で、毎回「⚠ 実機では見ていない」で
//   終わっている。しかもヘッドレスは次のことについて**平気で嘘をつく**（実際に何度も踏んだ）:
//     ・CSS の遷移やアニメーションが壁時計どおりに進まない（続き735・743・746 で3回空振り）
//     ・WebGL がソフトウェア描画なので重さが別物（続き752）
//     ・Notification.permission が denied 固定（続き756）
//     ・メモリの実測が取れない（墜落11件はこれが読めずに2年近く残っている）
//     ・字の実寸・指の操作・画面の切り欠き
//   ⇒ **実機から「数字」を持ち帰る道**を作る。絵（スクリーンショット）は重いので運ばない。
//     不具合報告が #717〜#719 の原因を一発で決めたのは**見取り図（箱・重なり順）**だった。
//     同じ考え方で、決まった場所の数字を集めて、**不具合報告の仕組みに相乗りして送る**。
//
// ⚠ 対局中は走らせない（画面を開け閉めするので手が止まる）。
// ⚠ 状態は1つも変えない——開いて測って閉じるだけ。送信も「不具合報告」と同じ道。
// ⚠ 管理者だけ（オプションの中から呼ぶ）。
import { logAction } from "./action-log.js";

const 版 = 1;

/** 画面に出ているか（箱が在って、透明でも隠れてもいない）。 */
function 見えている(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
  return true;
}

/** いま見えている末端の要素を全部たどって、画面からはみ出している物と、小さすぎる字を数える。 */
function 画面を測る(根 = document.body) {
  const 外へ出た = [];
  let 最小字 = 999;
  let 最小字の主 = null;
  let 数えた = 0;
  const W = window.innerWidth;
  const H = window.innerHeight;
  // ⚠ 全要素を舐めると重い端末で固まる（#634 で計器自身が演出を止めた）。上限を置く。
  const 全部 = 根.getElementsByTagName("*");
  const n = Math.min(全部.length, 1500);
  for (let i = 0; i < n; i++) {
    const el = 全部[i];
    if (el.children.length > 0) continue; // 末端だけ見る（親の箱は当てにならない＝続き735 の教訓）
    if (!見えている(el)) continue;
    数えた++;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1 || r.bottom > H + 1 || r.top < -1) {
      if (外へ出た.length < 8) {
        外へ出た.push({
          el: 名前(el),
          box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(","),
        });
      }
    }
    // 🔴 字の実寸は**実機でしか分からない**（ステージ倍率が掛かるので、CSS の値とは別物）。
    //   #453・#569 の家族（スマホで字が読めない）を数字で捕まえる。
    const 文 = (el.textContent || "").trim();
    if (文.length >= 2 && r.height >= 4) {
      const px = parseFloat(getComputedStyle(el).fontSize) || 0;
      // body のステージ倍率を掛けた「見えている大きさ」にする。
      const 倍 = 実画面の倍率();
      const 実px = Math.round(px * 倍 * 10) / 10;
      if (実px > 0 && 実px < 最小字) {
        最小字 = 実px;
        最小字の主 = 名前(el) + " 「" + 文.slice(0, 14) + "」";
      }
    }
  }
  return {
    見えている末端: 数えた,
    画面の外へ出た: 外へ出た.length,
    外の例: 外へ出た,
    いちばん小さい字px: 最小字 === 999 ? null : 最小字,
    その主: 最小字の主,
  };
}

/** body に掛かっているステージ倍率（続き725・740 で2回取り違えた）。 */
function 実画面の倍率() {
  try {
    const m = new DOMMatrixReadOnly(getComputedStyle(document.body).transform);
    return m.a || 1;
  } catch (e) {
    return 1;
  }
}

function 名前(el) {
  return (
    el.tagName.toLowerCase() +
    (el.id ? "#" + el.id : "") +
    (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "")
  ).slice(0, 48);
}

const 待つ = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 🔴 **CSS の遷移が実機で本当に何ミリ秒かかるか。**
 *   ヘッドレスでは壁時計どおりに進まないので、これは実機でしか測れない。
 *   要素に class を付けて、transitionend が来るまでの実時間を測る。
 */
async function 遷移の実時間(作る) {
  const el = 作る();
  if (!el) return null;
  document.body.appendChild(el);
  // 1コマ置いてから始める（付けた瞬間に終わったことにならないように）
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const t0 = performance.now();
  el.style.opacity = "1";
  const 実測 = await new Promise((r) => {
    let 済 = false;
    const 済ませる = (v) => { if (!済) { 済 = true; r(v); } };
    el.addEventListener("transitionend", () => 済ませる(Math.round(performance.now() - t0)), { once: true });
    setTimeout(() => 済ませる(null), 3000); // 来なければ諦める
  });
  const 指定 = getComputedStyle(el).transitionDuration;
  el.remove();
  return { 指定, 実測ms: 実測 };
}

/** 画面を1つ開いて測って閉じる。開けなかった事実も残す。 */
async function 画面ひとつ(名, 開く, 閉じる, 目印) {
  const 出 = { 名 };
  const t0 = performance.now();
  try {
    await 開く();
  } catch (err) {
    出.開けなかった = String(err?.message || err).slice(0, 100);
    return 出;
  }
  await 待つ(900);
  const el = 目印 ? document.querySelector(目印) : null;
  出.開くまでms = Math.round(performance.now() - t0);
  出.出たか = 目印 ? 見えている(el) : null;
  if (出.出たか || !目印) Object.assign(出, 画面を測る(el || document.body));
  try {
    await 閉じる();
  } catch (err) {
    出.閉じられなかった = String(err?.message || err).slice(0, 100);
  }
  await 待つ(450);
  if (目印) 出.閉じたか = !見えている(document.querySelector(目印));
  return 出;
}

/**
 * 実機の数字をひとそろい集める。state は1つも変えない。
 * onProgress(文) で進み具合を呼び元へ返す。
 */
export async function runDeviceCheck({ onProgress } = {}) {
  const 言う = (s) => { try { onProgress?.(s); } catch (e) {} };
  const 結果 = { 版, 時刻: new Date().toISOString(), 画面: [] };

  // ① 端末そのもの
  言う("端末を調べています…");
  結果.端末 = {
    画面: window.innerWidth + "x" + window.innerHeight,
    実画面: (window.screen?.width ?? 0) + "x" + (window.screen?.height ?? 0),
    dpr: window.devicePixelRatio || 1,
    ステージ倍率: Math.round(実画面の倍率() * 1000) / 1000,
    向き: window.innerWidth >= window.innerHeight ? "横" : "縦",
    PWA: (() => { try { return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return null; } })(),
    触れる: (navigator.maxTouchPoints || 0) > 0,
    言語: navigator.language || null,
    // 🔴 iPhone の Safari（ホーム画面に追加していない）では PushManager が無い＝通知が届かない。
    //   これは実機でしか分からない（続き756）。
    プッシュ使える: typeof window !== "undefined" && "PushManager" in window && "Notification" in window,
    通知の許可: typeof Notification !== "undefined" ? Notification.permission : "なし",
  };

  // ② メモリ（墜落11件の本命）
  //   🔴 **欄を名指しで写さない。** blackbox が持っているものを**丸ごと**持ち帰る。
  //     名指しすると、向こうの欄が増えたり名前が変わったりした時に**黙って undefined になる**
  //     （続き755 で「ピークの欄は summary ではなく控えに在る」を踏んだのに、ここでまた
  //      推測で書いて undefined を並べた）。中身は数十個の数字なので丸ごとでも軽い。
  言う("メモリを測っています…");
  try {
    const b = await import("./crash-blackbox.js");
    // いまの値（getBlackboxSummary）
    結果.メモリ = { ...(b.getBlackboxSummary?.() || {}) };
    // 🔴 ピークや WebGL・音の欄は**控え（localStorage）**の方に在る。両方持ち帰る。
    try {
      結果.メモリの控え = JSON.parse(localStorage.getItem("so7-blackbox-v1") || "null");
    } catch (e) {
      結果.メモリの控え = null;
    }
  } catch (err) {
    結果.メモリ = { 取れなかった: String(err?.message || err).slice(0, 80) };
  }

  // ③ いまの画面（呼ばれた時点）
  言う("いまの画面を測っています…");
  結果.いまの画面 = 画面を測る();

  // ④ 主な画面を1つずつ開いて測る
  //    ⚠ 対局中は呼ばない約束なので、ここで盤面を壊す心配は無い。
  const 一覧 = [
    ["ホーム", "#home-screen", async () => (await import("./home-screen.js")).openHomeScreen(), async () => (await import("./home-screen.js")).closeHomeScreen()],
    ["図鑑", "#codex-page", async () => (await import("./codex-page.js")).openCodexPage(), async () => (await import("./codex-page.js")).closeCodexPage()],
    ["ショップ", "#shop-panel", async () => (await import("./shop.js")).openShopPanel(), async () => (await import("./shop.js")).closeShopPanel()],
    ["マイページ", "#profile-page", async () => (await import("./profile-page.js")).openProfilePage(), async () => (await import("./profile-page.js")).closeProfilePage()],
  ];
  for (const [名, 目印, 開く, 閉じる] of 一覧) {
    言う(名 + " を見ています…");
    結果.画面.push(await 画面ひとつ(名, 開く, 閉じる, 目印));
  }

  // ⑤ 🔴 CSS の遷移の実時間（ヘッドレスでは測れない唯一のもの）
  言う("動きの速さを測っています…");
  try {
    結果.遷移 = await 遷移の実時間(() => {
      const d = document.createElement("div");
      d.style.cssText =
        "position:fixed;left:-9999px;top:0;width:10px;height:10px;opacity:0;transition:opacity 300ms linear;pointer-events:none;";
      return d;
    });
  } catch (err) {
    結果.遷移 = { 取れなかった: String(err?.message || err).slice(0, 80) };
  }

  // ⑥ 1コマの速さ（重い端末かどうか）
  言う("なめらかさを測っています…");
  結果.コマ = await コマを測る();

  logAction("diag-device-check", {
    画面: 結果.端末.画面,
    dpr: 結果.端末.dpr,
    allMB: 結果.メモリ?.allMB ?? null,
    外へ出た: 結果.いまの画面?.画面の外へ出た ?? null,
  });
  return 結果;
}

/** 60コマぶん回して、1コマの実時間を測る（重い端末なら大きくなる）。 */
function コマを測る() {
  return new Promise((r) => {
    const t = [];
    let 前 = performance.now();
    let n = 0;
    const 回す = () => {
      const 今 = performance.now();
      t.push(今 - 前);
      前 = 今;
      n++;
      if (n < 60) requestAnimationFrame(回す);
      else {
        t.sort((a, b) => a - b);
        r({
          中央ms: Math.round(t[Math.floor(t.length / 2)] * 10) / 10,
          いちばん遅いms: Math.round(t[t.length - 1] * 10) / 10,
          コマ数: t.length,
        });
      }
    };
    requestAnimationFrame(回す);
  });
}

/** 送る文（不具合報告のコメント欄に入る）。先頭の印で私が探せるようにする。 */
export function formatDeviceCheck(結果) {
  const 行 = [];
  行.push("[動作確認] v" + 結果.版 + " " + 結果.時刻);
  const d = 結果.端末 || {};
  行.push(
    "端末: " + d.画面 + " (実画面 " + d.実画面 + ") dpr " + d.dpr + " / ステージ倍率 " + d.ステージ倍率 +
      " / " + d.向き + " / PWA " + d.PWA + " / 触れる " + d.触れる
  );
  行.push("通知: 使える " + d.プッシュ使える + " / 許可 " + d.通知の許可);
  // 🔴 **在る欄だけを並べる。** 名指しで書くと、無い欄が "undefined" として文に残る
  //   （最初にそれをやった）。両方（いまの値と控え）を合わせて、中身の在るものだけ出す。
  const m = { ...(結果.メモリの控え || {}), ...(結果.メモリ || {}) };
  const 欄 = Object.keys(m)
    .filter((k) => {
      const v = m[k];
      if (v === null || v === undefined) return false;
      if (typeof v === "object") return false; // tagPeaks 等は下で別に出す
      if (k === "navType" || k === "mode") return true;
      return true;
    })
    .sort();
  行.push("メモリと計器（在る欄だけ）:");
  for (let i = 0; i < 欄.length; i += 4) {
    行.push("  " + 欄.slice(i, i + 4).map((k) => k + "=" + m[k]).join(" / "));
  }
  if (m.tagPeaks && typeof m.tagPeaks === "object") {
    const t = Object.entries(m.tagPeaks).map(([k, v]) => k + "=" + v + "MB").join(" / ");
    if (t) 行.push("  場面ごとのピーク: " + t);
  }
  const c = 結果.コマ || {};
  行.push("なめらかさ: 1コマ 中央 " + c.中央ms + "ms / いちばん遅い " + c.いちばん遅いms + "ms");
  const t = 結果.遷移 || {};
  行.push("動きの速さ: 指定 " + t.指定 + " → 実測 " + t.実測ms + "ms");
  const now = 結果.いまの画面 || {};
  行.push(
    "開いた時の画面: 末端 " + now.見えている末端 + " / 画面の外へ出た " + now.画面の外へ出た +
      " / いちばん小さい字 " + now.いちばん小さい字px + "px（" + now.その主 + "）"
  );
  for (const s of 結果.画面 || []) {
    if (s.開けなかった) { 行.push("  ✕ " + s.名 + ": 開けなかった — " + s.開けなかった); continue; }
    行.push(
      "  " + (s.出たか === false ? "✕" : "○") + " " + s.名 +
        ": 開くまで " + s.開くまでms + "ms / 末端 " + s.見えている末端 +
        " / 外へ出た " + s.画面の外へ出た +
        " / 最小の字 " + s.いちばん小さい字px + "px" +
        (s.閉じたか === false ? " / 🔴 閉じていない" : "")
    );
    for (const o of s.外の例 || []) 行.push("      外: " + o.el + " [" + o.box + "]");
  }
  for (const o of now.外の例 || []) 行.push("  外: " + o.el + " [" + o.box + "]");
  return 行.join("\n");
}
