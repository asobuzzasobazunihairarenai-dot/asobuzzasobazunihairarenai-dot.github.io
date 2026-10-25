// お知らせ／更新情報（src/changelog.js）の機械的な検査。
//
// 【なぜ道具にしたか・続き619】これまで毎回**手で**走らせていた（「お知らせ ja/en 件数一致」）。
// 件数が合っていないと**画面が黙って旧表示に落ちる**（CLAUDE.md の作業ルール参照）ので、
// 気づかないまま公開されるのがいちばん怖い。GitHub Actions からも走らせる。
//
// 見るもの:
//   ① 日本語と英語の件数が同じか（summary / items / fixes / devItems）
//      ※英語を書いていない古い回は対象外（en の配列が無い回は、方針どおり日本語のまま出す）
//   ② summary と items の件数が同じか（違うと「詳細」の対応がズレる＝続き544）
//   ③ 日付の形（YYYY-MM-DD）と並び（新しい順）
//   ④ 本文が空の項目が無いか
//
// 終了コード: 0=合格 / 1=問題あり / 2=検査そのものが失敗
const FILE = "../src/changelog.js";
let CHANGELOG;
try {
  ({ CHANGELOG } = await import(FILE));
} catch (e) {
  console.error("❌ src/changelog.js を読み込めない: " + e.message);
  process.exit(2);
}
if (!Array.isArray(CHANGELOG) || CHANGELOG.length < 10) {
  console.error("❌ CHANGELOG が配列でない／短すぎる。検査が当たっていない疑い。");
  process.exit(2);
}

const problems = [];
const PAIRS = [
  ["summary", "summaryEn"],
  ["items", "itemsEn"],
  ["fixes", "fixesEn"],
  ["devItems", "devItemsEn"],
];
let prevDate = null;
for (const e of CHANGELOG) {
  const where = e.date || "(日付なし)";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) problems.push(where + ": 日付の形が YYYY-MM-DD でない");
  // 並び（新しい順）。同じ日付が複数あるのは正常（1日に2回出すことがある）。
  if (prevDate && e.date > prevDate) problems.push(where + ": 並びが新しい順になっていない（前は " + prevDate + "）");
  prevDate = e.date;

  for (const [ja, en] of PAIRS) {
    const a = e[ja] ?? [];
    const b = e[en] ?? [];
    if (b.length && a.length !== b.length) {
      problems.push(where + ": " + ja + " が " + a.length + " 件・" + en + " が " + b.length + " 件で合っていない");
    }
    for (const [i, s] of a.entries()) {
      if (typeof s !== "string" || !s.trim()) problems.push(where + ": " + ja + "[" + i + "] が空");
    }
    for (const [i, s] of b.entries()) {
      if (typeof s !== "string" || !s.trim()) problems.push(where + ": " + en + "[" + i + "] が空");
    }
  }
  const s = (e.summary ?? []).length;
  const it = (e.items ?? []).length;
  if (s && it && s !== it) {
    problems.push(where + ": summary が " + s + " 件・items が " + it + " 件で合っていない（画面が黙って旧表示に落ちる）");
  }
}

// ⑤ 【続き621】NEW の印の「署名」が、本文から計算した値と一致しているか。
// 🔴 本文（592KB）を起動時に読まないようにしたので、印の判断に必要な3つの数字を
// `src/changelog-signature.js` に**写してある**。同じ事実が2か所にあるので、ここで守る。
// ズレたら落ちて、**正しい値をそのまま出す**（直す時に迷わないように）。
let sigProblem = null;
try {
  const { computeChangelogSignature } = await import("../src/changelog.js");
  const { CHANGELOG_SIGNATURE } = await import("../src/changelog-signature.js");
  const want = computeChangelogSignature();
  if (CHANGELOG_SIGNATURE !== want) {
    sigProblem =
      "changelog-signature.js の CHANGELOG_SIGNATURE が古い。\n"
      + '      いま: "' + CHANGELOG_SIGNATURE + '"\n'
      + '      正解: "' + want + '"   ← これに書き換える';
  }
} catch (e) {
  sigProblem = "署名の照合ができなかった: " + e.message;
}
if (sigProblem) problems.push(sigProblem);

if (problems.length) {
  console.error("❌ お知らせに問題 " + problems.length + " 件");
  for (const p of problems) console.error("  ・" + p);
  process.exit(1);
}
const top = CHANGELOG[0];
const n = (k) => (top[k] ?? []).length;
console.log(
  "✅ 問題なし（" + CHANGELOG.length + " 回ぶん / 先頭 " + top.date
    + " = summary " + n("summary") + "・items " + n("items")
    + "・fixes " + n("fixes") + "/" + n("fixesEn")
    + "・devItems " + n("devItems") + "/" + n("devItemsEn") + "）"
);
