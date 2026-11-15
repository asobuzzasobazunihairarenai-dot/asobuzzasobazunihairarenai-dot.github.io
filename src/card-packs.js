// 「パック開封」（2026-11-15・続き726）。
//
// 🔴 ユーザー指示「**ではパック開封に進もう！今は管理者だけが見れるようにしてください。**」
//
// ■ 何のためか
//   マイ山札（src/my-stack.js）は、公式ルールどおり「**他のエディションや拡張パックのカードを
//   混ぜて**自分だけの山札にする」遊び方。ところがアプリでは 0th拡張・1st EDITION の札が
//   まだ誰の手にも無いので、**7色はほぼ一意に決まってしまう**（赤の枠14に対して候補が2種）。
//   ⇒ パックは「**まだ持っていない札を手に入れる道**」。手に入れた札が、そのまま
//      マイ山札の候補として増える。この2つは**セットで初めて意味を持つ**。
//
// ■ いまの決まり（v1・管理者だけ）
//   ・1パック **7枚**（セブンになぞらえて）。6枚は通常枠、1枚は**レア枠**（ONLYカードが出やすい）。
//   ・**まだ持っていない札を優先**して出す（集まりきるまで同じ札ばかり出ないように）。
//   ・所持は**種類**で数える（1枚持っていれば、マイ山札では公式ルールの上限まで使える）。
//     ⇒ だぶった時は「所持済み」と出るだけ。⚠ ここは**かけら等に換える余地**を残してある
//        （通貨はサーバー側の RPC なので、v1 では触らない＝SQL の追加を増やさない）。
//   ・**買う仕組みは無い**（管理者が開けるだけ）。ショップやランク報酬に繋ぐのは次の段。
//
// 🔴 **このファイルは何も import しない葉にしてある**（card-set.js / my-stack.js と同じ作法）。
//   カードの表は**引数で受け取る**。覚えるのは localStorage だけで、サーバーは使わない
//   （＝SQL も Edge Function も変更なし）。

// 🔴【続き727】ユーザー判断「**セブンになぞらえて7枚はどう？**」。5枚→**7枚**。
//   このゲームは7色・7×7マス・ロック7色と**全部7で出来ている**ので、パックだけ5枚なのは
//   別の世界の数だった。⚠ 1行変えるだけで済むように、枚数はここ1か所だけが持っている。
export const PACK_SIZE = 7;
export const RARE_SLOT = 1; // 7枚のうち1枚がレア枠

const KEY = "so7-card-packs-v1";

let 所持 = new Set();
let 開けた数 = 0;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    if (o && typeof o === "object") {
      if (Array.isArray(o.owned)) for (const id of o.owned) if (typeof id === "string") 所持.add(id);
      開けた数 = Math.max(0, Math.floor(Number(o.opened) || 0));
    }
  }
} catch (e) {
  // プライベートウィンドウ等で読めないことがある。何も持っていない状態から始まるだけ。
}

function 保存() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owned: [...所持], opened: 開けた数 }));
  } catch (e) {
    /* 覚えられなくても、そのセッションの間は効く */
  }
  for (const fn of 購読) {
    try {
      fn();
    } catch (e) {
      console.error("[card-packs] 購読先で例外", e);
    }
  }
}

export function ownsCard(cardId) {
  return 所持.has(cardId);
}
export function getOwnedCardIds() {
  return [...所持];
}
export function getOpenedCount() {
  return 開けた数;
}
export function addOwnedCards(ids) {
  for (const id of ids || []) if (typeof id === "string") 所持.add(id);
  保存();
}
export function resetOwnedCards() {
  所持 = new Set();
  開けた数 = 0;
  保存();
}
// 管理用（テストのため全部手に入れる）。
export function grantAllCards(pool) {
  for (const c of pool || []) if (c?.id) 所持.add(c.id);
  保存();
}

const 購読 = new Set();
export function onCardPacksChange(fn) {
  購読.add(fn);
  return () => 購読.delete(fn);
}

// ── 開封 ────────────────────────────────────────────────────────────────
function 混ぜる(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// pool は [{ id, color, only }] の配列（パックに入り得る札の全部）。
// 戻り値: [{ id, rare, isNew }]（5枚）。**所持はまだ足さない**——画面が1枚ずつめくった後に
// addOwnedCards を呼ぶ（途中で閉じても「見ていない札を持っている」ことにならないように）。
export function drawPack(pool) {
  const 全部 = (pool || []).filter((c) => c && c.id);
  if (全部.length === 0) return [];
  const 未所持 = 全部.filter((c) => !所持.has(c.id));
  const 出た = [];
  const 使った = new Set();

  const 引く = (候補) => {
    const 残り = 候補.filter((c) => !使った.has(c.id));
    if (残り.length === 0) return null;
    const pick = 混ぜる(残り)[0];
    使った.add(pick.id);
    return pick;
  };

  // レア枠: ONLYカードを優先。未所持の ONLY がいればそちらを先に。
  const only = 全部.filter((c) => c.only);
  const onlyNew = only.filter((c) => !所持.has(c.id));
  const rare = 引く(onlyNew.length ? onlyNew : only) || 引く(未所持) || 引く(全部);
  if (rare) 出た.push({ id: rare.id, rare: true, isNew: !所持.has(rare.id) });

  // 通常枠: 未所持を優先、尽きたら全部から（＝だぶる）。
  while (出た.length < PACK_SIZE) {
    const pick = 引く(未所持) || 引く(全部);
    if (!pick) break;
    出た.push({ id: pick.id, rare: false, isNew: !所持.has(pick.id) });
  }

  // レア枠は最後に出す方が盛り上がるので、並びは「通常4枚 → レア1枚」にする。
  const 通常 = 出た.filter((c) => !c.rare);
  const レア = 出た.filter((c) => c.rare);
  return [...通常, ...レア];
}

// 画面が開封を終えた時に呼ぶ（ここで初めて所持に入る）。
export function commitPack(cards) {
  開けた数++;
  addOwnedCards((cards || []).map((c) => c.id));
}
