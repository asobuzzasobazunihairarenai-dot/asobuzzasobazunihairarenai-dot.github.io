// パックを受け取った時の「飛んでいく」演出（#751）。
//
// ユーザー要望:「パックを受け取るを押した時、パックをゲットした演出が入るといいです！」
// ＋ ユーザー案:「**獲得するボタン自体から小さいパックの画像が飛び出して、ホームのパックを
//   開けるボタンのところに行く**のはどう？で、**パックを開けるボタンのところに開けてない
//   パックがあればその枚数をバッチで表示**するのはどう？」
//
// 🔴 なぜ「飛ばす」のか: 受け取った瞬間、**手に入った物がどこへ行ったのか**が分からないのが
//   いちばんの不満（報告の形）。数字が増えるだけでは目が追えない。
//   ⇒ **出どころ（押したボタン）から行き先（パックを開ける所）へ、物として運ぶ。**
//
// ⚠ **絵は読み込まない。** パックの見た目は CSS（紙の色＋ロゴ）で作る。
//   1枚のために画像を増やすと、幅×高さ×4バイトでメモリを食う（#223）。
//   ⓘ ロゴだけは既にある assets/ui-v2/logo.webp（pack-opening.js と同じ）。
// ⚠ **葉のモジュール**にする（どこも import しない）。呼ぶ側は card-pack-ui / daily-ring。
// ⚠ 演出が失敗しても受け取り自体は済んでいる——**何が起きても例外を外へ出さない**。

const LOGO = "assets/ui-v2/logo.webp";

// 飛んでいく先。見えている物の中から、**上から順に**探す。
//   ① ホームの「パックを開ける」タイル（ユーザー案の行き先そのもの）
//   ② パックの画面が前に出ている時は、その中の「パックを開ける」ボタン
//      （①はパネルの後ろに隠れていて、飛んでいっても見えないため）
function 行き先を探す() {
  const 候補 = [
    '.home-screen-tile[data-tile="packs"]',
    '[data-tile="packs"]',
    "#card-pack-panel .card-pack-actions button",
    "#card-pack-title",
  ];
  for (const sel of 候補) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) continue;
    return el;
  }
  return null;
}

function 小さいパック() {
  const el = document.createElement("div");
  el.className = "pack-fly";
  const logo = document.createElement("img");
  logo.className = "pack-fly-logo";
  logo.src = LOGO;
  logo.alt = "";
  logo.decoding = "async";
  el.appendChild(logo);
  return el;
}

// 受け取ったパックを、押したボタンから「パックを開ける」所へ飛ばす。
//   fromEl … 押したボタン（出どころ）。無ければ画面の真ん中から。
//   n      … 受け取った枚数。**見た目は最大3つまで**（それ以上は束に見えるだけで分かりにくい）。
// 戻り値: 飛ばした数（0 なら何もしていない）。実測から数えられるように返す。
export function flyPacksToOpener(fromEl, n = 1) {
  try {
    if (!Number.isFinite(n) || n <= 0) return 0;
    const to = 行き先を探す();
    if (!to) return 0; // 行き先が見えていないなら飛ばさない（画面外へ飛ぶのは意味が無い）
    const 減らす = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    const 枚 = Math.min(3, Math.max(1, Math.floor(n)));
    // ⚠ **要素でも矩形でも受ける。** 押した後に画面が作り直される所から呼ばれるので、
    //   呼ぶ側が「押した時の矩形」を控えて渡せるようにしておく（外れた要素は 0x0 になる）。
    const f = typeof fromEl?.getBoundingClientRect === "function" ? fromEl.getBoundingClientRect() : fromEl;
    const t = to.getBoundingClientRect();
    const sx = f && f.width > 0 ? f.left + f.width / 2 : window.innerWidth / 2;
    const sy = f && f.height > 0 ? f.top + f.height / 2 : window.innerHeight / 2;
    const tx = t.left + t.width / 2;
    const ty = t.top + t.height / 2;

    for (let i = 0; i < 枚; i++) {
      const el = 小さいパック();
      el.style.left = sx + "px";
      el.style.top = sy + "px";
      document.body.appendChild(el);
      const 遅れ = i * 110;
      const 時間 = 減らす ? 1 : 620;
      // 弧を描く（まっすぐ飛ぶと「数字が動いた」程度にしか見えない）。
      // 中間点は、出どころと行き先の中ほどから**上へ**持ち上げる。
      const mx = (tx - sx) * 0.5 + (i - (枚 - 1) / 2) * 26;
      const my = (ty - sy) * 0.5 - Math.max(80, Math.abs(tx - sx) * 0.28);
      const anim = el.animate(
        [
          { transform: "translate(-50%, -50%) scale(0.55) rotate(-8deg)", opacity: 0 },
          { transform: `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1) rotate(6deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(0.42) rotate(-4deg)`, opacity: 0.9 },
        ],
        { duration: 時間, delay: 遅れ, easing: "cubic-bezier(.25,.8,.35,1)", fill: "forwards" }
      );
      anim.addEventListener("finish", () => {
        el.remove();
        // 着いた所を1回だけ弾ませる（「ここに入った」と分かるように）。
        try {
          if (!減らす) {
            to.animate(
              [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }],
              { duration: 260, easing: "ease-out" }
            );
          }
        } catch { /* 演出が無くても困らない */ }
      });
      // 念のための後始末（finish が来ない端末でも残骸を置いていかない）。
      setTimeout(() => el.remove(), 時間 + 遅れ + 1500);
    }
    return 枚;
  } catch {
    return 0; // 🔴 受け取り自体は済んでいる。演出のために何かを壊さない。
  }
}
