// 新しい見た目（UI v2）の切り替え。
//
// 【2026-11-13・続き699】ユーザー判断「③でやってみよう！！」。
//   試作（Artifact の「ホーム画面 試作」）で詰めた見た目を、**本物のアプリの中で**試すための口。
//
// 🔴 なぜ「別ブランチ」ではなくこの形にしたか（ユーザーと合意した理由）:
//   見た目の改装が触るのは `src/style.css`（24,000行）で、**毎日入ってくる不具合の直しと
//   同じ場所**。ブランチを分けて長く置くと、合流の時にいちばん事故が起きる。
//   同じ本番に入れて**既定を今までの見た目**にしておけば、
//     ・不具合の直しは今までどおりそのまま公開できる（同じコードなので両方に効く）
//     ・実機で試すのは公開URLに ?ui=v2 を付けるだけ（外出先でも見られる）
//     ・切り戻しは body のクラス1つ
//   という3つが同時に成り立つ。
//
// 使い方:
//   https://seven.asobuzz.net/?ui=v2  … 新しい見た目にする（**端末に覚える**）
//   https://seven.asobuzz.net/?ui=0   … 今までの見た目に戻す（覚えた分も消す）
//   ⓘ 一度 ?ui=v2 で開けば、次からは普通に開いても新しい見た目のまま
//     （ホーム画面から開くアプリには ? が付けられないため）。
//
// ⚠ **端末ごとの設定**（localStorage）。アカウントには同期しない——
//   「この端末で試している」という性質のものなので、他の端末へ勝手に飛び火させない。
// ⚠ このファイルは**何も import しない葉**にしてある（続き573 の循環import/TDZ 対策）。
//   見た目の中身は src/ui-v2.css 側にあり、すべて `body.ui-v2` の下に書いてある＝
//   クラスが付かない限り1行も効かない。

const STORE_KEY = "so7-ui-v2";

let enabled = false;

function readWanted() {
  let fromUrl = null;
  try {
    const p = new URLSearchParams(location.search).get("ui");
    if (p === "v2" || p === "2" || p === "new") fromUrl = true;
    else if (p === "0" || p === "off" || p === "old" || p === "v1") fromUrl = false;
  } catch (err) {
    /* 住所が読めない端末でも落とさない */
  }
  if (fromUrl !== null) {
    try {
      if (fromUrl) localStorage.setItem(STORE_KEY, "1");
      else localStorage.removeItem(STORE_KEY);
    } catch (err) {
      /* 保存できなくても、その場の表示には効かせる */
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch (err) {
    return false;
  }
}

function apply() {
  try {
    document.body.classList.toggle("ui-v2", enabled);
  } catch (err) {
    /* body がまだ無い端末（起きないはずだが、見た目のために落とさない） */
  }
}

export function isUiV2() {
  return enabled;
}

// 設定画面などから切り替えたい時の口（いまは呼び出していない）。
// ⚠ 見た目の層は読み込み時に全部当たっているので、付け外しはクラス1つで即座に効く。
export function setUiV2(next) {
  enabled = !!next;
  try {
    if (enabled) localStorage.setItem(STORE_KEY, "1");
    else localStorage.removeItem(STORE_KEY);
  } catch (err) {
    /* 保存できなくてもその場では効かせる */
  }
  apply();
  return enabled;
}

// 読み込んだ時点で一度当てる（admin.js の applyThemeMode と同じ作法。
// type=module/defer なのでこの時点で body は在る）。
enabled = readWanted();
apply();
