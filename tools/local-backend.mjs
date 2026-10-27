// 自分のPCで Supabase を動かして、オンラインの自動テストを本番を汚さずに回すための段取り。続き631。
//
// 【なぜ要るか】`test/online-smoke.mjs` は**本物の Supabase に部屋と対局を作る**。手で数回なら
// よいが、**自動で繰り返すと本番に部屋・試合・匿名アカウントが積もり続ける**。接続先を
// 差し替える仕組み（`src/supabase-endpoint.js`・続き630）は入れたので、あとは**向ける先**が要る。
//
// 使い方:
//   node tools/local-backend.mjs up       … 立ち上げて SQL を流し、テストの実行コマンドまで出す
//   node tools/local-backend.mjs sql      … SQL だけ流し直す（SQLを直した後）
//   node tools/local-backend.mjs status   … いまの状態と鍵を出す
//   node tools/local-backend.mjs down     … 止める（データは残る）
//   node tools/local-backend.mjs reset    … データを捨てて作り直す（⚠ ローカルのみ）
//   node tools/local-backend.mjs selftest … 設定の書き換えだけ試す（Docker 不要）
//
// 前提: Docker が動いていること。Supabase CLI は npm から**その場で**使う
// （`npx supabase@2.122.0`）。🔴 **devDependencies には入れない**——CI は `npm ci` を走らせるので、
// 入れると**毎回 CLI を落とすことになって検査が遅くなる**。CI はこれを必要としない。
//
// 🔴 **匿名ログインを有効にするのが要。** `supabase start` の既定は**無効**で、
// このアプリのテストは**アプリ自身の匿名ログイン**でセッションを得るので、
// 有効にしないとローカルでは1人も入れない。下の `patchConfig` がそれを入れる。
//
// ⚠ ここで触るのは**自分のPCの中だけ**。本番の Supabase には一切触らない。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const CLI = "supabase@2.122.0";
const CONFIG = path.join(ROOT, "supabase", "config.toml");
const SQL = path.join(ROOT, "supabase_setup_so7.sql");
const cmd = (process.argv[2] || "up").toLowerCase();

const say = (s) => console.log(s);
const die = (s, code = 1) => {
  console.error(s);
  process.exit(code);
};
const run = (file, args) => spawnSync(file, args, { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
const capture = (file, args) => {
  const r = spawnSync(file, args, { cwd: ROOT, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || ""), status: r.status };
};
const npx = (args) => run("npx", ["--yes", CLI, ...args]);

// 🔴 `config.toml` に「匿名ログインを有効」を入れる。既定は無効なので、入れないと
//    ローカルでは誰も入れない（このアプリのテストは匿名ログインでセッションを得る）。
//    ⚠ 既に true なら触らない（**何度当てても同じ結果になる**ようにしておく）。
export function patchConfig(text) {
  if (/^\s*enable_anonymous_sign_ins\s*=\s*true/m.test(text)) return { text, changed: false, how: "既に有効" };
  if (/^\s*enable_anonymous_sign_ins\s*=\s*false/m.test(text)) {
    return {
      text: text.replace(/^(\s*)enable_anonymous_sign_ins\s*=\s*false/m, "$1enable_anonymous_sign_ins = true"),
      changed: true,
      how: "false → true に直した",
    };
  }
  const m = text.match(/^\[auth\][ \t]*$/m);
  if (m) {
    const at = m.index + m[0].length;
    const add =
      "\n# 【続き631】オンラインの自動テストはアプリ自身の匿名ログインでセッションを得るので、\n" +
      "# ここを有効にしないとローカルでは1人も入れない（既定は無効）。\n" +
      "enable_anonymous_sign_ins = true\n";
    return { text: text.slice(0, at) + add + text.slice(at), changed: true, how: "[auth] 節へ足した" };
  }
  return { text: text + "\n[auth]\nenable_anonymous_sign_ins = true\n", changed: true, how: "[auth] 節ごと足した" };
}

// Docker が無くても試せる部分だけの自己点検。
if (cmd === "selftest") {
  const cases = [
    ["既に有効", "[auth]\nenable_anonymous_sign_ins = true\n"],
    ["false のまま", "[auth]\nenable_anonymous_sign_ins = false\n"],
    ["[auth] はあるが項目が無い", '[api]\nport = 1\n\n[auth]\nsite_url = "x"\n'],
    ["[auth] が無い", "[api]\nport = 1\n"],
    ["別の節に似た名前がある", '[auth.email]\nenable_signup = false\n\n[auth]\nsite_url = "x"\n'],
  ];
  let bad = 0;
  for (const [name, src] of cases) {
    const r = patchConfig(src);
    const ok = /^\s*enable_anonymous_sign_ins\s*=\s*true/m.test(r.text);
    if (!ok) bad++;
    say(`  ${ok ? "✅" : "🔴"} ${name}: ${r.how}`);
    const again = patchConfig(r.text);
    if (again.changed) {
      bad++;
      say("     🔴 2回目でまた変えてしまった（何度当てても同じ、になっていない）");
    }
  }
  say(bad ? `\n🔴 ${bad} 件おかしい` : "\n✅ 設定の書き換えは問題なし");
  process.exit(bad ? 1 : 0);
}

// ---- ここから下は Docker が要る ----
if (!capture("docker", ["info"]).ok) {
  die(
    [
      "🔴 Docker が動いていない（`docker info` が失敗）。",
      "",
      "  1) wsl --install   （管理者で実行 → 再起動）",
      "  2) winget install --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements",
      "  3) Docker Desktop を起動して「Engine running」になるまで待つ",
      "",
      "そのうえでもう一度 `node tools/local-backend.mjs up`。",
      "（設定の書き換えだけなら Docker 無しで試せる: `node tools/local-backend.mjs selftest`）",
    ].join("\n"),
    2
  );
}
say("Docker: 動いている");

const ensureConfig = () => {
  if (!fs.existsSync(CONFIG)) {
    say("`supabase init` で設定を作る …");
    if (npx(["init"]).status !== 0) die("🔴 supabase init に失敗した");
  }
  const { text, changed, how } = patchConfig(fs.readFileSync(CONFIG, "utf8"));
  if (changed) fs.writeFileSync(CONFIG, text);
  say(`匿名ログイン: ${how}`);
};

const dbContainer = () => {
  const r = capture("docker", ["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"]);
  return r.out.split("\n").map((s) => s.trim()).filter(Boolean)[0] || null;
};

const applySql = () => {
  const c = dbContainer();
  if (!c) die("🔴 データベースの入れ物が見つからない（まず `up` で立ち上げる）");
  if (!fs.existsSync(SQL)) die("🔴 " + path.basename(SQL) + " が無い");
  say(`SQL を流す（${path.basename(SQL)} → ${c}）…`);
  // 🔴 ファイルを標準入力から渡す（ホストに psql が無くてよい）。
  // `ON_ERROR_STOP=1` にする——**どこで失敗したかを知りたい**ので止める。
  // storage まわりだけは SQL 側が例外を飲む作りになっている（続き630 で確認済み）。
  const r = spawnSync(
    "docker",
    ["exec", "-i", c, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-f", "-"],
    { cwd: ROOT, input: fs.readFileSync(SQL), encoding: "utf8" }
  );
  const out = (r.stdout || "") + (r.stderr || "");
  const errs = out.split("\n").filter((l) => /^(ERROR|FATAL|psql:.*ERROR)/.test(l));
  const notices = out.split("\n").filter((l) => /^NOTICE/.test(l));
  say(`  出力 ${out.split("\n").length} 行 / ERROR ${errs.length} / NOTICE ${notices.length}`);
  for (const e of errs.slice(0, 10)) say("  🔴 " + e);
  for (const n of notices.slice(0, 5)) say("  （notice）" + n);
  if (r.status !== 0) die("🔴 SQL の適用に失敗した（上の ERROR を見る）");
  say("  ✅ SQL を流した");
};

const showKeys = () => {
  const r = capture("npx", ["--yes", CLI, "status"]);
  say(r.out.trim());
  const anon = (r.out.match(/anon key:\s*(\S+)/i) || [])[1];
  const api = (r.out.match(/API URL:\s*(\S+)/i) || [])[1];
  if (!anon || !api) {
    say("🔴 鍵が読めなかった（`npx supabase status` を直接見る）");
    return;
  }
  say("");
  say("⚠ Edge Function（so7-apply-action）は別の窓で出しておく:");
  say(`  npx --yes ${CLI} functions serve so7-apply-action --no-verify-jwt`);
  say("");
  say("そのうえで、オンラインの自動テスト（本番には触らない）:");
  say("");
  say(`  SO7_LOCAL_SUPABASE_URL=${api} SO7_LOCAL_ANON_KEY=${anon} node test/online-smoke.mjs 4 --local`);
};

if (cmd === "up") {
  ensureConfig();
  say("`supabase start` …（初回は入れ物を落とすので数分かかる）");
  if (npx(["start"]).status !== 0) die("🔴 supabase start に失敗した");
  applySql();
  showKeys();
} else if (cmd === "sql") {
  applySql();
} else if (cmd === "status") {
  showKeys();
} else if (cmd === "down") {
  npx(["stop"]);
} else if (cmd === "reset") {
  say("⚠ ローカルのデータを捨てて作り直す（本番には影響しない）");
  npx(["stop", "--no-backup"]);
  if (npx(["start"]).status !== 0) die("🔴 supabase start に失敗した");
  applySql();
  showKeys();
} else {
  die(`知らない命令: ${cmd}（up / sql / status / down / reset / selftest）`, 2);
}
