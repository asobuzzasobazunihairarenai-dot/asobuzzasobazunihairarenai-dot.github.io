// 図鑑／ルールブックの全画面版（ユーザー要望「山札一覧とヘルプの内容が並ぶ全画面表示に」）。
// 山札一覧（deck-viewer.jsのbuildDeckSections）とルール・ヘルプ（help.jsのbuildHelpList）を
// 1つの全画面ページに縦に並べる。ホーム画面(home-screen.js)から開き、戻るとホームへ帰る。
// 器の作り方はランキング/プロフィールの全画面版と同じ（フルスクリーン・戻るボタン・中央寄せ）。

import { openDeckViewer } from "./deck-viewer.js";
// 【#684】「カード一覧を開く」の扇に、実物のカードの絵を毎回ランダムで敷く。
import { NORMAL_CARDS, getCardIllustPath } from "./cards-data.js";
import { buildHelpList } from "./help.js";
import { syncFullScreenPageActive } from "./option-area.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ13

let overlayEl = null;

export function openCodexPage(onClose) {
  if (overlayEl) return;
  overlayEl = document.createElement("div");
  overlayEl.id = "codex-page";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.id = "codex-page-back";
  backBtn.textContent = t("cdx.back");
  backBtn.addEventListener("click", () => {
    closeCodexPage();
    onClose?.();
  });
  overlayEl.appendChild(backBtn);

  const title = document.createElement("div");
  title.id = "codex-page-title";
  title.textContent = t("cdx.title");
  overlayEl.appendChild(title);

  const content = document.createElement("div");
  content.id = "codex-page-content";

  // ユーザー要望「図鑑ではカード画像たちは一旦山札一覧に収納しておいて」。カードのグリッドを
  // 直接並べる代わりに、山札一覧（deck-viewer.js、全画面）を開くボタンだけを置く。
  const deckHeading = document.createElement("div");
  deckHeading.className = "codex-section-heading";
  deckHeading.textContent = t("cdx.deckHeading");
  content.appendChild(deckHeading);
  const deckBtn = document.createElement("button");
  deckBtn.type = "button";
  deckBtn.className = "codex-open-deck-btn";
  deckBtn.textContent = t("cdx.deckBtn");
  // 🔴【2026-11-15・続き721】ここに書いていた style.cssText（じか書き）を style.css の
  //   `.codex-open-deck-btn` へ移した。**見た目の値は1つも変えていない。**
  //   じか書きは普通の規則では勝てないので、ライトテーマの直しが `!important` を
  //   3つ使う羽目になっていた（style.css の body.theme-light .codex-open-deck-btn の
  //   コメント「インラインで白文字＝白地で見えない」がその跡）。
  //   見た目は CSS 側で持つ方が、テーマや ?ui=v2 から素直に上書きできる。
  // 【2026-11-15・続き722】ユーザー要望「カード一覧を開くボタンをもっとワクワクする感じに」。
  // 7色のカードが扇に広がる飾りを入れる。**既定では display:none**（style.css）で、
  // ?ui=v2 の時だけ見える。画像は1枚も足していない（紙の色＋7色の細い帯だけ）。
  const fan = document.createElement("span");
  fan.className = "codex-deck-fan";
  fan.setAttribute("aria-hidden", "true");
  // 🔴【#684】ユーザー提案「じっさいのカードから毎回ランダムな組み合わせ表示はどう？」。
  //   7色から**1枚ずつ**選ぶ（色がそろうので扇が七色のまま・顔ぶれだけ毎回変わる）。
  //   ⚠ イラストのみ版を使う（この大きさでは文字は読めず、文字なしの下地を敷くと
  //     白い空欄が出る＝#686 と同じ罠）。絵が無い札は色の帯のまま（CSS の既定）。
  const 七色 = ["red", "orange", "yellow", "green", "blue", "pink", "purple"];
  for (const 色 of 七色) {
    const i = document.createElement("i");
    const 候補 = NORMAL_CARDS.filter((c) => c.color === 色);
    const 札 = 候補[Math.floor(Math.random() * 候補.length)];
    if (札) i.style.backgroundImage = `url("${getCardIllustPath(札.id)}")`;
    fan.appendChild(i);
  }
  deckBtn.insertBefore(fan, deckBtn.firstChild);
  deckBtn.addEventListener("click", () => openDeckViewer());
  content.appendChild(deckBtn);

  const helpHeading = document.createElement("div");
  helpHeading.className = "codex-section-heading";
  helpHeading.textContent = t("cdx.helpHeading");
  content.appendChild(helpHeading);
  content.appendChild(buildHelpList());

  overlayEl.appendChild(content);
  document.body.appendChild(overlayEl);
  // ホーム/プロフィール全画面と同じく、上のオプションエリアのアイコンは表示したままにする。
  syncFullScreenPageActive();
}

export function closeCodexPage() {
  overlayEl?.remove();
  overlayEl = null;
  syncFullScreenPageActive();
}
