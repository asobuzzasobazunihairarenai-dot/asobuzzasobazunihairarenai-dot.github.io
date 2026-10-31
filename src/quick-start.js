// クイックスタート: 画面右上に「無色あり/なし」の切り替えと「2人/3人/4人」のボタンを常設し、
// 押すだけでセットアップウィザードの０〜３を一気に実行できるようにする（通常のウィザードを
// 開かずに素早く対戦を始めたい時向け）。無色カードの選択はデフォルトで「無色なし」
// （説明書の「初めてプレイする時は外すと簡単」という推奨に合わせる、ウィザード本体の
// デフォルトと同じ）。

import { quickStart } from "./game-setup.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ13
// 【#448・2026-10-31】言語を切り替えた時に貼り直す。i18n.js は何も import しない葉なので
// 循環 import にならない（続き573 で実際に TDZ で落ちているので毎回確かめている）。
import { onLangChange } from "./i18n.js";

let includeBlackWhite = false;

// 言語が変わった時に貼り直すもの。起動時に1回組み立てたきりだったので、
// **切り替えても起動時の言語のまま**だった（#448。続き617・618 と同じ形）。
const relabelFns = [];

function buildToggle() {
  const wrap = document.createElement("div");
  wrap.className = "quick-start-toggle";

  const noneBtn = document.createElement("button");
  const someBtn = document.createElement("button");
  const relabel = () => {
    noneBtn.textContent = t("qs.noColorless");
    someBtn.textContent = t("qs.withColorless");
  };
  relabel();
  relabelFns.push(relabel);

  function refresh() {
    noneBtn.classList.toggle("is-selected", !includeBlackWhite);
    someBtn.classList.toggle("is-selected", includeBlackWhite);
  }
  noneBtn.addEventListener("click", () => {
    includeBlackWhite = false;
    refresh();
  });
  someBtn.addEventListener("click", () => {
    includeBlackWhite = true;
    refresh();
  });
  refresh();

  wrap.appendChild(noneBtn);
  wrap.appendChild(someBtn);
  return wrap;
}

function buildCountButtons() {
  const wrap = document.createElement("div");
  wrap.className = "quick-start-counts";
  for (const count of [2, 3, 4]) {
    const btn = document.createElement("button");
    const relabel = () => {
      btn.textContent = t("qs.countN", { n: count });
      btn.title = t("qs.tip");
    };
    relabel();
    relabelFns.push(relabel);
    btn.addEventListener("click", () => quickStart(count, includeBlackWhite));
    wrap.appendChild(btn);
  }
  return wrap;
}

export function initQuickStart() {
  const bar = document.createElement("div");
  bar.id = "quick-start-bar";
  bar.appendChild(buildToggle());
  bar.appendChild(buildCountButtons());
  document.body.appendChild(bar);
  // 1つの失敗で他が古いままにならないよう、1件ずつ囲む（続き618 と同じ）。
  onLangChange(() => {
    for (const fn of relabelFns) {
      try {
        fn();
      } catch (e) {
        /* 1つ失敗しても他は貼り直す */
      }
    }
  });
}
