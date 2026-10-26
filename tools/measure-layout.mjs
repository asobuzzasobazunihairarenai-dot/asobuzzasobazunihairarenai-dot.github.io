// 画面の文字の大きさ・押しやすさ・見切れを測る物差し。
//
// 【なぜ作ったか・続き628】スマホの「文字が小さい」「見切れる」はこのアプリで**繰り返し**
// 報告されている。そのたびに使い捨てのプローブを書き直していて、**毎回同じ罠を踏み直していた**。
//
// 🔴 **実際の報告が何を問題にしていたかに絞ってある**（最初に全要素を測る形で作ったら、
//    盤面の札（長押しで読む設計＝0.7px）や背景が大量に混ざって肝心の発見が埋もれた）:
//   - #403「中央のモーダル、スマホだと文字小さいかも」 → **開いているパネルの中の文字**
//   - #408「サマリーの✕が小さい／少しスクロールする」 → **押すものの大きさ**と**パネルのはみ出し**
//   - #412「複数捨てるモーダルの下のボタンが見切れる」 → **巻かれて見えなくなっているボタン**
//   - #413「マイデッキ選択がスマホで横に出きらない」 → **パネルの幅と画面に収まっているか**
//
// 🔴 **測り方がこのアプリ特有で、素朴にやると必ず間違える。**
//   ① 1600x900 の「ステージ」を縮めて描くので、**CSS の px を見ても実際の見え方は分からない**
//      （iPhone 横持ち 932x430 ではステージ倍率 0.478）。
//   ② さらに**パネルごとに `transform: scale()` が掛かっていることがある**
//      （ヘルプ・ロック選択・カードのメモは2倍、管理者パネルは1.45倍＝続き576 で実測）。
//      ステージ倍率だけで割ると**2倍ずれる**。
//   → 正しい式は **実画面px = CSSのpx × 実効倍率**、実効倍率は
//     **`getBoundingClientRect().width / offsetWidth`**（途中の変形が全部入る）。
//      この道具は要素ごとにこれを計算し、**実効倍率も一緒に出す**（2倍の罠に気づけるように）。
//   ③ **動きが終わる前に測ると誤報が出る**（続き589 で実際に「画面外」と誤報した）。
//      だから画面を開いてから必ず待つ。
//   ④ **測る範囲は「いちばん手前に開いているパネル」に絞る。** 背後の盤面まで測ると、
//      設計どおり小さいもの（長押しで読む札）が一覧を埋め尽くす。
//
// 🔴 **この道具は合否を出さない（`npm run check` に入れない）。** 「何px以上」は好みの問題で、
//    2026-10-12 に**大きくした所をユーザーの判断で全部戻した**（続き585「する前のがよかった」）。
//    道具は**数字と、前回からの変化**だけを出す。直すかどうかは人が決める。
//
// 🔴 **いちばん使うのは `--baseline`（前回との差分）。** 「はみ出し30px」は**元からある行の
//    高さの丸め誤差**で、私の変更のせいではないことが何度もあった（続き576・585）。
//    前後で比べれば「新しく増えた分」だけが見える。**落ちた＝自分が壊した、と決めない。**
//
// 使い方:
//   node tools/measure-layout.mjs                          … 全画面・iPhone横持ちで測る
//   node tools/measure-layout.mjs --device pc              … 端末像を変える
//   node tools/measure-layout.mjs --screen home,help       … 画面を絞る
//   node tools/measure-layout.mjs --out a.json             … 保存する
//   node tools/measure-layout.mjs --baseline a.json        … 前回と比べて変化だけ出す
//   node tools/measure-layout.mjs --all                    … 小さい文字を全部出す（既定は8件）
//   node tools/measure-layout.mjs --list                   … 測れる画面と端末像の一覧
//
// ⚠ ログインが要る画面（ショップ・デッキ構築・ランキング・オンライン）は**測れない**
//    （私はログインできない）。実機で見て教えてもらうしかない。
// ⚠ 本番の訪問記録・不具合報告の書き込みは止めて測る（本番の数字を汚さないため＝続き589）。
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const AS_JSON = argv.includes("--json");
const SHOW_ALL = argv.includes("--all");

// 端末像。**低い画面（320）も用意する**——iPhone 横持ちで Safari の上下のバーが出ている時が
// これで、倍率が 0.478 → 0.356 に落ちる＝同じ文字が25%小さく見える（続き578 で実測）。
const DEVICES = {
  phone: { width: 932, height: 430, mobile: true, label: "iPhone 横持ち" },
  "phone-short": { width: 932, height: 320, mobile: true, label: "iPhone 横持ち（上下のバーあり）" },
  tablet: { width: 1180, height: 820, mobile: true, label: "タブレット" },
  pc: { width: 1280, height: 800, mobile: false, label: "PC" },
};
const UA_PHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// 測れる画面。`open` はページの中で走らせる式。**export 名はコードから写してある**
// （推測で書いて2回外した＝続き608・628）。ログインの要る画面は入れていない。
const SCREENS = {
  opening: { label: "オープニング（通常）", root: "#opening-screen" },
  trial: { label: "試遊の入口", query: "?trial=gm", root: "#opening-screen" },
  home: {
    label: "ホーム画面",
    open: `const m = await import("/src/home-screen.js"); m.openHomeScreen();`,
    root: "#home-screen",
  },
  help: { label: "ヘルプ", open: `const m = await import("/src/help.js"); m.openHelpPanel();`, root: "#help-panel" },
  changelog: {
    label: "お知らせ／更新情報",
    open: `const m = await import("/src/changelog.js"); m.openChangelogModal({ admin: false });`,
    root: "#changelog-modal",
  },
  summary: {
    label: "サマリー（早見表）",
    open: `const m = await import("/src/summary-sheet.js"); m.openSummarySheet();`,
    root: "#summary-sheet-panel",
  },
  mypage: { label: "マイページ", open: `const m = await import("/src/my-page.js"); m.openMyPage();`, root: "#my-page-panel" },
  deckviewer: { label: "山札一覧", open: `const m = await import("/src/deck-viewer.js"); m.openDeckViewer();`, root: "#deck-viewer-panel" },
  options: { label: "基本設定（オプション）", open: `document.getElementById("options-menu-button")?.click();`, root: "#options-menu-panel" },
  board: {
    label: "対局中の盤面（CPU戦4人）",
    open: `const c = await import("/src/cpu-battle.js"); await c.startCpuBattle(4); await c.runCpuBattleSetup({ count: 4 });
           try { const o = await import("/src/opening-screen.js"); o.forceCloseOpeningScreen?.(); } catch (e) {}`,
    root: "#phase-guide-bar",
    slow: true,
  },
};

if (argv.includes("--list")) {
  console.log("測れる画面:");
  for (const [k, v] of Object.entries(SCREENS)) console.log(`  ${k.padEnd(12)} ${v.label}`);
  console.log("\n端末像:");
  for (const [k, v] of Object.entries(DEVICES)) console.log(`  ${k.padEnd(12)} ${v.label}（${v.width}x${v.height}）`);
  process.exit(0);
}

const deviceKey = argOf("device", "phone");
const device = DEVICES[deviceKey];
if (!device) {
  console.error(`端末像 "${deviceKey}" は知らない。--list で一覧。`);
  process.exit(2);
}
const wanted = argOf("screen", "") ? argOf("screen", "").split(",").map((s) => s.trim()) : Object.keys(SCREENS);
for (const w of wanted) {
  if (!SCREENS[w]) {
    console.error(`画面 "${w}" は知らない。--list で一覧。`);
    process.exit(2);
  }
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav" };
const PORT = 8787 + Math.floor(Math.random() * 200);
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p.replace(/^\//, ""));
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(fp));
});
await new Promise((r) => server.listen(PORT, r));

// ページの中で走らせる測定本体。`hintRoot` が渡されればそれを測る範囲にし、
// 無ければ「いちばん手前に開いているパネル」を自分で探す。
const MEASURE = (hintRoot) => `(() => {
  const HINT = ${JSON.stringify(hintRoot || null)};
  const vw = window.innerWidth, vh = window.innerHeight;
  const cs = (el) => getComputedStyle(el);
  const visible = (el) => {
    const s = cs(el), r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity || "1") > 0.05 && r.width > 8 && r.height > 8;
  };
  // ④ 測る範囲を決める。**いちばん手前に開いているもの**を測る。
  let root = null, rootWhy = "";
  let hintMissing = false;
  if (HINT) {
    root = document.querySelector(HINT);
    if (root && visible(root)) rootWhy = "指定(" + HINT + ")";
    else { root = null; hintMissing = true; } // 🔴 開かなかった／隠れている。黙って別のものを測らない。
  }
  // 🔴 ここから下は「指定が無い／見つからない時」の最後の手段。**当てにしない。**
  //    最初は自動検出だけで作ったが、**毎回アイコン列（#option-area・z=50100）を選んで**
  //    どの画面も「文字0種」になった。測る範囲は画面ごとに明示するのが正しい（上の root）。
  if (!root) {
    let best = null, bestZ = -1;
    for (const el of document.querySelectorAll("body > div, body > section, body > aside")) {
      if (!visible(el)) continue;
      const s = cs(el);
      if (s.position !== "fixed" && s.position !== "absolute") continue;
      // 覆い（中身の無い膜）は測る対象ではない
      if (el.querySelectorAll("*").length < 3) continue;
      if (el.id === "option-area" || el.id === "phase-guide-bar") continue; // 常設の操作列は対象外
      const z = parseInt(s.zIndex, 10);
      const zz = Number.isFinite(z) ? z : 0;
      if (zz >= bestZ) { bestZ = zz; best = el; }
    }
    if (best) { root = best; rootWhy = "いちばん手前(z=" + bestZ + ")"; }
  }
  if (!root) { root = document.body; rootWhy = "body（開いているパネルが見つからない）"; }

  const label = (el) => {
    const id = el.id ? "#" + el.id : "";
    const c = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "";
    return (el.tagName.toLowerCase() + id + c).slice(0, 56);
  };
  const scaleOf = (el) => { const w = el.offsetWidth; return w > 0 ? el.getBoundingClientRect().width / w : null; };
  // 巻かれて隠れる親を探す（#412「下のボタンが見切れる」の判定に使う）
  const scrollParent = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = cs(p);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && p.scrollHeight > p.clientHeight + 2) return p;
      p = p.parentElement;
    }
    return null;
  };
  const out = { 範囲: label(root), 範囲の決め方: rootWhy + (hintMissing ? " ← 🔴 指定した " + HINT + " が見つからない／隠れている" : ""), 文字: [], 押すもの: [], 見切れ: [], パネル: null };
  {
    const r = root.getBoundingClientRect();
    out.パネル = {
      箱: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(","),
      画面に対する幅: Math.round((r.width / vw) * 100) + "%",
      画面に対する高さ: Math.round((r.height / vh) * 100) + "%",
      画面内: r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1,
      はみ出し: Math.max(0, root.scrollHeight - root.clientHeight),
      倍率: (() => { const s = scaleOf(root); return s === null ? null : Number(s.toFixed(3)); })(),
    };
  }
  for (const el of root.querySelectorAll("*")) {
    if (!visible(el)) continue;
    const s = cs(el);
    const r = el.getBoundingClientRect();
    const sc = scaleOf(el);
    if (sc === null) continue;
    // 自分が直接持っている文字だけ見る（子の文字を二重に数えない）
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (own) {
      const css = parseFloat(s.fontSize);
      out.文字.push({
        label: label(el),
        text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 26),
        cssPx: Number(css.toFixed(2)),
        realPx: Number((css * sc).toFixed(2)),
        scale: Number(sc.toFixed(3)),
      });
    }
    // 押すもの（#408「✕が小さい」）: 実画面での高さ・幅
    const clickable = el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("role") === "button";
    if (clickable) {
      out.押すもの.push({
        label: label(el),
        text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 18),
        幅: Math.round(r.width),
        高さ: Math.round(r.height),
      });
      // #412: 巻かれる親の見える範囲から外れていないか（＝押せないボタン）
      const sp = scrollParent(el);
      if (sp) {
        const pr = sp.getBoundingClientRect();
        if (r.bottom > pr.bottom + 1 || r.top < pr.top - 1) {
          const k = label(el) + "|" + label(sp);
          const hit = out.見切れ.find((y) => y.key === k);
          if (hit) hit.同じもの++;
          else out.見切れ.push({ key: k, label: label(el), text: (el.textContent || "").trim().slice(0, 18), 親: label(sp), 同じもの: 1 });
        }
      }
    }
  }
  // 同じ見た目のものはまとめる（札の名前が20件並ぶと肝心の発見が埋もれる）。
  {
    const seen = new Map();
    for (const x of out.文字) {
      const k = x.label + "|" + x.cssPx;
      if (seen.has(k)) seen.get(k).同じもの++;
      else seen.set(k, Object.assign({ 同じもの: 1 }, x));
    }
    out.文字 = [...seen.values()];
  }
  out.文字.sort((a, b) => a.realPx - b.realPx);
  // 同じ見た目のものはまとめる（「詳細」が26個並ぶと肝心の発見が埋もれる）。
  {
    const seen = new Map();
    for (const x of out.押すもの) {
      const k = x.label + "|" + x.幅 + "x" + x.高さ;
      if (seen.has(k)) seen.get(k).同じもの++;
      else seen.set(k, Object.assign({ 同じもの: 1 }, x));
    }
    out.押すもの = [...seen.values()];
  }
  out.押すもの.sort((a, b) => a.高さ - b.高さ);
  return out;
})()`;

const browser = await chromium.launch();
const results = {};
const errsAll = {};
for (const key of wanted) {
  const sc = SCREENS[key];
  const ctx = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    userAgent: device.mobile ? UA_PHONE : undefined,
    hasTouch: !!device.mobile,
    isMobile: !!device.mobile,
    deviceScaleFactor: 1,
  });
  await ctx.route((u) => /supabase|so7_visit_log|so7_log_visit|so7_bug_reports/.test(String(u)), (r) => r.abort());
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("so7-disable-update-checker", "1");
      // 起動時の案内・サウンドの初回設定が重なると下のモーダルに触れないので出さない。
      // ⚠ **鍵の名前はコードから写した**（opening-setup-modal.js / first-run-bgm.js）。
      //    推測で書いたら2つとも外していた（続き608・628 と同じ失敗）。
      localStorage.setItem("so7-opening-setup-never", "1");
      localStorage.setItem("so7-bgm-intro-shown-v1", "1");
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html${sc.query || ""}`, { waitUntil: "commit" });
  for (let i = 0; i < 400; i++) {
    await page.waitForTimeout(50);
    const ok = await page
      .evaluate(() => {
        const el = document.querySelector("#opening-screen, .opening-screen");
        return !!el && el.getBoundingClientRect().height > 50;
      })
      .catch(() => false);
    if (ok) break;
  }
  if (sc.open) {
    try {
      await page.evaluate(`(async () => { ${sc.open} })()`);
    } catch (e) {
      errs.push("画面を開けなかった: " + String(e?.message ?? e));
    }
  }
  // 🔴 **動きが終わってから測る**（続き589: 出てくる途中を掴んで「画面外」と誤報した）
  await page.waitForTimeout(sc.slow ? 3000 : 1200);
  let m = null;
  try {
    m = await page.evaluate(MEASURE(sc.root));
  } catch (e) {
    errs.push("測れなかった: " + String(e?.message ?? e));
  }
  results[key] = m;
  errsAll[key] = errs;
  await ctx.close();
}
await browser.close();
server.close();

const payload = { device: deviceKey, viewport: `${device.width}x${device.height}`, screens: results };
const outPath = argOf("out", null);
if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 1));
  if (!AS_JSON) console.log(`保存した: ${outPath}`);
}
if (AS_JSON) {
  console.log(JSON.stringify(payload, null, 1));
  process.exit(0);
}

const basePath = argOf("baseline", null);
let base = null;
if (basePath) {
  try {
    base = JSON.parse(fs.readFileSync(basePath, "utf8"));
  } catch (e) {
    console.error(`🔴 前回の記録が読めない: ${basePath}`);
    process.exit(2);
  }
  if (base.device !== deviceKey) {
    console.error(`🔴 前回の記録は端末像 "${base.device}" のもの。同じ端末像で比べること。`);
    process.exit(2);
  }
}

const LIMIT = SHOW_ALL ? 999 : 8;
console.log(`端末像: ${device.label}（${device.width}x${device.height}）`);
if (base) console.log(`前回と比べる: ${basePath}`);
for (const key of wanted) {
  const r = results[key];
  const sc = SCREENS[key];
  console.log(`\n### ${sc.label}（${key}）`);
  if (!r) {
    console.log("  🔴 測れなかった");
  } else {
    const p = r.パネル;
    console.log(`  測った範囲: ${r.範囲}  ${r.範囲の決め方}`);
    console.log(`  箱 ${p.箱}  画面に対して 幅${p.画面に対する幅}・高さ${p.画面に対する高さ}  画面内 ${p.画面内 ? "はい" : "🔴 いいえ"}  はみ出し ${p.はみ出し}px  倍率 ${p.倍率}`);
    const small = r.文字.filter((x) => x.realPx < 11);
    const tiny = r.押すもの.filter((x) => x.高さ < 28);
    console.log(`  文字 ${r.文字.length}種（11px未満 ${small.length}種）/ 押すもの ${r.押すもの.length}個（高さ28px未満 ${tiny.length}個）/ 巻かれる中に居るボタン ${r.見切れ.length}種`);
    // 🔴 倍率が1.3超＝そのパネルは拡大されている。上限（max-height 等）を触る時は倍率で割る。
    const bigScale = r.文字.filter((x) => x.scale > 1.3);
    if (bigScale.length) console.log(`  ⚠ 拡大されている部品が ${bigScale.length}種（倍率 最大 ${Math.max(...bigScale.map((x) => x.scale))}）＝寸法を触る時は倍率で割る`);
    for (const x of small.slice(0, LIMIT))
      console.log(`    小 ${String(x.realPx).padStart(6)}px  ${x.label} "${x.text}"${x.同じもの > 1 ? "（同じもの " + x.同じもの + "個）" : ""}`);
    for (const x of tiny.slice(0, LIMIT))
      console.log(`    押しにくい ${x.幅}x${x.高さ}  ${x.label} "${x.text}"${x.同じもの > 1 ? "（同じもの " + x.同じもの + "個）" : ""}`);
    // ⚠ **これは誤報であり得る。** 長い一覧（お知らせ等）は下に続くのが正常。
    //    問題になるのは #412 のように**決定のボタン（確定・これで捨てる）が巻かれて見えない**時。
    for (const x of r.見切れ.slice(0, 3))
      console.log(`    ？ 巻かれる中  ${x.label} "${x.text}"${x.同じもの > 1 ? "（同じもの " + x.同じもの + "個）" : ""}（親 ${x.親}）`);
    if (r.見切れ.length) console.log(`      ⚠ 長い一覧なら正常。決定のボタンが含まれていないかだけ見る。`);
    if (base?.screens?.[key]) {
      const b = base.screens[key];
      const same = (a, c) => a.label === c.label && a.text === c.text;
      const newSmall = small.filter((x) => !(b.文字 || []).some((y) => same(x, y) && y.realPx < 11));
      const fixedSmall = (b.文字 || []).filter((y) => y.realPx < 11 && !small.some((x) => same(x, y)));
      const newCut = r.見切れ.filter((x) => !(b.見切れ || []).some((y) => y.label === x.label));
      const boxChanged = b.パネル && b.パネル.箱 !== p.箱;
      console.log(`  --- 前回との差 ---`);
      console.log(`  新しく11px未満: ${newSmall.length}種 / 直った: ${fixedSmall.length}種 / 新しい見切れ: ${newCut.length}個 / パネルの箱 ${boxChanged ? `変わった（前 ${b.パネル.箱}）` : "同じ"}`);
      for (const x of newSmall.slice(0, 5)) console.log(`    🔴 新 ${x.realPx}px  ${x.label} "${x.text}"`);
      for (const x of newCut) console.log(`    🔴 新 見切れ  ${x.label} "${x.text}"`);
    }
  }
  const e = errsAll[key] || [];
  if (e.length) console.log(`  例外 ${e.length}件: ${e.slice(0, 2).join(" / ")}`);
}
console.log("\n⚠ この道具は合否を出さない。何px以上にするかは好みの問題で、2026-10-12 に大きくした所を");
console.log("  ユーザーの判断で戻している（続き585）。数字を見て、直すかどうかは人が決める。");
console.log("⚠ ログインが要る画面（ショップ・デッキ構築・ランキング・オンライン）は測れない。");
