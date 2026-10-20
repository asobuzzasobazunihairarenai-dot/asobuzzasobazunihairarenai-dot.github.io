// 不具合報告をくれた人へ、アプリの中でお礼と結果を伝える（ユーザー要望 2026-10-20・続き602
// 「debug報告者に、内容が解決した際にそのことをアプリ内でお礼とともに通知してあげたい」）。
//
// 【出す条件】ログインしていて、自分の報告のうち **管理者が「直った内容」を書いたもの** が
// あり、まだ見ていない時。🔴 **「対処済み」になっただけでは出さない**——管理画面には
// 「すべて対処済みにする」という一括ボタンがあるので、対処済みを条件にすると**そのボタン
// 1回で全員に「直りました」という嘘が一斉に飛ぶ**（supabase_setup_so7.sql の設計の勘所②）。
//
// 【出す場所】ホーム画面を開いた時（home-screen.js から呼ぶ）。対局中には出さない——
// 盤面の最中に割り込むと手が止まるし、起動直後は案内モーダル・サウンド設定と重なる
// （同時に2枚出ると下のモーダルに触れない＝続き574 の教訓）。
//
// 【見たことの記録はDBに持つ】端末の localStorage ではなくサーバーに記録する。別の端末で
// 開いた時に二重に出ないため（iOS はホーム画面アプリと Safari で保管場所が別、という
// 続き596 の件もあるので、端末に覚えさせる方法は端から選ばない）。
//
// ⚠ **ログインせずに送られた報告には届かない**（誰の報告か分からないため）。仕組み上の限界。
import { fetchMyFixedBugReports, ackBugReports, getCachedUser } from "./online.js";
import { t } from "./ui-text.js";
import { getLang } from "./i18n.js";
import { getBugReportFixNote } from "./handled-bug-reports.js";

let checkedThisSession = false;

// ホーム画面を開くたびに呼ばれるが、実際に問い合わせるのは1セッションに1回だけ。
// 対局中に管理者が書いた分は次回の起動で見てもらう（そのために何度も聞きに行かない）。
export async function maybeShowBugReportThanks() {
  if (checkedThisSession) return;
  checkedThisSession = true;
  try {
    if (!getCachedUser()) return; // 未ログインには出しようがない
    const rows = await fetchMyFixedBugReports();
    if (!rows.length) return;
    // 【続き603】**何を見せるかはこちらで決める。** DBに書かれた文（管理画面の「📨 お礼を書く」）が
    // あればそれを優先し、無ければコード側（handled-bug-reports.js）の文を使う。
    // 🔴 **どちらにも無い報告は見せない**——ここが「すべて対処済みにする」ボタンで嘘の通知が
    // 一斉に飛ぶのを防いでいる唯一の砦なので、絶対に素通りさせない。
    const lang = getLang();
    const shown = [];
    for (const row of rows) {
      const fromDb = (row.fixed_note || "").trim();
      const note = fromDb || getBugReportFixNote(row.id, lang);
      if (!note) continue;
      shown.push({ ...row, note });
    }
    if (!shown.length) return;
    showThanksModal(shown);
  } catch (err) {
    // ここで失敗しても、ホーム画面の表示を止めたりはしない。
    console.warn("bug-report-thanks: 表示できませんでした", err?.message || err);
  }
}

function showThanksModal(rows) {
  if (document.getElementById("bug-thanks-modal")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "so7-modal-backdrop";
  backdrop.id = "bug-thanks-backdrop";
  backdrop.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100060;";

  const panel = document.createElement("div");
  panel.id = "bug-thanks-modal";

  const title = document.createElement("div");
  title.className = "bug-thanks-title";
  title.textContent = t("thanks.title");
  panel.appendChild(title);

  const lead = document.createElement("div");
  lead.className = "bug-thanks-lead";
  lead.textContent = rows.length > 1 ? t("thanks.leadMany", { n: rows.length }) : t("thanks.lead");
  panel.appendChild(lead);

  const list = document.createElement("div");
  list.className = "bug-thanks-list";
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "bug-thanks-item";
    const when = document.createElement("div");
    when.className = "bug-thanks-when";
    when.textContent = formatWhen(row.created_at);
    item.appendChild(when);
    // 本人が書いた文を引用する（どの報告の話か分かるように）。長い時は切る。
    const quote = document.createElement("div");
    quote.className = "bug-thanks-quote";
    const c = (row.comment || "").trim();
    quote.textContent = c.length > 120 ? c.slice(0, 120) + "…" : c;
    item.appendChild(quote);
    const fixed = document.createElement("div");
    fixed.className = "bug-thanks-fixed";
    fixed.textContent = row.note || row.fixed_note || "";
    item.appendChild(fixed);
    list.appendChild(item);
  }
  panel.appendChild(list);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "bug-thanks-close";
  close.textContent = t("thanks.close");
  // 🔴 「見た」の記録は**閉じた時に送る**。開いた瞬間に送ると、読む前に画面を閉じた人の分が
  //    消えてしまう（二度と出ない）。
  // 🔴 送るのは**実際に見せた分だけ**。文がまだ無くて見せなかった報告まで既読にすると、
  //    **あとから文を書いても二度と届かない**。
  close.addEventListener("click", () => {
    void ackBugReports(rows.map((r) => r.id));
    backdrop.remove();
    panel.remove();
  });
  panel.appendChild(close);

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
}

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "";
  }
}
