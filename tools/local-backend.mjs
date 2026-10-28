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
// 🔴 **Supabase CLI は `docker` を PATH から探す**（自分で場所を教えられない）。
//    Docker Desktop は PATH を通さないことがあるので、**子プロセスの PATH に足して渡す**。
//    ⚠ 大文字小文字が環境で違う（Windows は `Path`）ので、既にある鍵をそのまま使う。
function childEnv() {
  const env = { ...process.env };
  const bin = findDocker();
  if (!bin || !bin.includes("/")) return env;
  const dir = path.dirname(bin);
  const key = Object.keys(env).find((k) => /^path$/i.test(k)) || "PATH";
  const cur = env[key] || "";
  if (!cur.split(path.delimiter).some((p) => p.replace(/\\/g, "/").replace(/\/$/, "") === dir)) {
    env[key] = dir + path.delimiter + cur;
  }
  return env;
}

const run = (file, args) => {
  const r = spawnSync(file, args, { cwd: ROOT, encoding: "utf8", stdio: "inherit", env: childEnv() });
  // 🔴 **起動そのものに失敗した時は何も出ない**ので、必ず理由を出す。
  //    （`npx` を `npx.cmd` と書かずに「失敗した」としか出せなかった実害がある。）
  if (r.error) console.error(`🔴 ${file} を起動できなかった: ${r.error.message}`);
  return r;
};
const capture = (file, args) => {
  const r = spawnSync(file, args, { cwd: ROOT, encoding: "utf8", env: childEnv() });
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || ""), status: r.status };
};
// 🔴 Windows から npx を呼ぶのに**2回つまずいた**ので、両方を避ける形で解決した:
//    ① `spawnSync("npx", …)` → **見つからない**（Windows の実体は `npx.cmd`）
//    ② `spawnSync("npx.cmd", …)` → **EINVAL**（Node 20 以降は安全のため `.cmd` を直接起動しない）
//    ⇒ **npx の中身（`npx-cli.js`）を node で直に走らせる**。シェルを挟まないので
//      道筋に空白があっても引用の心配が無い（このリポジトリの道筋には空白がある）。
function npxCli() {
  const dir = path.dirname(process.execPath);
  for (const p of [
    path.join(dir, "node_modules", "npm", "bin", "npx-cli.js"),
    path.join(dir, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}
const npx = (args) => {
  const cli = npxCli();
  // 見つからない環境では今までどおり名前で呼ぶ（Windows 以外はこれで通る）。
  if (!cli) return run("npx", ["--yes", CLI, ...args]);
  return run(process.execPath, [cli, "--yes", CLI, ...args]);
};
const npxCapture = (args) => {
  const cli = npxCli();
  if (!cli) return capture("npx", ["--yes", CLI, ...args]);
  return capture(process.execPath, [cli, "--yes", CLI, ...args]);
};

// 🔴 Docker Desktop は **PATH を通さないことがある**（Windows で実際にそうだった）。
//    `docker` だけを試すと「Docker が動いていない」と**誤報する**ので、既知の場所も探す。
//    ⚠ 「動いていない」と言う前に、呼べる道が在るかを確かめる（続き630 と同じ教訓）。
const DOCKER_CANDIDATES = [
  "docker",
  "C:/Program Files/Docker/Docker/resources/bin/docker.exe",
  "C:/Program Files/Docker/Docker/resources/bin/docker",
  (process.env.ProgramFiles || "") + "/Docker/Docker/resources/bin/docker.exe",
  (process.env.LOCALAPPDATA || "") + "/Docker/wsl/docker.exe",
  "/usr/bin/docker",
  "/usr/local/bin/docker",
];
let DOCKER = null;
function findDocker() {
  if (DOCKER) return DOCKER;
  for (const c of DOCKER_CANDIDATES) {
    // 名前だけ（"docker"）は PATH 任せ。道筋を含むものは**在る時だけ**試す。
    if (!c) continue;
    if (c.includes("/") && !fs.existsSync(c)) continue;
    const r = spawnSync(c, ["version", "--format", "{{.Client.Version}}"], { encoding: "utf8" });
    if (r.status === 0) {
      DOCKER = c;
      return DOCKER;
    }
  }
  return null;
}
const docker = (args) => capture(findDocker() || "docker", args);

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
if (!findDocker() || !docker(["info"]).ok) {
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
say(`Docker: 動いている（${findDocker()}）`);

const ensureConfig = () => {
  if (!fs.existsSync(CONFIG)) {
    say("`supabase init` で設定を作る …");
    if (npx(["init"]).status !== 0) die("🔴 supabase init に失敗した");
  }
  const { text, changed, how } = patchConfig(fs.readFileSync(CONFIG, "utf8"));
  if (changed) fs.writeFileSync(CONFIG, text);
  say(`匿名ログイン: ${how}`);
};

// 🔴 **Supabase CLI は `supabase/functions/<名前>/index.ts` を探す**が、このリポジトリは
//    **ダッシュボードへ貼る運用**なので平らな `so7-apply-action.ts` 1枚で持っている
//    （ファイルの冒頭にその手順が書いてある）。そのままでは CLI が見つけられず、
//    アプリからの送信が **404 Function not found** になる（実際になった）。
//    ⇒ **入口だけをその場で作る**。中身は1行で、本物を読み込むだけなので食い違わない。
//    ⚠ **git には入れない**（`supabase/.gitignore` に足す）。入れると、誰かが
//      `functions deploy` した時に `../` の参照ごと持って行って壊れる。
const FUNCS = ["so7-apply-action", "so7-send-push"];
const ensureFunctionEntries = () => {
  const made = [];
  for (const name of FUNCS) {
    const flat = path.join(ROOT, "supabase", "functions", `${name}.ts`);
    if (!fs.existsSync(flat)) continue;
    const dir = path.join(ROOT, "supabase", "functions", name);
    const entry = path.join(dir, "index.ts");
    const body =
      `// 自動生成（tools/local-backend.mjs）。自分のPCで動かす時だけ使う入口。\n` +
      `// 本物は ../${name}.ts（本番はその中身をダッシュボードへ貼る運用）。\n` +
      `// 🔴 このファイルは git に入れない。編集しても次回上書きされる。\n` +
      `import "../${name}.ts";\n`;
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(entry) || fs.readFileSync(entry, "utf8") !== body) {
      fs.writeFileSync(entry, body);
      made.push(name);
    }
  }
  // 生成したものを git から外す（既に書いてあれば触らない）。
  const gi = path.join(ROOT, "supabase", ".gitignore");
  const mark = "# 【続き632】自分のPCで動かす時だけ使うもの。git には入れない。";
  let cur = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  if (!cur.includes(mark)) {
    const add =
      "\n" + mark + "\n" +
      "# ・入口（index.ts）… 本番はダッシュボードへ貼る運用なので、追跡すると\n" +
      "#   誰かが `functions deploy` した時に ../ の参照ごと持って行って壊れる。\n" +
      FUNCS.map((n) => `functions/${n}/`).join("\n") + "\n" +
      "# ・config.toml … `supabase init` が作る。project_id に**作業フォルダの名前**が\n" +
      "#   入るので、追跡すると他の人の所で変な名前になる。道具が毎回作り直す。\n" +
      "config.toml\n";
    fs.writeFileSync(gi, cur.replace(/\n*$/, "") + add);
  }
  say(`Edge Function の入口を用意した（${FUNCS.join(" / ")}）`);
  // 🔴 **Edge Runtime はマウントを持たず、起動した瞬間のファイルを中へ写す**。
  //    既に立ち上がっている所へ入口を作っても**反映されず、404 のまま**になる（実際になった）。
  //    作り直した時だけ、立て直しが要ることを伝える。
  if (made.length) {
    const r = docker(["ps", "--filter", "name=supabase_edge_runtime", "--format", "{{.Names}}"]);
    if (r.out.trim()) {
      say("⚠ Edge Runtime が既に動いている。**入口を作り直したので立て直しが要る**:");
      say("    node tools/local-backend.mjs down && node tools/local-backend.mjs up");
    }
  }
};

const dbContainer = () => {
  const r = docker(["ps", "--filter", "name=supabase_db", "--format", "{{.Names}}"]);
  return r.out.split("\n").map((s) => s.trim()).filter(Boolean)[0] || null;
};

// 🔴 **姉妹プロジェクト（戦績管理システム）の表も要る。** アプリは `players` を20か所以上で
//    読み書きし、対局の記録を `matches` に入れる。本番には相手側が作ったものが在るが、
//    **ローカルには無い**ので、相手の設定SQLを**先に**流す。
//    ⚠ **こちらへコピーしない**（公開リポジトリだし、写すと必ずズレる）。実物を参照する。
//    場所は環境変数 `SO7_SISTER_SQL` で渡せる。既定はCLAUDE.mdに書いてある場所。
const SISTER_SQL =
  process.env.SO7_SISTER_SQL || "G:/マイドライブ/Cloud Code　作業フォルダ/supabase_setup.sql";

const pipeSql = (file, label, stopOnError = true) => {
  const c = dbContainer();
  if (!c) die("🔴 データベースの入れ物が見つからない（まず `up` で立ち上げる）");
  say(`SQL を流す（${label} → ${c}）…`);
  const r = spawnSync(
    findDocker(),
    [
      "exec", "-i", c, "psql", "-U", "postgres", "-d", "postgres",
      "-v", `ON_ERROR_STOP=${stopOnError ? 1 : 0}`, "-f", "-",
    ],
    { cwd: ROOT, input: fs.readFileSync(file), encoding: "utf8", env: childEnv() }
  );
  const out = (r.stdout || "") + (r.stderr || "");
  const lines = out.split("\n");
  const errs = lines.filter((l) => /^(ERROR|FATAL|psql:.*ERROR)/.test(l));
  const notices = lines.filter((l) => /^NOTICE/.test(l));
  say(`  出力 ${lines.length} 行 / ERROR ${errs.length} / NOTICE ${notices.length}`);
  for (const e of errs.slice(0, 10)) say("  🔴 " + e);
  for (const n of notices.slice(0, 5)) say("  （notice）" + n);
  return r.status === 0;
};

const applySisterSql = () => {
  if (!fs.existsSync(SISTER_SQL)) {
    say(`⚠ 戦績管理システムの設定SQLが見つからない: ${SISTER_SQL}`);
    say("  （`players` などが作られないので、アプリの一部がローカルで失敗する。");
    say("   場所が違う時は SO7_SISTER_SQL=<道筋> を付けて実行する）");
    return;
  }
  // 🔴 相手のファイルは**止めずに流す**（`ON_ERROR_STOP=0`）。
  //    2026-10-28 時点で 110 行目に `do $$` を `do $` と書いた誤りがあり、止めると
  //    **それ以降の152行（match_feedback_replies など）が作られない**。
  //    ⚠ こちらから相手のファイルは直さない（別リポジトリ）。**報告する**。
  pipeSql(SISTER_SQL, "戦績管理システム " + path.basename(SISTER_SQL), false);
  // こちらのテストに要る表が実際に出来たかを**確かめてから**先へ進む（黙って進まない）。
  const need = ["players", "matches", "match_feedback_replies"];
  const q = `select string_agg(tablename, ',') from pg_tables where schemaname='public' and tablename in ('${need.join("','")}')`;
  const c2 = dbContainer();
  const got = spawnSync(
    findDocker(),
    ["exec", "-i", c2, "psql", "-U", "postgres", "-d", "postgres", "-tAc", q],
    { cwd: ROOT, encoding: "utf8", env: childEnv() }
  );
  const have = (got.stdout || "").trim().split(",").filter(Boolean);
  const missing = need.filter((t) => !have.includes(t));
  say(`  戦績側の表: 在る ${have.join(" / ") || "(なし)"}${missing.length ? "｜🔴 無い " + missing.join(" / ") : "｜✅ 揃った"}`);
  // 🔴 相手の設定SQLは**本番に追いついていない**（players.user_id が1行も無い等）。
  //    アプリが実際に使う列を足す（こちら側で持っているファイル。本番では不要）。
  const prereq = path.join(HERE, "local-prereq.sql");
  if (fs.existsSync(prereq)) pipeSql(prereq, "足りない列を足す " + path.basename(prereq), false);
};

const applySql = () => {
  const c = dbContainer();
  if (!c) die("🔴 データベースの入れ物が見つからない（まず `up` で立ち上げる）");
  if (!fs.existsSync(SQL)) die("🔴 " + path.basename(SQL) + " が無い");
  applySisterSql();
  say(`SQL を流す（${path.basename(SQL)} → ${c}）…`);
  // 🔴 ファイルを標準入力から渡す（ホストに psql が無くてよい）。
  // `ON_ERROR_STOP=1` にする——**どこで失敗したかを知りたい**ので止める。
  // storage まわりだけは SQL 側が例外を飲む作りになっている（続き630 で確認済み）。
  const r = spawnSync(
    findDocker(),
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
  const r = npxCapture(["status"]);
  say(r.out.trim());
  // 🔴 CLI の出し方が版によって違う。2.122 は**JSON 1行**で出し、古い版は
  //    「API URL: …」「anon key: …」の表で出す。**両方を読む。**
  //    （片方しか書いていなかったので「鍵が読めなかった」と誤報した。）
  let api, anon;
  const j = r.out.match(/\{[\s\S]*"API_URL"[\s\S]*\}/);
  if (j) {
    try {
      const o = JSON.parse(j[0]);
      api = o.API_URL;
      // 本番は `sb_publishable_…` 形式なので、在ればそちらを優先して本番に近づける。
      anon = o.PUBLISHABLE_KEY || o.ANON_KEY;
    } catch (e) {}
  }
  if (!anon) anon = (r.out.match(/anon key:\s*(\S+)/i) || [])[1];
  if (!api) api = (r.out.match(/API URL:\s*(\S+)/i) || [])[1];
  if (!anon || !api) {
    say("🔴 鍵が読めなかった（`npx supabase status` を直接見る）");
    return;
  }
  say("");
  // `config.toml` の `[edge_runtime] enabled = true` のおかげで、`supabase start` が
  // `supabase/functions/` の中身を**一緒に出してくれる**（別窓で serve しなくてよい）。
  // ⚠ 直したものをすぐ試したい時だけ、下の `functions serve` を別窓で使う（即反映になる）。
  say("Edge Function（so7-apply-action）は `supabase start` が一緒に出している:");
  say(`  ${api}/functions/v1/so7-apply-action`);
  say(`  （直して即反映したい時だけ別窓で: npx --yes ${CLI} functions serve so7-apply-action）`);
  say("");
  say("そのうえで、オンラインの自動テスト（本番には触らない）:");
  say("");
  say(`  SO7_LOCAL_SUPABASE_URL=${api} SO7_LOCAL_ANON_KEY=${anon} node test/online-smoke.mjs 4 --local`);
};

if (cmd === "up") {
  ensureConfig();
  ensureFunctionEntries();
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
