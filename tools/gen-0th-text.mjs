// 旧0th EDITION の「カードの文」と「カードのデータ」を書き出す。
//
//   node tools/gen-0th-text.mjs
//
// 【文の出どころ】tools/0th-text-source.json。アーティファクト「旧0th 効果文の直し」で
//   ユーザーと1枚ずつ確認して固めた**直したあとの文**を、そのまま写したもの。
//   🔴 文を直す時は、まずアーティファクト側を直してから、この json を更新する。
//
// 【なぜ card-text.ja.js に直接書かないか】あのファイルは
//   tools/gen-card-text.mjs が「カード効果　テキスト.txt」から**丸ごと上書きして作る**。
//   旧0thの分を書き足しても、次に誰かがあれを走らせた瞬間に**黙って消える**。
//   だから別ファイル（card-text-0th.*.js）に分け、card-text.js で混ぜる。
//
// 【英語】いまは**カード名だけ**。効果文は空にしてあり、card-text.js の設計どおり
//   空のフィールドは日本語のまま出る（部分翻訳を許す作り）。訳せたらここへ足す。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OLD0TH_CARDS, OLD0TH_NAME_EN, checkOld0thCards } from "./0th-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "tools/0th-text-source.json");

const 点検 = checkOld0thCards();
if (点検.問題.length) {
  console.error("🔴 カード一覧がおかしい:");
  for (const p of 点検.問題) console.error("  " + p);
  process.exit(2);
}
if (!fs.existsSync(SRC)) {
  console.error("🔴 文の出どころが無い: tools/0th-text-source.json");
  process.exit(2);
}
const 元 = JSON.parse(fs.readFileSync(SRC, "utf8"));
const 元by = new Map(元.map((x) => [x.no, x]));

// ===== 題名のふりがな（ルビ）=====
// 🔴 出どころは**印刷カードそのもの**（カード0th の 34枚・650px角）。1枚ずつ読んだ。
//   書き方は card-text-ex0.ja.js と同じで、**漢字のかたまりごとの読みを全角スペース区切り**。
//   例「誰かの落とし物」＝ 誰 / 落 / 物 の3かたまり ⇒ "だれ　お　もの"
//   先頭の "*" は**題名ぜんぶに1つ**のルビ（旧0thの通常カードには無い）。
// ⚠ 読みの数が漢字のかたまりの数と合わないと、画面では黙ってルビ無しに落ちる。
//   だから下で数を突き合わせて、合わなければ**止める**。
const OLD0TH_TITLE_RUBY = {
  "0th-red-dash": "",                       // ダッシュ（漢字なし）
  "0th-red-counterattack": "はんげき",
  "0th-orange-force": "",                   // フォース（漢字なし）
  "0th-orange-lost-item": "だれ　お　もの",
  "0th-yellow-steal": "とうぞく　わざ",       // 盗賊 / 技（-スティール- は漢字なし）
  "0th-yellow-thunder": "かみなり",          // 神鳴
  "0th-green-peoples-road": "たみ　みち　けんせつ",
  "0th-green-rich-whim": "ふゆうそう　き",
  "0th-blue-greedy-bridge": "ほ　つ　ばし",
  "0th-blue-set-trap": "しか　わな",         // 仕掛 / 罠
  "0th-pink-disclosure": "じょうほうかいじ",
  "0th-pink-favorite-flower": "だれ　す　はな",
  "0th-purple-wait": "ま",                   // ちょっと待った！
  "0th-purple-apocalypse": "よげんしゃ　わざ",
  "0th-white-colorful-hole": "",             // カラフルホール（漢字なし）
  "0th-white-rainbow-rain": "",              // なないろのあめ（漢字なし）
  "0th-black-faded-frog": "お",              // いろ落ちガエル
  "0th-black-greedy-palette": "ごうよく",
  "0th-black-rainbow-curse": "のろ",         // にじいろの呪い
};

// 題名の中の「漢字のかたまり」の数を数える（ルビの数と突き合わせるため）
const KANJI_RE = /[一-鿿㐀-䶿]/;
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

for (const c of OLD0TH_CARDS) {
  const src = 元by.get(c.no);
  if (!src) { 問題.push("文が見つからない: " + c.id + "（no " + c.no + "）"); continue; }
  const t = src.文 || {};
  if (!t.arrival && !t.hand) 問題.push("到達も手札も空: " + c.id);
  // 🔴 名前の取り違えを黙って通さない（素材フォルダ名と印字が違うカードが2つある）
  if (src.nm !== c.name) 問題.push("名前が食い違う: " + c.id + " 表「" + c.name + "」／ 文「" + src.nm + "」");

  const ruby = OLD0TH_TITLE_RUBY[c.id];
  if (ruby === undefined) 問題.push("ふりがなの欄が無い: " + c.id + "（OLD0TH_TITLE_RUBY に足す）");
  if (ruby && !ruby.startsWith("*")) {
    const 読み数 = ruby.split(/[\s　]+/).filter(Boolean).length;
    const かたまり = 漢字のかたまり数(c.name);
    if (読み数 !== かたまり) {
      問題.push("ふりがなの数が合わない: " + c.id + "「" + c.name + "」漢字のかたまり " + かたまり + " ／ 読み " + 読み数 + "（" + ruby + "）");
    }
  }

  ja.push(
    "  " + J(c.id) + ": { flavor: " + J(t.flavor || "") + ", titleRuby: " + J(ruby || "") + ", basic: " + J(t.basic || "") +
    ", subtitle: \"\", arrival: " + J(t.arrival || "") + ", hand: " + J(t.hand || "") + " },"
  );

  const nameEn = OLD0TH_NAME_EN[c.id];
  if (!nameEn) 問題.push("英語名が無い: " + c.id);
  en.push(
    "  " + J(c.id) + ": { name: " + J(nameEn || c.name) +
    ", flavor: \"\", basic: \"\", subtitle: \"\", arrival: \"\", hand: \"\" },"
  );

  // 補足（「補足: 」の頭は落として1本につなぐ）
  // 🔴 「補足:」で始まる行だけを採る。notes には作業メモが混ざり得るので、
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
  "// 旧0th EDITION（白地に虹の輪の版・2024.04）のカード面テキスト（日本語）。\n" +
  "//\n" +
  "// 🔴 **card-text.ja.js とは別のファイルにしてある。** あちらは tools/gen-card-text.mjs が\n" +
  "//   「カード効果　テキスト.txt」から丸ごと上書きして作るので、ここに書き足すと次の生成で消える。\n" +
  "//   card-text.js（言語ディスパッチャ）が両方を混ぜて引く。\n" +
  "//\n" +
  "// 文の出どころは tools/0th-text-source.json（アーティファクトで1枚ずつ確認して固めたもの）。\n" +
  "// 作り直すには node tools/gen-0th-text.mjs。**手で直さない**（次の生成で消えるため）。\n" +
  "// ★基本効果 / ●到達効果 / ■手札効果 / flavor(Ω)。選択肢は本文の中に \\n・ で並べる。\n" +
  "//\n" +
  "// ⚠ エターナル7種・ファースト7種・なないろの欠片は**リメイクのものを使い回す**ので、ここには無い。\n" +
  "export const CARD_TEXT_OLD0TH_JA = {\n";
const 頭en =
  "// 旧0th EDITION のカード面テキスト（英語）。card-text-0th.ja.js と同じ cardId キー。\n" +
  "//\n" +
  "// ⚠ いまは**カード名だけ**。効果文は空にしてある。card-text.js は空のフィールドを\n" +
  "//   日本語で出す作りなので、英語表示でも「名前は英語・効果文は日本語」で崩れない。\n" +
  "//   訳せたら tools/gen-0th-text.mjs に足して作り直す。**手で直さない。**\n" +
  "export const CARD_TEXT_OLD0TH_EN = {\n";
const 頭data =
  "// 旧0th EDITION（白地に虹の輪の版・2024.04）のカードデータ。NORMAL_CARDS と同じ形。\n" +
  "//\n" +
  "// 7色は1色2種×7枚＝98、無色5種で7枚（白2+2・黒1+1+1）＝105枚。これに虹\n" +
  "// （なないろの欠片7枚・リメイクのものを使い回す）を足して**112枚**で、リメイクと同じ枚数になる。\n" +
  "//\n" +
  "// ⚠ エターナル7種・ファースト7種は**リメイクのものをそのまま使う**（ユーザー判断 2026-11-19）。\n" +
  "//   旧0thのE・Fはリメイクと同じカード（名前も能力名も同じ）で、文が今風に書き直されているだけ。\n" +
  "//\n" +
  "// 作り直すには node tools/gen-0th-text.mjs。**手で直さない**（tools/0th-cards.mjs が正）。\n" +
  "export const OLD0TH_NORMAL_CARDS = [\n";

fs.writeFileSync(path.join(ROOT, "src/card-text-0th.ja.js"), 頭ja + ja.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(path.join(ROOT, "src/card-text-0th.en.js"), 頭en + en.join("\n") + "\n};\n", "utf8");
fs.writeFileSync(path.join(ROOT, "src/cards-data-0th.js"), 頭data + data.join("\n") + "\n];\n", "utf8");

console.log("✅ 書き出した:");
console.log("   src/card-text-0th.ja.js   " + ja.length + " 種");
console.log("   src/card-text-0th.en.js   " + en.length + " 種（名前だけ）");
console.log("   src/cards-data-0th.js     " + data.length + " 種 / 合計 " + OLD0TH_CARDS.reduce((a, c) => a + c.count, 0) + " 枚（＋虹7枚で112枚）");
