// 【2026-11-04・#505】小さく表示する絵は、小さい版（assets/thumbs/）を使う。
//
// 🔴 なぜ: 画像のメモリは**ファイル容量ではなく「幅×高さ×4バイト」**で決まる（#223）。
//    実測（iPhone 932x430・dpr3・4人CPU戦）では、
//      ・背景 1672x941 を **15x15px** のアイコンに貼って **6.0MB**
//      ・プレイマット 1080x1080 を **15x15px** に貼って **4.5MB**
//      ・カード裏 433x433 を **15x15px** に貼って **0.7MB**
//      ・アバター 768x768 が画面に5枚（盤面は39〜74px）で **11.3MB**
//    ＝画像28MBのうち **23MB** が「表示より何十倍も大きい絵」だった。
//    勝利演出の直後に落ちる報告（#446・#454・#459・#505）では、墜落の控えに
//    imgMB 58〜68 が残っている。canvas を片付けても数字がほとんど動かなかったので、
//    ここが本丸。
//
// ⚠ 元の絵は1枚も触っていない。小さい版を `assets/thumbs/<種類>/<同じ名前>.webp` に
//    足しただけ（焼き出しは tools/make-thumbs.mjs）。原寸が要る所（プレイマットそのもの・
//    カードの拡大・大きいアバター）は今までどおり原寸を使う。
//
// 🔴 【2026-11-04・ユーザー指摘「PCのような大きい画面で見ると画像荒くならない？」】
//    **そのとおりだった。** 実測で、選ぶ一覧の見本は PC 2560x1440・dpr2 でも 102px あれば
//    足りる（384で十分）のに、**盤面のアバターは 389〜614px 要る**＝384では粗くなる。
//    ⇒ **貼った後に実際の大きさを測って、足りなければ原寸へ上げ直す**（下の ResizeObserver）。
//    画面が小さいスマホでは上がらないので、軽くなった効果はそのまま残る。
//    「どの画面なら足りるか」を式で当てるより、**実物を測る方が外さない。**
//
// ⚠ 小さい版が無い絵（新しく足した絵など）は、そのまま原寸を返す＝**今までどおり**動く。
//    `tools/check-thumbs.mjs` が「原寸はあるのに小さい版が無い」を見張る。
//    それでも取りこぼした時のために、貼る側は onerror で原寸へ戻す（setThumbSrc）。

// 小さい版を持っている種類。cards だけは裏面（back-*）だけが対象
// （盤面のカードは原寸が要る＝拡大して見るので）。
const THUMB_DIRS = ["backgrounds", "playmats", "avatars"];

// 🔴 焼き出しの長辺。**tools/make-thumbs.mjs の THUMB_EDGE と同じ値でなければならない**
//    （`tools/check-thumbs.mjs` が毎回2か所を照合する）。
export const THUMB_EDGE = 384;

/**
 * 絵のパスを、小さい版のパスに読み替える。対象外ならそのまま返す。
 * 例: assets/backgrounds/gray.webp → assets/thumbs/backgrounds/gray.webp
 */
export function thumbImagePath(src) {
  if (typeof src !== "string" || !src) return src;
  // data: や http(s): の外部画像（Googleのアイコン等）は対象外。
  if (!src.includes("assets/")) return src;
  const i = src.indexOf("assets/");
  const rel = src.slice(i + "assets/".length);
  const slash = rel.indexOf("/");
  if (slash < 0) return src;
  const dir = rel.slice(0, slash);
  const file = rel.slice(slash + 1);
  if (file.includes("/")) return src; // 入れ子は対象外
  const ok = THUMB_DIRS.includes(dir) || (dir === "cards" && file.startsWith("back-"));
  if (!ok) return src;
  // 焼き出しは全部 webp（元が png でも webp で出している）。
  const name = file.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  return src.slice(0, i) + "assets/thumbs/" + dir + "/" + name;
}

// 画面での大きさを見張る係。⚠ **1つを使い回す**（アバターの一覧は200枚以上並ぶので、
// 1枚ずつ作ると無駄が大きい）。
let sizeWatcher = null;
function ensureSizeWatcher() {
  if (sizeWatcher || typeof ResizeObserver === "undefined") return sizeWatcher;
  try {
    sizeWatcher = new ResizeObserver((entries) => {
      for (const e of entries) upgradeIfTooSmall(e.target);
    });
  } catch (err) {
    sizeWatcher = null;
  }
  return sizeWatcher;
}

/** 画面での大きさが小さい版を超えていたら、原寸へ上げ直す（戻すことはしない）。 */
function upgradeIfTooSmall(img) {
  const full = img?.dataset?.fullSrc;
  if (!full) return;
  const r = img.getBoundingClientRect();
  const 要る = Math.max(r.width, r.height) * (window.devicePixelRatio || 1);
  if (要る <= THUMB_EDGE) return;
  delete img.dataset.fullSrc;
  img.onerror = null;
  img.src = full;
  try {
    sizeWatcher?.unobserve(img);
  } catch (err) {
    /* 外せなくても害は無い */
  }
}

/**
 * img に小さい版を貼る。
 *   ・小さい版が無くて 404 になったら、黙って原寸へ戻す（絵が出ないより重い方がまし）
 *   ・画面での大きさが 384px を超えたら、原寸へ上げ直す（PCの大画面で粗くならないように）
 */
export function setThumbSrc(img, src) {
  if (!img) return;
  const thumb = thumbImagePath(src);
  if (thumb === src) {
    img.src = src;
    return;
  }
  // 🔴 **まずその場で測る。** 描画のたびに同じ img が使い回される（applyAvatarContent は
  //    既にある img.avatar-image を探して src を入れ直す）ので、ここで測らないと
  //    **上げ直した原寸が毎回の描画で小さい版へ戻される**。しかも箱の大きさは変わらないので
  //    ResizeObserver は二度と鳴らない＝**PCでずっと粗いまま**になる（実測でそうなった）。
  //    2回目以降はもう画面に出ているので、この同期の採寸で正しく決まる。
  const r0 = img.getBoundingClientRect();
  if (Math.max(r0.width, r0.height) * (window.devicePixelRatio || 1) > THUMB_EDGE) {
    delete img.dataset.fullSrc;
    img.onerror = null;
    img.src = src;
    return;
  }
  img.dataset.fullSrc = src;
  img.onerror = () => {
    img.onerror = null;
    if (img.dataset.fullSrc) img.src = img.dataset.fullSrc;
  };
  img.src = thumb;
  // まだ画面に出ていない（箱が0）ことがあるので、観測を始めて最初の採寸を待つ。
  try {
    ensureSizeWatcher()?.observe(img);
  } catch (err) {
    /* 見張れない環境では小さい版のまま＝少し粗いだけ */
  }
}
