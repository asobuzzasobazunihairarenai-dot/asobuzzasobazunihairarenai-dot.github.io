// アプリ内「不具合報告」（ユーザー要望）。オプションメニューから開けるモーダルでコメントを
// 入力して送ると、その時点のアクションログ・コンソールログ・状況（バージョン/UA/画面/部屋ID）を
// 自動で添付して so7_bug_reports へ保存する（online.jsのsubmitBugReport）。管理者は管理者
// ダッシュボードの「不具合報告」から一覧を読める（so7_get_admin_bug_reports経由）。
//
// メール通知（「私に届く」）については、外部メール配信サービス（Resend等）を使うSupabase
// Edge Functionが別途必要なため、まずはDB保存＋管理者ダッシュボード表示で確実に届くように
// している。メール送信は後からEdge Functionを足せば、このinsertをトリガーに送れる。

import {
  submitBugReport,
  isOnlineMode,
  getCachedUser,
  getSelfSeat,
  onBugLogRequestEvents,
  broadcastBugLogRequest,
  onBugLogResponseEvents,
  broadcastBugLogResponse,
  uploadBugShot,
} from "./online.js";
import { getActionLogText } from "./action-log.js";
import { getBlackboxSummary } from "./crash-blackbox.js";
import { getPlayerName } from "./player-identity.js";
import { createBackdrop, createModalCloseX } from "./ui-helpers.js";
import { APP_VERSION } from "./app-version.js";
import { getState } from "./state.js";
import { isCpuBattleActive, isSelfCpuSubstituted, getCpuDifficulty, getCpuPlayerCount, getAfkCpuDifficulty } from "./cpu-battle-state.js";
// ユーザー要望2026-09-02「ログにCPUが何モードかなど様々な前提条件を入れておくのが今後に活かせる」。
// 不具合の再現条件になりやすい設定（CPUの強さ・2D表示・自動処理・演出オフ等）を、報告に必ず添える。
import { isFlatten2dMode, isIso25dMode } from "./tablet-2d-mode.js";
import { isFlightAnimationDisabled, isArrivalEffectDisabled, isContinuousGlowDisabled } from "./motion-prefs.js";
import { isAutoPhaseSkipEnabled } from "./auto-phase-skip-setting.js";
import { getLang } from "./i18n.js";
import { isAutoProcessingEnabled } from "./card-effect-engine.js";
import { isCellConfirmEnabled } from "./cell-confirm.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ13
import { buildCardFace } from "./card-renderer.js";
// 【2026-10-11】「今の画面を伝える」用。盤面の絵をWebGLが実際に何枚描いているかを読む
// （#369「盤面が真っ白」はこの数字が0かどうかで一発で切り分けられた）。board-3d.js は
// main.js より下位のモジュールで、ここを import しても循環しない。
import { getBoard3dStats } from "./board-3d.js";

// ---- コンソールログの簡易リングバッファ（起動時にconsoleをフックして直近を保持する） ----
const CONSOLE_BUFFER_MAX = 300;
const consoleBuffer = [];
let consoleHooked = false;

function installConsoleCapture() {
  if (consoleHooked) return;
  consoleHooked = true;
  // index.htmlの最初期インラインスクリプトが既にconsoleを包んでwindow.__so7ConsoleBufferへ
  // 蓄積している場合は、そちら（Tailwind等のモジュール前ログも取れる）を使うのでここでは
  // 二重に包まない。getConsoleLogText()がwindow.__so7ConsoleBufferを優先して読む。
  if (typeof window !== "undefined" && Array.isArray(window.__so7ConsoleBuffer)) return;
  // ユーザー報告「不具合報告でコンソールを取得できていません」。以前は warn/error だけを
  // 包んでいたため、console.log/info しか出ていない対局では添付が「(なし)」になっていた。
  // 不具合報告に載せる目的では log/info も拾う必要があるので全レベルを包む。
  // トレードオフ: console.log/info を包むと devtools の出力元表示がこの wrapper
  // （bug-report.js）になる（本来の呼び出し元の行が見えなくなる）。ただし今はアプリが
  // 自動でコンソールを添付するので、devtoolsを手でコピーする前提自体が薄れており許容する。
  // なお高頻度のデバッグログ（remote-move-animatorのBLINK_DEBUG等）は既定でオフにして
  // あるので、300件のリングバッファが無意味なログで溢れることはない。
  const levels = ["log", "info", "warn", "error"];
  for (const level of levels) {
    const original = console[level]?.bind(console);
    if (!original) continue;
    console[level] = (...args) => {
      try {
        const text = args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ");
        const ts = new Date().toISOString().slice(11, 23);
        consoleBuffer.push(`[${ts}] ${level.toUpperCase()}: ${text}`);
        if (consoleBuffer.length > CONSOLE_BUFFER_MAX) consoleBuffer.shift();
      } catch {
        /* キャプチャ失敗は無視（元のログ出力は必ず行う） */
      }
      original(...args);
    };
  }
  // 未捕捉エラーも拾う（スタックまで残す）。
  window.addEventListener("error", (e) => {
    const ts = new Date().toISOString().slice(11, 23);
    consoleBuffer.push(`[${ts}] UNCAUGHT: ${e?.message ?? ""} @ ${e?.filename ?? ""}:${e?.lineno ?? ""}`);
    if (consoleBuffer.length > CONSOLE_BUFFER_MAX) consoleBuffer.shift();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const ts = new Date().toISOString().slice(11, 23);
    consoleBuffer.push(`[${ts}] UNHANDLED_REJECTION: ${String(e?.reason?.message ?? e?.reason ?? "")}`);
    if (consoleBuffer.length > CONSOLE_BUFFER_MAX) consoleBuffer.shift();
  });
}
installConsoleCapture();

function getConsoleLogText() {
  // 最初期インラインスクリプト（index.html）のバッファがあればそれを優先（モジュール前の
  // ログまで含む）。無い環境（テスト等）ではこのモジュール内のフォールバックバッファを使う。
  const early = typeof window !== "undefined" ? window.__so7ConsoleBuffer : null;
  return (Array.isArray(early) ? early : consoleBuffer).join("\n");
}

// ---- 対戦相手のログ収集（ユーザー要望「不具合報告時に相手全員のログも取得したい」） ----
// このモジュールはmain.jsから起動時にeager importされる（installConsoleCaptureのため）ので、
// ここで応答リスナーを常時登録しておけば、自分が報告者でなくても、他プレイヤーの報告時の
// 収集要求に自分のログを返せる。状態は一切変えない、online.jsの合図の上に乗るだけの処理。
onBugLogRequestEvents((payload) => {
  if (!payload || !payload.requestId) return;
  try {
    const seat = getSelfSeat();
    broadcastBugLogResponse({
      requestId: payload.requestId,
      seat,
      name: getPlayerName(seat),
      actionLog: getActionLogText(),
      consoleLog: getConsoleLogText(),
    });
  } catch (err) {
    console.error("bug log response failed", err);
  }
});

// 報告者側: 全プレイヤーへ収集要求をbroadcastし、一定時間だけ応答を集める。realtimeの
// 取りこぼし対策に何度か再送する（delegateToPlayerForEffectの再送と同じ考え方）。
// 自分自身の応答は（送信元には基本echoされないうえ）別途本文に添付するため座席で弾く。
async function collectPeerLogs(timeoutMs = 2500) {
  if (!isOnlineMode()) return [];
  const requestId = `buglog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const selfSeat = getSelfSeat();
  const responses = new Map(); // seat（無ければname）-> { seat, name, actionLog, consoleLog }
  const unregister = onBugLogResponseEvents((payload) => {
    if (!payload || payload.requestId !== requestId) return;
    if (payload.seat && payload.seat === selfSeat) return;
    responses.set(payload.seat ?? payload.name ?? String(responses.size), payload);
  });
  broadcastBugLogRequest({ requestId });
  await new Promise((resolve) => {
    const resend = setInterval(() => broadcastBugLogRequest({ requestId }), 800);
    setTimeout(() => {
      clearInterval(resend);
      resolve();
    }, timeoutMs);
  });
  unregister();
  return [...responses.values()];
}

// 収集した自分＋相手のログを、見出し付きで1本のテキストに束ねる（so7_bug_reportsの
// action_log/console_log列にそのまま入れる。新しい列やSQLの追加は不要）。
function sectionLabel(name, seat, kind, extra = "") {
  return `==== ${name ?? "?"}（${seat ?? "?"}${extra}）の${kind} ====`;
}
function buildCombinedLogs(peers) {
  let actionLog = getActionLogText();
  let consoleLog = getConsoleLogText();
  // オフライン/単独時は従来通り自分のぶんだけをそのまま返す（見出しも付けない）。
  if (!isOnlineMode()) return { actionLog, consoleLog };
  const selfSeat = getSelfSeat();
  const selfName = getPlayerName(selfSeat);
  actionLog = `${sectionLabel(selfName, selfSeat, "アクションログ", "／報告者")}\n${actionLog || "(なし)"}`;
  consoleLog = `${sectionLabel(selfName, selfSeat, "コンソール", "／報告者")}\n${consoleLog || "(なし)"}`;
  for (const p of peers) {
    actionLog += `\n\n${sectionLabel(p.name, p.seat, "アクションログ")}\n${p.actionLog || "(なし)"}`;
    consoleLog += `\n\n${sectionLabel(p.name, p.seat, "コンソール")}\n${p.consoleLog || "(なし)"}`;
  }
  return { actionLog, consoleLog };
}

// #187「手札が見えなくなる」の調査用。報告した瞬間の自分の手札の見え方を記録する。
// 再現手順が分からない（こちらでは再現できていない）不具合なので、次に起きた時に
// 「要素が無いのか／中身が空なのか／画面の外に出ているのか／透明なのか」を切り分けられる
// ようにしておく。中身（カード名）は載せない＝ここに隠し情報は入らない。
// 添付画像の下ごしらえ（ユーザー要望2026-08-29「不具合報告に任意でスクショを貼れるように」）。
// 長辺を1600pxまで縮めてWebPにする（元がPNGのスクショだと数MBになるため）。切り抜きはしない
// ——不具合の場所が画面の端にあることも多いので、画面全体をそのまま見たい。
const SHOT_MAX_DIMENSION = 1600;
const SHOT_WEBP_QUALITY = 0.82;
const SHOT_MAX_INPUT_BYTES = 10 * 1024 * 1024;

async function fileToShotBlob(file) {
  const objectUrl = URL.createObjectURL(file);
  let img;
  try {
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(t("bug.attachFailedInline")));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error(t("bug.attachFailedInline"));
  const scale = Math.min(1, SHOT_MAX_DIMENSION / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", SHOT_WEBP_QUALITY));
  if (!blob) throw new Error(t("bug.attachFailedInline"));
  return blob;
}

// #194 の切り分け用（2026-09-01）。カード面（buildCardFace）を画面外に1枚描いて、
// タイトル・ルビ・効果文が「カード面の高さの何%の位置か」を測って返す。
// 手元のChromiumでは タイトル52.5% / 効果文58% になる。実機（iOS Safari）でこれが
// ずれていれば、ruby が行の高さを食っているという仮説が裏付けられる。
// 文字（カード名・効果文）は載せない＝隠し情報も個人情報も入らない。
function gatherCardFaceSnapshot() {
  try {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:300px;height:300px;pointer-events:none;";
    // ルビ付きのカード（収穫と種まき）で測る。無い場合はここで例外になり null を返す。
    host.appendChild(buildCardFace("orange-harvest-sow"));
    document.body.appendChild(host);
    const face = host.querySelector(".card-face");
    const fr = face.getBoundingClientRect();
    const pct = (el, key) => {
      if (!el || !fr.height) return null;
      const r = el.getBoundingClientRect();
      return { top: +(((r.top - fr.top) / fr.height) * 100).toFixed(1), h: +((r.height / fr.height) * 100).toFixed(1) };
    };
    const out = {
      face: [Math.round(fr.width), Math.round(fr.height)],
      title: pct(face.querySelector(".card-face-title")),
      rt: pct(face.querySelector(".card-face-title rt")),
      effect: pct(face.querySelector(".card-face-effect")),
      divider: pct(face.querySelector(".card-face-divider")),
      // 書体が実際に当たっているか（Webフォントが読めていないと行の高さも変わる）。
      titleFont: getComputedStyle(face.querySelector(".card-face-title") || face).fontFamily.slice(0, 60),
      fontsReady: typeof document.fonts?.status === "string" ? document.fonts.status : "unknown",
    };
    host.remove();
    return out;
  } catch (err) {
    return { error: String(err).slice(0, 120) };
  }
}

function gatherHandSnapshot() {
  try {
    const st = getState();
    const seat = getSelfSeat();
    const handTokens = (st?.tokens ?? []).filter(
      (t) => t.kind === "card" && t.location?.zone === "hand" && t.location.player === seat
    ).length;
    const els = [...document.querySelectorAll(".hand-card.is-self")];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cards = els.slice(0, 12).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const mount = el.querySelector(":scope > .card-face-mount");
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
        onScreen: r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh,
        vis: cs.visibility,
        disp: cs.display,
        op: cs.opacity,
        bg: cs.backgroundImage === "none" ? "none" : "image",
        face: mount ? mount.children.length : -1, // -1=マウント自体が無い、0=空
      };
    });
    return { seat, handTokens, elements: els.length, viewport: vw + "x" + vh, cards };
  } catch (e) {
    return { error: String(e).slice(0, 120) };
  }
}

// #223（iPhoneでCPU戦中にアプリが落ちてタイトルへ戻る）の切り分け用: その瞬間の「画面の重さ」。
// iOS は端末のメモリが厳しくなるとページのプロセスごと落とすため、落ちた時に何をどれだけ
// 抱えていたかが分かると原因を追える。画像は幅×高さ×4バイトで効くので、DOM上の <img> から
// 実寸を合計する（背景画像は実寸が同期で取れないので枚数だけ）。個人情報・伏せ情報は含めない。
const IMAGE_EXT = [".webp", ".png", ".jpg", ".jpeg", ".gif"];
function gatherWeightSnapshot() {
  try {
    let imgBytes = 0;
    let imgCount = 0;
    for (const im of document.querySelectorAll("img")) {
      if (!im.naturalWidth) continue;
      imgCount++;
      imgBytes += im.naturalWidth * im.naturalHeight * 4;
    }
    let canvasBytes = 0;
    let canvasCount = 0;
    for (const c of document.querySelectorAll("canvas")) {
      canvasCount++;
      canvasBytes += c.width * c.height * 4;
    }
    let fetched = 0;
    try {
      const seen = new Set();
      for (const e of performance.getEntriesByType("resource")) {
        if (!IMAGE_EXT.some((x) => e.name.split("?")[0].toLowerCase().endsWith(x))) continue;
        if (seen.has(e.name)) continue;
        seen.add(e.name);
        fetched++;
      }
    } catch {}
    return {
      domNodes: document.getElementsByTagName("*").length,
      imgCount,
      imgMB: Math.round(imgBytes / 1048576),
      canvasCount,
      canvasMB: Math.round(canvasBytes / 1048576),
      fetchedImages: fetched,
      dpr: window.devicePixelRatio || 1,
    };
  } catch {
    return null;
  }
}
// 【2026-10-11・ユーザー提案】**「今の画面を伝える」。報告した人が何を見ていたかを文字で残す。**
// 「debugの機能に、画像添付以外に『今の画面を伝える』とかもあってもいいかも！どう？」への対応で、
// **画像ではなく文字にした**のが肝:
//   ・画像は添付できないことがある（#376 は未解決。10/5 の7件は全滅した）し、試遊（未ログイン）では
//     そもそも Storage へ上げられない。**文字は報告の本体に入るので必ず届く。**
//   ・ブラウザから本物のスクリーンショットは自動では撮れない（撮影許可のダイアログか、画面を
//     描き直す外部ライブラリが要る）。だから「文字で画面の状態を書き出す」が現実的な最善。
// この数日の #369（盤面が真っ白）・#389（モーダルが出ない＝実は画面最上部に17pxで出ていた）・
// #391 は、どれも「その時画面に何が出ていたか」が分からず推測に時間を使った。下の項目は全部、
// あの3件を1回で切り分けられるものだけに絞ってある。
//
// **撮る時点は「報告の画面を開いた瞬間」**（送信時ではない）。報告モーダル自体が画面を覆って
// しまうので、送信時に撮ると「報告モーダルが出ている画面」しか残らない。
// 個人情報・伏せ情報は入れない——**カード名・手札の中身は載せず、数と位置だけ**にする。
// 画面に出ているボタンの文字は入る（プレイヤー名がボタンに出ている場合があるので、
// 送るかどうかはチェックで選べるようにしてある）。
function gatherScreenSnapshot() {
  const clip = (s, n = 70) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const num = (sel) => {
    try {
      return document.querySelectorAll(sel).length;
    } catch {
      return -1;
    }
  };
  const shown = (el) => {
    if (!el) return false;
    try {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    } catch {
      return false;
    }
  };
  // 盤面の縮尺。main.js の currentStageScale は外へ出していないので、実際に当たっている
  // body の transform から読む（物差しを2つ持たない＝#378 で踏んだ形を避ける）。
  const stageScale = (() => {
    try {
      const tr = getComputedStyle(document.body).transform;
      if (!tr || tr === "none") return 1;
      const m = tr.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!m) return 1;
      return +parseFloat(m[1].split(",")[0]).toFixed(3);
    } catch {
      return null;
    }
  })();
  const out = { at: new Date().toISOString() };

  // ① 画面（#378 の黒余白・縦向きで来た時の切り分け）
  try {
    const vv = window.visualViewport;
    out.view = {
      inner: window.innerWidth + "x" + window.innerHeight,
      visual: vv ? Math.round(vv.width) + "x" + Math.round(vv.height) : null,
      orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
      stageScale,
      rotateNotice: shown(document.getElementById("rotate-device-overlay")),
      // 起動中の「読み込み中」が消え残っていないか（続き568 で入れた覆い。三重の保険を
      // 付けたが、残っていたら盤面を隠す）。
      bootLoading: !!document.getElementById("boot-loading"),
      scrollY: Math.round(window.scrollY || 0),
      // 🔴 【#452・2026-10-31】**ここが無くて切り分けできなかった。**
      // 報告 #452 の画像では、画面の下に黒い帯が出ているのに
      // inner も visual も同じ 932x371 で**食い違いが無い**（＝続き559 で直した
      // 「visualViewport だけが変わる」形ではない）。つまり**ブラウザが短い値を返したまま**で、
      // アプリ側からは「本当は 430 ある」と知る手がかりが1つも無かった。
      //
      // 手がかりになるのは次の2つ:
      //   ・standalone（ホーム画面から開いたアプリ）なら**ブラウザの枠が無い**ので、
      //     見えている高さは端末の画面とほぼ同じはず。短ければ**値が古い**と言える。
      //   ・Safari で開いているなら、下のバーのぶん短いのは**正常**。
      // ⇒ この2つを区別するために standalone と端末の画面サイズを残す。
      // ⚠ **判定して直す所まではまだ入れていない**（iPad の分割表示など、standalone でも
      //   本当に小さい場合があるため。次の報告でこの3行を見てから決める）。
      standalone: (() => {
        try {
          if (window.navigator && window.navigator.standalone === true) return "ios-home";
          if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
          if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
          return "browser";
        } catch (e) {
          return "?";
        }
      })(),
      screen: (() => {
        try {
          return screen.width + "x" + screen.height + " avail " + screen.availWidth + "x" + screen.availHeight;
        } catch (e) {
          return null;
        }
      })(),
      outer: window.outerWidth + "x" + window.outerHeight,
      clientH: document.documentElement ? document.documentElement.clientHeight : null,
      dpr: window.devicePixelRatio || 1,
    };
  } catch (e) {
    out.view = { error: clip(e, 80) };
  }

  // ② 画面に出ている覆い・モーダル（#389「モーダルが出ない」はこれ一発で分かった）。
  //    body の直下だけを見る——このアプリのモーダル・背景・オープニングは全部 body 直下に
  //    付くので、新しいモーダルが増えても勝手に拾える（名前を決め打ちしない）。
  try {
    const layers = [];
    for (const el of document.body.children) {
      if (!shown(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const head =
        el.querySelector("h1, h2, h3, [class*='title'], [class*='Title']")?.textContent || el.textContent;
      layers.push({
        el: (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "")).slice(0, 70),
        z: cs.zIndex === "auto" ? 0 : +cs.zIndex || 0,
        pos: cs.position,
        box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(","),
        head: clip(head, 60),
      });
    }
    layers.sort((a, b) => b.z - a.z);
    out.layers = layers.slice(0, 14);
  } catch (e) {
    out.layers = [{ error: clip(e, 80) }];
  }

  // ③ 手番・フェイズ・優先権・承認待ち（「操作を待っているのに気づけない」系の切り分け）
  try {
    const st = getState();
    out.turn = {
      turnPlayer: st?.turnPlayer ?? null,
      turnNumber: st?.turnNumber ?? null,
      roundNumber: st?.roundNumber ?? null,
      turnPhase: st?.turnPhase ? `${st.turnPhase.player}/${st.turnPhase.phase}` : null,
      priority: st?.priorityPlayer ? `${st.priorityPlayer}(${st.priorityPhase ?? "?"})` : null,
      pendingFinalLock: st?.pendingFinalLock?.attacker ?? null,
      pendingContact: st?.pendingContact ? `${st.pendingContact.attacker}->${st.pendingContact.defender}` : null,
      pendingTimerToggle: !!st?.pendingTimerToggle,
    };
  } catch (e) {
    out.turn = { error: clip(e, 80) };
  }

  // ④ 光っている候補の数（#383 の駒ハイライト・#375 の奪われたスロット・あと1色 など）。
  //    クラス名は当てずっぽうで書かず、実際に main.js が付けている名前を使っている（続き569 の教訓）。
  out.highlights = {
    cells: num("#game-table .cell"),
    moveCells: num("#game-table .cell.phase-move-highlight"),
    effectCells: num("#game-table .card-effect-target-cell"),
    effectPieces: num("#game-table .piece.is-effect-target-piece"),
    pickTargets: num("#game-table .is-pick-target"),
    pickable: num("#game-table .is-pickable"),
    oneAway: num("#game-table .is-one-away"),
    justRobbed: num("#game-table .lock-slot.is-just-robbed"),
    pieces: num("#game-table .piece"),
    lockSlots: num("#game-table .lock-slot"),
    selfHandCards: num(".hand-card.is-self"),
  };

  // ⑤ 盤面が本当に描けているか（#369「盤面が真っ白」の決め手）。
  //    WebGLが描く板が0枚で、かつ CSS 側の絵も剥がされている（board-3d-on）と、
  //    **何も見えない盤面**になる。CSSの隠し方は `background-image: none` なので、
  //    display や opacity ではなく背景画像の有無で見る（続き556 で踏んだ形）。
  try {
    const s = getBoard3dStats();
    out.board = { webglActive: s.active, quads: s.quads, textures: s.textures, rebuildMs: s.rebuildMs, frameMs: s.frameMs };
  } catch (e) {
    out.board = { error: clip(e, 80) };
  }
  try {
    const arts = [...document.querySelectorAll(".board-card, .piece-face, .stack-top, .playmat-bg")].slice(0, 60);
    out.board.cssStripped = document.body.classList.contains("board-3d-on");
    out.board.artworkShown = arts.filter((el) => getComputedStyle(el).backgroundImage !== "none").length;
    out.board.artworkTotal = arts.length;
  } catch (e) {
    out.board.artworkError = clip(e, 80);
  }

  // ⑥ いま押せるボタンの文字（「何を押せばいいか分からない」系の報告で効く）。
  try {
    out.buttons = [...document.querySelectorAll("button")]
      .filter((b) => shown(b))
      .map((b) => clip(b.textContent || b.getAttribute("aria-label") || b.id, 24))
      .filter((s) => s.length > 0)
      .slice(0, 16);
  } catch (e) {
    out.buttons = [clip(e, 80)];
  }
  return out;
}

function gatherContext() {
  let roomId = null;
  try {
    // 部屋IDはURLハッシュ/クエリに載っていることがある。無ければnull。
    roomId = new URLSearchParams(location.search).get("game") || null;
  } catch {
    /* noop */
  }
  // ユーザー要望2026-08-08（#48）: 不具合報告に「オンライン/ローカル/CPU戦のどれか」「各座席が
  // 人間かCPUか」等の対局コンテキストを載せる（後から状況を切り分けやすくするため）。
  let gameContext = null;
  try {
    const st = getState();
    gameContext = {
      mode: isOnlineMode() ? "online" : isCpuBattleActive() ? "cpu-battle(1P)" : "local",
      selfSeat: getSelfSeat(),
      activePlayers: st?.activePlayers ?? null,
      turnPlayer: st?.turnPlayer ?? null,
      selfCpuSubstituted: isSelfCpuSubstituted(), // 自席がAFKでCPU代行中か
      // --- 再現条件になりやすい前提（ユーザー要望2026-09-02） ---
      cpuDifficulty: (() => { try { return getCpuDifficulty(); } catch { return null; } })(), // 新人/中級/上級/最強
      cpuPlayerCount: (() => { try { return getCpuPlayerCount(); } catch { return null; } })(),
      afkCpuDifficulty: (() => { try { return getAfkCpuDifficulty(); } catch { return null; } })(),
      settings: {
        flat2d: (() => { try { return isFlatten2dMode(); } catch { return null; } })(), // 盤面を平らな2D表示に
        iso25d: (() => { try { return isIso25dMode(); } catch { return null; } })(),
        autoProcessing: (() => { try { return isAutoProcessingEnabled(); } catch { return null; } })(), // カード効果の自動処理
        autoPhaseSkip: (() => { try { return isAutoPhaseSkipEnabled(); } catch { return null; } })(), // 自動送り
        noFlightAnim: (() => { try { return isFlightAnimationDisabled(); } catch { return null; } })(),
        noArrivalEffect: (() => { try { return isArrivalEffectDisabled(); } catch { return null; } })(),
        noContinuousGlow: (() => { try { return isContinuousGlowDisabled(); } catch { return null; } })(),
        cellConfirm: (() => { try { return isCellConfirmEnabled(); } catch { return null; } })(), // 「このマスでいいですか？」
        lang: (() => { try { return getLang(); } catch { return null; } })(),
        theme: document.body.classList.contains("theme-light") ? "light" : "dark",
        phoneDevice: document.body.classList.contains("is-phone-device"),
        fullScreen: !!document.fullscreenElement,
      },
    };
  } catch {
    /* noop */
  }
  return {
    version: APP_VERSION,
    userAgent: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    href: location.href,
    roomId,
    at: new Date().toISOString(),
    gameContext,
    hand: gatherHandSnapshot(), // #187: 手札が見えなくなる件の切り分け用
    weight: gatherWeightSnapshot(), // #223: 落ちた瞬間の画面の重さ（画像・DOM・canvas）
    cardFace: gatherCardFaceSnapshot(), // #194: カード面のタイトル/ルビ/効果文の位置（実機の実測値）
    // リロードを跨ぐブラックボックス（crash-blackbox.js）: メモリのピーク・遷移種別・前回セッションの
    // 不審終了（＝落ちてタイトルに戻った疑い）を載せる。「スマホでたまに落ちる」原因追跡用。
    blackbox: (() => {
      try {
        return getBlackboxSummary();
      } catch {
        return null;
      }
    })(),
  };
}

let modalEl = null;
let backdropEl = null;

let pasteHandler = null; // 報告モーダルが開いている間だけ有効な Ctrl+V 受け取り
function close() {
  if (pasteHandler) { window.removeEventListener("paste", pasteHandler); pasteHandler = null; }
  modalEl?.remove();
  backdropEl?.remove();
  modalEl = null;
  backdropEl = null;
}

export function openBugReportModal() {
  if (modalEl) return;
  // 【2026-10-11】画面の状態は**ここで撮る**。この下で報告モーダルと背景を body へ足すと、
  // 報告した人が見ていた画面はその覆いの下に隠れてしまう（送信時に撮ると「報告モーダルが
  // 出ている画面」しか残らない）。
  const screenAtOpen = gatherScreenSnapshot();
  const openedAt = Date.now();
  // blocksGame:false（続き455）。この背景は「盤面のタップを透かさない」ためだけに要る。
  // 続き455で `.so7-modal-backdrop` を「ゲームの進行を止める印」にも流用したため、
  // **不具合報告を書いている間ずっとフェイズが進まなくなっていた**（実機ログ:
  // blocker "backdrop>div#bug-report-modal" でフェイズが最大16秒待たされていた）。
  // 報告は対局中に書くものなので、報告している最中に対局が固まるのは本末転倒。
  // 対局の流れに属さない「アプリが出すウィンドウ」なので、進行の妨害からは外す。
  // 【#431】モーダル（style.css で 100095）とセットで最前面へ。10040 のままだと
  // 背景だけが他の覆いの下に潜り、モーダルは前・背景は後ろという食い違いになる。
  backdropEl = createBackdrop(close, { dim: true, zIndex: 100094, blocksGame: false });
  modalEl = document.createElement("div");
  modalEl.id = "bug-report-modal";

  const title = document.createElement("div");
  title.className = "bug-report-title";
  title.textContent = t("bug.title");

  const desc = document.createElement("div");
  desc.className = "bug-report-desc";
  desc.textContent = t("bug.desc");

  const textarea = document.createElement("textarea");
  textarea.className = "bug-report-textarea";
  textarea.placeholder = t("bug.placeholder");
  textarea.rows = 6;

  const status = document.createElement("div");
  status.className = "bug-report-status";

  // --- 画像の添付（任意。ユーザー要望2026-08-29）--------------------------------
  // 選択・貼り付け(Ctrl+V)・ドラッグ＆ドロップの3通りで受け取り、送る直前にWebPへ縮めてから
  // Storageへ上げる。画像の送信に失敗しても、本文とログの送信は必ず行う。
  let shotBlob = null;
  const attachWrap = document.createElement("div");
  attachWrap.className = "bug-report-attach";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  const attachBtn = document.createElement("button");
  attachBtn.type = "button";
  attachBtn.className = "bug-report-attach-btn";
  attachBtn.textContent = t("bug.attach");
  attachBtn.addEventListener("click", () => fileInput.click());

  const attachHint = document.createElement("div");
  attachHint.className = "bug-report-attach-hint";
  attachHint.textContent = t("bug.attachHint");

  const preview = document.createElement("div");
  preview.className = "bug-report-attach-preview";
  preview.style.display = "none";
  const previewImg = document.createElement("img");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "bug-report-attach-remove";
  removeBtn.textContent = t("bug.attachRemove");
  removeBtn.addEventListener("click", () => setShot(null));
  preview.append(previewImg, removeBtn);

  function setShot(file) {
    if (previewImg.src) URL.revokeObjectURL(previewImg.src);
    if (!file) {
      shotBlob = null;
      previewImg.removeAttribute("src");
      preview.style.display = "none";
      attachBtn.style.display = "";
      return;
    }
    shotBlob = file;
    previewImg.src = URL.createObjectURL(file);
    preview.style.display = "";
    attachBtn.style.display = "none";
    status.classList.remove("is-error");
    status.textContent = "";
  }
  function acceptFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { status.textContent = t("bug.attachBadType"); status.classList.add("is-error"); return; }
    if (file.size > SHOT_MAX_INPUT_BYTES) { status.textContent = t("bug.attachTooBig"); status.classList.add("is-error"); return; }
    setShot(file);
  }
  fileInput.addEventListener("change", () => acceptFile(fileInput.files?.[0]));
  // Ctrl+V でスクリーンショットをそのまま貼れるように（この報告モーダルが開いている間だけ）。
  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type?.startsWith("image/"));
    if (!item) return;
    const file = item.getAsFile();
    if (file) { e.preventDefault(); acceptFile(file); }
  };
  window.addEventListener("paste", onPaste);
  pasteHandler = onPaste; // close() で外す
  // ドラッグ＆ドロップ
  attachWrap.addEventListener("dragover", (e) => { e.preventDefault(); attachWrap.classList.add("is-dragover"); });
  attachWrap.addEventListener("dragleave", () => attachWrap.classList.remove("is-dragover"));
  attachWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    attachWrap.classList.remove("is-dragover");
    acceptFile(e.dataTransfer?.files?.[0]);
  });
  attachWrap.append(attachBtn, preview, attachHint, fileInput);
  // 【2026-10-11】**画像の添付はログイン中だけ**。保存先（Storageの bug-shots）は
  // 「ログイン済みの人が自分のフォルダへ」しか書けない作りで、公開読み取りのバケットを
  // 誰でも書ける状態にするのは危ないのでそこは開けない。試遊（未ログイン）の人には
  // 代わりに「今の画面の状態」（文字）が効く——下のチェックは未ログインでも使える。
  if (!getCachedUser()) {
    attachBtn.style.display = "none";
    attachHint.textContent = t("bug.attachLoginOnly");
  }

  // --- 今の画面の状態（任意・既定ON。ユーザー提案2026-10-11）---------------------
  const screenWrap = document.createElement("label");
  screenWrap.className = "bug-report-screen";
  const screenCheck = document.createElement("input");
  screenCheck.type = "checkbox";
  screenCheck.checked = true; // 既定ON（これが無いと、こちらは毎回推測から始めることになる）
  const screenLabel = document.createElement("span");
  screenLabel.textContent = t("bug.screenSnap");
  screenWrap.append(screenCheck, screenLabel);
  const screenHint = document.createElement("div");
  screenHint.className = "bug-report-attach-hint";
  screenHint.textContent = t("bug.screenSnapHint");

  const actions = document.createElement("div");
  actions.className = "bug-report-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "bug-report-cancel";
  cancelBtn.textContent = t("bug.cancel");
  cancelBtn.addEventListener("click", close);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "bug-report-submit";
  submitBtn.textContent = t("bug.submit");
  submitBtn.addEventListener("click", async () => {
    const comment = textarea.value.trim();
    if (!comment) {
      status.textContent = t("bug.needText");
      status.classList.add("is-error");
      return;
    }
    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    status.classList.remove("is-error");
    status.textContent = isOnlineMode() ? t("bug.sendingOnline") : t("bug.sending");
    try {
      const peers = await collectPeerLogs();
      const { actionLog, consoleLog } = buildCombinedLogs(peers);
      const context = gatherContext();
      // 開いた瞬間の画面の状態。何秒前の話かも残す（開いたまま対局が進むことがあるため）。
      if (screenCheck.checked) {
        context.screen2 = { ...screenAtOpen, agoMs: Date.now() - openedAt };
      }
      // 画像は「送れたら添える」扱い。失敗しても本文とログの送信は必ず行う
      // （バケット未作成＝SQL未実行や、未ログインでも報告自体は成立させる）。
      let shotWarning = "";
      if (shotBlob) {
        status.textContent = t("bug.uploadingShot");
        try {
          const blob = await fileToShotBlob(shotBlob);
          context.shotUrl = await uploadBugShot(blob);
        } catch (err) {
          console.error("uploadBugShot failed", err);
          shotWarning = t("bug.shotFailed");
        }
        status.textContent = isOnlineMode() ? t("bug.sendingOnline") : t("bug.sending");
      }
      await submitBugReport({
        comment,
        actionLog,
        consoleLog,
        context,
      });
      status.classList.remove("is-error");
      status.textContent = shotWarning ? t("bug.sent") + " " + shotWarning : t("bug.sent");
      submitBtn.textContent = t("bug.sentBtn");
      setTimeout(close, 1400);
    } catch (err) {
      console.error("submitBugReport failed", err);
      status.classList.add("is-error");
      status.textContent = t("bug.failed");
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);

  modalEl.appendChild(createModalCloseX(close));
  modalEl.appendChild(title);
  modalEl.appendChild(desc);
  modalEl.appendChild(textarea);
  modalEl.appendChild(attachWrap);
  modalEl.appendChild(screenWrap);
  modalEl.appendChild(screenHint);
  modalEl.appendChild(status);
  modalEl.appendChild(actions);

  document.body.appendChild(backdropEl);
  document.body.appendChild(modalEl);
  textarea.focus();
}
