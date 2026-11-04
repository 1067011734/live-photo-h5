import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  Aperture, ArrowDown, ArrowRight, ArrowUpRight, Check, Code2, FileImage,
  LoaderCircle, Monitor, Repeat2, RotateCcw, Smartphone, Upload, Volume2, VolumeX,
} from 'lucide-react';
import { LivePhoto, type LivePhotoHandle, type LivePhotoState } from './lib/LivePhoto';
import { resolveLivePhoto, type ResolvedLivePhoto } from './lib/media';
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
  const fileInput = useRef<HTMLInputElement>(null);
  const importController = useRef<AbortController | null>(null);
  const [imported, setImported] = useState<ResolvedLivePhoto | null>(null);
  const [fileName, setFileName] = useState('海岸来信');
  const [muted, setMuted] = useState(true);
  const [loop, setLoop] = useState(false);
  const [activation, setActivation] = useState<'press' | 'toggle'>('press');
  const [state, setState] = useState<LivePhotoState>('idle');
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importError, setImportError] = useState('');
  const [playbackError, setPlaybackError] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assets = imported ?? sample;
  const hasVideo = Boolean(assets.videoSrc);
  const formatLabel = !imported ? '示例 · JPG + MP4' : imported.format === 'pair'
    ? '照片 + 视频' : imported.format === 'motion-photo' ? 'Android Motion Photo' : '静态照片';

  useEffect(() => () => imported?.dispose(), [imported]);
  useEffect(() => () => {
    importController.current?.abort();
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  async function importFiles(files: readonly File[]) {
    if (!files.length) return;
    importController.current?.abort();
    const controller = new AbortController();
    importController.current = controller;
    setBusy(true);
    setImportError('');
    try {
      const result = await resolveLivePhoto(files, { signal: controller.signal });
      if (controller.signal.aborted) {
        result.dispose();
        return;
      }
      player.current?.stop();
      setImported(result);
      setFileName(files.find((file) => file.type.startsWith('image/'))?.name ?? files[0].name);
      setPlaybackError('');
      setProgress({ currentTime: 0, duration: 0 });
    } catch (error) {
      if (!controller.signal.aborted) {
        setImportError(error instanceof Error ? error.message : '素材读取失败，请重新选择文件。');
      }
    } finally {
      if (importController.current === controller) {
        setBusy(false);
        importController.current = null;
      }
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function resetSample() {
    importController.current?.abort();
    importController.current = null;
    player.current?.stop();
    setBusy(false);
    setImported(null);
    setFileName('海岸来信');
    setImportError('');
    setPlaybackError('');
    setProgress({ currentTime: 0, duration: 0 });
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }

  const code = `import { LivePhoto } from '@local/live-photo-react';
import '@local/live-photo-react/style.css';

<LivePhoto
  photoSrc="/photo.jpg"
  videoSrc="/motion.mp4"
  alt="海岸边，一段会动的回忆"
  activation="${activation}"
  muted={${muted}}
  loop={${loop}}
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
            <div className="platforms" aria-label="支持的平台和资源类型">
              <span><Smartphone size={14} /> iOS Live Photos</span>
              <span><Smartphone size={14} /> Android Motion Photos</span>
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
                  key={`${assets.photoSrc}:${assets.videoSrc ?? ''}`}
                  ref={player}
                  photoSrc={assets.photoSrc}
                  videoSrc={assets.videoSrc}
                  alt={imported ? fileName : '海岸边，一段会动的回忆'}
                  activation={activation}
                  muted={muted}
                  loop={loop}
                  aspectRatio="16 / 11"
                  objectFit="cover"
                  showBadge
                  showHint
                  onStateChange={(next) => { setState(next); if (next === 'playing') setPlaybackError(''); }}
                  onProgress={setProgress}
                  onError={(error) => setPlaybackError(error.message)}
                />
                <div className="photo-corner" aria-hidden="true">MOMENTS WORTH KEEPING</div>
              </div>
              <div className="photo-info">
                <div className="photo-caption"><span className="caption-dash" /><div><h2 title={fileName}>{fileName}</h2><p>{imported ? formatLabel : '有风经过的地方，时间慢了一点。'}</p></div></div>
                <div className={`player-status ${state === 'playing' ? 'is-playing' : ''}`} role="status"><span />{hasVideo ? stateLabels[state] : '静态照片'}</div>
              </div>
              <div className="progress-track" role="progressbar" aria-label="播放进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.duration ? Math.round(progress.currentTime / progress.duration * 100) : 0}>
                <span style={{ width: `${progress.duration ? Math.min(100, progress.currentTime / progress.duration * 100) : 0}%` }} />
              </div>
            </div>
            <div className="preview-meta"><span><span className="meta-dot" /> {formatLabel}</span><span>{timeLabel(progress.currentTime)} <span className="time-separator">/</span> {timeLabel(progress.duration)}</span></div>
            {playbackError && <p className="feedback-message" role="alert">{playbackError} 如原片采用 HEVC 编码，请提供 H.264 MP4 版本。</p>}
            {imported?.format === 'still' && <p className="feedback-message feedback-neutral" role="status">已显示静态照片。iOS 实况照片需要同时选择导出的照片和 MOV 视频。</p>}
          </div>

          <aside className="settings-card" aria-labelledby="settings-title">
            <div className="settings-heading"><span className="tiny-label">MAKE IT YOURS</span><span className="settings-dot" /></div>
            <h2 id="settings-title">每一瞬，都有回响。</h2>
            <p className="settings-description">先感受示例，再带入你自己的回忆。</p>

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

            <div className="import-section">
              <div className="setting-label"><span>试试你的照片</span><span className="local-label"><span /> 仅在本地处理</span></div>
              <input ref={fileInput} type="file" multiple accept="image/*,video/*,.heic,.heif,.mov,.mp4,.jpg,.jpeg" className="visually-hidden" aria-label="选择实况照片文件" onChange={(event) => { void importFiles(Array.from(event.target.files ?? [])); }} />
              <button type="button" className={`upload-zone ${dragging ? 'is-dragging' : ''}`} onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} aria-busy={busy}>
                <span className="upload-icon">{busy ? <LoaderCircle className="spin" size={21} /> : <Upload size={21} />}</span>
                <strong>{busy ? '正在读取这段回忆…' : dragging ? '松开，带入你的回忆' : '选择文件，或拖放到这里'}</strong>
                <span>照片 + MOV / MP4 · Android 动态照片</span>
              </button>
              <p className="import-note"><FileImage size={13} /><span>iOS 请同时选择原始照片和对应视频。<br />文件保留在你的设备上，无需上传。</span></p>
              {importError && <p className="feedback-message import-error" role="alert">{importError}</p>}
              <button type="button" className="reset-button" onClick={resetSample}><RotateCcw size={13} /> 恢复示例照片</button>
            </div>
          </aside>
        </section>

        <section className="details-strip" aria-label="组件特性">
          <div><span className="feature-index">01 /</span><p><strong>跨平台，同一种感动</strong><span>统一播放照片与短视频资源</span></p></div>
          <div><span className="feature-index">02 /</span><p><strong>原生能力，轻盈体验</strong><span>内联播放 · 触控 · 键盘操作</span></p></div>
          <div><span className="feature-index">03 /</span><p><strong>随手接入，自由定制</strong><span>TypeScript API · React 组件</span></p></div>
        </section>

        <section className="integration" id="integration" aria-labelledby="integration-title">
          <div className="integration-copy"><p className="eyebrow"><span className="eyebrow-line" /> BUILT FOR DEVELOPERS</p><h2 id="integration-title">几行代码，<br />让静态多一点生动。</h2><p>传入一张照片和一段视频，即可拥有实况体验。<br />切换右侧设置，代码也会同步更新。</p><a href="https://developer.apple.com/documentation/livephotoskitjs" target="_blank" rel="noreferrer" className="source-link">参考 Apple LivePhotosKit 设计 <ArrowUpRight size={15} /></a><p className="compatibility-note">浏览器的实际解码能力取决于系统与编码。推荐使用 JPG + H.264 MP4；HEVC / MOV 可能需要先转码。iOS 相册选择器可能只提供静态图，建议导出「未修改的原片」。</p></div>
          <div className="code-card"><div className="code-toolbar"><span><Code2 size={15} /> YourComponent.tsx</span><button type="button" onClick={() => { void copyCode(); }}>{copied ? <Check size={14} /> : <span className="copy-squares" aria-hidden="true" />}{copied ? '已复制' : '复制代码'}</button></div><pre><code>{code}</code></pre><div className="code-footer"><span className="code-dot" /> PROPS 随设置实时更新 <ArrowRight size={13} /></div></div>
        </section>
      </main>

      <footer className="site-footer"><span className="footer-brand"><Aperture size={17} /> livephoto.</span><p>把瞬间，留得更完整。</p><span>MADE FOR THE OPEN WEB <span aria-hidden="true">↗</span></span></footer>
    </div>
  );
}
