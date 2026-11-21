// supabase_setup_so7.sql を**全文もう一度実行しても落ちないか**を機械的に見る。
//
// 【なぜ要るか・2026-10-20 続き604 の実害】PostgreSQL は create or replace function で
// **戻り値の型を変えられない**（42P13 cannot change return type of existing function）。
// このファイルは「後ろの節で前の定義を作り直す」書き方をしており、**同じ関数が複数回**
// 定義されている。戻り値を変えた時に**前の定義の方へ drop を足し忘れる**と、
// 1回目は通るのに**2回目の全文実行がそこで止まり、それ以降の定義が丸ごと反映されない**。
// 実際にユーザーが踏んだ（so7_get_admin_bug_reports に列を足した時）。
//
// 使い方: node tools/check-sql-rerun.mjs   （問題があれば ⚠ と行番号を出す）
// 直し方: 指摘された定義の直前に drop function if exists <名前>(...); を置く
//         （このファイルの既存の作法。so7_get_admin_visit_log 等はどの定義にも付いている）
import fs from "node:fs";
const lines = fs.readFileSync("supabase_setup_so7.sql", "utf8").split("\n");
const RET = /\breturns\b/;
const defs = new Map();
lines.forEach((l, i) => {
  const m = l.match(/^create or replace function (so7_[a-z_0-9]+)/);
  if (!m) return;
  let ret = "";
  for (let j = i; j < Math.min(lines.length, i + 80); j++) {
    if (!RET.test(lines[j])) continue;
    ret = lines[j].slice(lines[j].search(RET)).trim();
    if (/^returns table\s*\(/.test(ret)) {
      for (let k = j + 1; k < lines.length && !/^\)/.test(lines[k]); k++) ret += " " + lines[k].trim();
    }
    break;
  }
  if (!defs.has(m[1])) defs.set(m[1], []);
  defs.get(m[1]).push({
    line: i + 1, ret,
    hasDrop: lines.slice(Math.max(0, i - 8), i).some((x) => x.startsWith("drop function if exists " + m[1])),
  });
});
let bad = 0;
for (const [name, list] of defs) {
  if (list.length < 2) continue;
  if (new Set(list.map((d) => d.ret)).size < 2) continue; // 戻り値が全部同じ＝上書きできるので安全
  for (const d of list) if (!d.hasDrop) { console.log(`⚠ ${name} の ${d.line}行目: 戻り値が他の定義と違うのに drop が無い`); bad++; }
}

// ── ビュー ────────────────────────────────────────────────────────────────
// 🔴【続き739 の実害】`create or replace view` は**列を減らせない・順番も変えられない**
//   （psql: cannot drop columns from view）。同じビューをこのファイル内で何度か定義し直して
//   いるので、**どれか1つで列を増やすと、2回目の実行で前の定義が落ちる**。
//   実際に `so7_games_list` に `is_ranked` を足した時に踏んだ（ローカルで流して気づいた。
//   そのまま渡していたら、本番で途中まで流れて止まっていた）。
//   ⇒ **2回以上定義しているビューは、どの定義にも `drop view if exists` を置く**。
const views = new Map();
lines.forEach((l, i) => {
  const m = l.match(/^create (?:or replace )?view (so7_[a-z_0-9]+)/);
  if (!m) return;
  if (!views.has(m[1])) views.set(m[1], []);
  views.get(m[1]).push({
    line: i + 1,
    hasDrop: lines.slice(Math.max(0, i - 8), i).some((x) => x.startsWith("drop view if exists " + m[1])),
  });
});
for (const [name, list] of views) {
  if (list.length < 2) continue; // 1回しか定義していないなら列が食い違いようがない
  for (const d of list) {
    if (d.hasDrop) continue;
    console.log(
      `⚠ ${name} の ${d.line}行目: 同じビューを${list.length}回定義しているのに drop view が無い` +
        "（列を1つでも増やすと、2回目の実行で cannot drop columns from view で落ちる）"
    );
    bad++;
  }
}

// 🔴【続き784】**ドル引用（$$）が壊れていないか。**
//   String.prototype.replace は**置換文字列の中のドル記号を特別扱いする**:
//     ・$$ → $ に縮む
//     ・ドル＋逆クォート → 「一致より前の全文」が差し込まれる（ファイルが二重になる）
//   SQL をスクリプトで足すとこれを踏み、`as $$ … $$;` が `as $ … $;` に化ける
//   （実害 2026-11-21。本番で流すまで分からなかった）。
//   ⚠ 上の検査（drop の有無）は**通ってしまう**ので、別に見る。
//   🔴 **直し方は「置換を関数で渡す」**（s.replace(印, () => 新)）。関数ならドルの特別扱いが効かない。
// ⚠ この SQL は CRLF なので、行末の \r を許すこと（許さないと**0件＝合格**になる）。
{
  const 全文 = lines.join("\n");
  const 開き = (全文.match(/^as \$\$\r?$/gm) || []).length;
  const 閉じ = (全文.match(/^\$\$;\r?$/gm) || []).length;
  // 🔴 探し方が空振りすると「0件＝合格」になるので、まず数が取れたかを見る。
  if (開き < 5) {
    console.log("⚠ 検査そのものが怪しい: 関数本体の開きが " + 開き + " 件しか見つからない（探し方が合っていない可能性）");
    bad++;
  } else if (開き !== 閉じ) {
    console.log("⚠ ドル引用の開き（" + 開き + "）と閉じ（" + 閉じ + "）の数が合わない");
    bad++;
  }
  lines.forEach((l, i) => {
    if (/^as \$\r?$/.test(l) || /^\$;\r?$/.test(l)) {
      console.log(
        "⚠ " + (i + 1) + "行目: ドル引用がドル1つになっている（2つのはず）" +
          "——置換スクリプトの String.replace がドルを縮めた可能性。置換は関数で渡すこと"
      );
      bad++;
    }
  });
}
console.log(bad === 0 ? "✅ 全文を再実行しても落ちない（戻り値が変わる定義・複数回のビューには全部 drop がある）" : `⚠ ${bad} 件`);
if (bad > 0) process.exitCode = 1;
