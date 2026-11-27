// プロフィール／マイページの画面全体版（続き74）。ユーザー要望「画面全体を使うように
// したい」。実際のデータ取得・描画ロジックはmy-page.js（アバター変更・戦績表示等、
// 元々モーダルとして実装済みだった）のrenderMyPageBody()をそのまま呼ぶだけで、
// ここでは「画面全体の器」だけを新しく用意する。ホーム画面(home-screen.js)と同じ
// 「フルスクリーンのページ、モーダルではない」見た目・構造にした。

import { renderMyPageBody } from "./my-page.js";
import { applyProfileLayout, registerProfileLayoutHelpers } from "./profile-layout-editor.js";
import { syncFullScreenPageActive } from "./option-area.js";
import { closeShopPanel } from "./shop.js";
// 全画面ページ（プロフィール/ランキング/ヘルプ）は同時に1つだけにする。開く時に他を閉じることで、
// オプションエリアのアイコンを交互に押した時にDOMが背面に取り残されて開かなくなる不具合を防ぐ。
// 関数内でのみ使う遅延束縛なので相互import（循環）でも安全。
import { closeRankingPage } from "./ranking-page.js";
import { closeHelpPanel } from "./help.js";
// マイデッキ編集はマイページ内の大ボタンへ移設（ユーザー要望2026-08-11）。
// ユーザー要望2026-08-16「ボタンの代わりにメインデッキのビジュアル（3D箱）を置き、その下に編集ボタン」。
import { openMyDeckList, buildDeckCaseArt } from "./my-deck-list.js";
import { getSelectedDeckId, getDeckById, getAllDecks } from "./my-deck.js";
// 【#676・2026-11-15】メイン山札（マイ山札）の箱。my-stack.js は import を1つも持たない葉。
import { isMyStackActive, getMyStackRecipe } from "./my-stack.js";
import { getCardDefinition } from "./cards-data.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ13

let overlayEl = null;
let bodyEl = null;

// 編集モードのオン/オフや再描画要求で、開いていればマイページ本体を作り直す。
registerProfileLayoutHelpers({
  rerender: () => {
    if (bodyEl) renderProfileBody();
  },
});

// 【#685】中身ができるまでのあいだ置いておく、薄い板だけの骨組み。
//   ⚠ **カードの中には入れない**（中身は `visibility: hidden` なので一緒に消える）。
//     カードの上に重ねて置き、中身ができたら取り除く。
//   ⚠ 新しい画像は1枚も使わない（板はただの半透明の矩形）。
function 骨組みを出す() {
  const card = document.getElementById("profile-page-card");
  if (!card) return null;
  const 骨 = document.createElement("div");
  骨.className = "profile-skeleton";
  骨.setAttribute("aria-hidden", "true");
  // アバター1枚＋行がいくつか、という「だいたいの形」だけ。
  const 形 = ["is-avatar", "is-line w70", "is-line w45", "is-block", "is-line w60", "is-line w35"];
  for (const c of 形) {
    const b = document.createElement("div");
    b.className = "profile-skeleton-bar " + c;
    骨.appendChild(b);
  }
  card.appendChild(骨);
  return 骨;
}

async function renderProfileBody() {
  if (!bodyEl) return;
  // 🔴【#649・2026-11-14】ユーザー報告「マイページを開いた直後、全体が大きく端が見切れた
  //   状態になります。すぐにいい感じになります」。
  //   原因は**順番**: ここは中身を作るのを待つ（await）あいだ画面は既に出ており、
  //   縮めるのは `fitProfilePageContent()`＝**全部作り終わった後**。だから
  //   「等倍のはみ出した姿 → 縮む」が必ず一瞬見える。
  //   ⇒ 収まりを決めるまで**見せない**。`visibility` なので**大きさは測れる**
  //     （`display: none` にすると測れず、縮め方が決まらない）。
  bodyEl.style.visibility = "hidden";
  // 🔴【#685・2026-11-15】ユーザー報告「マイページを開くとき**メインデッキ以外の表示が
  //   少し遅い**」。`renderMyPageBody` は**通信を待つ**（戦績・ランク・フレンド）ので、
  //   その間ここは上の行で見えなくなっている＝**本当に何も無い**。
  //   メインデッキの箱だけはカードの外に在って通信を待たないので、そこだけ先に出る。
  //   ⇒ **骨組みを先に出す**（待ち時間は変わらないが「開いた」ことが即座に分かる）。
  //   ⚠ #649 の直し（収まりが決まるまで中身を見せない）はそのまま。骨組みは別の要素。
  const 骨 = 骨組みを出す();
  try {
    await renderMyPageBody(bodyEl, closeProfilePage);
    applyProfileLayout(bodyEl); // PROFILE_LAYOUT適用＋編集モードなら移動/リサイズ配線
    fitProfilePageContent();
    alignProfileSideColumn();
  } finally {
    // 途中で失敗しても必ず見せる（白いままにしない方が実害が小さい）。
    骨?.remove();
    bodyEl.style.visibility = "";
  }
}

// 【#326・2026-09-07】マイページの下が見切れる。ユーザー指示は「スクロールはなしにしたい」。
// 実測（ステージ単位・どの端末でも同じ）: 器の高さ 900 に対して中身が 1007＝**107はみ出す**。
//   上余白54 ＋ 戻るボタン34+16 ＋ 見出し29+22 ＋ カード820 ＋ 下余白32 = 1007
// はみ出しの大半はカード(820)なので、**カードだけを縮めて収める**。縮めた分は margin-bottom で
// 打ち消す（transform は場所を空けないので、そのままだと下に余分な空きが残る）。
// スマホでは上端の安全余白（--page-top-safe。オプションの帯のぶん約1.65倍）が加わってさらに
// はみ出すが、**実測してから縮める**ので端末ごとの違いに自動で追随する。
// レイアウト編集モードでは触らない（ドラッグで座標を決めている最中に倍率が変わると混乱するため）。
// 🔴【#688 #689・続き740】右の列（メインデッキ／マイ山札）の**天面を中身にそろえる**。
//   ユーザー指摘「アバターの枠の天面とメインデッキの枠の天面が揃ってないの気になりませんか？」。
//   中身（左2列）は**縦の真ん中**に置かれる＝天面の位置は中身の高さで決まるので、
//   CSS だけでは追えない。**描いた後に測って**変数へ入れる。
//   ⚠ 既定（?ui=0）では何も起きない（変数を読むのは v2 の規則だけ）。
//   ⚠ 2つ目の箱の位置は「1つ目の高さ」で決まるので、**先に1つ目を測ってから**入れる。
// 中身とデッキの箱の大きさを見張って、変わったら測り直す。
// ⚠ 測り直しの中で自分がまた呼ばれないよう、観測は1回だけ張る（要素も毎回同じ）。
// ⚠ ResizeObserver が無い環境では、代わりに数回だけ測り直す（最後の保険）。
let 観測者 = null;
function 観測を始める() {
  if (観測者 || !overlayEl || !bodyEl) return;
  const 的 = [bodyEl, overlayEl.querySelector("#profile-maindeck")].filter(Boolean);
  if (typeof ResizeObserver !== "function") {
    for (const ms of [120, 400, 900]) setTimeout(() => alignProfileSideColumn(), ms);
    return;
  }
  観測者 = new ResizeObserver(() => {
    if (!overlayEl?.isConnected) {
      観測者?.disconnect();
      観測者 = null;
      return;
    }
    alignProfileSideColumn();
  });
  for (const el of 的) 観測者.observe(el);
}

function alignProfileSideColumn() {
  if (!overlayEl || !bodyEl) return;
  if (!document.body.classList.contains("ui-v2")) return;
  const 外 = overlayEl.getBoundingClientRect();
  // 中身のいちばん上＝左の列の最初の札の天面。
  let 天 = Infinity;
  for (const el of bodyEl.querySelectorAll(":scope > * > *, :scope > *")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.top < 天) 天 = r.top;
  }
  if (!Number.isFinite(天)) return;
  // 🔴🔴 **物差しをそろえる。** getBoundingClientRect が返すのは**実画面px**だが、
  //   CSS の top に入るのは**ステージpx**（body がステージ倍率で変形している）。
  //   そのまま入れると倍率のぶんだけズレる——実測で 288 と書いたつもりが 238 に出た。
  //   ⇒ 倍率は overlay 自身から出す（見えている高さ ÷ レイアウト上の高さ）。
  //   （続き725 で自分が書いた教訓「どちらの物差しかを先に決める」を、ここで踏んだ。）
  const 倍率 = overlayEl.offsetHeight > 0 ? 外.height / overlayEl.offsetHeight : 1;
  const ステージpx = (実px) => Math.round(実px / (倍率 || 1));
  overlayEl.style.setProperty("--profile-side-top", ステージpx(天 - 外.top) + "px");
  // 🔴 実測で分かった: **1回測るだけでは足りない**。中身は通信を待って後から伸びるし、
  //   デッキの箱も絵を読み込んでから高さが決まる（実測で 206 → 260 に伸びた＝
  //   山札が40px 食い込んでいた）。⇒ **大きさが変わったら測り直す**。
  観測を始める();
  // 1つ目（メインデッキ）の実際の高さ＋間を、2つ目の天面として渡す。
  const 箱 = overlayEl.querySelector("#profile-maindeck");
  // 🔴 2つの札が画面の下からはみ出さないよう、**入る大きさに決める**。
  //   実測で、既定の1.5倍だと中身が高い時に 24px はみ出した。
  //   ⚠ 高さは `offsetHeight`（**変形前**のレイアウト上の高さ＝ステージpx）で考える。
  //     `getBoundingClientRect` は変形後なので、倍率を掛けると二重になる。
  const 山 = overlayEl.querySelector("#profile-mainstack");
  const 間 = 14;
  const 下の余白 = 16;
  if (箱) {
    const 天 = parseFloat(overlayEl.style.getPropertyValue("--profile-side-top")) || 0;
    const 使える = Math.max(120, ステージpx(外.height) - 天 - 下の余白);
    const 素の高さ = (箱.offsetHeight || 0) + (山?.offsetHeight || 0);
    let 倍 = 1.5;
    if (素の高さ > 0) 倍 = Math.max(0.85, Math.min(1.5, (使える - 間) / 素の高さ));
    overlayEl.style.setProperty("--profile-side-scale", String(Math.round(倍 * 1000) / 1000));
    overlayEl.style.setProperty("--profile-deck-h", Math.round((箱.offsetHeight || 0) * 倍) + 間 + "px");
  }
  // 🔴【#757・続き816】**3列目のぶんの空きを、決め打ちではなく測って詰める。**
  //   報告「マイデッキ マイ山札の列とその他の項目との間の広いスペース列が気になります」。
  //   空けていたのは `padding-right: 21rem`（決め打ち）だが、列そのものは**画面の右端から**
  //   置かれる（`right: 4rem`）。中身のカードが画面より狭いと**二重にずれて**
  //   大きな空白の帯になる（実測 101px）。⇒ カードの右端と列の左端の**実際の差**だけ空ける。
  //   ⚠ 倍率を入れた直後は配置がまだ動いていないので、**次のコマで測る**。
  //   ⚠ 測れなければ何もしない（CSS の既定 21rem のまま＝今までどおり）。
  requestAnimationFrame(() => {
    try {
      if (!overlayEl || !document.body.classList.contains("ui-v2")) return;
      const card = document.getElementById("profile-page-card");
      const 列 = overlayEl.querySelector("#profile-maindeck");
      if (!card || !列) return;
      const cr = card.getBoundingClientRect();
      const dr = 列.getBoundingClientRect();
      if (dr.width <= 0 || cr.width <= 0) return;
      const すきま = 18; // 列と中身がくっつかないぶん（ステージpx）
      const 要る = Math.max(0, ステージpx(cr.right - dr.left)) + すきま;
      overlayEl.style.setProperty("--profile-card-pad-right", Math.round(要る) + "px");

      // 🔴🔴【#843・続き873】**塊ごと中央に置く。**
      //   ユーザー指摘「マイページですが**右下に向かってギュッと少し全体が縮小されてる**
      //   ように見えます！」。測ったら縮小ではなく**左右の空きが揃っていなかった**
      //   （実測: 左 185px ／ 右 114px ＝ 塊の中心が画面の中心より 31px 右）。
      //   🔴 正体は、**メインデッキの列がカードの外に在って画面の右端から置かれる**こと
      //     （`right: 4rem`）。カードだけ見れば中央なのに、**列がはみ出すぶん塊が右へ寄る**。
      //     続き816 で入れた `--profile-card-pad-right` は**ぶつからない幅**を測るもので、
      //     **左右の空きを揃えるものではなかった**。
      //   ⇒ **格子を左へ寄せる**（列は動かさない）。これだけで塊の中心が画面の中心に来る。
      //   ⚠ **`transform` は使わない**——カードの `transform` は `fitProfilePageContent` の
      //     縮小が使っている（上書きすると縮小が消える）。`position: relative` + `left` なら喧嘩しない。
      //   ⚠ **いまの寄せ幅を足して決める**ので、1回で決まってそれ以上動かない
      //     （測った空きには寄せた分が入っているため。引き算だけだと毎回0に戻って揺れる）。
      const 格子 = overlayEl.querySelector(".profile-v2");
      if (格子) {
        const pr = overlayEl.getBoundingClientRect();
        const gr = 格子.getBoundingClientRect();
        if (gr.width > 0) {
          const いま = parseFloat(overlayEl.style.getPropertyValue("--profile-grid-shift")) || 0;
          const 左の空き = ステージpx(gr.left - pr.left);
          const 右の空き = ステージpx(pr.right - dr.right);
          let 寄せ = いま + (左の空き - 右の空き);
          // ⚠ 右へは寄せない（列にぶつかる）。左へ行きすぎて画面から出ないよう歯止め。
          寄せ = Math.max(0, Math.min(寄せ, 左の空き + いま - 8));
          if (Math.abs(寄せ - いま) > 2) {
            overlayEl.style.setProperty("--profile-grid-shift", Math.round(寄せ) + "px");
          }
        }
      }
    } catch { /* 空きの調整のためにマイページを壊さない */ }
  });
}

function fitProfilePageContent() {
  const page = overlayEl;
  const card = document.getElementById("profile-page-card");
  if (!page || !card) return;
  if (document.body.classList.contains("profile-layout-edit")) return;
  // いったん等倍に戻してから測る（前回の縮小を含んだ値で計算しないため）。
  card.style.transform = "";
  card.style.marginBottom = "";
  const clientH = page.clientHeight;
  const scrollH = page.scrollHeight;
  const cardH = card.offsetHeight;
  if (!clientH || !cardH || scrollH <= clientH) return; // 収まっているなら何もしない
  const nonCard = scrollH - cardH; // カード以外（余白・戻る・見出し）が使っている高さ
  const k = Math.max(0.55, Math.min(1, (clientH - nonCard) / cardH));
  if (k >= 0.999) return;
  card.style.transformOrigin = "top center";
  card.style.transform = `scale(${k})`;
  card.style.marginBottom = `${-Math.round(cardH * (1 - k))}px`;
  // 縮めたら天面も動くので、測り直す。
  alignProfileSideColumn();
}

export function openProfilePage(onClose) {
  if (overlayEl) return;
  // #2026-08-16: ショップを開いたままだと裏に残るため、遷移先を開く時はショップを閉じる
  // （プロフィールはショップより前面だが、他ページと挙動を揃える。ショップ未表示なら安全なno-op）。
  closeShopPanel();
  // ユーザー報告2026-08-18「マイページ/ランキングを交互に押すと途中でランキングが開かなくなる
  // （背面に行っている）」。原因は openRankingPage は profile を閉じるのに openProfilePage は
  // ranking を閉じていなかった非対称——ranking のDOMが背面に取り残され、その overlayEl も
  // 残るため次の ranking 押下が `if(overlayEl) return` で早期returnしていた。開く時に他の全画面
  // ページを閉じて対称にする（未表示なら安全なno-op）。
  closeRankingPage();
  closeHelpPanel();
  overlayEl = document.createElement("div");
  overlayEl.id = "profile-page";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.id = "profile-page-back";
  // ユーザー指摘（続き84）「戻る場所はホームとは限らない（オプションエリアの
  // アイコンから直接開く経路もある）ので単に『戻る』でいい」。
  backBtn.textContent = t("pp.back");
  backBtn.addEventListener("click", () => {
    closeProfilePage();
    onClose?.();
  });
  overlayEl.appendChild(backBtn);

  const title = document.createElement("div");
  title.id = "profile-page-title";
  title.textContent = t("pp.title");
  overlayEl.appendChild(title);

  // マイページ右下：メインデッキのビジュアル＋その下に「マイデッキ編集」ボタン
  // （ユーザー要望2026-08-16）。ビジュアル・ボタンどちらを押してもデッキ一覧（編集画面）へ。
  // 位置・サイズは管理者モードのCSS変数(--profile-maindeck-*、admin.js)で調整可能。
  const openEditor = () => {
    closeProfilePage();
    openMyDeckList(() => openProfilePage(onClose));
  };
  const mydeckWrap = document.createElement("div");
  mydeckWrap.id = "profile-maindeck";

  // 「メインデッキ」ラベル（ユーザー要望2026-08-16：テキスト横のアイコン🏅は不要）。
  const badge = document.createElement("div");
  badge.className = "profile-maindeck-badge";
    badge.textContent = t("pp.mainDeck");
  mydeckWrap.appendChild(badge);

  const cover = document.createElement("button");
  cover.type = "button";
  cover.className = "profile-maindeck-cover";
    cover.title = t("pp.editDeckTip");
  cover.addEventListener("click", openEditor);
  // メインデッキ（getSelectedDeckId）を3D立体ケースで表示。無ければ先頭のデッキ、それも
  // 無ければ「未設定」。ケースはデッキ一覧と同じ共通部品（buildDeckCaseArt）を流用。
  const mainDeck = getDeckById(getSelectedDeckId()) || getAllDecks()[0] || null;
  if (mainDeck) {
    cover.appendChild(buildDeckCaseArt(mainDeck)); // 3D立体ケース（MTGAデッキボックス風）
    const nm = document.createElement("div");
    nm.className = "profile-maindeck-name";
      nm.textContent = mainDeck.name || t("pp.myDeck");
    cover.appendChild(nm);
  } else {
    cover.classList.add("is-empty");
      cover.textContent = t("pp.noMainDeck");
  }
  mydeckWrap.appendChild(cover);

  // 🔴【#758・続き814】**テキストの「マイデッキ編集」は外した**（ユーザー判断）。
  //   ユーザー要望「**絵をタップすれば編集ページに行ければいいので、テキストの
  //   マイデッキ編集とマイ山札を作るはいらないかも！**」。
  //   上の箱（cover）が既に同じ openEditor を呼ぶので、**同じことを2つ並べていた**。
  //   ⚠ 箱の座標（管理者が詰めた --profile-maindeck-*）には1行も触っていない。
  //   ⚠ 押せる所が減ったわけではない——箱そのものが大きな当たり判定。

  // 🔴【2026-11-15・続き726】ユーザー要望「**マイ山札作成をマイページにも実装しよう！**」。
  //   マイデッキ編集のすぐ下に、同じテキストリンク調で並べる。
  //   ⓘ **マイデッキとマイ山札は別物**: マイデッキは自分だけが引く持ち込みの山、
  //     マイ山札は**盤面になる共通の山**の組み方（公式の「山札のカスタマイズ」ルール）。
  //     紛れないよう、ラベルで言い分けている。
  //   ⚠ **動的 import**（my-deck-builder と同じ作法。静的に書くと
  //     profile-page → my-stack-editor → cards-data と輪になり得る）。
  //   ⚠ ここはマイページを**閉じない**——編集画面は全画面で上に重なるので、
  //     閉じると戻った時にマイページが消えてしまう。
  // 🔴【#758・続き814】**テキストの「マイ山札を作る」も外した**（ユーザー判断）。
  //   下の「メイン山札」の箱（sCover）が同じ openMyStackEditor を呼ぶ。

  overlayEl.appendChild(mydeckWrap);

  // 🔴【#676・2026-11-15】ユーザー要望「**マイページにメイン山札も縦長の四角柱の箱で併記。
  //   箱の面に中のカード1枚のイラスト。**」
  //   ⓘ **マイデッキとマイ山札は別物**（持ち込みの個人の山／盤面になる共通の山）なので、
  //     並べて置くと「2つある」ことがひと目で分かる。
  //   🔴 **箱は作り直さない。** デッキ一覧と同じ共通部品（buildDeckCaseArt）に、
  //     山札を「デッキの形」にして渡すだけ——箱の見た目を2か所に書くと必ず食い違う。
  //   ⚠ **#profile-maindeck には1行も触らない**（管理者が詰めた座標・transform が在る）。
  //     別の要素として、その左隣に自分の座標で置く。
  const mystackWrap = document.createElement("div");
  mystackWrap.id = "profile-mainstack";

  const sBadge = document.createElement("div");
  sBadge.className = "profile-mainstack-badge";
  sBadge.textContent = t("pp.mainStack");
  mystackWrap.appendChild(sBadge);

  const sCover = document.createElement("button");
  sCover.type = "button";
  sCover.className = "profile-maindeck-cover profile-mainstack-cover";
  sCover.title = t("pp.editStack");
  sCover.addEventListener("click", async () => {
    const m = await import("./my-stack-editor.js");
    m.openMyStackEditor();
  });
  // 箱の面に出す1枚＝**いちばん多く入れている札**（組み方の性格がそこに出る）。
  //   組んでいない人は標準の山なので、このゲームの看板＝なないろの欠片を出す。
  const 組み方 = isMyStackActive() ? getMyStackRecipe() : null;
  let 山の顔 = null;
  if (組み方 && Object.keys(組み方).length > 0) {
    let 最多 = 0;
    for (const [id, n] of Object.entries(組み方)) {
      if ((Number(n) || 0) > 最多) {
        最多 = Number(n) || 0;
        山の顔 = id;
      }
    }
  }
  if (!山の顔) 山の顔 = "rainbow-shard";
  // MDL_COLOR_HEX は7色だけなので、虹・白・黒は null にして既定の灰にさせる
  //   （無い色を渡すと --mdl-accent が "undefined" になって規則ごと無効になる）。
  const 顔の色 = getCardDefinition(山の顔)?.color || null;
  const 七色 = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];
  sCover.appendChild(
    buildDeckCaseArt({
      firstColor: 七色.includes(顔の色) ? 顔の色 : null,
      mainCardId: 山の顔,
      cards: { [山の顔]: 1 },
    })
  );
  const sName = document.createElement("div");
  sName.className = "profile-maindeck-name profile-mainstack-name";
  sName.textContent = 組み方 && Object.keys(組み方).length > 0 ? t("pp.myStack") : t("pp.standardStack");
  sCover.appendChild(sName);
  mystackWrap.appendChild(sCover);
  overlayEl.appendChild(mystackWrap);

  const card = document.createElement("div");
  card.id = "profile-page-card";
  overlayEl.appendChild(card);

  bodyEl = document.createElement("div");
  card.appendChild(bodyEl);

  document.body.appendChild(overlayEl);
  // ユーザー要望（続き75）「ホーム画面やプロフ全画面でも上のオプションエリアのアイコン等は
  // 表示していてください」。full-screen-page-active共通クラス（style.css参照）。
  syncFullScreenPageActive();

  // renderMyPageBodyの第2引数closeは「モーダルを閉じてから他の画面を開く」導線
  // （ログインする／連携するボタン等）で使われる。画面全体版でも同じ導線を保つため、
  // ここでのcloseもこのページ自体を閉じる処理にする。レイアウト編集モードの適用込みで描く。
  renderProfileBody();
  // 画面の高さが変わったら測り直す（スマホはツールバーの出入りで実際に変わる）。
  window.addEventListener("resize", fitProfilePageContent);
}

export function closeProfilePage() {
  観測者?.disconnect();
  観測者 = null;
  window.removeEventListener("resize", fitProfilePageContent);
  overlayEl?.remove();
  overlayEl = null;
  bodyEl = null;
  syncFullScreenPageActive();
}
