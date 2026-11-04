// 【2026-11-04・#489】追色コストの候補が**1枚しか無い時**に、選ばせずに自動で払う設定。
//
// 🔴 **既定は「切」（1枚でも選ばせる）。** これは以前ユーザーから明示的に出た要望
// 「追色カードを手札から選択するステップを踏んでください」そのもので、
// card-effect-engine.js の該当箇所にもその経緯がコメントで残っている。
// ⇒ **既定を変えずに、入れたい人だけ入れられる形**にした（ユーザー判断「Cで行こう。
//    デフォは１枚でも選択する方式でいいです。」）。
//
// ⚠ 自動で払うのは「どれを払うか」の**選ぶ余地が無い時だけ**。
//    「払うかどうか」そのものは別の判断（効果を使うか決める段階）で既に済んでいるので、
//    ここで黙って払っても意思に反しない。候補が2枚以上ある時は今までどおり必ず聞く。

import { registerSyncedPref } from "./pref-registry.js";

const STORAGE_KEY = "so7-auto-pay-single-extra-color";

let enabled = false;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) enabled = saved === "1";
} catch (e) {
  /* localStorage が使えない環境では既定（切）のまま */
}

export function isAutoPaySingleExtraColorEnabled() {
  return enabled;
}

export function setAutoPaySingleExtraColorEnabled(v) {
  enabled = !!v;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch (e) {
    /* 保存できなくても、いま動いている間は反映される */
  }
}

// アカウントにも保存する（pref-registry.js 参照。extra_prefs の jsonb に入るので
// 🔴 **列は増えない＝SQLの実行は要らない**）。
registerSyncedPref("autoPaySingleExtraColor", isAutoPaySingleExtraColorEnabled, setAutoPaySingleExtraColorEnabled);
