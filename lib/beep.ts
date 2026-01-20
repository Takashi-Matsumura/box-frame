/**
 * ビープ音ユーティリティ
 * Web Audio APIを使用して成功/失敗音を生成
 */

let audioContext: AudioContext | null = null;
let isInitialized = false;

/**
 * AudioContextを取得（遅延初期化）
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * ユーザー操作後にAudioContextを有効化
 * ページロード後、最初のユーザー操作時に呼ばれる
 */
async function ensureAudioContextResumed(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

/**
 * オーディオシステムを初期化（ユーザー操作時に呼び出し）
 * 画面の初回クリック時などに呼ぶことで、以降のビープ音が有効になる
 */
export function initAudio(): void {
  if (isInitialized) return;

  const handleUserGesture = async () => {
    await ensureAudioContextResumed();
    isInitialized = true;
    // イベントリスナーを解除
    document.removeEventListener("click", handleUserGesture);
    document.removeEventListener("keydown", handleUserGesture);
    document.removeEventListener("touchstart", handleUserGesture);
  };

  document.addEventListener("click", handleUserGesture);
  document.addEventListener("keydown", handleUserGesture);
  document.addEventListener("touchstart", handleUserGesture);
}

/**
 * ビープ音を再生
 * @param frequency - 周波数（Hz）
 * @param duration - 長さ（ミリ秒）
 * @param volume - 音量（0-1）
 */
async function playTone(frequency: number, duration: number, volume: number = 0.5): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const ctx = getAudioContext();
      // suspended状態の場合はresumeを試みる（失敗しても続行）
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          // ユーザー操作前はresumeできないが、静かに失敗
          resolve();
          return;
        }
      }
      // まだsuspendedの場合は音を鳴らせない
      if (ctx.state !== "running") {
        resolve();
        return;
      }
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // フェードイン・フェードアウトでクリックノイズを防ぐ
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);

      oscillator.onended = () => resolve();
    } catch (error) {
      console.error("Beep error:", error);
      resolve();
    }
  });
}

/**
 * 成功音を再生（高い音2回）
 */
export async function playSuccessBeep(): Promise<void> {
  await playTone(880, 100, 0.4);  // A5
  await new Promise((r) => setTimeout(r, 50));
  await playTone(1320, 150, 0.4); // E6
}

/**
 * 失敗音を再生（低い音1回）
 */
export async function playErrorBeep(): Promise<void> {
  await playTone(220, 300, 0.5);  // A3
}

/**
 * 警告音を再生（中音2回）
 */
export async function playWarningBeep(): Promise<void> {
  await playTone(440, 150, 0.4);  // A4
  await new Promise((r) => setTimeout(r, 100));
  await playTone(440, 150, 0.4);  // A4
}

/**
 * カード検知音を再生（短いクリック音）
 */
export async function playDetectBeep(): Promise<void> {
  await playTone(1000, 50, 0.3);
}
