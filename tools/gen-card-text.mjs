// カード効果テキスト.txt を cardId -> {basic, arrival, hand, flavor} に構造化するパーサ（検証用）。
//
// 🔴 **このツールは既定では何も書かない（続き756）。**
//   以前は走らせるだけで src/card-text.ja.js を上書きしていたので、**カードの効果が
//   黙って巻き戻る**罠があった（続き748 で見つけたまま、人が git diff を読む約束で守っていた）。
//   いまは:
//     ・引数なし        … 差分を出すだけ（**何も書かない**）
//     ・--write        … 書く。ただし**ふりがな以外が動く差分**が1つでもあれば止める
//     ・--write --force … それも押し通す（本当に txt を正にしたい時だけ）
//
//   ⓘ **効果文は公開中の src/card-text.ja.js が正**（アプリで遊ばれている文）。
//     手元の txt はアナログ版の控えなので、**ずれていてよい**。ずれは報告の材料
//     （memory の art-director-report-queue）であって、直すべき不具合ではない。
//     2026-11-17 時点の既知のずれ:
//       - pink-party  🔴 選択肢が別物。txt「場の任意の２枚をオープンする。」／
//                     公開中「相手１人を１マス移動させ、その相手は移動先の到達効果を得ない。」
//                     ⇒ **公開中の方が今テスト中の案**（ユーザー明言）。txt へ戻さないこと。
//       - orange-mass-change / white-radiance / first-noir 「このカード」↔「これ」の言い回し
//
import { readFileSync } from "node:fs";

// ⚠ 元のテキストは git 管理外（アナログ版の中身そのもの）。**ワークツリーには無い**ので、
//   大元のフォルダを指す道を用意しておく（続き748）。例:
//   SO7_CARD_TEXT="D:/7 SHADES OF SEVEN remake デジタル版/カード効果　テキスト.txt" node tools/gen-card-text.mjs
const TXT = process.env.SO7_CARD_TEXT || "./カード効果　テキスト.txt";

// cards-data.js の名前↔id（手打ちで転記。パーサ検証専用）。
const NAME_TO_ID = {
  "ジャンプ台": "red-jump-pad",
  "カウンターロック": "red-counter-lock",
  "マスチェンジ": "orange-mass-change",
  "収穫と種まき": "orange-harvest-sow",
  "手品師の技 -スリカエ-": "yellow-sleight-of-hand",
  "ザ・ギャンブル": "yellow-gamble",
  "合同建設": "green-joint-construction",
  "増殖する樹々": "green-growing-trees",
  "スラム上がりの役人": "blue-slum-official",
  "選べる罠": "blue-choosable-trap",
  "パーティー": "pink-party",
  "プレゼント": "pink-present",
  "試練の儀式": "purple-trial-ritual",
  "ゴメンナサイッ！": "purple-sorry",
  "なないろの欠片": "rainbow-shard",
  "なないろの巨光": "white-radiance",
  "白の意思の覚醒": "white-awakening",
  "色落ちキャット": "black-faded-cat",
  "誘惑の黒の烙印": "black-contract-brand",
  "黒の契約の烙印": "black-contract-brand", // 旧名
  "紅蓮の火山 ワイナウエア": "eternal-red",
  "禁断の果実 マルメゴ": "eternal-orange",
  "黄金の宮殿 ドムス・ネロ": "eternal-yellow",
  "奇跡の森 マンズウッド": "eternal-green",
  "月下の漂流船 プリドゥエン": "eternal-blue",
  "結ばれの一本桜 コノハナサクヤ": "eternal-pink",
  "終わりなき化学 ゲンテクニーク": "eternal-purple",
  "赤のキューブ フェニックス": "first-red",
  "橙のキューブ ハーベスト": "first-orange",
  "黄のキューブ サフラン": "first-yellow",
  "緑のキューブ ヴァーディアン": "first-green",
  "青のキューブ セレスティア": "first-blue",
  "桃のキューブ セレナーデ": "first-pink",
  "紫のキューブ ディメンション": "first-purple",
  "黒のキューブ ノワール": "first-noir",
};

const norm = (s) => s.replace(/[\s\u3000]/g, "").replace(/[－ー−]/g, "-");
const idByNorm = new Map(Object.entries(NAME_TO_ID).map(([n, id]) => [norm(n), id]));

const raw = readFileSync(TXT, "utf8");
const lines = raw.split(/\r?\n/);

const SEP = /^[＿_]{3,}$/;
const result = {};
let cur = null;
let inNote = false;
let activeSection = null; // 直近に見た ● or ■（効果セクション中の "・" 選択肢はここに追記）

const append = (id, key, text) => { result[id][key] += (result[id][key] ? "\n" : "") + text; };

let pendingRuby = ""; // "・名前"行の直前にある全角スペース始まりの読み行（例: "　ぐれん　かざん"）
let pendingRuby字下げ無し = ""; // 🔴 下の【取りこぼし】参照
const RUBY_LINE = /^[ 　]+\S/; // 行頭が空白（半角/全角）で始まる
const HAS_KANA = /[぀-ゟ]/;
const KANJI_RE = /[一-鿿々〆〇]/;
const KANA_ONLY = /^[ぁ-ゖァ-ヺーｰ\s　]+$/; // かなと空白だけで出来た行

// 名前の中の「漢字のかたまり」の数（card-renderer.js の applyTitleRuby と同じ数え方）。
// 読みの数がこれと合わないと、画面では**黙ってルビ無しに落ちる**。
const 漢字のかたまり数 = (name) => {
  let n = 0, i = 0;
  while (i < name.length) {
    const k = KANJI_RE.test(name[i]);
    let j = i + 1;
    while (j < name.length && KANJI_RE.test(name[j]) === k) j++;
    if (k) n++;
    i = j;
  }
  return n;
};
const 読みの数 = (s) => String(s || "").split(/[\s　]+/).filter(Boolean).length;
const ルビの問題 = [];
const ルビ無し = [];

for (const line of lines) {
  const t = line.trim();
  if (SEP.test(t)) { cur = null; inNote = false; activeSection = null; pendingRuby = ""; pendingRuby字下げ無し = ""; continue; }
  // ふりがな行: "・名前"の直前、行頭が空白で、ひらがなを含み、マーカーで始まらない行を保留する。
  if (!inNote && RUBY_LINE.test(line) && HAS_KANA.test(t) && !t.startsWith("・") && !/^[★●■ΩΘ※]/.test(t)) {
    pendingRuby = t; pendingRuby字下げ無し = ""; continue;
  }
  // 🔴【取りこぼし】元のテキストでは**字下げを忘れている**ふりがな行がある
  //   （「結ばれの一本桜」「誘惑の黒の烙印」の2件。印刷カードにはルビが在るのに、
  //   上の規則に当たらず titleRuby が空のまま出ていた＝続き748 で見つけた）。
  //   字下げ無しでも拾うが、拾うのは **カードとカードの間（区切り線の後＝cur が無い所）**だけ。
  //   ⚠ カードの本文の中で拾うと、**かなだけの折り返し行を飲み込んで文が欠ける**。
  //   さらに**かなと空白だけの行**で、しかも**読みの数が次に来るカード名の
  //   漢字のかたまり数とぴったり合う**時だけ採る（勝手な拾い過ぎを防ぐ）。
  if (!cur && !inNote && !pendingRuby && t && KANA_ONLY.test(t) && !t.startsWith("・")) {
    pendingRuby字下げ無し = t; continue;
  }
  if (t.startsWith("・")) {
    const text = t.slice(1).trim();
    // 効果セクション中（●や■の後）の "・" は選択肢＝そのセクションへ追記。それ以外は新カード名。
    if (cur && activeSection && !inNote) { append(cur.id, activeSection, "・" + text); pendingRuby = ""; pendingRuby字下げ無し = ""; continue; }
    const id = idByNorm.get(norm(text));
    cur = id ? { id, name: text } : null;
    inNote = false; activeSection = null;
    if (id) {
      const かたまり = 漢字のかたまり数(text);
      let ruby = pendingRuby;
      if (!ruby && pendingRuby字下げ無し && かたまり > 0 && 読みの数(pendingRuby字下げ無し) === かたまり) {
        ruby = pendingRuby字下げ無し; // 字下げを忘れている行を拾った
      }
      if (ruby && 読みの数(ruby) !== かたまり) {
        ルビの問題.push("ふりがなの数が合わない: " + id + "「" + text + "」漢字のかたまり " + かたまり + " ／ 読み " + 読みの数(ruby) + "（" + ruby + "）");
      }
      if (!ruby && かたまり > 0) ルビ無し.push(id + "「" + text + "」");
      result[id] = { flavor: "", basic: "", subtitle: "", arrival: "", hand: "", titleRuby: ruby };
    }
    else if (text) console.warn("UNMATCHED name:", JSON.stringify(text));
    pendingRuby = ""; pendingRuby字下げ無し = "";
    continue;
  }
  pendingRuby = ""; pendingRuby字下げ無し = "";
  if (!cur) continue;
  if (t.startsWith("※")) { inNote = true; activeSection = null; continue; }
  if (inNote) continue;
  if (t.startsWith("Ω")) result[cur.id].flavor = t.slice(1).trim();
  else if (t.startsWith("Θ")) { result[cur.id].subtitle = t.slice(1).trim(); activeSection = null; }
  else if (t.startsWith("★")) { append(cur.id, "basic", t.slice(1).trim()); activeSection = "basic"; }
  else if (t.startsWith("●")) { append(cur.id, "arrival", t.slice(1).trim()); activeSection = "arrival"; }
  else if (t.startsWith("■")) { append(cur.id, "hand", t.slice(1).trim()); activeSection = "hand"; }
  else if (activeSection && t) { append(cur.id, activeSection, t); } // 折り返しの続き行
}

// ===== ふりがなの検算（続き748）=====
// 読みの数が「漢字のかたまり」の数と合っていないと、画面では**黙ってルビ無しに落ちる**。
// 間違いに気づけないので、ここで止める。
if (ルビの問題.length) {
  console.error("🔴 ふりがながおかしい " + ルビの問題.length + " 件:");
  for (const p of ルビの問題) console.error("  " + p);
  process.exit(2);
}
// ⚠ こちらは**止めない**（ファーストの8枚のように、印刷カードにも元からルビが無いものがある）。
//   ただし黙らせない——増えたら元のテキストを疑うこと。
console.log("ふりがな: 付いた " + Object.values(result).filter((r) => r.titleRuby).length + " 件");
if (ルビ無し.length) console.log("ふりがなが無い（漢字を含む題名）" + ルビ無し.length + " 件: " + ルビ無し.join(" / "));

const ids = Object.keys(result);
console.log("matched cards:", ids.length);
const expected = new Set(Object.values(NAME_TO_ID));
const missing = [...expected].filter((id) => !result[id]);
console.log("missing (expected but not parsed):", missing);

// サンプル出力
for (const id of ["red-jump-pad", "red-counter-lock", "first-red", "eternal-pink", "rainbow-shard"]) {
  console.log("\n---", id, "---");
  console.log(JSON.stringify(result[id], null, 2));
}

// --- src/card-text.js を生成 ---
import { writeFileSync } from "node:fs";
const ORDER = [
  "red-jump-pad","red-counter-lock","orange-mass-change","orange-harvest-sow",
  "yellow-sleight-of-hand","yellow-gamble","green-joint-construction","green-growing-trees",
  "blue-slum-official","blue-choosable-trap","pink-party","pink-present",
  "purple-trial-ritual","purple-sorry","rainbow-shard","white-radiance","white-awakening",
  "black-faded-cat","black-contract-brand",
  "eternal-red","eternal-orange","eternal-yellow","eternal-green","eternal-blue","eternal-pink","eternal-purple",
  "first-red","first-orange","first-yellow","first-green","first-blue","first-pink","first-purple","first-noir",
];
const q = (s) => JSON.stringify(s || "");
let out = `// AUTO-GENERATED（カード効果　テキスト.txt から tools/gen-card-text.mjs で生成）。手編集しないこと。\n`;
out += `// カード面に重ねて表示する「表示用テキスト（日本語）」。★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω) /\n`;
out += `// subtitle(Θ能力名《》) / titleRuby(ふりがな)。多言語化の ja（原本＝印字カードと一致）。\n`;
out += `// 言語切替は src/card-text.js（ディスパッチャ）が行う。別言語は card-text.<lang>.js を同じ cardId キーで追加。\n`;
out += `// カード名は日本語は cards-data.js（アプリ全体の正）を使うため、この ja ファイルには持たせない\n`;
out += `// （非ja言語のファイルだけが name フィールドを持つ）。\n`;
out += `export const CARD_TEXT_JA = {\n`;
for (const id of ORDER) {
  const r = result[id];
  if (!r) { console.warn("ORDER missing in result:", id); continue; }
  out += `  ${JSON.stringify(id)}: { flavor: ${q(r.flavor)}, titleRuby: ${q(r.titleRuby)}, basic: ${q(r.basic)}, subtitle: ${q(r.subtitle)}, arrival: ${q(r.arrival)}, hand: ${q(r.hand)} },\n`;
}
out += `};\n`;
// --- 🔴 書く前に、いま公開されている文と突き合わせる（続き756）---
//   既定は**何も書かない**。ふりがな以外が動く差分が在るなら、--write でも止める。
const 書く = process.argv.includes("--write");
const 押し通す = process.argv.includes("--force");

let 公開中 = null;
try {
  公開中 = (await import("../src/card-text.ja.js")).CARD_TEXT_JA;
} catch (err) {
  console.warn("⚠ 公開中の src/card-text.ja.js を読めませんでした（初回生成？）: " + String(err).slice(0, 80));
}

const 欄 = ["flavor", "titleRuby", "basic", "subtitle", "arrival", "hand"];
const 差分 = [];
if (公開中) {
  for (const id of ORDER) {
    const 新 = result[id];
    const 旧 = 公開中[id];
    if (!新 || !旧) { 差分.push({ id, 欄: "(カードそのもの)", 旧: 旧 ? "在る" : "無い", 新: 新 ? "在る" : "無い" }); continue; }
    for (const k of 欄) {
      const a = 旧[k] || "";
      const b = 新[k] || "";
      if (a !== b) 差分.push({ id, 欄: k, 旧: a, 新: b });
    }
  }
}

const ふりがな以外 = 差分.filter((d) => d.欄 !== "titleRuby");
if (差分.length === 0) {
  console.log("\n✅ 手元の txt と公開中の文は同じ（差分 0）");
} else {
  console.log("\n=== 手元の txt と公開中の文の差分 " + 差分.length + " 件（ふりがな " + (差分.length - ふりがな以外.length) + " / その他 " + ふりがな以外.length + "）===");
  for (const d of 差分) {
    console.log("  " + (d.欄 === "titleRuby" ? "ふりがな" : "🔴 " + d.欄) + "  " + d.id);
    console.log("      公開中: " + JSON.stringify(d.旧).slice(0, 110));
    console.log("      txt   : " + JSON.stringify(d.新).slice(0, 110));
  }
}

if (!書く) {
  console.log("\nⓘ **何も書いていません**（既定）。書くなら --write を付けてください。");
  console.log("   ⚠ 効果文は**公開中の src/card-text.ja.js が正**です。手元の txt はアナログ版の控えなので、");
  console.log("     上の「🔴」が付いた差分は**そのままでよい**ことが多い（既知のずれはこのファイルの冒頭に）。");
} else if (ふりがな以外.length > 0 && !押し通す) {
  console.error("\n🔴 **書きませんでした。** ふりがな以外が動く差分が " + ふりがな以外.length + " 件あります:");
  for (const d of ふりがな以外) console.error("   - " + d.id + " / " + d.欄);
  console.error("   ⇒ 上の差分を1件ずつ読んで、**公開中の文を本当に txt の方へ戻していいか**を確かめてください。");
  console.error("     戻していいと決めたら --write --force を付けます（カードの効果が変わります）。");
  process.exit(1);
} else {
  if (押し通す && ふりがな以外.length > 0) {
    console.warn("\n⚠⚠ --force で押し通します。**カードの効果文が " + ふりがな以外.length + " 件変わります。**");
  }
  writeFileSync("./src/card-text.ja.js", out, "utf8");
  console.log("\nwrote src/card-text.ja.js (" + ORDER.length + " cards)");
}
