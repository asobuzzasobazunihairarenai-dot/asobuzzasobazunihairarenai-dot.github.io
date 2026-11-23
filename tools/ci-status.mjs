// 【続き805】push した後の CI の結果を見る。
//
//   node tools/ci-status.mjs            ← いまの HEAD を1回だけ見る
//   node tools/ci-status.mjs da042b9    ← そのコミットを見る
//   node tools/ci-status.mjs --watch    ← 終わるまで待つ（45秒おき・最大10回）
//
// 🔴 なぜ要るか: CLAUDE.md に「push したら CI の結果を見る」と書いてあるのに、見る道具が
//   無かったので毎回その場で書いていた。そして **2026-11-23 に GitHub の API の上限を
//   使い切った**——`gh` CLI が入っていないので**認証なしのAPI**を叩くことになり、あれは
//   **1時間あたり60回**しかない。20秒おきに30回ポーリングすると**1回の見張りで半分**使う。
//   ⇒ ①間隔を45秒にする ②上限に当たったら**すぐ止めて、いつ戻るかを言う**
//     （当たり続けると「CIが終わらない」と取り違える。実際そう取り違えた）。
//
// 🔴 上限に当たってしまった時の逃げ道: **ブラウザで見る**（APIの枠を使わない）。
//   https://github.com/<repo>/commit/<sha> を開いて「Status checks: success」を探す。
//   アプリ内のブラウザ（mcp__Claude_Browser__*）でも読める。
//
// ⚠ "cancelled" は**後の push に打ち切られた**だけで失敗ではない
//   （この workflow は concurrency: cancel-in-progress: true）。赤と取り違えないこと。
import { execSync } from "node:child_process";

const 引数 = process.argv.slice(2);
const 見張る = 引数.includes("--watch");
const SHA = 引数.find((a) => !a.startsWith("--")) || execSync("git rev-parse HEAD").toString().trim();

// リポジトリは origin から読む（別のリポジトリへ持って行っても動く）
const 遠い = execSync("git remote get-url origin").toString().trim();
// 🔴 **リポジトリ名に「.」が入る**（asobuzzasobazunihairarenai-dot.github.io）。
//   最初 `[^/.]+` と書いて **最初の「.」で切れた名前**を組み立ててしまい、
//   出した URL が存在しないリポジトリを指していた（走らせて気づいた）。
//   ⇒ 末尾の `.git` だけを落とす。
const m = /github\.com[/:](.+?)(?:\.git)?\/?$/.exec(遠い);
if (!m) {
  console.error("🔴 origin が GitHub ではない: " + 遠い);
  process.exit(2);
}
const REPO = m[1];
// ⚠ User-Agent は一般名にする（ユーザーの個人情報を外へ出さない）。
const H = { "User-Agent": "ci-check", Accept: "application/vnd.github+json" };

function 上限の案内(res) {
  const 残り = res.headers.get("x-ratelimit-remaining");
  const 戻る = res.headers.get("x-ratelimit-reset");
  const いつ = 戻る ? new Date(Number(戻る) * 1000) : null;
  console.error("🔴 GitHub API の上限に当たった（認証なしは1時間に60回）。");
  console.error("   残り " + (残り ?? "?") + " 回" + (いつ ? " / 戻るのは " + いつ.toLocaleTimeString("ja-JP") : ""));
  console.error("   ⇒ ブラウザで見る: https://github.com/" + REPO + "/commit/" + SHA);
  console.error("     （ページの中の「Status checks」を探す。APIの枠を使わない）");
}

// 🔴 **この中で process.exit() を呼ばない。** fetch の後始末が残っている間に落とすと、
//   この環境では `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` で
//   **終了コード 127**（＝こちらが決めた番号ではない）になる。実際そうなった。
//   ⇒ 終わり方は**一番外**で決める（記憶 `rmsync-recursive-kills-node` と同じ家族）。
async function 一回() {
  const res = await fetch(
    "https://api.github.com/repos/" + REPO + "/commits/" + SHA + "/check-runs?per_page=50",
    { headers: H }
  );
  if (res.status === 403 || res.status === 429) {
    上限の案内(res);
    return { 終わり: 3 }; // 3 ＝「分からなかった」。赤（1）とは区別する
  }
  if (!res.ok) {
    console.error("🔴 HTTP " + res.status);
    return { 終わり: 2 };
  }
  const runs = (await res.json()).check_runs || [];
  if (runs.length === 0) return { 済: false, 文: "まだ1本も出ていない" };
  const 文 = runs.map((r) => r.name + ": " + r.status + (r.conclusion ? "/" + r.conclusion : "")).join("\n  ");
  const 済 = runs.every((r) => r.status === "completed");
  if (!済) return { 済: false, 文 };
  const 打ち切り = runs.filter((r) => r.conclusion === "cancelled");
  const 赤 = runs.filter((r) => !["success", "neutral", "skipped", "cancelled"].includes(r.conclusion));
  return { 済: true, 文, 打ち切り, 赤, 本数: runs.length };
}

let 終わり = 3;
for (let i = 1; i <= (見張る ? 10 : 1); i++) {
  const r = await 一回();
  if (r.終わり !== undefined) { 終わり = r.終わり; break; }
  console.log((見張る ? i + "回目 " : "") + SHA.slice(0, 7) + "\n  " + r.文);
  if (r.済) {
    if (r.打ち切り.length > 0) {
      console.log("ⓘ 打ち切られた（後の push が走った）: " + r.打ち切り.map((x) => x.name).join(" / "));
    }
    if (r.赤.length === 0) {
      console.log("\n✅ 全部 緑（" + r.本数 + "本）");
      終わり = 0;
    } else {
      console.log("\n❌ 赤: " + r.赤.map((x) => x.name + " → " + x.conclusion + "\n   " + x.html_url).join("\n   "));
      終わり = 1;
    }
    break;
  }
  if (!見張る) {
    console.log("\n⏳ まだ走っている（--watch で終わるまで待てる）");
    終わり = 0;
    break;
  }
  if (i === 10) {
    console.log("\n⚠ 時間内に終わらなかった（上限ではなく、本当に長い）。もう一度走らせるか、ブラウザで見る");
    break;
  }
  await new Promise((ok) => setTimeout(ok, 45000));
}
process.exitCode = 終わり;
