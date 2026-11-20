// カードの効果文の「下線」の仕組みが、生きているかを見る検査（続き763）。
//
// 🔴 **なぜ要るか**: この仕組みは今どのカードも使っていない（2026-11-19 時点）。
//   ユーザー判断で予言者の技は「ここまでを繰り返す」に戻したが、
//   「**この先、込み入った効果が出てきた時に役立つから覚えておいて**」という指示で残してある。
//   ⇒ **使われていないコードは、黙って壊れる。** 誰も気づかないまま、いざ使う日に動かない。
//     だから「繋がっているか」と「解析が正しいか」を毎回見る。
//
// 見るもの:
//   ① 解析が正しいか（**決め打ちの入力で確かめる**＝0しか出ない検査にしない）
//   ② 文を画面に出す2か所が、ちゃんとこの仕組みを通っているか
//   ③ 見た目（.card-face-u）と、霧散演出（canvas）の線が残っているか
//   ④ カードの文の中の `__` が**偶数個**か（閉じ忘れると、そこから行末まで下線になる）
//
// 使い方（次に下線を使う人へ）:
//   文のデータ（tools/*-text-source.json の「文」）で `__ここが下線__` と囲むだけ。
//   印が無い文は今までと1文字も変わらない。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { splitUnderlineRuns, stripCardMarkup, hasUnderlineMarkup } from "../src/card-text-markup.js";

const 根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 読む = (p) => fs.readFileSync(path.join(根, p), "utf8");
const 問題 = [];

// ⚠ **コメントの行は数えない**（説明文の中の名前で通ってしまう＝続き746
//   「コメントで通る検査は無い方がまし」）。
// 🔴 最初は全文から /* … */ と // … を消す形にしたが、**main.js では効かなかった**——
//   17000行のどこかで文字列の中の `/*` が「ブロックコメントの始まり」に見えて、以降を丸ごと飲んだ。
//   ⇒ **行ごとに見る**（素朴だが、この目的には十分で、壊れた時に分かりやすい）。
const 中身の行 = (s) =>
  s
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");

// ─── ① 解析そのもの（決め打ちの入力で確かめる）────────────────────────
const 例 = [
  ["あいうえお", [["あいうえお", false]], "あいうえお"],
  ["あ__いう__えお", [["あ", false], ["いう", true], ["えお", false]], "あいうえお"],
  ["__あい__うえお", [["あい", true], ["うえお", false]], "あいうえお"],
  ["あい__うえお__", [["あい", false], ["うえお", true]], "あいうえお"],
  ["あ__いうえお", [["あ", false], ["いうえお", true]], "あいうえお"], // 閉じ忘れ＝文は欠けない
  ["", [], ""],
];
for (const [入, 期, 素] of 例) {
  const 出 = splitUnderlineRuns(入).map((r) => [r.text, r.underline]);
  if (JSON.stringify(出) !== JSON.stringify(期)) {
    問題.push("解析がちがう: " + JSON.stringify(入) + " → " + JSON.stringify(出) + "（" + JSON.stringify(期) + " のはず）");
  }
  if (stripCardMarkup(入) !== 素) 問題.push("素の文がちがう: " + JSON.stringify(入) + " → " + JSON.stringify(stripCardMarkup(入)));
  // **並べ直しても文が欠けない**（下線を足したせいで1文字でも落ちたら致命的）
  const 繋 = splitUnderlineRuns(入).map((r) => r.text).join("");
  if (繋 !== stripCardMarkup(入)) 問題.push("並べ直すと文が変わる: " + JSON.stringify(入) + " → " + JSON.stringify(繋));
}
if (hasUnderlineMarkup("あいうえお") || !hasUnderlineMarkup("あ__い__う")) 問題.push("hasUnderlineMarkup の判定がちがう");

// ─── ② 画面に出す2か所が、この仕組みを通っているか ────────────────────
for (const [相対, 名] of [["src/card-renderer.js", "カードの面"], ["src/main.js", "カードの補足の箱"]]) {
  const s = 中身の行(読む(相対));
  if (!/from\s+["']\.\/card-text-markup\.js["']/.test(s)) 問題.push(名 + "（" + 相対 + "）が card-text-markup.js を取り込んでいない");
  if (!/splitUnderlineRuns\s*\(/.test(s)) 問題.push(名 + "（" + 相対 + "）が splitUnderlineRuns を呼んでいない");
  if (!/card-face-u/.test(s)) 問題.push(名 + "（" + 相対 + "）が .card-face-u で包んでいない");
}

// ─── ③ 見た目と、霧散演出の線 ──────────────────────────────────────
const css = 読む("src/style.css");
const i = css.indexOf(".card-face-u {");
if (i < 0) 問題.push("src/style.css に .card-face-u が無い");
else {
  const 塊 = css.slice(i, i + 400);
  if (!/text-decoration:\s*underline/.test(塊)) 問題.push(".card-face-u に text-decoration: underline が無い");
  // ⚠ 色の決め打ちは明暗2テーマで事故る（教訓15）。太さは em（字に付いていく＝#453・#569）。
  if (!/text-decoration-color:\s*currentColor/i.test(塊)) 問題.push(".card-face-u の線の色が currentColor でない（テーマで浮く）");
  if (!/text-decoration-thickness:\s*[\d.]+em/.test(塊)) 問題.push(".card-face-u の太さが em でない（字を大きくした時に取り残される）");
  if (!/text-decoration-skip-ink:\s*none/.test(塊)) 問題.push(".card-face-u に skip-ink: none が無い（線が途切れて帯に見えない）");
}
const cr = 中身の行(読む("src/card-renderer.js"));
if (!/querySelectorAll\(["']\.card-face-u["']\)/.test(cr)) 問題.push("霧散演出（canvas）が .card-face-u を探していない");
// 🔴 線の基準は baseline。続き762 でここを2回間違えて、字を横切った。
if (!/alphabeticBaseline/.test(cr)) 問題.push("canvas の下線が alphabeticBaseline を使っていない（基準を間違えると字を横切る）");
if (/fontBoundingBoxAscent/.test(cr)) 問題.push("canvas の下線が fontBoundingBoxAscent を使っている（textBaseline:top からの値なので線が 8px 高くなる）");

// ─── ④ カードの文の `__` が偶数個か ────────────────────────────────
let 使っている = 0;
for (const f of fs.readdirSync(path.join(根, "src")).filter((n) => /^card-text.*\.js$/.test(n))) {
  for (const m of 読む("src/" + f).matchAll(/"([a-z0-9-]+)":\s*\{([^\n]*)\}/g)) {
    const 数 = (m[2].match(/__/g) || []).length;
    if (数 === 0) continue;
    使っている++;
    if (数 % 2 !== 0) 問題.push(f + " の " + m[1] + " で下線の印が " + 数 + " 個（奇数＝閉じ忘れ。そこから行末まで下線になる）");
  }
}

// ─── ⑤ 行頭の絵の印（{白}{黒}）────────────────────────────────────
// 🔴 続き774 で足した。**使われていない仕組みは黙って壊れる**ので、ここで毎回見る。
const { splitLeadingIcon, inlineLineIconsAsText, LINE_ICONS } = await import(
  pathToFileURL(path.join(根, "src/card-text-markup.js")).href);
const 行例 = [
  ["ふつうの文。", null, "ふつうの文。"],
  ["{白}３マス以内。", "白", "３マス以内。"],
  ["{黒}手札をすべて捨てる。", "黒", "手札をすべて捨てる。"],
  ["{桃}知らない名前。", null, "{桃}知らない名前。"],
];
for (const [入, 名, 残] of 行例) {
  const r = splitLeadingIcon(入);
  const 実 = r.label;
  if (実 !== 名) 問題.push("行頭の印の読み取りがちがう: " + JSON.stringify(入) + " → " + JSON.stringify(実));
  if (r.text !== 残) 問題.push("行頭の印を外した残りがちがう: " + JSON.stringify(入) + " → " + JSON.stringify(r.text));
}
// 絵が出せない所では字に直す
if (inlineLineIconsAsText("{白}あ") !== "白：あ") 問題.push("inlineLineIconsAsText が字に直せていない");
if (inlineLineIconsAsText("{桃}あ") !== "{桃}あ") 問題.push("知らない名前まで直してしまっている");
// 出す所2か所に繋がっているか
if (!/splitLeadingIcon\s*\(/.test(cr)) 問題.push("カードの面（card-renderer.js）が splitLeadingIcon を呼んでいない");
const mj = 中身の行(読む("src/main.js"));
if (!/inlineLineIconsAsText\s*\(/.test(mj)) 問題.push("補足の箱（main.js）が inlineLineIconsAsText を呼んでいない（波かっこが画面に出る）");
// 絵のファイルが在るか
for (const [名, v] of Object.entries(LINE_ICONS)) {
  if (!fs.existsSync(path.join(根, v.icon))) 問題.push("行頭の印の絵が無い: " + 名 + " → " + v.icon);
}
// いま使っているカードの数（0 でも落とさない。増えたら分かるように出すだけ）
let 印を使っている = 0;
// ⚠ card-text-markup.js は**仕組みの方**（覚え書きに印が書いてある）なので数えない。
for (const fn of fs.readdirSync(path.join(根, "src"))
  .filter((n) => /^card-text.*\.js$/.test(n) && n !== "card-text-markup.js")) {
  印を使っている += (読む("src/" + fn).match(/\{(白|黒)\}/g) || []).length;
}
if (問題.length) {
  console.error("❌ カードの下線の仕組みに問題があります");
  for (const p of 問題) console.error("  - " + p);
  process.exit(1);
}
console.log("✅ 問題なし（解析 " + 例.length + " 例・出す所 2 か所・見た目と霧散演出・いま下線を使っているカード " + 使っている + " 枚" + "／行頭の印 " + 行例.length + " 例・絵 " + Object.keys(LINE_ICONS).length + " 種・使っている行 " + 印を使っている + " 行）");
