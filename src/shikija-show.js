// 🔴【#869・続き896】色者の見せ場（画面いっぱいの4拍）。
//
// ユーザー案（報告 #869）:
//   「捨て色で色者が移動する時、**色者アイコンが大きく出て**、**捨て色カード確認して**、
//    その後、**色者アイコンのその色の棘が光って**、その後、
//    **色者カードアップになってカードが移動する**のはどう？」
//
// ⚠ 続き792 の4拍（中央でめくる→お知らせの中の小さい円盤→盤面の尾→範囲の輪）とは
//   **順番も中身も違う**ので、こちらへ切り直した。範囲の輪（白黒の効果が誰に届いたか）は
//   **そのまま残す**——あれは見た目ではなく「誰に効いたか」というルールの情報。
//
// 【作りの決まり】
// 🔴 **葉にする**（import は0本）。main.js から部品（札の面を作る関数・マスの矩形）を
//   もらう形にして、こちらからアプリの中身を引かない（輪を作らない）。
// 🔴 **body 直下に重ねる**。盤面の子にすると次の render() で捨てられる（#621・続き791 の実害）。
//   色者はターンの**終わり**に動くので、その直後から次の人の手番の描き直しが続く。
// ⚠ 当たり判定を奪わない（`pointer-events: none`）。
// ⚠ 状態は1つも変えない。転んでも対局は止めない（呼ぶ側が握りつぶす）。
// ⚠ 円盤の絵と、くさび・矢の部品は**お知らせと同じもの**を使う
//   （`assets/icons/shikija-dial.svg` と `.shikija-dial-wedge` / `.shikija-dial-arrow`）。
//   2か所に別々の見た目を持たない。

const 絵の道 = "assets/icons/shikija-dial.svg";

const 待つ = (ms) => new Promise((r) => setTimeout(r, ms));

// 拍の長さ（ms）。**毎ターンの終わりに流れる**ので、長くしすぎない。
export const SHIKIJA_SHOW_MS = { 出る: 340, 捨色: 900, 棘: 560, 寄る: 420, 飛ぶ: 640, 消える: 220 };

/**
 * 見せ場を開く（拍1「円盤が大きく出る」）。
 * @returns {null|{glow:Function, flyCard:Function, close:Function}} 出せない時は null
 */
export function openShikijaShow(rot = 0) {
  if (typeof document === "undefined" || !document.body) return null;
  // 二重に出さない（前のが残っていたら片付ける）
  for (const old of document.querySelectorAll(".shikija-show")) old.remove();

  const 幕 = document.createElement("div");
  幕.className = "shikija-show";
  const 包み = document.createElement("div");
  包み.className = "shikija-show-dial-wrap";
  // 🔴【続き897】**円盤ごと**、その札の向き（90°ずつ）に回す。
  //   盤面の札は続き891 から回して置いてあるので、円盤だけ印刷のままだと
  //   **矢の向きと実際の動きが食い違う**（実測: A以外の3席で食い違っていた）。
  //   ⚠ 回すのは包み（絵・くさび・矢をまとめて）＝**色のくさびは色の上に残る**。
  包み.style.setProperty("--shikija-show-rot", (Number(rot) || 0) + "deg");
  const img = document.createElement("img");
  img.className = "shikija-show-dial";
  img.src = 絵の道;
  img.alt = "";
  img.decoding = "async";
  // ⚠ 絵が読めなくても見せ場は続ける（円盤だけ消える）。
  img.addEventListener("error", () => img.remove());
  包み.appendChild(img);
  幕.appendChild(包み);
  document.body.appendChild(幕);
  requestAnimationFrame(() => 幕.classList.add("is-on"));

  let 閉じた = false;
  const close = () => {
    if (閉じた) return;
    閉じた = true;
    幕.classList.remove("is-on");
    setTimeout(() => 幕.remove(), SHIKIJA_SHOW_MS.消える + 60);
  };

  return {
    要素: 幕,
    /**
     * 拍2「捨て色カードを確認」。円盤の下に札を出して、少し見せてから引く。
     * ⚠ ここで出すのは**捨色の札**（色者の札ではない）。
     * @param {{作る:Function}} 引数 作る() … 札の面を作って返す（main.js が渡す）
     */
    async showDiscard({ 作る } = {}) {
      if (閉じた || typeof 作る !== "function") return;
      const 面 = 作る();
      if (!面) return;
      const 札 = document.createElement("div");
      札.className = "shikija-show-discard";
      札.appendChild(面);
      幕.appendChild(札);
      requestAnimationFrame(() => 札.classList.add("is-on"));
      await 待つ(SHIKIJA_SHOW_MS.捨色);
      札.classList.remove("is-on");
      setTimeout(() => 札.remove(), 320);
      await 待つ(200);
    },
    /**
     * 拍3「その色の棘が光る」。お知らせの円盤と**同じ部品**を使う。
     * @param {{mode?:string, angle?:number, color?:string}} dial
     */
    async glow(dial) {
      if (閉じた || !dial) return;
      const 色 = dial.color || "#ffffff";
      const 角 = Number.isFinite(dial.angle) ? dial.angle : 0;
      if (dial.mode === "move") {
        for (const cls of ["shikija-dial-wedge", "shikija-dial-arrow"]) {
          const el = document.createElement("div");
          el.className = cls + " shikija-show-mark";
          el.style.setProperty("--shikija-angle", 角 + "deg");
          el.style.setProperty("--shikija-color", 色);
          包み.appendChild(el);
        }
      } else if (dial.mode === "rainbow" || dial.mode === "nomove") {
        const el = document.createElement("div");
        el.className = (dial.mode === "rainbow" ? "shikija-dial-rainbow" : "shikija-dial-nomove") + " shikija-show-mark";
        包み.appendChild(el);
      } else {
        return;
      }
      await 待つ(SHIKIJA_SHOW_MS.棘);
    },
    /**
     * 拍4「色者カードがアップになって移動する」。
     * @param {{作る:Function, from:DOMRect|null, to:DOMRect|null}} 引数
     *   作る() … 札の面を作って返す関数（main.js が渡す。こちらはカードの中身を知らない）
     *   from/to … 移動元・移動先のマスの**画面上の矩形**（3D変形込みの実際の見え方）
     */
    async flyCard({ 作る, from, to } = {}) {
      if (閉じた || typeof 作る !== "function") return;
      const 面 = 作る();
      if (!面) return;
      const 札 = document.createElement("div");
      札.className = "shikija-show-card";
      札.appendChild(面);
      幕.appendChild(札);
      // 🔴 置き場所は**マスの矩形から測る**（rem の決め打ちにしない＝どの端末でも合う）。
      //   矩形が無い（盤面が見えていない）時は、画面の真ん中でアップにするだけにする。
      const 大きさ = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.42);
      札.style.width = 大きさ + "px";
      札.style.height = 大きさ + "px";
      const 中央 = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const 置く = (x, y, s) => {
        札.style.transform =
          "translate(" + (x - 大きさ / 2) + "px," + (y - 大きさ / 2) + "px) scale(" + s + ")";
      };
      // 拍4-1: 出発マスから中央へ「アップ」になる（矩形が無ければ中央で浮かぶだけ）
      const 出 = from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : 中央;
      置く(出.x, 出.y, from ? Math.max(0.12, from.width / 大きさ) : 0.6);
      札.getBoundingClientRect(); // 置き直しを確定させてから動かす
      札.classList.add("is-zooming");
      置く(中央.x, 中央.y, 1);
      // ⚠ 遷移は1コマ遅れて始まるので、**少し長めに待つ**。きっかり寄る(420ms)で次へ行くと
      //   実測でアップが 8割（268/336px）までしか膨らまないうちに飛び始めていた。
      await 待つ(SHIKIJA_SHOW_MS.寄る + 140);
      // 拍4-2: 中央から移動先へ飛ぶ
      if (to) {
        札.classList.add("is-flying");
        置く(to.left + to.width / 2, to.top + to.height / 2, Math.max(0.12, to.width / 大きさ));
        await 待つ(SHIKIJA_SHOW_MS.飛ぶ);
      } else {
        await 待つ(SHIKIJA_SHOW_MS.飛ぶ);
      }
      札.classList.add("is-done");
    },
    close,
  };
}
