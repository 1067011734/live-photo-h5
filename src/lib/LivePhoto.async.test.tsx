import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LivePhoto, type LivePhotoHandle, type LivePhotoState } from './LivePhoto';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}

const photo = { photoSrc: '/photo.jpg', alt: '海岸' };
let playMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  playMock = vi.fn(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    return Promise.resolve();
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const flush = () => act(async () => { await Promise.resolve(); });

describe('LivePhoto asynchronous video URLs', () => {
  it('renders the poster immediately while the video URL is pending, without a media node or interaction', () => {
    const ref = createRef<LivePhotoHandle>();
    const { container } = render(<LivePhoto ref={ref} {...photo} videoLoading />);
    const player = screen.getByRole('img');
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/photo.jpg');
    expect(container.querySelector('video')).toBeNull();
    expect(ref.current!.video).toBeNull();
    expect(player.tabIndex).toBe(-1);
    expect(player.dataset.state).toBe('loading');
    expect(player.dataset.frameVisible).toBe('false');
    expect(player.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.live-photo__badge')!.textContent).toBe('实况');
    expect(container.querySelector('.live-photo__hint')!.textContent).toContain('实况链接准备中');
    act(() => ref.current!.stop());
    expect(player.dataset.state).toBe('loading');
    expect(playMock).not.toHaveBeenCalled();
  });

  it('passes loading state to custom pending badge contents', () => {
    const renderBadge = vi.fn(({ state, isPlaying }: { state: LivePhotoState; isPlaying: boolean }) => (
      <span data-testid="pending-badge">{`${state}:${isPlaying}`}</span>
    ));
    render(<LivePhoto {...photo} videoLoading renderBadge={renderBadge} />);
    expect(screen.getByTestId('pending-badge').textContent).toBe('loading:false');
    expect(renderBadge).toHaveBeenLastCalledWith({ state: 'loading', isPlaying: false });
  });

  it('keeps the same image when the URL arrives and ignores gestures made before that URL', async () => {
    const ref = createRef<LivePhotoHandle>();
    const { container, rerender } = render(<LivePhoto ref={ref} {...photo} videoLoading />);
    const initialImage = container.querySelector('img');
    const pending = screen.getByRole('img');
    fireEvent.pointerDown(pending, { pointerId: 7, button: 0 });
    fireEvent.keyDown(pending, { key: ' ' });
    fireEvent.click(pending);
    await act(async () => { await ref.current!.play(); });
    expect(playMock).not.toHaveBeenCalled();

    rerender(<LivePhoto ref={ref} {...photo} videoSrc="/late.mp4" />);
    const ready = screen.getByRole('button');
    expect(container.querySelector('img')).toBe(initialImage);
    expect(container.querySelector('video')).not.toBeNull();
    expect(ready.dataset.state).toBe('idle');
    expect(ready.getAttribute('aria-busy')).toBe('false');
    expect(ready.dataset.frameVisible).toBe('false');
    fireEvent.pointerUp(ready, { pointerId: 7 });
    fireEvent.keyUp(ready, { key: ' ' });
    await flush();
    expect(playMock).not.toHaveBeenCalled();

    fireEvent.pointerDown(ready, { pointerId: 8, button: 0 });
    await flush();
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(ready.dataset.state).toBe('playing');
    fireEvent.pointerUp(ready, { pointerId: 8 });
    expect(ready.dataset.state).toBe('idle');
  });

  it('retains the original static-image behavior when no pending flag or URL is supplied', () => {
    const { container } = render(<LivePhoto {...photo} />);
    const player = screen.getByRole('img');
    expect(player.dataset.state).toBe('idle');
    expect(player.getAttribute('aria-busy')).toBe('false');
    expect(player.tabIndex).toBe(-1);
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.live-photo__badge')).toBeNull();
    expect(container.querySelector('.live-photo__hint')!.textContent).toBe('静态照片');
  });

  it('returns to a static photo when URL resolution finishes without a usable URL', () => {
    const onError = vi.fn();
    const { container, rerender } = render(<LivePhoto {...photo} videoLoading onError={onError} />);
    const initialImage = container.querySelector('img');
    rerender(<LivePhoto {...photo} videoLoading={false} onError={onError} />);
    const player = screen.getByRole('img');
    expect(container.querySelector('img')).toBe(initialImage);
    expect(player.dataset.state).toBe('idle');
    expect(player.getAttribute('aria-busy')).toBe('false');
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.live-photo__badge')).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('plays a usable URL immediately even if the loading flag has not yet cleared', async () => {
    const { container, rerender } = render(<LivePhoto {...photo} videoSrc="/ready.mp4" videoLoading activation="toggle" />);
    const player = screen.getByRole('button');
    expect(player.dataset.state).toBe('idle');
    expect(player.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(player);
    await flush();
    expect(player.dataset.state).toBe('playing');
    expect(playMock).toHaveBeenCalledTimes(1);
    rerender(<LivePhoto {...photo} sources={[{ src: '/alternative.mp4' }]} videoLoading activation="toggle" />);
    expect(container.querySelector('source')!.getAttribute('src')).toBe('/alternative.mp4');
    expect(player.dataset.state).toBe('idle');
    expect(player.getAttribute('aria-busy')).toBe('false');
  });

  it('ignores empty source entries and falls back to videoSrc when none remain', () => {
    const { container, rerender } = render(<LivePhoto {...photo} videoSrc="/fallback.mp4" sources={[
      { src: '' }, { src: ' \n\t ' }, { src: '/usable.mp4' },
    ]} />);
    expect([...container.querySelectorAll('source')].map(source => source.getAttribute('src'))).toEqual(['/usable.mp4']);
    rerender(<LivePhoto {...photo} videoSrc="/fallback.mp4" sources={[{ src: '' }, { src: '   ' }]} />);
    expect([...container.querySelectorAll('source')].map(source => source.getAttribute('src'))).toEqual(['/fallback.mp4']);
  });

  it('treats only whitespace URLs as pending or static without creating empty media requests', () => {
    const { container, rerender } = render(<LivePhoto {...photo} videoSrc={' \n '} sources={[{ src: '' }, { src: '\t' }]} videoLoading />);
    expect(screen.getByRole('img').dataset.state).toBe('loading');
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('source')).toBeNull();
    rerender(<LivePhoto {...photo} videoSrc="   " sources={[{ src: '' }]} />);
    expect(screen.getByRole('img').dataset.state).toBe('idle');
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.live-photo__badge')).toBeNull();
  });

  it.each(['resolve', 'reject'] as const)('ignores an old play promise that later %ss after a URL switch', async outcome => {
    let resolveOld!: () => void;
    let rejectOld!: (error: Error) => void;
    playMock.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
      resolveOld = resolve;
      rejectOld = reject;
    }));
    const ref = createRef<LivePhotoHandle>();
    const onError = vi.fn();
    const onProgress = vi.fn();
    const { container, rerender } = render(<LivePhoto ref={ref} {...photo} videoSrc="/old.mp4" onError={onError} onProgress={onProgress} />);
    const initialImage = container.querySelector('img');
    const oldVideo = container.querySelector('video')!;
    Object.defineProperty(oldVideo, 'duration', { configurable: true, value: 8 });
    let pendingPlay!: Promise<void>;
    act(() => { pendingPlay = ref.current!.play(); });
    oldVideo.currentTime = 2;
    fireEvent.timeUpdate(oldVideo);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 2, duration: 8 });

    rerender(<LivePhoto ref={ref} {...photo} videoSrc="/new.mp4" onError={onError} onProgress={onProgress} />);
    const newVideo = container.querySelector('video')!;
    expect(newVideo).not.toBe(oldVideo);
    expect(container.querySelector('img')).toBe(initialImage);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 0 });
    await act(async () => {
      if (outcome === 'resolve') resolveOld(); else rejectOld(new Error('Old resource failed'));
      await pendingPlay;
    });
    fireEvent.playing(oldVideo);
    fireEvent.error(oldVideo);
    fireEvent.timeUpdate(oldVideo);
    expect(screen.getByRole('button').dataset.state).toBe('idle');
    expect(screen.getByRole('button').dataset.frameVisible).toBe('false');
    expect(onError).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 0 });
  });

  it('clears old playback and progress when returning to the pending URL state', async () => {
    const ref = createRef<LivePhotoHandle>();
    const onError = vi.fn();
    const onProgress = vi.fn();
    const { container, rerender } = render(<LivePhoto ref={ref} {...photo} videoSrc="/old.mp4" onError={onError} onProgress={onProgress} />);
    const initialImage = container.querySelector('img');
    const oldVideo = container.querySelector('video')!;
    Object.defineProperty(oldVideo, 'duration', { configurable: true, value: 8 });
    await act(async () => { await ref.current!.play(); });
    oldVideo.currentTime = 2;
    fireEvent.timeUpdate(oldVideo);
    rerender(<LivePhoto ref={ref} {...photo} videoLoading onError={onError} onProgress={onProgress} />);
    expect(container.querySelector('img')).toBe(initialImage);
    expect(container.querySelector('video')).toBeNull();
    expect(ref.current!.video).toBeNull();
    expect(screen.getByRole('img').dataset.state).toBe('loading');
    expect(screen.getByRole('img').dataset.frameVisible).toBe('false');
    expect(oldVideo.paused).toBe(true);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 0 });
    fireEvent.error(oldVideo);
    fireEvent.playing(oldVideo);
    expect(screen.getByRole('img').dataset.state).toBe('loading');
    expect(onError).not.toHaveBeenCalled();
  });
});
