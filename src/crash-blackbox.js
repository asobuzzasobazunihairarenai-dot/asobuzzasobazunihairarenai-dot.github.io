// 「スマホでたまに落ちてタイトル画面に戻る」（#77／CPU戦でも発生＝通信ではなくクライアント側の
// リロード。多くはモバイルのメモリ不足によるタブ破棄/再読込）の原因を突き止めるための
// “ブラックボックス”。アプリの通常のログ・エラー捕捉は全てインメモリで、ページが落ちる
// （＝リロードされる）と消えてしまうため、落ちた直後の不具合報告には手がかりが残らなかった。
//
// この葉モジュールは localStorage に小さな記録を「心拍」で書き続け、次回起動時に「前回の
// セッションが不自然に終わっていないか（さっきまで動いていたのにクリーン終了マークが無い）」
// を判定する。判定結果・遷移種別(navType)・JSヒープのピーク・直前の未捕捉エラーを次の
// 不具合報告（アクションログ）に載せることで、次に落ちた時に原因（メモリ超過か・どの画面か・
// CPU戦かオンラインか）を掴めるようにする。
//
// 設計上の注意: アプリの他モジュールを一切importしない（循環import/TDZ回避。[[circular-import-tdz-and-no-cache-bust]]）。
// window/localStorage/performance のみ使用。全て try/catch で、記録失敗がアプリを壊さないようにする。

const KEY = "so7-blackbox-v1";
const HEARTBEAT_MS = 5000;
// 「さっきまで動いていた」とみなす猶予。これより前の記録なら、単に前回きちんと閉じて時間が
// 経ってから開き直しただけの可能性が高いので不審扱いしない。
const RECENT_MS = 90000;

let ctx = { inGame: false, mode: "title" }; // setBlackboxContextで更新（現在どの画面/対局か）
let peakHeapMB = 0;
let peakImgMB = 0; // 画像の重さのピーク（iOSでは heapMB が0なので、これが唯一の負荷の記録になる）
// 【2026-10-31・続き643】canvas の量も数える。
// 🔴 **これが無かったせいで #441/#432（まとめて捨てて落ちる）の「同時に生きた全画面 canvas
//    197.8MB」が、報告の数字に一度も現れなかった**（続き634 で計器の穴として記録した）。
//    さらに #454/#446（勝利演出中に落ちる）でも決め手が出せなかったので足す。
//    canvas は 幅×高さ×4バイト で効く＝画像と同じ理屈で、全画面1枚で約23MBになる。
let peakCanvasMB = 0;
let peakTotalMB = 0; // 画像＋canvas の合計のピーク（端末が苦しくなるのは合計なので、これが本命）
let peakTag = null; // そのピークを記録した場面（noteBlackboxWeight の呼び元。心拍なら null）
// 🔴 **場面ごとの最大。これが本命。** 「合計のピーク」は画像が重い瞬間に奪われるので
//    （実測: 対局中の心拍 69MB > 勝利演出の GATHER 59MB）、peakTag だけでは
//    「canvas を張っていた時に何MB抱えていたか」が残らない。落ちた後に読めるのは
//    起動時の控えだけなので、**場面ごとに最大を覚えておく**。場面は数個しか無い。
const tagPeaks = {};
const TAG_PEAKS_MAX = 8; // 万一増えても localStorage を太らせない
let cleanExit = false; // 意図的なリロード/遷移の直前に markCleanExit() で true にする
let bootReport = null; // 起動時、前回が不審終了に見えた場合だけ中身が入る

function readRecord() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

function heapMB() {
  try {
    const used = performance?.memory?.usedJSHeapSize;
    return used ? Math.round(used / 1048576) : 0;
  } catch {
    return 0;
  }
}

// 画面が抱えている画像の重さ（展開後の推定MB）と DOM 要素数。#223（iPhoneで対戦中に落ちて
// タイトルへ戻る）の追跡用。iOS Safari は performance.memory を持たないため heapMB が常に0で、
// これまで「落ちた時どれだけ重かったか」を示す数字が1つも無かった。画像は 幅×高さ×4バイト で
// メモリを食うので、DOM上の <img> の実寸を合計すれば、iOSでも使える負荷の目安になる
// （背景画像は実寸が同期で取れないので含まない＝あくまで目安）。
// 【2026-10-31・続き643】canvas も同じ理屈（幅×高さ×4バイト）で数える。bug-report.js の
// gatherWeightSnapshot と**同じ式**にしてある（報告時の weight と突き合わせられるように）。
// ⚠ WebGL の canvas は実際には深度バッファ・テクスチャぶんも食うので、この式は**過小評価**。
//   それでも「23MBの全画面 canvas が何枚生きていたか」は分かる。
function pageWeight() {
  try {
    let bytes = 0;
    let count = 0;
    const list = document.getElementsByTagName("img");
    for (let i = 0; i < list.length; i++) {
      const w = list[i].naturalWidth;
      if (!w) continue;
      count++;
      bytes += w * list[i].naturalHeight * 4;
    }
    let cBytes = 0;
    let cCount = 0;
    const cList = document.getElementsByTagName("canvas");
    for (let i = 0; i < cList.length; i++) {
      cCount++;
      cBytes += cList[i].width * cList[i].height * 4;
    }
    return {
      imgMB: Math.round(bytes / 1048576),
      imgCount: count,
      canvasMB: Math.round(cBytes / 1048576),
      canvasCount: cCount,
      totalMB: Math.round((bytes + cBytes) / 1048576),
      domNodes: document.getElementsByTagName("*").length,
    };
  } catch {
    return { imgMB: 0, imgCount: 0, canvasMB: 0, canvasCount: 0, totalMB: 0, domNodes: 0 };
  }
}

function writeRecord(extra) {
  try {
    const now = heapMB();
    if (now > peakHeapMB) peakHeapMB = now;
    const weight = pageWeight();
    if (weight.imgMB > peakImgMB) peakImgMB = weight.imgMB;
    if (weight.canvasMB > peakCanvasMB) peakCanvasMB = weight.canvasMB;
    // 🔴 ピークの場面を覚えるのは**合計が伸びた時だけ**。画像だけ・canvasだけで更新すると、
    //    「どの場面がいちばん重かったか」が混ざって読めなくなる。
    // extraMB は「DOM に入っていない画像」等、pageWeight では見えない分を呼び元が足すもの。
    const extraMB = (extra && Number(extra.extraMB)) || 0;
    const totalNow = weight.totalMB + Math.round(extraMB);
    if (totalNow > peakTotalMB) {
      peakTotalMB = totalNow;
      peakTag = (extra && extra.weightTag) || null;
    }
    const tag = (extra && extra.weightTag) || null;
    if (tag && (tagPeaks[tag] === undefined || totalNow > tagPeaks[tag])) {
      if (tagPeaks[tag] !== undefined || Object.keys(tagPeaks).length < TAG_PEAKS_MAX) tagPeaks[tag] = totalNow;
    }
    const rec = {
      t: Date.now(),
      inGame: ctx.inGame,
      mode: ctx.mode,
      heapMB: now,
      peakHeapMB,
      imgMB: weight.imgMB,
      peakImgMB,
      imgCount: weight.imgCount,
      canvasMB: weight.canvasMB,
      canvasCount: weight.canvasCount,
      peakCanvasMB,
      peakTotalMB,
      peakTag,
      tagPeaks,
      domNodes: weight.domNodes,
      cleanExit,
      ...(extra || {}),
    };
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* localStorage不可（プライベートモード等）でも致命的でない */
  }
}

function navType() {
  try {
    return performance.getEntriesByType("navigation")[0]?.type ?? "unknown";
  } catch {
    return "unknown";
  }
}

// 現在の画面/対局コンテキストを更新（main.jsのrender購読から呼ぶ）。変化した時だけ書く。
export function setBlackboxContext(next) {
  const merged = { ...ctx, ...next };
  if (merged.inGame === ctx.inGame && merged.mode === ctx.mode) return;
  ctx = merged;
  writeRecord();
}

// 意図的にリロード/遷移する直前に呼ぶ（options-menuの「アプリ再読み込み」・update-checkerの
// 更新リロード等）。これを呼んでおけば、次回起動時にそのリロードを「不審な落下」と誤検知しない。
export function markCleanExit() {
  cleanExit = true;
  writeRecord();
}

// 【2026-10-31・続き643】**重い物を作った瞬間に、その場で測って保存する入口。**
//
// 🔴 **なぜ心拍（5秒ごと）では足りないか。** 勝利演出の全画面 canvas（約23MB）は
//    GATHER の約950msだけ生きて、終わると width=0 で手放される。手札の霧散も1枚あたり
//    8秒のTTLで消える。**5秒に1回の心拍では、いちばん重い瞬間を跨いでしまう確率が高い。**
//    #454/#446 の報告に canvas の山が1つも写っていなかったのは、計器が canvas を数えて
//    いなかったのが主因だが、仮に数えていても**測る時刻が合わない**ところだった。
//
// ⚠ この関数は localStorage へ**同期で書く**（記録は数百バイトなので実測で1ms未満だが、
//   演出のループの中から毎フレーム呼ぶ用途ではない）。**「作った直後に1回」だけ呼ぶ。**
//   落ちる前に保存されていないと意味が無いので、ここは書くのが正しい。
// ⚠ 第2引数 extraMB は「**DOM に入っていない画像**」のような、pageWeight（DOM を走査する）
//   では数えられない分を呼び元が自分で足すためのもの。new Image() で読んだだけの画像は
//   DOM に無いが端末のメモリは食う——勝利サマリの先読みがまさにそれで、**どの計器にも
//   写らない数十MBの山**だった。
export function noteBlackboxWeight(tag, extraMB) {
  writeRecord({
    weightTag: typeof tag === "string" ? tag.slice(0, 40) : null,
    extraMB: Number.isFinite(Number(extraMB)) ? Number(extraMB) : 0,
  });
}

// 起動時に判定した「前回は不審終了っぽい」レポート（無ければnull）。main.jsがアクションログへ流す。
export function getBlackboxBootReport() {
  return bootReport;
}

// 不具合報告に載せる現況サマリ（bug-report.jsが使う）。
export function getBlackboxSummary() {
  let limitMB = 0;
  try {
    const lim = performance?.memory?.jsHeapSizeLimit;
    limitMB = lim ? Math.round(lim / 1048576) : 0;
  } catch {
    /* ignore */
  }
  const w = pageWeight();
  return {
    navType: navType(),
    heapMB: heapMB(),
    peakHeapMB,
    heapLimitMB: limitMB,
    imgMB: w.imgMB,
    peakImgMB,
    canvasMB: w.canvasMB,
    canvasCount: w.canvasCount,
    peakCanvasMB,
    peakTotalMB,
    peakTag,
    tagPeaks,
    inGame: ctx.inGame,
    mode: ctx.mode,
    bootReport,
  };
}

function init() {
  const prev = readRecord();
  const now = Date.now();
  // 前回記録があり、クリーン終了マークが無く、つい先ほど（RECENT_MS以内）まで動いていて、
  // かつ「対局中だった」か「未捕捉エラーがあった」なら、不審な落下（クラッシュ/ブラウザによる
  // タブ破棄・再読込）の可能性が高い。タイトル画面での単なる手動リフレッシュ等（対局中でなく
  // エラーも無い）はノイズなのでフラグしない——狙いは「対局から突然タイトルに戻る」の追跡。
  const recent = prev && prev.cleanExit !== true && typeof prev.t === "number" && now - prev.t < RECENT_MS;
  if (recent && (prev.inGame === true || prev.lastError)) {
    bootReport = {
      suspectedCrash: true,
      navType: navType(), // "reload"ならブラウザ/ユーザーによる再読込、"navigate"なら新規遷移
      secsSincePrev: Math.round((now - prev.t) / 1000),
      prevInGame: prev.inGame ?? null, // 落ちた時に対局中だったか
      prevMode: prev.mode ?? null, // "cpu" / "online" / "local" / "title" 等
      prevHeapMB: prev.heapMB ?? null,
      prevPeakHeapMB: prev.peakHeapMB ?? null, // メモリがどこまで膨らんでいたか＝負荷の指標
      prevImgMB: prev.imgMB ?? null, // 落ちる直前に画面が抱えていた画像の重さ（展開後の推定MB）
      prevPeakImgMB: prev.peakImgMB ?? null, // そのセッション中のピーク
      // 【続き643】canvas の量。🔴 **ここが無くて #441/#454 の決め手が出せなかった。**
      prevCanvasMB: prev.canvasMB ?? null,
      prevCanvasCount: prev.canvasCount ?? null,
      prevPeakCanvasMB: prev.peakCanvasMB ?? null,
      prevPeakTotalMB: prev.peakTotalMB ?? null, // 画像＋canvas の合計のピーク＝端末が苦しむ量
      prevPeakTag: prev.peakTag ?? null, // その合計のピークを出した場面（noteBlackboxWeight の引数）
      // 🔴 **場面ごとの最大（画像＋canvas の合計MB）。落ちた時に何を抱えていたかはここで読む。**
      //    例: {"victory-gather-canvas":59} なら、勝利演出の全画面canvasを張っていた時に59MB。
      prevTagPeaks: prev.tagPeaks ?? null,
      prevImgCount: prev.imgCount ?? null,
      prevDomNodes: prev.domNodes ?? null,
      prevLastError: prev.lastError ?? null, // 直前の未捕捉エラー（あれば）
    };
  }
  // 今回セッションの記録を開始（cleanExit=falseで初期化）。
  cleanExit = false;
  writeRecord({ sessionStart: now });

  // 未捕捉エラー/Promise拒否を localStorage 側にも残す（bug-report.jsのインメモリ捕捉は
  // リロードで消えるため、こちらは“落ちる直前のエラー”を次回起動へ持ち越す用）。
  const persistError = (msg) => {
    try {
      const r = readRecord() || {};
      r.lastError = String(msg).slice(0, 300);
      r.lastErrorAt = Date.now();
      r.cleanExit = false;
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch {
      /* ignore */
    }
  };
  try {
    window.addEventListener("error", (e) => persistError(`${e?.message ?? ""} @ ${e?.filename ?? ""}:${e?.lineno ?? ""}`));
    window.addEventListener("unhandledrejection", (e) => persistError(`REJECTION: ${e?.reason?.message ?? e?.reason ?? ""}`));
    // 心拍。動いている間ずっと最終活動時刻＋ピークメモリを更新し続ける。
    setInterval(() => writeRecord(), HEARTBEAT_MS);
  } catch {
    /* ignore */
  }
}

init();
