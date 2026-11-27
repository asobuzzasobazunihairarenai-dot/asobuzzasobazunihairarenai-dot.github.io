// 🔴【#844 #846・続き871】ゲーム内通貨「セヴル」のアイコンの総点検。
//
// ユーザー指摘（2026-11-27）:
//   「購入金額のとこの通貨のアイコンが違う！**金色で真ん中が四角くくり抜かれているのが
//     セヴルアイコン**です！総点検を！」
//   「セヴルアイコンの横に金額がいいかも!どう思う？総点検を！」
//
// ⚠ これは**2回目**の総点検（1回目は続き732）。あの時 `CURRENCY_ICON` を1か所に寄せたのに、
//   **絵文字で書いた所が5か所残っていた**（ショップの購入金額・もらうモーダル・
//   ログインボーナス・「セヴルについて」の見出し2つ・管理者の付与ボタン）。
//   ⇒ **人の目で数える約束では守れない**ので機械で見張る。
//
// 見るもの:
//   ① `src/` の中に**コインの絵文字**が残っていないか（文言・ボタン・モーダル）
//   ② アイコンの**パスを直書き**していないか（`CURRENCY_ICON` が唯一の持ち主）
//   ③ 絵の実体が在るか
//   ④ 金額を出す文が**アイコン → 金額**の並びか（#846）
import fs from "node:fs";
import path from "node:path";

const 根 = path.resolve(import.meta.dirname, "..");
const src = path.join(根, "src");
const コイン = String.fromCodePoint(0x1fa99); // 🪙
const 札束 = String.fromCodePoint(0x1f4b0); // 💰
const 宝石 = String.fromCodePoint(0x1f48e); // 💎

let NG = 0;
const 見る = (名, 条件, 添え) => {
  if (条件) console.log("  ✅ " + 名 + (添え ? "  " + 添え : ""));
  else { NG++; console.log("  🔴 NG " + 名 + (添え ? "  " + 添え : "")); }
};

console.log("── セヴルのアイコン（#844 #846・総点検）──");

// ① コインの絵文字が残っていないか
// ⚠ **説明や記録に出てくる分は数えない**——changelog.js と handled-bug-reports.js は
//   「絵文字をやめた」という経緯そのものを書いてある（消すと記録が壊れる）。
//   bug-payload.js も「ボタンは 🪙 だらけ」というコメントなので対象外。
const 対象外 = new Set(["changelog.js", "handled-bug-reports.js", "bug-payload.js", "ui-helpers.js", "currency-display.js"]);
const 絵文字たち = [コイン, 札束, 宝石];
const 残り = [];
for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".js"))) {
  if (対象外.has(f)) continue;
  const s = fs.readFileSync(path.join(src, f), "utf8");
  s.split("\n").forEach((行, i) => {
    // コメント行は数えない（経緯の説明に出てくる）
    const 素 = 行.trim();
    if (素.startsWith("//") || 素.startsWith("*") || 素.startsWith("/*")) return;
    for (const e of 絵文字たち) if (行.includes(e)) 残り.push(f + ":" + (i + 1) + "  " + 素.slice(0, 80));
  });
}
見る("🔴 コインの絵文字がコードに残っていない", 残り.length === 0, 残り.length ? "\n      " + 残り.join("\n      ") : "0 件");

// ② パスの直書き
const 直書き = [];
for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".js"))) {
  if (f === "ui-helpers.js") continue; // ここが唯一の持ち主
  const s = fs.readFileSync(path.join(src, f), "utf8");
  s.split("\n").forEach((行, i) => {
    const 素 = 行.trim();
    if (素.startsWith("//") || 素.startsWith("*")) return;
    if (行.includes("assets/icons/currency.png")) 直書き.push(f + ":" + (i + 1));
  });
}
見る("🔴 アイコンのパスを直書きしていない（CURRENCY_ICON が唯一の持ち主）", 直書き.length === 0,
  直書き.length ? 直書き.join(" / ") : "0 件");

// ③ 唯一の持ち主と、絵の実体
const helpers = fs.readFileSync(path.join(src, "ui-helpers.js"), "utf8");
const m = /export const CURRENCY_ICON = "([^"]+)"/.exec(helpers);
見る("CURRENCY_ICON が ui-helpers.js に在る", !!m, m ? m[1] : "見つからない");
if (m) 見る("その絵が本当に在る", fs.existsSync(path.join(根, m[1])), m[1]);
見る("文の中へ差し込む関数が在る（setTextWithCoin）", /export function setTextWithCoin/.test(helpers));

// ④ 金額の文が「アイコン → 金額」の並び（#846）
const uiText = fs.readFileSync(path.join(src, "ui-text.js"), "utf8");
for (const 鍵 of ["shop.buyPrice", "game.loginBonus.amount"]) {
  const re = new RegExp('"' + 鍵.replace(".", "\\.") + '":\\s*"([^"]*)"', "g");
  const 値 = [];
  let r;
  while ((r = re.exec(uiText))) 値.push(r[1]);
  見る("文言 " + 鍵 + " が ja/en そろっている", 値.length === 2, JSON.stringify(値));
  見る("  🔴 " + 鍵 + " は {icon} が金額より前（#846）",
    値.length > 0 && 値.every((v) => v.includes("{icon}") && v.indexOf("{icon}") < v.indexOf("{n}")),
    JSON.stringify(値));
}

// ⑤ 購入金額とログインボーナスが、ちゃんとその文を使っているか
const shop = fs.readFileSync(path.join(src, "shop.js"), "utf8");
見る("🔴 ショップの購入ボタンがアイコン入りの文を使っている",
  /setTextWithCoin\(buyBtn, t\("shop\.buyPrice"/.test(shop));
const main = fs.readFileSync(path.join(src, "main.js"), "utf8");
見る("🔴 ログインボーナスの金額がアイコン入りの文を使っている",
  /setTextWithCoin\(amountEl, t\("game\.loginBonus\.amount"/.test(main));

// ⑥ もらうモーダルのコインが img（絵文字の div ではない）
const award = fs.readFileSync(path.join(src, "currency-award-modal.js"), "utf8");
見る("🔴 お金をもらうモーダルのコインが絵（img）になっている",
  /coin = document\.createElement\("img"\)/.test(award) && /coin\.src = CURRENCY_ICON/.test(award));
const css = fs.readFileSync(path.join(src, "style.css"), "utf8");
const 節 = css.slice(css.indexOf(".currency-award-modal-coin {"), css.indexOf(".currency-award-modal-coin {") + 400);
見る("  その絵の大きさが width/height で決まっている（font-size では 0 になる）",
  /width:\s*[\d.]+rem/.test(節) && /height:\s*[\d.]+rem/.test(節));

console.log(NG === 0 ? "✅ 問題なし（セヴルのアイコンは1か所から出ていて、金額はアイコンの横）" : "🔴 " + NG + " 件");
process.exitCode = NG > 0 ? 1 : 0;
