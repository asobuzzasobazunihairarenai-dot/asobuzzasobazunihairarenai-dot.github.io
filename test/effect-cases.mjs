// カード効果ユニットテストのケース定義＋アサーション（続き240で test/effects.mjs から分離）。
// Node（test/effects.mjs）とブラウザ（アプリ内オールテスト）の両方から import される、
// ブラウザ固有の import を持たない純粋データ＋純粋関数。

// -------------------- テストケース（serializable） --------------------
// state: hydrateState に渡す最小の盤面。ctx: 効果に渡す文脈。picks: 台本（型ごとに順に消費）。
// expect: Node 側で最終 state に対して確認するアサーション。
// 盤面の座席→ロック辺: A=bottom, B=left, C=top, D=right（board-layout）。COLORS順=赤橙黄緑青桃紫。
export const CASES = [
  {
    name: "ジャンプ台(到達): 2マス先へ移動し、このカード自身は手札に加えない",
    kind: "arrival",
    cardId: "red-jump-pad",
    // 自分の駒(6,3)。2マス上(4,3)にカードあり(移動先)。ジャンプ台自身は(6,3)に表向き。
    state: {
      activePlayers: ["A"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "jump", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "dest", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "cell", row: 4, col: 3 } },
        { id: "mid", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "cell", row: 5, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "red-jump-pad", cardTokenId: "jump", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 4, col: 3 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 4, col: 3 }, // 2マス先へ一気に移動した
      { kind: "tokenZone", id: "jump", zone: "cell" }, // 自分自身は手札に加わらず盤面に残る
      { kind: "tokenNotInHand", id: "jump", player: "A" },
    ],
  },
  {
    name: "白の意思の覚醒(到達): 場の表向きカードを全て捨てる（裏向きは残る）",
    kind: "arrival",
    cardId: "white-awakening",
    state: {
      activePlayers: ["A"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "white-awakening", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "up1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
        { id: "up2", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 0, col: 1 } },
        { id: "down1", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "cell", row: 1, col: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "white-awakening", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 【#357】捨てる順番を選べる（対象が全部表向きなので2枚以上あれば必ず聞く）。up2→up1 の順で捨てる。
    picks: { boardCardsOrdered: [["up2", "up1"]] },
    expect: [
      // 捨てられたカードはトークンが消えて piles.discard に cardId として積まれる。
      { kind: "tokenGone", id: "up1" },
      { kind: "tokenGone", id: "up2" },
      { kind: "pileContains", pile: "discard", cardId: "red-jump-pad" },
      { kind: "pileContains", pile: "discard", cardId: "blue-choosable-trap" },
      { kind: "tokenZone", id: "down1", zone: "cell" }, // 裏向きは対象外＝残る
      // 【#357】順番を選ぶモーダルが1回だけ出て、選んだ順がそのまま返ること。
      { kind: "called", name: "pickBoardCardsOrdered", arg: "up2,up1" },
      // 捨て場は「先に捨てたものが下」＝選んだ順に積まれる。この効果は**自分自身も表向きの
      // 盤面カード**なので対象に含まれ、選ばなかった分として最後に積まれる。
      // （pileOrder は捨て場の**末尾N件**を見る作りなので、3枚とも書く。）
      { kind: "pileOrder", pile: "discard", cards: ["blue-choosable-trap", "red-jump-pad", "white-awakening"] },
    ],
  },
  {
    name: "なないろの巨光(到達): 全員3枚ドロー、このカードを捨てる",
    kind: "arrival",
    cardId: "white-radiance",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "white-radiance", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
      ],
      // 山札に6枚（A×3, B×3ぶん）。末尾が一番上（popで引く）。
      piles: {
        deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad", "blue-choosable-trap", "blue-choosable-trap", "blue-choosable-trap"],
        eternal: [], first: [], discard: [],
      },
    },
    ctx: { player: "A", cardId: "white-radiance", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handCount", player: "A", n: 3 },
      { kind: "handCount", player: "B", n: 3 },
      { kind: "deckLen", n: 0 },
      { kind: "tokenGone", id: "self" }, // 自身を捨てる＝トークンは消えて discard へ
      { kind: "pileContains", pile: "discard", cardId: "white-radiance" },
    ],
  },
  {
    name: "カウンターロック(到達): 一番少なくロックしているなら1枚ドロー（最少）",
    kind: "arrival",
    cardId: "red-counter-lock",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        // B が1色ロック済み、A は0 → A が最少 → ドローする
        { id: "bl", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "left", index: 0 } },
      ],
      piles: { deck: ["green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "red-counter-lock", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 0 }, // 最少なので山札から1枚引いた（1→0）
      // 手札は「引いた1枚＋既定でこのカード自身が手札に加わる」で計2枚。
      { kind: "handCount", player: "A", n: 2 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "カウンターロック(到達): 最少でないならドローしない",
    kind: "arrival",
    cardId: "red-counter-lock",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        // A が1色、B が0 → A は最少でない → ドローしない
        { id: "al", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
      ],
      piles: { deck: ["green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "red-counter-lock", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 }, // 最少でない＝ドローしない（山札そのまま）
      // 手札は既定でこのカード自身が加わる1枚のみ。
      { kind: "handCount", player: "A", n: 1 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "収穫と種まき(到達): 選んだマスの1枚を手札へ→手札から1枚をそのマスへ裏向きで置く",
    kind: "arrival",
    cardId: "orange-harvest-sow",
    state: {
      activePlayers: ["A"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "target", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "inhand", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "orange-harvest-sow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 1回目のlocation=拾うマス(2,2)、handCard=手札から置く札(inhand)、その置き先locationは同じマス(SAME_AS)
    picks: { location: [{ row: 2, col: 2 }], handCard: ["inhand"] },
    expect: [
      { kind: "tokenZone", id: "target", zone: "hand", player: "A" }, // 拾った
      { kind: "tokenAtCell", id: "inhand", row: 2, col: 2 }, // 手札の札をそのマスへ置いた
      { kind: "tokenFaceDown", id: "inhand" }, // 裏向きで
      // #336: CPUの自動選択が「自分自身のマス(6,3)」と「今拾った札(target)の置き直し」を
      // 避けられるよう、その2つが選択時に渡っていること（人間の候補は減らさない）。
      { kind: "called", name: "pickLocationAvoidCell", arg: "6,3" },
      { kind: "called", name: "pickHandCardAvoid", arg: "target" },
    ],
  },
  {
    // 不具合報告#203「収穫と種まきに到達して、効果でその収穫と種まき自身を指定し、場に戻したのに
    // 最終的に手札に加わった」。到達効果の既定動作（このカードを手札に加える）は、効果が自分自身を
    // 一度手札へ回収していたら行わない（効果が行き先を決めた結果を尊重する）。
    name: "収穫と種まき(到達): 自分自身を拾って同じマスへ置き直したら、最後に手札へ加えない(#203)",
    kind: "arrival",
    cardId: "orange-harvest-sow",
    state: {
      activePlayers: ["A"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "other", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "inhand", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "orange-harvest-sow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 拾うマス=自分がいるマス(6,3)＝収穫と種まき自身、置く札=その収穫と種まき自身。
    picks: { location: [{ row: 6, col: 3 }], handCard: ["self"] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 6, col: 3 }, // 置き直した場所に残る
      { kind: "tokenNotInHand", id: "self", player: "A" }, // 手札には加わらない（ここが#203）
      { kind: "tokenFaceDown", id: "self" }, // 置き直しは裏向き
      { kind: "tokenZone", id: "inhand", zone: "hand", player: "A" }, // 手札の別の札は動かない
    ],
  },
  {
    name: "マスチェンジ(到達): 3マス以内の相手の駒と位置を入れ替える",
    kind: "arrival",
    cardId: "orange-mass-change",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "orange-mass-change", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "orange-mass-change", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 3, col: 5 }], player: ["B"] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 5 },
      { kind: "pieceAt", player: "B", row: 3, col: 3 },
    ],
  },
  {
    name: "マスチェンジ(手札): 追色コストを払い、位置を入れ替える。カード自身は捨てる",
    kind: "hand",
    cardId: "orange-mass-change",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "orange-mass-change", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "orange-mass-change", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 5 }], player: ["B"] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 5 },
      { kind: "pieceAt", player: "B", row: 3, col: 3 },
      { kind: "tokenGone", id: "cost" }, // 追色コストで捨てた
      { kind: "pileContains", pile: "discard", cardId: "orange-harvest-sow" },
      { kind: "tokenGone", id: "self" }, // 手札効果はカード自身を捨てる
      { kind: "pileContains", pile: "discard", cardId: "orange-mass-change" },
    ],
  },
  {
    name: "増殖する樹々(手札): 山札から3枚を選んだ3マスへ裏向きで置く。カード自身は捨てる",
    kind: "hand",
    cardId: "green-growing-trees",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 山札の3枚（並び順＝末尾が一番上、popで引かれる）。中身は問わないので有効な cardId を3つ。
      piles: { deck: ["red-jump-pad", "blue-choosable-trap", "green-joint-construction"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "green-growing-trees", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 手札効果はカード自身を先に捨てる
      { kind: "pileContains", pile: "discard", cardId: "green-growing-trees" },
      { kind: "deckLen", n: 0 }, // 3枚とも引かれた
      { kind: "cardAtCell", row: 0, col: 0, faceUp: false },
      { kind: "cardAtCell", row: 0, col: 1, faceUp: false },
      { kind: "cardAtCell", row: 0, col: 2, faceUp: false },
      { kind: "boardCardCount", n: 3 },
      // #337: 置き先のマス選択には用途 "place" を渡す（渡さないとCPUの自動選択が
      // 「拾う/乗る」用の判断になり、参加者全員のゲートに1枚ずつ置いてしまう）。
      { kind: "called", name: "pickLocationPurpose", arg: "place", n: 3 },
    ],
  },
  {
    name: "選べる罠(手札): このカード自身を選んだマスへ裏向きで置く。カードは捨てず盤面に残る",
    kind: "hand",
    cardId: "blue-choosable-trap",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "blue-choosable-trap", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 2, col: 2 }, // 自身が盤面へ（keepsCardOnUse＝捨てない）
      { kind: "tokenFaceDown", id: "self" }, // 裏向きで置かれる
    ],
  },
  {
    name: "奇跡の森マンズウッド/eternal-green(手札): 追色1を払い1枚ドロー。カード自身は捨てる",
    kind: "hand",
    cardId: "eternal-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "eternal-green", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-green", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      // エターナル/ファーストカードは使用時に捨てない（is-usable-while-locked の特別枠、engine line 2028）
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
      { kind: "tokenGone", id: "cost" },
      { kind: "deckLen", n: 0 }, // 1枚ドロー
      { kind: "handCount", player: "A", n: 2 }, // self（残る）＋引いた1枚
    ],
  },
  {
    name: "ジャンプ台(手札): これをゲート以外の任意マスに表向きで置く。カードは残る",
    kind: "hand",
    cardId: "red-jump-pad",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "red-jump-pad", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 2, col: 2 },
      { kind: "tokenFaceUp", id: "self" }, // 表向きで置く
    ],
  },
  {
    name: "白の意思の覚醒(手札): 場の表向きカードの上に山札から1枚ずつ裏向きで置く。自身は捨てる",
    kind: "hand",
    cardId: "white-awakening",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "white-awakening", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "fc1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
        { id: "fc2", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 1, col: 1 } },
      ],
      piles: { deck: ["green-growing-trees", "orange-harvest-sow"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "white-awakening", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" },
      { kind: "pileContains", pile: "discard", cardId: "white-awakening" },
      { kind: "deckLen", n: 0 }, // 表向き2マス分＝2枚置いた
      { kind: "boardCardCount", n: 4 }, // 元の2枚＋置いた2枚
    ],
  },
  {
    name: "なないろの巨光(手札): 全員3枚ドロー→このフェイズ終了。自身は捨てる",
    kind: "hand",
    cardId: "white-radiance",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "white-radiance", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap", "green-growing-trees", "orange-harvest-sow", "yellow-gamble", "pink-present"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "white-radiance", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" },
      { kind: "deckLen", n: 0 }, // A3枚+B3枚
      { kind: "handCount", player: "A", n: 3 },
      { kind: "handCount", player: "B", n: 3 },
    ],
  },
  {
    name: "色落ちキャット(到達): これを捨てる→全員、手札を全て捨て1枚ドロー",
    kind: "arrival",
    cardId: "black-faded-cat",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "black-faded-cat", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "ha", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "hb", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["green-growing-trees", "orange-harvest-sow"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-faded-cat", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" }, // DISCARD_SELF
      { kind: "pileContains", pile: "discard", cardId: "black-faded-cat" },
      { kind: "tokenGone", id: "ha" }, // A の手札を全捨て
      { kind: "tokenGone", id: "hb" }, // B の手札を全捨て
      { kind: "handCount", player: "A", n: 1 }, // 各1枚ドロー
      { kind: "handCount", player: "B", n: 1 },
      { kind: "deckLen", n: 0 },
      // 【#357】捨てる順番は「その人自身」に聞く（相手の手札は使用者から見えないため、
      // 合同建設と同じ委任に乗せる）。参加者の人数ぶん呼ばれること。
      { kind: "called", name: "delegateToPlayer", arg: "discard-hand-ordered", n: 2 },
      // 委任が空振り（このテストの擬似ヘルパーは false を返すだけ）でも「全て捨てる」は
      // 守られること＝上の tokenGone(ha/hb) が通ることで担保されている。
    ],
  },
  {
    name: "色落ちキャット(手札): ロック1枚捨て→3枚ドロー。フェイズ終了。自身は先に捨てる",
    kind: "hand",
    cardId: "black-faded-cat",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "black-faded-cat", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "la", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
      ],
      piles: { deck: ["green-growing-trees", "orange-harvest-sow", "yellow-gamble"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-faded-cat", cardTokenId: "self" },
    picks: { location: [{ zone: "lock", side: "bottom", index: 0 }] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 手札効果は自身を先に捨てる
      { kind: "tokenGone", id: "la" }, // ロック1枚捨て
      { kind: "deckLen", n: 0 }, // 1枚×3ドロー
      { kind: "handCount", player: "A", n: 3 },
    ],
  },
  {
    // 【続き546】ロックカードは「ロックエリア風モーダル」でまとめて選ぶ。枚数はプレイヤーが
    // 決める（0枚でもよい）ので limit は無く、押した順にそのまま捨てる。
    // ファースト・エターナルは他のカードの効果の対象外＝候補に入らないことも検査する。
    name: "色落ちキャット(手札): ロック2枚をまとめて選んで捨て→6枚ドロー（ファーストは対象外）",
    kind: "hand",
    cardId: "black-faded-cat",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "black-faded-cat", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "la", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "lb", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "lock", side: "bottom", index: 1 } },
        { id: "lfirst", kind: "card", cardId: "first-blue", faceUp: true, location: { zone: "lock", side: "bottom", index: 2 } },
      ],
      piles: { deck: ["yellow-gamble", "pink-present", "red-jump-pad", "green-growing-trees", "orange-harvest-sow", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-faded-cat", cardTokenId: "self" },
    picks: { lockCardsOrdered: [["lb", "la"]] },
    expect: [
      { kind: "called", name: "pickLockCardsOrderedDrawPer", arg: "3" },
      { kind: "called", name: "pickLockCardsOrdered", arg: "lb,la" },
      { kind: "tokenGone", id: "self" },
      { kind: "tokenGone", id: "la" },
      { kind: "tokenGone", id: "lb" },
      // ファーストはロックに残る（対象外）
      { kind: "tokenZone", id: "lfirst", zone: "lock" },
      // 選んだ順に積まれる（捨て場は上から使うので順番に意味がある）
      { kind: "pileOrder", pile: "discard", cards: ["green-growing-trees", "red-jump-pad"] },
      { kind: "deckLen", n: 0 }, // 2枚×3＝6枚ドロー
      { kind: "handCount", player: "A", n: 6 },
    ],
  },
  {
    // 【続き546】モーダルを持たない呼び出し元・CPUの番では null が返り、従来の1枚ずつ経路へ
    // 落ちる。その分岐が生きていることを、筋書きに lockCardsOrdered を置かないことで確かめる。
    name: "色落ちキャット(手札): まとめて選ぶ画面が無い時は従来どおり1枚ずつ聞く",
    kind: "hand",
    cardId: "black-faded-cat",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "black-faded-cat", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "la", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
      ],
      piles: { deck: ["green-growing-trees", "orange-harvest-sow", "yellow-gamble"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-faded-cat", cardTokenId: "self" },
    picks: { location: [{ zone: "lock", side: "bottom", index: 0 }] },
    expect: [
      { kind: "tokenGone", id: "la" },
      { kind: "deckLen", n: 0 },
      { kind: "handCount", player: "A", n: 3 },
    ],
  },
  {
    name: "黒の契約の烙印(到達): 空いている自分のロックスロットにこれを表向きで置く",
    kind: "arrival",
    cardId: "black-contract-brand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "black-contract-brand", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-contract-brand", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ zone: "lock", side: "bottom", index: 0 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "lock" }, // ロックエリアへ
      { kind: "tokenFaceUp", id: "self" }, // 表向きで置く
    ],
  },
  {
    name: "黒の契約の烙印(手札): これを任意のマスに裏向きで置く。カードは残る",
    kind: "hand",
    cardId: "black-contract-brand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "black-contract-brand", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "black-contract-brand", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 4, col: 4 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 4, col: 4 },
      { kind: "tokenFaceDown", id: "self" },
    ],
  },
  {
    name: "収穫と種まき(手札): 拾う→手札から同じマスへ置き直す（inheritsArrival）。自身は先に捨てる",
    kind: "hand",
    cardId: "orange-harvest-sow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "target", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "inhand", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "orange-harvest-sow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }], handCard: ["inhand"] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 手札効果は自身を先に捨てる
      { kind: "tokenZone", id: "target", zone: "hand", player: "A" }, // 拾った
      { kind: "tokenAtCell", id: "inhand", row: 2, col: 2 }, // 手札の札を置いた
      { kind: "tokenFaceDown", id: "inhand" },
    ],
  },
  {
    name: "黄金の宮殿ドムス・ネロ/eternal-yellow(手札): 追色1→自分2枚・相手全員1枚ドロー",
    kind: "hand",
    cardId: "eternal-yellow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "eternal-yellow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-yellow", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "handCount", player: "A", n: 3 }, // self（残る）＋自分2枚ドロー
      { kind: "handCount", player: "B", n: 1 }, // 相手1枚ドロー
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "終わりなき化学ゲンテクニーク/eternal-purple(手札): 追色1→拾う→同じマスに山札から裏向きで置く",
    kind: "hand",
    cardId: "eternal-purple",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-purple", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "purple-trial-ritual", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "target", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-purple", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenZone", id: "target", zone: "hand", player: "A" }, // 拾った
      { kind: "cardAtCell", row: 0, col: 0, faceUp: false }, // 山札から裏向きで置いた
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "月下の漂流船プリドゥエン/eternal-blue(手札): 追色1→任意2マスに山札から裏向きで置く",
    kind: "hand",
    cardId: "eternal-blue",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-blue", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-blue", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "cardAtCell", row: 0, col: 0, faceUp: false },
      { kind: "cardAtCell", row: 0, col: 1, faceUp: false },
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "橙のキューブ ハーベスト/first-orange(手札): 追色1→2マス以内の1枚を手札に加える",
    kind: "hand",
    cardId: "first-orange",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-orange", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "target", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-orange", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenZone", id: "target", zone: "hand", player: "A" }, // 2マス以内の1枚を手札へ
    ],
  },
  {
    name: "紅蓮の火山ワイナウエア/eternal-red(手札): 追色1→任意1マスのカードを全て捨てる",
    kind: "hand",
    cardId: "eternal-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-red", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "st1", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
        { id: "st2", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // 【#357】表向き(st1)と裏向き(st2)が混ざっている＝表向きが1枚でもあるので順番を聞く。
    // 表向きの札をどの位置に置くかを決められるのが、混在時に聞く価値。ここでは st1 を先に捨てる。
    picks: { discardCost: ["cost"], location: [{ row: 0, col: 0 }], boardCardsOrdered: [["st1", "st2"]] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenGone", id: "st1" }, // そのマスのカードを全て捨てた
      { kind: "tokenGone", id: "st2" },
      // 【#357】モーダルへ渡す並びは**マスの上から**（state.tokens では後ろほど上なので st2 が上）。
      // ユーザー要望「どの順番でカードが重ねられてたかわかりやすく」。
      { kind: "called", name: "pickBoardCardsOrderedCandidates", arg: "st2,st1" },
      { kind: "called", name: "pickBoardCardsOrdered", arg: "st1,st2" },
      { kind: "boardCardCount", n: 0 },
      // 【#335】お知らせは中央が空くまで順番待ちするので、その間ずっと対象マスを光らせ続け
      // （20秒）、お知らせが終わってから短く畳む（1.2秒）。文面が「光っているマスの」と言うので、
      // 読む時に光っていないと何も指さない。
      { kind: "called", name: "markPlacedLocation", arg: 20000 },
      { kind: "called", name: "markPlacedLocation", arg: 1200 },
    ],
  },
  {
    // 【#357・2026-09-29 ユーザー指摘】**全部裏向きでも捨てる順番を聞く**。裏向き＝中身不明とは
    // 限らないため——選べる罠・パーティー・収穫と種まき・合同建設のように**カードを裏向きで盤面に
    // 置く効果**があるので、プレイヤーは「あのマスに何を置いたか」を覚えていることがある。
    // （当初は「表向きが1枚以上ある時だけ聞く」にしていた。この検査はその誤りを繰り返さないため。）
    name: "紅蓮の火山ワイナウエア/eternal-red(手札): 全部裏向きのマスでも捨てる順番を聞く（#357）",
    kind: "hand",
    cardId: "eternal-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-red", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "dn1", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
        { id: "dn2", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 0, col: 0 }], boardCardsOrdered: [["dn1", "dn2"]] },
    expect: [
      { kind: "tokenGone", id: "dn1" },
      { kind: "tokenGone", id: "dn2" },
      // 候補は上から順（state.tokens では後ろほど上なので dn2 が上）。
      { kind: "called", name: "pickBoardCardsOrderedCandidates", arg: "dn2,dn1" },
      // 全部裏向きでも聞かれ、選んだ順で捨てられる。
      { kind: "called", name: "pickBoardCardsOrdered", arg: "dn1,dn2" },
      { kind: "pileOrder", pile: "discard", cards: ["green-growing-trees", "blue-choosable-trap"] },
    ],
  },
  {
    name: "なないろの欠片(手札・選択肢): 1枚ドローを選ぶ",
    kind: "hand",
    cardId: "rainbow-shard",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "rainbow-shard", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "rainbow-shard", cardTokenId: "self" },
    picks: { option: ["draw"] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 「1枚ドロー」選択肢は keepsCardOnUse でないので自身を捨てる
      { kind: "deckLen", n: 0 }, // 1枚ドロー
      { kind: "handCount", player: "A", n: 1 },
    ],
  },
  {
    name: "選べる罠(到達・選択肢): 手札を半分捨てるを選ぶ",
    kind: "arrival",
    cardId: "blue-choosable-trap",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "h1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "blue-choosable-trap", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // 3枚の手札の半分（端数切り捨て）＝1枚を選んで捨てる
    picks: { option: ["discard-half-hand"], handCard: ["h1"] },
    expect: [
      { kind: "tokenGone", id: "h1" }, // 半分（1枚）捨てた
      { kind: "pileContains", pile: "discard", cardId: "red-jump-pad" },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 到達効果カードは既定で手札へ
    ],
  },
  {
    // 【続き545】手札が4枚＝半分2枚の時は、1枚ずつ確認を繰り返すのではなく
    // **順番を付けて最後に1回確定する**画面（pickHandCardsOrdered）で聞く。
    // limit=2 が渡っていること（＝残りを勝手に捨てない）も検査する。
    name: "選べる罠(到達・選択肢): 手札4枚なら半分2枚を、捨てる順を選んで捨てる",
    kind: "arrival",
    cardId: "blue-choosable-trap",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "h1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h4", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "blue-choosable-trap", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["discard-half-hand"], handCardsOrdered: [["h3", "h1"]] },
    expect: [
      { kind: "called", name: "pickHandCardsOrderedLimit", arg: "2" },
      { kind: "called", name: "pickHandCardsOrdered", arg: "h3,h1" },
      { kind: "tokenGone", id: "h3" },
      { kind: "tokenGone", id: "h1" },
      // 選んだ順に積まれる（捨て場は上から使うので順番に意味がある）
      { kind: "pileOrder", pile: "discard", cards: ["yellow-gamble", "red-jump-pad"] },
      // 残りの2枚は捨てない（半分だけ）
      { kind: "handCount", player: "A", n: 3 },
    ],
  },
  {
    name: "プレゼント(到達): 一番少なくロックしている全員が1枚ドロー（Aのみ最少）",
    kind: "arrival",
    cardId: "pink-present",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        // B が1色ロック済み、A は0 → A のみ最少 → A だけドロー
        { id: "bl", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "left", index: 0 } },
      ],
      piles: { deck: ["green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "pink-present", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 0 }, // A が1枚ドロー
      { kind: "handCount", player: "A", n: 2 }, // ドロー1枚＋既定でこのカード自身
      { kind: "handCount", player: "B", n: 0 }, // 最少でないB はドローしない
    ],
  },
  {
    name: "増殖する樹々(到達): 2マス以内の何もないマス全てに山札から裏向きで置く",
    kind: "arrival",
    cardId: "green-growing-trees",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        // 駒を角(0,0)に置き、範囲内5マスのうち4マスを埋めて空きを(2,0)の1つに限定する
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
        { id: "f1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 0, col: 1 } },
        { id: "f2", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 0, col: 2 } },
        { id: "f3", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "cell", row: 1, col: 0 } },
        { id: "f4", kind: "card", cardId: "purple-trial-ritual", faceUp: true, location: { zone: "cell", row: 1, col: 1 } },
      ],
      piles: { deck: ["orange-harvest-sow"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "green-growing-trees", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 0, col: 0 } },
    picks: {},
    expect: [
      { kind: "cardAtCell", row: 2, col: 0, faceUp: false }, // 唯一の空きマスへ置いた
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "黄のキューブ サフラン/first-yellow(手札): 追色1→2マス以内の裏向きカードを最大4枚オープン",
    kind: "hand",
    cardId: "first-yellow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-yellow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "d1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 3, col: 4 } },
        { id: "d2", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "cell", row: 3, col: 2 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-yellow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 4 }, { row: 3, col: 2 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenFaceUp", id: "d1" }, // オープン
      { kind: "tokenFaceUp", id: "d2" },
    ],
  },
  {
    name: "紫のキューブ ディメンション/first-purple(手札): 追色1→移動強化の案内のみ（自身は残る）",
    kind: "hand",
    cardId: "first-purple",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "first-purple", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "purple-trial-ritual", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-purple", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" }, // 追色1を支払う
    ],
  },
  {
    name: "桃のキューブ セレナーデ/first-pink(手札): 追色1→手札1枚をロック（最後のロック不可）",
    kind: "hand",
    cardId: "first-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-pink", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "lk", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], handCard: ["lk"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenZone", id: "lk", zone: "lock" }, // 手札1枚をロックした
    ],
  },
  {
    name: "結ばれの一本桜/eternal-pink(手札): 追色1→相手を自分の隣へ移動",
    kind: "hand",
    cardId: "eternal-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "eternal-pink", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        // 「移動」なので移動先にはカードが必要（ユーザー指摘2026-09-04。rulebook の用語定義）。
        { id: "dest", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // 相手は1人→自動選択。自分(3,3)の周囲のカードがあるマスから(3,4)を選ぶ
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "pieceAt", player: "B", row: 3, col: 4 }, // 相手を自分の隣へ移動
    ],
  },
  {
    // #224: カード文は「相手をあなたの**周囲**へ移動する」＝縦横斜めの8マス（rulebook の用語定義）。
    // 以前は前後左右の4マスしか候補にしておらず、斜めが選べなかった。
    // ★picks に "index:7"（8番目の候補）を使うのが要点——テストランナーの pickLocation は
    //   「指定したマスが候補に無ければ指定通りに返す」ため、座標で指定すると4マスのままでも
    //   通ってしまい回帰を検出できない。番号指定なら候補が4つだと undefined になり失敗する。
    name: "結ばれの一本桜/eternal-pink(手札): 移動先の到達効果を、移動させられた相手が得る(#333)",
    kind: "hand",
    cardId: "eternal-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "eternal-pink", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        // 移動先は**裏向き**。移動でオープンされ、その到達効果を相手(B)が得る（docs/cards.md の補足）。
        { id: "dest", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "pieceAt", player: "B", row: 3, col: 4 },
      { kind: "tokenFaceUp", id: "dest" },
      // ここが本体: 到達効果を起こす相手が B であること。以前は相手クライアント任せで、
      // CPU戦ではこの呼び出しが一度も無く、カードがオープンするだけだった。
      { kind: "called", name: "arrivalAt", arg: "B" },
    ],
  },
  {
    name: "結ばれの一本桜/eternal-pink(手札): 移動先は「周囲」＝斜めも選べる(#224)",
    kind: "hand",
    cardId: "eternal-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "eternal-pink", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        // 「移動」なので候補はカードのあるマスだけ。番号指定(index:7)の意味を保つため周囲8マス全部に置く。
        { id: "ring0", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "ring1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "ring2", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 4 } },
        { id: "ring3", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 3, col: 2 } },
        { id: "ring4", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
        { id: "ring5", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 4, col: 2 } },
        { id: "ring6", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 4, col: 3 } },
        { id: "ring7", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"], location: ["index:7"] },
    expect: [
      { kind: "pieceAt", player: "B", row: 4, col: 4 }, // 斜め（自分(3,3)の右下）へ移動できる
    ],
  },
  {
    // ユーザー指摘2026-09-04「コノハナサクヤは『移動』であって『強制移動』ではないため、
    // ハイライトすべきマスはカードのあるマス」。周囲8マスのうちカードがあるのが1マスだけなら、
    // 選ばせずにそこへ移動する（空きマスは候補にならない＝ここが回帰したら別のマスへ動くか不発になる）。
    name: "結ばれの一本桜/eternal-pink(手札): 移動先はカードのあるマスだけ（空きマスは選べない）",
    kind: "hand",
    cardId: "eternal-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "eternal-pink", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        // 周囲8マスのうち、カードがあるのは左上(2,2)だけ
        { id: "only", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "pieceAt", player: "B", row: 2, col: 2 },
    ],
  },
  {
    name: "赤のキューブ フェニックス/first-red(手札): 追色1→捨て場の上から2番目を手札に加える",
    kind: "hand",
    cardId: "first-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "first-red", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 捨て場（末尾＝一番上）。効果使用前の一番上 yellow-gamble が「2番目」として手札に入る
      // （note: 実質、効果使用前の捨て場の1番上のカードが2番目になる。コスト札が先に一番上へ積まれるため）。
      piles: { deck: [], eternal: [], first: [], discard: ["green-growing-trees", "blue-choosable-trap", "yellow-gamble"] },
    },
    ctx: { player: "A", cardId: "first-red", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "handHasCard", player: "A", cardId: "yellow-gamble" }, // 効果使用前の一番上を手札へ
    ],
  },
  {
    name: "青のキューブ セレスティア/first-blue(手札): 追色1→手札2枚以上の相手全員から無作為に1枚捨てさせる",
    kind: "hand",
    cardId: "first-blue",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "first-blue", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
        // B は2枚 → 対象。1枚捨てさせられる（無作為＝先頭 bh1）
        { id: "bh1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "hand", player: "B" } },
        { id: "bh2", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-blue", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "tokenGone", id: "bh1" }, // B の手札から無作為に1枚捨てさせた
      { kind: "handCount", player: "B", n: 1 }, // 2→1
    ],
  },
  {
    name: "奇跡の森マンズウッド/first-green(手札): 追色1→2枚公開ドロー（ターン終了時に捨てる予定）",
    kind: "hand",
    cardId: "first-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "first-green", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-green", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // ファーストは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "publicDrawCount", player: "A", n: 2 }, // 2枚を公開ドロー
      { kind: "deckLen", n: 0 },
      { kind: "called", name: "markDiscardAtTurnEnd" }, // ターン終了時に捨てる予定として登録
    ],
  },
  {
    name: "禁断の果実マルメゴ/eternal-orange(手札): 追色1→4枚公開ドロー（橙が無ければ手札は残る）",
    kind: "hand",
    cardId: "eternal-orange",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "eternal-orange", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "keep", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 橙を含まない4枚（赤青緑紫）→ 手札全捨ての条件を満たさない
      piles: { deck: ["red-jump-pad", "blue-choosable-trap", "green-growing-trees", "purple-trial-ritual"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-orange", cardTokenId: "self" },
    picks: { discardCost: ["cost"] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // エターナルは使用時に捨てない
      { kind: "tokenGone", id: "cost" },
      { kind: "publicDrawCount", player: "A", n: 4 }, // 4枚公開ドロー
      { kind: "deckLen", n: 0 },
      { kind: "tokenZone", id: "keep", zone: "hand", player: "A" }, // 橙が無いので手札は捨てられない
    ],
  },
  {
    // 【#357】橙が出て手札を全部捨てる時、捨てる順番を本人が選べること。捨て場は一番上から
    // 使われる（山札切れの補充は捨て場をそのまま裏返す＝シャッフルしない）ので、順番が効く。
    // この検査を外す（engine側の pickHandCardsOrdered 呼び出しを消す）と落ちることをA/Bで確認済み。
    name: "禁断の果実マルメゴ/eternal-orange(手札): 橙が出たら手札を全捨て。捨てる順番を選べる（#357）",
    kind: "hand",
    cardId: "eternal-orange",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "eternal-orange", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "keep1", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "keep2", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 橙（マスチェンジ）を含む4枚 → 手札全捨ての条件を満たす
      piles: { deck: ["red-jump-pad", "blue-choosable-trap", "green-growing-trees", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-orange", cardTokenId: "self" },
    picks: { discardCost: ["cost"], handCardsOrdered: [["keep2", "keep1"]] },
    expect: [
      { kind: "tokenGone", id: "cost" },
      // 順番付きで**1回だけ**呼ばれること（#344: 1枚ずつ聞かない）。
      // ⚠【2026-11-06・#517】以前は arg: "keep2,keep1" と書いていたが、それは**スタブが
      //   本物より優しかった時の文字列**だった。本物のモーダルは limit も anyCount も無い時
      //   「全部捨てる。選ぶのは順番だけ」なので、選ばなかった札（ここでは公開ドローした分）
      //   を後ろに足して返す。スタブを本物に合わせたので、捨てる順の検査は下の
      //   tokenGone / pileOrder に任せ、ここは「1回だけ」を見る。
      { kind: "called", name: "pickHandCardsOrdered", n: 1 },
      { kind: "tokenGone", id: "keep1" },
      { kind: "tokenGone", id: "keep2" },
    ],
  },
  {
    name: "手品師の技スリカエ(到達): 相手と手札を1枚ずつ交換",
    kind: "arrival",
    cardId: "yellow-sleight-of-hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "yellow-sleight-of-hand", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "amine", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "btheirs", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "yellow-sleight-of-hand", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {}, // 相手は1人→自動選択、交換は無作為（先頭で代用）
    expect: [
      { kind: "tokenZone", id: "btheirs", zone: "hand", player: "A" }, // 相手の札が自分の手札へ
      { kind: "tokenZone", id: "amine", zone: "hand", player: "B" }, // 自分の札が相手の手札へ
    ],
  },
  {
    name: "プレゼント(手札): これを相手の隣に裏向きで置く→1枚ドロー。カードは残る",
    kind: "hand",
    cardId: "pink-present",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 5 } },
        { id: "self", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "pink-present", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // 相手は1人→自動選択。相手B(3,5)の隣接から(3,4)を選ぶ
    picks: { location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 3, col: 4 }, // 相手の隣へ置く（keepsCardOnUse）
      { kind: "tokenFaceDown", id: "self" },
      { kind: "deckLen", n: 0 }, // 1枚ドロー
    ],
  },
  {
    name: "ザ・ギャンブル(到達): 2色宣言→2枚公開ドロー→宣言色が出たので手札を全て捨てる",
    kind: "arrival",
    cardId: "yellow-gamble",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "h1", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 宣言色 red/blue。公開ドロー2枚が赤・青 → 宣言色が出た → 手札全捨て
      piles: { deck: ["red-jump-pad", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "yellow-gamble", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // colors=2色宣言。公開の仕方は "all"（一気に全部公開）を選ぶ
    picks: { colors: [["red", "blue"]], option: ["all"] },
    expect: [
      { kind: "tokenGone", id: "h1" }, // 宣言色が出たので手札を全て捨てた
      { kind: "publicDrawCount", player: "A", n: 0 }, // 公開ドロー分も手札扱いで全捨て
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "ザ・ギャンブル(到達): 手札を全て捨てる時、捨てる順番を選べる（フェニックス対策）",
    kind: "arrival",
    cardId: "yellow-gamble",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "h1", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "yellow-gamble", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // 宣言色 red/blue が出る → 手札全捨て。捨てる順番は h3 → h1 → h2（#344 で、1枚ずつ
    // 聞く形から「押した順に番号を付けて最後に1回だけ確定する」形に変えた）。
    picks: { colors: [["red", "blue"]], option: ["all"], handCardsOrdered: [["h3", "h1", "h2"]] },
    expect: [
      { kind: "tokenGone", id: "h1" },
      { kind: "tokenGone", id: "h2" },
      { kind: "tokenGone", id: "h3" },
      // 捨て場は「先に捨てたものが下」。選んだ順（h3=プレゼント → h1=収穫と種まき）で積まれる。
      { kind: "pileOrder", pile: "discard", cards: ["pink-present", "orange-harvest-sow", "green-growing-trees", "blue-choosable-trap", "red-jump-pad"] },
      // #344: 1枚ずつ聞くのではなく、順番付きで**1回だけ**呼ばれること（確認も1回で済む）。
      // ⚠【#517】捨てる順そのものは上の pileOrder が1枚ずつ固定している。ここで引数の文字列を
      //   見ないのは、本物が「選ばなかった札（公開ドローした2枚）を後ろに足す」ためで、
      //   その分までテストに書くと筋書きではなく実装の写しになる。
      { kind: "called", name: "pickHandCardsOrdered", n: 1 },
    ],
  },
  {
    name: "なないろの欠片(手札・選択肢): 2枚をロックする（要2枚）を選ぶ",
    kind: "hand",
    cardId: "rainbow-shard",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "rainbow-shard", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "shard2", kind: "card", cardId: "rainbow-shard", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "rainbow-shard", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // lock-pair 選択→ロック先スロット→2枚ドロー
    picks: { option: ["lock-pair"], location: [{ zone: "lock", side: "bottom", index: 0 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "lock" }, // 自身をロック
      { kind: "tokenZone", id: "shard2", zone: "lock" }, // もう1枚もロック
      { kind: "deckLen", n: 0 }, // 2枚ドロー
    ],
  },
  {
    name: "合同建設(到達・委任): 参加者全員に委任される（オーケストレーション）",
    kind: "arrival",
    cardId: "green-joint-construction",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "green-joint-construction", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "green-joint-construction", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    // 各プレイヤーの実際の配置は main.js の delegateToPlayer に委ねられる（DOM層）。
    // ここではエンジンの「参加者全員に処理順で委任する」オーケストレーションだけを検証する。
    expect: [
      { kind: "called", name: "delegateToPlayer", arg: "joint-construction", n: 2 }, // A,B の2人に委任
    ],
  },
  {
    name: "スラム上がりの役人(到達・委任): 参加者全員に委任される（オーケストレーション）",
    kind: "arrival",
    cardId: "blue-slum-official",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "blue-slum-official", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "blue-slum-official", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "called", name: "delegateToPlayer", arg: "slum-official-discard", n: 2 },
    ],
  },
  {
    name: "パーティー(到達・委任): 参加者全員に委任される（オーケストレーション）",
    kind: "arrival",
    cardId: "pink-party",
    state: {
      activePlayers: ["A", "B", "C"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "pink-party", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "pink-party", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "called", name: "delegateToPlayer", arg: "party-option", n: 3 }, // A,B,C の3人に委任
    ],
  },
  {
    name: "手品師の技スリカエ(手札・inheritsArrival): 手札を1枚捨て→相手と手札を1枚ずつ交換",
    kind: "hand",
    cardId: "yellow-sleight-of-hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "yellow-sleight-of-hand", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "amine", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "btheirs", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "yellow-sleight-of-hand", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" }, // 通常カードの手札効果は自身を先に捨てる
      { kind: "tokenZone", id: "btheirs", zone: "hand", player: "A" }, // 相手の札が自分へ
      { kind: "tokenZone", id: "amine", zone: "hand", player: "B" }, // 自分の札(amine)が相手へ
    ],
  },
  {
    name: "ザ・ギャンブル(手札): 手札1枚捨て→上記の到達効果→フェイズ終了（宣言色が出ない例）",
    kind: "hand",
    cardId: "yellow-gamble",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "yellow-gamble", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h1", kind: "card", cardId: "orange-harvest-sow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      // 宣言 red/blue に対し、公開ドロー2枚が緑・紫 → 宣言色が出ない → 手札は残る
      piles: { deck: ["green-growing-trees", "purple-trial-ritual"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "yellow-gamble", cardTokenId: "self" },
    picks: { handCard: ["h1"], colors: [["red", "blue"]], option: ["all"] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 手札効果は自身を先に捨てる
      { kind: "tokenGone", id: "h1" }, // DISCARD_ONE_HAND_CARD
      { kind: "tokenZone", id: "h2", zone: "hand", player: "A" }, // 宣言色が出ないので手札は残る
      { kind: "publicDrawCount", player: "A", n: 2 }, // 公開ドロー2枚（未合流）
      { kind: "deckLen", n: 0 },
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  {
    name: "試練の儀式(到達): 3色宣言→隣に山札から表向きで置き移動→宣言色でないので1回で終了",
    kind: "arrival",
    cardId: "purple-trial-ritual",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "purple-trial-ritual", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      // 宣言 red/blue/green に対し、置くカード yellow-gamble（黄）は不一致 → 1回で試練終了
      piles: { deck: ["yellow-gamble"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "purple-trial-ritual", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { colors: [["red", "blue", "green"]], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 4 }, // 置いたマスへ移動
      { kind: "cardAtCell", row: 3, col: 4, faceUp: true }, // 山札から表向きで置いた
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "試練の儀式(手札・inheritsArrival): 自身を捨て→3色宣言→置いて移動（1回で終了）",
    kind: "hand",
    cardId: "purple-trial-ritual",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "purple-trial-ritual", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["yellow-gamble"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "purple-trial-ritual", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { colors: [["red", "blue", "green"]], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "tokenGone", id: "self" }, // 通常カードの手札効果は自身を先に捨てる
      { kind: "pieceAt", player: "A", row: 3, col: 4 },
      { kind: "cardAtCell", row: 3, col: 4, faceUp: true },
      { kind: "deckLen", n: 0 },
    ],
  },
  {
    name: "合同建設(手札・inheritsArrival): 自身を捨て→参加者全員に委任される",
    kind: "hand",
    cardId: "green-joint-construction",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "green-joint-construction", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "green-joint-construction", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" }, // 手札効果は自身を先に捨てる
      { kind: "called", name: "delegateToPlayer", arg: "joint-construction", n: 2 },
    ],
  },
  {
    name: "スラム上がりの役人(手札): 手札1枚以下なら2枚ドロー→フェイズ終了（自身は先に捨てる）",
    kind: "hand",
    cardId: "blue-slum-official",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "self", kind: "card", cardId: "blue-slum-official", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "blue-slum-official", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" }, // 自身を先に捨てる＝手札0枚（≤1）→2枚ドロー
      { kind: "handCount", player: "A", n: 2 },
      { kind: "deckLen", n: 0 },
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  {
    name: "パーティー(手札): これを任意のマスに裏向きで置く。カードは残る",
    kind: "hand",
    cardId: "pink-party",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "pink-party", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "pink-party", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 5, col: 5 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 5, col: 5 },
      { kind: "tokenFaceDown", id: "self" },
    ],
  },
  {
    name: "なないろの欠片(到達): 到達効果は無い（自身はそのまま手札へ）",
    kind: "arrival",
    cardId: "rainbow-shard",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "rainbow-shard", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "rainbow-shard", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 到達効果は無く、既定でこのカードが手札へ
    ],
  },
  {
    name: "黒のキューブ ノワール/first-noir(手札): ノワールの色スロットに手札1枚をロック→1枚ドロー→1マス移動",
    kind: "hand",
    cardId: "first-noir",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        // ノワール自身はロックエリア（赤スロット index0）に置かれている＝ロック中でも使える
        { id: "self", kind: "card", cardId: "first-noir", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        // その赤スロットにロックできる赤の手札
        { id: "lk", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        // 1マス移動の移動先（隣にカードがあるマス）
        { id: "dst", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: ["blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-noir", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { handCard: ["lk"], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "lock" }, // ノワール自身はロックに残る（first- は捨てない）
      { kind: "tokenZone", id: "lk", zone: "lock" }, // 手札1枚をノワールの色スロットにロック
      { kind: "deckLen", n: 0 }, // 1枚ドロー
      { kind: "pieceAt", player: "A", row: 3, col: 4 }, // 1マス移動
    ],
  },
  {
    name: "ゴメンナサイッ！/purple-sorry(到達): 1マス移動する",
    kind: "arrival",
    cardId: "purple-sorry",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "dst", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "purple-sorry", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 4 }, // 隣のカードのあるマスへ1マス移動
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 既定でこのカードは手札へ
    ],
  },

  // ================= ここから 0th拡張（0th EDITION 拡張） =================
  {
    name: "赤のはじまり(到達): 捨て場の１番上のカードを手札に加える",
    kind: "arrival",
    cardId: "ex0-red-beginning",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-beginning", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
      ],
      // 捨て場は「配列の末尾＝１番上」。上は green-growing-trees の方。
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "ex0-red-beginning", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 }, // １番上の方が来る
      { kind: "handHasCard", player: "A", cardId: "red-jump-pad", n: 0 },        // ２番目は来ない
      { kind: "handCount", player: "A", n: 2 },                                   // 拾った1枚＋既定でこのカード自身
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "赤のはじまり(到達): 捨て場が空なら何も起きない（善処の原則）",
    kind: "arrival",
    cardId: "ex0-red-beginning",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-beginning", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-beginning", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handCount", player: "A", n: 1 }, // 既定でこのカード自身が手札へ入るだけ
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // 【#467】赤のはじまり（手札）。2026-11-03 にユーザー判断で「上から**２番目**」に変えた
  // （到達は１番上のまま）。使う動詞は赤のキューブ フェニックスと同じもの。
  // ⓘ 捨て場は配列の末尾が１番上。["red-jump-pad", "green-growing-trees"] なら
  //   １番上＝green-growing-trees・２番目＝red-jump-pad。
  //   退避した１番上は捨て場へ戻るので、手札に来るのは**２番目の方だけ**。
  {
    name: "赤のはじまり(手札): 自分を捨てた上での２番目＝使う直前の１番上が来る",
    kind: "hand",
    cardId: "ex0-red-beginning",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-beginning", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "ex0-red-beginning", cardTokenId: "self" },
    picks: {},
    expect: [
      // 🔴 手札効果は**発動の最初に自分自身を捨てる**ので、捨て場は
      //   [red-jump-pad, green-growing-trees, ex0-red-beginning] になる。
      //   その「上から２番目」＝ green-growing-trees ＝**使う直前の１番上**で、これが正しい
      //   （2026-11-03 ユーザー説明: 「１番上」と書くと捨てた自分を永遠に拾うので「２番目」）。
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 },
      { kind: "handHasCard", player: "A", cardId: "red-jump-pad", n: 0 }, // その下は取らない
      { kind: "pileContains", pile: "discard", cardId: "ex0-red-beginning" }, // 退避した自分は捨て場へ戻る
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  {
    name: "赤のはじまり(手札): 捨て場が空なら、自分を捨てても１枚しか無いので取れない（善処の原則）",
    kind: "hand",
    cardId: "ex0-red-beginning",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-beginning", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-beginning", cardTokenId: "self" },
    picks: {},
    expect: [
      // 自分を捨てた時点で捨て場は1枚だけ＝「２番目」が無いので何も取らない。
      { kind: "handCount", player: "A", n: 0 },
      { kind: "pileContains", pile: "discard", cardId: "ex0-red-beginning" },
      // 🔴 「このフェイズを終了する。」は**句点の原則**で、前の句が不発でも行う（既定）。
      //    ここを変えたくなったら card-effects.js 側に stopIfPreviousFailed を足すこと。
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  // --- 色寄せの笛（7色・各4枚＝計28枚。0th拡張の山札の4分の1） ---------------------
  // 到達効果・手札効果とも「①これと同色の、場の表向きのカード１枚を手札に加える
  // ／②任意の１マスのカードをオープンする」の2択（EX0_FLUTE_OPTIONS）。
  {
    name: "色寄せの笛(到達): ①同色の表向きを手札に加える（色違いは取れない）",
    kind: "arrival",
    cardId: "ex0-flute-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "flute", kind: "card", cardId: "ex0-flute-red", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        // 同色（赤）の表向き＝取れる
        { id: "redCard", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        // 色違い（青）の表向き＝取れない
        { id: "blueCard", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        // 同色（赤）だが裏向き＝取れない
        { id: "redFaceDown", kind: "card", cardId: "red-counter-lock", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-red", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["ex0-flute-pickup"], location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "tokenZone", id: "redCard", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "blueCard", zone: "cell" },      // 色違いは動かない
      { kind: "tokenZone", id: "redFaceDown", zone: "cell" },   // 裏向きは動かない
      { kind: "tokenZone", id: "flute", zone: "hand", player: "A" }, // 既定動作でこのカード自身も手札へ
      { kind: "handCount", player: "A", n: 2 },
      // CPUの自動選択が「笛自身のマス」を避けるよう avoidCells を渡しているか（#336と同じ事情）
      { kind: "called", name: "pickLocationAvoidCell", arg: "6,3" },
    ],
  },
  {
    name: "色寄せの笛(到達): ②任意の1マスをオープンする",
    kind: "arrival",
    cardId: "ex0-flute-blue",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "flute", kind: "card", cardId: "ex0-flute-blue", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        // 盤面の端（＝駒から遠い）でも選べる＝「任意の1マス」で場の全体が候補になる
        { id: "hidden", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-blue", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["ex0-flute-flip"], location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "tokenFaceUp", id: "hidden" },
      { kind: "tokenZone", id: "hidden", zone: "cell" }, // オープンするだけ＝手札には来ない
      { kind: "tokenZone", id: "flute", zone: "hand", player: "A" },
      { kind: "handCount", player: "A", n: 1 },
    ],
  },
  {
    name: "色寄せの笛(到達): どちらも対象が無ければ不発（手札に加わるだけ・善処の原則）",
    kind: "arrival",
    cardId: "ex0-flute-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        // 自分自身は緑だが、下の expect のとおり「自分を取る」以外に候補が無い状態を作るため
        // あえて笛だけを緑にし、他は色違いの表向きだけを置く（裏向きは1枚も置かない）。
        { id: "flute", kind: "card", cardId: "ex0-flute-green", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "blueCard", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-green", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 裏向きが1枚も無いので②は選べない。①は「笛自身（緑）」だけが候補なので選べてしまうが、
    // ここでは②を選んだ台本にして「対象が無い時に何も壊れない」ことを見る。
    picks: { option: ["ex0-flute-flip"], location: [] },
    expect: [
      { kind: "tokenZone", id: "blueCard", zone: "cell" },
      { kind: "tokenZone", id: "flute", zone: "hand", player: "A" }, // 不発でも手札に加わる
      { kind: "handCount", player: "A", n: 1 },
    ],
  },
  {
    name: "色寄せの笛(手札): ①同色の表向きを手札に加える（笛自身は先に捨てられる）",
    kind: "hand",
    cardId: "ex0-flute-purple",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "flute", kind: "card", cardId: "ex0-flute-purple", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "purpleCard", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "cell", row: 1, col: 1 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-purple", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["ex0-flute-pickup"], location: [{ row: 1, col: 1 }] },
    expect: [
      { kind: "tokenZone", id: "purpleCard", zone: "hand", player: "A" },
      { kind: "tokenNotInHand", id: "flute", player: "A" }, // 手札効果の既定動作で先に捨てられる
      { kind: "pileContains", pile: "discard", cardId: "ex0-flute-purple" },
      { kind: "handCount", player: "A", n: 1 },
    ],
  },
  {
    name: "色寄せの笛(手札): ②任意の1マスをオープンする",
    kind: "hand",
    cardId: "ex0-flute-yellow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "flute", kind: "card", cardId: "ex0-flute-yellow", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "hidden", kind: "card", cardId: "yellow-gamble", faceUp: false, location: { zone: "cell", row: 5, col: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-yellow", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["ex0-flute-flip"], location: [{ row: 5, col: 0 }] },
    expect: [
      { kind: "tokenFaceUp", id: "hidden" },
      { kind: "tokenZone", id: "hidden", zone: "cell" },
      { kind: "handCount", player: "A", n: 0 },
    ],
  },
  {
    name: "色寄せの笛(到達): ①は同色の表向きが無いと何も起きない（色の絞り込みの検査）",
    kind: "arrival",
    cardId: "ex0-flute-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 0, col: 3 } },
        // 🔴 笛自身を「橙」にして、場に赤の表向きが1枚も無い状態を作る（笛自身も候補にならない）。
        { id: "flute", kind: "card", cardId: "ex0-flute-orange", faceUp: true, location: { zone: "cell", row: 0, col: 3 } },
        { id: "blueCard", kind: "card", cardId: "blue-choosable-trap", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "orangeFaceDown", kind: "card", cardId: "orange-mass-change", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-orange", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 0, col: 3 } },
    // ①を選ぶが、同色（橙）の表向きが場に無いので何も起きない＝不発。
    // もし色や表裏の絞り込みが壊れていたら、ここで青か裏向きの橙が手札に入ってしまう。
    picks: { option: ["ex0-flute-pickup"], location: [{ row: 3, col: 3 }] },
    expect: [
      { kind: "tokenZone", id: "blueCard", zone: "cell" },        // 色違いは取られない
      { kind: "tokenZone", id: "orangeFaceDown", zone: "cell" },  // 同色でも裏向きは取られない
      { kind: "tokenFaceDown", id: "orangeFaceDown" },            // オープンもされない
      { kind: "tokenZone", id: "flute", zone: "hand", player: "A" },
      { kind: "handCount", player: "A", n: 1 },                   // 笛自身だけ
    ],
  },
  // --- 大地創造（緑・4枚） -------------------------------------------------------
  {
    name: "大地創造(到達): 何もない4マスに山札から置いてオープンする",
    kind: "arrival",
    cardId: "ex0-green-creation",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-creation", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change", "yellow-gamble", "pink-party"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-green-creation", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 5, col: 5 }] },
    expect: [
      { kind: "cardAtCell", row: 0, col: 0, faceUp: true },
      { kind: "cardAtCell", row: 0, col: 1, faceUp: true },
      { kind: "cardAtCell", row: 0, col: 2, faceUp: true },
      { kind: "cardAtCell", row: 5, col: 5, faceUp: true },
      { kind: "deckLen", n: 1 },                 // 5枚のうち4枚使った
      { kind: "boardCardCount", n: 4 },          // 自分自身は最後に手札へ入るので盤面は置いた4枚
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "大地創造(到達): 山札が1枚しか無ければ1枚だけ置く（善処の原則）",
    kind: "arrival",
    cardId: "ex0-green-creation",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-creation", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-green-creation", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "cardAtCell", row: 0, col: 0, faceUp: true },
      { kind: "deckLen", n: 0 },
      { kind: "boardCardCount", n: 1 },
    ],
  },

  // --- 迷いの森（緑・5枚） -------------------------------------------------------
  {
    name: "迷いの森(到達): 1枚ドロー→カードの無い4マスに裏向きで置く→隣のカードをすべて捨てる",
    kind: "arrival",
    cardId: "ex0-green-lost-forest",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-lost-forest", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        // 隣（前後左右）に2枚。これらは最後に捨てられる。
        { id: "nb1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "nb2", kind: "card", cardId: "pink-present", faceUp: false, location: { zone: "cell", row: 3, col: 4 } },
        // 斜め（＝「隣」ではない）。捨てられない。
        { id: "diag", kind: "card", cardId: "blue-slum-official", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change", "yellow-gamble", "pink-party"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-green-lost-forest", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 5, col: 5 }] },
    expect: [
      { kind: "cardAtCell", row: 0, col: 0, faceUp: false }, // オープンしない
      { kind: "cardAtCell", row: 5, col: 5, faceUp: false },
      { kind: "pileContains", pile: "discard", cardId: "purple-sorry" }, // 隣は捨てられる
      { kind: "pileContains", pile: "discard", cardId: "pink-present" },
      { kind: "tokenZone", id: "diag", zone: "cell" },                   // 斜めは残る
      { kind: "deckLen", n: 0 },                                         // ドロー1＋置く4
      { kind: "handCount", player: "A", n: 2 },                          // 引いた1枚＋自分自身
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "迷いの森(手札): これをあなたの隣以外・プレイヤーのいないマスに表向きで置く",
    kind: "hand",
    cardId: "ex0-green-lost-forest",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-lost-forest", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-green-lost-forest", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 0, col: 0 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 }, // 自分自身が盤面へ出るので手札は空
    ],
  },

  // --- 不思議な果実（桃・4枚。到達効果だけ自動処理） --------------------------------
  {
    name: "不思議な果実(到達): 手札が偶数枚ならドローしない（#494 で偶数が当たりに変わった）",
    kind: "arrival",
    cardId: "ex0-pink-mystic-fruit",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-mystic-fruit", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-mystic-fruit", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 2 },                // 手札1枚＝奇数なのでドローしない
      { kind: "handCount", player: "A", n: 2 }, // 元の1枚＋自分自身
    ],
  },
  {
    name: "不思議な果実(到達): 手札が偶数枚なら1枚ドロー（#494）",
    kind: "arrival",
    cardId: "ex0-pink-mystic-fruit",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-mystic-fruit", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-mystic-fruit", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },                // 手札2枚＝偶数なので1枚ドロー
      { kind: "handCount", player: "A", n: 4 }, // 元の2枚＋引いた1枚＋自分自身
    ],
  },

  // --- バッドバーガー（黒・2枚） ---------------------------------------------------
  {
    name: "バッドバーガー(到達): 1枚ドロー→中央か四隅の駒のいない1マスへ手札を全部置く",
    kind: "arrival",
    cardId: "ex0-black-bad-burger",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-black-bad-burger", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-black-bad-burger", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 3, col: 3 }] },
    expect: [
      { kind: "tokenAtCell", id: "h1", row: 3, col: 3 },
      { kind: "tokenAtCell", id: "h2", row: 3, col: 3 },
      { kind: "deckLen", n: 1 },                // 1枚ドローした
      { kind: "boardCardCount", n: 3 },         // 置いた3枚（手札2＋引いた1）。自分自身は手札へ
      { kind: "handCount", player: "A", n: 1 }, // 自分自身だけ
    ],
  },
  {
    name: "バッドバーガー(手札): 任意の1マスのカードをすべて捨てる→1枚ドロー",
    kind: "hand",
    cardId: "ex0-black-bad-burger",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-black-bad-burger", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "c1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "c2", kind: "card", cardId: "pink-present", faceUp: false, location: { zone: "cell", row: 2, col: 2 } },
        { id: "keep", kind: "card", cardId: "blue-slum-official", faceUp: true, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-black-bad-burger", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "pileContains", pile: "discard", cardId: "purple-sorry" },
      { kind: "pileContains", pile: "discard", cardId: "pink-present" },
      { kind: "tokenZone", id: "keep", zone: "cell" },  // 選んでいないマスは残る
      { kind: "deckLen", n: 0 },                        // 1枚ドローした
      { kind: "handCount", player: "A", n: 1 },         // 引いた1枚（自分自身は捨てられる）
      { kind: "pileContains", pile: "discard", cardId: "ex0-black-bad-burger" },
    ],
  },

  // --- ピュアバーガー（白・2枚。手札効果だけ自動処理） ------------------------------
  {
    name: "ピュアバーガー(手札): 選んだマスの裏向きのカードの枚数分ドロー",
    kind: "hand",
    cardId: "ex0-white-pure-burger",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-white-pure-burger", faceUp: true, location: { zone: "hand", player: "A" } },
        // (1,1) に裏向き3枚＋表向き1枚 → 3枚ドロー（表向きは数えない）
        { id: "d1", kind: "card", cardId: "purple-sorry", faceUp: false, location: { zone: "cell", row: 1, col: 1 } },
        { id: "d2", kind: "card", cardId: "pink-present", faceUp: false, location: { zone: "cell", row: 1, col: 1 } },
        { id: "d3", kind: "card", cardId: "green-growing-trees", faceUp: false, location: { zone: "cell", row: 1, col: 1 } },
        { id: "u1", kind: "card", cardId: "blue-slum-official", faceUp: true, location: { zone: "cell", row: 1, col: 1 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change", "yellow-gamble"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-white-pure-burger", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 1, col: 1 }] },
    expect: [
      { kind: "deckLen", n: 1 },                // 4枚のうち3枚引いた
      { kind: "handCount", player: "A", n: 3 }, // 自分自身は捨てられる
      { kind: "pileContains", pile: "discard", cardId: "ex0-white-pure-burger" },
    ],
  },
  // --- 厳重警戒（青・4枚） -------------------------------------------------------
  {
    name: "厳重警戒(到達): ①手札が1枚になるように捨てる",
    kind: "arrival",
    cardId: "ex0-blue-strict-watch",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-blue-strict-watch", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-strict-watch", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["ex0-strict-discard-to-1"], handCardsOrdered: [["h1", "h2"]] },
    expect: [
      { kind: "pileContains", pile: "discard", cardId: "purple-sorry" },
      { kind: "pileContains", pile: "discard", cardId: "pink-present" },
      { kind: "tokenZone", id: "h3", zone: "hand", player: "A" },     // 1枚だけ残る
      { kind: "handCount", player: "A", n: 2 },                        // 残り1枚＋自分自身
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  {
    name: "厳重警戒(到達): ②自分のゲートへ強制移動。移動先はオープンしない（印を検査）",
    kind: "arrival",
    cardId: "ex0-blue-strict-watch",
    state: {
      // A の座席は南（手前）。ゲートは board-layout.js の GATE_POSITIONS で (6,3)。
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-blue-strict-watch", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        // 自分のゲートに裏向きのカード。オープンされてはいけない。
        { id: "gateCard", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 6, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-strict-watch", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { option: ["ex0-strict-gate"] },
    expect: [
      { kind: "pieceAt", player: "A", row: 6, col: 3 },
      { kind: "tokenFaceDown", id: "gateCard" },
      // 🔴 ここが本題。この印が立っていないと、本物（main.js / remote-move-animator）が
      //   「表向きカードの上にいる＝到達した」と判断して移動先を自動でオープンしてしまう。
      { kind: "tokenFlag", id: "pieceA", flag: "arrivalSuppressed", value: true },
    ],
  },
  {
    name: "厳重警戒(手札): これをプレイヤーのいないマスに表向きで置く",
    kind: "hand",
    cardId: "ex0-blue-strict-watch",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "ex0-blue-strict-watch", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-strict-watch", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    // (0,0) には B の駒がいるので候補に入らない。resolveLocation は候補に無い指定も
    // そのまま返してしまうため、ここでは**候補に在る (1,1)** を指定して正しく置けることを見る。
    picks: { location: [{ row: 1, col: 1 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 1, col: 1 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
    ],
  },
  {
    name: "色寄せの笛(到達・桃): 7色とも同じ2択を共有していることの確認",
    kind: "arrival",
    cardId: "ex0-flute-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "flute", kind: "card", cardId: "ex0-flute-pink", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "pinkCard", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "cell", row: 2, col: 5 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-flute-pink", cardTokenId: "flute", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["ex0-flute-pickup"], location: [{ row: 2, col: 5 }] },
    expect: [
      { kind: "tokenZone", id: "pinkCard", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "flute", zone: "hand", player: "A" },
      { kind: "handCount", player: "A", n: 2 },
    ],
  },
  // --- 置くだけの手札効果（0th拡張・第4弾） ---------------------------------------
  // 🔴 候補の数（pickLocationCandidates）も検査する。49マスから何マス外したかで、
  //   「あなたの隣以外」「あなたの周囲以外」が効いているかが分かる。
  {
    name: "オレンジバス(手札): これをあなたの隣以外のマスに表向きで置く（候補45マス）",
    kind: "hand",
    cardId: "ex0-orange-bus",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 0, col: 0 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
      { kind: "called", name: "pickLocationCandidates", arg: "45" }, // 49 − 隣4
    ],
  },
  {
    name: "平和への願い(手札): 1枚ドロー→これをあなたの隣以外のマスに裏向きで置く",
    kind: "hand",
    cardId: "ex0-pink-wish-for-peace",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-wish-for-peace", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-wish-for-peace", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 6, col: 6 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 6, col: 6 },
      { kind: "tokenFaceDown", id: "self" },   // 裏向きで置く
      { kind: "deckLen", n: 0 },               // 1枚ドローした
      { kind: "handCount", player: "A", n: 1 }, // 引いた1枚だけ（自分自身は盤面へ）
      { kind: "called", name: "pickLocationCandidates", arg: "45" },
    ],
  },
  {
    name: "バスストップ(手札)①: 手札を1枚捨てて、これを任意のマスに表向きで置く（自分は捨てない）",
    kind: "hand",
    cardId: "ex0-orange-bus-stop",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus-stop", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["ex0-busstop-discard-faceup"], handCard: ["h1"], location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "pileContains", pile: "discard", cardId: "purple-sorry" },
      { kind: "pileContains", pile: "discard", cardId: "ex0-orange-bus-stop", n: 0 }, // 自分は捨てない
      { kind: "tokenAtCell", id: "self", row: 2, col: 2 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
      { kind: "called", name: "pickLocationCandidates", arg: "49" }, // 「任意のマス」なので全部
    ],
  },
  {
    name: "バスストップ(手札)②: これを任意のマスに裏向きで置く",
    kind: "hand",
    cardId: "ex0-orange-bus-stop",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus-stop", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["ex0-busstop-facedown"], location: [{ row: 5, col: 1 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 5, col: 1 },
      { kind: "tokenFaceDown", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
    ],
  },
  {
    name: "ゲートチャージ(手札): これをあなたのゲートに表向きで置く（聞かずに決まる）",
    kind: "hand",
    cardId: "ex0-yellow-gate-charge",
    state: {
      // A の座席は南（手前）＝ゲートは (6,3)。board-layout.js の GATE_POSITIONS より。
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-gate-charge", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-gate-charge", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenAtCell", id: "self", row: 6, col: 3 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
      { kind: "called", name: "pickLocation", n: 0 }, // 選ぶ余地が無いので聞かない
    ],
  },
  {
    name: "誰かの白きカゲ(手札): これをあなたの周囲以外のマスに裏向きで置く（候補41マス）",
    kind: "hand",
    cardId: "ex0-white-someones-shadow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-white-someones-shadow", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-white-someones-shadow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "tokenAtCell", id: "self", row: 0, col: 0 },
      { kind: "tokenFaceDown", id: "self" },
      // 🔴 49 − 周囲8（斜めも含む）＝41。「隣」なら45になるので、ここで取り違えが分かる。
      { kind: "called", name: "pickLocationCandidates", arg: "41" },
    ],
  },
  {
    name: "やり直しのカギ(到達): 手札を任意の枚数捨てて、同じ枚数ドローする",
    kind: "arrival",
    cardId: "ex0-purple-redo-key",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-purple-redo-key", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "h1", kind: "card", cardId: "purple-sorry", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h2", kind: "card", cardId: "pink-present", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-redo-key", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 3枚のうち2枚だけ捨てる（「任意の枚数」なので全部でなくてよい）。
    picks: { handCardsOrdered: [["h1", "h2"]] },
    expect: [
      // 🔴【#517】「押した分だけ」で呼んでいること自体を見る。これが無いと、モーダルは
      //   「全部捨てる。選ぶのは順番だけ」の意味になり、h3 まで捨てられる（報告の事故）。
      { kind: "called", name: "pickHandCardsOrderedAnyCount" },
      { kind: "pileContains", pile: "discard", cardId: "purple-sorry" },
      { kind: "pileContains", pile: "discard", cardId: "pink-present" },
      { kind: "tokenZone", id: "h3", zone: "hand", player: "A" }, // 捨てなかった分は残る
      { kind: "deckLen", n: 1 },                                   // 2枚ドローした
      { kind: "handCount", player: "A", n: 4 },                    // 残り1＋引いた2＋自分自身
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // --- バスストップの到達効果（0th拡張・第5弾） -----------------------------------
  // 「これはあなたの手札に加えない。このターンにこれがオープンされたのなら、１枚ドロー。」
  // 🔴 openedThisTurn は**この筋書き専用の仕掛け**（effect-runner.mjs が
  //   eng.noteCardOpenedThisTurn を呼ぶ）。これが無いとこの枝を一度も通せない。
  {
    name: "バスストップ(到達): このターンにオープンされたなら1枚ドロー（手札には加えない）",
    kind: "arrival",
    cardId: "ex0-orange-bus-stop",
    openedThisTurn: ["self"],
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus-stop", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },                                  // 1枚ドローした
      { kind: "handCount", player: "A", n: 1 },                   // 引いた1枚だけ
      { kind: "tokenZone", id: "self", zone: "cell" },             // 🔴 手札に加えない＝盤面に残る
      { kind: "tokenAtCell", id: "self", row: 2, col: 2 },
    ],
  },
  {
    name: "バスストップ(到達): 既に表向きだったならドローしない（手札にも加えない）",
    kind: "arrival",
    cardId: "ex0-orange-bus-stop",
    // openedThisTurn を指定しない＝このターンにオープンされていない。
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus-stop", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 2 },                       // ドローしていない
      { kind: "handCount", player: "A", n: 0 },
      { kind: "tokenZone", id: "self", zone: "cell" },  // 盤面に残る
    ],
  },
  // ===== 0th拡張 第5・6弾 =====
  // やり直しのカギ（手札）。「相手がロックを宣言した時に使える。その相手はこのターンに
  // ロックできない。」
  {
    name: "やり直しのカギ(手札): 相手がロックを宣言した窓で使うと、その相手はこのターンロックできない",
    kind: "hand",
    interruptWindow: { kind: "lock-declare", player: "B" },
    state: {
      activePlayers: ["A", "B"], turnPlayer: "B", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "ex0-purple-redo-key", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-redo-key", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "lockDisabled", player: "B", value: true },
      { kind: "lockDisabled", player: "A", value: false }, // 自分は止まらない
      { kind: "pileContains", pile: "discard", cardId: "ex0-purple-redo-key" },
    ],
  },
  // 🔴 窓が開いていない時は使えない（これが無いと、どの割り込みの場面でも使えてしまう）。
  {
    name: "やり直しのカギ(手札): ロック宣言の窓が開いていなければ使えない",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "B", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-purple-redo-key", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-redo-key", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "lockDisabled", player: "B", value: false },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 捨てられてもいない
    ],
  },
  // 🔴 自分がロックを宣言した窓では使えない（「**相手が**ロックを宣言した時」）。
  {
    name: "やり直しのカギ(手札): 自分がロックを宣言した窓では使えない",
    kind: "hand",
    interruptWindow: { kind: "lock-declare", player: "A" },
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-purple-redo-key", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-redo-key", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "lockDisabled", player: "A", value: false },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // リーチキャンセル（手札）。実行は main.js の専用の窓（到達効果の処理の直前）が行うので、
  // ふだんの経路では使えないままにしてある。
  {
    name: "リーチキャンセル(手札): ふだんの経路では使えない（専用の窓だけで使える）",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-reach-cancel", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-reach-cancel", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
      { kind: "deckLen", n: 1 },
    ],
  },
  // ヴィヴィアン（到達）。「相手を１人選ぶ。その相手はムーブフェイズを行う。その相手が
  // 到達したカードを自分の手札に加えるなら、代わりにそのカードをあなたの手札に加える。」
  // 🔴 realArrivalChain を立てて、**到達を実際に起こして**手札の行き先を検査する。
  {
    name: "ヴィヴィアン(到達): 相手が1マス移動して到達し、そのカードは自分（使用者）の手札に入る",
    kind: "arrival",
    realArrivalChain: true,
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "ex0-purple-vivian", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "tgt", kind: "card", cardId: "ex0-pink-mystic-fruit", faceUp: false, location: { zone: "cell", row: 0, col: 1 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-vivian", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { player: ["B"], delegate: [{ row: 0, col: 1 }] },
    expect: [
      { kind: "called", name: "delegateToPlayer", arg: "choose-cell" },
      { kind: "pieceAt", player: "B", row: 0, col: 1 },
      { kind: "tokenFaceUp", id: "tgt" },                            // 移動でオープンされる
      { kind: "tokenZone", id: "tgt", zone: "hand", player: "A" },   // 🔴 Bではなく A の手札へ
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },  // ヴィヴィアン自身は既定どおり
    ],
  },
  // 我忘れの白き龍（到達）。「１枚ドロー。１マス強制移動する。」
  // ⓘ 補足「これに到達しても、これをあなたの手札に加えない。」
  {
    name: "我忘れの白き龍(到達): 1枚ドローして1マス強制移動。これは手札に加えない",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-white-dragon", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-white-dragon", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 3 }] },
    expect: [
      { kind: "deckLen", n: 1 },
      { kind: "pieceAt", player: "A", row: 2, col: 3 },
      { kind: "tokenAtCell", id: "self", row: 3, col: 3 }, // 盤面に残る（手札に入らない）
      { kind: "handCount", player: "A", n: 1 },            // ドローした1枚だけ
    ],
  },
  // 我忘れの白き龍（手札）。「これを任意のマスに表向きで置く。」
  {
    name: "我忘れの白き龍(手札): これを任意のマスに表向きで置く（候補49マス）",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-white-dragon", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-white-dragon", cardTokenId: "self" },
    picks: { location: [{ row: 1, col: 1 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "49" },
      { kind: "tokenAtCell", id: "self", row: 1, col: 1 },
      { kind: "tokenFaceUp", id: "self" },
    ],
  },
  // ===== 0th拡張 第3・4弾 =====
  // マックール（到達）。「あなたの隣のマスのカードを２枚、あなたの手札に加える。」
  {
    name: "マックール(到達): 隣のマスのカードを2枚、手札に加える",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-orange-mccool", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "n1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "n2", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 3, col: 4 } },
        { id: "far", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-mccool", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 3 }, { row: 3, col: 4 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // 隣でカードがあるのは2マス（遠くは候補外）
      { kind: "tokenZone", id: "n1", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "n2", zone: "hand", player: "A" },
      { kind: "tokenAtCell", id: "far", row: 0, col: 0 },
    ],
  },
  // マックール（手札）。「【追色１】相手を１人選ぶ。その相手の周囲に強制移動する。
  // 移動先のカードはオープンしない。このターンを終了する。」
  {
    name: "マックール(手札): 追色1→相手の周囲へ強制移動（オープンしない）→ターン終了",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 0, col: 0 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-orange-mccool", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "ex0-orange-bus", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-mccool", cardTokenId: "self" },
    picks: { discardCost: ["cost"], location: [{ row: 3, col: 3 }, { row: 2, col: 2 }] },
    expect: [
      { kind: "called", name: "pickDiscardCost", arg: "cost" },
      { kind: "pieceAt", player: "A", row: 2, col: 2 },      // Bの周囲（斜め）へ
      { kind: "tokenFlag", id: "pieceA", flag: "arrivalSuppressed", value: true }, // オープンしない印
      { kind: "called", name: "endTurn", arg: "A" },
    ],
  },
  // リトルマウス（到達）。「１番多くロックしているプレイヤーを１人選ぶ。そのプレイヤーの
  // 手札から無作為に２枚、あなたの手札に加える。」
  {
    name: "リトルマウス(到達): 1番多くロックしている相手から無作為に2枚奪う",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-little-mouse", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "lockB", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "left", index: 0 } },
        { id: "bh1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "B" } },
        { id: "bh2", kind: "card", cardId: "white-radiance", faceUp: true, location: { zone: "hand", player: "B" } },
        { id: "bh3", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-little-mouse", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { player: ["B"] },
    expect: [
      { kind: "handCount", player: "B", n: 1 },
      { kind: "handCount", player: "A", n: 3 }, // 奪った2枚＋到達した自分自身
    ],
  },
  // 【#478】リトルマウス（到達）。相手の手札が**1枚しか無い**時。
  // ユーザーの問い「不発ではなく、善処の原則で1枚を奪います。でいいよね？」→ そのとおり。
  // ⚠ これは**テストでは元から通っていた**（スタブが本物より豊かだったため）。本番で
  //   一度も奪えていなかった原因は「到達側の helpers に口が無い」ことで、そちらは
  //   tools/check-effect-helpers.mjs が見張る。ここはルールの側を固定するテスト。
  {
    name: "リトルマウス(到達): 相手の手札が1枚なら、不発ではなく1枚だけ奪う（善処の原則）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-little-mouse", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "lockB", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "left", index: 0 } },
        { id: "bh1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-little-mouse", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { player: ["B"] },
    expect: [
      { kind: "handCount", player: "B", n: 0 },
      { kind: "handCount", player: "A", n: 2 }, // 奪った1枚＋到達した自分自身
      { kind: "handHasCard", player: "A", cardId: "red-jump-pad", n: 1 },
    ],
  },
  // ピーターフッド（到達）。「あなたの隣に山札から３枚ずつ裏向きで置く。」
  {
    name: "ピーターフッド(到達): 隣の4マスに山札から3枚ずつ裏向きで置く（計12枚）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-peterhood", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: {
        deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad"],
        eternal: [], first: [], discard: [],
      },
    },
    ctx: { player: "A", cardId: "ex0-green-peterhood", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },
      // 【#538・2026-11-10】置くマスの順番を選べるようにしたので、4マスの候補から聞かれる。
      { kind: "called", name: "pickLocationCandidates", arg: "4" },
      { kind: "cellStackOrder", row: 2, col: 3, cards: ["red-jump-pad", "red-jump-pad", "red-jump-pad"] },
      { kind: "cardAtCell", row: 3, col: 2, faceUp: false },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // ピーターフッド（手札）。「１〜７の数字を１つ選ぶ。全員は手札がその枚数になるように
  // ドローする、または捨てる。このフェイズを終了する。」
  // 🔴 A は多いので捨てる（委任）・B は少ないのでドロー、の両方が走ることを見る。
  {
    name: "ピーターフッド(手札): 選んだ枚数になるよう、多い人は捨て、少ない人はドローする",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-green-peterhood", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "ah1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "ah2", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "ah3", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-green-peterhood", cardTokenId: "self" },
    picks: { number: [1], delegate: [true] },
    expect: [
      { kind: "called", name: "pickNumber", arg: "1" },
      { kind: "called", name: "delegateToPlayer", arg: "discard-down-to" }, // Aは3枚→1枚（本人に聞く）
      { kind: "called", name: "delegateToPlayerArg", arg: JSON.stringify({ n: 1 }) },
      { kind: "handCount", player: "B", n: 1 },                              // Bは0枚→1枚ドロー
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  // ヤエザ（到達）。「相手を１人選ぶ。その相手はこれを自分の手札に加え、…」
  {
    name: "ヤエザ(到達): 選んだ相手の手札にこれが入り、2択はその相手に委任する",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-yaeza", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-yaeza", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { delegate: [true] },
    expect: [
      { kind: "tokenZone", id: "self", zone: "hand", player: "B" }, // 自分の手札には入らない
      { kind: "called", name: "delegateToPlayer", arg: "yaeza-option" },
      { kind: "handCount", player: "A", n: 0 },
    ],
  },
  // ヴド族との契約（到達）。「全員は手札が２枚以下になるように捨てる。そうしたなら、
  // 自分の手札を１枚ロックしてもよい、ただし最後のロックはできない。」
  // ⚠ 「自分の」を**『全員』それぞれ**と読んだ実装（ユーザー確認待ち）。
  {
    name: "ヴド族との契約(到達): 手札が3枚以上の人だけが捨て、捨てた人はロックしてもよい",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-black-vood-contract", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "ah1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "ah2", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "ah3", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "bh1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-black-vood-contract", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { delegate: [true, true] },
    expect: [
      { kind: "called", name: "delegateToPlayer", arg: "discard-down-to", n: 1 },      // Aだけ（Bは1枚なので対象外）
      { kind: "called", name: "delegateToPlayer", arg: "may-lock-one-except-final", n: 1 },
    ],
  },
  // 平和への願い（到達）。この時点では**何も起きない**（印を付けて次の自分のターンへ持ち越す）。
  {
    name: "平和への願い(到達): その場では何も起きず、盤面に残って持ち越される",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-wish-for-peace", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-wish-for-peace", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 2 },                            // まだドローしない
      { kind: "tokenAtCell", id: "self", row: 3, col: 3 },   // 手札に入らず盤面に残る
      { kind: "tokenFaceUp", id: "self" },
      { kind: "handCount", player: "A", n: 0 },
    ],
  },
  // 紅の鉄拳（到達）①。「【追色１】２枚ドロー。」
  {
    name: "紅の鉄拳(到達)①: 追色1を払って2枚ドロー",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-crimson-fist", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "cost", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-crimson-fist", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["ex0-fist-draw"], discardCost: ["cost"] },
    expect: [
      { kind: "called", name: "pickDiscardCost", arg: "cost" },
      { kind: "pileContains", pile: "discard", cardId: "red-jump-pad" },
      { kind: "deckLen", n: 1 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // 紅の鉄拳（到達）②。「あなたの周囲の相手を１人選ぶ。その相手に接触する。」
  // 🔴 「周囲」＝斜めも含む8マス。ふだんの接触は隣だけなので、**ここだけ斜めに届く**。
  {
    name: "紅の鉄拳(到達)②: 周囲（斜めも）の相手に接触を宣言する",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-red-crimson-fist", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-crimson-fist", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["ex0-fist-contact"] },
    expect: [
      { kind: "called", name: "initiateContact", arg: "B" },
      // 🔴 到達の②は**通常の接触と同じ1枚**（ユーザー回答）＝枚数を渡さない。
      { kind: "called", name: "initiateContactSteal", arg: "既定" },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // 紅の鉄拳（手札）。「【追色S】あなたの周囲の相手を１人選ぶ。その相手に接触する。」
  // 　補足「接触で奪えるカードはSの２倍の枚数である。」
  // 🔴 Sは**使う人が決める**（手札にある同色のカードの枚数まで）。ここでは赤を2枚持っていて
  //   S=2 を選ぶので、**赤2枚を捨てて、奪う枚数は4**になる。
  {
    name: "紅の鉄拳(手札): 追色Sを2枚払うと、奪う枚数が4（Sの2倍）になる",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-red-crimson-fist", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "r1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "r2", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-crimson-fist", cardTokenId: "self" },
    picks: { discardCost: ["r1", "r2"], number: [2] },
    expect: [
      { kind: "called", name: "pickNumber", arg: "2" }, // Sを聞く
      { kind: "called", name: "pickDiscardCost", n: 2 }, // 赤を2枚払う
      { kind: "pileContains", pile: "discard", cardId: "red-jump-pad" },
      { kind: "pileContains", pile: "discard", cardId: "red-counter-lock" },
      { kind: "called", name: "initiateContact", arg: "B" },
      { kind: "called", name: "initiateContactSteal", arg: "4" }, // 🔴 Sの2倍
      { kind: "pileContains", pile: "discard", cardId: "ex0-red-crimson-fist" }, // 使用時に捨てる既定
    ],
  },
  // 紅の鉄拳（手札）。赤が1枚しか無ければ S は 1 しか選べないので**聞かない**＝奪うのは2枚。
  {
    name: "紅の鉄拳(手札): 払える赤が1枚だけなら聞かずにS=1（奪う枚数は2）",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-red-crimson-fist", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "r1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-crimson-fist", cardTokenId: "self" },
    picks: { discardCost: ["r1"] },
    expect: [
      { kind: "called", name: "pickNumber", n: 0 }, // 選ぶ余地が無いので聞かない
      { kind: "called", name: "pickDiscardCost", n: 1 },
      { kind: "called", name: "initiateContactSteal", arg: "2" },
    ],
  },
  // ===== 0th拡張 第2弾 =====
  // 鑑定士の技（到達）。「任意の１マスの裏向きのカードの表面を見る。」
  // 🔴 **見るだけ＝盤面は変わらない**（めくらない）ことも検査する。
  {
    name: "鑑定士の技(到達): 裏向きのカードの表面を見る（めくらない）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-blue-appraiser", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "fd1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
        { id: "fd2", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-appraiser", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 4, col: 4 }] },
    expect: [
      { kind: "called", name: "peekCards", arg: "red-jump-pad" },
      { kind: "tokenFaceDown", id: "fd1" }, // 見ただけなので裏向きのまま
      { kind: "tokenFaceDown", id: "fd2" },
      { kind: "deckLen", n: 1 },
    ],
  },
  // 鑑定士の技（手札）。「色を２色宣言する。プレイヤーのいない１マスの裏向きのカードを
  // オープンし、あなたの手札に加える。そのカードが宣言色なら、ここまでを繰り返す。」
  // 🔴 1枚目は当たり（赤）→ 繰り返し、2枚目は外れ（白）→ 止まる。**外れた札も手札に入る**
  //   （「加える」が「宣言色なら」より前の句だから）。
  {
    name: "鑑定士の技(手札): 当たれば繰り返し、外れたら止まる（外れた札も手札に入る）",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-blue-appraiser", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "fd1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
        { id: "fd2", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-appraiser", cardTokenId: "self" },
    picks: { colors: [["red", "blue"], ["red", "blue"]], location: [{ row: 4, col: 4 }, { row: 0, col: 0 }] },
    expect: [
      { kind: "tokenZone", id: "fd1", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "fd2", zone: "hand", player: "A" },
      { kind: "called", name: "declareColors", n: 2 }, // 繰り返すたびに宣言し直す
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  // ジェイク（手札）。「…ただし計７枚までしかオープンできない。７枚目が宣言色なら、
  // それら７枚をあなたの手札に加える。」
  // 🔴 **途中で外れたら1枚も手札に入らない**（鑑定士の技との一番大きな違い）。
  {
    name: "ジェイク(手札): 途中で外れたら、オープンした札は手札に入らない",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-blue-jake", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "fd1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
        { id: "fd2", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-jake", cardTokenId: "self" },
    picks: { colors: [["red"], ["red"]], location: [{ row: 4, col: 4 }, { row: 0, col: 0 }] },
    expect: [
      { kind: "tokenAtCell", id: "fd1", row: 4, col: 4 }, // 盤面に残る
      { kind: "tokenFaceUp", id: "fd1" },                 // オープンはされた
      { kind: "tokenFaceUp", id: "fd2" },
      { kind: "handCount", player: "A", n: 0 },           // 1枚も手札に入らない
      { kind: "called", name: "endTurn", arg: "A" },
    ],
  },
  // ジェイク（手札）。7枚とも当たり＝全部もらえる枝。
  {
    name: "ジェイク(手札): 7枚とも宣言色なら、その7枚すべてを手札に加える",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-blue-jake", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "r0", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
        { id: "r1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 1 } },
        { id: "r2", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 2 } },
        { id: "r3", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 3 } },
        { id: "r4", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 4 } },
        { id: "r5", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 5 } },
        { id: "r6", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 6 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-blue-jake", cardTokenId: "self" },
    picks: {
      colors: [["red"], ["red"], ["red"], ["red"], ["red"], ["red"], ["red"]],
      location: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 }],
    },
    expect: [
      { kind: "handCount", player: "A", n: 7 },
      { kind: "boardCardCount", n: 0 },
      { kind: "called", name: "declareColors", n: 7 },
      { kind: "called", name: "endTurn", arg: "A" },
    ],
  },
  // ピュアバーガー（到達）。「プレイヤーのいないマスを１マス選ぶ。全員は１枚ドローし、
  // 自分の手札から１枚をそのマスの１番上に置く。」
  // 🔴 「どの手札を置くか」は本人に聞く＝委任。置く先のマスを**引数で渡している**ことも検査する。
  {
    name: "ピュアバーガー(到達): 全員1枚ドローし、置く先のマスを委任の引数で各自へ渡す",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 6, col: 6 } },
        { id: "self", kind: "card", cardId: "ex0-white-pure-burger", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-white-pure-burger", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 1, col: 1 }], delegate: [true, true] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "47" }, // 49 − 駒2つ
      { kind: "called", name: "delegateToPlayer", arg: "place-hand-card-at-cell", n: 2 },
      { kind: "called", name: "delegateToPlayerArg", arg: JSON.stringify({ row: 1, col: 1 }) },
      { kind: "deckLen", n: 1 }, // 2人が1枚ずつ引いた
    ],
  },
  // 不思議な果実（手札）。使用条件「あなたの隣の２マス以上にカードが置かれている時に使える。」
  {
    name: "不思議な果実(手札): 隣のカードが1マスだけなら使えない",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-pink-mystic-fruit", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "c1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-mystic-fruit", cardTokenId: "self" },
    picks: {},
    expect: [
      { kind: "deckLen", n: 2 },                       // 何も起きない
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 捨てられてもいない
    ],
  },
  {
    name: "不思議な果実(手札): 隣が2マスなら使える。右隣の相手が動かす先を決め、フェイズを終了する（#494）",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 6, col: 6 } },
        { id: "self", kind: "card", cardId: "ex0-pink-mystic-fruit", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "c1", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "c2", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: ["red-jump-pad", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-pink-mystic-fruit", cardTokenId: "self" },
    picks: { delegate: [{ row: 2, col: 3 }] },
    expect: [
      { kind: "deckLen", n: 2 },                                   // #494: ドローは無くなった
      { kind: "called", name: "delegateToPlayer", arg: "choose-cell" },
      { kind: "called", name: "delegateToPlayer", arg: "B" },      // Aの右隣（2人なら相手）
      { kind: "pieceAt", player: "A", row: 2, col: 3 },
      { kind: "called", name: "endCurrentPhase" },
    ],
  },
  // 誰かの白きカゲ（到達）。「これを捨てる。このマスから十字方向の計１２マスに山札から
  // １枚ずつ裏向きで置く。それらをすべてオープンする。」
  {
    name: "誰かの白きカゲ(到達): これを捨て、十字方向の12マスに1枚ずつ置いて全部オープンする",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-white-someones-shadow", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: {
        deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad"],
        eternal: [], first: [], discard: [],
      },
    },
    ctx: { player: "A", cardId: "ex0-white-someones-shadow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenGone", id: "self" },
      { kind: "pileContains", pile: "discard", cardId: "ex0-white-someones-shadow" },
      { kind: "boardCardCount", n: 12 },
      { kind: "deckLen", n: 1 },
      { kind: "cardAtCell", row: 0, col: 3, faceUp: true },  // 十字の一番遠い所まで届く
      { kind: "cardAtCell", row: 6, col: 3, faceUp: true },
      { kind: "cardAtCell", row: 3, col: 0, faceUp: true },
      { kind: "cardAtCell", row: 3, col: 6, faceUp: true },
    ],
  },
  // ===== 0th拡張 第1弾 =====
  // 足下の隠し財産（到達・山札から）。2026-11-03（#473/#474）にユーザー判断で作り直した形。
  // 「あなたのいるマス以外の、カードの置かれたマスを１マス選ぶ。山札または手札から１枚を、
  //   そのマスの１番下に表向きで置く。」
  // 🔴 候補の数（2）で「**自分のいるマス**を外したか」を検査する。(2,2) は自分のマスなので
  //   外れ、**隣の (2,3) は選べる**——前の形の「隣以外」とは別の縛りなので、取り違えると
  //   ここが落ちる。
  // ⓘ この筋書きでは A の手札が空なので、「山札から／手札から」は**聞かない**（選ぶ余地が
  //   無い時は聞かないのが他の動詞と同じ作法）。それも n:0 で検査する。
  {
    name: "足下の隠し財産(到達): 自分のマス以外の1番下に山札から置く（隣は選べる・手札が無いので聞かない）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-purple-hidden-fortune", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "adj", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "far", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: ["red-counter-lock", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-hidden-fortune", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 4, col: 4 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // 自分のマス(2,2)を外し、隣(2,3)は残る
      { kind: "called", name: "pickChoice", n: 0 }, // 手札が空＝選ぶ余地が無いので聞かない
      { kind: "deckLen", n: 1 },
      { kind: "cellStackOrder", row: 4, col: 4, cards: ["red-jump-pad", "white-radiance"] }, // 引いた札が1番下
      { kind: "cardAtCell", row: 4, col: 4, faceUp: true }, // 引いた札は表向き（farは裏向きのまま）
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 既定どおり手札へ
    ],
  },
  // 足下の隠し財産（到達・手札から）。「山札または手札から」の**手札の方**を選んだ場合。
  // 🔴 山札にも手札にも札がある時だけ「どちらから出しますか？」を聞く（候補の id も検査する）。
  {
    name: "足下の隠し財産(到達): 手札から選ぶと、その札がマスの1番下に表向きで入る",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-purple-hidden-fortune", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "h2", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "h3", kind: "card", cardId: "white-radiance", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "adj", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "far", kind: "card", cardId: "blue-serenade", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: ["red-counter-lock", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-hidden-fortune", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 2, col: 3 }], choice: ["hand"], handCard: ["h2"] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // 自分のマス(2,2)を外す／隣(2,3)は残る
      { kind: "called", name: "pickChoiceOptions", arg: "deck,hand" }, // 両方あるので聞く
      { kind: "called", name: "pickHandCard", arg: "h2" },
      // 【#502】「表向きで置く」＝公開情報。１番下へ沈めると見えなくなるので、沈める前に
      //   全員へ1回見せる（revealCardToAll は配信する側の入口）。
      { kind: "called", name: "revealCardToAll", arg: "red-jump-pad" },
      { kind: "deckLen", n: 2 }, // 手札から出したので山札は減らない
      { kind: "cellStackOrder", row: 2, col: 3, cards: ["red-jump-pad", "red-counter-lock"] }, // 置いた札が1番下
      { kind: "tokenFaceUp", id: "h2" },
    ],
  },
  // 足下の隠し財産（手札効果＝上記の到達効果を得る）。縛りも一緒に来ることを見る。
  // 🔴 ここでは**自分のマス (2,2) にもカードがある**ので、外れたかどうかが候補の数に出る。
  {
    name: "足下の隠し財産(手札): 到達効果を継承すると「自分のマス以外」も一緒に来る",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-purple-hidden-fortune", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "mine", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "adj", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "far", kind: "card", cardId: "white-radiance", faceUp: false, location: { zone: "cell", row: 4, col: 4 } },
      ],
      piles: { deck: ["red-counter-lock", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-purple-hidden-fortune", cardTokenId: "self" },
    picks: { location: [{ row: 4, col: 4 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // (2,2)が外れ、(2,3)と(4,4)が残る
      { kind: "called", name: "pickChoice", n: 0 }, // これ以外の手札が無い＝聞かない
      { kind: "deckLen", n: 1 },
      { kind: "cellStackOrder", row: 4, col: 4, cards: ["red-jump-pad", "white-radiance"] },
      { kind: "pileContains", pile: "discard", cardId: "ex0-purple-hidden-fortune" }, // 使用時に捨てる既定
    ],
  },
  // オレンジバス（到達）。「『バスストップ』のあるマスに移動する。これをあなたの隣に
  // 表向きで置く。その『バスストップ』をあなたの手札に加える。」
  // 🔴 **裏向きのバスストップは対象外**（(0,0)の bsDown が候補に入らないことを候補数1で見る）。
  {
    name: "オレンジバス(到達): 表向きのバスストップへ移動し、これを隣へ置いて、その札を手札に加える",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "bs", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "cell", row: 5, col: 5 } },
        { id: "bs2", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: true, location: { zone: "cell", row: 1, col: 5 } },
        { id: "bsDown", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 5, col: 5 }, { row: 5, col: 4 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // 表向きのバスストップ2マスだけ（裏向きは候補外）
      { kind: "pieceAt", player: "A", row: 5, col: 5 },
      { kind: "called", name: "pickLocationCandidates", arg: "4" }, // 「あなたの隣」＝移動後の4マス
      { kind: "tokenAtCell", id: "self", row: 5, col: 4 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "tokenZone", id: "bs", zone: "hand", player: "A" },
      { kind: "tokenAtCell", id: "bsDown", row: 0, col: 0 }, // 裏向きは手付かず
    ],
  },
  // 🔴 【#492・2026-11-04】ユーザー報告「オレンジバスなら到達効果について、バスストップが
  //   なくても、このカードを隣に置くはできます」。句点の原則どおり**1句目（移動）が不発でも
  //   2句目（置く）は行う**。⚠ 3句目の「**その**『バスストップ』」は移った先の札を指すので、
  //   移動できていなければ行わない（`stopIfAnyPreviousFailed`＝「ここまで全部成功」で見る。
  //   「直前」では駄目——2句目は成功するので止まらない）。
  {
    name: "オレンジバス(到達): 表向きのバスストップが無ければ移動しないが、これを隣へ置くのは行う（#492）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-orange-bus", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
        { id: "bsDown", kind: "card", cardId: "ex0-orange-bus-stop", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-orange-bus", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: { location: [{ row: 2, col: 3 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 2, col: 2 }, // 移動は不発
      { kind: "called", name: "pickLocationCandidates", arg: "4" }, // 「あなたの隣」＝元のマスの隣4マス
      { kind: "tokenAtCell", id: "self", row: 2, col: 3 }, // 置くのは行う
      { kind: "tokenFaceUp", id: "self" },
      { kind: "tokenAtCell", id: "bsDown", row: 0, col: 0 }, // 3句目は行わない（裏向きは手付かず）
    ],
  },
  // ゲートチャージ（到達）。オープンされた枝。A のゲートは (6,3)。
  {
    name: "ゲートチャージ(到達): このターンにオープンされたなら、1枚ドローしてこれを自分のゲートへ表向きで置く",
    kind: "arrival",
    openedThisTurn: ["self"],
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-gate-charge", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-counter-lock", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-gate-charge", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },
      { kind: "handCount", player: "A", n: 1 },      // 引いた1枚だけ（これ自身は手札に入らない）
      { kind: "tokenAtCell", id: "self", row: 6, col: 3 },
      { kind: "tokenFaceUp", id: "self" },
      { kind: "pieceAt", player: "A", row: 2, col: 2 }, // 駒は動かない
    ],
  },
  // ゲートチャージ（到達）。そうでない枝＝移動前のマスへ戻って、これを捨てる。
  // 🔴 movedFrom は**記録の関数を本物どおり通して**作る（ランナー参照）。
  {
    name: "ゲートチャージ(到達): オープンされていないなら、移動前のマスへ戻ってこれを捨てる",
    kind: "arrival",
    movedFrom: { A: { row: 1, col: 2 } },
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-gate-charge", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-counter-lock", "red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-gate-charge", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },
      { kind: "pieceAt", player: "A", row: 1, col: 2 },
      { kind: "tokenGone", id: "self" },
      { kind: "pileContains", pile: "discard", cardId: "ex0-yellow-gate-charge" },
    ],
  },
  // リーチキャンセル（到達）。「移動前のマスに強制移動する。」
  {
    name: "リーチキャンセル(到達): 移動前のマスに強制移動する",
    kind: "arrival",
    movedFrom: { A: { row: 1, col: 2 } },
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-reach-cancel", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-reach-cancel", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "pieceAt", player: "A", row: 1, col: 2 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 既定どおり手札へ
    ],
  },
  // 🔴 記録が無い時は**不発**（＝効果が出ないだけ・安全側）。記録が無いのに勝手な
  //   マスへ動かすのが一番まずいので、動かないことを検査する。
  {
    name: "リーチキャンセル(到達): 移動前のマスが分からなければ動かない（不発でも手札には入る）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 2, col: 2 } },
        { id: "self", kind: "card", cardId: "ex0-yellow-reach-cancel", faceUp: true, location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-yellow-reach-cancel", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 2, col: 2 } },
    picks: {},
    expect: [
      { kind: "pieceAt", player: "A", row: 2, col: 2 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" },
    ],
  },
  // 走り人ジョイナー（到達）。「１マス強制移動する。」
  // 🔴 「強制移動」は**カードが無いマスにも行ける**（用語集）。候補4で検査する
  //   ——ふつうの「移動」なら周りにカードが無いので候補0になるはず。
  {
    name: "ジョイナー(到達): 1マス強制移動（カードが無いマスも候補に入る）",
    kind: "arrival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-joyner", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-joyner", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 3 }] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "4" },
      { kind: "pieceAt", player: "A", row: 2, col: 3 },
    ],
  },
  // 走り人ジョイナー（手札）。「何もないあなたの隣のマスに強制移動することを、任意の回数
  // 繰り返す。このターンを終了する。」
  // 🔴 「何もないマス」＝カードも駒も無い。カードのある(3,4)と駒のいる(2,3)が外れて候補2。
  {
    name: "ジョイナー(手札): 何もない隣へ任意の回数動いてから、このターンを終了する",
    kind: "hand",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A", turnNumber: 5,
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 2, col: 3 } },
        { id: "self", kind: "card", cardId: "ex0-red-joyner", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "blk", kind: "card", cardId: "red-counter-lock", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: ["red-jump-pad"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "ex0-red-joyner", cardTokenId: "self" },
    picks: { location: [{ row: 4, col: 3 }, { row: 4, col: 2 }, "skip"] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "2" }, // (4,3)と(3,2)だけ
      { kind: "pieceAt", player: "A", row: 4, col: 2 },             // 2回動いて3回目は選ばず終了
      { kind: "called", name: "endTurn", arg: "A" },
    ],
  },

  // ================= ここから 1st EDITION =================
  // 🔴 【財力】＝手札の枚数（＋修正値）。考え方は src/wealth.js の冒頭。
  //   テストでは**手札の枚数を筋書きで作る**だけで財力が決まる（専用の差し込み口は作らない
  //   ＝続き653 の「筋書きから作れるようにする」と同じ考え方だが、こちらは state だけで足りる）。
  // ⚠ 修正値（＋1）は 1st のEカードを持っていると付く。eternal-1st-* を手札かロックに置く。

  {
    name: "貧しき心(到達): 財力が１番小さいなら２枚ドロー",
    kind: "arrival",
    cardId: "1st-blue-poor-heart",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-poor-heart", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hB0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-blue-poor-heart", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handCount", player: "A", n: 3 }, // 引いた2枚＋既定でこのカード自身
      { kind: "deckLen", n: 1 },
    ],
  },
  {
    name: "貧しき心(到達): 財力が１番小さくないなら何も起きない",
    kind: "arrival",
    cardId: "1st-blue-poor-heart",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-poor-heart", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hB0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-blue-poor-heart", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handCount", player: "A", n: 4 }, // 元の3枚＋このカード自身だけ（ドローしない）
      { kind: "deckLen", n: 2 },
    ],
  },
  {
    name: "貧しき心(手札): 【財力≦２】を満たすなら捨て場の１番上を手札へ",
    kind: "hand",
    cardId: "1st-blue-poor-heart",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-poor-heart", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "1st-blue-poor-heart", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 財力2（これ自身＋1枚）＝条件を満たす
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 },
      { kind: "tokenGone", id: "self" }, // 既定で自分を捨てる
    ],
  },
  {
    name: "貧しき心(手札): 【財力≦２】を満たさないなら使えない",
    kind: "hand",
    cardId: "1st-blue-poor-heart",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-poor-heart", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "1st-blue-poor-heart", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: false }, // 財力3（これ自身＋2枚）＝条件を外れる
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 0 }, // 拾わない
      { kind: "tokenZone", id: "self", zone: "hand", player: "A" }, // 捨てもしない
    ],
  },
  {
    name: "貧しき心(手札): 1stのEカードを持っていても【財力≦２】は base で見る（宣言しないだけ）",
    kind: "hand",
    cardId: "1st-blue-poor-heart",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-poor-heart", location: { zone: "hand", player: "A" } },
        { id: "eA", kind: "card", cardId: "eternal-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "1st-blue-poor-heart", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // base 1（これ自身だけ）＝満たす。+1は宣言しない
      { kind: "wealth", player: "A", bonusMax: 1 }, // ロックエリアのEカードも「持っている」
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 },
    ],
  },
  {
    name: "食べ過ぎ(手札): 【財力≧３】２枚ドローしてこのターンを終了",
    kind: "hand",
    cardId: "1st-pink-overeating",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-overeating", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-overeating", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 財力3（これ自身＋2枚）
      { kind: "handCount", player: "A", n: 4 }, // 自分を捨てて2枚引く → 2+2
      { kind: "called", name: "endTurn" },
    ],
  },
  {
    name: "食べ過ぎ(手札): 手札のEカードは＋1にならない（ただの手札1枚として数える）",
    kind: "hand",
    cardId: "1st-pink-overeating",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-overeating", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "eA", kind: "card", cardId: "eternal-1st-purple", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-overeating", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // base 3（自分＋1枚＋Eカード＝ただの手札3枚）
      { kind: "wealth", player: "A", bonusMax: 0 }, // 🔴 手札に持っていても＋1 は付かない
      { kind: "handCount", player: "A", n: 4 },
    ],
  },
  {
    name: "食べ過ぎ(手札): ロックエリアのEカードなら＋1 が付いて【財力≧３】に届く",
    kind: "hand",
    cardId: "1st-pink-overeating",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-overeating", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "eA", kind: "card", cardId: "eternal-1st-purple", faceUp: true, location: { zone: "lock", side: "bottom", index: 6 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-overeating", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "wealth", player: "A", bonusMax: 1 }, // ⚠ base は効果の後で測るので見ない
      { kind: "handUsable", value: true }, // base 2 ＋ 任意の＋1 で 3 に届く
      { kind: "handCount", player: "A", n: 3 }, // 自分を捨てて2枚引く → 1+2
    ],
  },
  {
    name: "食べ過ぎ(手札): 財力2でEカードも無ければ使えない",
    kind: "hand",
    cardId: "1st-pink-overeating",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-overeating", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-overeating", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: false },
      { kind: "handCount", player: "A", n: 2 }, // 何も起きない
      { kind: "deckLen", n: 2 },
    ],
  },
  {
    name: "路地裏のスラム街(手札): 【財力≧３】これを任意のマスに裏向きで置く",
    kind: "hand",
    cardId: "1st-purple-slum",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-purple-slum", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-purple-slum", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenZone", id: "self", zone: "cell" },
      { kind: "cardAtCell", row: 2, col: 2, faceUp: false }, // 裏向きで置く
    ],
  },
  {
    name: "飛空艇アルヴァ(手札): 財力の条件は無く、任意のマスに表向きで置く",
    kind: "hand",
    cardId: "1st-white-airship",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-white-airship", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-airship", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 0, col: 0 }] },
    expect: [
      { kind: "handUsable", value: true }, // 財力1でも使える（条件が無い）
      { kind: "cardAtCell", row: 0, col: 0, faceUp: true },
    ],
  },
  {
    name: "ドゥエンの革命(手札): プレイヤーの隣以外・駒のいるマス以外に表向きで置く",
    kind: "hand",
    cardId: "1st-white-revolution",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-white-revolution", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-revolution", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      // 49マス − 駒のいる1マス − 隣の4マス ＝ 44マス。
      // 🔴 候補の数そのものを見る（座標を指定する形では、候補に無いマスもそのまま通るので
      //   絞り込みを検査できない＝続き652 の教訓）。
      { kind: "called", name: "pickLocationCandidates", arg: "44" },
      { kind: "tokenZone", id: "self", zone: "cell" },
    ],
  },
  {
    name: "財閥の威光(手札): これを置き、【財力＝S】でSマスまでオープンできる",
    kind: "hand",
    cardId: "1st-orange-conglomerate",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-orange-conglomerate", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "c1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 0, col: 0 } },
        { id: "c2", kind: "card", cardId: "red-counter-lock", faceUp: false, location: { zone: "cell", row: 0, col: 1 } },
        { id: "c3", kind: "card", cardId: "orange-mass-change", faceUp: false, location: { zone: "cell", row: 0, col: 2 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-orange-conglomerate", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    // 1マス目に置き、そのあとオープンを2回（Sの上限まで）。
    picks: { location: [{ row: 3, col: 3 }, { row: 0, col: 0 }, { row: 0, col: 1 }] },
    expect: [
      // 🔴 **Sを数えるのは「置いた後」**（印字が「…置く。【財力＝S】…」の順）。
      //   手札は これ自身＋2枚 → 置くと2枚 ⇒ S＝2。
      // 🔴 さらにSは**オープンを始める前に1回だけ**数える（開けるたびに伸びない）。
      { kind: "tokenFaceUp", id: "c1" },
      { kind: "tokenFaceUp", id: "c2" },
      { kind: "tokenFaceDown", id: "c3" }, // 3枚目はSを超えるので開かない
      { kind: "cardAtCell", row: 3, col: 3, faceUp: false },
    ],
  },
  {
    name: "大盤振舞(手札): 【財力＝S】カードの置かれていないSマスに山札から１枚ずつ裏向きで置く",
    kind: "hand",
    cardId: "1st-green-largesse",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-green-largesse", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "orange-mass-change", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-green-largesse", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }] },
    expect: [
      // 🔴 印字は「…置く。このカードを捨てる。」＝**置いてから捨てる**ので、Sを数える時の
      //   手札は これ自身＋2枚 ＝ 3（財力3）。
      { kind: "deckLen", n: 1 },
      { kind: "cardAtCell", row: 1, col: 1, faceUp: false },
      { kind: "cardAtCell", row: 1, col: 2, faceUp: false },
      { kind: "cardAtCell", row: 1, col: 3, faceUp: false },
      { kind: "boardCardCount", n: 3 },
      { kind: "tokenGone", id: "self" }, // 最後に自分を捨てる
    ],
  },
  {
    name: "新緑の史文 グリングリン(手札): 【財力＝３】任意の１マスに手札から１枚裏向きで置く",
    kind: "hand",
    cardId: "eternal-1st-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        // 🔴 Eカードは**ロックエリアに在っても手札効果が使える**（基本効果）。
        { id: "self", kind: "card", cardId: "eternal-1st-green", faceUp: true, location: { zone: "lock", side: "bottom", index: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-green", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }], handCard: ["hA0"] },
    expect: [
      // 手札2枚＋自分がロックエリアのEカード1枚＝base 2・bonusMax 1 ⇒ 幅 2〜3 に 3 が在る。
      { kind: "handUsable", value: true },
      { kind: "wealth", player: "A", bonusMax: 1 },
      { kind: "tokenZone", id: "hA0", zone: "cell" },
      { kind: "cardAtCell", row: 2, col: 2, faceUp: false },
      { kind: "tokenZone", id: "self", zone: "lock" }, // Eカードは消費されない
    ],
  },
  {
    name: "新緑の史文 グリングリン(手札): 財力の幅が届かないなら使えない",
    kind: "hand",
    cardId: "eternal-1st-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-green", faceUp: true, location: { zone: "lock", side: "bottom", index: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-green", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      // 手札0枚・bonusMax 1 ⇒ 幅 0〜1 に 3 は無い。
      { kind: "handUsable", value: false },
      { kind: "boardCardCount", n: 0 },
    ],
  },
  {
    name: "古の蒼書 ティセリオス(手札): 【財力＝４】捨て場の１番上から２枚を手札へ＋フェイズ終了",
    kind: "hand",
    cardId: "eternal-1st-blue",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-blue", faceUp: true, location: { zone: "lock", side: "bottom", index: 4 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["red-jump-pad", "red-counter-lock", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "eternal-1st-blue", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 手札4枚＝ちょうど4
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 },
      { kind: "handHasCard", player: "A", cardId: "red-counter-lock", n: 1 },
      { kind: "handHasCard", player: "A", cardId: "red-jump-pad", n: 4 }, // 元の手札4枚（拾った分は別cardId）
      { kind: "called", name: "endCurrentPhase" },
    ],
  },

  // ───────── 1st EDITION の残り（2026-11-06・続き668 で追加） ─────────
  // 🔴【状況】カードは kind: "situation" で、場の中央に在る間の「自分のターン開始時」の
  //   効果をそのまま走らせる（本物と同じ runSituationEffect を通る）。

  {
    name: "貧民の行進(到達): 財力２以下の全員が２枚ドローし２マス移動（オープンしない）",
    kind: "arrival",
    cardId: "1st-red-poor-march",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "1st-red-poor-march", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "c1", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 3, col: 5 } },
        { id: "c2", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 0, col: 2 } },
        // B は手札5枚＝財力5 なので対象外（A は0枚＝対象）。
        { id: "hB0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-red-poor-march", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 3, col: 5 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 5 },
      { kind: "pieceAt", player: "B", row: 0, col: 0 }, // 財力5＝対象外なので動かない
      { kind: "handCount", player: "B", n: 5 }, // ドローもしない
      { kind: "deckLen", n: 1 }, // A が2枚引いた
    ],
  },
  {
    name: "貧民の行進(手札): このターン２マス移動・移動先はオープンしない。自身は捨てる",
    kind: "hand",
    cardId: "1st-red-poor-march",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-red-poor-march", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-red-poor-march", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 手札1枚（自分だけ）＝財力1 ≦ 2
      { kind: "tokenGone", id: "self" },
    ],
  },
  {
    name: "治安悪化(状況): 財力５以上なら、ロックを１枚捨てる／手札４枚捨てるの２択",
    kind: "situation",
    cardId: "1st-red-unrest",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-red-unrest", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "lk0", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-red-unrest" },
    picks: { option: ["1st-unrest-discard-locked"] },
    expect: [
      { kind: "called", name: "situationApplies", arg: "true" },
      { kind: "tokenGone", id: "lk0" },
      { kind: "handCount", player: "A", n: 5 }, // 手札は減らない（ロックを捨てた方）
    ],
  },
  {
    name: "治安悪化(状況): 財力４なら対象外（宣言で５にできるので本人に聞く）",
    kind: "situation",
    cardId: "1st-red-unrest",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-red-unrest", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        // 1st のEカードを持っていると財力の上限が＋1（4〜5）＝宣言で対象になり得る。
        { id: "eA", kind: "card", cardId: "eternal-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 1 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-red-unrest" },
    picks: {},
    expect: [
      { kind: "called", name: "situationApplies", arg: "true" }, // 本人に有利に読むので「満たし得る」
      { kind: "called", name: "situationNeedsAsk", arg: "true" }, // ⇒ 本人に聞く
    ],
  },
  {
    name: "フェスティバル(状況): 相手の周囲以外のカードを１枚だけ手札に加えられる",
    kind: "situation",
    cardId: "1st-orange-festival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 1, col: 1 } },
        { id: "self", kind: "card", cardId: "1st-orange-festival", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        // B の周囲8マス＋B のマス＝9マスは候補外。(0,0) は周囲なので取れない。
        { id: "near", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 0, col: 0 } },
        { id: "far", kind: "card", cardId: "green-growing-trees", location: { zone: "cell", row: 5, col: 5 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-orange-festival" },
    picks: { choice: ["yes"] },
    expect: [
      // 候補は (3,3)＝状況札自身 と (5,5) の2マスだけ（(0,0) は B の周囲なので外れる）。
      { kind: "called", name: "pickLocationCandidates", arg: "2" },
    ],
  },
  {
    name: "フェスティバル(状況): 「加えない」を選べば何も起きない",
    kind: "situation",
    cardId: "1st-orange-festival",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-orange-festival", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "far", kind: "card", cardId: "green-growing-trees", location: { zone: "cell", row: 5, col: 5 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-orange-festival" },
    picks: { choice: ["no"] },
    expect: [
      { kind: "handCount", player: "A", n: 0 },
      { kind: "tokenAtCell", id: "far", row: 5, col: 5 },
    ],
  },
  {
    name: "貴族の特権(到達): 【財力≧３】を満たすなら、ロックしてもよい",
    kind: "arrival",
    cardId: "1st-yellow-privilege",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-yellow-privilege", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-yellow-privilege", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { choice: ["yes"], handCard: ["hA0"] },
    expect: [
      { kind: "tokenZone", id: "hA0", zone: "lock" },
    ],
  },
  {
    name: "貴族の特権(手札): ②を選ぶと、選んだプレイヤーが１マス移動する",
    kind: "hand",
    cardId: "1st-yellow-privilege",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "pieceB", kind: "piece", player: "B", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "1st-yellow-privilege", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "c1", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-yellow-privilege", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { option: ["1st-privilege-move"], player: ["A"], location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "pieceAt", player: "A", row: 3, col: 4 },
    ],
  },
  {
    name: "ロックチェンジ(到達): ロック１枚を手札へ戻し、そうしたなら１枚ロックし直す",
    kind: "arrival",
    cardId: "1st-yellow-lock-change",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-yellow-lock-change", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "lk0", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "hA0", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-yellow-lock-change", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCard: ["hA0"] },
    expect: [
      { kind: "tokenZone", id: "lk0", zone: "hand" }, // 戻ってきた
      { kind: "tokenZone", id: "hA0", zone: "lock" }, // 代わりに緑をロック
    ],
  },
  {
    name: "ロックチェンジ(到達): ロックが１枚も無ければ、ロックし直しも行わない",
    kind: "arrival",
    cardId: "1st-yellow-lock-change",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-yellow-lock-change", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-yellow-lock-change", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenZone", id: "hA0", zone: "hand" }, // 「そうしたなら」なのでロックしない
    ],
  },
  {
    name: "建設バブル(状況): カードの置かれていない２マスへ山札から１枚ずつ置く",
    kind: "situation",
    cardId: "1st-green-bubble",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-green-bubble", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-green-bubble" },
    picks: { location: [{ row: 0, col: 0 }, { row: 0, col: 1 }], confirmCells: [true] },
    expect: [
      { kind: "cardAtCell", row: 0, col: 0, n: 1 },
      { kind: "cardAtCell", row: 0, col: 1, n: 1 },
      { kind: "deckLen", n: 1 },
      // 手札が無いので「山札から／手札から」は聞かない（選ぶ余地が無い）。
      { kind: "called", name: "pickChoice", n: 0 },
    ],
  },
  {
    // 🔴【#528・2026-11-07】ユーザー判断「山札からか手札からか選ぶときで複数マスの時は
    //   １マスずつ確認がいい（1マスは手札から1マスは山札から、みたいな）」。
    //   ⇒ **マスごとに**出どころを聞く＝pickChoice が2回呼ばれ、1マス目は手札・2マス目は山札、
    //     という置き分けができる。
    name: "建設バブル(状況): 山札と手札の両方がある時は、マスごとに出どころを聞く（#528）",
    kind: "situation",
    cardId: "1st-green-bubble",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-green-bubble", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        // ⚠ 2枚持たせる。1枚だと1マス目で手札が尽き、2マス目は**聞かずに山札**になるのが正しい
        //   （選ぶ余地が無いから）。それだと「マスごとに聞く」の検査にならない。
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-green-bubble" },
    picks: {
      location: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      choice: ["hand", "deck"], // 1マス目は手札から・2マス目は山札から
      handCard: ["hA0"],
    },
    expect: [
      { kind: "called", name: "pickChoice", n: 2 }, // 🔴 マスごとに1回ずつ
      { kind: "tokenAtCell", id: "hA0", row: 0, col: 0 }, // 1マス目は手札の札
      { kind: "cardAtCell", row: 0, col: 1, n: 1 },
      { kind: "deckLen", n: 1 }, // 2マス目だけ山札を使った
      { kind: "handCount", player: "A", n: 1 }, // hA1 は残る
    ],
  },
  {
    name: "苦渋の強盗(到達): 【財力≦２】なら相手ゲートのカードを１枚手札へ",
    kind: "arrival",
    cardId: "1st-blue-robbery",
    state: {
      activePlayers: ["A", "C"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 5, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-robbery", faceUp: true, location: { zone: "cell", row: 5, col: 3 } },
        // C（奥）のゲートは (0,3)。A（手前）のゲートは (6,3)＝相手ゲートではない。
        { id: "gC", kind: "card", cardId: "green-growing-trees", location: { zone: "cell", row: 0, col: 3 } },
        { id: "gA", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 6, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-blue-robbery", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 5, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenZone", id: "gC", zone: "hand" },
      { kind: "tokenAtCell", id: "gA", row: 6, col: 3 }, // 自分のゲートは対象外
    ],
  },
  {
    name: "苦渋の強盗(手札): 1番多くロックしている相手のロック札を奪い、捨ててターン終了",
    kind: "hand",
    cardId: "1st-blue-robbery",
    state: {
      activePlayers: ["A", "C"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-blue-robbery", location: { zone: "hand", player: "A" } },
        { id: "lkC", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "lock", side: "top", index: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-blue-robbery", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { player: ["C"] },
    expect: [
      { kind: "tokenZone", id: "lkC", zone: "hand" },
      { kind: "tokenGone", id: "self" },
      { kind: "called", name: "endTurn" },
    ],
  },
  {
    name: "食べ過ぎ(到達): ２枚ドローし、隣４マスのカードを裏向きで足元へ積む",
    kind: "arrival",
    cardId: "1st-pink-overeating",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-overeating", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "up", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "cell", row: 2, col: 3 } },
        { id: "down", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 4, col: 3 } },
        // 斜めは「隣」ではないので動かない。
        { id: "diag", kind: "card", cardId: "green-growing-trees", location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-overeating", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "tokenAtCell", id: "up", row: 3, col: 3 },
      { kind: "tokenFaceDown", id: "up" }, // 「裏向きにして」
      { kind: "tokenAtCell", id: "down", row: 3, col: 3 },
      { kind: "tokenAtCell", id: "diag", row: 2, col: 2 }, // 斜めは動かない
      { kind: "deckLen", n: 1 },
    ],
  },
  {
    name: "経済成長(状況): ドローするかを聞き、はいなら１枚引く",
    kind: "situation",
    cardId: "1st-pink-growth",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-pink-growth", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-pink-growth" },
    picks: { choice: ["yes"] },
    expect: [
      { kind: "handCount", player: "A", n: 1 },
      { kind: "deckLen", n: 1 },
    ],
  },
  {
    name: "路地裏のスラム街(到達①): 手札を無作為に２枚以下へ捨て、これは裏向きで場に残る",
    kind: "arrival",
    cardId: "1st-purple-slum",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-purple-slum", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-purple-slum", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { option: ["1st-slum-random-discard"] },
    expect: [
      { kind: "handCount", player: "A", n: 2 },
      { kind: "tokenAtCell", id: "self", row: 6, col: 3 }, // 手札に入らない
      { kind: "tokenFaceDown", id: "self" },
    ],
  },
  {
    name: "裏貴族の賄賂(到達): 相手から無作為に１枚奪い、これを相手の手札へ",
    kind: "arrival",
    cardId: "1st-purple-bribe",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-purple-bribe", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hB0", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-purple-bribe", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { player: ["B"] },
    expect: [
      { kind: "tokenZone", id: "hB0", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "self", zone: "hand", player: "B" },
    ],
  },
  {
    name: "裏貴族の賄賂(手札): ロック宣言に割り込み、その札を奪って１枚渡す",
    kind: "hand",
    cardId: "1st-purple-bribe",
    interruptWindow: { kind: "lock-declare", player: "B", tokenId: "lockMe" },
    state: {
      activePlayers: ["A", "B"], turnPlayer: "B",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-purple-bribe", location: { zone: "hand", player: "A" } },
        { id: "give", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "lockMe", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-purple-bribe", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCard: ["give"] },
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenGone", id: "self" },
      { kind: "tokenZone", id: "lockMe", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "give", zone: "hand", player: "B" },
    ],
  },
  {
    name: "飛空艇アルヴァ(到達): 【財力≧６】無作為に３枚捨て、７マス先へ一気に、これを隣へ表向き",
    kind: "arrival",
    cardId: "1st-white-airship",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "1st-white-airship", faceUp: true, location: { zone: "cell", row: 0, col: 0 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA5", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-airship", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 0, col: 0 } },
    picks: { choice: ["yes"], location: [{ row: 3, col: 4 }, { row: 3, col: 3 }] },
    expect: [
      { kind: "handCount", player: "A", n: 3 }, // 6枚 − 3枚
      { kind: "pieceAt", player: "A", row: 3, col: 4 }, // (0,0) から距離7（3+4）
      { kind: "tokenAtCell", id: "self", row: 3, col: 3 }, // 移動したあとの「隣」
      { kind: "tokenFaceUp", id: "self" },
    ],
  },
  {
    name: "大富豪の気紛れ(到達): ２枚ドローし、財力が１番多い人へこれを渡す",
    kind: "arrival",
    cardId: "1st-white-whim",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-white-whim", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hB0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "hB4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-whim", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "deckLen", n: 1 },
      { kind: "tokenZone", id: "self", zone: "hand", player: "B" }, // B が5枚で1番多い
    ],
  },
  {
    name: "大富豪の気紛れ(手札): 【財力≧６】相手全員がロックを１枚捨てて２枚ドロー",
    kind: "hand",
    cardId: "1st-white-whim",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-white-whim", location: { zone: "hand", player: "A" } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "lkB", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "lock", side: "left", index: 2 } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-whim", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 手札6枚＝財力6 ≧ 6
      { kind: "tokenGone", id: "lkB" },
      { kind: "handCount", player: "B", n: 2 },
      { kind: "tokenGone", id: "self" },
    ],
  },
  {
    name: "ドゥエンの革命(到達): 1番多い人が捨て、1番少ない人が引いて枚数が揃う",
    kind: "arrival",
    cardId: "1st-white-revolution",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-white-revolution", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "red-counter-lock", "green-growing-trees"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-white-revolution", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCardsOrdered: [["hA0", "hA1", "hA2"]] },
    expect: [
      { kind: "handCount", player: "A", n: 0 }, // B が0枚なので0まで捨てる
      { kind: "handCount", player: "B", n: 3 }, // A の3枚まで引く
      { kind: "tokenGone", id: "self" },
    ],
  },
  {
    name: "デプレッション(状況): 財力２以上なら手札を１枚捨てる",
    kind: "situation",
    cardId: "1st-black-depression",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-black-depression", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-black-depression" },
    picks: { handCard: ["hA0"] },
    expect: [
      { kind: "called", name: "situationApplies", arg: "true" },
      { kind: "handCount", player: "A", n: 1 },
      { kind: "tokenGone", id: "hA0" },
    ],
  },
  {
    name: "偉大なる大号令(到達): 中央の周囲８マスへ置き、全員が中央の隣へ動き、手札が揃う",
    kind: "arrival",
    cardId: "1st-black-great-order",
    state: {
      activePlayers: ["A", "C"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "pieceC", kind: "piece", player: "C", location: { zone: "cell", row: 0, col: 0 } },
        { id: "self", kind: "card", cardId: "1st-black-great-order", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: {
        deck: ["red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad", "red-jump-pad"],
        eternal: [], first: [], discard: [],
      },
    },
    ctx: { player: "A", cardId: "1st-black-great-order", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCardsOrdered: [["hA0", "hA1"]] },
    expect: [
      { kind: "deckLen", n: 0 }, // 8マスぶん置いた
      { kind: "pieceAt", player: "A", row: 4, col: 3 }, // A のゲートは (6,3)＝中央の「下」
      { kind: "pieceAt", player: "C", row: 2, col: 3 }, // C のゲートは (0,3)＝中央の「上」
      // C は手札0枚なので、A も0枚まで捨てる（自身は到達の既定で手札へ入るので1枚残る）。
      { kind: "handCount", player: "C", n: 0 },
    ],
  },
  {
    name: "基本走術/eternal-1st-red(手札): 【財力＝０】このターンの通常の移動が２マスになる",
    kind: "hand",
    cardId: "eternal-1st-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 手札0枚（ロックに在るので財力には入らない）
    ],
  },
  {
    name: "愚直な欲求/eternal-1st-orange(手札): 【財力＝１】任意の１マスのカードを全部手札へ",
    kind: "hand",
    cardId: "eternal-1st-orange",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-orange", faceUp: true, location: { zone: "lock", side: "bottom", index: 1 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "c0", kind: "card", cardId: "red-jump-pad", location: { zone: "cell", row: 2, col: 2 } },
        { id: "c1", kind: "card", cardId: "green-growing-trees", location: { zone: "cell", row: 2, col: 2 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-orange", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { location: [{ row: 2, col: 2 }] },
    expect: [
      { kind: "handUsable", value: true }, // 手札1枚＝財力1
      { kind: "tokenZone", id: "c0", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "c1", zone: "hand", player: "A" },
      { kind: "called", name: "endTurn" },
    ],
  },
  {
    name: "富豪の教え/eternal-1st-yellow(手札): 【財力＝２】全員の財力が１多く計算される",
    kind: "hand",
    cardId: "eternal-1st-yellow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-yellow", faceUp: true, location: { zone: "lock", side: "bottom", index: 2 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-yellow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true },
      // 手札2枚 ＋ 全員ぶんの＋1 ＝ base 3（Eカード1枚ぶんの任意＋1 は bonusMax）。
      { kind: "wealth", player: "A", base: 3, bonusMax: 1 },
      { kind: "wealth", player: "B", base: 1, bonusMax: 0 },
    ],
  },
  {
    name: "恋の押付け/eternal-1st-pink(手札): 【財力＝５】相手に任意の枚数を渡す",
    kind: "hand",
    cardId: "eternal-1st-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-pink", faceUp: true, location: { zone: "lock", side: "bottom", index: 5 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { player: ["B"], handCard: ["hA0", "hA1", "skip"] },
    expect: [
      { kind: "handUsable", value: true }, // 手札5枚＝財力5
      { kind: "tokenZone", id: "hA0", zone: "hand", player: "B" },
      { kind: "tokenZone", id: "hA1", zone: "hand", player: "B" },
      { kind: "handCount", player: "A", n: 3 }, // 「選ばない」で止まる
    ],
  },
  {
    name: "カオスチェンジ/eternal-1st-purple(手札): 【財力＝６】相手と手札を全部交換",
    kind: "hand",
    cardId: "eternal-1st-purple",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "eternal-1st-purple", faceUp: true, location: { zone: "lock", side: "bottom", index: 6 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA4", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA5", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hB0", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "B" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "eternal-1st-purple", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { player: ["B"] },
    expect: [
      { kind: "handUsable", value: true }, // 手札6枚＝財力6
      { kind: "tokenZone", id: "hB0", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "hA0", zone: "hand", player: "B" },
      { kind: "handCount", player: "A", n: 1 },
      { kind: "handCount", player: "B", n: 6 },
      { kind: "called", name: "endTurn" },
    ],
  },
  {
    name: "大盤振舞(到達): あなたの隣計２マスへ手札から１枚ずつ裏向きで置く",
    kind: "arrival",
    cardId: "1st-green-largesse",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-green-largesse", faceUp: true, location: { zone: "cell", row: 3, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "green-growing-trees", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-green-largesse", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 2, col: 3 }, { row: 4, col: 3 }], handCard: ["hA0", "hA1"] },
    expect: [
      { kind: "called", name: "pickLocationCandidates", arg: "4" }, // 隣の4マス
      { kind: "tokenAtCell", id: "hA0", row: 2, col: 3 },
      { kind: "tokenAtCell", id: "hA1", row: 4, col: 3 },
    ],
  },
  {
    name: "財閥の威光(到達): 【財力≧３】財力が1番少ない人へ手札を２枚渡す",
    kind: "arrival",
    cardId: "1st-orange-conglomerate",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "1st-orange-conglomerate", faceUp: true, location: { zone: "cell", row: 6, col: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "1st-orange-conglomerate", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCard: ["hA0", "hA1"] },
    expect: [
      { kind: "tokenZone", id: "hA0", zone: "hand", player: "B" },
      { kind: "tokenZone", id: "hA1", zone: "hand", player: "B" },
      { kind: "handCount", player: "B", n: 2 },
    ],
  },

  // ───────── 1st EDITION ファーストカード（◯のジュエル）7種 ─────────
  // 🔴 7種とも**ロックエリアに在るまま**手札効果を使う（基本効果「この手札効果はロック
  //   エリアにロックされていても使える」）。コストは【財力＝１】＝**手札がちょうど１枚**。
  //   だから筋書きはどれも「self はロック・手札は1枚だけ」。
  {
    name: "赤のジュエル ルビナグナ(手札): 【財力＝１】捨て場の1番上を手札へ",
    kind: "hand",
    cardId: "first-1st-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["blue-choosable-trap", "green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "first-1st-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true }, // 手札ちょうど1枚
      // 🔴 **1番上**（配列の末尾）。リメイクのフェニックスは「2番目」なので、
      //    2番目（blue-choosable-trap）を拾っていたら取り違え。
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 1 },
      { kind: "handHasCard", player: "A", cardId: "blue-choosable-trap", n: 0 },
      { kind: "tokenZone", id: "self", zone: "lock" }, // ファーストは消費されない
    ],
  },
  {
    // 🔴【#526・2026-11-07】「捨て場にカードがないのにルビナグナをつかえることになっていてた。
    //   スキップされなかった」。動詞の中には判定があったが**実行時**だったので、
    //   「使ったのに何も起きない」になっていた。善処の原則＝発動宣言そのものができない。
    name: "赤のジュエル ルビナグナ(手札): 捨て場が空なら使えない（善処の原則）",
    kind: "hand",
    cardId: "first-1st-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      // 財力はちょうど1で満たしているのに、捨て場が空なので使えない。
      { kind: "handUsable", value: false },
      { kind: "handCount", player: "A", n: 1 },
    ],
  },
  {
    // 🔴 こちらはリメイクのフェニックス（捨て場の「1番上から2番目」）。1枚では2番目が無いので使えない。
    //   #526 の直しを「どのカードでも効く」形（動詞から必要枚数を出す）にしたことの検査。
    name: "赤のキューブ フェニックス/first-red(手札): 捨て場が1枚なら「2番目」が無いので使えない",
    kind: "hand",
    cardId: "first-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-red", faceUp: true, location: { zone: "hand", player: "A" } },
        { id: "cost", kind: "card", cardId: "red-jump-pad", faceUp: true, location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "first-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: false },
      { kind: "tokenZone", id: "cost", zone: "hand", player: "A" }, // コストも払われない
    ],
  },
  {
    name: "赤のジュエル ルビナグナ(手札): 手札が2枚なら【財力＝１】を満たさず使えない",
    kind: "hand",
    cardId: "first-1st-red",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-red", faceUp: true, location: { zone: "lock", side: "bottom", index: 0 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "hA1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: ["green-growing-trees"] },
    },
    ctx: { player: "A", cardId: "first-1st-red", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      // ロックエリアに 1st のEカードが無いので bonusMax 0 ⇒ 幅は 2〜2 で 1 を含まない。
      { kind: "handUsable", value: false },
      { kind: "wealth", player: "A", bonusMax: 0 },
      { kind: "handHasCard", player: "A", cardId: "green-growing-trees", n: 0 },
    ],
  },
  {
    name: "橙のジュエル カリブランス(手札): 【財力＝１】2マス以内の1枚を手札へ",
    kind: "hand",
    cardId: "first-1st-orange",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-orange", faceUp: true, location: { zone: "lock", side: "bottom", index: 1 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "target", kind: "card", cardId: "green-growing-trees", faceUp: true, location: { zone: "cell", row: 3, col: 4 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-orange", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 3, col: 4 }] },
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenZone", id: "target", zone: "hand", player: "A" },
      { kind: "tokenZone", id: "self", zone: "lock" },
    ],
  },
  {
    name: "黄のジュエル ルミナジア(手札): 【財力＝１】2マス以内を4枚までオープン",
    kind: "hand",
    cardId: "first-1st-yellow",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 3, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-yellow", faceUp: true, location: { zone: "lock", side: "bottom", index: 2 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "d1", kind: "card", cardId: "red-jump-pad", faceUp: false, location: { zone: "cell", row: 3, col: 4 } },
        { id: "d2", kind: "card", cardId: "blue-choosable-trap", faceUp: false, location: { zone: "cell", row: 3, col: 2 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-yellow", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 3, col: 3 } },
    picks: { location: [{ row: 3, col: 4 }, { row: 3, col: 2 }] },
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenFaceUp", id: "d1" },
      { kind: "tokenFaceUp", id: "d2" },
    ],
  },
  {
    name: "緑のジュエル ネオリーフィア(手札): 【財力＝１】2枚公開ドロー（ターン終了時に捨てる予定）",
    kind: "hand",
    cardId: "first-1st-green",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-green", faceUp: true, location: { zone: "lock", side: "bottom", index: 3 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: ["red-jump-pad", "blue-choosable-trap"], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-green", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true },
      { kind: "publicDrawCount", player: "A", n: 2 },
      { kind: "deckLen", n: 0 },
      { kind: "called", name: "markDiscardAtTurnEnd" },
    ],
  },
  {
    name: "青のジュエル ラピスティア(手札): 【財力＝１】手札3枚以上の相手だけが1枚捨てる",
    kind: "hand",
    cardId: "first-1st-blue",
    state: {
      activePlayers: ["A", "B", "C"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-blue", faceUp: true, location: { zone: "lock", side: "bottom", index: 4 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
        { id: "bh1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "bh2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "bh3", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "B" } },
        { id: "ch1", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "C" } },
        { id: "ch2", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "C" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-blue", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenGone", id: "bh1" }, // B は3枚 → 対象（無作為＝先頭）
      { kind: "handCount", player: "B", n: 2 },
      // 🔴 C は2枚 → **対象外**。リメイクのセレスティア（2枚以上）と取り違えたらここで落ちる。
      { kind: "handCount", player: "C", n: 2 },
    ],
  },
  {
    name: "桃のジュエル モルガライト(手札): 【財力＝１】手札1枚をロック（最後のロック不可）",
    kind: "hand",
    cardId: "first-1st-pink",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-pink", faceUp: true, location: { zone: "lock", side: "bottom", index: 5 } },
        { id: "lk", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-pink", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: { handCard: ["lk"] },
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenZone", id: "lk", zone: "lock" },
      { kind: "tokenZone", id: "self", zone: "lock" },
    ],
  },
  {
    name: "紫のジュエル ラヴェルナイト(手札): 【財力＝１】このターンの通常の移動を2マスに",
    kind: "hand",
    cardId: "first-1st-purple",
    state: {
      activePlayers: ["A", "B"], turnPlayer: "A",
      tokens: [
        { id: "pieceA", kind: "piece", player: "A", location: { zone: "cell", row: 6, col: 3 } },
        { id: "self", kind: "card", cardId: "first-1st-purple", faceUp: true, location: { zone: "lock", side: "bottom", index: 6 } },
        { id: "hA0", kind: "card", cardId: "red-jump-pad", location: { zone: "hand", player: "A" } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: "A", cardId: "first-1st-purple", cardTokenId: "self", pieceTokenId: "pieceA", pieceLocation: { zone: "cell", row: 6, col: 3 } },
    picks: {},
    expect: [
      { kind: "handUsable", value: true },
      { kind: "tokenZone", id: "self", zone: "lock" }, // 案内だけ。自身は残る
      { kind: "handCount", player: "A", n: 1 }, // 手札も減らない
    ],
  },

  // ───────── 2026-11-09（続き678）に直した分 ─────────
  {
    name: '苦渋の強盗(到達): 2人対戦では、居ないプレイヤーのゲートは候補に出ない（#539）',
    kind: 'arrival',
    cardId: '1st-blue-robbery',
    state: {
      // 3人戦（A・B・C）。D(東) の席には**誰も居ない**。
      activePlayers: ['A', 'B', 'C'], turnPlayer: 'A',
      tokens: [
        { id: 'pieceA', kind: 'piece', player: 'A', location: { zone: 'cell', row: 5, col: 3 } },
        { id: 'self', kind: 'card', cardId: '1st-blue-robbery', faceUp: true, location: { zone: 'cell', row: 5, col: 3 } },
        { id: 'gC', kind: 'card', cardId: 'green-growing-trees', location: { zone: 'cell', row: 0, col: 3 } },
        { id: 'gB', kind: 'card', cardId: 'red-counter-lock', location: { zone: 'cell', row: 3, col: 0 } },
        { id: 'gD', kind: 'card', cardId: 'red-jump-pad', location: { zone: 'cell', row: 3, col: 6 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: 'A', cardId: '1st-blue-robbery', cardTokenId: 'self', pieceTokenId: 'pieceA', pieceLocation: { zone: 'cell', row: 5, col: 3 } },
    picks: {},
    picks: { location: [{ row: 0, col: 3 }] },
    expect: [
      // 🔴 **候補の数で見る**。B と C のゲートだけ＝2。居ない D(3,6) が混ざると3になる。
      //   （先頭が偶然あたりでも通ってしまうので、取ったカードだけ見ても検査にならない）
      { kind: 'called', name: 'pickLocationCandidates', arg: '2' },
      { kind: 'tokenZone', id: 'gC', zone: 'hand' },
      { kind: 'tokenAtCell', id: 'gD', row: 3, col: 6 },
    ],
  },
  {
    name: '迷いの森(到達): 隣のカードを捨てる順を選べる（#535）',
    kind: 'arrival',
    cardId: 'ex0-green-lost-forest',
    state: {
      activePlayers: ['A', 'C'], turnPlayer: 'A',
      tokens: [
        { id: 'pieceA', kind: 'piece', player: 'A', location: { zone: 'cell', row: 3, col: 3 } },
        { id: 'self', kind: 'card', cardId: 'ex0-green-lost-forest', faceUp: true, location: { zone: 'cell', row: 3, col: 3 } },
        // 隣4マスのうち2マスにカード（上と下）。斜めは対象外。
        { id: 'nU', kind: 'card', cardId: 'red-jump-pad', location: { zone: 'cell', row: 2, col: 3 } },
        { id: 'nD', kind: 'card', cardId: 'green-growing-trees', location: { zone: 'cell', row: 4, col: 3 } },
        { id: 'diag', kind: 'card', cardId: 'red-counter-lock', location: { zone: 'cell', row: 2, col: 2 } },
      ],
      piles: { deck: ['red-jump-pad', 'red-counter-lock', 'orange-mass-change', 'green-growing-trees', 'red-jump-pad'], eternal: [], first: [], discard: [] },
    },
    ctx: { player: 'A', cardId: 'ex0-green-lost-forest', cardTokenId: 'self', pieceTokenId: 'pieceA', pieceLocation: { zone: 'cell', row: 3, col: 3 } },
    picks: { boardCardsOrdered: [['nD', 'nU']] },
    expect: [
      // 2枚以上あるので順番を聞く。選んだ順（nD→nU）に捨てる＝捨て場の1番上は nU。
      { kind: 'called', name: 'pickBoardCardsOrdered' },
      { kind: 'pileOrder', pile: 'discard', cards: ['green-growing-trees', 'red-jump-pad'] },
      { kind: 'called', name: 'pickBoardCardsOrdered', arg: 'nD,nU' },
      { kind: 'tokenAtCell', id: 'diag', row: 2, col: 2 },
    ],
  },
  // ───────── 2026-11-10（続き679）─────────
  // #537 報告「場の中央に経済成長があってそこに駒が到達した時、経済成長は場の中央に
  // 置き直しません。なので不発です！」→ ユーザー判断「不発モーダルでいいです」。
  {
    name: '状況(到達): 既に場の中央に在るなら置き直さず不発（#537）',
    kind: 'arrival',
    cardId: '1st-pink-growth',
    state: {
      activePlayers: ['A', 'B'], turnPlayer: 'A',
      tokens: [
        { id: 'pieceA', kind: 'piece', player: 'A', location: { zone: 'cell', row: 3, col: 3 } },
        { id: 'self', kind: 'card', cardId: '1st-pink-growth', faceUp: true, location: { zone: 'cell', row: 3, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: 'A', cardId: '1st-pink-growth', cardTokenId: 'self', pieceTokenId: 'pieceA', pieceLocation: { zone: 'cell', row: 3, col: 3 } },
    picks: {},
    expect: [
      // 置き直さない＝カードを動かす呼び出しが1回も無い。
      { kind: 'called', name: 'moveAndSync', n: 0 },
      { kind: 'tokenAtCell', id: 'self', row: 3, col: 3 },
    ],
  },
  {
    name: '状況(到達): 中央でないなら今までどおり中央へ置く（#537 の回帰）',
    kind: 'arrival',
    cardId: '1st-pink-growth',
    state: {
      activePlayers: ['A', 'B'], turnPlayer: 'A',
      tokens: [
        { id: 'pieceA', kind: 'piece', player: 'A', location: { zone: 'cell', row: 5, col: 3 } },
        { id: 'self', kind: 'card', cardId: '1st-pink-growth', faceUp: true, location: { zone: 'cell', row: 5, col: 3 } },
      ],
      piles: { deck: [], eternal: [], first: [], discard: [] },
    },
    ctx: { player: 'A', cardId: '1st-pink-growth', cardTokenId: 'self', pieceTokenId: 'pieceA', pieceLocation: { zone: 'cell', row: 5, col: 3 } },
    picks: {},
    expect: [
      { kind: 'tokenAtCell', id: 'self', row: 3, col: 3 },
    ],
  },
];

// -------------------- アサーション（純粋関数・Node/ブラウザ共通） --------------------
export function tokenById(res, id) { return res.tokens.find((t) => t.id === id); }
export function checkExpect(res, exp) {
  const t = exp.id ? tokenById(res, exp.id) : null;
  switch (exp.kind) {
    case "tokenZone":
      if (!t) return `token ${exp.id} が見つからない`;
      if (t.location.zone !== exp.zone) return `token ${exp.id} は zone=${t.location.zone}（期待 ${exp.zone}）`;
      if (exp.player && t.location.player !== exp.player) return `token ${exp.id} は player=${t.location.player}（期待 ${exp.player}）`;
      return null;
    case "tokenNotInHand":
      if (t && t.location.zone === "hand" && t.location.player === exp.player) return `token ${exp.id} が手札(${exp.player})に入ってしまった`;
      return null;
    // トークンに付く印（今は arrivalSuppressed だけ）を見る。
    // 🔴 「移動先のカードはオープンしない」（厳重警戒）のように、**engine の外（main.js）が
    //   見る印**を立てたかどうかを検査するために要る。印そのものを見ないと、テストの中では
    //   誰もオープンしないので「オープンしていない」が合格になってしまう（＝検査にならない）。
    case "tokenFlag": {
      if (!t) return `token ${exp.id} が見つからない`;
      const 実際 = !!t[exp.flag];
      if (実際 !== !!exp.value) return `token ${exp.id} の ${exp.flag} が ${実際}（期待 ${!!exp.value}）`;
      return null;
    }
    case "tokenAtCell":
      if (!t) return `token ${exp.id} が見つからない`;
      if (!(t.location.zone === "cell" && t.location.row === exp.row && t.location.col === exp.col)) return `token ${exp.id} は ${JSON.stringify(t.location)}（期待 cell ${exp.row},${exp.col}）`;
      return null;
    case "tokenFaceDown":
      if (!t) return `token ${exp.id} が見つからない`;
      if (t.faceUp) return `token ${exp.id} が表向き（期待 裏向き）`;
      return null;
    case "tokenFaceUp":
      if (!t) return `token ${exp.id} が見つからない`;
      if (!t.faceUp) return `token ${exp.id} が裏向き（期待 表向き）`;
      return null;
    case "tokenGone":
      if (t) return `token ${exp.id} がまだ存在する（期待 消滅＝山/捨て場へ）`;
      return null;
    // 【ユーザー要望2026-09-07】捨てる順番は フェニックス（捨て場の上から2番目を拾う）に
    // 直結するので、**積まれた順**まで検査できるようにする。pile の末尾＝一番上。
    case "pileOrder": {
      const pile = res.piles[exp.pile] || [];
      const tail = pile.slice(-exp.cards.length);
      if (JSON.stringify(tail) !== JSON.stringify(exp.cards))
        return `${exp.pile} の並びが ${JSON.stringify(tail)}（期待 ${JSON.stringify(exp.cards)}）`;
      return null;
    }
    case "pileContains": {
      const pile = res.piles[exp.pile] || [];
      const n = pile.filter((cid) => cid === exp.cardId).length;
      if (exp.n != null) { if (n !== exp.n) return `${exp.pile} の ${exp.cardId} が ${n}枚（期待 ${exp.n}）`; return null; }
      if (n < 1) return `${exp.pile} に ${exp.cardId} が無い`;
      return null;
    }
    case "pieceAt": {
      const p = res.tokens.find((x) => x.kind === "piece" && x.player === exp.player);
      if (!p) return `駒 ${exp.player} が見つからない`;
      if (!(p.location.zone === "cell" && p.location.row === exp.row && p.location.col === exp.col)) return `駒 ${exp.player} は ${JSON.stringify(p.location)}（期待 cell ${exp.row},${exp.col}）`;
      return null;
    }
    case "handCount": {
      const n = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "hand" && x.location.player === exp.player).length;
      if (n !== exp.n) return `${exp.player} の手札 ${n}枚（期待 ${exp.n}）`;
      return null;
    }
    case "deckLen":
      if ((res.piles.deck || []).length !== exp.n) return `山札 ${(res.piles.deck || []).length}枚（期待 ${exp.n}）`;
      return null;
    case "cardAtCell": {
      // 任意のカードトークンが指定マスにあるか（配置系＝新規idのカードを id 指定なしで検査）。
      const cards = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "cell" && x.location.row === exp.row && x.location.col === exp.col);
      if (cards.length === 0) return `cell ${exp.row},${exp.col} にカードが無い`;
      if (exp.faceUp != null && !cards.some((c) => !!c.faceUp === !!exp.faceUp)) return `cell ${exp.row},${exp.col} のカードが期待の向き(${exp.faceUp ? "表" : "裏"})でない`;
      return null;
    }
    // マスの重なり順（下→上の cardId の並び）。足下の隠し財産の「１番下に置く」用。
    // 🔴 **重なり順は tokens 配列の順だけで決まる**（後ろほど上＝１番上の原則）ので、
    //   並びそのものを見る。「置けたか」だけ見ると、一番上に置いても合格してしまう。
    case "cellStackOrder": {
      const cards = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "cell" && x.location.row === exp.row && x.location.col === exp.col);
      const ids = cards.map((c) => c.cardId);
      if (JSON.stringify(ids) !== JSON.stringify(exp.cards)) return `cell ${exp.row},${exp.col} の重なり（下→上）が ${JSON.stringify(ids)}（期待 ${JSON.stringify(exp.cards)}）`;
      return null;
    }
    // 0th拡張（やり直しのカギ）。「その相手はこのターンにロックできない。」
    // 🔴 これは state に入らない印（クライアントのローカルな記録）なので、トークンでは
    //   検査できない。ランナーが結果に添えてくれた値を見る。
    case "lockDisabled": {
      const 実際 = !!(res.lockDisabled || {})[exp.player];
      if (実際 !== !!exp.value) return `${exp.player} の「このターンロックできない」が ${実際}（期待 ${!!exp.value}）`;
      return null;
    }
    case "boardCardCount": {
      const n = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "cell").length;
      if (n !== exp.n) return `盤面のカード ${n}枚（期待 ${exp.n}）`;
      return null;
    }
    case "handHasCard": {
      // 生成idではなく cardId で「その手札に該当カードがあるか」を検査（捨て場から拾う等、id不定の時用）。
      const n = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "hand" && x.location.player === exp.player && x.cardId === exp.cardId).length;
      if (exp.n != null) { if (n !== exp.n) return `${exp.player} の手札の ${exp.cardId} が ${n}枚（期待 ${exp.n}）`; return null; }
      if (n < 1) return `${exp.player} の手札に ${exp.cardId} が無い`;
      return null;
    }
    case "publicDrawCount": {
      const n = res.tokens.filter((x) => x.kind === "card" && x.location.zone === "publicDraw" && x.location.player === exp.player).length;
      if (n !== exp.n) return `${exp.player} の公開ドロー ${n}枚（期待 ${exp.n}）`;
      return null;
    }
    // 1st EDITION の【財力】。state に入らない計算値なので、ランナーが添えた値を見る。
    // ⚠ **効果を走らせた後の値**（手札が増えていれば増えている）。
    case "wealth": {
      const w = (res.wealth || {})[exp.player];
      if (!w) return `${exp.player} の財力が取れない`;
      if (exp.base != null && w.base !== exp.base) return `${exp.player} の財力(base) が ${w.base}（期待 ${exp.base}）`;
      if (exp.bonusMax != null && w.bonusMax !== exp.bonusMax) return `${exp.player} の財力の修正上限 が ${w.bonusMax}（期待 ${exp.bonusMax}）`;
      return null;
    }
    // 「その手札効果が今使えるか」。🔴 財力の条件を満たさない時に**押せないこと**を直接見る
    //   （効果の結果だけ見ると「何も起きなかった」と区別がつかない）。
    case "handUsable": {
      const 実際 = !!res.diag?.canUse;
      if (実際 !== !!exp.value) return `手札効果が使えるか ${実際}（期待 ${!!exp.value}）`;
      return null;
    }
    case "called": {
      // callLog に指定の呼び出しがあるか（delegateToPlayer 等のオーケストレーションを検査）。
      const hits = (res.calls || []).filter((c) => c[0] === exp.name && (exp.arg == null || c.slice(1).includes(exp.arg)));
      if (exp.n != null) { if (hits.length !== exp.n) return `${exp.name}${exp.arg != null ? "(" + exp.arg + ")" : ""} の呼び出しが ${hits.length}回（期待 ${exp.n}）`; return null; }
      if (hits.length < 1) return `${exp.name}${exp.arg != null ? "(" + exp.arg + ")" : ""} が呼ばれていない`;
      return null;
    }
    default:
      return `未知のアサーション ${exp.kind}`;
  }
}
