import { useEffect, useRef, useState } from 'react';
import {
  Aperture, ArrowDown, ArrowRight, ArrowUpRight, Check, Code2, FileImage, Film,
  Monitor, Repeat2, RotateCcw, Smartphone, Volume2, VolumeX,
} from 'lucide-react';
import {
  LivePhoto, type LivePhotoBadgeOptions, type LivePhotoBadgePosition,
  type LivePhotoHandle, type LivePhotoState,
} from './lib/LivePhoto';
import './lib/live-photo.css';
import './demo.css';

const stateLabels: Record<LivePhotoState, string> = {
  idle: '等待播放', loading: '正在加载', playing: '正在播放', paused: '已暂停', error: '播放受限',
};

const sample = { photoSrc: '/demo/coast.jpg', videoSrc: '/demo/coast.mp4' };

function timeLabel(seconds: number) {
  return Number.isFinite(seconds) ? `${seconds.toFixed(1)}s` : '0.0s';
}

export default function App() {
  const player = useRef<LivePhotoHandle>(null);
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(false);
  const [activation, setActivation] = useState<'press' | 'toggle'>('press');
  const [showBadge, setShowBadge] = useState(true);
  const [badgePreset, setBadgePreset] = useState<'default' | 'styled' | 'custom'>('default');
  const [badgePosition, setBadgePosition] = useState<LivePhotoBadgePosition>('top-left');
  const [state, setState] = useState<LivePhotoState>('idle');
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [playbackError, setPlaybackError] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function resetPlayback() {
    player.current?.stop();
    setPlaybackError('');
    setProgress((previous) => ({ ...previous, currentTime: 0 }));
  }

  const badge: LivePhotoBadgeOptions = {
    position: badgePosition,
    ...(badgePreset === 'default' ? {} : {
      text: '动态照片',
      playingText: '播放中',
      style: { background: '#f7f4e4', color: '#5f6247', borderRadius: 6 },
      playingStyle: { background: '#5b5edb', color: '#fff' },
    }),
  };
  const badgeCode = `  showBadge={${showBadge}}
  badge={{
    position: '${badgePosition}',${badgePreset === 'default' ? '' : `
    text: '动态照片',
    playingText: '播放中',
    style: { background: '#f7f4e4', color: '#5f6247', borderRadius: 6 },
    playingStyle: { background: '#5b5edb', color: '#fff' },`}
  }}${badgePreset !== 'custom' ? '' : `
  renderBadge={({ isPlaying }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {isPlaying ? '记录正在发生' : '一瞬 · 有声有色'}
    </span>
  )}`}`;

  const code = `import { LivePhoto } from '@local/live-photo-react';
import '@local/live-photo-react/style.css';

<LivePhoto
  photoSrc="/photo.jpg"
  videoSrc="/motion.mp4"
  alt="海岸边，一段会动的回忆"
  activation="${activation}"
  muted={${muted}}
  loop={${loop}}
${badgeCode}
/>`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="demo-app">
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="Live Photo 首页"><Aperture size={25} strokeWidth={1.7} /><span>live<span className="wordmark-light">photo</span><span className="wordmark-dot">.</span></span></a>
        <nav aria-label="主要导航">
          <a className="nav-link" href="#integration">接入指南 <ArrowUpRight size={15} /></a>
          <span className="header-tag"><span /> React + TypeScript</span>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> A LITTLE MORE THAN A PHOTO</p>
            <h1 id="hero-title">让照片，<span>鲜活起来。</span><span className="title-star" aria-hidden="true">✳</span></h1>
            <p className="hero-description">不止定格一瞬，也留住那一刻的风。<br className="mobile-break" />一个轻盈的 React 实况图片组件，让回忆在指尖流动。</p>
            <div className="platforms" aria-label="支持的播放平台">
              <span><Smartphone size={14} /> iOS 内联播放</span>
              <span><Smartphone size={14} /> Android 内联播放</span>
              <span><Monitor size={14} /> H5 原生播放</span>
            </div>
          </div>
          <a href="#playground" className="hero-jump" aria-label="前往交互体验"><ArrowDown size={21} /><span>试着触碰回忆</span></a>
        </section>

        <section className="playground" id="playground" aria-label="实况照片交互体验">
          <div className="preview-column">
            <div className="section-label"><span><span className="section-number">01</span> 交互体验</span><span className="section-english">THE MOMENT, IN MOTION</span></div>
            <div className="photo-card">
              <div className="photo-surface">
                <LivePhoto
                  ref={player}
                  photoSrc={sample.photoSrc}
                  videoSrc={sample.videoSrc}
                  alt="海岸边，一段会动的回忆"
                  activation={activation}
                  muted={muted}
                  loop={loop}
                  aspectRatio="16 / 11"
                  objectFit="cover"
                  showBadge={showBadge}
                  badge={badge}
                  renderBadge={badgePreset === 'custom' ? ({ isPlaying }) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {isPlaying ? '记录正在发生' : '一瞬 · 有声有色'}
                    </span>
                  ) : undefined}
                  showHint
                  onStateChange={(next) => { setState(next); if (next === 'playing') setPlaybackError(''); }}
                  onProgress={setProgress}
                  onError={(error) => setPlaybackError(error.message)}
                />
                <div className="photo-corner" aria-hidden="true">MOMENTS WORTH KEEPING</div>
              </div>
              <div className="photo-info">
                <div className="photo-caption"><span className="caption-dash" /><div><h2>海岸来信</h2><p>有风经过的地方，时间慢了一点。</p></div></div>
                <div className={`player-status ${state === 'playing' ? 'is-playing' : ''}`} role="status"><span />{stateLabels[state]}</div>
              </div>
              <div className="progress-track" role="progressbar" aria-label="播放进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.duration ? Math.round(progress.currentTime / progress.duration * 100) : 0}>
                <span style={{ width: `${progress.duration ? Math.min(100, progress.currentTime / progress.duration * 100) : 0}%` }} />
              </div>
            </div>
            <div className="preview-meta"><span><span className="meta-dot" /> 示例 · JPG + MP4</span><span>{timeLabel(progress.currentTime)} <span className="time-separator">/</span> {timeLabel(progress.duration)}</span></div>
            {playbackError && <p className="feedback-message" role="alert">{playbackError} 如原片采用 HEVC 编码，请提供 H.264 MP4 版本。</p>}
          </div>

          <aside className="settings-card" aria-labelledby="settings-title">
            <div className="settings-heading"><span className="tiny-label">MAKE IT YOURS</span><span className="settings-dot" /></div>
            <h2 id="settings-title">每一瞬，都有回响。</h2>
            <p className="settings-description">调整播放方式，感受同一刻的不同节奏。</p>

            <div className="setting-block">
              <div className="setting-label"><span>交互方式</span><span className="setting-help">INTERACTION</span></div>
              <div className="segmented-control" role="group" aria-label="交互方式">
                <button type="button" aria-pressed={activation === 'press'} className={activation === 'press' ? 'selected' : ''} onClick={() => setActivation('press')}>长按播放 <span>HOLD</span></button>
                <button type="button" aria-pressed={activation === 'toggle'} className={activation === 'toggle' ? 'selected' : ''} onClick={() => setActivation('toggle')}>点击切换 <span>TAP</span></button>
              </div>
              <p className="interaction-note">{activation === 'press' ? '按住照片，画面即刻流动；松开，回到此刻。' : '轻点照片开始播放，再次点击回到照片。'}</p>
            </div>

            <div className="toggle-settings">
              <label className="toggle-row"><span className="toggle-label">{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}<span>保留现场声音<small>默认静音，轻触开启</small></span></span><input type="checkbox" checked={!muted} onChange={(event) => { player.current?.stop(); setMuted(!event.target.checked); }} /><span className="switch" aria-hidden="true" /></label>
              <label className="toggle-row"><span className="toggle-label"><Repeat2 size={17} /><span>循环播放<small>让这一刻，停留久一点</small></span></span><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /><span className="switch" aria-hidden="true" /></label>
            </div>

            <div className="badge-settings">
              <label className="toggle-row badge-visibility"><span className="setting-label">显示实况标识</span><input type="checkbox" aria-label="显示实况标识" checked={showBadge} onChange={(event) => setShowBadge(event.target.checked)} /><span className="switch" aria-hidden="true" /></label>
              <div className="badge-control-grid">
                <label><span>标识样式</span><select aria-label="标识样式" value={badgePreset} onChange={(event) => setBadgePreset(event.target.value as typeof badgePreset)}><option value="default">默认标识</option><option value="styled">自定义文案与样式</option><option value="custom">完全自定义内容</option></select></label>
                <label><span>标识位置</span><select aria-label="标识位置" value={badgePosition} onChange={(event) => setBadgePosition(event.target.value as LivePhotoBadgePosition)}><option value="top-left">左上</option><option value="top-right">右上</option><option value="bottom-left">左下</option><option value="bottom-right">右下</option></select></label>
              </div>
            </div>

            <div className="resource-section">
              <div className="setting-label"><span>示例资源</span><span className="setting-help">STILL + MOTION</span></div>
              <div className="resource-list">
                <div className="resource-row"><span className="resource-icon"><FileImage size={17} /></span><span>coast.jpg<small>静态照片</small></span><span className="resource-format">JPG</span></div>
                <div className="resource-row"><span className="resource-icon"><Film size={17} /></span><span>coast.mp4<small>动态片段</small></span><span className="resource-format">H.264</span></div>
              </div>
              <p className="resource-note">通过 photoSrc 和 videoSrc 传入资源。<br />按住照片或使用空格键，开始播放。</p>
              <button type="button" className="reset-button" onClick={resetPlayback}><RotateCcw size={13} /> 重置播放</button>
            </div>
          </aside>
        </section>

        <section className="details-strip" aria-label="组件特性">
          <div><span className="feature-index">01 /</span><p><strong>跨平台，同一种感动</strong><span>统一播放照片与短视频资源</span></p></div>
          <div><span className="feature-index">02 /</span><p><strong>原生能力，轻盈体验</strong><span>内联播放 · 触控 · 键盘操作</span></p></div>
          <div><span className="feature-index">03 /</span><p><strong>随手接入，自由定制</strong><span>TypeScript API · React 组件</span></p></div>
        </section>

        <section className="integration" id="integration" aria-labelledby="integration-title">
          <div className="integration-copy"><p className="eyebrow"><span className="eyebrow-line" /> BUILT FOR DEVELOPERS</p><h2 id="integration-title">几行代码，<br />让静态多一点生动。</h2><p>传入一张照片和一段视频，即可拥有实况体验。<br />切换右侧设置，代码也会同步更新。</p><a href="https://developer.apple.com/documentation/livephotoskitjs" target="_blank" rel="noreferrer" className="source-link">参考 Apple LivePhotosKit 设计 <ArrowUpRight size={15} /></a><p className="compatibility-note">浏览器的实际解码能力取决于系统与编码。推荐使用 JPG + H.264 MP4；HEVC / MOV 可能需要先转码。</p></div>
          <div className="code-card"><div className="code-toolbar"><span><Code2 size={15} /> YourComponent.tsx</span><button type="button" onClick={() => { void copyCode(); }}>{copied ? <Check size={14} /> : <span className="copy-squares" aria-hidden="true" />}{copied ? '已复制' : '复制代码'}</button></div><pre><code>{code}</code></pre><div className="code-footer"><span className="code-dot" /> PROPS 随设置实时更新 <ArrowRight size={13} /></div></div>
        </section>
      </main>

      <footer className="site-footer"><span className="footer-brand"><Aperture size={17} /> livephoto.</span><p>把瞬间，留得更完整。</p><span>MADE FOR THE OPEN WEB <span aria-hidden="true">↗</span></span></footer>
    </div>
  );
}
