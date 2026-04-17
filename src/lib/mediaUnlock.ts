// src/lib/mediaUnlock.ts
let autoplayUnlocked = false;
export function isAutoplayUnlocked() { return autoplayUnlocked; }

export function installMediaUnlock(audioEl: HTMLAudioElement) {
  if (autoplayUnlocked) return;
  const tryUnlock = async () => {
    try {
      // a quick play/pause “tick” unlocks HTMLMediaElement on most browsers
      audioEl.muted = true;
      await audioEl.play().catch(()=>{});
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.muted = false;
      autoplayUnlocked = true;
      remove();
    } catch (_) {}
  };
  const remove = () => {
    window.removeEventListener('pointerdown', tryUnlock, true);
    window.removeEventListener('keydown', tryUnlock, true);
    window.removeEventListener('touchstart', tryUnlock, true);
  };
  window.addEventListener('pointerdown', tryUnlock, true);
  window.addEventListener('keydown', tryUnlock, true);
  window.addEventListener('touchstart', tryUnlock, true);
}
