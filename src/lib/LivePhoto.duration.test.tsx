import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LivePhoto, type LivePhotoHandle } from './LivePhoto';

const props = { photoSrc: '/photo.jpg', videoSrc: '/motion.mp4', alt: '海岸' };
let playMock: ReturnType<typeof vi.fn>;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;

function setPaused(video: HTMLMediaElement, paused: boolean) {
  Object.defineProperty(video, 'paused', { configurable: true, value: paused });
}

beforeEach(() => {
  frames = new Map();
  frameId = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = ++frameId;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  playMock = vi.fn(function (this: HTMLMediaElement) {
    setPaused(this, false);
    return Promise.resolve();
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(function (this: HTMLMediaElement) { setPaused(this, true); }),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function frame(timestamp = 0) {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(timestamp);
  });
}

function setup(maxDuration?: number, rawDuration = 8, loop = false) {
  const ref = createRef<LivePhotoHandle>();
  const onProgress = vi.fn();
  const onStateChange = vi.fn();
  const result = render(<LivePhoto ref={ref} {...props} maxDuration={maxDuration} loop={loop} onProgress={onProgress} onStateChange={onStateChange} />);
  const video = result.container.querySelector('video')!;
  Object.defineProperty(video, 'duration', { configurable: true, value: rawDuration });
  fireEvent.loadedMetadata(video);
  return { ...result, ref, video, onProgress, onStateChange, player: screen.getByRole('button') };
}

describe('LivePhoto maximum playback duration', () => {
  it('stops at a fractional timeline limit, resets progress and can play again', async () => {
    const { ref, video, player, onProgress } = setup(1.5);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1.49;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('playing');
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 1.49, duration: 1.5 });
    video.currentTime = 1.5;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 1.5 });
    expect(frames.size).toBe(0);

    await act(async () => { await ref.current!.play(); });
    expect(player.dataset.state).toBe('playing');
    expect(playMock).toHaveBeenCalledTimes(2);
    video.currentTime = 1.51;
    // Frame monitoring enforces the limit even between timeupdate events.
    frame(16);
    expect(player.dataset.state).toBe('idle');
    expect(video.currentTime).toBe(0);
  });

  it('reports the shorter original video duration and stops on its natural end', async () => {
    const { ref, video, player, onProgress } = setup(5, 2);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 2 });
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1.9;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('playing');
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 1.9, duration: 2 });
    video.currentTime = 2;
    fireEvent.ended(video);
    expect(player.dataset.state).toBe('idle');
    expect(video.currentTime).toBe(0);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 2 });
  });

  it.each([undefined, 0, -1, NaN, Infinity, -Infinity])('treats %s as unlimited and keeps native looping', async maxDuration => {
    const { ref, video, player, onProgress } = setup(maxDuration, 8, true);
    expect(video.loop).toBe(true);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 3;
    fireEvent.timeUpdate(video);
    frame(60_000);
    expect(player.dataset.state).toBe('playing');
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 3, duration: 8 });
  });

  it('loops the capped segment without stopping or requesting play again, until released', async () => {
    const { video, player, onProgress } = setup(1, 8, true);
    expect(video.loop).toBe(true);
    fireEvent.keyDown(player, { key: ' ' });
    await act(async () => { await Promise.resolve(); });
    expect(player.dataset.state).toBe('playing');
    for (let cycle = 0; cycle < 3; cycle++) {
      video.currentTime = 0.99;
      fireEvent.timeUpdate(video);
      expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0.99, duration: 1 });
      video.currentTime = 1.05;
      if (cycle % 2 === 0) frame(cycle * 1_000); else fireEvent.timeUpdate(video);
      expect(video.currentTime).toBe(0);
      expect(video.paused).toBe(false);
      expect(player.dataset.state).toBe('playing');
      expect(player.dataset.frameVisible).toBe('true');
      expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 1 });
      expect(frames.size).toBeGreaterThan(0);
    }
    expect(playMock).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(player, { key: ' ' });
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('stops at the next boundary when looping is disabled during capped playback', async () => {
    const { ref, rerender, video, player, onProgress } = setup(1, 8, true);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1;
    fireEvent.timeUpdate(video);
    expect(video.currentTime).toBe(0);
    expect(player.dataset.state).toBe('playing');
    rerender(<LivePhoto ref={ref} {...props} loop={false} maxDuration={1} onProgress={onProgress} />);
    expect(video.loop).toBe(false);
    expect(player.dataset.state).toBe('playing');
    video.currentTime = 1;
    frame(2_000);
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 1 });
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it('resumes the remaining video timeline after pause instead of restarting the budget', async () => {
    const { ref, video, player } = setup(1.5);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1;
    fireEvent.timeUpdate(video);
    act(() => ref.current!.pause());
    frame(120_000);
    expect(player.dataset.state).toBe('paused');
    expect(video.currentTime).toBe(1);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1.49;
    frame(120_016);
    expect(player.dataset.state).toBe('playing');
    video.currentTime = 1.5;
    frame(120_032);
    expect(player.dataset.state).toBe('idle');
    expect(video.currentTime).toBe(0);
  });

  it('does not consume the limit while buffering without media time advancing', async () => {
    const { ref, video, player } = setup(1);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 0.25;
    fireEvent.waiting(video);
    frame(0);
    frame(60_000);
    frame(120_000);
    expect(player.dataset.state).toBe('loading');
    expect(video.currentTime).toBe(0.25);
    fireEvent.playing(video);
    video.currentTime = 0.99;
    frame(120_016);
    expect(player.dataset.state).toBe('playing');
    video.currentTime = 1;
    frame(120_032);
    expect(player.dataset.state).toBe('idle');
  });

  it('stops a seek beyond the cap and never reports progress beyond the effective duration', async () => {
    const { ref, video, player, onProgress } = setup(1.5);
    await act(async () => { await ref.current!.play(); });
    onProgress.mockClear();
    video.currentTime = 4;
    fireEvent.seeked(video);
    expect(player.dataset.state).toBe('idle');
    expect(video.currentTime).toBe(0);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 1.5 });
    expect(onProgress.mock.calls.every(([progress]) => progress.currentTime <= progress.duration)).toBe(true);
  });

  it('does not revive a pending play request after a limit stop', async () => {
    let resolvePlay!: () => void;
    playMock.mockImplementation(function (this: HTMLMediaElement) {
      setPaused(this, false);
      return new Promise<void>(resolve => { resolvePlay = resolve; });
    });
    const { ref, video, player } = setup(1);
    let pendingPlay!: Promise<void>;
    act(() => { pendingPlay = ref.current!.play(); });
    expect(player.dataset.state).toBe('loading');
    video.currentTime = 1;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('idle');
    await act(async () => { resolvePlay(); await pendingPlay; });
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('stops immediately when the prop is lowered below the current media time', async () => {
    const { ref, rerender, video, player, onProgress } = setup(5);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 2;
    fireEvent.timeUpdate(video);
    rerender(<LivePhoto ref={ref} {...props} maxDuration={1} onProgress={onProgress} />);
    expect(player.dataset.state).toBe('idle');
    expect(player.dataset.frameVisible).toBe('false');
    expect(video.currentTime).toBe(0);
    expect(onProgress).toHaveBeenLastCalledWith({ currentTime: 0, duration: 1 });
  });

  it('cancels monitoring on unmount and ignores an already queued stale frame', async () => {
    const { ref, video, unmount, onProgress, onStateChange } = setup(1);
    await act(async () => { await ref.current!.play(); });
    expect(frames.size).toBeGreaterThan(0);
    const staleFrame = [...frames.values()][0];
    unmount();
    expect(frames.size).toBe(0);
    onProgress.mockClear();
    onStateChange.mockClear();
    video.currentTime = 1;
    act(() => staleFrame(60_000));
    expect(frames.size).toBe(0);
    expect(onProgress).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('still enforces the timeupdate limit when requestAnimationFrame is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    const { ref, video, player } = setup(1.5);
    await act(async () => { await ref.current!.play(); });
    video.currentTime = 1.4;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('playing');
    video.currentTime = 1.5;
    fireEvent.timeUpdate(video);
    expect(player.dataset.state).toBe('idle');
    expect(video.currentTime).toBe(0);
  });
});
