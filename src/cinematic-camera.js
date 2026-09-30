// カメラ演出（ユーザー要望 2026-09-29「アグレッシブモード（仮）」）の土台。
// 「行動を決定した後にカメラがかっこよく駒に寄っていったり、対象にカメラが寄っていって
//  臨場感が向上するモード」。
//
// ★なぜこの形か（調べて分かったこと・2026-09-29 続き547）
//   このアプリの3DはCSSの3D変形をWebGL（board-3d.js）が**読み取って板に変換する**作りなので、
//   three.js のカメラだけ動かしても枠線・文字・当たり判定のDOM層が付いてこない。
//   動かすべきなのは **#game-table の transform**（＝盤面そのもの）。
//   そして board-3d.js は #game-table の変形を**1つの行列（rootGroup.matrix）としてまとめて**
//   扱っているので、**カメラだけ動かす分には盤面を作り直さなくてよい**（syncCamera が毎フレーム
//   拾い直す）。実測でも、寄せた絵で枠線とWebGLの札・駒がズレずに一緒に動くことを確認した。
//   ＝カメラ演出のコストは「作り直し 約28ms」ではなく「並べ替え＋描画」だけで済む。
//
// ★守っていること
//   ・**ゲームの進行をカメラに預けない**。動きは requestAnimationFrame で滑らかにするが、
//     rAF は画面が見えている時しか進まない（#360 で実害）。必ずタイマーと競争させ、
//     タブを裏に回しても必ず終わる。
//   ・倍率・移動量を持つだけで、**実際に transform を書くのは main.js**（画角の計算・手動ズーム・
//     2D表示など、既にある画角の仕組みと1か所で合流させるため）。

const LEVEL_KEY = "so7-cinematic-level";
export const CINEMATIC_LEVELS = ["off", "highlights", "all"];
// 既定は "off"。新しい見せ方なので、まずは自分で入れてもらう（試作のライトモードと同じ扱い）。
const LEVEL_DEFAULT = "off";

let level = LEVEL_DEFAULT;
try {
  const saved = localStorage.getItem(LEVEL_KEY);
  if (CINEMATIC_LEVELS.includes(saved)) level = saved;
} catch (e) {
  /* localStorage が使えなくても既定で動く */
}

export function getCinematicLevel() {
  return level;
}
export function setCinematicLevel(v) {
  if (!CINEMATIC_LEVELS.includes(v)) return;
  level = v;
  try {
    localStorage.setItem(LEVEL_KEY, v);
  } catch (e) {
    /* 保存できなくてもその場では効く */
  }
  if (v === "off") cameraHome(200);
}

// kind: "highlight"（接触・効果による移動・ロック成立・勝利などの決め所）
//       "ordinary"（自分でドラッグする通常の1マス移動など、毎ターン必ず起きるもの）
// 通常の移動まで寄ると1ターンに必ず1回以上入るので、"all" を選んだ時だけにする。
export function cinematicAllows(kind) {
  if (level === "off") return false;
  if (level === "all") return true;
  return kind === "highlight";
}

// --- 寄り方の調整値（管理者モードのつまみで回せる）------------------------------------
// 【2026-09-30・続き550・ユーザー要望】「駒の真後ろではなく、少し斜めからのアングルのが
// かっこいいかな？あともう少し近くてもいいかな？」。
//   yaw  … 左右に振る角度（rotateY）。**斜めのアングルはこちらで作る**——盤面を寝かせる方向
//          （tilt を深くする）だけで斜めにすると、奥側が潰れて平たいカードが薄い線になり
//          読めなくなる。左右に振る方は読みやすさを保ったまま「正面から見ていない」感じが出る。
//   tilt … 傾きに足す角度（rotateX へ加算）。少しだけ混ぜると立体感が出る。
// 数字はここで決め打ちにせず、**管理者モードで回して良い値を既定へ反映する**運用にする
// （盤面の光で同じやり方がうまくいった＝続き543）。
const TUNING_KEY = "so7-cinematic-tuning";
export const CINEMATIC_TUNING_DEFAULT = {
  contactZoom: 1.55, // 接触の寄り（駒が動くので、寄せすぎると動いた駒が画面から出る）
  contactYaw: 8, // 接触の左右の振り（度）
  contactTilt: 5, // 接触の傾きの足し（度）
  finalZoom: 1.85, // 最後の1色の寄り（駒が動かないので強く寄れる）
  finalYaw: -8, // 最後の1色の左右の振り（度）
  finalTilt: 8, // 最後の1色の傾きの足し（度）
  finalHoldMs: 1800, // 最後の1色の見せ場の最低の長さ（ミリ秒）
  gateZoom: 1.6, // ゲート侵攻（相手のゲートに乗った瞬間）
  gateYaw: 8,
  gateTilt: 6,
  lockZoom: 1.3, // ロック成立（7色目以外）。この中で一番よく起きるので控えめ
  lockYaw: 6,
  lockTilt: 4,
};
let tuning = { ...CINEMATIC_TUNING_DEFAULT };
try {
  const raw = JSON.parse(localStorage.getItem(TUNING_KEY) || "null");
  for (const k of Object.keys(CINEMATIC_TUNING_DEFAULT)) {
    if (Number.isFinite(raw?.[k])) tuning[k] = raw[k];
  }
} catch (e) {
  /* 壊れていたら既定のまま */
}
export function getCinematicTuning() {
  return tuning;
}
// その決め所を「使わない」ことを、つまみだけで表せるようにする＝**寄りを1にして角度を0**に
// すれば、その場面だけカメラが動かなくなる（決め所ごとのスイッチを増やさずに済む）。
export function cinematicShotOff(zoom, yaw, tilt) {
  return !(zoom > 1.001) && !yaw && !tilt;
}
export function setCinematicTuning(patch) {
  tuning = { ...tuning, ...patch };
  try {
    localStorage.setItem(TUNING_KEY, JSON.stringify(tuning));
  } catch (e) {
    /* 保存できなくてもその場では効く */
  }
}

// --- カメラの現在値（main.js が画角を組み立てる時に読む）--------------------------------
// zoom: 画角の倍率に掛ける／panX・panY: 画面上の移動量（rem）
// yaw: 左右に振る角度（度）／tilt: 傾きに足す角度（度）
const HOME = { zoom: 1, panX: 0, panY: 0, yaw: 0, tilt: 0 };
const AXES = Object.keys(HOME);
let cam = { ...HOME };
let applier = null;
let animId = 0;

export function getCinematicCamera() {
  return cam;
}
export function isCinematicCameraHome() {
  return AXES.every((k) => cam[k] === HOME[k]);
}
// main.js が「今の値で transform だけを書き直す軽い処理」を登録する。
export function setCinematicApplier(fn) {
  applier = typeof fn === "function" ? fn : null;
}

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// 現在値から to へ ms かけて動かす。後から呼ばれたら前の動きは捨てる（animId で判定）。
export function cameraTo(to, ms = 600) {
  const target = {};
  for (const k of AXES) target[k] = Number.isFinite(to?.[k]) ? to[k] : cam[k];
  const id = ++animId;
  const from = { ...cam };
  const t0 = performance.now();
  const span = Math.max(1, ms);
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      if (id === animId) {
        cam = { ...target };
        applier?.();
      }
      resolve();
    };
    const step = () => {
      if (done) return;
      if (id !== animId) {
        // 新しい動きに追い越された。値はそちらが持っているので触らずに終わる。
        done = true;
        if (timer) clearTimeout(timer);
        resolve();
        return;
      }
      const p = Math.min(1, (performance.now() - t0) / span);
      const e = easeInOut(p);
      const next = {};
      for (const k of AXES) next[k] = from[k] + (target[k] - from[k]) * e;
      cam = next;
      applier?.();
      if (p >= 1) finish();
      else requestAnimationFrame(step);
    };
    // 【#360の教訓】rAF は画面が見えている間しか進まない。タブを裏に回した時に
    // ここで止まると、オンラインでは相手まで待たせることになる。必ず終わる保険。
    timer = setTimeout(finish, span + 300);
    requestAnimationFrame(step);
  });
}

export function cameraHome(ms = 500) {
  return cameraTo(HOME, ms);
}
