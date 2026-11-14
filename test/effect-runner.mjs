// カード効果ユニットテストのブラウザ内ランナー（続き240で test/effects.mjs から分離）。
// ブラウザ専用: /src を import するため Node から直接 import してはいけない
// （Playwright の page.evaluate 内、またはアプリ内オールテストから import して使う）。
// 相対パスで import する（GitHub Pages はサブパス /7-SHADES-…/ 配下配信のため、絶対 /src/…
// だとサブパスが抜けて 404 になる／アプリの singleton と別インスタンスになる。test/ から見て ../src/）。
import * as st from "../src/state.js";
import * as eng from "../src/card-effect-engine.js";

// 1ケース分を実行して最終 state 等を返す（アサーションは effect-cases.js の checkExpect が行う）。
export async function runOneCase(spec) {
  st.setOnlineMode(false);
  eng.setAutoProcessingEnabled(true); // 手札効果は canUseHandEffect→isHandEffectOptionUsable が自動処理ONを要求
  eng.resetHandEffectUsage?.(); // 「1ターンに1度」等の使用回数をケース間でリセット
  const hydrated = JSON.parse(JSON.stringify(spec.state));
  // 実ゲームの状態は turnNumber を必ず持つ。未指定だと isHandEffectDisabledThisTurn の
  // 「handEffectDisabledUntilTurn.get(id)(=undefined) === turnNumber(=undefined)」が誤って
  // true になり手札効果が使用不可になるため、数値の既定を入れておく（テスト用の補正）。
  if (typeof hydrated.turnNumber !== "number") hydrated.turnNumber = 1;

  // 0th拡張（リーチキャンセル・ゲートチャージ）: 「移動前のマス」を筋書きから作る。
  // 🔴 **本物と同じ記録の関数（notePieceLocationsForMovedFrom）を通す**。専用の差し込み口を
  //   作ると、記録の仕組みそのものがテストされない（アプリは render() のたびにこれを呼ぶ）。
  //   やり方は「一度その前のマスに居る state を置いて記録 → 本当の state を置いて記録」。
  if (spec.movedFrom) {
    const 前 = JSON.parse(JSON.stringify(hydrated));
    for (const tk of 前.tokens) {
      const 元 = tk.kind === "piece" ? spec.movedFrom[tk.player] : null;
      if (元) tk.location = { zone: "cell", row: 元.row, col: 元.col };
    }
    st.hydrateState(前);
    eng.notePieceLocationsForMovedFrom?.();
  }
  st.hydrateState(hydrated);
  if (spec.movedFrom) eng.notePieceLocationsForMovedFrom?.();

  // 🔴【#627・2026-11-14】無意味ループ防止（#49）の「この連鎖で通ったマスの回数」。
  //   本物は main.js が持つ Map で、`recordMoveVisited` が増やし `isLoopMoveDest` が見る。
  //   スタブが `() => false` の素通りだったので、**この守りがテストで一度も効いていなかった**。
  //   ⚠ 台本の `visited: [{row,col}, …]` で「もう通ったことにする」（移動前のマスは
  //     本物では必ず通っているので、それを再現しないと CPU の枝を検査できない）。
  const visitedCells = new Map();
  for (const c of spec.visited || []) {
    if (c && typeof c.row === "number") visitedCells.set(c.row + "," + c.col, (visitedCells.get(c.row + "," + c.col) || 0) + 1);
  }

  // 0th拡張（バスストップ）: 「このターンにこれがオープンされたのなら」を筋書きから作る。
  // 🔴 これが無いと**その枝を一度も通せない**（記録はオープンした時にだけ付くもので、
  //   テストは state を直に置くので誰もオープンしない）。
  for (const id of spec.openedThisTurn || []) eng.noteCardOpenedThisTurn?.(id);
  // 0th拡張（やり直しのカギ）: 「相手がロックを宣言した時」の割り込みの窓を筋書きから開ける。
  // 🔴 本物と同じ記録の関数（noteInterruptWindow）を通す。これが無いと**その枝を一度も
  //   通せない**（窓は main.js の fireAnytimeCheckpoint が開けるもので、テストには無い）。
  //   ⚠ 第3引数 tokenId は 1st EDITION（裏貴族の賄賂）が使う「いまロックしようとしている札」。
  if (spec.interruptWindow)
    eng.noteInterruptWindow?.(spec.interruptWindow.kind, spec.interruptWindow.player, spec.interruptWindow.tokenId ?? null);
  const picks = spec.picks || {};
  const cursors = {};
  const nextPick = (type) => {
    const arr = picks[type] || [];
    const i = cursors[type] || 0;
    cursors[type] = i + 1;
    return arr[i];
  };
  const callLog = [];
  let arrivalChainDepth = 0;
  const S = () => st.getState();
  const findToken = (id) => S().tokens.find((t) => t.id === id);

  // 選択候補(candidates)から、台本の指定に一致する候補を返す。指定は {row,col} / {zone,side,index} /
  // "index:N" / トークンid（handCard用）/ 生の値（player/option/colors）。
  const resolveLocation = (spec2, candidates) => {
    if (spec2 === "skip") return null; // 「これ以上選ばない」（allowSkip の効果を明示的に終了）
    if (spec2 == null) return candidates && candidates[0];
    if (typeof spec2 === "string" && spec2.startsWith("index:")) return candidates[parseInt(spec2.slice(6), 10)];
    if (spec2 && spec2.zone === "lock") return (candidates || []).find((c) => c.zone === "lock" && c.side === spec2.side && c.index === spec2.index) || spec2;
    if (spec2 && typeof spec2.row === "number") return (candidates || []).find((c) => c.zone === "cell" && c.row === spec2.row && c.col === spec2.col) || { zone: "cell", row: spec2.row, col: spec2.col };
    return spec2;
  };

  const helpers = {
    // --- 状態変更（本物の state.js を dispatch）---
    // 本物（main.js の moveAndSyncForEffect__inner）の並び:
    //   (tokenId, location, soundName, suppressArrival, awaitExposedArrival, skipExposedArrival, animOpts)
    // ⚠ スタブは本物と同じ並びで書く（続き479）。第6引数は記録だけ（state は変わらない）。
    moveAndSync: async (tokenId, location, sound, suppressArrival, awaitExposedArrival, skipExposedArrival) => {
      callLog.push(["moveAndSync", tokenId, location]);
      if (skipExposedArrival) callLog.push(["moveAndSyncSkipExposed", tokenId]);
      st.moveToken(tokenId, location, suppressArrival);
    },
    // 第2引数は本物（main.js の discardFromHandReveal）ではオプション（{silent}/{noBurn}）。
    // 昔ここを「捨て先の山」として受けていた名残があったので、文字列の時だけ山名として扱う。
    discardAndSync: async (tokenId, opts) => {
      const pile = typeof opts === "string" ? opts : "discard";
      callLog.push(["discard", tokenId, pile]);
      st.sendTokenToPile(tokenId, pile);
    },
    drawCards: async (player, count) => { callLog.push(["draw", player, count]); for (let i = 0; i < count; i++) st.drawFromPile("deck", { zone: "hand", player }); },
    // 🔴 本物（main.js の flipToFaceUpForEffect）は**表裏を反転する**（名前に反してトグル。
    //   card-effect-engine.js の PLACE_CARD のコメント参照）。ここは長らく「裏→表」の
    //   片道だったので、1st EDITION の「このカードを裏向きにする」（路地裏のスラム街）や
    //   「裏向きにして重ねる」（食べ過ぎ）を**一度も検査できていなかった**
    //   ＝スタブが本物より甘いと検査にならない（続き479）。本物に合わせて反転にする。
    flipCard: async (tokenId) => { callLog.push(["flip", tokenId]); const t = findToken(tokenId); if (t) st.flipToken(tokenId); },
    // 🔴【#608・2026-11-12】**本物と同じ引数の並びにそろえた。** 本物は
    //   placeFromDeckForEffect(location, opts) で、opts.quick は飛翔の演出を省くだけ。
    //   ここには以前**スタブにだけ在る faceUp**が第2引数に座っていて（続き651 で気づいて
    //   いたのに直していなかった）、engine が opts を渡した瞬間に**表向きで置かれて**
    //   ピーターフッドのテストが落ちた。engine からは誰も faceUp を渡していない。
    placeFromDeck: async (location, opts) => { callLog.push(["placeFromDeck", location, opts && opts.quick ? "quick" : ""]); st.drawFromPile("deck", location); },
    placeFromDeckReveal: async (location) => { callLog.push(["placeFromDeckReveal", location]); st.drawFromPile("deck", location); },
    swapPieces: async (pieceTokenId, fromLocation, targetLocation) => {
      callLog.push(["swap", pieceTokenId, targetLocation]);
      const opp = S().tokens.find((t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === targetLocation.row && t.location.col === targetLocation.col);
      if (!opp) return;
      st.swapPieceLocations(pieceTokenId, opp.id, true); // 本物と同じ原子的入れ替え(ローカル)
    },
    // 相手(target)と自分(player)で手札を1枚ずつ入れ替える（無作為＝先頭で代用）。
    swapRandomHandCard: async (player, target) => {
      callLog.push(["swapRandomHandCard", player, target]);
      const handOf = (p) => S().tokens.filter((t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === p);
      const mine = handOf(player)[0];
      const theirs = handOf(target)[0];
      if (theirs) st.moveToken(theirs.id, { zone: "hand", player });
      if (mine) st.moveToken(mine.id, { zone: "hand", player: target });
    },
    // 相手pの手札から1枚（無作為＝先頭で代用）をトークンで返す。engine が .id を discardAndSync する。
    pickRandomFromOpponentHand: async (p) => {
      const tok = S().tokens.find((t) => t.kind === "card" && t.location.zone === "hand" && t.location.player === p);
      callLog.push(["pickRandomFromOpponentHand", p, tok && tok.id]); return tok || null;
    },
    // 捨て場の一番上を手札へ引く（トークンを返す）。first-red の「上から2番目」処理で使う。
    drawFromDiscard: async (player) => {
      const before = new Set(S().tokens.map((t) => t.id));
      st.drawFromPile("discard", { zone: "hand", player });
      const nw = S().tokens.find((t) => !before.has(t.id) && t.location.zone === "hand" && t.location.player === player);
      callLog.push(["drawFromDiscard", nw && nw.cardId]); return nw || null;
    },
    // N枚を公開ドローゾーン(publicDraw)へ引く。返り値: cardId配列（gamble）/ token id配列（first-green等）。
    publicDrawThenReveal: async (player, count) => { const ids = []; for (let i = 0; i < count; i++) { const b = new Set(S().tokens.map((t) => t.id)); st.drawFromPile("deck", { zone: "publicDraw", player }); const nw = S().tokens.find((t) => !b.has(t.id)); if (nw) ids.push(nw.cardId); } callLog.push(["publicDrawThenReveal", player, count]); return ids; },
    publicDraw: async (player, count) => { const ids = []; for (let i = 0; i < count; i++) { const b = new Set(S().tokens.map((t) => t.id)); st.drawFromPile("deck", { zone: "publicDraw", player }); const nw = S().tokens.find((t) => !b.has(t.id)); if (nw) ids.push(nw.cardId); } callLog.push(["publicDraw", player, count]); return ids; },
    publicDrawReturningTokens: async (player, count) => { const ids = []; for (let i = 0; i < count; i++) { const b = new Set(S().tokens.map((t) => t.id)); st.drawFromPile("deck", { zone: "publicDraw", player }); const nw = S().tokens.find((t) => !b.has(t.id)); if (nw) ids.push(nw.id); } callLog.push(["publicDrawReturningTokens", player, count]); return ids; },

    // --- 選択（台本を消費）---
    // 続き479の教訓（スタブは本物と同じ引数の並び・同じ厳しさで書く）。本物は
    // (candidates, hint, options)。options.purpose / options.avoidCells は CPU の自動選択の
    // 切り替えに使われるので、渡っているかを callLog に残して検査できるようにする。
    // 【続き546】ロックカードをまとめて捨てる（本物は main.js の requestLockCardsOrderedForEffect）。
    // 筋書きは「lockCardsOrdered」にトークンidの配列（捨てる順）を置く。**指定が無ければ null**
    // を返して従来の1枚ずつ経路へ落とす——本物も CPU の番では null を返し、engine がそちらへ
    // 落ちる作りなので、その分岐そのものをテストでも通す。渡された候補に含まれない札を
    // 指定したら例外にする（スタブが甘いと検査にならない＝続き479）。
    pickLockCardsOrdered: async (player, hint, tokens, options) => {
      const want = nextPick("lockCardsOrdered");
      if (!Array.isArray(want)) return null;
      const ids = new Set((tokens || []).map((tk) => tk.id));
      const order = want.map((w) => {
        const tok = findToken(w);
        if (!tok) throw new Error("pickLockCardsOrdered: " + w + " というトークンが無い");
        if (!ids.has(tok.id)) throw new Error("pickLockCardsOrdered: " + tok.id + " は候補に含まれていない");
        return tok;
      });
      callLog.push(["pickLockCardsOrdered", order.map((tk) => tk.id).join(",")]);
      if (Number.isFinite(options?.drawPer))
        callLog.push(["pickLockCardsOrderedDrawPer", String(options.drawPer)]);
      return order;
    },
    pickLocation: async (candidates, hint, options) => {
      // 🔴【#555・2026-11-11】**選んだマスも候補に残る**ようになった（もう一度押すと外れる）。
      //   台本に書かれていない時に candidates[0] を返すと、**外した同じマスをまた返す**ので
      //   **無限に回る**（実際にテストが止まった）。書かれていない時は「まだ選んでいない候補」から選ぶ。
      //   ⚠ 台本で**わざと選び済みのマスを指定**した時（＝外す検査）は、全部の候補から探す。
      const 希望 = nextPick("location");
      const 済 = new Set(((options && options.selectedCells) || []).map((c) => c.row + "," + c.col));
      const 未選択 = (candidates || []).filter((c) => !(c.zone === "cell" && 済.has(c.row + "," + c.col)));
      const 探す先 = 希望 == null ? 未選択 : candidates;
      const r = resolveLocation(希望, 探す先);
      callLog.push(["pickLocation", r]);
      // 🔴 候補の**数**を残す。候補の絞り込み（「あなたの隣以外」「プレイヤーのいない
      //   マス」等）は、resolveLocation が候補外の指定もそのまま返すため、座標を指定する
      //   形のテストでは通らない。数を見れば「何マス外したか」を検査できる。
      // ⚠ 数は**まだ選んでいない候補**で記録する（既存の台本の期待値の意味を変えないため。
      //   見たいのは「絞り込みで何マス外したか」であって、選び済みの数ではない）。
      callLog.push(["pickLocationCandidates", String(未選択.length)]);
      callLog.push(["pickLocationPurpose", options?.purpose ?? null]);
      if (options?.avoidCells) for (const a of options.avoidCells) callLog.push(["pickLocationAvoidCell", a.row + "," + a.col]);
      return r;
    },
    // 【2026-09-08・続き479】引数の並びが本物とずれていた（本物は (player, hint, tokenIdFilter, options)）。
    // 第2引数を filter として受けていたので実際には見出しの文字列を掴んでおり、**絞り込みを一度も
    // 検査できていなかった**。そのせいで「配列を渡していて本物では TypeError になる」不具合を
    // 58/58 PASS のまま素通りさせた（オンラインの通しテストで初めて表に出た）。並びを本物に合わせ、
    // 渡された候補に含まれているかも検査する。
    pickHandCard: async (player, hint, tokenIdFilter, options) => {
      const want = nextPick("handCard");
      let tok = null;
      if (want && typeof want === "string" && want.startsWith("index:")) { const hand = S().tokens.filter((t)=>t.kind==="card"&&t.location.zone==="hand"&&t.location.player===player); tok = hand[parseInt(want.slice(6),10)]; }
      else if (want) tok = findToken(want);
      if (tok && tokenIdFilter) {
        const ids = tokenIdFilter instanceof Set ? tokenIdFilter : new Set(tokenIdFilter);
        if (!ids.has(tok.id)) throw new Error("pickHandCard: " + tok.id + " は候補に含まれていない");
      }
      callLog.push(["pickHandCard", tok && tok.id]);
      // #336: 「今拾ったばかりの札は置き直さない」指定が渡っているか（CPUの自動選択で使う）。
      if (options?.avoidTokenIds) for (const id of options.avoidTokenIds) callLog.push(["pickHandCardAvoid", id]);
      return tok || null;
    },
    // 【#344】順番を付けて複数枚まとめて選ぶ（本物は main.js の
    // requestHandCardsOrderedForEffect）。テストの筋書きは「pickHandCardsOrdered」に
    // トークンidの配列（捨てる順）を1つ置く。**本物と同じ厳しさ**で、渡された候補に
    // 含まれない札を指定したら例外にする（続き479の教訓＝スタブが甘いと検査にならない）。
    pickHandCardsOrdered: async (player, hint, tokenIdFilter, options) => {
      const ids = tokenIdFilter instanceof Set ? tokenIdFilter : new Set(tokenIdFilter || []);
      const want = nextPick("handCardsOrdered");
      let order = [];
      if (Array.isArray(want)) {
        for (const w of want) {
          const tok = findToken(w);
          if (!tok) throw new Error("pickHandCardsOrdered: " + w + " というトークンが無い");
          if (!ids.has(tok.id)) throw new Error("pickHandCardsOrdered: " + tok.id + " は候補に含まれていない");
          order.push(tok);
        }
      } else {
        // 筋書きに指定が無ければ、渡された候補をそのままの並びで返す（＝順番を選ばない）。
        order = [...ids].map((id) => findToken(id)).filter(Boolean);
      }
      // 【続き545】limit ＝「この枚数だけ選ぶ」（役人・選べる罠）。本物は limit を超えて
      // 選べないので、スタブでも超えたら例外にする。筋書きが無い時は先頭から limit 枚。
      if (Number.isFinite(options?.limit)) {
        if (Array.isArray(want) && order.length !== options.limit)
          throw new Error("pickHandCardsOrdered: limit=" + options.limit + " なのに " + order.length + " 枚指定された");
        order = order.slice(0, options.limit);
        callLog.push(["pickHandCardsOrderedLimit", String(options.limit)]);
      } else if (options?.anyCount) {
        // 🔴【2026-11-06・#517】anyCount ＝「０枚から好きな枚数」。押した札だけが返る。
        callLog.push(["pickHandCardsOrderedAnyCount", "1"]);
      } else {
        // 🔴 limit も anyCount も無い＝本物は「**全部捨てる。選ぶのは順番だけ**」。
        //   選ばなかった札を並び順のまま後ろへ足すのが本物の振る舞いなので、スタブも同じにする。
        //   ⚠ ここを「指定された分だけ返す」ままにしていたせいで #517 を取り逃がした
        //     （スタブが本物より優しいと、本番だけ壊れる＝続き479・657 の教訓）。
        const みた = new Set(order.map((tk) => tk.id));
        for (const id of ids) {
          if (みた.has(id)) continue;
          const tok = findToken(id);
          if (tok) order.push(tok);
        }
      }
      callLog.push(["pickHandCardsOrdered", order.map((tk) => tk.id).join(",")]);
      if (options?.purpose) callLog.push(["pickHandCardsOrderedPurpose", options.purpose]);
      return order;
    },
    // 【#357】盤面のカードを捨てる順に選ぶ（本物は main.js の requestBoardCardsOrderedForEffect）。
    // 手札版と違い、候補は**トークンの配列**をそのまま受け取る（並びに意味がある＝ワイナウエアは
    // マスの上から順）。テストの筋書きは「boardCardsOrdered」にトークンidの配列（捨てる順）を置く。
    // 渡された候補の並びも記録する（上から順に渡せているかを検査できるように）。
    pickBoardCardsOrdered: async (player, hint, tokens, options) => {
      const list = (tokens || []).filter(Boolean);
      callLog.push(["pickBoardCardsOrderedCandidates", list.map((tk) => tk.id).join(",")]);
      const want = nextPick("boardCardsOrdered");
      let order = [];
      if (Array.isArray(want)) {
        const ids = new Set(list.map((tk) => tk.id));
        for (const w of want) {
          const tok = findToken(w);
          if (!tok) throw new Error("pickBoardCardsOrdered: " + w + " というトークンが無い");
          if (!ids.has(tok.id)) throw new Error("pickBoardCardsOrdered: " + tok.id + " は候補に含まれていない");
          order.push(tok);
        }
      } else {
        order = list; // 筋書きに指定が無ければ、渡された並びのまま（＝順番を選ばない）
      }
      callLog.push(["pickBoardCardsOrdered", order.map((tk) => tk.id).join(",")]);
      if (options?.purpose) callLog.push(["pickBoardCardsOrderedPurpose", options.purpose]);
      return order;
    },
    pickDiscardCost: async (candidates) => {
      // 追色コスト。engine は返り値の .id / .cardId を読む＝トークンを返す必要がある。
      const want = nextPick("discardCost");
      let tok = null;
      if (want && typeof want === "string" && want.startsWith("index:")) tok = (candidates || [])[parseInt(want.slice(6), 10)];
      else if (want) tok = (candidates || []).find((c) => c.id === want) || findToken(want);
      else tok = (candidates || [])[0];
      callLog.push(["pickDiscardCost", tok && tok.id]); return tok || null;
    },
    pickPlayer: async () => { const r = nextPick("player"); callLog.push(["pickPlayer", r]); return r; },
    // 選択肢モーダル: engine は選ばれた「オプションのオブジェクト」（.id/.actions/.usable）を期待する。
    // 台本には id 文字列を書く → 渡された options 配列から id 一致のオブジェクトを返す。
    // 🔴【#552・2026-11-11】**印（usable）そのものを記録する。**
    //   本物のピッカーは usable が false の選択肢を押せないようにするが、このスタブは
    //   id で探すだけだったので、**渡す側が印を付け忘れていても検査が通っていた**
    //   （治安悪化で全部グレーアウトして詰んだ＝#552）。印が無いものは ? と記録するので、
    //   台本に Flags の期待値を書けば「付け忘れ」をそのまま捕まえられる。
    pickArrivalOption: async (cardId, options) => { const want = nextPick("option"); callLog.push(["pickArrivalOptionFlags", (options || []).map((x) => x.id + "=" + ("usable" in x ? (x.usable ? "1" : "0") : "?")).join(",")]); const o = (options || []).find((x) => x.id === want && x.usable !== false) || null; callLog.push(["pickArrivalOption", want]); return o; },
    pickHandEffectOption: async (cardId, options) => { const want = nextPick("option"); callLog.push(["pickHandEffectOptionFlags", (options || []).map((x) => x.id + "=" + ("usable" in x ? (x.usable ? "1" : "0") : "?")).join(",")]); const o = (options || []).find((x) => x.id === want && x.usable !== false) || null; callLog.push(["pickHandEffectOption", want]); return o; },
    // 【#473/#474】汎用の「選択肢を1つ選ぶ」（足下の隠し財産の「山札から／手札から」）。
    // 台本には choice: ["deck"] のように id 文字列を書く。返すのは id（本物も id を返す）。
    // 🔴 候補の id も記録する——**聞かれなかったこと**（片方しか無い時は聞かない）も
    //   検査できるようにするため。
    pickChoice: async (cardId, options, title) => {
      const want = nextPick("choice");
      callLog.push(["pickChoice", want]);
      callLog.push(["pickChoiceOptions", (options || []).map((o) => o.id).join(",")]);
      return want ?? null;
    },
    declareColors: async () => { const r = nextPick("colors"); callLog.push(["declareColors", r]); return r; },
    gambleReveal: async () => { const r = nextPick("gamble"); callLog.push(["gambleReveal", r]); return r; },
    // 【#502】足下の隠し財産が「１番下へ沈める前に全員へ見せる」のを記録する。
    // ⚠ 本物（main.js）が両側の helpers に持っているものは、ここにも同じ名前で置く
    //   （スタブが本物より貧しいと検査にならず、豊かだと本番だけ落ちる＝続き657 の教訓）。
    revealCardToAll: async (cardId) => { callLog.push(["revealCardToAll", cardId]); },
    delegateToPlayer: async (p, taskType, taskArg) => {
      callLog.push(["delegateToPlayer", p, taskType]);
      if (taskArg !== undefined) callLog.push(["delegateToPlayerArg", JSON.stringify(taskArg)]);
      const want = nextPick("delegate");
      return want === undefined ? false : want;
    },
    // 🔴【#627・2026-11-14】ここは `() => false` の素通りだったので、**無意味ループ防止が
    //   テストで一度も効いていなかった**（本物より甘いスタブ＝続き479・657・668・690 と同じ形）。
    //   実害: リーチキャンセルの到達効果が CPU の上限 1 に毎回弾かれていたのに、
    //   テストは素通りして通り続けていた。⇒ 本物と同じ「通った回数を数える」形にする。
    //   台本に `cpuDriving: true` と `visited: [{row,col}, …]` を書けば、CPU の枝も検査できる。
    isLoopMoveDest: (cell, limit = 1) => {
      if (!cell || typeof cell.row !== "number") return false;
      return (visitedCells.get(cell.row + "," + cell.col) || 0) >= limit;
    },
    isCpuDriving: () => !!spec.cpuDriving,
    getPlayerName: (p) => p,

    // --- 演出/音/通知/その他（no-op）---
    announceCardAddedToHand: () => {}, announceColorsResolved: () => {}, announceDrawTargets: () => {},
    announceEffectChoice: () => {}, announceEffectNotice: () => {}, announceEffectReason: async () => {},
    announceFizzle: async () => {}, announceSteppedCard: () => {}, announceUse: () => {},
    beginPublicDrawDefer: () => {}, endPublicDrawDefer: () => {}, celebrate: () => {}, delay: async () => {},
    endCurrentPhase: () => { callLog.push(["endCurrentPhase"]); }, flyCardToHand: async () => {},
    // 0th拡張の「このターンを終了する。」（本物は main.js の endTurnForEffect）。
    endTurn: async (player) => { callLog.push(["endTurn", player]); },
    // 0th拡張（鑑定士の技・ジェイク）の「裏向きのカードの表面を見る」。見た cardId を残す。
    peekCards: async (ids) => { callLog.push(["peekCards", (ids || []).join(",")]); },
    // 【#481】選び終えてからまとめて1回だけ聞く確認。台本に confirmCells: [false] と書けば
    // 「いいえ（選び直し）」にできる。省略時は「はい」。
    // ⚠ 本物（main.js の confirmPickedCellsForEffect）は、基本設定で確認を切っている人や
    //   CPU には**聞かずに true を返す**。ここでは台本どおりに返す。
    confirmPickedCells: async (cardId, player, n) => {
      const want = nextPick("confirmCells");
      callLog.push(["confirmPickedCells", String(n)]);
      return want === undefined ? true : !!want;
    },
    clearPlacementTargets: () => { callLog.push(["clearPlacementTargets"]); },
    // 0th拡張（ピーターフッド）の「１〜７の数字を１つ選ぶ」。筋書きは picks.number。
    pickNumber: async (cardId, min, max) => {
      const want = nextPick("number");
      const n = want === undefined ? min : want;
      if (!(n >= min && n <= max)) throw new Error("pickNumber: " + n + " は " + min + "〜" + max + " の外");
      callLog.push(["pickNumber", String(n)]);
      return n;
    },
    // 0th拡張（紅の鉄拳）の「その相手に接触する」。本物は接触の宣言を始める（承認待ちに入る）。
    // 【追色S】奪う枚数も記録する（紅の鉄拳の「Sの２倍」の検査に使う）。
    // 🔴 省略された時は「1枚（今までどおり）」なので、そうと分かる文字列で残す。
    initiateContact: async (attacker, defender, stealCount) => {
      callLog.push(["initiateContact", attacker, defender]);
      callLog.push(["initiateContactSteal", stealCount === undefined ? "既定" : String(stealCount)]);
    },
    markDiscardAtTurnEnd: (player, ids) => { callLog.push(["markDiscardAtTurnEnd", player, ids]); }, markPlacedLocation: (location, options) => { callLog.push(["markPlacedLocation", location, options?.holdMs ?? null]); }, markPlacementTarget: () => {},
    maybeTriggerArrivalForPlacedCard: async () => {}, onCardAcquiredToHand: () => {},
    playAdditionalColorUse: () => {}, recordMoveVisited: (cell) => { if (cell && typeof cell.row === "number") visitedCells.set(cell.row + "," + cell.col, (visitedCells.get(cell.row + "," + cell.col) || 0) + 1); }, startSuspenseSound: () => {},
    stopSuspenseSound: () => {},
    // 【#619】本物は main.js の beginCameraHold/endCameraHold。見た目だけなので何もしない。
    holdCamera: () => {},
    // 【#333】「そのマスの到達効果を、この人に起こす」の呼び出しを記録する。空スタブのままだと
    // 到達を起こし忘れてもテストが通ってしまう（コノハナサクヤで実際に起きた）。
    // 🔴 既定はログだけ（今までどおり）。spec.realArrivalChain を立てた時だけ、本物と同じく
    //   **そのマスの到達効果を実際に起こす**。ヴィヴィアンの「その相手が到達したカードを
    //   …代わりにあなたの手札に加える」は、到達が起きないと検査できない（続き479＝
    //   スタブが甘いと検査にならない）。既存のケース（コノハナサクヤ #333）の意味を
    //   変えないよう、既定は据え置きにする。
    triggerArrivalAtIfFaceUp: async (location, player) => {
      callLog.push(["arrivalAt", location, player]);
      if (!spec.realArrivalChain) return;
      if (arrivalChainDepth >= 3) return; // 安全弁
      const stack = S().tokens.filter(
        (t) => t.kind === "card" && t.location.zone === "cell" && t.location.row === location.row && t.location.col === location.col
      );
      const top = stack[stack.length - 1];
      if (!top || !top.faceUp) return;
      const piece = S().tokens.find(
        (t) => t.kind === "piece" && t.location.zone === "cell" && t.location.row === location.row && t.location.col === location.col
      );
      arrivalChainDepth++;
      try {
        await eng.runArrivalEffect(
          {
            player: player ?? piece?.player ?? null,
            cardId: top.cardId,
            cardTokenId: top.id,
            pieceTokenId: piece?.id ?? null,
            pieceLocation: { zone: "cell", row: location.row, col: location.col },
          },
          helpers
        );
      } finally {
        arrivalChainDepth--;
      }
    },
  };

  // 手札効果ケースの失敗調査用の軽い診断（DEBUG_CALLS 時のみ出力）。
  let diag = null;
  if (spec.kind === "hand") {
    try {
      const opts = eng.getHandEffectOptions(spec.ctx.cardId);
      diag = {
        canUse: eng.canUseHandEffect(spec.ctx.cardId, spec.ctx.cardTokenId, spec.ctx.player),
        options: opts.map((o) => ({ label: o.label, cost: o.cost, actions: o.actions, inh: o.inheritsArrival, usable: eng.isHandEffectOptionUsable(spec.ctx.cardId, spec.ctx.cardTokenId, spec.ctx.player, o) })),
      };
    } catch (e) { diag = { probeError: String(e) }; }
  }
  try {
    if (spec.kind === "arrival") await eng.runArrivalEffect(spec.ctx, helpers);
    // 🔴 1st EDITION の【状況】カード。場の中央に在る間、**全員のターン開始時に**効く。
    //   本物（main.js の resolveSituationAtTurnStart）と同じ入口を呼ぶ。
    //   ⚠ 財力の条件は runSituationEffect の外（main.js 側）で見るので、ここでは
    //     「対象かどうか」も合わせて確かめられるよう situationAppliesTo を通す。
    else if (spec.kind === "situation") {
      const 対象 = eng.situationAppliesTo(spec.ctx.cardId, spec.ctx.player);
      callLog.push(["situationApplies", String(対象)]);
      callLog.push(["situationNeedsAsk", String(eng.situationNeedsWealthDeclaration(spec.ctx.cardId, spec.ctx.player))]);
      if (対象 || spec.situationForce) await eng.runSituationEffect(spec.ctx.cardId, spec.ctx.player, helpers);
    }
    else await eng.runHandEffect(spec.ctx, helpers);
  } catch (e) {
    return { error: String(e && e.stack || e), calls: callLog, tokens: S().tokens, piles: S().piles, diag };
  }
  // 0th拡張（やり直しのカギ）の検査用。state には入らない印なので、結果に添えて返す。
  const lockDisabled = {};
  for (const p of S().activePlayers || []) lockDisabled[p] = !!eng.isLockDisabledThisTurn?.(p);
  // 1st EDITION の【財力】の検査用。state には入らない計算値なので、結果に添えて返す。
  // 🔴 **効果を走らせた後の値**になる（手札が増えていれば増えている）。
  //   「条件を満たしていたか」を見たい時は handUsable（下の diag）か、効果の結果で見る。
  const wealth = {};
  for (const p of S().activePlayers || []) wealth[p] = eng.getWealth?.(p) ?? null;
  return { calls: callLog, tokens: S().tokens, piles: S().piles, diag, lockDisabled, wealth };
}
