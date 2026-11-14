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

// 🔴【A-1・2026-11-10】**全画面の演出 canvas の解像度の上限。**
//   勝利演出の吸い込みと手札の霧散は、どちらも 1600x900 のステージいっぱいの canvas を
//   張る。メモリは「幅×高さ×4バイト」なので（#223）、上限 2 では**1枚で約23MB**になり、
//   #441 で iPhone が落ちた原因そのもの。1.5 にすると面積が (1.5/2)^2 = 56% になって
//   **1枚あたり約13MB**まで下がる。粒子の演出なので輪郭の甘さは見分けにくい。
//   ⚠ **2か所（勝利演出・霧散）で同じ値が要る**ので、ここに1つだけ置いて両方が読む
//     （既定値を2か所に書くと必ずズレる＝このプロジェクトで何度も踏んだ形）。
//   ⚠ 上げたい時はこの数字だけを変える。canvas の作り方は触らない。
export const EFFECT_CANVAS_MAX_DPR = 1.5;

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
let peakTotalMB = 0;
// 画像＋canvas の合計のピーク（端末が苦しくなるのは合計なので、これが本命）
let peakAllMB = 0; // 【#543】さらに WebGL のテクスチャ・描画バッファ・音まで足した合計のピーク
// 🔴【#634】合成レイヤーの見積りのピーク（layerWeight 参照）。
//   ⚠ **allMB には足さない**——過去の報告（121 / 105MB）と比べられなくなる。別に持つ。
let peakLayersMB = 0;
let peakBackdropMB = 0;
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
// 🔴【#543・2026-11-10】**他のモジュールが「自分だけが知っている数字」を足せる口。**
//   勝利演出の後に落ちる報告が6回目になり、数えている量（画像・canvas）は下がり続けて
//   いるのに落ちる。⇒ **まだ数えていない所**（WebGLのテクスチャ・読み込んだ音・
//   ランク戦の待機）を足すために、各モジュールから小さな関数を登録してもらう。
//   ⚠ このファイルは**他のモジュールを一切 import しない**決まり（循環import/TDZ回避）なので、
//     こちらから取りに行くのではなく**向こうから登録してもらう**形にする。
//   ⚠ 登録する関数は**数字だけを返す**こと（重い走査はしない）。心拍（5秒ごと）で呼ばれる。
const probes = new Map();
export function registerBlackboxProbe(name, fn) {
  if (typeof name === "string" && typeof fn === "function") probes.set(name, fn);
}

// 🔴【#634・2026-11-14】合成レイヤーの見積り——**どの計器にも写っていなかった量**。
//   ここまで数えたのは <img> / canvas / WebGLテクスチャ / WebGL描画バッファ / 音だけ。
//   合計を 121 → 105MB まで下げても落ち続けたので、別の角度から測ったら在った:
//
//   実測（iPhone 932x430・dpr3・4人CPU戦。scratchpad/p634layers.mjs）
//     ・変形(3D)と preserve-3d で **常時 27MB 相当**が昇格している
//     ・勝利演出の間だけ **全画面の backdrop-filter が1枚**（名目 11.3MB）増える
//
//   🔴 backdrop-filter は「後ろを写し取ってから掛ける」ので、名目の面積では済まない。
//   iOS は写し取り＋ぼかしの往復ぶんバッファを持つので、実際は名目の2〜3倍。
//   ＝ここだけで 24〜35MB が、どの数字にも出ないまま乗っていた。
//
// ⚠ あくまで**見積り**。本物の合成レイヤーは JS から読めない（CDP の LayerTree も
//   ヘッドレスのソフト描画では空が返った）。狙いは「次の報告で桁が分かる」こと。
// ⚠ position:fixed だけでは昇格しないので**数えない**（最初の見積りはこれを混ぜて
//   57MB を盛っていた＝見積りを盛ると判断を誤る）。
// 🔴 **計器そのものが重かったので作りを直した（実測）。**
//   最初は「4秒に1回・全要素に getComputedStyle」で書いたが、実測で
//   **1回 60〜185ms**（中央60.9ms・900要素）掛かった。心拍は5秒ごと、しかも
//   noteBlackboxWeight は**勝利演出で canvas を張った瞬間**に走るので、
//   いちばん苦しい所でコマを落とす＝**計器が不具合を作る**。やめた。
//   ⇒ 2つに割った:
//     ① 変形・preserve-3d のぶん（実測19MBで**ほぼ動かない**＝盤面そのもの）
//        … **1セッションに1回だけ**測る（60秒の間引き＋値が取れたら測り直さない）
//     ② backdrop-filter のぶん（演出中だけ増える＝**ここが見たい**）
//        … 🔴 **全要素を舐めない。** style.css で backdrop-filter を持つのは
//        3か所だけなので、その**要素を名指しで**見る（DOM を数個引くだけ＝ほぼ無料）。
//   ⚠ 名指しなので、CSS に4か所目が増えたら数え落とす。
//     ⇒ `tools/check-css.mjs` が「backdrop-filter の宣言は3か所」を見張る。
const LAYER_SCAN_RETRY_MS = 60000;
const LAYER_SCAN_MAX_ELEMENTS = 1200;
// style.css で backdrop-filter を持つ要素。**2026-11-14 時点で宣言は6行・5か所。**
// 🔴 **全画面に掛かるのは .vic-veil と #home-match-choice だけ**＝ここが #634 の疑い。
//    残り3つは小さな帯（名前・言語トグル・称号）なので量としては誤差。
// ⚠ 一覧が古くなると数え落とす ⇒ tools/check-css.mjs が宣言の行数を見張る。
const BACKDROP_SELECTORS = [
  "#victory-celebration .vic-veil", // 🔴 全画面（勝利演出の WAIT〜PULSE の間だけ効く）
  "#home-match-choice", // 全画面のモーダル（ホームなので対局中は出ない）
  ".self-status-name",
  ".self-status-hand-count",
  ".opening-lang-toggle",
  ".my-page-fav-title",
];
let layer3dCache = null;
let layer3dAt = 0;
function scan3dLayers() {
  const now = Date.now();
  if (layer3dCache && now - layer3dAt < LAYER_SCAN_RETRY_MS) return layer3dCache;
  // 🔴 **「一度測ったら二度と測らない」にはできない。** 実測で踏んだ:
  //   起動直後（盤面がまだ無い）に測ると 6MB、対局が始まってから測ると 33MB。
  //   一度きりにすると**小さい方で固定**されて、肝心の対局中が分からない。
  //   ⇒ 60秒ごとに測り直す（60ms／分＝0.1%）。ピークは peakLayersMB が覚える。
  // ⚠ ただし**勝利演出の間は測らない**——そこがいちばんコマを落とせない瞬間で、
  //   しかも増えるのは backdrop の方（あちらは名指しなので毎回ただで取れる）。
  try {
    if (layer3dCache && document.getElementById("victory-celebration")) return layer3dCache;
  } catch {
    /* DOM が無い環境では気にしない */
  }
  const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const all = document.getElementsByTagName("*");
  const n = Math.min(all.length, LAYER_SCAN_MAX_ELEMENTS);
  let threeMB = 0;
  let promoted = 0;
  for (let i = 0; i < n; i++) {
    const el = all[i];
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const tr = cs.transform;
    const is3d = !!tr && tr !== "none" && (tr.indexOf("matrix3d") >= 0 || tr.indexOf("3d") >= 0);
    const pre3d = cs.transformStyle === "preserve-3d";
    if (!is3d && !pre3d) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    threeMB += r.width * dpr * r.height * dpr * 4 / 1048576;
    promoted++;
  }
  const t1 = typeof performance !== "undefined" && performance.now ? performance.now() : 0;
  layer3dCache = {
    layers3dMB: Math.round(threeMB),
    promotedCount: promoted,
    layerScanned: n,
    // 🔴 実機でこの走査がいくら掛かったかも残す（60ms を超えるなら作りを見直す合図）。
    layerScanMs: Math.round(t1 - t0),
  };
  layer3dAt = now;
  return layer3dCache;
}
function layerWeight() {
  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const three = scan3dLayers();
    let bdMB = 0;
    let bdCount = 0;
    for (const sel of BACKDROP_SELECTORS) {
      let list;
      try {
        list = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of list) {
        const cs = window.getComputedStyle(el);
        const on = (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
        // 透明なら実際には合成されない（.vic-veil は .is-hushed が付くまで opacity 0）。
        if (!on || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        bdCount++;
        bdMB += r.width * dpr * r.height * dpr * 4 / 1048576;
      }
    }
    return {
      // 🔴 名目の面積。iOS の実費はこの2〜3倍と見てよい（上のコメント参照）。
      backdropMB: Math.round(bdMB),
      backdropCount: bdCount,
      layersMB: Math.round(three.layers3dMB + bdMB),
      layers3dMB: three.layers3dMB,
      promotedCount: three.promotedCount,
      layerScanned: three.layerScanned,
      layerScanMs: three.layerScanMs,
    };
  } catch {
    return { layersMB: 0, layers3dMB: 0, backdropMB: 0, backdropCount: 0, promotedCount: 0, layerScanned: 0, layerScanMs: 0 };
  }
}

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
    const out = {
      imgMB: Math.round(bytes / 1048576),
      imgCount: count,
      canvasMB: Math.round(cBytes / 1048576),
      canvasCount: cCount,
      totalMB: Math.round((bytes + cBytes) / 1048576),
      domNodes: document.getElementsByTagName("*").length,
      audioEls: document.getElementsByTagName("audio").length,
      // 🔴【#543】**ランク戦の待機中かどうか。** 落ちた報告6件のうち #454 と #543 は
      //   どちらも「ランク戦の待機中にCPU練習で勝った」。待機中は裏で通信と巡回が
      //   動いているので、メモリだけの話ではない疑いがある。DOM を1つ見るだけ（軽い）。
      rankedWait: document.getElementById("ranked-practice-banner") ? 1 : 0,
      // 🔴【#634】合成レイヤーの見積り（layerWeight のコメント参照）。4秒に1回だけ測り直す。
      ...layerWeight(),
    };
    // 登録された計器を足す（1つ失敗しても他は残す）。
    for (const [name, fn] of probes) {
      try {
        const v = fn();
        if (v && typeof v === "object") for (const k of Object.keys(v)) out[name + "_" + k] = v[k];
      } catch {
        /* その計器だけ諦める */
      }
    }
    return out;
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
    // 🔴【#543・2026-11-10】**端末が本当に抱えている量**は、画像＋canvas だけではない。
    //   WebGL のテクスチャと描画バッファ（実測でこの2つだけで31MB）、デコード済みの音は
    //   `<img>` にも `<canvas>` にも写らない。⇒ それらも足した allMB を別に持つ。
    //   ⚠ **totalMB の意味は変えない**——過去の報告（79/48/54MB）と比べられなくなるため。
    const 計器MB = (weight.gl_texMB || 0) + (weight.gl_bufMB || 0) + (weight.snd_MB || 0);
    const allNow = totalNow + 計器MB;
    if (allNow > peakAllMB) peakAllMB = allNow;
    // 🔴【#634】合成レイヤーの見積り。allMB とは**足し合わせない**（上のコメント）。
    if ((weight.layersMB || 0) > peakLayersMB) peakLayersMB = weight.layersMB || 0;
    if ((weight.backdropMB || 0) > peakBackdropMB) peakBackdropMB = weight.backdropMB || 0;
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
      // 【#543】ここから下が 2026-11-10 に足した欄。
      allMB: allNow,
      peakAllMB,
      glTex: weight.gl_tex ?? null,
      glTexMB: weight.gl_texMB ?? null,
      glBufMB: weight.gl_bufMB ?? null,
      sndCount: weight.snd_count ?? null,
      sndMB: weight.snd_MB ?? null,
      // 🔴【#634・2026-11-14】ここから下が合成レイヤーの見積り。
      layersMB: weight.layersMB ?? null,
      peakLayersMB,
      layers3dMB: weight.layers3dMB ?? null,
      backdropMB: weight.backdropMB ?? null,
      peakBackdropMB,
      backdropCount: weight.backdropCount ?? null,
      promotedCount: weight.promotedCount ?? null,
      audioEls: weight.audioEls ?? null,
      rankedWait: weight.rankedWait ?? null,
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
  // 🔴【#543・2026-11-10】登録された計器（gl_* / snd_* など）と、新しく数えるように
  //   した欄（audioEls / rankedWait）も**そのまま載せる**。載せ忘れると「数えているのに
  //   報告に出ない」ことになり、続き643 で踏んだ穴とまったく同じになる。
  const 追加 = {};
  for (const k of Object.keys(w)) {
    if (k === "imgMB" || k === "canvasMB" || k === "canvasCount" || k === "totalMB") continue;
    if (k === "imgCount" || k === "domNodes") continue; // 既に bootReport 側で見ている
    追加[k] = w[k];
  }
  return {
    ...追加,
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
      // 【#543・2026-11-10】画像・canvas に写らない量。勝利演出の後に落ちる報告が6回目で、
      //   数えている量は下がり続けているのに落ちるため、**まだ数えていない所**を足した。
      prevAllMB: prev.allMB ?? null, // WebGL のテクスチャ・描画バッファ・音まで足した合計
      prevPeakAllMB: prev.peakAllMB ?? null,
      prevGlTex: prev.glTex ?? null,
      prevGlTexMB: prev.glTexMB ?? null,
      prevGlBufMB: prev.glBufMB ?? null,
      prevSndCount: prev.sndCount ?? null,
      prevSndMB: prev.sndMB ?? null,
      prevAudioEls: prev.audioEls ?? null,
      prevRankedWait: prev.rankedWait ?? null, // 🔴 ランク戦の待機中だったか（#454・#543 とも待機中）
      // 🔴【#634・2026-11-14】合成レイヤーの見積り（layerWeight のコメントに実測と根拠）。
      //   **allMB には足していない**ので、落ちた時の本当の負荷は
      //   prevPeakAllMB ＋ prevPeakLayersMB（backdrop ぶんはさらに2〜3倍）で読む。
      prevLayersMB: prev.layersMB ?? null,
      prevPeakLayersMB: prev.peakLayersMB ?? null,
      prevLayers3dMB: prev.layers3dMB ?? null,
      prevBackdropMB: prev.backdropMB ?? null,
      prevPeakBackdropMB: prev.peakBackdropMB ?? null,
      prevBackdropCount: prev.backdropCount ?? null,
      prevPromotedCount: prev.promotedCount ?? null,
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
