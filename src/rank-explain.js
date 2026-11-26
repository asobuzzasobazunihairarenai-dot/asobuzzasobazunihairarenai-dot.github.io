// ランク戦（フリーマッチ）の説明。ホーム画面・マイページのランク表示をクリックした時に出す
// 説明モーダル（ユーザー要望2026-08-17）と、ヘルプページの「🏆 ランク戦について」項目の両方で
// 使う共有コンテンツ。docs/ranked-spec.md の v1 仕様をプレイヤー向けにやさしく要約したもの。

import { createBackdrop, createModalCloseX } from "./ui-helpers.js";
import { t } from "./ui-text.js"; // UI英語化フェーズ8
// 🔴【続き861】ランク戦のエディション投票（事前に決めておく）。
//   ⚠ 置き場所をここにした理由: ユーザー指示は「**マイページから**決めておけるように」だが、
//     マイページの節は ui-v2.css が **grid の名前を1つずつ列挙**して並べているので、節を
//     新設すると**手で詰めたレイアウトを作り直す**ことになる（続き816 でユーザーが詰めた）。
//     この札はマイページのランク表示を押して開く＝**マイページから辿れる**し、9箱でも入る。
import { getRankedEditionVotes, setRankedEditionVotes } from "./ranked-edition-vote.js";
import { getRankedVoteSets, isAdminUser } from "./online.js";
import { CARD_SETS } from "./card-set.js";
import { セットの名 } from "./edition-select-ui.js";

// help.js の openItemModal と同じ { title, body:[段落...] } 形式。ヘルプの索引にもそのまま並べる。
// UI英語化フェーズ8: 定数ではなく関数で返す（読み込み時に固定すると言語切替に追随しないため。
// 本文は ui-text.js の rankex.* にある）。呼び出し側は表示のたびに getRankExplainSections() を呼ぶ。
export function getRankExplainSections() {
  return [
    { title: t("rankex.s1.title"), body: [t("rankex.s1.b1"), t("rankex.s1.b2"), t("rankex.s1.b3"), t("rankex.s1.b4")] },
    { title: t("rankex.s2.title"), body: [t("rankex.s2.b1"), t("rankex.s2.b2"), t("rankex.s2.b3"), t("rankex.s2.b4")] },
    { title: t("rankex.s3.title"), body: [t("rankex.s3.b1"), t("rankex.s3.b2"), t("rankex.s3.b3"), t("rankex.s3.b4")] },
    { title: t("rankex.s4.title"), body: [t("rankex.s4.b1"), t("rankex.s4.b2")] },
    { title: t("rankex.s5.title"), body: [t("rankex.s5.b1"), t("rankex.s5.b2"), t("rankex.s5.b3")] },
    { title: t("rankex.s6.title"), body: [t("rankex.s6.b1"), t("rankex.s6.b2"), t("rankex.s6.b3")] },
  ];
}

let modalEl = null;
let backdropEl = null;

function closeModal() {
  backdropEl?.remove();
  modalEl?.remove();
  backdropEl = null;
  modalEl = null;
}

// ランク表示（ホーム／マイページ）クリックで出す、全セクションを1枚にまとめたスクロール可能な
// 説明モーダル。どこから開いても最前面に出るよう十分高い z-index を使う。
// ランク戦で遊びたいエディションを選ぶ札。
// 🔴 選択肢は**サーバーが決める**（so7_ranked_vote_sets＝公開されている版だけ）。
//   クライアントに写しを持つと必ず食い違う。読めなければ**リメイクだけ**に落とす
//   ＝それまでの振る舞いそのまま。
async function 投票を組む(box) {
  let 版 = null;
  try { 版 = await getRankedVoteSets(); } catch (err) { 版 = null; }
  if (!Array.isArray(版) || 版.length === 0) 版 = [CARD_SETS.REMAKE];
  let 管理者 = false;
  try { 管理者 = isAdminUser(); } catch (err) { 管理者 = false; }
  // ⚠ 版が1つしか公開されていない間は、選んでも結果が変わらない＝**出さない**
  //   （押せない約束を残さない＝#729 の家族）。管理者には出す（試せるように・下に注つき）。
  if (版.length < 2 && !管理者) return;
  if (!box.isConnected) return;
  box.innerHTML = "";

  const h = document.createElement("div");
  h.className = "rank-explain-section-title";
  h.textContent = t("rankedVote.title");
  box.appendChild(h);

  const lead = document.createElement("p");
  lead.className = "rank-explain-paragraph";
  lead.textContent = t("rankedVote.lead");
  box.appendChild(lead);

  const row = document.createElement("div");
  row.className = "ranked-vote-row";
  // いまは**第一候補の1つだけ**を選ぶ（持ち方は順番付きの配列なので、将来
  // 第二候補以降に増やしても保存の形は変えなくてよい＝ranked-edition-vote.js の説明）。
  const 選ばれている = () => getRankedEditionVotes()[0] || "";
  const 札たち = [];
  const 塗る = () => {
    const 今 = 選ばれている();
    for (const b of 札たち) b.classList.toggle("is-selected", b.dataset.v === 今);
  };
  for (const v of ["", ...版]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ranked-vote-btn";
    b.dataset.v = v;
    b.textContent = v ? セットの名(v) : t("rankedVote.none");
    b.addEventListener("click", () => {
      setRankedEditionVotes(v ? [v] : []);
      塗る();
    });
    row.appendChild(b);
    札たち.push(b);
  }
  塗る();
  box.appendChild(row);

  if (版.length < 2) {
    const note = document.createElement("p");
    note.className = "rank-explain-paragraph is-ranked-vote-note";
    note.textContent = t("rankedVote.onlyOne");
    box.appendChild(note);
  }
}

export function showRankExplanationModal() {
  if (modalEl) return;
  backdropEl = createBackdrop(closeModal, { dim: true, zIndex: 20190 });
  document.body.appendChild(backdropEl);

  modalEl = document.createElement("div");
  modalEl.id = "rank-explain-modal";

  const titleEl = document.createElement("div");
  titleEl.className = "rank-explain-title";
  titleEl.textContent = t("rankex.title");
  modalEl.appendChild(titleEl);
  modalEl.appendChild(createModalCloseX(closeModal));

  const body = document.createElement("div");
  body.className = "rank-explain-body";
  // 🔴 投票の節は**説明より前**に置く（設定できるものを読み物の後ろに埋めない）。
  //   中身はサーバーに聞いてから入るので、先に空の札を置いて後から埋める（#685 の家族）。
  const 投票 = document.createElement("div");
  投票.className = "ranked-vote-box";
  body.appendChild(投票);
  投票を組む(投票);
  for (const section of getRankExplainSections()) {
    const h = document.createElement("div");
    h.className = "rank-explain-section-title";
    h.textContent = section.title;
    body.appendChild(h);
    for (const line of section.body) {
      const p = document.createElement("p");
      p.className = "rank-explain-paragraph";
      p.textContent = line;
      body.appendChild(p);
    }
  }
  modalEl.appendChild(body);

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.className = "rank-explain-ok";
  okBtn.textContent = "OK";
  okBtn.addEventListener("click", closeModal);
  modalEl.appendChild(okBtn);

  document.body.appendChild(modalEl);
}
