// ヘルプページ（ユーザー要望「オプションの横にヘルプボタンを作り、押すとチュートリアルや
// 説明書の内容を網羅しているページを出したい」）。tutorial.jsのチュートリアル手順が持つ
// 説明文（基本ルール）・help-content.js（用語集・よくある質問、説明書.txtから採録）を
// 読み物として一覧表示する。
//
// ユーザー要望「ヘルプ画面のトップは見やすいように項目を並べ表示しクリックするとその
// モーダルが出るようにする」への対応で、トップは「基本ルール/用語集/よくある質問」の
// 折りたたみ一覧（項目名だけのボタン）にし、個別の内容は専用の小さなモーダルで見せる
// 構成にした。
//
// ユーザー要望「オプション画面にあった『チュートリアルを見る』をヘルプ画面に移設」への
// 対応で、options-menu.js側の同項目は削除し、ここへ移した。

import { createModalCloseX, createBackdrop } from "./ui-helpers.js";
import { buildIconButtonContent, wireIconButtonClick } from "./icon-action-button.js";
import { getHelpSections, startTutorial } from "./tutorial.js";
import { getGlossary, getFaqCategories, getDigitalFeatures } from "./help-content.js"; // UI英語化フェーズ8: 表示のたびに現在の言語で取り直す
import { getRankExplainSections } from "./rank-explain.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ8
import { linkifyGlossary } from "./glossary-linkify.js";
import { RULE_VIDEO_SHORT_ID, RULE_VIDEO_FULL_ID, ruleVideoUrl } from "./rule-videos.js";
import { onLangChange } from "./i18n.js";
import { getOptionArea } from "./option-area.js";
import { closeShopPanel } from "./shop.js";
import { closeProfilePage } from "./profile-page.js";
// 全画面ページを同時に1つだけにする（関数内でのみ使う遅延束縛なので循環importでも安全）。
import { closeRankingPage } from "./ranking-page.js";

// 個別の説明を表示する小さなモーダル（トップの一覧からのクリックで開く。icon-action-button.js
// のopenIconDetailModalと同じ「1個だけ使い回す」パターンだが、ヘルプ画面自身の裏に
// 重ねて出す必要があるためこのモジュール専用に持つ）。
let itemModalBackdrop = null;
let itemModalEl = null;
let itemModalTitleEl = null;
let itemModalBodyEl = null;

function closeItemModal() {
  if (itemModalBackdrop) itemModalBackdrop.style.display = "none";
  if (itemModalEl) itemModalEl.style.display = "none";
}

function ensureItemModal() {
  if (itemModalEl) return;
  itemModalBackdrop = createBackdrop(closeItemModal, { dim: true, zIndex: 2510 });
  itemModalBackdrop.style.display = "none";

  itemModalEl = document.createElement("div");
  itemModalEl.id = "help-item-modal";
  itemModalEl.style.display = "none";
  itemModalEl.appendChild(createModalCloseX(closeItemModal));

  itemModalTitleEl = document.createElement("div");
  itemModalTitleEl.className = "help-item-modal-title";
  itemModalEl.appendChild(itemModalTitleEl);

  itemModalBodyEl = document.createElement("div");
  itemModalBodyEl.className = "help-item-modal-body";
  itemModalEl.appendChild(itemModalBodyEl);

  document.body.appendChild(itemModalBackdrop);
  document.body.appendChild(itemModalEl);
}

function openItemModal(title, bodyParagraphs, icon) {
  ensureItemModal();
  itemModalTitleEl.innerHTML = "";
  if (icon) {
    const img = document.createElement("img");
    img.className = "help-item-modal-icon";
    img.src = icon;
    img.alt = "";
    itemModalTitleEl.appendChild(img);
  }
  itemModalTitleEl.appendChild(document.createTextNode(title));
  itemModalBodyEl.innerHTML = "";
  for (const paragraph of bodyParagraphs) {
    const p = document.createElement("p");
    p.className = "help-item-modal-paragraph";
    // 文中の基本用語集の用語をクリック可能にする（押すと定義ポップアップ。ユーザー要望）。
    linkifyGlossary(p, paragraph);
    itemModalBodyEl.appendChild(p);
  }
  itemModalBackdrop.style.display = "block";
  itemModalEl.style.display = "block";
}

// 【続き615・ユーザー要望】「ヘルプのところに動画のリンクはどう？80秒と12分のルール説明動画が
// もうYouTubeにアップしてあります」。**公式サイト（asobuzz.net/howtoplay）に載っている2本と
// 同じものを指す**（URLは私が公式サイトの埋め込みから読み、YouTube の oembed で公開状態・題・
// 投稿者が「7 SHADES OF S:EVEN」であることを確かめた）。
// ⚠ **アプリの中に埋め込む（iframe）形は採らなかった**: ①対局中にもヘルプは開けるので盤面の上で
// 再生され、BGMと音がぶつかる ②画面全体が縮小されて描かれる作りなので動画も一緒に小さくなる
// ③画像と同じくメモリを食う（#223 で iPhone が落ちた）。**別タブで開く**なら、ホーム画面から
// 起動したアプリでも上に重なって開き、閉じれば対局に戻れる。
// 【続き616】URLは rule-videos.js に集約した（試遊の入口からも同じ動画を開くため）。
const HELP_VIDEOS = [
  { id: RULE_VIDEO_SHORT_ID, key: "help.video.short" },
  { id: RULE_VIDEO_FULL_ID, key: "help.video.full" },
];

// 索引の項目と同じ見た目で、押すとYouTubeを別タブで開くリンク。既にある CAMPFIRE のリンクと
// 同じ作法（target=_blank + rel=noopener noreferrer）。
function buildVideoLink(video) {
  const a = document.createElement("a");
  a.className = "help-index-item help-index-video";
  a.href = ruleVideoUrl(video.id);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = t(video.key);
  return a;
}

function buildIndexButton(label, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "help-index-item";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

// 大分類（基本ルール/用語集/よくある質問）1つぶんの折りたたみ。
function buildIndexSection(titleText, contentEl) {
  const details = document.createElement("details");
  details.className = "help-index-section";
  const summary = document.createElement("summary");
  summary.textContent = titleText;
  details.appendChild(summary);
  details.appendChild(contentEl);
  return details;
}

function buildFlatList(buttons) {
  const list = document.createElement("div");
  list.className = "help-index-list";
  for (const btn of buttons) list.appendChild(btn);
  return list;
}

function buildPanel(close) {
  const panel = document.createElement("div");
  panel.id = "help-panel";

  const titleEl = document.createElement("div");
  titleEl.id = "help-panel-title";
  titleEl.textContent = t("help.title");
  panel.appendChild(titleEl);
  panel.appendChild(createModalCloseX(close));

  const tutorialBtn = document.createElement("button");
  tutorialBtn.type = "button";
  tutorialBtn.id = "help-panel-tutorial-btn";
  tutorialBtn.textContent = t("help.tutorialBtn");
  tutorialBtn.addEventListener("click", () => {
    close();
    startTutorial();
  });
  panel.appendChild(tutorialBtn);

  panel.appendChild(buildHelpList());
  return panel;
}

// ヘルプの索引リスト（基本ルール・デジタル版機能・用語集・よくある質問）だけを組み立てて返す。
// 図鑑／ルールブックの全画面版（codex-page.js）からも使う。
export function buildHelpList() {
  const list = document.createElement("div");
  list.className = "help-panel-list";

  // 【続き615】動画をいちばん上に置く。読むより早い人が多いので、最初に目に入る位置にする
  // （この関数は図鑑の全画面版 codex-page.js とも共有しているので、両方に同じように出る）。
  list.appendChild(buildIndexSection(t("help.sec.video"), buildFlatList(HELP_VIDEOS.map(buildVideoLink))));

  // 基本ルール（tutorial.jsの説明文をそのまま流用、二重管理を避ける）。
  const ruleButtons = getHelpSections().map((section) =>
    buildIndexButton(section.title, () =>
      openItemModal(section.title, [...section.body, ...(section.footer ?? [])], section.icon)
    )
  );
  list.appendChild(buildIndexSection(t("help.sec.rules"), buildFlatList(ruleButtons)));

  // ユーザー要望「ヘルプの説明に、デジタル版独自のことも記載する項目を追加してください」。
  const digitalButtons = getDigitalFeatures().map((entry) => buildIndexButton(entry.title, () => openItemModal(entry.title, entry.body)));
  list.appendChild(buildIndexSection(t("help.sec.digital"), buildFlatList(digitalButtons)));

  // ランク戦（フリーマッチ）の説明（rank-explain.js と共有。ホーム/マイページのランク表示クリックと同じ内容）。
  const rankedButtons = getRankExplainSections().map((section) => buildIndexButton(section.title, () => openItemModal(section.title, section.body)));
  list.appendChild(buildIndexSection(t("help.sec.ranked"), buildFlatList(rankedButtons)));

  // 用語集（help-content.js、説明書.txtの基本用語集を採録）。
  const glossaryButtons = getGlossary().map((entry) => buildIndexButton(entry.term, () => openItemModal(entry.term, entry.body)));
  list.appendChild(buildIndexSection(t("help.sec.glossary"), buildFlatList(glossaryButtons)));

  // よくある質問（カテゴリごとにさらに折りたたみをネストする）。
  const faqList = document.createElement("div");
  faqList.className = "help-index-list";
  for (const cat of getFaqCategories()) {
    const catButtons = cat.items.map((item) => buildIndexButton(item.question, () => openItemModal(item.question, item.answer)));
    const catSection = buildIndexSection(cat.category, buildFlatList(catButtons));
    catSection.classList.add("help-index-subsection");
    faqList.appendChild(catSection);
  }
  list.appendChild(buildIndexSection(t("help.sec.faq"), faqList));

  return list;
}

let openFn = null;
let closeFn = null;
// 他の全画面ページ（プロフィール/ランキング）を開く時にヘルプを閉じるための外部close。
// 未初期化・未表示なら安全なno-op。
export function closeHelpPanel() {
  closeFn?.();
}

export function openHelpPanel() {
  // #2026-08-16: ショップから開くとヘルプ(2501)がショップ(2601)の背面に隠れるため、先に
  // ショップを閉じてから開く（ショップ未表示なら安全なno-op）。
  closeShopPanel();
  // ユーザー報告2026-08-18「マイページ画面でオプションエリアの『ヘルプ』を押しても反応しない」。
  // マイページ(#profile-page z:2650)はヘルプ(2501)より前面のため、閉じないと背面に隠れて
  // クリックできない。先にマイページを閉じる（未表示なら安全なno-op）。
  closeProfilePage();
  closeRankingPage();
  openFn?.();
}

export function initHelpButton() {
  let panel = null;
  let backdrop = null;
  function close() {
    if (!panel) return; // まだ組み立てていない＝開いていないので何もしない
    panel.style.display = "none";
    backdrop.style.display = "none";
  }
  function open() {
    ensureBuilt();
    panel.style.display = "block";
    backdrop.style.display = "block";
  }
  openFn = open;
  closeFn = close;

  // 【続き624】**パネルの組み立ては「初めて開く時」まで遅らせる**（続き623 の管理者パネルと同じ形）。
  // 🔴 副産物: **初めて開く時の言語で組み立てられる**ので、下の onLangChange の作り直し
  //   （続き617）は「開いたことがある時」だけの話になる。
  function ensureBuilt() {
    if (panel) return;
    panel = buildPanel(close);
    backdrop = createBackdrop(close, { dim: true, zIndex: 2500 });
    backdrop.style.display = "none";
    panel.style.display = "none";

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }

  const launcherBtn = document.createElement("button");
  launcherBtn.id = "help-button";
  const { captionEl, tooltipEl } = buildIconButtonContent(launcherBtn, {
    icon: "assets/icons/help.svg",
    tooltip: t("help.iconTip"),
  });
  captionEl.textContent = t("help.iconCaption");
  // 【続き617】長押しで出る説明は**関数で渡す**。wireIconButtonClick は
  // `typeof === "function"` を見る作りなので、押された時点の言語で引ける
  // （文字列で渡すと、起動時の言語のまま固定されてしまう）。
  wireIconButtonClick(launcherBtn, {
    detailTitle: () => t("help.iconCaption"),
    detailParagraphs: () => [t("help.iconDetail")],
    onAction: open,
  });
  getOptionArea().appendChild(launcherBtn);

  // 【続き617・ユーザー判断A】**言語を切り替えたら、ヘルプも作り直す。**
  // このパネルは起動時に1回だけ組み立てていて `onLangChange` を購読していなかったため、
  // **ヘルプ全体が「起動した時の言語」のまま固定**だった（途中で英語にしても日本語のまま。
  // 再読み込みで直るので気づきにくい）。home-screen / main / opening-screen / options-menu は
  // 購読しているので、ここだけが取り残されていた。続き615 で動画の節を足した時に見つけた。
  // ⚠ **作り直すのは一覧だけ**にして、パネルそのものは置き換えない——`openFn`/`closeFn` が
  // この `panel` を掴んでいるうえ、`display` の切り替えで開閉している（置き換えると開いて
  // いる時に消える）。題とボタンの文字は id で引ける。
  // ⚠ 折りたたみ（用語集など）は閉じた状態に戻る。言語が変わる時に開き直すのは自然なので
  // そのままにする。
  onLangChange(() => {
    captionEl.textContent = t("help.iconCaption");
    if (tooltipEl) tooltipEl.textContent = t("help.iconTip");
    // 【続き624】まだ一度も開いていなければパネルは存在しない。次に開く時に
    // その時の言語で組み立てられるので、ここでは何もしなくてよい。
    if (!panel) return;
    const titleNow = panel.querySelector("#help-panel-title");
    if (titleNow) titleNow.textContent = t("help.title");
    const tutorialNow = panel.querySelector("#help-panel-tutorial-btn");
    if (tutorialNow) tutorialNow.textContent = t("help.tutorialBtn");
    const listNow = panel.querySelector(".help-panel-list");
    if (listNow) listNow.replaceWith(buildHelpList());
  });
}
