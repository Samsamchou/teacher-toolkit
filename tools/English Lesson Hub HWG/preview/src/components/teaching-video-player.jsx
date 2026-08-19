import { useEffect, useMemo, useRef, useState } from "react";
import { fitMediaWithinFrame, formatMediaTime, isVideoShortcutKey, seekMediaTime, VIDEO_SEEK_SECONDS } from "../lib/video-controls.js";

export function TeachingVideoPlayer({ source, title }) {
  const playerRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setMediaSize({ width: 0, height: 0 });
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = false;
    }
  }, [source]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    function updateFrameSize() {
      const bounds = frame.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      setFrameSize((currentSize) => (
        currentSize.width === nextSize.width && currentSize.height === nextSize.height ? currentSize : nextSize
      ));
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateFrameSize);
    observer?.observe(frame);
    window.addEventListener("resize", updateFrameSize);
    updateFrameSize();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateFrameSize);
    };
  }, []);

  useEffect(() => {
    function syncFullscreenState() {
      const player = playerRef.current;
      const fullscreenElement = document.fullscreenElement;
      setFullscreen(Boolean(player && fullscreenElement && (fullscreenElement === player || fullscreenElement.contains(player))));
    }
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  function getVideo() {
    return videoRef.current;
  }

  function focusVideo() {
    videoRef.current?.focus();
  }

  function togglePlayback() {
    const video = getVideo();
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function seekBy(offset) {
    const video = getVideo();
    if (!video) return;
    const nextTime = seekMediaTime(video.currentTime, video.duration, offset);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function changeProgress(event) {
    const video = getVideo();
    if (!video) return;
    const nextTime = seekMediaTime(Number(event.target.value), video.duration, 0);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function changeVolume(event) {
    const video = getVideo();
    if (!video) return;
    const nextVolume = Math.min(1, Math.max(0, Number(event.target.value)));
    video.volume = nextVolume;
    video.muted = false;
    setVolume(nextVolume);
    setMuted(false);
  }

  function toggleMute() {
    const video = getVideo();
    if (!video) return;
    if (!video.muted && video.volume === 0) video.volume = 0.85;
    video.muted = !video.muted;
    setMuted(video.muted);
    setVolume(video.volume);
  }

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player?.requestFullscreen) return;
    try {
      const fullscreenElement = document.fullscreenElement;
      if (fullscreenElement && (fullscreenElement === player || fullscreenElement.contains(player))) {
        await document.exitFullscreen?.();
      } else if (!fullscreenElement) {
        await player.requestFullscreen();
      }
    } catch {
      // The in-page projector layout remains available if Fullscreen is blocked.
    }
  }

  function handleVideoShortcut(event) {
    if (event.target !== videoRef.current || !isVideoShortcutKey(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === " " || event.key === "Spacebar") togglePlayback();
    if (event.key === "ArrowLeft") seekBy(-VIDEO_SEEK_SECONDS);
    if (event.key === "ArrowRight") seekBy(VIDEO_SEEK_SECONDS);
  }

  function updateMediaMetadata(event) {
    const video = event.currentTarget;
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setMediaSize({ width: video.videoWidth, height: video.videoHeight });
  }

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progressMax = safeDuration || 1;
  const progressValue = Math.min(currentTime, progressMax);
  const fittedMedia = useMemo(
    () => fitMediaWithinFrame(mediaSize.width, mediaSize.height, frameSize.width, frameSize.height),
    [mediaSize, frameSize]
  );
  const fittedMediaStyle = fittedMedia.width && fittedMedia.height
    ? { width: `${fittedMedia.width}px`, height: `${fittedMedia.height}px` }
    : undefined;

  return (
    <div className={`teaching-video-player${playing ? " is-playing" : ""}`} ref={playerRef} data-video-player="external-controls">
      <div className="teaching-video-frame" ref={frameRef} onPointerDown={focusVideo}>
        <video
          ref={videoRef}
          src={source}
          style={fittedMediaStyle}
          tabIndex="0"
          aria-label={`${title}。按 Space 播放或暫停，按左右鍵前後跳五秒。`}
          playsInline
          onKeyDown={handleVideoShortcut}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={updateMediaMetadata}
          onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          onVolumeChange={(event) => {
            setVolume(event.currentTarget.volume);
            setMuted(event.currentTarget.muted);
          }}
        >
          Your browser cannot play this video.
        </video>
      </div>
      <div className="video-control-strip" aria-label="影片控制列">
        <div className="video-control-buttons">
          <button type="button" onClick={togglePlayback} aria-label={playing ? "暫停影片" : "播放影片"}>{playing ? "❚❚ 暫停" : "▶ 播放"}</button>
          <button type="button" onClick={() => seekBy(-VIDEO_SEEK_SECONDS)} aria-label="倒退五秒">↶ 5 秒</button>
          <button type="button" onClick={() => seekBy(VIDEO_SEEK_SECONDS)} aria-label="前進五秒">5 秒 ↷</button>
        </div>
        <label className="video-progress-control">
          <span className="sr-only">影片進度</span>
          <input type="range" min="0" max={progressMax} step="0.1" value={progressValue} onChange={changeProgress} aria-label="影片進度" />
        </label>
        <output className="video-time" aria-label="影片時間">{formatMediaTime(currentTime)} / {formatMediaTime(safeDuration)}</output>
        <div className="video-audio-controls">
          <button type="button" onClick={toggleMute} aria-label={muted ? "取消靜音" : "靜音"}>{muted ? "🔇" : "🔊"}</button>
          <label className="video-volume-control"><span className="sr-only">音量</span><input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={changeVolume} aria-label="音量" /></label>
          <button type="button" onClick={toggleFullscreen}>{fullscreen ? "縮小畫面" : "⛶ 全螢幕"}</button>
        </div>
      </div>
    </div>
  );
}
