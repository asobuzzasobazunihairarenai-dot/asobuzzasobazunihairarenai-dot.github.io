#!/usr/bin/env node
// SQLの関数の「開けっぱなし」を見張る（続き862）。
//
// 🔴 なぜ要るか: このファイルには `revoke execute on function ... from public;` が58か所あるが、
//    あれは **anon / authenticated を1つも止めていない**。Supabase は新しい関数へ既定で
//    その2つの役へ EXECUTE を付けるので、public から revoke しても残る。
//    ⇒ 「revoke from public を書いたから閉じた」と思い込むのが、いちばん起こりやすい事故。
//    実際 so7_ranked_apply_delta（security definer・引数に他人の uuid を取る＝誰のランクでも
//    書き換えられる）が、公開されている anon キーだけで呼べる状態で長く置かれていた。
//
// 見る決まりは1つだけ:
//   revoke ... from public が在る関数は、次のどちらかでなければならない。
//     ① `grant execute ... to authenticated;` が在る  ＝ 意図して開けてある（中で誰かを検める）
//     ② `revoke execute ... from anon, authenticated;` が在る ＝ 本当に閉じてある
//   どちらも無い＝「閉じたつもりで開いている」。
//
// ⚠ ②を足す前に、その関数が**クライアントから1度も呼ばれていない**ことを確かめること
//   （src/*.js の rpc 名で grep）。呼ばれているのに閉じると機能が丸ごと止まる。
// ⚠ 逆に①が在る関数は閉じてはいけない。管理者用RPC（so7_ranked_admin_apply_delta など）は
//   「authenticated に開けて、関数の中でメールを検める」形が意図。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const 道 = path.join(ROOT, "supabase_setup_so7.sql");

function 読む() {
  return fs.readFileSync(道, "utf8").replace(/\r\n/g, "\n");
}

// 署名（関数名＋引数の型）を鍵にする。`grant  execute`（空白2つ）のような揺れに当たること。
function 鍵(行) {
  const m = 行.match(/on\s+function\s+([a-z0-9_]+\s*\([^)]*\))/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function 集める(s) {
  const 表 = new Map();
  const 行たち = s.split("\n");
  for (let i = 0; i < 行たち.length; i++) {
    const t = 行たち[i].trim();
    if (!/^(grant|revoke)\s+execute\s+on\s+function/i.test(t)) continue;
    const k = 鍵(t);
    if (!k) continue;
    if (!表.has(k)) 表.set(k, { pub: 0, grantAuth: false, revAuth: false });
    const r = 表.get(k);
    const revoke = /^revoke\s/i.test(t);
    if (revoke && /from\s+public\s*;?$/i.test(t)) r.pub = i + 1;
    if (!revoke && /to\s+(anon\s*,\s*)?authenticated\s*;?$/i.test(t)) r.grantAuth = true;
    if (revoke && /from\s+anon\s*,\s*authenticated\s*;?$/i.test(t)) r.revAuth = true;
  }
  return 表;
}

const s = 読む();
const 表 = 集める(s);
const 対象 = [...表.entries()].filter(([, r]) => r.pub);

const 穴 = [];
let 開けてある = 0;
let 閉じた = 0;
for (const [k, r] of 対象) {
  if (r.grantAuth) 開けてある++;
  else if (r.revAuth) 閉じた++;
  else 穴.push([k, r.pub]);
}

// 0しか出ない検査にしない: 数えた母数そのものを出す。
console.log("  revoke ... from public が在る関数: " + 対象.length + " 件");
console.log("    ・authenticated へ grant 済み（意図して開けてある）: " + 開けてある + " 件");
console.log("    ・anon / authenticated からも revoke 済み（本当に閉じてある）: " + 閉じた + " 件");

// ⚠ 母数が崩れたら、数え方が壊れた合図（実測 58 件・2026-11-26）。
if (対象.length < 40) {
  console.error("🔴 revoke from public が " + 対象.length + " 件しか見つからない（数え方が壊れている）");
  process.exit(1);
}
// ⚠ 閉じてある関数が0件になったら、続き862 の直しが消えた合図。
if (閉じた < 1) {
  console.error("🔴 anon / authenticated から revoke してある関数が1件も無い（続き862 の直しが消えている）");
  process.exit(1);
}

if (穴.length > 0) {
  console.error("");
  console.error("🔴 「閉じたつもりで開いている」関数が " + 穴.length + " 件");
  for (const [k, 行] of 穴) {
    console.error("    supabase_setup_so7.sql:" + 行 + "  " + k);
  }
  console.error("");
  console.error("  `from public` の revoke は anon / authenticated を止めません。どちらかを足してください:");
  console.error("    ① クライアントから呼ぶなら  grant execute on function <署名> to authenticated;");
  console.error("    ② 内部専用なら              revoke execute on function <署名> from anon, authenticated;");
  console.error("  ⚠ ②にする前に、src/*.js でその名前を grep して呼ばれていないことを確かめてください。");
  process.exit(1);
}

console.log("  ✅ 「閉じたつもりで開いている」関数は 0 件");
