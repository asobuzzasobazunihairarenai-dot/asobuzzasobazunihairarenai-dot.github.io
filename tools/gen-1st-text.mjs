// 1st EDITION の「カードの文」と「カードのデータ」を書き出す。
//
//   node tools/gen-1st-text.mjs
//
// 【文の出どころ】tools/1st-text-source.json。
//   🔴 **印刷データ（カードの印字）を1枚ずつ目で読んで写したもの**が正。
//   J:/自作カードゲーム/7 seven/印刷（名前変えない）/★最新リンク（名前変えない）/カード（1st）（名前変えない）/
//
// 【なぜ card-text.ja.js に直接書かないか】あのファイルは tools/gen-card-text.mjs が
//   「カード効果　テキスト.txt」から**丸ごと上書きして作る**ので、書き足すと次の生成で黙って消える。
//   だから別ファイル（card-text-1st.*.js）に分け、card-text.js で混ぜる（0th拡張と同じ）。
//
// 【英語】いまは**カード名だけ**。効果文は空にしてあり、card-text.js の設計どおり
//   空のフィールドは日本語のまま出る（部分翻訳を許す作り）。訳せたらここへ足す。
//
// 【Fカード】ユーザー判断（2026-11-05）で**暫定として印刷データの絵を当てた**ので、
//   名前・効果文も src へ書き出す（図鑑・拡大表示で引けるようにするため）。
//   ⚠ ただし**どの山にも入れない**（ファーストカードを1st のものに差し替えるかは別途相談）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIRST_ED_CARDS, FIRST_ED_NAME_EN, checkFirstEdCards } from "./first-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "tools/1st-text-source.json");

const 点検 = checkFirstEdCards();
if (点検.問題.length) {
  console.error("🔴 カード一覧がおかしい:");
  for (const p of 点検.問題) console.error("  " + p);
  process.exit(2);
}
if (!fs.existsSync(SRC)) {
  console.error("🔴 文の出どころが無い: tools/1st-text-source.json");
  process.exit(2);
}
const 元 = JSON.parse(fs.readFileSync(SRC, "utf8"));

// 🔴 空振りを合格にしない: 表に在るカードの文が1つでも欠けていたら止める（Fカードも含めて確かめる）。
const 欠け = FIRST_ED_CARDS.filter((c) => !元[c.id]).map((c) => c.id);
if (欠け.length) {
  console.error("🔴 文が無いカードがある: " + 欠け.join(", "));
  process.exit(2);
}

const J = (s) => JSON.stringify(s);
const 問題 = [];
const ja = [];
const en = [];
const data = [];
const eternalData = [];
const firstData = [];

for (const c of FIRST_ED_CARDS) {
  const t = 元[c.id];
  if (!t.basic && !t.arrival && !t.hand) 問題.push("基本も到達も手札も空: " + c.id);

  ja.push(
    "  " + J(c.id) + ": { flavor: " + J(t.flavor || "") + ", titleRuby: \"\", basic: " + J(t.basic || "") +
    ", subtitle: " + J(t.subtitle || "") + ", arrival: " + J(t.arrival || "") + ", hand: " + J(t.hand || "") + " },"
  );
  en.push(
    "  " + J(c.id) + ": { name: " + J(FIRST_ED_NAME_EN[c.id]) +
    ", flavor: \"\", basic: \"\", subtitle: \"\", arrival: \"\", hand: \"\" },"
  );
  if (c.kind === "normal") {
    data.push(
      "  { id: " + J(c.id) + ", name: " + J(c.name) + ", color: " + J(c.color) +
      ", count: " + c.count + (c.状況 ? ", situation: true" : "") + ", note: " + J("特になし。") + " },"
    );
  }
  // Eカードは ETERNAL_CARDS と同じ形（count を持たない＝専用の山に各1枚）。
  // Fカードはどの山にも入れないので、データは書き出さない（名前は英語表まかせ＋
  // cards-data.js の FIRST_ED_FIRST_CARDS に最小の形で持つ）。
  if (c.kind === "eternal") {
    eternalData.push(
      "  { id: " + J(c.id) + ", name: " + J(c.name) + ", color: " + J(c.color) + ", note: " + J("特になし。") + " },"
    );
  }
  if (c.kind === "first") {
    firstData.push(
      "  { id: " + J(c.id) + ", name: " + J(c.name) + ", color: " + J(c.color) + ", note: " + J("特になし。") + " },"
    );
  }
}

if (問題.length) {
  console.error("🔴 " + 問題.length + " 件:");
  for (const p of 問題) console.error("  " + p);
  process.exit(1);
}

const 頭ja =
  "// 1st EDITION のカード面テキスト（日本語）。\n" +
  "//\n" +
  "// 🔴 **card-text.ja.js とは別のファイルにしてある。** あちらは tools/gen-card-text.mjs が\n" +
  "//   丸ごと上書きして作るので、ここに書き足すと次の生成で消える。\n" +
  "//   card-text.js（言語ディスパッチャ）が両方を混ぜて引く。\n" +
  "//\n" +
  "// 文の出どころは tools/1st-text-source.json（**カードの印字を1枚ずつ読んで写したもの**）。\n" +
  "// 作り直すには node tools/gen-1st-text.mjs。**手で直さない**（次の生成で消えるため）。\n" +
  "// ★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω)。選択肢は本文の中に \\n・ で並べる。\n" +
  "//\n" +
  "// ⚠ 1st EDITION のコストは【財力】（＝あなたの手札の枚数）で、リメイクの【追色】とは別の仕組み。\n" +
  "//   いまは**文を出すだけ**で、処理はプレイヤーの自己申告に委ねる（CLAUDE.md の段階目標どおり）。\n" +
  "export const CARD_TEXT_1ST_JA = {\n";
const 頭en =
  "// 1st EDITION のカード面テキスト（英語）。card-text-1st.ja.js と同じ cardId キー。\n" +
  "//\n" +
  "// ⚠ いまは**カード名だけ**。効果文は空にしてある。card-text.js は空のフィールドを\n" +
  "//   日本語で出す作りなので、英語表示でも「名前は英語・効果文は日本語」で崩れない。\n" +
  "//   訳せたら tools/gen-1st-text.mjs に足して作り直す。**手で直さない。**\n" +
  "export const CARD_TEXT_1ST_EN = {\n";
const 頭data =
  "// 1st EDITION の通常カード（19種105枚）。NORMAL_CARDS と同じ形。\n" +
  "//\n" +
  "// 7色 × 2種 × 7枚 ＝ 98 ／ 白 3種 各1枚 ＝ 3 ／ 黒 2種 各2枚 ＝ 4。\n" +
  "// これに虹（なないろの欠片7枚・リメイクのものを使い回す）を足して**112枚**で、\n" +
  "// リメイク・0th拡張とぴったり同じ枚数になる。\n" +
  "// situation: true は【状況】カード（場の中央に置かれ、効果が出続ける）。\n" +
  "//\n" +
  "// 作り直すには node tools/gen-1st-text.mjs。**手で直さない**（tools/first-cards.mjs が正）。\n" +
  "export const FIRST_ED_NORMAL_CARDS = [\n";
const 尾eternal =
  "];\n\n" +
  "// 1st EDITION の Eカード（7種・各1枚）。ETERNAL_CARDS と同じ形（count を持たない）。\n" +
  "// 🔴 ユーザー判断（2026-11-05）で**リメイクと同じ役回り**＝「相手ゲート侵攻に成功したら、\n" +
  "//   その色のロックエリアへ即ロック」。だから印字の1行目（手札にあるならロックエリアを全部\n" +
  "//   手札に加え…）は使わない（tools/1st-text-source.json から外してある）。\n" +
  "// カードセットが 1st の時だけ、エターナルの山がこの7種になる（cards-data.js の getEternalCards）。\n" +
  "export const FIRST_ED_ETERNAL_CARDS = [\n";
const 尾first =
  "];\n\n" +
  "// 1st EDITION の Fカード（7種・各1枚）。🔴 **まだどの山にも入れない**\n" +
  "//   （ファーストカードを1st のものに差し替えるかは別途相談＝ユーザー指示）。\n" +
  "//   名前・絵・効果文を引けるようにするためだけに持っている（図鑑・拡大表示用）。\n" +
  "// ⚠ 絵は**暫定で印刷データ（完成カード）そのもの**＝文字が焼き込まれている。\n" +
  "export const FIRST_ED_FIRST_CARDS = [\n";

fs.writeFileSync(path.join(ROOT, "src/card-text-1st.ja.js"), 頭ja + ja.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(path.join(ROOT, "src/card-text-1st.en.js"), 頭en + en.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(
  path.join(ROOT, "src/cards-data-1st.js"),
  頭data + data.join("\n") + "\n" + 尾eternal + eternalData.join("\n") + "\n" + 尾first + firstData.join("\n") + "\n];\n",
  "utf8"
);

console.log("✅ 書き出した:");
console.log("   src/card-text-1st.ja.js   " + ja.length + " 種（通常19＋E7＋F7）");
console.log("   src/card-text-1st.en.js   " + en.length + " 種（名前だけ）");
console.log("   src/cards-data-1st.js     通常 " + data.length + " 種 / 合計 " +
  data.reduce((a, s) => a + Number(s.match(/count: (\d+)/)[1]), 0) + " 枚（＋虹7枚で112枚）" +
  "、E " + eternalData.length + " 種、F " + firstData.length + " 種");
