// 0th拡張（0th EDITION 拡張）のカード一覧。**道具側の正**。
//
// 🔴 ここは「絵を作る」「データを書く」「文を書く」の3つが同じ表を見るための1か所。
//   バラバラに持つと必ずズレる（続き640・627 で既定値が2か所に割れて実害が出ている）。
//
// 【枚数の決め方】ユーザー指示「1色14枚になるようになるべく均等に混ぜる。
//   ONLYカードは1枚ずつしか入れられない」から計算した:
//     7色 … ONLY 1枚 ＋ 色寄せの笛 4枚 ＋ 残り2種が 5枚と4枚（**カード番号の若い方を5枚**）
//     白  … ピュアバーガー2・誰かの白きカゲ1・我忘れの白き龍1 ＝ 4枚
//     黒  … バッドバーガー2・ヴド族との契約1 ＝ 3枚
//     虹  … なないろの欠片7枚（**リメイクのものと一字一句同じなので使い回す**。ここには載せない）
//   合計 98＋4＋3＋7＝**112枚**で、リメイクとぴったり同じ枚数になる。
//   ⚠ 「残り2種のどちらを5枚にするか」だけは私の判断。数字1つで変えられる。
//
// 【枠の決め方】ユーザー指示「右上の7角形がないもので統一」。
//   焼き出した飾りを1点ずつ突き合わせた結果、**印が在るのは「橙１」と「紫１」だけ**で、
//   ほかの色は「１」と「２」が1ピクセルも違わなかった（右上 44x43px の形）。
//   ⇒ **橙と紫は「２」、残りは「１」**。
//
// 【絵】各フォルダの**直下にある1枚**がそのカードのイラスト（BN/ の中は没案）。
//   横長なので tools/squarify-illust.mjs で正方形に整えてから合成する。

export const EX0_SRC_ROOT = "J:/自作カードゲーム/7 seven/画像集/0th EDITION 拡張";

// no … 元のカードに振られている番号（ART は番号なしの1枚）
// only … 1枚しか入れられないカード
export const EX0_CARDS = [
  { no: "02", id: "ex0-orange-bus",         name: "オレンジバス",                       color: "orange", frame: "通常カード_表_橙２", count: 5, folder: "【s1】橙　オレンジバス" },
  { no: "03", id: "ex0-yellow-reach-cancel", name: "リーチキャンセル",                   color: "yellow", frame: "通常カード_表_黄１", count: 5, folder: "【s1】黄　リーチキャンセル" },
  { no: "04", id: "ex0-green-lost-forest",  name: "迷いの森",                           color: "green",  frame: "通常カード_表_緑１", count: 5, folder: "【s1】緑　迷いの森" },
  // ⚠ 05 と 07 は**効果を変えたので名前も変えた**（ユーザー判断）。印字は「鑑定士の技 -ブルーアイズ-」
  //   「隠し財産」のままなので、素材フォルダ名は印字どおり。アプリが出す名前は新しい方を使う
  //   （カードの絵は文字の入っていない版なので、絵と名前が食い違うことはない）。
  { no: "05", id: "ex0-blue-appraiser",     name: "鑑定士の技 -トゥルーアイズ-",         color: "blue",   frame: "通常カード_表_青１", count: 5, folder: "【s1】青　鑑定士の技 -ブルーアイズ-" },
  { no: "06", id: "ex0-pink-wish-for-peace", name: "平和への願い",                       color: "pink",   frame: "通常カード_表_桃１", count: 5, folder: "【s1】桃　平和への願い" },
  { no: "07", id: "ex0-purple-hidden-fortune", name: "足下の隠し財産",                  color: "purple", frame: "通常カード_表_紫２", count: 5, folder: "【s1】紫　隠し財産" },
  { no: "08", id: "ex0-red-beginning",      name: "赤のはじまり",                       color: "red",    frame: "通常カード_表_赤１", count: 5, folder: "【s1】赤　赤のはじまり" },
  { no: "09", id: "ex0-orange-bus-stop",    name: "バスストップ",                       color: "orange", frame: "通常カード_表_橙２", count: 4, folder: "【s1】橙　バスストップ" },
  { no: "10", id: "ex0-yellow-gate-charge", name: "ゲートチャージ",                     color: "yellow", frame: "通常カード_表_黄１", count: 4, folder: "【s1】黄　ゲートチャージ" },
  { no: "11", id: "ex0-green-creation",     name: "大地創造",                           color: "green",  frame: "通常カード_表_緑１", count: 4, folder: "【s1】緑　大地創造" },
  { no: "12", id: "ex0-blue-strict-watch",  name: "厳重警戒",                           color: "blue",   frame: "通常カード_表_青１", count: 4, folder: "【s1】青　厳重警戒" },
  { no: "13", id: "ex0-pink-mystic-fruit",  name: "不思議な果実",                       color: "pink",   frame: "通常カード_表_桃１", count: 4, folder: "【s1】桃　不思議な果実" },
  { no: "14", id: "ex0-purple-redo-key",    name: "やり直しのカギ",                     color: "purple", frame: "通常カード_表_紫２", count: 4, folder: "【s1】紫　やり直しのカギ" },

  // 15〜21 色寄せの笛（7色ぶん。**絵は1枚を共用**し、枠の色だけ変える）
  { no: "15", id: "ex0-flute-red",    name: "色寄せの笛", color: "red",    frame: "通常カード_表_赤１", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "16", id: "ex0-flute-orange", name: "色寄せの笛", color: "orange", frame: "通常カード_表_橙２", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "17", id: "ex0-flute-yellow", name: "色寄せの笛", color: "yellow", frame: "通常カード_表_黄１", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "18", id: "ex0-flute-green",  name: "色寄せの笛", color: "green",  frame: "通常カード_表_緑１", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "19", id: "ex0-flute-blue",   name: "色寄せの笛", color: "blue",   frame: "通常カード_表_青１", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "20", id: "ex0-flute-pink",   name: "色寄せの笛", color: "pink",   frame: "通常カード_表_桃１", count: 4, folder: "【s1】全色　色寄せの笛" },
  { no: "21", id: "ex0-flute-purple", name: "色寄せの笛", color: "purple", frame: "通常カード_表_紫２", count: 4, folder: "【s1】全色　色寄せの笛" },

  // 22〜28 各色のONLYカード（1枚ずつ）
  { no: "22", id: "ex0-red-joyner",        name: "走り人　ジョイナーの走術",             color: "red",    frame: "通常カード_表_赤１", count: 1, only: true, folder: "【s1】赤　走り人　ジョイナーの走術" },
  { no: "23", id: "ex0-orange-mccool",     name: "異能者　マックールのネオ・フォース",   color: "orange", frame: "通常カード_表_橙２", count: 1, only: true, folder: "【s1】橙　異能者　マックールのネオ・フォース" },
  { no: "24", id: "ex0-yellow-little-mouse", name: "大盗賊　リトルマウスの手癖",         color: "yellow", frame: "通常カード_表_黄１", count: 1, only: true, folder: "【s1】黄　大盗賊　リトルマウスの手癖" },
  { no: "25", id: "ex0-green-peterhood",   name: "森の民　ピーターフッドの日常",         color: "green",  frame: "通常カード_表_緑１", count: 1, only: true, folder: "【s1】緑　森の民　ピーターフッドの日常" },
  { no: "26", id: "ex0-blue-jake",         name: "歴史家　ジェイクの記憶術",             color: "blue",   frame: "通常カード_表_青１", count: 1, only: true, folder: "【s1】青　歴史家　ジェイクの記憶術" },
  { no: "27", id: "ex0-pink-yaeza",        name: "魅惑のヤエザ",                         color: "pink",   frame: "通常カード_表_桃１", count: 1, only: true, folder: "【s1】桃　魅惑のヤエザ" },
  { no: "28", id: "ex0-purple-vivian",     name: "後援するヴィヴィアン",                 color: "purple", frame: "通常カード_表_紫２", count: 1, only: true, folder: "【s1】紫　後援するヴィヴィアン" },

  // 29 なないろの欠片 … リメイクの rainbow-shard と一字一句同じなので作らない（使い回す）

  // 30〜34 無色
  { no: "30", id: "ex0-white-pure-burger",    name: "ピュアバーガー",     color: "white", frame: "通常カード_表_白１", count: 2, folder: "【s1】白　ピュアバーガー" },
  { no: "31", id: "ex0-white-someones-shadow", name: "誰かの白きカゲ",    color: "white", frame: "通常カード_表_白１", count: 1, only: true, folder: "【s1】白　誰かの白きカゲ" },
  { no: "32", id: "ex0-white-dragon",         name: "我忘れの白き龍",     color: "white", frame: "通常カード_表_白１", count: 1, only: true, folder: "【s1】白　我忘れの白き龍" },
  { no: "33", id: "ex0-black-bad-burger",     name: "バッドバーガー",     color: "black", frame: "通常カード_表_黒１", count: 2, folder: "【s1】黒　バッドバーガー" },
  { no: "34", id: "ex0-black-vood-contract",  name: "ヴド族との契約",     color: "black", frame: "通常カード_表_黒１", count: 1, only: true, folder: "【s1】黒　ヴド族との契約" },

  // ART 紅の鉄拳（番号なし。赤の3枚目）
  { no: "ART", id: "ex0-red-crimson-fist", name: "紅の鉄拳", color: "red", frame: "通常カード_表_赤１", count: 4, folder: "【s1】赤　紅の鉄拳" },
];

// クレジット行（元のカードに印刷されているもの）
export const EX0_CREDITS = { illustrator: "YGM", date: "2024.11", edition: "S" };

// 英語のカード名。リメイクの card-text.en.js の付け方（Jump Pad / Counter Lock / Mass Change …）に合わせた。
// ⚠ 効果文の英訳はまだ。空にしておくと card-text.js が日本語のまま出す（部分翻訳を許す設計）。
export const EX0_NAME_EN = {
  "ex0-orange-bus": "Orange Bus",
  "ex0-yellow-reach-cancel": "Reach Cancel",
  "ex0-green-lost-forest": "Forest of Wandering",
  "ex0-blue-appraiser": "Appraiser's Skill -True Eyes-",
  "ex0-pink-wish-for-peace": "Wish for Peace",
  "ex0-purple-hidden-fortune": "Hidden Fortune Underfoot",
  "ex0-red-beginning": "The Beginning of Red",
  "ex0-orange-bus-stop": "Bus Stop",
  "ex0-yellow-gate-charge": "Gate Charge",
  "ex0-green-creation": "Creation of the Land",
  "ex0-blue-strict-watch": "High Alert",
  "ex0-pink-mystic-fruit": "Mysterious Fruit",
  "ex0-purple-redo-key": "Key of Redo",
  "ex0-flute-red": "Color-Calling Flute",
  "ex0-flute-orange": "Color-Calling Flute",
  "ex0-flute-yellow": "Color-Calling Flute",
  "ex0-flute-green": "Color-Calling Flute",
  "ex0-flute-blue": "Color-Calling Flute",
  "ex0-flute-pink": "Color-Calling Flute",
  "ex0-flute-purple": "Color-Calling Flute",
  "ex0-red-joyner": "Joyner the Runner -Dash Art-",
  "ex0-orange-mccool": "McCool the Esper -Neo Force-",
  "ex0-yellow-little-mouse": "Little Mouse the Thief -Sticky Fingers-",
  "ex0-green-peterhood": "Peterhood of the Forest -Daily Life-",
  "ex0-blue-jake": "Jake the Historian -Mnemonics-",
  "ex0-pink-yaeza": "Enchanting Yaeza",
  "ex0-purple-vivian": "Vivian the Patron",
  "ex0-white-pure-burger": "Pure Burger",
  "ex0-white-someones-shadow": "Someone's White Shadow",
  "ex0-white-dragon": "The Self-Forgetting White Dragon",
  "ex0-black-bad-burger": "Bad Burger",
  "ex0-black-vood-contract": "Pact with the Vood",
  "ex0-red-crimson-fist": "Crimson Iron Fist",
};

// --- 自分で自分を確かめる（取り違え・数え違いを黙って通さない）-------------------
export function checkEx0Cards() {
  const 問題 = [];
  const ids = new Set();
  for (const c of EX0_CARDS) {
    if (ids.has(c.id)) 問題.push("id が重なっている: " + c.id);
    ids.add(c.id);
    if (!/^ex0-[a-z-]+$/.test(c.id)) 問題.push("id の形がおかしい: " + c.id);
    if (c.only && c.count !== 1) 問題.push("ONLYなのに " + c.count + "枚: " + c.id);
    if (/橙１|紫１/.test(c.frame)) 問題.push("右上に印のある枠を使っている: " + c.id + " / " + c.frame);
  }
  if (EX0_CARDS.length !== 33) 問題.push("カードが 33 種でない: " + EX0_CARDS.length + " 種");
  // 色ごとの枚数
  const 色枚 = {};
  for (const c of EX0_CARDS) 色枚[c.color] = (色枚[c.color] || 0) + c.count;
  for (const col of ["red", "orange", "yellow", "green", "blue", "pink", "purple"]) {
    if (色枚[col] !== 14) 問題.push(col + " が 14 枚でない: " + 色枚[col] + " 枚");
  }
  if ((色枚.white || 0) + (色枚.black || 0) !== 7) 問題.push("白黒の合計が 7 枚でない: " + ((色枚.white || 0) + (色枚.black || 0)) + " 枚");
  const 合計 = Object.values(色枚).reduce((a, b) => a + b, 0) + 7; // +7 は虹（なないろの欠片）
  if (合計 !== 112) 問題.push("山札の合計が 112 枚でない: " + 合計 + " 枚");
  return { 問題, 色枚, 合計 };
}
