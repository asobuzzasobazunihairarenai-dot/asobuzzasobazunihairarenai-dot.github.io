// JS のソースから「コメント」と「文字列」を**位置と行数を保ったまま**空白にする、小さな切り分け器。
//
// 🔴 **なぜ正規表現をやめたか**（2026-11-21 に実際に全部踏んだ）:
//   ・コメントを先に剥がすと、**文字列の中の `/*`** に引っぱられて広い範囲が消える
//   ・文字列を先に剥がすと、**コメントの中の引用符**で釣り合いが崩れる
//   ・テンプレートを先に剥がすと、**文字列の中のバッククォート**が始まりに見える
//   ・`//.*$` は **CRLF では効かない**（JS の `.` は `\r` に当たらない）
//   どれも「順番を変える」では直らない。**1文字ずつ読んで状態を持つ**のが本来の答え。
//
// 【使い方】
//   import { stripJs } from "./js-strip.mjs";
//   const code = stripJs(src);  // コメントと文字列の中身が空白になった、同じ長さ・同じ行数の文字列
//
// ⚠ 本物の構文解析器ではない（この環境には入っていない）。正規表現リテラルの判定だけは
//   「直前の意味のある文字」で近似する。判定を誤っても**空白にするかどうか**が変わるだけで、
//   行や位置はずれない。
export function stripJs(src) {
  const n = src.length;
  const out = new Array(n);
  let i = 0;
  // 直前の「意味のある文字」（空白・コメントを除く）。正規表現かどうかの判定に使う。
  let 直前 = "";
  const 保つ = (c) => (c === "\n" || c === "\r" ? c : " ");

  const 正規表現が来られる = () => {
    if (直前 === "") return true;
    if ("(,=:[!&|?{};+-*%~^<>".includes(直前)) return true;
    // `return /…/` `typeof /…/` のような語の後ろ
    return /[A-Za-z_$]/.test(直前) === false;
  };

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    // 行コメント
    if (c === "/" && c2 === "/") {
      while (i < n && src[i] !== "\n" && src[i] !== "\r") out[i++] = " ";
      continue;
    }
    // ブロックコメント
    if (c === "/" && c2 === "*") {
      out[i++] = " ";
      out[i++] = " ";
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) out[i] = 保つ(src[i]), i++;
      if (i < n) {
        out[i++] = " ";
        out[i++] = " ";
      }
      continue;
    }
    // 文字列（' " `）
    if (c === "'" || c === '"' || c === "`") {
      const 閉じ = c;
      out[i++] = c; // 引用符そのものは残す（式の形が崩れないように）
      while (i < n) {
        const d = src[i];
        if (d === "\\") {
          out[i] = " ";
          i++;
          if (i < n) out[i] = 保つ(src[i]), i++;
          continue;
        }
        if (d === 閉じ) break;
        // テンプレートの ${ … } は**中を残す**（関数呼び出しが書かれていることがある）
        if (閉じ === "`" && d === "$" && src[i + 1] === "{") {
          out[i++] = " ";
          out[i++] = " ";
          let 深さ = 1;
          while (i < n && 深さ > 0) {
            if (src[i] === "{") 深さ++;
            else if (src[i] === "}") 深さ--;
            if (深さ === 0) break;
            out[i] = src[i];
            i++;
          }
          if (i < n) out[i++] = " ";
          continue;
        }
        out[i] = 保つ(d);
        i++;
      }
      if (i < n) out[i++] = 閉じ;
      直前 = 閉じ;
      continue;
    }
    // 正規表現リテラル
    if (c === "/" && 正規表現が来られる()) {
      const 始 = i;
      let j = i + 1;
      let クラス = false;
      let 閉じた = false;
      while (j < n) {
        const d = src[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === "\n" || d === "\r") break; // 1行で閉じないなら正規表現ではない
        if (d === "[") クラス = true;
        else if (d === "]") クラス = false;
        else if (d === "/" && !クラス) {
          閉じた = true;
          break;
        }
        j++;
      }
      if (閉じた) {
        out[i++] = "/";
        while (i < j) out[i] = 保つ(src[i]), i++;
        out[i++] = "/";
        while (i < n && /[a-z]/.test(src[i])) out[i++] = " "; // フラグ
        直前 = "/";
        continue;
      }
      i = 始; // 正規表現ではなかった＝ただの割り算
    }
    out[i] = c;
    if (!/\s/.test(c)) 直前 = c;
    i++;
  }
  return out.join("");
}
