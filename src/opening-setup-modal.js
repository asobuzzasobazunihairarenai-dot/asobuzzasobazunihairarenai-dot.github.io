// 【続き574・2026-10-11】起動時の案内モーダル（言語 / ホーム画面に追加）。
//
// ユーザー要望「トライアルも普通のもオープニング画面で、言語設定と全画面表示にするかと、
// ホームに追加してアプリとして起動するかなどの案内を入れたい」
// →「遊ぶ画面はホームに追加して全画面じゃないとプレイがしにくいのでマストです。
//    言語、ホーム追加（アンドロイドは全画面）は最初にモーダルでしっかり案内しましょう！！」
//
// 【なぜ「全画面ボタン」ではなく「ホーム画面に追加」を主役にしたか（調べた事実）】
//   ・**iPhone の Safari は全画面にできない**（Apple が Fullscreen API を実装していない。
//     fullscreen-toggle.js の isFullscreenSupported() が false になり、ボタンは安全に no-op）。
//     つまり iPhone の人に「全画面にしますか？」と出すのは**嘘になる**。
//   ・iPhone で全画面にする唯一の方法が**ホーム画面に追加して、そこから開くこと**。
//     manifest.json に display:standalone / orientation:landscape を入れてあるので、
//     **全画面になり、しかも横向きに固定される**。
//   ・副産物が大きい: #378「下に黒い余白が残る」は Safari の上下のバーが出入りするのが原因で、
//     ホームから起動すればそのバーが無い＝**あの症状自体が起きない**。「端末を横向きにして
//     ください」の案内も出ない。
//   ・だから全画面ボタンは**効く端末（PC・Android 等）にだけ**出す。
//
// 【出す条件】タッチ端末（スマホ・タブレット）で、まだホームから起動しておらず、
//   「もう出さない」を押していない時。**PCには出さない**——PCは窓のままで十分遊べて、
//   「ホーム画面に追加」という言い方も合わない（#2026-09-05 のユーザー報告「スマホではないのに
//   ホーム画面への追加推奨モーダルが出ています」と同じ轍を踏まないため）。
//
// 【追加の仕組みは pwa-install.js と共有する】1タップ追加（Android）・iOS の手順・追加済み判定は
//   既にあちらに在るので、**同じ判定を2か所に書かない**（続き549・552・557 と同じ考え方）。
import { t } from "./ui-text.js";
import { createBackdrop } from "./ui-helpers.js";
import { isTouchPrimaryDevice } from "./device-detect.js";
import { getLang, setLangWithNotice, SUPPORTED_LANGS, LANG_LABEL } from "./i18n.js";
import { isFullscreenSupported, toggleFullscreen } from "./fullscreen-toggle.js";
import {
  isStandalone,
  isIosDevice,
  canPromptInstall,
  promptInstall,
  onInstallAvailabilityChange,
} from "./pwa-install.js";

const NEVER_KEY = "so7-opening-setup-never";

function neverAgain() {
  try {
    return localStorage.getItem(NEVER_KEY) === "1";
  } catch {
    return false;
  }
}
function markNeverAgain() {
  try {
    localStorage.setItem(NEVER_KEY, "1");
  } catch {
    /* 保存できなくてもこの回は閉じる */
  }
}

function shouldShow() {
  if (typeof document === "undefined") return false;
  if (!isTouchPrimaryDevice()) return false; // PCには出さない（上のコメント参照）
  if (isStandalone()) return false; // もうホームから起動している＝案内不要
  if (neverAgain()) return false;
  return true;
}

let openEl = null;

// 起動時に1回呼ぶ。出さない場合も onClose は呼ぶ（呼び出し側が次の処理へ進めるように）。
export function maybeShowOpeningSetupModal({ onClose } = {}) {
  if (openEl) return false;
  if (!shouldShow()) {
    onClose?.();
    return false;
  }
  show(onClose);
  return true;
}

function show(onClose) {
  // 背景はタップで閉じない（「しっかり案内」が要望なので、誤タップで消えてほしくない）。
  // blocksGame:false ＝ 盤面の進行を止める印には使わない（続き455 の実害）。
  const backdrop = createBackdrop(() => {}, { dim: true, blocksGame: false, zIndex: 100060 });
  const modal = document.createElement("div");
  modal.id = "opening-setup-modal";
  openEl = modal;

  let unsubscribeInstall = null;
  const close = () => {
    try {
      unsubscribeInstall?.();
    } catch {
      /* 解除できなくても閉じる */
    }
    backdrop.remove();
    modal.remove();
    openEl = null;
    onClose?.();
  };

  // 言語を切り替えたら文面を作り直す必要があるので、中身は丸ごと組み直せる形にする。
  function render() {
    modal.textContent = "";

    const title = document.createElement("div");
    title.className = "opening-setup-title";
    title.textContent = t("setup.title");
    modal.appendChild(title);

    // ---- ① 言語 ----
    const langSection = document.createElement("div");
    langSection.className = "opening-setup-section";
    const langLabel = document.createElement("div");
    langLabel.className = "opening-setup-label";
    langLabel.textContent = t("setup.langLabel");
    langSection.appendChild(langLabel);
    const langRow = document.createElement("div");
    langRow.className = "opening-setup-lang-row";
    for (const lang of SUPPORTED_LANGS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opening-setup-lang-btn";
      if (lang === getLang()) btn.classList.add("is-current");
      btn.textContent = LANG_LABEL[lang] ?? lang;
      btn.addEventListener("click", async () => {
        if (lang === getLang()) return;
        // 切り替えは1秒前後かかるので、案内を出しながら行う（#390・続き571）。
        await setLangWithNotice(lang);
        render(); // この画面の文面も新しい言語で作り直す
      });
      langRow.appendChild(btn);
    }
    langSection.appendChild(langRow);
    modal.appendChild(langSection);

    // ---- ② ホーム画面に追加 ----
    const homeSection = document.createElement("div");
    homeSection.className = "opening-setup-section";
    const homeLabel = document.createElement("div");
    homeLabel.className = "opening-setup-label";
    homeLabel.textContent = t("setup.homeLabel");
    homeSection.appendChild(homeLabel);
    const why = document.createElement("div");
    why.className = "opening-setup-why";
    why.textContent = t("setup.homeWhy");
    homeSection.appendChild(why);

    if (canPromptInstall()) {
      // Android の Chrome/Edge 等: OS標準の「追加しますか？」を1タップで出せる。
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "opening-setup-primary";
      addBtn.textContent = t("setup.addBtn");
      addBtn.addEventListener("click", async () => {
        addBtn.disabled = true;
        const outcome = await promptInstall();
        if (outcome === "accepted") {
          // 追加できた人にはもう出さない（次はホームから全画面で開く）。
          markNeverAgain();
          close();
          return;
        }
        addBtn.disabled = false;
        render(); // 断られた＝1タップが使えなくなったので、手順の案内に切り替わる
      });
      homeSection.appendChild(addBtn);
    } else if (isIosDevice()) {
      // iPhone/iPad: アプリ側から追加できないので手順を出す（文章は pwa-install.js と共用）。
      const steps = document.createElement("ol");
      steps.className = "opening-setup-steps";
      for (const key of ["pwa.iosStep1", "pwa.iosStep2", "pwa.iosStep3"]) {
        const li = document.createElement("li");
        li.textContent = t(key);
        steps.appendChild(li);
      }
      homeSection.appendChild(steps);
      const note = document.createElement("div");
      note.className = "opening-setup-note";
      note.textContent = t("pwa.iosNote");
      homeSection.appendChild(note);
    } else {
      // Android だが合図がまだ来ていない／その他のブラウザ。メニューからの手順を案内する
      // （合図が後から来たら onInstallAvailabilityChange で1タップのボタンに差し替わる）。
      const steps = document.createElement("ol");
      steps.className = "opening-setup-steps";
      for (const key of ["setup.menuStep1", "setup.menuStep2"]) {
        const li = document.createElement("li");
        li.textContent = t(key);
        steps.appendChild(li);
      }
      homeSection.appendChild(steps);
    }

    // 全画面は**効く端末だけ**に出す（iPhone の Safari は非対応＝押しても何も起きない）。
    if (isFullscreenSupported()) {
      const fsBtn = document.createElement("button");
      fsBtn.type = "button";
      fsBtn.className = "opening-setup-secondary";
      fsBtn.textContent = t("setup.fullscreenBtn");
      fsBtn.addEventListener("click", () => {
        toggleFullscreen(); // 全画面に入ると横向きロックも試みる（fullscreen-toggle.js）
      });
      homeSection.appendChild(fsBtn);
      const fsNote = document.createElement("div");
      fsNote.className = "opening-setup-note";
      fsNote.textContent = t("setup.fullscreenNote");
      homeSection.appendChild(fsNote);
    }
    modal.appendChild(homeSection);

    // ---- 閉じ方 ----
    const actions = document.createElement("div");
    actions.className = "opening-setup-actions";
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "opening-setup-play";
    playBtn.textContent = t("setup.playAnyway");
    playBtn.addEventListener("click", close);
    actions.appendChild(playBtn);
    const neverBtn = document.createElement("button");
    neverBtn.type = "button";
    neverBtn.className = "opening-setup-never";
    neverBtn.textContent = t("setup.never");
    neverBtn.addEventListener("click", () => {
      markNeverAgain();
      close();
    });
    actions.appendChild(neverBtn);
    modal.appendChild(actions);
  }

  render();
  // 「1タップで追加できる」合図は**ページを開いてから遅れて飛んでくる**ことがあるので、
  // 来たら手順の案内からボタンへ差し替える。
  unsubscribeInstall = onInstallAvailabilityChange(() => {
    if (openEl === modal) render();
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
}
