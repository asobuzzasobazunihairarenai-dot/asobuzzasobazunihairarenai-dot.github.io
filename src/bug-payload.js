// 不具合報告をサーバーへ出す時の「大きさの整え方」。
//
// 🔴🔴【#805・続き822】**上限が文字数だったが、本当の制限はバイト数だった。**
//   報告 #805（パックを開けている時に落ちた）は、報告そのものが
//   `PGRST102 "Empty or invalid json"` で弾かれ、最小限の形で送り直されていた
//   ＝**墜落の記録がまるごと失われた**。いちばん要る時に、記録が届かなかった。
//
//   続き701 で「1本30万字」に切る手当ては入っていたが、
//   **日本語は UTF-8 で1文字3バイト**なので、30万字＝約900KB。
//   2本＋ context で**合計2MB近く**になり、受け口で切られて壊れた JSON として届く。
//   ⇒ **バイトで測って、全体の合計に上限を置く。**
//
// 🔴 **値打ちの順に残す。** 墜落の調べ物でいちばん効くのは `context`（計器の記録）で、
//   しかも小さい。長いのは行動ログとコンソール。だから:
//     ① context を先に確保する（小さいので、ほぼ必ず全部入る）
//     ② 残りをログ2本で分け合う（**後ろ＝直近を残す**。原因に近いのは終わりの方）
//
// ⚠ このファイルは**葉**（何も import しない）。online.js から使い、node からも直に測れる。

// 送る本文ぜんぶの合計（UTF-8 のバイト）。受け口の制限より十分に小さく取る。
export const BUG_TOTAL_BYTES_MAX = 700000;
// context は小さいが、万一巨大でもここで止める。
export const BUG_CONTEXT_BYTES_MAX = 150000;
export const BUG_COMMENT_BYTES_MAX = 12000;

const エンコーダ = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

// UTF-8 のバイト数。測れない端末では「1文字3バイト」で多めに見積もる（切りすぎる方が安全）。
export function バイト数(s) {
  if (s == null) return 0;
  const t = String(s);
  if (エンコーダ) {
    try { return エンコーダ.encode(t).length; } catch (err) { /* 下の見積もりへ */ }
  }
  return t.length * 3;
}

// 壊れた文字（単独サロゲート＝絵文字の片割れ）を落とす。
// ⚠ これが残ると UTF-8 にできず、やはり壊れた JSON として届く（続き701）。
export function 壊れた文字を落とす(s) {
  if (s == null) return null;
  return String(s).replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

// 後ろ（直近）を残してバイトで切る。切った時は頭に断りを書く（黙って短くしない）。
export function 後ろを残して切る(s, 上限バイト) {
  if (s == null) return null;
  let t = 壊れた文字を落とす(s);
  if (上限バイト <= 0) return "";
  if (バイト数(t) <= 上限バイト) return t;
  // 1文字3バイトと見て当たりを付け、入るまで少しずつ縮める（日本語でも数回で収まる）。
  let 文字数 = Math.max(1, Math.floor(上限バイト / 3));
  let 候補 = t.slice(-文字数);
  for (let i = 0; i < 24 && バイト数(候補) > 上限バイト; i++) {
    文字数 = Math.max(1, Math.floor(文字数 * 0.85));
    候補 = t.slice(-文字数);
  }
  // 切った拍子にサロゲートの片割れが先頭に残ることがある。
  候補 = 壊れた文字を落とす(候補);
  const 省いた = t.length - 候補.length;
  const 断り = "（長すぎたので古い方を " + 省いた + " 文字ぶん省きました）\n";
  // 断りを足してもう一度はみ出すなら、そのぶんさらに縮める。
  if (バイト数(断り + 候補) > 上限バイト) {
    候補 = 壊れた文字を落とす(候補.slice(Math.ceil(バイト数(断り) / 3)));
  }
  return 断り + 候補;
}

// 送る中身を、合計のバイト上限に収まる形へ整える。
//   戻り値: { comment, action_log, console_log, context, 内訳 }
//   ⚠ `内訳` は実測用（どれが何バイトになったか）。送らない。
// 🔴🔴【#808・続き827】**中まで掃除する。**
//   `壊れた文字を落とす` は文字列1本にしか効かない。ところが画面の記録（context）は
//   **object の中に何十本も文字列を持っている**し、それらは DOM の文字を `.slice(0, N)` で
//   切って集めたもの＝**絵文字の途中で切れている**ことがある（ボタンは 📋 ⏭ 🔔 🪙 だらけ）。
//   片割れが1文字でも混ざると、サーバーは**本文ごと**弾く（PGRST102。本番で実証）。
//   ⚠ 深さと件数に歯止めを置く（壊れた入れ子で固まらないように）。
export function 中まで掃除する(値, 深さ = 0) {
  if (深さ > 12) return null;
  if (typeof 値 === "string") return 壊れた文字を落とす(値);
  if (値 == null || typeof 値 === "number" || typeof 値 === "boolean") return 値;
  if (Array.isArray(値)) return 値.slice(0, 2000).map((v) => 中まで掃除する(v, 深さ + 1));
  if (typeof 値 === "object") {
    const 出 = {};
    let n = 0;
    for (const k of Object.keys(値)) {
      if (n++ > 2000) break;
      // 鍵も文字列なので、ここも掃除する（鍵に絵文字を使うことは今のところ無いが、
      // 「無いはず」で素通しにすると、足した人が踏む）。
      出[壊れた文字を落とす(k)] = 中まで掃除する(値[k], 深さ + 1);
    }
    return 出;
  }
  return null; // 関数・Symbol 等は送らない
}

// 🔴【#808・続き827】**最後の総点検。** 片割れが1文字でも残っていたら、そこで気づけるように。
//   （切る処理は文字の単位で切るので、**掃除したあとに切ると片割れが生まれ直す**。
//     だから掃除は「いちばん最後」にもう一度かける。）
const 片割れ = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
export function 片割れが残っているか(値, 深さ = 0) {
  // 🔴 **文字列化してから探してはいけない。** `JSON.stringify` は片割れを
  //   `\\ud83d` という**6文字のふつうのテキスト**に逃がすので、文字列化した後では
  //   永久に見つからない（最初そう書いて、0しか出ない検査になっていた）。
  //   ⇒ 中を歩いて、**生の文字列**を1本ずつ見る。
  if (深さ > 12) return false;
  if (typeof 値 === "string") return 片割れ.test(値);
  if (値 == null || typeof 値 !== "object") return false;
  if (Array.isArray(値)) return 値.some((v) => 片割れが残っているか(v, 深さ + 1));
  for (const k of Object.keys(値)) {
    if (片割れ.test(k)) return true;
    if (片割れが残っているか(値[k], 深さ + 1)) return true;
  }
  return false;
}

export function 送れる形に整える({ comment, actionLog, consoleLog, context } = {}) {
  const 本文 = 後ろを残して切る(comment ?? "", BUG_COMMENT_BYTES_MAX) ?? "";

  // ① context を先に確保する（小さくて、いちばん値打ちがある）。
  // 🔴【#808・続き827】**ここで中まで掃除する。** 素通ししていたのが届かない原因だった。
  let ctx = context == null ? null : 中まで掃除する(context);
  let ctxバイト = 0;
  if (ctx) {
    try {
      const s = JSON.stringify(ctx);
      ctxバイト = バイト数(s);
      if (ctxバイト > BUG_CONTEXT_BYTES_MAX) {
        const 頭 = 後ろを残して切る(s, BUG_CONTEXT_BYTES_MAX);
        ctx = { tooBig: true, bytes: ctxバイト, head: 頭 };
        ctxバイト = バイト数(JSON.stringify(ctx));
      }
    } catch (err) {
      ctx = { contextStringifyError: String(err).slice(0, 200) };
      ctxバイト = バイト数(JSON.stringify(ctx));
    }
  }

  // ② 残りをログ2本で分け合う。
  const 残り = Math.max(0, BUG_TOTAL_BYTES_MAX - バイト数(本文) - ctxバイト);
  const a0 = 壊れた文字を落とす(actionLog) ?? "";
  const c0 = 壊れた文字を落とす(consoleLog) ?? "";
  const aバイト = バイト数(a0);
  const cバイト = バイト数(c0);
  let a上限 = Math.floor(残り / 2);
  let c上限 = 残り - a上限;
  // 片方が小さければ、余りをもう片方へ回す（半分ずつで切り捨てない）。
  if (cバイト < c上限) { a上限 += c上限 - cバイト; c上限 = cバイト; }
  else if (aバイト < a上限) { c上限 += a上限 - aバイト; a上限 = aバイト; }

  // 🔴【#808・続き827】**切ったあとに、もう一度掃除する。**
  //   切る処理は文字の単位で切るので、**掃除したあとに切ると片割れが生まれ直す**
  //   （絵文字はちょうど2文字ぶんなので、境目に当たると半分だけ残る）。
  const 出 = {
    comment: 壊れた文字を落とす(本文) ?? "",
    action_log: actionLog == null ? null : 壊れた文字を落とす(後ろを残して切る(a0, a上限)),
    console_log: consoleLog == null ? null : 壊れた文字を落とす(後ろを残して切る(c0, c上限)),
    context: ctx,
    内訳: { comment: バイト数(本文), context: ctxバイト, a上限, c上限 },
  };
  // それでも残っていたら、**送る前に**気づけるように印を付ける（黙って弾かれるより良い）。
  if (片割れが残っているか(出)) 出.内訳.壊れた文字が残った = true;
  return 出;
}
