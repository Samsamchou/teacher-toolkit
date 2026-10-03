const SOURCE = '/live-games/slot/mixkit-arcade-slot-wheel-1933.wav';
// Created and played inside the student's SPIN gesture for iPad Safari.
export function createSlotAudio(onError = () => {}) {
  let element, timer, generation=0;
  const stop = () => { generation++; clearTimeout(timer); if(element){element.pause();element.currentTime=0;} };
  return {
    start(volume, duration = 15000) {
      element ??= new Audio(SOURCE);
      element.loop=true;element.volume=Math.max(0,Math.min(1,volume));
      clearTimeout(timer);
      timer=setTimeout(stop,duration);
      if(!element.paused)return;
      const playingGeneration=++generation;
      element.play().catch(()=>{if(generation===playingGeneration)onError('滾動音效尚未啟用，請檢查靜音／音量，或按「試聽音效」。');});
    },
    volume(value) { if(element)element.volume=Math.max(0,Math.min(1,value)); },
    stop,
    dispose() { stop(); if(element){element.removeAttribute('src');element.load();element=null;} },
  };
}
