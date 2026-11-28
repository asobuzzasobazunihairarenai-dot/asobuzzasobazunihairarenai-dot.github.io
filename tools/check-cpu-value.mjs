// 🔴🔴【続き875】**CPU の値踏みが「静かに転ぶ」のを、実行で見張る。**
//
// 【なぜ要るか・#745】報告「なんか止まってしまいました！」の正体は、
// `cpu-brain.js` の志炎者の分岐に書いた **`t` という存在しない引数**だった。
// あれは **200ms おきに ReferenceError を投げ続け**、**CPU が一歩も動けず対局が丸ごと止まる**
// のに、画面には何の説明も出ない。
//
// 🔴 **いまある検査では捕まらない**（2通り試して2通りとも素通りした）:
//   ・`check-missing-import` … よその export を**呼んで**いるかしか見ない
//   ・`check-engine-names`   … エンジンの中の**呼び出し**しか見ない
//   ・`check-undeclared`     … **代入**しか見ない
//   `t` は**呼び出しでも代入でもなく、ただの引数**。しかも同じ関数の中に `(t) => …` という
//   本物の arrow 引数が別に在るので、**スコープを見ない検査はどれも「宣言済み」と判断する**。
//   ⇒ **静的検査では無理**と分かったので、**実際に走らせて見る**。
//
// 🔴 **スモークでも捕まらない。** あちらは既定（リメイク）の山札で2人CPU戦を回すだけなので、
//   **その山に出ない札の分岐**（志炎者・旧0th・1st …）は一度も通らない。#745 はまさにそれ。
//   ⇒ ここでは **手札に入り得る札を1枚ずつ**値踏みさせて、**全部の分岐**を1回ずつ通す。
//
// 【見かた】本物の2人CPU戦を立て、CPU の手札の札の `cardId` を1枚ずつ入れ替えて
//   `chooseHandEffectCard` を呼ぶ。`cpu-brain` は1枚ごとに try/catch して
//   `console.error("[cpu-brain] 値踏みで例外", …)` を出す（続き803 で入れた保険）ので、
//   それを拾う。
//   🔴 **落とすのは ReferenceError（と、それに類する「名前が無い」系）だけ。**
//     ここは作り物の盤面なので、他の例外（null を読んだ等）は**こちらの段取りのせい**の
//     ことがある。**噪しい検査は読まれなくなる**ので、言い切れるものだけ落とす。
//     ⚠ それ以外の例外は ⓘ として**数と中身を必ず出す**（黙って捨てない）。
//
// 終了コード: 0=合格 / 1=問題あり / 2=検査そのものが失敗（空振り・立ち上がらない）
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const PORT = Number(process.env.SO7_CPUVAL_PORT || 8788);
const 読む = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

// 手札に入り得る札（check-hand-skip.mjs と同じ組み方。片方だけ増えないように名簿を見比べる）
const cd = await 読む("src/cards-data.js");
const ex0 = await 読む("src/cards-data-ex0.js");
const ed1 = await 読む("src/cards-data-1st.js");
const o0 = await 読む("src/cards-data-0th.js");
const cf = await 読む("src/cards-data-cf.js");
const 組 = [
  ["リメイク 通常", cd.NORMAL_CARDS], ["リメイク エターナル", cd.ETERNAL_CARDS], ["リメイク ファースト", cd.FIRST_CARDS],
  ["0th拡張", ex0.EX0_NORMAL_CARDS], ["1st 通常", ed1.FIRST_ED_NORMAL_CARDS],
  ["1st エターナル", ed1.FIRST_ED_ETERNAL_CARDS], ["1st ファースト", ed1.FIRST_ED_FIRST_CARDS],
  ["旧0th", o0.OLD0TH_NORMAL_CARDS], ["志炎者", cf.CF_NORMAL_CARDS],
];
const 札 = [];
for (const [, list] of 組) for (const c of list || []) if (c?.id) 札.push(c.id);
if (札.length < 100) {
  console.error("❌ 検査そのものが怪しい: 見る札が " + 札.length + " 枚しかない（カードの表が読めていない）");
  process.exit(2);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".ico": "image/x-icon", ".txt": "text/plain",
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

let 結果 = null;
const br = await chromium.launch();
try {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route((u) => /supabase\.co/.test(String(u)), (r) => r.abort());
  await ctx.addInitScript(() => {
    for (const k of ["so7-intros-all-off", "so7-bgm-intro-shown-v1", "so7-disable-update-checker",
      "so7-opening-setup-never", "so7-alpha-notice-never", "so7-tutorial-completed"]) {
      try { localStorage.setItem(k, "1"); } catch (e) {}
    }
  });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "commit", timeout: 180000 });
  page.setDefaultTimeout(180000);
  await page.waitForFunction(() => !!document.querySelector("#option-area"), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => import("/src/opening-screen.js").then((m) => m.forceCloseOpeningScreen?.()).catch(() => {}));

  結果 = await page.evaluate(async (札) => {
    // 🔴 本物の対局を立てる（`startCpuBattle` だけでは駒が1つも置かれない＝続き870 の教訓）。
    const cpu = await import("/src/cpu-battle.js");
    await cpu.startCpuBattle(2);
    await cpu.runCpuBattleSetup({ count: 2, askDeck: false });
    await new Promise((x) => setTimeout(x, 2200));
    const st = await import("/src/state.js");
    const brain = await import("/src/cpu-brain.js");

    // 値踏みに渡す「本物のトークン」を1枚用意する（state の中に在る札でないと、
    // 盤面を引く分岐が本物の道を通らない）。
    const 席を探す = () => {
      const s = st.getState();
      for (const p of ["A", "B", "C", "D"]) {
        const t = (s.tokens || []).find((x) => x.kind === "card" && x.location.zone === "hand" && x.location.player === p);
        if (t) return { seat: p, token: t };
      }
      return null;
    };
    let 的 = 席を探す();
    if (!的) {
      st.drawFromPile("deck", { zone: "hand", player: "C" });
      的 = 席を探す();
    }
    if (!的) return { 立たない: true };

    // console.error を預かる（cpu-brain は1枚ごとに try/catch して、ここへ出す）。
    const 拾った = [];
    const 元 = console.error;
    console.error = (...a) => { try { 拾った.push(a.map((x) => (x && x.stack ? String(x.stack).split("\n")[0] : String(x))).join(" ")); } catch (e) {} };
    const 元の札 = 的.token.cardId;
    const 出 = [];
    for (const id of 札) {
      拾った.length = 0;
      的.token.cardId = id;
      try {
        brain.chooseHandEffectCard([的.token], 的.seat);
      } catch (err) {
        // ここへ抜けるのは cpu-brain の保険より外＝**その場で対局が止まる**形
        拾った.push("保険の外: " + String(err && err.stack ? String(err.stack).split("\n")[0] : err));
      }
      for (const 行 of 拾った) 出.push({ id, 行 });
    }
    的.token.cardId = 元の札;
    console.error = 元;
    return { 見た: 札.length, 席: 的.seat, 出 };
  }, 札);
} catch (e) {
  console.error("❌ 検査そのものが転んだ: " + (e && e.message ? e.message : e));
  process.exitCode = 2;
}
await br.close();
srv.close();

if (process.exitCode !== 2) {
  if (!結果 || 結果.立たない) {
    console.error("❌ 対局が立たず、1枚も値踏みできなかった（空振りを合格にしない）");
    process.exitCode = 2;
  } else if (!結果.見た || 結果.見た < 100) {
    console.error("❌ 見た札が " + (結果.見た || 0) + " 枚しかない（数え方が壊れている）");
    process.exitCode = 2;
  } else {
    // 「名前が無い」系だけを落とす（冒頭の理由）。
    const 名前が無い = 結果.出.filter((x) => /ReferenceError|is not defined|Can't find variable/i.test(x.行));
    const その他 = 結果.出.filter((x) => !/ReferenceError|is not defined|Can't find variable/i.test(x.行));
    if (名前が無い.length) {
      console.error("❌ CPU の値踏みで「名前が無い」例外が " + 名前が無い.length + " 件");
      for (const x of 名前が無い.slice(0, 10)) console.error("  ・" + x.id + " … " + x.行);
      console.error("  ⚠ これは #745 と同じ形。**対局が丸ごと止まる**（CPU が一歩も動けない）。");
      console.error("    cpu-brain.js のその札の分岐で、存在しない名前（多くは引数の書き間違い）を使っている。");
      process.exitCode = 1;
    } else {
      console.log("✅ 問題なし（手札に入り得る " + 結果.見た + " 枚を1枚ずつ値踏みさせて、"
        + "「名前が無い」例外 0 件。席 " + 結果.席 + "）");
      if (その他.length) {
        console.log("  ⓘ それ以外の例外 " + その他.length + " 件（作り物の盤面のせいのことがあるので落とさない）:");
        for (const x of その他.slice(0, 5)) console.log("     ・" + x.id + " … " + x.行);
      }
    }
  }
}
