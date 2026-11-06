import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
  type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode,
} from 'react';
import './live-photo.css';

export type LivePhotoState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface LivePhotoVideoSource { src: string; type?: string }
export type LivePhotoBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export interface LivePhotoBadgeOptions {
  /** Label shown outside the playing state. Defaults to 实况. */
  text?: string;
  /** Label shown while playing. Defaults to LIVE. */
  playingText?: string;
  position?: LivePhotoBadgePosition;
  /** Custom decorative icon. Pass null or false to hide the default icon. */
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Merged over style only while playing. */
  playingStyle?: CSSProperties;
}
export interface LivePhotoBadgeRenderContext {
  state: LivePhotoState;
  isPlaying: boolean;
}
export interface LivePhotoHandle {
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  readonly video: HTMLVideoElement | null;
}
export interface LivePhotoProps {
  photoSrc: string;
  videoSrc?: string;
  /** The video URL is being resolved. Shows the poster and a pending hint until a source is available. */
  videoLoading?: boolean;
  /** Ordered alternatives, e.g. HEVC followed by an H.264 MP4. */
  sources?: readonly LivePhotoVideoSource[];
  alt: string;
  activation?: 'press' | 'toggle' | 'hover';
  muted?: boolean;
  loop?: boolean;
  /** Maximum media timeline per pass in seconds. With loop, repeat this segment. */
  maxDuration?: number;
  disabled?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  objectFit?: 'cover' | 'contain';
  aspectRatio?: CSSProperties['aspectRatio'];
  className?: string;
  style?: CSSProperties;
  /** Master visibility switch. Badges are always hidden for still images. */
  showBadge?: boolean;
  /** Badge appearance, also applied to the renderBadge wrapper. */
  badge?: LivePhotoBadgeOptions;
  /** Replace decorative badge contents. Return null to hide it for a state. */
  renderBadge?(context: LivePhotoBadgeRenderContext): ReactNode;
  showHint?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials';
  onStateChange?(state: LivePhotoState): void;
  onError?(error: Error): void;
  onProgress?(progress: { currentTime: number; duration: number }): void;
}

/** Still image + native inline video. No device sniffing or remote player SDK. */
export const LivePhoto = forwardRef<LivePhotoHandle, LivePhotoProps>(function LivePhoto({
  photoSrc, videoSrc, videoLoading = false, sources, alt, activation = 'press', muted = true,
  loop = false, maxDuration, disabled = false, preload = 'metadata', objectFit = 'cover',
  aspectRatio = '4 / 3', className = '', style, showBadge = true, badge, renderBadge,
  showHint = true, crossOrigin, onStateChange, onError, onProgress,
}, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<LivePhotoState>('idle');
  const wantsPlay = useRef(false);
  const sequence = useRef(0);
  const heldPointer = useRef<number | null>(null);
  const heldKey = useRef<string | null>(null);
  const suppressClick = useRef(false);
  const playbackFrame = useRef<number | null>(null);
  const playbackCheckSequence = useRef(0);
  const durationLimit = typeof maxDuration === 'number' && Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : undefined;
  const durationLimitRef = useRef(durationLimit);
  durationLimitRef.current = durationLimit;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const callbacks = useRef({ onStateChange, onError, onProgress });
  callbacks.current = { onStateChange, onError, onProgress };
  const [state, setState] = useState<LivePhotoState>('idle');
  const [visibleFrameSource, setVisibleFrameSource] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const usableSources = sources?.filter(source => typeof source?.src === 'string' && source.src.trim().length > 0)
    .map(source => ({ ...source, src: source.src.trim() }));
  const candidates = usableSources?.length ? usableSources
    : typeof videoSrc === 'string' && videoSrc.trim() ? [{ src: videoSrc.trim() }] : [];
  const sourceKey = JSON.stringify([photoSrc, candidates]);
  const isVideoPending = videoLoading && candidates.length === 0;
  const pendingRef = useRef(isVideoPending);
  pendingRef.current = isVideoPending;
  const displayState = isVideoPending && state !== 'error' ? 'loading' : state;
  const visibleFrame = visibleFrameSource === sourceKey;
  const canInteract = !disabled && candidates.length > 0;

  const cancelPlaybackCheck = useCallback(() => {
    playbackCheckSequence.current += 1;
    if (playbackFrame.current !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(playbackFrame.current);
    }
    playbackFrame.current = null;
  }, []);

  const reportProgress = useCallback((video: HTMLVideoElement) => {
    const limit = durationLimitRef.current;
    const sourceDuration = Number.isFinite(video.duration) ? Math.max(0, video.duration) : undefined;
    const duration = limit === undefined ? sourceDuration ?? 0 : Math.min(sourceDuration ?? limit, limit);
    const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0;
    callbacks.current.onProgress?.({ currentTime: duration > 0 ? Math.min(currentTime, duration) : currentTime, duration });
  }, []);

  const transition = useCallback((next: LivePhotoState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setState(next);
    callbacks.current.onStateChange?.(next);
  }, []);

  const stop = useCallback(() => {
    cancelPlaybackCheck();
    wantsPlay.current = false;
    sequence.current += 1;
    heldPointer.current = null;
    heldKey.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }
      reportProgress(video);
    } else {
      callbacks.current.onProgress?.({ currentTime: 0, duration: 0 });
    }
    setVisibleFrameSource(null);
    setMessage('');
    transition(pendingRef.current ? 'loading' : 'idle');
  }, [transition, cancelPlaybackCheck, reportProgress]);

  const checkPlaybackLimit = useCallback((video: HTMLVideoElement) => {
    const limit = durationLimitRef.current;
    if (limit !== undefined && video.currentTime >= limit) {
      if (loopRef.current && wantsPlay.current) {
        // Seeking an active video preserves playback and the current gesture.
        // Native loop handles clips shorter than the configured limit.
        try { video.currentTime = 0; } catch { stop(); return true; }
        reportProgress(video);
        return false;
      }
      stop();
      return true;
    }
    return false;
  }, [stop, reportProgress]);

  const startPlaybackCheck = useCallback(() => {
    cancelPlaybackCheck();
    if (durationLimitRef.current === undefined || !wantsPlay.current || typeof window.requestAnimationFrame !== 'function') return;
    const checkSequence = playbackCheckSequence.current;
    const tick = () => {
      if (checkSequence !== playbackCheckSequence.current) return;
      playbackFrame.current = null;
      const video = videoRef.current;
      if (!video || !wantsPlay.current || checkPlaybackLimit(video)) return;
      if (!wantsPlay.current || checkSequence !== playbackCheckSequence.current) return;
      playbackFrame.current = window.requestAnimationFrame(tick);
    };
    playbackFrame.current = window.requestAnimationFrame(tick);
  }, [cancelPlaybackCheck, checkPlaybackLimit]);

  const fail = useCallback((error: Error) => {
    cancelPlaybackCheck();
    wantsPlay.current = false;
    sequence.current += 1;
    heldPointer.current = null;
    heldKey.current = null;
    videoRef.current?.pause();
    setVisibleFrameSource(null);
    setMessage(error.message);
    transition('error');
    callbacks.current.onError?.(error);
  }, [transition, cancelPlaybackCheck]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!canInteract || !video || (wantsPlay.current && stateRef.current !== 'error')) return;
    const request = ++sequence.current;
    wantsPlay.current = true;
    setMessage('');
    transition('loading');
    // Invoke play synchronously in the gesture, before any await or timer.
    video.muted = muted;
    if (video.ended || (durationLimitRef.current !== undefined && video.currentTime >= durationLimitRef.current)) video.currentTime = 0;
    try {
      await video.play();
      // A release, source change, or unmount invalidates this request.
      if (request !== sequence.current || video !== videoRef.current) return;
      if (wantsPlay.current) {
        if (checkPlaybackLimit(video)) return;
        setVisibleFrameSource(sourceKey);
        transition('playing');
        startPlaybackCheck();
      }
    } catch (cause) {
      if (request !== sequence.current || !wantsPlay.current || video !== videoRef.current) return;
      const name = cause && typeof cause === 'object' && 'name' in cause && typeof cause.name === 'string' ? cause.name : '';
      const error = new Error(name === 'NotAllowedError'
        ? '浏览器暂未允许播放，请直接点击重试，或开启静音。'
        : '视频无法播放，请检查资源，并提供 H.264 编码的 MP4 兼容源。');
      error.name = name || 'LivePhotoPlaybackError';
      fail(error);
    }
  }, [canInteract, muted, fail, transition, checkPlaybackLimit, startPlaybackCheck, sourceKey]);

  const pause = useCallback(() => {
    cancelPlaybackCheck();
    wantsPlay.current = false;
    sequence.current += 1;
    videoRef.current?.pause();
    if (stateRef.current !== 'idle' && stateRef.current !== 'error') transition('paused');
  }, [transition, cancelPlaybackCheck]);

  useImperativeHandle(ref, () => ({ play, pause, stop, get video() { return videoRef.current; } }), [play, pause, stop]);

  useEffect(() => {
    stop();
    const video = videoRef.current;
    return () => {
      cancelPlaybackCheck();
      wantsPlay.current = false;
      sequence.current += 1;
      video?.pause();
    };
  }, [sourceKey, stop, cancelPlaybackCheck]);

  useEffect(() => { if (disabled) stop(); }, [disabled, stop]);
  useEffect(() => {
    if (candidates.length === 0) stop();
  }, [isVideoPending, candidates.length, stop]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || checkPlaybackLimit(video)) return;
    reportProgress(video);
    startPlaybackCheck();
  }, [durationLimit, checkPlaybackLimit, reportProgress, startPlaybackCheck]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', stop);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined' && rootRef.current) {
      observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) stop();
      });
      observer.observe(rootRef.current);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', stop);
      observer?.disconnect();
    };
  }, [stop]);

  function toggle() {
    if (wantsPlay.current) stop(); else void play();
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canInteract || activation !== 'press' || event.button !== 0 || !event.isPrimary) return;
    heldPointer.current = event.pointerId;
    // Pointer capture guarantees release outside the photo also stops playback.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    void play();
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (heldPointer.current === event.pointerId) stop();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!canInteract || (event.key !== ' ' && event.key !== 'Enter')) return;
    event.preventDefault();
    if (event.repeat) return;
    suppressClick.current = true;
    if (activation === 'press' && event.key === ' ') {
      heldKey.current = event.key;
      void play();
    } else toggle();
  }

  const hint = isVideoPending ? '实况链接准备中…'
    : candidates.length === 0 ? '静态照片'
    : state === 'loading' ? '正在加载动态画面…'
    : state === 'playing' ? (activation === 'press' ? '松开，回到这一刻' : '再次点击，回到照片')
    : state === 'error' ? '点击重试'
    : activation === 'press' ? '按住，感受这一刻' : activation === 'hover' ? '移入或点击，播放实况' : '点击，播放实况';

  const isPlaying = displayState === 'playing';
  const badgeContent = showBadge && (candidates.length > 0 || isVideoPending)
    ? renderBadge
      ? renderBadge({ state: displayState, isPlaying })
      : <>
          {badge?.icon === undefined ? (
            <svg className="live-photo__mark" width="19" height="19" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" />
              <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2.8" fill="currentColor" />
            </svg>
          ) : badge.icon}
          <span className="live-photo__badge-text">{isPlaying ? badge?.playingText ?? 'LIVE' : badge?.text ?? '实况'}</span>
        </>
    : null;

  return (
    <div
      ref={rootRef}
      className={`live-photo ${className}`.trim()}
      style={{ aspectRatio, ...style }}
      data-state={displayState}
      data-video-loading={isVideoPending}
      data-has-video={candidates.length > 0}
      data-frame-visible={visibleFrame}
      role={candidates.length > 0 ? 'button' : 'img'}
      tabIndex={canInteract ? 0 : undefined}
      aria-label={`${alt}${isVideoPending ? '，实况链接准备中' : canInteract ? `，${activation === 'press' ? '按住或按空格播放，Enter 切换' : '点击或按 Enter 播放'}` : ''}`}
      aria-disabled={disabled || undefined}
      aria-pressed={candidates.length > 0 ? state === 'playing' : undefined}
      aria-busy={displayState === 'loading'}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onPointerMove={(event) => {
        if (heldPointer.current !== event.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) stop();
      }}
      onPointerEnter={(event) => {
        if (activation === 'hover' && event.pointerType === 'mouse' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) void play();
      }}
      onPointerLeave={() => { if (activation === 'hover') stop(); }}
      onClick={(event) => {
        if (!canInteract) return;
        if (suppressClick.current && event.detail === 0) { suppressClick.current = false; return; }
        suppressClick.current = false;
        if (activation !== 'press' || event.detail === 0) toggle();
      }}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => {
        if (event.key === ' ') event.preventDefault();
        if (heldKey.current === event.key) stop();
        suppressClick.current = false;
      }}
      onBlur={stop}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <img
        key={photoSrc}
        ref={imageRef}
        className="live-photo__image"
        src={photoSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        style={{ objectFit }}
        crossOrigin={crossOrigin}
        onError={(event) => {
          if (event.currentTarget === imageRef.current) fail(new Error('照片加载失败，请检查图片地址或转换为 JPEG / WebP。'));
        }}
      />
      {candidates.length > 0 && (
        <video
          key={sourceKey}
          ref={videoRef}
          className="live-photo__video"
          style={{ objectFit }}
          muted={muted}
          loop={loop}
          playsInline
          preload={preload}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback"
          crossOrigin={crossOrigin}
          aria-hidden="true"
          tabIndex={-1}
          {...{ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' }}
          onPlaying={(event) => {
            const video = event.currentTarget;
            if (video !== videoRef.current) return;
            if (!wantsPlay.current) { video.pause(); return; }
            if (checkPlaybackLimit(video)) return;
            setVisibleFrameSource(sourceKey);
            transition('playing');
            startPlaybackCheck();
          }}
          onWaiting={(event) => { if (event.currentTarget === videoRef.current && wantsPlay.current) transition('loading'); }}
          onPause={(event) => {
            if (event.currentTarget === videoRef.current && wantsPlay.current && !event.currentTarget.ended) {
              cancelPlaybackCheck();
              wantsPlay.current = false;
              sequence.current += 1;
              transition('paused');
            }
          }}
          onEnded={(event) => { if (event.currentTarget === videoRef.current) stop(); }}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video !== videoRef.current) return;
            if (!checkPlaybackLimit(video)) reportProgress(video);
          }}
          onDurationChange={(event) => { if (event.currentTarget === videoRef.current) reportProgress(event.currentTarget); }}
          onSeeked={(event) => {
            const video = event.currentTarget;
            if (video === videoRef.current && !checkPlaybackLimit(video)) reportProgress(video);
          }}
          onError={(event) => {
            if (event.currentTarget === videoRef.current) fail(new Error('视频加载或解码失败，请提供 H.264 MP4，或检查网络与跨域设置。'));
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (video !== videoRef.current) return;
            if (!checkPlaybackLimit(video)) reportProgress(video);
          }}
        >
          {candidates.map((source, index) => <source key={source.src} src={source.src} type={source.type}
            onError={(event) => {
              if (event.currentTarget.parentElement === videoRef.current && index === candidates.length - 1) fail(new Error('没有可播放的视频源，请检查地址或提供 H.264 MP4。'));
            }} />)}
        </video>
      )}
      {badgeContent !== null && badgeContent !== undefined && badgeContent !== false && (
        <span
          className={`live-photo__badge ${badge?.className ?? ''}`.trim()}
          data-position={badge?.position ?? 'top-left'}
          style={{ ...badge?.style, ...(isPlaying ? badge?.playingStyle : undefined) }}
          aria-hidden="true"
        >
          {badgeContent}
        </span>
      )}
      {showHint && <span className="live-photo__hint" aria-hidden="true">{displayState === 'loading' && <span className="live-photo__spinner" />}{hint}</span>}
      {message && <span className="live-photo__error" role="status">{message}</span>}
    </div>
  );
});
