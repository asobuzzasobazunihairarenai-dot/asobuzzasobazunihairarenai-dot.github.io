// 🔴🔴【続き875】**全画面のページを実際に開いて、置き場所と大きさを機械で見る。**
//
// 【なぜ要るか】このアプリは **1600x900 のステージを画面に合わせて縮めて**描く。
// だから CSS に書いた `rem` も `vh` も **実画面の大きさにならない**（iPhone 横持ちの実測で
// 倍率 0.478 ＝ 1.4rem のボタンが **10.7px** になる）。この取り違えは
// **#453 #569 #721 #731 #741 #760 #796 #822 #824 #832 #848 #849 #857 #860 …**
// と**23回**報告として戻ってきた、このアプリでいちばん多い不具合の家族で、しかも
// **片方の端末では通ってしまう**（続き848 で実際に踏んだ: PC では偶然ずれていて気づけなかった）。
// ⇒ **人が気づく前に落とす**。grep では見つからない（CSS の書き方がページごとに違う）ので、
//    本当に開いて矩形で見る。
//
// 見るもの（スマホ横 932x430 と PC 1280x800 の**両方**）:
//   ① 上端の帯（⚙オプションのアイコン列）と重なる「押す物・読む字」が無いか
//      ＝続き857 で #827 を直した時の総点検を、そのまま常設にしたもの。
//   ② 押す物が実画面で **14px 未満**になっていないか
//      🔴 14 の根拠: **いま在るいちばん小さい押す物が 19.9px**（モーダルの ✕）なので、
//      14 は**今の設計を咎めない**。それより小さいものが出たら、それは
//      「ステージの縮小を打ち消し忘れた」＝上の家族そのもの（ⓘ が 10.7px だった）。
//      ⚠ **44px（指の目安）にはしない。** そこまで上げると数百件出て、
//        **大半は小さく描く前提のもの**（カードの面・袋に刷られた細字）。
//        **噪しい検査は、読まれなくなって意味を失う。**
//
// 🔴🔴【入れなかったもの・理由つき】「画面の外に出ていないか」は**入れていない**。
//   続き875 で作ってみたら **98件**出たが、**全部まちがい**だった:
//   **閉じた `<details>` の中の要素も矩形を返す**（Chrome は閉じた details を
//   `content-visibility` で畳むので、`display:none` にはならない）。図鑑の「用語集」が
//   まさにそれで、閉じたアコーディオンの中身を「画面の外にある」と数えていた。
//   ⚠ **この罠はここだけの話ではない。** これからこのリポジトリで「画面に出ているか」を
//     矩形で測る時は、必ず下の `見えているか()` と同じ除外をすること。
//
// 終了コード: 0=合格 / 1=問題あり / 2=検査そのものが失敗（空振り・開けない）
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const PORT = Number(process.env.SO7_LAYOUT_PORT || 8787);
const 押す物の下限 = 14; // 実画面px（根拠は冒頭）

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".ico": "image/x-icon", ".txt": "text/plain",
};

// 開く全画面ページ（名前・選び方・モジュール・関数・引数）
const ページ = [
  ["パックを開ける", "#card-pack-panel", "/src/card-pack-ui.js", "openCardPackPanel", [true]],
  ["マイ山札", "#my-stack-panel", "/src/my-stack-editor.js", "openMyStackEditor", []],
  ["図鑑", "#codex-page", "/src/codex-page.js", "openCodexPage", []],
  ["ランキング", "#ranking-page", "/src/ranking-page.js", "openRankingPage", []],
  ["マイデッキ一覧", "#my-deck-list-page", "/src/my-deck-list.js", "openMyDeckList", []],
  ["山札一覧", "#deck-viewer-panel", "/src/deck-viewer.js", "openDeckViewer", []],
  ["エディション選択", "#edition-chooser", "/src/edition-select-ui.js", "openEditionChooser", [{ 試験も: true }]],
];

const 持ち物 = {
  balance: 2300, packs: 2, wildShards: 0, wildCards: 0, onlyShards: 0, onlyCards: 0,
  cards: { "ex0-red-beginning": 2 }, daily: [], weekly: { wins: 7, claimed: 1, steps: [3, 7, 12] },
};

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p.replace(/^\//, ""));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(fp));
});
await new Promise((r) => srv.listen(PORT, r));

const 問題 = [];
let 見た要素 = 0, 開けたページ = 0;
const 例外 = [];

const 測る = async (ラベル, W, H, スマホ) => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  // 通信は要らない（持ち物は下で差し込む）。本番へ触りにいかせない。
  await ctx.route((u) => /supabase\.co/.test(String(u)), (r) => r.abort());
  await ctx.addInitScript(() => {
    for (const k of ["so7-intros-all-off", "so7-bgm-intro-shown-v1", "so7-disable-update-checker",
      "so7-opening-setup-never", "so7-alpha-notice-never", "so7-tutorial-completed"]) {
      try { localStorage.setItem(k, "1"); } catch (e) {}
    }
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => 例外.push(ラベル + ": " + String(e.message).slice(0, 120)));
  await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "commit", timeout: 180000 });
  page.setDefaultTimeout(180000);
  await page.waitForFunction(() => !!document.querySelector("#option-area"), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => import("/src/opening-screen.js").then((m) => m.forceCloseOpeningScreen?.()).catch(() => {}));
  // ⚠ スマホの見え方は**クラスで**作る（ヘッドレスでは端末の判定が付かない＝続き767 の教訓）。
  if (スマホ) await page.evaluate(() => document.body.classList.add("is-phone-device"));
  await page.evaluate(async (持ち物) => {
    const cp = await import("/src/card-packs.js");
    cp.registerCollectionTransport({
      isLoggedIn: () => true, getCollection: async () => 持ち物, buyPack: async () => 持ち物,
      openPack: async () => ({ drawn: [], collection: 持ち物 }), redeemWildcard: async () => 持ち物,
      claimDailyChallenge: async () => 持ち物, claimWeekly: async () => 持ち物,
    });
    await cp.refreshCollection();
  }, 持ち物);
  await page.waitForTimeout(600);

  const 全部の選 = ページ.map(([, s]) => s);
  for (const [名, 選, mod, fn, 引数] of ページ) {
    const r = await page.evaluate(async ([選, mod, fn, 引数, 全部の選, 下限]) => {
      for (const s of 全部の選) { const e = document.querySelector(s); if (e) e.style.display = "none"; }
      let 開けた = true;
      try { const m = await import(mod); await m[fn](...引数); } catch (e) { 開けた = false; }
      await new Promise((x) => setTimeout(x, 900));
      const 画面 = document.querySelector(選);
      if (!画面 || getComputedStyle(画面).display === "none") return { 開けた, 出た: false };

      // 🔴🔴 **本当に画面に出ているか。** 矩形だけでは足りない（冒頭の「入れなかったもの」）。
      const 見えているか = (e) => {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") return false;
        if (parseFloat(cs.opacity) < 0.05) return false;
        let p = e;
        while (p && p !== document.body) {
          // 閉じた <details> の中は、畳まれているのに矩形を返す
          if (p.tagName === "DETAILS" && !p.open) return false;
          const pcs = getComputedStyle(p);
          if (pcs.contentVisibility === "hidden") return false;
          if (pcs.display === "none" || pcs.visibility === "hidden") return false;
          p = p.parentElement;
        }
        return true;
      };
      const 名前 = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")
        + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "");

      // 帯の下端（#option-area のアイコン列。地は擬似要素なので要素としては拾えない
      // ＝**幅いっぱいの帯**として「下端より上か」で見る＝続き857 の教訓）。
      let 帯下 = 0;
      for (const e of document.querySelectorAll("#option-area *")) {
        if (!見えているか(e)) continue;
        const b = e.getBoundingClientRect();
        if (b.width > 2 && b.height > 2 && b.top < 120 && b.bottom > 帯下) 帯下 = b.bottom;
      }

      const 重なり = [], 小さい = [];
      let 数えた = 0, いちばん小さい = Infinity, いちばん小さいの = null;
      for (const e of 画面.querySelectorAll("button, a, [role=button], h1, h2, h3, h4, p, span, div, label")) {
        if (!見えているか(e)) continue;
        const b = e.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        const 押す物 = /^(BUTTON|A)$/.test(e.tagName) || e.getAttribute("role") === "button";
        let 直の字 = "";
        for (const n of e.childNodes) if (n.nodeType === 3) 直の字 += n.nodeValue;
        直の字 = 直の字.replace(/\s+/g, " ").trim();
        if (!押す物 && !直の字) continue;
        数えた++;

        // ① 帯と重なる（子が押す物を抱えている入れ物は、子の方で数える）
        if (b.top < 帯下 && (押す物 || !e.querySelector("button, a"))) {
          重なり.push(名前(e) + "「" + 直の字.slice(0, 18) + "」 y" + Math.round(b.y) + " < 帯 " + Math.round(帯下));
        }
        // ② 押す物の大きさ（実画面px。getBoundingClientRect は縮めた**後**の矩形）
        if (押す物) {
          const 短辺 = Math.min(b.width, b.height);
          if (短辺 < いちばん小さい) { いちばん小さい = 短辺; いちばん小さいの = 名前(e); }
          if (短辺 < 下限) 小さい.push(名前(e) + "「" + 直の字.slice(0, 18) + "」 " + (Math.round(短辺 * 10) / 10) + "px");
        }
      }
      return {
        開けた, 出た: true, 数えた, 重なり, 小さい,
        最小: Number.isFinite(いちばん小さい) ? Math.round(いちばん小さい * 10) / 10 : null, 最小の: いちばん小さいの,
      };
    }, [選, mod, fn, 引数, 全部の選, 押す物の下限]);

    if (!r.出た) { console.log("  ⓘ " + ラベル + " / " + 名 + " … この土台では開けない（検査しない）"); continue; }
    開けたページ++;
    見た要素 += r.数えた;
    for (const x of r.重なり) 問題.push(ラベル + " / " + 名 + ": 上端の帯に潜っている … " + x);
    for (const x of r.小さい) 問題.push(ラベル + " / " + 名 + ": 押す物が " + 押す物の下限 + "px 未満 … " + x);
    console.log("  ・" + ラベル + " / " + 名 + " … 見た " + r.数えた + " 個／いちばん小さい押す物 "
      + (r.最小 === null ? "—" : r.最小 + "px（" + r.最小の + "）"));
  }
  await br.close();
};

try {
  await 測る("スマホ横", 932, 430, true);
  await 測る("PC", 1280, 800, false);
} catch (e) {
  console.error("❌ 検査そのものが転んだ: " + (e && e.message ? e.message : e));
  srv.close();
  process.exitCode = 2;
}
srv.close();

if (process.exitCode !== 2) {
  // 🔴 **空振りを合格にしない。** 開けないページばかり／要素を1つも見ていない時は 2。
  if (開けたページ < 8) {
    console.error("❌ 開けたページが " + 開けたページ + " 枚しか無い（2機種 × 7枚＝14枚のはず）。土台が壊れている");
    process.exitCode = 2;
  } else if (見た要素 < 200) {
    console.error("❌ 見た要素が " + 見た要素 + " 個しか無い（数え方が壊れている）");
    process.exitCode = 2;
  } else if (問題.length) {
    console.error("❌ 置き場所・大きさの問題が " + 問題.length + " 件");
    for (const x of 問題) console.error("  ・" + x);
    console.error("  ⚠ このアプリは 1600x900 のステージを縮めて描く。`rem` は実画面の大きさにならない。");
    console.error("    固定の小物は `var(--stage-scale)` で割るか、`body.is-phone-device` で大きくする");
    console.error("    （先例: style.css の `.modal-close-x` / `#ranking-page-info-btn`）。");
    process.exitCode = 1;
  } else {
    console.log("✅ 問題なし（" + 開けたページ + " 枚ぶん（2機種 × " + ページ.length + " 画面）・要素 " + 見た要素 + " 個を見た。"
      + "帯との重なり 0／押す物 " + 押す物の下限 + "px 未満 0）");
    if (例外.length) console.log("  ⚠ ページの例外: " + 例外.slice(0, 3).join(" / "));
  }
}
