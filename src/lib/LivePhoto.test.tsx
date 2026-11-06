import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LivePhoto, type LivePhotoHandle } from './LivePhoto';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.isPrimary = init.isPrimary ?? true;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

const props = { photoSrc: '/photo.jpg', videoSrc: '/video.mp4', alt: '海岸' };
let playMock: ReturnType<typeof vi.fn>;
let pauseMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  playMock = vi.fn().mockResolvedValue(undefined);
  pauseMock = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseMock });
});

const flush = () => act(async () => { await Promise.resolve(); });

describe('LivePhoto', () => {
  it('plays inline and muted by default, shows the still until requested', () => {
    const { container } = render(<LivePhoto {...props} />);
    const video = container.querySelector('video')!;
    expect(video.playsInline).toBe(true);
    expect(video.muted).toBe(true);
    expect(screen.getByRole('button').dataset.state).toBe('idle');
    expect(playMock).not.toHaveBeenCalled();
  });

  it('plays on press and returns to the still on release', async () => {
    render(<LivePhoto {...props} />);
    const player = screen.getByRole('button');
    fireEvent.pointerDown(player, { pointerId: 7, button: 0 });
    // Called in the gesture, so iOS retains user activation.
    expect(playMock).toHaveBeenCalledTimes(1);
    await flush();
    expect(player.dataset.state).toBe('playing');
    expect(player.dataset.frameVisible).toBe('true');
    fireEvent.pointerUp(player, { pointerId: 7 });
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
  });

  it('cancels a pending play promise on touch cancellation', async () => {
    let resolvePlay!: () => void;
    playMock.mockImplementation(() => new Promise<void>(resolve => { resolvePlay = resolve; }));
    render(<LivePhoto {...props} />);
    const player = screen.getByRole('button');
    fireEvent.pointerDown(player);
    expect(player.dataset.state).toBe('loading');
    fireEvent.pointerCancel(player);
    await act(async () => { resolvePlay(); });
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
  });

  it('ignores rejected playback from a replaced source', async () => {
    let rejectPlay!: (reason: Error) => void;
    playMock.mockImplementation(() => new Promise<void>((_, reject) => { rejectPlay = reject; }));
    const onError = vi.fn();
    const { rerender } = render(<LivePhoto {...props} onError={onError} />);
    fireEvent.pointerDown(screen.getByRole('button'));
    rerender(<LivePhoto {...props} videoSrc="/other.mp4" onError={onError} />);
    await act(async () => { rejectPlay(new Error('old resource')); });
    expect(screen.getByRole('button').dataset.state).toBe('idle');
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles play rejection and allows an explicit retry', async () => {
    playMock.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    const onError = vi.fn();
    render(<LivePhoto {...props} activation="toggle" onError={onError} />);
    const player = screen.getByRole('button');
    fireEvent.click(player);
    await flush();
    expect(player.dataset.state).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('点击重试');
    fireEvent.click(player);
    await flush();
    expect(player.dataset.state).toBe('playing');
  });

  it('supports click toggling and ends on the original photo', async () => {
    const { container } = render(<LivePhoto {...props} activation="toggle" />);
    const player = screen.getByRole('button');
    fireEvent.click(player);
    await flush();
    fireEvent.ended(container.querySelector('video')!);
    expect(player.dataset.state).toBe('idle');
    fireEvent.click(player);
    await flush();
    fireEvent.click(player);
    expect(player.dataset.state).toBe('idle');
  });

  it('preserves a press playback error after releasing the pointer', async () => {
    playMock.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'));
    render(<LivePhoto {...props} />);
    const player = screen.getByRole('button');
    fireEvent.pointerDown(player);
    await flush();
    fireEvent.pointerUp(player);
    expect(player.dataset.state).toBe('error');
    expect(screen.getByRole('status').textContent).toContain('点击重试');
  });

  it('supports Space hold and Enter toggle without repeat activation', async () => {
    render(<LivePhoto {...props} />);
    const player = screen.getByRole('button');
    fireEvent.keyDown(player, { key: ' ' });
    fireEvent.keyDown(player, { key: ' ', repeat: true });
    await flush();
    expect(playMock).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(player, { key: ' ' });
    expect(player.dataset.state).toBe('idle');
    fireEvent.keyDown(player, { key: 'Enter' });
    await flush();
    expect(player.dataset.state).toBe('playing');
  });

  it('stops on page hiding and window blur', async () => {
    const ref = createRef<LivePhotoHandle>();
    render(<LivePhoto ref={ref} {...props} />);
    await act(async () => { await ref.current!.play(); });
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('button').dataset.state).toBe('idle');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => { await ref.current!.play(); });
    fireEvent(window, new Event('blur'));
    expect(screen.getByRole('button').dataset.state).toBe('idle');
  });

  it('exposes pause, resume, stop and video through ref', async () => {
    const ref = createRef<LivePhotoHandle>();
    render(<LivePhoto ref={ref} {...props} />);
    await act(async () => { await ref.current!.play(); });
    act(() => ref.current!.pause());
    expect(screen.getByRole('button').dataset.state).toBe('paused');
    expect(screen.getByRole('button').dataset.frameVisible).toBe('true');
    expect(ref.current!.video).toBeInstanceOf(HTMLVideoElement);
    await act(async () => { await ref.current!.play(); });
    act(() => ref.current!.stop());
    expect(screen.getByRole('button').dataset.frameVisible).toBe('false');
  });

  it('stops when disabled and never starts a disabled or still image', async () => {
    const { rerender } = render(<LivePhoto {...props} activation="toggle" />);
    fireEvent.click(screen.getByRole('button'));
    await flush();
    rerender(<LivePhoto {...props} disabled activation="toggle" />);
    expect(screen.getByRole('button').dataset.state).toBe('idle');
    fireEvent.click(screen.getByRole('button'));
    expect(playMock).toHaveBeenCalledTimes(1);
    rerender(<LivePhoto photoSrc="/still.jpg" alt="静态照片" />);
    expect(screen.getByRole('img').tabIndex).toBe(-1);
  });

  it('keeps ordered codec alternatives and notifies progress', () => {
    const onProgress = vi.fn();
    const { container } = render(<LivePhoto {...props} sources={[
      { src: '/hevc.mp4', type: 'video/mp4; codecs="hvc1"' },
      { src: '/h264.mp4', type: 'video/mp4' },
    ]} onProgress={onProgress} />);
    expect([...container.querySelectorAll('source')].map(source => source.getAttribute('src'))).toEqual(['/hevc.mp4', '/h264.mp4']);
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { configurable: true, value: 3 });
    video.currentTime = 1.5;
    fireEvent.timeUpdate(video);
    expect(onProgress).toHaveBeenCalledWith({ currentTime: 1.5, duration: 3 });
  });

  it('pauses and invalidates pending requests on unmount', async () => {
    let resolvePlay!: () => void;
    playMock.mockImplementation(() => new Promise<void>(resolve => { resolvePlay = resolve; }));
    const onStateChange = vi.fn();
    const { unmount } = render(<LivePhoto {...props} onStateChange={onStateChange} />);
    fireEvent.pointerDown(screen.getByRole('button'));
    unmount();
    onStateChange.mockClear();
    await act(async () => { resolvePlay(); });
    expect(pauseMock).toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalled();
  });
});
