// 🔴【#802・続き825】画面の上の「ログイン中」を押した時に出る、小さなアカウントの札。
//
// ユーザー要望「画面上部のログイン中を押すとアカウント切り替えなどできるといいかも！」。
// それまで、あの印は**オンラインの部屋のパネルを開くだけ**だった（部屋に居ない時でも）。
//
// ⚠ **部屋に入っている間は今までどおり**（部屋のパネルを開く）。アカウントの話は
//   対局の最中に出す物ではないし、切り替えると対局から抜けることになる。
// ⚠ ログアウトそのものは**人が押す**。こちらはパスワードも合言葉も一切さわらない
//   ——押したら signOut() を呼び、**読み込み直して**ログインの画面へ戻すだけ。
// ⚠ 部屋のパネルから「ログアウト」を撤去した過去の判断（online-ui.js のコメント）は
//   生きている。あそこは**部屋の話をする場所**なので置かない、という意味であって、
//   ここ（アカウントの札）はその例外ではなく、そもそも別の場所。
import { getCachedUser, getAccountDisplayLabel, signOut } from "./online.js";
import { createBackdrop, createModalCloseX, showConfirmModal } from "./ui-helpers.js";
import { t } from "./ui-text.js";

let 開いている = null;

export function closeAccountMenu() {
  開いている?.();
}

// onOpenRoom … 「オンラインの部屋」を押した時に呼ぶ（従来の動き。main.js が渡す）。
export function openAccountMenu({ onOpenRoom = null } = {}) {
  closeAccountMenu();
  const user = getCachedUser();
  if (!user) {
    // ログインしていない時はこの札を出さない（押す物が無い）。呼ぶ側の分岐の保険。
    onOpenRoom?.();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "account-menu-modal";
  const 閉じる = () => {
    if (開いている !== 閉じる) return;
    開いている = null;
    backdrop.remove();
    modal.remove();
  };
  // ⚠ `blocksGame: false`——これは対局の流れに属さない札なので、開いているだけで
  //   フェイズが止まってはいけない（続き455 の実害）。
  const backdrop = createBackdrop(閉じる, { dim: true, zIndex: 100200, blocksGame: false });
  modal.style.zIndex = "100201";
  開いている = 閉じる;

  modal.appendChild(createModalCloseX(閉じる));

  const 見出し = document.createElement("div");
  見出し.className = "account-menu-title";
  見出し.textContent = t("acct.title", { name: getAccountDisplayLabel(user) });
  modal.appendChild(見出し);

  const 並び = document.createElement("div");
  並び.className = "account-menu-buttons";

  if (onOpenRoom) {
    const 部屋 = document.createElement("button");
    部屋.type = "button";
    部屋.className = "account-menu-btn";
    部屋.textContent = t("acct.openRoom");
    部屋.addEventListener("click", () => {
      閉じる();
      onOpenRoom();
    });
    並び.appendChild(部屋);
  }

  const 切替 = document.createElement("button");
  切替.type = "button";
  切替.className = "account-menu-btn is-switch";
  切替.textContent = t("acct.switch");
  切替.addEventListener("click", () => {
    閉じる();
    // 🔴 **必ず確かめてから。** ログアウトは戻せない操作ではないが、
    //   押し間違えると入り直しが要る（人によっては Google の画面まで戻る）。
    showConfirmModal(t("acct.switchConfirm"), {
      見出し: t("acct.switch"),
      はい: async () => {
        try {
          await signOut();
        } catch {
          /* 失敗しても、読み込み直せばログインの画面には戻れる */
        }
        // 読み込み直す＝アプリの入口（ログインの画面）からやり直す。
        // ⚠ 画面の中だけで戻そうとすると、開きかけの札や購読が残る経路がある。
        try {
          window.location.reload();
        } catch {}
      },
    });
  });
  並び.appendChild(切替);

  modal.appendChild(並び);

  const 注 = document.createElement("div");
  注.className = "account-menu-note";
  注.textContent = t("acct.note");
  modal.appendChild(注);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  // ⚠ キーボードでも閉じられるように（Esc）。1回きりで自分を外す。
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    window.removeEventListener("keydown", onKey, true);
    閉じる();
  };
  window.addEventListener("keydown", onKey, true);
}
