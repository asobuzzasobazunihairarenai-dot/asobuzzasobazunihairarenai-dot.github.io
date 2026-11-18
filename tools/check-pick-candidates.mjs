// 【続き754】「候補が**画面に要素が無い**という理由で黙って落ちる」のを見張る（18本目）。
//
// 🔴 なぜ機械で数えるのか
//   #720（貴族の特権で自分を選べない）の正体は、選ばせる所が
//     candidates.map(p => ({ p, el: querySelector(...) })).filter(e => e.el)
//   と書いてあり、**盤面に要素が無い席が黙って候補から消えていた**こと。
//   自分の盤面アバターは既定で置かれないので、**自分だけが毎回消えていた**。
//   症状は「何も言わずに違う」——選べない／モーダルすら出ずに不発。
//   同じ形は**選ばせる所ぜんぶ**に在る（マス・手札・席）。だから
//   「次は気をつける」ではなく、**付け忘れたら機械が止める**形にした。
//
// ⓘ 見るのは3つ:
//   ① 候補を画面の有無で狭めている所が、下の表に載っているか
//      （新しい選ばせ方が増えたら**必ずここで落ちる**＝「記録を付けたか」を決めさせる）
//   ② 表で "record" と決めた所が、本当に recordPickCandidatesDropped を呼んでいるか
//   ③ 表で "nodrop" と決めた所に、要素の有無で絞る形が**戻っていない**か（#720 の再発）
//
// ⚠ **コメントは先に消してから数える**（続き746 の教訓「コメントで通る検査は無い方がまし」。
//   #720 の直しの説明文には、まさに `.filter((e) => e.el)` という字が書いてある）。
// ⚠ 行番号を保つため、コメントは**空白に置き換える**（消すと行がずれて報告が読めない）。
import fs from "node:fs";

const 道 = process.argv[2] || "src/main.js";

// ---- 表: どの関数が何のつもりなのか -------------------------------------------------
// "record" … ルールの候補を画面の有無で狭める＝落ちたら必ず記録する
// "nodrop" … 候補は落とさない（記録は要らない。絞る形が戻ったら落とす）
// "view"   … 見た目・寸法・演出のためだけに要素を引く＝ルールの候補ではない（理由つき）
//
// ⚠ "record" の3つ目は**記録の呼び出しの最低数**。「1回でも呼んでいればよい」にすると、
//   2種類の落ち方（一部落ち／入れ物そのものが無い）のうち**片方を消しても通ってしまう**
//   （実際に A/B でそれを見た）。数で縛る。
const 表 = {
  requestCellChoiceForEffectOnce: ["record", "マスの選択。findLocationElement が知らない zone は null になる", 1],
  requestHandCardChoiceForEffect__inner: ["record", "手札の選択。候補そのものを DOM から作る", 2],
  requestHandCardsOrderedForEffect: ["record", "手札を順番付きで選ぶ。候補そのものを DOM から作る", 2],
  requestPlayerChoiceForEffect: ["nodrop", "#720 で候補を落とさない形にした。絞る形が戻ったら同じ不具合"],
  reapplyEffectPickerHighlights: ["view", "光を塗り直すだけ。候補は activeEffectPicker が持っている"],
  shouldWaitForCenterBeforeCpuHandEffect: ["view", "カメラを中央へ寄せて待つかの判断だけ。ルールの候補ではない"],
  measureHandCardsExtent: ["view", "手札の幅を測るだけ"],
  measureHandFanExtent: ["view", "手札の扇の幅を測るだけ"],
  animateHandShuffle: ["view", "手札をシャッフルする演出だけ"],
  applyHandInsertMotion: ["view", "手札に差し込む演出だけ"],
};

// ---- コメントを空白にする（行数は変えない）------------------------------------------
function コメントを消す(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let 状態 = "code"; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (状態 === "code") {
      if (c === "/" && c2 === "/") { 状態 = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && c2 === "*") { 状態 = "block"; out += "  "; i += 2; continue; }
      if (c === "'") 状態 = "sq";
      else if (c === '"') 状態 = "dq";
      else if (c === "`") 状態 = "tpl";
      out += c; i += 1; continue;
    }
    if (状態 === "line") {
      if (c === "\n") { 状態 = "code"; out += c; i += 1; continue; }
      out += " "; i += 1; continue;
    }
    if (状態 === "block") {
      if (c === "*" && c2 === "/") { 状態 = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i += 1; continue;
    }
    // 文字列の中
    if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue; }
    if ((状態 === "sq" && c === "'") || (状態 === "dq" && c === '"') || (状態 === "tpl" && c === "`")) 状態 = "code";
    out += c; i += 1;
  }
  return out;
}

const 生 = fs.readFileSync(道, "utf8").replace(/\r\n/g, "\n");
const src = コメントを消す(生);
const 行たち = src.split("\n");

// ---- 候補を画面の有無で狭めている所を数える -----------------------------------------
const 型 = [
  ["要素の有無で絞る", (ln, 次) => /\.filter\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.el\s*\)/.test(ln) || (/\.filter\(\s*$/.test(ln) && /^\s*\(\s*\w+\s*\)\s*=>\s*\w+\.el\s*$/.test(次))],
  ["手札のDOMから候補", (ln) => /querySelectorAll\("\.hand-(card|reveal-card)"\)/.test(ln)],
  ["席のアバターを引く", (ln) => /\.player-avatar\[data-player=/.test(ln)],
];

function 包む関数(i) {
  for (let j = i; j >= 0; j -= 1) {
    const m = 行たち[j].match(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/);
    if (m) return m[1];
  }
  return "(トップレベル)";
}

// 関数の本文（次のトップレベル function まで）を切り出す
function 本文(名) {
  const 始 = 行たち.findIndex((ln) => new RegExp(`^(?:async )?function ${名.replace(/[$]/g, "\\$&")}\\s*\\(`).test(ln));
  if (始 < 0) return null;
  let 終 = 行たち.length;
  for (let j = 始 + 1; j < 行たち.length; j += 1) {
    if (/^(?:async )?function [A-Za-z_$][\w$]*\s*\(/.test(行たち[j])) { 終 = j; break; }
  }
  return 行たち.slice(始, 終).join("\n");
}

const 見つけた = new Map(); // 関数名 → [{型, 行}]
for (let i = 0; i < 行たち.length; i += 1) {
  for (const [名, 当たるか] of 型) {
    if (!当たるか(行たち[i], 行たち[i + 1] || "")) continue;
    const f = 包む関数(i);
    if (!見つけた.has(f)) 見つけた.set(f, []);
    見つけた.get(f).push({ 型: 名, 行: i + 1 });
  }
}

let NG = 0;
const 言う = (s) => console.log(s);
const 落とす = (s) => { NG += 1; console.log("  ❌ " + s); };

言う(`[check-pick-candidates] ${道}`);

// ① 表に無い所が在ったら落とす
for (const [f, 印] of [...見つけた.entries()].sort()) {
  if (表[f]) continue;
  落とす(
    `${f}（行 ${印.map((x) => x.行).join(",")}）が**候補を画面の有無で狭めている**のに、` +
      `tools/check-pick-candidates.mjs の表に無い。\n` +
      `     ⇒ ルールの候補を狭めるなら "record"（recordPickCandidatesDropped を呼ぶ）、\n` +
      `        狭めないなら "nodrop"、見た目だけなら "view" を理由つきで表に足すこと。`
  );
}

// ② 表の名前が実在するか（改名の取りこぼしを捕まえる）
for (const 名 of Object.keys(表)) {
  if (本文(名) === null) 落とす(`表に書いてある ${名} が ${道} に無い（改名された？ 表を直すこと）`);
}

// ③ record / nodrop の約束を守っているか
for (const [名, [種, 理由, 最低数]] of Object.entries(表)) {
  const b = 本文(名);
  if (b === null) continue;
  const 狭めている = 見つけた.has(名);
  if (種 === "record") {
    const n = (b.match(/recordPickCandidatesDropped\(/g) || []).length;
    const 要る = 最低数 ?? 1;
    if (n < 要る) {
      落とす(
        `${名} は "record"（${理由}）なのに recordPickCandidatesDropped が ${n} 回しか無い` +
          `（${要る} 回要る）＝落ちても黙る道が残っている`
      );
    }
  } else if (種 === "nodrop") {
    if (/\.filter\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.el\s*\)/.test(b)) {
      落とす(`${名} は "nodrop"（${理由}）なのに、要素の有無で絞る形が戻っている＝#720 の再発`);
    }
  } else if (種 === "view" && !狭めている) {
    // 見た目用の所がもう要素を引いていないなら、表から外してよい（残しても害は無いので知らせるだけ）
    言う(`  ⓘ ${名} はもう要素を引いていない（表から外してよい）`);
  }
}

// ④ 記録そのものが在るか
if (!/function recordPickCandidatesDropped\(/.test(src)) {
  落とす("recordPickCandidatesDropped が無い（候補の落ちを記録する入口そのもの）");
} else if (!/logAction\("diag-pick-candidates-dropped"/.test(src)) {
  落とす("recordPickCandidatesDropped が diag-pick-candidates-dropped を残していない");
}

const 数 = { record: 0, nodrop: 0, view: 0 };
for (const [, [種]] of Object.entries(表)) 数[種] += 1;
言う(
  `  候補を狭めている所 ${見つけた.size} か所 / 表: 記録する ${数.record}・落とさない ${数.nodrop}・見た目だけ ${数.view}`
);
言う(NG === 0 ? "✅ 問題なし" : `❌ ${NG} 件`);
process.exit(NG === 0 ? 0 : 1);
