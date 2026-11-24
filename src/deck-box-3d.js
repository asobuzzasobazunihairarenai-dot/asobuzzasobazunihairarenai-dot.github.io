// 公式山札の見た目＝**実物の箱**（続き743・ユーザー要望
// 「公式山札のビジュアルはセブンの販売時の箱にしませんか？」
//  「箱を指でくるくる回して裏とかも見えるとおもしろいかも!」）。
//
// ■ 何を出すか
//   CSSの疑似3Dで組んだ**6面の箱**。指（マウス）でドラッグすると回り、離すと惰性で少し回って
//   止まり、しばらくすると正面へ戻る。裏面には物語の文・コンポーネント一覧・バーコードが
//   印刷されているので、**回すと読み物がある**。
//
// ■ 絵の出どころ（assets/boxes/・続き743 で焼いた）
//   | 版 | 元 |
//   |---|---|
//   | リメイク／0th拡張 | `画像素材\箱・パッケージ\SOSB_箱_フタ.png` / `_ウラ.png`（3662角の展開図。面は 503..3153） |
//   | 1st EDITION | `…★コンポーネント\箱\入稿_青パッケージ蓋展開図.ai` / `身展開図.ai` |
//   🔴 1st の蓋の天面には**もともと題字が無い**（タイル紋様だけ）。ロゴは**側面**に入っている。
//      「描けていない」と勘違いしないこと（実際に一度した）。
//   ⚠ イラストレーターは解約済みなので、.ai は `scratchpad/_pdf_render.mjs`（pdf.js）で描いた。
//
// ■ 新しい canvas は1枚も使わない
//   全画面の canvas は1枚で約23MB（#441・#607 で実機が落ちている）。ここは **img と CSS だけ**。
//
// ■ 3Dのハマりどころ（CLAUDE.md の教訓そのまま。読まずに書くとまた壊れる）
//   ①`transform-style: preserve-3d` の要素に `filter` を付けない（影は box-shadow）
//   ②祖先チェーンが全部 preserve-3d でないと子孫の3D変形が壊れる
//   ③`scale()` ではなく `scale3d()`（translateZ の奥行きが絶対サイズのまま残る）
//   ④`backface-visibility: hidden`
//
// 🔴 **このファイルは何も import しない葉にしてある**（card-set.js / my-stack.js と同じ作法）。
//   2D表示の判定だけは必要なので、**引数で受け取る**（import すると輪になりやすい）。

// 箱の実寸は 214 x 214 x 25mm。厚みは face の 11.7%。
export const BOX_DEPTH_RATIO = 25 / 214;

// 版ごとの絵。知らない版が来たら null（＝箱を出さない）。
const 箱の絵 = {
  remake: {
    top: "assets/boxes/rm-top.webp",
    back: "assets/boxes/rm-back.webp",
    side: "assets/boxes/rm-side.webp",
    edge: "#c8a05a",
  },
  ex0: {
    top: "assets/boxes/rm-top.webp",
    back: "assets/boxes/rm-back.webp",
    side: "assets/boxes/rm-side.webp",
    edge: "#c8a05a",
  },
  "1st": {
    top: "assets/boxes/1st-top.webp",
    back: "assets/boxes/1st-back.webp",
    side: "assets/boxes/1st-side.webp",
    edge: "#5ebcc2",
  },
  // 🔴【続き834】旧0th EDITION の箱。入稿の .ai（2024-03-02「パッケージ蓋/身展開図(31作成版)
  //   深さ修正」）から焼いた。ユーザーが在りかを教えてくれた。
  //   ⚠ 天面は**型抜き線の内側**（蓋の面）、側面は左の帯、裏は**身の印刷面**から切り出している。
  //     型抜き線が面に写り込まないよう、少し内側で切った（続き742 と同じ作法）。
  "0th": {
    top: "assets/boxes/old0th-top.webp",
    back: "assets/boxes/old0th-back.webp",
    side: "assets/boxes/old0th-side.webp",
    edge: "#d8d2c2",
  },
  // 🔴【続き839】「まぜる」の箱（ユーザー要望「まぜるやつも箱絵があってもいいかも！
  //   なんか色んな箱絵が混ざってる感じのかっこいい感じのやつ、既存の箱絵を組み合わせて」）。
  //   ⚠ **新しく描いた絵は1枚も無い**——リメイクと 1st の面を斜めの帯で継いだもの
  //     （`tools/make-mixed-box.mjs` で焼く。走らせ直せば同じ物が出る）。
  //   ⚠ まぜるの中身は**リメイク＋0th拡張＋1st**（src/mixed-deck.js）。0th拡張は
  //     ブースターパックで売られていて箱が無く、絵もリメイクの流用なので、
  //     リメイクの帯がそのぶんも兼ねている。**旧0th は入らないので混ぜていない。**
  mixed: {
    top: "assets/boxes/mixed-top.webp",
    back: "assets/boxes/mixed-back.webp",
    side: "assets/boxes/mixed-side.webp",
    edge: "#c7a460",
  },
};

export function hasDeckBoxArt(cardSet) {
  return !!箱の絵[cardSet];
}

// 箱を1つ作って返す（DOM要素）。中身:
//   <div class="deck-box-3d"><div class="deck-box-3d-inner">6面</div></div>
// 返り値には .so7Box = { front(), flip(), destroy() } を生やしてある。
//
// options:
//   size      … 一辺の px（既定 150）
//   flat      … true なら回さない（2D表示モード。動くものを全部止める）
//   onTap     … ドラッグではない「押した」時に呼ぶ（選ぶ等）。ドラッグした時は呼ばない。
//   nameplate … 蓋に載せる文字（マイ山札の名前）。空なら載せない。
//
// 🔴【続き835】第1引数は**エディションの名前**でも、**絵の組**でもよい。
//   ユーザー案「マイ山札も同じ箱サイズで並ぶのはどう？ 箱のスキンはユーザーがマイ山札を
//   作るときに好きなカードのイラストを箱のスキンとして設定します」。
//   ⇒ マイ山札には**刷られた箱が無い**ので、呼ぶ側が絵を作って渡す。
//   ⚠ このファイルは**何も import しない葉**のまま保つ（card-set.js と同じ作法）。
//     カードの絵の道を知っているのは呼ぶ側なので、**ここでは受け取るだけ**にする。
//   絵の組 = { top, back, side, edge }。`side` は省けて、その時は edge の色で塗る。
export function buildDeckBox3d(cardSet, { size = 150, flat = false, onTap = null, nameplate = "" } = {}) {
  const 絵 = typeof cardSet === "string" ? 箱の絵[cardSet] : cardSet;
  // ⚠ 天面の絵（top）が無くてもよい（スキンを選んでいないマイ山札＝**無地の箱**になる）。
  if (!絵) return null;

  const 厚み = Math.max(8, Math.round(size * BOX_DEPTH_RATIO));

  const root = document.createElement("div");
  root.className = "deck-box-3d" + (flat ? " is-flat" : "");
  root.style.width = `${size}px`;
  root.style.height = `${size}px`;
  // 近すぎると上面と側面の継ぎ目が目立つ（教訓8）。一辺の3倍くらいが素直。
  root.style.perspective = `${size * 3}px`;

  const inner = document.createElement("div");
  inner.className = "deck-box-3d-inner";
  root.appendChild(inner);

  const 面を作る = (クラス, 変形, { img = null, 幅 = size, 高 = size } = {}) => {
    const f = document.createElement("div");
    f.className = "deck-box-face " + クラス;
    f.style.width = `${幅}px`;
    f.style.height = `${高}px`;
    // 🔴 面ごとに大きさが違うので、中心合わせは **left/top の px** で行う。
    //   transform に translate(-50%,-50%) を混ぜると、面ごとの rotate と順番が絡んで崩れる。
    f.style.left = `${(size - 幅) / 2}px`;
    f.style.top = `${(size - 高) / 2}px`;
    f.style.transform = 変形;
    f.style.backgroundColor = 絵.edge;
    if (img) {
      // ⚠ ショートハンド `background` は書かない（background-size が初期値へ戻る＝教訓9）。
      f.style.backgroundImage = `url("${img}")`;
      f.style.backgroundSize = "cover";
      f.style.backgroundPosition = "center";
    }
    inner.appendChild(f);
    return f;
  };

  const 半 = 厚み / 2;
  面を作る("is-front", `translateZ(${半}px)`, { img: 絵.top });
  面を作る("is-back", `rotateY(180deg) translateZ(${半}px)`, { img: 絵.back });
  // 側面4つ。左右は縦長の帯（ロゴが縦に入っている）、上下は横長なので90度回して敷く。
  面を作る("is-left", `rotateY(-90deg) translateZ(${size / 2}px)`, { img: 絵.side, 幅: 厚み, 高: size });
  面を作る("is-right", `rotateY(90deg) translateZ(${size / 2}px)`, { img: 絵.side, 幅: 厚み, 高: size });
  const 上 = 面を作る("is-up", `rotateX(90deg) translateZ(${size / 2}px)`, { img: 絵.side, 幅: size, 高: 厚み });
  const 下 = 面を作る("is-down", `rotateX(-90deg) translateZ(${size / 2}px)`, { img: 絵.side, 幅: size, 高: 厚み });
  // 側面の絵は縦長（64x512）なので、上下の面では90度ねじって敷く。
  // ⚠ 側面の絵が無い時（マイ山札）は何もしない——edge の色で塗られたままにする。
  if (絵.side) {
    for (const f of [上, 下]) {
      f.style.backgroundSize = `${厚み}px ${size}px`;
      f.style.backgroundRepeat = "repeat-x";
    }
  }

  // 🔴【続き835】蓋の名札（マイ山札の名前）。カードのイラストをそのまま貼ると
  //   「どの山札か」が分からないので、名前を重ねる。
  //   ⚠ `pointer-events: none`——箱を回す指を名札が食べない（教訓4 の家族）。
  if (nameplate) {
    const 札 = document.createElement("div");
    札.className = "deck-box-nameplate";
    札.textContent = nameplate;
    札.style.fontSize = `${Math.max(9, Math.round(size * 0.075))}px`;
    inner.querySelector(".deck-box-face.is-front")?.appendChild(札);
  }

  // ── 回す ───────────────────────────────────────────────────────────────
  // 休んでいる角度。少しだけ傾けておくと「立体である」ことが一目で分かる。
  const 休みY = -16, 休みX = 6;
  let rotY = 休みY, rotX = 休みX;
  let 速Y = 0, 速X = 0;
  let 掴んでいる = false, 動かした = false;
  let 前X = 0, 前Y = 0, 掴んだ時刻 = 0;
  let コマ = 0, 戻すタイマー = 0;

  const 描く = () => {
    inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  };
  描く();

  const 止める = () => {
    if (コマ) cancelAnimationFrame(コマ);
    コマ = 0;
    if (戻すタイマー) clearTimeout(戻すタイマー);
    戻すタイマー = 0;
  };

  // 惰性で回って、止まったら休みの角度へ戻る。
  const 回し続ける = () => {
    コマ = requestAnimationFrame(() => {
      rotY += 速Y;
      rotX = Math.max(-70, Math.min(70, rotX + 速X));
      速Y *= 0.94;
      速X *= 0.94;
      描く();
      if (Math.abs(速Y) > 0.05 || Math.abs(速X) > 0.05) 回し続ける();
      else {
        コマ = 0;
        戻すタイマー = setTimeout(() => 戻す(), 1400);
      }
    });
  };

  const 戻す = () => {
    止める();
    // いちばん近い「表向き」へ寄せる（1周半回していても遠回りしない）。
    const 目標Y = 休みY + Math.round((rotY - 休みY) / 360) * 360;
    const 走る = () => {
      rotY += (目標Y - rotY) * 0.12;
      rotX += (休みX - rotX) * 0.12;
      描く();
      if (Math.abs(目標Y - rotY) > 0.3 || Math.abs(休みX - rotX) > 0.3) コマ = requestAnimationFrame(走る);
      else {
        rotY = 目標Y; rotX = 休みX; 描く(); コマ = 0;
      }
    };
    走る();
  };

  if (!flat) {
    root.style.touchAction = "none"; // 横スワイプをページのスクロールに取られない
    root.addEventListener("pointerdown", (e) => {
      止める();
      掴んでいる = true;
      動かした = false;
      前X = e.clientX; 前Y = e.clientY;
      掴んだ時刻 = performance.now();
      速Y = 0; 速X = 0;
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* 取れなくても回せる */ }
      root.classList.add("is-grabbed");
    });
    root.addEventListener("pointermove", (e) => {
      if (!掴んでいる) return;
      const dx = e.clientX - 前X, dy = e.clientY - 前Y;
      前X = e.clientX; 前Y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) 動かした = true;
      rotY += dx * 0.6;
      rotX = Math.max(-70, Math.min(70, rotX - dy * 0.4));
      速Y = dx * 0.6; 速X = -dy * 0.4;
      描く();
    });
    const 離す = () => {
      if (!掴んでいる) return;
      掴んでいる = false;
      root.classList.remove("is-grabbed");
      if (動かした) 回し続ける();
      else {
        // 押しただけ＝回していない。短く押した時だけ「選ぶ」とみなす。
        if (performance.now() - 掴んだ時刻 < 700 && typeof onTap === "function") {
          try { onTap(); } catch (err) { console.error("[deck-box-3d] onTap で例外", err); }
        }
      }
    };
    root.addEventListener("pointerup", 離す);
    root.addEventListener("pointercancel", 離す);
    root.addEventListener("lostpointercapture", 離す);
  } else if (typeof onTap === "function") {
    root.addEventListener("click", () => {
      try { onTap(); } catch (err) { console.error("[deck-box-3d] onTap で例外", err); }
    });
  }

  root.so7Box = {
    front: () => { 止める(); rotY = 休みY; rotX = 休みX; 描く(); },
    // 裏返す（「裏も見える」ことに気づいてもらう近道）。
    flip: () => {
      止める();
      const 目標 = rotY > 90 || rotY < -90 ? 休みY : 休みY + 180;
      const 走る = () => {
        rotY += (目標 - rotY) * 0.16;
        if (Math.abs(目標 - rotY) > 0.3) コマ = requestAnimationFrame(走る);
        else { rotY = 目標; コマ = 0; }
        描く();
      };
      走る();
    },
    destroy: 止める,
  };
  return root;
}
