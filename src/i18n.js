// アプリの表示言語（多言語化の土台）。まずはカードのテキスト表示（タイトル・効果・フレーバー）に使う。
// 既定は日本語(ja)。依存ゼロの葉モジュール（他を import しない）。
//
// 現状のスコープ: 翻訳済みなのは「カードのテキスト」だけ（card-text.ja/en.js）。メニュー等のUIは
// まだ日本語のまま（英語UIは今後）。言語セレクタ（options-menuの基本設定）で ja/en を切り替えると、
// この設定が保存(localStorage)され、カード面がその言語で再描画される。
// - `?lang=en` はURLパラメータでの一時上書き（保存しない）。
// - カード面エディタの言語切替は「プレビュー専用の一時オーバーライド」(setPreviewLang/
//   clearPreviewLang)を使う＝保存もゲームへの反映もしない（エディタで英語を見てもゲームは変わらない）。
const KEY = "so7-lang";
export const SUPPORTED_LANGS = ["ja", "en"];
export const DEFAULT_LANG = "ja";
export const LANG_LABEL = { ja: "日本語", en: "English" };

let current = null;
let previewOverride = null; // カード面エディタのプレビュー用（非保存・ゲームへ影響しない）

function load() {
  // ?lang=en のようなURLパラメータでの上書き（この読み込み限り・保存しない）。
  try {
    const p = new URLSearchParams(location.search).get("lang");
    if (p && SUPPORTED_LANGS.includes(p)) return p;
  } catch {}
  // 保存済みの言語設定（言語セレクタで選んだ値）。エディタは setPreviewLang（非保存）を使うので、
  // この KEY に書くのは setLang（＝本物の言語セレクタ）だけ＝エディタのプレビューが漏れる心配は無い。
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {}
  return DEFAULT_LANG;
}

export function getLang() {
  if (previewOverride) return previewOverride;
  if (current == null) {
    current = load();
    try { document.documentElement.setAttribute("lang", current); } catch {}
  }
  return current;
}

const listeners = new Set();
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// 将来のアプリ内言語セレクタ用（保存する）。今はどこからも呼ばれない
// （エディタは setPreviewLang を使う）。将来 load() で保存値を読み戻す実装とセットで有効化する。
export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === getLang()) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch {}
  try { document.documentElement.setAttribute("lang", lang); } catch {}
  for (const fn of listeners) { try { fn(lang); } catch {} }
}

// 【#390・2026-10-11】**「切り替えています」の案内を出しながら言語を変える入口。**
// ユーザー要望「オープニングで左上の言語切り替えボタンを押した後、反映されるまでが長い。
// 押した後すぐに切り替えています的なモーダルが出ると嬉しい」。
//
// 実測（スマホ相当・オープニング画面）: **1回目の切り替えは同期処理だけで1085ms**
// （描画込み1293ms）。2回目以降は180〜200ms。1回目が重いのは、英語のカード文など
// 初回だけの作り込みが走るため。実機ではさらに掛かる。
//
// **ここが肝: `setLang` は同期で、その間ブラウザは1フレームも描けない。**
// だから案内を足すだけでは**出ないまま終わる**。案内を置いたあとに**わざと1フレーム
// 描かせてから**切り替えを始める（下の rAF 2回）。これをしないと「出たつもり」になる。
//
// 文言は日英を併記する——切り替えの途中なので「どちらの言語で出すか」を決める意味が無い。
// 取り残さない保険: `finally` で必ず消し、さらに8秒の強制撤去も付ける。
export async function setLangWithNotice(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === getLang()) return;
  let el = null;
  let kill = null;
  try {
    el = document.createElement("div");
    el.id = "lang-switching";
    el.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 2147482000",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "flex-direction: column",
      "gap: 0.5rem",
      "background: rgba(0, 0, 0, 0.82)",
      "color: #e8edf5",
      "font-family: sans-serif",
      "text-align: center",
      "padding: 1rem",
    ].join(";");
    const ja = document.createElement("div");
    ja.style.cssText = "font-size: 1rem; font-weight: 700; letter-spacing: 0.06em";
    ja.textContent = "言語を切り替えています…";
    const en = document.createElement("div");
    en.style.cssText = "font-size: 0.82rem; opacity: 0.75";
    en.textContent = "Switching language…";
    el.append(ja, en);
    document.body.appendChild(el);
    // 万一 finally を通らなくても画面を塞がない（保険）。
    kill = setTimeout(() => { try { el.remove(); } catch (e) {} }, 8000);
    // **案内を実際に描かせる**。これを挟まないと、この下の同期処理の間ずっと
    // 画面は前のままで、案内は一度も見えない。
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    setLang(lang);
    // 切り替え後の絵が出るまで待ってから消す（先に消すと「一瞬光って終わり」に見える）。
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  } catch (e) {
    // 案内が出せなくても言語の切り替えだけは行う。
    try { setLang(lang); } catch (e2) {}
  } finally {
    if (kill) clearTimeout(kill);
    try { if (el) el.remove(); } catch (e) {}
  }
}

// カード面エディタのプレビュー用の一時オーバーライド（保存しない・ゲームの言語は変えない）。
export function setPreviewLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  previewOverride = lang;
  for (const fn of listeners) { try { fn(getLang()); } catch {} }
}
export function clearPreviewLang() {
  previewOverride = null;
  for (const fn of listeners) { try { fn(getLang()); } catch {} }
}
