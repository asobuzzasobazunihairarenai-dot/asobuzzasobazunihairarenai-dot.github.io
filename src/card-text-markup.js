// カードの効果文の中の「下線」を扱う、ごく小さな仕組み。
//
// 🔴 なぜ要ったか（2026-11-19・続き762）:
//   印字のカードは「__下線部__の手順を繰り返す」のように**下線で範囲を示す**札がある
//   （予言者の技 -アポカリプス- ／ 0th拡張の鑑定士の技・歴史家 ジェイク）。
//   ところがアプリは効果文を `textContent` でそのまま入れていたので**下線が引けず**、
//   「ここまでを繰り返す」と言い換えるしかなかった。ユーザーから「下線を引く手段はない？」と
//   重ねて聞かれたので、引けるようにした。
//
// ⚠ **タグは1種も許さない。** 許すのは `__…__` という**印だけ**で、HTML としては解釈しない。
//   文のデータは人が書くもの（tools/*-text-source.json）なので、タグを通す作りにすると
//   よそから来た文字がそのまま効く形になりかねない。印1種なら、できるのは「下線を引く」だけ。
//
// ⚠ **解析はこのファイルに1つだけ置く。** 効果文を画面に出す所は2つある
//   （カードの面＝card-renderer.js ／ カードの補足の箱＝main.js）。2か所に書くと必ず食い違う。
//
// ⚠ 下線の印が無い文は**今までと1文字も変わらない**（runs が1つ返るだけ）。

const 印 = "__";

// 文を「下線あり／なし」の並びに分ける。印が無ければ 1 つだけ返る。
// 戻り: [{ text: "…", underline: false }, …]
export function splitUnderlineRuns(text) {
  const s = String(text ?? "");
  if (!s.includes(印)) return s ? [{ text: s, underline: false }] : [];
  const 出 = [];
  let 位 = 0;
  let 下線 = false;
  for (;;) {
    const 次 = s.indexOf(印, 位);
    if (次 < 0) break;
    if (次 > 位) 出.push({ text: s.slice(位, 次), underline: 下線 });
    位 = 次 + 印.length;
    下線 = !下線;
  }
  // ⚠ 印が奇数個だった時（閉じ忘れ）は、残りをそのまま出す＝文が欠けない方を選ぶ。
  if (位 < s.length) 出.push({ text: s.slice(位), underline: 下線 });
  return 出.filter((r) => r.text.length > 0);
}

// 印を取り除いた素の文。**文字列として比べる所・読み上げる所**で使う
// （印がそのまま画面に出るのがいちばん悪い）。
export function stripCardMarkup(text) {
  return String(text ?? "").split(印).join("");
}

// 下線を含む文かどうか（検査・実測用）。
export function hasUnderlineMarkup(text) {
  return String(text ?? "").includes(印);
}
