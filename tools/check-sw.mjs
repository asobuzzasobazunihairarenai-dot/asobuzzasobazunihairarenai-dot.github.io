// キャッシュ（sw.js）の持ち物検査。続き625。
//
// 🔴 なぜ機械で見るか: ここを間違えると「**新しい版が永久に届かない端末**」ができる。
// しかも**自分の端末では気づけない**（私はいつも最新を持っているので）。見るのは2つ:
//
//   ① 入れ物の名前が sw.js と src/sw-cache.js で同じか
//      ズレると「捨てるつもりの入れ物」と「溜めている入れ物」が別物になり、
//      新しい版を見つけても古いものを配り続ける。
//   ② sw.js が version.json を除外しているか
//      あれは更新検知の唯一の真実。キャッシュすると「ずっと同じ版」に見えて、
//      更新の仕組みそのものが止まる。
//
// 🔴 **「0件＝合格」と「探し方が空振り」を区別する。** 取り出せなかったら合格ではなく
// 終了コード2（検査そのものの失敗）にする（続き593・619 と同じ作法）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🔴 今いるフォルダ（cwd）に頼らない。リポジトリ直下からでも tools/ からでも同じ結果にする
// （続き619 で実際に落ちた）。
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW = path.join(ROOT, "sw.js");
const MOD = path.join(ROOT, "src", "sw-cache.js");

const problems = [];
const fail = (msg) => {
  console.error("🔴 検査そのものが失敗:", msg);
  process.exit(2);
};

for (const f of [SW, MOD]) {
  if (!fs.existsSync(f)) fail(`${path.relative(ROOT, f)} が無い`);
}
const sw = fs.readFileSync(SW, "utf8");
const mod = fs.readFileSync(MOD, "utf8");

// ① 入れ物の名前
const pick = (src, label) => {
  const m = src.match(/RUNTIME_CACHE\s*=\s*"([^"]+)"/);
  if (!m) fail(`${label} から RUNTIME_CACHE の値を取り出せなかった（書き方が変わった？）`);
  return m[1];
};
const nameSw = pick(sw, "sw.js");
const nameMod = pick(mod, "src/sw-cache.js");
if (nameSw !== nameMod) {
  problems.push(
    `入れ物の名前が食い違っている: sw.js は "${nameSw}"、src/sw-cache.js は "${nameMod}"。` +
      `同じ値にすること（ズレると新しい版が永久に届かない端末ができる）`
  );
}

// ② version.json の除外
if (!/version\.json/.test(sw)) {
  problems.push(
    "sw.js が version.json に触れていない。あれは更新検知の唯一の真実なので、" +
      "キャッシュから除外する行が必ず要る（無いと更新の仕組みが止まる）"
  );
}

// ③ ページそのものへの移動を横取りしていないか（今より遅くしない・版の食い違いを作らないため）
if (!/req\.mode\s*===\s*"navigate"/.test(sw)) {
  problems.push(
    "sw.js に「ページそのものへの移動は横取りしない」判定が無い。" +
      "横取りすると『新しい index.html と古い JS』の組み合わせや、10分以内の開き直しが今より遅くなる"
  );
}

// ④ 版の刻印（溜めた時の版を覚えて、変わっていたら捨てる）が在るか
// 🔴 これが無いと「描き直した絵が永久に古いまま」になる（続き625 で実測した穴）。
if (!/APP_VERSION/.test(mod) || !/caches\.delete/.test(mod)) {
  problems.push(
    "src/sw-cache.js に版の刻印の仕組み（APP_VERSION と caches.delete）が無い。" +
      "コードは溜めないので『版が古い』判定は成立しない＝自分で覚えておかないと、" +
      "差し替えた絵が永久に古いままになる"
  );
}

if (problems.length === 0) {
  console.log(`✅ 問題なし（キャッシュの名前 "${nameSw}" が2か所で一致・version.json は除外・移動は横取りしない）`);
  process.exit(0);
}
for (const p of problems) console.error("🔴 " + p);
process.exit(1);
