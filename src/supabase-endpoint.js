// 接続先（Supabase の URL と公開鍵）を1か所で決める葉モジュール。続き630。
//
// 【なぜ作ったか】オンラインの自動テスト（`test/online-smoke.mjs`）は**本物の Supabase
// プロジェクト**に部屋と対局を作る。手で何度か回すぶんには構わないが、**毎回自動で回すには
// 本番のデータを汚し続ける**（部屋・試合・匿名アカウントが積もる）。接続先を差し替えられる
// ようにして、**自分のPCで動かした Supabase（`supabase start`）へ向けて回せる**ようにする。
//
// 🔴 **安全の全部はここ、「ローカルの開発ホストでしか効かない」という1点に掛かっている。**
// 本番（seven.asobuzz.net）では**この上書きを一切見ない**。見てしまうと、誰かが端末の
// localStorage に偽の接続先を入れることで、**本物のプレイヤーのログイン情報を別のサーバーへ
// 向けられる**ことになる。だから:
//   - ホスト名が localhost / 127.0.0.1 / [::1] / *.localhost / *.test の時だけ上書きを読む
//   - 上書きの値も http://localhost… / http://127.0.0.1… しか受け付けない
//     （「ローカルで動かしている」という前提と矛盾する値は無視する）
//   - 少しでも怪しければ既定（本番）に落とす。**黙って別の所へ繋がない**
//
// ⚠ **この判断は `location.hostname` だけで行う。** 「開発中かどうか」を localStorage の
// フラグ等で決めてはいけない——それ自体が書き換えられるので、守りにならない。
//
// 使い方（開発時のみ）:
//   localStorage.setItem("so7-dev-supabase-url", "http://127.0.0.1:54321");
//   localStorage.setItem("so7-dev-supabase-anon-key", "<ローカルの anon key>");
//   → localhost で開いた時だけ、そちらへ繋ぐ。

// 本番の接続先（既定）。**ここが唯一の真実**で、online.js / admin-dashboard.js は
// それぞれ別に持たない（2か所に書くとズレる＝このプロジェクトで何度も踏んだ形）。
export const PROD_SUPABASE_URL = "https://prnddzrnblfysggiuzmo.supabase.co";
export const PROD_SUPABASE_ANON_KEY = "sb_publishable_YFYWr0FghhXbrqNQJ9Jzgw_hu31kvw9";

const DEV_URL_KEY = "so7-dev-supabase-url";
const DEV_KEY_KEY = "so7-dev-supabase-anon-key";

// このページは「自分のPCで開発中の画面」か。
// 🔴 ここを緩めてはいけない（上の注意書き）。
function isLocalDevHost() {
  try {
    if (typeof location === "undefined") return false;
    const h = location.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h === "::1" ||
      h.endsWith(".localhost") ||
      h.endsWith(".test")
    );
  } catch (e) {
    return false;
  }
}

// 上書きの値が「本当にローカルを指しているか」。
function isLocalUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const h = url.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost") || h.endsWith(".test");
  } catch (e) {
    return false;
  }
}

let resolved = null;

// 実際に使う接続先。{ url, anonKey, isDev } を返す。
export function getSupabaseEndpoint() {
  if (resolved) return resolved;
  resolved = { url: PROD_SUPABASE_URL, anonKey: PROD_SUPABASE_ANON_KEY, isDev: false };
  try {
    if (!isLocalDevHost()) return resolved; // 🔴 本番では上書きを見ない
    const u = localStorage.getItem(DEV_URL_KEY);
    const k = localStorage.getItem(DEV_KEY_KEY);
    if (!u || !k) return resolved;
    if (!isLocalUrl(u)) {
      console.warn("[so7] 開発用の接続先がローカルを指していないので無視した:", u);
      return resolved;
    }
    resolved = { url: u.replace(/\/+$/, ""), anonKey: k, isDev: true };
    // 開発時だけ、どこへ繋いでいるかをはっきり出す（本番を触っていると勘違いしないため）。
    console.info("[so7] 開発用の Supabase へ繋ぎます:", resolved.url);
  } catch (e) {
    /* localStorage が使えない環境では既定（本番）のまま */
  }
  return resolved;
}

// 開発用の接続先が効いているか（テストや画面の表示で使う）。
export function isDevSupabase() {
  return getSupabaseEndpoint().isDev;
}
