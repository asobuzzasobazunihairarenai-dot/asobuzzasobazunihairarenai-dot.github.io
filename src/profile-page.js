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

  // 「マイデッキ編集」ボタン（ユーザー要望2026-08-16：ボタン枠は不要＝テキストリンク調）。
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.id = "profile-maindeck-edit";
  // ユーザー要望2026-08-16「マイデッキ編集ボタンの絵文字アイコンは不要」。
    editBtn.innerHTML = `<span>${t("pp.editDeck")}</span>`;
  editBtn.addEventListener("click", openEditor);
  mydeckWrap.appendChild(editBtn);

  // 🔴【2026-11-15・続き726】ユーザー要望「**マイ山札作成をマイページにも実装しよう！**」。
  //   マイデッキ編集のすぐ下に、同じテキストリンク調で並べる。
  //   ⓘ **マイデッキとマイ山札は別物**: マイデッキは自分だけが引く持ち込みの山、
  //     マイ山札は**盤面になる共通の山**の組み方（公式の「山札のカスタマイズ」ルール）。
  //     紛れないよう、ラベルで言い分けている。
  //   ⚠ **動的 import**（my-deck-builder と同じ作法。静的に書くと
  //     profile-page → my-stack-editor → cards-data と輪になり得る）。
  //   ⚠ ここはマイページを**閉じない**——編集画面は全画面で上に重なるので、
  //     閉じると戻った時にマイページが消えてしまう。
  const stackBtn = document.createElement("button");
  stackBtn.type = "button";
  stackBtn.id = "profile-mystack-edit";
  stackBtn.innerHTML = `<span>${t("pp.editStack")}</span>`;
  stackBtn.addEventListener("click", async () => {
    const m = await import("./my-stack-editor.js");
    m.openMyStackEditor();
  });
  mydeckWrap.appendChild(stackBtn);

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
  window.removeEventListener("resize", fitProfilePageContent);
  overlayEl?.remove();
  overlayEl = null;
  bodyEl = null;
  syncFullScreenPageActive();
}
