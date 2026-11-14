// ホーム画面（続き73、ユーザー要望「HUERISE→タイトル画面→ホーム画面」）。
// オープニング画面でログインを終えた後、今までは直接「オンラインで続ける」パネル
// （部屋の作成/参加）へ進んでいたが、その手前にナビゲーションのハブとなる画面を
// 挟む。今回のスコープは「ハブ画面のみ先に（実装済みの2つは実際に開く、残りは
// 近日公開の見た目だけ）」——ユーザーが実装範囲を明示的に選んだ結果。
//
// 実装済み2枚（フレンドリーマッチ／ショップ）は、押すと既存のパネルをそのまま開く
// （online-ui.js/shop.jsの既存コード・見た目は一切変更しない）。それ以外の6枚は
// クリックしても何も始まらず、「近日公開」の軽いトースト表示だけを返す。

import { subscribe, getState } from "./state.js";
import { t } from "./ui-text.js";
import { onLangChange } from "./i18n.js";
import { openOnlinePanel } from "./online-ui.js";
import { openShopPanel } from "./shop.js";
// ユーザー要望（続き74）「プロフィール／マイページは画面全体版にしましょう」への
// 対応で新設したページ（profile-page.js、中身はmy-page.jsの既存ロジックを再利用）。
import { openProfilePage } from "./profile-page.js";
// ユーザー要望「図鑑については山札一覧をとりあえず流用してください」。deck-viewer.js
// は元々「開発用ツール」と明記された既存のモーダルだが、「とりあえず」の指示のため
// 画面全体版には作り直さず、そのまま配線するだけに留めた。
import { openDeckViewer } from "./deck-viewer.js";
import { syncFullScreenPageActive } from "./option-area.js";
import { openCodexPage } from "./codex-page.js";
// ユーザー要望「ランキングを実装しましょう」への対応で新設したページ。
import { openRankingPage } from "./ranking-page.js";
// ランク戦フェーズ4/6: 現ランクをホームに常時表示（称号バッジ静止版＋七色ゲージ）。
import { getSelfRank, pollRanked, getCurrentUser, isAdminUser } from "./online.js";
import { rankName } from "./rank-badge.js";
import { getCardSet, setCardSet, CARD_SETS } from "./card-set.js";
import { isUiV2 } from "./ui-v2.js"; // 【2026-11-14】試作のレイアウト（?ui=v2 の時だけ使う）
import { buildRankShowcase } from "./rank-showcase.js";
import { showRankExplanationModal } from "./rank-explain.js";
// チュートリアルCPU戦（台本化された練習試合）。完全ローカル機能。
import { startTutorialBattle, registerTutorialHomeOpener } from "./tutorial-battle.js";
// 案内人エイドスの物語チュートリアル（オンボーディング）のフロー制御。🎓タイルはこの入口へ。
import { startEidosStory } from "./eidos-story.js";
import { buildFirstStepCard, noteCpuBattlePlayed } from "./first-steps.js";
// ローカル1人用CPU戦（cpu-battle.js）はCPU選択時に動的import（下の openMatchChoiceModal 参照）。
// ※静的importにすると、cpu-battle.js が芋づる式に読み込む依存（game-setup.js→…）でモジュール
//   評価順が変わり、online.js↔phase-automation.js の循環参照が表面化して
//   「Cannot access 'phaseChangeEventListeners' before initialization」で起動時に真っ黒になった
//   （不具合2026-08-08）。必要時だけ読み込む動的importにして静的な依存辺を作らない。
// お知らせ／更新情報（デプロイのたびに概要を追記）。
// 【続き621】**お知らせの本文（592KB）は起動時に読まない。** 押された時に読む。
// NEW の印だけは起動時に要るので、3つの数字を持つ小さなモジュールから引く。
import { hasUnreadChangelog } from "./changelog-signature.js";

// 【続き621】お知らせを押された時に本文を読み込んで開く。
// 🔴 **わざと先読みしない。** 暇な時に先に読んでおく手もあるが、592KB の解析は
// **弱い端末では引っかかり**になるので、遊んでいる最中に突然それが走る方が困る
// （起動が遅かった原因そのものが「解析の重さ」だった＝続き620 の測定）。
// 読み込みに失敗しても、ホーム画面は壊さない（記録だけ残して何もしない）。
async function openChangelogLazily() {
  try {
    const { openChangelogModal } = await import("./changelog.js");
    openChangelogModal({ admin: isAdminUser() });
  } catch (err) {
    console.error("changelog load failed", err);
  }
}
// CPU戦の強さ選択（対戦モード選択モーダルで選べるようにする。ユーザー要望2026-08-09）。
// cpu-battle-state.js は依存ゼロの葉モジュールなので静的importでも循環参照の心配はない
// （cpu-battle.js 本体の動的importとは別物）。選んだ値は端末に保存され、CPU戦開始時に効く。
import {
  getCpuDifficulty,
  setCpuDifficulty,
  getCpuPlayerCount,
  setCpuPlayerCount,
  isCpuBlackWhiteEnabled,
  setCpuBlackWhiteEnabled,
  isCpuBoostEnabled,
  setCpuBoostEnabled,
  isCpuMyDeckEnabled,
  setCpuMyDeckEnabled,
  isCpuSelfTimerEnabled,
  setCpuSelfTimerEnabled,
} from "./cpu-battle-state.js";
import { maybeShowAlphaNotice } from "./alpha-notice.js";
import { buildPwaInstallBanner } from "./pwa-install.js";
// ユーザー要望2026-09-02: 管理者が投稿した「全員へのお知らせ」を、ホームで一度だけ出す。
import { maybeShowAnnouncement } from "./announcement.js";
// ユーザー要望2026-09-02「ホームのランクマッチのところに“通知をオンにしませんか”的なバッジを」。
import { shouldSuggestRankedNotify, enableRankedNotifyFromPrompt } from "./ranked-notify.js";

let overlayEl = null;
let toastEl = null;
let toastTimer = null;

// ホーム背景画像を起動時に先読みしておく（ユーザー報告「ホームに入る時に一瞬黒い
// 画面が出る」の対策）。読み込み済みなら、ホームを開いた瞬間から背景画像が表示され暗転しない。
// 2026-09-09: PNG(2104KB)からWebP(230KB)へ差し替え。起動時に必ず落ちてくる中で単体最大の
// ファイルだった（他の画像は既にWebP化済みで、これだけPNGのまま残っていた）。元のPNGは
// 利用者の端末に古いCSSがキャッシュされている場合に備えて assets/ に残してある。
const homeBgPreload = new Image();
homeBgPreload.src = "assets/home-bg.webp";

// icon: 画像が無い時のフォールバック絵文字。image: ユーザー作成のホーム画面アイコン
// （assets/home-icons/、枠なしでそのまま表示する）。
const TILES = [
  {
    icon: "🎓",
    image: "assets/home-icons/tutorial.webp",
    key: "tutorial", labelKey: "home.tile.tutorial",
    status: "ready",
    onOpen: () => {
      // 案内人エイドスの物語オーケストレーターへ。初回は導入シーン→操作チュートリアルの順で進む。
      // 終了/中断時にホームへ戻れるよう openHomeScreen を渡す（startEidosStoryが内部で
      // registerTutorialHomeOpenerに配線する）。
      closeHomeScreen();
      startEidosStory({ openHome: () => openHomeScreen() });
    },
  },
  { icon: "🤝", image: "assets/home-icons/friend-match.webp", key: "match", labelKey: "home.tile.match", status: "ready", onOpen: () => openMatchChoiceModal() },
  {
    icon: "🏆",
    image: "assets/home-icons/rank-match.webp",
    key: "ranked", labelKey: "home.tile.ranked",
    status: "ready",
    showWaitingCount: true, // 続き162: 今何人が対戦相手を募集中かをタイルに表示（コールドスタート対策）
    showNotifySuggest: true, // ユーザー要望2026-09-02: まだ通知をONにしていない人に勧めるバッジ
    onOpen: async () => {
      // ランク戦のマッチメイキング（フェーズ2b、ranked-match.js）。cpu-battle.jsと同じく
      // 動的importで静的な依存辺を作らない（循環参照の回避）。ホームは閉じ、キャンセル/失敗時は
      // openHomeScreen()で戻す（ranked-match.js側にonExitとして注入）。
      closeHomeScreen();
      try {
        const { startRankedMatchmaking } = await import("./ranked-match.js");
        await startRankedMatchmaking(() => openHomeScreen());
      } catch (err) {
        console.error("ranked matchmaking start failed", err);
        openHomeScreen();
      }
    },
  },
  { icon: "🛒", image: "assets/home-icons/shop.webp", key: "shop", labelKey: "home.tile.shop", status: "ready", onOpen: () => openShopPanel() },
  {
    icon: "📊",
    image: "assets/home-icons/ranking.webp",
    key: "ranking", labelKey: "home.tile.ranking",
    status: "ready",
    onOpen: () => {
      closeHomeScreen();
      openRankingPage(() => openHomeScreen());
    },
  },
  {
    icon: "👤",
    image: "assets/home-icons/my-page.webp",
    // マイデッキ編集はマイページ内の大ボタンへ移設（ユーザー要望2026-08-11）。ラベルもそれに合わせる。
    key: "mypage", labelKey: "home.tile.mypage",
    status: "ready",
    onOpen: () => {
      closeHomeScreen();
      openProfilePage(() => openHomeScreen());
    },
  },
  {
    icon: "📖",
    image: "assets/home-icons/rulebook.webp",
    key: "codex", labelKey: "home.tile.codex",
    status: "ready",
    onOpen: () => {
      // ユーザー要望「山札一覧＋ヘルプを全画面で並べて表示」。全画面の図鑑ページを開く。
      closeHomeScreen();
      openCodexPage(() => openHomeScreen());
    },
  },
  // 【続き621】押された時に本文を読む（動的 import）。ホーム画面の他のタイル
  // （デッキ構築・不具合のお礼）と同じやり方。
  { icon: "📰", image: "assets/home-icons/news.webp", key: "news", labelKey: "home.tile.news", status: "ready", onOpen: () => void openChangelogLazily(), showNewIfUnread: () => hasUnreadChangelog() },
];

// クラウドファンディングの帯。期限を過ぎたら null を返す（＝出さない）。
// URL は CAMPFIRE の正式なもの。/preview?token=… の限定公開URLは絶対に使わない。
const CF_URL = "https://camp-fire.jp/projects/967235/view";
const CF_END = new Date("2026-11-15T23:59:59+09:00").getTime(); // 日本時間の締切
function buildCrowdfundingBanner() {
  if (Date.now() > CF_END) return null;
  const box = document.createElement("button");
  box.type = "button";
  box.id = "home-screen-cf";
  const main = document.createElement("span");
  main.className = "home-screen-cf-main";
  main.textContent = t("home.cf.title");
  const cta = document.createElement("span");
  cta.className = "home-screen-cf-cta";
  cta.textContent = t("home.cf.cta");
  box.appendChild(main);
  box.appendChild(cta);
  // 🔴 別のタブで開く（アプリを離れさせない）。ホーム画面に追加したアプリからでも
  //   ブラウザ側で開く。noopener は必ず付ける。
  box.addEventListener("click", () => {
    try { window.open(CF_URL, "_blank", "noopener"); } catch (e) { location.href = CF_URL; }
  });
  return box;
}

// 「近日公開」タイルを押した時の軽いトースト。モーダルを挟むほどの重さは不要
// なため、数秒で自動的に消える控えめな通知にする。
function showHomeToast(text) {
  if (!overlayEl) return;
  clearTimeout(toastTimer);
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "home-screen-toast";
    overlayEl.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add("is-visible");
  toastTimer = setTimeout(() => toastEl?.classList.remove("is-visible"), 2400);
}
function showComingSoonToast(label) {
  showHomeToast(t("home.comingSoon", { label }));
}

// ユーザー要望2026-08-08「ホームの『フレンドリーマッチ』を『CPUマッチ＆フレンドリーマッチ』に
// 変更し、押すとフレンドリーマッチかCPU戦かを選ぶ巨大モーダルを出す。その後は既存のモーダル/
// フローへ」。ここでその選択モーダルを出す。選んだ後はそれぞれ既存の導線に合流する:
//   ・フレンドリーマッチ → openOnlinePanel()（既存の部屋作成/参加パネル）
//   ・CPU戦 → opening-screen.js のCPU戦ボタンと同じ startCpuBattle→盤面表示→runCpuBattleSetup
let matchChoiceEl = null;
function closeMatchChoiceModal() {
  matchChoiceEl?.remove();
  matchChoiceEl = null;
}
function openMatchChoiceModal() {
  if (!overlayEl || matchChoiceEl) return;
  const back = document.createElement("div");
  back.id = "home-match-choice";

  const panel = document.createElement("div");
  panel.className = "home-match-choice-panel";

  const title = document.createElement("div");
  title.className = "home-match-choice-title";
  title.textContent = t("home.matchChoice.title");
  panel.appendChild(title);

  const options = document.createElement("div");
  options.className = "home-match-choice-options";

  const makeOption = (icon, label, desc, onPick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "home-match-choice-option";
    const iconEl = document.createElement("div");
    iconEl.className = "home-match-choice-option-icon";
    iconEl.textContent = icon;
    const labelEl = document.createElement("div");
    labelEl.className = "home-match-choice-option-label";
    labelEl.textContent = label;
    const descEl = document.createElement("div");
    descEl.className = "home-match-choice-option-desc";
    descEl.textContent = desc;
    btn.append(iconEl, labelEl, descEl);
    btn.addEventListener("click", onPick);
    options.appendChild(btn);
    return btn;
  };

  makeOption("🤝", t("home.matchChoice.friendly"), t("home.matchChoice.friendlyDesc"), () => {
    closeMatchChoiceModal();
    openOnlinePanel(); // 既存の部屋モーダルへ（ホームは背後に残り、対局開始で自動で閉じる）
  });
  makeOption("🤖", t("home.matchChoice.cpu"), t("home.matchChoice.cpuDesc"), async () => {
    closeMatchChoiceModal();
    noteCpuBattlePlayed(); // 「次にやること」の段階を進める（first-steps.js）
    try {
      // 動的import（静的依存辺を作らないため。上の import 撤去のコメント参照）。
      const { startCpuBattle, runCpuBattleSetup } = await import("./cpu-battle.js");
      const count = getCpuPlayerCount();
      await startCpuBattle(count);
      // ユーザー報告2026-09-03「セットアップ直前に一瞬セットアップされた盤面が映る」。
      // 以前はここで先にホームを閉じていたため、上の動的importが解決するまでの間（初回は
      // 数フレームかかる）、起動時の既定盤面（テスト用に4人が座った状態）が見えていた。
      // 盤面を空にする resetGame は startCpuBattle の中にあるので、**閉じるのはその後**にする。
      closeHomeScreen();
      // 盤面が見えてからセットアップ演出（ファースト配布→盤面配置）を始める。
      setTimeout(() => {
        runCpuBattleSetup({ count }).catch((err) => console.error("runCpuBattleSetup failed", err));
      }, 60);
    } catch (err) {
      console.error("CPU battle start failed", err);
    }
  });

  panel.appendChild(options);

  // 🔴 【#437・2026-11-03】ユーザー要望「このモーダルではまずCPUかフレンドリーかの2択だけで
  //   いい気がします！CPUを選んだ後に細かい設定のがいいかも！」＋「CPU戦の方は『詳細を
  //   設定する。』的なボタンを設けて、それを押さなければおすすめ設定でスタート」。
  //   ⇒ 強さ・人数・ルール・カードセットは**畳んで**おき、押した時だけ開く。
  //   ⓘ **おすすめ設定＝そのまま保存されている既定値**（CPU人数2＝あなた＋CPU1体／
  //     強さ『普通』＝intermediate／ルールは全部切）なので、何も触らなければそれで始まる。
  //   ⚠ **設定を変えた人の選択は捨てない。** 一度いじった人は次もその設定で始まるので、
  //     既定と違う時だけ**畳んだ状態でも分かるように1行で出す**（黙って別の設定で
  //     始まるのがいちばん困る）。
  const details = document.createElement("div");
  details.className = "home-match-choice-details";
  details.hidden = true;
  const detailsToggle = document.createElement("button");
  detailsToggle.type = "button";
  detailsToggle.className = "home-match-choice-details-toggle";
  const detailsNote = document.createElement("div");
  // 【#507・2026-11-11】ユーザー「ここでの詳細設定はCPUに関することだけな気がします！
  //   なのでボタンは右側にあった方がいい？？」⇒ 2択は 🤝フレンドリー（左）／🤖CPU戦（右）の
  //   並びなので、このボタンと1行を**右端へ寄せて CPU 側の下に付ける**（どちらの話かが
  //   位置で分かる）。⚠ 強さ・人数・ルールは本当に CPU 戦専用だが、**カードセット（管理者
  //   だけ）はフレンドリーの既定値にもなる**（部屋で選べばそちらが勝つ＝続き687）。
  //   ⚠ is-details-note を足すのは、`home-match-choice-difficulty-hint` が詳細の中の
  //     説明文とも共用のクラスで、そちらまで右寄せにしたくないため。
  detailsNote.className = "home-match-choice-difficulty-hint is-details-note";
  // いまの設定が『おすすめ』のままかどうか。おすすめ＝人数2・強さ普通・ルール全部切。
  const isRecommended = () =>
    getCpuPlayerCount() === 2 &&
    getCpuDifficulty() === "intermediate" &&
    !isCpuBlackWhiteEnabled() &&
    !isCpuBoostEnabled() &&
    !isCpuMyDeckEnabled() &&
    !isCpuSelfTimerEnabled();
  const refreshDetailsToggle = () => {
    detailsToggle.textContent = details.hidden
      ? t("home.matchChoice.detailsOpen")
      : t("home.matchChoice.detailsClose");
    detailsToggle.setAttribute("aria-expanded", details.hidden ? "false" : "true");
    // 畳んでいる間だけ、既定と違う設定になっていることを知らせる。
    const 出す = details.hidden && !isRecommended();
    detailsNote.hidden = !出す;
    detailsNote.textContent = 出す ? t("home.matchChoice.detailsChanged") : "";
  };
  detailsToggle.addEventListener("click", () => {
    details.hidden = !details.hidden;
    refreshDetailsToggle();
  });
  panel.appendChild(detailsToggle);
  panel.appendChild(detailsNote);

  // CPU戦用の「CPUの強さ」選択（ユーザー要望2026-08-09）。ここで選ぶと即 setCpuDifficulty で
  // 端末に保存され、上の「CPU戦（1人用）」を押した時にその強さで始まる。フレンドリーマッチには
  // 影響しない（CPU戦専用の設定）。基本設定のセグメント（options-menu.js buildCpuDifficultyRow）
  // と同じ選択肢・同じ保存先を使うので、どちらで変えても一貫する。
  const diff = document.createElement("div");
  diff.className = "home-match-choice-difficulty";
  const diffLabel = document.createElement("div");
  diffLabel.className = "home-match-choice-difficulty-label";
  diffLabel.textContent = t("home.matchChoice.difficultyLabel");
  diff.appendChild(diffLabel);
  const seg = document.createElement("div");
  seg.className = "home-match-choice-segment";
  const segButtons = [];
  const refreshSeg = () => {
    const cur = getCpuDifficulty();
    for (const b of segButtons) b.classList.toggle("is-selected", b.dataset.v === cur);
  };
  for (const [v, key] of [
    ["rookie", "cpu.diff.rookie"],
    ["intermediate", "cpu.diff.intermediate"],
    ["advanced", "cpu.diff.advanced"],
    ["master", "cpu.diff.master"],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "home-match-choice-segment-btn";
    b.dataset.v = v;
    b.textContent = t(key);
    b.addEventListener("click", () => {
      setCpuDifficulty(v);
      refreshSeg();
    });
    seg.appendChild(b);
    segButtons.push(b);
  }
  diff.appendChild(seg);
  const diffHint = document.createElement("div");
  diffHint.className = "home-match-choice-difficulty-hint";
  diffHint.textContent = t("home.matchChoice.difficultyHint");
  diff.appendChild(diffHint);
  refreshSeg();
  details.appendChild(diff);

  // CPU戦の人数選択（2〜4人。続き226）。あなた＋残りがCPU（2人=あなた+CPU1体、3人=+2体、4人=+3体）。
  const cnt = document.createElement("div");
  cnt.className = "home-match-choice-difficulty";
  const cntLabel = document.createElement("div");
  cntLabel.className = "home-match-choice-difficulty-label";
  cntLabel.textContent = t("home.matchChoice.countLabel");
  cnt.appendChild(cntLabel);
  const cntSeg = document.createElement("div");
  cntSeg.className = "home-match-choice-segment";
  const cntButtons = [];
  const refreshCnt = () => {
    const cur = getCpuPlayerCount();
    for (const b of cntButtons) b.classList.toggle("is-selected", Number(b.dataset.v) === cur);
  };
  for (const [v, key] of [
    [2, "cpu.count.2"],
    [3, "cpu.count.3"],
    [4, "cpu.count.4"],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "home-match-choice-segment-btn";
    b.dataset.v = String(v);
    b.textContent = t(key);
    b.addEventListener("click", () => {
      setCpuPlayerCount(v);
      refreshCnt();
    });
    cntSeg.appendChild(b);
    cntButtons.push(b);
  }
  cnt.appendChild(cntSeg);
  const cntHint = document.createElement("div");
  cntHint.className = "home-match-choice-difficulty-hint";
  cntHint.textContent = t("home.matchChoice.countHint");
  cnt.appendChild(cntHint);
  refreshCnt();
  details.appendChild(cnt);

  // CPU戦の対戦ルール（ユーザー要望2026-09-09「CPU戦でも 白黒あり／タイマーあり（実質自分だけ）／
  // ブーストあり／マイデッキあり を選べるようにしたい」）。オンラインの部屋で選べるものと同じ4つ。
  // 押すたびに入り／外れが切り替わり、端末とアカウントに保存される（人数・強さと同じ扱い）。
  const rules = document.createElement("div");
  rules.className = "home-match-choice-difficulty";
  const rulesLabel = document.createElement("div");
  rulesLabel.className = "home-match-choice-difficulty-label";
  rulesLabel.textContent = t("home.matchChoice.rulesLabel");
  rules.appendChild(rulesLabel);
  const rulesRow = document.createElement("div");
  rulesRow.className = "home-match-choice-rules";
  for (const [key, get, set] of [
    ["home.matchChoice.ruleBlackWhite", isCpuBlackWhiteEnabled, setCpuBlackWhiteEnabled],
    ["home.matchChoice.ruleBoost", isCpuBoostEnabled, setCpuBoostEnabled],
    ["home.matchChoice.ruleMyDeck", isCpuMyDeckEnabled, setCpuMyDeckEnabled],
    ["home.matchChoice.ruleSelfTimer", isCpuSelfTimerEnabled, setCpuSelfTimerEnabled],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "home-match-choice-rule-btn";
    b.textContent = t(key);
    const refresh = () => {
      const on = !!get();
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    };
    b.addEventListener("click", () => {
      set(!get());
      refresh();
    });
    refresh();
    rulesRow.appendChild(b);
  }
  rules.appendChild(rulesRow);
  const rulesHint = document.createElement("div");
  rulesHint.className = "home-match-choice-difficulty-hint";
  rulesHint.textContent = t("home.matchChoice.rulesHint");
  rules.appendChild(rulesHint);
  details.appendChild(rules);

  // 🔴 管理者だけに出す「テストモード」。0th拡張（0th EDITION 拡張）の33種で遊ぶための入口。
  //   遊んでいる人には**この区画自体が存在しない**（既定はリメイクの33種のまま）。
  //   ⚠ ここで選んだものは**次に始める対局から**効く（いま走っている対局の山札は変えられない）。
  //   ⚠ **ここは CPU戦用の既定**。フレンドリーマッチは続き650 から部屋ごとに効くようになり、
  //     さらに 2026-11-10 から**部屋の中でも選べる**（online-ui.js の buildRoomCardSetChooser）。
  //     部屋で選ばなければ、ここの選択がそのまま使われる。
  //   🔴 **ランク戦はここを見ない**（必ずリメイク）。それまでは端末の設定が漏れていた。
  if (isAdminUser()) {
    const setBox = document.createElement("div");
    setBox.className = "home-match-choice-difficulty home-match-choice-testmode";
    const setLabel = document.createElement("div");
    setLabel.className = "home-match-choice-difficulty-label";
    setLabel.textContent = t("home.matchChoice.cardSetLabel");
    setBox.appendChild(setLabel);
    const setSeg = document.createElement("div");
    setSeg.className = "home-match-choice-segment";
    const setButtons = [];
    const refreshSet = () => {
      const cur = getCardSet();
      for (const b of setButtons) b.classList.toggle("is-selected", b.dataset.v === cur);
    };
    for (const [v, key] of [
      [CARD_SETS.REMAKE, "home.matchChoice.cardSetRemake"],
      [CARD_SETS.EX0, "home.matchChoice.cardSetEx0"],
      [CARD_SETS.FIRST_ED, "home.matchChoice.cardSet1st"],
      [CARD_SETS.MIXED, "home.matchChoice.cardSetMixed"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "home-match-choice-segment-btn";
      b.dataset.v = v;
      b.textContent = t(key);
      b.addEventListener("click", () => {
        setCardSet(v);
        refreshSet();
      });
      setSeg.appendChild(b);
      setButtons.push(b);
    }
    setBox.appendChild(setSeg);
    const setHint = document.createElement("div");
    setHint.className = "home-match-choice-difficulty-hint";
    setHint.textContent = t("home.matchChoice.cardSetHint");
    setBox.appendChild(setHint);
    refreshSet();
    details.appendChild(setBox);
  }

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "home-match-choice-cancel";
  cancel.textContent = t("common.back");
  cancel.addEventListener("click", closeMatchChoiceModal);
  panel.appendChild(details);
  refreshDetailsToggle(); // 文言と「設定を変えています」の1行を、開く前に一度そろえる
  panel.appendChild(cancel);

  // 背景クリックでも閉じる（パネル内クリックは伝播させない）。
  back.addEventListener("click", closeMatchChoiceModal);
  panel.addEventListener("click", (e) => e.stopPropagation());

  back.appendChild(panel);
  overlayEl.appendChild(back);
  matchChoiceEl = back;
}

// ═══════════ 【2026-11-14・続き704】試作のレイアウトをホーム画面へ（?ui=v2 の時だけ）═══════════
// ユーザーの問い「以前描画提案してくれたやつとほぼ同じようにできる？今は既存のレイアウトありきで
// 雰囲気を変えてるだけだよね？？」→ そのとおりだったので、**組み立てから変える**。
//
// 🔴 **既定の画面は1行も変えない。** `isUiV2()` の時だけこちらを組み立て、
//   v2 に決まったら古い方を消す（ユーザーと合意した段取り）。
//
// 試作（project/Main.dc.html）との対応:
//   ・左に縦のアイコン列（試作 104px）→ **112px**（指で押せる方へ少し広げた）
//   ・上に見出しの行（英字の肩書き＋「ホーム」＋右に告知）
//   ・本体は2列（左＝ランク戦の大きな札／右＝遊ぶ入口の札）
//
// ⚠ **試作に在って、このアプリに無いもの**: 「パックを開ける」。タイルが無いので置かない
//   （中身の無い札を並べるより、在る8つを意味のある場所へ割り振る）。
// ⚠ **行き先は重複させない。** 左の列＝マイページ・図鑑・ランキング・お知らせ（見る所）、
//   本体＝ランク戦・CPU＆フレンドリー・物語チュートリアル・ショップ（遊ぶ・買う所）。
//   試作どおり左の列は**本当に押せる道**で、飾りではない。
// 🔴 **文字の大きさは試作の値をそのまま使えない。** ステージ(1600x900)は画面に合わせて
//   縮むので、スマホ横（932x430）では倍率 0.478 ＝ 試作の 12px は**実画面 5.7px**。
//   ⇒ 読ませたい文字は **25px（1.56rem）以上**にしてある。英字の肩書きは飾りなので小さめ。
function buildHomeV2(overlayEl, parts) {
  const tileByKey = new Map();
  for (const tile of TILES) tileByKey.set(tile.key, tile);
  const 作る = (key) => {
    const tile = tileByKey.get(key);
    return tile ? buildTile(tile) : null;
  };

  // ── 左の縦のアイコン列（見る所へ行く道）
  const rail = document.createElement("div");
  rail.id = "home-v2-rail";
  const mark = document.createElement("div");
  mark.id = "home-v2-rail-mark";
  mark.textContent = "S:7";
  rail.appendChild(mark);
  for (const key of ["mypage", "codex", "ranking", "news"]) {
    const el = 作る(key);
    if (el) {
      el.classList.add("is-rail");
      // 🔴 列の幅は狭い（実測でスマホは実画面47px）。「マイページ／マイデッキ編集」のような
      //   長い名前は入らないので、**列の中だけ短い名前**にする（押した先は同じ）。
      const lab = el.querySelector(".home-screen-tile-label");
      if (lab) lab.textContent = t("home.rail." + key);
      rail.appendChild(el);
    }
  }
  overlayEl.appendChild(rail);

  const main = document.createElement("div");
  main.id = "home-v2-main";
  overlayEl.appendChild(main);

  // ── 見出しの行（英字の肩書き＋「ホーム」＋右に告知）
  const header = document.createElement("div");
  header.id = "home-v2-header";
  const headLeft = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.className = "home-v2-eyebrow";
  eyebrow.textContent = "HOME";
  const h1 = document.createElement("div");
  h1.id = "home-v2-title";
  h1.textContent = "7 SHADES OF S:EVEN";
  const sub = document.createElement("div");
  sub.id = "home-v2-subtitle";
  sub.textContent = t("home.subtitle");
  headLeft.append(eyebrow, h1, sub);
  header.appendChild(headLeft);
  // クラウドファンディングの帯は、試作の「右の札」の位置へ（期限を過ぎたら parts.cf が null）。
  if (parts.cf) {
    parts.cf.classList.add("is-v2-header");
    header.appendChild(parts.cf);
  }
  main.appendChild(header);

  const body = document.createElement("div");
  body.id = "home-v2-body";
  main.appendChild(body);

  // ── 左の列：ランク戦を主役に
  const colL = document.createElement("div");
  colL.className = "home-v2-col";
  const hero = document.createElement("div");
  hero.id = "home-v2-hero";
  const heroTile = 作る("ranked");
  if (heroTile) {
    heroTile.classList.add("is-hero");
    hero.appendChild(heroTile);
  }
  // 現ランク表示は、試作のヒーローの中の「次のランクまで」の位置へ入れる。
  parts.rankArea.classList.add("is-v2-hero");
  hero.appendChild(parts.rankArea);
  colL.appendChild(hero);
  const shopTile = 作る("shop");
  if (shopTile) {
    shopTile.classList.add("is-wide");
    colL.appendChild(shopTile);
  }
  body.appendChild(colL);

  // ── 右の列：遊ぶ入口
  const colR = document.createElement("div");
  colR.className = "home-v2-col is-right";
  // はじめての人の「次にやること」は、在る時だけ右の列のいちばん上へ。
  if (parts.firstStep) {
    parts.firstStep.classList.add("is-v2");
    colR.appendChild(parts.firstStep);
  }
  for (const key of ["match", "tutorial"]) {
    const el = 作る(key);
    if (el) {
      el.classList.add("is-card");
      colR.appendChild(el);
    }
  }
  body.appendChild(colR);
}

function buildTile(tile) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = tile.status === "ready" ? "home-screen-tile" : "home-screen-tile is-soon";
  // 【2026-11-14】v2 のレイアウトが「どのタイルをどこに置くか」を名前で決められるように。
  // 既定の見た目では使わない（CSS 側で `body.ui-v2` の下だけが見る）。
  if (tile.key) btn.dataset.tile = tile.key;

  const iconEl = document.createElement("div");
  iconEl.className = "home-screen-tile-icon";
  if (tile.image) {
    // ユーザー作成のアイコン画像をそのまま表示（枠なし）。読み込み失敗時は絵文字へフォールバック。
    const img = document.createElement("img");
    img.src = tile.image;
    img.alt = "";
    img.className = "home-screen-tile-icon-img";
    img.addEventListener("error", () => {
      iconEl.textContent = tile.icon;
    });
    iconEl.appendChild(img);
  } else {
    iconEl.textContent = tile.icon;
  }
  btn.appendChild(iconEl);

  const labelEl = document.createElement("div");
  labelEl.className = "home-screen-tile-label";
  labelEl.textContent = t(tile.labelKey);
  btn.appendChild(labelEl);

  if (tile.status === "soon") {
    const badge = document.createElement("div");
    badge.className = "home-screen-tile-badge";
    badge.textContent = t("home.comingSoonBadge");
    btn.appendChild(badge);
  }

  // 未読お知らせがあれば「NEW」バッジ（ユーザー要望）。
  if (tile.showNewIfUnread && tile.showNewIfUnread()) {
    const newBadge = document.createElement("div");
    newBadge.className = "home-screen-tile-new-badge";
    newBadge.textContent = t("home.newBadge");
    btn.appendChild(newBadge);
  }

  // 続き162: ランク戦タイルに「今◯人が対戦相手を募集中」を表示（コールドスタート対策）。
  // 既定は非表示。openHomeScreen の待機人数ポーラー(updateRankedWaitingBadge)が更新する。
  if (tile.showWaitingCount) {
    const waitBadge = document.createElement("div");
    waitBadge.className = "home-screen-tile-waiting-badge";
    waitBadge.style.display = "none";
    btn.appendChild(waitBadge);
  }

  // ユーザー要望2026-09-02: ランク戦の「募集中の人が現れたらお知らせ」をまだONにしていない
  // 人に、その場でONにできるバッジを出す（既定は非表示。updateRankedNotifyBadgeが出し分ける）。
  // タイル自体が<button>なので、入れ子の<button>にはせずクリックだけ自前で拾い、伝播を止める
  // （押してもランク戦は始まらない）。
  if (tile.showNotifySuggest) {
    const notifyBadge = document.createElement("div");
    notifyBadge.className = "home-screen-tile-notify-badge";
    notifyBadge.setAttribute("role", "button");
    notifyBadge.tabIndex = 0;
    notifyBadge.textContent = t("home.notifyBadge");
    notifyBadge.title = t("home.notifyBadgeTip");
    notifyBadge.style.display = "none";
    const turnOn = (e) => {
      e.stopPropagation();
      e.preventDefault();
      enableRankedNotifyFromPrompt();
      notifyBadge.style.display = "none";
      showHomeToast(t("home.notifyEnabledToast"));
    };
    notifyBadge.addEventListener("click", turnOn);
    notifyBadge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") turnOn(e);
    });
    btn.appendChild(notifyBadge);
  }

  btn.addEventListener("click", () => {
    if (tile.status !== "ready") {
      showComingSoonToast(t(tile.labelKey));
      return;
    }
    tile.onOpen();
    // 開いた後は未読でなくなるので、このタイルのNEWバッジを消す（お知らせはモーダルで
    // ホーム画面の上に開くため、ホーム自体は残る）。
    if (tile.showNewIfUnread && !tile.showNewIfUnread()) {
      btn.querySelector(".home-screen-tile-new-badge")?.remove();
    }
  });
  return btn;
}

export function openHomeScreen() {
  if (overlayEl) return;
  // 【続き602・2026-10-20】不具合報告をくれた人へのお礼を、ここで一度だけ見に行く。
  // 対局中には出さない（手が止まる）し、起動直後の案内モーダルとも重ならない。
  // 動的import（この画面の起動を重くしない）・投げっぱなし（失敗してもホームは開く）。
  void import("./bug-report-thanks.js").then((m) => m.maybeShowBugReportThanks()).catch(() => {});
  // 【#444】届いているフレンド申請の数を、画面上部のマイページアイコンに出し直す
  // （ユーザー要望「フレンドの申請が来ていることが画面上部のどこかでわかるといいかも！」）。
  // 動的import・投げっぱなし（失敗してもホームは開く）。常時の見張りは置かない
  // ——申請は急ぐものではないので、ホームへ戻るたびに見れば足りる。
  void import("./friends-ui.js").then((m) => m.refreshFriendRequestBadge()).catch(() => {});
  // #210: どの経路でホームへ戻っても勝利ファンファーレは止める（対戦終了パネルの各ボタン
  // だけでなく、最小化してから戻る等の経路もあるため、ここで一括して面倒を見る）。
  // あわせて盤面のBGMも止める（ユーザー報告2026-09-02「対戦後、ホーム画面に戻っても
  // 盤面の時のBGMのまま」）。対局へ戻れば initGameBgmAutoStart 側で鳴り直す。
  // #216（ユーザー報告2026-09-03「対戦終了後、ホームに戻ってもBGMが鳴らない」）:
  // 盤面のBGMを止めるだけだと無音になってしまうので、タイトル画面と同じBGMへ切り替える。
  void import("./sound.js")
    .then((m) => {
      m.stopVictoryBgm();
      m.stopGameBgm();
      m.playWaitingBgm(); // ユーザー指定2026-09-03: ホーム画面は待機中BGM（とりあえず）
    })
    .catch(() => {});
  overlayEl = document.createElement("div");
  overlayEl.id = "home-screen";
  // 【2026-11-14】試作のレイアウトを使うか。**ここで1回だけ決める**（途中で変わると半端になる）。
  const uiV2 = isUiV2();
  if (uiV2) overlayEl.classList.add("is-v2");

  const title = document.createElement("div");
  title.id = "home-screen-title";
  title.textContent = "7 SHADES OF S:EVEN";
  if (!uiV2) overlayEl.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.id = "home-screen-subtitle";
  subtitle.textContent = t("home.subtitle");
  if (!uiV2) overlayEl.appendChild(subtitle);

  // ═══ クラウドファンディングの帯（2026-11-08・ユーザー要望「アプリのホーム画面に
  //     クラファンのリンク載せれる？」→「上に帯で出す」）═══
  // 🔴 **終わったら自動で消える。** 期限を過ぎた告知が出たままになるのがいちばん格好悪い。
  //   日付は端末の時計で見る（サーバーに聞かない＝ホームの表示を1本の問い合わせにも
  //   依存させないため）。時計がずれている端末では多少前後するが、害は無い。
  // ⚠ 終わったらこのブロックごと消してよい（ui-text の home.cf.* と style.css の
  //   #home-screen-cf も一緒に）。
  const cf = buildCrowdfundingBanner();
  if (cf && !uiV2) overlayEl.appendChild(cf);

  // 現ランク表示（ログイン済みかつランクデータがある時だけ非同期で出す）。押すとランキングへ。
  const rankArea = document.createElement("div");
  rankArea.id = "home-screen-rank";
  rankArea.style.display = "none";
  if (!uiV2) overlayEl.appendChild(rankArea);
  renderHomeRank(rankArea);

  // はじめての人の「次にやること」（first-steps.js）。3歩を終えた人・✕で消した人には出ない。
  // 押した時の中身は、ホームが既に持っている入口をそのまま渡す（新しい導線を増やさない）。
  const firstStep = buildFirstStepCard({
    story: () => {
      closeHomeScreen();
      startEidosStory({ openHome: () => openHomeScreen() });
    },
    cpu: async () => {
      // 初めての1戦は1対1（いちばん短くて分かりやすい）。ホームのCPU戦と同じ手順。
      noteCpuBattlePlayed();
      try {
        const { startCpuBattle, runCpuBattleSetup } = await import("./cpu-battle.js");
        await startCpuBattle(2);
        closeHomeScreen(); // 盤面が空になってから見せる（続き379）
        setTimeout(() => {
          runCpuBattleSetup({ count: 2 }).catch((err) => console.error("runCpuBattleSetup failed", err));
        }, 60);
      } catch (err) {
        console.error("first-step CPU battle failed", err);
      }
    },
    online: async () => {
      // 相手が見つかる可能性が一番高いのはランク戦（待っている間はCPU練習もできる）。
      closeHomeScreen();
      try {
        const { startRankedMatchmaking } = await import("./ranked-match.js");
        await startRankedMatchmaking(() => openHomeScreen());
      } catch (err) {
        console.error("first-step ranked start failed", err);
        openHomeScreen();
      }
    },
  });
  if (firstStep && !uiV2) overlayEl.appendChild(firstStep);

  if (uiV2) {
    buildHomeV2(overlayEl, { cf, rankArea, firstStep });
  } else {
    const grid = document.createElement("div");
    grid.id = "home-screen-grid";
    for (const tile of TILES) grid.appendChild(buildTile(tile));
    overlayEl.appendChild(grid);
  }

  // ユーザー要望2026-09-02「ブラウザで開いた人にPWAを案内してボタン一つでホームに追加」。
  // 追加できる環境（Android Chrome等）ではボタンで即追加、iPhoneは手順を案内する。
  // 追加済み／「あとで」を押した端末では、この要素は非表示のまま残るだけ。
  overlayEl.appendChild(buildPwaInstallBanner());

  document.body.appendChild(overlayEl);
  // ユーザー要望（続き75）「ホーム画面やプロフ全画面でも上のオプションエリアのアイコン等は
  // 表示していてください」。full-screen-page-active共通クラス（style.css参照）。
  syncFullScreenPageActive();
  startRankedWaitingPoll(); // ランク戦タイルの待機人数表示（続き162）
  // ユーザー要望2026-09-01「ホーム画面に行く時に、現在このアプリはα版です、デバッグに
  // 協力してください的なモーダルを素人にもわかりやすく出したい」。アプリを開くたびに1回だけ
  // 出す（ホームへ戻るたびには出さない）。詳しくは alpha-notice.js を参照。
  maybeShowAlphaNotice();
  // 取得は非同期。α版のお知らせと重ならないよう、少し待ってから出す（α版を閉じた頃に届く）。
  setTimeout(() => void maybeShowAnnouncement(), 1200);
}

// ホーム画面の現ランク表示を非同期で描画する。未ログイン（getSelfRankがundefined）や
// ランクSQL未デプロイ（RPCエラー）の時は例外を握りつぶして非表示のままにする（graceful）。
async function renderHomeRank(container) {
  let info = null;
  try {
    info = await getSelfRank();
  } catch {
    return; // RPC未デプロイ等 → 非表示のまま
  }
  // 描画中にホーム画面が閉じられていたら何もしない。
  if (!info || !overlayEl || !overlayEl.contains(container)) return;
  container.innerHTML = "";
  const label = document.createElement("div");
  label.className = "home-rank-label";
  label.textContent = t("home.rankLabel");
  container.appendChild(label);
  // バッジ＋U型ゲージ＋宝石の合成表示（rank-showcase.js）を左上にコンパクトに出す（大きな
   // グリッドと重ならないよう控えめに。位置・サイズは管理者モードで調整可）。
  container.appendChild(
    buildRankShowcase(info.rank ?? 0, info.gauge ?? 0, info.legend_points ?? 0, { scale: 0.4 })
  );
  const nm = document.createElement("div");
  nm.className = "home-rank-name";
  nm.textContent = rankName(info.rank ?? 0);
  container.appendChild(nm);
  container.style.display = "flex";
  // クリックでランク戦の説明モーダルを開く（ユーザー要望2026-08-17）。以前は勝率等のランキング
  // 画面へ遷移していたが、それは戦績システムの「順位」でランク戦の段位とは別物のため紛らわしく、
  // 一旦「表示専用」にしていた。今回、ランクの仕組みを説明するモーダルへの入口にした。
  container.style.cursor = "pointer";
  container.title = t("home.rankAboutTitle");
  container.onclick = () => showRankExplanationModal();
}

// 続き162: ランク戦タイルの「今◯人が対戦相手を募集中」表示。ホーム画面が開いている間だけ、
// 待機人数を定期取得してタイルのバッジを更新する（コールドスタート対策。入る前に状況が見える）。
let rankedWaitTimer = null;
async function updateRankedWaitingBadge() {
  if (!overlayEl) return;
  const badge = overlayEl.querySelector(".home-screen-tile-waiting-badge");
  if (!badge) return;
  const notifyBadge = overlayEl.querySelector(".home-screen-tile-notify-badge");
  const user = await getCurrentUser();
  if (!user) {
    badge.style.display = "none";
    if (notifyBadge) notifyBadge.style.display = "none"; // 未ログインでは勧めない（通知はログイン前提）
    return;
  }
  // ユーザー要望2026-09-02: まだONにしていない人にだけ勧める。
  if (notifyBadge) notifyBadge.style.display = shouldSuggestRankedNotify() ? "" : "none";
  let res;
  try {
    res = await pollRanked();
  } catch {
    return;
  }
  if (!overlayEl || !res) return;
  const count = res.waiting_count || 0;
  if (count >= 1) {
    badge.textContent = t("home.waitingBadge", { count });
    badge.style.display = "";
  } else {
    badge.style.display = "none";
  }
}
function startRankedWaitingPoll() {
  stopRankedWaitingPoll();
  void updateRankedWaitingBadge();
  rankedWaitTimer = setInterval(() => void updateRankedWaitingBadge(), 15000);
}
function stopRankedWaitingPoll() {
  if (rankedWaitTimer) {
    clearInterval(rankedWaitTimer);
    rankedWaitTimer = null;
  }
}

export function closeHomeScreen() {
  stopRankedWaitingPoll();
  overlayEl?.remove();
  overlayEl = null;
  toastEl = null;
  matchChoiceEl = null; // overlayElごと消えるので参照だけリセット
  clearTimeout(toastTimer);
  syncFullScreenPageActive();
}

// ユーザー報告（続き74）「『ゲームを開始する』を押してもホーム画面が消えません」。
// online-ui.jsのinitOnlineUi()が部屋モーダル(#online-panel)を自動で閉じるのと
// 全く同じ「turnPlayerがnull→非nullに変わった瞬間だけを検知する」パターンを、
// ホーム画面自身にも独立して適用する（online-ui.js側の実装に依存せず、ホーム画面が
// 開いている間はどの経路でゲームが始まってもここで確実に閉じる）。
let wasGameStarted = false;
subscribe(() => {
  const started = Boolean(getState().turnPlayer);
  if (started && !wasGameStarted && overlayEl) closeHomeScreen();
  wasGameStarted = started;
});

// 言語切替（options-menuの言語セレクタ）でホーム画面が開いていれば作り直す（開いていない時は
// 次に開いた時点でt()が新しい言語で組む）。マッチ選択モーダルは開き直さない（開いていれば
// closeHomeScreenでoverlayごと消えるが、稀なケースなので許容）。
onLangChange(() => {
  if (overlayEl) {
    closeHomeScreen();
    openHomeScreen();
  }
});
