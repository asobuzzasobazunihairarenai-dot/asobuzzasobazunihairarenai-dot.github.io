// 2回目以降の読み込みを速くするためのキャッシュの、ページ側の受け口（続き625）。
//
// 🔴 なぜ要るか: **GitHub Pages は全ファイルを `Cache-Control: max-age=600`（10分）で配り、
// このヘッダは変更できない。** だから10分以上あけて開き直すと、**毎回 約4MB・200件以上を
// 落とし直す**。実際の仕掛けは `sw.js`（リポジトリ直下）にあり、ここはその登録と、
// 🔴 **溜めるのは `assets/` の絵と音だけ**（容量の大半）。コード（`src/*.js`・CSS・`index.html`）は
// 今までどおり毎回ネットワークから取るので、**「古いコードが永久に動き続ける」事故は原理的に
// 起きない**。残る食い違いは「絵が1つ前の版」だけで、下の `purgeAppCache()` で必ず直る。
// **「新しい版が出たらキャッシュを捨てる」** を担う。
//
// 🔴 このモジュールは**アプリの他のモジュールを一切 import しない**（葉モジュール）。
// main.js からも update-checker.js からも読まれるので、何かを import すると循環 import に
// なり得る（続き573 で実際に TDZ で落ちている）。

// 🔴 `sw.js` の `RUNTIME_CACHE` と同じ値でなければならない。ズレると「捨てるつもりの入れ物」と
// 「溜めている入れ物」が別物になり、**新しい版が永久に届かない端末**を作ってしまう。
// `node tools/check-sw.mjs` が毎回一致を確かめている。
import { APP_VERSION } from "./app-version.js";

export const RUNTIME_CACHE = "so7-runtime-v1";

// 🔴 **「どの版で溜めたか」の刻印**を、キャッシュ自身の中に1件だけ置く。
// 本物の要求とぶつからない名前にする（`/assets/` の下ではないので、sw.js の
// `isCacheableRequest` が勝手に上書きすることもない）。
const STAMP_URL = "so7-cache-stamp";

let registerPromise = null;

// Service Worker を登録する（起動時に1回）。
// ⚠ **`push-notify.js` も同じ `sw.js` を登録する**が、同じURL・同じスコープの登録は
// 仕様上まとめられる（同じ registration が返る）ので二重にはならない。
// 🔴 **あちらとは別にここで登録する理由**: `initPushNotify()` は `PushManager` が無い環境では
// **登録そのものをしない**。ところが **iPhone の Safari は（ホーム画面から開いていないと）
// PushManager を持たない**ことがある＝**いちばんキャッシュの恩恵が大きい端末で登録されない**。
// ここでは通知と無関係に、`serviceWorker` が在れば必ず登録する。
export function initAppCache() {
  try {
    if (!("serviceWorker" in navigator)) return Promise.resolve(null);
    if (registerPromise) return registerPromise;
    // 相対パス "sw.js" は今のページURL基準＝アプリ全体がスコープになる（sw.js の注意書き参照）。
    registerPromise = navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("sw register failed", err);
      return null;
    });
    // 🔴 登録を待たずに刻印を見比べる（登録と刻印は独立。待つ理由が無い）。
    void syncCacheStamp();
    return registerPromise;
  } catch (e) {
    return Promise.resolve(null);
  }
}

// 🔴【ここが要】**キャッシュに「どの版で溜めたか」の刻印を入れ、読み込みのたびに見比べる。**
// 違っていたら全部捨てて、新しい版の刻印で入れ直す。
//
// 🔴 **なぜ必要か（測って分かった穴）**: 最初は「update-checker が新しい版を見つけたら捨てる」
// だけに任せていた。ところが**コード（src/*.js）は溜めない設計にした**ので、コードは常に最新
// ＝ `APP_VERSION` と `version.json` が食い違うことが（GitHub の10分のキャッシュ以外では）
// 無い＝**捨てる処理が一度も走らない**。実測で「描き直した絵が永久に古いまま」になった。
// **『版が変わったら捨てる』は、版の変化を自分で覚えておかないと成立しない。**
//
// ⚠ `APP_VERSION` はコードと一緒に来る（＝常に最新）。だから「刻印 ≠ APP_VERSION」は
// そのまま「このキャッシュは前の版のもの」を意味する。
// ⚠ この照合の前に取りに行った絵は、その読み込みの間だけ古いことがある。**今までと同じ**
// （GitHub Pages は全ファイルを10分キャッシュするので、元から最大10分は古い絵が出る）。
// 次の読み込みでは必ず新しくなる。
async function syncCacheStamp() {
  try {
    if (typeof caches === "undefined") return "使えない";
    const cache = await caches.open(RUNTIME_CACHE);
    const prev = await cache
      .match(STAMP_URL)
      .then((r) => (r ? r.text() : null))
      .catch(() => null);
    if (prev === APP_VERSION) return "そのまま";
    await caches.delete(RUNTIME_CACHE);
    const fresh = await caches.open(RUNTIME_CACHE);
    await fresh.put(STAMP_URL, new Response(APP_VERSION));
    return prev ? "捨てて入れ直した" : "刻印した";
  } catch (e) {
    return "失敗";
  }
}

// 溜めたものを全部捨てる。**新しい版を見つけた時と、「更新する」を押した時に呼ぶ。**
// 🔴 これが「更新できない端末」を作らないための本丸。キャッシュが空になれば、次の取得は
// 必ずネットワークへ行く（sw.js の cacheFirst は、持っていなければ取りに行く作り）。
// ⚠ **窓の側でも `caches` は使える**ので、Service Worker とやり取りする必要はない
// （やり取りにすると「返事が来ない時どうするか」を考えることになり、そこが新しい穴になる）。
export async function purgeAppCache() {
  try {
    if (typeof caches === "undefined") return false;
    const ok = await caches.delete(RUNTIME_CACHE);
    // 捨てた直後は刻印も消えている。打ち直しておかないと、次の読み込みで
    // syncCacheStamp が「刻印が無い」＝もう一度捨てる、という無駄な1往復になる。
    try {
      const fresh = await caches.open(RUNTIME_CACHE);
      await fresh.put(STAMP_URL, new Response(APP_VERSION));
    } catch (e) {
      /* 打ち直せなくても、次の読み込みで捨て直すだけ（動作には影響しない） */
    }
    return ok;
  } catch (e) {
    return false;
  }
}
