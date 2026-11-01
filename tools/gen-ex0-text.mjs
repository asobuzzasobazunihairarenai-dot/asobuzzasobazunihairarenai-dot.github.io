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

  // 色寄せの笛は「これと同色の」なので、7色ぶん同じ文でよい（色は枠と色データが持つ）。
  ja.push(
    "  " + J(c.id) + ": { flavor: " + J(t.flavor || "") + ", titleRuby: \"\", basic: " + J(t.basic || "") +
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
