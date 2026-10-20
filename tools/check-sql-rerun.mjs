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
console.log(bad === 0 ? "✅ 全文を再実行しても落ちない（戻り値が変わる定義には全部 drop がある）" : `⚠ ${bad} 件`);
