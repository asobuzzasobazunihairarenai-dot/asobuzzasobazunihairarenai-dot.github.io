// 🔴【続き861】ランク戦のエディション投票の配線を見張る（28本目）。
//
// なぜ要るか:
//   この仕組みは **公開されているエディションが2つになるまで、誰の画面にも出ない**
//   （so7_ranked_vote_sets() が1件しか返さないため）。つまり**使われないまま置かれる**＝
//   黙って壊れても誰も気づかない（続き763 の「使われないコードを腐らせない」と同じ形）。
//   しかも壊れ方が静か: 鍵の名前が1文字ずれるだけで、**投票が一生数えられないのに
//   ランク戦は普通に動く**。
//
// ここで見るもの（どれか1つでも崩れたら、投票が黙って効かなくなる）:
//   ① 🔴 **保存の鍵がサーバーとクライアントで同じ**（rankedEditionVotes）
//      ——ここがズレるのが、いちばん起こりやすくて、いちばん気づけない壊れ方。
//   ② サーバーの決め方が、許された版だけを見ていて、**何が起きても 'remake' に落ちる**
//   ③ 対局を作る所が、決めたセットを**書いている**／**失敗しても対局は作る**
//   ④ 画面（rank-explain.js）が投票の口を**本当に呼んでいる**
//   ⑤ 🔴 ランク戦の開始が **null なら必ずリメイク**に落としている（安全網を消していない）
//   ⑥ 見た目: 指で押せる大きさの上書きと、明るいテーマの上書きが在る
import fs from "node:fs";
import path from "node:path";

const 根 = path.resolve(import.meta.dirname, "..");
const 読む = (p) => fs.readFileSync(path.join(根, p), "utf8").replace(/\r\n/g, "\n");

const NG = [];
const 行 = (名, 可, 実) => {
  if (!可) NG.push(名 + (実 === undefined ? "" : "  " + JSON.stringify(実)));
  console.log((可 ? "  ✅ " : "  ❌ ") + 名);
};

console.log("── ランク戦のエディション投票（出ていない間に腐らないか）──");

const sql = 読む("supabase_setup_so7.sql");
const 票 = 読む("src/ranked-edition-vote.js");
const 説明 = 読む("src/rank-explain.js");
const 通信 = 読む("src/online.js");
const 部屋 = 読む("src/online-ui.js");
const css = 読む("src/style.css");

// ── ① 保存の鍵が一致しているか（いちばん大事）────────────────────────
const 鍵のサーバー = [...sql.matchAll(/extra_prefs\s*->\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
const 鍵のクライアント = [...票.matchAll(/registerSyncedPref\(\s*"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
行("🔴 サーバーが読む鍵が1つに決まっている", 鍵のサーバー.filter((k) => k === "rankedEditionVotes").length >= 1, 鍵のサーバー);
行("🔴 クライアントが書く鍵が同じ（rankedEditionVotes）", 鍵のクライアント.includes("rankedEditionVotes"), 鍵のクライアント);

// ── ② サーバーの決め方 ─────────────────────────────────────────
const 決め = sql.slice(sql.indexOf("function so7_ranked_decide_card_set"));
const 決め本体 = 決め.slice(0, 決め.indexOf("$$;") + 3);
行("投票の選択肢を決める関数が在る（so7_ranked_vote_sets）", /function so7_ranked_vote_sets\(\)/.test(sql));
行("決め方の関数が在る（so7_ranked_decide_card_set）", 決め本体.length > 100);
行("🔴 許された版だけを見ている", /so7_ranked_vote_sets\(\)/.test(決め本体), 決め本体.length);
行("🔴 何が起きても 'remake' に落ちる（exception の受け）", /exception\s+when\s+others\s+then\s+return\s+'remake'/.test(決め本体));
行("票が多いほど選ばれやすい（重み付け＋ランダムに1つ）", /generate_series/.test(決め本体) && /order by random\(\)/.test(決め本体));

// ── ③ 対局を作る所 ─────────────────────────────────────────────
const 作る = sql.slice(sql.indexOf("function so7_ranked_create_game"));
const 作る本体 = 作る.slice(0, 作る.indexOf("$$;") + 3);
行("so7_games に書く列が在る（ranked_card_set）", /add column if not exists ranked_card_set text/.test(sql));
行("対局を作る時に、決めたセットを書いている", /insert into so7_games[\s\S]*?ranked_card_set/.test(作る本体) && /so7_ranked_decide_card_set/.test(作る本体));
行(
  "🔴 決め方が転んでも対局は作る（内側の exception の受け）",
  /begin[\s\S]{0,200}so7_ranked_decide_card_set[\s\S]{0,200}exception\s+when\s+others\s+then[\s\S]{0,80}'remake'/.test(作る本体),
);

// ── ④ 画面が口を呼んでいるか ────────────────────────────────────
const 説明から見える = (名) => new RegExp("\\b" + 名 + "\\s*\\(").test(説明);
行("画面が投票の希望を読んでいる", 説明.includes("getRankedEditionVotes") && 説明から見える("getRankedEditionVotes"));
行("画面が投票の希望を書いている", 説明.includes("setRankedEditionVotes") && 説明から見える("setRankedEditionVotes"));
行("🔴 選択肢をサーバーに聞いている（写しを持っていない）", 説明から見える("getRankedVoteSets"));
行("版の名前は1か所から引いている（セットの名）", 説明.includes("セットの名"));
行("通信の口が2つ在る", /export async function getRankedVoteSets/.test(通信) && /export async function getRankedCardSet/.test(通信));

// ── ⑤ ランク戦の開始の安全網 ────────────────────────────────────
const 開始 = 部屋.slice(0, 部屋.length);
行(
  "🔴 ランク戦の開始が『取れなければ必ずリメイク』に落ちている",
  /getRankedCardSet\(gameId\)\)\s*\|\|\s*CARD_SETS\.REMAKE/.test(開始),
);

// ── ⑥ 見た目 ─────────────────────────────────────────────────
行("札の見た目が在る", /\.ranked-vote-btn\s*\{/.test(css));
行("選ばれている印は border-color と地で出す（box-shadow を使わない＝教訓10）", /\.ranked-vote-btn\.is-selected\s*\{[^}]*border-color/.test(css));
行(
  "🔴 指で押す端末で大きくする上書きが在る（ステージごと縮むため）",
  // ⚠ 末尾を縛る——`-btn` だけで探すと **`-btn-x` のような別の名前にも当たって
  //   素通りする（A/B で実際に素通りした＝続き798「名前が在るかで合格にしない」の家族）。
  /body\.is-phone-device \.ranked-vote-btn[,\s{]/.test(css) && /body\.is-tablet-device \.ranked-vote-btn[,\s{]/.test(css),
);
行("明るいテーマの上書きが在る（片方で字が沈まない）", /body\.theme-light \.ranked-vote-btn\s*\{/.test(css));

// ── 進み具合（版が増えたら分かるように毎回出す）──────────────────────
const 許し = sql.match(/select array\[([^\]]*)\]::text\[\];/);
const 版の数 = 許し ? (許し[1].match(/'/g) || []).length / 2 : -1;
console.log(
  "  ⓘ いま投票に出せる版: " + 版の数 + " 件" +
  (版の数 < 2 ? "（1件なので**まだ誰の画面にも出ない**。版を公開したら so7_ranked_vote_sets() に足す）" : ""),
);

if (NG.length) {
  console.log("\n🔴 問題 " + NG.length + " 件");
  for (const n of NG) console.log("  ・" + n);
  process.exitCode = 1;
} else {
  console.log("✅ 問題なし（投票の配線は、サーバーから画面まで繋がっている）");
}
