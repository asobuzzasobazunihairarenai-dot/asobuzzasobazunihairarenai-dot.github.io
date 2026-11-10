// 本番の Edge Function を1コマンドで差し替えるための道具（続き685）。
//
// 【なぜ要るか】それまでは **Supabase ダッシュボードのコードエディタへ本文を手で貼る**運用だった。
//   85KB を貼るのは遅く、途中で「Session expired」「Lock broken by another request」に当たるし、
//   **貼り忘れると「特定の場面だけ壊れる」という分かりにくい形**で出る（まぜる山札・
//   ファーストカード・接触の枚数で実際に3回起きた）。
//
// 使い方:
//   npm run deploy:fn:check   … 本番と手元が同じかだけ見る（**何も変えない**）
//   npm run deploy:fn         … 本番へ流す（yes の入力が要る）
//   node tools/deploy-function.mjs so7-send-push --check
//   node tools/deploy-function.mjs --dry   … 通信せずに段取りだけ確かめる
//
// 🔴 **最初に1回だけ、人の手でログインが要る**（トークンは私からは入れられない）:
//     npx --yes supabase@2.122.0 login
//   以後はこの道具がそのトークンを使う。環境変数 SUPABASE_ACCESS_TOKEN でも動く。
//
// ⚠ ここが触るのは**本番**。`--yes` を付けて、さらに yes と入力しない限り流さない。
// ⚠ Supabase CLI は npm から**その場で**使う（devDependencies には入れない。CI が
//    `npm ci` のたびに CLI を落とすと検査が遅くなる＝tools/local-backend.mjs と同じ方針）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CLI = "supabase@2.122.0"; // tools/local-backend.mjs と同じ版に合わせる
// 本番のプロジェクト（CLAUDE.md・src/supabase-endpoint.js と同じもの）。
const PROJECT_REF = "prnddzrnblfysggiuzmo";

const 引数 = process.argv.slice(2);
const 名前 = 引数.find((a) => !a.startsWith("-")) || "so7-apply-action";
const 流す = 引数.includes("--yes");
const 空回し = 引数.includes("--dry");
const 本文のパス = path.join(ROOT, "supabase", "functions", 名前 + ".ts");

const 言 = (s) => console.log(s);
const 死ぬ = (s, code = 1) => { console.error(s); process.exit(code); };

// 改行を LF にそろえてから指紋を取る（手元は CRLF・本番は LF なので、そろえないと必ず違って見える）。
const 指紋 = (本文) => crypto.createHash("sha256").update(String(本文).replace(/\r\n/g, "\n")).digest("hex");

function npx(args, opts = {}) {
  const file = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(file, ["--yes", CLI, ...args], {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    stdio: opts.quiet ? "pipe" : "inherit",
    env: process.env,
  });
  // 🔴 起動そのものに失敗した時は何も出ないので、必ず理由を出す。
  if (r.error) 死ぬ("🔴 " + file + " を起動できませんでした: " + r.error.message);
  return r;
}

// 一時フォルダに「CLI が期待する形」を作る。
//   supabase/config.toml ＋ supabase/functions/<名前>/index.ts（**本文そのもの**）
// 🔴 入口に「../<名前>.ts を import するだけ」の殻を置かないこと——CLI が関数フォルダの
//    外のファイルを一緒に送ってくれるかは版によって違う。**本文を直に置けば迷いが無い。**
// ⚠ リポジトリの supabase/functions/<名前>/index.ts（tools/local-backend.mjs が作る殻）は
//    触らない。あちらは自分のPCで動かす時のもの。
function 作業場を作る(中身) {
  const 置き場 = fs.mkdtempSync(path.join(os.tmpdir(), "so7-fn-"));
  fs.mkdirSync(path.join(置き場, "supabase", "functions", 名前), { recursive: true });
  fs.writeFileSync(path.join(置き場, "supabase", "config.toml"), 'project_id = "so7-deploy"\n');
  if (中身 != null) fs.writeFileSync(path.join(置き場, "supabase", "functions", 名前, "index.ts"), 中身, "utf8");
  return 置き場;
}

function 片付ける(置き場) {
  try { fs.rmSync(置き場, { recursive: true, force: true }); } catch (e) { /* 残っても害は無い */ }
}

// 本番にいま入っている本文を取ってくる（取れなければ null）。
function 本番の本文() {
  const 置き場 = 作業場を作る(null);
  try {
    const r = npx(["functions", "download", 名前, "--project-ref", PROJECT_REF], { cwd: 置き場, quiet: true });
    if (r.status !== 0) {
      言("⚠ 本番の本文を取ってこられませんでした（この CLI の版に functions download が無いか、ログインしていない）。");
      const e = String(r.stderr || "").trim();
      if (e) 言("   " + e.split("\n").slice(-3).join("\n   "));
      return null;
    }
    const p = path.join(置き場, "supabase", "functions", 名前, "index.ts");
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  } finally {
    片付ける(置き場);
  }
}

function 聞く(問い) {
  return new Promise((r) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(問い, (a) => { rl.close(); r(String(a).trim()); });
  });
}

// ログイン済みか（トークンがあるか）。無ければ何をすればよいかを出して終わる。
function ログインを確かめる() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return;
  if (fs.existsSync(path.join(os.homedir(), ".supabase", "access-token"))) return;
  言("");
  言("🔴 まだログインしていません。**最初に1回だけ**、この1行を実行してください:");
  言("");
  言("    npx --yes " + CLI + " login");
  言("");
  言("   ブラウザが開いて承認を聞かれます。以後はこの道具がそのトークンを使います。");
  言("   （環境変数 SUPABASE_ACCESS_TOKEN でも動きます）");
  process.exit(2);
}

// ---- ここから本体 ----
if (!fs.existsSync(本文のパス)) 死ぬ("🔴 " + path.relative(ROOT, 本文のパス) + " がありません。名前を確かめてください。", 2);
const 本文 = fs.readFileSync(本文のパス, "utf8");
const 手元の指紋 = 指紋(本文);
言("関数: " + 名前 + "（" + Buffer.byteLength(本文) + " バイト・" + 本文.split(/\r?\n/).length + " 行）");
言("手元の指紋: " + 手元の指紋.slice(0, 16) + "…");

// --dry は通信しない（ログインしていなくても段取りだけ確かめられる）。
if (空回し) {
  const 置き場 = 作業場を作る(本文);
  const p = path.join(置き場, "supabase", "functions", 名前, "index.ts");
  const 同じ = 指紋(fs.readFileSync(p, "utf8")) === 手元の指紋;
  言("");
  言("（空回し）一時フォルダに置いた本文は手元と " + (同じ ? "同じ ✅" : "🔴 違う"));
  言("（空回し）流す時の中身: npx --yes " + CLI + " functions deploy " + 名前 + " --project-ref " + PROJECT_REF);
  言("（空回し）ログイン: " + (process.env.SUPABASE_ACCESS_TOKEN || fs.existsSync(path.join(os.homedir(), ".supabase", "access-token")) ? "済み" : "**まだ**"));
  片付ける(置き場);
  process.exit(同じ ? 0 : 1);
}

ログインを確かめる();

// ① いま本番に入っているものと比べる
const 前 = 本番の本文();
if (前 != null) {
  const 前の指紋 = 指紋(前);
  言("本番の指紋: " + 前の指紋.slice(0, 16) + "…");
  if (前の指紋 === 手元の指紋) {
    言("");
    言("✅ 本番と手元は同じです。流す必要はありません。");
    process.exit(0);
  }
  言("🔴 本番と手元が違います（" + Buffer.byteLength(前) + " バイト → " + Buffer.byteLength(本文) + " バイト）。");
}

if (!流す) {
  言("");
  言("（確認だけ）流すには: npm run deploy:fn");
  process.exit(0);
}

// ② 流す（本番が即座に書き換わる）
言("");
言("🔴 これから**本番**の " + 名前 + " を差し替えます（プロジェクト " + PROJECT_REF + "）。");
const 答え = await 聞く("   よければ yes と入力してください: ");
if (答え.toLowerCase() !== "yes") 死ぬ("やめました（本番は変えていません）。", 0);

const 置き場 = 作業場を作る(本文);
let 流れた = false;
try {
  const r = npx(["functions", "deploy", 名前, "--project-ref", PROJECT_REF], { cwd: 置き場 });
  if (r.status !== 0) 死ぬ("🔴 デプロイに失敗しました（上の出力を見てください）。本番は変わっていない可能性が高いです。");
  流れた = true;
} finally {
  片付ける(置き場);
}

// ③ 🔴 流した後に取り直して突き合わせる（「流した」と「入った」は別）
if (流れた) {
  const 後 = 本番の本文();
  if (後 == null) {
    言("");
    言("⚠ 流しましたが、**入ったかどうかを確かめられませんでした**（取り直せなかった）。");
    言("   ダッシュボードの Code タブで見てください。");
    process.exit(2);
  }
  if (指紋(後) !== 手元の指紋) {
    死ぬ("🔴 流した後の本文が手元と違います（" + 指紋(後).slice(0, 16) + "… ≠ " + 手元の指紋.slice(0, 16) + "…）。ダッシュボードで確かめてください。");
  }
  言("");
  言("✅ 本番に入りました。指紋も一致しています（" + 手元の指紋.slice(0, 16) + "…）。");
}
