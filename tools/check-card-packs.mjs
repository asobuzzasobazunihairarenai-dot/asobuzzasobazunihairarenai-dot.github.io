// パック開封の「サーバー側の写し」が、手元のカードの表とズレていないかを見る。
//
// 【なぜ要るか】パックに入り得る札は **supabase_setup_so7.sql の so7_pack_pool() が正**
// （引くのはサーバー。クライアントで引くと「欲しい札が出るまでやり直す」ができてしまう）。
// ところがカードの表は src/cards-data-ex0.js / src/cards-data-1st.js に在るので、
// **札を1枚足したり ONLY の印を変えたりすると黙ってズレる**。
// ズレたまま気づかないと「新しい札がいつまでも出てこない」「ONLYが7枚入る」になる。
// 続き671 の「まぜる」の写し（tools/check-mixed-deck.mjs）と同じ守り方。
//
// 値段と枚数も同じ理由で見る: 値段を決めているのは SQL（クライアントから cost を受け取ると
// 0 を渡せてしまうため）、画面に出す値段は src/card-packs.js。**2か所にある**ので必ず照合する。
//
// 使い方: node tools/check-card-packs.mjs
import fs from "node:fs";
import { EX0_NORMAL_CARDS } from "../src/cards-data-ex0.js";
import { FIRST_ED_NORMAL_CARDS } from "../src/cards-data-1st.js";

const sql = fs.readFileSync("supabase_setup_so7.sql", "utf8");
const js = fs.readFileSync("src/card-packs.js", "utf8");
let bad = 0;
const NG = (msg) => {
  console.log("❌ " + msg);
  bad++;
};

// ── ① so7_pack_pool() の中身 ───────────────────────────────────────────────
const 頭 = sql.indexOf("create or replace function so7_pack_pool()");
if (頭 < 0) {
  NG("supabase_setup_so7.sql に so7_pack_pool() が無い");
} else {
  const 尻 = sql.indexOf("$$;", 頭);
  const 本文 = sql.slice(頭, 尻);
  const 行 = [...本文.matchAll(/\('([a-z0-9-]+)'(?:::text)?,\s*(true|false)(?:::boolean)?\)/g)];
  const サーバー = new Map(行.map((m) => [m[1], m[2] === "true"]));
  const 手元 = new Map(
    [...EX0_NORMAL_CARDS, ...FIRST_ED_NORMAL_CARDS].map((c) => [c.id, !!c.only])
  );
  for (const [id, only] of 手元) {
    if (!サーバー.has(id)) NG(`so7_pack_pool() に ${id} が無い（手元には在る）`);
    else if (サーバー.get(id) !== only) {
      NG(`${id} の ONLY が食い違う（手元 ${only} / サーバー ${サーバー.get(id)}）`);
    }
  }
  for (const id of サーバー.keys()) {
    if (!手元.has(id)) NG(`so7_pack_pool() の ${id} が手元のカードの表に無い`);
  }
  if (bad === 0) {
    const only = [...手元.values()].filter(Boolean).length;
    console.log(`  パックの札 ${手元.size} 種類（ONLY ${only} 枚）が、サーバーの写しと一致`);
  }
}

// ── ② 値段・枚数・上限・両替レート ─────────────────────────────────────────
function jsConst(name) {
  const m = js.match(new RegExp("export const " + name + "\\s*=\\s*(\\d+)"));
  return m ? Number(m[1]) : null;
}
function sqlConst(re, 名) {
  const m = sql.match(re);
  if (!m) {
    NG(`SQL から ${名} を読み取れない`);
    return null;
  }
  return Number(m[1]);
}

const 照合 = [
  ["PACK_COST", jsConst("PACK_COST"), sqlConst(/c_cost constant int := (\d+);/, "1パックの値段")],
  [
    "PACK_SIZE",
    jsConst("PACK_SIZE"),
    // so7_open_pack の通常枠は「1パックの枚数 - 1」（最後の1枚がレア枠）。
    (() => {
      const m = sql.match(/commons as \([\s\S]*?limit (\d+)/);
      return m ? Number(m[1]) + 1 : (NG("SQL から1パックの枚数を読み取れない"), null);
    })(),
  ],
  ["COPY_MAX", jsConst("COPY_MAX"), sqlConst(/case when p\.is_only then 1 else (\d+) end as cap/, "1種類の上限")],
  ["WILD_PER", jsConst("WILD_PER"), sqlConst(/wild_shards \/ (\d+),/, "ワイルドの両替レート")],
];
for (const [名, a, b] of 照合) {
  if (a === null) NG(`src/card-packs.js に ${名} が無い`);
  else if (b !== null && a !== b) NG(`${名} が食い違う（手元 ${a} / サーバー ${b}）`);
}
if (bad === 0) {
  console.log(
    `  値段 ${照合[0][1]} かけら・1パック ${照合[1][1]}枚・1種類 ${照合[2][1]}枚まで・` +
      `欠片 ${照合[3][1]}個でワイルド1枚 が両方で一致`
  );
}

console.log(bad === 0 ? "✅ 問題なし（パックのサーバー側の写しと手元が一致）" : `❌ ${bad} 件`);
process.exitCode = bad === 0 ? 0 : 1;
