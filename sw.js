// Service Worker — Web Push（タブ/ブラウザを閉じていても届く本物のプッシュ通知）。続き198。
// ランク戦の「対戦相手が見つかりました！（レディチェック）」を、別タブどころかブラウザを
// 閉じていても受け取れるようにするのが主目的（browser-notify.js の Notification API は
// “タブが生きている間”だけで、閉じると届かないため）。
//
// 配置場所の注意: GitHub Pages はリポジトリをサブパス（…/7-SHADES-OF-S-EVEN-remake/）で
// 配信するため、この sw.js を「リポジトリ直下」に置くことで …/7-SHADES-OF-S-EVEN-remake/sw.js
// として配信され、Service Worker のスコープが同ディレクトリ（＝アプリ全体）になる。
// src/ 以下に置くとスコープが /src/ に限定されてしまうので、必ずリポジトリ直下に置く。

// ===== ここから下は「2回目以降の読み込みを速くする」ためのキャッシュ（続き625）=====
//
// 🔴 なぜ要るか: **GitHub Pages は全ファイルを `Cache-Control: max-age=600`（10分）で配る。
// このヘッダは変更できない。** だから10分以上あけて開き直すと、**毎回 約4MB・200件以上を
// 落とし直す**。スマホの2回目がいちばん損をしている。ここで自前に持てば、その往復が消える。
//
// 🔴 いちばん気をつけたこと: **「更新できない端末」を作らないこと。**
// このアプリには既に更新の仕組みがある（`src/update-checker.js`）——`version.json` を60秒ごとに
// 見て、変わっていたら取り直して読み込み直す。ここで素朴に「あるものは全部キャッシュから返す」
// と書くと、**その取り直しまでキャッシュが横取りして、永久に古いものが動き続ける**。
// だから次の3つを守っている:
//   ① 🔴 **溜めるのは `assets/` の絵と音だけ。** コード（`src/*.js`・CSS・`index.html`）は
//      **今までどおり毎回ネットワークから取る**。だから**「古いコードが永久に動き続ける」事故が
//      原理的に起きない**。容量の大半は絵と音なので、これで目的（スマホの2回目）は足りる
//      （実測: 2回目の 8,974KB のうち絵と音が 8,000KB 以上）。
//      ⚠ 残る食い違いは「絵が1つ前の版」だけで、②で次の更新時に必ず直る
//      （絵を差し替えることは実際にある＝続き598 でノワールの札を描き直した）。
//   ② **ページ側が新しい版を見つけた瞬間にキャッシュを捨てる**（`src/sw-cache.js` の
//      `purgeAppCache()`。窓の側でも `caches` は使えるので、やり取りは要らない）
//   ③ `version.json` は絶対に触らない（更新検知の唯一の真実）
//
// ⚠ **ページそのもの（index.html への移動）は横取りしない。** あれは今までどおりブラウザの
// 既定（max-age=600）に任せる。横取りすると「新しい index.html と古い JS」の組み合わせや、
// 10分以内の開き直しが今より遅くなる、といった**今より悪くなる余地**を作ってしまう。
// 容量の大半は下位のファイル（絵・音・JS・CSS）なので、そこだけで目的は足りる。
//
// ⚠ **止め方**: この仕組みをやめたい時は、**fetch の購読をしない sw.js を配り直せばよい**
// （activate で名前の違うキャッシュを消すので、古い入れ物も一緒に片付く）。ブラウザは
// sw.js 自体を毎回確かめに来るので、配り直せば必ず置き換わる。

// 入れ物の名前。**作りを変えたら番号を上げる**（activate で他の名前は消える）。
// 🔴 `src/sw-cache.js` の `RUNTIME_CACHE` と同じ値でなければならない。
//    ズレると「捨てるつもりの入れ物」と「溜めている入れ物」が別物になり、更新が永久に効かない。
//    `node tools/check-sw.mjs` が毎回一致を確かめている。
const RUNTIME_CACHE = "so7-runtime-v1";

// この要求をキャッシュに入れてよいか。
function isCacheableRequest(req) {
  if (req.method !== "GET") return false;
  // 🔴 音の部分取得（Range → 206）は入れない。欠けた断片を「全部」として配ることになる。
  if (req.headers.has("range")) return false;
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return false;
  }
  // 外部（Tailwind・Google Fonts・Supabase・YouTube）は触らない。中身を確かめられない
  // 応答（opaque）を溜めると、失敗を成功として持ち続けてしまう。
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.endsWith("/version.json")) return false; // ③更新検知の唯一の真実
  if (url.pathname.endsWith("/sw.js")) return false; // 自分自身
  // 🔴 **絵と音だけ。** コード（src/*.js・CSS・index.html）は溜めない＝①の理由。
  // GitHub Pages はサブパス配信もあり得るので、先頭からではなく「/assets/ を含むか」で見る。
  if (!url.pathname.includes("/assets/")) return false;
  return true;
}

// 🔴【測って分かった・外した機能の記録】最初は「`cache: "reload"` で取り直しを頼まれた要求は
// キャッシュを無視する」保険を入れていた。**実測したら、普通の再読み込みでキャッシュが
// 丸ごと無効になっていた**——**ブラウザは再読み込みの時、下位ファイルの要求に自動で
// `cache: "reload"` を付ける**ので、「人が更新ボタンを押した時」と区別が付かない。
// 入れたまま出していたら、**全端末に数MBを溜めるだけ溜めて、一度も使われない**ことになっていた。
// 取り直しは②（ページ側が捨てる）で保証する。**溜めるのが絵と音だけなので、これで十分。**

async function cacheFirst(req) {
  let cache = null;
  try {
    cache = await caches.open(RUNTIME_CACHE);
  } catch (e) {
    return fetch(req); // 入れ物が開けない環境では素通し（今までどおり動く）
  }
  const hit = await cache.match(req).catch(() => null);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    // 🔴 200 だけ入れる。206（部分）・30x・404・500 を入れると壊れたものを配り続ける。
    // `type: "basic"` ＝ 同じ場所から来た、中身を読める応答。
    if (res && res.status === 200 && res.type === "basic") {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    throw e; // 回線が死んでいる時。持っていれば上で返しているので、ここは素直に失敗させる
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // ⚠ ページそのものへの移動は横取りしない（上の注意書き）。
  if (req.mode === "navigate") return;
  if (!isCacheableRequest(req)) return; // 何もしない＝ブラウザの既定のまま
  event.respondWith(cacheFirst(req));
});

// ページ側から「捨てて」と言われた時用。`src/sw-cache.js` は窓の側で直接 caches.delete を
// 呼ぶのでこれは要らないが、窓から caches が使えない環境のための逃げ道として置いておく。
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "so7-purge-cache") return;
  event.waitUntil(
    caches
      .delete(RUNTIME_CACHE)
      .catch(() => false)
      .then((ok) => event.source && event.source.postMessage({ type: "so7-purge-done", ok }))
  );
});

self.addEventListener("install", () => {
  // 新しい SW を即座に有効化（更新の反映を早める）。
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 作りを変えて RUNTIME_CACHE の番号を上げた時に、古い入れ物を片付ける（続き625）。
      try {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n.startsWith("so7-") && n !== RUNTIME_CACHE).map((n) => caches.delete(n)));
      } catch (e) {
        /* 片付けに失敗しても動作には影響しない */
      }
      await self.clients.claim();
    })()
  );
});

// プッシュ受信 → OS 通知を表示。userVisibleOnly:true で購読しているため、push のたびに
// 必ず通知を出す必要がある（ブラウザが強制する）。同じ tag を使うと OS 側で1つにまとまる
// （前面タブが Notification API で出したものとも tag が同じなら二重に積まれない）。
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: event.data && typeof event.data.text === "function" ? event.data.text() : "お知らせ" };
  }
  const title = data.title || "7 SHADES OF S:EVEN";
  const options = {
    body: data.body || "",
    tag: data.tag || "so7-push",
    renotify: true,
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || "./" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知クリック → 既に開いているタブがあればフォーカス、無ければアプリを開く。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            await client.focus();
          } catch (e) {
            /* focus できなくても続行 */
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
        } catch (e) {
          /* openWindow 失敗は握りつぶす */
        }
      }
    })()
  );
});
