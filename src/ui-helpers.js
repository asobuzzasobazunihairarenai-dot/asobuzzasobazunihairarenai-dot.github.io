// パネル/モーダル共通の「右上✕ボタン＋外クリックでも閉じる」という閉じ方の標準部品。
// admin.js・deck-viewer.js・game-setup.js・main.js(重なりカード一覧モーダル)が使う。
// 今後新しく追加するパネル/モーダルも、原則としてこの部品を使って統一する
// （それぞれが独自に「閉じる」ボタンを実装すると、閉じ方の一貫性が崩れやすいため）。

// パネル本体（position:fixed/relativeが前提）の右上に置く、丸型の✕ボタン。
import { t } from "./ui-text.js"; // UI英語化フェーズ13

export function createModalCloseX(onClose) {
  const btn = document.createElement("button");
  btn.className = "modal-close-x";
  btn.textContent = "×";
  btn.setAttribute("aria-label", t("uih.close"));
  btn.addEventListener("click", onClose);
  return btn;
}

// パネルの外側をクリックした時にも閉じられるようにする、全画面の透明なクリック受け皿。
// dim:trueにすると背景を薄暗くする（一覧・情報モーダル向け）。省略時は透明のまま
// （常駐ツールパネル向け。盤面を見ながら調整したいので背景を暗くしたくないケース）。
// 🔴【#784・続き812】**画面を覆うモーダルが開いたら、知らせる。**
//   報告「手札をタップするとこうなってモーダルが見えない」の正体は、
//   **長押しの拡大表示がモーダルの上に残っていた**こと（札と「はい／いいえ」を覆っていた）。
//   ⇒ 1か所ずつ消して回るのではなく、**覆いが開いた時に必ず消す**形にする。
//     これから足すモーダルも自動で守られる。
//   ⚠ このファイルは**葉**（main.js を import できない）ので、向こうから登録してもらう。
//   ⚠ 暗くしない覆い（管理者モード等の常駐パネル）では呼ばない——あれは盤面を
//     覆わないので、拡大を消す理由が無い。
const 覆いが開いた時 = [];
export function onBlockingBackdropOpen(fn) {
  if (typeof fn === "function") 覆いが開いた時.push(fn);
}
export function createBackdrop(onClose, { dim = false, zIndex = 2000, blocksGame = true } = {}) {
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `position: fixed; inset: 0; z-index: ${zIndex};${dim ? " background: rgba(0, 0, 0, 0.6);" : ""}`;
  // #225: 暗くする背景（＝画面を覆って返事を待つモーダル）には目印を付ける。盤面のドラッグ判定
  // (main.jsのfindDraggableAt)は elementsFromPoint() で自前に当たり判定するため、そのままでは
  // **モーダルの背景を透かして**下の手札・駒を掴んでしまう（「奪ったカード」表示中に手札を
  // タップ→そのカードの手札効果が発動、等）。この目印があれば一律に無視できる。
  // dim:false（管理者モード・セットアップ等の常駐パネル）は盤面操作を妨げたくないので付けない。
  if (dim) backdrop.classList.add("so7-modal-backdrop");
  // 🔴【#784・続き812】覆いが画面をふさぐなら、拡大表示などを片付けてもらう。
  //   ⚠ 1つが転んでも残りを呼ぶ（モーダルが開かなくなる方がずっと悪い）。
  if (dim) for (const fn of 覆いが開いた時) { try { fn(); } catch { /* noop */ } }
  // 【続き455】上の目印（盤面のタップを透かさない）とは**別に**、「画面の中央がふさがっている
  // 間はゲームを進めない」（#266）という仕組みがある。ところがそちらは同じ目印を見ていたため、
  // **対局とは無関係のお知らせ**（初回の音量設定・デイリーボーナス等、アプリが勝手に出すもの）が
  // 開いているだけでフェイズが進まなくなっていた（オンラインの自動対戦で実際に停止を掴まえた）。
  // 対局の流れに属さないモーダルは blocksGame: false を渡すこと——タップの保護は今までどおり効き、
  // ゲームの進行だけ止めなくなる。
  if (dim && !blocksGame) backdrop.classList.add("so7-modal-nonblocking");
  backdrop.addEventListener("click", onClose);
  return backdrop;
}

// 🔴【続き903】拡大カードに付ける**虫眼鏡**（ユーザー案「到達効果や手札効果、状況効果など
//   発動した時画面の右に拡大カードが出るけど、そこに虫眼鏡マークをつけて、カード詳細を
//   確認できるようにするのはどう？」）。
//
// ⚠ **カードの詳細を出す関数は main.js に在る**（`showCardNoteModal`。用語のリンクと
//   下線の印まで通す richer な版で、対局中はこちらが正＝続き808 の覚え書き「統合するなら
//   main.js 側に寄せる」）。このファイルは**葉**なので向こうから登録してもらう
//   ——`onBlockingBackdropOpen` と同じ作法。
// ⚠ 登録が無ければボタンを**作らない**（押せない約束を残さない＝#729 の家族）。
let カードの詳細を開く = null;
export function registerCardDetailOpener(fn) {
  if (typeof fn === "function") カードの詳細を開く = fn;
}
export function canOpenCardDetail() {
  return typeof カードの詳細を開く === "function";
}
// cardId の詳細を開く小さなボタン。opts.前に … 開く直前に呼ぶ（自動で消えるのを止める等）。
// 🔴 **stopPropagation を必ず呼ぶ。** この手のモーダルは**どこを押しても閉じる**作りなので、
//   止めないと**押した瞬間に閉じて何も出ない**。
export function createCardDetailButton(cardId, opts = {}) {
  if (!cardId || !canOpenCardDetail()) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card-detail-zoom-btn";
  btn.textContent = t("ca.detail");
  btn.setAttribute("aria-label", t("ca.detailAria"));
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    try { opts.前?.(); } catch { /* noop */ }
    // ⚠ 拡大カードは z-index 10600〜10641 に居るので、詳細はその上に出す（overNotice）。
    try { カードの詳細を開く(cardId, { overNotice: true }); } catch { /* noop */ }
  });
  return btn;
}

// 対戦画面がライト配色か（theme-light=全体設定 or theme-light-ingame=盤面だけライト）。
export function isIngameLight() {
  return (
    document.body.classList.contains("theme-light") || document.body.classList.contains("theme-light-ingame")
  );
}

// 「中立ダークパネル」（ゲート侵攻結果・スタートプレイヤー決定・対戦完了パネル等、inline styleで
// ダーク色を直書きしているモーダル群）の配色を、ライト/ダークで出し分ける共通トークン。背景だけ
// 明るくすると内部の #e2e8f0 文字が見えなくなるため、コンテナ・本文・淡色・強調(金)・ボタンの色を
// まとめて返し、各モーダルが子要素の色まで一貫して切り替えられるようにする（#224で保留にしていた対応）。
export function neutralModalSkin() {
  return isIngameLight()
    ? {
        panel:
          "background: rgba(249, 250, 251, 0.99); border: 1px solid rgba(100, 116, 139, 0.45); color: #1e293b; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.28);",
        text: "#1e293b",
        muted: "#475569",
        gold: "#92660a",
        btn: "background: rgba(100, 116, 139, 0.2); color: #1e293b;",
      }
    : {
        panel:
          "background: rgba(15, 23, 32, 0.98); border: 1px solid rgba(148, 163, 184, 0.4); color: #e2e8f0; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);",
        text: "#e2e8f0",
        muted: "#94a3b8",
        gold: "#fbbf24",
        btn: "background: rgba(148, 163, 184, 0.25); color: #e2e8f0;",
      };
}

// 開いた直後の「指の下で押されてしまう」事故を防ぐ小さな門番（#230 / #236）。
//
// スマホでは、カードやマスをタップして指を離した位置に、その直後に作られたモーダルの
// ボタンがそのまま現れることがある。ブラウザは pointerup のあとに click を合成して
// 「その時点で指の下にある要素」へ送るため、**モーダルが一瞬も見えないまま1つ目の
// ボタンが押される**。実際 #230（なないろの欠片の選択肢が出ずに1ドローになる）と
// #236（「このマスでいいですか？」が二度と出なくなる＝「今後表示しない」が押されていた）が
// これで起きている。
//
// 使い方: モーダルを作る所で `const guard = createOpenGuard();` とし、各ボタンの先頭で
// `if (guard()) return;` と書く。既定の 400ms は対戦終了パネルの事故クリック対策（続き296）と
// 同じ考え方の値。
export function createOpenGuard(ms = 400) {
  const openedAt = performance.now();
  return () => performance.now() - openedAt < ms;
}

// 🔴【続き732】ゲーム内通貨「セヴル」のアイコン。
//   ユーザー指摘「通貨には通貨アイコンがあります。すでにオプションエリアの所持金の
//   ところに用いられています。そちらを適用してください。」
//   ⇒ currency-display.js が使っている**本物のアイコン**をここに1つだけ置いて、
//     使う側はこれを呼ぶ（2か所に書くとズレる）。絵文字 🪙 は使わない。
export const CURRENCY_ICON = "assets/icons/currency.png";

// 文の中の `{icon}` を通貨アイコンの絵に差し替えて、要素に入れる。
// ⚠ 文字列のままでは画像を入れられないので、**文を分けて組み立てる**。
//   `{icon}` が無い文でも、そのまま文字として入るだけなので安全。
export function setTextWithCoin(el, 文) {
  el.textContent = "";
  const 断片 = String(文 == null ? "" : 文).split("{icon}");
  断片.forEach((t, i) => {
    if (i > 0) {
      const img = document.createElement("img");
      img.className = "so7-coin-icon";
      img.src = CURRENCY_ICON;
      img.alt = "";
      el.appendChild(img);
    }
    if (t) el.appendChild(document.createTextNode(t));
  });
  return el;
}

// 🔴【#692・続き740】ユーザー要望「『パックを持っていません』とかはモーダルでした方が
//   よくないですか？」。画面のすみに1行で出すと**気づかれない**（#729 で「押しても何も
//   起きない」と言われたのも、理由が出ていなかったのが半分だった）。
//
// ⚠ id が `-modal` で終わる＝新しい見た目（?ui=v2）の装丁が**自動で当たる**（続き707）。
// ⚠ 地と文字色は決め打ちしない（明暗2テーマ＝教訓15）。既存のモーダルの地を使う。
// ⚠ 出口は3つ（✕・覆いを押す・OKボタン）。
export function showNoticeModal(文, { 見出し = null, onClose = null } = {}) {
  const 既に = document.getElementById("so7-notice-modal");
  if (既に) 既に.remove();
  const modal = document.createElement("div");
  modal.id = "so7-notice-modal";
  const close = () => {
    modal.remove();
    backdrop.remove();
    onClose?.();
  };
  // 🔴【続き741】`dim: true` が要る。既定（dim:false）だと覆いが**透明なだけでなく
  //   `so7-modal-backdrop` の目印も付かない**ので、盤面の自前の当たり判定
  //   （elementsFromPoint＝教訓4）が**覆いを透かして下の手札・駒を掴む**（#225 の実害）。
  //   ⚠ `blocksGame: false`——これは対局の流れに属さないお知らせなので、
  //     開いているだけでフェイズが止まってはいけない（続き455 の実害）。
  const backdrop = createBackdrop(close, { zIndex: 100200, dim: true, blocksGame: false });
  modal.style.zIndex = "100201";
  modal.appendChild(createModalCloseX(close));
  if (見出し) {
    const h = document.createElement("div");
    h.className = "so7-notice-modal-title";
    h.textContent = 見出し;
    modal.appendChild(h);
  }
  const body = document.createElement("div");
  body.className = "so7-notice-modal-body";
  setTextWithCoin(body, 文);
  modal.appendChild(body);
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "so7-notice-modal-ok";
  ok.textContent = t("common.ok");
  ok.addEventListener("click", close);
  modal.appendChild(ok);
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  // ⚠ キーボードでも閉じられるように（Esc）。1回きりで自分を外す。
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    window.removeEventListener("keydown", onKey, true);
    close();
  };
  window.addEventListener("keydown", onKey, true);
  setTimeout(() => ok.focus?.(), 0);
  return close;
}

// 【続き741】「本当にやめていいですか？」の2択。showNoticeModal の兄弟で、**同じ見た目**を使う
//   （id が `-modal` で終わるので v2 の装丁も自動で当たる）。
//   ⚠ ネイティブの `confirm()` は使わない——端末によっては出ない／見た目が別世界になるため。
//   ⚠ **既定は「やめない」**（覆いを押す・Esc・✕ はすべて false）＝危ない方を既定にしない。
//   ⚠ 盤面の確認モーダル（cell-confirm）の中からは呼ばない。あちらは自分の覆いを持っていて、
//     その上に重ねると「閉じ方が2つある」状態になる（あちらは2段押しで警告している）。
//   ⚠【#873・続き889】`覆いで閉じない: true` を渡すと、**外側を押しても閉じない**
//     （ボタンか ✕ を押すまで残る）。「これから始まる対局がどうなるか」を決める問いなど、
//     うっかり外を触って既定へ流れると困る所で使う。既定は今までどおり閉じる。
export function showConfirmModal(文, { 見出し = null, はい = null, いいえ = null, 覆いで閉じない = false } = {}) {
  const 既に = document.getElementById("so7-confirm-modal");
  if (既に) 既に.remove();
  return new Promise((resolve) => {
    let 済み = false;
    const modal = document.createElement("div");
    modal.id = "so7-confirm-modal";
    const finish = (v) => {
      if (済み) return;
      済み = true;
      window.removeEventListener("keydown", onKey, true);
      modal.remove();
      backdrop.remove();
      resolve(v);
    };
    // dim / blocksGame の理由は showNoticeModal と同じ（上のコメント）。
    const backdrop = createBackdrop(覆いで閉じない ? () => {} : () => finish(false), { zIndex: 100200, dim: true, blocksGame: false });
    modal.style.zIndex = "100201";
    modal.appendChild(createModalCloseX(() => finish(false)));
    if (見出し) {
      const h = document.createElement("div");
      h.className = "so7-notice-modal-title";
      h.textContent = 見出し;
      modal.appendChild(h);
    }
    const body = document.createElement("div");
    body.className = "so7-notice-modal-body";
    setTextWithCoin(body, 文);
    modal.appendChild(body);
    const row = document.createElement("div");
    row.className = "so7-confirm-modal-buttons";
    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "so7-confirm-modal-yes";
    yes.textContent = はい || t("common.yes");
    yes.addEventListener("click", () => finish(true));
    const no = document.createElement("button");
    no.type = "button";
    no.className = "so7-notice-modal-ok";
    no.textContent = いいえ || t("common.no");
    no.addEventListener("click", () => finish(false));
    // ⚠ 「やめる」を先に置く（押し間違えても危ない方へ行かない）。
    row.appendChild(no);
    row.appendChild(yes);
    modal.appendChild(row);
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey, true);
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    setTimeout(() => no.focus?.(), 0);
  });
}
