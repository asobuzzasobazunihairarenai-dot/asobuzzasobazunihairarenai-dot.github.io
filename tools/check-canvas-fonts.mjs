// 【続き746】canvas にカードの文字を描く所の見張り。2つ見る。
//
// ① **canvas は webfont の読み込みを待たない。**
//    `g.font = "700 22px 'Shippori Mincho B1', serif"` と書いても、その書体がまだ
//    読み込まれていなければ**黙って serif に落ちる**。例外もログも出ないので、
//    「なぜか書体が違う」という形でしか表に出ない（#709 の報告の言葉がまさにそれ）。
//    ⇒ 非汎用の書体で canvas に文字を描く前に `document.fonts.ready` を待つこと。
//    ⓘ #709 の実機では fontsReady が "loaded" だったので、あの報告の原因**ではなかった**。
//      それでも残る罠なので、塞いだ状態を保つ。
//
// ② **カードの組版を2か所に書かない。**
//    #709/#710 の正体は「霧散演出が、本物（card-renderer.js ＝ CSS）とは別の組版を
//    canvas へ手書きしていた」こと。余白も字の大きさも違い、仕切り線も無く、効果文を
//    カード高さの 93%（本物は 67% で仕切り）まで垂れ流していた。
//    ⇒ canvas にカード面を描くのは card-renderer.js の paintCardFaceTextToCanvas だけ。
//      他のファイルが fillText でカードの文字を描き始めたら、ここで落ちる。
//
// ⚠ 0しか出ない検査ではない: card-dissolve.js の `document.fonts` を消すか、
//   あのファイルに fillText を書き足すと落ちる（続き746 で実際に試して確かめてある）。

import fs from "node:fs";
import path from "node:path";

const 根 = path.resolve(path.join(import.meta.dirname, ".."));
const src = path.join(根, "src");

let NG = 0;
const 落ちる = (...a) => { NG++; console.log("🔴 " + a.join("")); };

// 汎用の書体（いつでも在る＝待たなくてよい）
const 汎用 = /^(sans-serif|serif|monospace|system-ui|cursive|fantasy|ui-[a-z-]+|-apple-system|inherit|initial)$/;

// 🔴 コメントを落としてから数える。落とさないと、**注釈に書いた `document.fonts` で
//   合格してしまう**（続き746 で実際にそうなった。コメントで通る検査は無い方がまし）。
const コメント抜き = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");

const ファイル = fs.readdirSync(src).filter((f) => f.endsWith(".js"));
let 非汎用 = 0;
let 待ち = 0;

for (const f of ファイル) {
  const s = fs.readFileSync(path.join(src, f), "utf8");
  const 中身 = コメント抜き(s);
  // ⚠ 組版の持ち主（card-renderer.js）だけは、待つのが**呼ぶ側**の責務なので別扱い（下の③で見る）。
  const 待っている = f === "card-renderer.js" || /document\.fonts/.test(中身);

  // ── ① 非汎用の書体で canvas に描いていないか
  for (const m of s.matchAll(/\.font\s*=\s*([^;\n]+)/g)) {
    const 値 = m[1];
    const 行 = s.slice(0, m.index).split("\n").length;
    // 値の中の書体名を拾う: クォート付きの名前、または fontFamily（CSS から取る＝非汎用を含み得る）
    const 名 = [...値.matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
    const CSS由来 = /fontFamily/.test(値);
    // "bold 15px sans-serif" のような1つの文字列は、最後の語を家族名として見る
    const 家族 = [];
    for (const n of 名) {
      for (const part of n.split(",")) {
        const t = part.trim().replace(/^["']|["']$/g, "").replace(/^\d+(\.\d+)?px\s+/, "");
        const 語 = t.split(/\s+/).pop();
        if (語) 家族.push(語);
      }
    }
    const 非汎用あり = CSS由来 || 家族.some((x) => !汎用.test(x));
    if (!非汎用あり) continue;
    非汎用++;
    if (!待っている) {
      落ちる(
        "src/" + f + ":" + 行 + " が canvas に**非汎用の書体**で文字を描いているのに、\n" +
        "   このファイルのどこにも `document.fonts` を待つ所が無い。\n" +
        "   ⇒ 書体がまだ読み込まれていないと**黙って serif に落ちる**（例外もログも出ない）。\n" +
        "   直し方: 描く前に `await document.fonts.ready` を置く（絵の読み込み待ちに相乗りさせると遅くならない）。\n" +
        "   ⚠ 描くのが別ファイル（card-renderer.js の paintCardFaceTextToCanvas）なら、**呼ぶ側**で待つ。"
      );
    } else {
      待ち++;
    }
  }

  // ── ② カードの組版を2か所に書いていないか
  if (f === "card-renderer.js") continue; // 組版の持ち主
  if (!/paintCardFaceTextToCanvas|bakeCardTextIfNeeded|card-dissolve/.test(中身) && f !== "card-dissolve.js") continue;
  if (/\b(fillText|measureText)\s*\(/.test(中身)) {
    落ちる(
      "src/" + f + " が canvas に文字を自分で描いている（fillText / measureText）。\n" +
      "   ⇒ カード面の組版は card-renderer.js（＝CSS）が持ち主。2か所に書くと必ず食い違う。\n" +
      "      #709/#710 はそれで「フォントと配置がおかしい」になった。\n" +
      "   直し方: `paintCardFaceTextToCanvas(g, cardId, 辺)` を呼ぶ。位置や字の大きさを変えたい時は\n" +
      "      CSS（src/card-layout-config.js / src/style.css）を直す（そうすれば画面の方にも効く）。"
    );
  }
}

// ── ③ 組版を呼ぶ側が、書体を待っているか
const 呼ぶ側 = ファイル.filter((f) => f !== "card-renderer.js" && /paintCardFaceTextToCanvas\s*\(/.test(コメント抜き(fs.readFileSync(path.join(src, f), "utf8"))));
if (呼ぶ側.length === 0) {
  console.log("🔴 paintCardFaceTextToCanvas を呼ぶ所が1つも無い＝この検査は空振りしている");
  process.exit(2);
}
for (const f of 呼ぶ側) {
  const s = コメント抜き(fs.readFileSync(path.join(src, f), "utf8"));
  if (!/document\.fonts/.test(s)) {
    落ちる(
      "src/" + f + " が paintCardFaceTextToCanvas を呼ぶのに、`document.fonts` を待っていない。\n" +
      "   ⇒ 書体がまだなら、本物と同じ箱に**別の書体**で描かれる（#709 の形）。"
    );
  }
}

if (NG === 0) {
  console.log("✅ 問題なし（canvas の非汎用の書体 " + 非汎用 + " 件は書体の読み込みを待つ・カードの組版は card-renderer.js の1か所だけ・呼ぶ側 " + 呼ぶ側.length + " ファイルとも待っている）");
}
process.exit(NG ? 1 : 0);
