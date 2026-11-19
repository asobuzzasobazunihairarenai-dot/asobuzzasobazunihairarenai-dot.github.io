// 旧0th EDITION（白地に虹の輪の版・2026.04 第2版）のカード一覧。**道具側の正**。
//
// 🔴 正は **「カード（第２版　0th）（名前変えない）」**（433px角・2026.04）。
//   2024.04 の「カード0th」（650px角）は**1つ前の刷り**で、第2版の35枚目が
//   **変更メモそのもの**だった（2026-11-19 に実測）:
//     ・効果修正 … セレナーデ（Fカード）／ダッシュ／ちょっと待った
//     ・表現修正 … 誰かの好きな花／カラフルホール／なないろのあめ
//     ・発行日修正 … 2024.04 → 2026.04
//   絵は19種とも一致（差し替えは無い）ことを `scratchpad/_絵くらべ.mjs` で目視確認済み。
//   ⚠ 「表現修正」の3枚は、リメイク流の言い換え（〜選び、→〜選ぶ。 等）が**既にその直しと同じ**だったので
//     手を入れていない。効果が変わったのは**ダッシュとちょっと待った！の2枚だけ**（セレナーデはFカード＝対象外）。
// 🔴 ここは「絵を作る」「データを書く」「文を書く」の3つが同じ表を見るための1か所。
//   バラバラに持つと必ずズレる（tools/ex0-cards.mjs と同じ作り）。
//
// 【入れないもの】
//   ・エターナル7種／ファースト7種 … **リメイクのものをそのまま使う**（ユーザー判断 2026-11-19）。
//     印刷カードを読んだ限り、旧0thのE・Fは**リメイクと同じカード**（名前も能力名も同じ）で、
//     文が今風に書き直されているだけだった。だから作り直す意味が無い。
//   ・なないろの欠片（No.29） … リメイクの rainbow-shard と**一字一句同じ**になるので作らない。
//     山札に足すのは src/cards-data.js の 標準の山札() がやる（0th拡張・1st と同じ形）。
//
// 【枚数】7色は1色2種×7枚＝98、無色5種で7枚（白2+2・黒1+1+1）、＋虹7＝**112枚**。
//   リメイク・1st・0th拡張とぴったり同じ枚数になる。
//
// 【枠の決め方】🔴 **推測ではなく実測で決めた**（scratchpad/_枠くらべ.mjs）。
//   通常カードの枠は色ごとに「１」「２」（黒だけ「３」まで）在るが、
//   **違いがあるのは橙と紫だけ**で、「１」の右上に追色の印（7角形）が在る。
//   ほかの色（赤・黄・緑・青・桃・白・黒）は「１」「２」「３」が1ピクセルも違わない。
//   ⇒ 旧0thで追色を持つのは**フォース（橙）とちょっと待った！（紫）の2枚だけ**なので、
//     その2枚に「橙１」「紫１」、同じ色のもう1枚に「橙２」「紫２」を当てる。
//     残りは番号順に当てるだけ（どれを使っても同じ絵になる）。
//
// 【絵】各フォルダの**直下にある1枚**がそのカードのイラスト（BN/ の中は没案）。
//   横長なので tools/squarify-illust.mjs で正方形に整えてから合成する。
//   ⚠ **フォルダ名と印字が違うものが2つある**（素材は古い作業名のまま）:
//     「雷」→ 印字は **神鳴 -カミナリ-** ／「公共工事」→ 印字は **民の道の建設**。
//     ⇒ アプリが出す名前は**印字の方**を使う（ユーザー確認済み 2026-11-19）。
//   ⓘ フォルダ「産まれたての悠登」は**なないろの欠片**の絵。使い回すので作らない。

export const OLD0TH_SRC_ROOT = "J:/自作カードゲーム/7 seven/画像集/0th EDITION";

// no … 印刷カードのファイル番号（カード0th の -NN）
export const OLD0TH_CARDS = [
  { no: "15", id: "0th-red-dash",             name: "ダッシュ",                  color: "red",    frame: "通常カード_表_赤１", count: 7, folder: "【s】ダッシュ" },
  { no: "22", id: "0th-red-counterattack",    name: "反撃",                      color: "red",    frame: "通常カード_表_赤２", count: 7, folder: "【s】反撃" },

  // 🔴 フォースだけ追色１を持つので「橙１」（右上に7角形の印が在る方）
  { no: "16", id: "0th-orange-force",         name: "フォース",                  color: "orange", frame: "通常カード_表_橙１", count: 7, folder: "【s】フォース" },
  { no: "23", id: "0th-orange-lost-item",     name: "誰かの落とし物",            color: "orange", frame: "通常カード_表_橙２", count: 7, folder: "【s】誰かの落とし物" },

  { no: "17", id: "0th-yellow-steal",         name: "盗賊の技 -スティール-",     color: "yellow", frame: "通常カード_表_黄１", count: 7, folder: "【s】盗賊の技" },
  // ⚠ 素材フォルダは「雷」。印字は「神鳴 -カミナリ-」
  { no: "24", id: "0th-yellow-thunder",       name: "神鳴 -カミナリ-",           color: "yellow", frame: "通常カード_表_黄２", count: 7, folder: "【s】雷" },

  // ⚠ 素材フォルダは「公共工事」。印字は「民の道の建設」
  { no: "18", id: "0th-green-peoples-road",   name: "民の道の建設",              color: "green",  frame: "通常カード_表_緑１", count: 7, folder: "【s】公共工事" },
  { no: "25", id: "0th-green-rich-whim",      name: "富裕層の気まぐれ",          color: "green",  frame: "通常カード_表_緑２", count: 7, folder: "【s】富裕層の気まぐれ" },

  { no: "19", id: "0th-blue-greedy-bridge",   name: "欲しがりの吊り橋",          color: "blue",   frame: "通常カード_表_青１", count: 7, folder: "【s】欲しがりの吊り橋" },
  { no: "26", id: "0th-blue-set-trap",        name: "仕掛けられた罠",            color: "blue",   frame: "通常カード_表_青２", count: 7, folder: "【s】仕掛けられた罠" },

  { no: "20", id: "0th-pink-disclosure",      name: "情報開示",                  color: "pink",   frame: "通常カード_表_桃１", count: 7, folder: "【s】情報開示" },
  { no: "27", id: "0th-pink-favorite-flower", name: "誰かの好きな花",            color: "pink",   frame: "通常カード_表_桃２", count: 7, folder: "【s】誰かの好きな花" },

  // 🔴 ちょっと待った！だけ追色１を持つので「紫１」（右上に7角形の印が在る方）
  { no: "21", id: "0th-purple-wait",          name: "ちょっと待った！",          color: "purple", frame: "通常カード_表_紫１", count: 7, folder: "【s】ちょっと待った！" },
  { no: "28", id: "0th-purple-apocalypse",    name: "予言者の技 -アポカリプス-", color: "purple", frame: "通常カード_表_紫２", count: 7, folder: "【s】予言者の技" },

  // 29 なないろの欠片 … リメイクの rainbow-shard と一字一句同じなので作らない（使い回す）

  { no: "30", id: "0th-white-colorful-hole",  name: "カラフルホール",            color: "white",  frame: "通常カード_表_白１", count: 2, folder: "【s】カラフルホール" },
  { no: "31", id: "0th-white-rainbow-rain",   name: "なないろのあめ",            color: "white",  frame: "通常カード_表_白２", count: 2, folder: "【s】なないろのあめ" },

  { no: "32", id: "0th-black-faded-frog",     name: "いろ落ちガエル",            color: "black",  frame: "通常カード_表_黒１", count: 1, folder: "【s】いろ落ちガエル" },
  { no: "33", id: "0th-black-greedy-palette", name: "強欲なパレット",            color: "black",  frame: "通常カード_表_黒２", count: 1, folder: "【s】強欲なパレット" },
  { no: "34", id: "0th-black-rainbow-curse",  name: "にじいろの呪い",            color: "black",  frame: "通常カード_表_黒３", count: 1, folder: "【s】にじいろの呪い" },
];

// クレジット行（元のカードに印刷されているもの）
export const OLD0TH_CREDITS = { illustrator: "YGM", date: "2026.04", edition: "S" };

// 英語のカード名。リメイクの card-text.en.js の付け方（Jump Pad / Counter Lock / Mass Change …）に合わせた。
// ⚠ 効果文の英訳はまだ。空にしておくと card-text.js が日本語のまま出す（部分翻訳を許す設計）。
export const OLD0TH_NAME_EN = {
  "0th-red-dash": "Dash",
  "0th-red-counterattack": "Counterattack",
  "0th-orange-force": "Force",
  "0th-orange-lost-item": "Someone's Lost Property",
  "0th-yellow-steal": "Thief's Art -Steal-",
  "0th-yellow-thunder": "Thunder -Kaminari-",
  "0th-green-peoples-road": "Building the People's Road",
  "0th-green-rich-whim": "Whim of the Wealthy",
  "0th-blue-greedy-bridge": "The Greedy Suspension Bridge",
  "0th-blue-set-trap": "The Set Trap",
  "0th-pink-disclosure": "Disclosure",
  "0th-pink-favorite-flower": "Someone's Favorite Flower",
  "0th-purple-wait": "Hold On!",
  "0th-purple-apocalypse": "Prophet's Art -Apocalypse-",
  "0th-white-colorful-hole": "Colorful Hole",
  "0th-white-rainbow-rain": "Rainbow Rain",
  "0th-black-faded-frog": "The Faded Frog",
  "0th-black-greedy-palette": "The Greedy Palette",
  "0th-black-rainbow-curse": "Rainbow Curse",
};

// --- 自分で自分を確かめる（取り違え・数え違いを黙って通さない）-------------------
export function checkOld0thCards() {
  const 問題 = [];
  const ids = new Set();
  const 枠 = new Set();
  // 追色を持つカード（＝右上に7角形の印のある枠を使ってよい唯一の2枚）
  const 追色あり = new Set(["0th-orange-force", "0th-purple-wait"]);
  for (const c of OLD0TH_CARDS) {
    if (ids.has(c.id)) 問題.push("id が重なっている: " + c.id);
    ids.add(c.id);
    if (!/^0th-[a-z-]+$/.test(c.id)) 問題.push("id の形がおかしい: " + c.id);
    if (枠.has(c.frame)) 問題.push("枠が重なっている: " + c.frame + "（" + c.id + "）");
    枠.add(c.frame);
    if (!c.folder || !c.name) 問題.push("folder か name が空: " + c.id);
    if (!OLD0TH_NAME_EN[c.id]) 問題.push("英語名が無い: " + c.id);
    // 🔴 印のある枠（橙１／紫１）は、追色を持つ2枚だけが使ってよい
    const 印のある枠 = /橙１|紫１/.test(c.frame);
    if (印のある枠 !== 追色あり.has(c.id)) {
      問題.push((印のある枠 ? "追色が無いのに印のある枠: " : "追色があるのに印の無い枠: ") + c.id + " / " + c.frame);
    }
  }
  // 🔴 発行日は第2版（2026.04）。古い刷り（2024.04）へ戻すと、カードの絵に焼き込む日付が食い違う。
  if (OLD0TH_CREDITS.date !== "2026.04") 問題.push("発行日が 2026.04 でない: " + OLD0TH_CREDITS.date);
  if (OLD0TH_CARDS.length !== 19) 問題.push("カードが 19 種でない: " + OLD0TH_CARDS.length + " 種");
  const 色枚 = {};
  for (const c of OLD0TH_CARDS) 色枚[c.color] = (色枚[c.color] || 0) + c.count;
  for (const col of ["red", "orange", "yellow", "green", "blue", "pink", "purple"]) {
    if (色枚[col] !== 14) 問題.push(col + " が 14 枚でない: " + 色枚[col] + " 枚");
  }
  if ((色枚.white || 0) + (色枚.black || 0) !== 7) 問題.push("白黒の合計が 7 枚でない: " + ((色枚.white || 0) + (色枚.black || 0)) + " 枚");
  const 合計 = Object.values(色枚).reduce((a, b) => a + b, 0) + 7; // +7 は虹（なないろの欠片）
  if (合計 !== 112) 問題.push("山札の合計が 112 枚でない: " + 合計 + " 枚");
  return { 問題, 色枚, 合計 };
}
