// イラストが届くまでの「**透明な下地**」を1枚作る道具。
//
//   node tools/make-blank-illust.mjs <出力.png> [一辺]
//
// 🔴 なぜ透明か
//   `make-card.mjs` は `--illust` が要るが、**偽の絵を描くと本物と見分けが付かなくなる**。
//   透明な絵を渡すと2層目・3層目が何も足さないので、**枠だけの素のカード**が焼ける
//   （色のべた塗り・枠・帯・紙の肌理は出る）。イラストが届いたら同じ道具で焼き直すだけ。
//
// ⚠ 外の道具は使わない（sharp 等はこの環境に無い）。zlib だけで PNG を書く。
import fs from "node:fs";
import zlib from "node:zlib";

const 出 = process.argv[2];
const 辺 = Number(process.argv[3] || 1254);
if (!出) {
  console.error("使い方: node tools/make-blank-illust.mjs <出力.png> [一辺]");
  process.exit(2);
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const 塊 = (型, 中) => {
  const 長 = Buffer.alloc(4);
  長.writeUInt32BE(中.length, 0);
  const 本 = Buffer.concat([Buffer.from(型, "ascii"), 中]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(本), 0);
  return Buffer.concat([長, 本, c]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(辺, 0);
ihdr.writeUInt32BE(辺, 4);
ihdr[8] = 8; // ビット深度
ihdr[9] = 6; // RGBA
const 生 = Buffer.alloc((辺 * 4 + 1) * 辺); // 全部 0 ＝ フィルタ0・RGBA すべて 0（完全な透明）
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  塊("IHDR", ihdr),
  塊("IDAT", zlib.deflateSync(生, { level: 9 })),
  塊("IEND", Buffer.alloc(0)),
]);
fs.writeFileSync(出, png);
console.log("透明な下地を書いた: " + 出 + "（" + 辺 + "x" + 辺 + "・" + png.length + "バイト）");
