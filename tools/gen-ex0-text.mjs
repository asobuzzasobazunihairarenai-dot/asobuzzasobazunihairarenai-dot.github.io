// 0th拡張の「カードの文」と「カードのデータ」を書き出す。
//
//   node tools/gen-ex0-text.mjs
//
// 【文の出どころ】tools/ex0-text-source.json。アーティファクト「0th拡張 効果文の直し」で
//   ユーザーと1枚ずつ確認して固めた**直したあとの文**を、そのまま写したもの。
//   🔴 文を直す時は、まずアーティファクト側を直してから、この json を更新する。
//
// 【なぜ card-text.ja.js に直接書かないか】あのファイルは
//   tools/gen-card-text.mjs が「カード効果　テキスト.txt」から**丸ごと上書きして作る**。
//   0th拡張の分を書き足しても、次に誰かがあれを走らせた瞬間に**黙って消える**。
//   だから別ファイル（card-text-ex0.*.js）に分け、card-text.js で混ぜる。
//
// 【英語】いまは**カード名だけ**。効果文は空にしてあり、card-text.js の設計どおり
//   空のフィールドは日本語のまま出る（部分翻訳を許す作り）。訳せたらここへ足す。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EX0_CARDS, EX0_NAME_EN, checkEx0Cards } from "./ex0-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "tools/ex0-text-source.json");

const 点検 = checkEx0Cards();
if (点検.問題.length) {
  console.error("🔴 カード一覧がおかしい:");
  for (const p of 点検.問題) console.error("  " + p);
  process.exit(2);
}
if (!fs.existsSync(SRC)) {
  console.error("🔴 文の出どころが無い: tools/ex0-text-source.json");
  process.exit(2);
}
const 元 = JSON.parse(fs.readFileSync(SRC, "utf8"));
const 元by = new Map(元.map((x) => [x.no, x]));

// 色寄せの笛（15〜21）は元の表では1つの塊。7色ぶんに配る。
const 元を引く = (no) => 元by.get(no) || (Number(no) >= 15 && Number(no) <= 21 ? 元by.get("15〜21") : null);

// ===== 題名のふりがな（ルビ）=====
// 🔴 出どころは**印刷データそのもの**:
//   G:\マイドライブ\Adobeクラウド書き出し\ゲーム\7 SHADES OF SEVEN\★コンポーネント\
//     カード （0th）拡張\ ①②③⑤_表_入稿用（0th拡張）*.ai（アウトライン化済み＝文字は字形）
//   文字は取り出せない（部分フォントに ToUnicode が無い）ので、pdf.js で描いて1枚ずつ読んだ。
//   ⇒ scratchpad/_ai_pages.mjs ／ _title_strips.mjs（続き748）。
//
// 書き方は card-text-1st.ja.js と同じで、**漢字のかたまりごとの読みを全角スペース区切り**。
//   例「迷いの森」＝ 迷 と 森 の2かたまり ⇒ "まよ　もり"
// 先頭の "*" は**題名ぜんぶに1つ**のルビ（固有名の読み。印刷カードがそう振っている）。
const EX0_TITLE_RUBY = {
  "ex0-orange-bus": "",                    // オレンジバス（漢字なし）
  "ex0-yellow-reach-cancel": "",           // リーチキャンセル（漢字なし）
  "ex0-green-lost-forest": "まよ　もり",
  "ex0-blue-appraiser": "かんていし　わざ", // 印字は「鑑定士の技 -ブルーアイズ-」（名前だけ後で変わった）
  "ex0-pink-wish-for-peace": "へいわ　ねが",
  // ⚠ 印字は「隠し財産」で、「足下の」はアプリ側で後から付いた名前。
  //    よって「あしもと」だけは**印刷カードに無い**（読みは自明なのでこちらで補った）。
  "ex0-purple-hidden-fortune": "あしもと　かく　ざいさん",
  "ex0-red-beginning": "あか",
  "ex0-orange-bus-stop": "",               // バスストップ（漢字なし）
  "ex0-yellow-gate-charge": "",            // ゲートチャージ（漢字なし）
  "ex0-green-creation": "だいちそうぞう",
  "ex0-blue-strict-watch": "げんじゅうけいかい",
  "ex0-pink-mystic-fruit": "ふしぎ　かじつ",
  "ex0-purple-redo-key": "なお",
  "ex0-flute-red": "いろよ　ふえ",
  "ex0-flute-orange": "いろよ　ふえ",
  "ex0-flute-yellow": "いろよ　ふえ",
  "ex0-flute-green": "いろよ　ふえ",
  "ex0-flute-blue": "いろよ　ふえ",
  "ex0-flute-pink": "いろよ　ふえ",
  "ex0-flute-purple": "いろよ　ふえ",
  "ex0-red-joyner": "はし　びと　そうじゅつ",
  "ex0-orange-mccool": "いのうしゃ",
  "ex0-yellow-little-mouse": "だいとうぞく　てぐせ",
  "ex0-green-peterhood": "もり　たみ　にちじょう",
  "ex0-blue-jake": "れきしか　きおくじゅつ",
  "ex0-pink-yaeza": "みわく",
  "ex0-purple-vivian": "こうえん",
  "ex0-white-pure-burger": "",             // ピュアバーガー（漢字なし）
  "ex0-white-someones-shadow": "だれ　しろ",
  "ex0-white-dragon": "*ノクスアエル",      // 題名ぜんぶに1つ（印刷カードがそう振っている）
  "ex0-black-bad-burger": "",              // バッドバーガー（漢字なし）
  "ex0-black-vood-contract": "ぞく　けいやく",
  "ex0-red-crimson-fist": "くれない　てっけん",
};

// 🔴 card-renderer.js の applyTitleRuby と**同じ数え方**で、読みの数が合うかをここで検める。
//   合っていないと画面では**黙ってルビ無しに落ちる**（＝間違いに気づけない）ので、
//   作る時に止める。
const KANJI_RE = /[一-鿿々〆〇]/;
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

const J = (s) => JSON.stringify(s);
const 問題 = [];
const ja = [];
const en = [];
const data = [];

for (const c of EX0_CARDS) {
  const src = 元を引く(c.no);
  if (!src) { 問題.push("文が見つからない: " + c.id + "（no " + c.no + "）"); continue; }
  const t = src.文;
  if (!t.arrival && !t.hand) 問題.push("到達も手札も空: " + c.id);

  const ruby = EX0_TITLE_RUBY[c.id];
  if (ruby === undefined) 問題.push("ふりがなの欄が無い: " + c.id + "（EX0_TITLE_RUBY に足す）");
  if (ruby && !ruby.startsWith("*")) {
    const 読み数 = ruby.split(/[\s　]+/).filter(Boolean).length;
    const かたまり = 漢字のかたまり数(c.name);
    if (読み数 !== かたまり) {
      問題.push("ふりがなの数が合わない: " + c.id + "「" + c.name + "」漢字のかたまり " + かたまり + " ／ 読み " + 読み数 + "（" + ruby + "）");
    }
  }

  // 色寄せの笛は「これと同色の」なので、7色ぶん同じ文でよい（色は枠と色データが持つ）。
  ja.push(
    "  " + J(c.id) + ": { flavor: " + J(t.flavor || "") + ", titleRuby: " + J(ruby || "") + ", basic: " + J(t.basic || "") +
    ", subtitle: \"\", arrival: " + J(t.arrival || "") + ", hand: " + J(t.hand || "") + " },"
  );

  const nameEn = EX0_NAME_EN[c.id];
  if (!nameEn) 問題.push("英語名が無い: " + c.id);
  en.push(
    "  " + J(c.id) + ": { name: " + J(nameEn || c.name) +
    ", flavor: \"\", basic: \"\", subtitle: \"\", arrival: \"\", hand: \"\" },"
  );

  // 補足（「補足: 」の頭は落として1本につなぐ）
  // 🔴 「補足:」で始まる行だけを採る。アーティファクトの notes には**私の作業メモ**
  //   （「フォルダ名は〜」「画像素材のフォルダ名が〜」等）も混ざっていて、
  //   それをそのまま入れるとアプリのカード補足に開発の内輪話が出てしまう。
  const note = (src.notes || [])
    .filter((n) => /^補足[:：]/.test(n))
    .map((n) => n.replace(/^補足[:：]\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
  data.push(
    "  { id: " + J(c.id) + ", name: " + J(c.name) + ", color: " + J(c.color) +
    ", count: " + c.count + (c.only ? ", only: true" : "") + ", note: " + J(note || "特になし。") + " },"
  );
}

if (問題.length) {
  console.error("🔴 " + 問題.length + " 件:");
  for (const p of 問題) console.error("  " + p);
  process.exit(1);
}

const 頭ja =
  "// 0th拡張（0th EDITION 拡張）のカード面テキスト（日本語）。\n" +
  "//\n" +
  "// 🔴 **card-text.ja.js とは別のファイルにしてある。** あちらは tools/gen-card-text.mjs が\n" +
  "//   「カード効果　テキスト.txt」から丸ごと上書きして作るので、ここに書き足すと次の生成で消える。\n" +
  "//   card-text.js（言語ディスパッチャ）が両方を混ぜて引く。\n" +
  "//\n" +
  "// 文の出どころは tools/ex0-text-source.json（アーティファクトで1枚ずつ確認して固めたもの）。\n" +
  "// 作り直すには node tools/gen-ex0-text.mjs。**手で直さない**（次の生成で消えるため）。\n" +
  "// ★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω)。選択肢は本文の中に \\n・ で並べる。\n" +
  "export const CARD_TEXT_EX0_JA = {\n";
const 頭en =
  "// 0th拡張のカード面テキスト（英語）。card-text-ex0.ja.js と同じ cardId キー。\n" +
  "//\n" +
  "// ⚠ いまは**カード名だけ**。効果文は空にしてある。card-text.js は空のフィールドを\n" +
  "//   日本語で出す作りなので、英語表示でも「名前は英語・効果文は日本語」で崩れない。\n" +
  "//   訳せたら tools/gen-ex0-text.mjs に足して作り直す。**手で直さない。**\n" +
  "export const CARD_TEXT_EX0_EN = {\n";
const 頭data =
  "// 0th拡張（0th EDITION 拡張）のカードデータ。NORMAL_CARDS と同じ形。\n" +
  "//\n" +
  "// 枚数はユーザー指示「1色14枚になるようになるべく均等に混ぜる。ONLYカードは1枚ずつ」から計算した。\n" +
  "// 7色98枚＋白4枚＋黒3枚＝105枚。これに虹（なないろの欠片7枚・リメイクのものを使い回す）を\n" +
  "// 足して**112枚**で、リメイクとぴったり同じ枚数になる。\n" +
  "// only: true は「1枚しか入れられない」カード（元のカードに ONLY と印字されている）。\n" +
  "//\n" +
  "// 作り直すには node tools/gen-ex0-text.mjs。**手で直さない**（tools/ex0-cards.mjs が正）。\n" +
  "export const EX0_NORMAL_CARDS = [\n";

fs.writeFileSync(path.join(ROOT, "src/card-text-ex0.ja.js"), 頭ja + ja.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(path.join(ROOT, "src/card-text-ex0.en.js"), 頭en + en.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(path.join(ROOT, "src/cards-data-ex0.js"), 頭data + data.join("\n") + "\n];\n", "utf8");

console.log("✅ 書き出した:");
console.log("   src/card-text-ex0.ja.js   " + ja.length + " 種");
console.log("   src/card-text-ex0.en.js   " + en.length + " 種（名前だけ）");
console.log("   src/cards-data-ex0.js     " + data.length + " 種 / 合計 " + EX0_CARDS.reduce((a, c) => a + c.count, 0) + " 枚（＋虹7枚で112枚）");
