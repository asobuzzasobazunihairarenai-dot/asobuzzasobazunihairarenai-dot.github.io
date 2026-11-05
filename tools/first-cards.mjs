// 1st EDITION のカード一覧。**道具側の正**。
//
// 🔴 ここは「絵を作る」「データを書く」「文を書く」の3つが同じ表を見るための1か所。
//   バラバラに持つと必ずズレる（続き640・627 で既定値が2か所に割れて実害が出ている）。
//   0th拡張の tools/ex0-cards.mjs と同じ作り。
//
// 【名前の出どころ】🔴 **印刷データ（カードの印字）が正**。
//   素材フォルダの名前は**旧称のまま**のものが多い（2026-11-05 に34枚を1枚ずつ目で読んで確かめた）:
//     Fカード「○の色石 ○○」→ 印字は **「○のジュエル ○○○」**
//     飛空艇ブランカ → **飛空艇アルヴァ** ／ 大富豪の力 → **大富豪の気紛れ**
//     革命 → **ドゥエンの革命** ／ 状況：財産の流出 → **デプレッション**
//     偉大なる号令 → **偉大なる大号令** ／ 賄賂 → **裏貴族の賄賂**
//   ⚠ 記憶 first-edition-rulebook-source にも「★最新リンクの説明書PNGはFカードが旧称」とある。
//      **説明書ではなくカードの入稿データを見ること。**
//
// 【枚数】記憶 first-edition-colorless-cards のとおり **20種・112枚**:
//   7色 × 2種 × 7枚 ＝ 98 ／ 虹 1種 7枚 ／ 白 3種 各1枚 ＝ 3 ／ 黒 2種 各2枚 ＝ 4
//   ⇒ リメイク（19種112枚）・0th拡張（34種112枚）とぴったり同じ枚数。
//
// 【枠】0th拡張と同じ決まり（ユーザー指示「右上の7角形がないもので統一」）。
//   印が在るのは「橙１」と「紫１」だけなので、**橙と紫は「２」、残りは「１」**。
//
// 【絵】各フォルダの直下の画像。**候補が2枚以上あるものは、印刷データと見比べて選んだ**
//   （pick に候補の番号を書く。名前順で0から数える）。26フォルダすべて一致を目視で確認済み。
//   ⚠ 「【H】大恐慌」は**どのカードにも対応しない**（没案と思われる。暗い都市に紫の雷）。
//   ⚠ 「なないろの欠片」は**フォルダが無い**。リメイクのものを使い回す（0th拡張と同じ）。

export const FIRST_ED_SRC_ROOT = "J:/自作カードゲーム/7 seven/画像集/1st EDITION";
// 印刷データ（完成カード34枚）。**名前の正**であり、Fカードの暫定絵の出どころでもある。
// ファイル名は no と対応する（no "01" だけ別名＝下の printedCardFile 参照）。
export const FIRST_ED_PRINTED_ROOT =
  "J:/自作カードゲーム/7 seven/印刷（名前変えない）/★最新リンク（名前変えない）/カード（1st）（名前変えない）";
export function printedCardFile(no) {
  const base = "カード【1st ORG】（名前変更不可）";
  return no === "01" ? base + "_アートボード 1.png" : base + "-" + no + ".png";
}

// kind … "normal"（山札に入る通常カード）／"eternal"（Eカード）／"first"（Fカード）
// count … 山札に入る枚数（eternal / first は各1枚で、山札ではなく専用の山に入る）
// pick … フォルダの中の候補が複数ある時に、どれを使うか（名前順で0から）
export const FIRST_ED_CARDS = [
  // ── Eカード（各色1種）。財力の数字が色ごとに 0〜6 で割り振られている ──
  { no: "01", id: "eternal-1st-red",    kind: "eternal", name: "走書の赤歴　ジョイナール",   color: "red",    frame: "エターナルカード_表_赤", count: 1, folder: "【H】Eカード　走書の赤歴　ジョイナール　　" },
  { no: "02", id: "eternal-1st-orange", kind: "eternal", name: "強欲の絵本　オレギャング",   color: "orange", frame: "エターナルカード_表_橙", count: 1, folder: "【H】Eカード　強欲の絵本　オレギャング　" },
  { no: "03", id: "eternal-1st-yellow", kind: "eternal", name: "黄王学の薦め　ネロイズム",   color: "yellow", frame: "エターナルカード_表_黄", count: 1, folder: "【H】Eカード　黄王学の薦め　ネロイズム" },
  { no: "04", id: "eternal-1st-green",  kind: "eternal", name: "新緑の史文　グリングリン",   color: "green",  frame: "エターナルカード_表_緑", count: 1, folder: "【H】Eカード　新緑の史文　グリングリン" },
  { no: "05", id: "eternal-1st-blue",   kind: "eternal", name: "古の蒼書　ティセリオス",     color: "blue",   frame: "エターナルカード_表_青", count: 1, folder: "【H】Eカード　古の蒼書　ティセリオス" },
  { no: "06", id: "eternal-1st-pink",   kind: "eternal", name: "古紙恋書　ラブック",         color: "pink",   frame: "エターナルカード_表_桃", count: 1, folder: "【H】Eカード　古紙恋書　ラブック", pick: 2 },
  { no: "07", id: "eternal-1st-purple", kind: "eternal", name: "混沌の論文　カオスペーパー", color: "purple", frame: "エターナルカード_表_紫", count: 1, folder: "【H】Eカード　混沌の論文　カオスペーパー" },

  // ── Fカード（各色1種）。🔴 **ユーザーから「ファーストカードについては別途相談したい」と
  //    指示があるので、イラストからの合成は作らない**（表にだけ残して、名前と文を確定させておく）。
  //    ⚠ 候補が2〜4枚あり、どれが印刷に使われたかは**まだ見比べていない**（pick 未定）。
  //
  //    🔴 **ただし絵が1枚も無いと図鑑も手札も空になる**ので、ユーザー判断
  //    （2026-11-05「とりあえず暫定で、旧デザインのカードを当てておくとかできる？」）で
  //    **ジュエル版の文字無しの絵**（tools/make-jewel-first.mjs）を当てている（続き668）。
  //    ⇒ 文字が焼き込まれているので、この7枚だけは **assets/cards/ を持ち、アプリは文字を描かない**
  //      文字はアプリが描く（cards-data.js の hasBakedCardFace は空）。絵を描き直す時は
  //      pick を書けば、他の26種と同じ合成の道に戻る。
  { no: "08", id: "first-1st-red",    kind: "first", name: "赤のジュエル　ルビナグナ",   color: "red",    frame: "ファーストカード_表_赤", count: 1, folder: "【H】Fカード　赤の色石　レッドスピネル", 保留: true },
  { no: "09", id: "first-1st-orange", kind: "first", name: "橙のジュエル　カリブランス", color: "orange", frame: "ファーストカード_表_橙", count: 1, folder: "【H】Fカード　橙の色石　サンストーン", 保留: true },
  { no: "10", id: "first-1st-yellow", kind: "first", name: "黄のジュエル　ルミナジア",   color: "yellow", frame: "ファーストカード_表_黄", count: 1, folder: "【H】Fカード　黄の色石　ヘリオドール", 保留: true },
  { no: "11", id: "first-1st-green",  kind: "first", name: "緑のジュエル　ネオリーフィア", color: "green", frame: "ファーストカード_表_緑", count: 1, folder: "【H】Fカード　緑の色石　ジェイド", 保留: true },
  { no: "12", id: "first-1st-blue",   kind: "first", name: "青のジュエル　ラピスティア", color: "blue",   frame: "ファーストカード_表_青", count: 1, folder: "【H】Fカード　青の色石　ラピスラズリ", 保留: true },
  { no: "13", id: "first-1st-pink",   kind: "first", name: "桃のジュエル　モルガライト", color: "pink",   frame: "ファーストカード_表_桃", count: 1, folder: "【H】Fカード　桃の色石　モルガナイト", 保留: true },
  { no: "14", id: "first-1st-purple", kind: "first", name: "紫のジュエル　ラヴェルナイト", color: "purple", frame: "ファーストカード_表_紫", count: 1, folder: "【H】Fカード　紫の色石　ラヴェルライト", 保留: true },

  // ── 通常カード（7色 × 2種 × 7枚） ──
  { no: "15", id: "1st-red-poor-march",      kind: "normal", name: "貧民の行進",         color: "red",    frame: "通常カード_表_赤１", count: 7, folder: "【H】貧民の行進" },
  { no: "22", id: "1st-red-unrest",          kind: "normal", name: "治安悪化",           color: "red",    frame: "通常カード_表_赤１", count: 7, folder: "【H】状況：治安悪化", 状況: true },
  { no: "16", id: "1st-orange-conglomerate", kind: "normal", name: "財閥の威光",         color: "orange", frame: "通常カード_表_橙２", count: 7, folder: "【H】財閥の威光" },
  { no: "23", id: "1st-orange-festival",     kind: "normal", name: "フェスティバル",     color: "orange", frame: "通常カード_表_橙２", count: 7, folder: "【H】状況：フェスティバル", 状況: true },
  { no: "17", id: "1st-yellow-privilege",    kind: "normal", name: "貴族の特権",         color: "yellow", frame: "通常カード_表_黄１", count: 7, folder: "【H】貴族の特権" },
  { no: "24", id: "1st-yellow-lock-change",  kind: "normal", name: "ロックチェンジ",     color: "yellow", frame: "通常カード_表_黄１", count: 7, folder: "【H】ロックチェンジ" },
  { no: "18", id: "1st-green-largesse",      kind: "normal", name: "大盤振舞",           color: "green",  frame: "通常カード_表_緑１", count: 7, folder: "【H】大盤振舞" },
  { no: "25", id: "1st-green-bubble",        kind: "normal", name: "建設バブル",         color: "green",  frame: "通常カード_表_緑１", count: 7, folder: "【H】状況：建設バブル", 状況: true },
  { no: "19", id: "1st-blue-robbery",        kind: "normal", name: "苦渋の強盗",         color: "blue",   frame: "通常カード_表_青１", count: 7, folder: "【H】苦渋の強盗" },
  { no: "26", id: "1st-blue-poor-heart",     kind: "normal", name: "貧しき心",           color: "blue",   frame: "通常カード_表_青１", count: 7, folder: "【H】貧しき心" },
  { no: "20", id: "1st-pink-overeating",     kind: "normal", name: "食べ過ぎ",           color: "pink",   frame: "通常カード_表_桃１", count: 7, folder: "【H】食べ過ぎ" },
  { no: "27", id: "1st-pink-growth",         kind: "normal", name: "経済成長",           color: "pink",   frame: "通常カード_表_桃１", count: 7, folder: "【H】状況：経済成長", 状況: true, pick: 0 },
  { no: "21", id: "1st-purple-slum",         kind: "normal", name: "路地裏のスラム街",   color: "purple", frame: "通常カード_表_紫２", count: 7, folder: "【H】路地裏のスラム街" },
  { no: "28", id: "1st-purple-bribe",        kind: "normal", name: "裏貴族の賄賂",       color: "purple", frame: "通常カード_表_紫２", count: 7, folder: "【H】賄賂" },

  // 29 なないろの欠片 … リメイクの rainbow-shard を使い回す（フォルダが無い＝0th拡張と同じ）

  // ── 無色（白3種 各1枚／黒2種 各2枚） ──
  { no: "30", id: "1st-white-airship",    kind: "normal", name: "飛空艇アルヴァ",   color: "white", frame: "通常カード_表_白１", count: 1, folder: "【H】飛空艇ブランカ" },
  { no: "31", id: "1st-white-whim",       kind: "normal", name: "大富豪の気紛れ",   color: "white", frame: "通常カード_表_白１", count: 1, folder: "【H】大富豪の力" },
  { no: "32", id: "1st-white-revolution", kind: "normal", name: "ドゥエンの革命",   color: "white", frame: "通常カード_表_白１", count: 1, folder: "【H】革命" },
  { no: "33", id: "1st-black-depression", kind: "normal", name: "デプレッション",   color: "black", frame: "通常カード_表_黒１", count: 2, folder: "【H】状況：財産の流出", 状況: true },
  { no: "34", id: "1st-black-great-order", kind: "normal", name: "偉大なる大号令", color: "black", frame: "通常カード_表_黒１", count: 2, folder: "【H】偉大なる号令" },
];

// クレジット行（カードに印刷されているもの）
export const FIRST_ED_CREDITS = { illustrator: "YGM", date: "2024.11", edition: "S" };

// 英語のカード名。リメイク・0th拡張の付け方に合わせた。
// ⚠ 効果文の英訳はまだ。空にしておくと card-text.js が日本語のまま出す（部分翻訳を許す設計）。
export const FIRST_ED_NAME_EN = {
  "eternal-1st-red": "Scarlet Chronicle: Joynarl",
  "eternal-1st-orange": "Picture Book of Greed: Oregang",
  "eternal-1st-yellow": "Teachings of the Yellow King: Neroism",
  "eternal-1st-green": "Verdant Record: Gringrin",
  "eternal-1st-blue": "Ancient Azure Tome: Tiselios",
  "eternal-1st-pink": "Old Love Letters: Lovebook",
  "eternal-1st-purple": "Thesis of Chaos: Chaos Paper",
  "first-1st-red": "Red Jewel: Rubinagna",
  "first-1st-orange": "Orange Jewel: Caliblanc",
  "first-1st-yellow": "Yellow Jewel: Luminazia",
  "first-1st-green": "Green Jewel: Neoleafia",
  "first-1st-blue": "Blue Jewel: Lapistia",
  "first-1st-pink": "Pink Jewel: Morgalite",
  "first-1st-purple": "Purple Jewel: Lavelknight",
  "1st-red-poor-march": "March of the Poor",
  "1st-red-unrest": "Rising Crime",
  "1st-orange-conglomerate": "Glory of the Conglomerate",
  "1st-orange-festival": "Festival",
  "1st-yellow-privilege": "Noble Privilege",
  "1st-yellow-lock-change": "Lock Change",
  "1st-green-largesse": "Grand Largesse",
  "1st-green-bubble": "Construction Bubble",
  "1st-blue-robbery": "Bitter Robbery",
  "1st-blue-poor-heart": "Poor Heart",
  "1st-pink-overeating": "Overeating",
  "1st-pink-growth": "Economic Growth",
  "1st-purple-slum": "Back-Alley Slums",
  "1st-purple-bribe": "Bribe of the Shadow Noble",
  "1st-white-airship": "Airship Alva",
  "1st-white-whim": "Whim of the Tycoon",
  "1st-white-revolution": "Duen's Revolution",
  "1st-black-depression": "Depression",
  "1st-black-great-order": "The Great Decree",
};

// 山札に入る通常カードだけ（Eカード・Fカードは別の山）。
export const FIRST_ED_NORMAL = FIRST_ED_CARDS.filter((c) => c.kind === "normal");
// Eカード7種。🔴 ユーザー判断（2026-11-05）で**リメイクと同じ役回り**になった
//   ＝「ゲート侵攻に成功したら、その色のロックエリアへ即ロック」。
//   だから基本効果の1行目（手札にあるならロックエリアを全部手札に…）は tools/1st-text-source.json
//   から外してある。残っているのは「他のカードの効果の対象にならない」「ロック中でも手札効果が
//   使える」「あなたはいつでも自分の財力を１多く計算してもよい」の3行。
export const FIRST_ED_ETERNAL = FIRST_ED_CARDS.filter((c) => c.kind === "eternal");
// いまイラストから合成する対象（Fカードは保留＝暫定で印刷データを当てる）。
export const FIRST_ED_BUILD = FIRST_ED_CARDS.filter((c) => !c.保留);
// 暫定で「印刷データ（完成カード）そのもの」を当てる対象（いまはFカード7種）。
export const FIRST_ED_PRINTED_FACE = FIRST_ED_CARDS.filter((c) => c.暫定印刷絵);

// 自己点検（道具からも検査からも呼ぶ）。
export function checkFirstEdCards() {
  const 問題 = [];
  const ids = new Set();
  for (const c of FIRST_ED_CARDS) {
    if (ids.has(c.id)) 問題.push("id が重複: " + c.id);
    ids.add(c.id);
    // 🔴 id の付け方（2026-11-05 に付け替えた）。**接頭辞でカードの種類を見分けている所が
    //   アプリ側に約30か所ある**（startsWith("eternal-") / startsWith("first-")。裏面の絵・
    //   カード面のレイアウト・他カードの効果の対象外・ロック中でも手札効果が使える・CPUの
    //   「大事な札」判定…）。だから E/F カードは **eternal- / first- で始める**
    //   （1st-eternal-… だと、その約30か所を全部書き換えることになる）。
    //   通常カードは今までどおり 1st- で始める（こちらは「どのセットか」を見る所だけが使う）。
    const 正しい接頭辞 = { eternal: "eternal-1st-", first: "first-1st-", normal: "1st-" }[c.kind];
    if (!c.id.startsWith(正しい接頭辞)) 問題.push("id が " + 正しい接頭辞 + " で始まっていない: " + c.id);
    if (!FIRST_ED_NAME_EN[c.id]) 問題.push("英語名が無い: " + c.id);
  }
  for (const k of Object.keys(FIRST_ED_NAME_EN)) {
    if (!ids.has(k)) 問題.push("英語名だけ在って表に無い: " + k);
  }
  // 枚数（なないろの欠片7枚はリメイクのものを足すので、ここでは 105 枚）
  const 色ごと = {};
  for (const c of FIRST_ED_NORMAL) 色ごと[c.color] = (色ごと[c.color] || 0) + c.count;
  const 合計 = FIRST_ED_NORMAL.reduce((a, c) => a + c.count, 0);
  if (合計 !== 105) 問題.push("通常カードの合計が 105 枚でない: " + 合計);
  for (const col of ["red", "orange", "yellow", "green", "blue", "pink", "purple"]) {
    if (色ごと[col] !== 14) 問題.push(col + " が14枚でない: " + 色ごと[col]);
  }
  if (色ごと.white !== 3) 問題.push("白が3枚でない: " + 色ごと.white);
  if (色ごと.black !== 4) 問題.push("黒が4枚でない: " + 色ごと.black);
  const 種 = { eternal: 0, first: 0, normal: 0 };
  for (const c of FIRST_ED_CARDS) 種[c.kind]++;
  if (種.eternal !== 7) 問題.push("Eカードが7種でない: " + 種.eternal);
  if (種.first !== 7) 問題.push("Fカードが7種でない: " + 種.first);
  if (種.normal !== 19) 問題.push("通常カードが19種でない（虹を除く）: " + 種.normal);
  return { 問題, 合計, 色ごと, 種 };
}
